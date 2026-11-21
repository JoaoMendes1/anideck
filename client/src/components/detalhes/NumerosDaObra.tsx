// client/src/components/detalhes/NumerosDaObra.tsx
// Aba "Números" da página do anime: contagens agregadas da comunidade do AniDeck
// (sem expor usuários) e distribuição global de notas da AniList.
import { motion } from 'framer-motion'
import { Bookmark, CheckCircle2, Eye, Star, Trophy, Users, XCircle } from 'lucide-react'
import { formatarNota } from '../../lib/detalhes'
import {
  formatarContagemComunidade,
  formatarTotalComunidade,
  type NumerosComunidadeAnime,
} from '../../lib/comunidadeAnimes'

export interface EstatisticasDaObra {
  scores: { score: number; votes: number; percentage: number }[]
  statuses: { status: string; amount: number }[]
}

interface Props {
  nota: number
  ranking?: number
  stats: EstatisticasDaObra | null
  comunidade: NumerosComunidadeAnime | null
  minhaNota: number | null
}

export default function NumerosDaObra({ nota, ranking, stats, comunidade, minhaNota }: Props) {
  const totalStatus = stats?.statuses?.reduce((a, s) => a + s.amount, 0) || 0
  const pct = (status: string) => (totalStatus > 0 ? ((stats?.statuses?.find(s => s.status === status)?.amount ?? 0) / totalStatus) * 100 : 0)
  const votos = stats?.scores?.reduce((a, s) => a + s.votes, 0) ?? 0
  const maior = stats?.scores?.length ? Math.max(...stats.scores.map(s => s.percentage)) : 0
  // O backend já devolve as faixas de 1 a 10 (a AniList usa 10 a 100).
  const faixaMinha = minhaNota !== null ? Math.max(1, Math.round(minhaNota)) : null

  const cartoesComunidade = [
    {
      rotulo: 'Assistindo',
      detalhe: 'Inclui quem está em dia',
      valor: comunidade ? comunidade.assistindo : null,
      icone: <Eye size={13} className="text-holo-3" aria-hidden />,
      cor: 'text-holo-3',
      borda: 'border-holo-3/25',
    },
    {
      rotulo: 'Completo',
      detalhe: 'Já terminaram a obra',
      valor: comunidade ? comunidade.completo : null,
      icone: <CheckCircle2 size={13} className="text-green" aria-hidden />,
      cor: 'text-green',
      borda: 'border-green/25',
    },
    {
      rotulo: 'Dropado',
      detalhe: 'Pararam no caminho',
      valor: comunidade ? comunidade.dropado : null,
      icone: <XCircle size={13} className="text-coral" aria-hidden />,
      cor: 'text-coral',
      borda: 'border-coral/25',
    },
    {
      rotulo: 'Quero assistir',
      detalhe: 'Na fila para começar',
      valor: comunidade ? comunidade.quero_assistir : null,
      icone: <Bookmark size={13} className="text-gold" aria-hidden />,
      cor: 'text-gold',
      borda: 'border-gold/25',
    },
  ]

  const cartoes = [
    { rotulo: 'Nota geral', valor: nota ? nota.toFixed(1) : '–', icone: <Star size={13} className="text-gold" aria-hidden />, cor: 'text-gold' },
    { rotulo: 'Ranking', valor: ranking ? `#${ranking}` : '–', icone: <Trophy size={13} className="text-gold" aria-hidden />, cor: 'text-text' },
    { rotulo: 'Completaram', valor: totalStatus ? `${pct('COMPLETED').toFixed(0)}%` : '–', icone: <Users size={13} className="text-green" aria-hidden />, cor: 'text-green' },
    { rotulo: 'Desistiram', valor: totalStatus ? `${pct('DROPPED').toFixed(0)}%` : '–', icone: <Users size={13} className="text-coral" aria-hidden />, cor: 'text-coral' },
  ]

  return (
    <div className="space-y-6">
      <section className="surface-glass rounded-2xl p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <div>
            <p className="font-mono text-xs text-holo-3 uppercase tracking-widest m-0">No AniDeck</p>
            <h3 className="font-manrope font-extrabold text-base tracking-tight text-text m-0 mt-0.5">Comunidade nesta obra</h3>
          </div>
          <span className="font-mono text-xs text-muted-2">
            {comunidade
              ? comunidade.total < 0
                ? 'Menos de 3 pessoas no deck'
                : comunidade.total === 0
                  ? 'Nenhuma pessoa no deck ainda'
                  : `${formatarTotalComunidade(comunidade.total, Boolean(comunidade.total_aproximado))} pessoas no deck`
              : 'Carregando...'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cartoesComunidade.map(c => (
            <div key={c.rotulo} className={`bg-panel-2 border ${c.borda} rounded-2xl p-4`}>
              <div className="font-mono text-xs text-muted uppercase tracking-wider flex items-center gap-1.5">
                {c.icone} {c.rotulo}
              </div>
              <div className={`font-anton ${c.valor !== null && c.valor < 0 ? 'text-lg' : 'text-2xl'} mt-1 tabular-nums ${c.cor}`}>
                {c.valor !== null ? formatarContagemComunidade(c.valor) : '–'}
              </div>
              <div className="text-xs text-muted-2 mt-1">{c.detalhe}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cartoes.map(c => (
          <div key={c.rotulo} className="surface-glass rounded-2xl p-4">
            <div className="font-mono text-xs text-muted-2 uppercase tracking-wider flex items-center gap-1.5">
              {c.icone} {c.rotulo}
            </div>
            <div className={`font-anton text-2xl mt-1 tabular-nums ${c.cor}`}>{c.valor}</div>
          </div>
        ))}
      </div>

      {stats?.scores?.length ? (
        <div className="surface-glass rounded-2xl p-5">
          <div className="flex items-baseline justify-between gap-2 mb-4">
            <h3 className="font-manrope font-extrabold text-base tracking-tight text-text m-0">Como o público global avaliou</h3>
            <span className="font-mono text-xs text-muted-2 tabular-nums">{votos.toLocaleString('pt-BR')} avaliações</span>
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
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-holo-3 text-void text-xs font-black px-1 rounded">VOCÊ</span>
                      )}
                    </motion.div>
                  </div>
                )
              })}
          </div>
          <div className="flex justify-between font-mono text-xs text-muted-2 px-0.5 select-none">
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
        <p className="text-sm text-muted">A distribuição global de notas ainda não está disponível para esta obra.</p>
      )}
      <p className="font-mono text-xs text-muted-2 m-0">
        Contagens do bloco &quot;No AniDeck&quot; são agregadas pelos decks da comunidade. Notas e histórico global vêm da AniList.
      </p>
    </div>
  )
}
