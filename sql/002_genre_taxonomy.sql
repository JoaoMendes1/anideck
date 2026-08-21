-- 002 — Taxonomia própria do AniDeck (3 camadas)
--
-- Por que uma tabela e não uma lista fixa em Go: a classificação é uma decisão de produto
-- que vai mudar com o tempo (uma tag nova vira categoria, uma categoria vira tag). Numa
-- tabela isso é um UPDATE; num arquivo .go é um deploy. Além disso abre caminho para uma
-- tela de edição no Painel Admin no futuro.
--
-- As três camadas:
--   demografia   → categorias com mercado comercial próprio, competem por atenção do
--                  usuário (Shounen, Isekai, Mecha...). A AniList trata Isekai como tag
--                  secundária; aqui ele é categoria principal — é essa a diferença que
--                  justifica o AniDeck ter taxonomia própria em vez de espelhar a AniList.
--   genero       → o clássico (Ação, Drama, Romance...).
--   tag_tematica → detalha cenário, ferramenta ou tipo de personagem (Escolar, Magia,
--                  Samurai...). Não forma categoria comercial sozinha, então fica fora do
--                  ranking competitivo das Estatísticas e aparece só como badge informativo.

CREATE TABLE IF NOT EXISTS genre_taxonomy (
  raw_name        TEXT PRIMARY KEY,   -- como o nome chega até nós: 'Isekai', 'Action', 'Fantasia'
  display_name_pt TEXT NOT NULL,      -- como é exibido na tela: 'Isekai', 'Ação', 'Fantasia'
  tier            TEXT NOT NULL
    CHECK (tier IN ('demografia', 'genero', 'tag_tematica'))
);

-- Leitura liberada para usuário autenticado; escrita fica fora da API (só painel do Supabase),
-- porque taxonomia é decisão de produto, não dado de usuário.
ALTER TABLE genre_taxonomy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Taxonomia é pública para usuários autenticados" ON genre_taxonomy;
CREATE POLICY "Taxonomia é pública para usuários autenticados"
  ON genre_taxonomy FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- Seed
--
-- Duas origens de nome convivem no banco e por isso aparecem as duas aqui:
--   * inglês    — vem da AniList, via anime_metadata_cache.genres / .tags
--   * português — vem do curated_animes.custom_tags, cadastrado à mão no Painel Admin
-- Mapear as duas para o mesmo display_name_pt é o que impede o mesmo gênero de aparecer
-- duas vezes no ranking (era o bug do "Fantasia" duplicado).
--
-- O ON CONFLICT deixa o seed reexecutável: rodar de novo atualiza a classificação em vez
-- de estourar erro de chave duplicada.
-- ---------------------------------------------------------------------------

INSERT INTO genre_taxonomy (raw_name, display_name_pt, tier) VALUES
  -- Camada 1 — Demografias e Mercados
  ('Shounen',        'Shounen',        'demografia'),
  ('Shoujo',         'Shoujo',         'demografia'),
  ('Seinen',         'Seinen',         'demografia'),
  ('Josei',          'Josei',          'demografia'),
  ('Isekai',         'Isekai',         'demografia'),
  ('Mecha',          'Mecha',          'demografia'),
  ('Slice of Life',  'Slice of Life',  'demografia'),
  ('Boys Love',      'Boys Love',      'demografia'),
  ('Boys'' Love',    'Boys Love',      'demografia'),
  ('Shounen Ai',     'Boys Love',      'demografia'),
  ('Yuri',           'Yuri',           'demografia'),
  ('Girls'' Love',   'Yuri',           'demografia'),
  ('Shoujo Ai',      'Yuri',           'demografia'),

  -- Camada 2 — Gêneros Narrativos
  ('Action',         'Ação',              'genero'),
  ('Adventure',      'Aventura',          'genero'),
  ('Comedy',         'Comédia',           'genero'),
  ('Drama',          'Drama',             'genero'),
  ('Sports',         'Esporte',           'genero'),
  ('Fantasy',        'Fantasia',          'genero'),
  ('Sci-Fi',         'Ficção Científica', 'genero'),
  ('Horror',         'Terror',            'genero'),
  ('Mystery',        'Mistério',          'genero'),
  ('Romance',        'Romance',           'genero'),
  ('Thriller',       'Suspense',          'genero'),
  ('Mahou Shoujo',   'Garotas Mágicas',   'genero'),

  -- Camada 3 — Tags Temáticas
  ('Martial Arts',   'Artes Marciais', 'tag_tematica'),
  ('Demons',         'Demônios',       'tag_tematica'),
  ('Ecchi',          'Ecchi',          'tag_tematica'),
  ('School',         'Escolar',        'tag_tematica'),
  ('Harem',          'Harém',          'tag_tematica'),
  ('Reverse Harem',  'Harém Reverso',  'tag_tematica'),
  ('Historical',     'Histórico',      'tag_tematica'),
  ('Video Games',    'Jogo',           'tag_tematica'),
  ('Magic',          'Magia',          'tag_tematica'),
  ('Military',       'Militar',        'tag_tematica'),
  ('Music',          'Musical',        'tag_tematica'),
  ('Psychological',  'Psicológico',    'tag_tematica'),
  ('Samurai',        'Samurai',        'tag_tematica'),
  ('Supernatural',   'Sobrenatural',   'tag_tematica'),
  ('Super Power',    'Super Poderes',  'tag_tematica'),
  ('Hentai',         'Hentai',         'tag_tematica'),

  -- Apelidos em português (custom_tags do Painel Admin) apontando para o mesmo display.
  -- Só entram aqui os nomes que mudam na tradução: 'Romance', 'Drama', 'Isekai', 'Mecha',
  -- 'Ecchi' e afins já são idênticos nos dois idiomas e casam com as linhas acima.
  ('Ação',              'Ação',              'genero'),
  ('Aventura',          'Aventura',          'genero'),
  ('Comédia',           'Comédia',           'genero'),
  ('Esporte',           'Esporte',           'genero'),
  ('Esportes',          'Esporte',           'genero'),
  ('Fantasia',          'Fantasia',          'genero'),
  ('Ficção Científica', 'Ficção Científica', 'genero'),
  ('Terror',            'Terror',            'genero'),
  ('Mistério',          'Mistério',          'genero'),
  ('Suspense',          'Suspense',          'genero'),
  ('Garotas Mágicas',   'Garotas Mágicas',   'genero'),
  ('Artes Marciais',    'Artes Marciais',    'tag_tematica'),
  ('Demônios',          'Demônios',          'tag_tematica'),
  ('Escolar',           'Escolar',           'tag_tematica'),
  ('Harém',             'Harém',             'tag_tematica'),
  ('Histórico',         'Histórico',         'tag_tematica'),
  ('Jogo',              'Jogo',              'tag_tematica'),
  ('Magia',             'Magia',             'tag_tematica'),
  ('Militar',           'Militar',           'tag_tematica'),
  ('Musical',           'Musical',           'tag_tematica'),
  ('Psicológico',       'Psicológico',       'tag_tematica'),
  ('Sobrenatural',      'Sobrenatural',      'tag_tematica'),
  ('Super Poderes',     'Super Poderes',     'tag_tematica')
ON CONFLICT (raw_name) DO UPDATE
  SET display_name_pt = EXCLUDED.display_name_pt,
      tier            = EXCLUDED.tier;
