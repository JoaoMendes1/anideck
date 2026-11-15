-- 074_loja_skins.sql
-- Fase 18 (18.2c): skins do personagem, vendidas na Loja.
--
-- Skin é um "visual" desbloqueado por compra, como o estágio é um visual desbloqueado por
-- nível. Ela NÃO ocupa slot em user_equipped: veste-se pela mesma escolha de visual
-- (rpg_personagens.visual_equipado, sql/068), e o Go confere a posse em user_items.
--
-- comprar_item (sql/053) só equipa sozinho moldura, tema, cor e emblema, então comprar skin
-- não tenta gravar em user_equipped e não esbarra no CHECK de slot.
--
-- O id da skin é o próprio visual: precisa caber no formato de visual_equipado
-- (^[a-z0-9_]{1,40}$). A arte é provisória: o app desenha um estágio com filtro de cor,
-- pelo mapa SKINS em client/src/lib/personagem.ts.
--
-- Idempotente: pode ser reaplicado sem efeito.

ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_tipo_check;
ALTER TABLE public.store_items ADD CONSTRAINT store_items_tipo_check
  CHECK (tipo IN ('moldura', 'tema_perfil', 'cor_nome', 'emblema', 'expansao', 'cenario', 'aura', 'skin'));

INSERT INTO public.store_items (id, tipo, nome, descricao, preco, raridade, estilo, icone, ordem)
VALUES
  ('skin_carmesim',  'skin', 'Traje Carmesim',  'O casaco e a capa tingidos de vermelho-sangue.',      300, 'raro',  'skin-carmesim',  'Flame',    60),
  ('skin_esmeralda', 'skin', 'Traje Esmeralda', 'Verde das florestas do reino élfico.',                300, 'raro',  'skin-esmeralda', 'Sparkles', 61),
  ('skin_sombra',    'skin', 'Traje das Sombras', 'Para quem prefere não ser visto chegando.',          450, 'epico', 'skin-sombra',    'Crown',    62),
  ('skin_solar',     'skin', 'Traje Solar',     'Dourado como o primeiro sol depois da tempestade.',   450, 'epico', 'skin-solar',     'Zap',      63)
ON CONFLICT (id) DO NOTHING;

-- Como conferir:
-- SELECT id, tipo, preco, estilo FROM public.store_items WHERE tipo = 'skin' ORDER BY ordem;
