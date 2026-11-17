// client/src/pages/Expedicoes.tsx
// Expedições (Fase 18.4a): o personagem enfrenta monstros por turnos.
//
// A luta é decidida inteira no servidor, com os atributos que ele calcula. A tela só escolhe o
// monstro e reproduz os golpes, um a um, para dar a sensação de batalha. Para quem pediu
// movimento reduzido, a luta aparece de uma vez.
//
// Arte provisória: ícone e cor por monstro. A ilustração entra depois, por id.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bug,
  ChevronLeft,
  Crown,
  Dog,
  Droplet,
  Flame,
  Ghost,
  Heart,
  Mountain,
  Skull,
  Sparkles,
  Swords,
  Ticket,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  batalhar,
  batalhasRestantes,
  estiloDaRaridade,
  descreverTurno,
  obterExpedicoes,
  resumoDoItem,
  rotuloDaDificuldade,
  type EstadoExpedicoes,
  type MonstroRPG,
  type RespostaBatalha,
} from '../lib/rpg'
import { arteDoMonstro } from '../lib/artesRpg'

const ROTULO_DE_SECAO = 'font-mono text-xs font-semibold uppercase tracking-widest text-muted m-0'
const CONTAINER = 'w-full min-w-0 max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-24'
const INTERVALO_ENTRE_GOLPES = 380

const ICONE_DO_MONSTRO: Record<string, LucideIcon> = {
  slime_de_eter: Droplet,
  goblin_batedor: Bug,
  lobo_sombrio: Dog,
  golem_de_runas: Mountain,
  espectro_do_vazio: Ghost,
  cavaleiro_caido: Skull,
  dragao_de_eter: Flame,
  primordial_esquecido: Crown,
}

const ESTILO_DO_TIPO: Record<string, { rotulo: string; borda: string; icone: string }> = {
  comum: { rotulo: 'Comum', borda: 'border-line', icone: 'text-holo-3 bg-holo-3/10' },
  raro: { rotulo: 'Raro', borda: 'border-holo-2/60', icone: 'text-holo-2 bg-holo-2/15' },
  chefe: { rotulo: 'Chefão', borda: 'border-gold/60', icone: 'text-gold bg-gold/15' },
}

