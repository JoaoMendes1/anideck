-- =============================================================================
-- snapshot_schema.sql — RETRATO DO BANCO. NAO EXECUTE ESTE ARQUIVO.
-- =============================================================================
-- Regenerado em 15/11/2026 19:37 a partir do banco de producao.
--
-- PARA QUE SERVE: consulta rapida do estado real do banco, sem precisar abrir
-- o painel do Supabase nem confiar nos arquivos sql/ antigos (que podem ter
-- sido redefinidos por arquivos de numero maior -- ver Armadilha 12 do
-- PITFALLS.md). Tambem serve como contexto inicial em sessao nova com IA.
--
-- O QUE ELE NAO E: uma migration. As secoes [1] e [2] sao comentarios; a [3]
-- tem DDL de view que so deve ser usado como referencia, nunca colado direto.
--
-- UUIDs aparecem mascarados como <uuid>. O repositorio e publico e o
-- ADMIN_USER_ID nao entra nele -- ver regra 4 do sql/README.md.
--
-- REGENERAR: rodar sql/gerar_snapshot.sql no SQL Editor e substituir este
-- arquivo inteiro pelo resultado. Fazer isso a cada arquivo sql/ novo.
-- =============================================================================

-- =============================================================================
-- [1] TABELAS — colunas e tipos
-- =============================================================================
-- ATENCAO: apenas colunas, tipos e NOT NULL. NAO inclui PK, FK, DEFAULT,
-- UNIQUE nem CHECK. Este bloco NAO recria as tabelas -- e so consulta.
-- =============================================================================

-- ai_curation_queue
--     id                           uuid NOT NULL
--     mal_id                       integer NOT NULL
--     tipo                         text NOT NULL
--     status                       text NOT NULL
--     resultado                    jsonb
--     relatorio                    text
--     erro                         text
--     tentativas                   integer NOT NULL
--     pego_em                      timestamp with time zone
--     created_at                   timestamp with time zone NOT NULL
--     processed_at                 timestamp with time zone

-- anime_metadata_cache
--     mal_id                       integer NOT NULL
--     title                        text
--     episodes                     integer
--     duration_minutes             integer
--     genres                       ARRAY
--     studios                      ARRAY
--     average_score                numeric
--     season_year                  integer
--     last_updated                 timestamp with time zone
--     tags                         ARRAY

-- app_admins
--     user_id                      uuid NOT NULL
--     created_at                   timestamp with time zone NOT NULL

-- app_settings
--     key                          text NOT NULL
--     value                        text NOT NULL
--     updated_at                   timestamp with time zone NOT NULL

-- chefoes
--     id                           uuid NOT NULL
--     temporada                    text NOT NULL
--     nome                         text NOT NULL
--     titulo                       text
--     descricao                    text
--     arte_url                     text
--     hp_total                     integer NOT NULL
--     inicio                       timestamp with time zone NOT NULL
--     fim                          timestamp with time zone NOT NULL
--     dano_minimo_recompensa       integer NOT NULL
--     recompensa_anicoins          integer NOT NULL
--     titulo_recompensa            text
--     derrotado                    boolean NOT NULL
--     derrotado_em                 timestamp with time zone
--     recompensas_pagas            boolean NOT NULL
--     created_at                   timestamp with time zone NOT NULL

-- cla_convites
--     id                           uuid NOT NULL
--     cla_id                       uuid NOT NULL
--     convidado_user_id            uuid NOT NULL
--     convidado_por                uuid NOT NULL
--     status                       text NOT NULL
--     criado_em                    timestamp with time zone NOT NULL

-- cla_denuncias
--     id                           uuid NOT NULL
--     cla_id                       uuid NOT NULL
--     denunciante_user_id          uuid NOT NULL
--     motivo                       text NOT NULL
--     status                       text NOT NULL
--     criado_em                    timestamp with time zone NOT NULL

-- cla_desafios
--     id                           uuid NOT NULL
--     cla_id                       uuid NOT NULL
--     semana                       text NOT NULL
--     tipo                         text NOT NULL
--     titulo                       text NOT NULL
--     descricao                    text NOT NULL
--     unidade                      text NOT NULL
--     icone                        text NOT NULL
--     meta                         integer NOT NULL
--     recompensa_anicoins          integer NOT NULL
--     concluido_em                 timestamp with time zone
--     fechado                      boolean NOT NULL
--     pago                         boolean NOT NULL
--     criado_em                    timestamp with time zone NOT NULL

-- cla_historico_saida
--     user_id                      uuid NOT NULL
--     saiu_em                      timestamp with time zone NOT NULL

-- cla_membros
--     cla_id                       uuid NOT NULL
--     user_id                      uuid NOT NULL
--     papel                        text NOT NULL
--     entrou_em                    timestamp with time zone NOT NULL

-- cla_temporadas_campeoes
--     id                           uuid NOT NULL
--     temporada                    text NOT NULL
--     cla_id                       uuid NOT NULL
--     posicao                      integer NOT NULL
--     pontuacao                    integer NOT NULL
--     xp_total                     bigint NOT NULL
--     total_membros                integer NOT NULL
--     recompensa_anicoins          integer NOT NULL
--     emblema_slug                 text
--     fechado_em                   timestamp with time zone NOT NULL

-- clas
--     id                           uuid NOT NULL
--     nome                         text NOT NULL
--     tag                          character varying NOT NULL
--     descricao                    text NOT NULL
--     emblema                      text NOT NULL
--     tipo                         text NOT NULL
--     nivel_minimo                 integer NOT NULL
--     criador_id                   uuid NOT NULL
--     ativo                        boolean NOT NULL
--     criado_em                    timestamp with time zone NOT NULL
--     atualizado_em                timestamp with time zone NOT NULL

-- comment_likes
--     comment_id                   uuid NOT NULL
--     user_id                      uuid NOT NULL
--     created_at                   timestamp with time zone NOT NULL

-- comment_reports
--     id                           uuid NOT NULL
--     comment_id                   uuid NOT NULL
--     reporter_id                  uuid NOT NULL
--     motivo                       text NOT NULL
--     detalhe                      text NOT NULL
--     resolvido                    boolean NOT NULL
--     created_at                   timestamp with time zone NOT NULL

-- convites_membros
--     id                           uuid NOT NULL
--     anfitriao_user_id            uuid NOT NULL
--     codigo                       text NOT NULL
--     especial_admin               boolean NOT NULL
--     usos_total                   integer NOT NULL
--     anicoins_ganhos              integer NOT NULL
--     criado_em                    timestamp with time zone NOT NULL

