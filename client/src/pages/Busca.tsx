import { useState, useEffect } from 'react'
import { Search } from 'lucide-react' 

// Definimos o "formato" (Interface) do dado que o nosso Go vai nos devolver
interface Anime {
    mal_id: number
    title: string
    status: string
}

export default function Busca() {
    // 1. Estados da aplicação 
    const [query, setQuery] = useState('') // O que o usuário digitou
    const [resultados, setResultados] = useState<Anime[]>([]) // A lista de animes
    const [loading, setLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false) // Para sabermos se a tela está ""

    // 2. Coração
    // O useEffect "escuta" a variável 'query'. Toda vez que o usuário digita uma letra, ele roda.
    useEffect(() => {
        // Se o campor estiver vazio, limpamos a tela e paramos. 
        if (query.trim() === '') {
            setResultados([])
            setHasSearched(false)
            return
        }

        // "timer" de 4000ms. 
        const delayDebounceFn = setTimeout(async() => {
            setLoading(true)
            setHasSearched(true)

            try {
                // O react chama o backend Go (que por sua vez chama o Jikan)
                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)

                if (!response.ok) throw new Error('Falha na busca')

                    const data = await response.json()
                    setResultados(data.data || [])
            } catch (error) {
                console.error(error)
                setResultados([]) // Em caso de erro mostrar a tela de "Sem resultados"
            } finally {
                setLoading(false)
            }
        }, 400) // Espera 400 milissegundos

        // Função de limpeza: Se o usuário digitar outra letra ANTES dos 400ms,
        // o React cancela o timer anterior e recomeça a contagem. É isso que salva nossa API!
        return () => clearTimeout(delayDebounceFn)
    }, [query]); // O array de dependências diz: "Só rode isso se o 'query' mudar"
    
    return (
        <div className="max-w-[960px] mx-auto pt-16 px-5 pb-10">
            {/* Barra de busca baseada no designs tokens */}
            <div className="flex items-center gap-3 bg-panel border-2 border-holo2 rounded-xl p-4 mb-8">
                <Search className="text-muted-2" size={20} />
                 <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar anime, gênero, estúdio..."
          className="bg-transparent border-none outline-none text-text text-base w-full font-manrope placeholder:text-muted-2"
        />
            </div>
            {/* RENDERIZAÇÃO CONDICIONAL: Qual dos 4 estados devemos mostrar? */}

            {/* Estado 1: Carregando (Skeleton) */}

            {loading && (
                <> 
                <p className="font-mono text-xs text-holo-3 tracking-widest mb-4">// BUSCANDO...</p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="aspect-[2/3] rounded-xl bg-panel-2 animate-pulse border border-line"></div>
            ))}
                </div>             
                 </>
            )}

             {/* Estado 2: Com Resultados */}
      {!loading && hasSearched && resultados.length > 0 && (
        <>
          <p className="font-mono text-xs text-holo-3 tracking-widest mb-4">// RESULTADOS</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {resultados.map((anime) => (
              <div key={anime.mal_id} className="relative aspect-[2/3] rounded-xl overflow-hidden border border-line bg-panel flex flex-col justify-end p-3">
                {/* O fundo do card. Depois trocaremos pela imagem oficial da Jikan */}
                <div className="absolute inset-0 bg-gradient-to-br from-panel-2 to-void z-0"></div>

                <div className="relative z-10">
                  <div className="font-bold text-sm leading-tight mb-1">{anime.title}</div>
                  <div className="font-mono text-[10px] text-muted">{anime.status}</div>
                </div>

                {/* Botão de adicionar (+) flutuante */}
                <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-void/70 border-2 border-white/40 text-white font-bold backdrop-blur-sm hover:bg-gradient-to-r hover:from-holo-1 hover:to-holo-2 hover:border-transparent transition-all z-20">
                  +
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      
      {/* Estado 3: Sem Resultados */}
      {!loading && hasSearched && resultados.length === 0 && (
        <div className="text-center py-16 text-muted">
          <Search className="mx-auto mb-4 text-muted-2" size={34} />
          <h3 className="font-anton uppercase text-text text-xl mb-2">Nada encontrado</h3>
          <p className="text-sm">Confira a grafia ou tente termos diferentes.</p>
        </div>
      )}

       {/* Estado 4: Vazio (Antes de buscar) */}
      {!loading && !hasSearched && (
        <div className="text-center py-16">
          <h3 className="font-anton uppercase text-text text-xl mb-2">Descubra novos animes</h3>
          <p className="text-sm text-muted">Comece a digitar acima para buscar em todo o catálogo.</p>
        </div>
      )}

        </div>
    )
}