-- =============================================================================
-- 126 — Sem kit inicial gratuito, armas por classe/elemento e 2 pontos por nível
-- =============================================================================
--
-- O que muda:
--   1. Atributos por nível: rpg_distribuir_pontos passa de `nivel / 2` para
--      `GREATEST(0, nivel - 1) * 2` (2 pontos livres a cada nível ganho, a partir
--      do nível 2; espelha PontosDisponiveis em internal/handlers/rpg_atributos.go).
--   2. Sem kit inicial gratuito: rpg_itens.inicial vira false e
--      rpg_garantir_kit_inicial() passa a não entregar nada (quem começa precisa
--      conquistar Ouro, drops ou forja). Os 5 itens comuns de entrada passam a ser
--      vendidos no Mercado por Ouro.
--   3. Elemento nos equipamentos: coluna rpg_itens.elemento (fogo, agua, terra,
--      vento, raio, luz, trevas, eter ou NULL para neutro), preenchida nos itens
--      existentes e exposta em rpg_estado_jogador(), rpg_ficha_de_duelo(),
--      rpg_mercado() e rpg_forja().
--   4. Classes corretas nas armas + novas armas conquistáveis para todas as
--      classes (Nv 1 Comum e Nv 12 Raro no Mercado/drops/invocação): espadas
--      restritas a espadachim/paladina/assassina e machado a guerreiro — Lanceiro
--      nunca equipa espada —, desequipando slots incompatíveis sem apagar do
--      inventário.
--
-- Depende do 071, 077, 119, 121, 122 e 123. Idempotente.

