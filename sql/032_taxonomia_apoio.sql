-- 032_taxonomia_apoio.sql
-- Apoio para a gestao de taxonomia pelo Painel.
--
-- 1) Harem Reverso era o unico display_name_pt SEM um raw_name em portugues:
--    so existiam 'Male Harem' e 'Reverse Harem'. Como a curadoria grava em
--    portugues, nao havia texto para gravar -- o autocomplete cairia no ingles
--    so nesse caso.
--
-- 2) RPC de contagem: remover uma entrada da taxonomia devolve os animes que a
--    usam para 'ignorado', e eles somem dos graficos. A tela precisa dizer
--    quantos ANTES de apagar.

INSERT INTO genre_taxonomy (raw_name, display_name_pt, tier) VALUES
  ('Harém Reverso', 'Harém Reverso', 'tag_tematica')
ON CONFLICT (raw_name) DO NOTHING;

-- Quantos animes curados usam este texto exato em custom_tags.
-- STABLE e sem SECURITY DEFINER: e leitura, e curated_animes ja tem policy de
-- SELECT publica. Definer aqui seria privilegio sem motivo.
CREATE OR REPLACE FUNCTION public.contar_animes_com_tag(tag_alvo text)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer
  FROM curated_animes
  WHERE custom_tags @> ARRAY[tag_alvo];
$$;

REVOKE EXECUTE ON FUNCTION public.contar_animes_com_tag(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.contar_animes_com_tag(text) TO authenticated;