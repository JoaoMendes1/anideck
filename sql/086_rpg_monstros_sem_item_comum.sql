-- =============================================================================
-- 086 — Monstros de item comum deixam de prometer item
-- =============================================================================
--
-- O Slime de Éter e o Goblin Batedor mostravam "15%" e "20% de item comum", mas nunca davam
-- item: todos os itens comuns do catálogo são do kit inicial (sql/071, inicial = true), e a
-- vitória só sorteia itens fora do kit. É a mesma causa do defeito da invocação (sql/082).
--
-- Aqui a chance desses monstros vai a zero, e a tela deixa de mostrá-la. Se um dia houver
-- item comum fora do kit, basta devolver a chance.
--
-- Dado de catálogo: pode ser aplicado a qualquer momento. Pode rodar mais de uma vez.

UPDATE public.rpg_monstros
   SET chance_item = 0
 WHERE raridade_item = 'comum'
   AND NOT EXISTS (
     SELECT 1 FROM public.rpg_itens i
      WHERE i.raridade = 'comum' AND i.ativo = true AND i.inicial = false
   );

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT id, chance_item, raridade_item FROM public.rpg_monstros ORDER BY ordem;
-- -- slime_de_eter e goblin_batedor com chance_item = 0
