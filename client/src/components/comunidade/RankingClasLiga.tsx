// client/src/components/comunidade/RankingClasLiga.tsx
// Visualização da Liga de Clãs por Temporada (Fase 17 · 17.1c, #182).
// Pontuação justa pela média dos 10 melhores membros.
// Exibição de pódio, tabela detalhada com expansão do top 10 e histórico de campeões.
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Crown, Medal, ChevronDown, ChevronUp, AlertCircle, Sparkles, Shield, History, Users } from 'lucide-react'
import TagCla from '../TagCla'
import {
  obterRankingClasTemporada,
  obterHistoricoCampeoesClas,
  renderIconeEmblema,
  type RankingClaTemporadaData,
  type TemporadaHistoricoItem,
} from '../../lib/clas'

const MEDALHAS = ['text-gold', 'text-slate-300', 'text-amber-500']
const BORDAS_PODIO = [
  'border-gold/50 bg-gold/5 hover:border-gold',
  'border-slate-300/40 bg-slate-300/5 hover:border-slate-300',
  'border-amber-500/40 bg-amber-500/5 hover:border-amber-500',
]

export default function RankingClasLiga() {
  const [dados, setDados] = useState<RankingClaTemporadaData | null>(null)
  const [historico, setHistorico] = useState<TemporadaHistoricoItem[] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [expandidoClaId, setExpandidoClaId] = useState<string | null>(null)
  const [abaExibicao, setAbaExibicao] = useState<'ranking' | 'historico'>('ranking')
  const [temporadaSelecionada, setTemporadaSelecionada] = useState<string>('')

  const carregarRanking = async (temp?: string) => {
    setCarregando(true)
    setErro(null)
    try {
      const res = await obterRankingClasTemporada(temp)
      setDados(res)
      if (!temp) {
        setTemporadaSelecionada(res.temporada)
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar ranking da liga de clãs.')
    } finally {
      setCarregando(false)
    }
  }

  const carregarHistorico = async () => {
    try {
      const hist = await obterHistoricoCampeoesClas()
      setHistorico(hist)
    } catch {
      // Falha silenciosa no histórico para não quebrar a tela principal
    }
  }

  useEffect(() => {
    carregarRanking(temporadaSelecionada || undefined)
    carregarHistorico()
  }, [temporadaSelecionada])

  const alternarExpansao = (claId: string) => {
    setExpandidoClaId(prev => (prev === claId ? null : claId))
  }

  return (
    <div className="space-y-6">
      {/* Sub-navegação: Temporada Atual vs Histórico */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-panel border border-line">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAbaExibicao('ranking')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              abaExibicao === 'ranking'
                ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void shadow'
                : 'text-muted hover:text-text'
            }`}
          >
            <Trophy size={14} />
            <span>Temporada {dados ? `${dados.nome_estacao} ${dados.ano}` : 'Atual'}</span>
          </button>
          <button
            type="button"
            onClick={() => setAbaExibicao('historico')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              abaExibicao === 'historico'
                ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void shadow'
                : 'text-muted hover:text-text'
            }`}
          >
            <History size={14} />
            <span>Campeões Anteriores</span>
          </button>
        </div>

        {dados && abaExibicao === 'ranking' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-muted-2">Status:</span>
            {dados.fechada ? (
              <span className="px-2 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold bg-muted-2/20 text-muted border border-muted-2/30">
                Encerrada
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold bg-holo-2/20 text-holo-2 border border-holo-2/30 animate-pulse">
                Em Andamento
              </span>
            )}
            <span className="font-mono text-xs text-text font-bold bg-panel-2 px-2.5 py-1 rounded-lg border border-line">
              {dados.temporada}
            </span>
          </div>
        )}
      </div>

      {carregando ? (
        <div className="space-y-3">
          <div className="h-44 rounded-2xl bg-panel border border-line animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-panel border border-line animate-pulse" />
            ))}
          </div>
        </div>
      ) : erro ? (
        <div className="p-8 rounded-2xl bg-panel border border-line text-center text-sm text-muted">
          <AlertCircle size={28} className="mx-auto text-amber-400 mb-2" />
          <p className="font-bold text-text m-0">{erro}</p>
          <button
            type="button"
            onClick={() => carregarRanking(temporadaSelecionada)}
            className="mt-4 px-4 py-2 rounded-full text-xs font-bold bg-panel-2 border border-line hover:border-holo-3 text-text cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      ) : abaExibicao === 'historico' ? (
        /* HISTÓRICO DE CAMPEÕES ANTERIORES */
        <div className="space-y-5">
          {!historico || historico.length === 0 ? (
            <div className="p-8 rounded-2xl bg-panel border border-line text-center text-muted">
              <History size={32} className="mx-auto text-muted-2 mb-2" />
              <p className="font-bold text-text m-0">Nenhuma temporada encerrada ainda.</p>
              <p className="text-xs text-muted mt-1">Ao final de cada trimestre, os clãs campeões ficarão eternizados aqui.</p>
            </div>
          ) : (
            historico.map(h => (
              <div key={h.temporada} className="p-5 rounded-2xl bg-panel border border-line space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy size={18} className="text-gold" />
                    <span className="font-anton text-lg tracking-wide uppercase">Temporada {h.temporada}</span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-2">
                    Encerrada em {new Date(h.fechado_em).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {h.campeoes.map(c => {
                    const iconeMedalha = c.posicao === 1 ? Crown : c.posicao === 2 ? Trophy : Medal
                    const Icone = iconeMedalha

                    return (
                      <div
                        key={c.cla_id}
                        className={`p-3.5 rounded-xl border flex items-center gap-3 ${BORDAS_PODIO[c.posicao - 1] || 'border-line bg-panel-2'}`}
                      >
                        <span className={`w-8 text-center shrink-0 ${MEDALHAS[c.posicao - 1]}`}>
                          <Icone size={22} className="mx-auto" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <TagCla tag={c.tag} emblema={c.emblema} />
                            <Link to={`/clas/${c.tag}`} className="font-bold text-xs truncate hover:text-holo-2 text-text">
                              {c.nome}
                            </Link>
                          </div>
                          <p className="font-mono text-[10px] text-muted mt-1 m-0">
                            Pontos: <b className="text-text">{c.pontuacao.toLocaleString('pt-BR')}</b> · XP: {c.xp_total.toLocaleString('pt-BR')}
                          </p>
                          <p className="font-mono text-[9.5px] text-holo-2 mt-0.5 m-0 flex items-center gap-1">
                            <Sparkles size={10} /> +{c.recompensa_anicoins} ₳ por membro
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      ) : dados ? (
        /* RANKING ATUAL DA TEMPORADA */
        <div className="space-y-6">
          {/* Card explicativo das regras da Liga */}
          <div className="p-4 rounded-2xl bg-panel border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-holo-2" />
                <span className="font-anton text-sm uppercase tracking-wide">Regras da Liga de Clãs</span>
              </div>
              <p className="text-xs text-muted m-0">
                <b>Pontuação Justa:</b> média de XP dos <b>10 melhores membros</b> na temporada. Clãs com menos de {dados.min_membros_liga} membros não pontuam.
              </p>
              <p className="text-[11px] text-muted-2 m-0">
                Desempate: 1º Pontuação Média · 2º XP Total Acumulado · 3º Antiguidade da fundação.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/clas"
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-panel-2 border border-line hover:border-holo-3 text-text cursor-pointer transition-colors"
              >
                Ver todos os Clãs →
              </Link>
            </div>
          </div>

          {/* Pódio dos Top 3 */}
          {dados.ranking.filter(r => r.elegivel_liga && r.posicao && r.posicao <= 3).length > 0 && (
            <div>
              <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest mb-3 select-none">// líderes da liga</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dados.ranking
                  .filter(r => r.elegivel_liga && r.posicao && r.posicao <= 3)
                  .sort((a, b) => (a.posicao ?? 99) - (b.posicao ?? 99))
                  .map(c => {
                    const pos = c.posicao ?? 1
                    const iconeMedalha = pos === 1 ? Crown : pos === 2 ? Trophy : Medal
                    const Icone = iconeMedalha
                    const recompensaAniCoins = pos === 1 ? 150 : pos === 2 ? 90 : 50
                    const rotuloCosmetico = pos === 1 ? 'Emblema Campeão' : pos === 2 ? 'Emblema Vice' : 'Emblema Top 3'

                    return (
                      <div
                        key={c.cla_id}
                        className={`p-4 rounded-2xl border transition-all ${BORDAS_PODIO[pos - 1] || 'border-line bg-panel'}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={`flex items-center gap-1.5 font-anton text-base uppercase ${MEDALHAS[pos - 1]}`}>
                            <Icone size={20} />
                            <span>{pos}º Lugar</span>
                          </span>
                          <TagCla tag={c.tag} emblema={c.emblema} />
                        </div>

                        <Link to={`/clas/${c.tag}`} className="block font-bold text-base hover:text-holo-2 text-text truncate mb-1">
                          {c.nome}
                        </Link>
                        <p className="text-xs text-muted line-clamp-1 mb-3">{c.descricao || 'Sem descrição.'}</p>

                        <div className="p-2.5 rounded-xl bg-panel/70 border border-line space-y-1 mb-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted">Pontuação Liga:</span>
                            <span className="font-anton text-base text-text">{c.pontuacao.toLocaleString('pt-BR')} pts</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-2">
                            <span>XP Total Acumulado:</span>
                            <span className="font-mono">{c.xp_total.toLocaleString('pt-BR')} XP</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-2">
                            <span>Membros Ativos:</span>
                            <span className="font-mono">{c.total_membros} membros</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-line/60">
                          <span className="text-holo-2 font-mono flex items-center gap-1 font-bold">
                            <Sparkles size={12} /> +{recompensaAniCoins} ₳ / membro
                          </span>
                          <span className="font-mono text-muted-2">{rotuloCosmetico}</span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Tabela do Ranking Completo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0 select-none">// classificação geral</p>
              <span className="text-xs text-muted-2 font-mono">
                {dados.ranking.length} clã{dados.ranking.length === 1 ? '' : 's'} ranqueado{dados.ranking.length === 1 ? '' : 's'}
              </span>
            </div>

            {dados.ranking.length === 0 ? (
              <div className="p-8 rounded-2xl bg-panel border border-line text-center">
                <Users size={32} className="mx-auto text-muted-2 mb-2" />
                <p className="font-bold text-text m-0">Nenhum clã pontuou na temporada ainda.</p>
                <p className="text-xs text-muted mt-1">
                  Membros dos clãs ganham XP assistindo episódios e alimentam a liga automaticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {dados.ranking.map(item => {
                  const expandido = expandidoClaId === item.cla_id
                  const podio = item.posicao !== null && item.posicao <= 3

                  return (
                    <div
                      key={item.cla_id}
                      className={`rounded-2xl border transition-all ${
                        item.elegivel_liga
                          ? 'bg-panel border-line hover:border-holo-3/40'
                          : 'bg-panel/40 border-line/50 opacity-80'
                      }`}
                    >
                      <div
                        onClick={() => alternarExpansao(item.cla_id)}
                        className="p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 cursor-pointer select-none"
                      >
                        {/* Posição */}
                        <span
                          className={`w-8 text-center font-anton text-lg shrink-0 ${
                            podio && item.posicao !== null ? MEDALHAS[item.posicao - 1] : 'text-muted-2'
                          }`}
                        >
                          {item.elegivel_liga && item.posicao !== null ? (
                            item.posicao === 1 ? <Crown size={20} className="mx-auto" /> : item.posicao
                          ) : (
                            <span className="text-xs font-mono text-muted-2">—</span>
                          )}
                        </span>

                        {/* Emblema visual */}
                        <span className="w-10 h-10 rounded-xl shrink-0 grid place-items-center bg-panel-2 border border-line text-holo-2">
                          {renderIconeEmblema(item.emblema, 20)}
                        </span>

                        {/* Nome, Tag e Membros */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <TagCla tag={item.tag} emblema={item.emblema} />
                            <Link
                              to={`/clas/${item.tag}`}
                              onClick={e => e.stopPropagation()}
                              className="font-bold text-sm text-text hover:text-holo-2 truncate"
                            >
                              {item.nome}
                            </Link>
                            {!item.elegivel_liga && (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Inelegível
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-2 m-0 mt-0.5 truncate">
                            {item.elegivel_liga ? (
                              `${item.total_membros} membros · XP Total: ${item.xp_total.toLocaleString('pt-BR')}`
                            ) : (
                              item.motivo_ineligivel || 'Inelegível'
                            )}
                          </p>
                        </div>

                        {/* Pontuação da Liga */}
                        <div className="text-right shrink-0">
                          <span className="block font-anton text-lg leading-none text-text">
                            {item.pontuacao.toLocaleString('pt-BR')}
                          </span>
                          <span className="block font-mono text-[9px] text-muted-2 uppercase mt-0.5">
                            {item.elegivel_liga ? 'Média Top 10' : 'Pontos'}
                          </span>
                        </div>

                        {/* Botão de Expansão */}
                        <button
                          type="button"
                          className="p-1 rounded-lg text-muted-2 hover:text-text hover:bg-panel-2 transition-colors shrink-0"
                          aria-label={expandido ? 'Recolher top 10 membros' : 'Ver top 10 membros'}
                        >
                          {expandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>

                      {/* Top 10 membros expansível */}
                      {expandido && (
                        <div className="px-4 pb-4 pt-1 border-t border-line/60 bg-panel-2/30 rounded-b-2xl">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-mono text-[10px] text-muted-2 uppercase tracking-wider m-0">
                              Top 10 Membros Pontuadores da Temporada
                            </p>
                            <span className="font-mono text-[10px] text-holo-2">
                              {item.top10_membros?.length || 0} contribuintes
                            </span>
                          </div>

                          {!item.top10_membros || item.top10_membros.length === 0 ? (
                            <p className="text-xs text-muted m-0 py-2">Nenhum membro pontuou ainda nesta temporada.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {item.top10_membros.map(m => (
                                <Link
                                  key={m.user_id}
                                  to={`/u/${m.handle}`}
                                  className="flex items-center gap-2.5 p-2 rounded-xl bg-panel border border-line/60 hover:border-holo-3/50 transition-colors"
                                >
                                  <span className="w-5 text-center font-mono text-xs font-bold text-muted-2">
                                    {m.posicao}º
                                  </span>
                                  <span className="w-7 h-7 rounded-full shrink-0 grid place-items-center font-anton text-xs text-void bg-gradient-to-br from-holo-2 to-holo-3">
                                    {m.nome.charAt(0).toUpperCase()}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <span className="block font-bold text-xs truncate text-text">{m.nome}</span>
                                    <span className="block font-mono text-[10px] text-muted-2 truncate">@{m.handle}</span>
                                  </div>
                                  <span className="font-mono text-xs font-bold text-holo-2 shrink-0">
                                    +{m.xp.toLocaleString('pt-BR')} XP
                                  </span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
