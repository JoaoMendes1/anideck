// client/src/components/ModalSaidaCompleto.tsx
// Aviso exibido ao tirar um anime de "Completo" para outro status (#267):
// permite manter o histórico como revisão (0 XP novo), descartar tudo com
// prévia exata do estorno de XP/nível ou cancelar sem mudar nada.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import type { EscolhaSaidaCompleto, PreviaSaidaCompleto } from '../lib/detalhes'

interface Props {
  aberto: boolean
  malId: number
  novoStatus: string | null
  token: string | undefined
  salvando?: boolean
  erroExterno?: string | null
  onConfirmar: (escolha: EscolhaSaidaCompleto) => void
  onCancelar: () => void
}

export default function ModalSaidaCompleto({
  aberto,
  malId,
  novoStatus,
  token,
  salvando = false,
  erroExterno = null,
  onConfirmar,
  onCancelar,
}: Props) {
  const [previa, setPrevia] = useState<PreviaSaidaCompleto | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erroCarga, setErroCarga] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto || !token || malId <= 0) {
      setPrevia(null)
      setErroCarga(null)
      return
    }

    let cancelado = false
    setCarregando(true)
    setErroCarga(null)

    fetch(`/api/entries/${malId}/saida-completo`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        if (!res.ok) throw new Error('Falha ao calcular impacto no XP')
        return (await res.json()) as PreviaSaidaCompleto
      })
      .then(dados => {
        if (!cancelado) setPrevia(dados)
      })
      .catch(() => {
        if (!cancelado) setErroCarga('Não foi possível calcular a prévia exata do estorno agora.')
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })

    return () => {
      cancelado = true
    }
  }, [aberto, malId, token])

  if (!aberto || !novoStatus) return null

  const sugeriuRever = previa?.sugestao !== 'desisti_ou_errado'
  const sugeriuDescarte = previa?.sugestao === 'desisti_ou_errado'
  const caiuRank = Boolean(previa && previa.rank_antes && previa.rank_depois && previa.rank_antes !== previa.rank_depois)

  return createPortal(
    <div
      className="fixed inset-0 bg-void/80 flex items-center justify-center z-[130] p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-saida-completo-titulo"
    >
      <div className="bg-panel border border-line rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 id="modal-saida-completo-titulo" className="font-anton text-text text-xl uppercase m-0 mb-1.5">
          Sair de Completo → {novoStatus}
        </h3>
        <p className="text-sm text-muted m-0 mb-4 leading-relaxed">
          {carregando ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-holo-3" aria-hidden />
              Calculando impacto no seu histórico e XP...
            </span>
          ) : previa ? (
            <>
              Você tem <strong className="text-holo-3 font-mono">{previa.episodios_marcados}</strong>{' '}
              {previa.episodios_marcados === 1 ? 'episódio registrado' : 'episódios registrados'}. Como deseja continuar?
            </>
          ) : (
            'Escolha como tratar os episódios e o XP desta obra.'
          )}
        </p>

        {(erroCarga || erroExterno) && (
          <div className="mb-4 p-3 rounded-xl bg-coral/10 border border-coral/35 text-xs text-coral font-bold flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" aria-hidden />
            <span>{erroExterno || erroCarga}</span>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={salvando || carregando}
            onClick={() => onConfirmar('vou_rever')}
            className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 ${
              sugeriuRever
                ? 'border-holo-3/60 bg-holo-3/10 hover:bg-holo-3/15'
                : 'border-line bg-panel-2 hover:border-holo-3/50'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="inline-flex items-center gap-2 text-sm font-extrabold text-text">
                <RotateCcw size={15} className="text-holo-3" aria-hidden />
                Vou rever
              </span>
              {sugeriuRever && !carregando && (
                <span className="px-2 py-0.5 rounded-full bg-holo-3/20 border border-holo-3/40 font-mono text-[11px] font-bold text-holo-3">
                  Sugerido
                </span>
              )}
            </div>
            <p className="text-xs text-muted m-0 leading-relaxed">
              Episódios, carta e XP continuam no seu histórico. A nova volta vai para revisões e não rende XP de novo.
            </p>
          </button>

          <button
            type="button"
            disabled={salvando || carregando}
            onClick={() => onConfirmar('desisti_ou_errado')}
            className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 ${
              sugeriuDescarte
                ? 'border-coral/70 bg-coral/15 hover:bg-coral/20'
                : 'border-coral/40 bg-coral/5 hover:bg-coral/10'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="inline-flex items-center gap-2 text-sm font-extrabold text-coral">
                <Trash2 size={15} aria-hidden />
                Desisti ou marquei errado
              </span>
              {sugeriuDescarte && !carregando && (
                <span className="px-2 py-0.5 rounded-full bg-coral/20 border border-coral/40 font-mono text-[11px] font-bold text-coral">
                  Sugerido
                </span>
              )}
            </div>
            <p className="text-xs text-muted m-0 leading-relaxed">
              {previa ? (
                previa.xp_perdido > 0 ? (
                  <>
                    Desmarca todos os episódios, apaga a carta e estorna{' '}
                    <strong className="text-coral font-mono">−{previa.xp_perdido} XP</strong>
                    {previa.niveis_perdidos > 0 && (
                      <>
                        {' '}
                        (−{previa.niveis_perdidos} {previa.niveis_perdidos === 1 ? 'nível' : 'níveis'}, vai para Nv{' '}
                        {previa.nivel_depois})
                      </>
                    )}
                    {caiuRank && <> · Rank cai para {previa.rank_depois}</>}.
                  </>
                ) : (
                  'Desmarca todos os episódios e remove a carta da coleção (0 XP estornado).'
                )
              ) : (
                'Desmarca todos os episódios da obra, remove a carta e estorna o XP recebido.'
              )}
            </p>
          </button>

          <button
            type="button"
            disabled={salvando}
            onClick={onCancelar}
            className="w-full py-2.5 mt-1 rounded-xl border border-line/70 text-xs font-bold text-muted hover:text-text hover:border-line transition-colors cursor-pointer disabled:opacity-50"
          >
            {salvando ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={13} className="animate-spin" aria-hidden /> Aplicando...
              </span>
            ) : (
              'Cancelar'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
