import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom' // NOVO: Para podermos clicar no anime e ir pra Issue #8
import { Search, AlertCircle } from 'lucide-react' 

interface Anime {
    mal_id: number
    title: string
    status: string
}

export default function Busca() {
    const [query, setQuery] = useState('') 
    const [resultados, setResultados] = useState<Anime[]>([]) 
    const [loading, setLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false) 
    const [error, setError] = useState<string | null>(null) // NOVO: Faltava isso no seu código!

    useEffect(() => {
        if (query.trim() === '') {
            setResultados([])
            setHasSearched(false)
            setError(null)
            return
        }

        const delayDebounceFn = setTimeout(async() => {
            setLoading(true)
            setHasSearched(true)
            setError(null)

            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)

                // SE DER 503, DISPARA O ERRO REAL PARA A TELA
                if (!response.ok) {
                    throw new Error('Busca indisponível no momento. Tente novamente mais tarde.')
                }

                const data = await response.json()
                setResultados(data.data || [])
            } catch (err: any) {
                console.error(err)
                setResultados([]) 
                setError(err.message || 'Falha ao conectar com o servidor.') // SALVA O ERRO
            } finally {
                setLoading(false)
            }
        }, 400)

        return () => clearTimeout(delayDebounceFn)
    }, [query]); 
    
    return (
        <div className="max-w-[960px] mx-auto pt-16 px-5 pb-10">
            <div className="flex items-center gap-3 bg-panel border-2 border-holo-2 rounded-xl p-4 mb-8">
                <Search className="text-muted-2" size={20} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar anime, gênero, estúdio..."
                    className="bg-transparent border-none outline-none text-text text-base w-full font-manrope placeholder:text-muted-2"
                />
            </div>

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

            {/* Estado 2: ERRO REAL (A correção da foto que você mandou) */}
            {!loading && error && (
                <div className="text-center py-16 text-coral">
                    <AlertCircle className="mx-auto mb-4 opacity-80" size={34} />
                    <h3 className="font-anton uppercase text-xl mb-2">Ops, problema de conexão</h3>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Estado 3: Com Resultados + Links da Issue 8 */}
            {!loading && !error && hasSearched && resultados.length > 0 && (
                <>
                <p className="font-mono text-xs text-holo-3 tracking-widest mb-4">// RESULTADOS</p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {resultados.map((anime) => (
                    
                    <Link 
                        to={`/anime/${anime.mal_id}`} 
                        key={anime.mal_id} 
                        className="relative aspect-[2/3] rounded-xl overflow-hidden border border-line bg-panel flex flex-col justify-end p-3 group block"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-panel-2 to-void z-0 group-hover:scale-105 transition-transform duration-500"></div>

                        <div className="relative z-10">
                            <div className="font-bold text-sm leading-tight mb-1">{anime.title}</div>
                            <div className="font-mono text-[10px] text-muted">{anime.status}</div>
                        </div>

                        <button 
                            onClick={(e) => {
                                e.preventDefault() 
                                alert('Funcionalidade de Salvar virá na Issue #9!')
                            }}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-void/70 border-2 border-white/40 text-white font-bold backdrop-blur-sm hover:bg-gradient-to-r hover:from-holo-1 hover:to-holo-2 hover:border-transparent transition-all z-20"
                        >
                        +
                        </button>
                    </Link>

                    ))}
                </div>
                </>
            )}

            {/* Estado 4: Sem Resultados (Busca OK, mas array vazio) */}
            {!loading && !error && hasSearched && resultados.length === 0 && (
                <div className="text-center py-16 text-muted">
                    <Search className="mx-auto mb-4 text-muted-2" size={34} />
                    <h3 className="font-anton uppercase text-text text-xl mb-2">Nada encontrado</h3>
                    <p className="text-sm">Confira a grafia ou tente termos diferentes.</p>
                </div>
            )}

            {/* Estado 5: Vazio inicial */}
            {!loading && !error && !hasSearched && (
                <div className="text-center py-16">
                    <h3 className="font-anton uppercase text-text text-xl mb-2">Descubra novos animes</h3>
                    <p className="text-sm text-muted">Comece a digitar acima para buscar em todo o catálogo.</p>
                </div>
            )}
        </div>
    )
}