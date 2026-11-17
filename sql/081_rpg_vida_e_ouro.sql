-- =============================================================================
-- 081 — Vida persistente, recuperação e Ouro do RPG
-- =============================================================================
--
-- O que muda:
--   1. rpg_recursos guarda a Vida perdida, o Ouro e a última Pousada.
--   2. rpg_recuperacoes registra cada recuperação, uma linha por origem.
--   3. rpg_vida_perdida_agora() aplica a regeneração de 5% por hora na leitura.
--   4. Gatilho em xp_ledger: episódio com XP real recupera 8% da Vida, até 5 por dia.
--   5. rpg_batalhas_hoje() devolve também Vida, Ouro e recuperações do dia.
--   6. rpg_concluir_batalha() grava a batalha, a Vida que sobrou e o Ouro da vitória.
--   7. rpg_recuperar_vida() vende Pousada e Poção por Ouro.
--
-- A Vida é guardada como PERDA em por mil da Vida máxima (0 = cheia, 1000 = zerada), e não
-- em pontos: a Vida máxima é calculada no Go (nível, pontos e itens) e muda quando o jogador
-- sobe de nível ou troca um item. Em por mil, a regeneração e as recuperações valem a mesma
-- fração para qualquer Vida máxima, e o banco não precisa conhecê-la.
--
-- A regeneração não tem tarefa agendada: o valor guardado é o do momento `vida_em`, e quem
-- lê desconta o tempo que passou. Toda escrita grava o valor já regenerado e o novo `vida_em`.
--
-- ORDEM: aplicar ANTES de promover o código da issue #239. O Go novo chama
-- rpg_concluir_batalha e rpg_recuperar_vida. A rpg_registrar_batalha (sql/072) fica intacta,
-- então o código que está na main continua funcionando depois deste arquivo.
--
-- Pode rodar mais de uma vez.

-- =============================================================================
-- 1. Colunas novas
-- =============================================================================

ALTER TABLE public.rpg_recursos
  ADD COLUMN IF NOT EXISTS vida_perdida INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vida_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ouro         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pousada_em   TIMESTAMPTZ;

ALTER TABLE public.rpg_recursos DROP CONSTRAINT IF EXISTS rpg_recursos_vida_perdida;
ALTER TABLE public.rpg_recursos
  ADD CONSTRAINT rpg_recursos_vida_perdida CHECK (vida_perdida BETWEEN 0 AND 1000);

ALTER TABLE public.rpg_recursos DROP CONSTRAINT IF EXISTS rpg_recursos_ouro;
ALTER TABLE public.rpg_recursos
  ADD CONSTRAINT rpg_recursos_ouro CHECK (ouro >= 0);

-- Ouro ganho em cada batalha, para auditar a origem do saldo.
ALTER TABLE public.rpg_batalhas
  ADD COLUMN IF NOT EXISTS ouro INTEGER NOT NULL DEFAULT 0;

-- =============================================================================
-- 2. Histórico de recuperações
-- =============================================================================
-- `origem` identifica o que recuperou: 'episodio:<mal_id>:<ep>', 'pousada:<instante>' ou
-- 'pocao:<instante>'. O UNIQUE impede que o mesmo episódio recupere duas vezes, mesmo
-- desmarcado e marcado de novo. `vida` é quanto voltou, em por mil.

CREATE TABLE IF NOT EXISTS public.rpg_recuperacoes (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origem      TEXT NOT NULL,
  vida        INTEGER NOT NULL DEFAULT 0,
  ouro_gasto  INTEGER NOT NULL DEFAULT 0,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rpg_recuperacoes_origem_unica UNIQUE (user_id, origem),
  CONSTRAINT rpg_recuperacoes_numeros CHECK (vida BETWEEN 0 AND 1000 AND ouro_gasto >= 0)
);

