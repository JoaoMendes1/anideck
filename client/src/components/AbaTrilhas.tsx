// client/src/components/AbaTrilhas.tsx
// Gestão das trilhas curadas da Início: nome editorial, subtítulo, nota do curador e a
// ordem dos animes. A lista inteira é salva de uma vez; a ordem daqui é a da home.
import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Save, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { normalizar } from '../hooks/useTaxonomia'

interface Trilha {
  id: string
  nome: string
  subtitulo: string
  nota: string
  mal_ids: number[]
}

interface Curado {
  mal_id: number
  custom_title: string
}

const LIMITE_NOME = 60
const LIMITE_SUBTITULO = 100
const LIMITE_NOTA = 280

const entrada = 'w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-holo-2'

const mover = <T,>(lista: T[], de: number, para: number): T[] => {
  if (para < 0 || para >= lista.length) return lista
  const copia = [...lista]
  const [item] = copia.splice(de, 1)
  copia.splice(para, 0, item)
  return copia
}

async function comToken(url: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${session?.access_token ?? ''}` } })
}

export default function AbaTrilhas() {
  const { showToast } = useToast()
  const [trilhas, setTrilhas] = useState<Trilha[]>([])
  const [curados, setCurados] = useState<Curado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState<Record<string, string>>({})
  const [erroAoCarregar, setErroAoCarregar] = useState(false)

  // Carrega uma vez só. O showToast muda de identidade a cada aviso exibido, então não
  // pode ser dependência: o efeito recarregaria a lista e apagaria a edição em curso.
  useEffect(() => {
    let ativo = true
    Promise.all([
      comToken('/api/admin/trilhas').then(r => (r.ok ? r.json() : [])),
      fetch('/api/curation').then(r => (r.ok ? r.json() : [])),
    ])
      .then(([lista, catalogo]) => {
        if (!ativo) return
        setTrilhas(Array.isArray(lista) ? lista : [])
        setCurados(Array.isArray(catalogo) ? catalogo : [])
      })
      .catch(() => ativo && setErroAoCarregar(true))
      .finally(() => ativo && setCarregando(false))
    return () => { ativo = false }
  }, [])

  const tituloPorId = useMemo(() => new Map(curados.map(c => [c.mal_id, c.custom_title])), [curados])

  const atualizar = (id: string, mudanca: Partial<Trilha>) =>
    setTrilhas(prev => prev.map(t => (t.id === id ? { ...t, ...mudanca } : t)))

  const novaTrilha = () =>
    setTrilhas(prev => [...prev, { id: crypto.randomUUID(), nome: '', subtitulo: '', nota: '', mal_ids: [] }])

  const salvar = async () => {
    setSalvando(true)
    try {
      const res = await comToken('/api/admin/trilhas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trilhas),
      })
      if (!res.ok) throw new Error((await res.text()) || 'Falha ao salvar.')
      setTrilhas(await res.json())
      showToast('Trilhas salvas. A Início já mostra a versão nova.', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Falha ao salvar.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return <div className="h-40 rounded-2xl shimmer" />
  }

  if (erroAoCarregar) {
    return <p className="text-coral text-sm">Não foi possível carregar as trilhas. Recarregue a página.</p>
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={novaTrilha} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-line bg-panel text-sm font-bold hover:border-holo-2 cursor-pointer">
          <Plus size={16} /> Nova trilha
        </button>
        <button type="button" onClick={salvar} disabled={salvando} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void text-sm font-bold disabled:opacity-60 cursor-pointer">
          <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar trilhas'}
        </button>
      </div>

      {trilhas.length === 0 && <p className="text-muted text-sm">Nenhuma trilha ainda. A Início não mostra a seção enquanto não houver uma.</p>}

      {trilhas.map((t, indice) => {
        const termo = normalizar(busca[t.id] ?? '')
        const sugestoes = termo.length < 2 ? [] : curados
          .filter(c => !t.mal_ids.includes(c.mal_id) && normalizar(c.custom_title || '').includes(termo))
          .slice(0, 6)
        return (
          <section key={t.id} className="bg-panel border border-line rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-muted-2 uppercase tracking-widest">Trilha {indice + 1}</span>
              <div className="flex gap-1">
                <button type="button" aria-label="Subir trilha" onClick={() => setTrilhas(prev => mover(prev, indice, indice - 1))} className="p-1.5 rounded-lg text-muted hover:text-text cursor-pointer"><ArrowUp size={16} /></button>
                <button type="button" aria-label="Descer trilha" onClick={() => setTrilhas(prev => mover(prev, indice, indice + 1))} className="p-1.5 rounded-lg text-muted hover:text-text cursor-pointer"><ArrowDown size={16} /></button>
                <button type="button" aria-label="Excluir trilha" onClick={() => setTrilhas(prev => prev.filter(x => x.id !== t.id))} className="p-1.5 rounded-lg text-coral hover:bg-coral/10 cursor-pointer"><Trash2 size={16} /></button>
              </div>
            </div>

            <input className={entrada} placeholder="Nome (ex.: Fantasia que dói)" maxLength={LIMITE_NOME} value={t.nome} onChange={e => atualizar(t.id, { nome: e.target.value })} />
            <input className={entrada} placeholder="Subtítulo" maxLength={LIMITE_SUBTITULO} value={t.subtitulo} onChange={e => atualizar(t.id, { subtitulo: e.target.value })} />
            <textarea className={`${entrada} min-h-[70px]`} placeholder="Nota do curador" maxLength={LIMITE_NOTA} value={t.nota} onChange={e => atualizar(t.id, { nota: e.target.value })} />

            <ol className="flex flex-col gap-1.5">
              {t.mal_ids.map((id, pos) => (
                <li key={id} className="flex items-center gap-2 bg-panel-2 border border-line rounded-lg px-3 py-1.5 text-sm">
                  <span className="font-mono text-[11px] text-muted-2 w-5">{pos + 1}</span>
                  <span className="flex-1 truncate">{tituloPorId.get(id) ?? `mal_id ${id} (fora do catálogo)`}</span>
                  <button type="button" aria-label="Subir" onClick={() => atualizar(t.id, { mal_ids: mover(t.mal_ids, pos, pos - 1) })} className="p-1 text-muted hover:text-text cursor-pointer"><ArrowUp size={14} /></button>
                  <button type="button" aria-label="Descer" onClick={() => atualizar(t.id, { mal_ids: mover(t.mal_ids, pos, pos + 1) })} className="p-1 text-muted hover:text-text cursor-pointer"><ArrowDown size={14} /></button>
                  <button type="button" aria-label="Remover" onClick={() => atualizar(t.id, { mal_ids: t.mal_ids.filter(x => x !== id) })} className="p-1 text-coral cursor-pointer"><X size={14} /></button>
                </li>
              ))}
            </ol>

            <div>
              <input
                className={entrada}
                placeholder="Adicionar anime do catálogo: digite o título"
                value={busca[t.id] ?? ''}
                onChange={e => setBusca(prev => ({ ...prev, [t.id]: e.target.value }))}
              />
              {sugestoes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {sugestoes.map(c => (
                    <button
                      key={c.mal_id}
                      type="button"
                      onClick={() => {
                        atualizar(t.id, { mal_ids: [...t.mal_ids, c.mal_id] })
                        setBusca(prev => ({ ...prev, [t.id]: '' }))
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-panel-2 border border-holo-2/40 text-holo-2 hover:bg-holo-2/10 cursor-pointer"
                    >
                      + {c.custom_title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
