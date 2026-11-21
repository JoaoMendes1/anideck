// client/src/components/rpg/MapaExpedicoes.tsx
// Mapa-múndi 2D interativo das regiões conectadas + cenário da região ativa + folha de inspeção com linha evolutiva.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
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
  Maximize2,
  Minus,
  MoonStar,
  Mountain,
  Plus,
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
  X,
} from 'lucide-react'
import {
  ESTILO_DO_ELEMENTO,
  estiloDaRaridade,
  porMilEmPorcento,
  regioesDoMapa,
  rotuloDaDificuldade,
  textoDoBestiario,
  type AtributosRPG,
  type Dificuldade,
  type HeroiResumoEsquadrao,
  type MonstroNaLista,
  type PortalMapaVivo,
  type RegiaoMapa,
  type EfeitoDeElemento,
} from '../../lib/rpg'
import { ESTILO_DO_TIPO } from '../../lib/monstrosVisual'
import { rotuloDoElemento } from '../../lib/personagem'
import { useMidia } from '../../hooks/useMidia'
import { useSheetBehavior } from '../../hooks/useSheetBehavior'
import IconeDoMonstro from './IconeDoMonstro'
import BotaoEmGrupo from './BotaoEmGrupo'
import ConfrontoElemental from './ConfrontoElemental'
import EscolhaDePostura from './EscolhaDePostura'
import mapaMundiImg from '../../assets/rpg/mapa-mundi.webp'

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

const ZOOM_MINIMO = 1
const ZOOM_MAXIMO = 2.6
const ZOOM_PASSO = 0.4
const ZOOM_PADRAO_MOBILE = 1.8

const COR_BARRA_DIFICULDADE: Record<Dificuldade, string> = {
  facil: 'bg-green',
  equilibrada: 'bg-holo-3',
  dificil: 'bg-gold',
  perigosa: 'bg-coral',
}

const ESTAGIOS_ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V']

function coordenadasDaRegiao(regiao: RegiaoMapa, idx: number, total: number): { x: number; y: number } {
  if (typeof regiao.x === 'number' && typeof regiao.y === 'number' && (regiao.x > 0 || regiao.y > 0)) {
    return { x: regiao.x, y: regiao.y }
  }
  if (COORDENADAS_PADRAO[regiao.id]) return COORDENADAS_PADRAO[regiao.id]
  const x = total <= 1 ? 50 : Math.round(18 + (idx / (total - 1)) * 64)
  const y = idx % 2 === 0 ? 62 : 34
  return { x, y }
}

function limitarPan(x: number, y: number, vw: number, vh: number, z: number): { x: number; y: number } {
  if (vw <= 0 || vh <= 0) return { x: 0, y: 0 }
  const escalaW = vw * z
  const escalaH = (vw * 9 / 16) * z
  const clampX = escalaW <= vw ? (vw - escalaW) / 2 : Math.max(vw - escalaW, Math.min(0, x))
  const clampY = escalaH <= vh ? (vh - escalaH) / 2 : Math.max(vh - escalaH, Math.min(0, y))
  return { x: Math.round(clampX), y: Math.round(clampY) }
}

