// client/src/components/comunidade/PerfilPublicoConfig.tsx
// Perfil público nas Configurações: @, nome, bio, vitrine de até cinco animes,
// visibilidade e Modo Descanso. Sem perfil, a pessoa lê e reage, mas não comenta.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AtSign, Check, Eye, EyeOff, Moon, X } from 'lucide-react'
import { useSessao } from '../../contexts/SessaoContext'
import { useToast } from '../../contexts/ToastContext'
import { useComunidade, avisarComunidadeAtualizada } from '../../hooks/useComunidade'
import { MAX_BIO, sugerirHandle, validarHandle, type EstadoComunidade } from '../../lib/comunidade'
import { useLoja } from '../../hooks/useLoja'
import BarrasVitais from './BarrasVitais'

interface AnimeDaVitrine {
  mal_id: number
  title: string
  image_url: string
}

const campo = 'w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-holo-3 transition-colors'
const rotulo = 'block text-[11px] font-bold text-muted mb-2 uppercase tracking-wide select-none'

function dataCurta(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  if (!a || !m || !d) return iso
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function PerfilPublicoConfig({ nomeSugerido }: { nomeSugerido: string }) {
  const { session, isAdmin } = useSessao()
  const token = session?.access_token
  const { estado, indisponivel } = useComunidade()

  if (!estado) {
    return indisponivel ? (
      <div className="bg-panel border border-line rounded-2xl p-5 text-sm text-muted">
        A comunidade está indisponível agora. Tente de novo em instantes.
      </div>
    ) : (
      <div className="h-64 rounded-2xl bg-panel border border-line animate-pulse" />
    )
  }
  return <Formulario key={estado.perfil.existe ? estado.perfil.handle : `novo-${nomeSugerido}`} estado={estado} token={token ?? ''} nomeSugerido={nomeSugerido} daEquipe={isAdmin} />
}

function Formulario({ estado, token, nomeSugerido, daEquipe }: { estado: EstadoComunidade; token: string; nomeSugerido: string; daEquipe: boolean }) {
  const { showToast } = useToast()
  const { temItem } = useLoja()
  const temExpansaoVitrine = temItem('vitrine_plus_2')
  const limiteVitrine = temExpansaoVitrine ? 7 : 5

  const { perfil, regras } = estado
  const [handle, setHandle] = useState(perfil.existe ? perfil.handle : sugerirHandle(nomeSugerido))
  const [nome, setNome] = useState(perfil.existe ? perfil.nome : nomeSugerido)
  const [bio, setBio] = useState(perfil.bio)
  const [publico, setPublico] = useState(perfil.existe ? perfil.publico : true)
  const [vitrine, setVitrine] = useState<number[]>(perfil.vitrine)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [opcoes, setOpcoes] = useState<AnimeDaVitrine[] | null>(null)
  const [abrindoVitrine, setAbrindoVitrine] = useState(false)
  const [seletorAberto, setSeletorAberto] = useState(false)
  const [diasDescanso, setDiasDescanso] = useState(Math.min(7, regras.descanso_max_dias))
  const [ativandoDescanso, setAtivandoDescanso] = useState(false)

  const checagem = validarHandle(handle, daEquipe)
  const nomeValido = nome.trim().length >= 1 && nome.trim().length <= 40
  const mudou =
    !perfil.existe ||
    checagem.handle !== perfil.handle ||
    nome.trim() !== perfil.nome ||
    bio.trim() !== perfil.bio ||
    publico !== perfil.publico ||
    vitrine.join(',') !== perfil.vitrine.join(',')

  // A vitrine precisa dos títulos e capas: busca o deck só quando a pessoa abre o seletor,
  // ou logo de cara se já há vitrine salva para mostrar.
  const carregarOpcoes = async () => {
    if (opcoes || abrindoVitrine) return
    setAbrindoVitrine(true)
    try {
      const res = await fetch('/api/entries', { headers: { Authorization: `Bearer ${token}` } })
      const entradas = res.ok ? ((await res.json()) as { mal_id: number; status: string; is_favorite?: boolean }[]) : []
      const ordenadas = [...entradas].sort((a, b) => Number(!!b.is_favorite) - Number(!!a.is_favorite) || Number(b.status === 'Completo') - Number(a.status === 'Completo'))
      const ids = ordenadas.slice(0, 60).map(e => e.mal_id)
      if (ids.length === 0) {
        setOpcoes([])
        return
      }
      const bulk = await fetch('/api/anime/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const dados = bulk.ok ? (((await bulk.json()) as { data?: { mal_id: number; title: string; images?: { jpg?: { image_url?: string } } }[] }).data ?? []) : []
      const porId = new Map(dados.map(d => [d.mal_id, d]))
      setOpcoes(
        ids
          .map(id => porId.get(id))
          .filter((d): d is NonNullable<typeof d> => !!d)
          .map(d => ({ mal_id: d.mal_id, title: d.title, image_url: d.images?.jpg?.image_url ?? '' }))
      )
    } catch {
      setOpcoes([])
    } finally {
      setAbrindoVitrine(false)
    }
  }

  useEffect(() => {
    if (perfil.vitrine.length > 0) carregarOpcoes()
    // Só na montagem: a vitrine salva precisa de capa para aparecer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const alternarNaVitrine = (id: number) => {
    setVitrine(v => (v.includes(id) ? v.filter(x => x !== id) : v.length >= limiteVitrine ? v : [...v, id]))
  }

  const salvar = async () => {
    if (checagem.erro) {
      setErro(checagem.erro)
      return
    }
    if (!nomeValido) {
      setErro('O nome de exibição vai de 1 a 40 caracteres.')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      const res = await fetch('/api/comunidade/eu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ handle: checagem.handle, nome: nome.trim(), bio: bio.trim(), vitrine, publico }),
      })
      if (!res.ok) {
        setErro((await res.text()).trim() || 'Não foi possível salvar agora.')
        return
      }
      const novo = (await res.json()) as EstadoComunidade
      showToast(perfil.existe ? 'Perfil público atualizado!' : `Pronto, você é @${checagem.handle}!`)
      if (novo?.perfil) avisarComunidadeAtualizada(novo)
    } catch {
      setErro('Sem conexão. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  const ativarDescanso = async () => {
    setAtivandoDescanso(true)
    try {
      const res = await fetch('/api/comunidade/descanso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dias: diasDescanso }),
      })
      if (!res.ok) {
        showToast((await res.text()).trim() || 'Não foi possível ativar agora.', 'error')
        return
      }
      const novo = (await res.json()) as EstadoComunidade
      showToast('Modo Descanso ativado. Boa pausa!')
      if (novo?.perfil) avisarComunidadeAtualizada(novo)
    } catch {
      showToast('Sem conexão. Tente de novo.', 'error')
    } finally {
      setAtivandoDescanso(false)
    }
  }

  const escolhidos = vitrine.map(id => opcoes?.find(o => o.mal_id === id)).filter((o): o is AnimeDaVitrine => !!o)
  const opcoesDeDias = [...new Set([3, 7, 14, 21, 30].filter(d => d < regras.descanso_max_dias).concat(regras.descanso_max_dias))]

  return (
    <div className="space-y-4">
      <div className="bg-panel border border-line rounded-2xl p-5">
        {!perfil.existe && (
          <p className="text-[13px] text-muted mt-0 mb-5">
            Seu perfil público é como a comunidade te vê: o @ nos comentários, a ficha da Guilda e o lugar no ranking de membros.
            Seu deck e suas notas continuam privados.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="handle" className={rotulo}>Seu @</label>
            <div className="relative">
              <AtSign size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2" aria-hidden />
              <input
                id="handle"
                value={handle}
                maxLength={21}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={e => setHandle(e.target.value.toLowerCase())}
                placeholder="seu_nome"
                aria-invalid={!!checagem.erro && handle.length > 0}
                className={`${campo} pl-9`}
              />
            </div>
            <p className={`text-[11px] mt-1 mb-0 ${checagem.erro && handle.length > 0 ? 'text-coral' : 'text-muted-2'}`}>
              {checagem.erro && handle.length > 0
                ? checagem.erro
                : daEquipe
                  ? 'Como equipe, você pode usar um @ reservado (admin, administrador, anideck...).'
                  : 'Letras minúsculas, números e _. Dá para trocar depois.'}
            </p>
          </div>
          <div>
            <label htmlFor="nome-publico" className={rotulo}>Nome na comunidade</label>
            <input id="nome-publico" value={nome} maxLength={40} onChange={e => setNome(e.target.value)} placeholder="Como quer aparecer" className={campo} />
          </div>
        </div>

        <label htmlFor="bio" className={`${rotulo} mt-4`}>Bio</label>
        <textarea
          id="bio"
          value={bio}
          maxLength={MAX_BIO}
          rows={2}
          onChange={e => setBio(e.target.value)}
          placeholder="Shonen de manhã, slice of life à noite."
          className={`${campo} resize-none`}
        />
        <p className="text-[11px] text-muted-2 mt-1 mb-0 text-right font-mono">{MAX_BIO - bio.length}</p>

        <div className="mt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className={rotulo + ' mb-0'}>
                Sua mão · {vitrine.length}/{limiteVitrine} cartas
              </span>
              {temExpansaoVitrine && (
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-holo-3/20 border border-holo-3/40 text-holo-3 font-bold">
                  +2 Loja
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSeletorAberto(a => !a)
                carregarOpcoes()
              }}
              aria-expanded={seletorAberto}
              className="text-[12px] font-bold text-holo-3 hover:underline cursor-pointer"
            >
              {abrindoVitrine ? 'Carregando…' : seletorAberto ? 'Pronto' : vitrine.length > 0 ? 'Trocar cartas' : 'Escolher do meu deck'}
            </button>
          </div>
          {escolhidos.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
              {escolhidos.map(a => (
                <button key={a.mal_id} type="button" onClick={() => alternarNaVitrine(a.mal_id)} className="relative shrink-0 w-16 aspect-[2/3] rounded-lg overflow-hidden border border-holo-3 cursor-pointer group" title={`Tirar ${a.title}`}>
                  <img src={a.image_url} alt={a.title} className="w-full h-full object-cover" />
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-void/80 grid place-items-center opacity-80 group-hover:opacity-100">
                    <X size={11} aria-hidden />
                  </span>
                </button>
              ))}
            </div>
          )}
          {seletorAberto && opcoes !== null &&
            (opcoes.length === 0 ? (
              <p className="text-[12px] text-muted-2 m-0">Adicione animes ao seu deck para montar a vitrine.</p>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {opcoes.map(a => {
                  const marcado = vitrine.includes(a.mal_id)
                  return (
                    <button
                      key={a.mal_id}
                      type="button"
                      onClick={() => alternarNaVitrine(a.mal_id)}
                      aria-pressed={marcado}
                      title={a.title}
                      disabled={!marcado && vitrine.length >= limiteVitrine}
                      className={`relative aspect-[2/3] rounded-lg overflow-hidden border cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${marcado ? 'border-holo-3 ring-2 ring-holo-3/40' : 'border-line'}`}
                    >
                      <img src={a.image_url} alt={a.title} loading="lazy" className="w-full h-full object-cover" />
                      {marcado && (
                        <span className="absolute inset-0 bg-holo-3/25 grid place-items-center">
                          <Check size={18} className="text-text" aria-hidden />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
        </div>

        <button
          type="button"
          onClick={() => setPublico(p => !p)}
          aria-pressed={publico}
          className="w-full mt-5 flex items-center justify-between gap-4 p-3.5 rounded-xl bg-panel-2 border border-line text-left cursor-pointer"
        >
          <span className="flex items-start gap-3">
            {publico ? <Eye size={16} className="text-holo-3 mt-0.5" aria-hidden /> : <EyeOff size={16} className="text-muted mt-0.5" aria-hidden />}
            <span>
              <span className="block text-[13.5px] font-bold">{publico ? 'Perfil visível para todos' : 'Perfil escondido'}</span>
              <span className="block text-[12px] text-muted-2 mt-0.5">
                {publico ? 'Aparece no ranking de membros e qualquer pessoa abre seu perfil.' : 'Fora do ranking e sem página pública. Seus comentários continuam com seu @.'}
              </span>
            </span>
          </span>
          <span className={`relative w-[42px] h-6 rounded-full shrink-0 border ${publico ? 'bg-gradient-to-r from-holo-1 to-holo-2 border-transparent' : 'bg-panel border-line'}`}>
            <span className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-transform ${publico ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} />
          </span>
        </button>

        {erro && <p className="text-coral text-xs font-bold mt-4 mb-0">{erro}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || !mudou}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-holo-1 to-holo-2 text-void text-sm font-extrabold cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed min-w-[160px]"
          >
            {salvando ? 'Salvando…' : perfil.existe ? 'Salvar perfil' : 'Criar perfil público'}
          </button>
          {perfil.existe && perfil.publico && (
            <Link to={`/u/${perfil.handle}`} className="text-[13px] font-bold text-holo-3 hover:underline">
              Ver meu perfil →
            </Link>
          )}
        </div>
      </div>

      {perfil.existe && (
        <div className="bg-panel border border-line rounded-2xl p-5">
          <BarrasVitais estado={estado} />
          <div className="mt-5 pt-5 border-t border-line">
            <div className="flex items-start gap-3">
              <Moon size={16} className="text-holo-2 mt-0.5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold m-0">Modo Descanso</p>
                {estado.em_descanso ? (
                  <p className="text-[12px] text-muted-2 mt-0.5 mb-0">
                    Ativo até {dataCurta(perfil.descanso_fim)}. Sua Vitalidade não cai nesses dias.
                  </p>
                ) : (
                  <>
                    <p className="text-[12px] text-muted-2 mt-0.5 mb-3">
                      Vai viajar ou entrar em semana de provas? Congele a Vitalidade por alguns dias. Uma vez a cada 30 dias.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor="dias-descanso" className="sr-only">Dias de descanso</label>
                      <select
                        id="dias-descanso"
                        value={diasDescanso}
                        onChange={e => setDiasDescanso(Number(e.target.value))}
                        className="bg-panel-2 border border-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-holo-3"
                      >
                        {opcoesDeDias.map(d => (
                          <option key={d} value={d}>{d} dias</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={ativarDescanso}
                        disabled={ativandoDescanso}
                        className="px-4 py-2 rounded-xl border border-holo-2/50 text-[12.5px] font-bold text-text hover:bg-holo-2/10 cursor-pointer disabled:opacity-50"
                      >
                        {ativandoDescanso ? 'Ativando…' : 'Ativar descanso'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {perfil.existe && <Bloqueados token={token} />}
    </div>
  )
}

// Quem a pessoa bloqueou: os comentários dessas contas não aparecem para ela.
function Bloqueados({ token }: { token: string }) {
  const { showToast } = useToast()
  const [lista, setLista] = useState<string[] | null>(null)

  useEffect(() => {
    let ativo = true
    fetch('/api/comunidade/bloqueios', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? (r.json() as Promise<string[]>) : []))
      .then(dados => {
        if (ativo) setLista(dados)
      })
      .catch(() => {
        if (ativo) setLista([])
      })
    return () => {
      ativo = false
    }
  }, [token])

  if (!lista || lista.length === 0) return null

  const desbloquear = async (handle: string) => {
    const res = await fetch(`/api/comunidade/bloqueios/${handle}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
    if (!res || !res.ok) {
      showToast('Não foi possível desbloquear agora.', 'error')
      return
    }
    setLista(l => (l ?? []).filter(h => h !== handle))
    showToast(`@${handle} desbloqueado.`)
  }

  return (
    <div className="bg-panel border border-line rounded-2xl p-5">
      <p className="text-[13.5px] font-bold m-0">Contas bloqueadas</p>
      <p className="text-[12px] text-muted-2 mt-0.5 mb-3">Os comentários delas não aparecem para você.</p>
      <ul className="list-none m-0 p-0 flex flex-wrap gap-2">
        {lista.map(h => (
          <li key={h} className="inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-full bg-panel-2 border border-line text-[12.5px]">
            @{h}
            <button type="button" onClick={() => desbloquear(h)} className="px-2.5 py-1 rounded-full text-[11px] font-bold text-muted hover:text-text border border-line cursor-pointer">
              Desbloquear
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
