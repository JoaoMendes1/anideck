import { useState } from 'react'
import { X, Send, CheckCircle2, Sparkles } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

interface SolicitarConviteBetaModalProps {
  isOpen: boolean
  onClose: () => void
  emailInicial?: string
  nomeInicial?: string
}

export default function SolicitarConviteBetaModal({
  isOpen,
  onClose,
  emailInicial = '',
  nomeInicial = '',
}: SolicitarConviteBetaModalProps) {
  const { showToast } = useToast()
  const [nome, setNome] = useState(nomeInicial)
  const [email, setEmail] = useState(emailInicial)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  if (!isOpen) return null

  const fechar = () => {
    setErro(null)
    setEnviado(false)
    onClose()
  }

  const enviarSolicitacao = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    const nomeLimpo = nome.trim()
    const emailLimpo = email.trim()

    if (nomeLimpo.length < 2) {
      setErro('Informe seu nome para identificarmos seu pedido.')
      return
    }
    if (!emailLimpo.includes('@') || !emailLimpo.includes('.')) {
      setErro('Informe um endereço de e-mail válido.')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch('/api/beta/request-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeLimpo, email: emailLimpo }),
      })

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg.trim() || 'Não foi possível enviar sua solicitação agora.')
      }

      setEnviado(true)
      showToast('Solicitação enviada! O administrador foi notificado no AniDeck.', 'success')
    } catch (err) {
      setErro((err as Error).message || 'Erro de conexão ao solicitar convite.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] bg-void/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={fechar}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 sm:p-7 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar modal"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-panel-2 border border-line text-muted hover:text-text flex items-center justify-center cursor-pointer transition-colors"
        >
          <X size={15} />
        </button>

        {enviado ? (
          <div className="py-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-green/15 border border-green/40 text-green flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="font-anton text-2xl uppercase text-text mb-2">
              Pedido Registrado!
            </h2>
            <p className="text-sm text-muted leading-relaxed mb-6">
              Uma notificação automática foi enviada diretamente para o painel do administrador com seu nome (<strong className="text-text">{nome.trim()}</strong>) e e-mail (<strong className="text-holo-3">{email.trim()}</strong>).
            </p>
            <button
              type="button"
              onClick={fechar}
              className="w-full py-3 rounded-xl font-extrabold text-sm text-void bg-gradient-to-r from-holo-1 to-holo-3 hover:opacity-90 transition-opacity cursor-pointer"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/15 border border-gold/40 text-gold font-mono text-[10px] font-bold uppercase tracking-widest mb-3">
              <Sparkles size={11} /> Acesso Beta · Convite
            </div>
            <h2 className="font-anton text-2xl uppercase text-text mb-1.5">
              Solicitar Convite Beta
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed mb-5">
              Informe apenas seu nome e e-mail. O AniDeck avisará automaticamente o administrador nas notificações internas para liberar seu acesso.
            </p>

            {erro && (
              <div className="mb-4 p-3 rounded-xl bg-coral/10 border border-coral/35 text-coral text-xs font-bold">
                {erro}
              </div>
            )}

            <form onSubmit={enviarSolicitacao} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted mb-1.5">
                  Seu nome
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  required
                  maxLength={80}
                  className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-holo-3 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-1.5">
                  Seu melhor e-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  required
                  maxLength={120}
                  className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-holo-3 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="w-full mt-2 py-3 rounded-xl font-extrabold text-sm text-void bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send size={14} />
                {enviando ? 'Enviando notificação...' : 'Enviar Solicitação de Convite'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
