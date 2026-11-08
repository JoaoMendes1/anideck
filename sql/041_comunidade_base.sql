-- =============================================================================
-- 041_comunidade_base.sql
-- Fase 15 (docs/VISAO_COMUNIDADE.md): perfil público, reações e comentários por
-- episódio com escudo de spoiler, moderação, Mana (MP) e ranking de membros.
--
-- Regras que o banco garante sozinho, mesmo se o código errar:
--   * Comentário de um episódio só é lido por quem marcou aquele episódio
--     (ou pelo autor, ou por admin). Quem não marcou recebe só a contagem, pela
--     função contagem_conversa.
--   * Reagir e comentar exigem ter marcado o episódio.
--   * Comentar gasta Mana (MP) na mesma transação do INSERT; sem Mana, o
--     comentário não entra. A Mana não é editável pelo usuário: as colunas
--     mp_atual e mp_em não recebem GRANT de UPDATE.
--
-- Pode ser aplicado antes do código: nada aqui altera tabela existente.
-- =============================================================================

-- =============================================================================
-- 1. Regras editáveis no Painel Admin (Comunidade › Moderação)
-- =============================================================================
INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('comunidade_regras',
        '{"mp_max":50,"mp_regen_dia":20,"mp_custo_comentario":5,"hp_janela_dias":14,"hp_dias_para_cheio":10,"hp_piso":20,"descanso_max_dias":14}',
        now())
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.regra_comunidade(p_chave text, p_padrao numeric)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT (value::jsonb ->> p_chave)::numeric FROM public.app_settings WHERE key = 'comunidade_regras'),
    p_padrao
  );
$$;

-- =============================================================================
-- 2. Perfil público
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle          TEXT NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9_]{3,20}$'),
  nome            TEXT NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 1 AND 40),
  bio             TEXT NOT NULL DEFAULT '' CHECK (char_length(bio) <= 160),
  vitrine         INTEGER[] NOT NULL DEFAULT '{}' CHECK (cardinality(vitrine) <= 5),
  publico         BOOLEAN NOT NULL DEFAULT true,
  mp_atual        NUMERIC NOT NULL DEFAULT 50,
  mp_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  descanso_inicio DATE,
  descanso_fim    DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_leitura ON public.profiles;
CREATE POLICY profiles_leitura ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (publico OR (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS profiles_cria_o_proprio ON public.profiles;
CREATE POLICY profiles_cria_o_proprio ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS profiles_edita_o_proprio ON public.profiles;
CREATE POLICY profiles_edita_o_proprio ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Mana e Modo Descanso só mudam pelas funções abaixo: sem GRANT nessas colunas.
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT INSERT (user_id, handle, nome, bio, vitrine, publico) ON public.profiles TO authenticated;
GRANT UPDATE (handle, nome, bio, vitrine, publico, updated_at) ON public.profiles TO authenticated;

-- =============================================================================
-- 3. Reações de um toque por episódio
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.episode_reactions (
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id         INTEGER NOT NULL CHECK (mal_id > 0),
  episode_number INTEGER NOT NULL CHECK (episode_number > 0),
  reacao         TEXT NOT NULL CHECK (reacao IN ('chorei', 'plot_twist', 'animacao', 'engracado', 'tenso', 'enrolacao')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mal_id, episode_number, reacao)
);

CREATE INDEX IF NOT EXISTS episode_reactions_episodio_idx
  ON public.episode_reactions (mal_id, episode_number);

ALTER TABLE public.episode_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS episode_reactions_proprias ON public.episode_reactions;
CREATE POLICY episode_reactions_proprias ON public.episode_reactions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS episode_reactions_reage_se_viu ON public.episode_reactions;
CREATE POLICY episode_reactions_reage_se_viu ON public.episode_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.episode_progress p
       WHERE p.user_id = (SELECT auth.uid())
         AND p.mal_id = episode_reactions.mal_id
         AND p.episode_number = episode_reactions.episode_number
    )
  );

DROP POLICY IF EXISTS episode_reactions_remove_propria ON public.episode_reactions;
CREATE POLICY episode_reactions_remove_propria ON public.episode_reactions
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- 4. Comentários por episódio
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.episode_comments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id         INTEGER NOT NULL CHECK (mal_id > 0),
  episode_number INTEGER NOT NULL CHECK (episode_number > 0),
  texto          TEXT NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 1 AND 1000),
  momento_seg    INTEGER CHECK (momento_seg IS NULL OR momento_seg BETWEEN 0 AND 10800),
  oculto         BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  editado_em     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS episode_comments_episodio_idx
  ON public.episode_comments (mal_id, episode_number, created_at DESC);

