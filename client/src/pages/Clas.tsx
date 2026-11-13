// client/src/pages/Clas.tsx
// Página principal de Clãs: lista de clãs, busca, convites e fundação (Fase 17, #180).
import { useState, useEffect, useCallback, useTransition } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  Plus,
  Shield,
  Zap,
  Lock,
  Globe,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react'
import { useSessao } from '../contexts/SessaoContext'
import { useToast } from '../contexts/ToastContext'
import {
  listarClas,
  obterMeuCla,
  criarCla,
  entrarCla,
  responderConvite,
  EMBLEMAS_CLA,
  renderIconeEmblema,
  type ClaSummary,
  type MeuClaData
} from '../lib/clas'

export default function Clas() {
  const { session } = useSessao()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [clas, setClas] = useState<ClaSummary[]>([])
  const [meuCla, setMeuCla] = useState<MeuClaData | null>(null)
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalCriarAberto, setModalCriarAberto] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Formulário de fundação
  const [nome, setNome] = useState('')
  const [tag, setTag] = useState('')
  const [descricao, setDescricao] = useState('')
  const [emblema, setEmblema] = useState('padrao')
  const [tipo, setTipo] = useState<'aberto' | 'convite'>('aberto')
  const [nivelMinimo, setNivelMinimo] = useState(1)
  const [criando, setCriando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true)
      const promessas: [Promise<ClaSummary[]>, Promise<MeuClaData | null>] = [
        listarClas(busca),
        session ? obterMeuCla().catch(() => null) : Promise.resolve(null),
      ]
      const [lista, meu] = await Promise.all(promessas)
      setClas(lista)
      if (meu) setMeuCla(meu)
    } catch {
      toast.error('Não foi possível carregar os clãs no momento.')
    } finally {
      setCarregando(false)
    }
  }, [busca, session, toast])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        const lista = await listarClas(busca)
        setClas(lista)
      } catch {
        toast.error('Erro ao buscar clãs.')
      }
    })
  }

  const handleEntrar = async (cla: ClaSummary) => {
    if (!session) {
      toast.info('Faça login para ingressar em um clã.')
      navigate('/login')
      return
    }

    try {
      await entrarCla(cla.id)
      toast.success(`Você entrou no clã [${cla.tag}] ${cla.nome}!`)
      await carregarDados()
      navigate(`/clas/${cla.tag}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Falha ao entrar no clã.')
    }
  }

  const handleResponderConvite = async (conviteId: string, aceitar: boolean) => {
    try {
      await responderConvite(conviteId, aceitar)
      if (aceitar) {
        toast.success('Convite aceito com sucesso! Bem-vindo ao clã.')
      } else {
        toast.info('Convite recusado.')
      }
      await carregarDados()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar convite.')
    }
  }

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroForm('')
    setCriando(true)

    try {
      const res = await criarCla({
        nome,
        tag,
        descricao,
        emblema,
        tipo,
        nivel_minimo: Number(nivelMinimo),
      })
      toast.success(`Clã [${res.tag}] fundado com sucesso!`)
      setModalCriarAberto(false)
      setNome('')
      setTag('')
      setDescricao('')
      navigate(`/clas/${res.tag}`)
    } catch (err: unknown) {
      setErroForm(err instanceof Error ? err.message : 'Erro ao criar clã.')
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="min-h-screen bg-void text-text pt-24 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-line pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-holo-3/10 border border-holo-3/30 text-holo-3 text-xs font-bold tracking-wider uppercase mb-3">
            <Users size={14} />
            <span>Comunidade Viva · Fase 17</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-anton tracking-wide">
            CLÃS <span className="text-holo">&</span> ALIANÇAS
          </h1>
          <p className="text-muted text-sm sm:text-base max-w-2xl mt-2">
            Junte-se a um grupo temático de 10 a 30 membros para acumular XP coletivo, disputar ligas semanais e enfrentar o Chefão Comunitário.
          </p>
        </div>

        {session && !meuCla?.tem_cla && (
          <button
            type="button"
            onClick={() => {
              if (meuCla && meuCla.cooldown_dias_restantes > 0) {
                toast.error(`Você deve aguardar ${meuCla.cooldown_dias_restantes} dias de carência após ter saído de um clã.`)
                return
              }
              setModalCriarAberto(true)
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-holo-2 to-holo-3 text-void font-bold shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:opacity-95 transition-all shrink-0 cursor-pointer"
          >
            <Plus size={18} />
            <span>Fundar um Clã</span>
          </button>
        )}
      </div>

      {/* SEÇÃO MEU CLÃ OU CONVITES */}
      {session && meuCla?.tem_cla && (
        <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-panel via-panel-2 to-panel border border-holo-3/30 shadow-[0_0_30px_rgba(34,211,238,0.1)] relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-holo-3/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-void border border-line flex items-center justify-center shrink-0 shadow-inner">
                {renderIconeEmblema(meuCla.emblema || 'padrao', 32)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-holo-3/20 border border-holo-3/40 text-holo-3 font-mono font-black text-xs">
                    [{meuCla.tag}]
                  </span>
                  <h2 className="text-2xl font-black">{meuCla.nome}</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-panel-2 border border-line text-muted uppercase font-bold tracking-wider">
                    {meuCla.meu_papel === 'lider' ? '👑 Líder' : meuCla.meu_papel === 'vice' ? '🛡️ Vice-Líder' : '⚔️ Membro'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted mt-1 max-w-xl line-clamp-1">
                  {meuCla.descricao || 'Sem descrição definida.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
              <div className="text-left sm:text-right px-4 py-2 rounded-xl bg-void/50 border border-line/60">
                <span className="text-[10px] uppercase font-bold text-muted block">XP Esta Semana</span>
                <span className="text-lg font-black text-holo-3">+{meuCla.xp_semana || 0} XP</span>
              </div>
              <div className="text-left sm:text-right px-4 py-2 rounded-xl bg-void/50 border border-line/60">
                <span className="text-[10px] uppercase font-bold text-muted block">Membros</span>
                <span className="text-lg font-black text-text">{meuCla.total_membros || 1} / 30</span>
              </div>
              <Link
                to={`/clas/${meuCla.tag}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-panel border border-holo-3/50 text-holo-3 hover:bg-holo-3 hover:text-void font-bold transition-all text-sm shrink-0"
              >
                <span>Acessar Clã</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* CONVITES RECEBIDOS PENDENTES */}
      {session && meuCla && !meuCla.tem_cla && meuCla.convites && meuCla.convites.length > 0 && (
        <div className="mb-10 p-6 rounded-3xl bg-panel border border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400 font-bold mb-4">
            <Sparkles size={18} />
            <span>Você tem convites de clãs pendentes!</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meuCla.convites.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl bg-void border border-line flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-panel flex items-center justify-center shrink-0">
                    {renderIconeEmblema(c.cla_emblema, 20)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-holo-3">[{c.cla_tag}]</span>
                      <span className="font-bold text-sm">{c.cla_nome}</span>
                    </div>
                    <span className="text-xs text-muted block">Convidado por {c.convidado_por_nome}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleResponderConvite(c.id, true)}
                    className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-void transition-colors cursor-pointer"
                    title="Aceitar Convite"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResponderConvite(c.id, false)}
                    className="p-2 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-void transition-colors cursor-pointer"
                    title="Recusar Convite"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COOLDOWN ATIVO AVISO */}
      {session && meuCla && !meuCla.tem_cla && meuCla.cooldown_dias_restantes > 0 && (
        <div className="mb-8 p-4 rounded-2xl bg-panel-2 border border-line text-sm text-muted flex items-center gap-3">
          <Clock size={18} className="text-amber-400 shrink-0" />
          <span>
            Período de carência ativo: você saiu de um clã recentemente e poderá ingressar ou fundar outro em{' '}
            <strong className="text-text">{meuCla.cooldown_dias_restantes} dia(s)</strong>.
          </span>
        </div>
      )}

      {/* BUSCA DE CLÃS */}
      <form onSubmit={handleBuscar} className="mb-8 relative max-w-md">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou tag [TAG]..."
          className="w-full pl-11 pr-24 py-3 rounded-2xl bg-panel border border-line text-sm placeholder:text-muted focus:outline-none focus:border-holo-3 transition-colors"
        />
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <button
          type="submit"
          disabled={isPending}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-panel-2 border border-line hover:border-holo-3 text-xs font-bold transition-colors cursor-pointer"
        >
          {isPending ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {/* LISTA DE CLÃS */}
      {carregando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-3xl bg-panel/50 border border-line animate-pulse" />
          ))}
        </div>
      ) : clas.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-panel/30 border border-line">
          <Shield size={48} className="mx-auto text-muted/40 mb-3" />
          <h3 className="text-lg font-bold">Nenhum clã encontrado</h3>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
            {busca ? 'Nenhum resultado corresponde à sua pesquisa.' : 'Seja o primeiro a fundar um clã para liderar a sua guilda!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clas.map((cla) => {
            const conf = EMBLEMAS_CLA[cla.emblema] || EMBLEMAS_CLA.padrao
            const podeEntrar = session && !meuCla?.tem_cla && cla.tipo === 'aberto' && cla.total_membros < 30

            return (
              <div
                key={cla.id}
                className={`p-6 rounded-3xl bg-gradient-to-br ${conf.classeCard} border transition-all flex flex-col justify-between group`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-void border border-line flex items-center justify-center shrink-0 shadow-sm">
                        {renderIconeEmblema(cla.emblema, 24)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black text-holo-3">[{cla.tag}]</span>
                          <span className="text-xs text-muted flex items-center gap-1">
                            {cla.tipo === 'aberto' ? <Globe size={11} /> : <Lock size={11} />}
                            {cla.tipo === 'aberto' ? 'Aberto' : 'Convite'}
                          </span>
                        </div>
                        <h3 className="font-black text-base group-hover:text-holo-3 transition-colors line-clamp-1">
                          {cla.nome}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted line-clamp-2 mb-4 h-8">
                    {cla.descricao || 'Sem descrição cadastrada pelo clã.'}
                  </p>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-line/60 text-center mb-4">
                    <div>
                      <span className="text-[10px] text-muted block uppercase font-bold">Membros</span>
                      <span className="text-xs font-black text-text">{cla.total_membros} / 30</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block uppercase font-bold">XP Semana</span>
                      <span className="text-xs font-black text-holo-3">+{cla.xp_semana}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block uppercase font-bold">Nível Mín.</span>
                      <span className="text-xs font-black text-text">Nv. {cla.nivel_minimo}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Link
                    to={`/clas/${cla.tag}`}
                    className="flex-1 py-2.5 rounded-xl bg-panel-2 border border-line hover:border-line-hover text-xs font-bold text-center transition-colors"
                  >
                    Ver Detalhes
                  </Link>

                  {podeEntrar && (
                    <button
                      type="button"
                      onClick={() => handleEntrar(cla)}
                      className="px-4 py-2.5 rounded-xl bg-holo-3/20 border border-holo-3/40 hover:bg-holo-3 hover:text-void text-holo-3 text-xs font-bold transition-all cursor-pointer"
                    >
                      Entrar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL FUNDAR UM CLÃ */}
      {modalCriarAberto && (
        <div className="fixed inset-0 z-50 bg-void/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-panel border border-line shadow-2xl p-6 sm:p-8 my-8 relative">
            <button
              type="button"
              onClick={() => setModalCriarAberto(false)}
              className="absolute top-6 right-6 text-muted hover:text-text cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-holo-3/15 border border-holo-3/30 text-holo-3 flex items-center justify-center">
                <Zap size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black">Fundar um Novo Clã</h3>
                <span className="text-xs text-muted">Crie a sua bandeira e reúna seus aliados</span>
              </div>
            </div>

            {erroForm && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{erroForm}</span>
              </div>
            )}

            <form onSubmit={handleCriar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                  Nome do Clã (3 a 30 caracteres)
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Aliança dos Caçadores"
                  maxLength={30}
                  className="w-full px-4 py-2.5 rounded-xl bg-void border border-line text-sm focus:border-holo-3 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                    Tag do Clã (2 a 4 letras)
                  </label>
                  <input
                    type="text"
                    required
                    value={tag}
                    onChange={(e) => setTag(e.target.value.toUpperCase())}
                    placeholder="Ex: HUNT"
                    maxLength={4}
                    className="w-full px-4 py-2.5 rounded-xl bg-void border border-line text-sm font-mono font-bold uppercase focus:border-holo-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                    Nível Mínimo do Membro
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={nivelMinimo}
                    onChange={(e) => setNivelMinimo(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-void border border-line text-sm focus:border-holo-3 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                  Tipo de Ingresso
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipo('aberto')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      tipo === 'aberto' ? 'bg-holo-3/20 border-holo-3 text-holo-3' : 'bg-void border-line text-muted'
                    }`}
                  >
                    <Globe size={14} />
                    <span>Aberto a Todos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('convite')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      tipo === 'convite' ? 'bg-holo-3/20 border-holo-3 text-holo-3' : 'bg-void border-line text-muted'
                    }`}
                  >
                    <Lock size={14} />
                    <span>Apenas por Convite</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                  Emblema do Clã
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.entries(EMBLEMAS_CLA).map(([chave, conf]) => (
                    <button
                      key={chave}
                      type="button"
                      onClick={() => setEmblema(chave)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        emblema === chave ? 'bg-panel-2 border-holo-3 shadow-md ring-1 ring-holo-3/50' : 'bg-void border-line hover:border-line-hover'
                      }`}
                    >
                      {renderIconeEmblema(chave, 22)}
                      <span className={`text-[10.5px] font-bold text-center leading-tight line-clamp-2 min-h-[26px] flex items-center justify-center ${
                        emblema === chave ? 'text-text font-black' : 'text-muted'
                      }`}>
                        {conf.rotulo}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                  Descrição ou Manifesto (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Sobre o foco do clã, animes favoritos ou objetivos..."
                  className="w-full px-4 py-2 rounded-xl bg-void border border-line text-xs focus:border-holo-3 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalCriarAberto(false)}
                  className="px-5 py-2.5 rounded-xl border border-line hover:bg-panel-2 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criando}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-holo-2 to-holo-3 text-void font-bold text-xs shadow-md hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {criando ? 'Fundando...' : 'Fundar Clã'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
