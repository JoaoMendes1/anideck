-- 030_unmapped_labels_detalhe.sql
-- Duas correcoes na visibilidade de rotulo orfao.
--
-- 1) A view_unmapped_labels so olhava media_entries, ou seja, o DECK de quem
--    consulta. Anime curado e nunca adicionado ao deck ficava invisivel -- foi
--    assim que 'Amigos de Infancia' e 'Reencarnacao' passaram despercebidos.
--    A view nova comeca pela uniao do deck com a curadoria.
--
-- 2) A view agregada diz QUANTOS animes, nunca QUAIS. Sem os titulos nao da
--    para corrigir sem abrir o SQL Editor, que e o que a aba de Controle veio
--    eliminar. A view de detalhe abaixo devolve uma linha por anime.
--
-- As duas com security_invoker = on e filtro por auth.uid() explicito -- regra 1
-- do sql/README.md. Curadoria e global (nao tem user_id), entao o recorte por
-- usuario vale so para o lado do deck.

CREATE OR REPLACE VIEW public.view_unmapped_labels
WITH (security_invoker = on) AS
WITH fontes AS (
  -- Deck do usuario: tags da curadoria quando existem, senao as do cache
  SELECT e.mal_id,
         COALESCE(cur.custom_tags,
                  COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])) AS tags,
         cur.custom_tags IS NOT NULL AS da_curadoria
  FROM media_entries e
  LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
  LEFT JOIN curated_animes cur     ON cur.mal_id = e.mal_id
  WHERE e.user_id = (SELECT auth.uid())

  UNION

  -- Curadoria inteira, inclusive anime que ninguem adicionou ao deck
  SELECT cur.mal_id, cur.custom_tags, true
  FROM curated_animes cur
  WHERE cur.custom_tags IS NOT NULL
)
SELECT r.raw_name,
       count(DISTINCT f.mal_id) AS animes,
       bool_or(f.da_curadoria)  AS veio_de_curadoria
FROM fontes f
CROSS JOIN LATERAL unnest(f.tags) r(raw_name)
LEFT JOIN genre_taxonomy t ON t.raw_name = r.raw_name
WHERE t.raw_name IS NULL
GROUP BY r.raw_name
ORDER BY count(DISTINCT f.mal_id) DESC;

-- Uma linha por anime, para a tela poder listar e levar a correcao.
CREATE OR REPLACE VIEW public.view_unmapped_labels_detalhe
WITH (security_invoker = on) AS
WITH fontes AS (
  SELECT e.mal_id,
         COALESCE(cur.custom_tags,
                  COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])) AS tags,
         cur.custom_tags IS NOT NULL AS da_curadoria,
         COALESCE(cur.custom_title, c.title) AS titulo,
         cur.id AS curated_id
  FROM media_entries e
  LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
  LEFT JOIN curated_animes cur     ON cur.mal_id = e.mal_id
  WHERE e.user_id = (SELECT auth.uid())

  UNION

  SELECT cur.mal_id, cur.custom_tags, true, cur.custom_title, cur.id
  FROM curated_animes cur
  WHERE cur.custom_tags IS NOT NULL
)
SELECT r.raw_name,
       f.mal_id,
       f.titulo,
       f.da_curadoria AS veio_de_curadoria,
       -- curated_id nao nulo significa que da para abrir direto no editor
       f.curated_id
FROM fontes f
CROSS JOIN LATERAL unnest(f.tags) r(raw_name)
LEFT JOIN genre_taxonomy t ON t.raw_name = r.raw_name
WHERE t.raw_name IS NULL
ORDER BY r.raw_name, f.titulo;