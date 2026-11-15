// client/src/components/gosto/GraficoColunas.tsx
// Colunas que sempre cabem na largura do bloco: nada de rolagem lateral nem de corte.
// Quando as colunas ficam estreitas, os rótulos de baixo passam a aparecer de N em N e o
// valor de cada coluna só aparece ao passar o mouse ou focar (a maior fica sempre marcada).
import { useLargura } from '../../hooks/useLargura'
import { passoDosRotulos } from '../../lib/graficos'

export interface Coluna {
  chave: string
  rotulo: string
  valor: number
  /** Texto do botão para leitor de tela e dica do mouse. */
  descricao: string
}

export type TomDasColunas = 'ciano' | 'ouro' | 'rosa'

const TONS: Record<TomDasColunas, { barra: string; texto: string }> = {
  ciano: { barra: 'bg-gradient-to-t from-holo-2 to-holo-3', texto: 'text-holo-3' },
  ouro: { barra: 'bg-gradient-to-t from-gold/55 to-gold', texto: 'text-gold' },
  rosa: { barra: 'bg-gradient-to-t from-holo-2 to-holo-1', texto: 'text-holo-1' },
}

interface Props {
  colunas: Coluna[]
  tom: TomDasColunas
  desenhado: boolean
  aoClicar?: (chave: string) => void
  /** Largura estimada de um rótulo de baixo, em px. */
  larguraDoRotulo?: number
  rotuloDoGrafico: string
}

export default function GraficoColunas({ colunas, tom, desenhado, aoClicar, larguraDoRotulo = 40, rotuloDoGrafico }: Props) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const t = TONS[tom]
  const maior = Math.max(...colunas.map(c => c.valor), 1)
  const passo = passoDosRotulos(colunas.length, largura, larguraDoRotulo)
  const valoresSempre = largura > 0 && largura / colunas.length >= 26
  const indiceDoMaior = colunas.findIndex(c => c.valor === maior)

  return (
    <div ref={ref} role="group" aria-label={rotuloDoGrafico} className="w-full min-w-0">
      <div className="relative h-44 sm:h-52">
        {/* Linhas de referência: topo, meio e base. */}
        <div aria-hidden className="absolute inset-x-0 top-6 bottom-0 flex flex-col justify-between pointer-events-none">
          <span className="border-t border-dashed border-line/70" />
          <span className="border-t border-dashed border-line/50" />
          <span className="border-t border-line" />
        </div>
        <div className="absolute inset-x-0 top-6 bottom-0 flex items-end gap-[3px] sm:gap-1.5">
          {colunas.map((c, i) => {
            const altura = c.valor > 0 ? Math.max((c.valor / maior) * 100, 3) : 0
            const ehMaior = i === indiceDoMaior
            const Elemento = aoClicar && c.valor > 0 ? 'button' : 'div'
            return (
              <Elemento
                key={c.chave}
                {...(Elemento === 'button' ? { type: 'button' as const, onClick: () => aoClicar?.(c.chave), title: c.descricao, 'aria-label': c.descricao } : {})}
                className={`group relative flex-1 min-w-0 h-full flex items-end justify-center rounded-t-md ${Elemento === 'button' ? 'cursor-pointer' : ''}`}
              >
                <span
                  className={`block w-full max-w-12 rounded-t-md origin-bottom transition-[transform,opacity] duration-700 ease-out motion-reduce:transition-none ${t.barra} ${ehMaior ? 'opacity-100' : 'opacity-60 group-hover:opacity-100 group-focus-visible:opacity-100'} ${desenhado ? 'scale-y-100' : 'scale-y-0'}`}
                  style={{ height: `${altura}%`, transitionDelay: `${Math.min(i * 30, 600)}ms` }}
                />
                {c.valor > 0 && (
                  <span
                    className={`absolute left-1/2 -translate-x-1/2 font-mono text-xs tabular-nums whitespace-nowrap pointer-events-none transition-opacity ${ehMaior ? `${t.texto} font-bold` : 'text-muted'} ${valoresSempre || ehMaior ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}
                    style={{ bottom: `calc(${altura}% + 4px)` }}
                  >
                    {c.valor}
                  </span>
                )}
              </Elemento>
            )
          })}
        </div>
      </div>
      <div aria-hidden className="flex gap-[3px] sm:gap-1.5 mt-2 h-4">
        {colunas.map((c, i) => (
          <span key={c.chave} className="relative flex-1 min-w-0">
            {i % passo === 0 && (
              <span className="absolute left-1/2 -translate-x-1/2 font-mono text-xs text-muted-2 tabular-nums whitespace-nowrap">{c.rotulo}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
