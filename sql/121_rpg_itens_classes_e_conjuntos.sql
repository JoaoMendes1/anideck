-- 121_rpg_itens_classes_e_conjuntos.sql
-- Fase 18: equipamento com mais atributos, arma por classe, conjuntos, elmo e luvas.
--
-- 1. rpg_itens ganha Magia, Velocidade, Crítico, Dano Crítico, Esquiva, as classes que podem
--    usar o item, o personagem exclusivo (para o futuro) e o conjunto
-- 2. Dois slots novos: elmo e luvas
-- 3. rpg_classe_do_personagem() e rpg_item_serve(): quem pode usar o quê
-- 4. rpg_equipar_item confere a classe
-- 5. Trocar de personagem desequipa o que não serve à classe nova (gatilho)
-- 6. Limpeza: desequipa hoje o que já não serve. O item volta ao inventário, nada é apagado
-- 7. rpg_estado_jogador (sql/084) e rpg_ficha_de_duelo (sql/093) devolvem os campos novos
-- 8. Catálogo: 41 equipamentos Épicos e Lendários
--
-- Regra de uso: `classes` NULL serve a todos; lista vazia não serve a ninguém (item reservado
-- para uma classe que ainda não existe). `personagem_exclusivo`, quando preenchido, vale no
-- lugar das classes. Os bônus de conjunto são calculados no Go (SomarAtributos), não aqui.
--
-- Depende do 071, 080, 084 e 093. Não depende do 119 nem do 120.
-- Idempotente: pode ser reaplicado sem efeito.

-- =============================================================================
-- 1. Colunas novas
-- =============================================================================

ALTER TABLE public.rpg_itens
  ADD COLUMN IF NOT EXISTS magia                INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS velocidade           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS critico_por_mil      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dano_critico         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS esquiva_por_mil      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS classes              TEXT[],
  ADD COLUMN IF NOT EXISTS personagem_exclusivo TEXT,
  ADD COLUMN IF NOT EXISTS conjunto             TEXT;

ALTER TABLE public.rpg_itens DROP CONSTRAINT IF EXISTS rpg_itens_atributos_novos;
ALTER TABLE public.rpg_itens ADD CONSTRAINT rpg_itens_atributos_novos CHECK (
  magia >= 0 AND velocidade >= 0 AND critico_por_mil >= 0 AND dano_critico >= 0 AND esquiva_por_mil >= 0);

ALTER TABLE public.rpg_itens DROP CONSTRAINT IF EXISTS rpg_itens_conjunto_formato;
ALTER TABLE public.rpg_itens ADD CONSTRAINT rpg_itens_conjunto_formato CHECK (
  conjunto IS NULL OR conjunto ~ '^[a-z0-9_]{1,30}$');

-- =============================================================================
-- 2. Slots elmo e luvas
-- =============================================================================
-- A lista repete SlotsRPG() no Go e SLOTS_RPG na tela.

ALTER TABLE public.rpg_itens DROP CONSTRAINT IF EXISTS rpg_itens_slot;
ALTER TABLE public.rpg_itens ADD CONSTRAINT rpg_itens_slot
  CHECK (slot IN ('arma', 'elmo', 'armadura', 'luvas', 'capa', 'botas', 'joia'));

ALTER TABLE public.rpg_equipados DROP CONSTRAINT IF EXISTS rpg_equipados_slot;
ALTER TABLE public.rpg_equipados ADD CONSTRAINT rpg_equipados_slot
  CHECK (slot IN ('arma', 'elmo', 'armadura', 'luvas', 'capa', 'botas', 'joia'));

-- =============================================================================
-- 3. Quem pode usar o quê
-- =============================================================================
-- A classe de cada personagem repete PersonagensBase() no Go (internal/handlers/personagem.go).
-- Personagem desconhecido é tratado como o padrão, como no Go.

