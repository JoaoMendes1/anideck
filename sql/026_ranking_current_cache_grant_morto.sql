-- =============================================================================
-- sql/026_ranking_current_cache_grant_morto.sql
-- =============================================================================
-- O sql/024 concedeu SELECT em ranking_current_cache a anon e authenticated, mas a
-- tabela está com RLS ligada e zero policies. RLS sem policy nega tudo, então a
-- permissão nunca funcionou: quem tentasse ler recebia vazio, sem erro.
--
-- POR QUE REVOGAR EM VEZ DE CRIAR POLICY: o Top já chega ao frontend pelo endpoint
-- /api/ranking do Go, que lê a tabela com service_role e ignora RLS. Não há leitor
-- direto para atender. Manter a permissão só faz a próxima pessoa supor que existe um.
--
-- SE UM DIA PRECISAR: criar uma policy de SELECT (USING (true)) e devolver o GRANT.
-- Os dados não são de usuário — são o Top público — então leitura aberta é aceitável.
--
-- Não afeta o motor de ranking. service_role mantém ALL, concedido no sql/024.
-- =============================================================================

REVOKE SELECT ON public.ranking_current_cache FROM anon, authenticated;


-- =============================================================================
-- CONFERÊNCIA
-- =============================================================================
-- Deve sobrar só service_role. E o /api/ranking tem que continuar respondendo.
-- =============================================================================
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_name = 'ranking_current_cache'
-- ORDER BY grantee;