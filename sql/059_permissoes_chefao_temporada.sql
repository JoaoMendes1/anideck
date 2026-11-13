-- =============================================================================
-- 059_permissoes_chefao_temporada.sql
-- Fase 17.3: Permissões de Execução (GRANT) e Sobrecarga da RPC do Chefão (#185)
--
-- Concede permissões de EXECUTE em obter_chefao_atual e pagar_recompensas_chefao,
-- adiciona sobrecarga sem argumentos para compatibilidade com o PostgREST,
-- e ajusta o HP do chefão 2026-FALL para 50.000 HP (evitando que 2.500 seja
-- considerado derrotado imediatamente no seed).
-- =============================================================================

-- 1. Sobrecarga de obter_chefao_atual sem argumentos
CREATE OR REPLACE FUNCTION public.obter_chefao_atual()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.obter_chefao_atual(NULL::text);
END;
$$;

-- 2. Permissões de execução para obter_chefao_atual (com e sem parâmetro)
REVOKE ALL ON FUNCTION public.obter_chefao_atual(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_chefao_atual(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.obter_chefao_atual() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_chefao_atual() TO anon, authenticated, service_role;

-- 3. Permissões de execução para pagar_recompensas_chefao
REVOKE ALL ON FUNCTION public.pagar_recompensas_chefao(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pagar_recompensas_chefao(UUID) TO authenticated, service_role;

-- 4. Ajuste do HP de Tiamat (2026-FALL) para raid comunitária real (50.000 HP)
UPDATE public.chefoes
   SET hp_total = 50000,
       derrotado = false,
       derrotado_em = NULL
 WHERE temporada = '2026-FALL'
   AND (hp_total <= 2500 OR hp_total IS NULL);
