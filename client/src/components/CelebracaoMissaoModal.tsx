// client/src/components/CelebracaoMissaoModal.tsx
// Sobreposição comemorativa exibida ao concluir maratona ou resgatar missão/contrato.
// Usa portal direto no body + useSheetBehavior para nunca ficar sob Navbar/BottomNav.
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Award, CheckCircle2, Coins, Hammer, Sparkles, Ticket, Trophy, X, Zap } from 'lucide-react'
import { useSheetBehavior } from '../hooks/useSheetBehavior'
import type { DadosCelebracaoMissao } from '../contexts/CelebracaoContext'

const PARTICULAS = [
  { id: 0, x: -115, y: -95, delay: 0.04, cor: 'bg-gold', tamanho: 'w-2 h-2' },
  { id: 1, x: 118, y: -88, delay: 0.08, cor: 'bg-holo-3', tamanho: 'w-2.5 h-2.5' },
  { id: 2, x: -130, y: 12, delay: 0.12, cor: 'bg-holo-1', tamanho: 'w-2 h-2' },
  { id: 3, x: 132, y: 20, delay: 0.06, cor: 'bg-gold', tamanho: 'w-2 h-2' },
  { id: 4, x: -85, y: -128, delay: 0.14, cor: 'bg-green', tamanho: 'w-1.5 h-1.5' },
  { id: 5, x: 92, y: -125, delay: 0.1, cor: 'bg-holo-2', tamanho: 'w-2 h-2' },
  { id: 6, x: -98, y: 88, delay: 0.16, cor: 'bg-holo-3', tamanho: 'w-1.5 h-1.5' },
  { id: 7, x: 102, y: 86, delay: 0.18, cor: 'bg-gold', tamanho: 'w-2 h-2' },
]

