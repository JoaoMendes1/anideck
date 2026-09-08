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
│   │   │   ├── CuradoriaEpisodios.tsx
│   │   │   ├── CuradoriaLinks.tsx
│   │   │   ├── CuradoriaPersonagens.tsx
│   │   │   ├── DeckCard.tsx
│   │   │   ├── DeckSkeleton.tsx
│   │   │   ├── DestaqueRailCard.tsx
│   │   │   ├── DestaquesRail.tsx
│   │   │   ├── EditarEntradaModal.tsx
│   │   │   ├── EmBreve.tsx
│   │   │   ├── EpisodeGrid.tsx
│   │   │   ├── FilterChipGroup.tsx
│   │   │   ├── FilterSheet.tsx
│   │   │   ├── ImagemAmpliada.tsx
│   │   │   ├── ImageUploadField.tsx
│   │   │   ├── ItensPerfil.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── MenuPerfil.tsx
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
│   │   │   ├── StatCard.tsx
│   │   │   └── VitrineDestaques.tsx
│   │   ├── contexts
│   │   │   ├── CatalogoStatusContext.tsx
│   │   │   ├── SessaoContext.tsx
│   │   │   └── ToastContext.tsx
│   │   ├── hooks
│   │   │   ├── useContagemAnimada.ts
│   │   │   ├── useOlheiro.ts
│   │   │   ├── useRevealOnScroll.ts
│   │   │   └── useSheetBehavior.ts
│   │   ├── lib
│   │   │   ├── deckHelpers.ts
│   │   │   ├── filters.ts
│   │   │   ├── posicaoDeLista.ts
│   │   │   ├── supabase.ts
│   │   │   └── temas.ts
│   │   ├── pages
│   │   │   ├── Auth.tsx
│   │   │   ├── Busca.tsx
│   │   │   ├── Calendario.tsx
│   │   │   ├── Configuracoes.tsx
│   │   │   ├── Detalhes.tsx
│   │   │   ├── Estatisticas.tsx
│   │   │   ├── Landing.tsx
│   │   │   ├── MeuDeck.tsx
│   │   │   ├── PainelAdmin.tsx
│   │   │   ├── Privacidade.tsx
│   │   │   └── Rankings.tsx
│   │   ├── types
│   │   │   ├── anime.ts
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
│   ├── screenshot
│   │   ├── board-de-desenvolvimento.png
│   │   └── estatisticas-page.png
│   ├── AGENTS.md
│   ├── DECISIONS.md
│   ├── DESIGN_TOKENS.md
│   ├── ESTATISTICAS_BACKLOG.md
│   ├── fluxo-busca.md
│   ├── ideias-para-melhorias.md
│   ├── PAGES.md
│   ├── PITFALLS.md
│   ├── ROADMAP.md
│   ├── VISAO_GAMIFICACAO.md
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
│   │   ├── account_test.go
│   │   ├── account.go
│   │   ├── anime.go
│   │   ├── curation_ai.go
│   │   ├── curation_conversao_test.go
│   │   ├── curation_conversao.go
│   │   ├── curation_test.go
│   │   ├── curation_utils.go
│   │   ├── curation.go
│   │   ├── entries_completo.go
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
│   │   ├── streak.go
│   │   ├── system.go
│   │   ├── validacao_curadoria_test.go
│   │   └── validacao_curadoria.go
│   ├── middleware
│   │   └── auth.go
│   └── models
│       └── curation.go
├── marketing
│   └── posts-instagram.html
├── prototipos
│   ├── anideck_gamificacao_prototipo_v1.tsx
│   ├── anideck_gamificacao_prototipo_v2.tsx
│   └── logo.html
├── sql
│   ├── 001_anime_metadata_cache_tags.sql
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
│   ├── 013_precedencia_rotulos.sql
│   ├── 014_campos_curadoria.sql
│   ├── 015_quero_assistir_nas_stats.sql
│   ├── 016_app_settings_rls.sql
│   ├── 017_security_invoker_views.sql
│   ├── 018_rpcs_cron_sem_execute_publico.sql
│   ├── 019_policies_initplan_e_sobreposicao.sql
│   ├── 020_anime_metadata_cache_rls.sql
│   ├── 021_media_entries_cascade.sql
│   ├── 022_limite_cadastros_beta.sql
│   ├── 023_watched_at_nulo_em_lote.sql
│   ├── README.md
│   └── snapshot_schema.sql
├── go.mod
├── go.sum
└── project-structure.md
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
> **Emenda (25/08/2026):** issue é obrigatória quando a alteração:
> - mexe em **schema, dado de usuário, autenticação ou regra de negócio**;
> - é **correção de bug**, qualquer que seja o tamanho — bug pequeno costuma ter
>   causa interessante, e é ela que some se não for escrita;
> - envolve **escolha estrutural no visual**: trocar biblioteca, alterar design
>   tokens, refazer navegação ou padrão de componente. Não pela quantidade de
>   código, mas porque existe um "por quê" que precisa ficar registrado.
>
> Dispensam issue: texto de interface, ajuste visual dentro dos tokens já
> existentes, documentação e refatoração sem mudança de comportamento. Nesses
> casos, commit direto na `staging` basta.
>
> **Na dúvida, o teste:** daqui a três meses, alguém (inclusive eu) vai perguntar
> "por que foi feito assim?". Se sim, abre issue.
>
> O critério é o rastro: issue existe para registrar investigação, decisão e como
> foi verificado. Onde não há decisão a registrar, ela é burocracia.

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
    leia `docs/PITFALLS.md`. Se a tarefa toca a área de um item, responda a pergunta
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

## docs/DECISIONS.md

