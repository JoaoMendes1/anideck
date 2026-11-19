// client/src/pages/PerfilMembro.tsx
// Perfil público de um membro (/u/:handle): ficha da Guilda, vitrine e números do deck.
// Só existe para perfil marcado como público; o resto do deck continua privado.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Ban, CalendarDays, Heart, MessageCircle, PlayCircle, Sparkles, UserX, Swords, Award, Clock, CheckCircle2, Target, Skull, Gem, Hammer, UserPlus, UserCheck } from 'lucide-react'
import { useSessao } from '../contexts/SessaoContext'
import { useToast } from '../contexts/ToastContext'
import { useComunidade } from '../hooks/useComunidade'
import { obterEstiloRank } from '../lib/guilda'
import InsigniaRank from '../components/hud/InsigniaRank'
import SeloEquipe from '../components/comunidade/SeloEquipe'
import ModalDueloGosto from '../components/comunidade/ModalDueloGosto'
import SecaoColecaoCartas from '../components/comunidade/SecaoColecaoCartas'
import TagCla from '../components/TagCla'
import { obterClasseMoldura, obterClasseCorNome, obterClasseTemaPerfil, renderizarEmblema } from '../lib/cosmeticos'
import { faixaDoHP, type PerfilPublico } from '../lib/comunidade'
import AvatarMontavel from '../components/AvatarMontavel'
import CartaoEspecialidade from '../components/hud/CartaoEspecialidade'
import { filtroDoVisual, retratoDoEstagio } from '../lib/personagem'
import type { CartaColecao, PersonagemFavorito } from '../lib/cartas'
import AtividadeDoPerfil from '../components/social/AtividadeDoPerfil'
import BotaoDenunciar from '../components/moderacao/BotaoDenunciar'
import { obterResumoSocial, seguir, type ResumoSocial } from '../lib/social'

interface CartaDaVitrine {
  mal_id: number
  title: string
  image_url: string
}

const ORDEM_STATUS = ['Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado']

