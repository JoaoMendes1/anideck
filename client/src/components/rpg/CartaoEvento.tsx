// client/src/components/rpg/CartaoEvento.tsx
// Evento da temporada nas Expedições: o arauto da temporada, as marcas e a luta do dia.
// Some sozinho quando o evento não responde (SQL ainda não aplicado, por exemplo).
import { useEffect, useState } from 'react'
import { CalendarClock, Crown, Swords } from 'lucide-react'
import { lerPostura } from '../../lib/postura'
import EscolhaDePostura from './EscolhaDePostura'
import ReplayCompacto from './ReplayCompacto'
import IconeDoMonstro from './IconeDoMonstro'
import { ESTILO_DO_ELEMENTO, lutarNoEvento, obterEvento, textoDaRelacao, type EstadoEvento, type RespostaEvento } from '../../lib/rpg'
import { textoDoPrazo } from '../../lib/missoes'
import { rotuloDoElemento } from '../../lib/personagem'

export default function CartaoEvento() {
  const [estado, setEstado] = useState<EstadoEvento | null>(null)
  const [lutando, setLutando] = useState(false)
  const [resposta, setResposta] = useState<RespostaEvento | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    obterEvento().then((r) => { if (ativo) setEstado(r.dados ?? null) })
    return () => { ativo = false }
  }, [])

  if (!estado) return null
  const { evento, monstro } = estado
  const elemento = ESTILO_DO_ELEMENTO[evento.elemento] ?? ESTILO_DO_ELEMENTO.eter
  const pct = Math.min(100, Math.round((estado.vitorias / Math.max(1, estado.meta)) * 100))

  const lutar = async () => {
    setLutando(true)
    setErro('')
    const r = await lutarNoEvento(lerPostura())
    setLutando(false)
    if (r.dados) {
      setResposta(r.dados)
      setEstado(r.dados.estado)
    } else setErro(r.erro ?? 'Não foi possível lutar agora.')
  }

  return (
    <section id="evento" aria-labelledby="titulo-do-evento" className="scroll-mt-28 flex flex-col gap-3 rounded-2xl border border-gold/50 bg-gradient-to-br from-gold/10 via-panel to-holo-2/10 p-4">
      <div className="flex items-start gap-3">
        <IconeDoMonstro monstro={monstro} tamanho="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <p className="m-0 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
            Evento da temporada · {evento.estacao} {evento.ano}
            <span className="inline-flex items-center gap-1"><CalendarClock size={12} aria-hidden="true" /> {textoDoPrazo(evento.fim)}</span>
          </p>
          <h2 id="titulo-do-evento" className="m-0 text-lg font-bold">{monstro.nome}</h2>
          <p className="m-0 text-xs text-muted">{evento.descricao} Nível {monstro.nivel}, no seu nível.</p>
          <p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full border px-2 py-0.5 font-mono ${elemento.classe}`}>{elemento.simbolo} {rotuloDoElemento(evento.elemento)}</span>
            {textoDaRelacao(estado.elemental) && (
              <span className={estado.elemental === 'vantagem' ? 'font-bold text-green' : 'font-bold text-coral'}>{textoDaRelacao(estado.elemental)}</span>
            )}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between font-mono text-xs text-muted">
          <span className="inline-flex items-center gap-1"><Crown size={12} className="text-gold" aria-hidden="true" /> Marcas: título “{evento.titulo}” e {estado.ouro_premio} de Ouro</span>
          <span className="font-bold text-text">{estado.vitorias} / {estado.meta}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full border border-line bg-void/70">
          <div className="h-full rounded-full bg-gradient-to-r from-gold to-holo-2" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {resposta && (
        <div role="status" className={`flex flex-col gap-1.5 rounded-xl border p-3 text-sm ${resposta.resultado.venceu ? 'border-gold/50 bg-gold/10' : 'border-coral/40 bg-coral/10'}`}>
          <ReplayCompacto
            turnos={resposta.resultado.turnos}
            nomeDoMonstro={monstro.nome}
            desfecho={
              <>
                <strong>{resposta.resultado.venceu ? 'Vitória! +1 marca.' : 'O arauto venceu hoje. Sem perda: tente amanhã.'}</strong>
                {resposta.premiado_agora && <strong className="text-gold">Meta alcançada: o título “{evento.titulo}” é seu, e o Ouro já está na carteira.</strong>}
              </>
            }
          />
        </div>
      )}
      {erro && <p role="alert" className="m-0 text-xs font-bold text-coral">{erro}</p>}

      {estado.premiado && !resposta?.premiado_agora ? (
        <p className="m-0 text-xs font-bold text-gold">Você já conquistou o título desta temporada. As lutas seguem valendo para treinar.</p>
      ) : null}
      {!estado.lutou_hoje && <EscolhaDePostura />}
      <button
        type="button"
        onClick={lutar}
        disabled={estado.lutou_hoje || lutando}
        className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 self-start rounded-full bg-gradient-to-r from-gold to-holo-2 px-5 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Swords size={15} aria-hidden="true" /> {lutando ? 'Lutando…' : estado.lutou_hoje ? 'Volte amanhã' : 'Enfrentar o arauto'}
      </button>
      <p className="m-0 text-xs text-muted">Uma luta por dia, com a Vida cheia. Perder não custa nada.</p>
    </section>
  )
}