```markdown
# 📑 DECISIONS.md — AniDeck

> Escopo: só decisões técnicas estruturais deste projeto.

| Data | Decisão | Por que escolhemos A em vez de B |
|---|---|---|
| 2026-09-07 | **Cache persistido de ranking (`ranking_current_cache`), cálculo híbrido comunitário e agendamento sintético** | Durante instabilidade prolongada da AniList (403/Cloudflare), o servidor Go falhava no boot com 503 ao tentar buscar o Top 500 para popular a memória RAM, e animes curados com datas futuras ficavam sem contagem regressiva viva no Calendário. **Escolha para o Ranking:** separação estrita entre o histórico de tendência e o estado consolidado. A tabela `ranking_snapshots` continua intocada com seu ciclo mensal de 30 dias para alimentar as setas ▲/▼; criamos a tabela `ranking_current_cache` para gravar o estado do Top 500 atual e permitir boot instantâneo em milissegundos sem rede. **Cálculo híbrido:** as notas da comunidade em `media_entries` foram conectadas ao cálculo via view `anime_community_scores` com peso ponderado (`pesoVotoComunitario = 350.0`), permitindo que a avaliação dos usuários do AniDeck impulsione obras no Top Global sem distorcer o catálogo inicial. **Escolha para o Calendário e Tracking:** o Go sintetiza `NextAiringEpisode` a partir de `custom_episodes` quando houver datas futuras, permitindo que obras curadas tenham contagem regressiva viva e travem a grade (`EpisodeGrid`) sem depender de resposta da AniList. O campo de data passou a `datetime-local` com herança de horário, eliminando o deslocamento de fuso (UTC−3) que jogava estreias para as 21:00 da véspera. **Alternativas descartadas:** (a) integrar MAL/IMDb agora — complexidade desnecessária de OAuth/scraping frágil; (b) ranking 100% comunitário sem âncora externa — sofreria de cold-start bizarro com catálogo de 3 usuários; (c) deixar o ranking vazio até a AniList voltar — transmitiria tela quebrada para os convidados do beta. **Cold-start do cache resolvido por seed inicial** derivado de `anime_metadata_cache` e `curated_animes`; quando a AniList responder 200, o upsert periódico no banco sobrescreve os dados de forma atômica e transparente. |
| 2026-09-04 | **Canal de reporte de bug também fica congelado** | A ideia era um formulário na aba Ajuda com o backend enviando por SMTP, para não depender do `mailto:` — que não abre nada quando o aparelho não tem app de e-mail configurado, e o relato some sem ninguém saber. **Por que parou:** o caminho exigia senha de app na conta de suporte, e o Google bloqueou a conta durante a configuração. **Por que não vale insistir agora:** o beta tem 3 testadores em contato direto comigo, então o grupo de mensagens cobre o mesmo papel. Construir um canal formal para três pessoas que já falam comigo todo dia é resolver um problema que não existe. **Gatilho para reabrir:** o mesmo dos outros dois itens congelados — beta passar de ~5 pessoas ou surgir cadastro por link aberto. **O que fica de aprendizado:** o `mailto:` da aba Ajuda continua sendo o canal, com a falha silenciosa conhecida e aceita nesta escala. |
| 2026-09-04 | **SMTP próprio e recuperação de senha ficam congelados enquanto o beta for pequeno** | O SMTP compartilhado do Supabase manda 2 e-mails por hora no projeto inteiro, não por usuário. Isso quebraria um convite em massa: o terceiro a se cadastrar na mesma hora não recebe a confirmação e fica com conta que não confirma, sem erro visível na tela. **Por que congelar mesmo assim:** o beta foi reduzido para 3 convidados, todos em contato direto comigo. Três cadastros espaçados nunca encostam no teto, e senha esquecida se resolve com um reset manual pelo painel — mais barato que construir a feature. **O que foi descartado:** contratar provedor de e-mail transacional, que destravaria o limite para 30/h. Exige domínio próprio, que ainda não existe, e verificação de DNS. Gasto e trabalho cedo demais para três pessoas. **Gatilho para reabrir:** beta passar de ~5 pessoas, ou surgir qualquer cadastro por link aberto sem eu no meio. Aí SMTP próprio vem primeiro, e a recuperação de senha depois — construir o fluxo em cima de um cano de 2 e-mails/h daria uma feature que passa no meu teste e falha no dia do convite. **Detalhe a lembrar quando reabrir:** o painel tem um intervalo mínimo de 60s entre e-mails para a mesma pessoa, então a tela de "esqueci a senha" vai precisar avisar quem clicar duas vezes. |
| 2026-09-03 | **A política de privacidade é rota pública, e a portabilidade é atendida por e-mail** | A política precisava existir antes de mais convites: cadastro aberto significa titular de dados sem declaração nenhuma, e a URL também é campo obrigatório da tela de consentimento do Google Cloud. **Rota pública e não uma seção de Configurações:** aquela tela está dentro de `RotaProtegida`, e quem precisa ler a política é exatamente quem ainda não tem conta. O link em Configurações existe, mas aponta para a mesma rota pública. **Consentimento por texto e não por checkbox:** o cadastro por Google não passa por formulário nenhum, então um checkbox cobriria só metade dos caminhos e daria uma sensação falsa de completude; o aviso fica fixo no `Auth.tsx`, visível nos dois modos, porque o botão do Google cria conta mesmo com a tela em "Entrar". **Portabilidade sem botão:** a LGPD garante o direito, não o mecanismo. Com o beta limitado a 8 contas, atender por e-mail dentro do prazo cumpre a lei; um endpoint de exportação toca as quatro tabelas com dado de usuário e merece issue própria, com teste próprio. **Alternativa descartada:** implementar a exportação junto — dobraria o tamanho da entrega e adiaria a política, que é a parte com relógio correndo. **Conteúdo derivado do `snapshot_schema.sql`,** tabela por tabela, e não de memória: declaração de privacidade escrita por suposição erra por omissão, que é justamente o que a lei pune. **Ressalva registrada no texto:** a exclusão apaga o banco vivo em cascata (`sql/021`), mas as cópias do `backup.sh` (01/09) ainda contêm o dado até serem rotacionadas — prometer apagamento instantâneo e definitivo seria falso. |
| 2026-09-02 | **Cadastro do beta fecha por limite automático, não pelo toggle do Supabase** | O `Allow new users to sign up` é binário e manual: ou o cadastro está aberto para o mundo, ou fechado, e reabrir depende de alguém lembrar. Com o login com Google no ar isso ficou pior — conta Google desconhecida criava usuário em um clique, sem nem preencher formulário, e aconteceu duas vezes durante o desenvolvimento. **Escolha:** `before-user-created` hook como função Postgres, contando `auth.users` contra a chave `beta_signup_limit` de `app_settings`. Mantém o cadastro aberto até encher, fecha sozinho e devolve mensagem própria. **Por que não no frontend:** a tela de cadastro fala direto com o GoTrue, então um contador no React seria contornável com a anon key — mesmo raciocínio do `amr`. **Por que não uma lista de e-mails liberados:** o Supabase não tem isso; liberar alguém específico é o `Send invitation`, que já é o cadastro em si. **Por que não uma fila de solicitação no app:** exigiria tabela, tela pública, tela admin e rota de aprovação — tamanho comparável a um dia inteiro de trabalho, com lançamento em 26/09. Fica para a Fase 8, com dado real de volume para decidir. **Sem `security definer`**, seguindo recomendação da documentação do Supabase: função criada pelo painel assume o papel `postgres` e ganha permissões amplas demais; o caminho recomendado é conceder ao `supabase_auth_admin` explicitamente. **Ausência de configuração libera, não bloqueia:** sem a chave em `app_settings` o hook deixa passar, porque cadastro aberto por engano é recuperável e cadastro travado por engano derruba a entrada de todo mundo em silêncio. **Efeito colateral no OAuth:** o `redirectTo` teve de sair de `/deck` para `/login` — `/deck` está dentro de `RotaProtegida`, e sem sessão o guard redirecionava antes de alguém ler o erro que vinha na URL. **A mensagem mora no banco**, não no frontend: um `UPDATE` muda o texto nos dois caminhos, e-mail e Google, sem deploy. **Validado em 02/09/2026** baixando o limite ao número de contas existentes e tentando cadastro pelos dois caminhos. |
| 2026-09-02 | **Reautenticação para excluir conta é verificada no servidor pela claim `amr`** | A reautenticação por senha do frontend nunca foi uma trava: o `RequireAuth` valida que o JWT é legítimo, não que a pessoa acabou de provar identidade — quem tivesse o token chamava `DELETE /api/account` direto, sem senha. O login com Google não criou o problema, **expôs**: conta sem senha não tinha como passar por um campo de senha, e a tentativa de consertar só na UI teria mantido a trava decorativa. **Escolha do `amr` e não do `iat`:** a claim `amr` lista `{method, timestamp}` por método de autenticação usado, e renovar o token **não** cria entrada nova — o `iat` muda a cada refresh automático, aproximadamente de hora em hora, e aprovaria qualquer sessão viva. O `amr` é o único claim do JWT que responde "quando esta pessoa provou quem é", e vale igual para `password` e `google`, o que faz um só caminho servir aos dois. **Janela de 5 minutos**, valor arbitrário: curto o bastante para sessão esquecida em máquina de terceiro não bastar, longo o bastante para não forçar redirect em quem acabou de entrar. **Ausência de `amr` legível nega o pedido, nunca libera** — o formato RFC-8176 da claim é uma lista de strings sem timestamp, e se o Supabase passar a emitir assim a exclusão trava para todos em vez de abrir para todos. Coberto por teste. **Custo de experiência:** o `signInWithOAuth` recarrega a página inteira e o estado do React se perde, então o retorno precisa de marcador na URL (`?reauth=1`) para reabrir o modal — é a parte mais frágil da mudança. **Validado em 02/09/2026** esperando 6 minutos com o modal aberto: pedido recusado com 401 e conta preservada; e por exclusão real de ponta a ponta em conta Google. |
| 2026-09-01 | **Exclusão de conta usa service role, segundo caminho do projeto** | O `supabase.auth` do frontend não apaga a própria conta: só existe na API admin do Supabase, que exige service role. **Não há alternativa com RLS** — apagar linha de `auth.users` não é operação de tabela, está fora do alcance de policy. Mesma conclusão do `callRPC` do cron (31/08) por caminho diferente: lá não havia JWT, aqui há JWT e ainda assim não há RLS possível. O critério registrado é "onde não existe alternativa com RLS", não "onde não existe usuário logado". **A rota não usa `ServiceRoleClient()`:** aquele cliente fala com o PostgREST (schema `public`); `auth.users` pertence à API de autenticação, outro endpoint. Mesma credencial, chamada HTTP direta. **Travas:** `user_id` lido exclusivamente do contexto do middleware — nunca de body, URL ou query, coberto por teste automático (com o `CASCADE` do `sql/021`, um id vindo de fora apagaria conta e deck de terceiro sem volta, Armadilha 7); conta admin bloqueada com 403, porque seu UUID está na variável do Render, em `app_admins` e na policy do bucket; reautenticação por senha no frontend antes de chamar a rota, para sessão aberta em máquina de terceiro não bastar; confirmação digitando `EXCLUIR`. **Log antes de executar:** com o `CASCADE` não sobra vestígio depois; o log guarda id e horário, e é a única evidência de que a exclusão ocorreu. **Consequência conhecida:** JWT emitido antes da exclusão continua válido até expirar — o Supabase não revoga tokens ao apagar o usuário. Sem risco de acesso (a RLS filtra por `auth.uid()` e não há linhas; escrita falha na FK); o efeito é de experiência, uma sessão aberta em outro dispositivo segue navegando. Fechar isso exigiria chamar o logout global antes de apagar. **Storage:** o bucket `curadoria` não é coberto pela cascata, mas hoje não guarda arquivo de usuário. Se foto de perfil for implementada, a rota precisa apagar o arquivo — o banco não fará isso. **Validado em 01/09** por `curl` (conta apagada, deck em cascata) e pela tela. |
| 2026-09-01 | **A FK de `media_entries` passa a `ON DELETE CASCADE`, padronizando com as outras quatro** | Apagar um usuário com pelo menos uma entrada no deck **falhava** por violação de chave estrangeira: `media_entries` era a única das cinco tabelas ligadas a `auth.users` com `NO ACTION` — não por decisão, mas por ser a tabela mais antiga do projeto, criada com o default do Postgres. Na prática, exclusão de conta era impossível, inclusive pelo painel do Supabase. **Alternativa descartada:** deixar a FK como está e apagar `media_entries` na rota Go antes do usuário. Funcionaria, mas se o primeiro `DELETE` desse certo e o segundo falhasse, sobraria uma conta viva sem deck — dado perdido sem exclusão concluída. Com `CASCADE` o banco resolve numa transação única: ou vai tudo, ou não vai nada. **Escopo confirmado antes de aplicar:** exclusão apaga tudo, sem dado sobrevivente anonimizado — decisão que a política de privacidade da Fase 7 vai declarar. **Consequência aceita:** `DELETE` em `auth.users` passou a ser mais destrutivo do que era; backup executado antes de aplicar. **Validado em 01/09** com `DELETE` real da conta de teste dentro de `BEGIN`/`ROLLBACK`: sem erro e zero linhas remanescentes em `media_entries`. |
| 2026-09-01 | **A escrita em `anime_metadata_cache` passa a exigir `is_admin()`; a leitura continua pública** | As policies de `INSERT` e `UPDATE` eram `WITH CHECK (true)` / `USING (true)` para `authenticated`. A tabela é compartilhada — existe uma ficha por anime para o site inteiro — então qualquer conta logada
| 2026-09-01 | **Backup é rotina própria com restauração validada, não o recurso do Supabase** | O item da Fase 7 dizia "ativar backup automático no Supabase". **Não é executável:** backup automático é do plano Pro para cima, e a própria documentação recomenda que projetos Free exportem os dados regularmente e mantenham cópias off-site. **Decisão:** script isolado (`backup.sh`) rodado à mão, com três artefatos — `pg_dump` de `auth.users` (data-only, obrigatório por causa das FKs), `pg_dump` do schema `public`, e `aws s3 sync` do bucket `curadoria` pela API S3-compatível, que funciona no Free. **O Storage precisa de rotina própria:** o `pg_dump` não cobre arquivo, e as capas curadas em WebP vivem no bucket — o banco guarda só a URL. Backup só do banco devolveria um catálogo de links quebrados. **Ordem: banco primeiro, Storage depois.** Imagem baixada sem referência no banco é lixo inofensivo; referência gravada sem a imagem correspondente é link quebrado. **Alternativas descartadas:** (a) plano Pro, custo recorrente em dólar pelo mesmo motivo que descartou o TWA em 21/08, e que resolveria a captura mas não a validação; (b) automatizar em CI ou no backend, que exigiria credencial de owner num caminho exposto — mesmo motivo que rejeitou DDL no deploy em 21/08. **Validação executada em 01/09/2026** num projeto Supabase descartável: contagens idênticas em `auth.users`, `media_entries`, `episode_progress`, `curated_animes` e views, **e** as três verificações de segurança (16 views com `security_invoker = on`, 0 RPCs executáveis por `anon`, 20 policies) — contagem de linhas atesta volume, não permissão. **Descoberta:** o dump não restaura direto. Exige remover o `CREATE SCHEMA "public";` (todo projeto Supabase já nasce com ele) e os `ALTER DEFAULT PRIVILEGES` (roles do sistema que o usuário não controla). Documentado no `restore.sh`. **Revisar se:** o beta trouxer volume de dado que torne o backup manual inviável, ou se o Storage crescer a ponto de o `sync` completo pesar. |
| 2026-08-31 | **O `callRPC` do cron passa a usar a service key, e as RPCs deixam de ser executáveis por `anon`** | As duas RPCs do checador de episódios eram `SECURITY DEFINER` com `EXECUTE` liberado para `anon` — condição necessária para o `callRPC` funcionar autenticando com a ANON_KEY, que vive no bundle público. O `X-Cron-Secret` protege o endpoint do backend, mas não o caminho direto ao PostgREST: `get_cron_media_entries()` devolvia `user_id` e `mal_id` de **todos** os usuários sem filtro, e `process_cron_notification()` aceitava o `user_id` como parâmetro, escrevendo em conta alheia e devolvendo as credenciais de Web Push daquele usuário. **Decisão:** o `callRPC` passa a usar a `SUPABASE_SERVICE_ROLE_KEY` e as duas funções perdem o `EXECUTE` de `anon` e `authenticated`. **Reabre parcialmente a decisão de 2026-08-07,** que tirou a service key do backend — mas o escopo é outro: lá ela era o cliente de todas as queries; aqui é um único caminho sem usuário logado, onde não existe JWT e portanto não existe alternativa com RLS. **Trade-off aceito:** a service key volta ao ambiente do Render (nunca ao bundle), restrita ao `callRPC`. **Correção de registro:** a entrada de 2026-08-22 afirma que o `sql/011` derrubou as três funções do caminho de cron. Duas continuavam no banco — o arquivo não é o estado do banco (armadilha 12). |
| 2026-08-31 | **`security_invoker = on` nas 16 views: a RLS da tabela volta a valer, e o filtro explícito vira segunda camada** | A regra de 20/08 ("toda view precisa de `WHERE user_id = auth.uid()`") resolvia o sintoma e deixava a causa: view no Postgres roda com os privilégios de quem a criou, e todas foram criadas por `postgres`, superusuário que ignora RLS. A proteção dependia de ninguém esquecer o filtro, para sempre — e já falhou uma vez, no incidente que originou aquela regra. O `sql/017` liga `security_invoker` nas 16, fazendo a view rodar no contexto de quem consulta. **O filtro explícito continua em todas e não deve ser removido:** o objetivo é a mesma dupla camada da decisão de 11/08 (o Go força o `user_id` **e** a policy confere). Fecha também os 16 alertas CRITICAL "Security Definer View" do Advisor. **Alternativa descartada:** revogar o `SELECT` de `anon`/`authenticated` nas views e expor tudo por RPC — protegeria igual, mas jogaria fora as 16 views e a leitura direta que o frontend já usa, reescrevendo a camada de dados inteira por um ganho que uma opção de view resolve. **Consequência aceita:** a view agora exige que `authenticated` tenha `SELECT` **e** policy de leitura em cada tabela-base; faltando qualquer um, ela devolve vazio **sem erro** — o modo de falha silencioso de sempre. Mitigado antes de aplicar com as 15 views ligadas dentro de `BEGIN`/`ROLLBACK` sob `SET LOCAL ROLE authenticated`, confirmando que `curated_animes` e `genre_taxonomy` são legíveis por usuário comum. **Gatilho de revisão:** view nova nasce com `invoker = off`, porque é o default do Postgres — a query de conferência no fim do `sql/017` existe para pegar isso. |
| 2026-08-30 | **Tema é troca de valor de token, não classe condicional — e a paleta é aplicada antes do React montar** | Quatro paletas escuras (Holo, Terminal, Arquivo, Estúdio) selecionáveis pelo usuário. **O que foi escolhido:** cada tema é um bloco `html[data-tema=...]` no `index.css` que redefine os mesmos tokens do `@theme` — nenhum componente sabe que temas existem, nenhuma das 42 aplicações de classe de gradiente espalhadas por 19 `.tsx` mudou. **Alternativas descartadas:** (a) classe de tema por componente, que exigiria tocar nos 19 arquivos e deixaria cada tela livre para esquecer um tema; (b) trocar o gradiente de marca por classes literais por tema, que multiplicaria por quatro cada uma das 42 aplicações — e o Tailwind v4 só emite utilitário cujo nome aparece literal no código, então nenhuma delas poderia ser montada por interpolação. **Estúdio não tem gradiente de marca** porque seus três `holo-*` apontam para o mesmo azul: um degradê de uma cor para ela mesma renderiza como preenchimento sólido, sem nenhum caso especial no código. **Anti-flash:** o tema salvo é aplicado por um `<script>` inline e síncrono no `<head>` do `index.html`, antes do módulo do React. Como módulo, com `defer`, ou dentro do `main.tsx` o navegador já teria pintado um quadro na paleta padrão. O preço é a lista de temas duplicada entre o HTML e o `src/lib/temas.ts`, com aviso cruzado nos dois — inevitável, porque qualquer fonte única seria um import, e import roda tarde demais. **`gold`, `green` e `coral` não mudam com o tema:** são semânticas (nota, "Em Dia", erro) e trocariam de significado junto com a cor. **Consequências aceitas:** navegador sem `color-mix()` (anterior a 2023) congela na Holo os 7 gradientes que usam modificador de opacidade, porque o Lightning CSS emite antes um hex estático de fallback; e tema muda a cor de um gradiente, nunca a forma dele. **Tema claro ficou de fora** — não é outra paleta, é outra relação entre texto e fundo: superfície clara precisa de sombra em vez de borda para separar camadas, e as 3 sombras pretas literais do CSS somem no claro. Faria a tela ficar legível, mas errada. |
| 2026-08-28 | **`app_settings` tem escrita restrita a admin e leitura pública** | As policies originais eram `USING (true)`: qualquer visitante podia reescrever a tabela com a ANON_KEY, que vive no bundle do frontend — inclusive o `ai_curation_prompt`, que é a System Instruction do Gemini. Controlar aquela linha era controlar o que a IA do projeto gera. Descoberto por acidente: um upsert do Kill Switch falhou por não existir policy de INSERT, e a ausência dessa policy era a única coisa protegendo a tabela. A escrita passou a exigir `is_admin()` (sql/009), com `WITH CHECK` além do `USING` — o primeiro decide quais linhas podem ser alteradas, o segundo valida a linha depois da alteração. **A leitura continua aberta de propósito:** o `main.go` lê `anilist_force_offline` no boot para restaurar o Kill Switch, e nesse momento não existe usuário logado. Apertar o SELECT quebraria a restauração em silêncio — o app subiria online achando que está offline. Risco aceito: os valores aqui não são segredo, o que importava era impedir a escrita anônima. |
| 2026-08-27 | **Cadeia de fallback e Kill Switch (Independência da AniList)** | A API da AniList caiu globalmente em 22/08 e expôs o risco de fonte única. Decidimos que falha de terceiro não deve devolver erro 500 nem quebrar a interface. Implementamos a cadeia: Curadoria → Cache → AniList. Se a API falhar (ou se o admin ativar o "Kill Switch" manual para proteger o servidor de timeouts), o sistema cruza metadados em inglês do cache com a curadoria em português na RAM, mantendo as telas de Deck, Busca e Detalhes funcionais no modo degradado. |
| 2026-08-27 | **Termos de Serviço e Semeadura de Catálogo** | Para respeitar a regra de "não fazer hoarding em massa" da AniList, adotamos a estratégia de semeadura "Profundidade antes de Largura". O AniDeck não clona a base inteira deles; nós importamos sob demanda (animes do deck, temporada atual, fila de pedidos) no Painel Admin e salvamos a curadoria. Isso justifica o armazenamento local (pois agregamos valor/edição ao dado original) e protege nosso sistema contra o rate limit apertado (30 req/min). |
| 2026-08-27 | **Curadoria de episódios sobrepõe por número; curadoria de links substitui a lista inteira** | Regras diferentes para campos parecidos, de propósito. Curar 2 de 12 episódios precisa preservar os outros 10, senão curadoria parcial não existe — e a sobreposição é pelo **número** do episódio, nunca pela ordem no array: `episode_progress` referencia esse número, não há chave estrangeira entre os dois, e compactar a lista faria todo o progresso já marcado apontar para o episódio errado, sem erro e sem aviso. Já um link curado significa que o da AniList está quebrado; mantê-lo ao lado do correto devolveria o problema para quem clica. |
| 2026-08-27 | **"Tem dado customizado" e "é destaque" viraram coisas separadas (`is_destaque`)** | Existir em `curated_animes` significava as duas coisas ao mesmo tempo. Enquanto curar era exceção isso passava; quando curar virar o caminho normal — que é a direção da Fase 6.9 — todo anime editado entraria na vitrine sem ninguém pedir. Coluna explícita com `DEFAULT true` preserva o comportamento anterior para o que já estava cadastrado. A vitrine que dá sentido ao campo foi construída junto, no topo do Meu Deck — criar o filtro antes dela seria código sem alvo. O filtro é opcional no endpoint (`?destaques=true`) e não o padrão: o Painel precisa enxergar inclusive o que está oculto, senão não haveria como reexibir um anime depois de escondê-lo. |
| 2026-08-27 | **Data de estreia é um `TIMESTAMPTZ` único, não data + dia da semana + horário JST** | Os outros dois derivam do primeiro, e `TIMESTAMPTZ` converte corretamente para o fuso de quem consulta. Guardar um `TIME` "em JST" repetiria a armadilha de campo sem fuso: o Postgres não sabe a que fuso um `TIME` pertence. O Painel captura no horário local de quem cadastra e converte na gravação — a primeira versão gravava sempre meia-noite UTC e perdia justamente a hora, que era a informação que justificava o campo existir. |
| 2026-08-26 | **A foto do ranking é lida antes de ser gravada** | O `updateGlobalCache` carrega a medição anterior e preenche o `PreviousRank` **antes** de decidir gravar uma nova foto. A ordem inversa parece equivalente e não é: a foto recém-gravada seria comparada com ela mesma, todo anime apareceria estável, e isso justamente no dia da medição — sem erro, sem log, indicador zerado. A gravação também só acontece se a leitura tiver sucesso: sem saber a idade da última foto, gravar criaria medição fora da cadência de 30 dias. **Alternativa descartada:** cron externo para tirar as fotos, como na Fase 6.7. O `updateGlobalCache` já roda a cada 12h com o ranking calculado em memória — a foto grava o que já existe, sem nenhuma chamada extra à AniList, e um cron perderia a janela toda vez que o Render hibernasse. **Consequência aceita:** anime ausente da foto recebe `PreviousRank = 0`, que o `omitempty` remove do JSON; o frontend recebe `undefined` e não exibe indicador. Quem manteve a posição exibe `–`, visualmente distinto de "sem histórico". |
| 2026-08-24 | **Precedência de rótulos é substituição, não soma — e rótulo sem taxonomia é descartado** | A `view_user_genre_affinity` fazia `COALESCE(cur.custom_tags, c.genres, '{}') || COALESCE(c.tags, '{}')`: o `COALESCE` respeitava a precedência sobre `c.genres`, mas o `||` concatenava `c.tags` incondicionalmente, então um anime curado com 3 tags exibia 5+ rótulos em inglês. A alternativa (curadoria substituir só os `genres`) foi descartada porque não é representável no schema: não existe coluna `custom_genres`, então nenhum campo do Admin conseguiria remover um rótulo vindo de `c.tags` — curadoria que não consegue dizer "esse rótulo não" é sugestão, não curadoria. O `||` passou para dentro do `COALESCE`. Segundo defeito no mesmo lugar: `COALESCE(t.tier, 'genero')` promovia todo rótulo não cadastrado a barra competitiva, e foi assim que "Environmental" chegou ao card "Gênero Favorito". O default virou `'ignorado'`, tier que o `sql/008` já havia criado e que as views já filtravam — reaproveitar era melhor que inventar mecanismo novo, e `tag_tematica` seria pior porque rótulo órfão não tem `display_name_pt` e viraria badge cru em inglês. **Consequência aceita:** o descarte é silencioso, então a `view_unmapped_labels` foi criada junto, ordenada por frequência, com a flag `veio_de_curadoria` para separar "falta cadastrar tag da AniList" (cauda longa, normal) de "digitei errado no Admin" (urgente — o anime some da tela). **Descoberta colateral:** o `sql/003` está morto — o `008` redefine a mesma view. Correção de view vai sempre em arquivo novo, nunca editando o antigo. |
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
| 2026-07 | **Nunca armazenar permanentemente dados do catálogo** (sinopse, streaming, etc.) | Os Termos de Uso da AniList (e do antigo Jikan) proíbem explicitamente "hoarding ou coleta em massa de dados". O banco do AniDeck armazena apenas a relação do usuário (status/nota) com o `mal_id`. O catálogo é consumido em tempo real. *(Decisão refinada na Fase 6.9: armazenamos curadoria com valor agregado).* |
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

### Onde pôr uma cor nova

O `client/src/index.css` tem **dois blocos de cor**, e a escolha entre eles não é estética:

| | `@theme` | `:root` |
|---|---|---|
| Gera utilitário Tailwind (`bg-*`, `text-*`, `border-*`, `from-*`) | sim | não |
| Entra nesta paleta oficial | sim | não |
| Um tema consegue sobrescrever | sim | sim |

**Vai no `@theme`** a cor que faz parte da linguagem de design — algo que você diria em voz
alta ao descrever a interface ("o fundo", "o acento", "a cor de perigo") e que vai ser
aplicada por classe em vários componentes.

**Vai no `:root`** a cor decorativa: ponta de gradiente, tom intermediário de ilustração,
valor que existe dentro de um bloco de CSS específico e não é aplicado por classe. Colocá-la
no `@theme` geraria dezenas de utilitários que ninguém usa e inflaria esta paleta com cores
que não são vocabulário do projeto.

Em ambos os casos, **nunca repita o hex fora do bloco onde ele é definido.** Para cor com
opacidade, use `color-mix(in srgb, var(--token) N%, transparent)` — não escreva o `rgba()`
com os canais na mão, senão o valor volta a existir em dois lugares e o tema deixa de
alcançá-lo. Foi essa duplicação que a issue #88 removeu.

Exceção deliberada: preto e branco puros (sombras e brilhos) ficam literais. Tokenizá-los
implicaria que devem mudar junto com o tema, o que é decisão de design, não de arquitetura.

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
| # | Página/Tela | Arquivo | Status | Fase do Roadmap |
|---|---|---|---|---|
| 1 | Landing pública (visitante) | `Landing.tsx` | ✅ Implementada | Fase 3 |
| 2 | Login / Cadastro | `Auth.tsx` | ✅ Implementada | Fase 2 |
| 3 | Meu Deck (dashboard logado) | `MeuDeck.tsx` | ✅ Implementada | Fase 2/3 |
| 4 | Busca / Descobrir catálogo | `Busca.tsx` | ✅ Implementada | Fase 2 |
| 5 | Detalhe do anime | `Detalhes.tsx` | ✅ Implementada | Fase 2 / 6.6 |
| 6 | Calendário de lançamentos | `Calendario.tsx` | ✅ Implementada | Fase 5 |
| 7 | Rankings | `Rankings.tsx` | ✅ Implementada | Fase 2 / 6.5 |
| 8 | Estatísticas | `Estatisticas.tsx` | ✅ Implementada | Fase 4 / 6.8 |
| 9 | Painel Admin (curadoria) | `PainelAdmin.tsx` | ✅ Implementada | Fase 2.5 / 4.5 |
| 10 | Configurações & Ajuda | `Configuracoes.tsx` | ✅ Implementada | Fase 2 |
| 11 | Política de Privacidade | `Privacidade.tsx` | ✅ Implementada | Fase 7 |

**Total: 11 páginas implementadas.**

> Em Configurações, três blocos seguem marcados com `EmBreve` — têm desenho e não têm
> código (foto de perfil, notificações, exportar dados). Login com Google saiu da lista
> em 02/09: o cartão mostra o estado real da conta. A troca de senha, que estava presa
> junto dele sem motivo, foi separada no mesmo dia e funciona. A seção **Aparência**
> também deixou de ser um deles: o seletor de tema funciona.

> A coluna `Arquivo` existe para tornar a verificação barata: conferir este documento é
> abrir `client/src/pages/` e comparar. Sem ela, "✅ Implementada" é afirmação que
> ninguém consegue checar sem ler o repositório inteiro — foi assim que este arquivo
> passou meses dizendo que só três telas existiam.

Protótipo em HTML já implementado, mantido como referência do desenho original:
- `prototipos/config-ajuda-prototipo.html` (Configurações & Ajuda)
```

