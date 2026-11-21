// client/src/components/AbasDescobrir.tsx
// Busca, Rankings, Membros, Clãs e Feed (para quem está logado) são as abas do Explorar.
import { NavLink } from 'react-router-dom'
import { useSessao } from '../contexts/SessaoContext'

const ABAS_PUBLICAS = [
  { para: '/descobrir', texto: 'Buscar' },
  { para: '/rankings', texto: 'Rankings' },
  { para: '/membros', texto: 'Membros' },
  { para: '/clas', texto: 'Clãs' },
]

export default function AbasDescobrir() {
  const { session } = useSessao()
  const abas = session ? [...ABAS_PUBLICAS, { para: '/feed', texto: 'Feed' }] : ABAS_PUBLICAS

  return (
    <nav
      aria-label="Descobrir"
      className="flex gap-1 p-1 mb-4 sm:mb-6 rounded-2xl bg-panel border border-line shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] w-fit max-w-full overflow-x-auto scrollbar-none select-none"
    >
      {abas.map((aba) => (
        <NavLink
          key={aba.para}
          to={aba.para}
          end
          className={({ isActive }) =>
            `shrink-0 px-3.5 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isActive
                ? 'bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-void font-extrabold shadow-[0_6px_16px_-6px_rgba(123,92,255,0.6)]'
                : 'text-muted hover:text-text hover:bg-panel-2/70'
            }`
          }
        >
          {aba.texto}
        </NavLink>
      ))}
    </nav>
  )
}
