// Frase de abertura da tela Meu Gosto, montada dos percentuais de afinidade.
//
// Só Demografias e Gêneros entram na conta, como no card "Gênero Favorito": tag temática
// aparece em quase todo anime e achataria os percentuais.

export interface AfinidadeParaVeredito {
  genre: string
  tier?: 'demografia' | 'genero' | 'tag_tematica'
  total_watched: number
}

export type TipoDePerfil = '' | 'especialista' | 'explorador' | 'equilibrado'

/** Abaixo disto, qualquer conclusão sobre gosto é ruído. */
export const ANIMES_MINIMOS_PARA_VEREDITO = 10

export type Veredito =
  | { pronto: false; faltam: number }
  | { pronto: true; frase: string }

const pct = (parte: number, total: number) => Math.round((parte / total) * 100)

export function montarVeredito(
  afinidade: AfinidadeParaVeredito[],
  perfil: TipoDePerfil,
  animesConsiderados: number,
): Veredito {
  const competitivos = afinidade
    .filter(a => (a.tier ?? 'genero') !== 'tag_tematica' && a.total_watched > 0)
    .sort((a, b) => b.total_watched - a.total_watched)
  const total = competitivos.reduce((soma, a) => soma + a.total_watched, 0)

  if (animesConsiderados < ANIMES_MINIMOS_PARA_VEREDITO || competitivos.length === 0 || total === 0) {
    return { pronto: false, faltam: Math.max(ANIMES_MINIMOS_PARA_VEREDITO - animesConsiderados, 1) }
  }

  const [primeiro, segundo] = competitivos
  const pPrimeiro = pct(primeiro.total_watched, total)

  if (!segundo) {
    return { pronto: true, frase: `Seu gosto hoje é ${primeiro.genre}: ${pPrimeiro}% do que você assiste.` }
  }

  const pSegundo = pct(segundo.total_watched, total)

  if (perfil === 'especialista') {
    return {
      pronto: true,
      frase: `Você é especialista: ${primeiro.genre} e ${segundo.genre} são ${pPrimeiro + pSegundo}% do que você assiste.`,
    }
  }
  if (perfil === 'explorador') {
    return {
      pronto: true,
      frase: `Você é explorador: nem ${primeiro.genre}, o que você mais assiste, passa de ${pPrimeiro}% do seu deck.`,
    }
  }
  return {
    pronto: true,
    frase: `${primeiro.genre} lidera o seu gosto com ${pPrimeiro}%, seguido de ${segundo.genre} com ${pSegundo}%.`,
  }
}
