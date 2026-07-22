import { createClient } from '@supabase/supabase-js'

// 1. Buscamos as variáveis que acabamos de definir no .env.local
// O "import.meta.env" é a forma como o Vite acessa variáveis de ambiente

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 2. Validação fail-fast: Se esquecermos de colocar as chaves no .env,
// o React avisa na hora, em vez de quebrar silenciosamente depois.
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltam as variáveis de ambiente do Supabase no frontend.")
} 

// 3. Exportando a conexão ativa.
// Qualquer componente React agora pode importar o 'supabase' e fazer buscas ou logins.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)