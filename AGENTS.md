# AGENTS.md

> Regras para quem trabalha neste repositório, pessoa ou IA. Ferramentas de IA (Claude Code,
> Cursor, Codex CLI etc.) leem este arquivo antes de qualquer tarefa.

## Este repositório

**AniDeck** é um organizador pessoal de animes: lista, progresso por episódio, calendário e
estatísticas, com curadoria própria. Está no ar em beta fechado.

- **Endereço:** `https://anideck.joaomendes.dev.br`
- **Stack:** Go 1.26 com chi e JWT do Supabase Auth, validado por JWKS · PostgreSQL no
  Supabase, por `postgrest-go` (HTTP, não SQL direto), com RLS em todas as tabelas · React 19,
  TypeScript, Vite e Tailwind 4 em `client/`, servido pelo Go · AniList (GraphQL), Gemini e
  Web Push.
- **Documentação em `docs/`.** Na raiz fica só este `AGENTS.md`, que as ferramentas de IA
  procuram ali.
- **Repositório público.** Nada de IP, nome de usuário do servidor, conteúdo de `.env`, regra
  de firewall ou porta aberta para a internet entra aqui, nem em documentação, nem em
  comentário. A porta interna do container (8080) pode aparecer: só existe na rede do compose.
- **A infraestrutura do servidor é mantida no repositório privado `infra`:** compose de
  produção e proxy. DNS, backup, `cron` e variáveis do servidor também ficam fora daqui.
  Quando uma mudança exigir algo no servidor (variável nova, rota no proxy), indique o que
  precisa mudar lá.

## Regras deste projeto

Valem só aqui. Cada uma com o motivo, para não ser quebrada sem saber o custo.

- **Leia o `docs/PITFALLS.md` antes de mexer em SQL, view, JOIN, handler de leitura ou
  schema.** Bug silencioso novo (o que não quebra, só devolve dado errado) vira item novo lá.
- **Antes de levantar uma hipótese, confira a seção "Parece armadilha, mas foi verificado"**
  do `docs/PITFALLS.md`: o que está lá já foi investigado e não se reabre.
- **O snapshot do banco não diz quem consome um objeto** (view, função, coluna). Para saber
  quem usa, o `grep` no código.
- **A AniList é fonte única e já caiu duas vezes.** Toda leitura passa pela cadeia
  curadoria → cache → AniList: se a API cai, o app continua no ar com o que está gravado.
- **O acervo curado é o dado insubstituível do projeto:** a AniList pode ser consultada de
  novo, a curadoria não.
- **O `sql/` não é sistema de migrations: a ordem importa.** Arquivos numerados, aplicados à
  mão; o `sql/README.md` diz como.
- **O service role ignora RLS.** Quem grava com ele confere a autorização antes, com o token
  do usuário.
- **Campo numérico ausente vira `0`, não `NULL`.** Zero é tratado como "ausente" em todo o
  projeto.
- **Classe do Tailwind nunca é montada por interpolação:** o Tailwind só gera a classe cujo
  nome aparece inteiro no código.
- **As variáveis `VITE_*` do `client/.env` são lidas no build,** não na execução. Faltando
  uma, a página sai em branco.
- **Lógica nova vem com teste.** Issue que envolve handler, validação ou cálculo traz teste
  unitário do caminho feliz e dos cenários de erro; `go test ./...` roda antes do push.
- **Labels deste projeto:** `admin` (Painel Admin e curadoria) e `estatisticas` (tela Meu
  Gosto e cálculos de estatística).

## Lições de outros projetos que valem aqui

Cada uma já custou caro em outro repositório.

- **Erro de serviço de terceiro é `503`, nunca `500`.** `500` diz "o meu código quebrou";
  `503`, "um serviço do qual eu dependo está fora". O motivo vai no corpo da resposta.
- **Variável de ambiente obrigatória faltando derruba o boot**, com o nome dela no log. Falha
  tardia, no meio de uma requisição, esconde que a causa era configuração.
- **Identidade vem do token.** O `user_id` sai do JWT validado, nunca do corpo, da URL ou da
  query string.
- **Recurso de outro usuário responde `404`, não `403`.** O `403` confirma que o recurso
  existe.
- **No servidor, nenhum container publica porta com `ports`.** O proxy alcança a aplicação
  pela rede interna (`expose`); porta publicada fica aberta mesmo sem regra no firewall.
- **Fim de linha LF em todos os arquivos**, pelo `.gitattributes`. Script com CRLF quebra no
  container Linux com um erro que não aponta a causa.
- **Texto do usuário nunca vira HTML sem escape.** No React, nada de
  `dangerouslySetInnerHTML` com dado do usuário.
- **Chave de API fica no servidor.** O que vai para o navegador, qualquer visitante lê,
  inclusive as `VITE_*`.

## Fluxo de trabalho obrigatório

1. **Toda alteração com decisão nasce de uma issue**, escrita antes do código, por um dos
   modelos em `.github/ISSUE_TEMPLATE/`: **Funcionalidade** ou **Bug**. A issue é
   obrigatória quando a alteração:
   - mexe em schema, dado de usuário, autenticação ou regra de negócio;
   - corrige bug, de qualquer tamanho: a causa é o que mais ensina, e some se não for escrita;
   - envolve escolha estrutural: biblioteca nova, design tokens, navegação, padrão de
     componente;
   - muda como o projeto sobe ou é publicado: `Dockerfile`, deploy.

   Dispensam issue: texto de interface, ajuste visual dentro dos tokens, documentação,
   configuração do repositório, refatoração sem mudança de comportamento e atualização de
   dependência sem mudança de código (`chore(deps)`). Na dúvida: daqui a três meses, alguém
   vai perguntar "por que foi feito assim?"? Se sim, abre issue.

