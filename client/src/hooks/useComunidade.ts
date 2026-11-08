// client/src/hooks/useComunidade.ts
// Perfil público, Mana e Vitalidade de quem está logado. Mesmo padrão do useResumoGuilda:
// memória de tela para não buscar de novo a cada troca de página, e recarga quando um
// episódio é marcado (a Vitalidade sobe) ou a comunidade muda (comentário gasta Mana).
import { useCallback, useEffect, useState } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import { chaveDoUsuario, guardarNaMemoria, lerDaMemoria } from '../lib/cacheDeTela'
import type { EstadoComunidade } from '../lib/comunidade'

export const EVENTO_COMUNIDADE = 'anideck:comunidade-atualizada'

/** Avisa as outras telas que perfil ou Mana mudaram, já com o estado novo quando houver. */
export function avisarComunidadeAtualizada(estado?: EstadoComunidade) {
  window.dispatchEvent(new CustomEvent(EVENTO_COMUNIDADE, { detail: estado }))
}

export function useComunidade() {
  const { session } = useSessao()
  const token = session?.access_token
  const chave = chaveDoUsuario(session?.user.id, 'comunidade:eu')
  const [estado, setEstado] = useState<EstadoComunidade | null>(() => lerDaMemoria<EstadoComunidade>(chave) ?? null)
  const [indisponivel, setIndisponivel] = useState(false)

  const recarregar = useCallback(async () => {
    if (!token || !chave) return
    try {
      const res = await fetch('/api/comunidade/eu', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        setIndisponivel(true)
        return
      }
      const dados = (await res.json()) as EstadoComunidade
      guardarNaMemoria(chave, dados)
      setEstado(dados)
      setIndisponivel(false)
    } catch {
      // Falha de rede: mantém o último estado em memória.
    }
  }, [token, chave])

  useEffect(() => {
    if (!token) return
    recarregar()

    const aoMudar = (ev: Event) => {
      const novo = (ev as CustomEvent<EstadoComunidade | undefined>).detail
      if (novo && chave) {
        guardarNaMemoria(chave, novo)
        setEstado(novo)
      } else {
        recarregar()
      }
    }
    window.addEventListener(EVENTO_COMUNIDADE, aoMudar)
    window.addEventListener('anideck:episodio-atualizado', recarregar)
    return () => {
      window.removeEventListener(EVENTO_COMUNIDADE, aoMudar)
      window.removeEventListener('anideck:episodio-atualizado', recarregar)
    }
  }, [token, chave, recarregar])

  return { estado: session ? estado : null, indisponivel, recarregar }
}
