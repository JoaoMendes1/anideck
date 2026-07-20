# 🔍 Fluxo de Busca — AniDeck

## Resposta direta à pergunta principal
**Sim, a busca funciona sem cadastro.** O catálogo vem do Jikan (dados públicos do MAL), então
navegar, buscar e ver detalhes de qualquer anime é 100% aberto. **Só a ação de salvar na sua
Deck pessoal exige login** — é o único ponto do fluxo que pede conta.

---

## Os 4 estados da tela de busca

### 1. Estado vazio (antes de digitar qualquer coisa)
Ao tocar/clicar no campo de busca, abre uma tela cheia dedicada (igual Netflix/Prime — não é um
dropdown pequeno). Antes de digitar, não fica em branco: mostra sugestões prontas —
- Temporada atual (via Jikan `/seasons/now`)
- Buscas recentes (se estiver logado, vêm da conta; se não, ficam salvas só no navegador local)

### 2. Estado "digitando" (busca instantânea)
Conforme o usuário digita, os resultados vão aparecendo em **grade de pôsteres** (não lista de
texto) — sem precisar apertar Enter ou um botão "Buscar".

**Detalhe técnico importante:** o Jikan tem limite de ~3-4 requisições por segundo. Buscar a
cada tecla digitada estouraria isso rápido. Solução: **debounce de ~400ms** — só dispara a busca
depois que o usuário para de digitar por esse tempo, não a cada letra. Enquanto isso, mostra um
esqueleto de carregamento (skeleton) nos lugares dos cards, pra não parecer travado.

### 3. Estado "sem resultados"
Mensagem simples + sugestão de revisar a grafia, mais uma prateleira de "Em alta agora" como
fallback (nunca deixa a tela vazia sem nada pra fazer).

### 4. Estado "com resultados"
Cada card de resultado já vem com um botão **"+"** direto nele — igual Netflix, você não precisa
abrir a página completa do anime só pra adicionar na lista.

---

## O que acontece ao clicar no "+"

| Situação do usuário | O que acontece |
|---|---|
| **Sem login** | Abre um modal leve: "Crie sua conta pra salvar isso no seu Deck" — só nesse momento pede cadastro, nunca antes (a pessoa já buscou e já viu o anime livremente até aqui). |
| **Logado** | Abre um popover pequeno, sem sair da busca, com os status pra escolher na hora (Assistindo / Em Dia / Completo / Quero Assistir / Dropado) — "quick add", sem precisar abrir a página do anime. |

---

## Por que pedir login só no "+", nunca antes
Isso segue o mesmo princípio que você definiu lá atrás pro apelo de cadastro no geral: nada de
"desespero" por conta criada. A pessoa só é convidada a se cadastrar no momento exato em que ela
já demonstrou intenção real (quis salvar algo) — nunca como barreira de entrada pra só olhar o
catálogo.
