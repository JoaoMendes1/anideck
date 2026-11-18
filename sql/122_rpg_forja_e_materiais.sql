-- 122_rpg_forja_e_materiais.sql
-- Fase 18: Forja do Brokk, materiais e venda de itens repetidos.
--
-- 1. rpg_materiais: os materiais de cada jogador
-- 2. rpg_receitas: o que cada equipamento custa na Forja (Ouro e materiais)
-- 3. rpg_material_do_conjunto(): o cristal de cada conjunto
-- 4. rpg_ganhar_materiais(user, materiais): service role, chamada pelo Go depois da luta
-- 5. rpg_vender_repetido(item) e rpg_desmontar_repetido(item): só a cópia repetida
-- 6. rpg_forja(): a tela da Forja numa leitura
-- 7. rpg_forjar(item): confere receita, nível, posse, Ouro e materiais, e entrega o item
-- 8. Receitas dos equipamentos do sql/121
--
-- Só a cópia repetida (quantidade > 1) é vendida ou desmontada: a última cópia de um item
-- nunca some por engano, e o item equipado continua equipado.
-- Os materiais da luta são sorteados no Go (SortearMateriais), como o item da vitória.
--
-- Depende do 071, 081 (rpg_recursos.ouro) e 121. Idempotente.

-- =============================================================================
-- 1. Materiais do jogador
-- =============================================================================
-- A lista de ids repete MATERIAIS no Go (rpg_forja.go) e na tela (lib/forja.ts).

CREATE TABLE IF NOT EXISTS public.rpg_materiais (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id  TEXT NOT NULL,
  quantidade   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, material_id),
  CONSTRAINT rpg_materiais_quantidade CHECK (quantidade >= 0),
  CONSTRAINT rpg_materiais_id CHECK (material_id IN (
    'garra_de_fera', 'chifre_de_fera', 'cranio_de_fera', 'escama_de_dragao', 'pena_celeste',
    'cristal_de_gelo', 'cristal_de_fogo', 'cristal_de_luz', 'cristal_do_vazio',
    'nucleo_da_tempestade', 'gema_silvestre'))
);

ALTER TABLE public.rpg_materiais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rpg_materiais_le_o_proprio ON public.rpg_materiais;
CREATE POLICY rpg_materiais_le_o_proprio ON public.rpg_materiais
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
-- Sem escrita para o usuário: material só entra e sai pelas funções.
REVOKE ALL ON public.rpg_materiais FROM anon, authenticated;
GRANT SELECT ON public.rpg_materiais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rpg_materiais TO service_role;

-- =============================================================================
-- 2. Receitas
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rpg_receitas (
  item_id    TEXT PRIMARY KEY REFERENCES public.rpg_itens(id) ON DELETE CASCADE,
  ouro       INTEGER NOT NULL,
  -- {"material_id": quantidade, ...}
  materiais  JSONB NOT NULL DEFAULT '{}'::JSONB,
  CONSTRAINT rpg_receitas_ouro CHECK (ouro >= 0),
  CONSTRAINT rpg_receitas_materiais CHECK (jsonb_typeof(materiais) = 'object')
);

ALTER TABLE public.rpg_receitas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rpg_receitas_leitura ON public.rpg_receitas;
CREATE POLICY rpg_receitas_leitura ON public.rpg_receitas
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS rpg_receitas_escrita_admin ON public.rpg_receitas;
CREATE POLICY rpg_receitas_escrita_admin ON public.rpg_receitas
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
REVOKE ALL ON public.rpg_receitas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rpg_receitas TO authenticated;

-- =============================================================================
-- 3. O material de cada conjunto
-- =============================================================================
-- Item sem conjunto usa a Pena Celeste. Repete materialDoConjunto no Go.

