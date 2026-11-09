// client/src/components/comunidade/CardCartaColecao.tsx
// Card colecionável de anime terminado (Fase 16, #172).
// Exibe arte em 2:3, raridade (Comum, Rara, Raríssima), selo de Estreia e acabamento Foil metálico.
import { Link } from 'react-router-dom'
import { Sparkles, Star, Flame } from 'lucide-react'
import {
  type CartaColecao,
  ESTILOS_RARIDADE_CARTA,
  CLASSE_FOIL,
} from '../../lib/cartas'

interface Props {
  carta: CartaColecao
}

export default function CardCartaColecao({ carta }: Props) {
  const estilo = ESTILOS_RARIDADE_CARTA[carta.raridade] || ESTILOS_RARIDADE_CARTA.comum

  return (
    <Link
      to={`/anime/${carta.mal_id}`}
      className={`group relative flex flex-col rounded-2xl bg-panel border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
        estilo.borda
      } ${carta.is_foil ? CLASSE_FOIL : ''}`}
    >
      {/* IMAGEM EM PROPORÇÃO 2:3 */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-void">
        {carta.imagem_url ? (
          <img
            src={carta.imagem_url}
            alt={carta.titulo}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted font-anton text-2xl">
            {carta.titulo.charAt(0).toUpperCase()}
          </div>
        )}

        {/* GRADIENTE INFERIOR PARA LEITURA */}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent pointer-events-none" />

        {/* SELOS DE TOPO */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none z-20">
          {/* Raridade */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider backdrop-blur-md border ${estilo.badge}`}
          >
            {carta.raridade === 'rarissima' && <Sparkles size={9} />}
            {estilo.nomeLegivel}
          </span>

          {/* Selo Foil */}
          {carta.is_foil && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-mono text-[9px] font-black uppercase bg-amber-400 text-void border border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.6)]">
              FOIL
            </span>
          )}
        </div>

        {/* SELO DE ESTREIA */}
        {carta.estreia && (
          <div className="absolute top-8 left-2 pointer-events-none z-20">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-mono text-[8.5px] font-bold uppercase tracking-wider bg-rose-500/20 border border-rose-500/40 text-rose-300 backdrop-blur-md">
              <Flame size={8.5} className="fill-rose-400" /> Estreia
            </span>
          </div>
        )}

        {/* NOTA PESSOAL (SE HOUVER) */}
        {carta.nota > 0 && (
          <div className="absolute bottom-2 right-2 z-20">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-void/80 border border-line backdrop-blur-md font-mono text-[10px] font-bold text-text">
              <Star size={10} className="fill-gold text-gold" />
              {carta.nota}
            </span>
          </div>
        )}
      </div>

      {/* RODAPÉ DO CARD */}
      <div className="p-3 flex flex-col justify-between flex-1 bg-panel/95 z-20">
        <h4 className="font-bold text-xs text-text group-hover:text-holo-3 transition-colors line-clamp-2 leading-tight m-0">
          {carta.titulo}
        </h4>
        <span className="font-mono text-[9.5px] text-muted-2 mt-1.5 block">
          Colecionada em {new Date(carta.obtida_em).toLocaleDateString('pt-BR')}
        </span>
      </div>
    </Link>
  )
}
