-- =============================================================================
-- 142 — Equipamentos individuais por personagem desbloqueado
-- =============================================================================
-- Separa os 7 slots equipados em public.rpg_equipados_herois (user_id,
-- personagem_base, slot) para que cada herói guarde o próprio loadout e um
-- segundo personagem recém-desbloqueado comece sem itens vestidos do primeiro.

-- 1. Tabela de equipamentos por herói
CREATE TABLE IF NOT EXISTS public.rpg_equipados_herois (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personagem_base TEXT NOT NULL CHECK (public.rpg_personagem_existe(personagem_base)),
  slot            TEXT NOT NULL CHECK (slot IN ('arma', 'elmo', 'armadura', 'luvas', 'capa', 'botas', 'joia')),
  item_id         TEXT NOT NULL REFERENCES public.rpg_itens(id) ON DELETE CASCADE,
  equipado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, personagem_base, slot)
);

ALTER TABLE public.rpg_equipados_herois ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_equipados_herois_le_o_proprio ON public.rpg_equipados_herois;
CREATE POLICY rpg_equipados_herois_le_o_proprio ON public.rpg_equipados_herois
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.rpg_equipados_herois FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.rpg_equipados_herois TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rpg_equipados_herois TO service_role;

-- 2. Backfill: preserva os equipamentos atuais apenas para o herói ativo da conta;
-- demais heróis desbloqueados começam sem nenhum item vestido.
INSERT INTO public.rpg_equipados_herois (
  user_id, personagem_base, slot, item_id, equipado_em
)
SELECT e.user_id, p.personagem_base, e.slot, e.item_id, e.equipado_em
  FROM public.rpg_equipados e
  JOIN public.rpg_personagens p ON p.user_id = e.user_id
  JOIN public.rpg_itens i ON i.id = e.item_id
 WHERE public.rpg_personagem_existe(p.personagem_base)
   AND public.rpg_item_serve(i.classes, i.personagem_exclusivo, p.personagem_base)
   AND NOT EXISTS (
     SELECT 1 FROM public.rpg_equipados_herois x WHERE x.user_id = e.user_id
   )
ON CONFLICT (user_id, personagem_base, slot) DO NOTHING;

