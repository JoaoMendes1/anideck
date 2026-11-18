// client/src/lib/grupo.ts
// Lutas em grupo (sql/120). Abrir, aceitar e lutar passam pelo Go, que monta a ficha de
// combate e simula; convidar, recusar, sair e ler o grupo vão direto às funções do banco,
// que conferem quem está pedindo.
import { supabase } from './supabase'
import { avisarOuroMudou } from './hud'
import { cabecalhoDeAutenticacao, type ItemRPG, type MonstroRPG, type TurnoBatalha } from './rpg'

export type AlvoDoGrupo = 'monstro' | 'masmorra'
export type QuemConvida = 'todos' | 'amigos' | 'ninguem'

export interface MembroDoGrupo {
  handle: string
  nome: string
  papel: 'lider' | 'convidado'
  status: 'convidado' | 'aceito' | 'recusado'
  sou_eu: boolean
  nivel: number | null
  poder: number | null
  personagem: string | null
}

export interface HeroiNoResultado {
  vida_inicial: number
  vida_final: number
  vida_maxima: number
  caiu: boolean
  fora?: boolean
}

export interface LutaEmGrupo {
  venceu: boolean
  rodadas: number
  turnos: TurnoBatalha[]
  herois: HeroiNoResultado[]
  vida_monstro: number
}

export interface MasmorraEmGrupo {
  andares: { monstro: MonstroRPG; resultado: LutaEmGrupo }[]
  vencidos: string[]
  completou: boolean
  herois: HeroiNoResultado[]
}

export interface ResultadoDoGrupo {
  modo: 'na_hora'
  herois: { nome: string; personagem: string; nivel: number; fora?: string }[]
  monstro?: MonstroRPG
  luta?: LutaEmGrupo
  masmorra?: MasmorraEmGrupo
  venceu: boolean
}

export interface RecompensaNoGrupo {
  ouro: number
  ouro_perdido: number
  bilhetes: number
  item?: ItemRPG
  mana: number
  erro?: string
}

export interface EstadoDoGrupo {
  id: string
  alvo_tipo: AlvoDoGrupo
  alvo_id: string
  alvo_nome: string
  status: 'aberto' | 'lutando' | 'concluido' | 'cancelado' | 'expirado'
  expira_em: string
  sou_lider: boolean
  resultado: ResultadoDoGrupo | null
  minha_recompensa: RecompensaNoGrupo | null
  membros: MembroDoGrupo[]
}

export interface Candidato {
  handle: string
  nome: string
  online: boolean
  amigo: boolean
  cla: boolean
  no_grupo: 'convidado' | 'aceito' | 'recusado' | 'saiu' | null
  motivo: string | null
}

export interface ConvitePendente {
  grupo_id: string
  alvo_tipo: AlvoDoGrupo
  alvo_id: string
  alvo_nome: string
  lider_nome: string
  lider_handle: string
  expira_em: string
}

/** Quantas pessoas cabem no grupo, contando quem abriu (o servidor confere). */
export const MAX_NO_GRUPO = 3

type Resposta<T> = { dados?: T; erro?: string }

