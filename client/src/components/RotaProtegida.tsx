import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export default function RotaProtegida({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [carregando, setCarregando] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setCarregando(false)
        })
    }, [])

    if (carregando) {
        return <div className="p-10 text-center text-muted font-mono text-sm">Carregando...</div>
    }

    if (!session) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}