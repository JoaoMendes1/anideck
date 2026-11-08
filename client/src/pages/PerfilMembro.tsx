// client/src/pages/PerfilMembro.tsx
// Perfil público de um membro (/u/:handle): ficha da Guilda, vitrine e números do deck.
// Só existe para perfil marcado como público; o resto do deck continua privado.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Ban, CalendarDays, Heart, MessageCircle, PlayCircle, Sparkles, UserX } from 'lucide-react'
import { useSessao } from '../contexts/SessaoContext'
import { useToast } from '../contexts/ToastContext'
import { useComunidade } from '../hooks/useComunidade'
import { obterEstiloRank } from '../lib/guilda'
import { faixaDoHP, type PerfilPublico } from '../lib/comunidade'

interface CartaDaVitrine {
  mal_id: number
  title: string
  image_url: string
}

const ORDEM_STATUS = ['Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado']

export default function PerfilMembro() {
  const { handle = '' } = useParams()
  const { session } = useSessao()
  const token = session?.access_token
  const { showToast } = useToast()
  const { estado } = useComunidade()
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null)
  const [estadoTela, setEstadoTela] = useState<'carregando' | 'pronto' | 'ausente' | 'erro'>('carregando')
  const [vitrine, setVitrine] = useState<CartaDaVitrine[]>([])
  const [bloqueado, setBloqueado] = useState<boolean | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const souEu = !!estado?.perfil.existe && estado.perfil.handle === handle.toLowerCase()

  useEffect(() => {
    let ativo = true
    setEstadoTela('carregando')
    setVitrine([])
    ;(async () => {
      try {
        const res = await fetch(`/api/membros/${encodeURIComponent(handle)}`)
        if (res.status === 404) {
          if (ativo) setEstadoTela('ausente')
          return
        }
        if (!res.ok) throw new Error()
        const dados = (await res.json()) as PerfilPublico
        if (!ativo) return
        setPerfil(dados)
        setEstadoTela('pronto')
        document.title = `${dados.nome} (@${dados.handle}) · AniDeck`
        if (dados.vitrine.length > 0) {
          const bulk = await fetch('/api/anime/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: dados.vitrine }),
          })
          const lista = bulk.ok ? (((await bulk.json()) as { data?: { mal_id: number; title: string; images?: { jpg?: { image_url?: string } } }[] }).data ?? []) : []
          const porId = new Map(lista.map(a => [a.mal_id, a]))
          if (ativo) {
            setVitrine(
              dados.vitrine
                .map(id => porId.get(id))
                .filter((a): a is NonNullable<typeof a> => !!a)
                .map(a => ({ mal_id: a.mal_id, title: a.title, image_url: a.images?.jpg?.image_url ?? '' }))
            )
          }
        }
      } catch {
        if (ativo) setEstadoTela('erro')
      }
    })()
    return () => {
      ativo = false
      document.title = 'AniDeck'
    }
  }, [handle])

  useEffect(() => {
    if (!token || souEu) return
    let ativo = true
    fetch('/api/comunidade/bloqueios', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? (r.json() as Promise<string[]>) : []))
      .then(lista => {
        if (ativo) setBloqueado(lista.includes(handle.toLowerCase()))
      })
      .catch(() => undefined)
    return () => {
      ativo = false
    }
  }, [token, handle, souEu])

  const alternarBloqueio = async () => {
    if (!token || bloqueado === null) return
    setOcupado(true)
    try {
      const res = await fetch(`/api/comunidade/bloqueios/${encodeURIComponent(handle)}`, {
        method: bloqueado ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setBloqueado(!bloqueado)
      showToast(bloqueado ? `@${handle} desbloqueado.` : `@${handle} bloqueado. Os comentários dele somem para você.`)
    } catch {
      showToast('Não foi possível concluir agora.', 'error')
    } finally {
      setOcupado(false)
    }
  }

  if (estadoTela === 'carregando') {
    return (
      <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 pt-8 pb-24">
        <div className="h-48 rounded-2xl bg-panel border border-line animate-pulse mb-6" />
        <div className="h-64 rounded-2xl bg-panel border border-line animate-pulse" />
      </div>
    )
  }

  if (estadoTela !== 'pronto' || !perfil) {
    return (
      <div className="w-full max-w-md mx-auto px-4 pt-16 pb-24 text-center">
        <span className="w-14 h-14 mx-auto rounded-full grid place-items-center bg-panel border border-line mb-4">
          <UserX size={22} className="text-muted" aria-hidden />
        </span>
        <h1 className="font-anton text-2xl uppercase mb-2">
          {estadoTela === 'ausente' ? 'Membro não encontrado' : 'Perfil indisponível'}
        </h1>
        <p className="text-sm text-muted mb-6">
          {estadoTela === 'ausente'
            ? `Não existe perfil público para @${handle}. Ele pode ter escondido o perfil ou trocado de @.`
            : 'Não foi possível carregar este perfil agora. Tente de novo em instantes.'}
        </p>
        <Link to="/membros" className="inline-block px-5 py-2.5 rounded-full text-xs font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2">
          Ver ranking de membros
        </Link>
      </div>
    )
  }

  const estilo = obterEstiloRank(perfil.rank)
  const desde = new Date(perfil.membro_desde)
  const faixa = faixaDoHP(perfil.hp)
  const status = [...ORDEM_STATUS, ...Object.keys(perfil.status).filter(s => !ORDEM_STATUS.includes(s))].filter(s => (perfil.status[s] ?? 0) > 0)
  const totalNoDeck = Object.values(perfil.status).reduce((a, b) => a + b, 0)

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 pt-6 pb-24">
      <section className="relative overflow-hidden rounded-2xl bg-panel border border-line p-5 sm:p-7 mb-6">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-holo-2/15 blur-3xl pointer-events-none" aria-hidden />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <span className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shrink-0 grid place-items-center font-anton text-4xl text-void bg-gradient-to-br from-holo-1 via-holo-2 to-holo-3 shadow-[0_0_40px_rgba(123,92,255,0.25)]" aria-hidden>
            {perfil.nome.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${estilo.bordaPilula} ${estilo.fundoPilula} ${estilo.seloTexto}`}>
                Rank {perfil.rank} · Nível {perfil.nivel}
              </span>
              <span className="font-mono text-[10px] text-muted-2 inline-flex items-center gap-1">
                <CalendarDays size={11} aria-hidden /> membro desde {desde.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
              </span>
            </div>
            <h1 className="font-anton text-[clamp(1.6rem,4vw,2.4rem)] uppercase leading-none m-0 break-words">{perfil.nome}</h1>
            <p className="font-mono text-[12px] text-muted mt-1 mb-0">
              @{perfil.handle} · <span className="text-text">{perfil.titulo_rank}</span>
            </p>
            {perfil.bio && <p className="text-[14px] text-text/85 mt-3 mb-0 max-w-xl whitespace-pre-wrap break-words">{perfil.bio}</p>}
          </div>
          <div className="flex sm:flex-col gap-2 shrink-0">
            {souEu ? (
              <Link to="/configuracoes#comunidade" className="px-4 py-2 rounded-full text-xs font-bold border border-line hover:border-holo-3 text-text">
                Editar perfil
              </Link>
            ) : (
              token &&
              bloqueado !== null && (
                <button type="button" onClick={alternarBloqueio} disabled={ocupado} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border border-line text-muted hover:text-text cursor-pointer disabled:opacity-50">
                  <Ban size={13} aria-hidden /> {bloqueado ? 'Desbloquear' : 'Bloquear'}
                </button>
              )
            )}
          </div>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { rotulo: 'XP total', valor: perfil.xp_total.toLocaleString('pt-BR'), icone: <Sparkles size={13} className="text-holo-2" aria-hidden /> },
            { rotulo: 'Episódios vistos', valor: perfil.episodios_vistos.toLocaleString('pt-BR'), icone: <PlayCircle size={13} className="text-holo-3" aria-hidden /> },
            { rotulo: 'Comentários', valor: perfil.comentarios.toLocaleString('pt-BR'), icone: <MessageCircle size={13} className="text-holo-1" aria-hidden /> },
            { rotulo: 'Vitalidade', valor: `${perfil.hp}/100`, icone: <Heart size={13} className="text-coral" aria-hidden /> },
          ].map(item => (
            <div key={item.rotulo} className="rounded-xl bg-panel-2 border border-line p-3">
              <div className="font-mono text-[10px] text-muted-2 uppercase tracking-wider flex items-center gap-1.5">
                {item.icone} {item.rotulo}
              </div>
              <div className="font-anton text-xl mt-1 leading-none">{item.valor}</div>
              {item.rotulo === 'Vitalidade' && (
                <div className="h-1 rounded-full bg-panel overflow-hidden mt-2">
                  <div className={`h-full ${faixa === 'baixo' ? 'bg-coral/60' : 'bg-coral'}`} style={{ width: `${perfil.hp}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <section className="rounded-2xl bg-panel border border-line p-5">
          <h2 className="font-anton text-base uppercase m-0 mb-4">A mão de @{perfil.handle}</h2>
          {vitrine.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {vitrine.map((a, i) => (
                <Link key={a.mal_id} to={`/anime/${a.mal_id}`} className="group" style={{ transform: `rotate(${(i - (vitrine.length - 1) / 2) * 1.5}deg)` }}>
                  <div className="aspect-[2/3] rounded-xl overflow-hidden border border-line group-hover:border-holo-3 transition-colors shadow-lg">
                    <img src={a.image_url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="text-[11.5px] font-bold mt-1.5 line-clamp-2 leading-tight group-hover:text-holo-3 transition-colors">{a.title}</div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted m-0">{souEu ? 'Escolha até cinco animes para mostrar aqui nas Configurações.' : 'Este membro ainda não montou a vitrine.'}</p>
          )}
        </section>

        <aside className="rounded-2xl bg-panel border border-line p-5">
          <h2 className="font-anton text-base uppercase m-0 mb-1">No deck</h2>
          <p className="font-mono text-[10.5px] text-muted-2 mt-0 mb-4">{totalNoDeck} {totalNoDeck === 1 ? 'obra' : 'obras'} · os títulos ficam privados</p>
          {status.length > 0 ? (
            <ul className="list-none m-0 p-0 space-y-2.5">
              {status.map(s => (
                <li key={s}>
                  <div className="flex items-center justify-between text-[12.5px] mb-1">
                    <span className="text-muted">{s}</span>
                    <b className="font-mono text-text">{perfil.status[s]}</b>
                  </div>
                  <div className="h-1.5 rounded-full bg-panel-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-holo-2 to-holo-3" style={{ width: `${Math.round((perfil.status[s] / Math.max(1, totalNoDeck)) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted m-0">Deck vazio por enquanto.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
