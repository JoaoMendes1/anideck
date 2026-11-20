-- 129_rpg_conjuntos_completos.sql
-- Fase 18: conjuntos completos, com uma peça para cada slot.
--
-- 1. As linhas de elemento do sql/127 viram 6 conjuntos de entrada: Brasa (fogo), Maré (água),
--    Trovão (raio), Rocha (terra), Alvorada (luz) e Névoa (éter)
-- 2. 18 peças Raras (armadura, capa e botas) completam esses 6 conjuntos, no Mercado
-- 3. 21 peças Épicas (nível 28) completam os 7 conjuntos de 18/11, na Forja: Glacial,
--    Carmesim, Aurora, Sombrio, Arcano, Terra e Silvestre
-- 4. Receitas das 21 Épicas, como as do sql/122
--
-- Os bônus de 2, 4 e 6 peças moram no Go (rpg_conjuntos.go); aqui só o id do conjunto em cada
-- item. DO NOTHING preserva o que o Admin ajustar depois.
--
-- Depende do 121, 122, 126 e 127. Idempotente.

-- =============================================================================
-- 1. Conjuntos de entrada a partir das peças do sql/127
-- =============================================================================

UPDATE public.rpg_itens SET conjunto = 'brasa' WHERE id IN ('tiara_de_brasas', 'manoplas_de_brasa', 'anel_de_brasa', 'lanca_de_brasa', 'lanca_vulcanica');
UPDATE public.rpg_itens SET conjunto = 'mare' WHERE id IN ('capuz_da_mare', 'luvas_da_corrente', 'pingente_da_mare', 'tomo_da_mare', 'cajado_da_mare');
UPDATE public.rpg_itens SET conjunto = 'trovao' WHERE id IN ('elmo_do_trovao', 'luvas_estaticas', 'anel_do_trovao', 'adagas_gemeas_do_trovao', 'sabre_relampago');
UPDATE public.rpg_itens SET conjunto = 'rocha' WHERE id IN ('elmo_de_ferro', 'braceletes_de_ferro', 'amuleto_de_rocha', 'martelo_de_pedra', 'machado_de_granito');
UPDATE public.rpg_itens SET conjunto = 'alvorada' WHERE id IN ('diadema_solar', 'manoplas_consagradas', 'broche_solar', 'maca_da_alvorada');
UPDATE public.rpg_itens SET conjunto = 'nevoa' WHERE id IN ('mascara_de_eter', 'luvas_do_eter', 'talisma_do_eter', 'katana_do_eter');

-- =============================================================================
-- 2 e 3. Peças novas
-- =============================================================================

INSERT INTO public.rpg_itens (id, slot, nome, descricao, raridade, vida, ataque, defesa, magia, velocidade,
                              critico_por_mil, dano_critico, esquiva_por_mil, nivel_minimo, classes, conjunto,
                              elemento, preco_ouro, inicial, ativo, ordem)
