// client/src/components/RolarAteAncora.tsx
// Leva até a seção do link com âncora (/guilda#extrato). O React Router não rola sozinho,
// e a seção só existe depois que a página e os dados chegam: tenta por até 4 segundos.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const INTERVALO_MS = 100
const TENTATIVAS = 40

export default function RolarAteAncora() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const id = decodeURIComponent(hash.slice(1))
    let tentativas = 0
    let espera = 0
    const tentar = () => {
      const alvo = document.getElementById(id)
      if (alvo) {
        alvo.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      if (++tentativas < TENTATIVAS) espera = window.setTimeout(tentar, INTERVALO_MS)
    }
    tentar()
    return () => window.clearTimeout(espera)
  }, [pathname, hash])

  return null
}
