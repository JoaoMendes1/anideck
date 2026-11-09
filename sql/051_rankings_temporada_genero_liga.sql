-- sql/051_rankings_temporada_genero_liga.sql
-- Fase 16 (16.4a, 16.4b e 16.4c, #175, #176 e #177):
-- Ranking da Temporada, Top por Gênero (tabela de cache e RPC),
-- Liga semanal com divisões que sobem e descem, e Clima da Temporada (ranking de reações).

-- =============================================================================
-- 1. RANKING DE MEMBROS EXPANDIDO (SEMANA, TEMPORADA, GERAL)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.ranking_membros(p_periodo text, p_limite integer DEFAULT 50)
RETURNS TABLE (posicao bigint, handle text, nome text, xp bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH desde AS (
    SELECT CASE
      WHEN p_periodo = 'semana' THEN
        (date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')
      WHEN p_periodo = 'temporada' THEN
        (date_trunc('quarter', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')
      ELSE '-infinity'::timestamptz
    END AS inicio
  ),
  somas AS (
    SELECT l.user_id, sum(l.xp_earned)::bigint AS xp
      FROM public.xp_ledger l, desde d
     WHERE l.earned_at >= d.inicio
     GROUP BY l.user_id
  )
  SELECT row_number() OVER (ORDER BY s.xp DESC, p.handle) AS posicao, p.handle, p.nome, s.xp
    FROM somas s
    JOIN public.profiles p ON p.user_id = s.user_id
   WHERE p.publico AND s.xp > 0
   ORDER BY s.xp DESC, p.handle
   LIMIT LEAST(GREATEST(p_limite, 1), 100);
$$;

REVOKE EXECUTE ON FUNCTION public.ranking_membros(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ranking_membros(text, integer) TO anon, authenticated;


-- =============================================================================
-- 2. TABELA DE CACHE E RPC DO RANKING POR GÊNERO (16.4a, #175)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ranking_genero (
  genero TEXT NOT NULL,
  posicao INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  nome TEXT NOT NULL,
  xp_genero BIGINT NOT NULL,
  nivel INTEGER NOT NULL DEFAULT 1,
  rank TEXT NOT NULL DEFAULT 'E',
  titulo_rank TEXT NOT NULL DEFAULT 'Aprendiz',
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (genero, posicao)
);

CREATE INDEX IF NOT EXISTS idx_ranking_genero_genero ON public.ranking_genero(genero);

ALTER TABLE public.ranking_genero ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode ler ranking por genero" ON public.ranking_genero;
CREATE POLICY "Qualquer um pode ler ranking por genero"
  ON public.ranking_genero FOR SELECT
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.ranking_genero FROM PUBLIC, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ranking_genero TO service_role;
GRANT SELECT ON public.ranking_genero TO authenticated, anon, service_role;

-- Função atômica para recalcular e atualizar o ranking por gênero
CREATE OR REPLACE FUNCTION public.atualizar_ranking_genero()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Limpa tabela temporariamente para recarga
  TRUNCATE TABLE public.ranking_genero;

  -- Para cada gênero da taxonomia com perfil público, calcula o XP no gênero
  INSERT INTO public.ranking_genero (genero, posicao, user_id, handle, nome, xp_genero, nivel, rank, titulo_rank, atualizado_em)
  WITH animes_genero AS (
    SELECT DISTINCT
      COALESCE(cur.custom_title, c.title) AS title,
      e.mal_id,
      t.display_name_pt AS genero
    FROM public.anime_metadata_cache c
    LEFT JOIN public.curated_animes cur ON cur.mal_id = c.mal_id
    CROSS JOIN LATERAL unnest(COALESCE(cur.custom_tags, COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[]))) r(raw_name)
    JOIN public.genre_taxonomy t ON t.raw_name = r.raw_name AND t.tier <> 'ignorado'
  ),
  xp_por_genero AS (
    SELECT
      ag.genero,
      l.user_id,
      sum(l.xp_earned)::bigint AS xp_genero
    FROM public.xp_ledger l
    JOIN animes_genero ag ON ag.mal_id = l.mal_id
    GROUP BY ag.genero, l.user_id
  ),
  ranqueados AS (
    SELECT
      x.genero,
      row_number() OVER (PARTITION BY x.genero ORDER BY x.xp_genero DESC, p.handle) AS posicao,
      p.user_id,
      p.handle,
      p.nome,
      x.xp_genero
    FROM xp_por_genero x
    JOIN public.profiles p ON p.user_id = x.user_id
    WHERE p.publico AND x.xp_genero > 0
  )
  SELECT
    r.genero,
    r.posicao::integer,
    r.user_id,
    r.handle,
    r.nome,
    r.xp_genero,
    1,
    'E',
    'Aprendiz',
    now()
  FROM ranqueados r
  WHERE r.posicao <= 50;
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_ranking_genero() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_ranking_genero() TO service_role;


-- =============================================================================
-- 3. LIGA SEMANAL COM DIVISÕES QUE SOBEM E DESCEM (16.4b, #176)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.liga_participacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana TEXT NOT NULL, -- Ex: '2026-W45'
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  divisao TEXT NOT NULL DEFAULT 'Bronze' CHECK (divisao IN ('Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante')),
  grupo INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  posicao INTEGER,
  resultado TEXT CHECK (resultado IN ('subiu', 'manteve', 'desceu', 'premiado')),
  recompensa_anicoins INTEGER NOT NULL DEFAULT 0,
  fechado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (semana, user_id)
);

CREATE INDEX IF NOT EXISTS idx_liga_semana_divisao ON public.liga_participacoes(semana, divisao, grupo);
CREATE INDEX IF NOT EXISTS idx_liga_user_id ON public.liga_participacoes(user_id);

ALTER TABLE public.liga_participacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de participacoes na liga" ON public.liga_participacoes;
CREATE POLICY "Leitura de participacoes na liga"
  ON public.liga_participacoes FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
       WHERE profiles.user_id = liga_participacoes.user_id
         AND profiles.publico = true
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.liga_participacoes FROM PUBLIC, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.liga_participacoes TO service_role;
GRANT SELECT ON public.liga_participacoes TO authenticated, anon, service_role;

-- Configuração inicial da liga em app_settings se ausente
INSERT INTO public.app_settings (key, value)
VALUES ('liga_regras', '{
  "ativa": true,
  "min_membros": 40,
  "tamanho_grupo": 20,
  "sobem": 5,
  "descem": 5,
  "recompensa_top1": 50,
  "recompensa_top2": 30,
  "recompensa_top3": 20
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Função atômica para sincronizar XP da semana atual na liga
CREATE OR REPLACE FUNCTION public.sincronizar_xp_liga_semana(p_semana text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inicio_semana TIMESTAMPTZ;
BEGIN
  v_inicio_semana := (date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');

  -- Insere ou atualiza quem pontuou e tem perfil público
  WITH pontuacoes AS (
    SELECT l.user_id, sum(l.xp_earned)::integer AS xp_semana
      FROM public.xp_ledger l
      JOIN public.profiles p ON p.user_id = l.user_id
     WHERE l.earned_at >= v_inicio_semana
       AND p.publico = true
     GROUP BY l.user_id
  )
  INSERT INTO public.liga_participacoes (semana, user_id, divisao, grupo, xp)
  SELECT p_semana, pt.user_id, 'Bronze', 1, pt.xp_semana
    FROM pontuacoes pt
  ON CONFLICT (semana, user_id) DO UPDATE
  SET xp = EXCLUDED.xp,
      atualizado_em = now()
  WHERE NOT public.liga_participacoes.fechado;
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_xp_liga_semana(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sincronizar_xp_liga_semana(text) TO authenticated, service_role;

-- Função atômica para fechamento semanal da liga
CREATE OR REPLACE FUNCTION public.fechar_semana_liga(p_semana text, p_proxima_semana text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_membros INTEGER;
  v_fechados INTEGER := 0;
  v_ref TEXT;
  r RECORD;
BEGIN
  SELECT count(*) INTO v_total_membros
    FROM public.liga_participacoes
   WHERE semana = p_semana;

  IF v_total_membros = 0 THEN
    RETURN jsonb_build_object('sucesso', true, 'motivo', 'sem participantes na semana');
  END IF;

  -- Se já foi fechada, sai sem duplicar pagamentos (Idempotência, Item 12)
  IF EXISTS (SELECT 1 FROM public.liga_participacoes WHERE semana = p_semana AND fechado = true) THEN
    RETURN jsonb_build_object('sucesso', true, 'motivo', 'semana já fechada anteriormente');
  END IF;

  -- 1. Calcula as posições relativas por divisão e grupo
  WITH ranqueados AS (
    SELECT
      id,
      user_id,
      divisao,
      xp,
      row_number() OVER (PARTITION BY divisao, grupo ORDER BY xp DESC) AS pos
    FROM public.liga_participacoes
    WHERE semana = p_semana
  )
  UPDATE public.liga_participacoes lp
     SET posicao = r.pos,
         resultado = CASE
           WHEN r.pos <= 5 AND r.divisao <> 'Diamante' THEN 'subiu'
           WHEN r.pos > 15 AND r.divisao <> 'Bronze' THEN 'desceu'
           ELSE 'manteve'
         END,
         recompensa_anicoins = CASE
           WHEN r.pos = 1 THEN 50
           WHEN r.pos = 2 THEN 30
           WHEN r.pos = 3 THEN 20
           ELSE 0
         END,
         fechado = true,
         atualizado_em = now()
    FROM ranqueados r
   WHERE lp.id = r.id;

  -- 2. Paga as recompensas de AniCoins no crystal_ledger
  FOR r IN (
    SELECT user_id, recompensa_anicoins, posicao, divisao
      FROM public.liga_participacoes
     WHERE semana = p_semana AND recompensa_anicoins > 0
  ) LOOP
    v_ref := 'liga:' || p_semana || ':' || r.user_id::text;
    IF NOT EXISTS (SELECT 1 FROM public.crystal_ledger WHERE referencia = v_ref) THEN
      INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
      VALUES (r.user_id, r.recompensa_anicoins, 'liga_recompensa', v_ref);
      v_fechados := v_fechados + 1;
    END IF;
  END LOOP;

  -- 3. Promove/rebaixa participantes para a próxima semana
  FOR r IN (
    SELECT user_id, divisao, resultado
      FROM public.liga_participacoes
     WHERE semana = p_semana
  ) LOOP
    DECLARE
      v_nova_divisao TEXT := r.divisao;
    BEGIN
      IF r.resultado = 'subiu' THEN
        v_nova_divisao := CASE r.divisao
          WHEN 'Bronze' THEN 'Prata'
          WHEN 'Prata' THEN 'Ouro'
          WHEN 'Ouro' THEN 'Platina'
          WHEN 'Platina' THEN 'Diamante'
          ELSE 'Diamante'
        END;
      ELSIF r.resultado = 'desceu' THEN
        v_nova_divisao := CASE r.divisao
          WHEN 'Diamante' THEN 'Platina'
          WHEN 'Platina' THEN 'Ouro'
          WHEN 'Ouro' THEN 'Prata'
          WHEN 'Prata' THEN 'Bronze'
          ELSE 'Bronze'
        END;
      END IF;

      INSERT INTO public.liga_participacoes (semana, user_id, divisao, grupo, xp)
      VALUES (p_proxima_semana, r.user_id, v_nova_divisao, 1, 0)
      ON CONFLICT (semana, user_id) DO NOTHING;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'sucesso', true,
    'semana_fechada', p_semana,
    'premios_pagos', v_fechados,
    'total_participantes', v_total_membros
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fechar_semana_liga(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fechar_semana_liga(text, text) TO service_role;


-- =============================================================================
-- 4. CLIMA DA TEMPORADA: RANKING DE REAÇÕES (16.4c, #177)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.top_reacoes_temporada(
  p_reacao text,
  p_limite integer DEFAULT 10
)
RETURNS TABLE (
  mal_id integer,
  total_reacoes bigint,
  episodio_lider integer,
  reacoes_episodio_lider bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH inicio_temporada AS (
    SELECT (date_trunc('quarter', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo') AS inicio
  ),
  filtrados AS (
    SELECT er.mal_id, er.episode_number, er.reacao
      FROM public.episode_reactions er, inicio_temporada it
     WHERE er.reacao = p_reacao
       AND er.created_at >= it.inicio
  ),
  contagens_ep AS (
    SELECT
      f.mal_id,
      f.episode_number,
      count(*) AS qtd_ep
    FROM filtrados f
    GROUP BY f.mal_id, f.episode_number
  ),
  lideres AS (
    SELECT
      ce.mal_id,
      ce.episode_number,
      ce.qtd_ep,
      row_number() OVER (PARTITION BY ce.mal_id ORDER BY ce.qtd_ep DESC, ce.episode_number ASC) AS rnk
    FROM contagens_ep ce
  ),
  totais_anime AS (
    SELECT
      f.mal_id,
      count(*) AS total_anime
    FROM filtrados f
    GROUP BY f.mal_id
  )
  SELECT
    ta.mal_id,
    ta.total_anime AS total_reacoes,
    COALESCE(l.episode_number, 1) AS episodio_lider,
    COALESCE(l.qtd_ep, ta.total_anime) AS reacoes_episodio_lider
  FROM totais_anime ta
  LEFT JOIN lideres l ON l.mal_id = ta.mal_id AND l.rnk = 1
  ORDER BY ta.total_anime DESC
  LIMIT LEAST(GREATEST(p_limite, 1), 50);
$$;

REVOKE EXECUTE ON FUNCTION public.top_reacoes_temporada(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.top_reacoes_temporada(text, integer) TO anon, authenticated;
