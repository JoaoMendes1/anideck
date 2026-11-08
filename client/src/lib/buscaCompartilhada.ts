// client/src/lib/buscaCompartilhada.ts
// Junta pedidos iguais feitos ao mesmo tempo. Quando um episódio é marcado, a pílula da
// Navbar, o card da Início e a Guilda reagem ao mesmo evento; sem isto, cada um buscaria
// o mesmo resumo por conta própria.
const emAndamento = new Map<string, Promise<unknown>>()

export function buscarUmaVez<T>(chave: string, buscar: () => Promise<T>): Promise<T> {
  const existente = emAndamento.get(chave)
  if (existente) return existente as Promise<T>
  const promessa = buscar().finally(() => emAndamento.delete(chave))
  emAndamento.set(chave, promessa)
  return promessa
}
