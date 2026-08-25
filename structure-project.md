# Project Structure

```
├── client
│   ├── public
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   ├── manifest.json
│   │   └── sw.js
│   ├── src
│   │   ├── assets
│   │   │   ├── hero.png
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── components
│   │   │   ├── AbaOlheiro.tsx
│   │   │   ├── AnimeCard.tsx
│   │   │   ├── BotaoCopiar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Brand.tsx
│   │   │   ├── BuscaAniList.tsx
│   │   │   ├── ConfigIAModal.tsx
│   │   │   ├── CuradoriaPersonagens.tsx
│   │   │   ├── DeckCard.tsx
│   │   │   ├── DeckSkeleton.tsx
│   │   │   ├── DestaqueRailCard.tsx
│   │   │   ├── DestaquesRail.tsx
│   │   │   ├── EditarEntradaModal.tsx
│   │   │   ├── EpisodeGrid.tsx
│   │   │   ├── FilterChipGroup.tsx
│   │   │   ├── FilterSheet.tsx
│   │   │   ├── ImageUploadField.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── QuadranteAfinidade.tsx
│   │   │   ├── RankingCard.tsx
│   │   │   ├── RankingSkeleton.tsx
│   │   │   ├── ReorderableTags.tsx
│   │   │   ├── RotaProtegida.tsx
│   │   │   ├── SearchResultCard.tsx
│   │   │   ├── Sheet.tsx
│   │   │   ├── SheetDeAnimes.tsx
│   │   │   └── StatCard.tsx
│   │   ├── contexts
│   │   │   ├── CatalogoStatusContext.tsx
│   │   │   └── ToastContext.tsx
│   │   ├── hooks
│   │   │   ├── useContagemAnimada.ts
│   │   │   ├── useOlheiro.ts
│   │   │   ├── useRevealOnScroll.ts
│   │   │   └── useSheetBehavior.ts
│   │   ├── lib
│   │   │   ├── deckHelpers.ts
│   │   │   ├── filters.ts
│   │   │   └── supabase.ts
│   │   ├── pages
│   │   │   ├── Auth.tsx
│   │   │   ├── Busca.tsx
│   │   │   ├── Calendario.tsx
│   │   │   ├── Detalhes.tsx
│   │   │   ├── Estatisticas.tsx
│   │   │   ├── Landing.tsx
│   │   │   ├── MeuDeck.tsx
│   │   │   ├── PainelAdmin.tsx
│   │   │   └── Rankings.tsx
│   │   ├── types
│   │   │   └── curation.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── cmd
│   └── web
│       └── main.go
├── docs
│   ├── AGENTS.md
│   ├── ARMADILHAS.md
│   ├── DECISIONS.md
│   ├── DESIGN_TOKENS.md
│   ├── ESTATISTICAS_BACKLOG.md
│   ├── fluxo-busca.md
│   ├── ideias-para-melhorias.md
│   ├── PAGES.md
│   ├── README.md
│   ├── ROADMAP.md
│   └── VISAO_RANKING_CREDIVEL.md
├── internal
│   ├── anilist
│   │   ├── client_test.go
│   │   ├── client.go
│   │   ├── interface.go
│   │   ├── mock.go
│   │   └── models.go
│   ├── config
│   │   ├── env_test.go
│   │   └── env.go
│   ├── database
│   │   └── db.go
│   ├── entries
│   │   └── models.go
│   ├── handlers
│   │   ├── anime.go
│   │   ├── curation_ai.go
│   │   ├── curation_utils.go
│   │   ├── curation.go
│   │   ├── entries_test.go
│   │   ├── entries.go
│   │   ├── insights_test.go
│   │   ├── insights.go
│   │   ├── metadata_test.go
│   │   ├── metadata.go
│   │   ├── notifications.go
│   │   ├── olheiro.go
│   │   ├── ranking_test.go
│   │   ├── ranking.go
│   │   ├── search_test.go
│   │   ├── search.go
│   │   ├── stats.go
│   │   ├── streak_test.go
│   │   └── streak.go
│   ├── middleware
│   │   └── auth.go
│   └── models
│       └── curation.go
├── marketing
│   └── posts-instagram.html
├── prototipos
│   ├── config-ajuda-prototipo.html
│   └── logo.html
├── sql
│   ├── 000_schema_atual.sql
│   ├── 001_anime_metadata_cache_tags.sql
│   ├── 0013.sql
│   ├── 002_genre_taxonomy.sql
│   ├── 003_view_user_genre_affinity.sql
│   ├── 004_estatisticas_avancadas.sql
│   ├── 005_remove_coluna_progress.sql
│   ├── 006_views_existentes.sql
│   ├── 007_drilldown_por_ano.sql
│   ├── 008_correcoes_maratona_e_taxonomia.sql
│   ├── 009_curation_suggestions.sql
│   ├── 010_olheiro_rpcs.sql
│   ├── 011_olheiro_remove_cron.sql
│   ├── 012_ranking_snapshots.sql
│   └── README.md
├── supabase
├── go.mod
└── go.sum
```

# Project Structure

```
├── client
│   ├── public
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   ├── manifest.json
│   │   └── sw.js
│   ├── src
│   │   ├── assets
│   │   │   ├── hero.png
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── components
│   │   │   ├── AbaOlheiro.tsx
│   │   │   ├── AnimeCard.tsx
│   │   │   ├── BotaoCopiar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Brand.tsx
│   │   │   ├── BuscaAniList.tsx
│   │   │   ├── ConfigIAModal.tsx
│   │   │   ├── CuradoriaPersonagens.tsx
│   │   │   ├── DeckCard.tsx
│   │   │   ├── DeckSkeleton.tsx
│   │   │   ├── DestaqueRailCard.tsx
│   │   │   ├── DestaquesRail.tsx
│   │   │   ├── EditarEntradaModal.tsx
│   │   │   ├── EpisodeGrid.tsx
│   │   │   ├── FilterChipGroup.tsx
│   │   │   ├── FilterSheet.tsx
│   │   │   ├── ImageUploadField.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── QuadranteAfinidade.tsx
│   │   │   ├── RankingCard.tsx
│   │   │   ├── RankingSkeleton.tsx
│   │   │   ├── ReorderableTags.tsx
│   │   │   ├── RotaProtegida.tsx
│   │   │   ├── SearchResultCard.tsx
│   │   │   ├── Sheet.tsx
│   │   │   ├── SheetDeAnimes.tsx
│   │   │   └── StatCard.tsx
│   │   ├── contexts
│   │   │   ├── CatalogoStatusContext.tsx
│   │   │   └── ToastContext.tsx
│   │   ├── hooks
│   │   │   ├── useContagemAnimada.ts
│   │   │   ├── useOlheiro.ts
│   │   │   ├── useRevealOnScroll.ts
│   │   │   └── useSheetBehavior.ts
│   │   ├── lib
│   │   │   ├── deckHelpers.ts
│   │   │   ├── filters.ts
│   │   │   └── supabase.ts
│   │   ├── pages
│   │   │   ├── Auth.tsx
│   │   │   ├── Busca.tsx
│   │   │   ├── Calendario.tsx
│   │   │   ├── Detalhes.tsx
│   │   │   ├── Estatisticas.tsx
│   │   │   ├── Landing.tsx
│   │   │   ├── MeuDeck.tsx
│   │   │   ├── PainelAdmin.tsx
│   │   │   └── Rankings.tsx
│   │   ├── types
│   │   │   └── curation.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── cmd
│   └── web
│       └── main.go
├── docs
│   ├── AGENTS.md
│   ├── ARMADILHAS.md
│   ├── DECISIONS.md
│   ├── DESIGN_TOKENS.md
│   ├── ESTATISTICAS_BACKLOG.md
│   ├── fluxo-busca.md
│   ├── ideias-para-melhorias.md
│   ├── PAGES.md
│   ├── README.md
│   ├── ROADMAP.md
│   └── VISAO_RANKING_CREDIVEL.md
├── internal
│   ├── anilist
│   │   ├── client_test.go
│   │   ├── client.go
│   │   ├── interface.go
│   │   ├── mock.go
│   │   └── models.go
│   ├── config
│   │   ├── env_test.go
│   │   └── env.go
│   ├── database
│   │   └── db.go
│   ├── entries
│   │   └── models.go
│   ├── handlers
│   │   ├── anime.go
│   │   ├── curation_ai.go
│   │   ├── curation_utils.go
│   │   ├── curation.go
│   │   ├── entries_test.go
│   │   ├── entries.go
│   │   ├── insights_test.go
│   │   ├── insights.go
│   │   ├── metadata_test.go
│   │   ├── metadata.go
│   │   ├── notifications.go
│   │   ├── olheiro.go
│   │   ├── ranking_test.go
│   │   ├── ranking.go
│   │   ├── search_test.go
│   │   ├── search.go
│   │   ├── stats.go
│   │   ├── streak_test.go
│   │   └── streak.go
│   ├── middleware
│   │   └── auth.go
│   └── models
│       └── curation.go
├── marketing
│   └── posts-instagram.html
├── prototipos
│   ├── config-ajuda-prototipo.html
│   └── logo.html
├── sql
│   ├── 000_schema_atual.sql
│   ├── 001_anime_metadata_cache_tags.sql
│   ├── 0013.sql
│   ├── 002_genre_taxonomy.sql
│   ├── 003_view_user_genre_affinity.sql
│   ├── 004_estatisticas_avancadas.sql
│   ├── 005_remove_coluna_progress.sql
│   ├── 006_views_existentes.sql
│   ├── 007_drilldown_por_ano.sql
│   ├── 008_correcoes_maratona_e_taxonomia.sql
│   ├── 009_curation_suggestions.sql
│   ├── 010_olheiro_rpcs.sql
│   ├── 011_olheiro_remove_cron.sql
│   ├── 012_ranking_snapshots.sql
│   └── README.md
├── supabase
├── go.mod
├── go.sum
└── structure-project.md
```

# File Contents

## docs/AGENTS.md

````markdown
# AGENTS.md
> Instruções para qualquer IA (chat ou agente de código) que for trabalhar comigo neste
> repositório. Se você é uma ferramenta agentic (Claude Code, Cursor, Codex CLI, etc.), leia isso
> automaticamente antes de qualquer tarefa. Se for um chat que não lê arquivos de repositório
> sozinho, colei este conteúdo manualmente como primeira mensagem.
## Quem sou eu / como quero trabalhar
Considero-me **iniciante** na maior parte destas stacks — principalmente Go. Construo boa parte
do código com ajuda de IA, então:
- **Sempre explique o porquê**, não só o quê. Se uma escolha técnica não for óbvia, explique
antes de implementar.
- Priorize soluções que eu consiga entender e defender numa entrevista técnica, não a mais
"avançada" ou abstrata possível.
- Se eu pedir algo que pule uma etapa de entendimento, pode perguntar antes de simplesmente obedecer.
## Fluxo de trabalho obrigatório
1. **Toda alteração nasce de uma Issue** no GitHub Projects, escrita **antes** de qualquer código,
neste formato exato:
```markdown
Título: <tipo>: <descrição curta> #<número>
**🏷️ Labels:** `label1`, `label2`
### 🎯 Objetivo
[Descrição clara do problema/funcionalidade]
### 📋 Tarefas
- [ ] Passo técnico 1
- [ ] Passo técnico 2
### ✅ Critérios de Aceite
- [ ] Condição verificável de que está pronto
- [ ] Testes unitários criados (caminho feliz e cenários de erro) — obrigatório sempre que a
issue envolver lógica (handlers, validação, cálculo); dispensável em issues de
texto/estilo/documentação
```
2. **Toda alteração é feita primeiro na branch `staging`**, nunca direto em produção.
Ambientes de produção e homologação sobem desde o início do projeto (não só no final).
3. **Commits seguem este padrão:**
```
tipo(escopo): descrição curta (closes #NN)
```
Exemplo: `fix(ui): sanitiza dados de usuário e elimina XSS em termos/categorias (closes #46)`
### Fluxo de comandos Git (sequência completa)
```bash
# 1. Garantir que a staging local está atualizada
git checkout staging
git pull origin staging
# 2. Fazer as alterações no código
# (edição normal de arquivos)
# 3. Conferir o que mudou antes de commitar
git status
git diff
# 4. Adicionar e commitar no padrão do projeto
git add <arquivos alterados>
git commit -m "tipo(escopo): descrição curta (closes #NN)"
# 5. Subir para staging (dispara o deploy de homologação)
git push origin staging
# 6. Validar em homologação (URL de staging) antes de qualquer promoção
# 7. Quando validado, promover para produção
git checkout main
git pull origin main
git merge staging
git push origin main
```
**Tipos de commit usados:** `feat`, `fix`, `refactor`, `docs`, `chore` — seguido do escopo entre
parênteses (`ui`, `auth`, `db`, etc.) e sempre referenciando a issue com `closes #NN`.
4. **Comentários de código** explicam o quê **e** por quê. Não referenciar número de issue
(`#43`) dentro do código-fonte — isso fica só na issue e no commit, a menos que o contexto
histórico seja realmente necessário para entender uma decisão não óbvia.
5. **Segurança não é uma fase separada.** Qualquer funcionalidade que lide com input de usuário,
autenticação ou dados sensíveis já nasce com sanitização/validação — não se deixa para depois.
6. **Todo planejamento vive num `ROADMAP.md`** na raiz do projeto, organizado por fases
numeradas cronologicamente. Se uma fase revelar dívida técnica ou requisito novo, a correção
vira uma fase intermediária (ex: Fase 3.5), inserida entre as duas fases que a originaram —
nunca empilhada no final. O roadmap também deve marcar claramente **onde está o MVP**
(o corte mínimo publicável) e diferenciar isso de melhorias posteriores.
6.1. **Um `PAGES.md` complementa o roadmap**, rastreando status por página/tela em vez de por
fase — colunas: nome da página, status (⏳ só planejada / ⏳ só preview / ✅ prototipada /
implementada), e a fase do roadmap correspondente. Atualizar sempre que uma tela ganhar
protótipo visual novo. Ao planejar telas, unificar as que não justificam página própria
(ex: Configurações + Ajuda numa só) em vez de multiplicar páginas por padrão.
7. **CI automatizado no push para `staging`.** Um workflow do GitHub Actions roda `golangci-lint`
e `go test ./...` a cada push nessa branch. Se quebrar, corrige antes de promover para `main`.
Isso substitui verificação manual — configura uma vez, roda sozinho depois.
8. **Decisões técnicas estruturais vão para `DECISIONS.md`**, na raiz do projeto (não no
`ROADMAP.md`, para não duplicar). Formato de cada entrada:
`Data | Decisão | Por que escolhemos A em vez de B`. Só decisões que mudam arquitetura,
framework, banco de dados ou fluxo de auth entram lá — não é log de todo commit.
9. **Code review pré-commit — recomendado, não obrigatório em tudo.** Para mudanças não-triviais
(nova feature, lógica de autenticação, algo que mexe em dado sensível), colar a saída de
`git diff` no chat antes de commitar, pra eu revisar como um code reviewer (lógica idiomática,
segurança, legibilidade) antes do commit. Para ajustes pequenos (texto, estilo, correção
simples), não é necessário parar o fluxo pra isso — o objetivo é ganhar prática de revisão
real sem travar o ritmo do dia a dia.
10. **Verificação Cronológica de Dependências (Anti-Legacy):**
Antes de propor a importação de qualquer SDK, pacote externo ou API, você deve **obrigatoriamente cruzar a sua resposta com a linha do tempo atual do projeto**.
Não confie em dados de treinamento defasados. É terminantemente proibido introduzir pacotes obsoletos (deprecated), legados ou em End-of-Life (EOL). Se o ecossistema da ferramenta sofreu unificações ou mudanças estruturais recentes, exija e utilize a versão moderna e oficial. Se não tiver certeza absoluta do pacote atual, avise ou faça uma pesquisa antes de gerar o código.
11. **Armadilhas conhecidas.** Antes de mexer em SQL, view, JOIN, handler de leitura ou schema,
leia `docs/ARMADILHAS.md`. Se a tarefa toca a área de um item, responda a pergunta
obrigatória dele explicitamente na resposta, com o arquivo real na mão — não de memória.
Bug silencioso novo (o que não quebra, só devolve dado errado) vira item novo lá.
## Tom da conversa
Prefiro uma conversa natural com a IA, não uma troca robotizada de comandos. Pode explicar,
sugerir, discordar ou perguntar — o fluxo abaixo é sobre *processo* (como o código chega no
repositório), não sobre como a conversa deve soar.
## Convenções de nomenclatura do meu portfólio
Meus projetos vivem sob o hub **"JVM Systems — Portfolio Dev"**, que reúne todos os meus
projetos em produção como "módulos". Ao criar um projeto novo destinado a esse hub, use nome
provisório claro (ex: "NomeDoProjeto (nome provisório)") até eu confirmar o nome definitivo.
````

