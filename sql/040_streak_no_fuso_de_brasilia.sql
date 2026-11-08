-- =============================================================================
-- 040_streak_no_fuso_de_brasilia.sql
-- Dias do streak contados no fuso de Brasília.
--
-- date(watched_at) usa o fuso da sessão do banco (UTC): um episódio marcado às
-- 22h em Brasília caía no dia seguinte, e o streak quebrava ou pulava um dia,
-- enquanto o "XP de hoje" da Guilda já usava o dia de Brasília. O Go passa a
-- comparar com a data de hoje no mesmo fuso (CalculateStreak).
--
-- Pode ser aplicado antes ou depois do código: os dois lados juntos dão o dia
-- certo; isolados, o erro é o mesmo de antes (no máximo um dia de diferença).
-- =============================================================================

CREATE OR REPLACE VIEW public.view_user_watch_dates WITH (security_invoker = on) AS
 SELECT DISTINCT user_id,
    (watched_at AT TIME ZONE 'America/Sao_Paulo')::date AS dia
   FROM episode_progress
  WHERE user_id = auth.uid() AND watched_at IS NOT NULL
  ORDER BY ((watched_at AT TIME ZONE 'America/Sao_Paulo')::date);

-- =============================================================================
-- Conferência (rodar depois de aplicar)
-- =============================================================================
-- SELECT pg_get_viewdef('view_user_watch_dates'::regclass, true);   -- contém America/Sao_Paulo
-- SELECT reloptions FROM pg_class WHERE relname = 'view_user_watch_dates'; -- {security_invoker=on}
