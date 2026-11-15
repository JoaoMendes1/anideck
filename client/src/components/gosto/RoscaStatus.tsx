// client/src/components/gosto/RoscaStatus.tsx
// Rosca da distribuição do deck por status, com o total no centro e a legenda clicável.
// As cores são as dos status (tokens --color-status-*), iguais em todos os temas.
export interface FatiaDeStatus {
  status: string
  total: number
  /** Cor do traço, como variável CSS. */
  cor: string
  /** Classe do quadradinho da legenda e da barra, escrita por extenso. */
  classeCor: string
}

interface Props {
  fatias: FatiaDeStatus[]
  desenhado: boolean
  aoClicar: (status: string) => void
}

const RAIO = 15.9155 // circunferência de 100: a porcentagem vira comprimento de arco direto
const FOLGA = 0.9

export default function RoscaStatus({ fatias, desenhado, aoClicar }: Props) {
  const total = fatias.reduce((soma, f) => soma + f.total, 0)
  const comAnime = fatias.filter(f => f.total > 0)
  const arcos = comAnime.map((f, i) => {
    const anteriores = comAnime.slice(0, i).reduce((soma, x) => soma + x.total, 0)
    return {
      ...f,
      pct: (f.total / Math.max(total, 1)) * 100,
      inicio: (anteriores / Math.max(total, 1)) * 100,
    }
  })

  return (
    <div className="flex flex-col sm:flex-row xl:flex-col items-center gap-5 sm:gap-8 xl:gap-5 flex-1">
      <div className="relative w-44 h-44 shrink-0">
        <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90" role="img" aria-label={`Distribuição dos ${total} animes do deck por status`}>
          <circle cx="21" cy="21" r={RAIO} fill="transparent" stroke="var(--color-panel-2)" strokeWidth="4.5" />
          {arcos.map(a => (
            <circle
              key={a.status}
              className="anim-donut"
              cx="21"
              cy="21"
              r={RAIO}
              fill="transparent"
              stroke={a.cor}
              strokeWidth="4.5"
              strokeLinecap="butt"
              strokeDasharray={desenhado ? `${Math.max(a.pct - FOLGA, 0.5)} ${100 - Math.max(a.pct - FOLGA, 0.5)}` : '0 100'}
              strokeDashoffset={-a.inicio}
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
          <div>
            <div className="font-anton text-4xl leading-none tabular-nums">{total}</div>
            <div className="font-mono text-xs uppercase tracking-widest text-muted-2 mt-1">no deck</div>
          </div>
        </div>
      </div>

      <ul className="w-full flex-1 flex flex-col gap-1 m-0 p-0 list-none">
        {fatias.map(f => {
          const pct = (f.total / Math.max(total, 1)) * 100
          return (
            <li key={f.status}>
              <button
                type="button"
                onClick={() => aoClicar(f.status)}
                title={`Ver seus ${f.total} animes em "${f.status}"`}
                className="w-full grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-panel-2/70 cursor-pointer"
              >
                <span className={`w-2.5 h-2.5 rounded-sm ${f.classeCor}`} />
                <span className="truncate">{f.status}</span>
                <span className="font-mono text-xs text-muted-2 tabular-nums">{f.total}</span>
                <b className="font-mono text-xs tabular-nums w-9 text-right">{pct.toFixed(0)}%</b>
                <span className="col-span-4 h-1 mt-1.5 rounded-full bg-panel-2 overflow-hidden">
                  <span className={`block h-full rounded-full origin-left transition-transform duration-700 motion-reduce:transition-none ${f.classeCor} ${desenhado ? 'scale-x-100' : 'scale-x-0'}`} style={{ width: `${pct}%` }} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
