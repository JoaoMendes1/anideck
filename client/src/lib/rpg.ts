// client/src/lib/rpg.ts
// Tipos e chamadas das rotas de jogo do personagem (Fase 18): equipamentos e atributos.
//
// Os números de combate (Vida, Ataque, Defesa) são calculados no servidor a partir do nível
// e dos itens equipados. A tela só mostra; nada daqui é enviado de volta como atributo.
import { Footprints, Gem, Shield, Shirt, Sword, type LucideIcon } from 'lucide-react'
import { supabase } from './supabase'
import { avisarOuroMudou } from './hud'

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
    avisarOuroMudou()
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
  /** Elemento e poderes vêm do código do servidor (rpg_combate_avancado.go). */
  elemento?: string
  poderes?: PoderDoMonstro[]
}

export interface PoderDoMonstro {
  id: string
  nome: string
  descricao: string
  tipo: 'golpe' | 'drenar' | 'escudo' | 'furia' | 'invocar'
}

export type RelacaoElemental = 'vantagem' | 'desvantagem' | 'neutro'

/** Cor e símbolo de cada elemento, para os selos da tela. Classes inteiras (Tailwind). */
export const ESTILO_DO_ELEMENTO: Record<string, { simbolo: string; classe: string }> = {
  fogo: { simbolo: '🔥', classe: 'text-coral border-coral/50' },
  agua: { simbolo: '💧', classe: 'text-holo-3 border-holo-3/50' },
  raio: { simbolo: '⚡', classe: 'text-gold border-gold/50' },
  terra: { simbolo: '🪨', classe: 'text-green border-green/50' },
  luz: { simbolo: '☀️', classe: 'text-gold border-gold/50' },
  trevas: { simbolo: '🌑', classe: 'text-holo-2 border-holo-2/50' },
  eter: { simbolo: '✨', classe: 'text-holo-1 border-holo-1/50' },
}

// Quem cada elemento vence; o mesmo mapa do Go (rpg_combate_avancado.go).
const VENCE: Record<string, string> = { fogo: 'terra', terra: 'raio', raio: 'agua', agua: 'fogo', luz: 'trevas', trevas: 'luz' }

/** Relação do elemento do atacante sobre o do defensor, igual à do servidor. */
export function relacaoElemental(atacante: string | undefined, defensor: string | undefined): RelacaoElemental {
  if (atacante && VENCE[atacante] && VENCE[atacante] === defensor) return 'vantagem'
  if (defensor && VENCE[defensor] && VENCE[defensor] === atacante) return 'desvantagem'
  return 'neutro'
}

/** Frase da relação de elemento entre você e o monstro, ou vazio quando é neutra. */
export function textoDaRelacao(relacao: string | undefined): string {
  if (relacao === 'vantagem') return 'Vantagem de elemento: você bate 10% mais forte'
  if (relacao === 'desvantagem') return 'Desvantagem de elemento: ele bate 10% mais forte'
  return ''
}

/** Bestiário de um monstro (sql/085): marcos com 10, 50 e 150 vitórias, +10% de Ouro cada. */
export interface BestiarioDoMonstro {
  vitorias: number
  marco: number
  faltam_marco: number
  bonus_ouro: number
  /** Só na resposta da batalha: esta vitória abriu um marco. */
  novo_marco?: boolean
}

/** "12 vitórias · Caçador I · +10% de Ouro · faltam 38". */
export function textoDoBestiario(b: BestiarioDoMonstro | undefined): string {
  if (!b) return ''
  const partes = [b.vitorias === 1 ? '1 vitória' : `${b.vitorias} vitórias`]
  if (b.marco > 0) partes.push(`Caçador ${['', 'I', 'II', 'III'][Math.min(b.marco, 3)]}`, `+${b.bonus_ouro}% de Ouro`)
  partes.push(b.faltam_marco > 0 ? `faltam ${b.faltam_marco} para o próximo marco` : 'todos os marcos')
  return partes.join(' · ')
}

export interface MonstroNaLista extends MonstroRPG {
  poder: number
  dificuldade: Dificuldade
  bestiario?: BestiarioDoMonstro
  elemental?: RelacaoElemental
}

