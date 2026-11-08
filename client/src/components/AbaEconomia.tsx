// client/src/components/AbaEconomia.tsx
// Aba de controle da economia de AniCoins no Painel Admin (Fase 16).
import { useState, useEffect, useCallback, useRef } from 'react'
import { Save, ShieldCheck, Activity, RefreshCw, X, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import IconeAniCoin from './IconeAniCoin'

interface RegrasEconomia {
  ativo: boolean
  cristais_por_missao_diaria?: number
  ganho_missao_diaria?: number
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

interface MembroSugestao {
  user_id: string
  handle: string
  nome?: string
  avatar_url?: string
}

interface RespostaAdminEconomia {
  regras: RegrasEconomia
  total_circulacao: number
  total_transacoes: number
  ultimos_movimentos?: MovimentoAuditoria[]
  movimentos_auditoria?: MovimentoAuditoria[]
}

export default function AbaEconomia() {
  const { showToast } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [executandoAjuste, setExecutandoAjuste] = useState(false)
  const [atualizando, setAtualizando] = useState(false)

  const [regras, setRegras] = useState<RegrasEconomia>({
    ativo: true,
    cristais_por_missao_diaria: 15,
    ganho_missao_diaria: 15,
    teto_diario_cristais: 100,
    custo_padrao_carta: 100,
    custo_padrao_cosmetico: 500,
  })
  const [totalCirculacao, setTotalCirculacao] = useState(0)
  const [totalTransacoes, setTotalTransacoes] = useState(0)
  const [movimentos, setMovimentos] = useState<MovimentoAuditoria[]>([])

  // Formulário de ajuste manual com busca debounced de membros
  const [ajusteBusca, setAjusteBusca] = useState('')
  const [membroSelecionado, setMembroSelecionado] = useState<MembroSugestao | null>(null)
  const [sugestoesMembros, setSugestoesMembros] = useState<MembroSugestao[]>([])
  const [buscandoMembros, setBuscandoMembros] = useState(false)
  const timerBusca = useRef<number | null>(null)

  const [ajusteQuantidade, setAjusteQuantidade] = useState<number | ''>('')
  const [ajusteMotivo, setAjusteMotivo] = useState('')

  const carregar = useCallback(async (comFeedback = false) => {
    if (comFeedback) setAtualizando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch('/api/admin/economia', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Falha ao carregar dados da economia')
      const json = (await res.json()) as RespostaAdminEconomia
      setRegras({
        ativo: json.regras.ativo ?? true,
        teto_diario_cristais: json.regras.teto_diario_cristais || 100,
        ganho_missao_diaria: json.regras.ganho_missao_diaria || json.regras.cristais_por_missao_diaria || 15,
        cristais_por_missao_diaria: json.regras.ganho_missao_diaria || json.regras.cristais_por_missao_diaria || 15,
        custo_padrao_carta: json.regras.custo_padrao_carta || 100,
        custo_padrao_cosmetico: json.regras.custo_padrao_cosmetico || 500,
      })
      setTotalCirculacao(json.total_circulacao ?? 0)
      setTotalTransacoes(json.total_transacoes ?? 0)
      setMovimentos(json.ultimos_movimentos || json.movimentos_auditoria || [])
      if (comFeedback) {
        showToast('Transações e métricas atualizadas.', 'success')
      }
    } catch {
      showToast('Erro ao carregar dados de economia', 'error')
    } finally {
      setCarregando(false)
      if (comFeedback) setAtualizando(false)
    }
  }, [showToast])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Busca debounced de usuários pelo @handle ou nome
  useEffect(() => {
    if (timerBusca.current) window.clearTimeout(timerBusca.current)
    const termo = ajusteBusca.replace(/^@/, '').trim()
    if (termo.length < 2 || membroSelecionado?.handle === termo) {
      setSugestoesMembros([])
      setBuscandoMembros(false)
      return
    }

    setBuscandoMembros(true)
    timerBusca.current = window.setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const res = await fetch(`/api/admin/economia/buscar-destinatario?q=${encodeURIComponent(termo)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const dados = (await res.json()) as MembroSugestao[]
          setSugestoesMembros(dados)
        }
      } catch {
        // Silencioso
      } finally {
        setBuscandoMembros(false)
      }
    }, 250)

    return () => {
      if (timerBusca.current) window.clearTimeout(timerBusca.current)
    }
  }, [ajusteBusca, membroSelecionado])

  const handleSelecionarMembro = (m: MembroSugestao) => {
    setMembroSelecionado(m)
    setAjusteBusca(`@${m.handle}`)
    setSugestoesMembros([])
  }

  const handleLimparMembro = () => {
    setMembroSelecionado(null)
    setAjusteBusca('')
    setSugestoesMembros([])
  }

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
        body: JSON.stringify({
          ativo: regras.ativo,
          teto_diario_cristais: Number(regras.teto_diario_cristais),
          ganho_missao_diaria: Number(regras.ganho_missao_diaria || regras.cristais_por_missao_diaria || 15),
          custo_padrao_carta: Number(regras.custo_padrao_carta || 100),
          custo_padrao_cosmetico: Number(regras.custo_padrao_cosmetico || 500),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao salvar regras')
      }
      showToast('Regras da economia atualizadas com sucesso!', 'success')
      carregar(false)
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar regras', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const handleAjusteManual = async (e: React.FormEvent) => {
    e.preventDefault()
    const alvo = (membroSelecionado?.user_id || ajusteBusca.replace(/^@/, '')).trim()
    if (!alvo || ajusteQuantidade === '' || ajusteQuantidade === 0 || !ajusteMotivo.trim()) {
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
          user_id: alvo,
          quantidade: Number(ajusteQuantidade),
          motivo: ajusteMotivo.trim(),
          motivo_detalhado: ajusteMotivo.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao processar ajuste manual')
      }

      const dados = await res.json()
      showToast(dados.mensagem || `Ajuste de ${ajusteQuantidade} ₳ aplicado com sucesso!`, 'success')
      setAjusteBusca('')
      setMembroSelecionado(null)
      setAjusteQuantidade('')
      setAjusteMotivo('')
      carregar(false)
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Falha ao processar ajuste manual', 'error')
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
            <p className="font-anton text-2xl text-holo-3 mt-1 m-0">{totalCirculacao.toLocaleString('pt-BR')} ₳</p>
            <p className="text-[11px] text-muted-2 mt-1 m-0">Soma de todas as AniCoins em carteiras</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-holo-3/15 text-holo-3 grid place-items-center shrink-0">
            <IconeAniCoin size={26} animar />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-panel border border-line flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">Transações no ledger</p>
            <p className="font-anton text-2xl text-text mt-1 m-0">{totalTransacoes.toLocaleString('pt-BR')}</p>
            <p className="text-[11px] text-muted-2 mt-1 m-0">Entradas, saídas e transferências registradas</p>
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
              {regras.ativo ? 'Distribuição, transferências e gastos habilitados' : 'Operações bloqueadas'}
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
              <h2 className="font-anton text-xl uppercase m-0 mt-0.5">Regras de AniCoins</h2>
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
                  Permite ganho de AniCoins por missões, transferências e transações na loja
                </span>
              </div>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[11px] text-muted uppercase mb-1">
                  Missão diária (₳)
                </label>
                <input
                  type="number"
                  min="1"
                  value={regras.ganho_missao_diaria || regras.cristais_por_missao_diaria || 15}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setRegras({ ...regras, ganho_missao_diaria: v, cristais_por_missao_diaria: v })
                  }}
                  className="w-full bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-holo-3 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] text-muted uppercase mb-1">
                  Teto diário (₳)
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
                  Custo base de Carta (₳)
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
                  Custo base de Cosmético (₳)
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
              className="mt-2 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs text-void bg-holo hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
            >
              <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar Regras de AniCoins'}
            </button>
          </form>
        </section>

        {/* AJUSTE MANUAL DE SALDO */}
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
            Permite bonificar ou debitar AniCoins de uma conta específica por @handle ou UUID. Toda ação gera uma linha rastreável
            no livro-razão com o motivo informado.
          </p>

          <form onSubmit={handleAjusteManual} className="flex flex-col gap-3">
            <div>
              <label className="block font-mono text-[11px] text-muted uppercase mb-1">
                Usuário (@handle ou UUID)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ajusteBusca}
                  onChange={(e) => {
                    setAjusteBusca(e.target.value)
                    if (membroSelecionado && e.target.value !== `@${membroSelecionado.handle}`) {
                      setMembroSelecionado(null)
                    }
                  }}
                  placeholder="Ex: @moderador1 ou c12d54e0-..."
                  className="w-full bg-panel-2 border border-line rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-holo-3 font-mono pr-8"
                  required
                />
                {membroSelecionado && (
                  <button
                    type="button"
                    onClick={handleLimparMembro}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text p-1 cursor-pointer"
                    title="Limpar seleção"
                  >
                    <X size={14} />
                  </button>
                )}
                {buscandoMembros && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <RefreshCw size={12} className="animate-spin text-muted" />
                  </div>
                )}
              </div>

              {/* Sugestões debounced de membros */}
              {sugestoesMembros.length > 0 && (
                <div className="mt-1.5 p-1 rounded-xl bg-panel-2 border border-line shadow-xl max-h-48 overflow-y-auto flex flex-col gap-0.5 z-20 relative">
                  {sugestoesMembros.map((m) => (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => handleSelecionarMembro(m)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-panel transition-colors cursor-pointer"
                    >
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-panel border border-line flex items-center justify-center shrink-0">
                          <User size={12} className="text-muted" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-text block truncate">{m.nome || m.handle}</span>
                        <span className="font-mono text-[10px] text-holo-3 block">@{m.handle}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {membroSelecionado && (
                <p className="font-mono text-[10.5px] text-green mt-1 m-0 flex items-center gap-1">
                  ✓ Selecionado: {membroSelecionado.nome ? `${membroSelecionado.nome} (@${membroSelecionado.handle})` : `@${membroSelecionado.handle}`}
                </p>
              )}
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
                placeholder="Ex: Recompensa por feedback / Teste de moderador"
                className="w-full bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-holo-3"
                required
              />
            </div>

            <button
              type="submit"
              disabled={executandoAjuste}
              className="mt-2 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs text-void bg-gradient-to-r from-gold to-green hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
            >
              <IconeAniCoin size={14} /> {executandoAjuste ? 'Processando...' : 'Aplicar Ajuste Manual'}
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
            disabled={atualizando}
            onClick={() => carregar(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-panel-2 text-xs font-bold text-muted hover:text-text hover:border-holo-2 cursor-pointer transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={atualizando ? 'animate-spin text-holo-3' : ''} />
            {atualizando ? 'Atualizando...' : 'Atualizar'}
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
                          <span className="text-holo-3 font-bold">
                            {m.user_handle.startsWith('@') ? m.user_handle : `@${m.user_handle}`}
                          </span>
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
                        {positivo ? `+${m.quantidade}` : m.quantidade} ₳
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
