-- 038_fila_curadoria_ia.sql
-- Fila de curadoria assistida por IA (#114 e #115).
--
-- O admin marca vários animes; um processo separado (cmd/worker) pega um por vez,
-- chama o Gemini e grava o resultado aqui para revisão. Dois tipos de trabalho:
--   * sinopse_tags: reescreve a sinopse e sugere tags, a partir do que já está no banco;
--   * episodios:    busca na web títulos, datas e onde assistir, com a fonte de cada dado.
--
-- RLS: só o admin lê e escreve, pela is_admin() do sql/009. O worker usa o service role,
-- que não passa por policy, e pega trabalho pela função do passo 3.
--
-- APLICAR ANTES de promover o código que usa a fila. Sem a tabela, a aba "Revisão da IA"
-- responde erro e o worker só registra falha no log; o resto do app não é afetado.

-- =============================================================================
-- 1. A tabela
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_curation_queue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mal_id       INTEGER NOT NULL CHECK (mal_id > 0),
  tipo         TEXT NOT NULL DEFAULT 'sinopse_tags'
                 CHECK (tipo IN ('sinopse_tags', 'episodios')),
  status       TEXT NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente', 'processando', 'pronto', 'erro', 'aplicado', 'descartado')),
  resultado    JSONB,
  relatorio    TEXT,
  erro         TEXT,
  tentativas   INTEGER NOT NULL DEFAULT 0,
  pego_em      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  -- Um trabalho de cada tipo por anime: enfileirar de novo reaproveita a linha.
  UNIQUE (mal_id, tipo)
);

CREATE INDEX IF NOT EXISTS ai_curation_queue_status_idx
  ON public.ai_curation_queue (status, created_at);

ALTER TABLE public.ai_curation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_curation_queue_admin ON public.ai_curation_queue;
CREATE POLICY ai_curation_queue_admin ON public.ai_curation_queue
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- =============================================================================
-- 2. Configuração da fila (lida pelo worker a cada ciclo)
-- =============================================================================
INSERT INTO public.app_settings (key, value) VALUES
  ('ai_fila_modo', 'revisao'),        -- revisao | automatico (só vale para sinopse_tags)
  ('ai_fila_lote', '5'),              -- itens por ciclo
  ('ai_fila_intervalo', '60'),        -- segundos entre ciclos
  ('ai_fila_episodios_por_lote', '12'),
  -- Prompts da pesquisa de episódios. Vazio = o padrão do código (internal/ia/ia.go);
  -- o Painel grava o texto quando você edita.
  ('ai_prompt_pesquisa_episodios', ''),
  ('ai_prompt_estruturar_episodios', '')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 3. Pegar o próximo trabalho
--
-- FOR UPDATE SKIP LOCKED: dois workers ao mesmo tempo nunca pegam a mesma linha.
-- Linha em "processando" há mais de 10 minutos é de um worker que morreu no meio, e
-- volta a ser pega. Cada pegada soma uma tentativa.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.pegar_proximo_da_fila_ia()
RETURNS SETOF public.ai_curation_queue
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  UPDATE public.ai_curation_queue AS q
     SET status = 'processando',
         pego_em = now(),
         tentativas = q.tentativas + 1
   WHERE q.id = (
     SELECT f.id
       FROM public.ai_curation_queue AS f
      WHERE f.status = 'pendente'
         OR (f.status = 'processando' AND f.pego_em < now() - interval '10 minutes')
      ORDER BY f.created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
   )
  RETURNING q.*;
$$;

-- Só o service role (o worker) chama. Mesmo cuidado do sql/018.
REVOKE EXECUTE ON FUNCTION public.pegar_proximo_da_fila_ia() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pegar_proximo_da_fila_ia() TO service_role;

-- =============================================================================
-- Conferência (rodar depois de aplicar)
-- =============================================================================
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'ai_curation_queue';         -- t
-- SELECT has_function_privilege('anon', 'public.pegar_proximo_da_fila_ia()', 'EXECUTE');  -- f
-- SELECT key, value FROM app_settings WHERE key LIKE 'ai_fila_%';                  -- 4 linhas
