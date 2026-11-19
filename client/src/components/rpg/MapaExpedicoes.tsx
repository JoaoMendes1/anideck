// client/src/components/rpg/MapaExpedicoes.tsx
// Mapa 2D conectado das regiões de exploração + folha completa de inspeção do monstro selecionado.
import {
  Brain,
  Compass,
  Crown,
  Hammer,
  Heart,
  Landmark,
  Lock,
  MapPin,
  MoonStar,
  Mountain,
  Shield,
  Sparkles,
  Swords,
  Ticket,
  Trees,
  Trophy,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  ESTILO_DO_ELEMENTO,
  estiloDaRaridade,
  porMilEmPorcento,
  regioesDoMapa,
  rotuloDaDificuldade,
  textoDaRelacao,
  textoDoBestiario,
  type AtributosRPG,
  type Dificuldade,
  type MonstroNaLista,
  type RegiaoMapa,
} from '../../lib/rpg'
import { ESTILO_DO_TIPO } from '../../lib/monstrosVisual'
import { rotuloDoElemento } from '../../lib/personagem'
import IconeDoMonstro from './IconeDoMonstro'
import BotaoEmGrupo from './BotaoEmGrupo'

interface EstiloRegiao {
  card: string
  cabecalho: string
  Icone: LucideIcon
}

const ESTILO_DA_REGIAO: Record<string, EstiloRegiao> = {
  clareira_inicial: {
    card: 'border-green/35 bg-gradient-to-br from-green/10 via-panel to-panel-2',
    cabecalho: 'text-green',
    Icone: Trees,
  },
  bosque_sombrio: {
    card: 'border-holo-2/35 bg-gradient-to-br from-holo-2/12 via-panel to-panel-2',
    cabecalho: 'text-holo-2',
    Icone: MoonStar,
  },
  ruinas_do_vazio: {
    card: 'border-holo-1/35 bg-gradient-to-br from-holo-1/12 via-panel to-panel-2',
    cabecalho: 'text-holo-1',
    Icone: Landmark,
  },
  cume_ancestral: {
    card: 'border-gold/40 bg-gradient-to-br from-gold/12 via-panel to-panel-2',
    cabecalho: 'text-gold',
    Icone: Mountain,
  },
}

const ESTILO_REGIAO_PADRAO: EstiloRegiao = {
  card: 'border-line bg-gradient-to-br from-panel to-panel-2',
  cabecalho: 'text-holo-3',
  Icone: Compass,
}

const COR_BARRA_DIFICULDADE: Record<Dificuldade, string> = {
  facil: 'bg-green',
  equilibrada: 'bg-holo-3',
  dificil: 'bg-gold',
  perigosa: 'bg-coral',
}

interface LinhaAtributo {
  rotulo: string
  monstro: string
  jogador: string
  Icone: LucideIcon
  classeIcone: string
  favoravel?: boolean
  alerta?: boolean
}

function montarComparacaoAtributos(m: MonstroNaLista, j: AtributosRPG): LinhaAtributo[] {
  const mCrit = m.critico_por_mil ?? 100
  const mDanoCrit = m.dano_critico ?? 150
  const mEsq = m.esquiva_por_mil ?? 0
  const mMagia = m.magia ?? 0
  const mEter = m.eter ?? 0
  const mVel = m.velocidade ?? 0

  const jMagia = j.magia ?? 0
  const jVel = j.velocidade ?? 0
  const jCrit = j.critico_por_mil ?? 0
  const jDanoCrit = j.dano_critico ?? 150
  const jEsq = j.esquiva_por_mil ?? 0
  const jEter = j.eter ?? 0

  return [
    { rotulo: 'Vida', monstro: String(m.vida), jogador: String(j.vida), Icone: Heart, classeIcone: 'text-coral', favoravel: j.vida >= m.vida },
    { rotulo: 'Ataque', monstro: String(m.ataque), jogador: String(j.ataque), Icone: Swords, classeIcone: 'text-holo-1', favoravel: j.ataque >= m.ataque, alerta: m.ataque > j.ataque },
    { rotulo: 'Defesa', monstro: String(m.defesa), jogador: String(j.defesa), Icone: Shield, classeIcone: 'text-holo-3', favoravel: j.defesa >= m.defesa },
    { rotulo: 'Magia', monstro: String(mMagia), jogador: String(jMagia), Icone: Sparkles, classeIcone: 'text-holo-2', favoravel: jMagia >= mMagia, alerta: mMagia > jMagia },
    { rotulo: 'Velocidade', monstro: String(mVel), jogador: String(jVel), Icone: Wind, classeIcone: 'text-green', favoravel: jVel >= mVel, alerta: mVel > jVel },
    {
      rotulo: 'Crítico',
      monstro: `${porMilEmPorcento(mCrit)} · ${mDanoCrit}%`,
      jogador: `${porMilEmPorcento(jCrit)} · ${jDanoCrit}%`,
      Icone: Zap,
      classeIcone: 'text-gold',
      favoravel: jCrit >= mCrit,
    },
    {
      rotulo: 'Esquiva',
      monstro: porMilEmPorcento(mEsq),
      jogador: porMilEmPorcento(jEsq),
      Icone: Wind,
      classeIcone: 'text-holo-3',
      favoravel: jEsq >= mEsq,
    },
    { rotulo: 'Éter', monstro: String(mEter), jogador: String(jEter), Icone: Sparkles, classeIcone: 'text-holo-1', favoravel: jEter >= mEter },
  ]
}

