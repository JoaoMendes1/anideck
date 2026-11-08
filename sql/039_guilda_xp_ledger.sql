-- =============================================================================
-- 039_guilda_xp_ledger.sql
-- Fundação da Guilda e Gamificação (#145).
--
-- Implementa a mecânica de duas moedas registrada em docs/VISAO_GAMIFICACAO.md:
--   1. O Rank/Nível (F → SS) nasce estritamente da atividade no tempo: cada
--      episódio marcado com timestamp real grava no xp_ledger quanto valeu
--      naquele instante. Mudar os pesos depois nunca recalcula o passado.
--   2. A Afinidade/Especialista de Gênero (N1 → N5) continua vindo de
--      view_user_genre_affinity (sql/013), cobrindo o acervo inteiro.
--
-- Episódios marcados em lote ("Completo" em entries_completo.go ou importador
-- XML do MyAnimeList em import_mal.go) têm watched_at NULL (sql/023) e são
-- ignorados de propósito pelo ledger: cadastrar o passado dá afinidade de
-- gênero, nunca Rank.
--
-- APLICAR ANTES de promover o código da Fase 14. Se o código subir antes,
-- HandleMarkEpisode apenas registra aviso em log e conclui a marcação do
-- episódio normalmente (Armadilha 11 do PITFALLS.md).
-- =============================================================================

-- =============================================================================
-- 1. Tabela public.xp_ledger
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.xp_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id         INTEGER NOT NULL CHECK (mal_id > 0),
  episode_number INTEGER NOT NULL CHECK (episode_number > 0),
  xp_earned      INTEGER NOT NULL CHECK (xp_earned >= 0),
  reason         TEXT NOT NULL,
  earned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mal_id, episode_number)
);

CREATE INDEX IF NOT EXISTS xp_ledger_user_earned_idx
  ON public.xp_ledger (user_id, earned_at DESC);

ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;

-- Padrão InitPlan do sql/019: (SELECT auth.uid()) é avaliado uma vez por query.
DROP POLICY IF EXISTS xp_ledger_user ON public.xp_ledger;
CREATE POLICY xp_ledger_user ON public.xp_ledger
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Leitura para admin (aba Guilda do Painel Admin: prévia de distribuição por
-- faixa de Rank e auditoria de teto diário/rajadas, sem exigir service role).
DROP POLICY IF EXISTS xp_ledger_admin_select ON public.xp_ledger;
CREATE POLICY xp_ledger_admin_select ON public.xp_ledger
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

-- =============================================================================
-- 2. Trigger de devolução automática ao desmarcar episódio
--
-- Desmarcar um episódio (ou limpar o progresso do anime inteiro) apaga a linha
-- em episode_progress e remove automaticamente o lançamento correspondente em
-- xp_ledger, devolvendo exatamente o valor que havia sido ganho na hora.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.remover_xp_ao_desmarcar_episodio()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.xp_ledger
   WHERE user_id = OLD.user_id
     AND mal_id = OLD.mal_id
     AND episode_number = OLD.episode_number;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_episode_progress_delete_xp ON public.episode_progress;
CREATE TRIGGER trg_episode_progress_delete_xp
  AFTER DELETE ON public.episode_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.remover_xp_ao_desmarcar_episodio();

