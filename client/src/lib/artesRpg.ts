// client/src/lib/artesRpg.ts
// Artes definitivas de monstros e itens, achadas pelo id. O arquivo tem o id com hífen no lugar
// do sublinhado (lamina_de_eter → lamina-de-eter.webp). Arte nova entra só pelo arquivo: o mapa
// é montado pelo Vite na build. Id sem arquivo devolve undefined, e a tela usa o ícone.

const arquivosDeItens = import.meta.glob('../assets/rpg/itens/*.webp', { eager: true, import: 'default' }) as Record<string, string>
const arquivosDeMonstros = import.meta.glob('../assets/rpg/monstros/*.webp', { eager: true, import: 'default' }) as Record<string, string>

function porId(arquivos: Record<string, string>): Record<string, string> {
  const mapa: Record<string, string> = {}
  for (const [caminho, url] of Object.entries(arquivos)) {
    const nome = caminho.split('/').pop()?.replace(/\.webp$/, '')
    if (nome) mapa[nome.replace(/-/g, '_')] = url
  }
  return mapa
}

const ARTE_DO_ITEM = porId(arquivosDeItens)
const ARTE_DO_MONSTRO = porId(arquivosDeMonstros)

export function arteDoItem(id: string | undefined): string | undefined {
  return id && Object.hasOwn(ARTE_DO_ITEM, id) ? ARTE_DO_ITEM[id] : undefined
}

export function arteDoMonstro(id: string | undefined): string | undefined {
  return id && Object.hasOwn(ARTE_DO_MONSTRO, id) ? ARTE_DO_MONSTRO[id] : undefined
}

export const IDS_COM_ARTE = { itens: Object.keys(ARTE_DO_ITEM), monstros: Object.keys(ARTE_DO_MONSTRO) }
