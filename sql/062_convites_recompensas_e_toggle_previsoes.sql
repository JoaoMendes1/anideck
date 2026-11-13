-- sql/062_convites_recompensas_e_toggle_previsoes.sql
-- Fase 17.4 / 17.5: Toggle de Previsões no Admin e Convites de Membros com Recompensas (#187, #191)

-- 1. Regras de Comunidade: garantir suporte ao toggle 'previsoes_ativas' (padrão FALSE / desativado)
DO $$
DECLARE
  v_val jsonb;
BEGIN
  SELECT value::jsonb INTO v_val FROM public.app_settings WHERE key = 'comunidade_regras';
  IF v_val IS NOT NULL THEN
    IF NOT (v_val ? 'previsoes_ativas') THEN
      v_val := v_val || jsonb_build_object('previsoes_ativas', false);
      UPDATE public.app_settings SET value = v_val::text WHERE key = 'comunidade_regras';
    END IF;
  ELSE
    INSERT INTO public.app_settings (key, value)
    VALUES ('comunidade_regras', '{"mp_max":50,"mp_regen_dia":20,"mp_custo_comentario":5,"hp_janela_dias":14,"hp_dias_para_cheio":10,"hp_piso":20,"descanso_max_dias":14,"previsoes_ativas":false}');
  END IF;
END $$;

-- 2. Configurações padrão de recompensas por convite em app_settings
INSERT INTO public.app_settings (key, value)
VALUES (
  'regras_convites',
  '{
    "anicoins_anfitriao": 50,
    "xp_anfitriao": 100,
    "anicoins_convidado": 30,
    "anicoins_convidado_admin": 100,
    "titulo_convidado_admin": "Afilhado do Fundador"
  }'
)
ON CONFLICT (key) DO NOTHING;

-- 3. Tabela de códigos de convite dos membros
CREATE TABLE IF NOT EXISTS public.convites_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anfitriao_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo text NOT NULL UNIQUE,
  especial_admin boolean NOT NULL DEFAULT false,
  usos_total integer NOT NULL DEFAULT 0,
  anicoins_ganhos integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convites_membros_codigo ON public.convites_membros(codigo);
CREATE INDEX IF NOT EXISTS idx_convites_membros_anfitriao ON public.convites_membros(anfitriao_user_id);

-- 4. Tabela de registros de resgates de convites
CREATE TABLE IF NOT EXISTS public.convites_resgatados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  convite_id uuid NOT NULL REFERENCES public.convites_membros(id) ON DELETE CASCADE,
  anfitriao_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  convidado_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  recompensa_anfitriao_anicoins integer NOT NULL DEFAULT 0,
  recompensa_anfitriao_xp integer NOT NULL DEFAULT 0,
  recompensa_convidado_anicoins integer NOT NULL DEFAULT 0,
  titulo_concedido text,
  especial_admin boolean NOT NULL DEFAULT false,
  resgatado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convites_resgatados_anfitriao ON public.convites_resgatados(anfitriao_user_id);

-- RLS
ALTER TABLE public.convites_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convites_resgatados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de convites para validacao" ON public.convites_membros;
CREATE POLICY "Leitura publica de convites para validacao"
  ON public.convites_membros FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Membros visualizam seus proprios convites resgatados" ON public.convites_resgatados;
CREATE POLICY "Membros visualizam seus proprios convites resgatados"
  ON public.convites_resgatados FOR SELECT
  TO authenticated
  USING (anfitriao_user_id = auth.uid() OR convidado_user_id = auth.uid());