function IconeDoMonstro({ monstro, tamanho = 'h-14 w-14' }: { monstro: Pick<MonstroRPG, 'id' | 'tipo'>; tamanho?: string }) {
  const Icone = ICONE_DO_MONSTRO[monstro.id] ?? Skull
  const estilo = ESTILO_DO_TIPO[monstro.tipo] ?? ESTILO_DO_TIPO.comum
  const arte = arteDoMonstro(monstro.id)
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${tamanho} ${estilo.icone}`}>
      {arte ? (
        <img src={arte} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-contain" />
      ) : (
        <Icone size={26} aria-hidden="true" />
      )}
    </span>
  )
}

function querMovimentoReduzido(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

function BarraDeVida({ rotulo, atual, maximo, cor }: { rotulo: string; atual: number; maximo: number; cor: string }) {
  const pct = maximo > 0 ? Math.max(0, Math.min(100, (atual / maximo) * 100)) : 0
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate font-bold text-text">{rotulo}</span>
        <span className="shrink-0 font-mono text-muted">
          {atual} / {maximo}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Vida de ${rotulo}`}
        aria-valuemin={0}
        aria-valuemax={maximo}
        aria-valuenow={atual}
        className="h-2.5 overflow-hidden rounded-full bg-line"
      >
        <div className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${cor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function TelaDeBatalha({ batalha, aoVoltar }: { batalha: RespostaBatalha; aoVoltar: () => void }) {
  const { monstro, jogador, resultado, recompensa } = batalha
  const total = resultado.turnos.length
  const [mostrados, setMostrados] = useState(() => (querMovimentoReduzido() ? total : 0))
  const terminou = mostrados >= total

  useEffect(() => {
    if (terminou) return
    const id = window.setTimeout(() => setMostrados((n) => n + 1), INTERVALO_ENTRE_GOLPES)
    return () => window.clearTimeout(id)
  }, [mostrados, terminou])

  const ultimo = mostrados > 0 ? resultado.turnos[mostrados - 1] : undefined
  const vidaJogador = ultimo?.vida_jogador ?? jogador.vida
  const vidaMonstro = ultimo?.vida_monstro ?? monstro.vida
  const recentes = resultado.turnos.slice(Math.max(0, mostrados - 6), mostrados).reverse()

  return (
    <section aria-label={`Batalha contra ${monstro.nome}`} className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4">
        <IconeDoMonstro monstro={monstro} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <BarraDeVida rotulo={monstro.nome} atual={vidaMonstro} maximo={monstro.vida} cor="bg-coral" />
          <BarraDeVida rotulo="Você" atual={vidaJogador} maximo={jogador.vida} cor="bg-gradient-to-r from-holo-2 to-holo-3" />
        </div>
      </div>

      <ol aria-live="polite" className="m-0 flex min-h-48 list-none flex-col gap-1.5 p-0">
        {recentes.map((turno, i) => {
          const numero = mostrados - i
          const doJogador = turno.atacante === 'jogador'
          const { texto, valor } = descreverTurno(turno, monstro.nome)
          return (
            <li
              key={numero}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                doJogador ? 'border-holo-3/30 bg-holo-3/5' : 'border-coral/30 bg-coral/5'
              } ${i === 0 ? '' : 'opacity-70'}`}
            >
              <span className="min-w-0 truncate">
                {turno.habilidade ? <strong className={turno.cura ? 'text-green' : 'text-holo-2'}>{texto}</strong> : texto}
                {turno.critico && <strong className="ml-1 text-gold">Crítico!</strong>}
              </span>
              <span
                className={`shrink-0 font-mono font-bold ${turno.cura ? 'text-green' : turno.esquiva ? 'text-muted' : doJogador ? 'text-holo-3' : 'text-coral'}`}
              >
                {valor}
              </span>
            </li>
          )
        })}
      </ol>

      {terminou ? (
        <div
          role="status"
          className={`flex flex-col gap-3 rounded-2xl border p-4 ${resultado.venceu ? 'border-gold/60 bg-gold/10' : 'border-coral/50 bg-coral/10'}`}
        >
          <p className="m-0 font-anton text-3xl uppercase leading-none">{resultado.venceu ? 'Vitória' : 'Derrota'}</p>
          {resultado.venceu ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              <li className="flex items-center gap-2">
                <Ticket size={16} className="text-gold" aria-hidden="true" />
                {recompensa.bilhetes === 1 ? '1 bilhete de invocação' : `${recompensa.bilhetes} bilhetes de invocação`}
              </li>
              {recompensa.item && (
                <li className={`flex flex-col rounded-xl border p-2.5 ${estiloDaRaridade(recompensa.item.raridade).borda}`}>
                  <span className={`font-bold ${estiloDaRaridade(recompensa.item.raridade).texto}`}>
                    <Sparkles size={14} className="mr-1 inline" aria-hidden="true" />
                    {recompensa.item.nome}
                  </span>
                  <span className="text-xs text-muted">
                    {estiloDaRaridade(recompensa.item.raridade).rotulo} · {resumoDoItem(recompensa.item)} · já no seu inventário
                  </span>
                </li>
              )}
            </ul>
          ) : (
            <p className="m-0 text-sm text-muted">
              {resultado.rodadas >= 20 && vidaJogador > 0
                ? 'A luta se arrastou demais e você recuou. Melhore o equipamento e tente de novo.'
                : 'Você foi derrotado. Troque o equipamento ou enfrente um monstro mais fraco.'}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={aoVoltar}
              className="h-11 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void"
            >
              Voltar às expedições
            </button>
            {recompensa.bilhetes > 0 && (
              <Link to="/invocacao" className="inline-flex h-11 items-center rounded-full border border-gold/60 px-5 text-xs font-bold text-gold">
                Usar bilhetes
              </Link>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setMostrados(total)}
          className="h-11 cursor-pointer self-start rounded-full border border-line px-5 text-xs font-bold text-muted hover:text-text"
        >
          Pular para o resultado
        </button>
      )}
    </section>
  )
}

export default function Expedicoes() {
  const [estado, setEstado] = useState<EstadoExpedicoes | null>(null)
  const [erro, setErro] = useState('')
  const [semPersonagem, setSemPersonagem] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [lutando, setLutando] = useState<string | null>(null)
  const [batalha, setBatalha] = useState<RespostaBatalha | null>(null)
  const [erroDaLuta, setErroDaLuta] = useState('')
  const topo = useRef<HTMLDivElement>(null)

  const carregar = () => {
    setCarregando(true)
    obterExpedicoes().then((r) => {
      setEstado(r.dados ?? null)
      setErro(r.erro ?? '')
      setSemPersonagem(Boolean(r.semPersonagem))
      setCarregando(false)
    })
  }

  useEffect(carregar, [])

  const enfrentar = async (monstroId: string) => {
    if (lutando) return
    setErroDaLuta('')
    setLutando(monstroId)
    const r = await batalhar(monstroId)
    setLutando(null)
    if (r.dados) {
      setBatalha(r.dados)
      setEstado((atual) => (atual ? { ...atual, hoje: r.dados!.hoje } : atual))
      topo.current?.scrollIntoView?.({ block: 'start' })
      return
    }
    setErroDaLuta(r.erro ?? 'Não foi possível batalhar agora.')
  }

  const restantes = batalhasRestantes(estado?.hoje)

  return (
    <div ref={topo} className={CONTAINER}>
      <header className="mb-4 flex items-center gap-1 select-none">
        <Link
          to="/personagem"
          aria-label="Voltar para o personagem"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-text"
        >
          <ChevronLeft size={22} />
        </Link>
        <p className={ROTULO_DE_SECAO}>Expedições</p>
      </header>

      {carregando ? (
        <div className="h-72 animate-pulse rounded-2xl border border-line bg-panel" />
      ) : semPersonagem ? (
        <div className="rounded-2xl border border-line bg-panel p-6 text-center">
          <h1 className="m-0 mb-2 font-anton text-2xl uppercase">Desperte o seu personagem</h1>
          <p className="m-0 mb-4 text-sm text-muted">As expedições começam depois do despertar.</p>
          <Link to="/personagem" className="inline-flex h-11 items-center rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void">
            Ir para o despertar
          </Link>
        </div>
      ) : !estado ? (
        <div className="rounded-2xl border border-line bg-panel p-6 text-center">
          <h1 className="m-0 mb-2 font-anton text-2xl uppercase">Expedições indisponíveis</h1>
          <p className="m-0 mb-4 text-sm text-muted">{erro}</p>
          <button type="button" onClick={carregar} className="h-11 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void">
            Tentar de novo
          </button>
        </div>
      ) : batalha ? (
        <TelaDeBatalha key={batalha.resultado.turnos.length + batalha.monstro.id} batalha={batalha} aoVoltar={() => { setBatalha(null); carregar() }} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-anton text-[clamp(2rem,8vw,2.6rem)] uppercase leading-none">Expedições</h1>
            <p className="m-0 text-sm text-muted">
              Enfrente monstros com o seu equipamento. Vitórias dão bilhetes de invocação e, às vezes, um item. Batalhas não dão XP: ele vem só dos animes.
            </p>
          </div>

          <dl className="m-0 grid grid-cols-3 gap-2.5">
            <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-panel p-3">
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Zap size={13} className="text-holo-2" aria-hidden="true" /> Poder
              </dt>
              <dd className="m-0 font-anton text-2xl leading-none">{estado.atributos.poder}</dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-panel p-3">
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Swords size={13} className="text-coral" aria-hidden="true" /> Hoje
              </dt>
              <dd className="m-0 font-anton text-2xl leading-none">
                {restantes}
                <span className="font-mono text-xs text-muted"> de {estado.hoje.limite}</span>
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-panel p-3">
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Ticket size={13} className="text-gold" aria-hidden="true" /> Bilhetes
              </dt>
              <dd className="m-0 font-anton text-2xl leading-none">{estado.hoje.bilhetes}</dd>
            </div>
          </dl>

          {restantes === 0 && (
            <p role="status" className="m-0 rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs text-text">
              Você já fez todas as batalhas de hoje. As expedições voltam amanhã.
            </p>
          )}
          {erroDaLuta && (
            <p role="alert" className="m-0 text-xs font-bold text-coral">
              {erroDaLuta}
            </p>
          )}

          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
            {estado.monstros.map((m) => {
              const tipo = ESTILO_DO_TIPO[m.tipo] ?? ESTILO_DO_TIPO.comum
              const dificuldade = rotuloDaDificuldade(m.dificuldade)
              const item = estiloDaRaridade(m.raridade_item)
              return (
                <li key={m.id} className={`flex flex-col gap-3 rounded-2xl border bg-panel p-4 ${tipo.borda}`}>
                  <div className="flex items-start gap-3">
                    <IconeDoMonstro monstro={m} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="m-0 text-base font-bold leading-tight">{m.nome}</h2>
                        <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${dificuldade.classe}`}>{dificuldade.rotulo}</span>
                      </div>
                      <p className="m-0 font-mono text-xs text-muted">
                        {tipo.rotulo} · nível {m.nivel} · poder {m.poder}
                      </p>
                      <p className="m-0 mt-1 text-xs leading-snug text-muted">{m.descricao}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Heart size={12} className="text-coral" aria-hidden="true" /> {m.vida}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Ticket size={12} className="text-gold" aria-hidden="true" /> {m.bilhetes}
                    </span>
                    {m.chance_item > 0 && (
                      <span className={item.texto}>
                        {m.chance_item}% de item {item.rotulo.toLowerCase()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => enfrentar(m.id)}
                    disabled={restantes === 0 || lutando !== null}
                    aria-label={`Enfrentar ${m.nome}`}
                    className="h-11 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {lutando === m.id ? 'Batalhando…' : 'Enfrentar'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
