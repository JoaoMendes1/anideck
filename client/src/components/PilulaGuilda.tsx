// client/src/components/PilulaGuilda.tsx
// HUD da Navbar, em todas as páginas: rank, nível e três barras (XP, Vitalidade e Mana).
// Quando um valor muda (episódio marcado, comentário publicado), o ganho sobe da pílula
// por um instante. Tocar abre o painel com os números e o que faz cada barra mudar.
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Flame, Sparkles, Users, X } from 'lucide-react'
import IconeAniCoin from './IconeAniCoin'
import { obterEstiloRank } from '../lib/guilda'
import { avisosDaMudanca, type AvisoDoHud, type FotoDoJogador } from '../lib/hud'
import { useResumoGuilda } from '../hooks/useResumoGuilda'
import { useComunidade } from '../hooks/useComunidade'
import { useCarteira } from '../hooks/useCarteira'
import BarrasVitais from './comunidade/BarrasVitais'

// Tempo que cada aviso fica na tela; a animação em index.css (.aviso-hud) dura o mesmo.
const DURACAO_AVISO = 1800

const ESTILO_DO_AVISO: Record<AvisoDoHud['tipo'], string> = {
  xp: 'text-gold border-gold/50',
  nivel: 'text-void bg-gradient-to-r from-holo-1 to-holo-2 border-transparent',
  hp: 'text-coral border-coral/50',
  mp: 'text-holo-3 border-holo-3/50',
  cristal: 'text-holo-3 border-holo-3/50',
}

