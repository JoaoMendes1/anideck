import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MonitorPlay, Sparkles, Layers, Compass, Trophy, CalendarDays,
  BarChart3, ShieldAlert, Mail,
} from 'lucide-react'
import { FullLogo } from '../components/Brand'
import SolicitarConviteBetaModal from '../components/SolicitarConviteBetaModal'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll'
import { miniatura } from '../lib/miniatura'
import { gradienteDoCard } from '../lib/deckHelpers'
import type { CuratedAnime } from '../types/curation'

export default function Landing() {
  const addToRefs = useRevealOnScroll()
  const [destaques, setDestaques] = useState<CuratedAnime[]>([])
  const [modalConviteAberto, setModalConviteAberto] = useState(false)

  useEffect(() => {
    let ativo = true
    fetch('/api/curation?destaques=true')
      .then(res => (res.ok ? res.json() : []))
      .then((dados: CuratedAnime[]) => {
        if (ativo && Array.isArray(dados)) {
          setDestaques(dados.slice(0, 10))
        }
      })
      .catch(() => {})
    return () => { ativo = false }
  }, [])

  const cardTopo = destaques[0]
  const cardMeio = destaques[1]
  const cardFundo = destaques[2]

  return (
    <div className="relative pt-8 pb-20">
      {/* AVISO DE VERSÃO BETA / ACESSO LIMITADO */}
      <div className="container max-w-[1140px] mx-auto px-5 pt-6">
        <div className="rounded-2xl border border-gold/35 bg-gradient-to-r from-gold/10 via-panel to-holo-2/10 px-4 py-3.5 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-gold/20 border border-gold/40 text-gold font-mono text-[10px] font-extrabold uppercase tracking-wider shrink-0">
              Beta Fechado
            </span>
            <p className="text-xs sm:text-[13px] text-muted leading-snug">
              <strong className="text-text">Projeto em versão Beta com acesso limitado.</strong> Catálogo, Busca, Detalhes e Rankings são abertos sem login — para criar um Deck pessoal no Beta, solicite um convite.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalConviteAberto(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-panel-2 border border-gold/40 text-gold hover:bg-gold/15 text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            <Mail size={13} /> Solicitar convite Beta
          </button>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="container max-w-[1140px] mx-auto px-5 pt-10 md:pt-16 pb-14 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-10 items-center text-center md:text-left">

          <div ref={addToRefs} className="reveal">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-panel border border-line text-xs font-bold text-muted tracking-wide mb-6">
              <span className="text-[13px] text-holo-3">収集</span> · SEU DECK DE ANIMES, DO SEU JEITO
            </span>
            <h1 className="font-anton uppercase text-[clamp(2.4rem,6vw,4rem)] leading-[1.02] mb-5">
              Todo anime que <span className="text-holo">importa</span>, guardado do seu jeito.
            </h1>
            <p className="text-muted text-[16.5px] leading-relaxed max-w-[490px] mx-auto md:mx-0 mb-8">
              Catálogo completo da AniList com curadoria editorial em português, controle de episódios, agenda viva no seu fuso e estatísticas de gosto — numa interface de colecionador.
            </p>
            <div className="flex gap-3 flex-wrap justify-center md:justify-start">
              <Link
                to="/descobrir"
                className="font-extrabold text-[14px] px-6 py-3.5 rounded-full text-void bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 flex items-center gap-2 hover:-translate-y-0.5 transition-transform"
              >
                <Compass size={16} /> Explorar Catálogo
              </Link>
              <Link
                to="/rankings"
                className="font-bold text-[14px] px-6 py-3.5 rounded-full border-[1.5px] border-line bg-panel text-text hover:border-holo-3 transition-colors flex items-center gap-2"
              >
                <Trophy size={15} className="text-gold" /> Ver Rankings
              </Link>
              <Link
                to="/login"
                className="font-bold text-[14px] px-6 py-3.5 rounded-full border-[1.5px] border-line text-muted hover:text-text hover:border-holo-2 transition-colors"
              >
                Entrar no Beta
              </Link>
            </div>

            <div className="flex gap-7 mt-11 flex-wrap justify-center md:justify-start">
              <div><b className="block font-anton text-xl uppercase">28 mil+</b><span className="text-[11px] text-muted-2 font-bold">TÍTULOS DA ANILIST</span></div>
              <div><b className="block font-anton text-xl uppercase">Curadoria</b><span className="text-[11px] text-muted-2 font-bold">SINOPSES E TAGS EM PT-BR</span></div>
              <div><b className="block font-anton text-xl uppercase">Streaming</b><span className="text-[11px] text-muted-2 font-bold">LINKS OFICIAIS MAPEADOS</span></div>
            </div>
          </div>

          {/* PILHA DE CARDS HOLOGRÁFICOS VIVOS (#142) */}
          <div ref={addToRefs} className="hero-visual reveal hidden md:flex" style={{ transitionDelay: '.1s' }}>
            <div className="stack-card c1 overflow-hidden">
              {cardFundo?.custom_cover_image && (
                <img
                  src={miniatura(cardFundo.custom_cover_image)}
                  alt=""
                  className="w-full h-full object-cover opacity-55"
                />
              )}
            </div>
            <div className="stack-card c2 overflow-hidden">
              {cardMeio?.custom_cover_image && (
                <img
                  src={miniatura(cardMeio.custom_cover_image)}
                  alt=""
                  className="w-full h-full object-cover opacity-75"
                />
              )}
            </div>
            <Link
              to={cardTopo ? `/anime/${cardTopo.mal_id}` : '/descobrir'}
              className="stack-card c3 relative p-4 flex flex-col justify-between overflow-hidden group"
            >
              {cardTopo?.custom_cover_image && (
                <>
                  <img
                    src={miniatura(cardTopo.custom_cover_image)}
                    alt={cardTopo.custom_title}
                    className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-void via-void/45 to-transparent" />
                </>
              )}
              <span className="relative z-10 inline-block font-anton text-[12px] px-2.5 py-1 rounded-lg bg-gold/20 text-gold border border-gold/40 backdrop-blur-md self-start uppercase tracking-wider">
                ★ Destaque Curado
              </span>
              <div className="relative z-10">
                <div className="font-anton text-[16px] uppercase text-text leading-tight line-clamp-2">
                  {cardTopo?.custom_title || 'Sua próxima obsessão'}
                </div>
                <div className="text-[10.5px] text-holo-3 font-mono mt-1 uppercase truncate">
                  {cardTopo?.custom_tags?.slice(0, 3).join(' · ') || 'AÇÃO · FANTASIA · CURADORIA'}
                </div>
              </div>
            </Link>
          </div>

        </div>
      </section>

      {/* VITRINE VIVA DE OBRAS CURADAS (SEM LOGIN) */}
      {destaques.length > 0 && (
        <section ref={addToRefs} className="container max-w-[1140px] mx-auto px-5 py-8 reveal">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <div className="font-mono text-[11px] text-holo-3 tracking-[0.14em] uppercase mb-1">
                // EXPLORE AGORA SEM CONTA
              </div>
              <h2 className="font-anton uppercase text-[clamp(1.4rem,3vw,1.9rem)] m-0">
                Destaques da Curadoria
              </h2>
            </div>
            <Link to="/descobrir" className="font-mono text-xs text-holo-3 hover:underline uppercase tracking-wider">
              Abrir catálogo →
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-5 px-5 sm:mx-0 sm:px-0 pb-2">
            {destaques.map((anime, index) => (
              <Link
                key={anime.id || anime.mal_id}
                to={`/anime/${anime.mal_id}`}
                className="group shrink-0 w-[152px] sm:w-[176px] snap-start"
              >
                <div
                  className={`relative aspect-[2/3] rounded-[14px] overflow-hidden border border-line bg-panel ${gradienteDoCard(index)} transition-transform group-hover:-translate-y-1`}
                >
                  {anime.custom_cover_image && (
                    <img
                      src={miniatura(anime.custom_cover_image)}
                      alt={anime.custom_title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                </div>
                <h3 className="mt-2 text-[12.5px] font-bold leading-snug line-clamp-2 text-text group-hover:text-holo-3 transition-colors">
                  {anime.custom_title}
                </h3>
                {anime.custom_format && (
                  <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-widest text-muted-2">
                    {anime.custom_format}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* OS 4 PILARES DO PRODUTO */}
      <section ref={addToRefs} className="container max-w-[1140px] mx-auto px-5 py-20 reveal">
        <div className="text-center mb-11">
          <div className="font-mono text-[11.5px] text-holo-3 tracking-[0.14em] mb-2.5">// POR DENTRO DO ANIDECK</div>
          <h2 className="font-anton uppercase text-[clamp(1.5rem,3.4vw,2.2rem)] mb-2.5">Mais do que uma lista</h2>
          <p className="text-muted text-sm max-w-[540px] mx-auto">
            Projetado para quem acompanha lançamentos toda semana e quer entender o próprio gosto sem planilhas feias.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-panel border border-line rounded-[18px] p-6">
            <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br from-holo-1/20 to-holo-3/20 text-holo-3">
              <Layers size={22} />
            </div>
            <h3 className="text-[16px] font-bold mb-2">Coleção Foil &amp; Progresso</h3>
            <p className="text-muted text-sm leading-relaxed">
              Animes nota 9.5+ ganham efeito holográfico Foil no seu Deck, com marcação episódio a episódio e importação direta do MyAnimeList.
            </p>
          </div>

          <div className="bg-panel border border-line rounded-[18px] p-6">
            <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br from-holo-1/20 to-holo-3/20 text-holo-2">
              <BarChart3 size={22} />
            </div>
            <h3 className="text-[16px] font-bold mb-2">Raio-X do Meu Gosto</h3>
            <p className="text-muted text-sm leading-relaxed">
              Gráfico de Volume × Satisfação, afinidade separada entre Demografia, Gênero e Tags Temáticas, Streak e card compartilhável.
            </p>
          </div>

          <div className="bg-panel border border-line rounded-[18px] p-6">
            <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br from-holo-1/20 to-holo-3/20 text-holo-1">
              <CalendarDays size={22} />
            </div>
            <h3 className="text-[16px] font-bold mb-2">Agenda Viva &amp; Push</h3>
            <p className="text-muted text-sm leading-relaxed">
              Calendário semanal no fuso do seu navegador com contagem regressiva e notificações Web Push nativas quando sai episódio novo.
            </p>
          </div>

          <div className="bg-panel border border-line rounded-[18px] p-6">
            <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br from-holo-1/20 to-holo-3/20 text-gold">
              <Sparkles size={22} />
            </div>
            <h3 className="text-[16px] font-bold mb-2">Ranking Bayesiano</h3>
            <p className="text-muted text-sm leading-relaxed">
              Nota ponderada que cruza a recepção global da AniList com os votos da comunidade local e links oficiais de Onde Assistir.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer ref={addToRefs} className="container max-w-[1140px] mx-auto px-5 pt-16 pb-10 text-center border-t border-line mt-5 reveal">
        <FullLogo className="w-full max-w-[320px] mb-6" />
        <h2 className="font-anton uppercase text-[clamp(1.8rem,4.5vw,2.6rem)] mb-3">
          Quer testar o <span className="text-holo">AniDeck</span>?
        </h2>
        <p className="text-muted max-w-[480px] mx-auto mb-7 text-sm leading-relaxed">
          O projeto está em fase Beta de desenvolvimento. Você pode navegar livremente pelo catálogo ou solicitar um convite para criar seu Deck.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/descobrir"
            className="font-extrabold text-[14px] px-7 py-3.5 rounded-full text-void bg-gradient-to-r from-holo-1 to-holo-3 inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <MonitorPlay size={16} /> Navegar sem login
          </Link>
          <button
            type="button"
            onClick={() => setModalConviteAberto(true)}
            className="font-bold text-[14px] px-6 py-3.5 rounded-full border border-gold/40 text-gold hover:bg-gold/10 inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ShieldAlert size={15} /> Solicitar convite Beta
          </button>
        </div>

        <div className="mt-14 pt-6 border-t border-line flex flex-col md:flex-row justify-between items-center gap-4 text-[12px] text-muted-2">
          <p>© 2026 AniDeck — JVM Systems • Go + React + TypeScript + Supabase RLS</p>
          <div className="flex gap-5 items-center">
            <Link to="/descobrir" className="hover:text-text transition-colors">Catálogo</Link>
            <Link to="/rankings" className="hover:text-text transition-colors">Rankings</Link>
            <Link to="/privacidade" className="hover:text-text transition-colors">Privacidade</Link>
            <a href="https://github.com/JoaoMendes1/anideck" target="_blank" rel="noreferrer" className="hover:text-text transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

      <SolicitarConviteBetaModal
        isOpen={modalConviteAberto}
        onClose={() => setModalConviteAberto(false)}
      />

    </div>
  )
}
