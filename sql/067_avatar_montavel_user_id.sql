-- ==============================================================================
-- 067_avatar_montavel_user_id.sql
-- Corrige a RPC do avatar montável (#203). Depende do 065 (coluna avatar_custom).
-- ==============================================================================
--
-- O 065 filtrava por "id", coluna que profiles não tem: a chave é user_id (041).
-- O PL/pgSQL só resolve a coluna na execução, então o arquivo aplicava sem erro e
-- toda chamada falhava. Esta passa a ser a definição viva da função.
--
-- Pode ser aplicado antes ou depois do deploy do front.

CREATE OR REPLACE FUNCTION public.salvar_avatar_customizado(p_avatar jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_avatar  jsonb := p_avatar;
  v_linhas  integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Apenas usuários autenticados podem salvar avatar.';
  END IF;

  -- Nulo (SQL ou JSON) remove o avatar montável e volta para a foto ou a inicial.
  IF v_avatar IS NULL OR jsonb_typeof(v_avatar) = 'null' THEN
    v_avatar := NULL;
  ELSIF jsonb_typeof(v_avatar) <> 'object' THEN
    RAISE EXCEPTION 'Estrutura inválida de avatar customizado.';
  ELSIF octet_length(v_avatar::text) > 2000 THEN
    -- O avatar tem nove campos curtos; o teto impede gravar JSON arbitrário no perfil.
    RAISE EXCEPTION 'Avatar customizado grande demais.';
  END IF;

  UPDATE public.profiles
  SET avatar_custom = v_avatar,
      updated_at = now()
  WHERE user_id = v_user_id;

  GET DIAGNOSTICS v_linhas = ROW_COUNT;

  -- Sem perfil público ainda não existe linha em profiles: nada foi gravado.
  IF v_linhas = 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_perfil');
  END IF;

  RETURN jsonb_build_object('ok', true, 'avatar', v_avatar);
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_avatar_customizado(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_avatar_customizado(jsonb) TO authenticated;

-- =============================================================================
-- Como conferir (roda e desfaz; troque <UUID_A> por um usuário com perfil público
-- e <UUID_B> por um sem)
-- =============================================================================
--
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID_A>","role":"authenticated"}', true);
--
--   SELECT public.salvar_avatar_customizado('{"base":"redondo"}'::jsonb);  -- ok: true
--   SELECT avatar_custom FROM public.profiles WHERE user_id = '<UUID_A>';   -- {"base": "redondo"}
--   SELECT public.salvar_avatar_customizado(NULL);                          -- ok: true, avatar nulo
--   SELECT public.salvar_avatar_customizado('[1,2]'::jsonb);                -- erro de estrutura
--
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID_B>","role":"authenticated"}', true);
--   SELECT public.salvar_avatar_customizado('{"base":"redondo"}'::jsonb);  -- ok: false, motivo sem_perfil
-- ROLLBACK;
