-- 008 — Duas correções vindas do uso real com o deck completo
--
-- 1. "Maratona mais rápida" mostrava recordes que nunca aconteceram
-- 2. Tags de metadados da AniList estavam competindo como gênero nas Estatísticas

-- ---------------------------------------------------------------------------
-- 1. Maratona mais rápida: filtro de plausibilidade
--
-- O sintoma: o recorde exibido era "2 eps em 0min". Isso não é uma maratona — é o
-- resultado de marcar dois episódios em sequência na grade, com um segundo de diferença.
-- Como a view ordena pela MENOR duração, a marcação em lote sempre ganhava de qualquer
-- maratona de verdade, e o card mostrava um recorde que nunca existiu.
--
-- A raiz é conhecida e não tem solução: `watched_at` grava quando o episódio foi MARCADO,
-- não quando foi assistido. O que dá pra fazer é descartar o que é fisicamente implausível.
--
-- Dois filtros novos:
--   * pelo menos 3 episódios — dois episódios não formam maratona
--   * pelo menos 5 minutos de intervalo médio entre marcações; abaixo disso é alguém
--     clicando na grade, não alguém assistindo (um episódio de anime dura ~24 min)
--
-- Os 300 segundos são ajustáveis: se o recorde parar de aparecer para maratonas reais que
-- você marca só no fim, baixe o valor; se ainda aparecer marcação em lote, suba.

CREATE OR REPLACE VIEW view_user_fastest_binge AS
 SELECT ep.user_id,
    COALESCE(cur.custom_title, c.title) AS title,
    count(*) AS episodios_marcados,
    EXTRACT(epoch FROM max(ep.watched_at) - min(ep.watched_at)) / 3600::numeric AS horas_gastas
   FROM episode_progress ep
     LEFT JOIN anime_metadata_cache c ON ep.mal_id = c.mal_id
     LEFT JOIN curated_animes cur ON ep.mal_id = cur.mal_id
  WHERE ep.user_id = auth.uid()
  GROUP BY ep.user_id, ep.mal_id, (COALESCE(cur.custom_title, c.title))
 HAVING count(*) >= 3
    AND EXTRACT(epoch FROM max(ep.watched_at) - min(ep.watched_at)) >= (count(*) - 1) * 300
  ORDER BY (EXTRACT(epoch FROM max(ep.watched_at) - min(ep.watched_at)) / 3600::numeric)
 LIMIT 1;

-- ---------------------------------------------------------------------------
-- 2. Camada "ignorado" na taxonomia
--
-- O sintoma: "Male Protagonist", "Female Harem" e "Heterosexual" apareceram no gráfico de
-- Volume × Satisfação disputando espaço com Ação e Fantasia.
--
-- A causa: são tags da AniList que não estavam cadastradas na genre_taxonomy, e o
-- COALESCE da view joga todo rótulo desconhecido em 'genero' — um default seguro para não
-- esconder categoria legítima, mas que deixa passar o ruído junto.
--
-- Essas tags descrevem o elenco, não a obra. "Male Protagonist" não é um gênero nem um
-- tema: é metadado de catálogo. Elas não devem virar badge nem barra — devem sumir. Daí a
-- camada 'ignorado', filtrada nas views antes de chegar à aplicação.

ALTER TABLE genre_taxonomy DROP CONSTRAINT IF EXISTS genre_taxonomy_tier_check;
ALTER TABLE genre_taxonomy ADD CONSTRAINT genre_taxonomy_tier_check
  CHECK (tier IN ('demografia', 'genero', 'tag_tematica', 'ignorado'));

INSERT INTO genre_taxonomy (raw_name, display_name_pt, tier) VALUES
  -- Correção de nomenclatura: a AniList não usa "Harem"/"Reverse Harem". Os nomes reais
  -- são "Female Harem" (o harém clássico) e "Male Harem" (o reverso) — o seed original
  -- errou isso, e por isso "Female Harem" apareceu cru no gráfico.
  ('Female Harem',            'Harém',          'tag_tematica'),
  ('Male Harem',              'Harém Reverso',  'tag_tematica'),

  -- Metadados de elenco e de personagem: descrevem quem aparece, não o que a obra é.
  ('Male Protagonist',        'Male Protagonist',        'ignorado'),
  ('Female Protagonist',      'Female Protagonist',      'ignorado'),
  ('Heterosexual',            'Heterosexual',            'ignorado'),
  ('Primarily Female Cast',   'Primarily Female Cast',   'ignorado'),
  ('Primarily Male Cast',     'Primarily Male Cast',     'ignorado'),
  ('Primarily Adult Cast',    'Primarily Adult Cast',    'ignorado'),
  ('Primarily Teen Cast',     'Primarily Teen Cast',     'ignorado'),
  ('Primarily Child Cast',    'Primarily Child Cast',    'ignorado'),
  ('Ensemble Cast',           'Ensemble Cast',           'ignorado'),
  ('Male Traveler',           'Male Traveler',           'ignorado'),
  ('Female Traveler',         'Female Traveler',         'ignorado'),

  -- Metadados de formato e produção: não dizem nada sobre o gosto de quem assiste.
  ('CGI',                     'CGI',                     'ignorado'),
  ('Full CGI',                'Full CGI',                'ignorado'),
  ('Episodic',                'Episodic',                'ignorado'),
  ('Anachronism',             'Anachronism',             'ignorado'),
  ('Novel',                   'Novel',                   'ignorado'),
  ('Light Novel',             'Light Novel',             'ignorado'),
  ('Manga',                   'Manga',                   'ignorado'),
  ('Web Novel',               'Web Novel',               'ignorado')
ON CONFLICT (raw_name) DO UPDATE
  SET display_name_pt = EXCLUDED.display_name_pt,
      tier            = EXCLUDED.tier;

-- ---------------------------------------------------------------------------
-- 3. As views passam a descartar a camada 'ignorado'
--
-- O filtro fica aqui e não no frontend de propósito: assim vale para qualquer consumidor
-- futuro da view, e o rótulo ignorado nem trafega pela API.
-- ---------------------------------------------------------------------------

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
      COALESCE(cur.custom_tags, c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])
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
    COALESCE(t.tier, 'genero')               AS tier
  FROM rotulos_brutos rb
    LEFT JOIN genre_taxonomy t ON t.raw_name = rb.raw_name
  WHERE COALESCE(t.tier, 'genero') <> 'ignorado'
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
      COALESCE(cur.custom_tags, c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])
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
WHERE COALESCE(t.tier, 'genero') <> 'ignorado';
