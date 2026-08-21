-- 001 — Campos que faltavam no cache de metadados
--
-- Contexto: o syncMetadataCacheAsync passou a buscar dois campos novos na AniList:
--   * tags        → categorias que a AniList não trata como "genre" (Isekai é o caso central)
--   * season_year → ano de estreia, que alimenta o gráfico de Distribuição por Ano
--
-- A coluna season_year já existia, mas nunca era escrita. As duas linhas abaixo são
-- idempotentes: rodar de novo não quebra nada.

ALTER TABLE anime_metadata_cache
  ADD COLUMN IF NOT EXISTS tags TEXT[];

ALTER TABLE anime_metadata_cache
  ADD COLUMN IF NOT EXISTS season_year INTEGER;
