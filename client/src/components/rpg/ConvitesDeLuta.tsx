// client/src/components/rpg/ConvitesDeLuta.tsx
// Mantém o jogador "online" enquanto o site está aberto e mostra os convites para lutar:
// no meio da tela, ou num botão discreto para quem desligou o aviso. Fica no Layout.
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Swords, X } from 'lucide-react'
import { useSessao } from '../../contexts/SessaoContext'
import { useToast } from '../../contexts/ToastContext'
import { aceitarConvite, lerConvitesPendentes, marcarOnline, minutosRestantes, recusarConvite, type ConvitePendente } from '../../lib/grupo'
import PreferenciasDeConvite from './PreferenciasDeConvite'

/** De quanto em quanto tempo o site aberto confere convites novos. */
export const INTERVALO_CONVITES_MS = 15 * 1000
/** De quanto em quanto tempo o site aberto avisa que o jogador está online. */
export const INTERVALO_ONLINE_MS = 2 * 60 * 1000

export default function ConvitesDeLuta() {
  const { session } = useSessao()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [convites, setConvites] = useState<ConvitePendente[]>([])
  const [aberto, setAberto] = useState(false)
  const [ajustes, setAjustes] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  // Convites já mostrados: o aviso abre sozinho só quando chega um novo.
  const vistos = useRef(new Set<string>())

  const conferir = useCallback(async () => {
    if (document.visibilityState === 'hidden') return
    const r = await lerConvitesPendentes()
    setConvites(r.convites)
    const novo = r.convites.some((c) => !vistos.current.has(c.grupo_id))
    r.convites.forEach((c) => vistos.current.add(c.grupo_id))
    if (novo && r.aviso) setAberto(true)
    if (r.convites.length === 0) setAberto(false)
  }, [])

  useEffect(() => {
    if (!session) return
    marcarOnline()
    conferir()
    const c = window.setInterval(conferir, INTERVALO_CONVITES_MS)
    const o = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') marcarOnline()
    }, INTERVALO_ONLINE_MS)
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') {
        marcarOnline()
        conferir()
      }
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      window.clearInterval(c)
      window.clearInterval(o)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [session, conferir])

  if (!session || convites.length === 0) return null

  const aceitar = async (c: ConvitePendente) => {
    setOcupado(c.grupo_id)
    const r = await aceitarConvite(c.grupo_id)
    setOcupado(null)
    if (r.erro) {
      showToast(r.erro, 'error')
      conferir()
      return
    }
    setAberto(false)
    setConvites((l) => l.filter((x) => x.grupo_id !== c.grupo_id))
    navigate(`/grupo/${c.grupo_id}`)
  }

  const recusar = async (c: ConvitePendente) => {
    setOcupado(c.grupo_id)
    await recusarConvite(c.grupo_id)
    setOcupado(null)
    setConvites((l) => l.filter((x) => x.grupo_id !== c.grupo_id))
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="fixed bottom-24 right-4 z-[55] inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-holo-2/60 bg-panel px-4 text-xs font-bold text-holo-2 shadow-xl md:bottom-6"
      >
        <Swords size={15} aria-hidden="true" />
        {convites.length === 1 ? '1 convite para lutar' : `${convites.length} convites para lutar`}
      </button>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-void/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-convites">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl border border-line bg-panel shadow-2xl">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Swords size={20} className="shrink-0 text-holo-2" aria-hidden="true" />
          <h2 id="titulo-convites" className="m-0 flex-1 text-lg font-bold">
            {convites.length === 1 ? 'Chamado para lutar' : `${convites.length} chamados para lutar`}
          </h2>
          <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="cursor-pointer text-muted hover:text-text">
            <X size={20} />
          </button>
        </header>
        <ul className="m-0 flex flex-1 list-none flex-col gap-3 overflow-y-auto p-5">
          {convites.map((c) => (
            <li key={c.grupo_id} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel-2 p-4">
              <p className="m-0 text-sm">
                <strong>{c.lider_nome}</strong> <span className="text-muted">(@{c.lider_handle})</span> chamou você para{' '}
                {c.alvo_tipo === 'masmorra' ? 'explorar a masmorra' : 'enfrentar'} <strong className="text-holo-3">{c.alvo_nome}</strong>.
              </p>
              <p className="m-0 font-mono text-xs text-muted">Vale por mais {minutosRestantes(c.expira_em)} min · você gasta a sua Mana e ganha a recompensa inteira.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => aceitar(c)}
                  disabled={ocupado !== null}
                  className="h-11 flex-1 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 text-sm font-extrabold text-void disabled:opacity-50"
                >
                  {ocupado === c.grupo_id ? 'Entrando…' : 'Aceitar'}
                </button>
                <button
                  type="button"
                  onClick={() => recusar(c)}
                  disabled={ocupado !== null}
                  className="h-11 cursor-pointer rounded-full border border-line px-5 text-sm font-bold text-muted hover:text-text disabled:opacity-50"
                >
                  Recusar
                </button>
              </div>
            </li>
          ))}
        </ul>
        <footer className="border-t border-line px-5 py-3">
          {ajustes ? (
            <PreferenciasDeConvite compacto />
          ) : (
            <button type="button" onClick={() => setAjustes(true)} className="cursor-pointer text-xs text-muted underline-offset-2 hover:text-text hover:underline">
              Ajustar quem pode me chamar
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  )
}
