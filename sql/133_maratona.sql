-- 133_maratona.sql
-- Fase 18: missão especial de maratona. O jogador inicia a maratona de um anime que já
-- terminou e tem 24 horas para marcar todos os episódios, um de cada vez, respeitando um
-- intervalo mínimo entre as marcações. Quanto mais rápido termina, maior o prêmio.
--
-- As regras de quem pode iniciar (obra terminada, 6 a 30 episódios, nenhum marcado) e as
-- faixas de prêmio são calculadas no Go (maratona.go) e chegam prontas aqui: o banco guarda
-- as faixas na linha da maratona e só aplica o relógio. Assim a regra de prêmio mora num
-- lugar só, e a maratona em andamento não muda se a regra mudar no meio dela.
--
-- Só o service role grava (o Go confere o usuário pelo token antes). O jogador lê as dele.
--
-- Depende do 081 (Ouro em rpg_recursos).
--
-- Idempotente.

CREATE TABLE IF NOT EXISTS public.rpg_maratonas (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id          INTEGER NOT NULL,
  total           INTEGER NOT NULL CHECK (total BETWEEN 1 AND 60),
  intervalo_seg   INTEGER NOT NULL CHECK (intervalo_seg > 0),
  -- Faixas de prêmio, em ordem: [{"id","nome","ate_seg","ouro","bilhetes"}, ...]
  faixas          JSONB NOT NULL,
  iniciada_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_em       TIMESTAMPTZ,
  episodios       INTEGER[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'concluida', 'falhou')),
  -- Por que falhou: 'cedo' (marcou antes do intervalo) ou 'tempo' (passou das 24 horas).
  motivo          TEXT CHECK (motivo IS NULL OR motivo IN ('cedo', 'tempo')),
  faixa           TEXT,
  ouro            INTEGER NOT NULL DEFAULT 0 CHECK (ouro >= 0),
  bilhetes        INTEGER NOT NULL DEFAULT 0 CHECK (bilhetes >= 0),
  terminada_em    TIMESTAMPTZ,
  CONSTRAINT rpg_maratonas_uma_por_anime UNIQUE (user_id, mal_id)
);

-- Uma maratona em andamento por vez.
CREATE UNIQUE INDEX IF NOT EXISTS rpg_maratonas_uma_ativa ON public.rpg_maratonas (user_id) WHERE status = 'ativa';

ALTER TABLE public.rpg_maratonas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_maratonas_ler_as_minhas ON public.rpg_maratonas;
CREATE POLICY rpg_maratonas_ler_as_minhas ON public.rpg_maratonas
  FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.rpg_maratonas FROM anon, authenticated;
GRANT SELECT ON public.rpg_maratonas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rpg_maratonas TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rpg_maratonas_id_seq TO service_role;

-- Encerra por tempo a maratona ativa que passou das 24 horas.
CREATE OR REPLACE FUNCTION public.rpg_maratona_expirar(p_user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.rpg_maratonas
     SET status = 'falhou', motivo = 'tempo', terminada_em = iniciada_em + interval '24 hours'
   WHERE user_id = p_user_id AND status = 'ativa' AND now() > iniciada_em + interval '24 hours';
$$;

REVOKE ALL ON FUNCTION public.rpg_maratona_expirar(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_maratona_expirar(UUID) TO service_role;

-- Inicia a maratona. Uma que falhou pode ser tentada de novo; uma concluída, não.
CREATE OR REPLACE FUNCTION public.rpg_iniciar_maratona(
  p_user_id UUID, p_mal_id INTEGER, p_total INTEGER, p_intervalo_seg INTEGER, p_faixas JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_linha public.rpg_maratonas%ROWTYPE;
BEGIN
  PERFORM public.rpg_maratona_expirar(p_user_id);

  IF EXISTS (SELECT 1 FROM public.rpg_maratonas WHERE user_id = p_user_id AND status = 'ativa') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Você já tem uma maratona em andamento.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.rpg_maratonas WHERE user_id = p_user_id AND mal_id = p_mal_id AND status = 'concluida') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Você já fez a maratona deste anime.');
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

-- Registra um episódio marcado durante a maratona daquele anime. Marcar antes do intervalo
-- encerra a maratona; o último episódio conclui e paga a faixa do tempo gasto.
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
         ouro = GREATEST(0, (v_faixa->>'ouro')::INTEGER), bilhetes = GREATEST(0, (v_faixa->>'bilhetes')::INTEGER)
   WHERE id = v_linha.id
   RETURNING * INTO v_linha;

  INSERT INTO public.rpg_recursos (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.rpg_recursos
     SET ouro = ouro + v_linha.ouro, bilhetes = bilhetes + v_linha.bilhetes, atualizado_em = now()
   WHERE user_id = p_user_id;

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
-- SELECT status, cardinality(episodios), total, faixa, ouro, bilhetes FROM public.rpg_maratonas
--  WHERE user_id = '<id>';
