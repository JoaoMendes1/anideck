-- 127_rpg_mais_equipamentos.sql
-- Fase 18: 32 equipamentos novos com elemento, para os slots não ficarem vazios no começo e
-- para a sintonia elemental (Go, rpg_sintonia.go) valer desde cedo.
--
-- 1. 7 elmos e 7 luvas comuns e raros (níveis 1 a 18): até aqui os dois slots só tinham
--    Épicos e Lendários a partir do nível 26
-- 2. 10 armas no elemento da classe (7 raras no Mercado, 3 épicas na Forja)
-- 3. 8 joias com benefícios variados, uma por elemento
-- 4. Receitas da Forja para as 3 armas épicas
--
-- Com elmo, luvas, joia e arma do próprio elemento, todo herói fecha as 4 peças da
-- Ressonância por volta do nível 18. Comuns e raros têm preço no Mercado; os épicos saem da
-- Forja, das masmorras e da invocação. DO NOTHING preserva o que o Admin ajustar depois.
--
-- Depende do 071, 119 (preco_ouro), 121, 122 (receitas) e 126 (elemento). Idempotente.

INSERT INTO public.rpg_itens (id, slot, nome, descricao, raridade, vida, ataque, defesa, magia, velocidade,
                              critico_por_mil, dano_critico, esquiva_por_mil, nivel_minimo, classes, conjunto,
                              elemento, preco_ouro, inicial, ativo, ordem)
