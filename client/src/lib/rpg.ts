// client/src/lib/rpg.ts
// Tipos e chamadas das rotas de jogo do personagem (Fase 18): equipamentos e atributos.
//
// Os números de combate (Vida, Ataque, Defesa) são calculados no servidor a partir do nível
// e dos itens equipados. A tela só mostra; nada daqui é enviado de volta como atributo.
import { Footprints, Gem, HandFist, HardHat, Shield, Shirt, Sword, type LucideIcon } from 'lucide-react'
import type { PassivaEspecialidade } from './guilda'
import type { ResultadoDoGrupo } from './grupo'
import { supabase } from './supabase'
import { avisarOuroMudou } from './hud'

export interface HeroiResumoEsquadrao {
  id: string
  nome: string
  classe: string
  elemento: string
  poder: number
  vida: number
  ativo: boolean
  no_grupo: boolean
  pontos?: PrimariosRPG
  pontos_livres?: number
}

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

export type SlotId = 'arma' | 'elmo' | 'armadura' | 'luvas' | 'capa' | 'botas' | 'joia'
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
  /** De 0 a 10 (sql/083); Vida, Ataque, Defesa e Magia já vêm com ele somado. */
  aprimoramento?: number
  /** Índice da cópia (1..quantidade) equipada ou alvo (sql/145). */
  copia?: number
  /** Atributos do sql/121. Chances em milésimos; dano_critico em pontos percentuais. */
  magia?: number
  velocidade?: number
  critico_por_mil?: number
  dano_critico?: number
  esquiva_por_mil?: number
  /** Classes que usam o item: null ou ausente serve a todas; lista vazia, a nenhuma. */
  classes?: string[] | null
  personagem_exclusivo?: string
  conjunto?: string
  elemento?: string
  /** Mínimo de cada primário para o item valer; ausente é sem requisito. */
  requisitos?: Partial<PrimariosRPG>
}

export interface UsoEmOutroHeroi {
  heroi: string
  copia: number
  aprimoramento: number
}

export interface ItemDoInventario extends ItemRPG {
  quantidade: number
  equipado: boolean
  bloqueado: boolean
  /** A classe do personagem não usa este item: aparece, mas não equipa. */
  nao_serve?: boolean
  /** Item do elemento do personagem: rende mais quando em uso. */
  em_sintonia?: boolean
  /** Teto de aprimoramento da raridade. */
  aprimoramento_maximo?: number
  /** Preço em Ouro do próximo nível; 0 quando já está no teto. */
  custo_aprimorar?: number
  /** O atributo que falta para o item valer ("Exige Força 30 (você tem 25)"). */
  falta_requisito?: string
  /** Quantas cópias deste item já estão equipadas em outros heróis do elenco. */
  em_uso_outros?: number
  /** Nomes dos outros heróis que estão vestindo este item. */
  em_uso_por?: string[]
  /** Outros heróis junto do nível individual da cópia que cada um veste. */
  em_uso_detalhes?: UsoEmOutroHeroi[]
  /** Cópia que seria equipada ou aprimorada a partir do herói atual. */
  copia_alvo?: number
  /** Níveis de aprimoramento de todas as cópias (1..quantidade). */
  aprimoramentos?: number[]
}

export interface SlotRPG {
  slot: SlotId
  item?: ItemRPG
  /** O item está no slot mas não soma nada; motivo diz por quê (nível, classe ou atributo). */
  inativo?: boolean
  motivo?: string
}

export interface EcoDoAnime {
  mal_id: number
  titulo: string
  imagem_url?: string
  raridade: string
  nota: number
  genero_principal: string
  nome_efeito: string
  resumo: string
  vida?: number
  ataque?: number
  defesa?: number
  magia?: number
  eter?: number
  velocidade?: number
  critico_por_mil?: number
  esquiva_por_mil?: number
  sorte_item?: number
}

export interface EstadoEquipamento {
  personagem_base?: string
  classe?: string
  nivel: number
  base: AtributosRPG
  atributos: AtributosRPG
  slots: SlotRPG[]
  inventario: ItemDoInventario[]
  primarios_base?: PrimariosRPG
  pontos?: PrimariosRPG
  pontos_por_heroi?: Record<string, PrimariosRPG>
  pontos_disponiveis?: number
  habilidades?: HabilidadeRPG[]
  /** Ouro disponível para aprimorar. */
  ouro?: number
  /** Conjuntos com ao menos uma peça em uso. */
  conjuntos?: ConjuntoEmUso[]
  /** Sintonia elemental: elemento do personagem, peças em uso dele e se a Ressonância vale. */
  elemento?: string
  pecas_em_sintonia?: number
  ressonancia?: boolean
  /** Efeito de status que os golpes do herói podem deixar (vem do elemento). */
  efeito_do_elemento?: EfeitoDeElemento
  /** Carta Foil equipada como Eco do Anime (sql/137). */
  eco?: EcoDoAnime
}

/** Regras da sintonia, iguais às do Go (rpg_sintonia.go), para a tela explicar. */
export const SINTONIA = { bonusPct: 15, pecasRessonancia: 4, ressonanciaPct: 5 } as const

export interface ConjuntoEmUso {
  id: string
  nome: string
  pecas: number
  bonus_2: string
  bonus_4?: string
  bonus_6?: string
  ativo_2: boolean
  ativo_4: boolean
  ativo_6?: boolean
}

