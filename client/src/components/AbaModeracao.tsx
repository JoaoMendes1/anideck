// client/src/components/AbaModeracao.tsx
// Painel Admin › Comunidade › Moderação: fila de comentários denunciados, resumo da
// atividade e regras da Mana, da Vitalidade e do Modo Descanso.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, EyeOff, Eye, Trash2, Save, ShieldCheck, Flag, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { MOTIVOS_DENUNCIA, tempoRelativo, type RegrasComunidade } from '../lib/comunidade'

interface ItemModeracao {
  comentario: {
    id: string
    mal_id: number
    episode_number: number
    texto: string
    oculto: boolean
    created_at: string
  }
  titulo_anime: string
  autor: { handle: string; nome: string }
  denuncias: number
  motivos: Record<string, number>
  detalhes: string[]
  ultima_em: string
}

interface Resumo {
  perfis: number
  comentarios_semana: number
  reacoes_semana: number
  denuncias_pendentes: number
}

interface DenunciaCla {
  id: string
  cla_id: string
  cla_nome: string
  cla_tag: string
  denunciante_user_id: string
  denunciante_nome?: string
  denunciante_handle?: string
  motivo: string
  status: string
  criado_em: string
}

type Acao = 'ocultar' | 'reexibir' | 'apagar' | 'dispensar'

const ROTULO_MOTIVO: Record<string, string> = Object.fromEntries(MOTIVOS_DENUNCIA.map(m => [m.id, m.rotulo]))

const CAMPOS_REGRAS: { chave: keyof RegrasComunidade; rotulo: string; ajuda: string }[] = [
  { chave: 'mp_max', rotulo: 'Mana máxima', ajuda: 'Teto da barra azul.' },
  { chave: 'mp_regen_dia', rotulo: 'Recarga por dia', ajuda: 'Contínua ao longo do dia.' },
  { chave: 'mp_custo_comentario', rotulo: 'Custo do comentário', ajuda: '0 desliga o custo.' },
  { chave: 'hp_janela_dias', rotulo: 'Janela da Vitalidade (dias)', ajuda: 'Quantos dias para trás contam.' },
  { chave: 'hp_dias_para_cheio', rotulo: 'Dias ativos para encher', ajuda: 'Dentro da janela.' },
  { chave: 'hp_piso', rotulo: 'Piso da Vitalidade', ajuda: 'Nunca cai abaixo disso.' },
  { chave: 'descanso_max_dias', rotulo: 'Modo Descanso (máx. dias)', ajuda: 'Uma vez a cada 30 dias.' },
]

