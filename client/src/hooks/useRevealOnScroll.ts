import { useEffect, useRef } from 'react'

// Revela elementos conforme entram na viewport, usando as classes `.reveal` / `.reveal.in`
// que já existem no index.css (incluindo o tratamento de prefers-reduced-motion).
//
// Virou hook porque a Landing e as Estatísticas precisam do mesmo comportamento — mesma
// razão pela qual a lógica de abrir/fechar overlay virou o useSheetBehavior: o observer
// é idêntico nos dois lugares, só o conteúdo observado muda.
//
// Uso:
//   const registrar = useRevealOnScroll()
//   <div ref={registrar} className="reveal">...</div>
export function useRevealOnScroll(threshold = 0.12) {
    const elementos = useRef<HTMLElement[]>([])

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                // Uma vez revelado, para de observar: o elemento não deve "desaparecer"
                // ao sair da tela e reaparecer na rolagem de volta.
                if (e.isIntersecting) {
                    e.target.classList.add('in')
                    observer.unobserve(e.target)
                }
            })
        }, { threshold })

        elementos.current.forEach(el => observer.observe(el))

        return () => observer.disconnect()
    })

    return (el: HTMLElement | null) => {
        if (el && !elementos.current.includes(el)) {
            elementos.current.push(el)
        }
    }
}
