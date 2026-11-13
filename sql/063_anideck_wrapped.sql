-- =============================================================================
-- 063 — AniDeck Wrapped: Retrospectiva Anual Compartilhável (#190, Fase 17.5a)
-- =============================================================================
-- Consolida as estatísticas do ano de um membro no fuso de Brasília (America/Sao_Paulo)
-- em uma única RPC agregada, evitando que o backend precise ler milhares de linhas
-- (conforme Armadilhas 3, 4 e 28 do docs/PITFALLS.md).

CREATE OR REPLACE FUNCTION public.anideck_wrapped(
  p_ano INT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_user UUID;
  v_is_owner BOOLEAN;
  v_is_public BOOLEAN;
  v_inicio TIMESTAMPTZ;
  v_fim TIMESTAMPTZ;
  v_total_episodios INT := 0;
  v_minutos_totais INT := 0;
  v_horas_estimadas NUMERIC := 0.0;
  v_dias_ativos INT := 0;
  v_nota_media NUMERIC := 0.0;
  v_total_comentarios INT := 0;
  v_total_reacoes INT := 0;
  v_total_cartas INT := 0;
  v_top_animes JSONB := '[]'::jsonb;
  v_top_generos JSONB := '[]'::jsonb;
  v_reacao_favorita TEXT := '';
  v_perfil JSONB;
  v_resultado JSONB;
BEGIN
  -- 1. Determina usuário alvo
  IF p_user_id IS NOT NULL THEN
    v_target_user := p_user_id;
  ELSE
    v_target_user := auth.uid();
  END IF;

  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado ou não especificado';
  END IF;

  v_is_owner := (auth.uid() = v_target_user);

  -- 2. Checa privacidade se não for o dono
  SELECT publico INTO v_is_public FROM public.profiles WHERE user_id = v_target_user;
  IF NOT v_is_owner AND (v_is_public IS NULL OR NOT v_is_public) THEN
    RAISE EXCEPTION 'Perfil privado ou não encontrado';
  END IF;

  -- 3. Janela do ano em Brasília (Armadilha 3 do docs/PITFALLS.md)
  v_inicio := make_timestamptz(p_ano, 1, 1, 0, 0, 0, 'America/Sao_Paulo');
  v_fim := make_timestamptz(p_ano + 1, 1, 1, 0, 0, 0, 'America/Sao_Paulo');

  -- 4. Episódios marcados no ano (watched_at real, Armadilha 4) e dias ativos
  SELECT
    COALESCE(COUNT(*), 0),
    COALESCE(COUNT(DISTINCT (watched_at AT TIME ZONE 'America/Sao_Paulo')::date), 0)
  INTO v_total_episodios, v_dias_ativos
  FROM public.episode_progress
  WHERE user_id = v_target_user
    AND watched_at >= v_inicio
    AND watched_at < v_fim;

  -- 5. Horas estimadas: episódios * duração aproximada da obra (ou fallback 24m)
  SELECT COALESCE(SUM(COALESCE(NULLIF(amc.duration, 0), 24)), 0)
  INTO v_minutos_totais
  FROM public.episode_progress ep
  LEFT JOIN public.anime_metadata_cache amc ON amc.mal_id = ep.mal_id
  WHERE ep.user_id = v_target_user
    AND ep.watched_at >= v_inicio
    AND ep.watched_at < v_fim;

  v_horas_estimadas := ROUND((v_minutos_totais / 60.0)::numeric, 1);

  -- 6. Top 5 Animes com mais episódios marcados no ano
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
  INTO v_top_animes
  FROM (
    SELECT
      ep.mal_id,
      COALESCE(NULLIF(ca.custom_title, ''), NULLIF(amc.title, ''), 'Anime #' || ep.mal_id::text) AS title,
      COALESCE(NULLIF(ca.custom_cover_image, ''), amc.images->'jpg'->>'image_url', amc.images->'jpg'->>'large_image_url', '') AS cover_url,
      COUNT(*) AS total_eps
    FROM public.episode_progress ep
    LEFT JOIN public.curated_animes ca ON ca.mal_id = ep.mal_id
    LEFT JOIN public.anime_metadata_cache amc ON amc.mal_id = ep.mal_id
    WHERE ep.user_id = v_target_user
      AND ep.watched_at >= v_inicio
      AND ep.watched_at < v_fim
    GROUP BY ep.mal_id, ca.custom_title, amc.title, ca.custom_cover_image, amc.images
    ORDER BY COUNT(*) DESC, ep.mal_id ASC
    LIMIT 5
  ) sub;

  -- 7. Top Gêneros assistidos no ano
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
  INTO v_top_generos
  FROM (
    SELECT
      COALESCE(gt.display_name_pt, g.nome) AS genero,
      COUNT(*) AS total
    FROM public.episode_progress ep
    JOIN public.anime_metadata_cache amc ON amc.mal_id = ep.mal_id
    CROSS JOIN LATERAL unnest(amc.genres) AS g(nome)
    LEFT JOIN public.genre_taxonomy gt ON LOWER(gt.raw_name) = LOWER(g.nome)
    WHERE ep.user_id = v_target_user
      AND ep.watched_at >= v_inicio
      AND ep.watched_at < v_fim
      AND COALESCE(gt.tier, '') <> 'ignorado'
    GROUP BY COALESCE(gt.display_name_pt, g.nome)
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) sub;

  -- 8. Nota média de animes com nota no ano
  SELECT COALESCE(ROUND(AVG(nota)::numeric, 1), 0.0)
  INTO v_nota_media
  FROM public.media_entries
  WHERE user_id = v_target_user
    AND nota > 0
    AND (
      (updated_at >= v_inicio AND updated_at < v_fim)
      OR mal_id IN (
        SELECT DISTINCT mal_id
        FROM public.episode_progress
        WHERE user_id = v_target_user AND watched_at >= v_inicio AND watched_at < v_fim
      )
    );

  -- 9. Engajamento social no ano: comentários, reações e cartas
  SELECT COALESCE(COUNT(*), 0) INTO v_total_comentarios
  FROM public.episode_comments
  WHERE user_id = v_target_user
    AND created_at >= v_inicio
    AND created_at < v_fim;

  SELECT COALESCE(COUNT(*), 0) INTO v_total_reacoes
  FROM public.episode_reactions
  WHERE user_id = v_target_user
    AND created_at >= v_inicio
    AND created_at < v_fim;

  SELECT reacao INTO v_reacao_favorita
  FROM public.episode_reactions
  WHERE user_id = v_target_user
    AND created_at >= v_inicio
    AND created_at < v_fim
  GROUP BY reacao
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT COALESCE(COUNT(*), 0) INTO v_total_cartas
  FROM public.user_cards
  WHERE user_id = v_target_user
    AND obtida_em >= v_inicio
    AND obtida_em < v_fim;

  -- 10. Dados do perfil e guilda
  SELECT jsonb_build_object(
    'user_id', p.user_id,
    'handle', p.handle,
    'nome', p.nome,
    'avatar_url', p.avatar_url,
    'classe', p.classe,
    'titulo_ativo', p.titulo_ativo
  )
  INTO v_perfil
  FROM public.profiles p
  WHERE p.user_id = v_target_user;

  v_resultado := jsonb_build_object(
    'ano', p_ano,
    'usuario', v_perfil,
    'total_episodios', v_total_episodios,
    'horas_estimadas', v_horas_estimadas,
    'dias_ativos', v_dias_ativos,
    'nota_media', v_nota_media,
    'top_animes', v_top_animes,
    'top_generos', v_top_generos,
    'total_comentarios', v_total_comentarios,
    'total_reacoes', v_total_reacoes,
    'reacao_favorita', COALESCE(v_reacao_favorita, ''),
    'total_cartas', v_total_cartas
  );

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION public.anideck_wrapped(INT, UUID) TO authenticated, anon;
