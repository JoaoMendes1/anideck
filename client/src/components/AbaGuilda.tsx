import { useState, useEffect } from 'react'
import { Save, ShieldAlert, Plus, Trash2, Power, Award, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import type { EconomiaGuilda, FaixaRank } from '../lib/guilda'

interface InsigniaConfigAdmin {
  id: string
  icone: string
  nome: string
  descricao: string
  regra: string
  meta: number
  estilo: string
}

interface ItemAuditoriaGuilda {
  usuario_curto: string
  xp_hoje: number
  episodios_hoje: number
  xp_total: number
  nivel: number
  rank: string
  alerta: string
}

interface RespostaAdminGuilda {
  economia: EconomiaGuilda
  ranks: FaixaRank[]
  insignias: InsigniaConfigAdmin[]
  distribuicao_ranks: Record<string, number>
  auditoria: ItemAuditoriaGuilda[]
}

const REGRAS_DISPONIVEIS = [
  { valor: 'madrugadas', rotulo: 'Madrugadas (00h–05h)' },
  { valor: 'curados_vistos', rotulo: 'Obras curadas no deck' },
  { valor: 'maior_streak', rotulo: 'Maior streak (dias)' },
  { valor: 'cedo_marcados', rotulo: 'Episódios no lançamento' },
  { valor: 'genero_n3', rotulo: 'Gêneros em nível N3+' },
  { valor: 'rank_s', rotulo: 'Nível mínimo alcançado' },
]

export default function AbaGuilda() {
  const { showToast } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [economia, setEconomia] = useState<EconomiaGuilda>({
    ativo: true,
    xp_base_episodio: 25,
    bonus_cedo: 10,
    fator_3_a_5: 0.75,
    fator_6_mais: 0.5,
    teto_diario: 180,
    evento_inicio: '',
    evento_fim: '',
    evento_multiplicador: 2,
  })
  const [ranks, setRanks] = useState<FaixaRank[]>([])
  const [insignias, setInsignias] = useState<InsigniaConfigAdmin[]>([])
  const [distribuicao, setDistribuicao] = useState<Record<string, number>>({})
  const [auditoria, setAuditoria] = useState<ItemAuditoriaGuilda[]>([])

  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch('/api/admin/guilda', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) throw new Error()
        const json = (await res.json()) as RespostaAdminGuilda
        if (!ativo) return
        setEconomia(json.economia)
        setRanks(json.ranks || [])
        setInsignias(json.insignias || [])
        setDistribuicao(json.distribuicao_ranks || {})
        setAuditoria(json.auditoria || [])
      } catch {
        if (ativo) showToast('Não foi possível carregar as configurações da Guilda.', 'error')
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [showToast])

  const salvarTudo = async () => {
    setSalvando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada.')
      const res = await fetch('/api/admin/guilda', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ economia, ranks, insignias }),
      })
      if (!res.ok) {
        const msg = await res.text()
        showToast(msg || 'Erro ao salvar configurações da Guilda.', 'error')
        return
      }
      const salvo = (await res.json()) as {
        economia: EconomiaGuilda
        ranks: FaixaRank[]
        insignias: InsigniaConfigAdmin[]
      }
      setEconomia(salvo.economia)
      setRanks(salvo.ranks)
      setInsignias(salvo.insignias)
      showToast('Configurações da Guilda salvas!', 'success')
    } catch {
      showToast('Erro de rede ao salvar configurações da Guilda.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const adicionarInsignia = () => {
    setInsignias((prev) => [
      ...prev,
      {
        id: `carta_${prev.length + 1}`,
        icone: '✨',
        nome: 'Nova Insígnia',
        descricao: 'Requisito da conquista',
        regra: 'curados_vistos',
        meta: 10,
        estilo: 'foil',
      },
    ])
  }

  const removerInsignia = (idx: number) => {
    if (insignias.length <= 1) {
      showToast('Mantenha pelo menos 1 insígnia no catálogo.', 'error')
      return
    }
    setInsignias((prev) => prev.filter((_, i) => i !== idx))
  }

  if (carregando) {
    return <div className="p-8 text-center font-mono text-sm text-muted">Carregando aba Guilda...</div>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
      <div className="flex flex-col gap-6">
        {/* ECONOMIA DE XP + KILL SWITCH */}
        <section className="p-5 sm:p-6 rounded-2xl bg-panel border border-line">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">
                // economia de xp · app_settings
              </p>
              <h2 className="font-anton text-xl uppercase m-0 mt-0.5">Pesos, Teto Diário e Eventos</h2>
            </div>

            <button
              type="button"
              onClick={() => setEconomia((prev) => ({ ...prev, ativo: !prev.ativo }))}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-xs font-bold border cursor-pointer transition-colors ${
                economia.ativo
                  ? 'bg-green/12 border-green/40 text-green'
                  : 'bg-coral/15 border-coral/40 text-coral'
              }`}
            >
              <Power size={13} />
              {economia.ativo ? 'XP ATIVO' : 'XP PAUSADO (KILL SWITCH)'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-bold text-muted">
              XP base por episódio
              <input
                type="number"
                min={1}
                max={500}
                value={economia.xp_base_episodio}
                onChange={(e) =>
                  setEconomia((prev) => ({ ...prev, xp_base_episodio: Number(e.target.value) }))
                }
                className="px-3 py-2 rounded-xl bg-panel-2 border border-line text-text font-mono text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-muted">
              Bônus cedo (até 7d)
              <input
                type="number"
                min={0}
                max={500}
                value={economia.bonus_cedo}
                onChange={(e) =>
                  setEconomia((prev) => ({ ...prev, bonus_cedo: Number(e.target.value) }))
                }
                className="px-3 py-2 rounded-xl bg-panel-2 border border-line text-text font-mono text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-muted">
              Teto diário de XP
              <input
                type="number"
                min={10}
                max={5000}
                value={economia.teto_diario}
                onChange={(e) =>
                  setEconomia((prev) => ({ ...prev, teto_diario: Number(e.target.value) }))
                }
                className="px-3 py-2 rounded-xl bg-panel-2 border border-line text-text font-mono text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-muted">
              Fator 3º ao 5º ep (0–1)
              <input
                type="number"
                step="0.05"
                min={0.05}
                max={1}
                value={economia.fator_3_a_5}
                onChange={(e) =>
                  setEconomia((prev) => ({ ...prev, fator_3_a_5: Number(e.target.value) }))
                }
                className="px-3 py-2 rounded-xl bg-panel-2 border border-line text-text font-mono text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-muted">
              Fator 6º+ ep (0–1)
              <input
                type="number"
                step="0.05"
                min={0.05}
                max={1}
                value={economia.fator_6_mais}
                onChange={(e) =>
                  setEconomia((prev) => ({ ...prev, fator_6_mais: Number(e.target.value) }))
                }
                className="px-3 py-2 rounded-xl bg-panel-2 border border-line text-text font-mono text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-muted">
              Multiplicador de evento
              <input
                type="number"
                step="0.5"
                min={1}
                max={5}
                value={economia.evento_multiplicador}
                onChange={(e) =>
                  setEconomia((prev) => ({ ...prev, evento_multiplicador: Number(e.target.value) }))
                }
                className="px-3 py-2 rounded-xl bg-panel-2 border border-line text-text font-mono text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-line">
            <label className="flex flex-col gap-1.5 text-xs font-bold text-muted">
              Início do evento XP (RFC3339, vazio = desligado)
              <input
                type="text"
                placeholder="2026-11-15T00:00:00Z"
                value={economia.evento_inicio}
                onChange={(e) => setEconomia((prev) => ({ ...prev, evento_inicio: e.target.value }))}
                className="px-3 py-2 rounded-xl bg-panel-2 border border-line text-text font-mono text-xs"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-muted">
              Fim do evento XP (RFC3339, fecha sozinho)
              <input
                type="text"
                placeholder="2026-11-18T00:00:00Z"
                value={economia.evento_fim}
                onChange={(e) => setEconomia((prev) => ({ ...prev, evento_fim: e.target.value }))}
                className="px-3 py-2 rounded-xl bg-panel-2 border border-line text-text font-mono text-xs"
              />
            </label>
          </div>

          <p className="font-mono text-[10.5px] text-muted-2 mt-3 mb-0">
            Mudar peso <b className="text-text">nunca é retroativo</b>: o <code className="text-holo-3">xp_ledger</code> guarda quanto cada episódio valeu na hora em que foi marcado.
          </p>
        </section>

        {/* FAIXAS F → SS */}
        <section className="p-5 sm:p-6 rounded-2xl bg-panel border border-line">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">
                // escada de classes
              </p>
              <h2 className="font-anton text-xl uppercase m-0 mt-0.5">Faixas F → SS</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-muted">
              <Users size={13} /> Distribuição atual
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {ranks.map((r, idx) => (
              <div
                key={`${r.rank}-${idx}`}
                className="grid grid-cols-[48px_minmax(0,1fr)_76px_52px] sm:grid-cols-[64px_minmax(0,1fr)_96px_80px] gap-1.5 sm:gap-2.5 items-center bg-panel-2 border border-line rounded-xl p-2 sm:p-2.5"
              >
                <input
                  type="text"
                  maxLength={4}
                  value={r.rank}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase()
                    setRanks((prev) => prev.map((item, i) => (i === idx ? { ...item, rank: val } : item)))
                  }}
                  className="min-w-0 w-full px-1 sm:px-2.5 py-1.5 rounded-lg bg-panel border border-line font-anton text-center text-sm text-text"
                />
                <input
                  type="text"
                  maxLength={40}
                  value={r.titulo}
                  onChange={(e) => {
                    const val = e.target.value
                    setRanks((prev) => prev.map((item, i) => (i === idx ? { ...item, titulo: val } : item)))
                  }}
                  className="min-w-0 w-full px-3 py-1.5 rounded-lg bg-panel border border-line text-xs font-bold text-text"
                />
                <div className="flex items-center gap-1 font-mono text-[11px] text-muted">
                  <span>Nv</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    disabled={idx === 0}
                    value={r.nivel_minimo}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setRanks((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, nivel_minimo: val } : item)),
                      )
                    }}
                    className="w-12 sm:w-16 px-1.5 sm:px-2 py-1.5 rounded-lg bg-panel border border-line font-mono text-xs text-text disabled:opacity-50"
                  />
                </div>
                <span className="font-mono text-[11px] text-right text-holo-3 pr-1">
                  {distribuicao[r.rank] || 0} usu.
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* INSÍGNIAS */}
        <section className="p-5 sm:p-6 rounded-2xl bg-panel border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">
                // cartas colecionáveis
              </p>
              <h2 className="font-anton text-xl uppercase m-0 mt-0.5">Catálogo de Insígnias</h2>
            </div>

            <button
              type="button"
              onClick={adicionarInsignia}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-panel-2 border border-line hover:border-holo-2 text-xs font-bold text-text cursor-pointer"
            >
              <Plus size={13} /> Nova Insígnia
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {insignias.map((ins, idx) => (
              <div
                key={`${ins.id}-${idx}`}
                className="p-3.5 rounded-xl bg-panel-2 border border-line flex flex-col gap-2.5"
              >
                <div className="grid grid-cols-[52px_120px_1fr_auto] gap-2 items-center">
                  <input
                    type="text"
                    maxLength={4}
                    value={ins.icone}
                    onChange={(e) => {
                      const val = e.target.value
                      setInsignias((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, icone: val } : item)),
                      )
                    }}
                    className="px-2 py-1.5 rounded-lg bg-panel border border-line text-center text-base"
                    title="Emoji/Ícone"
                  />
                  <input
                    type="text"
                    maxLength={24}
                    value={ins.id}
                    onChange={(e) => {
                      const val = e.target.value
                      setInsignias((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, id: val } : item)),
                      )
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-panel border border-line font-mono text-xs text-muted"
                    placeholder="id_unico"
                  />
                  <input
                    type="text"
                    maxLength={40}
                    value={ins.nome}
                    onChange={(e) => {
                      const val = e.target.value
                      setInsignias((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, nome: val } : item)),
                      )
                    }}
                    className="min-w-0 w-full px-3 py-1.5 rounded-lg bg-panel border border-line text-xs font-bold text-text"
                    placeholder="Nome da carta"
                  />
                  <button
                    type="button"
                    onClick={() => removerInsignia(idx)}
                    className="p-1.5 rounded-lg text-muted hover:text-coral hover:bg-coral/10 cursor-pointer"
                    title="Remover insígnia"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_170px_90px_90px] gap-2 items-center">
                  <input
                    type="text"
                    maxLength={80}
                    value={ins.descricao}
                    onChange={(e) => {
                      const val = e.target.value
                      setInsignias((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, descricao: val } : item)),
                      )
                    }}
                    className="px-3 py-1.5 rounded-lg bg-panel border border-line text-xs text-muted"
                    placeholder="Descrição curta do requisito"
                  />

                  <select
                    value={ins.regra}
                    onChange={(e) => {
                      const val = e.target.value
                      setInsignias((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, regra: val } : item)),
                      )
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-panel border border-line text-xs text-text"
                  >
                    {REGRAS_DISPONIVEIS.map((r) => (
                      <option key={r.valor} value={r.valor}>
                        {r.rotulo}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={ins.meta}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setInsignias((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, meta: val } : item)),
                      )
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-panel border border-line font-mono text-xs text-text"
                    title="Meta numérica"
                  />

                  <select
                    value={ins.estilo}
                    onChange={(e) => {
                      const val = e.target.value
                      setInsignias((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, estilo: val } : item)),
                      )
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-panel border border-line font-mono text-xs text-text"
                  >
                    <option value="foil">Foil Violeta</option>
                    <option value="foil2">Foil Ouro</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* COLUNA LATERAL: BOTÃO SALVAR + AUDITORIA */}
      <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
        <section className="p-5 rounded-2xl bg-panel border border-line">
          <div className="flex items-center gap-2 mb-2">
            <Award size={16} className="text-holo-1" />
            <h3 className="font-anton text-lg uppercase m-0">Publicar Calibração</h3>
          </div>
          <p className="text-xs text-muted leading-relaxed mb-4">
            As alterações de pesos, faixas e insígnias entram em vigor imediatamente sem reiniciar o
            servidor.
          </p>
          <button
            type="button"
            disabled={salvando}
            onClick={salvarTudo}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full font-extrabold text-xs text-void bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 hover:opacity-95 disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} />
            {salvando ? 'Salvando...' : 'Salvar configurações da Guilda'}
          </button>
        </section>

        <section className="p-5 rounded-2xl bg-panel border border-line">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={16} className="text-gold" />
            <div>
              <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">
                // auditoria de ritmo
              </p>
              <h3 className="font-anton text-lg uppercase m-0">Atividade no Ledger</h3>
            </div>
          </div>

          {auditoria.length === 0 ? (
            <p className="text-xs text-muted m-0">Nenhuma entrada registrada no xp_ledger ainda.</p>
          ) : (
            <div className="divide-y divide-line">
              {auditoria.map((item) => (
                <div
                  key={item.usuario_curto}
                  className="py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-text">
                      #{item.usuario_curto} ·{' '}
                      <span className="text-holo-2">
                        Rank {item.rank} (Nv {item.nivel})
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-2 mt-0.5">
                      Hoje: {item.xp_hoje}/{economia.teto_diario} XP ({item.episodios_hoje} eps) · Total:{' '}
                      {item.xp_total} XP
                    </div>
                  </div>
                  {item.alerta && (
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        item.alerta.includes('teto')
                          ? 'bg-gold/15 border border-gold/40 text-gold'
                          : 'bg-holo-3/15 border border-holo-3/40 text-holo-3'
                      }`}
                    >
                      {item.alerta}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  )
}
