# 📺 Fase 6.7 — Progresso por Episódio & Notificação de Lançamento

> Documento de planejamento completo, gerado em 17/08/2026, pra registrar o raciocínio por trás
> dessa mudança antes de virar código. Cole os blocos de Issue direto no GitHub Projects, na
> ordem sugerida no final. Segue o formato do `AGENTS.md` à risca.

---

## 🎯 Motivação (por que estamos fazendo isso)

Hoje o `media_entries` rastreia status **por anime inteiro** (Assistindo, Completo, etc.), sem
saber quais episódios especificamente já foram vistos. Duas necessidades levaram a essa decisão:

1. **Experiência do usuário:** ver quais episódios já assistiu (com imagem, tipo Crunchyroll)
   é uma feature de qualidade de vida que falta hoje no Meu Deck.
2. **Base pra visão de longo prazo do ranking com credibilidade** (ver
   `VISAO_RANKING_CREDIVEL.md`): o sistema de XP por gênero que você imaginou depende de medir
   *tempo assistido real*, e progresso por episódio é o dado mais preciso possível pra isso —
   muito mais que só "está na lista como Completo".

**Importante — isso NÃO bloqueia a IA de recomendar.** A versão simples do Ranking Ponderado
(Fase 6.5, média bayesiana) já funciona com dado que a AniList fornece hoje, sem depender de
nada aqui. Essa fase é uma melhoria de precisão pro sonho de longo prazo, não um pré-requisito
pra qualquer coisa que já está no roadmap ativo.

---

## 🧱 Gargalos identificados durante a análise

### 1. Cobertura de imagem por episódio varia
A AniList expõe um campo `streamingEpisodes` (título + thumbnail + link de origem por
episódio), preenchido a partir de sites de streaming legítimos. Funciona bem pra anime popular
(o exemplo de "Slime" que você mandou certamente tem). Anime nichado ou antigo pode vir com essa
lista **vazia**. Não é bug nosso — é limitação de dado de terceiro. Precisa de fallback.

### 2. AniList não agrupa "temporadas" do jeito que Crunchyroll mostra
Nas suas imagens de referência, "Slime" aparece com Season 1/2/3/4 dentro de **um único** título.
Na AniList, cada temporada normalmente é uma **entrada separada** (um `mal_id`/`id` próprio por
temporada) — é assim que seu app já funciona hoje (cada `media_entries.mal_id` já é uma
temporada específica). Ou seja: **não precisamos construir agrupamento de temporada nenhum** —
já temos isso de graça, de um jeito diferente do Crunchyroll, mas equivalente na prática.

### 3. Notificação de episódio novo precisa de gatilho externo
Igual discutimos sobre o Agente Olheiro: nada dispara sozinho às 3h da manhã sem um agendador
batendo numa rota. Reaproveitamos a mesma solução já decidida (endpoint interno protegido por
chave secreta + cron-job.org gratuito), sem custo novo.

### 4. Confusão a evitar: isso não é "assistir vídeo dentro do AniDeck"
Reforçando o que você já deixou claro: nenhuma dessas issues envolve hospedar ou tocar vídeo. É
só marcar presença/ausência por episódio, com imagem de referência. Mais simples e mais legal
juridicamente (sem questão de direito autoral de streaming).

---

## 🗺️ Visão geral da solução (3 partes)

1. **Backend:** nova tabela `episode_progress` + endpoints pra marcar/desmarcar episódio.
2. **Frontend:** grade visual de episódios na página de detalhe/Meu Deck, com toggle assistido.
3. **Notificação:** checagem diária de `nextAiringEpisode` (já usado na Fase 5) + alerta pro
   usuário quando um anime que ele acompanha lança episódio novo.

---

## 📋 Issue 1 — Progresso por Episódio (Backend)

```markdown
Título: feat(db): criar tabela e endpoints de progresso por episódio #XX

**🏷️ Labels:** `backend`, `database`, `fase-6.7`

### 🎯 Objetivo
Hoje o media_entries só rastreia status por anime inteiro. Precisamos de granularidade por
episódio para: (1) exibir progresso visual no frontend, (2) ter base de dado mais precisa para
a futura Fase 7 (peso de voto por tempo assistido real).

### 📋 Tarefas
- [ ] Criar migration para tabela `episode_progress`:
      `id uuid, user_id uuid references auth.users, mal_id int, episode_number int,
      watched_at timestamptz default now(), created_at timestamptz default now()`
- [ ] Constraint `UNIQUE (user_id, mal_id, episode_number)` — evita duplicata ao marcar 2x
- [ ] Ativar RLS na tabela: policy de SELECT/INSERT/DELETE restrita a `auth.uid() = user_id`
- [ ] Endpoint `POST /api/entries/{mal_id}/episodes/{number}` — marca episódio como assistido
      (extrair userID do contexto do JWT, NUNCA do payload — mesmo padrão do bugfix de
      HandleCreate já resolvido)
- [ ] Endpoint `DELETE /api/entries/{mal_id}/episodes/{number}` — desmarca
- [ ] Endpoint `GET /api/entries/{mal_id}/episodes` — lista números de episódio já assistidos
      pelo usuário logado, para aquele anime
- [ ] Todas as rotas dentro do grupo `protegido` (RequireAuth) já existente no main.go

### ✅ Critérios de Aceite
- [ ] Usuário autenticado marca/desmarca episódio e o estado persiste no banco
- [ ] RLS bloqueia tentativa de acessar/editar progresso de outro usuário (testar via IDOR
      manual: tentar marcar episódio passando um user_id diferente no payload — deve ser
      ignorado, igual já fizemos no HandleCreate de entries)
- [ ] Testes unitários: marcar episódio, desmarcar, tentar duplicar (deve ser idempotente ou
      rejeitar), tentar acessar progresso de outro usuário (deve falhar)
```

