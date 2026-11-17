// client/src/lib/adiamento.ts
// Adiamento de episódios na curadoria: quando um episódio atrasa, ele e todos os seguintes
// andam a mesma quantidade de dias, numa ação só. O episódio que atrasou guarda a data
// original em adiado_de, para o site mostrar o selo "Adiado".
import type { CuratedEpisode } from '../types/curation'

const DIA_MS = 24 * 60 * 60 * 1000

/** Primeiro episódio com data ainda no futuro: o candidato natural a adiar. */
export function primeiroEpisodioFuturo(episodes: CuratedEpisode[], agora: number = Date.now()): number | null {
  const futuros = episodes
    .filter(ep => ep.aired_at && Date.parse(ep.aired_at) > agora)
    .map(ep => ep.number)
    .sort((a, b) => a - b)
  return futuros[0] ?? null
}

/**
 * Adia o episódio `aPartirDe` e todos os seguintes em `dias`. Episódios sem data não mudam.
 * Adiar de novo o mesmo episódio mantém a primeira data original em adiado_de. Dias
 * negativos antecipam (para desfazer um adiamento lançado errado).
 */
export function adiarEpisodios(episodes: CuratedEpisode[], aPartirDe: number, dias: number): CuratedEpisode[] {
  if (!Number.isInteger(aPartirDe) || aPartirDe < 1 || !Number.isFinite(dias) || dias === 0) return episodes
  return episodes.map(ep => {
    if (ep.number < aPartirDe || !ep.aired_at) return ep
    const original = Date.parse(ep.aired_at)
    if (Number.isNaN(original)) return ep
    const novo: CuratedEpisode = { ...ep, aired_at: new Date(original + dias * DIA_MS).toISOString() }
    if (ep.number === aPartirDe) {
      const base = ep.adiado_de || ep.aired_at
      // Voltou para a data original: deixa de estar adiado.
      if (Date.parse(base) === Date.parse(novo.aired_at!)) delete novo.adiado_de
      else novo.adiado_de = base
    }
    return novo
  })
}
