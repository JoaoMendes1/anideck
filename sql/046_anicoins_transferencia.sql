-- =============================================================================
-- 046_anicoins_transferencia.sql
-- Fase 16 · AniCoins e Transferência P2P entre membros.
--
-- * Adiciona a função atômica transferir_cristais(...) restrita a service_role.
-- * Permite transferir AniCoins (cristais) entre dois usuários com trava de concorrência
--   (pg_advisory_xact_lock) no remetente, impedindo saldo negativo.
-- * Registra movimentação no crystal_ledger para ambos com referências cruzadas
--   únicas baseadas no handle e timestamp em milissegundos.
--
-- APLICAR ANTES de promover o código da transferência.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.transferir_cristais(
  p_remetente_id    UUID,
  p_destinatario_id UUID,
  p_quantidade      INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_saldo_remetente INTEGER;
  v_novo_saldo_remetente INTEGER;
  v_handle_remetente TEXT;
  v_handle_destinatario TEXT;
  v_ref_debito TEXT;
  v_ref_credito TEXT;
  v_agora_ms BIGINT;
BEGIN
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'A quantidade a transferir deve ser positiva (recebido: %)', p_quantidade
      USING ERRCODE = 'P0001';
  END IF;

  IF p_remetente_id = p_destinatario_id THEN
    RAISE EXCEPTION 'Não é permitido transferir AniCoins para si mesmo'
      USING ERRCODE = 'P0003';
  END IF;

  -- Obter handles dos perfis para referência clara no extrato
  SELECT handle INTO v_handle_remetente FROM public.profiles WHERE user_id = p_remetente_id;
  SELECT handle INTO v_handle_destinatario FROM public.profiles WHERE user_id = p_destinatario_id;

  IF v_handle_remetente IS NULL THEN
    v_handle_remetente := substring(p_remetente_id::text from 1 for 8);
  END IF;
  IF v_handle_destinatario IS NULL THEN
    v_handle_destinatario := substring(p_destinatario_id::text from 1 for 8);
  END IF;

  -- Timestamp em milissegundos para referência única (atende ao UNIQUE do ledger)
  v_agora_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_ref_debito  := 'para:@' || v_handle_destinatario || ':' || v_agora_ms::text;
  v_ref_credito := 'de:@' || v_handle_remetente || ':' || v_agora_ms::text;

  -- Trava atômica da transação para o remetente
  PERFORM pg_advisory_xact_lock(hashtext(p_remetente_id::text));

  SELECT COALESCE(SUM(quantidade), 0)::INTEGER INTO v_saldo_remetente
    FROM public.crystal_ledger
   WHERE user_id = p_remetente_id;

  IF v_saldo_remetente < p_quantidade THEN
    RAISE EXCEPTION 'Saldo insuficiente de AniCoins: saldo atual %, necessário %', v_saldo_remetente, p_quantidade
      USING ERRCODE = 'P0002';
  END IF;

  -- Inserir débito no extrato do remetente
  INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
  VALUES (p_remetente_id, -p_quantidade, 'transferencia_enviada', v_ref_debito);

  -- Inserir crédito no extrato do destinatário
  INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
  VALUES (p_destinatario_id, p_quantidade, 'transferencia_recebida', v_ref_credito);

  v_novo_saldo_remetente := v_saldo_remetente - p_quantidade;

  RETURN jsonb_build_object(
    'sucesso', true,
    'novo_saldo_remetente', v_novo_saldo_remetente,
    'destinatario_handle', v_handle_destinatario,
    'quantidade', p_quantidade
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transferir_cristais(UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transferir_cristais(UUID, UUID, INTEGER) TO service_role;
