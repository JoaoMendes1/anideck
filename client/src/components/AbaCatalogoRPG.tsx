// client/src/components/AbaCatalogoRPG.tsx
// Catálogo completo de equipamentos RPG no Painel Admin: mostra totais por classe,
// elemento, slot, raridade e fonte de obtenção (Mercado, Forja, Drop/Invocação). No celular,
// filtros em linhas de chips que rolam de lado, para a lista aparecer sem rolar a página inteira;
// a tabela de cobertura (slot × raridade) mostra onde faltam itens, e "Sem arte" onde falta imagem.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, ImageOff, RefreshCw, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { SLOTS_RPG, estiloDaRaridade, resumoDoItem, type Raridade, type SlotId } from '../lib/rpg'
import { rotuloDoElemento } from '../lib/personagem'
import { arteDoItem } from '../lib/artesRpg'
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

type Situacao = 'todas' | 'sem_arte' | 'mercado' | 'forja' | 'so_drop'

const CHIP = 'shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition-colors'
const CHIP_INATIVO = 'border-line bg-panel-2 text-muted hover:text-text'
const LINHA_DE_CHIPS = '-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 scrollbar-hide sm:mx-0 sm:flex-wrap sm:px-0'
const ROTULO_DA_LINHA = 'm-0 font-mono text-[11px] uppercase tracking-widest text-muted-2'

function Chip({ ativo, cor, onClick, children }: { ativo: boolean; cor: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={ativo} onClick={onClick} className={`${CHIP} ${ativo ? cor : CHIP_INATIVO}`}>
      {children}
    </button>
  )
}

function Numero({ rotulo, valor, cor, detalhe, ativo, onClick }: { rotulo: string; valor: number; cor: string; detalhe?: string; ativo?: boolean; onClick?: () => void }) {
  const conteudo = (
    <>
      <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-2">{rotulo}</span>
      <span className={`block font-anton text-xl leading-tight ${cor}`}>{valor}</span>
      {detalhe && <span className="block text-[11px] text-muted">{detalhe}</span>}
    </>
  )
  const base = 'min-w-[96px] shrink-0 rounded-xl border px-3 py-2 text-left sm:min-w-0 sm:flex-1'
  return onClick ? (
    <button type="button" aria-pressed={ativo} onClick={onClick} className={`${base} cursor-pointer ${ativo ? 'border-coral bg-coral/10' : 'border-line bg-panel hover:border-line-2'}`}>
      {conteudo}
    </button>
  ) : (
    <div className={`${base} border-line bg-panel`}>{conteudo}</div>
  )
}

