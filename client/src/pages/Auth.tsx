import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

export default function Auth() {
  const { showToast } = useToast()
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

  const [loadingGoogle, setLoadingGoogle] = useState(false)

    // Erro de OAuth não volta como resposta de API: vem na URL depois do
  // redirect. Lemos da query string, e não do hash, porque no hash o texto
  // chega codificado duas vezes e apareceria com lixo no meio.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const descricao = params.get('error_description')

    if (descricao) {
      setError(descricao)
      // Limpa a URL para o erro não reaparecer se a pessoa recarregar.
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const entrarComGoogle = async () => {
    setLoadingGoogle(true)
    setError(null)

    // Não devolve sessão: redireciona a página inteira para o Google.
    // Quem finaliza o login é o onAuthStateChange, na volta.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
            options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: { prompt: 'select_account' },
      },
    })

    if (error) {
      setError('Não foi possível conectar com o Google. Tente de novo.')
      setLoadingGoogle(false)
    }
  }

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
        showToast('Conta criada com sucesso! Você já pode fazer login.')
        setIsLogin(true) // Volta para a tela de login
      }
    } catch (err) {
      setError((err as Error).message) // Exibe o erro do Supabase (ex: "Senha muito fraca") na tela
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

          
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-line" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-2">ou</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <button
            type="button"
            onClick={entrarComGoogle}
            disabled={loadingGoogle || loading}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-extrabold text-sm border border-line bg-panel-2 hover:border-holo-3 transition-colors disabled:opacity-50"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3h3.87c2.27-2.09 3.56-5.17 3.56-8.74z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.1C3.26 21.3 7.3 24 12 24z" />
              <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.5-.38-2.29s.14-1.57.38-2.29V6.61H1.28A11.98 11.98 0 000 12c0 1.93.46 3.76 1.28 5.39l4-3.1z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.28 6.61l4 3.1c.95-2.86 3.6-4.96 6.73-4.96z" />
            </svg>
                        {loadingGoogle ? 'Redirecionando...' : 'Continuar com Google'}
          </button>

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