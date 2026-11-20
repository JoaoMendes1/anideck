// client/src/lib/velocidadeBatalha.ts
// Velocidade da reprodução das batalhas, escolhida pelo jogador e lembrada neste aparelho.
// A luta já está decidida quando chega à tela: a velocidade só muda o ritmo de mostrar.

export const VELOCIDADES = [1, 2, 4] as const
export type Velocidade = (typeof VELOCIDADES)[number]

const CHAVE = 'anideck:velocidade-batalha'
/** Tempo entre um golpe e outro na velocidade 1x. */
export const INTERVALO_BASE_MS = 900

export function lerVelocidade(): Velocidade {
  try {
    const v = Number(window.localStorage.getItem(CHAVE))
    return (VELOCIDADES as readonly number[]).includes(v) ? (v as Velocidade) : 1
  } catch {
    return 1
  }
}

export function salvarVelocidade(v: Velocidade): void {
  try {
    window.localStorage.setItem(CHAVE, String(v))
  } catch {
    // Sem armazenamento (aba anônima, por exemplo): vale só nesta tela.
  }
}

export function intervaloDaVelocidade(v: Velocidade): number {
  return Math.round(INTERVALO_BASE_MS / v)
}
