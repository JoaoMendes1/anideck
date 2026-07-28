# 📑 DECISIONS.md — AniDeck

> Escopo: só decisões técnicas estruturais deste projeto.

| Data | Decisão | Por que escolhemos A em vez de B |
|---|---|---|
| 2026-07-28 | **MIGRAÇÃO DE EMERGÊNCIA:** Adoção total da **AniList API (GraphQL)** como fonte de dados | A Jikan API (usada anteriormente) anunciou oficialmente seu encerramento para 01/10/2026, com instabilidades (brownouts) imediatas. A AniList fornece uma API GraphQL oficial, estável, sem necessidade de autenticação para dados públicos, e com suporte nativo de mapeamento para o `mal_id` (campo `idMal`). Esta decisão revoga permanentemente qualquer uso do Jikan no projeto. |
| 2026-07 | ~~**Jikan API** (não oficial) como fonte de dados~~ *(REVOGADO)* | *Decisão original mantida para histórico.* A API oficial do MyAnimeList exige OAuth pesado. O Jikan resolvia o MVP sem login, mas morreu. |
| 2026-07 | Tabela `media_entries` genérica (com coluna `tipo`), não `anime_entries` específica | Mangá não está no MVP, mas a AniList atende animes e mangás na mesma API. Desenhar o schema genérico agora evita migração cara depois. |
| 2026-07 | **Nunca armazenar permanentemente dados do catálogo** (sinopse, streaming, etc.) | Os Termos de Uso da AniList (e do antigo Jikan) proíbem explícitamente "hoarding ou coleta em massa de dados". O banco do AniDeck armazena apenas a relação do usuário (status/nota) com o `mal_id`. O catálogo é consumido em tempo real. |
| 2026-07 | Deploy Monolítico (Backend Go servindo o frontend React) em vez de Deploy Desacoplado | Evita a complexidade operacional de gerenciar múltiplos pipelines de deploy e CORS. Mantém o MVP simples para infraestrutura free-tier. |