// client/src/contexts/SessaoContext.tsx
// Um lugar só pra responder "quem está logado e é admin?".
// Antes, Navbar e BottomNav faziam essa pergunta separadamente, cada um com
// sua cópia do useEffect e sua chamada a /api/admin/verify.
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Sessao = {
    session: Session | null
    isAdmin: boolean
    /** True até a primeira resposta do Supabase. Enquanto isso, ninguém decide nada. */
    carregando: boolean
    sair: () => Promise<void>
}

const SessaoContext = createContext<Sessao>({
    session: null,
    isAdmin: false,
    carregando: true,
    sair: async () => {},
})

export function SessaoProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [carregando, setCarregando] = useState(true)

    // Guarda o id do último usuário já verificado. O onAuthStateChange dispara
    // também em refresh de token, que o Supabase faz sozinho de tempos em tempos.
    // Sem essa trava, cada refresh geraria uma chamada nova a /api/admin/verify —
    // trocaríamos duas requisições fixas por uma fila delas ao longo da sessão.
    const idVerificado = useRef<string | null>(null)

    useEffect(() => {
        // Evita setState depois que o provider desmontou, o que o React acusa
        // como vazamento. As respostas do fetch e do getSession são assíncronas
        // e podem chegar depois.
        let ativo = true

        const verificarAdmin = async (s: Session | null) => {
            if (!s) {
                idVerificado.current = null
                if (ativo) setIsAdmin(false)
                return
            }
            if (idVerificado.current === s.user.id) return
            idVerificado.current = s.user.id

            try {
                const res = await fetch('/api/admin/verify', {
                    headers: { Authorization: `Bearer ${s.access_token}` },
                })
                if (ativo) setIsAdmin(res.ok)
            } catch {
                if (ativo) setIsAdmin(false)
            }
        }

        supabase.auth.getSession().then(({ data }) => {
            if (!ativo) return
            setSession(data.session)
            setCarregando(false)
            verificarAdmin(data.session)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
            if (!ativo) return
            setSession(novaSessao)
            setCarregando(false)
            verificarAdmin(novaSessao)
        })

        return () => {
            ativo = false
            subscription.unsubscribe()
        }
    }, [])

    const sair = useCallback(async () => {
        await supabase.auth.signOut()
    }, [])

    // useMemo evita recriar o objeto a cada render, o que forçaria todas as
    // telas que consomem o contexto a re-renderizar sem necessidade.
    const valor = useMemo(
        () => ({ session, isAdmin, carregando, sair }),
        [session, isAdmin, carregando, sair]
    )

    return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>
}

// Provider e hook juntos é o padrão dos contextos deste projeto; separar só melhoraria
// o hot reload e exigiria atualizar imports em todo o app.
// eslint-disable-next-line react-refresh/only-export-components
export function useSessao() {
    return useContext(SessaoContext)
}