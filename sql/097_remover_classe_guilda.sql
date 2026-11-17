-- =============================================================================
-- 097 — Fim da classe da Guilda (Bardo, Ranger, Paladino)
-- =============================================================================
--
-- O que muda:
--   1. mana_atual() redefinida (definição viva, antes no 079) sem o bônus de +5 MP por dia
--      do Paladino, o único efeito que a classe tinha. O resto da conta é o mesmo.
--   2. escolher_classe() removida: a rota que a chamava saiu do Go.
--
-- Por que remover: o Bardo e o Ranger nunca tiveram efeito, só texto; e o jogador já tem a
-- Especialidade, conquistada pelo gênero que mais assiste, como "classe" no perfil. Três
-- ideias de classe ao mesmo tempo (Guilda, Especialidade e personagem do RPG) confundiam.
--
-- A coluna profiles.classe FICA: a função do Wrapped (sql/063) ainda a lê, e apagar a coluna
-- quebraria a retrospectiva. Ela deixa de ser escrita e de ser mostrada.
--
-- ORDEM: aplicar antes de promover o código da issue #258. O código que está na main
-- continua funcionando depois deste arquivo, exceto o botão de trocar de classe.
-- Pode rodar mais de uma vez.

-- =============================================================================
-- 1. Mana sem o bônus do Paladino
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
BEGIN
  SELECT mp_atual, mp_em
    INTO v_perfil_mp, v_perfil_em
    FROM public.profiles
   WHERE user_id = p_user;

  IF v_perfil_mp IS NULL THEN
    RETURN NULL;
  END IF;

  v_mp_dia_efetivo := v_mp_dia * (v_mp_max / v_mp_base);

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
-- 2. Escolha de classe removida
-- =============================================================================

DROP FUNCTION IF EXISTS public.escolher_classe(TEXT);
