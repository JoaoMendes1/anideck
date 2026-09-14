import { useState, useRef, useMemo } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { X, GripHorizontal, Crown, AlertTriangle } from 'lucide-react'
import { getCategoryTheme } from '../lib/filters'
import { useTaxonomia, normalizar, type RotuloAgrupado } from '../hooks/useTaxonomia'

interface ReorderableTagsProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export default function ReorderableTags({ tags, onChange }: ReorderableTagsProps) {
  const { rotulos, paraExibicao, rawNamesConhecidos, carregando } = useTaxonomia()

  const [tagInput, setTagInput] = useState('')
  const [destacada, setDestacada] = useState(0)
  const [focado, setFocado] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sugere pelo nome em PORTUGUÊS, grava o canônico. Quem já está no anime sai
  // da lista — sugerir o que já foi escolhido só ocupa espaço.
  const jaUsados = useMemo(() => {
    const s = new Set<string>()
    for (const t of tags) s.add(paraExibicao.get(t) ?? t)
    return s
  }, [tags, paraExibicao])

  const sugestoes = useMemo(() => {
    const termo = normalizar(tagInput)
    const disponiveis = rotulos.filter(r => r.tier !== 'ignorado' && !jaUsados.has(r.display))
    if (!termo) return disponiveis.slice(0, 8)

    // Quem começa com o termo vem antes de quem só o contém: digitar "ma" deve
    // mostrar "Magia" antes de "Artes Marciais".
    const comeca = disponiveis.filter(r => normalizar(r.display).startsWith(termo))
    const contem = disponiveis.filter(
      r => !normalizar(r.display).startsWith(termo) && normalizar(r.display).includes(termo),
    )
    return [...comeca, ...contem].slice(0, 8)
  }, [tagInput, rotulos, jaUsados])

  // Digitou algo que não existe: o input não deixa adicionar, e o aviso diz onde
  // cadastrar. É a barreira — antes, "besteira" entrava e era salva.
  const semCorrespondencia = tagInput.trim() !== '' && sugestoes.length === 0

