// client/src/hooks/useResumoGuilda.ts
// Nível, rank e streak de quem está logado. Usado pela pílula da Navbar e pelo card da
// Início; a memória de tela evita que os dois busquem em duplicidade ao trocar de página.
import { useEffect, useState } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import { chaveDoUsuario, guardarNaMemoria, lerDaMemoria } from '../lib/cacheDeTela'
import { VALIDADE_NA_MONTAGEM, buscarUmaVez } from '../lib/buscaCompartilhada'
import type { StatusNivelGuilda } from '../lib/guilda'
import { EVENTO_OURO } from '../lib/hud'

export function useResumoGuilda(): StatusNivelGuilda | null {
  const { session } = useSessao()
  const token = session?.access_token
  const chave = chaveDoUsuario(session?.user.id, 'guilda:resumo')
  const [status, setStatus] = useState<StatusNivelGuilda | null>(() => lerDaMemoria<StatusNivelGuilda>(chave) ?? null)

  useEffect(() => {
    if (!token || !chave) return
    let ativo = true

    const buscarResumo = async (validadeMs: number) => {
      try {
        const dados = await buscarUmaVez(chave, async () => {
          const res = await fetch('/api/guilda/resumo', { headers: { Authorization: `Bearer ${token}` } })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return (await res.json()) as StatusNivelGuilda
        }, validadeMs)
        guardarNaMemoria(chave, dados)
        if (ativo) setStatus(dados)
      } catch {
        // Falha silenciosa: mantém o último estado em memória.
      }
    }

    buscarResumo(VALIDADE_NA_MONTAGEM)
    const aoMudar = () => { buscarResumo(0) }
    window.addEventListener('anideck:episodio-atualizado', aoMudar)
    window.addEventListener(EVENTO_OURO, aoMudar)
    return () => {
      ativo = false
      window.removeEventListener('anideck:episodio-atualizado', aoMudar)
      window.removeEventListener(EVENTO_OURO, aoMudar)
    }
  }, [token, chave])

  return session ? status : null
}