-- convites_resgatados
--     id                           uuid NOT NULL
--     convite_id                   uuid NOT NULL
--     anfitriao_user_id            uuid NOT NULL
--     convidado_user_id            uuid NOT NULL
--     recompensa_anfitriao_anicoins integer NOT NULL
--     recompensa_anfitriao_xp      integer NOT NULL
--     recompensa_convidado_anicoins integer NOT NULL
--     titulo_concedido             text
--     especial_admin               boolean NOT NULL
--     resgatado_em                 timestamp with time zone NOT NULL

-- crystal_ledger
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     quantidade                   integer NOT NULL
--     motivo                       text NOT NULL
--     referencia                   text NOT NULL
--     criado_em                    timestamp with time zone NOT NULL

-- curated_animes
--     id                           uuid NOT NULL
--     mal_id                       integer NOT NULL
--     custom_title                 text NOT NULL
--     custom_synopsis              text
--     custom_format                text
--     custom_status                text
--     custom_tags                  ARRAY
--     order_index                  integer
--     created_at                   timestamp with time zone
--     custom_cover_image           text
--     custom_banner_image          text
--     custom_characters            jsonb
--     custom_episodes              jsonb
--     custom_external_links        jsonb
--     custom_first_aired_at        timestamp with time zone
--     custom_duration_minutes      integer
--     is_destaque                  boolean NOT NULL
--     curation_status              text NOT NULL

-- curation_collab_suggestions
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     mal_id                       integer NOT NULL
--     campo                        text NOT NULL
--     episodio_numero              integer NOT NULL
--     valor_sugerido               text NOT NULL
--     motivo                       text NOT NULL
--     status                       text NOT NULL
--     avaliado_por                 uuid
--     avaliado_em                  timestamp with time zone
--     justificativa_recusa         text NOT NULL
--     cristais_pagos               integer NOT NULL
--     created_at                   timestamp with time zone NOT NULL

-- curation_suggestions
--     id                           bigint NOT NULL
--     mal_id                       bigint NOT NULL
--     titulo                       text NOT NULL
--     imagem_url                   text
--     motivo                       text NOT NULL
--     score                        numeric NOT NULL
--     status                       text NOT NULL
--     created_at                   timestamp with time zone NOT NULL
--     reviewed_at                  timestamp with time zone

-- episode_comments
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     mal_id                       integer NOT NULL
--     episode_number               integer NOT NULL
--     texto                        text NOT NULL
--     momento_seg                  integer
--     oculto                       boolean NOT NULL
--     created_at                   timestamp with time zone NOT NULL
--     editado_em                   timestamp with time zone
--     origem                       text

-- episode_progress
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     mal_id                       integer NOT NULL
--     episode_number               integer NOT NULL
--     watched_at                   timestamp with time zone
--     created_at                   timestamp with time zone

-- episode_reactions
--     user_id                      uuid NOT NULL
--     mal_id                       integer NOT NULL
--     episode_number               integer NOT NULL
--     reacao                       text NOT NULL
--     created_at                   timestamp with time zone NOT NULL

-- favorite_characters
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     character_id                 integer NOT NULL
--     mal_id                       integer NOT NULL
--     nome                         text NOT NULL
--     imagem_url                   text NOT NULL
--     papel                        text NOT NULL
--     criado_em                    timestamp with time zone NOT NULL

-- genre_taxonomy
--     raw_name                     text NOT NULL
--     display_name_pt              text NOT NULL
--     tier                         text NOT NULL

-- liga_participacoes
--     id                           uuid NOT NULL
--     semana                       text NOT NULL
--     user_id                      uuid NOT NULL
--     divisao                      text NOT NULL
--     grupo                        integer NOT NULL
--     xp                           integer NOT NULL
--     posicao                      integer
--     resultado                    text
--     recompensa_anicoins          integer NOT NULL
--     fechado                      boolean NOT NULL
--     criado_em                    timestamp with time zone NOT NULL
--     atualizado_em                timestamp with time zone NOT NULL

-- media_entries
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     mal_id                       integer NOT NULL
--     tipo                         text NOT NULL
--     status                       text NOT NULL
--     nota                         numeric
--     anotacao                     text
--     created_at                   timestamp with time zone NOT NULL
--     updated_at                   timestamp with time zone NOT NULL
--     is_favorite                  boolean

-- notifications
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     mal_id                       integer NOT NULL
--     episode_number               integer NOT NULL
--     read_at                      timestamp with time zone
--     created_at                   timestamp with time zone
--     anime_title                  text
--     anime_image                  text

-- olheiro_tags
--     raw_name                     text NOT NULL
--     peso                         numeric NOT NULL
--     ativo                        boolean NOT NULL

-- previsao_apostas
--     id                           uuid NOT NULL
--     previsao_id                  uuid NOT NULL
--     user_id                      uuid NOT NULL
--     opcao_id                     integer NOT NULL
--     mana_apostada                integer NOT NULL
--     ganhou                       boolean
--     pago                         boolean NOT NULL
--     criado_em                    timestamp with time zone NOT NULL

-- previsoes
--     id                           uuid NOT NULL
--     mal_id                       integer
--     titulo_anime                 text
--     pergunta                     text NOT NULL
--     descricao                    text
--     opcoes                       jsonb NOT NULL
--     limite_apostas               timestamp with time zone NOT NULL
--     status                       text NOT NULL
--     opcao_vencedora_id           integer
--     total_mana_apostada          integer NOT NULL
--     total_apostadores            integer NOT NULL
--     recompensa_anicoins          integer NOT NULL
--     criado_por                   uuid
--     criado_em                    timestamp with time zone NOT NULL
--     resolvido_em                 timestamp with time zone

-- profiles
--     user_id                      uuid NOT NULL
--     handle                       text NOT NULL
--     nome                         text NOT NULL
--     bio                          text NOT NULL
--     vitrine                      ARRAY NOT NULL
--     publico                      boolean NOT NULL
--     mp_atual                     numeric NOT NULL
--     mp_em                        timestamp with time zone NOT NULL
--     descanso_inicio              date
--     descanso_fim                 date
--     created_at                   timestamp with time zone NOT NULL
--     updated_at                   timestamp with time zone NOT NULL
--     apoiador                     boolean NOT NULL
--     avatar_url                   text
--     classe                       text NOT NULL
--     titulo_ativo                 text
--     titulos_desbloqueados        ARRAY
--     avatar_custom                jsonb

-- push_subscriptions
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     endpoint                     text NOT NULL
--     p256dh                       text NOT NULL
--     auth                         text NOT NULL
--     created_at                   timestamp with time zone

-- ranking_current_cache
--     position                     integer NOT NULL
--     mal_id                       integer NOT NULL
--     title                        text NOT NULL
--     image_url                    text
--     bayesian_score               numeric NOT NULL
--     score                        numeric NOT NULL
--     local_votes                  integer NOT NULL
--     local_score                  numeric
--     updated_at                   timestamp with time zone NOT NULL

