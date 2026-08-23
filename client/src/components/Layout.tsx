import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import { CatalogoStatusProvider, useCatalogoStatus } from '../contexts/CatalogoStatusContext'

function AvisoCatalogo() {
  const { indisponivel } = useCatalogoStatus()
  if (!indisponivel) return null

  return (
    <div className="mx-4 mb-4 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-center">
      <p className="text-[12px] font-bold text-gold">
        Dados do catálogo temporariamente indisponíveis.
      </p>
      <p className="mt-0.5 text-[11px] text-muted">
        Seu deck e suas notas estão salvos.
      </p>
    </div>
  )
}

function LayoutInterno() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="bg-ambient"></div>

      <Navbar />

      {/* pt-24 compensa a navbar superior. pb-24 compensa a BottomNav no mobile... */}
      <main className="relative z-10 flex-1 flex flex-col pt-24 pb-24 md:pb-0 w-full max-w-[100vw] overflow-x-hidden">
        <AvisoCatalogo />
        <Outlet />
      </main>

      {/* A BottomNav tem a classe md:hidden internamente, então só renderiza no mobile */}
      <BottomNav />
    </div>
  )
}

// O Provider precisa envolver o Layout inteiro para que o AvisoCatalogo
// (que está dentro dele) consiga ler o estado. Por isso os dois componentes.
export default function Layout() {
  return (
    <CatalogoStatusProvider>
      <LayoutInterno />
    </CatalogoStatusProvider>
  )
}