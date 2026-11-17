// client/src/lib/navegacao.ts
// Fonte única do menu: grupos, itens, ícones, cores e subitens. O menu lateral do desktop,
// o menu do avatar e o Sheet do celular leem daqui; antes cada um tinha a sua lista, e
// elas já tinham divergido em nomes, ícones e itens (o perfil público não estava em nenhuma).
import type { LucideIcon } from 'lucide-react'
import {
  BarChart2, CalendarDays, CircleUserRound, Compass, Home, LayoutGrid, Settings, Shield,
  ShoppingBag, Sparkles, Swords, Trophy, UserRound, Users,
} from 'lucide-react'

export interface SubitemDoMenu {
  para: string
  rotulo: string
}

export interface ItemDoMenu {
  para: string
  rotulo: string
  Icone: LucideIcon
  /** Classe de cor do ícone, escrita por extenso (o Tailwind não gera classe interpolada). */
  cor: string
  /** Outras rotas que também acendem o item (ex.: Membros acende Rankings). */
  tambem?: string[]
  subitens?: SubitemDoMenu[]
}

export interface GrupoDoMenu {
  titulo: string
  itens: ItemDoMenu[]
}

export const ROTULO_MEU_PERFIL = 'Meu Perfil'

export interface ContextoDoMenu {
  /** @ do perfil público; vazio quando o perfil não existe ou está fechado. */
  handle?: string
  isAdmin?: boolean
  ano?: number
}

/** Monta o menu do usuário. O item Meu Perfil depende do perfil público existir. */
export function montarMenu({ handle = '', isAdmin = false, ano = new Date().getFullYear() }: ContextoDoMenu): GrupoDoMenu[] {
  const perfil = handle ? `/u/${handle}` : '/configuracoes#comunidade'
  const grupos: GrupoDoMenu[] = [
    {
      titulo: 'JORNADA',
      itens: [
        { para: '/', rotulo: 'Início', Icone: Home, cor: 'text-holo-3' },
        { para: '/descobrir', rotulo: 'Descobrir', Icone: Compass, cor: 'text-holo-1', tambem: ['/anime'] },
        { para: '/deck', rotulo: 'Meu Deck', Icone: LayoutGrid, cor: 'text-holo-2' },
        { para: '/calendario', rotulo: 'Agenda', Icone: CalendarDays, cor: 'text-green' },
        { para: '/meu-gosto', rotulo: 'Meu Gosto', Icone: BarChart2, cor: 'text-holo-3' },
      ],
    },
    {
      titulo: 'GUILDA',
      itens: [
        {
          para: '/guilda', rotulo: 'Guilda', Icone: Swords, cor: 'text-holo-2',
          subitens: [
            { para: '/guilda#missoes-diarias-card', rotulo: 'Missões' },
            { para: '/guilda#especialidade', rotulo: 'Especialidade' },
            { para: '/guilda#extrato', rotulo: 'Extrato de XP' },
            { para: '/guilda#insignias', rotulo: 'Insígnias' },
            { para: '/chefao', rotulo: 'Chefão da temporada' },
          ],
        },
        {
          para: '/personagem', rotulo: 'Meu Personagem', Icone: UserRound, cor: 'text-gold',
          subitens: [
            { para: '/personagem?aba=atributos', rotulo: 'Atributos' },
            { para: '/personagem?aba=habilidades', rotulo: 'Habilidades' },
            { para: '/expedicoes', rotulo: 'Expedições' },
            { para: '/masmorras', rotulo: 'Masmorras' },
            { para: '/invocacao', rotulo: 'Invocação' },
          ],
        },
        { para: '/clas', rotulo: 'Clãs', Icone: Users, cor: 'text-holo-1' },
        { para: '/loja', rotulo: 'Loja', Icone: ShoppingBag, cor: 'text-holo-3' },
      ],
    },
    {
      titulo: 'COMUNIDADE',
      itens: [
        {
          para: '/rankings', rotulo: 'Rankings', Icone: Trophy, cor: 'text-gold',
          subitens: [
            { para: '/membros', rotulo: 'Membros' },
            { para: '/duelos', rotulo: 'Duelos' },
          ],
        },
        {
          para: perfil, rotulo: ROTULO_MEU_PERFIL, Icone: CircleUserRound, cor: 'text-coral',
          subitens: [
            { para: `/wrapped/${ano}`, rotulo: `Wrapped ${ano}` },
            { para: '/configuracoes', rotulo: 'Configurações' },
          ],
        },
      ],
    },
  ]
  if (isAdmin) {
    grupos.push({ titulo: 'GESTÃO', itens: [{ para: '/admin', rotulo: 'Painel Admin', Icone: Shield, cor: 'text-muted' }] })
  }
  return grupos
}

/** Itens da conta que o menu do avatar mostra mesmo com o menu lateral aberto. */
export function itensDaConta({ handle = '', ano = new Date().getFullYear() }: ContextoDoMenu): ItemDoMenu[] {
  return [
    handle
      ? { para: `/u/${handle}`, rotulo: 'Ver meu perfil', Icone: CircleUserRound, cor: 'text-coral' }
      : { para: '/configuracoes#comunidade', rotulo: 'Criar perfil público', Icone: CircleUserRound, cor: 'text-coral' },
    { para: `/wrapped/${ano}`, rotulo: `AniDeck Wrapped ${ano}`, Icone: Sparkles, cor: 'text-gold' },
    { para: '/configuracoes', rotulo: 'Configurações', Icone: Settings, cor: 'text-muted' },
  ]
}

function separar(para: string): { caminho: string; busca: URLSearchParams; ancora: string } {
  const url = new URL(para, 'https://anideck.local')
  return { caminho: url.pathname, busca: url.searchParams, ancora: url.hash }
}

function casaCaminho(base: string, caminho: string): boolean {
  return base === '/' ? caminho === '/' : caminho === base || caminho.startsWith(`${base}/`)
}

/** O item acende na própria rota, nas subrotas, nas rotas associadas e nas dos subitens. */
export function itemAtivo(item: ItemDoMenu, caminho: string): boolean {
  const bases = [item.para, ...(item.tambem ?? []), ...(item.subitens ?? []).map((s) => s.para)]
  return bases.some((b) => casaCaminho(separar(b).caminho, caminho))
}

/** O subitem acende quando a rota, os parâmetros e a âncora dele batem com a localização. */
export function subitemAtivo(sub: SubitemDoMenu, local: { pathname: string; search?: string; hash?: string }): boolean {
  const { caminho, busca, ancora } = separar(sub.para)
  if (!casaCaminho(caminho, local.pathname)) return false
  if (ancora && ancora !== (local.hash ?? '')) return false
  const atual = new URLSearchParams(local.search ?? '')
  for (const [chave, valor] of busca) {
    if (atual.get(chave) !== valor) return false
  }
  return true
}
