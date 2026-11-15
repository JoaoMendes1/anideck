// client/src/pages/Invocacao.tsx
// Invocação (Fase 18.6a): o jogador gasta bilhetes, ganhos só em batalha, para sortear itens.
//
// Gratuita por desenho: bilhetes não se compram nem se transferem (ECA Digital, art. 20). As
// chances mostradas aqui são as que o banco usa no sorteio; nada é decidido no navegador.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, Sparkles, Swords, Ticket } from 'lucide-react'
import {
  SLOTS_RPG,
  estiloDaRaridade,
  faltamParaGarantia,
  invocar,
  obterInvocacao,
  porcentagem,
  resumoDoItem,
  type EstadoInvocacao,
  type ItemInvocado,
  type Raridade,
} from '../lib/rpg'

const ROTULO_DE_SECAO = 'font-mono text-xs font-semibold uppercase tracking-widest text-muted m-0'
const CONTAINER = 'w-full min-w-0 max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-24'
const RARIDADES: Raridade[] = ['lendario', 'epico', 'raro', 'comum']

function CartaoDoItem({ item, indice }: { item: ItemInvocado; indice: number }) {
  const estilo = estiloDaRaridade(item.raridade)
  const Icone = SLOTS_RPG.find((s) => s.id === item.slot)?.Icone ?? Sparkles
  return (
    <li
      className={`flex min-w-0 flex-col gap-1.5 rounded-2xl border-2 p-3 motion-safe:animate-[surgir_420ms_ease-out_both] ${estilo.borda} ${estilo.fundo}`}
      style={{ animationDelay: `${indice * 90}ms` }}
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl bg-void/50 ${estilo.texto}`}>
        <Icone size={24} aria-hidden="true" />
      </span>
      <span className={`truncate text-sm font-bold ${estilo.texto}`}>{item.nome}</span>
      <span className="text-xs text-muted">{estilo.rotulo}</span>
      <span className="text-xs text-muted">{resumoDoItem(item)}</span>
      {item.garantida && <span className="font-mono text-xs text-gold">garantido</span>}
    </li>
  )
}

export default function Invocacao() {
  const [estado, setEstado] = useState<EstadoInvocacao | null>(null)
  const [erro, setErro] = useState('')
  const [semPersonagem, setSemPersonagem] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [invocando, setInvocando] = useState(false)
  const [erroDaInvocacao, setErroDaInvocacao] = useState('')
  const [resultado, setResultado] = useState<ItemInvocado[] | null>(null)

  const carregar = () => {
    setCarregando(true)
    obterInvocacao().then((r) => {
      setEstado(r.dados ?? null)
      setErro(r.erro ?? '')
      setSemPersonagem(Boolean(r.semPersonagem))
      setCarregando(false)
    })
  }
  useEffect(carregar, [])

  const fazerInvocacao = async (vezes: 1 | 10) => {
    if (invocando) return
    setErroDaInvocacao('')
    setInvocando(true)
    const r = await invocar(vezes)
    setInvocando(false)
    if (r.dados) {
      setEstado(r.dados)
      setResultado(r.dados.itens ?? [])
      return
    }
    setErroDaInvocacao(r.erro ?? 'Não foi possível invocar agora.')
  }

  return (
    <div className={CONTAINER}>
      <header className="mb-4 flex items-center gap-1 select-none">
        <Link to="/personagem" aria-label="Voltar para o personagem" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-text">
          <ChevronLeft size={22} />
        </Link>
        <p className={ROTULO_DE_SECAO}>Invocação</p>
      </header>

      {carregando ? (
        <div className="h-72 animate-pulse rounded-2xl border border-line bg-panel" />
      ) : semPersonagem ? (
        <div className="rounded-2xl border border-line bg-panel p-6 text-center">
          <h1 className="m-0 mb-2 font-anton text-2xl uppercase">Desperte o seu personagem</h1>
          <p className="m-0 mb-4 text-sm text-muted">A invocação começa depois do despertar.</p>
          <Link to="/personagem" className="inline-flex h-11 items-center rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void">
            Ir para o despertar
          </Link>
        </div>
      ) : !estado ? (
        <div className="rounded-2xl border border-line bg-panel p-6 text-center">
          <h1 className="m-0 mb-2 font-anton text-2xl uppercase">Invocação indisponível</h1>
          <p className="m-0 mb-4 text-sm text-muted">{erro}</p>
          <button type="button" onClick={carregar} className="h-11 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void">
            Tentar de novo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-5">
            <div
              className="relative flex min-h-56 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-holo-2/40 p-6 text-center"
              style={{ backgroundImage: 'radial-gradient(60% 70% at 50% 45%, color-mix(in srgb, var(--color-holo-2) 45%, transparent), transparent 75%)' }}
            >
              <Sparkles size={40} className="text-gold motion-safe:animate-pulse" aria-hidden="true" />
              <h1 className="m-0 font-anton text-[clamp(2rem,8vw,2.6rem)] uppercase leading-none">Círculo de Invocação</h1>
              <p className="m-0 max-w-md text-sm text-muted">Troque bilhetes de expedição por equipamentos. Repetidos se acumulam no inventário.</p>
              <p className="m-0 inline-flex items-center gap-2 rounded-full border border-gold/50 bg-void/60 px-4 py-1.5 font-mono text-sm font-bold text-gold">
                <Ticket size={16} aria-hidden="true" /> {estado.bilhetes} {estado.bilhetes === 1 ? 'bilhete' : 'bilhetes'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fazerInvocacao(1)}
                disabled={invocando || estado.bilhetes < 1}
                className="min-h-13 cursor-pointer rounded-full border border-holo-3/60 bg-panel px-4 text-sm font-extrabold text-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                Invocar 1 <span className="block font-mono text-xs font-semibold text-muted">1 bilhete</span>
              </button>
              <button
                type="button"
                onClick={() => fazerInvocacao(10)}
                disabled={invocando || estado.bilhetes < 10}
                className="min-h-13 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-4 text-sm font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
              >
                Invocar 10 <span className="block font-mono text-xs font-semibold">10 bilhetes</span>
              </button>
            </div>

            {estado.bilhetes < 1 && (
              <Link to="/expedicoes" className="inline-flex items-center gap-2 self-start text-xs font-bold text-holo-3 hover:underline">
                <Swords size={14} aria-hidden="true" /> Ganhe bilhetes nas expedições
              </Link>
            )}
            {erroDaInvocacao && (
              <p role="alert" className="m-0 text-xs font-bold text-coral">
                {erroDaInvocacao}
              </p>
            )}

            {resultado && (
              <section aria-labelledby="titulo-do-resultado" className="flex flex-col gap-3">
                <h2 id="titulo-do-resultado" className={ROTULO_DE_SECAO}>
                  Você invocou
                </h2>
                <ul role="status" className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3 lg:grid-cols-5">
                  {resultado.map((item, i) => (
                    <CartaoDoItem key={`${item.id}-${i}`} item={item} indice={i} />
                  ))}
                </ul>
                <Link to="/personagem" className="self-start text-xs font-bold text-holo-3 hover:underline">
                  Equipar no personagem →
                </Link>
              </section>
            )}
          </div>

          <aside aria-labelledby="titulo-das-chances" className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
            <h2 id="titulo-das-chances" className={ROTULO_DE_SECAO}>
              Chances
            </h2>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {RARIDADES.map((r) => {
                const estilo = estiloDaRaridade(r)
                return (
                  <li key={r} className="flex items-center justify-between gap-2 text-sm">
                    <span className={`font-bold ${estilo.texto}`}>{estilo.rotulo}</span>
                    <span className="font-mono text-muted">{porcentagem(estado.chances[r])}</span>
                  </li>
                )
              })}
            </ul>
            <p className="m-0 flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/10 p-2.5 text-xs text-text">
              <ShieldCheck size={16} className="shrink-0 text-gold" aria-hidden="true" />
              <span>
                A cada {estado.chances.garantia} invocações sem épico, a próxima é épica ou lendária. Faltam{' '}
                <strong>{faltamParaGarantia(estado)}</strong>.
              </span>
            </p>
            <p className="m-0 text-xs leading-snug text-muted">
              Bilhetes só vêm de vitórias nas expedições. Eles não são vendidos, não podem ser comprados com AniCoins e não são transferidos entre contas.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
