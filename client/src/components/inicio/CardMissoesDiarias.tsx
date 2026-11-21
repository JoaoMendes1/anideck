// client/src/components/inicio/CardMissoesDiarias.tsx
// Missões do dia e da semana, ordenadas por prioridade (prontas e em andamento primeiro).
import { useState, type ReactNode } from 'react'
import {
  Target, Play, Calendar, Heart, MessageSquare, CheckCircle2, ChevronDown, ChevronUp,
  Sparkles, Gift, Check, Flame, Compass, Shuffle, Rocket, Trophy, CalendarCheck, Hourglass,
  PenLine, Star,
} from 'lucide-react'
import IconeAniCoin from '../IconeAniCoin'
import { useMissoesHoje, type MissaoDiariaItem } from '../../hooks/useMissoesHoje'
import { textoDoPrazo } from '../../lib/missoes'
import { ordenarMissoesPorPrioridade } from '../../lib/inicioPreferencias'

const ICONES: Record<string, ReactNode> = {
  Calendar: <Calendar size={16} className="text-holo-2" />,
  CalendarCheck: <CalendarCheck size={16} className="text-holo-2" />,
  Heart: <Heart size={16} className="text-coral" />,
  MessageSquare: <MessageSquare size={16} className="text-holo-3" />,
  CheckCircle2: <CheckCircle2 size={16} className="text-green" />,
  Flame: <Flame size={16} className="text-coral" />,
  Compass: <Compass size={16} className="text-holo-1" />,
  Shuffle: <Shuffle size={16} className="text-holo-3" />,
  Rocket: <Rocket size={16} className="text-holo-2" />,
  Sparkles: <Sparkles size={16} className="text-gold" />,
  Target: <Target size={16} className="text-coral" />,
  Trophy: <Trophy size={16} className="text-gold" />,
  PenLine: <PenLine size={16} className="text-holo-3" />,
  Star: <Star size={16} className="text-gold" />,
}

function renderIcone(nome: string) {
  return ICONES[nome] ?? <Play size={16} className="text-gold fill-gold/20" />
}

interface CartaoProps {
  m: MissaoDiariaItem
  emResgate: boolean
  compacto?: boolean
  onResgatar: (id: string) => void
}

function CartaoMissao({ m, emResgate, compacto = false, onResgatar }: CartaoProps) {
  const prog = Number.isFinite(m.progresso) ? m.progresso : 0
  const meta = Number.isFinite(m.meta) && m.meta > 0 ? m.meta : 1
  const pct = Math.min(100, Math.max(0, Math.round((prog / meta) * 100)))
  const faltam = Math.max(0, meta - prog)
  const recompensa = Number.isFinite(m.recompensa_cristais) ? m.recompensa_cristais : 15
  const longa = m.periodo === 'semana'

  return (
    <div
      className={`${compacto ? 'p-3 gap-2' : 'p-3.5 gap-3'} rounded-xl border transition-all flex flex-col justify-between ${
        m.resgatada
          ? 'bg-panel-2/40 border-line/40 opacity-75'
          : m.concluida
          ? 'bg-panel-2/90 border-gold/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-gold/20'
          : longa
          ? 'bg-panel-2/70 border-holo-2/30 hover:border-holo-2/50'
          : 'bg-panel-2/70 border-line/70 hover:border-line'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`${compacto ? 'w-6 h-6' : 'w-7 h-7'} rounded-lg bg-panel border border-line flex items-center justify-center shrink-0`}>
              {renderIcone(m.icone)}
            </div>
            <span className={`font-anton ${compacto ? 'text-xs' : 'text-sm'} uppercase tracking-wide truncate text-text`}>
              {m.titulo}
            </span>
          </div>
          <div className="shrink-0 flex flex-wrap items-center justify-end gap-1">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-mono text-xs font-bold text-holo-3 bg-holo-3/10 border border-holo-3/20">
              <IconeAniCoin size={11} />+{recompensa}
            </span>
            {m.recompensa_xp > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-mono text-xs font-bold text-holo-2 bg-holo-2/10 border border-holo-2/25">
                +{m.recompensa_xp} XP
              </span>
            )}
          </div>
        </div>
        <p className={`text-xs text-muted leading-snug line-clamp-2 m-0 ${compacto ? 'mb-2' : 'mb-3'}`}>
          {m.descricao}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between font-mono text-xs text-muted-2 mb-1">
          <span>Progresso</span>
          <span className="font-bold text-text">
            {prog} <span className="text-muted-2">/ {meta}</span>
          </span>
        </div>
        <div className={`h-1.5 w-full rounded-full bg-void/80 overflow-hidden border border-line/50 ${compacto ? 'mb-2' : 'mb-3'}`}>
          <div
            className={`h-full transition-all duration-700 rounded-full ${
              m.resgatada
                ? 'bg-green/60'
                : m.concluida
                ? 'bg-gradient-to-r from-gold via-amber-400 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : longa
                ? 'bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3'
                : 'bg-gradient-to-r from-holo-3 via-cyan-400 to-sky-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {m.resgatada ? (
          <div className="w-full py-1.5 px-3 rounded-lg bg-green/10 border border-green/30 text-green font-mono text-xs font-bold flex items-center justify-center gap-1.5 select-none">
            <Check size={13} /> {compacto ? 'Coletada' : 'Recompensa Coletada'}
          </div>
        ) : m.concluida ? (
          <button
            type="button"
            disabled={emResgate}
            onClick={() => onResgatar(m.id)}
            className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-gold via-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-void font-extrabold text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.35)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles size={13} fill="currentColor" />
            {emResgate ? 'Resgatando...' : 'Resgatar'}
          </button>
        ) : (
          <div className="w-full py-1 px-2 rounded-lg bg-panel border border-line/40 text-muted-2 font-mono text-xs text-center select-none truncate">
            {prog === 0 ? 'Não iniciada' : `Faltam ${faltam}`}
          </div>
        )}
      </div>
    </div>
  )
}

