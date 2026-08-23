export interface AniListCharacterEdge {
  role?: string
  node: {
    name?: { full?: string }
    image?: { large?: string }
  }
}

export interface AniListMedia {
  id: number
  idMal: number
  title: { romaji?: string; english?: string; native?: string }
  coverImage?: { large?: string }
  bannerImage?: string
  format?: string
  status?: string
  genres?: string[]
  synopsis?: string
  characters?: { edges?: AniListCharacterEdge[] }
}

interface BuscaAniListProps {
  termoBusca: string
  onChangeTermo: (valor: string) => void
  buscando: boolean
  resultados: AniListMedia[]
  onBuscar: () => void
  onSelecionar: (anime: AniListMedia) => void
}

export default function BuscaAniList({
  termoBusca,
  onChangeTermo,
  buscando,
  resultados,
  onBuscar,
  onSelecionar,
}: BuscaAniListProps) {
  return (
    <div className="relative mb-6">
      <div className="flex gap-2 group">
        <input
          type="text"
          value={termoBusca}
          onChange={(e) => onChangeTermo(e.target.value)}
          placeholder="Busque o título na AniList para importar a base..."
          className="flex-1 min-w-0 bg-panel-2 border border-line rounded-xl px-4 py-2 text-sm outline-none focus:border-holo-3 transition-colors relative z-20"
          onKeyDown={(e) => e.key === 'Enter' && onBuscar()}
        />
        <button
          onClick={onBuscar}
          disabled={buscando}
          className="w-[100px] sm:w-[115px] shrink-0 bg-panel-2 border border-line rounded-xl text-sm font-bold hover:border-holo-3 hover:text-holo-3 cursor-pointer disabled:opacity-50 transition-colors relative z-20"
        >
          {buscando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {resultados.length > 0 && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-panel/95 backdrop-blur-xl border border-line rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[350px] overflow-y-auto">
          {resultados.map((anime) => (
            <button
              key={anime.id}
              onClick={() => onSelecionar(anime)}
              className="flex items-center gap-3 p-3 border-b border-line/50 hover:bg-white/5 transition-colors text-left w-full cursor-pointer"
            >
              <img src={anime.coverImage?.large} alt="Capa" className="w-10 h-14 object-cover rounded-md shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate text-white">{anime.title.romaji || anime.title.english}</div>
                <div className="text-[10px] text-muted truncate mt-0.5 uppercase tracking-wide">
                  {anime.format} • {anime.status}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}