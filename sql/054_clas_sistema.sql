-- sql/054_clas_sistema.sql
-- Fase 17 (17.1a, #180): Clãs temáticos (criação, entrada, saída, papéis, moderação)
-- Sistema de grupos de 10 a 30 membros com tag [TAG], emblemas, liderança e moderação.

-- =============================================================================
-- 1. CONFIGURAÇÕES EM APP_SETTINGS
-- =============================================================================
INSERT INTO public.app_settings (key, value)
VALUES
  ('cla_max_membros', '30'::jsonb),
  ('cla_min_membros_liga', '10'::jsonb),
  ('cla_nivel_minimo_criacao', '3'::jsonb),
  ('cla_cooldown_saida_dias', '7'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- =============================================================================
-- 2. TABELAS: CLAS, MEMBROS, HISTORICO DE SAIDA, CONVITES E DENUNCIAS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.clas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  tag VARCHAR(4) NOT NULL UNIQUE,
  descricao TEXT NOT NULL DEFAULT '',
  emblema TEXT NOT NULL DEFAULT 'padrao',
  tipo TEXT NOT NULL DEFAULT 'aberto' CHECK (tipo IN ('aberto', 'convite')),
  nivel_minimo INTEGER NOT NULL DEFAULT 1 CHECK (nivel_minimo >= 1),
  criador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cla_nome_len CHECK (char_length(trim(nome)) >= 3 AND char_length(trim(nome)) <= 30),
  CONSTRAINT cla_tag_len CHECK (char_length(trim(tag)) >= 2 AND char_length(trim(tag)) <= 4)
);

CREATE INDEX IF NOT EXISTS idx_clas_tag ON public.clas(tag);
CREATE INDEX IF NOT EXISTS idx_clas_ativo ON public.clas(ativo);

CREATE TABLE IF NOT EXISTS public.cla_membros (
  cla_id UUID NOT NULL REFERENCES public.clas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  papel TEXT NOT NULL DEFAULT 'membro' CHECK (papel IN ('lider', 'vice', 'membro')),
  entrou_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cla_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cla_membros_user ON public.cla_membros(user_id);
CREATE INDEX IF NOT EXISTS idx_cla_membros_cla ON public.cla_membros(cla_id);

CREATE TABLE IF NOT EXISTS public.cla_historico_saida (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  saiu_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cla_convites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cla_id UUID NOT NULL REFERENCES public.clas(id) ON DELETE CASCADE,
  convidado_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  convidado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado', 'cancelado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cla_convites_pendente
  ON public.cla_convites(cla_id, convidado_user_id)
  WHERE status = 'pendente';

CREATE TABLE IF NOT EXISTS public.cla_denuncias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cla_id UUID NOT NULL REFERENCES public.clas(id) ON DELETE CASCADE,
  denunciante_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'resolvido', 'descartado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cla_denuncias_status ON public.cla_denuncias(status);


-- =============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =============================================================================
ALTER TABLE public.clas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cla_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cla_historico_saida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cla_convites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cla_denuncias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode ler clas ativos" ON public.clas;
CREATE POLICY "Qualquer um pode ler clas ativos"
  ON public.clas FOR SELECT
  USING (ativo = true OR auth.uid() = criador_id);

DROP POLICY IF EXISTS "Qualquer um pode ler membros de clas" ON public.cla_membros;
CREATE POLICY "Qualquer um pode ler membros de clas"
  ON public.cla_membros FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuario pode ler seu historico de saida" ON public.cla_historico_saida;
CREATE POLICY "Usuario pode ler seu historico de saida"
  ON public.cla_historico_saida FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuario ve convites relevantes" ON public.cla_convites;
CREATE POLICY "Usuario ve convites relevantes"
  ON public.cla_convites FOR SELECT
  USING (
    auth.uid() = convidado_user_id
    OR EXISTS (
      SELECT 1 FROM public.cla_membros m
       WHERE m.cla_id = public.cla_convites.cla_id
         AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuario pode denunciar cla" ON public.cla_denuncias;
CREATE POLICY "Usuario pode denunciar cla"
  ON public.cla_denuncias FOR INSERT
  WITH CHECK (auth.uid() = denunciante_user_id);

DROP POLICY IF EXISTS "Usuario pode ver suas proprias denuncias" ON public.cla_denuncias;
CREATE POLICY "Usuario pode ver suas proprias denuncias"
  ON public.cla_denuncias FOR SELECT
  USING (auth.uid() = denunciante_user_id);

GRANT SELECT ON public.clas TO anon, authenticated, service_role;
GRANT SELECT ON public.cla_membros TO anon, authenticated, service_role;
GRANT SELECT ON public.cla_historico_saida TO authenticated, service_role;
GRANT SELECT ON public.cla_convites TO authenticated, service_role;
GRANT INSERT, SELECT ON public.cla_denuncias TO authenticated, service_role;


-- =============================================================================
-- 4. FUNÇÕES AUXILIARES E RPCs (SECURITY DEFINER)
-- =============================================================================

-- Calcula o nível do usuário a partir do total de XP acumulado no xp_ledger
CREATE OR REPLACE FUNCTION public.calcular_nivel_usuario(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_xp_total bigint;
  v_nivel integer := 1;
  v_custo integer;
BEGIN
  SELECT COALESCE(sum(xp_earned), 0) INTO v_xp_total
    FROM public.xp_ledger
   WHERE user_id = p_user_id;

  WHILE v_xp_total > 0 LOOP
    -- Custo para próximo nível: 100 + (nivel - 1) * 30
    v_custo := 100 + (v_nivel - 1) * 30;
    IF v_xp_total < v_custo THEN
      EXIT;
    END IF;
    v_xp_total := v_xp_total - v_custo;
    v_nivel := v_nivel + 1;
  END LOOP;

  RETURN v_nivel;
END;
$$;

-- Criar novo Clã
CREATE OR REPLACE FUNCTION public.criar_cla(
  p_nome text,
  p_tag text,
  p_descricao text DEFAULT '',
  p_emblema text DEFAULT 'padrao',
  p_tipo text DEFAULT 'aberto',
  p_nivel_minimo integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_publico boolean;
  v_nivel_user integer;
  v_min_nivel_criacao integer := 3;
  v_cooldown_dias integer := 7;
  v_saiu_em timestamptz;
  v_cla_id uuid;
  v_nome_limpo text;
  v_tag_limpa text;
  v_emblema_valido text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  -- Verifica perfil público
  SELECT publico INTO v_publico
    FROM public.profiles
   WHERE user_id = v_user_id;

  IF v_publico IS NOT TRUE THEN
    RAISE EXCEPTION 'Seu perfil precisa ser público para fundar um clã.' USING ERRCODE = 'P0001';
  END IF;

  -- Nível mínimo para criação
  SELECT COALESCE((value #>> '{}')::integer, 3) INTO v_min_nivel_criacao
    FROM public.app_settings
   WHERE key = 'cla_nivel_minimo_criacao';

  v_nivel_user := public.calcular_nivel_usuario(v_user_id);
  IF v_nivel_user < v_min_nivel_criacao THEN
    RAISE EXCEPTION 'Nível insuficiente para fundar um clã. Necessário nível % (você é nível %).', v_min_nivel_criacao, v_nivel_user USING ERRCODE = 'P0002';
  END IF;

  -- Não pode pertencer a outro clã
  IF EXISTS (SELECT 1 FROM public.cla_membros WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'Você já pertence a um clã. Saia do clã atual antes de criar um novo.' USING ERRCODE = 'P0003';
  END IF;

  -- Cooldown de saída de clã anterior
  SELECT COALESCE((value #>> '{}')::integer, 7) INTO v_cooldown_dias
    FROM public.app_settings
   WHERE key = 'cla_cooldown_saida_dias';

  SELECT saiu_em INTO v_saiu_em
    FROM public.cla_historico_saida
   WHERE user_id = v_user_id;

  IF v_saiu_em IS NOT NULL AND v_cooldown_dias > 0 THEN
    IF now() < v_saiu_em + (v_cooldown_dias * INTERVAL '1 day') THEN
      RAISE EXCEPTION 'Aguarde o período de carência de % dias após sair de um clã.', v_cooldown_dias USING ERRCODE = 'P0004';
    END IF;
  END IF;

  -- Sanitização e validação de nome e tag
  v_nome_limpo := trim(p_nome);
  v_tag_limpa := upper(trim(p_tag));

  IF char_length(v_nome_limpo) < 3 OR char_length(v_nome_limpo) > 30 THEN
    RAISE EXCEPTION 'O nome do clã deve ter entre 3 e 30 caracteres.' USING ERRCODE = '22001';
  END IF;

  IF char_length(v_tag_limpa) < 2 OR char_length(v_tag_limpa) > 4 THEN
    RAISE EXCEPTION 'A tag do clã deve ter entre 2 e 4 caracteres.' USING ERRCODE = '22001';
  END IF;

  IF v_tag_limpa !~ '^[A-Z0-9]+$' THEN
    RAISE EXCEPTION 'A tag do clã deve conter apenas letras e números.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.clas WHERE upper(nome) = upper(v_nome_limpo)) THEN
    RAISE EXCEPTION 'Já existe um clã com este nome.' USING ERRCODE = '23505';
  END IF;

  IF EXISTS (SELECT 1 FROM public.clas WHERE tag = v_tag_limpa) THEN
    RAISE EXCEPTION 'Já existe um clã com esta tag.' USING ERRCODE = '23505';
  END IF;

  v_emblema_valido := CASE
    WHEN p_emblema IN ('padrao', 'chama', 'dragao', 'espada', 'escudo', 'lua', 'sol', 'sakura') THEN p_emblema
    ELSE 'padrao'
  END;

  -- Insere clã
  INSERT INTO public.clas (nome, tag, descricao, emblema, tipo, nivel_minimo, criador_id, ativo)
  VALUES (
    v_nome_limpo,
    v_tag_limpa,
    COALESCE(trim(p_descricao), ''),
    v_emblema_valido,
    CASE WHEN p_tipo = 'convite' THEN 'convite' ELSE 'aberto' END,
    GREATEST(COALESCE(p_nivel_minimo, 1), 1),
    v_user_id,
    true
  )
  RETURNING id INTO v_cla_id;

  -- Insere criador como líder
  INSERT INTO public.cla_membros (cla_id, user_id, papel)
  VALUES (v_cla_id, v_user_id, 'lider');

  RETURN v_cla_id;
END;
$$;

-- Entrar em um clã aberto ou responder a convite
CREATE OR REPLACE FUNCTION public.entrar_cla(p_cla_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_cla public.clas%ROWTYPE;
  v_max_membros integer := 30;
  v_total_membros integer;
  v_nivel_user integer;
  v_cooldown_dias integer := 7;
  v_saiu_em timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  -- Não pode pertencer a outro clã
  IF EXISTS (SELECT 1 FROM public.cla_membros WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'Você já pertence a um clã.' USING ERRCODE = 'P0003';
  END IF;

  -- Cooldown de saída
  SELECT COALESCE((value #>> '{}')::integer, 7) INTO v_cooldown_dias
    FROM public.app_settings
   WHERE key = 'cla_cooldown_saida_dias';

  SELECT saiu_em INTO v_saiu_em
    FROM public.cla_historico_saida
   WHERE user_id = v_user_id;

  IF v_saiu_em IS NOT NULL AND v_cooldown_dias > 0 THEN
    IF now() < v_saiu_em + (v_cooldown_dias * INTERVAL '1 day') THEN
      RAISE EXCEPTION 'Aguarde o período de carência de % dias após sair de um clã.', v_cooldown_dias USING ERRCODE = 'P0004';
    END IF;
  END IF;

  -- Clã deve existir e estar ativo
  SELECT * INTO v_cla FROM public.clas WHERE id = p_cla_id AND ativo = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clã não encontrado ou inativo.' USING ERRCODE = 'P0002';
  END IF;

  -- Limite de membros
  SELECT COALESCE((value #>> '{}')::integer, 30) INTO v_max_membros
    FROM public.app_settings
   WHERE key = 'cla_max_membros';

  SELECT count(*) INTO v_total_membros FROM public.cla_membros WHERE cla_id = p_cla_id;
  IF v_total_membros >= v_max_membros THEN
    RAISE EXCEPTION 'O clã atingiu a capacidade máxima de % membros.', v_max_membros USING ERRCODE = 'P0005';
  END IF;

  -- Nível mínimo do clã
  v_nivel_user := public.calcular_nivel_usuario(v_user_id);
  IF v_nivel_user < v_cla.nivel_minimo THEN
    RAISE EXCEPTION 'Seu nível (%s) é inferior ao nível mínimo do clã (%s).', v_nivel_user, v_cla.nivel_minimo USING ERRCODE = 'P0006';
  END IF;

  -- Tipo por convite exige convite pendente
  IF v_cla.tipo = 'convite' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.cla_convites
       WHERE cla_id = p_cla_id
         AND convidado_user_id = v_user_id
         AND status = 'pendente'
    ) THEN
      RAISE EXCEPTION 'Este clã aceita novos membros apenas por convite.' USING ERRCODE = 'P0007';
    END IF;

    -- Atualiza convite
    UPDATE public.cla_convites
       SET status = 'aceito'
     WHERE cla_id = p_cla_id
       AND convidado_user_id = v_user_id
       AND status = 'pendente';
  END IF;

  -- Insere membro
  INSERT INTO public.cla_membros (cla_id, user_id, papel)
  VALUES (p_cla_id, v_user_id, 'membro');
END;
$$;

-- Sair de clã (com transferência automática de liderança se líder)
CREATE OR REPLACE FUNCTION public.sair_cla()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_cla_id uuid;
  v_papel text;
  v_sucessor_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT cla_id, papel INTO v_cla_id, v_papel
    FROM public.cla_membros
   WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Você não pertence a nenhum clã.' USING ERRCODE = 'P0003';
  END IF;

  -- Se for líder, procura sucessor (vice mais antigo ou membro mais antigo)
  IF v_papel = 'lider' THEN
    SELECT user_id INTO v_sucessor_id
      FROM public.cla_membros
     WHERE cla_id = v_cla_id
       AND user_id <> v_user_id
     ORDER BY CASE WHEN papel = 'vice' THEN 0 ELSE 1 END, entrou_em ASC
     LIMIT 1;

    IF v_sucessor_id IS NOT NULL THEN
      UPDATE public.cla_membros
         SET papel = 'lider'
       WHERE cla_id = v_cla_id
         AND user_id = v_sucessor_id;
    ELSE
      -- Era o único membro: dissolve o clã
      UPDATE public.clas
         SET ativo = false
       WHERE id = v_cla_id;
    END IF;
  END IF;

  -- Remove membro
  DELETE FROM public.cla_membros WHERE user_id = v_user_id;

  -- Registra histórico de saída para cooldown
  INSERT INTO public.cla_historico_saida (user_id, saiu_em)
  VALUES (v_user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET saiu_em = now();
END;
$$;

-- Expulsar membro (Líder pode expulsar vice/membro; Vice pode expulsar membro)
CREATE OR REPLACE FUNCTION public.expulsar_membro_cla(p_cla_id uuid, p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_meu_papel text;
  v_target_papel text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  IF v_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Para sair do clã, utilize a opção Sair do Clã.' USING ERRCODE = 'P0008';
  END IF;

  SELECT papel INTO v_meu_papel
    FROM public.cla_membros
   WHERE cla_id = p_cla_id AND user_id = v_user_id;

  IF v_meu_papel IS NULL OR v_meu_papel NOT IN ('lider', 'vice') THEN
    RAISE EXCEPTION 'Sem permissão para expulsar membros.' USING ERRCODE = '42501';
  END IF;

  SELECT papel INTO v_target_papel
    FROM public.cla_membros
   WHERE cla_id = p_cla_id AND user_id = p_target_user_id;

  IF v_target_papel IS NULL THEN
    RAISE EXCEPTION 'Membro não encontrado no clã.' USING ERRCODE = 'P0002';
  END IF;

  IF v_target_papel = 'lider' THEN
    RAISE EXCEPTION 'Não é permitido expulsar o líder do clã.' USING ERRCODE = '42501';
  END IF;

  IF v_meu_papel = 'vice' AND v_target_papel = 'vice' THEN
    RAISE EXCEPTION 'Um vice-líder não pode expulsar outro vice-líder.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.cla_membros
   WHERE cla_id = p_cla_id AND user_id = p_target_user_id;

  INSERT INTO public.cla_historico_saida (user_id, saiu_em)
  VALUES (p_target_user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET saiu_em = now();
END;
$$;

-- Transferir liderança do clã (Apenas líder)
CREATE OR REPLACE FUNCTION public.transferir_lideranca_cla(p_cla_id uuid, p_novo_lider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cla_membros
     WHERE cla_id = p_cla_id AND user_id = v_user_id AND papel = 'lider'
  ) THEN
    RAISE EXCEPTION 'Apenas o líder atual pode transferir a liderança.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cla_membros
     WHERE cla_id = p_cla_id AND user_id = p_novo_lider_id
  ) THEN
    RAISE EXCEPTION 'O novo líder deve ser membro ativo do clã.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.cla_membros
     SET papel = 'vice'
   WHERE cla_id = p_cla_id AND user_id = v_user_id;

  UPDATE public.cla_membros
     SET papel = 'lider'
   WHERE cla_id = p_cla_id AND user_id = p_novo_lider_id;
END;
$$;

-- Promover ou rebaixar membro (Apenas líder)
CREATE OR REPLACE FUNCTION public.alterar_papel_membro_cla(p_cla_id uuid, p_target_user_id uuid, p_novo_papel text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_novo_papel NOT IN ('vice', 'membro') THEN
    RAISE EXCEPTION 'Papel inválido. Escolha vice ou membro.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cla_membros
     WHERE cla_id = p_cla_id AND user_id = v_user_id AND papel = 'lider'
  ) THEN
    RAISE EXCEPTION 'Apenas o líder pode alterar papéis de membros.' USING ERRCODE = '42501';
  END IF;

  IF p_target_user_id = v_user_id THEN
    RAISE EXCEPTION 'O líder não pode alterar seu próprio papel por esta função.' USING ERRCODE = 'P0008';
  END IF;

  UPDATE public.cla_membros
     SET papel = p_novo_papel
   WHERE cla_id = p_cla_id AND user_id = p_target_user_id;
END;
$$;

-- Convidar membro para clã (Líder ou Vice)
CREATE OR REPLACE FUNCTION public.convidar_membro_cla(p_cla_id uuid, p_convidado_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_papel text;
  v_convite_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT papel INTO v_papel
    FROM public.cla_membros
   WHERE cla_id = p_cla_id AND user_id = v_user_id;

  IF v_papel IS NULL OR v_papel NOT IN ('lider', 'vice') THEN
    RAISE EXCEPTION 'Sem permissão para enviar convites para este clã.' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.cla_membros WHERE user_id = p_convidado_user_id) THEN
    RAISE EXCEPTION 'O usuário já pertence a um clã.' USING ERRCODE = 'P0003';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cla_convites
     WHERE cla_id = p_cla_id AND convidado_user_id = p_convidado_user_id AND status = 'pendente'
  ) THEN
    RAISE EXCEPTION 'Já existe um convite pendente para este usuário.' USING ERRCODE = 'P0009';
  END IF;

  INSERT INTO public.cla_convites (cla_id, convidado_user_id, convidado_por, status)
  VALUES (p_cla_id, p_convidado_user_id, v_user_id, 'pendente')
  RETURNING id INTO v_convite_id;

  RETURN v_convite_id;
END;
$$;

-- Responder a convite (Aceitar ou Recusar)
CREATE OR REPLACE FUNCTION public.responder_convite_cla(p_convite_id uuid, p_aceitar boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_convite public.cla_convites%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_convite
    FROM public.cla_convites
   WHERE id = p_convite_id AND status = 'pendente';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado ou já respondido.' USING ERRCODE = 'P0002';
  END IF;

  IF v_convite.convidado_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Este convite não pertence a você.' USING ERRCODE = '42501';
  END IF;

  IF p_aceitar THEN
    -- Realiza entrada no clã
    PERFORM public.entrar_cla(v_convite.cla_id);
    UPDATE public.cla_convites SET status = 'aceito' WHERE id = p_convite_id;
  ELSE
    UPDATE public.cla_convites SET status = 'recusado' WHERE id = p_convite_id;
  END IF;
END;
$$;

-- Obter clã do usuário logado (com papel, convites pendentes e cooldown)
CREATE OR REPLACE FUNCTION public.obter_meu_cla()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_membro public.cla_membros%ROWTYPE;
  v_cla public.clas%ROWTYPE;
  v_total_membros integer;
  v_xp_semana bigint;
  v_saiu_em timestamptz;
  v_cooldown_dias integer := 7;
  v_dias_restantes integer := 0;
  v_convites jsonb;
  v_inicio_semana timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('logado', false);
  END IF;

  SELECT COALESCE((value #>> '{}')::integer, 7) INTO v_cooldown_dias
    FROM public.app_settings
   WHERE key = 'cla_cooldown_saida_dias';

  SELECT saiu_em INTO v_saiu_em
    FROM public.cla_historico_saida
   WHERE user_id = v_user_id;

  IF v_saiu_em IS NOT NULL AND v_cooldown_dias > 0 THEN
    IF now() < v_saiu_em + (v_cooldown_dias * INTERVAL '1 day') THEN
      v_dias_restantes := GREATEST(1, CEIL(EXTRACT(EPOCH FROM ((v_saiu_em + (v_cooldown_dias * INTERVAL '1 day')) - now())) / 86400));
    END IF;
  END IF;

  -- Convites pendentes recebidos pelo usuário
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'cla_id', c.cla_id,
    'cla_nome', cl.nome,
    'cla_tag', cl.tag,
    'cla_emblema', cl.emblema,
    'convidado_em', c.criado_em,
    'convidado_por_nome', p.nome
  )), '[]'::jsonb) INTO v_convites
    FROM public.cla_convites c
    JOIN public.clas cl ON cl.id = c.cla_id
    JOIN public.profiles p ON p.user_id = c.convidado_por
   WHERE c.convidado_user_id = v_user_id
     AND c.status = 'pendente'
     AND cl.ativo = true;

  SELECT * INTO v_membro FROM public.cla_membros WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'tem_cla', false,
      'cooldown_dias_restantes', v_dias_restantes,
      'convites', v_convites
    );
  END IF;

  SELECT * INTO v_cla FROM public.clas WHERE id = v_membro.cla_id;
  SELECT count(*) INTO v_total_membros FROM public.cla_membros WHERE cla_id = v_membro.cla_id;

  -- XP Semanal do clã
  v_inicio_semana := (date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
  SELECT COALESCE(sum(l.xp_earned), 0)::bigint INTO v_xp_semana
    FROM public.xp_ledger l
    JOIN public.cla_membros m ON m.user_id = l.user_id
   WHERE m.cla_id = v_membro.cla_id
     AND l.earned_at >= v_inicio_semana;

  RETURN jsonb_build_object(
    'tem_cla', true,
    'cla_id', v_cla.id,
    'nome', v_cla.nome,
    'tag', v_cla.tag,
    'descricao', v_cla.descricao,
    'emblema', v_cla.emblema,
    'tipo', v_cla.tipo,
    'nivel_minimo', v_cla.nivel_minimo,
    'ativo', v_cla.ativo,
    'criado_em', v_cla.criado_em,
    'meu_papel', v_membro.papel,
    'total_membros', v_total_membros,
    'xp_semana', v_xp_semana,
    'cooldown_dias_restantes', v_dias_restantes,
    'convites', v_convites
  );
END;
$$;

-- Listar e buscar clãs com paginação
CREATE OR REPLACE FUNCTION public.listar_clas(
  p_busca text DEFAULT '',
  p_limite integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  nome text,
  tag text,
  descricao text,
  emblema text,
  tipo text,
  nivel_minimo integer,
  criado_em timestamptz,
  total_membros bigint,
  xp_semana bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH desde AS (
    SELECT (date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo') AS inicio
  ),
  xp_clas AS (
    SELECT m.cla_id, sum(l.xp_earned)::bigint AS xp_semana
      FROM public.cla_membros m
      JOIN public.xp_ledger l ON l.user_id = m.user_id, desde d
     WHERE l.earned_at >= d.inicio
     GROUP BY m.cla_id
  ),
  membros_clas AS (
    SELECT cla_id, count(*)::bigint AS total_membros
      FROM public.cla_membros
     GROUP BY cla_id
  )
  SELECT
    c.id,
    c.nome,
    c.tag,
    c.descricao,
    c.emblema,
    c.tipo,
    c.nivel_minimo,
    c.criado_em,
    COALESCE(mc.total_membros, 0) AS total_membros,
    COALESCE(xc.xp_semana, 0) AS xp_semana
  FROM public.clas c
  LEFT JOIN membros_clas mc ON mc.cla_id = c.id
  LEFT JOIN xp_clas xc ON xc.cla_id = c.id
  WHERE c.ativo = true
    AND (
      p_busca = ''
      OR c.nome ILIKE '%' || trim(p_busca) || '%'
      OR c.tag ILIKE '%' || trim(p_busca) || '%'
    )
  ORDER BY COALESCE(xc.xp_semana, 0) DESC, COALESCE(mc.total_membros, 0) DESC, c.nome ASC
  LIMIT LEAST(GREATEST(p_limite, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;

-- Obter detalhes do clã pela tag (membros, estatísticas e desafio)
CREATE OR REPLACE FUNCTION public.obter_cla_detalhe(p_tag text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cla public.clas%ROWTYPE;
  v_membros jsonb;
  v_xp_semana bigint;
  v_inicio_semana timestamptz;
BEGIN
  SELECT * INTO v_cla
    FROM public.clas
   WHERE upper(tag) = upper(trim(p_tag))
     AND ativo = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_inicio_semana := (date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');

  -- Lista de membros com detalhes
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', m.user_id,
    'handle', p.handle,
    'nome', p.nome,
    'avatar_url', p.avatar_url,
    'papel', m.papel,
    'entrou_em', m.entrou_em,
    'nivel', public.calcular_nivel_usuario(m.user_id),
    'xp_semana', COALESCE(xp_membro.xp, 0)
  ) ORDER BY CASE WHEN m.papel = 'lider' THEN 0 WHEN m.papel = 'vice' THEN 1 ELSE 2 END, COALESCE(xp_membro.xp, 0) DESC), '[]'::jsonb)
  INTO v_membros
  FROM public.cla_membros m
  JOIN public.profiles p ON p.user_id = m.user_id
  LEFT JOIN (
    SELECT l.user_id, sum(l.xp_earned)::bigint AS xp
      FROM public.xp_ledger l
     WHERE l.earned_at >= v_inicio_semana
     GROUP BY l.user_id
  ) xp_membro ON xp_membro.user_id = m.user_id
  WHERE m.cla_id = v_cla.id;

  -- XP Semanal total do clã
  SELECT COALESCE(sum(l.xp_earned), 0)::bigint INTO v_xp_semana
    FROM public.xp_ledger l
    JOIN public.cla_membros m ON m.user_id = l.user_id
   WHERE m.cla_id = v_cla.id
     AND l.earned_at >= v_inicio_semana;

  RETURN jsonb_build_object(
    'id', v_cla.id,
    'nome', v_cla.nome,
    'tag', v_cla.tag,
    'descricao', v_cla.descricao,
    'emblema', v_cla.emblema,
    'tipo', v_cla.tipo,
    'nivel_minimo', v_cla.nivel_minimo,
    'criador_id', v_cla.criador_id,
    'criado_em', v_cla.criado_em,
    'total_membros', jsonb_array_length(v_membros),
    'xp_semana', v_xp_semana,
    'membros', v_membros
  );
END;
$$;

-- Denunciar clã
CREATE OR REPLACE FUNCTION public.denunciar_cla(p_cla_id uuid, p_motivo text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_denuncia_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  IF trim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Motivo da denúncia é obrigatório.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.cla_denuncias (cla_id, denunciante_user_id, motivo, status)
  VALUES (p_cla_id, v_user_id, trim(p_motivo), 'pendente')
  RETURNING id INTO v_denuncia_id;

  RETURN v_denuncia_id;
END;
$$;

-- Moderação Admin: dissolver clã
CREATE OR REPLACE FUNCTION public.admin_dissolver_cla(p_cla_id uuid, p_motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Desativa o clã e remove membros
  UPDATE public.clas
     SET ativo = false,
         descricao = descricao || ' [DISSOLVIDO PELA MODERAÇÃO: ' || COALESCE(p_motivo, '') || ']'
   WHERE id = p_cla_id;

  DELETE FROM public.cla_membros WHERE cla_id = p_cla_id;

  UPDATE public.cla_denuncias
     SET status = 'resolvido'
   WHERE cla_id = p_cla_id AND status = 'pendente';
END;
$$;

-- Moderação Admin: renomear clã / tag inadequada
CREATE OR REPLACE FUNCTION public.admin_renomear_cla(p_cla_id uuid, p_novo_nome text, p_nova_tag text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.clas
     SET nome = trim(p_novo_nome),
         tag = upper(trim(p_nova_tag)),
         atualizado_em = now()
   WHERE id = p_cla_id;

  UPDATE public.cla_denuncias
     SET status = 'resolvido'
   WHERE cla_id = p_cla_id AND status = 'pendente';
END;
$$;

-- Permissões de execução das funções
REVOKE EXECUTE ON FUNCTION public.criar_cla FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.entrar_cla FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sair_cla FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expulsar_membro_cla FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transferir_lideranca_cla FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.alterar_papel_membro_cla FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.convidar_membro_cla FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.responder_convite_cla FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.obter_meu_cla FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.listar_clas FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.obter_cla_detalhe FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.denunciar_cla FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.criar_cla TO authenticated;
GRANT EXECUTE ON FUNCTION public.entrar_cla TO authenticated;
GRANT EXECUTE ON FUNCTION public.sair_cla TO authenticated;
GRANT EXECUTE ON FUNCTION public.expulsar_membro_cla TO authenticated;
GRANT EXECUTE ON FUNCTION public.transferir_lideranca_cla TO authenticated;
GRANT EXECUTE ON FUNCTION public.alterar_papel_membro_cla TO authenticated;
GRANT EXECUTE ON FUNCTION public.convidar_membro_cla TO authenticated;
GRANT EXECUTE ON FUNCTION public.responder_convite_cla TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_meu_cla TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_clas TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_cla_detalhe TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.denunciar_cla TO authenticated;
