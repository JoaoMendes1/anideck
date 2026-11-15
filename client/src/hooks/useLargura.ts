// client/src/hooks/useLargura.ts
// Largura e altura atuais de um elemento, em px. Os gráficos usam para decidir quantos rótulos
// cabem e para desenhar o SVG no tamanho real, sem esticar.
import { useEffect, useRef, useState } from 'react'

export function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [largura, setLargura] = useState(0)
  const [altura, setAltura] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    // O observador já avisa uma vez ao começar: a primeira medida vem por ele.
    const observador = new ResizeObserver(() => {
      setLargura(el.clientWidth)
      setAltura(el.clientHeight)
    })
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  return [ref, largura, altura] as const
}
