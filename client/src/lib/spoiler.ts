// client/src/lib/spoiler.ts
// Particiona trechos marcados com ||spoiler|| para renderização segura em React (sem HTML bruto).

export interface ParteTextoSpoiler {
  tipo: 'texto' | 'spoiler'
  conteudo: string
}

/**
 * Divide um texto em segmentos normais e trechos marcados com ||...||.
 * Marcadores vazios (|||| ou só espaços) ou sem fechamento permanecem texto comum.
 */
export function particionarTextoSpoiler(texto: string): ParteTextoSpoiler[] {
  if (!texto) return []
  const partes: ParteTextoSpoiler[] = []
  let pos = 0

  while (pos < texto.length) {
    const inicio = texto.indexOf('||', pos)
    if (inicio === -1) {
      partes.push({ tipo: 'texto', conteudo: texto.slice(pos) })
      break
    }
    const fim = texto.indexOf('||', inicio + 2)
    if (fim === -1) {
      partes.push({ tipo: 'texto', conteudo: texto.slice(pos) })
      break
    }

    const miolo = texto.slice(inicio + 2, fim)
    if (miolo.trim().length === 0) {
      // Marcador vazio: trata até o fechamento como texto comum para evitar botão sem conteúdo.
      partes.push({ tipo: 'texto', conteudo: texto.slice(pos, fim + 2) })
      pos = fim + 2
      continue
    }

    if (inicio > pos) {
      partes.push({ tipo: 'texto', conteudo: texto.slice(pos, inicio) })
    }
    partes.push({ tipo: 'spoiler', conteudo: miolo })
    pos = fim + 2
  }

  return partes
}

/** Indica se o texto possui ao menos um trecho válido em ||...||. */
export function textoTemSpoilerInline(texto: string | undefined | null): boolean {
  if (!texto) return false
  return particionarTextoSpoiler(texto).some(p => p.tipo === 'spoiler')
}

/** Envolve a seleção atual (ou insere um exemplo) com ||...|| no texto. */
export function inserirMarcacaoSpoiler(
  texto: string,
  inicioSel: number,
  fimSel: number,
): { texto: string; selecaoInicio: number; selecaoFim: number } {
  const ini = Math.max(0, Math.min(inicioSel, texto.length))
  const fim = Math.max(ini, Math.min(fimSel, texto.length))
  const selecionado = texto.slice(ini, fim)
  const miolo = selecionado.length > 0 ? selecionado : 'spoiler'
  const novo = `${texto.slice(0, ini)}||${miolo}||${texto.slice(fim)}`
  return {
    texto: novo,
    selecaoInicio: ini + 2,
    selecaoFim: ini + 2 + miolo.length,
  }
}
