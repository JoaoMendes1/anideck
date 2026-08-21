import { useEffect, useState } from 'react'

// Anima um número de 0 até o valor final. Usado nos cards de destaque das Estatísticas:
// ver "0 → 3d 12h" contando dá a sensação de que o número foi calculado pra você, em vez
// de já estar lá parado.
//
// Recebe o valor cru (minutos, dias, nota) e não o texto formatado — quem chama formata a
// cada frame. Isso permite animar "3d 12h" sem o hook precisar saber o que é um dia.
export function useContagemAnimada(valorFinal: number, duracaoMs = 900) {
    // Acessibilidade: quem pediu menos movimento no sistema recebe o número direto.
    // Lido na primeira renderização e não dentro do efeito — assim o caso "sem animação"
    // é resolvido no próprio return, sem um setState que dispararia render em cascata.
    const [semMovimento] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const [valor, setValor] = useState(0)

    const animavel = !semMovimento && Number.isFinite(valorFinal) && valorFinal > 0

    useEffect(() => {
        if (!animavel) return

        let frame = 0
        const inicio = performance.now()

        const passo = (agora: number) => {
            const progresso = Math.min((agora - inicio) / duracaoMs, 1)
            // easeOutCubic: começa rápido e desacelera no fim, que é o que faz a contagem
            // parecer que "chegou" num valor em vez de ser cortada no meio.
            const suavizado = 1 - Math.pow(1 - progresso, 3)

            setValor(valorFinal * suavizado)

            if (progresso < 1) {
                frame = requestAnimationFrame(passo)
            } else {
                setValor(valorFinal)
            }
        }

        frame = requestAnimationFrame(passo)
        return () => cancelAnimationFrame(frame)
    }, [animavel, valorFinal, duracaoMs])

    return animavel ? valor : valorFinal
}
