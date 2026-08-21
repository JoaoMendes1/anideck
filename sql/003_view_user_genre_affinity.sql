-- 003 — Afinidade de gêneros com as 3 camadas da taxonomia
--
-- Esta versão foi reconciliada com a definição real que estava no Supabase (capturada via
-- pg_get_viewdef antes de qualquer alteração), e não reconstruída de memória. O que foi
-- preservado do original, de propósito:
--
--   * As colunas e a ordem delas (user_id, genre, total_watched, media_nota_genero). É o
--     que permite usar CREATE OR REPLACE: o Postgres só aceita acrescentar coluna no fim,
--     nunca renomear ou reordenar as que já existem. `tier` entra como quinta.
--   * Os LEFT JOIN (e não JOIN): um anime sem cache continua aparecendo.
--   * O filtro de status e o `e.user_id = auth.uid()`.
--   * O override da curadoria: `COALESCE(cur.custom_tags, c.genres)` — se o admin cadastrou
--     tags à mão para o anime, os genres da AniList são ignorados.
--
-- O que muda:
--   1. As tags da AniList (anime_metadata_cache.tags) entram como fonte. Era o que faltava
--      para Isekai aparecer nas Estatísticas: a AniList não classifica Isekai como "genre",
--      então buscar só genres nunca ia trazer. Elas são somadas *por fora* do COALESCE —
--      um anime curado à mão não pode perder o Isekai só porque tem custom_tags.
--   2. A tradução deixa de ser uma lista VALUES fixa dentro da view e passa a vir da tabela
--      genre_taxonomy — assim dá para reclassificar sem reescrever a view.
--   3. Sai a coluna `tier`, que diz em qual das três camadas o rótulo cai. É ela que permite
--      a tela separar Demografias de Gêneros e tirar as Tags Temáticas do ranking.
--
-- Nota de tipo: o UNNEST assume que `genres` e `custom_tags` são TEXT[] (foi confirmado —
-- o original já usava unnest nas duas). A coluna `tags` é criada como TEXT[] no 001.

CREATE OR REPLACE VIEW view_user_genre_affinity AS
WITH rotulos_brutos AS (
  SELECT
    e.user_id,
    e.mal_id,
    e.nota,
    r.raw_name
  FROM media_entries e
    LEFT JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
    LEFT JOIN curated_animes cur ON e.mal_id = cur.mal_id
    -- O '{}' no COALESCE é obrigatório: em Postgres NULL || array devolve NULL, e o anime
    -- sumiria da contagem inteira em vez de só ficar sem aquela fonte de rótulo.
    CROSS JOIN LATERAL unnest(
      COALESCE(cur.custom_tags, c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])
    ) AS r(raw_name)
  WHERE e.user_id = auth.uid()
    AND e.status = ANY (ARRAY['Completo'::text, 'Em Dia'::text, 'Assistindo'::text])
),
rotulos AS (
  -- DISTINCT por anime: sem ele, um anime com a custom_tag 'Fantasia' e o genre 'Fantasy'
  -- contaria dois pontos para o mesmo rótulo depois da tradução.
  -- Rótulo desconhecido não some — cai como 'genero' com o nome cru, para ficar visível na
  -- tela e sinalizar que falta cadastrar na genre_taxonomy.
  SELECT DISTINCT
    rb.user_id,
    rb.mal_id,
    rb.nota,
    COALESCE(t.display_name_pt, rb.raw_name) AS genre,
    COALESCE(t.tier, 'genero')               AS tier
  FROM rotulos_brutos rb
  LEFT JOIN genre_taxonomy t ON t.raw_name = rb.raw_name
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
