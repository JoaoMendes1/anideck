import { useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { X, GripHorizontal, Crown } from 'lucide-react'
import { getCategoryTheme } from '../lib/filters'

interface ReorderableTagsProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export default function ReorderableTags({ tags, onChange }: ReorderableTagsProps) {
  const [tagInput, setTagInput] = useState('')

  const adicionarTag = (valor: string) => {
    const novaTag = valor.trim().replace(/,/g, '')
    if (novaTag && !tags.includes(novaTag)) {
      onChange([...tags, novaTag])
    }
    setTagInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      adicionarTag(tagInput)
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      // UX extra: Backspace com input vazio apaga a última tag
      onChange(tags.slice(0, -1))
    }
  }

  const removerTag = (tagRemover: string) => {
    onChange(tags.filter((t) => t !== tagRemover))
  }

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

      <div className="flex flex-col gap-2 p-2 border border-line rounded-xl bg-panel-2 min-h-[50px] overflow-hidden">
        {tags.length > 0 && (
          <Reorder.Group
            axis="x"
            values={tags}
            onReorder={onChange}
            className="flex items-center gap-1.5 overflow-x-auto pb-3 pt-1 px-1 custom-scrollbar touch-pan-x"
          >
            {tags.map((tag, idx) => (
              <TagItem key={tag} tag={tag} idx={idx} onRemove={removerTag} />
            ))}
          </Reorder.Group>
        )}

        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => adicionarTag(tagInput)}
          placeholder={
            tags.length === 0
              ? 'Digite a tag principal...'
              : 'Adicionar nova tag...'
          }
          className="bg-transparent border-none outline-none text-sm w-full text-text placeholder:text-muted/40 px-1 mt-1"
        />
      </div>
      <p className="text-[10px] text-muted">
        A primeira tag <Crown size={10} className="inline text-gold -mt-0.5 mx-0.5" /> será o destaque principal na capa do anime.
      </p>
    </div>
  )
}

// Componente extraído para gerenciar o Drag de forma independente
function TagItem({ tag, idx, onRemove }: { tag: string; idx: number; onRemove: (tag: string) => void }) {
  // Hook que permite controlar manualmente o que dispara o arrasto
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={tag}
      dragListener={false} // 🔴 ESSENCIAL: Desliga o drag automático na tag inteira (permite scroll)
      dragControls={controls} // Ativa o drag apenas via controls
      className={`shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-bold border select-none transition-shadow ${
        idx === 0
          ? 'ring-1 ring-gold/50 shadow-[0_0_8px_rgba(255,197,66,0.15)]'
          : ''
      } ${getCategoryTheme(tag)}`}
    >
      {/* DRAG HANDLE: Área específica de arrasto */}
      <div
        onPointerDown={(e) => controls.start(e)}
        style={{ touchAction: 'none' }} // Impede que puxar o ícone role a página
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-40 hover:opacity-100 flex items-center justify-center rounded bg-black/10"
      >
        <GripHorizontal size={12} />
      </div>
      
      {idx === 0 && <Crown size={10} className="text-gold shrink-0" />}
      
      <span className="truncate max-w-[120px]">{tag}</span>
      
      {/* BOTÃO DE EXCLUIR */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()} 
        onClick={() => onRemove(tag)}
        className="hover:text-coral opacity-50 hover:opacity-100 p-1 -mr-1 cursor-pointer transition-colors"
      >
        <X size={12} />
      </button>
    </Reorder.Item>
  )
}