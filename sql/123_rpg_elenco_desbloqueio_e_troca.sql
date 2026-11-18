-- =============================================================================
-- 123 — Elenco do RPG: desbloqueio por Ouro (400) e espera de 24h na troca
-- =============================================================================
--
-- O que muda:
--   1. rpg_personagens ganha `desbloqueados TEXT[]` e `ultima_troca_em TIMESTAMPTZ`.
--      Contas antigas recebem apenas o seu `personagem_base` atual como desbloqueado
--      e `ultima_troca_em = NULL` (primeira troca já disponível após desbloquear outro).
--   2. despertar_personagem() passa a registrar `[v_base]` em `desbloqueados` (1º grátis).
--   3. rpg_desbloquear_personagem(p_base) cobra 400 Ouro com trava em rpg_recursos e
--      adiciona o personagem em `desbloqueados`.
--   4. rpg_trocar_personagem(p_base, p_antecipado) exige que o personagem esteja em
--      `desbloqueados` e aplica espera de 24h entre trocas gratuitas; antes de 24h,
--      permite trocar pagando 150 Ouro com `p_antecipado = true`. Ao atualizar
--      `personagem_base`, o gatilho do sql/121 continua desequipando itens incompatíveis.
--   5. rpg_estado_jogador() (definição viva, antes no sql/121) passa a incluir
--      `desbloqueados` e `ultima_troca_em` no objeto `personagem`.
--
-- ORDEM: depois de sql/080, sql/081 e sql/121, e ANTES de promover o código para a main.
-- Pode rodar mais de uma vez.

-- =============================================================================
-- 1. Colunas novas e backfill
-- =============================================================================

ALTER TABLE public.rpg_personagens
  ADD COLUMN IF NOT EXISTS desbloqueados   TEXT[],
  ADD COLUMN IF NOT EXISTS ultima_troca_em TIMESTAMPTZ;

UPDATE public.rpg_personagens
   SET desbloqueados = ARRAY[personagem_base]
 WHERE desbloqueados IS NULL
    OR cardinality(desbloqueados) = 0;

UPDATE public.rpg_personagens
   SET desbloqueados = array_append(desbloqueados, personagem_base)
 WHERE NOT (personagem_base = ANY(desbloqueados));

ALTER TABLE public.rpg_personagens
  ALTER COLUMN desbloqueados SET DEFAULT ARRAY['espadachim_eter']::TEXT[],
  ALTER COLUMN desbloqueados SET NOT NULL;

COMMENT ON COLUMN public.rpg_personagens.desbloqueados IS
  'Personagens do elenco desbloqueados nesta conta (o primeiro no despertar; os demais por Ouro).';

COMMENT ON COLUMN public.rpg_personagens.ultima_troca_em IS
  'Instante da última troca de personagem. NULL ou >= 24h libera troca gratuita.';

-- =============================================================================
-- 2. Despertar: primeiro personagem grátis e marcado em desbloqueados
-- =============================================================================

