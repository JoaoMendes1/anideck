// client/src/pages/BemVindo.tsx
// Configuração inicial de quem acabou de criar a conta: perfil, o que está assistindo, gosto,
// personagem e a recompensa de boas-vindas. Todo passo pode ser pulado e nada bloqueia o app:
// "Pular tudo" leva direto à Início. O passo atual fica nos metadados da conta, então quem
// fecha a aba volta de onde parou, em qualquer aparelho.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Gift, Loader2, Sparkles, UserRound, Tv, Heart, Swords } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSessao } from '../contexts/SessaoContext'
import { useToast } from '../contexts/ToastContext'
import { useRotulos } from '../hooks/useRotulos'
import { validarHandle } from '../lib/comunidade'
import { salvarPreferenciasDeGosto } from '../lib/preferenciasGosto'
import { TelaDespertar } from './Personagem'
import IconeAniCoin from '../components/IconeAniCoin'
import { PASSOS_BEM_VINDO, sugerirHandle, type PassoBemVindo } from '../lib/bemVindo'
import type { AnimeDaApi } from '../types/anime'

const GENEROS_FALLBACK = [
  'Ação', 'Aventura', 'Comédia', 'Drama', 'Fantasia', 'Ficção Científica', 'Mistério',
  'Romance', 'Slice of Life', 'Sobrenatural', 'Esportes', 'Isekai', 'Shounen', 'Seinen',
]

const ICONES: Record<PassoBemVindo, typeof Sparkles> = {
  perfil: UserRound,
  assistindo: Tv,
  gosto: Heart,
  personagem: Swords,
  recompensa: Gift,
}

