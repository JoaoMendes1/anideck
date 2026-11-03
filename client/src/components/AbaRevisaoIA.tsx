// client/src/components/AbaRevisaoIA.tsx
// Fila de curadoria assistida: enfileirar e revisar o que a IA trouxe. O ritmo do worker e
// os prompts ficam no Painel de Controle (SecaoCuradoriaIA).
// Nada desta tela grava no catálogo sem o clique em "Aplicar", exceto sinopse e tags no
// modo automático (episódios, datas e links nunca entram sozinhos).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ExternalLink, RefreshCw, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { normalizar } from '../hooks/useTaxonomia'
import { getCategoryTheme } from '../lib/filters'
import { guardarNaMemoria, lerDaMemoria } from '../lib/cacheDeTela'
import type { CuratedAnime } from '../types/curation'

type Tipo = 'sinopse_tags' | 'episodios'
type Status = 'pendente' | 'processando' | 'pronto' | 'erro' | 'aplicado' | 'descartado'

interface Fonte { titulo: string; url: string }
interface EpisodioPesquisado { numero: number; titulo: string; data: string; fonte: string }
interface LinkPesquisado { plataforma: string; url: string; fonte: string }

interface ItemFila {
  id: string
  mal_id: number
  titulo?: string
  imagem_url?: string
  tipo: Tipo
  status: Status
  resultado: {
    sinopse?: string
    tags?: string[]
    tags_descartadas?: string[]
    pesquisa?: { estreia: string; episodios: EpisodioPesquisado[]; links: LinkPesquisado[]; ressalvas: string[] }
    fontes?: Fonte[]
    texto_bruto?: string
    de?: number
    ate?: number
  } | null
  relatorio: string | null
  erro: string | null
  tentativas: number
  created_at: string
}

interface Props {
  curados?: CuratedAnime[]
}

const CHAVE_CACHE_FILA = 'admin:fila_ia'

const NOME_TIPO: Record<Tipo, string> = { sinopse_tags: 'Sinopse e tags', episodios: 'Episódios, datas e onde assistir' }
const COR_STATUS: Record<Status, string> = {
  pendente: 'text-muted border-line', processando: 'text-holo-3 border-holo-3/40', pronto: 'text-gold border-gold/40',
  erro: 'text-coral border-coral/40', aplicado: 'text-green border-green/40', descartado: 'text-muted-2 border-line',
}
const FILTROS: { id: string; nome: string; status: Status[] }[] = [
  { id: 'revisar', nome: 'Para revisar', status: ['pronto'] },
  { id: 'andamento', nome: 'Na fila', status: ['pendente', 'processando'] },
  { id: 'erro', nome: 'Com erro', status: ['erro'] },
  { id: 'fechados', nome: 'Encerrados', status: ['aplicado', 'descartado'] },
]

const entrada = 'bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-holo-2'
const botao = 'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer disabled:opacity-50'

