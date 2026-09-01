# `sql/` — DDL versionado

Registro em ordem de aplicação das alterações de banco do AniDeck. **Não é um sistema de
migrations automático:** nada roda sozinho no deploy. Cada arquivo é colado à mão no SQL
Editor do Supabase.

## Como usar

> ⚠️ **Estes arquivos NÃO são idempotentes em conjunto.**
> Rodar tudo do começo reverte correções: o `008` conserta a view que o `006` cria, e o
> `015` acrescenta uma coluna que o `006` não tem. Reaplicar o `006` desfaz os dois, sem
> erro nenhum.
>
> Aplique **apenas** os arquivos ainda não aplicados, na ordem numérica, e registre a data
> na tabela abaixo.

Para saber a definição real de uma view no banco agora:

```sql
SELECT pg_get_viewdef('nome_da_view'::regclass, true);
```

## Arquivos

| Arquivo | O que faz | Aplicado |
|---|---|---|
| `001_anime_metadata_cache_tags.sql` | Adiciona `tags` e `season_year` ao cache de metadados | 21/08/2026 |
| `002_genre_taxonomy.sql` | Cria e popula a taxonomia própria (3 camadas) | 21/08/2026 |
| `003_view_user_genre_affinity.sql` | ⚰️ **Morto.** Redefinido pelo `008` e de novo pelo `013` | 21/08/2026 |
| `004_estatisticas_avancadas.sql` | Views de drill-down, marcações cruas e anime esquecido | 21/08/2026 |
| `005_remove_coluna_progress.sql` | ⚠️ Destrutivo — ver instruções no próprio arquivo | 21/08/2026 |
| `006_views_existentes.sql` | DDL das 9 views que só existiam no painel | 21/08/2026 |
| `007_drilldown_por_ano.sql` | View que lista os animes de cada ano de estreia | 21/08/2026 |
| `008_correcoes_maratona_e_taxonomia.sql` | Filtra maratonas implausíveis; camada `ignorado` | 21/08/2026 |
| `009_curation_suggestions.sql` | Fila de sugestões do Olheiro + tabela `app_admins` (espelha o admin no banco para a RLS) | ~21/08/2026 |
| `010_olheiro_rpcs.sql` | ⚰️ **Morto.** A view voltou a ter lógica própria no `013`; as RPCs perderam uso com o `011` | ~21/08/2026 |
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

Datas com `~` são a data do commit, não da aplicação no Supabase.

`snapshot_schema.sql` está fora desta lista de propósito — é retrato para consulta, não
migration. Ver o cabeçalho do arquivo.

## Regras

1. **Toda view que expõe dado de usuário precisa de `WHERE user_id = auth.uid()`
   explícito.** View no Postgres roda no contexto de quem a criou, não de quem consulta.
2. **Alteração nova vira arquivo novo**, numerado na sequência. Nunca editar arquivo já
   aplicado — quem já rodou não roda de novo, e a correção se perde.
3. **Registrar a data na tabela** no mesmo commit da aplicação.
4. **Passos manuais fora dos arquivos:** o `009` exige um `INSERT` em `app_admins` com o
   UUID do `ADMIN_USER_ID`, rodado à mão (o valor não entra no repositório, que é público).
   Banco recriado do zero sem esse passo tem a curadoria bloqueada pela RLS.