import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// Lightbox para ampliar pôster e banner na página de Detalhes.
//
// Serve para ver a arte em tamanho cheio — útil tanto para quem quer apreciar
// a capa quanto para usar como referência visual.
//
// Sem dependência nova: é overlay + img. O fechamento funciona por três
// caminhos (botão, clique no fundo, tecla Esc) porque num overlay em tela
// cheia a saída precisa ser óbvia em qualquer dispositivo.
//
// POR QUE createPortal: o <main> do Layout.tsx é `relative z-10`, e isso cria
// um contexto de empilhamento. Renderizado ali dentro, o overlay competia como
// z-10 contra a Navbar (z-50) e perdia — o header continuava por cima e o botão
// de fechar caía exatamente em cima do sino de notificações. Aumentar o z-index
// interno não resolve: dentro do contexto, o valor é relativo ao pai. O portal
// tira o overlay de dentro do <main> e o coloca direto no body, onde o z-[100]
// vale contra a Navbar de verdade.

interface Props {
    src: string | null
    alt: string
    aoFechar: () => void
}

export default function ImagemAmpliada({ src, alt, aoFechar }: Props) {
    // Esc fecha, e a rolagem do fundo trava enquanto o overlay está aberto.
    // Sem travar, o usuário rola a página por trás da imagem e se perde.
    useEffect(() => {
        if (!src) return

        const aoTeclar = (e: KeyboardEvent) => {
            if (e.key === 'Escape') aoFechar()
        }

        const overflowAnterior = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', aoTeclar)

        return () => {
            document.body.style.overflow = overflowAnterior
            window.removeEventListener('keydown', aoTeclar)
        }
    }, [src, aoFechar])

    if (!src) return null

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            onClick={aoFechar}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-void/95 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
            <button
                type="button"
                onClick={aoFechar}
                aria-label="Fechar imagem"
                className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full bg-void/70 border border-line text-text hover:text-holo-3 hover:border-holo-3 flex items-center justify-center backdrop-blur-md shadow-lg transition-colors cursor-pointer active:scale-90"
            >
                <X size={18} />
            </button>

            {/* stopPropagation para o clique na própria imagem não fechar:
                quem toca na arte quer olhar, não sair. */}
            <img
                src={src}
                alt={alt}
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-full object-contain rounded-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]"
            />

            <p className="absolute bottom-5 left-0 right-0 text-center text-[11px] text-muted-2 select-none pointer-events-none">
                Toque fora da imagem para fechar
            </p>
        </div>,
        document.body
    )
}