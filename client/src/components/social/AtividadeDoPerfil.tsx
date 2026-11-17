// client/src/components/social/AtividadeDoPerfil.tsx
// Atividade de um perfil público: o que está assistindo agora e o que fez nos últimos 60
// dias (episódios, completos, comentários e curtidas). Some quando o dono escondeu a
// atividade nas Configurações.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, EyeOff, PlayCircle } from 'lucide-react'
import ListaDeAtividade from './ListaDeAtividade'
import { buscarCapas, obterAtividadeDoPerfil, type AtividadeDoPerfil as Dados, type CapaDoAnime } from '../../lib/social'

interface Props {
  handle: string
  /** Falso quando o dono escondeu a atividade. */
  mostra: boolean
  souEu: boolean
}

export default function AtividadeDoPerfil({ handle, mostra, souEu }: Props) {
  const [dados, setDados] = useState<Dados | null | undefined>(undefined)
  const [capas, setCapas] = useState<Map<number, CapaDoAnime>>(new Map())

  useEffect(() => {
    if (!mostra) return
    let ativo = true
    setDados(undefined)
    obterAtividadeDoPerfil(handle).then(async d => {
      if (!ativo) return
      setDados(d)
      if (d?.assistindo?.length) {
        const achadas = await buscarCapas(d.assistindo.map(a => a.mal_id))
        if (ativo) setCapas(achadas)
      }
    })
    return () => {
      ativo = false
    }
  }, [handle, mostra])

  if (!mostra) {
    return (
      <section className="rounded-2xl bg-panel border border-line p-5 mb-6 flex items-start gap-3">
        <EyeOff size={18} className="text-muted shrink-0 mt-0.5" aria-hidden />
        <p className="m-0 text-sm text-muted">
          {souEu ? (
            <>
              Sua atividade está escondida: ninguém vê o que você assiste, comenta e curte.{' '}
              <Link to="/configuracoes#comunidade" className="font-bold text-holo-3 hover:underline">Mostrar de novo</Link>
            </>
          ) : (
            `@${handle} preferiu não mostrar o que assiste e comenta.`
          )}
        </p>
      </section>
    )
  }

  const assistindo = dados?.assistindo ?? []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start mb-6">
      <section className="rounded-2xl bg-panel border border-line p-5 min-w-0" aria-labelledby="atividade-recente">
        <h2 id="atividade-recente" className="font-anton text-base uppercase m-0 mb-1 inline-flex items-center gap-2">
          <Activity size={16} className="text-holo-3" aria-hidden /> Atividade recente
        </h2>
        {dados === undefined ? (
          <div className="h-40 rounded-xl bg-panel-2 animate-pulse mt-3" />
        ) : (
          <ListaDeAtividade
            chave={handle}
            inicial={dados}
            semAutor
            carregar={antes => obterAtividadeDoPerfil(handle, antes)}
            vazio={souEu ? 'Marque episódios ou comente para sua atividade aparecer aqui.' : 'Nada nos últimos 60 dias.'}
          />
        )}
      </section>

      <section className="rounded-2xl bg-panel border border-line p-5" aria-labelledby="assistindo-agora">
        <h2 id="assistindo-agora" className="font-anton text-base uppercase m-0 mb-4 inline-flex items-center gap-2">
          <PlayCircle size={16} className="text-green" aria-hidden /> Assistindo agora
        </h2>
        {dados === undefined ? (
          <div className="h-32 rounded-xl bg-panel-2 animate-pulse" />
        ) : assistindo.length === 0 ? (
          <p className="m-0 text-sm text-muted">Nenhum anime na lista Assistindo.</p>
        ) : (
          <ul className="m-0 p-0 list-none space-y-3">
            {assistindo.map(a => {
              const capa = capas.get(a.mal_id)
              const titulo = a.titulo || capa?.titulo || `Anime #${a.mal_id}`
              const pct = a.episodios && a.ultimo_episodio ? Math.min(100, (a.ultimo_episodio / a.episodios) * 100) : 0
              return (
                <li key={a.mal_id}>
                  <Link to={`/anime/${a.mal_id}`} className="flex items-center gap-3 group">
                    <span className="w-10 h-14 shrink-0 rounded-lg overflow-hidden border border-line bg-panel-2">
                      {capa?.imagem && <img src={capa.imagem} alt="" loading="lazy" className="w-full h-full object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold truncate group-hover:text-holo-3">{titulo}</span>
                      <span className="block font-mono text-xs text-muted mt-0.5">
                        {a.ultimo_episodio ? `ep ${a.ultimo_episodio}${a.episodios ? ` de ${a.episodios}` : ''}` : 'ainda no começo'}
                      </span>
                      {pct > 0 && (
                        <span className="block mt-1.5 h-1 rounded-full bg-void/70 overflow-hidden">
                          <span className="block h-full rounded-full bg-green" style={{ width: `${pct}%` }} />
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
