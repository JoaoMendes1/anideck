// client/src/components/previsoes/CardPrevisoes.tsx
// Card interativo de Previsões da Comunidade com apostas de Mana (Fase 17.4, #187)
import { useState, useEffect, useCallback } from 'react'
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { useSessao } from '../../contexts/SessaoContext'
import { useToast } from '../../contexts/ToastContext'
import IconeAniCoin from '../IconeAniCoin'
import {
  obterPrevisoes,
  apostarPrevisao,
  type Previsao,
} from '../../lib/previsoes'

interface Props {
  className?: string
  malId?: number
}

export default function CardPrevisoes({ className = '', malId }: Props) {
  const { session } = useSessao()
  const { showToast } = useToast()
  const [previsoes, setPrevisoes] = useState<Previsao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [apostandoEm, setApostandoEm] = useState<string | null>(null)
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<Record<string, number>>({})
  const [manaSelecionada, setManaSelecionada] = useState<Record<string, number>>({})

  const carregar = useCallback(async () => {
    try {
      setCarregando(true)
      const dados = await obterPrevisoes()
      const filtradas = malId
        ? dados.filter((p) => p.mal_id === malId)
        : dados
      setPrevisoes(filtradas)
    } finally {
      setCarregando(false)
    }
  }, [malId])

  useEffect(() => {
    carregar()
  }, [carregar, session?.access_token])

  const handleApostar = async (previsaoId: string) => {
    if (!session) {
      showToast('Entre na sua conta para apostar Mana!', 'info')
      return
    }

    const opcaoId = opcaoSelecionada[previsaoId]
    const mana = manaSelecionada[previsaoId] ?? 10

    if (!opcaoId) {
      showToast('Selecione uma das opções para fazer sua previsão', 'info')
      return
    }

    try {
      setApostandoEm(previsaoId)
      const res = await apostarPrevisao(previsaoId, opcaoId, mana)
      if (res.ok) {
        showToast(`Previsão confirmada com ${mana} MP! Boa sorte!`, 'success')
        carregar()
      } else {
        showToast(res.erro || 'Falha ao registrar previsão', 'error')
      }
    } finally {
      setApostandoEm(null)
    }
  }

  if (carregando && previsoes.length === 0) {
    return null
  }

  if (previsoes.length === 0) {
    return null
  }

  return (
    <section className={`rounded-2xl border border-holo-1/30 bg-gradient-to-br from-panel via-panel-2 to-panel p-5 shadow-xl relative overflow-hidden ${className}`}>
      {/* Glow de fundo */}
      <div className="absolute top-0 right-0 w-60 h-60 bg-holo-1/10 blur-3xl rounded-full pointer-events-none" />

      <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-holo-1/20 border border-holo-1/40 flex items-center justify-center text-holo-1 shadow-inner">
            <Sparkles size={16} />
          </div>
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-holo-1 block">
              Oráculo da Comunidade
            </span>
            <h3 className="font-anton text-lg uppercase text-text m-0">
              Previsões Apostando Mana
            </h3>
          </div>
        </div>

        <span className="font-mono text-[11px] text-muted bg-panel-2 border border-line px-2.5 py-1 rounded-full">
          {previsoes.filter((p) => p.status === 'aberta').length} abertas
        </span>
      </div>

      <div className="space-y-4 relative z-10">
        {previsoes.map((prev) => {
          const jaApostou = prev.minha_opcao !== undefined && prev.minha_opcao !== null
          const encerrada = prev.status !== 'aberta'
          const opcaoAtual = opcaoSelecionada[prev.id] ?? (prev.opcoes[0]?.id || 1)
          const manaAtual = manaSelecionada[prev.id] ?? 10
          const processando = apostandoEm === prev.id

          return (
            <div
              key={prev.id}
              className="p-4 rounded-xl bg-void/60 border border-line hover:border-holo-1/40 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-holo-3/15 border border-holo-3/30 text-holo-3">
                  {prev.titulo_anime || 'Geral'}
                </span>

                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-muted">Prêmio:</span>
                  <span className="font-bold text-gold inline-flex items-center gap-1">
                    +{prev.recompensa_anicoins} <IconeAniCoin size={12} /> +2x MP
                  </span>
                </div>
              </div>

              <h4 className="font-anton text-base uppercase text-text mb-1 leading-snug">
                {prev.pergunta}
              </h4>
              {prev.descricao && (
                <p className="text-xs text-muted mb-3 leading-relaxed">
                  {prev.descricao}
                </p>
              )}

              {/* Status de aposta do usuário */}
              {jaApostou ? (
                <div className="mt-3 p-3 rounded-lg bg-panel-2 border border-green/30 flex items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2 text-green">
                    <CheckCircle2 size={15} />
                    <span>
                      Você apostou <strong>{prev.minha_mana_apostada} MP</strong> na opção{' '}
                      <strong>"{prev.opcoes.find((o) => o.id === prev.minha_opcao)?.texto}"</strong>
                    </span>
                  </div>

                  {prev.status === 'resolvida' && (
                    <span className={`font-bold uppercase px-2 py-0.5 rounded ${prev.meu_resultado ? 'bg-green/20 text-green' : 'bg-coral/20 text-coral'}`}>
                      {prev.meu_resultado ? 'Acertou! (+2x MP e AniCoins)' : 'Errou'}
                    </span>
                  )}
                </div>
              ) : encerrada ? (
                <div className="mt-3 p-2.5 rounded-lg bg-panel-2 border border-line text-xs font-mono text-muted flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>Apostas encerradas para esta previsão.</span>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {/* Seleção de Opções */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {prev.opcoes.map((opcao) => {
                      const selecionada = opcaoAtual === opcao.id
                      return (
                        <button
                          key={opcao.id}
                          type="button"
                          onClick={() => setOpcaoSelecionada((prevMap) => ({ ...prevMap, [prev.id]: opcao.id }))}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                            selecionada
                              ? 'bg-holo-1/20 border-holo-1 text-text shadow-[0_0_12px_rgba(63,224,240,0.2)]'
                              : 'bg-panel-2 border-line hover:border-line/80 text-muted'
                          }`}
                        >
                          {opcao.texto}
                        </button>
                      )
                    })}
                  </div>

                  {/* Seleção de Mana e Botão Apostar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line/40">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted">Apostar:</span>
                      {[5, 10, 15, 20, 25].map((qtd) => (
                        <button
                          key={qtd}
                          type="button"
                          onClick={() => setManaSelecionada((prevMap) => ({ ...prevMap, [prev.id]: qtd }))}
                          className={`px-2 py-1 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
                            manaAtual === qtd
                              ? 'bg-holo-1 text-void'
                              : 'bg-panel-2 border border-line text-muted hover:text-text'
                          }`}
                        >
                          {qtd} MP
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={processando}
                      onClick={() => handleApostar(prev.id)}
                      className="px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-holo-1 to-holo-3 text-void hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
                    >
                      {processando ? 'Apostando...' : 'Confirmar Previsão'}
                    </button>
                  </div>
                </div>
              )}

              {/* Rodapé da enquete */}
              <div className="mt-3 flex items-center justify-between text-[10.5px] font-mono text-muted-2">
                <span>{prev.total_apostadores} {prev.total_apostadores === 1 ? 'membro apostou' : 'membros apostaram'}</span>
                <span>{prev.total_mana_apostada} MP acumulado no pote</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
