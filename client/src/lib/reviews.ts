// client/src/lib/reviews.ts
// Regras e chamadas para avaliações públicas de animes completos (anime_reviews).
// A anotação do deck (media_entries.anotacao) continua privada e nunca é misturada aqui.
import type { AutorDoComentario } from './comunidade'

export const REVIEW_MIN_CARACTERES = 100
export const REVIEW_MAX_CARACTERES = 2000

export interface ReviewDaObra {
  id: string
  mal_id: number
  autor: AutorDoComentario
  nota: number | null
  texto: string
  contem_spoiler: boolean
  created_at: string
  updated_at: string
  meu: boolean
  oculto?: boolean
}

export interface RespostaReviewsObra {
  reviews: ReviewDaObra[]
  minha_review?: ReviewDaObra | null
  pode_avaliar: boolean
  motivo_bloqueio?: string
}

export interface ResultadoValidacaoReview {
  valido: boolean
  texto: string
  tamanho: number
  erro?: string
}

export function contarCaracteresReview(texto: string): number {
  return Array.from(texto.trim()).length
}

export function validarTextoReview(textoBruto: string): ResultadoValidacaoReview {
  const texto = textoBruto.trim()
  const tamanho = Array.from(texto).length
  if (tamanho < REVIEW_MIN_CARACTERES) {
    return {
      valido: false,
      texto,
      tamanho,
      erro: `Faltam ${REVIEW_MIN_CARACTERES - tamanho} caracteres para publicar (mínimo ${REVIEW_MIN_CARACTERES}).`,
    }
  }
  if (tamanho > REVIEW_MAX_CARACTERES) {
    return {
      valido: false,
      texto,
      tamanho,
      erro: `Passou ${tamanho - REVIEW_MAX_CARACTERES} caracteres do limite de ${REVIEW_MAX_CARACTERES}.`,
    }
  }
  return { valido: true, texto, tamanho }
}

/**
 * Converte a nota digitada ("8,5", "9", "") para envio na avaliação pública.
 * Vazio retorna null (nota opcional). Aceita apenas valores entre 1 e 10.
 */
export function lerNotaReview(texto: string): { nota: number | null; erro?: string } {
  const t = texto.trim().replace(',', '.')
  if (t === '') return { nota: null }
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(t)) {
    return { nota: null, erro: 'Digite uma nota entre 1 e 10 (até 2 casas decimais).' }
  }
  const n = Number(t)
  if (!Number.isFinite(n) || n < 1 || n > 10) {
    return { nota: null, erro: 'A nota da avaliação precisa ficar entre 1 e 10.' }
  }
  return { nota: Math.round(n * 100) / 100 }
}

export async function listarReviewsDaObra(malId: number, token?: string): Promise<RespostaReviewsObra> {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(`/api/anime/${malId}/reviews`, { headers })
  if (!res.ok) {
    const msg = (await res.text().catch(() => '')).trim()
    throw new Error(msg || 'Não foi possível carregar as avaliações desta obra.')
  }
  const json = (await res.json()) as Partial<RespostaReviewsObra>
  return {
    reviews: Array.isArray(json.reviews) ? json.reviews : [],
    minha_review: json.minha_review ?? null,
    pode_avaliar: Boolean(json.pode_avaliar),
    motivo_bloqueio: json.motivo_bloqueio || '',
  }
}

export async function salvarReviewDaObra(
  malId: number,
  dados: { nota: number | null; texto: string; contem_spoiler: boolean },
  token: string,
): Promise<ReviewDaObra> {
  const res = await fetch(`/api/anime/${malId}/reviews`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dados),
  })
  if (!res.ok) {
    const msg = (await res.text().catch(() => '')).trim()
    throw new Error(msg || 'Não foi possível salvar sua avaliação.')
  }
  return (await res.json()) as ReviewDaObra
}

export async function apagarReviewDaObra(malId: number, token: string): Promise<void> {
  const res = await fetch(`/api/anime/${malId}/reviews`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const msg = (await res.text().catch(() => '')).trim()
    throw new Error(msg || 'Não foi possível apagar sua avaliação.')
  }
}
