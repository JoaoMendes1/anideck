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
| 16 · Economia e cartas | ✅ Concluída (09/11/2026, #165); missões, especialidade e perfil revisados em 17/11/2026 (#245–#248); falta abrir o beta |
| 17 · Comunidade viva | ✅ Concluída (13/11/2026, #179) |
| 18 · O Despertar Isekai | ✅ Concluída (17/11/2026): combate com elementos, poderes e queda (#250), masmorras (#251), expedição de clã (#252), duelos (#253) e evento da temporada (#254), além de 18.1 Meu Personagem (#199, #200), 18.2a escolha de visual (#218), 18.2b cenários (#219), 18.2e auras (#220), equipamentos com atributos (#221), expedições e reforço dos monstros (#222, #229), invocação gratuita (#223) e revisada (#240), Vida persistente com Ouro (#239), skins (#224), desempenho da tela (#226), atributos com livro de habilidades (#227), artes de monstros e itens (#237) e elenco com seis personagens (#238) |
| 18.7 · Perfil social e ajustes do dono | ✅ Concluída no código (17/11/2026): Ouro na barra (#256), fundar clã com custo (#257, #261), classe da Guilda removida (#258), seguir e atividade no perfil (#259), feed (#260) título protegido (#262) e clãs consertados no banco (#263); falta aplicar `sql/096` a `100` |
| 18.8 · Amarras do XP | ✅ Concluída no código (17/11/2026): regra de ouro, estorno imediato de missões e convites, saída de Completo com revisão, três faixas com fila de acervo e trava de remarcação em 7 dias (#265–#269); falta aplicar `sql/101` a `104` |
| 19 · Arena de cartas | ⏳ Não começada |

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

## 💎 Fase 16: Economia e cartas — *concluída (épico #165)*

Motivo: um motivo diário para voltar (`VISAO_COMUNIDADE.md`: Economia, Cartas, Rankings e Receita).
**Pré-requisitos:** Fase 15 publicada e o beta aberto. As convenções de implementação estão no
épico; cada item tem a sua issue, com decisões, armadilhas e critérios de aceite.

- [x] 16.0 Tarefas periódicas no worker: base da liga, da raridade das cartas e da Fase 17 (#166)
- [x] 16.1 Cristais, missões e bônus de Vitalidade
  - [x] 16.1a Cristais: carteira com extrato e painel de economia (#167)
  - [x] 16.1b Missões diárias (#168)
  - [x] 16.1c Bônus de XP por Vitalidade alta e Mana mais rápida (#169)
- [x] 16.2 Loja cosmética
  - [x] 16.2a Catálogo e compra com Cristais (#170)
  - [x] 16.2b Aplicar cosméticos: moldura, tema, cor do nome, emblema e vitrine maior (#171)
- [x] 16.3 Cartas
  - [x] 16.3a Carta por anime terminado, com raridade (#172)
  - [x] 16.3b Duelo de gosto entre perfis públicos (#173)
  - [x] 16.3c Cartas de personagem a partir dos favoritos (#174)
- [x] 16.4 Rankings
  - [x] 16.4a Ranking da temporada e top por gênero (#175)
  - [x] 16.4b Liga semanal com divisões, ativada pelo tamanho da base (#176)
  - [x] 16.4c Clima da temporada: ranking de reações (#177)
- [x] 16.5 Apoiador por link externo, sem pagamento integrado (#178)
- [x] 16.6 Caixa da plataforma/cofre, devolução de itens com taxa, cosméticos de temporada e upload de avatar (#198)
- [x] 16.7 Missões e perfil, revisados em 17/11/2026
  - [x] 16.7a Missões diárias renovadas: 12 no catálogo, 3 por dia em rodízio por usuário que nunca repete as de ontem, pelo menos 2 de assistir, gênero do dia, e um pouco de XP nas de assistir (5 a 20; reagir e comentar dão só AniCoins). XP sem episódio no `xp_ledger` com `mal_id = 0`, fora do teto diário dos episódios, e AniCoins e XP pagos na mesma transação. Corrige "Missão Cumprida", que procurava `COMPLETED` e nunca concluía, e "Na Crista da Onda", que contava qualquer episódio. `sql/087` (#245)
  - [x] 16.7b Missões da semana: 12 longas, 3 por semana (segunda a domingo), pelo menos uma de terminar anime (do ano, da temporada, do gênero da semana ou dois animes), 50 a 100 AniCoins e 30 a 60 XP. Término conta pela carta do anime, uma vez por anime, e só se um episódio dele foi visto na semana (#246)
  - [x] Correção (#247): o resgate de convite falhava inteiro (coluna `saldo_apos` inexistente e XP sem episódio). `sql/088`
  - [x] Correção (#255): o convite de admin, que dá título, ainda falhava: a função tratava `titulos_desbloqueados` como `jsonb`, e a coluna é `TEXT[]`. `sql/095`. Armadilha 37 do `PITFALLS.md`
  - [x] 16.7c Especialidade: o gênero de maior nível de Especialista vira um título de classe (Fantasia → Arcanista, Mistério → Detetive...), com subclasse, na Guilda e no perfil público. Perfil público com os gêneros, horas assistidas, missões cumpridas e recordes do RPG. `sql/089` (#248)

## 🐉 Fase 17: Comunidade viva — *concluída (épico #179)*

Motivo: fazer a base jogar junta (`VISAO_COMUNIDADE.md`: Guildas como clãs, Conversa e Outras
mecânicas). **Pré-requisitos:** Fase 16 concluída e base com gente suficiente.

- [x] 17.1 Clãs (o nome é a primeira decisão: "Guilda" já é a progressão pessoal)
  - [x] 17.1a Clãs de 10 a 30 membros (#180)
  - [x] 17.1b Desafio semanal coletivo (#181)
  - [x] 17.1c Liga de clãs por temporada (#182)
- [x] 17.2 Sala de estreia
  - [x] 17.2a Chat ao vivo nas três horas depois do lançamento (#183)
  - [x] 17.2b Destaques viram comentários e aviso de sala aberta (#184)
- [x] 17.3 Chefão da Temporada (#185)
- [x] 17.4 Títulos, previsões e classes
  - [x] 17.4a Títulos ganhos (#186)
  - [x] 17.4b Previsões apostando Mana (#187)
  - [x] 17.4c Classes Bardo, Ranger e Paladino (#189)
- [x] 17.5 AniDeck Wrapped e convite
  - [x] 17.5a AniDeck Wrapped (#190)
  - [x] 17.5b Convite com recompensa (#191)
- [x] 17.6 Avatar montável em camadas vetoriais geométricas (#192)
- [x] 17.7 Curadoria colaborativa: membros de rank alto sugerem correções (#188)

## 🗡️ Fase 18: O Despertar Isekai — *concluída em 17/11/2026*

Motivo: ligar o hábito de assistir animes a um RPG de fantasia Isekai, em que o usuário tem um
aventureiro próprio que evolui com a atividade real (`VISAO_RPG.md`). Entrega incremental: uma
experiência pequena e funcional de cada vez.

- [x] 18.1 Meu Personagem (primeiro MVP)
  - [x] 18.1a Personagem do jogador: tabela `rpg_personagens`, despertar com nome e rota `/api/personagem`, com o estágio visual calculado pelo nível da Guilda (#199)
  - [x] 18.1b Tela `/personagem` mobile-first: despertar com nome, arte por estágio com reserva para estágio sem ilustração, jornada com silhueta dos estágios futuros e slots de equipamento "em breve" (#200)
- [x] Arte do estágio Veterano (15/11/2026): os quatro estágios passam a ter ilustração, miniatura e retrato próprios; a reserva para estágio sem arte continua no código para personagem novo
- [x] Elenco (16/11/2026): o jogador escolhe entre seis personagens ao despertar e troca de graça na ficha, sem perder nível, itens nem pontos. Haruto (Lanceiro de Fogo), Rin (Assassina do Raio), Mizuki (Maga da Água), Brokk (Guerreiro da Terra) e Celestia (Paladina da Luz) entram ao lado do Espadachim de Éter, cada um com cinco habilidades de classe e uma única. Catálogo de artes montado pelos arquivos; Celestia usa a Veterana até a Lendária existir. Skins da Loja ficam só no Espadachim. `sql/080`, rota `PUT /api/personagem/base` (#238)
- [x] 18.2 Visuais e loja
  - [x] 18.2a Escolha de visual: o jogador fixa a aparência de um estágio já alcançado, com prévia antes de confirmar, ou deixa no automático. Coluna `visual_equipado`, rota `PUT /api/personagem/visual`, e o retrato da barra superior, de `/membros` e do perfil público seguem o visual em uso (#218)
  - [x] 18.2b Cenários de fundo da tela do personagem, comprados na Loja: tipo e slot `cenario`, quatro cenários desenhados em CSS (sem imagem), categoria e prévia na Loja com o personagem do jogador, e `GET /api/personagem` devolvendo o cenário equipado (#219)
  - [x] 18.2c Skins: quatro trajes na Loja, vestidos pela mesma escolha de visual (posse conferida em `user_items`), com o filtro aplicado em todo lugar onde o personagem aparece; devolver a skin volta ao automático (#224). Arte provisória: estágio tingido por filtro CSS
  - [x] 18.2d Slots de equipamento: catálogo `rpg_itens`, inventário e slots próprios, kit inicial equipado na primeira visita, troca com ganho e perda de cada item, conferida no banco por posse, slot e nível (#221). Artes definitivas dos 17 itens e dos 8 monstros, recortadas e mapeadas pelo nome do arquivo (#237)
  - [x] Desempenho e slots sobre a arte: o estado do jogador vem numa consulta só (`rpg_estado_jogador`, com a soma do XP no banco), a configuração de rank e estágio fica 60 s em memória, o kit inicial só é pedido quando o inventário vem vazio, e a tela abre com uma chamada à API (`?completo=1`). Os cinco slots ficam sobre a arte, e item comum deixou de parecer slot vazio (#226)
  - [x] 18.2e Auras do personagem, compradas na Loja: tipo e slot `aura`, três auras em CSS desenhadas atrás da ilustração (`CamadaDaAura`), paradas para quem pediu movimento reduzido, com categoria e prévia na Loja (#220)
- [x] 18.3 Progressão de RPG
  - [x] 18.3a Atributos Vida, Ataque e Defesa, calculados no servidor a partir do nível e dos itens equipados; item acima do nível fica no slot sem somar (#221)
  - [x] 18.3b Seis atributos primários (Força, Inteligência, Constituição, Agilidade, Destreza e Sorte), com 1 ponto para distribuir a cada 2 níveis e redistribuição livre, conferida no banco; derivados calculados no servidor: Vida, Ataque, Defesa, Magia, Éter, Velocidade, Crítico, Dano crítico, Esquiva e Sorte de item (#227)
  - [x] 18.3c Livro de habilidades: cinco comuns do Espadachim liberadas por nível e a única do personagem, "Despertar do Éter". No combate, ordem pela Velocidade, esquiva, crítico pela Destreza, Éter que volta a cada rodada e habilidades usadas sozinhas, com o nome no registro da expedição (#227)
  - [x] 18.3d Aprimoramento de equipamento com Ouro: cada nível soma 1% a cada número do item, no mínimo 1 ponto, com teto por raridade (Comum +4, Raro +6, Épico +8, Lendário +10) e preço crescente (20, 40, 80 ou 150 × o próximo nível); nunca falha, e dois cliques iguais cobram uma vez. `sql/083`, rota `POST /api/rpg/aprimorar` (#241)
  - [x] 18.3e Maestria de habilidades: cada habilidade comum usada em batalha soma usos; com 20, 60 e 150 usos, sobe aos graus II, III e IV, e cada grau dá +2% de força ao golpe ou à cura. A única não tem maestria. O livro mostra o grau e quanto falta. `sql/084` (#242)
  - [x] 18.3f Elementos e queda: Fogo > Terra > Raio > Água > Fogo, Luz e Trevas uma contra a outra, Éter neutro. Quem tem vantagem bate 10% mais forte, e quem está em desvantagem, 3% mais fraco. Cair numa batalha custa 10% do Ouro, e só se luta com pelo menos 30% de Vida (escolha do dono). `sql/090` (#250)
- [x] 18.4 Mundo e PvE
  - [x] 18.4a Expedições: oito monstros, batalha por turnos simulada no servidor com os atributos dele, limite de batalhas por dia (`app_settings.rpg_batalhas_por_dia`, padrão 5), vitória dá bilhetes de invocação e chance de item; combate não dá XP (#222); monstros pós-tutorial reforçados após atributos e habilidades (`sql/078`, #229). Arte provisória: ícone e cor por monstro
  - [x] 18.4b Bestiário: as vitórias contra cada monstro abrem marcos com 10, 50 e 150, e cada marco dá +10% de Ouro nas vitórias contra ele (até +30%). Bônus de Ouro, e não de dano, porque +9% de dano já dobrava a vitória contra o chefe final. Lista de monstros com vitórias, marco e quanto falta; aviso de novo marco na vitória. `sql/085` (#243)
  - [x] Correção (#244): o Slime e o Goblin deixam de prometer item comum que nunca caía (todos os comuns são do kit inicial), e os atalhos de Expedições e Invocação no personagem citam Ouro e Vida. `sql/086`. Armadilha registrada no item 34 do `PITFALLS.md`
  - [x] 18.4c Monstros com poderes: golpe forte, dreno de Vida, escudo, fúria e ajudantes chamados no meio da luta, que entram na frente do monstro e atacam junto. Os dois do tutorial não têm poder. Elemento e poderes ficam no código, como as habilidades das classes; a tela mostra os dois no cartão do monstro e no registro da luta (#250)
  - [x] 18.4d Masmorras: seis masmorras de 2 ou 3 andares com monstros do catálogo, uma por dia, fora do limite das expedições. A Vida passa de um andar para o outro com 25% de fôlego; completar dá +50% de Ouro e um baú com 25 pontos a mais de chance de item. Taxa medida no nível mínimo: de 34% a 100% conforme personagem e elemento; o Trono Primordial fica entre 1% e 4%. `sql/091`, rotas `GET` e `POST /api/rpg/masmorras`, tela `/masmorras` (#251)
- [x] 18.5 Integração comunitária
  - [x] 18.5a Vida persistente: o dano de uma batalha fica para a próxima, guardado como perda em por mil da Vida máxima; a Vida volta 5% por hora (calculado na leitura, sem tarefa agendada), 8% por episódio assistido com XP real (até 5 por dia, uma vez por episódio, por gatilho em `xp_ledger`) ou com Ouro, na Pousada (Vida cheia, a cada 4 h) e com a Poção (30%). Ouro é moeda nova, só do RPG, ganha nas vitórias (5 + 2 × nível do monstro); sem Vida, a batalha é recusada. `sql/081`, rota `POST /api/rpg/recuperar` (#239)
  - [x] 18.5b Duelos: o desafiante luta contra uma cópia da ficha de outro jogador (atributos, habilidades com maestria e elemento), simulada no servidor com os dois lados usando habilidades e esquiva. Só perfis públicos com personagem, dos dois lados. Até 3 por dia, um por oponente; vitória dá 3 pontos e 15 de Ouro, derrota não custa nada. Ranking da temporada (trimestre). `sql/093`, rotas `GET` e `POST /api/rpg/duelos`, tela `/duelos` (#253)
  - [x] 18.5c Expedição de clã: um chefe por clã e por semana, escolhido pela mediana de nível dos membros (do Lobo ao Primordial), com a Vida do monstro × 3 por membro. Cada membro ataca uma vez por dia (20 rodadas contra o chefe, sem gastar a própria Vida); o dano soma. No golpe final, quem atacou na semana recebe Ouro (4 × o de uma vitória) e 3 bilhetes, na mesma transação. `sql/092`, rotas `GET` e `POST /api/rpg/cla/expedicao`, tela `/expedicao-do-cla` (#252)
  - [x] 18.5d Evento da temporada: um arauto por temporada de anime (Inverno, Primavera, Verão e Outono, cada um com o seu elemento), montado no nível do jogador com 85% dos números do catálogo. Uma luta por dia, com a Vida cheia e sem queda. Com 10 vitórias na temporada, título exclusivo ("Caçador do Outono 2026") e 300 de Ouro, uma vez. Cartão nas Expedições (`/expedicoes#evento`). `sql/094`, rotas `GET` e `POST /api/rpg/evento` (#254)
- [x] 18.6 Invocação (a Arena de cartas virou a Fase 19, por decisão do dono em 17/11/2026)
  - [x] 18.6a Invocação gratuita: bilhetes ganhos só em expedições, invocar 1 ou 10, chances visíveis e iguais às do sorteio (`rpg_chances_invocacao`), garantia de épico ou melhor a cada 10, repetidos somam no inventário (#223). Sem pagamento por desenho: ECA Digital, art. 20
  - [x] 18.6a revisada: invocação mais rara. Corrigido o defeito do `sql/073`, em que o resultado "comum" (60%) não achava item fora do kit e caía na reserva de raridade mais alta, dando Lendário em cerca de 62% das invocações. Chances novas: Ouro 78% (25 de Ouro), Raro 17%, Épico 4,5% e Lendário 0,5%; Raro ou melhor garantido a cada 10 sem Raro; Lendário com chance crescente a partir da 70ª tentativa sem ele e certo na 90ª (média de 62 tentativas). Bilhetes por vitória de 1 a 3. `sql/082` (#240)

**Banco:** `sql/080` a `sql/095` aplicados em 17/11/2026, com o snapshot regerado.

**Arte pendente (o sistema já está pronto para recebê-la, sem mudar código de regra):** ilustração de cada skin (entra em `ARTES` com o id da skin e sai de `SKINS`), ícone ou ilustração de cada item de equipamento e de cada monstro, e a segunda personagem do elenco.

## 🤝 Fase 18.7: Perfil social e ajustes do dono — *concluída no código em 17/11/2026*

Motivo: pedidos do dono em 17/11/2026, depois de ver a Fase 18 no ar. Entra antes da Arena de
cartas porque o perfil público e o feed dão motivo para voltar mesmo a quem não joga o RPG.

- [x] 18.7a Ouro na barra do topo, com ícone de moeda próprio (`IconeOuro`) em todas as telas do RPG; no desktop a barra mostra XP, Vitalidade e Mana com números e as duas moedas (#256)
- [x] 18.7b Fundar clã exige nível 15 e custa 300 AniCoins, debitados na mesma transação que cria o clã; a tela mostra o requisito e o que falta antes do formulário. `sql/096` (#257). De passagem: as mensagens de erro dos clãs voltaram a aparecer (#261)
- [x] 18.7c Classe da Guilda (Bardo, Ranger, Paladino) removida: só o Paladino tinha efeito, e a Especialidade já faz o papel de classe. Fica a escolha de título. `sql/097` (#258)
- [x] 18.7d Seguir jogadores e atividade no perfil público: "Assistindo agora" com o último episódio, atividade recente (episódios agrupados por anime e dia, completos, comentários e curtidas) e contadores de seguidores; opção nas Configurações para esconder a atividade sem fechar o perfil. O texto de um comentário só aparece para quem já viu o episódio, como na conversa. `sql/098` (#259)
- [x] 18.7e Feed da comunidade (`/feed`) com abas Geral e Seguindo, "carregar mais" por cursor e link direto para a conversa do episódio (`/anime/ID?aba=conversa&ep=N`) (#260)
- [x] 18.7f Título de honra só muda pela função que confere a conquista. `sql/099` (#262)
- [x] 18.7g Fundar, entrar e ler o próprio clã voltam a funcionar: as três funções falhavam desde o `sql/054` por ler `app_settings.value` (`TEXT`) como `jsonb`. `sql/096` e `sql/100` (#263)
- [x] 18.7h Feed na barra inferior do celular: Início, Deck, Feed, Rankings e Perfil; Agenda e Meu Gosto ficam no menu do Perfil (#264)

**Banco:** aplicar `sql/096` a `sql/100` antes de promover.

## 🛡️ Fase 18.8: Amarras do XP — *concluída no código em 17/11/2026*

Princípio: o XP de agora precisa ser o XP que o estado atual justifica. Desfeita a causa, sai o XP; XP de coisa antiga nunca entra na hora.

- [x] 18.8a **Teste da regra de ouro:** suíte automatizada (`XP total = XP recalculado a partir do estado atual`) cobrindo marcar e desmarcar 20x, `Completo` ida e volta, rever, importar, missão com episódios desmarcados e desmarcar tudo (#265)
- [x] 18.8b **Reavaliação de missões e convites com estorno imediato:** `reavaliar_missoes(usuario)`, tabelas de evidências, gatilhos ao apagar episódio, comentário, reação ou carta, estorno de convite quando zerar episódios e aviso na barra do topo ("−X XP: missão desfeita" e queda de rank). `sql/101` (#266)
- [x] 18.8c **Aviso ao sair de Completo, com opção de rever:** três escolhas ("Vou rever" gravando em `revisoes` sem novo XP, "Desisti ou marquei errado" com prévia de XP e níveis perdidos, e "Cancelar"), sugerindo "marquei errado" em menos de 24h e "vou rever" depois. `sql/102` (#267)
- [x] 18.8d **Três faixas de XP e fila de XP pendente:** Ao vivo (100% ou <= 24h após ir ao ar), Maratona (> 6 eps do mesmo anime em 30 min = 30%) e Acervo (`Completo`/lote/importação = 15% na fila `"XP a receber"`, liberando até 50 XP/dia dentro do teto diário de 180 XP com prioridade do Ao vivo) e extrato de pendentes na `/guilda`. `sql/103` (#268)
- [x] 18.8e **Estornos e remarcação:** tabela `estornos` gravando `xp_original` ao desmarcar e travando remarcação do mesmo episódio em até 7 dias no máximo do valor original. `sql/104` (#269)

**Banco:** aplicar `sql/101` a `sql/104` na ordem antes de promover.

## 🌱 Fase 18.9: Primeiro contato — *em andamento*

Motivo: o beta vai receber gente nova, e a primeira impressão decide se a pessoa volta.

- [x] 18.9a Adiar episódios na curadoria numa ação só, com selo "Adiado" na Agenda e na grade (#279)
- [x] 18.9b Configuração inicial (`/bem-vindo`) para contas novas: perfil, o que está assistindo, gosto, personagem e 50 AniCoins com o título "Recém-desperto". `sql/111`
- [x] 18.9e Denúncia de perfil e de avaliação, aviso na campainha do admin e punições (advertência, silenciar, multa de AniCoins e XP, banir, bloquear e-mail) com histórico e revogação. `sql/112` e `sql/113`
- [x] 18.9f Aviso de Temporada 0 na Guilda e no painel da barra do topo
- [x] 18.9h **HP e MP únicos:** a Vitalidade da barra vira a Vida do personagem. Regenera, cura com episódio, Pousada, Poção de HP e Fonte termal; Poção de Mana; batalha tira HP; 3 dias sem episódio tiram 10%/dia até 20%. `sql/114` (#283)
- [x] 18.9i **Novidades:** o admin publica atualizações com data e hora e caminhos para conferir; aviso no meio da tela (ao entrar e com o site aberto) controlado por novidade; página `/novidades`. `sql/115` (#284)
- [x] 18.9j **Novidades prontas:** cada entrega traz o texto em `novidades_rascunhos.json`; no deploy vira rascunho no Painel ("Prontas para publicar") e o dono só publica. `sql/116` (#285)
- [x] 18.9k **Lutas gastam Mana, em escala maior:** Mana 120 +12/nível (até 999); lutas custam % da Mana máxima (expedição e duelo 5%, chefe 8%, masmorra 12%); Poção de Mana 40%; Ouro das vitórias em dobro. Tudo ajustável em Painel › Moderação. `sql/118` (#289)
- [x] 18.9l **Telas do jogo compactas no celular:** recuo do topo, faixa de combate abaixo da arte do Personagem, atalhos da Guilda em linha. (#290)
- [x] 18.9m **Mercado na Loja:** equipamentos por Ouro, 7 itens novos de nível 12 a 18, comparação com o equipado. `sql/119` (#291)
- [x] 18.9n **Lutas em grupo (na hora):** até 3 contra monstro ou masmorra; convite na tela do outro; preferências de quem pode chamar; trava de 3 recusas; velocidade 1x/2x/4x das batalhas. `sql/120` (#292)
- [ ] 18.9o Lutas em grupo **ao vivo**: cada herói escolhe a ação a cada turno, com espera pelos outros
- [x] 18.9p **Celular compacto (1ª leva) e busca do AniDeck:** escala menor no celular, botões e títulos menores, Deck sem o "Bem-vindo" e o "Buscar Anime", Guilda, painel do topo (HP), Expedições, Masmorras e Rankings compactos; busca de telas e funções na lupa e no Ctrl+K. (#293)
- [ ] 18.9q Celular compacto, 2ª leva: Personagem (abas), Invocação, Clãs, Duelos, Feed, Perfil, Agenda, detalhe do anime, Configurações e modais
- [x] 18.9r **Equipamentos mais ricos:** Magia, Velocidade, Crítico, Dano Crítico e Esquiva nos itens; arma por classe; elmo e luvas; 7 conjuntos com bônus de 2 e 4 peças; 41 itens Épicos e Lendários com arte. `sql/121` (#295)
- [x] 18.9s **Loja mais clara:** moedas explicadas em cada aba, Mercado separado em comprar agora, juntar Ouro, libera depois e já tem, com o motivo no botão. (#296)
- [x] 18.9t **Forja do Brokk:** 11 materiais (vitória de expedição e masmorra completa, ou desmontar cópia repetida); 40 receitas Épicas e Lendárias por Ouro e materiais; vender cópia repetida por Ouro. `sql/122` (#297)
- [x] 18.9u **Sintonia elemental:** peça do elemento do herói rende +15%; 4 peças em sintonia ativam a Ressonância (+5% de Vida, Ataque e Magia). (#309)
- [x] 18.9v **Mais equipamentos:** 32 peças com elemento (elmos e luvas desde o nível 1, armas no elemento de cada classe, joias variadas); Ressonância possível por volta do nível 18. `sql/127` (#310)
- [x] 18.9w **Lutas extras:** depois do limite do dia, comprar batalhas (até 5) e entradas de masmorra (até 2) com Ouro, preço crescente. `sql/128` (#311)
- [x] 18.9u **Celestia Lendária, desbloqueio de elenco por Ouro e espera na troca:** ilustração Lendária da Paladina da Luz (`paladina-luz-lendario*.webp`), 1º personagem grátis no Despertar e demais por 400 Ouro (`POST /api/personagem/desbloquear`), troca gratuita a cada 24h ou antecipada por 150 Ouro (`PUT /api/personagem/base`), sincronizando peças desequipadas de outra classe. `sql/123` (#298)
- [x] 18.9v **Mapa 2D de exploração em Expedições, monstros com 8 atributos e IA tática:** regiões conectadas (Clareira Inicial, Bosque Sombrio, Ruínas do Vazio e Cume Ancestral) com artes ampliadas, folha de inspeção comparando os 8 atributos, dica tática liberada após a 1ª vitória no bestiário, destaque diário (+1 material da Forja garantido na vitória), poderes arcanos com custo de Éter, esquiva do monstro e alternância rápida Mapa 2D / Lista. (#299)
- [x] 18.9w **Expansão do bestiário (64 monstros), linhas de evolução e Mapa-Múndi 2D por regiões:** extração de 56 novas criaturas em `384 × 384` RGBA (`client/src/assets/rpg/monstros/`), `sql/124_rpg_novos_monstros.sql` calibrado do nível 2 ao 58, 7 regiões conectadas por coordenadas (`X`, `Y`, `Conexoes`) com rotação semanal de destaque diário, famílias evolutivas clicáveis na inspeção (`Familia`, `Estagio`, `EvoluiDe`, `EvoluiPara`) e novo Mapa-Múndi 2D interativo em `MapaExpedicoes`. (#300)
- [x] 18.9x **Pack de atualizações — regras HP/bilhetes no Admin, menu Guilda/Personagem, Mapa-Múndi ilustrado, biomas, passiva, contratos e amigos:** cinco novas regras configuráveis em `app_settings.comunidade_regras` (`hp_por_episodio_pct`, `hp_episodios_por_dia`, `hp_regen_hora_pct`, `hp_pocao_pct`, `bilhete_bonus_pct`), reorganização do menu entre **Guilda** (Missões, Expedições, Masmorras, Evento da temporada, Chefão, Extrato) e **Personagem** (Atributos, Habilidades, Invocação, Especialidade, Insígnias), Mapa-Múndi 2D ilustrado (`mapa-mundi.webp`) com barra de Bestiário Global e progresso por região (`Dominada`), efeitos táticos de bioma no mundo aberto, **Passiva de Especialidade** aplicada no combate (`especialidade.go`), Masmorras temáticas com monstros do `sql/124`, **Contratos de Caça Semanais** (`rpg_contratos.go`), filtros e atalhos pós-luta nas Expedições e reconhecimento de amizade mútua (`ele_me_segue` e `amigos` em `social_resumo`). `sql/125` (#301)
- [x] 18.9y **Guilda em abas com atalhos diretos, 6 cartas por página no celular e Mapa-Múndi vertical 3:4:** `Guilda.tsx` organizada em quatro abas (`Aventura`, `Coleção`, `Extrato`, `Progresso` em `?aba=`) com atalhos diretos para Expedições, Masmorras, Evento da Temporada e Chefão na própria página; `SecaoColecaoCartas.tsx` reduzida para `6` cartas/página no celular via `useMidia`; `MapaExpedicoes.tsx` com arte vertical `mapa-mundi-vertical.webp` (`3:4`) e pins compactos com emblema + badge de ordem no celular. (#302)
- [x] 18.9z **Mapa-Múndi amplo no desktop (`1440px`) e câmera interativa com arrasto, pinça e zoom no celular:** página `Expedicoes.tsx` ampliada para `max-w-[1440px]` com painel de atributos e `PainelDaVida` lado a lado; `MapaExpedicoes.tsx` redesenhado para exibir o mapa `16:9` (`mapa-mundi.webp`) em largura total no topo com pinos em medalhão circular e HUD de zoom (`−`, `+`, `Visão geral`/`Focar`), removendo a arte vertical estática (`mapa-mundi-vertical.webp`) em favor de câmera panorâmica navegável no celular (`1,8×` com pan por arrasto e zoom por pinça). (#303)
- [x] 18.9aa **Botão Voltar visível no celular, `Guilda` e `Personagem` na `BottomNav`, Masmorras sem cortes e painel do herói minimizável:** restaurado o botão Voltar no cabeçalho mobile de `Masmorras`, `Expedicoes`, `Personagem`, `Duelos`, `Invocacao`, `ExpedicaoDoCla` e `Chefao`; `BottomNav.tsx` ampliada com `Guilda` e `Personagem` (e destaque automático nas sub-rotas do jogo); removidos cortes por `line-clamp-2` e barras de rolagem cinzas (`flex-wrap` em `Masmorras` e `scrollbar-hide` nas faixas horizontais de `Guilda`, `Grupo` e `Rankings`); suporte à seção `'hud'` em `minimizadas` (`inicio_preferencias.go`, `inicioPreferencias.ts`, `PlayerHudInicio.tsx` e `OrganizarInicioModal.tsx`). (#304)
- [x] 18.9ab **2 atributos por nível, missões individuais e Catálogo RPG no Admin, sem kit inicial e armas por classe:** `PontosDisponiveis` e `rpg_distribuir_pontos` alterados para `(nivel - 1) * 2` com recalibração do chefe final (`6380/320/192`); editor individual de AniCoins e XP para as 15 missões diárias e 12 semanais (`app_settings.missoes_recompensas`, `PainelRecompensasMissoesAdmin.tsx`); nova aba **Catálogo RPG** (`AbaCatalogoRPG.tsx`, `GET /api/admin/rpg/catalogo`) no Painel Admin com totais por classe, elemento, slot, raridade e posse; fim do kit inicial gratuito (`rpg_garantir_kit_inicial` sem entrega), restrição de classe em espadas/machados com limpeza de slots incompatíveis, coluna `elemento` em `rpg_itens` e 8 armas conquistáveis de nível 1 e 12 para Lanceiro, Maga, Assassina, Guerreiro e Paladina no Mercado e drops. `sql/126` (#306)
- [ ] 18.9g Insígnia de pioneiro da Temporada 0 (nome e critério de "ativo" a decidir) e captcha no cadastro
- [ ] 18.9c Página de visitante com demonstração jogável e personagem que evolui com a rolagem
- [ ] 18.9d Importação com regra de zero recompensa (origem marcada no banco) e interruptor no Painel Admin

## 🃏 Fase 19: Arena de cartas — *não começada*

Motivo: a Arena de cartas é a expansão própria descrita no `VISAO_RPG.md` (seção 12); o dono
decidiu em 17/11/2026 que ela fecha fora da Fase 18. Escopo a detalhar em issues antes do código.

- [ ] 19.1 Cartas de combate: cartas de monstro e de equipamento, com raridade, ganhas jogando
- [ ] 19.2 Deck de 5 cartas e duelo de cartas (assíncrono, como os duelos da Fase 18)
- [ ] 19.3 Balanceamento competitivo: carta rara nunca obrigatória para competir

## 🔧 Manutenção pós-v1

> Correção e ajuste feitos depois do escopo da v1 fechar. **Não são fases** — não seguem a
> numeração e não abrem escopo novo. Ficam registrados aqui em ordem cronológica inversa para
> não sumirem: fase concluída não deve ser reaberta só para receber um conserto.

### 17/11/2026 — Início personalizável, destaque configurável e 3ª coluna (#275)

- [x] **Ordem, visibilidade e minimização salvas por usuário (`sql/110`, `inicio_preferencias.go`, `Inicio.tsx`, `OrganizarInicioModal.tsx`):**
      reordenação com botões `↑`/`↓`, ligar/desligar e minimizar cada bloco gravados em `public.user_preferences`
      (`GET`/`PUT /api/inicio/preferencias`); destaque do topo unificado com `"Continue de onde parou"`,
      `"Em destaque"` (`PalcoDestaques.tsx`) configurável entre Curadoria, Em lançamento, Bem avaliados e Em alta, e
      3ª coluna no desktop reunindo Missões compactas ordenadas por prioridade, Sua semana, Chefão e Desafio do Clã.

### 17/11/2026 — Avaliações públicas da obra e missões de avaliação (#276)

- [x] **`anime_reviews`, proteção de spoiler e amarras com limite diário (`sql/109`, `reviews.go`, `missoes.go`, `AvaliacoesDaObra.tsx`):**
      avaliação pública separada da anotação privada do deck (exige `Completo` e mínimo de 100 caracteres, com
      nota `1..10` opcional e spoiler), duas missões novas no catálogo (`Crítica da Obra` +25 XP e `Análise de
      Episódio` ≥ 60 chars +15 XP) com teto de 1× por dia cada e estorno imediato ao apagar ou editar abaixo do mínimo.

### 17/11/2026 — Proteção contra spoiler em comentários e feed (#274)

- [x] **Caixa `Contém spoiler` e marcação inline `||trecho||` (`sql/108`, `TextoComSpoiler.tsx`, `spoiler.ts`):**
      comentários e citações no feed/perfil passam a suportar ocultação de trechos com clique para revelar, além
      de `contem_spoiler` persistido no banco.

### 17/11/2026 — Nome de exibição único e rótulo de personagem RPG (#273)

- [x] **Unificação de nome (`sql/107`, `comunidade.go`, `Configuracoes.tsx`, `Personagem.tsx`):**
      `"Nome de exibição"` passa a valer tanto na conta quanto no perfil público (`Seu @` separado), com backfill
      preservando `profiles.nome` e rótulo explícito `"Nome do personagem (RPG)"` na ficha do herói.

### 17/11/2026 — Números da comunidade por anime e seção "Animes em alta" (#271)

- [x] **Contagens agregadas na obra e pulso recente da comunidade (`sql/106`, `rankings_comunidade.go`, `Detalhes.tsx`, `Rankings.tsx`, `VitrineDescobrir.tsx`):**
      `numeros_comunidade_anime` (`GET /api/anime/{id}/comunidade`) retorna apenas totais por status
      (`Assistindo` somando `Em Dia`, `Completo`, `Dropado`, `Quero Assistir` e `total`) na aba Números e
      no resumo do cabeçalho sem expor identidades; `animes_em_alta_comunidade` (`GET /api/rankings/em-alta`)
      ranqueia obras com mais atividade nos últimos 14 dias (episódios com `watched_at IS NOT NULL`,
      comentários visíveis e reações), descontando drops recentes.

### 17/11/2026 — Feed e perfil deixam de mostrar atividade desfeita (#270)

- [x] **Limpeza automática ao desfazer ações e filtro na leitura do Feed (`sql/105`, `social.go`, `Detalhes.tsx`):**
      apagar uma entrada do deck (`media_entries`) passa a limpar `episode_progress`, `xp_pendente`,
      `revisoes` e `user_cards`; zerar todos os episódios rebaixa `Completo` para `Quero Assistir`;
      `atividade_eventos()` (definição viva do `098`) passa a usar `completado_em` (evitando que
      editar nota ressuscite conclusão antiga) e exige episódio marcado para `completou`, `comentou`
      e `curtiu`. Rotas sociais respondem com `Cache-Control: no-store`.

### 16/11/2026 — Tags e selos compactos no Meu Deck mobile, busca/ordenação e ajustes no Painel Admin (#235)

- [x] **Tags e selos de `AnimeCard` e `DeckCard` no celular:** respeitando o piso de `text-xs` (12 px) do `DESIGN_TOKENS.md`, o rodapé do pôster passa a exibir 1 tag de gênero no celular e até 2 a partir de `sm:` sem quebra de linha (`leading-none`), e os selos de topo (`statusBadge`, `Novo EP`/`Hoje`/`Amanhã`, `#ranking`) ganham espaçamento compacto para não encobrir a arte.
- [x] **Busca por título, ordenação e nota com passo em `MeuDeck.tsx` e `EditarEntradaModal.tsx`:** adicionados filtro textual e ordenação (`Favoritos`, `Maior nota`, `Título A–Z`), margens horizontais alinhadas ao container em 360 px e controles de passo (`-0,5` / `+0,5`) para a nota pessoal.
- [x] **Painel Admin (`PainelAdmin.tsx`, `AbaControle.tsx`, `AbaGuilda.tsx`, `AbaEconomia.tsx`, `CuradoriaEpisodios.tsx`, `DestaqueRailCard.tsx`):** corrigida frase duplicada no texto da estreia do Episódio 1, empilhados os avisos `semEps`/`emBreve` abaixo do cabeçalho de Obras Curadas, padronizados os campos numéricos com `CampoNumerico`/`inputMode="numeric"`, tornada responsiva a grade de insígnias em 360 px e exposto o botão de excluir destaque em telas de toque.

### 16/11/2026 — Vitalidade e Mana crescem com o nível do jogador (#234)

- [x] **Teto de Mana e de Vitalidade por nível (`sql/079` e `comunidade_regras.go`):** `mana_maxima(uuid)` soma `mp_max + mp_por_nivel * (nivel - 1)` até `mp_max_teto` (padrão `50 + 1*(nivel-1)` até `120`, configuráveis na aba Moderação do Painel Admin) e `mana_atual(uuid)` escala a recarga diária proporcionalmente para manter o tempo de recarga cheia (~4 dias). A Vitalidade mantém a constância de `0..100%` para as regras de bônus e escala o teto exibido em `min(400, 100 + 5 * (nivel - 1))` (ex.: `170/170` e `64/64` no nível 15).
- [x] **Orbes, barras, pílula da Navbar e perfil público:** `OrbeVital`, `BarrasVitais`, `PilulaGuilda`, `PlayerHudInicio`, `CartaoVitais` e `PerfilMembro` exibem os valores escalados pelo nível, ajustando o diâmetro do orbe na Início para comportar números de três dígitos.

### 16/11/2026 — Paginação e data com hora no extrato de XP da Guilda (#233)

- [x] **Rota `GET /api/guilda/extrato?pagina=N`:** paginação de 20 itens por página com contagem `"exact"` no `xp_ledger` ordenada por `earned_at DESC` e resolução de títulos pela curadoria/cache (`guilda.go`).
- [x] **Data e hora no fuso de Brasília e paginação em `Guilda.tsx`:** cada entrada do extrato de XP exibe `"DD/MM às HH:MM"` (ou `"hoje às HH:MM"`) em `America/Sao_Paulo` e navega entre páginas com `Paginacao.tsx`.

### 16/11/2026 — Paginação, ordenação e data com hora na Coleção de Cartas (#232)

- [x] **Paginação de 24 cartas por página (`?cartas=`) e seletor de ordenação:** criado o componente reutilizável `Paginacao.tsx`, integrado à `SecaoColecaoCartas` com ordenação por Recentes, Nota ou Raridade, reiniciando para a página 1 ao filtrar ou buscar.
- [x] **Data e hora de obtenção no fuso de Brasília:** `CardCartaColecao` passa a exibir `"Colecionada em DD/MM/AAAA às HH:MM"` (`America/Sao_Paulo`).

### 16/11/2026 — Tela do personagem em duas linhas e painel de combate em abas (#231)

- [x] **Linha 1 com arte e identidade; Linha 2 na largura toda com abas (`?aba=`):** a coluna direita ao lado da arte passa a trazer só nome, classe/elemento, Jornada e visual, Progressão e atalhos de Aventura (sem `lg:sticky` na arte). Abaixo das duas colunas entra o controle segmentado com **Status** (Vida, Ataque e Defesa ao lado dos derivados no desktop), **Atributos** (seis primários em duas colunas e resumo lateral de pontos livres, Salvar e Desfazer) e **Habilidades** (grade de 3 colunas no desktop, com a única ocupando 2).

### 16/11/2026 — Loja com cabeçalho compacto e barra de categorias sem corte (#230)

- [x] **Cabeçalho numa linha no desktop (~72 px):** título **"Loja"**, regra de cosméticos, chip de saldo, link "Ganhar AniCoins" e botão "Seja um Apoiador" (no celular, título e saldo na mesma linha e Apoiador como ícone).
- [x] **Barra de categorias visível inteira no desktop:** `md:flex-wrap` sem rolagem horizontal em telas médias e grandes, `snap-x` com degradê na borda direita no celular, e categorias com contador `0` ocultadas (exceto "Todos os Itens").

### 16/11/2026 — Coleção de cartas volta a mostrar título e capa (#228)

- [x] **Colunas reais no `Select` do PostgREST:** `enriquecerCartasComMetadados` (`cartas.go`) e `rankings_comunidade.go` pediam `images` em `anime_metadata_cache` e `custom_cover_url` em `curated_animes`, colunas que não existem no schema (item 33 do `PITFALLS.md`). Passaram a pedir `mal_id,title` e `mal_id,custom_title,custom_cover_image`, registrando erro no log em vez de ignorá-lo.
- [x] **Capas em lote para obras fora da curadoria:** a `SecaoColecaoCartas` busca as capas das cartas visíveis sem imagem (até 24 por vez) em `POST /api/anime/bulk`, seguindo a cadeia curadoria → cache → AniList.

### 15/11/2026 — Coluna da semana de volta na Início

- [x] **Coluna lateral com "Sua semana" restaurada** a partir de 1280 px, como era antes do #215: sem ela a agenda esticava na largura toda. O palco de destaques passa a caber na coluna principal, com a fila das próximas embaixo.
- [x] Páginas de uso diário de volta ao limite de 1440 px; só o Painel Admin, que ganhou o menu lateral, fica mais largo.

### 15/11/2026 — Pódio no ranking e notificações mais limpas (#217)

- [x] **Pódio** com os três primeiros do ranking global (`PodioRanking`), só sem filtro: com filtro, o 1º da lista não é o 1º do AniDeck. O resto em duas colunas a partir de 1536 px.
- [x] **Notificações:** abas em controle segmentado, faixa lateral na cor do tipo para as não lidas, lidas com a capa apagada e o título em peso normal, no lugar de esmaecer a linha inteira.

### 15/11/2026 — Retrato do personagem em todo o app (#216)

- [x] **Barra superior, `/membros` e perfil público** mostram o retrato do personagem no lugar da inicial. O servidor passou a devolver `avatar` e `estagio` em `/api/membros/ranking` e `/api/membros/{handle}`; o retrato acompanha o estágio de cada membro.
- [x] Quem não salvou avatar aparece com o retrato no fundo padrão; a foto da conta continua tendo prioridade quando existe.

### 15/11/2026 — Avatar vira o retrato do personagem

- [x] **O avatar passa a ser o rosto do personagem do jogador**, recortado da ilustração do estágio atual (`retrato` em `ARTES`, 256 × 256), sobre o fundo e no formato escolhidos. O rosto montado por peças em SVG saiu: não chegava perto do traço das ilustrações. Em Configurações ficam só o tema do fundo e o formato.
- [x] O formato salvo (`avatar_custom`) e a RPC são os mesmos; de um avatar antigo valem `fundo` e `base`, o resto é ignorado. Personagem novo no catálogo só precisa do arquivo de retrato.

### 15/11/2026 — Avatar montável redesenhado

- [x] **Busto em estilo anime** no lugar do rosto geométrico (`AvatarMontavel`): olhos com íris, pupila e brilho, franja com reflexo, pescoço, ombros e gola na cor dos olhos, acessórios redesenhados. As opções e o formato salvo são os mesmos: avatar criado antes continua válido e só muda de traço.
- [x] Paleta de pele com tons naturais (saem os dois amarelos); o padrão passa a ser um tom claro.

### 15/11/2026 — Meu Gosto como dashboard e redesenho da Início, Descobrir e Admin (#215)

- [x] **Meu Gosto redesenhado** (`components/gosto/`): cabeçalho com o veredito, seis indicadores, ritmo semanal em gráfico de área, rosca de status com o total no centro, afinidade com a nota média de cada categoria, períodos do dia em blocos. Notas agrupadas por faixa (a coluna 8 cobre de 8,0 a 8,9) e anos em colunas que sempre cabem na largura: sem corte nem rolagem lateral no celular. O quadrante vira quatro listas abaixo de 640 px.
- [x] **Início:** palco dos destaques (`PalcoDestaques`, com arte, sinopse, tags e fila das próximas), painel "Gosto pouco explorado" no lugar de "O buraco no seu gosto" (`GostoPoucoExplorado`), "Sua semana" em grade e conteúdo na largura da tela, sem a coluna lateral.
- [x] **Descobrir** preenchido antes da busca (`VitrineDescobrir`): atalhos, gêneros, escolhas da curadoria, demografias e temas.
- [x] **Painel Admin com menu lateral** a partir de 1280 px; abaixo disso, as abas de antes. Botões dos cartões do Olheiro um por linha.
- [x] Páginas principais e barra superior com o mesmo limite de largura (1760 px). Selo de status inteiro na lista de animes dos gráficos.

### 15/11/2026 — Foco de teclado e nome nos campos que faltavam

- [x] **Um anel de foco só**, na cor do tema, em link, botão e aba (`:where(...):focus-visible` em `index.css`); a barra inferior do celular voltou a mostrar foco.
- [x] `aria-label` nos 14 campos fora do Admin que ainda não tinham nome (buscas, nota, transferência de AniCoins, sala de estreia).

### 15/11/2026 — Fontes servidas pelo site e menos pedidos repetidos (#214)

- [x] **Fontes no próprio site** (`client/src/fontes.css`, pacotes `@fontsource`): sai o `@import` do Google Fonts, e com ele o pedido a terceiros e um salto na descoberta das fontes. Só latin e latin-ext, com `unicode-range`. A JetBrains Mono ganhou o peso 700, que era simulado pelo navegador.
- [x] **Início de 23 para 21 chamadas** (eram 26 antes do #209): missões e destaques da curadoria passam por `buscarUmaVez`. Sobram quatro buscas, que são diferentes entre si.
- [x] **Aviso de mudança esvazia as respostas guardadas** (`EVENTOS_DE_MUDANCA` em `lib/buscaCompartilhada.ts`), para uma tela aberta logo depois de marcar um episódio não mostrar o número de antes. O contador de missões do painel passou a acompanhar o resgate feito no cartão.
- [x] CI no Node 22, a mesma versão maior do Dockerfile.

### 15/11/2026 — Piso de 12 px no texto em todas as telas

- [x] **574 tamanhos de texto entre 7 e 11,5 px viraram `text-xs` (12 px)** em 78 arquivos. Medido antes e depois nas 22 telas do roteiro de captura, em 360, 768 e 1440 px: de até 155 textos pequenos por tela (Deck) para zero, sem overflow horizontal e sem erro de console. O que sobra abaixo de 12 é texto dentro de SVG, que escala com o desenho.
- [x] Ajustes onde o texto maior não cabia: barra inferior do celular ("Gosto" no lugar de "Meu Gosto", que quebrava em duas linhas), coluna da nota no `RankingCard`, atalhos do painel do Início em uma linha, botão "Sugerir correção" só com ícone no celular (as abas do Detalhes estavam coladas) e contador do sino.
- [x] Textos que ainda diziam "Cristais" passaram a dizer "AniCoins" (Admin, sugestão de correção e uma mensagem de validação do servidor).

### 15/11/2026 — Landing mostra a Guilda (#213)

- [x] **Seção "A Guilda do AniDeck"** na página de entrada (`components/landing/VitrineGuilda.tsx`): arte do personagem, insígnia do rank, orbes de Vitalidade e Mana, AniCoins, streak e barra de XP, com os mesmos componentes do painel do jogador e valores de exemplo, em três momentos da jornada. Troca sozinha a cada 5 s até a pessoa escolher; parada com movimento reduzido.
- [x] Seção carregada à parte (6 kB), para o arquivo principal não crescer. `OrbeVital` e `OrbeMoeda` aceitam uso como figura, sem link.
- [x] Saiu o "28 mil+ títulos", número escrito à mão e sem fonte. Textos da página no piso de 12 px.

### 15/11/2026 — Identidade nova na Guilda, no ranking de membros e no perfil público

- [x] **Insígnia do rank** (`InsigniaRank`) no cartão principal e na escada de classes da Guilda, na lista de `/membros` e na pílula do perfil público, no lugar do anel e dos selos de letra.
- [x] **Vitalidade e Mana com as cores fixas** (coral e `mana`) no painel da cápsula, na Guilda e nas Configurações: `BarrasVitais` passou a usar `BarraVital`. Barra de XP da Guilda em dourado; streak com o `SeloStreak`.
- [x] **Entrada animada dos modais:** as classes `animate-in`, `fade-in`, `zoom-in-95`, `slide-in-from-top-2` e `animate-fade-in` estavam nos componentes sem CSS por trás; agora existem em `index.css` (200 ms, só `opacity` e `transform`, desligadas com movimento reduzido). `py-0.2`, que não gera regra, virou `py-px`.
- [x] Cartão da liga em `/membros` só aparece com resposta no formato esperado (antes, uma resposta sem a divisão derrubava a tela).

### 15/11/2026 — Campo numérico, confirmações do app e rótulos nos formulários (#212)

- [x] **`CampoNumerico`** no lugar de 23 campos `type="number"` (Admin e criação de clã): apagar o conteúdo não vira mais `0` no meio da digitação. Ver PITFALLS, item 32.
- [x] **`DialogoConfirmacao` e `useConfirmacao`** no lugar dos `confirm` do navegador (clã e Moderação), e formulário de renomear clã no lugar dos dois `prompt`, com os mesmos limites do banco.
- [x] **Rótulos ligados aos campos:** 43 `<label>` com `htmlFor`, e `aria-label` nos campos do Admin que não tinham nome. `Sheet` fechado fica `inert` (fora do Tab e do leitor de tela).
- [x] **`LimiteDeErro`** também em volta de cada aba do Admin e das rotas sem Navbar (login, admin, retrospectiva).

### 15/11/2026 — Prazos no servidor e limites nas rotas públicas (#211)

- [x] **Servidor HTTP com prazos** de leitura, escrita e ociosidade, e **encerramento gracioso** no SIGTERM do deploy. Prazo de resposta de 100 s no transporte padrão, que é por onde passam as chamadas ao Supabase.
- [x] **`/api/anime/bulk`** com teto de 1000 ids, corpo de 64 KiB e 60 chamadas por minuto por IP; **`/api/beta/request-invite`** com corpo de 4 KiB e 5 pedidos a cada 10 minutos por IP (`middleware.LimitarCorpo` e `middleware.LimitadorPorIP`).

### 15/11/2026 — Limite de erro nas páginas (#210)

- [x] **`LimiteDeErro` em volta do miolo do `Layout`:** página que falha ao desenhar mostra um aviso com "Recarregar a página" e "Voltar ao início", em vez de deixar o app em branco. O erro é esquecido ao trocar de rota.

### 15/11/2026 — Início aparece antes e pede menos ao servidor (#209)

- [x] **Primeira pintura sem esperar as recomendações:** as capas do deck são pedidas junto com as outras buscas, e recomendações e lacuna entram depois, em paralelo.
- [x] **Resposta recente reaproveitada na montagem** (`buscarUmaVez` com validade de 10 s): Navbar e Início deixam de pedir duas vezes o resumo da Guilda, o estado da comunidade e a carteira. Com API simulada, a abertura caiu de 26 para 23 chamadas.
- [x] **Painel do jogador mais enxuto no celular:** streak em pílula de uma linha e atalhos menores, três em linha.

### 15/11/2026 — Meu Gosto legível: legenda fiel, anos alcançáveis e piso de 12 px (#208)

- [x] **Status com cor fixa em todos os temas** (tokens `status-*`): a fatia do donut e a legenda passam a usar a mesma cor.
- [x] **Gráfico por ano** com rolagem que alcança o primeiro ano e abre nos mais recentes; **quadrante** com largura mínima e máxima; textos da tela com piso de 12 px.

### 17/11/2026 — Menu único com submenus (#249)

- [x] **Uma fonte só para o menu** (`lib/navegacao.ts`): o menu lateral, o menu do avatar e o Sheet do celular leem os mesmos itens, com os mesmos ícones coloridos. Novo grupo **Comunidade**, com Rankings e **Meu Perfil** (perfil público; sem perfil aberto, leva a Configurações para criar).
- [x] **Submenus no menu lateral aberto**, que abrem no lugar com animação só de CSS; o da página atual já vem aberto: Guilda (Missões, Especialidade, Extrato de XP, Insígnias, Chefão), Meu Personagem (Atributos, Habilidades, Expedições, Invocação), Rankings (Membros) e Meu Perfil (Wrapped, Configurações). No celular, os atalhos aparecem como pílulas no Sheet.
- [x] **Menu do avatar sem repetição:** com o menu lateral visível (1280 px para cima), só a conta (perfil, Wrapped, Configurações, tema e sair); abaixo disso, a lista completa.
- [x] **Páginas baixadas antes do clique:** passar o mouse ou focar um item baixa o código da página (`lib/rotasPreguicosas.ts`, os mesmos carregadores do `lazy()`), e o clique não mostra o carregamento. Links com âncora (`/guilda#extrato`) rolam até a seção quando ela aparece.

### 15/11/2026 — Menu lateral no desktop (#207)

- [x] **`MenuLateral` para quem está logado, de 1280 px para cima:** trilho de ícones até 1536 px e, daí em diante, aberto com rótulos e botão de recolher (preferência guardada no navegador). Grupos Jornada, Guilda e Gestão, e cartão do jogador no rodapé.
- [x] **Navbar de 1280 px para cima:** saem a marca e os links, entra o campo de busca. Abaixo disso e para visitante, nada muda.

### 15/11/2026 — Palco do herói e orbes na Início (#206)

- [x] **Palco do herói:** a arte do estágio atual do personagem, com aura e partículas; no desktop, coluna própria do rank com a insígnia grande, o título e o próximo rank. Sem personagem despertado, o palco mostra a insígnia e o convite para despertar.
- [x] **Orbes de Vitalidade e Mana** (`OrbeVital`) e moeda de AniCoins (`OrbeMoeda`), no lugar dos cartões com barra.

### 15/11/2026 — Insígnias de rank, flâmula e selo de streak (#205)

- [x] **Oito insígnias, de F a SS** (`InsigniaRank`), a partir do desenho trazido pelo dono: escudo, aletas, pontas de prata, asas, estrela, louros, coroa e halo prismático. Versão compacta abaixo de 48 px; animação só de 96 px para cima.
- [x] **Flâmula do rank** (`FlamulaRank`) e **selo de streak** com a semana em sete losangos (`SeloStreak`), na cápsula da Navbar e no painel do jogador da Início.

### 14/11/2026 — Barra superior e HUD do jogador redesenhados (#204)

- [x] **Cápsula de status na Navbar:** rank, nível e XP sempre; Vitalidade e Mana em número a partir de 1024 px e AniCoins a partir de 1280 px. O streak foi para o painel da cápsula.
- [x] **Painel do jogador na Início:** emblema do rank, progresso do nível e três recursos (Vitalidade, Mana, AniCoins), sem valor fictício durante a carga. A "ficha na Guilda" da coluna lateral saiu, por repetir os mesmos números.
- [x] **Fundação:** token `mana`, componente `BarraVital`, piso de 12 px no texto do HUD e ids únicos no ícone do AniCoin.

### 14/11/2026 — Avatar montável volta a salvar e carregar (#203)

- [x] **`sql/067`:** `salvar_avatar_customizado` filtra por `user_id`; o `065` usava `id`, coluna que `profiles` não tem. Quem ainda não tem perfil público recebe aviso para criá-lo, em vez de um sucesso que não gravou nada.
- [x] **Leitura por `user_id`** em Configurações, com teste da interpretação da resposta da função.

### 14/11/2026 — Barra superior sem corte do sino e do menu de perfil (#202)

- [x] **Navbar cabe de 320 a 1440 px:** logado, de 768 a 1279 px ficam Início, Descobrir, Meu Deck e Agenda; Rankings, Clãs, Loja e Meu Gosto seguem no menu de perfil. De 768 a 1023 px somem o nome ao lado do avatar e o selo de streak; abaixo de 380 px, o texto da marca. Solução provisória até o redesenho da barra.

### 14/11/2026 — Aviso de erro sem laço de requisições (#201)

- [x] **`showToast` com identidade estável:** `useCallback` na função e `useMemo` no valor do `ToastProvider`. Um aviso exibido deixa de recarregar as telas que dependem dele, e erro de carga no Painel Admin não repete mais a chamada (item 31 do `PITFALLS.md`).
- [x] **Primeiro teste de componente do front:** `ToastContext.test.tsx`, com `jsdom` e Testing Library.

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