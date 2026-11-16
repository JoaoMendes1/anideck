// client/src/components/inicio/PlayerHudInicio.tsx
// Palco do herói no topo da Início: o personagem do jogador, a insígnia do rank, o nível e
// os recursos do dia (Vitalidade, Mana e AniCoins).
// O mesmo bloco de identidade serve as duas larguras: no celular ele fica por cima da arte
// (mesma célula do grid); no desktop ganha coluna própria, ao lado da insígnia e do palco.
import { Link } from 'react-router-dom'
import { ChevronRight, SlidersHorizontal, Sparkles, Target } from 'lucide-react'
import BarraVital from '../hud/BarraVital'
import FlamulaRank from '../hud/FlamulaRank'
import InsigniaRank from '../hud/InsigniaRank'
import OrbeVital, { OrbeMoeda } from '../hud/OrbeVital'
import SeloStreak from '../hud/SeloStreak'
import { useResumoGuilda } from '../../hooks/useResumoGuilda'
import { useComunidade } from '../../hooks/useComunidade'
import { obterHPEscaladoDoEstado, obterMPMaxDoEstado } from '../../lib/comunidade'
import { useCarteira } from '../../hooks/useCarteira'
import { useMissoesHoje } from '../../hooks/useMissoesHoje'
import { usePersonagem } from '../../hooks/usePersonagem'
import {
  ALTURA_DA_ARTE,
  LARGURA_DA_ARTE,
  PERSONAGEM_BASE_PADRAO,
  arteDoEstagio,
  visualEmUso,
  rotuloDaClasse,
  rotuloDoElemento,
} from '../../lib/personagem'

interface Props {
  nome: string | null
  dataHoje: string
  aoAbrirGosto: () => void
}

// Cantos cortados em diagonal: a assinatura visual do palco.
const CHANFRO = '[clip-path:polygon(22px_0,100%_0,100%_calc(100%-22px),calc(100%-22px)_100%,0_100%,0_22px)]'

// Posição, tamanho, cor e atraso de cada partícula que sobe do palco.
const PARTICULAS = [
  { esquerda: '62%', baixo: 70, tamanho: 4, cor: '#3FE0F0', atraso: '0s' },
  { esquerda: '80%', baixo: 40, tamanho: 3, cor: '#FF4FD8', atraso: '2s' },
  { esquerda: '70%', baixo: 110, tamanho: 3, cor: '#F1EEFA', atraso: '3.6s' },
  { esquerda: '88%', baixo: 150, tamanho: 4, cor: '#3FE0F0', atraso: '5s' },
]

function PainelCarregando() {
  return <section className="mb-6 h-[560px] lg:h-[440px] rounded-3xl shimmer" aria-label="Carregando seu painel" />
}

