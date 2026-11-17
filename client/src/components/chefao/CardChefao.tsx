// client/src/components/chefao/CardChefao.tsx
// Card do Chefão da Temporada para a Início (principal ou coluna lateral) e Guilda (#185, #275).
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Swords, Trophy, ShieldAlert, Award, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import IconeAniCoin from '../IconeAniCoin'
import {
  obterStatusChefao,
  calcularPorcentagemHP,
  obterClasseBarraHP,
  type StatusChefao,
} from '../../lib/chefao'
import { formatarTemporada } from '../../lib/dataHora'

interface Props {
  chefao?: StatusChefao | null
  compacto?: boolean
  minimizada?: boolean
  onAlternarMinimizar?: () => void
  className?: string
}

export default function CardChefao({
  chefao: chefaoProp,
  compacto = false,
  minimizada = false,
  onAlternarMinimizar,
  className = '',
}: Props) {
  const [chefaoLocal, setChefaoLocal] = useState<StatusChefao | null>(chefaoProp ?? null)
  const [carregando, setCarregando] = useState(chefaoProp === undefined)

  useEffect(() => {
    if (chefaoProp !== undefined) {
      setChefaoLocal(chefaoProp)
      setCarregando(false)
      return
    }

    let ativo = true
    const recarregar = () => {
      obterStatusChefao()
        .then((dados) => {
          if (ativo && dados) setChefaoLocal(dados)
        })
        .catch(() => {
          // Mantém o estado anterior em caso de falha transitória.
        })
        .finally(() => {
          if (ativo) setCarregando(false)
        })
    }

    recarregar()
    window.addEventListener('anideck:episodio-atualizado', recarregar)

    return () => {
      ativo = false
      window.removeEventListener('anideck:episodio-atualizado', recarregar)
    }
  }, [chefaoProp])

  if (carregando || !chefaoLocal || !chefaoLocal.ativo) return null
  const chefao = chefaoLocal

  const porcentagem = calcularPorcentagemHP(chefao.hp_restante, chefao.hp_total)
  const estiloBarra = obterClasseBarraHP(porcentagem)

  return (
    <div
      className={`relative ${compacto ? 'p-3.5' : 'p-4 sm:p-5'} rounded-2xl bg-gradient-to-br from-panel via-panel-2 to-panel border border-coral/30 overflow-hidden shadow-lg ${className}`}
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-coral/10 blur-3xl rounded-full pointer-events-none" />

      <div className={`flex items-start justify-between gap-2.5 relative z-10 ${minimizada ? '' : 'mb-3'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`${compacto ? 'w-10 h-10 text-xl' : 'w-12 h-12 text-2xl'} rounded-xl bg-coral/20 border border-coral/40 flex items-center justify-center shadow-inner shrink-0`}>
            {chefao.arte_url || '🐉'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-coral bg-coral/15 px-2 py-0.5 rounded-full border border-coral/30">
                {compacto ? 'Chefão' : 'Chefão da Temporada'}
              </span>
              {!compacto && (
                <span className="font-mono text-xs text-muted">
                  {formatarTemporada(chefao.temporada)}
                </span>
              )}
            </div>

            <h3 className={`font-anton ${compacto ? 'text-base' : 'text-lg sm:text-xl'} text-text truncate m-0 mt-0.5 tracking-wide`}>
              {chefao.nome}
            </h3>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {!compacto && (
            chefao.derrotado ? (
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-green/20 border border-green/40 text-green">
                <Trophy size={11} /> Derrotado!
              </span>
            ) : chefao.status === 'escapou' ? (
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-panel-2 border border-line text-muted">
                Escapou
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-coral/20 border border-coral/40 text-coral animate-pulse">
                <Swords size={11} /> Em Batalha
              </span>
            )
          )}
          {onAlternarMinimizar && (
            <button
              type="button"
              onClick={onAlternarMinimizar}
              aria-label={minimizada ? 'Expandir chefão' : 'Minimizar chefão'}
              className="w-7 h-7 rounded-full bg-panel border border-line hover:border-coral text-muted hover:text-text grid place-items-center cursor-pointer"
            >
              {minimizada ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
        </div>
      </div>

      {!minimizada && (
        <>
          <div className="relative z-10 mb-3">
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-muted flex items-center gap-1">
                <ShieldAlert size={12} className="text-coral" />
                <span>HP</span>
              </span>
              <span className={`font-bold ${estiloBarra.texto}`}>
                {(chefao.hp_restante ?? 0).toLocaleString('pt-BR')} / {(chefao.hp_total ?? 0).toLocaleString('pt-BR')} ({porcentagem}%)
              </span>
            </div>

            <div className="h-2.5 w-full bg-void/80 rounded-full overflow-hidden p-0.5 border border-line/60">
              <div
                className={`h-full rounded-full transition-all duration-700 ${estiloBarra.barra}`}
                style={{ width: `${porcentagem}%` }}
              />
            </div>
          </div>

          <div className={`flex ${compacto ? 'flex-col items-start gap-2' : 'flex-col sm:flex-row sm:items-center justify-between gap-2.5'} pt-2.5 border-t border-line/50 relative z-10`}>
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <span className="text-muted">Seu Dano:</span>
              <span className="font-bold text-text">{(chefao.meu_dano ?? 0).toLocaleString('pt-BR')} HP</span>

              {chefao.elegivel_recompensa ? (
                <span className="inline-flex items-center gap-1 text-xs text-gold font-bold px-2 py-0.5 rounded-md bg-gold/15 border border-gold/30">
                  <Award size={11} /> Elegível ({chefao.recompensa_anicoins} <IconeAniCoin size={10} />)
                </span>
              ) : (
                <span className="text-xs text-muted-2">
                  (faltam {Math.max(0, (chefao.dano_minimo ?? 50) - (chefao.meu_dano ?? 0))} HP)
                </span>
              )}
            </div>

            <Link
              to="/chefao"
              className="inline-flex items-center justify-center gap-1 text-xs font-bold font-mono uppercase tracking-wider text-coral hover:text-text transition-colors group"
            >
              <span>{compacto ? 'Ver batalha' : 'Ver Batalha Completa'}</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
