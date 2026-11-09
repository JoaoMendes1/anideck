-- sql/050_cartas_colecao.sql
-- Fase 16 (16.3a, 16.3b e 16.3c, #172, #173 e #174):
-- Cartas colecionáveis por anime terminado, raridade (comum, rara, raríssima),
-- acabamento Foil por nota 10, selo de Estreia, recálculo diário, cartas de
-- personagem favorito e função de Duelo de Gosto entre perfis públicos.

-- 1. TABELA DE CARTAS DE ANIME (USER_CARDS)
CREATE TABLE IF NOT EXISTS public.user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id INTEGER NOT NULL,
  raridade TEXT NOT NULL DEFAULT 'comum' CHECK (raridade IN ('comum', 'rara', 'rarissima', 'lendaria')),
  is_foil BOOLEAN NOT NULL DEFAULT false,
  estreia BOOLEAN NOT NULL DEFAULT false,
  nota NUMERIC NOT NULL DEFAULT 0,
  obtida_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mal_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON public.user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_mal_id ON public.user_cards(mal_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_raridade ON public.user_cards(raridade);

ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de cartas próprias ou de perfis públicos" ON public.user_cards;
CREATE POLICY "Leitura de cartas próprias ou de perfis públicos"
  ON public.user_cards FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
       WHERE profiles.user_id = user_cards.user_id
         AND profiles.publico = true
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.user_cards FROM PUBLIC, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_cards TO service_role;
GRANT SELECT ON public.user_cards TO authenticated, anon, service_role;


-- 2. GATILHO PARA GERAÇÃO AUTOMÁTICA DE CARTA AO TERMINAR ANIME
CREATE OR REPLACE FUNCTION public.processar_carta_anime_completo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_estreia BOOLEAN := false;
  v_is_foil BOOLEAN := false;
  v_raridade TEXT := 'comum';
  v_tem_progresso_recente BOOLEAN := false;
  v_ja_existia BOOLEAN := false;
  v_agora_ms BIGINT;
BEGIN
  -- Se o status passou a ser 'Completo'
  IF NEW.status = 'Completo' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Estreia = estava 'Em Dia' imediatamente antes de virar Completo
    IF TG_OP = 'UPDATE' AND OLD.status = 'Em Dia' THEN
      v_estreia := true;
      v_raridade := 'rara';
    END IF;

    -- Foil = nota máxima (>= 10)
    IF COALESCE(NEW.nota, 0) >= 10 THEN
      v_is_foil := true;
    END IF;

    -- Verifica se já existia a carta
    SELECT EXISTS (
      SELECT 1 FROM public.user_cards
       WHERE user_id = NEW.user_id AND mal_id = NEW.mal_id
    ) INTO v_ja_existia;

    -- Se não existia, insere a carta
    IF NOT v_ja_existia THEN
      -- Bônus de 15 AniCoins só quando o término veio de episódio assistido de verdade
      -- (pelo menos um registro recente nos últimos 2 dias com watched_at preenchido)
      SELECT EXISTS (
        SELECT 1 FROM public.episode_progress
         WHERE user_id = NEW.user_id
           AND mal_id = NEW.mal_id
           AND watched_at IS NOT NULL
           AND watched_at >= now() - INTERVAL '2 days'
      ) INTO v_tem_progresso_recente;

      IF v_tem_progresso_recente THEN
        v_agora_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
        INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
        VALUES (NEW.user_id, 15, 'carta_anime', 'carta:' || NEW.mal_id || ':' || v_agora_ms::text);
      END IF;

      INSERT INTO public.user_cards (user_id, mal_id, raridade, is_foil, estreia, nota, obtida_em)
      VALUES (NEW.user_id, NEW.mal_id, v_raridade, v_is_foil, v_estreia, COALESCE(NEW.nota, 0), now())
      ON CONFLICT (user_id, mal_id) DO UPDATE
      SET
        nota = EXCLUDED.nota,
        is_foil = (EXCLUDED.nota >= 10);
    ELSE
      -- Apenas atualiza a nota e o status de foil da carta existente
      UPDATE public.user_cards
         SET nota = COALESCE(NEW.nota, 0),
             is_foil = (COALESCE(NEW.nota, 0) >= 10)
       WHERE user_id = NEW.user_id AND mal_id = NEW.mal_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.nota IS DISTINCT FROM NEW.nota THEN
    -- Mudança de nota atualiza a carta se ela já existir
    UPDATE public.user_cards
       SET nota = COALESCE(NEW.nota, 0),
           is_foil = (COALESCE(NEW.nota, 0) >= 10)
     WHERE user_id = NEW.user_id AND mal_id = NEW.mal_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_processar_carta_anime_completo ON public.media_entries;
CREATE TRIGGER trg_processar_carta_anime_completo
  AFTER INSERT OR UPDATE OF status, nota ON public.media_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.processar_carta_anime_completo();


-- 3. PREENCHIMENTO RETROATIVO IDEMPOTENTE (SEM ANICOINS)
INSERT INTO public.user_cards (user_id, mal_id, raridade, is_foil, estreia, nota, obtida_em)
SELECT
  e.user_id,
  e.mal_id,
  'comum',
  (COALESCE(e.nota, 0) >= 10),
  false,
  COALESCE(e.nota, 0),
  e.updated_at
FROM public.media_entries e
WHERE e.status = 'Completo'
ON CONFLICT (user_id, mal_id) DO UPDATE
SET
  nota = EXCLUDED.nota,
  is_foil = (EXCLUDED.nota >= 10);


-- 4. FUNÇÃO DE RECÁLCULO DIÁRIO DE RARIDADE DAS CARTAS (TAREFA DO WORKER)
CREATE OR REPLACE FUNCTION public.recalcular_raridade_cartas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_usuarios INTEGER;
  v_limiar_pct NUMERIC := 10.0;
BEGIN
  -- Total de usuários com pelo menos uma carta
  SELECT count(DISTINCT user_id) INTO v_total_usuarios FROM public.user_cards;
  IF v_total_usuarios < 3 THEN
    RETURN;
  END IF;

  WITH contagens AS (
    SELECT mal_id, (count(DISTINCT user_id)::NUMERIC / v_total_usuarios::NUMERIC) * 100.0 AS pct
      FROM public.user_cards
     GROUP BY mal_id
  )
  UPDATE public.user_cards uc
     SET raridade = CASE
           WHEN c.pct <= v_limiar_pct THEN 'rarissima'
           WHEN uc.estreia THEN 'rara'
           ELSE 'comum'
         END
    FROM contagens c
   WHERE uc.mal_id = c.mal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recalcular_raridade_cartas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_raridade_cartas() TO service_role;


-- 5. TABELA DE PERSONAGENS FAVORITOS (FAVORITE_CHARACTERS - 16.3c, #174)
CREATE TABLE IF NOT EXISTS public.favorite_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL,
  mal_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  imagem_url TEXT NOT NULL DEFAULT '',
  papel TEXT NOT NULL DEFAULT 'Main',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_characters_user_id ON public.favorite_characters(user_id);

ALTER TABLE public.favorite_characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de personagens favoritos públicos ou próprios" ON public.favorite_characters;
CREATE POLICY "Leitura de personagens favoritos públicos ou próprios"
  ON public.favorite_characters FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
       WHERE profiles.user_id = favorite_characters.user_id
         AND profiles.publico = true
    )
  );

DROP POLICY IF EXISTS "Usuários gerenciam seus próprios personagens favoritos" ON public.favorite_characters;
CREATE POLICY "Usuários gerenciam seus próprios personagens favoritos"
  ON public.favorite_characters FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Limite máximo de 50 personagens favoritos por usuário
CREATE OR REPLACE FUNCTION public.validar_limite_personagens_favoritos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_qtd INTEGER;
BEGIN
  SELECT count(*) INTO v_qtd
    FROM public.favorite_characters
   WHERE user_id = NEW.user_id;

  IF v_qtd >= 50 THEN
    RAISE EXCEPTION 'Limite máximo de 50 personagens favoritos atingido.' USING ERRCODE = 'P0006';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_limite_personagens_favoritos ON public.favorite_characters;
CREATE TRIGGER trg_validar_limite_personagens_favoritos
  BEFORE INSERT ON public.favorite_characters
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_limite_personagens_favoritos();


-- 6. FUNÇÃO DE DUELO DE GOSTO ENTRE DOIS PERFIS PÚBLICOS (16.3b, #173)
CREATE OR REPLACE FUNCTION public.duelo_de_gosto(p_handle_a text, p_handle_b text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_a UUID;
  v_user_b UUID;
  v_nome_a TEXT;
  v_nome_b TEXT;
  v_obras_comum INTEGER := 0;
  v_concordancia NUMERIC := 0;
  v_afinidade INTEGER := 0;
  v_genero_une TEXT := 'Variado';
  v_genero_separa TEXT := 'Nenhum';
  v_dif_notas NUMERIC := 0;
  v_total_com_nota INTEGER := 0;
BEGIN
  -- 1. Verifica se os perfis existem e são públicos
  SELECT user_id, nome INTO v_user_a, v_nome_a
    FROM public.profiles
   WHERE handle = lower(trim(p_handle_a)) AND publico = true;

  SELECT user_id, nome INTO v_user_b, v_nome_b
    FROM public.profiles
   WHERE handle = lower(trim(p_handle_b)) AND publico = true;

  IF v_user_a IS NULL OR v_user_b IS NULL THEN
    RAISE EXCEPTION 'Um ou ambos os perfis não existem ou não são públicos.' USING ERRCODE = 'P0007';
  END IF;

  IF v_user_a = v_user_b THEN
    RAISE EXCEPTION 'Não é possível duelar consigo mesmo.' USING ERRCODE = 'P0008';
  END IF;

  -- 2. Obras em comum no deck
  SELECT count(*) INTO v_obras_comum
    FROM public.media_entries a
    JOIN public.media_entries b ON b.mal_id = a.mal_id AND b.user_id = v_user_b
   WHERE a.user_id = v_user_a;

  -- 3. Concordância de notas nas obras em comum que ambos avaliaram
  SELECT count(*), COALESCE(AVG(10.0 - ABS(COALESCE(a.nota, 0) - COALESCE(b.nota, 0))), 0)
    INTO v_total_com_nota, v_dif_notas
    FROM public.media_entries a
    JOIN public.media_entries b ON b.mal_id = a.mal_id AND b.user_id = v_user_b
   WHERE a.user_id = v_user_a
     AND a.nota IS NOT NULL AND a.nota > 0
     AND b.nota IS NOT NULL AND b.nota > 0;

  IF v_total_com_nota > 0 THEN
    v_concordancia := round((v_dif_notas / 10.0) * 100.0, 1);
  ELSE
    v_concordancia := 75.0;
  END IF;

  -- 4. Gênero que mais une (maior contagem conjunta de gêneros via genre_taxonomy)
  WITH gen_a AS (
    SELECT DISTINCT e.mal_id, t.display_name_pt AS genero
      FROM public.media_entries e
      LEFT JOIN public.anime_metadata_cache c ON c.mal_id = e.mal_id
      LEFT JOIN public.curated_animes cur ON cur.mal_id = e.mal_id
      CROSS JOIN LATERAL unnest(COALESCE(cur.custom_tags, COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[]))) r(raw_name)
      JOIN public.genre_taxonomy t ON t.raw_name = r.raw_name AND t.tier <> 'ignorado'
     WHERE e.user_id = v_user_a
  ), gen_b AS (
    SELECT DISTINCT e.mal_id, t.display_name_pt AS genero
      FROM public.media_entries e
      LEFT JOIN public.anime_metadata_cache c ON c.mal_id = e.mal_id
      LEFT JOIN public.curated_animes cur ON cur.mal_id = e.mal_id
      CROSS JOIN LATERAL unnest(COALESCE(cur.custom_tags, COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[]))) r(raw_name)
      JOIN public.genre_taxonomy t ON t.raw_name = r.raw_name AND t.tier <> 'ignorado'
     WHERE e.user_id = v_user_b
  ), uniao AS (
    SELECT a.genero, count(*) AS qtd
      FROM gen_a a
      JOIN gen_b b ON b.genero = a.genero AND b.mal_id = a.mal_id
     GROUP BY a.genero
     ORDER BY count(*) DESC
     LIMIT 1
  )
  SELECT COALESCE(genero, 'Ação') INTO v_genero_une FROM uniao;

  -- 5. Gênero que mais separa (maior disparidade de presença)
  WITH agg_a AS (
    SELECT t.display_name_pt AS genero, count(DISTINCT e.mal_id) AS cnt_a
      FROM public.media_entries e
      LEFT JOIN public.anime_metadata_cache c ON c.mal_id = e.mal_id
      LEFT JOIN public.curated_animes cur ON cur.mal_id = e.mal_id
      CROSS JOIN LATERAL unnest(COALESCE(cur.custom_tags, COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[]))) r(raw_name)
      JOIN public.genre_taxonomy t ON t.raw_name = r.raw_name AND t.tier <> 'ignorado'
     WHERE e.user_id = v_user_a
     GROUP BY t.display_name_pt
  ), agg_b AS (
    SELECT t.display_name_pt AS genero, count(DISTINCT e.mal_id) AS cnt_b
      FROM public.media_entries e
      LEFT JOIN public.anime_metadata_cache c ON c.mal_id = e.mal_id
      LEFT JOIN public.curated_animes cur ON cur.mal_id = e.mal_id
      CROSS JOIN LATERAL unnest(COALESCE(cur.custom_tags, COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[]))) r(raw_name)
      JOIN public.genre_taxonomy t ON t.raw_name = r.raw_name AND t.tier <> 'ignorado'
     WHERE e.user_id = v_user_b
     GROUP BY t.display_name_pt
  ), difs AS (
    SELECT COALESCE(a.genero, b.genero) AS genero,
           ABS(COALESCE(a.cnt_a, 0) - COALESCE(b.cnt_b, 0)) AS dif
      FROM agg_a a
      FULL OUTER JOIN agg_b b ON b.genero = a.genero
     ORDER BY dif DESC
     LIMIT 1
  )
  SELECT COALESCE(genero, 'Drama') INTO v_genero_separa FROM difs;

  -- 6. Afinidade calculada ponderada (0 a 100)
  IF v_obras_comum = 0 THEN
    v_afinidade := 25;
  ELSE
    v_afinidade := LEAST(100, GREATEST(15, round((v_concordancia * 0.7) + (LEAST(v_obras_comum, 30)::NUMERIC / 30.0 * 30.0))));
  END IF;

  RETURN jsonb_build_object(
    'handle_a', lower(trim(p_handle_a)),
    'nome_a', v_nome_a,
    'handle_b', lower(trim(p_handle_b)),
    'nome_b', v_nome_b,
    'afinidade', v_afinidade,
    'obras_em_comum', v_obras_comum,
    'concordancia_notas', v_concordancia,
    'genero_que_une', v_genero_une,
    'genero_que_separa', v_genero_separa
  );
END;
$$;

REVOKE ALL ON FUNCTION public.duelo_de_gosto(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duelo_de_gosto(text, text) TO authenticated, anon, service_role;
