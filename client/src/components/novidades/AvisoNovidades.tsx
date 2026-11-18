// client/src/components/novidades/AvisoNovidades.tsx
// Aviso central das novidades marcadas "no meio da tela". Aparece ao entrar e, com o site
// aberto, a cada conferência periódica: se surgir uma nova, ela abre na hora.
// Fechar ou seguir um caminho marca todas as mostradas como vistas.
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Megaphone, X } from 'lucide-react'
import { useSessao } from '../../contexts/SessaoContext'
import { marcarVistas, novidadesNaoVistas, type Novidade } from '../../lib/novidades'
import CartaoNovidade from './CartaoNovidade'

/** De quanto em quanto tempo o site aberto confere se há novidade. */
export const INTERVALO_CONFERENCIA_MS = 3 * 60 * 1000

export default function AvisoNovidades() {
  const { session } = useSessao()
  const [lista, setLista] = useState<Novidade[]>([])

  const conferir = useCallback(async () => {
    if (document.visibilityState === 'hidden') return
    const novas = await novidadesNaoVistas()
    if (novas.length > 0) setLista(novas)
  }, [])

  useEffect(() => {
    if (!session) return
    conferir()
    const id = window.setInterval(conferir, INTERVALO_CONFERENCIA_MS)
    const aoVoltar = () => conferir()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [session, conferir])

  if (lista.length === 0) return null

  const fechar = () => {
    marcarVistas(lista.map(n => n.id))
    setLista([])
  }

  const varias = lista.length > 1

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-novidades">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl border border-white/10 bg-bg shadow-2xl">
        <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Megaphone size={20} className="text-holo-1 shrink-0" aria-hidden />
          <h2 id="titulo-novidades" className="m-0 flex-1 text-lg font-bold text-text">
            {varias ? `${lista.length} atualizações novas` : 'Atualização nova'}
          </h2>
          <button type="button" onClick={fechar} aria-label="Fechar" className="text-muted hover:text-text cursor-pointer">
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {varias && <p className="m-0 text-sm text-muted">Escolha o que quer conferir primeiro:</p>}
          {lista.map(n => <CartaoNovidade key={n.id} novidade={n} aoNavegar={fechar} />)}
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3">
          <Link to="/novidades" onClick={fechar} className="text-sm text-muted hover:text-text">
            Ver todas as novidades
          </Link>
          <button type="button" onClick={fechar} className="rounded-xl bg-holo-1 px-4 py-2 text-sm font-bold text-bg cursor-pointer">
            Entendi
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
