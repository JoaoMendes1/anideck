// client/src/components/PainelRecompensasMissoesAdmin.tsx
// Editor individual de AniCoins e XP para cada missão diária e semanal no Painel Admin.
import { useCallback, useEffect, useState } from 'react'
import { RotateCcw, Save, Target } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import CampoNumerico from './CampoNumerico'

export interface ItemMissaoAdmin {
  id: string
  periodo: 'dia' | 'semana'
  titulo: string
  descricao: string
  meta: number
  recompensa: number
  xp: number
  padrao_recompensa: number
  padrao_xp: number
}

interface RespostaMissoesAdmin {
  diarias: ItemMissaoAdmin[]
  semanais: ItemMissaoAdmin[]
}

export default function PainelRecompensasMissoesAdmin() {
  const { showToast } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [abaPeriodo, setAbaPeriodo] = useState<'dia' | 'semana'>('dia')
  const [diarias, setDiarias] = useState<ItemMissaoAdmin[]>([])
  const [semanais, setSemanais] = useState<ItemMissaoAdmin[]>([])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/admin/missoes/recompensas', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Falha ao carregar missões')
      const json = (await res.json()) as RespostaMissoesAdmin
      setDiarias(Array.isArray(json.diarias) ? json.diarias : [])
      setSemanais(Array.isArray(json.semanais) ? json.semanais : [])
    } catch {
      showToast('Erro ao carregar recompensas individuais das missões.', 'error')
    } finally {
      setCarregando(false)
    }
  }, [showToast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const atualizarItem = (periodo: 'dia' | 'semana', id: string, campo: 'recompensa' | 'xp', valor: number) => {
    const atualizarLista = (lista: ItemMissaoAdmin[]) =>
      lista.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    if (periodo === 'dia') setDiarias(atualizarLista)
    else setSemanais(atualizarLista)
  }

  const restaurarItem = (periodo: 'dia' | 'semana', id: string) => {
    const restaurarLista = (lista: ItemMissaoAdmin[]) =>
      lista.map((item) =>
        item.id === id
          ? { ...item, recompensa: item.padrao_recompensa, xp: item.padrao_xp }
          : item,
      )
    if (periodo === 'dia') setDiarias(restaurarLista)
    else setSemanais(restaurarLista)
  }

  const salvar = async () => {
    setSalvando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const missoes: Record<string, { recompensa: number; xp: number }> = {}
      for (const item of [...diarias, ...semanais]) {
        missoes[item.id] = {
          recompensa: Number(item.recompensa) || 0,
          xp: Number(item.xp) || 0,
        }
      }

      const res = await fetch('/api/admin/missoes/recompensas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ missoes }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao salvar recompensas das missões')
      }
      const json = (await res.json()) as RespostaMissoesAdmin
      setDiarias(Array.isArray(json.diarias) ? json.diarias : [])
      setSemanais(Array.isArray(json.semanais) ? json.semanais : [])
      showToast('Recompensas individuais das missões salvas!', 'success')
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar recompensas', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const listaVisivel = abaPeriodo === 'dia' ? diarias : semanais

  return (
    <section className="p-6 rounded-2xl bg-panel border border-line flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-holo-3/15 text-holo-3 grid place-items-center shrink-0">
            <Target size={18} aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono text-xs text-muted-2 uppercase tracking-widest m-0">// missões individuais · app_settings</p>
            <h2 className="font-anton text-xl uppercase m-0 mt-0.5">Recompensas por Missão</h2>
          </div>
        </div>

        <div className="inline-flex rounded-full border border-line bg-panel-2 p-1" role="tablist" aria-label="Período das missões">
          <button
            type="button"
            role="tab"
            aria-selected={abaPeriodo === 'dia'}
            onClick={() => setAbaPeriodo('dia')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors ${
              abaPeriodo === 'dia' ? 'bg-holo-3 text-void' : 'text-muted hover:text-text'
            }`}
          >
            Diárias ({diarias.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={abaPeriodo === 'semana'}
            onClick={() => setAbaPeriodo('semana')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors ${
              abaPeriodo === 'semana' ? 'bg-holo-3 text-void' : 'text-muted hover:text-text'
            }`}
          >
            Semanais ({semanais.length})
          </button>
        </div>
      </div>

      <p className="text-xs text-muted m-0">
        Ajuste os AniCoins (₳) e o XP de cada missão diária ou semanal individualmente. O valor passa a valer na listagem e no resgate imediatamente.
      </p>

      {carregando ? (
        <div className="h-32 rounded-xl bg-panel-2 animate-pulse" />
      ) : (
        <>
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
            {listaVisivel.map((m) => {
              const alterado = m.recompensa !== m.padrao_recompensa || m.xp !== m.padrao_xp
              return (
                <li
                  key={m.id}
                  className={`flex flex-col gap-2.5 rounded-xl border p-3.5 ${
                    alterado ? 'border-holo-3/45 bg-holo-3/5' : 'border-line bg-panel-2'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-bold text-text">{m.titulo}</p>
                      <p className="m-0 mt-0.5 text-xs text-muted">{m.descricao}</p>
                    </div>
                    {alterado && (
                      <button
                        type="button"
                        onClick={() => restaurarItem(abaPeriodo, m.id)}
                        title={`Restaurar padrão (${m.padrao_recompensa} ₳ · ${m.padrao_xp} XP)`}
                        aria-label={`Restaurar padrão de ${m.titulo}`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-bold text-muted hover:text-text cursor-pointer"
                      >
                        <RotateCcw size={11} aria-hidden="true" /> Padrão
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-[11px] font-mono text-muted">
                      AniCoins (₳)
                      <CampoNumerico
                        aria-label={`AniCoins de ${m.titulo}`}
                        min={0}
                        max={5000}
                        value={m.recompensa}
                        aoMudar={(valor) => atualizarItem(abaPeriodo, m.id, 'recompensa', valor)}
                        className="w-full rounded-lg border border-line bg-panel px-3 py-1.5 font-mono text-sm text-text outline-none focus:border-holo-3"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[11px] font-mono text-muted">
                      XP
                      <CampoNumerico
                        aria-label={`XP de ${m.titulo}`}
                        min={0}
                        max={5000}
                        value={m.xp}
                        aoMudar={(valor) => atualizarItem(abaPeriodo, m.id, 'xp', valor)}
                        className="w-full rounded-lg border border-line bg-panel px-3 py-1.5 font-mono text-sm text-text outline-none focus:border-holo-3"
                      />
                    </label>
                  </div>
                  <p className="m-0 font-mono text-[11px] text-muted-2">
                    Padrão: {m.padrao_recompensa} ₳ · {m.padrao_xp} XP
                  </p>
                </li>
              )
            })}
          </ul>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs text-void bg-gradient-to-r from-holo-1 to-holo-3 hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
            >
              <Save size={14} aria-hidden="true" />
              {salvando ? 'Salvando...' : 'Salvar Recompensas das Missões'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
