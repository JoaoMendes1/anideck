// client/src/components/comunidade/CartaoVitais.tsx
// Vitalidade e Mana na Guilda, com o caminho para o perfil público e o ranking de membros.
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { useComunidade } from '../../hooks/useComunidade'
import BarrasVitais from './BarrasVitais'

export default function CartaoVitais() {
  const { estado } = useComunidade()
  if (!estado) return null
  const { perfil } = estado

  return (
    <section className="p-5 rounded-2xl bg-panel border border-line">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">// comunidade</p>
          <h3 className="font-anton text-lg uppercase m-0 mt-0.5">Vitalidade &amp; Mana</h3>
        </div>
        {perfil.existe && (
          <Link to={perfil.publico ? `/u/${perfil.handle}` : '/configuracoes#comunidade'} className="font-mono text-[11px] text-holo-3 hover:underline">
            @{perfil.handle}
          </Link>
        )}
      </div>

      <BarrasVitais estado={estado} />

      <p className="font-mono text-[10.5px] text-muted-2 mt-4 mb-0 leading-relaxed">
        A Vitalidade mede os últimos {estado.regras.hp_janela_dias} dias e nunca tira XP nem rank. Ficou parado? Ela cai devagar e
        volta com o próximo episódio.
      </p>

      <div className="flex flex-wrap gap-2 mt-4">
        {!perfil.existe && (
          <Link to="/configuracoes#comunidade" className="px-4 py-2 rounded-full text-xs font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2">
            Criar perfil público
          </Link>
        )}
        <Link to="/membros" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border border-line hover:border-holo-3 text-text">
          <Users size={13} aria-hidden /> Ranking de membros
        </Link>
      </div>
    </section>
  )
}
