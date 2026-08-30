// client/src/types/anime.ts
// Formato do catálogo devolvido pelo backend Go.
//
// Derivado de `anilist.Anime` e dos tipos vizinhos em `internal/anilist/models.go`, não dos
// campos que cada tela consome. Serve POST /api/anime/bulk e GET /api/anime/{id}, que
// devolvem a mesma struct.
//
// Duas regras de serialização do Go governam a nulidade aqui, e valem a atenção porque não
// são simétricas:
//
//   * Campo COM `omitempty` some do JSON quando vazio  → opcional no TypeScript (`?`)
//   * Slice SEM `omitempty` vira `null` quando é nil    → precisa aceitar `| null`
//
// Foi essa segunda regra que o `any` escondia: `genres`, `studios`, `relations` e
// `streaming` chegam `null` — nunca `[]` — quando a obra não tem o dado.

export interface Genre {
  name: string
}

export interface StreamingLink {
  name: string
  url: string
}

export interface StreamingEpisode {
  title: string
  thumbnail: string
  url: string
  site: string
  /** Só vem da curadoria: a AniList não informa data por episódio. */
  aired_at?: string
}

export interface Character {
  /** Ponteiro no Go: some quando o personagem vem da curadoria, que é gravada sem id. */
  id?: number | null
  name: string
  image: string
  role: string
}

export interface RelationEntry {
  /** Ponteiro no Go: some quando a AniList devolve `idMal` nulo. */
  mal_id?: number | null
  type: string
  name: string
  image: string
}

export interface Relation {
  relation: string
  entry: RelationEntry[]
}

export interface FuzzyDate {
  year: number
  month: number
  day: number
}

export interface NextAiringEpisode {
  airingAt: number
  timeUntilAiring: number
  episode: number
}

export interface AnimeDaApi {
  mal_id: number
  title: string
  status: string
  synopsis: string
  episodes: number
  duration: number
  score: number

  ranking?: number
  popularity?: number
  bayesian_score?: number
  current_rank?: number
  previous_rank?: number
  bannerImage?: string

  characters?: Character[]
  startDate?: FuzzyDate
  first_aired_at?: string
  season?: string
  season_year?: number
  tags?: string[]
  nextAiringEpisode?: NextAiringEpisode
  streamingEpisodes?: StreamingEpisode[]

  // Sem `omitempty` no Go: chegam null quando a lista é nil.
  images: { jpg: { image_url: string } }
  genres: Genre[] | null
  studios: { name: string }[] | null
  relations: Relation[] | null
  streaming: StreamingLink[] | null
  theme: { openings: string[] | null; endings: string[] | null }
}

/** Envelope de POST /api/anime/bulk e GET /api/anime/{id}. */
export interface RespostaAnimes {
  data: AnimeDaApi[]
  last_updated?: string
}
