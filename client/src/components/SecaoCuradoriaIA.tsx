// client/src/components/SecaoCuradoriaIA.tsx
// Seção "Curadoria por IA" do Painel de Controle: como o worker da fila trabalha.
// O worker relê esta configuração a cada ciclo, então salvar vale sem reiniciar nada.
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

interface ConfigFila {
  modo: 'revisao' | 'automatico'
  lote: number
  intervalo: number
  episodios_por_lote: number
  prompt_pesquisa: string
  prompt_estruturar: string
}

const entrada = 'bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-holo-2'

async function comToken(url: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${session?.access_token ?? ''}` } })
}

export default function SecaoCuradoriaIA() {
  const { showToast } = useToast()
  const [config, setConfig] = useState<ConfigFila | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    comToken('/api/admin/ia/config')
      .then(async r => (r.ok ? r.json() : Promise.reject(new Error(await r.text()))))
      .then(c => ativo && setConfig(c))
      .catch(e => ativo && setErro(e instanceof Error ? e.message : 'Falha ao carregar.'))
    return () => { ativo = false }
  }, [])

  const salvar = async () => {
    if (!config) return
    setSalvando(true)
    try {
      const res = await comToken('/api/admin/ia/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error(await res.text())
      showToast('Salvo. Vale a partir do próximo ciclo do worker.', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Falha ao salvar.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const mudar = <K extends keyof ConfigFila>(campo: K, valor: ConfigFila[K]) => config && setConfig({ ...config, [campo]: valor })

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="font-anton text-lg uppercase flex items-center gap-2">
          <Sparkles size={16} className="text-holo-3" /> Curadoria por IA
        </h2>
        <p className="text-muted text-[13.5px] mt-1.5 max-w-[62ch]">
          Como o worker da fila trabalha. Os animes entram pela aba Revisão da IA, e é lá que você aprova.
        </p>
      </header>

      {erro && <p className="text-coral text-sm">{erro}</p>}
      {!config && !erro && <p className="text-muted text-sm">Carregando…</p>}

      {config && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <label className="flex flex-col gap-1 text-xs text-muted">Sinopse e tags
              <select className={entrada} value={config.modo} onChange={e => mudar('modo', e.target.value as ConfigFila['modo'])}>
                <option value="revisao">Revisar antes</option>
                <option value="automatico">Gravar direto</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">Animes por ciclo
              <input className={entrada} type="number" min={1} max={20} value={config.lote} onChange={e => mudar('lote', Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">Intervalo (s)
              <input className={entrada} type="number" min={15} max={3600} value={config.intervalo} onChange={e => mudar('intervalo', Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">Episódios por pesquisa
              <input className={entrada} type="number" min={1} max={24} value={config.episodios_por_lote} onChange={e => mudar('episodios_por_lote', Number(e.target.value))} />
            </label>
          </div>
          <p className="text-[12px] text-muted-2">
            Episódios, datas e onde assistir nunca são gravados sem a sua aprovação, em nenhum modo.
          </p>

          <label className="flex flex-col gap-1 text-xs text-muted">Prompt da pesquisa de episódios (chamada 1, com busca na web)
            <textarea className={`${entrada} min-h-[150px] font-mono text-[12px]`} value={config.prompt_pesquisa} onChange={e => mudar('prompt_pesquisa', e.target.value)} />
            <span className="text-muted-2">
              Marcadores: <code className="font-mono">{'{titulo}'}</code> (obrigatório), <code className="font-mono">{'{mal_id}'}</code>,{' '}
              <code className="font-mono">{'{de}'}</code> e <code className="font-mono">{'{ate}'}</code> (a faixa de episódios).
            </span>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">Prompt da estruturação (chamada 2, transforma o texto da pesquisa em dados)
            <textarea className={`${entrada} min-h-[80px] font-mono text-[12px]`} value={config.prompt_estruturar} onChange={e => mudar('prompt_estruturar', e.target.value)} />
          </label>

          <div>
            <button type="button" onClick={salvar} disabled={salvando}
              className="text-xs font-bold px-4 py-2 rounded-full bg-panel-2 border border-line text-text cursor-pointer disabled:opacity-50">
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
