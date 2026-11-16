// client/src/components/ui/Paginacao.tsx
// Controle de paginação reutilizável (Coleção de Cartas e Extrato de XP da Guilda, #232).
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  pagina: number
  totalPaginas: number
  totalItens: number
  porPagina: number
  aoMudar: (novaPagina: number) => void
}

function gerarPaginasVisiveis(paginaAtual: number, totalPaginas: number): (number | 'reticencias')[] {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1)
  }
  const paginas: (number | 'reticencias')[] = [1]
  const inicio = Math.max(2, paginaAtual - 1)
  const fim = Math.min(totalPaginas - 1, paginaAtual + 1)

  if (inicio > 2) paginas.push('reticencias')
  for (let p = inicio; p <= fim; p++) {
    paginas.push(p)
  }
  if (fim < totalPaginas - 1) paginas.push('reticencias')
  paginas.push(totalPaginas)
  return paginas
}

export default function Paginacao({
  pagina,
  totalPaginas,
  totalItens,
  porPagina,
  aoMudar,
}: Props) {
  if (totalPaginas <= 1 || totalItens <= 0) return null

  const inicio = Math.min(totalItens, (pagina - 1) * porPagina + 1)
  const fim = Math.min(totalItens, pagina * porPagina)
  const paginasVisiveis = gerarPaginasVisiveis(pagina, totalPaginas)

  return (
    <nav
      aria-label="Paginação"
      className="mt-5 pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3"
    >
      <p className="m-0 font-mono text-xs text-muted">
        Mostrando <strong className="text-text">{inicio}–{fim}</strong> de{' '}
        <strong className="text-text">{totalItens}</strong>
      </p>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => aoMudar(pagina - 1)}
          disabled={pagina <= 1}
          aria-label="Página anterior"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line bg-panel-2 font-mono text-xs font-bold text-text hover:border-holo-3 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          <span>Anterior</span>
        </button>

        {paginasVisiveis.map((item, idx) =>
          item === 'reticencias' ? (
            <span key={`ret-${idx}`} className="px-1.5 font-mono text-xs text-muted select-none">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => aoMudar(item)}
              aria-label={`Página ${item}`}
              aria-current={item === pagina ? 'page' : undefined}
              className={`min-w-8 px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer ${
                item === pagina
                  ? 'bg-holo-1 text-void border border-holo-1'
                  : 'bg-panel-2 border border-line text-muted hover:text-text hover:border-holo-3'
              }`}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => aoMudar(pagina + 1)}
          disabled={pagina >= totalPaginas}
          aria-label="Próxima página"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line bg-panel-2 font-mono text-xs font-bold text-text hover:border-holo-3 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <span>Próxima</span>
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
