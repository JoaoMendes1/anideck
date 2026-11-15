// client/src/components/inicio/PlayerHudInicio.tsx
// Painel do jogador no topo da Início: quem é (rank, nível, título), quanto falta para o
// próximo nível e os três recursos do dia (Vitalidade, Mana e AniCoins).
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Droplet, Heart, SlidersHorizontal, Sparkles, Target } from 'lucide-react'
import IconeAniCoin from '../IconeAniCoin'
import BarraVital, { type TipoDeBarra } from '../hud/BarraVital'
import FlamulaRank from '../hud/FlamulaRank'
import SeloStreak from '../hud/SeloStreak'
import { useResumoGuilda } from '../../hooks/useResumoGuilda'
import { useComunidade } from '../../hooks/useComunidade'
import { useCarteira } from '../../hooks/useCarteira'
import { useMissoesHoje } from '../../hooks/useMissoesHoje'

interface Props {
  nome: string | null
  dataHoje: string
  aoAbrirGosto: () => void
}

interface PropsDoRecurso {
  para: string
  rotulo: string
  icone: ReactNode
  valor: ReactNode
  detalhe?: ReactNode
  barra?: { tipo: TipoDeBarra; pct: number }
}

// Um recurso do jogador: rótulo, número grande e, quando faz sentido, a barra.
function Recurso({ para, rotulo, icone, valor, detalhe, barra }: PropsDoRecurso) {
  return (
    <Link
      to={para}
      className="group flex flex-col gap-2 p-3 sm:p-4 rounded-2xl bg-panel-2/60 border border-line transition-colors hover:border-holo-2/60 focus-visible:outline-2 focus-visible:outline-holo-3"
    >
      <span className="flex items-center gap-1.5 text-xs font-bold text-muted group-hover:text-text transition-colors">
        {/* Abaixo de 400 px o rótulo ocupa a largura toda do cartão; o ícone cede o lugar. */}
        <span className="hidden min-[400px]:inline-flex shrink-0">{icone}</span>
        <span className="truncate">{rotulo}</span>
      </span>
      <span className="font-anton text-2xl sm:text-3xl leading-none tabular-nums">{valor}</span>
      {barra && <BarraVital tipo={barra.tipo} pct={barra.pct} />}
      {detalhe && <span className="text-xs text-muted-2 leading-snug">{detalhe}</span>}
    </Link>
  )
}

function RecursoCarregando() {
  return <div className="h-[104px] sm:h-[124px] rounded-2xl shimmer" aria-hidden />
}

