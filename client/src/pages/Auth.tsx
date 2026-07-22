import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Auth() {
  // Estados para controlar o que o usuário digita e o modo da tela
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  // Estados para controle de UI (carregamento e exibição de erros)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ferramenta do React Router para forçar a mudança de página após o login
  const navigate = useNavigate()

  // Função que dispara quando o usuário clica em "Entrar" ou "Criar conta"
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault() // Evita que a página recarregue (comportamento padrão do HTML)
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        // Tenta logar usando as credenciais do Supabase
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Deu certo? Manda pro painel principal
        navigate('/deck')
      } else {
        // Cria um novo usuário. Salvamos o "nome" dentro dos metadados brutos do Supabase.
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } }
        })
        if (error) throw error
        alert('Conta criada com sucesso! Você já pode fazer login.')
        setIsLogin(true) // Volta para a tela de login
      }
    } catch (err: any) {
      setError(err.message) // Exibe o erro do Supabase (ex: "Senha muito fraca") na tela
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 z-10">
      {/* O utilitário que criamos no index.css */}
      <div className="bg-ambient"></div>

      <div className="w-full max-w-sm z-10">
        {/* Cabeçalho da Marca traduzido do login-prototipo.html[cite: 1] */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-holo-1 via-holo-2 to-holo-3 flex items-center justify-center font-anton text-void text-lg">
            A
          </div>
          <div className="font-anton text-xl">
            Ani<span className="text-holo">Deck</span>
          </div>
        </div>

        {/* Painel do Formulário */}
        <div className="bg-panel border border-line rounded-[18px] p-8 shadow-2xl">
          <h1 className="font-anton text-2xl uppercase text-center mb-1">
            {isLogin ? 'Bem-vindo de volta' : 'Criar sua conta'}
          </h1>
          <p className="text-muted text-sm text-center mb-6">
            {isLogin ? 'Entre pra ver seu Deck.' : 'Leva menos de 1 minuto.'}
          </p>

          {error && (
            <div className="bg-coral/10 border border-coral/30 text-coral p-3 rounded-lg text-sm mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-muted mb-2">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-holo-3 transition-colors"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-muted mb-2">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-holo-3 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? 'Sua senha secreta' : 'Mínimo 6 caracteres'}
                className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-holo-3 transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl font-extrabold text-sm text-void bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar conta')}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-muted">
            {isLogin ? 'Ainda não tem conta? ' : 'Já tem conta? '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null) }}
              className="text-holo-3 font-bold hover:underline"
            >
              {isLogin ? 'Criar conta' : 'Entrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}