export default function CelebracaoMissaoModal({
  dados,
  aoFechar,
}: {
  dados: DadosCelebracaoMissao
  aoFechar: () => void
}) {
  const movimentoReduzido = useReducedMotion()

  useSheetBehavior(true, aoFechar, true)

  useEffect(() => {
    const t = window.setTimeout(aoFechar, 6500)
    return () => window.clearTimeout(t)
  }, [aoFechar, dados])

  const r = dados.recompensas
  const pilulas: Array<{ chave: string; rotulo: string; classe: string; icone: typeof Coins }> = []
  if ((r.ouro ?? 0) > 0) {
    pilulas.push({
      chave: 'ouro',
      rotulo: `+${r.ouro} Ouro`,
      classe: 'border-gold/50 bg-gold/15 text-gold',
      icone: Coins,
    })
  }
  if ((r.xp ?? 0) > 0) {
    pilulas.push({
      chave: 'xp',
      rotulo: `+${r.xp} XP`,
      classe: 'border-holo-2/50 bg-holo-2/15 text-holo-2',
      icone: Zap,
    })
  }
  if ((r.anicoins ?? 0) > 0) {
    pilulas.push({
      chave: 'anicoins',
      rotulo: `+${r.anicoins} AniCoins`,
      classe: 'border-holo-3/50 bg-holo-3/15 text-holo-3',
      icone: Sparkles,
    })
  }
  if ((r.bilhetes ?? 0) > 0) {
    pilulas.push({
      chave: 'bilhetes',
      rotulo: `+${r.bilhetes} ${r.bilhetes === 1 ? 'bilhete' : 'bilhetes'}`,
      classe: 'border-holo-1/50 bg-holo-1/15 text-holo-1',
      icone: Ticket,
    })
  }
  if (r.materiais) {
    pilulas.push({
      chave: 'materiais',
      rotulo: r.materiais,
      classe: 'border-green/50 bg-green/15 text-green',
      icone: Hammer,
    })
  }

  const tituloCabecalho =
    dados.tipo === 'maratona'
      ? 'Maratona Concluída!'
      : dados.tipo === 'contrato'
        ? 'Contrato Cumprido!'
        : 'Missão Concluída!'

  const conteudo = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-celebracao-missao"
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
    >
      <motion.div
        aria-hidden="true"
        onClick={aoFechar}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: movimentoReduzido ? 0 : 0.2 }}
        className="absolute inset-0 bg-void/75 backdrop-blur-sm"
      />

      <motion.div
        initial={movimentoReduzido ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.82, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={
          movimentoReduzido
            ? { duration: 0 }
            : { type: 'spring', stiffness: 360, damping: 24 }
        }
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-gold/55 bg-gradient-to-b from-panel via-panel to-panel-2 p-6 text-center shadow-[0_24px_80px_rgba(245,158,11,0.28)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-gold/20 blur-3xl"
        />

        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar celebração"
          className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line bg-panel-2/80 text-muted transition hover:text-text"
        >
          <X size={15} />
        </button>

        <div className="relative mx-auto mb-3 flex h-20 w-20 items-center justify-center">
          {!movimentoReduzido &&
            PARTICULAS.map((p) => (
              <motion.span
                key={p.id}
                aria-hidden="true"
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{ x: p.x, y: p.y, scale: [0, 1.3, 0.7], opacity: [1, 1, 0] }}
                transition={{ duration: 0.95, delay: p.delay, ease: 'easeOut' }}
                className={`pointer-events-none absolute rounded-full ${p.cor} ${p.tamanho}`}
              />
            ))}

          {!movimentoReduzido && (
            <motion.div
              aria-hidden="true"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-dashed border-gold/50"
            />
          )}

          <motion.div
            initial={movimentoReduzido ? {} : { scale: 0.4, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.08 }}
            className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/60 bg-gradient-to-br from-gold/30 via-gold/15 to-holo-3/20 text-gold shadow-[0_0_24px_rgba(245,158,11,0.35)]"
          >
            {dados.tipo === 'maratona' ? (
              <Trophy size={30} strokeWidth={2.2} />
            ) : (
              <CheckCircle2 size={30} strokeWidth={2.2} />
            )}
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          {dados.subtitulo && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/12 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-gold">
              <Sparkles size={11} aria-hidden="true" />
              {dados.subtitulo}
            </span>
          )}
          <h2 id="titulo-celebracao-missao" className="m-0 font-anton text-2xl uppercase tracking-wide text-text">
            {tituloCabecalho}
          </h2>
          {dados.titulo && <p className="m-0 text-xs font-semibold text-muted">{dados.titulo}</p>}
        </div>

        {pilulas.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {pilulas.map((p, idx) => {
              const Icone = p.icone
              return (
                <motion.span
                  key={p.chave}
                  initial={movimentoReduzido ? {} : { opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: movimentoReduzido ? 0 : 0.16 + idx * 0.06, duration: 0.25 }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-extrabold ${p.classe}`}
                >
                  <Icone size={13} aria-hidden="true" />
                  {p.rotulo}
                </motion.span>
              )
            })}
          </div>
        )}

        {dados.notaExtra && (
          <motion.p
            initial={movimentoReduzido ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: movimentoReduzido ? 0 : 0.35 }}
            className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-holo-3/30 bg-holo-3/10 px-3 py-1.5 font-mono text-[11px] font-semibold text-holo-3"
          >
            <Award size={13} className="shrink-0" aria-hidden="true" />
            <span>{dados.notaExtra}</span>
          </motion.p>
        )}

        <button
          type="button"
          onClick={aoFechar}
          className="mt-5 h-10 w-full cursor-pointer rounded-full bg-gradient-to-r from-gold via-holo-1 to-holo-3 px-5 text-xs font-extrabold uppercase tracking-wider text-void shadow-lg transition hover:brightness-110 active:scale-[0.98]"
        >
          Continuar
        </button>
      </motion.div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(conteudo, document.body) : conteudo
}
