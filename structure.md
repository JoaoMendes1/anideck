# Project Structure

```
├── client
│   ├── public
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src
│   │   ├── assets
│   │   │   ├── hero.png
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── components
│   │   │   ├── AnimeCard.tsx
│   │   │   ├── BotaoCopiar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Brand.tsx
│   │   │   ├── DeckCard.tsx
│   │   │   ├── DeckSkeleton.tsx
│   │   │   ├── EditarEntradaModal.tsx
│   │   │   ├── FilterChipGroup.tsx
│   │   │   ├── FilterSheet.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── RankingCard.tsx
│   │   │   ├── RankingSkeleton.tsx
│   │   │   ├── RotaProtegida.tsx
│   │   │   ├── SearchResultCard.tsx
│   │   │   ├── Sheet.tsx
│   │   │   └── StatCard.tsx
│   │   ├── contexts
│   │   │   └── ToastContext.tsx
│   │   ├── hooks
│   │   │   └── useSheetBehavior.ts
│   │   ├── lib
│   │   │   ├── deckHelpers.ts
│   │   │   ├── filters.ts
│   │   │   └── supabase.ts
│   │   ├── pages
│   │   │   ├── Auth.tsx
│   │   │   ├── Busca.tsx
│   │   │   ├── Calendario.tsx
│   │   │   ├── Detalhes.tsx
│   │   │   ├── Estatisticas.tsx
│   │   │   ├── Landing.tsx
│   │   │   ├── MeuDeck.tsx
│   │   │   ├── PainelAdmin.tsx
│   │   │   └── Rankings.tsx
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
│   ├── archive
│   │   └── ISSUES-FASE1.md
│   ├── AGENTS.md
│   ├── DECISIONS.md
│   ├── DESIGN_TOKENS.md
│   ├── fluxo-busca.md
│   ├── ideias-para-melhorias.md
│   ├── PAGES.md
│   ├── README.md
│   └── ROADMAP.md
├── internal
│   ├── anilist
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
│   │   ├── anime.go
│   │   ├── curation_utils.go
│   │   ├── curation.go
│   │   ├── entries_test.go
│   │   ├── entries.go
│   │   ├── ranking.go
│   │   ├── search_test.go
│   │   ├── search.go
│   │   └── stats.go
│   ├── middleware
│   │   └── auth.go
│   └── models
│       └── curation.go
├── marketing
│   └── posts-instagram.html
├── prototipos
│   ├── config-ajuda-prototipo.html
│   ├── estatisticas-prototipo.html
│   ├── landing-prototipo.html
│   └── logo.html
├── go.mod
└── go.sum
```
