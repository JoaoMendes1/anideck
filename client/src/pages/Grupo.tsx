// client/src/pages/Grupo.tsx
// Sala do grupo: quem abriu convida (amigos, clã, online) e manda lutar; quem foi convidado
// espera aqui. Quando a luta acontece, todos veem a mesma batalha e a própria recompensa.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Clock, Crown, Search, Swords, UserPlus, Users } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import {
  MAX_NO_GRUPO, convidar, lerCandidatos, lerGrupo, lutarEmGrupo, minutosRestantes, origemDoCandidato, sairDoGrupo,
  type Candidato, type EstadoDoGrupo,
} from '../lib/grupo'
import BatalhaEmGrupo from '../components/rpg/BatalhaEmGrupo'
import PreferenciasDeConvite from '../components/rpg/PreferenciasDeConvite'

const CONTAINER = 'w-full min-w-0 max-w-[900px] mx-auto px-4 sm:px-6 lg:px-10 pt-3 sm:pt-6 pb-24'
const INTERVALO_SALA_MS = 3000
type Filtro = 'todos' | 'amigos' | 'cla' | 'online'

const ROTULO_STATUS: Record<string, { texto: string; classe: string }> = {
  aceito: { texto: 'Pronto', classe: 'text-green border-green/40' },
  convidado: { texto: 'Esperando resposta', classe: 'text-gold border-gold/40' },
  recusado: { texto: 'Recusou', classe: 'text-muted border-line' },
}