/** Nome de cada classe, para o aviso de quem usa o item. Repete as classes de PersonagensBase (Go). */
export const ROTULO_DA_CLASSE: Record<string, string> = {
  espadachim: 'Espadachim',
  lanceiro: 'Lanceiro',
  assassina: 'Assassina',
  maga: 'Maga',
  guerreiro: 'Guerreiro',
  paladina: 'Paladina',
  arqueiro: 'Arqueiro',
}

/** "Espadachim e Paladina", ou vazio quando o item serve a todos. */
export function textoDasClasses(item: Pick<ItemRPG, 'classes'>): string {
  if (!item.classes || item.classes.length === 0) return ''
  const nomes = item.classes.map((c) => ROTULO_DA_CLASSE[c] ?? c)
  return nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
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

/** "Força 30 e Destreza 20": os requisitos de um item, na ordem da tela. */
export function textoDosRequisitos(req: Partial<PrimariosRPG> | undefined): string {
  if (!req) return ''
  return PRIMARIOS_RPG.filter(({ id }) => (req[id] ?? 0) > 0)
    .map(({ id, rotulo }) => `${rotulo} ${req[id]}`)
    .join(' e ')
}

function cumpre(req: Partial<PrimariosRPG>, tem: PrimariosRPG): boolean {
  return PRIMARIOS_RPG.every(({ id }) => (tem[id] ?? 0) >= (req[id] ?? 0))
}

/**
 * Itens equipados que mudam de estado se a distribuição de pontos virar o rascunho: os que
 * deixam de cumprir o requisito de atributo e os que voltam a cumprir. A conta é a mesma do
 * servidor (base do nível mais os pontos contra o requisito do item).
 */
export function itensAfetadosPelosPontos(
  estado: EstadoEquipamento,
  rascunho: PrimariosRPG,
): { desativam: { nome: string; requisito: string }[]; reativam: string[] } {
  const base = estado.primarios_base ?? PRIMARIOS_ZERADOS
  const salvos = estado.pontos ?? PRIMARIOS_ZERADOS
  const total = (p: PrimariosRPG): PrimariosRPG =>
    Object.fromEntries(PRIMARIOS_RPG.map(({ id }) => [id, (base[id] ?? 0) + (p[id] ?? 0)])) as unknown as PrimariosRPG
  const antes = total(salvos)
  const depois = total(rascunho)
  const desativam: { nome: string; requisito: string }[] = []
  const reativam: string[] = []
  for (const { item } of estado.slots) {
    if (!item?.requisitos) continue
    const cumpriaAntes = cumpre(item.requisitos, antes)
    const cumpreDepois = cumpre(item.requisitos, depois)
    if (cumpriaAntes && !cumpreDepois) desativam.push({ nome: item.nome, requisito: textoDosRequisitos(item.requisitos) })
    if (!cumpriaAntes && cumpreDepois) reativam.push(item.nome)
  }
  return { desativam, reativam }
}

export const PRIMARIOS_ZERADOS: PrimariosRPG = { forca: 0, inteligencia: 0, constituicao: 0, agilidade: 0, destreza: 0, sorte: 0 }

export interface RecomendacaoClasse {
  classe: string
  titulo: string
  arquetipo: string
  principais: PrimarioId[]
  secundarios: PrimarioId[]
  resumoForca: string
  dicaEquipamento: string
  pesos: PrimariosRPG
}

export const RECOMENDACOES_CLASSE: Record<string, RecomendacaoClasse> = {
  espadachim: {
    classe: 'espadachim',
    titulo: 'Espadachim',
    arquetipo: 'Duelista Equilibrado',
    principais: ['forca', 'destreza'],
    secundarios: ['constituicao', 'agilidade'],
    resumoForca: 'Força escala todo corte básico e habilidade de espada; Destreza empurra Crítico (+0,7%/pt) para estourar chefes em poucas rodadas.',
    dicaEquipamento: 'Priorize espadas de Éter com Ataque + Crítico, conjuntos de 6 peças e Carta Foil equipável no slot de Eco.',
    pesos: { forca: 5, destreza: 3, constituicao: 2, agilidade: 1, inteligencia: 0, sorte: 0 },
  },
  lanceiro: {
    classe: 'lanceiro',
    titulo: 'Lanceiro',
    arquetipo: 'Impacto e Iniciativa',
    principais: ['forca', 'agilidade'],
    secundarios: ['destreza', 'constituicao'],
    resumoForca: 'Lanças exigem golpes físicos fortes antes do monstro reagir: Força garante dano bruto e Agilidade dá velocidade para abrir a rodada.',
    dicaEquipamento: 'Use lanças de Fogo em sintonia (mínimo 4 peças de Fogo) para aplicar Queimadura contínua.',
    pesos: { forca: 5, agilidade: 3, destreza: 2, constituicao: 1, inteligencia: 0, sorte: 0 },
  },
  assassina: {
    classe: 'assassina',
    titulo: 'Assassina',
    arquetipo: 'Velocidade e Crítico Letal',
    principais: ['destreza', 'agilidade'],
    secundarios: ['forca', 'sorte'],
    resumoForca: 'Cada ponto em Destreza e Agilidade rende +0,7% de Crítico e Esquiva (até 50% / 35%). Ataques críticos multiplicam a rajada elétrica.',
    dicaEquipamento: 'Busque peças de Raio com Dano Crítico e Velocidade; em esquadrão, combine Raio + Água ou Fogo para Reações.',
    pesos: { destreza: 4, agilidade: 4, forca: 3, constituicao: 0, inteligencia: 0, sorte: 0 },
  },
  maga: {
    classe: 'maga',
    titulo: 'Maga',
    arquetipo: 'Conjuradora Elemental',
    principais: ['inteligencia', 'destreza'],
    secundarios: ['agilidade', 'constituicao'],
    resumoForca: 'Inteligência multiplica o dano das magias e amplia o Éter máximo para lançar feitiços seguidos sem ficar sem energia.',
    dicaEquipamento: 'Cajados com Magia + Éter alto e peças de Água em sintonia ativam Congelamento e reações de Vapor/Sobrecarga.',
    pesos: { inteligencia: 6, destreza: 2, agilidade: 2, constituicao: 1, forca: 0, sorte: 0 },
  },
  guerreiro: {
    classe: 'guerreiro',
    titulo: 'Guerreiro',
    arquetipo: 'Colosso Blindado',
    principais: ['constituicao', 'forca'],
    secundarios: ['agilidade', 'destreza'],
    resumoForca: 'Constituição transforma cada nível em muralha de Vida (+10 HP/pt) e Defesa, enquanto Força faz os golpes de machado punirem o alvo.',
    dicaEquipamento: 'Machados pesados e armaduras de Terra garantem resistência em Masmorras Roguelite e seguram fúria de chefes.',
    pesos: { constituicao: 5, forca: 4, destreza: 1, agilidade: 1, inteligencia: 0, sorte: 0 },
  },
  paladina: {
    classe: 'paladina',
    titulo: 'Paladina',
    arquetipo: 'Bastião Sagrado',
    principais: ['constituicao', 'inteligencia'],
    secundarios: ['forca', 'agilidade'],
    resumoForca: 'Constituição sustenta o esquadrão vivo por mais rodadas e Inteligência alimenta o Éter das bênçãos, curas e golpes de Luz.',
    dicaEquipamento: 'Peças de Luz em sintonia ativam Ofuscamento (reduz acerto do inimigo) e multiplicam cura + Defesa.',
    pesos: { constituicao: 4, inteligencia: 4, forca: 2, agilidade: 1, destreza: 0, sorte: 0 },
  },
  arqueiro: {
    classe: 'arqueiro',
    titulo: 'Arqueiro',
    arquetipo: 'Precisão das Sombras',
    principais: ['destreza', 'forca'],
    secundarios: ['agilidade', 'constituicao'],
    resumoForca: 'Arqueiros dependem de acertos críticos precisos somados a Ataque consistente para perfurar traços Voadores e inimigos ágeis.',
    dicaEquipamento: 'Conjunto Caçador Violeta / Arcos de Trevas elevam Crítico e aplicam Dreno de Éter contínuo.',
    pesos: { destreza: 4, forca: 4, agilidade: 2, constituicao: 1, inteligencia: 0, sorte: 0 },
  },
}

export function recomendacaoDaClasse(classe?: string): RecomendacaoClasse {
  const chave = (classe ?? '').trim().toLowerCase()
  return RECOMENDACOES_CLASSE[chave] ?? RECOMENDACOES_CLASSE.espadachim
}

export function gerarBuildRecomendada(classe: string | undefined, totalPontos: number): PrimariosRPG {
  const rec = recomendacaoDaClasse(classe)
  const resultado: PrimariosRPG = { ...PRIMARIOS_ZERADOS }
  if (totalPontos <= 0) return resultado
  const ordem: PrimarioId[] = ['forca', 'inteligencia', 'constituicao', 'agilidade', 'destreza', 'sorte']
  const somaPesos = ordem.reduce((acc, id) => acc + rec.pesos[id], 0)
  if (somaPesos <= 0) return resultado

  let usados = 0
  for (const id of ordem) {
    if (rec.pesos[id] <= 0) continue
    const qtd = Math.floor((totalPontos * rec.pesos[id]) / somaPesos)
    resultado[id] = qtd
    usados += qtd
  }
  let idx = 0
  const prioridades = [...rec.principais, ...rec.secundarios]
  while (usados < totalPontos && prioridades.length > 0) {
    const id = prioridades[idx % prioridades.length]
    resultado[id] += 1
    usados += 1
    idx += 1
  }
  return resultado
}

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
  { id: 'elmo', rotulo: 'Elmo', Icone: HardHat },
  { id: 'armadura', rotulo: 'Armadura', Icone: Shield },
  { id: 'luvas', rotulo: 'Luvas', Icone: HandFist },
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
export function resumoDoItem(
  item: Pick<ItemRPG, 'vida' | 'ataque' | 'defesa'> &
    Partial<Pick<ItemRPG, 'magia' | 'velocidade' | 'critico_por_mil' | 'dano_critico' | 'esquiva_por_mil'>>,
): string {
  const partes: string[] = []
  if (item.vida > 0) partes.push(`+${item.vida} Vida`)
  if (item.ataque > 0) partes.push(`+${item.ataque} Ataque`)
  if (item.defesa > 0) partes.push(`+${item.defesa} Defesa`)
  if ((item.magia ?? 0) > 0) partes.push(`+${item.magia} Magia`)
  if ((item.velocidade ?? 0) > 0) partes.push(`+${item.velocidade} Velocidade`)
  if ((item.critico_por_mil ?? 0) > 0) partes.push(`+${porMilEmPorcento(item.critico_por_mil)} Crítico`)
  if ((item.dano_critico ?? 0) > 0) partes.push(`+${item.dano_critico}% Dano Crítico`)
  if ((item.esquiva_por_mil ?? 0) > 0) partes.push(`+${porMilEmPorcento(item.esquiva_por_mil)} Esquiva`)
  return partes.length ? partes.join(' · ') : 'Sem atributos'
}

/**
 * Diferença de atributos ao trocar o item do slot pelo candidato. Positivo é ganho.
 * Item bloqueado pelo nível ou de outra classe não soma, então a troca para ele mostra só a perda.
 */
export function diferencaDaTroca(
  atual: Pick<ItemRPG, 'vida' | 'ataque' | 'defesa' | 'magia' | 'velocidade'> | undefined,
  candidato: Pick<ItemDoInventario, 'vida' | 'ataque' | 'defesa' | 'magia' | 'velocidade' | 'bloqueado' | 'nao_serve'>,
): { vida: number; ataque: number; defesa: number; magia: number; velocidade: number } {
  const soma = candidato.bloqueado || candidato.nao_serve ? undefined : candidato
  return {
    vida: (soma?.vida ?? 0) - (atual?.vida ?? 0),
    ataque: (soma?.ataque ?? 0) - (atual?.ataque ?? 0),
    defesa: (soma?.defesa ?? 0) - (atual?.defesa ?? 0),
    magia: (soma?.magia ?? 0) - (atual?.magia ?? 0),
    velocidade: (soma?.velocidade ?? 0) - (atual?.velocidade ?? 0),
  }
}

export async function cabecalhoDeAutenticacao(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

const FALHA_DOS_PONTOS = 'Não foi possível salvar os pontos agora.'

/** Grava a distribuição inteira dos pontos do herói ativo ou informado. */
export async function distribuirPontos(
  pontos: PrimariosRPG,
  personagemBase?: string,
): Promise<{ dados?: EstadoEquipamento; erro?: string }> {
  try {
    const corpo = personagemBase ? { ...pontos, personagem_base: personagemBase } : pontos
    const res = await fetch('/api/personagem/atributos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify(corpo),
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
  copia?: number,
): Promise<{ dados?: EstadoEquipamento; erro?: string }> {
  const falha = 'Não foi possível trocar o equipamento agora.'
  try {
    const res = await fetch('/api/personagem/equipamentos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ slot, item_id: itemId, ...(copia && copia > 0 ? { copia } : {}) }),
    })
    const json = (await res.json().catch(() => null)) as (EstadoEquipamento & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !Array.isArray(json.slots)) return { erro: falha }
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

/** Sobe um nível do item (ou da cópia específica). O preço é do servidor; a tela só o mostra. */
export async function aprimorarItem(itemId: string, copia?: number): Promise<{ dados?: EstadoEquipamento; erro?: string }> {
  const falha = 'Não foi possível aprimorar agora.'
  try {
    const res = await fetch('/api/rpg/aprimorar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ item_id: itemId, ...(copia && copia > 0 ? { copia } : {}) }),
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

export async function obterEcosDoAnime(): Promise<{
  dados?: { eco_mal_id: number; eco_ativo?: EcoDoAnime; cartas: EcoDoAnime[] }
  erro?: string
}> {
  const falha = 'Não foi possível carregar suas Cartas Foil agora.'
  try {
    const res = await fetch('/api/personagem/ecos', { headers: await cabecalhoDeAutenticacao() })
    const json = (await res.json().catch(() => null)) as
      | { eco_mal_id?: number; eco_ativo?: EcoDoAnime; cartas?: EcoDoAnime[]; error?: string }
      | null
    if (!res.ok || !json || !Array.isArray(json.cartas)) return { erro: json?.error || falha }
    return { dados: { eco_mal_id: json.eco_mal_id ?? 0, eco_ativo: json.eco_ativo, cartas: json.cartas } }
  } catch {
    return { erro: falha }
  }
}

export async function equiparEcoDoAnime(malId: number): Promise<{ dados?: EstadoEquipamento; erro?: string }> {
  const falha = 'Não foi possível equipar este Eco agora.'
  try {
    const res = await fetch('/api/personagem/eco', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ mal_id: malId }),
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

/** Efeito de status de um elemento (rpg_efeitos.go). */
export interface EfeitoDeElemento {
  id: string
  nome: string
  descricao: string
}

/** Traço do corpo do monstro (rpg_tracos.go); fator_classe é o multiplicador do seu dano. */
export interface TracoMonstro {
  id: string
  nome: string
  descricao: string
  fator_classe?: number
}

export interface MonstroRPG {
  /** Efeito de status que os golpes do monstro podem deixar. */
  efeito?: EfeitoDeElemento
  /** Traços que favorecem ou atrapalham classes. */
  tracos?: TracoMonstro[]
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
  /** Elemento, poderes e atributos complementares vêm do servidor (rpg_combate_avancado.go). */
  magia?: number
  eter?: number
  velocidade?: number
  critico_por_mil?: number
  dano_critico?: number
  esquiva_por_mil?: number
  elemento?: string
  comportamento?: string
  regiao?: string
  regiao_nome?: string
  habitat?: string
  familia?: string
  estagio?: number
  evolui_de?: string
  evolui_para?: string[]
  poderes?: PoderDoMonstro[]
}

export interface PoderDoMonstro {
  id: string
  nome: string
  descricao: string
  tipo: 'golpe' | 'drenar' | 'escudo' | 'furia' | 'invocar'
  arcano?: boolean
  custo_eter?: number
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

/** O elemento que vence o indicado (a fraqueza dele), ou vazio quando nenhum vence. */
export function elementoQueVence(elemento: string | undefined): string {
  if (!elemento) return ''
  return Object.keys(VENCE).find((atacante) => VENCE[atacante] === elemento) ?? ''
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
  dica_tatica?: string
  em_destaque?: boolean
}

export interface RegiaoMapa {
  id: string
  nome: string
  subtitulo: string
  bioma: string
  efeito_bioma: string
  faixa_nivel: string
  ordem: number
  x?: number
  y?: number
  conexoes?: string[]
  monstros: string[]
  em_destaque?: boolean
  bonus_destaque?: string
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

export interface PortalMapaVivo {
  id: string
  regiao_id: string
  regiao_nome: string
  titulo: string
  descricao: string
  bonus_descricao: string
  termina_em: string
  minutos_restantes: number
}

export interface SeloDesafio {
  id: string
  nome: string
  risco: string
  recompensa: string
}

export interface EstadoExpedicoes {
  atributos: AtributosRPG
  /** Elemento do seu personagem. */
  elemento?: string
  /** Classe do seu personagem. */
  classe?: string
  /** Efeito de status que os golpes do seu herói podem deixar. */
  efeito_do_elemento?: EfeitoDeElemento
  vida?: VidaRPG
  custos?: CustosRecuperacao
  hoje: HojeRPG
  monstros: MonstroNaLista[]
  regioes?: RegiaoMapa[]
  regiao_destaque?: string
  /** Mana de cada luta (sql/118); ausente em servidor antigo. */
  custos_mana?: CustosManaRPG
  passiva?: PassivaEspecialidade
  elenco?: HeroiResumoEsquadrao[]
  portal_vivo?: PortalMapaVivo
  selos_catalogo?: SeloDesafio[]
}

export function regioesDoMapa(estado: Pick<EstadoExpedicoes, 'regioes' | 'monstros'>): RegiaoMapa[] {
  if (estado.regioes && estado.regioes.length > 0) return estado.regioes
  const ids = new Set(estado.monstros.map((m) => m.id))
  const padrao: RegiaoMapa[] = [
    {
      id: 'clareira_inicial',
      nome: 'Clareira Inicial',
      subtitulo: 'Primeiros passos na fronteira',
      bioma: 'Brisa de Éter',
      efeito_bioma: 'Campo aberto onde formas iniciais de slimes, fungos e insetos despertam.',
      faixa_nivel: 'Nv 1–8',
      ordem: 1,
      x: 28,
      y: 75,
      conexoes: ['bosque_sombrio', 'forja_vulcanica'],
      monstros: ['slime_de_eter', 'slime_espinhoso', 'cogumelo_esporifero', 'goblin_batedor', 'vespa_eletrica', 'golem_musgoso'].filter((id) => ids.has(id)),
    },
    {
      id: 'bosque_sombrio',
      nome: 'Bosque Sombrio',
      subtitulo: 'Trilhas fechadas e raízes rúnicas',
      bioma: 'Névoa Espessa',
      efeito_bioma: 'Feras velozes, esporos evoluídos e guardiões antigos protegem a mata.',
      faixa_nivel: 'Nv 10–25',
      ordem: 2,
      x: 19,
      y: 47,
      conexoes: ['clareira_inicial', 'mares_e_geada', 'ruinas_do_vazio'],
      monstros: [
        'lobo_sombrio', 'arvore_de_esporos', 'slime_de_cranios', 'planta_carnivora', 'druida_da_floresta',
        'centopeia_toxica', 'golem_de_runas', 'ent_apodrecido', 'alquimista_da_praga', 'wyvern_esmeralda',
      ].filter((id) => ids.has(id)),
    },
    {
      id: 'forja_vulcanica',
      nome: 'Fendas Vulcânicas',
      subtitulo: 'Rios de lava e rocha viva',
      bioma: 'Cinzas Incandescentes',
      efeito_bioma: 'Feras de magma e a Fênix Solar dominam as crateras ferventes.',
      faixa_nivel: 'Nv 14–42',
      ordem: 3,
      x: 63,
      y: 75,
      conexoes: ['clareira_inicial', 'ruinas_do_vazio', 'cume_ancestral'],
      monstros: ['javali_vulcanico', 'aranha_rubra', 'cao_de_magma', 'fera_de_obsidiana', 'golem_de_magma', 'beemote_de_lava', 'fenix_solar'].filter((id) => ids.has(id)),
    },
    {
      id: 'mares_e_geada',
      nome: 'Picos Glaciais',
      subtitulo: 'Marés congeladas e geleiras',
      bioma: 'Ventos Cortantes',
      efeito_bioma: 'Serpentes marinhas evoluem ao lado de colossos e cavaleiros de gelo.',
      faixa_nivel: 'Nv 17–46',
      ordem: 4,
      x: 35,
      y: 22,
      conexoes: ['bosque_sombrio', 'santuario_astral'],
      monstros: [
        'serpente_marinha', 'revena_glacial', 'grifo_glacial', 'aranha_glacial', 'golem_de_gelo', 'yeti_glacial',
        'leviata_relampago', 'cavaleiro_da_geada', 'colosso_glacial', 'dragao_glacial', 'lorde_da_geada',
      ].filter((id) => ids.has(id)),
    },
    {
      id: 'ruinas_do_vazio',
      nome: 'Ruínas do Vazio',
      subtitulo: 'Salões de um reino esquecido',
      bioma: 'Ecos Arcanos',
      efeito_bioma: 'Energia instável desperta espectros, olhos orbitais e colossos rúnicos.',
      faixa_nivel: 'Nv 16–41',
      ordem: 5,
      x: 50,
      y: 49,
      conexoes: ['bosque_sombrio', 'forja_vulcanica', 'santuario_astral', 'cume_ancestral'],
      monstros: [
        'espectro_acorrentado', 'fragmento_do_olho', 'fantasma_do_vazio', 'lobo_abissal', 'golem_flutuante',
        'espectro_do_vazio', 'beemote_fungico', 'ceifador_sombrio', 'vortex_do_olho', 'slime_do_vazio',
        'cavaleiro_caido', 'ceifador_espectral', 'colosso_runico', 'golem_do_vazio',
      ].filter((id) => ids.has(id)),
    },
    {
      id: 'santuario_astral',
      nome: 'Santuário Astral',
      subtitulo: 'Onde luz e abismo se cruzam',
      bioma: 'Fronteira Astral',
      efeito_bioma: 'Serafins celestiais, Reis Lich e o Kraken disputam a ascensão final.',
      faixa_nivel: 'Nv 42–54',
      ordem: 6,
      x: 69,
      y: 21,
      conexoes: ['mares_e_geada', 'ruinas_do_vazio', 'cume_ancestral'],
      monstros: [
        'beholder_abissal', 'lich_das_sombras', 'dragao_esqueleto', 'grifo_dourado', 'serpente_espectral',
        'rei_lich', 'draconato_do_trovao', 'serafim_celestial', 'kraken_abissal',
      ].filter((id) => ids.has(id)),
    },
    {
      id: 'cume_ancestral',
      nome: 'Cume Ancestral',
      subtitulo: 'Altar das tempestades primordiais',
      bioma: 'Tempestade Etérea',
      efeito_bioma: 'Os soberanos finais concentram Éter puro, luz sagrada e fome dimensional.',
      faixa_nivel: 'Nv 48–60+',
      ordem: 7,
      x: 88,
      y: 50,
      conexoes: ['forja_vulcanica', 'ruinas_do_vazio', 'santuario_astral'],
      monstros: [
        'dragao_tempestade', 'dragao_de_eter', 'dragao_do_vazio', 'senhor_infernal',
        'arcanjo_blindado', 'horror_da_fenda', 'primordial_esquecido',
      ].filter((id) => ids.has(id)),
    },
  ].filter((r) => r.monstros.length > 0)

  if (padrao.length > 0) return padrao
  return [
    {
      id: 'rota_expedicoes',
      nome: 'Fronteira de Éter',
      subtitulo: 'Território de exploração',
      bioma: 'Campo Aberto',
      efeito_bioma: 'Região padrão quando o mapa detalhado não foi enviado.',
      faixa_nivel: 'Todos os níveis',
      ordem: 1,
      x: 50,
      y: 50,
      monstros: estado.monstros.map((m) => m.id),
    },
  ]
}

export interface CustosManaRPG {
  expedicao: number
  duelo: number
  chefe_do_cla: number
  masmorra: number
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
  /** Luta em grupo: posição (a partir de 1) do herói que agiu ou foi atingido. */
  heroi?: number
  /** Efeito de status que o golpe deixou no alvo ("Queimadura"). */
  efeito?: string
  /** Dano dos efeitos no fim da rodada; atacante é quem os aplicou. */
  tique?: string
  /** O efeito que fez o atacante perder a ação. */
  perdeu_vez?: string
  /** O golpe do atacante se perdeu por Ofuscamento. */
  errou?: boolean
  /** Reação elemental disparada neste golpe (rpg_reacoes.go). */
  reacao?: string
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
  recompensa: { bilhetes: number; ouro?: number; item?: ItemRPG; ouro_perdido?: number; materiais?: Record<string, number> }
  vida?: VidaRPG
  bestiario?: BestiarioDoMonstro
  hoje: HojeRPG
  passiva?: PassivaEspecialidade
  grupo_resultado?: ResultadoDoGrupo
  selos_ativos?: string[]
  portal_ativo?: boolean
}

/** Texto de uma linha do registro da luta e o número ao lado (dano ou cura). */
export function descreverTurno(turno: TurnoBatalha, nomeDoMonstro: string): { texto: string; valor: string } {
  const doHeroi = turno.atacante === 'jogador'
  if (turno.perdeu_vez) {
    return { texto: doHeroi ? `Você está sob ${turno.perdeu_vez} e perde a vez` : `${nomeDoMonstro} está sob ${turno.perdeu_vez} e perde a vez`, valor: '' }
  }
  if (turno.tique) {
    return { texto: doHeroi ? `${nomeDoMonstro} sofre ${turno.tique}` : `Você sofre ${turno.tique}`, valor: `−${turno.dano}` }
  }
  if (turno.errou) {
    const quem = doHeroi ? (turno.habilidade ? `Você usa ${turno.habilidade}` : 'Você golpeia') : `${nomeDoMonstro} ${turno.poder ? `usa ${turno.poder}` : 'ataca'}`
    return { texto: `${quem}, mas erra (Ofuscamento)`, valor: '0' }
  }
  const base = descreverGolpe(turno, nomeDoMonstro)
  let texto = turno.efeito ? `${base.texto} e causa ${turno.efeito}` : base.texto
  if (turno.reacao) texto = `${texto} · ⚡ ${turno.reacao}`
  return { texto, valor: base.valor }
}

function descreverGolpe(turno: TurnoBatalha, nomeDoMonstro: string): { texto: string; valor: string } {
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
  if (turno.esquiva) {
    return { texto: `${turno.habilidade ? `Você usa ${turno.habilidade}` : 'Você golpeia'}, e ${nomeDoMonstro} esquiva`, valor: '0' }
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

export async function batalhar(
  monstroId: string,
  postura?: string,
  esquadrao?: string[],
  selos?: string[],
): Promise<{ dados?: RespostaBatalha; erro?: string }> {
  const falha = 'Não foi possível batalhar agora.'
  try {
    const payload: Record<string, unknown> = { monstro_id: monstroId, postura }
    if (esquadrao && esquadrao.length > 0) payload.esquadrao = esquadrao
    if (selos && selos.length > 0) payload.selos = selos
    const res = await fetch('/api/rpg/batalhas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify(payload),
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
  custos_mana?: CustosManaRPG
  elenco?: HeroiResumoEsquadrao[]
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
  grupo_resultado?: ResultadoDoGrupo
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

export async function entrarNaMasmorra(masmorraId: string, esquadrao?: string[]): Promise<{ dados?: RespostaMasmorra; erro?: string }> {
  const falha = 'Não foi possível entrar na masmorra agora.'
  try {
    const payload = esquadrao && esquadrao.length > 0 ? { masmorra_id: masmorraId, esquadrao } : { masmorra_id: masmorraId }
    const res = await fetch('/api/rpg/masmorras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify(payload),
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

// --- Masmorra Estilo Roguelite (sql/138) -------------------------------------------------

export interface BencaoRoguelite {
  id: string
  nome: string
  descricao: string
  categoria: string
  raridade: string
}

export interface AltarRoguelite {
  id: string
  nome: string
  descricao: string
  custo: string
  recompensa: string
}

export interface HeroiRogueliteHP {
  base: string
  nome: string
  nivel: number
  elemento: string
  vida_atual: number
  vida_maxima: number
}

export interface SessaoRoguelite {
  masmorra: Omit<MasmorraNaLista, 'monstros' | 'bloqueada' | 'dificuldade'>
  monstros: MonstroRPG[]
  esquadrao: string[]
  andar_atual: number
  total_andares: number
  herois: HeroiRogueliteHP[]
  bencaos_ativas: BencaoRoguelite[]
  escolhas_bencao: BencaoRoguelite[]
  altar_ativo?: AltarRoguelite
  vencidos: string[]
  ouro_bonus_pct: number
  pode_avancar: boolean
  pode_recuar: boolean
}

export interface RespostaRoguelite {
  ativo: boolean
  finalizada: boolean
  status: 'nenhuma' | 'ativa' | 'vitoria' | 'recuou' | 'derrota'
  sessao?: SessaoRoguelite
  ultimo_andar?: AndarDaMasmorra
  grupo_andar?: ResultadoDoGrupo
  recompensa?: RespostaBatalha['recompensa']
  vida?: VidaRPG
  evento_texto?: string
}

export async function obterEstadoRoguelite(): Promise<{ dados?: RespostaRoguelite; erro?: string }> {
  try {
    const res = await fetch('/api/rpg/masmorras/roguelite', { headers: await cabecalhoDeAutenticacao() })
    const json = (await res.json().catch(() => null)) as (RespostaRoguelite & { error?: string }) | null
    if (!res.ok || !json) return { erro: json?.error || 'Não foi possível verificar a incursão atual.' }
    return { dados: json }
  } catch {
    return { erro: 'Não foi possível verificar a incursão atual.' }
  }
}

export async function iniciarRoguelite(
  masmorraId: string,
  esquadrao?: string[],
): Promise<{ dados?: RespostaRoguelite; erro?: string }> {
  const falha = 'Não foi possível iniciar a incursão Roguelite agora.'
  try {
    const payload = esquadrao && esquadrao.length > 0 ? { masmorra_id: masmorraId, esquadrao } : { masmorra_id: masmorraId }
    const res = await fetch('/api/rpg/masmorras/roguelite/iniciar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify(payload),
    })
    const json = (await res.json().catch(() => null)) as (RespostaRoguelite & { error?: string }) | null
    if (!res.ok || !json) return { erro: json?.error || falha }
    if (json.finalizada) avisarOuroMudou()
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

export async function agirRoguelite(
  acao: 'bencao' | 'altar' | 'avancar' | 'recuar',
  escolha?: string,
): Promise<{ dados?: RespostaRoguelite; erro?: string }> {
  const falha = 'Não foi possível executar a ação na incursão agora.'
  try {
    const res = await fetch('/api/rpg/masmorras/roguelite/agir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify(escolha ? { acao, escolha } : { acao }),
    })
    const json = (await res.json().catch(() => null)) as (RespostaRoguelite & { error?: string }) | null
    if (!res.ok || !json) return { erro: json?.error || falha }
    if (json.finalizada) avisarOuroMudou()
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

// --- Combate Interativo (#333) ---------------------------------------------------------

export interface IntencaoInimigo {
  tipo: string
  titulo: string
  descricao: string
  dano_estimado: number
  dica: string
}

export interface HeroiCombateInterativo {
  base: string
  nome: string
  elemento: string
  vida_atual: number
  vida_maxima: number
  eter_atual: number
  eter_maximo: number
}

export interface EstadoCombateInterativo {
  sessao_id: string
  modo: 'expedicao' | 'masmorra' | 'duelo'
  alvo_nome: string
  alvo_elemento: string
  alvo_nivel: number
  andar_atual?: number
  total_andares?: number
  rodada: number
  herois: HeroiCombateInterativo[]
  inimigo_vida: number
  inimigo_vida_max: number
  aura_elemental?: string
  intencao: IntencaoInimigo
  ultimos_turnos?: TurnoBatalha[]
  encerrado: boolean
  venceu: boolean
  caiu: boolean
  evento?: string
  recompensa?: RespostaBatalha['recompensa']
  pontos_duelo?: number
  ouro_duelo?: number
  vida?: VidaRPG
}

export async function iniciarCombateInterativo(
  modo: 'expedicao' | 'masmorra' | 'duelo',
  alvoId: string,
  esquadrao?: string[],
): Promise<{ dados?: EstadoCombateInterativo; erro?: string }> {
  const falha = 'Não foi possível iniciar o combate tático agora.'
  try {
    const payload =
      esquadrao && esquadrao.length > 0 ? { modo, alvo_id: alvoId, esquadrao } : { modo, alvo_id: alvoId }
    const res = await fetch('/api/rpg/combate-interativo/iniciar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify(payload),
    })
    const json = (await res.json().catch(() => null)) as (EstadoCombateInterativo & { error?: string }) | null
    if (!res.ok || !json || !json.sessao_id) return { erro: json?.error || falha }
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

export async function agirCombateInterativo(
  sessaoId: string,
  acao: 'golpe' | 'defender' | 'ruptura',
): Promise<{ dados?: EstadoCombateInterativo; erro?: string }> {
  const falha = 'Não foi possível executar a ação nesta rodada.'
  try {
    const res = await fetch('/api/rpg/combate-interativo/agir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ sessao_id: sessaoId, acao }),
    })
    const json = (await res.json().catch(() => null)) as (EstadoCombateInterativo & { error?: string }) | null
    if (!res.ok || !json) return { erro: json?.error || falha }
    if (json.encerrado) avisarOuroMudou()
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

export async function lutarNoEvento(postura?: string): Promise<{ dados?: RespostaEvento; erro?: string }> {
  const falha = 'Não foi possível lutar agora.'
  try {
    const res = await fetch('/api/rpg/evento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ postura }),
    })
    const json = (await res.json().catch(() => null)) as (RespostaEvento & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !json.estado || !json.resultado) return { erro: falha }
    avisarOuroMudou()
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

// --- Contratos semanais de caça (sql/125) -------------------------------------------------

export interface ContratoSemanal {
  id: string
  titulo: string
  descricao: string
  regiao?: string
  regiao_nome?: string
  progresso: number
  meta: number
  ouro: number
  bilhetes: number
  materiais?: Record<string, number>
  concluido: boolean
  resgatado: boolean
}

export interface RespostaContratosRPG {
  semana: string
  expira_em: string
  contratos: ContratoSemanal[]
}

export interface RespostaResgatarContrato {
  contrato_id: string
  ouro_ganho: number
  bilhetes_ganhos: number
  materiais?: Record<string, number>
  ouro: number
  bilhetes: number
  estado: RespostaContratosRPG
}

export async function obterContratosSemanais(): Promise<{ dados?: RespostaContratosRPG; erro?: string }> {
  try {
    const res = await fetch('/api/rpg/contratos', { headers: await cabecalhoDeAutenticacao() })
    const json = (await res.json().catch(() => null)) as (RespostaContratosRPG & { error?: string }) | null
    if (!res.ok || !json || !Array.isArray(json.contratos)) {
      return { erro: json?.error || 'Contratos indisponíveis no momento.' }
    }
    return { dados: json }
  } catch {
    return { erro: 'Contratos indisponíveis no momento.' }
  }
}

export async function resgatarContratoSemanal(
  contratoId: string,
): Promise<{ dados?: RespostaResgatarContrato; erro?: string }> {
  const falha = 'Não foi possível resgatar o contrato agora.'
  try {
    const res = await fetch('/api/rpg/contratos/resgatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ contrato_id: contratoId }),
    })
    const json = (await res.json().catch(() => null)) as (RespostaResgatarContrato & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !json.estado) return { erro: falha }
    avisarOuroMudou()
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

