// client/src/components/rpg/BotaoEmGrupo.tsx
// Abre um grupo para o alvo e leva à sala, onde se convida e se começa a luta.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { abrirGrupo, type AlvoDoGrupo } from '../../lib/grupo'

export default function BotaoEmGrupo({ tipo, alvoId, nome, desativado }: { tipo: AlvoDoGrupo; alvoId: string; nome: string; desativado?: boolean }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [abrindo, setAbrindo] = useState(false)
  const abrir = async () => {
    setAbrindo(true)
    const r = await abrirGrupo(tipo, alvoId)
    setAbrindo(false)
    if (r.erro || !r.dados) {
      showToast(r.erro ?? 'Não foi possível abrir o grupo agora.', 'error')
      return
    }
    navigate(`/grupo/${r.dados.grupo_id}`)
  }
  return (
    <button
      type="button"
      onClick={abrir}
      disabled={abrindo || desativado}
      aria-label={`Lutar em grupo contra ${nome}`}
      className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-holo-2/50 px-4 text-xs font-bold text-holo-2 hover:bg-holo-2/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Users size={14} aria-hidden="true" /> {abrindo ? 'Abrindo…' : 'Em grupo'}
    </button>
  )
}