async function cabecalho(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return session ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export default function AbaModeracao() {
  const { showToast } = useToast()
  const [fila, setFila] = useState<ItemModeracao[] | null>(null)
  const [denunciasClas, setDenunciasClas] = useState<DenunciaCla[]>([])
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [regras, setRegras] = useState<RegrasComunidade | null>(null)
  const [salvandoRegras, setSalvandoRegras] = useState(false)
  const [fechandoDesafios, setFechandoDesafios] = useState(false)
  const [fechandoTemporada, setFechandoTemporada] = useState(false)
  const [agora] = useState(() => Date.now())

  const carregar = useCallback(async () => {
    try {
      const auth = await cabecalho()
      const [resFila, resRegras, resClas] = await Promise.all([
        fetch('/api/admin/moderacao', { headers: auth }),
        fetch('/api/admin/comunidade/regras', { headers: auth }),
        fetch('/api/admin/clas/denuncias', { headers: auth }),
      ])
      if (!resFila.ok) throw new Error((await resFila.text()).trim() || 'Falha ao carregar a fila.')
      const dados = (await resFila.json()) as { fila: ItemModeracao[]; resumo: Resumo }
      setFila(dados.fila)
      setResumo(dados.resumo)
      if (resRegras.ok) setRegras((await resRegras.json()) as RegrasComunidade)
      if (resClas.ok) setDenunciasClas(await resClas.json())
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar a fila.')
    }
  }, [])

  const dissolverCla = async (claId: string, motivo: string) => {
    if (!confirm('Deseja realmente dissolver este clã? Todos os membros serão removidos e o clã será desativado.')) return
    try {
      const auth = await cabecalho()
      const res = await fetch(`/api/admin/clas/${claId}/dissolver`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      })
      if (!res.ok) throw new Error('Falha ao dissolver clã')
      showToast('Clã dissolvido com sucesso.')
      setDenunciasClas(d => d.filter(item => item.cla_id !== claId))
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erro ao dissolver clã.', 'error')
    }
  }

  const renomearCla = async (claId: string) => {
    const novoNome = prompt('Digite o novo nome para o clã:')
    if (!novoNome) return
    const novaTag = prompt('Digite a nova tag (2 a 4 letras):')
    if (!novaTag) return

    try {
      const auth = await cabecalho()
      const res = await fetch(`/api/admin/clas/${claId}/renomear`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ novo_nome: novoNome.trim(), nova_tag: novaTag.trim().toUpperCase() }),
      })
      if (!res.ok) throw new Error('Falha ao renomear clã')
      showToast('Clã renomeado com sucesso.')
      setDenunciasClas(d => d.filter(item => item.cla_id !== claId))
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erro ao renomear clã.', 'error')
    }
  }

  useEffect(() => {
    carregar()
  }, [carregar])

  const decidir = async (item: ItemModeracao, acao: Acao) => {
    setOcupado(item.comentario.id)
    try {
      const res = await fetch(`/api/admin/moderacao/${item.comentario.id}`, {
        method: 'POST',
        headers: { ...(await cabecalho()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      })
      if (!res.ok) throw new Error((await res.text()).trim())
      setFila(f => (f ?? []).filter(i => i.comentario.id !== item.comentario.id))
      setResumo(r => (r ? { ...r, denuncias_pendentes: Math.max(0, r.denuncias_pendentes - item.denuncias) } : r))
      const mensagens: Record<Acao, string> = {
        ocultar: 'Comentário ocultado.',
        reexibir: 'Comentário visível de novo.',
        apagar: 'Comentário apagado.',
        dispensar: 'Denúncias dispensadas.',
      }
      showToast(mensagens[acao])
    } catch (e) {
      showToast(e instanceof Error && e.message ? e.message : 'Não foi possível aplicar.', 'error')
    } finally {
      setOcupado(null)
    }
  }

  const salvarRegras = async () => {
    if (!regras) return
    setSalvandoRegras(true)
    try {
      const res = await fetch('/api/admin/comunidade/regras', {
        method: 'PUT',
        headers: { ...(await cabecalho()), 'Content-Type': 'application/json' },
        body: JSON.stringify(regras),
      })
      if (!res.ok) throw new Error((await res.text()).trim())
      setRegras((await res.json()) as RegrasComunidade)
      showToast('Regras da comunidade salvas.')
    } catch (e) {
      showToast(e instanceof Error && e.message ? e.message : 'Não foi possível salvar.', 'error')
    } finally {
      setSalvandoRegras(false)
    }
  }

  const fecharDesafiosSemana = async () => {
    if (!confirm('Deseja consolidar e fechar a semana dos desafios de clã agora, distribuindo as recompensas devidas?')) return
    setFechandoDesafios(true)
    try {
      const auth = await cabecalho()
      const res = await fetch('/api/admin/clas/desafios/fechar-semana', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.erro || json.message || 'Falha ao fechar desafios')
      showToast(`Semana fechada! ${json.membros_pagos} membros receberam recompensas (${json.anicoins_distribuidos} ₳ distribuídos).`, 'success')
      carregar()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Não foi possível fechar os desafios.', 'error')
    } finally {
      setFechandoDesafios(false)
    }
  }

  const fecharTemporadaClas = async () => {
    if (!confirm('Deseja consolidar e fechar a temporada da Liga de Clãs agora? Cosméticos exclusivos e AniCoins serão concedidos aos membros dos clãs no Top 3.')) return
    setFechandoTemporada(true)
    try {
      const auth = await cabecalho()
      const res = await fetch('/api/admin/clas/temporada/fechar', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.erro || json.message || 'Falha ao fechar temporada de clãs')
      showToast(`Temporada fechada! ${json.membros_premiados} membros premiados (${json.anicoins_distribuidos} ₳ distribuídos).`, 'success')
      carregar()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Não foi possível fechar a temporada de clãs.', 'error')
    } finally {
      setFechandoTemporada(false)
    }
  }

  if (erro) {
    return (
      <div className="p-5 rounded-2xl bg-panel border border-coral/40 text-sm">
        <p className="font-bold text-coral m-0">Moderação indisponível</p>
        <p className="text-muted mt-1 mb-0">{erro} Confira se o sql/041 já foi aplicado no Supabase.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { rotulo: 'Perfis criados', valor: resumo?.perfis },
          { rotulo: 'Comentários (7 dias)', valor: resumo?.comentarios_semana },
          { rotulo: 'Reações (7 dias)', valor: resumo?.reacoes_semana },
          { rotulo: 'Denúncias abertas', valor: resumo?.denuncias_pendentes, alerta: (resumo?.denuncias_pendentes ?? 0) > 0 },
        ].map(c => (
          <div key={c.rotulo} className={`p-4 rounded-2xl bg-panel border ${c.alerta ? 'border-coral/50' : 'border-line'}`}>
            <div className="font-mono text-[10px] text-muted-2 uppercase tracking-wider">{c.rotulo}</div>
            <div className={`font-anton text-2xl mt-1 ${c.alerta ? 'text-coral' : 'text-text'}`}>{c.valor ?? '—'}</div>
          </div>
        ))}
      </div>

      <section className="p-5 rounded-2xl bg-panel border border-line min-w-0">
        <h2 className="font-anton text-lg uppercase m-0 mb-1 flex items-center gap-2">
          <Flag size={16} className="text-coral" aria-hidden /> Fila de denúncias
        </h2>
        <p className="text-[12.5px] text-muted mt-0 mb-4">
          Ocultar esconde o comentário de todos, menos do autor. Apagar remove de vez. Dispensar fecha as denúncias e mantém o comentário.
        </p>

        {fila === null ? (
          <div className="h-24 rounded-xl bg-panel-2 animate-pulse" />
        ) : fila.length === 0 ? (
          <div className="p-6 rounded-xl bg-panel-2 border border-line text-center">
            <ShieldCheck size={22} className="mx-auto text-green mb-2" aria-hidden />
            <p className="text-sm text-muted m-0">Nenhuma denúncia aberta. A comunidade está em paz.</p>
          </div>
        ) : (
          <ul className="list-none m-0 p-0 space-y-3">
            {fila.map(item => (
              <li key={item.comentario.id} className="p-4 rounded-xl bg-panel-2 border border-line min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-coral/15 border border-coral/40 text-coral font-mono text-[10.5px] font-bold">
                    {item.denuncias} {item.denuncias === 1 ? 'denúncia' : 'denúncias'}
                  </span>
                  {Object.entries(item.motivos).map(([m, n]) => (
                    <span key={m} className="font-mono text-[10.5px] text-muted">
                      {ROTULO_MOTIVO[m] ?? m}
                      {n > 1 ? ` ×${n}` : ''}
                    </span>
                  ))}
                  <span className="font-mono text-[10.5px] text-muted-2">· última {tempoRelativo(item.ultima_em, agora)}</span>
                </div>
                <p className="text-[14px] text-text whitespace-pre-wrap break-words m-0">{item.comentario.texto}</p>
                <p className="font-mono text-[10.5px] text-muted-2 mt-2 mb-0 break-words">
                  {item.autor.handle ? `@${item.autor.handle}` : item.autor.nome} em{' '}
                  <Link to={`/anime/${item.comentario.mal_id}#conversa`} className="text-holo-3 hover:underline">
                    {item.titulo_anime || `anime ${item.comentario.mal_id}`} · ep {item.comentario.episode_number}
                  </Link>
                  {item.comentario.oculto && <span className="text-coral"> · já oculto</span>}
                </p>
                {item.detalhes.length > 0 && (
                  <ul className="mt-2 mb-0 pl-4 text-[12px] text-muted">
                    {item.detalhes.map((d, i) => (
                      <li key={i} className="break-words">“{d}”</li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {item.comentario.oculto ? (
                    <button type="button" disabled={ocupado === item.comentario.id} onClick={() => decidir(item, 'reexibir')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-[12px] font-bold text-text hover:border-holo-3 cursor-pointer disabled:opacity-50">
                      <Eye size={13} aria-hidden /> Reexibir
                    </button>
                  ) : (
                    <button type="button" disabled={ocupado === item.comentario.id} onClick={() => decidir(item, 'ocultar')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/15 border border-gold/40 text-[12px] font-bold text-gold cursor-pointer disabled:opacity-50">
                      <EyeOff size={13} aria-hidden /> Ocultar
                    </button>
                  )}
                  <button type="button" disabled={ocupado === item.comentario.id} onClick={() => decidir(item, 'apagar')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coral/15 border border-coral/40 text-[12px] font-bold text-coral cursor-pointer disabled:opacity-50">
                    <Trash2 size={13} aria-hidden /> Apagar
                  </button>
                  <button type="button" disabled={ocupado === item.comentario.id} onClick={() => decidir(item, 'dispensar')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-[12px] font-bold text-muted hover:text-text cursor-pointer disabled:opacity-50">
                    <Check size={13} aria-hidden /> Dispensar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="p-5 rounded-2xl bg-panel border border-line min-w-0">
        <h2 className="font-anton text-lg uppercase m-0 mb-1">Mana, Vitalidade e descanso</h2>
        <p className="text-[12.5px] text-muted mt-0 mb-4">
          O banco lê estes números na hora de cobrar a Mana: a mudança vale a partir do próximo comentário. A Vitalidade nunca altera XP nem rank.
        </p>
        {regras === null ? (
          <div className="h-32 rounded-xl bg-panel-2 animate-pulse" />
        ) : (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {CAMPOS_REGRAS.map(c => (
                <label key={c.chave} className="block p-3 rounded-xl bg-panel-2 border border-line min-w-0">
                  <span className="block text-[12px] font-bold text-text">{c.rotulo}</span>
                  <span className="block text-[11px] text-muted-2 mb-2">{c.ajuda}</span>
                  <input
                    type="number"
                    min={0}
                    value={regras[c.chave]}
                    onChange={e => setRegras({ ...regras, [c.chave]: Number(e.target.value) })}
                    className="w-full min-w-0 bg-panel border border-line rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-holo-3"
                  />
                </label>
              ))}
            </div>
            <button type="button" onClick={salvarRegras} disabled={salvandoRegras} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-holo-1 to-holo-2 text-void text-sm font-extrabold cursor-pointer disabled:opacity-50">
              <Save size={14} aria-hidden /> {salvandoRegras ? 'Salvando…' : 'Salvar regras'}
            </button>
          </>
        )}
      </section>

      {/* MODERAÇÃO DE CLÃS (FASE 17, #180, #181) */}
      <section className="p-5 rounded-2xl bg-panel border border-line min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <h2 className="font-anton text-lg uppercase m-0">Clãs & Desafios</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-panel-2 border border-line font-mono font-bold text-muted">
              {denunciasClas.length} pendente(s)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fecharDesafiosSemana}
              disabled={fechandoDesafios}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-holo-2/15 border border-holo-2/35 text-holo-3 hover:bg-holo-2/25 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              title="Consolida metas atingidas e credita recompensas de AniCoins aos membros"
            >
              <ShieldCheck size={14} />
              <span>{fechandoDesafios ? 'Fechando...' : 'Fechar Semana dos Desafios'}</span>
            </button>
            <button
              type="button"
              onClick={fecharTemporadaClas}
              disabled={fechandoTemporada}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gold/15 border border-gold/40 text-gold hover:bg-gold/25 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              title="Consolida a pontuação da temporada, premia o Top 3 e abre a nova temporada"
            >
              <Trophy size={14} />
              <span>{fechandoTemporada ? 'Fechando...' : 'Fechar Temporada da Liga'}</span>
            </button>
          </div>
        </div>
        <p className="text-[12.5px] text-muted mt-0 mb-4">
          Clãs denunciados por nome impróprio, tag inadequada ou manifestos abusivos. Renomeie o clã ou dissolva o grupo.
        </p>

        {denunciasClas.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-panel-2/50 border border-line text-sm text-muted">
            Nenhuma denúncia de clã pendente no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {denunciasClas.map((d) => (
              <div key={d.id} className="p-4 rounded-xl bg-panel-2 border border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-holo-3">[{d.cla_tag}]</span>
                    <strong className="text-sm">{d.cla_nome}</strong>
                    <span className="text-xs text-muted">
                      · denunciado por {d.denunciante_nome ? `${d.denunciante_nome} (@${d.denunciante_handle})` : d.denunciante_user_id}
                    </span>
                  </div>
                  <p className="text-xs text-text/80 mt-1.5 p-2 rounded-lg bg-void border border-line/60">
                    <strong>Motivo:</strong> {d.motivo}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => renomearCla(d.cla_id)}
                    className="px-3 py-1.5 rounded-lg bg-panel border border-line hover:border-holo-3 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    onClick={() => dissolverCla(d.cla_id, d.motivo)}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-void text-xs font-bold transition-colors cursor-pointer"
                  >
                    Dissolver Clã
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
