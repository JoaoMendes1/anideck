-- =============================================================================
-- 136 — Esquadrão de heróis (até 3) + escolha de vagas/heróis no grupo online
-- =============================================================================
--
-- O que muda:
--   1. rpg_personagens ganha `esquadrao TEXT[]` (até 2 aliados desbloqueados que lutam junto
--      com o personagem ativo, totalizando até 3 heróis no esquadrão).
--   2. rpg_salvar_esquadrao(p_esquadrao) valida autoria via auth.uid(), exige que todos os
--      aliados estejam em `desbloqueados`, remove duplicados/líder e limita a 2 aliados.
--   3. rpg_estado_jogador() passa a incluir `esquadrao` em `personagem` (definição viva,
--      antes no sql/126).
--   4. rpg_grupos ganha `max_herois` (1..3, padrão 3) e `herois_lider` (1..max_herois,
--      padrão 1), permitindo ao líder definir quantos heróis entram no combate e quantas
--      vagas ficam abertas para amigos convidados online.
--   5. rpg_grupo_criar, rpg_grupo_configurar (novo), rpg_grupo_convidar, rpg_grupo_aceitar,
--      rpg_grupo_para_lutar, rpg_grupo_estado e rpg_convites_pendentes passam a respeitar e
--      expor `max_herois`, `herois_lider` e `vagas_online`.
--
-- ORDEM: depois do sql/120 e do sql/126. Pode rodar mais de uma vez.

-- =============================================================================
-- 1. Esquadrão em rpg_personagens
-- =============================================================================

ALTER TABLE public.rpg_personagens
  ADD COLUMN IF NOT EXISTS esquadrao TEXT[];

UPDATE public.rpg_personagens
   SET esquadrao = ARRAY[]::TEXT[]
 WHERE esquadrao IS NULL;

ALTER TABLE public.rpg_personagens
  ALTER COLUMN esquadrao SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN esquadrao SET NOT NULL;

COMMENT ON COLUMN public.rpg_personagens.esquadrao IS
  'Até 2 IDs de personagens desbloqueados que acompanham o personagem ativo em esquadrão.';

CREATE OR REPLACE FUNCTION public.rpg_salvar_esquadrao(p_esquadrao TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row     public.rpg_personagens%ROWTYPE;
  v_item    TEXT;
  v_limpo   TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  SELECT * INTO v_row FROM public.rpg_personagens WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  IF p_esquadrao IS NOT NULL THEN
    FOREACH v_item IN ARRAY p_esquadrao LOOP
      v_item := btrim(COALESCE(v_item, ''));
      IF v_item = '' OR v_item = v_row.personagem_base THEN
        CONTINUE;
      END IF;
      IF NOT (v_item = ANY(v_row.desbloqueados)) THEN
        RETURN jsonb_build_object('erro', 'Você só pode colocar no esquadrão personagens já desbloqueados.');
      END IF;
      IF NOT (v_item = ANY(v_limpo)) THEN
        v_limpo := array_append(v_limpo, v_item);
      END IF;
      IF cardinality(v_limpo) >= 2 THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.rpg_personagens
     SET esquadrao = v_limpo
   WHERE user_id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'esquadrao', to_jsonb(v_limpo));
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_salvar_esquadrao(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_salvar_esquadrao(TEXT[]) TO authenticated;

-- =============================================================================
-- 2. Estado do jogador (definição viva baseada no sql/126, com `esquadrao`)
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
           'esquadrao', COALESCE(to_jsonb(p.esquadrao), '[]'::JSONB),
           'ultima_troca_em', p.ultima_troca_em)
    INTO v_personagem
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

-- =============================================================================
-- 3. Colunas de capacidade de heróis em rpg_grupos
-- =============================================================================

