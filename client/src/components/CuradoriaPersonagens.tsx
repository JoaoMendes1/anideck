// client/src/components/CuradoriaPersonagens.tsx
import { useState } from 'react'
import { Plus, Trash2, UploadCloud } from 'lucide-react'
import type { CuratedCharacter } from '../types/curation'

interface CuradoriaPersonagensProps {
  characters: CuratedCharacter[]
  onAdd: (char: CuratedCharacter) => void
  onRemove: (index: number) => void
  onUploadImage: (file: File) => Promise<string | null>
  uploading: boolean
  onValidationError: (msg: string) => void
}

// Extraído do PainelAdmin. O mini-form (nome/foto/papel) tinha inputs com
// min-w fixo que estourava a viewport em 360px — agora empilha em coluna no
// mobile e vira linha só a partir de sm (~640px).
export default function CuradoriaPersonagens({
  characters,
  onAdd,
  onRemove,
  onUploadImage,
  uploading,
  onValidationError,
}: CuradoriaPersonagensProps) {
  const [charName, setCharName] = useState('')
  const [charImg, setCharImg] = useState('')
  const [charRole, setCharRole] = useState('MAIN')

  const handleAdd = () => {
    if (!charName.trim() || !charImg.trim()) {
      onValidationError('Preencha nome e imagem do personagem.')
      return
    }
    onAdd({ name: charName, image: charImg, role: charRole })
    setCharName('')
    setCharImg('')
    setCharRole('MAIN')
  }

  const handleFile = async (file: File) => {
    const url = await onUploadImage(file)
    if (url) setCharImg(url)
  }

  return (
    <div className="p-4 border border-line bg-panel-2 rounded-xl">
      <h4 className="text-xs font-bold text-muted uppercase mb-4">Elenco Curado (Personagens)</h4>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4 bg-panel p-3 rounded-lg border border-line">
        <div className="flex-1">
          <label className="block text-[10px] mb-1">Nome</label>
          <input
            type="text"
            value={charName}
            onChange={(e) => setCharName(e.target.value)}
            className="w-full bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none"
          />
        </div>

        <div className="flex-1">
          <label className="block text-[10px] mb-1">URL da Foto ou Enviar</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={charImg}
              onChange={(e) => setCharImg(e.target.value)}
              className="flex-1 min-w-0 bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none"
              placeholder="https://"
            />
            <label className="bg-panel-2 border border-line p-1.5 rounded cursor-pointer hover:border-holo-3 text-muted shrink-0">
              <UploadCloud size={14} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1 sm:flex-none">
            <label className="block text-[10px] mb-1">Papel</label>
            <select
              value={charRole}
              onChange={(e) => setCharRole(e.target.value)}
              className="w-full sm:w-auto bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none text-text"
            >
              <option value="MAIN">MAIN</option>
              <option value="SUPPORTING">SUPPORT</option>
            </select>
          </div>
          <button
            onClick={handleAdd}
            aria-label="Adicionar personagem"
            className="bg-holo-2 text-white p-2 rounded cursor-pointer hover:opacity-80 shrink-0"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {characters.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {characters.map((char, index) => (
            <div key={index} className="w-24 shrink-0 relative group">
              <img src={char.image} alt={char.name} className="w-24 h-32 object-cover rounded-lg border border-line mb-1" />
              <button
                onClick={() => onRemove(index)}
                aria-label={`Remover ${char.name}`}
                className="absolute top-1 right-1 bg-coral text-white p-1 rounded-md opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
              >
                <Trash2 size={12} />
              </button>
              <div className="text-[10px] font-bold truncate text-text">{char.name}</div>
              <div className="text-[9px] text-muted">{char.role}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}