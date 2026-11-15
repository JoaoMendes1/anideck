// client/src/lib/graficos.ts
// Contas dos gráficos do Meu Gosto, separadas dos componentes para teste.

/** De quantos em quantos rótulos mostrar para que não se sobreponham. */
export function passoDosRotulos(quantidade: number, larguraTotal: number, larguraDoRotulo: number): number {
  if (quantidade <= 0 || larguraTotal <= 0) return 1
  const porItem = larguraTotal / quantidade
  return Math.max(1, Math.ceil(larguraDoRotulo / porItem))
}

export interface FaixaDeNota {
  /** Parte inteira da nota: a faixa "8" cobre de 8,0 a 8,9. */
  faixa: number
  total: number
  /** Notas exatas que caíram na faixa, para buscar os animes de cada uma. */
  notas: number[]
}

/**
 * Agrupa as notas pela parte inteira. Quem avalia com decimais (6,8; 6,9; 7; 7,5) gerava
 * uma coluna por valor, com larguras e vizinhanças sem sentido; por faixa, a forma da
 * distribuição aparece. Devolve todas as faixas entre a menor e a maior, inclusive vazias.
 */
export function agruparNotas(notas: { nota: number; total: number }[]): FaixaDeNota[] {
  const validas = notas.filter(n => Number.isFinite(n.nota) && n.total > 0)
  if (validas.length === 0) return []
  const porFaixa = new Map<number, FaixaDeNota>()
  for (const n of validas) {
    const faixa = Math.min(10, Math.max(0, Math.floor(n.nota)))
    const atual = porFaixa.get(faixa) ?? { faixa, total: 0, notas: [] }
    atual.total += n.total
    atual.notas.push(n.nota)
    porFaixa.set(faixa, atual)
  }
  const menor = Math.min(...porFaixa.keys())
  const maior = Math.max(...porFaixa.keys())
  const saida: FaixaDeNota[] = []
  for (let f = menor; f <= maior; f++) saida.push(porFaixa.get(f) ?? { faixa: f, total: 0, notas: [] })
  return saida
}

/** Preenche os anos sem anime entre o primeiro e o último, para o eixo do tempo ser contínuo. */
export function preencherAnos(anos: { season_year: number; total: number }[]): { season_year: number; total: number }[] {
  const validos = anos.filter(a => a.season_year > 0)
  if (validos.length === 0) return []
  const porAno = new Map(validos.map(a => [a.season_year, a.total]))
  const menor = Math.min(...porAno.keys())
  const maior = Math.max(...porAno.keys())
  const saida = []
  for (let ano = menor; ano <= maior; ano++) saida.push({ season_year: ano, total: porAno.get(ano) ?? 0 })
  return saida
}

export interface Ponto { x: number; y: number }

/**
 * Caminho SVG de uma linha suave pelos pontos. Cada trecho é uma curva com tangentes
 * horizontais: não passa acima do maior valor nem abaixo do menor, como uma spline comum faria.
 */
export function caminhoSuave(pontos: Ponto[]): string {
  if (pontos.length === 0) return ''
  const p = (n: number) => Number(n.toFixed(1))
  let d = `M${p(pontos[0].x)},${p(pontos[0].y)}`
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1]
    const b = pontos[i]
    const meio = (a.x + b.x) / 2
    d += ` C${p(meio)},${p(a.y)} ${p(meio)},${p(b.y)} ${p(b.x)},${p(b.y)}`
  }
  return d
}
