import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import Sheet from './Sheet'

interface Entrada {
    id: string
    mal_id: number
    tipo: string
    status: string
    nota?: number | null
    anotacao?: string
    is_favorite?: boolean
}

interface Props {
    entrada: Entrada | null
    onFechar: () => void
    onSalvar: (atualizada: Entrada) => void
    onExcluir: (id: string) => void
}

const STATUS_OPCOES = ['Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado']

export default function EditarEntradaModal({ entrada, onFechar, onSalvar, onExcluir }: Props) {
    const { showToast } = useToast()
    const isOpen = entrada !== null

    const [entradaCache, setEntradaCache] = useState<Entrada | null>(null)
    const [status, setStatus] = useState('')
    const [nota, setNota] = useState('')
    const [anotacao, setAnotacao] = useState('')
    const [isFavorite, setIsFavorite] = useState(false)

    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

    // Toda vez que o modal é aberto com um novo anime, limpamos tudo
    useEffect(() => {
        if (entrada) {
            setEntradaCache(entrada)
            setStatus(entrada.status)
            setNota(entrada.nota !== null && entrada.nota !== undefined ? entrada.nota.toString() : '')
            setAnotacao(entrada.anotacao || '')
            setIsFavorite(entrada.is_favorite || false)
            setErro(null)
            
            // Garante que a tela de confirmação e o spinner sumam ao iniciar
            setConfirmandoExclusao(false)
            setSalvando(false)
        }
    }, [entrada])

    const handleSalvar = async () => {
        if (!entradaCache) return
        setSalvando(true)
        setErro(null)

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const notaFormatada = nota.trim() === '' ? null : Number(nota.replace(',', '.'))

        try {
            const response = await fetch(`/api/entries/${entradaCache.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    mal_id: entradaCache.mal_id,
                    tipo: entradaCache.tipo || 'anime',
                    status,
                    nota: Number.isNaN(notaFormatada) ? null : notaFormatada,
                    anotacao,
                    is_favorite: isFavorite
                }),
            })

            if (!response.ok) throw new Error('Falha ao salvar')

            const atualizada = await response.json()
            onSalvar(Array.isArray(atualizada) ? atualizada[0] : atualizada)
            showToast('Alterações salvas com sucesso!')
            onFechar()
        } catch (err) {
            setErro('Não foi possível salvar. Tente de novo.')
            setSalvando(false)
        }
    }

    const handleExcluir = async () => {
        if (!entradaCache) return
        setSalvando(true)
        setErro(null)

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            setSalvando(false)
            return
        }

        try {
            const response = await fetch(`/api/entries/${entradaCache.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            })
            if (!response.ok) throw new Error('Falha ao excluir')
            
            onExcluir(entradaCache.id)
            showToast('Anime removido do seu Deck.')
            
            // Quando a API dá sucesso, nós APENAS mandamos o modal fechar.
            // O próprio ato de fechar destrói o componente de forma limpa.
            onFechar() 
        } catch (err) {
            setErro('Não foi possível excluir. Tente de novo.')
            setSalvando(false)
        }
    }

    return (
        <Sheet 
            isOpen={isOpen} 
            onClose={() => { if (!salvando) onFechar() }} 
            title={confirmandoExclusao ? "Remover anime?" : "Editar entrada"}
        >
            {/* CONDIÇÃO: Se o usuário clicou em excluir, mostramos apenas esta tela dentro do Modal */}
            {confirmandoExclusao ? (
                <div className="text-center py-4">
                    <p className="text-sm text-muted mb-8">Tem certeza que deseja remover este anime do seu Deck? Esta ação não pode ser desfeita.</p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={() => setConfirmandoExclusao(false)} 
                            disabled={salvando} 
                            className="flex-1 px-4 py-3 rounded-xl border border-line text-sm font-bold cursor-pointer hover:border-muted transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleExcluir} 
                            disabled={salvando} 
                            className="flex-1 px-4 py-3 rounded-xl bg-coral/10 border border-coral text-coral text-sm font-bold cursor-pointer hover:bg-coral hover:text-void transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                            {salvando ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                'Sim, remover'
                            )}
                        </button>
                    </div>
                </div>
            ) : entradaCache && (
                <>
                    {/* FORMULÁRIO PADRÃO DE EDIÇÃO */}
                    <button
                        type="button"
                        onClick={() => setIsFavorite(!isFavorite)}
                        className={`absolute top-6 right-14 text-[22px] transition-all cursor-pointer ${isFavorite ? 'text-coral drop-shadow-[0_0_8px_rgba(255,92,108,0.6)] scale-110' : 'text-muted hover:text-text hover:scale-110'}`}
                        title={isFavorite ? 'Remover dos Favoritos' : 'Marcar como Favorito (Carta Rara)'}
                    >
                        {isFavorite ? '❤️' : '🤍'}
                    </button>

                    <div className="mb-6">
                        <label className="block text-[11px] font-bold text-muted mb-2.5 uppercase tracking-wide select-none">Status</label>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPCOES.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setStatus(opt)}
                                    className={`select-none px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border ${
                                        status === opt
                                            ? 'bg-holo-2/20 border-holo-2 text-holo-2 shadow-[0_0_10px_rgba(123,92,255,0.2)]'
                                            : 'bg-panel-2 border-line text-muted hover:border-holo-2 hover:text-text'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-[11px] font-bold text-muted uppercase tracking-wide select-none">Nota (0-10)</label>
                        {nota !== '' && (
                            <button type="button" onClick={() => setNota('')} title="Limpar nota" className="select-none text-[10px] font-bold text-coral hover:text-coral/80 uppercase cursor-pointer">
                                Limpar
                            </button>
                        )}
                    </div>
                    <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        placeholder="Sem nota"
                        className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm mb-4 outline-none focus:border-holo-3 transition-colors"
                    />

                    <label className="block text-[11px] font-bold text-muted uppercase tracking-wide mb-2 select-none">Anotação</label>
                    <textarea
                        value={anotacao}
                        onChange={(e) => setAnotacao(e.target.value)}
                        placeholder="O que achou deste anime?"
                        className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm mb-2 min-h-[100px] outline-none focus:border-holo-3 transition-colors resize-none"
                    />

                    {erro && <p className="text-coral text-xs mb-3 font-bold">{erro}</p>}

                    <div className="flex justify-end gap-2 mt-4 select-none">
                        <button
                            type="button"
                            onClick={() => setConfirmandoExclusao(true)}
                            className="px-4 py-2.5 rounded-xl border border-coral/30 text-coral text-sm font-bold mr-auto cursor-pointer hover:bg-coral/10 transition-colors"
                        >
                            Excluir
                        </button>
                        <button
                            type="button"
                            onClick={handleSalvar}
                            disabled={salvando}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-holo-1 to-holo-2 text-void text-sm font-extrabold cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                        >
                            {salvando ? (
                                <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin"></div>
                            ) : (
                                'Salvar'
                            )}
                        </button>
                    </div>
                </>
            )}
        </Sheet>
    )
}