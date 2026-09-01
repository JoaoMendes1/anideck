-- 018_rpcs_cron_sem_execute_publico.sql
--
-- Fecha o EXECUTE publico das duas RPCs do checador de episodios.
--
-- ⚠️ ORDEM OBRIGATORIA: aplicar DEPOIS do deploy do `notifications.go` que troca
-- a ANON_KEY pela SERVICE_KEY no `callRPC`. A ordem inversa derruba o cron de
-- episodios novos (o callRPC passa a receber 403 e nenhuma notificacao sai).
-- Confirmar tambem que SUPABASE_SERVICE_KEY existe no ambiente do Render ANTES
-- do deploy -- ela saiu do backend na decisao de 07/08/2026 e pode nao estar mais la.
--
-- POR QUE
-- As duas funcoes sao SECURITY DEFINER (ignoram RLS) e tinham EXECUTE liberado
-- para o publico. Isso era necessario porque o `callRPC` do backend autenticava
-- com a ANON_KEY, que vive no bundle do frontend e no repositorio publico.
-- O `X-Cron-Secret` protege o endpoint do Go, mas nao o caminho direto ao
-- PostgREST: qualquer pessoa com a anon key chamava as RPCs sem passar pelo
-- backend.
--
-- O que estava exposto:
--   get_cron_media_entries()      -> SELECT user_id, mal_id FROM media_entries
--                                    sem filtro nenhum. Devolvia o que TODOS os
--                                    usuarios estao assistindo, com o UUID de
--                                    cada conta. Mesmo vazamento do incidente de
--                                    20/08/2026, por outra porta.
--   process_cron_notification(..) -> recebe p_user_id como PARAMETRO. Quem chama
--                                    escolhe a conta: escreve notificacao falsa
--                                    em qualquer usuario e recebe de volta o
--                                    endpoint/p256dh/auth das push_subscriptions
--                                    dele -- que juntos SAO a credencial de envio
--                                    de Web Push. Armadilha 7 na camada do banco:
--                                    user_id vindo do payload, nao do JWT.
--
-- As duas encaixam uma na outra: a primeira entrega os UUIDs, a segunda converte
-- UUID em credencial de push.
--
-- CORRECAO DE REGISTRO: a decisao de 22/08/2026 afirma que o `sql/011` derrubou
-- as tres funcoes do caminho de cron. Duas continuavam no banco. Armadilha 12 --
-- o arquivo nao e o estado do banco.
--
-- ATENCAO AO `PUBLIC`: no Postgres, funcao nova nasce com EXECUTE concedido ao
-- pseudo-papel PUBLIC, e `anon`/`authenticated` herdam por ali. Revogar so desses
-- dois nao adianta -- a concessao a PUBLIC continua valendo. Por isso o REVOKE
-- abaixo inclui PUBLIC, e o GRANT devolve o acesso apenas ao service_role.
--
-- NAO MEXER em `rls_auto_enable()`: e event trigger do proprio Supabase que liga
-- RLS em toda tabela nova do `public`. Trabalha a favor, nao recebe parametro e
-- nao e chamavel como funcao comum. O alerta do Advisor sobre ela e ruido.
--
-- ROLLBACK:
--   GRANT EXECUTE ON FUNCTION public.get_cron_media_entries() TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.process_cron_notification(uuid, integer, integer, text, text) TO anon, authenticated;
--   (so faz sentido junto com o rollback do deploy do notifications.go)

REVOKE EXECUTE ON FUNCTION public.get_cron_media_entries()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.process_cron_notification(uuid, integer, integer, text, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_cron_media_entries()
  TO service_role;

GRANT EXECUTE ON FUNCTION public.process_cron_notification(uuid, integer, integer, text, text)
  TO service_role;


-- CONFERENCIA: rodar depois de aplicar.
-- Espera-se anon_exec = false, auth_exec = false, service_exec = true nas duas.
SELECT p.proname,
       has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
       has_function_privilege('service_role',  p.oid, 'EXECUTE') AS service_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_cron_media_entries', 'process_cron_notification');


-- LIMPEZA FUTURA (nao fazer agora): com o acesso restrito ao service_role, que ja
-- ignora RLS, o SECURITY DEFINER das duas funcoes passa a ser redundante. Remover
-- exige recriar as funcoes -- vale a pena junto com a proxima mudanca nelas, nao
-- isolado.