-- ranking_genero
--     genero                       text NOT NULL
--     posicao                      integer NOT NULL
--     user_id                      uuid NOT NULL
--     handle                       text NOT NULL
--     nome                         text NOT NULL
--     xp_genero                    bigint NOT NULL
--     nivel                        integer NOT NULL
--     rank                         text NOT NULL
--     titulo_rank                  text NOT NULL
--     atualizado_em                timestamp with time zone NOT NULL

-- ranking_snapshots
--     id                           bigint NOT NULL
--     captured_at                  timestamp with time zone NOT NULL
--     mal_id                       bigint NOT NULL
--     position                     integer NOT NULL

-- rpg_batalhas
--     id                           bigint NOT NULL
--     user_id                      uuid NOT NULL
--     monstro_id                   text NOT NULL
--     venceu                       boolean NOT NULL
--     turnos                       integer NOT NULL
--     bilhetes                     integer NOT NULL
--     item_id                      text
--     criado_em                    timestamp with time zone NOT NULL

-- rpg_equipados
--     user_id                      uuid NOT NULL
--     slot                         text NOT NULL
--     item_id                      text NOT NULL
--     equipado_em                  timestamp with time zone NOT NULL

-- rpg_inventario
--     user_id                      uuid NOT NULL
--     item_id                      text NOT NULL
--     quantidade                   integer NOT NULL
--     obtido_em                    timestamp with time zone NOT NULL

-- rpg_invocacoes
--     id                           bigint NOT NULL
--     user_id                      uuid NOT NULL
--     item_id                      text
--     raridade                     text NOT NULL
--     garantida                    boolean NOT NULL
--     criado_em                    timestamp with time zone NOT NULL

-- rpg_itens
--     id                           text NOT NULL
--     slot                         text NOT NULL
--     nome                         text NOT NULL
--     descricao                    text NOT NULL
--     raridade                     text NOT NULL
--     vida                         integer NOT NULL
--     ataque                       integer NOT NULL
--     defesa                       integer NOT NULL
--     nivel_minimo                 integer NOT NULL
--     inicial                      boolean NOT NULL
--     ativo                        boolean NOT NULL
--     ordem                        integer NOT NULL

-- rpg_monstros
--     id                           text NOT NULL
--     nome                         text NOT NULL
--     descricao                    text NOT NULL
--     tipo                         text NOT NULL
--     nivel                        integer NOT NULL
--     vida                         integer NOT NULL
--     ataque                       integer NOT NULL
--     defesa                       integer NOT NULL
--     bilhetes                     integer NOT NULL
--     chance_item                  integer NOT NULL
--     raridade_item                text NOT NULL
--     ativo                        boolean NOT NULL
--     ordem                        integer NOT NULL

-- rpg_personagens
--     user_id                      uuid NOT NULL
--     nome                         text NOT NULL
--     personagem_base              text NOT NULL
--     criado_em                    timestamp with time zone NOT NULL
--     visual_equipado              text

-- rpg_recursos
--     user_id                      uuid NOT NULL
--     bilhetes                     integer NOT NULL
--     invocacoes_sem_epico         integer NOT NULL
--     atualizado_em                timestamp with time zone NOT NULL

-- sala_mensagem_curtidas
--     mensagem_id                  uuid NOT NULL
--     user_id                      uuid NOT NULL
--     created_at                   timestamp with time zone NOT NULL

-- sala_mensagem_denuncias
--     id                           uuid NOT NULL
--     mensagem_id                  uuid NOT NULL
--     denunciante_id               uuid NOT NULL
--     motivo                       text NOT NULL
--     created_at                   timestamp with time zone NOT NULL

-- sala_mensagens
--     id                           uuid NOT NULL
--     sala_id                      uuid NOT NULL
--     user_id                      uuid NOT NULL
--     conteudo                     text NOT NULL
--     curtidas                     integer NOT NULL
--     destaque                     boolean NOT NULL
--     oculto                       boolean NOT NULL
--     created_at                   timestamp with time zone NOT NULL

-- salas_estreia
--     id                           uuid NOT NULL
--     mal_id                       integer NOT NULL
--     episodio                     integer NOT NULL
--     titulo_anime                 text NOT NULL
--     imagem_anime                 text
--     abre_em                      timestamp with time zone NOT NULL
--     fecha_em                     timestamp with time zone NOT NULL
--     encerrada                    boolean NOT NULL
--     created_at                   timestamp with time zone NOT NULL

-- store_items
--     id                           text NOT NULL
--     tipo                         text NOT NULL
--     nome                         text NOT NULL
--     descricao                    text NOT NULL
--     preco                        integer NOT NULL
--     raridade                     text NOT NULL
--     estilo                       text NOT NULL
--     icone                        text NOT NULL
--     ativo                        boolean NOT NULL
--     ordem                        integer NOT NULL
--     created_at                   timestamp with time zone NOT NULL
--     temporada                    integer

-- tarefas_periodicas
--     id                           uuid NOT NULL
--     nome                         text NOT NULL
--     periodo                      text NOT NULL
--     iniciada_em                  timestamp with time zone NOT NULL
--     concluida_em                 timestamp with time zone
--     erro                         text
--     resumo                       text

-- user_blocks
--     blocker_id                   uuid NOT NULL
--     blocked_id                   uuid NOT NULL
--     created_at                   timestamp with time zone NOT NULL

-- user_cards
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     mal_id                       integer NOT NULL
--     raridade                     text NOT NULL
--     is_foil                      boolean NOT NULL
--     estreia                      boolean NOT NULL
--     nota                         numeric NOT NULL
--     obtida_em                    timestamp with time zone NOT NULL

-- user_equipped
--     user_id                      uuid NOT NULL
--     slot                         text NOT NULL
--     item_id                      text NOT NULL
--     equipado_em                  timestamp with time zone NOT NULL

-- user_items
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     item_id                      text NOT NULL
--     adquirido_em                 timestamp with time zone NOT NULL

-- xp_ledger
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     mal_id                       integer NOT NULL
--     episode_number               integer NOT NULL
--     xp_earned                    integer NOT NULL
--     reason                       text NOT NULL
--     earned_at                    timestamp with time zone NOT NULL

-- =============================================================================
-- [2] RLS POR TABELA
-- =============================================================================
-- RLS ligada com 0 policies significa que ninguem le pela API -- e proposital
-- em app_admins (lida pela is_admin(), SECURITY DEFINER), ranking_snapshots e
-- ranking_current_cache (ambas lidas pelo service role).
-- Nao "corrigir" criando policy.
-- =============================================================================