## docs/PITFALLS.md

````markdown
# ⚠️ PITFALLS.md — AniDeck

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

**Onde mora o risco hoje:** a `genre_taxonomy` é chaveada por `raw_name`, e o seed do `sql/002`
já cadastra os dois idiomas apontando para o mesmo `display_name_pt` — `'Fantasy'` e
`'Fantasia'` ambos resolvem para "Fantasia". **Não assuma que só o inglês existe.**

O que ainda quebra:

- **A cobertura em português é parcial.** Existe `'Harém'`, mas não `'Harém Reverso'`.
- **O campo de tags no Admin é texto livre.** O `curation.go` não valida nada contra a
  taxonomia, então erro de digitação (`'Fantasía'`, `'Aventuras'`) vira rótulo órfão.
- **Desde o `sql/013`, órfão cai em `'ignorado'` e some da tela em silêncio.** A
  `view_unmapped_labels` existe justamente para tornar isso visível.

> **Pergunta obrigatória:** o rótulo desta ponta está cadastrado na `genre_taxonomy`, nos dois
> idiomas? Confira o seed do `sql/002`. Rótulo ausente não aparece em lugar nenhum — consulte a
> `view_unmapped_labels` antes de concluir que "sumiu sem motivo".

---

## 2. 🔒 Uma view no Postgres NÃO herda a RLS da tabela base

