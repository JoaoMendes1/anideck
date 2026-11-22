// client/src/lib/combate.ts
// Regras dinâmicas de combate compartilhadas com o servidor Go (#347):
// escala com retorno decrescente, crítico, esquiva, bloqueio, resistência e barra ATB.

export interface EstadoATB {
  velocidade_jogador: number
  velocidade_monstro: number
  ritmo_jogador: number
  ritmo_monstro: number
  atb_jogador: number
  atb_monstro: number
  primeiro: 'jogador' | 'monstro'
  proxima_ordem: ('jogador' | 'monstro')[]
}

export interface EstimativaCombate {
  criticoJogadorPct: number
  esquivaJogadorPct: number
  esquivaMonstroPct: number
  bloqueioJogadorPct: number
  resistenciaJogadorPct: number
  atb: EstadoATB
}

export const LIMIAR_PONTOS_RETORNO_DECRESCENTE = 60

export function calcularEscalaAtributo(valor: number, limiar = LIMIAR_PONTOS_RETORNO_DECRESCENTE): number {
  if (valor <= limiar || limiar < 0) return valor
  const excesso = valor - limiar
  if (excesso <= 30) return limiar + Math.floor((excesso * 3) / 4)
  return limiar + 22 + Math.floor((excesso - 30) / 2)
}

export function calcularChanceCriticaDinamica(
  basePorMil: number,
  ataque: number,
  defesaAlvo: number,
  velAtacante: number,
  velAlvo: number,
): number {
  const ajusteAtaque = Math.max(-20, Math.min(20, Math.trunc((ataque - defesaAlvo) / 20)))
  const ajusteVel = Math.max(-15, Math.min(20, velAtacante - velAlvo))
  const c = basePorMil + ajusteAtaque + ajusteVel
  if (c < 20) return 20
  if (c > 850) return 850
  return c
}

export function calcularChanceEsquivaDinamica(esquivaBase: number, velDefensor: number, velAtacante: number): number {
  if (esquivaBase >= 1000) return 1000
  const diffVel = velDefensor - velAtacante
  if (esquivaBase <= 0) {
    if (diffVel <= 8) return 0
    return Math.min(100, (diffVel - 8) * 6)
  }
  const ajuste = Math.max(-50, Math.min(60, diffVel * 2))
  return Math.max(0, Math.min(500, esquivaBase + ajuste))
}

export function calcularChanceBloqueioDinamica(defesaDefensor: number, ataqueAtacante: number): number {
  if (defesaDefensor <= 0 || ataqueAtacante <= 0) return 0
  const limiar = Math.floor((ataqueAtacante * 48) / 100)
  if (defesaDefensor <= limiar) return 0
  return Math.min(110, Math.floor(((defesaDefensor - limiar) * 3) / 2))
}

export function calcularResistenciaElementalPorMil(defesa: number, magia: number): number {
  return Math.min(160, Math.floor(Math.max(0, defesa) / 5) + Math.floor(Math.max(0, magia) / 4))
}

export function calcularBonusFuria(vidaAtual: number, vidaMax: number): number {
  if (vidaMax <= 0 || vidaAtual <= 0) return 1
  const pct = Math.floor((vidaAtual * 100) / vidaMax)
  if (pct <= 25) return 1.08
  if (pct <= 45) return 1.04
  return 1
}

export function calcularIniciativaATB(velJogador: number, velMonstro: number): EstadoATB {
  const rj = Math.max(5, velJogador + 5)
  const rm = Math.max(5, velMonstro + 5)
  const primeiro = velMonstro > velJogador ? 'monstro' : 'jogador'

  const ordem: ('jogador' | 'monstro')[] = []
  let simJ = 0
  let simM = 0
  while (ordem.length < 6) {
    simJ += rj
    simM += rm
    while ((simJ >= 100 || simM >= 100) && ordem.length < 6) {
      if (simJ >= 100 && (simJ >= simM || simM < 100)) {
        ordem.push('jogador')
        simJ -= 100
      } else if (simM >= 100) {
        ordem.push('monstro')
        simM -= 100
      }
    }
  }
  const maxR = Math.max(1, rj, rm)
  return {
    velocidade_jogador: velJogador,
    velocidade_monstro: velMonstro,
    ritmo_jogador: rj,
    ritmo_monstro: rm,
    atb_jogador: Math.min(100, Math.floor((rj * 100) / maxR)),
    atb_monstro: Math.min(100, Math.floor((rm * 100) / maxR)),
    primeiro,
    proxima_ordem: ordem,
  }
}

export function estimarProbabilidadesCombate(
  jogador: {
    ataque: number
    defesa: number
    magia?: number
    velocidade?: number
    critico_por_mil?: number
    esquiva_por_mil?: number
  },
  monstro: {
    nivel: number
    tipo: string
    ataque: number
    defesa: number
    velocidade?: number
    esquiva_por_mil?: number
  },
): EstimativaCombate {
  const velJ = jogador.velocidade ?? 5
  const velM =
    monstro.velocidade ??
    3 + Math.floor((monstro.nivel * 4) / 5) + (monstro.tipo === 'chefe' ? 4 : monstro.tipo === 'raro' ? 2 : 0)
  const critJ = calcularChanceCriticaDinamica(jogador.critico_por_mil ?? 50, jogador.ataque, monstro.defesa, velJ, velM)
  const esqJ = calcularChanceEsquivaDinamica(jogador.esquiva_por_mil ?? 0, velJ, velM)
  const esqM = calcularChanceEsquivaDinamica(monstro.esquiva_por_mil ?? 0, velM, velJ)
  const bloqJ = calcularChanceBloqueioDinamica(jogador.defesa, monstro.ataque)
  const resJ = calcularResistenciaElementalPorMil(jogador.defesa, jogador.magia ?? 0)
  const porMilParaPct = (v: number) => Math.round(v / 10)
  return {
    criticoJogadorPct: porMilParaPct(critJ),
    esquivaJogadorPct: porMilParaPct(esqJ),
    esquivaMonstroPct: porMilParaPct(esqM),
    bloqueioJogadorPct: porMilParaPct(bloqJ),
    resistenciaJogadorPct: porMilParaPct(resJ),
    atb: calcularIniciativaATB(velJ, velM),
  }
}