export default function Grupo() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [grupo, setGrupo] = useState<EstadoDoGrupo | null>(null)
  const [erro, setErro] = useState('')
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const r = await lerGrupo(id)
    if (r.dados) setGrupo(r.dados)
    else setErro(r.erro ?? 'Grupo não encontrado.')
  }, [id])

  const aberto = grupo?.status === 'aberto' || grupo?.status === 'lutando'
  useEffect(() => {
    carregar()
  }, [carregar])
  useEffect(() => {
    if (!aberto) return
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') carregar()
    }, INTERVALO_SALA_MS)
    return () => window.clearInterval(t)
  }, [aberto, carregar])

  const souLider = grupo?.sou_lider ?? false
  useEffect(() => {
    if (souLider && grupo?.status === 'aberto') lerCandidatos(id).then(setCandidatos)
  }, [souLider, grupo?.status, id])

  const ocupados = grupo?.membros.filter((m) => m.status === 'aceito' || m.status === 'convidado').length ?? 0
  const prontos = grupo?.membros.filter((m) => m.status === 'aceito').length ?? 0
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase().replace(/^@/, '')
    return candidatos.filter((c) => {
      if (filtro === 'amigos' && !c.amigo) return false
      if (filtro === 'cla' && !c.cla) return false
      if (filtro === 'online' && !c.online) return false
      return !termo || c.handle.includes(termo) || c.nome.toLowerCase().includes(termo)
    })
  }, [candidatos, filtro, busca])

  const chamar = async (handle: string) => {
    setOcupado(handle)
    const r = await convidar(id, handle)
    setOcupado(null)
    if (r.erro) {
      showToast(r.erro, 'error')
      return
    }
    showToast(`Convite enviado para @${handle}.`, 'success')
    carregar()
    lerCandidatos(id).then(setCandidatos)
  }

  const lutar = async () => {
    setOcupado('lutar')
    const r = await lutarEmGrupo(id)
    setOcupado(null)
    if (r.erro) {
      showToast(r.erro, 'error')
      carregar()
      return
    }
    carregar()
  }

  const sair = async () => {
    const r = await sairDoGrupo(id)
    if (r.erro) {
      showToast(r.erro, 'error')
      return
    }
    navigate(grupo?.alvo_tipo === 'masmorra' ? '/masmorras' : '/expedicoes')
  }

  const voltarPara = grupo?.alvo_tipo === 'masmorra' ? '/masmorras' : '/expedicoes'

  if (erro && !grupo) {
    return (
      <div className={CONTAINER}>
        <p className="rounded-2xl border border-line bg-panel p-6 text-center text-sm text-muted">{erro}</p>
        <Link to="/expedicoes" className="mt-3 inline-block text-sm text-holo-3">Voltar às Expedições</Link>
      </div>
    )
  }
  if (!grupo) return <div className={CONTAINER}><div className="h-64 rounded-2xl border border-line bg-panel shimmer" /></div>

  if (grupo.status === 'concluido' && grupo.resultado) {
    return (
      <div className={CONTAINER}>
        <BatalhaEmGrupo
          resultado={grupo.resultado}
          recompensa={grupo.minha_recompensa}
          aoVoltar={() => navigate(voltarPara)}
          rotuloVoltar={grupo.alvo_tipo === 'masmorra' ? 'Voltar às masmorras' : 'Voltar às expedições'}
        />
      </div>
    )
  }

  const encerrado = grupo.status === 'cancelado' || grupo.status === 'expirado'

  return (
    <div className={`${CONTAINER} flex flex-col gap-4`}>
      <header className="flex items-center gap-1">
        <Link to={voltarPara} aria-label="Voltar" className="-ml-2 flex h-10 w-11 items-center justify-center rounded-full text-muted hover:text-text">
          <ChevronLeft size={22} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="m-0 font-mono text-xs uppercase tracking-widest text-muted">Luta em grupo</p>
          <h1 className="m-0 truncate font-anton text-2xl uppercase leading-tight">{grupo.alvo_nome || 'Grupo'}</h1>
        </div>
        {!encerrado && (
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-muted">
            <Clock size={12} aria-hidden="true" /> {minutosRestantes(grupo.expira_em)} min
          </span>
        )}
      </header>

      {encerrado && (
        <p role="status" className="m-0 rounded-xl border border-coral/40 bg-coral/10 p-3 text-sm">
          {grupo.status === 'expirado' ? 'O tempo do grupo acabou antes da luta.' : 'O grupo foi fechado.'}{' '}
          <Link to={voltarPara} className="font-bold text-holo-3">Voltar</Link>
        </p>
      )}

      <section aria-labelledby="titulo-membros" className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-4">
        <h2 id="titulo-membros" className="m-0 flex items-center gap-2 text-sm font-bold">
          <Users size={16} className="text-holo-3" aria-hidden="true" /> Grupo ({prontos} de {MAX_NO_GRUPO} prontos)
        </h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {grupo.membros.map((m) => {
            const st = m.papel === 'lider' ? { texto: 'Líder', classe: 'text-gold border-gold/40' } : ROTULO_STATUS[m.status]
            return (
              <li key={m.handle} className="flex items-center gap-3 rounded-xl bg-panel-2 px-3 py-2">
                {m.papel === 'lider' ? <Crown size={16} className="shrink-0 text-gold" aria-hidden="true" /> : <Swords size={16} className="shrink-0 text-muted" aria-hidden="true" />}
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm font-bold">
                    {m.nome} {m.sou_eu && <span className="font-normal text-muted">(você)</span>}
                  </p>
                  <p className="m-0 font-mono text-xs text-muted">
                    @{m.handle}
                    {m.nivel ? ` · Nv ${m.nivel}` : ''}
                    {m.poder ? ` · Poder ${m.poder}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${st.classe}`}>{st.texto}</span>
              </li>
            )
          })}
        </ul>
        {!encerrado && (
          <div className="flex flex-wrap gap-2 pt-1">
            {souLider ? (
              <button
                type="button"
                onClick={lutar}
                disabled={ocupado !== null || grupo.status !== 'aberto'}
                className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-sm font-extrabold text-void disabled:opacity-50 sm:flex-none"
              >
                <Swords size={16} aria-hidden="true" />
                {ocupado === 'lutar' || grupo.status === 'lutando' ? 'Lutando…' : prontos > 1 ? `Lutar com ${prontos} heróis` : 'Lutar sozinho'}
              </button>
            ) : (
              <p className="m-0 flex-1 text-sm text-muted">Você está no grupo. A luta começa quando o líder mandar; fique nesta tela para ver.</p>
            )}
            <button type="button" onClick={sair} className="h-10 cursor-pointer rounded-full border border-line px-4 text-xs font-bold text-muted hover:text-text">
              {souLider ? 'Fechar grupo' : 'Sair do grupo'}
            </button>
          </div>
        )}
      </section>

      {souLider && grupo.status === 'aberto' && (
        <section aria-labelledby="titulo-convidar" className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
          <h2 id="titulo-convidar" className="m-0 flex items-center gap-2 text-sm font-bold">
            <UserPlus size={16} className="text-holo-2" aria-hidden="true" /> Convidar ({MAX_NO_GRUPO - ocupados} {MAX_NO_GRUPO - ocupados === 1 ? 'vaga' : 'vagas'})
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar ou digitar @usuario"
                aria-label="Buscar jogador"
                className="h-10 w-full rounded-full border border-line bg-panel-2 pl-8 pr-3 text-sm text-text outline-none focus:border-holo-2"
              />
            </label>
            <div className="-mx-1 flex gap-1 overflow-x-auto scrollbar-hide px-1">
              {(['todos', 'amigos', 'cla', 'online'] as Filtro[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFiltro(f)}
                  aria-pressed={filtro === f}
                  className={`h-9 shrink-0 cursor-pointer rounded-full px-3 font-mono text-xs font-bold ${filtro === f ? 'bg-holo-2 text-void' : 'border border-line text-muted'}`}
                >
                  {{ todos: 'Todos', amigos: 'Amigos', cla: 'Clã', online: 'Online' }[f]}
                </button>
              ))}
            </div>
          </div>
          {busca.trim().startsWith('@') && busca.trim().length > 2 && !visiveis.some((c) => c.handle === busca.trim().slice(1).toLowerCase()) && (
            <button
              type="button"
              onClick={() => chamar(busca.trim().slice(1))}
              disabled={ocupados >= MAX_NO_GRUPO || ocupado !== null}
              className="h-10 cursor-pointer self-start rounded-full border border-holo-2/50 px-4 text-xs font-bold text-holo-2 disabled:opacity-50"
            >
              Convidar {busca.trim()}
            </button>
          )}
          {visiveis.length === 0 ? (
            <p className="m-0 text-xs text-muted">
              Ninguém aqui ainda. Amigos são quem vocês dois seguem; também aparecem o seu clã e quem está online agora. Dá para convidar pelo @.
            </p>
          ) : (
            <ul className="m-0 flex max-h-80 list-none flex-col gap-1.5 overflow-y-auto p-0">
              {visiveis.map((c) => {
                const jaNoGrupo = c.no_grupo === 'convidado' || c.no_grupo === 'aceito'
                return (
                  <li key={c.handle} className="flex items-center gap-3 rounded-xl bg-panel-2 px-3 py-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${c.online ? 'bg-green' : 'bg-line'}`} aria-label={c.online ? 'Online' : 'Offline'} />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-bold">{c.nome}</p>
                      <p className="m-0 truncate font-mono text-xs text-muted">
                        @{c.handle}
                        {origemDoCandidato(c) ? ` · ${origemDoCandidato(c)}` : ''}
                      </p>
                      {c.motivo && !jaNoGrupo && <p className="m-0 text-[11px] text-coral">{c.motivo}</p>}
                    </div>
                    {jaNoGrupo ? (
                      <span className="shrink-0 text-xs font-bold text-muted">{c.no_grupo === 'aceito' ? 'No grupo' : 'Convidado'}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => chamar(c.handle)}
                        disabled={Boolean(c.motivo) || ocupados >= MAX_NO_GRUPO || ocupado !== null}
                        className="h-9 shrink-0 cursor-pointer rounded-full bg-holo-2 px-4 text-xs font-extrabold text-void disabled:opacity-40"
                      >
                        {ocupado === c.handle ? '…' : 'Convidar'}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      <PreferenciasDeConvite />
    </div>
  )
}
