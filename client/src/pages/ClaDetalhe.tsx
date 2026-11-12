// client/src/pages/ClaDetalhe.tsx
// Página de detalhes de um Clã (/clas/:tag): membros, hierarquia, convites e gestão (Fase 17, #180).
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Shield,
  Globe,
  Lock,
  Crown,
  Swords,
  UserPlus,
  LogOut,
  Flag,
  UserX,
  ArrowLeft,
  Calendar,
  X,
  AlertTriangle,
} from 'lucide-react'
import { useSessao } from '../contexts/SessaoContext'
import { useToast } from '../contexts/ToastContext'
import CardDesafioCla from '../components/clas/CardDesafioCla'
import {
  obterClaPorTag,
  obterMeuCla,
  entrarCla,
  sairCla,
  expulsarMembro,
  transferirLideranca,
  alterarPapel,
  convidarMembro,
  denunciarCla,
  EMBLEMAS_CLA,
  renderIconeEmblema,
  type ClaDetalhe as IClaDetalhe,
  type ClaMembro,
  type MeuClaData
} from '../lib/clas'

export default function ClaDetalhe() {
  const { tag } = useParams<{ tag: string }>()
  const { session } = useSessao()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [cla, setCla] = useState<IClaDetalhe | null>(null)
  const [meuCla, setMeuCla] = useState<MeuClaData | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Modais de ações
  const [modalConvidar, setModalConvidar] = useState(false)
  const [convidadoUserId, setConvidadoUserId] = useState('')
  const [enviandoConvite, setEnviandoConvite] = useState(false)

  const [modalSair, setModalSair] = useState(false)
  const [saindo, setSaindo] = useState(false)

  const [modalDenunciar, setModalDenunciar] = useState(false)
  const [motivoDenuncia, setMotivoDenuncia] = useState('')
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false)

  const [membroSelecionado, setMembroSelecionado] = useState<ClaMembro | null>(null)
  const [modalAcaoMembro, setModalAcaoMembro] = useState(false)

  const carregarDados = useCallback(async () => {
    if (!tag) return
    try {
      setCarregando(true)
      const [detalhe, meu] = await Promise.all([
        obterClaPorTag(tag),
        session ? obterMeuCla().catch(() => null) : Promise.resolve(null),
      ])
      setCla(detalhe)
      if (meu) setMeuCla(meu)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Clã não encontrado.')
      navigate('/clas')
    } finally {
      setCarregando(false)
    }
  }, [tag, session, toast, navigate])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  if (carregando) {
    return (
      <div className="min-h-screen bg-void text-text pt-28 px-4 max-w-5xl mx-auto flex flex-col gap-6">
        <div className="h-48 rounded-3xl bg-panel/50 border border-line animate-pulse" />
        <div className="h-96 rounded-3xl bg-panel/30 border border-line animate-pulse" />
      </div>
    )
  }

  if (!cla) return null

  const conf = EMBLEMAS_CLA[cla.emblema] || EMBLEMAS_CLA.padrao
  const souMembro = session && meuCla?.tem_cla && meuCla.tag === cla.tag
  const souLider = souMembro && meuCla?.meu_papel === 'lider'
  const souVice = souMembro && meuCla?.meu_papel === 'vice'
  const souLideranca = souLider || souVice
  const podeEntrar = session && !meuCla?.tem_cla && cla.tipo === 'aberto' && cla.total_membros < 30

  const handleEntrar = async () => {
    try {
      await entrarCla(cla.id)
      toast.success(`Você entrou no clã [${cla.tag}]!`)
      await carregarDados()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Falha ao entrar no clã.')
    }
  }

  const handleSair = async () => {
    setSaindo(true)
    try {
      await sairCla()
      toast.success('Você saiu do clã.')
      setModalSair(false)
      navigate('/clas')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao sair do clã.')
    } finally {
      setSaindo(false)
    }
  }

  const handleConvidar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!convidadoUserId.trim()) return
    setEnviandoConvite(true)
    try {
      await convidarMembro(cla.id, convidadoUserId.trim())
      toast.success('Convite enviado com sucesso!')
      setModalConvidar(false)
      setConvidadoUserId('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar convite.')
    } finally {
      setEnviandoConvite(false)
    }
  }

  const handleDenunciar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motivoDenuncia.trim()) return
    setEnviandoDenuncia(true)
    try {
      await denunciarCla(cla.id, motivoDenuncia.trim())
      toast.success('Denúncia registrada para análise da moderação.')
      setModalDenunciar(false)
      setMotivoDenuncia('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Falha ao registrar denúncia.')
    } finally {
      setEnviandoDenuncia(false)
    }
  }

  const handleExpulsar = async (targetUser: ClaMembro) => {
    if (!confirm(`Deseja realmente expulsar ${targetUser.nome} (@${targetUser.handle}) do clã?`)) return
    try {
      await expulsarMembro(cla.id, targetUser.user_id)
      toast.success(`${targetUser.nome} foi removido do clã.`)
      setModalAcaoMembro(false)
      await carregarDados()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao expulsar membro.')
    }
  }

  const handleTransferirLideranca = async (targetUser: ClaMembro) => {
    if (!confirm(`Tem certeza que deseja transferir a liderança para ${targetUser.nome}? Você passará a ser vice-líder.`)) return
    try {
      await transferirLideranca(cla.id, targetUser.user_id)
      toast.success(`Liderança transferida para ${targetUser.nome}!`)
      setModalAcaoMembro(false)
      await carregarDados()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao transferir liderança.')
    }
  }

  const handleAlterarPapel = async (targetUser: ClaMembro, novoPapel: 'vice' | 'membro') => {
    try {
      await alterarPapel(cla.id, targetUser.user_id, novoPapel)
      toast.success(`Papel de ${targetUser.nome} alterado para ${novoPapel === 'vice' ? 'Vice-Líder' : 'Membro'}.`)
      setModalAcaoMembro(false)
      await carregarDados()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar papel.')
    }
  }

  return (
    <div className="min-h-screen bg-void text-text pt-24 pb-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* BOTÃO VOLTAR */}
      <Link
        to="/clas"
        className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-holo-3 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Todos os Clãs</span>
      </Link>

      {/* HEADER DO CLÃ */}
      <div className={`p-6 sm:p-10 rounded-3xl bg-gradient-to-br ${conf.classeCard} border shadow-2xl relative overflow-hidden mb-10`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-void border border-line flex items-center justify-center shrink-0 shadow-lg">
              {renderIconeEmblema(cla.emblema, 42)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-lg bg-holo-3/20 border border-holo-3/40 text-holo-3 font-mono font-black text-sm">
                  [{cla.tag}]
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-void/60 border border-line text-muted flex items-center gap-1 font-bold">
                  {cla.tipo === 'aberto' ? <Globe size={12} /> : <Lock size={12} />}
                  {cla.tipo === 'aberto' ? 'Clã Aberto' : 'Apenas por Convite'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-void/60 border border-line text-muted font-bold">
                  Nível Mín. {cla.nivel_minimo}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black">{cla.nome}</h1>
              <p className="text-xs sm:text-sm text-muted mt-2 max-w-2xl">
                {cla.descricao || 'Nenhuma descrição fornecida.'}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-muted mt-3">
                <Calendar size={13} />
                <span>Fundado em {new Date(cla.criado_em).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* ESTATÍSTICAS E AÇÕES */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-4 shrink-0">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="px-4 py-2.5 rounded-2xl bg-void/60 border border-line text-center flex-1 sm:flex-none">
                <span className="text-[10px] uppercase font-bold text-muted block">Membros</span>
                <span className="text-base font-black text-text">{cla.total_membros} / 30</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-void/60 border border-line text-center flex-1 sm:flex-none">
                <span className="text-[10px] uppercase font-bold text-muted block">XP Semana</span>
                <span className="text-base font-black text-holo-3">+{cla.xp_semana} XP</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
              {podeEntrar && (
                <button
                  type="button"
                  onClick={handleEntrar}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-holo-2 to-holo-3 text-void font-bold text-xs shadow-md hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Entrar no Clã
                </button>
              )}

              {souLideranca && (
                <button
                  type="button"
                  onClick={() => setModalConvidar(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-panel-2 border border-line hover:border-holo-3 text-xs font-bold transition-colors cursor-pointer"
                >
                  <UserPlus size={14} />
                  <span>Convidar</span>
                </button>
              )}

              {souMembro && (
                <button
                  type="button"
                  onClick={() => setModalSair(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-void text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sair</span>
                </button>
              )}

              {session && !souMembro && (
                <button
                  type="button"
                  onClick={() => setModalDenunciar(true)}
                  className="p-2.5 rounded-xl bg-void border border-line text-muted hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
                  title="Denunciar Clã"
                >
                  <Flag size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DESAFIO SEMANAL COLETIVO DO CLÃ (#181) */}
      <CardDesafioCla tag={cla.tag} claId={cla.id} souMembro={Boolean(souMembro)} />

      {/* ROSTER / LISTA DE MEMBROS */}
      <div className="p-6 sm:p-8 rounded-3xl bg-panel border border-line shadow-xl">
        <div className="flex items-center justify-between mb-6 border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-holo-3" />
            <h2 className="text-lg font-black tracking-wide">Membros do Clã ({cla.membros?.length || 0})</h2>
          </div>
          <span className="text-xs text-muted">Classificados por hierarquia e contribuição semanal</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cla.membros?.map((membro) => {
            const ehEu = session?.user?.id === membro.user_id
            const ehLiderMembro = membro.papel === 'lider'
            const ehViceMembro = membro.papel === 'vice'

            return (
              <div
                key={membro.user_id}
                className="p-4 rounded-2xl bg-void/60 border border-line flex items-center justify-between gap-4 hover:border-line-hover transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-panel-2 border border-line flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                    {membro.avatar_url ? (
                      <img src={membro.avatar_url} alt={membro.nome} className="w-full h-full object-cover" />
                    ) : (
                      membro.nome.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to={`/u/${membro.handle}`} className="font-bold text-sm hover:text-holo-3 transition-colors">
                        {membro.nome}
                      </Link>
                      {ehLiderMembro && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400">
                          <Crown size={10} /> Líder
                        </span>
                      )}
                      {ehViceMembro && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-holo-3/15 border border-holo-3/30 text-holo-3">
                          <Shield size={10} /> Vice
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                      <span>@{membro.handle}</span>
                      <span>·</span>
                      <span className="text-text font-bold">Nv. {membro.nivel}</span>
                      <span>·</span>
                      <span className="text-holo-3 font-mono font-bold">+{membro.xp_semana} XP</span>
                    </div>
                  </div>
                </div>

                {/* BOTÃO DE GESTÃO PARA QUEM É LÍDER OU VICE */}
                {souLideranca && !ehEu && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setMembroSelecionado(membro)
                        setModalAcaoMembro(true)
                      }}
                      className="px-3 py-1.5 rounded-lg bg-panel-2 border border-line hover:border-holo-3 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Gerenciar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL GESTÃO DE MEMBRO */}
      {modalAcaoMembro && membroSelecionado && (
        <div className="fixed inset-0 z-50 bg-void/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-panel border border-line shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setModalAcaoMembro(false)}
              className="absolute top-5 right-5 text-muted hover:text-text cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="font-black text-lg mb-1">{membroSelecionado.nome}</h3>
            <span className="text-xs text-muted block mb-4">@{membroSelecionado.handle} · Papel atual: {membroSelecionado.papel}</span>

            <div className="space-y-2">
              {souLider && membroSelecionado.papel === 'membro' && (
                <button
                  type="button"
                  onClick={() => handleAlterarPapel(membroSelecionado, 'vice')}
                  className="w-full py-2.5 px-4 rounded-xl bg-void border border-line hover:border-holo-3 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Promover a Vice-Líder</span>
                  <Shield size={14} className="text-holo-3" />
                </button>
              )}

              {souLider && membroSelecionado.papel === 'vice' && (
                <button
                  type="button"
                  onClick={() => handleAlterarPapel(membroSelecionado, 'membro')}
                  className="w-full py-2.5 px-4 rounded-xl bg-void border border-line hover:border-line-hover text-xs font-bold flex items-center justify-between transition-colors cursor-pointer text-muted"
                >
                  <span>Rebaixar para Membro</span>
                  <Swords size={14} />
                </button>
              )}

              {souLider && (
                <button
                  type="button"
                  onClick={() => handleTransferirLideranca(membroSelecionado)}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-void text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Transferir Liderança</span>
                  <Crown size={14} />
                </button>
              )}

              {(souLider || (souVice && membroSelecionado.papel === 'membro')) && (
                <button
                  type="button"
                  onClick={() => handleExpulsar(membroSelecionado)}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-void text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Expulsar do Clã</span>
                  <UserX size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONVIDAR MEMBRO */}
      {modalConvidar && (
        <div className="fixed inset-0 z-50 bg-void/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-panel border border-line shadow-2xl p-6 sm:p-8 relative">
            <button
              type="button"
              onClick={() => setModalConvidar(false)}
              className="absolute top-6 right-6 text-muted hover:text-text cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-black mb-1">Convidar para o Clã</h3>
            <p className="text-xs text-muted mb-4">
              Informe o UUID da conta do usuário para enviar um convite direto para o clã.
            </p>

            <form onSubmit={handleConvidar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                  ID do Usuário (UUID)
                </label>
                <input
                  type="text"
                  required
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={convidadoUserId}
                  onChange={(e) => setConvidadoUserId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-void border border-line text-xs font-mono focus:border-holo-3 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalConvidar(false)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-bold hover:bg-panel-2 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoConvite}
                  className="px-5 py-2 rounded-xl bg-holo-3 text-void font-bold text-xs hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {enviandoConvite ? 'Enviando...' : 'Enviar Convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SAIR DO CLÃ */}
      {modalSair && (
        <div className="fixed inset-0 z-50 bg-void/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-panel border border-rose-500/30 shadow-2xl p-6 sm:p-8 relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-xl font-black mb-2">Sair do Clã [{cla.tag}]?</h3>
            <p className="text-xs text-muted mb-4 leading-relaxed">
              {souLider
                ? 'Como você é o líder, ao sair a liderança será transferida automaticamente para o membro ou vice mais antigo. Se você for o único membro, o clã será desativado.'
                : 'Ao sair, você precisará aguardar o período de carência de 7 dias para entrar ou fundar um novo clã.'}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalSair(false)}
                className="px-4 py-2 rounded-xl border border-line text-xs font-bold hover:bg-panel-2 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleSair}
                disabled={saindo}
                className="px-5 py-2 rounded-xl bg-rose-500 text-void font-bold text-xs hover:bg-rose-600 cursor-pointer disabled:opacity-50"
              >
                {saindo ? 'Saindo...' : 'Confirmar Saída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DENUNCIAR CLÃ */}
      {modalDenunciar && (
        <div className="fixed inset-0 z-50 bg-void/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-panel border border-line shadow-2xl p-6 sm:p-8 relative">
            <button
              type="button"
              onClick={() => setModalDenunciar(false)}
              className="absolute top-6 right-6 text-muted hover:text-text cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-black mb-1">Denunciar Clã [{cla.tag}]</h3>
            <p className="text-xs text-muted mb-4">
              Relate nome ofensivo, manifesto inadequado ou conduta imprópria para a moderação.
            </p>

            <form onSubmit={handleDenunciar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                  Motivo da Denúncia
                </label>
                <textarea
                  required
                  rows={3}
                  value={motivoDenuncia}
                  onChange={(e) => setMotivoDenuncia(e.target.value)}
                  placeholder="Explique o motivo da denúncia..."
                  className="w-full px-4 py-2.5 rounded-xl bg-void border border-line text-xs focus:border-holo-3 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalDenunciar(false)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-bold hover:bg-panel-2 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoDenuncia}
                  className="px-5 py-2 rounded-xl bg-rose-500 text-void font-bold text-xs hover:bg-rose-600 cursor-pointer disabled:opacity-50"
                >
                  {enviandoDenuncia ? 'Enviando...' : 'Registrar Denúncia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
