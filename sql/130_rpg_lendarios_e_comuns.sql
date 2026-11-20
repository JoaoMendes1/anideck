-- 130_rpg_lendarios_e_comuns.sql
-- Fase 18: completa a escada de raridades. Antes, luvas, capa e botas não tinham Lendário e cada
-- slot tinha 1 ou 2 Comuns.
--
-- 1. Os 7 conjuntos de 18/11 ganham o elemento nas peças que estavam sem (a Sintonia passa a
--    valer nelas): Glacial = água, Carmesim = fogo, Aurora = luz, Sombrio = trevas,
--    Arcano = éter, Silvestre = vento, Terra = terra
-- 2. Conjunto Primordial (éter, nível 55): a Lâmina e a Égide Primordiais + 5 peças novas
-- 3. 15 Lendários (nível 50) nos 7 conjuntos de 18/11: cada slot fica com 4 Lendários ou mais
-- 4. 18 Comuns no Mercado (nível 1 a 8) com elemento, entre eles a primeira arma Comum da
--    Paladina (as outras classes já tinham a sua, do sql/126)
-- 5. Receitas da Forja: Lendários como as do sql/122; Primordiais mais caras
--
-- Os bônus do conjunto Primordial moram no Go (rpg_conjuntos.go). DO NOTHING preserva o que o
-- Admin ajustar depois.
--
-- Depende do 121, 122 e 129. Idempotente.

-- =============================================================================
-- 1. Elemento das peças dos conjuntos de 18/11
-- =============================================================================

UPDATE public.rpg_itens
   SET elemento = CASE conjunto
         WHEN 'glacial'   THEN 'agua'
         WHEN 'carmesim'  THEN 'fogo'
         WHEN 'aurora'    THEN 'luz'
         WHEN 'sombrio'   THEN 'trevas'
         WHEN 'arcano'    THEN 'eter'
         WHEN 'silvestre' THEN 'vento'
         WHEN 'terra'     THEN 'terra'
       END
 WHERE elemento IS NULL
   AND conjunto IN ('glacial', 'carmesim', 'aurora', 'sombrio', 'arcano', 'silvestre', 'terra');

-- =============================================================================
-- 2. Conjunto Primordial: as duas peças que já existiam
-- =============================================================================

UPDATE public.rpg_itens
   SET conjunto = 'primordial', elemento = COALESCE(elemento, 'eter')
 WHERE id IN ('lamina_primordial', 'egide_primordial') AND conjunto IS NULL;

