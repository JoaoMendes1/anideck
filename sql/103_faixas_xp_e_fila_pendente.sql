-- =============================================================================
-- 103 — Três faixas de XP por episódio e fila xp_pendente (#268)
-- =============================================================================
--
-- O que muda:
--   1. app_settings ('guilda_economia') recebe os parâmetros das faixas sem
--      sobrescrever ajustes existentes: fator_maratona (0.30), maratona_limite_eps (6),
--      maratona_janela_min (30), fator_acervo (0.15), teto_pendente_diario (50).
--      (app_settings.value é TEXT: leitura sempre por value::jsonb, nunca #>>.)
--   2. Tabela public.xp_pendente guarda o XP de acervo (15%, 4 XP/ep quando base=25)
--      criado em marcações em lote (watched_at IS NULL: Completo, "marcar todos" ou
--      importação XML do MAL), liberado aos poucos por liberar_xp_pendente().
--   3. Gatilho trg_episode_progress_acervo_pendente (AFTER INSERT em episode_progress
--      com watched_at IS NULL) enfileira automaticamente na xp_pendente, respeitando
--      revisões ativas e o kill switch de gamificação.
--   4. Definição viva de public.remover_xp_ao_desmarcar_episodio() (original no 039):
--      desmarcar episódio passa a remover também a linha pendente em xp_pendente.
--   5. public.liberar_xp_pendente(p_user_id) libera FIFO dentro do menor saldo entre:
--        - teto_pendente_diario - já liberado hoje (Brasília)
--        - teto_diario - XP de episódios ganho hoje (prioridade ao "Ao vivo").
--
-- Pode rodar mais de uma vez.

-- -----------------------------------------------------------------------------
-- 1. Parâmetros das faixas em app_settings ('guilda_economia')
-- -----------------------------------------------------------------------------
INSERT INTO public.app_settings (key, value, updated_at)
VALUES (
  'guilda_economia',
  '{"ativo":true,"xp_base_episodio":25,"bonus_cedo":10,"fator_3_a_5":0.75,"fator_6_mais":0.5,"teto_diario":180,"evento_inicio":"","evento_fim":"","evento_multiplicador":2,"fator_maratona":0.30,"maratona_limite_eps":6,"maratona_janela_min":30,"fator_acervo":0.15,"teto_pendente_diario":50}',
  now()
)
ON CONFLICT (key) DO UPDATE
   SET value = (
         jsonb_build_object(
           'fator_maratona', 0.30,
           'maratona_limite_eps', 6,
           'maratona_janela_min', 30,
           'fator_acervo', 0.15,
           'teto_pendente_diario', 50
         )
         || COALESCE(NULLIF(btrim(public.app_settings.value), ''), '{}')::jsonb
       )::text,
       updated_at = now();

CREATE OR REPLACE FUNCTION public.ler_economia_guilda()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (
      SELECT NULLIF(btrim(value), '')::jsonb
        FROM public.app_settings
       WHERE key = 'guilda_economia'
    ),
    '{}'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION public.ler_economia_guilda() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ler_economia_guilda() TO service_role;

-- -----------------------------------------------------------------------------
-- 2. Fila public.xp_pendente (XP de acervo a liberar)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xp_pendente (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id         integer NOT NULL CHECK (mal_id > 0),
  episode_number integer NOT NULL CHECK (episode_number > 0),
  xp_pendente    integer NOT NULL CHECK (xp_pendente >= 0),
  xp_liberado    integer NOT NULL DEFAULT 0 CHECK (xp_liberado >= 0),
  motivo         text NOT NULL DEFAULT 'acervo · 15% pendente',
  criado_em      timestamptz NOT NULL DEFAULT now(),
  liberado_em    timestamptz,
  UNIQUE (user_id, mal_id, episode_number)
);

CREATE INDEX IF NOT EXISTS xp_pendente_fila_idx
  ON public.xp_pendente (user_id, liberado_em, criado_em, mal_id, episode_number);

ALTER TABLE public.xp_pendente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS xp_pendente_le_o_proprio ON public.xp_pendente;
CREATE POLICY xp_pendente_le_o_proprio ON public.xp_pendente
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

REVOKE INSERT, UPDATE, DELETE ON public.xp_pendente FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.xp_pendente TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.xp_pendente TO service_role;

-- -----------------------------------------------------------------------------
-- 3. Proteção de revisão ativa e enfileiramento de acervo (watched_at IS NULL)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proteger_pendente_em_revisao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.mal_id > 0 AND EXISTS (
    SELECT 1
      FROM public.revisoes r
     WHERE r.user_id = NEW.user_id
       AND r.mal_id = NEW.mal_id
       AND r.ativa = true
  ) THEN
    NEW.xp_pendente := 0;
    NEW.motivo := 'revisão · histórico preservado';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.proteger_pendente_em_revisao() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_xp_pendente_proteger_revisao ON public.xp_pendente;
CREATE TRIGGER trg_xp_pendente_proteger_revisao
  BEFORE INSERT OR UPDATE ON public.xp_pendente
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_pendente_em_revisao();

CREATE OR REPLACE FUNCTION public.enfileirar_xp_pendente_ao_inserir_acervo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cfg          jsonb;
  v_ativo        boolean;
  v_xp_base      integer;
  v_fator_acervo numeric;
  v_xp           integer;
  v_pct          integer;
BEGIN
  IF NEW.watched_at IS NOT NULL OR COALESCE(NEW.mal_id, 0) <= 0 OR COALESCE(NEW.episode_number, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- Episódio já contabilizado no ledger ou em revisão ativa não entra na fila de acervo.
  IF EXISTS (
    SELECT 1
      FROM public.xp_ledger l
     WHERE l.user_id = NEW.user_id
       AND l.mal_id = NEW.mal_id
       AND l.episode_number = NEW.episode_number
  ) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.revisoes r
     WHERE r.user_id = NEW.user_id
       AND r.mal_id = NEW.mal_id
       AND r.ativa = true
  ) THEN
    RETURN NEW;
  END IF;

  v_cfg := public.ler_economia_guilda();
  v_ativo := COALESCE((v_cfg->>'ativo')::boolean, true);
  IF NOT v_ativo THEN
    RETURN NEW;
  END IF;

  v_xp_base := GREATEST(1, COALESCE((v_cfg->>'xp_base_episodio')::integer, 25));
  v_fator_acervo := LEAST(1.0, GREATEST(0.0, COALESCE((v_cfg->>'fator_acervo')::numeric, 0.15)));
  v_xp := GREATEST(0, ROUND(v_xp_base * v_fator_acervo)::integer);
  v_pct := ROUND(v_fator_acervo * 100)::integer;

  IF v_xp <= 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.xp_pendente (user_id, mal_id, episode_number, xp_pendente, motivo)
  VALUES (
    NEW.user_id,
    NEW.mal_id,
    NEW.episode_number,
    v_xp,
    format('acervo · %s%% pendente', v_pct)
  )
  ON CONFLICT (user_id, mal_id, episode_number) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enfileirar_xp_pendente_ao_inserir_acervo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_episode_progress_acervo_pendente ON public.episode_progress;
CREATE TRIGGER trg_episode_progress_acervo_pendente
  AFTER INSERT ON public.episode_progress
  FOR EACH ROW
  WHEN (NEW.watched_at IS NULL)
  EXECUTE FUNCTION public.enfileirar_xp_pendente_ao_inserir_acervo();

-- -----------------------------------------------------------------------------
-- 4. Definição viva: remover_xp_ao_desmarcar_episodio (antes no sql/039)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remover_xp_ao_desmarcar_episodio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.xp_ledger
   WHERE user_id = OLD.user_id
     AND mal_id = OLD.mal_id
     AND episode_number = OLD.episode_number;

  DELETE FROM public.xp_pendente
   WHERE user_id = OLD.user_id
     AND mal_id = OLD.mal_id
     AND episode_number = OLD.episode_number;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_episode_progress_delete_xp ON public.episode_progress;
CREATE TRIGGER trg_episode_progress_delete_xp
  AFTER DELETE ON public.episode_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.remover_xp_ao_desmarcar_episodio();

-- -----------------------------------------------------------------------------
-- 5. Liberação gradual FIFO respeitando teto pendente diário e teto total
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.liberar_xp_pendente(
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cfg            jsonb;
  v_ativo          boolean;
  v_teto_diario    integer;
  v_teto_pendente  integer;
  v_inicio_dia     timestamptz;
  v_uid            uuid;
  v_xp_ep_hoje     integer;
  v_liberado_hoje  integer;
  v_saldo_pendente integer;
  v_saldo_total    integer;
  v_cota           integer;
  v_xp_real        integer;
  v_total_liberado integer := 0;
  v_total_eps      integer := 0;
  v_usuarios       integer := 0;
  r                public.xp_pendente%ROWTYPE;
BEGIN
  v_cfg := public.ler_economia_guilda();
  v_ativo := COALESCE((v_cfg->>'ativo')::boolean, true);
  IF NOT v_ativo THEN
    RETURN jsonb_build_object('usuarios', 0, 'episodios_liberados', 0, 'xp_liberado', 0);
  END IF;

  v_teto_diario := GREATEST(0, COALESCE((v_cfg->>'teto_diario')::integer, 180));
  v_teto_pendente := GREATEST(0, COALESCE((v_cfg->>'teto_pendente_diario')::integer, 50));
  v_inicio_dia := (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo';

  FOR v_uid IN
    SELECT DISTINCT xp.user_id
      FROM public.xp_pendente xp
     WHERE xp.liberado_em IS NULL
       AND (p_user_id IS NULL OR xp.user_id = p_user_id)
     ORDER BY xp.user_id
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext('liberar_xp_pendente:' || v_uid::text));

    SELECT COALESCE(sum(l.xp_earned), 0)::integer INTO v_xp_ep_hoje
      FROM public.xp_ledger l
     WHERE l.user_id = v_uid
       AND l.mal_id > 0
       AND l.earned_at >= v_inicio_dia;

    SELECT COALESCE(sum(p.xp_liberado), 0)::integer INTO v_liberado_hoje
      FROM public.xp_pendente p
     WHERE p.user_id = v_uid
       AND p.liberado_em IS NOT NULL
       AND p.liberado_em >= v_inicio_dia;

    v_saldo_pendente := GREATEST(0, v_teto_pendente - v_liberado_hoje);
    IF v_teto_diario > 0 THEN
      v_saldo_total := GREATEST(0, v_teto_diario - v_xp_ep_hoje);
      v_cota := LEAST(v_saldo_pendente, v_saldo_total);
    ELSE
      v_cota := v_saldo_pendente;
    END IF;

    v_usuarios := v_usuarios + 1;

    FOR r IN
      SELECT *
        FROM public.xp_pendente p
       WHERE p.user_id = v_uid
         AND p.liberado_em IS NULL
       ORDER BY p.criado_em ASC, p.mal_id ASC, p.episode_number ASC
       FOR UPDATE
    LOOP
      -- Se o episódio não está mais marcado, remove o órfão da fila.
      IF NOT EXISTS (
        SELECT 1
          FROM public.episode_progress ep
         WHERE ep.user_id = v_uid
           AND ep.mal_id = r.mal_id
           AND ep.episode_number = r.episode_number
      ) THEN
        DELETE FROM public.xp_pendente WHERE id = r.id;
        CONTINUE;
      END IF;

      -- Se já ganhou XP no ledger ou entrou em revisão ativa, encerra o item sem somar de novo.
      IF EXISTS (
        SELECT 1
          FROM public.xp_ledger l
         WHERE l.user_id = v_uid
           AND l.mal_id = r.mal_id
           AND l.episode_number = r.episode_number
      ) OR EXISTS (
        SELECT 1
          FROM public.revisoes rev
         WHERE rev.user_id = v_uid
           AND rev.mal_id = r.mal_id
           AND rev.ativa = true
      ) THEN
        UPDATE public.xp_pendente
           SET liberado_em = now(),
               xp_liberado = 0
         WHERE id = r.id;
        CONTINUE;
      END IF;

      IF r.xp_pendente <= 0 THEN
        UPDATE public.xp_pendente
           SET liberado_em = now(),
               xp_liberado = 0
         WHERE id = r.id;
        CONTINUE;
      END IF;

      IF r.xp_pendente > v_cota THEN
        EXIT;
      END IF;

      INSERT INTO public.xp_ledger (user_id, mal_id, episode_number, xp_earned, reason, earned_at)
      VALUES (
        v_uid,
        r.mal_id,
        r.episode_number,
        r.xp_pendente,
        'acervo liberado · ' || COALESCE(NULLIF(btrim(regexp_replace(r.motivo, '^acervo\s*·\s*|\s*pendente$', '', 'g')), ''), '15%'),
        now()
      )
      ON CONFLICT (user_id, mal_id, episode_number) DO NOTHING;

      SELECT l.xp_earned INTO v_xp_real
        FROM public.xp_ledger l
       WHERE l.user_id = v_uid
         AND l.mal_id = r.mal_id
         AND l.episode_number = r.episode_number;

      v_xp_real := GREATEST(0, COALESCE(v_xp_real, 0));

      UPDATE public.xp_pendente
         SET liberado_em = now(),
             xp_liberado = v_xp_real
       WHERE id = r.id;

      v_cota := GREATEST(0, v_cota - v_xp_real);
      v_total_liberado := v_total_liberado + v_xp_real;
      v_total_eps := v_total_eps + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'usuarios', v_usuarios,
    'episodios_liberados', v_total_eps,
    'xp_liberado', v_total_liberado
  );
END;
$$;

REVOKE ALL ON FUNCTION public.liberar_xp_pendente(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.liberar_xp_pendente(uuid) TO service_role;