VALUES
  ('capuz_de_couro', 'elmo', 'Capuz de Couro', 'Couro curtido que protege do vento e da chuva da estrada.', 'comum', 15, 0, 1, 0, 0, 0, 0, 0, 1, NULL, NULL, NULL, 30, false, true, 200),
  ('elmo_de_ferro', 'elmo', 'Elmo de Ferro', 'Ferro batido sem enfeites; aguenta o primeiro golpe.', 'comum', 25, 0, 2, 0, 0, 0, 0, 0, 4, NULL, NULL, 'terra', 45, false, true, 201),
  ('tiara_de_brasas', 'elmo', 'Tiara de Brasas', 'Brasas presas em cobre que esquentam a cabeça e o golpe.', 'raro', 35, 3, 0, 0, 0, 10, 0, 0, 10, NULL, NULL, 'fogo', 180, false, true, 202),
  ('capuz_da_mare', 'elmo', 'Capuz da Maré', 'Tecido que nunca seca; a mana corre por ele como água.', 'raro', 30, 0, 0, 5, 0, 0, 0, 0, 12, NULL, NULL, 'agua', 190, false, true, 203),
  ('elmo_do_trovao', 'elmo', 'Elmo do Trovão', 'Placas finas que estalam com eletricidade a cada passo.', 'raro', 30, 0, 0, 0, 2, 15, 0, 0, 14, NULL, NULL, 'raio', 210, false, true, 204),
  ('diadema_solar', 'elmo', 'Diadema Solar', 'Uma faixa dourada que guarda a luz da manhã.', 'raro', 45, 0, 3, 0, 0, 0, 0, 0, 16, NULL, NULL, 'luz', 230, false, true, 205),
  ('mascara_de_eter', 'elmo', 'Máscara de Éter', 'Esconde o rosto e mostra só o brilho do Éter nos olhos.', 'raro', 35, 3, 0, 0, 0, 0, 0, 15, 18, NULL, NULL, 'eter', 250, false, true, 206),
  ('luvas_de_couro', 'luvas', 'Luvas de Couro', 'Firmes na empunhadura, macias no punho.', 'comum', 0, 0, 1, 0, 0, 10, 0, 0, 1, NULL, NULL, NULL, 30, false, true, 207),
  ('braceletes_de_ferro', 'luvas', 'Braceletes de Ferro', 'Aros pesados que aparam lâminas.', 'comum', 10, 0, 2, 0, 0, 0, 0, 0, 5, NULL, NULL, 'terra', 50, false, true, 208),
  ('manoplas_de_brasa', 'luvas', 'Manoplas de Brasa', 'O metal fica vermelho quando o golpe é certeiro.', 'raro', 0, 4, 0, 0, 0, 0, 10, 0, 11, NULL, NULL, 'fogo', 180, false, true, 209),
  ('luvas_da_corrente', 'luvas', 'Luvas da Corrente', 'Bordadas com fios de prata que guiam a mana.', 'raro', 0, 0, 0, 5, 1, 0, 0, 0, 12, NULL, NULL, 'agua', 190, false, true, 210),
  ('luvas_estaticas', 'luvas', 'Luvas Estáticas', 'Cada toque solta uma faísca; os reflexos ficam mais rápidos.', 'raro', 0, 0, 0, 0, 1, 30, 0, 0, 14, NULL, NULL, 'raio', 210, false, true, 211),
  ('manoplas_consagradas', 'luvas', 'Manoplas Consagradas', 'Abençoadas para segurar a linha de frente.', 'raro', 25, 0, 4, 0, 0, 0, 0, 0, 16, NULL, NULL, 'luz', 230, false, true, 212),
  ('luvas_do_eter', 'luvas', 'Luvas do Éter', 'Leves como névoa; a lâmina parece guiar a mão.', 'raro', 0, 3, 0, 0, 0, 20, 6, 0, 18, NULL, NULL, 'eter', 250, false, true, 213),
  ('lanca_de_brasa', 'arma', 'Lança de Brasa', 'A ponta guarda uma brasa que nunca apaga.', 'raro', 0, 15, 0, 0, 1, 15, 0, 0, 14, ARRAY['lanceiro']::TEXT[], NULL, 'fogo', 260, false, true, 214),
  ('lanca_vulcanica', 'arma', 'Lança Vulcânica', 'Forjada no coração de um vulcão; derrete o que atravessa.', 'epico', 0, 28, 0, 0, 0, 30, 12, 0, 30, ARRAY['lanceiro']::TEXT[], NULL, 'fogo', NULL, false, true, 215),
  ('adagas_gemeas_do_trovao', 'arma', 'Adagas Gêmeas do Trovão', 'Duas lâminas que chegam juntas, como raio e trovão.', 'raro', 0, 13, 0, 0, 2, 40, 0, 0, 14, ARRAY['assassina']::TEXT[], NULL, 'raio', 260, false, true, 216),
  ('tomo_da_mare', 'arma', 'Tomo da Maré', 'Um livro de capa de concha; as páginas ondulam ao ler.', 'raro', 0, 0, 0, 20, 1, 0, 0, 0, 18, ARRAY['maga']::TEXT[], NULL, 'agua', 280, false, true, 217),
  ('cajado_da_mare', 'arma', 'Cajado da Maré', 'Coral vivo enrolado numa haste de madeira das profundezas.', 'epico', 40, 0, 0, 30, 0, 20, 0, 0, 30, ARRAY['maga']::TEXT[], NULL, 'agua', NULL, false, true, 218),
  ('martelo_de_pedra', 'arma', 'Martelo de Pedra', 'Uma rocha presa num cabo: simples e devastador.', 'raro', 0, 15, 2, 0, 0, 0, 0, 0, 12, ARRAY['guerreiro']::TEXT[], NULL, 'terra', 240, false, true, 219),
  ('machado_de_granito', 'arma', 'Machado de Granito', 'Lâmina de granito polido que racha armaduras.', 'epico', 40, 27, 4, 0, 0, 0, 0, 0, 30, ARRAY['guerreiro']::TEXT[], NULL, 'terra', NULL, false, true, 220),
  ('maca_da_alvorada', 'arma', 'Maça da Alvorada', 'Brilha mais forte quanto mais escura é a batalha.', 'raro', 30, 12, 2, 0, 0, 0, 0, 0, 14, ARRAY['paladina']::TEXT[], NULL, 'luz', 260, false, true, 221),
  ('katana_do_eter', 'arma', 'Katana do Éter', 'Uma lâmina fina que deixa um rastro azul no ar.', 'raro', 0, 14, 0, 0, 1, 25, 0, 0, 14, ARRAY['espadachim']::TEXT[], NULL, 'eter', 260, false, true, 222),
  ('sabre_relampago', 'arma', 'Sabre Relâmpago', 'Curvo e veloz; ideal para quem ataca primeiro.', 'raro', 0, 16, 0, 0, 3, 20, 0, 0, 20, ARRAY['espadachim','assassina']::TEXT[], NULL, 'raio', 300, false, true, 223),
  ('anel_veloz', 'joia', 'Anel Veloz', 'Um aro leve de prata com uma pena gravada.', 'comum', 0, 0, 0, 0, 2, 0, 0, 0, 3, NULL, NULL, 'vento', 40, false, true, 224),
  ('colar_do_cacador', 'joia', 'Colar do Caçador', 'Dentes de fera num cordão: lembra de mirar no ponto fraco.', 'raro', 0, 0, 0, 0, 0, 25, 8, 0, 10, NULL, NULL, NULL, 170, false, true, 225),
  ('anel_de_brasa', 'joia', 'Anel de Brasa', 'Uma pedra vermelha que pulsa como carvão vivo.', 'raro', 0, 5, 0, 0, 0, 0, 0, 0, 12, NULL, NULL, 'fogo', 190, false, true, 226),
  ('pingente_da_mare', 'joia', 'Pingente da Maré', 'Uma gota de água do mar presa em vidro.', 'raro', 0, 0, 0, 6, 0, 0, 0, 0, 12, NULL, NULL, 'agua', 190, false, true, 227),
  ('anel_do_trovao', 'joia', 'Anel do Trovão', 'Formiga o dedo de quem o usa.', 'raro', 0, 0, 0, 0, 2, 15, 0, 0, 12, NULL, NULL, 'raio', 190, false, true, 228),
  ('amuleto_de_rocha', 'joia', 'Amuleto de Rocha', 'Uma lasca da montanha que deixa a pele dura como pedra.', 'raro', 20, 0, 4, 0, 0, 0, 0, 0, 12, NULL, NULL, 'terra', 190, false, true, 229),
  ('broche_solar', 'joia', 'Broche Solar', 'Um sol pequeno de ouro preso na capa.', 'raro', 40, 0, 0, 0, 0, 0, 0, 0, 12, NULL, NULL, 'luz', 190, false, true, 230),
  ('talisma_do_eter', 'joia', 'Talismã do Éter', 'Uma runa que não para de girar sobre a palma.', 'raro', 0, 3, 0, 3, 0, 0, 0, 10, 12, NULL, NULL, 'eter', 190, false, true, 231)
ON CONFLICT (id) DO NOTHING;

-- Receitas das armas épicas: 450 de Ouro, 4 do material do elemento, 4 Garras e 1 Crânio,
-- como os Épicos do sql/122. O material segue o elemento, já que elas não têm conjunto.
INSERT INTO public.rpg_receitas (item_id, ouro, materiais) VALUES
  ('lanca_vulcanica',    450, '{"cristal_de_fogo": 4, "garra_de_fera": 4, "cranio_de_fera": 1}'),
  ('cajado_da_mare',     450, '{"cristal_de_gelo": 4, "garra_de_fera": 4, "cranio_de_fera": 1}'),
  ('machado_de_granito', 450, '{"chifre_de_fera": 4, "garra_de_fera": 4, "cranio_de_fera": 1}')
ON CONFLICT (item_id) DO NOTHING;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT slot, raridade, count(*) FROM public.rpg_itens WHERE ordem BETWEEN 200 AND 299 GROUP BY 1, 2 ORDER BY 1, 2;
--   elmo e luvas: 2 comuns e 5 raros cada; arma: 7 raras e 3 épicas; joia: 1 comum e 7 raras