-- O material que a peça Primordial devolve ao ser desmontada
CREATE OR REPLACE FUNCTION public.rpg_material_do_conjunto(p_conjunto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_conjunto
    WHEN 'glacial'    THEN 'cristal_de_gelo'
    WHEN 'carmesim'   THEN 'cristal_de_fogo'
    WHEN 'aurora'     THEN 'cristal_de_luz'
    WHEN 'sombrio'    THEN 'cristal_do_vazio'
    WHEN 'arcano'     THEN 'nucleo_da_tempestade'
    WHEN 'silvestre'  THEN 'gema_silvestre'
    WHEN 'terra'      THEN 'chifre_de_fera'
    WHEN 'primordial' THEN 'nucleo_da_tempestade'
    ELSE 'pena_celeste'
  END;
$$;

-- =============================================================================
-- 2, 3 e 4. Peças novas
-- =============================================================================

INSERT INTO public.rpg_itens (id, slot, nome, descricao, raridade, vida, ataque, defesa, magia, velocidade,
                              critico_por_mil, dano_critico, esquiva_por_mil, nivel_minimo, classes, conjunto,
                              elemento, preco_ouro, inicial, ativo, ordem)
VALUES
  ('diadema_primordial', 'elmo', 'Diadema Primordial', 'Um aro de éter puro que mostra o golpe antes de ele vir.', 'lendario', 200, 0, 0, 8, 0, 30, 0, 0, 55, NULL, 'primordial', 'eter', NULL, false, true, 400),
  ('manoplas_primordiais', 'luvas', 'Manoplas Primordiais', 'Forjadas com o que sobrou do primeiro mundo; pesam como uma estrela.', 'lendario', 0, 12, 0, 0, 0, 30, 22, 0, 55, NULL, 'primordial', 'eter', NULL, false, true, 401),
  ('manto_primordial', 'capa', 'Manto Primordial', 'Um pedaço do céu antes das estrelas, ainda escuro e cheio de brilho.', 'lendario', 110, 0, 12, 0, 0, 0, 0, 40, 55, NULL, 'primordial', 'eter', NULL, false, true, 402),
  ('grevas_primordiais', 'botas', 'Grevas Primordiais', 'Cada passo deixa um rastro de éter que demora a sumir.', 'lendario', 0, 0, 6, 0, 9, 0, 0, 30, 55, NULL, 'primordial', 'eter', NULL, false, true, 403),
  ('olho_primordial', 'joia', 'Olho Primordial', 'Uma gema que pisca sozinha e enxerga a fraqueza do inimigo.', 'lendario', 0, 12, 0, 12, 0, 40, 12, 0, 55, NULL, 'primordial', 'eter', NULL, false, true, 404),
  ('garras_do_inverno', 'luvas', 'Garras do Inverno', 'Lâminas de gelo nos dedos que congelam a ferida no corte.', 'lendario', 0, 10, 0, 6, 0, 60, 0, 0, 50, NULL, 'glacial', 'agua', NULL, false, true, 405),
  ('botas_da_nevasca', 'botas', 'Botas da Nevasca', 'Trazem a nevasca junto; o inimigo mal enxerga quem se aproxima.', 'lendario', 0, 0, 4, 0, 8, 0, 0, 50, 50, NULL, 'glacial', 'agua', NULL, false, true, 406),
  ('lagrima_glacial', 'joia', 'Lágrima Glacial', 'Uma gota do primeiro inverno, que nunca derreteu.', 'lendario', 60, 0, 0, 20, 0, 30, 0, 0, 50, NULL, 'glacial', 'agua', NULL, false, true, 407),
  ('manto_da_fenix', 'capa', 'Manto da Fênix', 'Penas de fogo que renascem a cada queda.', 'lendario', 90, 8, 0, 0, 0, 0, 15, 0, 50, NULL, 'carmesim', 'fogo', NULL, false, true, 408),
  ('coracao_de_magma', 'joia', 'Coração de Magma', 'Bate no ritmo de um vulcão e aquece o sangue para a luta.', 'lendario', 0, 20, 0, 0, 0, 0, 20, 0, 50, NULL, 'carmesim', 'fogo', NULL, false, true, 409),
  ('asas_da_aurora', 'capa', 'Asas da Aurora', 'Asas de luz que se abrem para proteger quem está atrás.', 'lendario', 140, 0, 14, 0, 0, 0, 0, 0, 50, NULL, 'aurora', 'luz', NULL, false, true, 410),
  ('sandalias_solares', 'botas', 'Sandálias Solares', 'Douradas como o meio-dia; aceleram quem anda sob o sol.', 'lendario', 80, 0, 6, 0, 8, 0, 0, 0, 50, NULL, 'aurora', 'luz', NULL, false, true, 411),
  ('veu_da_noite_eterna', 'capa', 'Véu da Noite Eterna', 'Quem o veste vira sombra entre sombras.', 'lendario', 0, 0, 0, 0, 2, 40, 0, 80, 50, NULL, 'sombrio', 'trevas', NULL, false, true, 412),
  ('garras_do_eclipse', 'luvas', 'Garras do Eclipse', 'Escurecem o mundo por um instante, o bastante para o golpe certo.', 'lendario', 0, 8, 0, 0, 0, 50, 25, 0, 50, NULL, 'sombrio', 'trevas', NULL, false, true, 413),
  ('luvas_do_arquimago', 'luvas', 'Luvas do Arquimago', 'Os feitiços saem das pontas dos dedos antes da última palavra.', 'lendario', 0, 0, 0, 16, 0, 50, 0, 0, 50, NULL, 'arcano', 'eter', NULL, false, true, 414),
  ('vestes_do_arquimago', 'armadura', 'Vestes do Arquimago', 'Bordadas com mapas de constelações que ainda se movem.', 'lendario', 150, 0, 16, 14, 0, 0, 0, 30, 50, NULL, 'arcano', 'eter', NULL, false, true, 415),
  ('passos_do_vento', 'botas', 'Passos do Vento', 'Leves como a brisa; o chão nem percebe o peso.', 'lendario', 0, 0, 0, 0, 11, 0, 0, 30, 50, NULL, 'silvestre', 'vento', NULL, false, true, 416),
  ('coroa_de_folhas_antigas', 'elmo', 'Coroa de Folhas Antigas', 'Ramos da primeira árvore, verdes há mil anos.', 'lendario', 180, 0, 0, 0, 3, 0, 0, 40, 50, NULL, 'silvestre', 'vento', NULL, false, true, 417),
  ('elmo_do_tita', 'elmo', 'Elmo do Titã', 'Talhado de uma montanha inteira; nenhum golpe o amassa.', 'lendario', 230, 0, 10, 0, 0, 0, 0, 0, 50, NULL, 'terra', 'terra', NULL, false, true, 418),
  ('couraca_do_colosso', 'armadura', 'Couraça do Colosso', 'Placas de rocha viva que se fecham sobre as rachaduras.', 'lendario', 280, 0, 28, 0, 0, 0, 0, 0, 50, NULL, 'terra', 'terra', NULL, false, true, 419),
  ('cajado_de_aprendiz', 'arma', 'Cajado de Aprendiz', 'Madeira simples com uma gema azul na ponta; o primeiro cajado de toda maga.', 'comum', 0, 0, 0, 5, 0, 0, 0, 0, 1, ARRAY['maga']::TEXT[], NULL, 'agua', 40, false, true, 420),
  ('adaga_de_ferro', 'arma', 'Adaga de Ferro', 'Curta, leve e fácil de esconder.', 'comum', 0, 3, 0, 0, 0, 20, 0, 0, 1, ARRAY['assassina']::TEXT[], NULL, 'trevas', 40, false, true, 421),
  ('maca_de_treino', 'arma', 'Maça de Treino', 'Usada nos pátios do templo; pesada e honesta.', 'comum', 15, 3, 0, 0, 0, 0, 0, 0, 1, ARRAY['paladina']::TEXT[], NULL, 'luz', 40, false, true, 424),
  ('chapeu_de_aprendiz', 'elmo', 'Chapéu de Aprendiz', 'Pontudo e um pouco grande demais, como manda a tradição.', 'comum', 10, 0, 0, 2, 0, 0, 0, 0, 2, NULL, NULL, 'eter', 35, false, true, 425),
  ('bandana_de_couro', 'elmo', 'Bandana de Couro', 'Segura o cabelo e o suor longe dos olhos.', 'comum', 10, 0, 0, 0, 1, 0, 0, 0, 3, NULL, NULL, 'vento', 40, false, true, 426),
  ('colete_de_couro', 'armadura', 'Colete de Couro', 'Leve para correr, firme para um arranhão.', 'comum', 15, 0, 1, 0, 0, 0, 0, 10, 2, NULL, NULL, 'vento', 45, false, true, 427),
  ('veste_de_aprendiz', 'armadura', 'Veste de Aprendiz', 'Túnica azul com bolsos para pergaminhos.', 'comum', 15, 0, 0, 2, 0, 0, 0, 0, 3, NULL, NULL, 'agua', 45, false, true, 428),
  ('peitoral_de_bronze', 'armadura', 'Peitoral de Bronze', 'Brilha ao sol e amassa com orgulho.', 'comum', 25, 0, 3, 0, 0, 0, 0, 0, 5, NULL, NULL, 'fogo', 60, false, true, 429),
  ('luvas_de_tecido', 'luvas', 'Luvas de Tecido', 'Finas o bastante para sentir o fluxo da magia.', 'comum', 0, 0, 0, 2, 0, 0, 0, 0, 2, NULL, NULL, 'agua', 35, false, true, 430),
  ('munhequeiras_de_bronze', 'luvas', 'Munhequeiras de Bronze', 'Protegem os pulsos e reforçam o soco.', 'comum', 0, 1, 1, 0, 0, 0, 0, 0, 4, NULL, NULL, 'fogo', 45, false, true, 431),
  ('capa_de_la', 'capa', 'Capa de Lã', 'Quente nas noites de estrada.', 'comum', 15, 0, 1, 0, 0, 0, 0, 0, 2, NULL, NULL, 'luz', 35, false, true, 432),
  ('capa_de_cacador', 'capa', 'Capa de Caçador', 'Verde-musgo, some entre as folhas.', 'comum', 0, 0, 0, 0, 0, 0, 0, 15, 4, NULL, NULL, 'vento', 45, false, true, 433),
  ('manto_de_aprendiz', 'capa', 'Manto de Aprendiz', 'Bordado com uma única runa, ainda apagada.', 'comum', 5, 0, 0, 2, 0, 0, 0, 0, 3, NULL, NULL, 'eter', 40, false, true, 434),
  ('sandalias_de_viagem', 'botas', 'Sandálias de Viagem', 'Gastas de tanta estrada, mas nunca deixam na mão.', 'comum', 0, 0, 0, 0, 2, 0, 0, 0, 2, NULL, NULL, 'vento', 35, false, true, 435),
  ('botas_de_cano_alto', 'botas', 'Botas de Cano Alto', 'Couro grosso para lama, pedra e neve.', 'comum', 10, 0, 2, 0, 0, 0, 0, 0, 4, NULL, NULL, 'terra', 45, false, true, 436),
  ('botas_de_feltro', 'botas', 'Botas de Feltro', 'Silenciosas no chão de pedra.', 'comum', 0, 0, 0, 0, 1, 0, 0, 15, 6, NULL, NULL, 'trevas', 55, false, true, 437),
  ('pingente_de_quartzo', 'joia', 'Pingente de Quartzo', 'Um cristal claro que acalma quem o carrega.', 'comum', 15, 0, 0, 0, 0, 0, 0, 0, 3, NULL, NULL, 'luz', 40, false, true, 438),
  ('anel_de_osso', 'joia', 'Anel de Osso', 'Talhado de um dente de fera; dizem que dá sorte no golpe.', 'comum', 0, 1, 0, 0, 0, 15, 0, 0, 8, NULL, NULL, 'trevas', 60, false, true, 439)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 5. Receitas
-- =============================================================================

-- Lendários dos conjuntos de 18/11: como as do sql/122
INSERT INTO public.rpg_receitas (item_id, ouro, materiais)
SELECT i.id, 1500,
       jsonb_build_object(public.rpg_material_do_conjunto(i.conjunto), 8, 'cranio_de_fera', 3, 'escama_de_dragao', 2)
  FROM public.rpg_itens i
 WHERE i.ordem BETWEEN 400 AND 499 AND i.raridade = 'lendario' AND i.conjunto <> 'primordial' AND i.ativo
ON CONFLICT (item_id) DO NOTHING;

-- Primordiais, inclusive a Lâmina e a Égide: o topo da Forja
INSERT INTO public.rpg_receitas (item_id, ouro, materiais)
SELECT i.id, 2000,
       jsonb_build_object('nucleo_da_tempestade', 8, 'cranio_de_fera', 4, 'escama_de_dragao', 4)
  FROM public.rpg_itens i
 WHERE i.conjunto = 'primordial' AND i.ativo
ON CONFLICT (item_id) DO NOTHING;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT slot, raridade, count(*) FROM public.rpg_itens WHERE ativo GROUP BY 1, 2 ORDER BY 1, 2;
--   todo slot com 4 Comuns ou mais e 4 Lendários ou mais
-- SELECT id FROM public.rpg_itens WHERE conjunto IS NOT NULL AND elemento IS NULL;
--   vazio
