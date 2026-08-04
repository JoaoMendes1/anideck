import { createContext, useContext, useState, type ReactNode } from 'react'

interface ToastContextType {
    showToast: (message: string, type?: 'success' | 'error') => void 
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode}) {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean}>({
        message: '',
        type: 'success',
        visible: false
    })

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, visible: true})
        setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false}))
        }, 3000) // Toast some após 3 segundos 
    }

      return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Componente visual do Toast */}
      <div
        className={`fixed bottom-[80px] md:bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
          toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-2 px-5 py-3 rounded-full border shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md text-[13px] font-bold ${
          toast.type === 'success'
            ? 'bg-panel border-green text-text'
            : 'bg-coral/10 border-coral text-coral'
        }`}>
          {toast.type === 'success' && <span className="w-2 h-2 rounded-full bg-green flex-shrink-0" />}
          {toast.message}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
    const context = useContext(ToastContext)
    if(!context) throw new Error('useToast deve ser usado dentro de um ToastProvider')
    return context
}

