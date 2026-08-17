# 🗺️ AniDeck — Roadmap

> ✅ **Aviso de Migração (28/07/2026):** O projeto pivotou inteiramente para a **AniList API (GraphQL)** devido à descontinuação iminente do Jikan. Todo o planejamento abaixo reflete essa nova realidade. Ver `DECISIONS.md`.

Segue os mesmos princípios do `AGENTS.md` (issue antes de código, staging antes de produção,
testes em issues com lógica, segurança desde o início, fases numeradas cronologicamente com
espaço para fases `.5` intermediárias).

## 🎯 Onde está o MVP

**Fases 1, 2 e 3** = MVP publicável: fundação + catálogo pessoal (salvar, status, notas, filtro)
+ identidade visual mínima aplicada. Fases 4, 5 e 6 são incrementos sobre um produto já no ar.

## 🚀 Deploy contínuo
Staging sobe já na Fase 1, como projeto esqueleto — mesmo padrão do JVM Systems.
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
- [x] Criar rotas no backend (`/api/curation`) para gerenciar (CRUD) od destaques.
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

## 🤖 Fase 4.5: Automação e IA Generativa (Integração Google Workspace)

- [x] **Agente Curador (IA no Admin):** Integrar um LLM para reescrever sinopses frias da AniList de forma autônoma, adotando o tom de voz "AniDeck".
- [x] **Engenharia de Prompt Dinâmica e Resiliência:** Criação de cache em memória no Go (`sync.RWMutex`) consultando tabela genérica no Supabase para editar as regras da IA sem mexer no código, suporte a Markdown, e fallback automático (`3.7-flash` -> `3.6-flash`).
- [ ] **Agente Olheiro (Automação Background):** Criar um fluxo orquestrado (ex: n8n) que cruza os favoritos do usuário (SQL) com os *trends* da AniList.
- [ ] **Integração Google Workspace:** O Agente gera recomendações personalizadas em HTML e utiliza a API do Gmail para disparar um relatório automático para a caixa de entrada do usuário.

## 📅 Fase 5: Smart Tracking, Streaming Direto & Calendário (Killer Feature) Finalizado 10/08/2026

- [x] **Backend:** Atualizar a query GraphQL do Go para consumir `nextAiringEpisode` e repassar a janela de tempo ao frontend.
- [x] **Meu Deck:** Criar lógica visual de Badge "NOVO EP" para obras "Assistindo" ou "Em Dia" com episódios recém-lançados.
- [x] **Integração de Streaming:** Adicionar botão/ação rápida nos cards do Deck utilizando o campo `externalLinks` da AniList, permitindo pular direto para a Crunchyroll/Netflix.
- [x] **Calendário Personalizado:** Tela mostrando próximos episódios exclusivos da *watchlist* do usuário, agrupados por dia da semana e com contagem regressiva viva.
OBS: O Product Owner decidiu que a fase 5 fosse implementada primeiro.

## 📰 Fase 6: Notícias de Anime

- [ ] Avaliar fonte externa de notícias (RSS de Anime News Network, Crunchyroll News, ou similar).
- [ ] Job de ingestão periódica.
- [ ] Exibição no frontend.

## ⚖️ Fase 6.5: Ranking Ponderado

> Nasceu da auditoria de UX registrada em `docs/ideias-para-melhorias.md`, item 2.2 (e 2.3).
> Ainda sem decisão de fórmula fechada — depende de confirmar se a AniList expõe contagem de
> votos/favoritos junto com a nota antes de estimar esforço real. Não iniciar antes de fechar
> essa decisão em `DECISIONS.md`.

- [ ] Confirmar se a query GraphQL da AniList retorna contagem de avaliações/favoritos por anime.
- [ ] Definir e documentar em `DECISIONS.md` a fórmula de ponderação escolhida (ex: média
      bayesiana ao estilo IMDb, puxando notas com poucos votos em direção à média geral).
- [ ] Implementar o cálculo (avaliar se fica em Go/handler ou como view/function no Postgres,
      alinhado à Fase 4).
- [ ] Como parte da mesma decisão, avaliar o critério de equilíbrio entre animes clássicos e
      recentes (item 2.3 do documento de ideias).
- [ ] **Bloqueado por esta fase:** indicador de movimentação de posições no ranking (▲/▼) —
      só faz sentido rastrear histórico de posição depois que a fórmula final estiver estável,
      senão todo mundo "sobe ou desce" no dia da troca de fórmula sem ter mudado de posição de
      verdade.

## 🖼️ Fase 6.6: Enriquecimento da Página de Detalhes

> Nasceu do item 5 do `docs/ideias-para-melhorias.md`. Feature fullstack — depende de mapear
> campos novos da AniList (elenco, staff, galeria de imagens) antes de desenhar a tela.

- [ ] Levantar quais campos de personagens/elenco (`characters`, `staff`) e imagens adicionais a
      query GraphQL da AniList expõe.
- [ ] Avaliar impacto no tamanho/latência da resposta da API externa (cache adicional pode ser
      necessário para não pesar a Fase 2, que já consome essa mesma API).
- [ ] Desenhar layout das novas seções (galeria, elenco) alinhado ao `DESIGN_TOKENS.md`.
- [ ] Implementar consumo dos novos campos no backend + exibição no frontend.
- [ ] Resolver especificamente a queixa de imagem pequena no mobile registrada no item 5.1.

## 👥 Fase 7: Multiusuário (futuro, avaliar quando chegar)

- [ ] Reavaliar modelo de dados e permissões antes de abrir para outras pessoas.

## 📱 Fase 8: Publicação como App (futuro, avaliar quando chegar)

- [ ] Transformar o frontend num PWA completo (manifest, service worker, instalável).
- [ ] Empacotar via TWA (Trusted Web Activity, usando Bubblewrap/PWABuilder) para publicar na Play Store.

---

## 📋 Backlog / Ideias em Avaliação

- [ ] **Notificações de novas temporadas/sequências** — avisar quando uma sequência/temporada nova é anunciada.
- [ ] **Filtro por ano na Busca, independente de temporada** — hoje o campo de ano só habilita se
      uma temporada estiver selecionada (ver `docs/ideias-para-melhorias.md`, item 7.1). Aceitável
      como está por ora; revisar se surgir demanda real de usuário.

### Avaliado e descartado (documentado pra não reabrir sem contexto)
- **Fórum, Clubes, Blogs:** equivalem a construir uma rede social inteira.
- **Mensageria direta (Inbox):** pressupõe comunidade ativa.
- **News / Featured Articles / MALxJapan:** conteúdo editorial que o MAL produz com equipe própria.
- **Mini-página de Pessoa/Estúdio** — ao clicar num dublador/estúdio na página de Detalhe, ver outros trabalhos dele.