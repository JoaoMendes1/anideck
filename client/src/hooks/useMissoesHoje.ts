// client/src/hooks/useMissoesHoje.ts
// Hook para buscar e resgatar as 3 missões diárias do jogador (Fase 16, #168).
import { useCallback, useEffect, useState } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import { useToast } from '../contexts/ToastContext'

export interface MissaoDiariaItem {
  id: string
  titulo: string
  descricao: string
  tipo: string
  meta: number
  progresso: number
  recompensa_cristais: number
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
}

export function useMissoesHoje() {
  const { session } = useSessao()
  const token = session?.access_token
  const { showToast } = useToast()

  const [dados, setDados] = useState<ResumoMissoesHoje | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [resgatandoId, setResgatandoId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!token) {
      setCarregando(false)
      return
    }
    try {
      const res = await fetch('/api/missoes/hoje', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = (await res.json()) as ResumoMissoesHoje
        setDados(json)
      }
    } catch {
      // Silencioso em caso de erro de rede
    } finally {
      setCarregando(false)
    }
  }, [token])

  useEffect(() => {
    carregar()
    // Atualiza o progresso das missões quando um episódio é marcado ou a comunidade muda
    const recarregar = () => { carregar() }
    window.addEventListener('anideck:episodio-atualizado', recarregar)
    window.addEventListener('anideck:comunidade-atualizada', recarregar)
    return () => {
      window.removeEventListener('anideck:episodio-atualizado', recarregar)
      window.removeEventListener('anideck:comunidade-atualizada', recarregar)
    }
  }, [carregar])

  const resgatar = useCallback(async (id: string) => {
    if (!token || resgatandoId) return
    setResgatandoId(id)
    try {
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
      showToast(json.mensagem || `+${json.recompensa || 15} ₳ resgatados com sucesso!`, 'success')
      // Notifica carteira para atualizar saldo instantaneamente
      window.dispatchEvent(new CustomEvent('anideck:cristais-atualizados'))
      await carregar()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Falha ao resgatar missão', 'error')
    } finally {
      setResgatandoId(null)
    }
  }, [token, resgatandoId, showToast, carregar])

  return {
    dados,
    missoes: dados?.missoes ?? [],
    concluidas: dados?.concluidas ?? 0,
    total: dados?.total ?? 3,
    todasResgatadas: dados?.todas_resgatadas ?? false,
    carregando,
    resgatandoId,
    recarregar: carregar,
    resgatar,
  }
}
