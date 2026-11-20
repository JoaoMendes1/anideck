// client/src/pages/Expedicoes.tsx
// Expedições (Fase 18.4a): o personagem enfrenta monstros por turnos.
//
// A luta é decidida inteira no servidor, com os atributos que ele calcula. A tela só escolhe o
// monstro e reproduz os golpes, um a um, para dar a sensação de batalha. Para quem pediu
// movimento reduzido, a luta aparece de uma vez.
//
// A Vida persiste entre as batalhas (Fase 18.5a): volta com o tempo, com episódios assistidos
// ou com Ouro, na Pousada ou com uma Poção. Sem Vida, não há batalha.
//
// Arte e mapa 2D: usa os retratos por id em client/src/assets/rpg/monstros/.
import BotaoEmGrupo from '../components/rpg/BotaoEmGrupo'
import CardContratosSemanais from '../components/rpg/CardContratosSemanais'
import ControleDeVelocidade from '../components/rpg/ControleDeVelocidade'
import MapaExpedicoes from '../components/rpg/MapaExpedicoes'
import ComprarLutaExtra from '../components/rpg/ComprarLutaExtra'
import { intervaloDaVelocidade, lerVelocidade, salvarVelocidade, type Velocidade } from '../lib/velocidadeBatalha'
import { lerPostura } from '../lib/postura'
import { useComunidade } from '../hooks/useComunidade'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BedDouble,
  Brain,
  ChevronLeft,
  Compass,
  FlaskConical,
  Hammer,
  Heart,
  LayoutGrid,
  Map as MapIcon,
  RotateCcw,
  Search,
  Sparkles,
  Swords,
  Ticket,
  Trophy,
  Waves,
  Zap,
} from 'lucide-react'
import {
  batalhar,
  batalhasRestantes,
  estiloDaRaridade,
  descreverTurno,
  horaDaPousada,
  obterExpedicoes,
  porMilEmPorcento,
  recuperarVida,
  regioesDoMapa,
  resumoDoItem,
  rotuloDaDificuldade,
  abaixoDaVidaMinima,
  ESTILO_DO_ELEMENTO,
  textoDaRelacao,
  textoDoBestiario,
  type EstadoExpedicoes,
  type MonstroNaLista,
  type RespostaBatalha,
  type TipoRecuperacao,
} from '../lib/rpg'
import IconeDoMonstro from '../components/rpg/IconeDoMonstro'
import CartaoEvento from '../components/rpg/CartaoEvento'
import { ESTILO_DO_TIPO } from '../lib/monstrosVisual'
import { rotuloDoElemento } from '../lib/personagem'
import { textoDosMateriais } from '../lib/forja'
import IconeOuro from '../components/IconeOuro'

const ROTULO_DE_SECAO = 'font-mono text-xs font-semibold uppercase tracking-widest text-muted m-0'
const CONTAINER = 'w-full min-w-0 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-3 sm:pt-6 pb-24'

