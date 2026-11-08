// client/src/lib/guilda.ts
// Tipos e mapeamentos visuais estáticos da Guilda (Rank F → SS e cartas de Insígnias).
// Todos os nomes de classes do Tailwind aparecem por extenso aqui para o scanner gerar
// as regras CSS (Armadilha 17 do PITFALLS.md).

import { gradienteDoCard } from './deckHelpers'

export interface StatusNivelGuilda {
  nivel: number
  xp_total: number
  xp_no_nivel: number
  xp_para_proximo: number
  progresso_pct: number
  rank: string
  titulo_rank: string
  proximo_rank?: string
  nivel_proximo_rank?: number
  xp_hoje: number
  teto_diario: number
  streak_atual: number
  maior_streak: number
  gamificacao_ativa: boolean
  peso_maximo_voto: number
}

export interface EconomiaGuilda {
  ativo: boolean
  xp_base_episodio: number
  bonus_cedo: number
  fator_3_a_5: number
  fator_6_mais: number
  teto_diario: number
  evento_inicio: string
  evento_fim: string
  evento_multiplicador: number
}

export interface FaixaRank {
  rank: string
  titulo: string
  nivel_minimo: number
}

export interface EspecialistaGenero {
  genero: string
  total_vistos: number
  nivel: number
  rotulo_nivel: string
  titulo_nivel: string
  peso_voto: number
  proximo_alvo: number
  progresso_pct: number
}

export interface InsigniaStatus {
  id: string
  icone: string
  nome: string
  descricao: string
  regra: string
  estilo: string
  desbloqueada: boolean
  progresso_atual: number
  meta: number
}

export interface ItemLedgerGuilda {
  mal_id: number
  titulo_anime: string
  episode_number: number
  xp_earned: number
  reason: string
  earned_at: string
  de_hoje: boolean
}

export interface DadosDaGuilda {
  status: StatusNivelGuilda
  economia: EconomiaGuilda
  ranks: FaixaRank[]
  extrato: ItemLedgerGuilda[]
  especialistas: EspecialistaGenero[]
  insignias: InsigniaStatus[]
}

export interface EstiloVisualRank {
  seloBg: string
  seloTexto: string
  bordaPilula: string
  fundoPilula: string
  corBarra: string
}

const ESTILOS_POR_RANK: Record<string, EstiloVisualRank> = {
  F: {
    seloBg: 'bg-panel-2 border border-line',
    seloTexto: 'text-muted',
    bordaPilula: 'border-line',
    fundoPilula: 'bg-panel/90',
    corBarra: 'bg-muted',
  },
  E: {
    seloBg: 'bg-holo-3/20 border border-holo-3/40',
    seloTexto: 'text-holo-3',
    bordaPilula: 'border-holo-3/35',
    fundoPilula: 'bg-holo-3/10',
    corBarra: 'bg-holo-3',
  },
  D: {
    seloBg: 'bg-holo-3 text-void',
    seloTexto: 'text-holo-3',
    bordaPilula: 'border-holo-3/45',
    fundoPilula: 'bg-holo-3/12',
    corBarra: 'bg-holo-3',
  },
  C: {
    seloBg: 'bg-gradient-to-br from-holo-2 to-holo-3 text-void',
    seloTexto: 'text-holo-2',
    bordaPilula: 'border-holo-2/50',
    fundoPilula: 'bg-holo-2/15',
    corBarra: 'bg-gradient-to-r from-holo-2 to-holo-3',
  },
  B: {
    seloBg: 'bg-green text-void',
    seloTexto: 'text-green',
    bordaPilula: 'border-green/45',
    fundoPilula: 'bg-green/12',
    corBarra: 'bg-green',
  },
  A: {
    seloBg: 'bg-gradient-to-br from-holo-1 to-holo-2 text-void',
    seloTexto: 'text-holo-1',
    bordaPilula: 'border-holo-1/50',
    fundoPilula: 'bg-holo-1/15',
    corBarra: 'bg-gradient-to-r from-holo-1 to-holo-2',
  },
  S: {
    seloBg: 'bg-gold text-void',
    seloTexto: 'text-gold',
    bordaPilula: 'border-gold/50',
    fundoPilula: 'bg-gold/15',
    corBarra: 'bg-gold',
  },
  SS: {
    seloBg: 'bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-void',
    seloTexto: 'text-holo',
    bordaPilula: 'border-holo-1/60',
    fundoPilula: 'bg-holo-2/20',
    corBarra: 'bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3',
  },
}

export function obterEstiloRank(rank: string | undefined): EstiloVisualRank {
  const chave = (rank || 'F').toUpperCase()
  return ESTILOS_POR_RANK[chave] || ESTILOS_POR_RANK.F
}

export function obterClasseCartaInsignia(insignia: InsigniaStatus, indice: number): string {
  if (!insignia.desbloqueada) {
    return 'bg-panel-2 border-line text-muted-2 opacity-75'
  }
  if (insignia.estilo === 'foil2') {
    return `${gradienteDoCard(indice + 1)} border-gold/50 text-white shadow-[0_0_24px_rgba(255,197,66,0.16)]`
  }
  return `${gradienteDoCard(indice)} border-holo-2/60 text-white shadow-[0_0_24px_rgba(123,92,255,0.20)]`
}

export function ehMotivoReduzido(reason: string): boolean {
  const texto = reason.toLowerCase()
  return texto.includes('decrescente') || texto.includes('teto') || texto.includes('pausada')
}
