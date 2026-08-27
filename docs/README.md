# 🎴 AniDeck

Catálogo pessoal de anime com progresso por episódio, curadoria própria de catálogo e um
dashboard de estatísticas calculado no banco. Construído sobre a base global da **AniList API**
(GraphQL), mas com taxonomia, dados e identidade visual próprios — a fonte externa alimenta o
catálogo, não define a experiência.

**🔗 Acesso:** https://anideck.onrender.com
> Hospedado em free tier: o primeiro acesso depois de um período ocioso pode levar até ~1 minuto
> enquanto o serviço acorda. Os acessos seguintes são imediatos.

**Status:** em produção e em uso real. Escopo da v1 fechado — ver [`docs/ROADMAP.md`](./docs/ROADMAP.md).

---

## O que ele faz

**Catálogo e acompanhamento**
- Busca instantânea no catálogo, com debounce e filtros por gênero e por plataforma de streaming.
  Funciona **sem login** — só salvar exige conta.
- Lista pessoal com status (assistindo / em dia / completo / quero assistir / dropado), nota e
  anotação. Nada é importado nem gerado por algoritmo: cada entrada é decisão do usuário.
- **Progresso por episódio**, não por contador: cada episódio marcado é uma linha própria, com
  grade paginada virtualmente (blocos de 24) para aguentar obras de centenas de episódios.
- Badge de episódio novo e atalho direto para a plataforma de streaming da obra.
- **Calendário pessoal** dos próximos episódios da sua lista, com contagem regressiva viva.
- **Notificação push** de episódio novo (Web Push / VAPID), disparada por checagem diária.
- Instalável como **PWA** — ícone na gaveta de apps e abertura em tela cheia.

**Dashboard de estatísticas**
- Tempo assistido, afinidade de gêneros, distribuição de notas e de ano de lançamento.
- Sequência de dias assistindo (streak), padrão de horário por sessão, recordes pessoais.
- Gráfico de quadrantes cruzando **volume × satisfação** — o caso interessante é o gênero muito
  assistido *com* nota baixa, que dois cards separados não mostrariam.
- Drill-down: clicar em qualquer categoria ou barra abre a lista de animes por trás do número.
- Perfil de gosto (especialista × explorador), taxa de conclusão e alerta de anime esquecido.

**Curadoria e automação**
- Painel Admin para editar o catálogo: capa e banner com compressão WebP, personagens, tags
  reordenáveis, sinopse, título, formato e status.
- **Agente Curador (LLM):** reescreve sinopses no tom de voz do produto. As regras do prompt
  ficam no banco e são lidas por um cache em memória — dá pra ajustar o comportamento da IA sem
  novo deploy — com fallback automático de modelo.
- **Taxonomia própria em três camadas** (demografia / gênero narrativo / tag temática), em tabela
  e não em código. A AniList trata "Isekai" como tag secundária; aqui é categoria de primeira
  classe, porque é assim que a conversa real sobre anime funciona.
- **Ranking ponderado** por média bayesiana, para que nota alta com poucos votos não passe na
  frente de obra consolidada.

**Em andamento**
- Agente Olheiro (sugestão automática de curadoria, com aprovação manual) e indicador de
  movimentação de posições no ranking.
- Fase 6.9 — independência da fonte externa: precedência campo a campo entre curadoria, cache e
  API, e estado degradado em vez de erro quando a AniList cai.

---

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Backend | Go + Chi |
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Banco de dados | PostgreSQL (Supabase) com Row Level Security |
| Autenticação | Supabase Auth (JWT) |
| Fonte de dados externa | [AniList API](https://anilist.co/graphiql) — GraphQL, oficial, somente leitura |
| Push | `webpush-go` + VAPID |
| Deploy | Monolito: o backend Go serve o bundle do React |

---

## 🏗️ Decisões de engenharia

O que mais define este projeto não é a lista de features — é o registro do raciocínio por trás
delas. A documentação em `docs/` é parte da entrega:

- **[`DECISIONS.md`](./docs/DECISIONS.md)** — cada decisão estrutural com a alternativa que foi
  descartada e por quê. Decisão revogada não é apagada: fica riscada, com o motivo da revogação.
- **[`PITFALLS.md`](./docs/PITFALLS.md)** — os modos de falha **silenciosa** que este projeto já
  sofreu de verdade (o bug que não quebra, só devolve dado errado), cada um com o sintoma real
  observado e a pergunta que precisa ser respondida antes de mexer naquela área.
- **[`ROADMAP.md`](./docs/ROADMAP.md)** — planejamento por fases, incluindo o que foi avaliado e
  **descartado**, com justificativa, para não ser reaberto sem contexto meses depois.
- **[`AGENTS.md`](./docs/AGENTS.md)** — o fluxo de trabalho do repositório: toda alteração nasce
  de uma issue, passa por `staging` antes de produção e é validada em homologação.

Três exemplos do tipo de problema que está documentado ali:

**Uma view no Postgres não herda a RLS da tabela base.** Descoberto em teste: o endpoint de
estatísticas devolvia dados de dois usuários no mesmo array. Views rodam no contexto de quem as
criou, não de quem consulta — toda view que expõe dado de usuário precisa de
`WHERE user_id = auth.uid()` explícito.

**`watched_at` grava quando o episódio foi marcado, não quando foi assistido.** Quem cadastrava o
backlog inteiro numa sentada às 23h era classificado como espectador noturno. A correção não foi
esconder o gráfico: marcações a menos de 2h de distância passaram a contar como uma sessão só, o
que resolve o problema na raiz e não só no primeiro uso.

**Precedência não é soma.** Um `COALESCE` protegia a ordem das fontes de dados, mas um `||` logo
depois concatenava o cache incondicionalmente — um anime curado com 3 tags exibia 5 rótulos em
inglês. O operador foi para dentro do `COALESCE`; o caso virou item permanente no `PITFALLS.md`.

**Segurança e qualidade**
- Isolamento de dados por Row Level Security nativo do Postgres: toda requisição usa a chave pública anexada ao JWT do usuário, e o user_id nunca vem do corpo da requisição. Um client de service role existe apenas para trabalho de background sem usuário logado, com a justificativa documentada no código.
  vem sempre do JWT validado, nunca do corpo da requisição.
- Sanitização de todo texto livre do usuário (`bluemonday`) contra XSS.
- **CI no push para `staging`:** `golangci-lint` e `go test ./...` via GitHub Actions.
- Testes unitários nos handlers de lógica (ranking, streak, busca, metadados, entradas).
- **DDL versionado** em [`sql/`](./sql), numerado em ordem de aplicação — as views não vivem só
  no painel do Supabase.

---

## 🎨 Identidade visual

Fusão de estética cyberpunk/sci-fi com anime: fundo quase preto arroxeado, gradiente holográfico
e tipografia de display condensada. A paleta e os padrões de componente são fonte única em
[`docs/DESIGN_TOKENS.md`](./docs/DESIGN_TOKENS.md), extraídos dos protótipos em HTML/CSS nativo
que precederam a implementação em React.

---

## 👤 Autor

**João Victor Mendes**
[GitHub](https://github.com/JoaoMendes1) · [LinkedIn](https://www.linkedin.com/in/jo%C3%A3o-victor-mendes-41521b1b9/)
