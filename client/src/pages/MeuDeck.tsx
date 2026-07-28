import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import EditarEntradaModal from '../components/EditarEntradaModal'

interface Entrada {
    id: string
    mal_id: number
    tipo: string
    status: string
    nota?: number
    anotacao?: string
}

export default function MeuDeck() {
    const [entradas, setEntradas] = useState<Entrada[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [editando, setEditando] = useState<Entrada | null>(null)

    useEffect(() => {
        const carregarDeck = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            try {
                const response = await fetch('/api/entries', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                })
                if (!response.ok) throw new Error('Não foi possível carregar seu deck.')
                const data = await response.json()
                setEntradas(data || [])
            } catch (err) {
                setError('Não foi possível carregar seu deck. Tente novamente.')
            } finally {
                setLoading(false)
            }
        }

        carregarDeck()
    }, [])

    if (loading) return <div className="p-10 text-center text-muted font-mono text-sm">Carregando seu deck...</div>
    if (error) return <div className="p-10 text-center text-coral font-mono text-sm">{error}</div>

    return (
        <div className="p-6">
            <h1 className="text-2xl font-anton text-green mb-6">Meu Deck</h1>
            
            {entradas.length === 0 ? (
                <p className="text-muted text-sm">Nada salvo ainda — busque um anime e clique no "+" pra começar.</p>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {entradas.map((entrada) => (
                        <div
                            key={entrada.id}
                            onClick={() => setEditando(entrada)}
                            className="bg-panel border border-line rounded-xl p-4 cursor-pointer hover:border-holo-2 transition-colors relative"
                        >
                            <div className="font-mono text-[10px] text-muted mb-1">MAL ID: {entrada.mal_id}</div>
                            <div className="font-bold text-sm text-holo-3">{entrada.status}</div>
                            {entrada.nota && <div className="text-xs text-gold mt-1">★ {entrada.nota}</div>}
                            
                            <Link 
                                to={`/anime/${entrada.mal_id}`} 
                                onClick={(e) => e.stopPropagation()} 
                                className="absolute top-2 right-2 text-xs text-muted hover:text-text"
                            >
                                Ver ↗
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {editando && (
                <EditarEntradaModal
                    entrada={editando}
                    onFechar={() => setEditando(null)}
                    onSalvar={(atualizada) => {
                        setEntradas((prev) => prev.map((e) => (e.id === atualizada.id ? atualizada : e)))
                    }}
                    onExcluir={(id) => {
                        setEntradas((prev) => prev.filter((e) => e.id !== id))
                    }}
                />
            )}
        </div>
    )
}