-- 066_personagem_rpg.sql
-- Fase 18 (18.1a): personagem do jogador.
--
-- Cada usuário tem um aventureiro próprio, com o nome que ele escolheu no "despertar".
-- A tabela guarda só a identidade. Nível, XP e rank continuam vindo do xp_ledger, e o
-- estágio visual é calculado no Go a partir do nível: nada disso é copiado para cá.
--
-- Idempotente: pode ser reaplicado sem efeito.

-- =============================================================================
-- 1. Tabela
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rpg_personagens (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  -- Qual personagem do elenco o usuário despertou. A classe de combate e o elemento são
  -- do personagem, não do usuário, e ficam no catálogo do Go (PersonagensBase).
  personagem_base  TEXT NOT NULL DEFAULT 'espadachim_eter',
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rpg_personagens_nome_tamanho CHECK (char_length(nome) BETWEEN 2 AND 24),
  CONSTRAINT rpg_personagens_base_valida  CHECK (personagem_base IN ('espadachim_eter'))
);

COMMENT ON TABLE public.rpg_personagens IS
  'Aventureiro de cada usuário (Fase 18). Só identidade: o nível vem do xp_ledger.';

-- =============================================================================
-- 2. RLS: cada um lê só o próprio; ninguém grava direto
-- =============================================================================

ALTER TABLE public.rpg_personagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_personagens_le_o_proprio ON public.rpg_personagens;
CREATE POLICY rpg_personagens_le_o_proprio ON public.rpg_personagens
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Sem INSERT, UPDATE ou DELETE para o usuário: a escrita passa pela função abaixo.
-- Com gravação direta liberada, o navegador escolheria o personagem sem passar pelo Go.
REVOKE ALL ON public.rpg_personagens FROM anon, authenticated;
GRANT SELECT ON public.rpg_personagens TO authenticated;

-- =============================================================================
-- 3. Despertar: cria o personagem do usuário autenticado, uma única vez
-- =============================================================================

CREATE OR REPLACE FUNCTION public.despertar_personagem(p_nome TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  -- Espaços das pontas saem e sequências de espaço viram um só.
  v_nome    TEXT := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_linhas  INTEGER;
  v_atual   public.rpg_personagens%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF char_length(v_nome) < 2 OR char_length(v_nome) > 24 THEN
    RETURN jsonb_build_object('erro', 'O nome precisa ter de 2 a 24 caracteres.');
  END IF;

  IF v_nome ~ '[[:cntrl:]]' THEN
    RETURN jsonb_build_object('erro', 'O nome tem caracteres inválidos.');
  END IF;

  -- Quem já despertou mantém o personagem e o nome: a segunda chamada não altera nada.
  INSERT INTO public.rpg_personagens (user_id, nome)
  VALUES (v_user_id, v_nome)
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_linhas = ROW_COUNT;

  SELECT * INTO v_atual FROM public.rpg_personagens WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'criado', v_linhas > 0,
    'nome', v_atual.nome,
    'personagem_base', v_atual.personagem_base
  );
END;
$$;

REVOKE ALL ON FUNCTION public.despertar_personagem(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.despertar_personagem(TEXT) TO authenticated;

-- =============================================================================
-- 4. Como conferir (roda e desfaz; troque os dois UUIDs por usuários reais)
-- =============================================================================
--
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID_A>","role":"authenticated"}', true);
--
--   SELECT public.despertar_personagem('  Ren   Kaze ');  -- criado: true, nome "Ren Kaze"
--   SELECT public.despertar_personagem('Outro Nome');     -- criado: false, nome "Ren Kaze"
--   SELECT public.despertar_personagem('A');              -- erro de tamanho
--   SELECT count(*) FROM public.rpg_personagens;          -- 1: só o próprio
--
--   -- Gravação direta precisa falhar com "permission denied":
--   -- INSERT INTO public.rpg_personagens (user_id, nome) VALUES ('<UUID_A>', 'Direto');
--   -- UPDATE public.rpg_personagens SET nome = 'Trocado';
--
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID_B>","role":"authenticated"}', true);
--   SELECT count(*) FROM public.rpg_personagens;          -- 0: B não enxerga o de A
-- ROLLBACK;