-- ai_curation_queue         | RLS: t     | policies: 1
-- anime_metadata_cache      | RLS: t     | policies: 3
-- app_admins                | RLS: t     | policies: 0
-- app_settings              | RLS: t     | policies: 3
-- chefoes                   | RLS: t     | policies: 2
-- cla_convites              | RLS: t     | policies: 1
-- cla_denuncias             | RLS: t     | policies: 2
-- cla_desafios              | RLS: t     | policies: 1
-- cla_historico_saida       | RLS: t     | policies: 1
-- cla_membros               | RLS: t     | policies: 1
-- cla_temporadas_campeoes   | RLS: t     | policies: 1
-- clas                      | RLS: t     | policies: 1
-- comment_likes             | RLS: t     | policies: 3
-- comment_reports           | RLS: t     | policies: 2
-- convites_membros          | RLS: t     | policies: 1
-- convites_resgatados       | RLS: t     | policies: 1
-- crystal_ledger            | RLS: t     | policies: 2
-- curated_animes            | RLS: t     | policies: 4
-- curation_collab_suggestions | RLS: t     | policies: 2
-- curation_suggestions      | RLS: t     | policies: 1
-- episode_comments          | RLS: t     | policies: 4
-- episode_progress          | RLS: t     | policies: 1
-- episode_reactions         | RLS: t     | policies: 3
-- favorite_characters       | RLS: t     | policies: 2
-- genre_taxonomy            | RLS: t     | policies: 3
-- liga_participacoes        | RLS: t     | policies: 1
-- media_entries             | RLS: t     | policies: 4
-- notifications             | RLS: t     | policies: 2
-- olheiro_tags              | RLS: t     | policies: 1
-- previsao_apostas          | RLS: t     | policies: 1
-- previsoes                 | RLS: t     | policies: 2
-- profiles                  | RLS: t     | policies: 3
-- push_subscriptions        | RLS: t     | policies: 1
-- ranking_current_cache     | RLS: t     | policies: 0
-- ranking_genero            | RLS: t     | policies: 1
-- ranking_snapshots         | RLS: t     | policies: 0
-- rpg_batalhas              | RLS: t     | policies: 1
-- rpg_equipados             | RLS: t     | policies: 1
-- rpg_inventario            | RLS: t     | policies: 1
-- rpg_invocacoes            | RLS: t     | policies: 1
-- rpg_itens                 | RLS: t     | policies: 2
-- rpg_monstros              | RLS: t     | policies: 2
-- rpg_personagens           | RLS: t     | policies: 1
-- rpg_recursos              | RLS: t     | policies: 1
-- sala_mensagem_curtidas    | RLS: t     | policies: 3
-- sala_mensagem_denuncias   | RLS: t     | policies: 1
-- sala_mensagens            | RLS: t     | policies: 2
-- salas_estreia             | RLS: t     | policies: 1
-- store_items               | RLS: t     | policies: 2
-- tarefas_periodicas        | RLS: t     | policies: 0
-- user_blocks               | RLS: t     | policies: 1
-- user_cards                | RLS: t     | policies: 1
-- user_equipped             | RLS: t     | policies: 1
-- user_items                | RLS: t     | policies: 1
-- xp_ledger                 | RLS: t     | policies: 2

-- =============================================================================
-- [3] VIEWS — definicao viva
-- =============================================================================
-- O security_invoker exibido e o valor REAL de cada view no banco. Espera-se
-- "on" em todas desde o sql/017. View nova nasce "off" (default do Postgres).
--
-- NAO copie daqui para editar uma view sem conferir a clausula: o Table Editor
-- do Supabase omite o security_invoker, e colar sem ele devolve a view para
-- security definer em silencio (Armadilha 2 do PITFALLS.md).
-- =============================================================================

CREATE OR REPLACE VIEW public.anime_community_scores WITH (security_invoker = on) AS
 SELECT mal_id,
    count(nota)::integer AS local_votes,
    round(avg(nota), 2)::double precision AS local_score
   FROM media_entries
  WHERE nota IS NOT NULL
  GROUP BY mal_id;

CREATE OR REPLACE VIEW public.view_episode_progress_orphans WITH (security_invoker = on) AS
 SELECT ep.user_id,
    ep.mal_id,
    cur.custom_title,
    ep.episode_number,
    ep.watched_at
   FROM episode_progress ep
     JOIN curated_animes cur ON cur.mal_id = ep.mal_id
  WHERE ep.user_id = auth.uid() AND cur.custom_episodes IS NOT NULL AND NOT (EXISTS ( SELECT 1
           FROM jsonb_array_elements(cur.custom_episodes) e(value)
          WHERE ((e.value ->> 'number'::text)::integer) = ep.episode_number))
  ORDER BY cur.custom_title, ep.episode_number;

CREATE OR REPLACE VIEW public.view_unmapped_labels WITH (security_invoker = on) AS
 WITH fontes AS (
         SELECT c.mal_id,
            COALESCE(cur.custom_tags, COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])) AS tags,
            cur.custom_tags IS NOT NULL AS da_curadoria
           FROM anime_metadata_cache c
             LEFT JOIN curated_animes cur ON cur.mal_id = c.mal_id
        UNION
         SELECT cur.mal_id,
            cur.custom_tags,
            true
           FROM curated_animes cur
          WHERE cur.custom_tags IS NOT NULL
        )
 SELECT r.raw_name,
    count(DISTINCT f.mal_id) AS animes,
    bool_or(f.da_curadoria) AS veio_de_curadoria
   FROM fontes f
     CROSS JOIN LATERAL unnest(f.tags) r(raw_name)
     LEFT JOIN genre_taxonomy t ON t.raw_name = r.raw_name
  WHERE t.raw_name IS NULL
  GROUP BY r.raw_name
  ORDER BY (count(DISTINCT f.mal_id)) DESC;

CREATE OR REPLACE VIEW public.view_unmapped_labels_detalhe WITH (security_invoker = on) AS
 WITH fontes AS (
         SELECT c.mal_id,
            COALESCE(cur.custom_tags, COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])) AS tags,
            cur.custom_tags IS NOT NULL AS da_curadoria,
            COALESCE(cur.custom_title, c.title) AS titulo,
            cur.id AS curated_id
           FROM anime_metadata_cache c
             LEFT JOIN curated_animes cur ON cur.mal_id = c.mal_id
        UNION
         SELECT cur.mal_id,
            cur.custom_tags,
            true,
            cur.custom_title,
            cur.id
           FROM curated_animes cur
          WHERE cur.custom_tags IS NOT NULL
        )
 SELECT r.raw_name,
    f.mal_id,
    f.titulo,
    f.da_curadoria AS veio_de_curadoria,
    f.curated_id
   FROM fontes f
     CROSS JOIN LATERAL unnest(f.tags) r(raw_name)
     LEFT JOIN genre_taxonomy t ON t.raw_name = r.raw_name
  WHERE t.raw_name IS NULL
  ORDER BY r.raw_name, f.titulo;