export function FolhaInspecaoMonstro({
  monstro,
  atributosJogador,
  custoMana,
  lutando,
  bloqueado,
  aoEnfrentar,
}: {
  monstro: MonstroNaLista
  atributosJogador: AtributosRPG
  custoMana?: number
  lutando: string | null
  bloqueado: boolean
  aoEnfrentar: (id: string) => void
}) {
  const tipo = ESTILO_DO_TIPO[monstro.tipo] ?? ESTILO_DO_TIPO.comum
  const dificuldade = rotuloDaDificuldade(monstro.dificuldade)
  const item = estiloDaRaridade(monstro.raridade_item)
  const estiloEl = ESTILO_DO_ELEMENTO[monstro.elemento ?? 'eter'] ?? ESTILO_DO_ELEMENTO.eter
  const comparacao = montarComparacaoAtributos(monstro, atributosJogador)

  return (
    <aside
      aria-label={`Detalhes de ${monstro.nome}`}
      className={`flex flex-col gap-3 rounded-2xl border bg-panel p-4 shadow-lg ${tipo.borda}`}
    >
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
        <IconeDoMonstro monstro={monstro} tamanho="h-28 w-28 sm:h-32 sm:w-32" destaque iconeTamanho={44} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            {monstro.regiao_nome && (
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-panel-2 px-2 py-0.5 text-xs text-muted">
                <MapPin size={11} aria-hidden="true" />
                {monstro.regiao_nome}
              </span>
            )}
            {monstro.em_destaque && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/60 bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
                <Sparkles size={11} aria-hidden="true" />
                Destaque do dia
              </span>
            )}
            <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${dificuldade.classe}`}>{dificuldade.rotulo}</span>
          </div>

          <h2 className="m-0 font-anton text-2xl uppercase leading-tight tracking-wide text-text">{monstro.nome}</h2>

          <p className="m-0 font-mono text-xs text-muted">
            {tipo.rotulo} · nível {monstro.nivel} · poder {monstro.poder}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            {monstro.elemento && (
              <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${estiloEl.classe}`}>
                {estiloEl.simbolo} {rotuloDoElemento(monstro.elemento)}
              </span>
            )}
            {monstro.comportamento && (
              <span className="inline-flex items-center gap-1 rounded-full border border-holo-2/40 bg-holo-2/10 px-2 py-0.5 font-mono text-xs text-holo-2">
                <Brain size={11} aria-hidden="true" />
                IA: {monstro.comportamento}
              </span>
            )}
          </div>

          {textoDaRelacao(monstro.elemental) && (
            <p className={`m-0 text-xs font-bold ${monstro.elemental === 'vantagem' ? 'text-green' : 'text-coral'}`}>
              {textoDaRelacao(monstro.elemental)}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-xl border border-line bg-panel-2/60 p-3">
        <p className="m-0 text-xs leading-relaxed text-text">{monstro.descricao}</p>
        {monstro.habitat && <p className="m-0 text-xs leading-relaxed text-muted">{monstro.habitat}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="m-0 font-mono text-xs font-semibold uppercase tracking-wider text-muted">Atributos (Monstro vs. Você)</h3>
        </div>
        <dl className="m-0 grid grid-cols-2 gap-1.5">
          {comparacao.map((linha) => (
            <div key={linha.rotulo} className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-line bg-void/50 px-2.5 py-1.5">
              <dt className="flex items-center gap-1 text-xs font-semibold text-muted">
                <linha.Icone size={12} className={`shrink-0 ${linha.classeIcone}`} aria-hidden="true" />
                <span className="truncate">{linha.rotulo}</span>
              </dt>
              <dd className="m-0 flex items-baseline justify-between gap-1 font-mono text-xs">
                <span className={`font-bold ${linha.alerta ? 'text-coral' : 'text-text'}`}>{linha.monstro}</span>
                <span className={linha.favoravel ? 'text-green' : 'text-muted'}>Você: {linha.jogador}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {(monstro.poderes?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="m-0 font-mono text-xs font-semibold uppercase tracking-wider text-muted">Poderes & Padrões</h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {monstro.poderes?.map((p) => (
              <li key={p.id} className="rounded-xl border border-line bg-panel-2/50 px-3 py-2 text-xs">
                <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  <strong className="text-text">{p.nome}</strong>
                  {p.arcano && (
                    <span className="rounded-full border border-holo-2/50 bg-holo-2/10 px-1.5 py-0.5 font-mono text-[11px] text-holo-2">
                      Arcano
                    </span>
                  )}
                  {(p.custo_eter ?? 0) > 0 && (
                    <span className="rounded-full border border-holo-3/40 bg-holo-3/10 px-1.5 py-0.5 font-mono text-[11px] text-holo-3">
                      {p.custo_eter} Éter
                    </span>
                  )}
                </div>
                <p className="m-0 leading-snug text-muted">{p.descricao}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-void/40 px-3 py-2 font-mono text-xs text-muted">
        <span className="inline-flex items-center gap-1 text-text">
          <Ticket size={13} className="text-gold" aria-hidden="true" />
          {monstro.bilhetes} {monstro.bilhetes === 1 ? 'bilhete' : 'bilhetes'}
        </span>
        {monstro.chance_item > 0 && (
          <span className={item.texto}>
            {monstro.chance_item}% de item {item.rotulo.toLowerCase()}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-holo-2">
          <Hammer size={12} aria-hidden="true" />
          {monstro.em_destaque ? '+1 material garantido hoje' : 'Materiais da Forja'}
        </span>
      </div>

      {monstro.bestiario && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-panel-2/40 px-3 py-2.5">
          <p className="m-0 inline-flex items-start gap-1.5 font-mono text-xs text-muted">
            <Trophy size={13} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
            <span>{textoDoBestiario(monstro.bestiario)}</span>
          </p>
          {monstro.dica_tatica ? (
            <p className="m-0 rounded-lg border border-gold/35 bg-gold/10 px-2.5 py-1.5 text-xs leading-snug text-text">
              <strong className="text-gold">Dica tática: </strong>
              {monstro.dica_tatica}
            </p>
          ) : (
            <p className="m-0 inline-flex items-center gap-1.5 text-xs text-muted">
              <Lock size={12} className="shrink-0" aria-hidden="true" />
              <span>Vença 1 vez para desbloquear a dica tática no bestiário.</span>
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => aoEnfrentar(monstro.id)}
          disabled={bloqueado || lutando !== null}
          aria-label={`Enfrentar ${monstro.nome}`}
          className="h-11 flex-1 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
        >
          {lutando === monstro.id ? 'Batalhando…' : 'Enfrentar'}
          {lutando !== monstro.id && custoMana !== undefined && (
            <span className="ml-1 font-mono text-xs font-semibold opacity-80">· {custoMana} MP</span>
          )}
        </button>
        <BotaoEmGrupo tipo="monstro" alvoId={monstro.id} nome={monstro.nome} desativado={bloqueado || lutando !== null} />
      </div>
    </aside>
  )
}

export default function MapaExpedicoes({
  monstros,
  regioesBrutas,
  atributosJogador,
  custoMana,
  selecionadoId,
  lutando,
  bloqueado,
  aoSelecionar,
  aoEnfrentar,
}: {
  monstros: MonstroNaLista[]
  regioesBrutas?: RegiaoMapa[]
  atributosJogador: AtributosRPG
  custoMana?: number
  selecionadoId: string
  lutando: string | null
  bloqueado: boolean
  aoSelecionar: (id: string) => void
  aoEnfrentar: (id: string) => void
}) {
  const regioes = regioesDoMapa({ regioes: regioesBrutas, monstros })
  const porId = new Map(monstros.map((m) => [m.id, m]))
  const selecionado = porId.get(selecionadoId) ?? monstros[0]
  if (!selecionado) return null

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
      <section aria-label="Mapa de regiões" className="flex flex-col gap-3 lg:col-span-7">
        {regioes.map((regiao, idx) => {
          const monstrosDaRegiao = regiao.monstros.map((id) => porId.get(id)).filter((m): m is MonstroNaLista => Boolean(m))
          if (monstrosDaRegiao.length === 0) return null
          const estilo = ESTILO_DA_REGIAO[regiao.id] ?? ESTILO_REGIAO_PADRAO
          const IconeRegiao = estilo.Icone

          return (
            <div key={regiao.id} className="relative flex flex-col gap-3">
              {idx > 0 && (
                <div aria-hidden="true" className="mx-auto flex h-4 items-center justify-center">
                  <span className="h-full w-0.5 rounded-full bg-gradient-to-b from-holo-3/60 to-holo-1/60" />
                </div>
              )}

              <div className={`flex flex-col gap-3 rounded-2xl border p-3.5 sm:p-4 ${estilo.card} ${regiao.em_destaque ? 'ring-1 ring-gold/60' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-void/70 ${estilo.cabecalho}`}>
                      <IconeRegiao size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted">0{regiao.ordem}</span>
                        <h3 className="m-0 font-anton text-lg uppercase leading-none tracking-wide text-text">{regiao.nome}</h3>
                        <span className="rounded-full border border-line bg-void/60 px-2 py-0.5 font-mono text-xs text-muted">
                          {regiao.faixa_nivel}
                        </span>
                      </div>
                      <p className="m-0 mt-1 text-xs text-muted">
                        <strong className="text-text">{regiao.bioma}:</strong> {regiao.efeito_bioma}
                      </p>
                    </div>
                  </div>

                  {regiao.em_destaque && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/60 bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold">
                      <Sparkles size={12} aria-hidden="true" />
                      {regiao.bonus_destaque || '+1 material da Forja'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {monstrosDaRegiao.map((m) => {
                    const ativo = m.id === selecionado.id
                    const tipo = ESTILO_DO_TIPO[m.tipo] ?? ESTILO_DO_TIPO.comum
                    const barraDif = COR_BARRA_DIFICULDADE[m.dificuldade] ?? 'bg-holo-3'
                    const estiloEl = ESTILO_DO_ELEMENTO[m.elemento ?? 'eter'] ?? ESTILO_DO_ELEMENTO.eter
                    const vitorias = m.bestiario?.vitorias ?? 0

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => aoSelecionar(m.id)}
                        aria-pressed={ativo}
                        aria-label={`Inspecionar ${m.nome} (nível ${m.nivel})`}
                        className={`group flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition ${
                          ativo
                            ? 'border-holo-3 bg-void/90 ring-2 ring-holo-3/40'
                            : 'border-line bg-void/55 hover:border-holo-1/60 hover:bg-void/80'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <IconeDoMonstro monstro={m} tamanho="h-20 w-20 sm:h-24 sm:w-24" destaque={ativo || m.tipo === 'chefe'} iconeTamanho={34} />
                          {m.tipo === 'chefe' && (
                            <span
                              title="Chefão"
                              className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-gold/70 bg-void text-gold"
                            >
                              <Crown size={12} aria-hidden="true" />
                            </span>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${barraDif}`} aria-hidden="true" />
                            <span className="truncate text-sm font-bold text-text">{m.nome}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted">
                            <span>Nv {m.nivel}</span>
                            <span>·</span>
                            <span>{tipo.rotulo}</span>
                            {m.elemento && <span>{estiloEl.simbolo}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
                            <span>Poder {m.poder}</span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1 text-gold">
                              <Trophy size={11} aria-hidden="true" />
                              {vitorias}
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <div className="lg:sticky lg:top-6 lg:col-span-5">
        <FolhaInspecaoMonstro
          monstro={selecionado}
          atributosJogador={atributosJogador}
          custoMana={custoMana}
          lutando={lutando}
          bloqueado={bloqueado}
          aoEnfrentar={aoEnfrentar}
        />
      </div>
    </div>
  )
}
