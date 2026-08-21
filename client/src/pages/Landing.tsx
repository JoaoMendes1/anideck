import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MonitorPlay, Sparkles, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FullLogo } from '../components/Brand'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll'

export default function Landing() {
  const navigate = useNavigate()

  // Mesma animação de entrada usada nas Estatísticas — o observer vive no hook.
  const addToRefs = useRevealOnScroll()

  // Roteamento Inteligente: Redireciona usuários logados
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/deck')
      }
    })
  }, [navigate])

  return (
    <div className="relative pt-10 pb-20">

      {/* HERO SECTION */}
      <section className="container max-w-[1140px] mx-auto px-5 pt-16 md:pt-24 pb-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-10 items-center text-center md:text-left">

          <div ref={addToRefs} className="reveal">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-panel border border-line text-xs font-bold text-muted tracking-wide mb-6">
              <span className="text-[13px] text-holo-3">収集</span> · SEU DECK DE ANIMES, DO SEU JEITO
            </span>
            <h1 className="font-anton uppercase text-[clamp(2.4rem,6vw,4rem)] leading-[1.02] mb-5">
              Todo anime que <span className="text-holo">importa</span>, guardado do seu jeito.
            </h1>
            <p className="text-muted text-[16.5px] leading-relaxed max-w-[480px] mx-auto md:mx-0 mb-8">
              Catálogo completo da AniList, com a curadoria, as notas e a organização que só fazem sentido pra você — numa interface que você não vai ter vergonha de usar.
            </p>
            <div className="flex gap-3.5 flex-wrap justify-center md:justify-start">
              <Link to="/login" className="font-extrabold text-[14.5px] px-7 py-3.5 rounded-full text-void bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 flex items-center gap-2 hover:-translate-y-0.5 transition-transform">
                Começar meu Deck <MonitorPlay size={16} />
              </Link>
              <Link to="/rankings" className="font-bold text-[14.5px] px-6 py-3.5 rounded-full border-[1.5px] border-line text-text hover:border-holo-3 transition-colors">
                Ver rankings
              </Link>
            </div>

            <div className="flex gap-7 mt-11 flex-wrap justify-center md:justify-start">
              <div><b className="block font-anton text-xl uppercase">28 mil+</b><span className="text-[11px] text-muted-2 font-bold">TÍTULOS DA ANILIST</span></div>
              <div><b className="block font-anton text-xl uppercase">Em Dia</b><span className="text-[11px] text-muted-2 font-bold">PRA QUEM ACOMPANHA</span></div>
              <div><b className="block font-anton text-xl uppercase">Streaming</b><span className="text-[11px] text-muted-2 font-bold">ONDE ASSISTIR</span></div>
            </div>
          </div>

          <div ref={addToRefs} className="hero-visual reveal hidden md:flex" style={{ transitionDelay: '.1s' }}>
            <div className="stack-card c1"></div>
            <div className="stack-card c2"></div>
            <div className="stack-card c3 relative p-4 flex flex-col justify-between">
              <span className="inline-block font-anton text-[13px] px-2.5 py-1 rounded-lg bg-gold/15 text-gold border border-gold/40 self-start">TOP #1</span>
              <div>
                <div className="font-anton text-[15px] uppercase">Sua próxima obsessão</div>
                <div className="text-[11px] text-muted font-mono mt-1">AÇÃO · FANTASIA · 24 EP</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* RECURSOS */}
      <section ref={addToRefs} className="container max-w-[1140px] mx-auto px-5 py-24 reveal">
        <div className="text-center mb-11">
          <div className="font-mono text-[11.5px] text-holo-3 tracking-[0.14em] mb-2.5">// O QUE VEM JUNTO</div>
          <h2 className="font-anton uppercase text-[clamp(1.5rem,3.4vw,2.2rem)] mb-2.5">Mais do que uma lista</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[820px] mx-auto md:max-w-none">
          <div className="bg-panel border border-line rounded-[18px] p-6">
            <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br from-holo-1/20 to-holo-3/20 text-holo-3">
              <Layers size={22} />
            </div>
            <h3 className="text-[16.5px] font-bold mb-2">Dashboard pessoal</h3>
            <p className="text-muted text-sm leading-relaxed">Status customizados (Assistindo, Em Dia, Dropado) com anotações e notas secretas que só você vê.</p>
          </div>
          <div className="bg-panel border border-line rounded-[18px] p-6">
            <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br from-holo-1/20 to-holo-3/20 text-holo-3">
              <MonitorPlay size={22} />
            </div>
            <h3 className="text-[16.5px] font-bold mb-2">Onde assistir</h3>
            <p className="text-muted text-sm leading-relaxed">Link direto pras plataformas de streaming oficiais (Crunchyroll, Netflix, etc) já mapeadas pela API.</p>
          </div>
          <div className="bg-panel border border-line rounded-[18px] p-6">
            <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br from-holo-1/20 to-holo-3/20 text-holo-3">
              <Sparkles size={22} />
            </div>
            <h3 className="text-[16.5px] font-bold mb-2">Curadoria híbrida</h3>
            <p className="text-muted text-sm leading-relaxed">Títulos principais curados à mão com sinopses revisadas, misturados ao imenso catálogo da AniList.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer ref={addToRefs} className="container max-w-[1140px] mx-auto px-5 pt-20 pb-10 text-center border-t border-line mt-5 reveal">
        <FullLogo className="w-full max-w-[340px] mb-8" />
        <h2 className="font-anton uppercase text-[clamp(1.8rem,4.5vw,2.6rem)] mb-4">Comece seu <span className="text-holo">Deck</span> hoje</h2>
        <p className="text-muted max-w-[440px] mx-auto mb-8 leading-relaxed">Sem anúncio, sem site datado. Só o catálogo que você ama, do jeito que deveria ter sido desde sempre.</p>
        <Link to="/login" className="font-extrabold text-[14.5px] px-8 py-4 rounded-full text-void bg-gradient-to-r from-holo-1 to-holo-3 inline-block hover:opacity-90 transition-opacity">
          Criar minha conta
        </Link>

        <div className="mt-16 pt-5 border-t border-line flex flex-col md:flex-row justify-between items-center gap-4 text-[12.5px] text-muted-2">
          <p>© 2026 AniDeck — JVM Systems</p>
          <div className="flex gap-5">
            <a href="https://github.com/JoaoMendes1" target="_blank" className="hover:text-text transition-colors">GitHub</a>
            <span className="cursor-default">Powered by AniList GraphQL</span>
          </div>
        </div>
      </footer>

    </div>
  )
}