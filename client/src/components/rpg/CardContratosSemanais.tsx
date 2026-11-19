// client/src/components/rpg/CardContratosSemanais.tsx
// Contratos semanais de caça exibidos na Guilda e nas Expedições: acompanha o progresso
// semanal em tempo real e permite resgatar Ouro, bilhetes e materiais da Forja.
import { useEffect, useState } from 'react'
import { CheckCircle2, Hammer, ScrollText, Ticket } from 'lucide-react'
import {
  obterContratosSemanais,
  resgatarContratoSemanal,
  type RespostaContratosRPG,
  type RespostaResgatarContrato,
} from '../../lib/rpg'
import { textoDosMateriais } from '../../lib/forja'
import { useToast } from '../../contexts/ToastContext'
import IconeOuro from '../IconeOuro'

interface Props {
  aoResgatar?: (resposta: RespostaResgatarContrato) => void
}

export default function CardContratosSemanais({ aoResgatar }: Props) {
  const { showToast } = useToast()
  const [estado, setEstado] = useState<RespostaContratosRPG | null>(null)
  const [resgatandoId, setResgatandoId] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    obterContratosSemanais().then((r) => {
      if (ativo && r.dados) setEstado(r.dados)
    })
    return () => {
      ativo = false
    }
  }, [])

  if (!estado || estado.contratos.length === 0) return null

  const resgatar = async (id: string) => {
    if (resgatandoId) return
    setResgatandoId(id)
    const r = await resgatarContratoSemanal(id)
    setResgatandoId(null)
    if (!r.dados) {
      showToast(r.erro || 'Não foi possível resgatar o contrato agora.', 'error')
      return
    }
    setEstado(r.dados.estado)
    showToast(`Contrato resgatado! +${r.dados.ouro_ganho} Ouro e +${r.dados.bilhetes_ganhos} bilhete(s).`)
    aoResgatar?.(r.dados)
  }

  return (
    <section
      id="contratos"
      aria-labelledby="titulo-contratos-semanais"
      className="scroll-mt-24 flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScrollText size={17} className="text-gold" aria-hidden="true" />
          <h2 id="titulo-contratos-semanais" className="m-0 font-anton text-lg uppercase tracking-wide">
            Contratos Semanais
          </h2>
        </div>
        <span className="font-mono text-xs text-muted">
          Semana até {estado.expira_em}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        {estado.contratos.map((c) => {
          const pct = Math.min(100, Math.round((c.progresso / Math.max(1, c.meta)) * 100))
          const materiaisTxt = c.materiais ? textoDosMateriais(c.materiais) : ''
          return (
            <div
              key={c.id}
              className={`flex flex-col justify-between gap-2.5 rounded-xl border p-3.5 ${
                c.resgatado
                  ? 'border-line/60 bg-panel-2/40 opacity-80'
                  : c.concluido
                    ? 'border-gold/55 bg-gold/10'
                    : 'border-line bg-panel-2/60'
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-sm leading-tight text-text">{c.titulo}</strong>
                  <span className="shrink-0 font-mono text-xs font-bold text-text">
                    {c.progresso}/{c.meta}
                  </span>
                </div>
                <p className="m-0 text-xs leading-snug text-muted">{c.descricao}</p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="h-1.5 overflow-hidden rounded-full border border-line/50 bg-void/70">
                  <div
                    className={`h-full rounded-full ${c.concluido ? 'bg-gold' : 'bg-gradient-to-r from-holo-1 to-holo-3'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-muted">
                    <span className="inline-flex items-center gap-1 text-gold">
                      <IconeOuro size={12} /> {c.ouro}
                    </span>
                    <span className="inline-flex items-center gap-1 text-text">
                      <Ticket size={12} className="text-gold" aria-hidden="true" /> {c.bilhetes}
                    </span>
                    {materiaisTxt && (
                      <span className="inline-flex items-center gap-1 text-holo-2">
                        <Hammer size={11} aria-hidden="true" /> {materiaisTxt}
                      </span>
                    )}
                  </div>

                  {c.resgatado ? (
                    <span className="inline-flex items-center gap-1 font-bold text-green">
                      <CheckCircle2 size={13} aria-hidden="true" /> Resgatado
                    </span>
                  ) : c.concluido ? (
                    <button
                      type="button"
                      onClick={() => resgatar(c.id)}
                      disabled={resgatandoId !== null}
                      className="cursor-pointer rounded-full bg-gradient-to-r from-gold to-holo-2 px-3 py-1 text-xs font-extrabold text-void disabled:cursor-wait disabled:opacity-60"
                    >
                      {resgatandoId === c.id ? 'Resgatando…' : 'Resgatar'}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
