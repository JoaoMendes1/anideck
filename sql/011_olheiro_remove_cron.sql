-- =============================================================================
-- 011 — Agente Olheiro: remoção do caminho do cron (Fase 4.5, issue #68)
-- =============================================================================
--
-- POR QUE ESTE ARQUIVO EXISTE:
-- o sql/009 e o sql/010 nasceram assumindo que o scan rodaria por cron, sem JWT
-- de usuário. Isso obrigou a criar funções SECURITY DEFINER para contornar a
-- RLS — e função SECURITY DEFINER é chamável por qualquer um que tenha a anon
-- key, que está pública no bundle do frontend. Na prática, dava para injetar
-- linhas na fila de sugestões de fora da aplicação.
--
-- A decisão de trocar o cron por um botão no Painel Admin elimina a causa: o
-- scan passa a rodar com o JWT do admin, a RLS do sql/009 faz o trabalho e
-- nenhuma função precisa contornar nada.
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Remove as funções do caminho do cron
-- -----------------------------------------------------------------------------
-- A gravação agora é INSERT direto pelo Go, autenticado, passando pela policy
-- "admin_gerencia_sugestoes" criada no sql/009.

DROP FUNCTION IF EXISTS public.olheiro_registrar_sugestoes(JSONB);
DROP FUNCTION IF EXISTS public.olheiro_mal_ids_conhecidos();
DROP FUNCTION IF EXISTS public.olheiro_perfil_de_gosto();


-- -----------------------------------------------------------------------------
-- 2. O que permanece, e por quê
-- -----------------------------------------------------------------------------
-- public.fn_user_genre_affinity(uuid)  — continua. Não é SECURITY DEFINER: roda
--   no contexto de quem chama, então a RLS de media_entries protege. É a fonte
--   única da afinidade, consumida pela view (app) e agora pelo Go (Olheiro).
--
-- public.app_admins + public.is_admin()  — continuam. São o que permite à RLS
--   decidir quem é admin, já que ADMIN_USER_ID vive no .env e o Postgres não
--   enxerga variável de ambiente.
--
-- public.curation_suggestions + policy  — continuam, inalteradas. Com o scan
--   autenticado, a policy passa a valer para os dois caminhos (gravar e revisar)
--   em vez de só para a revisão.


-- =============================================================================
-- CONFERÊNCIA (rodar logado como admin)
-- =============================================================================
--   SELECT public.is_admin();                          -- true
--   SELECT * FROM view_user_genre_affinity LIMIT 5;    -- inalterada
--   SELECT count(*) FROM curation_suggestions;         -- fila preservada
-- =============================================================================