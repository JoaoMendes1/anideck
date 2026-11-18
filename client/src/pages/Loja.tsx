// client/src/pages/Loja.tsx
// Loja de Cosméticos do AniDeck: compra e personalização com AniCoins (Fase 16, #170 e #171).
import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Mercado from '../components/loja/Mercado'
import Forja from '../components/loja/Forja'
import {
  Sparkles, Crown, Flame, Zap, Award, Check, Shield, ArrowRight, User, Heart, RotateCcw,
} from 'lucide-react'
import IconeAniCoin from '../components/IconeAniCoin'
import ModalApoiador from '../components/comunidade/ModalApoiador'
import { useSessao } from '../contexts/SessaoContext'
import { useLoja } from '../hooks/useLoja'
import { useCarteira } from '../hooks/useCarteira'
import { useComunidade } from '../hooks/useComunidade'
import {
  CORES_RARIDADE,
  obterClasseMoldura,
  obterClasseCorNome,
  obterClasseTemaPerfil,
  obterFundoDoCenario,
  renderizarEmblema,
  type ItemCosmeticoLoja,
} from '../lib/cosmeticos'
import { usePersonagem } from '../hooks/usePersonagem'
import CamadaDaAura from '../components/personagem/CamadaDaAura'
import {
  EVENTO_PERSONAGEM_ATUALIZADO,
  ORDEM_DOS_ESTAGIOS,
  PERSONAGEM_BASE_PADRAO,
  aceitaSkins,
  arteDoEstagio,
  equiparVisual,
  visualEmUso,
} from '../lib/personagem'
import { useToast } from '../contexts/ToastContext'

function renderIconeItem(icone: string, raridade: string) {
  const cor = CORES_RARIDADE[raridade]?.texto || 'text-holo-3'
  switch (icone) {
    case 'Crown':
      return <Crown size={20} className={cor} />
    case 'Flame':
      return <Flame size={20} className={cor} />
    case 'Zap':
      return <Zap size={20} className={cor} />
    case 'Award':
      return <Award size={20} className={cor} />
    case 'Sparkles':
    default:
      return <Sparkles size={20} className={cor} />
  }
}