CREATE OR REPLACE FUNCTION public.despertar_personagem(
  p_nome TEXT,
  p_base TEXT DEFAULT 'espadachim_eter'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_nome    TEXT := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_base    TEXT := coalesce(nullif(btrim(p_base), ''), 'espadachim_eter');
  v_linhas  INTEGER;
  v_atual   public.rpg_personagens%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF char_length(v_nome) < 2 OR char_length(v_nome) > 24 THEN
    RETURN jsonb_build_object('erro', 'O nome precisa ter de 2 a 24 caracteres.');
  END IF;

  IF v_nome ~ '[[:cntrl:]]' THEN
    RETURN jsonb_build_object('erro', 'O nome tem caracteres inválidos.');
  END IF;

  IF v_base NOT IN ('espadachim_eter', 'lanceiro_fogo', 'assassina_raio',
                    'maga_agua', 'guerreiro_terra', 'paladina_luz') THEN
    RETURN jsonb_build_object('erro', 'Personagem desconhecido.');
  END IF;

  INSERT INTO public.rpg_personagens (user_id, nome, personagem_base, desbloqueados)
  VALUES (v_user_id, v_nome, v_base, ARRAY[v_base])
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_linhas = ROW_COUNT;

  SELECT * INTO v_atual FROM public.rpg_personagens WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'criado', v_linhas > 0,
    'nome', v_atual.nome,
    'personagem_base', v_atual.personagem_base,
    'desbloqueados', to_jsonb(v_atual.desbloqueados)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.despertar_personagem(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.despertar_personagem(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 3. Desbloquear personagem adicional (400 Ouro)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_desbloquear_personagem(p_base TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_base          TEXT := btrim(coalesce(p_base, ''));
  v_preco         CONSTANT INTEGER := 400;
  v_personagem    public.rpg_personagens%ROWTYPE;
  v_desbloqueados TEXT[];
  v_ouro          INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF v_base NOT IN ('espadachim_eter', 'lanceiro_fogo', 'assassina_raio',
                    'maga_agua', 'guerreiro_terra', 'paladina_luz') THEN
    RETURN jsonb_build_object('erro', 'Personagem desconhecido.');
  END IF;

  SELECT * INTO v_personagem
    FROM public.rpg_personagens
   WHERE user_id = v_user_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  v_desbloqueados := COALESCE(v_personagem.desbloqueados, ARRAY[v_personagem.personagem_base]);
  IF NOT (v_personagem.personagem_base = ANY(v_desbloqueados)) THEN
    v_desbloqueados := array_append(v_desbloqueados, v_personagem.personagem_base);
  END IF;

  IF v_base = ANY(v_desbloqueados) THEN
    RETURN jsonb_build_object('erro', 'Você já desbloqueou este personagem.');
  END IF;

  INSERT INTO public.rpg_recursos (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  SELECT COALESCE(ouro, 0) INTO v_ouro
    FROM public.rpg_recursos
   WHERE user_id = v_user_id
     FOR UPDATE;

  IF v_ouro < v_preco THEN
    RETURN jsonb_build_object('erro', format('Faltam %s de Ouro para desbloquear este personagem.', v_preco - v_ouro));
  END IF;

  UPDATE public.rpg_recursos
     SET ouro = ouro - v_preco,
         atualizado_em = now()
   WHERE user_id = v_user_id;

  v_desbloqueados := array_append(v_desbloqueados, v_base);

  UPDATE public.rpg_personagens
     SET desbloqueados = v_desbloqueados
   WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'desbloqueado', v_base,
    'desbloqueados', to_jsonb(v_desbloqueados),
    'ouro', v_ouro - v_preco
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_desbloquear_personagem(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_desbloquear_personagem(TEXT) TO authenticated;

-- =============================================================================
-- 4. Trocar personagem desbloqueado (grátis a cada 24h, ou 150 Ouro antecipado)
-- =============================================================================

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
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF v_base NOT IN ('espadachim_eter', 'lanceiro_fogo', 'assassina_raio',
                    'maga_agua', 'guerreiro_terra', 'paladina_luz') THEN
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

  UPDATE public.rpg_personagens
     SET personagem_base = v_base,
         visual_equipado = NULL,
         ultima_troca_em = now()
   WHERE user_id = v_user_id;

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

-- =============================================================================
-- 5. Estado do jogador (definição viva baseada no sql/121, com desbloqueados e troca)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_estado_jogador()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_personagem JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  SELECT jsonb_build_object(
           'nome', p.nome,
           'personagem_base', p.personagem_base,
           'criado_em', p.criado_em,
           'visual_equipado', p.visual_equipado,
           'desbloqueados', to_jsonb(p.desbloqueados),
           'ultima_troca_em', p.ultima_troca_em)
    INTO v_personagem
    FROM public.rpg_personagens p
   WHERE p.user_id = v_user_id;

  -- Quem não despertou não precisa do resto.
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
                 'conjunto', i.conjunto)))
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
               'forca', p.forca, 'inteligencia', p.inteligencia, 'constituicao', p.constituicao,
               'agilidade', p.agilidade, 'destreza', p.destreza, 'sorte', p.sorte)
        FROM public.rpg_atributos p
       WHERE p.user_id = v_user_id), '{}'::JSONB),
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

NOTIFY pgrst, 'reload schema';
