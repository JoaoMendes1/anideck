// client/src/components/inicio/CardDesafioClaInicio.tsx
// Card do Desafio do Clã exibido na Início (coluna principal ou barra lateral compacta).
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, ChevronRight, CheckCircle2, Award, Trophy, ChevronDown, ChevronUp } from 'lucide-react'
import { useSessao } from '../../contexts/SessaoContext'
import IconeAniCoin from '../IconeAniCoin'
import { obterMeuDesafioClaResumo, type MeuDesafioClaResumo } from '../../lib/clas'

interface Props {
  compacto?: boolean
  minimizada?: boolean
  onAlternarMinimizar?: () => void
  className?: string
}

export default function CardDesafioClaInicio({
  compacto = false,
  minimizada = false,
  onAlternarMinimizar,
  className = '',
}: Props) {
  const { session } = useSessao()
  const [desafio, setDesafio] = useState<MeuDesafioClaResumo | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!session) {
      setDesafio(null)
      setCarregando(false)
      return
    }

    let montado = true
    const recarregar = () => {
      obterMeuDesafioClaResumo()
        .then((dados) => {
          if (montado && dados) setDesafio(dados)
        })
        .catch(() => {
          // Mantém o estado anterior em caso de falha transitória.
        })
        .finally(() => {
          if (montado) setCarregando(false)
        })
    }

    recarregar()
    window.addEventListener('anideck:episodio-atualizado', recarregar)

    return () => {
      montado = false
      window.removeEventListener('anideck:episodio-atualizado', recarregar)
    }
  }, [session])

  if (carregando || !desafio || !desafio.tem_cla || !desafio.cla_tag) {
    return null
  }

  const pct = Math.min(100, Math.max(0, desafio.progresso_pct ?? 0))
  const bateuMeta = desafio.concluido || (desafio.progresso_total ?? 0) >= (desafio.meta ?? 1)
  const minhaQtd = desafio.minha_contribuicao ?? 0
  const apto = minhaQtd >= 1

  return (
    <section
      className={`${compacto ? 'p-3.5 rounded-2xl' : 'mb-6 rounded-[22px] p-4 sm:p-5'} border border-holo-2/30 bg-gradient-to-r from-panel/95 via-panel-2/90 to-panel/95 shadow-lg backdrop-blur-md ${className}`}
    >
      <div className={`flex items-start justify-between gap-2.5 ${minimizada ? '' : 'mb-3'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-void/80 border border-holo-2/40 flex items-center justify-center shrink-0 text-holo-3">
            <Shield size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-holo-3 px-1.5 py-px rounded bg-holo-3/15 border border-holo-3/30">
                [{desafio.cla_tag}]
              </span>
              {!compacto && (
                <span className="text-xs font-bold text-muted truncate">
                  {desafio.cla_nome}
                </span>
              )}
              {bateuMeta && (
                <span className="text-xs font-mono font-bold text-green flex items-center gap-1 bg-green/15 px-2 py-px rounded-full border border-green/30">
                  <Trophy size={10} /> Meta!
                </span>
              )}
            </div>
            <h3 className={`font-anton ${compacto ? 'text-sm' : 'text-base'} uppercase text-text m-0 truncate mt-0.5`}>
              {desafio.titulo}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!compacto && (
            <Link
              to={`/clas/${desafio.cla_tag}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-holo-3 hover:text-text transition-colors"
            >
              <span>Ver desafio do clã</span>
              <ChevronRight size={14} />
            </Link>
          )}
          {onAlternarMinimizar && (
            <button
              type="button"
              onClick={onAlternarMinimizar}
              aria-label={minimizada ? 'Expandir desafio do clã' : 'Minimizar desafio do clã'}
              className="w-7 h-7 rounded-full bg-panel border border-line hover:border-holo-2 text-muted hover:text-text grid place-items-center cursor-pointer"
            >
              {minimizada ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
        </div>
      </div>

      {!minimizada && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono gap-2">
            <span className="text-muted text-xs truncate">
              Coletivo:{' '}
              <strong className="text-text">
                {desafio.progresso_total} / {desafio.meta} {desafio.unidade}
              </strong>
            </span>
            <span className="font-bold text-holo-1 shrink-0">{pct}%</span>
          </div>

          <div className="h-2 w-full rounded-full bg-void/90 overflow-hidden border border-line/50">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                bateuMeta
                  ? 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : 'bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className={`flex ${compacto ? 'flex-col items-start gap-1.5' : 'items-center justify-between'} text-xs font-mono text-muted pt-1`}>
            <span>
              Sua parte:{' '}
              <strong className="text-holo-3">{minhaQtd} {desafio.unidade}</strong>
            </span>
            <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
              {apto ? (
                <span className="text-green flex items-center gap-1 font-bold">
                  <CheckCircle2 size={11} /> +{desafio.recompensa_anicoins} <IconeAniCoin size={10} />
                </span>
              ) : (
                <span className="text-gold flex items-center gap-1 font-bold">
                  <Award size={11} /> +1 {desafio.unidade} = +{desafio.recompensa_anicoins} <IconeAniCoin size={10} />
                </span>
              )}
              {compacto && (
                <Link
                  to={`/clas/${desafio.cla_tag}`}
                  className="inline-flex items-center gap-0.5 text-xs font-bold text-holo-3 hover:text-text ml-auto"
                >
                  Clã <ChevronRight size={13} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