CREATE OR REPLACE VIEW public.view_user_activity WITH (security_invoker = on) AS
 SELECT user_id,
    date_trunc('week'::text, watched_at)::date AS semana,
    count(*) AS episodios_assistidos
   FROM episode_progress
  WHERE user_id = auth.uid() AND watched_at IS NOT NULL
  GROUP BY user_id, (date_trunc('week'::text, watched_at))
  ORDER BY (date_trunc('week'::text, watched_at)::date);

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

CREATE OR REPLACE VIEW public.view_user_genre_affinity WITH (security_invoker = on) AS
 WITH rotulos_brutos AS (
         SELECT e.user_id,
            e.mal_id,
            e.nota,
            r.raw_name
           FROM media_entries e
             LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
             LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
             CROSS JOIN LATERAL unnest(COALESCE(cur.custom_tags, COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[]))) r(raw_name)
          WHERE e.user_id = auth.uid() AND (e.status = ANY (ARRAY['Completo'::text, 'Em Dia'::text, 'Assistindo'::text]))
        ), rotulos AS (
         SELECT DISTINCT rb.user_id,
            rb.mal_id,
            rb.nota,
            COALESCE(t.display_name_pt, rb.raw_name) AS genre,
            COALESCE(t.tier, 'ignorado'::text) AS tier
           FROM rotulos_brutos rb
             LEFT JOIN genre_taxonomy t ON t.raw_name = rb.raw_name
          WHERE COALESCE(t.tier, 'ignorado'::text) <> 'ignorado'::text
        )
 SELECT user_id,
    genre,
    count(*) AS total_watched,
    round(avg(nota), 1) AS media_nota_genero,
    tier
   FROM rotulos
  GROUP BY user_id, genre, tier
  ORDER BY (count(*)) DESC;

CREATE OR REPLACE VIEW public.view_user_genre_animes WITH (security_invoker = on) AS
 WITH base AS (
         SELECT e.user_id,
            e.mal_id,
            e.nota,
            e.status,
            COALESCE(cur.custom_title, c.title) AS title,
            r.raw_name
           FROM media_entries e
             LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
             LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
             CROSS JOIN LATERAL unnest(COALESCE(cur.custom_tags, COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[]))) r(raw_name)
          WHERE e.user_id = auth.uid() AND (e.status = ANY (ARRAY['Completo'::text, 'Em Dia'::text, 'Assistindo'::text]))
        )
 SELECT DISTINCT b.user_id,
    COALESCE(t.display_name_pt, b.raw_name) AS genre,
    b.mal_id,
    b.title,
    b.nota,
    b.status
   FROM base b
     LEFT JOIN genre_taxonomy t ON t.raw_name = b.raw_name
  WHERE COALESCE(t.tier, 'ignorado'::text) <> 'ignorado'::text;

CREATE OR REPLACE VIEW public.view_user_longest_anime WITH (security_invoker = on) AS
 SELECT e.user_id,
    COALESCE(cur.custom_title, c.title) AS title,
    c.episodes
   FROM media_entries e
     JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
     LEFT JOIN curated_animes cur ON e.mal_id = cur.mal_id
  WHERE e.status = 'Completo'::text AND e.user_id = auth.uid()
  ORDER BY c.episodes DESC NULLS LAST
 LIMIT 1;

CREATE OR REPLACE VIEW public.view_user_rating_distribution WITH (security_invoker = on) AS
 SELECT user_id,
    nota,
    count(*) AS total
   FROM media_entries
  WHERE nota IS NOT NULL AND user_id = auth.uid()
  GROUP BY user_id, nota
  ORDER BY nota;

CREATE OR REPLACE VIEW public.view_user_stats WITH (security_invoker = on) AS
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

CREATE OR REPLACE VIEW public.view_user_top_rated WITH (security_invoker = on) AS
 SELECT e.user_id,
    COALESCE(cur.custom_title, c.title) AS title,
    e.nota
   FROM media_entries e
     LEFT JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
     LEFT JOIN curated_animes cur ON e.mal_id = cur.mal_id
  WHERE e.nota IS NOT NULL AND e.user_id = auth.uid()
  ORDER BY e.nota DESC
 LIMIT 1;

CREATE OR REPLACE VIEW public.view_user_watch_dates WITH (security_invoker = on) AS
 SELECT DISTINCT user_id,
    (watched_at AT TIME ZONE 'America/Sao_Paulo'::text)::date AS dia
   FROM episode_progress
  WHERE user_id = auth.uid() AND watched_at IS NOT NULL
  ORDER BY ((watched_at AT TIME ZONE 'America/Sao_Paulo'::text)::date);

CREATE OR REPLACE VIEW public.view_user_watch_hours WITH (security_invoker = on) AS
 SELECT user_id,
    EXTRACT(hour FROM watched_at)::integer AS hora,
    count(*) AS total
   FROM episode_progress
  WHERE user_id = auth.uid() AND watched_at IS NOT NULL
  GROUP BY user_id, (EXTRACT(hour FROM watched_at))
  ORDER BY (EXTRACT(hour FROM watched_at)::integer);

CREATE OR REPLACE VIEW public.view_user_watch_timestamps WITH (security_invoker = on) AS
 SELECT watched_at
   FROM episode_progress ep
  WHERE user_id = auth.uid() AND watched_at IS NOT NULL
  ORDER BY watched_at;

CREATE OR REPLACE VIEW public.view_user_year_animes WITH (security_invoker = on) AS
 SELECT e.user_id,
    c.season_year,
    e.mal_id,
    COALESCE(cur.custom_title, c.title) AS title,
    e.nota,
    e.status
   FROM media_entries e
     JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
     LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
  WHERE e.user_id = auth.uid() AND c.season_year IS NOT NULL;

CREATE OR REPLACE VIEW public.view_user_year_distribution WITH (security_invoker = on) AS
 SELECT e.user_id,
    c.season_year,
    count(*) AS total
   FROM media_entries e
     JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
  WHERE c.season_year IS NOT NULL AND e.user_id = auth.uid()
  GROUP BY e.user_id, c.season_year
  ORDER BY c.season_year;

-- =============================================================================
-- [4] POLICIES DO SCHEMA public
-- =============================================================================
-- Contar policies nao diz nada: USING (true) e USING (is_admin()) contam
-- igual. O que vale e o predicado abaixo (Armadilha 15 do PITFALLS.md).
-- =============================================================================

