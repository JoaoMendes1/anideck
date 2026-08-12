// client/src/components/FilterChipGroup.tsx
// Elimina a repetição de 3 blocos quase idênticos (Sort/Status/Season) no Rankings.tsx.
// Genero fica de fora de propósito: cada chip de gênero tem cor própria via getCategoryTheme,
// não dá pra generalizar sem perder legibilidade — melhor deixar inline lá.
interface ChipOption {
    label: string
    value: string
    emoji?: string
}

interface FilterChipGroupProps {
    label: string
    options: ChipOption[]
    isActive: (value: string) => boolean
    onToggle: (value: string) => void
    activeClassName?: string
}

const DEFAULT_ACTIVE = 'bg-gradient-to-r from-holo-1 to-holo-2 text-void shadow-[0_0_12px_rgba(123,92,255,0.4)]'
const INACTIVE = 'bg-panel-2 border border-line text-muted hover:border-holo-2 hover:text-text'

export default function FilterChipGroup({
    label,
    options,
    isActive,
    onToggle,
    activeClassName = DEFAULT_ACTIVE,
}: FilterChipGroupProps) {
    return (
        <div>
            <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none uppercase">
                {label}
            </p>
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onToggle(opt.value)}
                        className={`select-none px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer border ${
                            isActive(opt.value) ? activeClassName : INACTIVE
                        }`}
                    >
                        {opt.emoji ? `${opt.emoji} ` : ''}{opt.label}
                    </button>
                ))}
            </div>
        </div>
    )
}