-- =============================================================================
-- 043_mais_reacoes.sql
-- De 6 para 16 reações por episódio. Só troca o CHECK de episode_reactions; as
-- reações já gravadas continuam válidas (as seis antigas estão na lista nova).
--
-- Aplicar antes de promover o código: sem ele, as reações novas são recusadas
-- pelo banco e só as seis antigas funcionam. A lista precisa bater com
-- reacoesValidas (internal/handlers/comunidade_regras.go) e com REACOES
-- (client/src/lib/comunidade.ts).
-- =============================================================================

ALTER TABLE public.episode_reactions
    DROP CONSTRAINT IF EXISTS episode_reactions_reacao_check;

ALTER TABLE public.episode_reactions
    ADD CONSTRAINT episode_reactions_reacao_check CHECK (reacao IN (
        'chorei', 'hype', 'plot_twist', 'luta', 'animacao', 'trilha', 'engracado', 'fofo',
        'shippo', 'tenso', 'medo', 'raiva', 'genial', 'gancho', 'vergonha', 'enrolacao'
    ));

-- -----------------------------------------------------------------------------
-- Conferência (rodar à parte):
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'public.episode_reactions'::regclass AND contype = 'c';
--   -- espera: a lista com as 16 reações, e só um CHECK
-- -----------------------------------------------------------------------------
