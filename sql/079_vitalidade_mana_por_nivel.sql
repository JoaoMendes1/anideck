-- =============================================================================
-- 079_vitalidade_mana_por_nivel.sql
-- Fase 18: Vitalidade e Mana crescem com o nível do jogador (#234)
--
-- 1. mana_maxima(p_user uuid): calcula a Mana máxima do jogador a partir do
--    nível (calcular_nivel_usuario) e das regras em app_settings.comunidade_regras
--    (mp_max = 50 no nível 1, mp_por_nivel = 1, mp_max_teto = 120).
-- 2. mana_atual(p_user uuid): usa mana_maxima(p_user) como teto e escala a
--    recarga diária proporcionalmente (mp_max_jogador / mp_max), preservando o
--    bônus da classe Paladino (+5 MP/dia) e o bônus de Vitalidade alta (até +25%).
-- 3. Atualiza app_settings.comunidade_regras com mp_por_nivel = 1 e mp_max_teto = 120.
--
-- A Vitalidade (HP) continua calculada de 0 a 100 no banco como porcentagem de
-- constância recente; o teto escalado (100 + 5 * (nivel - 1), até 400) é exibido
-- na camada de aplicação sem alterar o limiar de 80% dos bônus.
-- =============================================================================

-- =============================================================================
-- 1. Chaves novas em app_settings.comunidade_regras
-- =============================================================================
UPDATE public.app_settings
   SET value = jsonb_set(
                 jsonb_set(value::jsonb, '{mp_por_nivel}', '1'::jsonb, true),
                 '{mp_max_teto}', '120'::jsonb, true
               )::text,
       updated_at = now()
 WHERE key = 'comunidade_regras';

-- =============================================================================
-- 2. Função mana_maxima(p_user uuid)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.mana_maxima(p_user uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base      integer := GREATEST(1, COALESCE(public.regra_comunidade('mp_max', 50)::integer, 50));
  v_por_nivel integer := GREATEST(0, COALESCE(public.regra_comunidade('mp_por_nivel', 1)::integer, 1));
  v_teto      integer := GREATEST(v_base, COALESCE(public.regra_comunidade('mp_max_teto', 120)::integer, 120));
  v_nivel     integer := GREATEST(1, COALESCE(public.calcular_nivel_usuario(p_user), 1));
BEGIN
  RETURN LEAST(v_teto, v_base + v_por_nivel * GREATEST(0, v_nivel - 1));
END;
$$;

REVOKE ALL ON FUNCTION public.mana_maxima(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mana_maxima(uuid) TO authenticated, service_role;

-- =============================================================================
-- 3. Atualização de mana_atual(p_user uuid) com teto e recarga por nível
-- =============================================================================
CREATE OR REPLACE FUNCTION public.mana_atual(p_user uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mp_base        numeric := GREATEST(1, public.regra_comunidade('mp_max', 50));
  v_mp_max         numeric := public.mana_maxima(p_user);
  v_mp_dia         numeric := public.regra_comunidade('mp_regen_dia', 20);
  v_limiar_hp      numeric := public.regra_comunidade('hp_bonus_limiar', 80);
  v_bonus_max      numeric := public.regra_comunidade('mp_regen_bonus', 0.25);
  v_hp             integer;
  v_mp_dia_efetivo numeric;
  v_perfil_mp      numeric;
  v_perfil_em      timestamptz;
  v_classe         text;
BEGIN
  SELECT mp_atual, mp_em, classe
    INTO v_perfil_mp, v_perfil_em, v_classe
    FROM public.profiles
   WHERE user_id = p_user;

  IF v_perfil_mp IS NULL THEN
    RETURN NULL;
  END IF;

  v_mp_dia_efetivo := v_mp_dia * (v_mp_max / v_mp_base);

  IF v_classe = 'paladino' THEN
    v_mp_dia_efetivo := v_mp_dia_efetivo + 5.0;
  END IF;

  v_hp := public.vitalidade_atual(p_user);

  IF v_hp > v_limiar_hp AND (100.0 - v_limiar_hp) > 0 THEN
    v_mp_dia_efetivo := v_mp_dia_efetivo * (1.0 + (v_bonus_max * ((v_hp - v_limiar_hp) / (100.0 - v_limiar_hp))));
  END IF;

  RETURN LEAST(
    v_mp_max,
    v_perfil_mp + v_mp_dia_efetivo * (EXTRACT(EPOCH FROM (now() - v_perfil_em)) / 86400.0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mana_atual(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mana_atual(uuid) TO service_role, authenticated;

-- =============================================================================
-- Como conferir
-- =============================================================================
-- SELECT value::jsonb -> 'mp_por_nivel', value::jsonb -> 'mp_max_teto'
--   FROM public.app_settings WHERE key = 'comunidade_regras';
-- -- Esperado: 1 e 120
--
-- SELECT public.mana_maxima(auth.uid()), public.minha_mana();
-- -- No nível 15 com regras padrão: mana_maxima = 64
