# Project Structure

```
anideck/
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
│   │   │   ├── AnimeCard.tsx
│   │   │   ├── BotaoCopiar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Brand.tsx
│   │   │   ├── BuscaAniList.tsx
│   │   │   ├── ConfigIAModal.tsx
│   │   │   ├── CuradoriaPersonagens.tsx
│   │   │   ├── DeckCard.tsx
│   │   │   ├── DeckSkeleton.tsx
│   │   │   ├── DestaqueRailCard.tsx
│   │   │   ├── DestaquesRail.tsx
│   │   │   ├── EditarEntradaModal.tsx
│   │   │   ├── EpisodeGrid.tsx
│   │   │   ├── FilterChipGroup.tsx
│   │   │   ├── FilterSheet.tsx
│   │   │   ├── ImageUploadField.tsx
│   │   │   ├── Layout.tsx
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
│   │   │   └── StatCard.tsx
│   │   ├── contexts
│   │   │   └── ToastContext.tsx
│   │   ├── hooks
│   │   │   ├── useContagemAnimada.ts
│   │   │   ├── useOlheiro.ts
│   │   │   ├── useRevealOnScroll.ts
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
│   │   ├── types
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
│   ├── AGENTS.md
│   ├── DECISIONS.md
│   ├── DESIGN_TOKENS.md
│   ├── ESTATISTICAS_BACKLOG.md
│   ├── fluxo-busca.md
│   ├── ideias-para-melhorias.md
│   ├── PAGES.md
│   ├── README.md
│   ├── ROADMAP.md
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
│   │   ├── anime.go
│   │   ├── curation_ai.go
│   │   ├── curation_utils.go
│   │   ├── curation.go
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
│   │   └── streak.go
│   ├── middleware
│   │   └── auth.go
│   └── models
│       └── curation.go
├── marketing
│   └── posts-instagram.html
├── prototipos
│   ├── config-ajuda-prototipo.html
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
│   └── README.md
├── go.mod
├── go.sum
```