2. **Toda alteração entra primeiro na branch `staging`** e é promovida para a `main`, que
   publica. O CI (`.github/workflows/ci.yml`) roda `go vet`, `go test ./...` e o build do
   `client/` a cada push na `staging`; só se promove com o CI verde. Não há ambiente de
   homologação (vivia no Render e foi suspenso na migração para a VPS, em 22/09/2026).

3. **Commits:** `tipo(escopo): descrição curta (closes #NN)`. Tipos: `feat`, `fix`,
   `refactor`, `docs`, `chore`. O escopo é a área (`ui`, `auth`, `db`, `perf`...);
   documentação e configuração fora de uma área de código usam `infra`. O `closes #NN` só
   fecha a issue quando o commit chega à `main`.

**Labels:** catálogo do `modelo-projeto`, nome em inglês e descrição em português, mais as
duas deste projeto. Toda issue recebe um tipo e uma ou mais áreas. Os modelos de issue
aplicam `feature` e `bug` pelo nome exato: renomear uma delas faz o modelo deixar de
aplicá-la, sem erro.

| Grupo | Labels |
|---|---|
| Tipo | `feature`, `enhancement`, `bug`, `security`, `refactor`, `documentation`, `chore`, `decision` |
| Área | `backend`, `frontend`, `database`, `auth`, `infra`, `integration`, `ai`, `mobile`, `ui/ux` |
| Só deste projeto | `admin`, `estatisticas` |

**Quadro** (GitHub Projects): a issue fechada vai sozinha para Done. Nunca arraste o cartão
para Done à mão: isso fecha a issue antes de o código chegar à `main`.

```bash
# 1. Staging local atualizada
git checkout staging
git pull origin staging

# 2. Conferir localmente: testes do Go e build do frontend
go test ./... && (cd client && npm run build)

# 3. Preparar e conferir, numa passada só, o que vai entrar no commit
git add -A && git status && git --no-pager diff --cached -M

# 4. Commitar e subir para a staging
git commit -m "tipo(escopo): descrição curta (closes #NN)"
git push origin staging

# 5. Promover (dispara o deploy) e voltar à staging
git checkout main
git pull origin main
git merge staging --no-edit
git push origin main
git checkout staging
```

- `--no-edit` evita que o merge abra o Vim.
- **Revert sempre pelo código do commit** (`git revert a1b2c3d`), nunca por `HEAD`.
- **Action verde não garante código novo** (item 25 do `docs/PITFALLS.md`). Antes de acusar
  o deploy, confira o commit na `main` do GitHub e no `git log --oneline -3` do servidor.
- **Em mais de uma máquina:** push antes de sair de uma, pull antes de começar na outra.

## Regras de código

Prefira a solução simples e defensável à mais abstrata: todo código daqui precisa poder ser
explicado, linha por linha, por quem o mantém.

4. **Comentários explicam o quê e o porquê**, em tom formal e impessoal, numa linha sempre
   que possível, e só onde o porquê não é óbvio. Número de issue não entra no código.

5. **Segurança não é uma fase separada.** Entrada de usuário, autenticação e dado sensível já
   nascem com sanitização e validação.

6. **Verificação de dependências.** Antes de propor pacote, SDK, API ou versão de Action,
   confira se é a versão atual e mantida. Pacote obsoleto ou em fim de vida não entra. Sem
   certeza, pesquise antes de gerar o código.

7. **Suspeita não é achado.** Não aponte problema sem o arquivo na mão. Peça o arquivo, ou o
   `grep` que localiza os pontos de uso, e só então conclua.

8. **Revisão antes do commit** em mudança não trivial (feature nova, autenticação, dado
   sensível): a saída de `git diff --cached` é lida antes do commit.

## Regras de documentação

9. **Um fato, um lugar.** Nada é copiado de um documento para outro; um aponta para o outro.

   | Arquivo | O que mora nele |
   |---|---|
   | `docs/ROADMAP.md` | Escopo: fases, MVP, backlog. A cada entrega, no mesmo push: itens marcados com `[x]` e a issue, e a tabela de status |
   | `docs/DECISIONS.md` | Decisões estruturais, com o porquê e o custo aceito. Não é log de commit |
   | `docs/PITFALLS.md` | Armadilhas que já aconteceram. Corrigida é marcada, nunca apagada |
   | `docs/PAGES.md` | Estado de cada tela |
   | `docs/DESIGN_TOKENS.md` | Cores, tipografia e temas |
   | `sql/` | Schema versionado. Arquivo aplicado nunca é editado |

10. **Fase nova não vai para o fim da fila.** Dívida ou requisito descoberto no caminho vira
    fase intermediária (ex.: 6.5), entre as duas que a originaram.

11. **Armadilha conhecida tem pergunta obrigatória.** Tarefa que toca a área de uma armadilha
    do `docs/PITFALLS.md` responde a pergunta dela, com o arquivo real na mão. A issue lista
    as armadilhas em jogo.

## Este projeto no portfólio

Este projeto aparece no portfólio **JVM Systems** (`joaomendes.dev.br`, repositório
`jvm-systems`), por um arquivo em `src/content/projetos/`. O site não afirma nada que o
código não sustente: entrega que muda o estado, a fase, a stack ou a capa muda também o
estudo de caso.
