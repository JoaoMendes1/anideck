-- =============================================================================
-- 048_vitalidade_sql_bonus.sql
-- Bônus de XP por Vitalidade alta e Mana que recarrega mais rápido (Fase 16, #169)
--
-- 1. vitalidade_atual(uuid): calcula o HP diretamente no banco a partir dos dias
--    ativos no fuso de Brasília, respeitando Modo Descanso e regras de comunidade.
-- 2. minha_vitalidade(): atalho para a sessão do usuário logado (auth.uid()).
-- 3. mana_atual(uuid): atualizada para acelerar a regeneração diária de Mana
--    em até +25% quando a Vitalidade ultrapassa o limiar de 80%.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.vitalidade_atual(p_user uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_janela_dias integer := COALESCE(public.regra_comunidade('hp_janela_dias', 14)::integer, 14);
  v_dias_cheio  integer := COALESCE(public.regra_comunidade('hp_dias_para_cheio', 12)::integer, 12);
  v_piso        integer := COALESCE(public.regra_comunidade('hp_piso', 20)::integer, 20);
  v_desc_ini    date;
  v_desc_fim    date;
  v_hoje        date;
  v_dia         date;
  v_contados    integer := 0;
  v_com_ativ    integer := 0;
  v_passos      integer := 0;
  v_ativo       boolean;
BEGIN
  IF p_user IS NULL THEN
    RETURN v_piso;
  END IF;

  SELECT descanso_inicio::date, descanso_fim::date
    INTO v_desc_ini, v_desc_fim
    FROM public.profiles
   WHERE user_id = p_user;

  v_hoje := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_dia := v_hoje;

  WHILE v_contados < v_janela_dias AND v_passos < (v_janela_dias + 60) LOOP
    v_passos := v_passos + 1;
    IF v_desc_ini IS NOT NULL AND v_desc_fim IS NOT NULL AND v_dia >= v_desc_ini AND v_dia <= v_desc_fim THEN
      v_dia := v_dia - 1;
      CONTINUE;
    END IF;

    v_contados := v_contados + 1;

    SELECT EXISTS (
      SELECT 1 FROM public.episode_progress
       WHERE user_id = p_user
         AND watched_at IS NOT NULL
         AND (watched_at AT TIME ZONE 'America/Sao_Paulo')::date = v_dia
    ) INTO v_ativo;

    IF v_ativo THEN
      v_com_ativ := v_com_ativ + 1;
    END IF;

    v_dia := v_dia - 1;
  END LOOP;

  IF v_dias_cheio <= 0 THEN
    v_dias_cheio := 12;
  END IF;

  IF v_com_ativ > v_dias_cheio THEN
    v_com_ativ := v_dias_cheio;
  END IF;

  RETURN v_piso + ((100 - v_piso) * v_com_ativ) / v_dias_cheio;
END;
$$;

REVOKE ALL ON FUNCTION public.vitalidade_atual(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vitalidade_atual(uuid) TO service_role, authenticated;

CREATE OR REPLACE FUNCTION public.minha_vitalidade()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.vitalidade_atual(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.minha_vitalidade() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.minha_vitalidade() TO authenticated, service_role;

-- Atualização da mana_atual para aplicar o bônus de regeneração por constância (Vitalidade >= 80)
CREATE OR REPLACE FUNCTION public.mana_atual(p_user uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mp_max      numeric := public.regra_comunidade('mp_max', 50);
  v_mp_base     numeric := public.regra_comunidade('mp_regen_dia', 20);
  v_limiar_hp   numeric := public.regra_comunidade('hp_bonus_limiar', 80);
  v_bonus_max   numeric := public.regra_comunidade('mp_regen_bonus', 0.25);
  v_hp          integer;
  v_regen_efet  numeric;
  v_perfil_mp   numeric;
  v_perfil_em   timestamptz;
BEGIN
  SELECT mp_atual, mp_em INTO v_perfil_mp, v_perfil_em
    FROM public.profiles
   WHERE user_id = p_user;

  IF v_perfil_mp IS NULL THEN
    RETURN NULL;
  END IF;

  v_hp := public.vitalidade_atual(p_user);
  v_regen_efet := v_mp_base;

  IF v_hp > v_limiar_hp AND (100.0 - v_limiar_hp) > 0 THEN
    v_regen_efet := v_mp_base * (1.0 + (v_bonus_max * ((v_hp - v_limiar_hp) / (100.0 - v_limiar_hp))));
  END IF;

  RETURN LEAST(
    v_mp_max,
    v_perfil_mp + v_regen_efet * (EXTRACT(EPOCH FROM (now() - v_perfil_em)) / 86400.0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mana_atual(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mana_atual(uuid) TO service_role, authenticated;