CREATE OR REPLACE FUNCTION public.rpg_classe_do_personagem(p_base TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_base
    WHEN 'lanceiro_fogo'   THEN 'lanceiro'
    WHEN 'assassina_raio'  THEN 'assassina'
    WHEN 'maga_agua'       THEN 'maga'
    WHEN 'guerreiro_terra' THEN 'guerreiro'
    WHEN 'paladina_luz'    THEN 'paladina'
    ELSE 'espadachim'
  END;
$$;

CREATE OR REPLACE FUNCTION public.rpg_item_serve(p_classes TEXT[], p_exclusivo TEXT, p_base TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN p_exclusivo IS NOT NULL THEN p_exclusivo = COALESCE(p_base, 'espadachim_eter')
    WHEN p_classes IS NULL THEN true
    ELSE public.rpg_classe_do_personagem(p_base) = ANY (p_classes)
  END;
$$;

-- =============================================================================
-- 4. Equipar confere a classe
-- =============================================================================
-- Igual ao sql/071, com os slots novos e a conferência de classe.

CREATE OR REPLACE FUNCTION public.rpg_equipar_item(p_slot TEXT, p_item_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_item    public.rpg_itens%ROWTYPE;
  v_base    TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF p_slot IS NULL OR p_slot NOT IN ('arma', 'elmo', 'armadura', 'luvas', 'capa', 'botas', 'joia') THEN
    RETURN jsonb_build_object('erro', 'Slot inválido.');
  END IF;

  -- Sem item, o slot é esvaziado.
  IF p_item_id IS NULL OR btrim(p_item_id) = '' THEN
    DELETE FROM public.rpg_equipados WHERE user_id = v_user_id AND slot = p_slot;
    RETURN jsonb_build_object('ok', true, 'slot', p_slot, 'item_id', NULL);
  END IF;

  SELECT * INTO v_item FROM public.rpg_itens WHERE id = p_item_id AND ativo = true;
  IF v_item.id IS NULL OR v_item.slot <> p_slot THEN
    RETURN jsonb_build_object('erro', 'Este item não serve neste slot.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.rpg_inventario WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RETURN jsonb_build_object('erro', 'Você não possui este item.');
  END IF;

  SELECT personagem_base INTO v_base FROM public.rpg_personagens WHERE user_id = v_user_id;
  IF NOT public.rpg_item_serve(v_item.classes, v_item.personagem_exclusivo, v_base) THEN
    RETURN jsonb_build_object('erro', 'Este item não serve para o seu personagem.');
  END IF;

  IF public.calcular_nivel_usuario(v_user_id) < v_item.nivel_minimo THEN
    RETURN jsonb_build_object('erro', format('Este item exige o nível %s.', v_item.nivel_minimo));
  END IF;

  INSERT INTO public.rpg_equipados (user_id, slot, item_id)
  VALUES (v_user_id, p_slot, p_item_id)
  ON CONFLICT (user_id, slot) DO UPDATE
    SET item_id = EXCLUDED.item_id, equipado_em = now();

  RETURN jsonb_build_object('ok', true, 'slot', p_slot, 'item_id', p_item_id);
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_equipar_item(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_equipar_item(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 5. Trocar de personagem desequipa o que não serve
-- =============================================================================
-- Gatilho, e não código no Go, para valer em qualquer caminho que mude o personagem.

CREATE OR REPLACE FUNCTION public.rpg_desequipar_o_que_nao_serve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.rpg_equipados e
   USING public.rpg_itens i
   WHERE e.user_id = NEW.user_id
     AND i.id = e.item_id
     AND NOT public.rpg_item_serve(i.classes, i.personagem_exclusivo, NEW.personagem_base);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_desequipar_o_que_nao_serve() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS rpg_personagens_desequipar ON public.rpg_personagens;
CREATE TRIGGER rpg_personagens_desequipar
  AFTER UPDATE OF personagem_base ON public.rpg_personagens
  FOR EACH ROW
  WHEN (OLD.personagem_base IS DISTINCT FROM NEW.personagem_base)
  EXECUTE FUNCTION public.rpg_desequipar_o_que_nao_serve();

-- =============================================================================
-- 6. Limpeza do que já está equipado
-- =============================================================================
-- Só apaga a linha do slot: o item continua no inventário.

DELETE FROM public.rpg_equipados e
 USING public.rpg_itens i, public.rpg_personagens p
 WHERE i.id = e.item_id
   AND p.user_id = e.user_id
   AND NOT public.rpg_item_serve(i.classes, i.personagem_exclusivo, p.personagem_base);

-- =============================================================================
-- 7. Leituras com os campos novos
-- =============================================================================
-- Iguais às do sql/084 e do sql/093; muda só o objeto de cada item.

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
                 'defesa', i.defesa, 'nivel_minimo', i.nivel_minimo,
                 'magia', i.magia, 'velocidade', i.velocidade, 'critico_por_mil', i.critico_por_mil,
                 'dano_critico', i.dano_critico, 'esquiva_por_mil', i.esquiva_por_mil,
                 'classes', i.classes, 'personagem_exclusivo', i.personagem_exclusivo,
                 'conjunto', i.conjunto)))
        FROM public.rpg_inventario inv
        JOIN public.rpg_itens i ON i.id = inv.item_id AND i.ativo = true
       WHERE inv.user_id = v_user_id), '[]'::JSONB),
    'equipados', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slot', e.slot, 'item_id', e.item_id))
        FROM public.rpg_equipados e
       WHERE e.user_id = v_user_id), '[]'::JSONB),
    'bilhetes', COALESCE((SELECT r.bilhetes FROM public.rpg_recursos r WHERE r.user_id = v_user_id), 0),
    'ouro', COALESCE((SELECT r.ouro FROM public.rpg_recursos r WHERE r.user_id = v_user_id), 0),
    'maestria', COALESCE((
      SELECT jsonb_object_agg(m.habilidade_id, m.usos)
        FROM public.rpg_maestria m
       WHERE m.user_id = v_user_id), '{}'::JSONB),
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