function querMovimentoReduzido(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

function BarraDeVida({ rotulo, atual, maximo, cor }: { rotulo: string; atual: number; maximo: number; cor: string }) {
  const pct = maximo > 0 ? Math.max(0, Math.min(100, (atual / maximo) * 100)) : 0
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate font-bold text-text">{rotulo}</span>
        <span className="shrink-0 font-mono text-muted">
          {atual} / {maximo}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Vida de ${rotulo}`}
        aria-valuemin={0}
        aria-valuemax={maximo}
        aria-valuenow={atual}
        className="h-2.5 overflow-hidden rounded-full bg-line"
      >
        <div className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${cor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function TelaDeBatalha({
  batalha,
  monstros,
  bloqueado,
  aoEnfrentarNova,
  aoVoltar,
}: {
  batalha: RespostaBatalha
  monstros: MonstroNaLista[]
  bloqueado: boolean
  aoEnfrentarNova: (monstroId: string) => void
  aoVoltar: () => void
}) {
  const { monstro, jogador, resultado, recompensa } = batalha
  const total = resultado.turnos.length
  const [mostrados, setMostrados] = useState(() => (querMovimentoReduzido() ? total : 0))
  const [velocidade, setVelocidade] = useState<Velocidade>(lerVelocidade)
  const terminou = mostrados >= total

  useEffect(() => {
    if (terminou) return
    const id = window.setTimeout(() => setMostrados((n) => n + 1), intervaloDaVelocidade(velocidade))
    return () => window.clearTimeout(id)
  }, [mostrados, terminou, velocidade])

  const ultimo = mostrados > 0 ? resultado.turnos[mostrados - 1] : undefined
  const vidaJogador = ultimo?.vida_jogador ?? resultado.vida_inicial ?? jogador.vida
  const vidaMonstro = ultimo?.vida_monstro ?? monstro.vida
  const recentes = resultado.turnos.slice(Math.max(0, mostrados - 6), mostrados).reverse()
  const proximaEvolucao = monstro.evolui_para
    ?.map((id) => monstros.find((m) => m.id === id))
    .find((m): m is MonstroNaLista => Boolean(m))

  return (
    <section aria-label={`Batalha contra ${monstro.nome}`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-3 self-center sm:self-auto">
          <IconeDoMonstro monstro={monstro} tamanho="h-24 w-24 sm:h-28 sm:w-28" destaque iconeTamanho={40} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {(monstro.regiao_nome || monstro.comportamento) && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {monstro.regiao_nome && (
                <span className="rounded-full border border-line bg-panel-2 px-2 py-0.5 font-mono text-muted">{monstro.regiao_nome}</span>
              )}
              {monstro.comportamento && (
                <span className="inline-flex items-center gap-1 rounded-full border border-holo-2/40 bg-holo-2/10 px-2 py-0.5 font-mono text-holo-2">
                  <Brain size={11} aria-hidden="true" />
                  {monstro.comportamento}
                </span>
              )}
            </div>
          )}
          <BarraDeVida rotulo={monstro.nome} atual={vidaMonstro} maximo={monstro.vida} cor="bg-coral" />
          <BarraDeVida rotulo="Você" atual={vidaJogador} maximo={jogador.vida} cor="bg-gradient-to-r from-holo-2 to-holo-3" />
        </div>
      </div>

      <ol aria-live="polite" className="m-0 flex min-h-48 list-none flex-col gap-1.5 p-0">
        {recentes.map((turno, i) => {
          const numero = mostrados - i
          const doJogador = turno.atacante === 'jogador'
          const especial = Boolean(turno.habilidade || turno.poder || turno.invocado)
          const { texto, valor } = descreverTurno(turno, monstro.nome)
          return (
            <li
              key={numero}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                doJogador ? 'border-holo-3/30 bg-holo-3/5' : 'border-coral/30 bg-coral/5'
              } ${i === 0 ? '' : 'opacity-70'}`}
            >
              <span className="min-w-0 truncate">
                {especial ? <strong className={turno.cura && doJogador ? 'text-green' : doJogador ? 'text-holo-2' : 'text-coral'}>{texto}</strong> : texto}
                {turno.critico && <strong className="ml-1 text-gold">Crítico!</strong>}
              </span>
              <span
                className={`shrink-0 font-mono font-bold ${turno.cura && doJogador ? 'text-green' : turno.esquiva ? 'text-muted' : doJogador ? 'text-holo-3' : 'text-coral'}`}
              >
                {valor}
              </span>
            </li>
          )
        })}
      </ol>

      {terminou ? (
        <div
          role="status"
          className={`flex flex-col gap-3 rounded-2xl border p-4 ${resultado.venceu ? 'border-gold/60 bg-gold/10' : 'border-coral/50 bg-coral/10'}`}
        >
          <p className="m-0 font-anton text-3xl uppercase leading-none">{resultado.venceu ? 'Vitória' : 'Derrota'}</p>
          {resultado.venceu ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              <li className="flex items-center gap-2">
                <Ticket size={16} className="text-gold" aria-hidden="true" />
                {recompensa.bilhetes === 1 ? '1 bilhete de invocação' : `${recompensa.bilhetes} bilhetes de invocação`}
              </li>
              {(recompensa.ouro ?? 0) > 0 && (
                <li className="flex items-center gap-2">
                  <IconeOuro size={16} />
                  {recompensa.ouro} de Ouro
                </li>
              )}
              {batalha.bestiario?.novo_marco && (
                <li className="flex items-center gap-2 font-bold text-gold">
                  <Trophy size={16} aria-hidden="true" />
                  Novo marco do bestiário: +{batalha.bestiario.bonus_ouro}% de Ouro contra {batalha.monstro.nome}
                </li>
              )}
              {recompensa.materiais && textoDosMateriais(recompensa.materiais) && (
                <li className="flex items-center gap-2 text-holo-2">
                  <Hammer size={16} aria-hidden="true" />
                  Materiais da Forja: {textoDosMateriais(recompensa.materiais)}
                </li>
              )}
              {recompensa.item && (
                <li className={`flex flex-col rounded-xl border p-2.5 ${estiloDaRaridade(recompensa.item.raridade).borda}`}>
                  <span className={`font-bold ${estiloDaRaridade(recompensa.item.raridade).texto}`}>
                    <Sparkles size={14} className="mr-1 inline" aria-hidden="true" />
                    {recompensa.item.nome}
                  </span>
                  <span className="text-xs text-muted">
                    {estiloDaRaridade(recompensa.item.raridade).rotulo} · {resumoDoItem(recompensa.item)} · já no seu inventário
                  </span>
                </li>
              )}
            </ul>
          ) : (
            <p className="m-0 text-sm text-muted">
              {resultado.rodadas >= 20 && vidaJogador > 0
                ? 'A luta se arrastou demais e você recuou. Melhore o equipamento e tente de novo.'
                : `Você caiu${(recompensa.ouro_perdido ?? 0) > 0 ? ` e perdeu ${recompensa.ouro_perdido} de Ouro` : ''}. Volte a lutar com pelo menos 30% de Vida: descanse, assista a um episódio ou use a Pousada.`}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={aoVoltar}
              className="h-10 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void"
            >
              Voltar às expedições
            </button>
            <button
              type="button"
              onClick={() => aoEnfrentarNova(monstro.id)}
              disabled={bloqueado}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-holo-3/60 bg-panel-2 px-4 text-xs font-bold text-text hover:border-holo-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Enfrentar novamente
            </button>
            {proximaEvolucao && (
              <button
                type="button"
                onClick={() => aoEnfrentarNova(proximaEvolucao.id)}
                disabled={bloqueado}
                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-holo-2/60 bg-holo-2/15 px-4 text-xs font-bold text-holo-2 hover:bg-holo-2/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Swords size={13} aria-hidden="true" />
                Desafiar {proximaEvolucao.nome}
              </button>
            )}
            {recompensa.bilhetes > 0 && (
              <Link to="/invocacao" className="inline-flex h-10 items-center rounded-full border border-gold/60 px-5 text-xs font-bold text-gold">
                Usar bilhetes
              </Link>
            )}
          </div>
        </div>
      ) : (
        <ControleDeVelocidade
          velocidade={velocidade}
          aoMudar={(v) => {
            setVelocidade(v)
            salvarVelocidade(v)
          }}
          aoPular={() => setMostrados(total)}
        />
      )}
    </section>
  )
}