/** Regras de recuperação da Vida, em por mil da Vida máxima (sql/081). */
export interface RegrasVida {
  regen_por_hora: number
  por_episodio: number
  episodios_por_dia: number
  pocao: number
  pousada_horas: number
  /** Poção de Mana (em Mana) e espera da Fonte termal em horas (sql/114). */
  pocao_mana?: number
  fonte_horas?: number
  /** Vida mínima para lutar e Ouro perdido na queda (sql/090). */
  vida_minima_luta?: number
  queda_ouro_pct?: number
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
  /** Poção de Mana e Fonte termal (sql/114); ausentes em servidor antigo. */
  pocao_mana?: number
  fonte?: number
}

export type TipoRecuperacao = 'pousada' | 'pocao' | 'pocao_mana' | 'fonte'

export interface EstadoExpedicoes {
  atributos: AtributosRPG
  /** Elemento do seu personagem. */
  elemento?: string
  vida?: VidaRPG
  custos?: CustosRecuperacao
  hoje: HojeRPG
  monstros: MonstroNaLista[]
}

export interface TurnoBatalha {
  atacante: 'jogador' | 'monstro' | 'ajudante'
  dano: number
  critico: boolean
  vida_jogador: number
  vida_monstro: number
  /** Nome da habilidade usada; ausente é ataque comum. */
  habilidade?: string
  esquiva?: boolean
  cura?: number
  eter?: number
  /** Poder do monstro usado nesta ação. */
  poder?: string
  /** Ajudante atingido pelo jogador, ou o ajudante que atacou. */
  alvo?: string
  /** Ajudante chamado nesta ação. */
  invocado?: string
}

export interface RespostaBatalha {
  monstro: MonstroRPG
  jogador: AtributosRPG
  resultado: {
    venceu: boolean
    rodadas: number
    turnos: TurnoBatalha[]
    vida_inicial?: number
    vida_final?: number
    elemental?: RelacaoElemental
    /** A Vida chegou a zero: a queda custa Ouro (sql/090). */
    caiu?: boolean
  }
  recompensa: { bilhetes: number; ouro?: number; item?: ItemRPG; ouro_perdido?: number }
  vida?: VidaRPG
  bestiario?: BestiarioDoMonstro
  hoje: HojeRPG
}

