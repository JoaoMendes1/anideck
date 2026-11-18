// client/src/lib/moderacao.ts
// Denúncias e punições. As regras ficam no banco (sql/112 e sql/113); aqui ficam as chamadas
// e os padrões de punição por gravidade, que só preenchem o formulário do admin.
import { supabase } from './supabase'

export type TipoDenuncia = 'perfil' | 'avaliacao'
export type MotivoDenuncia = 'spoiler' | 'ofensa' | 'spam' | 'improprio' | 'outro'
export type TipoPunicao = 'advertencia' | 'silenciar' | 'multa' | 'banir' | 'bloqueio_email'
export type Gravidade = 'leve' | 'media' | 'grave' | 'gravissima'

export const MOTIVOS_DENUNCIA: { id: MotivoDenuncia; rotulo: string }[] = [
  { id: 'spoiler', rotulo: 'Spoiler sem aviso' },
  { id: 'ofensa', rotulo: 'Ofensa ou ataque' },
  { id: 'spam', rotulo: 'Spam ou propaganda' },
  { id: 'improprio', rotulo: 'Conteúdo impróprio' },
  { id: 'outro', rotulo: 'Outro motivo' },
]

export const ROTULO_PUNICAO: Record<TipoPunicao, string> = {
  advertencia: 'Advertência',
  silenciar: 'Silenciar',
  multa: 'Multa',
  banir: 'Banir conta',
  bloqueio_email: 'Bloquear e-mail',
}

export const ROTULO_GRAVIDADE: Record<Gravidade, string> = {
  leve: 'Leve',
  media: 'Média',
  grave: 'Grave',
  gravissima: 'Gravíssima',
}

export interface PadraoPunicao {
  tipo: TipoPunicao
  anicoins: number
  xp: number
  dias: number | null
}

/** Sugestão por gravidade, como uma tabela de multas: o admin pode mudar tudo antes de aplicar. */
export const PADRAO_POR_GRAVIDADE: Record<Gravidade, PadraoPunicao> = {
  leve: { tipo: 'multa', anicoins: 20, xp: 50, dias: null },
  media: { tipo: 'silenciar', anicoins: 100, xp: 200, dias: 7 },
  grave: { tipo: 'banir', anicoins: 0, xp: 0, dias: 30 },
  gravissima: { tipo: 'banir', anicoins: 0, xp: 0, dias: null },
}

/** Frase para a própria pessoa entender o que aconteceu. */
export function descreverPunicao(p: { tipo: TipoPunicao; anicoins?: number; xp?: number; ate?: string | null }): string {
  const ate = p.ate ? new Date(p.ate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null
  switch (p.tipo) {
    case 'advertencia':
      return 'Você recebeu uma advertência da moderação por descumprir as regras do AniDeck.'
    case 'silenciar':
      return ate
        ? `Sua conta está silenciada até ${ate} por má conduta ou por descumprir as regras do AniDeck: até lá, não dá para comentar, avaliar nem reagir.`
        : 'Sua conta está silenciada por má conduta ou por descumprir as regras do AniDeck: não dá para comentar, avaliar nem reagir.'
    case 'multa': {
      const partes = [p.anicoins ? `${p.anicoins} AniCoins` : '', p.xp ? `${p.xp} XP` : ''].filter(Boolean).join(' e ')
      return `Você recebeu uma multa de ${partes} por má conduta ou por descumprir as regras do AniDeck.`
    }
    default:
      return 'A moderação aplicou uma punição na sua conta.'
  }
}

async function cabecalho(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) }
}

async function erroDe(res: Response, padrao: string): Promise<string> {
  try {
    return ((await res.json()) as { error?: string }).error || padrao
  } catch {
    return padrao
  }
}

export async function denunciar(tipo: TipoDenuncia, alvo: string, motivo: MotivoDenuncia, detalhe: string): Promise<string | null> {
  try {
    const res = await fetch('/api/denuncias', { method: 'POST', headers: await cabecalho(), body: JSON.stringify({ tipo, alvo, motivo, detalhe }) })
    return res.ok ? null : await erroDe(res, 'Não foi possível enviar a denúncia agora.')
  } catch {
    return 'Sem conexão. Tente de novo.'
  }
}

export interface DenunciaAdmin {
  id: string
  alvo_tipo: TipoDenuncia
  alvo_id: string
  motivo: MotivoDenuncia
  detalhe: string
  created_at: string
  alvo?: { handle?: string; nome?: string }
  denunciante?: { handle?: string; nome?: string }
  avaliacao?: { texto?: string; mal_id?: number }
}

export async function listarDenuncias(): Promise<DenunciaAdmin[]> {
  const res = await fetch('/api/admin/denuncias', { headers: await cabecalho() })
  if (!res.ok) throw new Error(await erroDe(res, 'Não foi possível carregar as denúncias.'))
  return res.json()
}

export async function decidirDenuncia(id: string, status: 'resolvida' | 'descartada', decisao = ''): Promise<string | null> {
  const res = await fetch(`/api/admin/denuncias/${id}/decidir`, { method: 'POST', headers: await cabecalho(), body: JSON.stringify({ status, decisao }) })
  return res.ok ? null : erroDe(res, 'Não foi possível decidir agora.')
}

export interface PedidoPunicao {
  handle: string
  tipo: TipoPunicao
  gravidade: Gravidade
  motivo: string
  anicoins: number
  xp: number
  dias: number | null
  denuncia_id?: string
}

export async function aplicarPunicao(p: PedidoPunicao): Promise<string | null> {
  const res = await fetch('/api/admin/punicoes', { method: 'POST', headers: await cabecalho(), body: JSON.stringify(p) })
  return res.ok ? null : erroDe(res, 'Não foi possível aplicar a punição.')
}

export async function revogarPunicao(id: string): Promise<string | null> {
  const res = await fetch(`/api/admin/punicoes/${id}/revogar`, { method: 'POST', headers: await cabecalho() })
  return res.ok ? null : erroDe(res, 'Não foi possível revogar.')
}

export interface PunicaoRegistrada {
  id: string
  tipo: TipoPunicao
  gravidade: Gravidade
  motivo: string
  anicoins: number
  xp: number
  ate: string | null
  created_at: string
  revogada_em: string | null
}

export async function historicoPunicoes(handle: string): Promise<PunicaoRegistrada[]> {
  const res = await fetch(`/api/admin/punicoes/${encodeURIComponent(handle)}`, { headers: await cabecalho() })
  if (!res.ok) throw new Error(await erroDe(res, 'Membro não encontrado.'))
  return res.json()
}

/** Quantas denúncias esperam decisão; 0 para quem não é admin. */
export async function contarPendentes(): Promise<number> {
  const { data, error } = await supabase.rpc('moderacao_pendentes')
  return error || typeof data !== 'number' ? 0 : data
}

export async function minhasPunicoes(): Promise<(PunicaoRegistrada & { ate: string | null })[]> {
  const { data, error } = await supabase.rpc('minhas_punicoes')
  return error || !Array.isArray(data) ? [] : data
}
