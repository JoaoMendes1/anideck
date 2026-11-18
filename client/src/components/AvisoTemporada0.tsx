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
  // Fechado mostra uma linha; aberto, a explicação inteira.
  return (
    <details className="group rounded-2xl border border-holo-3/35 bg-holo-3/10 px-3.5 py-2.5 sm:px-5 sm:py-3.5">
      <summary className="flex cursor-pointer list-none items-center gap-2 select-none [&::-webkit-details-marker]:hidden">
        <Sparkles size={16} className="shrink-0 text-holo-3" aria-hidden />
        <span className="min-w-0 flex-1 text-sm font-bold text-text">
          Temporada 0 <span className="font-normal text-muted">· a Temporada 1 começa em janeiro de 2027</span>
        </span>
        <span className="shrink-0 text-xs text-holo-3 group-open:hidden">Saiba mais</span>
      </summary>
      <p className="m-0 mt-2 text-sm text-muted">
        É a pré-temporada do AniDeck. A <b className="text-text">Temporada 1</b> começa junto com a nova temporada de animes. Seu
        progresso continua na virada, e quem jogar a Temporada 0 e seguir ativo vai ganhar uma insígnia exclusiva de pioneiro no
        perfil público.
      </p>
    </details>
  )
}
