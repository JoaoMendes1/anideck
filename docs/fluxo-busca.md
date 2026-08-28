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