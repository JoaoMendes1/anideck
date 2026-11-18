-- =============================================================================
-- 116 — Novidades chegam prontas: rascunhos trazidos por cada entrega
-- =============================================================================
--
-- Cada entrega visível ao jogador traz o texto da novidade no repositório
-- (internal/handlers/novidades_rascunhos.json). No boot do site, o Go chama
-- importar_rascunho_novidade() para cada item: entra como rascunho (não publicado), uma vez
-- só por chave. Se o admin editar ou apagar, o próximo deploy não traz de volta.
--
-- Publicar (salvar_novidade com ativo = true) tira a marca de rascunho pelo gatilho.
--
-- Pode rodar mais de uma vez. Depois do 115.

ALTER TABLE public.novidades
  ADD COLUMN IF NOT EXISTS chave    TEXT,
  ADD COLUMN IF NOT EXISTS rascunho BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS novidades_chave_idx ON public.novidades (chave) WHERE chave IS NOT NULL;

-- Chaves já importadas, inclusive as que o admin apagou depois: apagar não faz voltar.
CREATE TABLE IF NOT EXISTS public.novidades_chaves_importadas (
  chave         TEXT PRIMARY KEY,
  importado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.novidades_chaves_importadas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.novidades_chaves_importadas FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.novidade_tira_rascunho()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.ativo THEN
    NEW.rascunho := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS novidades_tira_rascunho ON public.novidades;
CREATE TRIGGER novidades_tira_rascunho
  BEFORE INSERT OR UPDATE ON public.novidades
  FOR EACH ROW EXECUTE FUNCTION public.novidade_tira_rascunho();

-- Devolve true quando criou o rascunho; false quando a chave já tinha vindo antes.
-- A data é a do deploy, que é quando a atualização chegou ao site.
CREATE OR REPLACE FUNCTION public.importar_rascunho_novidade(
  p_chave TEXT,
  p_titulo TEXT,
  p_resumo TEXT,
  p_categoria TEXT,
  p_links JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_links JSONB;
BEGIN
  IF btrim(COALESCE(p_chave, '')) = '' THEN
    RAISE EXCEPTION 'Rascunho sem chave.';
  END IF;

  INSERT INTO public.novidades_chaves_importadas (chave) VALUES (btrim(p_chave))
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'rotulo', left(btrim(l->>'rotulo'), 40),
           'caminho', btrim(l->>'caminho'))), '[]'::jsonb)
    INTO v_links
    FROM jsonb_array_elements(COALESCE(p_links, '[]'::jsonb)) l
   WHERE btrim(COALESCE(l->>'rotulo', '')) <> ''
     AND btrim(COALESCE(l->>'caminho', '')) LIKE '/%'
     AND btrim(l->>'caminho') NOT LIKE '//%';

  INSERT INTO public.novidades (chave, titulo, resumo, categoria, links, publicado_em, no_meio_da_tela, ativo, rascunho)
  VALUES (btrim(p_chave), btrim(p_titulo), btrim(p_resumo), COALESCE(p_categoria, 'novidade'),
          (SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) FROM (SELECT e FROM jsonb_array_elements(v_links) e LIMIT 6) x),
          now(), true, false, true);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.importar_rascunho_novidade(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.importar_rascunho_novidade(TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
