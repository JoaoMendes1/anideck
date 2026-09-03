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

## 📍 Status atual (27/08/2026)

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
> de observar como o sistema se comporta com gente que não é o autor. **Não há monetização
> nesta fase.** Número de convidados é o que aparecer — duas ou três pessoas já cumprem o
> objetivo técnico de sair da amostra de um usuário só.

> **Nota (01/09/2026):** os itens de segurança da fase estão fechados. Backup, escrita do
> cache de metadados e exclusão de conta saíram no mesmo dia. O que resta é cadastro,
> política de privacidade e o teste de isolamento.

> **Nota (03/09/2026):** teste de isolamento, troca de senha, login com Google e limite
> de cadastros fechados. O Google expôs que a reautenticação da exclusão de conta era só
> do frontend — corrigido no mesmo dia. Restam dois itens: política de privacidade e
> recuperação de senha.

- [x] **Página de Configurações e Ajuda.** É a única das dez do `PAGES.md` que nunca
      saiu do protótipo (`prototipos/config-ajuda-prototipo.html`). Precisa conter
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
- [ ] **Recuperação de senha ("esqueci minha senha")** — fluxo distinto do acima, para
      quem *não* consegue entrar. Mora no `Auth.tsx`, precisa de `resetPasswordForEmail`,
      rota nova para definir a senha e Redirect URL configurada. **Ressalva:** usa o SMTP
      compartilhado do plano Free, com limite baixo de envios por hora e entrega ruim.
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
- [ ] Política de privacidade curta (LGPD).
- [ ] Canal de reporte de bug (grupo de mensagens já resolve).
- [x] **Rotina própria de backup e restauração validada** — pré-requisito
      inegociável antes do primeiro convite. Backup automático não existe no
      plano Free; a rotina é `pg_dump` (banco + `auth.users`) e `aws s3 sync`
      (bucket `curadoria`), rodada à mão antes de cada arquivo `sql/` e
      semanalmente. **Validada em 01/09/2026** em projeto descartável, com
      conferência de contagem e de permissões. Ver `DECISIONS.md`.
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
- [ ] **Criar anime do zero no Painel Admin.** Toda entrada em `curated_animes` hoje
      nasce de um `mal_id` da AniList — não existe caminho para cadastrar obra que
      ela não tem. **Trava principal:** o `mal_id` é a chave que liga
      `curated_animes`, `anime_metadata_cache`, `media_entries` e `episode_progress`.
      Um anime sem `mal_id` precisa de identidade própria, e isso é decisão de
      schema, não de tela. Duas saídas possíveis: ID próprio para obras locais, ou
      tornar o `mal_id` opcional e usar o `id` de `curated_animes` como chave real.
      A segunda é mais correta e mais cara — mexe em tabelas com dado de usuário.

- [ ] **Agente de inconsistências.** Compara o que já existe no banco em vez de
      buscar fora: data em `curated_animes` contra `anime_metadata_cache`, contagem
      de episódios contra a AniList, numeração de `custom_episodes` fora de sequência.
      Divergência vira sugestão na fila do Olheiro, que já existe. Quase tudo é SQL —
      IA só entraria se você quisesse que ele fosse buscar a versão correta.

- [ ] **Feeds RSS do LiveChart como fonte de calendário.** O LiveChart tem os dados
      de agenda melhor estruturados que a AniList (horário com fuso explícito), mas
      não tem API pública e bloqueia acesso automatizado por `robots.txt`. Oferece
      feeds RSS. Vale investigar se dá para alimentar o Calendário sem IA e sem
      depender de fonte única.

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