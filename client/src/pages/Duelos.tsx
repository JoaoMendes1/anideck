// client/src/pages/Duelos.tsx
// Duelos (Fase 18.5b): você desafia a ficha de outro jogador. A luta é decidida no servidor
// com os atributos, as habilidades e o elemento dos dois; o desafiado não perde nada.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Coins, Crown, Medal, Swords } from 'lucide-react'
import {
  ESTILO_DO_ELEMENTO,
  descreverTurno,
  duelar,
  obterDuelos,
  relacaoElemental,
  textoDaRelacao,
  type EstadoDuelos,
  type RespostaDuelo,
} from '../lib/rpg'
import { rotuloDoElemento } from '../lib/personagem'

const ROTULO_DE_SECAO = 'font-mono text-xs font-semibold uppercase tracking-widest text-muted m-0'
const CONTAINER = 'w-full min-w-0 max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-24'

function SeloDoElemento({ elemento }: { elemento: string }) {
  const estilo = ESTILO_DO_ELEMENTO[elemento] ?? ESTILO_DO_ELEMENTO.eter
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs ${estilo.classe}`}>
      {estilo.simbolo} {rotuloDoElemento(elemento) || 'Neutro'}
    </span>
  )
}

function ResultadoDoDuelo({ resposta, aoVoltar }: { resposta: RespostaDuelo; aoVoltar: () => void }) {
  const { oponente, resultado } = resposta
  return (
    <section aria-label={`Duelo contra ${oponente.nome}`} className="flex flex-col gap-4">
      <div className={`flex flex-col gap-2 rounded-2xl border p-4 ${resultado.venceu ? 'border-gold/60 bg-gold/10' : 'border-coral/50 bg-coral/10'}`} role="status">
        <p className="m-0 font-anton text-3xl uppercase leading-none">{resultado.venceu ? 'Vitória' : 'Derrota'}</p>
        <p className="m-0 text-sm text-muted">
          Contra @{oponente.handle} (nível {oponente.nivel}) em {resultado.rodadas} {resultado.rodadas === 1 ? 'rodada' : 'rodadas'}.
          {resultado.venceu ? '' : ' Duelo não custa Vida nem Ouro.'}
        </p>
        {resultado.venceu && (
          <p className="m-0 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5"><Medal size={15} className="text-gold" aria-hidden="true" /> +{resposta.pontos_ganhos} pontos de duelo</span>
            <span className="inline-flex items-center gap-1.5"><Coins size={15} className="text-gold" aria-hidden="true" /> +{resposta.ouro_ganho} de Ouro</span>
          </p>
        )}
        {textoDaRelacao(resultado.elemental) && <p className="m-0 text-xs font-bold text-muted">{textoDaRelacao(resultado.elemental).replace('ele bate', 'o oponente bate')}</p>}
      </div>

      <ol aria-label="Golpes do duelo" className="m-0 flex list-none flex-col gap-1.5 p-0">
        {resultado.turnos.map((turno, i) => {
          const doJogador = turno.atacante === 'jogador'
          const { texto, valor } = descreverTurno(turno, oponente.nome)
          return (
            <li key={i} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${doJogador ? 'border-holo-3/30 bg-holo-3/5' : 'border-coral/30 bg-coral/5'}`}>
              <span className="min-w-0 truncate">
                {texto}
                {turno.critico && <strong className="ml-1 text-gold">Crítico!</strong>}
              </span>
              <span className={`shrink-0 font-mono font-bold ${turno.cura ? 'text-green' : doJogador ? 'text-holo-3' : 'text-coral'}`}>{valor}</span>
            </li>
          )
        })}
      </ol>
      <button type="button" onClick={aoVoltar} className="h-11 cursor-pointer self-start rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void">
        Voltar aos duelos
      </button>
    </section>
  )
}

