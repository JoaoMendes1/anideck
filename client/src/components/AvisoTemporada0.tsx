// client/src/components/AvisoTemporada0.tsx
// Aviso da pré-temporada: o AniDeck está na Temporada 0, e a Temporada 1 começa com a
// temporada de animes de janeiro de 2027. Nada zera na virada; quem jogou a Temporada 0 e
// seguir ativo ganha uma insígnia de pioneiro (nome a definir).
import { Sparkles } from 'lucide-react'

interface Props {
  /** Uma linha só, para o painel da barra do topo. */
  compacto?: boolean
}

export default function AvisoTemporada0({ compacto = false }: Props) {
  if (compacto) {
    return (
      <p className="m-0 flex items-center gap-1.5 font-mono text-xs text-holo-3">
        <Sparkles size={12} aria-hidden /> Temporada 0 · a Temporada 1 começa em janeiro de 2027
      </p>
    )
  }
  return (
    <section className="rounded-2xl border border-holo-3/35 bg-holo-3/10 p-4 sm:p-5 flex gap-3">
      <Sparkles size={20} className="text-holo-3 shrink-0 mt-0.5" aria-hidden />
      <div>
        <p className="m-0 font-anton text-lg uppercase text-text">Você está na Temporada 0</p>
        <p className="m-0 mt-1 text-sm text-muted">
          É a pré-temporada do AniDeck. A <b className="text-text">Temporada 1</b> começa em janeiro de 2027, junto com a nova
          temporada de animes. Seu progresso continua na virada, e quem jogar a Temporada 0 e seguir ativo vai ganhar uma
          insígnia exclusiva de pioneiro no perfil público.
        </p>
      </div>
    </section>
  )
}