async function postarNoGo<T>(caminho: string, corpo: unknown, falha: string): Promise<Resposta<T>> {
  try {
    const res = await fetch(caminho, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
    const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null
    if (!res.ok || !json) return { erro: json?.error || falha }
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

async function chamarBanco<T>(funcao: string, args: Record<string, unknown>, falha: string): Promise<Resposta<T>> {
  const { data, error } = await supabase.rpc(funcao, args)
  if (error) return { erro: falha }
  const r = (data ?? {}) as T & { erro?: string }
  if (r.erro) return { erro: r.erro }
  return { dados: r }
}

export const abrirGrupo = (alvo_tipo: AlvoDoGrupo, alvo_id: string) =>
  postarNoGo<{ grupo_id: string }>('/api/rpg/grupos', { alvo_tipo, alvo_id }, 'Não foi possível abrir o grupo agora.')

export const aceitarConvite = (grupoId: string) =>
  postarNoGo<{ grupo_id: string }>(`/api/rpg/grupos/${encodeURIComponent(grupoId)}/aceitar`, undefined, 'Não foi possível entrar no grupo agora.')

export async function lutarEmGrupo(grupoId: string) {
  const r = await postarNoGo<{ resultado: ResultadoDoGrupo; minha_recompensa: RecompensaNoGrupo }>(
    `/api/rpg/grupos/${encodeURIComponent(grupoId)}/lutar`, undefined, 'Não foi possível começar a luta agora.')
  if (r.dados) avisarOuroMudou()
  return r
}

export const lerGrupo = (grupoId: string) =>
  chamarBanco<EstadoDoGrupo>('rpg_grupo_estado', { p_grupo: grupoId }, 'Não foi possível ler o grupo.')

export async function lerCandidatos(grupoId: string): Promise<Candidato[]> {
  const r = await chamarBanco<{ candidatos: Candidato[] }>('rpg_candidatos_grupo', { p_grupo: grupoId }, '')
  return r.dados?.candidatos ?? []
}

export const convidar = (grupoId: string, handle: string) =>
  chamarBanco<{ ok: boolean }>('rpg_grupo_convidar', { p_grupo: grupoId, p_handle: handle }, 'Não foi possível convidar agora.')

export const recusarConvite = (grupoId: string) =>
  chamarBanco<{ ok: boolean }>('rpg_grupo_recusar', { p_grupo: grupoId }, 'Não foi possível recusar agora.')

export const sairDoGrupo = (grupoId: string) =>
  chamarBanco<{ ok: boolean; fechou?: boolean }>('rpg_grupo_sair', { p_grupo: grupoId }, 'Não foi possível sair agora.')

export async function lerConvitesPendentes(): Promise<{ aviso: boolean; convites: ConvitePendente[] }> {
  const r = await chamarBanco<{ aviso: boolean; convites: ConvitePendente[] }>('rpg_convites_pendentes', {}, '')
  return { aviso: r.dados?.aviso ?? true, convites: r.dados?.convites ?? [] }
}

export async function lerPreferenciasConvite(): Promise<{ quem: QuemConvida; aviso: boolean } | null> {
  const { data, error } = await supabase.rpc('preferencias_convite')
  if (error || !data) return null
  return data as { quem: QuemConvida; aviso: boolean }
}

export const salvarPreferenciasConvite = (quem: QuemConvida, aviso: boolean) =>
  chamarBanco<{ ok: boolean }>('salvar_preferencias_convite', { p_quem: quem, p_aviso: aviso }, 'Não foi possível salvar agora.')

export async function marcarOnline(): Promise<void> {
  await supabase.rpc('marcar_online')
}

/** Rótulo curto de onde o candidato vem, na ordem que mais pesa. */
export function origemDoCandidato(c: Candidato): string {
  const partes: string[] = []
  if (c.amigo) partes.push('Amigo')
  if (c.cla) partes.push('Clã')
  if (c.online) partes.push('Online')
  return partes.join(' · ')
}

/** Minutos que faltam para o convite ou grupo expirar (0 quando já passou). */
export function minutosRestantes(expiraEm: string, agora = Date.now()): number {
  const fim = new Date(expiraEm).getTime()
  if (Number.isNaN(fim)) return 0
  return Math.max(0, Math.ceil((fim - agora) / 60000))
}

/** Texto do turno com o nome do herói no lugar de "você". */
export function descreverTurnoEmGrupo(
  turno: TurnoBatalha,
  nomeDoMonstro: string,
  nomes: string[],
  descrever: (t: TurnoBatalha, m: string) => { texto: string; valor: string },
): { texto: string; valor: string } {
  const nome = (turno.heroi && nomes[turno.heroi - 1]) || 'Herói'
  const { texto, valor } = descrever(turno, nomeDoMonstro)
  // \b não funciona depois do "ê" (não é letra para o JS): o fim da palavra vem pelo lookahead.
  let novo = texto.replace(/^Você(?=[\s,:]|$)/, nome).replace(/\bvocê(?=[\s,:]|$)/g, nome)
  if (turno.atacante !== 'jogador' && !novo.includes(nome)) novo = `${novo} → ${nome}`
  return { texto: novo, valor }
}

/** Uma luta (ou cada andar da masmorra) em sequência, para reproduzir de uma vez só. */
export function etapasDoResultado(r: ResultadoDoGrupo): { monstro: MonstroRPG; luta: LutaEmGrupo; andar: number }[] {
  if (r.masmorra) return r.masmorra.andares.map((a, i) => ({ monstro: a.monstro, luta: a.resultado, andar: i + 1 }))
  if (r.monstro && r.luta) return [{ monstro: r.monstro, luta: r.luta, andar: 0 }]
  return []
}
