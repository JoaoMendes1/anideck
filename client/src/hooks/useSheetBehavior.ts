// client/src/hooks/useSheetBehavior.ts
import { useEffect, useRef } from 'react'

// Estas variáveis vivem FORA do hook, no escopo do módulo: são criadas uma
// vez e TODOS os Sheets do app enxergam as mesmas. Se estivessem dentro do
// hook, cada Sheet teria a sua cópia e não saberia da existência dos outros
// — que é exatamente o bug que estamos consertando.
let sheetsAbertos = 0
let overflowOriginal = ''
const pilhaDeSheets: symbol[] = []

/**
 * Comportamento comum dos painéis: trava de rolagem, pilha e tecla Esc.
 *
 * @param travarRolagem quando este painel é modal de fato. O padrão é `true`,
 * que é o caso do Sheet.tsx — ele cobre a tela em qualquer largura. O
 * FilterSheet passa `false` no desktop, onde ele NÃO é modal: a partir do `md`
 * do Tailwind ele vira um bloco normal da página (`md:relative md:inset-auto`).
 * Travar o body ali deixava a lista de gêneros inalcançável abaixo da dobra,
 * porque o painel é mais alto que o espaço que sobra na tela.
 */
export function useSheetBehavior(isOpen: boolean, onClose: () => void, travarRolagem = true) {
    // Identidade única e estável deste Sheet. useRef sobrevive aos renders,
    // então os efeitos abaixo falam do mesmo objeto.
    const meuId = useRef<symbol>(Symbol('sheet'))

    // --- Trava de rolagem da página ---
    // Antes cada Sheet salvava e restaurava o overflow por conta própria. Com
    // dois abertos, o de baixo restaurava "destravado" e o de cima logo depois
    // restaurava "hidden" — deixando a página travada sem nenhum Sheet na tela.
    // Agora conta quantos estão abertos: o primeiro trava, o último destrava.
    //
    // travarRolagem entra nas dependências de propósito. Quem gira o celular ou
    // arrasta a janela para além do `md` com o painel aberto muda de valor no
    // meio do caminho: a limpeza roda, decrementa a conta e destrava. Sem a
    // dependência, a página ficaria travada até fechar o painel.
    useEffect(() => {
        if (!isOpen || !travarRolagem) return

        if (sheetsAbertos === 0) {
            overflowOriginal = document.body.style.overflow
            document.body.style.overflow = 'hidden'
        }
        sheetsAbertos++

        return () => {
            sheetsAbertos--
            if (sheetsAbertos === 0) {
                document.body.style.overflow = overflowOriginal
            }
        }
    }, [isOpen, travarRolagem])

    // --- Registro na pilha ---
    // O último a entrar é o que está visualmente por cima.
    // Depende SÓ de [isOpen]: se dependesse de onClose (que muda de identidade
    // a cada render do pai), a pilha se reordenaria e o Esc fecharia o Sheet
    // errado.
    //
    // Não depende de travarRolagem: o painel inline do desktop continua sendo o
    // último aberto, e continua sendo quem o Esc deve fechar.
    useEffect(() => {
        if (!isOpen) return

        const id = meuId.current
        pilhaDeSheets.push(id)

        return () => {
            const i = pilhaDeSheets.indexOf(id)
            if (i !== -1) pilhaDeSheets.splice(i, 1)
        }
    }, [isOpen])

    // --- Tecla Esc ---
    // Todos escutam, mas só o do topo da pilha reage.
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return
            if (pilhaDeSheets[pilhaDeSheets.length - 1] !== meuId.current) return
            onClose()
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])
}