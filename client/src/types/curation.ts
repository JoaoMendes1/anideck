// client/src/types/curation.ts
// Fonte única de verdade para o shape de um "Destaque" curado.
// Antes esse tipo estava duplicado entre PainelAdmin.tsx e DestaqueListItem.tsx
// com campos diferentes — isso quebra o TS porque duas interfaces de mesmo
// nome mas shapes diferentes são tratadas como tipos incompatíveis.

export interface CuratedCharacter {
  name: string
  image: string
  role: string
}

// Um episódio curado. O `number` é a chave de posicionamento na grade e nunca deve mudar
// depois de existir: `episode_progress` referencia esse número, e não há chave estrangeira
// entre as duas coisas — renumerar dessincroniza o progresso já marcado, em silêncio.
export interface CuratedEpisode {
  number: number
  title?: string
  image?: string
  /** Data de exibição no formato AAAA-MM-DD. */
  aired_at?: string
}

export interface CuratedExternalLink {
  platform: string
  url: string
}

/** Estados de completude da curadoria. Espelha o CHECK da coluna no sql/014. */
export type CurationStatus = 'parcial' | 'completo' | 'revisar'

export interface CuratedAnime {
  id?: string
  mal_id: number
  custom_title: string
  custom_synopsis?: string
  custom_format?: string
  custom_status?: string
  custom_tags?: string[]
  custom_cover_image?: string
  custom_banner_image?: string
  custom_characters?: CuratedCharacter[]

  // Campos do Bloco 2. Nulo significa "não curei, cai para a fonte seguinte";
  // array vazio significa "curei e está vazio de propósito".
  custom_episodes?: CuratedEpisode[] | null
  custom_external_links?: CuratedExternalLink[] | null
  /** Instante em que o episódio 1 foi ao ar, em ISO 8601. */
  custom_first_aired_at?: string | null
  custom_duration_minutes?: number | null

  /** Separa "tem dado customizado" de "aparece como destaque". */
  is_destaque?: boolean
  curation_status?: CurationStatus

  order_index: number
}