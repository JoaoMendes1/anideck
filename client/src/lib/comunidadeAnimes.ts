// client/src/lib/comunidadeAnimes.ts
// Leitura agregada da comunidade por anime (quantas pessoas em cada status) e
// ranking "Animes em alta" com hidratação segura de capas via curadoria ou lote.
import { miniatura } from './miniatura'

export interface NumerosComunidadeAnime {
  mal_id: number
  assistindo: number
  completo: number
  dropado: number
  quero_assistir: number
  total: number
}

export interface EmAltaComunidadeItem {
  mal_id: number
  titulo: string
  imagem_url: string
  pontuacao: number
  usuarios_ativos: number
  episodios_recentes: number
  comentarios_recentes: number
  reacoes_recentes: number
  drops_recentes: number
}

export interface RespostaEmAltaComunidade {
  dias: number
  itens: EmAltaComunidadeItem[]
}

export async function obterNumerosComunidadeAnime(malId: number): Promise<NumerosComunidadeAnime | null> {
  if (!Number.isFinite(malId) || malId <= 0) return null
  const res = await fetch(`/api/anime/${malId}/comunidade`, { cache: 'no-store' })
  if (!res.ok) return null
  return (await res.json()) as NumerosComunidadeAnime
}

interface BulkAnimeResumo {
  mal_id?: number
  title?: string
  images?: { jpg?: { image_url?: string } }
}

export async function hidratarCapasEmAlta(itens: EmAltaComunidadeItem[]): Promise<EmAltaComunidadeItem[]> {
  const faltandoCapa = itens.filter(i => !i.imagem_url).map(i => i.mal_id)
  if (faltandoCapa.length === 0) return itens

  try {
    const res = await fetch('/api/anime/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: faltandoCapa }),
    })
    if (!res.ok) return itens
    const payload = (await res.json()) as { data?: BulkAnimeResumo[] }
    const porId = new Map<number, BulkAnimeResumo>()
    for (const a of payload.data ?? []) {
      if (a.mal_id) porId.set(a.mal_id, a)
    }

    return itens.map(item => {
      const info = porId.get(item.mal_id)
      if (!info) return item
      const imagemBruta = info.images?.jpg?.image_url || ''
      const imagem = item.imagem_url || (imagemBruta ? (miniatura(imagemBruta) ?? imagemBruta) : '')
      const titulo = item.titulo.startsWith('Anime #') && info.title ? info.title : item.titulo
      return { ...item, titulo, imagem_url: imagem }
    })
  } catch {
    return itens
  }
}

export async function obterEmAltaComunidade(dias = 14, limite = 12): Promise<RespostaEmAltaComunidade> {
  const params = new URLSearchParams({
    dias: String(dias),
    limite: String(limite),
  })
  const res = await fetch(`/api/rankings/em-alta?${params.toString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Não foi possível carregar os animes em alta')
  const dados = (await res.json()) as RespostaEmAltaComunidade
  const itensComCapa = await hidratarCapasEmAlta(dados.itens ?? [])
  return { dias: dados.dias ?? dias, itens: itensComCapa }
}
