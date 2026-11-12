-- sql/056_cla_liga_temporada.sql
-- Fase 17 (17.1c, #182): Liga de clãs por temporada
-- Pontuação justa entre clãs: média de XP dos 10 melhores membros da temporada.
-- Clãs com menos de 10 membros não disputam a liga.
-- Fechamento por temporada com emblema cosmético exclusivo e AniCoins para o Top 3.

-- =============================================================================
-- 1. CONFIGURAÇÕES EM APP_SETTINGS (Recompensas por posição)
-- =============================================================================
INSERT INTO public.app_settings (key, value)
VALUES
  ('cla_liga_recompensas', '{
    "top1": {
      "anicoins": 150,
      "sufixo": "campeao",
      "titulo": "Campeão da Temporada"
    },
    "top2": {
      "anicoins": 90,
      "sufixo": "vice",
      "titulo": "Vice-Campeão da Temporada"
    },
    "top3": {
      "anicoins": 50,
      "sufixo": "top3",
      "titulo": "Top 3 da Temporada"
    }
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 2. TABELA DE HISTÓRICO DE CAMPEÕES DA LIGA DE CLÃS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.cla_temporadas_campeoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  temporada TEXT NOT NULL, -- ex: '2026-FALL'
  cla_id UUID NOT NULL REFERENCES public.clas(id) ON DELETE CASCADE,
  posicao INT NOT NULL CHECK (posicao >= 1),
  pontuacao INT NOT NULL DEFAULT 0,
  xp_total BIGINT NOT NULL DEFAULT 0,
  total_membros INT NOT NULL DEFAULT 0,
  recompensa_anicoins INT NOT NULL DEFAULT 0,
  emblema_slug TEXT,
  fechado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (temporada, posicao),
  UNIQUE (temporada, cla_id)
);

CREATE INDEX IF NOT EXISTS idx_cla_campeoes_temporada ON public.cla_temporadas_campeoes(temporada);
CREATE INDEX IF NOT EXISTS idx_cla_campeoes_cla ON public.cla_temporadas_campeoes(cla_id);

ALTER TABLE public.cla_temporadas_campeoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode ler campeoes da liga de clas" ON public.cla_temporadas_campeoes;
CREATE POLICY "Qualquer um pode ler campeoes da liga de clas"
  ON public.cla_temporadas_campeoes FOR SELECT
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.cla_temporadas_campeoes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.cla_temporadas_campeoes TO service_role;

-- =============================================================================
-- 3. HELPER DE INTERVALO DE TEMPORADA EM BRASÍLIA
-- =============================================================================
CREATE OR REPLACE FUNCTION public.calcular_datas_temporada(
  p_temporada TEXT DEFAULT NULL
)
RETURNS TABLE (
  inicio_temporada TIMESTAMPTZ,
  fim_temporada TIMESTAMPTZ,
  temporada_codigo TEXT,
  nome_estacao TEXT,
  ano_temporada INT
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inicio TIMESTAMPTZ;
  v_ano INT;
  v_mes INT;
  v_estacao TEXT;
  v_nome TEXT;
BEGIN
  IF p_temporada IS NULL OR btrim(p_temporada) = '' THEN
    v_inicio := (date_trunc('quarter', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
    v_ano := EXTRACT(YEAR FROM v_inicio AT TIME ZONE 'America/Sao_Paulo')::INT;
    v_mes := EXTRACT(MONTH FROM v_inicio AT TIME ZONE 'America/Sao_Paulo')::INT;

    IF v_mes = 1 THEN
      v_estacao := 'WINTER';
      v_nome := 'Inverno';
    ELSIF v_mes = 4 THEN
      v_estacao := 'SPRING';
      v_nome := 'Primavera';
    ELSIF v_mes = 7 THEN
      v_estacao := 'SUMMER';
      v_nome := 'Verão';
    ELSE
      v_estacao := 'FALL';
      v_nome := 'Outono';
    END IF;

    temporada_codigo := v_ano::text || '-' || v_estacao;
  ELSE
    v_ano := split_part(p_temporada, '-', 1)::integer;
    v_estacao := upper(split_part(p_temporada, '-', 2));

    IF v_estacao = 'WINTER' THEN
      v_mes := 1;
      v_nome := 'Inverno';
    ELSIF v_estacao = 'SPRING' THEN
      v_mes := 4;
      v_nome := 'Primavera';
    ELSIF v_estacao = 'SUMMER' THEN
      v_mes := 7;
      v_nome := 'Verão';
    ELSE
      v_mes := 10;
      v_estacao := 'FALL';
      v_nome := 'Outono';
    END IF;

    v_inicio := (v_ano::text || '-' || lpad(v_mes::text, 2, '0') || '-01 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    temporada_codigo := v_ano::text || '-' || v_estacao;
  END IF;

  inicio_temporada := v_inicio;
  fim_temporada := v_inicio + INTERVAL '3 months';
  nome_estacao := v_nome;
  ano_temporada := v_ano;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.calcular_datas_temporada(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calcular_datas_temporada(TEXT) TO anon, authenticated, service_role;

-- =============================================================================
-- 4. RANKING DE CLÃS POR TEMPORADA (Média Top 10)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.ranking_clas_temporada(
  p_temporada TEXT DEFAULT NULL,
  p_limite INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_datas RECORD;
  v_ranking JSONB := '[]'::jsonb;
  v_campeoes JSONB := '[]'::jsonb;
  v_fechada BOOLEAN := false;
  v_min_membros INT := 10;
BEGIN
  -- 1. Resolve intervalo e chave da temporada
  SELECT * INTO v_datas FROM public.calcular_datas_temporada(p_temporada);

  -- 2. Lê parâmetro mínimo de membros de app_settings
  SELECT COALESCE((value)::int, 10) INTO v_min_membros
    FROM public.app_settings
   WHERE key = 'cla_min_membros_liga';
  IF v_min_membros < 1 THEN
    v_min_membros := 10;
  END IF;

  -- 3. Verifica se a temporada já foi encerrada e possui histórico
  SELECT EXISTS(
    SELECT 1 FROM public.cla_temporadas_campeoes WHERE temporada = v_datas.temporada_codigo
  ) INTO v_fechada;

  IF v_fechada THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'posicao', cc.posicao,
          'cla_id', cc.cla_id,
          'nome', c.nome,
          'tag', c.tag,
          'emblema', c.emblema,
          'pontuacao', cc.pontuacao,
          'xp_total', cc.xp_total,
          'total_membros', cc.total_membros,
          'recompensa_anicoins', cc.recompensa_anicoins,
          'emblema_slug', cc.emblema_slug,
          'fechado_em', cc.fechado_em
        ) ORDER BY cc.posicao ASC
      ),
      '[]'::jsonb
    )
    INTO v_campeoes
    FROM public.cla_temporadas_campeoes cc
    JOIN public.clas c ON c.id = cc.cla_id
    WHERE cc.temporada = v_datas.temporada_codigo;
  END IF;

  -- 4. Computa o ranking em tempo real da temporada
  WITH cla_membros_xp AS (
    SELECT
      cm.cla_id,
      cm.user_id,
      p.handle,
      p.nome,
      p.avatar_url,
      COALESCE(SUM(l.xp_earned), 0)::BIGINT AS xp_temporada
    FROM public.cla_membros cm
    JOIN public.clas c ON c.id = cm.cla_id AND c.ativo = true
    LEFT JOIN public.profiles p ON p.id = cm.user_id
    LEFT JOIN public.xp_ledger l ON l.user_id = cm.user_id
      AND l.earned_at >= GREATEST(cm.entrou_em, v_datas.inicio_temporada)
      AND l.earned_at < v_datas.fim_temporada
    GROUP BY cm.cla_id, cm.user_id, p.handle, p.nome, p.avatar_url
  ),
  cla_top10 AS (
    SELECT
      mx.cla_id,
      mx.user_id,
      mx.handle,
      mx.nome,
      mx.avatar_url,
      mx.xp_temporada,
      ROW_NUMBER() OVER (PARTITION BY mx.cla_id ORDER BY mx.xp_temporada DESC) AS rank_interno
    FROM cla_membros_xp mx
  ),
  cla_agregados AS (
    SELECT
      c.id AS cla_id,
      c.nome,
      c.tag,
      c.descricao,
      c.emblema,
      c.criado_em,
      COUNT(cm.user_id)::INT AS total_membros,
      COALESCE(SUM(t10.xp_temporada) FILTER (WHERE t10.rank_interno <= 10), 0)::BIGINT AS soma_top10,
      COALESCE(SUM(mx.xp_temporada), 0)::BIGINT AS xp_total,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'posicao', t10.rank_interno,
            'user_id', t10.user_id,
            'handle', t10.handle,
            'nome', t10.nome,
            'avatar_url', t10.avatar_url,
            'xp', t10.xp_temporada
          ) ORDER BY t10.rank_interno ASC
        ) FILTER (WHERE t10.rank_interno <= 10),
        '[]'::jsonb
      ) AS top10_membros
    FROM public.clas c
    LEFT JOIN public.cla_membros cm ON cm.cla_id = c.id
    LEFT JOIN cla_top10 t10 ON t10.cla_id = c.id
    LEFT JOIN cla_membros_xp mx ON mx.cla_id = c.id AND mx.user_id = t10.user_id
    WHERE c.ativo = true
    GROUP BY c.id, c.nome, c.tag, c.descricao, c.emblema, c.criado_em
  ),
  cla_calculado AS (
    SELECT
      ca.cla_id,
      ca.nome,
      ca.tag,
      ca.descricao,
      ca.emblema,
      ca.criado_em,
      ca.total_membros,
      ca.xp_total,
      ca.top10_membros,
      (ca.total_membros >= v_min_membros) AS elegivel_liga,
      CASE
        WHEN ca.total_membros >= v_min_membros THEN
          ROUND(ca.soma_top10::NUMERIC / 10.0)::INT
        ELSE 0
      END AS pontuacao,
      CASE
        WHEN ca.total_membros < v_min_membros THEN
          'Mínimo de ' || v_min_membros::text || ' membros para disputar a liga (atual: ' || ca.total_membros::text || ')'
        ELSE NULL
      END AS motivo_ineligivel
    FROM cla_agregados ca
  ),
  cla_ranqueado AS (
    SELECT
      cc.*,
      CASE
        WHEN cc.elegivel_liga THEN
          ROW_NUMBER() OVER (
            PARTITION BY cc.elegivel_liga
            ORDER BY cc.pontuacao DESC, cc.xp_total DESC, cc.criado_em ASC
          )
        ELSE NULL
      END AS posicao
    FROM cla_calculado cc
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'posicao', cr.posicao,
        'cla_id', cr.cla_id,
        'nome', cr.nome,
        'tag', cr.tag,
        'descricao', cr.descricao,
        'emblema', cr.emblema,
        'criado_em', cr.criado_em,
        'total_membros', cr.total_membros,
        'elegivel_liga', cr.elegivel_liga,
        'motivo_ineligivel', cr.motivo_ineligivel,
        'pontuacao', cr.pontuacao,
        'xp_total', cr.xp_total,
        'top10_membros', cr.top10_membros
      )
      ORDER BY
        cr.elegivel_liga DESC,
        cr.pontuacao DESC,
        cr.xp_total DESC,
        cr.criado_em ASC
    ),
    '[]'::jsonb
  )
  INTO v_ranking
  FROM (
    SELECT * FROM cla_ranqueado
    ORDER BY elegivel_liga DESC, pontuacao DESC, xp_total DESC, criado_em ASC
    LIMIT p_limite
  ) cr;

  RETURN jsonb_build_object(
    'temporada', v_datas.temporada_codigo,
    'nome_estacao', v_datas.nome_estacao,
    'ano', v_datas.ano_temporada,
    'inicio', v_datas.inicio_temporada,
    'fim', v_datas.fim_temporada,
    'min_membros_liga', v_min_membros,
    'fechada', v_fechada,
    'campeoes', v_campeoes,
    'ranking', v_ranking
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ranking_clas_temporada(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ranking_clas_temporada(TEXT, INT) TO anon, authenticated, service_role;

-- =============================================================================
-- 5. LISTAR VITRINE HISTÓRICA DE TEMPORADAS ENCERRADAS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.listar_temporadas_campeoes_clas()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'temporada', t.temporada,
          'fechado_em', t.fechado_em,
          'campeoes', t.campeoes
        ) ORDER BY t.temporada DESC
      )
      FROM (
        SELECT
          cc.temporada,
          max(cc.fechado_em) AS fechado_em,
          jsonb_agg(
            jsonb_build_object(
              'posicao', cc.posicao,
              'cla_id', cc.cla_id,
              'nome', c.nome,
              'tag', c.tag,
              'emblema', c.emblema,
              'pontuacao', cc.pontuacao,
              'xp_total', cc.xp_total,
              'total_membros', cc.total_membros,
              'recompensa_anicoins', cc.recompensa_anicoins,
              'emblema_slug', cc.emblema_slug
            ) ORDER BY cc.posicao ASC
          ) AS campeoes
        FROM public.cla_temporadas_campeoes cc
        JOIN public.clas c ON c.id = cc.cla_id
        GROUP BY cc.temporada
      ) t
    ),
    '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.listar_temporadas_campeoes_clas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_temporadas_campeoes_clas() TO anon, authenticated, service_role;

