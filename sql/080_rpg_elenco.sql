-- =============================================================================
-- 080 — Elenco do RPG: o jogador escolhe o personagem
-- =============================================================================
--
-- O que muda:
--   1. O CHECK de rpg_personagens.personagem_base passa a aceitar os 6 personagens.
--   2. despertar_personagem ganha o parâmetro p_base (padrão: Espadachim de Éter).
--      A versão antiga, só com o nome, sai: com o padrão, a chamada só com p_nome
--      continua funcionando, e duas versões da função deixariam o PostgREST em dúvida.
--
-- A troca de personagem depois do despertar é feita pelo Go (PUT /api/personagem/base),
-- com o service role, depois de validar a escolha. O navegador continua sem gravar
-- direto na tabela (sql/066).
--
-- Pode rodar mais de uma vez.

-- =============================================================================
-- 1. Personagens aceitos
-- =============================================================================

ALTER TABLE public.rpg_personagens
  DROP CONSTRAINT IF EXISTS rpg_personagens_base_valida;

ALTER TABLE public.rpg_personagens
  ADD CONSTRAINT rpg_personagens_base_valida CHECK (personagem_base IN (
    'espadachim_eter',  -- Espadachim de Éter (o primeiro)
    'lanceiro_fogo',    -- Haruto, Lanceiro de Fogo
    'assassina_raio',   -- Rin, Assassina do Raio
    'maga_agua',        -- Mizuki, Maga da Água
    'guerreiro_terra',  -- Brokk, Guerreiro da Terra
    'paladina_luz'      -- Celestia, Paladina da Luz
  ));

-- =============================================================================
-- 2. Despertar com a escolha do personagem
-- =============================================================================

DROP FUNCTION IF EXISTS public.despertar_personagem(TEXT);

CREATE OR REPLACE FUNCTION public.despertar_personagem(
  p_nome TEXT,
  p_base TEXT DEFAULT 'espadachim_eter'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  -- Espaços das pontas saem e sequências de espaço viram um só.
  v_nome    TEXT := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_base    TEXT := coalesce(nullif(btrim(p_base), ''), 'espadachim_eter');
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

  -- A mesma lista do CHECK: assim o erro sai em português, não como violação de restrição.
  IF v_base NOT IN ('espadachim_eter', 'lanceiro_fogo', 'assassina_raio',
                    'maga_agua', 'guerreiro_terra', 'paladina_luz') THEN
    RETURN jsonb_build_object('erro', 'Personagem desconhecido.');
  END IF;

  -- Quem já despertou mantém o personagem e o nome: a segunda chamada não altera nada.
  INSERT INTO public.rpg_personagens (user_id, nome, personagem_base)
  VALUES (v_user_id, v_nome, v_base)
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

REVOKE ALL ON FUNCTION public.despertar_personagem(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.despertar_personagem(TEXT, TEXT) TO authenticated;

-- O PostgREST guarda a lista de funções em cache: avisa que ela mudou.
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- 3. Como conferir (roda e desfaz; troque o UUID por um usuário real SEM personagem)
-- =============================================================================
--
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
--  WHERE conname = 'rpg_personagens_base_valida';             -- os 6 personagens
--
-- SELECT pg_get_function_identity_arguments(oid) FROM pg_proc
--  WHERE proname = 'despertar_personagem';                    -- uma linha: p_nome text, p_base text
--
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID>","role":"authenticated"}', true);
--
--   SELECT public.despertar_personagem('Ren', 'dragao');      -- erro: Personagem desconhecido.
--   SELECT public.despertar_personagem('Ren', 'maga_agua');   -- criado: true, personagem_base "maga_agua"
--   SELECT public.despertar_personagem('Outro', 'paladina_luz'); -- criado: false, continua "maga_agua"
--
--   -- Gravação direta continua proibida ("permission denied"):
--   -- UPDATE public.rpg_personagens SET personagem_base = 'paladina_luz';
-- ROLLBACK;
