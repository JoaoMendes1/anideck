-- =============================================================================
-- 060_unificar_rpc_chefao.sql
-- Fase 17.3: Remove sobrecarga ambígua (PGRST203) e unifica obter_chefao_atual (#185)
--
-- O PostgREST não resolve sobrecarga quando existe uma função sem parâmetros e
-- outra com DEFAULT NULL. Este script remove a sobrecarga sem parâmetros e
-- garante que exista apenas public.obter_chefao_atual(p_temporada TEXT).
-- =============================================================================

-- 1. Remove a sobrecarga ambígua sem parâmetros
DROP FUNCTION IF EXISTS public.obter_chefao_atual();

-- 2. Define a função canônica única com p_temporada TEXT DEFAULT NULL
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

  -- Calcula o dano total com base no xp_ledger (Armadilha 28: dano somado no SQL)
  SELECT COALESCE(SUM(xp_earned), 0) INTO v_dano_total
    FROM public.xp_ledger
   WHERE created_at >= v_chefao.inicio
     AND created_at <= v_chefao.fim;

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
       AND created_at >= v_chefao.inicio
       AND created_at <= v_chefao.fim;
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
     WHERE l.created_at >= v_chefao.inicio
       AND l.created_at <= v_chefao.fim
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

-- 3. Concede as permissões de execução para a função canônica
REVOKE ALL ON FUNCTION public.obter_chefao_atual(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_chefao_atual(TEXT) TO anon, authenticated, service_role;
