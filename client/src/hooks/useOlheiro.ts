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

// Concentra a comunicação com a API do Olheiro num lugar só, para o componente
// cuidar apenas de desenhar. Mesmo padrão dos outros hooks do projeto.
export function useOlheiro() {
  const [sugestoes, setSugestoes] = useState<SugestaoPendente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscarToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? ''
  }

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const token = await buscarToken()
      const res = await fetch('/api/admin/olheiro/sugestoes', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Falha ao carregar sugestões')
      setSugestoes(await res.json())
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

  // O scan leva alguns segundos (uma chamada à AniList por tag desejada), por
  // isso o estado próprio: o botão precisa mostrar que está trabalhando.
  const [buscando, setBuscando] = useState(false)

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

    return { sugestoes, carregando, erro, revisar, recarregar: carregar, buscarNovas, buscando }
}