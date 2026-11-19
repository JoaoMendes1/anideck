// client/src/components/rpg/MapaExpedicoes.tsx
// Mapa-múndi 2D interativo das regiões conectadas + cenário da região ativa + folha de inspeção com linha evolutiva.
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Brain,
  Check,
  Compass,
  Crown,
  Flame,
  GitBranch,
  Hammer,
  Heart,
  Landmark,
  Lock,
  MapPin,
  MoonStar,
  Mountain,
  Shield,
  Snowflake,
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
import { useMidia } from '../../hooks/useMidia'
import IconeDoMonstro from './IconeDoMonstro'
import BotaoEmGrupo from './BotaoEmGrupo'
import mapaMundiImg from '../../assets/rpg/mapa-mundi.webp'
import mapaMundiVerticalImg from '../../assets/rpg/mapa-mundi-vertical.webp'

interface EstiloRegiao {
  card: string
  cabecalho: string
  pinAtivo: string
  pinInativo: string
  pilulaAtiva: string
  halo: string
  Icone: LucideIcon
}

const ESTILO_DA_REGIAO: Record<string, EstiloRegiao> = {
  clareira_inicial: {
    card: 'border-green/35 bg-gradient-to-br from-green/10 via-panel to-panel-2',
    cabecalho: 'text-green',
    pinAtivo: 'border-green bg-void text-text ring-2 ring-green/50 shadow-lg',
    pinInativo: 'border-green/40 bg-void/85 text-muted hover:border-green hover:text-text',
    pilulaAtiva: 'border-green/70 bg-green/15 text-green',
    halo: 'bg-green/18',
    Icone: Trees,
  },
  bosque_sombrio: {
    card: 'border-holo-2/35 bg-gradient-to-br from-holo-2/12 via-panel to-panel-2',
    cabecalho: 'text-holo-2',
    pinAtivo: 'border-holo-2 bg-void text-text ring-2 ring-holo-2/50 shadow-lg',
    pinInativo: 'border-holo-2/40 bg-void/85 text-muted hover:border-holo-2 hover:text-text',
    pilulaAtiva: 'border-holo-2/70 bg-holo-2/15 text-holo-2',
    halo: 'bg-holo-2/18',
    Icone: MoonStar,
  },
  forja_vulcanica: {
    card: 'border-coral/40 bg-gradient-to-br from-coral/12 via-panel to-panel-2',
    cabecalho: 'text-coral',
    pinAtivo: 'border-coral bg-void text-text ring-2 ring-coral/50 shadow-lg',
    pinInativo: 'border-coral/40 bg-void/85 text-muted hover:border-coral hover:text-text',
    pilulaAtiva: 'border-coral/70 bg-coral/15 text-coral',
    halo: 'bg-coral/18',
    Icone: Flame,
  },
  mares_e_geada: {
    card: 'border-holo-3/40 bg-gradient-to-br from-holo-3/12 via-panel to-panel-2',
    cabecalho: 'text-holo-3',
    pinAtivo: 'border-holo-3 bg-void text-text ring-2 ring-holo-3/50 shadow-lg',
    pinInativo: 'border-holo-3/40 bg-void/85 text-muted hover:border-holo-3 hover:text-text',
    pilulaAtiva: 'border-holo-3/70 bg-holo-3/15 text-holo-3',
    halo: 'bg-holo-3/18',
    Icone: Snowflake,
  },
  ruinas_do_vazio: {
    card: 'border-holo-1/35 bg-gradient-to-br from-holo-1/12 via-panel to-panel-2',
    cabecalho: 'text-holo-1',
    pinAtivo: 'border-holo-1 bg-void text-text ring-2 ring-holo-1/50 shadow-lg',
    pinInativo: 'border-holo-1/40 bg-void/85 text-muted hover:border-holo-1 hover:text-text',
    pilulaAtiva: 'border-holo-1/70 bg-holo-1/15 text-holo-1',
    halo: 'bg-holo-1/18',
    Icone: Landmark,
  },
  santuario_astral: {
    card: 'border-gold/40 bg-gradient-to-br from-gold/12 via-panel to-panel-2',
    cabecalho: 'text-gold',
    pinAtivo: 'border-gold bg-void text-text ring-2 ring-gold/50 shadow-lg',
    pinInativo: 'border-gold/40 bg-void/85 text-muted hover:border-gold hover:text-text',
    pilulaAtiva: 'border-gold/70 bg-gold/15 text-gold',
    halo: 'bg-gold/18',
    Icone: Sparkles,
  },
  cume_ancestral: {
    card: 'border-gold/50 bg-gradient-to-br from-gold/15 via-panel to-panel-2',
    cabecalho: 'text-gold',
    pinAtivo: 'border-gold bg-void text-text ring-2 ring-gold/60 shadow-lg',
    pinInativo: 'border-gold/45 bg-void/85 text-muted hover:border-gold hover:text-text',
    pilulaAtiva: 'border-gold/75 bg-gold/15 text-gold',
    halo: 'bg-gold/20',
    Icone: Mountain,
  },
}