-- =============================================================================
-- 1. Dois pontos de atributo por nível ganho (definição viva; antes sql/077)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_distribuir_pontos(
  p_forca INTEGER, p_inteligencia INTEGER, p_constituicao INTEGER,
  p_agilidade INTEGER, p_destreza INTEGER, p_sorte INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_disponiveis INTEGER;
  v_total       INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = v_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o personagem antes.');
  END IF;

  IF p_forca IS NULL OR p_inteligencia IS NULL OR p_constituicao IS NULL
     OR p_agilidade IS NULL OR p_destreza IS NULL OR p_sorte IS NULL
     OR LEAST(p_forca, p_inteligencia, p_constituicao, p_agilidade, p_destreza, p_sorte) < 0 THEN
    RETURN jsonb_build_object('erro', 'Pontos inválidos.');
  END IF;

  v_disponiveis := GREATEST(0, public.calcular_nivel_usuario(v_user_id) - 1) * 2;
  v_total := p_forca + p_inteligencia + p_constituicao + p_agilidade + p_destreza + p_sorte;
  IF v_total > v_disponiveis THEN
    RETURN jsonb_build_object('erro', format('Você tem %s pontos para distribuir.', v_disponiveis));
  END IF;

  INSERT INTO public.rpg_atributos AS a
    (user_id, forca, inteligencia, constituicao, agilidade, destreza, sorte)
  VALUES (v_user_id, p_forca, p_inteligencia, p_constituicao, p_agilidade, p_destreza, p_sorte)
  ON CONFLICT (user_id) DO UPDATE SET
    forca = EXCLUDED.forca, inteligencia = EXCLUDED.inteligencia,
    constituicao = EXCLUDED.constituicao, agilidade = EXCLUDED.agilidade,
    destreza = EXCLUDED.destreza, sorte = EXCLUDED.sorte, atualizado_em = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_distribuir_pontos(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_distribuir_pontos(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;

-- Calibra o chefe final para acompanhar os 2 pontos por nível ganho (antes no sql/078).
UPDATE public.rpg_monstros
   SET vida = 6380, ataque = 320, defesa = 192
 WHERE id = 'primordial_esquecido';

-- =============================================================================
-- 2. Sem kit inicial gratuito (definição viva; antes sql/071)
-- =============================================================================

UPDATE public.rpg_itens
   SET inicial = false
 WHERE inicial = true;

CREATE OR REPLACE FUNCTION public.rpg_garantir_kit_inicial()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN jsonb_build_object('ok', true, 'novos', 0);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_garantir_kit_inicial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_garantir_kit_inicial() TO authenticated;

-- =============================================================================
-- 3. Coluna elemento em rpg_itens + restrição de classes nas armas antigas
-- =============================================================================

ALTER TABLE public.rpg_itens
  ADD COLUMN IF NOT EXISTS elemento TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rpg_itens_elemento_valido') THEN
    ALTER TABLE public.rpg_itens
      ADD CONSTRAINT rpg_itens_elemento_valido
      CHECK (elemento IS NULL OR elemento IN ('fogo', 'agua', 'terra', 'vento', 'raio', 'luz', 'trevas', 'eter'));
  END IF;
END $$;

-- Espadas e machados antigos deixam de ser genéricos (Lanceiro e Maga não equipam espada/machado).
UPDATE public.rpg_itens SET classes = ARRAY['espadachim','paladina']::TEXT[]
 WHERE id IN ('espada_de_ferro', 'lamina_de_eter', 'espada_da_aurora', 'lamina_primordial');

UPDATE public.rpg_itens SET classes = ARRAY['espadachim','assassina']::TEXT[]
 WHERE id = 'sabre_do_mercenario';

UPDATE public.rpg_itens SET classes = ARRAY['guerreiro']::TEXT[]
 WHERE id = 'machado_de_guerra';

-- Preços de entrada no Mercado para os antigos itens comuns (conquistados com Ouro).
UPDATE public.rpg_itens i
   SET preco_ouro = p.preco
  FROM (VALUES
    ('espada_de_ferro',   35),
    ('gibao_de_viajante', 35),
    ('capa_de_viajante',  25),
    ('botas_de_couro',    25),
    ('anel_de_cobre',     30),
    ('lanca_de_ferro',    240)
  ) AS p(id, preco)
 WHERE i.id = p.id AND i.preco_ouro IS NULL;

-- Preenche o elemento dos equipamentos conforme conjunto/temática (só onde ainda nulo).
UPDATE public.rpg_itens SET elemento = 'fogo'
 WHERE elemento IS NULL AND (conjunto = 'carmesim' OR id IN ('lanca_carmesim', 'machado_do_nucleo'));

UPDATE public.rpg_itens SET elemento = 'agua'
 WHERE elemento IS NULL AND (conjunto = 'glacial' OR id = 'anel_de_safira');

UPDATE public.rpg_itens SET elemento = 'terra'
 WHERE elemento IS NULL AND conjunto = 'terra';

UPDATE public.rpg_itens SET elemento = 'luz'
 WHERE elemento IS NULL AND (conjunto = 'aurora' OR id = 'espada_da_aurora');

UPDATE public.rpg_itens SET elemento = 'trevas'
 WHERE elemento IS NULL AND conjunto = 'sombrio';

UPDATE public.rpg_itens SET elemento = 'eter'
 WHERE elemento IS NULL AND (conjunto = 'arcano' OR id IN ('lamina_de_eter', 'amuleto_de_eter', 'manto_estelar', 'medalhao_estelar', 'colar_de_ametista'));

UPDATE public.rpg_itens SET elemento = 'raio'
 WHERE elemento IS NULL AND id IN ('lanca_da_tempestade', 'adaga_do_relampago');

UPDATE public.rpg_itens SET elemento = 'vento'
 WHERE elemento IS NULL AND conjunto = 'silvestre';

-- =============================================================================
-- 4. Armas conquistáveis de entrada e nível médio para todas as classes
-- =============================================================================
-- Nenhuma marcada como inicial: todas são conquistadas por Ouro no Mercado,
-- drops ou invocação. DO NOTHING preserva ajustes feitos depois no Admin.

INSERT INTO public.rpg_itens (id, slot, nome, descricao, raridade, vida, ataque, defesa, magia, velocidade,
                              critico_por_mil, dano_critico, esquiva_por_mil, nivel_minimo, classes, conjunto,
                              elemento, preco_ouro, inicial, ativo, ordem)
VALUES
  ('lanca_de_madeira',    'arma', 'Lança de Treino',     'Haste leve de freixo com ponta temperada; primeira lança de quem entra na Guilda.', 'comum', 0,  4, 0,  0, 1,  0, 0, 0,  1, ARRAY['lanceiro']::TEXT[],  NULL, NULL,     35, false, true, 15),
  ('varinha_de_aprendiz', 'arma', 'Varinha de Aprendiz', 'Canaliza faíscas de mana para iniciantes na arte arcana.',                             'comum', 0,  1, 0,  4, 0,  0, 0, 0,  1, ARRAY['maga']::TEXT[],      NULL, 'eter',   35, false, true, 16),
  ('adaga_simples',       'arma', 'Adaga Simples',       'Lâmina curta e rápida para golpes certeiros de curta distância.',                      'comum', 0,  3, 0,  0, 1, 20, 0, 0,  1, ARRAY['assassina']::TEXT[], NULL, NULL,     35, false, true, 17),
  ('machado_de_lenhador', 'arma', 'Machado de Lenhador', 'Pesado e bruto; exige força para compensar a falta de equilíbrio.',                    'comum', 0,  5, 0,  0, 0,  0, 0, 0,  1, ARRAY['guerreiro']::TEXT[], NULL, NULL,     35, false, true, 18),
  ('cajado_de_safira',    'arma', 'Cajado de Safira',    'Madeira antiga com gema azulada que amplifica feitiços aquáticos.',                    'raro',  0,  2, 0, 17, 0,  0, 0, 0, 12, ARRAY['maga']::TEXT[],      NULL, 'agua',  240, false, true, 135),
  ('adaga_sombria',       'arma', 'Adaga Sombria',       'Aço escurecido que busca brechas na guarda inimiga.',                                  'raro',  0, 15, 0,  0, 2, 35, 0, 0, 12, ARRAY['assassina']::TEXT[], NULL, 'trevas',240, false, true, 136),
  ('machado_de_ferro',    'arma', 'Machado de Ferro',    'Lâmina dupla batida na bigorna; quebra escudos pelo impacto.',                         'raro',  0, 18, 0,  0, 0,  0, 0, 0, 12, ARRAY['guerreiro']::TEXT[], NULL, 'terra', 240, false, true, 137),
  ('maca_consagrada',     'arma', 'Maça Consagrada',     'Cabeça de bronze abençoada para sustentar a linha de frente.',                         'raro', 20, 15, 2,  0, 0,  0, 0, 0, 12, ARRAY['paladina']::TEXT[],  NULL, 'luz',   240, false, true, 138)
ON CONFLICT (id) DO NOTHING;

-- Limpa slots equipados que ficaram incompatíveis (ex.: Lanceiro com Espada de Ferro).
-- O item permanece no inventário.
DELETE FROM public.rpg_equipados e
 USING public.rpg_itens i, public.rpg_personagens p
 WHERE i.id = e.item_id
   AND p.user_id = e.user_id
   AND NOT public.rpg_item_serve(i.classes, i.personagem_exclusivo, p.personagem_base);

-- =============================================================================
-- 5. Leituras atualizadas com elemento e classes (definições vivas)
-- =============================================================================

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
           'visual_equipado', p.visual_equipado,
           'desbloqueados', to_jsonb(p.desbloqueados),
           'ultima_troca_em', p.ultima_troca_em)
    INTO v_personagem
    FROM public.rpg_personagens p
   WHERE p.user_id = v_user_id;

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
                 'conjunto', i.conjunto, 'elemento', i.elemento)))
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
                 'conjunto', i.conjunto, 'elemento', i.elemento)))
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
REVOKE ALL ON FUNCTION public.rpg_ficha_de_duelo(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_ficha_de_duelo(UUID, TEXT) TO service_role;

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
  v_base  TEXT;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;
  v_nivel := public.calcular_nivel_usuario(v_user);
  SELECT personagem_base INTO v_base FROM public.rpg_personagens WHERE user_id = v_user;

  RETURN jsonb_build_object(
    'nivel', v_nivel,
    'ouro', COALESCE((SELECT ouro FROM public.rpg_recursos WHERE user_id = v_user), 0),
    'personagem_base', v_base,
    'itens', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', i.id, 'slot', i.slot, 'nome', i.nome, 'descricao', i.descricao,
               'raridade', i.raridade, 'vida', i.vida, 'ataque', i.ataque, 'defesa', i.defesa,
               'magia', i.magia, 'velocidade', i.velocidade, 'critico_por_mil', i.critico_por_mil,
               'dano_critico', i.dano_critico, 'esquiva_por_mil', i.esquiva_por_mil,
               'nivel_minimo', i.nivel_minimo, 'preco_ouro', i.preco_ouro,
               'classes', i.classes, 'elemento', i.elemento,
               'serve', public.rpg_item_serve(i.classes, i.personagem_exclusivo, v_base),
               'possui', EXISTS (SELECT 1 FROM public.rpg_inventario v WHERE v.user_id = v_user AND v.item_id = i.id),
               'bloqueado', v_nivel < i.nivel_minimo
             ) ORDER BY i.nivel_minimo, i.preco_ouro, i.ordem)
        FROM public.rpg_itens i
       WHERE i.ativo AND i.preco_ouro IS NOT NULL
    ), '[]'::jsonb),
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
               'elemento', i.elemento, 'ouro', rc.ouro, 'materiais', rc.materiais,
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

NOTIFY pgrst, 'reload schema';
