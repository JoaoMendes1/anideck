// client/src/components/comunidade/SecaoColecaoCartas.tsx
// Seção da Coleção de Cartas colecionadas pelo usuário ou visualizadas em perfis públicos (Fase 16, #172).
import { useState, useMemo } from 'react'
import { Sparkles, Star, Search, Flame, Layers } from 'lucide-react'
import CardCartaColecao from './CardCartaColecao'
import type { CartaColecao } from '../../lib/cartas'

interface Props {
  cartas: CartaColecao[]
  titulo?: string
  descricao?: string
}

export default function SecaoColecaoCartas({
  cartas,
  titulo = 'Coleção de Cartas',
  descricao = 'Cada anime que você completa vira uma carta exclusiva. Obras com nota 10 recebem acabamento Foil e animes acompanhados em dia ganham o selo Estreia.',
}: Props) {
  const [filtro, setFiltro] = useState<'todas' | 'foil' | 'estreia' | 'rarissima'>('todas')
  const [busca, setBusca] = useState('')

  const totalFoil = useMemo(() => cartas.filter((c) => c.is_foil).length, [cartas])
  const totalEstreia = useMemo(() => cartas.filter((c) => c.estreia).length, [cartas])
  const totalRarissimas = useMemo(() => cartas.filter((c) => c.raridade === 'rarissima').length, [cartas])

  const cartasFiltradas = useMemo(() => {
    return cartas.filter((c) => {
      if (filtro === 'foil' && !c.is_foil) return false
      if (filtro === 'estreia' && !c.estreia) return false
      if (filtro === 'rarissima' && c.raridade !== 'rarissima') return false
      if (busca.trim()) {
        const termo = busca.toLowerCase()
        return c.titulo.toLowerCase().includes(termo)
      }
      return true
    })
  }, [cartas, filtro, busca])

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-panel border border-line">
      {/* CABEÇALHO DA SEÇÃO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-muted-2 uppercase tracking-widest block">
              // colecionáveis de animes completos
            </span>
          </div>
          <h3 className="font-anton text-2xl uppercase m-0 leading-none text-text">
            {titulo}
          </h3>
          <p className="text-xs sm:text-sm text-muted mt-1.5 max-w-2xl m-0">
            {descricao}
          </p>
        </div>

        {/* CONTADORES RESUMO */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-panel-2 border border-line flex items-center gap-1.5 font-mono text-xs">
            <Layers size={13} className="text-holo-3" />
            <span className="font-bold text-text">{cartas.length}</span>
            <span className="text-muted-2 text-[10px]">cartas</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-panel-2 border border-line flex items-center gap-1.5 font-mono text-xs">
            <Star size={13} className="text-amber-400 fill-amber-400/30" />
            <span className="font-bold text-amber-300">{totalFoil}</span>
            <span className="text-muted-2 text-[10px]">Foil</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-panel-2 border border-line flex items-center gap-1.5 font-mono text-xs">
            <Flame size={13} className="text-rose-400 fill-rose-400/30" />
            <span className="font-bold text-rose-300">{totalEstreia}</span>
            <span className="text-muted-2 text-[10px]">Estreia</span>
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        {/* Chips de filtro */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-panel-2 border border-line overflow-x-auto scrollbar-hide">
          <button
            type="button"
            onClick={() => setFiltro('todas')}
            className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filtro === 'todas'
                ? 'bg-holo-1 text-void'
                : 'text-muted hover:text-text'
            }`}
          >
            Todas ({cartas.length})
          </button>

          <button
            type="button"
            onClick={() => setFiltro('foil')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filtro === 'foil'
                ? 'bg-amber-400 text-void'
                : 'text-muted hover:text-text'
            }`}
          >
            <Star size={11} className={filtro === 'foil' ? 'fill-void' : ''} />
            Foil ({totalFoil})
          </button>

          <button
            type="button"
            onClick={() => setFiltro('estreia')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filtro === 'estreia'
                ? 'bg-rose-500 text-void'
                : 'text-muted hover:text-text'
            }`}
          >
            <Flame size={11} className={filtro === 'estreia' ? 'fill-void' : ''} />
            Estreia ({totalEstreia})
          </button>

          <button
            type="button"
            onClick={() => setFiltro('rarissima')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filtro === 'rarissima'
                ? 'bg-purple-500 text-void'
                : 'text-muted hover:text-text'
            }`}
          >
            <Sparkles size={11} />
            Raríssimas ({totalRarissimas})
          </button>
        </div>

        {/* Campo de Busca rápida */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por anime..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-panel-2 border border-line text-xs font-bold text-text focus:outline-none focus:border-holo-3 transition-colors"
          />
        </div>
      </div>

      {/* GRADE DE CARTAS */}
      {cartasFiltradas.length === 0 ? (
        <div className="p-8 rounded-xl bg-panel-2 border border-line text-center">
          <p className="text-sm text-muted m-0">
            {cartas.length === 0
              ? 'Nenhuma carta colecionada ainda. Termine seus primeiros animes para desbloquear cartas na sua coleção!'
              : 'Nenhuma carta corresponde ao filtro ou busca selecionada.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {cartasFiltradas.map((carta) => (
            <CardCartaColecao key={carta.id} carta={carta} />
          ))}
        </div>
      )}
    </section>
  )
}
