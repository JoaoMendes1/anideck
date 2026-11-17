// client/src/lib/menuLateral.ts
// Preferência de recolher o menu lateral do desktop, guardada no navegador. Os itens do
// menu ficam em lib/navegacao.ts.

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
