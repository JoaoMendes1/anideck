// client/src/hooks/useCarteira.ts
// Saldo de Cristais e extrato do usuário logado (Fase 16, #167).
import { useEffect, useState, useCallback } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import { chaveDoUsuario, guardarNaMemoria, lerDaMemoria } from '../lib/cacheDeTela'
import { buscarUmaVez } from '../lib/buscaCompartilhada'

export interface MovimentoCristal {
  id: string
  quantidade: number
  motivo: string
  referencia: string
  criado_em: string
}

export interface CarteiraData {
  saldo: number
  movimentos: MovimentoCristal[]
  total_movimentos: number
  limite: number
  offset: number
}

export function useCarteira() {
  const { session } = useSessao()
  const token = session?.access_token
  const chave = chaveDoUsuario(session?.user.id, 'economia:carteira')
  const [carteira, setCarteira] = useState<CarteiraData | null>(() => lerDaMemoria<CarteiraData>(chave) ?? null)
  const [carregando, setCarregando] = useState(!carteira)

  const recarregar = useCallback(async () => {
    if (!token || !chave) return
    try {
      // A pílula da Navbar e o painel da Início pedem a carteira ao mesmo tempo: um pedido só.
      const dados = await buscarUmaVez(chave, async () => {
        const res = await fetch('/api/economia/carteira', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as CarteiraData
      })
      guardarNaMemoria(chave, dados)
      setCarteira(dados)
    } catch {
      // Falha silenciosa
    } finally {
      setCarregando(false)
    }
  }, [token, chave])

  useEffect(() => {
    recarregar()
    const handleAtualizar = () => { recarregar() }
    window.addEventListener('anideck:cristais-atualizados', handleAtualizar)
    return () => {
      window.removeEventListener('anideck:cristais-atualizados', handleAtualizar)
    }
  }, [recarregar])

  return {
    saldo: carteira?.saldo ?? 0,
    movimentos: carteira?.movimentos ?? [],
    totalMovimentos: carteira?.total_movimentos ?? 0,
    carregando,
    recarregar,
  }
}
