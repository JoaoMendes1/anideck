// client/src/sql/bancoDeTeste.ts
// Banco PostgreSQL em memória (PGlite) com os tipos exatos de sql/snapshot_schema.sql
// para testar triggers e funções SQL antes e depois das amarras da Fase 18.8.
import { PGlite } from '@electric-sql/pglite'

import sql039 from '../../../sql/039_guilda_xp_ledger.sql?raw'
import sql041 from '../../../sql/041_comunidade_base.sql?raw'
import sql045 from '../../../sql/045_cristais_economia.sql?raw'
import sql048 from '../../../sql/048_vitalidade_sql_bonus.sql?raw'
import sql050 from '../../../sql/050_cartas_colecao.sql?raw'
import sql058 from '../../../sql/058_chefao_temporada.sql?raw'
import sql087 from '../../../sql/087_missoes_com_xp.sql?raw'
import sql095 from '../../../sql/095_convite_titulo.sql?raw'
import sql096 from '../../../sql/096_fundar_cla_custo.sql?raw'
import sql098 from '../../../sql/098_seguir_e_atividade.sql?raw'
import sql099 from '../../../sql/099_titulo_so_por_funcao.sql?raw'
import sql101 from '../../../sql/101_missoes_evidencias_e_reavaliacao.sql?raw'
import sql102 from '../../../sql/102_revisoes_e_saida_completo.sql?raw'
import sql103 from '../../../sql/103_faixas_xp_e_fila_pendente.sql?raw'
import sql104 from '../../../sql/104_estornos_e_remarcacao.sql?raw'
import sql105 from '../../../sql/105_feed_consistencia_e_limpeza.sql?raw'
import sql106 from '../../../sql/106_numeros_anime_e_em_alta.sql?raw'
import sql107 from '../../../sql/107_unificar_nome_exibicao.sql?raw'
import sql108 from '../../../sql/108_protecao_spoiler.sql?raw'
import sql109 from '../../../sql/109_avaliacoes_e_missoes_avaliacao.sql?raw'
import sql110 from '../../../sql/110_inicio_personalizavel.sql?raw'

export type EtapaAmarras = '098' | '101' | '102' | '103' | '104' | '105' | '106' | '107' | '108' | '109' | '110'

export interface OpcoesBancoTeste {
  etapas?: EtapaAmarras[]
  scriptsExtras?: string[]
}

const ETAPAS_ATIVAS_PADRAO: EtapaAmarras[] = ['098', '101', '102', '103', '104', '105', '106', '107', '108', '109', '110']

const PRE_BASE_SQL = `
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id                 uuid PRIMARY KEY,
  email              text,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_admins WHERE user_id = auth.uid()
  );
$$;

-- app_settings.value é TEXT no banco (Armadilha 37 / snapshot_schema.sql)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anime_metadata_cache (
  mal_id           integer PRIMARY KEY,
  title            text,
  episodes         integer,
  duration_minutes integer,
  genres           text[],
  studios          text[],
  average_score    numeric,
  season_year      integer,
  last_updated     timestamptz,
  tags             text[]
);

CREATE TABLE IF NOT EXISTS public.curated_animes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mal_id                  integer NOT NULL UNIQUE,
  custom_title            text NOT NULL DEFAULT '',
  custom_synopsis         text,
  custom_format           text,
  custom_status           text,
  custom_tags             text[],
  order_index             integer,
  created_at              timestamptz DEFAULT now(),
  custom_cover_image      text,
  custom_banner_image     text,
  custom_characters       jsonb,
  custom_episodes         jsonb,
  custom_external_links   jsonb,
  custom_first_aired_at   timestamptz,
  custom_duration_minutes integer,
  is_destaque             boolean NOT NULL DEFAULT false,
  curation_status         text NOT NULL DEFAULT 'published'
);

CREATE TABLE IF NOT EXISTS public.genre_taxonomy (
  raw_name        text PRIMARY KEY,
  display_name_pt text NOT NULL,
  tier            text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.media_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id      integer NOT NULL,
  tipo        text NOT NULL DEFAULT 'anime',
  status      text NOT NULL,
  nota        numeric,
  anotacao    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  is_favorite boolean DEFAULT false,
  UNIQUE (user_id, mal_id)
);

CREATE TABLE IF NOT EXISTS public.episode_progress (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id         integer NOT NULL,
  episode_number integer NOT NULL,
  watched_at     timestamptz DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mal_id, episode_number)
);
`

