-- 013 — Precedência campo a campo nos rótulos (Bloco 1, Fase 6.9)
--
-- Corrige dois defeitos que faziam rótulo da AniList competir com curadoria:
--
-- 1. O `||` concatenava c.tags por fora do COALESCE. O COALESCE respeitava a
--    precedência sobre c.genres, mas as tags entravam incondicionalmente — então
--    curar um anime com 3 tags exibia 3 + tudo que a AniList mandou. A precedência
--    do Bloco 1 é: se o valor curado existe, ele ganha. Nunca soma as fontes.
--
-- 2. O default de tier era 'genero', então rótulo não cadastrado na genre_taxonomy
--    virava barra competitiva ("Environmental" chegou a Gênero Favorito). O default
--    passa a ser 'ignorado', tier criado no 008 e já filtrado pelas duas views.
--
-- NULL x vazio: custom_tags NULL = não curado, cai para o cache. custom_tags '{}' =
-- curei e esvaziei de propósito, o anime fica sem rótulo. É a convenção do Bloco 1.
--
-- Reversível: são só CREATE OR REPLACE VIEW. Para voltar ao estado anterior,
-- reaplique a seção 3 do sql/008.

CREATE OR REPLACE VIEW view_user_genre_affinity AS
WITH rotulos_brutos AS (
  SELECT
    e.user_id,
    e.mal_id,
    e.nota,
    r.raw_name
  FROM media_entries e
    LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
    LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
    CROSS JOIN LATERAL unnest(
      COALESCE(
        cur.custom_tags,
        COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])
      )
    ) AS r(raw_name)
  WHERE e.user_id = auth.uid()
    AND e.status = ANY (ARRAY['Completo'::text, 'Em Dia'::text, 'Assistindo'::text])
),
rotulos AS (
  SELECT DISTINCT
    rb.user_id,
    rb.mal_id,
    rb.nota,
    COALESCE(t.display_name_pt, rb.raw_name) AS genre,
    COALESCE(t.tier, 'ignorado')             AS tier
  FROM rotulos_brutos rb
    LEFT JOIN genre_taxonomy t ON t.raw_name = rb.raw_name
  WHERE COALESCE(t.tier, 'ignorado') <> 'ignorado'
)
SELECT
  user_id,
  genre,
  count(*)            AS total_watched,
  round(avg(nota), 1) AS media_nota_genero,
  tier
FROM rotulos
GROUP BY user_id, genre, tier
ORDER BY (count(*)) DESC;

CREATE OR REPLACE VIEW view_user_genre_animes AS
WITH base AS (
  SELECT
    e.user_id,
    e.mal_id,
    e.nota,
    e.status,
    COALESCE(cur.custom_title, c.title) AS title,
    r.raw_name
  FROM media_entries e
    LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
    LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
    CROSS JOIN LATERAL unnest(
      COALESCE(
        cur.custom_tags,
        COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])
      )
    ) AS r(raw_name)
  WHERE e.user_id = auth.uid()
    AND e.status = ANY (ARRAY['Completo'::text, 'Em Dia'::text, 'Assistindo'::text])
)
SELECT DISTINCT
  b.user_id,
  COALESCE(t.display_name_pt, b.raw_name) AS genre,
  b.mal_id,
  b.title,
  b.nota,
  b.status
FROM base b
  LEFT JOIN genre_taxonomy t ON t.raw_name = b.raw_name
WHERE COALESCE(t.tier, 'ignorado') <> 'ignorado';

-- Diagnóstico: rótulos que aparecem no deck e não estão na genre_taxonomy.
-- Com o default 'ignorado' o descarte é silencioso — esta view é o que impede
-- que ele vire cegueira. Ordenada por frequência: é uma fila de trabalho.
-- Tem auth.uid() explícito porque expõe dado de usuário (armadilha #2).
CREATE OR REPLACE VIEW view_unmapped_labels AS
SELECT
  r.raw_name,
  count(DISTINCT e.mal_id) AS animes,
  bool_or(cur.custom_tags IS NOT NULL) AS veio_de_curadoria
FROM media_entries e
  LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
  LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
  CROSS JOIN LATERAL unnest(
    COALESCE(
      cur.custom_tags,
      COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])
    )
  ) AS r(raw_name)
  LEFT JOIN genre_taxonomy t ON t.raw_name = r.raw_name
WHERE e.user_id = auth.uid()
  AND t.raw_name IS NULL
GROUP BY r.raw_name
ORDER BY count(DISTINCT e.mal_id) DESC;