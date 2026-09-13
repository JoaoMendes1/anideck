-- 028_storage_uso_bucket.sql
-- Da ao admin como LER o uso do bucket curadoria, para a secao de Diagnostico
-- do Painel de Controle.
--
-- Sao duas coisas:
--
-- 1) Policy de SELECT em storage.objects. Hoje a tabela tem UMA unica policy, de
--    INSERT -- sem uma de SELECT, a listagem devolve ZERO LINHAS SEM ERRO e a
--    tela exibiria "0 MB" como se o bucket estivesse vazio (Armadilha 2).
--
-- 2) Uma RPC que devolve a contagem e a soma. Necessaria porque o cliente Go do
--    PostgREST nao permite consultar outro schema alem de public -- o metodo
--    .Schema() nao existe na SDK. A funcao vive em public e le storage.objects.
--
-- A funcao NAO e SECURITY DEFINER: assim ela roda como quem chama e a policy
-- acima continua valendo. Definer aqui daria a soma a qualquer um que tivesse a
-- anon key -- foi assim que o vazamento do sql/018 aconteceu.
--
-- Pode ser aplicado antes ou depois do deploy: sem o endpoint, ninguem chama.

-- 1) Leitura dos arquivos do bucket, so para admin
CREATE POLICY "Admin lista arquivos da curadoria"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'curadoria' AND (SELECT is_admin())
);

-- 2) Agregacao pronta, chamavel pelo PostgREST
CREATE OR REPLACE FUNCTION public.uso_do_bucket_curadoria()
RETURNS TABLE (arquivos bigint, bytes bigint)
LANGUAGE sql
STABLE
SET search_path = public, storage, pg_temp
AS $$
  SELECT count(*)::bigint,
         COALESCE(sum((metadata->>'size')::bigint), 0)::bigint
  FROM storage.objects
  WHERE bucket_id = 'curadoria';
$$;

-- Fecha a execucao. Funcao nasce com EXECUTE para PUBLIC, e anon/authenticated
-- herdam por ali -- revogar so dos dois nao fecha nada (ver secao [7] do snapshot).
REVOKE EXECUTE ON FUNCTION public.uso_do_bucket_curadoria() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.uso_do_bucket_curadoria() TO authenticated;

-- CONFERENCIA -- rodar depois de aplicar, dentro da transacao abortada.
-- Usuario comum tem que devolver 0 arquivos e 0 bytes: ele passa no GRANT, mas
-- a policy o barra dentro da funcao, que nao e definer.
--
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';
--   SELECT * FROM public.uso_do_bucket_curadoria();
-- ROLLBACK;