// client/src/components/inicio/ResumoGuildaCard.tsx
// A ficha da Guilda na coluna lateral da Início: rank, nível, XP de hoje, streak, Vitalidade, Mana e AniCoins.
import { Link } from 'react-router-dom'
import { Flame, Shield } from 'lucide-react'
import IconeAniCoin from '../IconeAniCoin'
import { obterEstiloRank } from '../../lib/guilda'
import { useResumoGuilda } from '../../hooks/useResumoGuilda'
import { useComunidade } from '../../hooks/useComunidade'
import { useCarteira } from '../../hooks/useCarteira'
import BarrasVitais from '../comunidade/BarrasVitais'

export default function ResumoGuildaCard() {
  const status = useResumoGuilda()
  const { estado } = useComunidade()
  const { saldo } = useCarteira()
  if (!status || !status.gamificacao_ativa) return null

  const estilo = obterEstiloRank(status.rank)
  const pctHoje = status.teto_diario > 0 ? Math.min(100, Math.round((status.xp_hoje / status.teto_diario) * 100)) : 0

  return (
    <Link
      to="/guilda"
      className="block bg-panel border border-line rounded-2xl p-4 hover:border-holo-2/50 transition-colors group"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] text-muted-2 uppercase tracking-widest flex items-center gap-1.5">
          <Shield size={12} className="text-holo-2" /> Sua ficha na Guilda
        </span>
        {status.streak_atual > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-green/40 bg-green/10 text-green font-mono text-[10px] font-bold">
            <Flame size={11} /> {status.streak_atual} {status.streak_atual === 1 ? 'dia' : 'dias'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className={`w-11 h-11 rounded-xl grid place-items-center font-anton text-xl shrink-0 ${estilo.seloBg}`}>{status.rank}</span>
        <div className="min-w-0">
          <div className="font-anton text-lg uppercase leading-none group-hover:text-holo-2 transition-colors">{status.titulo_rank}</div>
          <div className="font-mono text-[10.5px] text-muted mt-1">
            Nível <b className="text-text">{status.nivel}</b> · {status.xp_no_nivel}/{status.xp_para_proximo} XP
          </div>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-panel-2 overflow-hidden mb-3">
        <div className={`h-full ${estilo.corBarra}`} style={{ width: `${Math.min(100, Math.max(0, status.progresso_pct))}%` }} />
      </div>

      <div className="flex items-center justify-between font-mono text-[10px] text-muted-2">
        <span>
          Hoje: <b className="text-green">{status.xp_hoje}</b> / {status.teto_diario} XP
        </span>
        <span className="w-16 h-1.5 rounded-full bg-panel-2 overflow-hidden border border-line/40">
          <span className="block h-full bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_6px_rgba(16,185,129,0.4)]" style={{ width: `${pctHoje}%` }} />
        </span>
      </div>

      <div className="flex items-center justify-between font-mono text-[10.5px] mt-2.5 pt-2 border-t border-line/50">
        <span className="flex items-center gap-1.5 text-muted">
          <IconeAniCoin size={13} animar /> AniCoins
        </span>
        <span className="font-bold text-holo-3">{saldo.toLocaleString('pt-BR')} ₳</span>
      </div>

      {estado && (
        <div className="mt-4 pt-3 border-t border-line">
          <BarrasVitais estado={estado} compacta />
        </div>
      )}
    </Link>
  )
}
