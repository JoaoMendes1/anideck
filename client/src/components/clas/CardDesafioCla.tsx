// client/src/components/clas/CardDesafioCla.tsx
// Card do Desafio Semanal Coletivo do Clã (Fase 17, #181).
// Exibe meta proporcional, progresso em tempo real, recompensas e lista de contribuição dos membros.
import { useState, useEffect, useCallback } from 'react'
import {
  Play,
  Smile,
  CheckCircle2,
  MessageSquare,
  Trophy,
  Clock,
  Sparkles,
  Users,
  ShieldCheck,
  Award,
} from 'lucide-react'
import { useSessao } from '../../contexts/SessaoContext'
import IconeAniCoin from '../IconeAniCoin'
import {
  obterDesafioCla,
  type DesafioCla,
  type MembroContribuicaoDesafio,
} from '../../lib/clas'

interface Props {
  tag: string
  claId?: string
  souMembro?: boolean
}

export default function CardDesafioCla({ tag, souMembro }: Props) {
  const { session } = useSessao()
  const userId = session?.user?.id

  const [desafio, setDesafio] = useState<DesafioCla | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      setCarregando(true)
      setErro(null)
      const dados = await obterDesafioCla(tag)
      setDesafio(dados)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar o desafio')
    } finally {
      setCarregando(false)
    }
  }, [tag])

  useEffect(() => {
    carregar()
  }, [carregar])

  if (carregando) {
    return (
      <div className="rounded-3xl bg-panel/60 border border-line p-6 mb-10 animate-pulse">
        <div className="h-6 w-48 bg-panel-2 rounded-lg mb-4" />
        <div className="h-4 w-full bg-panel-2 rounded-lg mb-3" />
        <div className="h-24 bg-panel-2 rounded-2xl" />
      </div>
    )
  }

  if (erro || !desafio) {
    return null
  }

  const renderIconeTipo = (icone: string) => {
    switch (icone) {
      case 'Play':
        return <Play size={18} className="text-holo-1 fill-holo-1/20" />
      case 'Smile':
        return <Smile size={18} className="text-gold" />
      case 'CheckCircle2':
        return <CheckCircle2 size={18} className="text-green" />
      case 'MessageSquare':
        return <MessageSquare size={18} className="text-holo-3" />
      default:
        return <Sparkles size={18} className="text-holo-2" />
    }
  }

  const pct = Math.min(100, Math.max(0, desafio.progresso_pct))
  const bateuMeta = desafio.concluido || desafio.progresso_total >= desafio.meta
  const elegiveis = desafio.contribuicoes.filter((c) => c.elegivel).length
  const totalMembros = desafio.contribuicoes.length
  const minhaContribuicao = desafio.contribuicoes.find((c) => c.user_id === userId)

  return (
    <section className="rounded-3xl bg-panel/80 border border-line/90 shadow-2xl backdrop-blur-md overflow-hidden mb-10 transition-all">
      {/* CABEÇALHO DO DESAFIO */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-panel via-panel-2/60 to-panel border-b border-line/70">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-void/80 border border-line flex items-center justify-center shrink-0 shadow-inner">
              {renderIconeTipo(desafio.icone)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-holo-2/15 border border-holo-2/30 text-holo-2">
                  Desafio da Semana · {desafio.semana}
                </span>

                {bateuMeta ? (
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-green/15 border border-green/35 text-green flex items-center gap-1 shadow-[0_0_12px_rgba(160,255,120,0.25)]">
                    <Trophy size={11} /> Meta Batida!
                  </span>
                ) : (
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-holo-3/15 border border-holo-3/30 text-holo-3 flex items-center gap-1">
                    <Clock size={11} /> Em andamento
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-text m-0 flex items-center gap-2">
                {desafio.titulo}
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-1 m-0">
                {desafio.descricao}
              </p>
            </div>
          </div>

          {/* RECOMPENSA DE ANICOINS */}
          <div className="px-4 py-3 rounded-2xl bg-void/70 border border-line/80 flex items-center gap-3 shrink-0 shadow-md">
            <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
              <IconeAniCoin size={18} />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase font-bold text-muted block">Recompensa</span>
              <span className="font-anton text-lg text-gold flex items-center gap-1.5">
                +{desafio.recompensa_anicoins} <span className="font-sans text-xs font-semibold text-text">AniCoins / membro</span>
              </span>
            </div>
          </div>
        </div>

        {/* BARRA DE PROGRESSO COLETIVO */}
        <div className="mt-6 pt-5 border-t border-line/50">
          <div className="flex items-center justify-between gap-2 mb-2 font-mono text-xs">
            <span className="text-muted flex items-center gap-1.5 font-bold">
              <Users size={13} className="text-holo-3" /> Progresso do Clã
            </span>
            <span className="font-bold text-text">
              <span className="text-holo-3 text-sm">{desafio.progresso_total}</span>
              <span className="text-muted"> / {desafio.meta} {desafio.unidade}</span>
              <span className="ml-2 px-1.5 py-0.2 rounded bg-panel-2 border border-line text-[11px] text-holo-1">
                {pct}%
              </span>
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-void/90 overflow-hidden border border-line/60 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                bateuMeta
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-green-400 shadow-[0_0_12px_rgba(16,185,129,0.55)]'
                  : 'bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 shadow-[0_0_10px_rgba(123,92,255,0.45)]'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2.5 text-[11px] text-muted font-mono">
            <span>
              {elegiveis} de {totalMembros} membros elegíveis à recompensa (mínimo 1 {desafio.unidade})
            </span>
            <span>
              {bateuMeta
                ? '🎉 A recompensa será paga a todos que contribuíram no fechamento semanal!'
                : 'Contribua com a meta para garantir sua parte das moedas!'}
            </span>
          </div>
        </div>
      </div>

      {/* STATUS PESSOAL DO USUÁRIO LOGADO */}
      {souMembro && (
        <div className="px-6 sm:px-8 py-3.5 bg-holo-2/10 border-b border-holo-2/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-text font-medium">
            <ShieldCheck size={16} className="text-holo-3 shrink-0" />
            <span>
              Sua contribuição nesta semana:{' '}
              <strong className="text-holo-3 font-mono font-bold text-sm">
                {minhaContribuicao?.contribuicao ?? 0} {desafio.unidade}
              </strong>
            </span>
          </div>
          <div>
            {(minhaContribuicao?.contribuicao ?? 0) >= 1 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green/15 border border-green/30 text-green font-mono font-bold text-[11px]">
                <CheckCircle2 size={13} /> Você está apto para receber +{desafio.recompensa_anicoins} ₳
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold font-mono font-bold text-[11px]">
                <Award size={13} /> Contribua com pelo menos 1 {desafio.unidade} para garantir as moedas
              </span>
            )}
          </div>
        </div>
      )}

      {/* LISTA / RANKING DE CONTRIBUIÇÃO DOS MEMBROS */}
      <div className="p-6 sm:p-8">
        <h3 className="text-sm uppercase font-anton tracking-wider text-muted mb-4 flex items-center gap-2">
          <Award size={15} className="text-gold" /> Quadro de Contribuições da Semana
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line text-muted font-mono text-[10.5px] uppercase">
                <th className="pb-2.5 font-bold">Membro</th>
                <th className="pb-2.5 font-bold text-center">Papel</th>
                <th className="pb-2.5 font-bold text-right">Contribuição</th>
                <th className="pb-2.5 font-bold text-right">Recompensa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {desafio.contribuicoes.map((m: MembroContribuicaoDesafio, idx: number) => {
                const ehEu = m.user_id === userId
                return (
                  <tr
                    key={m.user_id}
                    className={`transition-colors ${
                      ehEu ? 'bg-holo-2/15 font-semibold' : 'hover:bg-panel-2/50'
                    }`}
                  >
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[11px] font-bold text-muted w-5 shrink-0">
                          #{idx + 1}
                        </span>
                        {m.avatar_url ? (
                          <img
                            src={m.avatar_url}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-line shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-void border border-line flex items-center justify-center font-bold text-[11px] text-holo-3 shrink-0">
                            {m.nome.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-text block truncate font-medium">
                            {m.nome}
                            {ehEu && (
                              <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded bg-holo-2/30 text-holo-3 font-mono font-bold">
                                Você
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-muted-2 font-mono block">
                            @{m.handle}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold capitalize ${
                          m.papel === 'lider'
                            ? 'bg-gold/15 text-gold border border-gold/30'
                            : m.papel === 'vice'
                            ? 'bg-holo-3/15 text-holo-3 border border-holo-3/30'
                            : 'bg-panel-2 text-muted border border-line'
                        }`}
                      >
                        {m.papel}
                      </span>
                    </td>

                    <td className="py-3 px-2 text-right font-mono font-bold text-text">
                      <span className={m.contribuicao > 0 ? 'text-holo-3 text-sm' : 'text-muted-2'}>
                        {m.contribuicao}
                      </span>{' '}
                      <span className="text-[10px] text-muted">{desafio.unidade}</span>
                    </td>

                    <td className="py-3 pl-2 text-right">
                      {m.elegivel ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-green">
                          <CheckCircle2 size={12} /> +{desafio.recompensa_anicoins} ₳
                        </span>
                      ) : (
                        <span className="text-[10.5px] font-mono text-muted-2">
                          0 ₳ (inapto)
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
