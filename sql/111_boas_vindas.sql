-- =============================================================================
-- 111 — Recompensa de boas-vindas da configuração inicial
-- =============================================================================
--
-- Quem termina a configuração inicial (/bem-vindo) ganha, uma única vez, 50 AniCoins e o
-- título "Recém-desperto".
--
-- Regras:
--   - Só contas criadas a partir de 18/11/2026, quando a configuração inicial entrou no ar:
--     quem já usava o AniDeck não passou por ela e não resgata pela API.
--   - Uma vez por conta: a chave única de crystal_ledger (user_id, motivo, referencia)
--     impede o segundo crédito, mesmo com dois cliques ao mesmo tempo.
--   - O título entra em profiles.titulos_desbloqueados (TEXT[]) se o perfil já existir.
--     Sem perfil (quem pulou o primeiro passo), só os AniCoins são creditados.
--
-- Chamada pelo próprio usuário (supabase.rpc com o token): a função usa auth.uid() e é
-- SECURITY DEFINER para gravar no ledger e no perfil sem dar escrita direta nessas tabelas.
--
-- Pode rodar mais de uma vez.

CREATE OR REPLACE FUNCTION public.resgatar_boas_vindas()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_criada  TIMESTAMPTZ;
  v_linhas  INTEGER;
  v_titulo  CONSTANT TEXT := 'Recém-desperto';
  v_valor   CONSTANT INTEGER := 50;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT created_at INTO v_criada FROM auth.users WHERE id = v_user;
  IF v_criada IS NULL OR v_criada < TIMESTAMPTZ '2026-11-18 00:00:00-03' THEN
    RETURN jsonb_build_object('ganhou', false, 'motivo', 'conta_antiga');
  END IF;

  INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
  VALUES (v_user, v_valor, 'boas_vindas', 'configuracao_inicial')
  ON CONFLICT (user_id, motivo, referencia) DO NOTHING;
  GET DIAGNOSTICS v_linhas = ROW_COUNT;

  IF v_linhas = 0 THEN
    RETURN jsonb_build_object('ganhou', false, 'motivo', 'ja_resgatado');
  END IF;

  UPDATE public.profiles
     SET titulos_desbloqueados = array_append(COALESCE(titulos_desbloqueados, ARRAY[]::TEXT[]), v_titulo)
   WHERE user_id = v_user
     AND NOT (v_titulo = ANY (COALESCE(titulos_desbloqueados, ARRAY[]::TEXT[])));

  RETURN jsonb_build_object('ganhou', true, 'anicoins', v_valor, 'titulo', v_titulo);
END;
$$;

REVOKE ALL ON FUNCTION public.resgatar_boas_vindas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resgatar_boas_vindas() TO authenticated;
