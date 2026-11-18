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
| `044_tarefas_periodicas.sql` | Fase 16 (16.0, #166): tabela `tarefas_periodicas` com `UNIQUE (nome, periodo)` e função atômica `reservar_tarefa_periodica` (só `service_role`). Aplicar **antes** de promover o código | ~08/11/2026 |
| `045_cristais_economia.sql` | Fase 16 (16.1a, #167): tabela `crystal_ledger` (com RLS e UNIQUE para idempotência), RPCs `meu_saldo_cristais`, `creditar_cristais`, `debitar_cristais` com trava anti-saldo negativo e chave `economia_cristais` em `app_settings`. Aplicar **antes** de promover o código | ~08/11/2026 |
| `046_anicoins_transferencia.sql` | Fase 16: RPC `transferir_cristais` (só `service_role`) para transferência atômica de AniCoins entre usuários com advisory lock anti-saldo negativo e referências cruzadas únicas. Aplicar **antes** de promover o código | ~08/11/2026 |
| `047_missoes_diarias.sql` | Fase 16 (16.1b, #168): catálogo inicial de missões diárias em `app_settings` (chave `missoes_catalogo`). Aplicar **antes** de promover o código | ~08/11/2026 |
| `048_vitalidade_sql_bonus.sql` | Fase 16 (16.1c, #169): funções `vitalidade_atual(uuid)` e `minha_vitalidade()`; atualização de `mana_atual(uuid)` com taxa de recarga acelerada por Vitalidade alta. Aplicar **antes** de promover o código | ~09/11/2026 |
| `049_loja_cosmeticos.sql` | Fase 16 (16.2a e 16.2b, #170 e #171): tabelas `store_items`, `user_items` e `user_equipped`; RPCs `comprar_item` e `equipar_item`, trigger de vitrine 7 slots e seed de cosméticos. Aplicar **antes** de promover o código | ~09/11/2026 |
| `050_cartas_colecao.sql` | Fase 16 (16.3a, 16.3b e 16.3c, #172, #173 e #174): tabelas `user_cards` e `favorite_characters`, gatilhos de criação automática de cartas, bônus de AniCoins para término real, recálculo diário de raridade e RPC `duelo_de_gosto`. Aplicar **antes** de promover o código | ~09/11/2026 |
| `051_rankings_temporada_genero_liga.sql` | Fase 16 (16.4a, 16.4b e 16.4c, #175, #176 e #177): ranking da temporada em `ranking_membros`, tabela de cache `ranking_genero`, liga com divisões `liga_participacoes` e clima da temporada em `top_reacoes_temporada`. Aplicar **antes** de promover o código | ~09/11/2026 |
| `052_apoiador_config.sql` | Fase 16 (16.5, #178): configuração de apoio comunitário em `app_settings` (`apoiador_config`) e cosméticos exclusivos de Apoiador em `store_items`. Aplicar **antes** de promover o código | ~09/11/2026 |
| `053_caixa_loja_devolucao_avatar.sql` | Fase 16 (#198): Caixa/Cofre da plataforma no `crystal_ledger`, RPC `sacar_caixa_loja`, RPC `devolver_item` com taxa retida, cosméticos da Temporada 1, `apoiador` e `avatar_url` em `profiles`. Aplicar **antes** de promover o código | ~09/11/2026 |
| `054_clas_sistema.sql` | Fase 17 (17.1a, #180): Clãs temáticos — tabelas `clas`, `cla_membros`, `cla_historico_saida`, `cla_convites`, `cla_denuncias`, RPCs seguras de criação, entrada, saída, transferência, moderação e consulta com XP semanal. Aplicar **antes** de promover o código | ~09/11/2026 |
| `055_cla_desafio_semanal.sql` | Fase 17 (17.1b, #181): Desafio semanal coletivo do clã — tabela `cla_desafios`, meta proporcional, agregação de progresso no SQL, RPCs `obter_desafio_semanal_cla`, `meu_desafio_cla_resumo` e fechamento semanal com AniCoins. Aplicar **antes** de promover o código | ~12/11/2026 |
| `056_cla_liga_temporada.sql` | Fase 17 (17.1c, #182): Liga de clãs por temporada — ranking com média dos 10 melhores membros, tabela `cla_temporadas_campeoes`, cosméticos exclusivos e premiação em AniCoins no fechamento. Aplicar **antes** de promover o código | ~12/11/2026 |
| `057_salas_estreia.sql` | Fase 17 (17.2, #183 e #184): Sala de estreia — chat ao vivo nas 3h pós-lançamento, rate-limit de 3s, migração de destaques para `episode_comments` e limpeza de mensagens com mais de 30 dias. Aplicar **antes** de promover o código | ~13/11/2026 |
| `058_chefao_temporada.sql` | Fase 17 (17.3, #185): Chefão da Temporada — tabela `chefoes`, cálculo agregado de dano no SQL via `xp_ledger` (Armadilha 28), RPCs `obter_chefao_atual` e `pagar_recompensas_chefao` idempotente com AniCoins. Aplicar **antes** de promover o código | ~13/11/2026 |
| `059_permissoes_chefao_temporada.sql` | Fase 17 (17.3, #185): Permissões de EXECUTE (GRANT) e sobrecarga sem argumentos para `obter_chefao_atual`, e calibração de HP da temporada | ~13/11/2026 |
| `060_unificar_rpc_chefao.sql` | Fase 17 (17.3, #185): Remove sobrecarga sem parâmetros que causava o erro PGRST203 e mantém a função única canônica `obter_chefao_atual(p_temporada TEXT)` | ~13/11/2026 |
| `061_titulos_previsoes_classes.sql` | Fase 17 (17.4, #186, #187, #189): Classes de RPG no perfil (Bardo, Ranger, Paladino), títulos equipáveis e sistema de Previsões apostando Mana | ~13/11/2026 |
| `062_convites_recompensas_e_toggle_previsoes.sql` | Fase 17 (17.4 e 17.5b, #187 e #191): Toggle de controle de previsões em comunidade_regras e sistema completo de convites com recompensas ajustáveis e Convite VIP do Administrador | ~13/11/2026 |
| `063_anideck_wrapped.sql` | Fase 17 (17.5a, #190): AniDeck Wrapped — retrospectiva anual agregada no SQL (Armadilhas 3, 4 e 28), RPC `anideck_wrapped` para histórias e compartilhamento | ~13/11/2026 |
| `064_curadoria_colaborativa.sql` | Fase 17 (17.7, #188): Curadoria colaborativa — tabela `curation_collab_suggestions`, validação de rank mínimo/limite diário, RPCs `submeter_sugestao_curadoria` e `admin_revisar_sugestao_curadoria` com recompensa em Cristais | ~13/11/2026 |
| `065_avatar_montavel.sql` | Fase 17 (17.6, #192): Avatar montável em camadas — coluna `avatar_custom` em `profiles` e RPC `salvar_avatar_customizado` | ~13/11/2026 |
| `066_personagem_rpg.sql` | Fase 18 (18.1a, #199): Personagem do jogador — tabela `rpg_personagens` (uma linha por usuário, só identidade), RLS de dono só para leitura e RPC `despertar_personagem` idempotente | ~14/11/2026 |
| `067_avatar_montavel_user_id.sql` | Correção (#203): recria `salvar_avatar_customizado` filtrando por `user_id` (o `065` usava `id`, coluna que `profiles` não tem), com teto de tamanho e resposta `sem_perfil` para quem não tem linha em `profiles`. Definição viva da função | ~14/11/2026 |
| `068_personagem_visual.sql` | Fase 18 (18.2a, #218): Visual escolhido pelo jogador — coluna `visual_equipado` em `rpg_personagens` (NULL = automático), só com o formato conferido; a regra de desbloqueio fica no Go, que grava pelo service role | ~15/11/2026 |
| `069_loja_cenarios.sql` | Fase 18 (18.2b, #219): Cenários de fundo do personagem na Loja — tipo e slot `cenario` nos `CHECK` de `store_items` e `user_equipped`, `equipar_item` recriada com o slot novo e quatro cenários no catálogo | ~15/11/2026 |
| `070_loja_auras.sql` | Fase 18 (18.2e, #220): Auras do personagem na Loja — tipo e slot `aura` nos `CHECK` de `store_items` e `user_equipped`, `equipar_item` recriada com o slot novo e três auras no catálogo | ~15/11/2026 |
| `071_rpg_equipamentos.sql` | Fase 18 (18.2d e 18.3a, #221): Equipamentos do personagem — catálogo `rpg_itens`, `rpg_inventario` e `rpg_equipados` só com leitura do dono, RPCs `rpg_garantir_kit_inicial` e `rpg_equipar_item` (posse, slot e nível) e o catálogo inicial de 17 itens | ~15/11/2026 |
| `072_rpg_batalhas.sql` | Fase 18 (18.4a, #222): Expedições — `rpg_monstros`, `rpg_recursos` (bilhetes), `rpg_batalhas`, `rpg_batalhas_hoje()` e `rpg_registrar_batalha()` só para o service role, com limite diário travado por usuário; oito monstros iniciais | ~15/11/2026 |
| `073_rpg_invocacao.sql` | Fase 18 (18.6a, #223): Invocação gratuita — `rpg_invocacoes` (histórico), `rpg_chances_invocacao()`, `rpg_estado_invocacao()` e `rpg_invocar(1 ou 10)`, com débito, sorteio e garantia de épico a cada 10 na mesma transação | ~15/11/2026 |
| `074_loja_skins.sql` | Fase 18 (18.2c, #224): Skins na Loja — tipo `skin` no `CHECK` de `store_items` e quatro trajes; a skin não ocupa slot, veste-se por `visual_equipado` | ~15/11/2026 |
| `075_rpg_ajustes.sql` | Fase 18 (#225): `search_path` fixo e sem `anon` em `rpg_chances_invocacao`; policies de admin de `rpg_itens` e `rpg_monstros` com `(SELECT is_admin())` | ~15/11/2026 |
| `076_rpg_estado_jogador.sql` | Fase 18 (#226): `rpg_estado_jogador()` devolve personagem, soma do XP, inventário, slots, bilhetes, cenário, aura e skins numa consulta só, com a RLS de quem chama; sem ela, o Go cai na leitura tabela por tabela | ~15/11/2026 |
| `077_rpg_atributos.sql` | Fase 18 (18.3b, #227): `rpg_atributos` guarda os pontos distribuídos nos seis primários; `rpg_distribuir_pontos` confere o total contra `nível / 2` no banco; `rpg_estado_jogador` passa a trazer os pontos. Depende do 076 | ~15/11/2026 |
| `078_rpg_reforco_monstros.sql` | Fase 18 (18.4a, #229): reforço de Vida, Ataque e Defesa dos seis monstros pós-tutorial (`lobo_sombrio` ao `primordial_esquecido`) após os atributos e habilidades da #227 | ~16/11/2026 |
| `079_vitalidade_mana_por_nivel.sql` | Fase 18 (#234): `mana_maxima(uuid)` escalada pelo nível do jogador (`mp_max + mp_por_nivel * (nivel - 1)` até `mp_max_teto`), `mana_atual(uuid)` com regeneração proporcional ao teto do jogador + bônus de Paladino (+5/dia) e de Vitalidade alta (+25%), e novos parâmetros `mp_por_nivel=1` e `mp_max_teto=120` em `app_settings.comunidade_regras` | ~16/11/2026 |
| `080_rpg_elenco.sql` | Fase 18 (#238): `CHECK` de `rpg_personagens.personagem_base` com os seis personagens do elenco; `despertar_personagem(p_nome, p_base)` com padrão `espadachim_eter`, no lugar da versão só com o nome. Aplicar antes de promover: sem ele, só o Espadachim desperta | ~17/11/2026 |
| `081_rpg_vida_e_ouro.sql` | Fase 18.5a (#239): Vida persistente como perda em por mil (`vida_perdida`, `vida_em`) e `ouro` em `rpg_recursos`; `rpg_recuperacoes` (uma linha por origem); regeneração na leitura (`rpg_vida_perdida_agora`); gatilho em `xp_ledger` que recupera 8% por episódio, até 5 por dia; `rpg_batalhas_hoje()` redefinida (definição viva, antes no `072`); `rpg_concluir_batalha()` e `rpg_recuperar_vida()` só para o service role. **Aplicar antes de promover** | 17/11/2026 |
| `082_rpg_invocacao_rara.sql` | Fase 18.6a (#240): `rpg_chances_invocacao`, `rpg_estado_invocacao` e `rpg_invocar` redefinidas (definição viva, antes no `073`): Ouro 78%, Raro 17%, Épico 4,5%, Lendário 0,5%, sem Comum; garantias de Raro (10) e Lendário (crescente de 70, certa em 90) com `invocacoes_sem_raro` e `invocacoes_sem_lendario`; `rpg_chance_lendario()`; `ouro` em `rpg_invocacoes`; bilhetes por vitória de 1 a 3. Corrige a reserva que dava Lendário no lugar de Comum. **Depois do `081`, antes de promover** | 17/11/2026 |
| `083_rpg_aprimoramento.sql` | Fase 18.3d (#241): `aprimoramento` (0 a 10) em `rpg_inventario`; histórico `rpg_aprimoramentos`; `rpg_aprimorar_item()` só para o service role (confere posse, nível esperado, teto e Ouro); `rpg_estado_jogador()` redefinida com `aprimoramento` e `ouro` (definição viva, antes no `077`). **Aplicar antes de promover** | 17/11/2026 |
| `084_rpg_maestria.sql` | Fase 18.3e (#242): `rpg_maestria` (usos por habilidade); `rpg_registrar_maestria()` só para o service role; `rpg_estado_jogador()` redefinida com `maestria` (definição viva, antes no `083`). **Depois do `083`, antes de promover** | 17/11/2026 |
| `085_rpg_bestiario.sql` | Fase 18.4b (#243): `rpg_batalhas_hoje()` com `vitorias` por monstro e `rpg_concluir_batalha()` com +10% de Ouro por marco (10, 50 e 150 vitórias), mesma assinatura (definição viva das duas, antes no `081`); índice parcial `rpg_batalhas_vitorias`. **Antes de promover** | 17/11/2026 |
| `086_rpg_monstros_sem_item_comum.sql` | Correção (#244): `chance_item = 0` para os monstros de item comum enquanto não houver item comum fora do kit. Dado de catálogo, aplicável a qualquer momento | 17/11/2026 |
| `087_missoes_com_xp.sql` | Fase 16.7a e 16.7b (#245, #246): `xp_ledger` aceita `mal_id = 0` (XP sem episódio; o CHECK do `039` é trocado pela definição); `xp_extra` (uma linha por origem, o id vira o `episode_number`); `conceder_xp_extra()` e `resgatar_missao()` (AniCoins e XP na mesma transação) só para o service role; remove `missoes_catalogo` de `app_settings`. **Antes de promover** | 17/11/2026 |
| `088_convite_resgate.sql` | Correção (#247): `resgatar_codigo_convite` redefinida (definição viva, antes no `062`) sem a coluna inexistente `saldo_apos` e com o XP do anfitrião por `conceder_xp_extra()`. **Depois do `087`** | 17/11/2026 |
| `089_perfil_publico_detalhado.sql` | Fase 16.7c (#248): `perfil_publico` redefinida (definição viva, antes no `041`) com `generos`, `horas_assistidas`, `missoes_concluidas` e `rpg` (vitórias, monstros, Lendários e maior aprimoramento). **Depois do `083`, antes de promover** | 17/11/2026 |
| `090_rpg_queda_e_vida_minima.sql` | Fase 18.3f (#250): `rpg_regras_vida()` com `vida_minima_luta` (300) e `queda_ouro_pct` (10) (definição viva, antes no `081`); `rpg_batalhas.ouro_perdido`; `rpg_concluir_batalha()` com a mesma assinatura recusa abaixo de 30% de Vida e desconta 10% do Ouro na queda (definição viva, antes no `085`). **Antes de promover** | — |
| `091_rpg_masmorras.sql` | Fase 18.4d (#251): `rpg_masmorras_execucoes` (uma por usuário e dia, RLS de leitura própria) e `rpg_concluir_masmorra()` só para o service role, com o Ouro e os bilhetes contados pelo catálogo, bônus de completar, queda e item do baú. **Depois do `090`, antes de promover** | — |
| `092_rpg_expedicao_de_cla.sql` | Fase 18.5c (#252): `rpg_cla_chefes`, `rpg_cla_ataques` (um por usuário e dia) e `rpg_cla_recompensas`, com leitura só para os membros; `rpg_semana_atual()`; e só para o service role `rpg_cla_expedicao_estado()`, `rpg_cla_garantir_chefe()` e `rpg_cla_atacar()` (paga Ouro e bilhetes a quem atacou no golpe final, com trava por clã). **Antes de promover** | — |
| `093_rpg_duelos.sql` | Fase 18.5b (#253): `rpg_duelos` (RLS de leitura para os dois lados), `rpg_inicio_da_temporada()`, e só para o service role `rpg_duelos_estado()` (oponentes sem user_id e ranking do trimestre), `rpg_ficha_de_duelo()` (ficha no formato de `rpg_estado_jogador`) e `rpg_registrar_duelo()` (3 por dia, um por oponente, pontos e Ouro só na vitória). **Depois do `090`, antes de promover** (o `092` vem antes na ordem dos arquivos) | — |
| `094_rpg_evento_da_temporada.sql` | Fase 18.5d (#254): `rpg_evento_batalhas` (uma por usuário e dia) e `rpg_evento_premios` (um por temporada), com leitura própria; `rpg_evento_registrar()` só para o service role, que recusa temporada passada e, na meta, paga Ouro e põe o título em `profiles.titulos_desbloqueados` (`TEXT[]`). **Antes de promover** | — |
| `095_convite_titulo.sql` | Correção (#255): `resgatar_codigo_convite` redefinida (definição viva, antes no `088`) com `array_append` e `= ANY(...)`, porque `profiles.titulos_desbloqueados` é `TEXT[]`; o convite de admin, o único que dá título, falhava inteiro. **Depois do `088`** | — |
| `096_fundar_cla_custo.sql` | #257 e #263: `config_inteira(chave, padrão)` lê número de `app_settings.value`, que é `TEXT`; `criar_cla` redefinida (definição viva, antes no `054`, que falhava sempre com o operador de `jsonb`) exige nível 15 e debita 300 AniCoins na mesma transação que cria o clã; `regras_fundar_cla()` pública lê os dois números. **Antes de promover** | — |
| `097_remover_classe_guilda.sql` | #258: `mana_atual` redefinida (definição viva, antes no `079`) sem o +5 MP do Paladino; `escolher_classe` removida. A coluna `profiles.classe` fica, porque o Wrapped (`063`) a lê. **Antes de promover** | — |
| `098_seguir_e_atividade.sql` | #259 e #260: `profiles.mostrar_atividade` (com `GRANT` por coluna), tabela `seguidores` (lê só as próprias linhas), índices por data, e funções só do service role: `atividade_eventos` (atualizada no `105`), `feed_comunidade`, `atividade_do_perfil`, `atividade_assistindo`, `social_resumo`, `social_seguir` e `social_bloqueados`. **Antes de promover** | — |
| `099_titulo_so_por_funcao.sql` | #262: revoga `UPDATE` direto em `profiles.classe` e `profiles.titulo_ativo`; o título só muda por `equipar_titulo`. **Depois do `061`** | — |
| `100_clas_entrar_e_meu_cla.sql` | #263: `entrar_cla` e `obter_meu_cla` redefinidas (definição viva, antes no `054`) com `config_inteira`; falhavam sempre porque liam `app_settings.value` (`TEXT`) com operador de `jsonb`. **Depois do `096`** | — |
| `101_missoes_evidencias_e_reavaliacao.sql` | Fase 18.8b (#266): tabelas `missoes_resgates` e `missoes_evidencias`, `reavaliar_missoes(uuid)` e gatilhos em episódios, comentários, reações e cartas; estorna XP de missão e de convite quando zera episódios (`resgatar_missao` redefinida do `087` e `resgatar_codigo_convite` redefinida do `095`, definições vivas). **Antes de promover** | — |
| `102_revisoes_e_saida_completo.sql` | Fase 18.8c (#267): `media_entries.completado_em`, tabela `revisoes`, trava de 0 XP em revisão ativa, `previa_saida_completo()` (simulação em subtransação abortada) e `executar_saida_completo()`. **Depois do `101`, antes de promover** | — |
| `103_faixas_xp_e_fila_pendente.sql` | Fase 18.8d (#268): parâmetros das três faixas em `app_settings.guilda_economia` (`value::jsonb`), tabela `xp_pendente` (acervo 15%), gatilho em `episode_progress` (`watched_at IS NULL`), `liberar_xp_pendente()` FIFO (teto diário próprio de 50 XP dentro dos 180 XP) e `remover_xp_ao_desmarcar_episodio()` redefinida do `039`. **Depois do `102`, antes de promover** | — |
| `104_estornos_e_remarcacao.sql` | Fase 18.8e (#269): tabela `estornos` e trava de 7 dias ao remarcar em `xp_ledger` e `xp_pendente`; `remover_xp_ao_desmarcar_episodio()` redefinida (definição viva, antes no `039` e `103`) preservando o menor `xp_original` dentro da janela. **Depois do `103`, antes de promover** | — |
| `105_feed_consistencia_e_limpeza.sql` | Correção (#270 e #272): gatilhos `limpar_progresso_ao_remover_entrada()` (ao apagar `media_entries`) e `limpar_completo_sem_episodios()` (rebaixar `Completo` e limpar carta ao zerar `episode_progress`), preenchimento retroativo de `Completo` antigo sem episódios (`watched_at NULL`, 0 XP e 0 `xp_pendente`, preservando status e cartas), índice `media_entries_completado_em_idx` e `atividade_eventos()` redefinida (definição viva, antes no `098`) exigindo episódio marcado para `completou`, `comentou` e `curtiu` e usando `completado_em`. **Depois do `103`, antes de promover** | — |
| `106_numeros_anime_e_em_alta.sql` | Comunidade (#271 e #272): RPCs agregadas `numeros_comunidade_anime(integer)` (contagens por status no AniDeck com piso de privacidade `< 3` e `total_aproximado`) e `animes_em_alta_comunidade(integer, integer)` (ranking por episódios, comentários e reações recentes com penalidade de drops, exclusão de acervo `watched_at IS NULL` e piso `< 3` em usuários ativos e drops). **Antes de promover** | — |
| `107_unificar_nome_exibicao.sql` | Perfil (#273): backfill de `auth.users.raw_user_meta_data.display_name` a partir de `public.profiles.nome` quando divergentes, preservando demais metadados. **Antes de promover** | — |
| `108_protecao_spoiler.sql` | Comunidade (#274): coluna `contem_spoiler` em `episode_comments`, `GRANT UPDATE`, e recriação em ordem de `atividade_eventos()`, `feed_comunidade()` e `atividade_do_perfil()` (definição viva, antes no `105`). **Depois do `105`, antes de promover** | — |
| `109_avaliacoes_e_missoes_avaliacao.sql` | Comunidade e Guilda (#276): tabela pública `anime_reviews` (mínimo 100 chars, nota 1..10 opcional, `contem_spoiler`, RLS por coluna exigindo `Completo` + episódio via `pode_avaliar_anime()`), evidência `'review_anime'` em `missoes_evidencias`, trava diária em `resgatar_missao()` e `reavaliar_missoes()` + gatilhos de estorno imediato em `anime_reviews`, `episode_comments` e `media_entries` (definições vivas de `reavaliar_missoes` e `resgatar_missao`, antes no `101`). **Depois do `108`, antes de promover** | — |
| `110_inicio_personalizavel.sql` | Início (#275): tabela `public.user_preferences` (`user_id`, `inicio_config jsonb`, `updated_at`) com RLS restrita ao próprio usuário e `GRANT` explícito por coluna. **Antes de promover** | — |
| `111_boas_vindas.sql` | Configuração inicial: `resgatar_boas_vindas()` (chamada pelo próprio usuário) dá 50 AniCoins e o título "Recém-desperto" uma única vez, só para contas criadas a partir de 18/11/2026. **Antes de promover** | — |
| `112_denuncias.sql` | Tabela `denuncias` (perfil e avaliação), `denunciar()` (no máximo 10 por dia, sem denunciar a si mesmo) e `moderacao_pendentes()`, que soma as quatro filas (perfil, avaliação, comentário e clã) para a campainha do admin. **Antes de promover** | — |
| `113_punicoes.sql` | Tabela `punicoes` com advertência, silenciar, multa, banir e bloquear e-mail; gatilhos que barram quem está silenciado em comentários, avaliações, reações e curtidas; `emails_bloqueados` com `normalizar_email()` (Gmail sem pontos, sem +apelido) e gatilho em `auth.users`; o CHECK de `xp_ledger.xp_earned` passa a aceitar negativo só em linha de multa. **Depois do `112`** | — |
| `114_hp_unico.sql` | HP único: `vitalidade_atual()` passa a ler a Vida de `rpg_recursos` (definição viva; antes `048`); `rpg_regras_vida()` ganha inatividade, Poção de Mana e Fonte termal; `rpg_aplicar_inatividade()` (tarefa diária `hp_inatividade`); `rpg_recuperar_vida()` aceita `pocao_mana` e `fonte` (definição viva; antes `081`). Colunas `fonte_em` e `inatividade_em` | — |
| `115_novidades.sql` | Tabelas `novidades` (título, resumo, categoria, até 6 caminhos internos, data e hora, chave "no meio da tela", ligada/desligada) e `novidades_vistas`; RLS de leitura para publicadas (admin lê todas); `novidades_nao_vistas()`, `marcar_novidades_vistas()`, e para o admin `salvar_novidade()`, `apagar_novidade()` e `novidades_alcance()` | — |
| `116_novidades_rascunhos.sql` | Colunas `novidades.chave` (única) e `rascunho`; `novidades_chaves_importadas` (chave apagada não volta); `importar_rascunho_novidade()` (service role, chamada no boot do site com `internal/handlers/novidades_rascunhos.json`); gatilho que tira o rascunho ao publicar. **Depois do `115`** | — |
| `117_novidades_lixeira.sql` | `novidades.apagada_em`; `apagar_novidade()` passa a mandar para a Lixeira (definição viva; antes `115`) e `restaurar_novidade()` traz de volta. **Depois do `116`** | — |
| `118_mana_nas_lutas.sql` | `rpg_mana_lutar(usuario, quantia)` (service role): cobra a Mana de uma luta ou devolve, com o perfil travado. Escala nova em `app_settings.comunidade_regras` (Mana 120 +12/nível até 999, recarga 60, comentário 12, custos das lutas em % da Mana máxima, Poção de Mana 40%, Ouro 200%). Definições vivas de `rpg_concluir_batalha` (antes `090`), `rpg_concluir_masmorra` (antes `091`) e `rpg_recuperar_vida` (antes `114`), com o Ouro e a poção pelas regras | — |
| `119_mercado_de_ouro.sql` | `rpg_itens.preco_ouro` e 7 itens novos (nível 12 a 18); preços só onde vazio; `rpg_compras`; `rpg_mercado()` e `rpg_comprar_item()` (autenticado: nível, posse e Ouro conferidos no banco) | — |
| `120_lutas_em_grupo.sql` | Lutas em grupo: `profiles.visto_em`, `convites_luta`, `convites_aviso`; tabelas `rpg_grupos` e `rpg_grupo_membros` (sem acesso direto); service role: `rpg_grupo_criar/aceitar/alvo/para_lutar/reabrir/concluir`, `rpg_motivo_sem_convite`; autenticado: `rpg_grupo_convidar/recusar/sair/estado`, `rpg_candidatos_grupo`, `rpg_convites_pendentes`, `marcar_online`, `preferencias_convite`, `salvar_preferencias_convite`. Trava e limite nas regras da comunidade. **Depois do `118`** | — |

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