// client/src/components/FilterSheet.tsx
import { type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useSheetBehavior } from '../hooks/useSheetBehavior'

interface FilterSheetProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: ReactNode   // o conteúdo (grupos de filtro) vem de fora — o Sheet só cuida do "envelope"
}

export default function FilterSheet({ isOpen, onClose, title, children }: FilterSheetProps) {

    useSheetBehavior(isOpen, onClose)
    return (

        <div
            className={`fixed inset-0 z-[70] flex flex-col justify-end pointer-events-none md:relative md:inset-auto md:z-auto md:block transition-all duration-300 select-none ${
                isOpen ? 'opacity-100' : 'opacity-0 md:opacity-100 md:hidden'
            }`}
        >
            <div
                className={`absolute inset-0 bg-void/80 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`relative bg-panel border-t md:border border-line rounded-t-3xl md:rounded-2xl p-6 pb-safe md:pb-6 space-y-6 transition-transform duration-300 transform md:transform-none max-h-[85vh] overflow-y-auto mb-0 md:mb-6 ${
                    isOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none md:translate-y-0 md:pointer-events-auto'
                }`}
            >

                <div className="flex justify-between items-center md:hidden mb-2">
                    <h3 className="font-anton text-lg uppercase text-text">{title}</h3>
                    <button onClick={onClose} className="text-muted hover:text-text cursor-pointer p-1" aria-label="Fechar filtros">
                        <X size={20} />
                    </button>
                </div>

                {children}
            </div>
        </div>
    )
}