import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

export default function Navbar() {
    const [session, setSession] = useState<Session | null>(null)
    const [scrolled, setScrolled] = useState(false)
    const location = useLocation()

    // Gerencia o estado de Autenticação 
    useEffect(() => {
        supabase.auth.getSession().then(({ data: {session }}) => {
            setSession(session)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    // Gerencia do efeito de Scroll da Navbar
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleLogout= async () => {
        await supabase.auth.signOut()
    }

   return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'py-3 bg-void/85 backdrop-blur-md border-b border-line' : 'py-5 bg-transparent'
        }`}
      >
        <div className="max-w-[1140px] mx-auto px-5 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 z-50">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-holo-1 via-holo-2 to-holo-3 flex items-center justify-center font-anton text-void text-base">
              A
            </div>
            <div className="font-anton text-lg tracking-wide">
              Ani<span className="text-holo">Deck</span>
            </div>
          </Link>

         {/* Links Principais (Desktop) */}
          <div className="hidden md:flex items-center gap-7">
            {session && (
              <>
                <Link to="/deck" className={`text-sm font-bold focus:outline-none select-none transition-colors ${location.pathname === '/deck' ? 'text-text' : 'text-muted hover:text-text'}`}>Meu Deck</Link>
                
                {/* Proteção do Admin via Variável de Ambiente */}
                {session.user.id === import.meta.env.VITE_ADMIN_USER_ID && (
                    <Link to="/admin" className={`text-sm font-bold focus:outline-none select-none transition-colors ${location.pathname === '/admin' ? 'text-text' : 'text-muted hover:text-text'}`}>Admin</Link>
                )}
              </>
            )}
            <Link to="/rankings" className={`text-sm font-bold focus:outline-none select-none transition-colors ${location.pathname === '/rankings' ? 'text-text' : 'text-muted hover:text-text'}`}>Rankings</Link>
          </div>

          {/* Ações (Busca, Auth/User) */}
          <div className="hidden md:flex items-center gap-3.5">
            <Link to="/" className="w-9 h-9 rounded-full border border-line bg-panel text-muted flex items-center justify-center transition-all hover:border-holo-3 hover:text-holo-3" title="Buscar">
              <Search size={16} />
            </Link>

            {session ? (
              <div className="flex items-center gap-2.5 px-1.5 py-1.5 pr-3 rounded-full bg-panel border border-line">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-holo-2 to-holo-3 flex items-center justify-center text-void font-bold text-xs">
                  {session.user.user_metadata?.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-bold truncate max-w-[100px]">
                  {session.user.user_metadata?.display_name || 'Usuário'}
                </span>
                <button onClick={handleLogout} className="ml-2 text-muted hover:text-coral transition-colors" title="Sair">
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="px-5 py-2.5 rounded-full font-bold text-sm text-void bg-gradient-to-r from-holo-1 to-holo-3 hover:opacity-90 transition-opacity">
                Entrar
              </Link>
            )}
          </div>

        </div>
      </nav>
    </>
  )
}