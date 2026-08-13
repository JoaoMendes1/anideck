import { Link, useLocation } from 'react-router-dom'
import { Search, Trophy, LayoutDashboard, User, Settings, LogOut, CalendarDays, BarChart2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

export default function BottomNav() {
    const location = useLocation()
    const [session, setSession] = useState<Session | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)

    const verificarAdmin = async (currentSession: Session | null) => {
        if (!currentSession) {
            setIsAdmin(false)
            return
        }
        try {
            const res = await fetch('/api/admin/verify', {
                headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
            })
            setIsAdmin(res.ok)
        } catch {
            setIsAdmin(false)
        }
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session)
            verificarAdmin(data.session)
        })
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            verificarAdmin(session)
        })
        return () => subscription.unsubscribe()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
    }

    return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-md border-t border-line pb-safe">
      <div className="flex items-center justify-around h-16 px-1">
        <Link to="/descobrir" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === '/descobrir' ? 'text-holo-3' : 'text-muted'}`}>
          <Search size={18} />
          <span className="text-[9px] font-bold">Busca</span>
        </Link>

        {session && (
          <Link to="/calendario" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === '/calendario' ? 'text-holo-3' : 'text-muted'}`}>
            <CalendarDays size={18} />
            <span className="text-[9px] font-bold">Agenda</span>
          </Link>
        )}

        <Link to="/rankings" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === '/rankings' ? 'text-holo-3' : 'text-muted'}`}>
          <Trophy size={18} />
          <span className="text-[9px] font-bold">Rankings</span>
        </Link>

        {session ? (
          <>
            <Link to="/deck" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === '/deck' ? 'text-holo-3' : 'text-muted'}`}>
              <LayoutDashboard size={18} />
              <span className="text-[9px] font-bold">Deck</span>
            </Link>

            {/* AQUI ESTÁ O NOVO BOTÃO DE ESTATÍSTICAS */}
            <Link to="/estatisticas" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === '/estatisticas' ? 'text-holo-3' : 'text-muted'}`}>
              <BarChart2 size={18} />
              <span className="text-[9px] font-bold">Stats</span>
            </Link>

            {isAdmin && (
                <Link to="/admin" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === '/admin' ? 'text-holo-3' : 'text-muted'}`}>
                  <Settings size={18} />
                  <span className="text-[9px] font-bold">Admin</span>
                </Link>
            )}

            <button onClick={handleLogout} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted cursor-pointer hover:text-coral transition-colors focus:outline-none select-none">
              <LogOut size={18} />
              <span className="text-[9px] font-bold">Sair</span>
            </button>
          </>
        ) : (
          <Link to="/login" className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted focus:outline-none select-none">
            <div className="w-5 h-5 rounded-full border border-line flex items-center justify-center bg-panel"><User size={12} /></div>
            <span className="text-[9px] font-bold">Entrar</span>
          </Link>
        )}
      </div>
    </div>
  )
}