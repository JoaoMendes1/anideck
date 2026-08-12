// client/src/hooks/useSheetBehavior.ts
import { useEffect } from 'react'

export function useSheetBehavior(isOpen: boolean, onClose: () => void) {
    useEffect(() => {
        if (!isOpen) return
        const overflowOriginal = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = overflowOriginal }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])
}