// client/src/hooks/useMissoesHoje.ts
// Hook das missões: as 3 do dia e as 3 longas da semana, com resgate de AniCoins e XP.
import { useCallback, useEffect, useState } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import { useToast } from '../contexts/ToastContext'
import { useCelebracao } from '../contexts/CelebracaoContext'
import { chaveDoUsuario } from '../lib/cacheDeTela'
import { marcarRecompensaContextual } from '../lib/recompensaEvento'
import { VALIDADE_NA_MONTAGEM, buscarUmaVez } from '../lib/buscaCompartilhada'

export interface MissaoDiariaItem {
  id: string
  titulo: string
  descricao: string
  tipo: string
  meta: number
  progresso: number
  progresso_atual?: number
  recompensa_cristais: number
  recompensa_anicoins?: number
  /** XP da missão; 0 nas missões sociais e quando a gamificação está pausada. */
  recompensa_xp: number
  periodo: 'dia' | 'semana'
  concluida: boolean
  resgatada: boolean
  icone: string
}

export interface ResumoMissoesHoje {
  data: string
  concluidas: number
  total: number
  todas_resgatadas: boolean
  missoes: MissaoDiariaItem[]
  longas: MissaoDiariaItem[]
  genero_do_dia: string
  genero_da_semana: string
  /** Instante em que as missões da semana trocam (segunda 00:00 de Brasília). */
  longas_terminam_em: string
}

/** Normaliza uma lista de missões; campos ausentes viram valores seguros para a tela. */
export function normalizarMissoes(bruto: unknown, periodo: 'dia' | 'semana'): MissaoDiariaItem[] {
  const lista = Array.isArray(bruto) ? (bruto as Record<string, unknown>[]) : []
  return lista.map((m) => {
    const meta = typeof m.meta === 'number' && m.meta > 0 ? m.meta : Number(m.meta) || 1
    const prog = typeof m.progresso === 'number'
      ? m.progresso
      : typeof m.progresso_atual === 'number'
      ? m.progresso_atual
      : Number(m.progresso ?? m.progresso_atual) || 0
    const recompensa = typeof m.recompensa_cristais === 'number'
      ? m.recompensa_cristais
      : typeof m.recompensa_anicoins === 'number'
      ? m.recompensa_anicoins
      : Number(m.recompensa_cristais ?? m.recompensa_anicoins) || 15
    return {
      id: String(m.id || ''),
      titulo: String(m.titulo || (periodo === 'dia' ? 'Missão Diária' : 'Missão da Semana')),
      descricao: String(m.descricao || ''),
      tipo: String(m.tipo || ''),
      meta,
      progresso: prog,
      progresso_atual: prog,
      recompensa_cristais: recompensa,
      recompensa_anicoins: recompensa,
      recompensa_xp: Number(m.recompensa_xp) || 0,
      periodo: m.periodo === 'semana' || m.periodo === 'dia' ? m.periodo : periodo,
      concluida: Boolean(m.concluida || prog >= meta),
      resgatada: Boolean(m.resgatada),
      icone: String(m.icone || 'Sparkles'),
    }
  })
}

