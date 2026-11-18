// client/src/components/MenuLateral.tsx
// Menu lateral do desktop (xl para cima), para quem está logado. De xl a 2xl é sempre um
// trilho de ícones, para não tirar largura das páginas; de 2xl para cima abre com os
// rótulos e os submenus e pode ser recolhido. Abaixo de xl a navegação continua na barra
// superior e, no celular, na barra inferior. Os itens vêm de lib/navegacao.ts.
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { LogoMark } from './Brand'
import InsigniaRank from './hud/InsigniaRank'
import BarraVital from './hud/BarraVital'
import { useSessao } from '../contexts/SessaoContext'
import { useResumoGuilda } from '../hooks/useResumoGuilda'
import { useComunidade } from '../hooks/useComunidade'
import { itemAtivo, montarMenu, subitemAtivo, type GrupoDoMenu, type ItemDoMenu } from '../lib/navegacao'
import { preCarregarRota } from '../lib/rotasPreguicosas'

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
    soAbertoGrade: aberto ? 'hidden 2xl:grid' : 'hidden',
    soTrilho: aberto ? '2xl:hidden' : '',
    alinhamento: aberto ? '2xl:justify-start 2xl:px-3.5' : '',
  }
}

// Baixa a página antes do clique: passar o mouse ou chegar pelo teclado já basta.
function aoChegar(para: string) {
  return { onMouseEnter: () => preCarregarRota(para), onFocus: () => preCarregarRota(para), onTouchStart: () => preCarregarRota(para) }
}

interface ItemProps {
  item: ItemDoMenu
  aberto: boolean
  expandido: boolean
  aoExpandir: () => void
}

