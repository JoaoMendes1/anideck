// client/src/components/rpg/BatalhaEmGrupo.tsx
// Reprodução da luta em grupo: a Vida do monstro, a de cada herói e os últimos golpes, com o
// controle de velocidade. Na masmorra, os andares passam um depois do outro.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Ticket } from 'lucide-react'
import { descreverTurno, estiloDaRaridade, resumoDoItem } from '../../lib/rpg'
import { descreverTurnoEmGrupo, etapasDoResultado, type RecompensaNoGrupo, type ResultadoDoGrupo } from '../../lib/grupo'
import { intervaloDaVelocidade, lerVelocidade, salvarVelocidade, type Velocidade } from '../../lib/velocidadeBatalha'
import ControleDeVelocidade from './ControleDeVelocidade'
import IconeDoMonstro from './IconeDoMonstro'
import IconeOuro from '../IconeOuro'

const CORES_HEROI = ['bg-gradient-to-r from-holo-2 to-holo-3', 'bg-gradient-to-r from-gold to-coral', 'bg-gradient-to-r from-green to-holo-3']

function Barra({ rotulo, atual, maximo, cor, apagada }: { rotulo: string; atual: number; maximo: number; cor: string; apagada?: boolean }) {
  const pct = maximo > 0 ? Math.max(0, Math.min(100, (atual / maximo) * 100)) : 0
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${apagada ? 'opacity-40' : ''}`}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate font-bold text-text">{rotulo}</span>
        <span className="shrink-0 font-mono text-muted">
          {atual} / {maximo}
        </span>
      </div>
      <div role="progressbar" aria-label={`Vida de ${rotulo}`} aria-valuemin={0} aria-valuemax={maximo} aria-valuenow={atual} className="h-2 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${cor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function BatalhaEmGrupo({
  resultado,
  recompensa,
  aoVoltar,
  rotuloVoltar,
}: {
  resultado: ResultadoDoGrupo
  recompensa: RecompensaNoGrupo | null
  aoVoltar: () => void
  rotuloVoltar: string
}) {
  const etapas = useMemo(() => etapasDoResultado(resultado), [resultado])
  // Todos os turnos em fila, cada um com a etapa (andar) de onde veio.
  const fila = useMemo(() => etapas.flatMap((e, i) => e.luta.turnos.map((t) => ({ etapa: i, turno: t }))), [etapas])
  const reduzido = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [mostrados, setMostrados] = useState(() => (reduzido ? fila.length : 0))
  const [velocidade, setVelocidade] = useState<Velocidade>(lerVelocidade)
  const terminou = mostrados >= fila.length

  useEffect(() => {
    if (terminou) return
    const id = window.setTimeout(() => setMostrados((n) => n + 1), intervaloDaVelocidade(velocidade))
    return () => window.clearTimeout(id)
  }, [mostrados, terminou, velocidade])

  if (etapas.length === 0) return null
  const nomes = resultado.herois.map((h) => h.nome || 'Herói')
  const atualIdx = mostrados > 0 ? fila[mostrados - 1].etapa : 0
  const etapa = etapas[Math.min(atualIdx, etapas.length - 1)]
  const daEtapa = fila.slice(0, mostrados).filter((f) => f.etapa === atualIdx).map((f) => f.turno)
  const ultimo = daEtapa[daEtapa.length - 1]
  const vidaMonstro = ultimo?.vida_monstro ?? etapa.luta.vida_monstro
  const vidaDe = (k: number) => {
    for (let i = daEtapa.length - 1; i >= 0; i--) if (daEtapa[i].heroi === k + 1) return daEtapa[i].vida_jogador
    return etapa.luta.herois[k]?.vida_inicial ?? 0
  }
  const recentes = fila.slice(Math.max(0, mostrados - 6), mostrados).reverse()

  return (
    <section aria-label={`Luta em grupo contra ${etapa.monstro.nome}`} className="flex flex-col gap-4">
      {etapa.andar > 0 && (
        <p className="m-0 font-mono text-xs font-semibold uppercase tracking-widest text-muted">
          Andar {etapa.andar} de {etapas.length}
        </p>
      )}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
        <div className="flex items-center gap-3">
          <IconeDoMonstro monstro={etapa.monstro} />
          <div className="min-w-0 flex-1">
            <Barra rotulo={etapa.monstro.nome} atual={vidaMonstro} maximo={etapa.luta.vida_monstro} cor="bg-coral" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {resultado.herois.map((h, k) => {
            const r = etapa.luta.herois[k]
            if (!r) return null
            return (
              <Barra
                key={k}
                rotulo={`${h.nome}${h.fora ? ' (fora)' : ''}`}
                atual={vidaDe(k)}
                maximo={r.vida_maxima}
                cor={CORES_HEROI[k % CORES_HEROI.length]}
                apagada={Boolean(h.fora) || r.fora || vidaDe(k) === 0}
              />
            )
          })}
        </div>
      </div>

      <ol aria-live="polite" className="m-0 flex min-h-48 list-none flex-col gap-1.5 p-0">
        {recentes.map(({ turno, etapa: e }, i) => {
          const doHeroi = turno.atacante === 'jogador'
          const { texto, valor } = descreverTurnoEmGrupo(turno, etapas[e].monstro.nome, nomes, descreverTurno)
          return (
            <li
              key={mostrados - i}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                doHeroi ? 'border-holo-3/30 bg-holo-3/5' : 'border-coral/30 bg-coral/5'
              } ${i === 0 ? '' : 'opacity-70'}`}
            >
              <span className="min-w-0 truncate">
                {texto}
                {turno.critico && <strong className="ml-1 text-gold">Crítico!</strong>}
              </span>
              <span className={`shrink-0 font-mono font-bold ${turno.cura && doHeroi ? 'text-green' : turno.esquiva ? 'text-muted' : doHeroi ? 'text-holo-3' : 'text-coral'}`}>
                {valor}
              </span>
            </li>
          )
        })}
      </ol>

      {!terminou ? (
        <ControleDeVelocidade
          velocidade={velocidade}
          aoMudar={(v) => {
            setVelocidade(v)
            salvarVelocidade(v)
          }}
          aoPular={() => setMostrados(fila.length)}
        />
      ) : (
        <div role="status" className={`flex flex-col gap-3 rounded-2xl border p-4 ${resultado.venceu ? 'border-gold/60 bg-gold/10' : 'border-coral/50 bg-coral/10'}`}>
          <p className="m-0 font-anton text-3xl uppercase leading-none">{resultado.venceu ? 'Vitória do grupo' : 'Derrota do grupo'}</p>
          {recompensa?.erro ? (
            <p className="m-0 text-sm text-muted">Sua luta não contou: {recompensa.erro}</p>
          ) : recompensa ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              {recompensa.bilhetes > 0 && (
                <li className="flex items-center gap-2">
                  <Ticket size={16} className="text-gold" aria-hidden="true" />
                  {recompensa.bilhetes === 1 ? '1 bilhete de invocação' : `${recompensa.bilhetes} bilhetes de invocação`}
                </li>
              )}
              {recompensa.ouro > 0 && (
                <li className="flex items-center gap-2">
                  <IconeOuro size={16} /> {recompensa.ouro} de Ouro
                </li>
              )}
              {recompensa.ouro_perdido > 0 && <li className="text-coral">Você caiu e perdeu {recompensa.ouro_perdido} de Ouro.</li>}
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
              {recompensa.mana > 0 && <li className="text-xs text-muted">Gastou {recompensa.mana} de Mana.</li>}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={aoVoltar} className="h-10 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void">
              {rotuloVoltar}
            </button>
            {(recompensa?.bilhetes ?? 0) > 0 && (
              <Link to="/invocacao" className="inline-flex h-10 items-center rounded-full border border-gold/60 px-5 text-xs font-bold text-gold">
                Usar bilhetes
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
