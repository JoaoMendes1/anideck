-- 029_sinonimos_curadoria_pt.sql
-- A IA da curadoria gera tags em portugues; a genre_taxonomy so tinha os nomes
-- da AniList para elas. O resultado era tag caindo em 'ignorado' e o anime
-- sumindo dos graficos em silencio.
--
-- A tabela ja foi feita para isto: raw_name e a chave de ENTRADA e varias linhas
-- apontam para o mesmo display_name_pt (ver 'Shounen Ai' -> 'Boys Love'). Estas
-- linhas so acrescentam as entradas em portugues que faltavam.
--
-- Fora daqui, corrigidas na origem por serem caso isolado ou combinacao:
--   Comedia Romantica  -> virou Comedia + Romance em 5 animes
--   Ninjas             -> virou Artes Marciais em 1 anime (Black Torch)
--   Construcao de Mundo-> virou Fantasia em 1 anime
-- Ver o bloco de UPDATEs no fim deste arquivo.

INSERT INTO genre_taxonomy (raw_name, display_name_pt, tier) VALUES
  ('Vida Escolar', 'Escolar',       'tag_tematica'),
  ('Cotidiano',    'Slice of Life', 'demografia'),
  ('Dia a Dia',    'Slice of Life', 'demografia'),
  ('Jogos',        'Jogo',          'tag_tematica'),
  ('Gods',         'Deuses',        'tag_tematica'),
  ('Deuses',       'Deuses',        'tag_tematica'),
  ('Swordplay',    'Espadas',       'tag_tematica'),
  ('Espadas',      'Espadas',       'tag_tematica'),
  ('Urban Fantasy','Fantasia Urbana','tag_tematica'),
  ('Fantasia Urbana','Fantasia Urbana','tag_tematica'),
  ('War',          'Guerra',        'tag_tematica'),
  ('Guerra',       'Guerra',        'tag_tematica')
ON CONFLICT (raw_name) DO NOTHING;