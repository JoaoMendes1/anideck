-- =============================================================================
-- 113 — Punições: advertência, silenciar, multa, banir e bloquear e-mail
-- =============================================================================
--
-- Toda punição vira uma linha em public.punicoes, o histórico que o Painel Admin mostra.
--
--   advertencia     só o registro e o aviso para a pessoa.
--   silenciar       até a data (ou sem fim): não comenta, não avalia, não reage, não curte.
--                   A trava é um gatilho em cada tabela: vale por qualquer caminho.
--   multa           AniCoins e/ou XP descontados, como multa de trânsito. O saldo de AniCoins
--                   pode ficar negativo: até zerar, a Loja recusa a compra (debitar_cristais
--                   já confere o saldo). O XP sai do xp_ledger em linha própria de multa.
--   banir           o login é bloqueado pelo Go na API de administração do Supabase Auth
--                   (ban_duration); aqui fica só o registro.
--   bloqueio_email  o e-mail normalizado vai para public.emails_bloqueados, e o gatilho em
--                   auth.users recusa o cadastro com ele.
--
-- Revogar devolve o que for reversível: silêncio e banimento acabam; multa é estornada.
--
-- Todas as funções de admin são do service role: o Go confere que quem pede é admin.
-- Pode rodar mais de uma vez.

-- =============================================================================
-- 1. Histórico
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.punicoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('advertencia', 'silenciar', 'multa', 'banir', 'bloqueio_email')),
  gravidade     TEXT NOT NULL CHECK (gravidade IN ('leve', 'media', 'grave', 'gravissima')),
  motivo        TEXT NOT NULL CHECK (char_length(btrim(motivo)) BETWEEN 3 AND 300),
  anicoins      INTEGER NOT NULL DEFAULT 0 CHECK (anicoins >= 0 AND anicoins <= 100000),
  xp            INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0 AND xp <= 100000),
  -- Fim do silêncio ou do banimento; nulo é sem fim.
  ate           TIMESTAMPTZ,
  denuncia_id   UUID REFERENCES public.denuncias(id) ON DELETE SET NULL,
  aplicada_por  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revogada_em   TIMESTAMPTZ,
  -- Número da linha de multa no xp_ledger (mal_id 0), para estornar na revogação.
  xp_ledger_ep  INTEGER
);

CREATE INDEX IF NOT EXISTS punicoes_usuario_idx ON public.punicoes (user_id, created_at DESC);

ALTER TABLE public.punicoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.punicoes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.punicoes TO service_role;

-- =============================================================================
-- 2. Multa de XP no xp_ledger
-- =============================================================================
-- O CHECK do sql/039 proíbe XP negativo. Ele passa a aceitar negativo só em linha de multa
-- (reason 'multa'), com mal_id 0 e número tirado de uma sequência que começa em 1 bilhão,
-- longe dos ids de xp_extra (que também usam mal_id 0). O teto diário não muda: ele só
-- soma XP de episódio (mal_id > 0).

CREATE SEQUENCE IF NOT EXISTS public.multa_xp_seq START 1000000000;

DO $$
DECLARE
  v_nome TEXT;
BEGIN
  SELECT conname INTO v_nome
    FROM pg_constraint
   WHERE conrelid = 'public.xp_ledger'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%xp_earned >= 0%';
  IF v_nome IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.xp_ledger DROP CONSTRAINT %I', v_nome);
  END IF;
END $$;

ALTER TABLE public.xp_ledger DROP CONSTRAINT IF EXISTS xp_ledger_xp_earned_multa_check;
ALTER TABLE public.xp_ledger ADD CONSTRAINT xp_ledger_xp_earned_multa_check
  CHECK (xp_earned >= 0 OR (reason = 'multa' AND mal_id = 0));

-- =============================================================================
-- 3. Silêncio
-- =============================================================================

CREATE OR REPLACE FUNCTION public.silenciado_ate(p_user UUID)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- 'infinity' para silêncio sem fim; nulo quando não está silenciado.
  SELECT max(COALESCE(ate, 'infinity'::timestamptz))
    FROM public.punicoes
   WHERE user_id = p_user
     AND tipo = 'silenciar'
     AND revogada_em IS NULL
     AND (ate IS NULL OR ate > now());
$$;

