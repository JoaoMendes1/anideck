-- =============================================================================
-- 106 — Números da comunidade por anime e Animes em alta (#271)
-- =============================================================================
--
-- Expõe apenas contagens agregadas de usuários por obra, sem retornar user_id
-- nem identificadores individuais:
--   1. numeros_comunidade_anime(p_mal_id): quantas pessoas têm a obra no deck
--      em Assistindo (inclui Em Dia), Completo, Dropado e Quero Assistir.
--   2. animes_em_alta_comunidade(p_dias, p_limite): obras com mais atividade
--      recente (usuários ativos, episódios marcados fora do acervo em lote,
--      comentários visíveis e reações), penalizando obras com muitos drops
--      recentes.
--
-- Pode rodar mais de uma vez. Depende de sql/041 e sql/098.

-- -----------------------------------------------------------------------------
-- 1. Contagem agregada de status da comunidade por anime (piso < 3)
-- -----------------------------------------------------------------------------
-- Regra de privacidade: contagens reais 1 ou 2 retornam -1 ("Menos de 3") para
-- evitar exposição de usuários individuais. Se exatamente uma categoria ficar
-- em 1..2 e total >= 3, arredonda total para baixo em múltiplo de 3 com flag
-- total_aproximado = true, impedindo dedução por subtração (total - visíveis).
DROP FUNCTION IF EXISTS public.numeros_comunidade_anime(integer);
CREATE OR REPLACE FUNCTION public.numeros_comunidade_anime(p_mal_id integer)
RETURNS TABLE (
  mal_id           integer,
  assistindo       integer,
  completo         integer,
  dropado          integer,
  quero_assistir   integer,
  total            integer,
  total_aproximado boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH bruto AS (
    SELECT
      COALESCE(count(*) FILTER (WHERE m.status IN ('Assistindo', 'Em Dia')), 0)::integer AS assistindo,
      COALESCE(count(*) FILTER (WHERE m.status = 'Completo'), 0)::integer AS completo,
      COALESCE(count(*) FILTER (WHERE m.status = 'Dropado'), 0)::integer AS dropado,
      COALESCE(count(*) FILTER (WHERE m.status = 'Quero Assistir'), 0)::integer AS quero_assistir,
      COALESCE(count(*), 0)::integer AS total
    FROM public.media_entries m
    WHERE p_mal_id > 0
      AND m.mal_id = p_mal_id
      AND m.tipo = 'anime'
  ),
  calculado AS (
    SELECT
      assistindo,
      completo,
      dropado,
      quero_assistir,
      total,
      (CASE WHEN assistindo BETWEEN 1 AND 2 THEN 1 ELSE 0 END)
      + (CASE WHEN completo BETWEEN 1 AND 2 THEN 1 ELSE 0 END)
      + (CASE WHEN dropado BETWEEN 1 AND 2 THEN 1 ELSE 0 END)
      + (CASE WHEN quero_assistir BETWEEN 1 AND 2 THEN 1 ELSE 0 END) AS ocultos_unicos
    FROM bruto
  )
  SELECT
    p_mal_id AS mal_id,
    CASE WHEN c.assistindo BETWEEN 1 AND 2 THEN -1 ELSE c.assistindo END AS assistindo,
    CASE WHEN c.completo BETWEEN 1 AND 2 THEN -1 ELSE c.completo END AS completo,
    CASE WHEN c.dropado BETWEEN 1 AND 2 THEN -1 ELSE c.dropado END AS dropado,
    CASE WHEN c.quero_assistir BETWEEN 1 AND 2 THEN -1 ELSE c.quero_assistir END AS quero_assistir,
    CASE
      WHEN c.total BETWEEN 1 AND 2 THEN -1
      WHEN c.total >= 3 AND c.ocultos_unicos = 1 THEN GREATEST(3, ((c.total / 3) * 3))::integer
      ELSE c.total
    END AS total,
    (c.total >= 3 AND c.ocultos_unicos = 1) AS total_aproximado
  FROM calculado c;
$$;

REVOKE ALL ON FUNCTION public.numeros_comunidade_anime(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.numeros_comunidade_anime(integer) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Animes em alta na comunidade
-- -----------------------------------------------------------------------------
-- Ponderação por obra na janela de p_dias dias:
--   +5 por usuário ativo distinto (marcou episódio, comentou ou reagiu)
--   +2 por episódio marcado recentemente (teto de 6 por usuário na janela,
--      ignorando preenchimento retroativo com watched_at NULL)
--   +4 por comentário não oculto (cujo autor mantém o episódio marcado)
--   +3 por reação em episódio
--   -8 por drop recente (status = 'Dropado' atualizado na janela)
-- Obras cuja pontuação fica <= 0 após os drops não entram na lista.
-- Regra de privacidade: usuarios_ativos e drops_recentes entre 1 e 2 saem
-- mascarados como -1 ("Menos de 3"), mantendo a ordenação pelos valores reais.
CREATE OR REPLACE FUNCTION public.animes_em_alta_comunidade(
  p_dias   integer DEFAULT 14,
  p_limite integer DEFAULT 12
)
RETURNS TABLE (
  mal_id               integer,
  pontuacao            integer,
  usuarios_ativos      integer,
  episodios_recentes   integer,
  comentarios_recentes integer,
  reacoes_recentes     integer,
  drops_recentes       integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH
  params AS (
    SELECT
      now() - make_interval(days => LEAST(GREATEST(COALESCE(p_dias, 14), 1), 90)) AS corte,
      LEAST(GREATEST(COALESCE(p_limite, 12), 1), 30) AS limite
  ),
  eps_por_usuario AS (
    SELECT
      ep.mal_id,
      ep.user_id,
      count(*)::integer AS total_eps,
      LEAST(count(*), 6)::integer AS eps_pontuados
    FROM public.episode_progress ep, params p
    WHERE ep.mal_id > 0
      AND ep.watched_at IS NOT NULL
      AND ep.watched_at >= p.corte
    GROUP BY ep.mal_id, ep.user_id
  ),
  eps_agg AS (
    SELECT
      mal_id,
      sum(total_eps)::integer AS episodios_recentes,
      sum(eps_pontuados)::integer AS eps_pontuados
    FROM eps_por_usuario
    GROUP BY mal_id
  ),
  coms_validos AS (
    SELECT c.mal_id, c.user_id
    FROM public.episode_comments c, params p
    WHERE c.mal_id > 0
      AND NOT c.oculto
      AND c.created_at >= p.corte
      AND EXISTS (
        SELECT 1
        FROM public.episode_progress ep
        WHERE ep.user_id = c.user_id
          AND ep.mal_id = c.mal_id
          AND ep.episode_number = c.episode_number
      )
  ),
  coms_agg AS (
    SELECT mal_id, count(*)::integer AS comentarios_recentes
    FROM coms_validos
    GROUP BY mal_id
  ),
  reacs_validas AS (
    SELECT er.mal_id, er.user_id
    FROM public.episode_reactions er, params p
    WHERE er.mal_id > 0
      AND er.created_at >= p.corte
      AND EXISTS (
        SELECT 1
        FROM public.episode_progress ep
        WHERE ep.user_id = er.user_id
          AND ep.mal_id = er.mal_id
          AND ep.episode_number = er.episode_number
      )
  ),
  reacs_agg AS (
    SELECT mal_id, count(*)::integer AS reacoes_recentes
    FROM reacs_validas
    GROUP BY mal_id
  ),
  drops_agg AS (
    SELECT m.mal_id, count(*)::integer AS drops_recentes
    FROM public.media_entries m, params p
    WHERE m.mal_id > 0
      AND m.tipo = 'anime'
      AND m.status = 'Dropado'
      AND m.updated_at >= p.corte
    GROUP BY m.mal_id
  ),
  ativos_distintos AS (
    SELECT mal_id, count(DISTINCT user_id)::integer AS usuarios_ativos
    FROM (
      SELECT mal_id, user_id FROM eps_por_usuario
      UNION
      SELECT mal_id, user_id FROM coms_validos
      UNION
      SELECT mal_id, user_id FROM reacs_validas
    ) u
    GROUP BY mal_id
  ),
  combinado AS (
    SELECT
      a.mal_id,
      a.usuarios_ativos,
      COALESCE(e.episodios_recentes, 0) AS episodios_recentes,
      COALESCE(e.eps_pontuados, 0) AS eps_pontuados,
      COALESCE(c.comentarios_recentes, 0) AS comentarios_recentes,
      COALESCE(r.reacoes_recentes, 0) AS reacoes_recentes,
      COALESCE(d.drops_recentes, 0) AS drops_recentes
    FROM ativos_distintos a
    LEFT JOIN eps_agg e ON e.mal_id = a.mal_id
    LEFT JOIN coms_agg c ON c.mal_id = a.mal_id
    LEFT JOIN reacs_agg r ON r.mal_id = a.mal_id
    LEFT JOIN drops_agg d ON d.mal_id = a.mal_id
  )
  SELECT
    cb.mal_id,
    GREATEST(
      0,
      (cb.usuarios_ativos * 5)
      + (cb.eps_pontuados * 2)
      + (cb.comentarios_recentes * 4)
      + (cb.reacoes_recentes * 3)
      - (cb.drops_recentes * 8)
    )::integer AS pontuacao,
    CASE WHEN cb.usuarios_ativos BETWEEN 1 AND 2 THEN -1 ELSE cb.usuarios_ativos END AS usuarios_ativos,
    cb.episodios_recentes,
    cb.comentarios_recentes,
    cb.reacoes_recentes,
    CASE WHEN cb.drops_recentes BETWEEN 1 AND 2 THEN -1 ELSE cb.drops_recentes END AS drops_recentes
  FROM combinado cb
  WHERE (
    (cb.usuarios_ativos * 5)
    + (cb.eps_pontuados * 2)
    + (cb.comentarios_recentes * 4)
    + (cb.reacoes_recentes * 3)
    - (cb.drops_recentes * 8)
  ) > 0
  ORDER BY
    pontuacao DESC,
    cb.usuarios_ativos DESC,
    (cb.episodios_recentes + cb.comentarios_recentes + cb.reacoes_recentes) DESC,
    cb.mal_id ASC
  LIMIT (SELECT limite FROM params);
$$;

REVOKE ALL ON FUNCTION public.animes_em_alta_comunidade(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.animes_em_alta_comunidade(integer, integer) TO anon, authenticated, service_role;
