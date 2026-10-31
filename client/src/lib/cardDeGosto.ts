// Card de gosto compartilhável: desenhado num <canvas> e exportado em PNG, no navegador,
// sem serviço externo. Cores e fontes vêm dos tokens do tema ativo, para o card conferir
// com o app. Só entra dado de quem está logado: o que a tela Meu Gosto já recebeu.

export interface RotuloDoCard {
  nome: string
  pct: number
}

export interface DadosDoCard {
  frase: string
  rotulos: RotuloDoCard[]
  horas: number
  animes: number
}

interface AfinidadeParaCard {
  genre: string
  tier?: 'demografia' | 'genero' | 'tag_tematica'
  total_watched: number
}

/** Os três rótulos mais assistidos, com o percentual sobre o total dos rótulos competitivos. */
export function rotulosDoCard(afinidade: AfinidadeParaCard[], quantos = 3): RotuloDoCard[] {
  const competitivos = afinidade
    .filter(a => (a.tier ?? 'genero') !== 'tag_tematica' && a.total_watched > 0)
    .sort((a, b) => b.total_watched - a.total_watched)
  const total = competitivos.reduce((s, a) => s + a.total_watched, 0)
  if (total === 0) return []
  return competitivos.slice(0, quantos).map(a => ({ nome: a.genre, pct: Math.round((a.total_watched / total) * 100) }))
}

/** Quebra o texto em linhas que cabem na largura, palavra por palavra. */
export function quebrarLinhas(texto: string, largura: number, medir: (t: string) => number): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (atual && medir(tentativa) > largura) {
      linhas.push(atual)
      atual = palavra
    } else {
      atual = tentativa
    }
  }
  if (atual) linhas.push(atual)
  return linhas
}

const LARGURA = 1080
const ALTURA = 1350
const MARGEM = 96

const token = (nome: string, padrao: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || padrao

/** Desenha o card e devolve o PNG. Falha (sem canvas ou sem 2D) devolve null. */
export async function gerarPngDoCard(dados: DadosDoCard): Promise<Blob | null> {
  // As fontes do app são carregadas pela folha de estilo; sem esperar, o canvas usaria
  // a fonte padrão do sistema na primeira vez.
  await document.fonts?.ready

  const canvas = document.createElement('canvas')
  canvas.width = LARGURA
  canvas.height = ALTURA
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const cor = {
    fundo: token('--color-void', '#0A0714'),
    painel: token('--color-panel', '#130F22'),
    linha: token('--color-line', '#2B2247'),
    texto: token('--color-text', '#F1EEFA'),
    apagado: token('--color-muted', '#A79BC9'),
    holo1: token('--color-holo-1', '#FF4FD8'),
    holo2: token('--color-holo-2', '#7B5CFF'),
    holo3: token('--color-holo-3', '#3FE0F0'),
  }

  ctx.fillStyle = cor.fundo
  ctx.fillRect(0, 0, LARGURA, ALTURA)

  const brilho = ctx.createRadialGradient(LARGURA * 0.85, 120, 40, LARGURA * 0.85, 120, 700)
  brilho.addColorStop(0, `${cor.holo2}55`)
  brilho.addColorStop(1, 'transparent')
  ctx.fillStyle = brilho
  ctx.fillRect(0, 0, LARGURA, ALTURA)

  const holo = ctx.createLinearGradient(MARGEM, 0, LARGURA - MARGEM, 0)
  holo.addColorStop(0, cor.holo1)
  holo.addColorStop(0.45, cor.holo2)
  holo.addColorStop(1, cor.holo3)

  let y = MARGEM + 40
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = holo
  ctx.font = "48px 'Anton', sans-serif"
  ctx.fillText('ANIDECK', MARGEM, y)
  ctx.fillStyle = cor.apagado
  ctx.font = "500 28px 'JetBrains Mono', monospace"
  ctx.fillText('MEU GOSTO', LARGURA - MARGEM - ctx.measureText('MEU GOSTO').width, y)

  y += 120
  ctx.fillStyle = cor.texto
  ctx.font = "800 60px 'Manrope', sans-serif"
  for (const linha of quebrarLinhas(dados.frase, LARGURA - MARGEM * 2, t => ctx.measureText(t).width).slice(0, 5)) {
    ctx.fillText(linha, MARGEM, y)
    y += 76
  }

  y += 50
  const larguraBarra = LARGURA - MARGEM * 2
  for (const r of dados.rotulos) {
    ctx.fillStyle = cor.texto
    ctx.font = "700 38px 'Manrope', sans-serif"
    ctx.fillText(r.nome, MARGEM, y)
    ctx.fillStyle = cor.holo3
    ctx.font = "44px 'Anton', sans-serif"
    const pct = `${r.pct}%`
    ctx.fillText(pct, LARGURA - MARGEM - ctx.measureText(pct).width, y)
    y += 24
    ctx.fillStyle = cor.painel
    ctx.fillRect(MARGEM, y, larguraBarra, 18)
    ctx.fillStyle = holo
    ctx.fillRect(MARGEM, y, Math.max(larguraBarra * (r.pct / 100), 6), 18)
    y += 90
  }

  const yRodape = ALTURA - MARGEM - 60
  ctx.strokeStyle = cor.linha
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(MARGEM, yRodape - 70)
  ctx.lineTo(LARGURA - MARGEM, yRodape - 70)
  ctx.stroke()

  const blocos = [
    { valor: `${dados.horas}h`, rotulo: 'ASSISTIDAS' },
    { valor: String(dados.animes), rotulo: 'ANIMES NO DECK' },
  ]
  blocos.forEach((b, i) => {
    const x = MARGEM + i * (larguraBarra / 2)
    ctx.fillStyle = cor.texto
    ctx.font = "64px 'Anton', sans-serif"
    ctx.fillText(b.valor, x, yRodape)
    ctx.fillStyle = cor.apagado
    ctx.font = "500 24px 'JetBrains Mono', monospace"
    ctx.fillText(b.rotulo, x, yRodape + 44)
  })

  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'))
}
