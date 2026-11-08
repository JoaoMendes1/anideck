// client/src/components/ModalTransferirAniCoins.tsx
// Modal de envio de AniCoins entre usuários com busca por @handle.
import { useState, useEffect, useRef } from 'react'
import { Send, UserCheck, Search, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import Sheet from './Sheet'
import IconeAniCoin from './IconeAniCoin'

interface Destinatario {
  user_id: string
  handle: string
  nome: string
}

interface ModalTransferirAniCoinsProps {
  isOpen: boolean
  onClose: () => void
  saldoAtual: number
  onTransferenciaConcluida?: () => void
}

export default function ModalTransferirAniCoins({
  isOpen,
  onClose,
  saldoAtual,
  onTransferenciaConcluida,
}: ModalTransferirAniCoinsProps) {
  const { showToast } = useToast()
  const [busca, setBusca] = useState('')
  const [sugestoes, setSugestoes] = useState<Destinatario[]>([])
  const [buscando, setBuscando] = useState(false)
  const [selecionado, setSelecionado] = useState<Destinatario | null>(null)
  const [quantidade, setQuantidade] = useState<number | ''>('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const timerBusca = useRef<number | null>(null)

  // Reseta o estado ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setBusca('')
      setSugestoes([])
      setSelecionado(null)
      setQuantidade('')
      setErro(null)
    }
  }, [isOpen])

  // Busca debounced de usuários pelo @handle
  useEffect(() => {
    if (timerBusca.current) window.clearTimeout(timerBusca.current)
    const termo = busca.replace(/^@/, '').trim()
    if (termo.length < 2 || selecionado?.handle === termo) {
      setSugestoes([])
      setBuscando(false)
      return
    }

    setBuscando(true)
    timerBusca.current = window.setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const res = await fetch(`/api/admin/economia/buscar-destinatario?q=${encodeURIComponent(termo)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const dados = (await res.json()) as Destinatario[]
          setSugestoes(dados)
        }
      } catch {
        // Falha silenciosa
      } finally {
        setBuscando(false)
      }
    }, 250)

    return () => {
      if (timerBusca.current) window.clearTimeout(timerBusca.current)
    }
  }, [busca, selecionado])

  const handleSelecionar = (membro: Destinatario) => {
    setSelecionado(membro)
    setBusca(`@${membro.handle}`)
    setSugestoes([])
    setErro(null)
  }

  const handleSubmeter = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    const handleLimpo = (selecionado?.handle || busca.replace(/^@/, '')).trim()
    if (!handleLimpo) {
      setErro('Informe o @handle do usuário de destino.')
      return
    }

    const valor = Number(quantidade)
    if (!valor || valor <= 0) {
      setErro('Informe uma quantidade válida de AniCoins.')
      return
    }

    if (valor > saldoAtual) {
      setErro(`Saldo insuficiente. Você possui ${saldoAtual.toLocaleString('pt-BR')} AniCoins.`)
      return
    }

    setEnviando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Sessão expirada. Faça login novamente.')

      const res = await fetch('/api/admin/economia/transferir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          destinatario_handle: handleLimpo,
          quantidade: valor,
        }),
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Erro ao processar transferência')
      }

      showToast(`Transferência de ${valor} AniCoins para @${handleLimpo} concluída!`, 'success')
      window.dispatchEvent(new CustomEvent('anideck:cristais-atualizados'))
      if (onTransferenciaConcluida) onTransferenciaConcluida()
      onClose()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Falha ao transferir AniCoins')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Transferir AniCoins" maxWidthClass="max-w-md">
      <form onSubmit={handleSubmeter} className="flex flex-col gap-4">
        {/* Banner do saldo disponível */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-panel-2 border border-line">
          <div className="flex items-center gap-2.5">
            <IconeAniCoin size={22} animar />
            <div>
              <span className="font-mono text-[10px] text-muted-2 uppercase tracking-wider block">
                Seu Saldo Disponível
              </span>
              <span className="font-anton text-lg text-holo-3">
                {saldoAtual.toLocaleString('pt-BR')} AniCoins
              </span>
            </div>
          </div>
          <span className="font-mono text-xs text-muted">Instantâneo</span>
        </div>

        {/* Campo de busca do destinatário */}
        <div className="relative">
          <label className="block font-mono text-[11px] text-muted uppercase tracking-wider mb-1.5">
            Destinatário (@handle)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                if (selecionado && !e.target.value.includes(selecionado.handle)) {
                  setSelecionado(null)
                }
              }}
              placeholder="Digite @handle do amigo..."
              className="w-full pl-9 pr-8 py-2.5 bg-panel-2 border border-line rounded-xl text-sm text-text outline-none focus:border-holo-3 transition-colors font-mono"
              autoComplete="off"
            />
            {buscando && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 animate-spin">
                <Loader2 size={14} />
              </span>
            )}
          </div>

          {/* Lista de sugestões rápidas */}
          {sugestoes.length > 0 && !selecionado && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-panel border border-line rounded-xl shadow-2xl overflow-hidden z-20 divide-y divide-line/60">
              {sugestoes.map((membro) => (
                <button
                  key={membro.user_id}
                  type="button"
                  onClick={() => handleSelecionar(membro)}
                  className="w-full p-2.5 flex items-center justify-between hover:bg-panel-2 text-left cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-holo-3 block">
                      @{membro.handle}
                    </span>
                    <span className="text-[11.5px] text-muted block truncate">{membro.nome}</span>
                  </div>
                  <UserCheck size={14} className="text-muted-2" />
                </button>
              ))}
            </div>
          )}

          {/* Destinatário confirmado */}
          {selecionado && (
            <div className="mt-2 p-2.5 rounded-xl bg-holo-3/10 border border-holo-3/30 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-holo-3 block">
                  @{selecionado.handle}
                </span>
                <span className="text-[11px] text-muted block">{selecionado.nome}</span>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-holo-3/20 text-holo-3">
                Confirmado
              </span>
            </div>
          )}
        </div>

        {/* Quantidade a transferir */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-mono text-[11px] text-muted uppercase tracking-wider">
              Quantidade de AniCoins
            </label>
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => setQuantidade(Math.max(1, Math.floor(saldoAtual * 0.25)))}
                className="px-1.5 py-0.5 rounded bg-panel-2 border border-line hover:text-text text-muted-2 cursor-pointer"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => setQuantidade(Math.max(1, Math.floor(saldoAtual * 0.5)))}
                className="px-1.5 py-0.5 rounded bg-panel-2 border border-line hover:text-text text-muted-2 cursor-pointer"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setQuantidade(saldoAtual)}
                className="px-1.5 py-0.5 rounded bg-panel-2 border border-line hover:text-holo-3 text-muted cursor-pointer font-bold"
              >
                MAX
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={saldoAtual}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ex: 50"
              className="w-full px-3.5 py-2.5 bg-panel-2 border border-line rounded-xl text-base font-mono font-bold text-text outline-none focus:border-holo-3 transition-colors"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-muted flex items-center gap-1">
              <IconeAniCoin size={14} /> ₳
            </span>
          </div>
        </div>

        {/* Mensagem de erro */}
        {erro && (
          <div className="p-3 rounded-xl bg-coral/10 border border-coral/30 flex items-start gap-2 text-coral text-xs">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{erro}</span>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2.5 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="flex-1 py-2.5 rounded-xl border border-line text-xs font-bold text-muted hover:text-text cursor-pointer transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando || saldoAtual <= 0}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs text-void bg-gradient-to-r from-holo-1 to-holo-3 hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(63,224,240,0.25)]"
          >
            {enviando ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Transferindo...
              </>
            ) : (
              <>
                <Send size={13} /> Enviar AniCoins
              </>
            )}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
