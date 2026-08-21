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

Depois de aplicar, rode uma vez `POST /api/admin/metadata/resync` (autenticado como admin)
para reprocessar os animes que já estavam no deck. Sem isso, só animes salvos **depois** da
mudança teriam tags e ano de estreia no cache.

## Regras

1. **Toda view que expõe dado de usuário precisa de `WHERE user_id = auth.uid()` explícito.**
   Uma view no Postgres roda no contexto de quem a criou, não de quem consulta — ela não
   herda a RLS da tabela base. Sem o filtro, um usuário enxerga as linhas dos outros.
2. **Alteração nova em banco vira arquivo aqui**, numerado na sequência, antes de ser
   aplicada no Supabase.

## Ainda não versionado

O DDL destas views continua existindo apenas no Supabase. Não foram recriadas aqui porque
reconstruí-las de memória correria o risco de gerar SQL diferente do que está no ar:

`view_user_stats` · `view_user_activity` · `view_user_rating_distribution` ·
`view_user_year_distribution` · `view_user_watch_hours` · `view_user_watch_dates` ·
`view_user_longest_anime` · `view_user_top_rated` · `view_user_fastest_binge`

O jeito certo de trazer cada uma para cá é copiar o SQL real do painel do Supabase
(`Database → Views → ⋮ → Definition`) e salvar como um arquivo novo nesta pasta.
