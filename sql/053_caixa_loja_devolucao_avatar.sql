-- 053_caixa_loja_devolucao_avatar.sql
-- Fase 16 (#198): Caixa/Cofre da Loja, devolução de cosméticos com taxa configurável,
-- cosméticos temáticos exclusivos da Temporada 1, foto de perfil (avatar_url) e apoiador em profiles.

-- =============================================================================
-- 1. Colunas novas em profiles e store_items
-- =============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS apoiador BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Libera avatar_url para atualização pelo próprio usuário autenticado
GRANT UPDATE (handle, nome, bio, vitrine, publico, avatar_url, updated_at) ON public.profiles TO authenticated;

-- Suporte a temporada em store_items
ALTER TABLE public.store_items ADD COLUMN IF NOT EXISTS temporada INTEGER;

-- =============================================================================
-- 2. Saldo do Caixa/Cofre da Loja (UUID de sistema: 00000000-0000-0000-0000-000000000001)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.saldo_caixa_loja()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(quantidade), 0)::integer
    FROM public.crystal_ledger
   WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;
$$;

REVOKE ALL ON FUNCTION public.saldo_caixa_loja() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saldo_caixa_loja() TO service_role;

-- =============================================================================
-- 3. Atualização de comprar_item com crédito no Caixa da Loja e trava de Apoiador
-- =============================================================================