interface CardMissoesDiariasProps {
  compacto?: boolean
  minimizada?: boolean
  onAlternarMinimizar?: () => void
  className?: string
}

export default function CardMissoesDiarias({
  compacto = false,
  minimizada,
  onAlternarMinimizar,
  className = '',
}: CardMissoesDiariasProps) {
  const { dados, missoes, longas, concluidas, total, todasResgatadas, carregando, resgatandoId, resgatar } = useMissoesHoje()
  const [expandidoLocal, setExpandidoLocal] = useState(true)
  const expandido = minimizada !== undefined ? !minimizada : expandidoLocal

  const alternar = () => {
    if (onAlternarMinimizar) onAlternarMinimizar()
    else setExpandidoLocal(v => !v)
  }

  if (carregando && missoes.length === 0) {
    return (
      <div className={`p-4 rounded-2xl bg-panel border border-line shimmer ${className || 'mb-6'}`}>
        <div className="h-5 w-40 bg-panel-2 rounded mb-2" />
        <div className="h-4 w-52 bg-panel-2 rounded" />
      </div>
    )
  }

  if (missoes.length === 0 && longas.length === 0) return null

  const missoesOrdenadas = ordenarMissoesPorPrioridade(missoes)
  const longasOrdenadas = ordenarMissoesPorPrioridade(longas)
  const pendentesResgate = [...missoes, ...longas].filter(m => m.concluida && !m.resgatada).length
  const prazo = dados?.longas_terminam_em ? textoDoPrazo(dados.longas_terminam_em) : ''

  return (
    <section
      id="missoes-diarias-card"
      className={`scroll-mt-28 rounded-2xl border border-line bg-panel/90 backdrop-blur-md overflow-hidden transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] ${className || (compacto ? '' : 'mb-6')}`}
    >
      <div className={`${compacto ? 'p-3.5' : 'p-4 sm:p-5'} flex items-center justify-between gap-2.5 ${expandido ? 'border-b border-line/60' : ''}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`${compacto ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0 text-gold shadow-[0_0_12px_rgba(245,158,11,0.2)]`}>
            <Target size={compacto ? 16 : 20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className={`font-anton ${compacto ? 'text-base' : 'text-lg sm:text-xl'} uppercase tracking-wide m-0 text-text`}>
                {compacto ? 'Missões' : 'Missões do Dia'}
              </h3>
              <span className={`px-2 py-0.5 rounded-full font-mono text-xs font-bold border ${
                todasResgatadas
                  ? 'bg-green/15 border-green/40 text-green'
                  : concluidas === total
                  ? 'bg-gold/15 border-gold/40 text-gold animate-pulse'
                  : 'bg-panel-2 border-line text-muted'
              }`}>
                {concluidas}/{total}
              </span>
              {pendentesResgate > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-holo-3/15 border border-holo-3/40 text-holo-3 font-mono text-xs font-bold">
                  <Gift size={11} /> {pendentesResgate}
                </span>
              )}
            </div>
            {dados?.genero_do_dia && (
              <p className="text-xs text-muted mt-0.5 m-0 truncate">
                Gênero do dia: <b className="text-holo-1">{dados.genero_do_dia}</b>
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={alternar}
          aria-label={expandido ? 'Recolher missões' : 'Expandir missões'}
          className="w-8 h-8 shrink-0 rounded-full bg-panel-2 border border-line hover:border-holo-2 text-muted hover:text-text grid place-items-center cursor-pointer transition-colors"
        >
          {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expandido && (
        <div className="bg-panel-2/30">
          <div className={compacto ? 'p-3 grid grid-cols-1 gap-2.5' : 'p-3 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-3'}>
            {missoesOrdenadas.map(m => (
              <CartaoMissao key={m.id} m={m} emResgate={resgatandoId === m.id} compacto={compacto} onResgatar={resgatar} />
            ))}
          </div>

          {longasOrdenadas.length > 0 && (
            <div className={compacto ? 'px-3 pb-3' : 'px-3 sm:px-4 pb-4'}>
              <div className="flex items-center justify-between gap-2 flex-wrap border-t border-line/60 pt-3 mb-2.5">
                <h4 className="font-manrope font-extrabold text-sm tracking-tight m-0 text-text inline-flex items-center gap-1.5">
                  <Trophy size={14} className="text-holo-2" /> Missões da Semana
                </h4>
                <span className="font-mono text-xs text-muted-2 inline-flex items-center gap-1">
                  <Hourglass size={11} aria-hidden /> {prazo || 'toda segunda'}
                </span>
              </div>
              <div className={compacto ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-1 md:grid-cols-3 gap-3'}>
                {longasOrdenadas.map(m => (
                  <CartaoMissao key={m.id} m={m} emResgate={resgatandoId === m.id} compacto={compacto} onResgatar={resgatar} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
