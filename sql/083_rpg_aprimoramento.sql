-- =============================================================================
-- 083 — Aprimoramento de equipamento com Ouro
-- =============================================================================
--
-- O que muda:
--   1. rpg_inventario guarda o aprimoramento de cada item do jogador (0 a 10).
--   2. rpg_aprimorar_item() sobe um nível, cobrando Ouro. Só o service role chama.
--   3. rpg_estado_jogador() devolve também o aprimoramento de cada item e o Ouro.
--
-- As regras (quanto cada nível soma, o teto de cada raridade e o preço) ficam no Go
-- (rpg_aprimoramento.go), que manda o preço e o teto já calculados. O banco confere a posse,
-- o nível atual, o teto e o saldo. O nível atual esperado (p_de) faz dois cliques iguais
-- cobrarem uma vez só: o segundo encontra o item já aprimorado e é recusado.
--
-- Itens repetidos somam em `quantidade`, numa linha só; o aprimoramento é dessa linha.
--
-- ORDEM: depois do sql/081 (coluna ouro) e ANTES de promover o código da issue #241: o Go
-- novo lê a coluna `aprimoramento`. rpg_estado_jogador é redefinida aqui (a definição viva
-- era a do sql/077).
--
-- Pode rodar mais de uma vez.

ALTER TABLE public.rpg_inventario
  ADD COLUMN IF NOT EXISTS aprimoramento SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE public.rpg_inventario DROP CONSTRAINT IF EXISTS rpg_inventario_aprimoramento;
ALTER TABLE public.rpg_inventario
  ADD CONSTRAINT rpg_inventario_aprimoramento CHECK (aprimoramento BETWEEN 0 AND 10);

-- Histórico de aprimoramentos, para auditar onde o Ouro foi gasto.
CREATE TABLE IF NOT EXISTS public.rpg_aprimoramentos (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL REFERENCES public.rpg_itens(id) ON DELETE CASCADE,
  para        SMALLINT NOT NULL,
  ouro_gasto  INTEGER NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rpg_aprimoramentos_numeros CHECK (para BETWEEN 1 AND 10 AND ouro_gasto >= 1)
);

CREATE INDEX IF NOT EXISTS rpg_aprimoramentos_user ON public.rpg_aprimoramentos (user_id, criado_em DESC);

ALTER TABLE public.rpg_aprimoramentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_aprimoramentos_le_o_proprio ON public.rpg_aprimoramentos;
CREATE POLICY rpg_aprimoramentos_le_o_proprio ON public.rpg_aprimoramentos
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.rpg_aprimoramentos FROM anon, authenticated;
GRANT SELECT ON public.rpg_aprimoramentos TO authenticated;
GRANT SELECT, INSERT ON public.rpg_aprimoramentos TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rpg_aprimoramentos_id_seq TO service_role;