  const escolher = (r: RotuloAgrupado) => {
    if (!tags.includes(r.canonico)) onChange([...tags, r.canonico])
    setTagInput('')
    setDestacada(0)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setDestacada(i => Math.min(i + 1, sugestoes.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setDestacada(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (sugestoes[destacada]) {
        e.preventDefault()
        escolher(sugestoes[destacada])
      } else if (e.key === 'Enter') {
        // Enter sem sugestão não faz nada de propósito: antes ele gravava o texto
        // cru, que é como tag inexistente chegava ao banco.
        e.preventDefault()
      }
    } else if (e.key === 'Escape') {
      setTagInput('')
      setDestacada(0)
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  const removerTag = (tagRemover: string) => {
    onChange(tags.filter(t => t !== tagRemover))
  }

  const naoMapeadas = tags.filter(t => !rawNamesConhecidos.has(t)).length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-muted uppercase">
          Tags Customizadas
        </label>
        {tags.length > 1 && (
          <span className="text-[10px] text-muted-2">
            Puxe pelo <GripHorizontal size={10} className="inline opacity-50 -mt-0.5" /> para mover
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-2 border border-line rounded-xl bg-panel-2 min-h-[50px]">
        {tags.length > 0 && (
          <Reorder.Group
            axis="x"
            values={tags}
            onReorder={onChange}
            className="flex items-center gap-1.5 overflow-x-auto pb-3 pt-1 px-1 custom-scrollbar touch-pan-x"
          >
            {tags.map((tag, idx) => (
              <TagItem
                key={tag}
                tag={tag}
                rotulo={paraExibicao.get(tag) ?? tag}
                conhecida={rawNamesConhecidos.has(tag)}
                idx={idx}
                onRemove={removerTag}
              />
            ))}
          </Reorder.Group>
        )}

        {/* O dropdown é posicionado em relação a este bloco, por isso o relative */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={tagInput}
            onChange={e => { setTagInput(e.target.value); setDestacada(0) }}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocado(true)}
            // O atraso deixa o clique na sugestão acontecer antes de a lista sumir.
            onBlur={() => setTimeout(() => setFocado(false), 150)}
            disabled={carregando}
            placeholder={
              carregando
                ? 'Carregando rótulos…'
                : tags.length === 0
                  ? 'Digite a tag principal…'
                  : 'Adicionar tag…'
            }
            className="bg-transparent border-none outline-none text-sm w-full text-text placeholder:text-muted/40 px-1 mt-1"
          />

          {focado && sugestoes.length > 0 && (
            <ul
              role="listbox"
              className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-56 overflow-y-auto bg-panel border border-line rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] py-1 custom-scrollbar"
            >
              {sugestoes.map((r, i) => (
                <li key={r.display}>
                  <button
                    type="button"
                    onMouseEnter={() => setDestacada(i)}
                    onClick={() => escolher(r)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-[13px] cursor-pointer transition-colors ${
                      i === destacada ? 'bg-panel-2 text-text' : 'text-muted hover:text-text'
                    }`}
                  >
                    <span className="font-bold truncate">{r.display}</span>
                    <span className="font-mono text-[10px] text-muted-2 shrink-0 uppercase">
                      {r.tier === 'genero' ? 'gênero' : r.tier === 'demografia' ? 'demografia' : 'tema'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {focado && semCorrespondencia && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-panel border border-gold/40 rounded-xl px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <p className="text-gold text-[12.5px] font-bold flex items-center gap-1.5">
                <AlertTriangle size={12} /> "{tagInput.trim()}" não existe na taxonomia
              </p>
              <p className="text-muted-2 text-[11.5px] mt-1">
                Só é possível usar rótulo cadastrado. Para criar um novo, vá em
                Painel de Controle → Diagnóstico.
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-muted">
        A primeira tag <Crown size={10} className="inline text-gold -mt-0.5 mx-0.5" /> será o
        destaque principal na capa do anime.
      </p>

      {naoMapeadas > 0 && (
        <p className="text-[10.5px] text-gold flex items-center gap-1.5">
          <AlertTriangle size={11} className="shrink-0" />
          {naoMapeadas} tag(s) fora da taxonomia — em amarelo. Elas não entram em gráfico nenhum.
        </p>
      )}
    </div>
  )
}

// Componente extraído para gerenciar o Drag de forma independente
function TagItem({
  tag, rotulo, conhecida, idx, onRemove,
}: {
  tag: string
  rotulo: string
  conhecida: boolean
  idx: number
  onRemove: (tag: string) => void
}) {
  // Hook que permite controlar manualmente o que dispara o arrasto
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={tag}
      dragListener={false} // 🔴 ESSENCIAL: Desliga o drag automático na tag inteira (permite scroll)
      dragControls={controls} // Ativa o drag apenas via controls
      // O título mostra o texto REAL gravado: a tela exibe "Ação" mas o banco pode
      // ter "Action" (import da AniList), e sem isso não haveria como descobrir.
      title={rotulo !== tag ? `Gravado como "${tag}"` : undefined}
      className={`shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-bold border select-none transition-shadow ${
        idx === 0 ? 'ring-1 ring-gold/50 shadow-[0_0_8px_rgba(255,197,66,0.15)]' : ''
      } ${conhecida ? getCategoryTheme(rotulo) : 'bg-gold/10 border-gold/40 text-gold'}`}
    >
      {/* DRAG HANDLE: Área específica de arrasto */}
      <div
        onPointerDown={e => controls.start(e)}
        style={{ touchAction: 'none' }} // Impede que puxar o ícone role a página
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-40 hover:opacity-100 flex items-center justify-center rounded bg-black/10"
      >
        <GripHorizontal size={12} />
      </div>

      {idx === 0 && <Crown size={10} className="text-gold shrink-0" />}
      {!conhecida && <AlertTriangle size={10} className="shrink-0" />}

      {/* Exibe o nome em português mesmo quando o banco guarda o termo em inglês */}
      <span className="truncate max-w-[120px]">{rotulo}</span>

      {/* BOTÃO DE EXCLUIR */}
      <button
        type="button"
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onRemove(tag)}
        className="hover:text-coral opacity-50 hover:opacity-100 p-1 -mr-1 cursor-pointer transition-colors"
      >
        <X size={12} />
      </button>
    </Reorder.Item>
  )
}