//Resolve o Drag & Drop na horizontal, adiciona suporte a mobile (touch-none) e destaca a primeira tag com um ícone de coroa
import { useState } from 'react'
import { Reorder } from 'framer-motion'
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
          <span className="text-[10px] text-muted-2 animate-pulse">
            Arraste para reordenar
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 p-3 border border-line rounded-xl bg-panel-2 min-h-[50px] overflow-hidden">
        {tags.length > 0 && (
          <Reorder.Group
            axis="x"
            values={tags}
            onReorder={onChange}
            className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 custom-scrollbar"
          >
            {tags.map((tag, idx) => (
              <Reorder.Item
                key={tag}
                value={tag}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border cursor-grab active:cursor-grabbing touch-none select-none transition-shadow ${
                  idx === 0
                    ? 'ring-2 ring-gold/50 shadow-[0_0_10px_rgba(255,197,66,0.15)]'
                    : ''
                } ${getCategoryTheme(tag)}`}
              >
                <GripHorizontal size={14} className="opacity-40" />
                {idx === 0 && <Crown size={12} className="text-gold" />}
                {tag}
                <button
                  type="button"
                  onClick={() => removerTag(tag)}
                  className="hover:text-coral opacity-70 hover:opacity-100 ml-1 cursor-pointer transition-colors"
                >
                  <X size={14} />
                </button>
              </Reorder.Item>
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
          className="bg-transparent border-none outline-none text-sm w-full text-text placeholder:text-muted/40 mt-1"
        />
      </div>
      <p className="text-[10px] text-muted">
        A primeira tag <Crown size={10} className="inline text-gold -mt-0.5 mx-0.5" /> será o destaque principal na capa do anime.
      </p>
    </div>
  )
}