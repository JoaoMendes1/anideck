// client/src/components/ContinuarComoConta.tsx
// No login, as contas já guardadas neste aparelho: um toque volta para elas sem senha.
import { useState } from 'react'
import { lerContas, trocarPara, type ContaSalva } from '../lib/contasSalvas'

export default function ContinuarComoConta() {
  const [contas, setContas] = useState(lerContas)
  const [erro, setErro] = useState('')
  const [trocando, setTrocando] = useState('')
  if (contas.length === 0) return null

  const continuar = async (c: ContaSalva) => {
    setTrocando(c.user_id)
    setErro('')
    const r = await trocarPara(c)
    if (r.erro) {
      setTrocando('')
      setErro(r.erro)
      setContas(lerContas())
      return
    }
    window.location.assign('/')
  }

  return (
    <div className="mb-5 flex flex-col gap-2">
      <p className="m-0 text-xs font-bold uppercase tracking-wide text-muted-2">Contas neste aparelho</p>
      {contas.map((c) => (
        <button
          key={c.user_id}
          type="button"
          onClick={() => continuar(c)}
          disabled={trocando !== ''}
          className="flex w-full cursor-pointer flex-col items-start rounded-xl border border-line bg-panel-2 px-3.5 py-2.5 text-left hover:border-holo-3 disabled:opacity-60"
        >
          <span className="text-sm font-bold text-text">{trocando === c.user_id ? 'Entrando…' : `Continuar como ${c.nome || c.email}`}</span>
          {c.nome && c.email && <span className="font-mono text-xs text-muted">{c.email}</span>}
        </button>
      ))}
      {erro && <p role="alert" className="m-0 text-xs font-bold text-coral">{erro}</p>}
    </div>
  )
}