export default function PlayerHudInicio({ nome, dataHoje, aoAbrirGosto }: Props) {
  const status = useResumoGuilda()
  const { estado, indisponivel } = useComunidade()
  const { saldo, carregando: carregandoCarteira } = useCarteira()
  const { concluidas, total, todasResgatadas } = useMissoesHoje()
  const { dados: personagem } = usePersonagem()

  if (!status) return <PainelCarregando />

  const heroi = personagem?.existe ? personagem : null
  const base = heroi?.personagem?.personagem_base ?? PERSONAGEM_BASE_PADRAO
  const visual = visualEmUso(heroi)
  const arte = visual ? arteDoEstagio(base, visual) : undefined
  const classe = heroi?.personagem
    ? `${rotuloDaClasse(heroi.personagem.classe)} do ${rotuloDoElemento(heroi.personagem.elemento)}`
    : ''
  const hpEscalado = estado ? obterHPEscaladoDoEstado(estado, status.nivel) : { atual: 0, maximo: 100, pct: 0 }
  const mana = estado ? Math.floor(estado.mana) : 0
  const mpMax = estado ? obterMPMaxDoEstado(estado, status.nivel) : 0
  const faltam = Math.max(0, status.xp_para_proximo - status.xp_no_nivel)
  const questsProntas = total > 0 && concluidas === total && !todasResgatadas

  const rolarParaMissoes = () => {
    document.getElementById('missoes-diarias-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section className={`mb-6 p-px bg-gradient-to-br from-holo-3/65 via-holo-2/25 to-holo-1/50 ${CHANFRO}`}>
      <div className={`relative overflow-hidden bg-gradient-to-br from-[#171034] to-[#0d0a1d] ${CHANFRO}`}>
        <div className="grid grid-cols-1 lg:grid-cols-[190px_270px_minmax(0,1fr)] xl:grid-cols-[220px_300px_minmax(0,1fr)]">

          {/* Coluna do rank: só no desktop; no celular a flâmula cumpre o papel. */}
          <div className="hidden lg:flex lg:row-span-2 flex-col items-center justify-center gap-3 px-4 py-8 border-r border-holo-3/15 bg-[radial-gradient(circle_at_50%_40%,rgba(63,224,240,0.14),transparent_70%)]">
            <Link to="/guilda" className="rounded-xl focus-visible:outline-2 focus-visible:outline-holo-3" aria-label={`Rank ${status.rank}: ${status.titulo_rank}. Abrir a Guilda`}>
              <InsigniaRank rank={status.rank} tamanho={130} />
            </Link>
            <span className="font-mono text-xs font-bold tracking-[0.16em] text-holo-3">RANK {status.rank}</span>
            <span className="font-anton text-xl uppercase text-center leading-tight text-text">{status.titulo_rank}</span>
            {status.proximo_rank && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-line bg-void/60 text-xs font-bold text-muted">
                Próximo
                <InsigniaRank rank={status.proximo_rank} tamanho={22} />
                {status.nivel_proximo_rank ? `no nível ${status.nivel_proximo_rank}` : ''}
              </span>
            )}
          </div>

          {/* Palco: no celular divide a célula com a identidade, que fica por cima. */}
          <div className="relative col-start-1 row-start-1 lg:col-start-2 lg:row-span-2 min-h-[340px] lg:min-h-[440px] overflow-hidden">
            <div aria-hidden className="palco-aura absolute -right-20 top-6 w-[330px] h-[330px] lg:left-[-15px] lg:right-auto rounded-full bg-[radial-gradient(circle,rgba(63,224,240,0.42),rgba(123,92,255,0.22)_42%,transparent_70%)]" />
            <div aria-hidden className="hidden lg:block absolute left-12 right-12 bottom-5 h-5 rounded-[50%] bg-[radial-gradient(ellipse,rgba(63,224,240,0.45),transparent_70%)]" />
            {PARTICULAS.map((p, i) => (
              <span
                key={i}
                aria-hidden
                className="palco-particula absolute rounded-full"
                style={{ left: p.esquerda, bottom: p.baixo, width: p.tamanho, height: p.tamanho, background: p.cor, boxShadow: `0 0 8px ${p.cor}`, animationDelay: p.atraso }}
              />
            ))}
            {arte ? (
              <img
                src={arte.inteira}
                width={LARGURA_DA_ARTE}
                height={ALTURA_DA_ARTE}
                alt={heroi?.personagem ? `${heroi.personagem.nome}, ${classe}, no estágio ${heroi.estagio?.nome}` : ''}
                fetchPriority="high"
                // O brilho também é um filter: com skin, os dois vão juntos no mesmo valor.
                style={arte.filtro ? { filter: `${arte.filtro} drop-shadow(0 0 18px rgba(63,224,240,0.35))` } : undefined}
                className="palco-respira absolute bottom-0 right-[-40px] h-[330px] w-auto lg:right-auto lg:left-1/2 lg:-translate-x-1/2 lg:bottom-3 lg:h-[420px] drop-shadow-[0_0_18px_rgba(63,224,240,0.35)]"
              />
            ) : (
              // Sem personagem: a insígnia ocupa o palco no celular e o convite fica no desktop.
              <div className="absolute inset-0 flex items-center justify-end pr-6 lg:justify-center lg:pr-0">
                <span className="lg:hidden opacity-90"><InsigniaRank rank={status.rank} tamanho={120} /></span>
                <Link
                  to="/personagem"
                  className="hidden lg:flex flex-col items-center gap-3 px-6 py-5 rounded-2xl border border-dashed border-holo-3/40 bg-void/40 text-center text-sm font-bold text-holo-3 hover:bg-holo-3/10 transition-colors"
                >
                  <Sparkles size={22} aria-hidden />
                  Desperte seu personagem
                  <span className="text-xs font-semibold text-muted">Ele evolui junto com o seu nível</span>
                </Link>
              </div>
            )}
            {heroi?.estagio && (
              <span className="hidden lg:block absolute left-4 bottom-3 font-mono text-xs tracking-[0.14em] text-muted uppercase">
                Estágio · {heroi.estagio.nome}
              </span>
            )}
            {/* Véu: no celular garante a leitura do texto que fica por cima da arte. */}
            <div aria-hidden className="lg:hidden absolute inset-0 bg-gradient-to-r from-[#0d0a1d]/95 via-[#0d0a1d]/60 via-50% to-transparent" />
            <div aria-hidden className="lg:hidden absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0d0a1d]/90 to-transparent" />
          </div>

          {/* Identidade */}
          <div className="relative z-10 col-start-1 row-start-1 lg:col-start-3 flex flex-col gap-4 p-4 sm:p-6 lg:pl-6 lg:pr-8 lg:pt-7 min-h-[340px] lg:min-h-0">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div className="flex flex-col items-start gap-2 min-w-0 max-w-[230px] sm:max-w-sm lg:max-w-none">
                <Link to="/guilda" className="lg:hidden rounded-lg focus-visible:outline-2 focus-visible:outline-holo-3" aria-label={`Rank ${status.rank}: ${status.titulo_rank}. Abrir a Guilda`}>
                  <FlamulaRank rank={status.rank} titulo={status.titulo_rank} tamanho={46} />
                </Link>
                <p className="font-mono text-xs text-muted uppercase tracking-[0.12em] m-0">{dataHoje}</p>
                {/* leading folgado: com leading-none, o corte do texto apaga os acentos da Anton. */}
                <h1 className="font-anton text-3xl lg:text-[44px] uppercase leading-tight m-0 text-text max-w-full truncate">
                  {nome ?? 'Sua central'}
                </h1>
                {heroi?.personagem ? (
                  <p className="text-sm font-bold text-holo-3 m-0">
                    {heroi.personagem.nome} · {classe}
                  </p>
                ) : (
                  <Link to="/personagem" className="lg:hidden text-sm font-bold text-holo-3 hover:underline">
                    Desperte seu personagem ›
                  </Link>
                )}
                {/* No celular o streak vira uma pílula de uma linha; o selo completo fica no desktop. */}
                {status.streak_atual > 0 && (
                  <span className="lg:hidden mt-1">
                    <SeloStreak dias={status.streak_atual} compacto />
                  </span>
                )}
              </div>
              {status.streak_atual > 0 && (
                <div className="hidden lg:block shrink-0">
                  <SeloStreak dias={status.streak_atual} />
                </div>
              )}
            </div>

            <div className="mt-auto lg:mt-2 flex items-end gap-3 lg:gap-4">
              <span className="font-anton text-6xl lg:text-7xl leading-[0.85] bg-gradient-to-b from-[#FFF3CC] to-gold bg-clip-text text-transparent tabular-nums">
                {status.nivel}
              </span>
              <div className="flex-1 flex flex-col gap-2 pb-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="font-mono text-xs font-bold tracking-[0.14em] text-muted uppercase tabular-nums">
                    Nível · <b className="text-gold">{status.xp_no_nivel}</b>/{status.xp_para_proximo} XP
                  </span>
                  <span className={`text-xs font-extrabold ${status.progresso_pct >= 90 ? 'rounded-full px-2.5 py-0.5 bg-gold text-void' : 'text-muted'}`}>
                    Faltam {faltam} XP
                  </span>
                </div>
                <BarraVital tipo="xp" pct={status.progresso_pct} className="h-2.5 w-full" />
                {status.teto_diario > 0 && (
                  <span className="font-mono text-xs text-muted tabular-nums">
                    Hoje: {status.xp_hoje}/{status.teto_diario} XP
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Recursos e atalhos: no celular abaixo do palco; no desktop, na base da coluna de status. */}
          <div className="col-start-1 lg:col-start-3 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 px-4 pb-5 pt-4 sm:px-6 lg:pl-6 lg:pr-8 lg:pt-2 lg:pb-7 border-t border-holo-3/15 lg:border-t-0 bg-void/40 lg:bg-transparent">
            <div className="grid grid-cols-3 gap-2 lg:gap-5 lg:w-[330px]">
              {estado ? (
                <>
                  <OrbeVital
                    tipo="hp"
                    pct={hpEscalado.pct}
                    valor={hpEscalado.atual}
                    maximo={hpEscalado.maximo}
                    rotulo="Vitalidade"
                    detalhe={estado.hp >= 80 ? <span className="text-green font-bold">Bônus de XP</span> : 'Assista para recuperar'}
                    para="/guilda"
                  />
                  <OrbeVital
                    tipo="mp"
                    pct={mpMax > 0 ? (mana / mpMax) * 100 : 0}
                    valor={mana}
                    maximo={mpMax}
                    rotulo="Mana"
                    detalhe={mana >= mpMax && mpMax > 0 ? 'Cheia' : 'Gasta ao comentar'}
                    para="/guilda"
                  />
                </>
              ) : indisponivel ? (
                <p className="col-span-2 self-center text-xs text-muted m-0">
                  Vitalidade e Mana aparecem quando a comunidade estiver disponível.
                </p>
              ) : (
                <>
                  <span className="mx-auto w-20 h-20 rounded-full shimmer" aria-hidden />
                  <span className="mx-auto w-20 h-20 rounded-full shimmer" aria-hidden />
                </>
              )}
              {carregandoCarteira ? <span className="mx-auto w-20 h-20 rounded-full shimmer" aria-hidden /> : <OrbeMoeda saldo={saldo} />}
            </div>

            {/* No celular os três atalhos dividem uma linha: sem ícone e sem seta, para o texto
                caber inteiro em 360 px. */}
            <div className="grid grid-cols-[1.25fr_1.1fr_0.9fr] gap-2 whitespace-nowrap sm:flex sm:flex-wrap xl:flex-col xl:items-stretch xl:w-[190px]">
              <button
                type="button"
                onClick={rolarParaMissoes}
                className={`inline-flex items-center justify-center xl:justify-between gap-1.5 sm:gap-2 h-9 sm:h-11 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-holo-3 ${
                  todasResgatadas
                    ? 'bg-green/10 border-green/30 text-green hover:bg-green/20'
                    : questsProntas
                    ? 'bg-gold/15 border-gold/45 text-gold hover:bg-gold/25'
                    : 'bg-gold/10 border-gold/35 text-gold hover:bg-gold/20'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 sm:gap-2"><Target className="hidden sm:block w-4 h-4" aria-hidden /> Missões</span>
                <span className="inline-flex items-center font-mono tabular-nums">{concluidas}/{total}<ChevronRight size={14} className="hidden sm:block" aria-hidden /></span>
              </button>
              <Link
                to="/meu-gosto"
                className="inline-flex items-center justify-center xl:justify-start gap-1.5 sm:gap-2 h-9 sm:h-11 px-2 sm:px-4 rounded-xl bg-holo-2/15 border border-holo-2/40 text-xs sm:text-sm font-extrabold text-[#c7b8ff] hover:bg-holo-2/25 transition-colors focus-visible:outline-2 focus-visible:outline-holo-3"
              >
                <Sparkles className="hidden sm:block w-4 h-4" aria-hidden /> Meu Gosto
              </Link>
              <button
                type="button"
                onClick={aoAbrirGosto}
                title="Ajustar preferências de gênero e curadoria"
                className="inline-flex items-center justify-center xl:justify-start gap-1.5 sm:gap-2 h-9 sm:h-11 px-2 sm:px-4 rounded-xl bg-panel-2 border border-line hover:border-holo-2 text-xs sm:text-sm font-bold text-text transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-holo-3"
              >
                <SlidersHorizontal className="hidden sm:block w-4 h-4 text-holo-2" aria-hidden /> Ajustar<span className="hidden sm:inline"> gosto</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
