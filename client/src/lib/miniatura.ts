// client/src/lib/miniatura.ts
// Troca a capa curada original pela miniatura servida pelo Go (/api/miniatura).
//
// A capa curada sai do upload com até 600 px e 300 KB, e os cards a exibem com uns
// 150 px de largura. No Lighthouse de produção, eram 1,3 MB de imagem a mais do que a
// tela precisava. A miniatura tem 400 px (nítida em tela de alta densidade) e poucas
// dezenas de KB, e fica um ano no cache do navegador.
//
// Só capas do bucket `curadoria` passam por aqui. As da AniList já vêm no tamanho
// `large`, pequeno, e voltam intactas. Detalhes continua usando a original: lá a capa
// é grande na tela.
const PREFIXO_DA_CURADORIA = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/curadoria/`

export function miniatura(url: string | undefined): string | undefined {
  if (!url || !url.startsWith(PREFIXO_DA_CURADORIA)) return url
  return `/api/miniatura/${url.slice(PREFIXO_DA_CURADORIA.length)}`
}