function PainelDaVida({
  estado,
  recuperando,
  aoRecuperar,
}: {
  estado: EstadoExpedicoes
  recuperando: TipoRecuperacao | null
  aoRecuperar: (tipo: TipoRecuperacao) => void
}) {
  // Porcentagem vem das regras da comunidade (sql/118); 40% até elas chegarem.
  const pctPocaoMana = useComunidade().estado?.regras.mp_pocao_pct ?? 40
  const vida = estado.vida
  const regras = estado.hoje.regras
  if (!vida || !regras) return null
  const ouro = estado.hoje.ouro ?? 0
  const cheia = vida.perdida_por_mil === 0
  const pousadaEm = horaDaPousada(estado.hoje.pousada_livre_em)
  const pousada = estado.custos?.pousada ?? 0
  const pocao = estado.custos?.pocao ?? 0
  const pocaoMana = estado.custos?.pocao_mana ?? 0
  const fonte = estado.custos?.fonte ?? 0
  const corDaBarra = abaixoDaVidaMinima(vida, regras) ? 'bg-coral' : vida.perdida_por_mil > 500 ? 'bg-gold' : 'bg-gradient-to-r from-holo-2 to-holo-3'
  const opcoes: { tipo: TipoRecuperacao; nome: string; efeito: string; Icone: typeof BedDouble; cor: string; preco: string; desligado: boolean; fazendo: string }[] = [
    { tipo: 'pousada', nome: 'Pousada', efeito: 'HP cheio', Icone: BedDouble, cor: 'text-holo-3', preco: pousadaEm ? `livre às ${pousadaEm}` : `${pousada} de Ouro`, desligado: cheia || ouro < pousada || pousadaEm !== '', fazendo: 'Descansando…' },
    { tipo: 'pocao', nome: 'Poção de HP', efeito: `+${porMilEmPorcento(regras.pocao)}`, Icone: FlaskConical, cor: 'text-green', preco: `${pocao} de Ouro`, desligado: cheia || ouro < pocao, fazendo: 'Bebendo…' },
  ]
  if (fonte > 0) opcoes.push({ tipo: 'fonte', nome: 'Fonte termal', efeito: 'HP e Mana · 1×/dia', Icone: Waves, cor: 'text-holo-1', preco: `${fonte} de Ouro`, desligado: ouro < fonte, fazendo: 'Relaxando…' })
  if (pocaoMana > 0) opcoes.push({ tipo: 'pocao_mana', nome: 'Poção de Mana', efeito: `+${pctPocaoMana}% da Mana`, Icone: FlaskConical, cor: 'text-mana', preco: `${pocaoMana} de Ouro`, desligado: ouro < pocaoMana, fazendo: 'Bebendo…' })

  return (
    <section id="vida" aria-labelledby="titulo-da-vida" className="flex scroll-mt-20 flex-col gap-2 rounded-2xl border border-line bg-panel p-3 sm:px-4 sm:py-3">
      <h2 id="titulo-da-vida" className="sr-only">
        Seu HP
      </h2>
      <BarraDeVida rotulo="Seu HP" atual={vida.atual} maximo={vida.maxima} cor={corDaBarra} />
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {opcoes.map((o) => (
          <button
            key={o.tipo}
            type="button"
            onClick={() => aoRecuperar(o.tipo)}
            disabled={o.desligado || recuperando !== null}
            aria-label={`${o.nome}: ${o.efeito}, ${o.preco}`}
            className="flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-line bg-panel-2/50 px-2.5 py-1.5 text-left transition-colors hover:border-holo-3/40 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <o.Icone size={15} className={`shrink-0 ${o.cor}`} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold leading-tight text-text">{recuperando === o.tipo ? o.fazendo : o.nome}</span>
              <span className="block truncate text-xs leading-tight text-muted">{o.efeito}</span>
              <span className="block truncate font-mono text-xs leading-tight text-gold">{o.preco}</span>
            </span>
          </button>
        ))}
      </div>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer select-none font-semibold text-muted hover:text-text">Como o HP funciona</summary>
        <p className="m-0 mt-1 leading-snug">
          É o mesmo HP da barra do topo: o dano das batalhas fica nele. Volta {porMilEmPorcento(regras.regen_por_hora)} por hora e{' '}
          {porMilEmPorcento(regras.por_episodio)} a cada episódio assistido ({estado.hoje.episodios_hoje ?? 0} de {regras.episodios_por_dia} hoje).
          Para lutar, precisa de {porMilEmPorcento(regras.vida_minima_luta ?? 300)}; cair custa {regras.queda_ouro_pct ?? 10}% do Ouro.
          Três dias sem episódio e o HP começa a cair.
        </p>
      </details>
    </section>
  )
}

