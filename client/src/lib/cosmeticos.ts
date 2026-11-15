// client/src/lib/cosmeticos.ts
// Mapeamento fechado de estilos cosméticos da Loja (Fase 16, #170 e #171).
// PITFALLS item 17: nenhuma classe de Tailwind montada por interpolação; nomes por extenso.
import { createElement, type ReactNode } from 'react'
import { Crown, Flame, Heart } from 'lucide-react'

export interface ItemCosmeticoLoja {
  id: string
  tipo: 'moldura' | 'tema_perfil' | 'cor_nome' | 'emblema' | 'expansao' | 'cenario'
  nome: string
  descricao: string
  preco: number
  raridade: 'comum' | 'raro' | 'epico' | 'lendario'
  estilo: string
  icone: string
  ativo: boolean
  ordem: number
  temporada?: number
  ja_possui?: boolean
  equipado?: boolean
}

export const ESTILOS_MOLDURA: Record<string, string> = {
  'moldura-cyber-holo': 'ring-2 ring-holo-3 ring-offset-2 ring-offset-void shadow-[0_0_12px_rgba(34,211,238,0.7)]',
  'moldura-ouro-shogun': 'ring-2 ring-amber-400 ring-offset-2 ring-offset-void shadow-[0_0_14px_rgba(251,191,36,0.8)]',
  'moldura-chama-dragao': 'ring-2 ring-rose-500 ring-offset-2 ring-offset-void shadow-[0_0_16px_rgba(244,63,94,0.85)]',
  apoiador: 'ring-2 ring-holo-1 ring-offset-2 ring-offset-void shadow-[0_0_16px_rgba(255,92,108,0.7)]',
  temporada_s1: 'ring-2 ring-red-500 ring-offset-2 ring-offset-void shadow-[0_0_18px_rgba(239,68,68,0.9)] animate-pulse',
}

export const ESTILOS_COR_NOME: Record<string, string> = {
  'cor-dourada-vip': 'text-amber-400 font-extrabold drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]',
  'cor-ciano-holo': 'text-holo-3 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]',
  apoiador: 'text-holo-1 font-extrabold drop-shadow-[0_0_8px_rgba(255,92,108,0.7)]',
  temporada_s1: 'text-red-500 font-extrabold drop-shadow-[0_0_10px_rgba(239,68,68,0.85)]',
}

export const ESTILOS_TEMA_PERFIL: Record<string, string> = {
  'tema-neon-matrix': 'bg-gradient-to-b from-emerald-950/70 via-void to-void border-emerald-500/30',
  'tema-sakura-noir': 'bg-gradient-to-b from-purple-950/70 via-void to-void border-pink-500/30',
  vip: 'bg-gradient-to-b from-rose-950/70 via-void to-void border-rose-500/30',
  temporada_s1: 'bg-gradient-to-b from-red-950/80 via-void to-void border-red-500/40',
}

// Cenários de fundo da tela do personagem. São valores inteiros de `background-image`, com
// cores fixas: o cenário é uma paisagem e não deve mudar de matiz com o tema do app. As
// estrelas são pontos de gradiente, sem imagem para baixar.
const ESTRELAS =
  'radial-gradient(1.5px 1.5px at 12% 18%, rgba(255,255,255,0.9) 50%, transparent 51%), ' +
  'radial-gradient(1px 1px at 27% 42%, rgba(255,255,255,0.7) 50%, transparent 51%), ' +
  'radial-gradient(1.5px 1.5px at 44% 11%, rgba(255,255,255,0.8) 50%, transparent 51%), ' +
  'radial-gradient(1px 1px at 61% 27%, rgba(255,255,255,0.7) 50%, transparent 51%), ' +
  'radial-gradient(1.5px 1.5px at 78% 14%, rgba(255,255,255,0.9) 50%, transparent 51%), ' +
  'radial-gradient(1px 1px at 88% 38%, rgba(255,255,255,0.6) 50%, transparent 51%), ' +
  'radial-gradient(1px 1px at 8% 55%, rgba(255,255,255,0.5) 50%, transparent 51%), ' +
  'radial-gradient(1px 1px at 93% 62%, rgba(255,255,255,0.5) 50%, transparent 51%)'

export const CENARIOS: Record<string, string> = {
  'cenario-ceu-de-eter': `${ESTRELAS}, radial-gradient(120% 80% at 50% 0%, #2b2a7a 0%, #141238 46%, #0a0714 100%)`,
  'cenario-aurora':
    `${ESTRELAS}, ` +
    'radial-gradient(80% 34% at 28% 22%, rgba(63,224,170,0.42), transparent 70%), ' +
    'radial-gradient(70% 30% at 74% 32%, rgba(123,92,255,0.42), transparent 70%), ' +
    'linear-gradient(180deg, #04131d 0%, #0a0714 100%)',
  'cenario-crepusculo': 'linear-gradient(180deg, #24103a 0%, #6b2947 42%, #c9773a 76%, #1a0d12 100%)',
  'cenario-abismo':
    `${ESTRELAS}, ` +
    'radial-gradient(90% 55% at 50% 100%, #4a1470 0%, rgba(74,20,112,0) 72%), ' +
    'linear-gradient(180deg, #05030b 0%, #0b0618 100%)',
}

/** Fundo do cenário, ou undefined para estilo ausente ou desconhecido (vale o fundo padrão). */
export function obterFundoDoCenario(estilo?: string | null): string | undefined {
  // hasOwn: o estilo vem do banco, e uma chave como "toString" acharia a função herdada.
  if (!estilo || !Object.hasOwn(CENARIOS, estilo)) return undefined
  return CENARIOS[estilo]
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
    case 'apoiador':
      return createElement(Heart, {
        size: numSize,
        className: 'text-holo-1 fill-holo-1/40 inline-block shrink-0 align-middle ml-1 drop-shadow-[0_0_6px_rgba(255,92,108,0.7)]',
        'aria-hidden': true,
      })
    default:
      return null
  }
}
