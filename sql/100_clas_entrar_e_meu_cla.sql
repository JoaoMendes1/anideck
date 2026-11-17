-- =============================================================================
-- 100 — Entrar em clã e ler o próprio clã voltam a funcionar
-- =============================================================================
--
-- entrar_cla e obter_meu_cla (sql/054) liam app_settings com (value #>> '{}'), operador de
-- jsonb, mas value é TEXT no banco. Em PL/pgSQL a linha só é conferida ao executar, então o
-- arquivo foi aceito e as duas funções falhavam sempre (#263): ninguém entrava em clã, e a
-- leitura de "meu clã" falhava para todo usuário logado. criar_cla foi corrigida no sql/096.
--
-- As duas funções ficam iguais às do 054, trocando só essa leitura por config_inteira()
-- (criada no sql/096). Esta passa a ser a definição viva das duas.
--
-- ORDEM: depois do 096 (usa config_inteira). Pode rodar mais de uma vez.

CREATE OR REPLACE FUNCTION public.entrar_cla(p_cla_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_cla public.clas%ROWTYPE;
  v_max_membros integer := 30;
  v_total_membros integer;
  v_nivel_user integer;
  v_cooldown_dias integer := 7;
  v_saiu_em timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  -- Não pode pertencer a outro clã
  IF EXISTS (SELECT 1 FROM public.cla_membros WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'Você já pertence a um clã.' USING ERRCODE = 'P0003';
  END IF;

  -- Cooldown de saída
  v_cooldown_dias := public.config_inteira('cla_cooldown_saida_dias', 7);

  SELECT saiu_em INTO v_saiu_em
    FROM public.cla_historico_saida
   WHERE user_id = v_user_id;

  IF v_saiu_em IS NOT NULL AND v_cooldown_dias > 0 THEN
    IF now() < v_saiu_em + (v_cooldown_dias * INTERVAL '1 day') THEN
      RAISE EXCEPTION 'Aguarde o período de carência de % dias após sair de um clã.', v_cooldown_dias USING ERRCODE = 'P0004';
    END IF;
  END IF;

  -- Clã deve existir e estar ativo
  SELECT * INTO v_cla FROM public.clas WHERE id = p_cla_id AND ativo = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clã não encontrado ou inativo.' USING ERRCODE = 'P0002';
  END IF;

  -- Limite de membros
  v_max_membros := public.config_inteira('cla_max_membros', 30);

  SELECT count(*) INTO v_total_membros FROM public.cla_membros WHERE cla_id = p_cla_id;
  IF v_total_membros >= v_max_membros THEN
    RAISE EXCEPTION 'O clã atingiu a capacidade máxima de % membros.', v_max_membros USING ERRCODE = 'P0005';
  END IF;

  -- Nível mínimo do clã
  v_nivel_user := public.calcular_nivel_usuario(v_user_id);
  IF v_nivel_user < v_cla.nivel_minimo THEN
    RAISE EXCEPTION 'Seu nível (%s) é inferior ao nível mínimo do clã (%s).', v_nivel_user, v_cla.nivel_minimo USING ERRCODE = 'P0006';
  END IF;

  -- Tipo por convite exige convite pendente
  IF v_cla.tipo = 'convite' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.cla_convites
       WHERE cla_id = p_cla_id
         AND convidado_user_id = v_user_id
         AND status = 'pendente'
    ) THEN
      RAISE EXCEPTION 'Este clã aceita novos membros apenas por convite.' USING ERRCODE = 'P0007';
    END IF;

    -- Atualiza convite
    UPDATE public.cla_convites
       SET status = 'aceito'
     WHERE cla_id = p_cla_id
       AND convidado_user_id = v_user_id
       AND status = 'pendente';
  END IF;

  -- Insere membro
  INSERT INTO public.cla_membros (cla_id, user_id, papel)
  VALUES (p_cla_id, v_user_id, 'membro');
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_meu_cla()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_membro public.cla_membros%ROWTYPE;
  v_cla public.clas%ROWTYPE;
  v_total_membros integer;
  v_xp_semana bigint;
  v_saiu_em timestamptz;
  v_cooldown_dias integer := 7;
  v_dias_restantes integer := 0;
  v_convites jsonb;
  v_inicio_semana timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('logado', false);
  END IF;

  v_cooldown_dias := public.config_inteira('cla_cooldown_saida_dias', 7);

  SELECT saiu_em INTO v_saiu_em
    FROM public.cla_historico_saida
   WHERE user_id = v_user_id;

  IF v_saiu_em IS NOT NULL AND v_cooldown_dias > 0 THEN
    IF now() < v_saiu_em + (v_cooldown_dias * INTERVAL '1 day') THEN
      v_dias_restantes := GREATEST(1, CEIL(EXTRACT(EPOCH FROM ((v_saiu_em + (v_cooldown_dias * INTERVAL '1 day')) - now())) / 86400));
    END IF;
  END IF;

  -- Convites pendentes recebidos pelo usuário
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'cla_id', c.cla_id,
    'cla_nome', cl.nome,
    'cla_tag', cl.tag,
    'cla_emblema', cl.emblema,
    'convidado_em', c.criado_em,
    'convidado_por_nome', p.nome
  )), '[]'::jsonb) INTO v_convites
    FROM public.cla_convites c
    JOIN public.clas cl ON cl.id = c.cla_id
    JOIN public.profiles p ON p.user_id = c.convidado_por
   WHERE c.convidado_user_id = v_user_id
     AND c.status = 'pendente'
     AND cl.ativo = true;

  SELECT * INTO v_membro FROM public.cla_membros WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'tem_cla', false,
      'cooldown_dias_restantes', v_dias_restantes,
      'convites', v_convites
    );
  END IF;

  SELECT * INTO v_cla FROM public.clas WHERE id = v_membro.cla_id;
  SELECT count(*) INTO v_total_membros FROM public.cla_membros WHERE cla_id = v_membro.cla_id;

  -- XP Semanal do clã
  v_inicio_semana := (date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
  SELECT COALESCE(sum(l.xp_earned), 0)::bigint INTO v_xp_semana
    FROM public.xp_ledger l
    JOIN public.cla_membros m ON m.user_id = l.user_id
   WHERE m.cla_id = v_membro.cla_id
     AND l.earned_at >= v_inicio_semana;

  RETURN jsonb_build_object(
    'tem_cla', true,
    'cla_id', v_cla.id,
    'nome', v_cla.nome,
    'tag', v_cla.tag,
    'descricao', v_cla.descricao,
    'emblema', v_cla.emblema,
    'tipo', v_cla.tipo,
    'nivel_minimo', v_cla.nivel_minimo,
    'ativo', v_cla.ativo,
    'criado_em', v_cla.criado_em,
    'meu_papel', v_membro.papel,
    'total_membros', v_total_membros,
    'xp_semana', v_xp_semana,
    'cooldown_dias_restantes', v_dias_restantes,
    'convites', v_convites
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.entrar_cla FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.obter_meu_cla FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrar_cla TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_meu_cla TO authenticated;
