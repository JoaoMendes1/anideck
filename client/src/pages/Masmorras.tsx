// client/src/pages/Masmorras.tsx
// Masmorras (Fase 18.4d): andares seguidos com monstros do catálogo, uma por dia. A luta inteira
// é decidida no servidor; a tela mostra o resultado de cada andar, com o registro dos golpes.
import BatalhaEmGrupo from '../components/rpg/BatalhaEmGrupo'
import BotaoEmGrupo from '../components/rpg/BotaoEmGrupo'
import CombateInterativoModal from '../components/rpg/CombateInterativoModal'
import ComprarLutaExtra from '../components/rpg/ComprarLutaExtra'
import MasmorraRoguelite from '../components/rpg/MasmorraRoguelite'
import SeletorEsquadrao from '../components/rpg/SeletorEsquadrao'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Hammer, ChevronRight, DoorOpen, Lock, Sparkles, Ticket, Trophy } from 'lucide-react'
import IconeDoMonstro from '../components/rpg/IconeDoMonstro'
import { textoDosMateriais } from '../lib/forja'
import IconeOuro from '../components/IconeOuro'
import {
  abaixoDaVidaMinima,
  agirRoguelite,
  descreverTurno,
  entrarNaMasmorra,
  estiloDaRaridade,
  iniciarCombateInterativo,
  iniciarRoguelite,
  obterEstadoRoguelite,
  obterMasmorras,
  resumoDoItem,
  rotuloDaDificuldade,
  type EstadoCombateInterativo,
  type EstadoMasmorras,
  type RespostaMasmorra,
  type RespostaRoguelite,
} from '../lib/rpg'

const ROTULO_DE_SECAO = 'font-mono text-xs font-semibold uppercase tracking-widest text-muted m-0'
const CONTAINER = 'w-full min-w-0 max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10 pt-3 sm:pt-6 pb-24'

