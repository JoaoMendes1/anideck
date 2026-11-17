-- =============================================================================
-- 087 — XP sem episódio e resgate de missão com XP
-- =============================================================================
--
-- As missões passam a dar um pouco de XP além das AniCoins. O XP mora no xp_ledger, que
-- tudo lê (nível, rank, clãs, ligas, chefão, RPG), mas a tabela exigia um episódio
-- (mal_id > 0) em cada linha.
--
-- 1. O xp_ledger passa a aceitar mal_id = 0: XP que não veio de episódio. O episode_number
--    dessas linhas é o id do registro em xp_extra, o que mantém a chave única da tabela.
--    Quem depende de anime já ignora o 0: o ranking por gênero faz JOIN com o cache, e a
--    recuperação de Vida do RPG (sql/081) pula mal_id <= 0. O Go tira o 0 do teto diário.
-- 2. xp_extra registra cada concessão pela origem, única por usuário: a mesma missão nunca
--    paga XP duas vezes.
-- 3. conceder_xp_extra() grava as duas linhas juntas. Só o service role chama, e outras
--    funções do banco (o convite, no sql/088) chamam por dentro.
-- 4. resgatar_missao() paga AniCoins e XP na mesma transação: antes, um crédito podia
--    entrar sem o outro.
-- 5. O catálogo antigo de missões em app_settings sai: o catálogo vive no código, com o
--    sorteio que depende dele.
--
-- Ordem: aplicar antes de promover o código das missões novas. Pode rodar mais de uma vez.

-- -----------------------------------------------------------------------------
-- 1. xp_ledger aceita XP sem episódio
-- -----------------------------------------------------------------------------
-- O CHECK do sql/039 foi criado sem nome: procura pela definição, não pelo nome gerado.
DO $$
DECLARE
  v_nome text;
BEGIN
  FOR v_nome IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.xp_ledger'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%mal_id > 0%'
  LOOP
    EXECUTE format('ALTER TABLE public.xp_ledger DROP CONSTRAINT %I', v_nome);
  END LOOP;
END;
$$;

ALTER TABLE public.xp_ledger DROP CONSTRAINT IF EXISTS xp_ledger_mal_id_check;
ALTER TABLE public.xp_ledger ADD CONSTRAINT xp_ledger_mal_id_check CHECK (mal_id >= 0);

-- -----------------------------------------------------------------------------
-- 2. Registro das concessões
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xp_extra (
  id        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origem    text NOT NULL CHECK (length(origem) BETWEEN 1 AND 120),
  xp        integer NOT NULL CHECK (xp > 0 AND xp <= 500),
  motivo    text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, origem)
);

COMMENT ON TABLE public.xp_extra IS
  'XP que não veio de episódio (missões, convites). Cada linha tem par no xp_ledger com mal_id 0 e episode_number = id.';

ALTER TABLE public.xp_extra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS xp_extra_le_o_proprio ON public.xp_extra;
CREATE POLICY xp_extra_le_o_proprio ON public.xp_extra
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.xp_extra FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Concessão
-- -----------------------------------------------------------------------------
-- Devolve o XP concedido, ou 0 quando a origem já tinha sido paga.
CREATE OR REPLACE FUNCTION public.conceder_xp_extra(
  p_user_id uuid,
  p_xp      integer,
  p_motivo  text,
  p_origem  text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id integer;
BEGIN
  IF p_user_id IS NULL OR COALESCE(p_xp, 0) <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.xp_extra (user_id, origem, xp, motivo)
  VALUES (p_user_id, btrim(p_origem), p_xp, btrim(p_motivo))
  ON CONFLICT (user_id, origem) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.xp_ledger (user_id, mal_id, episode_number, xp_earned, reason)
  VALUES (p_user_id, 0, v_id, p_xp, btrim(p_motivo));

  RETURN p_xp;
END;
$$;

REVOKE ALL ON FUNCTION public.conceder_xp_extra(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.conceder_xp_extra(uuid, integer, text, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. Resgate de missão
-- -----------------------------------------------------------------------------
-- O Go confere, com o token do usuário, que a missão é dele e está concluída. Aqui só se
-- garante que a referência paga uma vez e que AniCoins e XP entram juntos.
CREATE OR REPLACE FUNCTION public.resgatar_missao(
  p_user_id    uuid,
  p_motivo     text,
  p_referencia text,
  p_anicoins   integer,
  p_xp         integer,
  p_texto_xp   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_saldo integer;
  v_xp    integer := 0;
BEGIN
  IF p_motivo NOT IN ('missao_diaria', 'missao_semanal') THEN
    RAISE EXCEPTION 'Motivo de missão inválido: %', p_motivo USING ERRCODE = 'P0001';
  END IF;

  -- Dois cliques ao mesmo tempo esperam um pelo outro em vez de disputar o UNIQUE.
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_referencia));

  IF EXISTS (
    SELECT 1 FROM public.crystal_ledger
     WHERE user_id = p_user_id AND motivo = p_motivo AND referencia = p_referencia
  ) THEN
    RETURN jsonb_build_object('ja_resgatada', true, 'saldo', 0, 'xp', 0);
  END IF;

  v_saldo := public.creditar_cristais(p_user_id, p_anicoins, p_motivo, p_referencia);
  v_xp := public.conceder_xp_extra(p_user_id, p_xp, p_texto_xp, p_referencia);

  RETURN jsonb_build_object('ja_resgatada', false, 'saldo', v_saldo, 'xp', v_xp);
END;
$$;

REVOKE ALL ON FUNCTION public.resgatar_missao(uuid, text, text, integer, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resgatar_missao(uuid, text, text, integer, integer, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 5. Catálogo antigo
-- -----------------------------------------------------------------------------
DELETE FROM public.app_settings WHERE key = 'missoes_catalogo';

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'xp_ledger_mal_id_check';
-- -- CHECK ((mal_id >= 0))
--
-- Depois de resgatar uma missão de assistir no app:
-- SELECT origem, xp, motivo FROM public.xp_extra ORDER BY id DESC LIMIT 5;
-- SELECT mal_id, episode_number, xp_earned, reason FROM public.xp_ledger
--  WHERE mal_id = 0 ORDER BY earned_at DESC LIMIT 5;
