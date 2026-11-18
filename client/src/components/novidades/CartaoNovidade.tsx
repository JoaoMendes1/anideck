// client/src/components/novidades/CartaoNovidade.tsx
// Uma novidade: categoria, data e hora, título, resumo e os caminhos para conferir.
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock } from 'lucide-react'
import { COR_CATEGORIA, ROTULO_CATEGORIA, dataHoraDaNovidade, type Novidade } from '../../lib/novidades'

export default function CartaoNovidade({ novidade, aoNavegar }: { novidade: Novidade; aoNavegar?: () => void }) {
  return (
    <article className="rounded-2xl border border-line bg-panel-2 p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full border px-2 py-0.5 font-semibold ${COR_CATEGORIA[novidade.categoria]}`}>
          {ROTULO_CATEGORIA[novidade.categoria]}
        </span>
        <span className="inline-flex items-center gap-1 text-muted">
          <CalendarClock size={12} aria-hidden />
          {dataHoraDaNovidade(novidade.publicado_em)}
        </span>
      </div>
      <h3 className="m-0 text-base font-bold text-text">{novidade.titulo}</h3>
      <p className="m-0 text-sm text-muted whitespace-pre-line">{novidade.resumo}</p>
      {novidade.links.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {novidade.links.map(l => (
            <Link
              key={`${l.caminho}-${l.rotulo}`}
              to={l.caminho}
              onClick={aoNavegar}
              className="inline-flex items-center gap-1.5 rounded-xl border border-holo-1/40 bg-holo-1/10 px-3 py-1.5 text-sm font-semibold text-holo-1 hover:bg-holo-1/20"
            >
              {l.rotulo}
              <ArrowRight size={14} aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </article>
  )
}
