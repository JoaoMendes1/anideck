// client/src/hooks/useMidia.ts
// Diz se uma media query casa agora e acompanha a mudança (girar o celular, redimensionar).
// Serve para montar um componente com estado num lugar só, em vez de duas cópias
// escondidas por CSS.
import { useEffect, useState } from 'react'

export function useMidia(consulta: string): boolean {
  const [casa, setCasa] = useState(() => typeof window !== 'undefined' && window.matchMedia(consulta).matches)

  useEffect(() => {
    const midia = window.matchMedia(consulta)
    const aoMudar = () => setCasa(midia.matches)
    aoMudar()
    midia.addEventListener('change', aoMudar)
    return () => midia.removeEventListener('change', aoMudar)
  }, [consulta])

  return casa
}
