-- =============================================================================
-- 120 — Lutas em grupo: convites, preferências e trava contra insistência
-- =============================================================================
--
-- Um jogador abre um grupo para um monstro ou masmorra e convida até dois: amigos (os dois
-- se seguem), gente do clã ou quem está online. O convite aparece na tela do convidado;
-- quem aceita entra com a ficha de combate tirada naquele momento (pelo Go, com o token
-- dele). O líder começa a luta, o Go simula com todos e grava a luta de cada um.
--
-- Preferência de cada jogador (profiles):
--   convites_luta  'todos' | 'amigos' (amigos e clã) | 'ninguem'
--   convites_aviso aviso no meio da tela (true) ou só na lista de convites (false)
-- Trava: quem recusou 3 convites do mesmo líder em 7 dias fica sem receber convites dele
-- por 3 dias; e cada líder manda no máximo 30 convites por dia. Os três números ficam nas
-- regras da comunidade (convite_recusas_limite, convite_bloqueio_dias, convites_por_dia).
--
-- Online: profiles.visto_em, renovado pelo site aberto a cada poucos minutos.
--
-- Escrita só por funções. As do líder e do convidado conferem auth.uid(); as que recebem
-- ficha ou resultado são do service role (o Go calcula a ficha e simula).
--
-- Pode rodar mais de uma vez. Depois do 118.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS visto_em        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS convites_luta   TEXT NOT NULL DEFAULT 'todos',
  ADD COLUMN IF NOT EXISTS convites_aviso  BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_convites_luta') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_convites_luta CHECK (convites_luta IN ('todos', 'amigos', 'ninguem'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.rpg_grupos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lider        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alvo_tipo    TEXT NOT NULL CHECK (alvo_tipo IN ('monstro', 'masmorra')),
  alvo_id      TEXT NOT NULL,
  alvo_nome    TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'lutando', 'concluido', 'cancelado')),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em    TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '15 minutes',
  resultado    JSONB,
  concluido_em TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS rpg_grupos_lider_idx ON public.rpg_grupos (lider, criado_em DESC);

