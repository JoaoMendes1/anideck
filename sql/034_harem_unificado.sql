-- 034_harem_unificado.sql
-- O AniDeck trata harém como um rótulo só.
--
-- A AniList separa "Female Harem" (o harém clássico) de "Male Harem" (o reverso),
-- e o sql/008 espelhou essa divisão criando o display "Harém Reverso". A decisão
-- de produto agora é outra: aqui os dois são "Harém" (ver DECISIONS.md).
--
-- Sintoma que isto encerra: o search.go já tratava os dois como "Harém", mas a
-- taxonomia não. A busca e as Estatísticas discordavam sobre o mesmo anime.
--
-- POR QUE ARQUIVO E NÃO O PAINEL
-- A genre_taxonomy não tem policy de UPDATE, de propósito (sql/031). Pelo Painel
-- seria remover e recadastrar cada linha, e no intervalo os animes daquele texto
-- cairiam em 'ignorado'. Aqui é um UPDATE só, atômico.
--
-- 'Harém Reverso' CONTINUA como raw_name, agora apontando para 'Harém': texto
-- antigo ou gerado pela IA ainda resolve, em vez de virar rótulo órfão.
--
-- O tier é fixado junto porque o useTaxonomia usa o tier da primeira linha do
-- grupo. Uma linha criada pela tela com tier diferente deixaria o grupo ambíguo.
--
-- ORDEM: independe do deploy. O search.go já trata os dois como "Harém" e o chip
-- novo do filters.ts funciona antes ou depois deste arquivo.
--
-- REVERSÍVEL? A taxonomia sim (bloco ROLLBACK no fim). A renomeação das tags da
-- curadoria, feita pelo Painel, NÃO: depois dela não há como saber quais animes
-- eram "reverso". Por isso a conferência ANTES é obrigatória e o resultado vai
-- para a issue.
--
-- NÃO RENOMEIA custom_tags AQUI: a RPC renomear_tag_curadoria confere is_admin(),
-- que lê auth.uid(), e no SQL Editor ele é NULL. Reescrever a troca de array à mão
-- repetiria o risco da Armadilha 21. O caminho é Painel → Controle → Rótulos.

-- =============================================================================
-- CONFERÊNCIA — ANTES de aplicar. Guardar os dois resultados na issue.
-- =============================================================================
-- SELECT raw_name, display_name_pt, tier
-- FROM genre_taxonomy
-- WHERE display_name_pt ILIKE 'har%'
-- ORDER BY display_name_pt, raw_name;
--
-- SELECT mal_id, custom_title, custom_tags
-- FROM curated_animes
-- WHERE custom_tags && ARRAY['Harém', 'Harém Reverso', 'Male Harem', 'Reverse Harem']
-- ORDER BY custom_title;

-- =============================================================================
-- APLICAÇÃO
-- =============================================================================
BEGIN;

UPDATE genre_taxonomy
SET display_name_pt = 'Harém',
    tier            = 'tag_tematica'
WHERE display_name_pt IN ('Harém', 'Harém Reverso');

COMMIT;

-- =============================================================================
-- CONFERÊNCIA — DEPOIS
-- =============================================================================
-- 1) Um display só. Esperado: uma linha, 'Harém', 'tag_tematica'.
-- SELECT DISTINCT display_name_pt, tier
-- FROM genre_taxonomy
-- WHERE display_name_pt ILIKE 'har%';
--
-- 2) Depois de renomear pelo Painel. Esperado: 0.
-- SELECT count(*) FROM curated_animes WHERE custom_tags @> ARRAY['Harém Reverso'];

-- =============================================================================
-- ROLLBACK da taxonomia (não desfaz a renomeação da curadoria)
-- =============================================================================
-- Acrescentar ao IN qualquer raw_name de reverso que a conferência ANTES mostrou
-- e que não esteja listado aqui.
--
-- UPDATE genre_taxonomy
-- SET display_name_pt = 'Harém Reverso'
-- WHERE raw_name IN ('Male Harem', 'Reverse Harem', 'Harém Reverso');