function Resultado({ resposta, aoVoltar }: { resposta: RespostaMasmorra; aoVoltar: () => void }) {
  const { expedicao, recompensa, masmorra } = resposta
  return (
    <section aria-label={`Resultado de ${masmorra.nome}`} className="flex flex-col gap-4">
      <h1 className="m-0 font-anton text-[1.6rem] sm:text-[2.4rem] uppercase leading-none">{masmorra.nome}</h1>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {expedicao.andares.map((andar, i) => {
          const r = andar.resultado
          const situacao = r.venceu ? `Vencido em ${r.rodadas} ${r.rodadas === 1 ? 'rodada' : 'rodadas'}` : r.caiu ? 'Você caiu aqui' : 'Você recuou aqui'
          return (
            <li key={i} className={`flex flex-col gap-2 rounded-2xl border bg-panel p-4 ${r.venceu ? 'border-line' : 'border-coral/50'}`}>
              <div className="flex items-center gap-3">
                <IconeDoMonstro monstro={andar.monstro} tamanho="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-mono text-xs text-muted">Andar {i + 1}</p>
                  <p className="m-0 font-bold">{andar.monstro.nome}</p>
                </div>
                <span className={`shrink-0 text-xs font-bold ${r.venceu ? 'text-green' : 'text-coral'}`}>{situacao}</span>
              </div>
              <p className="m-0 font-mono text-xs text-muted">
                Vida: {r.vida_inicial ?? '–'} → {r.vida_final ?? '–'}
              </p>
              <details className="text-xs">
                <summary className="cursor-pointer select-none text-muted hover:text-text">Ver os golpes</summary>
                <ol className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
                  {r.turnos.map((turno, k) => {
                    const { texto, valor } = descreverTurno(turno, andar.monstro.nome)
                    const doJogador = turno.atacante === 'jogador'
                    return (
                      <li key={k} className="flex items-start justify-between gap-2 rounded-xl border border-line/70 bg-panel-2/50 px-3 py-1.5">
                        <span className="min-w-0 flex-1 break-words leading-snug text-text">
                          {texto}
                          {turno.critico && <strong className="ml-1 text-gold">Crítico!</strong>}
                        </span>
                        <span className={`shrink-0 font-mono font-bold ${turno.cura && doJogador ? 'text-green' : doJogador ? 'text-holo-3' : 'text-coral'}`}>{valor}</span>
                      </li>
                    )
                  })}
                </ol>
              </details>
            </li>
          )
        })}
      </ol>

      <div role="status" className={`flex flex-col gap-3 rounded-2xl border p-4 ${expedicao.completou ? 'border-gold/60 bg-gradient-to-br from-gold/15 to-panel' : 'border-coral/50 bg-gradient-to-br from-coral/15 to-panel'}`}>
        <p className="m-0 font-anton text-2xl uppercase leading-none sm:text-3xl">{expedicao.completou ? 'Masmorra completa' : 'Fim da exploração'}</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
          {(recompensa.ouro ?? 0) > 0 && (
            <li className="flex items-center gap-2">
              <IconeOuro size={16} /> {recompensa.ouro} de Ouro{expedicao.completou ? ', com o bônus de completar' : ''}
            </li>
          )}
          {recompensa.bilhetes > 0 && (
            <li className="flex items-center gap-2">
              <Ticket size={16} className="text-gold" aria-hidden="true" /> {recompensa.bilhetes === 1 ? '1 bilhete' : `${recompensa.bilhetes} bilhetes`} de invocação
            </li>
          )}
          {recompensa.materiais && textoDosMateriais(recompensa.materiais) && (
            <li className="flex items-center gap-2 text-holo-2">
              <Hammer size={16} aria-hidden="true" />
              Materiais da Forja: {textoDosMateriais(recompensa.materiais)}
            </li>
          )}
          {recompensa.item && (
            <li className={`flex flex-col rounded-xl border p-2.5 ${estiloDaRaridade(recompensa.item.raridade).borda}`}>
              <span className={`font-bold ${estiloDaRaridade(recompensa.item.raridade).texto}`}>
                <Sparkles size={14} className="mr-1 inline" aria-hidden="true" /> Baú: {recompensa.item.nome}
              </span>
              <span className="text-xs text-muted">{estiloDaRaridade(recompensa.item.raridade).rotulo} · {resumoDoItem(recompensa.item)} · já no seu inventário</span>
            </li>
          )}
          {(recompensa.ouro_perdido ?? 0) > 0 && (
            <li className="text-coral">A queda custou {recompensa.ouro_perdido} de Ouro.</li>
          )}
        </ul>
        <button type="button" onClick={aoVoltar} className="h-11 w-full cursor-pointer rounded-full bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 px-5 text-xs font-extrabold text-void sm:w-auto sm:self-start">
          Voltar às masmorras
        </button>
      </div>
    </section>
  )
}

