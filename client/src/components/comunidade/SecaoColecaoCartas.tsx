// client/src/components/comunidade/SecaoColecaoCartas.tsx
// Seção da Coleção de Cartas colecionadas pelo usuário ou visualizadas em perfis públicos (Fase 16, #172, #232).
import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sparkles, Star, Search, Flame, Layers, ArrowUpDown } from 'lucide-react'
import CardCartaColecao from './CardCartaColecao'
import Paginacao from '../ui/Paginacao'
import type { CartaColecao } from '../../lib/cartas'

const CARTAS_POR_PAGINA = 24

type OrdemCarta = 'recentes' | 'nota' | 'raridade'

const PESO_RARIDADE: Record<string, number> = {
  rarissima: 3,
  rara: 2,
  comum: 1,
}

interface AnimeBulkItem {
  mal_id: number
  title?: string
  images?: {
    jpg?: {
      image_url?: string
    }
  }
}

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
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtro, setFiltro] = useState<'todas' | 'foil' | 'estreia' | 'rarissima'>('todas')
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState<OrdemCarta>('recentes')
  const [capasLote, setCapasLote] = useState<Record<number, { imagem_url: string; titulo?: string }>>({})
  const idsConsultadosRef = useRef<Set<number>>(new Set())

  const paginaUrl = Number.parseInt(searchParams.get('cartas') || '1', 10)
  const paginaBruta = Number.isFinite(paginaUrl) && paginaUrl >= 1 ? paginaUrl : 1

  const mudarPagina = (novaPagina: number) => {
    setSearchParams(
      (atual) => {
        const proximo = new URLSearchParams(atual)
        if (novaPagina <= 1) {
          proximo.delete('cartas')
        } else {
          proximo.set('cartas', String(novaPagina))
        }
        return proximo
      },
      { replace: true },
    )
  }

  const totalFoil = useMemo(() => cartas.filter((c) => c.is_foil).length, [cartas])
  const totalEstreia = useMemo(() => cartas.filter((c) => c.estreia).length, [cartas])
  const totalRarissimas = useMemo(() => cartas.filter((c) => c.raridade === 'rarissima').length, [cartas])

  const cartasHidratadas = useMemo(() => {
    return cartas.map((c) => {
      const extra = capasLote[c.mal_id]
      if (!extra) return c
      const usaTituloFallback = !c.titulo || c.titulo === `Anime #${c.mal_id}`
      return {
        ...c,
        imagem_url: c.imagem_url || extra.imagem_url,
        titulo: usaTituloFallback && extra.titulo ? extra.titulo : c.titulo,
      }
    })
  }, [cartas, capasLote])

  const cartasFiltradas = useMemo(() => {
    const filtradas = cartasHidratadas.filter((c) => {
      if (filtro === 'foil' && !c.is_foil) return false
      if (filtro === 'estreia' && !c.estreia) return false
      if (filtro === 'rarissima' && c.raridade !== 'rarissima') return false
      if (busca.trim()) {
        const termo = busca.toLowerCase()
        return c.titulo.toLowerCase().includes(termo)
      }
      return true
    })

    const copia = [...filtradas]
    copia.sort((a, b) => {
      if (ordem === 'nota') {
        if (b.nota !== a.nota) return b.nota - a.nota
      } else if (ordem === 'raridade') {
        const pa = PESO_RARIDADE[a.raridade] || 0
        const pb = PESO_RARIDADE[b.raridade] || 0
        if (pb !== pa) return pb - pa
      }
      return new Date(b.obtida_em).getTime() - new Date(a.obtida_em).getTime()
    })
    return copia
  }, [cartasHidratadas, filtro, busca, ordem])

  const totalPaginas = Math.max(1, Math.ceil(cartasFiltradas.length / CARTAS_POR_PAGINA))
  const paginaSegura = Math.min(paginaBruta, totalPaginas)

  const cartasDaPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * CARTAS_POR_PAGINA
    return cartasFiltradas.slice(inicio, inicio + CARTAS_POR_PAGINA)
  }, [cartasFiltradas, paginaSegura])

  useEffect(() => {
    const visiveisSemCapa = cartasDaPagina
      .filter((c) => !c.imagem_url && !idsConsultadosRef.current.has(c.mal_id))
      .map((c) => c.mal_id)

    const idsUnicos = Array.from(new Set(visiveisSemCapa))
    if (idsUnicos.length === 0) return

    idsUnicos.forEach((id) => idsConsultadosRef.current.add(id))
    let cancelado = false

    fetch('/api/anime/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: idsUnicos }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelado || !json || !Array.isArray(json.data)) return
        const novos: Record<number, { imagem_url: string; titulo?: string }> = {}
        for (const item of json.data as AnimeBulkItem[]) {
          const url = item.images?.jpg?.image_url || ''
          if (item.mal_id && (url || item.title)) {
            novos[item.mal_id] = { imagem_url: url, titulo: item.title }
          }
        }
        if (Object.keys(novos).length > 0) {
          setCapasLote((atual) => ({ ...atual, ...novos }))
        }
      })
      .catch(() => {
        // Mantém fallback com inicial se o lote falhar
      })

    return () => {
      cancelado = true
    }
  }, [cartasDaPagina])

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-panel border border-line">
      {/* CABEÇALHO DA SEÇÃO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-2 uppercase tracking-widest block">
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
            <span className="text-muted-2 text-xs">cartas</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-panel-2 border border-line flex items-center gap-1.5 font-mono text-xs">
            <Star size={13} className="text-amber-400 fill-amber-400/30" />
            <span className="font-bold text-amber-300">{totalFoil}</span>
            <span className="text-muted-2 text-xs">Foil</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-panel-2 border border-line flex items-center gap-1.5 font-mono text-xs">
            <Flame size={13} className="text-rose-400 fill-rose-400/30" />
            <span className="font-bold text-rose-300">{totalEstreia}</span>
            <span className="text-muted-2 text-xs">Estreia</span>
          </div>
        </div>
      </div>

      {/* FILTROS, ORDENAÇÃO E BUSCA */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-5">
        {/* Chips de filtro */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-panel-2 border border-line overflow-x-auto scrollbar-hide">
          <button
            type="button"
            onClick={() => {
              setFiltro('todas')
              mudarPagina(1)
            }}
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
            onClick={() => {
              setFiltro('foil')
              mudarPagina(1)
            }}
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
            onClick={() => {
              setFiltro('estreia')
              mudarPagina(1)
            }}
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
            onClick={() => {
              setFiltro('rarissima')
              mudarPagina(1)
            }}
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Seletor de ordenação */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-panel-2 border border-line">
            <ArrowUpDown size={13} className="text-muted shrink-0" aria-hidden="true" />
            <label htmlFor="ordem-cartas-colecao" className="font-mono text-xs text-muted shrink-0">
              Ordenar:
            </label>
            <select
              id="ordem-cartas-colecao"
              aria-label="Ordenar cartas"
              value={ordem}
              onChange={(e) => {
                setOrdem(e.target.value as OrdemCarta)
                mudarPagina(1)
              }}
              className="bg-transparent font-mono text-xs font-bold text-text focus:outline-none cursor-pointer"
            >
              <option value="recentes" className="bg-panel text-text">Recentes</option>
              <option value="nota" className="bg-panel text-text">Nota</option>
              <option value="raridade" className="bg-panel text-text">Raridade</option>
            </select>
          </div>

          {/* Campo de Busca rápida */}
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              aria-label="Buscar carta por anime"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                mudarPagina(1)
              }}
              placeholder="Buscar por anime..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-panel-2 border border-line text-xs font-bold text-text focus:outline-none focus:border-holo-3 transition-colors"
            />
          </div>
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
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {cartasDaPagina.map((carta) => (
              <CardCartaColecao key={carta.id} carta={carta} />
            ))}
          </div>

          <Paginacao
            pagina={paginaSegura}
            totalPaginas={totalPaginas}
            totalItens={cartasFiltradas.length}
            porPagina={CARTAS_POR_PAGINA}
            aoMudar={mudarPagina}
          />
        </>
      )}
    </section>
  )
}