const ESTILO_REGIAO_PADRAO: EstiloRegiao = {
  card: 'border-line bg-gradient-to-br from-panel to-panel-2',
  cabecalho: 'text-holo-3',
  pinAtivo: 'border-holo-3 bg-void text-text ring-2 ring-holo-3/50 shadow-lg',
  pinInativo: 'border-line bg-void/85 text-muted hover:border-holo-3 hover:text-text',
  pilulaAtiva: 'border-holo-3/70 bg-holo-3/15 text-holo-3',
  halo: 'bg-holo-3/15',
  Icone: Compass,
}

const COORDENADAS_PADRAO: Record<string, { x: number; y: number }> = {
  clareira_inicial: { x: 28, y: 75 },
  bosque_sombrio: { x: 19, y: 47 },
  forja_vulcanica: { x: 63, y: 75 },
  mares_e_geada: { x: 35, y: 22 },
  ruinas_do_vazio: { x: 50, y: 49 },
  santuario_astral: { x: 69, y: 21 },
  cume_ancestral: { x: 88, y: 50 },
}

const COORDENADAS_VERTICAIS: Record<string, { x: number; y: number }> = {
  clareira_inicial: { x: 43, y: 83 },
  bosque_sombrio: { x: 24, y: 63 },
  forja_vulcanica: { x: 78, y: 62 },
  ruinas_do_vazio: { x: 52, y: 47 },
  mares_e_geada: { x: 24, y: 31 },
  santuario_astral: { x: 80, y: 29 },
  cume_ancestral: { x: 51, y: 15 },
}

const COR_BARRA_DIFICULDADE: Record<Dificuldade, string> = {
  facil: 'bg-green',
  equilibrada: 'bg-holo-3',
  dificil: 'bg-gold',
  perigosa: 'bg-coral',
}

const ESTAGIOS_ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V']

function coordenadasDaRegiao(
  regiao: RegiaoMapa,
  idx: number,
  total: number,
  vertical: boolean,
): { x: number; y: number } {
  if (vertical) {
    if (COORDENADAS_VERTICAIS[regiao.id]) return COORDENADAS_VERTICAIS[regiao.id]
    const x = idx % 2 === 0 ? 30 : 70
    const y = total <= 1 ? 50 : Math.round(82 - (idx / (total - 1)) * 66)
    return { x, y }
  }
  if (typeof regiao.x === 'number' && typeof regiao.y === 'number' && (regiao.x > 0 || regiao.y > 0)) {
    return { x: regiao.x, y: regiao.y }
  }
  if (COORDENADAS_PADRAO[regiao.id]) return COORDENADAS_PADRAO[regiao.id]
  const x = total <= 1 ? 50 : Math.round(18 + (idx / (total - 1)) * 64)
  const y = idx % 2 === 0 ? 62 : 34
  return { x, y }
}

