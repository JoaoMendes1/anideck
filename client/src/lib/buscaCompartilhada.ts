// client/src/lib/buscaCompartilhada.ts
// Junta pedidos iguais. Quando um episódio é marcado, a pílula da Navbar, o painel da
// Início e a Guilda reagem ao mesmo evento; sem isto, cada um buscaria o mesmo resumo por
// conta própria. Com validadeMs, também reaproveita uma resposta recém-chegada: a página
// carrega depois da Navbar e pediria de novo o que ela acabou de receber.
const emAndamento = new Map<string, Promise<unknown>>()
const recentes = new Map<string, { em: number; valor: unknown }>()

/** Janela em que um componente que acabou de montar aceita a resposta de outro. */
export const VALIDADE_NA_MONTAGEM = 10_000

/**
 * validadeMs = 0 (padrão) sempre consulta o servidor, juntando só pedidos simultâneos: é o
 * que um evento de "algo mudou" precisa. Acima de zero, aceita resposta com até essa idade.
 */
export function buscarUmaVez<T>(chave: string, buscar: () => Promise<T>, validadeMs = 0): Promise<T> {
  if (validadeMs > 0) {
    const recente = recentes.get(chave)
    if (recente && Date.now() - recente.em < validadeMs) return Promise.resolve(recente.valor as T)
  }
  const existente = emAndamento.get(chave)
  if (existente) return existente as Promise<T>
  const promessa = buscar()
    .then((valor) => {
      recentes.set(chave, { em: Date.now(), valor })
      return valor
    })
    .finally(() => emAndamento.delete(chave))
  emAndamento.set(chave, promessa)
  return promessa
}

/** Só para testes: esquece as respostas guardadas. */
export function esquecerBuscasRecentes(): void {
  recentes.clear()
}
