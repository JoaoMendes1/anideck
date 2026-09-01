-- 019_policies_initplan_e_sobreposicao.sql
--
-- Reescreve 8 policies para avaliar `auth.uid()` uma vez por consulta em vez de
-- uma vez por linha, e remove a sobreposicao de policies em `curated_animes`.
--
-- ⚠️ NAO altera quem pode ver ou escrever o que. Nenhum predicado muda de
-- significado: `auth.uid() = user_id` e `(SELECT auth.uid()) = user_id` recortam
-- exatamente as mesmas linhas. E performance, nao permissao.
--
-- POR QUE (parte 1 -- Auth RLS Initialization Plan, 8 alertas)
-- `auth.uid()` chamada solta dentro de uma policy e reavaliada pelo Postgres
-- **a cada linha** da tabela. Envolvendo em `(SELECT auth.uid())`, o otimizador
-- monta um InitPlan e executa uma vez por statement, reaproveitando o resultado.
-- Funciona porque o valor nao depende do conteudo da linha -- e o mesmo para
-- todas. O custo hoje e imperceptivel (um usuario, ~70 animes); cresce junto com
-- a tabela e com o numero de contas do beta.
--
-- POR QUE (parte 2 -- Multiple Permissive Policies, 6 alertas)
-- `curated_animes` tinha duas policies permissivas cobrindo SELECT:
--   admin_gerencia_curadoria   ALL     is_admin()
--   Leitura Pública Destaques  SELECT  true
-- Em toda leitura o Postgres avaliava as duas e fazia `OR` entre elas -- e como
-- a segunda ja e `true`, a primeira nunca mudava o resultado. O `ALL` virou
-- INSERT/UPDATE/DELETE, deixando o SELECT so com a policy publica. Comportamento
-- identico ao de hoje.
--
-- A leitura publica e intencional: e a Vitrine de destaques, que aparece sem
-- login. Catalogo curado nao e dado sensivel.
--
-- BONUS: `is_admin()` recebeu o mesmo tratamento de InitPlan nas policies
-- recriadas. Nao estava sinalizada pelo Advisor, mas o motivo e o mesmo e o
-- arquivo ja estava reescrevendo essas linhas.
--
-- TRANSACIONAL: tudo dentro de BEGIN/COMMIT. Se qualquer comando falhar, nada e
-- aplicado -- importante porque a troca do `ALL` em `curated_animes` exige DROP +
-- CREATE, e sem transacao existiria uma janela com a tabela sem policy de escrita.
--
-- ORDEM: independente de deploy. Nao toca em codigo Go nem em view.
--
-- ROLLBACK: no fim do arquivo, comentado.

BEGIN;

-- ---------------------------------------------------------------------------
-- media_entries (4 policies)
-- ---------------------------------------------------------------------------
ALTER POLICY "Usuários podem ver suas próprias entradas" ON media_entries
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Usuários podem inserir suas próprias entradas" ON media_entries
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Usuários podem atualizar suas próprias entradas" ON media_entries
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Usuários podem deletar suas próprias entradas" ON media_entries
  USING ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- episode_progress (1 policy, cmd ALL)
-- ---------------------------------------------------------------------------
ALTER POLICY "Usuarios gerenciam seu proprio progresso de episodios" ON episode_progress
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- notifications (2 policies)
-- ---------------------------------------------------------------------------
ALTER POLICY "Users view own notifications" ON notifications
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users update own notifications" ON notifications
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- push_subscriptions (1 policy, cmd ALL)
-- ---------------------------------------------------------------------------
ALTER POLICY "Users manage own subscriptions" ON push_subscriptions
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- curated_animes -- desfaz a sobreposicao no SELECT
--
-- `ALTER POLICY` nao muda o comando de uma policy, entao a de admin precisa ser
-- recriada. A policy publica de leitura NAO e tocada.
-- ---------------------------------------------------------------------------
DROP POLICY "admin_gerencia_curadoria" ON curated_animes;

CREATE POLICY "admin_insere_curadoria" ON curated_animes
  FOR INSERT TO public
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "admin_atualiza_curadoria" ON curated_animes
  FOR UPDATE TO public
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "admin_remove_curadoria" ON curated_animes
  FOR DELETE TO public
  USING ((SELECT is_admin()));

COMMIT;


-- CONFERENCIA: rodar depois de aplicar.
-- Espera-se `(SELECT auth.uid())` nos predicados das 8 primeiras, e em
-- curated_animes tres policies de escrita + a de leitura publica intacta.
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('media_entries', 'episode_progress', 'notifications',
                    'push_subscriptions', 'curated_animes')
ORDER BY tablename, cmd, policyname;


-- ROLLBACK (nao rodar junto -- so se algo quebrar)
--
-- BEGIN;
-- ALTER POLICY "Usuários podem ver suas próprias entradas" ON media_entries
--   USING (auth.uid() = user_id);
-- ALTER POLICY "Usuários podem inserir suas próprias entradas" ON media_entries
--   WITH CHECK (auth.uid() = user_id);
-- ALTER POLICY "Usuários podem atualizar suas próprias entradas" ON media_entries
--   USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- ALTER POLICY "Usuários podem deletar suas próprias entradas" ON media_entries
--   USING (auth.uid() = user_id);
-- ALTER POLICY "Usuarios gerenciam seu proprio progresso de episodios" ON episode_progress
--   USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- ALTER POLICY "Users view own notifications" ON notifications
--   USING (auth.uid() = user_id);
-- ALTER POLICY "Users update own notifications" ON notifications
--   USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- ALTER POLICY "Users manage own subscriptions" ON push_subscriptions
--   USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- DROP POLICY "admin_insere_curadoria"   ON curated_animes;
-- DROP POLICY "admin_atualiza_curadoria" ON curated_animes;
-- DROP POLICY "admin_remove_curadoria"   ON curated_animes;
-- CREATE POLICY "admin_gerencia_curadoria" ON curated_animes
--   FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());
-- COMMIT;