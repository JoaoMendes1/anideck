// client/src/lib/rpg.ts
// Tipos e chamadas das rotas de jogo do personagem (Fase 18): equipamentos e atributos.
//
// Os números de combate (Vida, Ataque, Defesa) são calculados no servidor a partir do nível
// e dos itens equipados. A tela só mostra; nada daqui é enviado de volta como atributo.
import { Footprints, Gem, Shield, Shirt, Sword, type LucideIcon } from 'lucide-react'
import { supabase } from './supabase'

export interface AtributosRPG {
  vida: number
  ataque: number
  defesa: number
  /** Os campos abaixo chegam com o servidor do sql/077; respostas antigas não os têm. */
  magia?: number
  eter?: number
  velocidade?: number
  /** Milésimos: 70 = 7%. */
  critico_por_mil?: number
  /** Porcento: 150 = 1,5x. */
  dano_critico?: number
  esquiva_por_mil?: number
  /** Pontos percentuais somados à chance de item. */
  sorte_item?: number
  poder: number
}

export type PrimarioId = 'forca' | 'inteligencia' | 'constituicao' | 'agilidade' | 'destreza' | 'sorte'
export type PrimariosRPG = Record<PrimarioId, number>

export interface HabilidadeRPG {
  id: string
  nome: string
  descricao: string
  tipo: 'comum' | 'unica'
  nivel_minimo: number
  custo_eter: number
  recarga: number
  desbloqueada: boolean
  /** Maestria (sql/084): usos em batalha, grau de 1 a 4 (0 na única) e usos até o próximo. */
  usos?: number
  maestria?: number
  faltam_maestria?: number
}

const GRAUS_DE_MAESTRIA = ['', 'I', 'II', 'III', 'IV']

/** "Maestria II · faltam 34 usos", ou vazio para a única e para quem não tem o dado. */
export function textoDaMaestria(h: Pick<HabilidadeRPG, 'tipo' | 'maestria' | 'faltam_maestria'>): string {
  const grau = h.maestria ?? 0
  if (h.tipo !== 'comum' || grau < 1) return ''
  const nome = `Maestria ${GRAUS_DE_MAESTRIA[Math.min(grau, 4)]}`
  const faltam = h.faltam_maestria ?? 0
  if (faltam <= 0) return `${nome} · máxima`
  return `${nome} · faltam ${faltam} ${faltam === 1 ? 'uso' : 'usos'}`
}

export type SlotId = 'arma' | 'armadura' | 'capa' | 'botas' | 'joia'
export type Raridade = 'comum' | 'raro' | 'epico' | 'lendario'

export interface ItemRPG {
  id: string
  slot: SlotId
  nome: string
  descricao: string
  raridade: Raridade
  vida: number
  ataque: number
  defesa: number
  nivel_minimo: number
  /** De 0 a 10 (sql/083); Vida, Ataque e Defesa já vêm com ele somado. */
  aprimoramento?: number
}

export interface ItemDoInventario extends ItemRPG {
  quantidade: number
  equipado: boolean
  bloqueado: boolean
  /** Teto de aprimoramento da raridade. */
  aprimoramento_maximo?: number
  /** Preço em Ouro do próximo nível; 0 quando já está no teto. */
  custo_aprimorar?: number
}

export interface SlotRPG {
  slot: SlotId
  item?: ItemRPG
}

export interface EstadoEquipamento {
  nivel: number
  base: AtributosRPG
  atributos: AtributosRPG
  slots: SlotRPG[]
  inventario: ItemDoInventario[]
  primarios_base?: PrimariosRPG
  pontos?: PrimariosRPG
  pontos_disponiveis?: number
  habilidades?: HabilidadeRPG[]
  /** Ouro disponível para aprimorar. */
  ouro?: number
}

