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
    { label: 'Isekai',            value: 'Isekai',        type: 'genre' },
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

// Mapeamento semântico de cores para categorias
export function getCategoryTheme(category: string) {
    const cat = category.toLowerCase();
    
    // 🟪 Outro / Portais (Fuchsia Neon para Isekai)
    if (cat === 'isekai') {
        return 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.2)]';
    }
    // 🔴 Energia / Combate (Coral)
    if (['ação', 'action', 'shounen', 'artes marciais', 'martial arts', 'militar', 'military'].includes(cat)) {
        return 'bg-coral/10 border-coral/30 text-coral';
    }
    // 🟣 Místico / Sombrio (Holo-2 / Roxo)
    if (['magia', 'magic', 'fantasia', 'fantasy', 'demônios', 'demons', 'sobrenatural', 'supernatural', 'terror', 'horror', 'suspense', 'thriller'].includes(cat)) {
        return 'bg-holo-2/10 border-holo-2/30 text-holo-2';
    }
    // 🔵 Futurista / Inteligência (Holo-3 / Ciano)
    if (['ficção científica', 'sci-fi', 'mecha', 'mistério', 'mystery', 'jogo', 'video games'].includes(cat)) {
        return 'bg-holo-3/10 border-holo-3/30 text-holo-3';
    }
    // 💖 Sentimental / Relacionamentos (Holo-1 / Magenta)
    if (['romance', 'shoujo', 'josei', 'harém', 'harém (ela)', 'harém (ele)', 'female harem', 'male harem', 'yuri', 'yaoi', "boys' love", 'boys love', 'ecchi', 'sem censura', 'nudity'].includes(cat)) {
        return 'bg-holo-1/10 border-holo-1/30 text-holo-1';
    }
    // 🟡 Leveza / Dia a dia (Gold)
    if (['comédia', 'comedy', 'slice of life', 'escolar', 'school'].includes(cat)) {
        return 'bg-gold/10 border-gold/30 text-gold';
    }
    // 🟢 Movimento / Jornada (Green)
    if (['aventura', 'adventure', 'esporte', 'sports', 'histórico', 'historical', 'samurai', 'musical', 'music'].includes(cat)) {
        return 'bg-green/10 border-green/30 text-green';
    }
    
    // ⚪ Neutro (Muted)
    return 'bg-panel-2 border-line text-muted';
}