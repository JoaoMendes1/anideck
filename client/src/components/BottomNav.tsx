import { Link, useLocation } from 'react-router-dom'
import { Search, Trophy, LayoutDashboard, User, CalendarDays, BarChart2 } from 'lucide-react'
import { useState } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import Sheet from './Sheet'
import ItensPerfil from './ItensPerfil'

export default function BottomNav() {
    const location = useLocation()
    const { session } = useSessao()
    const [menuAberto, setMenuAberto] = useState(false)

    const itemClasse = (rota: string) =>
        `flex flex-col items-center justify-center w-full h-full space-y-1 ${
            location.pathname === rota ? 'text-holo-3' : 'text-muted'
        }`

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-md border-t border-line pb-safe">
            <div className="flex items-center justify-around h-16 px-1">

                {/* Deslogado a busca fica aqui mesmo: sem ela a barra teria só dois
                    itens, e quem não tem conta está no site justamente pra procurar
                    anime. Logado, ela vira o botão flutuante do Layout e some daqui. */}
                {!session && (
                    <Link to="/descobrir" className={itemClasse('/descobrir')}>
                        <Search size={18} />
                        <span className="text-[9px] font-bold">Busca</span>
                    </Link>
                )}

                <Link to="/rankings" className={itemClasse('/rankings')}>
                    <Trophy size={18} />
                    <span className="text-[9px] font-bold">Rankings</span>
                </Link>

                {session ? (
                    <>
                        <Link to="/calendario" className={itemClasse('/calendario')}>
                            <CalendarDays size={18} />
                            <span className="text-[9px] font-bold">Agenda</span>
                        </Link>

                        <Link to="/deck" className={itemClasse('/deck')}>
                            <LayoutDashboard size={18} />
                            <span className="text-[9px] font-bold">Deck</span>
                        </Link>

                        <Link to="/estatisticas" className={itemClasse('/estatisticas')}>
                            <BarChart2 size={18} />
                            <span className="text-[9px] font-bold">Stats</span>
                        </Link>

                        {/* Admin e Sair saíram da barra e foram pro Sheet de Perfil.
                            Sair era o item mais fácil de acertar sem querer: ação
                            irreversível num alvo pequeno, colada nos botões de uso
                            diário. */}
                        <button
                            onClick={() => setMenuAberto(true)}
                            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted cursor-pointer focus:outline-none select-none"
                        >
                            <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-holo-2 to-holo-3 flex items-center justify-center text-void font-bold text-[9px]">
                                {(session.user.user_metadata?.display_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[9px] font-bold">Perfil</span>
                        </button>
                    </>
                ) : (
                    <Link to="/login" className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted focus:outline-none select-none">
                        <div className="w-5 h-5 rounded-full border border-line flex items-center justify-center bg-panel"><User size={12} /></div>
                        <span className="text-[9px] font-bold">Entrar</span>
                    </Link>
                )}
            </div>

            {/* -mx-6 cancela o p-6 do Sheet pros itens ocuparem a largura toda,
                como num menu de app nativo. */}
            <Sheet isOpen={menuAberto} onClose={() => setMenuAberto(false)} title="Perfil">
                <div className="-mx-6 -mb-2">
                    <ItensPerfil onNavegar={() => setMenuAberto(false)} />
                </div>
            </Sheet>
        </div>
    )
}