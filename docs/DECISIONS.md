# 📑 DECISIONS.md — AniDeck

> Escopo: só decisões técnicas estruturais deste projeto.

| Data | Decisão | Por que escolhemos A em vez de B |
|---|---|---|
| 2026-07 | **Jikan API** (não oficial) como fonte de dados, não a API oficial do MyAnimeList | A oficial exige OAuth e serve para sincronizar a lista real da conta MAL — não é o objetivo aqui (não existe lista antiga a importar), já que o app guarda status/notas em banco próprio. Jikan é somente leitura, sem login, e cobre tudo que o MVP precisa: busca, detalhes, gêneros, ranking (`/top/anime`) e reviews de usuários (`/anime/{id}/reviews`) — evitando a complexidade de autenticação externa. |
| 2026-07 | Notícias de anime adiadas para Fase 6, fora do MVP | Jikan não tem endpoint de agregação de notícias — exigiria integrar uma fonte externa separada (RSS de terceiros), aumentando bastante a complexidade em relação às demais funcionalidades do MVP. |
| 2026-07 | **AniList API** (GraphQL) como fonte complementar, só para calendário de lançamentos (Fase 5.5) | Jikan não fornece previsão precisa de data/hora do próximo episódio (só dia da semana via `/schedules`). AniList tem o campo `nextAiringEpisode`, feito exatamente para esse tipo de contador — usado por referências do gênero como AniChart. Jikan continua sendo a fonte principal para todo o resto (catálogo, ranking, reviews, stats). |
| 2026-07 | Tabela `media_entries` genérica (com coluna `tipo`), não `anime_entries` específica | Mangá não está no MVP (uso pessoal não inclui leitura de mangá), mas o Jikan já espelha os mesmos endpoints pra mangá. Desenhar o schema genérico agora custa quase nada e evita migração cara depois, se mangá virar uma fase futura. |
| 2026-07 | **Nunca armazenar permanentemente dados do catálogo do MAL** (sinopse, streaming, etc.) — só `mal_id` + dados próprios (status/nota/anotação) | A documentação do Jikan afirma explicitamente que usar o serviço para "popular seu próprio banco de dados" viola os Termos de Uso do MyAnimeList. Isso reverte a ideia original de indexar dados de streaming localmente — dados do catálogo sempre são buscados ao vivo (ou cache curto, de poucas horas, nunca permanente). Risco maior se o app for publicado publicamente (Play Store). |

---

### Como usar este arquivo
Mesmo formato dos outros projetos do portfólio: uma linha por decisão estrutural, com a razão
frente à alternativa considerada.
