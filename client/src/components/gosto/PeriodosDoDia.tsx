// client/src/components/gosto/PeriodosDoDia.tsx
// Em que parte do dia a pessoa começa a assistir: quatro blocos comparáveis de relance,
// com o período dominante aceso.
import { Moon, Sun, Sunrise, Sunset } from 'lucide-react'

export interface Periodo {
  label: string
  total: number
}

const ICONES = { Madrugada: Moon, Manhã: Sunrise, Tarde: Sun, Noite: Sunset } as const
const FAIXAS: Record<string, string> = { Madrugada: '00h–05h', Manhã: '06h–11h', Tarde: '12h–17h', Noite: '18h–23h' }

interface Props {
  periodos: Periodo[]
  dominante: string
  /** Com pouco histórico nenhum período é destacado: seria ruído. */
  confiavel: boolean
  unidade: string
  desenhado: boolean
}

export default function PeriodosDoDia({ periodos, dominante, confiavel, unidade, desenhado }: Props) {
  const soma = periodos.reduce((s, p) => s + p.total, 0)
  const maior = Math.max(...periodos.map(p => p.total), 1)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4 gap-2.5 flex-1">
      {periodos.map(p => {
        const Icone = ICONES[p.label as keyof typeof ICONES] ?? Sun
        const aceso = confiavel && p.label === dominante && p.total > 0
        const pct = soma > 0 ? Math.round((p.total / soma) * 100) : 0
        return (
          <div
            key={p.label}
            className={`relative overflow-hidden rounded-xl border p-3.5 flex flex-col ${aceso ? 'border-holo-3/60 bg-holo-3/10' : 'border-line bg-panel-2/40'}`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className={`w-8 h-8 grid place-items-center rounded-lg ${aceso ? 'bg-holo-3/20 text-holo-3' : 'bg-panel-2 text-muted'}`}>
                <Icone size={16} aria-hidden />
              </span>
              <span className={`font-mono text-xs tabular-nums ${aceso ? 'text-holo-3 font-bold' : 'text-muted-2'}`}>{pct}%</span>
            </div>
            <div className={`font-bold text-sm ${aceso ? 'text-holo-3' : 'text-text'}`}>{p.label}</div>
            <div className="font-mono text-xs text-muted-2">{FAIXAS[p.label]}</div>
            <div className="mt-auto pt-3">
              <div className="font-anton text-2xl leading-none tabular-nums">
                {p.total} <span className="font-mono text-xs font-normal text-muted-2">{unidade}</span>
              </div>
              <div className="h-1.5 mt-2 rounded-full bg-panel-2 overflow-hidden">
                <span
                  className={`block h-full rounded-full origin-left transition-transform duration-700 motion-reduce:transition-none ${aceso ? 'bg-gradient-to-r from-holo-2 to-holo-3' : 'bg-muted-2/60'} ${desenhado ? 'scale-x-100' : 'scale-x-0'}`}
                  style={{ width: `${(p.total / maior) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