function Item({ item, aberto, expandido, aoExpandir }: ItemProps) {
  const { pathname, search, hash } = useLocation()
  const { soAberto, soAbertoGrade, alinhamento } = classesDoEstado(aberto)
  const ativo = itemAtivo(item, pathname)
  const temSub = (item.subitens?.length ?? 0) > 0
  const { Icone } = item

  return (
    <div className="flex flex-col">
      <div className="relative">
        <Link
          to={item.para}
          title={item.rotulo}
          aria-current={ativo ? 'page' : undefined}
          {...aoChegar(item.para)}
          className={`relative flex items-center justify-center gap-3 h-9 rounded-xl text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-holo-3 ${alinhamento} ${temSub && aberto ? '2xl:pr-10' : ''} ${
            ativo
              ? 'text-text bg-gradient-to-r from-holo-2/35 to-holo-3/10 shadow-[inset_0_0_0_1px_rgba(123,92,255,0.5),0_0_18px_rgba(123,92,255,0.25)]'
              : 'text-muted hover:text-text hover:bg-panel-2/70'
          }`}
        >
          {ativo && <span aria-hidden className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-full bg-holo-3 shadow-[0_0_8px_var(--color-holo-3)]" />}
          <span className={`flex shrink-0 ${item.cor}`}><Icone size={20} aria-hidden /></span>
          <span className={`truncate ${soAberto}`}>{item.rotulo}</span>
        </Link>
        {temSub && (
          <button
            type="button"
            onClick={aoExpandir}
            aria-expanded={expandido}
            aria-label={`${expandido ? 'Fechar' : 'Abrir'} atalhos de ${item.rotulo}`}
            className={`absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 place-items-center rounded-lg text-muted-2 hover:text-text hover:bg-panel-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-holo-3 ${soAbertoGrade}`}
          >
            <ChevronDown size={15} aria-hidden className={`transition-transform duration-200 ${expandido ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {temSub && (
        // A grade de 0fr para 1fr anima a altura sem medir nada em JavaScript.
        <div className={`${soAbertoGrade} transition-[grid-template-rows] duration-200 ease-out ${expandido ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <ul className="overflow-hidden list-none m-0 p-0 pl-[2.6rem] pr-1" aria-label={`Atalhos de ${item.rotulo}`}>
            {item.subitens!.map((sub) => {
              const subAtivo = subitemAtivo(sub, { pathname, search, hash })
              return (
                <li key={sub.para}>
                  <Link
                    to={sub.para}
                    tabIndex={expandido ? undefined : -1}
                    aria-current={subAtivo ? 'page' : undefined}
                    {...aoChegar(sub.para)}
                    className={`relative flex items-center h-7 pl-3 rounded-lg text-[13px] font-semibold transition-colors border-l border-line focus-visible:outline-2 focus-visible:outline-holo-3 ${
                      subAtivo ? 'text-text border-holo-3 bg-panel-2/60' : 'text-muted hover:text-text hover:bg-panel-2/50'
                    }`}
                  >
                    {sub.rotulo}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function Grupo({ grupo, aberto, expandidos, aoExpandir }: { grupo: GrupoDoMenu; aberto: boolean; expandidos: (item: ItemDoMenu) => boolean; aoExpandir: (item: ItemDoMenu) => void }) {
  const { soAberto, soTrilho } = classesDoEstado(aberto)
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`px-3.5 pt-3 pb-1 font-mono text-xs font-bold tracking-[0.16em] text-muted-2 ${soAberto}`}>{grupo.titulo}</span>
      {/* No trilho, um filete separa os grupos no lugar do título. */}
      <span aria-hidden className={`mx-3 my-2 h-px bg-line ${soTrilho}`} />
      {grupo.itens.map((item) => (
        <Item key={item.rotulo} item={item} aberto={aberto} expandido={expandidos(item)} aoExpandir={() => aoExpandir(item)} />
      ))}
    </div>
  )
}

export default function MenuLateral({ aberto, aoAlternar }: Props) {
  const { isAdmin } = useSessao()
  const status = useResumoGuilda()
  const { estado } = useComunidade()
  const { pathname } = useLocation()
  const { soAberto, soAbertoBloco, soTrilho, alinhamento } = classesDoEstado(aberto)
  // Escolha manual de abrir ou fechar; sem escolha, abre o submenu da página atual.
  const [escolhas, setEscolhas] = useState<Record<string, boolean>>({})

  const perfil = estado?.perfil
  const grupos = montarMenu({ handle: perfil?.existe && perfil.publico ? perfil.handle : '', isAdmin })
  const expandidos = (item: ItemDoMenu) => escolhas[item.rotulo] ?? itemAtivo(item, pathname)
  const aoExpandir = (item: ItemDoMenu) => setEscolhas((e) => ({ ...e, [item.rotulo]: !expandidos(item) }))

  return (
    <aside
      aria-label="Menu principal"
      className="hidden xl:flex fixed left-0 top-0 bottom-0 z-50 w-[var(--menu-lateral)] flex-col px-3 py-4 bg-gradient-to-b from-panel/95 to-void/95 backdrop-blur-md border-r border-line"
    >
      <div className="shrink-0 relative mb-1">
        <Link to="/" className={`flex items-center justify-center gap-2.5 h-10 rounded-xl focus-visible:outline-2 focus-visible:outline-holo-3 ${alinhamento}`} aria-label="AniDeck, início">
          <LogoMark />
          <span className={`font-anton text-xl tracking-wide ${soAberto}`}>
            Ani<span className="text-holo">Deck</span>
          </span>
        </Link>
        {/* Aberto, o botão de recolher fica ao lado da marca: no rodapé ele tomava a altura
            que faltava para a lista caber sem rolar. */}
        {aberto && (
          <button
            type="button"
            onClick={aoAlternar}
            aria-expanded
            title="Recolher menu"
            aria-label="Recolher menu"
            className="hidden 2xl:grid absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 place-items-center rounded-lg text-muted-2 hover:text-text hover:bg-panel-2/70 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-holo-3"
          >
            <PanelLeftClose size={17} aria-hidden />
          </button>
        )}
      </div>

      {/* Só a lista rola, com barra fina do tema: logo e cartão do jogador ficam fixos.
          O -mx-3 px-3 mantém dentro da área de rolagem o filete do item ativo. */}
      <nav className="flex-1 min-h-0 flex flex-col -mx-3 px-3 pb-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {grupos.map((g) => <Grupo key={g.titulo} grupo={g} aberto={aberto} expandidos={expandidos} aoExpandir={aoExpandir} />)}
        {/* Em tela baixa, a lista some num degradê em vez de ser cortada seco pelo cartão.
            Grudado no fim da área de rolagem, ele só cobre itens enquanto há mais abaixo. */}
        <span aria-hidden className="sticky bottom-0 shrink-0 h-6 -mt-3 bg-gradient-to-t from-void to-transparent pointer-events-none" />
      </nav>

      {status && (
        <>
          <Link
            to="/guilda"
            className={`shrink-0 mt-2 flex-col gap-2 p-3 rounded-2xl border border-holo-3/30 bg-gradient-to-br from-holo-3/10 to-panel/90 hover:border-holo-3/60 transition-colors focus-visible:outline-2 focus-visible:outline-holo-3 ${soAbertoBloco}`}
          >
            <span className="flex items-center gap-2.5">
              <InsigniaRank rank={status.rank} tamanho={32} />
              <span className="flex flex-col min-w-0">
                <b className="text-sm text-text truncate leading-tight">{status.titulo_rank}</b>
                <span className="text-xs font-bold text-holo-3">Nível {status.nivel} · Rank {status.rank}</span>
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="flex-1 min-w-0"><BarraVital tipo="xp" pct={status.progresso_pct} /></span>
              <span className="font-mono text-xs text-muted tabular-nums shrink-0">
                <b className="text-gold">{status.xp_no_nivel}</b>/{status.xp_para_proximo} XP
              </span>
            </span>
          </Link>
          <Link
            to="/guilda"
            title={`Rank ${status.rank} · Nível ${status.nivel}`}
            className={`shrink-0 mt-2 flex justify-center py-1 rounded-xl focus-visible:outline-2 focus-visible:outline-holo-3 ${soTrilho}`}
          >
            <InsigniaRank rank={status.rank} tamanho={40} />
          </Link>
        </>
      )}

      {!aberto && (
        <button
          type="button"
          onClick={aoAlternar}
          aria-expanded={false}
          title="Abrir menu"
          className="hidden 2xl:flex shrink-0 items-center justify-center h-10 mt-2 rounded-xl text-muted-2 hover:text-text hover:bg-panel-2/70 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-holo-3"
        >
          <PanelLeftOpen size={18} aria-hidden />
          <span className="sr-only">Abrir menu</span>
        </button>
      )}
    </aside>
  )
}
