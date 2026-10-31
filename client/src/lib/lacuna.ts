// "O buraco no seu gosto": o rótulo que a pessoa avalia bem e quase não assiste.
//
// Usa os mesmos cortes do QuadranteAfinidade, para o bloco da Início e o gráfico do
// Meu Gosto concordarem: nota acima da média pessoal e volume até a metade do maior.

export interface AfinidadeComNota {
  genre: string
  tier?: 'demografia' | 'genero' | 'tag_tematica'
  total_watched: number
  media_nota_genero: number | null
}

export interface Lacuna {
  rotulo: string
  nota: number
  vistos: number
  mediaPessoal: number
}

/** Abaixo disto, a nota do rótulo é de um anime só e não sustenta conclusão. */
export const ANIMES_MINIMOS_NO_ROTULO = 2

/** Mínimo de rótulos avaliados para haver com o que comparar (o quadrante pede três). */
const ROTULOS_MINIMOS = 3

export function encontrarLacuna(afinidade: AfinidadeComNota[], notaMedia: number): Lacuna | null {
  const avaliados = afinidade
    .filter(a => (a.tier ?? 'genero') !== 'tag_tematica')
    .filter(a => a.media_nota_genero !== null && a.media_nota_genero !== undefined)
  if (avaliados.length < ROTULOS_MINIMOS || notaMedia <= 0) return null

  const maxVolume = Math.max(...avaliados.map(a => a.total_watched))
  const corteVolume = maxVolume / 2

  const candidatos = avaliados
    .filter(a => (a.media_nota_genero as number) > notaMedia)
    .filter(a => a.total_watched >= ANIMES_MINIMOS_NO_ROTULO && a.total_watched <= corteVolume)
    .sort((a, b) => (b.media_nota_genero as number) - (a.media_nota_genero as number) || a.total_watched - b.total_watched)

  const escolhido = candidatos[0]
  if (!escolhido) return null
  return {
    rotulo: escolhido.genre,
    nota: escolhido.media_nota_genero as number,
    vistos: escolhido.total_watched,
    mediaPessoal: notaMedia,
  }
}
