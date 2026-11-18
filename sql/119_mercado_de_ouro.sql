-- =============================================================================
-- 119 — Mercado: equipamentos comprados com Ouro
-- =============================================================================
--
-- Até aqui o Ouro só servia para recuperar Vida e aprimorar itens, e equipamento novo só
-- vinha de batalha e invocação, com um vão grande entre os raros (nível 6 a 10) e os épicos
-- (nível 20+). O Mercado vende os raros e uma leva nova de itens de nível 12 a 18, para o
-- Ouro guardado virar progresso.
--
-- O que é vendido: rpg_itens.preco_ouro preenchido. Lendários e os épicos antigos seguem só
-- como recompensa, para continuarem valendo como drop.
--
-- Funções chamadas pelo cliente com o próprio token (identidade de auth.uid()):
--   rpg_mercado()               lista à venda, com Ouro, nível e o que já é seu;
--   rpg_comprar_item(item)      confere nível, posse e Ouro, desconta e entrega o item.
--
-- Pode rodar mais de uma vez.

ALTER TABLE public.rpg_itens
  ADD COLUMN IF NOT EXISTS preco_ouro INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rpg_itens_preco_ouro') THEN
    ALTER TABLE public.rpg_itens ADD CONSTRAINT rpg_itens_preco_ouro CHECK (preco_ouro IS NULL OR preco_ouro > 0);
  END IF;
END $$;

-- Itens novos, pensados para o Mercado. DO NOTHING preserva o que o Admin ajustar depois.
INSERT INTO public.rpg_itens (id, slot, nome, descricao, raridade, vida, ataque, defesa, nivel_minimo, inicial, ordem)
VALUES
  ('capa_de_couro_reforcado', 'capa',     'Capa de Couro Reforçado', 'Costuras duplas para aguentar a estrada.',       'raro',    40,  0,  4, 12, false, 25),
  ('botas_ferradas',          'botas',    'Botas Ferradas',          'Pregos na sola e passo firme em qualquer chão.', 'raro',     0,  2,  5, 12, false, 26),
  ('anel_de_prata',           'joia',     'Anel de Prata',           'Frio ao toque, quente na hora da luta.',         'raro',    25,  6,  0, 13, false, 27),
  ('sabre_do_mercenario',     'arma',     'Sabre do Mercenário',     'Curvo, leve e cobrado por hora de trabalho.',    'raro',     0, 14,  0, 14, false, 28),
  ('peitoral_de_aco',         'armadura', 'Peitoral de Aço',         'Placas batidas na bigorna do Mercado.',          'raro',    80,  0,  8, 14, false, 29),
  ('machado_de_guerra',       'arma',     'Machado de Guerra',       'Pesado o bastante para abrir portões.',          'epico',    0, 18,  0, 18, false, 35),
  ('brunea_reforcada',        'armadura', 'Brunea Reforçada',        'Escamas de metal que não deixam passar nada.',   'epico',  100,  0, 10, 18, false, 36)
ON CONFLICT (id) DO NOTHING;

-- Preços: só preenche onde ainda está vazio, para não desfazer ajuste feito no Admin.
UPDATE public.rpg_itens i
   SET preco_ouro = p.preco
  FROM (VALUES
    ('botas_do_batedor',        130),
    ('amuleto_de_eter',         170),
    ('cota_de_malha',           180),
    ('capa_das_runas',          170),
    ('lamina_de_eter',          200),
    ('capa_de_couro_reforcado', 240),
    ('botas_ferradas',          220),
    ('anel_de_prata',           280),
    ('sabre_do_mercenario',     320),
    ('peitoral_de_aco',         300),
    ('machado_de_guerra',       650),
    ('brunea_reforcada',        620)
  ) AS p(id, preco)
 WHERE i.id = p.id AND i.preco_ouro IS NULL;

