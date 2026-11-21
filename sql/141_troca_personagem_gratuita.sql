-- ============================================================================
-- Migration 141: Troca gratuita e imediata entre heróis já desbloqueados
-- Remove a trava de 24h e o custo de 150 Ouro em rpg_trocar_personagem(),
-- mantendo a assinatura (p_base, p_antecipado) e a sincronização de atributos
-- individuais em public.rpg_atributos_herois (migration 140).
-- ============================================================================

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

  -- Preserva a build do herói que está saindo da liderança.
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
    'ouro_gasto', 0,
    'ultima_troca_em', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_trocar_personagem(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_trocar_personagem(TEXT, BOOLEAN) TO authenticated;