CREATE OR REPLACE FUNCTION public.rpg_material_do_conjunto(p_conjunto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_conjunto
    WHEN 'glacial'   THEN 'cristal_de_gelo'
    WHEN 'carmesim'  THEN 'cristal_de_fogo'
    WHEN 'aurora'    THEN 'cristal_de_luz'
    WHEN 'sombrio'   THEN 'cristal_do_vazio'
    WHEN 'arcano'    THEN 'nucleo_da_tempestade'
    WHEN 'silvestre' THEN 'gema_silvestre'
    WHEN 'terra'     THEN 'chifre_de_fera'
    ELSE 'pena_celeste'
  END;
$$;

-- Soma materiais ao jogador. Uso interno das funções abaixo.
CREATE OR REPLACE FUNCTION public.rpg_somar_materiais(p_user UUID, p_materiais JSONB)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.rpg_materiais (user_id, material_id, quantidade)
  SELECT p_user, m.key, m.value::INTEGER
    FROM jsonb_each_text(p_materiais) m
   WHERE m.value::INTEGER > 0
  ON CONFLICT (user_id, material_id)
  DO UPDATE SET quantidade = public.rpg_materiais.quantidade + EXCLUDED.quantidade;
$$;
REVOKE ALL ON FUNCTION public.rpg_somar_materiais(UUID, JSONB) FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 4. Ganhar materiais (service role, depois da luta registrada)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_ganhar_materiais(p_user_id UUID, p_materiais JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL OR p_materiais IS NULL OR jsonb_typeof(p_materiais) <> 'object' THEN
    RETURN jsonb_build_object('erro', 'Materiais inválidos.');
  END IF;
  -- Limite por chamada: uma luta nunca dá mais que isso, e um erro no Go não vira enxurrada.
  IF (SELECT COALESCE(sum(v::INTEGER), 0) FROM jsonb_each_text(p_materiais) AS t(k, v)) > 10 THEN
    RETURN jsonb_build_object('erro', 'Materiais demais numa luta.');
  END IF;
  PERFORM public.rpg_somar_materiais(p_user_id, p_materiais);
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_ganhar_materiais(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_ganhar_materiais(UUID, JSONB) TO service_role;

-- =============================================================================
-- 5. Vender e desmontar a cópia repetida
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_valor_de_venda(p_raridade TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_raridade WHEN 'lendario' THEN 400 WHEN 'epico' THEN 120 WHEN 'raro' THEN 40 ELSE 10 END;
$$;

-- O que desmontar uma cópia rende. Repete MateriaisDeDesmontar no Go.
CREATE OR REPLACE FUNCTION public.rpg_materiais_de_desmontar(p_raridade TEXT, p_conjunto TEXT)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_raridade
    WHEN 'lendario' THEN jsonb_build_object(public.rpg_material_do_conjunto(p_conjunto), 3, 'escama_de_dragao', 1)
    WHEN 'epico'    THEN jsonb_build_object(public.rpg_material_do_conjunto(p_conjunto), 2, 'cranio_de_fera', 1)
    WHEN 'raro'     THEN jsonb_build_object('garra_de_fera', 2, 'chifre_de_fera', 1)
    ELSE jsonb_build_object('garra_de_fera', 1)
  END;
$$;

-- Tira uma cópia repetida. Devolve o erro, ou NULL quando tirou. Uso interno.
DROP FUNCTION IF EXISTS public.rpg_tirar_copia_repetida(UUID, TEXT);
CREATE FUNCTION public.rpg_tirar_copia_repetida(p_user UUID, p_item_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_qtd INTEGER;
BEGIN
  SELECT quantidade INTO v_qtd FROM public.rpg_inventario
   WHERE user_id = p_user AND item_id = p_item_id FOR UPDATE;
  IF v_qtd IS NULL THEN
    RETURN 'Você não possui este item.';
  END IF;
  IF v_qtd < 2 THEN
    RETURN 'Só cópias repetidas podem sair: esta é a única que você tem.';
  END IF;
  UPDATE public.rpg_inventario SET quantidade = quantidade - 1 WHERE user_id = p_user AND item_id = p_item_id;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_tirar_copia_repetida(UUID, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rpg_vender_repetido(p_item_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_item  public.rpg_itens;
  v_erro  TEXT;
  v_valor INTEGER;
  v_ouro  INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;
  v_erro := public.rpg_tirar_copia_repetida(v_user, p_item_id);
  IF v_erro IS NOT NULL THEN
    RETURN jsonb_build_object('erro', v_erro);
  END IF;
  SELECT * INTO v_item FROM public.rpg_itens WHERE id = p_item_id;

  v_valor := public.rpg_valor_de_venda(v_item.raridade);
  INSERT INTO public.rpg_recursos (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.rpg_recursos SET ouro = ouro + v_valor, atualizado_em = now()
   WHERE user_id = v_user RETURNING ouro INTO v_ouro;

  RETURN jsonb_build_object('ok', true, 'item_id', v_item.id, 'ouro_ganho', v_valor, 'ouro', v_ouro);
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_vender_repetido(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_vender_repetido(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpg_desmontar_repetido(p_item_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user      UUID := auth.uid();
  v_item      public.rpg_itens;
  v_erro      TEXT;
  v_materiais JSONB;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;
  v_erro := public.rpg_tirar_copia_repetida(v_user, p_item_id);
  IF v_erro IS NOT NULL THEN
    RETURN jsonb_build_object('erro', v_erro);
  END IF;
  SELECT * INTO v_item FROM public.rpg_itens WHERE id = p_item_id;

  v_materiais := public.rpg_materiais_de_desmontar(v_item.raridade, v_item.conjunto);
  PERFORM public.rpg_somar_materiais(v_user, v_materiais);
  RETURN jsonb_build_object('ok', true, 'item_id', v_item.id, 'materiais', v_materiais);
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_desmontar_repetido(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_desmontar_repetido(TEXT) TO authenticated;

-- =============================================================================
-- 6. A tela da Forja
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_forja()
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
  IF NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = v_user) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;
  v_nivel := public.calcular_nivel_usuario(v_user);

  RETURN jsonb_build_object(
    'ok', true,
    'nivel', v_nivel,
    'ouro', COALESCE((SELECT r.ouro FROM public.rpg_recursos r WHERE r.user_id = v_user), 0),
    'personagem_base', (SELECT p.personagem_base FROM public.rpg_personagens p WHERE p.user_id = v_user),
    'materiais', COALESCE((
      SELECT jsonb_object_agg(m.material_id, m.quantidade)
        FROM public.rpg_materiais m WHERE m.user_id = v_user AND m.quantidade > 0), '{}'::JSONB),
    'receitas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', i.id, 'slot', i.slot, 'nome', i.nome, 'descricao', i.descricao,
               'raridade', i.raridade, 'vida', i.vida, 'ataque', i.ataque, 'defesa', i.defesa,
               'magia', i.magia, 'velocidade', i.velocidade, 'critico_por_mil', i.critico_por_mil,
               'dano_critico', i.dano_critico, 'esquiva_por_mil', i.esquiva_por_mil,
               'nivel_minimo', i.nivel_minimo, 'classes', i.classes, 'conjunto', i.conjunto,
               'ouro', rc.ouro, 'materiais', rc.materiais,
               'possui', EXISTS (SELECT 1 FROM public.rpg_inventario inv WHERE inv.user_id = v_user AND inv.item_id = i.id),
               'bloqueado', v_nivel < i.nivel_minimo)
             ORDER BY i.nivel_minimo, i.ordem)
        FROM public.rpg_receitas rc
        JOIN public.rpg_itens i ON i.id = rc.item_id AND i.ativo), '[]'::JSONB)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_forja() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_forja() TO authenticated;

-- =============================================================================
-- 7. Forjar
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_forjar(p_item_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_item    public.rpg_itens%ROWTYPE;
  v_receita public.rpg_receitas%ROWTYPE;
  v_ouro    INTEGER;
  v_falta   TEXT;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = v_user) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  SELECT * INTO v_receita FROM public.rpg_receitas WHERE item_id = p_item_id;
  SELECT * INTO v_item FROM public.rpg_itens WHERE id = p_item_id AND ativo;
  IF v_receita.item_id IS NULL OR v_item.id IS NULL THEN
    RETURN jsonb_build_object('erro', 'O Brokk não sabe forjar este item.');
  END IF;
  IF public.calcular_nivel_usuario(v_user) < v_item.nivel_minimo THEN
    RETURN jsonb_build_object('erro', format('Este item exige o nível %s.', v_item.nivel_minimo));
  END IF;
  IF EXISTS (SELECT 1 FROM public.rpg_inventario WHERE user_id = v_user AND item_id = v_item.id) THEN
    RETURN jsonb_build_object('erro', 'Você já tem este item.');
  END IF;

  -- Trava as linhas antes de conferir, para duas forjas ao mesmo tempo não gastarem o mesmo material.
  INSERT INTO public.rpg_recursos (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT ouro INTO v_ouro FROM public.rpg_recursos WHERE user_id = v_user FOR UPDATE;
  PERFORM 1 FROM public.rpg_materiais WHERE user_id = v_user FOR UPDATE;

  IF v_ouro < v_receita.ouro THEN
    RETURN jsonb_build_object('erro', format('Faltam %s de Ouro.', v_receita.ouro - v_ouro), 'sem_ouro', true);
  END IF;
  SELECT string_agg(format('%s %s', r.precisa - COALESCE(m.quantidade, 0), r.material_id), ', ')
    INTO v_falta
    FROM (SELECT key AS material_id, value::INTEGER AS precisa FROM jsonb_each_text(v_receita.materiais)) r
    LEFT JOIN public.rpg_materiais m ON m.user_id = v_user AND m.material_id = r.material_id
   WHERE COALESCE(m.quantidade, 0) < r.precisa;
  IF v_falta IS NOT NULL THEN
    RETURN jsonb_build_object('erro', 'Faltam materiais.', 'faltam', v_falta, 'sem_material', true);
  END IF;

  UPDATE public.rpg_recursos SET ouro = ouro - v_receita.ouro, atualizado_em = now() WHERE user_id = v_user;
  UPDATE public.rpg_materiais m
     SET quantidade = m.quantidade - r.value::INTEGER
    FROM jsonb_each_text(v_receita.materiais) r
   WHERE m.user_id = v_user AND m.material_id = r.key;
  INSERT INTO public.rpg_inventario (user_id, item_id) VALUES (v_user, v_item.id);

  RETURN jsonb_build_object('ok', true, 'item_id', v_item.id, 'slot', v_item.slot, 'ouro', v_ouro - v_receita.ouro);
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_forjar(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_forjar(TEXT) TO authenticated;

-- =============================================================================
-- 8. Receitas dos equipamentos do sql/121
-- =============================================================================
-- Raro: 150 de Ouro, 3 Garras e 2 Chifres. Épico: 450 de Ouro, 4 do material do conjunto,
-- 4 Garras e 1 Crânio. Lendário: 1.500 de Ouro, 8 do material do conjunto, 3 Crânios e
-- 2 Escamas de Dragão. DO NOTHING preserva o que o Admin ajustar depois.

INSERT INTO public.rpg_receitas (item_id, ouro, materiais)
SELECT i.id,
       CASE i.raridade WHEN 'lendario' THEN 1500 WHEN 'epico' THEN 450 ELSE 150 END,
       CASE i.raridade
         WHEN 'lendario' THEN jsonb_build_object(public.rpg_material_do_conjunto(i.conjunto), 8, 'cranio_de_fera', 3, 'escama_de_dragao', 2)
         WHEN 'epico'    THEN jsonb_build_object(public.rpg_material_do_conjunto(i.conjunto), 4, 'garra_de_fera', 4, 'cranio_de_fera', 1)
         ELSE jsonb_build_object('garra_de_fera', 3, 'chifre_de_fera', 2)
       END
  FROM public.rpg_itens i
 WHERE i.ordem >= 100 AND i.ativo AND i.raridade IN ('raro', 'epico', 'lendario')
ON CONFLICT (item_id) DO NOTHING;

-- =============================================================================
-- Como conferir (roda e desfaz; troque o UUID)
-- =============================================================================
--
-- BEGIN;
--   SELECT public.rpg_ganhar_materiais('<UUID>', '{"cristal_de_gelo": 4, "garra_de_fera": 4, "cranio_de_fera": 1}');
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID>","role":"authenticated"}', true);
--   SELECT public.rpg_forja()->'materiais';
--   SELECT public.rpg_forjar('elmo_alado');   -- ok, se tiver o nível e 450 de Ouro
-- ROLLBACK;
