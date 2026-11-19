import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Shield, Sparkles, Lock, Award, ChevronRight, Send, ShoppingBag,
  UserRound, Hourglass, Compass, DoorOpen, Flame, Swords,
} from 'lucide-react'
import { useSessao } from '../contexts/SessaoContext'
import { useCarteira } from '../hooks/useCarteira'
import { useComunidade } from '../hooks/useComunidade'
import { useMidia } from '../hooks/useMidia'
import CartaoVitais from '../components/comunidade/CartaoVitais'
import IconeAniCoin from '../components/IconeAniCoin'
import InsigniaRank from '../components/hud/InsigniaRank'
import SeloStreak from '../components/hud/SeloStreak'
import BarraVital from '../components/hud/BarraVital'
import ModalTransferirAniCoins from '../components/ModalTransferirAniCoins'
import CardMissoesDiarias from '../components/inicio/CardMissoesDiarias'
import CardContratosSemanais from '../components/rpg/CardContratosSemanais'
import CartaoEspecialidade from '../components/hud/CartaoEspecialidade'
import CardChefao from '../components/chefao/CardChefao'
import AvisoTemporada0 from '../components/AvisoTemporada0'
import SeletorTitulo from '../components/comunidade/SeletorTitulo'
import CardPrevisoes from '../components/previsoes/CardPrevisoes'
import CardConviteAmigos from '../components/comunidade/CardConviteAmigos'
import SecaoColecaoCartas from '../components/comunidade/SecaoColecaoCartas'
import Paginacao from '../components/ui/Paginacao'
import { useCartas } from '../hooks/useCartas'
import { chaveDoUsuario, lerDaMemoria, guardarNaMemoria } from '../lib/cacheDeTela'
import {
  obterEstiloRank,
  obterClasseCartaInsignia,
  ehMotivoReduzido,
  formatarInstanteExtratoGuilda,
  EXTRATO_POR_PAGINA,
  type DadosDaGuilda,
  type RespostaExtratoGuilda,
} from '../lib/guilda'

export type AbaDaGuilda = 'aventura' | 'colecao' | 'extrato' | 'progresso'

const ABAS_GUILDA: { id: AbaDaGuilda; rotulo: string }[] = [
  { id: 'aventura', rotulo: 'Aventura' },
  { id: 'colecao', rotulo: 'Coleção' },
  { id: 'extrato', rotulo: 'Extrato' },
  { id: 'progresso', rotulo: 'Progresso' },
]

const ATIVIDADES_RPG = [
  {
    para: '/expedicoes',
    titulo: 'Expedições',
    selo: 'Mapa 2D',
    descricao: 'Explorar regiões e enfrentar monstros',
    Icone: Compass,
    classeCard: 'border-holo-2/35 bg-gradient-to-br from-holo-2/12 via-panel to-panel-2 hover:border-holo-2/70',
    classeIcone: 'bg-holo-2/15 text-holo-2',
    classeSelo: 'border-holo-2/35 bg-holo-2/10 text-holo-2',
  },
  {
    para: '/masmorras',
    titulo: 'Masmorras',
    selo: 'Andares',
    descricao: 'Avançar pelos andares até o baú',
    Icone: DoorOpen,
    classeCard: 'border-coral/35 bg-gradient-to-br from-coral/12 via-panel to-panel-2 hover:border-coral/70',
    classeIcone: 'bg-coral/15 text-coral',
    classeSelo: 'border-coral/35 bg-coral/10 text-coral',
  },
  {
    para: '/expedicoes#evento',
    titulo: 'Evento da Temporada',
    selo: 'Especial',
    descricao: 'Desafiar o evento ativo da temporada',
    Icone: Flame,
    classeCard: 'border-gold/35 bg-gradient-to-br from-gold/12 via-panel to-panel-2 hover:border-gold/70',
    classeIcone: 'bg-gold/15 text-gold',
    classeSelo: 'border-gold/35 bg-gold/10 text-gold',
  },
  {
    para: '/chefao',
    titulo: 'Chefão da Temporada',
    selo: 'Raid',
    descricao: 'Causar dano em grupo com sua lista',
    Icone: Swords,
    classeCard: 'border-holo-3/35 bg-gradient-to-br from-holo-3/12 via-panel to-panel-2 hover:border-holo-3/70',
    classeIcone: 'bg-holo-3/15 text-holo-3',
    classeSelo: 'border-holo-3/35 bg-holo-3/10 text-holo-3',
  },
] as const

