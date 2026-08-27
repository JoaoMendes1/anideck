-- 014 — Campos novos de curadoria (Bloco 2, Fase 6.9)
--
-- Todas as colunas são NULLABLE e a tabela não muda de forma: são ALTER TABLE ADD
-- COLUMN puros, reversíveis com DROP COLUMN e sem impacto em nada que já existe.
--
-- Convenção NULL x vazio (Bloco 1): NULL = "não curei, cai para a fonte seguinte".
-- Array/objeto vazio = "curei e está vazio de propósito".

-- Episódios curados. Mesmo molde do custom_characters (JSONB com array de objetos).
-- Formato esperado:
--   [{"number": 1, "title": "...", "image": "https://...", "aired_at": "2023-09-29"}, ...]
--
-- ⚠️ ARMADILHA 9: episode_progress.episode_number referencia este "number". Reordenar,
-- inserir no meio ou renumerar dessincroniza silenciosamente o progresso já marcado
-- pelos usuários — sem erro, sem aviso. A numeração 1..N é imutável depois de existir
-- progresso. Corrigir um episódio significa editar o conteúdo, nunca o número.
ALTER TABLE curated_animes ADD COLUMN IF NOT EXISTS custom_episodes JSONB;

-- Links de streaming curados. Os da AniList quebram com frequência (Crunchyroll
-- confirmado na prática), e link morto mata a Ação Rápida "Assistir" da Fase 5.
-- Formato: [{"platform": "Crunchyroll", "url": "https://..."}, ...]
ALTER TABLE curated_animes ADD COLUMN IF NOT EXISTS custom_external_links JSONB;

-- Momento em que o episódio 1 foi ao ar. Um TIMESTAMPTZ em vez de data + dia da
-- semana + horário JST separados: os outros dois derivam deste, e TIMESTAMPTZ
-- converte corretamente para o fuso de quem está olhando. Guardar TIME "em JST"
-- repetiria a armadilha 3 (o Postgres não sabe o fuso de um TIME).
-- É o que permite calcular a contagem regressiva sem consultar a AniList.
ALTER TABLE curated_animes ADD COLUMN IF NOT EXISTS custom_first_aired_at TIMESTAMPTZ;

-- Duração do episódio. Hoje as Estatísticas usam anime_metadata_cache.duration_minutes
-- com fallback de 24 min; sem o cache alimentado, o tempo assistido vira estimativa.
ALTER TABLE curated_animes ADD COLUMN IF NOT EXISTS custom_duration_minutes INTEGER;

-- Separa "tem dado customizado" de "aparece na home". Hoje as duas coisas são a mesma,
-- porque existir em curated_animes significa ser Destaque. Quando curar virar o caminho
-- normal, isso atrapalha todo dia.
-- DEFAULT true preserva o comportamento atual: todo anime já curado continua na home.
ALTER TABLE curated_animes ADD COLUMN IF NOT EXISTS is_destaque BOOLEAN NOT NULL DEFAULT true;

-- Estado de completude da curadoria. Com 100+ animes curados não dá para lembrar
-- onde parou. Alimenta o filtro por completude do Bloco 4.
ALTER TABLE curated_animes ADD COLUMN IF NOT EXISTS curation_status TEXT NOT NULL DEFAULT 'parcial';

ALTER TABLE curated_animes DROP CONSTRAINT IF EXISTS curated_animes_curation_status_check;
ALTER TABLE curated_animes ADD CONSTRAINT curated_animes_curation_status_check
  CHECK (curation_status IN ('parcial', 'completo', 'revisar'));

-- ---------------------------------------------------------------------------
-- Diagnóstico: progresso apontando para episódio que não existe na curadoria
--
-- Não há FK entre episode_progress e custom_episodes — a ligação é convenção por
-- mal_id. Se alguém renumerar episódios no Admin, o progresso já marcado passa a
-- apontar para o nada, sem erro nenhum. Esta view torna isso visível.
--
-- Só lista animes que TÊM custom_episodes: sem curadoria de episódio, a numeração
-- vem da AniList e não há o que comparar.
--
-- auth.uid() explícito porque expõe dado de usuário (armadilha 2). E por isso ela
-- devolve zero linhas no SQL Editor do Supabase — teste pelo Postman com o JWT.
CREATE OR REPLACE VIEW view_episode_progress_orphans AS
SELECT
  ep.user_id,
  ep.mal_id,
  cur.custom_title,
  ep.episode_number,
  ep.watched_at
FROM episode_progress ep
  JOIN curated_animes cur ON cur.mal_id = ep.mal_id
WHERE ep.user_id = auth.uid()
  AND cur.custom_episodes IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(cur.custom_episodes) AS e
    WHERE (e->>'number')::int = ep.episode_number
  )
ORDER BY cur.custom_title, ep.episode_number;