const POS_BASES_SQL = `
CREATE OR REPLACE FUNCTION public.calcular_nivel_usuario(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_xp_total bigint;
  v_nivel integer := 1;
  v_custo integer;
BEGIN
  SELECT COALESCE(sum(xp_earned), 0) INTO v_xp_total
    FROM public.xp_ledger
   WHERE user_id = p_user_id;

  WHILE v_xp_total > 0 LOOP
    v_custo := 100 + (v_nivel - 1) * 30;
    IF v_xp_total < v_custo THEN
      EXIT;
    END IF;
    v_xp_total := v_xp_total - v_custo;
    v_nivel := v_nivel + 1;
  END LOOP;

  RETURN v_nivel;
END;
$$;

-- Colunas adicionais em profiles (sql/061, sql/065, snapshot_schema.sql)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS classe text NOT NULL DEFAULT 'bardo' CHECK (classe IN ('bardo', 'ranger', 'paladino')),
  ADD COLUMN IF NOT EXISTS titulo_ativo text DEFAULT 'Aventureiro Iniciante',
  ADD COLUMN IF NOT EXISTS titulos_desbloqueados text[] DEFAULT ARRAY['Aventureiro Iniciante'],
  ADD COLUMN IF NOT EXISTS avatar_custom jsonb DEFAULT NULL;

GRANT UPDATE (classe, titulo_ativo, updated_at) ON public.profiles TO authenticated;

-- Tabelas mínimas de clãs referenciadas pelo sql/096 (criar_cla)
CREATE TABLE IF NOT EXISTS public.clas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text NOT NULL UNIQUE,
  tag          varchar(4) NOT NULL UNIQUE,
  descricao    text NOT NULL DEFAULT '',
  emblema      text NOT NULL DEFAULT 'padrao',
  tipo         text NOT NULL DEFAULT 'aberto',
  nivel_minimo integer NOT NULL DEFAULT 1,
  criador_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ativo        boolean NOT NULL DEFAULT true,
  criado_em    timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cla_membros (
  cla_id    uuid NOT NULL REFERENCES public.clas(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  papel     text NOT NULL DEFAULT 'membro',
  entrou_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cla_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.cla_historico_saida (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  saiu_em timestamptz NOT NULL DEFAULT now()
);

-- Tabelas de convites (sql/062)
INSERT INTO public.app_settings (key, value)
VALUES (
  'regras_convites',
  '{"anicoins_anfitriao":50,"xp_anfitriao":100,"anicoins_convidado":30,"anicoins_convidado_admin":100,"titulo_convidado_admin":"Afilhado do Fundador"}'
)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.convites_membros (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anfitriao_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo          text NOT NULL UNIQUE,
  especial_admin  boolean NOT NULL DEFAULT false,
  usos_total      integer NOT NULL DEFAULT 0,
  anicoins_ganhos integer NOT NULL DEFAULT 0,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.convites_resgatados (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  convite_id                    uuid NOT NULL REFERENCES public.convites_membros(id) ON DELETE CASCADE,
  anfitriao_user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  convidado_user_id             uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  recompensa_anfitriao_anicoins integer NOT NULL DEFAULT 0,
  recompensa_anfitriao_xp       integer NOT NULL DEFAULT 0,
  recompensa_convidado_anicoins integer NOT NULL DEFAULT 0,
  titulo_concedido              text,
  especial_admin                boolean NOT NULL DEFAULT false,
  resgatado_em                  timestamptz NOT NULL DEFAULT now()
);

-- Subconjunto do RPG usado pelo gatilho de xp_ledger (sql/081)
CREATE TABLE IF NOT EXISTS public.rpg_recursos (
  user_id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bilhetes                integer NOT NULL DEFAULT 0,
  invocacoes_sem_epico    integer NOT NULL DEFAULT 0,
  atualizado_em           timestamptz NOT NULL DEFAULT now(),
  vida_perdida            integer NOT NULL DEFAULT 0,
  vida_em                 timestamptz NOT NULL DEFAULT now(),
  ouro                    integer NOT NULL DEFAULT 0,
  pousada_em              timestamptz,
  invocacoes_sem_raro     integer NOT NULL DEFAULT 0,
  invocacoes_sem_lendario integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.rpg_recuperacoes (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origem     text NOT NULL,
  vida       integer NOT NULL DEFAULT 0,
  ouro_gasto integer NOT NULL DEFAULT 0,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, origem)
);
`

export async function criarBancoTeste(opcoes: OpcoesBancoTeste = {}): Promise<PGlite> {
  const db = new PGlite()
  await db.exec(PRE_BASE_SQL)
  await db.exec(sql039)
  await db.exec(sql041)
  await db.exec(sql045)
  await db.exec(sql048)
  await db.exec(sql050)
  await db.exec(sql058)
  await db.exec(POS_BASES_SQL)
  await db.exec(sql087)
  await db.exec(sql095)
  await db.exec(sql096)
  await db.exec(sql099)

  const etapas = new Set<EtapaAmarras>(opcoes.etapas ?? ETAPAS_ATIVAS_PADRAO)
  if (etapas.has('098')) {
    await db.exec(sql098)
  }
  if (etapas.has('101')) {
    await db.exec(sql101)
  }
  if (etapas.has('102')) {
    await db.exec(sql102)
  }
  if (etapas.has('103')) {
    await db.exec(sql103)
  }
  if (etapas.has('104')) {
    await db.exec(sql104)
  }
  if (etapas.has('105')) {
    await db.exec(sql105)
  }
  if (etapas.has('106')) {
    await db.exec(sql106)
  }
  if (etapas.has('107')) {
    await db.exec(sql107)
  }
  if (etapas.has('108')) {
    await db.exec(sql108)
  }
  if (etapas.has('109')) {
    await db.exec(sql109)
  }
  if (etapas.has('110')) {
    await db.exec(sql110)
  }

  for (const extra of opcoes.scriptsExtras ?? []) {
    await db.exec(extra)
  }

  return db
}

export async function autenticarComo(db: PGlite, userId: string): Promise<void> {
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [userId])
}

export async function criarUsuarioTeste(
  db: PGlite,
  userId: string,
  handle: string,
  nome = 'Aventureiro Teste',
): Promise<void> {
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
    userId,
    `${handle}@teste.local`,
  ])
  await db.query(
    `INSERT INTO public.profiles (user_id, handle, nome) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING`,
    [userId, handle, nome],
  )
}

export async function lerXPTotalUsuario(db: PGlite, userId: string): Promise<number> {
  const res = await db.query<{ total: string | number }>(
    `SELECT COALESCE(SUM(xp_earned), 0)::bigint AS total FROM public.xp_ledger WHERE user_id = $1`,
    [userId],
  )
  return Number(res.rows[0]?.total ?? 0)
}

export async function lerNivelUsuario(db: PGlite, userId: string): Promise<number> {
  const res = await db.query<{ nivel: number }>(
    `SELECT public.calcular_nivel_usuario($1) AS nivel`,
    [userId],
  )
  return Number(res.rows[0]?.nivel ?? 1)
}
