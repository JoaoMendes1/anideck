// client/src/pages/ExpedicaoDoCla.tsx
// Expedição de clã (Fase 18.5c): um chefe por semana, com a Vida somada pelo clã. Cada membro
// ataca uma vez por dia; o ataque não gasta a Vida do personagem.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Shield, Swords, Ticket, Users } from 'lucide-react'
import IconeDoMonstro from '../components/rpg/IconeDoMonstro'
import { atacarChefeDoCla, obterExpedicaoDoCla, textoDaRelacao, type EstadoExpedicaoDoCla } from '../lib/rpg'
import IconeOuro from '../components/IconeOuro'

const ROTULO_DE_SECAO = 'font-mono text-xs font-semibold uppercase tracking-widest text-muted m-0'
const CONTAINER = 'w-full min-w-0 max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10 pt-3 sm:pt-6 pb-24'

const numero = (n: number) => n.toLocaleString('pt-BR')

export default function ExpedicaoDoCla() {
  const [estado, setEstado] = useState<EstadoExpedicaoDoCla | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [semPersonagem, setSemPersonagem] = useState(false)
  const [atacando, setAtacando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [erroDoAtaque, setErroDoAtaque] = useState('')

  const carregar = () => {
    setCarregando(true)
    obterExpedicaoDoCla().then((r) => {
      setEstado(r.dados ?? null)
      setErro(r.erro ?? '')
      setSemPersonagem(Boolean(r.semPersonagem))
      setCarregando(false)
    })
  }
  useEffect(carregar, [])

  const atacar = async () => {
    setAtacando(true)
    setErroDoAtaque('')
    setAviso('')
    const r = await atacarChefeDoCla()
    setAtacando(false)
    if (!r.dados) {
      setErroDoAtaque(r.erro ?? 'Não foi possível atacar agora.')
      return
    }
    setEstado(r.dados.estado)
    setAviso(r.dados.derrubou ? `Seu golpe de ${numero(r.dados.dano)} derrubou o chefe! A recompensa já está com quem atacou.` : `Você causou ${numero(r.dados.dano)} de dano.`)
  }

  const chefe = estado?.chefe
  const pct = chefe ? Math.min(100, Math.round((chefe.dano / Math.max(1, chefe.vida_maxima)) * 100)) : 0

  return (
    <div className={CONTAINER}>
      <header className="mb-3 sm:mb-4 flex items-center gap-2.5 select-none">
        <Link
          to="/clas"
          aria-label="Voltar para os clãs"
          className="inline-flex h-9 items-center gap-1 rounded-full border border-line bg-panel px-3 text-xs font-bold text-text transition-colors hover:border-holo-3/60 hover:text-holo-3"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span>Voltar</span>
        </Link>
        <p className={ROTULO_DE_SECAO}>Clãs · Expedição do clã</p>
      </header>

      {carregando ? (
        <div className="h-72 animate-pulse rounded-2xl border border-line bg-panel" />
      ) : semPersonagem ? (
        <div className="rounded-2xl surface-glass p-6 text-center">
          <h1 className="m-0 mb-2 font-manrope font-extrabold text-xl tracking-tight">Desperte o seu personagem</h1>
          <Link to="/personagem" className="inline-flex h-10 items-center rounded-full bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 px-5 text-xs font-extrabold text-void shadow-md">Ir para o despertar</Link>
        </div>
      ) : !estado ? (
        <div className="rounded-2xl surface-glass p-6 text-center">
          <h1 className="m-0 mb-2 font-manrope font-extrabold text-xl tracking-tight">Expedição indisponível</h1>
          <p className="m-0 mb-4 text-sm text-muted">{erro}</p>
          <button type="button" onClick={carregar} className="h-10 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 px-5 text-xs font-extrabold text-void shadow-md">Tentar de novo</button>
        </div>
      ) : !estado.tem_cla || !chefe ? (
        <div className="rounded-2xl surface-glass p-6 text-center">
          <Users size={28} className="mx-auto mb-2 text-holo-1" aria-hidden="true" />
          <h1 className="m-0 mb-2 font-manrope font-extrabold text-xl tracking-tight">Entre num clã</h1>
          <p className="m-0 mb-4 text-sm text-muted">A expedição é um chefe por semana enfrentado pelo clã inteiro. Escolha um clã para participar.</p>
          <Link to="/clas" className="inline-flex h-10 items-center rounded-full bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 px-5 text-xs font-extrabold text-void shadow-md">Ver clãs</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="m-0 font-mono text-xs text-muted">
                <Link to={`/clas/${estado.cla_tag}`} className="hover:text-holo-3">[{estado.cla_tag}] {estado.cla_nome}</Link> · {estado.membros} {estado.membros === 1 ? 'membro' : 'membros'} com personagem
              </p>
              <h1 className="m-0 font-anton text-[1.75rem] sm:text-[2.6rem] uppercase leading-none">Chefe da semana</h1>
            </div>

            <section className={`flex flex-col gap-3 rounded-2xl border bg-panel p-4 ${chefe.derrotado ? 'border-gold/60' : 'border-coral/50'}`}>
              <div className="flex items-center gap-3">
                <IconeDoMonstro monstro={chefe.monstro} tamanho="h-16 w-16" />
                <div className="min-w-0 flex-1">
                  <h2 className="m-0 text-lg font-bold">{chefe.monstro.nome}</h2>
                  <p className="m-0 font-mono text-xs text-muted">nível {chefe.monstro.nivel} · {chefe.derrotado ? 'derrotado' : 'de pé'}</p>
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between font-mono text-xs text-muted">
                  <span>Dano do clã</span>
                  <span className="font-bold text-text">{numero(chefe.dano)} / {numero(chefe.vida_maxima)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full border border-line bg-void/70" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Dano do clã no chefe">
                  <div className={`h-full rounded-full ${chefe.derrotado ? 'bg-gold' : 'bg-gradient-to-r from-coral to-gold'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <p className="m-0 flex flex-wrap items-center gap-3 text-xs text-muted">
                Recompensa para quem atacar na semana:
                <span className="inline-flex items-center gap-1 font-bold text-text"><IconeOuro size={13} /> {chefe.ouro} de Ouro</span>
                <span className="inline-flex items-center gap-1 font-bold text-text"><Ticket size={13} className="text-gold" aria-hidden="true" /> {chefe.bilhetes} bilhetes</span>
              </p>
              {textoDaRelacao(estado.elemental) && (
                <p className={`m-0 text-xs font-bold ${estado.elemental === 'vantagem' ? 'text-green' : 'text-coral'}`}>{textoDaRelacao(estado.elemental)}</p>
              )}
              {aviso && <p role="status" className="m-0 rounded-xl border border-holo-3/40 bg-holo-3/10 p-3 text-sm font-bold">{aviso}</p>}
              {erroDoAtaque && <p role="alert" className="m-0 text-xs font-bold text-coral">{erroDoAtaque}</p>}
              {chefe.derrotado ? (
                <p className="m-0 text-sm text-muted">
                  {estado.recebeu ? 'O chefe caiu e a sua parte da recompensa já foi entregue.' : 'O chefe caiu antes de você atacar. Ataque na próxima semana para receber.'} Um novo chefe aparece na segunda.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={atacar}
                  disabled={estado.atacou_hoje || atacando}
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-gold px-5 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Swords size={15} aria-hidden="true" /> {atacando ? 'Atacando…' : estado.atacou_hoje ? 'Você já atacou hoje' : 'Atacar o chefe'}
                </button>
              )}
              <p className="m-0 inline-flex items-start gap-1.5 text-xs text-muted">
                <Shield size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> Um ataque por dia, de até 20 rodadas. Não gasta a Vida do seu personagem.
              </p>
            </section>
          </div>

          <aside className="rounded-2xl border border-line bg-panel p-4">
            <h2 className="m-0 mb-3 font-anton text-base uppercase">Quem mais bateu</h2>
            {estado.ranking.length === 0 ? (
              <p className="m-0 text-sm text-muted">Ninguém atacou ainda nesta semana. Seja o primeiro.</p>
            ) : (
              <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                {estado.ranking.map((l, i) => (
                  <li key={i} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${l.sou_eu ? 'bg-holo-3/10' : 'odd:bg-panel-2/40'}`}>
                    <span className="w-5 shrink-0 text-center font-mono text-xs text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{l.nome}{l.sou_eu ? ' (você)' : ''}</span>
                    <span className="shrink-0 font-mono text-xs text-muted">{l.ataques}× · <b className="text-text">{numero(l.dano)}</b></span>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
