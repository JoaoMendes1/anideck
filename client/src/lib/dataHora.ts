// client/src/lib/dataHora.ts
// Formatação humana e amigável para semanas ISO (YYYY-Www) e temporadas (YYYY-ESTACAO).
// Substitui códigos misteriosos como '2026-W46' por informações claras que qualquer um entende.

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

const NOMES_ESTACOES: Record<string, { nome: string; meses: string }> = {
  WINTER: { nome: 'Inverno', meses: 'Jan–Mar' },
  SPRING: { nome: 'Primavera', meses: 'Abr–Jun' },
  SUMMER: { nome: 'Verão', meses: 'Jul–Set' },
  FALL: { nome: 'Outono', meses: 'Out–Dez' },
}

/**
 * Calcula a data de início (segunda-feira) e término (domingo) de uma semana ISO (ex: 2026-W46).
 */
export function obterIntervaloSemanaISO(semanaISO: string): { inicio: Date; fim: Date } | null {
  if (!semanaISO) return null
  const match = /^(\d{4})-W(\d{1,2})$/i.exec(semanaISO.trim())
  if (!match) return null

  const ano = parseInt(match[1], 10)
  const semana = parseInt(match[2], 10)
  if (isNaN(ano) || isNaN(semana) || semana < 1 || semana > 53) return null

  // 4 de janeiro sempre pertence à semana 1 da norma ISO 8601
  const quatroJan = new Date(Date.UTC(ano, 0, 4))
  const diaDaSemana = quatroJan.getUTCDay() || 7 // 1 = seg, 7 = dom
  const segundaSemana1 = new Date(quatroJan)
  segundaSemana1.setUTCDate(quatroJan.getUTCDate() - (diaDaSemana - 1))

  const inicio = new Date(segundaSemana1)
  inicio.setUTCDate(segundaSemana1.getUTCDate() + (semana - 1) * 7)
  inicio.setUTCHours(0, 0, 0, 0)

  const fim = new Date(inicio)
  fim.setUTCDate(inicio.getUTCDate() + 6)
  fim.setUTCHours(23, 59, 59, 999)

  return { inicio, fim }
}

/**
 * Formata um código de semana como '2026-W46' para uma exibição amigável:
 * Exemplo: '09 a 15 de Nov' ou 'Esta semana (09 a 15 de Nov)'.
 */
export function formatarSemanaISO(semanaISO: string, agora = new Date()): string {
  if (!semanaISO) return ''
  const intervalo = obterIntervaloSemanaISO(semanaISO)
  if (!intervalo) return semanaISO

  const { inicio, fim } = intervalo
  const diaInicio = String(inicio.getUTCDate()).padStart(2, '0')
  const diaFim = String(fim.getUTCDate()).padStart(2, '0')
  const mesInicio = MESES_ABREV[inicio.getUTCMonth()]
  const mesFim = MESES_ABREV[fim.getUTCMonth()]

  const periodoTexto = mesInicio === mesFim
    ? `${diaInicio} a ${diaFim} de ${mesFim}`
    : `${diaInicio} de ${mesInicio} a ${diaFim} de ${mesFim}`

  // Verifica se é a semana corrente
  const agoraUTC = agora.getTime()
  if (agoraUTC >= inicio.getTime() && agoraUTC <= fim.getTime()) {
    return `Esta semana (${periodoTexto})`
  }

  return periodoTexto
}

/**
 * Formata um código de temporada como '2026-FALL' para 'Outono 2026 (Out–Dez)'.
 */
export function formatarTemporada(temporadaCod: string): string {
  if (!temporadaCod) return ''
  const partes = temporadaCod.trim().split('-')
  if (partes.length < 2) return temporadaCod

  const ano = partes[0]
  const estacaoKey = partes[1].toUpperCase()
  const estacao = NOMES_ESTACOES[estacaoKey]

  if (!estacao) return temporadaCod

  return `${estacao.nome} ${ano} (${estacao.meses})`
}