CREATE INDEX IF NOT EXISTS rpg_recuperacoes_user_data ON public.rpg_recuperacoes (user_id, criado_em DESC);

ALTER TABLE public.rpg_recuperacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_recuperacoes_le_o_proprio ON public.rpg_recuperacoes;
CREATE POLICY rpg_recuperacoes_le_o_proprio ON public.rpg_recuperacoes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.rpg_recuperacoes FROM anon, authenticated;
GRANT SELECT ON public.rpg_recuperacoes TO authenticated;
GRANT SELECT, INSERT ON public.rpg_recuperacoes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rpg_recuperacoes_id_seq TO service_role;

-- =============================================================================
-- 3. Regras e regeneração
-- =============================================================================
-- As regras de recuperação moram aqui, num lugar só. Os custos em Ouro dependem do nível e
-- ficam no Go (rpg_vida.go).

CREATE OR REPLACE FUNCTION public.rpg_regras_vida()
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'regen_por_hora', 50,       -- 5% da Vida máxima por hora
    'por_episodio', 80,         -- 8% por episódio com XP real
    'episodios_por_dia', 5,     -- até 40% por dia assistindo
    'pocao', 300,               -- a Poção recupera 30%
    'pousada_horas', 4          -- a Pousada vale uma vez a cada 4 horas
  );
$$;

