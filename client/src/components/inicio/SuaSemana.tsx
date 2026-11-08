// client/src/components/inicio/SuaSemana.tsx
// Os próximos 7 dias do deck numa faixa: cada dia mostra quantos episódios saem, e o dia
// escolhido lista os episódios com o horário local.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import type { DiaDaSemana } from '../../lib/inicio'
import { miniatura } from '../../lib/miniatura'

const horaLocal = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export default function SuaSemana({ semana, compacta = false }: { semana: DiaDaSemana[]; compacta?: boolean }) {
  // Abre no primeiro dia que tem episódio; sem nenhum na semana, fica em Hoje.
  const primeiroComEstreia = Math.max(0, semana.findIndex(d => d.estreias.length > 0))
  const [indice, setIndice] = useState(primeiroComEstreia)
  const dia = semana[indice] ?? semana[0]
  const totalNaSemana = semana.reduce((soma, d) => soma + d.estreias.length, 0)

  if (!dia) return null

  return (
    <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4">
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-3.5" role="tablist" aria-label="Dias da semana">
        {semana.map((d, i) => {
          const ativo = i === indice
          const qtd = d.estreias.length
          return (
            <button
              key={d.data.toISOString()}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setIndice(i)}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border transition-colors cursor-pointer ${
                ativo ? 'bg-holo-3/15 border-holo-3/50 text-holo-3' : 'border-transparent hover:bg-panel-2 text-muted'
              }`}
            >
              <span className="font-mono text-[9px] uppercase tracking-wider leading-none truncate max-w-full px-0.5">
                {i === 0 ? 'Hoje' : d.data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
              </span>
              <span className={`font-anton text-[17px] leading-none ${ativo ? 'text-text' : ''}`}>{d.data.getDate()}</span>
              <span className={`h-1.5 rounded-full transition-all ${qtd > 0 ? 'bg-holo-3' : 'bg-transparent'}`} style={{ width: `${Math.min(qtd, 4) * 5 + (qtd > 0 ? 1 : 0)}px` }} />
            </button>
          )
        })}
      </div>

      {dia.estreias.length === 0 ? (
        <p className="text-sm text-muted py-3 text-center">
          {totalNaSemana === 0 ? 'Nenhum episódio do seu deck nos próximos 7 dias.' : `Nada do seu deck sai ${dia.rotulo === 'Hoje' ? 'hoje' : 'neste dia'}.`}
        </p>
      ) : (
        <ul className="flex flex-col gap-2 m-0 p-0 list-none">
          {dia.estreias.map(e => (
            <li key={e.anime.mal_id} className="flex items-center gap-3 rounded-xl p-2 -mx-1 hover:bg-panel-2 transition-colors">
              <Link to={`/anime/${e.anime.mal_id}`} className="shrink-0">
                {e.anime.image_url ? (
                  <img src={miniatura(e.anime.image_url)} alt="" className={`${compacta ? 'w-10 h-14' : 'w-11 h-16'} rounded-lg object-cover border border-line`} />
                ) : (
                  <div className={`${compacta ? 'w-10 h-14' : 'w-11 h-16'} rounded-lg bg-panel-2`} />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-anton text-[15px] text-holo-3 tabular-nums leading-none">{horaLocal(e.quando)}</span>
                  <span className="font-mono text-[9.5px] text-muted-2 uppercase">Ep. {e.episodio}</span>
                </div>
                <Link to={`/anime/${e.anime.mal_id}`} className="block text-[13px] font-bold leading-snug line-clamp-2 hover:text-holo-3 transition-colors">
                  {e.anime.title}
                </Link>
              </div>
              {e.anime.streaming?.[0] && (
                <a
                  href={e.anime.streaming[0].url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Assistir ${e.anime.title} em ${e.anime.streaming[0].name}`}
                  className="shrink-0 w-8 h-8 rounded-full bg-holo-3/15 border border-holo-3/40 text-holo-3 hover:bg-holo-3 hover:text-void flex items-center justify-center transition-colors"
                >
                  <Play size={12} fill="currentColor" className="ml-0.5" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
