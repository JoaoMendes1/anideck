// client/src/contexts/CelebracaoContext.tsx
// Dispara animações comemorativas de conclusão de missão/maratona carregando o overlay de
// forma preguiçosa (zero bytes extras no bundle inicial).
import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const CelebracaoMissaoModal = lazy(() => import('../components/CelebracaoMissaoModal'))

export interface DadosCelebracaoMissao {
  tipo: 'maratona' | 'missao' | 'contrato'
  titulo?: string
  subtitulo?: string
  notaExtra?: string
  recompensas: {
    ouro?: number
    xp?: number
    anicoins?: number
    bilhetes?: number
    materiais?: string
  }
}

interface CelebracaoContextType {
  celebrar: (dados: DadosCelebracaoMissao) => void
}

const ContextoPadrao: CelebracaoContextType = {
  celebrar: () => {},
}

const CelebracaoContext = createContext<CelebracaoContextType>(ContextoPadrao)

export function CelebracaoProvider({ children }: { children: ReactNode }) {
  const [atual, setAtual] = useState<DadosCelebracaoMissao | null>(null)

  const celebrar = useCallback((dados: DadosCelebracaoMissao) => {
    setAtual(dados)
  }, [])

  const fechar = useCallback(() => {
    setAtual(null)
  }, [])

  const valor = useMemo(() => ({ celebrar }), [celebrar])

  return (
    <CelebracaoContext.Provider value={valor}>
      {children}
      {atual && (
        <Suspense fallback={null}>
          <CelebracaoMissaoModal dados={atual} aoFechar={fechar} />
        </Suspense>
      )}
    </CelebracaoContext.Provider>
  )
}

// Provider e hook juntos é o padrão dos contextos deste projeto.
// eslint-disable-next-line react-refresh/only-export-components
export function useCelebracao(): CelebracaoContextType {
  return useContext(CelebracaoContext)
}
