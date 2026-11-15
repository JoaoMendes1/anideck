// client/src/components/CampoNumerico.tsx
// Campo de número com botões de menos e mais. Existe por causa de um defeito do
// <input type="number"> ligado direto a um estado numérico: apagar o conteúdo virava 0 na
// hora, e não dava para digitar um valor novo do zero. Aqui o texto digitado fica à parte,
// e o valor só é avisado quando é um número dentro dos limites; ao sair do campo, o que
// estiver fora é ajustado.
import { useState, type InputHTMLAttributes } from 'react'
import { Minus, Plus } from 'lucide-react'
import { casasDoPasso, darPasso, dentroDosLimites, interpretarNumero, limitar } from '../lib/campoNumerico'

type AtributosDoInput = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min' | 'max' | 'step' | 'inputMode'>

interface Props extends AtributosDoInput {
  value: number
  aoMudar: (valor: number) => void
  min?: number
  max?: number
  step?: number
  /** Sem os botões de menos e mais: para campo estreito demais para eles. */
  semBotoes?: boolean
}

const CLASSE_DO_BOTAO =
  'w-6 h-6 shrink-0 grid place-items-center rounded-md border border-line bg-void/50 text-muted transition-colors hover:text-text hover:border-holo-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer focus-visible:outline-2 focus-visible:outline-holo-3'

export default function CampoNumerico({ value, aoMudar, min, max, step = 1, semBotoes = false, className = '', disabled, ...resto }: Props) {
  const casas = casasDoPasso(step)
  const [texto, setTexto] = useState(String(value))
  const [valorVisto, setValorVisto] = useState(value)

  // O valor mudou por fora (carga do servidor, botão de restaurar): o texto acompanha,
  // a não ser que já diga o mesmo número (o usuário está no meio da digitação).
  if (value !== valorVisto) {
    setValorVisto(value)
    if (interpretarNumero(texto, casas) !== value) setTexto(String(value))
  }

  const digitar = (novo: string) => {
    setTexto(novo)
    const n = interpretarNumero(novo, casas)
    if (n !== null && dentroDosLimites(n, min, max)) aoMudar(n)
  }

  const aoSair = () => {
    const n = interpretarNumero(texto, casas)
    // Vazio ou inválido: volta ao último valor aceito. Fora dos limites: ajusta.
    const final = n === null ? value : limitar(n, min, max)
    setTexto(String(final))
    if (final !== value) aoMudar(final)
  }

  const passo = (direcao: 1 | -1) => {
    const proximo = darPasso(value, direcao, step, min, max)
    setTexto(String(proximo))
    if (proximo !== value) aoMudar(proximo)
  }

  return (
    <span className={`inline-flex items-center gap-1 max-w-full focus-within:border-holo-3 ${disabled ? 'opacity-50' : ''} ${className}`}>
      <input
        {...resto}
        type="text"
        inputMode={casas > 0 ? 'decimal' : 'numeric'}
        autoComplete="off"
        disabled={disabled}
        value={texto}
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        onChange={(e) => digitar(e.target.value)}
        onBlur={aoSair}
        onKeyDown={(e) => {
          // Setas para cima e para baixo, como no campo numérico nativo.
          if (e.key === 'ArrowUp') { e.preventDefault(); passo(1) }
          if (e.key === 'ArrowDown') { e.preventDefault(); passo(-1) }
        }}
        className="flex-1 w-full min-w-0 bg-transparent outline-none tabular-nums"
      />
      {/* Os botões são atalho de ponteiro: fora da ordem do Tab e do leitor de tela, que
          usam o próprio campo e as setas do teclado. */}
      {!semBotoes && (
        <>
          <button type="button" tabIndex={-1} aria-hidden="true" title="Diminuir" disabled={disabled || (min !== undefined && value <= min)} onClick={() => passo(-1)} className={CLASSE_DO_BOTAO}>
            <Minus size={12} aria-hidden />
          </button>
          <button type="button" tabIndex={-1} aria-hidden="true" title="Aumentar" disabled={disabled || (max !== undefined && value >= max)} onClick={() => passo(1)} className={CLASSE_DO_BOTAO}>
            <Plus size={12} aria-hidden />
          </button>
        </>
      )}
    </span>
  )
}
