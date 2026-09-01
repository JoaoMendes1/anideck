-- =============================================================================
-- 021_media_entries_cascade.sql
-- =============================================================================
-- A FK de media_entries -> auth.users era NO ACTION, enquanto app_admins,
-- episode_progress, notifications e push_subscriptions ja eram CASCADE.
-- Efeito: apagar um usuario com pelo menos uma entrada no deck FALHAVA por
-- violacao de chave estrangeira -- ou seja, exclusao de conta era impossivel.
--
-- Nao foi decisao: media_entries e a tabela mais antiga do projeto e ficou no
-- default do Postgres. As outras nasceram depois, ja com CASCADE.
--
-- Depois deste arquivo, DELETE em auth.users leva o deck junto, numa unica
-- transacao -- que e o comportamento correto para exclusao de conta.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- [1] Antes: confirmar o estado atual
-- -----------------------------------------------------------------------------

SELECT conname,
       CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'c' THEN 'CASCADE' END AS ao_deletar
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE con.contype = 'f' AND rel.relname = 'media_entries';

-- Esperado: media_entries_user_id_fkey | NO ACTION


-- -----------------------------------------------------------------------------
-- [2] DDL
-- -----------------------------------------------------------------------------
-- Nao existe ALTER CONSTRAINT para trocar a regra de delete: derruba e recria.
-- Em transacao, para nao existir instante sem a chave.

BEGIN;

  ALTER TABLE public.media_entries
    DROP CONSTRAINT media_entries_user_id_fkey;

  ALTER TABLE public.media_entries
    ADD CONSTRAINT media_entries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

COMMIT;


-- -----------------------------------------------------------------------------
-- [3] Depois: confirmar
-- -----------------------------------------------------------------------------

SELECT rel.relname AS tabela,
       CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'c' THEN 'CASCADE' END AS ao_deletar
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
JOIN pg_class rel_f ON rel_f.oid = con.confrelid
WHERE con.contype = 'f' AND nsp.nspname = 'public' AND rel_f.relname = 'users'
ORDER BY rel.relname;

-- Esperado: as 5 tabelas com CASCADE.