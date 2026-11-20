// client/src/hooks/useSalvarNoDeck.ts
// Quais animes já estão no Deck e como pôr (ou tirar) um, com o mesmo aviso do Descobrir.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { invalidarCachesDoDeck } from '../lib/cacheDeTela'
import { useToast } from '../contexts/ToastContext'

export function useSalvarNoDeck() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [salvos, setSalvos] = useState<Map<number, string>>(new Map())
  const [salvando, setSalvando] = useState<number[]>([])

  useEffect(() => {
    let ativo = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await fetch('/api/entries', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (!res.ok || !ativo) return
        const entradas = (await res.json()) as { mal_id: number; id: string }[] | null
        if (ativo && entradas) setSalvos(new Map(entradas.map((e) => [e.mal_id, e.id])))
      } catch {
        // Sem a lista, os botões começam como "+": o servidor recusa duplicata.
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  const alternar = useCallback(
    async (malId: number, podeRemover = true) => {
      if (salvando.includes(malId)) return
      const id = salvos.get(malId)
      if (id && !podeRemover) {
        showToast('Este anime já está no seu Deck.')
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }
      setSalvando((s) => [...s, malId])
      try {
        if (id) {
          const res = await fetch(`/api/entries/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
          if (!res.ok) throw new Error()
          setSalvos((m) => {
            const n = new Map(m)
            n.delete(malId)
            return n
          })
          showToast('Removido do Deck', 'success')
        } else {
          const res = await fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ mal_id: malId, tipo: 'anime', status: 'Quero Assistir' }),
          })
          if (!res.ok) throw new Error()
          const nova = await res.json()
          const novoId = String(nova?.id ?? nova?.[0]?.id ?? '')
          setSalvos((m) => new Map(m).set(malId, novoId))
          showToast('Anime salvo no seu Deck!', 'success')
        }
        invalidarCachesDoDeck(session.user.id)
      } catch {
        showToast('Erro ao processar. Tente novamente.', 'error')
      } finally {
        setSalvando((s) => s.filter((x) => x !== malId))
      }
    },
    [salvando, salvos, navigate, showToast],
  )

  return { estaSalvo: (malId: number) => salvos.has(malId), estaSalvando: (malId: number) => salvando.includes(malId), alternar }
}