async function comToken(url: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${session?.access_token ?? ''}` } })
}

// Links vêm da IA: só http(s) vira link clicável.
const linkSeguro = (url: string): URL | null => {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null
  } catch {
    return null
  }
}

const dataLocal = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function AbaRevisaoIA({ curados = [] }: Props) {
  const { showToast } = useToast()
  const [emMemoria] = useState(() => lerDaMemoria<ItemFila[]>(CHAVE_CACHE_FILA))
  const [itens, setItens] = useState<ItemFila[]>(emMemoria ?? [])
  const [carregandoInicial, setCarregandoInicial] = useState(!emMemoria)
  const [filtro, setFiltro] = useState('revisar')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [tipoNovo, setTipoNovo] = useState<Tipo | 'tudo'>('sinopse_tags')
  const [busca, setBusca] = useState('')
  const [marcados, setMarcados] = useState<number[]>([])
  const [atualizando, setAtualizando] = useState(false)

  const carregarFila = useCallback(async (comFeedback = false) => {
    if (comFeedback) setAtualizando(true)
    try {
      const res = await comToken('/api/admin/ia/fila')
      if (!res.ok) { setErro(await res.text()); return }
      setErro(null)
      const novosItens: ItemFila[] = await res.json()
      const lista = Array.isArray(novosItens) ? novosItens : []
      setItens(lista)
      guardarNaMemoria(CHAVE_CACHE_FILA, lista)
      if (comFeedback) showToast('Fila atualizada.', 'success')
    } finally {
      setCarregandoInicial(false)
      if (comFeedback) setAtualizando(false)
    }
  }, [showToast])

  const temItensAtivos = useMemo(
    () => itens.some(i => i.status === 'pendente' || i.status === 'processando'),
    [itens]
  )

  useEffect(() => {
    carregarFila(false)
  }, [carregarFila])

  useEffect(() => {
    const intervaloMs = temItensAtivos ? 4000 : 12000
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        carregarFila(false)
      }
    }, intervaloMs)

    const canal = supabase
      .channel('fila-ia-tempo-real')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_curation_queue' },
        () => {
          carregarFila(false)
        }
      )
      .subscribe()

    return () => {
      window.clearInterval(timer)
      supabase.removeChannel(canal)
    }
  }, [carregarFila, temItensAtivos])

  const mapaCurados = useMemo(
    () => new Map(curados.map(c => [c.mal_id, { titulo: c.custom_title, capa: c.custom_cover_image }])),
    [curados]
  )
  const visiveis = itens.filter(i => FILTROS.find(f => f.id === filtro)?.status.includes(i.status))
  const contagem = (status: Status[]) => itens.filter(i => status.includes(i.status)).length

  const termo = normalizar(busca)
  const sugestoes = termo.length < 2 ? [] : curados.filter(c => normalizar(c.custom_title || '').includes(termo)).slice(0, 12)

  const enfileirar = async () => {
    setOcupado('enfileirar')
    try {
      const tipo = tipoNovo === 'tudo' ? 'completo' : tipoNovo
      const res = await comToken('/api/admin/ia/fila', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mal_ids: marcados, tipo }),
      })
      if (!res.ok) throw new Error(await res.text())
      showToast(`${marcados.length} na fila. O worker processa no próximo ciclo.`, 'success')
      setMarcados([])
      setBusca('')
      setFiltro('andamento')
      await carregarFila()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Falha ao enfileirar.', 'error')
    } finally {
      setOcupado(null)
    }
  }

  const aplicar = async (item: ItemFila, campos?: string[]) => {
    setOcupado(item.id)
    try {
      const res = await comToken(`/api/admin/ia/fila/${item.id}/aplicar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campos: campos ?? [] }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { relatorio } = await res.json()
      showToast(relatorio?.length ? `Aplicado, com ${relatorio.length} ressalva(s) no relatório.` : 'Aplicado no catálogo.', 'success')
      await carregarFila()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Falha ao aplicar.', 'error')
    } finally {
      setOcupado(null)
    }
  }

  // Enfileirar de novo o mesmo anime e tipo volta o item para pendente (a fila tem um
  // item por anime e tipo, e o backend faz upsert).
  const tentarDeNovo = async (item: ItemFila) => {
    setOcupado(item.id)
    const res = await comToken('/api/admin/ia/fila', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mal_ids: [item.mal_id], tipo: item.tipo }),
    })
    showToast(res.ok ? 'De volta na fila.' : 'Falha ao enfileirar de novo.', res.ok ? 'success' : 'error')
    await carregarFila()
    setOcupado(null)
  }

  const descartar = async (item: ItemFila) => {
    setOcupado(item.id)
    const res = await comToken(`/api/admin/ia/fila/${item.id}/descartar`, { method: 'POST' })
    if (!res.ok) {
      showToast('Falha ao remover item.', 'error')
    } else {
      showToast('Item removido da fila.', 'success')
    }
    await carregarFila()
    setOcupado(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {erro && (
        <p className="text-coral text-sm bg-coral/10 border border-coral/30 rounded-xl px-4 py-3">
          {erro}
        </p>
      )}

      <section className="bg-panel border border-line rounded-2xl p-4 sm:p-5">
        <h2 className="font-anton uppercase text-[15px] mb-3">Enfileirar</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select className={entrada} value={tipoNovo} onChange={e => setTipoNovo(e.target.value as Tipo | 'tudo')}>
            <option value="sinopse_tags">{NOME_TIPO.sinopse_tags}</option>
            <option value="episodios">{NOME_TIPO.episodios}</option>
            <option value="tudo">Tudo (sinopse, tags e episódios)</option>
          </select>
          <input className={`${entrada} flex-1`} placeholder="Buscar anime do catálogo pelo título" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        {sugestoes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {sugestoes.map(c => {
              const ativo = marcados.includes(c.mal_id)
              return (
                <button key={c.mal_id} type="button" onClick={() => setMarcados(prev => (ativo ? prev.filter(x => x !== c.mal_id) : [...prev, c.mal_id]))}
                  className={`${botao} border ${ativo ? 'bg-holo-2/20 border-holo-2 text-holo-2' : 'bg-panel-2 border-line text-muted'}`}>
                  {ativo && <Check size={12} />} {c.custom_title}
                </button>
              )
            })}
          </div>
        )}
        {marcados.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs text-muted">{marcados.map(id => mapaCurados.get(id)?.titulo ?? id).join(', ')}</span>
            <button type="button" onClick={enfileirar} disabled={ocupado === 'enfileirar'} className={`${botao} bg-gradient-to-r from-holo-1 to-holo-2 text-void`}>
              Enfileirar {marcados.length}
            </button>
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {FILTROS.map(f => (
            <button key={f.id} type="button" onClick={() => setFiltro(f.id)}
              className={`${botao} border ${filtro === f.id ? 'bg-holo-2/20 border-holo-2 text-holo-2' : 'bg-panel border-line text-muted'}`}>
              {f.nome} · {contagem(f.status)}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            {temItensAtivos && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-holo-3 bg-holo-3/10 border border-holo-3/30 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-holo-3 animate-ping" />
                Tempo real ativo
              </span>
            )}
            <button
              type="button"
              disabled={atualizando}
              onClick={() => carregarFila(true)}
              className={`${botao} bg-panel border border-line text-muted hover:text-text hover:border-holo-2 transition-colors`}
            >
              <RefreshCw size={12} className={atualizando ? 'animate-spin text-holo-3' : ''} />
              {atualizando ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        {carregandoInicial ? (
          <p className="text-muted text-sm py-8 text-center font-mono">Carregando fila da IA...</p>
        ) : visiveis.length === 0 ? (
          <p className="text-muted text-sm">Nada aqui.</p>
        ) : null}

        <div className="flex flex-col gap-4">
          {visiveis.map(item => {
            const infoCurado = mapaCurados.get(item.mal_id)
            const tituloExibicao = item.titulo || infoCurado?.titulo || `MAL #${item.mal_id}`
            const capaExibicao = item.imagem_url || infoCurado?.capa || ''

            return (
              <article key={item.id} className="bg-panel border border-line rounded-2xl p-4 sm:p-5 flex gap-4 min-w-0">
                <Link
                  to={`/anime/${item.mal_id}`}
                  title={`Ver página de detalhes de ${tituloExibicao}`}
                  className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl bg-panel-2 border border-line overflow-hidden shrink-0 flex items-center justify-center hover:border-holo-3 transition-colors"
                >
                  {capaExibicao ? (
                    <img src={capaExibicao} alt={tituloExibicao} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-[9px] font-mono text-muted-2 text-center px-1">#{item.mal_id}</span>
                  )}
                </Link>

                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  <header className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/anime/${item.mal_id}`}
                      className="font-bold text-sm text-text hover:text-holo-3 transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>{tituloExibicao}</span>
                      <ExternalLink size={12} className="opacity-60" />
                    </Link>
                    <span className="font-mono text-[10px] text-muted-2 uppercase">{NOME_TIPO[item.tipo]}</span>
                    <span className={`font-mono text-[10px] uppercase border rounded-full px-2 py-0.5 ${COR_STATUS[item.status]}`}>{item.status}</span>
                    {item.tentativas > 1 && <span className="font-mono text-[10px] text-muted-2">{item.tentativas} tentativas</span>}
                  </header>

                  {item.erro && <p className="text-coral text-sm">{item.erro}</p>}

                  {item.tipo === 'sinopse_tags' && item.resultado?.sinopse && (
                    <div className="flex flex-col gap-3">
                      <div className="text-sm text-text/90 leading-relaxed bg-panel-2/60 border border-line rounded-xl p-3.5">
                        <ReactMarkdown
                          components={{
                            /* eslint-disable @typescript-eslint/no-unused-vars */
                            p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-extrabold text-text" {...props} />,
                            em: ({ node, ...props }) => <em className="italic text-holo-3" {...props} />,
                            /* eslint-enable @typescript-eslint/no-unused-vars */
                          }}
                        >
                          {item.resultado.sinopse}
                        </ReactMarkdown>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted uppercase mr-1">Tags:</span>
                        {(item.resultado.tags ?? []).length > 0 ? (
                          item.resultado.tags!.map(tag => (
                            <span
                              key={tag}
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border select-none ${getCategoryTheme(tag)}`}
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted">nenhuma da taxonomia</span>
                        )}
                      </div>

                      {(item.resultado.tags_descartadas ?? []).length > 0 && (
                        <p className="text-xs text-muted-2">
                          Descartadas (fora da taxonomia): {item.resultado.tags_descartadas!.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {item.tipo === 'episodios' && item.resultado?.pesquisa && (
                    <div className="overflow-x-auto">
                      <p className="text-xs text-muted mb-2">
                        Episódios {item.resultado.de} a {item.resultado.ate}
                        {item.resultado.pesquisa.estreia && <> · estreia {dataLocal(item.resultado.pesquisa.estreia)}</>}
                      </p>
                      <table className="w-full text-xs">
                        <thead><tr className="text-muted-2 text-left"><th className="py-1 pr-3">Nº</th><th className="pr-3">Título</th><th className="pr-3">Exibição</th><th>Fonte</th></tr></thead>
                        <tbody>
                          {item.resultado.pesquisa.episodios.map(ep => (
                            <tr key={ep.numero} className="border-t border-line">
                              <td className="py-1.5 pr-3 font-mono">{ep.numero}</td>
                              <td className="pr-3">{ep.titulo || <span className="text-muted-2">não publicado</span>}</td>
                              <td className="pr-3 whitespace-nowrap">{ep.data ? dataLocal(ep.data) : '—'}</td>
                              <td>{(() => {
                                const u = linkSeguro(ep.fonte)
                                return u ? <a href={u.href} target="_blank" rel="noreferrer" className="text-holo-3 underline break-all">{u.hostname}</a> : <span className="text-coral">sem fonte</span>
                              })()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {item.resultado.pesquisa.links.length > 0 && (
                        <p className="text-xs text-muted mt-2">Onde assistir: {item.resultado.pesquisa.links.map(l => l.plataforma).join(', ')}</p>
                      )}
                    </div>
                  )}

                  {item.relatorio && (
                    <div className="text-xs text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2 whitespace-pre-line">{item.relatorio}</div>
                  )}

                  {(item.resultado?.fontes ?? []).length > 0 && (
                    <details className="text-xs text-muted">
                      <summary className="cursor-pointer">Fontes da pesquisa ({item.resultado!.fontes!.length})</summary>
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {item.resultado!.fontes!.map(f => (
                          <li key={f.url}>{linkSeguro(f.url) ? <a href={f.url} target="_blank" rel="noreferrer" className="text-holo-3 underline break-all">{f.titulo || f.url}</a> : f.titulo || f.url}</li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {item.status === 'erro' && item.resultado?.texto_bruto && (
                    <details className="text-xs text-muted">
                      <summary className="cursor-pointer">Texto da pesquisa guardado</summary>
                      <p className="mt-1 whitespace-pre-line">{item.resultado.texto_bruto}</p>
                    </details>
                  )}

                  {item.status === 'erro' && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={ocupado === item.id} onClick={() => tentarDeNovo(item)} className={`${botao} bg-panel-2 border border-line text-text hover:border-holo-2`}>
                        <RefreshCw size={12} /> Tentar de novo
                      </button>
                      <button type="button" disabled={ocupado === item.id} onClick={() => descartar(item)} className={`${botao} bg-coral/10 border border-coral/30 text-coral hover:bg-coral/20`}>
                        <Trash2 size={12} /> Remover
                      </button>
                    </div>
                  )}

                  {item.status === 'pendente' && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={ocupado === item.id} onClick={() => descartar(item)} className={`${botao} bg-panel-2 border border-line text-muted hover:text-coral hover:border-coral/40`}>
                        <Trash2 size={12} /> Remover da fila
                      </button>
                    </div>
                  )}

                  {item.status === 'pronto' && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={ocupado === item.id} onClick={() => aplicar(item)} className={`${botao} bg-gradient-to-r from-holo-1 to-holo-2 text-void`}>
                        <Check size={12} /> Aplicar
                      </button>
                      {item.tipo === 'sinopse_tags' && (
                        <>
                          <button type="button" disabled={ocupado === item.id} onClick={() => aplicar(item, ['sinopse'])} className={`${botao} bg-panel-2 border border-line text-text`}>Só sinopse</button>
                          <button type="button" disabled={ocupado === item.id} onClick={() => aplicar(item, ['tags'])} className={`${botao} bg-panel-2 border border-line text-text`}>Só tags</button>
                        </>
                      )}
                      <button type="button" disabled={ocupado === item.id} onClick={() => descartar(item)} className={`${botao} text-coral`}>
                        <Trash2 size={12} /> Descartar
                      </button>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}