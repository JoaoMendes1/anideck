import { useOlheiro } from '../hooks/useOlheiro'

type Props = {
  onCurar: (malId: number, titulo: string) => void
}

export function AbaOlheiro({ onCurar }: Props) {
  const { sugestoes, carregando, erro, revisar } = useOlheiro()

  if (carregando) return <p className="text-sm text-muted p-4">Carregando sugestões...</p>
  if (erro) return <p className="text-sm text-red-400 p-4">{erro}</p>

  if (sugestoes.length === 0) {
    return (
      <div className="py-12 text-center px-6">
        <p className="text-muted">Nenhuma sugestão pendente.</p>
        <p className="text-sm text-muted/70 mt-2">
          O Olheiro roda semanalmente e traz novos candidatos.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
      {sugestoes.map(s => (
        <article
          key={s.id}
          className="bg-panel-2 border border-line rounded-xl overflow-hidden flex flex-col"
        >
          <img
            src={s.imagem_url}
            alt={s.titulo}
            className="w-full aspect-[3/4] object-cover"
            loading="lazy"
          />

          <div className="p-2.5 flex flex-col gap-1.5 flex-1">
            <h3 className="font-bold text-xs line-clamp-2 text-text">{s.titulo}</h3>
            <p className="text-[11px] text-muted flex-1 line-clamp-2">{s.motivo}</p>
            <span className="font-mono text-[10px] text-holo-1">
              score {s.score.toFixed(1)}
            </span>

            <div className="flex gap-1.5 mt-1">
              <button
                onClick={() => {
                  onCurar(s.mal_id, s.titulo)
                  revisar(s.id, 'curado')
                }}
                className="flex-1 text-[11px] font-bold py-1.5 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void hover:opacity-90 cursor-pointer transition-opacity"
              >
                Curar
              </button>
              <button
                onClick={() => revisar(s.id, 'dispensado')}
                className="flex-1 text-[11px] font-bold py-1.5 rounded-full bg-panel border border-line text-muted hover:text-text cursor-pointer transition-colors"
              >
                Dispensar
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}