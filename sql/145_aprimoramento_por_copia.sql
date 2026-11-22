-- =============================================================================
-- 145 — Aprimoramento individual por cópia no inventário e nos heróis (#346)
-- =============================================================================
-- Separa o nível de aprimoramento por cópia possuída do mesmo item:
--   * public.rpg_inventario.aprimoramentos SMALLINT[] guarda os níveis de cada
--     cópia (novas cópias adicionadas via drop/loja/forja entram como +0).
--   * public.rpg_equipados_herois.copia INTEGER aponta qual cópia (1..quantidade)
--     cada herói está vestindo, com UNIQUE DEFERRABLE garantindo que a mesma cópia
--     nunca fique equipada em dois heróis simultaneamente.

ALTER TABLE public.rpg_inventario
  ADD COLUMN IF NOT EXISTS aprimoramentos SMALLINT[];

ALTER TABLE public.rpg_equipados_herois
  ADD COLUMN IF NOT EXISTS copia INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.rpg_equipados_herois
  DROP CONSTRAINT IF EXISTS rpg_equipados_herois_copia_positiva;
ALTER TABLE public.rpg_equipados_herois
  ADD CONSTRAINT rpg_equipados_herois_copia_positiva CHECK (copia >= 1);

-- Inicializa aprimoramentos a partir da coluna legada apenas para quem ainda não tem o vetor.
UPDATE public.rpg_inventario
   SET aprimoramentos = CASE
         WHEN COALESCE(aprimoramento, 0) > 0 THEN ARRAY[aprimoramento::SMALLINT]
         ELSE '{}'::SMALLINT[]
       END
 WHERE aprimoramentos IS NULL;

-- Numera cópias já equipadas (1, 2, ...) mantendo a cópia 1 (+aprimoramento antigo)
-- no primeiro herói que vestiu o item, e cópias subsequentes (+0) nos demais.
WITH numerados AS (
  SELECT eh.user_id,
         eh.personagem_base,
         eh.slot,
         ROW_NUMBER() OVER (
           PARTITION BY eh.user_id, eh.item_id
           ORDER BY eh.equipado_em ASC, eh.personagem_base ASC
         )::INTEGER AS nova_copia
    FROM public.rpg_equipados_herois eh
)
UPDATE public.rpg_equipados_herois eh
   SET copia = n.nova_copia
  FROM numerados n
 WHERE eh.user_id = n.user_id
   AND eh.personagem_base = n.personagem_base
   AND eh.slot = n.slot;

ALTER TABLE public.rpg_equipados_herois
  DROP CONSTRAINT IF EXISTS rpg_equipados_herois_copia_unica;
DROP INDEX IF EXISTS public.rpg_equipados_herois_copia_unica;
ALTER TABLE public.rpg_equipados_herois
  ADD CONSTRAINT rpg_equipados_herois_copia_unica
  UNIQUE (user_id, item_id, copia) DEFERRABLE INITIALLY DEFERRED;

-- 1. Helpers para ler e normalizar os níveis de todas as cópias (1..quantidade)
CREATE OR REPLACE FUNCTION public.rpg_niveis_copias(
  p_quantidade     INTEGER,
  p_aprimoramento  INTEGER,
  p_aprimoramentos SMALLINT[]
)
RETURNS SMALLINT[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT GREATEST(0, LEAST(10,
        CASE
          WHEN p_aprimoramentos IS NOT NULL AND g <= COALESCE(array_length(p_aprimoramentos, 1), 0)
            THEN p_aprimoramentos[g]::INTEGER
          WHEN p_aprimoramentos IS NULL AND g = 1
            THEN COALESCE(p_aprimoramento, 0)::INTEGER
          ELSE 0
        END
      ))::SMALLINT
      FROM generate_series(1, GREATEST(1, COALESCE(p_quantidade, 1))) AS g
      ORDER BY g
    ),
    ARRAY[0::SMALLINT]
  );
$$;