/** O que cada atributo primário faz, na ordem da tela. O efeito é texto: a conta é do servidor. */
export const PRIMARIOS_RPG: { id: PrimarioId; rotulo: string; efeito: string }[] = [
  { id: 'forca', rotulo: 'Força', efeito: 'Ataque' },
  { id: 'inteligencia', rotulo: 'Inteligência', efeito: 'Magia e Éter' },
  { id: 'constituicao', rotulo: 'Constituição', efeito: 'Vida e Defesa' },
  { id: 'agilidade', rotulo: 'Agilidade', efeito: 'Velocidade e esquiva' },
  { id: 'destreza', rotulo: 'Destreza', efeito: 'Crítico' },
  { id: 'sorte', rotulo: 'Sorte', efeito: 'Chance de item' },
]

export const PRIMARIOS_ZERADOS: PrimariosRPG = { forca: 0, inteligencia: 0, constituicao: 0, agilidade: 0, destreza: 0, sorte: 0 }

export function somaDosPontos(p: PrimariosRPG): number {
  return PRIMARIOS_RPG.reduce((total, { id }) => total + (p[id] ?? 0), 0)
}

/** Milésimos em porcentagem curta: 70 vira "7%", 115 vira "11,5%". */
export function porMilEmPorcento(valor: number | undefined): string {
  const v = (valor ?? 0) / 10
  return `${Number.isInteger(v) ? v : v.toFixed(1).replace('.', ',')}%`
}

// Arte provisória: o slot dá o ícone e a raridade dá a cor. A ilustração de cada item entra
// depois, por id, sem mudar regra.
export const SLOTS_RPG: { id: SlotId; rotulo: string; Icone: LucideIcon }[] = [
  { id: 'arma', rotulo: 'Arma', Icone: Sword },
  { id: 'armadura', rotulo: 'Armadura', Icone: Shield },
  { id: 'capa', rotulo: 'Capa', Icone: Shirt },
  { id: 'botas', rotulo: 'Botas', Icone: Footprints },
  { id: 'joia', rotulo: 'Joia', Icone: Gem },
]

// Classes inteiras, para o Tailwind gerar cada uma.
export const ESTILO_DA_RARIDADE: Record<Raridade, { rotulo: string; texto: string; borda: string; fundo: string }> = {
  // Comum tem borda cheia e texto claro: o slot vazio é o tracejado apagado, e os dois não se confundem.
  comum: { rotulo: 'Comum', texto: 'text-text', borda: 'border-text/45', fundo: 'bg-void/80' },
  raro: { rotulo: 'Raro', texto: 'text-holo-3', borda: 'border-holo-3/60', fundo: 'bg-holo-3/10' },
  epico: { rotulo: 'Épico', texto: 'text-holo-2', borda: 'border-holo-2/70', fundo: 'bg-holo-2/10' },
  lendario: { rotulo: 'Lendário', texto: 'text-gold', borda: 'border-gold/70', fundo: 'bg-gold/10' },
}

export function estiloDaRaridade(raridade: string | undefined) {
  return ESTILO_DA_RARIDADE[(raridade ?? 'comum') as Raridade] ?? ESTILO_DA_RARIDADE.comum
}

/** Texto curto dos atributos de um item, só com os que ele dá ("+4 Ataque · +2 Defesa"). */
export function resumoDoItem(item: Pick<ItemRPG, 'vida' | 'ataque' | 'defesa'>): string {
  const partes: string[] = []
  if (item.vida > 0) partes.push(`+${item.vida} Vida`)
  if (item.ataque > 0) partes.push(`+${item.ataque} Ataque`)
  if (item.defesa > 0) partes.push(`+${item.defesa} Defesa`)
  return partes.length ? partes.join(' · ') : 'Sem atributos'
}

/**
 * Diferença de atributos ao trocar o item do slot pelo candidato. Positivo é ganho.
 * Item bloqueado pelo nível não soma, então a troca para ele mostra só a perda.
 */
export function diferencaDaTroca(
  atual: Pick<ItemRPG, 'vida' | 'ataque' | 'defesa'> | undefined,
  candidato: Pick<ItemDoInventario, 'vida' | 'ataque' | 'defesa' | 'bloqueado'>,
): { vida: number; ataque: number; defesa: number } {
  const somaDoCandidato = candidato.bloqueado ? { vida: 0, ataque: 0, defesa: 0 } : candidato
  return {
    vida: somaDoCandidato.vida - (atual?.vida ?? 0),
    ataque: somaDoCandidato.ataque - (atual?.ataque ?? 0),
    defesa: somaDoCandidato.defesa - (atual?.defesa ?? 0),
  }
}

