-- =============================================================================
-- 104 — Tabela public.estornos e trava de remarcação em 7 dias (#269)
-- =============================================================================
--
-- O que muda:
--   1. Tabela public.estornos registra quanto cada episódio (user_id, mal_id,
--      episode_number) tinha rendido antes de ser desmarcado (via xp_ledger ou
--      xp_pendente ainda não liberado).
--   2. Definição viva de public.remover_xp_ao_desmarcar_episodio() (antes nos
--      sql/039 e sql/103): grava/atualiza o estorno antes de apagar xp_ledger e
--      xp_pendente. Se um estorno ativo (<= 7 dias) já existia, mantém o menor
--      valor para impedir que ciclos repetidos melhorem o XP.
--   3. Gatilhos trg_xp_ledger_trava_remarcacao e trg_xp_pendente_trava_remarcacao
--      (BEFORE INSERT OR UPDATE): se o mesmo episódio for remarcado em até 7
--      dias, trava o XP no máximo no valor original gravado em estornos.
--
-- Pode rodar mais de uma vez.

-- -----------------------------------------------------------------------------
-- 1. Tabela public.estornos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estornos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id             integer NOT NULL CHECK (mal_id > 0),
  episode_number     integer NOT NULL CHECK (episode_number > 0),
  xp_original        integer NOT NULL CHECK (xp_original >= 0),
  motivo_original    text NOT NULL DEFAULT '',
  earned_at_original timestamptz,
  estornado_em       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mal_id, episode_number)
);

CREATE INDEX IF NOT EXISTS estornos_user_janela_idx
  ON public.estornos (user_id, mal_id, episode_number, estornado_em DESC);

ALTER TABLE public.estornos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estornos_le_o_proprio ON public.estornos;
CREATE POLICY estornos_le_o_proprio ON public.estornos
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

REVOKE INSERT, UPDATE, DELETE ON public.estornos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.estornos TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.estornos TO service_role;

-- -----------------------------------------------------------------------------
-- 2. Definição viva: remover_xp_ao_desmarcar_episodio (antes nos 039 e 103)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remover_xp_ao_desmarcar_episodio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_xp_orig     integer;
  v_motivo_orig text;
  v_data_orig   timestamptz;
  v_encontrou   boolean := false;
BEGIN
  IF COALESCE(OLD.mal_id, 0) > 0 AND COALESCE(OLD.episode_number, 0) > 0 THEN
    SELECT l.xp_earned, l.reason, l.earned_at
      INTO v_xp_orig, v_motivo_orig, v_data_orig
      FROM public.xp_ledger l
     WHERE l.user_id = OLD.user_id
       AND l.mal_id = OLD.mal_id
       AND l.episode_number = OLD.episode_number
     LIMIT 1;

    IF FOUND THEN
      v_encontrou := true;
    ELSE
      SELECT p.xp_pendente, p.motivo, p.criado_em
        INTO v_xp_orig, v_motivo_orig, v_data_orig
        FROM public.xp_pendente p
       WHERE p.user_id = OLD.user_id
         AND p.mal_id = OLD.mal_id
         AND p.episode_number = OLD.episode_number
       LIMIT 1;
      IF FOUND THEN
        v_encontrou := true;
      END IF;
    END IF;

    IF v_encontrou THEN
      INSERT INTO public.estornos (
        user_id, mal_id, episode_number,
        xp_original, motivo_original, earned_at_original, estornado_em
      )
      VALUES (
        OLD.user_id, OLD.mal_id, OLD.episode_number,
        GREATEST(0, COALESCE(v_xp_orig, 0)),
        COALESCE(v_motivo_orig, ''),
        v_data_orig,
        now()
      )
      ON CONFLICT (user_id, mal_id, episode_number) DO UPDATE
         SET xp_original = CASE
               WHEN public.estornos.estornado_em >= now() - interval '7 days'
               THEN LEAST(public.estornos.xp_original, EXCLUDED.xp_original)
               ELSE EXCLUDED.xp_original
             END,
             motivo_original    = EXCLUDED.motivo_original,
             earned_at_original = EXCLUDED.earned_at_original,
             estornado_em       = now();
    END IF;
  END IF;

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
-- 3. Trava de 7 dias ao remarcar episódio em xp_ledger e xp_pendente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trava_remarcacao_estorno()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_xp_max integer;
BEGIN
  IF COALESCE(NEW.mal_id, 0) <= 0 OR COALESCE(NEW.episode_number, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT e.xp_original INTO v_xp_max
    FROM public.estornos e
   WHERE e.user_id = NEW.user_id
     AND e.mal_id = NEW.mal_id
     AND e.episode_number = NEW.episode_number
     AND e.estornado_em >= now() - interval '7 days'
   LIMIT 1;

  IF FOUND AND v_xp_max < NEW.xp_earned THEN
    NEW.xp_earned := GREATEST(0, v_xp_max);
    NEW.reason := 'remarcação · limite original';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trava_remarcacao_estorno() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_xp_ledger_trava_remarcacao ON public.xp_ledger;
CREATE TRIGGER trg_xp_ledger_trava_remarcacao
  BEFORE INSERT OR UPDATE ON public.xp_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.trava_remarcacao_estorno();

CREATE OR REPLACE FUNCTION public.trava_pendente_estorno()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_xp_max integer;
BEGIN
  IF COALESCE(NEW.mal_id, 0) <= 0 OR COALESCE(NEW.episode_number, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT e.xp_original INTO v_xp_max
    FROM public.estornos e
   WHERE e.user_id = NEW.user_id
     AND e.mal_id = NEW.mal_id
     AND e.episode_number = NEW.episode_number
     AND e.estornado_em >= now() - interval '7 days'
   LIMIT 1;

  IF FOUND AND v_xp_max < NEW.xp_pendente THEN
    NEW.xp_pendente := GREATEST(0, v_xp_max);
    NEW.motivo := 'remarcação · limite original';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trava_pendente_estorno() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_xp_pendente_trava_remarcacao ON public.xp_pendente;
CREATE TRIGGER trg_xp_pendente_trava_remarcacao
  BEFORE INSERT OR UPDATE ON public.xp_pendente
  FOR EACH ROW
  EXECUTE FUNCTION public.trava_pendente_estorno();
