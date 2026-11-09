// client/src/components/comunidade/ModalDueloGosto.tsx
// Modal de Duelo de Gosto entre dois perfis públicos (Fase 16, #173).
import { useState, useEffect } from 'react'
import { Swords, HeartHandshake, ShieldAlert, Share2, Check, X } from 'lucide-react'
import { buscarDuelo } from '../../hooks/useCartas'
import type { DueloResultado } from '../../lib/cartas'

interface Props {
  aberto: boolean
  onClose: () => void
  meuHandle: string
  alvoHandle: string
  alvoNome: string
}

export default function ModalDueloGosto({
  aberto,
  onClose,
  meuHandle,
  alvoHandle,
  alvoNome,
}: Props) {
  const [carregando, setCarregando] = useState(true)
  const [resultado, setResultado] = useState<DueloResultado | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!aberto || !meuHandle || !alvoHandle) return
    let ativo = true
    setCarregando(true)

    buscarDuelo(meuHandle, alvoHandle).then((res) => {
      if (ativo) {
        setResultado(res)
        setCarregando(false)
      }
    })

    return () => {
      ativo = false
    }
  }, [aberto, meuHandle, alvoHandle])

  if (!aberto) return null

  const copiarCompartilhamento = () => {
    const texto = `🔥 Duelo de Gosto no AniDeck: @${meuHandle} vs @${alvoHandle}!\n🎯 Afinidade: ${resultado?.afinidade ?? 0}%\n🤝 Gênero que une: ${resultado?.genero_que_une ?? ''}\nConfira em: ${window.location.origin}/u/${alvoHandle}`
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-panel border border-line p-6 shadow-2xl overflow-hidden">
        {/* BOTÃO FECHAR */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-panel-2 border border-line text-muted hover:text-text cursor-pointer transition-colors"
          title="Fechar"
        >
          <X size={16} />
        </button>

        {/* CABEÇALHO */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-holo-2/15 border border-holo-2/30 text-holo-2 font-mono text-xs font-bold mb-2">
            <Swords size={13} /> Duelo de Gosto
          </div>
          <h2 className="font-anton text-2xl uppercase tracking-wide m-0">
            Comparador de Afinidade
          </h2>
          <p className="font-mono text-xs text-muted mt-1">
            @{meuHandle} <span className="text-holo-3 font-bold">vs</span> @{alvoHandle} ({alvoNome})
          </p>
        </div>

        {carregando ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-holo-3 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-mono text-xs text-muted">Analisando histórico de decks e afinidade...</p>
          </div>
        ) : !resultado ? (
          <div className="py-8 text-center">
            <p className="text-sm text-coral">
              Não foi possível calcular o duelo. Certifique-se de que ambos os perfis sejam públicos e possuam animes no Deck.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* MEDIDOR CENTRAL DE AFINIDADE */}
            <div className="p-5 rounded-2xl bg-panel-2/80 border border-line text-center relative overflow-hidden">
              <span className="font-mono text-[10px] text-muted-2 uppercase tracking-widest block mb-1">
                Afinidade de Gosto
              </span>
              <div className="font-anton text-6xl text-holo-3 leading-none my-1">
                {resultado.afinidade}%
              </div>
              <div className="h-2 w-48 mx-auto rounded-full bg-void/80 overflow-hidden border border-line/40 mt-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 transition-all duration-1000"
                  style={{ width: `${resultado.afinidade}%` }}
                />
              </div>
              <p className="text-xs text-muted mt-2 mb-0">
                {resultado.afinidade >= 75
                  ? 'Gostos quase idênticos! Vocês têm grande chance de amar as mesmas obras.'
                  : resultado.afinidade >= 50
                  ? 'Afinidade moderada! Compartilham alguns gêneros favoritos mas têm diferenças marcantes.'
                  : 'Gostos contrastantes! Cada um explora vertentes bem diferentes do mundo dos animes.'}
              </p>
            </div>

            {/* CARDS COMPARATIVOS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-panel-2 border border-line">
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-green uppercase font-bold mb-1">
                  <HeartHandshake size={13} /> O que une
                </div>
                <div className="font-bold text-sm text-text">{resultado.genero_que_une}</div>
                <span className="text-[10px] text-muted block mt-0.5">Gênero favorito compartilhado</span>
              </div>

              <div className="p-3.5 rounded-xl bg-panel-2 border border-line">
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-coral uppercase font-bold mb-1">
                  <ShieldAlert size={13} /> O que separa
                </div>
                <div className="font-bold text-sm text-text">{resultado.genero_que_separa}</div>
                <span className="text-[10px] text-muted block mt-0.5">Maior diferença de consumo</span>
              </div>

              <div className="p-3.5 rounded-xl bg-panel-2 border border-line">
                <span className="font-mono text-[10px] text-muted-2 uppercase block mb-1">Em Comum</span>
                <div className="font-anton text-xl text-text leading-none">{resultado.obras_em_comum}</div>
                <span className="text-[10px] text-muted block mt-0.5">Obras presentes em ambos decks</span>
              </div>

              <div className="p-3.5 rounded-xl bg-panel-2 border border-line">
                <span className="font-mono text-[10px] text-muted-2 uppercase block mb-1">Sintonia de Notas</span>
                <div className="font-anton text-xl text-gold leading-none">{resultado.concordancia_notas}%</div>
                <span className="text-[10px] text-muted block mt-0.5">Concordância nas notas dadas</span>
              </div>
            </div>

            {/* AÇÃO COMPARTILHAR */}
            <button
              type="button"
              onClick={copiarCompartilhamento}
              className="w-full py-2.5 rounded-full font-bold text-xs text-void bg-gradient-to-r from-holo-1 to-holo-3 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiado ? <Check size={14} /> : <Share2 size={14} />}
              {copiado ? 'Resultado copiado para a área de transferência!' : 'Compartilhar Duelo de Gosto'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
