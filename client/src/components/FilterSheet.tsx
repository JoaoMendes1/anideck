// client/src/components/FilterSheet.tsx
import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useSheetBehavior } from '../hooks/useSheetBehavior'

// O mesmo componente em dois papéis:
//   celular  → gaveta modal, sobe de baixo, com fundo escurecido
//   desktop  → bloco normal da página, logo abaixo dos chips (md:relative)
//
// Essa dupla personalidade é a origem do bug que este arquivo corrige: o hook
// travava a rolagem do body nos dois casos, e no desktop o fim da lista de
// gêneros ficava abaixo da dobra, sem como chegar até ele.

// 768px é o `md` do Tailwind, e está escrito aqui em JS porque o componente
// precisa SABER em qual dos dois papéis está, não só parecer diferente. Se o
// breakpoint mudar no CSS, muda aqui junto.
const CONSULTA_DESKTOP = '(min-width: 768px)'

interface FilterSheetProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: ReactNode   // o conteúdo (grupos de filtro) vem de fora — o Sheet só cuida do "envelope"
}

export default function FilterSheet({ isOpen, onClose, title, children }: FilterSheetProps) {
    // matchMedia em vez de window.innerWidth: o evento dispara só quando a
    // largura CRUZA o limite, e não a cada pixel arrastado no redimensionamento.
    const [ehModal, setEhModal] = useState(() => !window.matchMedia(CONSULTA_DESKTOP).matches)

    useEffect(() => {
        const consulta = window.matchMedia(CONSULTA_DESKTOP)
        const aoMudar = (e: MediaQueryListEvent) => setEhModal(!e.matches)

        consulta.addEventListener('change', aoMudar)
        return () => consulta.removeEventListener('change', aoMudar)
    }, [])

    // A trava de rolagem vale só no papel de modal. O Esc e a pilha continuam
    // valendo nos dois, por isso é o terceiro argumento e não um `isOpen &&`.
    useSheetBehavior(isOpen, onClose, ehModal)

    return (
        <div
            className={`fixed inset-0 z-[70] flex flex-col justify-end pointer-events-none md:relative md:inset-auto md:z-auto md:block md:pointer-events-auto transition-all duration-300 select-none ${
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
                aria-modal={ehModal}
                aria-label={title}
                // `inert` desliga teclado, clique e leitor de tela no painel fechado.
                // Sem isto, a gaveta escondida do celular continua na ordem do Tab: o
                // usuário sai do campo de busca e cai em chips invisíveis.
                // (Prop nativa do React 19. Se o TypeScript reclamar, o @types/react
                // do projeto está desatualizado.)
                inert={!isOpen}
                className={`relative bg-panel border-t md:border border-line rounded-t-3xl md:rounded-2xl p-6 pb-safe md:pb-6 space-y-6 transition-transform duration-300 transform md:transform-none max-h-[85vh] overflow-y-auto overscroll-contain custom-scrollbar mb-0 md:mb-6 ${
                    isOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none md:translate-y-0 md:pointer-events-auto'
                }`}
            >

                {/* O cabeçalho aparece nas duas larguras. No desktop ele era escondido
                    (md:hidden) e o painel só fechava pelo botão de filtros lá em cima,
                    longe de onde o olho está quando a lista é longa. */}
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-anton text-lg uppercase text-text">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-muted hover:text-text cursor-pointer p-1 transition-colors"
                        aria-label="Fechar filtros"
                    >
                        <X size={20} />
                    </button>
                </div>

                {children}
            </div>
        </div>
    )
}