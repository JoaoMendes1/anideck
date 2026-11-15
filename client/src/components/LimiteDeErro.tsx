// client/src/components/LimiteDeErro.tsx
// Segura o erro de uma tela para ele não derrubar o app inteiro. Sem isto, qualquer falha
// ao desenhar uma página (dado em formato inesperado, arquivo antigo depois de um deploy)
// deixa a tela em branco, sem menu e sem explicação.
// Precisa ser classe: o React só oferece essa captura em componentes de classe.
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Identifica a tela atual (o caminho da rota): quando muda, o erro é esquecido. */
  chave: string
}

interface Estado {
  falhou: boolean
}

export default class LimiteDeErro extends Component<Props, Estado> {
  state: Estado = { falhou: false }

  static getDerivedStateFromError(): Estado {
    return { falhou: true }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Erro ao desenhar a tela:', erro, info.componentStack)
  }

  componentDidUpdate(anterior: Props) {
    if (anterior.chave !== this.props.chave && this.state.falhou) this.setState({ falhou: false })
  }

  render() {
    if (!this.state.falhou) return this.props.children

    return (
      <div className="w-full max-w-md mx-auto px-4 pt-10 pb-24 text-center" role="alert">
        <div className="rounded-2xl border border-line bg-panel p-6">
          <h1 className="font-anton text-2xl uppercase leading-tight mb-2">Esta tela não pôde ser exibida</h1>
          <p className="text-sm text-muted mb-5">
            Seu deck e suas notas estão salvos. Recarregar a página costuma resolver; se continuar, volte ao início.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-to-r from-holo-1 to-holo-3 text-sm font-bold text-void cursor-pointer focus-visible:outline-2 focus-visible:outline-holo-3"
            >
              <RefreshCw size={16} aria-hidden /> Recarregar a página
            </button>
            {/* Link comum, e não o do roteador: se o defeito estiver na navegação, ainda funciona. */}
            <a
              href="/"
              className="inline-flex items-center h-11 px-5 rounded-full border border-line bg-panel-2 text-sm font-bold text-text hover:border-holo-2 focus-visible:outline-2 focus-visible:outline-holo-3"
            >
              Voltar ao início
            </a>
          </div>
        </div>
      </div>
    )
  }
}
