-- =============================================================================
-- 093 — Duelos contra a ficha de outros jogadores
-- =============================================================================
--
-- O desafiante luta contra uma cópia da ficha de outro jogador, simulada no Go
-- (SimularDuelo). O desafiado não precisa estar online e não perde nada. Só perfis públicos
-- com personagem entram, dos dois lados: quem aparece no ranking escolheu aparecer.
--
-- 1. rpg_duelos: um registro por duelo, com os pontos e o Ouro ganhos.
-- 2. rpg_duelos_estado(p_user_id): limite do dia, pontos da temporada, oponentes (sem
--    user_id: só o @) e o ranking da temporada (trimestre, no fuso de Brasília).
-- 3. rpg_ficha_de_duelo(p_desafiante, p_handle): a ficha do oponente no formato de
--    rpg_estado_jogador() (sql/084), para o Go montar o combatente pelo mesmo caminho.
-- 4. rpg_registrar_duelo(): limite por dia, um duelo por oponente por dia, pontos e Ouro.
--
-- As três funções são só do service role: o Go confere o usuário pelo token antes.
--
-- Ordem: depois do 090, antes de promover. Pode rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.rpg_duelos (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  desafiante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oponente_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venceu        BOOLEAN NOT NULL,
  turnos        INTEGER NOT NULL DEFAULT 0 CHECK (turnos >= 0),
  pontos        INTEGER NOT NULL DEFAULT 0 CHECK (pontos >= 0),
  ouro          INTEGER NOT NULL DEFAULT 0 CHECK (ouro >= 0),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (desafiante_id <> oponente_id)
);

CREATE INDEX IF NOT EXISTS rpg_duelos_desafiante_dia ON public.rpg_duelos (desafiante_id, criado_em DESC);

ALTER TABLE public.rpg_duelos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_duelos_le_os_proprios ON public.rpg_duelos;
CREATE POLICY rpg_duelos_le_os_proprios ON public.rpg_duelos
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = desafiante_id OR (SELECT auth.uid()) = oponente_id);

REVOKE INSERT, UPDATE, DELETE ON public.rpg_duelos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rpg_duelos TO authenticated;

-- Início da temporada (trimestre) no fuso de Brasília, o mesmo corte dos rankings de anime.
CREATE OR REPLACE FUNCTION public.rpg_inicio_da_temporada()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT date_trunc('quarter', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
$$;

REVOKE ALL ON FUNCTION public.rpg_inicio_da_temporada() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_inicio_da_temporada() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rpg_duelos_estado(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH temporada AS (SELECT public.rpg_inicio_da_temporada() AS inicio),
  eu AS (
    SELECT COALESCE((SELECT sum(xp_earned) FROM public.xp_ledger WHERE user_id = p_user_id), 0) AS xp
  ),
  pontos AS (
    SELECT d.desafiante_id AS user_id, sum(d.pontos)::INTEGER AS pontos, count(*) FILTER (WHERE d.venceu)::INTEGER AS vitorias
      FROM public.rpg_duelos d, temporada t
     WHERE d.criado_em >= t.inicio
     GROUP BY d.desafiante_id
  ),
  candidatos AS (
    SELECT p.user_id, p.handle, p.nome, r.personagem_base,
           COALESCE((SELECT sum(x.xp_earned) FROM public.xp_ledger x WHERE x.user_id = p.user_id), 0)::INTEGER AS xp_total
      FROM public.profiles p
      JOIN public.rpg_personagens r ON r.user_id = p.user_id
     WHERE p.publico AND p.handle IS NOT NULL AND p.user_id <> p_user_id
  )
  SELECT jsonb_build_object(
    'ok', true,
    'tem_perfil', EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id AND publico AND handle IS NOT NULL),
    'feitos', (SELECT count(*) FROM public.rpg_duelos WHERE desafiante_id = p_user_id AND criado_em >= public.rpg_inicio_do_dia()),
    'pontos', COALESCE((SELECT pontos FROM pontos WHERE user_id = p_user_id), 0),
    'oponentes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'handle', c.handle, 'nome', c.nome, 'personagem_base', c.personagem_base, 'xp_total', c.xp_total,
               'pontos', COALESCE(pt.pontos, 0),
               'duelado_hoje', EXISTS (SELECT 1 FROM public.rpg_duelos d
                                        WHERE d.desafiante_id = p_user_id AND d.oponente_id = c.user_id
                                          AND d.criado_em >= public.rpg_inicio_do_dia())))
        FROM (SELECT * FROM candidatos, eu ORDER BY abs(candidatos.xp_total - eu.xp), candidatos.handle LIMIT 40) c
        LEFT JOIN pontos pt ON pt.user_id = c.user_id), '[]'::JSONB),
    'ranking', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('posicao', x.posicao, 'handle', x.handle, 'nome', x.nome, 'pontos', x.pontos, 'vitorias', x.vitorias) ORDER BY x.posicao)
        FROM (SELECT row_number() OVER (ORDER BY pt.pontos DESC, pt.vitorias DESC, p.handle) AS posicao,
                     p.handle, p.nome, pt.pontos, pt.vitorias
                FROM pontos pt
                JOIN public.profiles p ON p.user_id = pt.user_id AND p.publico AND p.handle IS NOT NULL
               WHERE pt.pontos > 0
               ORDER BY pt.pontos DESC, pt.vitorias DESC, p.handle
               LIMIT 20) x), '[]'::JSONB)
  );
$$;

