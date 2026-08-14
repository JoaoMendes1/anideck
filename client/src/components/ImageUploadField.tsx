// client/src/components/ImageUploadField.tsx
interface ImageUploadFieldProps {
  label: string
  value: string
  onChange: (url: string) => void
  onFileSelect: (file: File) => void
  uploading: boolean
  previewClassName?: string
}

// Extraído do PainelAdmin: os blocos de Capa e Banner eram JSX quase idêntico
// (label + botão limpar, input de URL, input de arquivo, preview com fallback).
// Agora é um único componente parametrizado por label/preview.
export default function ImageUploadField({
  label,
  value,
  onChange,
  onFileSelect,
  uploading,
  previewClassName = 'w-24 h-36',
}: ImageUploadFieldProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-[11px] font-bold">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] font-bold text-coral hover:text-coral/80 uppercase cursor-pointer"
          >
            🗑️ Limpar
          </button>
        )}
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-sm outline-none mb-2 focus:border-holo-3 transition-colors"
      />

      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelect(file)
          e.target.value = '' // permite re-selecionar o mesmo arquivo depois
        }}
        className="w-full text-xs text-muted mb-3 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-holo-2/20 file:text-holo-2 hover:file:bg-holo-2/30 cursor-pointer disabled:opacity-50"
      />

      {value && (
        <img
          src={value}
          alt={`Preview ${label}`}
          className={`${previewClassName} object-cover rounded-lg border border-line shadow-md`}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
    </div>
  )
}