/** Busca e normaliza as missões do dia e da semana. Devolve null quando o servidor recusa. */
async function buscarMissoesDeHoje(token: string): Promise<ResumoMissoesHoje | null> {
  const res = await fetch('/api/missoes/hoje', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const json = await res.json()
  const missoesNormalizadas = normalizarMissoes(json.missoes, 'dia')
  const concluidasCount = typeof json.concluidas === 'number'
    ? json.concluidas
    : missoesNormalizadas.filter(m => m.concluida).length

  return {
    data: String(json.data || ''),
    total: typeof json.total === 'number' ? json.total : missoesNormalizadas.length,
    concluidas: concluidasCount,
    todas_resgatadas: Boolean(
      json.todas_resgatadas ||
      (missoesNormalizadas.length > 0 && missoesNormalizadas.every(m => m.resgatada))
    ),
    missoes: missoesNormalizadas,
    longas: normalizarMissoes(json.longas, 'semana'),
    genero_do_dia: String(json.genero_do_dia || ''),
    genero_da_semana: String(json.genero_da_semana || ''),
    longas_terminam_em: String(json.longas_terminam_em || ''),
  }
}

export function useMissoesHoje() {
  const { session } = useSessao()
  const token = session?.access_token
  const { showToast } = useToast()
  const { celebrar } = useCelebracao()
  const chave = chaveDoUsuario(session?.user.id, 'missoes:hoje')

  const [dados, setDados] = useState<ResumoMissoesHoje | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [resgatandoId, setResgatandoId] = useState<string | null>(null)

  // validadeMs acima de zero aceita a resposta que outro componente acabou de receber: o
  // painel do Início e o cartão de missões montam juntos e pediam a mesma lista duas vezes.
  const carregar = useCallback(async (validadeMs = 0) => {
    if (!token || !chave) {
      setCarregando(false)
      return
    }
    try {
      const resumo = await buscarUmaVez(chave, () => buscarMissoesDeHoje(token), validadeMs)
      if (resumo) setDados(resumo)
    } catch {
      // Silencioso em caso de erro de rede
    } finally {
      setCarregando(false)
    }
  }, [token, chave])

  useEffect(() => {
    carregar(VALIDADE_NA_MONTAGEM)
    // Atualiza o progresso quando um episódio é marcado, a comunidade muda ou uma missão é
    // resgatada (o resgate avisa pela carteira; assim o contador do painel acompanha o cartão).
    const recarregar = () => { carregar() }
    window.addEventListener('anideck:episodio-atualizado', recarregar)
    window.addEventListener('anideck:comunidade-atualizada', recarregar)
    window.addEventListener('anideck:cristais-atualizados', recarregar)
    return () => {
      window.removeEventListener('anideck:episodio-atualizado', recarregar)
      window.removeEventListener('anideck:comunidade-atualizada', recarregar)
      window.removeEventListener('anideck:cristais-atualizados', recarregar)
    }
  }, [carregar])

  const recarregar = useCallback(() => carregar(), [carregar])

  const resgatar = useCallback(async (id: string) => {
    if (!token || resgatandoId) return
    setResgatandoId(id)
    try {
      const missaoAtual = [...(dados?.missoes ?? []), ...(dados?.longas ?? [])].find((m) => m.id === id)
      const res = await fetch(`/api/missoes/${id}/resgatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || 'Falha ao resgatar missão')
      }
      const anicoins = Number(json.recompensa) || missaoAtual?.recompensa_cristais || 15
      const xp = Number(json.xp) || 0
      marcarRecompensaContextual()
      celebrar({
        tipo: 'missao',
        titulo: missaoAtual?.titulo ?? 'Missão Concluída!',
        subtitulo: missaoAtual?.periodo === 'semana' ? 'Missão Semanal' : 'Missão Diária',
        recompensas: {
          anicoins,
          xp,
        },
      })
      // Notifica carteira para atualizar saldo instantaneamente
      window.dispatchEvent(new CustomEvent('anideck:cristais-atualizados'))
      // XP muda nível e rank: o HUD e a Guilda recarregam pelo mesmo aviso do episódio marcado.
      if (xp > 0) window.dispatchEvent(new CustomEvent('anideck:episodio-atualizado'))
      await carregar()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Falha ao resgatar missão', 'error')
    } finally {
      setResgatandoId(null)
    }
  }, [token, resgatandoId, dados, celebrar, showToast, carregar])

  return {
    dados,
    missoes: dados?.missoes ?? [],
    longas: dados?.longas ?? [],
    concluidas: dados?.concluidas ?? 0,
    total: dados?.total ?? 3,
    todasResgatadas: dados?.todas_resgatadas ?? false,
    carregando,
    resgatandoId,
    recarregar,
    resgatar,
  }
}