CREATE OR REPLACE FUNCTION public.barrar_silenciado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ate TIMESTAMPTZ := public.silenciado_ate(NEW.user_id);
BEGIN
  IF v_ate IS NOT NULL THEN
    IF v_ate = 'infinity'::timestamptz THEN
      RAISE EXCEPTION 'Sua conta está silenciada pela moderação.' USING ERRCODE = 'P0010';
    END IF;
    RAISE EXCEPTION 'Sua conta está silenciada pela moderação até %.',
      to_char(v_ate AT TIME ZONE 'America/Sao_Paulo', 'DD/MM "às" HH24:MI') USING ERRCODE = 'P0010';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  v_tabela TEXT;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY['episode_comments', 'anime_reviews', 'episode_reactions', 'comment_likes']
  LOOP
    IF to_regclass('public.' || v_tabela) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_barrar_silenciado ON public.%I', v_tabela);
      EXECUTE format('CREATE TRIGGER trg_barrar_silenciado BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.barrar_silenciado()', v_tabela);
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- 4. E-mails bloqueados
-- =============================================================================
-- Normalizar antes de comparar: maiúsculas, espaços e o "+apelido" não mudam a caixa de
-- entrada; no Gmail, os pontos também não. Sem isso, a pessoa bloqueada voltaria com
-- joao+1@gmail.com.

