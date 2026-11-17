// client/src/lib/hud.ts
// Regras puras do HUD da Navbar (XP, Vitalidade e Mana em todas as páginas): a Mana que
// recarrega na tela entre uma busca e outra, e os avisos que sobem da pílula quando um
// valor muda.

const MS_POR_DIA = 24 * 60 * 60 * 1000

export function taxaRegenEfetiva(baseRegen: number, hp: number, limiar = 80, bonusMax = 0.25): number {
  if (hp <= limiar || limiar >= 100) return baseRegen
  const fracao = Math.min(1, Math.max(0, (hp - limiar) / (100 - limiar)))
  return baseRegen * (1 + bonusMax * fracao)
}

/**
 * Mana mostrada agora, a partir da lida no servidor: soma a recarga desde a busca, na
 * mesma regra do banco (mana_atual, sql/041 e sql/048: contínua, acelerada por HP alto, até o máximo).
 * Devolve número fracionário; a tela mostra a parte inteira.
 */
export function manaNaTela(mana: number, maximo: number, regenDia: number, buscadoEm: number, agora: number): number {
  if (!Number.isFinite(mana)) return 0
  if (mana >= maximo || regenDia <= 0) return Math.min(mana, maximo)
  const decorrido = Math.max(0, agora - buscadoEm)
  return Math.min(maximo, mana + (decorrido / MS_POR_DIA) * regenDia)
}

/** Quanto falta, em minutos, para a Mana encher. 0 quando já está cheia. */
export function minutosParaManaCheia(mana: number, maximo: number, regenDia: number): number {
  if (mana >= maximo || regenDia <= 0) return 0
  // Multiplica antes de dividir e desconta o resíduo do ponto flutuante (1/20·24·60 daria 72,000…01).
  return Math.ceil(((maximo - mana) * 24 * 60) / regenDia - 1e-9)
}

/** "em 45 min", "em 2 h", "em 1 dia". */
export function textoDoTempo(minutos: number): string {
  if (minutos <= 0) return 'agora'
  if (minutos < 60) return `em ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `em ${horas} h`
  const dias = Math.round(horas / 24)
  return dias === 1 ? 'em 1 dia' : `em ${dias} dias`
}

export interface FotoDoJogador {
  xp: number
  nivel: number
  rank?: string
  hp: number | null
  mp: number | null
  cristais?: number | null
  ouro?: number | null
  ultimoEstornoMissaoEm?: string | null
}

export type TipoDeAviso = 'xp' | 'xp_perdido' | 'nivel' | 'rank_queda' | 'hp' | 'mp' | 'cristal' | 'ouro'

export interface AvisoDoHud {
  tipo: TipoDeAviso
  texto: string
}

const ORDEM_DO_RANK: Record<string, number> = {
  F: 0,
  E: 1,
  D: 2,
  C: 3,
  B: 4,
  A: 5,
  S: 6,
  SS: 7,
}

export function ordemDoRank(rank?: string): number {
  if (!rank) return -1
  return ORDEM_DO_RANK[rank.toUpperCase()] ?? -1
}

/**
 * Os avisos que uma mudança merece. A primeira leitura não gera aviso (não houve ganho,
 * só carregou). A Mana só avisa quando cai, porque a recarga natural mostraria "+1 MP"
 * o tempo todo. Cristais e Ouro mostram qualquer ganho ou gasto.
 */
export function avisosDaMudanca(antes: FotoDoJogador | null, depois: FotoDoJogador): AvisoDoHud[] {
  if (!antes) return []
  const avisos: AvisoDoHud[] = []
  const xp = depois.xp - antes.xp
  if (xp > 0) {
    avisos.push({ tipo: 'xp', texto: `+${xp} XP` })
  } else if (xp < 0) {
    const foiMissao = Boolean(depois.ultimoEstornoMissaoEm && depois.ultimoEstornoMissaoEm !== antes.ultimoEstornoMissaoEm)
    avisos.push({
      tipo: 'xp_perdido',
      texto: foiMissao ? `−${Math.abs(xp)} XP: missão desfeita` : `−${Math.abs(xp)} XP`,
    })
  }
  if (depois.nivel > antes.nivel) avisos.push({ tipo: 'nivel', texto: `Nível ${depois.nivel}!` })
  if (antes.rank && depois.rank && ordemDoRank(depois.rank) >= 0 && ordemDoRank(antes.rank) > ordemDoRank(depois.rank)) {
    avisos.push({ tipo: 'rank_queda', texto: `você voltou ao rank ${depois.rank}` })
  }
  if (antes.hp !== null && depois.hp !== null && depois.hp !== antes.hp) {
    const hp = depois.hp - antes.hp
    avisos.push({ tipo: 'hp', texto: `${hp > 0 ? '+' : '−'}${Math.abs(hp)} HP` })
  }
  if (antes.mp !== null && depois.mp !== null && depois.mp < antes.mp) {
    avisos.push({ tipo: 'mp', texto: `−${antes.mp - depois.mp} MP` })
  }
  if (
    antes.cristais !== undefined &&
    antes.cristais !== null &&
    depois.cristais !== undefined &&
    depois.cristais !== null &&
    depois.cristais !== antes.cristais
  ) {
    const diff = depois.cristais - antes.cristais
    avisos.push({ tipo: 'cristal', texto: `${diff > 0 ? '+' : '−'}${Math.abs(diff)} ₳` })
  }
  if (typeof antes.ouro === 'number' && typeof depois.ouro === 'number' && depois.ouro !== antes.ouro) {
    const diff = depois.ouro - antes.ouro
    avisos.push({ tipo: 'ouro', texto: `${diff > 0 ? '+' : '−'}${Math.abs(diff)} de Ouro` })
  }
  return avisos
}

/** Evento que a tela dispara quando uma ação do RPG muda o Ouro; a barra do topo relê o resumo. */
export const EVENTO_OURO = 'anideck:ouro-atualizado'

export function avisarOuroMudou(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_OURO))
}