ALTER TABLE public.rpg_grupos
  ADD COLUMN IF NOT EXISTS max_herois   INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS herois_lider INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rpg_grupos_max_herois_chk') THEN
    ALTER TABLE public.rpg_grupos
      ADD CONSTRAINT rpg_grupos_max_herois_chk CHECK (max_herois BETWEEN 1 AND 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rpg_grupos_herois_lider_chk') THEN
    ALTER TABLE public.rpg_grupos
      ADD CONSTRAINT rpg_grupos_herois_lider_chk CHECK (herois_lider BETWEEN 1 AND 3 AND herois_lider <= max_herois);
  END IF;
END $$;

-- Remove assinatura antiga (5 parâmetros) para que a nova (com defaults) não crie overload ambíguo.
DROP FUNCTION IF EXISTS public.rpg_grupo_criar(UUID, TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.rpg_grupo_criar(
  p_user         UUID,
  p_tipo         TEXT,
  p_alvo         TEXT,
  p_alvo_nome    TEXT,
  p_ficha        JSONB,
  p_max_herois   INTEGER DEFAULT 3,
  p_herois_lider INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id          UUID;
  v_max         INTEGER := GREATEST(1, LEAST(3, COALESCE(p_max_herois, 3)));
  v_lider_qtd   INTEGER := GREATEST(1, LEAST(v_max, COALESCE(p_herois_lider, 1)));
BEGIN
  IF p_tipo NOT IN ('monstro', 'masmorra') OR btrim(COALESCE(p_alvo, '')) = '' OR p_ficha IS NULL THEN
    RETURN jsonb_build_object('erro', 'Grupo inválido.');
  END IF;
  -- Um grupo aberto por líder: abrir outro fecha o anterior.
  UPDATE public.rpg_grupos SET status = 'cancelado' WHERE lider = p_user AND status = 'aberto';

  INSERT INTO public.rpg_grupos (lider, alvo_tipo, alvo_id, alvo_nome, max_herois, herois_lider)
  VALUES (p_user, p_tipo, btrim(p_alvo), left(btrim(COALESCE(p_alvo_nome, '')), 80), v_max, v_lider_qtd)
  RETURNING id INTO v_id;
  INSERT INTO public.rpg_grupo_membros (grupo_id, user_id, papel, status, respondido_em, ficha)
  VALUES (v_id, p_user, 'lider', 'aceito', now(), p_ficha);
  RETURN jsonb_build_object('ok', true, 'grupo_id', v_id, 'max_herois', v_max, 'herois_lider', v_lider_qtd);
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_criar(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_criar(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.rpg_grupo_configurar(
  p_lider        UUID,
  p_grupo        UUID,
  p_max_herois   INTEGER,
  p_herois_lider INTEGER,
  p_ficha        JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_grupo           public.rpg_grupos%ROWTYPE;
  v_max             INTEGER := GREATEST(1, LEAST(3, COALESCE(p_max_herois, 3)));
  v_lider_qtd       INTEGER := GREATEST(1, LEAST(v_max, COALESCE(p_herois_lider, 1)));
  v_convidados      INTEGER;
BEGIN
  SELECT * INTO v_grupo FROM public.rpg_grupos WHERE id = p_grupo FOR UPDATE;
  IF v_grupo.id IS NULL OR v_grupo.lider <> p_lider THEN
    RETURN jsonb_build_object('erro', 'Grupo não encontrado.');
  END IF;
  IF v_grupo.status <> 'aberto' OR v_grupo.expira_em < now() THEN
    RETURN jsonb_build_object('erro', 'Este grupo já lutou ou foi fechado.');
  END IF;

  SELECT count(*) INTO v_convidados
    FROM public.rpg_grupo_membros
   WHERE grupo_id = p_grupo AND papel = 'convidado' AND status IN ('convidado', 'aceito');

  IF v_convidados + v_lider_qtd > v_max THEN
    RETURN jsonb_build_object(
      'erro',
      format('Já existem %s jogador(es) convidados ou prontos neste grupo. Aumente o total de heróis ou reduza os do seu esquadrão.', v_convidados)
    );
  END IF;

  UPDATE public.rpg_grupos
     SET max_herois = v_max,
         herois_lider = v_lider_qtd
   WHERE id = p_grupo;

  IF p_ficha IS NOT NULL THEN
    UPDATE public.rpg_grupo_membros
       SET ficha = p_ficha
     WHERE grupo_id = p_grupo AND user_id = p_lider AND papel = 'lider';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'max_herois', v_max,
    'herois_lider', v_lider_qtd,
    'vagas_online', GREATEST(0, v_max - v_lider_qtd)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_configurar(UUID, UUID, INTEGER, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_configurar(UUID, UUID, INTEGER, INTEGER, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.rpg_grupo_aceitar(p_user UUID, p_grupo UUID, p_ficha JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_grupo     public.rpg_grupos%ROWTYPE;
  v_aceitos   INTEGER;
BEGIN
  SELECT * INTO v_grupo FROM public.rpg_grupos WHERE id = p_grupo FOR UPDATE;
  IF v_grupo.id IS NULL OR v_grupo.status <> 'aberto' OR v_grupo.expira_em < now() THEN
    RETURN jsonb_build_object('erro', 'Este convite não vale mais: o grupo já lutou ou foi fechado.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rpg_grupo_membros WHERE grupo_id = p_grupo AND user_id = p_user AND status = 'convidado') THEN
    RETURN jsonb_build_object('erro', 'Você não tem convite para este grupo.');
  END IF;
  SELECT count(*) INTO v_aceitos
    FROM public.rpg_grupo_membros
   WHERE grupo_id = p_grupo AND papel = 'convidado' AND status = 'aceito';
  IF (v_aceitos + v_grupo.herois_lider) >= v_grupo.max_herois THEN
    RETURN jsonb_build_object('erro', 'As vagas de heróis deste grupo já foram preenchidas.');
  END IF;
  UPDATE public.rpg_grupo_membros
     SET status = 'aceito', respondido_em = now(), ficha = p_ficha
   WHERE grupo_id = p_grupo AND user_id = p_user;
  RETURN jsonb_build_object('ok', true, 'grupo_id', p_grupo, 'alvo_tipo', v_grupo.alvo_tipo, 'alvo_id', v_grupo.alvo_id);
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_aceitar(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_aceitar(UUID, UUID, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.rpg_grupo_para_lutar(p_lider UUID, p_grupo UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_grupo public.rpg_grupos%ROWTYPE;
BEGIN
  SELECT * INTO v_grupo FROM public.rpg_grupos WHERE id = p_grupo FOR UPDATE;
  IF v_grupo.id IS NULL OR v_grupo.lider <> p_lider THEN
    RETURN jsonb_build_object('erro', 'Grupo não encontrado.');
  END IF;
  IF v_grupo.status <> 'aberto' OR v_grupo.expira_em < now() THEN
    RETURN jsonb_build_object('erro', 'Este grupo já lutou ou foi fechado.');
  END IF;
  UPDATE public.rpg_grupos SET status = 'lutando' WHERE id = p_grupo;
  UPDATE public.rpg_grupo_membros SET status = 'saiu', respondido_em = now()
   WHERE grupo_id = p_grupo AND status = 'convidado';
  RETURN jsonb_build_object(
    'ok', true,
    'alvo_tipo', v_grupo.alvo_tipo,
    'alvo_id', v_grupo.alvo_id,
    'max_herois', v_grupo.max_herois,
    'herois_lider', v_grupo.herois_lider,
    'membros', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('user_id', m.user_id, 'ficha', m.ficha) ORDER BY (m.papel = 'lider') DESC, m.respondido_em)
        FROM public.rpg_grupo_membros m WHERE m.grupo_id = p_grupo AND m.status = 'aceito'
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_para_lutar(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_para_lutar(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.rpg_grupo_convidar(p_grupo UUID, p_handle TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_eu       UUID := auth.uid();
  v_grupo    public.rpg_grupos%ROWTYPE;
  v_alvo     UUID;
  v_motivo   TEXT;
  v_hoje     INTEGER;
  v_ocupados INTEGER;
BEGIN
  SELECT * INTO v_grupo FROM public.rpg_grupos WHERE id = p_grupo FOR UPDATE;
  IF v_grupo.id IS NULL OR v_grupo.lider <> v_eu THEN
    RETURN jsonb_build_object('erro', 'Só quem abriu o grupo convida.');
  END IF;
  IF v_grupo.status <> 'aberto' OR v_grupo.expira_em < now() THEN
    RETURN jsonb_build_object('erro', 'Este grupo já lutou ou foi fechado.');
  END IF;
  SELECT user_id INTO v_alvo FROM public.profiles WHERE handle = lower(ltrim(btrim(p_handle), '@'));
  IF v_alvo IS NULL THEN
    RETURN jsonb_build_object('erro', 'Jogador não encontrado.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.rpg_grupo_membros WHERE grupo_id = p_grupo AND user_id = v_alvo AND status IN ('convidado', 'aceito')) THEN
    RETURN jsonb_build_object('erro', 'Já está convidado.');
  END IF;
  SELECT count(*) INTO v_ocupados
    FROM public.rpg_grupo_membros
   WHERE grupo_id = p_grupo AND papel = 'convidado' AND status IN ('convidado', 'aceito');
  IF (v_ocupados + v_grupo.herois_lider) >= v_grupo.max_herois THEN
    RETURN jsonb_build_object(
      'erro',
      format('Todas as %s vagas deste grupo já estão ocupadas (%s herói(s) do líder + %s amigo(s)).', v_grupo.max_herois, v_grupo.herois_lider, v_ocupados)
    );
  END IF;
  v_motivo := public.rpg_motivo_sem_convite(v_eu, v_alvo);
  IF v_motivo IS NOT NULL THEN
    RETURN jsonb_build_object('erro', v_motivo, 'bloqueado', true);
  END IF;
  SELECT count(*) INTO v_hoje
    FROM public.rpg_grupo_membros m JOIN public.rpg_grupos g ON g.id = m.grupo_id
   WHERE g.lider = v_eu AND m.papel = 'convidado'
     AND m.convidado_em >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  IF v_hoje >= public.regra_comunidade('convites_por_dia', 30) THEN
    RETURN jsonb_build_object('erro', 'Você já mandou muitos convites hoje. Volte amanhã.');
  END IF;

  INSERT INTO public.rpg_grupo_membros (grupo_id, user_id, papel, status)
  VALUES (p_grupo, v_alvo, 'convidado', 'convidado')
  ON CONFLICT (grupo_id, user_id) DO UPDATE
    SET status = 'convidado', convidado_em = now(), respondido_em = NULL, ficha = NULL;
  UPDATE public.rpg_grupos SET expira_em = GREATEST(expira_em, now() + INTERVAL '10 minutes') WHERE id = p_grupo;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_convidar(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_convidar(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpg_convites_pendentes()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'aviso', COALESCE((SELECT convites_aviso FROM public.profiles WHERE user_id = auth.uid()), true),
    'convites', COALESCE(jsonb_agg(jsonb_build_object(
        'grupo_id', g.id, 'alvo_tipo', g.alvo_tipo, 'alvo_id', g.alvo_id, 'alvo_nome', g.alvo_nome,
        'lider_nome', COALESCE(NULLIF(p.nome, ''), p.handle), 'lider_handle', p.handle,
        'max_herois', g.max_herois, 'herois_lider', g.herois_lider,
        'vagas_online', GREATEST(0, g.max_herois - g.herois_lider),
        'expira_em', g.expira_em, 'convidado_em', m.convidado_em
      ) ORDER BY m.convidado_em DESC), '[]'::jsonb)
  )
    FROM public.rpg_grupo_membros m
    JOIN public.rpg_grupos g ON g.id = m.grupo_id
    JOIN public.profiles p ON p.user_id = g.lider
   WHERE m.user_id = auth.uid() AND m.status = 'convidado'
     AND g.status = 'aberto' AND g.expira_em > now();
$$;
REVOKE ALL ON FUNCTION public.rpg_convites_pendentes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_convites_pendentes() TO authenticated;

CREATE OR REPLACE FUNCTION public.rpg_grupo_estado(p_grupo UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_eu    UUID := auth.uid();
  v_grupo public.rpg_grupos%ROWTYPE;
BEGIN
  SELECT * INTO v_grupo FROM public.rpg_grupos WHERE id = p_grupo;
  IF v_grupo.id IS NULL OR NOT EXISTS (SELECT 1 FROM public.rpg_grupo_membros WHERE grupo_id = p_grupo AND user_id = v_eu) THEN
    RETURN jsonb_build_object('erro', 'Grupo não encontrado.');
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'id', v_grupo.id,
    'alvo_tipo', v_grupo.alvo_tipo, 'alvo_id', v_grupo.alvo_id, 'alvo_nome', v_grupo.alvo_nome,
    'max_herois', v_grupo.max_herois,
    'herois_lider', v_grupo.herois_lider,
    'vagas_online', GREATEST(0, v_grupo.max_herois - v_grupo.herois_lider),
    'status', CASE WHEN v_grupo.status = 'aberto' AND v_grupo.expira_em < now() THEN 'expirado' ELSE v_grupo.status END,
    'expira_em', v_grupo.expira_em,
    'sou_lider', v_grupo.lider = v_eu,
    'resultado', v_grupo.resultado,
    'minha_recompensa', (SELECT recompensa FROM public.rpg_grupo_membros WHERE grupo_id = p_grupo AND user_id = v_eu),
    'membros', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'handle', p.handle, 'nome', COALESCE(NULLIF(p.nome, ''), p.handle),
               'papel', m.papel, 'status', m.status, 'sou_eu', m.user_id = v_eu,
               'nivel', (m.ficha->>'nivel')::INTEGER, 'poder', (m.ficha->>'poder')::INTEGER,
               'personagem', m.ficha->>'personagem',
               'acompanhantes', COALESCE(m.ficha->'acompanhantes', '[]'::JSONB)
             ) ORDER BY (m.papel = 'lider') DESC, m.convidado_em)
        FROM public.rpg_grupo_membros m JOIN public.profiles p ON p.user_id = m.user_id
       WHERE m.grupo_id = p_grupo AND m.status IN ('convidado', 'aceito', 'recusado')
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_estado(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_estado(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
