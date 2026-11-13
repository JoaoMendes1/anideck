-- =============================================================================
-- 061_titulos_previsoes_classes.sql
-- Fase 17.4: Títulos, Previsões apostando Mana e Classes (#186, #187, #189)
--
-- 1. Classes de RPG no perfil: Bardo, Ranger e Paladino com bônus temáticos
-- 2. Títulos desbloqueáveis e selecionáveis no perfil e comentários
-- 3. Sistema de Previsões com apostas de Mana e premiação em AniCoins
-- =============================================================================

-- 1. Campos de classe e títulos em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS classe TEXT NOT NULL DEFAULT 'bardo' CHECK (classe IN ('bardo', 'ranger', 'paladino')),
  ADD COLUMN IF NOT EXISTS titulo_ativo TEXT DEFAULT 'Aventureiro Iniciante',
  ADD COLUMN IF NOT EXISTS titulos_desbloqueados TEXT[] DEFAULT ARRAY['Aventureiro Iniciante'];

-- Permite atualizar classe e titulo_ativo
GRANT UPDATE (classe, titulo_ativo, updated_at) ON public.profiles TO authenticated;

-- =============================================================================
-- 2. TABELA DE PREVISÕES (Enquetes de comunidade apostando Mana)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.previsoes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mal_id                  INTEGER,
  titulo_anime            TEXT,
  pergunta                TEXT NOT NULL CHECK (char_length(trim(pergunta)) >= 5),
  descricao               TEXT DEFAULT '',
  opcoes                  JSONB NOT NULL, -- [{"id": 1, "texto": "..."}, {"id": 2, "texto": "..."}]
  limite_apostas          TIMESTAMPTZ NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'encerrada', 'resolvida', 'cancelada')),
  opcao_vencedora_id      INTEGER,
  total_mana_apostada     INTEGER NOT NULL DEFAULT 0,
  total_apostadores       INTEGER NOT NULL DEFAULT 0,
  recompensa_anicoins     INTEGER NOT NULL DEFAULT 30,
  criado_por              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvido_em            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_previsoes_status ON public.previsoes (status, limite_apostas);
CREATE INDEX IF NOT EXISTS idx_previsoes_anime ON public.previsoes (mal_id);

