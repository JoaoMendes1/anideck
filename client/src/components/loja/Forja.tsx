// client/src/components/loja/Forja.tsx
// Forja do Brokk: os materiais do jogador e as receitas. Forjar gasta Ouro e materiais e
// entrega o item no inventário, sem sorte. O que dá para forjar agora vem primeiro; o que
// falta aparece no próprio cartão, material por material.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Hammer, Lock } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { MATERIAIS, faltaParaForjar, forjar, lerForja, nomeDoMaterial, type EstadoForja, type ReceitaDaForja } from '../../lib/forja'
import { SLOTS_RPG, estiloDaRaridade, resumoDoItem, textoDasClasses } from '../../lib/rpg'
import { arteDoMaterial } from '../../lib/artesRpg'
import IconeDoItem from '../rpg/IconeDoItem'
import IconeOuro from '../IconeOuro'

const TITULO = 'm-0 font-mono text-xs font-semibold uppercase tracking-widest text-muted'

function IconeDoMaterial({ id }: { id: string }) {
  const arte = arteDoMaterial(id)
  return arte ? <img src={arte} alt="" aria-hidden="true" loading="lazy" className="h-full w-full object-contain" /> : null
}

function CartaoDaReceita({
  receita,
  estado,
  forjando,
  aoForjar,
}: {
  receita: ReceitaDaForja
  estado: EstadoForja
  forjando: string | null
  aoForjar: (r: ReceitaDaForja) => void
}) {
  const estilo = estiloDaRaridade(receita.raridade)
  const falta = faltaParaForjar(receita, estado)
  const pronto = falta.ouro === 0 && Object.keys(falta.materiais).length === 0
  const classes = textoDasClasses(receita)
  const rotuloSlot = SLOTS_RPG.find((s) => s.id === receita.slot)?.rotulo ?? ''
  return (
    <li className={`flex flex-col gap-2.5 rounded-2xl border p-3 ${estilo.borda} ${estilo.fundo}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-void/60 ${estilo.texto}`}>
          <IconeDoItem id={receita.id} slot={receita.slot} tamanho={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`m-0 text-sm font-bold leading-tight ${estilo.texto}`}>{receita.nome}</p>
          <p className="m-0 mt-0.5 text-xs text-muted">
            {estilo.rotulo} · {rotuloSlot} · nível {receita.nivel_minimo}
            {receita.conjunto ? ` · conjunto ${receita.conjunto}` : ''}
          </p>
          <p className="m-0 mt-0.5 text-xs text-text">{resumoDoItem(receita)}</p>
          {classes && <p className="m-0 mt-0.5 text-xs text-muted">Só para {classes}</p>}
        </div>
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Custo">
        <li
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-xs ${falta.ouro > 0 ? 'border-coral/40 text-coral' : 'border-gold/40 text-gold'}`}
        >
          <IconeOuro size={12} /> {receita.ouro}
        </li>
        {Object.entries(receita.materiais).map(([id, qtd]) => {
          const tem = estado.materiais[id] ?? 0
          return (
            <li
              key={id}
              title={nomeDoMaterial(id)}
              className={`inline-flex items-center gap-1 rounded-full border py-0.5 pr-2 pl-0.5 font-mono text-xs ${tem >= qtd ? 'border-green/40 text-green' : 'border-coral/40 text-coral'}`}
            >
              <span className="h-5 w-5">
                <IconeDoMaterial id={id} />
              </span>
              {tem}/{qtd} <span className="sr-only">{nomeDoMaterial(id)}</span>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto flex items-center justify-end border-t border-line/60 pt-2.5">
        {receita.possui ? (
          <Link to="/personagem" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-green/40 px-4 text-xs font-bold text-green">
            <Check size={14} aria-hidden="true" /> Você já tem
          </Link>
        ) : receita.bloqueado ? (
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed border-line px-4 text-xs font-bold text-muted">
            <Lock size={13} aria-hidden="true" /> Libera no nível {receita.nivel_minimo}
          </span>
        ) : pronto ? (
          <button
            type="button"
            onClick={() => aoForjar(receita)}
            disabled={forjando !== null}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-gold to-coral px-4 text-xs font-extrabold text-void disabled:cursor-wait disabled:opacity-60"
          >
            <Hammer size={14} aria-hidden="true" /> {forjando === receita.id ? 'Forjando…' : 'Forjar'}
          </button>
        ) : (
          <span className="inline-flex h-10 items-center rounded-full border border-line px-4 text-xs font-bold text-muted">Faltam materiais ou Ouro</span>
        )}
      </div>
    </li>
  )
}

export default function Forja() {
  const { showToast } = useToast()
  const [estado, setEstado] = useState<EstadoForja | null>(null)
  const [falhou, setFalhou] = useState(false)
  const [forjando, setForjando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const lido = await lerForja()
    setFalhou(!lido)
    if (lido) setEstado(lido)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Pronto para forjar primeiro, depois o resto pelo nível; o que já tem vai para o fim.
  const ordenadas = useMemo(() => {
    if (!estado) return []
    const peso = (r: ReceitaDaForja) => {
      if (r.possui) return 3
      if (r.bloqueado) return 2
      const f = faltaParaForjar(r, estado)
      return f.ouro === 0 && Object.keys(f.materiais).length === 0 ? 0 : 1
    }
    return [...estado.receitas].sort((a, b) => peso(a) - peso(b) || a.nivel_minimo - b.nivel_minimo)
  }, [estado])

  const aoForjar = async (r: ReceitaDaForja) => {
    if (forjando) return
    setForjando(r.id)
    const resposta = await forjar(r.id)
    setForjando(null)
    if (!resposta.ok) {
      showToast(resposta.erro, 'error')
      return
    }
    showToast(`O Brokk forjou ${r.nome}. Equipe pelo Personagem.`, 'success')
    carregar()
  }

  if (falhou && !estado) {
    return (
      <p className="m-0 rounded-2xl border border-line bg-panel p-6 text-center text-sm text-muted">
        A Forja não abriu agora. Tente de novo em instantes.
      </p>
    )
  }
  if (!estado) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl border border-line bg-panel shimmer" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-gold/30 bg-gold/5 px-4 py-3">
        <p className="m-0 text-sm text-text">
          O Brokk forja equipamentos Épicos e Lendários com <strong className="text-gold">Ouro e materiais</strong>, sem depender de sorte.
        </p>
        <p className="m-0 text-xs text-muted">
          Materiais caem nas vitórias de expedição e de masmorra completa. Cópias repetidas de itens também viram materiais: desmonte pela lista de itens do Personagem.
        </p>
        <span className="inline-flex items-center gap-2 font-anton text-xl leading-none text-gold">
          <IconeOuro size={18} /> {estado.ouro.toLocaleString('pt-BR')}
          <span className="font-mono text-xs font-bold text-muted">de Ouro</span>
        </span>
      </div>

      <section className="flex flex-col gap-2" aria-labelledby="titulo-materiais">
        <h2 id="titulo-materiais" className={TITULO}>
          Seus materiais
        </h2>
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4 lg:grid-cols-6">
          {MATERIAIS.map((m) => {
            const qtd = estado.materiais[m.id] ?? 0
            return (
              <li key={m.id} className={`flex items-center gap-2 rounded-xl border p-2 ${qtd > 0 ? 'border-line bg-panel' : 'border-line/50 bg-panel/40 opacity-60'}`}>
                <span className="h-9 w-9 shrink-0">
                  <IconeDoMaterial id={m.id} />
                </span>
                <span className="min-w-0 text-xs leading-tight">
                  <span className="block truncate text-text">{m.nome}</span>
                  <span className="font-mono font-bold text-gold">×{qtd}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="titulo-receitas">
        <h2 id="titulo-receitas" className={TITULO}>
          Receitas
        </h2>
        {ordenadas.length === 0 ? (
          <p className="m-0 rounded-2xl border border-line bg-panel p-6 text-center text-sm text-muted">O Brokk ainda não tem receitas.</p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {ordenadas.map((r) => (
              <CartaoDaReceita key={r.id} receita={r} estado={estado} forjando={forjando} aoForjar={aoForjar} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