**Incidente (20/08/2026):** descoberto no Postman — o endpoint de estatísticas devolvia dados de
**dois usuários diferentes** no mesmo array.

**Causa:** RLS é aplicada nas *tabelas*. Uma view roda no contexto de **quem a criou** (o owner),
não de quem consulta. Confiar na RLS da tabela base é vazamento garantido.

**Regra:** toda view que expõe dado de usuário precisa de `WHERE user_id = auth.uid()`
**explícito**. Sem exceção, inclusive em views novas.

**Atualização (31/08/2026) — a causa foi tratada, mas só nas views que já existiam.** O
`sql/017` ligou `security_invoker = on` nas 16 views do `public`: elas passaram a rodar no
contexto de **quem consulta**, e a RLS da tabela-base voltou a valer sozinha. O filtro explícito
**continua em todas e não deve ser removido** — o objetivo é a mesma dupla camada do item 7.

**Onde mora o risco hoje:**

- **View nova nasce desprotegida.** O default do Postgres continua sendo
  `security_invoker = off`. Criar sempre com `CREATE VIEW ... WITH (security_invoker = on)`
  **e** com o `auth.uid()` explícito.
- **O Table Editor do Supabase omite a cláusula.** Ao exibir a definição de uma view, o painel
  monta um `CREATE VIEW` **sem** o `WITH (security_invoker = on)` — bug conhecido do Dashboard.
  Copiar dali, editar e rodar devolve a view para security definer, sem erro e sem aviso, e a
  RLS cai de novo. Use `pg_get_viewdef('nome'::regclass, true)` e reescreva a cláusula à mão.
  *Isto ainda não aconteceu aqui; está registrado porque o caminho que dispara é o mais natural
  do painel.*