export default function BemVindo() {
  const { session } = useSessao()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { rotulos } = useRotulos()
  const metadados = session?.user.user_metadata ?? {}
  const token = session?.access_token ?? ''
  const userId = session?.user.id ?? ''

  const [passo, setPasso] = useState<PassoBemVindo>(
    PASSOS_BEM_VINDO.includes(metadados.configuracao_passo) ? metadados.configuracao_passo : 'perfil',
  )
  const indice = PASSOS_BEM_VINDO.indexOf(passo)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Passo 1: perfil
  const [nome, setNome] = useState<string>(metadados.display_name ?? '')
  const [handle, setHandle] = useState<string>(() => sugerirHandle(metadados.display_name ?? ''))
  const [publico, setPublico] = useState(true)

  // Passo 2: o que está assistindo
  const [temporada, setTemporada] = useState<AnimeDaApi[] | null>(null)
  const [escolhidos, setEscolhidos] = useState<number[]>([])

  // Passo 3: gosto
  const [favoritos, setFavoritos] = useState<string[]>([])
  const generos = useMemo(
    () => (rotulos.length > 0 ? rotulos.filter(r => r.camada === 'genero').map(r => r.nome) : GENEROS_FALLBACK),
    [rotulos],
  )

  // Passo 5: recompensa
  const [premio, setPremio] = useState<{ ganhou: boolean; anicoins?: number; titulo?: string } | null>(null)

  useEffect(() => {
    if (passo !== 'assistindo' || temporada) return
    fetch('/api/search?status=RELEASING&sort=POPULARITY_DESC&perPage=24')
      .then(r => (r.ok ? r.json() : { data: [] }))
      .then(j => setTemporada(Array.isArray(j.data) ? j.data : []))
      .catch(() => setTemporada([]))
  }, [passo, temporada])

  useEffect(() => {
    if (passo !== 'recompensa' || premio) return
    supabase.rpc('resgatar_boas_vindas').then(({ data, error }) => {
      setPremio(error ? { ganhou: false } : (data as typeof premio))
      if (!error && data?.ganhou) window.dispatchEvent(new Event('anideck:cristais-atualizados'))
    })
  }, [passo, premio])

  const irPara = async (proximo: PassoBemVindo | 'fim') => {
    setErro(null)
    if (proximo === 'fim') {
      await supabase.auth.updateUser({ data: { configuracao_inicial: 'concluida', configuracao_passo: null } })
      navigate('/', { replace: true })
      return
    }
    setPasso(proximo)
    window.scrollTo({ top: 0 })
    // Guardar o passo não pode travar a tela: se falhar, só perde o "voltar de onde parou".
    supabase.auth.updateUser({ data: { configuracao_passo: proximo } }).catch(() => undefined)
  }
  const avancar = () => irPara(PASSOS_BEM_VINDO[indice + 1] ?? 'fim')

  const salvarPerfil = async () => {
    const checagem = validarHandle(handle)
    if (checagem.erro) return setErro(checagem.erro)
    if (nome.trim().length < 1) return setErro('Escolha um nome de exibição.')
    setOcupado(true)
    try {
      const res = await fetch('/api/comunidade/eu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ handle: checagem.handle, nome: nome.trim(), bio: '', vitrine: [], publico, mostrar_atividade: true }),
      })
      if (!res.ok) return setErro((await res.text()).trim() || 'Não foi possível salvar agora.')
      await avancar()
    } catch {
      setErro('Sem conexão. Tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  const salvarAssistindo = async () => {
    if (escolhidos.length === 0) return avancar()
    setOcupado(true)
    const cabecalho = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    const resultados = await Promise.allSettled(
      escolhidos.map(mal_id =>
        fetch('/api/entries', {
          method: 'POST',
          headers: cabecalho,
          body: JSON.stringify({ mal_id, tipo: 'anime', status: 'Assistindo', nota: null, anotacao: '', is_favorite: false }),
        }),
      ),
    )
    setOcupado(false)
    const ok = resultados.filter(r => r.status === 'fulfilled' && r.value.ok).length
    if (ok > 0) {
      window.dispatchEvent(new CustomEvent('anideck:entrada-atualizada'))
      showToast(`${ok} ${ok === 1 ? 'anime entrou' : 'animes entraram'} no seu deck.`)
    }
    await avancar()
  }

  const salvarGosto = async () => {
    if (favoritos.length === 0) return avancar()
    setOcupado(true)
    try {
      await salvarPreferenciasDeGosto(userId, { favoritos, bloqueados: [], tutorialConcluido: true })
    } catch {
      // Gosto é ajuste fino das recomendações: falhar aqui não deve prender a pessoa.
    }
    setOcupado(false)
    await avancar()
  }

  const botaoPrincipal = 'inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-void bg-gradient-to-r from-holo-1 to-holo-3 disabled:opacity-60 cursor-pointer'
  const botaoPular = 'w-full sm:w-auto px-4 py-3 rounded-2xl text-sm font-bold text-muted hover:text-text cursor-pointer'

  return (
    <div className="min-h-[100dvh] w-full max-w-2xl mx-auto px-4 pt-6 pb-56">
      {/* Progresso */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-muted uppercase tracking-widest">Passo {indice + 1} de {PASSOS_BEM_VINDO.length}</span>
        <button type="button" onClick={() => irPara('fim')} className="font-mono text-xs text-muted hover:text-text cursor-pointer">
          Pular tudo
        </button>
      </div>
      <div className="flex gap-1.5 mb-8" aria-hidden>
        {PASSOS_BEM_VINDO.map((p, i) => (
          <span key={p} className={`h-1.5 flex-1 rounded-full ${i <= indice ? 'bg-gradient-to-r from-holo-1 to-holo-3' : 'bg-panel-2'}`} />
        ))}
      </div>

      <header className="mb-6">
        {(() => {
          const Icone = ICONES[passo]
          return <Icone size={28} className="text-holo-3 mb-3" aria-hidden />
        })()}
        <h1 className="font-anton text-3xl uppercase m-0">
          {passo === 'perfil' && 'Quem é você?'}
          {passo === 'assistindo' && 'O que você está assistindo?'}
          {passo === 'gosto' && 'Do que você gosta?'}
          {passo === 'personagem' && 'O despertar'}
          {passo === 'recompensa' && 'Tudo pronto!'}
        </h1>
        <p className="text-sm text-muted mt-2 mb-0">
          {passo === 'perfil' && 'Seu nome e seu @ aparecem nos comentários, nos rankings e no seu perfil.'}
          {passo === 'assistindo' && 'Toque nos animes da temporada que você acompanha. Eles entram no seu deck como Assistindo.'}
          {passo === 'gosto' && 'Escolha alguns gêneros. As recomendações da Início partem daqui.'}
          {passo === 'personagem' && 'Cada episódio que você assiste fortalece um herói. Escolha o seu.'}
          {passo === 'recompensa' && 'Seu AniDeck está montado. Marque o próximo episódio que assistir para ganhar o primeiro XP.'}
        </p>
      </header>

      {passo === 'perfil' && (
        <div className="space-y-4">
          <label className="block">
            <span className="block text-xs font-bold text-muted mb-1">Nome de exibição</span>
            <input value={nome} maxLength={40} onChange={e => setNome(e.target.value)} className="w-full bg-panel border border-line rounded-xl px-4 py-3 text-text" />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-muted mb-1">Seu @</span>
            <div className="flex items-center bg-panel border border-line rounded-xl px-4">
              <span className="text-muted">@</span>
              <input value={handle} maxLength={20} onChange={e => setHandle(e.target.value.toLowerCase())} className="flex-1 bg-transparent px-1 py-3 text-text outline-none" />
            </div>
          </label>
          <button type="button" onClick={() => setPublico(p => !p)} aria-pressed={publico} className="w-full flex items-center justify-between gap-4 p-4 rounded-xl bg-panel border border-line text-left cursor-pointer">
            <span>
              <span className="block text-sm font-bold">{publico ? 'Perfil público' : 'Perfil privado'}</span>
              <span className="block text-xs text-muted mt-0.5">{publico ? 'Outros jogadores podem ver seu perfil, seguir você e duelar.' : 'Só você vê seu perfil. Dá para mudar depois nas Configurações.'}</span>
            </span>
            <span className={`relative w-11 h-6 rounded-full shrink-0 ${publico ? 'bg-gradient-to-r from-holo-1 to-holo-3' : 'bg-panel-2 border border-line'}`}>
              <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-transform ${publico ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
            </span>
          </button>
        </div>
      )}

      {passo === 'assistindo' && (
        temporada === null ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {Array.from({ length: 12 }, (_, i) => <div key={i} className="aspect-[2/3] rounded-xl bg-panel-2 animate-pulse" />)}
          </div>
        ) : temporada.length === 0 ? (
          <p className="text-sm text-muted">Não foi possível carregar a temporada agora. Pule este passo e adicione pela Busca depois.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {temporada.map(a => {
              const marcado = escolhidos.includes(a.mal_id)
              return (
                <button
                  key={a.mal_id}
                  type="button"
                  aria-pressed={marcado}
                  onClick={() => setEscolhidos(l => (marcado ? l.filter(x => x !== a.mal_id) : [...l, a.mal_id]))}
                  className={`relative text-left rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${marcado ? 'border-holo-3 scale-[0.97]' : 'border-transparent'}`}
                >
                  <img src={a.images?.jpg?.image_url} alt="" loading="lazy" className="w-full aspect-[2/3] object-cover bg-panel-2" />
                  <span className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-void to-transparent text-[11px] font-bold leading-tight line-clamp-2">{a.title}</span>
                  {marcado && (
                    <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-holo-3 text-void grid place-items-center"><Check size={14} /></span>
                  )}
                </button>
              )
            })}
          </div>
        )
      )}

      {passo === 'gosto' && (
        <div className="flex flex-wrap gap-2">
          {generos.map(g => {
            const marcado = favoritos.includes(g)
            return (
              <button
                key={g}
                type="button"
                aria-pressed={marcado}
                onClick={() => setFavoritos(l => (marcado ? l.filter(x => x !== g) : [...l, g]))}
                className={`px-4 py-2 rounded-full border text-sm font-bold cursor-pointer ${marcado ? 'bg-holo-3/15 border-holo-3 text-holo-3' : 'bg-panel border-line text-muted'}`}
              >
                {marcado && <Check size={13} className="inline mr-1" aria-hidden />}
                {g}
              </button>
            )
          })}
        </div>
      )}

      {passo === 'personagem' && <TelaDespertar aoDespertar={() => avancar()} />}

      {passo === 'recompensa' && (
        <div className="rounded-3xl border border-gold/40 bg-gold/10 p-6 text-center">
          {premio === null ? (
            <Loader2 className="mx-auto animate-spin text-gold" aria-label="Carregando" />
          ) : premio.ganhou ? (
            <>
              <Sparkles className="mx-auto text-gold mb-2" size={32} aria-hidden />
              <p className="m-0 font-anton text-2xl uppercase text-gold inline-flex items-center gap-2">
                +{premio.anicoins} <IconeAniCoin size={22} />
              </p>
              <p className="m-0 mt-2 text-sm text-text">e o título <b className="text-gold">{premio.titulo}</b>, para equipar na Guilda.</p>
            </>
          ) : (
            <p className="m-0 text-sm text-muted">Bem-vindo de volta! A recompensa de boas-vindas já foi entregue nesta conta.</p>
          )}
        </div>
      )}

      {erro && <p className="mt-4 text-sm text-coral font-bold">{erro}</p>}

      {/* Ações fixas embaixo, acima da barra do celular */}
      {passo !== 'personagem' && (
        <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-40 bg-void/90 backdrop-blur border-t border-line px-4 py-3">
          <div className="max-w-2xl mx-auto flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {passo !== 'recompensa' && (
              <button type="button" onClick={avancar} className={botaoPular}>Pular este passo</button>
            )}
            <button
              type="button"
              disabled={ocupado}
              onClick={
                passo === 'perfil' ? salvarPerfil
                  : passo === 'assistindo' ? salvarAssistindo
                    : passo === 'gosto' ? salvarGosto
                      : () => irPara('fim')
              }
              className={botaoPrincipal}
            >
              {ocupado && <Loader2 size={16} className="animate-spin" aria-hidden />}
              {passo === 'recompensa' ? 'Ir para a Início' : passo === 'assistindo' && escolhidos.length > 0 ? `Adicionar ${escolhidos.length} e continuar` : 'Continuar'}
              {!ocupado && <ChevronRight size={16} aria-hidden />}
            </button>
          </div>
        </div>
      )}
      {passo === 'personagem' && (
        <button type="button" onClick={avancar} className={`${botaoPular} mt-4`}>Fazer isso depois</button>
      )}
    </div>
  )
}
