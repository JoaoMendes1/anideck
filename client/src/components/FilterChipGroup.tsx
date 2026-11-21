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

const DEFAULT_ACTIVE = 'bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-void border-transparent shadow-[0_0_16px_rgba(34,211,238,0.28)]'
const INACTIVE = 'surface-glass text-muted hover:border-holo-3/45 hover:text-text'

export default function FilterChipGroup({
    label,
    options,
    isActive,
    onToggle,
    activeClassName = DEFAULT_ACTIVE,
}: FilterChipGroupProps) {
    return (
        <div>
            <p className="font-mono text-xs text-muted-2 tracking-widest mb-3 select-none uppercase">
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