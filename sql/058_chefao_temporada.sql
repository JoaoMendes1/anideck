-- =============================================================================
-- 058_chefao_temporada.sql
-- Fase 17.3: Chefão da Temporada (#185)
--
-- Tabela de chefões comunitários por temporada com HP coletivo abatido por
-- episódios do xp_ledger, consulta agregada no SQL (Armadilha 28), ranking
-- de dano e distribuição idempotente de recompensas em AniCoins.
-- =============================================================================

-- 1. Tabela de chefões por temporada
CREATE TABLE IF NOT EXISTS public.chefoes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  temporada               TEXT NOT NULL,
  nome                    TEXT NOT NULL,
  titulo                  TEXT,
  descricao               TEXT,
  arte_url                TEXT,
  hp_total                INTEGER NOT NULL CHECK (hp_total > 0),
  inicio                  TIMESTAMPTZ NOT NULL,
  fim                     TIMESTAMPTZ NOT NULL,
  dano_minimo_recompensa  INTEGER NOT NULL DEFAULT 50 CHECK (dano_minimo_recompensa >= 0),
  recompensa_anicoins     INTEGER NOT NULL DEFAULT 100 CHECK (recompensa_anicoins >= 0),
  titulo_recompensa       TEXT DEFAULT 'Carrasco do Chefão',
  derrotado               BOOLEAN NOT NULL DEFAULT false,
  derrotado_em            TIMESTAMPTZ,
  recompensas_pagas       BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_chefoes_temporada UNIQUE (temporada),
  CONSTRAINT chk_chefao_janela CHECK (fim > inicio)
);

CREATE INDEX IF NOT EXISTS chefoes_janela_idx
  ON public.chefoes (inicio, fim);

-- 2. Habilita RLS
ALTER TABLE public.chefoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chefoes_leitura ON public.chefoes;
CREATE POLICY chefoes_leitura ON public.chefoes
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS chefoes_escrita_admin ON public.chefoes;
CREATE POLICY chefoes_escrita_admin ON public.chefoes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- FUNÇÃO RPC: STATUS DO CHEFÃO DA TEMPORADA ATIVA
-- =============================================================================

