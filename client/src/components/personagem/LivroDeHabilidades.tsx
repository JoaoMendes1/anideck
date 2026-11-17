// client/src/components/personagem/LivroDeHabilidades.tsx
// O livro de habilidades: a habilidade única do personagem em destaque e as comuns da
// classe por nível. As bloqueadas aparecem com o nível que as libera. Em combate elas são
// usadas sozinhas; aqui o jogador só consulta.
import { BookOpen, Lock, Sparkles } from 'lucide-react'
import { textoDaMaestria, type HabilidadeRPG } from '../../lib/rpg'

const ROTULO_DE_SECAO = 'font-mono text-xs font-semibold uppercase tracking-widest text-muted m-0'

function Custo({ h }: { h: HabilidadeRPG }) {
  const partes: string[] = []
  if (h.custo_eter > 0) partes.push(`${h.custo_eter} Éter`)
  if (h.recarga > 0) partes.push(`espera ${h.recarga} ${h.recarga === 1 ? 'rodada' : 'rodadas'}`)
  if (h.tipo === 'unica') partes.push('uma vez por luta')
  return <span className="font-mono text-xs text-muted">{partes.join(' · ')}</span>
}

export default function LivroDeHabilidades({ habilidades }: { habilidades: HabilidadeRPG[] | undefined }) {
  if (!habilidades || habilidades.length === 0) return null
  const liberadas = habilidades.filter((h) => h.desbloqueada).length

  return (
    <section aria-labelledby="titulo-do-livro" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-do-livro" className={`${ROTULO_DE_SECAO} inline-flex items-center gap-1.5`}>
          <BookOpen size={14} aria-hidden="true" />
          Livro de habilidades
        </h2>
        <span className="font-mono text-xs text-muted">
          {liberadas}/{habilidades.length}
        </span>
      </div>

      <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 lg:grid-cols-3">
        {habilidades.map((h) => {
          const unica = h.tipo === 'unica'
          if (!h.desbloqueada) {
            return (
              <li
                key={h.id}
                className={`flex items-center gap-3 rounded-xl border border-dashed border-line px-3.5 py-3 text-muted ${
                  unica ? 'lg:col-span-2' : ''
                }`}
              >
                <Lock size={16} className="shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-bold">{h.nome}</p>
                  <p className="m-0 text-xs">{unica ? 'Habilidade única' : 'Habilidade comum'}</p>
                </div>
                <span className="shrink-0 font-mono text-xs">nível {h.nivel_minimo}</span>
              </li>
            )
          }
          return (
            <li
              key={h.id}
              className={`flex flex-col justify-between gap-1.5 rounded-xl border px-3.5 py-3 ${
                unica ? 'border-gold/60 bg-gold/10 lg:col-span-2' : 'border-line bg-panel'
              }`}
            >
              <div className="flex items-center gap-2">
                {unica && <Sparkles size={15} className="shrink-0 text-gold" aria-hidden="true" />}
                <p className={`m-0 min-w-0 flex-1 text-sm font-bold ${unica ? 'text-gold' : 'text-text'}`}>{h.nome}</p>
                {unica && (
                  <span className="shrink-0 rounded-full border border-gold/60 px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider text-gold">
                    Única
                  </span>
                )}
              </div>
              <p className="m-0 text-xs leading-relaxed text-muted">{h.descricao}</p>
              <Custo h={h} />
              {textoDaMaestria(h) && <span className="font-mono text-xs font-semibold text-holo-3">{textoDaMaestria(h)}</span>}
            </li>
          )
        })}
      </ul>
      <p className="m-0 text-xs text-muted">
        Nas expedições, o personagem usa as habilidades sozinho. Cada uso conta para a maestria: com 20, 60 e 150 usos, a habilidade fica 10% mais forte por grau.
      </p>
    </section>
  )
}
