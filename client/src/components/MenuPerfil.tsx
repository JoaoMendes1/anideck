// client/src/components/MenuPerfil.tsx
// Dropdown do desktop. NÃO usa o useSheetBehavior de propósito: aquele hook
// trava a rolagem do body, o que é certo pra modal e errado pra menu — congelar
// a página atrás de três opções é comportamento de modal, não de dropdown.
// Então Esc e clique-fora são implementados aqui.
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useSessao } from '../contexts/SessaoContext'
import ItensPerfil from './ItensPerfil'

export default function MenuPerfil() {
    const { session } = useSessao()
    const [aberto, setAberto] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!aberto) return

        // mousedown, e não click: com click, o evento de fechar dispararia depois
        // do click do próprio botão que abriu, e o menu abriria e fecharia na
        // mesma interação.
        const cliqueFora = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) setAberto(false)
        }
        const esc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAberto(false)
        }

        document.addEventListener('mousedown', cliqueFora)
        window.addEventListener('keydown', esc)
        return () => {
            document.removeEventListener('mousedown', cliqueFora)
            window.removeEventListener('keydown', esc)
        }
    }, [aberto])

    if (!session) return null

    const nome = session.user.user_metadata?.display_name || 'Usuário'

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setAberto(!aberto)}
                aria-expanded={aberto}
                aria-haspopup="menu"
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full bg-panel border border-line cursor-pointer hover:border-holo-3 transition-colors"
            >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-holo-2 to-holo-3 flex items-center justify-center text-void font-bold text-xs">
                    {nome.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-bold truncate max-w-[100px]">{nome}</span>
                <ChevronDown size={13} className={`text-muted transition-transform ${aberto ? 'rotate-180' : ''}`} />
            </button>

            {aberto && (
                <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-56 bg-panel border border-line rounded-xl shadow-2xl overflow-hidden py-1.5 z-50"
                >
                    <ItensPerfil onNavegar={() => setAberto(false)} />
                </div>
            )}
        </div>
    )
}