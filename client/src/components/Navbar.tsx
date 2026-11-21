import { useState, useEffect, useSyncExternalStore } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, ShoppingBag } from 'lucide-react'
import BuscaDoAniDeck from './BuscaDoAniDeck'
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
  const [buscaAberta, setBuscaAberta] = useState(false)

  // Ctrl+K / ⌘K abre a busca do AniDeck em qualquer tela.
  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setBuscaAberta(true)
      }
    }
    window.addEventListener('keydown', atalho)
    return () => window.removeEventListener('keydown', atalho)
  }, [])
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
    `relative py-2 text-xs lg:text-sm font-bold select-none transition-colors whitespace-nowrap rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-holo-3 after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-gradient-to-r after:from-holo-1 after:to-holo-3 after:transition-opacity ${
      rotas.includes(location.pathname) ? 'text-text after:opacity-100' : 'text-muted hover:text-text after:opacity-0'
    }`

  // Logado, a barra ganha HUD, sino e perfil: de md a xl só cabem os links de uso diário
  // (os demais ficam no menu de perfil) e, de xl para cima, a navegação inteira passa
  // para o menu lateral. O visitante vê todos os links, em qualquer largura.
  const secundario = session ? 'hidden' : ''
  const soSemMenuLateral = session ? 'xl:hidden' : ''

  return (
    <>
      <BuscaDoAniDeck aberta={buscaAberta} aoFechar={() => setBuscaAberta(false)} />
      <nav
        className={`fixed top-0 left-[var(--menu-lateral)] right-0 z-50 transition-all duration-300 ${scrolled ? 'py-2 md:py-2.5 bg-void/90 backdrop-blur-xl border-b border-line shadow-[0_8px_32px_rgba(0,0,0,0.45)]' : 'py-2.5 md:py-3.5 bg-gradient-to-b from-void/80 to-transparent'
          }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className={`flex items-center gap-2.5 z-50 group ${soSemMenuLateral}`}>
            <LogoMark />
            <div className={`font-anton text-lg tracking-wide group-hover:opacity-80 transition-opacity ${session ? 'max-[419px]:hidden' : ''}`}>
              Ani<span className="text-holo">Deck</span>
            </div>
          </Link>
          {/* No celular a busca fica no topo: o botão flutuante cobria o conteúdo das páginas. */}
          {!ehDesktop && (
            <div className="flex md:hidden items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setBuscaAberta(true)}
                aria-label="Buscar no AniDeck"
                title="Buscar no AniDeck"
                className="w-9 h-9 cursor-pointer rounded-full border border-line bg-panel/90 text-muted flex items-center justify-center transition-colors hover:border-holo-3 hover:text-holo-3 shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                <Search size={16} />
              </button>
              {session && (
                <Link
                  to="/loja"
                  aria-label="Loja Cosmética"
                  title="Loja Cosmética"
                  className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                    location.pathname === '/loja'
                      ? 'border-gold bg-gold/20 text-gold shadow-[0_0_10px_rgba(245,158,11,0.35)]'
                      : 'border-line bg-panel/90 text-gold hover:border-gold hover:bg-gold/15'
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
          {session && (
            <button
              type="button"
              onClick={() => setBuscaAberta(true)}
              className="hidden xl:flex cursor-pointer items-center gap-2.5 h-10 w-full max-w-[420px] px-4 rounded-xl border border-line bg-panel/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-sm text-muted transition-colors hover:border-holo-3/60 hover:text-text focus-visible:outline-2 focus-visible:outline-holo-3"
            >
              <Search size={16} aria-hidden />
              <span>Buscar anime, membro ou item…</span>
              <kbd className="ml-auto rounded-md border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-xs text-muted-2">Ctrl K</kbd>
            </button>
          )}
          <div className={`hidden md:flex items-center gap-3.5 lg:gap-5 xl:gap-6 ${soSemMenuLateral}`}>
            <Link to="/" className={linkClasse('/')}>Início</Link>
            <Link to="/descobrir" className={linkClasse('/descobrir')}>Descobrir</Link>
            <Link to="/rankings" className={`${linkClasse('/rankings', '/membros')} ${secundario}`}>Rankings</Link>
            <Link to="/clas" className={`${linkClasse('/clas')} ${secundario}`}>Clãs</Link>
            {session && (
              <>
                <Link to="/deck" className={linkClasse('/deck')}>Meu Deck</Link>
                <Link to="/calendario" className={linkClasse('/calendario')}>Agenda</Link>
                <Link to="/loja" className={`${linkClasse('/loja')} ${secundario}`}>Loja</Link>
                <Link to="/meu-gosto" className={`${linkClasse('/meu-gosto')} ${secundario}`}>Meu Gosto</Link>
              </>
            )}
          </div>

          {/* Ações (Busca, Auth/User) */}
          <div className="hidden md:flex items-center gap-3">
            <button type="button" onClick={() => setBuscaAberta(true)} className={`w-9 h-9 cursor-pointer rounded-full border border-line bg-panel text-muted flex items-center justify-center transition-all hover:border-holo-3 hover:text-holo-3 ${soSemMenuLateral}`} title="Buscar no AniDeck" aria-label="Buscar no AniDeck">
              <Search size={16} />
            </button>

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
