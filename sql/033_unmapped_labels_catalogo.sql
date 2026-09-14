-- 033_unmapped_labels_catalogo.sql
-- O diagnostico passa a enxergar o catalogo inteiro, nao so o deck de quem consulta.
--
-- MOTIVO: a view via media_entries recortada por auth.uid(). Anime que so outro
-- usuario adicionou ficava invisivel para o admin -- e e justamente esse que
-- precisa de ajuste, porque ninguem curou ainda.
--
-- POR QUE anime_metadata_cache E NAO media_entries: o cache ja tem uma linha por
-- anime que alguem adicionou, com genres e tags, e ja e de leitura publica. Ler
-- media_entries daria ao admin acesso a nota, status e anotacao de cada pessoa --
-- mudanca de politica de privacidade, nao de diagnostico. O conjunto de ANIMES e
-- o mesmo; muda so a tabela de onde ele sai.
--
-- BURACO CONHECIDO que isto NAO resolve: a escrita no anime_metadata_cache exige
-- is_admin() (sql/020), entao usuario comum adicionando anime ao deck nao popula
-- o cache -- o syncMetadataCacheAsync falha e so loga. Anime nessa situacao
-- continua invisivel aqui. Ver continuacao-fase-9.md.
--
-- As duas views seguem com security_invoker = on. O filtro por auth.uid() sai
-- porque nao ha mais dado de usuario envolvido: cache e curadoria sao globais e
-- ambos ja tem policy de SELECT publica. As rotas que as consomem sao de admin.

CREATE OR REPLACE VIEW public.view_unmapped_labels
WITH (security_invoker = on) AS
WITH fontes AS (
  -- Catalogo: todo anime com cache de metadados, com a curadoria sobrepondo
  SELECT c.mal_id,
         COALESCE(cur.custom_tags,
                  COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])) AS tags,
         cur.custom_tags IS NOT NULL AS da_curadoria
  FROM anime_metadata_cache c
  LEFT JOIN curated_animes cur ON cur.mal_id = c.mal_id

  UNION

  -- Curadoria inteira, inclusive anime sem linha no cache
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

CREATE OR REPLACE VIEW public.view_unmapped_labels_detalhe
WITH (security_invoker = on) AS
WITH fontes AS (
  SELECT c.mal_id,
         COALESCE(cur.custom_tags,
                  COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])) AS tags,
         cur.custom_tags IS NOT NULL AS da_curadoria,
         COALESCE(cur.custom_title, c.title) AS titulo,
         cur.id AS curated_id
  FROM anime_metadata_cache c
  LEFT JOIN curated_animes cur ON cur.mal_id = c.mal_id

  UNION

  SELECT cur.mal_id, cur.custom_tags, true, cur.custom_title, cur.id
  FROM curated_animes cur
  WHERE cur.custom_tags IS NOT NULL
)
SELECT r.raw_name,
       f.mal_id,
       f.titulo,
       f.da_curadoria AS veio_de_curadoria,
       -- curated_id NULO significa anime ainda nao curado: a tela nao tem para
       -- onde levar, e esse e o caso que mais interessa corrigir.
       f.curated_id
FROM fontes f
CROSS JOIN LATERAL unnest(f.tags) r(raw_name)
LEFT JOIN genre_taxonomy t ON t.raw_name = r.raw_name
WHERE t.raw_name IS NULL
ORDER BY r.raw_name, f.titulo;