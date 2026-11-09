import { useState, useEffect, useSyncExternalStore } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, ShoppingBag } from 'lucide-react'
import NotificationBell from './NotificationBell'
import PilulaGuilda from './PilulaGuilda'
import MenuPerfil from './MenuPerfil'
import { useSessao } from '../contexts/SessaoContext'
import { LogoMark } from './Brand'

// Mesma fronteira do prefixo md: do Tailwind (48rem).
const CONSULTA_DESKTOP = '(min-width: 48rem)'

function assinarTamanhoDaTela(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_DESKTOP)
  consulta.addEventListener('change', avisar)
  return () => consulta.removeEventListener('change', avisar)
}

// Diz se a tela está no layout de desktop. Existe por causa do sino: o menu tem
// um lugar para ele no celular e outro no desktop, e esconder um dos dois com CSS
// (md:hidden) não impede que ele monte. Montados, os dois buscavam as
// notificações e registravam o service worker — toda abertura do app fazia essas
// chamadas em dobro, como mostrou o log do servidor.
function useEhDesktop(): boolean {
  return useSyncExternalStore(assinarTamanhoDaTela, () => window.matchMedia(CONSULTA_DESKTOP).matches)
}

export default function Navbar() {
  // A sessão e a verificação de admin vinham daqui, cada uma com seu useEffect.
  // Agora vêm do SessaoContext: a BottomNav e o MenuPerfil precisam do mesmo
  // dado, e três cópias da mesma pergunta gerariam três chamadas ao servidor.
  const { session } = useSessao()
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const ehDesktop = useEhDesktop()

  // Gerencia o efeito de Scroll da Navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const linkClasse = (...rotas: string[]) =>
    `text-sm font-bold focus:outline-none select-none transition-colors ${
      rotas.includes(location.pathname) ? 'text-text' : 'text-muted hover:text-text'
    }`

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-3 bg-void/85 backdrop-blur-md border-b border-line' : 'py-5 bg-transparent'
          }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 z-50 group">
            <LogoMark />
            <div className="font-anton text-lg tracking-wide group-hover:opacity-80 transition-opacity">
              Ani<span className="text-holo">Deck</span>
            </div>
          </Link>
          {/* No celular a busca fica no topo: o botão flutuante cobria o conteúdo das páginas. */}
          {!ehDesktop && (
            <div className="flex md:hidden items-center gap-1.5 sm:gap-2">
              <Link
                to="/descobrir?foco=1"
                aria-label="Buscar anime"
                title="Buscar anime"
                className="w-9 h-9 rounded-full border border-line bg-panel text-muted flex items-center justify-center transition-colors hover:border-holo-3 hover:text-holo-3 shrink-0"
              >
                <Search size={16} />
              </Link>
              {session && (
                <Link
                  to="/loja"
                  aria-label="Loja Cosmética"
                  title="Loja Cosmética"
                  className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                    location.pathname === '/loja'
                      ? 'border-gold bg-gold/20 text-gold shadow-[0_0_10px_rgba(245,158,11,0.35)]'
                      : 'border-line bg-panel text-gold hover:border-gold hover:bg-gold/15'
                  }`}
                >
                  <ShoppingBag size={16} />
                </Link>
              )}
              {session && <PilulaGuilda />}
              {session && <NotificationBell />}
            </div>
          )}

          {/* LINKS DE NAVEGAÇÃO DESKTOP */}
          {/* "Admin" saiu daqui e foi pro MenuPerfil: é destino raro e restrito,
              não merecia um slot fixo ao lado dos links de uso diário. */}
          <div className="hidden md:flex items-center gap-6 lg:gap-7">
            <Link to="/" className={linkClasse('/')}>Início</Link>
            <Link to="/descobrir" className={linkClasse('/descobrir')}>Descobrir</Link>
            <Link to="/rankings" className={linkClasse('/rankings', '/membros')}>Rankings</Link>
            <Link to="/clas" className={linkClasse('/clas')}>Clãs</Link>
            {session && (
              <>
                <Link to="/deck" className={linkClasse('/deck')}>Meu Deck</Link>
                <Link to="/calendario" className={linkClasse('/calendario')}>Agenda</Link>
                <Link to="/loja" className={linkClasse('/loja')}>Loja</Link>
                <Link to="/meu-gosto" className={linkClasse('/meu-gosto')}>Meu Gosto</Link>
              </>
            )}
          </div>

          {/* Ações (Busca, Auth/User) */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/descobrir" className="w-9 h-9 rounded-full border border-line bg-panel text-muted flex items-center justify-center transition-all hover:border-holo-3 hover:text-holo-3" title="Buscar">
              <Search size={16} />
            </Link>

            {session && ehDesktop && <PilulaGuilda />}
            {session && ehDesktop && <NotificationBell />}

            {session ? (
              <MenuPerfil />
            ) : (
              <Link to="/login" className="px-5 py-2.5 rounded-full font-bold text-sm text-void bg-gradient-to-r from-holo-1 to-holo-3 hover:opacity-90 transition-opacity">
                Entrar
              </Link>
            )}
          </div>

        </div>
      </nav>
    </>
  )
}
