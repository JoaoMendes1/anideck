// client/src/components/moderacao/AvisoModeracao.tsx
// Faixa no topo das páginas com o que a moderação aplicou na conta (silêncio ativo, multa,
// advertência dos últimos 30 dias). Cada aviso pode ser fechado; o silêncio ativo volta a
// aparecer enquanto durar, porque explica por que comentar está falhando.
import { useEffect, useState } from 'react'
import { ShieldAlert, X } from 'lucide-react'
import { useSessao } from '../../contexts/SessaoContext'
import { descreverPunicao, minhasPunicoes, type PunicaoRegistrada } from '../../lib/moderacao'

const CHAVE = 'anideck:avisos-moderacao-fechados'

function fechados(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) || '[]')
  } catch {
    return []
  }
}

export default function AvisoModeracao() {
  const { session } = useSessao()
  const [avisos, setAvisos] = useState<PunicaoRegistrada[]>([])

  useEffect(() => {
    if (!session) return
    let ativo = true
    minhasPunicoes().then(lista => {
      if (!ativo) return
      const ja = fechados()
      setAvisos(lista.filter(p => p.tipo === 'silenciar' || !ja.includes(p.id)))
    })
    return () => {
      ativo = false
    }
  }, [session])

  if (avisos.length === 0) return null

  const fechar = (id: string) => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify([...fechados(), id].slice(-50)))
    } catch {
      // Sem armazenamento, o aviso só some nesta sessão.
    }
    setAvisos(a => a.filter(p => p.id !== id))
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 pt-2 space-y-2">
      {avisos.slice(0, 2).map(p => (
        <div key={p.id} role="status" className="flex items-start gap-3 rounded-2xl border border-coral/40 bg-coral/10 px-4 py-3">
          <ShieldAlert size={18} className="text-coral shrink-0 mt-0.5" aria-hidden />
          <p className="m-0 flex-1 text-sm text-text">
            {descreverPunicao(p)}
            <span className="block text-xs text-muted mt-0.5">Motivo: {p.motivo}</span>
          </p>
          {p.tipo !== 'silenciar' && (
            <button type="button" onClick={() => fechar(p.id)} aria-label="Fechar aviso" className="text-muted hover:text-text cursor-pointer">
              <X size={16} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
