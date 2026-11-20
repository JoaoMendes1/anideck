// client/src/components/AbaCatalogoRPG.tsx
// Catálogo completo de equipamentos RPG no Painel Admin: mostra totais por classe,
// elemento, slot, raridade e fonte de obtenção (Mercado, Forja, Drop/Invocação).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, RefreshCw, Search, Shield, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { SLOTS_RPG, estiloDaRaridade, resumoDoItem, type Raridade, type SlotId } from '../lib/rpg'
import { rotuloDoElemento } from '../lib/personagem'
import IconeDoItem from './rpg/IconeDoItem'
import IconeOuro from './IconeOuro'

export interface ItemCatalogoAdmin {
  id: string
  slot: SlotId
  nome: string
  descricao: string
  raridade: Raridade
  vida: number
  ataque: number
  defesa: number
  magia: number
  velocidade: number
  critico_por_mil: number
  dano_critico: number
  esquiva_por_mil: number
  nivel_minimo: number
  classes: string[] | null
  generico: boolean
  personagem_exclusivo?: string
  conjunto?: string
  elemento: string
  preco_ouro?: number | null
  na_forja: boolean
  forja_ouro?: number
  inicial: boolean
  ativo: boolean
  possui: boolean
  quantidade: number
  ordem: number
}

export interface ResumoCatalogoRPGAdmin {
  total: number
  ativos: number
  inativos: number
  no_mercado: number
  na_forja: number
  possuidos: number
  por_slot: Record<string, number>
  por_raridade: Record<string, number>
  por_classe: Record<string, number>
  por_elemento: Record<string, number>
  por_conjunto: Record<string, number>
}

export interface RespostaCatalogoRPGAdmin {
  resumo: ResumoCatalogoRPGAdmin
  itens: ItemCatalogoAdmin[]
}

const ROTULO_CLASSE: Record<string, string> = {
  espadachim: 'Espadachim',
  lanceiro: 'Lanceiro',
  assassina: 'Assassina',
  maga: 'Maga',
  guerreiro: 'Guerreiro',
  paladina: 'Paladina',
  generico: 'Genérico (todas)',
}

const ORDEM_CLASSES = ['espadachim', 'lanceiro', 'assassina', 'maga', 'guerreiro', 'paladina', 'generico']
const ORDEM_ELEMENTOS = ['fogo', 'agua', 'terra', 'vento', 'raio', 'luz', 'trevas', 'eter', 'neutro']
const ORDEM_RARIDADES: Raridade[] = ['comum', 'raro', 'epico', 'lendario']

function rotuloElemento(el: string): string {
  if (el === 'neutro') return 'Neutro'
  return rotuloDoElemento(el)
}