-- =============================================================================
-- 6. FECHAMENTO DE TEMPORADA DE CLÃS (Idempotente, Emblemas e AniCoins)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fechar_temporada_clas(
  p_temporada_fechada TEXT,
  p_nova_temporada TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_datas RECORD;
  v_dados_ranking JSONB;
  v_ranking JSONB;
  v_item JSONB;
  v_pos INT;
  v_cla_id UUID;
  v_pontuacao INT;
  v_xp_total BIGINT;
  v_total_membros INT;
  v_recompensa INT;
  v_slug TEXT;
  v_nome_emblema TEXT;
  v_desc_emblema TEXT;
  v_item_id UUID;
  v_total_premiados INT := 0;
  v_anicoins_distribuidos INT := 0;
  v_membro RECORD;
  v_ref TEXT;
BEGIN
  -- 1. Verifica se já foi fechada anteriormente (Idempotência, Item 12)
  IF EXISTS (SELECT 1 FROM public.cla_temporadas_campeoes WHERE temporada = p_temporada_fechada) THEN
    RETURN jsonb_build_object(
      'sucesso', true,
      'motivo', 'temporada já fechada anteriormente',
      'temporada_fechada', p_temporada_fechada
    );
  END IF;

  SELECT * INTO v_datas FROM public.calcular_datas_temporada(p_temporada_fechada);

  -- 2. Obtém o ranking final da temporada encerrada
  v_dados_ranking := public.ranking_clas_temporada(p_temporada_fechada, 10);
  v_ranking := v_dados_ranking->'ranking';

  IF v_ranking IS NULL OR jsonb_array_length(v_ranking) = 0 THEN
    RETURN jsonb_build_object(
      'sucesso', true,
      'motivo', 'nenhum clã pontuou na temporada',
      'temporada_fechada', p_temporada_fechada
    );
  END IF;

  -- 3. Processa até o Top 3 elegível
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_ranking)
  LOOP
    v_pos := (v_item->>'posicao')::INT;
    IF v_pos IS NULL OR v_pos > 3 THEN
      CONTINUE;
    END IF;

    v_cla_id := (v_item->>'cla_id')::UUID;
    v_pontuacao := (v_item->>'pontuacao')::INT;
    v_xp_total := (v_item->>'xp_total')::BIGINT;
    v_total_membros := (v_item->>'total_membros')::INT;

    -- Define premiação por posição
    IF v_pos = 1 THEN
      v_recompensa := 150;
      v_slug := 'emblema-campeao-' || lower(v_datas.temporada_codigo);
      v_nome_emblema := 'Campeão de ' || v_datas.nome_estacao || ' ' || v_datas.ano_temporada::text;
      v_desc_emblema := 'Concedido com exclusividade aos membros do clã campeão da Liga de ' || v_datas.nome_estacao || ' ' || v_datas.ano_temporada::text || '.';
    ELSIF v_pos = 2 THEN
      v_recompensa := 90;
      v_slug := 'emblema-vice-' || lower(v_datas.temporada_codigo);
      v_nome_emblema := 'Vice-Campeão de ' || v_datas.nome_estacao || ' ' || v_datas.ano_temporada::text;
      v_desc_emblema := 'Concedido aos membros do clã vice-campeão da Liga de ' || v_datas.nome_estacao || ' ' || v_datas.ano_temporada::text || '.';
    ELSE
      v_recompensa := 50;
      v_slug := 'emblema-top3-' || lower(v_datas.temporada_codigo);
      v_nome_emblema := 'Top 3 de ' || v_datas.nome_estacao || ' ' || v_datas.ano_temporada::text;
      v_desc_emblema := 'Concedido aos membros do 3º lugar na Liga de ' || v_datas.nome_estacao || ' ' || v_datas.ano_temporada::text || '.';
    END IF;

    -- Cria o cosmético exclusivo de temporada na loja (não comprável, preco 0, ativo false)
    INSERT INTO public.store_items (
      slug, nome, descricao, tipo, slot, icone, raridade, preco, estilo, ativo
    ) VALUES (
      v_slug,
      v_nome_emblema,
      v_desc_emblema,
      'emblema',
      'emblema',
      'Trophy',
      'lendario',
      0,
      jsonb_build_object('temporada', v_datas.temporada_codigo, 'posicao', v_pos),
      false
    )
    ON CONFLICT (slug) DO UPDATE
      SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao
    RETURNING id INTO v_item_id;

    IF v_item_id IS NULL THEN
      SELECT id INTO v_item_id FROM public.store_items WHERE slug = v_slug;
    END IF;

    -- Registra o clã nos campeões da temporada
    INSERT INTO public.cla_temporadas_campeoes (
      temporada,
      cla_id,
      posicao,
      pontuacao,
      xp_total,
      total_membros,
      recompensa_anicoins,
      emblema_slug
    ) VALUES (
      p_temporada_fechada,
      v_cla_id,
      v_pos,
      v_pontuacao,
      v_xp_total,
      v_total_membros,
      v_recompensa,
      v_slug
    )
    ON CONFLICT (temporada, posicao) DO NOTHING;

    -- Concede o emblema e credita AniCoins para todos os membros ativos do clã
    FOR v_membro IN (
      SELECT cm.user_id
        FROM public.cla_membros cm
       WHERE cm.cla_id = v_cla_id
    ) LOOP
      -- 1. Insere cosmético no inventário (user_items)
      IF v_item_id IS NOT NULL THEN
        INSERT INTO public.user_items (user_id, item_id, adquirido_em)
        VALUES (v_membro.user_id, v_item_id, now())
        ON CONFLICT (user_id, item_id) DO NOTHING;
      END IF;

      -- 2. Credita AniCoins com idempotência estrita no crystal_ledger
      v_ref := 'liga_cla:' || p_temporada_fechada || ':' || v_cla_id::text || ':' || v_membro.user_id::text;
      IF NOT EXISTS (SELECT 1 FROM public.crystal_ledger WHERE referencia = v_ref) THEN
        INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
        VALUES (v_membro.user_id, v_recompensa, 'liga_cla', v_ref);

        v_total_premiados := v_total_premiados + 1;
        v_anicoins_distribuidos := v_anicoins_distribuidos + v_recompensa;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'sucesso', true,
    'temporada_fechada', p_temporada_fechada,
    'nova_temporada', p_nova_temporada,
    'membros_premiados', v_total_premiados,
    'anicoins_distribuidos', v_anicoins_distribuidos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fechar_temporada_clas(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fechar_temporada_clas(TEXT, TEXT) TO service_role;
