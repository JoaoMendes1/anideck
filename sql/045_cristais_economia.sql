-- =============================================================================
-- 045_cristais_economia.sql
-- Fase 16 · Item 16.1a (#167): Cristais — carteira, extrato e painel de economia.
--
-- Implementa a moeda gastável de mérito do AniDeck, separada do XP:
--   * Tabela public.crystal_ledger: extrato de inclusão com UNIQUE (user_id, motivo, referencia)
--     para garantir idempotência total (mesmo crédito ou débito repetido vira erro 23505).
--   * Saldo derivado exclusivamente de SUM(quantidade) no banco (PITFALLS item 28).
--   * Sem permissão de INSERT direto para authenticated; movimentações ocorrem
--     apenas via RPCs SECURITY DEFINER (creditar_cristais e debitar_cristais)
--     restritas a service_role.
--   * Débito atômico com pg_advisory_xact_lock por usuário, impedindo saldo negativo
--     mesmo com chamadas simultâneas.
--   * Chave inicial app_settings.economia_cristais com teto diário e ganhos por fonte.
--
-- APLICAR ANTES de promover o código da #167.
-- =============================================================================

-- =============================================================================
-- 1. Tabela public.crystal_ledger (extrato de movimentações)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.crystal_ledger (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantidade   INTEGER NOT NULL CHECK (quantidade <> 0),
  motivo       TEXT NOT NULL CHECK (char_length(btrim(motivo)) BETWEEN 1 AND 60),
  referencia   TEXT NOT NULL CHECK (char_length(btrim(referencia)) BETWEEN 1 AND 120),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, motivo, referencia)
);

CREATE INDEX IF NOT EXISTS crystal_ledger_user_criado_idx
  ON public.crystal_ledger (user_id, criado_em DESC);

ALTER TABLE public.crystal_ledger ENABLE ROW LEVEL SECURITY;

-- Leitura do próprio extrato para o usuário logado
DROP POLICY IF EXISTS crystal_ledger_user_select ON public.crystal_ledger;
CREATE POLICY crystal_ledger_user_select ON public.crystal_ledger
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Leitura para administradores (Painel de Economia e auditoria)
DROP POLICY IF EXISTS crystal_ledger_admin_select ON public.crystal_ledger;
CREATE POLICY crystal_ledger_admin_select ON public.crystal_ledger
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

-- Usuários e anônimos NÃO inserem, atualizam ou deletam no ledger diretamente
REVOKE INSERT, UPDATE, DELETE ON public.crystal_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.crystal_ledger TO authenticated;
GRANT ALL ON public.crystal_ledger TO service_role;

-- =============================================================================
-- 2. Funções de consulta de saldo (SUM no SQL)
-- =============================================================================

-- Devolve o saldo de Cristais do usuário autenticado atual
CREATE OR REPLACE FUNCTION public.meu_saldo_cristais()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(quantidade), 0)::INTEGER
    FROM public.crystal_ledger
   WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.meu_saldo_cristais() TO authenticated;
GRANT EXECUTE ON FUNCTION public.meu_saldo_cristais() TO service_role;

-- Devolve o saldo de Cristais de qualquer usuário (só service_role / consultas administrativas)
CREATE OR REPLACE FUNCTION public.saldo_cristais_usuario(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(quantidade), 0)::INTEGER
    FROM public.crystal_ledger
   WHERE user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.saldo_cristais_usuario(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saldo_cristais_usuario(UUID) TO service_role;

-- Devolve a soma total de Cristais em circulação no sistema
CREATE OR REPLACE FUNCTION public.total_cristais_em_circulacao()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(quantidade), 0)::INTEGER
    FROM public.crystal_ledger;
$$;

REVOKE ALL ON FUNCTION public.total_cristais_em_circulacao() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.total_cristais_em_circulacao() TO service_role;

-- =============================================================================
-- 3. Funções atômicas de crédito e débito (só service_role)
-- =============================================================================

-- Credita Cristais para um usuário de forma atômica e idempotente
CREATE OR REPLACE FUNCTION public.creditar_cristais(
  p_user_id    UUID,
  p_quantidade INTEGER,
  p_motivo     TEXT,
  p_referencia TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_novo_saldo INTEGER;
BEGIN
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'A quantidade para crédito deve ser positiva (recebido: %)', p_quantidade
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
  VALUES (p_user_id, p_quantidade, btrim(p_motivo), btrim(p_referencia));

  SELECT COALESCE(SUM(quantidade), 0)::INTEGER INTO v_novo_saldo
    FROM public.crystal_ledger
   WHERE user_id = p_user_id;

  RETURN v_novo_saldo;
END;
$$;

REVOKE ALL ON FUNCTION public.creditar_cristais(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_cristais(UUID, INTEGER, TEXT, TEXT) TO service_role;

-- Debita Cristais com trava atômica de transação por usuário (impede saldo negativo)
CREATE OR REPLACE FUNCTION public.debitar_cristais(
  p_user_id    UUID,
  p_quantidade INTEGER,
  p_motivo     TEXT,
  p_referencia TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_saldo_atual INTEGER;
  v_novo_saldo  INTEGER;
BEGIN
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'A quantidade para débito deve ser positiva (recebido: %)', p_quantidade
      USING ERRCODE = 'P0001';
  END IF;

  -- Trava atômica da transação para o usuário
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT COALESCE(SUM(quantidade), 0)::INTEGER INTO v_saldo_atual
    FROM public.crystal_ledger
   WHERE user_id = p_user_id;

  IF v_saldo_atual < p_quantidade THEN
    RAISE EXCEPTION 'Saldo insuficiente de Cristais: saldo atual %, necessário %', v_saldo_atual, p_quantidade
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
  VALUES (p_user_id, -p_quantidade, btrim(p_motivo), btrim(p_referencia));

  v_novo_saldo := v_saldo_atual - p_quantidade;
  RETURN v_novo_saldo;
END;
$$;

REVOKE ALL ON FUNCTION public.debitar_cristais(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debitar_cristais(UUID, INTEGER, TEXT, TEXT) TO service_role;

-- =============================================================================
-- 4. Chave inicial em app_settings
-- =============================================================================
INSERT INTO public.app_settings (key, value, updated_at)
VALUES (
  'economia_cristais',
  '{"teto_diario_cristais":100,"ganho_missao_diaria":15,"ganho_desafio_semanal":50,"ganho_vitoria_liga":100,"ganho_subida_divisao":40,"ganho_primeira_carta_dia":10}',
  now()
)
ON CONFLICT (key) DO NOTHING;
