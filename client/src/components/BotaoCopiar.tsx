import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

interface Props {
    texto: string
    className?: string
}

export default function BotaoCopiar({ texto, className = '' }: Props) {
    const { showToast } = useToast()
    const [copiado, setCopiado] = useState(false)

    const handleCopiar = (e: React.MouseEvent) => {
        e.preventDefault() // Evita que o clique navegue para a página do anime caso esteja dentro de um <Link>
        e.stopPropagation() // Impede que o evento suba pro elemento pai
        
        navigator.clipboard.writeText(texto)
        setCopiado(true)
        showToast('Nome copiado para a área de transferência!')
        
        setTimeout(() => setCopiado(false), 2000)
    }

    return (
        <button
            onClick={handleCopiar}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                copiado 
                ? 'bg-green/20 border-green text-green' 
                : 'bg-panel-2/80 border-line text-muted hover:text-text hover:border-muted backdrop-blur-sm'
            } ${className}`}
            title="Copiar nome do anime"
        >
            {copiado ? <Check size={14} /> : <Copy size={14} />}
        </button>
    )
}