CREATE TABLE IF NOT EXISTS public.rpg_grupo_membros (
  grupo_id      UUID NOT NULL REFERENCES public.rpg_grupos(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel         TEXT NOT NULL CHECK (papel IN ('lider', 'convidado')),
  status        TEXT NOT NULL CHECK (status IN ('convidado', 'aceito', 'recusado', 'saiu')),
  convidado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  respondido_em TIMESTAMPTZ,
  ficha         JSONB,
  recompensa    JSONB,
  PRIMARY KEY (grupo_id, user_id)
);
CREATE INDEX IF NOT EXISTS rpg_grupo_membros_user_idx ON public.rpg_grupo_membros (user_id, status);

ALTER TABLE public.rpg_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpg_grupo_membros ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpg_grupos, public.rpg_grupo_membros FROM anon, authenticated;

-- Valores da trava, nas regras da comunidade (editáveis sem SQL).
UPDATE public.app_settings
   SET value = (jsonb_build_object('convite_recusas_limite', 3, 'convite_bloqueio_dias', 3, 'convites_por_dia', 30)
                || COALESCE(NULLIF(value, ''), '{}')::jsonb)::text
 WHERE key = 'comunidade_regras';

-- =============================================================================
-- Online e preferências
-- =============================================================================

CREATE OR REPLACE FUNCTION public.marcar_online()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.profiles SET visto_em = now()
   WHERE user_id = auth.uid() AND (visto_em IS NULL OR visto_em < now() - INTERVAL '1 minute');
$$;
REVOKE ALL ON FUNCTION public.marcar_online() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_online() TO authenticated;

CREATE OR REPLACE FUNCTION public.preferencias_convite()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object('quem', convites_luta, 'aviso', convites_aviso)
    FROM public.profiles WHERE user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.preferencias_convite() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preferencias_convite() TO authenticated;

CREATE OR REPLACE FUNCTION public.salvar_preferencias_convite(p_quem TEXT, p_aviso BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_quem NOT IN ('todos', 'amigos', 'ninguem') THEN
    RETURN jsonb_build_object('erro', 'Escolha: todos, amigos e clã, ou ninguém.');
  END IF;
  UPDATE public.profiles SET convites_luta = p_quem, convites_aviso = COALESCE(p_aviso, true)
   WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Crie seu perfil na Comunidade primeiro.');
  END IF;
  RETURN jsonb_build_object('ok', true, 'quem', p_quem, 'aviso', COALESCE(p_aviso, true));
END;
$$;
REVOKE ALL ON FUNCTION public.salvar_preferencias_convite(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_preferencias_convite(TEXT, BOOLEAN) TO authenticated;

-- =============================================================================
-- Regras do convite (usadas na lista de candidatos e no convite)
-- =============================================================================

-- Devolve o motivo de recusa, ou NULL quando o líder pode convidar o alvo.
CREATE OR REPLACE FUNCTION public.rpg_motivo_sem_convite(p_lider UUID, p_alvo UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_quem     TEXT;
  v_amigos   BOOLEAN;
  v_mesmo_cla BOOLEAN;
  v_limite   INTEGER := public.regra_comunidade('convite_recusas_limite', 3)::INTEGER;
  v_dias     INTEGER := public.regra_comunidade('convite_bloqueio_dias', 3)::INTEGER;
  v_recusas  INTEGER;
  v_ultima   TIMESTAMPTZ;
BEGIN
  IF p_lider = p_alvo THEN
    RETURN 'Você já está no grupo.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = p_alvo) THEN
    RETURN 'Ainda não despertou um personagem.';
  END IF;
  SELECT convites_luta INTO v_quem FROM public.profiles WHERE user_id = p_alvo;
  IF v_quem IS NULL THEN
    RETURN 'Jogador não encontrado.';
  END IF;
  IF v_quem = 'ninguem' THEN
    RETURN 'Não está aceitando convites para lutar.';
  END IF;

  v_amigos := EXISTS (SELECT 1 FROM public.seguidores WHERE seguidor_id = p_lider AND seguido_id = p_alvo)
          AND EXISTS (SELECT 1 FROM public.seguidores WHERE seguidor_id = p_alvo AND seguido_id = p_lider);
  v_mesmo_cla := EXISTS (
    SELECT 1 FROM public.cla_membros a JOIN public.cla_membros b ON b.cla_id = a.cla_id
     WHERE a.user_id = p_lider AND b.user_id = p_alvo);
  IF v_quem = 'amigos' AND NOT v_amigos AND NOT v_mesmo_cla THEN
    RETURN 'Só aceita convites de amigos e do clã.';
  END IF;

  SELECT count(*), max(m.respondido_em) INTO v_recusas, v_ultima
    FROM public.rpg_grupo_membros m
    JOIN public.rpg_grupos g ON g.id = m.grupo_id
   WHERE g.lider = p_lider AND m.user_id = p_alvo AND m.status = 'recusado'
     AND m.respondido_em > now() - INTERVAL '7 days';
  IF v_recusas >= v_limite AND v_ultima > now() - make_interval(days => v_dias) THEN
    RETURN format('Recusou seus últimos convites. Tente de novo a partir de %s.',
                  to_char((v_ultima + make_interval(days => v_dias)) AT TIME ZONE 'America/Sao_Paulo', 'DD/MM "às" HH24:MI'));
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_motivo_sem_convite(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_motivo_sem_convite(UUID, UUID) TO service_role;

-- =============================================================================
-- Service role: o Go cria, aceita, separa para a luta e conclui
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_grupo_criar(p_user UUID, p_tipo TEXT, p_alvo TEXT, p_alvo_nome TEXT, p_ficha JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_tipo NOT IN ('monstro', 'masmorra') OR btrim(COALESCE(p_alvo, '')) = '' OR p_ficha IS NULL THEN
    RETURN jsonb_build_object('erro', 'Grupo inválido.');
  END IF;
  -- Um grupo aberto por líder: abrir outro fecha o anterior.
  UPDATE public.rpg_grupos SET status = 'cancelado' WHERE lider = p_user AND status = 'aberto';

  INSERT INTO public.rpg_grupos (lider, alvo_tipo, alvo_id, alvo_nome)
  VALUES (p_user, p_tipo, btrim(p_alvo), left(btrim(COALESCE(p_alvo_nome, '')), 80))
  RETURNING id INTO v_id;
  INSERT INTO public.rpg_grupo_membros (grupo_id, user_id, papel, status, respondido_em, ficha)
  VALUES (v_id, p_user, 'lider', 'aceito', now(), p_ficha);
  RETURN jsonb_build_object('ok', true, 'grupo_id', v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_criar(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_criar(UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.rpg_grupo_aceitar(p_user UUID, p_grupo UUID, p_ficha JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_grupo public.rpg_grupos%ROWTYPE;
BEGIN
  SELECT * INTO v_grupo FROM public.rpg_grupos WHERE id = p_grupo FOR UPDATE;
  IF v_grupo.id IS NULL OR v_grupo.status <> 'aberto' OR v_grupo.expira_em < now() THEN
    RETURN jsonb_build_object('erro', 'Este convite não vale mais: o grupo já lutou ou foi fechado.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rpg_grupo_membros WHERE grupo_id = p_grupo AND user_id = p_user AND status = 'convidado') THEN
    RETURN jsonb_build_object('erro', 'Você não tem convite para este grupo.');
  END IF;
  IF (SELECT count(*) FROM public.rpg_grupo_membros WHERE grupo_id = p_grupo AND status = 'aceito') >= 3 THEN
    RETURN jsonb_build_object('erro', 'O grupo já está cheio.');
  END IF;
  UPDATE public.rpg_grupo_membros
     SET status = 'aceito', respondido_em = now(), ficha = p_ficha
   WHERE grupo_id = p_grupo AND user_id = p_user;
  RETURN jsonb_build_object('ok', true, 'grupo_id', p_grupo, 'alvo_tipo', v_grupo.alvo_tipo, 'alvo_id', v_grupo.alvo_id);
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_aceitar(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_aceitar(UUID, UUID, JSONB) TO service_role;

-- Leitura para quem vai aceitar: o Go precisa do alvo antes de montar a ficha.
CREATE OR REPLACE FUNCTION public.rpg_grupo_alvo(p_grupo UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object('alvo_tipo', alvo_tipo, 'alvo_id', alvo_id, 'lider', lider, 'status', status)
    FROM public.rpg_grupos WHERE id = p_grupo;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_alvo(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_alvo(UUID) TO service_role;

-- Separa o grupo para a luta: só o líder, só aberto. Fica 'lutando' até concluir ou reabrir.
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
  -- Convites sem resposta deixam de valer quando a luta começa.
  UPDATE public.rpg_grupo_membros SET status = 'saiu', respondido_em = now()
   WHERE grupo_id = p_grupo AND status = 'convidado';
  RETURN jsonb_build_object(
    'ok', true, 'alvo_tipo', v_grupo.alvo_tipo, 'alvo_id', v_grupo.alvo_id,
    'membros', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('user_id', m.user_id, 'ficha', m.ficha) ORDER BY (m.papel = 'lider') DESC, m.respondido_em)
        FROM public.rpg_grupo_membros m WHERE m.grupo_id = p_grupo AND m.status = 'aceito'
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_para_lutar(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_para_lutar(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.rpg_grupo_reabrir(p_grupo UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.rpg_grupos SET status = 'aberto' WHERE id = p_grupo AND status = 'lutando';
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_reabrir(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_reabrir(UUID) TO service_role;

-- p_recompensas: [{"user_id": ..., "recompensa": {...}}]
CREATE OR REPLACE FUNCTION public.rpg_grupo_concluir(p_grupo UUID, p_resultado JSONB, p_recompensas JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.rpg_grupos SET status = 'concluido', resultado = p_resultado, concluido_em = now()
   WHERE id = p_grupo AND status = 'lutando';
  UPDATE public.rpg_grupo_membros m
     SET recompensa = r.value->'recompensa'
    FROM jsonb_array_elements(COALESCE(p_recompensas, '[]'::jsonb)) r
   WHERE m.grupo_id = p_grupo AND m.user_id = (r.value->>'user_id')::UUID;
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_concluir(UUID, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_concluir(UUID, JSONB, JSONB) TO service_role;

-- =============================================================================
-- Autenticado: líder convida e fecha; convidado vê, recusa e sai
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_grupo_convidar(p_grupo UUID, p_handle TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_eu     UUID := auth.uid();
  v_grupo  public.rpg_grupos%ROWTYPE;
  v_alvo   UUID;
  v_motivo TEXT;
  v_hoje   INTEGER;
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
  IF (SELECT count(*) FROM public.rpg_grupo_membros WHERE grupo_id = p_grupo AND status IN ('convidado', 'aceito')) >= 3 THEN
    RETURN jsonb_build_object('erro', 'O grupo vai até 3 pessoas, contando você.');
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
  -- Convite novo dá ao grupo mais tempo para juntar todo mundo.
  UPDATE public.rpg_grupos SET expira_em = GREATEST(expira_em, now() + INTERVAL '10 minutes') WHERE id = p_grupo;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_convidar(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_convidar(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpg_grupo_recusar(p_grupo UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.rpg_grupo_membros SET status = 'recusado', respondido_em = now()
   WHERE grupo_id = p_grupo AND user_id = auth.uid() AND status = 'convidado';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Convite não encontrado.');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_recusar(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_recusar(UUID) TO authenticated;

-- O convidado sai; o líder, ao sair, fecha o grupo.
CREATE OR REPLACE FUNCTION public.rpg_grupo_sair(p_grupo UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_eu UUID := auth.uid();
BEGIN
  IF EXISTS (SELECT 1 FROM public.rpg_grupos WHERE id = p_grupo AND lider = v_eu AND status = 'aberto') THEN
    UPDATE public.rpg_grupos SET status = 'cancelado' WHERE id = p_grupo;
    RETURN jsonb_build_object('ok', true, 'fechou', true);
  END IF;
  UPDATE public.rpg_grupo_membros m SET status = 'saiu', respondido_em = now()
    FROM public.rpg_grupos g
   WHERE g.id = m.grupo_id AND g.status = 'aberto'
     AND m.grupo_id = p_grupo AND m.user_id = v_eu AND m.status = 'aceito';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Você não está neste grupo.');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_sair(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_sair(UUID) TO authenticated;

-- Convites esperando resposta, para o aviso na tela.
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

-- Estado do grupo para quem está nele (líder ou convidado): membros, e o resultado no fim.
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
               'personagem', m.ficha->>'personagem'
             ) ORDER BY (m.papel = 'lider') DESC, m.convidado_em)
        FROM public.rpg_grupo_membros m JOIN public.profiles p ON p.user_id = m.user_id
       WHERE m.grupo_id = p_grupo AND m.status IN ('convidado', 'aceito', 'recusado')
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_grupo_estado(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_grupo_estado(UUID) TO authenticated;

-- Quem dá para chamar: amigos (os dois se seguem), clã e quem está online agora.
CREATE OR REPLACE FUNCTION public.rpg_candidatos_grupo(p_grupo UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_eu UUID := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.rpg_grupos WHERE id = p_grupo AND lider = v_eu) THEN
    RETURN jsonb_build_object('erro', 'Grupo não encontrado.');
  END IF;
  RETURN jsonb_build_object('ok', true, 'candidatos', COALESCE((
    SELECT jsonb_agg(c ORDER BY (c->>'online')::BOOLEAN DESC, (c->>'amigo')::BOOLEAN DESC, c->>'nome')
      FROM (
        SELECT jsonb_build_object(
                 'handle', p.handle, 'nome', COALESCE(NULLIF(p.nome, ''), p.handle),
                 'online', COALESCE(p.visto_em > now() - INTERVAL '5 minutes', false),
                 'amigo', EXISTS (SELECT 1 FROM public.seguidores s1 WHERE s1.seguidor_id = v_eu AND s1.seguido_id = p.user_id)
                      AND EXISTS (SELECT 1 FROM public.seguidores s2 WHERE s2.seguidor_id = p.user_id AND s2.seguido_id = v_eu),
                 'cla', EXISTS (SELECT 1 FROM public.cla_membros a JOIN public.cla_membros b ON b.cla_id = a.cla_id
                                 WHERE a.user_id = v_eu AND b.user_id = p.user_id),
                 'no_grupo', (SELECT m.status FROM public.rpg_grupo_membros m WHERE m.grupo_id = p_grupo AND m.user_id = p.user_id),
                 'motivo', public.rpg_motivo_sem_convite(v_eu, p.user_id)
               ) AS c
          FROM public.profiles p
          JOIN public.rpg_personagens r ON r.user_id = p.user_id
         WHERE p.user_id <> v_eu
           AND (p.visto_em > now() - INTERVAL '5 minutes'
                OR EXISTS (SELECT 1 FROM public.seguidores s WHERE s.seguidor_id = v_eu AND s.seguido_id = p.user_id)
                OR EXISTS (SELECT 1 FROM public.cla_membros a JOIN public.cla_membros b ON b.cla_id = a.cla_id
                            WHERE a.user_id = v_eu AND b.user_id = p.user_id))
         LIMIT 60
      ) x
  ), '[]'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_candidatos_grupo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_candidatos_grupo(UUID) TO authenticated;
