// client/src/components/Sheet.tsx
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useSheetBehavior } from '../hooks/useSheetBehavior'

interface SheetProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: ReactNode
}

export default function Sheet({ isOpen, onClose, title, children }: SheetProps) {
    useSheetBehavior(isOpen, onClose)

    return (
        // items-end no mobile (painel gruda embaixo), items-center no desktop
        // (painel fica no meio da tela) — o mesmo componente, dois lugares.
        <div
            className={`fixed inset-0 z-[100] flex items-end justify-center md:items-center transition-opacity duration-300 select-none ${
                isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
        >
            <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`relative bg-panel border-t md:border border-line rounded-t-3xl md:rounded-2xl w-full md:max-w-sm p-6 pb-8 md:pb-6 shadow-2xl max-h-[85vh] overflow-y-auto transition-transform duration-300 transform ${
                    isOpen ? 'translate-y-0' : 'translate-y-full'
                }`}
            >
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-anton text-lg uppercase text-text">{title}</h3>
                    <button onClick={onClose} className="text-muted hover:text-text cursor-pointer p-1" aria-label="Fechar">
                        <X size={20} />
                    </button>
                </div>

                {children}
            </div>
        </div>
    )
}