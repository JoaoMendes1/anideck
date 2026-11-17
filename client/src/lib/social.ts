// client/src/lib/social.ts
// Seguir jogadores, atividade do perfil público e feed da comunidade. Quem aparece e o que
// pode ser lido (o texto de um comentário só para quem viu o episódio) é decidido no banco
// (sql/098); aqui só se busca e se escreve a frase de cada evento.
import { supabase } from './supabase'

export type TipoDeEvento = 'episodios' | 'completou' | 'comentou' | 'curtiu'

export interface AutorDoEvento {
  handle: string
  nome: string
  nivel: number
  avatar?: unknown
  estagio?: string
  personagem_base?: string
}

export interface EventoDeAtividade {
  tipo: TipoDeEvento
  quando: string
  autor: AutorDoEvento
  mal_id: number
  titulo?: string
  episodio?: number
  episodio_ate?: number
  comentario_id?: string
  texto?: string
  texto_oculto?: boolean
  alvo_handle?: string
  alvo_nome?: string
}

export interface PaginaDeAtividade {
  eventos: EventoDeAtividade[]
  proximo?: string
}

export interface AssistindoAgora {
  mal_id: number
  titulo?: string
  episodios?: number
  ultimo_episodio?: number
  atualizado_em?: string
}

export interface AtividadeDoPerfil extends PaginaDeAtividade {
  assistindo?: AssistindoAgora[]
}

export interface ResumoSocial {
  seguidores: number
  seguindo: number
  eu_sigo: boolean
  sou_eu: boolean
  mostra_atividade: boolean
}

export type AbaDoFeed = 'geral' | 'seguindo'

/** "o ep 5" ou "os eps 1 a 3". */
export function textoDosEpisodios(de?: number, ate?: number): string {
  if (!de) return ''
  if (!ate || ate === de) return `o ep ${de}`
  return `os eps ${de} a ${ate}`
}

/**
 * A frase do evento, sem o nome de quem fez (a tela põe o nome na frente) e sem o título
 * do anime (a tela põe o título como link). Ex.: "assistiu os eps 1 a 3 de".
 */
export function fraseDoEvento(e: EventoDeAtividade): string {
  switch (e.tipo) {
    case 'episodios':
      return `assistiu ${textoDosEpisodios(e.episodio, e.episodio_ate)} de`
    case 'completou':
      return 'completou'
    case 'comentou':
      return `comentou ${e.episodio ? `no ep ${e.episodio} de` : 'em'}`
    case 'curtiu':
      return `curtiu um comentário${e.alvo_nome ? ` de ${e.alvo_nome}` : ''} ${e.episodio ? `no ep ${e.episodio} de` : 'em'}`
    default:
      return ''
  }
}

/** Para onde o evento leva: a conversa do episódio, quando há comentário; senão, a obra. */
export function linkDoEvento(e: EventoDeAtividade): string {
  if ((e.tipo === 'comentou' || e.tipo === 'curtiu') && e.episodio) {
    return `/anime/${e.mal_id}?aba=conversa&ep=${e.episodio}`
  }
  return `/anime/${e.mal_id}`
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias" ou a data, para mais de uma semana. */
export function tempoDoEvento(quando: string, agora: number = Date.now()): string {
  const t = Date.parse(quando)
  if (!Number.isFinite(t)) return ''
  const min = Math.max(0, Math.floor((agora - t) / 60000))
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return d === 1 ? 'há 1 dia' : `há ${d} dias`
  return new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })
}

/** Junta a página nova à lista, sem repetir eventos que já estavam (cliques duplos, cursor). */
export function juntarEventos(atuais: EventoDeAtividade[], novos: EventoDeAtividade[]): EventoDeAtividade[] {
  const chave = (e: EventoDeAtividade) => `${e.tipo}|${e.autor.handle}|${e.mal_id}|${e.episodio ?? ''}|${e.comentario_id ?? ''}|${e.quando}`
  const vistos = new Set(atuais.map(chave))
  return [...atuais, ...novos.filter(e => !vistos.has(chave(e)))]
}

async function cabecalho(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

async function lerErro(res: Response, padrao: string): Promise<string> {
  try {
    const json = (await res.json()) as { error?: string }
    return json.error || padrao
  } catch {
    return padrao
  }
}

export async function obterFeed(aba: AbaDoFeed, antes?: string): Promise<{ dados?: PaginaDeAtividade; erro?: string }> {
  const falha = 'Não foi possível carregar o feed agora.'
  try {
    const q = new URLSearchParams({ aba })
    if (antes) q.set('antes', antes)
    const res = await fetch(`/api/feed?${q}`, { headers: await cabecalho() })
    if (!res.ok) return { erro: await lerErro(res, falha) }
    const json = (await res.json()) as PaginaDeAtividade
    return { dados: { eventos: Array.isArray(json.eventos) ? json.eventos : [], proximo: json.proximo } }
  } catch {
    return { erro: falha }
  }
}

export async function obterAtividadeDoPerfil(handle: string, antes?: string): Promise<AtividadeDoPerfil | null> {
  try {
    const q = antes ? `?antes=${encodeURIComponent(antes)}` : ''
    const res = await fetch(`/api/membros/${encodeURIComponent(handle)}/atividade${q}`, { headers: await cabecalho() })
    if (!res.ok) return null
    const json = (await res.json()) as AtividadeDoPerfil
    return { eventos: Array.isArray(json.eventos) ? json.eventos : [], proximo: json.proximo, assistindo: json.assistindo ?? [] }
  } catch {
    return null
  }
}

export async function obterResumoSocial(handle: string): Promise<ResumoSocial | null> {
  try {
    const res = await fetch(`/api/membros/${encodeURIComponent(handle)}/social`, { headers: await cabecalho() })
    if (!res.ok) return null
    return (await res.json()) as ResumoSocial
  } catch {
    return null
  }
}

/** Segue (true) ou deixa de seguir (false). Devolve o resumo novo. */
export async function seguir(handle: string, seguirOuNao: boolean): Promise<{ dados?: ResumoSocial; erro?: string }> {
  const falha = seguirOuNao ? 'Não foi possível seguir agora.' : 'Não foi possível deixar de seguir agora.'
  try {
    const res = await fetch(`/api/membros/${encodeURIComponent(handle)}/seguir`, {
      method: seguirOuNao ? 'POST' : 'DELETE',
      headers: await cabecalho(),
    })
    if (!res.ok) return { erro: await lerErro(res, falha) }
    return { dados: (await res.json()) as ResumoSocial }
  } catch {
    return { erro: falha }
  }
}

export interface CapaDoAnime {
  titulo: string
  imagem: string
}

/** Capa e título de vários animes numa chamada (a mesma rota da vitrine do perfil). */
export async function buscarCapas(ids: number[]): Promise<Map<number, CapaDoAnime>> {
  const unicos = [...new Set(ids.filter(id => id > 0))]
  const mapa = new Map<number, CapaDoAnime>()
  if (unicos.length === 0) return mapa
  try {
    const res = await fetch('/api/anime/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: unicos }),
    })
    if (!res.ok) return mapa
    const json = (await res.json()) as { data?: { mal_id: number; title: string; images?: { jpg?: { image_url?: string } } }[] }
    for (const a of json.data ?? []) {
      mapa.set(a.mal_id, { titulo: a.title, imagem: a.images?.jpg?.image_url ?? '' })
    }
  } catch {
    // Sem capa, o item mostra só o título que veio do feed.
  }
  return mapa
}
