import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import Sheet from './Sheet'

interface ConfigIAModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ConfigIAModal({ isOpen, onClose }: ConfigIAModalProps) {
  const { showToast } = useToast()
  const [aiPrompt, setAiPrompt] = useState('')
  const [carregandoPrompt, setCarregandoPrompt] = useState(false)
  const [salvandoPrompt, setSalvandoPrompt] = useState(false)

  // Sempre que o modal abrir, busca o prompt atual no banco
  useEffect(() => {
    if (isOpen) {
      carregarPrompt()
    }
  }, [isOpen])

  const carregarPrompt = async () => {
    setCarregandoPrompt(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/settings/ai-prompt', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAiPrompt(data.prompt)
    } catch {
      showToast('Erro ao carregar instrução da IA', 'error')
    } finally {
      setCarregandoPrompt(false)
    }
  }

  const salvarConfigIA = async () => {
    setSalvandoPrompt(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/settings/ai-prompt', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ prompt: aiPrompt })
      })
      if (!res.ok) throw new Error()
      showToast('Regras da IA salvas com sucesso!', 'success')
      onClose() // Fecha o modal após salvar
    } catch {
      showToast('Erro ao salvar instrução', 'error')
    } finally {
      setSalvandoPrompt(false)
    }
  }

 return (
    <Sheet 
      isOpen={isOpen} 
      onClose={() => !salvandoPrompt && onClose()} 
      title="Personalidade da IA"
      maxWidthClass="md:max-w-2xl" // DEIXA O MODAL LARGO NO DESKTOP!
    >
      <div className="mb-6">
        <p className="text-[13px] md:text-sm text-muted mb-4">
          Ajuste a <b>System Instruction</b> que define como o Agente Curador vai escrever as sinopses. O modelo lerá essa regra antes de gerar qualquer texto.
        </p>
        
        {carregandoPrompt ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-line border-t-holo-1 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="relative group">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full bg-panel-2 border border-line rounded-xl px-5 py-4 text-[13px] md:text-[14px] outline-none focus:border-holo-1 min-h-[350px] resize-y custom-scrollbar text-text leading-relaxed font-mono shadow-inner"
              placeholder="Descreva as ordens para a IA..."
            />
          </div>
        )}
      </div>
      
      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
        <button
          onClick={onClose}
          disabled={salvandoPrompt}
          className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl border border-line text-sm font-bold cursor-pointer hover:border-muted transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={salvarConfigIA}
          disabled={salvandoPrompt || carregandoPrompt}
          className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-holo-1 to-holo-2 text-void text-sm font-extrabold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center min-w-[140px]"
        >
          {salvandoPrompt ? <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin"></div> : 'Salvar Regras'}
        </button>
      </div>
    </Sheet>
  )
}