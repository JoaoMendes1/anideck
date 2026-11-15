// client/src/lib/insignias.ts
// Regras das insígnias de rank e do selo de streak, separadas do desenho para poderem
// ser testadas. O desenho fica em components/hud/InsigniaRank.tsx.

export const RANKS_CONHECIDOS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS'] as const
export type RankConhecido = (typeof RANKS_CONHECIDOS)[number]

/** Rank vindo da API, que pode ter sido editado no Painel Admin, sem caixa nem espaço. */
export function normalizarRank(rank: string | null | undefined): RankConhecido {
  const limpo = (rank ?? '').trim().toUpperCase()
  return (RANKS_CONHECIDOS as readonly string[]).includes(limpo) ? (limpo as RankConhecido) : 'F'
}

export type DetalheDaInsignia = 'completa' | 'compacta'

/**
 * Abaixo de 48 px, rebites, chanfros e filetes viram ruído: a insígnia compacta mantém só
 * a silhueta, a letra e as divisas, que são o que diferencia um rank do outro.
 */
export function detalhePorTamanho(tamanho: number): DetalheDaInsignia {
  return tamanho >= 48 ? 'completa' : 'compacta'
}

/** Halo, aura e brilhos só se animam quando a insígnia é grande o bastante para serem vistos. */
export function animaPorPadrao(tamanho: number): boolean {
  return tamanho >= 96
}

/** Cor principal de cada rank, a mesma usada na flâmula e no brilho da insígnia. */
export const COR_DO_RANK: Record<RankConhecido, string> = {
  F: '#8B80B0',
  E: '#3FE0F0',
  D: '#3FE0F0',
  C: '#C9D2E6',
  B: '#A0FF78',
  A: '#FF4FD8',
  S: '#FFC542',
  SS: '#FFC542',
}

export type EstadoDoDia = 'apagado' | 'aceso' | 'completo'

/**
 * Os sete losangos do selo de streak, do mais antigo ao de hoje. A sequência acende da
 * direita para a esquerda; com sete dias ou mais, a semana inteira fica no estado "completo".
 */
export function diasDaSemanaDoStreak(dias: number): EstadoDoDia[] {
  const seguidos = Math.max(0, Math.floor(Number.isFinite(dias) ? dias : 0))
  const completa = seguidos >= 7
  return Array.from({ length: 7 }, (_, i) => {
    if (completa) return 'completo'
    return i >= 7 - seguidos ? 'aceso' : 'apagado'
  })
}

export function rotuloDoStreak(dias: number): string {
  return dias === 1 ? 'dia seguido' : 'dias seguidos'
}
