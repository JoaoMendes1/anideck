-- =============================================================================
-- 012 — Fotos periódicas do Top Global (issue #73, indicador ▲/▼)
-- =============================================================================
--
-- POR QUE ESTA TABELA EXISTE:
-- a AniList entrega o ranking de AGORA e não guarda histórico. Para dizer que
-- um anime subiu do 2º para o 1º, o AniDeck precisa lembrar que ele estava em
-- 2º — e isso só existe se alguém gravar.
--
-- Cada linha é "o anime X estava na posição N na medição de DATA". Uma medição
-- inteira compartilha o mesmo captured_at, e é ele que agrupa a foto.
--
-- QUEM ESCREVE: o motor de ranking (internal/handlers/ranking.go), que já roda
-- a cada 12h. Ele grava o que JÁ está calculado em memória — nenhuma chamada
-- extra à AniList. A cada execução verifica a idade da última foto e grava uma
-- nova se passou de 30 dias.
--
-- SEM POLICY, DE PROPÓSITO:
-- este projeto tem um event trigger (rls_auto_enable) que liga RLS em toda
-- tabela nova do schema public. Como não criamos nenhuma policy, nem a chave
-- anônima nem usuários logados enxergam esta tabela — só a service role, que
-- ignora RLS por design.
--
-- Isso é intencional: a ANON_KEY é pública (vive no frontend). Uma policy de
-- INSERT liberada deixaria qualquer pessoa gravar posições falsas no histórico
-- — justamente o dado que queremos que seja nosso.
--
-- SEM EXPURGO:
-- 500 animes × 12 fotos por ano = 6 mil linhas/ano. Irrisório. E o histórico
-- acumulado É o produto: com dois anos de fotos dá para responder "qual anime
-- mais subiu no ano?", que nenhuma API responde.
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ranking_snapshots (
    id          BIGSERIAL PRIMARY KEY,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    mal_id      BIGINT      NOT NULL,
    position    INTEGER     NOT NULL,

    -- O mesmo anime não pode aparecer duas vezes na mesma medição. Protege
    -- contra gravação parcial repetida se o motor reiniciar no meio.
    CONSTRAINT ranking_snapshots_unico_por_medicao UNIQUE (captured_at, mal_id)
);

-- A leitura mais frequente é "me dê a foto mais recente": ordena por
-- captured_at DESC e pega o primeiro grupo. Este índice serve exatamente isso.
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_recentes
    ON public.ranking_snapshots (captured_at DESC);

-- Redundante com o event trigger rls_auto_enable, mas explícito: quem ler este
-- arquivo daqui a um ano não deve precisar conhecer o trigger para entender
-- que a tabela está protegida.
ALTER TABLE public.ranking_snapshots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ranking_snapshots IS
    'Fotos periódicas (30 dias) do Top Global Bayesiano. Base do indicador '
    'de variação de posição. Escrita apenas pela service role, via motor de '
    'ranking — sem policy, nenhum acesso pela API pública.';