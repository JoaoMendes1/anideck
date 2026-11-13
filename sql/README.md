# `sql/` — DDL versionado

Registro em ordem de aplicação das alterações de banco do AniDeck. **Não é um sistema de
migrations automático:** nada roda sozinho no deploy. Cada arquivo é colado à mão no SQL
Editor do Supabase.

## Como usar

> ⚠️ **Estes arquivos NÃO são idempotentes em conjunto.**
> Rodar tudo do começo reverte correções: o `008` conserta a view que o `006` cria, o
> `015` acrescenta uma coluna que o `006` não tem, e o `023` redefine seis views nascidas
> no `004`, `006` e `008`. Reaplicar um arquivo antigo desfaz tudo isso, sem erro nenhum.
>
> Aplique **apenas** os arquivos ainda não aplicados, na ordem numérica, e registre a data
> na tabela abaixo.

**Antes de editar ou reaplicar qualquer arquivo, procure o nome do objeto nos arquivos de
número maior.** A definição viva é a do número mais alto, não a do arquivo onde o objeto
nasceu. Desde o `017` isso ficou mais grave: reaplicar um `CREATE OR REPLACE VIEW` anterior
a ele também derruba o `security_invoker`, e a view volta a rodar como `postgres` sem nada
acusar.

Para saber a definição real de uma view no banco agora:

```sql
SELECT pg_get_viewdef('nome_da_view'::regclass, true);
```

## Arquivos

