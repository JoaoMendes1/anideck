// client/src/components/hud/CartaoEspecialidade.tsx
// Especialidade do jogador: o gênero que ele mais assiste, mostrado como título de classe.
import type { Especialidade } from '../../lib/guilda'

interface Props {
  especialidade: Especialidade | null | undefined
  /** Texto quando ainda não há especialidade; sem ele, o cartão não aparece. */
  vazio?: string
}

export default function CartaoEspecialidade({ especialidade: e, vazio }: Props) {
  if (!e) {
    if (!vazio) return null
    return (
      <div className="rounded-xl border border-dashed border-line bg-panel-2/50 p-4 flex items-center gap-3">
        <span className="w-12 h-12 shrink-0 rounded-xl grid place-items-center bg-panel border border-line text-2xl opacity-60" aria-hidden>
          🎴
        </span>
        <p className="text-sm text-muted m-0">{vazio}</p>
      </div>
    )
  }

  const maximo = e.nivel >= 5
  const pct = maximo ? 100 : Math.min(100, Math.round((e.total_vistos / Math.max(1, e.proximo_alvo)) * 100))
  const faltam = Math.max(0, e.proximo_alvo - e.total_vistos)

  return (
    <div className="relative overflow-hidden rounded-xl border border-holo-2/40 bg-gradient-to-br from-holo-2/15 via-panel-2 to-holo-1/10 p-4">
      <div className="absolute -right-6 -top-8 text-[96px] leading-none opacity-10 select-none pointer-events-none" aria-hidden>
        {e.icone}
      </div>
      <div className="relative flex items-center gap-3">
        <span className="w-14 h-14 shrink-0 rounded-xl grid place-items-center bg-void/60 border border-holo-2/40 text-3xl shadow-[0_0_18px_rgba(123,92,255,0.3)]" aria-hidden>
          {e.icone}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-muted-2 uppercase tracking-widest m-0">Especialidade · {e.genero}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-anton text-2xl uppercase leading-none m-0 mt-0.5 text-text">{e.epiteto}</h3>
            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full border ${
              e.nivel >= 3 ? 'bg-gold/15 border-gold/45 text-gold' : 'bg-holo-2/15 border-holo-2/45 text-holo-2'
            }`}>
              {e.rotulo_nivel} · {e.titulo_nivel}
            </span>
          </div>
          <p className="text-xs text-muted italic mt-1 mb-0">{e.lema}</p>
        </div>
      </div>
      <div className="relative mt-3">
        <div className="h-1.5 rounded-full bg-void/70 overflow-hidden border border-line/50">
          <div className="h-full rounded-full bg-gradient-to-r from-holo-1 to-holo-2" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-xs text-muted-2 mt-1.5">
          <span>
            {e.total_vistos} {e.total_vistos === 1 ? 'anime' : 'animes'} de {e.genero}
            {maximo ? ' · nível máximo' : ` · faltam ${faltam} para o próximo nível`}
          </span>
          {e.secundario && <span>Subclasse: <b className="text-text">{e.secundario}</b></span>}
        </div>
      </div>
    </div>
  )
}
