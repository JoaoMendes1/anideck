// client/src/components/comunidade/TextoComSpoiler.tsx
// Renderiza comentários e avaliações protegendo spoilers inteiros (contem_spoiler) ou
// trechos inline ||assim|| com revelação sob clique, sem nunca injetar HTML bruto.
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { particionarTextoSpoiler } from '../../lib/spoiler'

interface Props {
  texto: string
  contemSpoiler?: boolean
  compacto?: boolean
  aspas?: boolean
  className?: string
}

export default function TextoComSpoiler({
  texto,
  contemSpoiler = false,
  compacto = false,
  aspas = false,
  className = '',
}: Props) {
  const [reveladoTudo, setReveladoTudo] = useState(false)
  const [trechosRevelados, setTrechosRevelados] = useState<Record<number, boolean>>({})

  const partes = particionarTextoSpoiler(texto)

  const alternarTrecho = (idx: number) => {
    setTrechosRevelados(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  if (contemSpoiler && !reveladoTudo) {
    return (
      <div className={compacto ? 'mt-0.5' : 'mt-1.5'}>
        <button
          type="button"
          onClick={() => setReveladoTudo(true)}
          aria-expanded={false}
          className={`w-full text-left flex items-center justify-between gap-3 rounded-xl border border-coral/35 bg-panel-2/90 hover:border-coral/60 transition-colors cursor-pointer ${
            compacto ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-[13px]'
          }`}
        >
          <span className="inline-flex items-center gap-2 font-bold text-coral">
            <EyeOff size={14} aria-hidden />
            Contém spoiler
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-text">
            <Eye size={12} aria-hidden />
            Clique para revelar
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      {contemSpoiler && reveladoTudo && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-coral">Spoiler revelado</span>
          <button
            type="button"
            onClick={() => setReveladoTudo(false)}
            aria-expanded={true}
            className="inline-flex items-center gap-1 font-mono text-xs text-muted-2 hover:text-text cursor-pointer"
          >
            <EyeOff size={11} aria-hidden /> Ocultar
          </button>
        </div>
      )}
      <p className="text-[14px] text-text/90 leading-relaxed m-0 whitespace-pre-wrap break-words">
        {aspas ? '“' : ''}
        {partes.map((parte, idx) => {
          if (parte.tipo === 'texto') {
            return <span key={idx}>{parte.conteudo}</span>
          }
          const aberto = !!trechosRevelados[idx]
          return (
            <button
              key={idx}
              type="button"
              onClick={() => alternarTrecho(idx)}
              aria-expanded={aberto}
              aria-label={aberto ? 'Ocultar spoiler' : 'Revelar spoiler'}
              title={aberto ? 'Clique para ocultar novamente' : 'Clique para revelar spoiler'}
              className={`inline rounded px-1.5 py-0.5 mx-0.5 text-left align-baseline transition-all cursor-pointer border ${
                aberto
                  ? 'bg-panel-2/90 border-line text-text'
                  : 'bg-panel-2 border-coral/35 text-transparent select-none hover:border-holo-3/60'
              }`}
            >
              {aberto ? (
                <span>{parte.conteudo}</span>
              ) : (
                <span aria-hidden="true" className="blur-[5px] text-muted">
                  {parte.conteudo}
                </span>
              )}
            </button>
          )
        })}
        {aspas ? '”' : ''}
      </p>
    </div>
  )
}
