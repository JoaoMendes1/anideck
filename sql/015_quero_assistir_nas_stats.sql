-- 015: adiciona a contagem de "Quero Assistir" ao overview das Estatísticas.
--
-- POR QUE: o denominador do gráfico de Distribuição por Status é total_animes, que conta
-- TODAS as entradas do deck. Mas a view só devolvia quatro dos cinco status, então as
-- fatias somavam ~60% e o restante virava um pedaço escuro sem legenda. Nada quebrava:
-- o número só estava errado na tela.
--
-- A coluna nova vai no FIM de propósito: CREATE OR REPLACE VIEW não permite inserir
-- coluna no meio de uma view existente.

CREATE OR REPLACE VIEW view_user_stats AS
 SELECT e.user_id,
    count(*) AS total_animes,
    sum(
        CASE
            WHEN e.status = 'Assistindo'::text THEN 1
            ELSE 0
        END) AS assistindo,
    sum(
        CASE
            WHEN e.status = 'Em Dia'::text THEN 1
            ELSE 0
        END) AS em_dia,
    sum(
        CASE
            WHEN e.status = 'Completo'::text THEN 1
            ELSE 0
        END) AS completos,
    sum(
        CASE
            WHEN e.status = 'Dropado'::text THEN 1
            ELSE 0
        END) AS dropados,
    round(avg(e.nota), 1) AS nota_media,
    sum(COALESCE(ep_count.total, 0::bigint) * COALESCE(c.duration_minutes, 24))::bigint AS tempo_total_minutos,
    sum(
        CASE
            WHEN e.status = 'Quero Assistir'::text THEN 1
            ELSE 0
        END) AS quero_assistir
   FROM media_entries e
     LEFT JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
     LEFT JOIN LATERAL ( SELECT count(*) AS total
           FROM episode_progress ep
          WHERE ep.user_id = e.user_id AND ep.mal_id = e.mal_id) ep_count ON true
  WHERE e.user_id = auth.uid()
  GROUP BY e.user_id;