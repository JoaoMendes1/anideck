// client/src/lib/cartas.ts
// Tipos e estilos estáticos para o sistema de Cartas e Coleção (Fase 16, #172, #173 e #174).
// PITFALLS 17: Nenhuma classe Tailwind montada por interpolação de strings.

export interface CartaColecao {
  id: string
  mal_id: number
  titulo: string
  imagem_url: string
  raridade: 'comum' | 'rara' | 'rarissima' | 'lendaria'
  is_foil: boolean
  estreia: boolean
  nota: number
  obtida_em: string
}

export interface PersonagemFavorito {
  id: string
  character_id: number
  mal_id: number
  nome: string
  imagem_url: string
  papel: string
  criado_em: string
}

export interface DueloResultado {
  handle_a: string
  nome_a: string
  handle_b: string
  nome_b: string
  afinidade: number
  obras_em_comum: number
  concordancia_notas: number
  genero_que_une: string
  genero_que_separa: string
}

export const ESTILOS_RARIDADE_CARTA: Record<
  string,
  {
    borda: string
    badge: string
    textoBadge: string
    nomeLegivel: string
  }
> = {
  comum: {
    borda: 'border-line/70 hover:border-line-2',
    badge: 'bg-panel-2/90 border-line text-muted',
    textoBadge: 'text-muted',
    nomeLegivel: 'Comum',
  },
  rara: {
    borda: 'border-sky-500/50 hover:border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.25)]',
    badge: 'bg-sky-500/20 border-sky-500/40 text-sky-400',
    textoBadge: 'text-sky-400',
    nomeLegivel: 'Rara',
  },
  rarissima: {
    borda: 'border-purple-500/60 hover:border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.35)]',
    badge: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
    textoBadge: 'text-purple-300',
    nomeLegivel: 'Raríssima',
  },
  lendaria: {
    borda: 'border-amber-400/70 hover:border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.45)]',
    badge: 'bg-amber-400/20 border-amber-400/50 text-amber-300',
    textoBadge: 'text-amber-300',
    nomeLegivel: 'Lendária',
  },
}

export const CLASSE_FOIL =
  'relative overflow-hidden ring-2 ring-amber-400/70 shadow-[0_0_25px_rgba(251,191,36,0.4)] before:absolute before:inset-0 before:bg-gradient-to-tr before:from-transparent before:via-white/20 before:to-transparent before:pointer-events-none before:z-10'
