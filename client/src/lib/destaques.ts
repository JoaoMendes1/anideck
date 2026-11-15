// client/src/lib/destaques.ts
// Destaques da curadoria (as obras da vitrine). A Início e a vitrine do Meu Deck pedem a
// mesma lista ao montar; passando por aqui, a segunda aproveita a resposta da primeira.
import { VALIDADE_NA_MONTAGEM, buscarUmaVez } from './buscaCompartilhada'
import type { CuratedAnime } from '../types/curation'

/** Rejeita quando o servidor falha: quem chama decide o que mostrar no lugar. */
export function buscarDestaquesDaCuradoria(): Promise<CuratedAnime[]> {
  return buscarUmaVez('curadoria:destaques', async () => {
    const res = await fetch('/api/curation?destaques=true')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const dados: unknown = await res.json()
    return Array.isArray(dados) ? (dados as CuratedAnime[]) : []
  }, VALIDADE_NA_MONTAGEM)
}
