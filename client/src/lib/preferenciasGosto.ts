import { supabase } from './supabase'
import type { AfinidadeComNota } from './lacuna'

export interface PreferenciasDeGosto {
  favoritos: string[]
  bloqueados: string[]
  tutorialConcluido: boolean
}

function chaveLocal(userId?: string): string {
  return `anideck:gosto:${userId || 'anon'}`
}

function normalizarLista(lista: unknown): string[] {
  if (!Array.isArray(lista)) return []
  const vistos = new Set<string>()
  const saida: string[] = []
  for (const item of lista) {
    if (typeof item !== 'string') continue
    const limpo = item.trim()
    if (!limpo) continue
    const chave = limpo.toLowerCase()
    if (vistos.has(chave)) continue
    vistos.add(chave)
    saida.push(limpo)
  }
  return saida
}

export function lerPreferenciasDeGosto(
  userId?: string,
  userMetadata?: Record<string, unknown>,
): PreferenciasDeGosto {
  let local: Partial<PreferenciasDeGosto> = {}
  if (typeof window !== 'undefined' && userId) {
    try {
      const bruto = window.localStorage.getItem(chaveLocal(userId))
      if (bruto) {
        local = JSON.parse(bruto) as Partial<PreferenciasDeGosto>
      }
    } catch {
      local = {}
    }
  }

  const favMeta = normalizarLista(userMetadata?.favorite_genres)
  const bloqMeta = normalizarLista(userMetadata?.blocked_genres)
  const favLocal = normalizarLista(local.favoritos)
  const bloqLocal = normalizarLista(local.bloqueados)

  const favoritos = favMeta.length > 0 ? favMeta : favLocal
  const bloqueadosSet = new Set(favoritos.map(f => f.toLowerCase()))
  const bloqueados = (bloqMeta.length > 0 ? bloqMeta : bloqLocal).filter(
    b => !bloqueadosSet.has(b.toLowerCase()),
  )
  const tutorialConcluido = Boolean(
    userMetadata?.taste_onboarding_done ||
      local.tutorialConcluido ||
      favoritos.length >= 3,
  )

  return { favoritos, bloqueados, tutorialConcluido }
}

export async function salvarPreferenciasDeGosto(
  userId: string,
  prefs: PreferenciasDeGosto,
): Promise<PreferenciasDeGosto> {
  const favoritos = normalizarLista(prefs.favoritos)
  const favSet = new Set(favoritos.map(f => f.toLowerCase()))
  const bloqueados = normalizarLista(prefs.bloqueados).filter(
    b => !favSet.has(b.toLowerCase()),
  )
  const normalizadas: PreferenciasDeGosto = {
    favoritos,
    bloqueados,
    tutorialConcluido: prefs.tutorialConcluido,
  }

  if (typeof window !== 'undefined' && userId) {
    try {
      window.localStorage.setItem(chaveLocal(userId), JSON.stringify(normalizadas))
    } catch {
      // ignora quota cheia
    }
  }

  await supabase.auth.updateUser({
    data: {
      favorite_genres: favoritos,
      blocked_genres: bloqueados,
      taste_onboarding_done: normalizadas.tutorialConcluido,
    },
  })

  return normalizadas
}

/**
 * Combina os gêneros favoritos escolhidos pelo usuário com os gêneros de maior
 * afinidade/nota do seu histórico, removendo gêneros bloqueados.
 */
export function selecionarGenerosRecomendados(
  afinidade: AfinidadeComNota[],
  prefs: PreferenciasDeGosto,
  limite = 3,
): string[] {
  const bloqueados = new Set(prefs.bloqueados.map(b => b.toLowerCase()))
  const escolhidos: string[] = []
  const jaIncluidos = new Set<string>()

  const adicionar = (nome: string) => {
    const limpo = nome.trim()
    const chave = limpo.toLowerCase()
    if (!limpo || bloqueados.has(chave) || jaIncluidos.has(chave)) return
    jaIncluidos.add(chave)
    escolhidos.push(limpo)
  }

  for (const fav of prefs.favoritos) {
    adicionar(fav)
    if (escolhidos.length >= limite) return escolhidos
  }

  const competitivos = [...afinidade]
    .filter(a => (a.tier ?? 'genero') !== 'tag_tematica')
    .sort((a, b) => {
      const notaA = a.media_nota_genero ?? 7
      const notaB = b.media_nota_genero ?? 7
      const pesoA = a.total_watched * (notaA / 8)
      const pesoB = b.total_watched * (notaB / 8)
      return pesoB - pesoA
    })

  for (const item of competitivos) {
    adicionar(item.genre)
    if (escolhidos.length >= limite) break
  }

  return escolhidos
}

/**
 * Filtra candidatos de recomendação removendo animes que já estão no Deck do
 * usuário ou que possuam qualquer gênero bloqueado.
 */
export function filtrarRecomendacoesPorGosto<
  T extends { mal_id: number; genres?: { name: string }[] | null }
>(candidatos: T[], noDeck: Set<number>, bloqueados: string[]): T[] {
  const bloqSet = new Set(bloqueados.map(b => b.trim().toLowerCase()).filter(Boolean))
  const vistos = new Set<number>()
  const resultado: T[] = []

  for (const item of candidatos) {
    if (!item || item.mal_id <= 0 || noDeck.has(item.mal_id) || vistos.has(item.mal_id)) {
      continue
    }
    const temBloqueado = (item.genres ?? []).some(g =>
      bloqSet.has((g.name || '').trim().toLowerCase()),
    )
    if (temBloqueado) continue
    vistos.add(item.mal_id)
    resultado.push(item)
  }

  return resultado
}