export default function AbaCatalogoRPG() {
  const { showToast } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [dados, setDados] = useState<RespostaCatalogoRPGAdmin | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroClasse, setFiltroClasse] = useState<string>('todas')
  const [filtroElemento, setFiltroElemento] = useState<string>('todos')
  const [filtroSlot, setFiltroSlot] = useState<string>('todos')
  const [filtroRaridade, setFiltroRaridade] = useState<string>('todas')
  const [filtroPosse, setFiltroPosse] = useState<'todos' | 'possuo' | 'faltam'>('todos')
  const [mostrarInativos, setMostrarInativos] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/admin/rpg/catalogo', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Falha ao carregar catálogo RPG')
      const json = (await res.json()) as RespostaCatalogoRPGAdmin
      setDados(json)
    } catch {
      showToast('Erro ao carregar catálogo de equipamentos RPG.', 'error')
    } finally {
      setCarregando(false)
    }
  }, [showToast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const itensFiltrados = useMemo(() => {
    if (!dados) return []
    const termo = busca.trim().toLowerCase()
    return dados.itens.filter((it) => {
      if (!mostrarInativos && !it.ativo) return false
      if (filtroSlot !== 'todos' && it.slot !== filtroSlot) return false
      if (filtroRaridade !== 'todas' && it.raridade !== filtroRaridade) return false
      if (filtroElemento !== 'todos' && it.elemento !== filtroElemento) return false
      if (filtroClasse !== 'todas') {
        if (filtroClasse === 'generico') {
          if (!it.generico) return false
        } else if (!it.generico && !(it.classes ?? []).includes(filtroClasse)) {
          return false
        }
      }
      if (filtroPosse === 'possuo' && !it.possui) return false
      if (filtroPosse === 'faltam' && it.possui) return false
      if (termo && !it.nome.toLowerCase().includes(termo) && !it.id.toLowerCase().includes(termo)) {
        return false
      }
      return true
    })
  }, [dados, busca, filtroClasse, filtroElemento, filtroSlot, filtroRaridade, filtroPosse, mostrarInativos])

  if (carregando && !dados) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw size={24} className="animate-spin text-holo-3" />
      </div>
    )
  }

  if (!dados) {
    return (
      <div className="p-6 rounded-2xl bg-panel border border-line text-center text-sm text-muted">
        Não foi possível carregar o catálogo RPG.
      </div>
    )
  }

  const { resumo } = dados

  return (
    <div className="flex flex-col gap-6">
      {/* RESUMO NUMÉRICO PRINCIPAL */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-panel border border-line">
          <p className="font-mono text-xs text-muted-2 uppercase m-0">Ativos no jogo</p>
          <p className="font-anton text-2xl text-text mt-1 m-0">{resumo.ativos}</p>
          <p className="text-xs text-muted m-0 mt-0.5">{resumo.inativos} inativo(s)</p>
        </div>
        <div className="p-4 rounded-2xl bg-panel border border-line">
          <p className="font-mono text-xs text-muted-2 uppercase m-0">No seu inventário</p>
          <p className="font-anton text-2xl text-green mt-1 m-0">{resumo.possuidos}</p>
          <p className="text-xs text-muted m-0 mt-0.5">de {resumo.ativos} ativos</p>
        </div>
        <div className="p-4 rounded-2xl bg-panel border border-line">
          <p className="font-mono text-xs text-muted-2 uppercase m-0">Armas ativas</p>
          <p className="font-anton text-2xl text-holo-3 mt-1 m-0">{resumo.por_slot.arma ?? 0}</p>
          <p className="text-xs text-muted m-0 mt-0.5">slot arma</p>
        </div>
        <div className="p-4 rounded-2xl bg-panel border border-line">
          <p className="font-mono text-xs text-muted-2 uppercase m-0">No Mercado</p>
          <p className="font-anton text-2xl text-gold mt-1 m-0">{resumo.no_mercado}</p>
          <p className="text-xs text-muted m-0 mt-0.5">por Ouro</p>
        </div>
        <div className="p-4 rounded-2xl bg-panel border border-line">
          <p className="font-mono text-xs text-muted-2 uppercase m-0">Na Forja</p>
          <p className="font-anton text-2xl text-coral mt-1 m-0">{resumo.na_forja}</p>
          <p className="text-xs text-muted m-0 mt-0.5">receitas</p>
        </div>
        <div className="p-4 rounded-2xl bg-panel border border-line">
          <p className="font-mono text-xs text-muted-2 uppercase m-0">Lanças (Lanceiro)</p>
          <p className="font-anton text-2xl text-holo-2 mt-1 m-0">{resumo.por_classe.lanceiro ?? 0}</p>
          <p className="text-xs text-muted m-0 mt-0.5">específicas</p>
        </div>
      </div>

      {/* CONTAGENS POR CLASSE, ELEMENTO, SLOT E RARIDADE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="p-4 sm:p-5 rounded-2xl bg-panel border border-line">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-holo-3" aria-hidden="true" />
            <h2 className="font-anton text-base uppercase m-0">Por classe (clique para filtrar)</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltroClasse('todas')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
                filtroClasse === 'todas'
                  ? 'border-holo-3 bg-holo-3/15 text-holo-3'
                  : 'border-line bg-panel-2 text-muted hover:text-text'
              }`}
            >
              Todas ({resumo.ativos})
            </button>
            {ORDEM_CLASSES.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setFiltroClasse(filtroClasse === cls ? 'todas' : cls)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
                  filtroClasse === cls
                    ? 'border-holo-3 bg-holo-3/15 text-holo-3'
                    : 'border-line bg-panel-2 text-muted hover:text-text'
                }`}
              >
                {ROTULO_CLASSE[cls]} ({resumo.por_classe[cls] ?? 0})
              </button>
            ))}
          </div>
        </section>

        <section className="p-4 sm:p-5 rounded-2xl bg-panel border border-line">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-gold" aria-hidden="true" />
            <h2 className="font-anton text-base uppercase m-0">Por elemento (clique para filtrar)</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltroElemento('todos')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
                filtroElemento === 'todos'
                  ? 'border-gold bg-gold/15 text-gold'
                  : 'border-line bg-panel-2 text-muted hover:text-text'
              }`}
            >
              Todos ({resumo.ativos})
            </button>
            {ORDEM_ELEMENTOS.map((el) => (
              <button
                key={el}
                type="button"
                onClick={() => setFiltroElemento(filtroElemento === el ? 'todos' : el)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
                  filtroElemento === el
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-line bg-panel-2 text-muted hover:text-text'
                }`}
              >
                {rotuloElemento(el)} ({resumo.por_elemento[el] ?? 0})
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* BARRA DE BUSCA E FILTROS SECUNDÁRIOS */}
      <section className="p-4 sm:p-5 rounded-2xl bg-panel border border-line flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar equipamento por nome ou ID"
              placeholder="Buscar equipamento (ex.: Lança, Espada, Carmesim)…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-xl border border-line bg-panel-2 py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-holo-3"
            />
          </div>

          <select
            aria-label="Filtrar por slot"
            value={filtroSlot}
            onChange={(e) => setFiltroSlot(e.target.value)}
            className="rounded-xl border border-line bg-panel-2 px-3 py-2 text-xs font-bold text-text outline-none focus:border-holo-3"
          >
            <option value="todos">Todos os slots ({resumo.ativos})</option>
            {SLOTS_RPG.map((s) => (
              <option key={s.id} value={s.id}>
                {s.rotulo} ({resumo.por_slot[s.id] ?? 0})
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por raridade"
            value={filtroRaridade}
            onChange={(e) => setFiltroRaridade(e.target.value)}
            className="rounded-xl border border-line bg-panel-2 px-3 py-2 text-xs font-bold text-text outline-none focus:border-holo-3"
          >
            <option value="todas">Todas as raridades</option>
            {ORDEM_RARIDADES.map((r) => (
              <option key={r} value={r}>
                {estiloDaRaridade(r).rotulo} ({resumo.por_raridade[r] ?? 0})
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por posse"
            value={filtroPosse}
            onChange={(e) => setFiltroPosse(e.target.value as 'todos' | 'possuo' | 'faltam')}
            className="rounded-xl border border-line bg-panel-2 px-3 py-2 text-xs font-bold text-text outline-none focus:border-holo-3"
          >
            <option value="todos">Todos (inventário + catálogo)</option>
            <option value="possuo">Só os que eu já tenho ({resumo.possuidos})</option>
            <option value="faltam">Só os que me faltam ({Math.max(0, resumo.ativos - resumo.possuidos)})</option>
          </select>

          <label className="inline-flex items-center gap-2 text-xs font-bold text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarInativos}
              onChange={(e) => setMostrarInativos(e.target.checked)}
              className="rounded"
            />
            Mostrar inativos ({resumo.inativos})
          </label>
        </div>

        <p className="m-0 font-mono text-xs text-muted">
          Exibindo <strong className="text-text">{itensFiltrados.length}</strong> de {resumo.total} equipamentos
        </p>

        {itensFiltrados.length === 0 ? (
          <p className="m-0 py-8 text-center text-sm text-muted">
            Nenhum equipamento encontrado com os filtros atuais.
          </p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
            {itensFiltrados.map((it) => {
              const est = estiloDaRaridade(it.raridade)
              const rotuloSlot = SLOTS_RPG.find((s) => s.id === it.slot)?.rotulo ?? it.slot
              return (
                <li
                  key={it.id}
                  className={`flex flex-col gap-2 rounded-2xl border p-3.5 ${est.borda} ${est.fundo} ${
                    !it.ativo ? 'opacity-65' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-void/65 ${est.texto}`}>
                      <IconeDoItem id={it.id} slot={it.slot} tamanho={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`m-0 text-sm font-bold leading-tight ${est.texto}`}>{it.nome}</p>
                        {it.possui && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-green/45 bg-green/15 px-2 py-0.5 font-mono text-[11px] font-bold text-green">
                            <Check size={11} aria-hidden="true" /> ×{it.quantidade}
                          </span>
                        )}
                      </div>
                      <p className="m-0 mt-0.5 text-xs text-muted">
                        {est.rotulo} · {rotuloSlot} · Nv {it.nivel_minimo} · <span className="text-text">{rotuloElemento(it.elemento)}</span>
                      </p>
                      <p className="m-0 mt-1 font-mono text-xs text-text">{resumoDoItem(it)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                    {it.generico ? (
                      <span className="rounded-full border border-line bg-void/50 px-2 py-0.5 font-semibold text-muted">
                        Todas as classes
                      </span>
                    ) : (it.classes ?? []).length === 0 ? (
                      <span className="rounded-full border border-coral/40 bg-coral/10 px-2 py-0.5 font-semibold text-coral">
                        Sem classe
                      </span>
                    ) : (
                      (it.classes ?? []).map((cls) => (
                        <span key={cls} className="rounded-full border border-holo-3/40 bg-holo-3/10 px-2 py-0.5 font-semibold text-holo-3">
                          {ROTULO_CLASSE[cls] ?? cls}
                        </span>
                      ))
                    )}
                    {it.conjunto && (
                      <span className="rounded-full border border-holo-2/40 bg-holo-2/10 px-2 py-0.5 font-semibold text-holo-2">
                        Conjunto {it.conjunto}
                      </span>
                    )}
                    {!it.ativo && (
                      <span className="rounded-full border border-coral/40 bg-coral/15 px-2 py-0.5 font-mono font-bold text-coral">
                        Inativo
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line/50 pt-2 text-xs text-muted">
                    <span className="font-mono text-[11px] text-muted-2">{it.id}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {typeof it.preco_ouro === 'number' && (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-gold">
                          Mercado: <IconeOuro size={12} /> {it.preco_ouro}
                        </span>
                      )}
                      {it.na_forja && (
                        <span className="font-mono font-bold text-coral">
                          Forja: {it.forja_ouro ?? 0} Ouro
                        </span>
                      )}
                      {typeof it.preco_ouro !== 'number' && !it.na_forja && (
                        <span>Drop / Invocação</span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
