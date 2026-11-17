// client/src/lib/bemVindo.ts
// Regras da configuração inicial (/bem-vindo) que não dependem da tela.

export const PASSOS_BEM_VINDO = ['perfil', 'assistindo', 'gosto', 'personagem', 'recompensa'] as const
export type PassoBemVindo = (typeof PASSOS_BEM_VINDO)[number]

/** Sugere um @ a partir do nome: minúsculas, sem acento, só letras, números e _ (3 a 20). */
export function sugerirHandle(nome: string): string {
  const limpo = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20)
  return limpo.length >= 3 ? limpo : ''
}

/**
 * A configuração inicial abre sozinha só para quem a tem pendente: contas criadas depois que
 * ela entrou no ar recebem a marca no cadastro. Quem já usava o AniDeck nunca é levado para lá.
 */
export function precisaDaConfiguracaoInicial(metadados: Record<string, unknown> | undefined): boolean {
  return metadados?.configuracao_inicial === 'pendente'
}