/** Texto de uma linha do registro da luta e o número ao lado (dano ou cura). */
export function descreverTurno(turno: TurnoBatalha, nomeDoMonstro: string): { texto: string; valor: string } {
  if (turno.atacante === 'ajudante') {
    const quem = turno.alvo ?? 'O ajudante'
    if (turno.esquiva) return { texto: `${quem} ataca, e você esquiva`, valor: '0' }
    return { texto: `${quem} ataca`, valor: `−${turno.dano}` }
  }
  if (turno.atacante === 'monstro') {
    // Nos duelos, o oponente também usa habilidades: cura e despertar aparecem como no jogador.
    if (turno.habilidade && turno.cura) return { texto: `${nomeDoMonstro}: ${turno.habilidade}`, valor: `+${turno.cura}` }
    if (turno.habilidade) {
      if (turno.esquiva) return { texto: `${nomeDoMonstro} usa ${turno.habilidade}, e você esquiva`, valor: '0' }
      return { texto: `${nomeDoMonstro} usa ${turno.habilidade}`, valor: `−${turno.dano}` }
    }
    if (turno.invocado) return { texto: `${nomeDoMonstro} usa ${turno.poder ?? 'um poder'}: chega ${turno.invocado}`, valor: '' }
    if (turno.poder && !turno.dano && !turno.esquiva) return { texto: `${nomeDoMonstro} usa ${turno.poder}`, valor: '' }
    const como = turno.poder ? `${nomeDoMonstro} usa ${turno.poder}` : `${nomeDoMonstro} ataca`
    if (turno.esquiva) return { texto: `${como}, e você esquiva`, valor: '0' }
    if (turno.cura) return { texto: `${como} e recupera ${turno.cura} de Vida`, valor: `−${turno.dano}` }
    return { texto: como, valor: `−${turno.dano}` }
  }
  if (turno.alvo && turno.dano) {
    return { texto: `${turno.habilidade ? `Você usa ${turno.habilidade}` : 'Você golpeia'} em ${turno.alvo}`, valor: `−${turno.dano}` }
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

/** Abaixo da Vida mínima (30%, sql/090), o servidor recusa a batalha: a tela bloqueia antes. */
export function abaixoDaVidaMinima(vida: VidaRPG | undefined, regras?: Pick<RegrasVida, 'vida_minima_luta'>): boolean {
  if (!vida) return false
  const minima = regras?.vida_minima_luta && regras.vida_minima_luta > 0 ? regras.vida_minima_luta : 300
  return vida.perdida_por_mil > 1000 - minima
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
    avisarOuroMudou()
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
    avisarOuroMudou()
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
    avisarOuroMudou()
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

// --- Masmorras (sql/091) ---------------------------------------------------------------

export interface MasmorraNaLista {
  id: string
  nome: string
  descricao: string
  nivel_minimo: number
  andares: string[]
  monstros: MonstroRPG[]
  bloqueada: boolean
  dificuldade: Dificuldade
}

export interface EstadoMasmorras {
  atributos: AtributosRPG
  elemento?: string
  vida: VidaRPG
  hoje: HojeRPG
  /** Id da masmorra feita hoje; vazio quando ainda dá para entrar. */
  feita_hoje: string
  masmorras: MasmorraNaLista[]
}

export interface AndarDaMasmorra {
  monstro: MonstroRPG
  resultado: RespostaBatalha['resultado']
}

export interface RespostaMasmorra {
  masmorra: Omit<MasmorraNaLista, 'monstros' | 'bloqueada' | 'dificuldade'>
  jogador: AtributosRPG
  expedicao: { andares: AndarDaMasmorra[]; completou: boolean; caiu: boolean; vida_final: number }
  recompensa: RespostaBatalha['recompensa']
  vida: VidaRPG
}

export async function obterMasmorras(): Promise<{ dados?: EstadoMasmorras; erro?: string; semPersonagem?: boolean }> {
  try {
    const res = await fetch('/api/rpg/masmorras', { headers: await cabecalhoDeAutenticacao() })
    if (res.status === 404) return { semPersonagem: true }
    const json = (await res.json().catch(() => null)) as (EstadoMasmorras & { error?: string }) | null
    if (!res.ok || !json || !Array.isArray(json.masmorras)) return { erro: json?.error || 'Masmorras indisponíveis no momento.' }
    return { dados: json }
  } catch {
    return { erro: 'Masmorras indisponíveis no momento.' }
  }
}

export async function entrarNaMasmorra(masmorraId: string): Promise<{ dados?: RespostaMasmorra; erro?: string }> {
  const falha = 'Não foi possível entrar na masmorra agora.'
  try {
    const res = await fetch('/api/rpg/masmorras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ masmorra_id: masmorraId }),
    })
    const json = (await res.json().catch(() => null)) as (RespostaMasmorra & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !json.expedicao || !Array.isArray(json.expedicao.andares)) return { erro: falha }
    avisarOuroMudou()
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

// --- Duelos (sql/093) ------------------------------------------------------------------

export interface OponenteDeDuelo {
  handle: string
  nome: string
  personagem_base: string
  elemento: string
  nivel: number
  duelado_hoje: boolean
  pontos: number
}

export interface LinhaRankingDuelo {
  posicao: number
  handle: string
  nome: string
  pontos: number
  vitorias: number
}

export interface EstadoDuelos {
  atributos: AtributosRPG
  elemento: string
  feitos: number
  limite: number
  pontos: number
  tem_perfil: boolean
  oponentes: OponenteDeDuelo[]
  ranking: LinhaRankingDuelo[]
}

export interface RespostaDuelo {
  oponente: OponenteDeDuelo
  jogador: AtributosRPG
  adversario: AtributosRPG
  resultado: RespostaBatalha['resultado']
  pontos_ganhos: number
  ouro_ganho: number
  feitos: number
  limite: number
}

export async function obterDuelos(): Promise<{ dados?: EstadoDuelos; erro?: string; semPersonagem?: boolean }> {
  try {
    const res = await fetch('/api/rpg/duelos', { headers: await cabecalhoDeAutenticacao() })
    if (res.status === 404) return { semPersonagem: true }
    const json = (await res.json().catch(() => null)) as (EstadoDuelos & { error?: string }) | null
    if (!res.ok || !json || !Array.isArray(json.oponentes)) return { erro: json?.error || 'Duelos indisponíveis no momento.' }
    return { dados: json }
  } catch {
    return { erro: 'Duelos indisponíveis no momento.' }
  }
}

export async function duelar(handle: string): Promise<{ dados?: RespostaDuelo; erro?: string }> {
  const falha = 'Não foi possível duelar agora.'
  try {
    const res = await fetch('/api/rpg/duelos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ handle }),
    })
    const json = (await res.json().catch(() => null)) as (RespostaDuelo & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !json.resultado || !Array.isArray(json.resultado.turnos)) return { erro: falha }
    avisarOuroMudou()
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

// --- Expedição de clã (sql/092) ----------------------------------------------------------

export interface ChefeDoCla {
  monstro: MonstroRPG
  vida_maxima: number
  dano: number
  derrotado: boolean
  ouro: number
  bilhetes: number
}

export interface EstadoExpedicaoDoCla {
  tem_cla: boolean
  cla_nome?: string
  cla_tag?: string
  membros: number
  chefe?: ChefeDoCla
  atacou_hoje: boolean
  recebeu: boolean
  ranking: { nome: string; dano: number; ataques: number; sou_eu: boolean }[]
  elemental?: RelacaoElemental
}

export interface RespostaAtaqueDoCla {
  dano: number
  derrubou: boolean
  estado: EstadoExpedicaoDoCla
}

export async function obterExpedicaoDoCla(): Promise<{ dados?: EstadoExpedicaoDoCla; erro?: string; semPersonagem?: boolean }> {
  try {
    const res = await fetch('/api/rpg/cla/expedicao', { headers: await cabecalhoDeAutenticacao() })
    if (res.status === 404) return { semPersonagem: true }
    const json = (await res.json().catch(() => null)) as (EstadoExpedicaoDoCla & { error?: string }) | null
    if (!res.ok || !json || !Array.isArray(json.ranking)) return { erro: json?.error || 'Expedição do clã indisponível no momento.' }
    return { dados: json }
  } catch {
    return { erro: 'Expedição do clã indisponível no momento.' }
  }
}

export async function atacarChefeDoCla(): Promise<{ dados?: RespostaAtaqueDoCla; erro?: string }> {
  const falha = 'Não foi possível atacar agora.'
  try {
    const res = await fetch('/api/rpg/cla/expedicao', { method: 'POST', headers: await cabecalhoDeAutenticacao() })
    const json = (await res.json().catch(() => null)) as (RespostaAtaqueDoCla & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !json.estado) return { erro: falha }
    avisarOuroMudou()
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

// --- Evento da temporada (sql/094) ----------------------------------------------------------

export interface EventoDaTemporada {
  id: string
  estacao: string
  ano: number
  nome: string
  descricao: string
  elemento: string
  titulo: string
  inicio: string
  fim: string
}

export interface EstadoEvento {
  evento: EventoDaTemporada
  monstro: MonstroRPG
  vitorias: number
  meta: number
  lutou_hoje: boolean
  premiado: boolean
  ouro_premio: number
  elemental?: RelacaoElemental
}

export interface RespostaEvento {
  estado: EstadoEvento
  resultado: RespostaBatalha['resultado']
  jogador: AtributosRPG
  premiado_agora: boolean
}

export async function obterEvento(): Promise<{ dados?: EstadoEvento; erro?: string }> {
  try {
    const res = await fetch('/api/rpg/evento', { headers: await cabecalhoDeAutenticacao() })
    const json = (await res.json().catch(() => null)) as (EstadoEvento & { error?: string }) | null
    if (!res.ok || !json || !json.evento) return { erro: json?.error || 'Evento indisponível no momento.' }
    return { dados: json }
  } catch {
    return { erro: 'Evento indisponível no momento.' }
  }
}

export async function lutarNoEvento(): Promise<{ dados?: RespostaEvento; erro?: string }> {
  const falha = 'Não foi possível lutar agora.'
  try {
    const res = await fetch('/api/rpg/evento', { method: 'POST', headers: await cabecalhoDeAutenticacao() })
    const json = (await res.json().catch(() => null)) as (RespostaEvento & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !json.estado || !json.resultado) return { erro: falha }
    avisarOuroMudou()
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}
