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

-- 2. Cosméticos exclusivos de Apoiador em store_items
INSERT INTO public.store_items (slug, nome, descricao, tipo, slot, icone, raridade, preco, estilo, ativo)
VALUES
  (
    'emblema-coracao-apoiador',
    'Coração de Apoiador',
    'Selo especial de agradecimento a quem mantém os servidores e IA do AniDeck no ar.',
    'emblema',
    'emblema',
    'Heart',
    'lendario',
    0,
    'apoiador',
    true
  ),
  (
    'moldura-aura-apoiador',
    'Aura de Apoiador',
    'Moldura com aura cósmica dourada e rosa exclusiva para quem apoia o projeto.',
    'moldura',
    'moldura',
    'Sparkles',
    'lendario',
    0,
    'apoiador',
    true
  ),
  (
    'tema-nebulosa-vip',
    'Nebulosa VIP',
    'Tema de perfil estelar exclusivo com gradiente cósmico e brilho neon.',
    'tema_perfil',
    'tema_perfil',
    'Crown',
    'lendario',
    0,
    'vip',
    true
  )
ON CONFLICT (slug) DO UPDATE
SET ativo = true;
