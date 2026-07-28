import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Entrada {
    id: string
    mal_id: number
    tipo: string
    status: string
    nota?: number
    anotacao?: string
}

interface Props {
    entrada: Entrada
    onFechar: () => void
    onSalvar: (atualizada: Entrada) => void
    onExcluir: (id: string) => void
}

const STATUS_OPCOES = ['Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado']

export default function EditarEntradaModal({ entrada, onFechar, onSalvar, onExcluir }: Props) {
    const [status, setStatus] = useState(entrada.status)
    const [nota, setNota] = useState(entrada.nota?.toString() || '')
    const [anotacao, setAnotacao] = useState(entrada.anotacao || '')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    const handleSalvar = async () => {
        setSalvando(true)
        setErro(null)

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        try {
            const response = await fetch(`/api/entries/${entrada.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    mal_id: entrada.mal_id, // Devolvemos intacto para não zerar no banco
                    tipo: entrada.tipo || 'anime', // Devolvemos intacto
                    status,
                    nota: nota ? Number(nota) : null,
                    anotacao,
                }),
            })

            if (!response.ok) throw new Error('Falha ao salvar')

            const atualizada = await response.json()
            onSalvar(Array.isArray(atualizada) ? atualizada[0] : atualizada)
            onFechar()
        } catch (err) {
            setErro('Não foi possível salvar. Tente de novo.')
        } finally {
            setSalvando(false)
        }
    }

    const handleExcluir = async () => {
        const confirmar = window.confirm('Remover este anime do seu Deck?')
        if (!confirmar) return

        setSalvando(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        try {
            const response = await fetch(`/api/entries/${entrada.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            })
            if (!response.ok) throw new Error('Falha ao excluir')
            onExcluir(entrada.id)
            onFechar()
        } catch (err) {
            setErro('Não foi possível excluir. Tente de novo.')
            setSalvando(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-void/80 flex items-center justify-center z-50 p-4">
            <div className="bg-panel border border-line rounded-2xl p-6 max-w-sm w-full">
                <h3 className="font-bold text-sm mb-4">Editar entrada</h3>

                <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-2">Status</label>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm mb-4"
                >
                    {STATUS_OPCOES.map((op) => (
                        <option key={op} value={op}>{op}</option>
                    ))}
                </select>

                <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-2">Nota (0-10)</label>
                <input
                    type="number"
                    min="0"
                    max="10"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm mb-4"
                />

                <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-2">Anotação</label>
                <textarea
                    value={anotacao}
                    onChange={(e) => setAnotacao(e.target.value)}
                    className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm mb-2 min-h-[80px]"
                />

                {erro && <p className="text-coral text-xs mb-3">{erro}</p>}

                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={handleExcluir} className="px-4 py-2 rounded-lg border border-coral text-coral text-sm font-bold mr-auto cursor-pointer">
                        Excluir
                    </button>
                    <button onClick={onFechar} className="px-4 py-2 rounded-lg border border-line text-sm font-bold cursor-pointer hover:border-holo-3">
                        Cancelar
                    </button>
                    <button onClick={handleSalvar} disabled={salvando} className="px-4 py-2 rounded-lg bg-gradient-to-r from-holo-1 to-holo-2 text-void text-sm font-extrabold cursor-pointer hover:opacity-90">
                        {salvando ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    )
}