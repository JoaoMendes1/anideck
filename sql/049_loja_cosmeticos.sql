-- =============================================================================
-- 049_loja_cosmeticos.sql
-- Fase 16 (16.2a e 16.2b, #170 e #171): Loja Cosmética do AniDeck
--
-- 1. store_items: catálogo de itens cosméticos (moldura, tema, cor de nome, emblema, expansão)
-- 2. user_items: posse individual de itens comprados com AniCoins (UNIQUE por usuário)
-- 3. user_equipped: slot atualmente equipado por usuário (moldura, tema_perfil, cor_nome, emblema)
-- 4. comprar_item(p_item_id): função transacional com advisory lock, conferência de saldo
--    em crystal_ledger e gravação atômica da compra
-- 5. equipar_item(p_slot, p_item_id): função para equipar/desequipar slots conferindo posse
-- 6. Trigger em profiles: expande limite da vitrine de 5 para 7 para quem possui vitrine_plus_2
-- 7. Seed inicial de cosméticos com raridade e preços em AniCoins
-- =============================================================================

-- 1. TABELA DE ITENS DA LOJA
CREATE TABLE IF NOT EXISTS public.store_items (
  id          TEXT PRIMARY KEY,
  tipo        TEXT NOT NULL CHECK (tipo IN ('moldura', 'tema_perfil', 'cor_nome', 'emblema', 'expansao')),
  nome        TEXT NOT NULL,
  descricao   TEXT NOT NULL,
  preco       INTEGER NOT NULL CHECK (preco > 0),
  raridade    TEXT NOT NULL DEFAULT 'raro' CHECK (raridade IN ('comum', 'raro', 'epico', 'lendario')),
  estilo      TEXT NOT NULL,
  icone       TEXT NOT NULL DEFAULT 'Sparkles',
  ativo       BOOLEAN NOT NULL DEFAULT true,
  ordem       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;

-- Leitura pública para itens ativos ou para administradores
DROP POLICY IF EXISTS "Leitura de itens da loja" ON public.store_items;
CREATE POLICY "Leitura de itens da loja"
  ON public.store_items
  FOR SELECT
  TO PUBLIC
  USING (ativo = true OR public.is_admin());

-- Escrita restrita a administradores
DROP POLICY IF EXISTS "Escrita de itens da loja por admin" ON public.store_items;
CREATE POLICY "Escrita de itens da loja por admin"
  ON public.store_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- 2. TABELA DE ITENS DO USUÁRIO (POSSE)
CREATE TABLE IF NOT EXISTS public.user_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id       TEXT NOT NULL REFERENCES public.store_items(id) ON DELETE RESTRICT,
  adquirido_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_items_user_id ON public.user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_items_item_id ON public.user_items(item_id);

ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

-- Leitura própria ou admin
DROP POLICY IF EXISTS "Leitura de itens próprios" ON public.user_items;
CREATE POLICY "Leitura de itens próprios"
  ON public.user_items
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Escrita bloqueada para usuários comuns (só service role e SECURITY DEFINER)
REVOKE INSERT, UPDATE, DELETE ON public.user_items FROM PUBLIC, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_items TO service_role;
GRANT SELECT ON public.user_items TO authenticated, service_role;


-- 3. TABELA DE ITENS EQUIPADOS (SLOTS ATIVOS)
CREATE TABLE IF NOT EXISTS public.user_equipped (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot          TEXT NOT NULL CHECK (slot IN ('moldura', 'tema_perfil', 'cor_nome', 'emblema')),
  item_id       TEXT NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
  equipado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_user_equipped_user_id ON public.user_equipped(user_id);

ALTER TABLE public.user_equipped ENABLE ROW LEVEL SECURITY;

-- Leitura pública para renderizar perfis, comentários e rankings
DROP POLICY IF EXISTS "Leitura pública de itens equipados" ON public.user_equipped;
CREATE POLICY "Leitura pública de itens equipados"
  ON public.user_equipped
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Escrita bloqueada direta (usa equipar_item)
REVOKE INSERT, UPDATE, DELETE ON public.user_equipped FROM PUBLIC, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_equipped TO service_role;
GRANT SELECT ON public.user_equipped TO authenticated, anon, service_role;


-- 4. FUNÇÃO ATÔMICA DE COMPRA DE ITEM DA LOJA
CREATE OR REPLACE FUNCTION public.comprar_item(p_item_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_item      RECORD;
  v_saldo     INTEGER;
  v_novo_saldo INTEGER;
  v_ref       TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_item
    FROM public.store_items
   WHERE id = p_item_id AND ativo = true;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Item inexistente ou inativo.' USING ERRCODE = 'P0002';
  END IF;

  -- Lock transacional no usuário para serializar compras e impedir corrida de saldo
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- Confere se já possui
  IF EXISTS (SELECT 1 FROM public.user_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'Você já possui este item cosmético.' USING ERRCODE = 'P0003';
  END IF;

  -- Confere saldo atual no crystal_ledger
  SELECT COALESCE(SUM(quantidade), 0)::INTEGER INTO v_saldo
    FROM public.crystal_ledger
   WHERE user_id = v_user_id;

  IF v_saldo < v_item.preco THEN
    RAISE EXCEPTION 'Saldo insuficiente de AniCoins (saldo: %, necessário: %).'
      v_saldo, v_item.preco
      USING ERRCODE = 'P0004';
  END IF;

  v_ref := 'loja:' || p_item_id || ':' || (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;

  -- Registra débito no ledger
  INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
  VALUES (v_user_id, -v_item.preco, 'loja_compra', v_ref);

  -- Registra posse
  INSERT INTO public.user_items (user_id, item_id)
  VALUES (v_user_id, p_item_id);

  -- Se for item de slot cosmético, auto-equipa no slot correspondente
  IF v_item.tipo IN ('moldura', 'tema_perfil', 'cor_nome', 'emblema') THEN
    INSERT INTO public.user_equipped (user_id, slot, item_id)
    VALUES (v_user_id, v_item.tipo, p_item_id)
    ON CONFLICT (user_id, slot) DO UPDATE
    SET item_id = EXCLUDED.item_id, equipado_em = now();
  END IF;

  v_novo_saldo := v_saldo - v_item.preco;

  RETURN jsonb_build_object(
    'sucesso', true,
    'item_id', v_item.id,
    'nome', v_item.nome,
    'tipo', v_item.tipo,
    'estilo', v_item.estilo,
    'novo_saldo', v_novo_saldo
  );
END;
$$;

REVOKE ALL ON FUNCTION public.comprar_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comprar_item(text) TO authenticated, service_role;


-- 5. FUNÇÃO PARA EQUIPAR / DESEQUIPAR ITEM
CREATE OR REPLACE FUNCTION public.equipar_item(p_slot text, p_item_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_item    RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado' USING ERRCODE = 'P0001';
  END IF;

  IF p_slot NOT IN ('moldura', 'tema_perfil', 'cor_nome', 'emblema') THEN
    RAISE EXCEPTION 'Slot inválido: %', p_slot USING ERRCODE = 'P0002';
  END IF;

  -- Se p_item_id for nulo ou vazio, desequipa o slot
  IF p_item_id IS NULL OR trim(p_item_id) = '' THEN
    DELETE FROM public.user_equipped
     WHERE user_id = v_user_id AND slot = p_slot;
    RETURN jsonb_build_object('sucesso', true, 'slot', p_slot, 'item_id', null);
  END IF;

  SELECT * INTO v_item
    FROM public.store_items
   WHERE id = p_item_id;

  IF v_item.id IS NULL OR v_item.tipo != p_slot THEN
    RAISE EXCEPTION 'Item inválido para o slot %', p_slot USING ERRCODE = 'P0003';
  END IF;

  -- Confere posse do item
  IF NOT EXISTS (SELECT 1 FROM public.user_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'Você não possui este item cosmético.' USING ERRCODE = 'P0004';
  END IF;

  INSERT INTO public.user_equipped (user_id, slot, item_id)
  VALUES (v_user_id, p_slot, p_item_id)
  ON CONFLICT (user_id, slot) DO UPDATE
  SET item_id = EXCLUDED.item_id, equipado_em = now();

  RETURN jsonb_build_object(
    'sucesso', true,
    'slot', p_slot,
    'item_id', v_item.id,
    'estilo', v_item.estilo
  );
END;
$$;

REVOKE ALL ON FUNCTION public.equipar_item(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equipar_item(text, text) TO authenticated, service_role;


-- 6. GATILHO PARA LIMITE DA VITRINE (5 SLOTS PADRÃO / 7 COM EXPANSÃO)
CREATE OR REPLACE FUNCTION public.validar_limite_vitrine()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tam INTEGER;
  v_max INTEGER := 5;
BEGIN
  IF NEW.vitrine IS NOT NULL THEN
    v_tam := array_length(NEW.vitrine, 1);
    IF v_tam > 5 THEN
      IF EXISTS (SELECT 1 FROM public.user_items WHERE user_id = NEW.user_id AND item_id = 'vitrine_plus_2') THEN
        v_max := 7;
      END IF;

      IF v_tam > v_max THEN
        RAISE EXCEPTION 'A vitrine permite no máximo % animes.', v_max USING ERRCODE = 'P0005';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_limite_vitrine ON public.profiles;
CREATE TRIGGER trg_validar_limite_vitrine
  BEFORE INSERT OR UPDATE OF vitrine ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_limite_vitrine();


-- 7. SEED INICIAL DE COSMÉTICOS
INSERT INTO public.store_items (id, tipo, nome, descricao, preco, raridade, estilo, icone, ordem)
VALUES
  -- Molduras
  ('moldura_cyber_holo', 'moldura', 'Aura Cyber Holo', 'Borda com gradiente elétrico holográfico e efeito pulsante no avatar.', 200, 'raro', 'moldura-cyber-holo', 'Sparkles', 1),
  ('moldura_ouro_shogun', 'moldura', 'Ouro Imperial da Guilda', 'Moldura dourada reluzente com brasão clássico de honra.', 350, 'epico', 'moldura-ouro-shogun', 'Crown', 2),
  ('moldura_chama_dragao', 'moldura', 'Fogo do Dragão Carmesim', 'Fogo vivo com partículas ardentes e anel carmesim incandescente.', 500, 'lendario', 'moldura-chama-dragao', 'Flame', 3),

  -- Temas de Perfil
  ('tema_neon_matrix', 'tema_perfil', 'Tema Cyber Matrix', 'Atmosfera cyberpunk verde esmeralda com grade luminosa no topo do perfil.', 250, 'raro', 'tema-neon-matrix', 'Zap', 10),
  ('tema_sakura_noir', 'tema_perfil', 'Tema Sakura Noir', 'Estética noturna japonesa sofisticada com névoa violeta e pétalas sombrias.', 400, 'epico', 'tema-sakura-noir', 'Heart', 11),

  -- Cores de Nome
  ('cor_dourada_vip', 'cor_nome', 'Nome Dourado Resplandecente', 'Seu @handle e nome de exibição brilham em dourado cintilante nos comentários e rankings.', 180, 'raro', 'cor-dourada-vip', 'Sparkles', 20),
  ('cor_ciano_holo', 'cor_nome', 'Nome Ciano Holográfico', 'Seu nome ganha destaque em ciano fluorescente com brilho cyberpunk neon.', 180, 'raro', 'cor-ciano-holo', 'Zap', 21),

  -- Emblemas
  ('emblema_coroa', 'emblema', 'Coroa da Realeza', 'Selo exclusivo de majestade ao lado do seu nome em todos os comentários.', 300, 'epico', 'emblema-coroa', 'Crown', 30),
  ('emblema_fogo', 'emblema', 'Chama Imortal', 'Ícone de labareda ardente conferindo respeito à sua presença comunitária.', 150, 'raro', 'emblema-fogo', 'Flame', 31),

  -- Expansões de Recursos
  ('vitrine_plus_2', 'expansao', 'Expansão de Vitrine (+2 Slots)', 'Melhoria permanente: exiba até 7 obras favoritas no topo do seu perfil (padrão é 5).', 450, 'lendario', 'vitrine-expandida-7', 'Award', 40)
ON CONFLICT (id) DO UPDATE
SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  preco = EXCLUDED.preco,
  raridade = EXCLUDED.raridade,
  estilo = EXCLUDED.estilo,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem;
