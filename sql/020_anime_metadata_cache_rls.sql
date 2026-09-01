-- =============================================================================
-- 020_anime_metadata_cache_rls.sql
-- =============================================================================
-- As policies de INSERT e UPDATE de anime_metadata_cache nao restringiam nada
-- (WITH CHECK true / USING true). A tabela e compartilhada: existe uma ficha
-- por anime para o site inteiro. Qualquer conta autenticada podia, pelo
-- PostgREST direto (anon key do bundle + JWT proprio), criar linhas novas ou
-- reescrever titulo, capa, duracao e generos de qualquer anime -- sem passar
-- pelo backend Go e portanto sem passar pelo RequireAdmin.
--
-- Mesmo padrao do incidente de app_settings (28/08/2026), Armadilha 15.
--
-- A escrita passa a exigir is_admin(). O cache e populado pela rota
-- /api/admin/metadata/resync, que ja roda com o JWT do admin.
--
-- A policy de SELECT NAO e alterada de proposito: 10 views fazem JOIN nesta
-- tabela e todas tem security_invoker = on desde o 017. Apertar a leitura
-- faria as 10 devolverem vazio sem erro (Armadilha 2).
--
-- (SELECT is_admin()) em vez de is_admin(): initplan, avalia uma vez por
-- query em vez de uma vez por linha. Padrao estabelecido no 019.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- [1] DDL
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir inserção no cache para autenticados"
  ON public.anime_metadata_cache;

CREATE POLICY "Escrita no cache restrita a admin"
  ON public.anime_metadata_cache
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));


DROP POLICY IF EXISTS "Permitir atualização no cache para autenticados"
  ON public.anime_metadata_cache;

CREATE POLICY "Atualização no cache restrita a admin"
  ON public.anime_metadata_cache
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));


-- -----------------------------------------------------------------------------
-- [2] Conferencia: o predicado, nao a contagem (Armadilha 15)
-- -----------------------------------------------------------------------------

SELECT policyname, cmd, roles, qual AS using_expression, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'anime_metadata_cache'
ORDER BY cmd;

-- Esperado: 3 linhas.
--   SELECT | {public}        | true          | -
--   INSERT | {authenticated} | -             | (SELECT is_admin())
--   UPDATE | {authenticated} | (SELECT ...)  | (SELECT is_admin())


-- -----------------------------------------------------------------------------
-- [3] Teste: usuario comum nao escreve mais
-- -----------------------------------------------------------------------------
-- Sem JWT, auth.uid() e NULL e is_admin() devolve false -- e exatamente o
-- cenario de um usuario comum. ROLLBACK no fim: nada e gravado.

BEGIN;
  SET LOCAL ROLE authenticated;

  -- Esperado: ERRO 42501 (new row violates row-level security policy)
  INSERT INTO public.anime_metadata_cache (mal_id, title)
  VALUES (999999999, 'TESTE RLS - NAO DEVE ENTRAR');

ROLLBACK;


BEGIN;
  SET LOCAL ROLE authenticated;

  -- Esperado: 0 linhas afetadas (o USING nao casa com nenhuma linha)
  UPDATE public.anime_metadata_cache
  SET title = 'TESTE RLS - NAO DEVE GRAVAR'
  WHERE mal_id = (SELECT mal_id FROM public.anime_metadata_cache LIMIT 1);

ROLLBACK;


-- -----------------------------------------------------------------------------
-- [4] Teste: o admin continua escrevendo
-- -----------------------------------------------------------------------------
-- ATENCAO: NAO COMMITAR ESTE BLOCO PREENCHIDO. O UUID do ADMIN_USER_ID nao
-- entra no repositorio, que e publico (mesma regra do passo manual do 009).
-- Preencher no SQL Editor na hora de rodar, e deixar o placeholder no arquivo.

-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claims = '{"sub":"<UUID_DO_ADMIN>","role":"authenticated"}';
--
--   -- Esperado: 1 linha inserida
--   INSERT INTO public.anime_metadata_cache (mal_id, title)
--   VALUES (999999999, 'TESTE RLS - ADMIN');
--
-- ROLLBACK;


-- -----------------------------------------------------------------------------
-- [5] Conferencia de lacuna: animes no deck sem ficha no cache
-- -----------------------------------------------------------------------------
-- A partir daqui, anime inedito adicionado por usuario comum nao gera ficha.
-- A falha e silenciosa para quem usa (o log do Render registra, a tela nao).
-- Rodar isto antes de acionar o resync no Painel Admin.

SELECT DISTINCT e.mal_id
FROM public.media_entries e
LEFT JOIN public.anime_metadata_cache c ON c.mal_id = e.mal_id
WHERE c.mal_id IS NULL
ORDER BY e.mal_id;