-- =============================================================================
-- Aprimorar
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_aprimorar_item(
  p_user_id UUID,
  p_item_id TEXT,
  p_de      INTEGER,
  p_custo   INTEGER,
  p_teto    INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_linha    public.rpg_inventario%ROWTYPE;
  v_recursos public.rpg_recursos%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_item_id IS NULL OR p_de IS NULL OR p_custo IS NULL OR p_teto IS NULL
     OR p_custo < 1 OR p_teto < 0 OR p_teto > 10 OR p_de < 0 THEN
    RETURN jsonb_build_object('erro', 'Pedido inválido.');
  END IF;

  SELECT * INTO v_linha FROM public.rpg_inventario
   WHERE user_id = p_user_id AND item_id = p_item_id FOR UPDATE;
  IF v_linha.user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Você não tem este item.', 'sem_item', true);
  END IF;
  IF v_linha.aprimoramento <> p_de THEN
    RETURN jsonb_build_object('erro', 'Este item já foi aprimorado. Atualize a tela.', 'mudou', true);
  END IF;
  IF v_linha.aprimoramento >= p_teto THEN
    RETURN jsonb_build_object('erro', 'Este item já está no máximo.', 'no_maximo', true);
  END IF;

  INSERT INTO public.rpg_recursos (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_recursos FROM public.rpg_recursos WHERE user_id = p_user_id FOR UPDATE;
  IF v_recursos.ouro < p_custo THEN
    RETURN jsonb_build_object('erro', 'Ouro insuficiente. Vença expedições para ganhar mais.', 'sem_ouro', true);
  END IF;

  UPDATE public.rpg_recursos
     SET ouro = ouro - p_custo, atualizado_em = now()
   WHERE user_id = p_user_id
  RETURNING * INTO v_recursos;

  UPDATE public.rpg_inventario
     SET aprimoramento = aprimoramento + 1
   WHERE user_id = p_user_id AND item_id = p_item_id
  RETURNING * INTO v_linha;

  INSERT INTO public.rpg_aprimoramentos (user_id, item_id, para, ouro_gasto)
  VALUES (p_user_id, p_item_id, v_linha.aprimoramento, p_custo);

  RETURN jsonb_build_object('ok', true, 'aprimoramento', v_linha.aprimoramento, 'ouro', v_recursos.ouro);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_aprimorar_item(UUID, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_aprimorar_item(UUID, TEXT, INTEGER, INTEGER, INTEGER) TO service_role;

-- =============================================================================
-- Estado do jogador
-- =============================================================================
-- Igual à do sql/077, mais `aprimoramento` em cada linha do inventário e `ouro`.

CREATE OR REPLACE FUNCTION public.rpg_estado_jogador()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_personagem JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  SELECT jsonb_build_object(
           'nome', p.nome,
           'personagem_base', p.personagem_base,
           'criado_em', p.criado_em,
           'visual_equipado', p.visual_equipado)
    INTO v_personagem
    FROM public.rpg_personagens p
   WHERE p.user_id = v_user_id;

  -- Quem não despertou não precisa do resto.
  IF v_personagem IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'personagem', NULL);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'personagem', v_personagem,
    'xp_total', (SELECT COALESCE(sum(x.xp_earned), 0) FROM public.xp_ledger x WHERE x.user_id = v_user_id),
    'inventario', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'quantidade', inv.quantidade,
               'aprimoramento', inv.aprimoramento,
               'rpg_itens', jsonb_build_object(
                 'id', i.id, 'slot', i.slot, 'nome', i.nome, 'descricao', i.descricao,
                 'raridade', i.raridade, 'vida', i.vida, 'ataque', i.ataque,
                 'defesa', i.defesa, 'nivel_minimo', i.nivel_minimo)))
        FROM public.rpg_inventario inv
        JOIN public.rpg_itens i ON i.id = inv.item_id AND i.ativo = true
       WHERE inv.user_id = v_user_id), '[]'::JSONB),
    'equipados', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slot', e.slot, 'item_id', e.item_id))
        FROM public.rpg_equipados e
       WHERE e.user_id = v_user_id), '[]'::JSONB),
    'bilhetes', COALESCE((SELECT r.bilhetes FROM public.rpg_recursos r WHERE r.user_id = v_user_id), 0),
    'ouro', COALESCE((SELECT r.ouro FROM public.rpg_recursos r WHERE r.user_id = v_user_id), 0),
    'pontos', COALESCE((
      SELECT jsonb_build_object(
               'forca', p.forca, 'inteligencia', p.inteligencia, 'constituicao', p.constituicao,
               'agilidade', p.agilidade, 'destreza', p.destreza, 'sorte', p.sorte)
        FROM public.rpg_atributos p
       WHERE p.user_id = v_user_id), '{}'::JSONB),
    'cosmeticos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slot', ue.slot, 'store_items', jsonb_build_object('estilo', s.estilo)))
        FROM public.user_equipped ue
        JOIN public.store_items s ON s.id = ue.item_id
       WHERE ue.user_id = v_user_id AND ue.slot IN ('cenario', 'aura')), '[]'::JSONB),
    'skins', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('store_items', jsonb_build_object(
               'id', s.id, 'nome', s.nome, 'estilo', s.estilo, 'tipo', s.tipo)))
        FROM public.user_items ui
        JOIN public.store_items s ON s.id = ui.item_id AND s.tipo = 'skin'
       WHERE ui.user_id = v_user_id), '[]'::JSONB)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_estado_jogador() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_estado_jogador() TO authenticated;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID>","role":"authenticated"}', true);
--   SELECT public.rpg_estado_jogador()->'inventario'->0;   -- traz "aprimoramento"
--   SELECT public.rpg_estado_jogador()->'ouro';
-- ROLLBACK;
--
-- BEGIN;
--   UPDATE public.rpg_recursos SET ouro = 1000 WHERE user_id = '<UUID>';
--   SELECT public.rpg_aprimorar_item('<UUID>', 'espada_de_ferro', 0, 20, 4);   -- ok, aprimoramento 1
--   SELECT public.rpg_aprimorar_item('<UUID>', 'espada_de_ferro', 0, 20, 4);   -- mudou
-- ROLLBACK;
