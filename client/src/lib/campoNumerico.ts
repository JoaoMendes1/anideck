// client/src/lib/campoNumerico.ts
// Regras do campo numérico (components/CampoNumerico.tsx), separadas para teste.

/** Quantas casas decimais o passo tem: 1 → 0, 0.5 → 1, 0.25 → 2. */
export function casasDoPasso(passo: number): number {
  const texto = String(passo)
  const ponto = texto.indexOf('.')
  return ponto < 0 ? 0 : texto.length - ponto - 1
}

/**
 * Lê o que foi digitado. Aceita vírgula ou ponto como separador decimal. Devolve null
 * para vazio, texto que não é número e, quando o campo é inteiro, número com decimais.
 */
export function interpretarNumero(texto: string, casas: number): number | null {
  const limpo = texto.trim().replace(',', '.')
  if (limpo === '' || limpo === '-' || limpo === '.') return null
  const n = Number(limpo)
  if (!Number.isFinite(n)) return null
  if (casas === 0 && !Number.isInteger(n)) return null
  return n
}

export function dentroDosLimites(n: number, min?: number, max?: number): boolean {
  return (min === undefined || n >= min) && (max === undefined || n <= max)
}

export function limitar(n: number, min?: number, max?: number): number {
  if (min !== undefined && n < min) return min
  if (max !== undefined && n > max) return max
  return n
}

/** Soma ou subtrai um passo, sem o resíduo de ponto flutuante (0.1 + 0.2), e respeita os limites. */
export function darPasso(atual: number, direcao: 1 | -1, passo: number, min?: number, max?: number): number {
  const casas = casasDoPasso(passo)
  const proximo = Number((atual + direcao * passo).toFixed(casas))
  return limitar(proximo, min, max)
}
