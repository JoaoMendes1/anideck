// client/src/contexts/ToastContext.tsx
import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import type { ItemRecompensaToast } from '../components/RecompensaHudLista'

const RecompensaHudLista = lazy(() => import('../components/RecompensaHudLista'))

export type ToastTipo = 'success' | 'error' | 'info'

export type DadosRecompensaToast = Omit<ItemRecompensaToast, 'id'>

interface ToastContextType {
  showToast: (message: string, type?: ToastTipo) => void
  showRewardToast: (dados: DadosRecompensaToast) => void
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
  const [recompensas, setRecompensas] = useState<ItemRecompensaToast[]>([])
  const timerRef = useRef<number | null>(null)
  const rewardTimersRef = useRef<Map<number, number>>(new Map())
  const rewardIdRef = useRef(0)

  // Identidade estável: telas usam showToast como dependência de efeito, e uma função
  // nova a cada aviso faria o efeito rodar de novo sempre que um aviso aparecesse.
  const showToast = useCallback((message: string, type: ToastTipo = 'success') => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }
    setRecompensas([])
    setToast({ message, type, visible: true })

    // Mensagens mais longas ganham tempo de leitura proporcional (mínimo 3.5s, máximo 6s)
    const duracao = Math.min(6000, Math.max(3500, message.length * 60))
    timerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
      timerRef.current = null
    }, duracao)
  }, [])

  const fecharRecompensa = useCallback((id: number) => {
    const t = rewardTimersRef.current.get(id)
    if (t) {
      window.clearTimeout(t)
      rewardTimersRef.current.delete(id)
    }
    setRecompensas((atuais) => atuais.filter((item) => item.id !== id))
  }, [])

  const showRewardToast = useCallback(
    (dados: DadosRecompensaToast) => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setToast((prev) => (prev.visible ? { ...prev, visible: false } : prev))
      const id = ++rewardIdRef.current
      setRecompensas((atuais) => [...atuais, { ...dados, id }].slice(-2))
      const timer = window.setTimeout(() => {
        rewardTimersRef.current.delete(id)
        setRecompensas((atuais) => atuais.filter((item) => item.id !== id))
      }, 4200)
      rewardTimersRef.current.set(id, timer)
    },
    [],
  )

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
    [showToast],
  )

  const valor = useMemo(
    () => ({ showToast, showRewardToast, toast: toastObj }),
    [showToast, showRewardToast, toastObj],
  )

  return (
    <ToastContext.Provider value={valor}>
      {children}

      {recompensas.length > 0 && (
        <Suspense fallback={null}>
          <RecompensaHudLista itens={recompensas} aoFechar={fecharRecompensa} />
        </Suspense>
      )}

      {/* Toast padrão refinado: nunca intercepta toque quando oculto */}
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
          className={`${toast.visible ? 'pointer-events-auto' : 'pointer-events-none'} flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_45px_-12px_rgba(0,0,0,0.8)] transition-all ${
            toast.type === 'success'
              ? 'bg-panel/95 border-green/45'
              : toast.type === 'error'
              ? 'bg-panel/95 border-coral/45'
              : 'bg-panel/95 border-holo-3/45'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              toast.type === 'success'
                ? 'bg-green/15 text-green border border-green/35'
                : toast.type === 'error'
                ? 'bg-coral/15 text-coral border border-coral/35'
                : 'bg-holo-3/15 text-holo-3 border border-holo-3/35'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={16} />}
            {toast.type === 'error' && <AlertCircle size={16} />}
            {toast.type === 'info' && <Info size={16} />}
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <p className="text-xs sm:text-[13px] font-semibold text-text leading-snug break-words m-0 select-text">
              {toast.message}
            </p>
          </div>

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
