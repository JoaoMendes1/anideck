// client/src/components/gosto/GraficoArea.tsx
// Linha suave com área preenchida, para a atividade por semana. Desenhada no tamanho real
// do bloco (sem esticar o SVG), então o traço e os pontos têm a mesma espessura em qualquer tela.
import { useId } from 'react'
import { useLargura } from '../../hooks/useLargura'
import { caminhoSuave, passoDosRotulos } from '../../lib/graficos'

interface Props {
  pontos: { rotulo: string; valor: number }[]
  desenhado: boolean
  unidade: string
  rotuloDoGrafico: string
}

const ALTURA_MINIMA = 208
const TOPO = 30
const BASE = 10
const LATERAL = 18

export default function GraficoArea({ pontos, desenhado, unidade, rotuloDoGrafico }: Props) {
  const [ref, largura, alturaMedida] = useLargura<HTMLDivElement>()
  // O gráfico ocupa a altura que o bloco tiver: ao lado de um painel mais alto, cresce junto.
  const ALTURA = Math.max(alturaMedida, ALTURA_MINIMA)
  const id = useId()
  const maior = Math.max(...pontos.map(p => p.valor), 1)
  const indiceDoMaior = pontos.findIndex(p => p.valor === maior)
  const util = Math.max(largura - LATERAL * 2, 1)
  const xy = pontos.map((p, i) => ({
    x: pontos.length === 1 ? largura / 2 : LATERAL + (i * util) / (pontos.length - 1),
    y: TOPO + (1 - p.valor / maior) * (ALTURA - TOPO - BASE),
  }))
  const linha = caminhoSuave(xy)
  const area = xy.length > 1 ? `${linha} L${xy[xy.length - 1].x},${ALTURA} L${xy[0].x},${ALTURA} Z` : ''
  const passo = passoDosRotulos(pontos.length, largura, 52)
  const valoresSempre = largura / Math.max(pontos.length, 1) >= 30

  return (
    <div className="w-full min-w-0 flex-1 flex flex-col">
      <div ref={ref} className="relative flex-1 min-h-52">
        {largura > 0 && (
          <svg width={largura} height={ALTURA} role="img" aria-label={rotuloDoGrafico} className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${desenhado ? 'opacity-100' : 'opacity-0'}`}>
            <defs>
              <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-holo-3)" stopOpacity="0.38" />
                <stop offset="100%" stopColor="var(--color-holo-2)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`${id}-linha`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-holo-2)" />
                <stop offset="100%" stopColor="var(--color-holo-3)" />
              </linearGradient>
            </defs>
            {[TOPO, (TOPO + ALTURA - BASE) / 2, ALTURA - BASE].map((y, i) => (
              <line key={y} x1="0" x2={largura} y1={y} y2={y} stroke="var(--color-line)" strokeDasharray={i === 2 ? undefined : '4 5'} strokeOpacity={i === 2 ? 1 : 0.7} />
            ))}
            {area && <path d={area} fill={`url(#${id}-area)`} />}
            <path d={linha} fill="none" stroke={`url(#${id}-linha)`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {xy.map((p, i) => {
              const ehMaior = i === indiceDoMaior
              return (
                <g key={pontos[i].rotulo + i} className="group">
                  <title>{`${pontos[i].rotulo}: ${pontos[i].valor} ${unidade}`}</title>
                  <rect x={p.x - util / Math.max(pontos.length - 1, 1) / 2} y="0" width={util / Math.max(pontos.length - 1, 1)} height={ALTURA} fill="transparent" />
                  {ehMaior && <circle cx={p.x} cy={p.y} r="9" fill="var(--color-holo-3)" fillOpacity="0.18" />}
                  <circle cx={p.x} cy={p.y} r={ehMaior ? 4.5 : 3.5} fill="var(--color-void)" stroke="var(--color-holo-3)" strokeWidth="2" />
                  <text
                    x={p.x}
                    y={p.y - 11}
                    textAnchor="middle"
                    className={`font-mono text-xs tabular-nums transition-opacity ${ehMaior ? 'fill-holo-3 font-bold' : 'fill-muted'} ${valoresSempre || ehMaior ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    {pontos[i].valor}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </div>
      <div aria-hidden className="relative h-4 mt-2">
        {largura > 0 && xy.map((p, i) => (
          i % passo === 0 && (
            <span key={pontos[i].rotulo + i} className="absolute -translate-x-1/2 font-mono text-xs text-muted-2 whitespace-nowrap" style={{ left: Math.min(Math.max(p.x, 22), largura - 22) }}>
              {pontos[i].rotulo}
            </span>
          )
        ))}
      </div>
    </div>
  )
}
