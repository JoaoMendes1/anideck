// client/src/components/AbaNovidades.tsx
// Painel Admin › Novidades: publica atualizações para todos os jogadores, com data e hora,
// caminhos para conferir e a chave do aviso no meio da tela.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Eye, EyeOff, Megaphone, Send, MonitorUp, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import CartaoNovidade from './novidades/CartaoNovidade'
import {
  ROTULO_CATEGORIA, alcanceDasNovidades, apagarNovidade, restaurarNovidade, dataHoraDaNovidade, listarNovidades,
  paraCampoDataHora, salvarNovidade, type CategoriaNovidade, type Novidade, type RascunhoNovidade,
} from '../lib/novidades'

/** Caminhos mais usados, para não precisar digitar. */
const SUGESTOES: { rotulo: string; caminho: string }[] = [
  { rotulo: 'Ver Personagem', caminho: '/personagem' },
  { rotulo: 'Ver Expedições', caminho: '/expedicoes' },
  { rotulo: 'Ver Masmorras', caminho: '/masmorras' },
  { rotulo: 'Ver Guilda', caminho: '/guilda' },
  { rotulo: 'Ver Loja', caminho: '/loja' },
  { rotulo: 'Ver Feed', caminho: '/feed' },
  { rotulo: 'Ver Agenda', caminho: '/calendario' },
  { rotulo: 'Ver Meu Deck', caminho: '/deck' },
  { rotulo: 'Ver Clãs', caminho: '/clas' },
  { rotulo: 'Ver Rankings', caminho: '/rankings' },
]

function rascunhoVazio(): RascunhoNovidade {
  return {
    id: null, titulo: '', resumo: '', categoria: 'novidade',
    links: [{ rotulo: '', caminho: '' }],
    publicado_em: paraCampoDataHora(new Date()),
    no_meio_da_tela: true, ativo: true,
  }
}

function rascunhoDe(n: Novidade): RascunhoNovidade {
  return {
    id: n.id, titulo: n.titulo, resumo: n.resumo, categoria: n.categoria,
    links: n.links.length ? n.links : [{ rotulo: '', caminho: '' }],
    publicado_em: paraCampoDataHora(new Date(n.publicado_em)),
    no_meio_da_tela: n.no_meio_da_tela, ativo: n.ativo,
  }
}

const CAMPO = 'mt-1 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-text outline-none focus:border-holo-2 [color-scheme:dark] [&_option]:bg-panel-2 [&_option]:text-text'

