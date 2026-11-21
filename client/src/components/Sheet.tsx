// client/src/components/Sheet.tsx
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useSheetBehavior } from '../hooks/useSheetBehavior'

interface SheetProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: ReactNode
    maxWidthClass?: string // NOVO PROP
}

export default function Sheet({ isOpen, onClose, title, children, maxWidthClass = 'md:max-w-sm' }: SheetProps) {
    useSheetBehavior(isOpen, onClose)

    // Renderiza direto no <body>, fora da árvore de componentes da página.
    // Isso garante que nenhum wrapper com "relative z-10" (como o do
    // MeuDeck.tsx) consiga prender o Sheet dentro do próprio contexto de
    // empilhamento — o z-[100] agora compete de igual pra igual com QUALQUER
    // coisa da página, incluindo o BottomNav (z-50).
    return createPortal(
        <div
            // `inert` tira o painel fechado do Tab, do clique e do leitor de tela. Sem isso,
            // os botões de um painel invisível continuavam recebendo foco.
            inert={!isOpen}
            className={`fixed inset-0 z-[100] flex items-end justify-center md:items-center transition-opacity duration-300 select-none ${
                isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
        >
            <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

           <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                // Trocamos o 'md:max-w-sm' fixo pela variável genérica
                className={`relative bg-panel/95 backdrop-blur-xl border-t md:border border-line rounded-t-3xl md:rounded-2xl w-full ${maxWidthClass} p-5 sm:p-6 pb-safe md:pb-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_-12px_rgba(0,0,0,0.85)] max-h-[85dvh] overflow-y-auto custom-scrollbar transition-transform duration-300 transform ${
                    isOpen ? 'translate-y-0' : 'translate-y-full'
                }`}
            >
                <div className="flex justify-between items-center gap-3 mb-5 pb-3 border-b border-line/60">
                    <h3 className="font-manrope font-extrabold text-lg tracking-tight text-text m-0">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full border border-line bg-panel-2 text-muted hover:text-text hover:border-holo-3/50 flex items-center justify-center cursor-pointer transition-colors"
                        aria-label="Fechar"
                    >
                        <X size={16} />
                    </button>
                </div>

                {children}
            </div>
        </div>,
        document.body
    )
}