CREATE OR REPLACE FUNCTION public.comprar_item(p_item_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_item        RECORD;
  v_saldo       INTEGER;
  v_novo_saldo  INTEGER;
  v_ref         TEXT;
  v_eh_apoiador BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_item
    FROM public.store_items
   WHERE id = p_item_id AND ativo = true;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Item inexistente ou inativo.' USING ERRCODE = 'P0002';
  END IF;

  -- Lock transacional no usuário para serializar compras
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- Confere se já possui
  IF EXISTS (SELECT 1 FROM public.user_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'Você já possui este item cosmético.' USING ERRCODE = 'P0003';
  END IF;

  -- Se o item for exclusivo de Apoiador ou VIP, confere flag na conta
  IF v_item.estilo IN ('apoiador', 'vip') THEN
    SELECT COALESCE(apoiador, false) INTO v_eh_apoiador
      FROM public.profiles
     WHERE user_id = v_user_id;

    IF NOT v_eh_apoiador THEN
      RAISE EXCEPTION 'Este item é exclusivo para Apoiadores do AniDeck. Conheça as opções no menu Seja um Apoiador para desbloquear!'
        USING ERRCODE = 'P0005';
    END IF;
  END IF;

  -- Confere saldo atual no crystal_ledger
  SELECT COALESCE(SUM(quantidade), 0)::INTEGER INTO v_saldo
    FROM public.crystal_ledger
   WHERE user_id = v_user_id;

  IF v_item.preco > 0 AND v_saldo < v_item.preco THEN
    RAISE EXCEPTION 'Saldo insuficiente de AniCoins (saldo: %, necessário: %)',
      v_saldo, v_item.preco
      USING ERRCODE = 'P0004';
  END IF;

  v_ref := 'loja:' || p_item_id || ':' || (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;

  -- Se preço for maior que 0, registra débito do usuário e crédito no Caixa da Loja
  IF v_item.preco > 0 THEN
    INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
    VALUES (v_user_id, -v_item.preco, 'loja_compra', v_ref);

    INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
    VALUES ('00000000-0000-0000-0000-000000000001'::uuid, v_item.preco, 'receita_loja', 'de:' || v_user_id::text || ':' || p_item_id);

    v_novo_saldo := v_saldo - v_item.preco;
  ELSE
    v_novo_saldo := v_saldo;
  END IF;

  -- Registra posse
  INSERT INTO public.user_items (user_id, item_id)
  VALUES (v_user_id, p_item_id);

  -- Se for item de slot cosmético, auto-equipa no slot correspondente
  IF v_item.tipo IN ('moldura', 'tema_perfil', 'cor_nome', 'emblema') THEN
    INSERT INTO public.user_equipped (user_id, slot, item_id)
    VALUES (v_user_id, v_item.tipo, p_item_id)
    ON CONFLICT (user_id, slot) DO UPDATE
    SET item_id = EXCLUDED.item_id, equipado_em = now();
  END IF;

  RETURN jsonb_build_object(
    'sucesso', true,
    'item_id', v_item.id,
    'nome', v_item.nome,
    'tipo', v_item.tipo,
    'estilo', v_item.estilo,
    'novo_saldo', v_novo_saldo
  );
END;
$$;

REVOKE ALL ON FUNCTION public.comprar_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comprar_item(text) TO authenticated, service_role;

-- =============================================================================
-- 4. Função atômica de devolução de cosmético com taxa para o Caixa da Loja
-- =============================================================================

CREATE OR REPLACE FUNCTION public.devolver_item(p_item_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id         UUID := auth.uid();
  v_item            RECORD;
  v_possui          BOOLEAN;
  v_regras_raw      TEXT;
  v_devolucao_ativa BOOLEAN := true;
  v_taxa_retencao   INTEGER := 30; -- padrão 30% retido no caixa, 70% reembolsado
  v_reembolso       INTEGER;
  v_novo_saldo      INTEGER;
  v_ref             TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = 'P0001';
  END IF;

  -- Verifica configurações em app_settings
  SELECT value INTO v_regras_raw FROM public.app_settings WHERE key = 'economia_cristais';
  IF v_regras_raw IS NOT NULL THEN
    BEGIN
      v_devolucao_ativa := COALESCE((v_regras_raw::jsonb ->> 'devolucao_ativa')::boolean, true);
      v_taxa_retencao := COALESCE((v_regras_raw::jsonb ->> 'taxa_retencao_devolucao_pct')::integer, 30);
    EXCEPTION WHEN OTHERS THEN
      v_devolucao_ativa := true;
      v_taxa_retencao := 30;
    END;
  END IF;

  IF NOT v_devolucao_ativa THEN
    RAISE EXCEPTION 'A devolução de cosméticos está temporariamente desativada pela administração.'
      USING ERRCODE = 'P0006';
  END IF;

  SELECT * INTO v_item FROM public.store_items WHERE id = p_item_id;
  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Item inexistente.' USING ERRCODE = 'P0002';
  END IF;

  -- Trava transacional no usuário
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- Confere se possui
  SELECT EXISTS(SELECT 1 FROM public.user_items WHERE user_id = v_user_id AND item_id = p_item_id) INTO v_possui;
  IF NOT v_possui THEN
    RAISE EXCEPTION 'Você não possui este item cosmético no seu inventário.' USING ERRCODE = 'P0007';
  END IF;

  IF v_item.preco <= 0 THEN
    RAISE EXCEPTION 'Itens gratuitos ou de apoiador não geram reembolso em AniCoins.' USING ERRCODE = 'P0008';
  END IF;

  -- Calcula reembolso proporcional (ex: 70% do preço se taxa for 30%)
  IF v_taxa_retencao < 0 THEN v_taxa_retencao := 0; END IF;
  IF v_taxa_retencao > 90 THEN v_taxa_retencao := 90; END IF;

  v_reembolso := FLOOR(v_item.preco * ((100 - v_taxa_retencao)::numeric / 100))::integer;
  IF v_reembolso < 1 THEN
    v_reembolso := 1;
  END IF;

  -- Desequipa se estiver equipado
  DELETE FROM public.user_equipped WHERE user_id = v_user_id AND item_id = p_item_id;

  -- Remove do inventário
  DELETE FROM public.user_items WHERE user_id = v_user_id AND item_id = p_item_id;

  v_ref := 'devolucao:' || p_item_id || ':' || (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;

  -- Credita reembolso para o usuário
  INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
  VALUES (v_user_id, v_reembolso, 'loja_devolucao', v_ref);

  -- Debita o valor reembolsado do Caixa da Loja (o saldo remanescente fica no caixa como lucro)
  INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
  VALUES ('00000000-0000-0000-0000-000000000001'::uuid, -v_reembolso, 'reembolso_loja', 'usuario:' || v_user_id::text || ':' || p_item_id);

  SELECT COALESCE(SUM(quantidade), 0)::INTEGER INTO v_novo_saldo
    FROM public.crystal_ledger
   WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'item_id', v_item.id,
    'nome', v_item.nome,
    'reembolso', v_reembolso,
    'novo_saldo', v_novo_saldo,
    'mensagem', 'Item devolvido com sucesso! Reembolso de ' || v_reembolso || ' AniCoins creditado.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.devolver_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.devolver_item(text) TO authenticated, service_role;

-- =============================================================================
-- 5. Função de saque/transferência do Caixa da Loja (Admin / Service Role)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sacar_caixa_loja(
  p_destinatario_id UUID,
  p_quantidade      INTEGER,
  p_motivo          TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_saldo_caixa             INTEGER;
  v_novo_saldo_caixa        INTEGER;
  v_novo_saldo_destinatario INTEGER;
  v_destinatario_handle     TEXT;
  v_ref                     TEXT;
BEGIN
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'A quantidade a transferir do caixa deve ser positiva (recebido: %)', p_quantidade
      USING ERRCODE = 'P0001';
  END IF;

  -- Lock transacional no caixa
  PERFORM pg_advisory_xact_lock(hashtext('00000000-0000-0000-0000-000000000001'));

  SELECT COALESCE(SUM(quantidade), 0)::INTEGER INTO v_saldo_caixa
    FROM public.crystal_ledger
   WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;

  IF v_saldo_caixa < p_quantidade THEN
    RAISE EXCEPTION 'Saldo insuficiente no Caixa da Loja: disponível %, solicitado %',
      v_saldo_caixa, p_quantidade
      USING ERRCODE = 'P0002';
  END IF;

  SELECT handle INTO v_destinatario_handle FROM public.profiles WHERE user_id = p_destinatario_id;
  IF v_destinatario_handle IS NULL THEN
    v_destinatario_handle := substring(p_destinatario_id::text from 1 for 8);
  END IF;

  v_ref := 'saque_caixa:' || (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT || ':' || btrim(p_motivo);

  -- Debita do caixa
  INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
  VALUES ('00000000-0000-0000-0000-000000000001'::uuid, -p_quantidade, 'saque_caixa_admin', v_ref);

  -- Credita no destinatário
  INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
  VALUES (p_destinatario_id, p_quantidade, 'transferencia_caixa', 'do:caixa_loja:' || v_ref);

  v_novo_saldo_caixa := v_saldo_caixa - p_quantidade;

  SELECT COALESCE(SUM(quantidade), 0)::INTEGER INTO v_novo_saldo_destinatario
    FROM public.crystal_ledger
   WHERE user_id = p_destinatario_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'novo_saldo_caixa', v_novo_saldo_caixa,
    'novo_saldo_destinatario', v_novo_saldo_destinatario,
    'destinatario_handle', v_destinatario_handle,
    'quantidade', p_quantidade
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sacar_caixa_loja(UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sacar_caixa_loja(UUID, INTEGER, TEXT) TO service_role;

-- =============================================================================
-- 6. Cosméticos exclusivos da Temporada 1 (Battle Royale Theme)
-- =============================================================================

INSERT INTO public.store_items (id, tipo, nome, descricao, preco, raridade, estilo, icone, ativo, ordem, temporada)
VALUES
  (
    'moldura_s1_vanguarda',
    'moldura',
    'Vanguarda Carmesim (S1)',
    'Moldura com aura cósmica rubra e dourada com efeito pulsante exclusiva da Temporada 1.',
    350,
    'lendario',
    'temporada_s1',
    'ShieldAlert',
    true,
    60,
    1
  ),
  (
    'emblema_s1_gladiador',
    'emblema',
    'Gladiador da S1',
    'Insígnia dourada de gladiador da arena competitiva de animes da Temporada 1.',
    200,
    'epico',
    'temporada_s1',
    'Trophy',
    true,
    61,
    1
  ),
  (
    'cor_nome_s1_relampago',
    'cor_nome',
    'Relâmpago Escarlate (S1)',
    'Destaque no seu @handle com tom carmesim neon reluzente exclusivo da Temporada 1.',
    300,
    'lendario',
    'temporada_s1',
    'Zap',
    true,
    62,
    1
  ),
  (
    'tema_s1_arena',
    'tema_perfil',
    'Arena Suprema (S1)',
    'Atmosfera de coliseu cibernético com partículas rubras e bordas néon da Temporada 1.',
    400,
    'lendario',
    'temporada_s1',
    'Flame',
    true,
    63,
    1
  )
ON CONFLICT (id) DO UPDATE
SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  preco = EXCLUDED.preco,
  raridade = EXCLUDED.raridade,
  estilo = EXCLUDED.estilo,
  icone = EXCLUDED.icone,
  ativo = true,
  ordem = EXCLUDED.ordem,
  temporada = EXCLUDED.temporada;