## docs/ARMADILHAS.md

```markdown
# ⚠️ ARMADILHAS.md — AniDeck
> **Para que serve:** este arquivo não ensina postura ("seja rigoroso", "investigue antes").
> Ele lista os modos de falha que **este projeto já sofreu de verdade**, cada um com o sintoma
> real observado e a pergunta que precisa ser respondida antes de mexer na área.
>
> **Para a IA que está lendo isto:** cada item abaixo tem uma **pergunta obrigatória**. Se a
> sua tarefa toca a área do item, responda a pergunta explicitamente na resposta — com o
> arquivo real na mão, não de memória. Se não tiver o arquivo, peça. Não responda "verifiquei"
> sem mostrar de onde tirou.
>
> Toda armadilha aqui nasceu de um bug que chegou a produção. A justificativa completa de cada
> uma está no `DECISIONS.md`, na data indicada.
---
## 1. 🌐 Rótulos de gênero existem em DOIS IDIOMAS
**Incidente (20/08/2026):** "Fantasia" aparecia duas vezes no ranking de Afinidade — uma com 13
animes, outra com 5.
**Causa:** gêneros chegam em inglês pelo `anime_metadata_cache` (`'Fantasy'`, vindo da AniList)
e em português pelo `curated_animes.custom_tags` (`'Fantasia'`, digitado à mão no Painel Admin).
O `GROUP BY` acontecia antes da tradução, então viravam duas chaves distintas.
**Onde mora o risco hoje:** a `genre_taxonomy` é chaveada por `raw_name` — o nome **como vem da
AniList**, em inglês. Qualquer `JOIN` entre um rótulo curado e essa tabela precisa resolver o
idioma antes, ou o rótulo curado simplesmente não encontra correspondência.
> **Pergunta obrigatória:** neste `JOIN` / `GROUP BY` / comparação de rótulos, de qual fonte vem
> cada lado e em que idioma? O que acontece com um rótulo em português que não bate com nenhum
> `raw_name`?
---
## 2. 🔒 Uma view no Postgres NÃO herda a RLS da tabela base
**Incidente (20/08/2026):** descoberto no Postman — o endpoint de estatísticas devolvia dados de
**dois usuários diferentes** no mesmo array.
**Causa:** RLS é aplicada nas *tabelas*. Uma view roda no contexto de **quem a criou** (o owner),
não de quem consulta. Confiar na RLS da tabela base é vazamento garantido.
**Regra:** toda view que expõe dado de usuário precisa de `WHERE user_id = auth.uid()`
**explícito**. Sem exceção, inclusive em views novas.
> **Pergunta obrigatória:** esta view expõe dado de usuário? Tem `auth.uid()` explícito? E as
> views que ela consulta por dentro, têm?
---
## 3. 🕐 O Postgres extrai hora em UTC — o navegador é quem sabe o fuso
**Incidente (21/08/2026):** o gráfico de Padrão de Horário estava deslocado em 3 horas.
**Causa:** `EXTRACT(HOUR FROM watched_at)` usa o fuso da sessão do Postgres, que no Supabase é
UTC. Quem está em UTC−3 via o gráfico inteiro fora do lugar.
**Regra:** conversão para hora local acontece **no navegador**, nunca no SQL. Agregações no banco
devem ser independentes de fuso (contar intervalos, não horas absolutas).
> **Pergunta obrigatória:** esta query extrai hora, dia ou data de um timestamp? Em qual fuso ela
> vai rodar, e quem faz a conversão para o fuso de quem está olhando?
---
## 4. ⏱️ `watched_at` grava quando foi MARCADO, não quando foi assistido
**Incidente (21/08/2026):** quem cadastrava o backlog inteiro numa sentada às 23h gerava 40
eventos noturnos, e o gráfico concluía que a pessoa era espectadora noturna.
**Correção adotada:** marcações separadas por menos de 2h contam como **uma sessão só**, e a
frase de insight só aparece com 10+ dias distintos de atividade.
> **Pergunta obrigatória:** esta métrica trata cada linha de `episode_progress` como um evento de
> comportamento independente? O que ela conclui de um import em lote de 40 episódios em 5 minutos?
---
## 5. 🕳️ `NULL` × array vazio significam coisas DIFERENTES em curadoria
**Convenção:** em campos de array de `curated_animes` (`custom_tags`, `custom_characters`, e os
campos novos do Bloco 2 da Fase 6.9):
- `NULL` = **não curado** → cai para a fonte seguinte (cache → AniList)
- array vazio `{}` = **curei e está vazio de propósito** → não cai para lugar nenhum
O `salvarDestaque` já faz isso certo para personagens. Generalizar é item aberto do Bloco 1.
> **Pergunta obrigatória:** este código distingue "campo não preenchido" de "campo esvaziado de
> propósito"? Um `COALESCE` genérico aqui apaga essa distinção?
---
## 6. ➕ Precedência NÃO é soma — `COALESCE` protege, `||` fura
**Regra do Bloco 1 (Fase 6.9), em uma frase:** para cada campo, se o valor curado existir ele
ganha; se estiver vazio, cai para o cache; se o cache não tiver, cai para a AniList ao vivo.
**Nunca soma as fontes.**
**Incidente:** `COALESCE(cur.custom_tags, c.genres, '{}') || COALESCE(c.tags, '{}')` — o
`COALESCE` respeita a precedência sobre `c.genres`, mas o `||` concatena `c.tags`
incondicionalmente. Sintoma: um anime curado com 3 tags exibiu 5+ rótulos em inglês, e
"Environmental" virou o card "Gênero Favorito".
> **Pergunta obrigatória:** neste ponto o dado curado **substitui** a fonte anterior ou é
> **somado** a ela? Tem algum `||`, `UNION` ou `array_cat` depois do `COALESCE`?
---
## 7. 🪪 `user_id` vem SEMPRE do JWT, nunca do payload
**Incidente (11/08/2026):** bug de IDOR que permitia transferência de posse via injeção de
`user_id` no corpo da requisição **reapareceu** (provável restore antigo). A correção é forçar
`entrada.UserID = userID` depois do decode.
**Segunda camada:** a RLS Policy de UPDATE no Supabase precisa de
`WITH CHECK (user_id = auth.uid())`.
> **Pergunta obrigatória:** este handler lê `user_id` de algum lugar que o cliente controla?
> Existe a segunda camada na policy, ou a defesa é só o código Go?
---
## 8. 📊 A fonte de verdade do progresso é `episode_progress`
**Incidente (20/08/2026, issue #65):** a `view_user_stats` contava o **total teórico de
episódios** para animes "Completo" e a coluna `media_entries.progress` para o resto — coluna que
nunca era escrita. Resultado: marcar um episódio não registrava minuto nenhum.
**Estado atual:** tempo assistido = contagem real de linhas em `episode_progress` ×
`duration_minutes` (fallback 24 min). A coluna `media_entries.progress` **foi removida**
(`sql/005`).
> **Pergunta obrigatória:** esta métrica deriva do que foi realmente marcado, ou do que
> teoricamente existe?
---
## 9. 🔢 A numeração de episódio 1..N é chave de fato — não renumerar
`episode_progress` referencia o **número** do episódio. Qualquer curadoria que reordene, insira
ou remova episódios (`custom_episodes`, Bloco 2) dessincroniza silenciosamente o progresso já
marcado pelos usuários. Não há erro, não há aviso — o usuário só vê episódio errado marcado.
> **Pergunta obrigatória:** esta mudança altera a numeração de algum episódio já existente?
---
## 10. 🌩️ A AniList é fonte única e já caiu duas vezes
**Incidentes:** encerramento do Jikan (28/07/2026) e API da AniList desativada globalmente com
403 (22/08/2026), derrubando Rankings, Busca, Meu Deck e Detalhes ao mesmo tempo.
**Dois efeitos práticos:**
- **Mapeamento de erro inconsistente:** a mesma falha virou 503 no ranking, 500 no detalhe e 502
no Olheiro. Falha de terceiro **nunca** deve virar 500 — 500 significa "meu código quebrou" e
manda o diagnóstico para o lado errado.
- **Rate limit mudou:** a AniList reduziu de 90 para **30 requisições/minuto**, com limitador de
burst separado. O debounce de 400ms da busca foi calculado em cima dos 90/min — a premissa
mudou e o `docs/fluxo-busca.md` ainda não foi atualizado.
> **Pergunta obrigatória:** o que este código faz quando a AniList responde 403, 429 ou timeout?
> O usuário vê "fonte externa indisponível" ou vê "erro"?
---
## 11. 🗄️ O `sql/` não é sistema de migrations — a ORDEM importa
Os arquivos em `sql/` são numerados e aplicados **à mão** no painel do Supabase, todos
idempotentes. Não há aplicação automática no deploy (isso exigiria credencial de owner do banco
no pipeline).
**Consequência:** a ordem entre deploy de código e aplicação de SQL é responsabilidade humana e
pode quebrar. Exemplo real: o `DROP COLUMN` do `sql/005` tinha que rodar **depois** do deploy —
a ordem inversa quebraria o insert.
**Agravante:** homologação e produção **compartilham o mesmo projeto Supabase**. Não existe
ambiente onde errar sem custo. Teste em homologação altera dado de produção.
> **Pergunta obrigatória:** este SQL precisa rodar antes ou depois do deploy do código? É
> reversível? Se não for, qual é o rollback?
---
## 🧭 Como manter este arquivo
- Toda vez que um bug **silencioso** chegar a produção (não quebrou, só devolveu dado errado),
ele vira um item aqui — com o sintoma real observado, não com a descrição teórica.
- Bug que quebra alto e claro **não** entra aqui. Este arquivo é sobre o que passa despercebido.
- A justificativa longa continua no `DECISIONS.md`. Aqui fica só o gatilho e a pergunta.
- Item que deixou de ser risco (código removido, coluna dropada) não é apagado — vira nota
histórica, para não ser reintroduzido por alguém que não viveu o incidente.
```

## docs/DECISIONS.md

