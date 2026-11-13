-- =============================================================================
-- 060_unificar_rpc_chefao.sql
-- Fase 17.3: Corrige coluna earned_at no xp_ledger e unifica obter_chefao_atual (#185)
--
-- 1. Remove sobrecarga ambígua sem parâmetros (DROP FUNCTION public.obter_chefao_atual())
-- 2. Corrige a coluna de data do xp_ledger: a tabela usa earned_at (não created_at)
-- 3. Concede as permissões de execução (GRANT EXECUTE) para os papéis de acesso
-- =============================================================================

-- 1. Remove sobrecarga sem parâmetros para evitar ambiguidade PGRST203
DROP FUNCTION IF EXISTS public.obter_chefao_atual();

-- 2. Define a função canônica única com p_temporada TEXT DEFAULT NULL usando earned_at
CREATE OR REPLACE FUNCTION public.obter_chefao_atual(p_temporada TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_temporada TEXT;
  v_chefao RECORD;
  v_dano_total BIGINT := 0;
  v_hp_restante BIGINT := 0;
  v_meu_dano BIGINT := 0;
  v_status TEXT := 'ativo';
  v_top_atacantes JSONB;
BEGIN
  -- Se temporada não fornecida, usa a temporada atual derivada da data corrente em Brasília
  IF p_temporada IS NULL OR btrim(p_temporada) = '' THEN
    SELECT (EXTRACT(YEAR FROM now() AT TIME ZONE 'America/Sao_Paulo')::text || '-' ||
      CASE
        WHEN EXTRACT(MONTH FROM now() AT TIME ZONE 'America/Sao_Paulo') IN (1, 2, 3) THEN 'WINTER'
        WHEN EXTRACT(MONTH FROM now() AT TIME ZONE 'America/Sao_Paulo') IN (4, 5, 6) THEN 'SPRING'
        WHEN EXTRACT(MONTH FROM now() AT TIME ZONE 'America/Sao_Paulo') IN (7, 8, 9) THEN 'SUMMER'
        ELSE 'FALL'
      END) INTO v_temporada;
  ELSE
    v_temporada := upper(btrim(p_temporada));
  END IF;

  -- Busca o chefão da temporada
  SELECT * INTO v_chefao
    FROM public.chefoes
   WHERE temporada = v_temporada;

  IF NOT FOUND THEN
    -- Fallback: busca qualquer chefão aberto no momento
    SELECT * INTO v_chefao
      FROM public.chefoes
     WHERE now() >= inicio AND now() <= fim
     ORDER BY inicio DESC
     LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ativo', false, 'temporada', v_temporada);
    END IF;
  END IF;

  -- Calcula o dano total com base no xp_ledger (coluna correta: earned_at)
  SELECT COALESCE(SUM(xp_earned), 0) INTO v_dano_total
    FROM public.xp_ledger
   WHERE earned_at >= v_chefao.inicio
     AND earned_at <= v_chefao.fim;

  -- Se atingiu o HP total e não estava marcado derrotado, atualiza
  IF v_dano_total >= v_chefao.hp_total THEN
    v_hp_restante := 0;
    v_status := 'derrotado';
    IF NOT v_chefao.derrotado THEN
      UPDATE public.chefoes
         SET derrotado = true,
             derrotado_em = now()
       WHERE id = v_chefao.id;
    END IF;
  ELSIF now() > v_chefao.fim THEN
    v_hp_restante := GREATEST(0, v_chefao.hp_total - v_dano_total);
    v_status := 'escapou';
  ELSE
    v_hp_restante := GREATEST(0, v_chefao.hp_total - v_dano_total);
    v_status := 'ativo';
  END IF;

  -- Dano do usuário logado (se autenticado)
  IF (SELECT auth.uid()) IS NOT NULL THEN
    SELECT COALESCE(SUM(xp_earned), 0) INTO v_meu_dano
      FROM public.xp_ledger
     WHERE user_id = (SELECT auth.uid())
       AND earned_at >= v_chefao.inicio
       AND earned_at <= v_chefao.fim;
  END IF;

  -- Top 5 atacantes que mais causaram dano
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_top_atacantes
    FROM (
      SELECT
        l.user_id,
        p.nome,
        p.handle,
        p.avatar_url,
        c.tag AS cla_tag,
        SUM(l.xp_earned) AS dano
      FROM public.xp_ledger l
      LEFT JOIN public.profiles p ON p.user_id = l.user_id
      LEFT JOIN public.cla_membros cm ON cm.user_id = l.user_id
      LEFT JOIN public.clas c ON c.id = cm.cla_id
     WHERE l.earned_at >= v_chefao.inicio
       AND l.earned_at <= v_chefao.fim
     GROUP BY l.user_id, p.nome, p.handle, p.avatar_url, c.tag
     ORDER BY dano DESC
     LIMIT 5
    ) sub;

  RETURN jsonb_build_object(
    'ativo', true,
    'id', v_chefao.id,
    'temporada', v_chefao.temporada,
    'nome', v_chefao.nome,
    'titulo', v_chefao.titulo,
    'descricao', v_chefao.descricao,
    'arte_url', v_chefao.arte_url,
    'hp_total', v_chefao.hp_total,
    'hp_restante', v_hp_restante,
    'dano_total', v_dano_total,
    'porcentagem_hp', ROUND((v_hp_restante::numeric / v_chefao.hp_total::numeric) * 100, 1),
    'inicio', v_chefao.inicio,
    'fim', v_chefao.fim,
    'status', v_status,
    'derrotado', (v_status = 'derrotado'),
    'recompensas_pagas', v_chefao.recompensas_pagas,
    'recompensa_anicoins', v_chefao.recompensa_anicoins,
    'titulo_recompensa', v_chefao.titulo_recompensa,
    'dano_minimo', v_chefao.dano_minimo_recompensa,
    'meu_dano', v_meu_dano,
    'elegivel_recompensa', (v_meu_dano >= v_chefao.dano_minimo_recompensa),
    'top_atacantes', v_top_atacantes
  );
END;
$$;

-- 3. Atualiza pagar_recompensas_chefao para usar earned_at
CREATE OR REPLACE FUNCTION public.pagar_recompensas_chefao(p_chefao_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_chefao RECORD;
  v_dano_total BIGINT := 0;
  v_usuario RECORD;
  v_pagos INTEGER := 0;
  v_ref TEXT;
BEGIN
  SELECT * INTO v_chefao
    FROM public.chefoes
   WHERE id = p_chefao_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Chefão não encontrado');
  END IF;

  IF v_chefao.recompensas_pagas THEN
    RETURN jsonb_build_object('ok', true, 'ja_pago', true, 'mensagem', 'Recompensas deste chefão já foram pagas anteriormente.');
  END IF;

  -- Confere se de fato atingiu a derrota (usando earned_at)
  SELECT COALESCE(SUM(xp_earned), 0) INTO v_dano_total
    FROM public.xp_ledger
   WHERE earned_at >= v_chefao.inicio
     AND earned_at <= v_chefao.fim;

  IF v_dano_total < v_chefao.hp_total AND NOT v_chefao.derrotado THEN
    RETURN jsonb_build_object('erro', 'O chefão ainda não foi derrotado.');
  END IF;

  -- Itera sobre os usuários que bateram a meta de dano mínimo
  FOR v_usuario IN
    SELECT l.user_id, SUM(l.xp_earned) AS dano
      FROM public.xp_ledger l
     WHERE l.earned_at >= v_chefao.inicio
       AND l.earned_at <= v_chefao.fim
     GROUP BY l.user_id
    HAVING SUM(l.xp_earned) >= v_chefao.dano_minimo_recompensa
  LOOP
    v_ref := 'chefao:' || v_chefao.id::text || ':' || v_usuario.user_id::text;

    -- Credita AniCoins no crystal_ledger de forma idempotente
    IF v_chefao.recompensa_anicoins > 0 THEN
      INSERT INTO public.crystal_ledger (
        user_id,
        quantidade,
        motivo,
        referencia
      ) VALUES (
        v_usuario.user_id,
        v_chefao.recompensa_anicoins,
        'chefao',
        v_ref
      )
      ON CONFLICT (user_id, motivo, referencia) DO NOTHING;

      v_pagos := v_pagos + 1;
    END IF;
  END LOOP;

  -- Marca recompensas como pagas
  UPDATE public.chefoes
     SET recompensas_pagas = true,
         derrotado = true,
         derrotado_em = COALESCE(derrotado_em, now())
   WHERE id = p_chefao_id;

  RETURN jsonb_build_object(
    'ok', true,
    'chefao_id', p_chefao_id,
    'membros_recompensados', v_pagos,
    'recompensa_anicoins', v_chefao.recompensa_anicoins
  );
END;
$$;

-- 4. Permissões de execução para as duas funções
REVOKE ALL ON FUNCTION public.obter_chefao_atual(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_chefao_atual(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.pagar_recompensas_chefao(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pagar_recompensas_chefao(UUID) TO authenticated, service_role;

-- 5. Garante HP de 50.000 para a temporada atual
UPDATE public.chefoes
   SET hp_total = 50000,
       derrotado = false,
       derrotado_em = NULL
 WHERE temporada = '2026-FALL';