export default function Expedicoes() {
  const location = useLocation()
  const [estado, setEstado] = useState<EstadoExpedicoes | null>(null)
  const [erro, setErro] = useState('')
  const [semPersonagem, setSemPersonagem] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [lutando, setLutando] = useState<string | null>(null)
  const [batalha, setBatalha] = useState<RespostaBatalha | null>(null)
  const [batalhaSeq, setBatalhaSeq] = useState(0)
  const [erroDaLuta, setErroDaLuta] = useState('')
  const [recuperando, setRecuperando] = useState<TipoRecuperacao | null>(null)
  const [modo, setModo] = useState<'mapa' | 'lista'>('mapa')
  const [selecionadoId, setSelecionadoId] = useState('')
  const [filtroRegiao, setFiltroRegiao] = useState('todas')
  const [busca, setBusca] = useState('')
  const [soSemVitoria, setSoSemVitoria] = useState(false)
  const [soComEvolucao, setSoComEvolucao] = useState(false)
  const topo = useRef<HTMLDivElement>(null)

  const carregar = () => {
    setCarregando(true)
    obterExpedicoes().then((r) => {
      setEstado(r.dados ?? null)
      setErro(r.erro ?? '')
      setSemPersonagem(Boolean(r.semPersonagem))
      setSelecionadoId((atual) => {
        const lista = r.dados?.monstros ?? []
        if (atual && lista.some((m) => m.id === atual)) return atual
        return lista[0]?.id ?? ''
      })
      setCarregando(false)
    })
  }

  useEffect(carregar, [])

  useEffect(() => {
    if (carregando || !location.hash) return
    const id = location.hash.replace(/^#/, '')
    if (id === 'evento' || id === 'contratos') {
      document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    }
  }, [carregando, location.hash])

  const enfrentar = async (monstroId: string) => {
    if (lutando) return
    setErroDaLuta('')
    setLutando(monstroId)
    const r = await batalhar(monstroId, lerPostura())
    setLutando(null)
    if (r.dados) {
      const dados = r.dados
      setBatalha(dados)
      setBatalhaSeq((s) => s + 1)
      setEstado((atual) => (atual ? { ...atual, hoje: dados.hoje, vida: dados.vida ?? atual.vida, passiva: dados.passiva ?? atual.passiva } : atual))
      topo.current?.scrollIntoView?.({ block: 'start' })
      return
    }
    setErroDaLuta(r.erro ?? 'Não foi possível batalhar agora.')
  }

  const recuperar = async (tipo: TipoRecuperacao) => {
    if (recuperando) return
    setErroDaLuta('')
    setRecuperando(tipo)
    const r = await recuperarVida(tipo)
    setRecuperando(null)
    if (!r.dados) {
      setErroDaLuta(r.erro ?? 'Não foi possível recuperar agora.')
      return
    }
    const dados = r.dados
    setEstado((atual) => {
      if (!atual) return atual
      const horas = atual.hoje.regras?.pousada_horas ?? 0
      const pousadaLivreEm = tipo === 'pousada' ? new Date(Date.now() + horas * 3600_000).toISOString() : atual.hoje.pousada_livre_em
      return { ...atual, vida: dados.vida, hoje: { ...atual.hoje, ouro: dados.ouro, vida_perdida: dados.vida.perdida_por_mil, pousada_livre_em: pousadaLivreEm } }
    })
  }

  const restantes = batalhasRestantes(estado?.hoje)
  const exausto = abaixoDaVidaMinima(estado?.vida, estado?.hoje.regras)
  const regiaoEmDestaque = estado?.regioes?.find((r) => r.em_destaque)
  const regioesDisponiveis = estado ? regioesDoMapa({ regioes: estado.regioes, monstros: estado.monstros }) : []
  const termo = busca.trim().toLowerCase()
  const monstrosFiltrados = (estado?.monstros ?? []).filter((m) => {
    if (filtroRegiao !== 'todas' && m.regiao !== filtroRegiao) return false
    if (soSemVitoria && (m.bestiario?.vitorias ?? 0) > 0) return false
    if (soComEvolucao && !(m.evolui_para && m.evolui_para.length > 0)) return false
    if (termo && !m.nome.toLowerCase().includes(termo) && !(m.familia ?? '').toLowerCase().includes(termo)) return false
    return true
  })

  return (
    <div ref={topo} className={CONTAINER}>
      <header className="mb-2 sm:mb-3 flex items-center gap-2.5 select-none">
        <Link
          to="/guilda"
          aria-label="Voltar para a Guilda"
          className="inline-flex h-9 items-center gap-1 rounded-full border border-line bg-panel px-3 text-xs font-bold text-text transition-colors hover:border-holo-3/60 hover:text-holo-3"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span>Voltar</span>
        </Link>
        <p className={ROTULO_DE_SECAO}>Guilda · Expedições</p>
      </header>

      {carregando ? (
        <div className="h-72 animate-pulse rounded-2xl border border-line bg-panel" />
      ) : semPersonagem ? (
        <div className="rounded-2xl border border-line bg-panel p-6 text-center">
          <h1 className="m-0 mb-2 font-anton text-2xl uppercase">Desperte o seu personagem</h1>
          <p className="m-0 mb-4 text-sm text-muted">As expedições começam depois do despertar.</p>
          <Link to="/personagem" className="inline-flex h-10 items-center rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void">
            Ir para o despertar
          </Link>
        </div>
      ) : !estado ? (
        <div className="rounded-2xl border border-line bg-panel p-6 text-center">
          <h1 className="m-0 mb-2 font-anton text-2xl uppercase">Expedições indisponíveis</h1>
          <p className="m-0 mb-4 text-sm text-muted">{erro}</p>
          <button type="button" onClick={carregar} className="h-10 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void">
            Tentar de novo
          </button>
        </div>
      ) : batalha ? (
        <TelaDeBatalha
          key={`${batalhaSeq}-${batalha.monstro.id}`}
          batalha={batalha}
          monstros={estado.monstros}
          bloqueado={restantes === 0 || exausto || lutando !== null}
          aoEnfrentarNova={enfrentar}
          aoVoltar={() => {
            setBatalha(null)
            carregar()
          }}
        />
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="m-0 font-anton text-[1.75rem] sm:text-[2.15rem] uppercase leading-none">Expedições</h1>
                <p className="m-0 text-xs sm:text-sm leading-snug text-muted">
                  Vitórias dão bilhetes, Ouro e, às vezes, um item.{' '}
                  {estado.custos_mana ? `Cada batalha gasta ${estado.custos_mana.expedicao} de Mana. ` : ''}
                  XP só vem dos animes.
                </p>
              </div>
              {(estado.passiva || regiaoEmDestaque) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {estado.passiva && (
                    <p className="m-0 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-holo-3/40 bg-holo-3/10 px-2.5 py-0.5 font-mono text-xs text-holo-3">
                      <Sparkles size={12} aria-hidden="true" />
                      <span>
                        Passiva ativa · <strong className="text-text">{estado.passiva.nome}:</strong> {estado.passiva.resumo}
                      </span>
                    </p>
                  )}
                  {regiaoEmDestaque && (
                    <p className="m-0 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-2.5 py-0.5 text-xs text-text">
                      <Compass size={13} className="shrink-0 text-gold" aria-hidden="true" />
                      <span>
                        <strong className="text-gold">Destaque de hoje:</strong> {regiaoEmDestaque.nome} ({regiaoEmDestaque.bioma}) ·{' '}
                        {regiaoEmDestaque.bonus_destaque || '+1 material da Forja garantido na vitória'}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div role="group" aria-label="Modo de visualização" className="inline-flex shrink-0 self-start rounded-full border border-line bg-panel p-1">
              <button
                type="button"
                onClick={() => setModo('mapa')}
                aria-pressed={modo === 'mapa'}
                className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
                  modo === 'mapa' ? 'bg-gradient-to-r from-holo-1 to-holo-3 text-void' : 'text-muted hover:text-text'
                }`}
              >
                <MapIcon size={13} aria-hidden="true" />
                Mapa 2D
              </button>
              <button
                type="button"
                onClick={() => setModo('lista')}
                aria-pressed={modo === 'lista'}
                className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
                  modo === 'lista' ? 'bg-gradient-to-r from-holo-1 to-holo-3 text-void' : 'text-muted hover:text-text'
                }`}
              >
                <LayoutGrid size={13} aria-hidden="true" />
                Lista
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12 lg:items-center">
            <dl className="m-0 grid grid-cols-4 gap-1.5 sm:gap-2 lg:col-span-5">
              <div className="flex min-w-0 flex-col justify-between gap-1.5 rounded-2xl border border-line bg-panel p-2.5 sm:px-3.5 sm:py-3">
                <dt className="flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-muted sm:gap-1.5">
                  <Zap size={13} className="shrink-0 text-holo-2" aria-hidden="true" /> Poder
                </dt>
                <dd className="m-0 font-anton text-lg leading-none sm:text-2xl">{estado.atributos.poder}</dd>
              </div>
              <div className="flex min-w-0 flex-col justify-between gap-1.5 rounded-2xl border border-line bg-panel p-2.5 sm:px-3.5 sm:py-3">
                <dt className="flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-muted sm:gap-1.5">
                  <Swords size={13} className="shrink-0 text-coral" aria-hidden="true" /> Hoje
                </dt>
                <dd className="m-0 font-anton text-lg leading-none sm:text-2xl">
                  {restantes}
                  <span className="font-mono text-xs text-muted"> de {estado.hoje.limite}</span>
                </dd>
              </div>
              <div className="flex min-w-0 flex-col justify-between gap-1.5 rounded-2xl border border-line bg-panel p-2.5 sm:px-3.5 sm:py-3">
                <dt className="flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-muted sm:gap-1.5">
                  <Ticket size={13} className="shrink-0 text-gold" aria-hidden="true" /> Bilhetes
                </dt>
                <dd className="m-0 font-anton text-lg leading-none sm:text-2xl">{estado.hoje.bilhetes}</dd>
              </div>
              <div className="flex min-w-0 flex-col justify-between gap-1.5 rounded-2xl border border-line bg-panel p-2.5 sm:px-3.5 sm:py-3">
                <dt className="flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-muted sm:gap-1.5">
                  <IconeOuro size={13} /> Ouro
                </dt>
                <dd className="m-0 font-anton text-lg leading-none sm:text-2xl">{estado.hoje.ouro ?? 0}</dd>
              </div>
            </dl>

            <div className="lg:col-span-7">
              <PainelDaVida estado={estado} recuperando={recuperando} aoRecuperar={recuperar} />
            </div>
          </div>

          {exausto && (
            <p role="status" className="m-0 rounded-xl border border-coral/40 bg-coral/10 p-3 text-xs text-text">
              Seu personagem está abaixo de 30% de Vida. Descanse, assista a um episódio ou use a Pousada para voltar às batalhas.
            </p>
          )}
          {restantes === 0 && <ComprarLutaExtra tipo="expedicao" aoComprar={carregar} />}
          {erroDaLuta && (
            <p role="alert" className="m-0 text-xs font-bold text-coral">
              {erroDaLuta}
            </p>
          )}

          {modo === 'mapa' ? (
            <MapaExpedicoes
              monstros={estado.monstros}
              regioesBrutas={estado.regioes}
              atributosJogador={estado.atributos}
              elementoHeroi={estado.elemento}
              classeHeroi={estado.classe}
              efeitoHeroi={estado.efeito_do_elemento}
              custoMana={estado.custos_mana?.expedicao}
              selecionadoId={selecionadoId}
              lutando={lutando}
              bloqueado={restantes === 0 || exausto}
              aoSelecionar={setSelecionadoId}
              aoEnfrentar={enfrentar}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel p-3">
                <label className="relative min-w-[180px] flex-1">
                  <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    type="search"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar monstro ou família…"
                    aria-label="Buscar monstro ou família"
                    className="h-9 w-full rounded-xl border border-line bg-panel-2 pr-3 pl-8 text-xs text-text placeholder:text-muted-2 focus:border-holo-3 focus:outline-none"
                  />
                </label>

                <div role="radiogroup" aria-label="Filtrar por região" className="-mx-1 flex w-full gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
                  {[{ id: 'todas', nome: 'Todas', faixa_nivel: '' }, ...regioesDisponiveis].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={filtroRegiao === r.id}
                      onClick={() => setFiltroRegiao(r.id)}
                      className={`h-8 shrink-0 cursor-pointer rounded-full border px-3 text-xs font-bold whitespace-nowrap ${
                        filtroRegiao === r.id ? 'border-holo-3 bg-holo-3/15 text-holo-3' : 'border-line bg-panel-2 text-muted hover:text-text'
                      }`}
                    >
                      {r.nome}
                      {r.faixa_nivel && <span className="ml-1 font-mono font-normal opacity-70">{r.faixa_nivel}</span>}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setSoSemVitoria((v) => !v)}
                  aria-pressed={soSemVitoria}
                  className={`h-9 cursor-pointer rounded-xl border px-3 text-xs font-bold transition ${
                    soSemVitoria ? 'border-gold/60 bg-gold/15 text-gold' : 'border-line bg-panel-2 text-muted hover:text-text'
                  }`}
                >
                  Falta 1ª vitória
                </button>

                <button
                  type="button"
                  onClick={() => setSoComEvolucao((v) => !v)}
                  aria-pressed={soComEvolucao}
                  className={`h-9 cursor-pointer rounded-xl border px-3 text-xs font-bold transition ${
                    soComEvolucao ? 'border-holo-3/60 bg-holo-3/15 text-holo-3' : 'border-line bg-panel-2 text-muted hover:text-text'
                  }`}
                >
                  Com evolução
                </button>
              </div>

              {monstrosFiltrados.length === 0 ? (
                <div className="rounded-2xl border border-line bg-panel p-6 text-center">
                  <p className="m-0 mb-3 text-sm text-muted">Nenhum monstro encontrado com estes filtros.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setBusca('')
                      setFiltroRegiao('todas')
                      setSoSemVitoria(false)
                      setSoComEvolucao(false)
                    }}
                    className="h-9 cursor-pointer rounded-full border border-line px-4 text-xs font-bold text-text hover:border-holo-3"
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
                  {monstrosFiltrados.map((m) => {
                    const tipo = ESTILO_DO_TIPO[m.tipo] ?? ESTILO_DO_TIPO.comum
                    const dificuldade = rotuloDaDificuldade(m.dificuldade)
                    const item = estiloDaRaridade(m.raridade_item)
                    return (
                      <li key={m.id} className={`flex flex-col gap-2 rounded-2xl border bg-panel p-3 sm:gap-3 sm:p-4 ${tipo.borda}`}>
                        <div className="flex items-start gap-3">
                          <IconeDoMonstro monstro={m} tamanho="h-20 w-20 sm:h-24 sm:w-24" destaque iconeTamanho={34} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="m-0 text-base font-bold leading-tight">{m.nome}</h2>
                              <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${dificuldade.classe}`}>{dificuldade.rotulo}</span>
                            </div>
                            <p className="m-0 font-mono text-xs text-muted">
                              {tipo.rotulo} · nível {m.nivel} · poder {m.poder}
                              {m.regiao_nome ? ` · ${m.regiao_nome}` : ''}
                            </p>
                            {m.familia && (
                              <p className="m-0 mt-0.5 font-mono text-[11px] text-holo-3">
                                Família: {m.familia}
                              </p>
                            )}
                            <p className="m-0 mt-1 line-clamp-2 text-xs leading-snug text-muted sm:line-clamp-none">{m.descricao}</p>
                          </div>
                        </div>
                        {(m.elemento || m.comportamento || (m.poderes?.length ?? 0) > 0) && (
                          <div className="flex flex-col gap-1.5">
                            <p className="m-0 flex flex-wrap items-center gap-2 text-xs">
                              {m.elemento && (
                                <span className={`rounded-full border px-2 py-0.5 font-mono ${(ESTILO_DO_ELEMENTO[m.elemento] ?? ESTILO_DO_ELEMENTO.eter).classe}`}>
                                  {(ESTILO_DO_ELEMENTO[m.elemento] ?? ESTILO_DO_ELEMENTO.eter).simbolo} {rotuloDoElemento(m.elemento)}
                                </span>
                              )}
                              {m.comportamento && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-holo-2/40 bg-holo-2/10 px-2 py-0.5 font-mono text-holo-2">
                                  <Brain size={11} aria-hidden="true" />
                                  {m.comportamento}
                                </span>
                              )}
                              {textoDaRelacao(m.elemental) && (
                                <span className={m.elemental === 'vantagem' ? 'font-bold text-green' : 'font-bold text-coral'}>{textoDaRelacao(m.elemental)}</span>
                              )}
                            </p>
                            {m.poderes?.map((p) => (
                              <p key={p.id} className="m-0 text-xs leading-snug text-muted">
                                <strong className="text-text">{p.nome}:</strong> {p.descricao}
                              </p>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Heart size={12} className="text-coral" aria-hidden="true" /> {m.vida}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Ticket size={12} className="text-gold" aria-hidden="true" /> {m.bilhetes}
                          </span>
                          {m.chance_item > 0 && (
                            <span className={item.texto}>
                              {m.chance_item}% de item {item.rotulo.toLowerCase()}
                            </span>
                          )}
                        </div>
                        {m.bestiario && (
                          <p className="m-0 inline-flex items-start gap-1.5 font-mono text-xs text-muted">
                            <Trophy size={12} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                            {textoDoBestiario(m.bestiario)}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => enfrentar(m.id)}
                            disabled={restantes === 0 || lutando !== null || exausto}
                            aria-label={`Enfrentar ${m.nome}`}
                            className="h-10 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {lutando === m.id ? 'Batalhando…' : 'Enfrentar'}
                            {lutando !== m.id && estado.custos_mana && (
                              <span className="ml-1 font-mono text-[11px] font-semibold opacity-80">· {estado.custos_mana.expedicao} MP</span>
                            )}
                          </button>
                          <BotaoEmGrupo tipo="monstro" alvoId={m.id} nome={m.nome} desativado={restantes === 0 || lutando !== null || exausto} />
                          <button
                            type="button"
                            onClick={() => {
                              setSelecionadoId(m.id)
                              setModo('mapa')
                            }}
                            className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-full border border-line px-3.5 text-xs font-bold text-muted hover:border-holo-3/60 hover:text-text"
                          >
                            Inspecionar
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          <CardContratosSemanais
            aoResgatar={(res) => {
              setEstado((atual) => (atual ? { ...atual, hoje: { ...atual.hoje, ouro: res.ouro, bilhetes: res.bilhetes } } : atual))
            }}
          />

          <CartaoEvento />
        </div>
      )}
    </div>
  )
}