-- 3. Equipar / desequipar por personagem (p_base opcional mantém chamada de 2 argumentos)
DROP FUNCTION IF EXISTS public.rpg_equipar_item(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.rpg_equipar_item(TEXT, TEXT, TEXT);

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

  IF NOT EXISTS (SELECT 1 FROM public.rpg_inventario WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RETURN jsonb_build_object('erro', 'Você não possui este item.');
  END IF;

  IF NOT public.rpg_item_serve(v_item.classes, v_item.personagem_exclusivo, v_base) THEN
    RETURN jsonb_build_object('erro', 'Este item não serve para este personagem.');
  END IF;

  IF public.calcular_nivel_usuario(v_user_id) < v_item.nivel_minimo THEN
    RETURN jsonb_build_object('erro', format('Este item exige o nível %s.', v_item.nivel_minimo));
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

-- 4. Trocar personagem: troca gratuita e imediata (141) com atributos (140) e
-- equipamentos individuais por herói (142).
CREATE OR REPLACE FUNCTION public.rpg_trocar_personagem(
  p_base       TEXT,
  p_antecipado BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id         UUID := auth.uid();
  v_base            TEXT := btrim(coalesce(p_base, ''));
  v_personagem      public.rpg_personagens%ROWTYPE;
  v_desbloqueados   TEXT[];
  v_forca           INTEGER := 0;
  v_inteligencia    INTEGER := 0;
  v_constituicao    INTEGER := 0;
  v_agilidade       INTEGER := 0;
  v_destreza        INTEGER := 0;
  v_sorte           INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF NOT public.rpg_personagem_existe(v_base) THEN
    RETURN jsonb_build_object('erro', 'Personagem desconhecido.');
  END IF;

  SELECT * INTO v_personagem
    FROM public.rpg_personagens
   WHERE user_id = v_user_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  IF v_personagem.personagem_base = v_base THEN
    RETURN jsonb_build_object('ok', true, 'trocado', false, 'personagem_base', v_base);
  END IF;

  v_desbloqueados := COALESCE(v_personagem.desbloqueados, ARRAY[v_personagem.personagem_base]);
  IF NOT (v_personagem.personagem_base = ANY(v_desbloqueados)) THEN
    v_desbloqueados := array_append(v_desbloqueados, v_personagem.personagem_base);
  END IF;

  IF NOT (v_base = ANY(v_desbloqueados)) THEN
    RETURN jsonb_build_object('erro', 'Desbloqueie este personagem com Ouro antes de jogar com ele.');
  END IF;

  -- Preserva atributos e equipamentos do herói que está saindo da liderança.
  INSERT INTO public.rpg_atributos_herois (
    user_id, personagem_base, forca, inteligencia, constituicao, agilidade, destreza, sorte, atualizado_em
  )
  SELECT v_user_id, v_personagem.personagem_base, a.forca, a.inteligencia, a.constituicao, a.agilidade, a.destreza, a.sorte, a.atualizado_em
    FROM public.rpg_atributos a
   WHERE a.user_id = v_user_id
  ON CONFLICT (user_id, personagem_base) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.rpg_equipados_herois eh
     WHERE eh.user_id = v_user_id AND eh.personagem_base = v_personagem.personagem_base
  ) THEN
    INSERT INTO public.rpg_equipados_herois (user_id, personagem_base, slot, item_id, equipado_em)
    SELECT e.user_id, v_personagem.personagem_base, e.slot, e.item_id, e.equipado_em
      FROM public.rpg_equipados e
      JOIN public.rpg_itens i ON i.id = e.item_id
     WHERE e.user_id = v_user_id
       AND public.rpg_item_serve(i.classes, i.personagem_exclusivo, v_personagem.personagem_base)
    ON CONFLICT (user_id, personagem_base, slot) DO NOTHING;
  END IF;

  UPDATE public.rpg_personagens
     SET personagem_base = v_base,
         visual_equipado = NULL,
         ultima_troca_em = now()
   WHERE user_id = v_user_id;

  -- Sincroniza atributos do novo líder.
  SELECT h.forca, h.inteligencia, h.constituicao, h.agilidade, h.destreza, h.sorte
    INTO v_forca, v_inteligencia, v_constituicao, v_agilidade, v_destreza, v_sorte
    FROM public.rpg_atributos_herois h
   WHERE h.user_id = v_user_id
     AND h.personagem_base = v_base;

  INSERT INTO public.rpg_atributos AS a
    (user_id, forca, inteligencia, constituicao, agilidade, destreza, sorte)
  VALUES (
    v_user_id,
    COALESCE(v_forca, 0),
    COALESCE(v_inteligencia, 0),
    COALESCE(v_constituicao, 0),
    COALESCE(v_agilidade, 0),
    COALESCE(v_destreza, 0),
    COALESCE(v_sorte, 0)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    forca = EXCLUDED.forca, inteligencia = EXCLUDED.inteligencia,
    constituicao = EXCLUDED.constituicao, agilidade = EXCLUDED.agilidade,
    destreza = EXCLUDED.destreza, sorte = EXCLUDED.sorte, atualizado_em = now();

  -- Carrega em rpg_equipados apenas os itens próprios do herói que entra (vazio se inédito).
  DELETE FROM public.rpg_equipados WHERE user_id = v_user_id;

  INSERT INTO public.rpg_equipados (user_id, slot, item_id, equipado_em)
  SELECT eh.user_id, eh.slot, eh.item_id, eh.equipado_em
    FROM public.rpg_equipados_herois eh
    JOIN public.rpg_inventario inv ON inv.user_id = eh.user_id AND inv.item_id = eh.item_id
    JOIN public.rpg_itens i ON i.id = eh.item_id AND i.ativo = true
   WHERE eh.user_id = v_user_id
     AND eh.personagem_base = v_base
     AND public.rpg_item_serve(i.classes, i.personagem_exclusivo, v_base)
  ON CONFLICT (user_id, slot) DO UPDATE SET
    item_id = EXCLUDED.item_id, equipado_em = EXCLUDED.equipado_em;

  RETURN jsonb_build_object(
    'ok', true,
    'trocado', true,
    'personagem_base', v_base,
    'ouro_gasto', 0,
    'ultima_troca_em', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_trocar_personagem(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_trocar_personagem(TEXT, BOOLEAN) TO authenticated;

-- 5. rpg_estado_jogador() inclui equipados do líder + mapa equipados_por_heroi.
CREATE OR REPLACE FUNCTION public.rpg_estado_jogador()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_personagem JSONB;
  v_base       TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  SELECT p.personagem_base,
         jsonb_build_object(
           'nome', p.nome,
           'personagem_base', p.personagem_base,
           'criado_em', p.criado_em,
           'visual_equipado', p.visual_equipado,
           'desbloqueados', to_jsonb(p.desbloqueados),
           'esquadrao', COALESCE(to_jsonb(p.esquadrao), '[]'::JSONB),
           'eco_mal_id', p.eco_mal_id,
           'ultima_troca_em', p.ultima_troca_em)
    INTO v_base, v_personagem
    FROM public.rpg_personagens p
   WHERE p.user_id = v_user_id;

  IF v_personagem IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'personagem', NULL);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'personagem', v_personagem,
    'xp_total', (SELECT COALESCE(sum(x.xp_earned), 0) FROM public.xp_ledger x WHERE x.user_id = v_user_id),
    'inventario', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'quantidade', inv.quantidade,
               'aprimoramento', inv.aprimoramento,
               'rpg_itens', jsonb_build_object(
                 'id', i.id, 'slot', i.slot, 'nome', i.nome, 'descricao', i.descricao,
                 'raridade', i.raridade, 'vida', i.vida, 'ataque', i.ataque,
                 'defesa', i.defesa, 'nivel_minimo', i.nivel_minimo,
                 'magia', i.magia, 'velocidade', i.velocidade, 'critico_por_mil', i.critico_por_mil,
                 'dano_critico', i.dano_critico, 'esquiva_por_mil', i.esquiva_por_mil,
                 'classes', i.classes, 'personagem_exclusivo', i.personagem_exclusivo,
                 'conjunto', i.conjunto, 'elemento', i.elemento)))
        FROM public.rpg_inventario inv
        JOIN public.rpg_itens i ON i.id = inv.item_id AND i.ativo = true
       WHERE inv.user_id = v_user_id), '[]'::JSONB),
    'equipados', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slot', eh.slot, 'item_id', eh.item_id))
        FROM public.rpg_equipados_herois eh
       WHERE eh.user_id = v_user_id AND eh.personagem_base = v_base), '[]'::JSONB),
    'equipados_por_heroi', COALESCE((
      SELECT jsonb_object_agg(por_base.personagem_base, por_base.itens)
        FROM (
          SELECT eh.personagem_base,
                 jsonb_agg(jsonb_build_object('slot', eh.slot, 'item_id', eh.item_id) ORDER BY eh.slot) AS itens
            FROM public.rpg_equipados_herois eh
           WHERE eh.user_id = v_user_id
           GROUP BY eh.personagem_base
        ) por_base), '{}'::JSONB),
    'bilhetes', COALESCE((SELECT r.bilhetes FROM public.rpg_recursos r WHERE r.user_id = v_user_id), 0),
    'ouro', COALESCE((SELECT r.ouro FROM public.rpg_recursos r WHERE r.user_id = v_user_id), 0),
    'maestria', COALESCE((
      SELECT jsonb_object_agg(m.habilidade_id, m.usos)
        FROM public.rpg_maestria m
       WHERE m.user_id = v_user_id), '{}'::JSONB),
    'pontos', COALESCE((
      SELECT jsonb_build_object(
               'forca', h.forca, 'inteligencia', h.inteligencia, 'constituicao', h.constituicao,
               'agilidade', h.agilidade, 'destreza', h.destreza, 'sorte', h.sorte)
        FROM public.rpg_atributos_herois h
       WHERE h.user_id = v_user_id AND h.personagem_base = v_base), '{}'::JSONB),
    'pontos_por_heroi', COALESCE((
      SELECT jsonb_object_agg(
               h.personagem_base,
               jsonb_build_object(
                 'forca', h.forca, 'inteligencia', h.inteligencia, 'constituicao', h.constituicao,
                 'agilidade', h.agilidade, 'destreza', h.destreza, 'sorte', h.sorte))
        FROM public.rpg_atributos_herois h
       WHERE h.user_id = v_user_id), '{}'::JSONB),
    'cosmeticos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slot', ue.slot, 'store_items', jsonb_build_object('estilo', s.estilo)))
        FROM public.user_equipped ue
        JOIN public.store_items s ON s.id = ue.item_id
       WHERE ue.user_id = v_user_id AND ue.slot IN ('cenario', 'aura')), '[]'::JSONB),
    'skins', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('store_items', jsonb_build_object(
               'id', s.id, 'nome', s.nome, 'estilo', s.estilo, 'tipo', s.tipo)))
        FROM public.user_items ui
        JOIN public.store_items s ON s.id = ui.item_id AND s.tipo = 'skin'
       WHERE ui.user_id = v_user_id), '[]'::JSONB)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_estado_jogador() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_estado_jogador() TO authenticated;