export default function PlayerHudInicio({ nome, dataHoje, aoAbrirGosto }: Props) {
  const status = useResumoGuilda()
  const { estado, indisponivel } = useComunidade()
  const { saldo, carregando: carregandoCarteira } = useCarteira()
  const { concluidas, total, todasResgatadas } = useMissoesHoje()

  const mana = estado ? Math.floor(estado.mana) : 0
  const mpMax = estado?.regras.mp_max ?? 0
  const questsProntas = total > 0 && concluidas === total && !todasResgatadas

  const rolarParaMissoes = () => {
    document.getElementById('missoes-diarias-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section className="mb-6 rounded-3xl border border-line bg-panel/85 backdrop-blur-md p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.35)]">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
        {/* Identidade: emblema do rank, saudação e progresso do nível */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-muted-2 uppercase tracking-wider m-0">{dataHoje}</p>
            {/* leading folgado e padding: com leading-none, o truncate corta os acentos da Anton. */}
            <h1 className="font-anton text-2xl sm:text-3xl uppercase leading-tight pt-1 m-0 text-text truncate">
              {nome ? `Olá, ${nome}` : 'Sua central'}
            </h1>
            {status && (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 mt-3 mb-4">
                  <Link to="/guilda" title={`Rank ${status.rank} · ${status.titulo_rank}`} className="flex rounded-lg focus-visible:outline-2 focus-visible:outline-holo-3">
                    <FlamulaRank rank={status.rank} titulo={status.titulo_rank} tamanho={52} />
                  </Link>
                  {status.streak_atual > 0 && <SeloStreak dias={status.streak_atual} />}
                </div>
                <BarraVital tipo="xp" pct={status.progresso_pct} className="h-2.5 w-full max-w-md" />
                <p className="font-mono text-xs text-muted-2 mt-1.5 mb-0 tabular-nums">
                  <b className="text-text">Nível {status.nivel}</b> · <b className="text-gold">{status.xp_no_nivel}</b>/{status.xp_para_proximo} XP para o nível {status.nivel + 1}
                  {status.teto_diario > 0 && (
                    <span className="hidden sm:inline"> · hoje {status.xp_hoje}/{status.teto_diario}</span>
                  )}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Atalhos */}
        <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:max-w-[340px]">
          <button
            type="button"
            onClick={rolarParaMissoes}
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-bold border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-holo-3 ${
              todasResgatadas
                ? 'bg-green/10 border-green/30 text-green hover:bg-green/20'
                : questsProntas
                ? 'bg-gold/15 border-gold/40 text-gold hover:bg-gold/25'
                : 'bg-panel-2 border-line text-text hover:border-holo-2'
            }`}
          >
            <Target size={14} aria-hidden />
            <span className="tabular-nums">{concluidas}/{total} missões</span>
            <ChevronRight size={14} className="opacity-70" aria-hidden />
          </button>
          <button
            type="button"
            onClick={aoAbrirGosto}
            title="Ajustar preferências de gênero e curadoria"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-panel-2 border border-line hover:border-holo-2 text-xs font-bold text-text transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-holo-3"
          >
            <SlidersHorizontal size={14} className="text-holo-2" aria-hidden />
            Ajustar gosto
          </button>
          <Link
            to="/meu-gosto"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-holo-2/15 border border-holo-2/30 text-xs font-bold text-holo-2 hover:bg-holo-2/25 transition-colors focus-visible:outline-2 focus-visible:outline-holo-3"
          >
            <Sparkles size={14} aria-hidden />
            Meu Gosto
          </Link>
        </div>
      </div>

      {/* Recursos do dia. Sem dado ainda, mostra o esqueleto: nunca um valor inventado. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6 pt-4 border-t border-line/60">
        {estado ? (
          <>
            <Recurso
              para="/guilda"
              rotulo="Vitalidade"
              icone={<Heart size={14} className="text-coral fill-coral/25 shrink-0" aria-hidden />}
              valor={<>{estado.hp}<span className="text-base text-muted-2">/100</span></>}
              barra={{ tipo: 'hp', pct: estado.hp }}
              detalhe={estado.hp >= 80 ? <span className="text-green font-bold">Bônus de XP ativo</span> : 'Assista para recuperar'}
            />
            <Recurso
              para="/guilda"
              rotulo="Mana"
              icone={<Droplet size={14} className="text-mana fill-mana/25 shrink-0" aria-hidden />}
              valor={<>{mana}<span className="text-base text-muted-2">/{mpMax}</span></>}
              barra={{ tipo: 'mp', pct: mpMax > 0 ? (mana / mpMax) * 100 : 0 }}
              detalhe="Gasta ao comentar"
            />
          </>
        ) : indisponivel ? (
          <p className="col-span-2 self-center text-xs text-muted-2 m-0">
            Vitalidade e Mana aparecem quando a comunidade estiver disponível.
          </p>
        ) : (
          <>
            <RecursoCarregando />
            <RecursoCarregando />
          </>
        )}

        {carregandoCarteira ? (
          <RecursoCarregando />
        ) : (
          <Recurso
            para="/loja"
            rotulo="AniCoins"
            icone={<IconeAniCoin size={14} />}
            valor={saldo.toLocaleString('pt-BR')}
            detalhe={<span className="text-gold font-bold group-hover:underline">Abrir a Loja</span>}
          />
        )}
      </div>
    </section>
  )
}
