-- ==============================================================================
-- 065_avatar_montavel.sql
-- Fase 17.6: Avatar montável em camadas vetoriais geométricas (#192)
-- ==============================================================================

-- 1. Coluna avatar_custom no perfil do usuário
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_custom jsonb DEFAULT NULL;

-- 2. RPC para salvar a configuração de avatar customizado com validação básica
CREATE OR REPLACE FUNCTION public.salvar_avatar_customizado(p_avatar jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Apenas usuários autenticados podem salvar avatar.';
  END IF;

  -- Se p_avatar for nulo, limpa o avatar customizado voltando para imagem/padrão
  IF p_avatar IS NULL OR jsonb_typeof(p_avatar) = 'null' THEN
    UPDATE public.profiles
    SET avatar_custom = NULL,
        updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('ok', true, 'avatar', NULL);
  END IF;

  -- Valida se é um objeto json
  IF jsonb_typeof(p_avatar) <> 'object' THEN
    RAISE EXCEPTION 'Estrutura inválida de avatar customizado.';
  END IF;

  UPDATE public.profiles
  SET avatar_custom = p_avatar,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'avatar', p_avatar);
END;
$$;

GRANT EXECUTE ON FUNCTION public.salvar_avatar_customizado(jsonb) TO authenticated;