-- 5. RPC para obter ou gerar o próprio código de convite
CREATE OR REPLACE FUNCTION public.obter_meu_convite()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_convite public.convites_membros%ROWTYPE;
  v_handle text;
  v_is_admin boolean := false;
  v_codigo text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  -- Verifica se o usuário é admin
  SELECT (role = 'admin' OR is_admin()) INTO v_is_admin
    FROM public.profiles
   WHERE user_id = v_user_id;

  SELECT * INTO v_convite
    FROM public.convites_membros
   WHERE anfitriao_user_id = v_user_id;

  IF v_convite.id IS NULL THEN
    -- Busca handle do usuário para gerar o código amigável
    SELECT handle INTO v_handle
      FROM public.profiles
     WHERE user_id = v_user_id;

    IF v_handle IS NOT NULL AND length(trim(v_handle)) > 0 THEN
      v_codigo := lower(trim(v_handle));
    ELSE
      v_codigo := substring(replace(v_user_id::text, '-', '') from 1 for 8);
    END IF;

    -- Se já existir colisão de código, adiciona sufixo
    IF EXISTS (SELECT 1 FROM public.convites_membros WHERE codigo = v_codigo) THEN
      v_codigo := v_codigo || '-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 4);
    END IF;

    INSERT INTO public.convites_membros (
      anfitriao_user_id,
      codigo,
      especial_admin
    ) VALUES (
      v_user_id,
      v_codigo,
      COALESCE(v_is_admin, false)
    )
    RETURNING * INTO v_convite;
  ELSE
    -- Atualiza status especial_admin se mudou de perfil
    IF v_convite.especial_admin <> COALESCE(v_is_admin, false) THEN
      UPDATE public.convites_membros
         SET especial_admin = COALESCE(v_is_admin, false)
       WHERE id = v_convite.id;
      v_convite.especial_admin := COALESCE(v_is_admin, false);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'codigo', v_convite.codigo,
    'especial_admin', v_convite.especial_admin,
    'usos_total', v_convite.usos_total,
    'anicoins_ganhos', v_convite.anicoins_ganhos,
    'criado_em', v_convite.criado_em
  );
END;
$$;

