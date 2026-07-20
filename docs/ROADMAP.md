# 🗺️ AniDeck — Roadmap

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

- [ ] Inicializar backend Go + Chi (mesma estrutura de pastas dos outros projetos).
- [ ] Criar projeto Supabase (banco + auth), organização já existente ou nova (avaliar limite de
      projetos grátis na hora).
- [ ] Schema inicial: tabela `media_entries` (id, mal_id, **tipo** [`anime`/`manga`], status, nota,
      anotação, created_at, updated_at) — guarda só a relação do usuário com o título, não
      duplica o catálogo inteiro do MAL localmente. Usar `tipo` desde já (mesmo só populando
      `anime` no MVP) evita migração cara se mangá entrar depois — decisão registrada em
      `DECISIONS.md`.
- [ ] Cliente HTTP em Go para consumir a Jikan API, com tratamento de rate limit (limite real:
      ~3 requisições/segundo, 60/minuto — a Jikan já cacheia por 24h do lado dela, mas o nosso
      cliente deve ter throttling e backoff próprios para não estourar o limite).
- [ ] Subir staging esqueleto.

## 🔐 Fase 2: Catálogo Pessoal — fim do MVP

- [ ] Busca de anime (proxy para Jikan API) exibida no frontend. Busca instantânea (estilo
      Netflix/Prime): grade de pôsteres atualizando enquanto digita, com debounce de ~400ms
      (respeitando limite de taxa do Jikan). Funciona **sem login** — só a ação de salvar exige
      conta. Cada card de resultado tem botão de adição rápida direto nele (detalhamento
      completo em `fluxo-busca.md`).
- [ ] Exibir ranking de mais assistidos/populares (`/top/anime`) e reviews de usuários
      (`/anime/{id}/reviews`) na página de cada título.
- [ ] Página de detalhe do anime com: personagens/dubladores (`/characters`), equipe técnica
      (`/staff`), animes relacionados (`/relations`), recomendações anime-a-anime
      (`/recommendations`), temas de abertura/encerramento (`/themes`), onde assistir
      (`/streaming`), galeria de imagens (`/pictures`) e **distribuição de notas da comunidade**
      (`/statistics`, como gráfico — no MAL é tabela crua, aqui vira visualização de verdade;
      pertence a esta página, não ao dashboard pessoal da Fase 4) — tudo identificado a partir
      da análise do MyAnimeList como conteúdo rico mas mal apresentado lá.
- [ ] Salvar/editar/remover entrada na lista pessoal (status, nota, anotação). Status incluem
      um estado extra **"Em Dia"** (assistindo, mas já viu todos os episódios lançados até
      agora) — diferente de "Completo" (usado só quando o anime encerrou de vez). Quando o
      Jikan informar `status: Finished Airing` para um título marcado "Em Dia", sugerir
      automaticamente mudar para "Completo".
- [ ] Filtro por gênero/tag.
- [ ] Filtro por plataforma de streaming disponível — **⚠️ revisar sob risco de ToS** (ver
      `DECISIONS.md`): indexar permanentemente dados de `/anime/{id}/streaming` no próprio banco
      pode violar os Termos de Uso do MyAnimeList, que proíbem usar o Jikan para "popular seu
      próprio banco de dados". Buscar ao vivo por título (sem armazenar) é a alternativa segura,
      mesmo que mais lenta.
- [ ] Autenticação Supabase (mesmo que uso pessoal por enquanto — já deixa pronto para
      multiusuário futuro, conforme decisão registrada em `DECISIONS.md`).
- [ ] Sanitização de qualquer texto livre inserido pelo usuário (anotações) — aprendizado direto
      do Grimoire, nunca renderizar sem escape.

## 🎨 Fase 3: Identidade Visual — fim do MVP

- [ ] Protótipo visual dedicado (fusão cyberpunk/sci-fi + anime).
- [ ] Aplicação da identidade nos componentes React reais.
- [ ] Responsividade e acessibilidade básica.

## 📊 Fase 4: Dashboard de Estatísticas

