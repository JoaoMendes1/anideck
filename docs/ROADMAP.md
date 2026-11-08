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

> **Mudou em 22/09/2026.** O projeto saiu do Render para VPS própria, e o deploy de produção
> passou a ser `git push` na `main`, via GitHub Actions. **A homologação ficou sem destino:**
> o ambiente de staging vivia no Render e foi suspenso junto. O fluxo do `AGENTS.md` continua
> válido como disciplina de branch, mas o passo "validar em homologação" não tem onde acontecer
> até que um segundo container suba na VPS. Ver `DECISIONS.md` e `AGENTS.md`.

## 📍 Status atual (31/10/2026)

| Fase | Status |
|---|---|
| 1 · Fundação & Arquitetura | ✅ Concluída |
| 2 · Catálogo Pessoal | ✅ Concluída |
| 2.5 · Curadoria Pessoal (Admin) | ✅ Concluída |
| 3 · Identidade Visual | ✅ Concluída |
| 4 · Dashboard de Estatísticas | ✅ Concluída |
| 4.5 · Automação e IA Generativa | ✅ Concluída |
| 5 · Smart Tracking & Calendário | ✅ Concluída |
| 6.5 · Ranking Ponderado | ✅ Concluída |
| 6.6 · Página de Detalhes | ✅ Concluída |
| 6.7 · Progresso por Episódio | ✅ Concluída |
| 6.8 · Taxonomia & Estatísticas | ✅ Concluída |
| 6.9 · Catálogo Próprio & Independência | ✅ Concluída |
| 7 · Multiusuário | ✅ Concluída — beta fechado em andamento |
| 8 · App Instalável | ✅ Concluída (escopo reduzido) |
| 9 · Independência da AniList na curadoria | ✅ Concluída (31/10/2026); falta medir o resultado no catálogo real |
| 10 · RAG e busca semântica | 💭 A planejar, depois da Fase 9 |
| 11 · Home e navegação | ✅ Concluída (31/10/2026) |
| 12 · Meu Gosto e distribuição | ✅ Concluída (08/11/2026) |
| 13 · Reformulação Visual, Automação de Curadoria e Inteligência de Gosto | ✅ Concluída (08/11/2026) |
| 14 · Guilda & Gamificação | ✅ Concluída (08/11/2026) |
| 15 · Comunidade base | ✅ Concluída (08/11/2026, #154); falta abrir o beta |
| 16 · Economia e cartas | 🚧 Em andamento (16.0 concluído, #166); falta abrir o beta |
| 17 · Comunidade viva | 📋 Planejada, com issues (#179) |

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
- [x] **Engenharia de Prompt Dinâmica e Resiliência:** Criação de cache em memória no Go (`sync.RWMutex`) consultando tabela genérica no Supabase para editar as regras da IA sem mexer no código, suporte a Markdown, e fallback automático (`3.8-flash` -> `3.7-flash` -> `3.6-flash`).
- [x] **Decisão arquitetural (17/08/2026): n8n descartado** — exigiria hospedar/manter mais um
      serviço com custo recorrente, incompatível com o estágio atual do projeto. Implementação
      fica **nativa em Go** (mesmo backend, sem serviço novo), disparada por agendador externo
      gratuito (cron-job.org) batendo num endpoint interno protegido por chave secreta — mesmo
      padrão adotado na Fase 6.7. Registrado em `DECISIONS.md`.
- [x] 🔄 **Agente Olheiro v1 (fila de sugestões de curadoria).** Cruza o perfil de gosto do
      usuário com os *trends* da AniList e grava candidatos em `curation_suggestions`, revisados
      manualmente numa aba nova do Painel Admin (botões "Curar" / "Dispensar"). Endpoint
      `POST /api/admin/olheiro/scan`, disparado sob demanda pelo Painel Admin, com o login do
      admin (`RequireAuth` e `RequireAdmin`).
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
>
> **Nota (26/08/2026):** fase encerrada. O indicador ▲/▼ foi implementado (issue #73):
> `ranking_snapshots` grava uma foto a cada 30 dias, e o `updateGlobalCache` lê a foto
> anterior antes de gravar a nova. Anime sem histórico não exibe indicador; quem manteve
> a posição exibe `–`.

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
> timeout de cold-start levantados na issue da fase.

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

## 📚 Fase 6.9: Catálogo Próprio & Independência da AniList (Concluída)

> **Origem (22/08/2026):** a AniList desativou a API globalmente (403 —
> *"temporarily disabled due to severe stability issues"*) e o AniDeck ficou
> inteiro fora do ar: Rankings, Busca, Meu Deck e Detalhes. Confirmado por
> `curl` direto no `graphql.anilist.co`, sem passar pelo backend. Segundo
> incidente de fonte de dados em dois meses — o primeiro foi o encerramento
> do Jikan, em 28/07.
>
> **A inversão:** hoje a AniList é o *motor* — toda página a consulta ao vivo
> e a curadoria é um remendo aplicado por cima do que ela devolve. No fim
> desta fase ela vira a *fábrica de peças*: usada no Admin para importar uma
> vez, e o que está gravado passa a ser a fonte de verdade.

---

### Bloco 1 — Precedência campo a campo (fundação)

- [x] **Corrigir a soma de tags nas Estatísticas (bug ativo).** A Afinidade
      hoje soma `curated_animes.custom_tags` com `anime_metadata_cache.tags`.
      Sintoma observado com **um único anime, curado com 3 tags**: a tela
      exibiu 5+ rótulos em inglês (Environmental, Assassins, Crime, Mafia,
      Philosophy) e elegeu "Environmental" como Gênero Favorito no card de
      topo. Confirmar a causa em `sql/003` e `sql/008` antes de corrigir.
- [x] **Rótulo sem correspondência na `genre_taxonomy` não entra no ranking
      competitivo.** Verificar se hoje ele cai em `genero` por padrão — é a
      segunda causa provável do sintoma acima. Tag temática já deveria ficar
      fora por decisão de 21/08.
- [x] **Padronizar `NULL` como "não curado" e valor vazio como "curei e está
      vazio de propósito".** Vale para todos os campos de array
      (`custom_tags`, `custom_characters`, e os novos do Bloco 2). O
      `salvarDestaque` já faz isso certo para personagens — generalizar.
- [x] **Aplicar a precedência em todos os handlers de leitura**, não só na
      busca e no ranking (que já têm o fallback parcial de 30/07).
- [x] **Registrar a regra no `DECISIONS.md`.**

---

### Bloco 2 — Campos novos de curadoria

- [x] **`custom_episodes`** (JSONB, mesmo molde de `custom_characters`):
      número, título, imagem, data de exibição. Resolve o caso de anime que
      a AniList entrega sem episódios cadastrados, sem imagem ou em inglês.
      A sobreposição é **por número do episódio**, nunca por ordem no array —
      `episode_progress` referencia esse número e compactar a lista faria o
      progresso já marcado apontar para o episódio errado, em silêncio. Travado
      dos dois lados: teste na leitura, campo desabilitado ao editar.
      O editor tem **"Importar da AniList"** e **"Gerar vazios"** (que funciona
      com a API fora do ar), e nenhum dos dois sobrescreve o que já foi curado.
- [x] **`custom_external_links`** (JSONB): plataforma + URL. Diferente dos
      episódios, aqui a curadoria **substitui** a AniList em vez de somar: o
      motivo de cadastrar um link é o de lá estar quebrado. URL que não comece
      com `http`/`https` é recusada no servidor, não só no formulário.
- [x] **Dados de estreia:** guardado como um `TIMESTAMPTZ` único em vez de data +
      dia da semana + horário separados — os outros dois derivam dele, e o tipo
      converte corretamente para o fuso de quem está olhando. O Painel captura
      data **e hora** no horário local de quem cadastra, e a grade de episódios
      usa esse instante no lugar da estimativa quando ele existe.
- [x] **`custom_duration_minutes`:** aplicado sobre a duração da AniList. Valor
      zero ou negativo é ignorado — zeraria o tempo assistido, pior do que a
      estimativa de 24 min que já existia.
- [x] **`curation_status`:** editável no formulário e visível como selo colorido
      na lista lateral do Painel, junto da contagem de episódios curados. Sem
      aparecer na lista ele não resolveria o problema que motivou sua criação.
- [x] **`is_destaque BOOLEAN DEFAULT true`:** coluna criada, editável no Painel e
      sinalizada na lista com o selo "oculto". A vitrine que faltava foi construída
      junto: uma faixa de Destaques no topo do Meu Deck, alimentada por
      `GET /api/curation?destaques=true`. Sem o parâmetro o endpoint continua
      devolvendo tudo, que é o que o Painel precisa — filtrar por padrão esconderia
      dele justamente os animes ocultos que ele precisa reencontrar para reexibir.
      **A vitrine não depende da AniList:** título e capa saem de `curated_animes`,
      então ela fica de pé mesmo com a API fora do ar.

---

### Bloco 3 — Resiliência (o site não morre junto com a API)

- [x] **Cadeia de fallback explícita na leitura:** `curated_animes` →
      `anime_metadata_cache` → AniList ao vivo → resposta degradada. Hoje a
      AniList é o **primeiro** passo e não existe o último.
- [x] **Padronizar o mapeamento de erro de upstream.** A mesma falha da
      AniList virou 503 no ranking, 500 no detalhe e 502 no Olheiro. Escolher
      um código (503 + corpo com motivo) e aplicar em todos os handlers. Isso
      é o que teria mostrado em 5 segundos que a causa era externa.
- [x] **Nunca devolver 500 por falha de terceiro.** 500 significa "meu código
      quebrou" e mandou o diagnóstico para o lado errado.
- [x] **Estado degradado na UI.** A tela de Rankings já acerta ("Ranking
      indisponível no momento"); a de Detalhes devolve 500 e o usuário não
      entende nada. Padronizar, distinguindo "a fonte externa está fora" de
      "deu erro".
- [x] **Placeholder de imagem via `onError` na tag `<img>`.** As URLs de
      imagem da AniList ficam num CDN separado do GraphQL e continuam
      funcionando mesmo com a API fora — o placeholder é seguro contra URL
      que morre um dia, não contra queda da API.
- [x] **Suavizar o consumo do Olheiro.** O `buscarCandidatos` faz uma chamada
      por tag (8 hoje) em rajada. A AniList reduziu o limite de 90 para 30
      requisições/minuto e tem limitador de burst separado. Espaçar as
      chamadas e tratar 429 explicitamente.
- [x] **Atualizar `docs/fluxo-busca.md`:** o debounce de 400ms foi calculado
      em cima dos 90/min. A premissa mudou.

---

### Bloco 4 — Painel Admin completo

- [x] **Editor de episódios** — adicionar, editar e remover, no padrão do
      `CuradoriaPersonagens`, com "Importar da AniList" e "Gerar vazios".
      **Reordenar foi recusado de propósito:** reordenar significa renumerar, e
      `episode_progress` referencia o número do episódio — renumerar dessincroniza
      o progresso já marcado, sem erro e sem aviso. É a "Armadilha 9" documentada
      no `sql/014`, escrita depois deste item do ROADMAP. O campo de número fica
      travado ao editar; trocar de número exige excluir e recriar, que é uma ação
      consciente.
- [x] **Editor de links de streaming** — `CuradoriaLinks.tsx`, com recusa de URL
      que não seja `http`/`https` tanto no formulário quanto no servidor.
- [x] **Campos de estreia e duração** no formulário.
- [x] **Lista de curadoria com filtro por completude.** O `curation_status` já
      aparece como selo colorido na lista lateral, e os filtros foram
      atualizados para refletir (Parcial / Completo / Revisar).
- [x] **Botão de importar da AniList por `idMal`.** A função `buscarAnimePorIdMal`
      já permitia, e a interface foi ajustada para aceitar números diretos na
      barra de busca.

*Já existente, não refazer:* criar/editar/excluir, upload de capa e banner com
compressão WebP e preview, personagens com nome/imagem/função, tags
reordenáveis, sinopse com reescrita por IA, título, formato e status.

---

### Bloco 5 — Decisões a registrar no `DECISIONS.md`

- [x] **Precedência campo a campo** e a distinção `NULL` × vazio.
- [x] **Reavaliar a decisão de ToS de 07/2026** ("nunca armazenar dados de
      catálogo"). Importar um anime por vez pelo Admin e guardar o resultado
      é diferente de espelhar o banco deles em massa — mas a linha precisa
      ser traçada explicitamente e por escrito, não assumida.
      Vale conferir também Kitsu, TMDB e a API oficial do MAL: termos
      diferentes, garantias diferentes.
- [x] **Risco de fonte única de dados.** Dois incidentes em dois meses. Não
      exige mudar nada hoje — exige estar escrito que o risco é conhecido e
      aceito.
- [x] **Estratégia de semeadura do catálogo:** profundidade antes de largura.
      Curadoria completa nos "BIG animes" (todas as temporadas, todos os
      episódios com nome e imagem, links conferidos); curadoria parcial no
      resto, deixando a AniList cobrir o que já atende bem. Ordem sugerida:
      (1) os animes que já estão no deck, (2) temporada atual, (3) fila de
      pedidos dos usuários.

---

### 🚧 Status da Fase

- **Resolvido:** A Fase 6.9 foi finalizada e testada antes do beta (Fase 7), garantindo
  que os convidados acessem uma plataforma estável e não dependente da estabilidade
  da rede da AniList. Claro que sempre pode aparece melhorias significativas em futuras atualizações.

## 👥 Fase 7: Multiusuário — Beta Fechado

> **Nota (21/08/2026):** a fase deixou de ser "futuro, avaliar quando chegar" e ganhou objetivo
> concreto: abrir o AniDeck para um grupo pequeno de convidados, gratuitamente, com o propósito
> de observar como o sistema se comporta com gente que não é o autor.
>
> **Não há monetização nesta fase.** Número de convidados é o que aparecer — duas ou três
> pessoas já cumprem o objetivo técnico de sair da amostra de um usuário só.

> **Nota (01/09/2026):** os itens de segurança da fase estão fechados. Backup, escrita do
> cache de metadados e exclusão de conta saíram no mesmo dia. O que resta é cadastro,
> política de privacidade e o teste de isolamento.

> **Nota (03/09/2026):** teste de isolamento, troca de senha, login com Google e limite
> de cadastros fechados. O Google expôs que a reautenticação da exclusão de conta era só
> do frontend — corrigido no mesmo dia.

> **Nota (04/09/2026):** fase encerrada, com a política de privacidade publicada. Três itens
> foram **congelados**, com motivo e gatilho de reabertura no `DECISIONS.md`: a recuperação
> de senha, o SMTP próprio e o formulário de reporte de bug no site. Os três são atendidos
> à mão na escala do beta fechado — senha esquecida se resolve pelo painel do Supabase, e
> relato de bug pelo grupo de mensagens. Nenhum deles bloqueia os convites.
>
> **A ordem importa quando reabrir:** o SMTP próprio vem primeiro. O serviço compartilhado do
> plano Free tem teto de 2 e-mails por hora no projeto inteiro, então um fluxo de "esqueci
> minha senha" construído em cima dele passaria no teste do autor e falharia no dia do convite.
>
> Os dois itens que seguem sem marcação não são pendência de execução: reavaliar o modelo
> de dados depende do que o beta revelar, e o pré-requisito do ranking depende de base de
> usuários real. Ficam abertos até o beta rodar.
>
> **Nota (07/09/2026):** durante os preparativos do beta, a AniList enfrentou instabilidade
> global prolongada (403/Cloudflare) e expôs dois pontos de falha: o motor de ranking
> travava com erro 503 no boot do Go (pois dependia da API externa acordada para popular
> a RAM), e os animes curados ficavam sem contagem regressiva viva na agenda.
> Realizado hardening do sistema antes dos convites: o ranking passou a ter estado
> consolidado persistido no banco (`ranking_current_cache`), integrando as notas reais dos
> usuários (`anime_community_scores`), e o backend passou a sintetizar agendamentos
> futuros localmente a partir de `custom_episodes`. Detalhes em `DECISIONS.md`.

- [x] **Página de Configurações e Ajuda.** É a única das dez do `PAGES.md` que nunca
      saiu do protótipo (`docs/prototipos/config-ajuda-prototipo.html`). Precisa conter
      exclusão de conta e redefinição de senha.
- [x] **Cadastro fechado para evitar bot** — resolvido por limite automático em vez do
      toggle global. O `before-user-created` hook (`sql/022`) recusa o cadastro quando
      `auth.users` atinge o valor de `beta_signup_limit` em `app_settings`, hoje em 8.
      A confirmação de e-mail (`Confirm email`) segue ligada como barreira adicional.
      O toggle `Allow new users to sign up` permanece **ligado** de propósito: quem
      fecha a porta é o limite, não ele. Feito em 02/09/2026. Ver #103 e `DECISIONS.md`.
- [x] **Teste de isolamento entre contas** — validado em 02/09/2026 pelo PostgREST direto,
      com JWT de conta comum. Cobertos `media_entries`, `episode_progress`,
      `push_subscriptions` e `notifications` (leitura sem filtro, leitura apontada ao
      uuid alheio e escrita no alheio, cada um com caso de controle), mais as 16 views
      e a permissão de execução das RPCs. Sem vazamento. Ver #99.
- [x] **Troca de senha em Configurações** — o campo existia mas estava dentro do
      `<EmBreve>` do cartão do Google, e o `EmBreve` aplica `inert` na subárvore inteira.
      Separado em dois cartões e implementado com `updateUser({ current_password,
      password })`. A validação da senha atual é do servidor (toggle `Require current
      password when updating`), não do frontend. Feito em 02/09/2026. Ver #100.
- [x] **Recuperação de senha ("esqueci minha senha")** — atendida **manualmente**: quem
      perde a senha me avisa e eu reseto pelo painel do Supabase. **Não existe fluxo no
      app** — o `Auth.tsx` não tem "esqueci minha senha", não chama `resetPasswordForEmail`
      e não há rota para definir senha nova. Marcado como resolvido porque a necessidade
      está coberta na escala de 3 testadores, não porque a feature exista. Congelado em
      04/09/2026, depois do SMTP próprio, que é pré-requisito dele. Ver `DECISIONS.md`.
- [x] **Login com Google** — provider configurado com credenciais próprias (Google Cloud
      Console, app em status Teste com usuários listados) e botão "Continuar com Google"
      no `Auth.tsx`. O cartão saiu do `EmBreve` e mostra se a conta está conectada.
      Entregue em 02/09/2026. Ver #101 e `DECISIONS.md`.
- [x] **Esconder o acesso ao Painel Admin na UI** — `ItensPerfil.tsx` já condiciona
      o link a `isAdmin` vindo do `SessaoContext`. É arrumação, não segurança: a
      rota `/admin` continua acessível por URL e é o `RequireAdmin` que barra.
- [x] **Exclusão de conta pelo próprio usuário** — `sql/021` (FK de `media_entries`
      para `ON DELETE CASCADE`) + `DELETE /api/account` com service role + tela em
      Configurações, com reautenticação por senha e confirmação digitada. Saiu melhor
      que o previsto aqui: não é operada manualmente. Aplicado e validado em
      01/09/2026. Ver #98 e `DECISIONS.md`.
- [x] **Política de privacidade (LGPD)** — página pública em `/privacidade`, fora do
      `RotaProtegida`, com link no `Auth.tsx` (cobrindo e-mail e Google) e em
      Configurações. Conteúdo derivado do `snapshot_schema.sql`, não de suposição.
      Exportação de dados declarada como atendimento por e-mail, sem prometer botão.
      Feito em 03/09/2026. Ver #NN e `DECISIONS.md`.
- [x] **Canal de reporte de bug** — o grupo de mensagens resolve na escala do beta
      fechado. O formulário no site, com envio por SMTP próprio, foi avaliado e
      congelado em 04/09/2026. Ver `DECISIONS.md`.
- [x] **Rotina própria de backup e restauração validada** — pré-requisito
      inegociável antes do primeiro convite. Backup automático não existe no
      plano Free; a rotina é `pg_dump` (banco + `auth.users`) e `aws s3 sync`
      (bucket `curadoria`), rodada à mão antes de cada arquivo `sql/` e
      semanalmente. **Validada em 01/09/2026** em projeto descartável, com
      conferência de contagem e de permissões. Ver `DECISIONS.md`.
      **Atualizado em 22/09/2026:** a rotina deixou de ser manual e roda às 3h
      pelo `cron` da VPS, com destino no Google Drive e 30 dias de retenção.
      A restauração **desta** rotina ainda não foi testada — ver a dívida no fim
      deste arquivo.
- [x] **Escrita de `anime_metadata_cache` fechada a `is_admin()`** — `sql/020`,
      aplicado e validado em 01/09/2026. Era a última policy `USING (true)`
      do schema. Ver `DECISIONS.md`.
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

---

# 🏁 v1.0 — beta entregue

> Tudo acima é o produto sendo construído: Fases 1 a 8, escopo fechado, com fim.
> Daqui para baixo o trabalho muda de natureza — não é mais construir, é evoluir.
> A numeração continua, porque ela conta a história do projeto na ordem.
>
> **Quando este arquivo passar de ~900 linhas**, mover as Fases 1 a 6 para
> `docs/historico/` ou para releases do GitHub, deixando um ponteiro no topo.
> Roadmap saudável guarda o que vem e o passado recente, não tudo.

---

## 🎛️ Fase 9: Independência da AniList na curadoria

> Milestone sugerido no GitHub: `v1.1`. Quatro issues, nesta ordem.

**O critério mudou (12/09/2026).** Até aqui o projeto media *completude* — campo
preenchido ou vazio. A medida certa é **independência**: se a AniList cair e não
voltar, o que sobra? Ela ficou quase uma semana fora e a resposta importa.

Retrato inicial, por `sql/relatorio_independencia_v3.sql`:

| Campo | Curado | Falta |
|---|---|---|
| Sinopse, capa, tags | 114 | 0 |
| Personagens | 113 | 1 |
| Banner | 104 | 10 |
| Estreia | 15 | 99 |
| **Lista de episódios** | 2 | **112** |
| **Onde assistir** | 2 | **112** |

**Independentes da AniList: 1 de 114.**

**O cache não é fallback para esses campos.** O `anime_metadata_cache` guarda só
`title`, `episodes`, `duration_minutes`, `genres`, `studios`, `average_score`,
`tags` e `season_year` — conferido em `buildMetadataPayload`. Episódio, data de
estreia e onde assistir **não estão lá**: vêm da AniList ao vivo ou de lugar
nenhum. E mesmo o que ele guarda é uma foto: se ela morrer, congela.

- [x] **9.1 — Aba Painel de Controle** (#112, #118). Reúne num lugar só o Kill Switch, o
      peso do voto do ranking (que saiu do `const` do `ranking.go` para `app_settings`,
      `sql/027`), as tags fora da taxonomia (`view_unmapped_labels`), o uso do bucket e o
      botão de Resync, com faixa de estado no topo.
- [x] **9.2 — Pesos do Olheiro saem do código** (#113). O `map` literal `tagsDesejadas` do
      `olheiro.go` virou a tabela `olheiro_tags` (`sql/035`), editável no Painel.
- [x] **9.3 — Fila, worker e tela de revisão** (#114, 31/10/2026). Tabela
      `ai_curation_queue` (`sql/038`), aba Revisão da IA e seção Curadoria por IA no
      Controle. A seção Catálogo com botão "Enfileirar" por linha ficou no backlog
      ("Levar o relatório de completude para a tela"); por ora se enfileira pela busca
      de título na própria aba.
      Worker é binário separado (`cmd/worker/`), não goroutine no app. O motivo
      original era a hibernação do free tier; a VPS existe desde 22/09/2026 e a
      separação continua valendo por outro: processo próprio ganha container ou
      `systemd` sem ser derrubado a cada deploy do app. Molde a seguir: `StartRankingEngine` + o `atomic.Bool` com
      `CompareAndSwap`. **Usa `ServiceRoleClient()`, nunca o token da
      requisição** — ver o incidente de 12/09 na Manutenção pós-v1.
- [x] **9.4 — Títulos de episódio em pt-BR, datas, horários e onde assistir** (#115,
      31/10/2026). Os dois prompts ficam em `app_settings`, editáveis no Controle.
      **Não validado contra um anime real:** a issue pedia testar as duas chamadas no
      AI Studio antes de codar, e isso não foi feito. A primeira rodada na fila, em modo
      revisão, faz esse papel; se o resultado não prestar, é só descartar.
      O coração da fase. Exige busca na web: a AniList não tem título em
      português, e o usuário quer o oficial da Crunchyroll.
      **Duas chamadas ao Gemini por anime**: a API recusa `google_search` junto
      com `ResponseMIMEType: application/json` (400 INVALID_ARGUMENT), e pedir
      JSON pelo prompt é instável nos modelos `3.x-flash`. Estes campos **nunca**
      entram em modo automático — o relatório de ressalvas e a aprovação humana
      são parte do desenho, não precaução.

**Correção de rumo (12/09/2026).** A 9.3 tinha sido planejada para gerar sinopse
e tags em lote, e a 9.4 era a última com ressalva. Os dois estavam errados:
sinopse, tags e capa já estão em **100% dos 114**, e são justamente os campos da
9.4 que deixam 112 animes reféns. A 9.4 virou o centro; a 9.3 existe para
alimentá-la.

**O que já encolheu a fase, antes de começar.** O Resync passando a cobrir a
curadoria zerou os 48 animes sem cache, e a derivação da estreia a partir do
episódio 1 mais o botão "Distribuir datas (+7d)" reduzem a curadoria de
episódios a: gerar vazios → distribuir datas → digitar os títulos. Sobrou o
título, que é o que a IA resolve.

**Foto de episódio, capa e banner ficam fora de toda a fase.** Modelo de texto
não busca nem gera imagem. Isso volta pela AniList.

---

## 🧠 Fase 10: RAG e busca semântica — *a planejar*

> Levantada em 10/09/2026. **Só planejar depois da Fase 9 fechar.** Registrado
> aqui para o contexto não se perder entre sessões.

**Motivação:** aprender RAG, embeddings e agentes com ferramenta — aplicado num
projeto real, não em exercício descartável.

**Decidido que NÃO fazer:** RAG sobre dado estruturado. "Quantos Isekai eu
tenho" é `SELECT`, e jogar isso num índice vetorial deixa mais lento, mais caro
e **menos exato**. RAG serve para o que SQL não faz: significado em texto livre.

**Os dois casos que cabem de verdade:**

1. **Busca semântica nas sinopses.** São 114 sinopses reescritas à mão, em
   português, com voz consistente. `WHERE tag = 'Isekai'` nunca responde "anime
   com a melancolia de Frieren". Vira recurso do app: "parecidos com este".
2. **RAG sobre as próprias docs.** `PITFALLS`, `DECISIONS` e `ROADMAP` passam de
   100 KB e crescem. É o caso da wiki interna, literal. Bônus: melhora o fluxo
   de trabalho com IA — o agente busca o trecho em vez de receber tudo colado.

**Ordem sugerida:** embeddings das sinopses → busca por similaridade →
RAG sobre as docs → agente que decide entre SQL e vetor.

A terceira etapa é onde mora o aprendizado real: recortar documento em pedaços é
o que separa RAG bom de ruim. O `PITFALLS.md` é caso ótimo porque já vem em itens
numerados — cortar por item preserva o sentido, cortar a cada N caracteres não.

**Infra (verificado em 10/09/2026):** `pgvector` está incluído no plano **Free**,
sem custo extra — `create extension vector`. O free tier comporta de 50 a 80 mil
vetores; o catálogo tem 114. **Não é preciso banco vetorial novo.** Embedding do
Gemini tem camada gratuita, e a chave já existe no projeto.

**Fora de escopo:** observabilidade com Grafana e MCP para telemetria. Com um
usuário não há métrica que justifique, e inventar escala para praticar ensina
pouco. O bloqueio do MCP do Supabase **mudou de forma em 22/09/2026**: a VPS
existe e o backup diário existe, mas a restauração dessa rotina nunca foi
testada, e produção e homologação continuam sendo o mesmo projeto Supabase.
Credencial de escrita numa integração segue desproporcional enquanto não houver
ponto de restauração comprovado — não apenas capturado.

---
## 🏠 Fase 11: Home e navegação

Motivo: a rota `/` autenticada redireciona para o Deck, e a primeira impressão do produto é uma
grade de coleção. O diferencial analítico não aparece antes da autenticação e, depois dela, fica
atrás de um item de menu que não comunica o próprio conteúdo.

- [x] Home autenticada em `/`, com estreias do dia, retomada e vitrine (#122)
- [x] Trilhas curadas com nota de curadoria (#123)
- [x] Nova barra inferior: Início · Descobrir · Deck · Agenda · Perfil (#125)
- [x] Rankings vira aba dentro de Descobrir (#125)

Referência visual: `docs/prototipos/anideck-app-prototipo-v1.html`.
Dependência: a #125 depende da #122 — um item só sai da barra quando existir destino alternativo.

## 🪞 Fase 12: Meu Gosto e distribuição

Motivo: a leitura do gosto individual não tem equivalente nas plataformas analisadas e hoje está
pouco acessível. É também a base do único artefato capaz de atrair usuários externos sem depender
de base instalada.

- [x] Estatísticas vira Meu Gosto, abrindo com a frase de abertura (#121)
- [x] Bloco "lacuna de gosto" (#124)
- [x] Card de gosto compartilhável em PNG (#126)
- [x] Importar lista do MyAnimeList sem sujar Streak/Horas (#140, movida para a Fase 13)

A gamificação (rank F→SS, XP, insígnias) **não entra aqui**. Continua no
`VISAO_GAMIFICACAO.md` até haver decisão explícita de fazer.

## 🚀 Fase 13: Reformulação Visual, Automação de Curadoria e Inteligência de Gosto (Concluída — 08/11/2026)

Motivo: aproveitar telas maiores (`1440px`), dar presença visual aos cards em todas as páginas,
automatizar demandas repetitivas de curadoria no Admin e aprofundar a interatividade do Meu Gosto.

### Bloco 1 — Admin, Curadoria & Produtividade
- [x] Persistência de aba/seção na URL (`?aba=` / `?secao=`), feedback no botão Atualizar da Revisão IA e limpeza do Roadmap (#130)
- [x] "Curar todos com IA" no Olheiro, alerta de 0 episódios, barra rápida de Admin em Detalhes e Resync inteligente (#131)

### Bloco 2 — Espaço Global, Navegação, Detalhes & Tradução Automática
- [x] Container `1440px`, cards maiores, Rankings/Meu Gosto na Navbar desktop e BottomNav mobile, botão flutuante de busca no mobile e filtro por ano livre (#132)
- [x] "Onde assistir" acima da sinopse e lista compacta para episódios sem foto (#133)
- [x] Tradução automática pt-BR (sinopse e gêneros) para obras não curadas + aviso de "Obra ainda não curada" (#134)

### Bloco 3 — Agenda, Ranking, Meu Deck e Notificações
- [x] "Quero Assistir" visível em Meu Deck na Agenda, transição automática ao marcar episódio e filtro clicável no Deck (#135)
- [x] Cards verticais maiores na Agenda e no Ranking + "Seleção da Casa" recolhível no Meu Deck (#136)
- [x] Central de Notificações com leitura ao clicar, "Ler todas", aba "Não lidas" e ação rápida de marcar episódio (#137)

### Bloco 4 — Meu Gosto Interativo, Preferências & Importação do MAL
- [x] Drill-down interativo em tags, barras de notas, status, quadrante e capas nos Recordes Pessoais (#138)
- [x] Onboarding de gêneros favoritos, edição em Configurações e recomendações "Recomendados para Você" (#139)
- [x] Importação de lista XML do MyAnimeList (`watched_at = NULL`) preservando Streak e Horas (#140)

### Bloco 5 — Novo Início (Logado) + Nova Landing & Login Beta
- [x] Reformulação da Home logada com Hero Banner, trilhos amplos e cards 16:9 de progresso (#141)
- [x] Nova Landing Page com vitrine ao vivo + selo Beta em Desenvolvimento e aviso de acesso limitado (`anidecksuporte@gmail.com`) (#142)

## ⚔️ Fase 14: Guilda & Gamificação

Motivo: materializar a visão de progressão de longo prazo (`VISAO_GAMIFICACAO.md`) com duas moedas independentes (ritmo de episódios marcados no tempo em `xp_ledger` vs bagagem por gênero em `view_user_genre_affinity`), sem punir quem cadastra acervo antigo nem permitir farm de Rank em lote.

- [x] Ledger imutável de XP (`sql/039`), motor de Nível/Rank (`F`→`SS`), Especialista de Gênero (`N1`→`N5`), Insígnias e rotas `/api/guilda` (#145)
- [x] Tela da Guilda (`/guilda`), pílula de Nível/Rank na Navbar, atalho no menu de Perfil e feedback `+XX XP` ao marcar episódio (#146)
- [x] Aba Guilda no Painel Admin: economia de XP, faixas `F`→`SS` com prévia de distribuição, insígnias, auditoria e Kill Switch (#147)

## 💬 Fase 15: Comunidade base — *concluída (#154)*

Motivo: a direção de 08/11/2026 (`VISAO_COMUNIDADE.md`, #153). Tudo aqui precisa funcionar com a base
atual. **Pré-requisito:** abrir o beta (`beta_signup_limit`).

- [x] 15.1 Perfil público com @usuário e vitrine (`/u/:handle`, seção "Perfil público" nas Configurações)
- [x] 15.2 Reação de um toque por episódio, com contagem por episódio. *O ranking de reações da
      temporada ("o episódio que mais fez chorar") fica para a 16.4, junto dos rankings de temporada.*
- [x] 15.3 Comentário por episódio com escudo de spoiler pelo progresso (RLS) e momento marcado
- [x] 15.4 Moderação: denunciar, ocultar, bloquear, fila no Painel Admin e limite de taxa
- [x] 15.5 HP e MP, com Modo Descanso e painel de regras. *O bônus de XP por HP alto fica para a
      Fase 16, junto da economia.*
- [x] 15.6 Rankings de usuários: liga semanal e Hall da Fama (`/membros`, aba do Descobrir).
      *Divisões de 20 que sobem e descem esperam base suficiente.*
- [x] 15.7 Privacidade atualizada para conteúdo publicado e perfil público

## 💎 Fase 16: Economia e cartas — *planejada (épico #165)*

Motivo: um motivo diário para voltar (`VISAO_COMUNIDADE.md`: Economia, Cartas, Rankings e Receita).
**Pré-requisitos:** Fase 15 publicada e o beta aberto. As convenções de implementação estão no
épico; cada item tem a sua issue, com decisões, armadilhas e critérios de aceite.

- [x] 16.0 Tarefas periódicas no worker: base da liga, da raridade das cartas e da Fase 17 (#166)
- [ ] 16.1 Cristais, missões e bônus de Vitalidade
  - [x] 16.1a Cristais: carteira com extrato e painel de economia (#167)
  - [ ] 16.1b Missões diárias (#168)
  - [ ] 16.1c Bônus de XP por Vitalidade alta e Mana mais rápida (#169)
- [ ] 16.2 Loja cosmética
  - [ ] 16.2a Catálogo e compra com Cristais (#170)
  - [ ] 16.2b Aplicar cosméticos: moldura, tema, cor do nome, emblema e vitrine maior (#171)
- [ ] 16.3 Cartas
  - [ ] 16.3a Carta por anime terminado, com raridade (#172)
  - [ ] 16.3b Duelo de gosto entre perfis públicos (#173)
  - [ ] 16.3c Cartas de personagem a partir dos favoritos (#174)
- [ ] 16.4 Rankings
  - [ ] 16.4a Ranking da temporada e top por gênero (#175)
  - [ ] 16.4b Liga semanal com divisões, ativada pelo tamanho da base (#176)
  - [ ] 16.4c Clima da temporada: ranking de reações (#177)
- [ ] 16.5 Apoiador por link externo, sem pagamento integrado (#178)

## 🐉 Fase 17: Comunidade viva — *planejada (épico #179)*

Motivo: fazer a base jogar junta (`VISAO_COMUNIDADE.md`: Guildas como clãs, Conversa e Outras
mecânicas). **Pré-requisitos:** Fase 16 concluída e base com gente suficiente (o épico sugere o mínimo).

- [ ] 17.1 Clãs (o nome é a primeira decisão: "Guilda" já é a progressão pessoal)
  - [ ] 17.1a Clãs de 10 a 30 membros (#180)
  - [ ] 17.1b Desafio semanal coletivo (#181)
  - [ ] 17.1c Liga de clãs por temporada (#182)
- [ ] 17.2 Sala de estreia
  - [ ] 17.2a Chat ao vivo nas três horas depois do lançamento (#183)
  - [ ] 17.2b Destaques viram comentários e aviso de sala aberta (#184)
- [ ] 17.3 Chefão da Temporada (#185)
- [ ] 17.4 Títulos, previsões e classes
  - [ ] 17.4a Títulos ganhos (#186)
  - [ ] 17.4b Previsões apostando Mana (#187)
  - [ ] 17.4c Classes Bardo, Ranger e Paladino (#189)
- [ ] 17.5 AniDeck Wrapped e convite
  - [ ] 17.5a AniDeck Wrapped (#190)
  - [ ] 17.5b Convite com recompensa (#191)
- [ ] 17.6 Avatar montável, bloqueado até ter arte original (#192)
- [ ] 17.7 Curadoria colaborativa: membros de rank alto sugerem correções (#188). *Estava na
      visão e faltava aqui.*

## 🔧 Manutenção pós-v1

> Correção e ajuste feitos depois do escopo da v1 fechar. **Não são fases** — não seguem a
> numeração e não abrem escopo novo. Ficam registrados aqui em ordem cronológica inversa para
> não sumirem: fase concluída não deve ser reaberta só para receber um conserto.

### 08/11/2026 — Cristais, carteira com extrato e painel de economia (#167)

- [x] **Cristais (crystal_ledger, sql/045):** saldo derivado atomicamente por `SUM(quantidade)` (`meu_saldo_cristais`), débitos serializados com `pg_advisory_xact_lock` impedindo saldo negativo, idempotência via `UNIQUE (user_id, motivo, referencia)` e parâmetros em `app_settings.economia_cristais`.
- [x] **Extrato na Guilda e HUD:** pílula e alertas HUD exibem avisos instantâneos de Cristais (+15 💎 / -40 💎); aba de livro-razão na Guilda permite alternar entre histórico de XP e extrato de Cristais.
- [x] **Aba Economia no Painel Admin:** monitoramento de cristais em circulação e total de transações, edição ao vivo de regras e tetos, suporte a ajuste manual com motivo obrigatório e auditoria de transações recentes.

### 08/11/2026 — Link de streaming no banner, rolagem desktop e navegação do Admin (#193)

- [x] **Link de streaming e descarte de redes sociais (#193):** a AniList devolvia Twitter/X e sites oficiais misturados em `externalLinks`; agora os links passam por filtro rigoroso descartando redes sociais, wikis e sites institucionais, com ordenação por prioridade das plataformas reais de vídeo (Crunchyroll primeiro, depois Netflix, Prime Video, Disney+, Max).
- [x] **Rolagem horizontal no desktop na Início (#193):** "Continue de onde parou" e os trilhos ganharam botões de navegação lateral (`‹` e `›`) para mouse no desktop e scrollbar customizada com borda transparente e padding-box para não quebrar nos fundos escuros.
- [x] **Navegação limpa no Painel Admin (#193):** substituído o menu `<select>`/`<optgroup>` e o aperto de 3 colunas por barra superior agrupada responsiva com pills de navegação rápida; eliminada repetição do título "Obras curadas" no rail; e seletor nativo de estado de curadoria, papéis de personagem e plataformas trocados por chips interativos.

### 08/11/2026 — Sino sem episódio fantasma e HUD de status (#163 e #164)

- [x] **Sino (#163):** episódio já visto continuava pedindo "Marcar visto" para quem tem mais
      de mil episódios marcados. Leitura paginada no sino, na importação do MyAnimeList e no XP
      total da Guilda (PITFALLS, item 28).
- [x] **HUD em todas as páginas (#164):** a pílula da Navbar mostra XP, Vitalidade e Mana; o
      ganho sobe da pílula na hora ("+12 XP", "+8 HP", "−5 MP") e a Mana recarrega na tela.

### 08/11/2026 — Nota precisa, coroa no favorito e 16 reações (#161 e #162)

- [x] **Nota como antes (#161):** digitada com até duas casas, régua de 0,1 e botões − e +;
      abrir a página não regrava nota antiga. O favorito volta a ser a coroa do deck.
- [x] **16 reações por episódio (#162):** `sql/043`, com cor e veredito do termômetro na
      própria lista de reações.

### 08/11/2026 — Página do anime, Início no celular e @ da equipe (#155 a #157)

- [x] **Página do anime redesenhada (#155):** abas que trocam o conteúdo, capa maior, status e
      nota direto na página (régua de 0 a 10, salva sozinha), Conversa numa aba com termômetro
      de reações e curadoria do admin recolhível.
- [x] **Cabeçalhos da Início no celular (#156):** título e ações em linhas separadas, e os
      carrosséis deixam de colar na borda (o encaixe ignorava o recuo lateral).
- [x] **@ reservado só para a equipe (#157):** o admin grava `@administrador`, com selo de
      Equipe; a reserva passa a valer no banco (`sql/042`) e a busca por @ não recusa mais os
      reservados.

### 08/11/2026 — Auditoria: push, streak, telas e Painel Admin (#148 a #152)

- [x] **Push confiável (#148):** payload com `json.Marshal` (título com aspas sumia com a
      notificação), validade de 24 h, capa, toque abrindo o anime, ícones PNG e remoção da
      assinatura morta.
- [x] **Streak no fuso de Brasília (#149):** `sql/040` e `CalculateStreak` com o mesmo dia do
      "XP de hoje" da Guilda.
- [x] **Telas no celular e no monitor (#150):** busca no topo, episódios compactos, Meu Deck no
      topo dos Detalhes, Agenda em duas colunas.
- [x] **Início redesenhada (#151):** próximo episódio no topo, semana do deck, ficha da Guilda e
      trilhas em cartões.
- [x] **Painel Admin por assunto (#152):** menu agrupado e nenhuma aba com rolagem lateral no
      celular.

### 31/10/2026 — `Dockerfile` e `.dockerignore` no repositório (#129)

- [x] **O `Dockerfile` existia só no servidor** desde 21/09/2026, nunca commitado: o deploy
      dependia de um arquivo fora do Git. Entrou no repositório sem alteração de conteúdo.
- [x] **`.dockerignore` criado:** `.git`, `.env` da raiz e `node_modules` deixam de entrar no
      contexto do build. O `client/.env` continua entrando, porque as `VITE_*` são lidas no
      build.

### 22 a 24/09/2026 — Desempenho das telas (#128, fechada em 02/11/2026)

- [x] Capas iniciais com carregamento antecipado e `preconnect`; bundle por página
      (`React.lazy`); vitrine em paralelo ao deck e limitada no banco; cache de telas em
      memória; miniaturas das capas curadas; cache de assets; prazo de 5 s para a AniList.
- [x] Compressão `zstd`/`gzip` no Caddy (repositório `infra`, 23/10/2026).
- [x] Critérios de aceite validados em produção e issue encerrada.

### 22/09/2026 — Saída do Render: VPS própria, deploy automático e backup diário

> A maior mudança de infraestrutura desde a migração para a AniList. Não é fase porque não
> altera o produto: nenhuma tela mudou, nenhum campo novo existe. Ver `DECISIONS.md`.

- [x] **VPS própria** (Integrator, Ubuntu 26.04 LTS) com hardening: chave SSH, root bloqueado
      no SSH, UFW, `fail2ban` e `unattended-upgrades`. O Render foi suspenso.
- [x] **Caddy como proxy reverso**, com HTTPS emitido e renovado sozinho. O Nginx que veio na
      imagem do provedor foi parado, não removido — item 27 do `PITFALLS.md`.
- [x] **Domínio próprio:** `anideck.joaomendes.dev.br`, provisório até a compra de
      `anideck.com.br`, adiada de propósito para quando o produto estiver mais completo.
      As Redirect URLs do Supabase foram atualizadas para o domínio novo.
- [x] **Imagem em três etapas** (Node compila o React → Go compila o binário → Alpine junta),
      53 MB. Node é ferramenta de build e não vai para produção.
- [x] **Deploy por `git push` na `main`**, via GitHub Actions com chave SSH dedicada.
- [x] **Backup diário automático às 3h** para o Google Drive: `pg_dump` pelo Session pooler,
      `rclone sync` do bucket `curadoria`, configuração e `.env`, com 30 dias de retenção.
- [x] **O checador de episódios saiu do cron-job.org** para o `cron` da VPS, de 3h para 1h.
- [x] **🔒 `POST /api/internal/check-new-episodes` estava aberto.** O `CRON_SECRET` era exigido
      no boot pelo `internal/config/env.go` e **nunca conferido** pelo handler — a entrada de
      31/08 no `DECISIONS.md` afirmava o contrário. A checagem do header virou as primeiras
      linhas de `HandleCheckNewEpisodes`, e a rota responde 401 sem ele.
- [x] **Infraestrutura versionada** em repositório privado `infra` (Caddyfile e compose).

**Descoberto no caminho, tudo no `PITFALLS.md`:** o Docker fura o UFW (24), deploy verde não
garante código novo (25), o `.env` do servidor envelhece sozinho e derrubou o Grimoire por uma
senha rotacionada (26), e o painel do provedor desfaz a configuração com um clique (27).

**O que ficou pendente:** a homologação perdeu o destino junto com o Render — ver a nota em
"Deploy contínuo" — e a restauração do backup automático nunca foi testada.

### 12/09/2026 — Resync passa a enxergar a curadoria

- [x] **`HandleResyncMetadata` lia só `media_entries`.** Anime curado que ninguém
      adicionou ao deck nunca ganhava linha em `anime_metadata_cache` — e como
      quase todo campo de `curated_animes` é sobreposição, o que ficou vazio não
      tinha de onde vir. Eram **48 dos 114**, incluindo ONE PIECE e Vinland Saga.
      Passou a unir deck + curadoria; o `idsUnicos` já elimina a sobreposição.
      Resultado: **48 → 0**.
- [x] **O lote usa `ServiceRoleClient()`.** Na primeira execução, 34 animes foram
      buscados com sucesso e perdidos na gravação com `(PGRST303) JWT expired`:
      o token do Supabase dura ~1h e o resync passou disso com a AniList lenta.
      **Trabalho de background não pode depender do token de uma requisição que
      já terminou** — é o caso de exceção previsto no `db.go`. Depois disso:
      114 de 114 em 7 minutos.
- [x] **Botão de Resync no Painel.** O endpoint existia no `main.go` desde sempre
      e nunca tinha sido ligado à tela. Provisório no cabeçalho do Painel de
      Curadoria; migra para a aba da 9.1.
- [x] **Estreia derivada do episódio 1.** O Painel tem dois campos de data — o
      `aired_at` do episódio 1 e o `custom_first_aired_at` da obra. São coisas
      diferentes, mas para o episódio 1 o valor é o mesmo, e digitar duas vezes
      cria duas fontes para um fato só (item 19). Agora salvar o episódio 1
      preenche a estreia quando ela está vazia — nunca sobrescreve.
- [x] **Papel do personagem traduzido na exibição.** `MAIN`/`SUPPORTING` viram
      Principal/Coadjuvante no Admin e em Detalhes. O valor gravado continua em
      inglês, que é o vocabulário da AniList. O mapa vive em
      `client/src/types/curation.ts`, não duplicado nos dois componentes.

### 08/09/2026 — Curadoria deixa de depender da AniList

- [x] **Campo de `mal_id` e modo manual no Painel Admin.** O `BuscaAniList` fala direto com o
      `graphql.anilist.co` pelo navegador, sem passar pelo Go — então o Painel era o único
      ponto do app que o Kill Switch e a cadeia de fallback da Fase 6.9 **não cobriam**. Com a
      AniList em manutenção por dois dias, não havia como cadastrar nada. Agora o `mal_id` é
      digitável (buscado no myanimelist.net) e o botão "Criar manualmente" abre o formulário
      sem tocar na API. O id continua sendo o real — sem id próprio, sem mudança de schema.
      Ver #NN e `DECISIONS.md`.
- [x] **`ValidarMalID` no servidor e 409 para `mal_id` duplicado.** O `HandleCreate` gravava
      `mal_id = 0` sem reclamar (campo `int`, item 16 do `PITFALLS.md`), e a única trava era o
      `if (!malId)` do formulário — contornável por requisição direta. A duplicata batia na
      `UNIQUE (mal_id)` e virava 500, que significa "meu código quebrou"; agora é consulta
      prévia e 409 com mensagem legível.
- [x] **Campo travado no modo edição.** Não existe FK de `mal_id` em lugar nenhum, então
      trocá-lo numa curadoria existente órfãna `media_entries` e `episode_progress` em
      silêncio. Mesma trava do número de episódio (item 9 do `PITFALLS.md`).

### 08/09/2026 — Chips de tag da Busca voltam a filtrar

- [x] **12 chaves faltantes no mapa `equivalentes` do `search.go`.** O chip manda o termo em
      inglês (`Magic`) e a curadoria guarda português (`Magia`); sem a chave, o `mesmoRotulo`
      descartava o anime como se não batesse. Afetava `Magic`, `Demons`, `Military`, `Samurai`,
      `Seinen`, `Shoujo`, `Yuri`, `Super Power`, `Video Games`, `Boys' Love`, `Female Harem` e
      `Male Harem` — os 17 gêneros estavam íntegros, só as tags foram esquecidas quando a lista
      de chips cresceu. Sintoma: "Nada encontrado" com o selo da tag visível nos cards. Rótulos
      conferidos contra `SELECT custom_tags FROM curated_animes`. Ver #NN, `DECISIONS.md` e o
      item 19 do `PITFALLS.md`.

### 08/11/2026 — Importação automática de episódios da AniList para curadoria

- [x] **Importação em lote e preenchimento automático de episódios para obras curadas.**
      Das 40 obras que apareciam no alerta "Sem episódios", 39 já tinham episódios na AniList
      e foram migradas automaticamente. Criado endpoint `POST /api/admin/curation/auto-import-episodes`
      e botão de ação em 1 clique ("⚡ Importar da AniList") no banner de Obras Curadas do Painel Admin,
      além de preenchimento automático no formulário ao curar novas obras. Ver #195.
- [x] **Suporte a obras em breve e anunciadas sem episódios.**
      Obras anunciadas (`NOT_YET_RELEASED`) sem episódios agora possuem opção dedicada no Status Manual
      do Admin, exibem o selo `em breve` no trilho do catálogo em vez de falso alerta de erro, e a página
      de detalhes exibe o banner acolhedor "✨ Obra Anunciada · Em Breve" em vez do aviso de emergência.
      Ver #196.
- [x] **Reconciliação de Em Dia/Assistindo, carrossel no topo da Início e lista de Em Breve no Admin.**
      Obras em lançamento com novo episódio disponível agora transicionam automaticamente de "Em Dia"
      para "Assistindo", evitando a contradição com o selo "NOVO EP", e voltam para "Em Dia" ao atingir
      o último episódio disponível. Em "Continue de onde parou", animes com episódios liberados são
      priorizados na frente de obras bloqueadas por lançamento. O topo da Início (`HeroProximoEpisodio`)
      ganha carrossel com controles para navegar entre todas as obras em andamento com episódios prontos,
      e o banner do Painel Admin lista nominalmente cada obra anunciada em breve com link direto para edição.
      Ver #197.

---

## 📋 Pendências Operacionais

- [ ] **🔴 Testar a restauração do backup automático.** A rotina de 22/09 captura todo dia,
      mas nunca foi restaurada — a validação de 01/09 cobriu o `backup.sh` manual, que é outro
      script e outro destino. Backup não restaurado é esperança, não backup. Refazer o
      procedimento de 01/09 num projeto Supabase descartável: contagens, `security_invoker`,
      policies e RPCs. **É a pendência com maior custo em caso de acidente.**

### Avaliado e descartado (documentado pra não reabrir sem contexto)

- **Fórum, Clubes, Blogs:** equivalem a construir uma rede social inteira. *Comentários por
  episódio e guildas como clãs foram reabertos em 08/11/2026 (`VISAO_COMUNIDADE.md`); fórum e
  blogs continuam fora.*
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