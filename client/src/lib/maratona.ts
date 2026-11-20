// client/src/lib/maratona.ts
// Missão especial de maratona (regras no servidor, maratona.go e sql/133). Aqui ficam a
// leitura, o início, os formatos de tempo e a conta de "quanto falta para liberar o próximo
// episódio", que o aviso antes de marcar usa.
import { cabecalhoDeAutenticacao } from './rpg'

export interface FaixaMaratona {
  id: string
  nome: string
  ate_seg: number
  ouro: number
  bilhetes: number
}

export interface MaratonaRPG {
  mal_id: number
  total: number
  intervalo_seg: number
  faixas: FaixaMaratona[]
  iniciada_em: string
  ultimo_em: string | null
  episodios: number[]
  status: 'ativa' | 'concluida' | 'falhou'
  motivo: 'cedo' | 'tempo' | null
  faixa: string | null
  ouro: number
  bilhetes: number
  terminada_em: string | null
  prazo_em: string
  proximo_em: string
}

export interface RespostaMaratona {
  pode: boolean
  motivo?: string
  total: number
  duracao_min: number
  intervalo_seg: number
  faixas: FaixaMaratona[]
  maratona?: MaratonaRPG
  outra_ativa?: number
}

/** O que a marcação de episódio devolve sobre a maratona. */
export interface ResultadoMaratonaEpisodio {
  status: 'ativa' | 'concluida' | 'falhou'
  motivo?: string
  marcados: number
  total: number
  faixa?: string
  ouro?: number
  bilhetes?: number
}

// Última resposta por anime: o aviso antes de marcar lê daqui, sem nova consulta.
const ultimas = new Map<number, RespostaMaratona>()

async function pedir(malId: number, metodo: 'GET' | 'POST'): Promise<{ dados?: RespostaMaratona; erro?: string }> {
  try {
    const res = await fetch(`/api/maratona/${malId}`, { method: metodo, headers: await cabecalhoDeAutenticacao() })
    const corpo = await res.json().catch(() => ({}))
    if (!res.ok) return { erro: (corpo as { error?: string }).error ?? 'Maratona indisponível agora.' }
    ultimas.set(malId, corpo as RespostaMaratona)
    return { dados: corpo as RespostaMaratona }
  } catch {
    return { erro: 'Maratona indisponível agora.' }
  }
}

export const obterMaratona = (malId: number) => pedir(malId, 'GET')
export const iniciarMaratona = (malId: number) => pedir(malId, 'POST')

/** Segundos até o episódio poder ser marcado sem perder a maratona; 0 quando já pode. */
export function segundosParaLiberar(malId: number, episodio: number, agora = Date.now()): number {
  const m = ultimas.get(malId)?.maratona
  if (!m || m.status !== 'ativa' || m.episodios.includes(episodio)) return 0
  return Math.max(0, Math.ceil((Date.parse(m.proximo_em) - agora) / 1000))
}

/** "7h12", "45 min" ou "50 s". */
export function formatarDuracao(seg: number): string {
  const s = Math.max(0, Math.round(seg))
  if (s < 60) return `${s} s`
  const h = Math.floor(s / 3600)
  const min = Math.floor((s % 3600) / 60)
  if (h === 0) return `${min} min`
  return `${h}h${String(min).padStart(2, '0')}`
}

/** Cronômetro "HH:MM:SS". */
export function cronometro(seg: number): string {
  const s = Math.max(0, Math.floor(seg))
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':')
}

/** A faixa valendo agora: a primeira cujo limite ainda não passou. */
export function faixaAtual(faixas: FaixaMaratona[], decorridoSeg: number): FaixaMaratona | undefined {
  return faixas.find((f) => f.ate_seg >= decorridoSeg)
}

/**
 * Anota no cache a marcação que o servidor aceitou, para o aviso valer já na marcação seguinte,
 * antes de o card recarregar.
 */
export function anotarMarcacao(malId: number, episodio: number, r: ResultadoMaratonaEpisodio | null | undefined, agora = Date.now()) {
  const resp = ultimas.get(malId)
  const m = resp?.maratona
  if (!r || !m || m.status !== 'ativa') return
  if (r.status !== 'ativa') {
    ultimas.set(malId, { ...resp, maratona: { ...m, status: r.status } })
    return
  }
  ultimas.set(malId, {
    ...resp,
    maratona: {
      ...m,
      episodios: m.episodios.includes(episodio) ? m.episodios : [...m.episodios, episodio],
      ultimo_em: new Date(agora).toISOString(),
      proximo_em: new Date(agora + m.intervalo_seg * 1000).toISOString(),
    },
  })
}

/** Aviso curto para a marcação de episódio, ou vazio quando não há o que dizer. */
export function mensagemDaMaratona(r: ResultadoMaratonaEpisodio | null | undefined): { texto: string; tipo: 'success' | 'error' } | null {
  if (!r) return null
  if (r.status === 'concluida') return { texto: `Maratona concluída! +${r.ouro ?? 0} Ouro e +${r.bilhetes ?? 0} bilhetes.`, tipo: 'success' }
  if (r.status === 'falhou') {
    return {
      texto: r.motivo === 'cedo' ? 'Maratona perdida: o episódio foi marcado antes do tempo mínimo.' : 'Maratona perdida: passaram as 24 horas.',
      tipo: 'error',
    }
  }
  return null
}
