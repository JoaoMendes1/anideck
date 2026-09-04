-- =============================================================================
-- sql/023_watched_at_nulo_em_lote.sql
-- =============================================================================
-- Contexto: marcar um anime como "Completo" passou a preencher episode_progress
-- em lote, gravando watched_at NULL. NULL aqui significa "assistiu, mas não sei
-- quando" — a mesma distinção NULL x valor preenchido já adotada na curadoria.
--
-- Sem esta correção, as views que agrupam por tempo passariam a ter um balde
-- NULL: semana nula em Atividade Recente, hora nula em Padrão de Horário, dia
-- nulo no cálculo de Streak.
--
-- NÃO precisa mexer em view_user_stats: o tempo assistido conta LINHAS de
-- episode_progress, sem olhar watched_at. Anime completo passa a somar tempo
-- automaticamente, que é o objetivo da correção.
--
-- NÃO precisa mexer em view_episode_progress_orphans: ela só exibe watched_at
-- como coluna de diagnóstico, sem agrupar nem filtrar por ele.
--
-- Todas as views abaixo mantêm WITH (security_invoker = on) e o
-- WHERE user_id = auth.uid() explícito. As duas coisas, não uma
-- (Armadilha 2 do PITFALLS.md).
--
-- Este arquivo NÃO edita nenhum sql/ anterior: correção de view nasce em
-- arquivo novo (Armadilha 12).
-- =============================================================================


-- Atividade Recente: agrupa por semana. Linha sem data não é atividade no tempo.
CREATE OR REPLACE VIEW public.view_user_activity WITH (security_invoker = on) AS
 SELECT user_id,
    date_trunc('week'::text, watched_at)::date AS semana,
    count(*) AS episodios_assistidos
   FROM episode_progress
  WHERE user_id = auth.uid() AND watched_at IS NOT NULL
  GROUP BY user_id, (date_trunc('week'::text, watched_at))
  ORDER BY (date_trunc('week'::text, watched_at)::date);


-- Streak: o Go monta a sequência a partir dos dias distintos desta view.
-- Dia nulo criaria um buraco silencioso na contagem.
CREATE OR REPLACE VIEW public.view_user_watch_dates WITH (security_invoker = on) AS
 SELECT DISTINCT user_id,
    date(watched_at) AS dia
   FROM episode_progress
  WHERE user_id = auth.uid() AND watched_at IS NOT NULL
  ORDER BY (date(watched_at));


-- Padrão de Horário: hora do dia. Linha sem horário não tem hora.
CREATE OR REPLACE VIEW public.view_user_watch_hours WITH (security_invoker = on) AS
 SELECT user_id,
    EXTRACT(hour FROM watched_at)::integer AS hora,
    count(*) AS total
   FROM episode_progress
  WHERE user_id = auth.uid() AND watched_at IS NOT NULL
  GROUP BY user_id, (EXTRACT(hour FROM watched_at))
  ORDER BY (EXTRACT(hour FROM watched_at)::integer);


-- Sessões: o agrupamento por proximidade de 2h depende de timestamp real.
CREATE OR REPLACE VIEW public.view_user_watch_timestamps WITH (security_invoker = on) AS
 SELECT watched_at
   FROM episode_progress ep
  WHERE user_id = auth.uid() AND watched_at IS NOT NULL
  ORDER BY watched_at;


-- Maratona mais rápida: max/min já ignoram NULL sozinhos, MAS o count(*) não.
-- Sem o filtro, um anime preenchido em lote entraria com contagem alta e
-- intervalo minúsculo, quebrando a guarda dos 5 minutos por marcação e
-- devolvendo uma maratona que nunca aconteceu.
CREATE OR REPLACE VIEW public.view_user_fastest_binge WITH (security_invoker = on) AS
 SELECT ep.user_id,
    COALESCE(cur.custom_title, c.title) AS title,
    count(*) AS episodios_marcados,
    EXTRACT(epoch FROM max(ep.watched_at) - min(ep.watched_at)) / 3600::numeric AS horas_gastas
   FROM episode_progress ep
     LEFT JOIN anime_metadata_cache c ON ep.mal_id = c.mal_id
     LEFT JOIN curated_animes cur ON ep.mal_id = cur.mal_id
  WHERE ep.user_id = auth.uid() AND ep.watched_at IS NOT NULL
  GROUP BY ep.user_id, ep.mal_id, (COALESCE(cur.custom_title, c.title))
 HAVING count(*) >= 3 AND EXTRACT(epoch FROM max(ep.watched_at) - min(ep.watched_at)) >= ((count(*) - 1) * 300)::numeric
  ORDER BY (EXTRACT(epoch FROM max(ep.watched_at) - min(ep.watched_at)) / 3600::numeric)
 LIMIT 1;


-- Anime esquecido: o filtro entra na condição do LEFT JOIN, não no WHERE.
-- No WHERE ele viraria INNER JOIN e mudaria o conjunto de animes avaliados.
-- A guarda HAVING max(...) IS NOT NULL continua fazendo o trabalho de excluir
-- quem não tem nenhuma marcação com data.
CREATE OR REPLACE VIEW public.view_user_forgotten_anime WITH (security_invoker = on) AS
 SELECT e.mal_id,
    COALESCE(cur.custom_title, c.title) AS title,
    max(ep.watched_at) AS ultimo_episodio,
    count(ep.id) AS episodios_assistidos,
    c.episodes AS total_episodios
   FROM media_entries e
     LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
     LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
     LEFT JOIN episode_progress ep ON ep.mal_id = e.mal_id AND ep.user_id = e.user_id AND ep.watched_at IS NOT NULL
  WHERE e.user_id = auth.uid() AND e.status = 'Assistindo'::text
  GROUP BY e.mal_id, cur.custom_title, c.title, c.episodes
 HAVING max(ep.watched_at) IS NOT NULL
  ORDER BY (max(ep.watched_at))
 LIMIT 1;