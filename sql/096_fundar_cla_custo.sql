-- =============================================================================
-- 096 — Fundar clã exige nível 15 e custa 300 AniCoins
-- =============================================================================
--
-- O que muda:
--   1. app_settings: cla_nivel_minimo_criacao passa de 3 para 15, e entra cla_custo_criacao
--      (300). Os dois continuam ajustáveis pelo banco, sem deploy.
--   2. criar_cla() confere o saldo antes de criar e debita o custo na mesma transação que
--      cria o clã. Se o débito falhar, o clã não é criado; se a criação falhar, nada é
--      debitado.
--
-- Por que AniCoins, e não Ouro: os AniCoins vêm de assistir e da comunidade, que é onde o
-- clã vive; o Ouro é do RPG, e quem não joga o RPG ficaria sem como fundar. Pagar com uma
-- moeda que pode vir a ser vendida não é vantagem comprada: o clã não dá atributo, e entrar
-- num clã continua grátis.
--
-- app_settings.value é TEXT no banco (snapshot), e não jsonb: o (value #>> '{}') do sql/054
-- não existe para texto e derrubava criar_cla sempre (#263). A leitura passa por
-- config_inteira(), que aceita '15' e '"15"' e cai no padrão com chave ausente ou inválida.
-- (Antes, com a chave ausente, o SELECT ... INTO deixava o valor em NULL, e "nível < NULL"
-- nunca recusava.)
--
-- A assinatura de criar_cla não muda: o Go (HandleCriarCla) continua igual.
-- Pode rodar mais de uma vez.

-- =============================================================================
-- 1. Leitura de número em app_settings
-- =============================================================================

CREATE OR REPLACE FUNCTION public.config_inteira(p_chave TEXT, p_padrao INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT CASE WHEN btrim(value, ' "') ~ '^-?[0-9]{1,9}$' THEN btrim(value, ' "')::integer END
       FROM public.app_settings WHERE key = p_chave),
    p_padrao
  );
$$;

REVOKE ALL ON FUNCTION public.config_inteira(TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.config_inteira(TEXT, INTEGER) TO authenticated, service_role;

-- =============================================================================
-- 2. Parâmetros
-- =============================================================================

INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('cla_nivel_minimo_criacao', '15', now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('cla_custo_criacao', '300', now())
ON CONFLICT (key) DO NOTHING;

-- Leitura pública dos dois números, para a tela mostrar o requisito antes do formulário.
CREATE OR REPLACE FUNCTION public.regras_fundar_cla()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'nivel_minimo', public.config_inteira('cla_nivel_minimo_criacao', 15),
    'custo', public.config_inteira('cla_custo_criacao', 300)
  );
$$;

REVOKE ALL ON FUNCTION public.regras_fundar_cla() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regras_fundar_cla() TO anon, authenticated, service_role;

-- =============================================================================
-- 3. criar_cla com nível e custo
-- =============================================================================

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
  v_regras jsonb := public.regras_fundar_cla();
  v_min_nivel_criacao integer;
  v_custo integer;
  v_saldo integer;
  v_cooldown_dias integer;
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

  SELECT publico INTO v_publico
    FROM public.profiles
   WHERE user_id = v_user_id;

  IF v_publico IS NOT TRUE THEN
    RAISE EXCEPTION 'Seu perfil precisa ser público para fundar um clã.' USING ERRCODE = 'P0001';
  END IF;

  v_min_nivel_criacao := (v_regras->>'nivel_minimo')::integer;
  v_custo := GREATEST(0, (v_regras->>'custo')::integer);

  v_nivel_user := public.calcular_nivel_usuario(v_user_id);
  IF v_nivel_user < v_min_nivel_criacao THEN
    RAISE EXCEPTION 'Fundar um clã pede nível %. Você está no nível %.', v_min_nivel_criacao, v_nivel_user USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (SELECT 1 FROM public.cla_membros WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'Você já pertence a um clã. Saia do clã atual antes de criar um novo.' USING ERRCODE = 'P0003';
  END IF;

  v_cooldown_dias := public.config_inteira('cla_cooldown_saida_dias', 7);

  SELECT saiu_em INTO v_saiu_em
    FROM public.cla_historico_saida
   WHERE user_id = v_user_id;

  IF v_saiu_em IS NOT NULL AND v_cooldown_dias > 0 THEN
    IF now() < v_saiu_em + (v_cooldown_dias * INTERVAL '1 day') THEN
      RAISE EXCEPTION 'Aguarde o período de carência de % dias após sair de um clã.', v_cooldown_dias USING ERRCODE = 'P0004';
    END IF;
  END IF;

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

  -- Saldo conferido antes de criar, para a mensagem dizer quanto falta. A trava é a mesma
  -- de debitar_cristais: dois pedidos ao mesmo tempo não gastam o mesmo saldo.
  IF v_custo > 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));
    SELECT COALESCE(SUM(quantidade), 0)::integer INTO v_saldo
      FROM public.crystal_ledger
     WHERE user_id = v_user_id;
    IF v_saldo < v_custo THEN
      RAISE EXCEPTION 'Fundar um clã custa % AniCoins. Você tem %.', v_custo, v_saldo USING ERRCODE = 'P0005';
    END IF;
  END IF;

  v_emblema_valido := CASE
    WHEN p_emblema IN ('padrao', 'chama', 'dragao', 'espada', 'escudo', 'lua', 'sol', 'sakura') THEN p_emblema
    ELSE 'padrao'
  END;

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

  INSERT INTO public.cla_membros (cla_id, user_id, papel)
  VALUES (v_cla_id, v_user_id, 'lider');

  -- O débito leva o id do clã na referência: o extrato mostra qual fundação custou o quê.
  IF v_custo > 0 THEN
    PERFORM public.debitar_cristais(v_user_id, v_custo, 'fundar_cla', 'cla:' || v_cla_id::text);
  END IF;

  RETURN v_cla_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_cla FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_cla TO authenticated;