REVOKE ALL ON FUNCTION public.rpg_regras_vida() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_regras_vida() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rpg_vida_perdida_agora(p_perdida INTEGER, p_em TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT GREATEST(0, LEAST(1000,
    COALESCE(p_perdida, 0)
    - floor(GREATEST(0, extract(epoch FROM (now() - COALESCE(p_em, now())))) / 3600.0
            * (public.rpg_regras_vida()->>'regen_por_hora')::INTEGER)::INTEGER
  ));
$$;

REVOKE ALL ON FUNCTION public.rpg_vida_perdida_agora(INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_vida_perdida_agora(INTEGER, TIMESTAMPTZ) TO authenticated, service_role;

-- Início do dia civil em Brasília, o mesmo corte do limite de batalhas (sql/072).
CREATE OR REPLACE FUNCTION public.rpg_inicio_do_dia()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
$$;

REVOKE ALL ON FUNCTION public.rpg_inicio_do_dia() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_inicio_do_dia() TO authenticated, service_role;

-- =============================================================================
-- 4. Recuperação por episódio
-- =============================================================================
-- Roda depois de cada linha nova em xp_ledger. Episódios marcados em lote não geram linha no
-- ledger (sql/039), então só episódio assistido de verdade recupera. Uma falha aqui nunca
-- impede a marcação do episódio: o erro vira aviso no log do banco.

CREATE OR REPLACE FUNCTION public.rpg_recuperar_por_episodio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_regras    JSONB := public.rpg_regras_vida();
  v_recursos  public.rpg_recursos%ROWTYPE;
  v_perdida   INTEGER;
  v_volta     INTEGER;
  v_hoje      INTEGER;
BEGIN
  IF NEW.user_id IS NULL OR COALESCE(NEW.mal_id, 0) <= 0 OR COALESCE(NEW.episode_number, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT * INTO v_recursos FROM public.rpg_recursos WHERE user_id = NEW.user_id FOR UPDATE;
    IF v_recursos.user_id IS NULL THEN
      RETURN NEW;  -- nunca lutou: Vida cheia
    END IF;

    v_perdida := public.rpg_vida_perdida_agora(v_recursos.vida_perdida, v_recursos.vida_em);
    IF v_perdida = 0 THEN
      RETURN NEW;  -- Vida cheia: o episódio não gasta o limite do dia
    END IF;

    SELECT count(*)::INTEGER INTO v_hoje
      FROM public.rpg_recuperacoes
     WHERE user_id = NEW.user_id
       AND origem LIKE 'episodio:%'
       AND criado_em >= public.rpg_inicio_do_dia();
    IF v_hoje >= (v_regras->>'episodios_por_dia')::INTEGER THEN
      RETURN NEW;
    END IF;

    v_volta := LEAST(v_perdida, (v_regras->>'por_episodio')::INTEGER);
    INSERT INTO public.rpg_recuperacoes (user_id, origem, vida)
    VALUES (NEW.user_id, 'episodio:' || NEW.mal_id || ':' || NEW.episode_number, v_volta)
    ON CONFLICT (user_id, origem) DO NOTHING;
    IF NOT FOUND THEN
      RETURN NEW;  -- este episódio já recuperou antes
    END IF;

    UPDATE public.rpg_recursos
       SET vida_perdida = v_perdida - v_volta,
           vida_em = now(),
           atualizado_em = now()
     WHERE user_id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'rpg_recuperar_por_episodio falhou (user=%): %', NEW.user_id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_recuperar_por_episodio() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_xp_ledger_rpg_recupera ON public.xp_ledger;
CREATE TRIGGER trg_xp_ledger_rpg_recupera
  AFTER INSERT ON public.xp_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.rpg_recuperar_por_episodio();

-- =============================================================================
-- 5. Estado do dia
-- =============================================================================
-- Redefine a do sql/072, acrescentando Vida, Ouro e recuperações. Os campos antigos
-- continuam iguais.

CREATE OR REPLACE FUNCTION public.rpg_batalhas_hoje()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id  UUID := auth.uid();
  v_recursos public.rpg_recursos%ROWTYPE;
  v_regras   JSONB := public.rpg_regras_vida();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;
  SELECT * INTO v_recursos FROM public.rpg_recursos WHERE user_id = v_user_id;
  RETURN jsonb_build_object(
    'ok', true,
    'feitas', public.rpg_contar_batalhas_hoje(v_user_id),
    'limite', public.rpg_limite_batalhas_dia(),
    'bilhetes', COALESCE(v_recursos.bilhetes, 0),
    'ouro', COALESCE(v_recursos.ouro, 0),
    'vida_perdida', public.rpg_vida_perdida_agora(v_recursos.vida_perdida, v_recursos.vida_em),
    'pousada_livre_em', CASE
      WHEN v_recursos.pousada_em IS NULL THEN NULL
      WHEN v_recursos.pousada_em + make_interval(hours => (v_regras->>'pousada_horas')::INTEGER) <= now() THEN NULL
      ELSE v_recursos.pousada_em + make_interval(hours => (v_regras->>'pousada_horas')::INTEGER)
    END,
    'episodios_hoje', (
      SELECT count(*)::INTEGER FROM public.rpg_recuperacoes
       WHERE user_id = v_user_id AND origem LIKE 'episodio:%' AND criado_em >= public.rpg_inicio_do_dia()),
    'regras', v_regras
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_batalhas_hoje() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_batalhas_hoje() TO authenticated;

-- =============================================================================
-- 6. Concluir batalha
-- =============================================================================
-- Como a rpg_registrar_batalha (sql/072), mais a Vida e o Ouro. Só o service role chama:
-- a luta é simulada no Go, que manda a Vida perdida no fim, em por mil.

CREATE OR REPLACE FUNCTION public.rpg_concluir_batalha(
  p_user_id      UUID,
  p_monstro_id   TEXT,
  p_venceu       BOOLEAN,
  p_turnos       INTEGER,
  p_item_id      TEXT,
  p_vida_perdida INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_monstro  public.rpg_monstros%ROWTYPE;
  v_limite   INTEGER := public.rpg_limite_batalhas_dia();
  v_feitas   INTEGER;
  v_bilhetes INTEGER := 0;
  v_ouro     INTEGER := 0;
  v_item     TEXT := NULL;
  v_recursos public.rpg_recursos%ROWTYPE;
  v_perdida  INTEGER;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  -- A mesma trava da rpg_registrar_batalha: as duas contam no mesmo limite do dia.
  PERFORM pg_advisory_xact_lock(hashtextextended('rpg_batalha:' || p_user_id::TEXT, 0));

  v_feitas := public.rpg_contar_batalhas_hoje(p_user_id);
  IF v_feitas >= v_limite THEN
    RETURN jsonb_build_object('erro', 'Você já fez todas as batalhas de hoje. Volte amanhã.', 'limite_atingido', true);
  END IF;

  SELECT * INTO v_monstro FROM public.rpg_monstros WHERE id = p_monstro_id AND ativo = true;
  IF v_monstro.id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Monstro desconhecido.');
  END IF;

  INSERT INTO public.rpg_recursos (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_recursos FROM public.rpg_recursos WHERE user_id = p_user_id FOR UPDATE;
  v_perdida := public.rpg_vida_perdida_agora(v_recursos.vida_perdida, v_recursos.vida_em);
  IF v_perdida >= 1000 THEN
    RETURN jsonb_build_object('erro', 'Seu personagem está sem Vida. Descanse, assista a um episódio ou use a Pousada.', 'sem_vida', true);
  END IF;

  IF p_venceu THEN
    v_bilhetes := v_monstro.bilhetes;
    v_ouro := 5 + 2 * v_monstro.nivel;
    IF p_item_id IS NOT NULL AND btrim(p_item_id) <> '' THEN
      SELECT id INTO v_item FROM public.rpg_itens WHERE id = p_item_id AND ativo = true AND inicial = false;
    END IF;
  END IF;

  INSERT INTO public.rpg_batalhas (user_id, monstro_id, venceu, turnos, bilhetes, item_id, ouro)
  VALUES (p_user_id, v_monstro.id, p_venceu, GREATEST(COALESCE(p_turnos, 0), 0), v_bilhetes, v_item, v_ouro);

  UPDATE public.rpg_recursos
     SET bilhetes = bilhetes + v_bilhetes,
         ouro = ouro + v_ouro,
         vida_perdida = GREATEST(0, LEAST(1000, COALESCE(p_vida_perdida, 0))),
         vida_em = now(),
         atualizado_em = now()
   WHERE user_id = p_user_id
  RETURNING * INTO v_recursos;

  IF v_item IS NOT NULL THEN
    INSERT INTO public.rpg_inventario (user_id, item_id)
    VALUES (p_user_id, v_item)
    ON CONFLICT (user_id, item_id) DO UPDATE
      SET quantidade = public.rpg_inventario.quantidade + 1;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'bilhetes_ganhos', v_bilhetes,
    'ouro_ganho', v_ouro,
    'item_id', v_item,
    'bilhetes', v_recursos.bilhetes,
    'ouro', v_recursos.ouro,
    'vida_perdida', v_recursos.vida_perdida,
    'feitas', v_feitas + 1,
    'limite', v_limite
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_concluir_batalha(UUID, TEXT, BOOLEAN, INTEGER, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_concluir_batalha(UUID, TEXT, BOOLEAN, INTEGER, TEXT, INTEGER) TO service_role;

-- =============================================================================
-- 7. Pousada e Poção
-- =============================================================================
-- Só o service role chama. O custo vem do Go, que o calcula pelo nível do jogador; o
-- navegador nunca o envia.

CREATE OR REPLACE FUNCTION public.rpg_recuperar_vida(p_user_id UUID, p_tipo TEXT, p_custo INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_regras   JSONB := public.rpg_regras_vida();
  v_recursos public.rpg_recursos%ROWTYPE;
  v_perdida  INTEGER;
  v_volta    INTEGER;
  v_livre_em TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;
  IF p_tipo IS NULL OR p_tipo NOT IN ('pousada', 'pocao') THEN
    RETURN jsonb_build_object('erro', 'Escolha a Pousada ou a Poção.');
  END IF;
  IF p_custo IS NULL OR p_custo < 1 THEN
    RETURN jsonb_build_object('erro', 'Custo inválido.');
  END IF;

  INSERT INTO public.rpg_recursos (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_recursos FROM public.rpg_recursos WHERE user_id = p_user_id FOR UPDATE;
  v_perdida := public.rpg_vida_perdida_agora(v_recursos.vida_perdida, v_recursos.vida_em);

  IF v_perdida = 0 THEN
    RETURN jsonb_build_object('erro', 'Sua Vida já está cheia.', 'vida_cheia', true);
  END IF;

  IF p_tipo = 'pousada' AND v_recursos.pousada_em IS NOT NULL THEN
    v_livre_em := v_recursos.pousada_em + make_interval(hours => (v_regras->>'pousada_horas')::INTEGER);
    IF v_livre_em > now() THEN
      RETURN jsonb_build_object('erro', 'A Pousada ainda não tem quarto livre para você.', 'em_espera', true, 'pousada_livre_em', v_livre_em);
    END IF;
  END IF;

  IF v_recursos.ouro < p_custo THEN
    RETURN jsonb_build_object('erro', 'Ouro insuficiente. Vença expedições para ganhar mais.', 'sem_ouro', true);
  END IF;

  v_volta := CASE p_tipo WHEN 'pousada' THEN v_perdida ELSE LEAST(v_perdida, (v_regras->>'pocao')::INTEGER) END;

  INSERT INTO public.rpg_recuperacoes (user_id, origem, vida, ouro_gasto)
  VALUES (p_user_id, p_tipo || ':' || extract(epoch FROM clock_timestamp())::TEXT, v_volta, p_custo);

  UPDATE public.rpg_recursos
     SET ouro = ouro - p_custo,
         vida_perdida = v_perdida - v_volta,
         vida_em = now(),
         pousada_em = CASE WHEN p_tipo = 'pousada' THEN now() ELSE pousada_em END,
         atualizado_em = now()
   WHERE user_id = p_user_id
  RETURNING * INTO v_recursos;

  RETURN jsonb_build_object(
    'ok', true,
    'vida_recuperada', v_volta,
    'vida_perdida', v_recursos.vida_perdida,
    'ouro', v_recursos.ouro
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_recuperar_vida(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_recuperar_vida(UUID, TEXT, INTEGER) TO service_role;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT public.rpg_regras_vida();
-- SELECT public.rpg_vida_perdida_agora(1000, now() - interval '2 hours');   -- 900
-- SELECT public.rpg_vida_perdida_agora(100, now() - interval '5 hours');    -- 0
--
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID>","role":"authenticated"}', true);
--   SELECT public.rpg_batalhas_hoje();          -- traz ouro, vida_perdida, episodios_hoje, regras
-- ROLLBACK;
--
-- BEGIN;
--   -- Vida zerada e um episódio marcado: recupera 80 por mil, uma vez só.
--   UPDATE public.rpg_recursos SET vida_perdida = 1000, vida_em = now() WHERE user_id = '<UUID>';
--   INSERT INTO public.xp_ledger (user_id, mal_id, episode_number, xp_earned, reason)
--   VALUES ('<UUID>', 1, 999, 25, 'teste');
--   SELECT vida_perdida FROM public.rpg_recursos WHERE user_id = '<UUID>';      -- 920
--   DELETE FROM public.xp_ledger WHERE user_id = '<UUID>' AND mal_id = 1 AND episode_number = 999;
--   INSERT INTO public.xp_ledger (user_id, mal_id, episode_number, xp_earned, reason)
--   VALUES ('<UUID>', 1, 999, 25, 'teste');
--   SELECT vida_perdida FROM public.rpg_recursos WHERE user_id = '<UUID>';      -- 920 de novo
--   SELECT public.rpg_recuperar_vida('<UUID>', 'pousada', 999999);              -- sem_ouro
-- ROLLBACK;
