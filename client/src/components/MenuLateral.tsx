// client/src/components/MenuLateral.tsx
// Menu lateral do desktop (xl para cima), para quem está logado. De xl a 2xl é sempre um
// trilho de ícones, para não tirar largura das páginas; de 2xl para cima abre com os
// rótulos e pode ser recolhido. Abaixo de xl a navegação continua na barra superior e,
// no celular, na barra inferior.
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BarChart2, CalendarDays, Compass, Home, LayoutGrid, PanelLeftClose, PanelLeftOpen,
  Shield, ShoppingBag, Swords, Trophy, UserRound, Users,
} from 'lucide-react'
import { LogoMark } from './Brand'
import InsigniaRank from './hud/InsigniaRank'
import BarraVital from './hud/BarraVital'
import { useSessao } from '../contexts/SessaoContext'
import { useResumoGuilda } from '../hooks/useResumoGuilda'
import { ITENS_GUILDA, ITENS_JORNADA, itemAtivo, type ItemDoMenu } from '../lib/menuLateral'

const ICONES: Record<string, ReactNode> = {
  '/': <Home size={20} aria-hidden />,
  '/descobrir': <Compass size={20} aria-hidden />,
  '/deck': <LayoutGrid size={20} aria-hidden />,
  '/calendario': <CalendarDays size={20} aria-hidden />,
  '/rankings': <Trophy size={20} aria-hidden />,
  '/meu-gosto': <BarChart2 size={20} aria-hidden />,
  '/guilda': <Swords size={20} aria-hidden />,
  '/clas': <Users size={20} aria-hidden />,
  '/loja': <ShoppingBag size={20} aria-hidden />,
  '/personagem': <UserRound size={20} aria-hidden />,
  '/admin': <Shield size={20} aria-hidden />,
}

interface Props {
  /** Preferência do usuário; só vale de 2xl para cima. */
  aberto: boolean
  aoAlternar: () => void
}

// Classes escritas por extenso: o Tailwind não gera classe montada por interpolação.
function classesDoEstado(aberto: boolean) {
  return {
    soAberto: aberto ? 'hidden 2xl:inline' : 'hidden',
    soAbertoBloco: aberto ? 'hidden 2xl:flex' : 'hidden',
    soTrilho: aberto ? '2xl:hidden' : '',
    alinhamento: aberto ? '2xl:justify-start 2xl:px-3.5' : '',
  }
}

function Item({ item, aberto, caminho }: { item: ItemDoMenu; aberto: boolean; caminho: string }) {
  const { soAberto, alinhamento } = classesDoEstado(aberto)
  const ativo = itemAtivo(item, caminho)
  return (
    <Link
      to={item.para}
      title={item.rotulo}
      aria-current={ativo ? 'page' : undefined}
      className={`relative flex items-center justify-center gap-3 h-11 rounded-xl text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-holo-3 ${alinhamento} ${
        ativo
          ? 'text-text bg-gradient-to-r from-holo-2/35 to-holo-3/10 shadow-[inset_0_0_0_1px_rgba(123,92,255,0.5),0_0_18px_rgba(123,92,255,0.25)]'
          : 'text-muted hover:text-text hover:bg-panel-2/70'
      }`}
    >
      {ativo && <span aria-hidden className="absolute -left-3 top-2.5 bottom-2.5 w-[3px] rounded-full bg-holo-3 shadow-[0_0_8px_var(--color-holo-3)]" />}
      <span className={`flex shrink-0 ${ativo ? 'text-holo-3' : ''}`}>{ICONES[item.para]}</span>
      <span className={soAberto}>{item.rotulo}</span>
    </Link>
  )
}

