// client/src/pages/Loja.tsx
// Loja de Cosméticos do AniDeck: compra e personalização com AniCoins (Fase 16, #170 e #171).
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
  renderizarEmblema,
  type ItemCosmeticoLoja,
} from '../lib/cosmeticos'

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
  const [modalApoiadorAberto, setModalApoiadorAberto] = useState(false)
  const [itemDevolvendo, setItemDevolvendo] = useState<ItemCosmeticoLoja | null>(null)

  const meuNome = estado?.perfil.nome || estado?.perfil.handle || session?.user.user_metadata?.display_name || 'Viajante'
  const meuAvatar = (session?.user.user_metadata?.avatar_url as string | undefined) || null

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
    <div className="w-full min-w-0 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-24">
      {/* CABEÇALHO DA LOJA */}
      <header className="mb-8 rounded-3xl border border-line bg-gradient-to-br from-panel via-panel to-panel-2 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-holo-3/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-64 h-64 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-holo-3/15 border border-holo-3/30 text-holo-3 font-mono text-[10.5px] font-bold uppercase tracking-widest mb-3">
              <Sparkles size={12} /> Bazar Comunitário
            </div>
            <h1 className="font-anton text-3xl sm:text-4xl lg:text-5xl uppercase tracking-wide m-0 text-text leading-tight">
              Loja Cosmética
            </h1>
            <p className="text-sm text-muted mt-2 mb-0 leading-relaxed">
              Destaque seu perfil, personalize molduras e ostente títulos exclusivos na comunidade com suas AniCoins.
              <span className="block text-muted-2 text-xs mt-1">
                Cosméticos são puramente visuais e nunca alteram XP, Rank nem notas do ranking.
              </span>
            </p>
          </div>

          {/* CARD DE SALDO & MISSÕES */}
          <div className="shrink-0 p-4 sm:p-5 rounded-2xl bg-panel-2/90 border border-line flex flex-col gap-3 min-w-[240px]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-2 uppercase tracking-widest flex items-center gap-1.5">
                <IconeAniCoin size={14} /> Sua Carteira
              </span>
              <Link
                to="/#missoes-diarias-card"
                className="font-mono text-[10.5px] text-holo-2 hover:underline flex items-center gap-1 font-bold"
              >
                + AniCoins <ArrowRight size={11} />
              </Link>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-anton text-3xl sm:text-4xl text-holo-3 tracking-wide">
                {saldo.toLocaleString('pt-BR')}
              </span>
              <span className="font-mono text-sm font-bold text-muted">₳ AniCoins</span>
            </div>
            <p className="text-[11px] text-muted-2 m-0 border-t border-line/60 pt-2">
              Ganhe mais moedas completando as 3 missões do dia na Início.
            </p>
          </div>
        </div>
      </header>

      {/* FILTROS DE CATEGORIA */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none select-none">
        {[
          { id: 'todos', rotulo: 'Todos os Itens' },
          { id: 'temporada', rotulo: '⚡ Temporada 1' },
          { id: 'moldura', rotulo: 'Molduras' },
          { id: 'tema_perfil', rotulo: 'Temas' },
          { id: 'cor_nome', rotulo: 'Cores de Nome' },
          { id: 'emblema', rotulo: 'Emblemas' },
          { id: 'expansao', rotulo: 'Melhorias' },
        ].map((f) => {
          const ativo = filtroTipo === f.id
          const qtd = contadores[f.id] || 0
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltroTipo(f.id)}
              className={`px-4 py-2 rounded-full font-mono text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                ativo
                  ? 'bg-holo-1 text-void shadow-md scale-102'
                  : 'bg-panel border border-line text-muted hover:text-text hover:border-holo-2'
              }`}
            >
              <span>{f.rotulo}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${ativo ? 'bg-void/25 text-void' : 'bg-panel-2 text-muted-2'}`}>
                {qtd}
              </span>
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => setModalApoiadorAberto(true)}
          className="ml-auto shrink-0 px-4 py-2 rounded-full font-mono text-xs font-bold bg-holo-1/15 text-holo-1 border border-holo-1/30 hover:bg-holo-1/25 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Heart size={14} className="fill-holo-1/30" />
          <span>Seja um Apoiador</span>
        </button>
      </div>

      {/* CATÁLOGO DE ITENS */}
      {carregando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-panel border border-line shimmer" />
          ))}
        </div>
      ) : itensFiltrados.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-panel border border-line">
          <p className="text-muted text-sm font-mono m-0">Nenhum cosmético encontrado nesta categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {itensFiltrados.map((item: ItemCosmeticoLoja) => {
            const corRaridade = CORES_RARIDADE[item.raridade] || CORES_RARIDADE.comum
            const podeComprar = saldo >= item.preco
            const faltaAniCoins = Math.max(0, item.preco - saldo)
            const emProcesso = comprandoId === item.id || equipandoId === item.id

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl bg-panel border transition-all flex flex-col justify-between gap-4 hover:shadow-xl ${corRaridade.border} ${
                  item.equipado ? 'ring-2 ring-holo-3/60 bg-panel-2/40' : ''
                }`}
              >
                <div>
                  {/* Topo do Card: Tipo & Raridade */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] text-muted-2 uppercase tracking-widest">
                        // {item.tipo.replace('_', ' ')}
                      </span>
                      {item.temporada && (
                        <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase bg-gradient-to-r from-red-600 to-amber-600 text-void flex items-center gap-1 shadow-sm">
                          <Zap size={10} fill="currentColor" /> S{item.temporada}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase border ${corRaridade.badge}`}>
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
                        <span className="text-[10px] text-muted-2">Prévia nos comentários</span>
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
                    <span className="font-mono text-[10px] text-muted-2 block">Preço</span>
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
                        {item.equipado ? (
                          <button
                            type="button"
                            disabled={emProcesso}
                            onClick={() => equipar(item.tipo, null)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-green/20 border border-green/40 text-green font-mono text-xs font-bold hover:bg-coral/20 hover:text-coral hover:border-coral/40 transition-colors cursor-pointer"
                            title="Clique para desequipar"
                          >
                            <Check size={14} /> Equipado
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={emProcesso}
                            onClick={() => equipar(item.tipo, item.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-holo-1 text-void font-extrabold text-xs uppercase tracking-wider hover:opacity-95 transition-opacity cursor-pointer shadow-md"
                          >
                            Equipar
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