CREATE OR REPLACE FUNCTION public.obter_chefao_atual(p_temporada TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_temporada TEXT;
  v_chefao RECORD;
  v_dano_total BIGINT := 0;
  v_hp_restante BIGINT := 0;
  v_meu_dano BIGINT := 0;
  v_status TEXT := 'ativo';
  v_top_atacantes JSONB;
BEGIN
  -- Se temporada não fornecida, usa a temporada atual derivada da data corrente em Brasília
  IF p_temporada IS NULL OR btrim(p_temporada) = '' THEN
    SELECT (EXTRACT(YEAR FROM now() AT TIME ZONE 'America/Sao_Paulo')::text || '-' ||
      CASE
        WHEN EXTRACT(MONTH FROM now() AT TIME ZONE 'America/Sao_Paulo') IN (1, 2, 3) THEN 'WINTER'
        WHEN EXTRACT(MONTH FROM now() AT TIME ZONE 'America/Sao_Paulo') IN (4, 5, 6) THEN 'SPRING'
        WHEN EXTRACT(MONTH FROM now() AT TIME ZONE 'America/Sao_Paulo') IN (7, 8, 9) THEN 'SUMMER'
        ELSE 'FALL'
      END) INTO v_temporada;
  ELSE
    v_temporada := upper(btrim(p_temporada));
  END IF;

  -- Busca o chefão da temporada
  SELECT * INTO v_chefao
    FROM public.chefoes
   WHERE temporada = v_temporada;

  IF NOT FOUND THEN
    -- Fallback: busca qualquer chefão aberto no momento
    SELECT * INTO v_chefao
      FROM public.chefoes
     WHERE now() >= inicio AND now() <= fim
     ORDER BY inicio DESC
     LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ativo', false, 'temporada', v_temporada);
    END IF;
  END IF;

  -- Calcula o dano total com base no xp_ledger (Armadilha 28: dano somado no SQL)
  SELECT COALESCE(SUM(xp_earned), 0) INTO v_dano_total
    FROM public.xp_ledger
   WHERE created_at >= v_chefao.inicio
     AND created_at <= v_chefao.fim;

  -- Se atingiu o HP total e não estava marcado derrotado, atualiza
  IF v_dano_total >= v_chefao.hp_total THEN
    v_hp_restante := 0;
    v_status := 'derrotado';
    IF NOT v_chefao.derrotado THEN
      UPDATE public.chefoes
         SET derrotado = true,
             derrotado_em = now()
       WHERE id = v_chefao.id;
    END IF;
  ELSIF now() > v_chefao.fim THEN
    v_hp_restante := GREATEST(0, v_chefao.hp_total - v_dano_total);
    v_status := 'escapou';
  ELSE
    v_hp_restante := GREATEST(0, v_chefao.hp_total - v_dano_total);
    v_status := 'ativo';
  END IF;

  -- Dano do usuário logado (se autenticado)
  IF (SELECT auth.uid()) IS NOT NULL THEN
    SELECT COALESCE(SUM(xp_earned), 0) INTO v_meu_dano
      FROM public.xp_ledger
     WHERE user_id = (SELECT auth.uid())
       AND created_at >= v_chefao.inicio
       AND created_at <= v_chefao.fim;
  END IF;

  -- Top 5 atacantes que mais causaram dano
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_top_atacantes
    FROM (
      SELECT
        l.user_id,
        p.nome,
        p.handle,
        p.avatar_url,
        c.tag AS cla_tag,
        SUM(l.xp_earned) AS dano
      FROM public.xp_ledger l
      LEFT JOIN public.profiles p ON p.user_id = l.user_id
      LEFT JOIN public.cla_membros cm ON cm.user_id = l.user_id
      LEFT JOIN public.clas c ON c.id = cm.cla_id
     WHERE l.created_at >= v_chefao.inicio
       AND l.created_at <= v_chefao.fim
     GROUP BY l.user_id, p.nome, p.handle, p.avatar_url, c.tag
     ORDER BY dano DESC
     LIMIT 5
    ) sub;

  RETURN jsonb_build_object(
    'ativo', true,
    'id', v_chefao.id,
    'temporada', v_chefao.temporada,
    'nome', v_chefao.nome,
    'titulo', v_chefao.titulo,
    'descricao', v_chefao.descricao,
    'arte_url', v_chefao.arte_url,
    'hp_total', v_chefao.hp_total,
    'hp_restante', v_hp_restante,
    'dano_total', v_dano_total,
    'porcentagem_hp', ROUND((v_hp_restante::numeric / v_chefao.hp_total::numeric) * 100, 1),
    'inicio', v_chefao.inicio,
    'fim', v_chefao.fim,
    'status', v_status,
    'derrotado', (v_status = 'derrotado'),
    'recompensas_pagas', v_chefao.recompensas_pagas,
    'recompensa_anicoins', v_chefao.recompensa_anicoins,
    'titulo_recompensa', v_chefao.titulo_recompensa,
    'dano_minimo', v_chefao.dano_minimo_recompensa,
    'meu_dano', v_meu_dano,
    'elegivel_recompensa', (v_meu_dano >= v_chefao.dano_minimo_recompensa),
    'top_atacantes', v_top_atacantes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNÇÃO RPC: PAGAR RECOMPENSAS DO CHEFÃO DERROTADO
-- =============================================================================

CREATE OR REPLACE FUNCTION public.pagar_recompensas_chefao(p_chefao_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_chefao RECORD;
  v_dano_total BIGINT := 0;
  v_usuario RECORD;
  v_pagos INTEGER := 0;
  v_ref TEXT;
BEGIN
  SELECT * INTO v_chefao
    FROM public.chefoes
   WHERE id = p_chefao_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Chefão não encontrado');
  END IF;

  IF v_chefao.recompensas_pagas THEN
    RETURN jsonb_build_object('ok', true, 'ja_pago', true, 'mensagem', 'Recompensas deste chefão já foram pagas anteriormente.');
  END IF;

  -- Confere se de fato atingiu a derrota
  SELECT COALESCE(SUM(xp_earned), 0) INTO v_dano_total
    FROM public.xp_ledger
   WHERE created_at >= v_chefao.inicio
     AND created_at <= v_chefao.fim;

  IF v_dano_total < v_chefao.hp_total AND NOT v_chefao.derrotado THEN
    RETURN jsonb_build_object('erro', 'O chefão ainda não foi derrotado.');
  END IF;

  -- Itera sobre os usuários que bateram a meta de dano mínimo
  FOR v_usuario IN
    SELECT l.user_id, SUM(l.xp_earned) AS dano
      FROM public.xp_ledger l
     WHERE l.created_at >= v_chefao.inicio
       AND l.created_at <= v_chefao.fim
     GROUP BY l.user_id
    HAVING SUM(l.xp_earned) >= v_chefao.dano_minimo_recompensa
  LOOP
    v_ref := 'chefao:' || v_chefao.id::text || ':' || v_usuario.user_id::text;

    -- Credita AniCoins no crystal_ledger de forma idempotente
    IF v_chefao.recompensa_anicoins > 0 THEN
      INSERT INTO public.crystal_ledger (
        user_id,
        quantidade,
        motivo,
        referencia
      ) VALUES (
        v_usuario.user_id,
        v_chefao.recompensa_anicoins,
        'chefao',
        v_ref
      )
      ON CONFLICT (user_id, motivo, referencia) DO NOTHING;

      v_pagos := v_pagos + 1;
    END IF;
  END LOOP;

  -- Marca como recompensas pagas
  UPDATE public.chefoes
     SET derrotado = true,
         recompensas_pagas = true,
         derrotado_em = COALESCE(derrotado_em, now())
   WHERE id = p_chefao_id;

  RETURN jsonb_build_object(
    'ok', true,
    'chefao_id', p_chefao_id,
    'membros_recompensados', v_pagos,
    'recompensa_anicoins', v_chefao.recompensa_anicoins
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SEED INICIAL: CHEFÃO DA TEMPORADA ATUAL (2026-FALL)
-- =============================================================================

INSERT INTO public.chefoes (
  temporada,
  nome,
  titulo,
  descricao,
  arte_url,
  hp_total,
  inicio,
  fim,
  dano_minimo_recompensa,
  recompensa_anicoins,
  titulo_recompensa
) VALUES (
  '2026-FALL',
  'Tiamat, a Devoradora de Finais',
  'O Terror Cósmico dos Episódios Não Vistos',
  'Uma besta dimensional colossal despertou das fendas entre as temporadas para devorar as histórias inacabadas. Cada episódio que você e a comunidade assistem canaliza energia pura que estilhaça as escamas do monstro. Unam forças para derrotá-la antes que o inverno chegue!',
  '🐉',
  2500,
  '2026-10-01 00:00:00+00',
  '2026-12-31 23:59:59+00',
  50,
  120,
  'Destruidor de Tiamat'
)
ON CONFLICT (temporada) DO NOTHING;
