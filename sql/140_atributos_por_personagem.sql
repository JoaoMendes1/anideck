-- =============================================================================
-- 140 — Atributos primários individuais por personagem desbloqueado
-- =============================================================================
-- Separa a distribuição de pontos por personagem em vez de compartilhar uma
-- única linha para toda a conta. Ao desbloquear um novo herói, ele começa com
-- todos os pontos livres para configurar do zero.

-- 1. Tabela de atributos por herói (chave composta user_id + personagem_base)
CREATE TABLE IF NOT EXISTS public.rpg_atributos_herois (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personagem_base TEXT NOT NULL CHECK (public.rpg_personagem_existe(personagem_base)),
  forca           INTEGER NOT NULL DEFAULT 0,
  inteligencia    INTEGER NOT NULL DEFAULT 0,
  constituicao    INTEGER NOT NULL DEFAULT 0,
  agilidade       INTEGER NOT NULL DEFAULT 0,
  destreza        INTEGER NOT NULL DEFAULT 0,
  sorte           INTEGER NOT NULL DEFAULT 0,
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, personagem_base),
  CONSTRAINT rpg_atributos_herois_nao_negativos CHECK (
    forca >= 0 AND inteligencia >= 0 AND constituicao >= 0
    AND agilidade >= 0 AND destreza >= 0 AND sorte >= 0
  )
);

ALTER TABLE public.rpg_atributos_herois ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_atributos_herois_le_o_proprio ON public.rpg_atributos_herois;
CREATE POLICY rpg_atributos_herois_le_o_proprio ON public.rpg_atributos_herois
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.rpg_atributos_herois FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.rpg_atributos_herois TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rpg_atributos_herois TO service_role;

-- 2. Backfill: preserva a build atual apenas para o personagem ativo da conta;
-- outros heróis desbloqueados ficam sem pontos gastos (prontos para montar do zero).
INSERT INTO public.rpg_atributos_herois (
  user_id, personagem_base, forca, inteligencia, constituicao, agilidade, destreza, sorte, atualizado_em
)
SELECT a.user_id, p.personagem_base, a.forca, a.inteligencia, a.constituicao, a.agilidade, a.destreza, a.sorte, a.atualizado_em
  FROM public.rpg_atributos a
  JOIN public.rpg_personagens p ON p.user_id = a.user_id
 WHERE public.rpg_personagem_existe(p.personagem_base)
ON CONFLICT (user_id, personagem_base) DO NOTHING;

