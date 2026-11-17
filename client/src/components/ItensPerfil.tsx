// client/src/components/ItensPerfil.tsx
// Conteúdo do menu do avatar (dropdown no desktop, Sheet no celular). A moldura fica de
// fora. Os itens vêm de lib/navegacao.ts, a mesma fonte do menu lateral: no desktop com
// menu lateral (xl para cima) a navegação some daqui e só a conta fica, para não repetir.
import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useSessao } from '../contexts/SessaoContext'
import { useComunidade } from '../hooks/useComunidade'
import { TEMAS, aplicarTema, useTema } from '../lib/temas'
import { ROTULO_MEU_PERFIL, itensDaConta, montarMenu, type ItemDoMenu } from '../lib/navegacao'
import { preCarregarRota } from '../lib/rotasPreguicosas'

interface Props {
    onNavegar: () => void
    /** No dropdown do desktop, a navegação fica escondida quando o menu lateral aparece. */
    comMenuLateral?: boolean
}

const base = 'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-left transition-colors cursor-pointer'

function LinhaDoItem({ item, onNavegar, comSubitens }: { item: ItemDoMenu; onNavegar: () => void; comSubitens?: boolean }) {
    const { Icone } = item
    return (
        <>
            <Link
                to={item.para}
                onClick={onNavegar}
                onMouseEnter={() => preCarregarRota(item.para)}
                onFocus={() => preCarregarRota(item.para)}
                className={`${base} text-text hover:bg-panel-2`}
            >
                <Icone size={16} className={item.cor} aria-hidden />
                {item.rotulo}
            </Link>
            {comSubitens && (item.subitens?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-11 pr-4 pb-2" aria-label={`Atalhos de ${item.rotulo}`}>
                    {item.subitens!.map((sub) => (
                        <Link
                            key={sub.para}
                            to={sub.para}
                            onClick={onNavegar}
                            onTouchStart={() => preCarregarRota(sub.para)}
                            className="px-2.5 py-1 rounded-full border border-line bg-panel-2/60 text-xs font-semibold text-muted hover:text-text hover:border-holo-3 transition-colors"
                        >
                            {sub.rotulo}
                        </Link>
                    ))}
                </div>
            )}
        </>
    )
}

export default function ItensPerfil({ onNavegar, comMenuLateral = false }: Props) {
    const { isAdmin, sair } = useSessao()
    const { estado } = useComunidade()
    const temaAtivo = useTema()
    const perfil = estado?.perfil
    const handle = perfil?.existe && perfil.publico ? perfil.handle : ''
    const conta = itensDaConta({ handle })
    // Meu Perfil já está na conta, logo acima: sai da lista de navegação.
    const grupos = montarMenu({ handle, isAdmin })
        .map((g) => ({ ...g, itens: g.itens.filter((i) => i.rotulo !== ROTULO_MEU_PERFIL) }))
        .filter((g) => g.itens.length > 0)

    return (
        <div className="flex flex-col">
            {conta.map((item) => <LinhaDoItem key={item.rotulo} item={item} onNavegar={onNavegar} />)}

            <div className={comMenuLateral ? 'xl:hidden' : ''}>
                {grupos.map((g) => (
                    <div key={g.titulo}>
                        <div className="h-px bg-line my-1.5" />
                        <div className="px-4 pt-1.5 pb-1 font-mono text-xs font-bold tracking-[0.16em] text-muted-2">{g.titulo}</div>
                        {g.itens.map((item) => (
                            <LinhaDoItem key={item.rotulo} item={item} onNavegar={onNavegar} comSubitens={!comMenuLateral} />
                        ))}
                    </div>
                ))}
            </div>

            <div className="h-px bg-line my-1.5" />

            {/*
              Troca de tema aqui além de em Configurações porque é a única
              preferência que se decide olhando a tela: abrir outra página para
              trocar tira de vista justamente o que se está comparando.
              Só as bolinhas, sem rótulo por tema — a página tem os nomes.
            */}
            <div className="px-4 py-2.5">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-2 mb-2">Tema</div>
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