| Arquivo                                          | O que faz                                                                                                                                                                      | Aplicado    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `001_anime_metadata_cache_tags.sql`              | Adiciona `tags` e `season_year` ao cache de metadados                                                                                                                          | 21/08/2026  |
| `002_genre_taxonomy.sql`                         | Cria e popula a taxonomia própria (3 camadas)                                                                                                                                  | 21/08/2026  |
| `003_view_user_genre_affinity.sql`               | ⚰️ **Morto.** Redefinido pelo `008` e de novo pelo `013`                                                                                                                        | 21/08/2026  |
| `004_estatisticas_avancadas.sql`                 | ⚠️ **Parcialmente morto.** Views de drill-down, marcações cruas e anime esquecido — a `view_user_forgotten_anime` foi redefinida pelo `023`                                     | 21/08/2026  |
| `005_remove_coluna_progress.sql`                 | ⚠️ Destrutivo — ver instruções no próprio arquivo                                                                                                                               | 21/08/2026  |
| `006_views_existentes.sql`                       | ⚠️ **Parcialmente morto.** DDL das 9 views que só existiam no painel — 4 delas foram redefinidas pelo `023`                                                                     | 21/08/2026  |
| `007_drilldown_por_ano.sql`                      | View que lista os animes de cada ano de estreia                                                                                                                                | 21/08/2026  |
| `008_correcoes_maratona_e_taxonomia.sql`         | ⚰️ **Morto.** Filtrava maratonas implausíveis e criava a camada `ignorado`; a view de maratona foi redefinida pelo `023` e a de afinidade pelo `013`                            | 21/08/2026  |
| `009_curation_suggestions.sql`                   | Fila de sugestões do Olheiro + tabela `app_admins` (espelha o admin no banco para a RLS)                                                                                       | ~21/08/2026 |
| `010_olheiro_rpcs.sql`                           | ⚰️ **Morto.** A view voltou a ter lógica própria no `013`; as RPCs perderam uso com o `011`                                                                                     | ~21/08/2026 |
| `011_olheiro_remove_cron.sql`                    | Remove o caminho de cron do `010`: o scan passou a rodar com o JWT do admin                                                                                                    | ~22/08/2026 |
| `012_ranking_snapshots.sql`                      | Tabela de fotos do Top Global (indicador ▲/▼)                                                                                                                                  | ~23/08/2026 |
| `013_precedencia_rotulos.sql`                    | Precedência campo a campo nos rótulos; `'ignorado'` como default                                                                                                               | 24/08/2026  |
| `014_campos_curadoria.sql`                       | Colunas novas de curadoria (`custom_episodes` e outras), todas NULLABLE — NULL cai para a fonte seguinte                                                                       | ~25/08/2026 |
| `015_quero_assistir_nas_stats.sql`               | Acrescenta `quero_assistir` à `view_user_stats`                                                                                                                                | 26/08/2026  |
| `016_app_settings_rls.sql`                       | Fecha a escrita da `app_settings` a `is_admin()`; leitura segue pública                                                                                                        | 28/08/2026  |
| `017_security_invoker_views.sql`                 | Liga `security_invoker` nas 16 views existentes na época: a RLS da tabela-base passa a valer, o filtro `auth.uid()` vira segunda camada                                        | 31/08/2026  |
| `018_rpcs_cron_sem_execute_publico.sql`          | Revoga `EXECUTE` de `PUBLIC`/`anon`/`authenticated` nas duas RPCs do cron; acesso só via `service_role`                                                                        | 31/08/2026  |
| `019_policies_initplan_e_sobreposicao.sql`       | `(SELECT auth.uid())` nas 8 policies de usuário; policy de admin em `curated_animes` deixa de cobrir SELECT                                                                    | 31/08/2026  |
| `020_anime_metadata_cache_rls.sql`               | Fecha a escrita do cache de metadados a `is_admin()`; leitura segue pública                                                                                                    | 01/09/2026  |
| `021_media_entries_cascade.sql`                  | FK de `media_entries` passa a `ON DELETE CASCADE`, padronizando com as outras quatro — sem isso, exclusão de conta falha                                                       | 01/09/2026  |
| `022_limite_cadastros_beta.sql`                  | Hook `before-user-created` que fecha o cadastro ao atingir `beta_signup_limit` (`app_settings`) — **exige ativação manual no painel**, ver Regras                              | 02/09/2026  |
| `023_watched_at_nulo_em_lote.sql`                | Filtra `watched_at IS NOT NULL` em 6 views de tempo, para o preenchimento em lote de "Completo" não criar balde nulo em Atividade, Horário, Streak, Maratona e Anime Esquecido | 05/09/2026  |
| `024_ranking_hibrido.sql`                        | Cria a view `anime_community_scores` e a tabela `ranking_current_cache` para o motor híbrido e boot resiliente                                                                 | 07/09/2026  |
| `025_invoker_community_scores_e_search_path.sql` | Liga `security_invoker` na view que o `024` criou sem ele; fixa `search_path` na função do `022`                                                                               | 07/09/2026  |
| `026_ranking_current_cache_grant_morto.sql`      | Revoga o `GRANT SELECT` que o `024` deu a `anon`/`authenticated` e que a RLS já bloqueava                                                                                      | 08/09/2026  |
| `027_peso_voto_comunitario.sql`                  | Move o `pesoVotoComunitario` do `const` no `ranking.go` para `app_settings`                                                                                                    | 13/09/2026  |
| `028_storage_uso_bucket.sql`                     | Policy de `SELECT` no bucket `curadoria` para admin + RPC `uso_do_bucket_curadoria`                                                                                            | 13/09/2026  |
| `029_sinonimos_curadoria_pt.sql`                 | Entradas em português na `genre_taxonomy` para as tags que a IA gera                                                                                                           | 13/09/2026  |
| `030_unmapped_labels_detalhe.sql`                | Redefine `view_unmapped_labels` (passa a cobrir curadoria fora do deck) e cria `view_unmapped_labels_detalhe`                                                                  | 13/09/2026  |
| `031_gestao_taxonomia_e_tags.sql`                | RPCs de renomear e remover tag em lote (preservando a posição no array) + policies de escrita em `genre_taxonomy`                                                              | 13/09/2026  |
| `032_taxonomia_apoio.sql`                        | `Harém Reverso` ganha entrada em português + RPC `contar_animes_com_tag`                                                                                                       | 13/09/2026  |
| `033_unmapped_labels_catalogo.sql`               | As duas views de rótulo órfão passam a cobrir o catálogo inteiro (`anime_metadata_cache`), não só o deck de quem consulta                                                      | 13/09/2026  |
| `034_harem_unificado.sql` | Funde "Harém Reverso" em "Harém" na taxonomia | 18/09/2026 |
| `035_olheiro_tags.sql` | Pesos do Olheiro saem do código e vão para o banco, com FK na taxonomia | 19/09/2026 |
| `036_olheiro_limite.sql` | Limite de sugestões por scan vai para `app_settings` | 19/09/2026 |
| `037_olheiro_demanda.sql` | RPC da aba Demanda: anime em deck e fora do catálogo | 19/09/2026 |
| `038_fila_curadoria_ia.sql` | Fila da curadoria por IA (`ai_curation_queue`, só admin), RPC `pegar_proximo_da_fila_ia` (só service role) e chaves `ai_fila_*` e `ai_prompt_*_episodios` em `app_settings` | ~31/10/2026 |
| `039_guilda_xp_ledger.sql` | Tabela `xp_ledger` (com RLS e trigger de devolução em `episode_progress`), seed retroativo do histórico com `watched_at` real e chaves `guilda_*` em `app_settings` | ~08/11/2026 |
| `040_streak_no_fuso_de_brasilia.sql` | `view_user_watch_dates` agrupa os dias no fuso de Brasília, igual ao "XP de hoje" da Guilda | ~08/11/2026 |
| `041_comunidade_base.sql` | Fase 15: `profiles` (com GRANT por coluna), `episode_reactions`, `episode_comments` (escudo de spoiler na RLS), Mana cobrada por gatilho, `ativar_descanso`, curtidas, denúncias, bloqueios e as funções públicas `contagem_conversa`, `ranking_membros` e `perfil_publico`. Aplicar **antes** de promover o código da Fase 15 | ~08/11/2026 |
| `042_handle_reservado.sql` | Gatilho em `profiles`: @ reservado (admin, administrador, anideck...) só para quem está em `app_admins` | 08/11/2026 |
| `043_mais_reacoes.sql` | `episode_reactions` passa de 6 para 16 reações (troca o `CHECK`). Aplicar antes de promover o código | 08/11/2026 |
| `044_tarefas_periodicas.sql` | Fase 16 (16.0, #166): tabela `tarefas_periodicas` com `UNIQUE (nome, periodo)` e função atômica `reservar_tarefa_periodica` (só `service_role`). Aplicar **antes** de promover o código | — |
| `045_cristais_economia.sql` | Fase 16 (16.1a, #167): tabela `crystal_ledger` (com RLS e UNIQUE para idempotência), RPCs `meu_saldo_cristais`, `creditar_cristais`, `debitar_cristais` com trava anti-saldo negativo e chave `economia_cristais` em `app_settings`. Aplicar **antes** de promover o código | — |
| `046_anicoins_transferencia.sql` | Fase 16: RPC `transferir_cristais` (só `service_role`) para transferência atômica de AniCoins entre usuários com advisory lock anti-saldo negativo e referências cruzadas únicas. Aplicar **antes** de promover o código | — |
| `047_missoes_diarias.sql` | Fase 16 (16.1b, #168): catálogo inicial de missões diárias em `app_settings` (chave `missoes_catalogo`). Aplicar **antes** de promover o código | — |
| `048_vitalidade_sql_bonus.sql` | Fase 16 (16.1c, #169): funções `vitalidade_atual(uuid)` e `minha_vitalidade()`; atualização de `mana_atual(uuid)` com taxa de recarga acelerada por Vitalidade alta. Aplicar **antes** de promover o código | — |
| `049_loja_cosmeticos.sql` | Fase 16 (16.2a e 16.2b, #170 e #171): tabelas `store_items`, `user_items` e `user_equipped`; RPCs `comprar_item` e `equipar_item`, trigger de vitrine 7 slots e seed de cosméticos. Aplicar **antes** de promover o código | — |
| `050_cartas_colecao.sql` | Fase 16 (16.3a, 16.3b e 16.3c, #172, #173 e #174): tabelas `user_cards` e `favorite_characters`, gatilhos de criação automática de cartas, bônus de AniCoins para término real, recálculo diário de raridade e RPC `duelo_de_gosto`. Aplicar **antes** de promover o código | — |
| `051_rankings_temporada_genero_liga.sql` | Fase 16 (16.4a, 16.4b e 16.4c, #175, #176 e #177): ranking da temporada em `ranking_membros`, tabela de cache `ranking_genero`, liga com divisões `liga_participacoes` e clima da temporada em `top_reacoes_temporada`. Aplicar **antes** de promover o código | — |
| `052_apoiador_config.sql` | Fase 16 (16.5, #178): configuração de apoio comunitário em `app_settings` (`apoiador_config`) e cosméticos exclusivos de Apoiador em `store_items`. Aplicar **antes** de promover o código | — |
| `053_caixa_loja_devolucao_avatar.sql` | Fase 16 (#198): Caixa/Cofre da plataforma no `crystal_ledger`, RPC `sacar_caixa_loja`, RPC `devolver_item` com taxa retida, cosméticos da Temporada 1, `apoiador` e `avatar_url` em `profiles`. Aplicar **antes** de promover o código | — |
| `054_clas_sistema.sql` | Fase 17 (17.1a, #180): Clãs temáticos — tabelas `clas`, `cla_membros`, `cla_historico_saida`, `cla_convites`, `cla_denuncias`, RPCs seguras de criação, entrada, saída, transferência, moderação e consulta com XP semanal. Aplicar **antes** de promover o código | — |
| `055_cla_desafio_semanal.sql` | Fase 17 (17.1b, #181): Desafio semanal coletivo do clã — tabela `cla_desafios`, meta proporcional, agregação de progresso no SQL, RPCs `obter_desafio_semanal_cla`, `meu_desafio_cla_resumo` e fechamento semanal com AniCoins. Aplicar **antes** de promover o código | — |
| `056_cla_liga_temporada.sql` | Fase 17 (17.1c, #182): Liga de clãs por temporada — ranking com média dos 10 melhores membros, tabela `cla_temporadas_campeoes`, cosméticos exclusivos e premiação em AniCoins no fechamento. Aplicar **antes** de promover o código | — |
| `057_salas_estreia.sql` | Fase 17 (17.2, #183 e #184): Sala de estreia — chat ao vivo nas 3h pós-lançamento, rate-limit de 3s, migração de destaques para `episode_comments` e limpeza de mensagens com mais de 30 dias. Aplicar **antes** de promover o código | — |
| `058_chefao_temporada.sql` | Fase 17 (17.3, #185): Chefão da Temporada — tabela `chefoes`, cálculo agregado de dano no SQL via `xp_ledger` (Armadilha 28), RPCs `obter_chefao_atual` e `pagar_recompensas_chefao` idempotente com AniCoins. Aplicar **antes** de promover o código | — |
| `059_permissoes_chefao_temporada.sql` | Fase 17 (17.3, #185): Permissões de EXECUTE (GRANT) e sobrecarga sem argumentos para `obter_chefao_atual`, e calibração de HP da temporada | — |

Datas com `~` são a data do commit, não da aplicação no Supabase.

`snapshot_schema.sql` está fora desta lista de propósito — é retrato para consulta, não
migration. Ver o cabeçalho do arquivo.

### Views de rótulo órfão — `030` e `033`

A definição viva das duas está no `033`, não no arquivo onde nasceram:

`view_unmapped_labels` · `view_unmapped_labels_detalhe`

O `030` fez a primeira passar a ver a curadoria além do deck e criou a de detalhe.
O `033` trocou a base das duas de `media_entries` para `anime_metadata_cache`, e
com isso o filtro por `auth.uid()` saiu: elas não leem mais dado de usuário.

### Views redefinidas pelo `023`

Registrado aqui porque a tabela acima não tem espaço para listar seis nomes, e porque a
próxima pessoa que for mexer numa delas precisa saber onde está a definição viva:

`view_user_activity` · `view_user_watch_dates` · `view_user_watch_hours` ·
`view_user_watch_timestamps` · `view_user_fastest_binge` · `view_user_forgotten_anime`

## Regras

1. **Toda view que expõe dado de usuário precisa de `WHERE user_id = auth.uid()`
   explícito** e de `WITH (security_invoker = on)`. As duas coisas, não uma. View no
   Postgres nasce rodando no contexto de quem a criou, não de quem consulta — e nasce
   com o invoker desligado, que é o default. Já esqueceram uma vez: o `024` criou a
   `anime_community_scores` sem a cláusula e o `025` teve de consertar.
2. **Alteração nova vira arquivo novo**, numerado na sequência. Nunca editar arquivo já
   aplicado — quem já rodou não roda de novo, e a correção se perde.
3. **Registrar a data na tabela** no mesmo commit da aplicação.
4. **Regerar o `snapshot_schema.sql`** a cada arquivo novo. Ele é o retrato do banco de
   verdade; desatualizado, manda a próxima sessão trabalhar em cima de um estado que
   não existe mais.
5. **A `genre_taxonomy` é dado de aplicação, não schema.** Desde o `031` ela é
   editável pelo Painel de Controle → Rótulos, e as linhas criadas por lá **não
   entram no repositório**. Os arquivos `002`, `013`, `029` e `032` são só a
   semente inicial; o conteúdo vivo está no banco. Banco recriado do zero nasce
   com a semente e precisa recadastrar o que foi acrescentado pela tela.
6. **Passos manuais fora dos arquivos.** Banco recriado do zero precisa dos dois:
   - o `009` exige um `INSERT` em `app_admins` com o UUID do `ADMIN_USER_ID`, rodado à mão
     (o valor não entra no repositório, que é público). Sem ele, a curadoria fica bloqueada
     pela RLS;
   - o `022` exige ativar o hook em **Authentication → Hooks → Before User Created**,
     apontando para `public.hook_limite_cadastros`. Sem ele, o arquivo não tem efeito
     nenhum e o cadastro fica aberto.