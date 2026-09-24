// client/src/lib/cacheDeTela.ts
// Guarda, em memória, os últimos dados de cada tela. Quem volta a uma tela já visitada
// vê na hora o que ela mostrava, enquanto a versão nova é buscada por trás e troca os
// dados quando chega (o padrão se chama stale-while-revalidate).
//
// Antes, cada visita ao Meu Deck refazia /api/entries e /api/anime/bulk do zero e
// mostrava o skeleton no meio: era a "demora de um pouquinho" em toda troca de página.
//
// Vive em memória de módulo, como o posicaoDeLista.ts, e pelo mesmo motivo: sobrevive
// à navegação dentro do app e some num F5, que é quando o usuário espera dado novo.
//
// As chaves de dado pessoal levam o id do usuário (ver chaveDoUsuario). Sem isso, quem
// trocasse de conta na mesma aba veria por um instante o deck da conta anterior.
const memoria = new Map<string, unknown>()

export function chaveDoUsuario(userId: string | undefined, tela: string): string | null {
  return userId ? `${userId}:${tela}` : null
}

export function lerDaMemoria<T>(chave: string | null): T | undefined {
  return chave ? (memoria.get(chave) as T | undefined) : undefined
}

export function guardarNaMemoria<T>(chave: string | null, dados: T): void {
  if (chave) memoria.set(chave, dados)
}
