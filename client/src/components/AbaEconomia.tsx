// client/src/components/AbaEconomia.tsx
// Aba de controle da economia de Cristais no Painel Admin (Fase 16, #167).
import { useState, useEffect, useCallback } from 'react'
import { Gem, Save, ShieldCheck, Activity, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

interface RegrasEconomia {
  ativo: boolean
  cristais_por_missao_diaria: number
  teto_diario_cristais: number
  custo_padrao_carta: number
  custo_padrao_cosmetico: number
}

interface MovimentoAuditoria {
  id: string
  user_id: string
  user_handle?: string
  quantidade: number
  motivo: string
  referencia: string
  criado_em: string
}

interface RespostaAdminEconomia {
  regras: RegrasEconomia
  total_circulacao: number
  total_transacoes: number
  movimentos_auditoria: MovimentoAuditoria[]
}

export default function AbaEconomia() {
  const { showToast } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [executandoAjuste, setExecutandoAjuste] = useState(false)

  const [regras, setRegras] = useState<RegrasEconomia>({
    ativo: true,
    cristais_por_missao_diaria: 10,
    teto_diario_cristais: 50,
    custo_padrao_carta: 100,
    custo_padrao_cosmetico: 500,
  })
  const [totalCirculacao, setTotalCirculacao] = useState(0)
  const [totalTransacoes, setTotalTransacoes] = useState(0)
  const [movimentos, setMovimentos] = useState<MovimentoAuditoria[]>([])

  // Formulário de ajuste manual
  const [ajusteUserId, setAjusteUserId] = useState('')
  const [ajusteQuantidade, setAjusteQuantidade] = useState<number | ''>('')
  const [ajusteMotivo, setAjusteMotivo] = useState('')

  const carregar = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch('/api/admin/economia', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Falha ao carregar dados da economia')
      const json = (await res.json()) as RespostaAdminEconomia
      setRegras(json.regras)
      setTotalCirculacao(json.total_circulacao)
      setTotalTransacoes(json.total_transacoes)
      setMovimentos(json.movimentos_auditoria || [])
    } catch {
      showToast('Erro ao carregar dados de economia', 'error')
    } finally {
      setCarregando(false)
    }
  }, [showToast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const handleSalvarRegras = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch('/api/admin/economia', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(regras),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao salvar regras')
      }
      showToast('Regras da economia atualizadas com sucesso!', 'success')
      carregar()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar regras', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const handleAjusteManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ajusteUserId.trim() || ajusteQuantidade === '' || ajusteQuantidade === 0 || !ajusteMotivo.trim()) {
      showToast('Preencha todos os campos do ajuste manual', 'error')
      return
    }

    setExecutandoAjuste(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch('/api/admin/economia/ajuste', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: ajusteUserId.trim(),
          quantidade: Number(ajusteQuantidade),
          motivo: ajusteMotivo.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao processar ajuste manual')
      }

      showToast(`Ajuste de ${ajusteQuantidade} 💎 aplicado com sucesso!`, 'success')
      setAjusteUserId('')
      setAjusteQuantidade('')
      setAjusteMotivo('')
      carregar()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao aplicar ajuste manual', 'error')
    } finally {
      setExecutandoAjuste(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw size={24} className="animate-spin text-holo-3" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* MÉTRICAS PRINCIPAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-panel border border-line flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">Em circulação</p>
            <p className="font-anton text-2xl text-holo-3 mt-1 m-0">{totalCirculacao.toLocaleString('pt-BR')} 💎</p>
            <p className="text-[11px] text-muted-2 mt-1 m-0">Soma de todos os saldos de usuários</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-holo-3/15 text-holo-3 grid place-items-center shrink-0">
            <Gem size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-panel border border-line flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">Transações no ledger</p>
            <p className="font-anton text-2xl text-text mt-1 m-0">{totalTransacoes.toLocaleString('pt-BR')}</p>
            <p className="text-[11px] text-muted-2 mt-1 m-0">Entradas e saídas imutáveis registradas</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green/15 text-green grid place-items-center shrink-0">
            <Activity size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-panel border border-line flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">Status da Economia</p>
            <p className={`font-anton text-2xl mt-1 m-0 ${regras.ativo ? 'text-green' : 'text-coral'}`}>
              {regras.ativo ? 'ATIVA' : 'PAUSADA'}
            </p>
            <p className="text-[11px] text-muted-2 mt-1 m-0">
              {regras.ativo ? 'Distribuição e gastos habilitados' : 'Operações de créditos bloqueadas'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl grid place-items-center shrink-0 ${regras.ativo ? 'bg-green/15 text-green' : 'bg-coral/15 text-coral'}`}>
            <ShieldCheck size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* FORMULÁRIO DE REGRAS DA ECONOMIA */}
        <section className="p-6 rounded-2xl bg-panel border border-line">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">// parâmetros</p>
              <h2 className="font-anton text-xl uppercase m-0 mt-0.5">Regras dos Cristais</h2>
            </div>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border border-line bg-panel-2 text-muted">
              app_settings
            </span>
          </div>

          <form onSubmit={handleSalvarRegras} className="flex flex-col gap-4">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-panel-2 border border-line cursor-pointer select-none">
              <input
                type="checkbox"
                checked={regras.ativo}
                onChange={(e) => setRegras({ ...regras, ativo: e.target.checked })}
                className="w-4 h-4 rounded text-holo-3 focus:ring-holo-3"
              />
              <div>
                <span className="text-sm font-bold text-text block">Economia ativa</span>
                <span className="text-xs text-muted-2 block">
                  Permite ganho de Cristais por missões e transações na loja
                </span>
              </div>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[11px] text-muted uppercase mb-1">
                  Missão diária (💎)
                </label>
                <input
                  type="number"
                  min="1"
                  value={regras.cristais_por_missao_diaria}
                  onChange={(e) => setRegras({ ...regras, cristais_por_missao_diaria: Number(e.target.value) })}
                  className="w-full bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-holo-3 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] text-muted uppercase mb-1">
                  Teto diário (💎)
                </label>
                <input
                  type="number"
                  min="1"
                  value={regras.teto_diario_cristais}
                  onChange={(e) => setRegras({ ...regras, teto_diario_cristais: Number(e.target.value) })}
                  className="w-full bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-holo-3 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] text-muted uppercase mb-1">
                  Custo base de Carta (💎)
                </label>
                <input
                  type="number"
                  min="1"
                  value={regras.custo_padrao_carta}
                  onChange={(e) => setRegras({ ...regras, custo_padrao_carta: Number(e.target.value) })}
                  className="w-full bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-holo-3 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] text-muted uppercase mb-1">
                  Custo base de Cosmético (💎)
                </label>
                <input
                  type="number"
                  min="1"
                  value={regras.custo_padrao_cosmetico}
                  onChange={(e) => setRegras({ ...regras, custo_padrao_cosmetico: Number(e.target.value) })}
                  className="w-full bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-holo-3 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="mt-2 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs text-void bg-gradient-to-r from-holo-1 to-holo-3 hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
            >
              <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar Regras da Economia'}
            </button>
          </form>
        </section>

        {/* AJUSTE MANUAL COM AUDITORIA */}
        <section className="p-6 rounded-2xl bg-panel border border-line">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">// suporte &amp; auditoria</p>
              <h2 className="font-anton text-xl uppercase m-0 mt-0.5">Ajuste Manual de Saldo</h2>
            </div>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border border-gold/40 bg-gold/10 text-gold">
              Service Role
            </span>
          </div>

          <p className="text-xs text-muted mb-4 leading-relaxed">
            Permite bonificar ou debitar cristais de uma conta específica. Toda ação gera uma linha rastreável
            no livro-razão com o motivo informado.
          </p>

          <form onSubmit={handleAjusteManual} className="flex flex-col gap-3">
            <div>
              <label className="block font-mono text-[11px] text-muted uppercase mb-1">
                UUID do Usuário (user_id)
              </label>
              <input
                type="text"
                value={ajusteUserId}
                onChange={(e) => setAjusteUserId(e.target.value)}
                placeholder="Ex: c12d54e0-7988-466d-8e67-d8c9735d6480"
                className="w-full bg-panel-2 border border-line rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-holo-3 font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] text-muted uppercase mb-1">
                Quantidade (+ para crédito, - para débito)
              </label>
              <input
                type="number"
                value={ajusteQuantidade}
                onChange={(e) => setAjusteQuantidade(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ex: 50 ou -30"
                className="w-full bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-holo-3 font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] text-muted uppercase mb-1">
                Motivo Obrigatório
              </label>
              <input
                type="text"
                value={ajusteMotivo}
                onChange={(e) => setAjusteMotivo(e.target.value)}
                placeholder="Ex: Recompensa por feedback / Correção de bug no teste"
                className="w-full bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-holo-3"
                required
              />
            </div>

            <button
              type="submit"
              disabled={executandoAjuste}
              className="mt-2 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs text-void bg-gradient-to-r from-gold to-green hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
            >
              <Gem size={14} /> {executandoAjuste ? 'Processando...' : 'Aplicar Ajuste Manual'}
            </button>
          </form>
        </section>
      </div>

      {/* AUDITORIA DE MOVIMENTOS RECENTES */}
      <section className="p-6 rounded-2xl bg-panel border border-line">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">// auditoria do ledger</p>
            <h2 className="font-anton text-xl uppercase m-0 mt-0.5">Últimas Transações Globais</h2>
          </div>
          <button
            type="button"
            onClick={carregar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-panel-2 text-xs font-bold text-muted hover:text-text cursor-pointer transition-colors"
          >
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>

        {movimentos.length === 0 ? (
          <div className="p-8 rounded-xl bg-panel-2 border border-line text-center">
            <p className="text-sm text-muted m-0">Nenhum movimento registrado no crystal_ledger ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-line text-muted-2 font-mono text-[10.5px] uppercase">
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Usuário</th>
                  <th className="py-2.5 px-3">Motivo</th>
                  <th className="py-2.5 px-3">Referência</th>
                  <th className="py-2.5 px-3 text-right">Quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {movimentos.map((m) => {
                  const positivo = m.quantidade > 0
                  const dataFormatada = new Date(m.criado_em).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  return (
                    <tr key={m.id} className="hover:bg-panel-2/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-muted text-xs whitespace-nowrap">
                        {dataFormatada}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        {m.user_handle ? (
                          <span className="text-holo-3 font-bold">@{m.user_handle}</span>
                        ) : (
                          <span className="text-muted-2" title={m.user_id}>
                            {m.user_id ? `${m.user_id.slice(0, 8)}...` : '—'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-text font-bold">
                        {m.motivo.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-muted-2 truncate max-w-[200px]" title={m.referencia}>
                        {m.referencia || '—'}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${positivo ? 'text-green' : 'text-coral'}`}>
                        {positivo ? `+${m.quantidade}` : m.quantidade} 💎
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
