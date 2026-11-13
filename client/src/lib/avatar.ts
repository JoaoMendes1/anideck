// client/src/lib/avatar.ts
// Avatar montável em camadas vetoriais geométricas (Fase 17.6, #192)
import { supabase } from './supabase'

export interface AvatarCustom {
  base: 'redondo' | 'quadrado' | 'losango'
  pele: string
  olhos: 'brilho' | 'determinado' | 'tranquilo' | 'piscada' | 'dorminhoco'
  cor_olhos: string
  boca: 'sorriso' | 'alegre' | 'neutro' | 'foco' | 'gato'
  cabelo: 'curto' | 'espigado' | 'longo' | 'coque' | 'careca'
  cor_cabelo: string
  acessorio: 'nenhum' | 'oculos' | 'bandana' | 'fone' | 'coroa'
  fundo: 'holo' | 'cyber' | 'sunset' | 'roxo' | 'verde' | 'escuro'
}

export const AVATAR_PADRAO: AvatarCustom = {
  base: 'redondo',
  pele: '#fcd34d',
  olhos: 'brilho',
  cor_olhos: '#06b6d4',
  boca: 'sorriso',
  cabelo: 'curto',
  cor_cabelo: '#3b82f6',
  acessorio: 'nenhum',
  fundo: 'holo',
}

export const CORES_PELE = [
  '#fde047', // anime clássico
  '#fcd34d',
  '#fbcfe8',
  '#fed7aa',
  '#f5d0b5',
  '#d4a373',
  '#8d5b4c',
  '#5c3d2e',
]

export const CORES_CABELO = [
  '#1e293b', // preto/escuro
  '#3b82f6', // azul holo
  '#ec4899', // rosa anime
  '#eab308', // loiro dourado
  '#a855f7', // roxo neon
  '#10b981', // verde esmeralda
  '#ef4444', // vermelho fogo
  '#f8fafc', // prateado/branco
]

export const CORES_OLHOS = [
  '#06b6d4', // ciano
  '#3b82f6', // azul
  '#ec4899', // magenta
  '#10b981', // verde
  '#f59e0b', // âmbar
  '#8b5cf6', // violeta
  '#e11d48', // rubi
  '#334155', // ônix
]

export const OPCOES_OLHOS: { id: AvatarCustom['olhos']; rotulo: string }[] = [
  { id: 'brilho', rotulo: 'Grandes & Brilhantes' },
  { id: 'determinado', rotulo: 'Determinado' },
  { id: 'tranquilo', rotulo: 'Tranquilo' },
  { id: 'piscada', rotulo: 'Piscadela' },
  { id: 'dorminhoco', rotulo: 'Sonolento' },
]

export const OPCOES_BOCA: { id: AvatarCustom['boca']; rotulo: string }[] = [
  { id: 'sorriso', rotulo: 'Sorriso Amigável' },
  { id: 'alegre', rotulo: 'Alegre / Risada' },
  { id: 'neutro', rotulo: 'Sereno / Neutro' },
  { id: 'foco', rotulo: 'Foco Sério' },
  { id: 'gato', rotulo: 'Boquinha :3' },
]

export const OPCOES_CABELO: { id: AvatarCustom['cabelo']; rotulo: string }[] = [
  { id: 'curto', rotulo: 'Curto Espetado' },
  { id: 'espigado', rotulo: 'Espigado Shonen' },
  { id: 'longo', rotulo: 'Longo Fluido' },
  { id: 'coque', rotulo: 'Coque Samurai' },
  { id: 'careca', rotulo: 'Sem Cabelo' },
]

export const OPCOES_ACESSORIO: { id: AvatarCustom['acessorio']; rotulo: string; rankMinimo?: string }[] = [
  { id: 'nenhum', rotulo: 'Nenhum' },
  { id: 'oculos', rotulo: 'Óculos Estilosos' },
  { id: 'bandana', rotulo: 'Bandana Ninja' },
  { id: 'fone', rotulo: 'Headphone Gamer' },
  { id: 'coroa', rotulo: 'Coroa Imperial' },
]

export const OPCOES_FUNDO: { id: AvatarCustom['fundo']; rotulo: string; gradiente: string }[] = [
  { id: 'holo', rotulo: 'Holográfico AniDeck', gradiente: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)' },
  { id: 'cyber', rotulo: 'Cyberpunk Neon', gradiente: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #8b5cf6 100%)' },
  { id: 'sunset', rotulo: 'Entardecer Dourado', gradiente: 'linear-gradient(135deg, #f97316 0%, #eab308 100%)' },
  { id: 'roxo', rotulo: 'Abismo Noturno', gradiente: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)' },
  { id: 'verde', rotulo: 'Floresta Élfica', gradiente: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)' },
  { id: 'escuro', rotulo: 'Void Minimalista', gradiente: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)' },
]

/**
 * Normaliza qualquer objeto para um AvatarCustom seguro, substituindo propriedades
 * ausentes ou inválidas pelas padrões.
 */
export function normalizarAvatar(raw: unknown): AvatarCustom {
  if (!raw || typeof raw !== 'object') {
    return { ...AVATAR_PADRAO }
  }

  const obj = raw as Record<string, unknown>

  const base = ['redondo', 'quadrado', 'losango'].includes(String(obj.base))
    ? (obj.base as AvatarCustom['base'])
    : AVATAR_PADRAO.base

  const pele = typeof obj.pele === 'string' && obj.pele.startsWith('#')
    ? obj.pele
    : AVATAR_PADRAO.pele

  const olhos = ['brilho', 'determinado', 'tranquilo', 'piscada', 'dorminhoco'].includes(String(obj.olhos))
    ? (obj.olhos as AvatarCustom['olhos'])
    : AVATAR_PADRAO.olhos

  const cor_olhos = typeof obj.cor_olhos === 'string' && obj.cor_olhos.startsWith('#')
    ? obj.cor_olhos
    : AVATAR_PADRAO.cor_olhos

  const boca = ['sorriso', 'alegre', 'neutro', 'foco', 'gato'].includes(String(obj.boca))
    ? (obj.boca as AvatarCustom['boca'])
    : AVATAR_PADRAO.boca

  const cabelo = ['curto', 'espigado', 'longo', 'coque', 'careca'].includes(String(obj.cabelo))
    ? (obj.cabelo as AvatarCustom['cabelo'])
    : AVATAR_PADRAO.cabelo

  const cor_cabelo = typeof obj.cor_cabelo === 'string' && obj.cor_cabelo.startsWith('#')
    ? obj.cor_cabelo
    : AVATAR_PADRAO.cor_cabelo

  const acessorio = ['nenhum', 'oculos', 'bandana', 'fone', 'coroa'].includes(String(obj.acessorio))
    ? (obj.acessorio as AvatarCustom['acessorio'])
    : AVATAR_PADRAO.acessorio

  const fundo = ['holo', 'cyber', 'sunset', 'roxo', 'verde', 'escuro'].includes(String(obj.fundo))
    ? (obj.fundo as AvatarCustom['fundo'])
    : AVATAR_PADRAO.fundo

  return {
    base,
    pele,
    olhos,
    cor_olhos,
    boca,
    cabelo,
    cor_cabelo,
    acessorio,
    fundo,
  }
}

/**
 * Salva a customização de avatar do usuário no Supabase.
 */
export async function salvarAvatarCustom(avatar: AvatarCustom | null): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return false

    const { error } = await supabase.rpc('salvar_avatar_customizado', {
      p_avatar: avatar,
    })

    return !error
  } catch {
    return false
  }
}
