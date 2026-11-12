// client/src/components/inicio/CardMissoesDiarias.tsx
// Card das 3 missões diárias com progresso e resgate atômico de AniCoins (Fase 16, #168).
import { useState } from 'react'
import {
  Target, Play, Calendar, Heart, MessageSquare, CheckCircle2,
  ChevronDown, ChevronUp, Sparkles, Gift, Check,
} from 'lucide-react'
import IconeAniCoin from '../IconeAniCoin'
import { useMissoesHoje, type MissaoDiariaItem } from '../../hooks/useMissoesHoje'

function renderIcone(nome: string) {
  switch (nome) {
    case 'Calendar':
      return <Calendar size={16} className="text-holo-2" />
    case 'Heart':
      return <Heart size={16} className="text-coral" />
    case 'MessageSquare':
      return <MessageSquare size={16} className="text-holo-3" />
    case 'CheckCircle2':
      return <CheckCircle2 size={16} className="text-green" />
    case 'Play':
    default:
      return <Play size={16} className="text-gold fill-gold/20" />
  }
}

export default function CardMissoesDiarias() {
  const { missoes, concluidas, total, todasResgatadas, carregando, resgatandoId, resgatar } = useMissoesHoje()
  const [expandido, setExpandido] = useState(true)

  if (carregando && missoes.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-panel border border-line shimmer mb-6">
        <div className="h-5 w-40 bg-panel-2 rounded mb-2" />
        <div className="h-4 w-60 bg-panel-2 rounded" />
      </div>
    )
  }

  if (missoes.length === 0) return null

  const pendentesResgate = missoes.filter(m => m.concluida && !m.resgatada).length

  return (
    <section
      id="missoes-diarias-card"
      className="rounded-2xl border border-line bg-panel/90 backdrop-blur-md overflow-hidden mb-6 transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]"
    >
      {/* Cabeçalho do Card */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-line/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0 text-gold shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            <Target size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-anton text-lg sm:text-xl uppercase tracking-wide m-0 text-text">
                Missões do Dia
              </h3>
              <span className={`px-2 py-0.5 rounded-full font-mono text-[10.5px] font-bold border ${
                todasResgatadas
                  ? 'bg-green/15 border-green/40 text-green'
                  : concluidas === total
                  ? 'bg-gold/15 border-gold/40 text-gold animate-pulse'
                  : 'bg-panel-2 border-line text-muted'
              }`}>
                {concluidas}/{total} {concluidas === total ? 'Completas!' : 'Concluídas'}
              </span>
              {pendentesResgate > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-holo-3/15 border border-holo-3/40 text-holo-3 font-mono text-[10px] font-bold animate-bounce">
                  <Gift size={11} /> {pendentesResgate} pronta{pendentesResgate > 1 ? 's' : ''} para resgate!
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5 m-0 truncate">
              Ganhe AniCoins todos os dias assistindo animes e participando da comunidade
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-panel-2 border border-line/80 font-mono text-xs text-muted">
            <IconeAniCoin size={14} />
            <span>Recompensas em <b className="text-holo-3">AniCoins</b></span>
          </div>

          <button
            type="button"
            onClick={() => setExpandido(v => !v)}
            aria-label={expandido ? 'Recolher missões' : 'Expandir missões'}
            className="w-8 h-8 rounded-full bg-panel-2 border border-line hover:border-holo-2 text-muted hover:text-text grid place-items-center cursor-pointer transition-colors"
          >
            {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Conteúdo Expansível com as Missões */}
      {expandido && (
        <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-panel-2/30">
          {missoes.map((m: MissaoDiariaItem) => {
            const prog = typeof m.progresso === 'number' && !isNaN(m.progresso) ? m.progresso : 0
            const meta = typeof m.meta === 'number' && !isNaN(m.meta) && m.meta > 0 ? m.meta : 1
            const pct = Math.min(100, Math.max(0, Math.round((prog / meta) * 100)))
            const faltam = Math.max(0, meta - prog)
            const emResgate = resgatandoId === m.id
            const recompensa = typeof m.recompensa_cristais === 'number' && !isNaN(m.recompensa_cristais)
              ? m.recompensa_cristais
              : 15

            return (
              <div
                key={m.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  m.resgatada
                    ? 'bg-panel-2/40 border-line/40 opacity-75'
                    : m.concluida
                    ? 'bg-panel-2/90 border-gold/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-gold/20'
                    : 'bg-panel-2/70 border-line/70 hover:border-line'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-panel border border-line flex items-center justify-center shrink-0">
                        {renderIcone(m.icone)}
                      </div>
                      <span className="font-anton text-sm uppercase tracking-wide truncate text-text">
                        {m.titulo}
                      </span>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold text-holo-3 bg-holo-3/10 border border-holo-3/20">
                      <IconeAniCoin size={12} />
                      +{recompensa}
                    </span>
                  </div>

                  <p className="text-[11.5px] text-muted leading-snug line-clamp-2 m-0 mb-3">
                    {m.descricao}
                  </p>
                </div>

                <div>
                  {/* Barra de Progresso com gradiente e porcentagem */}
                  <div className="flex items-center justify-between font-mono text-[10px] text-muted-2 mb-1.5">
                    <span>Progresso</span>
                    <span className="font-bold text-text">
                      {prog} <span className="text-muted-2">/ {meta}</span>
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-void/80 overflow-hidden border border-line/50 mb-3">
                    <div
                      className={`h-full transition-all duration-700 rounded-full ${
                        m.resgatada
                          ? 'bg-green/60'
                          : m.concluida
                          ? 'bg-gradient-to-r from-gold via-amber-400 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                          : 'bg-gradient-to-r from-holo-3 via-cyan-400 to-sky-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Ação de Resgate / Status */}
                  {m.resgatada ? (
                    <div className="w-full py-1.5 px-3 rounded-lg bg-green/10 border border-green/30 text-green font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 select-none">
                      <Check size={13} /> Recompensa Coletada
                    </div>
                  ) : m.concluida ? (
                    <button
                      type="button"
                      disabled={emResgate}
                      onClick={() => resgatar(m.id)}
                      className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-gold via-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-void font-extrabold text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.35)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles size={13} fill="currentColor" />
                      {emResgate ? 'Resgatando...' : `Resgatar +${recompensa} ₳`}
                    </button>
                  ) : (
                    <div className="w-full py-1.5 px-2 rounded-lg bg-panel border border-line/40 text-muted-2 font-mono text-[10.5px] text-center select-none truncate">
                      {prog === 0 ? 'Não iniciada' : `Faltam ${faltam}`}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