```markdown
# 📑 DECISIONS.md — AniDeck
> Escopo: só decisões técnicas estruturais deste projeto.
| Data | Decisão | Por que escolhemos A em vez de B |
|---|---|---|
| 2026-08-22 | **Agente Olheiro roda sob demanda pelo Admin, não por cron** | O scan por cron exigia funções SECURITY DEFINER para contornar a RLS (o cron não tem JWT) — e função SECURITY DEFINER é chamável por qualquer um que tenha a anon key, exposta no bundle do frontend. Com o botão, a requisição carrega o JWT do admin, a policy do sql/009 vale para gravar e revisar, e o sql/011 derruba as três funções. Além da segurança: sugestão de curadoria não tem urgência (diferente da checagem de episódio novo, que justifica o cron duplo por causa do cold start do Render), e curadoria é atividade em rajada — a fila deve encher quando o admin senta para curar, não três dias antes. |
| 2026-08-21 | **Escopo da v1 fechado: Fases 6 e 8 arquivadas, Agente Olheiro retomado** | O `ROADMAP.md` tinha fases abertas que não seriam feitas, o que impedia o projeto de ter um fim definido — e projeto sem fim não pode ser apresentado como concluído. A Fase 6 (notícias por RSS) foi descartada: exigiria ingestão periódica e curadoria contínua de fontes sem resolver dor de quem usa o AniDeck para organizar o que assiste. Da Fase 8 sobraram só TWA (conta de desenvolvedor paga, política de loja, ciclo de review) e cache offline (o produto depende de dado vivo da AniList — offline entregaria versão degradada e bugs de sincronização); o objetivo real da fase já tinha sido entregue pelo PWA na 6.7. Em contrapartida, o Agente Olheiro saiu do pausado: a nota de 17/08 condicionava a retomada à definição da Fase 6.5, e a fórmula bayesiana está implementada. A v1 do Olheiro **sugere e não decide** — grava candidatos em `curation_suggestions` para aprovação manual no Admin, porque catálogo poluído automaticamente é mais caro de limpar do que de evitar. Sobram duas caixas abertas nas fases ativas: Olheiro v1 e indicador ▲/▼ do ranking. |
| 2026-08-21 | **Homologação e produção compartilham o mesmo projeto Supabase** | Separar exigiria duplicar migrações aplicadas à mão, secrets e seed de dados — trabalho recorrente incompatível com o tempo disponível, e sem ganho enquanto o único usuário é o próprio autor. **Consequência aceita:** teste em homologação altera dado de produção, e não existe ambiente onde errar sem custo. **Gatilho de revisão:** antes do primeiro convite do beta (Fase 7), ativar backup automático no Supabase e validar a restauração. Com usuário real, dado perdido deixa de ser reconstruível. |
| 2026-08-21 | **Padrão de Horário conta sessões, não episódios — e a hora é resolvida no navegador** | Dois erros no mesmo gráfico. Primeiro: `watched_at` grava quando o episódio foi *marcado*, então quem cadastra o backlog numa sentada às 23h gerava 40 eventos noturnos e o gráfico concluía que era espectador noturno; agora marcações separadas por menos de 2h viram uma sessão só, e a sentada de cadastro pesa o mesmo que qualquer outra noite. Segundo: `EXTRACT(HOUR FROM watched_at)` usa o fuso da sessão do Postgres (UTC no Supabase), o que deslocava o gráfico em 3 horas para quem está em UTC−3. O agrupamento em sessões é independente de fuso (só olha intervalos), e a conversão para hora local passou a acontecer no navegador — o único lugar que sabe o fuso de quem está olhando. Enquanto não houver 10 dias distintos de atividade, a tela mostra os dados mas não afirma nada sobre hábito. |
| 2026-08-21 | **Perfil de gosto usa a fatia dos 2 rótulos mais assistidos, não um índice de concentração** | Herfindahl ou entropia normalizada seriam mais "corretos" estatisticamente, mas o usuário não tem como conferir se o número está certo. "Suas duas primeiras categorias são 62% do que você assiste" é verificável batendo o olho no próprio gráfico. As faixas (≥60% especialista, ≤35% explorador) são heurística assumida, e existe uma faixa do meio de propósito, para não forçar rótulo em quem está no limite. |
| 2026-08-21 | **Volume × satisfação virou gráfico de quadrantes, e não dois cards separados — mas com a conclusão escrita em português** | A alternativa (um card "gênero que menos assiste" + outro "gênero com pior nota") é mais óbvia de ler, mas responde as duas perguntas isoladamente e perde justamente o cruzamento — o caso interessante é volume alto **com** nota baixa, que nenhum dos dois cards mostraria. A primeira versão só com os pontos ficou confusa no teste real: dispersão exige que o leitor aprenda a ler o gráfico antes de concluir qualquer coisa. Correção: as quatro zonas ganharam cor de fundo e nome escrito dentro do próprio desenho (não numa legenda separada, que obriga o olho a ir e voltar), e o achado principal virou uma frase acima do gráfico. O gráfico passou a ser apoio, não a entrega. A divisória horizontal é a nota média do próprio usuário, não um 7 fixo: quem dá 9 pra tudo precisa de um corte diferente de quem dá 6. |
| 2026-08-21 | **A taxonomia de gêneros do AniDeck é própria e mora numa tabela, não espelha a AniList** | A AniList trata "Isekai" como *tag* secundária, mas na conversa real entre quem assiste anime Isekai é a categoria principal — se o AniDeck só reproduzisse a classificação de outra plataforma, perderia a razão de existir. A classificação virou a tabela `genre_taxonomy` (`raw_name` → `display_name_pt` + `tier`), com três camadas: `demografia` (mercado próprio: Shounen, Isekai, Mecha), `genero` (narrativa: Ação, Drama) e `tag_tematica` (cenário/ferramenta: Escolar, Magia — fica fora do ranking competitivo). Tabela em vez de lista fixa em Go porque reclassificar é decisão de produto recorrente: numa tabela é um `UPDATE`, num arquivo `.go` é um deploy. |
| 2026-08-21 | **Tags da AniList entram no cache com corte de relevância (`rank >= 50`) e sem spoilers** | O campo `rank` de cada tag é um voto da comunidade (0–100) sobre o quanto ela descreve a obra. Guardar tudo encheria as Estatísticas de ruído da cauda longa ("Male Protagonist" com rank 12); guardar só rank altíssimo perderia classificação legítima. Tags marcadas como spoiler ficam fora em qualquer rank — revelariam reviravolta de trama e não têm valor de classificação. |
| 2026-08-21 | **DDL passa a ser versionado em `sql/`, aplicado à mão no Supabase** | As views viviam só no painel do Supabase: se o projeto fosse perdido, a lógica ia junto. A pasta `sql/` guarda os arquivos numerados em ordem de aplicação, todos idempotentes. Não é um sistema de migrations automático de propósito — rodar DDL no deploy exigiria credencial de owner do banco no pipeline, risco alto demais pro tamanho do projeto. |
| 2026-08-20 | **Tempo assistido passou a derivar de `episode_progress`, não de `media_entries.progress`** | A `view_user_stats` foi escrita antes da Fase 6.7 existir: contava o total teórico de episódios para animes "Completo" e a coluna `progress` (que nunca era escrita) para o resto. Marcar um episódio não registrava minuto nenhum. Agora o cálculo é a contagem real de linhas em `episode_progress` × `duration_minutes`. **Decisão consciente:** animes completados antes da Fase 6.7 não têm registro lá e ficaram zerados — sem fallback e sem script retroativo, serão remarcados à mão. |
| 2026-08-20 | **Toda view que expõe dado de usuário precisa de `WHERE user_id = auth.uid()` explícito** | Descoberto em teste no Postman: o endpoint de estatísticas devolvia dados de dois usuários no mesmo array. Uma view no Postgres **não** herda a RLS da tabela base em relação a quem consulta — ela roda no contexto de quem a criou (o owner). Confiar na RLS da tabela base é vazamento garantido. Regra válida para toda view futura. |
| 2026-08-20 | **Lógica de sequência (streak) fica em Go, não em SQL** | Dias consecutivos é um problema de *gaps and islands*, que em SQL puro vira uma cadeia de window functions difícil de ler e impossível de testar isoladamente. Em Go (`CalculateStreak`) o algoritmo é linear, tem teste unitário cobrindo streak ativo, quebrado, sem dados e data inválida — e a view fica com a responsabilidade única de devolver as datas distintas. |
| 2026-08-12 | Overlays de UI viraram 2 componentes (`Sheet` e `FilterSheet`), não 1 | `FilterSheet` só é overlay no mobile (no desktop vira bloco inline na página); `Sheet` é overlay em qualquer breakpoint (modais precisam disso sempre). Comportamento visual divergente demais pra forçar um componente só — mas a lógica de abrir/fechar (trava de scroll, Esc) era idêntica, então foi extraída para o hook `useSheetBehavior.ts`, compartilhado pelos dois. |
| 2026-08-11 | **Mitigação de regressão em UPDATE de entradas (IDOR)** | O bug que permitia transferência de posse via injeção de `user_id` no payload reapareceu (possível restore antigo). A correção no backend (forçar `entrada.UserID = userID` após o decode) foi reaplicada. Foi registrada a obrigatoriedade de garantir que a RLS Policy de UPDATE no Supabase possua `WITH CHECK (user_id = auth.uid())` para atuar como segunda camada de defesa. |
| 2026-08-07 | **Migração para SDK Oficial do Supabase e ativação do RLS** | A biblioteca anterior (`nedpals/supabase-go`) era engessada e impedia a injeção dinâmica de JWTs por requisição. Migramos para a SDK oficial da comunidade (`supabase-community/supabase-go`) e trocamos a `service_key` pela `anon_key`. Isso transfere a responsabilidade de isolamento de dados (multitenancy) do código Go para o Row Level Security (RLS) nativo do Postgres, eliminando o risco de vazamento de dados por erro humano nos handlers. **Revoga a decisão de 2026-07-29.** |
| 2026-07-30 | **Adoção de Banco de Dados Híbrido (Curadoria + Fallback)** | Para permitir que o usuário edite títulos, tags e sinopses ao seu gosto, criamos a tabela `curated_animes`. A regra de "nunca armazenar dados do catálogo" foi flexibilizada apenas para a **curadoria manual** (Data Enrichment). Buscas e rankings consultam primeiro o banco local; se o anime não estiver lá, usam a AniList como fallback. |
| 2026-07-29 | ~~**Backend usa `SUPABASE_SERVICE_KEY` (service role) em vez da anon key**~~ *(REVOGADO em 2026-08-07)* | *Decisão original mantida para histórico.* O cliente Go do Supabase era inicializado uma única vez com a chave de serviço, que bypassa o RLS. A alternativa (anon key + RLS) exigiria passar o JWT do usuário em cada query individualmente — padrão mais seguro, mas que requeria refatoração da camada de banco. **Trade-off aceito na época:** o isolamento de dados era garantido pelos filtros `Eq("user_id", userID)` no próprio código Go, com o `userID` sempre vindo do JWT validado pelo middleware (nunca do body). **Risco real:** vazamento da service key daria acesso total ao banco. A evolução prevista aqui — migrar para anon key com o JWT do usuário por query — foi executada na migração de 2026-08-07, e a service key saiu do backend. |
| 2026-07-28 | **MIGRAÇÃO DE EMERGÊNCIA:** Adoção total da **AniList API (GraphQL)** como fonte de dados | A Jikan API (usada anteriormente) anunciou oficialmente seu encerramento para 01/10/2026, com instabilidades (brownouts) imediatas. A AniList fornece uma API GraphQL oficial, estável, sem necessidade de autenticação para dados públicos, e com suporte nativo de mapeamento para o `mal_id` (campo `idMal`). Esta decisão revoga permanentemente qualquer uso do Jikan no projeto. |
| 2026-07 | ~~**Jikan API** (não oficial) como fonte de dados~~ *(REVOGADO)* | *Decisão original mantida para histórico.* A API oficial do MyAnimeList exige OAuth pesado. O Jikan resolvia o MVP sem login, mas morreu. |
| 2026-07 | Tabela `media_entries` genérica (com coluna `tipo`), não `anime_entries` específica | Mangá não está no MVP, mas a AniList atende animes e mangás na mesma API. Desenhar o schema genérico agora evita migração cara depois. |
| 2026-07 | **Nunca armazenar permanentemente dados do catálogo** (sinopse, streaming, etc.) | Os Termos de Uso da AniList (e do antigo Jikan) proíbem explicitamente "hoarding ou coleta em massa de dados". O banco do AniDeck armazena apenas a relação do usuário (status/nota) com o `mal_id`. O catálogo é consumido em tempo real. |
| 2026-07 | Deploy Monolítico (Backend Go servindo o frontend React) em vez de Deploy Desacoplado | Evita a complexidade operacional de gerenciar múltiplos pipelines de deploy e CORS. Mantém o MVP simples para infraestrutura free-tier. |
```

## docs/DESIGN_TOKENS.md

