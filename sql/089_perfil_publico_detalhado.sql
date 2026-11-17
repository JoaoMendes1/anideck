-- =============================================================================
-- 089 — Perfil público detalhado
-- =============================================================================
--
-- perfil_publico() (sql/041) passa a trazer o que os outros jogadores querem ver além do
-- XP: os gêneros que a pessoa mais assiste (a base da especialidade, calculada no Go),
-- horas assistidas, missões concluídas e os recordes do RPG.
--
-- * generos: os 8 maiores de fn_user_genre_affinity (sql/010), só gênero e demografia, a
--   mesma conta da tela Meu Gosto e dos Especialistas da Guilda.
-- * horas_assistidas: episódios vistos vezes a duração (curadoria antes do cache). Anime
--   sem duração conhecida conta 0, pela convenção do projeto.
-- * missoes_concluidas: resgates de missão do dia e da semana.
-- * rpg: vitórias, monstros diferentes derrotados, itens Lendários no inventário e o maior
--   aprimoramento.
--
-- Os campos antigos continuam iguais. Só perfil público (profiles.publico) responde.
-- Esta passa a ser a definição viva de perfil_publico.
--
-- Ordem: antes de promover o código do perfil detalhado (o Go aceita a resposta antiga,
-- mas a tela fica sem as seções novas). Pode rodar mais de uma vez.

CREATE OR REPLACE FUNCTION public.perfil_publico(p_handle text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'handle', p.handle,
    'nome', p.nome,
    'bio', p.bio,
    'vitrine', p.vitrine,
    'membro_desde', p.created_at,
    'xp_total', COALESCE((SELECT sum(xp_earned) FROM public.xp_ledger WHERE user_id = p.user_id), 0),
    'episodios_vistos', (SELECT count(*) FROM public.episode_progress WHERE user_id = p.user_id),
    'comentarios', (SELECT count(*) FROM public.episode_comments WHERE user_id = p.user_id AND NOT oculto),
    'status', COALESCE((SELECT jsonb_object_agg(status, total) FROM (
                 SELECT status, count(*) AS total FROM public.media_entries
                  WHERE user_id = p.user_id GROUP BY status) s), '{}'::jsonb),
    'dias_ativos', COALESCE((SELECT jsonb_agg(dia ORDER BY dia) FROM (
                 SELECT DISTINCT (watched_at AT TIME ZONE 'America/Sao_Paulo')::date AS dia
                   FROM public.episode_progress
                  WHERE user_id = p.user_id AND watched_at IS NOT NULL
                    AND watched_at > now() - interval '30 days') d), '[]'::jsonb),
    'descanso_inicio', p.descanso_inicio,
    'descanso_fim', p.descanso_fim,
    'generos', COALESCE((SELECT jsonb_agg(jsonb_build_object('genre', g.genre, 'total_watched', g.total_watched, 'tier', g.tier)
                                          ORDER BY g.total_watched DESC, g.genre)
                           FROM (SELECT a.genre, a.total_watched, a.tier
                                   FROM public.fn_user_genre_affinity(p.user_id) a
                                  WHERE a.tier IN ('genero', 'demografia') AND a.total_watched > 0
                                  ORDER BY a.total_watched DESC, a.genre
                                  LIMIT 8) g), '[]'::jsonb),
    'horas_assistidas', COALESCE((SELECT (sum(COALESCE(NULLIF(cur.custom_duration_minutes, 0), c.duration_minutes, 0)) / 60)::integer
                                    FROM public.episode_progress ep
                                    LEFT JOIN public.anime_metadata_cache c ON c.mal_id = ep.mal_id
                                    LEFT JOIN public.curated_animes cur ON cur.mal_id = ep.mal_id
                                   WHERE ep.user_id = p.user_id), 0),
    'missoes_concluidas', (SELECT count(*) FROM public.crystal_ledger
                            WHERE user_id = p.user_id AND motivo IN ('missao_diaria', 'missao_semanal')),
    'rpg', jsonb_build_object(
      'vitorias', (SELECT count(*) FROM public.rpg_batalhas WHERE user_id = p.user_id AND venceu),
      'monstros_derrotados', (SELECT count(DISTINCT monstro_id) FROM public.rpg_batalhas WHERE user_id = p.user_id AND venceu),
      'lendarios', (SELECT count(*) FROM public.rpg_inventario inv
                      JOIN public.rpg_itens it ON it.id = inv.item_id
                     WHERE inv.user_id = p.user_id AND it.raridade = 'lendario'),
      'maior_aprimoramento', COALESCE((SELECT max(aprimoramento) FROM public.rpg_inventario WHERE user_id = p.user_id), 0)
    )
  )
  FROM public.profiles p
  WHERE p.handle = lower(p_handle) AND p.publico;
$$;

REVOKE EXECUTE ON FUNCTION public.perfil_publico(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.perfil_publico(text) TO anon, authenticated;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT public.perfil_publico('seu_handle') -> 'generos';
-- SELECT public.perfil_publico('seu_handle') -> 'rpg';
