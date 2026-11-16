-- 078_rpg_reforco_monstros.sql
-- Fase 18 (#229): reforço dos monstros pós-tutorial após a entrada dos seis atributos
-- primários e do livro de habilidades (sql/077, #227).
--
-- Os dois monstros de tutorial (slime_de_eter, nível 1, e goblin_batedor, nível 4) ficam
-- inalterados. Do lobo_sombrio ao primordial_esquecido, Vida, Ataque e Defesa sobem para
-- preservar a progressão por faixa de equipamento e manter o chefe final desafiador no
-- nível 60 (~25% de vitória com itens lendários).
--
-- Idempotente: pode ser reaplicado sem efeito colateral.

UPDATE public.rpg_monstros SET vida = 380,  ataque = 48,  defesa = 24  WHERE id = 'lobo_sombrio';
UPDATE public.rpg_monstros SET vida = 900,  ataque = 70,  defesa = 50  WHERE id = 'golem_de_runas';
UPDATE public.rpg_monstros SET vida = 1400, ataque = 120, defesa = 62  WHERE id = 'espectro_do_vazio';
UPDATE public.rpg_monstros SET vida = 2100, ataque = 145, defesa = 80  WHERE id = 'cavaleiro_caido';
UPDATE public.rpg_monstros SET vida = 3600, ataque = 210, defesa = 120 WHERE id = 'dragao_de_eter';
UPDATE public.rpg_monstros SET vida = 4800, ataque = 255, defesa = 155 WHERE id = 'primordial_esquecido';

-- Como conferir:
-- SELECT id, nivel, vida, ataque, defesa FROM public.rpg_monstros ORDER BY ordem;
