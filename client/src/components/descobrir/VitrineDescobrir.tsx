// client/src/components/descobrir/VitrineDescobrir.tsx
// O que a página Descobrir mostra antes de qualquer busca: atalhos, os rótulos da taxonomia
// como portas de entrada e os destaques da curadoria. Antes, esse espaço era uma frase.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Flame, Sparkles } from 'lucide-react'
import type { Rotulo } from '../../hooks/useRotulos'
import type { CuratedAnime } from '../../types/curation'
import { buscarDestaquesDaCuradoria } from '../../lib/destaques'
import { lerDaMemoria } from '../../lib/cacheDeTela'
import { miniatura } from '../../lib/miniatura'
import SecaoEmAltaComunidade from '../rankings/SecaoEmAltaComunidade'

// Escritas por extenso: o Tailwind não enxerga classe montada em tempo de execução.
const FUNDOS = [
  'from-holo-1/25 via-panel to-holo-2/10 hover:border-holo-1/60',
  'from-holo-3/25 via-panel to-holo-2/10 hover:border-holo-3/60',
  'from-gold/20 via-panel to-coral/10 hover:border-gold/60',
  'from-holo-2/30 via-panel to-holo-3/10 hover:border-holo-2/60',
  'from-coral/20 via-panel to-holo-1/10 hover:border-coral/60',
  'from-green/20 via-panel to-holo-3/10 hover:border-green/60',
]

interface Props {
  rotulos: Rotulo[]
  ano: number
  aoEscolherRotulo: (nome: string) => void
  aoVerLancamentos: () => void
  aoVerAno: () => void
}

function Titulo({ children }: { children: string }) {
  return <h2 className="font-anton uppercase text-lg sm:text-xl tracking-wide m-0 mb-3">{children}</h2>
}

export default function VitrineDescobrir({ rotulos, ano, aoEscolherRotulo, aoVerLancamentos, aoVerAno }: Props) {
  const [destaques, setDestaques] = useState<CuratedAnime[]>(() => lerDaMemoria<CuratedAnime[]>('vitrine') ?? [])

  useEffect(() => {
    let cancelado = false
    buscarDestaquesDaCuradoria()
      .then(lista => { if (!cancelado) setDestaques(lista.slice(0, 14)) })
      .catch(() => {})
    return () => { cancelado = true }
  }, [])

  const generos = rotulos.filter(r => r.camada === 'genero')
  const demografias = rotulos.filter(r => r.camada === 'demografia')
  const temas = rotulos.filter(r => r.camada === 'tag_tematica').slice(0, 24)

  return (
    <div className="flex flex-col gap-10 pt-2">
      <section className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={aoVerLancamentos}
          className="group relative overflow-hidden rounded-3xl border border-coral/30 bg-gradient-to-br from-coral/20 via-panel to-panel p-5 sm:p-6 text-left transition-colors hover:border-coral/70 cursor-pointer"
        >
          <Flame size={96} aria-hidden className="absolute -right-4 -bottom-5 text-coral opacity-15 transition-transform duration-300 group-hover:scale-110" />
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-coral">No ar agora</span>
          <span className="block font-anton uppercase text-2xl sm:text-3xl mt-1">Em lançamento</span>
          <span className="block text-sm text-muted mt-1">O que está saindo episódio novo toda semana.</span>
        </button>
        <button
          type="button"
          onClick={aoVerAno}
          className="group relative overflow-hidden rounded-3xl border border-holo-3/30 bg-gradient-to-br from-holo-3/20 via-panel to-panel p-5 sm:p-6 text-left transition-colors hover:border-holo-3/70 cursor-pointer"
        >
          <CalendarDays size={96} aria-hidden className="absolute -right-4 -bottom-5 text-holo-3 opacity-15 transition-transform duration-300 group-hover:scale-110" />
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-holo-3">Safra do ano</span>
          <span className="block font-anton uppercase text-2xl sm:text-3xl mt-1">Estreias de {ano}</span>
          <span className="block text-sm text-muted mt-1">Tudo que estreou este ano, do mais popular ao menos.</span>
        </button>
      </section>

      {generos.length > 0 && (
        <section>
          <Titulo>Explorar por gênero</Titulo>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-2.5 sm:gap-3">
            {generos.map((r, i) => (
              <button
                key={r.nome}
                type="button"
                onClick={() => aoEscolherRotulo(r.nome)}
                className={`group relative overflow-hidden h-20 sm:h-24 rounded-2xl border border-line bg-gradient-to-br ${FUNDOS[i % FUNDOS.length]} px-4 text-left transition-colors cursor-pointer`}
              >
                <span aria-hidden className="absolute -right-1 -bottom-4 font-anton uppercase text-6xl leading-none text-text opacity-[0.06] transition-transform duration-300 group-hover:scale-110 whitespace-nowrap">
                  {r.nome.slice(0, 2)}
                </span>
                <span className="relative font-anton uppercase text-base sm:text-lg tracking-wide">{r.nome}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <SecaoEmAltaComunidade compacta />

      {destaques.length > 0 && (
        <section>
          <div className="flex items-end justify-between gap-3 mb-3">
            <h2 className="font-anton uppercase text-lg sm:text-xl tracking-wide m-0 flex items-center gap-2">
              <Sparkles size={17} className="text-holo-1" aria-hidden /> Escolhas da curadoria
            </h2>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-2">Sinopse e episódios em português</span>
          </div>
          <div className="flex gap-4 overflow-x-auto custom-scrollbar snap-x pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
            {destaques.map(obra => (
              <Link key={obra.mal_id} to={`/anime/${obra.mal_id}`} className="group shrink-0 w-36 sm:w-44 snap-start">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-line bg-panel-2 transition-transform duration-200 group-hover:-translate-y-1.5">
                  {obra.custom_cover_image && (
                    <img src={miniatura(obra.custom_cover_image)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                </div>
                <h3 className="mt-2 text-sm font-bold leading-snug line-clamp-2 group-hover:text-holo-3 transition-colors">{obra.custom_title}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(demografias.length > 0 || temas.length > 0) && (
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {demografias.length > 0 && (
            <div>
              <Titulo>Por demografia</Titulo>
              <div className="flex flex-wrap gap-2">
                {demografias.map(r => (
                  <button key={r.nome} type="button" onClick={() => aoEscolherRotulo(r.nome)} className="px-4 py-2 rounded-full border border-holo-2/40 bg-holo-2/10 text-sm font-bold transition-colors hover:border-holo-2 hover:bg-holo-2/20 cursor-pointer">
                    {r.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
          {temas.length > 0 && (
            <div>
              <Titulo>Por tema</Titulo>
              <div className="flex flex-wrap gap-2">
                {temas.map(r => (
                  <button key={r.nome} type="button" onClick={() => aoEscolherRotulo(r.nome)} className="px-3.5 py-1.5 rounded-full border border-line bg-panel-2 text-sm font-bold text-muted transition-colors hover:border-holo-3 hover:text-text cursor-pointer">
                    {r.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
