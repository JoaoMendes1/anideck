// client/src/components/ItensPerfil.tsx
// Só a LISTA de opções do menu de perfil. A moldura fica de fora: no desktop é
// um dropdown ancorado, no mobile é um Sheet. Duplicar estes três itens nas duas
// molduras garantiria que um dia eles divergissem.
import { Link } from 'react-router-dom'
import { Settings, Shield, LogOut } from 'lucide-react'
import { useSessao } from '../contexts/SessaoContext'

export default function ItensPerfil({ onNavegar }: { onNavegar: () => void }) {
    const { isAdmin, sair } = useSessao()

    const base = 'w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-left transition-colors cursor-pointer'

    return (
        <div className="flex flex-col">
            <Link to="/configuracoes" onClick={onNavegar} className={`${base} text-text hover:bg-panel-2`}>
                <Settings size={16} className="text-muted" />
                Configurações
            </Link>

            {isAdmin && (
                <Link to="/admin" onClick={onNavegar} className={`${base} text-text hover:bg-panel-2`}>
                    <Shield size={16} className="text-muted" />
                    Painel Admin
                </Link>
            )}

            <div className="h-px bg-line my-1.5" />

            {/*
              Sair fica separado por uma linha e em coral de propósito: é a única
              ação irreversível da lista. Antes era um ícone sem rótulo colado nos
              botões de uso diário — o item mais fácil de acertar sem querer.
            */}
            <button
                type="button"
                onClick={() => { onNavegar(); sair() }}
                className={`${base} text-coral hover:bg-coral/10`}
            >
                <LogOut size={16} />
                Sair
            </button>
        </div>
    )
}