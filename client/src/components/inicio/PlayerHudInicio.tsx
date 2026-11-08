// client/src/components/inicio/PlayerHudInicio.tsx
// HUD do Jogador no topo da Início: status de jogo em tempo real (XP, Vitalidade, Mana, AniCoins),
// Rank, nível, atalho para Quests diárias e preferências de gosto (Mobile & Desktop).
import { Link } from 'react-router-dom'
import {
  Heart, Droplet, Sparkles, SlidersHorizontal, Flame, Target, ChevronRight,
} from 'lucide-react'
import IconeAniCoin from '../IconeAniCoin'
import { obterEstiloRank } from '../../lib/guilda'
import { useResumoGuilda } from '../../hooks/useResumoGuilda'
import { useComunidade } from '../../hooks/useComunidade'
import { useCarteira } from '../../hooks/useCarteira'
import { useMissoesHoje } from '../../hooks/useMissoesHoje'

interface Props {
  nome: string | null
  dataHoje: string
  aoAbrirGosto: () => void
}

export default function PlayerHudInicio({ nome, dataHoje, aoAbrirGosto }: Props) {
  const status = useResumoGuilda()
  const { estado } = useComunidade()
  const { saldo } = useCarteira()
  const { concluidas, total, todasResgatadas } = useMissoesHoje()

  const estilo = status ? obterEstiloRank(status.rank) : null
  const hp = estado?.hp ?? 100
  const mana = estado ? Math.floor(estado.mana) : 50
  const mpMax = estado?.regras.mp_max ?? 50

  const pctXp = status && status.teto_diario > 0
    ? Math.min(100, Math.round((status.xp_hoje / status.teto_diario) * 100))
    : (status?.progresso_pct ?? 0)

  const pctHp = Math.min(100, Math.max(0, hp))
  const pctMana = mpMax > 0 ? Math.min(100, Math.max(0, Math.round((mana / mpMax) * 100))) : 0

  const rolarParaMissoes = () => {
    const el = document.getElementById('missoes-diarias-card')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <section className="mb-6 rounded-[22px] border border-line/80 bg-panel/85 backdrop-blur-md p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.35)] select-none transition-all">
      {/* LINHA SUPERIOR: Saudação, Rank Badge, Atalho de Quests e Ações de Gosto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        {/* Saudação e Rank */}
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <div className="min-w-0">
            <span className="font-mono text-[10px] text-muted-2 uppercase tracking-widest block mb-0.5">
              {dataHoje}
            </span>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-anton text-[clamp(1.25rem,2.5vw,1.75rem)] uppercase leading-none m-0 text-text truncate">
                {nome ? `Olá, ${nome}` : 'Sua Central'}
              </h1>

              {status && estilo && (
                <Link
                  to="/guilda"
                  title={`Rank ${status.rank} · ${status.titulo_rank}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-bold transition-all hover:scale-105 ${estilo.bordaPilula} ${estilo.fundoPilula}`}
                >
                  <span className={`w-4 h-4 rounded-full grid place-items-center font-anton text-[10px] ${estilo.seloBg}`}>
                    {status.rank}
                  </span>
                  <span className="text-text font-bold">{status.titulo_rank}</span>
                  <span className="text-muted-2">·</span>
                  <span className="text-holo-3">Rank {status.rank}</span>
                </Link>
              )}

              {status && status.streak_atual > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-green/35 bg-green/10 text-green font-mono text-[10.5px] font-bold">
                  <Flame size={12} className="fill-green/30" />
                  {status.streak_atual}d
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Atalhos: Quests do dia e Gosto */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Badge / Botão Quests */}
          <button
            type="button"
            onClick={rolarParaMissoes}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-bold border transition-all cursor-pointer ${
              todasResgatadas
                ? 'bg-green/10 border-green/30 text-green hover:bg-green/20'
                : concluidas === total
                ? 'bg-gold/15 border-gold/40 text-gold hover:bg-gold/25 animate-pulse'
                : 'bg-panel-2 border-line text-muted hover:text-text hover:border-holo-2'
            }`}
          >
            <Target size={13} className={concluidas === total ? 'text-gold' : 'text-holo-2'} />
            <span>{concluidas}/{total} Quests</span>
            <ChevronRight size={13} className="opacity-70" />
          </button>

          {/* Botões Ajustar meu gosto / Meu Gosto */}
          <button
            type="button"
            onClick={aoAbrirGosto}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-panel-2 border border-line hover:border-holo-2 text-xs font-bold text-text transition-colors cursor-pointer"
            title="Ajustar preferências de gênero e curadoria"
          >
            <SlidersHorizontal size={12} className="text-holo-2" />
            <span className="hidden sm:inline">Ajustar meu gosto</span>
            <span className="sm:hidden">Gosto</span>
          </button>

          <Link
            to="/meu-gosto"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-holo-2/15 border border-holo-2/30 text-xs font-bold text-holo-2 hover:bg-holo-2/25 transition-colors"
          >
            <Sparkles size={12} />
            <span>Meu Gosto →</span>
          </Link>
        </div>
      </div>

      {/* LINHA INFERIOR: 4 CHIPS DE STATUS VITAIS GAMER (XP, HP, Mana, AniCoins) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-3 border-t border-line/60">
        {/* 1. XP / NÍVEL */}
        <Link
          to="/guilda"
          className="p-2.5 sm:p-3 rounded-xl bg-panel-2/60 border border-line/70 hover:border-holo-3/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1 mb-1.5 font-mono text-[10.5px]">
            <span className="font-bold text-muted group-hover:text-text uppercase tracking-wider flex items-center gap-1">
              <span className="text-[10px] px-1 py-0.2 rounded bg-panel border border-line text-holo-3">XP</span>
              {status ? `Nv ${status.nivel}` : 'Nível'}
            </span>
            <span className="font-bold text-green">
              {status ? `${status.xp_hoje}/${status.teto_diario}` : '0/100'} <span className="text-muted-2 text-[9.5px]">XP</span>
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-void/80 overflow-hidden border border-line/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-green-400 shadow-[0_0_8px_rgba(16,185,129,0.45)] transition-all duration-700"
              style={{ width: `${pctXp}%` }}
            />
          </div>
        </Link>

        {/* 2. VITALIDADE (HP) */}
        <Link
          to="/guilda"
          className="p-2.5 sm:p-3 rounded-xl bg-panel-2/60 border border-line/70 hover:border-coral/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1 mb-1.5 font-mono text-[10.5px]">
            <span className="font-bold text-muted group-hover:text-text uppercase tracking-wider flex items-center gap-1">
              <Heart size={12} className="text-coral fill-coral/20" />
              <span>Vit</span>
            </span>
            <span className="font-bold text-coral">
              {hp}<span className="text-muted-2 text-[9.5px]">/100</span>
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-void/80 overflow-hidden border border-line/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-coral to-amber-500 shadow-[0_0_8px_rgba(255,107,107,0.45)] transition-all duration-700"
              style={{ width: `${pctHp}%` }}
            />
          </div>
        </Link>

        {/* 3. MANA (MP) */}
        <Link
          to="/guilda"
          className="p-2.5 sm:p-3 rounded-xl bg-panel-2/60 border border-line/70 hover:border-holo-3/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1 mb-1.5 font-mono text-[10.5px]">
            <span className="font-bold text-muted group-hover:text-text uppercase tracking-wider flex items-center gap-1">
              <Droplet size={12} className="text-holo-3 fill-holo-3/20" />
              <span>Mana</span>
            </span>
            <span className="font-bold text-holo-3">
              {mana}<span className="text-muted-2 text-[9.5px]">/{mpMax}</span>
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-void/80 overflow-hidden border border-line/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-holo-3 shadow-[0_0_8px_rgba(34,211,238,0.45)] transition-all duration-700"
              style={{ width: `${pctMana}%` }}
            />
          </div>
        </Link>

        {/* 4. ANICOINS */}
        <Link
          to="/guilda"
          className="p-2.5 sm:p-3 rounded-xl bg-panel-2/60 border border-line/70 hover:border-gold/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1 mb-1.5 font-mono text-[10.5px]">
            <span className="font-bold text-muted group-hover:text-text uppercase tracking-wider flex items-center gap-1">
              <IconeAniCoin size={13} animar />
              <span>AniCoins</span>
            </span>
            <span className="font-bold text-holo-3">
              {saldo.toLocaleString('pt-BR')} ₳
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-void/80 overflow-hidden border border-line/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-holo-3 shadow-[0_0_8px_rgba(245,158,11,0.45)] transition-all duration-700 w-full"
            />
          </div>
        </Link>
      </div>
    </section>
  )
}