function Grupo({ titulo, itens, aberto, caminho }: { titulo: string; itens: ItemDoMenu[]; aberto: boolean; caminho: string }) {
  const { soAberto, soTrilho } = classesDoEstado(aberto)
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`px-3.5 pt-4 pb-1.5 font-mono text-xs font-bold tracking-[0.16em] text-muted-2 ${soAberto}`}>{titulo}</span>
      {/* No trilho, um filete separa os grupos no lugar do título. */}
      <span aria-hidden className={`mx-3 my-2 h-px bg-line ${soTrilho}`} />
      {itens.map((item) => <Item key={item.para} item={item} aberto={aberto} caminho={caminho} />)}
    </div>
  )
}

const ITENS_GESTAO: ItemDoMenu[] = [{ para: '/admin', rotulo: 'Painel Admin' }]

export default function MenuLateral({ aberto, aoAlternar }: Props) {
  const { isAdmin } = useSessao()
  const status = useResumoGuilda()
  const { pathname } = useLocation()
  const { soAberto, soAbertoBloco, soTrilho, alinhamento } = classesDoEstado(aberto)

  return (
    <aside
      aria-label="Menu principal"
      className="hidden xl:flex fixed left-0 top-0 bottom-0 z-50 w-[var(--menu-lateral)] flex-col px-3 py-4 bg-gradient-to-b from-panel/95 to-void/95 backdrop-blur-md border-r border-line overflow-y-auto"
    >
      <Link to="/" className={`flex items-center justify-center gap-2.5 h-11 mb-1 rounded-xl focus-visible:outline-2 focus-visible:outline-holo-3 ${alinhamento}`} aria-label="AniDeck, início">
        <LogoMark />
        <span className={`font-anton text-xl tracking-wide ${soAberto}`}>
          Ani<span className="text-holo">Deck</span>
        </span>
      </Link>

      <nav className="flex flex-col">
        <Grupo titulo="JORNADA" itens={ITENS_JORNADA} aberto={aberto} caminho={pathname} />
        <Grupo titulo="GUILDA" itens={ITENS_GUILDA} aberto={aberto} caminho={pathname} />
        {isAdmin && <Grupo titulo="GESTÃO" itens={ITENS_GESTAO} aberto={aberto} caminho={pathname} />}
      </nav>

      <div className="flex-1 min-h-4" />

      {status && (
        <>
          <Link
            to="/guilda"
            className={`flex-col gap-2.5 p-3.5 rounded-2xl border border-holo-3/30 bg-gradient-to-br from-holo-3/10 to-panel/90 hover:border-holo-3/60 transition-colors focus-visible:outline-2 focus-visible:outline-holo-3 ${soAbertoBloco}`}
          >
            <span className="flex items-center gap-2.5">
              <InsigniaRank rank={status.rank} tamanho={40} />
              <span className="flex flex-col min-w-0">
                <b className="text-sm text-text truncate">{status.titulo_rank}</b>
                <span className="text-xs font-bold text-holo-3">Nível {status.nivel} · Rank {status.rank}</span>
              </span>
            </span>
            <BarraVital tipo="xp" pct={status.progresso_pct} />
            <span className="font-mono text-xs text-muted tabular-nums">
              <b className="text-gold">{status.xp_no_nivel}</b>/{status.xp_para_proximo} XP
            </span>
          </Link>
          <Link
            to="/guilda"
            title={`Rank ${status.rank} · Nível ${status.nivel}`}
            className={`flex justify-center py-1 rounded-xl focus-visible:outline-2 focus-visible:outline-holo-3 ${soTrilho}`}
          >
            <InsigniaRank rank={status.rank} tamanho={40} />
          </Link>
        </>
      )}

      <button
        type="button"
        onClick={aoAlternar}
        aria-expanded={aberto}
        className="hidden 2xl:flex items-center justify-center gap-2.5 h-10 mt-2 rounded-xl text-xs font-bold text-muted-2 hover:text-text hover:bg-panel-2/70 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-holo-3"
      >
        {aberto ? <PanelLeftClose size={18} aria-hidden /> : <PanelLeftOpen size={18} aria-hidden />}
        <span className={aberto ? '' : 'sr-only'}>{aberto ? 'Recolher menu' : 'Abrir menu'}</span>
      </button>
    </aside>
  )
}