CREATE OR REPLACE FUNCTION public.normalizar_email(p_email TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_email IS NULL OR position('@' IN p_email) = 0 THEN lower(btrim(COALESCE(p_email, '')))
    ELSE (
      SELECT CASE
        WHEN dominio IN ('gmail.com', 'googlemail.com') THEN replace(split_part(usuario, '+', 1), '.', '') || '@gmail.com'
        ELSE split_part(usuario, '+', 1) || '@' || dominio
      END
      FROM (SELECT split_part(lower(btrim(p_email)), '@', 1) AS usuario,
                   split_part(lower(btrim(p_email)), '@', 2) AS dominio) partes
    )
  END;
$$;

CREATE TABLE IF NOT EXISTS public.emails_bloqueados (
  email_normalizado TEXT PRIMARY KEY,
  motivo            TEXT NOT NULL DEFAULT '',
  punicao_id        UUID REFERENCES public.punicoes(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emails_bloqueados ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.emails_bloqueados FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.emails_bloqueados TO service_role;

CREATE OR REPLACE FUNCTION public.barrar_email_bloqueado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.emails_bloqueados WHERE email_normalizado = public.normalizar_email(NEW.email)) THEN
    RAISE EXCEPTION 'Este e-mail não pode criar conta no AniDeck.' USING ERRCODE = 'P0011';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_barrar_email_bloqueado ON auth.users;
CREATE TRIGGER trg_barrar_email_bloqueado
  BEFORE INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.barrar_email_bloqueado();

-- =============================================================================
-- 5. Aplicar e revogar (service role, chamado pelo Go depois de conferir o admin)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.aplicar_punicao(
  p_admin      UUID,
  p_user       UUID,
  p_tipo       TEXT,
  p_gravidade  TEXT,
  p_motivo     TEXT,
  p_anicoins   INTEGER DEFAULT 0,
  p_xp         INTEGER DEFAULT 0,
  p_dias       INTEGER DEFAULT NULL,
  p_denuncia   UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id     UUID;
  v_ep     INTEGER;
  v_email  TEXT;
  v_ate    TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user) THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF p_user = p_admin THEN
    RAISE EXCEPTION 'Você não pode punir a si mesmo.' USING ERRCODE = 'P0001';
  END IF;
  IF p_tipo = 'multa' AND COALESCE(p_anicoins, 0) <= 0 AND COALESCE(p_xp, 0) <= 0 THEN
    RAISE EXCEPTION 'Multa precisa de AniCoins ou XP.' USING ERRCODE = '22023';
  END IF;
  IF p_dias IS NOT NULL AND (p_dias < 1 OR p_dias > 3650) THEN
    RAISE EXCEPTION 'Dias entre 1 e 3650 (vazio é sem fim).' USING ERRCODE = '22023';
  END IF;

  v_ate := CASE WHEN p_tipo IN ('silenciar', 'banir') AND p_dias IS NOT NULL THEN now() + make_interval(days => p_dias) END;

  INSERT INTO public.punicoes (user_id, tipo, gravidade, motivo, anicoins, xp, ate, denuncia_id, aplicada_por)
  VALUES (p_user, p_tipo, p_gravidade, btrim(p_motivo),
          CASE WHEN p_tipo = 'multa' THEN GREATEST(COALESCE(p_anicoins, 0), 0) ELSE 0 END,
          CASE WHEN p_tipo = 'multa' THEN GREATEST(COALESCE(p_xp, 0), 0) ELSE 0 END,
          v_ate, p_denuncia, p_admin)
  RETURNING id INTO v_id;

  IF p_tipo = 'multa' THEN
    IF COALESCE(p_anicoins, 0) > 0 THEN
      INSERT INTO public.crystal_ledger (user_id, quantidade, motivo, referencia)
      VALUES (p_user, -p_anicoins, 'multa', 'punicao:' || v_id::text);
    END IF;
    IF COALESCE(p_xp, 0) > 0 THEN
      v_ep := nextval('public.multa_xp_seq')::integer;
      INSERT INTO public.xp_ledger (user_id, mal_id, episode_number, xp_earned, reason)
      VALUES (p_user, 0, v_ep, -p_xp, 'multa');
      UPDATE public.punicoes SET xp_ledger_ep = v_ep WHERE id = v_id;
    END IF;
  ELSIF p_tipo = 'bloqueio_email' THEN
    SELECT email INTO v_email FROM auth.users WHERE id = p_user;
    IF v_email IS NOT NULL THEN
      INSERT INTO public.emails_bloqueados (email_normalizado, motivo, punicao_id)
      VALUES (public.normalizar_email(v_email), btrim(p_motivo), v_id)
      ON CONFLICT (email_normalizado) DO NOTHING;
    END IF;
  END IF;

  IF p_denuncia IS NOT NULL THEN
    UPDATE public.denuncias
       SET status = 'resolvida', decisao = p_tipo || ' · ' || p_gravidade, resolvida_por = p_admin, resolvida_em = now()
     WHERE id = p_denuncia AND status = 'pendente';
  END IF;

  RETURN jsonb_build_object('id', v_id, 'ate', v_ate);
END;
$$;

CREATE OR REPLACE FUNCTION public.revogar_punicao(p_admin UUID, p_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  p public.punicoes%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.punicoes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Punição não encontrada.' USING ERRCODE = 'P0002';
  END IF;
  IF p.revogada_em IS NOT NULL THEN
    RETURN jsonb_build_object('id', p.id, 'tipo', p.tipo, 'user_id', p.user_id, 'ja_revogada', true);
  END IF;

  UPDATE public.punicoes SET revogada_em = now() WHERE id = p_id;

  IF p.tipo = 'multa' THEN
    DELETE FROM public.crystal_ledger WHERE user_id = p.user_id AND motivo = 'multa' AND referencia = 'punicao:' || p.id::text;
    IF p.xp_ledger_ep IS NOT NULL THEN
      DELETE FROM public.xp_ledger WHERE user_id = p.user_id AND mal_id = 0 AND episode_number = p.xp_ledger_ep AND reason = 'multa';
    END IF;
  ELSIF p.tipo = 'bloqueio_email' THEN
    DELETE FROM public.emails_bloqueados WHERE punicao_id = p.id;
  END IF;

  RETURN jsonb_build_object('id', p.id, 'tipo', p.tipo, 'user_id', p.user_id, 'ja_revogada', false);
END;
$$;

-- Denúncia descartada (sem punição) ou resolvida sem punição registrada.
CREATE OR REPLACE FUNCTION public.decidir_denuncia(p_admin UUID, p_id UUID, p_status TEXT, p_decisao TEXT DEFAULT '')
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.denuncias
     SET status = CASE WHEN p_status IN ('resolvida', 'descartada') THEN p_status ELSE status END,
         decisao = left(btrim(COALESCE(p_decisao, '')), 300),
         resolvida_por = p_admin,
         resolvida_em = now()
   WHERE id = p_id;
$$;

-- =============================================================================
-- 6. O que a própria pessoa vê
-- =============================================================================
-- Silêncio ativo e punições dos últimos 30 dias, para o aviso no app. Quem aplicou não sai.

CREATE OR REPLACE FUNCTION public.minhas_punicoes()
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
           'id', id, 'tipo', tipo, 'gravidade', gravidade, 'motivo', motivo,
           'anicoins', anicoins, 'xp', xp, 'ate', ate, 'created_at', created_at)
    FROM public.punicoes
   WHERE user_id = auth.uid()
     AND revogada_em IS NULL
     AND tipo <> 'bloqueio_email'
     AND (created_at > now() - INTERVAL '30 days' OR (tipo = 'silenciar' AND (ate IS NULL OR ate > now())))
   ORDER BY created_at DESC
   LIMIT 10;
$$;

-- =============================================================================
-- 7. Permissões
-- =============================================================================

REVOKE ALL ON FUNCTION public.silenciado_ate(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.silenciado_ate(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.aplicar_punicao(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revogar_punicao(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decidir_denuncia(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_punicao(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.revogar_punicao(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.decidir_denuncia(UUID, UUID, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.minhas_punicoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.minhas_punicoes() TO authenticated;
