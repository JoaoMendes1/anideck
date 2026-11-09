// client/src/components/comunidade/ModalApoiador.tsx
// Modal de apoio voluntário ao AniDeck (Fase 16 · Issue #178).
// Sustentabilidade real: dinheiro real nunca compra Rank ou XP, apenas ajuda a manter a infraestrutura no ar.
import { useState, useEffect } from 'react'
import { Heart, Sparkles, Crown, ExternalLink, Copy, Check, X, ShieldCheck } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'

interface ApoiadorConfig {
  ativo: boolean
  link: string
  chave_pix: string
  mensagem: string
}

interface ModalApoiadorProps {
  aberto: boolean
  onFechar: () => void
}

export default function ModalApoiador({ aberto, onFechar }: ModalApoiadorProps) {
  const { showToast } = useToast()
  const [config, setConfig] = useState<ApoiadorConfig>({
    ativo: true,
    link: 'https://apoia.se/anideck',
    chave_pix: '',
    mensagem: 'Ajude a manter os servidores e a IA do AniDeck funcionando com curadoria própria e sem anúncios invasivos.',
  })
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!aberto) return
    let ativo = true
    fetch('/api/apoiador')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (ativo && d) setConfig(d)
      })
      .catch(() => undefined)
    return () => {
      ativo = false
    }
  }, [aberto])

  if (!aberto) return null

  const copiarPix = () => {
    if (!config.chave_pix) return
    navigator.clipboard.writeText(config.chave_pix)
    setCopiado(true)
    showToast('Chave Pix copiada com sucesso!', 'success')
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md animate-in fade-in"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-panel border border-line shadow-2xl p-6 sm:p-7 relative overflow-hidden text-text"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-holo-1/10 rounded-full blur-3xl pointer-events-none" />

        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="absolute top-5 right-5 p-2 rounded-full text-muted hover:text-text hover:bg-panel-2 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-2 mb-2">
          <span className="p-2 rounded-xl bg-holo-1/15 text-holo-1 border border-holo-1/30">
            <Heart size={20} className="fill-holo-1/30" />
          </span>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-holo-1 font-bold">
              // sustentabilidade comunitária
            </span>
            <h2 className="font-anton text-2xl uppercase tracking-wide m-0 text-text">
              Seja um Apoiador
            </h2>
          </div>
        </div>

        <p className="text-sm text-muted mt-2 leading-relaxed">
          {config.mensagem}
        </p>

        {/* Garantia anti pay-to-win */}
        <div className="mt-4 p-3.5 rounded-2xl bg-panel-2 border border-line text-xs flex items-start gap-2.5">
          <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-text block mb-0.5">Filosofia Anti Pay-to-Win</strong>
            <span className="text-muted-2 leading-normal">
              O AniDeck é 100% gratuito. Apoio voluntário nunca compra Rank (F→SS), nunca compra XP e nunca altera as notas dos animes. Apenas financia nossa infraestrutura e garante cosméticos de reconhecimento.
            </span>
          </div>
        </div>

        {/* Cosméticos Exclusivos */}
        <div className="mt-5">
          <h3 className="font-mono text-xs uppercase tracking-wider text-muted-2 mb-3">
            Reconhecimento Especial na Comunidade:
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-panel-2 border border-line text-center flex flex-col items-center">
              <span className="w-9 h-9 rounded-xl grid place-items-center bg-holo-1/15 text-holo-1 mb-2 border border-holo-1/30">
                <Heart size={18} className="fill-holo-1/30" />
              </span>
              <span className="font-bold text-xs text-text">Selo Apoiador</span>
              <span className="text-[10px] text-muted-2 mt-0.5">No seu perfil</span>
            </div>

            <div className="p-3 rounded-2xl bg-panel-2 border border-line text-center flex flex-col items-center">
              <span className="w-9 h-9 rounded-xl grid place-items-center bg-holo-3/15 text-holo-3 mb-2 border border-holo-3/30">
                <Sparkles size={18} />
              </span>
              <span className="font-bold text-xs text-text">Aura Cósmica</span>
              <span className="text-[10px] text-muted-2 mt-0.5">Moldura única</span>
            </div>

            <div className="p-3 rounded-2xl bg-panel-2 border border-line text-center flex flex-col items-center">
              <span className="w-9 h-9 rounded-xl grid place-items-center bg-gold/15 text-gold mb-2 border border-gold/30">
                <Crown size={18} />
              </span>
              <span className="font-bold text-xs text-text">Nebulosa VIP</span>
              <span className="text-[10px] text-muted-2 mt-0.5">Tema de perfil</span>
            </div>
          </div>
        </div>

        {/* Links de Apoio */}
        <div className="mt-6 flex flex-col gap-3">
          {config.link && (
            <a
              href={config.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-5 rounded-2xl font-anton text-base uppercase tracking-wider text-void bg-gradient-to-r from-holo-1 to-holo-2 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <span>Apoiar na plataforma externa</span>
              <ExternalLink size={18} />
            </a>
          )}

          {config.chave_pix && (
            <div className="p-3 rounded-2xl bg-panel-2 border border-line flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="block font-mono text-[10px] uppercase text-muted-2">Chave Pix de Apoio:</span>
                <span className="block font-mono text-xs text-text truncate">{config.chave_pix}</span>
              </div>
              <button
                type="button"
                onClick={copiarPix}
                className="px-3 py-1.5 rounded-xl bg-panel border border-line hover:border-holo-3 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiado ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
