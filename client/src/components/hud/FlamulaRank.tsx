// client/src/components/hud/FlamulaRank.tsx
// Insígnia sobreposta a uma flâmula com o rank e o título, no lugar da antiga pílula.
import InsigniaRank from './InsigniaRank'
import { COR_DO_RANK, normalizarRank } from '../../lib/insignias'

interface Props {
  rank: string
  titulo: string
  /** Largura da insígnia; a flâmula acompanha a altura dela. */
  tamanho?: number
}

export default function FlamulaRank({ rank, titulo, tamanho = 52 }: Props) {
  const conhecido = normalizarRank(rank)
  const cor = COR_DO_RANK[conhecido]
  const sobreposicao = Math.round(tamanho / 3)

  return (
    <span className="inline-flex items-center drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]">
      <InsigniaRank rank={conhecido} tamanho={tamanho} className="relative z-[2]" />
      <span
        className="relative z-[1] flex flex-col justify-center gap-px pr-7 overflow-hidden [clip-path:polygon(0_0,100%_0,calc(100%-11px)_50%,100%_100%,0_100%)]"
        style={{
          marginLeft: -sobreposicao,
          paddingLeft: sobreposicao + 12,
          height: Math.round(tamanho * 0.82),
          background: `linear-gradient(90deg, ${cor}47, ${cor}0f)`,
          borderTop: `1px solid ${cor}66`,
          borderBottom: `1px solid ${cor}66`,
        }}
      >
        {/* Textura diagonal discreta, como o tecido de uma flâmula. */}
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_2px,transparent_2px,transparent_8px)]"
        />
        <span className="relative flex items-center gap-1.5 font-mono text-xs font-extrabold tracking-[0.16em] leading-tight" style={{ color: cor }}>
          RANK {conhecido}
          <span className="w-1 h-1 rounded-full" style={{ background: cor, boxShadow: `0 0 6px ${cor}` }} />
        </span>
        <span className="relative text-sm font-extrabold text-text whitespace-nowrap leading-tight [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
          {titulo}
        </span>
      </span>
    </span>
  )
}