function panParaRegiao(coord: { x: number; y: number }, vw: number, vh: number, z: number): { x: number; y: number } {
  if (vw <= 0 || vh <= 0) return { x: 0, y: 0 }
  const escalaW = vw * z
  const escalaH = (vw * 9 / 16) * z
  const alvoX = vw / 2 - (coord.x / 100) * escalaW
  const alvoY = vh / 2 - (coord.y / 100) * escalaH
  return limitarPan(alvoX, alvoY, vw, vh, z)
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
  elementoHeroi,
  efeitoHeroi,
  classeHeroi,
  semAcoes = false,
  elenco,
  esquadraoInicial,
}: {
  monstro: MonstroNaLista
  classeHeroi?: string
  elementoHeroi?: string
  efeitoHeroi?: EfeitoDeElemento
  /** Na gaveta do celular os botões ficam no rodapé fixo; a ficha não repete. */
  semAcoes?: boolean
  porId?: Map<string, MonstroNaLista>
  atributosJogador: AtributosRPG
  custoMana?: number
  lutando: string | null
  bloqueado: boolean
  aoSelecionar?: (id: string) => void
  aoEnfrentar: (id: string) => void
  elenco?: HeroiResumoEsquadrao[]
  esquadraoInicial?: string[]
}) {
  const tipo = ESTILO_DO_TIPO[monstro.tipo] ?? ESTILO_DO_TIPO.comum
  const dificuldade = rotuloDaDificuldade(monstro.dificuldade)
  const item = estiloDaRaridade(monstro.raridade_item)
  const estiloEl = ESTILO_DO_ELEMENTO[monstro.elemento ?? 'eter'] ?? ESTILO_DO_ELEMENTO.eter
  const comparacao = montarComparacaoAtributos(monstro, atributosJogador)

  const mapaMonstros = porId ?? new Map([[monstro.id, monstro]])
  const temFamilia = Boolean(monstro.familia || monstro.evolui_de || (monstro.evolui_para?.length ?? 0) > 0)
  const linhaEvolutiva = temFamilia ? coletarLinhaEvolutiva(monstro, mapaMonstros) : []

  const cabecalhoERecompensas = (
    <>
      <div className="flex flex-row items-start gap-3 text-left">
        <IconeDoMonstro
          monstro={monstro}
          tamanho={semAcoes ? 'h-20 w-20' : 'h-20 w-20 sm:h-24 sm:w-24'}
          destaque
          iconeTamanho={semAcoes ? 30 : 36}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
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

          <h2 className="m-0 font-anton text-xl uppercase leading-tight tracking-wide text-text sm:text-2xl">{monstro.nome}</h2>

          <p className="m-0 font-mono text-xs text-muted">
            {tipo.rotulo} · nível {monstro.nivel} · poder {monstro.poder}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
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
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-void/40 px-2.5 py-1.5 font-mono text-xs text-muted">
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
    </>
  )

  const corpoDaFicha = (
    <>
      <EscolhaDePostura />

      <ConfrontoElemental
        nomeDoMonstro={monstro.nome}
        elementoMonstro={monstro.elemento}
        efeitoMonstro={monstro.efeito}
        elementoHeroi={elementoHeroi}
        efeitoHeroi={efeitoHeroi}
        tracos={monstro.tracos}
        classeHeroi={classeHeroi}
      />

      <div className="flex flex-col gap-1.5">
        <h3 className="m-0 font-mono text-xs font-semibold uppercase tracking-wider text-muted">Atributos (Monstro vs. Você)</h3>
        <dl className="m-0 grid grid-cols-2 gap-1.5">
          {comparacao.map((linha) => (
            <div key={linha.rotulo} className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-line bg-void/50 px-2.5 py-1">
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
                    <span className="rounded-full border border-holo-2/50 bg-holo-2/10 px-2 py-0.5 font-mono text-xs text-holo-2">
                      Arcano
                    </span>
                  )}
                  {(p.custo_eter ?? 0) > 0 && (
                    <span className="rounded-full border border-holo-3/40 bg-holo-3/10 px-2 py-0.5 font-mono text-xs text-holo-3">
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

      {linhaEvolutiva.length > 1 && (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-void/45 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <h3 className="m-0 inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted">
              <GitBranch size={12} className="text-holo-3" aria-hidden="true" />
              Linha de Evolução
            </h3>
            {monstro.familia && (
              <span className="rounded-full border border-holo-3/40 bg-holo-3/10 px-2 py-0.5 font-mono text-xs text-holo-3">
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
                      <span className="block truncate font-mono text-xs text-muted">
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

      <div className="flex flex-col gap-1 rounded-xl border border-line bg-panel-2/60 p-2.5">
        <p className="m-0 text-xs leading-relaxed text-text">{monstro.descricao}</p>
        {monstro.habitat && <p className="m-0 text-xs leading-relaxed text-muted">{monstro.habitat}</p>}
      </div>

      {monstro.bestiario && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-panel-2/40 px-3 py-2">
          <p className="m-0 inline-flex items-start gap-1.5 font-mono text-xs text-muted">
            <Trophy size={13} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
            <span>{textoDoBestiario(monstro.bestiario)}</span>
          </p>
          {monstro.dica_tatica ? (
            <p className="m-0 rounded-lg border border-gold/35 bg-gold/10 px-2.5 py-1.5 text-xs leading-snug text-text">
              <strong className="text-gold">Dica do bestiário sobre {monstro.nome}: </strong>
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
    </>
  )

  if (semAcoes) {
    return (
      <aside aria-label={`Detalhes de ${monstro.nome}`} className={`flex flex-col gap-3 rounded-2xl border bg-panel p-3.5 shadow-lg ${tipo.borda}`}>
        <div>{cabecalhoERecompensas}</div>
        {corpoDaFicha}
      </aside>
    )
  }

  return (
    <aside
      aria-label={`Detalhes de ${monstro.nome}`}
      className={`flex flex-col rounded-2xl border bg-panel shadow-lg lg:max-h-[calc(100dvh-7rem)] lg:overflow-hidden ${tipo.borda}`}
    >
      <div className="shrink-0 border-b border-line/70 p-3.5 pb-3">{cabecalhoERecompensas}</div>
      <div className="flex flex-col gap-2.5 p-3.5 pt-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">{corpoDaFicha}</div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-panel px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => aoEnfrentar(monstro.id)}
          disabled={bloqueado || lutando !== null}
          aria-label={`Enfrentar ${monstro.nome}`}
          className="h-10 min-w-0 flex-1 cursor-pointer truncate rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-4 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
        >
          {lutando === monstro.id ? 'Batalhando…' : 'Enfrentar'}
          {lutando !== monstro.id && custoMana !== undefined && (
            <span className="ml-1 font-mono text-xs font-semibold opacity-80">· {custoMana} MP</span>
          )}
        </button>
        <BotaoEmGrupo
          tipo="monstro"
          alvoId={monstro.id}
          nome={monstro.nome}
          desativado={bloqueado || lutando !== null}
          elenco={elenco}
          esquadraoInicial={esquadraoInicial}
        />
      </div>
    </aside>
  )
}

function PainelDaRegiao({
  regiaoAtiva,
  estiloAtiva,
  monstrosDaRegiao,
  conexoesDaAtiva,
  selecionadoId,
  derrotadosAtiva,
  dominadaAtiva,
  carrossel,
  aoSelecionarRegiao,
  aoEscolherMonstro,
}: {
  regiaoAtiva: RegiaoMapa
  estiloAtiva: EstiloRegiao
  monstrosDaRegiao: MonstroNaLista[]
  conexoesDaAtiva: RegiaoMapa[]
  selecionadoId: string
  derrotadosAtiva: number
  dominadaAtiva: boolean
  carrossel: boolean
  aoSelecionarRegiao: (id: string) => void
  aoEscolherMonstro: (id: string, naGaveta: boolean) => void
}) {
  const IconeAtiva = estiloAtiva.Icone
  return (
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
              onClick={() => aoSelecionarRegiao(vizinha.id)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-line bg-void/60 px-2.5 py-0.5 font-mono text-xs text-muted hover:border-holo-3/60 hover:text-text"
            >
              <ArrowRight size={11} aria-hidden="true" />
              {vizinha.nome}
            </button>
          ))}
        </div>
      )}

      <div
        className={
          carrossel
            ? '-mx-3.5 flex snap-x gap-2.5 overflow-x-auto px-3.5 pb-1 scrollbar-hide'
            : 'grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3'
        }
      >
        {monstrosDaRegiao.map((m) => {
          const ativo = m.id === selecionadoId
          const tipo = ESTILO_DO_TIPO[m.tipo] ?? ESTILO_DO_TIPO.comum
          const barraDif = COR_BARRA_DIFICULDADE[m.dificuldade] ?? 'bg-holo-3'
          const estiloEl = ESTILO_DO_ELEMENTO[m.elemento ?? 'eter'] ?? ESTILO_DO_ELEMENTO.eter
          const vitorias = m.bestiario?.vitorias ?? 0
          const romano = ESTAGIOS_ROMANOS[m.estagio ?? 0] || ''

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => aoEscolherMonstro(m.id, carrossel)}
              aria-pressed={ativo}
              aria-label={`Inspecionar ${m.nome} (nível ${m.nivel})`}
              className={`group flex min-w-0 cursor-pointer items-center gap-2.5 rounded-2xl border p-2.5 text-left transition ${carrossel ? 'w-64 shrink-0 snap-start' : ''} ${
                ativo
                  ? 'border-holo-3 bg-void/90 ring-2 ring-holo-3/40'
                  : 'border-line bg-void/55 hover:border-holo-1/60 hover:bg-void/80'
              }`}
            >
              <div className="relative shrink-0">
                <IconeDoMonstro monstro={m} tamanho={carrossel ? 'h-16 w-16' : 'h-14 w-14'} destaque={ativo || m.tipo === 'chefe'} iconeTamanho={carrossel ? 28 : 24} />
                {m.tipo === 'chefe' && (
                  <span
                    title="Chefão"
                    className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-gold/70 bg-void text-gold"
                  >
                    <Crown size={12} aria-hidden="true" />
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-holo-3/35 bg-holo-3/10 px-1.5 py-0.5 text-xs text-holo-3">
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
  elementoHeroi,
  efeitoHeroi,
  classeHeroi,
  elenco,
  esquadraoInicial,
  portalVivo,
}: {
  monstros: MonstroNaLista[]
  classeHeroi?: string
  elementoHeroi?: string
  efeitoHeroi?: EfeitoDeElemento
  regioesBrutas?: RegiaoMapa[]
  atributosJogador: AtributosRPG
  custoMana?: number
  selecionadoId: string
  lutando: string | null
  bloqueado: boolean
  aoSelecionar: (id: string) => void
  aoEnfrentar: (id: string) => void
  elenco?: HeroiResumoEsquadrao[]
  esquadraoInicial?: string[]
  portalVivo?: PortalMapaVivo
}) {
  const regioes = regioesDoMapa({ regioes: regioesBrutas, monstros })
  const porId = new Map(monstros.map((m) => [m.id, m]))
  const selecionado = porId.get(selecionadoId) ?? monstros[0]

  const regiaoDoSelecionado =
    regioes.find((r) => selecionado && (r.monstros.includes(selecionado.id) || r.id === selecionado.regiao))?.id ??
    regioes[0]?.id ??
    ''

  const ehDesktop = useMidia('(min-width: 640px)')
  const ehMobile = !ehDesktop

  const [regiaoAtivaId, setRegiaoAtivaId] = useState(regiaoDoSelecionado)
  const [zoom, setZoom] = useState(ZOOM_MINIMO)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [arrastando, setArrastando] = useState(false)
  const [tamanhoTela, setTamanhoTela] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  // O quadro tem o formato da imagem (16:9) em qualquer tela: em 1× o mapa aparece inteiro,
  // sem faixa vazia, e o zoom só aproxima.
  const zoomMin = ZOOM_MINIMO
  // Gaveta da região no celular: abre ao tocar num pino, sem precisar rolar a página.
  const [gavetaAberta, setGavetaAberta] = useState(false)
  const gavetaRef = useRef<HTMLDivElement | null>(null)
  const fichaNaGavetaRef = useRef<HTMLDivElement | null>(null)

  const containerMapaRef = useRef<HTMLDivElement | null>(null)
  const arrasteRef = useRef<{
    ativo: boolean
    inicioX: number
    inicioY: number
    panX: number
    panY: number
    moveu: boolean
  } | null>(null)
  const ponteirosRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pincaRef = useRef<{ distInicial: number; zoomInicial: number } | null>(null)
  const suprimirClickRef = useRef(false)
  const inicializouCameraRef = useRef(false)
  const ultimoModoMobileRef = useRef(ehMobile)
  const ultimaRegiaoFocadaRef = useRef(regiaoDoSelecionado)

  const coordsPorId = new Map(
    regioes.map((r, idx) => [r.id, coordenadasDaRegiao(r, idx, regioes.length)]),
  )

  useEffect(() => {
    if (regiaoDoSelecionado) setRegiaoAtivaId(regiaoDoSelecionado)
  }, [regiaoDoSelecionado])

  useEffect(() => {
    const el = containerMapaRef.current
    if (!el) return
    const atualizar = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setTamanhoTela({ w: el.clientWidth, h: el.clientHeight })
      }
    }
    atualizar()
    if (typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver(atualizar)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Sincroniza zoom inicial e reenquadra quando a largura do viewport muda ou alterna desktop/celular.
  useEffect(() => {
    const mudouModo = ultimoModoMobileRef.current !== ehMobile
    if (mudouModo) {
      ultimoModoMobileRef.current = ehMobile
      const novoZoom = ZOOM_MINIMO
      setZoom(novoZoom)
      if (tamanhoTela.w > 0 && tamanhoTela.h > 0) {
        const coord = coordsPorId.get(regiaoAtivaId) ?? { x: 50, y: 50 }
        setPan(
          novoZoom > zoomMin + 0.05
            ? panParaRegiao(coord, tamanhoTela.w, tamanhoTela.h, novoZoom)
            : limitarPan(0, 0, tamanhoTela.w, tamanhoTela.h, novoZoom),
        )
        inicializouCameraRef.current = true
      }
      return
    }

    if (tamanhoTela.w <= 0 || tamanhoTela.h <= 0) return

    if (!inicializouCameraRef.current) {
      inicializouCameraRef.current = true
      const coord = coordsPorId.get(regiaoAtivaId) ?? { x: 50, y: 50 }
      setPan(
        zoom > zoomMin + 0.05
          ? panParaRegiao(coord, tamanhoTela.w, tamanhoTela.h, zoom)
          : limitarPan(0, 0, tamanhoTela.w, tamanhoTela.h, zoom),
      )
      return
    }

    setPan((atual) => limitarPan(atual.x, atual.y, tamanhoTela.w, tamanhoTela.h, zoom))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ehMobile, tamanhoTela.w, tamanhoTela.h])

  // Ao trocar de região (por clique no pino, pílula, rota ou evolução), centraliza se houver zoom.
  useEffect(() => {
    if (regiaoAtivaId === ultimaRegiaoFocadaRef.current) return
    ultimaRegiaoFocadaRef.current = regiaoAtivaId
    if (zoom <= zoomMin + 0.05 || tamanhoTela.w <= 0 || tamanhoTela.h <= 0) return
    const coord = coordsPorId.get(regiaoAtivaId) ?? { x: 50, y: 50 }
    setPan(panParaRegiao(coord, tamanhoTela.w, tamanhoTela.h, zoom))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regiaoAtivaId])

  useEffect(() => {
    if (!gavetaAberta) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGavetaAberta(false)
    }
    window.addEventListener('keydown', aoTeclar)
    gavetaRef.current?.focus()
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [gavetaAberta])

  useEffect(() => {
    if (!ehMobile) setGavetaAberta(false)
  }, [ehMobile])

  useSheetBehavior(ehMobile && gavetaAberta, () => setGavetaAberta(false), true)

  if (!selecionado || regioes.length === 0) return null

  const regiaoPorId = new Map(regioes.map((r) => [r.id, r]))
  const regiaoAtiva = regiaoPorId.get(regiaoAtivaId) ?? regioes[0]

  const aplicarZoom = (novoZoomBruto: number, opcoes?: { focarAtiva?: boolean; ancoraX?: number; ancoraY?: number }) => {
    const novoZoom = Math.max(zoomMin, Math.min(ZOOM_MAXIMO, Number(novoZoomBruto.toFixed(2))))
    setZoom(novoZoom)
    if (tamanhoTela.w <= 0 || tamanhoTela.h <= 0) return

    if (novoZoom <= zoomMin + 0.01) {
      setPan(limitarPan(0, 0, tamanhoTela.w, tamanhoTela.h, zoomMin))
      return
    }

    if (opcoes?.focarAtiva) {
      const coord = coordsPorId.get(regiaoAtiva.id) ?? { x: 50, y: 50 }
      setPan(panParaRegiao(coord, tamanhoTela.w, tamanhoTela.h, novoZoom))
      return
    }

    const ax = opcoes?.ancoraX ?? tamanhoTela.w / 2
    const ay = opcoes?.ancoraY ?? tamanhoTela.h / 2
    setPan((atual) => {
      const cx = (ax - atual.x) / zoom
      const cy = (ay - atual.y) / zoom
      return limitarPan(ax - cx * novoZoom, ay - cy * novoZoom, tamanhoTela.w, tamanhoTela.h, novoZoom)
    })
  }

  const selecionarRegiao = (id: string) => {
    setRegiaoAtivaId(id)
    const regiaoAlvo = regiaoPorId.get(id)
    if (regiaoAlvo && (!selecionado || !regiaoAlvo.monstros.includes(selecionado.id))) {
      const primeiroId = regiaoAlvo.monstros.find((mid) => porId.has(mid))
      if (primeiroId) aoSelecionar(primeiroId)
    }
    if (ehMobile) setGavetaAberta(true)
    if (zoom > zoomMin + 0.05 && tamanhoTela.w > 0 && tamanhoTela.h > 0) {
      const coord = coordsPorId.get(id) ?? { x: 50, y: 50 }
      setPan(panParaRegiao(coord, tamanhoTela.w, tamanhoTela.h, zoom))
      ultimaRegiaoFocadaRef.current = id
    }
  }

  const aoIniciarPonteiro = (e: ReactPointerEvent<HTMLDivElement>) => {
    ponteirosRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ponteirosRef.current.size === 2) {
      const pts = Array.from(ponteirosRef.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      pincaRef.current = { distInicial: Math.max(dist, 1), zoomInicial: zoom }
      arrasteRef.current = null
      setArrastando(true)
      return
    }
    if (zoom <= zoomMin + 0.01 && !ehMobile) return
    arrasteRef.current = {
      ativo: true,
      inicioX: e.clientX,
      inicioY: e.clientY,
      panX: pan.x,
      panY: pan.y,
      moveu: false,
    }
  }

  const aoMoverPonteiro = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (ponteirosRef.current.has(e.pointerId)) {
      ponteirosRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    if (ponteirosRef.current.size === 2 && pincaRef.current) {
      const pts = Array.from(ponteirosRef.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const novoZoom = pincaRef.current.zoomInicial * (dist / pincaRef.current.distInicial)
      const rect = containerMapaRef.current?.getBoundingClientRect()
      const midX = rect ? (pts[0].x + pts[1].x) / 2 - rect.left : undefined
      const midY = rect ? (pts[0].y + pts[1].y) / 2 - rect.top : undefined
      suprimirClickRef.current = true
      aplicarZoom(novoZoom, { ancoraX: midX, ancoraY: midY })
      return
    }
    const arraste = arrasteRef.current
    if (!arraste?.ativo || tamanhoTela.w <= 0 || tamanhoTela.h <= 0) return
    const dx = e.clientX - arraste.inicioX
    const dy = e.clientY - arraste.inicioY
    if (!arraste.moveu && Math.hypot(dx, dy) > 6) {
      arraste.moveu = true
      suprimirClickRef.current = true
      setArrastando(true)
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // jsdom pode não implementar setPointerCapture
      }
    }
    if (!arraste.moveu) return
    setPan(limitarPan(arraste.panX + dx, arraste.panY + dy, tamanhoTela.w, tamanhoTela.h, zoom))
  }

  const aoFinalizarPonteiro = (e: ReactPointerEvent<HTMLDivElement>) => {
    ponteirosRef.current.delete(e.pointerId)
    if (ponteirosRef.current.size < 2) pincaRef.current = null
    const arraste = arrasteRef.current
    if (arraste?.moveu) {
      suprimirClickRef.current = true
      window.setTimeout(() => {
        suprimirClickRef.current = false
      }, 0)
    }
    arrasteRef.current = null
    setArrastando(false)
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // ignora em ambiente sem captura
    }
  }

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
  const zoomAmpliado = zoom > zoomMin + 0.05
  // No celular os nomes se amontoam: só a ativa aparece, a não ser com zoom (as pílulas abaixo têm todos).
  const mostrarTodosNomes = ehDesktop || zoom >= 1.8

  // Escolher uma criatura na gaveta rola a própria gaveta até a ficha, que fica logo abaixo.
  const escolherMonstro = (id: string, naGaveta: boolean) => {
    aoSelecionar(id)
    if (naGaveta) {
      requestAnimationFrame(() => fichaNaGavetaRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }))
    }
  }

  const ficha = (
    <FolhaInspecaoMonstro
      monstro={selecionado}
      porId={porId}
      atributosJogador={atributosJogador}
      custoMana={custoMana}
      lutando={lutando}
      bloqueado={bloqueado}
      aoSelecionar={aoSelecionar}
      aoEnfrentar={aoEnfrentar}
      elementoHeroi={elementoHeroi}
      efeitoHeroi={efeitoHeroi}
      classeHeroi={classeHeroi}
      elenco={elenco}
      esquadraoInicial={esquadraoInicial}
    />
  )
  const fichaDaGaveta = selecionado && (
    <FolhaInspecaoMonstro
      monstro={selecionado}
      porId={porId}
      atributosJogador={atributosJogador}
      custoMana={custoMana}
      lutando={lutando}
      bloqueado={bloqueado}
      aoSelecionar={aoSelecionar}
      aoEnfrentar={aoEnfrentar}
      elementoHeroi={elementoHeroi}
      efeitoHeroi={efeitoHeroi}
      classeHeroi={classeHeroi}
      semAcoes
    />
  )

  const controlesZoom = (
    <div
      role="group"
      aria-label="Controles de zoom do mapa"
      onPointerDown={(e) => e.stopPropagation()}
      className={`z-30 flex items-center gap-1 rounded-full border border-line bg-void/90 p-1 shadow-lg backdrop-blur-sm ${
        ehMobile ? 'relative' : 'absolute top-2.5 right-2.5'
      }`}
    >
      <button
        type="button"
        onClick={() => aplicarZoom(zoom - ZOOM_PASSO)}
        disabled={zoom <= zoomMin + 0.01}
        aria-label="Diminuir zoom do mapa"
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-text transition hover:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={13} aria-hidden="true" />
      </button>
      <span className="min-w-10 text-center font-mono text-[11px] font-bold text-text">
        {zoom.toFixed(1).replace('.', ',')}×
      </span>
      <button
        type="button"
        onClick={() => aplicarZoom(zoom + ZOOM_PASSO)}
        disabled={zoom >= ZOOM_MAXIMO - 0.01}
        aria-label="Aumentar zoom do mapa"
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-text transition hover:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={13} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() =>
          zoomAmpliado
            ? aplicarZoom(zoomMin)
            : aplicarZoom(ZOOM_PADRAO_MOBILE, { focarAtiva: true })
        }
        className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-line bg-panel-2 px-2.5 text-[11px] font-bold text-text transition hover:border-holo-3"
      >
        <Maximize2 size={11} aria-hidden="true" />
        {zoomAmpliado ? 'Visão geral' : 'Focar'}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_430px] xl:grid-cols-[minmax(0,1fr)_470px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
      {/* Mapa-múndi panorâmico na esquerda e navegável por câmera no celular */}
      <section aria-label="Mapa de regiões" className="overflow-hidden rounded-2xl border border-line bg-panel p-3 sm:p-4">
        <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-holo-3" aria-hidden="true" />
              <h2 className="m-0 font-anton text-base uppercase tracking-wide text-text sm:text-lg">Mapa-Múndi de Éter</h2>
            </div>
            <span className="font-mono text-xs text-muted">{regioes.length} regiões · {monstros.length} criaturas</span>
          </div>

          <div className="flex flex-col gap-1 rounded-xl border border-line/70 bg-panel-2/60 px-3 py-1.5 sm:w-64 sm:shrink-0">
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
        </div>

        {portalVivo && (
          <button
            type="button"
            onClick={() => selecionarRegiao(portalVivo.regiao_id)}
            className="mb-2.5 flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 rounded-xl border border-holo-2/50 bg-holo-2/10 px-3 py-2 text-left text-xs transition hover:bg-holo-2/20"
          >
            <span className="inline-flex items-center gap-1.5 font-bold text-text">
              <Zap size={14} className="shrink-0 text-holo-2" aria-hidden="true" />
              Portal Vivo em <strong>{portalVivo.regiao_nome}</strong>: {portalVivo.titulo}
            </span>
            <span className="font-mono text-xs text-holo-2">
              {portalVivo.bonus_descricao} · {portalVivo.minutos_restantes} min
            </span>
          </button>
        )}

        <div
          ref={containerMapaRef}
          aria-label="Mapa interativo das regiões"
          onPointerDown={aoIniciarPonteiro}
          onPointerMove={aoMoverPonteiro}
          onPointerUp={aoFinalizarPonteiro}
          onPointerCancel={aoFinalizarPonteiro}
          onClickCapture={(e) => {
            if (suprimirClickRef.current) {
              e.stopPropagation()
              e.preventDefault()
              suprimirClickRef.current = false
            }
          }}
          className={`relative aspect-video w-full select-none overflow-hidden rounded-2xl border border-line bg-void ${
            ehMobile || zoomAmpliado ? 'touch-none' : 'touch-pan-y'
          } ${zoomAmpliado ? (arrastando ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
        >
          <div
            style={
              tamanhoTela.w > 0
                ? { transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }
                : undefined
            }
            className={`relative aspect-video w-full origin-top-left ${
              arrastando ? '' : 'transition-transform duration-300 ease-out motion-reduce:transition-none'
            }`}
          >
            <img
              src={mapaMundiImg}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-95"
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
                    strokeWidth={a.destacada ? 0.75 : 0.45}
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
              const derrotadosRegiao = monstrosRegiao.filter((m) => (m.bestiario?.vitorias ?? 0) > 0).length
              const dominada = qtd > 0 && derrotadosRegiao === qtd

              return (
                <button
                  key={regiao.id}
                  type="button"
                  onClick={() => selecionarRegiao(regiao.id)}
                  aria-pressed={ativa}
                  aria-label={`Explorar ${regiao.nome} (${regiao.faixa_nivel}, ${derrotadosRegiao} de ${qtd} criaturas derrotadas)`}
                  // Escala inversa ao zoom: aproximar afasta os pinos sem inflar pino e nome.
                  style={{ left: `${coord.x}%`, top: `${coord.y}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
                  className={`group absolute flex cursor-pointer flex-col items-center ${
                    ativa ? 'z-20' : 'z-10 hover:z-20'
                  }`}
                >
                  <span
                    className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 backdrop-blur-sm transition sm:h-11 sm:w-11 ${
                      ativa ? `scale-110 ${estilo.pinAtivo}` : `${estilo.pinInativo} group-hover:scale-105`
                    }`}
                  >
                    {/* Anel de progresso: a parte verde é a fração de criaturas já derrotadas. */}
                    {qtd > 0 && derrotadosRegiao > 0 && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-1 rounded-full sm:-inset-1.5"
                        style={{
                          background: `conic-gradient(var(--color-green) ${Math.round((derrotadosRegiao / qtd) * 360)}deg, transparent 0)`,
                          mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
                          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
                        }}
                      />
                    )}
                    <IconeRegiao size={14} className={`${estilo.cabecalho} sm:hidden`} aria-hidden="true" />
                    <IconeRegiao size={18} className={`${estilo.cabecalho} hidden sm:block`} aria-hidden="true" />

                    <span className="absolute -top-1 -left-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-line bg-void px-0.5 font-mono text-[8px] font-bold leading-none text-text sm:-top-1.5 sm:-left-1.5 sm:h-4 sm:min-w-4 sm:px-1 sm:text-[10px]">
                      {regiao.ordem}
                    </span>

                    {portalVivo?.regiao_id === regiao.id && (
                      <span
                        title={`Portal Dimensional ativo: ${portalVivo.titulo}`}
                        className="absolute -bottom-1 -right-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full border border-holo-2 bg-void text-holo-2 sm:-bottom-1.5 sm:-right-1.5 sm:h-5 sm:w-5"
                      >
                        <Zap size={9} className="sm:hidden" aria-hidden="true" />
                        <Zap size={11} className="hidden sm:block" aria-hidden="true" />
                      </span>
                    )}

                    {regiao.em_destaque ? (
                      <span
                        title="Destaque de hoje"
                        className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gold/70 bg-void text-gold sm:-top-1.5 sm:-right-1.5 sm:h-4 sm:w-4"
                      >
                        <Sparkles size={8} className="sm:hidden" aria-hidden="true" />
                        <Sparkles size={10} className="hidden sm:block" aria-hidden="true" />
                      </span>
                    ) : dominada ? (
                      <span
                        title="Região dominada"
                        className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-green/70 bg-void text-green sm:-top-1.5 sm:-right-1.5 sm:h-4 sm:w-4"
                      >
                        <Check size={8} className="sm:hidden" aria-hidden="true" />
                        <Check size={10} className="hidden sm:block" aria-hidden="true" />
                      </span>
                    ) : null}
                  </span>

                  {(mostrarTodosNomes || ativa) && (
                    <span
                      className={`pointer-events-none mt-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-tight shadow-lg sm:px-2.5 sm:text-xs ${
                        ativa
                          ? 'border-holo-3/70 bg-void/95 text-text'
                          : 'border-line/80 bg-void/85 text-muted group-hover:text-text'
                      }`}
                    >
                      {regiao.nome}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Controles de zoom: sobre o mapa no computador; abaixo dele no celular. */}
          {!ehMobile && controlesZoom}

          {zoomAmpliado && !ehMobile && (
            <span className="pointer-events-none absolute bottom-2.5 left-2.5 z-20 rounded-full border border-line/80 bg-void/85 px-2.5 py-1 font-mono text-[10px] text-muted backdrop-blur-sm">
              Arraste para explorar · pinça ou +/− ajusta o zoom
            </span>
          )}
        </div>

        {ehMobile && <div className="mt-2 flex justify-end">{controlesZoom}</div>}

        {/* Barra rápida de regiões sem barra de rolagem cinza no desktop */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {regioes.map((regiao) => {
            const estilo = ESTILO_DA_REGIAO[regiao.id] ?? ESTILO_REGIAO_PADRAO
            const ativa = regiao.id === regiaoAtiva.id
            const qtd = regiao.monstros.filter((id) => porId.has(id)).length
            return (
              <button
                key={regiao.id}
                type="button"
                onClick={() => selecionarRegiao(regiao.id)}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                  ativa ? estilo.pilulaAtiva : 'border-line bg-void/60 text-muted hover:text-text'
                }`}
              >
                <span className="font-mono text-[11px]">0{regiao.ordem}</span>
                <span>{regiao.nome}</span>
                <span className="font-mono text-[11px] opacity-75">({regiao.monstros.filter((id) => (porId.get(id)?.bestiario?.vitorias ?? 0) > 0).length}/{qtd})</span>
                {regiao.em_destaque && <Sparkles size={11} className="text-gold" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </section>

        {/* Telas médias e grandes: criaturas da região abaixo do mapa aproveitando a largura */}
        {!ehMobile && (
          <PainelDaRegiao
            regiaoAtiva={regiaoAtiva}
            estiloAtiva={estiloAtiva}
            monstrosDaRegiao={monstrosDaRegiao}
            conexoesDaAtiva={conexoesDaAtiva}
            selecionadoId={selecionado.id}
            derrotadosAtiva={derrotadosAtiva}
            dominadaAtiva={dominadaAtiva}
            carrossel={false}
            aoSelecionarRegiao={selecionarRegiao}
            aoEscolherMonstro={escolherMonstro}
          />
        )}
      </div>

      {/* Telas médias: ficha abaixo da região. Telas grandes: ficha inteira fixa ao lado do mapa. */}
      {!ehMobile && (
        <div className="min-w-0 lg:sticky lg:top-24">
          {ficha}
        </div>
      )}

      {/* Celular: barra da região ativa abaixo do mapa; tocar abre a gaveta. */}
      {ehMobile && (
        <button
          type="button"
          onClick={() => setGavetaAberta(true)}
          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left ${estiloAtiva.card}`}
        >
          <IconeAtiva size={18} className={estiloAtiva.cabecalho} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-text">{regiaoAtiva.nome}</span>
            <span className="block font-mono text-xs text-muted">
              {derrotadosAtiva}/{monstrosDaRegiao.length} dominados · {regiaoAtiva.faixa_nivel}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-holo-3 px-3 py-1.5 text-xs font-extrabold text-void">Ver criaturas</span>
        </button>
      )}

      {/* No body, fora do contêiner da página: dentro dele o z-index da gaveta fica preso ao
          contexto de empilhamento do pai, e o menu inferior cobria os botões de luta. */}
      {ehMobile &&
        gavetaAberta &&
        createPortal(
        <div className="fixed inset-0 z-[90] flex flex-col justify-end">
          <button
            type="button"
            aria-label="Fechar região"
            onClick={() => setGavetaAberta(false)}
            className="absolute inset-0 cursor-default bg-void/70 backdrop-blur-[2px]"
          />
          <div
            ref={gavetaRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Região ${regiaoAtiva.nome}`}
            tabIndex={-1}
            className="relative flex max-h-[90dvh] flex-col gap-3 overflow-y-auto overflow-x-hidden overscroll-contain rounded-t-3xl border-t border-line bg-panel px-3 pt-0 pb-0 outline-none"
          >
            <div className="sticky top-0 z-10 -mx-3 flex items-center justify-between gap-2 bg-panel px-3 pt-3 pb-2 shadow-[0_6px_12px_-8px_rgba(0,0,0,0.6)]">
              <span aria-hidden="true" className="absolute top-1 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-line" />
              <span className="mt-1 min-w-0 truncate text-sm font-bold text-text">
                {selecionado ? selecionado.nome : regiaoAtiva.nome}
                <span className="ml-1.5 font-mono text-xs font-normal text-muted">toque numa criatura para trocar</span>
              </span>
              <button
                type="button"
                onClick={() => setGavetaAberta(false)}
                aria-label="Fechar"
                className="mt-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-panel-2 text-muted"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <PainelDaRegiao
              regiaoAtiva={regiaoAtiva}
              estiloAtiva={estiloAtiva}
              monstrosDaRegiao={monstrosDaRegiao}
              conexoesDaAtiva={conexoesDaAtiva}
              selecionadoId={selecionado.id}
              derrotadosAtiva={derrotadosAtiva}
              dominadaAtiva={dominadaAtiva}
              carrossel
              aoSelecionarRegiao={selecionarRegiao}
              aoEscolherMonstro={escolherMonstro}
            />
            <div ref={fichaNaGavetaRef} className="scroll-mt-14">
              {fichaDaGaveta}
            </div>
            {/* Atalho fixo: lutar sem rolar até o fim da ficha. */}
            <div className="sticky bottom-0 -mx-3 border-t border-line bg-panel px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => aoEnfrentar(selecionado.id)}
                  disabled={bloqueado || lutando !== null}
                  className="h-10 min-w-0 flex-1 cursor-pointer truncate rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-4 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {lutando === selecionado.id ? 'Batalhando…' : `Lutar contra ${selecionado.nome}`}
                  {lutando !== selecionado.id && custoMana !== undefined && (
                    <span className="ml-1 font-mono text-xs font-semibold opacity-80">· {custoMana} MP</span>
                  )}
                </button>
                <BotaoEmGrupo
                  tipo="monstro"
                  alvoId={selecionado.id}
                  nome={selecionado.nome}
                  desativado={bloqueado || lutando !== null}
                  elenco={elenco}
                  esquadraoInicial={esquadraoInicial}
                />
              </div>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </div>
  )
}


