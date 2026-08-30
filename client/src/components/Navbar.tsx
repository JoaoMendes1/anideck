import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import NotificationBell from './NotificationBell'
import MenuPerfil from './MenuPerfil'
import { useSessao } from '../contexts/SessaoContext'
import { LogoMark } from './Brand'

export default function Navbar() {
  // A sessão e a verificação de admin vinham daqui, cada uma com seu useEffect.
  // Agora vêm do SessaoContext: a BottomNav e o MenuPerfil precisam do mesmo
  // dado, e três cópias da mesma pergunta gerariam três chamadas ao servidor.
  const { session } = useSessao()
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  // Gerencia o efeito de Scroll da Navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const linkClasse = (rota: string) =>
    `text-sm font-bold focus:outline-none select-none transition-colors ${
      location.pathname === rota ? 'text-text' : 'text-muted hover:text-text'
    }`

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-3 bg-void/85 backdrop-blur-md border-b border-line' : 'py-5 bg-transparent'
          }`}
      >
        <div className="max-w-[1140px] mx-auto px-5 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 z-50 group">
            <LogoMark />
            <div className="font-anton text-lg tracking-wide group-hover:opacity-80 transition-opacity">
              Ani<span className="text-holo">Deck</span>
            </div>
          </Link>
          {session && (
            <div className="flex md:hidden items-center">
              <NotificationBell />
            </div>
          )}

          {/* LINKS DE NAVEGAÇÃO DESKTOP */}
          {/* "Admin" saiu daqui e foi pro MenuPerfil: é destino raro e restrito,
              não merecia um slot fixo ao lado dos links de uso diário. */}
          <div className="hidden md:flex items-center gap-7">
            {session && (
              <>
                <Link to="/deck" className={linkClasse('/deck')}>Meu Deck</Link>
                <Link to="/calendario" className={linkClasse('/calendario')}>Calendário</Link>
                <Link to="/estatisticas" className={linkClasse('/estatisticas')}>Estatísticas</Link>
              </>
            )}
            <Link to="/rankings" className={linkClasse('/rankings')}>Rankings</Link>
          </div>

          {/* Ações (Busca, Auth/User) */}
          <div className="hidden md:flex items-center gap-3.5">
            <Link to="/descobrir" className="w-9 h-9 rounded-full border border-line bg-panel text-muted flex items-center justify-center transition-all hover:border-holo-3 hover:text-holo-3" title="Buscar">
              <Search size={16} />
            </Link>

            {session && <NotificationBell />}

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