- **Ligar o invoker exige permissão na tabela-base.** Com `security_invoker = on`, a view precisa
  que `authenticated` tenha `SELECT` **e** policy de leitura em cada tabela que ela consulta.
  Faltando qualquer um, a view devolve **vazio, sem erro** — troca um modo de falha silencioso
  por outro.

**Como verificar de verdade:** o estado vivo está no catálogo, não nos arquivos do `sql/`.

```sql
SELECT c.relname AS view,
       COALESCE((SELECT option_value FROM pg_options_to_table(c.reloptions)
                 WHERE option_name = 'security_invoker'), 'off') AS invoker
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v' AND n.nspname = 'public'
ORDER BY invoker, c.relname;
```

E, para provar que o filtro recorta de fato, dá para **fingir ser outro usuário** dentro de uma
transação abortada — read-only, seguro mesmo com produção e homologação no mesmo banco
(item 11):

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"<uuid-de-teste>","role":"authenticated"}';
SELECT count(*) FROM <a_view>;   -- usuário inexistente tem que devolver 0
ROLLBACK;
```

**Efeito colateral no teste:** por causa do filtro, rodar essas views no SQL Editor do
Supabase devolve **zero linhas** — lá você é `postgres` e `auth.uid()` volta `NULL`. Parece que
a query quebrou, mas não quebrou. Teste pelo Postman com o JWT, pela tela, ou com o bloco acima.

> **Pergunta obrigatória:** esta view expõe dado de usuário? Tem `auth.uid()` explícito **e**
> `security_invoker = on`? E as views que ela consulta por dentro, têm?

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

**Segundo sintoma da mesma raiz:** o recorde de "maratona mais rápida" exibia "2 eps em 0min" —
resultado de clicar dois episódios em sequência na grade, não de uma maratona.

**Correções adotadas:** marcações separadas por menos de 2h contam como **uma sessão só**; a
frase de insight só aparece com 10+ dias distintos de atividade; e a maratona exige 3+ episódios
com pelo menos 5 min de intervalo médio.

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

**Incidente (24/08/2026, corrigido no `sql/013`):**
`COALESCE(cur.custom_tags, c.genres, '{}') || COALESCE(c.tags, '{}')` — o `COALESCE` respeitava
a precedência sobre `c.genres`, mas o `||` concatenava `c.tags` incondicionalmente. Sintoma: um
anime curado com 3 tags exibiu 5+ rótulos em inglês, e "Environmental" virou o card "Gênero
Favorito".

**A forma correta:** o `||` vai **dentro** do `COALESCE`, não por fora —
`COALESCE(cur.custom_tags, COALESCE(c.genres,'{}') || COALESCE(c.tags,'{}'))`.

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

Os arquivos em `sql/` são numerados e aplicados **à mão** no painel do Supabase. Não há aplicação
automática no deploy (isso exigiria credencial de owner do banco no pipeline).

**Consequência:** a ordem entre deploy de código e aplicação de SQL é responsabilidade humana e
pode quebrar. Exemplo real: o `DROP COLUMN` do `sql/005` tinha que rodar **depois** do deploy —
a ordem inversa quebraria o insert.

**Agravante:** homologação e produção **compartilham o mesmo projeto Supabase**. Não existe
ambiente onde errar sem custo. Teste em homologação altera dado de produção.

**Segundo agravante:** o repositório não sabe quais arquivos já foram aplicados. Registre a data
de aplicação no `sql/README.md` — sem isso, você não descobre em outra máquina.

**Terceiro agravante (31/08/2026):** o plano Free do Supabase **não tem backup automático** —
é recurso do Pro para cima. Não existe ponto de restauração nenhum hoje. DDL destrutivo aplicado
aqui é definitivo até que a rotina própria de `pg_dump` exista.

> **Pergunta obrigatória:** este SQL precisa rodar antes ou depois do deploy do código? É
> reversível? Se não for, qual é o rollback?

---

## 12. 🔁 Arquivo "idempotente" que deixou de ser

**Incidente (descoberto em 24/08/2026, ainda não corrigido):** o cabeçalho do `sql/006` afirma
que reaplicá-lo é um no-op, porque foi extraído do banco com `pg_get_viewdef`. Deixou de ser
verdade: o `sql/008` redefiniu a `view_user_fastest_binge` com filtros de plausibilidade (3+
episódios, 5 min de intervalo). **Reaplicar o `006` hoje reverteria essa correção** e traria de
volta o recorde falso de "2 eps em 0min", sem erro nenhum.

O mesmo vale para o `sql/003`: redefinido pelo `008`, e de novo pelo `013`.

**Regra:** antes de editar ou reaplicar qualquer arquivo antigo do `sql/`, procure por
`CREATE OR REPLACE VIEW <nome>` em **todos** os arquivos de número maior. O número mais alto é a
definição viva — não o arquivo onde a view nasceu.

**Corolário para correções:** correção de view vai sempre num arquivo **novo**, nunca editando o
antigo. Editar o `003` para corrigir a afinidade teria revertido o tier `'ignorado'` do `008`.

**Agravante desde o `sql/017`:** reaplicar um `CREATE OR REPLACE VIEW` antigo também derruba o
`security_invoker` da view, porque nenhum arquivo anterior ao `017` traz a cláusula. A view volta
a rodar como `postgres` sem que nada acuse (item 2).

> **Pergunta obrigatória:** este objeto é redefinido em algum arquivo `sql/` de número maior?
> Estou editando a definição viva ou uma cópia morta?

---

## 13. 🥧 Gráfico de fatias que não cobre o denominador

**Incidente (26/08/2026, issue #76):** a Distribuição por Status somava ~60% em vez de
100%. Um pedaço escuro do donut ficava sem legenda nenhuma.

**Causa:** o denominador era `total_animes` — a contagem de **todas** as entradas do deck —
mas a `view_user_stats` só devolvia quatro dos cinco status. Os 27 animes em
"Quero Assistir" (40% do deck) não tinham fatia nem linha na legenda. O React estava
correto: ele não desenha um campo que nunca chega.

**O que torna isso silencioso:** cada fatia individualmente estava certa, e a soma errada
só aparece para quem para e soma. Um status novo criado no futuro reproduz o mesmo bug do
mesmo jeito.

**Detalhe de implementação que vai reaparecer:** `CREATE OR REPLACE VIEW` só permite
acrescentar coluna **no fim**. Por isso `quero_assistir` ficou depois de
`tempo_total_minutos`, fora da ordem lógica. Inserir no meio exige `DROP VIEW` + recriar,
o que derruba as permissões e qualquer view que dependa dela.

**Nota de estado:** não existe nenhuma entrada com status `Dropado` no banco. O `0%` na
tela é dado real, não defeito.

> **Pergunta obrigatória:** as categorias que este gráfico desenha cobrem **todas** as que
> o denominador conta? Se eu somar as fatias, dá 100%?

---

## 14. 🧪 Teste que valida o caminho errado depois de mudança no handler

**Incidente (26/08/2026):** `TestHandleCreate_CorpoInvalido` esperava 400 e recebia 401.
O teste montava o contexto só com `UserIDKey`, mas o handler passou a exigir também
`TokenKey` — e cortava em 401 antes de chegar na validação do corpo.

**O que torna isso silencioso:** o teste falha, mas pela razão errada. Lido rápido, parece
bug de autenticação no handler. Na prática o handler estava certo e o teste é que ficou
para trás.

> **Pergunta obrigatória:** quando um handler ganha uma dependência nova do contexto, quais
> testes montam esse contexto à mão e precisam acompanhar?

---

## 15. 🔓 Policy `USING (true)` numa tabela de configuração

**Incidente (28/08/2026):** a `app_settings` tinha policies de SELECT e UPDATE com
`USING (true)`. Qualquer visitante podia reescrever a tabela com a ANON_KEY, que é pública.

**O que torna isso silencioso:** RLS estava **habilitada**. O painel do Supabase mostra a
tabela como protegida, e existem policies — elas só não restringem nada. Uma tabela sem RLS
chama atenção; uma com RLS e policy permissiva parece resolvida.

**Como foi descoberto:** por acidente. Um upsert falhou porque não havia policy de INSERT,
e essa ausência era o único obstáculo real à escrita anônima.

**Corolário (31/08/2026):** contar policies não diz nada — `USING (true)` e
`USING (is_admin())` contam como 1 do mesmo jeito. Auditoria de permissão só vale lendo o
predicado, ou testando com `SET LOCAL ROLE` (item 2).

> **Pergunta obrigatória:** as policies desta tabela restringem alguma coisa, ou só existem?
> Rodar `SET ROLE anon` e tentar escrever responde em 10 segundos.

---

## 16. 0️⃣ Campo numérico ausente vira `0`, não `NULL`

**Incidente (30/08/2026):** o console acusava `Encountered two children with the same key, 0`
centenas de vezes por carregamento na tela de Detalhes.

**Causa:** `custom_characters` é gravado como `{name, image, role}` — sem `id`, porque não existe
id a informar no Painel Admin. O Go desserializa esse JSON em `[]anilist.Character`, cuja struct
tem `ID int`. Campo ausente assume o **zero value**, então todo personagem curado sai da API com
`id: 0`, e o `key={char.id}` da lista virava `0` repetido.

**O que torna isso silencioso:** nada quebra na tela. O React apenas fica livre para reaproveitar
o componente errado ao atualizar a lista — estado de um item aparecendo em outro. E só se
manifesta em animes **curados**: um anime que vem direto da AniList traz ids reais e não
reproduz.

**O zero tem duas origens, e a segunda é pior.** A primeira é a curadoria não
preencher um campo que não existe no Painel Admin. A segunda é a **própria
AniList devolver `null`** — em Frieren, uma relação vem com `idMal: null`, e o
`int` do Go a converte em `0` do mesmo jeito.

Essa segunda causou dano real ao usuário: a tela montava `<Link to="/anime/0">`,
e clicar levava a um `503 "Catálogo indisponível"`. Uma falha de catálogo
aparente, por um link que nunca deveria ter existido.

Ao investigar as chaves, a troca de `key={index}` por `mal_id` nas relações
quase foi aplicada — e teria criado o mesmo bug que estava sendo consertado.

**Relação com o item 5:** lá a distinção é `NULL` × array vazio no Postgres. Aqui é ausência ×
zero value na fronteira Go → JSON. Mesma classe de erro, camada diferente: em ambas, "não tem
valor" vira um valor que parece legítimo.

Corrigido em 30/08/2026 na raiz: `Character.ID` e `RelationEntry.MalID` viraram
`*int` com `omitempty`, então ausente sai do JSON em vez de virar `0`. O
`key={char.id || char.name}` continua como defesa de sobra.

Os outros 16 campos `int` de `internal/anilist/` foram verificados contra a API
no ar e vêm sempre preenchidos — mas isso é observação, não garantia.

> **Pergunta obrigatória:** este campo numérico pode chegar ausente — porque a
> curadoria não o preenche, ou porque a API externa manda `null`? Se puder,
> ele precisa ser ponteiro no Go. `0` não é "sem valor": é um número válido que
> colide com todos os outros ausentes, e vira link para `/anime/0`.

---

## 17. 🎨 Classe do Tailwind montada por interpolação nunca é gerada

**Incidente (30/08/2026):** descoberto de raspão, ao verificar o CSS compilado durante a
tokenização das cores (#88). As classes `card-g1` a `card-g5` estavam definidas como
`@utility` no `index.css`, mas **nenhuma das cinco aparecia no bundle**. Os cards de anime sem
capa mostravam fundo liso desde sempre — o gradiente de fallback nunca existiu na tela.

**Causa:** o Tailwind v4 varre o código-fonte procurando nomes de classe **literais** e só emite
o utilitário para os que encontra. Os cinco pontos de uso montavam o nome por interpolação:

```tsx
gradientClass={`card-g${(index % 5) + 1}`}   
```

**O que torna isso silencioso:** absolutamente nada acusa. O TypeScript compila — é uma string
válida. O ESLint não tem o que dizer. O build passa. A classe até **aparece no DOM**, no
`class` do elemento, exatamente como escrita. O que não existe é a regra CSS correspondente, e
o navegador ignora classe sem regra em silêncio. Inspecionar o elemento mostra a classe lá e
não explica por que nada acontece.

**O agravante:** o projeto **já sabia disso**. O `StatCard.tsx` tem um comentário explicando a
mesma armadilha, escrito quando alguém tentou gerar `border-t-${cor}` e mapeou os valores
explicitamente para contorná-la. Saber num arquivo não impediu de repetir em cinco outros —
`MeuDeck`, `Busca`, `Calendario`, `SheetDeAnimes` e `VitrineDestaques`.

**Como achar:** procurar por caractere de nome de classe colado num `${`. Uma varredura por
`([A-Za-z][A-Za-z0-9-]*)\$\{` sobre o `client/src` encontra todos os casos. Atenção aos falsos
positivos: interpolar a string de classe **inteira** (`` `${base} text-coral` ``, ou o retorno de
uma função como `getCategoryTheme`) é seguro, porque o literal existe em algum arquivo varrido.
O perigo é interpolar o **sufixo**.

Corrigido em 30/08/2026: os cinco nomes passaram a viver escritos por extenso num array em
`deckHelpers`, atrás de `gradienteDoCard(indice)`. É o que o `StatCard` já fazia.

> **Pergunta obrigatória:** este nome de classe existe literal em algum arquivo que o Tailwind
> varre? Se ele é montado com `${...}`, a regra CSS não vai existir — e nada vai te avisar.
> Escreva os nomes por extenso num array e indexe.

## 18 — `supabase_auth_admin` não enxerga o schema `public`

Função Postgres usada como Auth Hook roda com o papel `supabase_auth_admin`, e esse
papel **não tem acesso ao schema `public` por padrão**. Conceder `execute` na função
não basta:

```sql
grant usage on schema public to supabase_auth_admin;
grant execute on function public.minha_funcao to supabase_auth_admin;
revoke execute on function public.minha_funcao from authenticated, anon, public;
```

E se a função lê alguma tabela com RLS, o `supabase_auth_admin` precisa passar por
alguma policy — ele não é dono da tabela e não escapa da RLS. No caso do
`hook_limite_cadastros` funcionou sem policy nova porque `app_settings` tem `SELECT`
para `public` com `USING (true)`, e `public` cobre qualquer papel. Numa tabela com
policy restritiva, o hook falharia em silêncio.

**Por que dói:** hook com erro de permissão não avisa em lugar nenhum óbvio — ele
simplesmente derruba o cadastro de todos os usuários. Por isso a função deve ser
testada por chamada direta no SQL Editor **antes** de ser ativada no painel:

```sql
select public.hook_limite_cadastros('{"user":{"email":"teste@exemplo.com"}}'::jsonb);
```

`{}` significa liberado. Objeto com `error` significa bloqueado. Erro de permissão
aparece aqui, onde não machuca.

**Pergunta obrigatória ao mexer em Auth Hook:** o `supabase_auth_admin` tem `usage`
no schema e passa pelas policies de toda tabela que a função lê?

---

## 🧭 Como manter este arquivo

- Toda vez que um bug **silencioso** chegar a produção (não quebrou, só devolveu dado errado),
  ele vira um item aqui — com o sintoma real observado, não com a descrição teórica.
- Bug que quebra alto e claro **não** entra aqui. Este arquivo é sobre o que passa despercebido.
- A justificativa longa continua no `DECISIONS.md`. Aqui fica só o gatilho e a pergunta.
- **Armadilha corrigida é atualizada, não apagada.** Se o risco mudou de forma — como o item 1,
  onde a cobertura de idioma passou a existir mas ficou parcial — reescreva o "onde mora o risco
  hoje". Armadilha desatualizada é pior que armadilha ausente: manda a próxima pessoa investigar
  um problema que não existe mais.
- Item que deixou de ser risco de vez (código removido, coluna dropada) vira nota histórica, para
  não ser reintroduzido por alguém que não viveu o incidente.
````

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

## 📍 Status atual (07/09/2026)

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
```

## docs/VISAO_GAMIFICACAO.md

```markdown
# 🎮 Visão de Longo Prazo — Gamificação do AniDeck

> **Este documento NÃO é roadmap.** Não tem issue, não tem prazo, não é compromisso. É o
> registro de uma ideia grande enquanto ela está fresca, para existir em algum lugar até o dia
> em que fizer sentido puxar pedaços dela para o `ROADMAP.md` de verdade.
>
> Escrito a partir de conversas em 04/09/2026, durante o beta fechado da Fase 7. Mantenha este
> arquivo fora do fluxo normal de revisão de código.
>
> **Origem:** parte destas ideias já existia dentro do `VISAO_RANKING_CREDIVEL.md`, misturada
> com o sistema de peso de voto. Foram separadas aqui porque são coisas diferentes: lá o XP é
> **meio** (serve para decidir de quem o voto pesa mais), aqui ele é **fim** (a progressão é o
> produto). A distinção não é cosmética — muda o quanto o sistema precisa resistir a fraude.

---

## 🎯 A ideia

Transformar o AniDeck num app com estrutura de guilda de anime de fantasia. Usuário novo entra
no nível 1, com rank **F**, e evolui até **SS** conforme assiste e usa o app. Ao longo do
caminho ganha afinidade com gêneros, insígnias como reconhecimento, e privilégios que se
destravam por marca atingida.

O ranking de animes deixa de ser média cega: nota de quem tem afinidade comprovada com o gênero
pesa mais.

**Objetivo declarado, registrado de propósito:** o valor deste sistema não depende de ele ter
público. Mesmo com poucos usuários, uma economia de progressão bem modelada é aprendizado real
e peça de portfólio. Escala muda o brilho, não a validade. Está escrito aqui para que a
pergunta "vale a pena sem base de usuários?" não seja reaberta daqui a três meses.

---

## 🪙 A mecânica central: duas moedas que não se misturam

Esta é a decisão estruturante do documento. Tudo o mais decorre dela.

| | **Afinidade de gênero** | **Rank / Nível (F → SS)** |
|---|---|---|
| **Vem de** | Acervo inteiro, backlog incluído | Só atividade daqui para frente, no tempo |
| **Responde** | *Quem você é* | *O que você fez* |
| **Fonte de dado** | `media_entries` | `episode_progress` (o `watched_at`) |
| **Importável?** | Sim, de propósito | Não, de propósito |
| **Destrava** | Privilégios **dentro daquele gênero** | Privilégios gerais e classe visível |

### Por que separar resolve o problema do farm

O maior risco identificado: quem já assistiu 300 animes na vida vai marcar todos de uma vez ao
entrar. Um sistema ingênuo lê isso como trapaça e pune quem está apenas cadastrando a própria
história.

Com as moedas separadas, deixa de ser problema:

- **Marcar 300 animes é cadastro, não trapaça.** Dá afinidade instantânea, e é justo.
- **Rank não é farmável em massa**, porque não olha volume: olha ritmo e constância.
- Quem tenta subir rank marcando tudo num dia **não sobe**.

### Maratona de anime antigo conta

Assistir Hunter x Hunter inteiro em 2026 é atividade presente, não acervo importado. Tem que
render rank normalmente. O que não rende é declarar hoje o que foi assistido em 2019.

A fronteira não é a idade do anime — é **quando você assistiu**.

### Afinidade decai devagar

Quem assistiu 80 animes de Romance em 2019 e nada desde então entende do Romance de 2019. Um
decaimento leve mantém o especialista atual acima do aposentado, e dá motivo para voltar.

A taxa fica em aberto: é calibração, e calibração se acerta com uso real.

---

## ⚙️ Como o XP é ganho, gravado e perdido

### O XP é gravado no momento do ganho, com o valor que valeu na hora

Regra central, e a mais importante do documento depois das duas moedas.

Cada ganho de XP vira uma linha que guarda **quanto aquilo valeu naquele momento** — incluindo
multiplicador de evento, se havia um ativo. O total nunca é recalculado a partir da tabela de
pesos vigente.

**Por quê:** desmarcar um episódio devolve o XP. Se a linha não guardar o valor, o sistema
consulta o peso de hoje e devolve o número errado — episódio ganho em semana de XP dobrado
valeu 2 e seria devolvido como 1, deixando XP fantasma na conta.

É a mesma armadilha já resolvida em `custom_episodes`, onde a sobreposição é por número do
episódio e não por posição no array: recalcular a partir do estado atual dessincroniza em
silêncio, sem erro e sem aviso.

**Consequência boa:** mudar peso nunca é retroativo. Ninguém acorda três ranks acima porque um
número mudou no painel.

### Desmarcar devolve exatamente o que foi ganho

Ganhou 2, perde 2. Sai de graça, desde que a linha guarde o valor.

### Teto diário com retorno decrescente, em vez de trava de tempo

A ideia inicial era exigir intervalo mínimo entre marcações — 30 minutos, por exemplo. Foi
descartada por dois motivos:

- **Não impede fraude**, só atrasa: quem quer farmar espera.
- **Pune o comportamento honesto:** muita gente assiste 3 episódios seguidos e marca os 3 no
  fim.

No lugar: os primeiros episódios do dia valem cheio, os seguintes valem cada vez menos, com um
limite diário. Maratona conta, mas não leva ninguém a SS num fim de semana. Marcar em lote não
é punido, e esperar não contorna nada.

### Bônus por assistir cedo

Encaixa em "rank mede ritmo", e o dado já existe: a hora de estreia curada
(`TIMESTAMPTZ` em `curated_animes`) e o `nextAiringEpisode` da AniList.

A ideia original era bônus nas primeiras 2 horas após o lançamento. **Janela curta demais:**
episódio japonês sai de madrugada no Brasil, então premiaria insônia, não acompanhamento — e
seria exatamente o mecanismo de culpa que este documento recusa mais abaixo.

Desenho preferido: valor cheio para quem assiste **antes do próximo episódio sair**, com um
bônus pequeno para quem assiste **no dia**.

### Evento de XP dobrado

Só para anime em lançamento. Anime antigo não entra — é o mesmo raciocínio do bônus acima.

**Com data de início e fim, nunca com liga/desliga manual.** Toggle depende de alguém lembrar de
desligar; janela fecha sozinha. Mesmo raciocínio do `beta_signup_limit`, que fecha a porta do
cadastro sem ninguém lembrar.

---

## 🏅 Rank, classe e insígnias

### Rank F → SS por faixa de nível

O rank não é uma segunda moeda: é a leitura do nível geral em faixas (ex.: nível 1–15 = F, e
assim por diante). Simples, sem cálculo próprio.

É a parte mais forte da ideia porque é instantaneamente legível para quem assiste anime — não
precisa de tutorial. Vive no perfil como selo, e **pode existir antes de tudo o resto**.

### Insígnias como cartas, não como ícones

O AniDeck já tem o Sistema de Cartas Raras, com carta holográfica e os cinco gradientes de
`gradienteDoCard()`. Insígnia colecionável encaixa nessa linguagem sem inventar identidade nova.

Recompensa visual sugerida, toda em CSS: moldura de perfil, borda holográfica, fundo de card.

---

## 🎛️ Painel de configuração da economia

Pesos, faixas e eventos ficam editáveis no Painel Admin, não no código.

**O padrão já existe no projeto, duas vezes:** o `app_settings` guarda o `beta_signup_limit` e a
mensagem de cadastro cheio — o `DECISIONS.md` registra que "a mensagem mora no banco, não no
frontend: um UPDATE muda o texto nos dois caminhos, sem deploy" — e o cache de prompts da IA em
`sync.RWMutex` existe para editar as regras sem mexer no código.

Esta é a terceira aplicação do mesmo padrão, não uma ideia nova.

O que muda em relação às outras duas: aqueles são valores pontuais, onde ninguém se importa com
o que valia antes. Peso de XP decide nível, rank e privilégio — por isso a regra de gravar o
valor no momento do ganho é pré-requisito deste painel, não um detalhe dele.

**Reforço da estratégia:** com os pesos editáveis, dá para começar apertado e afrouxar depois.
Apertar depois é que não dá — economia inflacionada não volta atrás sem quebrar a confiança de
quem já subiu.

---

## 🔓 Privilégios por marca

### 1. Peso maior no voto do ranking

**Risco: baixo.** É o que o `VISAO_RANKING_CREDIVEL.md` descreve, e a média bayesiana da Fase
6.5 já é o alicerce estatístico. Este documento passa a ser a fonte do XP que aquele consome.

### 2. Sugerir curadoria (usuário de topo)

**Risco: baixo, e a infraestrutura já existe.** A tabela `curation_suggestions` e a fila do
Olheiro no Painel Admin, com botões Curar/Dispensar, foram construídas na Fase 4.5.

O usuário de topo **não ganha acesso ao Painel**. Ganha o direito de colocar sugestão na fila
que o admin já revisa. Nenhuma policy nova, nenhuma permissão elevada, supervisão embutida por
desenho.

### 3. Comentar em animes do gênero de afinidade

Comentário aberto a todos seria construir rede social — descartado no `ROADMAP.md` pelo mesmo
motivo que Fórum, Clubes e Mensageria.

Travado por marca de uso **e** restrito ao gênero em que a pessoa tem afinidade, vira outra
coisa: plateia pequena, autor identificável, e quem tem o privilégio tem o que perder.

**O mínimo que precisa existir junto, não depois:**

- Botão de apagar comentário, para o admin e para o próprio autor.
- Sanitização com `bluemonday`, que o projeto já aplica em todo texto livre.
- Uma linha na política de privacidade: comentário é conteúdo de usuário, fica salvo e é
  visível para outras pessoas.
- Privilégio revogável. Se o sistema pode dar, precisa poder tirar.

---

## 👁️ Página "o que os SS estão assistindo"

Vitrine com os animes da temporada que os usuários de rank mais alto estão assistindo, dropando
e favoritando.

Como produto é a ideia mais forte da lista: prova social genuína, e nem MAL nem AniList mostram
isso.

**Duas travas obrigatórias, não opcionais:**

- **Agregado, nunca nominal.** "7 de 10 usuários SS estão assistindo X", sem dizer quem. Hoje
  todo dado de usuário é privado por RLS, e expor lista alheia exige consentimento explícito —
  opt-in no perfil e linha na política de privacidade.
- **Mínimo de gente na faixa para a página existir.** Com 2 usuários SS, "o que os SS estão
  assistindo" é literalmente a lista de uma pessoa. Agregado pequeno não é agregado.

---

## 🧩 A lacuna de curadoria (anime sem grade de episódios)

Nem todo anime tem episódios disponíveis, e isso afeta quem marca episódio para ganhar XP.

**O que o banco realmente tem:** `anime_metadata_cache` guarda `episodes`, que é só a
**contagem** — não a lista. Título e imagem de episódio vêm da AniList ao vivo e não são
gravados. Confirmado no `snapshot_schema.sql`.

Isso resolve mais do que atrapalha: para dar XP basta saber que o anime tem N episódios e que a
pessoa marcou o N. A grade bonita é assunto de tela.

| Situação | Marcar episódio funciona? |
|---|---|
| Curado, com `custom_episodes` | Sim, com grade completa |
| Não curado, `episodes` no cache | Sim — dá para gerar 1..N |
| Não curado, `episodes` nulo ou zero | **Não.** É o buraco real |

**Não dá para varrer o catálogo procurando o terceiro caso.** O cache só contém anime que
alguém já tocou, e desde o `sql/020` a escrita é restrita a `is_admin()` — anime que ninguém
abriu não está lá e nunca estará até alguém abrir.

**Desenho proposto:** o furo se anuncia sozinho. Quando a leitura de um anime não acha contagem,
isso vira sugestão na fila do Olheiro, que já existe com tela e fluxo prontos. É a versão mínima
do *Agente de inconsistências* do Backlog.

**E o usuário não pode travar esperando curadoria.** Duas saídas, ambas necessárias:

- Marcar "Completo" conta, mesmo sem grade — caminho alternativo de XP.
- Campo de progresso manual ("estou no episódio 7").

**Dependência dura:** isso exige que marcar Completo preencha `episode_progress`, o que hoje não
acontece — bug ativo que já distorce as Estatísticas, independente de gamificação.

---

## 🧭 O que roubar do Habitica, e o que não

**Copiar:** o Habitica recompensa o que a pessoa já ia fazer. Você não assiste anime para ganhar
XP — ganha XP porque assiste. Manter esse sentido evita que o sistema fique artificial.

**Não copiar:** a mecânica de culpa. No Habitica, perder o dia causa dano ao personagem. Isso
transforma hobby em obrigação.

**O risco específico do AniDeck:** anime é lazer. Se o app começar a cobrar constância, tem
gente que para de marcar episódio para não ver a barra cair — e aí o app perde o dado que
alimenta o sistema inteiro. O streak que já existe deve seguir sendo elogio, nunca cobrança.

---

## 🔍 Concorrência (busca em 04/09/2026)

**Gamificação em tracker de anime já existe.** O **Anime Stars** (App Store, iOS) tem conquistas
com badges, missões diárias, streaks, níveis de "Otaku Novice" a "Legendary Otaku", pontos por
ação e cartelas de bingo com tropes para desafios de temporada.

**O que nenhum concorrente encontrado faz:** conectar a progressão do usuário ao **ranking dos
animes**. Nos outros apps o nível é enfeite — progressão fechada em si mesma. Aqui ele tem
consequência: afinidade por gênero específico, peso de voto, e privilégio que muda o produto.

**Ajuste de discurso:** não é "não existe em lugar nenhum". É *"gamificação de tracker existe;
gamificação que alimenta o ranking, não"*.

**Lado bom:** o Anime Stars prova que a mecânica engaja em app de anime. Não é aposta cega.

---

## 🛍️ Loja e personagem 3D

Adiado, sem descarte. É a parte mais cara e a de menor retorno no estágio atual: o Habitica tem
equipe de arte, este projeto tem um desenvolvedor.

O caminho barato e melhor no curto prazo é a linguagem de cartas descrita acima, que já é a
identidade do produto. Reabrir quando houver base que justifique pagar um artista.

---

## ⚠️ Riscos e pontos de atenção

**Calibração é o trabalho real, não o código.** Quanto vale cada ação, onde ficam as marcas,
qual a curva de F até SS — nada disso se acerta no papel. Precisa de uso e de ajuste, e cada
ciclo desses leva semanas.

**Isso provavelmente demora mais que o AniDeck atual.** Não por volume de código — o código é
mais simples que a Fase 6.9, é contagem, faixa e regra. O que pesa é que as decisões daqui não
têm resposta certa a ser lida: só o uso responde. Mitigação: as partes solo são pequenas e
independentes, então dá para ter coisa no ar em semanas se fatiar.

**Economia inflacionada não volta atrás.** Rank SS fácil demais não se corrige sem quebrar a
confiança de quem já chegou lá. Começar apertado.

**Isso é um projeto novo, não uma fase.** Vira várias fases numeradas no `ROADMAP.md` quando
houver decisão explícita de fazer, com as partes solo antes das coletivas.

---

## 📊 O que funciona sozinho e o que espera gente

| Funciona com 1 usuário | Espera base crescer |
|---|---|
| Afinidade de gênero | Peso de voto no ranking |
| Nível e rank F → SS | Ranking de usuários / top 1 |
| Insígnias e coleção | Sugestão de curadoria pela comunidade |
| Progresso pessoal visível | Página "o que os SS assistem" |
| Painel de configuração da economia | Comentários (funcionam, mas ficam vazios) |

A coluna da esquerda é o caminho de entrada natural. A da direita não é bloqueio — é ordem.

---

## 🚫 Avaliado e descartado

- **XP reduzido para anime antigo** como solução do farm. Substituído pela separação em duas
  moedas, que resolve o mesmo problema sem punir quem chega com acervo grande. Maratona de
  anime antigo **conta**, porque é atividade presente.
- **Trava de tempo mínimo entre marcações (30 min).** Não impede farm, só atrasa, e pune quem
  assiste vários episódios seguidos. Substituída pelo teto diário com retorno decrescente.
- **Bônus restrito às 2 primeiras horas após o lançamento.** Premia madrugada, não
  acompanhamento. Substituído pela janela até o próximo episódio.
- **Evento de XP dobrado com liga/desliga manual.** Depende de lembrar de desligar. Substituído
  por janela com data de início e fim.
- **Comentário aberto a qualquer usuário.** Mesmo motivo do descarte de Fórum e Clubes no
  `ROADMAP.md`: vira moderação permanente sobre um desenvolvedor só.
- **Acesso do usuário de topo ao Painel Admin.** A fila de sugestões entrega o mesmo valor sem
  conceder permissão elevada.

---

## 🔗 Relação com os outros documentos

- **`VISAO_RANKING_CREDIVEL.md`** — consome o XP definido aqui para calcular o peso do voto. A
  mecânica de progressão saiu de lá e passou a morar neste arquivo.
- **`ROADMAP.md`** — nada aqui é fase. Entra pelo Backlog e só vira fase com decisão explícita.
  A dependência do bug "Completo não preenche `episode_progress`" é issue do app atual, não
  deste documento.
- **`DECISIONS.md`** — quando qualquer pedaço disto sair do papel, a decisão de arquitetura vai
  para lá, não para cá.

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
**Detalhe técnico importante:** Como consumimos a AniList (GraphQL), limitamos as requisições a **~30/minuto** (novo rate limit estrito da API). Para não sermos bloqueados, o frontend aplica um debounce nas teclas digitadas, enquanto exibe *skeletons* na UI. Em caso de falha externa, a busca funde automaticamente a nossa curadoria (em português) com o cache (em inglês) na memória do servidor para entregar resultados sem depender da rede.

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

## docs/screenshot/board-de-desenvolvimento.png

```png
[File content not included]
```

## docs/screenshot/estatisticas-page.png

```png
[File content not included]
```

