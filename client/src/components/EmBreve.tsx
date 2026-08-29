// client/src/components/EmBreve.tsx
// Embrulho para funcionalidades que já têm desenho, mas ainda não têm código.
import type { ReactNode } from 'react'
import { Clock } from 'lucide-react'

interface Props {
    children: ReactNode
    /** Motivo curto do bloqueio, ex: "depende do Agente Olheiro". */
    nota?: string
}

export default function EmBreve({ children, nota }: Props) {
    return (
        <div className="relative">
            {/*
              inert tira o conteúdo da navegação por teclado E da árvore de
              acessibilidade de uma vez. Só ofuscar com opacity deixaria o botão
              clicável, alcançável por Tab e anunciado como funcional por leitor
              de tela — ou seja, ofuscado para quem enxerga e normal para todo o
              resto. O pointer-events-none é redundante em navegador moderno,
              mas custa nada e cobre quem não suporta inert.
            */}
            <div inert className="opacity-40 pointer-events-none select-none">
                {children}
            </div>

            {/*
              O selo fica FORA do bloco inerte de propósito: se estivesse dentro,
              o inert o esconderia justamente de quem mais precisa ler o aviso.
            */}
            <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5 max-w-[60%]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gold whitespace-nowrap">
                    <Clock size={11} />
                    Em breve
                </span>
                {nota && (
                    <span className="text-right text-[11px] leading-snug text-muted-2">
                        {nota}
                    </span>
                )}
            </div>
        </div>
    )
}