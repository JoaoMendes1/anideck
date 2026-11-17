// client/src/components/social/ListaDeAtividade.tsx
// Lista paginada de eventos, usada pelo feed e pelo perfil público. Quem a usa diz como
// buscar uma página; a lista cuida do "carregar mais", das capas e dos estados vazios.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import ItemDeAtividade from './ItemDeAtividade'
import { buscarCapas, juntarEventos, type CapaDoAnime, type EventoDeAtividade, type PaginaDeAtividade } from '../../lib/social'

interface Props {
  /** Busca uma página; sem cursor, a primeira. null ou erro: falhou. */
  carregar: (antes?: string) => Promise<PaginaDeAtividade | null>
  /** Muda quando a lista deve recomeçar do zero (outra aba, outro perfil). */
  chave: string
  semAutor?: boolean
  vazio: ReactNode
  /** Página inicial já buscada por quem usa a lista (o perfil busca junto com o "assistindo"). */
  inicial?: PaginaDeAtividade | null
}

export default function ListaDeAtividade({ carregar, chave, semAutor = false, vazio, inicial }: Props) {
  const [eventos, setEventos] = useState<EventoDeAtividade[]>(inicial?.eventos ?? [])
  const [proximo, setProximo] = useState<string | undefined>(inicial?.proximo)
  const [capas, setCapas] = useState<Map<number, CapaDoAnime>>(new Map())
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>(inicial ? 'pronto' : 'carregando')
  const [maisCarregando, setMaisCarregando] = useState(false)
  const [agora] = useState(() => Date.now())
  const geracao = useRef(0)

  const completarCapas = useCallback(async (novos: EventoDeAtividade[]) => {
    const faltam = novos.map(e => e.mal_id)
    if (faltam.length === 0) return
    const achadas = await buscarCapas(faltam)
    setCapas(atuais => new Map([...atuais, ...achadas]))
  }, [])

  useEffect(() => {
    const minha = ++geracao.current
    if (inicial) {
      setEventos(inicial.eventos)
      setProximo(inicial.proximo)
      setEstado('pronto')
      completarCapas(inicial.eventos)
      return
    }
    setEstado('carregando')
    setEventos([])
    setProximo(undefined)
    carregar().then(pagina => {
      if (minha !== geracao.current) return
      if (!pagina) {
        setEstado('erro')
        return
      }
      setEventos(pagina.eventos)
      setProximo(pagina.proximo)
      setEstado('pronto')
      completarCapas(pagina.eventos)
    })
    // carregar muda de identidade a cada render de quem usa; a chave diz quando recomeçar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, inicial])

  const carregarMais = async () => {
    if (!proximo || maisCarregando) return
    const minha = geracao.current
    setMaisCarregando(true)
    const pagina = await carregar(proximo)
    setMaisCarregando(false)
    if (minha !== geracao.current || !pagina) return
    setEventos(atuais => juntarEventos(atuais, pagina.eventos))
    setProximo(pagina.proximo)
    completarCapas(pagina.eventos)
  }

  if (estado === 'carregando') {
    return (
      <ul className="m-0 p-0 list-none" aria-busy="true" aria-label="Carregando atividade">
        {[0, 1, 2, 3].map(i => (
          <li key={i} className="flex gap-3 py-3.5 border-b border-line/60 last:border-b-0">
            <span className="w-10 h-10 rounded-full bg-panel-2 animate-pulse shrink-0" />
            <span className="flex-1 space-y-2">
              <span className="block h-3.5 w-3/4 rounded bg-panel-2 animate-pulse" />
              <span className="block h-3 w-1/4 rounded bg-panel-2 animate-pulse" />
            </span>
          </li>
        ))}
      </ul>
    )
  }

  if (estado === 'erro') {
    return <p className="m-0 py-6 text-sm text-muted text-center">Não foi possível carregar a atividade agora.</p>
  }

  if (eventos.length === 0) {
    return <div className="py-6 text-sm text-muted text-center">{vazio}</div>
  }

  return (
    <>
      <ul className="m-0 p-0 list-none">
        {eventos.map(e => (
          <ItemDeAtividade
            key={`${e.tipo}|${e.autor.handle}|${e.mal_id}|${e.episodio ?? ''}|${e.comentario_id ?? ''}|${e.quando}`}
            evento={e}
            capa={capas.get(e.mal_id)}
            semAutor={semAutor}
            agora={agora}
          />
        ))}
      </ul>
      {proximo && (
        <button
          type="button"
          onClick={carregarMais}
          disabled={maisCarregando}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-muted hover:text-text hover:border-holo-3/60 disabled:opacity-60 cursor-pointer"
        >
          {maisCarregando && <Loader2 size={15} className="animate-spin" aria-hidden />}
          {maisCarregando ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
    </>
  )
}
