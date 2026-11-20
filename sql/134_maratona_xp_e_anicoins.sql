-- 134_maratona_xp_e_anicoins.sql
-- Fase 18: o prêmio da maratona (sql/133) passa a pagar também XP e AniCoins, além de Ouro e
-- bilhetes. Os valores vêm do Go nas faixas gravadas ao iniciar (campos "xp" e "anicoins");
-- maratonas iniciadas antes deste arquivo não têm esses campos e pagam só Ouro e bilhetes.
--
-- AniCoins entram por creditar_cristais (extrato, motivo 'maratona') e o XP por
-- conceder_xp_extra, o mesmo caminho das missões: fica fora do teto diário de XP por
-- episódio. Tudo na mesma transação que conclui a maratona.
--
-- Depende do 133, do 045 (creditar_cristais) e do 087 (conceder_xp_extra).

ALTER TABLE public.rpg_maratonas
  ADD COLUMN IF NOT EXISTS xp       INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  ADD COLUMN IF NOT EXISTS anicoins INTEGER NOT NULL DEFAULT 0 CHECK (anicoins >= 0);

CREATE OR REPLACE FUNCTION public.rpg_maratona_episodio(p_user_id UUID, p_mal_id INTEGER, p_episodio INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_linha  public.rpg_maratonas%ROWTYPE;
  v_gasto  INTEGER;
  v_faixa  JSONB;
  v_ref    TEXT := 'maratona:' || p_mal_id;
BEGIN
  PERFORM public.rpg_maratona_expirar(p_user_id);

  SELECT * INTO v_linha FROM public.rpg_maratonas
   WHERE user_id = p_user_id AND mal_id = p_mal_id AND status = 'ativa'
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ativa', false);
  END IF;

  IF p_episodio = ANY (v_linha.episodios) THEN
    RETURN jsonb_build_object('ativa', true, 'maratona', to_jsonb(v_linha));
  END IF;

  IF now() < COALESCE(v_linha.ultimo_em, v_linha.iniciada_em) + make_interval(secs => v_linha.intervalo_seg) THEN
    UPDATE public.rpg_maratonas
       SET status = 'falhou', motivo = 'cedo', terminada_em = now()
     WHERE id = v_linha.id
     RETURNING * INTO v_linha;
    RETURN jsonb_build_object('ativa', false, 'maratona', to_jsonb(v_linha));
  END IF;

  UPDATE public.rpg_maratonas
     SET episodios = array_append(episodios, p_episodio), ultimo_em = now()
   WHERE id = v_linha.id
   RETURNING * INTO v_linha;

  IF cardinality(v_linha.episodios) < v_linha.total THEN
    RETURN jsonb_build_object('ativa', true, 'maratona', to_jsonb(v_linha));
  END IF;

  -- Concluiu: a faixa é a primeira cujo limite cobre o tempo gasto.
  v_gasto := EXTRACT(EPOCH FROM (now() - v_linha.iniciada_em))::INTEGER;
  SELECT f INTO v_faixa
    FROM jsonb_array_elements(v_linha.faixas) WITH ORDINALITY AS t(f, ordem)
   WHERE (f->>'ate_seg')::INTEGER >= v_gasto
   ORDER BY ordem
   LIMIT 1;
  IF v_faixa IS NULL THEN
    UPDATE public.rpg_maratonas SET status = 'falhou', motivo = 'tempo', terminada_em = now()
     WHERE id = v_linha.id RETURNING * INTO v_linha;
    RETURN jsonb_build_object('ativa', false, 'maratona', to_jsonb(v_linha));
  END IF;

  UPDATE public.rpg_maratonas
     SET status = 'concluida', terminada_em = now(), faixa = v_faixa->>'id',
         ouro = GREATEST(0, (v_faixa->>'ouro')::INTEGER), bilhetes = GREATEST(0, (v_faixa->>'bilhetes')::INTEGER),
         xp = GREATEST(0, COALESCE((v_faixa->>'xp')::INTEGER, 0)),
         anicoins = GREATEST(0, COALESCE((v_faixa->>'anicoins')::INTEGER, 0))
   WHERE id = v_linha.id
   RETURNING * INTO v_linha;

  INSERT INTO public.rpg_recursos (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.rpg_recursos
     SET ouro = ouro + v_linha.ouro, bilhetes = bilhetes + v_linha.bilhetes, atualizado_em = now()
   WHERE user_id = p_user_id;

  -- AniCoins e XP na mesma transação do Ouro: o prêmio nunca sai pela metade. A referência é
  -- por anime, e cada anime só conclui uma maratona.
  IF v_linha.anicoins > 0 AND NOT EXISTS (
    SELECT 1 FROM public.crystal_ledger WHERE user_id = p_user_id AND motivo = 'maratona' AND referencia = v_ref
  ) THEN
    PERFORM public.creditar_cristais(p_user_id, v_linha.anicoins, 'maratona', v_ref);
  END IF;
  IF v_linha.xp > 0 THEN
    PERFORM public.conceder_xp_extra(p_user_id, v_linha.xp, 'Maratona ' || COALESCE(v_faixa->>'nome', ''), v_ref);
  END IF;

  RETURN jsonb_build_object('ativa', false, 'concluiu', true, 'maratona', to_jsonb(v_linha));
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_maratona_episodio(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_maratona_episodio(UUID, INTEGER, INTEGER) TO service_role;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT status, faixa, ouro, bilhetes, xp, anicoins FROM public.rpg_maratonas WHERE user_id = '<id>';
-- SELECT * FROM public.crystal_ledger WHERE user_id = '<id>' AND motivo = 'maratona';