ALTER TABLE public.episode_comments ENABLE ROW LEVEL SECURITY;

-- O escudo de spoiler: só lê quem marcou o episódio. Comentário oculto pela
-- moderação continua visível ao autor e ao admin.
DROP POLICY IF EXISTS episode_comments_leitura ON public.episode_comments;
CREATE POLICY episode_comments_leitura ON public.episode_comments
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.is_admin())
    OR (
      NOT oculto
      AND EXISTS (
        SELECT 1 FROM public.episode_progress p
         WHERE p.user_id = (SELECT auth.uid())
           AND p.mal_id = episode_comments.mal_id
           AND p.episode_number = episode_comments.episode_number
      )
    )
  );

DROP POLICY IF EXISTS episode_comments_comenta_se_viu ON public.episode_comments;
CREATE POLICY episode_comments_comenta_se_viu ON public.episode_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND NOT oculto
    AND EXISTS (
      SELECT 1 FROM public.episode_progress p
       WHERE p.user_id = (SELECT auth.uid())
         AND p.mal_id = episode_comments.mal_id
         AND p.episode_number = episode_comments.episode_number
    )
  );

DROP POLICY IF EXISTS episode_comments_edita_o_proprio ON public.episode_comments;
CREATE POLICY episode_comments_edita_o_proprio ON public.episode_comments
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS episode_comments_remove ON public.episode_comments;
CREATE POLICY episode_comments_remove ON public.episode_comments
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

-- O autor edita só o texto; ocultar é da moderação (feita com service role).
REVOKE UPDATE ON public.episode_comments FROM anon, authenticated;
GRANT UPDATE (texto, editado_em) ON public.episode_comments TO authenticated;

-- =============================================================================
-- 5. Mana (MP): recarga contínua e gasto atômico no INSERT do comentário
-- =============================================================================
CREATE OR REPLACE FUNCTION public.mana_atual(p_user uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT LEAST(
    public.regra_comunidade('mp_max', 50),
    p.mp_atual + public.regra_comunidade('mp_regen_dia', 20)
                 * EXTRACT(EPOCH FROM (now() - p.mp_em)) / 86400.0
  )
  FROM public.profiles p
  WHERE p.user_id = p_user;
$$;

REVOKE EXECUTE ON FUNCTION public.mana_atual(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.gastar_mana_ao_comentar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_custo numeric := public.regra_comunidade('mp_custo_comentario', 5);
  v_mana  numeric;
BEGIN
  SELECT public.mana_atual(NEW.user_id) INTO v_mana;
  IF v_mana IS NULL THEN
    RAISE EXCEPTION 'perfil_necessario' USING ERRCODE = 'P0001';
  END IF;
  IF v_mana < v_custo THEN
    RAISE EXCEPTION 'mana_insuficiente' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.profiles
     SET mp_atual = v_mana - v_custo,
         mp_em = now()
   WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_episode_comments_mana ON public.episode_comments;
CREATE TRIGGER trg_episode_comments_mana
  BEFORE INSERT ON public.episode_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.gastar_mana_ao_comentar();

-- Leitura da própria Mana, para a tela.
CREATE OR REPLACE FUNCTION public.minha_mana()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.mana_atual(auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.minha_mana() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.minha_mana() TO authenticated;

-- =============================================================================
-- 6. Modo Descanso: congela a Vitalidade (HP) por até descanso_max_dias
-- =============================================================================
CREATE OR REPLACE FUNCTION public.ativar_descanso(p_dias integer)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_max  integer := public.regra_comunidade('descanso_max_dias', 14)::integer;
  v_fim_anterior date;
BEGIN
  IF p_dias IS NULL OR p_dias < 1 OR p_dias > v_max THEN
    RAISE EXCEPTION 'descanso_fora_do_limite' USING ERRCODE = 'P0001';
  END IF;

  SELECT descanso_fim INTO v_fim_anterior FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'perfil_necessario' USING ERRCODE = 'P0001';
  END IF;
  -- Um descanso a cada 30 dias, contados do fim do anterior.
  IF v_fim_anterior IS NOT NULL AND v_fim_anterior > v_hoje - 30 THEN
    RAISE EXCEPTION 'descanso_recente' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.profiles
     SET descanso_inicio = v_hoje,
         descanso_fim = v_hoje + (p_dias - 1)
   WHERE user_id = auth.uid();
  RETURN v_hoje + (p_dias - 1);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ativar_descanso(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ativar_descanso(integer) TO authenticated;

-- =============================================================================
-- 7. Curtidas, denúncias e bloqueios
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID NOT NULL REFERENCES public.episode_comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- A contagem de curtidas de um comentário visível é pública entre quem pode lê-lo.
DROP POLICY IF EXISTS comment_likes_leitura ON public.comment_likes;
CREATE POLICY comment_likes_leitura ON public.comment_likes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.episode_comments c WHERE c.id = comment_likes.comment_id));

DROP POLICY IF EXISTS comment_likes_curte ON public.comment_likes;
CREATE POLICY comment_likes_curte ON public.comment_likes
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.episode_comments c WHERE c.id = comment_likes.comment_id AND c.user_id <> (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS comment_likes_descurte ON public.comment_likes;
CREATE POLICY comment_likes_descurte ON public.comment_likes
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.comment_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  UUID NOT NULL REFERENCES public.episode_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  motivo      TEXT NOT NULL CHECK (motivo IN ('spoiler', 'ofensa', 'spam', 'outro')),
  detalhe     TEXT NOT NULL DEFAULT '' CHECK (char_length(detalhe) <= 300),
  resolvido   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, reporter_id)
);

ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comment_reports_denuncia ON public.comment_reports;
CREATE POLICY comment_reports_denuncia ON public.comment_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = reporter_id
    AND NOT resolvido
    AND EXISTS (SELECT 1 FROM public.episode_comments c WHERE c.id = comment_reports.comment_id)
  );

