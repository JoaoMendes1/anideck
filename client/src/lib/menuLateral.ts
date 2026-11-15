// client/src/lib/menuLateral.ts
// Regras do menu lateral do desktop: quais itens existem, qual está ativo e a preferência
// de recolher, guardada no navegador.

export interface ItemDoMenu {
  para: string
  rotulo: string
  /** Outras rotas que também acendem o item (ex.: Membros acende Rankings). */
  tambem?: string[]
}

export const ITENS_JORNADA: ItemDoMenu[] = [
  { para: '/', rotulo: 'Início' },
  { para: '/descobrir', rotulo: 'Descobrir', tambem: ['/anime'] },
  { para: '/deck', rotulo: 'Meu Deck' },
  { para: '/calendario', rotulo: 'Agenda' },
  { para: '/rankings', rotulo: 'Rankings', tambem: ['/membros'] },
  { para: '/meu-gosto', rotulo: 'Meu Gosto' },
]

export const ITENS_GUILDA: ItemDoMenu[] = [
  { para: '/guilda', rotulo: 'Guilda' },
  { para: '/clas', rotulo: 'Clãs' },
  { para: '/loja', rotulo: 'Loja' },
  { para: '/personagem', rotulo: 'Meu Personagem' },
]

/** A raiz só acende na própria raiz; as demais acendem também nas subrotas. */
export function itemAtivo(item: ItemDoMenu, caminho: string): boolean {
  const bases = [item.para, ...(item.tambem ?? [])]
  return bases.some((base) => (base === '/' ? caminho === '/' : caminho === base || caminho.startsWith(`${base}/`)))
}

const CHAVE = 'anideck:menu-lateral'

/** Lê a preferência; sem preferência (ou sem acesso ao armazenamento), o menu abre. */
export function lerMenuAberto(armazenamento: Pick<Storage, 'getItem'> | null = armazenamentoPadrao()): boolean {
  try {
    return armazenamento?.getItem(CHAVE) !== 'recolhido'
  } catch {
    return true
  }
}

export function guardarMenuAberto(aberto: boolean, armazenamento: Pick<Storage, 'setItem'> | null = armazenamentoPadrao()): void {
  try {
    armazenamento?.setItem(CHAVE, aberto ? 'aberto' : 'recolhido')
  } catch {
    // Navegação privada pode recusar a escrita: a preferência só não é lembrada.
  }
}

function armazenamentoPadrao(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}