-- ai_curation_queue      | ai_curation_queue_admin                       | ALL    | authenticated     
--     USING:  ( SELECT is_admin() AS is_admin)
--     CHECK:  ( SELECT is_admin() AS is_admin)

-- anime_metadata_cache   | Escrita no cache restrita a admin             | INSERT | authenticated     
--     USING:  -
--     CHECK:  ( SELECT is_admin() AS is_admin)

-- anime_metadata_cache   | Leitura pública do cache                      | SELECT | public            
--     USING:  true
--     CHECK:  -

-- anime_metadata_cache   | Atualização no cache restrita a admin         | UPDATE | authenticated     
--     USING:  ( SELECT is_admin() AS is_admin)
--     CHECK:  ( SELECT is_admin() AS is_admin)

-- app_settings           | app_settings_insert_admin                     | INSERT | public            
--     USING:  -
--     CHECK:  is_admin()

-- app_settings           | app_settings_leitura_publica                  | SELECT | public            
--     USING:  true
--     CHECK:  -

-- app_settings           | app_settings_update_admin                     | UPDATE | public            
--     USING:  is_admin()
--     CHECK:  is_admin()

-- chefoes                | chefoes_escrita_admin                         | ALL    | authenticated     
--     USING:  is_admin()
--     CHECK:  is_admin()

-- chefoes                | chefoes_leitura                               | SELECT | anon,authenticated
--     USING:  true
--     CHECK:  -

-- cla_convites           | Usuario ve convites relevantes                | SELECT | public            
--     USING:  ((auth.uid() = convidado_user_id) OR (EXISTS ( SELECT 1
   FROM cla_membros m
  WHERE ((m.cla_id = cla_convites.cla_id) AND (m.user_id = auth.uid())))))
--     CHECK:  -

-- cla_denuncias          | Usuario pode denunciar cla                    | INSERT | public            
--     USING:  -
--     CHECK:  (auth.uid() = denunciante_user_id)

-- cla_denuncias          | Usuario pode ver suas proprias denuncias      | SELECT | public            
--     USING:  (auth.uid() = denunciante_user_id)
--     CHECK:  -

-- cla_desafios           | Qualquer um pode ler desafios de clas         | SELECT | public            
--     USING:  true
--     CHECK:  -

-- cla_historico_saida    | Usuario pode ler seu historico de saida       | SELECT | public            
--     USING:  (auth.uid() = user_id)
--     CHECK:  -

-- cla_membros            | Qualquer um pode ler membros de clas          | SELECT | public            
--     USING:  true
--     CHECK:  -

-- cla_temporadas_campeoes | Qualquer um pode ler campeoes da liga de clas | SELECT | public            
--     USING:  true
--     CHECK:  -

-- clas                   | Qualquer um pode ler clas ativos              | SELECT | public            
--     USING:  ((ativo = true) OR (auth.uid() = criador_id))
--     CHECK:  -

-- comment_likes          | comment_likes_descurte                        | DELETE | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- comment_likes          | comment_likes_curte                           | INSERT | authenticated     
--     USING:  -
--     CHECK:  ((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM episode_comments c
  WHERE ((c.id = comment_likes.comment_id) AND (c.user_id <> ( SELECT auth.uid() AS uid))))))

-- comment_likes          | comment_likes_leitura                         | SELECT | authenticated     
--     USING:  (EXISTS ( SELECT 1
   FROM episode_comments c
  WHERE (c.id = comment_likes.comment_id)))
--     CHECK:  -

-- comment_reports        | comment_reports_denuncia                      | INSERT | authenticated     
--     USING:  -
--     CHECK:  ((( SELECT auth.uid() AS uid) = reporter_id) AND (NOT resolvido) AND (EXISTS ( SELECT 1
   FROM episode_comments c
  WHERE (c.id = comment_reports.comment_id))))

-- comment_reports        | comment_reports_admin                         | SELECT | authenticated     
--     USING:  ( SELECT is_admin() AS is_admin)
--     CHECK:  -

-- convites_membros       | Leitura publica de convites para validacao    | SELECT | authenticated     
--     USING:  true
--     CHECK:  -

-- convites_resgatados    | Membros visualizam seus proprios convites resgatados | SELECT | authenticated     
--     USING:  ((anfitriao_user_id = auth.uid()) OR (convidado_user_id = auth.uid()))
--     CHECK:  -

-- crystal_ledger         | crystal_ledger_admin_select                   | SELECT | authenticated     
--     USING:  ( SELECT is_admin() AS is_admin)
--     CHECK:  -

-- crystal_ledger         | crystal_ledger_user_select                    | SELECT | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- curated_animes         | admin_remove_curadoria                        | DELETE | public            
--     USING:  ( SELECT is_admin() AS is_admin)
--     CHECK:  -

-- curated_animes         | admin_insere_curadoria                        | INSERT | public            
--     USING:  -
--     CHECK:  ( SELECT is_admin() AS is_admin)

-- curated_animes         | Leitura Pública Destaques                     | SELECT | public            
--     USING:  true
--     CHECK:  -

-- curated_animes         | admin_atualiza_curadoria                      | UPDATE | public            
--     USING:  ( SELECT is_admin() AS is_admin)
--     CHECK:  ( SELECT is_admin() AS is_admin)

-- curation_collab_suggestions | curation_collab_insert_propria                | INSERT | authenticated     
--     USING:  -
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- curation_collab_suggestions | curation_collab_select_propria                | SELECT | authenticated     
--     USING:  ((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT is_admin() AS is_admin))
--     CHECK:  -

-- curation_suggestions   | admin_gerencia_sugestoes                      | ALL    | public            
--     USING:  is_admin()
--     CHECK:  is_admin()

-- episode_comments       | episode_comments_remove                       | DELETE | authenticated     
--     USING:  ((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT is_admin() AS is_admin))
--     CHECK:  -

-- episode_comments       | episode_comments_comenta_se_viu               | INSERT | authenticated     
--     USING:  -
--     CHECK:  ((( SELECT auth.uid() AS uid) = user_id) AND (NOT oculto) AND (EXISTS ( SELECT 1
   FROM episode_progress p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.mal_id = episode_comments.mal_id) AND (p.episode_number = episode_comments.episode_number)))))

-- episode_comments       | episode_comments_leitura                      | SELECT | authenticated     
--     USING:  ((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT is_admin() AS is_admin) OR ((NOT oculto) AND (EXISTS ( SELECT 1
   FROM episode_progress p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.mal_id = episode_comments.mal_id) AND (p.episode_number = episode_comments.episode_number))))))
--     CHECK:  -

