// client/src/components/AbaRevisaoIA.tsx
// Fila de curadoria assistida: enfileirar e revisar o que a IA trouxe. O ritmo do worker e
// os prompts ficam no Painel de Controle (SecaoCuradoriaIA).
// Nada desta tela grava no catálogo sem o clique em "Aplicar", exceto sinopse e tags no
// modo automático (episódios, datas e links nunca entram sozinhos).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, RefreshCw, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { normalizar } from '../hooks/useTaxonomia'

type Tipo = 'sinopse_tags' | 'episodios'
type Status = 'pendente' | 'processando' | 'pronto' | 'erro' | 'aplicado' | 'descartado'

interface Fonte { titulo: string; url: string }
interface EpisodioPesquisado { numero: number; titulo: string; data: string; fonte: string }
interface LinkPesquisado { plataforma: string; url: string; fonte: string }

interface ItemFila {
  id: string
  mal_id: number
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

export default function AbaRevisaoIA() {
  const { showToast } = useToast()
  const [itens, setItens] = useState<ItemFila[]>([])
  const [curados, setCurados] = useState<{ mal_id: number; custom_title: string }[]>([])
  const [filtro, setFiltro] = useState('revisar')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [tipoNovo, setTipoNovo] = useState<Tipo>('sinopse_tags')
  const [busca, setBusca] = useState('')
  const [marcados, setMarcados] = useState<number[]>([])

  const carregarFila = useCallback(async () => {
    const res = await comToken('/api/admin/ia/fila')
    if (!res.ok) { setErro(await res.text()); return }
    setErro(null)
    setItens(await res.json())
  }, [])

  useEffect(() => {
    let ativo = true
    Promise.all([
      comToken('/api/admin/ia/fila').then(async r => (r.ok ? r.json() : Promise.reject(new Error(await r.text())))),
      fetch('/api/curation').then(r => (r.ok ? r.json() : [])),
    ])
      .then(([fila, catalogo]) => {
        if (!ativo) return
        setItens(Array.isArray(fila) ? fila : [])
        setCurados(Array.isArray(catalogo) ? catalogo : [])
      })
      .catch(e => ativo && setErro(e instanceof Error ? e.message : 'Falha ao carregar a fila.'))
    return () => { ativo = false }
  }, [])

  const tituloPorId = useMemo(() => new Map(curados.map(c => [c.mal_id, c.custom_title])), [curados])
  const visiveis = itens.filter(i => FILTROS.find(f => f.id === filtro)?.status.includes(i.status))
  const contagem = (status: Status[]) => itens.filter(i => status.includes(i.status)).length

  const termo = normalizar(busca)
  const sugestoes = termo.length < 2 ? [] : curados.filter(c => normalizar(c.custom_title || '').includes(termo)).slice(0, 12)

  const enfileirar = async () => {
    setOcupado('enfileirar')
    try {
      const res = await comToken('/api/admin/ia/fila', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mal_ids: marcados, tipo: tipoNovo }),
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

  const descartar = async (item: ItemFila) => {
    setOcupado(item.id)
    const res = await comToken(`/api/admin/ia/fila/${item.id}/descartar`, { method: 'POST' })
    if (!res.ok) showToast('Falha ao descartar.', 'error')
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
          <select className={entrada} value={tipoNovo} onChange={e => setTipoNovo(e.target.value as Tipo)}>
            <option value="sinopse_tags">{NOME_TIPO.sinopse_tags}</option>
            <option value="episodios">{NOME_TIPO.episodios}</option>
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
            <span className="text-xs text-muted">{marcados.map(id => tituloPorId.get(id) ?? id).join(', ')}</span>
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
          <button type="button" onClick={carregarFila} className={`${botao} text-muted`}><RefreshCw size={12} /> Atualizar</button>
        </div>

        {visiveis.length === 0 && <p className="text-muted text-sm">Nada aqui.</p>}

        <div className="flex flex-col gap-4">
          {visiveis.map(item => (
            <article key={item.id} className="bg-panel border border-line rounded-2xl p-4 sm:p-5 flex flex-col gap-3 min-w-0">
              <header className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-sm">{tituloPorId.get(item.mal_id) ?? `mal_id ${item.mal_id}`}</h3>
                <span className="font-mono text-[10px] text-muted-2 uppercase">{NOME_TIPO[item.tipo]}</span>
                <span className={`font-mono text-[10px] uppercase border rounded-full px-2 py-0.5 ${COR_STATUS[item.status]}`}>{item.status}</span>
                {item.tentativas > 1 && <span className="font-mono text-[10px] text-muted-2">{item.tentativas} tentativas</span>}
              </header>

              {item.erro && <p className="text-coral text-sm">{item.erro}</p>}

              {item.tipo === 'sinopse_tags' && item.resultado?.sinopse && (
                <>
                  <p className="text-sm text-text/90 whitespace-pre-line">{item.resultado.sinopse}</p>
                  <p className="text-xs text-muted">Tags: {(item.resultado.tags ?? []).join(', ') || 'nenhuma da taxonomia'}</p>
                  {(item.resultado.tags_descartadas ?? []).length > 0 && (
                    <p className="text-xs text-muted-2">Descartadas (fora da taxonomia): {item.resultado.tags_descartadas!.join(', ')}</p>
                  )}
                </>
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
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
