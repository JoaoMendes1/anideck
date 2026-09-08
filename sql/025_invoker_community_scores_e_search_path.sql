-- =============================================================================
-- sql/025_invoker_community_scores_e_search_path.sql
-- =============================================================================
-- Duas correções de endurecimento, nenhuma delas altera comportamento.
--
-- 1) anime_community_scores nasceu no sql/024 sem WITH (security_invoker = on).
--    Não foi decisão: é o default do Postgres (Armadilha 2 do PITFALLS.md).
--    Ligar não muda nada para o motor de ranking, porque o carregarVotosComunitarios
--    do internal/handlers/ranking.go lê a view com service_role, que tem BYPASSRLS.
--
--    O GRANT SELECT para authenticated do sql/024 fica de propósito, para o caso
--    de a média da comunidade ir para a tela algum dia.
--
-- 2) hook_limite_cadastros (sql/022) é a única função do banco sem search_path.
--    Sem ele, quem puder criar objeto num schema à frente do caminho de busca faz
--    a função ler uma app_settings falsa. As demais funções já usam public, pg_temp.
--
-- POR QUE ALTER E NÃO CREATE OR REPLACE: os dois comandos mudam só a opção, sem
-- reescrever a definição. CREATE OR REPLACE reescreveria o corpo inteiro, e erro
-- de digitação ali vira objeto diferente sem aviso (Armadilha 12).
--
-- ORDEM EM RELAÇÃO AO DEPLOY: indiferente. Nenhum dos dois muda contrato de API.
-- ROLLBACK: trocar 'on' por 'off' no primeiro; RESET search_path no segundo.
-- =============================================================================


-- 1. A view passa a rodar no contexto de quem consulta.
ALTER VIEW public.anime_community_scores SET (security_invoker = on);


-- 2. A função passa a ter caminho de busca fixo.
ALTER FUNCTION public.hook_limite_cadastros(jsonb)
  SET search_path = public, pg_temp;


-- =============================================================================
-- CONFERÊNCIA
-- =============================================================================
-- A primeira query deve devolver 17 linhas, todas com invoker = on.
-- A segunda deve mostrar search_path=public, pg_temp na função.
-- =============================================================================
-- SELECT c.relname AS view,
--        COALESCE((SELECT option_value FROM pg_options_to_table(c.reloptions)
--                  WHERE option_name = 'security_invoker'), 'off') AS invoker
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE c.relkind = 'v' AND n.nspname = 'public'
-- ORDER BY invoker, c.relname;
--
-- SELECT proname, proconfig
-- FROM pg_proc
-- WHERE proname = 'hook_limite_cadastros';
--
-- E o hook precisa continuar respondendo depois da mudança:
-- SELECT public.hook_limite_cadastros('{"user":{"email":"teste@exemplo.com"}}'::jsonb);
-- {} = liberado. Objeto com error = bloqueado.