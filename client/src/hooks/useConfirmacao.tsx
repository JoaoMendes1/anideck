// client/src/hooks/useConfirmacao.tsx
// Confirmação com cara de função: `if (!(await confirmar({ ... }))) return`. O componente
// que usa precisa renderizar o `dialogo` devolvido em algum ponto do seu JSX.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import DialogoConfirmacao, { type OpcoesDeConfirmacao } from '../components/DialogoConfirmacao'

export function useConfirmacao(): { confirmar: (opcoes: OpcoesDeConfirmacao) => Promise<boolean>; dialogo: ReactNode } {
  // O pedido continua guardado depois de fechar, para o texto não sumir durante a
  // animação de saída.
  const [pedido, setPedido] = useState<OpcoesDeConfirmacao | null>(null)
  const [aberto, setAberto] = useState(false)
  const resolver = useRef<((confirmou: boolean) => void) | null>(null)

  const responder = useCallback((confirmou: boolean) => {
    resolver.current?.(confirmou)
    resolver.current = null
    setAberto(false)
  }, [])

  const confirmar = useCallback((opcoes: OpcoesDeConfirmacao) => {
    // Uma pergunta nova com outra ainda aberta: a antiga conta como cancelada.
    resolver.current?.(false)
    setPedido(opcoes)
    setAberto(true)
    return new Promise<boolean>((resolve) => { resolver.current = resolve })
  }, [])

  // Componente desmontado com a pergunta aberta: responde "não", para a função que
  // espera a resposta não ficar pendurada.
  useEffect(() => () => { resolver.current?.(false) }, [])

  const dialogo = pedido
    ? <DialogoConfirmacao {...pedido} aberto={aberto} aoConfirmar={() => responder(true)} aoCancelar={() => responder(false)} />
    : null

  return { confirmar, dialogo }
}