````markdown
# 🎨 DESIGN_TOKENS.md — AniDeck
> Fonte única de verdade pra cores/tipografia — em vez de extrair de 9 arquivos `.html`
> diferentes (risco de pegar um valor levemente inconsistente de um protótipo pro outro).
## Paleta
```css
--void:#0A0714;
--panel:#130F22;
--panel-2:#181330;
--line:#2B2247;
--text:#F1EEFA;
--muted:#A79BC9;
--muted-2:#6B5F94;
--holo-1:#FF4FD8;
--holo-2:#7B5CFF;
--holo-3:#3FE0F0;
--gold:#FFC542;
--green:#a0ff78;
--coral:#FF5C6C;
```
**Gradiente holo padrão** (usado em botões primários, título de marca, avatares):
`linear-gradient(90deg, var(--holo-1), var(--holo-2) 45%, var(--holo-3))`
## Tipografia
| Uso | Fonte | Peso |
|---|---|---|
| Títulos grandes (h1, h2 de seção) | `'Anton', sans-serif` | 400 (a fonte só tem esse peso) |
| Corpo de texto | `'Manrope', sans-serif` | 400-800 |
| Labels, dados, tags, timestamps | `'JetBrains Mono', monospace` | 400-700 |
Import usado em todos os protótipos:
```
https:
```
## Padrões de componente recorrentes
- **Cards:** `background: var(--panel); border: 1px solid var(--line); border-radius: 14-18px`
- **Botão primário:** gradiente holo, texto `var(--void)`, `border-radius: 99px` (pill)
- **Badge de status:** fundo com opacidade baixa da cor + borda da mesma cor + texto na cor cheia
(ex: status "Em Dia" = fundo `rgba(160,255,120,.12)`, borda `rgba(160,255,120,.4)`, texto `#a0ff78`)
- **Border-radius geral:** 12-18px em cards, 99px (pill) em botões/badges/tags
````

## docs/ESTATISTICAS_BACKLOG.md

