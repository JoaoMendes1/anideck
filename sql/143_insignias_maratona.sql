-- =============================================================================
-- 143 — Insígnias colecionáveis para missões de maratona concluídas
-- =============================================================================
-- Acrescenta "Primeira Maratona" (meta 1) e "Lenda das Maratonas" (meta 5) ao
-- catálogo em app_settings.guilda_insignias de forma idempotente, preservando
-- todas as cartas já configuradas no Painel Admin.

UPDATE public.app_settings
   SET value = (
     COALESCE(NULLIF(btrim(value), ''), '[]')::jsonb ||
     '[
       {"id":"maratonista_1","icone":"🏁","nome":"Primeira Maratona","descricao":"Concluir 1 missão de maratona","regra":"maratonas_concluidas","meta":1,"estilo":"foil"},
       {"id":"maratonista_5","icone":"🏆","nome":"Lenda das Maratonas","descricao":"Concluir 5 missões de maratona","regra":"maratonas_concluidas","meta":5,"estilo":"foil2"}
     ]'::jsonb
   )::text,
       updated_at = now()
 WHERE key = 'guilda_insignias'
   AND NOT EXISTS (
     SELECT 1
       FROM jsonb_array_elements(COALESCE(NULLIF(btrim(value), ''), '[]')::jsonb) AS elem
      WHERE elem->>'regra' = 'maratonas_concluidas'
   );
