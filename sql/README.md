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

| Arquivo | O que faz | Aplicado |
|---|---|---|
| `001_anime_metadata_cache_tags.sql` | Adiciona `tags` e `season_year` ao cache de metadados | 21/08/2026 |
| `002_genre_taxonomy.sql` | Cria e popula a taxonomia própria (3 camadas) | 21/08/2026 |
| `003_view_user_genre_affinity.sql` |  **Morto.** Redefinido pelo `008` e de novo pelo `013` | 21/08/2026 |
| `004_estatisticas_avancadas.sql` | ⚠️ **Parcialmente morto.** Views de drill-down, marcações cruas e anime esquecido — a `view_user_forgotten_anime` foi redefinida pelo `023` | 21/08/2026 |
| `005_remove_coluna_progress.sql` | ⚠️ Destrutivo — ver instruções no próprio arquivo | 21/08/2026 |
| `006_views_existentes.sql` | ⚠️ **Parcialmente morto.** DDL das 9 views que só existiam no painel — 4 delas foram redefinidas pelo `023` | 21/08/2026 |
| `007_drilldown_por_ano.sql` | View que lista os animes de cada ano de estreia | 21/08/2026 |
| `008_correcoes_maratona_e_taxonomia.sql` |  **Morto.** Filtrava maratonas implausíveis e criava a camada `ignorado`; a view de maratona foi redefinida pelo `023` e a de afinidade pelo `013` | 21/08/2026 |
| `009_curation_suggestions.sql` | Fila de sugestões do Olheiro + tabela `app_admins` (espelha o admin no banco para a RLS) | ~21/08/2026 |
| `010_olheiro_rpcs.sql` |  **Morto.** A view voltou a ter lógica própria no `013`; as RPCs perderam uso com o `011` | ~21/08/2026 |
| `011_olheiro_remove_cron.sql` | Remove o caminho de cron do `010`: o scan passou a rodar com o JWT do admin | ~22/08/2026 |
| `012_ranking_snapshots.sql` | Tabela de fotos do Top Global (indicador ▲/▼) | ~23/08/2026 |
| `013_precedencia_rotulos.sql` | Precedência campo a campo nos rótulos; `'ignorado'` como default | 24/08/2026 |
| `014_campos_curadoria.sql` | Colunas novas de curadoria (`custom_episodes` e outras), todas NULLABLE — NULL cai para a fonte seguinte | ~25/08/2026 |
| `015_quero_assistir_nas_stats.sql` | Acrescenta `quero_assistir` à `view_user_stats` | 26/08/2026 |
| `016_app_settings_rls.sql` | Fecha a escrita da `app_settings` a `is_admin()`; leitura segue pública | 28/08/2026 |
| `017_security_invoker_views.sql` | Liga `security_invoker` nas 16 views: a RLS da tabela-base passa a valer, o filtro `auth.uid()` vira segunda camada | 31/08/2026 |
| `018_rpcs_cron_sem_execute_publico.sql` | Revoga `EXECUTE` de `PUBLIC`/`anon`/`authenticated` nas duas RPCs do cron; acesso só via `service_role` | 31/08/2026 |
| `019_policies_initplan_e_sobreposicao.sql` | `(SELECT auth.uid())` nas 8 policies de usuário; policy de admin em `curated_animes` deixa de cobrir SELECT | 31/08/2026 |
| `020_anime_metadata_cache_rls.sql` | Fecha a escrita do cache de metadados a `is_admin()`; leitura segue pública | 01/09/2026 |
| `021_media_entries_cascade.sql` | FK de `media_entries` passa a `ON DELETE CASCADE`, padronizando com as outras quatro — sem isso, exclusão de conta falha | 01/09/2026 |
| `022_limite_cadastros_beta.sql` | Hook `before-user-created` que fecha o cadastro ao atingir `beta_signup_limit` (`app_settings`) — **exige ativação manual no painel**, ver Regras | 02/09/2026 |
| `023_watched_at_nulo_em_lote.sql` | Filtra `watched_at IS NOT NULL` em 6 views de tempo, para o preenchimento em lote de "Completo" não criar balde nulo em Atividade, Horário, Streak, Maratona e Anime Esquecido | 05/09/2026 |
| `024_ranking_hibrido.sql` | Cria a view `anime_community_scores` e a tabela `ranking_current_cache` para o motor híbrido e boot resiliente | 07/09/2026 |

Datas com `~` são a data do commit, não da aplicação no Supabase.

`snapshot_schema.sql` está fora desta lista de propósito — é retrato para consulta, não
migration. Ver o cabeçalho do arquivo.

### Views redefinidas pelo `023`

Registrado aqui porque a tabela acima não tem espaço para listar seis nomes, e porque a
próxima pessoa que for mexer numa delas precisa saber onde está a definição viva:

`view_user_activity` · `view_user_watch_dates` · `view_user_watch_hours` ·
`view_user_watch_timestamps` · `view_user_fastest_binge` · `view_user_forgotten_anime`

## Regras

1. **Toda view que expõe dado de usuário precisa de `WHERE user_id = auth.uid()`
   explícito** e de `WITH (security_invoker = on)`. As duas coisas, não uma. View no
   Postgres nasce rodando no contexto de quem a criou, não de quem consulta.
2. **Alteração nova vira arquivo novo**, numerado na sequência. Nunca editar arquivo já
   aplicado — quem já rodou não roda de novo, e a correção se perde.
3. **Registrar a data na tabela** no mesmo commit da aplicação.
4. **Passos manuais fora dos arquivos.** Banco recriado do zero precisa dos dois:
   - o `009` exige um `INSERT` em `app_admins` com o UUID do `ADMIN_USER_ID`, rodado à mão
     (o valor não entra no repositório, que é público). Sem ele, a curadoria fica bloqueada
     pela RLS;
   - o `022` exige ativar o hook em **Authentication → Hooks → Before User Created**,
     apontando para `public.hook_limite_cadastros`. Sem ele, o arquivo não tem efeito
     nenhum e o cadastro fica aberto.