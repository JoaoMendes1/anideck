// client/src/components/rpg/PreferenciasDeConvite.tsx
// Quem pode chamar o jogador para lutar e se o convite aparece no meio da tela.
import { useEffect, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { lerPreferenciasConvite, salvarPreferenciasConvite, type QuemConvida } from '../../lib/grupo'

const OPCOES: { id: QuemConvida; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'amigos', rotulo: 'Amigos e clã' },
  { id: 'ninguem', rotulo: 'Ninguém' },
]

export default function PreferenciasDeConvite({ compacto = false }: { compacto?: boolean }) {
  const { showToast } = useToast()
  const [quem, setQuem] = useState<QuemConvida | null>(null)
  const [aviso, setAviso] = useState(true)

  useEffect(() => {
    lerPreferenciasConvite().then((p) => {
      if (p) {
        setQuem(p.quem)
        setAviso(p.aviso)
      }
    })
  }, [])

  const salvar = async (novoQuem: QuemConvida, novoAviso: boolean) => {
    const antes = { quem, aviso }
    setQuem(novoQuem)
    setAviso(novoAviso)
    const r = await salvarPreferenciasConvite(novoQuem, novoAviso)
    if (r.erro) {
      setQuem(antes.quem)
      setAviso(antes.aviso)
      showToast(r.erro, 'error')
    }
  }

  if (!quem) return null
  return (
    <div className={`flex flex-col gap-2 ${compacto ? '' : 'rounded-2xl border border-line bg-panel p-4'}`}>
      {!compacto && <p className="m-0 text-sm font-bold text-text">Convites para lutar em grupo</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted">Quem pode me chamar:</span>
        <div className="inline-flex rounded-full border border-line bg-panel-2 p-0.5" role="radiogroup" aria-label="Quem pode me chamar">
          {OPCOES.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={quem === o.id}
              onClick={() => salvar(o.id, aviso)}
              className={`h-8 cursor-pointer rounded-full px-3 font-bold ${quem === o.id ? 'bg-holo-3 text-void' : 'text-muted hover:text-text'}`}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-text">
        <input type="checkbox" checked={aviso} disabled={quem === 'ninguem'} onChange={(e) => salvar(quem, e.target.checked)} />
        Mostrar o convite no meio da tela
      </label>
    </div>
  )
}
