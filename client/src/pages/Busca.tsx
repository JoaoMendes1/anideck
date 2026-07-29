import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom' // NOVO: Para podermos clicar no anime e ir pra Issue #8
import { Search, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Updated Anime interface to include more details for display and filtering
interface Anime {
    mal_id: number
    title: string
    status: string
    episodes?: number
    score?: number
    images?: { jpg: { image_url: string } }
    genres?: { name: string }[] // For displaying genres
    streaming?: { name: string; url: string }[] // For displaying streaming links
}

export default function Busca() {

    const navigate = useNavigate()

    const handleSalvar = async (e: React.MouseEvent, malId: number) => {
        e.preventDefault() // Não deixa o clique navegar pro /anime/{id} 

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            navigate('/login') // Sem login, manda pra tela de auth em vez de tentar salvar 
            return
        }

        try {
            const response = await fetch('/api/entries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`, // Token de validação (middleware)
                },
                body: JSON.stringify({
                    mal_id: malId,
                    tipo: 'anime',
                    status: 'Quero Assistir',
                }),
            })
            if (!response.ok) throw new Error('Falha ao salvar')
            alert('Salvo na sua lista!')
        } catch (err) {
            console.error(err)
            alert('Erro ao salvar. Tente novamente!')
        }
    }

    const [query, setQuery] = useState('')
    const [selectedGenres, setSelectedGenres] = useState<string[]>([])
    const [streamingFilter, setStreamingFilter] = useState('')
    const [resultados, setResultados] = useState<Anime[]>([])
    const [loading, setLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Só limpa os resultados se TODOS os campos de filtro estiverem vazios
        if (query.trim() === '' && selectedGenres.length === 0 && streamingFilter.trim() === '') {
            setResultados([])
            setHasSearched(false)
            setError(null)
            return
        }

        const delayDebounceFn = setTimeout(async () => {
            setLoading(true)
            setHasSearched(true)
            setError(null)

            const params = new URLSearchParams()
            if (query.trim() !== '') params.append('q', query.trim())
            selectedGenres.forEach(genre => params.append('genre', genre))
            if (streamingFilter.trim() !== '') params.append('streaming', streamingFilter.trim())

            try {
                const response = await fetch(`/api/search?${params.toString()}`)

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

        return () => clearTimeout(delayDebounceFn) // Cleanup debounce
    }, [query, selectedGenres, streamingFilter]); // Add new dependencies

    // Dummy list of genres for demonstration. In a real app, this might come from an API.
    const availableGenres = [
        "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Sci-Fi", "Slice of Life",
        "Sports", "Supernatural", "Thriller", "Romance", "Mystery", "Horror", "Mecha",
        "Music", "Psychological"
    ];

    const handleGenreChange = (genre: string) => {
        setSelectedGenres(prev =>
            prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
        );
    };

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

            {/* New: Genre and Streaming Filters */}
            <div className="mb-8 flex flex-wrap gap-2">
                {availableGenres.map(genre => (
                    <button
                        key={genre}
                        onClick={() => handleGenreChange(genre)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                            selectedGenres.includes(genre) ? 'bg-holo-2 text-void' : 'bg-panel border border-line text-muted hover:border-holo-3'
                        }`}
                    >
                        {genre}
                    </button>
                ))}
                <input
                    type="text"
                    value={streamingFilter}
                    onChange={(e) => setStreamingFilter(e.target.value)}
                    placeholder="Filtrar por streaming (ex: Crunchyroll)"
                    className="flex-1 min-w-[200px] bg-panel border border-line rounded-full px-4 py-1 text-sm focus:outline-none focus:border-holo-3 transition-colors text-text placeholder:text-muted"
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
                                {anime.images?.jpg?.image_url ? (
                                    <img src={anime.images.jpg.image_url} alt={anime.title} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-panel-2 to-void z-0 group-hover:scale-105 transition-transform duration-500"></div>
                                )}

                                <div className="relative z-10">
                                    <div className="font-bold text-sm leading-tight mb-1">{anime.title}</div>
                                    <div className="font-mono text-[10px] text-muted">{anime.status}</div>
                                </div>

                                <button
                                    onClick={(e) => handleSalvar(e, anime.mal_id)}
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