export default function PerfilMembro() {
  const { handle = '' } = useParams()
  const { session } = useSessao()
  const token = session?.access_token
  const { showToast } = useToast()
  const { estado } = useComunidade()
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null)
  const [estadoTela, setEstadoTela] = useState<'carregando' | 'pronto' | 'ausente' | 'erro'>('carregando')
  const [vitrine, setVitrine] = useState<CartaDaVitrine[]>([])
  const [bloqueado, setBloqueado] = useState<boolean | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [cartasMembro, setCartasMembro] = useState<CartaColecao[]>([])
  const [personagensMembro, setPersonagensMembro] = useState<PersonagemFavorito[]>([])
  const [modalDueloAberto, setModalDueloAberto] = useState(false)
  const [social, setSocial] = useState<ResumoSocial | null>(null)
  const [seguindoAgora, setSeguindoAgora] = useState(false)

  const souEu = !!estado?.perfil.existe && estado.perfil.handle === handle.toLowerCase()

  useEffect(() => {
    let ativo = true
    setEstadoTela('carregando')
    setVitrine([])
    ;(async () => {
      try {
        const res = await fetch(`/api/membros/${encodeURIComponent(handle)}`)
        if (res.status === 404) {
          if (ativo) setEstadoTela('ausente')
          return
        }
        if (!res.ok) throw new Error()
        const dados = (await res.json()) as PerfilPublico
        if (!ativo) return
        setPerfil(dados)
        setEstadoTela('pronto')
        document.title = `${dados.nome} (@${dados.handle}) · AniDeck`
        if (dados.vitrine.length > 0) {
          const bulk = await fetch('/api/anime/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: dados.vitrine }),
          })
          const lista = bulk.ok ? (((await bulk.json()) as { data?: { mal_id: number; title: string; images?: { jpg?: { image_url?: string } } }[] }).data ?? []) : []
          const porId = new Map(lista.map(a => [a.mal_id, a]))
          if (ativo) {
            setVitrine(
              dados.vitrine
                .map(id => porId.get(id))
                .filter((a): a is NonNullable<typeof a> => !!a)
                .map(a => ({ mal_id: a.mal_id, title: a.title, image_url: a.images?.jpg?.image_url ?? '' }))
            )
          }
        }

        fetch(`/api/membros/${encodeURIComponent(handle)}/cartas`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (ativo && d) setCartasMembro(d.cartas || []) })
          .catch(() => undefined)

        fetch(`/api/membros/${encodeURIComponent(handle)}/personagens`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (ativo && d) setPersonagensMembro(d.personagens || []) })
          .catch(() => undefined)
      } catch {
        if (ativo) setEstadoTela('erro')
      }
    })()
    return () => {
      ativo = false
      document.title = 'AniDeck'
    }
  }, [handle])

  useEffect(() => {
    if (!token || souEu) return
    let ativo = true
    fetch('/api/comunidade/bloqueios', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? (r.json() as Promise<string[]>) : []))
      .then(lista => {
        if (ativo) setBloqueado(lista.includes(handle.toLowerCase()))
      })
      .catch(() => undefined)
    return () => {
      ativo = false
    }
  }, [token, handle, souEu])

  // Seguidores, seguindo e se quem olha segue. Relido quando o login muda.
  useEffect(() => {
    let ativo = true
    setSocial(null)
    obterResumoSocial(handle).then(r => {
      if (ativo) setSocial(r)
    })
    return () => {
      ativo = false
    }
  }, [handle, token])

  const alternarSeguir = async () => {
    if (!social || seguindoAgora) return
    setSeguindoAgora(true)
    const r = await seguir(handle, !social.eu_sigo)
    setSeguindoAgora(false)
    if (r.dados) {
      setSocial(r.dados)
      showToast(r.dados.eu_sigo ? `Agora você segue @${handle}. A atividade aparece no Feed, na aba Seguindo.` : `Você deixou de seguir @${handle}.`)
    } else {
      showToast(r.erro || 'Não foi possível concluir agora.', 'error')
    }
  }

  const alternarBloqueio = async () => {
    if (!token || bloqueado === null) return
    setOcupado(true)
    try {
      const res = await fetch(`/api/comunidade/bloqueios/${encodeURIComponent(handle)}`, {
        method: bloqueado ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setBloqueado(!bloqueado)
      showToast(bloqueado ? `@${handle} desbloqueado.` : `@${handle} bloqueado. Os comentários dele somem para você.`)
    } catch {
      showToast('Não foi possível concluir agora.', 'error')
    } finally {
      setOcupado(false)
    }
  }

  if (estadoTela === 'carregando') {
    return (
      <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 pt-8 pb-24">
        <div className="h-48 rounded-2xl bg-panel border border-line animate-pulse mb-6" />
        <div className="h-64 rounded-2xl bg-panel border border-line animate-pulse" />
      </div>
    )
  }

  if (estadoTela !== 'pronto' || !perfil) {
    return (
      <div className="w-full max-w-md mx-auto px-4 pt-16 pb-24 text-center">
        <span className="w-14 h-14 mx-auto rounded-full grid place-items-center bg-panel border border-line mb-4">
          <UserX size={22} className="text-muted" aria-hidden />
        </span>
        <h1 className="font-anton text-2xl uppercase mb-2">
          {estadoTela === 'ausente' ? 'Membro não encontrado' : 'Perfil indisponível'}
        </h1>
        <p className="text-sm text-muted mb-6">
          {estadoTela === 'ausente'
            ? `Não existe perfil público para @${handle}. Ele pode ter escondido o perfil ou trocado de @.`
            : 'Não foi possível carregar este perfil agora. Tente de novo em instantes.'}
        </p>
        <Link to="/membros" className="inline-block px-5 py-2.5 rounded-full text-xs font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2">
          Ver ranking de membros
        </Link>
      </div>
    )
  }

  const estilo = obterEstiloRank(perfil.rank)
  const desde = new Date(perfil.membro_desde)
  const faixa = faixaDoHP(perfil.hp)
  const status = [...ORDEM_STATUS, ...Object.keys(perfil.status).filter(s => !ORDEM_STATUS.includes(s))].filter(s => (perfil.status[s] ?? 0) > 0)
  const totalNoDeck = Object.values(perfil.status).reduce((a, b) => a + b, 0)

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 pt-6 pb-24">
      <section className={`relative overflow-hidden rounded-2xl border border-line p-5 sm:p-7 mb-6 ${obterClasseTemaPerfil(perfil.tema_perfil)}`}>
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-holo-2/15 blur-3xl pointer-events-none" aria-hidden />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <span className={`shrink-0 rounded-2xl shadow-[0_0_40px_rgba(123,92,255,0.25)] ${obterClasseMoldura(perfil.moldura)}`}>
            <AvatarMontavel avatar={perfil.avatar ?? { base: 'quadrado' }} retrato={retratoDoEstagio(perfil.estagio, perfil.personagem_base)} filtro={filtroDoVisual(perfil.estagio)} nome={perfil.nome} tamanho={96} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider pl-1 pr-2.5 py-0.5 rounded-full border ${estilo.bordaPilula} ${estilo.fundoPilula} ${estilo.seloTexto}`}>
                <InsigniaRank rank={perfil.rank} tamanho={26} />
                Rank {perfil.rank} · Nível {perfil.nivel}
              </span>
              {perfil.especialidade && (
                <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-holo-1/40 bg-holo-1/15 text-holo-1 inline-flex items-center gap-1">
                  <span aria-hidden>{perfil.especialidade.icone}</span> {perfil.especialidade.epiteto}
                </span>
              )}
              {perfil.titulo_ativo && (
                <span className="font-mono text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-gold/15 border border-gold/40 text-gold inline-flex items-center gap-1">
                  <Award size={10} /> {perfil.titulo_ativo}
                </span>
              )}
              <SeloEquipe handle={perfil.handle} grande />
              <span className="font-mono text-xs text-muted-2 inline-flex items-center gap-1">
                <CalendarDays size={11} aria-hidden /> membro desde {desde.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`font-anton text-[clamp(1.6rem,4vw,2.4rem)] uppercase leading-none m-0 break-words ${obterClasseCorNome(perfil.cor_nome)}`}>
                {perfil.nome}
              </h1>
              {perfil.cla_tag && <TagCla tag={perfil.cla_tag} />}
              {renderizarEmblema(perfil.emblema, 'md')}
            </div>
            <p className="font-mono text-[12px] text-muted mt-1 mb-0 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                @{perfil.handle} · <span className="text-text">{perfil.titulo_rank}</span>
              </span>
              {social && (
                <span>
                  {'· '}<b className="text-text">{social.seguidores.toLocaleString('pt-BR')}</b> {social.seguidores === 1 ? 'seguidor' : 'seguidores'}
                  {' · '}<b className="text-text">{social.seguindo.toLocaleString('pt-BR')}</b> seguindo
                </span>
              )}
              {social && !social.sou_eu && !souEu && social.amigos && (
                <span className="inline-flex items-center gap-1 rounded-full border border-green/45 bg-green/15 px-2 py-0.5 font-mono text-[11px] font-bold text-green">
                  Amigos
                </span>
              )}
              {social && !social.sou_eu && !souEu && !social.amigos && social.ele_me_segue && (
                <span className="inline-flex items-center gap-1 rounded-full border border-holo-3/45 bg-holo-3/12 px-2 py-0.5 font-mono text-[11px] font-bold text-holo-3">
                  Segue você
                </span>
              )}
            </p>
            {perfil.bio && <p className="text-[14px] text-text/85 mt-3 mb-0 max-w-xl whitespace-pre-wrap break-words">{perfil.bio}</p>}
          </div>
          <div className="flex sm:flex-col gap-2 shrink-0">
            {souEu ? (
              <Link to="/configuracoes#comunidade" className="px-4 py-2 rounded-full text-xs font-bold border border-line hover:border-holo-3 text-text">
                Editar perfil
              </Link>
            ) : (
              <>
                {token && social && !social.sou_eu && (
                  <button
                    type="button"
                    onClick={alternarSeguir}
                    disabled={seguindoAgora}
                    aria-pressed={social.eu_sigo}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 ${
                      social.eu_sigo
                        ? 'border border-holo-3/50 bg-holo-3/10 text-holo-3 hover:bg-holo-3/20'
                        : 'bg-text text-void hover:opacity-90'
                    }`}
                  >
                    {social.eu_sigo ? <UserCheck size={13} aria-hidden /> : <UserPlus size={13} aria-hidden />}
                    {social.eu_sigo ? 'Seguindo' : social.ele_me_segue ? 'Seguir de volta' : 'Seguir'}
                  </button>
                )}
                {token && estado?.perfil.existe && (
                  <button
                    type="button"
                    onClick={() => setModalDueloAberto(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-holo-1 to-holo-3 text-void hover:opacity-90 transition-opacity cursor-pointer shadow-md"
                  >
                    <Swords size={13} /> Duelar comigo
                  </button>
                )}
                {token &&
                  bloqueado !== null && (
                    <button type="button" onClick={alternarBloqueio} disabled={ocupado} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border border-line text-muted hover:text-text cursor-pointer disabled:opacity-50">
                      <Ban size={13} aria-hidden /> {bloqueado ? 'Desbloquear' : 'Bloquear'}
                    </button>
                  )}
                {token && social && !social.sou_eu && <BotaoDenunciar tipo="perfil" alvo={perfil.handle} />}
              </>
            )}
          </div>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {(() => {
            return [
              { rotulo: 'XP total', valor: perfil.xp_total.toLocaleString('pt-BR'), icone: <Sparkles size={13} className="text-holo-2" aria-hidden /> },
              { rotulo: 'Episódios vistos', valor: perfil.episodios_vistos.toLocaleString('pt-BR'), icone: <PlayCircle size={13} className="text-holo-3" aria-hidden /> },
              { rotulo: 'Comentários', valor: perfil.comentarios.toLocaleString('pt-BR'), icone: <MessageCircle size={13} className="text-holo-1" aria-hidden /> },
              { rotulo: 'HP', valor: `${perfil.hp}%`, icone: <Heart size={13} className="text-coral" aria-hidden /> },
            ]
          })().map(item => (
            <div key={item.rotulo} className="rounded-xl bg-panel-2 border border-line p-3">
              <div className="font-mono text-xs text-muted-2 uppercase tracking-wider flex items-center gap-1.5">
                {item.icone} {item.rotulo}
              </div>
              <div className="font-anton text-xl mt-1 leading-none">{item.valor}</div>
              {item.rotulo === 'Vitalidade' && (
                <div className="h-1 rounded-full bg-panel overflow-hidden mt-2">
                  <div className={`h-full ${faixa === 'baixo' ? 'bg-coral/60' : 'bg-coral'}`} style={{ width: `${perfil.hp}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {((perfil.generos?.length ?? 0) > 0 || perfil.rpg) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-6">
          <section className="rounded-2xl bg-panel border border-line p-5">
            <h2 className="font-anton text-base uppercase m-0 mb-4">Especialidade</h2>
            <CartaoEspecialidade
              especialidade={perfil.especialidade}
              vazio={`@${perfil.handle} ainda não tem 3 animes de um mesmo gênero.`}
            />
            {(perfil.generos?.length ?? 0) > 0 && (
              <ul className="list-none m-0 mt-4 p-0 space-y-2.5" aria-label="Gêneros mais assistidos">
                {perfil.generos!.slice(0, 5).map(g => (
                  <li key={g.genero}>
                    <div className="flex items-center justify-between text-[12.5px] mb-1 gap-2">
                      <span className="text-muted truncate">{g.genero}</span>
                      <span className="font-mono text-xs text-muted-2 shrink-0">
                        {g.total_vistos} {g.total_vistos === 1 ? 'anime' : 'animes'} ·{' '}
                        <b className={g.nivel >= 3 ? 'text-gold' : g.nivel >= 1 ? 'text-holo-2' : 'text-muted-2'}>{g.rotulo_nivel}</b>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-panel-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-holo-1 to-holo-2"
                        style={{ width: `${Math.round((g.total_vistos / Math.max(1, perfil.generos![0].total_vistos)) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-panel border border-line p-5">
            <h2 className="font-anton text-base uppercase m-0 mb-4">Jornada</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { rotulo: 'Horas vistas', valor: perfil.horas_assistidas ?? 0, icone: <Clock size={13} className="text-holo-3" aria-hidden /> },
                { rotulo: 'Completos', valor: perfil.status['Completo'] ?? 0, icone: <CheckCircle2 size={13} className="text-green" aria-hidden /> },
                { rotulo: 'Missões', valor: perfil.missoes_concluidas ?? 0, icone: <Target size={13} className="text-gold" aria-hidden /> },
                ...(perfil.rpg
                  ? [
                      { rotulo: 'Vitórias', valor: perfil.rpg.vitorias, icone: <Swords size={13} className="text-coral" aria-hidden /> },
                      { rotulo: 'Monstros', valor: perfil.rpg.monstros_derrotados, icone: <Skull size={13} className="text-holo-1" aria-hidden /> },
                      { rotulo: 'Lendários', valor: perfil.rpg.lendarios, icone: <Gem size={13} className="text-gold" aria-hidden /> },
                    ]
                  : []),
              ].map(item => (
                <div key={item.rotulo} className="rounded-xl bg-panel-2 border border-line p-3">
                  <div className="font-mono text-xs text-muted-2 uppercase tracking-wider flex items-center gap-1.5">
                    {item.icone} <span className="truncate">{item.rotulo}</span>
                  </div>
                  <div className="font-anton text-xl mt-1 leading-none">{item.valor.toLocaleString('pt-BR')}</div>
                </div>
              ))}
            </div>
            {(perfil.rpg?.maior_aprimoramento ?? 0) > 0 && (
              <p className="font-mono text-xs text-muted-2 mt-3 mb-0 inline-flex items-center gap-1.5">
                <Hammer size={12} aria-hidden /> Maior aprimoramento: <b className="text-text">+{perfil.rpg!.maior_aprimoramento}</b>
              </p>
            )}
          </section>
        </div>
      )}

      {social && <AtividadeDoPerfil handle={perfil.handle} mostra={social.mostra_atividade} souEu={souEu || social.sou_eu} />}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <section className="rounded-2xl bg-panel border border-line p-5">
          <h2 className="font-anton text-base uppercase m-0 mb-4">A mão de @{perfil.handle}</h2>
          {vitrine.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
              {vitrine.map((a, i) => (
                <Link key={a.mal_id} to={`/anime/${a.mal_id}`} className="group" style={{ transform: `rotate(${(i - (vitrine.length - 1) / 2) * 1.5}deg)` }}>
                  <div className="aspect-[2/3] rounded-xl overflow-hidden border border-line group-hover:border-holo-3 transition-colors shadow-lg">
                    <img src={a.image_url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="text-xs font-bold mt-1.5 line-clamp-2 leading-tight group-hover:text-holo-3 transition-colors">{a.title}</div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted m-0">{souEu ? 'Escolha até cinco animes para mostrar aqui nas Configurações.' : 'Este membro ainda não montou a vitrine.'}</p>
          )}
        </section>

        <aside className="rounded-2xl bg-panel border border-line p-5">
          <h2 className="font-anton text-base uppercase m-0 mb-1">No deck</h2>
          <p className="font-mono text-xs text-muted-2 mt-0 mb-4">{totalNoDeck} {totalNoDeck === 1 ? 'obra' : 'obras'} · os títulos ficam privados</p>
          {status.length > 0 ? (
            <ul className="list-none m-0 p-0 space-y-2.5">
              {status.map(s => (
                <li key={s}>
                  <div className="flex items-center justify-between text-[12.5px] mb-1">
                    <span className="text-muted">{s}</span>
                    <b className="font-mono text-text">{perfil.status[s]}</b>
                  </div>
                  <div className="h-1.5 rounded-full bg-panel-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-holo-2 to-holo-3" style={{ width: `${Math.round((perfil.status[s] / Math.max(1, totalNoDeck)) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted m-0">Deck vazio por enquanto.</p>
          )}
        </aside>
      </div>

      {/* PERSONAGENS FAVORITOS (Fase 16, #174) */}
      {personagensMembro.length > 0 && (
        <section className="mt-6 rounded-2xl bg-panel border border-line p-5">
          <span className="font-mono text-xs text-muted-2 uppercase tracking-widest block mb-1">
            // favoritos de @{perfil.handle}
          </span>
          <h2 className="font-anton text-base uppercase m-0 mb-4">Personagens Favoritos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {personagensMembro.slice(0, 3).map((p) => (
              <div key={p.character_id} className="flex items-center gap-3 p-3 rounded-xl bg-panel-2 border border-line">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-void shrink-0 border border-holo-3/30">
                  <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-text block truncate">{p.nome}</span>
                  <span className="font-mono text-xs text-holo-3 block mt-0.5">{p.papel || 'Favorito'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* COLEÇÃO DE CARTAS DE ANIME (Fase 16, #172) */}
      {cartasMembro.length > 0 && (
        <div className="mt-6">
          <SecaoColecaoCartas
            cartas={cartasMembro}
            titulo={`Coleção de @${perfil.handle}`}
            descricao="Cartas colecionadas ao completar animes no AniDeck."
          />
        </div>
      )}

      {modalDueloAberto && estado?.perfil.handle && (
        <ModalDueloGosto
          aberto={modalDueloAberto}
          onClose={() => setModalDueloAberto(false)}
          meuHandle={estado.perfil.handle}
          alvoHandle={perfil.handle}
          alvoNome={perfil.nome}
        />
      )}
    </div>
  )
}