REVOKE ALL ON FUNCTION public.rpg_duelos_estado(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_duelos_estado(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.rpg_ficha_de_duelo(p_desafiante UUID, p_handle TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_alvo UUID;
  v_nome TEXT;
  v_personagem JSONB;
BEGIN
  SELECT p.user_id, p.nome INTO v_alvo, v_nome
    FROM public.profiles p
    JOIN public.rpg_personagens r ON r.user_id = p.user_id
   WHERE p.handle = lower(btrim(p_handle)) AND p.publico;
  IF v_alvo IS NULL THEN
    RETURN jsonb_build_object('erro', 'Oponente não encontrado. Ele pode ter fechado o perfil.');
  END IF;
  IF v_alvo = p_desafiante THEN
    RETURN jsonb_build_object('erro', 'Você não pode duelar consigo mesmo.');
  END IF;

  SELECT jsonb_build_object('nome', r.nome, 'personagem_base', r.personagem_base, 'criado_em', r.criado_em, 'visual_equipado', r.visual_equipado)
    INTO v_personagem
    FROM public.rpg_personagens r WHERE r.user_id = v_alvo;

  -- Mesmo formato de rpg_estado_jogador() (sql/084), sem cosméticos e skins, que não lutam.
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
                 'defesa', i.defesa, 'nivel_minimo', i.nivel_minimo)))
        FROM public.rpg_inventario inv
        JOIN public.rpg_itens i ON i.id = inv.item_id AND i.ativo = true
       WHERE inv.user_id = v_alvo), '[]'::JSONB),
    'equipados', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slot', e.slot, 'item_id', e.item_id))
        FROM public.rpg_equipados e WHERE e.user_id = v_alvo), '[]'::JSONB),
    'maestria', COALESCE((
      SELECT jsonb_object_agg(m.habilidade_id, m.usos) FROM public.rpg_maestria m WHERE m.user_id = v_alvo), '{}'::JSONB),
    'pontos', COALESCE((
      SELECT jsonb_build_object(
               'forca', a.forca, 'inteligencia', a.inteligencia, 'constituicao', a.constituicao,
               'agilidade', a.agilidade, 'destreza', a.destreza, 'sorte', a.sorte)
        FROM public.rpg_atributos a WHERE a.user_id = v_alvo), '{}'::JSONB)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_ficha_de_duelo(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_ficha_de_duelo(UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.rpg_registrar_duelo(
  p_user_id UUID,
  p_handle  TEXT,
  p_venceu  BOOLEAN,
  p_turnos  INTEGER,
  p_pontos  INTEGER,
  p_ouro    INTEGER,
  p_por_dia INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_alvo   UUID;
  v_feitos INTEGER;
  v_pontos INTEGER := 0;
  v_ouro   INTEGER := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id AND publico AND handle IS NOT NULL)
     OR NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('erro', 'Para duelar, abra o seu perfil público e desperte o personagem.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('rpg_duelo:' || p_user_id::TEXT, 0));

  SELECT p.user_id INTO v_alvo
    FROM public.profiles p
    JOIN public.rpg_personagens r ON r.user_id = p.user_id
   WHERE p.handle = lower(btrim(p_handle)) AND p.publico;
  IF v_alvo IS NULL OR v_alvo = p_user_id THEN
    RETURN jsonb_build_object('erro', 'Oponente não encontrado.');
  END IF;

  SELECT count(*)::INTEGER INTO v_feitos
    FROM public.rpg_duelos WHERE desafiante_id = p_user_id AND criado_em >= public.rpg_inicio_do_dia();
  IF v_feitos >= LEAST(GREATEST(COALESCE(p_por_dia, 3), 1), 10) THEN
    RETURN jsonb_build_object('erro', 'Você já fez todos os duelos de hoje. Volte amanhã.', 'limite_atingido', true);
  END IF;
  IF EXISTS (SELECT 1 FROM public.rpg_duelos WHERE desafiante_id = p_user_id AND oponente_id = v_alvo AND criado_em >= public.rpg_inicio_do_dia()) THEN
    RETURN jsonb_build_object('erro', 'Você já duelou com este jogador hoje. Escolha outro.');
  END IF;

  IF COALESCE(p_venceu, false) THEN
    v_pontos := LEAST(GREATEST(COALESCE(p_pontos, 0), 0), 10);
    v_ouro := LEAST(GREATEST(COALESCE(p_ouro, 0), 0), 100);
  END IF;

  INSERT INTO public.rpg_duelos (desafiante_id, oponente_id, venceu, turnos, pontos, ouro)
  VALUES (p_user_id, v_alvo, COALESCE(p_venceu, false), GREATEST(COALESCE(p_turnos, 0), 0), v_pontos, v_ouro);

  IF v_ouro > 0 THEN
    INSERT INTO public.rpg_recursos (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.rpg_recursos SET ouro = ouro + v_ouro, atualizado_em = now() WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'pontos_ganhos', v_pontos, 'ouro_ganho', v_ouro, 'feitos', v_feitos + 1);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_registrar_duelo(UUID, TEXT, BOOLEAN, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_registrar_duelo(UUID, TEXT, BOOLEAN, INTEGER, INTEGER, INTEGER, INTEGER) TO service_role;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT public.rpg_duelos_estado('<UUID>')->'ranking';
-- Depois de um duelo no app:
-- SELECT venceu, pontos, ouro, criado_em FROM public.rpg_duelos ORDER BY id DESC LIMIT 3;