VALUES
  ('capa_glacial', 'capa', 'Capa Glacial', 'Pele de urso das neves com cristais de gelo que nunca derretem.', 'epico', 30, 0, 0, 6, 0, 0, 0, 40, 28, NULL, 'glacial', 'agua', NULL, false, true, 300),
  ('anel_glacial', 'joia', 'Anel Glacial', 'Um anel de gelo eterno que deixa a mente fria na batalha.', 'epico', 0, 0, 0, 12, 0, 20, 0, 0, 28, NULL, 'glacial', 'agua', NULL, false, true, 301),
  ('manoplas_carmesim', 'luvas', 'Manoplas Carmesim', 'Escamas negras com veios de brasa; cada soco queima.', 'epico', 0, 5, 0, 0, 0, 0, 18, 0, 28, NULL, 'carmesim', 'fogo', NULL, false, true, 302),
  ('botas_carmesim', 'botas', 'Botas Carmesim', 'Deixam pegadas de cinza quente por onde passam.', 'epico', 0, 3, 4, 0, 5, 0, 0, 0, 28, NULL, 'carmesim', 'fogo', NULL, false, true, 303),
  ('colar_carmesim', 'joia', 'Colar Carmesim', 'Um rubi que pulsa como um coração em chamas.', 'epico', 0, 10, 0, 0, 0, 0, 10, 0, 28, NULL, 'carmesim', 'fogo', NULL, false, true, 304),
  ('elmo_da_aurora', 'elmo', 'Elmo da Aurora', 'Ouro branco com asas pequenas que brilham ao amanhecer.', 'epico', 90, 0, 4, 0, 0, 0, 0, 0, 28, NULL, 'aurora', 'luz', NULL, false, true, 305),
  ('capa_da_aurora', 'capa', 'Capa da Aurora', 'Tecido creme bordado com raios de sol dourados.', 'epico', 70, 0, 7, 0, 0, 0, 0, 0, 28, NULL, 'aurora', 'luz', NULL, false, true, 306),
  ('medalhao_da_aurora', 'joia', 'Medalhão da Aurora', 'Um sol de ouro que aquece quem o carrega.', 'epico', 80, 0, 5, 0, 0, 0, 0, 0, 28, NULL, 'aurora', 'luz', NULL, false, true, 307),
  ('armadura_sombria', 'armadura', 'Armadura Sombria', 'Placas pretas foscas que engolem a luz ao redor.', 'epico', 60, 0, 12, 0, 0, 0, 0, 20, 28, NULL, 'sombrio', 'trevas', NULL, false, true, 308),
  ('capa_sombria', 'capa', 'Capa Sombria', 'Some no escuro junto com quem a veste.', 'epico', 0, 0, 0, 0, 0, 15, 0, 45, 28, NULL, 'sombrio', 'trevas', NULL, false, true, 309),
  ('anel_sombrio', 'joia', 'Anel Sombrio', 'Uma pedra negra que sussurra onde golpear.', 'epico', 0, 0, 0, 0, 0, 20, 15, 0, 28, NULL, 'sombrio', 'trevas', NULL, false, true, 310),
  ('luvas_arcanas', 'luvas', 'Luvas Arcanas', 'Seda estelar com runas que brilham ao lançar feitiços.', 'epico', 0, 0, 0, 8, 0, 30, 0, 0, 28, NULL, 'arcano', 'eter', NULL, false, true, 311),
  ('botas_arcanas', 'botas', 'Botas Arcanas', 'Flutuam um dedo acima do chão.', 'epico', 0, 0, 0, 6, 5, 0, 0, 0, 28, NULL, 'arcano', 'eter', NULL, false, true, 312),
  ('amuleto_arcano', 'joia', 'Amuleto Arcano', 'Uma estrela presa em prata que guarda mana.', 'epico', 0, 0, 0, 14, 0, 0, 0, 0, 28, NULL, 'arcano', 'eter', NULL, false, true, 313),
  ('capa_de_pedra', 'capa', 'Capa de Pedra', 'Pesada como um muro, quente como a forja.', 'epico', 60, 0, 10, 0, 0, 0, 0, 0, 28, NULL, 'terra', 'terra', NULL, false, true, 314),
  ('anel_de_pedra', 'joia', 'Anel de Pedra', 'Uma lasca do núcleo da montanha com veios de lava.', 'epico', 60, 0, 6, 0, 0, 0, 0, 0, 28, NULL, 'terra', 'terra', NULL, false, true, 315),
  ('armadura_silvestre', 'armadura', 'Armadura Silvestre', 'Casca de árvore antiga e couro, leve e firme.', 'epico', 50, 0, 10, 0, 2, 0, 0, 0, 28, NULL, 'silvestre', 'vento', NULL, false, true, 316),
  ('luvas_silvestres', 'luvas', 'Luvas Silvestres', 'Folhas trançadas que guiam a mira.', 'epico', 0, 0, 0, 0, 1, 45, 0, 0, 28, NULL, 'silvestre', 'vento', NULL, false, true, 317),
  ('capa_silvestre', 'capa', 'Capa Silvestre', 'Folhagem viva que se move com o vento.', 'epico', 0, 0, 0, 0, 2, 0, 0, 45, 28, NULL, 'silvestre', 'vento', NULL, false, true, 318),
  ('botas_silvestres', 'botas', 'Botas Silvestres', 'Não quebram nenhum galho ao caminhar.', 'epico', 0, 0, 0, 0, 7, 0, 0, 15, 28, NULL, 'silvestre', 'vento', NULL, false, true, 319),
  ('colar_silvestre', 'joia', 'Colar Silvestre', 'Uma semente que brota de novo toda primavera.', 'epico', 50, 0, 0, 0, 3, 0, 0, 0, 28, NULL, 'silvestre', 'vento', NULL, false, true, 320),
  ('couraca_de_brasa', 'armadura', 'Couraça de Brasa', 'Armadura do conjunto Brasa: couro escuro com placas de cobre em brasa.', 'raro', 30, 3, 6, 0, 0, 0, 0, 0, 12, NULL, 'brasa', 'fogo', 200, false, true, 321),
  ('capa_de_brasa', 'capa', 'Capa de Brasa', 'Capa do conjunto Brasa: couro escuro com placas de cobre em brasa.', 'raro', 0, 3, 0, 0, 0, 0, 0, 20, 14, NULL, 'brasa', 'fogo', 220, false, true, 322),
  ('botas_de_brasa', 'botas', 'Botas de Brasa', 'Botas do conjunto Brasa: couro escuro com placas de cobre em brasa.', 'raro', 0, 2, 0, 0, 3, 0, 0, 0, 16, NULL, 'brasa', 'fogo', 240, false, true, 323),
  ('tunica_da_mare', 'armadura', 'Túnica da Maré', 'Armadura do conjunto Maré: tecido azul-turquesa que parece sempre molhado.', 'raro', 30, 0, 5, 4, 0, 0, 0, 0, 12, NULL, 'mare', 'agua', 200, false, true, 324),
  ('capa_da_mare', 'capa', 'Capa da Maré', 'Capa do conjunto Maré: tecido azul-turquesa que parece sempre molhado.', 'raro', 0, 0, 0, 4, 0, 0, 0, 20, 14, NULL, 'mare', 'agua', 220, false, true, 325),
  ('botas_da_mare', 'botas', 'Botas da Maré', 'Botas do conjunto Maré: tecido azul-turquesa que parece sempre molhado.', 'raro', 0, 0, 0, 3, 3, 0, 0, 0, 16, NULL, 'mare', 'agua', 240, false, true, 326),
  ('couraca_do_trovao', 'armadura', 'Couraça do Trovão', 'Armadura do conjunto Trovão: placas finas prateadas com faíscas amarelas.', 'raro', 25, 0, 5, 0, 1, 0, 0, 0, 12, NULL, 'trovao', 'raio', 200, false, true, 327),
  ('capa_do_trovao', 'capa', 'Capa do Trovão', 'Capa do conjunto Trovão: placas finas prateadas com faíscas amarelas.', 'raro', 0, 0, 0, 0, 0, 10, 0, 25, 14, NULL, 'trovao', 'raio', 220, false, true, 328),
  ('botas_do_trovao', 'botas', 'Botas do Trovão', 'Botas do conjunto Trovão: placas finas prateadas com faíscas amarelas.', 'raro', 0, 0, 0, 0, 4, 10, 0, 0, 16, NULL, 'trovao', 'raio', 240, false, true, 329),
  ('couraca_de_rocha', 'armadura', 'Couraça de Rocha', 'Armadura do conjunto Rocha: pedra cinza com veios âmbar.', 'raro', 40, 0, 8, 0, 0, 0, 0, 0, 12, NULL, 'rocha', 'terra', 200, false, true, 330),
  ('manto_de_rocha', 'capa', 'Manto de Rocha', 'Capa do conjunto Rocha: pedra cinza com veios âmbar.', 'raro', 30, 0, 5, 0, 0, 0, 0, 0, 14, NULL, 'rocha', 'terra', 220, false, true, 331),
  ('botas_de_rocha', 'botas', 'Botas de Rocha', 'Botas do conjunto Rocha: pedra cinza com veios âmbar.', 'raro', 0, 0, 4, 0, 2, 0, 0, 0, 16, NULL, 'rocha', 'terra', 240, false, true, 332),
  ('couraca_da_alvorada', 'armadura', 'Couraça da Alvorada', 'Armadura do conjunto Alvorada: branco e dourado com brilho suave.', 'raro', 45, 0, 6, 0, 0, 0, 0, 0, 12, NULL, 'alvorada', 'luz', 200, false, true, 333),
  ('capa_da_alvorada', 'capa', 'Capa da Alvorada', 'Capa do conjunto Alvorada: branco e dourado com brilho suave.', 'raro', 40, 0, 4, 0, 0, 0, 0, 0, 14, NULL, 'alvorada', 'luz', 220, false, true, 334),
  ('botas_da_alvorada', 'botas', 'Botas da Alvorada', 'Botas do conjunto Alvorada: branco e dourado com brilho suave.', 'raro', 25, 0, 0, 0, 3, 0, 0, 0, 16, NULL, 'alvorada', 'luz', 240, false, true, 335),
  ('veste_da_nevoa', 'armadura', 'Veste da Névoa', 'Armadura do conjunto Névoa: névoa azul-ciano e violeta.', 'raro', 25, 2, 5, 2, 0, 0, 0, 0, 12, NULL, 'nevoa', 'eter', 200, false, true, 336),
  ('capa_da_nevoa', 'capa', 'Capa da Névoa', 'Capa do conjunto Névoa: névoa azul-ciano e violeta.', 'raro', 0, 0, 0, 0, 0, 0, 0, 30, 14, NULL, 'nevoa', 'eter', 220, false, true, 337),
  ('botas_da_nevoa', 'botas', 'Botas da Névoa', 'Botas do conjunto Névoa: névoa azul-ciano e violeta.', 'raro', 0, 0, 0, 0, 3, 0, 0, 10, 16, NULL, 'nevoa', 'eter', 240, false, true, 338)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. Receitas das Épicas: 450 de Ouro, 4 do material do conjunto, 4 Garras e 1 Crânio
-- =============================================================================

INSERT INTO public.rpg_receitas (item_id, ouro, materiais)
SELECT i.id, 450,
       jsonb_build_object(public.rpg_material_do_conjunto(i.conjunto), 4, 'garra_de_fera', 4, 'cranio_de_fera', 1)
  FROM public.rpg_itens i
 WHERE i.ordem BETWEEN 300 AND 399 AND i.raridade = 'epico' AND i.ativo
ON CONFLICT (item_id) DO NOTHING;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT conjunto, string_agg(DISTINCT slot, ', ' ORDER BY slot), count(*)
--   FROM public.rpg_itens WHERE conjunto IS NOT NULL AND ativo GROUP BY 1 ORDER BY 1;
--   todo conjunto com os 7 slots (o Silvestre com 6: a arma é o arco, desligado)
