import { createContext, useContext, useState, useRef, useMemo, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export type ToastTipo = 'success' | 'error' | 'info'

interface ToastContextType {
  showToast: (message: string, type?: ToastTipo) => void
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
  }
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastTipo; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  })
  const timerRef = useRef<number | null>(null)

  const showToast = (message: string, type: ToastTipo = 'success') => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }
    setToast({ message, type, visible: true })

    // Mensagens mais longas ganham tempo de leitura proporcional (mínimo 3.5s, máximo 6s)
    const duracao = Math.min(6000, Math.max(3500, message.length * 60))
    timerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
      timerRef.current = null
    }, duracao)
  }

  const fecharToast = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setToast((prev) => ({ ...prev, visible: false }))
  }

  const toastObj = useMemo(
    () => ({
      success: (msg: string) => showToast(msg, 'success'),
      error: (msg: string) => showToast(msg, 'error'),
      info: (msg: string) => showToast(msg, 'info'),
    }),
    [],
  )

  return (
    <ToastContext.Provider value={{ showToast, toast: toastObj }}>
      {children}

      {/* Componente visual do Toast moderno, retangular com cantos suaves (rounded-2xl) */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[calc(100vw-32px)] max-w-md pointer-events-none transition-all duration-300 ease-out ${
          toast.visible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-3 scale-95'
        }`}
      >
        <div
          className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all ${
            toast.type === 'success'
              ? 'bg-panel/95 border-green/40 shadow-[0_12px_40px_rgba(34,197,94,0.18)]'
              : toast.type === 'error'
              ? 'bg-panel/95 border-coral/40 shadow-[0_12px_40px_rgba(255,92,108,0.22)]'
              : 'bg-panel/95 border-holo-3/40 shadow-[0_12px_40px_rgba(34,211,238,0.18)]'
          }`}
        >
          {/* Ícone de status em container destacado */}
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              toast.type === 'success'
                ? 'bg-green/15 text-green border border-green/30'
                : toast.type === 'error'
                ? 'bg-coral/15 text-coral border border-coral/30'
                : 'bg-holo-3/15 text-holo-3 border border-holo-3/30'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={16} />}
            {toast.type === 'error' && <AlertCircle size={16} />}
            {toast.type === 'info' && <Info size={16} />}
          </div>

          {/* Texto legível que quebra em várias linhas sem distorcer o card */}
          <div className="flex-1 min-w-0 pr-1">
            <p className="text-xs sm:text-[13px] font-semibold text-text leading-snug break-words m-0 select-text">
              {toast.message}
            </p>
          </div>

          {/* Botão de fechar */}
          <button
            type="button"
            onClick={fecharToast}
            aria-label="Fechar notificação"
            className="p-1 -mr-1 -mt-1 text-muted hover:text-text rounded-lg hover:bg-panel-2 transition-colors shrink-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </ToastContext.Provider>
  )
}

// Provider e hook juntos é o padrão dos contextos deste projeto.
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast deve ser usado dentro de um ToastProvider')
  return context
}
