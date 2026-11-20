-- 135_maratona_limite_semanal.sql
-- Fase 18: limita quantas maratonas (sql/133) cada jogador conclui por semana, de segunda a
-- domingo no horário de Brasília (a mesma semana das missões semanais). O limite é a regra
-- maratonas_por_semana do Painel Admin (app_settings.comunidade_regras, padrão 2); 0 pausa a
-- maratona. A regra vale aqui, no início da maratona; o Go repete a conta só para explicar no card.
--
-- Depende do 133 e do 041 (regra_comunidade).

CREATE OR REPLACE FUNCTION public.rpg_iniciar_maratona(
  p_user_id UUID, p_mal_id INTEGER, p_total INTEGER, p_intervalo_seg INTEGER, p_faixas JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_linha  public.rpg_maratonas%ROWTYPE;
  v_limite INTEGER := GREATEST(0, public.regra_comunidade('maratonas_por_semana', 2)::INTEGER);
BEGIN
  IF v_limite = 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'A missão de maratona está pausada no momento.');
  END IF;
  PERFORM public.rpg_maratona_expirar(p_user_id);

  IF EXISTS (SELECT 1 FROM public.rpg_maratonas WHERE user_id = p_user_id AND status = 'ativa') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Você já tem uma maratona em andamento.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.rpg_maratonas WHERE user_id = p_user_id AND mal_id = p_mal_id AND status = 'concluida') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Você já fez a maratona deste anime.');
  END IF;

  -- Conta as concluídas desde segunda 00:00 de Brasília. A perdida não conta: perder não paga
  -- nada, então tentar de novo não abre brecha.
  IF (
    SELECT count(*) FROM public.rpg_maratonas
     WHERE user_id = p_user_id AND status = 'concluida'
       AND terminada_em >= date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
  ) >= v_limite THEN
    RETURN jsonb_build_object('ok', false, 'erro', CASE WHEN v_limite = 1
      THEN 'Você já concluiu a maratona desta semana. A próxima libera na segunda-feira.'
      ELSE format('Você já concluiu as %s maratonas desta semana. As próximas liberam na segunda-feira.', v_limite) END);
  END IF;

  DELETE FROM public.rpg_maratonas WHERE user_id = p_user_id AND mal_id = p_mal_id AND status = 'falhou';

  INSERT INTO public.rpg_maratonas (user_id, mal_id, total, intervalo_seg, faixas)
  VALUES (p_user_id, p_mal_id, p_total, p_intervalo_seg, p_faixas)
  RETURNING * INTO v_linha;

  RETURN jsonb_build_object('ok', true, 'maratona', to_jsonb(v_linha));
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_iniciar_maratona(UUID, INTEGER, INTEGER, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_iniciar_maratona(UUID, INTEGER, INTEGER, INTEGER, JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT mal_id, status, terminada_em FROM public.rpg_maratonas
--  WHERE user_id = '<id>' AND status = 'concluida' ORDER BY terminada_em DESC;
