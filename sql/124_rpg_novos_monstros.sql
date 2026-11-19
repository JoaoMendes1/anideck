-- =============================================================================
-- 124 — Expansão do bestiário: 56 novos monstros e famílias de evolução
-- =============================================================================
--
-- Adiciona 56 monstros ao catálogo public.rpg_monstros, mantendo os 8 originais intactos
-- (sql/072 e sql/078). Elementos, 8 atributos de combate, IA tática, poderes, regiões e
-- linhas de evolução ficam no código Go (rpg_combate_avancado.go).
--
-- Armadilha #34 (sql/086): monstros de raridade_item = 'comum' nascem com chance_item = 0
-- enquanto não houver item comum fora do kit inicial.
--
-- Dado de catálogo idempotente (ON CONFLICT DO NOTHING). Pode rodar mais de uma vez.

INSERT INTO public.rpg_monstros
  (id, nome, descricao, tipo, nivel, vida, ataque, defesa, bilhetes, chance_item, raridade_item, ordem)
VALUES
  -- Clareira Inicial (Nv 1-8)
  ('slime_espinhoso',      'Slime Espinhoso',       'Gelatina ácida que endurece pontas venenosas ao sentir perigo.',      'comum',  2,   85,  11,   4, 1,  0, 'comum',     12),
  ('cogumelo_esporifero',  'Cogumelo Esporífero',   'Fungo territorial que ruge liberando nuvens de esporos.',             'comum',  3,  105,  13,   5, 1,  0, 'comum',     15),
  ('vespa_eletrica',       'Vespa Elétrica',        'Enxame solitário cuja carapaça armazena descargas atmosféricas.',     'comum',  6,  190,  26,  10, 1,  0, 'comum',     24),
  ('golem_musgoso',        'Golem Musgoso',         'Pedras antigas mantidas unidas por raízes vivas de Éter.',            'comum',  8,  310,  34,  20, 1,  0, 'comum',     28),

  -- Bosque Sombrio (Nv 9-25)
  ('arvore_de_esporos',    'Árvore de Esporos',     'Cogumelo jovem que enraizou em madeira viva e passou a caminhar.',    'comum', 11,  420,  49,  24, 1, 18, 'raro',      32),
  ('slime_de_cranios',     'Slime de Crânios',      'Massa ácida que absorveu ossos de antigos exploradores.',             'raro',  12,  520,  52,  28, 1, 20, 'raro',      34),
  ('planta_carnivora',     'Planta Carnívora',      'Mandíbula vegetal camuflada entre cipós sufocantes.',                 'comum', 14,  580,  62,  29, 1, 18, 'raro',      36),
  ('druida_da_floresta',   'Druida da Floresta',    'Erudito corrompido que canaliza Éter silvestre pelo cajado.',         'raro',  15,  640,  66,  33, 1, 22, 'raro',      37),
  ('centopeia_toxica',     'Centopeia Tóxica',      'Carapaça articulada que escorre veneno corrosivo pelo chão.',         'comum', 16,  720,  71,  35, 1, 20, 'raro',      38),
  ('ent_apodrecido',       'Ent Apodrecido',        'Guardião florestal tomado por fungos ácidos e fúria silenciosa.',     'raro',  19, 1020,  82,  52, 2, 24, 'raro',      42),
  ('alquimista_da_praga',  'Alquimista da Praga',   'Mestre mascarado que mistura esporos e elixires proibidos.',          'chefe', 20,  940,  76,  44, 2, 26, 'raro',      44),
  ('wyvern_esmeralda',     'Wyvern Esmeralda',      'Dragão menor de escamas verdes que caça acima das copas.',            'raro',  25, 1340, 112,  58, 2, 22, 'epico',     48),

  -- Fendas Vulcânicas (Nv 14-42)
  ('javali_vulcanico',     'Javali Vulcânico',      'Presas incandescentes que racham o solo com cada investida.',         'comum', 14,  620,  63,  32, 1, 18, 'raro',      35),
  ('aranha_rubra',         'Aranha Rubra',          'Predadora de basalto cujas teias ardem como brasa viva.',             'comum', 22, 1120,  98,  48, 2, 20, 'epico',     45),
  ('cao_de_magma',         'Cão de Magma',          'Fera de rocha derretida envolta em juba de fogo contínuo.',           'raro',  25, 1360, 114,  60, 2, 24, 'epico',     49),
  ('fera_de_obsidiana',    'Fera de Obsidiana',     'Evolução encouraçada das fendas profundas, quase impenetrável.',       'raro',  28, 1580, 125,  72, 2, 24, 'epico',     53),
  ('golem_de_magma',       'Golem de Magma',        'Núcleo vulcânico que moldou um corpo inteiro de lava solidificada.',   'raro',  31, 1820, 136,  78, 2, 26, 'epico',     56),
  ('beemote_de_lava',      'Beemote de Lava',       'Colosso com chifres de osso e magma que esmaga o próprio terreno.',    'chefe', 36, 2060, 144,  78, 2, 30, 'epico',     62),
  ('fenix_solar',          'Fênix Solar',           'Ave imortal de chamas douradas que renasce no ápice do calor.',        'chefe', 42, 2720, 180,  96, 3, 28, 'lendario',  67),

  -- Costa e Picos Glaciais (Nv 17-46)
  ('serpente_marinha',     'Serpente Marinha',      'Escamas azul-aço que cortam ondas geladas em alta velocidade.',       'comum', 17,  800,  76,  40, 1, 20, 'raro',      39),
  ('revena_glacial',       'Revenã Glacial',        'Navegador congelado que ainda empunha seu tridente espectral.',       'comum', 19,  940,  84,  45, 1, 22, 'raro',      41),
  ('grifo_glacial',        'Grifo Glacial',         'Guardião alado dos penhascos que combina bico ágil e gelo.',          'raro',  21, 1100,  94,  52, 2, 20, 'epico',     44),
  ('aranha_glacial',       'Aranha Glacial',        'Patas de cristal puro que congelam o ar ao menor movimento.',         'comum', 22, 1140,  99,  50, 2, 20, 'epico',     46),
  ('golem_de_gelo',        'Golem de Gelo',         'Bloco vivo de geleira milenar erguido com cristais afiados.',          'raro',  24, 1340, 104,  66, 2, 22, 'epico',     47),
  ('yeti_glacial',         'Yeti Glacial',          'Fera brutal de punhos de gelo que ruge sob nevascas perpétuas.',       'raro',  27, 1540, 122,  65, 2, 24, 'epico',     51),
  ('leviata_relampago',    'Leviatã Relâmpago',     'Serpente evoluída que mistura marés glaciais com raios contínuos.',   'raro',  30, 1740, 134,  70, 2, 24, 'epico',     55),
  ('cavaleiro_da_geada',   'Cavaleiro da Geada',    'Campeão blindado em gelo eterno empunhando lâmina glacial.',          'raro',  33, 1980, 142,  79, 2, 26, 'epico',     58),
  ('colosso_glacial',      'Colosso Glacial',       'Forma final do Golem de Gelo, irradiando frio arcano constante.',      'chefe', 37, 2260, 150,  86, 2, 28, 'epico',     63),
  ('dragao_glacial',       'Dragão Glacial',        'Asas de cristal que transformam o sopro em tempestade de gelo.',      'chefe', 40, 2680, 172,  96, 3, 26, 'lendario',  65),
  ('lorde_da_geada',       'Lorde Abissal da Geada','Soberano sombrio do inverno, armado com alabarda rúnica.',             'chefe', 46, 3100, 188, 106, 3, 28, 'lendario',  69),

  -- Ruínas do Vazio (Nv 16-41)
  ('espectro_acorrentado', 'Espectro Acorrentado',  'Alma presa por correntes espectrais que vaga pelos salões.',          'comum', 16,  740,  74,  34, 1, 20, 'raro',      38),
  ('fragmento_do_olho',    'Fragmento do Olho',     'Núcleo orbital cercado por estilhaços flutuantes do Vazio.',          'comum', 21, 1060,  96,  46, 2, 20, 'epico',     44),
  ('fantasma_do_vazio',    'Fantasma do Vazio',     'Riso sombrio envolto em chamas violeta que atravessa defesas.',       'comum', 23, 1180, 106,  48, 2, 22, 'epico',     46),
  ('lobo_abissal',         'Lobo Abissal',          'Lobo Sombrio evoluído pelo Éter corrompido, veloz e letal.',          'raro',  25, 1320, 118,  55, 2, 24, 'epico',     48),
  ('golem_flutuante',      'Golem Flutuante',       'Monólitos ligados por magnetismo arcano sem tocar o solo.',           'raro',  26, 1460, 115,  70, 2, 22, 'epico',     50),
  ('beemote_fungico',      'Beemote Fúngico',       'Bruto rochoso coroado por cogumelos luminosos do Vazio.',             'raro',  28, 1620, 128,  68, 2, 24, 'epico',     53),
  ('ceifador_sombrio',     'Ceifador Sombrio',      'Assassino encapuzado cuja foice drena luz ao cortar.',                'raro',  29, 1640, 134,  66, 2, 25, 'epico',     54),
  ('vortex_do_olho',       'Vórtex do Olho',        'Olho desperto rodeado por tentáculos de rocha em órbita.',            'raro',  31, 1780, 140,  72, 2, 25, 'epico',     56),
  ('slime_do_vazio',       'Slime do Vazio',        'Ápice evolutivo dos slimes, feito de bolhas de antimatéria.',         'raro',  32, 1880, 142,  76, 2, 25, 'epico',     57),
  ('ceifador_espectral',   'Ceifador Espectral',    'Cavaleiro de névoa esverdeada com machado e foice gêmeos.',           'raro',  36, 1980, 140,  76, 2, 28, 'epico',     61),
  ('colosso_runico',       'Colosso Rúnico',        'Ápice dos golens de terra, erguido por esmeraldas rúnicas.',          'chefe', 38, 2300, 148,  88, 2, 30, 'epico',     64),
  ('golem_do_vazio',       'Golem do Vazio',        'Corpo estilhaçado que pulsa energia violeta entre cada fissura.',      'chefe', 41, 2740, 176,  98, 3, 28, 'lendario',  66),

  -- Santuário Astral (Nv 42-54)
  ('beholder_abissal',     'Beholder Abissal',      'Olho supremo com dezenas de tentáculos que leem cada movimento.',     'raro',  42, 2780, 182,  95, 3, 26, 'lendario',  67),
  ('lich_das_sombras',     'Lich das Sombras',      'Mago esquelético acorrentado por chamas verdes necróticas.',          'raro',  43, 2860, 188,  96, 3, 26, 'lendario',  68),
  ('dragao_esqueleto',     'Dragão Esqueleto',      'Carcaça dracônica reanimada por sopro de necrose antiga.',            'chefe', 44, 3040, 190, 106, 3, 28, 'lendario',  68),
  ('grifo_dourado',        'Grifo Dourado',         'Sentinela real dos céus vestido com armadura solar.',                 'raro',  45, 3080, 194, 108, 3, 26, 'lendario',  69),
  ('serpente_espectral',   'Serpente Espectral',    'Crânio flamejante em corpo serpentino de névoa estelar.',              'raro',  47, 3260, 204, 108, 3, 28, 'lendario',  70),
  ('rei_lich',             'Rei Lich',              'Monarca dos mortos-vivos com cetro capaz de comandar espectros.',     'chefe', 49, 3240, 196, 110, 3, 30, 'lendario',  71),
  ('draconato_do_trovao',  'Draconato do Trovão',   'Guerreiro dracônico dourado armado com machado tempestuoso.',         'chefe', 51, 3500, 206, 114, 3, 30, 'lendario',  72),
  ('serafim_celestial',    'Serafim Celestial',     'Mensageira alada envolta em anéis dourados de luz pura.',             'chefe', 52, 3540, 208, 116, 3, 30, 'lendario',  73),
  ('kraken_abissal',       'Kraken Abissal',        'Monarca oceânico coroado cujo olho hipnotiza o campo inteiro.',       'chefe', 54, 3660, 212, 120, 3, 32, 'lendario',  74),

  -- Cume Ancestral (Nv 48-62)
  ('dragao_tempestade',    'Dragão da Tempestade',  'Forma final da serpente marinha, nascida do trovão puro.',            'chefe', 48, 3420, 208, 114, 3, 28, 'lendario',  70),
  ('dragao_do_vazio',      'Dragão do Vazio',       'Asas violeta que rasgam o espaço com descargas arcanas.',             'chefe', 55, 3780, 216, 122, 3, 32, 'lendario',  75),
  ('senhor_infernal',      'Senhor Infernal',       'Comandante demoníaco de armadura vulcânica e espada flamejante.',      'chefe', 56, 3860, 220, 124, 3, 32, 'lendario',  76),
  ('arcanjo_blindado',     'Arcanjo Blindado',      'Ápice celestial em armadura dourada e espada sagrada de seis asas.',   'chefe', 57, 3940, 224, 126, 3, 34, 'lendario',  77),
  ('horror_da_fenda',      'Horror da Fenda',       'Fome primordial de tentáculos que devora magia e realidade.',         'chefe', 58, 4120, 232, 134, 3, 34, 'lendario',  78)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Como conferir
-- =============================================================================
-- SELECT count(*) FROM public.rpg_monstros WHERE ativo = true; -- 64
-- SELECT raridade_item, count(*), max(chance_item) FROM public.rpg_monstros GROUP BY 1;
-- -- comum precisa ter max(chance_item) = 0
