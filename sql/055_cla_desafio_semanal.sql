-- sql/055_cla_desafio_semanal.sql
-- Fase 17 (17.1b, #181): Desafio semanal coletivo do clã
-- Meta proporcional ao número de membros, progresso em tempo real das tabelas de atividade,
-- fechamento semanal idempotente e recompensas de AniCoins no crystal_ledger.

-- =============================================================================
-- 1. CONFIGURAÇÕES EM APP_SETTINGS (Catálogo e regras)
-- =============================================================================
INSERT INTO public.app_settings (key, value)
VALUES
  ('desafios_cla_catalogo', '[
    {
      "tipo": "episodios",
      "titulo": "Maratona do Clã",
      "descricao": "Assistam episódios de qualquer anime da lista",
      "unidade": "episódios",
      "icone": "Play",
      "meta_por_membro": 8,
      "meta_minima": 20,
      "recompensa_anicoins": 40
    },
    {
      "tipo": "reacoes",
      "titulo": "Reatores em Sintonia",
      "descricao": "Deixem reações emotivas nos episódios assistidos",
      "unidade": "reações",
      "icone": "Smile",
      "meta_por_membro": 3,
      "meta_minima": 10,
      "recompensa_anicoins": 35
    },
    {
      "tipo": "animes_terminados",
      "titulo": "Conclusão Coletiva",
      "descricao": "Completem obras do catálogo para expandir seus decks",
      "unidade": "animes",
      "icone": "CheckCircle2",
      "meta_por_membro": 1,
      "meta_minima": 3,
      "recompensa_anicoins": 50
    },
    {
      "tipo": "comentarios",
      "titulo": "Voz do Clã",
      "descricao": "Comentem e conversem sobre os episódios com a comunidade",
      "unidade": "comentários",
      "icone": "MessageSquare",
      "meta_por_membro": 2,
      "meta_minima": 8,
      "recompensa_anicoins": 35
    }
  ]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 2. TABELA CLA_DESAFIOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.cla_desafios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cla_id UUID NOT NULL REFERENCES public.clas(id) ON DELETE CASCADE,
  semana TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('episodios', 'reacoes', 'animes_terminados', 'comentarios')),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  unidade TEXT NOT NULL DEFAULT 'unidades',
  icone TEXT NOT NULL DEFAULT 'Play',
  meta INTEGER NOT NULL CHECK (meta > 0),
  recompensa_anicoins INTEGER NOT NULL DEFAULT 40 CHECK (recompensa_anicoins >= 0),
  concluido_em TIMESTAMPTZ,
  fechado BOOLEAN NOT NULL DEFAULT false,
  pago BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cla_id, semana)
);

CREATE INDEX IF NOT EXISTS idx_cla_desafios_semana ON public.cla_desafios(cla_id, semana);
CREATE INDEX IF NOT EXISTS idx_cla_desafios_fechado ON public.cla_desafios(semana, fechado);

ALTER TABLE public.cla_desafios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode ler desafios de clas" ON public.cla_desafios;
CREATE POLICY "Qualquer um pode ler desafios de clas"
  ON public.cla_desafios FOR SELECT
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.cla_desafios FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.cla_desafios TO service_role;