export default function Masmorras() {
  const [estado, setEstado] = useState<EstadoMasmorras | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [semPersonagem, setSemPersonagem] = useState(false)
  const [entrando, setEntrando] = useState<string | null>(null)
  const [resposta, setResposta] = useState<RespostaMasmorra | null>(null)
  const [roguelite, setRoguelite] = useState<RespostaRoguelite | null>(null)
  const [rogueliteOcupado, setRogueliteOcupado] = useState(false)
  const [erroRoguelite, setErroRoguelite] = useState('')
  const [erroDaEntrada, setErroDaEntrada] = useState('')
  const [aliadosEsquadrao, setAliadosEsquadrao] = useState<string[]>([])
  const [combateTatico, setCombateTatico] = useState(false)
  const [combateInterativo, setCombateInterativo] = useState<EstadoCombateInterativo | null>(null)

  const carregar = () => {
    setCarregando(true)
    obterMasmorras().then((r) => {
      setEstado(r.dados ?? null)
      setErro(r.erro ?? '')
      setSemPersonagem(Boolean(r.semPersonagem))
      if (r.dados?.elenco) {
        setAliadosEsquadrao((atual) => {
          const validos = new Set(r.dados!.elenco!.filter((h) => !h.ativo).map((h) => h.id))
          const preservados = atual.filter((id) => validos.has(id))
          if (preservados.length > 0) return preservados
          return r.dados!.elenco!.filter((h) => !h.ativo && h.no_grupo).map((h) => h.id)
        })
      }
      if (r.dados) {
        obterEstadoRoguelite().then((rg) => {
          if (rg.dados?.ativo && rg.dados.sessao) setRoguelite(rg.dados)
        })
      }
      setCarregando(false)
    })
  }
  useEffect(carregar, [])

  const entrar = async (id: string) => {
    setEntrando(id)
    setErroDaEntrada('')
    if (combateTatico) {
      const r = await iniciarCombateInterativo('masmorra', id, aliadosEsquadrao)
      setEntrando(null)
      if (r.dados) {
        setCombateInterativo(r.dados)
        return
      }
      setErroDaEntrada(r.erro ?? 'Não foi possível iniciar o combate tático.')
      return
    }
    const r = aliadosEsquadrao.length > 0 ? await entrarNaMasmorra(id, aliadosEsquadrao) : await entrarNaMasmorra(id)
    setEntrando(null)
    if (r.dados) {
      setResposta(r.dados)
      window.scrollTo?.({ top: 0 })
    } else setErroDaEntrada(r.erro ?? 'Não foi possível entrar agora.')
  }

  const entrarRoguelite = async (id: string) => {
    setEntrando(id)
    setErroDaEntrada('')
    setErroRoguelite('')
    const r = aliadosEsquadrao.length > 0 ? await iniciarRoguelite(id, aliadosEsquadrao) : await iniciarRoguelite(id)
    setEntrando(null)
    if (r.dados) {
      setRoguelite(r.dados)
      window.scrollTo?.({ top: 0 })
    } else setErroDaEntrada(r.erro ?? 'Não foi possível iniciar a incursão agora.')
  }

  const agirNaIncursao = async (acao: 'bencao' | 'altar' | 'avancar' | 'recuar', escolha?: string) => {
    setRogueliteOcupado(true)
    setErroRoguelite('')
    const r = await agirRoguelite(acao, escolha)
    setRogueliteOcupado(false)
    if (r.dados) {
      setRoguelite(r.dados)
    } else setErroRoguelite(r.erro ?? 'Não foi possível executar essa ação agora.')
  }

  const fraco = abaixoDaVidaMinima(estado?.vida, estado?.hoje.regras)
  const feita = Boolean(estado?.feita_hoje)

  return (
    <div className={CONTAINER}>
      <header className="mb-3 sm:mb-4 flex items-center gap-2.5 select-none">
        <Link
          to="/guilda"
          aria-label="Voltar para a Guilda"
          className="inline-flex h-9 items-center gap-1 rounded-full border border-line bg-panel px-3 text-xs font-bold text-text transition-colors hover:border-holo-3/60 hover:text-holo-3"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span>Voltar</span>
        </Link>
        <p className={ROTULO_DE_SECAO}>Guilda · Masmorras</p>
      </header>

      {carregando ? (
        <div className="h-72 animate-pulse rounded-2xl border border-line bg-panel" />
      ) : semPersonagem ? (
        <div className="rounded-2xl surface-glass p-6 text-center">
          <h1 className="m-0 mb-2 font-manrope font-extrabold text-xl tracking-tight">Desperte o seu personagem</h1>
          <Link to="/personagem" className="inline-flex h-10 items-center rounded-full bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 px-5 text-xs font-extrabold text-void shadow-md">
            Ir para o despertar
          </Link>
        </div>
      ) : !estado ? (
        <div className="rounded-2xl surface-glass p-6 text-center">
          <h1 className="m-0 mb-2 font-manrope font-extrabold text-xl tracking-tight">Masmorras indisponíveis</h1>
          <p className="m-0 mb-4 text-sm text-muted">{erro}</p>
          <button type="button" onClick={carregar} className="h-10 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 px-5 text-xs font-extrabold text-void shadow-md">
            Tentar de novo
          </button>
        </div>
      ) : resposta?.grupo_resultado ? (
        <BatalhaEmGrupo
          resultado={resposta.grupo_resultado}
          recompensa={{
            ouro: resposta.recompensa.ouro ?? 0,
            ouro_perdido: resposta.recompensa.ouro_perdido ?? 0,
            bilhetes: resposta.recompensa.bilhetes,
            item: resposta.recompensa.item,
            mana: estado.custos_mana?.masmorra ?? 0,
          }}
          aoVoltar={() => { setResposta(null); carregar() }}
          rotuloVoltar="Voltar às masmorras"
        />
      ) : resposta ? (
        <Resultado resposta={resposta} aoVoltar={() => { setResposta(null); carregar() }} />
      ) : roguelite ? (
        <MasmorraRoguelite
          resposta={roguelite}
          ocupado={rogueliteOcupado}
          erro={erroRoguelite}
          aoEscolherBencao={(id) => agirNaIncursao('bencao', id)}
          aoDecidirAltar={(escolha) => agirNaIncursao('altar', escolha)}
          aoAvancar={() => agirNaIncursao('avancar')}
          aoRecuar={() => agirNaIncursao('recuar')}
          aoEncerrarResumo={() => { setRoguelite(null); carregar() }}
        />
      ) : (
        <div className="flex flex-col gap-3 sm:gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-anton text-[1.75rem] sm:text-[2.6rem] uppercase leading-none">Masmorras</h1>
            <p className="m-0 text-xs sm:text-sm leading-relaxed text-muted">
              Andares seguidos, uma masmorra por dia. Entre um andar e outro, você recupera 25% da Vida. Completar dá 50% a mais de Ouro e um baú com chance de item.
              Cair custa Ouro, como nas expedições.
            </p>
          </div>

          <dl className="m-0 grid grid-cols-3 gap-2 sm:gap-2.5">
            <div className="flex min-w-0 flex-col justify-between gap-1 rounded-xl border border-line bg-panel p-2.5 sm:p-3">
              <dt className="text-xs font-semibold text-muted">HP</dt>
              <dd className="m-0 font-anton text-lg leading-none tabular-nums sm:text-xl">
                {estado.vida.atual}
                <span className="font-mono text-xs font-normal text-muted"> / {estado.vida.maxima}</span>
              </dd>
            </div>
            <div className="flex min-w-0 flex-col justify-between gap-1 rounded-xl border border-line bg-panel p-2.5 sm:p-3">
              <dt className="flex items-center gap-1 text-xs font-semibold text-muted">
                <IconeOuro size={13} /> Ouro
              </dt>
              <dd className="m-0 font-anton text-lg leading-none tabular-nums sm:text-xl">{estado.hoje.ouro ?? 0}</dd>
            </div>
            <div className="flex min-w-0 flex-col justify-between gap-1 rounded-xl border border-line bg-panel p-2.5 sm:p-3">
              <dt className="text-xs font-semibold text-muted">Hoje</dt>
              <dd className={`m-0 text-sm font-bold leading-tight ${feita ? 'text-muted' : 'text-green'}`}>{feita ? 'Já explorou' : 'Disponível'}</dd>
            </div>
          </dl>

          {fraco && (
            <p role="status" className="m-0 rounded-xl border border-coral/40 bg-coral/10 p-3 text-xs">
              Você está abaixo de 30% de Vida. <Link to="/expedicoes" className="font-bold text-holo-3">Recupere nas Expedições</Link> antes de entrar.
            </p>
          )}
          {feita && <ComprarLutaExtra tipo="masmorra" aoComprar={carregar} />}
          {erroDaEntrada && <p role="alert" className="m-0 text-xs font-bold text-coral">{erroDaEntrada}</p>}

          {estado.elenco && estado.elenco.length > 0 && (
            <SeletorEsquadrao
              elenco={estado.elenco}
              aliadosSelecionados={aliadosEsquadrao}
              aoMudarAliados={setAliadosEsquadrao}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-panel px-3.5 py-2.5 text-xs">
            <span className="font-semibold text-text">Modo da masmorra rápida:</span>
            <div role="group" aria-label="Modo de combate" className="inline-flex rounded-xl border border-line bg-panel-2 p-0.5">
              <button
                type="button"
                aria-pressed={!combateTatico}
                onClick={() => setCombateTatico(false)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  !combateTatico ? 'bg-holo-3 text-void' : 'text-muted hover:text-text'
                }`}
              >
                Automático
              </button>
              <button
                type="button"
                aria-pressed={combateTatico}
                onClick={() => setCombateTatico(true)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  combateTatico ? 'bg-holo-3 text-void' : 'text-muted hover:text-text'
                }`}
              >
                Tático (por rodada)
              </button>
            </div>
          </div>

          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
            {estado.masmorras.map((m) => {
              const dificuldade = rotuloDaDificuldade(m.dificuldade)
              const fechada = m.bloqueada || feita || fraco || entrando !== null
              return (
                <li key={m.id} className={`flex flex-col gap-3 rounded-2xl border bg-panel p-3.5 sm:p-4 ${m.bloqueada ? 'border-line opacity-70' : 'border-holo-2/40'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="m-0 text-base font-bold">{m.nome}</h2>
                    {m.bloqueada ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 font-mono text-xs text-muted">
                        <Lock size={11} aria-hidden="true" /> nível {m.nivel_minimo}
                      </span>
                    ) : (
                      <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${dificuldade.classe}`}>{dificuldade.rotulo}</span>
                    )}
                  </div>
                  <p className="m-0 text-xs leading-relaxed text-muted">{m.descricao}</p>
                  <ol aria-label="Andares" className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0">
                    {m.monstros.map((monstro, i) => (
                      <li key={i} className="flex shrink-0 items-center gap-1">
                        {i > 0 && <ChevronRight size={13} className="text-muted-2" aria-hidden="true" />}
                        <span className="flex items-center gap-1.5 rounded-xl border border-line bg-panel-2/50 py-0.5 pl-0.5 pr-2.5">
                          <IconeDoMonstro monstro={monstro} tamanho="h-7 w-7" />
                          <span className="text-xs font-semibold">{monstro.nome}</span>
                        </span>
                      </li>
                    ))}
                    <li className="flex shrink-0 items-center gap-1">
                      <ChevronRight size={13} className="text-muted-2" aria-hidden="true" />
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gold/35 bg-gold/10" title="Baú de recompensa">
                        <Trophy size={15} className="text-gold" aria-label="Baú" />
                      </span>
                    </li>
                  </ol>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => entrar(m.id)}
                    disabled={fechada}
                    aria-label={`Entrar em ${m.nome}`}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <DoorOpen size={15} aria-hidden="true" /> {entrando === m.id ? 'Explorando…' : aliadosEsquadrao.length > 0 ? `Entrar (${aliadosEsquadrao.length + 1} heróis)` : 'Entrar'}
                    {entrando !== m.id && estado.custos_mana && (
                      <span className="ml-1 font-mono text-xs font-semibold opacity-80">· {estado.custos_mana.masmorra} MP</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => entrarRoguelite(m.id)}
                    disabled={fechada}
                    aria-label={`Incursão Roguelite em ${m.nome}`}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-holo-3/50 bg-holo-3/10 px-4 text-xs font-extrabold text-holo-3 transition hover:bg-holo-3/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles size={14} aria-hidden="true" /> Roguelite
                  </button>
                  <BotaoEmGrupo
                    tipo="masmorra"
                    alvoId={m.id}
                    nome={m.nome}
                    desativado={fechada}
                    elenco={estado.elenco}
                    esquadraoInicial={aliadosEsquadrao}
                  />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {combateInterativo && (
        <CombateInterativoModal
          estadoInicial={combateInterativo}
          aoFechar={(concluiu) => {
            setCombateInterativo(null)
            if (concluiu) carregar()
          }}
        />
      )}
    </div>
  )
}
