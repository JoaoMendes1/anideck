// client/src/hooks/useCartas.ts
// Hook para listar cartas colecionadas, personagens favoritos e duelo de gosto (Fase 16).
import { useCallback, useEffect, useState } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import { useToast } from '../contexts/ToastContext'
import type { CartaColecao, PersonagemFavorito, DueloResultado } from '../lib/cartas'

export function useCartas() {
  const { session } = useSessao()
  const token = session?.access_token
  const { showToast } = useToast()

  const [cartas, setCartas] = useState<CartaColecao[]>([])
  const [favoritos, setFavoritos] = useState<PersonagemFavorito[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    if (!token) {
      setCartas([])
      setFavoritos([])
      setCarregando(false)
      return
    }

    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [resCartas, resFav] = await Promise.all([
        fetch('/api/cartas', { headers }),
        fetch('/api/personagens-favoritos', { headers }),
      ])

      if (resCartas.ok) {
        const dados = await resCartas.json()
        setCartas(dados.cartas || [])
      }

      if (resFav.ok) {
        const dadosFav = await resFav.json()
        setFavoritos(dadosFav.personagens || [])
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

  const alternarFavorito = useCallback(
    async (char: { character_id: number; mal_id: number; nome: string; imagem_url: string; papel?: string }) => {
      if (!token) {
        showToast('Faça login para favoritar personagens.', 'error')
        return false
      }

      const existe = favoritos.some((f) => f.character_id === char.character_id)

      if (existe) {
        try {
          const res = await fetch(`/api/personagens-favoritos/${char.character_id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            setFavoritos((prev) => prev.filter((f) => f.character_id !== char.character_id))
            showToast(`${char.nome} removido dos favoritos.`, 'success')
            return true
          }
        } catch {
          showToast('Erro ao remover favorito.', 'error')
        }
      } else {
        try {
          const res = await fetch('/api/personagens-favoritos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              character_id: char.character_id,
              mal_id: char.mal_id,
              nome: char.nome,
              imagem_url: char.imagem_url,
              papel: char.papel || 'Main',
            }),
          })
          if (res.ok) {
            setFavoritos((prev) => [
              {
                id: String(char.character_id),
                character_id: char.character_id,
                mal_id: char.mal_id,
                nome: char.nome,
                imagem_url: char.imagem_url,
                papel: char.papel || 'Main',
                criado_em: new Date().toISOString(),
              },
              ...prev,
            ])
            showToast(`${char.nome} adicionado aos favoritos!`, 'success')
            return true
          } else {
            const txt = await res.text()
            showToast(txt || 'Não foi possível favoritar (limite de 50).', 'error')
          }
        } catch {
          showToast('Erro ao favoritar personagem.', 'error')
        }
      }
      return false
    },
    [token, favoritos, showToast]
  )

  const ehFavorito = useCallback(
    (characterId: number) => favoritos.some((f) => f.character_id === characterId),
    [favoritos]
  )

  return {
    cartas,
    favoritos,
    carregando,
    recarregar: carregar,
    alternarFavorito,
    ehFavorito,
  }
}

export async function buscarDuelo(handleA: string, handleB: string): Promise<DueloResultado | null> {
  try {
    const res = await fetch(`/api/membros/${encodeURIComponent(handleA)}/duelo/${encodeURIComponent(handleB)}`)
    if (!res.ok) return null
    return (await res.json()) as DueloResultado
  } catch {
    return null
  }
}
