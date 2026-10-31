// client/src/components/AbasDescobrir.tsx
// Busca e Rankings são as duas abas do Descobrir. Cada uma mantém a própria rota, para
// link direto e botão voltar continuarem funcionando como antes.
import { NavLink } from 'react-router-dom'

const ABAS = [
  { para: '/descobrir', texto: 'Buscar' },
  { para: '/rankings', texto: 'Rankings' },
]

export default function AbasDescobrir() {
  return (
    <nav aria-label="Descobrir" className="flex gap-1 p-1 mb-5 rounded-full bg-panel border border-line w-fit select-none">
      {ABAS.map(aba => (
        <NavLink
          key={aba.para}
          to={aba.para}
          end
          className={({ isActive }) =>
            `px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
              isActive ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void' : 'text-muted hover:text-text'
            }`
          }
        >
          {aba.texto}
        </NavLink>
      ))}
    </nav>
  )
}