````markdown
# 📊 Estatísticas — Backlog e Ideias
> Documento de trabalho da sessão de 20/08/2026.
> Consolida o que foi entregue, o que ficou pendente e todas as ideias levantadas
> para a evolução da página de Estatísticas do AniDeck.
---
## 1. Entregue nesta sessão
### #65 — `fix(stats)`: tempo assistido usando `episode_progress` como fonte de verdade
**Problema:** a view `view_user_stats` foi escrita antes da Fase 6.7 existir. Ela calculava o
tempo assistido assim: se o status fosse `Completo`, contava o **total teórico de episódios do
anime** (`anime_metadata_cache.episodes`); caso contrário, contava a coluna antiga
`media_entries.progress`. A tabela `episode_progress` — que virou a fonte de verdade sobre o que
o usuário realmente assistiu — era completamente ignorada.
**Efeitos práticos:**
- Marcar um episódio individual **não registrava minuto nenhum** nas estatísticas.
- Animes "Assistindo" e "Em Dia" contavam zero tempo, porque `progress` nunca era escrito.
- Animes "Completo" contavam o anime inteiro, mesmo que poucos episódios tivessem sido marcados.
**Correção:** o cálculo passou a ser a contagem real de linhas em `episode_progress`
(por `user_id` + `mal_id`) multiplicada por `duration_minutes`, com fallback de 24 min.
**Decisão tomada:** animes completados **antes** da Fase 6.7 não têm registro em
`episode_progress` e por isso tiveram o tempo zerado. Optou-se conscientemente por **não** criar
fallback nem script de retroalimentação — o usuário vai remarcar manualmente.
---
### 🔒 Correção de segurança: vazamento de dados entre usuários
**Descoberto durante o teste no Postman.** O campo `overview` estava retornando as estatísticas
de **dois usuários diferentes** no mesmo array.
**Causa:** RLS (Row Level Security) é aplicada nas *tabelas*, mas uma view no Postgres **não
herda automaticamente** a política de RLS da tabela base em relação a quem está consultando — ela
roda com o contexto de quem a criou (o owner), não do usuário autenticado. Resultado: as views
enxergavam as linhas de todos os usuários.
**Correção:** filtro explícito `WHERE user_id = auth.uid()` adicionado em **todas** as views.
> ⚠️ **Regra para o futuro:** toda view nova que exponha dados de usuário precisa desse filtro
> explícito. Não confiar na RLS da tabela base.
---
### 🔧 Correção: duplicata de gênero na Afinidade
"Fantasia" aparecia duas vezes no ranking (uma com 13, outra com 5).
**Causa:** gêneros vinham em dois idiomas misturados — em inglês pelo `anime_metadata_cache`
(`"Fantasy"`, traduzido só na hora de exibir) e em português pelo `curated_animes.custom_tags`
(`"Fantasia"`, cadastrado manualmente no Painel Admin). Como o `GROUP BY` acontecia antes da
tradução, viravam duas chaves distintas.
**Correção:** tradução movida para **dentro da view**, via tabela `VALUES` de-para, antes do
agrupamento. O `traduzirGenero` do frontend permanece como fallback.
---
### #67 — `feat(stats)`: novos indicadores
| Indicador | Fonte | Como funciona |
|---|---|---|
| **Atividade Recente** | `episode_progress.watched_at` | Episódios marcados por semana, últimas 8 semanas |
| **Distribuição de Notas** | `media_entries.nota` | Histograma: quantos animes receberam cada nota |
| **Distribuição por Ano** | `anime_metadata_cache.season_year` | ⚠️ Vazio — ver pendência #2 |
| **Streak** | `episode_progress` + Go | Dias consecutivos assistindo (atual e recorde) |
| **Padrão de Horário** | `EXTRACT(HOUR FROM watched_at)` | Agrupado em Madrugada/Manhã/Tarde/Noite |
| **Recordes Pessoais** | várias | Maior maratona, nota mais alta, maratona mais rápida |
**Nota sobre o streak:** a lógica de dias consecutivos (*gaps and islands*) foi implementada em
**Go**, não em SQL — `CalculateStreak` em `internal/handlers/streak.go`, com testes unitários
cobrindo streak ativo, quebrado, sem dados e data inválida. A view apenas devolve as datas
distintas.
---
### ⏳ Pendente de aplicação
**Refinamento de layout mobile** — código pronto, aguardando João sair do celular para aplicar:
- Cards de Streak estavam **cortando na borda da tela** (usavam `StatCard`, que tem largura fixa
pensada para listas com scroll horizontal). Trocados por markup próprio em `grid-cols-2`.
- Cards do topo empilhavam em coluna única no mobile → agora `grid-cols-3` sempre, com fonte e
padding reduzidos via `sm:`.
- Títulos de anime nos Recordes cortavam no meio (`truncate`) → agora `line-clamp-2`.
---
## 2. Dívidas técnicas identificadas
### 2.1 SQL das views não está versionado
As views existem **apenas no painel do Supabase**. Não há pasta de migrations no repositório.
Se o projeto for perdido ou precisar ser recriado, essa lógica se perde.
**Sugestão:** criar `sql/` ou `docs/schema.sql` no repo com o DDL de todas as views e tabelas.
### 2.2 Re-sincronização do cache será necessária
As mudanças planejadas (tags da AniList, `season_year`) só afetam animes sincronizados **depois**
da alteração. Os animes já cadastrados precisarão de um novo `syncMetadataCacheAsync` — via
script pontual ou re-salvando cada entrada.
### 2.3 Coluna `media_entries.progress` ficou órfã
Depois da correção #65, essa coluna não é mais lida por nada. Avaliar se ainda é escrita em algum
lugar do app e, se não for, considerar remoção.
---
## 3. Backlog — Prioridade Alta
> Itens que corrigem comportamento errado ou incompleto.
### 3.1 🏷️ Taxonomia própria do AniDeck (3 camadas)
**A ideia central:** o AniDeck **não deve espelhar a taxonomia da AniList**. A AniList trata
"Isekai" como uma *tag* secundária, mas na conversa real entre quem assiste anime, Isekai é a
categoria principal — *"Que tipo de anime é?" "É um Isekai de magia."* Se o AniDeck só reproduz a
classificação de outra plataforma, ele perde a razão de existir.
**O problema técnico atual:** o `syncMetadataCacheAsync` (em `entries.go`) só busca
`anime.Genres` da AniList. Nunca busca `anime.Tags`. Como Isekai é uma tag e não um genre, ele
**nunca** entra no cache automaticamente — só aparece nos poucos animes curados manualmente com
`custom_tags` no Painel Admin. É por isso que Isekai não aparece nas estatísticas mesmo com vários
animes do gênero cadastrados.
**Proposta — três camadas:**
**Camada 1 — Demografias e Mercados**
Categorias com mercado comercial próprio. Competem entre si por atenção do usuário.
- Shounen — público jovem masculino
- Shoujo — público jovem feminino
- Seinen — público masculino adulto
- Isekai — transporte para outro mundo; tem mercado literário próprio
- Mecha — robôs gigantes; move bilhões em licenciamento e brinquedos
- Slice of Life — narrativa lenta focada estritamente na rotina
- Boys Love / Yuri — nichos comerciais isolados e independentes
**Camada 2 — Gêneros Narrativos**
O clássico. Ação · Aventura · Comédia · Drama · Esporte · Fantasia · Ficção Científica ·
Horror · Mistério · Romance · Suspense
**Camada 3 — Tags Temáticas**
> Não formam categorias comerciais sozinhas. Servem para detalhar cenário, ferramentas ou
> personagens da obra.
Artes Marciais (estilo de combate) · Demônios (tipo de criatura) · Ecchi (elemento visual
sensual) · Escolar (cenário) · Harém ele/ela (estrutura de relacionamento) · Histórico (época) ·
Jogo (elemento temático) · Magia (sistema de poder) · Militar (contexto) · Musical (tema de
fundo) · Psicológico (abordagem narrativa) · Samurai (tipo de guerreiro/época) · Sobrenatural
(elemento de roteiro) · Super Poderes (mecânica de combate)
**Implementação sugerida:** tabela no banco em vez de lista hardcoded em Go, para permitir
edição sem deploy — e, no futuro, uma tela no Painel Admin.
```sql
CREATE TABLE genre_taxonomy (
raw_name        TEXT PRIMARY KEY,   -- como vem da AniList: 'Isekai', 'Action'
display_name_pt TEXT NOT NULL,      -- 'Isekai', 'Ação'
tier            TEXT NOT NULL
CHECK (tier IN ('demografia', 'genero', 'tag_tematica'))
);
```
**Impacto na tela:** a Afinidade de Gêneros ganharia seções ou abas separadas para
"Demografias" e "Gêneros". As Tags Temáticas sairiam do ranking competitivo — apareceriam como
badges informativos, não como estatística.
**Bloqueio:** precisa do arquivo do client da AniList (`internal/anilist/`) para saber se a query
GraphQL já pede o campo `tags` e qual o formato da struct de resposta.
---
### 3.2 📅 `season_year` nunca é preenchido
A coluna existe em `anime_metadata_cache`, mas o payload do `syncMetadataCacheAsync` não a
inclui. Por isso o gráfico "Distribuição por Ano de Lançamento" está permanentemente vazio.
Mesmo bloqueio da 3.1: precisa do client da AniList para saber o nome do campo de ano/temporada
na resposta da API. Faz sentido resolver junto com as tags, já que é o mesmo arquivo.
---
### 3.3 🕐 Cold-start do Padrão de Horário
**O problema:** `watched_at` registra **quando o episódio foi marcado**, não quando foi assistido.
Um usuário novo que importar o backlog inteiro numa sentada às 23h vai receber um gráfico dizendo
que ele é espectador noturno — quando na verdade ele só cadastrou tudo de uma vez.
**Duas camadas de solução:**
**Curto prazo:** só exibir a frase de insight ("Você assiste mais de manhã") depois de atividade
em pelo menos ~10 dias distintos. A view `view_user_watch_dates` (já criada para o streak) serve
para isso. Antes disso, mensagem neutra: *"Continue registrando episódios pra desbloquear seu
padrão de horário."*
**Médio prazo:** contar **sessões** em vez de episódios individuais. 20 episódios marcados em 5
minutos é *uma* sessão de maratona, não 20 eventos de comportamento independentes. Isso resolve o
problema de raiz — não só no dia 1, mas sempre que houver um import em lote. Exige lógica de
agrupamento por gap de tempo, similar à do streak.
---
## 4. Backlog — Prioridade Média
> Features novas que agregam valor real.
### 4.1 🖱️ Drill-down clicável
**A pergunta que a tela não responde hoje:** *"assisti 30 animes de Fantasia — mas quais?"*
Clicar num gênero (ou em qualquer barra do gráfico) abre um `Sheet` com os animes daquela
categoria. Reaproveita componentes que já existem: `Sheet.tsx` e o `AnimeCard` unificado.
Backend: endpoint novo tipo `GET /api/stats/genre/{genre}` retornando as `media_entries` do
usuário filtradas por gênero.
**Observação:** a Distribuição por Status não precisa disso — o Meu Deck já permite ver os animes
por status.
---
### 4.2 📈 Gráfico de quadrantes (volume × satisfação)
**Origem da ideia:** a vontade de ver "categoria que menos assisto" e "animes que não gosto".
São duas perguntas diferentes — uma é sobre **volume**, a outra sobre **satisfação**.
A boa notícia: a view `view_user_genre_affinity` **já calcula** `media_nota_genero` junto de
`total_watched`. Os dois dados existem, só nunca foram cruzados.
Cada gênero vira um ponto num gráfico — eixo X = quantidade assistida, eixo Y = nota média:
| | **Nota alta** | **Nota baixa** |
|---|---|---|
| **Muito assistido** | Zona de conforto de verdade | Assiste por hype/hábito, mas não curte |
| **Pouco assistido** | Gostou do pouco que viu → explorar mais | Realmente não é pra você |
**Trade-off a decidir:** o quadrante é mais rico, mas exige mais do usuário para "ler". A
alternativa mais simples seria dois cards separados ("gênero que menos assiste" + "gênero com pior
nota") — mais óbvio de entender, menos sofisticado. **Decisão ainda em aberto.**
---
### 4.3 📊 Comparação temporal
Em vez de só "38 episódios essa semana", mostrar a variação: *"↑ 40% em relação ao mês passado"*.
Dá senso de progressão em vez de uma foto estática. Usa os mesmos dados de `episode_progress`.
---
### 4.4 ⏰ Anime esquecido
De tudo que está "Assistindo", qual está há mais tempo sem nenhum episódio novo marcado?
**Diferencial:** não é estatística sobre o passado — é **acionável**. Vira um lembrete
*"ei, você tinha esse aqui na fila"*, com link direto para a tela do anime.
---
### 4.5 🎯 Taxa de conclusão
Usando `completos` / `dropados` / `assistindo` / `em_dia`: *"de cada 10 animes que você começa,
você termina 7."*
**Cuidado de UX:** pode soar como cobrança. Ninguém gosta de ler "você dropa 30%". Enquadrar como
curiosidade, não como métrica de desempenho.
---
### 4.6 🧭 Perfil: Especialista vs Explorador
Baseado em quão concentrada ou dispersa é a Afinidade de Gêneros. Se 80% do consumo está em dois
gêneros → "especialista". Se está distribuído entre oito → "explorador".
Menos uma métrica fria, mais um dado de personalidade sobre o próprio gosto.
**Ponto em aberto:** definir o threshold sem que fique arbitrário.
---
## 5. Backlog — Prioridade Baixa
### 5.1 ✨ Animação e microinterações
Dar mais vida aos gráficos: barras que crescem ao entrar na viewport, hover states, transições.
É o item que menos muda a **substância** da página — vale deixar para depois que o conteúdo
estiver certo.
---
## 6. Ideias avaliadas e descartadas
| Ideia | Motivo |
|---|---|
| **Afinidade por estúdio** | Não desperta interesse suficiente no momento |
| **Contar só o "gênero principal"** (primeira posição do array) | Não resolveria o caso do Isekai (ele não é um genre, é uma tag — o problema é a fonte de dados, não a ordem). Além disso, a ordem do array da AniList não tem semântica oficial de relevância. Alternativa melhor, se a diluição incomodar depois: **peso fracionário** — cada anime contribui `1/N` para cada um dos N gêneros que possui |
---
## 7. Para registrar no `DECISIONS.md`
1. **Tempo assistido** passou a derivar de `episode_progress`. Animes completados antes da
Fase 6.7 foram zerados por decisão consciente — sem fallback, sem script retroativo.
2. **Views precisam de `auth.uid()` explícito.** Uma view no Postgres não herda a RLS da tabela
base em relação a quem consulta. Regra válida para toda view futura.
3. **A taxonomia de gêneros do AniDeck é própria e não espelha a da AniList.** Isekai tratado
como categoria principal (demografia/mercado) é o caso que motivou a decisão.
4. **Lógica de sequência (streak) fica em Go, não em SQL.** Mais legível, testável e mais fácil
de manter do que uma solução de *gaps and islands* em SQL puro.
---
## 8. Próximo passo sugerido
Abrir um chat novo com o dump atualizado do projeto + este documento, e começar pela **frente 3.1
(taxonomia)** — que desbloqueia junto a **3.2 (`season_year`)**, já que ambas dependem do mesmo
arquivo do client da AniList.
````

## docs/PAGES.md

```markdown
# 📄 PAGES.md — AniDeck
> Rastreamento de status por página/tela, complementando o `ROADMAP.md` (que rastreia por fase).
> Atualizar sempre que uma tela ganhar protótipo visual ou for implementada de verdade.
| # | Página/Tela | Status | Fase do Roadmap |
|---|---|---|---|
| 1 | Landing pública (visitante) | ✅ Prototipada | Fase 3 |
| 2 | Login / Cadastro | ✅ Implementada | Fase 2 |
| 3 | Dashboard "Meu Deck" (logado) | ✅ Prototipada | Fase 2/3 |
| 4 | Descobrir/Buscar catálogo | ✅ Implementada | Fase 2 |
| 5 | Detalhe do anime (sinopse, personagens, staff, relacionados, streaming, reviews) | ✅ Prototipada | Fase 2 |
| 6 | Calendário de lançamentos (completo) | ✅ Prototipada | Fase 5.5 |
| 7 | Rankings (completo) | ✅ Prototipada | Fase 2 |
| 8 | Estatísticas/Dashboard analítico (gráficos) | ✅ Implementada | Fase 4 / 6.8 |
| 9 | Configurações & Ajuda (unificadas em uma só página) | ✅ Prototipada | Fase 2 |
**Total: 9 páginas prototipadas, 3 delas já com implementação confirmada (Login/Cadastro, Busca e Estatísticas).** 🎉
> ⚠️ Nota de revisão: as duas linhas acima (2 e 4) foram atualizadas de "🔧 Em implementação"
> para "✅ Implementada" com base no código real de `Auth.tsx` e `Busca.tsx` já em produção
> (autenticação funcional, busca com debounce, filtros e grade de resultados completos). Se
> alguma dessas telas ainda tiver ponta solta que não apareceu no código revisado, ajustar de
> volta.
Arquivos de protótipo já existentes:
- `landing-prototipo.html` (Landing)
- `dashboard-prototipo.html` (Dashboard)
- `busca-prototipo.html` (Busca)
- `detalhe-anime-prototipo.html` (Detalhe do Anime)
- `rankings-prototipo.html` (Rankings)
- `login-prototipo.html` (Login/Cadastro)
- `calendario-prototipo.html` (Calendário)
- `config-ajuda-prototipo.html` (Configurações & Ajuda)
- `estatisticas-prototipo.html` (Estatísticas)
```

## docs/README.md

```markdown
# 🎴 AniDeck
> Domínio: `anideck.com.br`
Catálogo pessoal de anime construído sobre a base global (via AniList API), com
status de progresso, notas e avaliações próprias — uma interface moderna e com identidade visual
própria, diferente da experiência padrão de outras plataformas. Módulo futuro do hub
[JVM Systems — Portfolio Dev](../jvm-systems-portfolio-dev/README.md).
**Status:** 🚧 Em planejamento — ver [`ROADMAP.md`](./ROADMAP.md).
---
## ✨ Funcionalidades
### MVP
- [ ] Busca e navegação no catálogo de anime (via AniList API).
- [ ] Salvar anime na lista pessoal com status (assistindo / em dia / completo / quero assistir / dropado).
- [ ] Notas e avaliações próprias por título.
- [ ] Filtro por gênero/tag.
- [ ] Filtro por plataforma de streaming disponível (ex: só mostrar o que está na Crunchyroll) —
**nota técnica:** consulta ao vivo cruzando dados com o campo `externalLinks` da AniList a cada busca, **sem
armazenar dado de streaming no banco** (decisão de ToS registrada em `DECISIONS.md`).
> **Definição sem ambiguidade:** a lista do usuário é 100% controlada manualmente — cada entrada
> é adicionada, classificada (status) e anotada (nota/comentário) pelo próprio usuário. Não existe
> importação automática nem lista gerada por algoritmo. Isso é o que o protótipo chamava de
> "curadoria pessoal"; aqui documentado sem termo vago, para não gerar interpretação errada por
> quem for implementar.
### Pós-MVP
- [ ] Dashboard de estatísticas pessoais (tempo assistido, gênero favorito, etc.).
- [ ] Recomendações personalizadas com base na lista salva.
- [ ] Agregador de notícias de fontes oficiais de anime.
- [ ] Suporte multiusuário (hoje é uso pessoal, pode abrir para outras pessoas depois).
---
## 🧱 Stack
| Camada | Tecnologia |
|---|---|
| Backend | Go + Chi |
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Banco de dados | PostgreSQL (Supabase) |
| Fonte de dados externa | [AniList API](https:
| Autenticação | Supabase Auth (JWT) |
---
## 🎨 Identidade visual
Ainda em definição — direção combinada: fusão **cyberpunk/sci-fi com estética de anime**,
moderna, com identidade própria e visualmente marcante (não um tema genérico de dev). Protótipo
visual desenhado na pasta `/prototipos`.
---
## 🗺️ Roadmap
Planejamento completo por fases em [`ROADMAP.md`](./ROADMAP.md).
---
## 👤 Autor
**João Victor Mendes**
[GitHub](https:
```

## docs/ROADMAP.md

```markdown
# 🗺️ AniDeck — Roadmap
> ✅ **Aviso de Migração (28/07/2026):** O projeto pivotou inteiramente para a **AniList API (GraphQL)** devido à descontinuação iminente do Jikan. Todo o planejamento abaixo reflete essa nova realidade. Ver `DECISIONS.md`.
> 🎯 **Escopo fechado da v1 (21/08/2026):** as fases abertas abaixo são as únicas que faltam
> para o AniDeck ser considerado **concluído**. Ideia nova entra no Backlog e só vira fase
> depois do beta, com base em uso real — não antes. Ver `DECISIONS.md`.
## 🎯 Onde está o MVP
**Fases 1, 2 e 3** = MVP publicável: fundação + catálogo pessoal (salvar, status, notas, filtro)
+ identidade visual mínima aplicada. Fases 4, 5 e 6.x são incrementos sobre um produto já no ar.
## 🚀 Deploy contínuo
Staging sobe já na Fase 1, como projeto esqueleto — mesmo padrão do JVM Systems.
## 📍 Status atual (21/08/2026)
| Fase | Status |
|---|---|
| 1 · Fundação & Arquitetura | ✅ Concluída |
| 2 · Catálogo Pessoal | ✅ Concluída |
| 2.5 · Curadoria Pessoal (Admin) | ✅ Concluída |
| 3 · Identidade Visual | ✅ Concluída |
| 4 · Dashboard de Estatísticas | ✅ Concluída |
| 4.5 · Automação e IA Generativa | 🔄 **Em aberto** — Agente Olheiro v1 |
| 5 · Smart Tracking & Calendário | ✅ Concluída |
| 6.5 · Ranking Ponderado | 🔄 **Em aberto** — indicador ▲/▼ |
| 6.6 · Página de Detalhes | ✅ Concluída |
| 6.7 · Progresso por Episódio | ✅ Concluída |
| 6.8 · Taxonomia & Estatísticas | ✅ Concluída |
| 7 · Multiusuário | 🔜 Próxima — beta fechado |
| 8 · App Instalável | ✅ Concluída (escopo reduzido) |
---
## 🏗️ Fase 1: Fundação & Arquitetura — início do MVP
- [x] Inicializar backend Go + Chi (mesma estrutura de pastas dos outros projetos).
- [x] Criar projeto Supabase (banco + auth).
- [x] Schema inicial: tabela `media_entries` (id, mal_id, **tipo** [`anime`/`manga`], status, nota,
anotação, created_at, updated_at).
- [x] Cliente HTTP em Go para consumir a Jikan API *(Nota histórica: Refatorado na Fase 2)*.
- [x] Subir staging esqueleto.
## 🔐 Fase 2: Catálogo Pessoal
- [x] 🚨 **PIVÔ DE ARQUITETURA:** Substituição completa da Jikan API pela AniList API (GraphQL) devido ao anúncio de desligamento da Jikan. O Go foi refatorado como um *Adapter* (Issue #11) traduzindo os dados de volta para o JSON REST antigo, para salvar o frontend e o banco.
- [x] Busca de anime exibida no frontend. Busca instantânea (estilo Netflix/Prime): grade de pôsteres atualizando enquanto digita, com debounce. Funciona **sem login** — só a ação de salvar exige conta.
- [x] Página de detalhe do anime com: sinopse, onde assistir, temas de abertura/encerramento,
animes relacionados e **distribuição de notas da comunidade** (como gráfico).
- [x] Salvar/editar/remover entrada na lista pessoal (status, nota, anotação) no Supabase (CRUD - Issue #9).
- [x] Transição de status: Sugerir automaticamente mudar para "Completo" quando a API informar que o anime "Em Dia" terminou.
- [x] Autenticação Supabase funcional (login/cadastro). Rota `/deck` protegida.
- [x] Sanitização de qualquer texto livre inserido pelo usuário (anotações) via `bluemonday` (proteção contra XSS).
- [x] Exibir ranking global de animes baseado na query `Page(sort: SCORE_DESC)` da AniList (Issue #10).
- [x] Filtro por gênero/tag e plataforma de streaming (via campo `externalLinks` da AniList, cruzado em tempo de execução) (Issue #10).
- [x] **Sistema de Cartas Raras:** Funcionalidade de "Favoritos" com UI de carta holográfica (Foil) e organização prioritária no Deck e Rankings.
## 🗂️ Fase 2.5: Curadoria Pessoal (Painel Admin)
- [x] Criar tabela `curated_animes` no Supabase para armazenar destaques editados.
- [x] Criar rotas no backend (`/api/curation`) para gerenciar (CRUD) os destaques.
- [x] Atualizar rotas de Busca e Ranking para usar a curadoria local como prioridade (Fallback para AniList).
- [x] Construir a interface do Painel Admin em React e conectar ao Backend.
## 🎨 Fase 3: Identidade Visual — fim do MVP
- [x] Protótipos visuais dedicados (fusão cyberpunk/sci-fi + anime) construídos em HTML/CSS nativo.
- [x] Aplicação da identidade (Design Tokens) nos componentes React reais.
- [x] Responsividade e acessibilidade básica.
- [x] Realizar testes usando Smartphone para ajustes e refinamentos.
## 📊 Fase 4: Dashboard de Estatísticas (Foco em SQL Avançado)
- [x] Migrar a lógica de agregação de dados do client/backend para **VIEWS e FUNCTIONS nativas no Postgres (Supabase)**, exigindo domínio de queries complexas.
- [x] Cálculo de métricas pessoais (tempo assistido, gênero favorito, distribuição por status) direto no banco.
- [x] Visualização (gráficos) no painel do usuário consumindo essas procedures.
## 🤖 Fase 4.5: Automação e IA Generativa
> **Nota (21/08/2026):** o Agente Olheiro estava pausado desde 17/08 aguardando a definição da
> Fase 6.5 (ranking ponderado). Esse pré-requisito foi cumprido — a fórmula bayesiana está
> implementada e documentada. O Olheiro foi **retomado** com escopo reduzido: v1 sugere,
> não decide. O relatório por Gmail saiu do escopo desta fase (ver Backlog).
- [x] **Agente Curador (IA no Admin):** Integrar um LLM para reescrever sinopses frias da AniList de forma autônoma, adotando o tom de voz "AniDeck".
- [x] **Engenharia de Prompt Dinâmica e Resiliência:** Criação de cache em memória no Go (`sync.RWMutex`) consultando tabela genérica no Supabase para editar as regras da IA sem mexer no código, suporte a Markdown, e fallback automático (`3.7-flash` -> `3.6-flash`).
- [x] **Decisão arquitetural (17/08/2026): n8n descartado** — exigiria hospedar/manter mais um
serviço com custo recorrente, incompatível com o estágio atual do projeto. Implementação
fica **nativa em Go** (mesmo backend, sem serviço novo), disparada por agendador externo
gratuito (cron-job.org) batendo num endpoint interno protegido por chave secreta — mesmo
padrão adotado na Fase 6.7. Registrado em `DECISIONS.md`.
- [x] 🔄 **Agente Olheiro v1 (fila de sugestões de curadoria).** Cruza o perfil de gosto do
usuário com os *trends* da AniList e grava candidatos em `curation_suggestions`, revisados
manualmente numa aba nova do Painel Admin (botões "Curar" / "Dispensar"). Endpoint
`POST /api/admin/olheiro/scan` protegido por chave secreta, agendado semanalmente.
A função de pontuação fica pura e testável em `internal/handlers/olheiro.go`, para ser
refinada incrementalmente conforme o projeto evolui. Issue detalhada no GitHub Projects.
## 📅 Fase 5: Smart Tracking, Streaming Direto & Calendário (Killer Feature) — Finalizada 10/08/2026
- [x] **Backend:** Atualizar a query GraphQL do Go para consumir `nextAiringEpisode` e repassar a janela de tempo ao frontend.
- [x] **Meu Deck:** Criar lógica visual de Badge "NOVO EP" para obras "Assistindo" ou "Em Dia" com episódios recém-lançados.
- [x] **Integração de Streaming:** Adicionar botão/ação rápida nos cards do Deck utilizando o campo `externalLinks` da AniList, permitindo pular direto para a Crunchyroll/Netflix.
- [x] **Calendário Personalizado:** Tela mostrando próximos episódios exclusivos da *watchlist* do usuário, agrupados por dia da semana e com contagem regressiva viva.
OBS: O Product Owner decidiu que a Fase 5 fosse implementada primeiro.
## ⚖️ Fase 6.5: Ranking Ponderado
> Nasceu da auditoria de UX registrada em `docs/ideias-para-melhorias.md`, item 2.2 (e 2.3).
>
> **Nota (17/08/2026):** a versão simples desta fase (média bayesiana com dado que a AniList já
> fornece hoje) **não depende** do sistema de credibilidade de longo prazo descrito em
> `VISAO_RANKING_CREDIVEL.md` — pode ser implementada de forma independente, sem esperar a
> Fase 7 (Multiusuário).
>
> **Nota (21/08/2026):** fórmula fechada e implementada. O indicador ▲/▼ abaixo estava
> bloqueado por essa definição e **foi destravado** — é o último item aberto da fase.
- [x] Confirmar se a query GraphQL da AniList retorna contagem de avaliações/favoritos por anime.
- [x] Definir e documentar em `DECISIONS.md` a fórmula de ponderação escolhida (ex: média
bayesiana ao estilo IMDb, puxando notas com poucos votos em direção à média geral).
- [x] Implementar o cálculo (avaliar se fica em Go/handler ou como view/function no Postgres,
alinhado à Fase 4).
- [x] Como parte da mesma decisão, avaliar o critério de equilíbrio entre animes clássicos e
recentes (item 2.3 do documento de ideias).
- [x] 🔄 **Indicador de movimentação de posições no ranking (▲/▼).** Destravado em 21/08/2026
com o fechamento da fórmula. Exige tabela de snapshot diário de posições, job agendado
(mesmo padrão de cron externo da Fase 6.7) e as setas na UI de Rankings.
## 🖼️ Fase 6.6: Enriquecimento da Página de Detalhes (Concluída)
> **Decisão de Produto (Agosto/2026):** O escopo original previa adicionar Dubladores, Staff e Galerias de Imagens. Pivotamos essa decisão e descartamos esses dados para evitar poluição visual e lentidão na query GraphQL. O foco da fase tornou-se a imersão (UX Premium), as datas de lançamento e o refinamento das estatísticas.
- [x] **Refatoração de UX/UI:** Substituição do formulário de avaliação estático por um Modal (BottomSheet) integrado, aplicação de cores dinâmicas no Design System das tags e adoção de pôsteres verticais contínuos para a seção de títulos relacionados.
- [x] **Performance e Datas de Episódios (Killer Feature):** Paginação virtual (chunks de 24 episódios) no `EpisodeGrid` para evitar travamento em animes muito longos e cálculo dinâmico da data de lançamento exata (passada e futura) baseado na `startDate` do anime.
- [x] **Estatísticas Vivas:** Consumo do `statusDistribution` da AniList (revelando a % da comunidade que completou ou dropou a obra) e histograma animado com marcação destacada da nota do próprio usuário.
- [x] **Correções de Acessibilidade:** Implementação de `custom-scrollbar` para navegação por mouse no desktop na lista de personagens.
## 📺 Fase 6.7: Progresso por Episódio & Notificação de Lançamento (Concluída)
> Nasceu de uma sessão de planejamento em 17/08/2026, ao discutir os pré-requisitos técnicos
> para a visão de longo prazo do ranking com credibilidade (`VISAO_RANKING_CREDIVEL.md`).
> Planejamento completo, com issues detalhadas em formato `AGENTS.md`, motivação, gargalos
> identificados (cobertura variável do campo `streamingEpisodes` da AniList, e o fato de que
> temporadas já são separadas por `mal_id` — não precisa de agrupamento manual) e mitigação de
> timeout de cold-start documentados em `FASE_6.7_EPISODIOS.md`.
- [x] Criar tabela `episode_progress` (Supabase) + endpoints Go para marcar/desmarcar episódio assistido, com RLS extraindo o `user_id` sempre do JWT.
- [x] Grade visual de episódios na página de detalhe/Meu Deck, usando `streamingEpisodes` da AniList (com fallback).
- [x] **Antecipação PWA:** Adicionar `manifest.json` e registrar o `Service Worker` no frontend React (trazido da Fase 8).
- [x] Criar tabela `push_subscriptions` (Supabase) para armazenar os endpoints, chaves `p256dh` e `auth` dos navegadores dos usuários.
- [x] Notificação de episódio novo lançado (checagem diária via cron-job.org batendo em endpoint interno). O backend grava o histórico na tabela `notifications` **e simultaneamente** dispara o alerta para o sistema operacional via `webpush-go` usando chaves VAPID.
## 🏷️ Fase 6.8: Taxonomia Própria & Evolução das Estatísticas (Concluída)
> Nasceu da sessão de 20/08/2026, revisando a página de Estatísticas depois que a Fase 6.7
> mudou a fonte de verdade do progresso.
>
> **Verificação de estado (21/08/2026):** todos os arquivos `sql/001` a `sql/008` aplicados no
> Supabase e o `POST /api/admin/metadata/resync` executado uma vez. Confirmado em tela pelo
> gráfico de Distribuição por Ano populado e pelo Isekai aparecendo na Afinidade de Gêneros.
- [x] **Tempo assistido usando `episode_progress` como fonte de verdade** (a view contava o
total teórico de episódios em vez do que foi realmente marcado).
- [x] **Correção de segurança:** filtro `user_id = auth.uid()` explícito em todas as views —
uma view no Postgres não herda a RLS da tabela base.
- [x] **Novos indicadores:** atividade recente, distribuição de notas, streak (em Go),
padrão de horário e recordes pessoais.
- [x] **Taxonomia própria do AniDeck em 3 camadas** (`genre_taxonomy`): demografias/mercados,
gêneros narrativos e tags temáticas. Resolve o caso do Isekai, que a AniList classifica
como tag e por isso nunca chegava até as Estatísticas.
- [x] **`tags` e `season_year` no cache de metadados** — o client da AniList não pedia nenhum
dos dois. Destrava o gráfico de Distribuição por Ano, que estava permanentemente vazio.
- [x] **DDL versionado em `sql/`** — dívida técnica 2.1 fechada por completo: o `sql/006` traz
o SQL real das 9 views antigas, extraído com `pg_get_viewdef`, não reconstruído de memória.
- [x] **Endpoint de re-sincronização em lote** (`POST /api/admin/metadata/resync`) — sem ele,
só animes salvos depois da mudança teriam os campos novos.
- [x] **Refinamento de layout mobile** — cards de Streak não cortam mais na borda (`StatCard`
trocado por markup próprio em `grid-cols-2`), cards do topo em `grid-cols-3` sempre com
fonte/padding reduzidos via `sm:`, e `line-clamp-2` nos títulos dos Recordes.
- [x] **Animação e microinterações nos gráficos** — barras e arcos crescem do zero, números dos
cards de destaque contam até o valor, cards entram com fade conforme a rolagem e barras/
badges reagem ao mouse. Tudo respeitando `prefers-reduced-motion`. O observer de scroll
virou o hook `useRevealOnScroll`, compartilhado com a Landing (que tinha o mesmo código
inline), e a contagem virou `useContagemAnimada`.
- [x] **Cold-start do Padrão de Horário** — resolvido nas duas camadas de uma vez: a frase de
insight só aparece com 10+ dias distintos de atividade, e a contagem passou a ser por
**sessão** (marcações a menos de 2h de distância viram um bloco só), o que corrige o
problema na raiz e não só no primeiro uso. **Bônus:** o gráfico estava 3 horas deslocado
porque o Postgres extraía a hora em UTC — a conversão para hora local foi para o navegador.
- [x] **Drill-down clicável** — clicar numa categoria **ou numa barra de ano** abre um `Sheet`
com os animes, reaproveitando `Sheet.tsx` + `AnimeCard`. Endpoints
`GET /api/stats/genre?nome=` e `GET /api/stats/year?ano=`, sobre views que repetem a
mesma lógica de recorte dos gráficos — a contagem da barra tem que bater com o tamanho
da lista.
- [x] **Gráfico de quadrantes (volume × satisfação)** — decisão fechada pelo quadrante; o
motivo está no `DECISIONS.md`. A divisória horizontal é a nota média do próprio usuário.
- [x] **Comparação temporal** — selo de variação no card de Atividade Recente, comparando as
últimas 4 semanas com as 4 anteriores. Só aparece com 8+ semanas de histórico e nunca
quando o período anterior é zero (evita o "↑ infinito%").
- [x] **Anime esquecido** — card acionável com link direto pra obra, via
`view_user_forgotten_anime`. Só aparece depois de 7 dias parado: cutucar alguém por não
ter assistido ontem seria irritante, não útil.
- [x] **Taxa de conclusão** — "você termina 7 de 10", enquadrado como curiosidade. Conta só
animes já decididos (completos + dropados): quem tem muita coisa em dia não deve ver a
taxa cair por causa disso.
- [x] **Perfil Especialista vs Explorador** — fatia dos 2 rótulos mais assistidos, com faixas
assumidas e uma zona "equilibrado" no meio. Tags temáticas ficam fora da conta (apareceriam
em quase todo anime e achatariam a concentração).
- [x] **Coluna órfã `media_entries.progress`** — auditoria confirmou que nenhuma tela envia o
campo; ele só ia no payload por existir na struct Go. Removido da struct; o `DROP COLUMN`
está em `sql/005`, para rodar **depois** do deploy (a ordem inversa quebraria o insert).
## 📚 Fase 6.9: Catálogo Próprio & Independência da AniList
> **Origem (22/08/2026):** a AniList desativou a API globalmente (403 —
> *"temporarily disabled due to severe stability issues"*) e o AniDeck ficou
> inteiro fora do ar: Rankings, Busca, Meu Deck e Detalhes. Confirmado por
> `curl` direto no `graphql.anilist.co`, sem passar pelo backend. Segundo
> incidente de fonte de dados em dois meses — o primeiro foi o encerramento
> do Jikan, em 28/07.
>
> **Mas a fase não é sobre a queda.** A queda só expôs o que já incomodava
> antes dela: tags erradas, "Ação" sempre em primeiro, episódios sem nome ou
> sem imagem, sinopse em inglês, links de streaming quebrados. O dado da
> AniList não é o dado do AniDeck.
>
> **A inversão:** hoje a AniList é o *motor* — toda página a consulta ao vivo
> e a curadoria é um remendo aplicado por cima do que ela devolve. No fim
> desta fase ela vira a *fábrica de peças*: usada no Admin para importar uma
> vez, e o que está gravado passa a ser a fonte de verdade.
>
> **Corte mínimo da fase (o "MVP" dela):** Bloco 1 + Bloco 3. Com esses dois,
> o site sobrevive a uma queda da AniList mesmo sem nenhum campo novo. Os
> Blocos 2 e 4 são o que torna a curadoria completa, e podem ser feitos
> incrementalmente depois.
---
### Bloco 1 — Precedência campo a campo (fundação)
> Faz primeiro. Todo o resto da fase assume esta regra funcionando. Cadastrar
> dado novo em cima do comportamento atual gera trabalho que terá de ser
> refeito.
**A regra, em uma frase:** para cada campo, se o valor curado existir ele
ganha; se estiver vazio, cai para o cache; se o cache não tiver, cai para a
AniList ao vivo. **Nunca soma as fontes.**
Isso é o que permite curadoria parcial: um anime com só a capa curada continua
puxando sinopse e personagens da AniList, sem precisar de flag nem de estado
especial. E é o que torna viável a estratégia de catálogo (ver Bloco 5).
- [ ] **Corrigir a soma de tags nas Estatísticas (bug ativo).** A Afinidade
hoje soma `curated_animes.custom_tags` com `anime_metadata_cache.tags`.
Sintoma observado com **um único anime, curado com 3 tags**: a tela
exibiu 5+ rótulos em inglês (Environmental, Assassins, Crime, Mafia,
Philosophy) e elegeu "Environmental" como Gênero Favorito no card de
topo. Confirmar a causa em `sql/003` e `sql/008` antes de corrigir.
- [ ] **Rótulo sem correspondência na `genre_taxonomy` não entra no ranking
competitivo.** Verificar se hoje ele cai em `genero` por padrão — é a
segunda causa provável do sintoma acima. Tag temática já deveria ficar
fora por decisão de 21/08.
- [ ] **Padronizar `NULL` como "não curado" e valor vazio como "curei e está
vazio de propósito".** Vale para todos os campos de array
(`custom_tags`, `custom_characters`, e os novos do Bloco 2). O
`salvarDestaque` já faz isso certo para personagens — generalizar.
- [ ] **Aplicar a precedência em todos os handlers de leitura**, não só na
busca e no ranking (que já têm o fallback parcial de 30/07).
- [ ] **Registrar a regra no `DECISIONS.md`.**
---
### Bloco 2 — Campos novos de curadoria
- [ ] **`custom_episodes`** (JSONB, mesmo molde de `custom_characters`):
número, título, imagem, data de exibição. Resolve o caso de anime que
a AniList entrega sem episódios cadastrados, sem imagem ou em inglês.
⚠️ Manter a numeração 1..N intacta — `episode_progress` referencia o
número do episódio, e renumerar dessincroniza o progresso já marcado.
- [ ] **`custom_external_links`** (JSONB): plataforma + URL. Os links da
AniList quebram com frequência (Crunchyroll confirmado na prática), e
link morto mata a Ação Rápida "Assistir" da Fase 5.
- [ ] **Dados de estreia:** data de estreia, dia da semana e horário (JST).
É o que permite calcular a contagem regressiva **sem a AniList** — a
Fase 6.6 já sabe derivar as datas dos episódios a partir da `startDate`.
Cadastro pontual: ~10-15 títulos por temporada, os que alguém do grupo
realmente acompanha.
- [ ] **`custom_duration_minutes`:** hoje as Estatísticas usam a duração do
cache com fallback de 24 min. Sem o cache sendo alimentado, o tempo
assistido vira estimativa.
- [ ] **`is_destaque BOOLEAN DEFAULT true`:** hoje curar um anime coloca ele
na home, porque `curated_animes` significa "tem dado customizado" **e**
"é Destaque" ao mesmo tempo. Quando curar virar o caminho normal, isso
atrapalha todo dia. Coluna explícita, não convenção no `order_index`.
- [ ] **Estado de completude** (ex: `curation_status`): qual anime já está
pronto e qual ainda falta. Com 100+ animes curados, não dá para lembrar
onde parou.
---
### Bloco 3 — Resiliência (o site não morre junto com a API)
- [ ] **Cadeia de fallback explícita na leitura:** `curated_animes` →
`anime_metadata_cache` → AniList ao vivo → resposta degradada. Hoje a
AniList é o **primeiro** passo e não existe o último.
- [ ] **Padronizar o mapeamento de erro de upstream.** A mesma falha da
AniList virou 503 no ranking, 500 no detalhe e 502 no Olheiro. Escolher
um código (503 + corpo com motivo) e aplicar em todos os handlers. Isso
é o que teria mostrado em 5 segundos que a causa era externa.
- [ ] **Nunca devolver 500 por falha de terceiro.** 500 significa "meu código
quebrou" e mandou o diagnóstico para o lado errado.
- [ ] **Estado degradado na UI.** A tela de Rankings já acerta ("Ranking
indisponível no momento"); a de Detalhes devolve 500 e o usuário não
entende nada. Padronizar, distinguindo "a fonte externa está fora" de
"deu erro".
- [ ] **Placeholder de imagem via `onError` na tag `<img>`.** As URLs de
imagem da AniList ficam num CDN separado do GraphQL e continuam
funcionando mesmo com a API fora — o placeholder é seguro contra URL
que morre um dia, não contra queda da API.
- [ ] **Suavizar o consumo do Olheiro.** O `buscarCandidatos` faz uma chamada
por tag (8 hoje) em rajada. A AniList reduziu o limite de 90 para 30
requisições/minuto e tem limitador de burst separado. Espaçar as
chamadas e tratar 429 explicitamente.
- [ ] **Atualizar `docs/fluxo-busca.md`:** o debounce de 400ms foi calculado
em cima dos 90/min. A premissa mudou.
---
### Bloco 4 — Painel Admin completo
- [ ] **Editor de episódios** (adicionar, editar, remover, reordenar),
reaproveitando o padrão do `CuradoriaPersonagens`.
- [ ] **Editor de links de streaming.**
- [ ] **Campos de estreia e duração** no formulário.
- [ ] **Lista de curadoria com filtro por completude**, para saber o que
ainda falta preencher.
- [ ] **Botão de importar da AniList por `idMal`** — reaproveita o que a
issue #70 vai construir para o Olheiro.
*Já existente, não refazer:* criar/editar/excluir, upload de capa e banner com
compressão WebP e preview, personagens com nome/imagem/função, tags
reordenáveis, sinopse com reescrita por IA, título, formato e status.
---
### Bloco 5 — Decisões a registrar no `DECISIONS.md`
- [ ] **Precedência campo a campo** e a distinção `NULL` × vazio.
- [ ] **Reavaliar a decisão de ToS de 07/2026** ("nunca armazenar dados de
catálogo"). Importar um anime por vez pelo Admin e guardar o resultado
é diferente de espelhar o banco deles em massa — mas a linha precisa
ser traçada explicitamente e por escrito, não assumida.
Vale conferir também Kitsu, TMDB e a API oficial do MAL: termos
diferentes, garantias diferentes.
- [ ] **Risco de fonte única de dados.** Dois incidentes em dois meses. Não
exige mudar nada hoje — exige estar escrito que o risco é conhecido e
aceito.
- [ ] **Estratégia de semeadura do catálogo:** profundidade antes de largura.
Curadoria completa nos "BIG animes" (todas as temporadas, todos os
episódios com nome e imagem, links conferidos); curadoria parcial no
resto, deixando a AniList cobrir o que já atende bem. Ordem sugerida:
(1) os animes que já estão no deck, (2) temporada atual, (3) fila de
pedidos dos usuários.
---
### 🚧 Pendente de decisão antes de começar
- **Esta fase entra antes ou depois do beta da Fase 7?** O escopo da v1 foi
fechado em 21/08 e faltam dois checkboxes (Olheiro v1 e indicador ▲/▼).
Encaixar esta fase antes adia a v1; encaixar depois significa convidar
10 pessoas para um site que morre junto com a AniList.
- **Fila de pedidos de catálogo:** quando a busca não encontra, o usuário
pede e entra numa fila no Admin. Mesma mecânica da fila do Olheiro, mesmo
componente. Entra nesta fase ou vira Backlog?
## 👥 Fase 7: Multiusuário — Beta Fechado
> **Nota (21/08/2026):** a fase deixou de ser "futuro, avaliar quando chegar" e ganhou objetivo
> concreto: abrir o AniDeck para um grupo pequeno de convidados, gratuitamente, com o propósito
> de observar como o sistema se comporta com gente que não é o autor. **Não há monetização
> nesta fase.** Número de convidados é o que aparecer — duas ou três pessoas já cumprem o
> objetivo técnico de sair da amostra de um usuário só.
- [ ] Cadastro fechado (convite ou confirmação de e-mail) para evitar bot.
- [ ] Teste de isolamento entre contas: validar com uma segunda conta que `media_entries`,
`episode_progress`, `push_subscriptions` e `notifications` não vazam dado entre usuários.
- [ ] Esconder o acesso ao Painel Admin na UI para quem não é admin (o backend já bloqueia).
- [ ] Caminho para exclusão de conta, mesmo que operado manualmente no início.
- [ ] Política de privacidade curta (LGPD).
- [ ] Canal de reporte de bug (grupo de mensagens já resolve).
- [ ] Ativar backup automático no Supabase e validar o procedimento de restauração —
pré-requisito inegociável antes do primeiro convite.
- [ ] Reavaliar modelo de dados e permissões à luz do que o beta revelar.
- [ ] **Pré-requisito para a visão completa de ranking com credibilidade** — ver
`VISAO_RANKING_CREDIVEL.md` (documento de visão, não compromisso de escopo; peso de voto
por XP de gênero só faz sentido com base de usuários real).
## 📱 Fase 8: App Instalável — ✅ Concluída (escopo reduzido)
> **Decisão (21/08/2026):** fase encerrada. O objetivo real — o AniDeck instalar no celular,
> aparecer na gaveta de aplicativos e abrir em tela cheia — foi entregue pelo PWA na Fase 6.7.
> Os dois itens restantes do escopo original foram avaliados e descartados (ver seção abaixo).
- [x] `manifest.json`, Service Worker, ícones e display standalone *(entregues na Fase 6.7)*.
---
## 📋 Backlog / Ideias em Avaliação
> Nada aqui é compromisso de escopo. Reavaliar depois do beta da Fase 7, com base em uso real.
- [ ] **Agente Olheiro — evolução da pontuação.** A v1 nasce com fórmula simples e proposital;
refinar incrementalmente conforme o catálogo e a base de usuários crescerem.
- [ ] **Relatório semanal por e-mail (Gmail API, SDK oficial em Go).** Removido do escopo da
Fase 4.5 em 21/08/2026 — depende do Agente Olheiro estar validado e produzindo sugestões
de qualidade. Mandar e-mail com recomendação ruim é pior que não mandar.
- [ ] **Importação de lista via OAuth da AniList.** Opção (não obrigatória) para quem não quiser
cadastrar o deck manualmente. Tem um efeito colateral relevante: sincronização sustentada
com contas AniList é justamente o critério que os ToS deles citam para autorizar serviços
da mesma natureza. Reavaliar após o beta.
- [ ] **Notificações de novas temporadas/sequências** — avisar quando uma sequência/temporada nova é anunciada.
- [ ] **Filtro por ano na Busca, independente de temporada** — hoje o campo de ano só habilita se
uma temporada estiver selecionada (ver `docs/ideias-para-melhorias.md`, item 7.1). Aceitável
como está por ora; revisar se surgir demanda real de usuário.
### Avaliado e descartado (documentado pra não reabrir sem contexto)
- **Fórum, Clubes, Blogs:** equivalem a construir uma rede social inteira.
- **Mensageria direta (Inbox):** pressupõe comunidade ativa.
- **News / Featured Articles / MALxJapan:** conteúdo editorial que o MAL produz com equipe própria.
- **Mini-página de Pessoa/Estúdio** — ao clicar num dublador/estúdio na página de Detalhe, ver outros trabalhos dele.
- **Fase 6 — Notícias de Anime (descartada em 21/08/2026):** exigiria avaliar e manter fontes RSS,
um job de ingestão periódica e curadoria contínua, sem resolver nenhuma dor real de quem usa o
AniDeck para organizar o que assiste. Mesmo motivo do descarte anterior de "News / Featured
Articles" — a diferença é que ali era conteúdo editorial de terceiro e aqui seria agregação
automática, mas o custo de manutenção recai igual sobre um projeto de um desenvolvedor só.
- **Publicação na Play Store via TWA (descartada em 21/08/2026):** exige conta de desenvolvedor
Google com custo em dólar, conformidade com política de loja, ciclo de review a cada
atualização e manutenção permanente. O PWA já entrega instalação, ícone e tela cheia — o
ganho marginal não paga o custo recorrente no estágio atual.
- **Cache offline completo no Service Worker (descartada em 21/08/2026):** o AniDeck depende de
dado vivo da AniList (episódio no ar, calendário, contagem regressiva). Offline entregaria uma
versão degradada do produto e adicionaria uma classe inteira de bugs de sincronização entre o
cache e o servidor. O Service Worker segue existindo apenas para viabilizar o PWA e o push.
---
## 🧭 Notas de manutenção deste arquivo
- Fases são numeradas cronologicamente. Dívida técnica ou requisito novo vira fase `.5`
intermediária, inserida entre as duas fases que a originaram — nunca empilhada no final.
- Fase concluída não é apagada — vira registro histórico com os itens marcados.
- Item abandonado não é apagado — vai para "Avaliado e descartado" **com a justificativa**,
para não ser reaberto sem contexto meses depois.
- Ideia nova vai para o Backlog. Só vira fase quando houver decisão explícita de fazer.
- Decisão estrutural (arquitetura, framework, banco, auth) não mora aqui: vai para `DECISIONS.md`.
```

## docs/VISAO_RANKING_CREDIVEL.md

```markdown
# 🔮 Visão de Longo Prazo — Ranking com Credibilidade Real
> **Este documento NÃO é roadmap.** Não tem issue, não tem prazo, não é compromisso. É um
> registro da ideia enquanto ela está fresca, pra existir em algum lugar até o dia (se o dia
> chegar) em que fizer sentido puxar pedaços dela pro `ROADMAP.md` de verdade — provavelmente
> depois da Fase 7 (Multiusuário), quando o AniDeck tiver uma comunidade mínima rodando.
>
> Escrito a partir de uma conversa em 17/08/2026. Mantenha esse arquivo fora do fluxo normal de
> revisão de código — ele existe pra sonhar, não pra ser implementado linha por linha.
---
## 🎯 O problema de fundo
Nota de anime hoje (AniList, MAL) é **voto sem contexto**: todo mundo vale o mesmo peso,
independente de conhecer o gênero, ter assistido de verdade, ou estar avaliando por impulso.
Isso produz dois problemas opostos:
- Anime **popular mas mediano** sobe no ranking só por volume de voto.
- Anime **excelente mas nichado** nunca aparece porque poucas pessoas assistiram.
A pergunta central que motiva esse documento: **dá pra medir "bom" de um jeito que separe
qualidade real de popularidade crua — sem fingir que gosto não é subjetivo?**
---
## 🗳️ O sistema descrito na conversa
### 1. Perfil do usuário
Ao criar conta: gênero, nacionalidade, idade, e 3-5 categorias/gêneros favoritos (Isekai,
Fantasia, Romance, etc. — quantidade ideal ainda a validar).
### 2. Peso de voto por XP de gênero
- Voto começa com peso baixo.
- Usuário ganha **XP por gênero** ao marcar anime como assistido (episódios/temporadas completas)
no Meu Deck — ex: assistir Isekai completo dá XP de Isekai.
- Ao atingir um nível (ex: nível 10) num gênero, o peso do voto **dentro daquele gênero** aumenta.
- Ou seja: seu voto em Isekai pesa mais se você **provou**, com tempo assistido real, que entende
de Isekai — não só porque disse que gosta no cadastro.
### 3. Sinal negativo também é dado
Cogitar uma regra pra identificar gêneros que o usuário **menos** gosta — mas só conta o voto
baixo se ele assistiu o anime inteiro (evita "dei nota 1 sem assistir só porque não curto o
gênero").
### 4. Filtros e estatísticas avançadas
Cruzamentos tipo "todos os brasileiros do sexo masculino que assistem Isekai também gostam de
X" — analytics agregada usando os dados demográficos + comportamentais coletados.
### 5. Usuários "nível supremo"
Direito de comentar sobre animes — comentários curados/avaliados antes de publicados
publicamente.
### 6. Voto por episódio (em aberto)
Ainda não decidido se vale a pena — se implementado, precisa de peso próprio pra não distorcer a
nota geral da obra.
---
## ⚖️ Riscos e pontos de atenção (pra encarar quando chegar a hora, não agora)
### Privacidade / LGPD
Coletar gênero, nacionalidade e idade num site brasileiro público entra na LGPD de verdade —
não é proibitivo, mas exige política de privacidade clara, consentimento explícito, cuidado
extra com menores de idade, e uma decisão sobre **o que realmente precisa ser coletado**. Ideia
pra reduzir exposição quando for implementar: o peso de voto por gênero só depende do
**comportamento** (tempo assistido, gênero), não da demografia — dá pra rodar o sistema de XP
inteiro sem pedir nacionalidade/gênero/idade no cadastro, e deixar esses campos como
**opcionais**, só pra quem quiser contribuir com as estatísticas agregadas. Reduz a superfície
de dado sensível sem perder a mecânica principal.
### Gaming do sistema (trapaça)
Assim que o voto valer algo, gente vai tentar burlar: marcar como "assistido" sem assistir, criar
múltiplas contas pra farmar XP, etc. Todo sistema de reputação (Stack Overflow, Reddit karma,
Uber/Airbnb rating) passa por isso mais cedo ou mais tarde. Não precisa de solução agora, só
saber que uma "trava" vai ser necessária no futuro (ex: tempo mínimo entre marcar episódios,
limite de XP ganho por dia, etc.).
### Manipulação coordenada (brigading)
Se o site crescer, grupos organizados (fã-clube, guerra de fandom) podem tentar votar em bloco
pra inflar ou derrubar um anime especificamente. Vale pensar em detecção de padrão anômalo de
voto no futuro (picos suspeitos de votos vindos de contas novas, por exemplo).
### Depende 100% de ter usuários reais
Sem gente votando de verdade, é matemática sem dado pra processar. Está formalmente amarrado à
Fase 7 (Multiusuário) do `ROADMAP.md`, que hoje está marcada como "futuro, avaliar quando
chegar" — e com razão.
---
## 💡 Ideias complementares (things eu pensei que você não tinha mencionado)
### Comparação em vez de nota absoluta
Um problema difícil de resolver só com peso de XP: **escala pessoal de nota varia por pessoa**
(seu 7 pode ser o 9 de outra pessoa). Um jeito diferente de atacar isso — usado por apps como o
Beli (de restaurantes) — é pedir **comparação par-a-par** em vez de nota de 1 a 10: "você gostou
mais de X ou de Y?". Isso gera um ranking relativo (parecido com sistema Elo de xadrez) que é
mais resistente a "escala pessoal" do que pedir uma nota absoluta. Pode ser interessante como
mecânica alternativa ou complementar ao voto direto, especialmente pra usuários de nível alto.
### Transparência do cálculo
Quando o ranking usa peso ponderado, "por que esse anime está em #3" deixa de ser óbvio. Mostrar
um breakdown simples (ex: "nota bruta: 8.2 · ajustada pela credibilidade da comunidade: 8.7")
ajuda a construir confiança em vez de parecer uma caixa-preta arbitrária — principalmente
importante se um dia você quiser competir de verdade com a percepção de credibilidade do MAL/
AniList.
### Selo de "controverso" em vez de esconder a divergência
Anime com nota alta mas variância enorme entre gêneros de fãs (ex: adorado por fãs de Isekai,
odiado pelo resto) pode ganhar um selo "Polarizante" em vez de só uma média que esconde essa
divergência — isso é uma informação genuinamente útil que nem MAL nem AniList mostram hoje.
### Rollout em camadas, não tudo de uma vez
Se um dia isso sair do papel, a sequência mais segura tecnicamente é: (1) Fase 6.5 — média
bayesiana simples usando dados públicos da AniList, já reduz o problema de "voto cru sem
contexto" sem precisar de usuário nenhum; (2) só depois, com base de usuário mínima rodando na
Fase 7, camada de peso por XP de gênero por cima disso. Ou seja, a Fase 6.5 não é descartável —
ela vira o alicerce estatístico de tudo isso, não um desvio.
---
## 📈 Sobre crescimento orgânico
Você mencionou a ideia de criar conteúdo nas redes sociais antes de pensar em tráfego pago — essa
ordem faz sentido: comunidade nerd de anime historicamente responde melhor a conteúdo genuíno
(curadoria, opinião, personalidade) do que a anúncio direto, principalmente pré-lançamento de
qualquer coisa que dependa de confiança da comunidade (que é literalmente o que esse sistema de
ranking está tentando vender). Tráfego pago tende a funcionar melhor **depois** que já existe
alguma prova social orgânica pra sustentar a campanha, não antes.
---
## 🚫 Por que isso não vira Issue hoje
Você é iniciante, esse é seu maior projeto pessoal, e ainda tem bastante chão entre o estado
atual do AniDeck e o ponto onde essa visão faz sentido tecnicamente (Fase 7 pra frente). Nada
aqui precisa ser decidido, revisado ou aceito agora — o valor desse documento é só existir, pra
quando (se) você quiser puxar um pedaço dele pro roadmap de verdade, com o raciocínio já pronto
em vez de reconstruído do zero.
```

## docs/fluxo-busca.md

```markdown
# 🔍 Fluxo de Busca — AniDeck
## Resposta direta à pergunta principal
**Sim, a busca funciona sem cadastro.** O catálogo principal consome a base da AniList (GraphQL), com os "Destaques AniDeck" (curadoria) armazenados no nosso próprio banco servindo de *fallback* e prioridade. Qualquer visitante pode navegar e buscar sem bloqueios. **Só a ação de salvar na sua Deck pessoal exige login.**
---
## Os 4 estados da tela de busca
### 1. Estado vazio (antes de digitar)
Uma prateleira limpa convidando o usuário a explorar.
### 2. Estado "digitando" (busca instantânea com debounce e curadoria)
Conforme o usuário digita, o backend faz o cruzamento: busca primeiro na tabela local `curated_animes` (enriquecimento de dados) e combina com a busca na AniList.
**Detalhe técnico importante:** Como consumimos a AniList (GraphQL), limitamos as requisições a ~90/minuto. Para não sermos bloqueados, o frontend aplica um **debounce de ~400ms** nas teclas digitadas, enquanto exibe *skeletons* na UI.
### 3. Estado "sem resultados"
Mensagem simples amigável caso a combinação de filtros e termos não retorne nada.
### 4. Estado "com resultados"
Cada card de resultado já vem com um botão **"+"** direto nele, economizando cliques.
---
## O que acontece ao clicar no "+"
| Situação do usuário | O que acontece |
|---|---|
| **Sem login** | Abre um *toast/modal* pedindo autenticação: "Faça login para salvar no Deck". Zero atrito antes da intenção real. |
| **Logado** | Adiciona silenciosamente ao banco (`media_entries`) com o status "Quero Assistir" num *quick add*, sem tirar o usuário do fluxo. |
```

## docs/ideias-para-melhorias.md

```markdown
# 📡 Fluxo de Smart Tracking & Streaming Direto
## O Conceito (A "Killer Feature")
Transformar o AniDeck de um simples catálogo estático em uma central de acompanhamento ativa. O foco é a retenção do usuário: entregar a conveniência de saber imediatamente quando há um episódio novo das suas obras favoritas e permitir o redirecionamento direto para a plataforma de streaming (ex: Crunchyroll), com o menor atrito possível.
## 1. O Gatilho de "Novo Episódio" (Backend & AniList)
A mágica acontece cruzando a nossa base local com o nó `nextAiringEpisode` da AniList GraphQL.
* **No Go (BFF):** Ao buscar os animes do usuário (rota `/api/anime/bulk`), o backend também solicita os dados de `nextAiringEpisode` (que contém o `episode` atual e o `timeUntilAiring` em segundos).
* **Lógica de Estado:** O frontend interpreta o `timeUntilAiring`. Se o tempo recém zerou ou está dentro de uma janela de 7 dias desde o último lançamento, o anime recebe a flag visual de lançamento ativo.
## 2. A Experiência no Frontend
A interface adota padrões de plataformas de streaming premium (VOD):
### A. O Deck Pessoal (Dashboard)
* **Badge "NOVO EP":** Animes nas listas "Assistindo" e "Em Dia" ganham um selo em destaque (laranja/vermelho) na capa quando um episódio inédito vai ao ar.
* **Ação Rápida "Assistir":** O card exibirá um ícone de "Play" vinculado aos `externalLinks` da AniList. Um clique redireciona o usuário direto para a página da obra na Crunchyroll/Netflix.
### B. Prateleiras de Descoberta (Rota `/descobrir`)
O estado vazio da busca deixa de existir. A página passa a contar com prateleiras de navegação horizontal (estilo Netflix):
* **Temporada Atual:** Consumindo animes filtrados por `season` (ex: SUMMER 2026).
* **Recém Adicionados:** Animes em alta ou com atualizações recentes.
* **Botão "Ver Mais":** Redireciona para a página de Rankings com os filtros já aplicados na URL.
### C. Feed de Últimos Episódios (Calendário)
Em vez de um calendário global genérico, o foco é um feed ultra-personalizado:
* Mostra uma timeline (Hoje, Amanhã, Quinta-feira) apenas com os animes que o usuário marcou na sua coleção.
* Exibe uma contagem regressiva viva (ex: `⏱ 4H 12M`) até o episódio ir ao ar no Japão.
## 3. Limitações e Contornos (Trade-offs)
* **Link Exato do Episódio:** A AniList não fornece a URL *exata* do player de vídeo do episódio (ex: episódio 12), apenas a URL raiz da obra na plataforma de streaming.
* **Solução de UX:** Como o usuário normalmente já possui sessão ativa no navegador/app da plataforma destino, redirecioná-lo para a URL raiz já exibe o botão principal de "Continuar Assistindo" engatilhado no episódio correto pelo próprio provedor.
```

