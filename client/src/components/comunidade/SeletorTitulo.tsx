// client/src/components/comunidade/SeletorTitulo.tsx
// Escolha do título de honra mostrado no perfil público, na Guilda e nos comentários. Só
// aparecem os títulos que o jogador já conquistou; o banco confere de novo ao equipar.
import { useState } from 'react'
import { Award } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { equiparTitulo } from '../../lib/previsoes'

interface Props {
  tituloAtual?: string
  titulosDisponiveis?: string[]
  onAtualizado?: () => void
  className?: string
}

export default function SeletorTitulo({
  tituloAtual = 'Aventureiro Iniciante',
  titulosDisponiveis = ['Aventureiro Iniciante'],
  onAtualizado,
  className = '',
}: Props) {
  const { showToast } = useToast()
  const [titulo, setTitulo] = useState<string>(tituloAtual)
  const [salvando, setSalvando] = useState(false)

  const handleEquiparTitulo = async (novoTitulo: string) => {
    if (novoTitulo === titulo) return
    try {
      setSalvando(true)
      const res = await equiparTitulo(novoTitulo)
      if (res.ok) {
        setTitulo(novoTitulo)
        showToast(`Título "${novoTitulo}" equipado.`, 'success')
        onAtualizado?.()
      } else {
        showToast(res.erro || 'Não foi possível equipar o título.', 'error')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className={`p-5 sm:p-6 rounded-2xl surface-glass ${className}`}>
      {/* No celular o selo desce para baixo do texto: lado a lado, o título ficava espremido
          numa coluna estreita. */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="min-w-0">
          <span className="font-mono text-xs text-muted-2 uppercase tracking-widest block">// títulos de honra</span>
          <h3 className="font-manrope font-extrabold text-base sm:text-lg tracking-tight text-text m-0">Título equipado</h3>
          <p className="text-xs text-muted m-0 mt-1">Aparece ao lado do seu nome no perfil e nos comentários. Novos títulos vêm de eventos, do Chefão e de convites.</p>
        </div>
        <span className="self-start font-mono text-xs font-bold text-gold inline-flex items-center gap-1 bg-gold/15 border border-gold/30 px-2.5 py-0.5 rounded-full shrink-0">
          <Award size={12} /> {titulo}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {titulosDisponiveis.map((t) => {
          const equipado = titulo === t
          return (
            <button
              key={t}
              type="button"
              disabled={salvando}
              aria-pressed={equipado}
              onClick={() => handleEquiparTitulo(t)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                equipado
                  ? 'bg-gold/20 border-gold text-gold shadow-md'
                  : 'bg-panel-2 border-line hover:border-line/80 text-muted hover:text-text'
              }`}
            >
              {equipado ? `✓ ${t}` : t}
            </button>
          )
        })}
      </div>
    </div>
  )
}