ALTER TABLE public.previsoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS previsoes_leitura ON public.previsoes;
CREATE POLICY previsoes_leitura ON public.previsoes
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS previsoes_admin ON public.previsoes;
CREATE POLICY previsoes_admin ON public.previsoes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 3. TABELA DE APOSTAS DE MANA
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.previsao_apostas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  previsao_id    UUID NOT NULL REFERENCES public.previsoes(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opcao_id       INTEGER NOT NULL,
  mana_apostada  INTEGER NOT NULL CHECK (mana_apostada BETWEEN 5 AND 25),
  ganhou         BOOLEAN,
  pago           BOOLEAN NOT NULL DEFAULT false,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_previsao_usuario UNIQUE (previsao_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_previsao_apostas_previsao ON public.previsao_apostas (previsao_id);
CREATE INDEX IF NOT EXISTS idx_previsao_apostas_user ON public.previsao_apostas (user_id);

ALTER TABLE public.previsao_apostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS previsao_apostas_leitura ON public.previsao_apostas;
CREATE POLICY previsao_apostas_leitura ON public.previsao_apostas
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- =============================================================================
-- 4. RPCs: ESCOLHER CLASSE E EQUIPAR TÍTULO
-- =============================================================================

CREATE OR REPLACE FUNCTION public.escolher_classe(p_classe TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_classe_limpa TEXT := lower(trim(p_classe));
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF v_classe_limpa NOT IN ('bardo', 'ranger', 'paladino') THEN
    RETURN jsonb_build_object('erro', 'Classe inválida. Escolha entre bardo, ranger ou paladino.');
  END IF;

  UPDATE public.profiles
     SET classe = v_classe_limpa,
         updated_at = now()
   WHERE user_id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'classe', v_classe_limpa);
END;
$$;

CREATE OR REPLACE FUNCTION public.equipar_titulo(p_titulo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_titulos TEXT[];
  v_titulo_limpo TEXT := trim(p_titulo);
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  SELECT titulos_desbloqueados INTO v_titulos
    FROM public.profiles
   WHERE user_id = v_user_id;

  IF v_titulos IS NULL OR NOT (v_titulo_limpo = ANY(v_titulos)) THEN
    RETURN jsonb_build_object('erro', 'Você ainda não desbloqueou este título.');
  END IF;

  UPDATE public.profiles
     SET titulo_ativo = v_titulo_limpo,
         updated_at = now()
   WHERE user_id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'titulo_ativo', v_titulo_limpo);
END;
$$;

-- =============================================================================
-- 5. RPC: APOSTAR MANA EM UMA PREVISÃO
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apostar_previsao(
  p_previsao_id UUID,
  p_opcao_id INTEGER,
  p_mana INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_previsao RECORD;
  v_mana_atual NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF p_mana < 5 OR p_mana > 25 THEN
    RETURN jsonb_build_object('erro', 'A aposta de Mana deve ser entre 5 e 25 MP.');
  END IF;

  -- Busca e valida a previsão
  SELECT * INTO v_previsao
    FROM public.previsoes
   WHERE id = p_previsao_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Previsão não encontrada');
  END IF;

  IF v_previsao.status != 'aberta' OR now() > v_previsao.limite_apostas THEN
    RETURN jsonb_build_object('erro', 'As apostas para esta previsão já foram encerradas.');
  END IF;

  -- Confere se o usuário já apostou
  IF EXISTS (SELECT 1 FROM public.previsao_apostas WHERE previsao_id = p_previsao_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('erro', 'Você já registrou sua previsão nesta enquete.');
  END IF;

  -- Confere saldo de Mana do perfil
  SELECT mp_atual INTO v_mana_atual
    FROM public.profiles
   WHERE user_id = v_user_id;

  IF v_mana_atual IS NULL OR v_mana_atual < p_mana THEN
    RETURN jsonb_build_object('erro', 'Mana insuficiente. Aguarde a recarga diária para apostar.');
  END IF;

  -- Debita a Mana
  UPDATE public.profiles
     SET mp_atual = GREATEST(0, mp_atual - p_mana),
         mp_em = now(),
         updated_at = now()
   WHERE user_id = v_user_id;

  -- Registra a aposta
  INSERT INTO public.previsao_apostas (
    previsao_id,
    user_id,
    opcao_id,
    mana_apostada
  ) VALUES (
    p_previsao_id,
    v_user_id,
    p_opcao_id,
    p_mana
  );

  -- Atualiza o totalizador da previsão
  UPDATE public.previsoes
     SET total_mana_apostada = total_mana_apostada + p_mana,
         total_apostadores = total_apostadores + 1
   WHERE id = p_previsao_id;

  RETURN jsonb_build_object(
    'ok', true,
    'previsao_id', p_previsao_id,
    'mana_apostada', p_mana,
    'mana_restante', (v_mana_atual - p_mana)
  );
END;
$$;

-- =============================================================================
-- 6. RPC: RESOLVER PREVISÃO E PAGAR RECOMPENSAS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resolver_previsao(
  p_previsao_id UUID,
  p_opcao_vencedora INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previsao RECORD;
  v_aposta RECORD;
  v_vencedores INTEGER := 0;
  v_ref TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('erro', 'Apenas administradores podem resolver previsões.');
  END IF;

  SELECT * INTO v_previsao
    FROM public.previsoes
   WHERE id = p_previsao_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Previsão não encontrada');
  END IF;

  IF v_previsao.status = 'resolvida' THEN
    RETURN jsonb_build_object('erro', 'Esta previsão já foi resolvida.');
  END IF;

  -- Atualiza o status da previsão
  UPDATE public.previsoes
     SET status = 'resolvida',
         opcao_vencedora_id = p_opcao_vencedora,
         resolvido_em = now()
   WHERE id = p_previsao_id;

  -- Paga os vencedores
  FOR v_aposta IN
    SELECT *
      FROM public.previsao_apostas
     WHERE previsao_id = p_previsao_id
  LOOP
    IF v_aposta.opcao_id = p_opcao_vencedora THEN
      -- Marcou vencedor
      UPDATE public.previsao_apostas
         SET ganhou = true,
             pago = true
       WHERE id = v_aposta.id;

      -- Devolve o dobro da Mana apostada
      UPDATE public.profiles
         SET mp_atual = LEAST(100, mp_atual + (v_aposta.mana_apostada * 2)),
             updated_at = now()
       WHERE user_id = v_aposta.user_id;

      -- Credita AniCoins no crystal_ledger
      IF v_previsao.recompensa_anicoins > 0 THEN
        v_ref := 'previsao:' || p_previsao_id::text || ':' || v_aposta.user_id::text;
        INSERT INTO public.crystal_ledger (
          user_id,
          quantidade,
          motivo,
          referencia
        ) VALUES (
          v_aposta.user_id,
          v_previsao.recompensa_anicoins,
          'previsao',
          v_ref
        )
        ON CONFLICT (user_id, motivo, referencia) DO NOTHING;
      END IF;

      -- Desbloqueia título "Oráculo da Temporada" se acertou
      UPDATE public.profiles
         SET titulos_desbloqueados = array_append(titulos_desbloqueados, 'Oráculo da Temporada')
       WHERE user_id = v_aposta.user_id
         AND NOT ('Oráculo da Temporada' = ANY(titulos_desbloqueados));

      v_vencedores := v_vencedores + 1;
    ELSE
      -- Perdeu
      UPDATE public.previsao_apostas
         SET ganhou = false,
             pago = true
       WHERE id = v_aposta.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'previsao_id', p_previsao_id,
    'vencedores', v_vencedores,
    'opcao_vencedora', p_opcao_vencedora
  );
END;
$$;

-- =============================================================================
-- 7. RPC: LISTAR PREVISÕES ATIVAS COM STATUS DO USUÁRIO
-- =============================================================================

CREATE OR REPLACE FUNCTION public.listar_previsoes_ativas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_resultado JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_resultado
    FROM (
      SELECT
        p.id,
        p.mal_id,
        p.titulo_anime,
        p.pergunta,
        p.descricao,
        p.opcoes,
        p.limite_apostas,
        p.status,
        p.opcao_vencedora_id,
        p.total_mana_apostada,
        p.total_apostadores,
        p.recompensa_anicoins,
        p.criado_em,
        pa.opcao_id AS minha_opcao,
        pa.mana_apostada AS minha_mana_apostada,
        pa.ganhou AS meu_resultado
      FROM public.previsoes p
      LEFT JOIN public.previsao_apostas pa
        ON pa.previsao_id = p.id AND pa.user_id = v_user_id
     WHERE p.status IN ('aberta', 'encerrada', 'resolvida')
     ORDER BY
       CASE WHEN p.status = 'aberta' THEN 0 ELSE 1 END,
       p.limite_apostas ASC
     LIMIT 20
    ) sub;

  RETURN v_resultado;
END;
$$;

-- =============================================================================
-- 8. PERMISSÕES DE EXECUÇÃO
-- =============================================================================

REVOKE ALL ON FUNCTION public.escolher_classe(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escolher_classe(TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.equipar_titulo(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.equipar_titulo(TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.apostar_previsao(UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apostar_previsao(UUID, INTEGER, INTEGER) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.resolver_previsao(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolver_previsao(UUID, INTEGER) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.listar_previsoes_ativas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_previsoes_ativas() TO anon, authenticated, service_role;

-- =============================================================================
-- 9. SEED INICIAL: PREVISÕES DA TEMPORADA
-- =============================================================================

INSERT INTO public.previsoes (
  id,
  mal_id,
  titulo_anime,
  pergunta,
  descricao,
  opcoes,
  limite_apostas,
  status,
  recompensa_anicoins
) VALUES (
  '11111111-2222-3333-4444-555555555551',
  53263,
  'Hell Mode',
  'Allen vai desbloquear uma invocação de Classe A até o final da temporada?',
  'Aposte de 5 a 25 MP no destino de Allen na jornada do modo extremo.',
  '[{"id": 1, "texto": "Sim, invocação de Classe A ou superior"}, {"id": 2, "texto": "Não, vai continuar com classes inferiores"}]'::jsonb,
  '2026-12-15 23:59:59+00',
  'aberta',
  35
), (
  '11111111-2222-3333-4444-555555555552',
  NULL,
  'Comunidade AniDeck',
  'A comunidade vai conseguir derrotar Tiamat antes do final de 2026?',
  'Previsão coletiva da raid: se a barra de vida chegar a zero antes de 31/12.',
  '[{"id": 1, "texto": "Sim, vitória total da comunidade!"}, {"id": 2, "texto": "Não, o boss escapará com vida"}]'::jsonb,
  '2026-12-20 23:59:59+00',
  'aberta',
  50
)
ON CONFLICT (id) DO NOTHING;
