import { useOlheiro } from '../hooks/useOlheiro'

type Props = {
  onCurar: (malId: number, titulo: string) => void
}

export function AbaOlheiro({ onCurar }: Props) {
  const { sugestoes, carregando, erro, revisar, buscarNovas, buscando } = useOlheiro()

  const botaoBuscar = (
    <button
      onClick={buscarNovas}
      disabled={buscando}
      className="w-full mb-4 py-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-holo-1 to-holo-2 text-void disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-opacity"
    >
      {buscando ? 'Buscando na AniList...' : '🔭 Buscar novas sugestões'}
    </button>
  )

  if (carregando) {
    return <p className="text-sm text-muted p-4">Carregando sugestões...</p>
  }

  return (
    <div className="p-1">
      {botaoBuscar}

      {erro && <p className="text-sm text-red-400 mb-3">{erro}</p>}

      {sugestoes.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-muted">Nenhuma sugestão pendente.</p>
          <p className="text-sm text-muted/70 mt-2">
            Clique acima para o Olheiro procurar candidatos na AniList.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                  afinidade {s.score.toFixed(1)}
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
      )}
    </div>
  )
}