// O `largura` muda conforme o lugar: na coluna, flex-1 encolheria a altura a zero.
function MiniBarra({ pct, classe, largura = 'w-full' }: { pct: number; classe: string; largura?: string }) {
  return (
    <span className={`h-1.5 rounded-full bg-panel-2 overflow-hidden block ${largura} border border-line/30`}>
      <i className={`block h-full transition-all duration-700 ${classe}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </span>
  )
}

export default function PilulaGuilda() {
  const status = useResumoGuilda()
  const { estado } = useComunidade()
  const { saldo } = useCarteira()
  const [aberto, setAberto] = useState(false)
  const [avisos, setAvisos] = useState<(AvisoDoHud & { id: number })[]>([])
  const raiz = useRef<HTMLDivElement>(null)
  const anterior = useRef<FotoDoJogador | null>(null)
  const proximoId = useRef(0)
  const { pathname } = useLocation()

  const hp = estado ? estado.hp : null
  const mp = estado ? Math.floor(estado.mana) : null

  // Compara com a última foto e solta os avisos do que mudou. A primeira leitura só
  // registra a foto: carregar a página não é ganho.
  useEffect(() => {
    if (!status) return
    const foto: FotoDoJogador = { xp: status.xp_total, nivel: status.nivel, hp, mp, cristais: saldo }
    const novos = avisosDaMudanca(anterior.current, foto)
    // Sem comunidade na leitura anterior, HP e MP entram agora como base, sem aviso.
    anterior.current = foto
    if (novos.length === 0) return
    const comId = novos.map(a => ({ ...a, id: ++proximoId.current }))
    setAvisos(atuais => [...atuais, ...comId].slice(-4))
    const ids = new Set(comId.map(a => a.id))
    window.setTimeout(() => setAvisos(atuais => atuais.filter(a => !ids.has(a.id))), DURACAO_AVISO)
  }, [status, hp, mp, saldo])

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

  const estilo = obterEstiloRank(status.rank)
  const resumoTitulo = [
    `Rank ${status.rank} · Nível ${status.nivel} (${status.xp_no_nivel}/${status.xp_para_proximo} XP)`,
    hp !== null ? `Vitalidade ${hp}/100` : '',
    mp !== null && estado ? `Mana ${mp}/${estado.regras.mp_max}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div ref={raiz} className="relative flex items-center gap-2 select-none">
      {status.streak_atual > 0 && (
        <Link
          to="/meu-gosto"
          title={`Streak atual: ${status.streak_atual} ${status.streak_atual === 1 ? 'dia' : 'dias'}`}
          className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10.5px] font-bold border border-green/40 bg-green/12 text-green hover:bg-green/20 transition-colors"
        >
          <Flame size={12} className="fill-green/30" />
          {status.streak_atual}
        </Link>
      )}

      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-label={`Seu status: ${resumoTitulo}`}
        title={resumoTitulo}
        className={`flex items-center gap-2 py-1 pl-1.5 pr-2.5 rounded-full border transition-all hover:brightness-110 cursor-pointer ${estilo.bordaPilula} ${estilo.fundoPilula}`}
      >
        <span className={`w-5 h-5 rounded-full grid place-items-center shrink-0 font-anton text-[11px] leading-none ${estilo.seloBg}`}>{status.rank}</span>
        <span className="flex flex-col gap-[3px] min-w-[64px] sm:min-w-[84px]">
          <span className="flex items-center justify-between gap-2 font-mono text-[9px] text-muted leading-none">
            <b className="text-text font-bold">Nv {status.nivel}</b>
            <span className="hidden sm:inline">
              {status.xp_no_nivel}/{status.xp_para_proximo}
            </span>
          </span>
          <MiniBarra pct={status.progresso_pct} classe={estilo.corBarra} />
          {estado && (
            <span className="flex gap-1">
              <MiniBarra pct={estado.hp} classe="bg-gradient-to-r from-rose-500 to-coral shadow-[0_0_6px_rgba(255,107,107,0.4)]" largura="flex-1" />
              <MiniBarra pct={(estado.mana / estado.regras.mp_max) * 100} classe="bg-gradient-to-r from-sky-400 to-holo-3 shadow-[0_0_6px_rgba(34,211,238,0.4)]" largura="flex-1" />
            </span>
          )}
        </span>
      </button>

      {/* Avisos de ganho: sobem da pílula e somem sozinhos. */}
      <div className="absolute top-full right-0 mt-1.5 flex flex-col items-end gap-1 pointer-events-none z-[60]" aria-live="polite">
        {avisos.map(a => (
          <span key={a.id} className={`aviso-hud px-2 py-0.5 rounded-full border bg-void/90 font-mono text-[11px] font-bold shadow-lg ${ESTILO_DO_AVISO[a.tipo]}`}>
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
            <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 font-anton text-xl leading-none ${estilo.seloBg}`}>{status.rank}</span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest m-0">Rank {status.rank} · Nível {status.nivel}</p>
              <p className="font-anton text-lg uppercase leading-tight m-0 truncate">{status.titulo_rank}</p>
            </div>
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="w-8 h-8 shrink-0 grid place-items-center rounded-full text-muted hover:text-text cursor-pointer">
              <X size={16} aria-hidden />
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between font-mono text-[10.5px] mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-muted uppercase tracking-wider">
                <Sparkles size={12} className="text-gold" aria-hidden /> XP
              </span>
              <span className="text-text font-bold">
                {status.xp_no_nivel}
                <span className="text-muted-2">/{status.xp_para_proximo}</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-panel-2 overflow-hidden border border-line/60">
              <div className={`h-full rounded-full transition-all duration-700 ${estilo.corBarra}`} style={{ width: `${Math.min(100, Math.max(0, status.progresso_pct))}%` }} />
            </div>
            <p className="text-[11.5px] text-muted-2 mt-1.5 mb-0">
              {status.xp_hoje > 0 ? `+${status.xp_hoje} XP hoje` : 'Nenhum XP hoje ainda'}
              {status.teto_diario > 0 ? ` (o teto diário é ${status.teto_diario}).` : '.'} Cada episódio marcado vale XP.
            </p>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-panel-2/60 border border-line/60 mb-4">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted uppercase tracking-wider">
              <IconeAniCoin size={15} /> AniCoins
            </span>
            <span className="font-mono text-xs font-bold text-holo-3 flex items-center gap-1">
              {saldo.toLocaleString('pt-BR')} ₳
            </span>
          </div>

          {estado ? (
            <BarrasVitais estado={estado} />
          ) : (
            <p className="text-[12px] text-muted-2 m-0">Vitalidade e Mana aparecem quando a comunidade estiver disponível.</p>
          )}

          {estado && !estado.perfil.existe && (
            <Link to="/configuracoes#comunidade" className="block mt-4 px-4 py-2 rounded-full text-center text-xs font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2">
              Criar perfil público para comentar
            </Link>
          )}

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Link to="/guilda" className="px-3 py-2 rounded-xl border border-line text-center text-[12.5px] font-bold text-text hover:border-holo-3">
              Abrir Guilda
            </Link>
            <Link to="/membros" className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-line text-[12.5px] font-bold text-text hover:border-holo-3">
              <Users size={13} aria-hidden /> Ranking
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
