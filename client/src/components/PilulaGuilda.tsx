// client/src/components/PilulaGuilda.tsx
// HUD da Navbar, em todas as páginas: rank, nível, três barras (XP, Vitalidade e Mana) e as
// duas moedas (AniCoins e Ouro). Quanto mais larga a tela, mais números aparecem na pílula.
// Quando um valor muda (episódio marcado, comentário publicado), o ganho sobe da pílula
// por um instante. Tocar abre o painel com os números e o que faz cada barra mudar.
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Droplet, Heart, Sparkles, Users, X, ShoppingBag } from 'lucide-react'
import IconeAniCoin from './IconeAniCoin'
import IconeOuro from './IconeOuro'
import AvisoTemporada0 from './AvisoTemporada0'

import { avisosDaMudanca, type AvisoDoHud, type FotoDoJogador } from '../lib/hud'
import { obterHPEscaladoDoEstado, obterMPMaxDoEstado } from '../lib/comunidade'
import { useResumoGuilda } from '../hooks/useResumoGuilda'
import { useComunidade } from '../hooks/useComunidade'
import { useCarteira } from '../hooks/useCarteira'
import BarrasVitais from './comunidade/BarrasVitais'
import BarraVital from './hud/BarraVital'
import InsigniaRank from './hud/InsigniaRank'
import SeloStreak from './hud/SeloStreak'

// Tempo que cada aviso fica na tela; a animação em index.css (.aviso-hud) dura o mesmo.
const DURACAO_AVISO = 1800

const ESTILO_DO_AVISO: Record<AvisoDoHud['tipo'], string> = {
  xp: 'text-gold border-gold/50',
  xp_perdido: 'text-coral border-coral/50',
  nivel: 'text-void bg-gradient-to-r from-holo-1 to-holo-2 border-transparent',
  rank_queda: 'text-coral border-coral/60 bg-void/95',
  hp: 'text-coral border-coral/50',
  mp: 'text-holo-3 border-holo-3/50',
  cristal: 'text-holo-3 border-holo-3/50',
  ouro: 'text-gold border-gold/50',
}

// Número da Vitalidade ou da Mana na pílula. De 2xl para cima ganha o máximo e uma barra
// própria; abaixo disso, só o número, para caber ao lado da busca.
function IndicadorVital({ tipo, atual, maximo }: { tipo: 'hp' | 'mp'; atual: number; maximo: number }) {
  const Icone = tipo === 'hp' ? Heart : Droplet
  const cor = tipo === 'hp' ? 'text-coral' : 'text-mana'
  const preenchido = tipo === 'hp' ? 'fill-coral/25' : 'fill-mana/25'
  return (
    <span className="inline-flex flex-col gap-1 2xl:w-[72px]">
      <span className={`inline-flex items-center gap-1 ${cor}`}>
        <Icone size={13} className={preenchido} aria-hidden />
        {atual}
        <span className="hidden 2xl:inline text-muted-2 font-normal">/{maximo}</span>
      </span>
      <BarraVital tipo={tipo} pct={maximo > 0 ? (atual / maximo) * 100 : 0} className="hidden 2xl:block h-1 w-full" />
    </span>
  )
}

