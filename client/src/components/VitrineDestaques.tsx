// client/src/components/VitrineDestaques.tsx
// A vitrine dos animes curados, no topo do Meu Deck.
//
// Busca os próprios dados em vez de receber por prop: é um bloco independente do resto da
// página, e o Meu Deck já carrega deck + hidratação da AniList num efeito só. Somar mais uma
// dependência ali faria a página inteira esperar por algo que é acessório.
//
// E tem uma propriedade que importa nesta fase: a vitrine **não depende da AniList**. Título
// e capa saem de `curated_animes`, então ela continua de pé mesmo com a API fora do ar — que
// é a situação de hoje.
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { CuratedAnime } from '../types/curation'

// Quantos cabem sem a vitrine competir com o deck do usuário, que é o conteúdo principal
// da página. Passando disso ela vira a atração e não o aperitivo.
const MAX_NA_VITRINE = 12

export default function VitrineDestaques() {
  const [destaques, setDestaques] = useState<CuratedAnime[]>([])
  const [carregando, setCarregando] = useState(true)

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
      <div className="mb-10">
        <div className="h-5 w-32 rounded-full shimmer mb-5" />
        <div className="flex gap-3.5 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[124px] aspect-[3/4.2] rounded-[14px] shimmer" />
          ))}
        </div>
      </div>
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
      <div className="flex gap-3.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-5 px-5 md:mx-0 md:px-0 pb-1">
        {destaques.map((anime, index) => (
          <Link
            key={anime.id || anime.mal_id}
            to={`/anime/${anime.mal_id}`}
            className={`group relative shrink-0 w-[124px] md:w-[136px] aspect-[3/4.2] rounded-[14px] overflow-hidden border border-line bg-panel card-g${(index % 5) + 1} transition-transform hover:-translate-y-1 active:scale-[0.98]`}
          >
            {anime.custom_cover_image && (
              <img
                src={anime.custom_cover_image}
                alt={anime.custom_title}
                loading="lazy"
                onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-2.5">
              <h3 className="text-[11.5px] font-bold leading-tight line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                {anime.custom_title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