- [ ] Cálculo de métricas pessoais (tempo assistido, gênero favorito, distribuição por status).
- [ ] Visualização (gráficos) no painel do usuário.

## 🎯 Fase 5: Recomendações Personalizadas

- [ ] Lógica de recomendação com base na lista salva (gêneros/notas mais frequentes) usando
      dados já disponíveis via Jikan (`/recommendations`).

## 📅 Fase 5.5: Calendário de Lançamentos

- [ ] Integrar **AniList API** (GraphQL) especificamente para o campo `nextAiringEpisode` —
      o Jikan não cobre previsão precisa de data/hora do próximo episódio, só dia da semana
      (`/schedules`), insuficiente para um calendário/contador real.
- [ ] Tela de calendário mostrando próximos episódios dos animes marcados "Assistindo"/"Em Dia"
      na lista pessoal, com contagem regressiva.

## 📰 Fase 6: Notícias de Anime

- [ ] Avaliar fonte externa de notícias (RSS de Anime News Network, Crunchyroll News, ou similar)
      — Jikan não cobre isso nativamente.
- [ ] Job de ingestão periódica (padrão parecido com o ping de uptime do JVM Systems).
- [ ] Exibição no frontend.

## 👥 Fase 7: Multiusuário (futuro, avaliar quando chegar)

- [ ] Reavaliar modelo de dados e permissões antes de abrir para outras pessoas.

## 📱 Fase 8: Publicação como App (futuro, avaliar quando chegar)

- [ ] Transformar o frontend num PWA completo (mesmo padrão já usado no Grimoire).
- [ ] Empacotar via TWA (Trusted Web Activity, usando Bubblewrap/PWABuilder) para publicar na
      Play Store — reaproveita quase todo o código React existente, sem reescrever em React
      Native.
- [ ] Revisar com cuidado redobrado o uso do Jikan antes de qualquer publicação pública — risco
      de Termos de Uso é maior com visibilidade de loja de apps do que em projeto pessoal.

---

## 📋 Backlog / Ideias em Avaliação

- [ ] **Publicar nota automaticamente no MAL real** (via API oficial + OAuth) — só se o processo
      manual (avaliar no AniDeck + votar também no MAL de vez em quando) se mostrar cansativo
      na prática. Não muda a decisão atual do Jikan; seria uma integração adicional, opcional,
      de longo prazo.
- [ ] **Suporte a Mangá** — Jikan já tem os endpoints espelhados (`/manga`, `/top/manga`, etc.),
      então a fonte de dados não é problema. Fora do MVP porque não é uso pessoal atual, mas o
      schema (`media_entries` com coluna `tipo`) já foi desenhado pra não exigir migração cara
      quando/se entrar. Afeta Busca, Rankings, Detalhe e Meu Deck — precisariam de toggle
      anime/mangá em cada uma.
- [ ] **Notificações de novas temporadas/sequências** — avisar quando uma sequência/temporada
      nova é anunciada pra um título que já está no Deck do usuário. Reaproveita o dado de `/relations`
      já planejado pra Fase 2. Escopo pequeno, valor real.
- [ ] **Mini-página de Pessoa/Estúdio** — ao clicar num dublador/estúdio na página de Detalhe,
      ver outros trabalhos dele. Refinamento da página de Detalhe, reaproveita `/people` e
      `/characters` já planejados — não é seção nova.

### Avaliado e descartado (documentado pra não reabrir sem contexto)
- **Fórum, Clubes, Blogs:** equivalem a construir uma rede social inteira (threads, moderação,
  denúncia, clubes) — escopo de um segundo produto do tamanho do MAL, não cabe num projeto
  pessoal solo.
- **Mensageria direta (Inbox):** pressupõe comunidade ativa trocando mensagem; multiusuário
  ainda é só "talvez, depois" — mensageria é um passo bem à frente disso.
- **News / Featured Articles / MALxJapan:** conteúdo editorial que o MAL produz com equipe
  própria (parcerias, redação) — não se aplica a um projeto pessoal de curadoria.
- [ ] *(a preencher)*