async function cabecalhoDeAutenticacao(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

const FALHA_DOS_PONTOS = 'Não foi possível salvar os pontos agora.'

/** Grava a distribuição inteira dos pontos. Devolve o estado novo ou a mensagem de erro. */
export async function distribuirPontos(pontos: PrimariosRPG): Promise<{ dados?: EstadoEquipamento; erro?: string }> {
  try {
    const res = await fetch('/api/personagem/atributos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify(pontos),
    })
    const json = (await res.json().catch(() => null)) as (EstadoEquipamento & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || FALHA_DOS_PONTOS }
    if (!json || !Array.isArray(json.slots)) return { erro: FALHA_DOS_PONTOS }
    return { dados: json }
  } catch {
    return { erro: FALHA_DOS_PONTOS }
  }
}

/** Lê atributos, slots e inventário. Devolve null quando a leitura falha. */
export async function obterEquipamentos(): Promise<EstadoEquipamento | null> {
  try {
    const res = await fetch('/api/personagem/equipamentos', { headers: await cabecalhoDeAutenticacao() })
    if (!res.ok) return null
    const json = (await res.json()) as EstadoEquipamento
    if (!json || !Array.isArray(json.slots) || !json.atributos) return null
    return json
  } catch {
    return null
  }
}

/** Equipa um item no slot; com itemId vazio, esvazia o slot. */
export async function equiparItemRPG(
  slot: SlotId,
  itemId: string,
): Promise<{ dados?: EstadoEquipamento; erro?: string }> {
  const falha = 'Não foi possível trocar o equipamento agora.'
  try {
    const res = await fetch('/api/personagem/equipamentos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ slot, item_id: itemId }),
    })
    const json = (await res.json().catch(() => null)) as (EstadoEquipamento & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !Array.isArray(json.slots)) return { erro: falha }
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

/** Sobe um nível do item. O preço é do servidor; a tela só o mostra. */
export async function aprimorarItem(itemId: string): Promise<{ dados?: EstadoEquipamento; erro?: string }> {
  const falha = 'Não foi possível aprimorar agora.'
  try {
    const res = await fetch('/api/rpg/aprimorar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ item_id: itemId }),
    })
    const json = (await res.json().catch(() => null)) as (EstadoEquipamento & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !Array.isArray(json.slots)) return { erro: falha }
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

// ---------------------------------------------------------------------------------------
// Expedições (combate)
// ---------------------------------------------------------------------------------------

export type TipoMonstro = 'comum' | 'raro' | 'chefe'
export type Dificuldade = 'facil' | 'equilibrada' | 'dificil' | 'perigosa'

export interface MonstroRPG {
  id: string
  nome: string
  descricao: string
  tipo: TipoMonstro
  nivel: number
  vida: number
  ataque: number
  defesa: number
  bilhetes: number
  chance_item: number
  raridade_item: Raridade
}

export interface MonstroNaLista extends MonstroRPG {
  poder: number
  dificuldade: Dificuldade
}

/** Regras de recuperação da Vida, em por mil da Vida máxima (sql/081). */
export interface RegrasVida {
  regen_por_hora: number
  por_episodio: number
  episodios_por_dia: number
  pocao: number
  pousada_horas: number
}

export interface HojeRPG {
  feitas: number
  limite: number
  bilhetes: number
  ouro?: number
  /** Vida perdida em por mil, já descontada a regeneração. */
  vida_perdida?: number
  /** Quando a Pousada volta a valer; nulo é agora. */
  pousada_livre_em?: string | null
  episodios_hoje?: number
  regras?: RegrasVida
}

/** Vida do personagem entre as batalhas. */
export interface VidaRPG {
  atual: number
  maxima: number
  perdida_por_mil: number
}

export interface CustosRecuperacao {
  pousada: number
  pocao: number
}

export type TipoRecuperacao = 'pousada' | 'pocao'

export interface EstadoExpedicoes {
  atributos: AtributosRPG
  vida?: VidaRPG
  custos?: CustosRecuperacao
  hoje: HojeRPG
  monstros: MonstroNaLista[]
}

export interface TurnoBatalha {
  atacante: 'jogador' | 'monstro'
  dano: number
  critico: boolean
  vida_jogador: number
  vida_monstro: number
  /** Nome da habilidade usada; ausente é ataque comum. */
  habilidade?: string
  esquiva?: boolean
  cura?: number
  eter?: number
}

export interface RespostaBatalha {
  monstro: MonstroRPG
  jogador: AtributosRPG
  resultado: { venceu: boolean; rodadas: number; turnos: TurnoBatalha[]; vida_inicial?: number; vida_final?: number }
  recompensa: { bilhetes: number; ouro?: number; item?: ItemRPG }
  vida?: VidaRPG
  hoje: HojeRPG
}

/** Texto de uma linha do registro da luta e o número ao lado (dano ou cura). */
export function descreverTurno(turno: TurnoBatalha, nomeDoMonstro: string): { texto: string; valor: string } {
  if (turno.atacante === 'monstro') {
    if (turno.esquiva) return { texto: `${nomeDoMonstro} ataca, e você esquiva`, valor: '0' }
    return { texto: `${nomeDoMonstro} ataca`, valor: `−${turno.dano}` }
  }
  if (turno.cura) return { texto: `${turno.habilidade ?? 'Você'}: recupera Vida`, valor: `+${turno.cura}` }
  if (turno.habilidade) return { texto: `Você usa ${turno.habilidade}`, valor: `−${turno.dano}` }
  return { texto: 'Você golpeia', valor: `−${turno.dano}` }
}

export const ROTULO_DA_DIFICULDADE: Record<Dificuldade, { rotulo: string; classe: string }> = {
  facil: { rotulo: 'Fácil', classe: 'text-green border-green/50' },
  equilibrada: { rotulo: 'Equilibrada', classe: 'text-holo-3 border-holo-3/50' },
  dificil: { rotulo: 'Difícil', classe: 'text-gold border-gold/50' },
  perigosa: { rotulo: 'Perigosa', classe: 'text-coral border-coral/50' },
}

export function rotuloDaDificuldade(d: string | undefined) {
  return ROTULO_DA_DIFICULDADE[(d ?? 'equilibrada') as Dificuldade] ?? ROTULO_DA_DIFICULDADE.equilibrada
}

/** Sem Vida, o servidor recusa a batalha: a tela bloqueia antes. */
export function semVida(vida: VidaRPG | undefined): boolean {
  return Boolean(vida && vida.perdida_por_mil >= 1000)
}

/** Hora local em que a Pousada volta a valer, ou vazio quando já vale. */
export function horaDaPousada(livreEm: string | null | undefined, agora: Date = new Date()): string {
  if (!livreEm) return ''
  const quando = new Date(livreEm)
  if (Number.isNaN(quando.getTime()) || quando <= agora) return ''
  return quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Quantas batalhas ainda cabem hoje (nunca negativo). */
export function batalhasRestantes(hoje: HojeRPG | undefined): number {
  if (!hoje) return 0
  return Math.max(0, hoje.limite - hoje.feitas)
}

export async function obterExpedicoes(): Promise<{ dados?: EstadoExpedicoes; erro?: string; semPersonagem?: boolean }> {
  try {
    const res = await fetch('/api/rpg/batalhas', { headers: await cabecalhoDeAutenticacao() })
    if (res.status === 404) return { semPersonagem: true }
    const json = (await res.json().catch(() => null)) as (EstadoExpedicoes & { error?: string }) | null
    if (!res.ok || !json || !Array.isArray(json.monstros)) return { erro: json?.error || 'Expedições indisponíveis no momento.' }
    return { dados: json }
  } catch {
    return { erro: 'Expedições indisponíveis no momento.' }
  }
}

export async function batalhar(monstroId: string): Promise<{ dados?: RespostaBatalha; erro?: string }> {
  const falha = 'Não foi possível batalhar agora.'
  try {
    const res = await fetch('/api/rpg/batalhas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ monstro_id: monstroId }),
    })
    const json = (await res.json().catch(() => null)) as (RespostaBatalha & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !json.resultado || !Array.isArray(json.resultado.turnos)) return { erro: falha }
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

export async function recuperarVida(
  tipo: TipoRecuperacao,
): Promise<{ dados?: { vida: VidaRPG; ouro: number; vida_recuperada: number }; erro?: string }> {
  const falha = 'Não foi possível recuperar agora.'
  try {
    const res = await fetch('/api/rpg/recuperar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ tipo }),
    })
    const json = (await res.json().catch(() => null)) as { vida?: VidaRPG; ouro?: number; vida_recuperada?: number; error?: string } | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !json.vida) return { erro: falha }
    return { dados: { vida: json.vida, ouro: json.ouro ?? 0, vida_recuperada: json.vida_recuperada ?? 0 } }
  } catch {
    return { erro: falha }
  }
}

// ---------------------------------------------------------------------------------------
// Invocação (gratuita: bilhetes só vêm de batalha)
// ---------------------------------------------------------------------------------------

// Em por mil, como o banco devolve: 780 = 78%. Não há Comum: os itens comuns são do kit
// inicial, que a invocação não sorteia (sql/082).
export interface ChancesInvocacao {
  ouro: number
  raro: number
  epico: number
  lendario: number
  /** A cada quantas tentativas sem Raro a próxima é Raro ou melhor. */
  garantia: number
  /** A partir desta tentativa sem Lendário, a chance sobe. */
  lendario_sobe_em: number
  lendario_passo: number
  /** Esta tentativa sem Lendário é Lendária. */
  lendario_garantido: number
  ouro_por_tentativa: number
}

export type ItemInvocado =
  | (ItemRPG & { tipo: 'item'; garantida: boolean })
  | { tipo: 'ouro'; ouro: number; garantida: boolean }

export interface EstadoInvocacao {
  bilhetes: number
  ouro?: number
  sem_raro: number
  sem_lendario: number
  /** Chance de Lendário na próxima tentativa, em por mil, já com a garantia. */
  chance_lendario_agora: number
  chances: ChancesInvocacao
  itens?: ItemInvocado[]
}

/** Por mil em texto de porcentagem: 600 → "60%", 15 → "1,5%". */
export function porcentagem(porMil: number): string {
  const valor = porMil / 10
  return `${Number.isInteger(valor) ? valor : valor.toFixed(1).replace('.', ',')}%`
}

/** Quantas invocações faltam para a garantia de Raro ou melhor (a próxima é 1). */
export function faltamParaGarantia(estado: Pick<EstadoInvocacao, 'sem_raro' | 'chances'>): number {
  return Math.max(1, estado.chances.garantia - estado.sem_raro)
}

/** Quantas invocações faltam para o Lendário garantido (a próxima é 1). */
export function faltamParaLendario(estado: Pick<EstadoInvocacao, 'sem_lendario' | 'chances'>): number {
  return Math.max(1, estado.chances.lendario_garantido - estado.sem_lendario)
}

export async function obterInvocacao(): Promise<{ dados?: EstadoInvocacao; erro?: string; semPersonagem?: boolean }> {
  try {
    const res = await fetch('/api/rpg/invocacao', { headers: await cabecalhoDeAutenticacao() })
    if (res.status === 404) return { semPersonagem: true }
    const json = (await res.json().catch(() => null)) as (EstadoInvocacao & { error?: string }) | null
    if (!res.ok || !json || !json.chances) return { erro: json?.error || 'Invocação indisponível no momento.' }
    return { dados: json }
  } catch {
    return { erro: 'Invocação indisponível no momento.' }
  }
}

export async function invocar(vezes: 1 | 10): Promise<{ dados?: EstadoInvocacao; erro?: string }> {
  const falha = 'Não foi possível invocar agora.'
  try {
    const res = await fetch('/api/rpg/invocacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ vezes }),
    })
    const json = (await res.json().catch(() => null)) as (EstadoInvocacao & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !Array.isArray(json.itens)) return { erro: falha }
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}