-- episode_comments       | episode_comments_edita_o_proprio              | UPDATE | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- episode_progress       | Usuarios gerenciam seu proprio progresso de episodios | ALL    | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- episode_reactions      | episode_reactions_remove_propria              | DELETE | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- episode_reactions      | episode_reactions_reage_se_viu                | INSERT | authenticated     
--     USING:  -
--     CHECK:  ((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM episode_progress p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.mal_id = episode_reactions.mal_id) AND (p.episode_number = episode_reactions.episode_number)))))

-- episode_reactions      | episode_reactions_proprias                    | SELECT | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- favorite_characters    | Usuários gerenciam seus próprios personagens favoritos | ALL    | public            
--     USING:  (auth.uid() = user_id)
--     CHECK:  (auth.uid() = user_id)

-- favorite_characters    | Leitura de personagens favoritos públicos ou próprios | SELECT | public            
--     USING:  ((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = favorite_characters.user_id) AND (profiles.publico = true)))))
--     CHECK:  -

-- genre_taxonomy         | admin_remove_taxonomia                        | DELETE | authenticated     
--     USING:  ( SELECT is_admin() AS is_admin)
--     CHECK:  -

-- genre_taxonomy         | admin_insere_taxonomia                        | INSERT | authenticated     
--     USING:  -
--     CHECK:  ( SELECT is_admin() AS is_admin)

-- genre_taxonomy         | Taxonomia é pública para usuários autenticados | SELECT | authenticated     
--     USING:  true
--     CHECK:  -

-- liga_participacoes     | Leitura de participacoes na liga              | SELECT | public            
--     USING:  ((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = liga_participacoes.user_id) AND (profiles.publico = true)))))
--     CHECK:  -

-- media_entries          | Usuários podem deletar suas próprias entradas | DELETE | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- media_entries          | Usuários podem inserir suas próprias entradas | INSERT | public            
--     USING:  -
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- media_entries          | Usuários podem ver suas próprias entradas     | SELECT | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- media_entries          | Usuários podem atualizar suas próprias entradas | UPDATE | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- notifications          | Users view own notifications                  | SELECT | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- notifications          | Users update own notifications                | UPDATE | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- olheiro_tags           | olheiro_tags_admin                            | ALL    | public            
--     USING:  is_admin()
--     CHECK:  is_admin()

-- previsao_apostas       | previsao_apostas_leitura                      | SELECT | authenticated     
--     USING:  ((user_id = ( SELECT auth.uid() AS uid)) OR is_admin())
--     CHECK:  -

-- previsoes              | previsoes_admin                               | ALL    | authenticated     
--     USING:  is_admin()
--     CHECK:  is_admin()

-- previsoes              | previsoes_leitura                             | SELECT | anon,authenticated
--     USING:  true
--     CHECK:  -

-- profiles               | profiles_cria_o_proprio                       | INSERT | authenticated     
--     USING:  -
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- profiles               | profiles_leitura                              | SELECT | anon,authenticated
--     USING:  (publico OR (( SELECT auth.uid() AS uid) = user_id))
--     CHECK:  -

-- profiles               | profiles_edita_o_proprio                      | UPDATE | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- push_subscriptions     | Users manage own subscriptions                | ALL    | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- ranking_genero         | Qualquer um pode ler ranking por genero       | SELECT | public            
--     USING:  true
--     CHECK:  -

-- rpg_batalhas           | rpg_batalhas_le_o_proprio                     | SELECT | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- rpg_equipados          | rpg_equipados_le_o_proprio                    | SELECT | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- rpg_inventario         | rpg_inventario_le_o_proprio                   | SELECT | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- rpg_invocacoes         | rpg_invocacoes_le_o_proprio                   | SELECT | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- rpg_itens              | rpg_itens_escrita_admin                       | ALL    | authenticated     
--     USING:  is_admin()
--     CHECK:  is_admin()

-- rpg_itens              | rpg_itens_leitura                             | SELECT | authenticated     
--     USING:  ((ativo = true) OR is_admin())
--     CHECK:  -

-- rpg_monstros           | rpg_monstros_escrita_admin                    | ALL    | authenticated     
--     USING:  is_admin()
--     CHECK:  is_admin()

-- rpg_monstros           | rpg_monstros_leitura                          | SELECT | authenticated     
--     USING:  ((ativo = true) OR is_admin())
--     CHECK:  -

-- rpg_personagens        | rpg_personagens_le_o_proprio                  | SELECT | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- rpg_recursos           | rpg_recursos_le_o_proprio                     | SELECT | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- sala_mensagem_curtidas | sala_curtidas_remocao                         | DELETE | authenticated     
--     USING:  (user_id = ( SELECT auth.uid() AS uid))
--     CHECK:  -

-- sala_mensagem_curtidas | sala_curtidas_insercao                        | INSERT | authenticated     
--     USING:  -
--     CHECK:  (user_id = ( SELECT auth.uid() AS uid))

-- sala_mensagem_curtidas | sala_curtidas_leitura                         | SELECT | authenticated     
--     USING:  true
--     CHECK:  -

-- sala_mensagem_denuncias | sala_denuncias_insercao                       | INSERT | authenticated     
--     USING:  -
--     CHECK:  (denunciante_id = ( SELECT auth.uid() AS uid))

-- sala_mensagens         | sala_mensagens_insercao                       | INSERT | authenticated     
--     USING:  -
--     CHECK:  ((user_id = ( SELECT auth.uid() AS uid)) AND (NOT oculto) AND (EXISTS ( SELECT 1
   FROM salas_estreia s
  WHERE ((s.id = sala_mensagens.sala_id) AND (now() >= s.abre_em) AND (now() <= s.fecha_em) AND (NOT s.encerrada)))))

-- sala_mensagens         | sala_mensagens_leitura                        | SELECT | anon,authenticated
--     USING:  ((NOT oculto) OR (( SELECT auth.uid() AS uid) = user_id) OR ( SELECT is_admin() AS is_admin))
--     CHECK:  -

-- salas_estreia          | salas_estreia_leitura                         | SELECT | anon,authenticated
--     USING:  true
--     CHECK:  -

-- store_items            | Escrita de itens da loja por admin            | ALL    | authenticated     
--     USING:  is_admin()
--     CHECK:  is_admin()

-- store_items            | Leitura de itens da loja                      | SELECT | public            
--     USING:  ((ativo = true) OR is_admin())
--     CHECK:  -

-- user_blocks            | user_blocks_proprios                          | ALL    | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = blocker_id)
--     CHECK:  (( SELECT auth.uid() AS uid) = blocker_id)

-- user_cards             | Leitura de cartas próprias ou de perfis públicos | SELECT | public            
--     USING:  ((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = user_cards.user_id) AND (profiles.publico = true)))))
--     CHECK:  -