-- =============================================================================
-- 3. Seed retroativo dos episódios que já possuem watched_at real
--
-- Aplica a regra padrão da economia por dia civil no fuso America/Sao_Paulo
-- (Armadilha 3 do PITFALLS.md):
--   * 1º e 2º episódio do dia: 25 XP ('episódio base · 100%')
--   * 3º ao 5º episódio do dia: 18 XP ('retorno decrescente · 75%')
--   * 6º ao 11º episódio do dia: 12 XP ('retorno decrescente · 50%')
--   * 12º episódio do dia: 4 XP ('teto diário atingido', fechando 180 XP/dia)
--   * 13º+ episódio do dia: 0 XP ('teto diário atingido')
-- Linhas com watched_at IS NULL ficam de fora.
-- =============================================================================
WITH ordenados AS (
  SELECT
    ep.user_id,
    ep.mal_id,
    ep.episode_number,
    ep.watched_at,
    ROW_NUMBER() OVER (
      PARTITION BY ep.user_id, (ep.watched_at AT TIME ZONE 'America/Sao_Paulo')::date
      ORDER BY ep.watched_at ASC, ep.episode_number ASC
    ) AS ordem_no_dia
  FROM public.episode_progress ep
  WHERE ep.watched_at IS NOT NULL
    AND ep.mal_id > 0
    AND ep.episode_number > 0
)
INSERT INTO public.xp_ledger (user_id, mal_id, episode_number, xp_earned, reason, earned_at)
SELECT
  o.user_id,
  o.mal_id,
  o.episode_number,
  CASE
    WHEN o.ordem_no_dia <= 2  THEN 25
    WHEN o.ordem_no_dia <= 5  THEN 18
    WHEN o.ordem_no_dia <= 11 THEN 12
    WHEN o.ordem_no_dia = 12  THEN 4
    ELSE 0
  END AS xp_earned,
  CASE
    WHEN o.ordem_no_dia <= 2  THEN 'episódio base · 100%'
    WHEN o.ordem_no_dia <= 5  THEN 'retorno decrescente · 75%'
    WHEN o.ordem_no_dia <= 11 THEN 'retorno decrescente · 50%'
    ELSE 'teto diário atingido'
  END AS reason,
  o.watched_at AS earned_at
FROM ordenados o
ON CONFLICT (user_id, mal_id, episode_number) DO NOTHING;

-- =============================================================================
-- 4. Configuração da economia, faixas de Rank e catálogo de Insígnias
-- =============================================================================
INSERT INTO public.app_settings (key, value) VALUES
  (
    'guilda_economia',
    '{"ativo":true,"xp_base_episodio":25,"bonus_cedo":10,"fator_3_a_5":0.75,"fator_6_mais":0.5,"teto_diario":180,"evento_inicio":"","evento_fim":"","evento_multiplicador":2}'
  ),
  (
    'guilda_ranks',
    '[{"rank":"F","titulo":"Novato da Guilda","nivel_minimo":1},{"rank":"E","titulo":"Aprendiz de Campo","nivel_minimo":5},{"rank":"D","titulo":"Batedor","nivel_minimo":10},{"rank":"C","titulo":"Rastreador de Prata","nivel_minimo":18},{"rank":"B","titulo":"Veterano de Missão","nivel_minimo":28},{"rank":"A","titulo":"Vanguarda","nivel_minimo":40},{"rank":"S","titulo":"Mestre do Acervo","nivel_minimo":55},{"rank":"SS","titulo":"Lenda Viva","nivel_minimo":75}]'
  ),
  (
    'guilda_insignias',
    '[{"id":"coruja","icone":"🌙","nome":"Coruja da Guilda","descricao":"12 madrugadas assistindo","regra":"madrugadas","meta":12,"estilo":"foil"},{"id":"arquivista","icone":"📚","nome":"Arquivista","descricao":"25 curados no deck","regra":"curados_vistos","meta":25,"estilo":"foil2"},{"id":"chama","icone":"🔥","nome":"Chama Inabalável","descricao":"14 dias de streak","regra":"maior_streak","meta":14,"estilo":"foil"},{"id":"cedo","icone":"⚡","nome":"Sempre em Dia","descricao":"10 episódios no lançamento","regra":"cedo_marcados","meta":10,"estilo":"foil2"},{"id":"especialista","icone":"🧭","nome":"Mestre de Gênero","descricao":"Nível N3 em um gênero","regra":"genero_n3","meta":1,"estilo":"foil"},{"id":"voz_guilda","icone":"👑","nome":"Voz da Guilda","descricao":"Alcançar o Rank S","regra":"rank_s","meta":55,"estilo":"foil2"}]'
  )
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- Conferência (rodar depois de aplicar)
-- =============================================================================
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'xp_ledger';          -- t
-- SELECT count(*) FROM public.xp_ledger;                                    -- > 0
-- SELECT key FROM public.app_settings WHERE key LIKE 'guilda_%' ORDER BY key; -- 3 linhas
