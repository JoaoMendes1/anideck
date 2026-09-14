-- 031_gestao_taxonomia_e_tags.sql
-- Duas RPCs para o Painel gerir rotulos sem passar pelo SQL Editor.
--
-- Motivo: cada tag nova ou errada exigia arquivo sql/ novo, o que trava o ajuste
-- fino justamente da parte que muda com mais frequencia.
--
-- SECURITY DEFINER nas duas, porque escrevem em curated_animes. O is_admin() e
-- conferido DENTRO da funcao, na primeira linha: definer ignora RLS, entao sem
-- essa guarda qualquer um com a anon key escreveria (foi assim que o vazamento
-- do sql/018 aconteceu). O REVOKE no fim fecha o outro lado.

-- =============================================================================
-- 1) Renomear uma tag em todos os animes, PRESERVANDO A POSICAO
-- =============================================================================
-- array_replace troca o elemento no lugar. A tentacao seria array_remove +
-- append, ou array_agg(DISTINCT), e os dois REORDENAM o array -- a ordem das tags
-- e prioridade editorial e aparece nos cards, entao reordenar destroi trabalho
-- manual sem deixar rastro. Ja aconteceu uma vez, em 13/09/2026.
--
-- Devolve quantos animes foram tocados, para a tela confirmar o que prometeu.
CREATE OR REPLACE FUNCTION public.renomear_tag_curadoria(
  tag_antiga text,
  tag_nova   text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ja_tinham_as_duas integer;
  trocados          integer;
BEGIN
  IF NOT (SELECT is_admin()) THEN
    RAISE EXCEPTION 'Apenas administradores podem renomear tags';
  END IF;

  IF tag_antiga IS NULL OR btrim(tag_antiga) = ''
     OR tag_nova IS NULL OR btrim(tag_nova) = '' THEN
    RAISE EXCEPTION 'Tag de origem e de destino sao obrigatorias';
  END IF;

  IF tag_antiga = tag_nova THEN
    RETURN 0;
  END IF;

  -- O anime que JA tem as duas ficaria com a tag nova duplicada depois da troca.
  -- Nesses, remove a antiga em vez de trocar: a posicao da que fica e preservada.
  --
  -- Os dois UPDATEs sao contados separadamente. GET DIAGNOSTICS le o ROW_COUNT do
  -- ULTIMO comando, entao capturar so no fim perderia o primeiro grupo -- e esses
  -- animes nem aparecem no segundo UPDATE, porque o primeiro ja tirou a tag antiga
  -- deles. O numero e o que a tela mostra antes de confirmar; errado ali, a
  -- confirmacao deixa de valer alguma coisa.
  UPDATE curated_animes
  SET custom_tags = array_remove(custom_tags, tag_antiga)
  WHERE custom_tags @> ARRAY[tag_antiga]
    AND custom_tags @> ARRAY[tag_nova];

  GET DIAGNOSTICS ja_tinham_as_duas = ROW_COUNT;

  UPDATE curated_animes
  SET custom_tags = array_replace(custom_tags, tag_antiga, tag_nova)
  WHERE custom_tags @> ARRAY[tag_antiga];

  GET DIAGNOSTICS trocados = ROW_COUNT;

  RETURN ja_tinham_as_duas + trocados;
END;
$$;

-- =============================================================================
-- 2) Remover uma tag de todos os animes
-- =============================================================================
-- array_remove tira o elemento e fecha o buraco sem mexer no resto da ordem.
CREATE OR REPLACE FUNCTION public.remover_tag_curadoria(tag_alvo text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  afetados integer;
BEGIN
  IF NOT (SELECT is_admin()) THEN
    RAISE EXCEPTION 'Apenas administradores podem remover tags';
  END IF;

  IF tag_alvo IS NULL OR btrim(tag_alvo) = '' THEN
    RAISE EXCEPTION 'A tag e obrigatoria';
  END IF;

  UPDATE curated_animes
  SET custom_tags = array_remove(custom_tags, tag_alvo)
  WHERE custom_tags @> ARRAY[tag_alvo];

  GET DIAGNOSTICS afetados = ROW_COUNT;
  RETURN afetados;
END;
$$;

-- =============================================================================
-- Permissao de execucao
-- =============================================================================
-- Funcao nasce com EXECUTE para PUBLIC, e anon/authenticated herdam por ali --
-- revogar so dos dois nao fecha nada (ver secao [7] do snapshot).
REVOKE EXECUTE ON FUNCTION public.renomear_tag_curadoria(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remover_tag_curadoria(text)        FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.renomear_tag_curadoria(text, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.remover_tag_curadoria(text)        TO authenticated;

-- =============================================================================
-- CONFERENCIA -- rodar depois de aplicar, na transacao abortada.
-- Usuario comum tem que receber a excecao de admin, nao executar.
-- =============================================================================
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';
--   SELECT public.renomear_tag_curadoria('Teste', 'Teste2');
-- ROLLBACK;

-- =============================================================================
-- 3) Escrita na genre_taxonomy pela tela
-- =============================================================================
-- A tabela tinha UMA policy, de SELECT: escrita fechada para todos, inclusive
-- admin. Sem estas, o PostgREST nao grava e devolve sucesso vazio em vez de erro
-- -- a tela diria "tag cadastrada" e nada teria acontecido (Armadilha 15).
--
-- Nao ha UPDATE de proposito: mudar o raw_name de uma linha existente
-- desconectaria silenciosamente todos os animes que usam aquele texto. Corrigir
-- e remover e cadastrar de novo, que e uma acao visivel.

CREATE POLICY "admin_insere_taxonomia"
ON genre_taxonomy FOR INSERT TO authenticated
WITH CHECK ((SELECT is_admin()));

CREATE POLICY "admin_remove_taxonomia"
ON genre_taxonomy FOR DELETE TO authenticated
USING ((SELECT is_admin()));