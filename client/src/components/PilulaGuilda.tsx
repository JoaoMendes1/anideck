import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { obterEstiloRank } from '../lib/guilda'
import { useResumoGuilda } from '../hooks/useResumoGuilda'

export default function PilulaGuilda() {
  const status = useResumoGuilda()

  if (!status) return null

  const estilo = obterEstiloRank(status.rank)

  return (
    <div className="flex items-center gap-2 select-none">
      {status.streak_atual > 0 && (
        <Link
          to="/meu-gosto"
          title={`Streak atual: ${status.streak_atual} ${status.streak_atual === 1 ? 'dia' : 'dias'}`}
          className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10.5px] font-bold border border-green/40 bg-green/12 text-green hover:bg-green/20 transition-colors"
        >
          <Flame size={12} className="fill-green/30" />
          {status.streak_atual}
        </Link>
      )}

      <Link
        to="/guilda"
        title={`Rank ${status.rank} · ${status.titulo_rank} (${status.xp_no_nivel}/${status.xp_para_proximo} XP)`}
        className={`flex items-center gap-2 py-1 pl-1.5 pr-2.5 rounded-full border transition-all hover:brightness-110 ${estilo.bordaPilula} ${estilo.fundoPilula}`}
      >
        <span
          className={`w-5 h-5 rounded-full grid place-items-center shrink-0 font-anton text-[11px] leading-none ${estilo.seloBg}`}
        >
          {status.rank}
        </span>
        <span className="flex flex-col gap-0.5 min-w-[64px] sm:min-w-[74px]">
          <span className="flex items-center justify-between gap-2 font-mono text-[9px] text-muted leading-none">
            <b className="text-text font-bold">Nv {status.nivel}</b>
            <span>
              {status.xp_no_nivel}/{status.xp_para_proximo}
            </span>
          </span>
          <span className="h-1 rounded-full bg-panel-2 overflow-hidden block">
            <i
              className={`block h-full transition-all duration-500 ${estilo.corBarra}`}
              style={{ width: `${Math.min(100, Math.max(0, status.progresso_pct))}%` }}
            />
          </span>
        </span>
      </Link>
    </div>
  )
}
