-- 075_rpg_ajustes.sql
-- Fase 18: ajustes nas migrações 071 e 073, achados na conferência do snapshot de 15/11.
--
-- 1. rpg_chances_invocacao (sql/073) ganha search_path fixo e deixa de ser executável por
--    anon. Ela só devolve constantes; o ajuste é de padrão e do Security Advisor.
-- 2. As policies de rpg_itens (sql/071) e rpg_monstros (sql/072) passam a usar
--    (SELECT public.is_admin()), avaliado uma vez por consulta e não uma vez por linha.
--
-- Idempotente: pode ser reaplicado sem efeito.

ALTER FUNCTION public.rpg_chances_invocacao() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.rpg_chances_invocacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_chances_invocacao() TO authenticated, service_role;

DROP POLICY IF EXISTS rpg_itens_leitura ON public.rpg_itens;
CREATE POLICY rpg_itens_leitura ON public.rpg_itens
  FOR SELECT TO authenticated
  USING (ativo = true OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS rpg_itens_escrita_admin ON public.rpg_itens;
CREATE POLICY rpg_itens_escrita_admin ON public.rpg_itens
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS rpg_monstros_leitura ON public.rpg_monstros;
CREATE POLICY rpg_monstros_leitura ON public.rpg_monstros
  FOR SELECT TO authenticated
  USING (ativo = true OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS rpg_monstros_escrita_admin ON public.rpg_monstros;
CREATE POLICY rpg_monstros_escrita_admin ON public.rpg_monstros
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
