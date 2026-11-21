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
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-4 pb-24 space-y-4">
      <header className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-holo-1/15 border border-holo-1/35 grid place-items-center text-holo-1 shrink-0">
          <Megaphone size={20} aria-hidden />
        </span>
        <div>
          <span className="font-mono text-xs text-holo-3 uppercase tracking-widest block">// changelog</span>
          <h1 className="m-0 font-manrope text-2xl sm:text-3xl font-extrabold tracking-tight text-text">Novidades</h1>
          <p className="m-0 text-sm text-muted">Funções novas, correções e mudanças no AniDeck.</p>
        </div>
      </header>
      {lista === null && <p className="text-sm text-muted">Carregando…</p>}
      {lista && lista.length === 0 && <p className="text-sm text-muted">Nenhuma novidade publicada ainda.</p>}
      {lista?.map(n => <CartaoNovidade key={n.id} novidade={n} />)}
    </div>
  )
}
