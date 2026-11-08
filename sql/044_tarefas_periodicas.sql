-- =============================================================================
-- 044_tarefas_periodicas.sql
-- Fase 16 · Item 16.0 (#166): tarefas periódicas no worker.
--
-- Base das rotinas que precisam rodar uma única vez por janela de tempo no fuso
-- de Brasília: fechar liga semanal, recalcular raridade de cartas, atualizar
-- rankings de temporada, fechar desafio de clã e distribuir recompensas.
--
-- Regras que o banco garante sozinho:
--   * UNIQUE (nome, periodo) impede que a mesma tarefa conclua duas vezes no
--     mesmo período (ex.: 'manutencao_diaria' em '2026-11-08' ou 'liga' em
--     '2026-W46'), mesmo se o container reiniciar ou se o admin clicar em
--     "Rodar agora" ao mesmo tempo que o worker.
--   * A função reservar_tarefa_periodica faz a trava atômica: só entrega a
--     linha se o período ainda não começou, se a tentativa anterior registrou
--     erro ou se ficou presa em execução há mais de 15 minutos.
--   * Acesso exclusivo via service_role (worker e endpoints administrativos do
--     servidor Go após validar RequireAuth + RequireAdmin).
--
-- APLICAR ANTES de promover o código da #166.
-- =============================================================================

-- =============================================================================
-- 1. Tabela de controle de execução por período
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tarefas_periodicas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 1 AND 80),
  periodo      TEXT NOT NULL CHECK (char_length(btrim(periodo)) BETWEEN 1 AND 40),
  iniciada_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluida_em TIMESTAMPTZ,
  erro         TEXT,
  resumo       TEXT,
  UNIQUE (nome, periodo)
);

CREATE INDEX IF NOT EXISTS tarefas_periodicas_nome_iniciada_idx
  ON public.tarefas_periodicas (nome, iniciada_em DESC);

ALTER TABLE public.tarefas_periodicas ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.tarefas_periodicas FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tarefas_periodicas TO service_role;

-- =============================================================================
-- 2. Reserva atômica de execução (idempotência no banco)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reservar_tarefa_periodica(p_nome text, p_periodo text)
RETURNS SETOF public.tarefas_periodicas
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.tarefas_periodicas AS t (nome, periodo, iniciada_em, concluida_em, erro, resumo)
  VALUES (btrim(p_nome), btrim(p_periodo), now(), NULL, NULL, NULL)
  ON CONFLICT (nome, periodo) DO UPDATE
     SET iniciada_em  = now(),
         concluida_em = NULL,
         erro         = NULL,
         resumo       = NULL
   WHERE t.concluida_em IS NULL
     AND (t.erro IS NOT NULL OR t.iniciada_em < now() - interval '15 minutes')
  RETURNING *;
$$;

REVOKE EXECUTE ON FUNCTION public.reservar_tarefa_periodica(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_tarefa_periodica(text, text) TO service_role;

-- =============================================================================
-- Conferência (rodar depois de aplicar)
-- =============================================================================
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'tarefas_periodicas';                          -- t
-- SELECT has_table_privilege('anon', 'public.tarefas_periodicas', 'SELECT');                         -- f
-- SELECT has_table_privilege('authenticated', 'public.tarefas_periodicas', 'SELECT');                -- f
-- SELECT has_function_privilege('anon', 'public.reservar_tarefa_periodica(text,text)', 'EXECUTE');   -- f
