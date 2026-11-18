-- =============================================================================
-- 117 — Novidades: apagar vai para a lixeira, com restaurar
-- =============================================================================
--
-- No 115, apagar_novidade() removia a linha de vez, e um clique errado perdia o texto.
-- Agora apagar marca apagada_em e desliga; a novidade some para os jogadores e fica na
-- Lixeira do Painel, de onde volta com restaurar_novidade(). Depois do 116.

ALTER TABLE public.novidades ADD COLUMN IF NOT EXISTS apagada_em TIMESTAMPTZ;

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
  UPDATE public.novidades SET apagada_em = now(), ativo = false WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apagar_novidade(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apagar_novidade(UUID) TO authenticated;

-- Volta desligada: o admin confere e publica de novo.
CREATE OR REPLACE FUNCTION public.restaurar_novidade(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Só o admin restaura novidades.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.novidades SET apagada_em = NULL WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.restaurar_novidade(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restaurar_novidade(UUID) TO authenticated;
