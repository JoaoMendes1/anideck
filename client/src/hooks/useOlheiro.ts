import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export type SugestaoPendente = {
  id: number
  mal_id: number
  titulo: string
  imagem_url: string
  motivo: string
  score: number
}

// Anime que existe no deck de alguém e não no catálogo curado.
//
// Vem de uma RPC que lê media_entries na hora, sem fila e sem scan: o que a
// aba mostra é sempre o estado atual. Gravar isso em curation_suggestions
// exigiria limpar a linha quando o anime fosse curado por outro caminho.
export type DemandaCuradoria = {
  mal_id: number
  titulo: string
  total_usuarios: number
  tem_admin: boolean
  usuarios: string[]
  ultimo_add: string
}

// Concentra a comunicação com a API do Olheiro num lugar só, para o componente
// cuidar apenas de desenhar. Mesmo padrão dos outros hooks do projeto.
export function useOlheiro() {
  const [sugestoes, setSugestoes] = useState<SugestaoPendente[]>([])
  const [demanda, setDemanda] = useState<DemandaCuradoria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscarToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? ''
  }

  // As duas listas são independentes e vão em paralelo: a demanda falhando não
  // pode esconder as sugestões, e vice-versa.
  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const token = await buscarToken()
      const cabecalho = { Authorization: `Bearer ${token}` }

      const [s, d] = await Promise.allSettled([
        fetch('/api/admin/olheiro/sugestoes', { headers: cabecalho }),
        fetch('/api/admin/olheiro/demanda', { headers: cabecalho }),
      ])

      if (s.status === 'fulfilled' && s.value.ok) {
        setSugestoes(await s.value.json())
      } else {
        setErro('Falha ao carregar sugestões')
      }

      if (d.status === 'fulfilled' && d.value.ok) {
        const lista = await d.value.json()
        setDemanda(Array.isArray(lista) ? lista : [])
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setCarregando(false)
    }
  }, [])

  // Remove o card da tela na hora e só depois confirma no servidor. Se falhar,
  // recarrega a lista e o item volta — evita a tela travada esperando resposta.
  const revisar = useCallback(
    async (id: number, status: 'curado' | 'dispensado') => {
      setSugestoes(atual => atual.filter(s => s.id !== id))
      try {
        const token = await buscarToken()
        const res = await fetch(`/api/admin/olheiro/sugestoes/${id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        })
        if (!res.ok) throw new Error()
      } catch {
        setErro('Não foi possível salvar. Recarregando...')
        carregar()
      }
    },
    [carregar]
  )

  // O scan leva alguns segundos (uma chamada à AniList por rótulo ativo), por
  // isso o estado próprio: o botão precisa mostrar que está trabalhando.
  const [buscando, setBuscando] = useState(false)

  // Tira o card da tela sem gravar nada no servidor. Usado pelo Curar: a
  // sugestão só vira 'curado' depois que o destaque for salvo de verdade —
  // assim, desistir no meio não queima o candidato para sempre.
  const remover = useCallback((id: number) => {
    setSugestoes(atual => atual.filter(s => s.id !== id))
  }, [])

  // A demanda não tem "dispensar": o anime está no deck de alguém, e sumir da
  // lista sem ser curado só esconderia o buraco. O card sai quando a curadoria
  // for salva, porque aí ele deixa de existir na RPC.
  const removerDaDemanda = useCallback((malID: number) => {
    setDemanda(atual => atual.filter(d => d.mal_id !== malID))
  }, [])

  const buscarNovas = useCallback(async () => {
    setBuscando(true)
    setErro(null)
    try {
      const token = await buscarToken()
      const res = await fetch('/api/admin/olheiro/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Falha ao buscar sugestões')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setBuscando(false)
    }
  }, [carregar])

  useEffect(() => {
    carregar()
  }, [carregar])

  return {
    sugestoes, demanda,
    carregando, erro,
    revisar, remover, removerDaDemanda,
    recarregar: carregar, buscarNovas, buscando,
  }
}