export default function AbaNovidades() {
  const { showToast } = useToast()
  const [lista, setLista] = useState<Novidade[]>([])
  const [alcance, setAlcance] = useState<Record<string, number>>({})
  const [rascunho, setRascunho] = useState<RascunhoNovidade | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    const [l, a] = await Promise.all([listarNovidades(100), alcanceDasNovidades()])
    setLista(l)
    setAlcance(a)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const mudar = <K extends keyof RascunhoNovidade>(chave: K, valor: RascunhoNovidade[K]) =>
    setRascunho(r => (r ? { ...r, [chave]: valor } : r))

  const mudarLink = (i: number, campo: 'rotulo' | 'caminho', valor: string) =>
    setRascunho(r => (r ? { ...r, links: r.links.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)) } : r))

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!rascunho) return
    setSalvando(true)
    const res = await salvarNovidade(rascunho)
    setSalvando(false)
    if (!res.ok) {
      showToast(res.erro, 'error')
      return
    }
    showToast(rascunho.id ? 'Novidade atualizada.' : 'Novidade publicada.', 'success')
    setRascunho(null)
    carregar()
  }

  const alternar = async (n: Novidade, campo: 'ativo' | 'no_meio_da_tela') => {
    const res = await salvarNovidade({ ...rascunhoDe(n), [campo]: !n[campo] })
    if (!res.ok) showToast(res.erro, 'error')
    carregar()
  }

  const apagar = async (n: Novidade) => {
    if (await apagarNovidade(n.id)) {
      showToast(`"${n.titulo}" foi para a lixeira. Dá para restaurar lá embaixo.`, 'success')
      carregar()
    } else showToast('Não foi possível apagar.', 'error')
  }

  const restaurar = async (n: Novidade) => {
    if (await restaurarNovidade(n.id)) {
      showToast(n.rascunho ? 'Restaurada em Prontas para publicar.' : 'Restaurada, desligada. Publique quando quiser.', 'success')
      carregar()
    } else showToast('Não foi possível restaurar.', 'error')
  }

  const publicar = async (n: Novidade) => {
    const res = await salvarNovidade({ ...rascunhoDe(n), ativo: true })
    if (!res.ok) {
      showToast(res.erro, 'error')
      return
    }
    showToast(n.no_meio_da_tela ? 'Publicada. Os jogadores vão ver no meio da tela.' : 'Publicada na página Novidades.', 'success')
    carregar()
  }

  const agora = new Date()
  const lixeira = lista.filter(n => n.apagada_em)
  const prontas = lista.filter(n => n.rascunho && !n.apagada_em)
  const demais = lista.filter(n => !n.rascunho && !n.apagada_em)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <Megaphone size={22} className="text-holo-1" aria-hidden />
        <div className="flex-1 min-w-0">
          <h2 className="m-0 text-xl font-bold text-text">Novidades</h2>
          <p className="m-0 text-sm text-muted">
            Avise todos os jogadores sobre atualizações. Com "no meio da tela" ligado, o aviso abre ao entrar e para quem está com o site aberto (em até 3 minutos).
          </p>
        </div>
        {!rascunho && (
          <button type="button" onClick={() => setRascunho(rascunhoVazio())} className="inline-flex items-center gap-1.5 rounded-xl bg-holo-1 px-4 py-2 text-sm font-bold text-void cursor-pointer">
            <Plus size={16} /> Nova novidade
          </button>
        )}
      </header>

      {rascunho && (
        <form onSubmit={enviar} className="rounded-2xl border border-holo-1/30 bg-panel p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-muted sm:col-span-2">
              Título
              <input className={CAMPO} value={rascunho.titulo} maxLength={120} onChange={e => mudar('titulo', e.target.value)} placeholder="Ex.: HP e Mana unificados" />
            </label>
            <label className="block text-sm text-muted">
              Tipo
              <select className={CAMPO} value={rascunho.categoria} onChange={e => mudar('categoria', e.target.value as CategoriaNovidade)}>
                {(Object.keys(ROTULO_CATEGORIA) as CategoriaNovidade[]).map(c => <option key={c} value={c}>{ROTULO_CATEGORIA[c]}</option>)}
              </select>
            </label>
            <label className="block text-sm text-muted">
              Data e hora da atualização
              <input type="datetime-local" className={CAMPO} value={rascunho.publicado_em} onChange={e => mudar('publicado_em', e.target.value)} />
            </label>
            <label className="block text-sm text-muted sm:col-span-2">
              O que mudou
              <textarea className={`${CAMPO} min-h-28`} value={rascunho.resumo} maxLength={2000} onChange={e => mudar('resumo', e.target.value)} />
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm text-muted">Caminhos para conferir (até 6)</legend>
            {rascunho.links.map((l, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row">
                <input className={CAMPO} value={l.rotulo} maxLength={40} placeholder="Nome do botão" onChange={e => mudarLink(i, 'rotulo', e.target.value)} />
                <input className={CAMPO} value={l.caminho} placeholder="/expedicoes" list="novidades-caminhos" onChange={e => mudarLink(i, 'caminho', e.target.value)} />
                <button type="button" aria-label="Tirar caminho" onClick={() => mudar('links', rascunho.links.filter((_, j) => j !== i))} className="self-end sm:self-center text-muted hover:text-coral cursor-pointer">
                  <X size={18} />
                </button>
              </div>
            ))}
            <datalist id="novidades-caminhos">
              {SUGESTOES.map(s => <option key={s.caminho} value={s.caminho}>{s.rotulo}</option>)}
            </datalist>
            <div className="flex flex-wrap gap-2">
              {rascunho.links.length < 6 && (
                <button type="button" onClick={() => mudar('links', [...rascunho.links, { rotulo: '', caminho: '' }])} className="text-sm text-holo-1 cursor-pointer">
                  + Outro caminho
                </button>
              )}
              {SUGESTOES.filter(s => !rascunho.links.some(l => l.caminho === s.caminho)).slice(0, 6).map(s => (
                <button
                  key={s.caminho}
                  type="button"
                  disabled={rascunho.links.filter(l => l.caminho || l.rotulo).length >= 6}
                  onClick={() => mudar('links', [...rascunho.links.filter(l => l.caminho || l.rotulo), s])}
                  className="rounded-full border border-line px-2 py-0.5 text-xs text-muted hover:text-text cursor-pointer disabled:opacity-40"
                >
                  {s.rotulo}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start gap-2 text-sm text-text">
            <input type="checkbox" className="mt-1" checked={rascunho.no_meio_da_tela} onChange={e => mudar('no_meio_da_tela', e.target.checked)} />
            <span>
              Mostrar no meio da tela
              <span className="block text-xs text-muted">Desligado, a novidade só aparece na página Novidades.</span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={rascunho.ativo} onChange={e => mudar('ativo', e.target.checked)} />
            Publicada
          </label>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setRascunho(null)} className="rounded-xl px-4 py-2 text-sm text-muted cursor-pointer">Cancelar</button>
            <button type="submit" disabled={salvando} className="inline-flex items-center gap-1.5 rounded-xl bg-holo-1 px-4 py-2 text-sm font-bold text-void cursor-pointer disabled:opacity-50">
              <Save size={16} /> {rascunho.id ? 'Salvar' : 'Publicar'}
            </button>
          </div>
        </form>
      )}

      {prontas.length > 0 && !rascunho && (
        <section aria-labelledby="titulo-prontas" className="space-y-3 rounded-2xl border border-gold/40 bg-gold/5 p-4">
          <h3 id="titulo-prontas" className="m-0 text-base font-bold text-gold">
            Prontas para publicar ({prontas.length})
          </h3>
          <p className="m-0 text-xs text-muted">Chegaram com a última atualização do site. Confira o texto e publique; dá para editar antes.</p>
          {prontas.map(n => (
            <div key={n.id} className="space-y-2">
              <CartaoNovidade novidade={n} />
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => publicar(n)} className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-void cursor-pointer">
                  <Send size={16} /> Publicar
                </button>
                <button type="button" onClick={() => setRascunho(rascunhoDe(n))} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm text-text cursor-pointer">
                  <Pencil size={14} /> Editar
                </button>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" checked={n.no_meio_da_tela} onChange={() => alternar(n, 'no_meio_da_tela')} />
                  No meio da tela
                </label>
                <span className="flex-1" />
                <button type="button" onClick={() => apagar(n)} className="text-xs text-muted hover:text-coral cursor-pointer">
                  Descartar
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <ul className="space-y-2 p-0 list-none">
        {demais.length === 0 && <li className="text-sm text-muted">Nenhuma novidade ainda.</li>}
        {demais.map(n => {
          const agendada = new Date(n.publicado_em) > agora
          return (
            <li key={n.id} className="rounded-2xl border border-line bg-panel p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 min-w-0 font-semibold text-text truncate">{n.titulo}</span>
                <span className="text-xs text-muted">{ROTULO_CATEGORIA[n.categoria]} · {dataHoraDaNovidade(n.publicado_em)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                {!n.ativo && <span className="rounded-full bg-panel-2 px-2 py-0.5 text-muted">Desligada</span>}
                {n.ativo && agendada && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-gold">Agendada</span>}
                {n.no_meio_da_tela && <span className="rounded-full bg-holo-1/15 px-2 py-0.5 text-holo-1">No meio da tela</span>}
                <span className="text-muted">{alcance[n.id] ?? 0} viram o aviso</span>
                <span className="flex-1" />
                <button type="button" title={n.no_meio_da_tela ? 'Tirar do meio da tela' : 'Mostrar no meio da tela'} onClick={() => alternar(n, 'no_meio_da_tela')} className="p-1 text-muted hover:text-text cursor-pointer">
                  <MonitorUp size={16} />
                </button>
                <button type="button" title={n.ativo ? 'Desligar' : 'Publicar'} onClick={() => alternar(n, 'ativo')} className="p-1 text-muted hover:text-text cursor-pointer">
                  {n.ativo ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button type="button" title="Editar" onClick={() => setRascunho(rascunhoDe(n))} className="p-1 text-muted hover:text-text cursor-pointer">
                  <Pencil size={16} />
                </button>
                <button type="button" title="Apagar" onClick={() => apagar(n)} className="p-1 text-muted hover:text-coral cursor-pointer">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {lixeira.length > 0 && (
        <details className="rounded-2xl border border-line bg-panel p-3">
          <summary className="cursor-pointer text-sm text-muted">Lixeira ({lixeira.length})</summary>
          <ul className="mt-2 space-y-2 p-0 list-none">
            {lixeira.map(n => (
              <li key={n.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-panel-2 px-3 py-2">
                <span className="flex-1 min-w-0 truncate text-sm text-text">{n.titulo}</span>
                <span className="text-xs text-muted">{ROTULO_CATEGORIA[n.categoria]}</span>
                <button type="button" onClick={() => restaurar(n)} className="rounded-lg border border-holo-1/40 px-3 py-1 text-xs font-semibold text-holo-1 cursor-pointer">
                  Restaurar
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
