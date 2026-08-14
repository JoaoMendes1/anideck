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
  order_index: number
}