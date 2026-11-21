-- =============================================================================
-- 144 — Equipamento exclusivo por cópia possuída entre os heróis (#344)
-- =============================================================================
-- Impede que o mesmo item do inventário (quando há apenas 1 cópia, ou quando todas
-- as cópias já estão vestidas por outros personagens) seja equipado por mais de um
-- herói ao mesmo tempo, além de limpar eventuais duplicidades anteriores ao bloqueio
-- e impedir venda/desmonte de cópias atualmente equipadas.

-- 1. Nome legível dos heróis do elenco para mensagens de validação
CREATE OR REPLACE FUNCTION public.rpg_nome_padrao_heroi(p_base TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_base
    WHEN 'espadachim_eter' THEN 'Espadachim de Éter'
    WHEN 'lanceiro_fogo'   THEN 'Haruto'
    WHEN 'assassina_raio'  THEN 'Rin'
    WHEN 'maga_agua'       THEN 'Mizuki'
    WHEN 'guerreiro_terra' THEN 'Brokk'
    WHEN 'paladina_luz'    THEN 'Celestia'
    WHEN 'arqueiro_trevas' THEN 'Yoru'
    ELSE COALESCE(NULLIF(btrim(p_base), ''), 'outro personagem')
  END;
$$;

-- 2. Saneamento único: se alguma conta já equipou o mesmo item em mais heróis do
-- que a quantidade possuída, mantém quem equipou primeiro e remove o excesso.
WITH ranqueados AS (
  SELECT eh.user_id,
         eh.personagem_base,
         eh.slot,
         COALESCE(inv.quantidade, 0) AS qtd,
         ROW_NUMBER() OVER (
           PARTITION BY eh.user_id, eh.item_id
           ORDER BY
             eh.equipado_em ASC,
             CASE WHEN eh.personagem_base = p.personagem_base THEN 0 ELSE 1 END,
             eh.personagem_base ASC
         ) AS rn
    FROM public.rpg_equipados_herois eh
    JOIN public.rpg_personagens p ON p.user_id = eh.user_id
    LEFT JOIN public.rpg_inventario inv
      ON inv.user_id = eh.user_id AND inv.item_id = eh.item_id
)
DELETE FROM public.rpg_equipados_herois eh
 USING ranqueados r
 WHERE eh.user_id = r.user_id
   AND eh.personagem_base = r.personagem_base
   AND eh.slot = r.slot
   AND r.rn > r.qtd;

-- Sincroniza rpg_equipados do herói ativo com o que restou em rpg_equipados_herois.
DELETE FROM public.rpg_equipados e
 WHERE NOT EXISTS (
   SELECT 1
     FROM public.rpg_equipados_herois eh
     JOIN public.rpg_personagens p
       ON p.user_id = eh.user_id
      AND p.personagem_base = eh.personagem_base
    WHERE eh.user_id = e.user_id
      AND eh.slot = e.slot
      AND eh.item_id = e.item_id
 );

-- 3. rpg_equipar_item confere se restam cópias livres fora do slot/herói atual
CREATE OR REPLACE FUNCTION public.rpg_equipar_item(
  p_slot    TEXT,
  p_item_id TEXT,
  p_base    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_personagem    public.rpg_personagens%ROWTYPE;
  v_desbloqueados TEXT[];
  v_base          TEXT;
  v_item          public.rpg_itens%ROWTYPE;
  v_qtd           INTEGER;
  v_em_uso_outros INTEGER;
  v_outro_heroi   TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF p_slot IS NULL OR p_slot NOT IN ('arma', 'elmo', 'armadura', 'luvas', 'capa', 'botas', 'joia') THEN
    RETURN jsonb_build_object('erro', 'Slot inválido.');
  END IF;

  SELECT * INTO v_personagem
    FROM public.rpg_personagens
   WHERE user_id = v_user_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Desperte o personagem antes.');
  END IF;

  v_base := COALESCE(NULLIF(btrim(p_base), ''), v_personagem.personagem_base);
  IF NOT public.rpg_personagem_existe(v_base) THEN
    RETURN jsonb_build_object('erro', 'Personagem desconhecido.');
  END IF;

  v_desbloqueados := COALESCE(v_personagem.desbloqueados, ARRAY[v_personagem.personagem_base]);
  IF NOT (v_personagem.personagem_base = ANY(v_desbloqueados)) THEN
    v_desbloqueados := array_append(v_desbloqueados, v_personagem.personagem_base);
  END IF;
  IF NOT (v_base = ANY(v_desbloqueados)) THEN
    RETURN jsonb_build_object('erro', 'Desbloqueie este personagem antes de equipar itens nele.');
  END IF;

  IF p_item_id IS NULL OR btrim(p_item_id) = '' THEN
    DELETE FROM public.rpg_equipados_herois
     WHERE user_id = v_user_id AND personagem_base = v_base AND slot = p_slot;

    IF v_base = v_personagem.personagem_base THEN
      DELETE FROM public.rpg_equipados WHERE user_id = v_user_id AND slot = p_slot;
    END IF;

    RETURN jsonb_build_object('ok', true, 'slot', p_slot, 'item_id', NULL, 'personagem_base', v_base);
  END IF;

  SELECT * INTO v_item FROM public.rpg_itens WHERE id = p_item_id AND ativo = true;
  IF v_item.id IS NULL OR v_item.slot <> p_slot THEN
    RETURN jsonb_build_object('erro', 'Este item não serve neste slot.');
  END IF;

  SELECT quantidade INTO v_qtd
    FROM public.rpg_inventario
   WHERE user_id = v_user_id AND item_id = p_item_id
     FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_qtd, 0) < 1 THEN
    RETURN jsonb_build_object('erro', 'Você não possui este item.');
  END IF;

  IF NOT public.rpg_item_serve(v_item.classes, v_item.personagem_exclusivo, v_base) THEN
    RETURN jsonb_build_object('erro', 'Este item não serve para este personagem.');
  END IF;

  IF public.calcular_nivel_usuario(v_user_id) < v_item.nivel_minimo THEN
    RETURN jsonb_build_object('erro', format('Este item exige o nível %s.', v_item.nivel_minimo));
  END IF;

  SELECT count(*)::int,
         MIN(eh.personagem_base)
    INTO v_em_uso_outros, v_outro_heroi
    FROM public.rpg_equipados_herois eh
   WHERE eh.user_id = v_user_id
     AND eh.item_id = p_item_id
     AND NOT (eh.personagem_base = v_base AND eh.slot = p_slot);

  IF COALESCE(v_em_uso_outros, 0) >= v_qtd THEN
    IF v_em_uso_outros = 1 THEN
      RETURN jsonb_build_object(
        'erro',
        format(
          'Este equipamento já está em uso por %s. Desequipe dele antes ou consiga outra cópia.',
          public.rpg_nome_padrao_heroi(v_outro_heroi)
        )
      );
    END IF;
    RETURN jsonb_build_object(
      'erro',
      'Todas as cópias deste equipamento já estão em uso por outros personagens.'
    );
  END IF;

  INSERT INTO public.rpg_equipados_herois (user_id, personagem_base, slot, item_id, equipado_em)
  VALUES (v_user_id, v_base, p_slot, p_item_id, now())
  ON CONFLICT (user_id, personagem_base, slot) DO UPDATE
    SET item_id = EXCLUDED.item_id, equipado_em = now();

  IF v_base = v_personagem.personagem_base THEN
    INSERT INTO public.rpg_equipados (user_id, slot, item_id, equipado_em)
    VALUES (v_user_id, p_slot, p_item_id, now())
    ON CONFLICT (user_id, slot) DO UPDATE
      SET item_id = EXCLUDED.item_id, equipado_em = now();
  END IF;

  RETURN jsonb_build_object('ok', true, 'slot', p_slot, 'item_id', p_item_id, 'personagem_base', v_base);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_equipar_item(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_equipar_item(TEXT, TEXT, TEXT) TO authenticated;

-- 4. Vender / desmontar cópia repetida também respeita cópias vestidas nos heróis.
CREATE OR REPLACE FUNCTION public.rpg_tirar_copia_repetida(p_user UUID, p_item_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_qtd    INTEGER;
  v_em_uso INTEGER;
BEGIN
  SELECT quantidade INTO v_qtd FROM public.rpg_inventario
   WHERE user_id = p_user AND item_id = p_item_id FOR UPDATE;
  IF v_qtd IS NULL THEN
    RETURN 'Você não possui este item.';
  END IF;
  IF v_qtd < 2 THEN
    RETURN 'Só cópias repetidas podem sair: esta é a única que você tem.';
  END IF;

  SELECT count(*)::int INTO v_em_uso
    FROM public.rpg_equipados_herois
   WHERE user_id = p_user AND item_id = p_item_id;
  IF v_qtd - 1 < COALESCE(v_em_uso, 0) THEN
    RETURN 'Todas as cópias deste item estão equipadas nos seus personagens. Desequipe uma antes de vender ou desmontar.';
  END IF;

  UPDATE public.rpg_inventario SET quantidade = quantidade - 1 WHERE user_id = p_user AND item_id = p_item_id;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_tirar_copia_repetida(UUID, TEXT) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
