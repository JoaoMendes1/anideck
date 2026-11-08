// Regras da tela Início, separadas da tela para serem testadas sem navegador.

export interface EntradaDoDeck {
  mal_id: number
  status: string
}

export interface AnimeResumido {
  mal_id: number
  title: string
  image_url: string
  episodes: number
  genres?: string[]
  streaming?: { name: string; url: string }[]
  nextAiringEpisode?: { airingAt: number; episode: number }
  banner?: string
}

export interface ProgressoDoAnime {
  mal_id: number
  ultimo_episodio: number
  marcados: number
  ultimo_em?: string
}

export interface EstreiaDeHoje {
  anime: AnimeResumido
  episodio: number
  /** Instante do episódio, em milissegundos. A hora é formatada no navegador (Armadilha 3). */
  quando: number
}

export interface ParaContinuar {
  anime: AnimeResumido
  proximoEpisodio: number
  bloqueadoPorLancamento?: boolean
  semEpisodios?: boolean
}

// Status de quem ainda acompanha a obra. Completo e Dropado não têm o que estrear nem continuar.
const ACOMPANHANDO = new Set(['Assistindo', 'Em Dia', 'Quero Assistir'])

const mesmoDiaLocal = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Episódios do deck que vão ao ar hoje, no fuso de quem está olhando, em ordem de horário. */
export function estreiasDeHoje(
  entradas: EntradaDoDeck[],
  animes: Record<number, AnimeResumido>,
  agora: Date,
): EstreiaDeHoje[] {
  const lista: EstreiaDeHoje[] = []
  for (const e of entradas) {
    if (!ACOMPANHANDO.has(e.status)) continue
    const anime = animes[e.mal_id]
    const proximo = anime?.nextAiringEpisode
    if (!anime || !proximo?.airingAt) continue
    const quando = proximo.airingAt * 1000
    if (!mesmoDiaLocal(new Date(quando), agora)) continue
    lista.push({ anime, episodio: proximo.episode, quando })
  }
  return lista.sort((a, b) => a.quando - b.quando)
}

/**
 * Animes em andamento, do marcado mais recentemente para o mais antigo, com o próximo
 * episódio. Anime já terminado (último marcado = total) não entra.
 */
export function continuarAssistindo(
  progresso: ProgressoDoAnime[],
  entradas: EntradaDoDeck[],
  animes: Record<number, AnimeResumido>,
  limite = 6,
): ParaContinuar[] {
  const statusPorAnime = new Map(entradas.map(e => [e.mal_id, e.status]))
  const lista: ParaContinuar[] = []
  for (const p of progresso) {
    const status = statusPorAnime.get(p.mal_id)
    if (!status || !ACOMPANHANDO.has(status)) continue
    const anime = animes[p.mal_id]
    if (!anime) continue
    const proximoEpisodio = p.ultimo_episodio + 1
    if (anime.episodes > 0 && proximoEpisodio > anime.episodes) continue
    const bloqueadoPorLancamento = Boolean(
      anime.nextAiringEpisode?.episode && proximoEpisodio >= anime.nextAiringEpisode.episode,
    )
    const semEpisodios = anime.episodes <= 0
    lista.push({ anime, proximoEpisodio, bloqueadoPorLancamento, semEpisodios })
    if (lista.length >= limite) break
  }
  return lista
}

export interface DiaDaSemana {
  /** Meia-noite local do dia. */
  data: Date
  /** "Hoje", "Amanhã" ou o dia da semana abreviado ("sex."). */
  rotulo: string
  estreias: EstreiaDeHoje[]
}

/**
 * Os próximos `dias` dias a partir de hoje, cada um com os episódios do deck que vão ao ar
 * nele. A AniList só informa o próximo episódio de cada obra, então cada anime aparece no
 * máximo uma vez na semana.
 */
export function semanaDoDeck(
  entradas: EntradaDoDeck[],
  animes: Record<number, AnimeResumido>,
  agora: Date,
  dias = 7,
): DiaDaSemana[] {
  const semana: DiaDaSemana[] = []
  for (let i = 0; i < dias; i++) {
    const data = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + i)
    const rotulo = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : data.toLocaleDateString('pt-BR', { weekday: 'short' })
    semana.push({ data, rotulo, estreias: estreiasDeHoje(entradas, animes, data) })
  }
  return semana
}

/**
 * O destaque do topo da Início: o primeiro anime em andamento que já tem o próximo episódio
 * liberado. Sem nenhum, a tela volta para o carrossel de destaques da curadoria.
 */
export function proximoEpisodioEmDestaque(lista: ParaContinuar[]): ParaContinuar | null {
  return lista.find(c => !c.bloqueadoPorLancamento && !c.semEpisodios) ?? null
}