/** Coleta toda a linhagem evolutiva conectada ao monstro (por família ou grafo evolui_de/evolui_para). */
function coletarLinhaEvolutiva(monstro: MonstroNaLista, porId: Map<string, MonstroNaLista>): MonstroNaLista[] {
  const visitados = new Set<string>()
  const resultado: MonstroNaLista[] = []

  if (monstro.familia) {
    for (const candidato of porId.values()) {
      if (candidato.familia === monstro.familia && !visitados.has(candidato.id)) {
        visitados.add(candidato.id)
        resultado.push(candidato)
      }
    }
  }

  // Garante também elos diretos mesmo se algum mock omitir o nome da família.
  const fila: string[] = [monstro.id]
  if (monstro.evolui_de) fila.push(monstro.evolui_de)
  for (const prox of monstro.evolui_para ?? []) fila.push(prox)

  while (fila.length > 0) {
    const atualId = fila.shift()!
    const atual = porId.get(atualId)
    if (!atual) continue
    if (!visitados.has(atual.id)) {
      visitados.add(atual.id)
      resultado.push(atual)
    }
    if (atual.evolui_de && !visitados.has(atual.evolui_de)) fila.push(atual.evolui_de)
    for (const prox of atual.evolui_para ?? []) {
      if (!visitados.has(prox)) fila.push(prox)
    }
  }

  return resultado.sort((a, b) => {
    const estA = a.estagio ?? 99
    const estB = b.estagio ?? 99
    if (estA !== estB) return estA - estB
    if (a.nivel !== b.nivel) return a.nivel - b.nivel
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
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
  porId,
  atributosJogador,
  custoMana,
  lutando,
  bloqueado,
  aoSelecionar,
  aoEnfrentar,
}: {
  monstro: MonstroNaLista
  porId?: Map<string, MonstroNaLista>
  atributosJogador: AtributosRPG
  custoMana?: number
  lutando: string | null
  bloqueado: boolean
  aoSelecionar?: (id: string) => void
  aoEnfrentar: (id: string) => void
}) {
  const tipo = ESTILO_DO_TIPO[monstro.tipo] ?? ESTILO_DO_TIPO.comum
  const dificuldade = rotuloDaDificuldade(monstro.dificuldade)
  const item = estiloDaRaridade(monstro.raridade_item)
  const estiloEl = ESTILO_DO_ELEMENTO[monstro.elemento ?? 'eter'] ?? ESTILO_DO_ELEMENTO.eter
  const comparacao = montarComparacaoAtributos(monstro, atributosJogador)

  const mapaMonstros = porId ?? new Map([[monstro.id, monstro]])
  const temFamilia = Boolean(monstro.familia || monstro.evolui_de || (monstro.evolui_para?.length ?? 0) > 0)
  const linhaEvolutiva = temFamilia ? coletarLinhaEvolutiva(monstro, mapaMonstros) : []

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

      {linhaEvolutiva.length > 1 && (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-void/45 p-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <h3 className="m-0 inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted">
              <GitBranch size={12} className="text-holo-3" aria-hidden="true" />
              Linha de Evolução
            </h3>
            {monstro.familia && (
              <span className="rounded-full border border-holo-3/40 bg-holo-3/10 px-2 py-0.5 font-mono text-[11px] text-holo-3">
                {monstro.familia}
              </span>
            )}
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label={`Evoluções de ${monstro.nome}`}>
            {linhaEvolutiva.map((elo) => {
              const ehAtual = elo.id === monstro.id
              const ehPre = monstro.evolui_de === elo.id
              const ehProx = monstro.evolui_para?.includes(elo.id) ?? false
              const romano = ESTAGIOS_ROMANOS[elo.estagio ?? 0] || ''
              const relacao = ehAtual ? 'Atual' : ehPre ? 'Forma anterior' : ehProx ? 'Evolução' : elo.regiao_nome || ''

              return (
                <li key={elo.id}>
                  <button
                    type="button"
                    disabled={!aoSelecionar || ehAtual}
                    onClick={() => aoSelecionar?.(elo.id)}
                    aria-label={`Ver forma ${elo.nome} (nível ${elo.nivel})`}
                    aria-current={ehAtual ? 'step' : undefined}
                    className={`flex min-w-0 items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition ${
                      ehAtual
                        ? 'border-holo-3 bg-holo-3/15 text-text ring-1 ring-holo-3/40'
                        : 'cursor-pointer border-line bg-panel-2/65 text-muted hover:border-holo-1/60 hover:text-text'
                    }`}
                  >
                    <IconeDoMonstro monstro={elo} tamanho="h-9 w-9" iconeTamanho={16} />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold leading-tight text-text">
                        {romano ? `${romano} · ` : ''}
                        {elo.nome}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-muted">
                        Nv {elo.nivel}
                        {relacao ? ` · ${relacao}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

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

  const regiaoDoSelecionado =
    regioes.find((r) => selecionado && (r.monstros.includes(selecionado.id) || r.id === selecionado.regiao))?.id ??
    regioes[0]?.id ??
    ''

  const [regiaoAtivaId, setRegiaoAtivaId] = useState(regiaoDoSelecionado)
  const ehDesktop = useMidia('(min-width: 640px)')
  const mapaVertical = !ehDesktop

  useEffect(() => {
    if (regiaoDoSelecionado) setRegiaoAtivaId(regiaoDoSelecionado)
  }, [regiaoDoSelecionado])

  if (!selecionado || regioes.length === 0) return null

  const regiaoPorId = new Map(regioes.map((r) => [r.id, r]))
  const regiaoAtiva = regiaoPorId.get(regiaoAtivaId) ?? regioes[0]
  const coordsPorId = new Map(
    regioes.map((r, idx) => [r.id, coordenadasDaRegiao(r, idx, regioes.length, mapaVertical)]),
  )

  // Monta arestas únicas entre regiões conectadas; se o payload não enviar conexões, liga em sequência.
  const arestas: { de: string; para: string; destacada: boolean }[] = []
  const vistas = new Set<string>()
  regioes.forEach((r, idx) => {
    const destinos = r.conexoes && r.conexoes.length > 0
      ? r.conexoes
      : idx + 1 < regioes.length
        ? [regioes[idx + 1].id]
        : []
    for (const dest of destinos) {
      if (!regiaoPorId.has(dest)) continue
      const chave = r.id < dest ? `${r.id}--${dest}` : `${dest}--${r.id}`
      if (vistas.has(chave)) continue
      vistas.add(chave)
      arestas.push({
        de: r.id,
        para: dest,
        destacada: r.id === regiaoAtiva.id || dest === regiaoAtiva.id,
      })
    }
  })

  const estiloAtiva = ESTILO_DA_REGIAO[regiaoAtiva.id] ?? ESTILO_REGIAO_PADRAO
  const IconeAtiva = estiloAtiva.Icone
  const monstrosDaRegiao = regiaoAtiva.monstros
    .map((id) => porId.get(id))
    .filter((m): m is MonstroNaLista => Boolean(m))
  const conexoesDaAtiva = (regiaoAtiva.conexoes ?? [])
    .map((id) => regiaoPorId.get(id))
    .filter((r): r is RegiaoMapa => Boolean(r))

  const descobertosGlobal = monstros.filter((m) => (m.bestiario?.vitorias ?? 0) > 0).length
  const totalGlobal = monstros.length
  const pctGlobal = totalGlobal > 0 ? Math.round((descobertosGlobal / totalGlobal) * 100) : 0

  const derrotadosAtiva = monstrosDaRegiao.filter((m) => (m.bestiario?.vitorias ?? 0) > 0).length
  const dominadaAtiva = monstrosDaRegiao.length > 0 && derrotadosAtiva === monstrosDaRegiao.length

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
      <section aria-label="Mapa de regiões" className="flex flex-col gap-3 lg:col-span-7">
        {/* Mapa-múndi 2D interativo */}
        <div className="overflow-hidden rounded-2xl border border-line bg-panel p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-holo-3" aria-hidden="true" />
              <h2 className="m-0 font-anton text-base uppercase tracking-wide text-text">Mapa-Múndi de Éter</h2>
            </div>
            <span className="font-mono text-xs text-muted">{regioes.length} regiões · {monstros.length} criaturas</span>
          </div>

          <div className="mb-2.5 flex flex-col gap-1 rounded-xl border border-line/70 bg-panel-2/60 px-3 py-2">
            <div className="flex items-center justify-between gap-2 font-mono text-xs">
              <span className="text-muted">Bestiário Global</span>
              <span className="font-bold text-text">
                {descobertosGlobal} / {totalGlobal} descobertos · {pctGlobal}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-void/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-holo-3 via-holo-2 to-gold transition-all"
                style={{ width: `${pctGlobal}%` }}
              />
            </div>
          </div>

          <div
            aria-label="Mapa interativo das regiões"
            className={`relative w-full overflow-hidden rounded-2xl border border-line bg-void ${
              mapaVertical ? 'aspect-[3/4]' : 'aspect-video'
            }`}
          >
            <img
              src={mapaVertical ? mapaMundiVerticalImg : mapaMundiImg}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-95"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void/45 via-transparent to-void/15"
            />

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              {arestas.map((a) => {
                const p1 = coordsPorId.get(a.de)
                const p2 = coordsPorId.get(a.para)
                if (!p1 || !p2) return null
                return (
                  <line
                    key={`${a.de}-${a.para}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    className={a.destacada ? 'stroke-holo-3' : 'stroke-line'}
                    strokeWidth={a.destacada ? 0.85 : 0.5}
                    strokeOpacity={a.destacada ? 0.85 : 0.45}
                    strokeDasharray={a.destacada ? undefined : '2 1.6'}
                  />
                )
              })}
            </svg>

            {regioes.map((regiao) => {
              const coord = coordsPorId.get(regiao.id) ?? { x: 50, y: 50 }
              const estilo = ESTILO_DA_REGIAO[regiao.id] ?? ESTILO_REGIAO_PADRAO
              const IconeRegiao = estilo.Icone
              const ativa = regiao.id === regiaoAtiva.id
              const monstrosRegiao = regiao.monstros
                .map((id) => porId.get(id))
                .filter((m): m is MonstroNaLista => Boolean(m))
              const qtd = monstrosRegiao.length
              const dominada = qtd > 0 && monstrosRegiao.every((m) => (m.bestiario?.vitorias ?? 0) > 0)

              if (mapaVertical) {
                return (
                  <button
                    key={regiao.id}
                    type="button"
                    onClick={() => setRegiaoAtivaId(regiao.id)}
                    aria-pressed={ativa}
                    aria-label={`Explorar ${regiao.nome} (${regiao.faixa_nivel})`}
                    style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                    className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-2xl border-2 backdrop-blur-sm transition ${
                      ativa ? `z-20 scale-110 ${estilo.pinAtivo}` : `z-10 ${estilo.pinInativo}`
                    }`}
                  >
                    <IconeRegiao size={18} className={estilo.cabecalho} aria-hidden="true" />
                    <span className="absolute -top-1.5 -left-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-line bg-void px-1 font-mono text-[10px] font-bold leading-none text-text">
                      {regiao.ordem}
                    </span>
                    {regiao.em_destaque ? (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-gold/70 bg-void text-gold">
                        <Sparkles size={10} aria-hidden="true" />
                      </span>
                    ) : dominada ? (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-green/70 bg-void text-green">
                        <Check size={10} aria-hidden="true" />
                      </span>
                    ) : null}
                    {ativa && (
                      <span className="pointer-events-none absolute top-full left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-void/95 px-2.5 py-0.5 text-xs font-bold leading-tight text-text shadow-lg">
                        {regiao.nome}
                      </span>
                    )}
                  </button>
                )
              }

              return (
                <button
                  key={regiao.id}
                  type="button"
                  onClick={() => setRegiaoAtivaId(regiao.id)}
                  aria-pressed={ativa}
                  aria-label={`Explorar ${regiao.nome} (${regiao.faixa_nivel})`}
                  style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                  className={`absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left backdrop-blur-sm transition ${
                    ativa ? `z-20 scale-105 ${estilo.pinAtivo}` : `z-10 ${estilo.pinInativo}`
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-panel-2 ${estilo.cabecalho}`}>
                    <IconeRegiao size={14} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-xs font-bold leading-tight text-text">
                      {regiao.nome}
                    </span>
                    <span className="block font-mono text-[10px] leading-tight text-muted">
                      {regiao.faixa_nivel} · {qtd}{dominada ? ' · ✓' : ''}
                    </span>
                  </span>
                  {regiao.em_destaque && (
                    <Sparkles size={11} className="shrink-0 text-gold" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Barra de atalho entre regiões, ótima em telas menores */}
          <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1">
            {regioes.map((regiao) => {
              const estilo = ESTILO_DA_REGIAO[regiao.id] ?? ESTILO_REGIAO_PADRAO
              const ativa = regiao.id === regiaoAtiva.id
              const qtd = regiao.monstros.filter((id) => porId.has(id)).length
              return (
                <button
                  key={regiao.id}
                  type="button"
                  onClick={() => setRegiaoAtivaId(regiao.id)}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                    ativa ? estilo.pilulaAtiva : 'border-line bg-void/60 text-muted hover:text-text'
                  }`}
                >
                  <span className="font-mono text-[11px]">0{regiao.ordem}</span>
                  <span>{regiao.nome}</span>
                  <span className="font-mono text-[11px] opacity-75">({qtd})</span>
                  {regiao.em_destaque && <Sparkles size={11} className="text-gold" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Cenário da região selecionada */}
        <div
          aria-label={`Região ${regiaoAtiva.nome}`}
          className={`flex flex-col gap-3 rounded-2xl border p-3.5 sm:p-4 ${estiloAtiva.card} ${regiaoAtiva.em_destaque ? 'ring-1 ring-gold/60' : ''}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-void/70 ${estiloAtiva.cabecalho}`}>
                <IconeAtiva size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted">0{regiaoAtiva.ordem}</span>
                  <h3 className="m-0 font-anton text-xl uppercase leading-none tracking-wide text-text">{regiaoAtiva.nome}</h3>
                  <span className="rounded-full border border-line bg-void/60 px-2 py-0.5 font-mono text-xs text-muted">
                    {regiaoAtiva.faixa_nivel}
                  </span>
                  <span className="rounded-full border border-line bg-void/60 px-2 py-0.5 font-mono text-xs text-muted">
                    {derrotadosAtiva}/{monstrosDaRegiao.length} dominados
                  </span>
                  {dominadaAtiva && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-green/50 bg-green/15 px-2 py-0.5 font-mono text-xs font-bold text-green">
                      <Trophy size={11} aria-hidden="true" /> Dominada
                    </span>
                  )}
                </div>
                <p className="m-0 mt-1 text-xs text-muted">
                  <strong className="text-text">{regiaoAtiva.bioma}:</strong> {regiaoAtiva.efeito_bioma}
                </p>
              </div>
            </div>

            {regiaoAtiva.em_destaque && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/60 bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold">
                <Sparkles size={12} aria-hidden="true" />
                {regiaoAtiva.bonus_destaque || '+1 material da Forja'}
              </span>
            )}
          </div>

          {conexoesDaAtiva.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-mono text-muted">Rotas vizinhas:</span>
              {conexoesDaAtiva.map((vizinha) => (
                <button
                  key={vizinha.id}
                  type="button"
                  onClick={() => setRegiaoAtivaId(vizinha.id)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-line bg-void/60 px-2.5 py-0.5 font-mono text-xs text-muted hover:border-holo-3/60 hover:text-text"
                >
                  <ArrowRight size={11} aria-hidden="true" />
                  {vizinha.nome}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {monstrosDaRegiao.map((m) => {
              const ativo = m.id === selecionado.id
              const tipo = ESTILO_DO_TIPO[m.tipo] ?? ESTILO_DO_TIPO.comum
              const barraDif = COR_BARRA_DIFICULDADE[m.dificuldade] ?? 'bg-holo-3'
              const estiloEl = ESTILO_DO_ELEMENTO[m.elemento ?? 'eter'] ?? ESTILO_DO_ELEMENTO.eter
              const vitorias = m.bestiario?.vitorias ?? 0
              const romano = ESTAGIOS_ROMANOS[m.estagio ?? 0] || ''

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
                    <IconeDoMonstro monstro={m} tamanho="h-24 w-24" destaque={ativo || m.tipo === 'chefe'} iconeTamanho={36} />
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
                      {romano && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-holo-3/35 bg-holo-3/10 px-1.5 py-0.5 text-[10px] text-holo-3">
                          <GitBranch size={10} aria-hidden="true" />
                          {romano}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <div className="lg:sticky lg:top-6 lg:col-span-5">
        <FolhaInspecaoMonstro
          monstro={selecionado}
          porId={porId}
          atributosJogador={atributosJogador}
          custoMana={custoMana}
          lutando={lutando}
          bloqueado={bloqueado}
          aoSelecionar={aoSelecionar}
          aoEnfrentar={aoEnfrentar}
        />
      </div>
    </div>
  )
}

