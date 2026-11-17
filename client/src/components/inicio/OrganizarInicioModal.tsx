// client/src/components/inicio/OrganizarInicioModal.tsx
// Modal para reordenar seções (↑ / ↓), ligar/desligar, minimizar e escolher o destaque da Início (#275).
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, ChevronsDownUp, ChevronsUpDown, Eye, EyeOff, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import {
  CATALOGO_SECOES_INICIO,
  FONTES_DESTAQUE,
  SECOES_LATERAIS,
  SECOES_PRINCIPAIS,
  alternarItemSecao,
  configInicioPadrao,
  moverSecaoNaOrdem,
  type ConfigInicio,
  type FonteDestaqueInicio,
  type SecaoInicioId,
} from '../../lib/inicioPreferencias'

interface Props {
  aberto: boolean
  config: ConfigInicio
  ehDesktopLargo: boolean
  salvando?: boolean
  aoFechar: () => void
  aoAtualizar: (nova: ConfigInicio) => void
}

function LinhaSecao({
  id,
  config,
  primeira,
  ultima,
  aoMover,
  aoAlternarOculta,
  aoAlternarMinimizada,
}: {
  id: SecaoInicioId
  config: ConfigInicio
  primeira: boolean
  ultima: boolean
  aoMover: (direcao: -1 | 1) => void
  aoAlternarOculta: () => void
  aoAlternarMinimizada: () => void
}) {
  const info = CATALOGO_SECOES_INICIO[id]
  const oculta = config.ocultas.includes(id)
  const minimizada = config.minimizadas.includes(id)

  return (
    <div
      className={`rounded-xl border p-3 flex items-center justify-between gap-3 transition-colors ${
        oculta
          ? 'bg-panel-2/35 border-line/50 opacity-65'
          : 'bg-panel-2/80 border-line'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-text">{info.titulo}</span>
          {oculta && (
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-panel border border-line text-muted-2">
              Oculta
            </span>
          )}
          {!oculta && minimizada && (
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-holo-2/10 border border-holo-2/30 text-holo-2">
              Minimizada
            </span>
          )}
        </div>
        <p className="text-xs text-muted m-0 mt-0.5 line-clamp-1">{info.descricao}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          disabled={primeira}
          onClick={() => aoMover(-1)}
          aria-label={`Subir ${info.titulo}`}
          title="Mover para cima"
          className="w-8 h-8 rounded-lg bg-panel border border-line hover:border-holo-3 text-muted hover:text-text flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          disabled={ultima}
          onClick={() => aoMover(1)}
          aria-label={`Descer ${info.titulo}`}
          title="Mover para baixo"
          className="w-8 h-8 rounded-lg bg-panel border border-line hover:border-holo-3 text-muted hover:text-text flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowDown size={14} />
        </button>
        <button
          type="button"
          disabled={oculta}
          onClick={aoAlternarMinimizada}
          aria-label={minimizada ? `Expandir ${info.titulo}` : `Minimizar ${info.titulo}`}
          title={minimizada ? 'Expandir seção' : 'Minimizar seção'}
          className={`h-8 px-2 rounded-lg border flex items-center justify-center gap-1 text-xs font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
            minimizada
              ? 'bg-holo-2/15 border-holo-2/40 text-holo-2'
              : 'bg-panel border-line hover:border-holo-2 text-muted hover:text-text'
          }`}
        >
          {minimizada ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}
          <span className="hidden sm:inline">{minimizada ? 'Expandir' : 'Recolher'}</span>
        </button>
        <button
          type="button"
          onClick={aoAlternarOculta}
          aria-label={oculta ? `Mostrar ${info.titulo}` : `Ocultar ${info.titulo}`}
          title={oculta ? 'Mostrar seção' : 'Ocultar seção'}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer ${
            oculta
              ? 'bg-coral/15 border-coral/40 text-coral'
              : 'bg-panel border-line hover:border-holo-3 text-holo-3'
          }`}
        >
          {oculta ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}

export default function OrganizarInicioModal({
  aberto,
  config,
  ehDesktopLargo,
  salvando = false,
  aoFechar,
  aoAtualizar,
}: Props) {
  if (!aberto) return null

  const idsPrincipaisNaOrdem = config.ordem.filter(id =>
    (SECOES_PRINCIPAIS as readonly SecaoInicioId[]).includes(id),
  )
  const idsLateraisNaOrdem = config.ordem.filter(id =>
    (SECOES_LATERAIS as readonly SecaoInicioId[]).includes(id),
  )

  const atualizarOrdem = (id: SecaoInicioId, direcao: -1 | 1, grupo?: readonly SecaoInicioId[]) => {
    aoAtualizar({
      ...config,
      ordem: moverSecaoNaOrdem(config.ordem, id, direcao, grupo),
    })
  }

  const alternarOculta = (id: SecaoInicioId) => {
    aoAtualizar({
      ...config,
      ocultas: alternarItemSecao(config.ocultas, id),
    })
  }

  const alternarMinimizada = (id: SecaoInicioId) => {
    aoAtualizar({
      ...config,
      minimizadas: alternarItemSecao(config.minimizadas, id),
    })
  }

  const mudarFonteDestaque = (fonte: FonteDestaqueInicio) => {
    aoAtualizar({
      ...config,
      destaque_fonte: fonte,
    })
  }

  // Portal no body: dentro da página, o modal herda o empilhamento do contêiner e fica
  // atrás das barras fixas do topo e de baixo, por maior que seja o z-index.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-void/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-organizar-inicio"
    >
      <div className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl border border-line bg-panel shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-holo-3/15 border border-holo-3/35 text-holo-3 flex items-center justify-center shrink-0">
              <SlidersHorizontal size={17} />
            </div>
            <div className="min-w-0">
              <h2 id="titulo-organizar-inicio" className="font-anton text-xl uppercase tracking-wide m-0 text-text">
                Organizar Início
              </h2>
              <p className="text-xs text-muted m-0">
                Suas escolhas ficam salvas na sua conta para qualquer aparelho
                {salvando ? ' · salvando...' : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full bg-panel-2 border border-line hover:border-holo-3 text-muted hover:text-text flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar space-y-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-holo-1 m-0 mb-2">
              Fonte do bloco &ldquo;Em destaque&rdquo;
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FONTES_DESTAQUE.map(opcao => {
                const ativa = config.destaque_fonte === opcao.id
                return (
                  <button
                    key={opcao.id}
                    type="button"
                    onClick={() => mudarFonteDestaque(opcao.id)}
                    aria-pressed={ativa}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      ativa
                        ? 'bg-holo-1/15 border-holo-1/50 text-text'
                        : 'bg-panel-2/60 border-line hover:border-holo-3/40 text-muted'
                    }`}
                  >
                    <span className={`block font-bold text-sm ${ativa ? 'text-holo-1' : 'text-text'}`}>
                      {opcao.rotulo}
                    </span>
                    <span className="block text-xs text-muted mt-0.5">{opcao.subtitulo}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {ehDesktopLargo ? (
            <>
              <div className="space-y-2">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-2 m-0">
                  Coluna principal
                </p>
                {idsPrincipaisNaOrdem.map((id, idx) => (
                  <LinhaSecao
                    key={id}
                    id={id}
                    config={config}
                    primeira={idx === 0}
                    ultima={idx === idsPrincipaisNaOrdem.length - 1}
                    aoMover={dir => atualizarOrdem(id, dir, SECOES_PRINCIPAIS)}
                    aoAlternarOculta={() => alternarOculta(id)}
                    aoAlternarMinimizada={() => alternarMinimizada(id)}
                  />
                ))}
              </div>

              <div className="space-y-2">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-2 m-0">
                  Terceira coluna (Missões, semana, chefão e clã)
                </p>
                {idsLateraisNaOrdem.map((id, idx) => (
                  <LinhaSecao
                    key={id}
                    id={id}
                    config={config}
                    primeira={idx === 0}
                    ultima={idx === idsLateraisNaOrdem.length - 1}
                    aoMover={dir => atualizarOrdem(id, dir, SECOES_LATERAIS)}
                    aoAlternarOculta={() => alternarOculta(id)}
                    aoAlternarMinimizada={() => alternarMinimizada(id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-2 m-0">
                Ordem das seções
              </p>
              {config.ordem.map((id, idx) => (
                <LinhaSecao
                  key={id}
                  id={id}
                  config={config}
                  primeira={idx === 0}
                  ultima={idx === config.ordem.length - 1}
                  aoMover={dir => atualizarOrdem(id, dir)}
                  aoAlternarOculta={() => alternarOculta(id)}
                  aoAlternarMinimizada={() => alternarMinimizada(id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-line bg-panel-2/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => aoAtualizar(configInicioPadrao())}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-line bg-panel hover:border-coral/50 text-xs font-bold text-muted hover:text-text cursor-pointer"
          >
            <RotateCcw size={13} /> Restaurar padrão
          </button>

          <button
            type="button"
            onClick={aoFechar}
            className="px-5 py-2 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void font-extrabold text-xs uppercase tracking-wider cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
