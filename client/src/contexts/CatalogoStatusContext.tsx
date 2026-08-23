// client/src/contexts/CatalogoStatusContext.tsx
// Um lugar só pra responder "a fonte externa de catálogo está no ar?".
// Qualquer tela avisa quando um fetch de catálogo falha; o Layout escuta
// e mostra o aviso. Mesmo padrão do ToastContext.
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

type CatalogoStatus = {
  indisponivel: boolean
  reportarFalha: () => void
  reportarSucesso: () => void
}

const CatalogoStatusContext = createContext<CatalogoStatus>({
  indisponivel: false,
  reportarFalha: () => {},
  reportarSucesso: () => {},
})

export function CatalogoStatusProvider({ children }: { children: ReactNode }) {
  const [indisponivel, setIndisponivel] = useState(false)

  const reportarFalha = useCallback(() => setIndisponivel(true), [])
  const reportarSucesso = useCallback(() => setIndisponivel(false), [])

  // useMemo evita recriar o objeto a cada render, o que forçaria todas as
  // telas que consomem o contexto a re-renderizar sem necessidade.
  const valor = useMemo(
    () => ({ indisponivel, reportarFalha, reportarSucesso }),
    [indisponivel, reportarFalha, reportarSucesso]
  )

  return <CatalogoStatusContext.Provider value={valor}>{children}</CatalogoStatusContext.Provider>
}

export function useCatalogoStatus() {
  return useContext(CatalogoStatusContext)
}