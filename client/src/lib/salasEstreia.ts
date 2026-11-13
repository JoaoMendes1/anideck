// client/src/lib/salasEstreia.ts
// Tipos e chamadas para a Sala de Estreia (Fase 17, #183 e #184)
import { supabase } from './supabase'

export interface SalaEstreia {
  id: string
  mal_id: number
  episodio: number
  titulo_anime: string
  imagem_anime?: string
  abre_em: string
  fecha_em: string
  encerrada: boolean
  ao_vivo: boolean
  segundos_restantes: number
  total_mensagens: number
  created_at: string
}

export interface SalaMensagem {
  id: string
  sala_id: string
  user_id: string
  autor_nome: string
  autor_handle: string
  autor_avatar?: string
  autor_moldura?: string
  autor_cla_tag?: string
  conteudo: string
  curtidas: number
  destaque: boolean
  curtido_por_mim: boolean
  created_at: string
}

export interface CurtidaResultado {
  curtido: boolean
  curtidas: number
  destaque: boolean
}

/** Formata segundos em contagem regressiva amigável (ex.: "02h 45m" ou "12:30") */
export function formatarContagemRegressiva(segundos: number): string {
  if (segundos <= 0) return 'Encerrada'
  const horas = Math.floor(segundos / 3600)
  const minutos = Math.floor((segundos % 3600) / 60)
  const segs = segundos % 60

  if (horas > 0) {
    return `${horas}h ${String(minutos).padStart(2, '0')}m`
  }
  return `${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`
}

export async function listarSalasAoVivo(): Promise<SalaEstreia[]> {
  const res = await fetch('/api/salas-estreia/ao-vivo')
  if (!res.ok) return []
  return res.json()
}

export async function obterSala(id: string): Promise<SalaEstreia | null> {
  const res = await fetch(`/api/salas-estreia/${encodeURIComponent(id)}`)
  if (!res.ok) return null
  return res.json()
}

export async function obterSalaPorAnime(malId: number): Promise<SalaEstreia | null> {
  const res = await fetch(`/api/salas-estreia/por-anime/${malId}`)
  if (!res.ok) return null
  return res.json()
}

export async function listarMensagensSala(salaId: string): Promise<SalaMensagem[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: HeadersInit = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const res = await fetch(`/api/salas-estreia/${encodeURIComponent(salaId)}/mensagens`, {
    headers,
  })
  if (!res.ok) return []
  return res.json()
}

export async function enviarMensagemSala(salaId: string, conteudo: string): Promise<SalaMensagem> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Você precisa estar logado para enviar mensagens na sala.')
  }

  const res = await fetch(`/api/salas-estreia/${encodeURIComponent(salaId)}/mensagens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ conteudo }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(txt || 'Erro ao enviar mensagem na sala.')
  }

  return res.json()
}

export async function curtirMensagemSala(salaId: string, msgId: string): Promise<CurtidaResultado> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Faça login para curtir mensagens.')
  }

  const res = await fetch(`/api/salas-estreia/${encodeURIComponent(salaId)}/mensagens/${encodeURIComponent(msgId)}/curtida`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    throw new Error('Erro ao curtir mensagem.')
  }

  return res.json()
}

export async function denunciarMensagemSala(salaId: string, msgId: string, motivo: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Faça login para enviar denúncias.')
  }

  const res = await fetch(`/api/salas-estreia/${encodeURIComponent(salaId)}/mensagens/${encodeURIComponent(msgId)}/denuncia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ motivo }),
  })

  if (!res.ok) {
    throw new Error('Erro ao denunciar mensagem.')
  }
}