-- user_equipped          | Leitura pública de itens equipados            | SELECT | public            
--     USING:  true
--     CHECK:  -

-- user_items             | Leitura de itens próprios                     | SELECT | authenticated     
--     USING:  ((user_id = auth.uid()) OR is_admin())
--     CHECK:  -

-- xp_ledger              | xp_ledger_user                                | ALL    | authenticated     
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- xp_ledger              | xp_ledger_admin_select                        | SELECT | authenticated     
--     USING:  ( SELECT is_admin() AS is_admin)
--     CHECK:  -

-- =============================================================================
-- [5] POLICIES DO STORAGE (storage.objects)
-- =============================================================================

-- Permitir upload apenas para o Admin           | INSERT | authenticated     
--     USING:  -
--     CHECK:  ((bucket_id = 'curadoria'::text) AND (auth.uid() = '<uuid>'::uuid))

-- Admin lista arquivos da curadoria             | SELECT | authenticated     
--     USING:  ((bucket_id = 'curadoria'::text) AND ( SELECT is_admin() AS is_admin))
--     CHECK:  -

-- =============================================================================
-- [6] BUCKETS
-- =============================================================================
-- Os arquivos do Storage NAO entram no pg_dump. Backup separado via aws s3
-- sync -- ver DECISIONS.md de 01/09/2026.
-- =============================================================================

-- curadoria            | public: t     | limite: sem limite

-- =============================================================================
-- [7] FUNCOES E PERMISSAO DE EXECUCAO
-- =============================================================================
-- definer=true significa que a funcao ignora RLS. Combinada com anon=true, ela
-- e chamavel por qualquer um com a anon key (que vive no bundle publico) --
-- foi assim que o vazamento do sql/018 aconteceu.
--
-- Ao fechar uma funcao, REVOGAR TAMBEM DE PUBLIC: funcao nasce com EXECUTE
-- concedido ao pseudo-papel PUBLIC, e anon/authenticated herdam por ali.
-- REVOKE so de anon e authenticated nao fecha nada.
--
-- is_admin() com anon=true e inofensivo: sem JWT, auth.uid() e NULL e ela
-- devolve false. rls_auto_enable() e event trigger do Supabase, nao e
-- chamavel como funcao comum.
-- =============================================================================

-- admin_dissolver_cla            | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- admin_renomear_cla             | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- admin_revisar_sugestao_curadoria | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- alterar_papel_membro_cla       | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- anideck_wrapped                | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- apostar_previsao               | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- ativar_descanso                | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- atualizar_ranking_genero       | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- calcular_datas_semana          | definer: f     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- calcular_datas_temporada       | definer: f     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- calcular_nivel_usuario         | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- comprar_item                   | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- contagem_conversa              | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- contar_animes_com_tag          | definer: f     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- convidar_membro_cla            | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- creditar_cristais              | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- criar_cla                      | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- debitar_cristais               | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- denunciar_cla                  | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- despertar_personagem           | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- devolver_item                  | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- duelo_de_gosto                 | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- entrar_cla                     | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- equipar_item                   | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- equipar_titulo                 | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- escolher_classe                | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- expulsar_membro_cla            | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- fechar_sala_estreia            | definer: t     | anon: t     | auth: t     | service: t     | sem search_path
-- fechar_semana_desafios_cla     | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- fechar_semana_liga             | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- fechar_temporada_clas          | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- fn_sala_mensagem_curtida_toggle | definer: t     | anon: t     | auth: t     | service: t     | sem search_path
-- fn_sala_mensagens_rate_limit   | definer: t     | anon: t     | auth: t     | service: t     | sem search_path
-- fn_user_genre_affinity         | definer: f     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- garantir_desafio_semanal_cla   | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- gastar_mana_ao_comentar        | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- get_cron_media_entries         | definer: t     | anon: f     | auth: f     | service: t     | search_path=public
-- hook_limite_cadastros          | definer: f     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- is_admin                       | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- limpar_mensagens_antigas_salas | definer: t     | anon: t     | auth: t     | service: t     | sem search_path
-- listar_clas                    | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- listar_demanda_curadoria       | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- listar_previsoes_ativas        | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- listar_temporadas_campeoes_clas | definer: f     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- mana_atual                     | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- meu_desafio_cla_resumo         | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- meu_saldo_cristais             | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- minha_mana                     | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- minha_vitalidade               | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- obter_chefao_atual             | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- obter_cla_detalhe              | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- obter_desafio_semanal_cla      | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- obter_meu_cla                  | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- obter_meu_convite              | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- pagar_recompensas_chefao       | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- pegar_proximo_da_fila_ia       | definer: f     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- perfil_publico                 | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- process_cron_notification      | definer: t     | anon: f     | auth: f     | service: t     | search_path=public
-- processar_carta_anime_completo | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- proteger_handle_reservado      | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- ranking_clas_temporada         | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- ranking_membros                | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- recalcular_raridade_cartas     | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- regra_comunidade               | definer: f     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- remover_tag_curadoria          | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- remover_xp_ao_desmarcar_episodio | definer: f     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- renomear_tag_curadoria         | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- reservar_tarefa_periodica      | definer: f     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- resgatar_codigo_convite        | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- resolver_previsao              | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- responder_convite_cla          | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- rls_auto_enable                | definer: t     | anon: t     | auth: t     | service: t     | search_path=pg_catalog
-- rpg_batalhas_hoje              | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- rpg_chances_invocacao          | definer: f     | anon: t     | auth: t     | service: t     | sem search_path
-- rpg_contar_batalhas_hoje       | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- rpg_equipar_item               | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- rpg_estado_invocacao           | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- rpg_garantir_kit_inicial       | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- rpg_invocar                    | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- rpg_limite_batalhas_dia        | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- rpg_registrar_batalha          | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- sacar_caixa_loja               | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- sair_cla                       | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- saldo_caixa_loja               | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- saldo_cristais_usuario         | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- salvar_avatar_customizado      | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- sincronizar_xp_liga_semana     | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp
-- submeter_sugestao_curadoria    | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- top_reacoes_temporada          | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- total_cristais_em_circulacao   | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- transferir_cristais            | definer: t     | anon: f     | auth: f     | service: t     | search_path=public, pg_temp
-- transferir_lideranca_cla       | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- uso_do_bucket_curadoria        | definer: f     | anon: f     | auth: t     | service: t     | search_path=public, storage, pg_temp
-- validar_limite_personagens_favoritos | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- validar_limite_vitrine         | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- vitalidade_atual               | definer: t     | anon: f     | auth: t     | service: t     | search_path=public, pg_temp

-- =============================================================================
-- FIM DO RETRATO
-- =============================================================================