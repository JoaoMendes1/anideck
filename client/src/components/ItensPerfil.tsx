// client/src/components/ItensPerfil.tsx
// Só a LISTA de opções do menu de perfil. A moldura fica de fora: no desktop é
// um dropdown ancorado, no mobile é um Sheet. Duplicar estes três itens nas duas
// molduras garantiria que um dia eles divergissem.
import { Link } from 'react-router-dom'
import { Settings, Shield, LogOut } from 'lucide-react'
import { useSessao } from '../contexts/SessaoContext'
import { TEMAS, aplicarTema, useTema } from '../lib/temas'

export default function ItensPerfil({ onNavegar }: { onNavegar: () => void }) {
    const { isAdmin, sair } = useSessao()
    const temaAtivo = useTema()

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
              Troca de tema aqui além de em Configurações porque é a única
              preferência que se decide olhando a tela: abrir outra página para
              trocar tira de vista justamente o que se está comparando.
              Só as bolinhas, sem rótulo por tema — a página tem os nomes.
            */}
            <div className="px-4 py-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wide text-muted-2 mb-2">Tema</div>
                <div className="flex gap-2">
                    {TEMAS.map((tema) => (
                        <button
                            key={tema.id}
                            type="button"
                            onClick={() => aplicarTema(tema.id)}
                            title={tema.nome}
                            aria-label={`Tema ${tema.nome}`}
                            aria-pressed={tema.id === temaAtivo}
                            className={`h-7 w-7 rounded-full border-2 cursor-pointer transition-colors ${tema.id === temaAtivo ? 'border-holo-2' : 'border-line hover:border-muted-2'}`}
                            style={{ background: `linear-gradient(135deg, ${tema.cores[1]} 0%, ${tema.cores[3]} 100%)` }}
                        />
                    ))}
                </div>
            </div>

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