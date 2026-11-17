-- =============================================================================
-- 102 — Saída de Completo, histórico em revisoes e prévia de estorno (#267)
-- =============================================================================
--
-- Ao tirar um anime de "Completo" para outro status, o usuário escolhe entre:
--   1. "vou_rever": mantém episode_progress, xp_ledger e user_cards no histórico
--      e abre uma volta ativa em revisoes (novas marcações rendem 0 XP).
--   2. "desisti_ou_errado": apaga episode_progress e user_cards da obra,
--      estornando imediatamente XP dos episódios e das missões/convites afetados.
--
-- Alterar media_entries.status direto fora de executar_saida_completo() entra
-- automaticamente em modo "vou_rever" para impedir burla ao estorno/trava.
--
-- Pode rodar mais de uma vez.

-- -----------------------------------------------------------------------------
-- 1. Marca temporal de conclusão em media_entries
-- -----------------------------------------------------------------------------
ALTER TABLE public.media_entries
  ADD COLUMN IF NOT EXISTS completado_em timestamptz;

UPDATE public.media_entries me
   SET completado_em = COALESCE(
         (SELECT uc.obtida_em
            FROM public.user_cards uc
           WHERE uc.user_id = me.user_id AND uc.mal_id = me.mal_id),
         me.updated_at,
         me.created_at,
         now()
       )
 WHERE me.status = 'Completo'
   AND me.completado_em IS NULL;

CREATE OR REPLACE FUNCTION public.manter_completado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'Completo' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'Completo' THEN
      NEW.completado_em := COALESCE(NEW.completado_em, now());
    END IF;
  ELSE
    NEW.completado_em := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_entries_completado_em ON public.media_entries;
CREATE TRIGGER trg_media_entries_completado_em
  BEFORE INSERT OR UPDATE OF status ON public.media_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.manter_completado_em();

-- -----------------------------------------------------------------------------
-- 2. Tabela public.revisoes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.revisoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id       integer NOT NULL CHECK (mal_id > 0),
  iniciada_em  timestamptz NOT NULL DEFAULT now(),
  concluida_em timestamptz,
  ativa        boolean NOT NULL DEFAULT true,
  criado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS revisoes_user_mal_ativa_uq
  ON public.revisoes (user_id, mal_id)
  WHERE ativa = true;

CREATE INDEX IF NOT EXISTS revisoes_user_idx
  ON public.revisoes (user_id, ativa, mal_id);

ALTER TABLE public.revisoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS revisoes_le_o_proprio ON public.revisoes;
CREATE POLICY revisoes_le_o_proprio ON public.revisoes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

REVOKE INSERT, UPDATE, DELETE ON public.revisoes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.revisoes TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.revisoes TO service_role;

-- -----------------------------------------------------------------------------
-- 3. Gatilhos de controle de revisão e proteção do xp_ledger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gerenciar_revisoes_ao_mudar_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Ao voltar para Completo, encerra eventual ciclo ativo de revisão.
  IF NEW.status = 'Completo' THEN
    UPDATE public.revisoes
       SET ativa = false,
           concluida_em = COALESCE(concluida_em, now())
     WHERE user_id = NEW.user_id
       AND mal_id = NEW.mal_id
       AND ativa = true;
    RETURN NEW;
  END IF;

  -- Ao sair de Completo sem descarte explícito, preserva histórico e abre revisão.
  IF OLD.status = 'Completo'
     AND COALESCE(current_setting('anideck.saida_completo_descarte', true), '') <> '1' THEN
    INSERT INTO public.revisoes (user_id, mal_id, ativa)
    VALUES (NEW.user_id, NEW.mal_id, true)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.gerenciar_revisoes_ao_mudar_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_media_entries_gerenciar_revisoes ON public.media_entries;
CREATE TRIGGER trg_media_entries_gerenciar_revisoes
  AFTER UPDATE OF status ON public.media_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.gerenciar_revisoes_ao_mudar_status();

CREATE OR REPLACE FUNCTION public.proteger_xp_em_revisao()
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
    NEW.xp_earned := 0;
    NEW.reason := 'revisão · histórico preservado';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.proteger_xp_em_revisao() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_xp_ledger_proteger_revisao ON public.xp_ledger;
CREATE TRIGGER trg_xp_ledger_proteger_revisao
  BEFORE INSERT OR UPDATE ON public.xp_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_xp_em_revisao();

-- -----------------------------------------------------------------------------
-- 4. Cálculo de nível por XP e prévia/execução da saída de Completo
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_nivel_por_xp(p_xp_total bigint)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_restante bigint := GREATEST(0, COALESCE(p_xp_total, 0));
  v_nivel    integer := 1;
  v_custo    integer;
BEGIN
  WHILE v_restante > 0 LOOP
    v_custo := 100 + (v_nivel - 1) * 30;
    IF v_restante < v_custo THEN
      EXIT;
    END IF;
    v_restante := v_restante - v_custo;
    v_nivel := v_nivel + 1;
  END LOOP;
  RETURN v_nivel;
END;
$$;

CREATE OR REPLACE FUNCTION public.previa_saida_completo(
  p_user_id uuid,
  p_mal_id  integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry             public.media_entries%ROWTYPE;
  v_xp_antes          bigint := 0;
  v_xp_depois         bigint := 0;
  v_nivel_antes       integer := 1;
  v_nivel_depois      integer := 1;
  v_episodios_marcados integer := 0;
  v_completado_ref    timestamptz;
  v_sugestao          text := 'vou_rever';
BEGIN
  IF p_user_id IS NULL OR COALESCE(p_mal_id, 0) <= 0 THEN
    RAISE EXCEPTION 'Parâmetros inválidos' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('saida_completo:' || p_user_id::text));

  SELECT * INTO v_entry
    FROM public.media_entries
   WHERE user_id = p_user_id
     AND mal_id = p_mal_id;

  IF v_entry.id IS NULL THEN
    RAISE EXCEPTION 'Entrada não encontrada no deck' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(sum(xp_earned), 0)::bigint INTO v_xp_antes
    FROM public.xp_ledger
   WHERE user_id = p_user_id;

  v_nivel_antes := public.calcular_nivel_por_xp(v_xp_antes);

  SELECT count(*)::integer INTO v_episodios_marcados
    FROM public.episode_progress
   WHERE user_id = p_user_id
     AND mal_id = p_mal_id;

  -- Simula o descarte dentro de subtransação abortada ao final, medindo o impacto
  -- exato em episódios, missões vinculadas e convites sem alterar nenhuma tabela.
  BEGIN
    DELETE FROM public.episode_progress
     WHERE user_id = p_user_id
       AND mal_id = p_mal_id;

    DELETE FROM public.user_cards
     WHERE user_id = p_user_id
       AND mal_id = p_mal_id;

    DELETE FROM public.xp_ledger
     WHERE user_id = p_user_id
       AND mal_id = p_mal_id;

    SELECT COALESCE(sum(xp_earned), 0)::bigint INTO v_xp_depois
      FROM public.xp_ledger
     WHERE user_id = p_user_id;

    RAISE EXCEPTION USING ERRCODE = 'P0999';
  EXCEPTION
    WHEN SQLSTATE 'P0999' THEN
      NULL;
  END;

  v_nivel_depois := public.calcular_nivel_por_xp(v_xp_depois);
  v_completado_ref := COALESCE(v_entry.completado_em, v_entry.updated_at, v_entry.created_at);

  IF v_completado_ref IS NOT NULL AND v_completado_ref > now() - interval '24 hours' THEN
    v_sugestao := 'desisti_ou_errado';
  ELSE
    v_sugestao := 'vou_rever';
  END IF;

  RETURN jsonb_build_object(
    'xp_antes', v_xp_antes,
    'xp_depois', v_xp_depois,
    'xp_perdido', GREATEST(0, v_xp_antes - v_xp_depois),
    'nivel_antes', v_nivel_antes,
    'nivel_depois', v_nivel_depois,
    'niveis_perdidos', GREATEST(0, v_nivel_antes - v_nivel_depois),
    'episodios_marcados', v_episodios_marcados,
    'completado_em', v_completado_ref,
    'sugestao', v_sugestao
  );
END;
$$;

REVOKE ALL ON FUNCTION public.previa_saida_completo(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.previa_saida_completo(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.executar_saida_completo(
  p_user_id     uuid,
  p_mal_id      integer,
  p_escolha     text,
  p_novo_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry        public.media_entries%ROWTYPE;
  v_xp_antes     bigint := 0;
  v_xp_depois    bigint := 0;
  v_nivel_antes  integer := 1;
  v_nivel_depois integer := 1;
  v_revisao      boolean := false;
BEGIN
  IF p_user_id IS NULL OR COALESCE(p_mal_id, 0) <= 0 THEN
    RAISE EXCEPTION 'Parâmetros inválidos' USING ERRCODE = 'P0001';
  END IF;

  IF p_escolha NOT IN ('vou_rever', 'desisti_ou_errado') THEN
    RAISE EXCEPTION 'Escolha inválida: %', p_escolha USING ERRCODE = 'P0001';
  END IF;

  IF p_novo_status NOT IN ('Assistindo', 'Em Dia', 'Quero Assistir', 'Dropado') THEN
    RAISE EXCEPTION 'Status de destino inválido: %', p_novo_status USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('saida_completo:' || p_user_id::text));

  SELECT * INTO v_entry
    FROM public.media_entries
   WHERE user_id = p_user_id
     AND mal_id = p_mal_id;

  IF v_entry.id IS NULL THEN
    RAISE EXCEPTION 'Entrada não encontrada no deck' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(sum(xp_earned), 0)::bigint INTO v_xp_antes
    FROM public.xp_ledger
   WHERE user_id = p_user_id;

  v_nivel_antes := public.calcular_nivel_por_xp(v_xp_antes);

  IF p_escolha = 'vou_rever' THEN
    INSERT INTO public.revisoes (user_id, mal_id, ativa)
    VALUES (p_user_id, p_mal_id, true)
    ON CONFLICT DO NOTHING;

    UPDATE public.media_entries
       SET status = p_novo_status
     WHERE id = v_entry.id;

    v_revisao := true;
  ELSE
    PERFORM set_config('anideck.saida_completo_descarte', '1', true);

    UPDATE public.revisoes
       SET ativa = false,
           concluida_em = COALESCE(concluida_em, now())
     WHERE user_id = p_user_id
       AND mal_id = p_mal_id
       AND ativa = true;

    UPDATE public.media_entries
       SET status = p_novo_status
     WHERE id = v_entry.id;

    DELETE FROM public.episode_progress
     WHERE user_id = p_user_id
       AND mal_id = p_mal_id;

    DELETE FROM public.user_cards
     WHERE user_id = p_user_id
       AND mal_id = p_mal_id;

    DELETE FROM public.xp_ledger
     WHERE user_id = p_user_id
       AND mal_id = p_mal_id;

    v_revisao := false;
  END IF;

  SELECT COALESCE(sum(xp_earned), 0)::bigint INTO v_xp_depois
    FROM public.xp_ledger
   WHERE user_id = p_user_id;

  v_nivel_depois := public.calcular_nivel_por_xp(v_xp_depois);

  RETURN jsonb_build_object(
    'xp_antes', v_xp_antes,
    'xp_depois', v_xp_depois,
    'xp_perdido', GREATEST(0, v_xp_antes - v_xp_depois),
    'nivel_antes', v_nivel_antes,
    'nivel_depois', v_nivel_depois,
    'niveis_perdidos', GREATEST(0, v_nivel_antes - v_nivel_depois),
    'escolha', p_escolha,
    'novo_status', p_novo_status,
    'revisao_ativa', v_revisao
  );
END;
$$;

REVOKE ALL ON FUNCTION public.executar_saida_completo(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.executar_saida_completo(uuid, integer, text, text) TO service_role;
