// client/src/components/RecompensaHudLista.tsx
// Fila animada de notificações de recompensa (+XP, +Ouro, +AniCoins, HP/MP).
// Carregada sob demanda pelo ToastContext para manter o bundle inicial enxuto.
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Coins, Droplet, Heart, Sparkles, X, Zap } from 'lucide-react'

export interface ItemRecompensaToast {
  id: number
  titulo: string
  subtitulo?: string
  badge?: string
  xp?: number
  ouro?: number
  anicoins?: number
  hp?: number
  mp?: number
  progressoAntesPct?: number
  progressoDepoisPct?: number
  xpLabel?: string
  tom?: 'xp' | 'ouro' | 'holo' | 'alerta'
}

const BORDA_TOM: Record<NonNullable<ItemRecompensaToast['tom']>, string> = {
  xp: 'border-gold/45 shadow-[0_18px_42px_-12px_rgba(255,197,66,0.28)]',
  ouro: 'border-gold/45 shadow-[0_18px_42px_-12px_rgba(255,197,66,0.25)]',
  holo: 'border-holo-3/45 shadow-[0_18px_42px_-12px_rgba(63,224,240,0.28)]',
  alerta: 'border-coral/45 shadow-[0_18px_42px_-12px_rgba(255,92,108,0.28)]',
}

const ICONE_CAIXA_TOM: Record<NonNullable<ItemRecompensaToast['tom']>, string> = {
  xp: 'bg-gold/15 border-gold/40 text-gold',
  ouro: 'bg-gold/15 border-gold/40 text-gold',
  holo: 'bg-holo-3/15 border-holo-3/40 text-holo-3',
  alerta: 'bg-coral/15 border-coral/40 text-coral',
}

function IconePrincipal({ tom }: { tom: NonNullable<ItemRecompensaToast['tom']> }) {
  if (tom === 'ouro') return <Coins size={18} aria-hidden="true" />
  if (tom === 'holo') return <Sparkles size={18} aria-hidden="true" />
  if (tom === 'alerta') return <Heart size={18} aria-hidden="true" />
  return <Zap size={18} aria-hidden="true" />
}

export default function RecompensaHudLista({
  itens,
  aoFechar,
}: {
  itens: ItemRecompensaToast[]
  aoFechar: (id: number) => void
}) {
  const movimentoReduzido = useReducedMotion()

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-20 left-3 right-3 z-[105] flex flex-col gap-2.5 md:bottom-6 md:left-auto md:right-6 md:w-[356px]"
    >
      <AnimatePresence initial={false}>
        {itens.map((item) => {
          const tom = item.tom ?? 'xp'
          const mostraBarraXp =
            typeof item.progressoAntesPct === 'number' &&
            typeof item.progressoDepoisPct === 'number'

          return (
            <motion.div
              key={item.id}
              layout={!movimentoReduzido}
              initial={
                movimentoReduzido
                  ? { opacity: 1 }
                  : { opacity: 0, y: 18, scale: 0.94 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                movimentoReduzido
                  ? { opacity: 0 }
                  : { opacity: 0, y: -10, scale: 0.95 }
              }
              transition={
                movimentoReduzido
                  ? { duration: 0.1 }
                  : { type: 'spring', stiffness: 420, damping: 28 }
              }
              className={`pointer-events-auto relative overflow-hidden rounded-2xl border bg-panel/95 p-3.5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${BORDA_TOM[tom]}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${ICONE_CAIXA_TOM[tom]}`}
                >
                  <IconePrincipal tom={tom} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="m-0 truncate text-xs sm:text-[13px] font-extrabold text-text">
                      {item.titulo}
                    </p>
                    {item.badge && (
                      <span className="shrink-0 rounded-full border border-gold/35 bg-gold/12 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-gold">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {item.subtitulo && (
                    <p className="m-0 mt-0.5 truncate text-xs text-muted">
                      {item.subtitulo}
                    </p>
                  )}

                  {(item.xp || item.ouro || item.anicoins || item.hp || item.mp) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-xs font-bold tabular-nums">
                      {item.xp ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-gold/35 bg-gold/12 px-2 py-0.5 text-gold">
                          <Zap size={11} aria-hidden="true" />
                          {item.xp > 0 ? `+${item.xp}` : item.xp} XP
                        </span>
                      ) : null}
                      {item.ouro ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-gold/35 bg-gold/12 px-2 py-0.5 text-gold">
                          <Coins size={11} aria-hidden="true" />
                          {item.ouro > 0 ? `+${item.ouro}` : item.ouro} Ouro
                        </span>
                      ) : null}
                      {item.anicoins ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-holo-3/35 bg-holo-3/12 px-2 py-0.5 text-holo-3">
                          <Sparkles size={11} aria-hidden="true" />
                          {item.anicoins > 0 ? `+${item.anicoins}` : item.anicoins} ₳
                        </span>
                      ) : null}
                      {item.hp ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-coral/35 bg-coral/12 px-2 py-0.5 text-coral">
                          <Heart size={11} aria-hidden="true" />
                          {item.hp > 0 ? `+${item.hp}` : item.hp} HP
                        </span>
                      ) : null}
                      {item.mp ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-mana/35 bg-mana/12 px-2 py-0.5 text-mana">
                          <Droplet size={11} aria-hidden="true" />
                          {item.mp > 0 ? `+${item.mp}` : item.mp} MP
                        </span>
                      ) : null}
                    </div>
                  )}

                  {mostraBarraXp && (
                    <div className="mt-2.5 space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-2 border border-white/5">
                        <motion.div
                          initial={{ width: `${Math.max(0, Math.min(100, item.progressoAntesPct ?? 0))}%` }}
                          animate={{ width: `${Math.max(0, Math.min(100, item.progressoDepoisPct ?? 0))}%` }}
                          transition={movimentoReduzido ? { duration: 0 } : { duration: 0.7, ease: 'easeOut', delay: 0.1 }}
                          className="h-full rounded-full bg-gradient-to-r from-gold via-holo-1 to-holo-3"
                        />
                      </div>
                      {item.xpLabel && (
                        <div className="flex items-center justify-between font-mono text-xs tabular-nums text-muted-2">
                          <span>Guilda XP</span>
                          <span className="font-semibold text-gold">{item.xpLabel}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => aoFechar(item.id)}
                  aria-label="Fechar notificação de recompensa"
                  className="shrink-0 rounded-lg p-1 text-muted-2 transition-colors hover:bg-panel-2 hover:text-text cursor-pointer"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
