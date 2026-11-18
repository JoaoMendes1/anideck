// client/src/pages/Novidades.tsx
// Página com as atualizações do AniDeck, das mais novas para as mais antigas.
import { useEffect, useState } from 'react'
import { Megaphone } from 'lucide-react'
import { listarNovidades, type Novidade } from '../lib/novidades'
import CartaoNovidade from '../components/novidades/CartaoNovidade'

export default function Novidades() {
  const [lista, setLista] = useState<Novidade[] | null>(null)

  useEffect(() => {
    let ativo = true
    listarNovidades().then(l => {
      // O admin também lê as agendadas e as desligadas; a página mostra só as publicadas.
      if (ativo) setLista(l.filter(n => n.ativo && new Date(n.publicado_em) <= new Date()))
    })
    return () => {
      ativo = false
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 space-y-4">
      <header className="flex items-center gap-3">
        <Megaphone size={24} className="text-holo-1" aria-hidden />
        <div>
          <h1 className="m-0 text-2xl font-bold text-text">Novidades</h1>
          <p className="m-0 text-sm text-muted">Funções novas, correções e mudanças no AniDeck.</p>
        </div>
      </header>
      {lista === null && <p className="text-sm text-muted">Carregando…</p>}
      {lista && lista.length === 0 && <p className="text-sm text-muted">Nenhuma novidade publicada ainda.</p>}
      {lista?.map(n => <CartaoNovidade key={n.id} novidade={n} />)}
    </div>
  )
}
