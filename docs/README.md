# 🎴 AniDeck

> Domínio: `anideck.com.br`

Catálogo pessoal de anime construído sobre a base global (via AniList API), com
status de progresso, notas e avaliações próprias — uma interface moderna e com identidade visual
própria, diferente da experiência padrão de outras plataformas. Módulo futuro do hub
[JVM Systems — Portfolio Dev](../jvm-systems-portfolio-dev/README.md).

**Status:** 🚧 Em planejamento — ver [`ROADMAP.md`](./ROADMAP.md).

---

## ✨ Funcionalidades

### MVP
- [ ] Busca e navegação no catálogo de anime (via AniList API).
- [ ] Salvar anime na lista pessoal com status (assistindo / em dia / completo / quero assistir / dropado).
- [ ] Notas e avaliações próprias por título.
- [ ] Filtro por gênero/tag.
- [ ] Filtro por plataforma de streaming disponível (ex: só mostrar o que está na Crunchyroll) —
      **nota técnica:** consulta ao vivo cruzando dados com o campo `externalLinks` da AniList a cada busca, **sem
      armazenar dado de streaming no banco** (decisão de ToS registrada em `DECISIONS.md`).

> **Definição sem ambiguidade:** a lista do usuário é 100% controlada manualmente — cada entrada
> é adicionada, classificada (status) e anotada (nota/comentário) pelo próprio usuário. Não existe
> importação automática nem lista gerada por algoritmo. Isso é o que o protótipo chamava de
> "curadoria pessoal"; aqui documentado sem termo vago, para não gerar interpretação errada por
> quem for implementar.

### Pós-MVP
- [ ] Dashboard de estatísticas pessoais (tempo assistido, gênero favorito, etc.).
- [ ] Recomendações personalizadas com base na lista salva.
- [ ] Agregador de notícias de fontes oficiais de anime.
- [ ] Suporte multiusuário (hoje é uso pessoal, pode abrir para outras pessoas depois).

---

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Backend | Go + Chi |
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Banco de dados | PostgreSQL (Supabase) |
| Fonte de dados externa | [AniList API](https://anilist.co/graphiql) (GraphQL, oficial, somente leitura, sem necessidade de login) |
| Autenticação | Supabase Auth (JWT) |

---

## 🎨 Identidade visual

Ainda em definição — direção combinada: fusão **cyberpunk/sci-fi com estética de anime**,
moderna, com identidade própria e visualmente marcante (não um tema genérico de dev). Protótipo
visual desenhado na pasta `/prototipos`.

---

## 🗺️ Roadmap

Planejamento completo por fases em [`ROADMAP.md`](./ROADMAP.md).

---

## 👤 Autor

**João Victor Mendes**
[GitHub](https://github.com/JoaoMendes1) · [LinkedIn](https://www.linkedin.com/in/jo%C3%A3o-victor-mendes-41521b1b9/)