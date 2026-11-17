-- =============================================================================
-- 088 — Resgate de convite volta a funcionar
-- =============================================================================
--
-- resgatar_codigo_convite (sql/062) falhava por inteiro em dois pontos, e o erro desfazia a
-- transação: nem o convidado recebia as AniCoins, nem o convite ficava registrado.
--
-- 1. Os INSERTs em crystal_ledger citavam a coluna saldo_apos, que não existe na tabela
--    (o saldo é a soma do extrato, sql/045).
-- 2. O XP do anfitrião ia ao xp_ledger sem mal_id e sem episode_number, que são NOT NULL.
--    Agora vai por conceder_xp_extra() (sql/087), uma vez por convidado.
--
-- O resto da função é o do 062, sem mudança. Esta passa a ser a definição viva.
--
-- Ordem: depois do 087. Pode rodar mais de uma vez.

CREATE OR REPLACE FUNCTION public.resgatar_codigo_convite(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_convidado_id uuid := auth.uid();
  v_convite public.convites_membros%ROWTYPE;
  v_regras_raw text;
  v_regras jsonb;
  v_anicoins_anfitriao integer := 50;
  v_xp_anfitriao integer := 100;
  v_anicoins_convidado integer := 30;
  v_anicoins_convidado_admin integer := 100;
  v_titulo_admin text := 'Afilhado do Fundador';
  v_moedas_para_convidado integer;
  v_titulo_concedido text := NULL;
  v_clean_code text;
BEGIN
  IF v_convidado_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  v_clean_code := lower(trim(p_codigo));
  IF v_clean_code IS NULL OR length(v_clean_code) = 0 THEN
    RAISE EXCEPTION 'Código de convite inválido.' USING ERRCODE = 'P0001';
  END IF;

  -- Lock para evitar resgates concorrentes
  PERFORM pg_advisory_xact_lock(hashtext(v_convidado_id::text));

  -- Já usou algum convite antes?
  IF EXISTS (SELECT 1 FROM public.convites_resgatados WHERE convidado_user_id = v_convidado_id) THEN
    RAISE EXCEPTION 'Você já resgatou um convite nesta conta.' USING ERRCODE = 'P0002';
  END IF;

  -- Busca o convite
  SELECT * INTO v_convite
    FROM public.convites_membros
   WHERE codigo = v_clean_code;

  IF v_convite.id IS NULL THEN
    RAISE EXCEPTION 'Código de convite não encontrado.' USING ERRCODE = 'P0003';
  END IF;

  -- Auto-convite proibido
  IF v_convite.anfitriao_user_id = v_convidado_id THEN
    RAISE EXCEPTION 'Você não pode usar o seu próprio código de convite.' USING ERRCODE = 'P0004';
  END IF;

  -- Lê configurações de app_settings
  SELECT value INTO v_regras_raw FROM public.app_settings WHERE key = 'regras_convites';
  IF v_regras_raw IS NOT NULL THEN
    BEGIN
      v_regras := v_regras_raw::jsonb;
      IF v_regras ? 'anicoins_anfitriao' THEN v_anicoins_anfitriao := (v_regras->>'anicoins_anfitriao')::int; END IF;
      IF v_regras ? 'xp_anfitriao' THEN v_xp_anfitriao := (v_regras->>'xp_anfitriao')::int; END IF;
      IF v_regras ? 'anicoins_convidado' THEN v_anicoins_convidado := (v_regras->>'anicoins_convidado')::int; END IF;
      IF v_regras ? 'anicoins_convidado_admin' THEN v_anicoins_convidado_admin := (v_regras->>'anicoins_convidado_admin')::int; END IF;
      IF v_regras ? 'titulo_convidado_admin' THEN v_titulo_admin := v_regras->>'titulo_convidado_admin'; END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Mantém valores padrão
    END;
  END IF;

  -- Determina recompensas
  IF v_convite.especial_admin THEN
    v_moedas_para_convidado := v_anicoins_convidado_admin;
    v_titulo_concedido := v_titulo_admin;
  ELSE
    v_moedas_para_convidado := v_anicoins_convidado;
    v_titulo_concedido := NULL;
  END IF;

  -- 1. Paga o Convidado (AniCoins no crystal_ledger)
  IF v_moedas_para_convidado > 0 THEN
    INSERT INTO public.crystal_ledger (
      user_id,
      quantidade,
      motivo,
      referencia
    ) VALUES (
      v_convidado_id,
      v_moedas_para_convidado,
      'bonus_convite_entrada',
      'convite:entrada:' || v_convidado_id::text
    )
    ON CONFLICT (user_id, motivo, referencia) DO NOTHING;
  END IF;

  -- 2. Concede título especial se for convite de admin
  IF v_titulo_concedido IS NOT NULL THEN
    UPDATE public.profiles
       SET titulos_desbloqueados = CASE
             WHEN titulos_desbloqueados ? v_titulo_concedido THEN titulos_desbloqueados
             ELSE titulos_desbloqueados || jsonb_build_array(v_titulo_concedido)
           END,
           titulo_ativo = CASE
             WHEN titulo_ativo IS NULL OR titulo_ativo = 'Aventureiro Iniciante' THEN v_titulo_concedido
             ELSE titulo_ativo
           END
     WHERE user_id = v_convidado_id;
  END IF;

  -- 3. Paga o Anfitrião (AniCoins)
  IF v_anicoins_anfitriao > 0 THEN
    INSERT INTO public.crystal_ledger (
      user_id,
      quantidade,
      motivo,
      referencia
    ) VALUES (
      v_convite.anfitriao_user_id,
      v_anicoins_anfitriao,
      'recompensa_convidar_amigo',
      'convite:anfitriao:' || v_convite.id::text || ':' || v_convidado_id::text
    )
    ON CONFLICT (user_id, motivo, referencia) DO NOTHING;
  END IF;

  -- 4. Paga o Anfitrião (XP sem episódio, uma vez por convidado)
  IF v_xp_anfitriao > 0 THEN
    PERFORM public.conceder_xp_extra(
      v_convite.anfitriao_user_id,
      LEAST(v_xp_anfitriao, 500),
      'Convite de amigo',
      'convite:' || v_convidado_id::text
    );
  END IF;

  -- 5. Registra o resgate
  INSERT INTO public.convites_resgatados (
    convite_id,
    anfitriao_user_id,
    convidado_user_id,
    recompensa_anfitriao_anicoins,
    recompensa_anfitriao_xp,
    recompensa_convidado_anicoins,
    titulo_concedido,
    especial_admin
  ) VALUES (
    v_convite.id,
    v_convite.anfitriao_user_id,
    v_convidado_id,
    v_anicoins_anfitriao,
    v_xp_anfitriao,
    v_moedas_para_convidado,
    v_titulo_concedido,
    v_convite.especial_admin
  );

  -- 6. Atualiza contador do convite
  UPDATE public.convites_membros
     SET usos_total = usos_total + 1,
         anicoins_ganhos = anicoins_ganhos + v_anicoins_anfitriao
   WHERE id = v_convite.id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'especial_admin', v_convite.especial_admin,
    'anicoins_ganhos', v_moedas_para_convidado,
    'titulo_concedido', v_titulo_concedido
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resgatar_codigo_convite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resgatar_codigo_convite(text) TO authenticated;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT prosrc LIKE '%saldo_apos%' AS ainda_quebrada
--   FROM pg_proc WHERE proname = 'resgatar_codigo_convite';
-- -- false
