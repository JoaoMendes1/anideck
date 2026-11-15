import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import CarregandoPagina from './CarregandoPagina'
import MenuLateral from './MenuLateral'
import LimiteDeErro from './LimiteDeErro'
import { useSessao } from '../contexts/SessaoContext'
import { guardarMenuAberto, lerMenuAberto } from '../lib/menuLateral'
import { CatalogoStatusProvider, useCatalogoStatus } from '../contexts/CatalogoStatusContext'

function AvisoCatalogo() {
  const { indisponivel } = useCatalogoStatus()
  if (!indisponivel) return null

  return (
    <div className="mx-4 mb-4 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-center">
      <p className="text-[12px] font-bold text-gold">
        Dados do catálogo temporariamente indisponíveis.
      </p>
      <p className="mt-0.5 text-xs text-muted">
        Seu deck e suas notas estão salvos.
      </p>
    </div>
  )
}

function LayoutInterno() {
  const { session } = useSessao()
  const { pathname } = useLocation()
  const [menuAberto, setMenuAberto] = useState(lerMenuAberto)

  const alternarMenu = () => {
    setMenuAberto((aberto) => {
      guardarMenuAberto(!aberto)
      return !aberto
    })
  }

  // A largura do menu lateral vive numa variável CSS: o menu, a barra superior e o
  // conteúdo leem o mesmo valor. Só existe para quem está logado, de xl para cima:
  // trilho de 72 px, ou 232 px aberto (de 2xl para cima).
  const larguraDoMenu = !session
    ? '[--menu-lateral:0px]'
    : menuAberto
    ? '[--menu-lateral:0px] xl:[--menu-lateral:72px] 2xl:[--menu-lateral:232px]'
    : '[--menu-lateral:0px] xl:[--menu-lateral:72px]'

  return (
    <div className={`relative min-h-screen flex flex-col ${larguraDoMenu}`}>
      <div className="bg-ambient"></div>

      {session && <MenuLateral aberto={menuAberto} aoAlternar={alternarMenu} />}
      <Navbar />

      {/* pt-24 compensa a navbar superior. pb-24 compensa a BottomNav no mobile... */}
      <main className="relative z-10 flex-1 flex flex-col pt-24 pb-20 md:pb-0 pl-[var(--menu-lateral)] w-full max-w-[100vw] overflow-x-hidden">
        <AvisoCatalogo />
        {/* Só o miolo espera o código da página chegar (ver lazy() no App.tsx);
            Navbar e BottomNav ficam de pé durante a espera. */}
        <LimiteDeErro chave={pathname}>
          <Suspense fallback={<CarregandoPagina />}>
            <Outlet />
          </Suspense>
        </LimiteDeErro>
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
