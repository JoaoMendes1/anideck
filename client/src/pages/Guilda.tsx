import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Sparkles, Lock, Flame, Award, ChevronRight, Send } from 'lucide-react'
import { useSessao } from '../contexts/SessaoContext'
import { useCarteira } from '../hooks/useCarteira'
import CartaoVitais from '../components/comunidade/CartaoVitais'
import IconeAniCoin from '../components/IconeAniCoin'
import ModalTransferirAniCoins from '../components/ModalTransferirAniCoins'
import { chaveDoUsuario, lerDaMemoria, guardarNaMemoria } from '../lib/cacheDeTela'
import {
  obterEstiloRank,
  obterClasseCartaInsignia,
  ehMotivoReduzido,
  type DadosDaGuilda,
} from '../lib/guilda'

export default function Guilda() {
  const { session } = useSessao()
  const userId = session?.user.id
  const chave = chaveDoUsuario(userId, 'guilda')
  const [emMemoria] = useState(() => lerDaMemoria<DadosDaGuilda>(chave))
  const [dados, setDados] = useState<DadosDaGuilda | null>(emMemoria ?? null)
  const [carregando, setCarregando] = useState(!emMemoria)
  const [erro, setErro] = useState(false)
  const [abaLivroRazao, setAbaLivroRazao] = useState<'xp' | 'cristais'>('xp')
  const [modalTransferirAberto, setModalTransferirAberto] = useState(false)
  const { saldo: saldoCristais, movimentos: movimentosCristais, recarregar: recarregarCarteira } = useCarteira()

  useEffect(() => {
    if (!session?.access_token || !chave) return
    let ativo = true

    const carregar = async () => {
      try {
        const res = await fetch('/api/guilda', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) throw new Error('Falha ao buscar guilda')
        const json = (await res.json()) as DadosDaGuilda
        guardarNaMemoria(chave, json)
        guardarNaMemoria(chaveDoUsuario(userId, 'guilda:resumo'), json.status)
        if (ativo) {
          setDados(json)
          setErro(false)
        }
      } catch {
        if (ativo && !emMemoria) setErro(true)
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [session?.access_token, chave, userId, emMemoria])

  if (carregando && !dados) {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-24">
        <div className="h-40 rounded-2xl bg-panel border border-line animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="h-96 rounded-2xl bg-panel border border-line animate-pulse" />
          <div className="h-96 rounded-2xl bg-panel border border-line animate-pulse" />
        </div>
      </div>
    )
  }

  if (erro || !dados) {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-12 pb-24 text-center">
        <div className="max-w-md mx-auto p-6 rounded-2xl bg-panel border border-line">
          <h1 className="font-anton text-2xl uppercase mb-2">Guilda indisponível no momento</h1>
          <p className="text-sm text-muted mb-4">
            Não foi possível carregar seu histórico de progressão agora. Tente novamente em instantes.
          </p>
          <Link
            to="/deck"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs text-void bg-gradient-to-r from-holo-1 to-holo-3"
          >
            Voltar ao Meu Deck
          </Link>
        </div>
      </div>
    )
  }

  const { status, economia, ranks, extrato, especialistas, insignias } = dados
  const estiloRank = obterEstiloRank(status.rank)
  const totalDesbloqueadas = insignias.filter((i) => i.desbloqueada).length

  return (
    <div className="w-full min-w-0 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-24">
      <header className="mb-6 select-none">
        <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest mb-1">
          // guilda do anideck · progressão & credibilidade
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-anton text-[clamp(1.7rem,3.5vw,2.4rem)] uppercase m-0 leading-none">
              Sua Ficha na <span className="text-holo">Guilda</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1.5">
              Rank mede sua constância presente; Especialista de Gênero reconhece sua bagagem acumulada.
            </p>
          </div>
          <Link
            to="/meu-gosto"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-panel border border-line hover:border-holo-3 text-xs font-bold text-text transition-colors"
          >
            <Sparkles size={13} className="text-holo-3" /> Ver Meu Gosto →
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-6 items-start">
        {/* COLUNA PRINCIPAL */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* CARTÃO PRINCIPAL DE RANK E NÍVEL */}
          <section className="p-5 sm:p-6 rounded-2xl bg-panel border border-line relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Anel de Rank */}
              <div
                className="w-24 h-24 rounded-full shrink-0 grid place-items-center relative p-1.5 mx-auto sm:mx-0"
                style={{
                  background: `conic-gradient(var(--color-holo-2) 0turn ${
                    Math.min(100, Math.max(4, status.progresso_pct)) / 100
                  }turn, var(--color-panel-2) ${
                    Math.min(100, Math.max(4, status.progresso_pct)) / 100
                  }turn 1turn)`,
                }}
              >
                <div className="w-full h-full rounded-full bg-panel grid place-items-center border border-line/60">
                  <span className={`font-anton text-4xl leading-none ${estiloRank.seloTexto}`}>
                    {status.rank}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-holo-2/15 border border-holo-2/40 text-holo-2">
                    Rank {status.rank}
                  </span>
                  {status.streak_atual > 0 && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-green/12 border border-green/40 text-green">
                      <Flame size={11} /> Streak {status.streak_atual}d
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-holo-3/15 border border-holo-3/40 text-holo-3">
                    <IconeAniCoin size={12} /> {saldoCristais.toLocaleString('pt-BR')} ₳
                  </span>
                  {!status.gamificacao_ativa && (
                    <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-coral/15 border border-coral/40 text-coral">
                      XP em manutenção
                    </span>
                  )}
                </div>

                <h2 className="font-anton text-2xl sm:text-3xl uppercase m-0 tracking-wide">
                  {status.titulo_rank}
                </h2>
                <p className="font-mono text-xs text-muted mt-1">
                  Nível <b className="text-text">{status.nivel}</b> · {status.xp_no_nivel} /{' '}
                  {status.xp_para_proximo} XP ({status.xp_total.toLocaleString('pt-BR')} XP total)
                </p>

                <div className="h-2.5 rounded-full bg-panel-2 overflow-hidden mt-3 border border-line/60">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${estiloRank.corBarra}`}
                    style={{ width: `${Math.min(100, Math.max(0, status.progresso_pct))}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 font-mono text-[11px] text-muted-2">
                  <span>
                    Hoje:{' '}
                    <b className={status.xp_hoje >= status.teto_diario ? 'text-gold' : 'text-green'}>
                      {status.xp_hoje} / {status.teto_diario} XP
                    </b>
                  </span>
                  {status.proximo_rank ? (
                    <span>
                      Próxima classe: <b className="text-text">Rank {status.proximo_rank}</b> no Nível{' '}
                      {status.nivel_proximo_rank}
                    </span>
                  ) : (
                    <span className="text-gold font-bold">Classe máxima alcançada (SS)</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* LIVRO-RAZÃO: XP E CRISTAIS */}
          <section className="p-5 sm:p-6 rounded-2xl bg-panel border border-line">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">
                  // livro-razão ({abaLivroRazao === 'xp' ? 'xp_ledger' : 'crystal_ledger'})
                </p>
                <h3 className="font-anton text-lg uppercase m-0 mt-0.5">
                  {abaLivroRazao === 'xp' ? 'Como você ganhou XP' : 'Extrato de AniCoins'}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-panel-2 border border-line">
                <button
                  type="button"
                  onClick={() => setAbaLivroRazao('xp')}
                  className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
                    abaLivroRazao === 'xp'
                      ? 'bg-holo-1 text-void'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  XP
                </button>
                <button
                  type="button"
                  onClick={() => setAbaLivroRazao('cristais')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
                    abaLivroRazao === 'cristais'
                      ? 'bg-holo-3 text-void'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  <IconeAniCoin size={14} /> AniCoins ({saldoCristais.toLocaleString('pt-BR')} ₳)
                </button>
              </div>
            </div>

            {abaLivroRazao === 'xp' ? (
              <>
                <div className="flex items-center justify-end mb-3">
                  <span className="font-mono text-[10.5px] text-muted bg-panel-2 border border-line px-2.5 py-1 rounded-full">
                    Base +{economia.xp_base_episodio} XP · Cedo +{economia.bonus_cedo} XP
                  </span>
                </div>

                {extrato.length === 0 ? (
                  <div className="p-5 rounded-xl bg-panel-2 border border-line text-center">
                    <p className="text-sm text-muted m-0">
                      Nenhum episódio com XP registrado ainda. Marque episódios assistidos no seu Deck ou
                      na página de uma obra para iniciar sua jornada!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-line">
                    {extrato.map((item) => {
                      const reduzido = ehMotivoReduzido(item.reason)
                      return (
                        <div
                          key={`${item.mal_id}-${item.episode_number}`}
                          className="py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm"
                        >
                          <div className="min-w-0">
                            <Link
                              to={`/anime/${item.mal_id}`}
                              className="font-bold text-text hover:text-holo-3 transition-colors line-clamp-1"
                            >
                              {item.titulo_anime} · <span className="font-mono">ep {item.episode_number}</span>
                            </Link>
                            <div className="font-mono text-[10px] text-muted-2 mt-0.5 flex flex-wrap items-center gap-2">
                              <span>{item.reason}</span>
                              {item.de_hoje && (
                                <span className="px-1.5 py-0.2 rounded bg-holo-3/15 text-holo-3">hoje</span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`font-mono font-bold text-xs sm:text-sm shrink-0 ${
                              reduzido ? 'text-gold' : 'text-green'
                            }`}
                          >
                            +{item.xp_earned} XP
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <p className="font-mono text-[10.5px] text-muted-2 mt-4 mb-0 leading-relaxed">
                  Cada linha guarda quanto valeu <b className="text-text">na hora</b>. Desmarcar um
                  episódio devolve exatamente isso, e listas importadas em lote não inflam seu Rank.
                </p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between p-3.5 rounded-xl bg-panel-2 border border-line/60 mb-3 gap-3">
                  <div className="flex items-center gap-3">
                    <IconeAniCoin size={26} animar />
                    <div>
                      <span className="font-mono text-[10px] text-muted-2 uppercase tracking-wider block">Saldo da Carteira</span>
                      <span className="font-anton text-2xl text-holo-3">{saldoCristais.toLocaleString('pt-BR')} ₳</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalTransferirAberto(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-holo-3/40 bg-holo-3/15 text-holo-3 hover:bg-holo-3/25 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Send size={12} /> Transferir AniCoins
                    </button>
                    <span className="font-mono text-[10.5px] text-muted hidden sm:inline">
                      {movimentosCristais.length} {movimentosCristais.length === 1 ? 'movimento' : 'movimentos'}
                    </span>
                  </div>
                </div>

                {movimentosCristais.length === 0 ? (
                  <div className="p-5 rounded-xl bg-panel-2 border border-line text-center">
                    <p className="text-sm text-muted m-0">
                      Nenhum movimento de AniCoins registrado ainda. AniCoins são ganhas em missões diárias,
                      desafios de clã e eventos da comunidade!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-line">
                    {movimentosCristais.map((m) => {
                      const positivo = m.quantidade > 0
                      const dataFormatada = new Date(m.criado_em).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      return (
                        <div key={m.id} className="py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
                          <div className="min-w-0">
                            <span className="font-bold text-text capitalize block truncate">
                              {m.motivo.replace(/_/g, ' ')}
                            </span>
                            <div className="font-mono text-[10px] text-muted-2 mt-0.5 flex flex-wrap items-center gap-2">
                              <span>{dataFormatada}</span>
                              {m.referencia && <span className="text-muted truncate max-w-[200px]">ref: {m.referencia}</span>}
                            </div>
                          </div>
                          <span
                            className={`font-mono font-bold text-xs sm:text-sm shrink-0 flex items-center gap-1 ${
                              positivo ? 'text-green' : 'text-coral'
                            }`}
                          >
                            {positivo ? `+${m.quantidade}` : m.quantidade} <IconeAniCoin size={12} />
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <p className="font-mono text-[10.5px] text-muted-2 mt-4 mb-0 leading-relaxed">
                  O saldo é derivado diretamente pelo somatório do livro-razão (<b className="text-text">crystal_ledger</b>).
                  Toda entrada e saída é imutável e com controle de concorrência.
                </p>
              </>
            )}
          </section>

          {/* ESPECIALISTA DE GÊNERO */}
          <section className="p-5 sm:p-6 rounded-2xl bg-panel border border-line">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">
                  // bagagem de acervo · moeda 2
                </p>
                <h3 className="font-anton text-lg uppercase m-0 mt-0.5">Especialista de Gênero</h3>
              </div>
              <span className="font-mono text-[10.5px] text-holo-3 bg-holo-3/12 border border-holo-3/35 px-2.5 py-1 rounded-full">
                Peso máx. {status.peso_maximo_voto.toFixed(1).replace('.', ',')}×
              </span>
            </div>

            {especialistas.length === 0 ? (
              <p className="text-sm text-muted m-0">
                Adicione obras com status Assistindo, Em Dia ou Completo no seu Deck para destravar sua
                afinidade por gênero.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {especialistas.slice(0, 8).map((esp, idx) => (
                  <div key={esp.genero} className="flex items-center gap-3">
                    <div className="w-28 sm:w-36 shrink-0">
                      <div className="text-xs sm:text-sm font-bold text-text truncate">{esp.genero}</div>
                      <div className="font-mono text-[10px] text-muted-2">
                        {esp.total_vistos} {esp.total_vistos === 1 ? 'obra' : 'obras'} ·{' '}
                        {esp.titulo_nivel}
                      </div>
                    </div>

                    <div className="flex-1 h-2.5 rounded-full bg-panel-2 overflow-hidden border border-line/50">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx % 2 === 0 ? 'bg-holo-2' : 'bg-holo-1'
                        }`}
                        style={{ width: `${esp.progresso_pct}%` }}
                      />
                    </div>

                    <div className="w-20 text-right shrink-0 font-mono text-xs">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full border ${
                          esp.nivel >= 3
                            ? 'bg-gold/15 border-gold/45 text-gold'
                            : esp.nivel >= 1
                            ? 'bg-holo-2/15 border-holo-2/45 text-holo-2'
                            : 'bg-panel-2 border-line text-muted-2'
                        }`}
                      >
                        {esp.rotulo_nivel}
                      </span>
                      <div className="text-[9.5px] text-muted-2 mt-0.5">
                        {esp.peso_voto.toFixed(1).replace('.', ',')}× voto
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="font-mono text-[10.5px] text-muted-2 mt-4 mb-0 leading-relaxed">
              Seu domínio vem de todo o seu acervo (<b className="text-text">N1</b> = 3 obras ·{' '}
              <b className="text-text">N2</b> = 8 · <b className="text-text">N3</b> = 15 ·{' '}
              <b className="text-text">N4</b> = 25 · <b className="text-text">N5</b> = 40+).
            </p>
          </section>
        </div>

        {/* COLUNA LATERAL */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <CartaoVitais />

          {/* INSÍGNIAS (CARTAS FOIL) */}
          <section className="p-5 rounded-2xl bg-panel border border-line">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">
                  // coleção de cartas
                </p>
                <h3 className="font-anton text-lg uppercase m-0 mt-0.5">Insígnias</h3>
              </div>
              <span className="font-mono text-xs font-bold text-gold bg-gold/12 border border-gold/35 px-2.5 py-0.5 rounded-full">
                {totalDesbloqueadas} / {insignias.length}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
              {insignias.map((ins, idx) => {
                const classeCarta = obterClasseCartaInsignia(ins, idx)
                return (
                  <div
                    key={ins.id}
                    className={`aspect-[3/4] rounded-xl p-3 border flex flex-col justify-between relative overflow-hidden transition-transform hover:-translate-y-0.5 ${classeCarta}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl leading-none">{ins.icone}</span>
                      {ins.desbloqueada ? (
                        <Award size={14} className="text-gold shrink-0" />
                      ) : (
                        <Lock size={13} className="text-muted-2 shrink-0" />
                      )}
                    </div>

                    <div>
                      <div className="font-bold text-xs leading-tight mb-1">{ins.nome}</div>
                      <div className="text-[10.5px] opacity-85 leading-snug">{ins.descricao}</div>
                      <div className="font-mono text-[9.5px] mt-2 pt-1.5 border-t border-white/15 flex items-center justify-between">
                        <span>{ins.desbloqueada ? 'CONQUISTADA' : 'PROGRESSO'}</span>
                        <b>
                          {Math.min(ins.progresso_atual, ins.meta)}/{ins.meta}
                        </b>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="font-mono text-[10px] text-muted-2 mt-3.5 mb-0 leading-relaxed">
              Insígnia é carta colecionável: avaliada automaticamente sobre suas marcas reais de uso.
            </p>
          </section>

          {/* ESCADA DE RANKS F → SS */}
          <section className="p-5 rounded-2xl bg-panel border border-line">
            <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">
              // hierarquia da guilda
            </p>
            <h3 className="font-anton text-lg uppercase m-0 mt-0.5 mb-3">Classes F → SS</h3>

            <div className="flex flex-col gap-2">
              {ranks.map((r) => {
                const atingido = status.nivel >= r.nivel_minimo
                const atual = status.rank === r.rank
                const est = obterEstiloRank(r.rank)
                return (
                  <div
                    key={r.rank}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${
                      atual
                        ? `${est.bordaPilula} ${est.fundoPilula}`
                        : atingido
                        ? 'border-line bg-panel-2/60 text-text'
                        : 'border-line/50 bg-panel-2/25 text-muted-2'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full grid place-items-center font-anton text-xs shrink-0 ${est.seloBg}`}
                      >
                        {r.rank}
                      </span>
                      <span className="font-bold truncate">{r.titulo}</span>
                    </div>
                    <span className="font-mono text-[10.5px] shrink-0 flex items-center gap-1">
                      Nv {r.nivel_minimo}+
                      {atual && <ChevronRight size={12} className="text-holo-3" />}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-line flex items-center gap-2 text-[11px] text-muted">
              <Shield size={14} className="text-holo-2 shrink-0" />
              <span>Ficar dias sem assistir nunca reduz seu XP nem rebaixa seu Rank.</span>
            </div>
          </section>
        </aside>
      </div>

      <ModalTransferirAniCoins
        isOpen={modalTransferirAberto}
        onClose={() => setModalTransferirAberto(false)}
        saldoAtual={saldoCristais}
        onTransferenciaConcluida={recarregarCarteira}
      />
    </div>
  )
}
