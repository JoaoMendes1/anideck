-- ============================================================================
-- 052_apoiador_config.sql
-- Fase 16 · Bloco 16.5 — Apoiador por link externo (Issue #178)
--
-- Configuração de apoio comunitário externo (Apoia.se, Catarse, Livepix, Pix)
-- guardada em app_settings ('apoiador_config') e itens cosméticos lendários
-- exclusivos de Apoiador na vitrine da Loja (store_items).
-- ============================================================================

-- 1. Configuração inicial em app_settings
INSERT INTO public.app_settings (key, value)
VALUES (
  'apoiador_config',
  jsonb_build_object(
    'ativo', true,
    'link', 'https://apoia.se/anideck',
    'chave_pix', '',
    'mensagem', 'Ajude a manter os servidores e a IA do AniDeck funcionando com curadoria própria e sem anúncios invasivos.'
  )
)
ON CONFLICT (key) DO NOTHING;

-- 2. Permite itens com preco = 0 (itens concedidos a apoiadores ou promocionais)
ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_preco_check;
ALTER TABLE public.store_items ADD CONSTRAINT store_items_preco_check CHECK (preco >= 0);

-- 3. Cosméticos exclusivos de Apoiador em store_items
INSERT INTO public.store_items (id, tipo, nome, descricao, preco, raridade, estilo, icone, ativo, ordem)
VALUES
  (
    'emblema_coracao_apoiador',
    'emblema',
    'Coração de Apoiador',
    'Selo especial de agradecimento a quem mantém os servidores e IA do AniDeck no ar.',
    0,
    'lendario',
    'apoiador',
    'Heart',
    true,
    50
  ),
  (
    'moldura_aura_apoiador',
    'moldura',
    'Aura de Apoiador',
    'Moldura com aura cósmica dourada e rosa exclusiva para quem apoia o projeto.',
    0,
    'lendario',
    'apoiador',
    'Sparkles',
    true,
    51
  ),
  (
    'tema_nebulosa_vip',
    'tema_perfil',
    'Nebulosa VIP',
    'Tema de perfil estelar exclusivo com gradiente cósmico e brilho neon.',
    0,
    'lendario',
    'vip',
    'Crown',
    true,
    52
  )
ON CONFLICT (id) DO UPDATE
SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  preco = EXCLUDED.preco,
  raridade = EXCLUDED.raridade,
  estilo = EXCLUDED.estilo,
  icone = EXCLUDED.icone,
  ativo = true,
  ordem = EXCLUDED.ordem;