CREATE OR REPLACE FUNCTION public.rpg_ficha_de_duelo(p_desafiante UUID, p_handle TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_alvo UUID;
  v_nome TEXT;
  v_personagem JSONB;
BEGIN
  SELECT p.user_id, p.nome INTO v_alvo, v_nome
    FROM public.profiles p
    JOIN public.rpg_personagens r ON r.user_id = p.user_id
   WHERE p.handle = lower(btrim(p_handle)) AND p.publico;
  IF v_alvo IS NULL THEN
    RETURN jsonb_build_object('erro', 'Oponente não encontrado. Ele pode ter fechado o perfil.');
  END IF;
  IF v_alvo = p_desafiante THEN
    RETURN jsonb_build_object('erro', 'Você não pode duelar consigo mesmo.');
  END IF;

  SELECT jsonb_build_object('nome', r.nome, 'personagem_base', r.personagem_base, 'criado_em', r.criado_em, 'visual_equipado', r.visual_equipado)
    INTO v_personagem
    FROM public.rpg_personagens r WHERE r.user_id = v_alvo;

  -- Mesmo formato de rpg_estado_jogador(), sem cosméticos e skins, que não lutam.
  RETURN jsonb_build_object(
    'ok', true,
    'nome_perfil', v_nome,
    'personagem', v_personagem,
    'xp_total', (SELECT COALESCE(sum(x.xp_earned), 0) FROM public.xp_ledger x WHERE x.user_id = v_alvo),
    'inventario', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'quantidade', inv.quantidade,
               'aprimoramento', inv.aprimoramento,
               'rpg_itens', jsonb_build_object(
                 'id', i.id, 'slot', i.slot, 'nome', i.nome, 'descricao', i.descricao,
                 'raridade', i.raridade, 'vida', i.vida, 'ataque', i.ataque,
                 'defesa', i.defesa, 'nivel_minimo', i.nivel_minimo,
                 'magia', i.magia, 'velocidade', i.velocidade, 'critico_por_mil', i.critico_por_mil,
                 'dano_critico', i.dano_critico, 'esquiva_por_mil', i.esquiva_por_mil,
                 'classes', i.classes, 'personagem_exclusivo', i.personagem_exclusivo,
                 'conjunto', i.conjunto)))
        FROM public.rpg_inventario inv
        JOIN public.rpg_itens i ON i.id = inv.item_id AND i.ativo = true
       WHERE inv.user_id = v_alvo), '[]'::JSONB),
    'equipados', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slot', e.slot, 'item_id', e.item_id))
        FROM public.rpg_equipados e WHERE e.user_id = v_alvo), '[]'::JSONB),
    'maestria', COALESCE((
      SELECT jsonb_object_agg(m.habilidade_id, m.usos) FROM public.rpg_maestria m WHERE m.user_id = v_alvo), '{}'::JSONB),
    'pontos', COALESCE((
      SELECT jsonb_build_object(
               'forca', a.forca, 'inteligencia', a.inteligencia, 'constituicao', a.constituicao,
               'agilidade', a.agilidade, 'destreza', a.destreza, 'sorte', a.sorte)
        FROM public.rpg_atributos a WHERE a.user_id = v_alvo), '{}'::JSONB)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_ficha_de_duelo(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_ficha_de_duelo(UUID, TEXT) TO service_role;

-- =============================================================================
-- 8. Catálogo
-- =============================================================================
-- Épicos a partir do nível 26, Lendários a partir do 50. O Arco Silvestre nasce inativo:
-- espera a classe de arqueiro. DO NOTHING preserva o que o Admin ajustar depois; os números
-- são ponto de partida de balanceamento.
--
-- Os itens antigos ficam com `classes` NULL: são equipamento genérico de aventureiro, e a
-- Espada de Ferro é do kit inicial de todos os personagens.

INSERT INTO public.rpg_itens (id, slot, nome, descricao, raridade, vida, ataque, defesa, magia, velocidade,
                              critico_por_mil, dano_critico, esquiva_por_mil, nivel_minimo, classes, conjunto, ativo, ordem)
VALUES
  ('lamina_glacial', 'arma', 'Lâmina Glacial', 'Forjada no gelo eterno do norte; o fio nunca derrete.', 'lendario', 0, 49, 0, 0, 2, 36, 12, 0, 50, ARRAY['espadachim','paladina']::TEXT[], 'glacial', true, 100),
  ('espada_carmesim', 'arma', 'Espada Carmesim', 'A lâmina ferve com o sangue de quem já a empunhou.', 'epico', 0, 31, 0, 0, 0, 0, 14, 0, 26, ARRAY['espadachim','paladina']::TEXT[], 'carmesim', true, 101),
  ('espada_solar', 'arma', 'Espada Solar', 'Abençoada ao nascer do sol; brilha mais forte diante da escuridão.', 'lendario', 50, 49, 3, 0, 0, 30, 0, 0, 50, ARRAY['espadachim','paladina']::TEXT[], 'aurora', true, 102),
  ('adaga_abissal', 'arma', 'Adaga Abissal', 'Vibra com a energia das tempestades sem lua.', 'epico', 0, 27, 0, 0, 3, 60, 0, 0, 26, ARRAY['assassina']::TEXT[], 'sombrio', true, 103),
  ('foice_do_vazio', 'arma', 'Foice do Vazio', 'Corta o espaço entre um instante e outro.', 'lendario', 0, 53, 0, 0, 0, 0, 16, 30, 50, ARRAY['assassina']::TEXT[], 'sombrio', true, 104),
  ('lanca_da_tempestade', 'arma', 'Lança da Tempestade', 'A ponta atrai os raios; o cabo guarda o calor da forja.', 'epico', 0, 32, 0, 0, 2, 0, 0, 0, 26, ARRAY['lanceiro']::TEXT[], NULL, true, 105),
  ('cajado_arcano', 'arma', 'Cajado Arcano', 'A gema no topo pulsa no ritmo do coração de quem o segura.', 'epico', 0, 0, 0, 31, 0, 30, 0, 0, 26, ARRAY['maga']::TEXT[], 'arcano', true, 106),
  ('grimorio_sombrio', 'arma', 'Grimório Sombrio', 'Páginas que se escrevem sozinhas com feitiços esquecidos.', 'lendario', 0, 4, 0, 51, 0, 0, 14, 0, 50, ARRAY['maga']::TEXT[], 'arcano', true, 107),
  ('orbe_arcano', 'arma', 'Orbe Arcano', 'Uma noite estrelada presa em cristal.', 'epico', 88, 0, 0, 29, 0, 0, 0, 0, 26, ARRAY['maga','paladina']::TEXT[], 'arcano', true, 108),
  ('arco_silvestre', 'arma', 'Arco Silvestre', 'Vivo: ainda brota folhas na primavera. Reservado para uma futura classe de arqueiro.', 'epico', 0, 24, 0, 0, 4, 48, 0, 24, 26, '{}'::TEXT[], 'silvestre', false, 109),
  ('elmo_alado', 'elmo', 'Elmo Alado', 'Asas de prata que cortam o vento gelado.', 'epico', 90, 2, 4, 0, 2, 0, 0, 0, 26, NULL, 'glacial', true, 110),
  ('capuz_das_sombras', 'elmo', 'Capuz das Sombras', 'Quem o veste some do canto do olho dos inimigos.', 'epico', 90, 0, 0, 0, 2, 36, 0, 48, 26, NULL, 'sombrio', true, 111),
  ('coroa_real', 'elmo', 'Coroa Real', 'Pertenceu a uma rainha que governou pela magia.', 'lendario', 248, 0, 0, 9, 0, 0, 0, 0, 50, NULL, 'arcano', true, 112),
  ('elmo_demoniaco', 'elmo', 'Elmo Demoníaco', 'Os chifres ainda estão quentes.', 'epico', 90, 9, 0, 0, 0, 0, 0, 0, 26, NULL, 'carmesim', true, 113),
  ('elmo_silvestre', 'elmo', 'Elmo Silvestre', 'Galhadas de um cervo ancestral protegem quem o usa.', 'epico', 154, 0, 3, 0, 0, 0, 0, 30, 26, NULL, 'silvestre', true, 114),
  ('armadura_glacial', 'armadura', 'Armadura Glacial', 'Placas de gelo azul que nunca racham.', 'epico', 124, 2, 15, 0, 0, 0, 0, 0, 26, NULL, 'glacial', true, 115),
  ('armadura_carmesim', 'armadura', 'Armadura Carmesim', 'Escamas negras com veios de brasa.', 'epico', 100, 7, 12, 0, 0, 0, 0, 0, 26, NULL, 'carmesim', true, 116),
  ('armadura_da_aurora', 'armadura', 'Armadura da Aurora', 'Ouro e luz; dizem que só aceita portadores de coração puro.', 'lendario', 250, 3, 27, 0, 0, 0, 0, 0, 50, NULL, 'aurora', true, 117),
  ('manto_arcano', 'armadura', 'Manto Arcano', 'Tecido de seda estelar bordado com runas.', 'epico', 60, 0, 12, 9, 0, 0, 0, 24, 26, NULL, 'arcano', true, 118),
  ('manoplas_glaciais', 'luvas', 'Manoplas Glaciais', 'O toque congela a água no ar.', 'epico', 0, 6, 2, 0, 0, 50, 0, 0, 26, NULL, 'glacial', true, 119),
  ('garras_sombrias', 'luvas', 'Garras Sombrias', 'Cada dedo termina numa lâmina silenciosa.', 'epico', 0, 3, 0, 0, 2, 24, 18, 0, 26, NULL, 'sombrio', true, 120),
  ('manoplas_da_aurora', 'luvas', 'Manoplas da Aurora', 'Penas douradas que brilham a cada golpe certeiro.', 'epico', 30, 3, 2, 0, 0, 50, 0, 0, 26, NULL, 'aurora', true, 121),
  ('botas_glaciais', 'botas', 'Botas Glaciais', 'Deixam pegadas de geada.', 'epico', 0, 2, 7, 0, 5, 0, 0, 24, 26, NULL, 'glacial', true, 122),
  ('botas_sombrias', 'botas', 'Botas Sombrias', 'Não fazem som algum, nem na pedra.', 'epico', 0, 2, 4, 0, 5, 30, 0, 42, 26, NULL, 'sombrio', true, 123),
  ('botas_da_aurora', 'botas', 'Botas da Aurora', 'Caminham sobre a luz da manhã.', 'epico', 56, 2, 7, 0, 5, 0, 0, 0, 26, NULL, 'aurora', true, 124),
  ('capa_carmesim', 'capa', 'Capa Carmesim', 'Esvoaça como chama mesmo sem vento.', 'epico', 0, 6, 0, 0, 0, 0, 8, 40, 26, NULL, 'carmesim', true, 125),
  ('capa_real', 'capa', 'Capa Real', 'Pele de lobo das neves e fios de ouro.', 'epico', 86, 0, 10, 2, 0, 0, 0, 0, 26, NULL, NULL, true, 126),
  ('capa_arcana', 'capa', 'Capa Arcana', 'O forro mostra um céu que não é deste mundo.', 'epico', 30, 0, 7, 7, 0, 0, 0, 30, 26, NULL, 'arcano', true, 127),
  ('anel_de_safira', 'joia', 'Anel de Safira', 'A safira guarda uma gota do primeiro oceano.', 'epico', 0, 0, 0, 17, 0, 24, 0, 0, 26, NULL, NULL, true, 128),
  ('colar_de_ametista', 'joia', 'Colar de Ametista', 'Pende sempre apontando para o perigo.', 'epico', 0, 2, 0, 3, 0, 36, 15, 0, 26, NULL, NULL, true, 129),
  ('medalhao_estelar', 'joia', 'Medalhão Estelar', 'Uma estrela caída, cunhada em ouro.', 'lendario', 40, 18, 0, 0, 2, 36, 10, 0, 50, NULL, NULL, true, 130),
  ('martelo_da_montanha', 'arma', 'Martelo da Montanha', 'Runas anãs gravadas a fogo; cada golpe ecoa como um desabamento.', 'epico', 0, 31, 3, 0, 0, 0, 0, 0, 26, ARRAY['guerreiro']::TEXT[], 'terra', true, 131),
  ('machado_do_nucleo', 'arma', 'Machado do Núcleo', 'Talhado de rocha vulcânica; o coração de magma ainda pulsa.', 'lendario', 40, 53, 0, 0, 0, 0, 14, 0, 50, ARRAY['guerreiro']::TEXT[], 'terra', true, 132),
  ('lanca_carmesim', 'arma', 'Lança Carmesim', 'A ponta é uma chama que nunca se apaga.', 'lendario', 0, 49, 0, 0, 2, 36, 12, 0, 50, ARRAY['lanceiro']::TEXT[], 'carmesim', true, 133),
  ('lanca_de_ferro', 'arma', 'Lança de Ferro', 'Simples e confiável; a fita vermelha é tradição dos lanceiros novatos.', 'raro', 0, 17, 0, 0, 2, 0, 0, 0, 12, ARRAY['lanceiro']::TEXT[], NULL, true, 134),
  ('adaga_do_relampago', 'arma', 'Adaga do Relâmpago', 'Rápida como o trovão: o corte chega antes do som.', 'lendario', 0, 49, 0, 0, 3, 60, 0, 24, 50, ARRAY['assassina']::TEXT[], 'sombrio', true, 135),
  ('martelo_sagrado', 'arma', 'Martelo Sagrado', 'Um pequeno sol preso no metal abençoado.', 'epico', 40, 28, 3, 0, 0, 0, 0, 0, 26, ARRAY['paladina','guerreiro']::TEXT[], 'aurora', true, 136),
  ('elmo_de_pedra', 'elmo', 'Elmo de Pedra', 'Esculpido de uma só rocha da montanha.', 'epico', 90, 2, 6, 0, 0, 0, 0, 0, 26, NULL, 'terra', true, 137),
  ('armadura_de_pedra', 'armadura', 'Armadura de Pedra', 'Pesada como uma muralha, quente como a forja.', 'epico', 124, 2, 15, 0, 0, 0, 0, 0, 26, NULL, 'terra', true, 138),
  ('manoplas_de_pedra', 'luvas', 'Manoplas de Pedra', 'Socos que racham escudos.', 'epico', 0, 6, 2, 0, 0, 0, 18, 0, 26, NULL, 'terra', true, 139),
  ('botas_de_pedra', 'botas', 'Botas de Pedra', 'Lentas, mas nada as derruba.', 'epico', 48, 0, 10, 0, 5, 0, 0, 0, 26, NULL, 'terra', true, 140)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Como conferir (roda e desfaz; troque o UUID por um usuário que já despertou)
-- =============================================================================
--
-- BEGIN;
--   INSERT INTO public.rpg_inventario (user_id, item_id) VALUES ('<UUID>', 'grimorio_sombrio') ON CONFLICT DO NOTHING;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID>","role":"authenticated"}', true);
--   SELECT public.rpg_equipar_item('arma', 'grimorio_sombrio');   -- erro, se não for a Maga
--   SELECT public.rpg_estado_jogador()->'inventario'->0->'rpg_itens'; -- já com magia, classes, conjunto
-- ROLLBACK;
