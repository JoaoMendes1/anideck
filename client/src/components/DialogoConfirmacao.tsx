// client/src/components/DialogoConfirmacao.tsx
// Pergunta de confirmação no lugar do window.confirm do navegador, que trava a página,
// não segue o tema e não diz o que cada botão faz. Quem usa é o hook useConfirmacao.
import { useEffect, useRef, type ReactNode } from 'react'
import Sheet from './Sheet'

export interface OpcoesDeConfirmacao {
  titulo: string
  mensagem: ReactNode
  /** Texto do botão que confirma. Deve dizer a ação ("Expulsar"), e não "OK". */
  rotuloConfirmar?: string
  rotuloCancelar?: string
  /** Ação que não tem volta: o botão de confirmar fica em coral. */
  perigoso?: boolean
}

interface Props extends OpcoesDeConfirmacao {
  aberto: boolean
  aoConfirmar: () => void
  aoCancelar: () => void
}

export default function DialogoConfirmacao({
  aberto, titulo, mensagem, rotuloConfirmar = 'Confirmar', rotuloCancelar = 'Cancelar', perigoso = false, aoConfirmar, aoCancelar,
}: Props) {
  const botaoCancelar = useRef<HTMLButtonElement>(null)

  // Ao abrir, o foco vai para "Cancelar": um Enter por reflexo não confirma nada. Ao
  // fechar, volta para o botão que abriu a pergunta, para o teclado não perder o lugar.
  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    botaoCancelar.current?.focus()
    return () => anterior?.focus()
  }, [aberto])

  const corDoConfirmar = perigoso
    ? 'bg-coral/15 border-coral/50 text-coral hover:bg-coral hover:text-void'
    : 'bg-holo-3/15 border-holo-3/50 text-holo-3 hover:bg-holo-3 hover:text-void'

  return (
    <Sheet isOpen={aberto} onClose={aoCancelar} title={titulo}>
      <div className="text-sm text-text/85 leading-relaxed select-text">{mensagem}</div>
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
        <button
          ref={botaoCancelar}
          type="button"
          onClick={aoCancelar}
          className="min-h-11 px-5 rounded-xl border border-line bg-panel-2 text-sm font-bold text-text transition-colors hover:border-line-hover cursor-pointer focus-visible:outline-2 focus-visible:outline-holo-3"
        >
          {rotuloCancelar}
        </button>
        <button
          type="button"
          onClick={aoConfirmar}
          className={`min-h-11 px-5 rounded-xl border text-sm font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-holo-3 ${corDoConfirmar}`}
        >
          {rotuloConfirmar}
        </button>
      </div>
    </Sheet>
  )
}
