// client/src/lib/cosmeticos.ts
// Mapeamento fechado de estilos cosméticos da Loja (Fase 16, #170 e #171).
// PITFALLS item 17: nenhuma classe de Tailwind montada por interpolação; nomes por extenso.
import { createElement, type ReactNode } from 'react'
import { Crown, Flame } from 'lucide-react'

export interface ItemCosmeticoLoja {
  id: string
  tipo: 'moldura' | 'tema_perfil' | 'cor_nome' | 'emblema' | 'expansao'
  nome: string
  descricao: string
  preco: number
  raridade: 'comum' | 'raro' | 'epico' | 'lendario'
  estilo: string
  icone: string
  ativo: boolean
  ordem: number
  ja_possui?: boolean
  equipado?: boolean
}

export const ESTILOS_MOLDURA: Record<string, string> = {
  'moldura-cyber-holo': 'ring-2 ring-holo-3 ring-offset-2 ring-offset-void shadow-[0_0_12px_rgba(34,211,238,0.7)]',
  'moldura-ouro-shogun': 'ring-2 ring-amber-400 ring-offset-2 ring-offset-void shadow-[0_0_14px_rgba(251,191,36,0.8)]',
  'moldura-chama-dragao': 'ring-2 ring-rose-500 ring-offset-2 ring-offset-void shadow-[0_0_16px_rgba(244,63,94,0.85)]',
}

export const ESTILOS_COR_NOME: Record<string, string> = {
  'cor-dourada-vip': 'text-amber-400 font-extrabold drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]',
  'cor-ciano-holo': 'text-holo-3 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]',
}

export const ESTILOS_TEMA_PERFIL: Record<string, string> = {
  'tema-neon-matrix': 'bg-gradient-to-b from-emerald-950/70 via-void to-void border-emerald-500/30',
  'tema-sakura-noir': 'bg-gradient-to-b from-purple-950/70 via-void to-void border-pink-500/30',
}

export const CORES_RARIDADE: Record<string, { badge: string; texto: string; border: string }> = {
  comum: {
    badge: 'bg-panel-2 border-line text-muted',
    texto: 'text-muted',
    border: 'border-line',
  },
  raro: {
    badge: 'bg-holo-3/15 border-holo-3/40 text-holo-3',
    texto: 'text-holo-3',
    border: 'border-holo-3/40',
  },
  epico: {
    badge: 'bg-purple-500/15 border-purple-500/40 text-purple-400',
    texto: 'text-purple-400',
    border: 'border-purple-500/40',
  },
  lendario: {
    badge: 'bg-amber-400/15 border-amber-400/40 text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]',
    texto: 'text-amber-400',
    border: 'border-amber-400/50',
  },
}

export function obterClasseMoldura(estilo?: string | null): string {
  if (!estilo) return ''
  return ESTILOS_MOLDURA[estilo] ?? ''
}

export function obterClasseCorNome(estilo?: string | null): string {
  if (!estilo) return ''
  return ESTILOS_COR_NOME[estilo] ?? ''
}

export function obterClasseTemaPerfil(estilo?: string | null): string {
  if (!estilo) return ''
  return ESTILOS_TEMA_PERFIL[estilo] ?? ''
}

export function renderizarEmblema(estilo?: string | null, size: number | 'sm' | 'md' = 13): ReactNode {
  if (!estilo) return null
  const numSize = size === 'sm' ? 12 : size === 'md' ? 16 : size
  switch (estilo) {
    case 'emblema-coroa':
      return createElement(Crown, {
        size: numSize,
        className: 'text-amber-400 fill-amber-400/30 inline-block shrink-0 align-middle ml-1 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]',
        'aria-hidden': true,
      })
    case 'emblema-fogo':
      return createElement(Flame, {
        size: numSize,
        className: 'text-rose-500 fill-rose-500/30 inline-block shrink-0 align-middle ml-1 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]',
        'aria-hidden': true,
      })
    default:
      return null
  }
}