---

## 📋 Issue 2 — Grade de Episódios (Frontend)

```markdown
Título: feat(ui): grade visual de episódios com progresso #XX

**🏷️ Labels:** `frontend`, `ux`, `fase-6.7`

### 🎯 Objetivo
Exibir episódios do anime (imagem + número + assistido/não assistido) na página de detalhe,
inspirado no layout de referência do Crunchyroll, sem player de vídeo — só tracking visual.

### 📋 Tarefas
- [ ] Adicionar campo `streamingEpisodes { title thumbnail url site }` na query GraphQL do
      cliente AniList em Go (mesmo padrão do `nextAiringEpisode` da Fase 5)
- [ ] Fallback: se `streamingEpisodes` vier vazio, gerar lista genérica "Episódio 1" a "Episódio
      N" (usando o campo `episodes` que já existe) sem thumbnail — placeholder visual simples
- [ ] Criar componente `EpisodeGrid`: thumbnail + número + título + toggle de assistido
- [ ] Toggle chama os endpoints da Issue 1 (POST/DELETE) e atualiza estado local
- [ ] Contador de progresso (ex: "12/25 episódios") refletido no card do Meu Deck
- [ ] Nota: temporadas não precisam de agrupamento manual — cada temporada já é um mal_id
      separado no seu modelo atual (ver gargalo #2 do documento de planejamento)

### ✅ Critérios de Aceite
- [ ] Grade exibe corretamente para anime com streamingEpisodes preenchido
- [ ] Fallback funciona (sem thumbnail) para anime sem esse dado
- [ ] Toggle marca/desmarca e o estado sobrevive a reload de página
```

---

## 📋 Issue 3 — Notificação de Episódio Novo

```markdown
Título: feat(automation): alerta de novo episódio lançado #XX

**🏷️ Labels:** `backend`, `automation`, `fase-6.7`

### 🎯 Objetivo
Avisar o usuário quando um anime marcado como "Assistindo"/"Em Dia" lançar um episódio novo,
usando o campo nextAiringEpisode (já consumido na Fase 5, calendário).

### 📋 Tarefas
- [ ] Endpoint interno `POST /api/internal/check-new-episodes`, protegido por chave secreta em
      header (não JWT de usuário — não há sessão nesse contexto de execução agendada)
- [ ] Lógica: para cada anime com status Assistindo/Em Dia (de qualquer usuário), comparar o
      nextAiringEpisode atual com o valor salvo da última checagem em `anime_metadata_cache`
- [ ] Se mudou (episódio novo lançado): criar registro numa tabela `notifications`
      (user_id, mal_id, episode_number, read_at nullable, created_at)
- [ ] Endpoint `GET /api/notifications` — lista notificações não lidas do usuário logado
- [ ] Endpoint `PUT /api/notifications/{id}/read` — marca como lida
- [ ] Frontend: ícone de sino com badge de contagem, lendo desses endpoints
- [ ] Disparo diário via cron-job.org (gratuito) batendo no endpoint interno — mesma solução já
      decidida para o Agente Olheiro, sem custo de infraestrutura novo
- [ ] **Mitigação de cold-start:** o cron-job.org tem timeout de 30s por execução, e o Render
      free pode levar mais que isso pra acordar do zero. Configurar **dois agendamentos**, com
      1-2 minutos de diferença: o primeiro só "acorda" o Render (pode falhar/timeout, é
      descartável), o segundo roda a checagem de verdade já com o servidor quente

### ✅ Critérios de Aceite
- [ ] Endpoint interno rejeita chamada sem a chave secreta correta (testar com header ausente
      e com chave errada)
- [ ] Notificação é criada uma única vez por episódio novo (rodar a checagem 2x seguidas não
      deve duplicar)
- [ ] Segundo agendamento (checagem real) completa dentro do limite de 30s do cron-job.org
      mesmo em cold-start
- [ ] Testes unitários: detecção de episódio novo, não-duplicação, autenticação do endpoint
```

> **Nota de auditoria (17/08/2026):** uma segunda IA revisou este documento e apontou a
> hibernação do Render como um "conflito crítico" que invalidaria a Issue 3, confundindo a
> decisão de descartar o n8n com a decisão de usar cron-job.org (que foi adotada
> *especificamente* para contornar a hibernação, não é vítima dela). A auditoria identificou um
> risco real e mais estreito — o timeout de 30s do cron-job.org pode não ser suficiente pra um
> cold-start completo — já mitigado acima com o agendamento duplo. A Issue 3 **não** precisa ser
> descartada nem adiada para um plano pago.

---

## 🔢 Ordem recomendada de implementação

1. **Issue 1** primeiro — sem a tabela e os endpoints, não tem o que exibir no frontend.
2. **Issue 2** depois — depende diretamente da Issue 1 estar funcionando.
3. **Issue 3** por último e é opcional/independente — pode ser feita em paralelo ou depois, já
   que reaproveita infraestrutura de notificação nova (tabela própria), não depende de 1 nem 2
   tecnicamente, só faz mais sentido logicamente vir depois.

Cada issue já nasce testável isoladamente e pode virar um PR próprio pra staging, seguindo o
fluxo normal do `AGENTS.md`.
