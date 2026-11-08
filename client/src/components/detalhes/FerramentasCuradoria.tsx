// client/src/components/detalhes/FerramentasCuradoria.tsx
// Atalhos de curadoria na página do anime, só para o admin. Recolhidos por padrão numa
// linha com o estado da obra; a escolha de abrir ou fechar fica lembrada neste navegador.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Sparkles, Wrench } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'

const CHAVE_ABERTA = 'anideck:curadoria-detalhes-aberta'

function lerPreferencia(): boolean {
  try {
    return localStorage.getItem(CHAVE_ABERTA) === '1'
  } catch {
    return false
  }
}

interface Props {
  malId: number
  curada: boolean
  statusCuradoria?: string
  semEpisodios: boolean
  emBreve?: boolean
}

export default function FerramentasCuradoria({ malId, curada, statusCuradoria, semEpisodios, emBreve }: Props) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  // Obra sem episódio é emergência: abre sozinho, independente da preferência.
  const [aberta, setAberta] = useState(() => (semEpisodios && !emBreve) || lerPreferencia())
  const [forcarIA, setForcarIA] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const alternar = () => {
    const nova = !aberta
    setAberta(nova)
    try {
      localStorage.setItem(CHAVE_ABERTA, nova ? '1' : '0')
    } catch {
      // Sem armazenamento (aba anônima): vale só nesta visita.
    }
  }

  const iaBloqueada = curada && !forcarIA && !semEpisodios
  const rotuloStatus = statusCuradoria === 'completo' ? 'Completo' : statusCuradoria === 'revisar' ? 'Revisar' : 'Parcial'

  const enviarParaIA = async (tipo: 'sinopse_tags' | 'completo') => {
    setEnviando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/admin/ia/fila', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mal_ids: [malId], tipo }),
      })
      if (!res.ok) throw new Error((await res.text()).trim())
      showToast(`Enviado para a fila da IA: ${tipo === 'sinopse_tags' ? 'sinopse e tags' : 'sinopse, tags e episódios'}.`)
      setForcarIA(false)
    } catch (e) {
      showToast(e instanceof Error && e.message ? e.message : 'Erro ao enviar para a fila da IA.', 'error')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={`rounded-2xl border bg-panel/90 ${semEpisodios ? 'border-coral/60' : emBreve ? 'border-holo-3/40' : curada ? 'border-green/35' : 'border-gold/40'}`}>
      <button type="button" onClick={alternar} aria-expanded={aberta} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left cursor-pointer">
        <Wrench size={14} className="text-gold shrink-0" aria-hidden />
        <span className="text-[12px] font-bold text-gold">Curadoria</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase border ${
            semEpisodios
              ? 'bg-coral/15 text-coral border-coral/50'
              : emBreve
                ? 'bg-holo-3/15 text-holo-3 border-holo-3/40'
                : curada
                  ? 'bg-green/12 text-green border-green/40'
                  : 'bg-gold/12 text-gold border-gold/40'
          }`}
        >
          {semEpisodios ? 'Sem episódios' : emBreve ? (curada ? 'Curado · Em breve' : 'Em breve') : curada ? `Curado · ${rotuloStatus}` : 'Não curado'}
        </span>
        <span className="font-mono text-[10px] text-muted-2 ml-auto hidden sm:inline">MAL #{malId}</span>
        <ChevronDown size={15} className={`text-muted shrink-0 transition-transform ${aberta ? 'rotate-180' : ''} sm:ml-2 ml-auto`} aria-hidden />
      </button>

      {aberta && (
        <div className="px-3.5 pb-3.5 pt-1 flex flex-wrap items-center gap-2 border-t border-line/60">
          <button
            type="button"
            onClick={() => navigate(`/admin?aba=curadoria&mal_id=${malId}`)}
            className="mt-2.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-panel-2 border border-line text-text hover:border-gold hover:text-gold cursor-pointer"
          >
            {curada ? 'Editar curadoria' : 'Curar manualmente'}
          </button>
          <button
            type="button"
            onClick={() => enviarParaIA('sinopse_tags')}
            disabled={enviando || iaBloqueada}
            title={iaBloqueada ? 'Obra já curada. Marque "Curar de novo com IA" para liberar.' : 'Sinopse e tags pela IA'}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-holo-1/15 border border-holo-1/40 text-holo-1 hover:bg-holo-1 hover:text-void cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <Sparkles size={12} aria-hidden /> {enviando ? 'Enviando…' : 'IA: sinopse e tags'}
          </button>
          <button
            type="button"
            onClick={() => enviarParaIA('completo')}
            disabled={enviando || iaBloqueada}
            className="mt-2.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-panel-2 border border-line text-muted hover:text-text hover:border-holo-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            IA: tudo, com episódios
          </button>
          {curada && (
            <label className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-void/60 border border-line text-muted cursor-pointer select-none">
              <input type="checkbox" checked={forcarIA} onChange={e => setForcarIA(e.target.checked)} className="accent-gold cursor-pointer" />
              Curar de novo com IA
            </label>
          )}
          <button type="button" onClick={() => navigate('/admin?aba=revisao_ia')} className="mt-2.5 ml-auto px-2 py-1.5 text-xs font-bold text-muted hover:text-text cursor-pointer">
            Ver fila →
          </button>
        </div>
      )}
    </div>
  )
}