-- 6. RPC para resgatar um código de convite recebido
CREATE OR REPLACE FUNCTION public.resgatar_codigo_convite(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_convidado_id uuid := auth.uid();
  v_convite public.convites_membros%ROWTYPE;
  v_regras_raw text;
  v_regras jsonb;
  v_anicoins_anfitriao integer := 50;
  v_xp_anfitriao integer := 100;
  v_anicoins_convidado integer := 30;
  v_anicoins_convidado_admin integer := 100;
  v_titulo_admin text := 'Afilhado do Fundador';
  v_moedas_para_convidado integer;
  v_titulo_concedido text := NULL;
  v_clean_code text;
BEGIN
  IF v_convidado_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  v_clean_code := lower(trim(p_codigo));
  IF v_clean_code IS NULL OR length(v_clean_code) = 0 THEN
    RAISE EXCEPTION 'Código de convite inválido.' USING ERRCODE = 'P0001';
  END IF;

  -- Lock para evitar resgates concorrentes
  PERFORM pg_advisory_xact_lock(hashtext(v_convidado_id::text));

  -- Já usou algum convite antes?
  IF EXISTS (SELECT 1 FROM public.convites_resgatados WHERE convidado_user_id = v_convidado_id) THEN
    RAISE EXCEPTION 'Você já resgatou um convite nesta conta.' USING ERRCODE = 'P0002';
  END IF;

  -- Busca o convite
  SELECT * INTO v_convite
    FROM public.convites_membros
   WHERE codigo = v_clean_code;

  IF v_convite.id IS NULL THEN
    RAISE EXCEPTION 'Código de convite não encontrado.' USING ERRCODE = 'P0003';
  END IF;

  -- Auto-convite proibido
  IF v_convite.anfitriao_user_id = v_convidado_id THEN
    RAISE EXCEPTION 'Você não pode usar o seu próprio código de convite.' USING ERRCODE = 'P0004';
  END IF;

  -- Lê configurações de app_settings
  SELECT value INTO v_regras_raw FROM public.app_settings WHERE key = 'regras_convites';
  IF v_regras_raw IS NOT NULL THEN
    BEGIN
      v_regras := v_regras_raw::jsonb;
      IF v_regras ? 'anicoins_anfitriao' THEN v_anicoins_anfitriao := (v_regras->>'anicoins_anfitriao')::int; END IF;
      IF v_regras ? 'xp_anfitriao' THEN v_xp_anfitriao := (v_regras->>'xp_anfitriao')::int; END IF;
      IF v_regras ? 'anicoins_convidado' THEN v_anicoins_convidado := (v_regras->>'anicoins_convidado')::int; END IF;
      IF v_regras ? 'anicoins_convidado_admin' THEN v_anicoins_convidado_admin := (v_regras->>'anicoins_convidado_admin')::int; END IF;
      IF v_regras ? 'titulo_convidado_admin' THEN v_titulo_admin := v_regras->>'titulo_convidado_admin'; END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Mantém valores padrão
    END;
  END IF;

  -- Determina recompensas
  IF v_convite.especial_admin THEN
    v_moedas_para_convidado := v_anicoins_convidado_admin;
    v_titulo_concedido := v_titulo_admin;
  ELSE
    v_moedas_para_convidado := v_anicoins_convidado;
    v_titulo_concedido := NULL;
  END IF;

  -- 1. Paga o Convidado (AniCoins no crystal_ledger)
  IF v_moedas_para_convidado > 0 THEN
    INSERT INTO public.crystal_ledger (
      user_id,
      quantidade,
      motivo,
      referencia,
      saldo_apos
    ) VALUES (
      v_convidado_id,
      v_moedas_para_convidado,
      'bonus_convite_entrada',
      'convite:entrada:' || v_convidado_id::text,
      COALESCE((SELECT saldo_apos FROM public.crystal_ledger WHERE user_id = v_convidado_id ORDER BY id DESC LIMIT 1), 0) + v_moedas_para_convidado
    )
    ON CONFLICT (user_id, motivo, referencia) DO NOTHING;
  END IF;

  -- 2. Concede título especial se for convite de admin
  IF v_titulo_concedido IS NOT NULL THEN
    UPDATE public.profiles
       SET titulos_desbloqueados = CASE
             WHEN titulos_desbloqueados ? v_titulo_concedido THEN titulos_desbloqueados
             ELSE titulos_desbloqueados || jsonb_build_array(v_titulo_concedido)
           END,
           titulo_ativo = CASE
             WHEN titulo_ativo IS NULL OR titulo_ativo = 'Aventureiro Iniciante' THEN v_titulo_concedido
             ELSE titulo_ativo
           END
     WHERE user_id = v_convidado_id;
  END IF;

  -- 3. Paga o Anfitrião (AniCoins)
  IF v_anicoins_anfitriao > 0 THEN
    INSERT INTO public.crystal_ledger (
      user_id,
      quantidade,
      motivo,
      referencia,
      saldo_apos
    ) VALUES (
      v_convite.anfitriao_user_id,
      v_anicoins_anfitriao,
      'recompensa_convidar_amigo',
      'convite:anfitriao:' || v_convite.id::text || ':' || v_convidado_id::text,
      COALESCE((SELECT saldo_apos FROM public.crystal_ledger WHERE user_id = v_convite.anfitriao_user_id ORDER BY id DESC LIMIT 1), 0) + v_anicoins_anfitriao
    )
    ON CONFLICT (user_id, motivo, referencia) DO NOTHING;
  END IF;

  -- 4. Paga o Anfitrião (XP no xp_ledger)
  IF v_xp_anfitriao > 0 THEN
    INSERT INTO public.xp_ledger (
      user_id,
      xp_earned,
      reason,
      earned_at
    ) VALUES (
      v_convite.anfitriao_user_id,
      v_xp_anfitriao,
      'convite_amigo',
      now()
    );
  END IF;

  -- 5. Registra o resgate
  INSERT INTO public.convites_resgatados (
    convite_id,
    anfitriao_user_id,
    convidado_user_id,
    recompensa_anfitriao_anicoins,
    recompensa_anfitriao_xp,
    recompensa_convidado_anicoins,
    titulo_concedido,
    especial_admin
  ) VALUES (
    v_convite.id,
    v_convite.anfitriao_user_id,
    v_convidado_id,
    v_anicoins_anfitriao,
    v_xp_anfitriao,
    v_moedas_para_convidado,
    v_titulo_concedido,
    v_convite.especial_admin
  );

  -- 6. Atualiza contador do convite
  UPDATE public.convites_membros
     SET usos_total = usos_total + 1,
         anicoins_ganhos = anicoins_ganhos + v_anicoins_anfitriao
   WHERE id = v_convite.id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'especial_admin', v_convite.especial_admin,
    'anicoins_ganhos', v_moedas_para_convidado,
    'titulo_concedido', v_titulo_concedido
  );
END;
$$;

-- 7. Permissões de execução
REVOKE EXECUTE ON FUNCTION public.obter_meu_convite FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_meu_convite TO authenticated;

REVOKE EXECUTE ON FUNCTION public.resgatar_codigo_convite FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resgatar_codigo_convite TO authenticated;
