-- =============================================================================
-- 118 — Mana gasta nas lutas
-- =============================================================================
--
-- Até aqui a Mana só era gasta em comentários. Agora cada luta custa Mana: expedição, duelo,
-- chefe do clã e masmorra. O custo fica no Go (rpg_mana.go), que cobra antes de simular e
-- devolve se o registro da luta falhar.
--
-- rpg_mana_lutar(usuario, quantia): quantia positiva cobra; sem Mana suficiente, nada muda e
-- volta {erro, mana_insuficiente}. Quantia negativa devolve, até o máximo. A linha do perfil
-- fica travada durante a conta, para dois toques seguidos não gastarem a mesma Mana.
--
-- Pode rodar mais de uma vez.

CREATE OR REPLACE FUNCTION public.rpg_mana_lutar(p_user_id UUID, p_quantia NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mana   NUMERIC;
  v_maxima NUMERIC;
  v_nova   NUMERIC;
BEGIN
  IF p_user_id IS NULL OR p_quantia IS NULL OR p_quantia = 0 THEN
    RETURN jsonb_build_object('erro', 'Quantia inválida.');
  END IF;

  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  v_mana := public.mana_atual(p_user_id);
  IF v_mana IS NULL THEN
    RETURN jsonb_build_object('erro', 'Crie seu perfil na Comunidade para ter Mana.', 'mana_insuficiente', true);
  END IF;
  v_maxima := COALESCE(public.mana_maxima(p_user_id), 50);

  IF p_quantia > 0 AND v_mana < p_quantia THEN
    RETURN jsonb_build_object(
      'erro', format('Mana insuficiente: esta luta custa %s e você tem %s.', p_quantia, floor(v_mana)),
      'mana_insuficiente', true,
      'mana', floor(v_mana),
      'custo', p_quantia
    );
  END IF;

  v_nova := LEAST(v_maxima, v_mana - p_quantia);
  UPDATE public.profiles SET mp_atual = v_nova, mp_em = now() WHERE user_id = p_user_id;
  RETURN jsonb_build_object('ok', true, 'mana', floor(v_nova));
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_mana_lutar(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_mana_lutar(UUID, NUMERIC) TO service_role;
