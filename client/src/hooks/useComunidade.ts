// client/src/hooks/useComunidade.ts
// Perfil público, Mana e Vitalidade de quem está logado. Mesmo padrão do useResumoGuilda:
// memória de tela para não buscar de novo a cada troca de página, e recarga quando um
// episódio é marcado (a Vitalidade sobe) ou a comunidade muda (comentário gasta Mana).
//
// A Mana devolvida já soma a recarga desde a última busca e anda sozinha na tela, na
// mesma regra do banco: assim a pílula da Navbar, a Guilda e o campo de comentário
// mostram o mesmo número sem perguntar ao servidor a cada minuto.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import { chaveDoUsuario, guardarNaMemoria, lerDaMemoria } from '../lib/cacheDeTela'
import { buscarUmaVez } from '../lib/buscaCompartilhada'
import { manaNaTela } from '../lib/hud'
import type { EstadoComunidade } from '../lib/comunidade'

export const EVENTO_COMUNIDADE = 'anideck:comunidade-atualizada'

// Intervalo da recarga na tela: 20 de Mana por dia é 1 a cada 72 minutos, então meio
// minuto de atraso não aparece.
const TIQUE_DA_MANA = 30_000

interface Guardado {
  estado: EstadoComunidade
  em: number
}

/** Avisa as outras telas que perfil ou Mana mudaram, já com o estado novo quando houver. */
export function avisarComunidadeAtualizada(estado?: EstadoComunidade) {
  window.dispatchEvent(new CustomEvent(EVENTO_COMUNIDADE, { detail: estado }))
}

class ErroDaApi extends Error {}

export function useComunidade() {
  const { session } = useSessao()
  const token = session?.access_token
  const chave = chaveDoUsuario(session?.user.id, 'comunidade:eu')
  const [guardado, setGuardado] = useState<Guardado | null>(() => lerDaMemoria<Guardado>(chave) ?? null)
  const [indisponivel, setIndisponivel] = useState(false)
  const [agora, setAgora] = useState(() => Date.now())

  const aplicar = useCallback(
    (estado: EstadoComunidade) => {
      const novo = { estado, em: Date.now() }
      guardarNaMemoria(chave, novo)
      setGuardado(novo)
      setAgora(novo.em)
    },
    [chave]
  )

  const recarregar = useCallback(async () => {
    if (!token || !chave) return
    try {
      const dados = await buscarUmaVez(chave, async () => {
        const res = await fetch('/api/comunidade/eu', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new ErroDaApi(`HTTP ${res.status}`)
        return (await res.json()) as EstadoComunidade
      })
      aplicar(dados)
      setIndisponivel(false)
    } catch (e) {
      // Resposta de erro da API: a comunidade está fora (sql/041 ausente, por exemplo).
      // Falha de rede: mantém o último estado em memória.
      if (e instanceof ErroDaApi) setIndisponivel(true)
    }
  }, [token, chave, aplicar])

  useEffect(() => {
    if (!token) return
    recarregar()

    const aoMudar = (ev: Event) => {
      const novo = (ev as CustomEvent<EstadoComunidade | undefined>).detail
      if (novo) aplicar(novo)
      else recarregar()
    }
    window.addEventListener(EVENTO_COMUNIDADE, aoMudar)
    window.addEventListener('anideck:episodio-atualizado', recarregar)
    return () => {
      window.removeEventListener(EVENTO_COMUNIDADE, aoMudar)
      window.removeEventListener('anideck:episodio-atualizado', recarregar)
    }
  }, [token, recarregar, aplicar])

  const manaCheia = !guardado || guardado.estado.mana >= guardado.estado.regras.mp_max
  useEffect(() => {
    if (manaCheia) return
    const id = window.setInterval(() => setAgora(Date.now()), TIQUE_DA_MANA)
    return () => window.clearInterval(id)
  }, [manaCheia])

  const estado = useMemo<EstadoComunidade | null>(() => {
    if (!guardado) return null
    const { estado: e, em } = guardado
    return { ...e, mana: manaNaTela(e.mana, e.regras.mp_max, e.regras.mp_regen_dia, em, agora) }
  }, [guardado, agora])

  return { estado: session ? estado : null, indisponivel, recarregar }
}