export default function Duelos() {
  const [estado, setEstado] = useState<EstadoDuelos | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [semPersonagem, setSemPersonagem] = useState(false)
  const [lutando, setLutando] = useState<string | null>(null)
  const [resposta, setResposta] = useState<RespostaDuelo | null>(null)
  const [erroDoDuelo, setErroDoDuelo] = useState('')

  const carregar = () => {
    setCarregando(true)
    obterDuelos().then((r) => {
      setEstado(r.dados ?? null)
      setErro(r.erro ?? '')
      setSemPersonagem(Boolean(r.semPersonagem))
      setCarregando(false)
    })
  }
  useEffect(carregar, [])

  const desafiar = async (handle: string) => {
    setLutando(handle)
    setErroDoDuelo('')
    const r = await duelar(handle)
    setLutando(null)
    if (r.dados) {
      setResposta(r.dados)
      window.scrollTo?.({ top: 0 })
    } else setErroDoDuelo(r.erro ?? 'Não foi possível duelar agora.')
  }

  const restantes = estado ? Math.max(0, estado.limite - estado.feitos) : 0

  return (
    <div className={CONTAINER}>
      <header className="mb-4 flex items-center gap-1 select-none">
        <Link to="/personagem" aria-label="Voltar para o personagem" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-text">
          <ChevronLeft size={22} />
        </Link>
        <p className={ROTULO_DE_SECAO}>Duelos</p>
      </header>

      {carregando ? (
        <div className="h-72 animate-pulse rounded-2xl border border-line bg-panel" />
      ) : semPersonagem ? (
        <div className="rounded-2xl border border-line bg-panel p-6 text-center">
          <h1 className="m-0 mb-2 font-anton text-2xl uppercase">Desperte o seu personagem</h1>
          <Link to="/personagem" className="inline-flex h-11 items-center rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void">
            Ir para o despertar
          </Link>
        </div>
      ) : !estado ? (
        <div className="rounded-2xl border border-line bg-panel p-6 text-center">
          <h1 className="m-0 mb-2 font-anton text-2xl uppercase">Duelos indisponíveis</h1>
          <p className="m-0 mb-4 text-sm text-muted">{erro}</p>
          <button type="button" onClick={carregar} className="h-11 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void">
            Tentar de novo
          </button>
        </div>
      ) : resposta ? (
        <ResultadoDoDuelo resposta={resposta} aoVoltar={() => { setResposta(null); carregar() }} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="m-0 font-anton text-[clamp(2rem,8vw,2.6rem)] uppercase leading-none">Duelos</h1>
              <p className="m-0 text-sm text-muted">
                Desafie a ficha de outro jogador: atributos, habilidades e elemento dele contra os seus. Até {estado.limite} duelos por dia, um por oponente.
                Vitória dá pontos de duelo e Ouro; quem perde, não perde nada.
              </p>
            </div>

            <dl className="m-0 grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1 rounded-xl border border-line bg-panel p-3">
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Swords size={13} className="text-coral" aria-hidden="true" /> Hoje</dt>
                <dd className="m-0 font-anton text-2xl leading-none">{restantes}<span className="font-mono text-xs text-muted"> de {estado.limite}</span></dd>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-line bg-panel p-3">
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Medal size={13} className="text-gold" aria-hidden="true" /> Pontos na temporada</dt>
                <dd className="m-0 font-anton text-2xl leading-none">{estado.pontos}</dd>
              </div>
            </dl>

            {!estado.tem_perfil && (
              <p role="status" className="m-0 rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs">
                Para duelar, abra o seu perfil público: quem aparece no ranking escolheu aparecer.{' '}
                <Link to="/configuracoes#comunidade" className="font-bold text-holo-3">Abrir em Configurações</Link>
              </p>
            )}
            {erroDoDuelo && <p role="alert" className="m-0 text-xs font-bold text-coral">{erroDoDuelo}</p>}

            {estado.oponentes.length === 0 ? (
              <p className="m-0 rounded-2xl border border-line bg-panel p-4 text-sm text-muted">
                Ainda não há outros jogadores com perfil público e personagem. Convide alguém pela Guilda.
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {estado.oponentes.map((o) => {
                  const relacao = relacaoElemental(estado.elemento, o.elemento)
                  return (
                    <li key={o.handle} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-panel p-3.5">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-holo-2 to-holo-3 font-anton text-lg text-void" aria-hidden="true">
                        {o.nome.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link to={`/u/${o.handle}`} className="font-bold hover:text-holo-3">{o.nome}</Link>
                        <p className="m-0 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
                          @{o.handle} · nível {o.nivel} · {o.pontos} pts <SeloDoElemento elemento={o.elemento} />
                        </p>
                        {textoDaRelacao(relacao) && (
                          <p className={`m-0 mt-0.5 text-xs font-bold ${relacao === 'vantagem' ? 'text-green' : 'text-coral'}`}>{textoDaRelacao(relacao)}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => desafiar(o.handle)}
                        disabled={!estado.tem_perfil || o.duelado_hoje || restantes === 0 || lutando !== null}
                        aria-label={`Desafiar ${o.nome}`}
                        className="h-10 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-4 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {lutando === o.handle ? 'Duelando…' : o.duelado_hoje ? 'Feito hoje' : 'Desafiar'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <aside className="rounded-2xl border border-line bg-panel p-4">
            <h2 className="m-0 mb-3 flex items-center gap-2 font-anton text-base uppercase"><Crown size={16} className="text-gold" aria-hidden="true" /> Ranking da temporada</h2>
            {estado.ranking.length === 0 ? (
              <p className="m-0 text-sm text-muted">Ninguém pontuou nesta temporada ainda. A primeira vitória te põe no topo.</p>
            ) : (
              <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                {estado.ranking.map((l) => (
                  <li key={l.handle} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm odd:bg-panel-2/40">
                    <span className={`w-6 shrink-0 text-center font-mono text-xs font-bold ${l.posicao <= 3 ? 'text-gold' : 'text-muted'}`}>{l.posicao}</span>
                    <Link to={`/u/${l.handle}`} className="min-w-0 flex-1 truncate hover:text-holo-3">{l.nome}</Link>
                    <span className="shrink-0 font-mono text-xs text-muted">{l.vitorias}V · <b className="text-text">{l.pontos}</b></span>
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