export default function PilulaGuilda() {
  const status = useResumoGuilda()
  const { estado } = useComunidade()
  const { saldo } = useCarteira()
  const ouro = typeof status?.ouro === 'number' ? status.ouro : null
  const [aberto, setAberto] = useState(false)
  const [avisos, setAvisos] = useState<(AvisoDoHud & { id: number })[]>([])
  const raiz = useRef<HTMLDivElement>(null)
  const anterior = useRef<FotoDoJogador | null>(null)
  const proximoId = useRef(0)
  const { pathname } = useLocation()

  const nivel = status?.nivel ?? 1
  const hpEscalado = estado ? obterHPEscaladoDoEstado(estado, nivel) : null
  const hp = hpEscalado ? hpEscalado.atual : null
  const hpMax = hpEscalado ? hpEscalado.maximo : 100
  const mp = estado ? Math.floor(estado.mana) : null
  const mpMax = estado ? obterMPMaxDoEstado(estado, nivel) : 50

  // Compara com a última foto e solta os avisos do que mudou. A primeira leitura só
  // registra a foto: carregar a página não é ganho.
  useEffect(() => {
    if (!status) return
    const foto: FotoDoJogador = {
      xp: status.xp_total,
      nivel: status.nivel,
      rank: status.rank,
      hp,
      mp,
      cristais: saldo,
      ouro,
      ultimoEstornoMissaoEm: status.ultimo_estorno_missao_em ?? null,
    }
    const novos = avisosDaMudanca(anterior.current, foto)
    // Sem comunidade na leitura anterior, HP e MP entram agora como base, sem aviso.
    anterior.current = foto
    if (novos.length === 0) return
    const comId = novos.map(a => ({ ...a, id: ++proximoId.current }))
    setAvisos(atuais => [...atuais, ...comId].slice(-4))
    const ids = new Set(comId.map(a => a.id))
    window.setTimeout(() => setAvisos(atuais => atuais.filter(a => !ids.has(a.id))), DURACAO_AVISO)
  }, [status, hp, mp, saldo, ouro])

  // Fecha ao trocar de página, ao tocar fora e com Esc.
  useEffect(() => {
    setAberto(false)
  }, [pathname])
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent | TouchEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('touchstart', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('touchstart', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  if (!status) return null

  const resumoTitulo = [
    `Rank ${status.rank} · Nível ${status.nivel} (${status.xp_no_nivel}/${status.xp_para_proximo} XP)`,
    hp !== null ? `Vitalidade ${hp}/${hpMax}` : '',
    mp !== null && estado ? `Mana ${mp}/${mpMax}` : '',
    `${saldo.toLocaleString('pt-BR')} AniCoins`,
    ouro !== null ? `${ouro.toLocaleString('pt-BR')} de Ouro` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div ref={raiz} className="relative flex items-center select-none">
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-label={`Seu status: ${resumoTitulo}`}
        title={resumoTitulo}
        className="flex items-center gap-2 sm:gap-2.5 h-10 pl-1 pr-2.5 sm:pr-3 rounded-full border border-line bg-panel/80 transition-colors hover:border-holo-2/70 focus-visible:outline-2 focus-visible:outline-holo-3 cursor-pointer"
      >
        <InsigniaRank rank={status.rank} tamanho={34} />

        <span className="flex flex-col gap-1 w-16 sm:w-[88px] 2xl:w-36">
          <span className="flex items-baseline justify-between gap-2 font-mono text-xs leading-none">
            <b className="text-text font-bold">Nv {status.nivel}</b>
            <span className="hidden sm:inline 2xl:hidden text-muted tabular-nums">{Math.round(status.progresso_pct)}%</span>
            <span className="hidden 2xl:inline text-muted tabular-nums">
              {status.xp_no_nivel}<span className="text-muted-2">/{status.xp_para_proximo} XP</span>
            </span>
          </span>
          <BarraVital tipo="xp" pct={status.progresso_pct} />
          {/* No celular e no tablet não há espaço para os números: Vitalidade e Mana viram barras. */}
          {estado && (
            <span className="flex gap-1 lg:hidden">
              <BarraVital tipo="hp" pct={estado.hp} className="h-1 flex-1" />
              <BarraVital tipo="mp" pct={mpMax > 0 ? (estado.mana / mpMax) * 100 : 0} className="h-1 flex-1" />
            </span>
          )}
        </span>

        {estado && hp !== null && mp !== null && (
          <span className="hidden lg:flex items-center gap-2.5 2xl:gap-3 pl-2.5 2xl:pl-3 border-l border-line font-mono text-xs font-bold tabular-nums leading-none">
            <IndicadorVital tipo="hp" atual={hp} maximo={hpMax} />
            <IndicadorVital tipo="mp" atual={mp} maximo={mpMax} />
          </span>
        )}

        {/* As duas moedas lado a lado: AniCoins (holográfica) e Ouro (metal), cada uma com o seu ícone. */}
        <span className="hidden xl:inline-flex items-center gap-2.5 2xl:gap-3 pl-2.5 2xl:pl-3 border-l border-line font-mono text-xs font-bold text-text tabular-nums">
          <span className="inline-flex items-center gap-1" title="AniCoins">
            <IconeAniCoin size={15} /> {saldo.toLocaleString('pt-BR')}
          </span>
          {ouro !== null && (
            <span className="inline-flex items-center gap-1 text-gold" title="Ouro do RPG">
              <IconeOuro size={15} /> {ouro.toLocaleString('pt-BR')}
            </span>
          )}
        </span>
      </button>

      {/* Avisos de ganho: sobem da pílula e somem sozinhos. */}
      <div className="absolute top-full right-0 mt-1.5 flex flex-col items-end gap-1 pointer-events-none z-[60]" aria-live="polite">
        {avisos.map(a => (
          <span key={a.id} className={`aviso-hud px-2 py-0.5 rounded-full border bg-void/90 font-mono text-xs font-bold shadow-lg ${ESTILO_DO_AVISO[a.tipo]}`}>
            {a.texto}
          </span>
        ))}
      </div>

      {aberto && (
        <div
          role="dialog"
          aria-label="Seu status"
          className="fixed left-4 right-4 top-[68px] md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-[340px] z-[70] rounded-2xl border border-line bg-panel/95 backdrop-blur-xl p-4 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)]"
        >
          <div className="flex items-start gap-3 mb-4">
            <InsigniaRank rank={status.rank} tamanho={52} />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-muted-2 uppercase tracking-widest m-0">Rank {status.rank} · Nível {status.nivel}</p>
              <p className="font-anton text-lg uppercase leading-tight m-0 truncate">{status.titulo_rank}</p>
              <AvisoTemporada0 compacto />
            </div>
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="w-8 h-8 shrink-0 grid place-items-center rounded-full text-muted hover:text-text cursor-pointer">
              <X size={16} aria-hidden />
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between font-mono text-xs mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-muted uppercase tracking-wider">
                <Sparkles size={12} className="text-gold" aria-hidden /> XP
              </span>
              <span className="text-text font-bold">
                {status.xp_no_nivel}
                <span className="text-muted-2">/{status.xp_para_proximo}</span>
              </span>
            </div>
            <BarraVital tipo="xp" pct={status.progresso_pct} className="h-2 w-full" />
            <p className="text-xs text-muted-2 mt-1.5 mb-0">
              {status.xp_hoje > 0 ? `+${status.xp_hoje} XP hoje` : 'Nenhum XP hoje ainda'}
              {status.teto_diario > 0 ? ` (o teto diário é ${status.teto_diario}).` : '.'} Cada episódio marcado vale XP.
            </p>
          </div>

          {status.streak_atual > 0 && (
            <Link to="/meu-gosto" className="flex mb-2 rounded-[14px] focus-visible:outline-2 focus-visible:outline-holo-3">
              <SeloStreak dias={status.streak_atual} />
            </Link>
          )}

          <div className="grid grid-cols-2 gap-2 mb-4">
            <Link
              to="/loja"
              title="Abrir a Loja"
              className="flex flex-col gap-1 p-2.5 rounded-xl bg-panel-2/60 border border-line/60 hover:border-holo-3/60 transition-colors group"
            >
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted group-hover:text-text uppercase tracking-wider">
                <IconeAniCoin size={15} /> AniCoins
              </span>
              <span className="font-mono text-sm font-bold text-holo-3 tabular-nums">
                {saldo.toLocaleString('pt-BR')} <span className="text-xs font-normal text-muted-2">→ Loja</span>
              </span>
            </Link>
            <Link
              to="/expedicoes"
              title="Abrir as Expedições"
              className="flex flex-col gap-1 p-2.5 rounded-xl bg-panel-2/60 border border-line/60 hover:border-gold/60 transition-colors group"
            >
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted group-hover:text-text uppercase tracking-wider">
                <IconeOuro size={15} /> Ouro
              </span>
              <span className="font-mono text-sm font-bold text-gold tabular-nums">
                {ouro !== null ? ouro.toLocaleString('pt-BR') : '—'} <span className="text-xs font-normal text-muted-2">→ RPG</span>
              </span>
            </Link>
          </div>

          {estado ? (
            <BarrasVitais estado={estado} nivel={status.nivel} />
          ) : (
            <p className="text-[12px] text-muted-2 m-0">Vitalidade e Mana aparecem quando a comunidade estiver disponível.</p>
          )}

          {estado && !estado.perfil.existe && (
            <Link to="/configuracoes#comunidade" className="block mt-4 px-4 py-2 rounded-full text-center text-xs font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2">
              Criar perfil público para comentar
            </Link>
          )}

          <div className="grid grid-cols-4 gap-1.5 mt-4">
            <Link to="/guilda" className="px-1.5 py-2 rounded-xl border border-line text-center text-xs font-bold text-text hover:border-holo-3">
              Guilda
            </Link>
            <Link to="/clas" className="inline-flex items-center justify-center gap-1 px-1.5 py-2 rounded-xl border border-holo-3/40 bg-holo-3/10 text-center text-xs font-bold text-holo-3 hover:bg-holo-3/20">
              <Users size={12} /> Clãs
            </Link>
            <Link to="/loja" className="inline-flex items-center justify-center gap-1 px-1.5 py-2 rounded-xl border border-gold/40 bg-gold/10 text-center text-xs font-bold text-gold hover:bg-gold/20">
              <ShoppingBag size={12} /> Loja
            </Link>
            <Link to="/membros" className="inline-flex items-center justify-center gap-1 px-1.5 py-2 rounded-xl border border-line text-xs font-bold text-text hover:border-holo-3">
              Ranking
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