-- =============================================================================
-- 3. HELPER DE INTERVALO DE SEMANA EM BRASÍLIA
-- =============================================================================
CREATE OR REPLACE FUNCTION public.calcular_datas_semana(
  p_semana TEXT DEFAULT NULL
)
RETURNS TABLE (
  inicio_semana TIMESTAMPTZ,
  fim_semana TIMESTAMPTZ,
  semana_codigo TEXT
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inicio TIMESTAMPTZ;
  v_ano INT;
  v_sem INT;
BEGIN
  IF p_semana IS NULL OR btrim(p_semana) = '' THEN
    v_inicio := (date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
    semana_codigo := to_char(v_inicio AT TIME ZONE 'America/Sao_Paulo', 'IYYY-"W"IW');
  ELSE
    v_ano := split_part(p_semana, '-W', 1)::integer;
    v_sem := split_part(p_semana, '-W', 2)::integer;
    v_inicio := (to_date(v_ano::text || '-' || v_sem::text || '-1', 'IYYY-IW-ID')::text || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    semana_codigo := p_semana;
  END IF;

  inicio_semana := v_inicio;
  fim_semana := v_inicio + INTERVAL '7 days';
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.calcular_datas_semana(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calcular_datas_semana(TEXT) TO anon, authenticated, service_role;

-- =============================================================================
-- 4. GARANTIR OU CRIAR DESAFIO SEMANAL DE UM CLÃ (Meta proporcional)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.garantir_desafio_semanal_cla(
  p_cla_id UUID,
  p_semana TEXT DEFAULT NULL
)
RETURNS public.cla_desafios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_datas RECORD;
  v_desafio public.cla_desafios;
  v_catalogo JSONB;
  v_item JSONB;
  v_indice INT;
  v_qtd_membros INT;
  v_meta INT;
  v_meta_por_membro INT;
  v_meta_minima INT;
  v_recompensa INT;
BEGIN
  -- Resolve semana e datas
  SELECT * INTO v_datas FROM public.calcular_datas_semana(p_semana);

  -- 1. Verifica se já existe o desafio para o clã nesta semana
  SELECT * INTO v_desafio
    FROM public.cla_desafios
   WHERE cla_id = p_cla_id AND semana = v_datas.semana_codigo;

  IF FOUND THEN
    RETURN v_desafio;
  END IF;

  -- 2. Carrega catálogo do app_settings com fallback
  SELECT value INTO v_catalogo
    FROM public.app_settings
   WHERE key = 'desafios_cla_catalogo';

  IF v_catalogo IS NULL OR jsonb_array_length(v_catalogo) = 0 THEN
    v_catalogo := '[
      {"tipo": "episodios", "titulo": "Maratona do Clã", "descricao": "Assistam episódios de qualquer anime da lista", "unidade": "episódios", "icone": "Play", "meta_por_membro": 8, "meta_minima": 20, "recompensa_anicoins": 40},
      {"tipo": "reacoes", "titulo": "Reatores em Sintonia", "descricao": "Deixem reações emotivas nos episódios assistidos", "unidade": "reações", "icone": "Smile", "meta_por_membro": 3, "meta_minima": 10, "recompensa_anicoins": 35},
      {"tipo": "animes_terminados", "titulo": "Conclusão Coletiva", "descricao": "Completem obras do catálogo para expandir seus decks", "unidade": "animes", "icone": "CheckCircle2", "meta_por_membro": 1, "meta_minima": 3, "recompensa_anicoins": 50},
      {"tipo": "comentarios", "titulo": "Voz do Clã", "descricao": "Comentem e conversem sobre os episódios com a comunidade", "unidade": "comentários", "icone": "MessageSquare", "meta_por_membro": 2, "meta_minima": 8, "recompensa_anicoins": 35}
    ]'::jsonb;
  END IF;

  -- 3. Sorteio determinístico por (cla_id, semana) para estabilidade
  v_indice := abs(hashtext(p_cla_id::text || ':' || v_datas.semana_codigo)) % jsonb_array_length(v_catalogo);
  v_item := v_catalogo->v_indice;

  -- 4. Contagem de membros para cálculo proporcional da meta
  SELECT count(*) INTO v_qtd_membros
    FROM public.cla_membros
   WHERE cla_id = p_cla_id;

  IF v_qtd_membros < 1 THEN
    v_qtd_membros := 1;
  END IF;

  v_meta_por_membro := COALESCE((v_item->>'meta_por_membro')::integer, 5);
  v_meta_minima := COALESCE((v_item->>'meta_minima')::integer, 10);
  v_meta := GREATEST(v_meta_minima, v_qtd_membros * v_meta_por_membro);
  v_recompensa := COALESCE((v_item->>'recompensa_anicoins')::integer, 40);

  -- 5. Insere idempotente
  INSERT INTO public.cla_desafios (
    cla_id,
    semana,
    tipo,
    titulo,
    descricao,
    unidade,
    icone,
    meta,
    recompensa_anicoins
  ) VALUES (
    p_cla_id,
    v_datas.semana_codigo,
    v_item->>'tipo',
    v_item->>'titulo',
    COALESCE(v_item->>'descricao', ''),
    COALESCE(v_item->>'unidade', 'unidades'),
    COALESCE(v_item->>'icone', 'Play'),
    v_meta,
    v_recompensa
  )
  ON CONFLICT (cla_id, semana) DO UPDATE
    SET cla_id = EXCLUDED.cla_id
  RETURNING * INTO v_desafio;

  RETURN v_desafio;
END;
$$;

REVOKE ALL ON FUNCTION public.garantir_desafio_semanal_cla(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.garantir_desafio_semanal_cla(UUID, TEXT) TO anon, authenticated, service_role;

-- =============================================================================
-- 5. OBTER DETALHES E PROGRESSO DO DESAFIO SEMANAL
-- =============================================================================
CREATE OR REPLACE FUNCTION public.obter_desafio_semanal_cla(
  p_cla_id UUID,
  p_semana TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_datas RECORD;
  v_desafio public.cla_desafios;
  v_progresso_total INT := 0;
  v_lista_contribuicoes JSONB := '[]'::jsonb;
BEGIN
  -- 1. Garante que o desafio existe e obtém as datas
  v_desafio := public.garantir_desafio_semanal_cla(p_cla_id, p_semana);
  SELECT * INTO v_datas FROM public.calcular_datas_semana(v_desafio.semana);

  -- 2. Computa o progresso de cada membro considerando a data em que entrou
  -- (membro novo no meio da semana só pontua atividades a partir da data de entrada)
  WITH membros AS (
    SELECT
      cm.user_id,
      cm.papel,
      cm.entrou_em,
      p.handle,
      p.nome,
      p.avatar_url,
      GREATEST(cm.entrou_em, v_datas.inicio_semana) AS corte_atividade
    FROM public.cla_membros cm
    LEFT JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.cla_id = p_cla_id
  ),
  contribuicoes AS (
    SELECT
      m.user_id,
      COALESCE(m.handle, 'membro') AS handle,
      COALESCE(m.nome, 'Membro') AS nome,
      m.avatar_url,
      m.papel,
      m.entrou_em,
      CASE
        WHEN v_desafio.tipo = 'episodios' THEN (
          SELECT count(*)::integer
            FROM public.episode_progress ep
           WHERE ep.user_id = m.user_id
             AND ep.watched_at >= m.corte_atividade
             AND ep.watched_at < v_datas.fim_semana
        )
        WHEN v_desafio.tipo = 'reacoes' THEN (
          SELECT count(*)::integer
            FROM public.episode_reactions er
           WHERE er.user_id = m.user_id
             AND er.criado_em >= m.corte_atividade
             AND er.criado_em < v_datas.fim_semana
        )
        WHEN v_desafio.tipo = 'animes_terminados' THEN (
          SELECT count(*)::integer
            FROM public.media_entries me
           WHERE me.user_id = m.user_id
             AND me.status = 'Completo'
             AND me.updated_at >= m.corte_atividade
             AND me.updated_at < v_datas.fim_semana
        )
        WHEN v_desafio.tipo = 'comentarios' THEN (
          SELECT count(*)::integer
            FROM public.episode_comments ec
           WHERE ec.user_id = m.user_id
             AND ec.oculto = false
             AND ec.created_at >= m.corte_atividade
             AND ec.created_at < v_datas.fim_semana
        )
        ELSE 0
      END AS contribuicao
    FROM membros m
  )
  SELECT
    COALESCE(sum(c.contribuicao), 0)::integer,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'user_id', c.user_id,
          'handle', c.handle,
          'nome', c.nome,
          'avatar_url', c.avatar_url,
          'papel', c.papel,
          'contribuicao', c.contribuicao,
          'elegivel', (c.contribuicao >= 1),
          'entrou_em', c.entrou_em
        ) ORDER BY c.contribuicao DESC, c.entrou_em ASC
      ),
      '[]'::jsonb
    )
  INTO v_progresso_total, v_lista_contribuicoes
  FROM contribuicoes c;

  -- 3. Atualiza concluido_em se bateu a meta agora
  IF v_progresso_total >= v_desafio.meta AND v_desafio.concluido_em IS NULL THEN
    UPDATE public.cla_desafios
       SET concluido_em = now()
     WHERE id = v_desafio.id;
    v_desafio.concluido_em := now();
  END IF;

  -- 4. Retorna objeto consolidado
  RETURN jsonb_build_object(
    'id', v_desafio.id,
    'cla_id', v_desafio.cla_id,
    'semana', v_desafio.semana,
    'tipo', v_desafio.tipo,
    'titulo', v_desafio.titulo,
    'descricao', v_desafio.descricao,
    'unidade', v_desafio.unidade,
    'icone', v_desafio.icone,
    'meta', v_desafio.meta,
    'progresso_total', v_progresso_total,
    'progresso_pct', CASE WHEN v_desafio.meta > 0 THEN LEAST(100, ROUND((v_progresso_total::numeric / v_desafio.meta::numeric) * 100)) ELSE 0 END,
    'recompensa_anicoins', v_desafio.recompensa_anicoins,
    'concluido', (v_desafio.concluido_em IS NOT NULL OR v_progresso_total >= v_desafio.meta),
    'concluido_em', v_desafio.concluido_em,
    'fechado', v_desafio.fechado,
    'pago', v_desafio.pago,
    'inicio_semana', v_datas.inicio_semana,
    'fim_semana', v_datas.fim_semana,
    'contribuicoes', v_lista_contribuicoes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.obter_desafio_semanal_cla(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_desafio_semanal_cla(UUID, TEXT) TO anon, authenticated, service_role;

-- =============================================================================
-- 6. RESUMO DO DESAFIO DO MEU CLÃ (Para Início e HUD)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.meu_desafio_cla_resumo(
  p_semana TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_cla RECORD;
  v_desafio JSONB;
  v_contribuicoes JSONB;
  v_minha_contribuicao INT := 0;
  v_item JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('tem_cla', false);
  END IF;

  SELECT cm.cla_id, c.nome, c.tag, c.emblema
    INTO v_cla
    FROM public.cla_membros cm
    JOIN public.clas c ON c.id = cm.cla_id
   WHERE cm.user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('tem_cla', false);
  END IF;

  v_desafio := public.obter_desafio_semanal_cla(v_cla.cla_id, p_semana);
  v_contribuicoes := v_desafio->'contribuicoes';

  IF v_contribuicoes IS NOT NULL AND jsonb_array_length(v_contribuicoes) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_contribuicoes)
    LOOP
      IF (v_item->>'user_id')::uuid = v_user_id THEN
        v_minha_contribuicao := COALESCE((v_item->>'contribuicao')::integer, 0);
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'tem_cla', true,
    'cla_id', v_cla.cla_id,
    'cla_nome', v_cla.nome,
    'cla_tag', v_cla.tag,
    'cla_emblema', v_cla.emblema,
    'desafio_id', v_desafio->>'id',
    'semana', v_desafio->>'semana',
    'tipo', v_desafio->>'tipo',
    'titulo', v_desafio->>'titulo',
    'descricao', v_desafio->>'descricao',
    'unidade', v_desafio->>'unidade',
    'icone', v_desafio->>'icone',
    'meta', (v_desafio->>'meta')::integer,
    'progresso_total', (v_desafio->>'progresso_total')::integer,
    'progresso_pct', (v_desafio->>'progresso_pct')::integer,
    'recompensa_anicoins', (v_desafio->>'recompensa_anicoins')::integer,
    'concluido', (v_desafio->>'concluido')::boolean,
    'fechado', (v_desafio->>'fechado')::boolean,
    'minha_contribuicao', v_minha_contribuicao,
    'minha_elegivel', (v_minha_contribuicao >= 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.meu_desafio_cla_resumo(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.meu_desafio_cla_resumo(TEXT) TO authenticated, service_role;

-- =============================================================================
-- 7. FECHAMENTO SEMANAL DOS DESAFIOS (Idempotente, pagamento de AniCoins)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fechar_semana_desafios_cla(
  p_semana_fechada TEXT,
  p_nova_semana TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r_cla RECORD;
  v_desafio JSONB;
  v_contribuicoes JSONB;
  v_item JSONB;
  v_membro_id UUID;
  v_contribuicao INT;
  v_recompensa INT;
  v_ref TEXT;
  v_total_clas INT := 0;
  v_clas_concluidos INT := 0;
  v_membros_pagos INT := 0;
  v_anicoins_distribuidos INT := 0;
  v_desafio_id UUID;
  v_meta INT;
  v_progresso_total INT;
BEGIN
  -- Percorre todos os clãs ativos
  FOR r_cla IN (SELECT id, nome, tag FROM public.clas WHERE ativo = true)
  LOOP
    v_total_clas := v_total_clas + 1;

    -- Obtém o progresso final da semana encerrada
    v_desafio := public.obter_desafio_semanal_cla(r_cla.id, p_semana_fechada);
    v_desafio_id := (v_desafio->>'id')::uuid;
    v_meta := (v_desafio->>'meta')::integer;
    v_progresso_total := (v_desafio->>'progresso_total')::integer;
    v_recompensa := (v_desafio->>'recompensa_anicoins')::integer;

    -- Bateu a meta?
    IF v_progresso_total >= v_meta THEN
      v_clas_concluidos := v_clas_concluidos + 1;
      v_contribuicoes := v_desafio->'contribuicoes';

      -- Paga cada membro que contribuiu com pelo menos 1
      IF v_contribuicoes IS NOT NULL AND jsonb_array_length(v_contribuicoes) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_contribuicoes)
        LOOP
          v_membro_id := (v_item->>'user_id')::uuid;
          v_contribuicao := COALESCE((v_item->>'contribuicao')::integer, 0);

          IF v_contribuicao >= 1 AND v_recompensa > 0 THEN
            v_ref := 'desafio:' || r_cla.id::text || ':' || p_semana_fechada || ':' || v_membro_id::text;

            -- Idempotência estrita: só insere se ainda não existe esta referência
            IF NOT EXISTS (SELECT 1 FROM public.crystal_ledger WHERE referencia = v_ref) THEN
              INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
              VALUES (v_membro_id, v_recompensa, 'desafio_cla', v_ref);

              v_membros_pagos := v_membros_pagos + 1;
              v_anicoins_distribuidos := v_anicoins_distribuidos + v_recompensa;
            END IF;
          END IF;
        END LOOP;
      END IF;

      -- Marca o desafio como fechado, pago e concluído
      UPDATE public.cla_desafios
         SET fechado = true,
             pago = true,
             concluido_em = COALESCE(concluido_em, now())
       WHERE id = v_desafio_id;
    ELSE
      -- Meta não atingida: apenas fecha
      UPDATE public.cla_desafios
         SET fechado = true
       WHERE id = v_desafio_id;
    END IF;

    -- Garante que o desafio da nova semana já seja aberto
    PERFORM public.garantir_desafio_semanal_cla(r_cla.id, p_nova_semana);
  END LOOP;

  RETURN jsonb_build_object(
    'sucesso', true,
    'semana_fechada', p_semana_fechada,
    'nova_semana', p_nova_semana,
    'total_clas', v_total_clas,
    'clas_concluidos', v_clas_concluidos,
    'membros_pagos', v_membros_pagos,
    'anicoins_distribuidos', v_anicoins_distribuidos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fechar_semana_desafios_cla(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fechar_semana_desafios_cla(TEXT, TEXT) TO service_role;