-- Registro de cada compra, para auditoria e para o jogador consultar.
CREATE TABLE IF NOT EXISTS public.rpg_compras (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id      TEXT NOT NULL REFERENCES public.rpg_itens(id) ON DELETE CASCADE,
  ouro         INTEGER NOT NULL CHECK (ouro > 0),
  comprado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rpg_compras_user_idx ON public.rpg_compras (user_id, comprado_em DESC);
ALTER TABLE public.rpg_compras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rpg_compras_le_as_proprias ON public.rpg_compras;
CREATE POLICY rpg_compras_le_as_proprias ON public.rpg_compras FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.rpg_compras FROM anon;
GRANT SELECT ON public.rpg_compras TO authenticated;

-- =============================================================================
-- Leitura do Mercado
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_mercado()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_nivel INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;
  v_nivel := public.calcular_nivel_usuario(v_user);

  RETURN jsonb_build_object(
    'nivel', v_nivel,
    'ouro', COALESCE((SELECT ouro FROM public.rpg_recursos WHERE user_id = v_user), 0),
    'itens', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', i.id, 'slot', i.slot, 'nome', i.nome, 'descricao', i.descricao,
               'raridade', i.raridade, 'vida', i.vida, 'ataque', i.ataque, 'defesa', i.defesa,
               'nivel_minimo', i.nivel_minimo, 'preco_ouro', i.preco_ouro,
               'possui', EXISTS (SELECT 1 FROM public.rpg_inventario v WHERE v.user_id = v_user AND v.item_id = i.id),
               'bloqueado', v_nivel < i.nivel_minimo
             ) ORDER BY i.nivel_minimo, i.preco_ouro, i.ordem)
        FROM public.rpg_itens i
       WHERE i.ativo AND i.preco_ouro IS NOT NULL
    ), '[]'::jsonb),
    -- O que está em cada slot, para a tela mostrar quanto a compra melhora.
    'equipados', COALESCE((
      SELECT jsonb_object_agg(e.slot, jsonb_build_object('nome', i.nome, 'vida', i.vida, 'ataque', i.ataque, 'defesa', i.defesa))
        FROM public.rpg_equipados e
        JOIN public.rpg_itens i ON i.id = e.item_id
       WHERE e.user_id = v_user
    ), '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_mercado() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_mercado() TO authenticated;

-- =============================================================================
-- Compra
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_comprar_item(p_item_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_item public.rpg_itens%ROWTYPE;
  v_ouro INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = v_user) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  SELECT * INTO v_item FROM public.rpg_itens WHERE id = p_item_id AND ativo AND preco_ouro IS NOT NULL;
  IF v_item.id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Este item não está à venda.');
  END IF;
  IF public.calcular_nivel_usuario(v_user) < v_item.nivel_minimo THEN
    RETURN jsonb_build_object('erro', format('Este item exige o nível %s.', v_item.nivel_minimo));
  END IF;
  IF EXISTS (SELECT 1 FROM public.rpg_inventario WHERE user_id = v_user AND item_id = v_item.id) THEN
    RETURN jsonb_build_object('erro', 'Você já tem este item. Equipe ou aprimore pelo Personagem.', 'ja_possui', true);
  END IF;

  INSERT INTO public.rpg_recursos (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT ouro INTO v_ouro FROM public.rpg_recursos WHERE user_id = v_user FOR UPDATE;
  IF v_ouro < v_item.preco_ouro THEN
    RETURN jsonb_build_object(
      'erro', format('Faltam %s de Ouro. Vença expedições e masmorras para juntar mais.', v_item.preco_ouro - v_ouro),
      'sem_ouro', true
    );
  END IF;

  UPDATE public.rpg_recursos SET ouro = ouro - v_item.preco_ouro, atualizado_em = now() WHERE user_id = v_user;
  INSERT INTO public.rpg_inventario (user_id, item_id) VALUES (v_user, v_item.id);
  INSERT INTO public.rpg_compras (user_id, item_id, ouro) VALUES (v_user, v_item.id, v_item.preco_ouro);

  RETURN jsonb_build_object('ok', true, 'item_id', v_item.id, 'slot', v_item.slot, 'ouro', v_ouro - v_item.preco_ouro);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_comprar_item(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_comprar_item(TEXT) TO authenticated;
