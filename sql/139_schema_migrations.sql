-- =============================================================================
-- 139 — Controle automático de migrations SQL
-- =============================================================================
-- Tabela operacional que registra os arquivos sql/*.sql já aplicados ao banco.
-- O executor /app/migrate (cmd/migrate) semeia o marco inicial 001..138 quando
-- encontra o banco de produção já povoado e passa a aplicar apenas arquivos >= 139
-- em ordem numérica, com transação por arquivo e conferência de checksum SHA-256.
--
-- Acesso restrito: sem políticas públicas nem permissão a anon/authenticated.

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  arquivo     TEXT PRIMARY KEY CHECK (length(arquivo) BETWEEN 5 AND 120),
  checksum    TEXT NOT NULL CHECK (length(checksum) BETWEEN 8 AND 128),
  aplicado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.schema_migrations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.schema_migrations TO service_role;
