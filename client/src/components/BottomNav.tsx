import { Link, useLocation } from 'react-router-dom'
import { Home, LayoutDashboard, User, Trophy, Rss, Swords, UserRound, CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import Sheet from './Sheet'
import ItensPerfil from './ItensPerfil'

const ATIVO_EM: Record<string, string[]> = {
  '/': ['/'],
  '/personagem': ['/personagem', '/invocacao', '/duelos'],
  '/guilda': ['/guilda', '/expedicoes', '/masmorras', '/chefao', '/clas', '/expedicao-do-cla', '/loja'],
  '/deck': ['/deck'],
  '/calendario': ['/calendario'],
  '/feed': ['/feed'],
  '/rankings': ['/rankings', '/membros'],
}

function rotaAtiva(item: string, caminho: string): boolean {
  const bases = ATIVO_EM[item] ?? [item]
  return bases.some((base) =>
    base === '/' ? caminho === '/' : caminho === base || caminho.startsWith(`${base}/`),
  )
}

export default function BottomNav() {
  const location = useLocation()
  const { session } = useSessao()
  const [menuAberto, setMenuAberto] = useState(false)

  const itemClasse = (item: string) =>
    `flex flex-col items-center justify-center flex-1 min-w-0 h-full px-0.5 gap-1 transition-colors ${
      rotaAtiva(item, location.pathname) ? 'text-holo-3' : 'text-muted'
    }`

  const rotuloClasse = 'text-[9.5px] min-[390px]:text-[10px] sm:text-xs font-bold leading-none tracking-tight whitespace-nowrap'

  // Barra inferior mobile: Início, Herói, Guilda, Deck, Agenda, Feed, Rankings e Perfil.
  // Meu Gosto, Configurações e Admin ficam no Sheet de Perfil; a busca fica no topo (Navbar).
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-md border-t border-line pb-safe">
      <nav aria-label="Navegação inferior" className="flex items-center justify-around h-16 px-0.5 sm:px-2">
        <Link to="/" className={itemClasse('/')}>
          <Home size={16} aria-hidden="true" />
          <span className={rotuloClasse}>Início</span>
        </Link>

        {session ? (
          <>
            <Link to="/personagem" className={itemClasse('/personagem')}>
              <UserRound size={16} aria-hidden="true" />
              <span className={rotuloClasse}>Herói</span>
            </Link>

            <Link to="/guilda" className={itemClasse('/guilda')}>
              <Swords size={16} aria-hidden="true" />
              <span className={rotuloClasse}>Guilda</span>
            </Link>

            <Link to="/deck" className={itemClasse('/deck')}>
              <LayoutDashboard size={16} aria-hidden="true" />
              <span className={rotuloClasse}>Deck</span>
            </Link>

            <Link to="/calendario" className={itemClasse('/calendario')}>
              <CalendarDays size={16} aria-hidden="true" />
              <span className={rotuloClasse}>Agenda</span>
            </Link>

            <Link to="/feed" className={itemClasse('/feed')}>
              <Rss size={16} aria-hidden="true" />
              <span className={rotuloClasse}>Feed</span>
            </Link>

            <Link to="/rankings" className={itemClasse('/rankings')}>
              <Trophy size={16} aria-hidden="true" />
              <span className={rotuloClasse}>Rankings</span>
            </Link>

            {/* Admin e Sair ficam no Sheet de Perfil: Sair é irreversível e
                não pode estar num alvo pequeno ao lado dos itens de uso diário. */}
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              className="flex flex-col items-center justify-center flex-1 min-w-0 h-full px-0.5 gap-1 text-muted cursor-pointer select-none"
            >
              <div className="w-[17px] h-[17px] rounded-full bg-gradient-to-br from-holo-2 to-holo-3 flex items-center justify-center text-void font-bold text-[10px] leading-none">
                {(session.user.user_metadata?.display_name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className={rotuloClasse}>Perfil</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/rankings" className={itemClasse('/rankings')}>
              <Trophy size={17} aria-hidden="true" />
              <span className={rotuloClasse}>Rankings</span>
            </Link>
            <Link to="/login" className="flex flex-col items-center justify-center flex-auto min-w-[44px] h-full px-1 gap-1 text-muted select-none">
              <div className="w-5 h-5 rounded-full border border-line flex items-center justify-center bg-panel">
                <User size={12} aria-hidden="true" />
              </div>
              <span className={rotuloClasse}>Entrar</span>
            </Link>
          </>
        )}
      </nav>

      {/* -mx-6 cancela o p-6 do Sheet pros itens ocuparem a largura toda,
          como num menu de app nativo. */}
      <Sheet isOpen={menuAberto} onClose={() => setMenuAberto(false)} title="Perfil">
        <div className="-mx-6 -mb-2">
          <ItensPerfil onNavegar={() => setMenuAberto(false)} />
        </div>
      </Sheet>
    </div>
  )
}