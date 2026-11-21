// client/src/components/BottomNav.tsx
// Barra inferior mobile ergonômica com 5 botões espaçosos e Dock Rápido de Aventura (RPG).
import { Link, useLocation } from 'react-router-dom'
import {
  CalendarDays, Compass, DoorOpen, Flame, Home, LayoutDashboard,
  Shield, ShoppingBag, Sparkles, Swords, Trophy, User, UserRound, Users,
} from 'lucide-react'
import { useState } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import Sheet from './Sheet'
import ItensPerfil from './ItensPerfil'
import { preCarregarRota } from '../lib/rotasPreguicosas'

const ROTAS_AVENTURA = [
  '/personagem',
  '/guilda',
  '/expedicoes',
  '/masmorras',
  '/duelos',
  '/invocacao',
  '/loja',
  '/clas',
  '/expedicao-do-cla',
  '/chefao',
  '/grupo',
]

const ROTAS_EXPLORAR = ['/descobrir', '/rankings', '/membros', '/clas', '/feed', '/anime']
const ROTAS_DECK = ['/deck', '/calendario']

function rotaAtiva(bases: string[], caminho: string): boolean {
  return bases.some((base) =>
    base === '/' ? caminho === '/' : caminho === base || caminho.startsWith(`${base}/`),
  )
}

const ATALHOS_RPG = [
  { para: '/personagem', titulo: 'Herói & Eco', sub: 'Equipamentos e atributos', Icone: UserRound, cor: 'text-gold' },
  { para: '/guilda', titulo: 'Guilda & Missões', sub: 'Rank, XP e contratos', Icone: Shield, cor: 'text-holo-3' },
  { para: '/expedicoes', titulo: 'Expedições 2D', sub: 'Mapa-múndi e caça', Icone: Compass, cor: 'text-holo-2' },
  { para: '/masmorras', titulo: 'Masmorras', sub: 'Andares e Roguelite', Icone: DoorOpen, cor: 'text-coral' },
  { para: '/loja', titulo: 'Loja & Forja', sub: 'Visual, Ouro e receitas', Icone: ShoppingBag, cor: 'text-holo-3' },
  { para: '/duelos', titulo: 'Duelos', sub: 'Arena contra outros heróis', Icone: Swords, cor: 'text-holo-1' },
  { para: '/clas', titulo: 'Clãs & Alianças', sub: 'Expedição semanal do clã', Icone: Users, cor: 'text-holo-1' },
  { para: '/chefao', titulo: 'Chefão', sub: 'Raid da temporada', Icone: Flame, cor: 'text-coral' },
  { para: '/invocacao', titulo: 'Invocação', sub: 'Sortear equipamentos', Icone: Sparkles, cor: 'text-gold' },
  { para: '/calendario', titulo: 'Agenda', sub: 'Lançamentos da semana', Icone: CalendarDays, cor: 'text-green' },
]

