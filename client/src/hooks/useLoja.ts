// client/src/hooks/useLoja.ts
// Hook para catálogo, compra e gerenciamento de cosméticos da Loja (Fase 16, #170 e #171).
import { useCallback, useEffect, useState } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import { useToast } from '../contexts/ToastContext'
import type { ItemCosmeticoLoja } from '../lib/cosmeticos'

export function useLoja() {
  const { session } = useSessao()
  const token = session?.access_token
  const { showToast } = useToast()

  const [itens, setItens] = useState<ItemCosmeticoLoja[]>([])
  const [carregando, setCarregando] = useState(true)
  const [comprandoId, setComprandoId] = useState<string | null>(null)
  const [devolvendoId, setDevolvendoId] = useState<string | null>(null)
  const [equipandoId, setEquipandoId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`

      const res = await fetch('/api/loja', { headers })
      if (res.ok) {
        const dados = await res.json()
        setItens(dados.itens || [])
      }
    } catch {
      // Falha silenciosa
    } finally {
      setCarregando(false)
    }
  }, [token])

  useEffect(() => {
    carregar()
  }, [carregar])

  const comprar = useCallback(
    async (id: string) => {
      if (!token) {
        showToast('Faça login para adquirir itens na loja.', 'error')
        return false
      }
      if (comprandoId) return false

      setComprandoId(id)
      try {
        const res = await fetch(`/api/loja/${id}/comprar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        const dados = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(dados.error || 'Erro ao processar compra')
        }

        showToast(`Item adquirido com sucesso!`, 'success')
        // Notifica atualização da carteira e da comunidade
        window.dispatchEvent(new CustomEvent('anideck:cristais-atualizados'))
        window.dispatchEvent(new CustomEvent('anideck:comunidade-atualizada'))
        await carregar()
        return true
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Falha na compra', 'error')
        return false
      } finally {
        setComprandoId(null)
      }
    },
    [token, comprandoId, showToast, carregar]
  )

  const equipar = useCallback(
    async (slot: string, itemID: string | null) => {
      if (!token) return false
      setEquipandoId(itemID || slot)
      try {
        const res = await fetch('/api/loja/equipar', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ slot, item_id: itemID }),
        })
        const dados = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(dados.error || 'Falha ao alterar item equipado')
        }

        showToast(itemID ? 'Item equipado com sucesso!' : 'Item desequipado.', 'success')
        window.dispatchEvent(new CustomEvent('anideck:comunidade-atualizada'))
        await carregar()
        return true
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Erro ao equipar item', 'error')
        return false
      } finally {
        setEquipandoId(null)
      }
    },
    [token, showToast, carregar]
  )

  const devolver = useCallback(
    async (id: string) => {
      if (!token) return false
      if (devolvendoId) return false

      setDevolvendoId(id)
      try {
        const res = await fetch(`/api/loja/${id}/devolver`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        const dados = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(dados.error || 'Falha ao devolver cosmético')
        }

        showToast(dados.mensagem || 'Cosmético devolvido com sucesso!', 'success')
        window.dispatchEvent(new CustomEvent('anideck:cristais-atualizados'))
        window.dispatchEvent(new CustomEvent('anideck:comunidade-atualizada'))
        await carregar()
        return true
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Falha na devolução', 'error')
        return false
      } finally {
        setDevolvendoId(null)
      }
    },
    [token, devolvendoId, showToast, carregar]
  )

  return {
    itens,
    carregando,
    comprandoId,
    devolvendoId,
    equipandoId,
    comprar,
    devolver,
    equipar,
    recarregar: carregar,
    temItem: (id: string) => itens.some(i => i.id === id && i.ja_possui),
  }
}
