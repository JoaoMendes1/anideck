import { useState } from 'react'
import { Plus, Trash2, UploadCloud, Check, X } from 'lucide-react'
import type { CuratedCharacter } from '../types/curation'

interface CuradoriaPersonagensProps {
  characters: CuratedCharacter[]
  onAdd: (char: CuratedCharacter) => void
  onUpdate: (index: number, char: CuratedCharacter) => void
  onRemove: (index: number) => void
  onUploadImage: (file: File) => Promise<string | null>
  uploading: boolean
  onValidationError: (msg: string) => void
}

export default function CuradoriaPersonagens({
  characters,
  onAdd,
  onUpdate,
  onRemove,
  onUploadImage,
  uploading,
  onValidationError,
}: CuradoriaPersonagensProps) {
  const [charName, setCharName] = useState('')
  const [charImg, setCharImg] = useState('')
  const [charRole, setCharRole] = useState('MAIN')
  const [editIndex, setEditIndex] = useState<number | null>(null)

  const handleSave = () => {
    if (!charName.trim()) {
      onValidationError('O nome do personagem é obrigatório.')
      return
    }

    const payload = { name: charName, image: charImg, role: charRole }

    if (editIndex !== null) {
      onUpdate(editIndex, payload)
    } else {
      onAdd(payload)
    }

    cancelEdit()
  }

  const handleEdit = (index: number, char: CuratedCharacter) => {
    setEditIndex(index)
    setCharName(char.name)
    setCharImg(char.image || '')
    setCharRole(char.role || 'SUPPORTING')
  }

  const cancelEdit = () => {
    setEditIndex(null)
    setCharName('')
    setCharImg('')
    setCharRole('MAIN')
  }

  const handleRemove = (index: number) => {
    if (editIndex === index) cancelEdit()
    onRemove(index)
  }

  const handleFile = async (file: File) => {
    const url = await onUploadImage(file)
    if (url) setCharImg(url)
  }

  return (
    <div className="p-4 border border-line bg-panel-2 rounded-xl w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-muted uppercase">Elenco Curado (Personagens)</h4>
        <span className="text-[10px] text-muted-2">Toque no personagem para editar</span>
      </div>

      <div className={`flex flex-col sm:flex-row sm:items-end gap-3 mb-4 p-3 rounded-lg border transition-colors ${editIndex !== null ? 'bg-holo-3/5 border-holo-3' : 'bg-panel border-line'}`}>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] mb-1 font-bold text-muted">Nome</label>
          <input
            type="text"
            value={charName}
            onChange={(e) => setCharName(e.target.value)}
            className="w-full bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none focus:border-holo-2 text-text"
          />
        </div>

        <div className="flex-1 min-w-0">
          <label className="block text-[10px] mb-1 font-bold text-muted">URL da Foto ou Enviar</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={charImg}
              onChange={(e) => setCharImg(e.target.value)}
              className="flex-1 min-w-0 bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none focus:border-holo-2 text-text"
              placeholder="https://"
            />
            <label className="bg-panel-2 border border-line p-1.5 rounded cursor-pointer hover:border-holo-3 text-muted shrink-0 transition-colors">
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
            <label className="block text-[10px] mb-1 font-bold text-muted">Papel</label>
            <select
              value={charRole}
              onChange={(e) => setCharRole(e.target.value)}
              className="w-full sm:w-auto bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none text-text"
            >
              <option value="MAIN">MAIN</option>
              <option value="SUPPORTING">SUPPORTING</option>
            </select>
          </div>
          
          {editIndex !== null && (
            <button
              onClick={cancelEdit}
              aria-label="Cancelar edição"
              className="bg-panel-2 border border-line text-muted p-1.5 rounded cursor-pointer hover:text-white transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          )}

          <button
            onClick={handleSave}
            aria-label={editIndex !== null ? "Salvar edição" : "Adicionar personagem"}
            className={`${editIndex !== null ? 'bg-holo-3 text-void' : 'bg-holo-2 text-white'} p-1.5 rounded cursor-pointer hover:opacity-80 shrink-0 transition-colors shadow-lg`}
          >
            {editIndex !== null ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>

      {characters.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4 pt-2 w-full custom-scrollbar touch-pan-x snap-x snap-mandatory">
          {characters.map((char, index) => {
            const isEditing = editIndex === index;
            return (
              <div 
                key={index} 
                onClick={() => handleEdit(index, char)}
                className={`w-24 shrink-0 relative group cursor-pointer rounded-lg p-1 transition-all snap-start ${
                  isEditing ? 'bg-panel-2 ring-1 ring-holo-3 shadow-[0_0_15px_rgba(63,224,240,0.15)]' : 'hover:bg-panel'
                }`}
              >
                <div className="w-full h-32 rounded-md border border-line mb-1.5 overflow-hidden bg-void relative">
                  {char.image ? (
                    <img src={char.image} alt={char.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-muted-2 uppercase font-bold leading-tight bg-panel/50">
                      <UploadCloud size={16} className="mb-1 opacity-50" />
                      NO<br/>IMAGE
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(index);
                    }}
                    aria-label={`Remover ${char.name}`}
                    className="absolute top-1 right-1 bg-coral text-white p-1.5 rounded-md opacity-100 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer transition-opacity active:bg-coral/80 shadow-md"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className={`text-[10px] font-bold truncate ${isEditing ? 'text-holo-3' : 'text-text'}`}>{char.name}</div>
                <div className="text-[9px] text-muted">{char.role}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}