function temArte(id: string): boolean {
  return Boolean(arteDoItem(id))
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
  const [situacao, setSituacao] = useState<Situacao>('todas')
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

  const ativos = useMemo(() => (dados?.itens ?? []).filter((it) => it.ativo), [dados])
  const semArte = useMemo(() => ativos.filter((it) => !temArte(it.id)).length, [ativos])
  const soDrop = useMemo(() => ativos.filter((it) => typeof it.preco_ouro !== 'number' && !it.na_forja).length, [ativos])

  // Cobertura: quantos itens ativos há em cada slot e raridade. Zero aponta onde falta item.
  const cobertura = useMemo(() => {
    const tabela: Record<string, Record<string, number>> = {}
    for (const it of ativos) {
      tabela[it.slot] ??= {}
      tabela[it.slot][it.raridade] = (tabela[it.slot][it.raridade] ?? 0) + 1
    }
    return tabela
  }, [ativos])

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
      if (situacao === 'sem_arte' && temArte(it.id)) return false
      if (situacao === 'mercado' && typeof it.preco_ouro !== 'number') return false
      if (situacao === 'forja' && !it.na_forja) return false
      if (situacao === 'so_drop' && (typeof it.preco_ouro === 'number' || it.na_forja)) return false
      if (termo && !it.nome.toLowerCase().includes(termo) && !it.id.toLowerCase().includes(termo)) {
        return false
      }
      return true
    })
  }, [dados, busca, filtroClasse, filtroElemento, filtroSlot, filtroRaridade, filtroPosse, situacao, mostrarInativos])

  const algumFiltro =
    busca !== '' || filtroClasse !== 'todas' || filtroElemento !== 'todos' || filtroSlot !== 'todos' ||
    filtroRaridade !== 'todas' || filtroPosse !== 'todos' || situacao !== 'todas' || mostrarInativos
  const limpar = () => {
    setBusca('')
    setFiltroClasse('todas')
    setFiltroElemento('todos')
    setFiltroSlot('todos')
    setFiltroRaridade('todas')
    setFiltroPosse('todos')
    setSituacao('todas')
    setMostrarInativos(false)
  }
  const alternarSituacao = (s: Situacao) => setSituacao((atual) => (atual === s ? 'todas' : s))

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
    <div className="flex flex-col gap-4">
      {/* NÚMEROS: uma faixa só; os que são filtro ficam marcados quando ativos */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 scrollbar-hide sm:mx-0 sm:px-0">
        <Numero rotulo="Ativos" valor={resumo.ativos} cor="text-text" detalhe={`${resumo.inativos} inativo(s)`} />
        <Numero rotulo="Você tem" valor={resumo.possuidos} cor="text-green" detalhe={`de ${resumo.ativos}`} />
        <Numero rotulo="Mercado" valor={resumo.no_mercado} cor="text-gold" ativo={situacao === 'mercado'} onClick={() => alternarSituacao('mercado')} />
        <Numero rotulo="Forja" valor={resumo.na_forja} cor="text-holo-2" ativo={situacao === 'forja'} onClick={() => alternarSituacao('forja')} />
        <Numero rotulo="Só drop" valor={soDrop} cor="text-holo-3" ativo={situacao === 'so_drop'} onClick={() => alternarSituacao('so_drop')} />
        <Numero rotulo="Sem arte" valor={semArte} cor={semArte > 0 ? 'text-coral' : 'text-green'} ativo={situacao === 'sem_arte'} onClick={() => alternarSituacao('sem_arte')} />
      </div>

      {/* COBERTURA: itens ativos por slot e raridade */}
      <details className="group rounded-2xl border border-line bg-panel p-3 sm:p-4">
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between font-anton text-sm uppercase tracking-wide text-text">
          Cobertura por slot e raridade
          <span className="font-mono text-[11px] normal-case text-muted group-open:hidden">abrir</span>
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse font-mono text-xs">
            <thead>
              <tr className="text-muted-2">
                <th className="py-1 pr-2 text-left font-semibold">Slot</th>
                {ORDEM_RARIDADES.map((r) => (
                  <th key={r} className={`px-2 py-1 text-center font-semibold ${estiloDaRaridade(r).texto}`}>{estiloDaRaridade(r).rotulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS_RPG.map((sl) => (
                <tr key={sl.id} className="border-t border-line/50">
                  <td className="py-1.5 pr-2 text-text">{sl.rotulo}</td>
                  {ORDEM_RARIDADES.map((r) => {
                    const n = cobertura[sl.id]?.[r] ?? 0
                    return (
                      <td key={r} className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setFiltroSlot(sl.id)
                            setFiltroRaridade(r)
                          }}
                          aria-label={`${sl.rotulo} ${estiloDaRaridade(r).rotulo}: ${n}`}
                          className={`min-w-8 cursor-pointer rounded-md px-1.5 py-0.5 font-bold ${n === 0 ? 'bg-coral/15 text-coral' : 'text-text hover:bg-panel-2'}`}
                        >
                          {n}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="m-0 mt-2 text-[11px] text-muted">Zero em vermelho: falta item nessa faixa. Toque num número para filtrar a lista.</p>
        </div>
      </details>

      {/* FILTROS: busca e linhas de chips que rolam de lado no celular */}
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar equipamento por nome ou ID"
            placeholder="Buscar por nome ou id"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl border border-line bg-panel-2 py-2.5 pl-9 pr-3 text-sm text-text outline-none focus:border-holo-3"
          />
        </div>

        <div className="flex flex-col gap-1">
          <p className={ROTULO_DA_LINHA}>Classe</p>
          <div className={LINHA_DE_CHIPS}>
            <Chip ativo={filtroClasse === 'todas'} cor="border-holo-3 bg-holo-3/15 text-holo-3" onClick={() => setFiltroClasse('todas')}>
              Todas ({resumo.ativos})
            </Chip>
            {ORDEM_CLASSES.map((cls) => (
              <Chip key={cls} ativo={filtroClasse === cls} cor="border-holo-3 bg-holo-3/15 text-holo-3" onClick={() => setFiltroClasse(filtroClasse === cls ? 'todas' : cls)}>
                {ROTULO_CLASSE[cls]} ({resumo.por_classe[cls] ?? 0})
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className={ROTULO_DA_LINHA}>Elemento</p>
          <div className={LINHA_DE_CHIPS}>
            <Chip ativo={filtroElemento === 'todos'} cor="border-gold bg-gold/15 text-gold" onClick={() => setFiltroElemento('todos')}>
              Todos ({resumo.ativos})
            </Chip>
            {ORDEM_ELEMENTOS.map((el) => (
              <Chip key={el} ativo={filtroElemento === el} cor="border-gold bg-gold/15 text-gold" onClick={() => setFiltroElemento(filtroElemento === el ? 'todos' : el)}>
                {rotuloElemento(el)} ({resumo.por_elemento[el] ?? 0})
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className={ROTULO_DA_LINHA}>Slot</p>
          <div className={LINHA_DE_CHIPS}>
            <Chip ativo={filtroSlot === 'todos'} cor="border-holo-1 bg-holo-1/15 text-holo-1" onClick={() => setFiltroSlot('todos')}>
              Todos
            </Chip>
            {SLOTS_RPG.map((sl) => (
              <Chip key={sl.id} ativo={filtroSlot === sl.id} cor="border-holo-1 bg-holo-1/15 text-holo-1" onClick={() => setFiltroSlot(filtroSlot === sl.id ? 'todos' : sl.id)}>
                {sl.rotulo} ({resumo.por_slot[sl.id] ?? 0})
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className={ROTULO_DA_LINHA}>Raridade e posse</p>
          <div className={LINHA_DE_CHIPS}>
            {ORDEM_RARIDADES.map((r) => (
              <Chip key={r} ativo={filtroRaridade === r} cor={`${estiloDaRaridade(r).borda} bg-panel-2 ${estiloDaRaridade(r).texto}`} onClick={() => setFiltroRaridade(filtroRaridade === r ? 'todas' : r)}>
                {estiloDaRaridade(r).rotulo} ({resumo.por_raridade[r] ?? 0})
              </Chip>
            ))}
            <Chip ativo={filtroPosse === 'possuo'} cor="border-green bg-green/15 text-green" onClick={() => setFiltroPosse(filtroPosse === 'possuo' ? 'todos' : 'possuo')}>
              Tenho ({resumo.possuidos})
            </Chip>
            <Chip ativo={filtroPosse === 'faltam'} cor="border-green bg-green/15 text-green" onClick={() => setFiltroPosse(filtroPosse === 'faltam' ? 'todos' : 'faltam')}>
              Me faltam ({Math.max(0, resumo.ativos - resumo.possuidos)})
            </Chip>
            <Chip ativo={mostrarInativos} cor="border-coral bg-coral/15 text-coral" onClick={() => setMostrarInativos(!mostrarInativos)}>
              Mostrar inativos ({resumo.inativos})
            </Chip>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2">
          <p className="m-0 font-mono text-xs text-muted">
            Exibindo <strong className="text-text">{itensFiltrados.length}</strong> de {resumo.total}
          </p>
          {algumFiltro && (
            <button type="button" onClick={limpar} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-line px-3 text-xs font-bold text-muted hover:text-text">
              <X size={12} aria-hidden="true" /> Limpar filtros
            </button>
          )}
        </div>
      </section>

      {itensFiltrados.length === 0 ? (
        <p className="m-0 rounded-2xl border border-line bg-panel py-8 text-center text-sm text-muted">Nenhum equipamento encontrado com os filtros atuais.</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {itensFiltrados.map((it) => {
            const est = estiloDaRaridade(it.raridade)
            const rotuloSlot = SLOTS_RPG.find((sl) => sl.id === it.slot)?.rotulo ?? it.slot
            const semImagem = !temArte(it.id)
            return (
              <li key={it.id} className={`flex flex-col gap-1.5 rounded-xl border p-2.5 ${est.borda} ${est.fundo} ${!it.ativo ? 'opacity-65' : ''}`}>
                <div className="flex items-start gap-2.5">
                  <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-void/65 ${est.texto}`}>
                    <IconeDoItem id={it.id} slot={it.slot} tamanho={20} />
                    {semImagem && (
                      <span title="Sem arte" className="absolute right-0 bottom-0 flex h-4 w-4 items-center justify-center rounded-tl-md bg-coral text-void">
                        <ImageOff size={10} aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`m-0 truncate text-sm font-bold leading-tight ${est.texto}`}>{it.nome}</p>
                      {it.possui && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-green/45 bg-green/15 px-1.5 font-mono text-[11px] font-bold text-green">
                          <Check size={10} aria-hidden="true" /> ×{it.quantidade}
                        </span>
                      )}
                    </div>
                    <p className="m-0 text-[11px] text-muted">
                      {est.rotulo} · {rotuloSlot} · Nv {it.nivel_minimo} · <span className="text-text">{rotuloElemento(it.elemento)}</span>
                    </p>
                    <p className="m-0 font-mono text-[11px] text-text">{resumoDoItem(it)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                  {it.generico ? (
                    <span className="rounded-full border border-line bg-void/50 px-2 py-0.5 text-muted">Todas as classes</span>
                  ) : (it.classes ?? []).length === 0 ? (
                    <span className="rounded-full border border-coral/40 bg-coral/10 px-2 py-0.5 text-coral">Sem classe</span>
                  ) : (
                    (it.classes ?? []).map((cls) => (
                      <span key={cls} className="rounded-full border border-holo-3/40 bg-holo-3/10 px-2 py-0.5 text-holo-3">
                        {ROTULO_CLASSE[cls] ?? cls}
                      </span>
                    ))
                  )}
                  {it.conjunto && <span className="rounded-full border border-holo-2/40 bg-holo-2/10 px-2 py-0.5 text-holo-2">Conjunto {it.conjunto}</span>}
                  {semImagem && <span className="rounded-full border border-coral/40 bg-coral/10 px-2 py-0.5 text-coral">Sem arte</span>}
                  {!it.ativo && <span className="rounded-full border border-coral/40 bg-coral/15 px-2 py-0.5 font-bold text-coral">Inativo</span>}
                  <span className="ml-auto inline-flex items-center gap-1 font-mono font-bold">
                    {typeof it.preco_ouro === 'number' && (
                      <span className="inline-flex items-center gap-0.5 text-gold">
                        <IconeOuro size={11} /> {it.preco_ouro}
                      </span>
                    )}
                    {it.na_forja && <span className="text-holo-2">Forja {it.forja_ouro ?? 0}</span>}
                    {typeof it.preco_ouro !== 'number' && !it.na_forja && <span className="text-muted">Drop</span>}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted-2">{it.id}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