-- 6. rpg_ficha_de_duelo lê os equipamentos do herói ativo do oponente.
CREATE OR REPLACE FUNCTION public.rpg_ficha_de_duelo(p_desafiante UUID, p_handle TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_alvo       UUID;
  v_nome       TEXT;
  v_personagem JSONB;
  v_base       TEXT;
BEGIN
  SELECT p.user_id, p.nome
    INTO v_alvo, v_nome
    FROM public.profiles p
    JOIN public.rpg_personagens r ON r.user_id = p.user_id
   WHERE p.handle = lower(btrim(p_handle)) AND p.publico;
  IF v_alvo IS NULL THEN
    RETURN jsonb_build_object('erro', 'Oponente não encontrado. Ele pode ter fechado o perfil.');
  END IF;
  IF v_alvo = p_desafiante THEN
    RETURN jsonb_build_object('erro', 'Você não pode duelar consigo mesmo.');
  END IF;

  SELECT r.personagem_base,
         jsonb_build_object('nome', r.nome, 'personagem_base', r.personagem_base, 'criado_em', r.criado_em, 'visual_equipado', r.visual_equipado)
    INTO v_base, v_personagem
    FROM public.rpg_personagens r WHERE r.user_id = v_alvo;

  RETURN jsonb_build_object(
    'ok', true,
    'nome_perfil', v_nome,
    'personagem', v_personagem,
    'xp_total', (SELECT COALESCE(sum(x.xp_earned), 0) FROM public.xp_ledger x WHERE x.user_id = v_alvo),
    'inventario', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'quantidade', inv.quantidade,
               'aprimoramento', inv.aprimoramento,
               'rpg_itens', jsonb_build_object(
                 'id', i.id, 'slot', i.slot, 'nome', i.nome, 'descricao', i.descricao,
                 'raridade', i.raridade, 'vida', i.vida, 'ataque', i.ataque,
                 'defesa', i.defesa, 'nivel_minimo', i.nivel_minimo,
                 'magia', i.magia, 'velocidade', i.velocidade, 'critico_por_mil', i.critico_por_mil,
                 'dano_critico', i.dano_critico, 'esquiva_por_mil', i.esquiva_por_mil,
                 'classes', i.classes, 'personagem_exclusivo', i.personagem_exclusivo,
                 'conjunto', i.conjunto, 'elemento', i.elemento)))
        FROM public.rpg_inventario inv
        JOIN public.rpg_itens i ON i.id = inv.item_id AND i.ativo = true
       WHERE inv.user_id = v_alvo), '[]'::JSONB),
    'equipados', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slot', eh.slot, 'item_id', eh.item_id))
        FROM public.rpg_equipados_herois eh
       WHERE eh.user_id = v_alvo AND eh.personagem_base = v_base), '[]'::JSONB),
    'maestria', COALESCE((
      SELECT jsonb_object_agg(m.habilidade_id, m.usos) FROM public.rpg_maestria m WHERE m.user_id = v_alvo), '{}'::JSONB),
    'pontos', COALESCE(
      (SELECT jsonb_build_object(
                'forca', h.forca, 'inteligencia', h.inteligencia, 'constituicao', h.constituicao,
                'agilidade', h.agilidade, 'destreza', h.destreza, 'sorte', h.sorte)
         FROM public.rpg_atributos_herois h WHERE h.user_id = v_alvo AND h.personagem_base = v_base),
      (SELECT jsonb_build_object(
                'forca', a.forca, 'inteligencia', a.inteligencia, 'constituicao', a.constituicao,
                'agilidade', a.agilidade, 'destreza', a.destreza, 'sorte', a.sorte)
         FROM public.rpg_atributos a WHERE a.user_id = v_alvo),
      '{}'::JSONB)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_ficha_de_duelo(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_ficha_de_duelo(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
