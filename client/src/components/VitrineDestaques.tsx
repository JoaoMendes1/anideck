// client/src/components/VitrineDestaques.tsx
// A vitrine dos animes curados, no topo do Meu Deck.
//
// Busca os próprios dados em vez de receber por prop: é um bloco independente do resto da
// página, e o Meu Deck já carrega deck + hidratação da AniList num efeito só. Somar mais uma
// dependência ali faria a página inteira esperar por algo que é acessório.
//
// E tem uma propriedade que importa nesta fase: a vitrine **não depende da AniList**. Título,
// capa e formato saem de `curated_animes`, então ela continua de pé mesmo com a API fora do
// ar — que é a situação de hoje. Nenhum campo aqui pode vir da AniList sem quebrar isso.
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { CuratedAnime } from '../types/curation'
import { gradienteDoCard } from '../lib/deckHelpers'
import { usePosicaoDeTrilho } from '../lib/posicaoDeLista'

const MAX_NA_VITRINE = 12

export default function VitrineDestaques() {
  const [destaques, setDestaques] = useState<CuratedAnime[]>([])
  const [carregando, setCarregando] = useState(true)

  // O trilho rola na horizontal por conta própria, então a rolagem da janela não
  // cobre a posição dele: sem isto, voltar de um destaque devolvia o carrossel ao
  // primeiro item mesmo com o resto do Meu Deck no lugar certo.
  const trilho = useRef<HTMLDivElement>(null)
  usePosicaoDeTrilho('vitrine', trilho, !carregando)

  useEffect(() => {
    let cancelado = false

    const buscar = async () => {
      try {
        const res = await fetch('/api/curation?destaques=true')
        if (!res.ok) throw new Error()
        const dados: CuratedAnime[] = await res.json()
        if (!cancelado) setDestaques((dados || []).slice(0, MAX_NA_VITRINE))
      } catch {
        // Falhar aqui não é motivo de erro na tela: a vitrine é acessória e o deck do
        // usuário, que é o conteúdo real da página, não depende dela.
        if (!cancelado) setDestaques([])
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    buscar()
    return () => { cancelado = true }
  }, [])

  if (carregando) {
    return (
      <section className="mb-10">
        <div className="h-5 w-32 rounded-full shimmer mb-5" />
        <div className="flex gap-3.5 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[140px] md:w-[158px]">
              <div className="aspect-[2/3] rounded-[14px] shimmer" />
              <div className="h-3 w-4/5 rounded-full shimmer mt-2.5" />
              <div className="h-2 w-1/3 rounded-full shimmer mt-1.5" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  // Sem destaques, a seção inteira some. Um cabeçalho sobre uma faixa vazia é pior que a
  // ausência dele — ocupa espaço e não informa nada.
  if (destaques.length === 0) return null

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-5 select-none">
        <h2 className="font-anton text-[17px] uppercase m-0">Destaques</h2>
        <span className="font-mono text-[10px] text-muted-2 uppercase tracking-widest">Seleção da casa</span>
      </div>

      {/* Mesmo padrão de rolagem do resto do Meu Deck: sangra até a borda no mobile
          (-mx-5/px-5) e vira faixa normal no md+. */}
      <div ref={trilho} className="flex gap-3.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-5 px-5 md:mx-0 md:px-0 pb-1">
        {destaques.map((anime, index) => (
          <Link
            key={anime.id || anime.mal_id}
            to={`/anime/${anime.mal_id}`}
            className="group shrink-0 w-[140px] md:w-[158px] snap-start"
          >
            {/* A proporção virou 2/3, que é a da arte de pôster: o 3/4.2 anterior
                deformava ou cortava toda capa que chegava no formato original. */}
            <div className={`relative aspect-[2/3] rounded-[14px] overflow-hidden border border-line bg-panel ${gradienteDoCard(index)} transition-transform group-hover:-translate-y-1 group-active:scale-[0.98]`}>
              {anime.custom_cover_image && (
                <img
                  src={anime.custom_cover_image}
                  alt={anime.custom_title}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
              )}

              {/* Aro interno em vez de sombra: marca a borda da arte sem escurecer a
                  capa, e vira realce holo no hover. */}
              <div className="absolute inset-0 rounded-[14px] ring-1 ring-inset ring-white/5 group-hover:ring-holo-3/40 transition-colors" />
            </div>

            {/* O título saiu de cima da capa. Sobreposto, exigia drop-shadow pesado,
                comia o terço inferior da arte e ainda assim quebrava em duas linhas
                apertadas. Embaixo, lê melhor e a capa fica limpa. */}
            <h3 className="mt-2.5 text-[12.5px] font-bold leading-tight line-clamp-2 text-text group-hover:text-holo-3 transition-colors">
              {anime.custom_title}
            </h3>

            {anime.custom_format && (
              <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-2">
                {anime.custom_format}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}