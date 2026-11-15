// client/src/components/inicio/GostoPoucoExplorado.tsx
// A categoria em que a pessoa dá nota acima da própria média e viu pouco. Mostra a
// comparação que gera a sugestão (as duas notas, lado a lado) em vez de só afirmá-la.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Gem } from 'lucide-react'

interface Props {
  rotulo: string
  nota: number
  mediaPessoal: number
  vistos: number
  /** O trilho com as obras sugeridas. */
  children: ReactNode
}

function Medida({ texto, valor, classeDaBarra, classeDoValor }: { texto: string; valor: number; classeDaBarra: string; classeDoValor: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-xs text-muted">{texto}</span>
        <b className={`font-anton text-xl tabular-nums ${classeDoValor}`}>{valor.toFixed(1)}</b>
      </div>
      <div className="h-2 rounded-full bg-panel-2 overflow-hidden">
        <span className={`block h-full rounded-full ${classeDaBarra}`} style={{ width: `${Math.min(100, Math.max(0, valor * 10))}%` }} />
      </div>
    </div>
  )
}

export default function GostoPoucoExplorado({ rotulo, nota, mediaPessoal, vistos, children }: Props) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-panel/70 p-5 sm:p-7 mb-11">
      <span aria-hidden className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 rounded-full bg-gold opacity-10 blur-3xl" />
      <div className="relative grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold m-0 mb-2 flex items-center gap-2">
            <Gem size={14} aria-hidden /> Gosto pouco explorado
          </p>
          <h2 className="font-anton uppercase text-3xl sm:text-4xl leading-none m-0">{rotulo}</h2>
          <p className="text-sm text-muted leading-relaxed mt-3 mb-4">
            Suas notas aqui ficam acima da sua média, e você só viu{' '}
            <b className="text-text">{vistos} {vistos === 1 ? 'obra' : 'obras'}</b>. Tem mais de onde essas vieram.
          </p>
          <div className="flex flex-col gap-3 mb-5">
            <Medida texto={`Sua nota em ${rotulo}`} valor={nota} classeDaBarra="bg-gradient-to-r from-gold/60 to-gold" classeDoValor="text-gold" />
            <Medida texto="Sua média geral" valor={mediaPessoal} classeDaBarra="bg-muted-2/70" classeDoValor="text-muted" />
          </div>
          <Link
            to={`/descobrir?rotulo=${encodeURIComponent(rotulo)}`}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full border border-gold/40 bg-gold/10 text-gold font-bold text-sm hover:bg-gold/20 transition-colors"
          >
            Ver tudo de {rotulo} <ChevronRight size={15} aria-hidden />
          </Link>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-2 m-0 mb-3">Curadas e ainda fora do seu Deck</p>
          {children}
        </div>
      </div>
    </section>
  )
}
