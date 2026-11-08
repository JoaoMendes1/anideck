-- =============================================================================
-- 047_missoes_diarias.sql
-- Fase 16 · Item 16.1b (#168): Missões diárias com recompensa em AniCoins.
--
-- * Registra o catálogo de missões diárias em app_settings (chave 'missoes_catalogo').
-- * Cada missão define tipo, meta e quantidade de AniCoins de recompensa.
-- * O resgate usa a RPC idempotente creditar_cristais (do sql/045) com motivo 'missao_diaria'
--   e referência 'missao:YYYY-MM-DD:<id>', garantida pelo UNIQUE do crystal_ledger.
--
-- APLICAR ANTES de promover o código da #168.
-- =============================================================================

INSERT INTO public.app_settings (key, value, updated_at)
VALUES (
  'missoes_catalogo',
  '[
    {"id": "ep_hoje", "tipo": "marcar_episodios", "titulo": "Episódio do Dia", "descricao": "Marque pelo menos 1 episódio como visto hoje", "meta": 1, "recompensa": 15},
    {"id": "maratona", "tipo": "marcar_episodios", "titulo": "Ritmo de Maratona", "descricao": "Assista a 3 episódios de qualquer anime hoje", "meta": 3, "recompensa": 30},
    {"id": "lancamento", "tipo": "marcar_lancamento", "titulo": "Na Crista da Onda", "descricao": "Assista a 1 episódio de um anime em lançamento", "meta": 1, "recompensa": 20},
    {"id": "reacao", "tipo": "reagir_episodio", "titulo": "Reator Emocional", "descricao": "Deixe sua reação com emoji em 2 episódios", "meta": 2, "recompensa": 15},
    {"id": "comentario", "tipo": "comentar_episodio", "titulo": "Voz na Comunidade", "descricao": "Escreva um comentário em qualquer episódio", "meta": 1, "recompensa": 20},
    {"id": "obra_concluida", "tipo": "completar_obra", "titulo": "Missão Cumprida", "descricao": "Marque 1 anime como completo no seu deck", "meta": 1, "recompensa": 40}
  ]',
  now()
)
ON CONFLICT (key) DO NOTHING;
