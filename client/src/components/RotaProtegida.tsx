import { Navigate } from 'react-router-dom'
import { useSessao } from '../contexts/SessaoContext'

export default function RotaProtegida({ children }: { children: React.ReactNode }) {

    const { session, carregando } = useSessao()

    if (carregando) {
        return <div className="p-10 text-center text-muted font-mono text-sm">Carregando...</div>
    }

    if (!session) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}