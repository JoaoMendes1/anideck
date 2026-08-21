-- 007 — Animes por ano de estreia (drill-down da Distribuição por Ano)
--
-- Mesma ideia da view_user_genre_animes: um gráfico que mostra "2010: 1 anime" não diz
-- QUAL anime, e essa era a informação que a pessoa realmente queria ao olhar a barra.
--
-- Espelha o filtro da view_user_year_distribution (`season_year IS NOT NULL` + JOIN, não
-- LEFT JOIN) de propósito: a contagem da barra tem que bater com o tamanho da lista.

CREATE OR REPLACE VIEW view_user_year_animes AS
SELECT
  e.user_id,
  c.season_year,
  e.mal_id,
  COALESCE(cur.custom_title, c.title) AS title,
  e.nota,
  e.status
FROM media_entries e
  JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
  LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
WHERE e.user_id = auth.uid()
  AND c.season_year IS NOT NULL;