CREATE OR REPLACE FUNCTION public.rpg_nivel_copia(
  p_aprimoramento  INTEGER,
  p_aprimoramentos SMALLINT[],
  p_copia          INTEGER
)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_copia, 1) < 1 THEN 0
    WHEN p_aprimoramentos IS NOT NULL AND p_copia <= COALESCE(array_length(p_aprimoramentos, 1), 0)
      THEN GREATEST(0, LEAST(10, p_aprimoramentos[p_copia]::INTEGER))
    WHEN p_aprimoramentos IS NULL AND p_copia = 1
      THEN GREATEST(0, LEAST(10, COALESCE(p_aprimoramento, 0)::INTEGER))
    ELSE 0
  END;
$$;

-- 2. Equipar / desequipar escolhendo automaticamente a melhor cópia livre (ou p_copia)
DROP FUNCTION IF EXISTS public.rpg_equipar_item(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.rpg_equipar_item(TEXT, TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.rpg_equipar_item(
  p_slot    TEXT,
  p_item_id TEXT,
  p_base    TEXT DEFAULT NULL,
  p_copia   INTEGER DEFAULT NULL
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
  v_inv           public.rpg_inventario%ROWTYPE;
  v_niveis        SMALLINT[];
  v_ocupadas      INTEGER[];
  v_outro_heroi   TEXT;
  v_copia         INTEGER;
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

  SELECT * INTO v_inv
    FROM public.rpg_inventario
   WHERE user_id = v_user_id AND item_id = p_item_id
     FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_inv.quantidade, 0) < 1 THEN
    RETURN jsonb_build_object('erro', 'Você não possui este item.');
  END IF;

  IF NOT public.rpg_item_serve(v_item.classes, v_item.personagem_exclusivo, v_base) THEN
    RETURN jsonb_build_object('erro', 'Este item não serve para este personagem.');
  END IF;

  IF public.calcular_nivel_usuario(v_user_id) < v_item.nivel_minimo THEN
    RETURN jsonb_build_object('erro', format('Este item exige o nível %s.', v_item.nivel_minimo));
  END IF;

  v_niveis := public.rpg_niveis_copias(v_inv.quantidade, v_inv.aprimoramento, v_inv.aprimoramentos);

  SELECT ARRAY_AGG(eh.copia), MIN(eh.personagem_base)
    INTO v_ocupadas, v_outro_heroi
    FROM public.rpg_equipados_herois eh
   WHERE eh.user_id = v_user_id
     AND eh.item_id = p_item_id
     AND NOT (eh.personagem_base = v_base AND eh.slot = p_slot);

  IF p_copia IS NOT NULL THEN
    IF p_copia < 1 OR p_copia > GREATEST(1, v_inv.quantidade) THEN
      RETURN jsonb_build_object('erro', 'Cópia inválida deste item.');
    END IF;
    IF p_copia = ANY(COALESCE(v_ocupadas, '{}'::INTEGER[])) THEN
      RETURN jsonb_build_object('erro', 'Esta cópia já está equipada em outro personagem.');
    END IF;
    v_copia := p_copia;
  ELSE
    SELECT g
      INTO v_copia
      FROM generate_series(1, GREATEST(1, v_inv.quantidade)) AS g
     WHERE NOT (g = ANY(COALESCE(v_ocupadas, '{}'::INTEGER[])))
     ORDER BY v_niveis[g] DESC, g ASC
     LIMIT 1;
  END IF;

  IF v_copia IS NULL THEN
    IF COALESCE(array_length(v_ocupadas, 1), 0) = 1 THEN
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

  INSERT INTO public.rpg_equipados_herois (user_id, personagem_base, slot, item_id, copia, equipado_em)
  VALUES (v_user_id, v_base, p_slot, p_item_id, v_copia, now())
  ON CONFLICT (user_id, personagem_base, slot) DO UPDATE
    SET item_id = EXCLUDED.item_id, copia = EXCLUDED.copia, equipado_em = now();

  IF v_base = v_personagem.personagem_base THEN
    INSERT INTO public.rpg_equipados (user_id, slot, item_id, equipado_em)
    VALUES (v_user_id, p_slot, p_item_id, now())
    ON CONFLICT (user_id, slot) DO UPDATE
      SET item_id = EXCLUDED.item_id, equipado_em = now();
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'slot', p_slot,
    'item_id', p_item_id,
    'copia', v_copia,
    'aprimoramento', v_niveis[v_copia]::INTEGER,
    'personagem_base', v_base
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_equipar_item(TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_equipar_item(TEXT, TEXT, TEXT, INTEGER) TO authenticated;

-- 3. Aprimorar uma cópia específica (p_copia opcional) sem contaminar outras cópias
DROP FUNCTION IF EXISTS public.rpg_aprimorar_item(UUID, TEXT, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.rpg_aprimorar_item(UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.rpg_aprimorar_item(
  p_user_id UUID,
  p_item_id TEXT,
  p_de      INTEGER,
  p_custo   INTEGER,
  p_teto    INTEGER,
  p_copia   INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_linha    public.rpg_inventario%ROWTYPE;
  v_recursos public.rpg_recursos%ROWTYPE;
  v_niveis   SMALLINT[];
  v_copia    INTEGER;
  v_atual    INTEGER;
  v_max      SMALLINT;
  v_base     TEXT;
BEGIN
  IF p_user_id IS NULL OR p_item_id IS NULL OR p_de IS NULL OR p_custo IS NULL OR p_teto IS NULL
     OR p_custo < 1 OR p_teto < 0 OR p_teto > 10 OR p_de < 0 THEN
    RETURN jsonb_build_object('erro', 'Pedido inválido.');
  END IF;

  SELECT * INTO v_linha FROM public.rpg_inventario
   WHERE user_id = p_user_id AND item_id = p_item_id FOR UPDATE;
  IF v_linha.user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Você não tem este item.', 'sem_item', true);
  END IF;

  v_niveis := public.rpg_niveis_copias(v_linha.quantidade, v_linha.aprimoramento, v_linha.aprimoramentos);

  IF p_copia IS NOT NULL THEN
    IF p_copia < 1 OR p_copia > GREATEST(1, v_linha.quantidade) THEN
      RETURN jsonb_build_object('erro', 'Cópia inválida deste item.');
    END IF;
    v_copia := p_copia;
  ELSE
    SELECT personagem_base INTO v_base FROM public.rpg_personagens WHERE user_id = p_user_id;
    SELECT eh.copia INTO v_copia
      FROM public.rpg_equipados_herois eh
     WHERE eh.user_id = p_user_id
       AND eh.personagem_base = v_base
       AND eh.item_id = p_item_id
     LIMIT 1;
    IF v_copia IS NULL THEN
      v_copia := 1;
    END IF;
  END IF;

  v_atual := v_niveis[v_copia]::INTEGER;
  IF v_atual <> p_de THEN
    RETURN jsonb_build_object('erro', 'Este item já foi aprimorado. Atualize a tela.', 'mudou', true);
  END IF;
  IF v_atual >= p_teto THEN
    RETURN jsonb_build_object('erro', 'Este item já está no máximo.', 'no_maximo', true);
  END IF;

  SELECT * INTO v_recursos FROM public.rpg_recursos WHERE user_id = p_user_id FOR UPDATE;
  IF v_recursos.user_id IS NULL OR v_recursos.ouro < p_custo THEN
    RETURN jsonb_build_object('erro', 'Ouro insuficiente. Vença expedições para ganhar mais.', 'sem_ouro', true);
  END IF;

  UPDATE public.rpg_recursos
     SET ouro = ouro - p_custo, atualizado_em = now()
   WHERE user_id = p_user_id
  RETURNING * INTO v_recursos;

  v_niveis[v_copia] := (v_atual + 1)::SMALLINT;
  SELECT COALESCE(max(x), 0)::SMALLINT INTO v_max FROM unnest(v_niveis) AS x;

  UPDATE public.rpg_inventario
     SET aprimoramentos = v_niveis,
         aprimoramento = v_max
   WHERE user_id = p_user_id AND item_id = p_item_id;

  INSERT INTO public.rpg_aprimoramentos (user_id, item_id, para, ouro_gasto)
  VALUES (p_user_id, p_item_id, (v_atual + 1)::SMALLINT, p_custo);

  RETURN jsonb_build_object(
    'ok', true,
    'item_id', p_item_id,
    'copia', v_copia,
    'aprimoramento', v_atual + 1,
    'aprimoramentos', to_jsonb(v_niveis),
    'ouro', v_recursos.ouro
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_aprimorar_item(UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_aprimorar_item(UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER) TO service_role;

-- 4. Vender / desmontar remove sempre a cópia livre de menor aprimoramento e realinha índices
CREATE OR REPLACE FUNCTION public.rpg_tirar_copia_repetida(p_user UUID, p_item_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inv         public.rpg_inventario%ROWTYPE;
  v_qtd         INTEGER;
  v_niveis      SMALLINT[];
  v_novos       SMALLINT[];
  v_ocupadas    INTEGER[];
  v_alvo        INTEGER;
  v_max         SMALLINT;
BEGIN
  SELECT * INTO v_inv FROM public.rpg_inventario
   WHERE user_id = p_user AND item_id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'Você não possui este item.';
  END IF;
  v_qtd := v_inv.quantidade;
  IF v_qtd < 2 THEN
    RETURN 'Só cópias repetidas podem sair: esta é a única que você tem.';
  END IF;

  v_niveis := public.rpg_niveis_copias(v_qtd, v_inv.aprimoramento, v_inv.aprimoramentos);

  SELECT ARRAY_AGG(eh.copia) INTO v_ocupadas
    FROM public.rpg_equipados_herois eh
   WHERE eh.user_id = p_user AND eh.item_id = p_item_id;

  SELECT g
    INTO v_alvo
    FROM generate_series(1, v_qtd) AS g
   WHERE NOT (g = ANY(COALESCE(v_ocupadas, '{}'::INTEGER[])))
   ORDER BY v_niveis[g] ASC, g DESC
   LIMIT 1;

  IF v_alvo IS NULL THEN
    RETURN 'Todas as cópias deste item estão equipadas nos seus personagens. Desequipe uma antes de vender ou desmontar.';
  END IF;

  SELECT COALESCE(ARRAY(
    SELECT v_niveis[g]
      FROM generate_series(1, v_qtd) AS g
     WHERE g <> v_alvo
     ORDER BY g
  ), ARRAY[0::SMALLINT]) INTO v_novos;

  SELECT COALESCE(max(x), 0)::SMALLINT INTO v_max FROM unnest(v_novos) AS x;

  UPDATE public.rpg_inventario
     SET quantidade = v_qtd - 1,
         aprimoramentos = v_novos,
         aprimoramento = v_max
   WHERE user_id = p_user AND item_id = p_item_id;

  UPDATE public.rpg_equipados_herois
     SET copia = copia - 1
   WHERE user_id = p_user
     AND item_id = p_item_id
     AND copia > v_alvo;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_tirar_copia_repetida(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- 5. rpg_estado_jogador() inclui aprimoramentos por cópia e copia equipada em cada herói
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
               'aprimoramentos', to_jsonb(public.rpg_niveis_copias(inv.quantidade, inv.aprimoramento, inv.aprimoramentos)),
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
      SELECT jsonb_agg(jsonb_build_object('slot', eh.slot, 'item_id', eh.item_id, 'copia', eh.copia))
        FROM public.rpg_equipados_herois eh
       WHERE eh.user_id = v_user_id AND eh.personagem_base = v_base), '[]'::JSONB),
    'equipados_por_heroi', COALESCE((
      SELECT jsonb_object_agg(por_base.personagem_base, por_base.itens)
        FROM (
          SELECT eh.personagem_base,
                 jsonb_agg(jsonb_build_object('slot', eh.slot, 'item_id', eh.item_id, 'copia', eh.copia) ORDER BY eh.slot) AS itens
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

-- 6. rpg_ficha_de_duelo() também expõe aprimoramentos por cópia e copia equipada do oponente
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
               'aprimoramentos', to_jsonb(public.rpg_niveis_copias(inv.quantidade, inv.aprimoramento, inv.aprimoramentos)),
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
      SELECT jsonb_agg(jsonb_build_object('slot', eh.slot, 'item_id', eh.item_id, 'copia', eh.copia))
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
