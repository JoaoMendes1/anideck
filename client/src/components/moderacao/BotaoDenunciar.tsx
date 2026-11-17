// client/src/components/moderacao/BotaoDenunciar.tsx
// Botão "Denunciar" com a janela de motivo. Serve ao perfil público e às avaliações.
import { useState } from 'react'
import { Flag, Loader2 } from 'lucide-react'
import Sheet from '../Sheet'
import { useToast } from '../../contexts/ToastContext'
import { denunciar, MOTIVOS_DENUNCIA, type MotivoDenuncia, type TipoDenuncia } from '../../lib/moderacao'

interface Props {
  tipo: TipoDenuncia
  /** O @ do perfil ou o id da avaliação. */
  alvo: string
  /** Botão só com ícone, para caber ao lado de cada avaliação. */
  compacto?: boolean
}

export default function BotaoDenunciar({ tipo, alvo, compacto = false }: Props) {
  const { showToast } = useToast()
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState<MotivoDenuncia | null>(null)
  const [detalhe, setDetalhe] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async () => {
    if (!motivo) return
    setEnviando(true)
    const erro = await denunciar(tipo, alvo, motivo, detalhe)
    setEnviando(false)
    if (erro) {
      showToast(erro, 'error')
      return
    }
    setAberto(false)
    setMotivo(null)
    setDetalhe('')
    showToast('Denúncia enviada. A moderação vai analisar; obrigado por ajudar.')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={tipo === 'perfil' ? 'Denunciar perfil' : 'Denunciar avaliação'}
        title="Denunciar"
        className={
          compacto
            ? 'w-7 h-7 grid place-items-center rounded-full text-muted-2 hover:text-coral cursor-pointer'
            : 'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border border-line text-muted hover:text-coral hover:border-coral/50 cursor-pointer'
        }
      >
        <Flag size={13} aria-hidden />
        {!compacto && 'Denunciar'}
      </button>

      <Sheet isOpen={aberto} onClose={() => setAberto(false)} title={tipo === 'perfil' ? 'Denunciar perfil' : 'Denunciar avaliação'} maxWidthClass="md:max-w-md">
        <p className="text-sm text-muted mt-0 mb-3">Qual é o problema? Só a moderação vê a denúncia; a pessoa não sabe quem denunciou.</p>
        <div className="space-y-2 mb-4" role="radiogroup">
          {MOTIVOS_DENUNCIA.map(m => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={motivo === m.id}
              onClick={() => setMotivo(m.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-bold cursor-pointer ${motivo === m.id ? 'border-coral bg-coral/10 text-coral' : 'border-line bg-panel-2 text-text'}`}
            >
              {m.rotulo}
            </button>
          ))}
        </div>
        <label className="block mb-4">
          <span className="block text-xs font-bold text-muted mb-1">Detalhe (opcional)</span>
          <textarea value={detalhe} maxLength={300} rows={3} onChange={e => setDetalhe(e.target.value)} className="w-full bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm text-text" />
        </label>
        <button
          type="button"
          disabled={!motivo || enviando}
          onClick={enviar}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-coral text-void disabled:opacity-50 cursor-pointer"
        >
          {enviando && <Loader2 size={15} className="animate-spin" aria-hidden />}
          Enviar denúncia
        </button>
      </Sheet>
    </>
  )
}
