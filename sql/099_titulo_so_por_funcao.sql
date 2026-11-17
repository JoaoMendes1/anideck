-- =============================================================================
-- 099 — Título de honra só muda pela função equipar_titulo
-- =============================================================================
--
-- O sql/061 deu ao usuário logado UPDATE direto nas colunas classe e titulo_ativo de
-- profiles. Com o próprio token, dava para gravar qualquer texto como título pela API do
-- banco, sem passar por equipar_titulo, que confere se o título está em
-- titulos_desbloqueados. As duas permissões saem.
--
-- Nada legítimo depende delas: equipar_titulo é SECURITY DEFINER (roda como dona da tabela),
-- o Go não grava o título direto, e a classe deixou de existir no sql/097.
--
-- Pode rodar mais de uma vez.

REVOKE UPDATE (classe, titulo_ativo) ON public.profiles FROM authenticated;
