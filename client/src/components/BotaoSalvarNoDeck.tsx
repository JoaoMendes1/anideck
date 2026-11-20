// client/src/components/BotaoSalvarNoDeck.tsx
// O botão redondo "+" / "✓" de pôr um anime no Deck, o mesmo do Descobrir.
import { Check } from 'lucide-react'

export default function BotaoSalvarNoDeck({
  salvo,
  salvando,
  aoClicar,
  podeRemover = true,
}: {
  salvo: boolean
  salvando: boolean
  aoClicar: (e: React.MouseEvent) => void
  /** Falso onde remover por engano custaria caro (Agenda): o "✓" só confirma que já está no Deck. */
  podeRemover?: boolean
}) {
  const rotulo = salvo ? (podeRemover ? 'Remover do Deck' : 'Já está no seu Deck') : 'Adicionar ao Deck'
  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={salvando}
      aria-label={rotulo}
      title={rotulo}
      className={`w-8 h-8 rounded-full border-[1.5px] flex items-center justify-center font-bold backdrop-blur-md transition-all select-none shadow-lg active:scale-90 ${
        salvo
          ? `bg-green/20 border-green text-green cursor-pointer ${podeRemover ? 'hover:bg-coral/20 hover:border-coral hover:text-coral' : ''}`
          : 'bg-void/80 border-white/40 text-white hover:bg-gradient-to-r hover:from-holo-1 hover:to-holo-2 hover:border-transparent cursor-pointer opacity-90 hover:opacity-100'
      }`}
    >
      {salvando ? (
        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : salvo ? (
        <Check size={16} strokeWidth={3} />
      ) : (
        '+'
      )}
    </button>
  )
}
