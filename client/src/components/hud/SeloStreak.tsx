// client/src/components/hud/SeloStreak.tsx
// Dias seguidos assistindo, com a semana em sete losangos. Com sete dias ou mais, o selo
// muda para o estado de semana completa.
import { diasDaSemanaDoStreak, rotuloDoStreak } from '../../lib/insignias'

const CLASSE_DO_DIA = {
  apagado: 'bg-text/10 border-text/15',
  aceso: 'bg-gradient-to-br from-[#FFE29A] to-[#FF9A3C] border-[#FFF0B8] shadow-[0_0_7px_#FF9A3C]',
  completo: 'bg-gradient-to-br from-[#FFF0B8] via-gold to-holo-1 border-white shadow-[0_0_9px_#FFC542]',
} as const

interface Props {
  dias: number
  /** Uma linha só, sem a trilha da semana: para onde o espaço é curto (celular). */
  compacto?: boolean
}

export default function SeloStreak({ dias, compacto = false }: Props) {
  const semana = diasDaSemanaDoStreak(dias)
  const completa = semana[0] === 'completo'

  if (compacto) {
    return (
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 h-7 pl-1.5 pr-2.5 rounded-full border text-xs font-extrabold whitespace-nowrap text-[#FFC58F] ${
          completa ? 'border-gold/65 bg-[#FF9A3C]/20' : 'border-[#FF9A3C]/45 bg-[#FF9A3C]/12'
        }`}
      >
        <svg className="streak-chama" width="15" height="15" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2c1.2 3.6 5.2 5.4 5.2 11.2a5.2 5.2 0 0 1-10.4 0c0-2.6 1.3-4.2 2.5-5.3.2 1.8 1 2.9 2.2 3.2C11.1 8.1 10.7 5 12 2z" fill={completa ? '#FFC542' : '#FF9A3C'} />
        </svg>
        <b className="font-anton text-sm leading-none text-[#FFE29A] tabular-nums">{dias}</b>
        {rotuloDoStreak(dias)}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-2.5 py-1.5 pl-2 pr-4 rounded-[14px] border ${
        completa
          ? 'border-gold/65 bg-gradient-to-r from-[#FF9A3C]/25 via-holo-1/10 to-gold/15 shadow-[0_0_22px_rgba(255,154,60,0.25)]'
          : 'border-[#FF9A3C]/45 bg-gradient-to-r from-[#FF9A3C]/20 via-gold/5 to-panel/80 shadow-[0_4px_18px_rgba(255,154,60,0.12)]'
      }`}
    >
      <span className="w-[30px] h-[30px] shrink-0 grid place-items-center rounded-[10px] border border-[#FF9A3C]/30 bg-[radial-gradient(circle_at_50%_65%,rgba(255,154,60,0.32),rgba(255,154,60,0.05))]">
        <svg className="streak-chama" width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2c1.2 3.6 5.2 5.4 5.2 11.2a5.2 5.2 0 0 1-10.4 0c0-2.6 1.3-4.2 2.5-5.3.2 1.8 1 2.9 2.2 3.2C11.1 8.1 10.7 5 12 2z" fill={completa ? '#FFC542' : '#FF9A3C'} />
          <path d="M12 10.5c.9 1.7 2.6 2.5 2.6 4.6a2.6 2.6 0 0 1-5.2 0c0-1.4.9-2.4 1.7-3 .1.8.5 1.4 1.1 1.5-.4-1.1-.6-2-.2-3.1z" fill="#FFE29A" />
        </svg>
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="flex items-baseline gap-1.5">
          <b className="font-anton text-xl leading-none text-[#FFE29A] [text-shadow:0_0_10px_rgba(255,154,60,0.55)] tabular-nums">{dias}</b>
          <span className="text-xs font-extrabold text-[#FFC58F]">{rotuloDoStreak(dias)}</span>
        </span>
        <span className="flex items-center gap-1.5" role="img" aria-label={`Assistiu em ${semana.filter(d => d !== 'apagado').length} dos últimos 7 dias`}>
          {semana.map((estado, i) => (
            <span key={i} className={`w-[7px] h-[7px] rounded-[2px] rotate-45 border ${CLASSE_DO_DIA[estado]}`} />
          ))}
        </span>
      </span>
    </span>
  )
}
