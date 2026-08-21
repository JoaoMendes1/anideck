# `sql/` — DDL versionado

Até agora as views e tabelas do AniDeck viviam **só no painel do Supabase**. Se o projeto
fosse perdido ou precisasse ser recriado do zero, essa lógica sumiria junto — é a dívida
técnica 2.1 do backlog de Estatísticas.

Esta pasta começa a pagar essa dívida. Ela **não** é um sistema de migrations automático:
nada aqui roda sozinho no deploy. É um registro em ordem de aplicação, para ser colado no
SQL Editor do Supabase.

## Como usar

Rode os arquivos em ordem numérica. Todos foram escritos para ser idempotentes
(`IF NOT EXISTS`, `CREATE OR REPLACE`, `ON CONFLICT`), então reexecutar não quebra nada.

| Arquivo | O que faz |
|---|---|
| `001_anime_metadata_cache_tags.sql` | Adiciona `tags` e `season_year` ao cache de metadados |
| `002_genre_taxonomy.sql` | Cria e popula a taxonomia própria do AniDeck (3 camadas) |
| `003_view_user_genre_affinity.sql` | Reescreve a view de afinidade usando a taxonomia (reconciliado com a definição real que estava no Supabase) |
| `004_estatisticas_avancadas.sql` | Views novas: animes por gênero (drill-down), marcações cruas (sessões) e anime esquecido |
| `005_remove_coluna_progress.sql` | ⚠️ Destrutivo e fora de ordem — só depois do deploy, ver instruções no próprio arquivo |
| `006_views_existentes.sql` | DDL real das 9 views que só existiam no painel (fecha a dívida 2.1) |
| `007_drilldown_por_ano.sql` | View que lista os animes de cada ano de estreia |

Depois de aplicar, rode uma vez `POST /api/admin/metadata/resync` (autenticado como admin)
para reprocessar os animes que já estavam no deck. Sem isso, só animes salvos **depois** da
mudança teriam tags e ano de estreia no cache.

## Regras

1. **Toda view que expõe dado de usuário precisa de `WHERE user_id = auth.uid()` explícito.**
   Uma view no Postgres roda no contexto de quem a criou, não de quem consulta — ela não
   herda a RLS da tabela base. Sem o filtro, um usuário enxerga as linhas dos outros.
2. **Alteração nova em banco vira arquivo aqui**, numerado na sequência, antes de ser
   aplicada no Supabase.

## Cobertura

Todas as views e tabelas de estatísticas estão versionadas. O `006` foi extraído com
`pg_get_viewdef` direto do banco, não reconstruído de memória — é o SQL real.

Para trazer uma view nova (ou conferir se alguma divergiu do que está aqui):

```sql
SELECT pg_get_viewdef('nome_da_view'::regclass, true);
```
