// client/src/components/detalhes/CartaoMaratona.tsx
// O card da missão especial de maratona na página do anime: as regras e os prêmios antes de
// começar; o cronômetro, o próximo episódio e a faixa valendo durante; o resultado no fim.
import { useCallback, useEffect, useState } from 'react'
import { Timer, Trophy, XCircle } from 'lucide-react'
import {
  cronometro,
  faixaAtual,
  formatarDuracao,
  iniciarMaratona,
  obterMaratona,
  pacoteEmPartes,
  pacoteEmTexto,
  type RespostaMaratona,
} from '../../lib/maratona'
import { useToast } from '../../contexts/ToastContext'

// Motivos que não interessam ao jogador neste anime: o card some em vez de explicar. Quem já
// está vendo o anime também não vê o card, para ninguém apagar progresso real só para tentar.
function semInteresse(r: RespostaMaratona): boolean {
  if (r.maratona || r.pode) return false
  const m = r.motivo ?? ''
  return m.includes('terminaram') ||
    m.includes('pelo menos 6') ||
    m.includes('até 30') ||
    m.includes('completou') ||
    m.includes('desmarque')
}

export default function CartaoMaratona({ malId }: { malId: number }) {
  const { showToast } = useToast()
  const [resp, setResp] = useState<RespostaMaratona | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [iniciando, setIniciando] = useState(false)

  const carregar = useCallback(async () => {
    const r = await obterMaratona(malId)
    if (r.dados) setResp(r.dados)
  }, [malId])

  useEffect(() => {
    carregar()
    const aoMarcar = (ev: Event) => {
      const d = (ev as CustomEvent<{ malId?: number }>).detail
      if (d?.malId === malId) carregar()
    }
    window.addEventListener('anideck:episodio-atualizado', aoMarcar)
    return () => window.removeEventListener('anideck:episodio-atualizado', aoMarcar)
  }, [carregar, malId])

  const ativa = resp?.maratona?.status === 'ativa'
  useEffect(() => {
    if (!ativa) return
    const id = window.setInterval(() => setAgora(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [ativa])

  if (!resp || semInteresse(resp)) return null
  const m = resp.maratona

  const iniciar = async () => {
    setIniciando(true)
    const r = await iniciarMaratona(malId)
    setIniciando(false)
    if (r.erro) {
      showToast(r.erro, 'error')
      return
    }
    if (r.dados) setResp(r.dados)
    setAgora(Date.now())
    showToast('Maratona iniciada! O cronômetro já está correndo.', 'success')
  }

  return (
    <section aria-label="Missão especial: maratona" className="flex flex-col gap-2.5 rounded-2xl border border-gold/40 bg-gold/[0.06] p-4 text-sm">
      <h3 className="m-0 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-gold">
        <Timer size={14} aria-hidden="true" /> Missão especial · Maratona
      </h3>

      {m?.status === 'ativa' && <MaratonaEmAndamento resp={resp} agora={agora} />}

      {m?.status === 'concluida' && (
        <p className="m-0 flex items-start gap-2 font-bold text-green">
          <Trophy size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Concluída em {formatarDuracao((Date.parse(m.terminada_em ?? m.iniciada_em) - Date.parse(m.iniciada_em)) / 1000)}
            {' · '}
            {m.faixas.find((f) => f.id === m.faixa)?.nome}: {pacoteEmTexto(m)}.
          </span>
        </p>
      )}

      {m?.status === 'falhou' && (
        <p role="alert" className="m-0 flex items-start gap-2 font-bold text-coral">
          <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {m.motivo === 'cedo'
              ? 'Maratona perdida: um episódio foi marcado antes do tempo mínimo.'
              : 'Maratona perdida: passaram as 24 horas.'}
          </span>
        </p>
      )}

      {(!m || m.status === 'falhou') && (
        <>
          <p className="m-0 text-xs leading-relaxed text-muted">
            Veja os {resp.total} episódios em até 24 horas, marcando cada um ao terminar. Entre uma marcação e outra
            precisam passar pelo menos {formatarDuracao(resp.intervalo_seg)}; marcar antes perde a maratona (o app avisa).
            Quanto mais rápido terminar, maior o pacote (o XP vem além do teto diário):
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-xs">
            {resp.faixas.map((f) => (
              <li key={f.id} className="flex flex-col gap-0.5 rounded-lg border border-line bg-void/40 px-2.5 py-1.5">
                <span>
                  <strong>{f.nome}</strong> · até {formatarDuracao(f.ate_seg)}
                </span>
                <span className="flex flex-wrap gap-1" aria-label={pacoteEmTexto(f)}>
                  {pacoteEmPartes(f).map((parte) => (
                    <span key={parte} aria-hidden="true" className="whitespace-nowrap rounded-full bg-gold/10 px-2 py-0.5 font-mono text-[11px] text-gold">
                      {parte}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          {resp.pode ? (
            <button
              type="button"
              onClick={iniciar}
              disabled={iniciando}
              className="h-10 cursor-pointer self-start rounded-full bg-gradient-to-r from-gold to-holo-1 px-5 text-xs font-extrabold text-void disabled:opacity-60"
            >
              {iniciando ? 'Iniciando…' : m ? 'Tentar de novo' : 'Iniciar maratona'}
            </button>
          ) : (
            <p className="m-0 text-xs font-bold text-muted">{resp.motivo}</p>
          )}
        </>
      )}
    </section>
  )
}

function MaratonaEmAndamento({ resp, agora }: { resp: RespostaMaratona; agora: number }) {
  const m = resp.maratona!
  const decorrido = (agora - Date.parse(m.iniciada_em)) / 1000
  const faltaProximo = (Date.parse(m.proximo_em) - agora) / 1000
  const faltaPrazo = (Date.parse(m.prazo_em) - agora) / 1000
  const faixa = faixaAtual(m.faixas, decorrido)
  const seguinte = faixa ? m.faixas[m.faixas.indexOf(faixa) + 1] : undefined

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="m-0 font-mono text-3xl font-bold tabular-nums text-text" aria-label="Tempo de maratona">
          {cronometro(decorrido)}
        </p>
        <p className="m-0 font-mono text-sm text-muted">
          {m.episodios.length} / {m.total} episódios
        </p>
      </div>
      <p className={`m-0 rounded-lg px-2.5 py-1.5 text-xs font-bold ${faltaProximo > 0 ? 'bg-coral/10 text-coral' : 'bg-green/10 text-green'}`}>
        {faltaProximo > 0
          ? `Faltam ${faltaProximo >= 3600 ? cronometro(faltaProximo) : cronometro(faltaProximo).slice(3)} para liberar o próximo episódio. Marcar antes perde a maratona.`
          : 'Próximo episódio liberado: marque ao terminar de assistir.'}
      </p>
      {faixa && (
        <p className="m-0 text-xs text-text">
          Valendo agora: <strong className="text-gold">{faixa.nome}</strong> ({pacoteEmTexto(faixa)})
          {seguinte ? ` · cai para ${seguinte.nome} em ${formatarDuracao(faixa.ate_seg - decorrido)}` : ''}
        </p>
      )}
      <p className="m-0 text-xs text-muted">Prazo final em {formatarDuracao(faltaPrazo)}.</p>
    </div>
  )
}
