// client/src/hooks/useResumoGuilda.ts
// Nível, rank e streak de quem está logado. Usado pela pílula da Navbar e pelo card da
// Início; a memória de tela evita que os dois busquem em duplicidade ao trocar de página.
import { useEffect, useState } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import { chaveDoUsuario, guardarNaMemoria, lerDaMemoria } from '../lib/cacheDeTela'
import type { StatusNivelGuilda } from '../lib/guilda'

export function useResumoGuilda(): StatusNivelGuilda | null {
  const { session } = useSessao()
  const token = session?.access_token
  const chave = chaveDoUsuario(session?.user.id, 'guilda:resumo')
  const [status, setStatus] = useState<StatusNivelGuilda | null>(() => lerDaMemoria<StatusNivelGuilda>(chave) ?? null)

  useEffect(() => {
    if (!token || !chave) return
    let ativo = true

    const buscarResumo = async () => {
      try {
        const res = await fetch('/api/guilda/resumo', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        const dados = (await res.json()) as StatusNivelGuilda
        guardarNaMemoria(chave, dados)
        if (ativo) setStatus(dados)
      } catch {
        // Falha de rede silenciosa: mantém o último estado em memória.
      }
    }

    buscarResumo()
    window.addEventListener('anideck:episodio-atualizado', buscarResumo)
    return () => {
      ativo = false
      window.removeEventListener('anideck:episodio-atualizado', buscarResumo)
    }
  }, [token, chave])

  return session ? status : null
}
