-- =============================================================================
-- 115 — Novidades: avisos de atualização para todos os jogadores
-- =============================================================================
--
-- O admin publica uma novidade (nova função, correção, layout, balanceamento) com data e
-- hora, um resumo e um ou mais caminhos ("Ver Expedições" → /expedicoes). Cada novidade
-- tem a chave "no meio da tela": ligada, quem entra (ou já está com o site aberto) vê um
-- aviso central com os caminhos; desligada, ela só aparece na página /novidades.
--
-- Quem viu o quê fica em novidades_vistas: o aviso central aparece uma vez por pessoa.
-- Leitura direta pelo cliente (RLS); escrita só pelas funções, que conferem is_admin().
--
-- Pode rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.novidades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        TEXT NOT NULL CHECK (char_length(titulo) BETWEEN 3 AND 120),
  resumo        TEXT NOT NULL CHECK (char_length(resumo) BETWEEN 3 AND 2000),
  categoria     TEXT NOT NULL DEFAULT 'novidade'
                CHECK (categoria IN ('novidade', 'correcao', 'layout', 'balanceamento')),
  -- [{"rotulo": "Ver Expedições", "caminho": "/expedicoes"}], até 6.
  links         JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(links) = 'array'),
  publicado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  no_meio_da_tela BOOLEAN NOT NULL DEFAULT true,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  criado_por    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS novidades_publicado_em_idx ON public.novidades (publicado_em DESC);

CREATE TABLE IF NOT EXISTS public.novidades_vistas (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novidade_id UUID NOT NULL REFERENCES public.novidades(id) ON DELETE CASCADE,
  visto_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, novidade_id)
);

ALTER TABLE public.novidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novidades_vistas ENABLE ROW LEVEL SECURITY;

-- Todo mundo logado lê as publicadas (data já chegou); o admin lê todas, inclusive agendadas.
DROP POLICY IF EXISTS novidades_ler ON public.novidades;
CREATE POLICY novidades_ler ON public.novidades
  FOR SELECT TO authenticated
  USING ((ativo AND publicado_em <= now()) OR public.is_admin());

DROP POLICY IF EXISTS novidades_vistas_ler ON public.novidades_vistas;
CREATE POLICY novidades_vistas_ler ON public.novidades_vistas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.novidades, public.novidades_vistas FROM anon;
GRANT SELECT ON public.novidades, public.novidades_vistas TO authenticated;

-- =============================================================================
-- Jogador
-- =============================================================================

-- Novidades do aviso central que a pessoa ainda não viu (as mais novas primeiro, até 5).
CREATE OR REPLACE FUNCTION public.novidades_nao_vistas()
RETURNS SETOF public.novidades
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT n.*
    FROM public.novidades n
   WHERE auth.uid() IS NOT NULL
     AND n.ativo
     AND n.no_meio_da_tela
     AND n.publicado_em <= now()
     -- Conta criada depois da novidade não precisa do aviso.
     AND n.publicado_em >= COALESCE((SELECT u.created_at FROM auth.users u WHERE u.id = auth.uid()), '-infinity')
     AND NOT EXISTS (SELECT 1 FROM public.novidades_vistas v
                      WHERE v.user_id = auth.uid() AND v.novidade_id = n.id)
   ORDER BY n.publicado_em DESC
   LIMIT 5;
$$;

REVOKE ALL ON FUNCTION public.novidades_nao_vistas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.novidades_nao_vistas() TO authenticated;

CREATE OR REPLACE FUNCTION public.marcar_novidades_vistas(p_ids UUID[])
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.novidades_vistas (user_id, novidade_id)
  SELECT auth.uid(), n.id
    FROM public.novidades n
   WHERE auth.uid() IS NOT NULL AND n.id = ANY(p_ids)
  ON CONFLICT DO NOTHING;
$$;

REVOKE ALL ON FUNCTION public.marcar_novidades_vistas(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_novidades_vistas(UUID[]) TO authenticated;

-- =============================================================================
-- Admin
-- =============================================================================

-- Cria (p_id nulo) ou edita. Links: só caminhos internos começando com "/".
CREATE OR REPLACE FUNCTION public.salvar_novidade(
  p_id UUID,
  p_titulo TEXT,
  p_resumo TEXT,
  p_categoria TEXT,
  p_links JSONB,
  p_publicado_em TIMESTAMPTZ,
  p_no_meio_da_tela BOOLEAN,
  p_ativo BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_links JSONB;
  v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Só o admin publica novidades.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'rotulo', left(btrim(l->>'rotulo'), 40),
           'caminho', btrim(l->>'caminho'))), '[]'::jsonb)
    INTO v_links
    FROM jsonb_array_elements(COALESCE(p_links, '[]'::jsonb)) l
   WHERE btrim(COALESCE(l->>'rotulo', '')) <> ''
     AND btrim(COALESCE(l->>'caminho', '')) LIKE '/%'
     AND btrim(l->>'caminho') NOT LIKE '//%';

  IF jsonb_array_length(v_links) > 6 THEN
    RAISE EXCEPTION 'No máximo 6 caminhos por novidade.';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.novidades (titulo, resumo, categoria, links, publicado_em, no_meio_da_tela, ativo, criado_por)
    VALUES (btrim(p_titulo), btrim(p_resumo), COALESCE(p_categoria, 'novidade'), v_links,
            COALESCE(p_publicado_em, now()), COALESCE(p_no_meio_da_tela, true), COALESCE(p_ativo, true), auth.uid())
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.novidades
       SET titulo = btrim(p_titulo),
           resumo = btrim(p_resumo),
           categoria = COALESCE(p_categoria, categoria),
           links = v_links,
           publicado_em = COALESCE(p_publicado_em, publicado_em),
           no_meio_da_tela = COALESCE(p_no_meio_da_tela, no_meio_da_tela),
           ativo = COALESCE(p_ativo, ativo)
     WHERE id = p_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Novidade não encontrada.';
    END IF;
  END IF;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_novidade(UUID, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_novidade(UUID, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, BOOLEAN, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.apagar_novidade(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Só o admin apaga novidades.' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.novidades WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apagar_novidade(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apagar_novidade(UUID) TO authenticated;

-- Quantas pessoas já viram cada novidade (para o admin).
CREATE OR REPLACE FUNCTION public.novidades_alcance()
RETURNS TABLE (novidade_id UUID, vistas BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT v.novidade_id, count(*)
    FROM public.novidades_vistas v
   WHERE public.is_admin()
   GROUP BY v.novidade_id;
$$;

REVOKE ALL ON FUNCTION public.novidades_alcance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.novidades_alcance() TO authenticated;
