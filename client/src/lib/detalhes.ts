// client/src/lib/detalhes.ts
// Regras puras da página de um anime: abas, nota e próximo episódio.

export const ABAS_DETALHES = ['sobre', 'episodios', 'conversa', 'numeros'] as const
export type AbaDetalhes = (typeof ABAS_DETALHES)[number]

/** Aba pedida na URL; links antigos com âncora (#conversa, #episodios) continuam valendo. */
export function abaDaUrl(param: string | null, hash: string): AbaDetalhes {
  const pedida = (param || hash.replace(/^#/, '')).toLowerCase()
  if (pedida === 'estatisticas') return 'numeros'
  return (ABAS_DETALHES as readonly string[]).includes(pedida) ? (pedida as AbaDetalhes) : 'sobre'
}

export const STATUS_DO_DECK = ['Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado'] as const

/** Palavra que acompanha a nota na régua. */
export function rotuloDaNota(nota: number | null | undefined): string {
  if (nota === null || nota === undefined) return 'Sem nota'
  if (nota >= 10) return 'Obra-prima'
  if (nota >= 9) return 'Excelente'
  if (nota >= 8) return 'Ótimo'
  if (nota >= 7) return 'Bom'
  if (nota >= 6) return 'Ok'
  if (nota >= 5) return 'Mediano'
  if (nota >= 3) return 'Fraco'
  return 'Ruim'
}

/** 8 → "8"; 8.5 → "8,5"; 7.25 → "7,25". Até duas casas, sem zero sobrando. */
export function formatarNota(nota: number): string {
  return String(Math.round(nota * 100) / 100).replace('.', ',')
}

/** Passo da régua e dos botões − e +: 0,1, preso entre 0 e 10. */
export function ajustarNota(valor: number): number {
  if (!Number.isFinite(valor)) return 0
  return Math.min(10, Math.max(0, Math.round(valor * 10) / 10))
}

/**
 * Nota digitada, como na antiga folha de edição: "7,3", "8.25", "10". Vazio é "sem nota"
 * (null); fora de 0 a 10 ou com mais de duas casas devolve NaN, para a tela recusar.
 */
export function lerNotaDigitada(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  if (t === '') return null
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(t)) return NaN
  const n = Number(t)
  return n > 10 ? NaN : n
}

/**
 * O episódio que continua a maratona: o seguinte ao maior já marcado, se já saiu.
 * Sem nada marcado, o primeiro. Devolve null quando não há o que marcar.
 */
export function proximoEpisodio(assistidos: number[], ultimoDisponivel: number): number | null {
  const validos = assistidos.filter(n => Number.isInteger(n) && n > 0)
  const proximo = validos.length > 0 ? Math.max(...validos) + 1 : 1
  return proximo <= ultimoDisponivel ? proximo : null
}

/** A linha do deck como a API devolve (`/api/entries`). */
export interface EntradaNoDeck {
  id: string
  status: string
  mal_id: number
  tipo: string
  nota?: number | null
  anotacao?: string
  is_favorite?: boolean
}