export default function Loja() {
  const { session } = useSessao()
  const { itens, carregando, comprandoId, devolvendoId, equipandoId, comprar, devolver, equipar } = useLoja()
  const { saldo } = useCarteira()
  const { estado } = useComunidade()

  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  // Mercado (Ouro) abre primeiro: é onde o jogador evolui; o Visual fica a um toque.
  const [params, setParams] = useSearchParams()
  const secaoPedida = params.get('secao')
  const secao: 'mercado' | 'forja' | 'visual' = secaoPedida === 'visual' || secaoPedida === 'forja' ? secaoPedida : 'mercado'
  const irPara = (nova: 'mercado' | 'forja' | 'visual') => {
    const proximos = new URLSearchParams(params)
    proximos.set('secao', nova)
    setParams(proximos, { replace: true })
  }
  const [modalApoiadorAberto, setModalApoiadorAberto] = useState(false)
  const [itemDevolvendo, setItemDevolvendo] = useState<ItemCosmeticoLoja | null>(null)

  const meuNome = estado?.perfil.nome || estado?.perfil.handle || session?.user.user_metadata?.display_name || 'Viajante'
  const meuAvatar = (session?.user.user_metadata?.avatar_url as string | undefined) || null
  // A prévia do cenário mostra o personagem do jogador com o visual em uso; sem personagem,
  // o do primeiro estágio.
  const { dados: personagem } = usePersonagem()
  const { showToast } = useToast()
  const [vestindoId, setVestindoId] = useState<string | null>(null)
  const baseDoPersonagem = personagem?.personagem?.personagem_base ?? PERSONAGEM_BASE_PADRAO

  // Skin não ocupa slot: veste-se pela escolha de visual do personagem, que confere a posse.
  const skinVestida = personagem?.visual && !personagem.visual.automatico ? personagem.visual.id : null
  const estaEquipado = (item: ItemCosmeticoLoja) => (item.tipo === 'skin' ? item.id === skinVestida : item.equipado)
  const trocarEquipado = async (item: ItemCosmeticoLoja, itemID: string | null) => {
    if (item.tipo !== 'skin') {
      equipar(item.tipo, itemID)
      return
    }
    // Os trajes foram desenhados sobre o Espadachim de Éter: outro personagem não os veste.
    if (itemID && !aceitaSkins(baseDoPersonagem)) {
      showToast('Os trajes são do Espadachim de Éter. Troque para ele na tela do personagem para vestir.', 'info')
      return
    }
    setVestindoId(item.id)
    const r = await equiparVisual(itemID ?? '')
    setVestindoId(null)
    if (r.dados) {
      window.dispatchEvent(new Event(EVENTO_PERSONAGEM_ATUALIZADO))
      showToast(itemID ? `${item.nome} vestido no seu personagem.` : 'O personagem voltou ao visual do estágio.', 'success')
      return
    }
    showToast(r.erro ?? 'Não foi possível vestir a skin agora.', 'error')
  }
  const miniDoPersonagem = arteDoEstagio(
    personagem?.personagem?.personagem_base ?? PERSONAGEM_BASE_PADRAO,
    visualEmUso(personagem) ?? ORDEM_DOS_ESTAGIOS[0],
  )?.mini

  const itensFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return itens
    if (filtroTipo === 'temporada') return itens.filter((i) => Boolean(i.temporada))
    return itens.filter((i) => i.tipo === filtroTipo)
  }, [itens, filtroTipo])

  const contadores = useMemo(() => {
    const counts: Record<string, number> = { todos: itens.length, temporada: 0 }
    itens.forEach((i) => {
      counts[i.tipo] = (counts[i.tipo] || 0) + 1
      if (i.temporada) counts.temporada = (counts.temporada || 0) + 1
    })
    return counts
  }, [itens])

  return (
    <div className="w-full min-w-0 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-3 sm:pt-6 pb-24">
      {/* CABEÇALHO COMPACTO DA LOJA */}
      <header className="mb-5 rounded-2xl border border-line bg-panel px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4">
          {/* Esquerda: Título (e no celular, saldo + ícone de Apoiador na mesma linha) */}
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-anton text-2xl sm:text-3xl uppercase tracking-wide m-0 text-text leading-none">
                Loja
              </h1>

              {/* Ações compactas no celular (título e saldo na mesma linha, Apoiador como ícone) */}
              <div className="flex md:hidden items-center gap-2 shrink-0">
                {secao === 'visual' && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-panel-2 border border-line font-mono text-xs font-bold text-text">
                    <IconeAniCoin size={14} />
                    <span className="text-holo-3">{saldo.toLocaleString('pt-BR')}</span>
                    <span className="text-muted">₳</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setModalApoiadorAberto(true)}
                  aria-label="Seja um Apoiador"
                  title="Seja um Apoiador"
                  className="p-2 rounded-xl bg-holo-1/15 text-holo-1 border border-holo-1/30 hover:bg-holo-1/25 transition-colors cursor-pointer"
                >
                  <Heart size={14} className="fill-holo-1/30" />
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-2 mt-1 mb-0 leading-snug">
              {secao === 'forja'
                ? 'Na Forja do Brokk, Ouro e materiais viram equipamentos Épicos e Lendários, sem depender de sorte.'
                : secao === 'mercado'
                ? 'Equipamentos deixam seu personagem mais forte e só se compram com Ouro, que você ganha em expedições, masmorras e duelos.'
                : 'Cosméticos se compram com AniCoins, que vêm de assistir episódios e das missões. São só visuais: nunca mudam XP, Rank, notas nem força.'}
            </p>
          </div>

          {/* Direita no desktop: chip de saldo + link Ganhar AniCoins + botão Seja um Apoiador */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {secao === 'visual' && (
              <>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-panel-2 border border-line">
                <IconeAniCoin size={15} />
                <span className="font-anton text-lg text-holo-3 tracking-wide leading-none">
                  {saldo.toLocaleString('pt-BR')}
                </span>
                <span className="font-mono text-xs font-bold text-muted">₳ AniCoins</span>
              </div>
  
              <Link
                to="/#missoes-diarias-card"
                className="px-3 py-1.5 rounded-xl bg-panel-2 border border-line font-mono text-xs font-bold text-holo-2 hover:border-holo-2/50 hover:underline inline-flex items-center gap-1 transition-colors"
              >
                <span>Ganhar AniCoins</span>
                <ArrowRight size={12} />
              </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => setModalApoiadorAberto(true)}
              className="px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold bg-holo-1/15 text-holo-1 border border-holo-1/30 hover:bg-holo-1/25 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Heart size={13} className="fill-holo-1/30" />
              <span>Seja um Apoiador</span>
            </button>
          </div>

          {/* Link complementar de Ganhar AniCoins no celular */}
          {secao === 'visual' && (
            <div className="flex md:hidden items-center justify-end">
              <Link
                to="/#missoes-diarias-card"
                className="font-mono text-xs font-bold text-holo-2 hover:underline inline-flex items-center gap-1"
              >
                <span>Ganhar AniCoins</span>
                <ArrowRight size={11} />
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* SEÇÕES: Mercado (Ouro), Forja (Ouro e materiais) e Visual (AniCoins) */}
      <div role="tablist" aria-label="Seções da Loja" className="mb-4 grid grid-cols-3 gap-1 rounded-2xl border border-line bg-panel p-1">
        {([
          { id: 'mercado', rotulo: 'Mercado', detalhe: 'Equipamentos · Ouro' },
          { id: 'forja', rotulo: 'Forja', detalhe: 'Ouro e materiais' },
          { id: 'visual', rotulo: 'Visual', detalhe: 'Cosméticos · AniCoins' },
        ] as const).map((s) => {
          const ativa = secao === s.id
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => irPara(s.id)}
              className={`flex cursor-pointer flex-col items-center rounded-xl px-2 py-2 transition-colors ${
                ativa ? (s.id === 'visual' ? 'bg-holo-1 text-void' : 'bg-gold text-void') : 'text-muted hover:text-text'
              }`}
            >
              <span className="text-sm font-extrabold leading-tight">{s.rotulo}</span>
              <span className={`font-mono text-[11px] leading-tight ${ativa ? 'opacity-80' : 'text-muted-2'}`}>{s.detalhe}</span>
            </button>
          )
        })}
      </div>

      {secao === 'mercado' && <Mercado />}
      {secao === 'forja' && <Forja />}

      {secao === 'visual' && (<>
      {/* FILTROS DE CATEGORIA */}
      <div className="relative mb-6">
        <div className="flex items-center gap-2 overflow-x-auto md:overflow-visible md:flex-wrap pb-2 md:pb-0 pr-8 md:pr-0 snap-x snap-mandatory scrollbar-none select-none">
          {[
            { id: 'todos', rotulo: 'Todos os Itens' },
            { id: 'temporada', rotulo: '⚡ Temporada 1' },
            { id: 'moldura', rotulo: 'Molduras' },
            { id: 'tema_perfil', rotulo: 'Temas' },
            { id: 'cor_nome', rotulo: 'Cores de Nome' },
            { id: 'emblema', rotulo: 'Emblemas' },
            { id: 'cenario', rotulo: 'Cenários' },
            { id: 'aura', rotulo: 'Auras' },
            { id: 'skin', rotulo: 'Skins' },
            { id: 'expansao', rotulo: 'Melhorias' },
          ]
            .filter((f) => f.id === 'todos' || (contadores[f.id] || 0) > 0)
            .map((f) => {
              const ativo = filtroTipo === f.id
              const qtd = contadores[f.id] || 0
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroTipo(f.id)}
                  className={`snap-start shrink-0 px-3.5 py-1.5 rounded-full font-mono text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                    ativo
                      ? 'bg-holo-1 text-void shadow-sm'
                      : 'bg-panel border border-line text-muted hover:text-text hover:border-holo-2'
                  }`}
                >
                  <span>{f.rotulo}</span>
                  <span className={`text-xs px-1.5 py-px rounded-full ${ativo ? 'bg-void/25 text-void' : 'bg-panel-2 text-muted-2'}`}>
                    {qtd}
                  </span>
                </button>
              )
            })}
        </div>
        {/* Degradê lateral no celular indicando que há mais categorias para rolar */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-void to-transparent md:hidden"
        />
      </div>

      {/* CATÁLOGO DE ITENS */}
      {carregando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-panel border border-line shimmer" />
          ))}
        </div>
      ) : itensFiltrados.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-panel border border-line">
          <p className="text-muted text-sm font-mono m-0">Nenhum cosmético encontrado nesta categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {itensFiltrados.map((item: ItemCosmeticoLoja) => {
            const corRaridade = CORES_RARIDADE[item.raridade] || CORES_RARIDADE.comum
            const podeComprar = saldo >= item.preco
            const faltaAniCoins = Math.max(0, item.preco - saldo)
            const emProcesso = comprandoId === item.id || equipandoId === item.id || vestindoId === item.id

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl bg-panel border transition-all flex flex-col justify-between gap-3 sm:gap-4 hover:shadow-xl ${corRaridade.border} ${
                  estaEquipado(item) ? 'ring-2 ring-holo-3/60 bg-panel-2/40' : ''
                }`}
              >
                <div>
                  {/* Topo do Card: Tipo & Raridade */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs text-muted-2 uppercase tracking-widest">
                        // {item.tipo.replace('_', ' ')}
                      </span>
                      {item.temporada && (
                        <span className="px-2 py-0.5 rounded-full font-mono text-xs font-bold uppercase bg-gradient-to-r from-red-600 to-amber-600 text-void flex items-center gap-1 shadow-sm">
                          <Zap size={10} fill="currentColor" /> S{item.temporada}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-mono text-xs font-bold uppercase border ${corRaridade.badge}`}>
                      {item.raridade}
                    </span>
                  </div>

                  {/* Nome e Ícone */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-panel-2 border border-line grid place-items-center shrink-0">
                      {renderIconeItem(item.icone, item.raridade)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-anton text-lg uppercase tracking-wide m-0 text-text truncate">
                        {item.nome}
                      </h3>
                      <p className="text-xs text-muted mt-1 m-0 leading-relaxed line-clamp-2">
                        {item.descricao}
                      </p>
                    </div>
                  </div>

                  {/* PRÉVIA VISUAL AO VIVO DO ITEM */}
                  <div className="my-3.5 p-3 rounded-xl bg-panel-2/70 border border-line/60 flex items-center justify-center min-h-[72px]">
                    {item.tipo === 'moldura' && (
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full overflow-hidden transition-all ${obterClasseMoldura(item.estilo)}`}>
                          {meuAvatar ? (
                            <img src={meuAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-panel flex items-center justify-center text-muted">
                              <User size={20} />
                            </div>
                          )}
                        </div>
                        <span className="font-mono text-xs text-muted-2">Prévia no avatar</span>
                      </div>
                    )}

                    {item.tipo === 'cor_nome' && (
                      <div className="text-center font-mono">
                        <span className={`text-base block ${obterClasseCorNome(item.estilo)}`}>
                          @{estado?.perfil.handle || 'usuario'}
                        </span>
                        <span className="text-xs text-muted-2">Prévia nos comentários</span>
                      </div>
                    )}

                    {item.tipo === 'tema_perfil' && (
                      <div className={`w-full py-2.5 px-3 rounded-lg border text-center ${obterClasseTemaPerfil(item.estilo)}`}>
                        <span className="font-anton text-xs uppercase tracking-wider text-text">
                          Atmosfera do Perfil
                        </span>
                      </div>
                    )}

                    {item.tipo === 'emblema' && (
                      <div className="flex items-center gap-1.5 font-mono text-sm text-text font-bold">
                        <span>{meuNome}</span>
                        {renderizarEmblema(item.estilo, 18)}
                      </div>
                    )}

                    {item.tipo === 'cenario' && (
                      <div
                        className="relative h-28 w-full overflow-hidden rounded-lg border border-line/60 bg-void"
                        style={{ backgroundImage: obterFundoDoCenario(item.estilo) }}
                      >
                        {miniDoPersonagem && (
                          <img
                            src={miniDoPersonagem}
                            width={256}
                            height={384}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute bottom-0 left-1/2 h-[118%] w-auto max-w-none -translate-x-1/2"
                          />
                        )}
                        <span className="absolute left-2 top-2 rounded-full bg-void/70 px-2 py-0.5 font-mono text-xs text-muted">
                          Fundo do personagem
                        </span>
                      </div>
                    )}

                    {item.tipo === 'skin' && (
                      <div className="relative h-36 w-full overflow-hidden rounded-lg border border-line/60 bg-void">
                        {(() => {
                          const arteDaSkin = arteDoEstagio(PERSONAGEM_BASE_PADRAO, item.id)
                          return arteDaSkin ? (
                            <img
                              src={arteDaSkin.mini}
                              width={256}
                              height={384}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              style={arteDaSkin.filtro ? { filter: arteDaSkin.filtro } : undefined}
                              className="absolute -top-1 left-1/2 h-[150%] w-auto max-w-none -translate-x-1/2"
                            />
                          ) : null
                        })()}
                        <span className="absolute left-2 top-2 rounded-full bg-void/70 px-2 py-0.5 font-mono text-xs text-muted">
                          Traje do Espadachim de Éter
                        </span>
                      </div>
                    )}

                    {item.tipo === 'aura' && (
                      <div className="relative h-28 w-full overflow-hidden rounded-lg border border-line/60 bg-void">
                        <CamadaDaAura estilo={item.estilo} />
                        {miniDoPersonagem && (
                          <img
                            src={miniDoPersonagem}
                            width={256}
                            height={384}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute bottom-0 left-1/2 h-[118%] w-auto max-w-none -translate-x-1/2"
                          />
                        )}
                        <span className="absolute left-2 top-2 rounded-full bg-void/70 px-2 py-0.5 font-mono text-xs text-muted">
                          Aura do personagem
                        </span>
                      </div>
                    )}

                    {item.tipo === 'expansao' && (
                      <div className="flex items-center gap-2 font-mono text-xs text-holo-3 font-bold">
                        <Shield size={16} />
                        <span>7 Obras na Vitrine (Máximo)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* RODAPÉ DO CARD: PREÇO E AÇÃO */}
                <div className="pt-3 border-t border-line/60 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs text-muted-2 block">Preço</span>
                    <span className="font-anton text-xl text-holo-3 flex items-center gap-1">
                      <IconeAniCoin size={16} animar />
                      {item.preco.toLocaleString('pt-BR')} ₳
                    </span>
                  </div>

                  {item.ja_possui ? (
                    item.tipo === 'expansao' ? (
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-green/15 text-green border border-green/30 font-mono text-xs font-bold select-none">
                        <Check size={14} /> Ativo no perfil
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {item.preco > 0 && (
                          <button
                            type="button"
                            disabled={emProcesso || devolvendoId === item.id}
                            onClick={() => setItemDevolvendo(item)}
                            className="p-2 rounded-full border border-line text-muted hover:text-coral hover:border-coral/50 transition-colors cursor-pointer"
                            title="Devolver item para o cofre da loja com reembolso parcial"
                            aria-label="Devolver item"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                        {estaEquipado(item) ? (
                          <button
                            type="button"
                            disabled={emProcesso}
                            onClick={() => trocarEquipado(item, null)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-green/20 border border-green/40 text-green font-mono text-xs font-bold hover:bg-coral/20 hover:text-coral hover:border-coral/40 transition-colors cursor-pointer"
                            title="Clique para desequipar"
                          >
                            <Check size={14} /> Equipado
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={emProcesso}
                            onClick={() => trocarEquipado(item, item.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-holo-1 text-void font-extrabold text-xs uppercase tracking-wider hover:opacity-95 transition-opacity cursor-pointer shadow-md"
                          >
                            {item.tipo === 'skin' ? 'Vestir' : 'Equipar'}
                          </button>
                        )}
                      </div>
                    )
                  ) : item.preco === 0 ? (
                    <button
                      type="button"
                      disabled={emProcesso}
                      onClick={() => comprar(item.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-extrabold text-xs uppercase tracking-wider bg-gradient-to-r from-holo-1 to-holo-2 text-void hover:opacity-95 shadow-[0_0_14px_rgba(255,92,108,0.35)] transition-all cursor-pointer active:scale-95"
                      title="Resgatar item de Apoiador"
                    >
                      <Heart size={13} className="fill-void" />
                      {emProcesso ? 'Resgatando...' : 'Resgatar (Apoiador)'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={emProcesso || !podeComprar}
                      onClick={() => comprar(item.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        podeComprar
                          ? 'bg-gradient-to-r from-gold via-amber-500 to-yellow-400 text-void hover:opacity-95 shadow-[0_0_12px_rgba(245,158,11,0.35)] active:scale-95'
                          : 'bg-panel-2 border border-line text-muted-2 cursor-not-allowed'
                      }`}
                      title={!podeComprar ? `Faltam ${faltaAniCoins} ₳ para comprar` : 'Adquirir cosmético'}
                    >
                      <Sparkles size={13} fill="currentColor" />
                      {emProcesso ? 'Comprando...' : podeComprar ? 'Comprar' : `Faltam ${faltaAniCoins} ₳`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      </>)}

      {/* MODAL DE DEVOLUÇÃO COM REEMBOLSO */}
      {itemDevolvendo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-panel border border-line shadow-2xl p-6 text-text relative">
            <div className="w-10 h-10 rounded-xl bg-coral/15 text-coral grid place-items-center mb-3 border border-coral/30">
              <RotateCcw size={18} />
            </div>
            <h3 className="font-anton text-xl uppercase tracking-wide m-0 mb-1">
              Devolver Cosmético?
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              Você devolverá <strong className="text-text">{itemDevolvendo.nome}</strong>. O item será desequipado e removido do seu inventário.
            </p>
            <div className="p-3 rounded-xl bg-panel-2 border border-line flex items-center justify-between font-mono text-xs mb-5">
              <span className="text-muted-2">Reembolso estimado:</span>
              <span className="text-green font-bold flex items-center gap-1">
                +{Math.floor(itemDevolvendo.preco * 0.7)} ₳ (70%)
              </span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemDevolvendo(null)}
                className="px-4 py-2 rounded-xl border border-line text-xs font-bold text-muted hover:text-text cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={devolvendoId === itemDevolvendo.id}
                onClick={async () => {
                  const ok = await devolver(itemDevolvendo.id)
                  if (ok) setItemDevolvendo(null)
                }}
                className="px-4 py-2 rounded-xl bg-coral text-void text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-md"
              >
                {devolvendoId === itemDevolvendo.id ? 'Devolvendo...' : 'Confirmar Devolução'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalApoiador aberto={modalApoiadorAberto} onFechar={() => setModalApoiadorAberto(false)} />
    </div>
  )
}
