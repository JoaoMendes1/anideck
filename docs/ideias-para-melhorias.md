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