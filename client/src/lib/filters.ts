// client/src/lib/filters.ts
// Fonte única de verdade para os filtros de conteúdo do AniDeck.
// Centralizado aqui para evitar duplicação entre Busca.tsx e Rankings.tsx.

// Cada item tem:
//   - label: nome exibido ao usuário (em português)
//   - value: valor exato que a AniList espera (em inglês)
//   - type: 'genre' → enviado como ?genre=..., 'tag' → enviado como ?tag=...
//     A AniList separa gêneros (genre_in) de tags (tag_in) no GraphQL.
//     Sem essa distinção, categorias como "Artes Marciais" ou "Magia" nunca retornam resultado.
//
// Todos os valores foram verificados contra a MediaTagCollection da AniList API em 2026-07-30.

export interface FilterItem {
    label: string
    value: string
    type: 'genre' | 'tag'
}

export const CONTENT_FILTERS: FilterItem[] = [
    // ── Gêneros (genre_in na AniList) ─────────────────────────────────────
    { label: 'Ação',              value: 'Action',        type: 'genre' },
    { label: 'Aventura',          value: 'Adventure',     type: 'genre' },
    { label: 'Comédia',           value: 'Comedy',        type: 'genre' },
    { label: 'Drama',             value: 'Drama',         type: 'genre' },
    { label: 'Ecchi',             value: 'Ecchi',         type: 'genre' },
    { label: 'Fantasia',          value: 'Fantasy',       type: 'genre' },
    { label: 'Horror',            value: 'Horror',        type: 'genre' },
    { label: 'Mecha',             value: 'Mecha',         type: 'genre' },
    { label: 'Mistério',          value: 'Mystery',       type: 'genre' },
    { label: 'Musical',           value: 'Music',         type: 'genre' },
    { label: 'Psicológico',       value: 'Psychological', type: 'genre' },
    { label: 'Romance',           value: 'Romance',       type: 'genre' },
    { label: 'Ficção Científica', value: 'Sci-Fi',        type: 'genre' },
    { label: 'Slice of Life',     value: 'Slice of Life', type: 'genre' },
    { label: 'Esporte',           value: 'Sports',        type: 'genre' },
    { label: 'Sobrenatural',      value: 'Supernatural',  type: 'genre' },
    { label: 'Suspense',          value: 'Thriller',      type: 'genre' },

    // ── Tags (tag_in na AniList) ───────────────────────────────────────────
    // Tags são categorias mais granulares que a AniList trata separadamente dos gêneros.
    // Todos os valores abaixo foram verificados contra a MediaTagCollection da API.
    { label: 'Artes Marciais',  value: 'Martial Arts',  type: 'tag' },
    { label: 'Boys Love',       value: "Boys' Love",    type: 'tag' },
    { label: 'Demônios',        value: 'Demons',        type: 'tag' },
    { label: 'Escolar',         value: 'School',        type: 'tag' },
    { label: 'Harém (ela)',     value: 'Female Harem',  type: 'tag' }, // protagonista masculino + grupo feminino
    { label: 'Harém (ele)',     value: 'Male Harem',    type: 'tag' }, // protagonista feminino + grupo masculino
    { label: 'Histórico',       value: 'Historical',    type: 'tag' },
    { label: 'Jogo',            value: 'Video Games',   type: 'tag' },
    { label: 'Magia',           value: 'Magic',         type: 'tag' },
    { label: 'Militar',         value: 'Military',      type: 'tag' },
    { label: 'Samurai',         value: 'Samurai',       type: 'tag' },
    { label: 'Seinen',          value: 'Seinen',        type: 'tag' },
    { label: 'Shoujo',          value: 'Shoujo',        type: 'tag' },
    { label: 'Shounen',         value: 'Shounen',       type: 'tag' },
    { label: 'Super Poderes',   value: 'Super Power',   type: 'tag' },
    { label: 'Yuri',            value: 'Yuri',          type: 'tag' },
    // Nota: "Nudity" (Sem Censura) foi testado mas tem cobertura inconsistente
    // em requisições sem autenticação — removido para não frustrar o usuário.
]

// Status de exibição — enum MediaStatus da AniList
export interface StatusOption {
    label: string
    value: string
}

export const STATUS_OPTIONS: StatusOption[] = [
    { label: 'Em Exibição',  value: 'RELEASING'        },
    { label: 'Finalizado',   value: 'FINISHED'          },
    { label: 'Anunciado',    value: 'NOT_YET_RELEASED'  },
    { label: 'Em Hiato',     value: 'HIATUS'            },
]

// Temporadas — enum MediaSeason da AniList
export interface SeasonOption {
    label: string
    value: string
    emoji: string
}

export const SEASON_OPTIONS: SeasonOption[] = [
    { label: 'Inverno', value: 'WINTER', emoji: '❄️' },
    { label: 'Primavera', value: 'SPRING', emoji: '🌸' },
    { label: 'Verão',   value: 'SUMMER', emoji: '☀️' },
    { label: 'Outono',  value: 'FALL',   emoji: '🍂' },
]
