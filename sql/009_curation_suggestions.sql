-- =============================================================================
-- 009 — Agente Olheiro: fila de sugestões de curadoria (Fase 4.5, issue #68)
-- =============================================================================
--
-- POR QUE UMA TABELA E NÃO CÁLCULO EM TEMPO REAL:
-- o scan bate na AniList (custa rate limit e tempo). Materializar o resultado
-- permite revisar a fila sem refazer a busca, e guarda o histórico do que já
-- foi dispensado — sem isso o agente sugeriria eternamente o mesmo anime que
-- você já recusou.
--
-- DOIS CAMINHOS DE ACESSO, DUAS ESTRATÉGIAS:
--   1. Scan (escrita)    → cron-job.org, sem JWT → RPC SECURITY DEFINER
--   2. Revisão (Admin)   → seu JWT de usuário    → RLS Policy
--
-- Admin neste projeto é um UUID em variável de ambiente (ADMIN_USER_ID), que o
-- Postgres não enxerga. Por isso a tabela `app_admins` abaixo: espelha essa
-- identidade dentro do banco para que a RLS consiga decidir.
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Espelho da identidade de admin dentro do banco
-- -----------------------------------------------------------------------------
-- O UUID NÃO entra neste arquivo de propósito: o repositório é público e o
-- valor vive no .env. Rode o INSERT do rodapé manualmente, uma única vez.

CREATE TABLE IF NOT EXISTS public.app_admins (
    user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

-- Sem nenhuma policy: ninguém lê essa tabela via API, nem admin.
-- O único acesso é pela função is_admin() abaixo, que roda como owner.


-- -----------------------------------------------------------------------------
-- 2. Função de verificação
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER porque precisa ler `app_admins`, que está fechada por RLS.
-- STABLE porque o resultado não muda dentro da mesma query.
-- search_path fixo evita sequestro da função por schema malicioso.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.app_admins WHERE user_id = auth.uid()
    );
$$;


-- -----------------------------------------------------------------------------
-- 3. A fila de sugestões
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.curation_suggestions (
    id          BIGSERIAL PRIMARY KEY,
    mal_id      BIGINT NOT NULL,
    titulo      TEXT   NOT NULL,
    imagem_url  TEXT,
    motivo      TEXT   NOT NULL,
    score       NUMERIC(6,2) NOT NULL DEFAULT 0,
    status      TEXT   NOT NULL DEFAULT 'pendente',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,

    CONSTRAINT curation_suggestions_status_check
        CHECK (status IN ('pendente', 'curado', 'dispensado')),

    -- Chave da idempotência: um anime só existe uma vez na fila. Rodar o scan
    -- duas vezes no mesmo dia não duplica, e um dispensado nunca volta a
    -- pendente porque o INSERT esbarra aqui e é ignorado.
    CONSTRAINT curation_suggestions_mal_id_unique UNIQUE (mal_id)
);

-- A aba do Admin sempre lista pendentes ordenadas por score.
-- Índice parcial: só indexa as pendentes, mantendo o índice pequeno mesmo
-- depois de centenas de dispensadas acumuladas.
CREATE INDEX IF NOT EXISTS idx_curation_suggestions_pendentes
    ON public.curation_suggestions (score DESC)
    WHERE status = 'pendente';

ALTER TABLE public.curation_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_gerencia_sugestoes" ON public.curation_suggestions;

CREATE POLICY "admin_gerencia_sugestoes"
    ON public.curation_suggestions
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

COMMENT ON TABLE public.curation_suggestions IS
    'Fila do Agente Olheiro. Candidatos a entrar no catálogo curado, revisados '
    'manualmente no Painel Admin. O agente sugere, não decide.';


-- -----------------------------------------------------------------------------
-- 4. RPC de gravação em lote (caminho do cron)
-- -----------------------------------------------------------------------------
-- O cron-job.org bate no endpoint Go com uma chave secreta no header, mas sem
-- JWT de usuário — logo auth.uid() é NULL e a policy acima bloquearia tudo.
-- Mesma solução da Fase 6.7: SECURITY DEFINER, com a autorização acontecendo
-- no Go (validação da chave) antes de chegar aqui.
--
-- Recebe um array JSON e grava tudo numa chamada só, em vez de N inserts.
-- ON CONFLICT DO NOTHING é o que garante a idempotência do scan.

CREATE OR REPLACE FUNCTION public.olheiro_registrar_sugestoes(sugestoes JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    inseridas INTEGER;
BEGIN
    INSERT INTO public.curation_suggestions (mal_id, titulo, imagem_url, motivo, score)
    SELECT
        (s->>'mal_id')::BIGINT,
        s->>'titulo',
        s->>'imagem_url',
        s->>'motivo',
        COALESCE((s->>'score')::NUMERIC, 0)
    FROM jsonb_array_elements(sugestoes) AS s
    ON CONFLICT (mal_id) DO NOTHING;

    GET DIAGNOSTICS inseridas = ROW_COUNT;
    RETURN inseridas;
END;
$$;

COMMENT ON FUNCTION public.olheiro_registrar_sugestoes IS
    'Gravação em lote da fila do Olheiro. SECURITY DEFINER porque o scan roda '
    'via cron sem JWT — a autorização é feita no Go pela chave secreta.';


-- =============================================================================
-- PASSO MANUAL OBRIGATÓRIO (rodar uma vez, fora deste arquivo)
-- =============================================================================
-- Substitua pelo valor de ADMIN_USER_ID do seu .env e rode no SQL Editor.
-- NÃO commite o UUID preenchido.
--
--   INSERT INTO public.app_admins (user_id)
--   VALUES ('SEU-ADMIN-USER-ID-AQUI')
--   ON CONFLICT DO NOTHING;
--
-- Conferência (deve retornar true, logado como admin):
--   SELECT public.is_admin();
-- =============================================================================