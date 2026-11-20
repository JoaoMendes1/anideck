-- 131_rpg_monstros_mais_fortes.sql
-- Fase 18: monstros acompanham os 2 pontos de atributo por nível (sql/126).
--
-- Com 2 pontos por nível só o chefe final tinha sido recalibrado; os outros monstros ficaram
-- fáceis demais (vitória quase garantida no próprio nível). Agora Vida, Ataque e Defesa crescem
-- com o nível do monstro: iguais até o nível 15, +40% no nível 60, em linha reta no meio.
-- O Primordial Esquecido fica como está (calibrado no sql/126).
--
-- Cada UPDATE só vale se o monstro ainda tiver os números de antes: rodar de novo não reforça
-- duas vezes, e um ajuste feito à mão depois não é sobrescrito.
--
-- O outro lado da mudança está no Go (rpg_atributos.go): pontos distribuídos em Agilidade e
-- Destreza valem 0,7% de Esquiva e de Crítico cada (antes 0,2%).
--
-- Depende do 072, 078 e 124. Idempotente.

UPDATE public.rpg_monstros SET vida = 924, ataque = 72, defesa = 51 WHERE id = 'golem_de_runas' AND vida = 900 AND ataque = 70 AND defesa = 50;  -- nv 18, +3%
UPDATE public.rpg_monstros SET vida = 1537, ataque = 132, defesa = 68 WHERE id = 'espectro_do_vazio' AND vida = 1400 AND ataque = 120 AND defesa = 62;  -- nv 26, +10%
UPDATE public.rpg_monstros SET vida = 2473, ataque = 171, defesa = 94 WHERE id = 'cavaleiro_caido' AND vida = 2100 AND ataque = 145 AND defesa = 80;  -- nv 35, +18%
UPDATE public.rpg_monstros SET vida = 4720, ataque = 275, defesa = 157 WHERE id = 'dragao_de_eter' AND vida = 3600 AND ataque = 210 AND defesa = 120;  -- nv 50, +31%
UPDATE public.rpg_monstros SET vida = 726, ataque = 72, defesa = 35 WHERE id = 'centopeia_toxica' AND vida = 720 AND ataque = 71 AND defesa = 35;  -- nv 16, +1%
UPDATE public.rpg_monstros SET vida = 1056, ataque = 85, defesa = 54 WHERE id = 'ent_apodrecido' AND vida = 1020 AND ataque = 82 AND defesa = 52;  -- nv 19, +4%
UPDATE public.rpg_monstros SET vida = 982, ataque = 79, defesa = 46 WHERE id = 'alquimista_da_praga' AND vida = 940 AND ataque = 76 AND defesa = 44;  -- nv 20, +4%
UPDATE public.rpg_monstros SET vida = 1459, ataque = 122, defesa = 63 WHERE id = 'wyvern_esmeralda' AND vida = 1340 AND ataque = 112 AND defesa = 58;  -- nv 25, +9%
UPDATE public.rpg_monstros SET vida = 1190, ataque = 104, defesa = 51 WHERE id = 'aranha_rubra' AND vida = 1120 AND ataque = 98 AND defesa = 48;  -- nv 22, +6%
UPDATE public.rpg_monstros SET vida = 1481, ataque = 124, defesa = 65 WHERE id = 'cao_de_magma' AND vida = 1360 AND ataque = 114 AND defesa = 60;  -- nv 25, +9%
UPDATE public.rpg_monstros SET vida = 1763, ataque = 139, defesa = 80 WHERE id = 'fera_de_obsidiana' AND vida = 1580 AND ataque = 125 AND defesa = 72;  -- nv 28, +12%
UPDATE public.rpg_monstros SET vida = 2079, ataque = 155, defesa = 89 WHERE id = 'golem_de_magma' AND vida = 1820 AND ataque = 136 AND defesa = 78;  -- nv 31, +14%
UPDATE public.rpg_monstros SET vida = 2445, ataque = 171, defesa = 93 WHERE id = 'beemote_de_lava' AND vida = 2060 AND ataque = 144 AND defesa = 78;  -- nv 36, +19%
UPDATE public.rpg_monstros SET vida = 3373, ataque = 223, defesa = 119 WHERE id = 'fenix_solar' AND vida = 2720 AND ataque = 180 AND defesa = 96;  -- nv 42, +24%
UPDATE public.rpg_monstros SET vida = 814, ataque = 77, defesa = 41 WHERE id = 'serpente_marinha' AND vida = 800 AND ataque = 76 AND defesa = 40;  -- nv 17, +2%
UPDATE public.rpg_monstros SET vida = 973, ataque = 87, defesa = 47 WHERE id = 'revena_glacial' AND vida = 940 AND ataque = 84 AND defesa = 45;  -- nv 19, +4%
UPDATE public.rpg_monstros SET vida = 1159, ataque = 99, defesa = 55 WHERE id = 'grifo_glacial' AND vida = 1100 AND ataque = 94 AND defesa = 52;  -- nv 21, +5%
UPDATE public.rpg_monstros SET vida = 1211, ataque = 105, defesa = 53 WHERE id = 'aranha_glacial' AND vida = 1140 AND ataque = 99 AND defesa = 50;  -- nv 22, +6%
UPDATE public.rpg_monstros SET vida = 1447, ataque = 112, defesa = 71 WHERE id = 'golem_de_gelo' AND vida = 1340 AND ataque = 104 AND defesa = 66;  -- nv 24, +8%
UPDATE public.rpg_monstros SET vida = 1704, ataque = 135, defesa = 72 WHERE id = 'yeti_glacial' AND vida = 1540 AND ataque = 122 AND defesa = 65;  -- nv 27, +11%
UPDATE public.rpg_monstros SET vida = 1972, ataque = 152, defesa = 79 WHERE id = 'leviata_relampago' AND vida = 1740 AND ataque = 134 AND defesa = 70;  -- nv 30, +13%
UPDATE public.rpg_monstros SET vida = 2297, ataque = 165, defesa = 92 WHERE id = 'cavaleiro_da_geada' AND vida = 1980 AND ataque = 142 AND defesa = 79;  -- nv 33, +16%
UPDATE public.rpg_monstros SET vida = 2702, ataque = 179, defesa = 103 WHERE id = 'colosso_glacial' AND vida = 2260 AND ataque = 150 AND defesa = 86;  -- nv 37, +20%
UPDATE public.rpg_monstros SET vida = 3276, ataque = 210, defesa = 117 WHERE id = 'dragao_glacial' AND vida = 2680 AND ataque = 172 AND defesa = 96;  -- nv 40, +22%
UPDATE public.rpg_monstros SET vida = 747, ataque = 75, defesa = 34 WHERE id = 'espectro_acorrentado' AND vida = 740 AND ataque = 74 AND defesa = 34;  -- nv 16, +1%
UPDATE public.rpg_monstros SET vida = 1117, ataque = 101, defesa = 48 WHERE id = 'fragmento_do_olho' AND vida = 1060 AND ataque = 96 AND defesa = 46;  -- nv 21, +5%
UPDATE public.rpg_monstros SET vida = 1264, ataque = 114, defesa = 51 WHERE id = 'fantasma_do_vazio' AND vida = 1180 AND ataque = 106 AND defesa = 48;  -- nv 23, +7%
UPDATE public.rpg_monstros SET vida = 1437, ataque = 128, defesa = 60 WHERE id = 'lobo_abissal' AND vida = 1320 AND ataque = 118 AND defesa = 55;  -- nv 25, +9%
UPDATE public.rpg_monstros SET vida = 1603, ataque = 126, defesa = 77 WHERE id = 'golem_flutuante' AND vida = 1460 AND ataque = 115 AND defesa = 70;  -- nv 26, +10%
UPDATE public.rpg_monstros SET vida = 1807, ataque = 143, defesa = 76 WHERE id = 'beemote_fungico' AND vida = 1620 AND ataque = 128 AND defesa = 68;  -- nv 28, +12%
UPDATE public.rpg_monstros SET vida = 1844, ataque = 151, defesa = 74 WHERE id = 'ceifador_sombrio' AND vida = 1640 AND ataque = 134 AND defesa = 66;  -- nv 29, +12%
UPDATE public.rpg_monstros SET vida = 2033, ataque = 160, defesa = 82 WHERE id = 'vortex_do_olho' AND vida = 1780 AND ataque = 140 AND defesa = 72;  -- nv 31, +14%
UPDATE public.rpg_monstros SET vida = 2164, ataque = 163, defesa = 87 WHERE id = 'slime_do_vazio' AND vida = 1880 AND ataque = 142 AND defesa = 76;  -- nv 32, +15%
UPDATE public.rpg_monstros SET vida = 2350, ataque = 166, defesa = 90 WHERE id = 'ceifador_espectral' AND vida = 1980 AND ataque = 140 AND defesa = 76;  -- nv 36, +19%
UPDATE public.rpg_monstros SET vida = 2770, ataque = 178, defesa = 106 WHERE id = 'colosso_runico' AND vida = 2300 AND ataque = 148 AND defesa = 88;  -- nv 38, +20%
UPDATE public.rpg_monstros SET vida = 3373, ataque = 217, defesa = 121 WHERE id = 'golem_do_vazio' AND vida = 2740 AND ataque = 176 AND defesa = 98;  -- nv 41, +23%
UPDATE public.rpg_monstros SET vida = 3447, ataque = 226, defesa = 118 WHERE id = 'beholder_abissal' AND vida = 2780 AND ataque = 182 AND defesa = 95;  -- nv 42, +24%
UPDATE public.rpg_monstros SET vida = 3572, ataque = 235, defesa = 120 WHERE id = 'lich_das_sombras' AND vida = 2860 AND ataque = 188 AND defesa = 96;  -- nv 43, +25%
UPDATE public.rpg_monstros SET vida = 3824, ataque = 239, defesa = 133 WHERE id = 'dragao_esqueleto' AND vida = 3040 AND ataque = 190 AND defesa = 106;  -- nv 44, +26%
UPDATE public.rpg_monstros SET vida = 3901, ataque = 246, defesa = 137 WHERE id = 'grifo_dourado' AND vida = 3080 AND ataque = 194 AND defesa = 108;  -- nv 45, +27%
UPDATE public.rpg_monstros SET vida = 4187, ataque = 262, defesa = 139 WHERE id = 'serpente_espectral' AND vida = 3260 AND ataque = 204 AND defesa = 108;  -- nv 47, +28%
UPDATE public.rpg_monstros SET vida = 4219, ataque = 255, defesa = 143 WHERE id = 'rei_lich' AND vida = 3240 AND ataque = 196 AND defesa = 110;  -- nv 49, +30%
UPDATE public.rpg_monstros SET vida = 4620, ataque = 272, defesa = 150 WHERE id = 'draconato_do_trovao' AND vida = 3500 AND ataque = 206 AND defesa = 114;  -- nv 51, +32%
UPDATE public.rpg_monstros SET vida = 4704, ataque = 276, defesa = 154 WHERE id = 'serafim_celestial' AND vida = 3540 AND ataque = 208 AND defesa = 116;  -- nv 52, +33%
UPDATE public.rpg_monstros SET vida = 4929, ataque = 285, defesa = 162 WHERE id = 'kraken_abissal' AND vida = 3660 AND ataque = 212 AND defesa = 120;  -- nv 54, +35%
UPDATE public.rpg_monstros SET vida = 4423, ataque = 269, defesa = 147 WHERE id = 'dragao_tempestade' AND vida = 3420 AND ataque = 208 AND defesa = 114;  -- nv 48, +29%
UPDATE public.rpg_monstros SET vida = 5124, ataque = 293, defesa = 165 WHERE id = 'dragao_do_vazio' AND vida = 3780 AND ataque = 216 AND defesa = 122;  -- nv 55, +36%
UPDATE public.rpg_monstros SET vida = 5267, ataque = 300, defesa = 169 WHERE id = 'senhor_infernal' AND vida = 3860 AND ataque = 220 AND defesa = 124;  -- nv 56, +36%
UPDATE public.rpg_monstros SET vida = 5411, ataque = 308, defesa = 173 WHERE id = 'arcanjo_blindado' AND vida = 3940 AND ataque = 224 AND defesa = 126;  -- nv 57, +37%
UPDATE public.rpg_monstros SET vida = 5695, ataque = 321, defesa = 185 WHERE id = 'horror_da_fenda' AND vida = 4120 AND ataque = 232 AND defesa = 134;  -- nv 58, +38%

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT id, nivel, vida, ataque, defesa FROM public.rpg_monstros WHERE nivel > 15 ORDER BY nivel;
