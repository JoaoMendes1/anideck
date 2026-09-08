-- 1. View agregadora de avaliações da comunidade AniDeck
-- Agrupa as notas pessoais dadas no "Meu Deck" de forma rápida e segura
CREATE OR REPLACE VIEW anime_community_scores AS
SELECT 
  mal_id,
  COUNT(nota)::int AS local_votes,
  ROUND(AVG(nota)::numeric, 2)::float AS local_score
FROM media_entries
WHERE nota IS NOT NULL
GROUP BY mal_id;

-- Permissões de leitura para o papel autenticado e serviço
GRANT SELECT ON anime_community_scores TO authenticated;
GRANT SELECT ON anime_community_scores TO service_role;

-- 2. Tabela de estado consolidado do Top Ranking atual
-- Permite ao servidor carregar o Top calculado instantaneamente no boot
CREATE TABLE IF NOT EXISTS ranking_current_cache (
  position INT PRIMARY KEY,
  mal_id INT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  bayesian_score NUMERIC(4,2) NOT NULL,
  score NUMERIC(4,2) NOT NULL,
  local_votes INT NOT NULL DEFAULT 0,
  local_score NUMERIC(4,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permissões na tabela de cache
GRANT SELECT ON ranking_current_cache TO anon, authenticated;
GRANT ALL ON ranking_current_cache TO service_role;

-- Índice para consultas rápidas por mal_id no boot e verificação de stats
CREATE INDEX IF NOT EXISTS idx_ranking_current_cache_mal_id ON ranking_current_cache(mal_id);