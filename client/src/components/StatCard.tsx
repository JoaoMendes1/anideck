// client/src/components/StatCard.tsx
import type { ReactNode } from 'react'

interface StatCardProps {
    icon: ReactNode
    value: string | number
    label: string
    accentColor: 'holo-3' | 'green' | 'gold' | 'coral' | 'holo-1'
}

// Mapeado explicitamente (não gerado por template string tipo `border-t-${cor}`)
// porque o Tailwind precisa ver a classe inteira e literal no código-fonte pra
// incluir ela no build final — string dinâmica vira classe "invisível".
const ACCENT_STYLES: Record<StatCardProps['accentColor'], { border: string; iconBg: string; iconText: string }> = {
    'holo-3': { border: 'border-t-holo-3', iconBg: 'bg-holo-3/20', iconText: 'text-holo-3' },
    'green':  { border: 'border-t-green',  iconBg: 'bg-green/20',  iconText: 'text-green' },
    'gold':   { border: 'border-t-gold',   iconBg: 'bg-gold/20',   iconText: 'text-gold' },
    'coral':  { border: 'border-t-coral',  iconBg: 'bg-coral/20',  iconText: 'text-coral' },
    'holo-1': { border: 'border-t-holo-1', iconBg: 'bg-holo-1/20', iconText: 'text-holo-1' },
}

export default function StatCard({ icon, value, label, accentColor }: StatCardProps) {
    const style = ACCENT_STYLES[accentColor]
    return (
        <div className={`shrink-0 w-[132px] md:w-auto snap-start bg-panel border border-line rounded-[14px] p-4 md:p-[18px] border-t-[3px] ${style.border} relative overflow-hidden`}>
            <div className={`w-7 h-7 rounded-lg ${style.iconBg} ${style.iconText} flex items-center justify-center mb-2`}>
                {icon}
            </div>
            <b className="block font-anton text-2xl mb-0.5">{value}</b>
            <span className="text-[11px] text-muted-2 font-bold uppercase tracking-wider whitespace-nowrap">{label}</span>
        </div>
    )
}