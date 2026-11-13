// client/src/components/chefao/CardChefao.tsx
// Card do Chefão da Temporada para a Início e Guilda (Fase 17.3, #185)
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Swords, Trophy, ShieldAlert, Award, ChevronRight } from 'lucide-react'
import IconeAniCoin from '../IconeAniCoin'
import {
  obterStatusChefao,
  calcularPorcentagemHP,
  obterClasseBarraHP,
  type StatusChefao,
} from '../../lib/chefao'
import { formatarTemporada } from '../../lib/dataHora'

interface Props {
  chefao?: StatusChefao | null
  className?: string
}

export default function CardChefao({ chefao: chefaoProp, className = '' }: Props) {
  const [chefaoLocal, setChefaoLocal] = useState<StatusChefao | null>(chefaoProp ?? null)
  const [carregando, setCarregando] = useState(chefaoProp === undefined)

  useEffect(() => {
    if (chefaoProp !== undefined) {
      setChefaoLocal(chefaoProp)
      setCarregando(false)
      return
    }

    let ativo = true
    obterStatusChefao()
      .then((dados) => {
        if (ativo) setChefaoLocal(dados)
      })
      .catch(() => {
        if (ativo) setChefaoLocal(null)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [chefaoProp])

  if (carregando || !chefaoLocal || !chefaoLocal.ativo) return null
  const chefao = chefaoLocal

  const porcentagem = calcularPorcentagemHP(chefao.hp_restante, chefao.hp_total)
  const estiloBarra = obterClasseBarraHP(porcentagem)

  return (
    <div
      className={`relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-panel via-panel-2 to-panel border border-coral/30 overflow-hidden shadow-lg ${className}`}
    >
      {/* Glow de fundo */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-coral/10 blur-3xl rounded-full pointer-events-none" />

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-coral/20 border border-coral/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
            {chefao.arte_url || '🐉'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-coral bg-coral/15 px-2 py-0.5 rounded-full border border-coral/30">
                Chefão da Temporada
              </span>
              <span className="font-mono text-[10px] text-muted">
                {formatarTemporada(chefao.temporada)}
              </span>
            </div>

            <h3 className="font-anton text-lg sm:text-xl text-text truncate m-0 mt-0.5 tracking-wide">
              {chefao.nome}
            </h3>
          </div>
        </div>

        {/* Status */}
        <div className="shrink-0 text-right">
          {chefao.derrotado ? (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-green/20 border border-green/40 text-green">
              <Trophy size={11} /> Derrotado!
            </span>
          ) : chefao.status === 'escapou' ? (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-panel-2 border border-line text-muted">
              Escapou
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-coral/20 border border-coral/40 text-coral animate-pulse">
              <Swords size={11} /> Em Batalha
            </span>
          )}
        </div>
      </div>

      {/* Barra de Vida Coletiva */}
      <div className="relative z-10 mb-3.5">
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <span className="text-muted flex items-center gap-1.5">
            <ShieldAlert size={13} className="text-coral" />
            <span>HP Coletivo da Raid</span>
          </span>
          <span className={`font-bold ${estiloBarra.texto}`}>
            {(chefao.hp_restante ?? 0).toLocaleString('pt-BR')} / {(chefao.hp_total ?? 0).toLocaleString('pt-BR')} ({porcentagem}%)
          </span>
        </div>

        <div className="h-3 w-full bg-void/80 rounded-full overflow-hidden p-0.5 border border-line/60">
          <div
            className={`h-full rounded-full transition-all duration-700 ${estiloBarra.barra}`}
            style={{ width: `${porcentagem}%` }}
          />
        </div>
      </div>

      {/* Rodapé: Dano do Jogador e Botão Ver Batalha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-line/50 relative z-10">
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="text-muted">Seu Dano:</span>
          <span className="font-bold text-text">{(chefao.meu_dano ?? 0).toLocaleString('pt-BR')} HP</span>

          {chefao.elegivel_recompensa ? (
            <span className="inline-flex items-center gap-1 text-[10.5px] text-gold font-bold px-2 py-0.5 rounded-md bg-gold/15 border border-gold/30">
              <Award size={11} /> Elegível para {chefao.recompensa_anicoins} <IconeAniCoin size={11} />
            </span>
          ) : (
            <span className="text-[10px] text-muted-2">
              (cause mais {Math.max(0, (chefao.dano_minimo ?? 50) - (chefao.meu_dano ?? 0))} HP para ganhar {chefao.recompensa_anicoins} ₳)
            </span>
          )}
        </div>

        <Link
          to="/chefao"
          className="inline-flex items-center justify-center gap-1 text-xs font-bold font-mono uppercase tracking-wider text-coral hover:text-text transition-colors group"
        >
          <span>Ver Batalha Completa</span>
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
