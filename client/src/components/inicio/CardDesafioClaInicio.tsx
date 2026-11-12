// client/src/components/inicio/CardDesafioClaInicio.tsx
// Card compacto do Desafio do Clã exibido na página Início para membros de clãs (Fase 17, #181).
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, ChevronRight, CheckCircle2, Award, Trophy } from 'lucide-react'
import { useSessao } from '../../contexts/SessaoContext'
import IconeAniCoin from '../IconeAniCoin'
import { obterMeuDesafioClaResumo, type MeuDesafioClaResumo } from '../../lib/clas'

export default function CardDesafioClaInicio() {
  const { session } = useSessao()
  const [desafio, setDesafio] = useState<MeuDesafioClaResumo | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!session) {
      setDesafio(null)
      setCarregando(false)
      return
    }

    let montado = true
    obterMeuDesafioClaResumo()
      .then((dados) => {
        if (montado) setDesafio(dados)
      })
      .catch(() => {
        if (montado) setDesafio(null)
      })
      .finally(() => {
        if (montado) setCarregando(false)
      })

    return () => {
      montado = false
    }
  }, [session])

  if (carregando || !desafio || !desafio.tem_cla || !desafio.cla_tag) {
    return null
  }

  const pct = Math.min(100, Math.max(0, desafio.progresso_pct ?? 0))
  const bateuMeta = desafio.concluido || (desafio.progresso_total ?? 0) >= (desafio.meta ?? 1)
  const minhaQtd = desafio.minha_contribuicao ?? 0
  const apto = minhaQtd >= 1

  return (
    <section className="mb-6 rounded-[22px] border border-holo-2/30 bg-gradient-to-r from-panel/95 via-panel-2/90 to-panel/95 p-4 sm:p-5 shadow-lg backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-void/80 border border-holo-2/40 flex items-center justify-center shrink-0 text-holo-3">
            <Shield size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] font-bold text-holo-3 px-1.5 py-0.2 rounded bg-holo-3/15 border border-holo-3/30">
                [{desafio.cla_tag}]
              </span>
              <span className="text-xs font-bold text-muted truncate">
                {desafio.cla_nome}
              </span>
              {bateuMeta && (
                <span className="text-[10px] font-mono font-bold text-green flex items-center gap-1 bg-green/15 px-2 py-0.2 rounded-full border border-green/30">
                  <Trophy size={10} /> Meta Batida!
                </span>
              )}
            </div>
            <h3 className="font-anton text-base uppercase text-text m-0 truncate">
              {desafio.titulo}
            </h3>
          </div>
        </div>

        <Link
          to={`/clas/${desafio.cla_tag}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-holo-3 hover:text-text transition-colors self-start sm:self-auto shrink-0"
        >
          <span>Ver desafio do clã</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* BARRA DE PROGRESSO */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-muted text-[11px]">
            Progresso coletivo:{' '}
            <strong className="text-text">
              {desafio.progresso_total} / {desafio.meta} {desafio.unidade}
            </strong>
          </span>
          <span className="font-bold text-holo-1">{pct}%</span>
        </div>

        <div className="h-2 w-full rounded-full bg-void/90 overflow-hidden border border-line/50">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              bateuMeta
                ? 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                : 'bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-muted pt-1">
          <span>
            Sua contribuição:{' '}
            <strong className="text-holo-3">{minhaQtd} {desafio.unidade}</strong>
          </span>
          <span className="flex items-center gap-1">
            {apto ? (
              <span className="text-green flex items-center gap-1 font-bold">
                <CheckCircle2 size={11} /> +{desafio.recompensa_anicoins} <IconeAniCoin size={10} /> garantidos
              </span>
            ) : (
              <span className="text-gold flex items-center gap-1 font-bold">
                <Award size={11} /> Contribua com 1 {desafio.unidade} para +{desafio.recompensa_anicoins} <IconeAniCoin size={10} />
              </span>
            )}
          </span>
        </div>
      </div>
    </section>
  )
}