const ABA_POR_HASH: Record<string, AbaDaGuilda> = {
  '#missoes-diarias-card': 'aventura',
  '#contratos': 'aventura',
  '#colecao': 'colecao',
  '#insignias': 'colecao',
  '#extrato': 'extrato',
  '#especialidade': 'progresso',
}

function resolverAba(valor: string | null): AbaDaGuilda | null {
  if (valor === 'aventura' || valor === 'colecao' || valor === 'extrato' || valor === 'progresso') {
    return valor
  }
  return null
}

export default function Guilda() {
  const { session, isAdmin } = useSessao()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const ehDesktop = useMidia('(min-width: 1024px)')
  const userId = session?.user.id
  const chave = chaveDoUsuario(userId, 'guilda')
  const [emMemoria] = useState(() => lerDaMemoria<DadosDaGuilda>(chave))
  const [dados, setDados] = useState<DadosDaGuilda | null>(emMemoria ?? null)
  const [carregando, setCarregando] = useState(!emMemoria)
  const [erro, setErro] = useState(false)
  const [abaLivroRazao, setAbaLivroRazao] = useState<'xp' | 'cristais'>('xp')
  const [paginaExtrato, setPaginaExtrato] = useState(1)
  const [extratoPaginado, setExtratoPaginado] = useState<RespostaExtratoGuilda | null>(null)
  const [carregandoExtrato, setCarregandoExtrato] = useState(false)
  const [modalTransferirAberto, setModalTransferirAberto] = useState(false)
  const { saldo: saldoCristais, movimentos: movimentosCristais, recarregar: recarregarCarteira } = useCarteira()
  const { estado: estadoComu, recarregar: recarregarComunidade } = useComunidade()
  const { cartas } = useCartas()

  const abaDaUrl = resolverAba(searchParams.get('aba'))
  const abaDoHash = ABA_POR_HASH[location.hash]
  const abaAtiva: AbaDaGuilda =
    abaDaUrl ?? abaDoHash ?? (searchParams.get('cartas') ? 'colecao' : 'aventura')

  const selecionarAba = (novaAba: AbaDaGuilda) => {
    const proximo = new URLSearchParams(searchParams)
    if (novaAba === 'aventura') {
      proximo.delete('aba')
    } else {
      proximo.set('aba', novaAba)
    }
    if (novaAba !== 'colecao') {
      proximo.delete('cartas')
    }
    const buscaTexto = proximo.toString()
    const manterHash = location.hash && ABA_POR_HASH[location.hash] === novaAba ? location.hash : ''
    navigate(
      {
        pathname: location.pathname,
        search: buscaTexto ? `?${buscaTexto}` : '',
        hash: manterHash,
      },
      { replace: true },
    )
  }

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
    window.addEventListener('anideck:episodio-atualizado', carregar)
    window.addEventListener('anideck:entrada-atualizada', carregar)
    return () => {
      ativo = false
      window.removeEventListener('anideck:episodio-atualizado', carregar)
      window.removeEventListener('anideck:entrada-atualizada', carregar)
    }
  }, [session?.access_token, chave, userId, emMemoria])

  useEffect(() => {
    if (!session?.access_token) return
    let ativo = true

    const carregarExtrato = async () => {
      setCarregandoExtrato(true)
      try {
        const res = await fetch(`/api/guilda/extrato?pagina=${paginaExtrato}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) return
        const json = (await res.json()) as RespostaExtratoGuilda
        if (ativo && Array.isArray(json.itens)) {
          setExtratoPaginado(json)
        }
      } catch {
        // Em caso de falha transitória, mantém os dados iniciais já carregados.
      } finally {
        if (ativo) setCarregandoExtrato(false)
      }
    }

    carregarExtrato()
    window.addEventListener('anideck:episodio-atualizado', carregarExtrato)
    window.addEventListener('anideck:entrada-atualizada', carregarExtrato)
    return () => {
      ativo = false
      window.removeEventListener('anideck:episodio-atualizado', carregarExtrato)
      window.removeEventListener('anideck:entrada-atualizada', carregarExtrato)
    }
  }, [session?.access_token, paginaExtrato])

  useEffect(() => {
    const hash = location.hash
    if (!hash) return
    const alvoAba = ABA_POR_HASH[hash]
    if (alvoAba) {
      const abaAtualUrl = resolverAba(searchParams.get('aba'))
      if (abaAtualUrl && abaAtualUrl !== alvoAba) {
        const proximo = new URLSearchParams(searchParams)
        if (alvoAba === 'aventura') {
          proximo.delete('aba')
        } else {
          proximo.set('aba', alvoAba)
        }
        const buscaTexto = proximo.toString()
        navigate(
          {
            pathname: location.pathname,
            search: buscaTexto ? `?${buscaTexto}` : '',
            hash,
          },
          { replace: true },
        )
      }
    }
    if (!dados) return
    const id = hash.slice(1)
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash, dados])

  if (carregando && !dados) {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-3 sm:pt-8 pb-24">
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
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-3 sm:pt-12 pb-24 text-center">
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

  const { status, economia, ranks, extrato, especialistas, especialidade, insignias } = dados
  const totalDesbloqueadas = insignias.filter((i) => i.desbloqueada).length

  return (
    <div className="w-full min-w-0 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-3 sm:pt-6 pb-24">
      <header className="mb-4 select-none sm:mb-6">
        <p className="hidden font-mono text-xs text-muted-2 uppercase tracking-widest mb-1 sm:block">
          // guilda do anideck · progressão & credibilidade
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="font-anton text-[1.5rem] sm:text-[2.4rem] uppercase m-0 leading-none">
              Sua Ficha na <span className="text-holo">Guilda</span>
            </h1>
            <p className="hidden sm:block text-sm text-muted mt-1.5">
              Rank mede sua constância presente; Especialista de Gênero reconhece sua bagagem acumulada.
            </p>
          </div>
          <div className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&>a]:shrink-0 [&>a]:whitespace-nowrap">
            <Link
              to="/expedicoes"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-holo-2/15 border border-holo-2/40 hover:bg-holo-2/25 text-xs font-bold text-holo-2 transition-colors"
            >
              <Compass size={13} /> Expedições →
            </Link>
            <Link
              to="/masmorras"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-coral/15 border border-coral/40 hover:bg-coral/25 text-xs font-bold text-coral transition-colors"
            >
              <DoorOpen size={13} /> Masmorras →
            </Link>
            <Link
              to="/personagem"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gold/15 border border-gold/40 hover:bg-gold/25 text-xs font-bold text-gold transition-colors"
            >
              <UserRound size={13} /> Personagem →
            </Link>
            <Link
              to="/loja"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-holo-3/15 border border-holo-3/40 hover:bg-holo-3/25 text-xs font-bold text-holo-3 transition-colors"
            >
              <ShoppingBag size={13} /> Loja →
            </Link>
            <Link
              to="/meu-gosto"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-panel border border-line hover:border-holo-3 text-xs font-bold text-text transition-colors"
            >
              <Sparkles size={13} className="text-holo-3" /> Ver Meu Gosto →
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 sm:gap-6 items-start">
        {/* COLUNA PRINCIPAL */}
        <div className="flex flex-col gap-3 sm:gap-5 min-w-0">
          {/* CARTÃO PRINCIPAL DE RANK E NÍVEL */}
          <section className="p-3.5 sm:p-6 rounded-2xl bg-panel border border-line relative overflow-hidden">
            <div className="flex flex-row items-start sm:items-center gap-3 sm:gap-5">
              {/* Insígnia do rank, a mesma do painel do Início e do menu. No celular, ao lado do texto. */}
              <InsigniaRank rank={status.rank} tamanho={116} className="shrink-0 h-auto w-16 sm:w-[116px]" />

              <div className="flex-1 min-w-0 text-left">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                  <span className="inline-flex items-center h-6 sm:h-7 font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider px-2 sm:px-2.5 rounded-full bg-holo-2/15 border border-holo-2/40 text-holo-2">
                    Rank {status.rank}
                  </span>
                  {status.streak_atual > 0 && <SeloStreak dias={status.streak_atual} compacto />}
                  {especialidade && (
                    <span
                      title={`Especialidade: ${especialidade.genero} (${especialidade.rotulo_nivel})`}
                      className="inline-flex items-center gap-1 h-6 sm:h-7 font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider px-2 sm:px-2.5 rounded-full bg-holo-1/15 border border-holo-1/40 text-holo-1"
                    >
                      <span aria-hidden>{especialidade.icone}</span> {especialidade.epiteto}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 h-6 sm:h-7 font-mono text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 rounded-full bg-gold/12 border border-gold/40 text-gold">
                    <IconeAniCoin size={13} /> {saldoCristais.toLocaleString('pt-BR')} ₳
                  </span>
                  {!status.gamificacao_ativa && (
                    <span className="inline-flex items-center h-7 font-mono text-xs font-bold px-2.5 rounded-full bg-coral/15 border border-coral/40 text-coral">
                      XP em manutenção
                    </span>
                  )}
                </div>

                <h2 className="font-anton text-xl sm:text-3xl uppercase m-0 tracking-wide">
                  {status.titulo_rank}
                </h2>
                <p className="font-mono text-[11px] sm:text-xs text-muted mt-1">
                  Nível <b className="text-text">{status.nivel}</b> · {status.xp_no_nivel} /{' '}
                  {status.xp_para_proximo} XP<span className="hidden sm:inline"> ({status.xp_total.toLocaleString('pt-BR')} XP total)</span>
                </p>

                <BarraVital tipo="xp" pct={status.progresso_pct} className="h-2 sm:h-2.5 w-full mt-2 sm:mt-3" />

                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 mt-2 sm:mt-3 font-mono text-[11px] sm:text-xs text-muted-2">
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

          <AvisoTemporada0 />

          <div
            role="tablist"
            aria-label="Seções da Guilda"
            className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-panel border border-line"
          >
            {ABAS_GUILDA.map((aba) => {
              const ativa = abaAtiva === aba.id
              return (
                <button
                  key={aba.id}
                  type="button"
                  role="tab"
                  id={`tab-guilda-${aba.id}`}
                  aria-selected={ativa}
                  aria-controls={`painel-guilda-${aba.id}`}
                  onClick={() => selecionarAba(aba.id)}
                  className={`px-2 py-2 sm:px-3 sm:py-2.5 rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer text-center ${
                    ativa
                      ? 'bg-holo-3 text-void shadow-sm'
                      : 'text-muted hover:text-text hover:bg-panel-2/70'
                  }`}
                >
                  {aba.rotulo}
                </button>
              )
            })}
          </div>

          {abaAtiva === 'aventura' && (
            <div
              role="tabpanel"
              id="painel-guilda-aventura"
              aria-labelledby="tab-guilda-aventura"
              className="flex flex-col gap-3 sm:gap-6"
            >
              <section className="p-4 sm:p-5 rounded-2xl bg-panel border border-line">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-muted-2 uppercase tracking-widest m-0">
                      // combate & temporada
                    </p>
                    <h3 className="font-anton text-lg uppercase m-0 mt-0.5">Atividades da Guilda</h3>
                  </div>
                </div>
                <nav aria-label="Atividades da Guilda" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ATIVIDADES_RPG.map((item) => {
                    const Icone = item.Icone
                    return (
                      <Link
                        key={item.para}
                        to={item.para}
                        className={`flex flex-col justify-between gap-2 rounded-2xl border p-3 transition-colors ${item.classeCard}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.classeIcone}`}>
                            <Icone size={17} aria-hidden="true" />
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 font-mono text-xs font-bold ${item.classeSelo}`}>
                            {item.selo}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-text leading-tight">{item.titulo}</div>
                          <p className="m-0 mt-1 text-xs text-muted leading-snug">{item.descricao}</p>
                        </div>
                      </Link>
                    )
                  })}
                </nav>
              </section>

              <CardMissoesDiarias />

              <CardContratosSemanais />

              <CardChefao />

              <CardPrevisoes />
            </div>
          )}

          {abaAtiva === 'colecao' && (
            <div
              role="tabpanel"
              id="painel-guilda-colecao"
              aria-labelledby="tab-guilda-colecao"
              className="flex flex-col gap-3 sm:gap-6"
            >
              <div id="colecao" className="scroll-mt-28">
                <SecaoColecaoCartas cartas={cartas} />
              </div>

              {/* INSÍGNIAS (CARTAS FOIL) */}
              <section id="insignias" className="scroll-mt-28 p-5 sm:p-6 rounded-2xl bg-panel border border-line">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="font-mono text-xs text-muted-2 uppercase tracking-widest m-0">
                      // coleção de insígnias
                    </p>
                    <h3 className="font-anton text-lg uppercase m-0 mt-0.5">Insígnias</h3>
                  </div>
                  <span className="font-mono text-xs font-bold text-gold bg-gold/12 border border-gold/35 px-2.5 py-0.5 rounded-full">
                    {totalDesbloqueadas} / {insignias.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                          <div className="text-xs opacity-85 leading-snug">{ins.descricao}</div>
                          <div className="font-mono text-xs mt-2 pt-1.5 border-t border-white/15 flex items-center justify-between">
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

                <p className="font-mono text-xs text-muted-2 mt-3.5 mb-0 leading-relaxed">
                  Insígnia é carta colecionável: avaliada automaticamente sobre suas marcas reais de uso.
                </p>
              </section>

              {/* Título de honra equipado */}
              <SeletorTitulo
                tituloAtual={estadoComu?.perfil.titulo_ativo || 'Aventureiro Iniciante'}
                titulosDisponiveis={
                  estadoComu?.perfil.titulos_desbloqueados && estadoComu.perfil.titulos_desbloqueados.length > 0
                    ? estadoComu.perfil.titulos_desbloqueados
                    : ['Aventureiro Iniciante']
                }
                onAtualizado={() => {
                  recarregarComunidade()
                }}
              />
            </div>
          )}

          {abaAtiva === 'extrato' && (
            <div
              role="tabpanel"
              id="painel-guilda-extrato"
              aria-labelledby="tab-guilda-extrato"
              className="flex flex-col gap-3 sm:gap-6"
            >
              {/* LIVRO-RAZÃO: XP E CRISTAIS */}
              <section id="extrato" className="scroll-mt-28 p-5 sm:p-6 rounded-2xl bg-panel border border-line">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="font-mono text-xs text-muted-2 uppercase tracking-widest m-0">
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
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  {(dados.xp_pendente_total ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-gold bg-gold/12 border border-gold/35 px-2.5 py-1 rounded-full">
                      <Hourglass size={12} /> +{dados.xp_pendente_total} XP a receber
                    </span>
                  )}
                  <span className="font-mono text-xs text-muted bg-panel-2 border border-line px-2.5 py-1 rounded-full ml-auto">
                    Base +{economia.xp_base_episodio} XP · Cedo +{economia.bonus_cedo} XP
                  </span>
                </div>

                {(dados.pendentes?.length ?? 0) > 0 && (
                  <div className="mb-4 p-3.5 rounded-xl bg-panel-2 border border-gold/30">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-gold uppercase tracking-wider">
                        <Hourglass size={13} /> Fila XP a receber (Acervo)
                      </div>
                      <span className="font-mono text-xs text-muted-2">
                        {dados.pendentes_total_eps ?? dados.pendentes?.length ?? 0} ep(s) · até{' '}
                        {economia.teto_pendente_diario ?? 50} XP/dia
                      </span>
                    </div>
                    <div className="divide-y divide-line/60">
                      {dados.pendentes?.slice(0, 6).map((pend) => (
                        <div
                          key={`pend-${pend.mal_id}-${pend.episode_number}`}
                          className="py-1.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <Link
                              to={`/anime/${pend.mal_id}`}
                              className="font-bold text-text hover:text-holo-3 transition-colors line-clamp-1"
                            >
                              {pend.titulo_anime} · <span className="font-mono">ep {pend.episode_number}</span>
                            </Link>
                            <span className="font-mono text-xs text-muted-2">{pend.motivo}</span>
                          </div>
                          <span className="font-mono font-bold text-gold shrink-0">
                            +{pend.xp_pendente} XP (pendente)
                          </span>
                        </div>
                      ))}
                    </div>
                    {(dados.pendentes_total_eps ?? 0) > 6 && (
                      <p className="font-mono text-xs text-muted-2 mt-2 mb-0">
                        + {(dados.pendentes_total_eps ?? 0) - 6} episódio(s) na fila aguardando os próximos dias.
                      </p>
                    )}
                  </div>
                )}

                {(() => {
                  const itensExtrato = extratoPaginado?.itens ?? extrato.slice(0, EXTRATO_POR_PAGINA)
                  const totalItensExtrato =
                    extratoPaginado?.total ?? dados.extrato_total ?? extrato.length
                  const totalPaginasExtrato =
                    extratoPaginado?.total_paginas ??
                    dados.extrato_total_paginas ??
                    Math.max(1, Math.ceil(totalItensExtrato / EXTRATO_POR_PAGINA))
                  const paginaAtualExtrato = extratoPaginado?.pagina ?? paginaExtrato

                  if (itensExtrato.length === 0 && !carregandoExtrato) {
                    return (
                      <div className="p-5 rounded-xl bg-panel-2 border border-line text-center">
                        <p className="text-sm text-muted m-0">
                          Nenhum episódio com XP registrado ainda. Marque episódios assistidos no seu Deck ou
                          na página de uma obra para iniciar sua jornada!
                        </p>
                      </div>
                    )
                  }

                  return (
                    <>
                      <div className={`divide-y divide-line transition-opacity ${carregandoExtrato ? 'opacity-60' : ''}`}>
                        {itensExtrato.map((item) => {
                          const reduzido = ehMotivoReduzido(item.reason)
                          const instanteFormatado = formatarInstanteExtratoGuilda(item.earned_at, item.de_hoje)
                          return (
                            <div
                              key={`${item.mal_id}-${item.episode_number}-${item.earned_at}`}
                              className="py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm"
                            >
                              <div className="min-w-0">
                                {item.mal_id > 0 ? (
                                  <Link
                                    to={`/anime/${item.mal_id}`}
                                    className="font-bold text-text hover:text-holo-3 transition-colors line-clamp-1"
                                  >
                                    {item.titulo_anime} · <span className="font-mono">ep {item.episode_number}</span>
                                  </Link>
                                ) : (
                                  // XP de missão ou convite: não há anime nem episódio para abrir.
                                  <span className="font-bold text-holo-2 line-clamp-1">{item.titulo_anime}</span>
                                )}
                                <div className="font-mono text-xs text-muted-2 mt-0.5 flex flex-wrap items-center gap-2">
                                  <span>{item.reason}</span>
                                  {item.reason.toLowerCase().includes('vitalidade') && (
                                    <span className="px-1.5 py-px rounded bg-green/15 text-green font-bold">bônus vitalidade</span>
                                  )}
                                  {instanteFormatado && (
                                    <span
                                      className={
                                        item.de_hoje
                                          ? 'px-1.5 py-px rounded bg-holo-3/15 text-holo-3'
                                          : 'text-muted-2'
                                      }
                                    >
                                      {instanteFormatado}
                                    </span>
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

                      <Paginacao
                        pagina={paginaAtualExtrato}
                        totalPaginas={totalPaginasExtrato}
                        totalItens={totalItensExtrato}
                        porPagina={EXTRATO_POR_PAGINA}
                        aoMudar={setPaginaExtrato}
                      />
                    </>
                  )
                })()}

                <p className="font-mono text-xs text-muted-2 mt-4 mb-0 leading-relaxed">
                  Cada linha guarda quanto valeu <b className="text-text">na hora</b>. Desmarcar um
                  episódio devolve exatamente isso; listas importadas e obras fechadas como Completo vão
                  para a fila <b className="text-text">XP a receber</b> e entram aos poucos sem passar do teto.
                </p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between p-3.5 rounded-xl bg-panel-2 border border-line/60 mb-3 gap-3">
                  <div className="flex items-center gap-3">
                    <IconeAniCoin size={26} animar />
                    <div>
                      <span className="font-mono text-xs text-muted-2 uppercase tracking-wider block">Saldo da Carteira</span>
                      <span className="font-anton text-2xl text-holo-3">{saldoCristais.toLocaleString('pt-BR')} ₳</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/loja"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-holo-3/40 bg-holo-3/15 text-holo-3 hover:bg-holo-3/25 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <ShoppingBag size={12} /> Ir para a Loja
                    </Link>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setModalTransferirAberto(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-line bg-panel-2 text-text hover:border-holo-3 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Send size={12} /> Transferir AniCoins
                      </button>
                    )}
                    <span className="font-mono text-xs text-muted hidden sm:inline">
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
                            <div className="font-mono text-xs text-muted-2 mt-0.5 flex flex-wrap items-center gap-2">
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

                <p className="font-mono text-xs text-muted-2 mt-4 mb-0 leading-relaxed">
                  O saldo é derivado diretamente pelo somatório do livro-razão (<b className="text-text">crystal_ledger</b>).
                  Toda entrada e saída é imutável e com controle de concorrência.
                </p>
              </>
            )}
          </section>
            </div>
          )}

          {abaAtiva === 'progresso' && (
            <div
              role="tabpanel"
              id="painel-guilda-progresso"
              aria-labelledby="tab-guilda-progresso"
              className="flex flex-col gap-3 sm:gap-6"
            >
              {/* ESPECIALISTA DE GÊNERO */}
              <section id="especialidade" className="scroll-mt-28 p-5 sm:p-6 rounded-2xl bg-panel border border-line">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="font-mono text-xs text-muted-2 uppercase tracking-widest m-0">
                      // bagagem de acervo · moeda 2
                    </p>
                    <h3 className="font-anton text-lg uppercase m-0 mt-0.5">Especialista de Gênero</h3>
                  </div>
                  <span className="font-mono text-xs text-holo-3 bg-holo-3/12 border border-holo-3/35 px-2.5 py-1 rounded-full">
                    Peso máx. {status.peso_maximo_voto.toFixed(1).replace('.', ',')}×
                  </span>
                </div>

                <div className="mb-4">
                  <CartaoEspecialidade
                    especialidade={especialidade}
                    passiva={dados.passiva_especialidade}
                    vazio="Assista a 3 animes do mesmo gênero (Assistindo, Em Dia ou Completo) para conquistar sua especialidade."
                  />
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
                          <div className="font-mono text-xs text-muted-2">
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
                          <div className="text-xs text-muted-2 mt-0.5">
                            {esp.peso_voto.toFixed(1).replace('.', ',')}× voto
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="font-mono text-xs text-muted-2 mt-4 mb-0 leading-relaxed">
                  Seu domínio vem de todo o seu acervo (<b className="text-text">N1</b> = 3 obras ·{' '}
                  <b className="text-text">N2</b> = 8 · <b className="text-text">N3</b> = 15 ·{' '}
                  <b className="text-text">N4</b> = 25 · <b className="text-text">N5</b> = 40+).
                </p>
              </section>

              {/* ESCADA DE RANKS F → SS */}
              <section className="p-5 sm:p-6 rounded-2xl bg-panel border border-line">
                <p className="font-mono text-xs text-muted-2 uppercase tracking-widest m-0">
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
                          <InsigniaRank rank={r.rank} tamanho={32} className={`shrink-0 ${atingido ? '' : 'opacity-45 grayscale'}`} />
                          <span className="font-bold truncate">{r.titulo}</span>
                        </div>
                        <span className="font-mono text-xs shrink-0 flex items-center gap-1">
                          Nv {r.nivel_minimo}+
                          {atual && <ChevronRight size={12} className="text-holo-3" />}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-line flex items-center gap-2 text-xs text-muted">
                  <Shield size={14} className="text-holo-2 shrink-0" />
                  <span>Ficar dias sem assistir nunca reduz seu XP nem rebaixa seu Rank.</span>
                </div>
              </section>

              {!ehDesktop && (
                <>
                  <CartaoVitais />
                  <CardConviteAmigos onResgatado={() => recarregarComunidade()} />
                </>
              )}
            </div>
          )}
        </div>

        {/* COLUNA LATERAL */}
        {ehDesktop && (
          <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
            <CartaoVitais />

            {/* CONVITE DE AMIGOS COM RECOMPENSAS */}
            <CardConviteAmigos onResgatado={() => recarregarComunidade()} />
          </aside>
        )}
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