export default function BottomNav() {
  const location = useLocation()
  const { session } = useSessao()
  const [menuAberto, setMenuAberto] = useState(false)
  const [aventuraAberta, setAventuraAberta] = useState(false)

  const itemClasse = (ativo: boolean) =>
    `flex flex-col items-center justify-center h-12 rounded-xl gap-1 transition-colors select-none ${
      ativo ? 'text-holo-3 font-extrabold' : 'text-muted hover:text-text font-semibold'
    }`

  const rotuloClasse = 'text-xs leading-none tracking-tight whitespace-nowrap'

  const ativoInicio = rotaAtiva(['/'], location.pathname)
  const ativoDeck = rotaAtiva(ROTAS_DECK, location.pathname)
  const ativoAventura = aventuraAberta || rotaAtiva(ROTAS_AVENTURA, location.pathname)
  const ativoExplorar = rotaAtiva(ROTAS_EXPLORAR, location.pathname)

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-void/92 backdrop-blur-xl border-t border-line shadow-[0_-10px_30px_rgba(0,0,0,0.65)] pb-safe">
      <nav
        aria-label="Navegação inferior"
        className={session ? 'grid grid-cols-5 items-center h-16 px-1.5 gap-1' : 'flex items-center justify-around h-16 px-2'}
      >
        <Link to="/" className={itemClasse(ativoInicio)}>
          <Home size={18} aria-hidden="true" />
          <span className={rotuloClasse}>Início</span>
        </Link>

        {session ? (
          <>
            <Link to="/deck" className={itemClasse(ativoDeck)}>
              <LayoutDashboard size={18} aria-hidden="true" />
              <span className={rotuloClasse}>Deck</span>
            </Link>

            <button
              type="button"
              onClick={() => setAventuraAberta(true)}
              aria-expanded={aventuraAberta}
              aria-haspopup="dialog"
              className={`flex flex-col items-center justify-center h-12 rounded-2xl gap-1 cursor-pointer select-none transition-all ${
                ativoAventura
                  ? 'bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-void font-extrabold shadow-[0_8px_20px_-6px_rgba(255,79,216,0.55)]'
                  : 'bg-panel-2 border border-line text-text font-bold hover:border-holo-3/50'
              }`}
            >
              <Swords size={18} aria-hidden="true" />
              <span className={rotuloClasse}>Aventura</span>
            </button>

            <Link to="/descobrir" className={itemClasse(ativoExplorar)}>
              <Compass size={18} aria-hidden="true" />
              <span className={rotuloClasse}>Explorar</span>
            </Link>

            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              aria-expanded={menuAberto}
              aria-haspopup="dialog"
              className="flex flex-col items-center justify-center h-12 rounded-xl gap-1 text-muted hover:text-text font-semibold cursor-pointer select-none transition-colors"
            >
              <div className="w-[19px] h-[19px] rounded-full bg-gradient-to-br from-holo-1 via-holo-2 to-holo-3 flex items-center justify-center text-void font-extrabold text-[11px] leading-none">
                {(session.user.user_metadata?.display_name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className={rotuloClasse}>Perfil</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/descobrir" className={itemClasse(rotaAtiva(['/descobrir'], location.pathname))}>
              <Compass size={18} aria-hidden="true" />
              <span className={rotuloClasse}>Descobrir</span>
            </Link>
            <Link to="/rankings" className={itemClasse(rotaAtiva(['/rankings', '/membros'], location.pathname))}>
              <Trophy size={18} aria-hidden="true" />
              <span className={rotuloClasse}>Rankings</span>
            </Link>
            <Link to="/login" className="flex flex-col items-center justify-center h-12 px-2 gap-1 text-muted hover:text-text font-semibold select-none">
              <div className="w-5 h-5 rounded-full border border-line flex items-center justify-center bg-panel-2">
                <User size={12} aria-hidden="true" />
              </div>
              <span className={rotuloClasse}>Entrar</span>
            </Link>
          </>
        )}
      </nav>

      {/* Dock Rápido do RPG e atalhos de jogo (2 toques confortáveis para qualquer tela) */}
      <Sheet isOpen={aventuraAberta} onClose={() => setAventuraAberta(false)} title="Aventura & Atalhos">
        <div className="grid grid-cols-2 gap-2.5 pb-1">
          {ATALHOS_RPG.map(({ para, titulo, sub, Icone, cor }) => (
            <Link
              key={para}
              to={para}
              onClick={() => setAventuraAberta(false)}
              onTouchStart={() => preCarregarRota(para)}
              className="flex flex-col gap-1.5 rounded-2xl border border-line bg-panel-2/85 p-3.5 transition-colors hover:border-holo-3/50 active:scale-[0.98]"
            >
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl bg-panel border border-line ${cor}`}>
                <Icone size={17} aria-hidden="true" />
              </span>
              <span className="text-xs font-extrabold text-text leading-tight">{titulo}</span>
              <span className="text-xs text-muted leading-snug">{sub}</span>
            </Link>
          ))}
        </div>
      </Sheet>

      <Sheet isOpen={menuAberto} onClose={() => setMenuAberto(false)} title="Perfil">
        <div className="-mx-5 sm:-mx-6 -mb-2">
          <ItensPerfil onNavegar={() => setMenuAberto(false)} />
        </div>
      </Sheet>
    </div>
  )
}