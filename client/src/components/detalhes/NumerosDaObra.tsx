// client/src/components/detalhes/NumerosDaObra.tsx
// Aba "Números" da página do anime: o que a comunidade da AniList diz sobre a obra, com a
// nota de quem está vendo marcada na distribuição.
import { motion } from 'framer-motion'
import { Star, Trophy, Users } from 'lucide-react'
import { formatarNota } from '../../lib/detalhes'

export interface EstatisticasDaObra {
  scores: { score: number; votes: number; percentage: number }[]
  statuses: { status: string; amount: number }[]
}

interface Props {
  nota: number
  ranking?: number
  stats: EstatisticasDaObra | null
  minhaNota: number | null
}

export default function NumerosDaObra({ nota, ranking, stats, minhaNota }: Props) {
  const totalStatus = stats?.statuses?.reduce((a, s) => a + s.amount, 0) || 0
  const pct = (status: string) => (totalStatus > 0 ? ((stats?.statuses?.find(s => s.status === status)?.amount ?? 0) / totalStatus) * 100 : 0)
  const votos = stats?.scores?.reduce((a, s) => a + s.votes, 0) ?? 0
  const maior = stats?.scores?.length ? Math.max(...stats.scores.map(s => s.percentage)) : 0
  // O backend já devolve as faixas de 1 a 10 (a AniList usa 10 a 100).
  const faixaMinha = minhaNota !== null ? Math.max(1, Math.round(minhaNota)) : null

  const cartoes = [
    { rotulo: 'Nota geral', valor: nota ? nota.toFixed(1) : '–', icone: <Star size={13} className="text-gold" aria-hidden />, cor: 'text-gold' },
    { rotulo: 'Ranking', valor: ranking ? `#${ranking}` : '–', icone: <Trophy size={13} className="text-gold" aria-hidden />, cor: 'text-text' },
    { rotulo: 'Completaram', valor: totalStatus ? `${pct('COMPLETED').toFixed(0)}%` : '–', icone: <Users size={13} className="text-green" aria-hidden />, cor: 'text-green' },
    { rotulo: 'Desistiram', valor: totalStatus ? `${pct('DROPPED').toFixed(0)}%` : '–', icone: <Users size={13} className="text-coral" aria-hidden />, cor: 'text-coral' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cartoes.map(c => (
          <div key={c.rotulo} className="bg-panel border border-line rounded-2xl p-4">
            <div className="font-mono text-[10px] text-muted-2 uppercase tracking-wider flex items-center gap-1.5">
              {c.icone} {c.rotulo}
            </div>
            <div className={`font-anton text-2xl mt-1 ${c.cor}`}>{c.valor}</div>
          </div>
        ))}
      </div>

      {stats?.scores?.length ? (
        <div className="bg-panel border border-line rounded-2xl p-5">
          <div className="flex items-baseline justify-between gap-2 mb-4">
            <h3 className="font-anton text-base uppercase m-0">Como a comunidade avaliou</h3>
            <span className="font-mono text-[10.5px] text-muted-2">{votos.toLocaleString('pt-BR')} avaliações</span>
          </div>
          <div className="flex items-end gap-1.5 h-[140px] mb-2">
            {[...stats.scores]
              .sort((a, b) => a.score - b.score)
              .map(s => {
                const altura = maior > 0 ? (s.percentage / maior) * 100 : 0
                const daFaixa = faixaMinha !== null && s.score === faixaMinha
                return (
                  <div key={s.score} className="flex-1 flex flex-col justify-end h-full relative">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${altura}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`rounded-t-sm w-full relative ${daFaixa ? 'bg-holo-3' : 'bg-gradient-to-t from-holo-2/50 to-holo-2'}`}
                    >
                      {daFaixa && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-holo-3 text-void text-[8px] font-black px-1 rounded">VOCÊ</span>
                      )}
                    </motion.div>
                  </div>
                )
              })}
          </div>
          <div className="flex justify-between font-mono text-[10px] text-muted-2 px-0.5 select-none">
            {[...stats.scores]
              .sort((a, b) => a.score - b.score)
              .map(s => (
                <span key={s.score} className="flex-1 text-center">
                  {s.score}
                </span>
              ))}
          </div>
          {minhaNota !== null && (
            <p className="text-[12.5px] text-muted mt-4 mb-0">
              Sua nota: <b className="text-holo-3">{formatarNota(minhaNota)}</b>
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">A distribuição de notas ainda não está disponível para esta obra.</p>
      )}
      <p className="font-mono text-[10.5px] text-muted-2 m-0">Fonte: AniList. Os números do AniDeck entram aqui quando a base crescer.</p>
    </div>
  )
}
