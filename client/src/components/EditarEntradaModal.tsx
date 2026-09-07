import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import Sheet from './Sheet'

interface Entrada {
    id?: string
    mal_id: number
    tipo: string
    status: string
    nota?: number | null
    anotacao?: string
    is_favorite?: boolean
}
type EntradaSalva = Entrada & { id: string }

interface Props {
    entrada: Entrada | null
    onFechar: () => void
    onSalvar: (atualizada: EntradaSalva) => void
    onExcluir: (id: string) => void
    totalEpisodiosAssistidos?: number
    onEpisodiosLimpos?: () => void
}

const STATUS_OPCOES = ['Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado']

export default function EditarEntradaModal({ entrada, onFechar, onSalvar, onExcluir, totalEpisodiosAssistidos = 0, onEpisodiosLimpos }: Props) {
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
    const [confirmandoZerarEpisodios, setConfirmandoZerarEpisodios] = useState(false)

    const [entradaAnterior, setEntradaAnterior] = useState<Entrada | null>(null)

    if (entrada !== entradaAnterior) {
        setEntradaAnterior(entrada)

        if (entrada) {
            setEntradaCache(entrada)
            setStatus(entrada.status)
            setNota(entrada.nota !== null && entrada.nota !== undefined ? entrada.nota.toString() : '')
            setAnotacao(entrada.anotacao || '')
            setIsFavorite(entrada.is_favorite || false)

            // Garante que inicie limpo
            setErro(null)
            setConfirmandoExclusao(false)
            setConfirmandoZerarEpisodios(false)
            setSalvando(false)
        } else {
            // Limpeza total de estados quando a janela fechar
            setConfirmandoExclusao(false)
            setConfirmandoZerarEpisodios(false)
            setSalvando(false)
            setErro(null)
        }
    }

    const handleSalvar = async () => {
        if (!entradaCache) return

        // Intercepta a mudança para "Quero Assistir" se o usuário tiver episódios registrados
        const trocouParaQueroAssistir = entradaCache.status !== 'Quero Assistir' && status === 'Quero Assistir'
        if (trocouParaQueroAssistir && totalEpisodiosAssistidos > 0) {
            setConfirmandoZerarEpisodios(true)
            return
        }

        await executarSalvamento(false)
    }

    const executarSalvamento = async (zerarEpisodios: boolean) => {
        if (!entradaCache) return
        setSalvando(true)
        setErro(null)

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            setSalvando(false)
            return
        }

        try {
            // Se o usuário optou por zerar os episódios marcados por engano
            if (zerarEpisodios) {
                const resClear = await fetch(`/api/entries/${entradaCache.mal_id}/episodes`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
                if (!resClear.ok) throw new Error('Falha ao zerar episódios')
                onEpisodiosLimpos?.()
            }

            const notaFormatada = nota.trim() === '' ? null : Number(nota.replace(',', '.'))
            const isNova = !entradaCache.id

            const response = await fetch(isNova ? '/api/entries' : `/api/entries/${entradaCache.id}`, {
                method: isNova ? 'POST' : 'PUT',
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
            showToast(isNova ? 'Adicionado ao seu Deck!' : 'Alterações salvas com sucesso!')
            setConfirmandoZerarEpisodios(false)
            onFechar()
        } catch {
            setErro('Não foi possível salvar. Tente de novo.')
        } finally {
            setSalvando(false)
        }
    }

    const handleExcluir = async () => {
        // Guarda o id numa variável local: além de proteger em tempo de execução,
        // o TypeScript passa a saber que aqui ele é string, não string | undefined.
        const id = entradaCache?.id
        if (!id) return
        setSalvando(true)
        setErro(null)

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            setSalvando(false)
            return
        }

        try {
            const response = await fetch(`/api/entries/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            })
            if (!response.ok) throw new Error('Falha ao excluir')

            onExcluir(id)
            showToast('Anime removido do seu Deck.')
            onFechar()
        } catch {
            setErro('Não foi possível excluir. Tente de novo.')
            setSalvando(false)
        }
    }

    // 🎨 O DESIGN PREMIUM ESTÁ DE VOLTA AQUI
    const modalConfirmacao = confirmandoExclusao ? createPortal(
        <div className="fixed inset-0 bg-void/80 flex items-center justify-center z-[120] p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-panel border border-coral/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="font-anton text-coral text-xl uppercase mb-2">Remover anime?</h3>
                <p className="text-sm text-muted mb-6">Tem certeza que deseja remover este anime do seu Deck? Esta ação não pode ser desfeita.</p>

                {erro && <p className="text-coral text-xs mb-6 font-bold bg-coral/10 py-2 rounded-lg">{erro}</p>}

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
        </div>,
        document.body
    ) : null;

    const modalZerarEpisodios = confirmandoZerarEpisodios ? createPortal(
        <div className="fixed inset-0 bg-void/80 flex items-center justify-center z-[120] p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-panel border border-line rounded-2xl p-6 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="font-anton text-text text-xl uppercase mb-2">Episódios no Histórico</h3>
                <p className="text-sm text-muted mb-3">
                    Você tem <span className="text-holo-3 font-bold font-mono">{totalEpisodiosAssistidos}</span> episódio{totalEpisodiosAssistidos === 1 ? '' : 's'} marcado{totalEpisodiosAssistidos === 1 ? '' : 's'} como assistido{totalEpisodiosAssistidos === 1 ? '' : 's'}. O que deseja fazer ao mover para <strong>"Quero Assistir"</strong>?
                </p>

                <div className="bg-coral/10 border border-coral/30 rounded-xl p-3 mb-5 text-left">
                    <p className="text-[12px] text-coral leading-relaxed">
                        ⚠️ <strong>Atenção:</strong> Zerar episódios removerá o tempo assistido deste anime das suas métricas em <em>Estatísticas</em>.
                    </p>
                </div>

                <div className="flex flex-col gap-2.5">
                    <button
                        type="button"
                        onClick={() => executarSalvamento(false)}
                        disabled={salvando}
                        className="w-full py-3 px-4 rounded-xl bg-panel-2 border border-line text-sm font-bold text-text hover:border-holo-3 hover:text-holo-3 transition-colors cursor-pointer disabled:opacity-50 text-center"
                    >
                        Manter Histórico (Planejar Rewatch)
                    </button>
                    <button
                        type="button"
                        onClick={() => executarSalvamento(true)}
                        disabled={salvando}
                        className="w-full py-3 px-4 rounded-xl bg-coral/10 border border-coral text-coral text-sm font-bold hover:bg-coral hover:text-void transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {salvando ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            'Zerar Episódios (Marcado por Engano)'
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmandoZerarEpisodios(false)}
                        disabled={salvando}
                        className="w-full py-2 text-xs font-bold text-muted hover:text-text transition-colors cursor-pointer disabled:opacity-50"
                    >
                        Voltar à edição
                    </button>
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <>
            {modalConfirmacao}
            {modalZerarEpisodios}
            <Sheet
                isOpen={isOpen}
                onClose={() => { if (!salvando && !confirmandoExclusao && !confirmandoZerarEpisodios) onFechar() }}
                title="Editar entrada"
            >
                {entradaCache && (
                    <>
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
                                        className={`select-none px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border ${status === opt
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
                            {entradaCache.id && (
                                <button
                                    type="button"
                                    onClick={() => setConfirmandoExclusao(true)}
                                    className="px-4 py-2.5 rounded-xl border border-coral/30 text-coral text-sm font-bold mr-auto cursor-pointer hover:bg-coral/10 transition-colors"
                                >
                                    Excluir
                                </button>
                            )}
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
        </>
    )
}