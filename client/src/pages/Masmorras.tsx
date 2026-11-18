// client/src/pages/Masmorras.tsx
// Masmorras (Fase 18.4d): andares seguidos com monstros do catálogo, uma por dia. A luta inteira
// é decidida no servidor; a tela mostra o resultado de cada andar, com o registro dos golpes.
import BotaoEmGrupo from '../components/rpg/BotaoEmGrupo'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Hammer, ChevronRight, DoorOpen, Lock, Sparkles, Ticket, Trophy } from 'lucide-react'
import IconeDoMonstro from '../components/rpg/IconeDoMonstro'
import { textoDosMateriais } from '../lib/forja'
import IconeOuro from '../components/IconeOuro'
import {
  abaixoDaVidaMinima,
  descreverTurno,
  entrarNaMasmorra,
  estiloDaRaridade,
  obterMasmorras,
  resumoDoItem,
  rotuloDaDificuldade,
  type EstadoMasmorras,
  type RespostaMasmorra,
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
                      <li key={k} className="flex items-center justify-between gap-2 rounded-lg border border-line/60 px-2.5 py-1.5">
                        <span className="min-w-0 truncate">
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

      <div role="status" className={`flex flex-col gap-3 rounded-2xl border p-4 ${expedicao.completou ? 'border-gold/60 bg-gold/10' : 'border-coral/50 bg-coral/10'}`}>
        <p className="m-0 font-anton text-3xl uppercase leading-none">{expedicao.completou ? 'Masmorra completa' : 'Fim da exploração'}</p>
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
        <button type="button" onClick={aoVoltar} className="h-10 cursor-pointer self-start rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void">
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
  const [erroDaEntrada, setErroDaEntrada] = useState('')

  const carregar = () => {
    setCarregando(true)
    obterMasmorras().then((r) => {
      setEstado(r.dados ?? null)
      setErro(r.erro ?? '')
      setSemPersonagem(Boolean(r.semPersonagem))
      setCarregando(false)
    })
  }
  useEffect(carregar, [])

  const entrar = async (id: string) => {
    setEntrando(id)
    setErroDaEntrada('')
    const r = await entrarNaMasmorra(id)
    setEntrando(null)
    if (r.dados) {
      setResposta(r.dados)
      window.scrollTo?.({ top: 0 })
    } else setErroDaEntrada(r.erro ?? 'Não foi possível entrar agora.')
  }

  const fraco = abaixoDaVidaMinima(estado?.vida, estado?.hoje.regras)
  const feita = Boolean(estado?.feita_hoje)

  return (
    <div className={CONTAINER}>
      <header className="mb-4 hidden items-center gap-1 select-none md:flex">
        <Link to="/personagem" aria-label="Voltar para o personagem" className="-ml-2 flex h-10 w-11 items-center justify-center rounded-full text-muted hover:text-text">
          <ChevronLeft size={22} />
        </Link>
        <p className={ROTULO_DE_SECAO}>Masmorras</p>
      </header>

      {carregando ? (
        <div className="h-72 animate-pulse rounded-2xl border border-line bg-panel" />
      ) : semPersonagem ? (
        <div className="rounded-2xl border border-line bg-panel p-6 text-center">
          <h1 className="m-0 mb-2 font-anton text-2xl uppercase">Desperte o seu personagem</h1>
          <Link to="/personagem" className="inline-flex h-10 items-center rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void">
            Ir para o despertar
          </Link>
        </div>
      ) : !estado ? (
        <div className="rounded-2xl border border-line bg-panel p-6 text-center">
          <h1 className="m-0 mb-2 font-anton text-2xl uppercase">Masmorras indisponíveis</h1>
          <p className="m-0 mb-4 text-sm text-muted">{erro}</p>
          <button type="button" onClick={carregar} className="h-10 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void">
            Tentar de novo
          </button>
        </div>
      ) : resposta ? (
        <Resultado resposta={resposta} aoVoltar={() => { setResposta(null); carregar() }} />
      ) : (
        <div className="flex flex-col gap-3 sm:gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-anton text-[1.75rem] sm:text-[2.6rem] uppercase leading-none">Masmorras</h1>
            <p className="m-0 text-sm text-muted line-clamp-2 sm:line-clamp-none">
              Andares seguidos, uma masmorra por dia. Entre um andar e outro, você recupera 25% da Vida. Completar dá 50% a mais de Ouro e um baú com chance de item.
              Cair custa Ouro, como nas expedições.
            </p>
          </div>

          <dl className="m-0 grid grid-cols-3 gap-1.5 sm:gap-2.5">
            <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-panel p-2 sm:p-3">
              <dt className="text-[11px] font-semibold text-muted sm:text-xs">HP</dt>
              <dd className="m-0 font-anton text-lg leading-none sm:text-xl">
                {estado.vida.atual}
                <span className="font-mono text-xs text-muted"> / {estado.vida.maxima}</span>
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-panel p-2 sm:p-3">
              <dt className="text-[11px] font-semibold text-muted sm:text-xs">Ouro</dt>
              <dd className="m-0 font-anton text-lg leading-none sm:text-xl">{estado.hoje.ouro ?? 0}</dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-panel p-2 sm:p-3">
              <dt className="text-[11px] font-semibold text-muted sm:text-xs">Hoje</dt>
              <dd className={`m-0 text-sm font-bold leading-tight ${feita ? 'text-muted' : 'text-green'}`}>{feita ? 'Já explorou' : 'Disponível'}</dd>
            </div>
          </dl>

          {fraco && (
            <p role="status" className="m-0 rounded-xl border border-coral/40 bg-coral/10 p-3 text-xs">
              Você está abaixo de 30% de Vida. <Link to="/expedicoes" className="font-bold text-holo-3">Recupere nas Expedições</Link> antes de entrar.
            </p>
          )}
          {erroDaEntrada && <p role="alert" className="m-0 text-xs font-bold text-coral">{erroDaEntrada}</p>}

          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
            {estado.masmorras.map((m) => {
              const dificuldade = rotuloDaDificuldade(m.dificuldade)
              const fechada = m.bloqueada || feita || fraco || entrando !== null
              return (
                <li key={m.id} className={`flex flex-col gap-2.5 rounded-2xl border bg-panel p-3 sm:gap-3 sm:p-4 ${m.bloqueada ? 'border-line opacity-70' : 'border-holo-2/40'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="m-0 text-base font-bold">{m.nome}</h2>
                    {m.bloqueada ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 font-mono text-xs text-muted">
                        <Lock size={11} aria-hidden="true" /> nível {m.nivel_minimo}
                      </span>
                    ) : (
                      <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${dificuldade.classe}`}>{dificuldade.rotulo}</span>
                    )}
                  </div>
                  <p className="m-0 text-xs text-muted">{m.descricao}</p>
                  <ol aria-label="Andares" className="-mx-1 m-0 flex list-none items-center gap-1 overflow-x-auto px-1 p-0 sm:flex-wrap sm:gap-1.5">
                    {m.monstros.map((monstro, i) => (
                      <li key={i} className="flex shrink-0 items-center gap-1">
                        {i > 0 && <ChevronRight size={14} className="text-muted-2" aria-hidden="true" />}
                        <span className="flex items-center gap-1.5 rounded-xl border border-line bg-panel-2/50 py-0.5 pl-0.5 pr-2">
                          <IconeDoMonstro monstro={monstro} tamanho="h-7 w-7" />
                          <span className="max-w-[6.5rem] truncate text-[11px] font-semibold sm:max-w-none sm:text-xs">{monstro.nome}</span>
                        </span>
                      </li>
                    ))}
                    <li className="flex shrink-0 items-center gap-1">
                      <ChevronRight size={14} className="text-muted-2" aria-hidden="true" />
                      <Trophy size={18} className="text-gold" aria-label="Baú" />
                    </li>
                  </ol>
                  <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => entrar(m.id)}
                    disabled={fechada}
                    aria-label={`Entrar em ${m.nome}`}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <DoorOpen size={15} aria-hidden="true" /> {entrando === m.id ? 'Explorando…' : 'Entrar'}
                    {entrando !== m.id && estado.custos_mana && (
                      <span className="ml-1 font-mono text-[11px] font-semibold opacity-80">· {estado.custos_mana.masmorra} MP</span>
                    )}
                  </button>
                  <BotaoEmGrupo tipo="masmorra" alvoId={m.id} nome={m.nome} desativado={fechada} />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