DROP POLICY IF EXISTS comment_reports_admin ON public.comment_reports;
CREATE POLICY comment_reports_admin ON public.comment_reports
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_blocks_proprios ON public.user_blocks;
CREATE POLICY user_blocks_proprios ON public.user_blocks
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = blocker_id)
  WITH CHECK ((SELECT auth.uid()) = blocker_id);

-- =============================================================================
-- 8. Contagens públicas da conversa de um anime (sem conteúdo)
--    É o que quem ainda não assistiu enxerga: quantos comentários e reações
--    existem em cada episódio.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.contagem_conversa(p_mal_id integer)
RETURNS TABLE (episode_number integer, comentarios bigint, reacoes jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH eps AS (
    SELECT episode_number FROM public.episode_comments WHERE mal_id = p_mal_id AND NOT oculto
    UNION
    SELECT episode_number FROM public.episode_reactions WHERE mal_id = p_mal_id
  )
  SELECT e.episode_number,
         (SELECT count(*) FROM public.episode_comments c
           WHERE c.mal_id = p_mal_id AND c.episode_number = e.episode_number AND NOT c.oculto),
         COALESCE((SELECT jsonb_object_agg(r.reacao, r.total) FROM (
                     SELECT reacao, count(*) AS total FROM public.episode_reactions
                      WHERE mal_id = p_mal_id AND episode_number = e.episode_number
                      GROUP BY reacao) r), '{}'::jsonb)
  FROM eps e
  ORDER BY e.episode_number;
$$;

REVOKE EXECUTE ON FUNCTION public.contagem_conversa(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contagem_conversa(integer) TO anon, authenticated;

-- =============================================================================
-- 9. Ranking de membros (só perfis públicos) e perfil público por @
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
    'descanso_fim', p.descanso_fim
  )
  FROM public.profiles p
  WHERE p.handle = lower(p_handle) AND p.publico;
$$;

REVOKE EXECUTE ON FUNCTION public.perfil_publico(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.perfil_publico(text) TO anon, authenticated;

-- =============================================================================
-- Conferência (rodar depois de aplicar)
-- =============================================================================
-- SELECT relname, relrowsecurity FROM pg_class
--  WHERE relname IN ('profiles','episode_reactions','episode_comments','comment_likes','comment_reports','user_blocks');
--                                                                   -- todas com t
-- SELECT value FROM public.app_settings WHERE key = 'comunidade_regras';  -- JSON com mp_max
-- SELECT * FROM public.ranking_membros('geral', 5);                       -- vazio até haver perfis