-- 3. Distribuir pontos aceitando personagem opcional (p_base).
DROP FUNCTION IF EXISTS public.rpg_distribuir_pontos(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.rpg_distribuir_pontos(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.rpg_distribuir_pontos(
  p_forca INTEGER, p_inteligencia INTEGER, p_constituicao INTEGER,
  p_agilidade INTEGER, p_destreza INTEGER, p_sorte INTEGER,
  p_base TEXT DEFAULT NULL
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
  v_disponiveis   INTEGER;
  v_total         INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
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
    RETURN jsonb_build_object('erro', 'Desbloqueie este personagem antes de configurar os atributos dele.');
  END IF;

  IF p_forca IS NULL OR p_inteligencia IS NULL OR p_constituicao IS NULL
     OR p_agilidade IS NULL OR p_destreza IS NULL OR p_sorte IS NULL
     OR LEAST(p_forca, p_inteligencia, p_constituicao, p_agilidade, p_destreza, p_sorte) < 0 THEN
    RETURN jsonb_build_object('erro', 'Pontos inválidos.');
  END IF;

  v_disponiveis := GREATEST(0, public.calcular_nivel_usuario(v_user_id) - 1) * 2;
  v_total := p_forca + p_inteligencia + p_constituicao + p_agilidade + p_destreza + p_sorte;
  IF v_total > v_disponiveis THEN
    RETURN jsonb_build_object('erro', format('Você tem %s pontos para distribuir.', v_disponiveis));
  END IF;

  INSERT INTO public.rpg_atributos_herois AS h
    (user_id, personagem_base, forca, inteligencia, constituicao, agilidade, destreza, sorte)
  VALUES (v_user_id, v_base, p_forca, p_inteligencia, p_constituicao, p_agilidade, p_destreza, p_sorte)
  ON CONFLICT (user_id, personagem_base) DO UPDATE SET
    forca = EXCLUDED.forca, inteligencia = EXCLUDED.inteligencia,
    constituicao = EXCLUDED.constituicao, agilidade = EXCLUDED.agilidade,
    destreza = EXCLUDED.destreza, sorte = EXCLUDED.sorte, atualizado_em = now();

  -- Mantém rpg_atributos sincronizada com o personagem líder para leituras legadas.
  IF v_base = v_personagem.personagem_base THEN
    INSERT INTO public.rpg_atributos AS a
      (user_id, forca, inteligencia, constituicao, agilidade, destreza, sorte)
    VALUES (v_user_id, p_forca, p_inteligencia, p_constituicao, p_agilidade, p_destreza, p_sorte)
    ON CONFLICT (user_id) DO UPDATE SET
      forca = EXCLUDED.forca, inteligencia = EXCLUDED.inteligencia,
      constituicao = EXCLUDED.constituicao, agilidade = EXCLUDED.agilidade,
      destreza = EXCLUDED.destreza, sorte = EXCLUDED.sorte, atualizado_em = now();
  END IF;

  RETURN jsonb_build_object('ok', true, 'personagem_base', v_base);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_distribuir_pontos(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_distribuir_pontos(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;

-- 4. Trocar personagem preserva a build do anterior e carrega a build do novo (zerada se inédito).
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
  v_cooldown_horas  CONSTANT INTEGER := 24;
  v_preco_antecip   CONSTANT INTEGER := 150;
  v_personagem      public.rpg_personagens%ROWTYPE;
  v_desbloqueados   TEXT[];
  v_em_espera       BOOLEAN;
  v_restante_min    INTEGER;
  v_horas           INTEGER;
  v_minutos         INTEGER;
  v_texto_espera    TEXT;
  v_ouro            INTEGER;
  v_ouro_gasto      INTEGER := 0;
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

  v_em_espera := v_personagem.ultima_troca_em IS NOT NULL
    AND (v_personagem.ultima_troca_em + make_interval(hours => v_cooldown_horas)) > now();

  IF v_em_espera THEN
    IF NOT COALESCE(p_antecipado, false) THEN
      v_restante_min := GREATEST(
        1,
        ceil(extract(epoch FROM ((v_personagem.ultima_troca_em + make_interval(hours => v_cooldown_horas)) - now())) / 60.0)::integer
      );
      v_horas := v_restante_min / 60;
      v_minutos := v_restante_min % 60;
      IF v_horas > 0 AND v_minutos > 0 THEN
        v_texto_espera := format('%sh %smin', v_horas, v_minutos);
      ELSIF v_horas > 0 THEN
        v_texto_espera := format('%sh', v_horas);
      ELSE
        v_texto_espera := format('%smin', v_minutos);
      END IF;
      RETURN jsonb_build_object(
        'erro',
        format('Troca gratuita disponível em %s, ou troque agora por %s Ouro.', v_texto_espera, v_preco_antecip)
      );
    END IF;

    INSERT INTO public.rpg_recursos (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

    SELECT COALESCE(ouro, 0) INTO v_ouro
      FROM public.rpg_recursos
     WHERE user_id = v_user_id
       FOR UPDATE;

    IF v_ouro < v_preco_antecip THEN
      RETURN jsonb_build_object('erro', format('Faltam %s de Ouro para trocar antes do tempo.', v_preco_antecip - v_ouro));
    END IF;

    UPDATE public.rpg_recursos
       SET ouro = ouro - v_preco_antecip,
           atualizado_em = now()
     WHERE user_id = v_user_id;

    v_ouro_gasto := v_preco_antecip;
  END IF;

  -- Garante que a build do personagem que está saindo esteja gravada antes da troca.
  INSERT INTO public.rpg_atributos_herois (
    user_id, personagem_base, forca, inteligencia, constituicao, agilidade, destreza, sorte, atualizado_em
  )
  SELECT v_user_id, v_personagem.personagem_base, a.forca, a.inteligencia, a.constituicao, a.agilidade, a.destreza, a.sorte, a.atualizado_em
    FROM public.rpg_atributos a
   WHERE a.user_id = v_user_id
  ON CONFLICT (user_id, personagem_base) DO NOTHING;

  UPDATE public.rpg_personagens
     SET personagem_base = v_base,
         visual_equipado = NULL,
         ultima_troca_em = now()
   WHERE user_id = v_user_id;

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

  RETURN jsonb_build_object(
    'ok', true,
    'trocado', true,
    'personagem_base', v_base,
    'ouro_gasto', v_ouro_gasto,
    'ultima_troca_em', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_trocar_personagem(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_trocar_personagem(TEXT, BOOLEAN) TO authenticated;

-- 5. rpg_estado_jogador() inclui pontos do líder + mapa completo pontos_por_heroi.
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
      SELECT jsonb_agg(jsonb_build_object('slot', e.slot, 'item_id', e.item_id))
        FROM public.rpg_equipados e
       WHERE e.user_id = v_user_id), '[]'::JSONB),
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

-- 6. rpg_ficha_de_duelo lê os pontos próprios do personagem ativo do oponente.
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
      SELECT jsonb_agg(jsonb_build_object('slot', e.slot, 'item_id', e.item_id))
        FROM public.rpg_equipados e WHERE e.user_id = v_alvo), '[]'::JSONB),
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
