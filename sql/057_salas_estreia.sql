-- =============================================================================
-- 057_salas_estreia.sql
-- Fase 17.2: Sala de Estreia — Chat ao vivo de 3 horas pós-lançamento (#183 e #184)
--
-- Cria as tabelas salas_estreia, sala_mensagens, sala_mensagem_curtidas e
-- sala_mensagem_denuncias, com RLS restrito à janela de abertura, rate-limit de
-- 3 segundos por usuário, cópia idempotente dos destaques para episode_comments
-- no encerramento da sala e rotina de limpeza de mensagens após 30 dias.
-- =============================================================================

-- 1. Coluna de origem em episode_comments (se ainda não existir)
ALTER TABLE public.episode_comments
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'conversa';

-- 2. Tabela de salas de estreia
CREATE TABLE IF NOT EXISTS public.salas_estreia (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mal_id         INTEGER NOT NULL CHECK (mal_id > 0),
  episodio       INTEGER NOT NULL CHECK (episodio > 0),
  titulo_anime   TEXT NOT NULL,
  imagem_anime   TEXT,
  abre_em        TIMESTAMPTZ NOT NULL,
  fecha_em       TIMESTAMPTZ NOT NULL,
  encerrada      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_salas_estreia_mal_ep UNIQUE (mal_id, episodio),
  CONSTRAINT chk_salas_estreia_janela CHECK (fecha_em > abre_em)
);

CREATE INDEX IF NOT EXISTS salas_estreia_ativas_idx
  ON public.salas_estreia (encerrada, abre_em, fecha_em);

CREATE INDEX IF NOT EXISTS salas_estreia_mal_idx
  ON public.salas_estreia (mal_id, episodio);

-- 3. Mensagens enviadas na sala
CREATE TABLE IF NOT EXISTS public.sala_mensagens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id     UUID NOT NULL REFERENCES public.salas_estreia(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conteudo    TEXT NOT NULL CHECK (char_length(btrim(conteudo)) BETWEEN 1 AND 280),
  curtidas    INTEGER NOT NULL DEFAULT 0 CHECK (curtidas >= 0),
  destaque    BOOLEAN NOT NULL DEFAULT false,
  oculto      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sala_mensagens_sala_idx
  ON public.sala_mensagens (sala_id, created_at ASC);

CREATE INDEX IF NOT EXISTS sala_mensagens_user_rate_idx
  ON public.sala_mensagens (user_id, created_at DESC);

-- 4. Curtidas em mensagens da sala
CREATE TABLE IF NOT EXISTS public.sala_mensagem_curtidas (
  mensagem_id UUID NOT NULL REFERENCES public.sala_mensagens(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (mensagem_id, user_id)
);

-- 5. Denúncias de mensagens da sala
CREATE TABLE IF NOT EXISTS public.sala_mensagem_denuncias (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id    UUID NOT NULL REFERENCES public.sala_mensagens(id) ON DELETE CASCADE,
  denunciante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  motivo         TEXT NOT NULL CHECK (char_length(btrim(motivo)) BETWEEN 3 AND 500),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sala_denuncia_user UNIQUE (mensagem_id, denunciante_id)
);

CREATE INDEX IF NOT EXISTS sala_denuncias_msg_idx
  ON public.sala_mensagem_denuncias (mensagem_id);

-- =============================================================================
-- GATILHOS E RATE LIMIT
-- =============================================================================

-- Gatilho de Rate Limit: 1 mensagem a cada 3s por usuário
CREATE OR REPLACE FUNCTION public.fn_sala_mensagens_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.sala_mensagens
     WHERE user_id = NEW.user_id
       AND created_at > (now() - interval '3 seconds')
  ) THEN
    RAISE EXCEPTION 'Aguarde 3 segundos entre o envio de cada mensagem.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sala_mensagens_rate_limit ON public.sala_mensagens;
CREATE TRIGGER trg_sala_mensagens_rate_limit
  BEFORE INSERT ON public.sala_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sala_mensagens_rate_limit();

-- Gatilho de contagem de curtidas
CREATE OR REPLACE FUNCTION public.fn_sala_mensagem_curtida_toggle()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.sala_mensagens
       SET curtidas = curtidas + 1,
           destaque = (curtidas + 1 >= 1)
     WHERE id = NEW.mensagem_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.sala_mensagens
       SET curtidas = GREATEST(0, curtidas - 1),
           destaque = (GREATEST(0, curtidas - 1) >= 1)
     WHERE id = OLD.mensagem_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sala_mensagem_curtida_sync ON public.sala_mensagem_curtidas;
CREATE TRIGGER trg_sala_mensagem_curtida_sync
  AFTER INSERT OR DELETE ON public.sala_mensagem_curtidas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sala_mensagem_curtida_toggle();

-- =============================================================================
-- RLS (ROW LEVEL SECURITY)
-- =============================================================================

ALTER TABLE public.salas_estreia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sala_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sala_mensagem_curtidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sala_mensagem_denuncias ENABLE ROW LEVEL SECURITY;

-- Leitura de salas_estreia aberta para todos
DROP POLICY IF EXISTS salas_estreia_leitura ON public.salas_estreia;
CREATE POLICY salas_estreia_leitura ON public.salas_estreia
  FOR SELECT TO authenticated, anon
  USING (true);

-- Leitura de mensagens da sala
DROP POLICY IF EXISTS sala_mensagens_leitura ON public.sala_mensagens;
CREATE POLICY sala_mensagens_leitura ON public.sala_mensagens
  FOR SELECT TO authenticated, anon
  USING (
    NOT oculto
    OR (SELECT auth.uid()) = user_id
    OR (SELECT public.is_admin())
  );

-- Inserção de mensagens: só se a sala estiver aberta e não encerrada
DROP POLICY IF EXISTS sala_mensagens_insercao ON public.sala_mensagens;
CREATE POLICY sala_mensagens_insercao ON public.sala_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND NOT oculto
    AND EXISTS (
      SELECT 1 FROM public.salas_estreia s
       WHERE s.id = sala_id
         AND now() >= s.abre_em
         AND now() <= s.fecha_em
         AND NOT s.encerrada
    )
  );

-- Curtidas
DROP POLICY IF EXISTS sala_curtidas_leitura ON public.sala_mensagem_curtidas;
CREATE POLICY sala_curtidas_leitura ON public.sala_mensagem_curtidas
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS sala_curtidas_insercao ON public.sala_mensagem_curtidas;
CREATE POLICY sala_curtidas_insercao ON public.sala_mensagem_curtidas
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS sala_curtidas_remocao ON public.sala_mensagem_curtidas;
CREATE POLICY sala_curtidas_remocao ON public.sala_mensagem_curtidas
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

-- Denúncias
DROP POLICY IF EXISTS sala_denuncias_insercao ON public.sala_mensagem_denuncias;
CREATE POLICY sala_denuncias_insercao ON public.sala_mensagem_denuncias
  FOR INSERT TO authenticated
  WITH CHECK (
    denunciante_id = (SELECT auth.uid())
  );

-- =============================================================================
-- PROCEDURES E FUNÇÕES PÚBLICAS
-- =============================================================================

-- Fechamento da sala e migração de destaques para episode_comments
CREATE OR REPLACE FUNCTION public.fechar_sala_estreia(p_sala_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_sala RECORD;
  v_migrados INTEGER := 0;
  v_msg RECORD;
BEGIN
  -- Busca a sala
  SELECT * INTO v_sala
    FROM public.salas_estreia
   WHERE id = p_sala_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Sala não encontrada');
  END IF;

  -- Marca sala como encerrada
  UPDATE public.salas_estreia
     SET encerrada = true
   WHERE id = p_sala_id;

  -- Migra mensagens com destaque (curtidas >= 1 e não ocultas) para episode_comments
  -- Idempotente: se já existir comentário do mesmo autor com o mesmo texto no mesmo episódio, não duplica
  FOR v_msg IN
    SELECT m.id, m.user_id, m.conteudo, m.created_at
      FROM public.sala_mensagens m
     WHERE m.sala_id = p_sala_id
       AND m.destaque = true
       AND m.oculto = false
     ORDER BY m.curtidas DESC, m.created_at ASC
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.episode_comments ec
       WHERE ec.mal_id = v_sala.mal_id
         AND ec.episode_number = v_sala.episodio
         AND ec.user_id = v_msg.user_id
         AND ec.texto = v_msg.conteudo
    ) THEN
      INSERT INTO public.episode_comments (
        user_id,
        mal_id,
        episode_number,
        texto,
        momento_seg,
        oculto,
        origem,
        created_at
      ) VALUES (
        v_msg.user_id,
        v_sala.mal_id,
        v_sala.episodio,
        v_msg.conteudo,
        NULL,
        false,
        'sala_estreia',
        v_msg.created_at
      );
      v_migrados := v_migrados + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'sala_id', p_sala_id,
    'migrados', v_migrados
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limpeza de mensagens com mais de 30 dias em salas já encerradas
CREATE OR REPLACE FUNCTION public.limpar_mensagens_antigas_salas()
RETURNS INTEGER AS $$
DECLARE
  v_removidas INTEGER;
BEGIN
  WITH apagadas AS (
    DELETE FROM public.sala_mensagens m
     USING public.salas_estreia s
     WHERE m.sala_id = s.id
       AND s.encerrada = true
       AND m.created_at < (now() - interval '30 days')
     RETURNING m.id
  )
  SELECT count(*) INTO v_removidas FROM apagadas;

  RETURN v_removidas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
