// client/src/lib/comunidade.ts
// Tipos e regras puras da comunidade (Fase 15 e 17.4): perfil público, Mana, Vitalidade,
// classes de RPG e conversa por episódio. O que decide permissão mora no banco (sql/041 e sql/061);
// aqui só se formata e se valida antes de enviar, para a mensagem de erro sair clara.
import type { Especialidade, EspecialistaGenero } from './guilda'

export interface RegrasComunidade {
  mp_max: number
  mp_por_nivel?: number
  mp_max_teto?: number
  mp_regen_dia: number
  mp_custo_comentario: number
  hp_janela_dias: number
  hp_dias_para_cheio: number
  hp_piso: number
  descanso_max_dias: number
  previsoes_ativas?: boolean
}

export const REGRAS_COMUNIDADE_PADRAO: RegrasComunidade = {
  mp_max: 50,
  mp_por_nivel: 1,
  mp_max_teto: 120,
  mp_regen_dia: 20,
  mp_custo_comentario: 5,
  hp_janela_dias: 14,
  hp_dias_para_cheio: 7,
  hp_piso: 20,
  descanso_max_dias: 14,
  previsoes_ativas: true,
}

export interface PerfilProprio {
  existe: boolean
  handle: string
  nome: string
  bio: string
  vitrine: number[]
  publico: boolean
  descanso_inicio: string
  descanso_fim: string
  titulo_ativo?: string
  titulos_desbloqueados?: string[]
  /** Mostra no perfil e no Feed o que assiste, comenta e curte (padrão: sim). */
  mostrar_atividade?: boolean
}

export interface EstadoComunidade {
  perfil: PerfilProprio
  mana: number
  hp: number
  mp_max_jogador?: number
  hp_max_jogador?: number
  regras: RegrasComunidade
  em_descanso: boolean
}

/** Calcula a Mana máxima do jogador a partir do nível e das regras (sql/079). */
export function calcularManaMaximaJogador(nivel: number, regras: RegrasComunidade): number {
  const base = Math.max(1, regras.mp_max || 50)
  const porNivel = Math.max(0, regras.mp_por_nivel ?? 1)
  const teto = Math.max(base, regras.mp_max_teto ?? 120)
  const nv = Math.max(1, Math.floor(nivel || 1))
  return Math.min(teto, base + porNivel * (nv - 1))
}

/** Calcula o teto de Vitalidade do jogador para o nível atual (100 + 5*(nivel-1), até 400). */
export function calcularHPMaximoJogador(nivel: number): number {
  const nv = Math.max(1, Math.floor(nivel || 1))
  return Math.min(400, 100 + 5 * (nv - 1))
}

/** Resolve o teto de Mana do estado, com fallback para o nível ou mp_max da regra. */
export function obterMPMaxDoEstado(estado: EstadoComunidade, nivel = 1): number {
  if (estado.mp_max_jogador && estado.mp_max_jogador > 0) {
    return estado.mp_max_jogador
  }
  return calcularManaMaximaJogador(nivel, estado.regras)
}

/** Resolve a Vitalidade escalada (atual e máxima) mantendo estado.hp como 0..100%. */
export function obterHPEscaladoDoEstado(
  estado: EstadoComunidade,
  nivel = 1,
): { atual: number; maximo: number; pct: number } {
  const maximo =
    estado.hp_max_jogador && estado.hp_max_jogador > 0
      ? estado.hp_max_jogador
      : calcularHPMaximoJogador(nivel)
  const pct = Math.min(100, Math.max(0, estado.hp))
  const atual = Math.round((pct * maximo) / 100)
  return { atual, maximo, pct }
}

export interface ContagemEpisodio {
  episode_number: number
  comentarios: number
  reacoes: Record<string, number>
}

export interface AutorDoComentario {
  handle: string
  nome: string
  moldura?: string
  /** Avatar salvo (fundo e formato) e estágio do personagem, para o retrato. */
  avatar?: unknown
  estagio?: string
  cor_nome?: string
  tema_perfil?: string
  emblema?: string
  cla_tag?: string
  cla_nome?: string
  cla_papel?: string
  titulo_ativo?: string
}

export interface RecordesRPGPublicos {
  vitorias: number
  monstros_derrotados: number
  lendarios: number
  maior_aprimoramento: number
}

export interface ComentarioDaConversa {
  id: string
  autor: AutorDoComentario
  texto: string
  momento_seg: number | null
  origem?: string
  contem_spoiler?: boolean
  created_at: string
  editado_em: string | null
  curtidas: number
  curtido_por_mim: boolean
  meu: boolean
  oculto: boolean
}

export interface ConversaDoEpisodio {
  assistiu: boolean
  minhas_reacoes: string[]
  comentarios: ComentarioDaConversa[]
}

export interface MembroNoRanking {
  posicao: number
  handle: string
  nome: string
  xp: number
  nivel: number
  rank: string
  titulo_rank: string
  moldura?: string
  /** Avatar salvo (fundo e formato) e estágio do personagem, para o retrato. */
  avatar?: unknown
  estagio?: string
  /** Personagem do elenco; ausente é o padrão. */
  personagem_base?: string
  cor_nome?: string
  tema_perfil?: string
  emblema?: string
  cla_tag?: string
  cla_nome?: string
  cla_papel?: string
  titulo_ativo?: string
}

export interface PerfilPublico {
  handle: string
  nome: string
  bio: string
  vitrine: number[]
  membro_desde: string
  xp_total: number
  episodios_vistos: number
  comentarios: number
  status: Record<string, number>
  nivel: number
  rank: string
  titulo_rank: string
  hp: number
  moldura?: string
  /** Avatar salvo (fundo e formato) e estágio do personagem, para o retrato. */
  avatar?: unknown
  estagio?: string
  /** Personagem do elenco; ausente é o padrão. */
  personagem_base?: string
  cor_nome?: string
  tema_perfil?: string
  emblema?: string
  cla_tag?: string
  cla_nome?: string
  cla_papel?: string
  titulo_ativo?: string
  /** Gêneros com nível de Especialista; vazio antes do sql/089. */
  generos?: EspecialistaGenero[]
  especialidade?: Especialidade | null
  horas_assistidas?: number
  missoes_concluidas?: number
  rpg?: RecordesRPGPublicos
}

/**
 * Reações aceitas pelo banco (sql/043 e reacoesValidas no Go), na ordem em que a tela
 * mostra. Cada uma traz a cor da fatia no termômetro (classe inteira, por causa do
 * Tailwind) e o veredito quando ela lidera. Só emoji anteriores ao Unicode 14, que
 * aparecem até no Windows 10 e em celulares antigos.
 */
export const REACOES = [
  { id: 'chorei', emoji: '😭', rotulo: 'Chorei', cor: 'bg-holo-3', veredito: 'fez a comunidade chorar' },
  { id: 'hype', emoji: '🔥', rotulo: 'Hype', cor: 'bg-coral', veredito: 'deixou todo mundo no hype' },
  { id: 'plot_twist', emoji: '🤯', rotulo: 'Plot twist', cor: 'bg-holo-1', veredito: 'virou a história de cabeça para baixo' },
  { id: 'luta', emoji: '⚔️', rotulo: 'Luta épica', cor: 'bg-gold', veredito: 'entregou uma luta épica' },
  { id: 'animacao', emoji: '✨', rotulo: 'Animação absurda', cor: 'bg-holo-2', veredito: 'brilhou na animação' },
  { id: 'trilha', emoji: '🎵', rotulo: 'Trilha sonora', cor: 'bg-holo-3/60', veredito: 'marcou pela trilha sonora' },
  { id: 'engracado', emoji: '😂', rotulo: 'Engraçado', cor: 'bg-green', veredito: 'arrancou risadas' },
  { id: 'fofo', emoji: '🥰', rotulo: 'Fofura', cor: 'bg-holo-1/60', veredito: 'derreteu corações' },
  { id: 'shippo', emoji: '💘', rotulo: 'Shippo', cor: 'bg-holo-1/80', veredito: 'fez a comunidade shippar' },
  { id: 'tenso', emoji: '😰', rotulo: 'Tenso', cor: 'bg-coral/70', veredito: 'deixou todo mundo tenso' },
  { id: 'medo', emoji: '😱', rotulo: 'Medo', cor: 'bg-holo-2/60', veredito: 'deu medo de verdade' },
  { id: 'raiva', emoji: '😡', rotulo: 'Raiva', cor: 'bg-coral/50', veredito: 'deixou a comunidade com raiva' },
  { id: 'genial', emoji: '🧠', rotulo: 'Genial', cor: 'bg-green/60', veredito: 'foi genial' },
  { id: 'gancho', emoji: '⁉️', rotulo: 'Que gancho', cor: 'bg-gold/60', veredito: 'terminou num gancho daqueles' },
  { id: 'vergonha', emoji: '😬', rotulo: 'Vergonha alheia', cor: 'bg-muted', veredito: 'deu vergonha alheia' },
  { id: 'enrolacao', emoji: '💤', rotulo: 'Enrolação', cor: 'bg-muted-2', veredito: 'foi considerado enrolação' },
] as const

export const MOTIVOS_DENUNCIA = [
  { id: 'spoiler', rotulo: 'Spoiler de episódio futuro' },
  { id: 'ofensa', rotulo: 'Ofensa ou assédio' },
  { id: 'spam', rotulo: 'Spam ou propaganda' },
  { id: 'outro', rotulo: 'Outro motivo' },
] as const

export const MAX_TEXTO_COMENTARIO = 1000
export const MAX_BIO = 160

// Só a equipe grava estes @ (Go e sql/042 repetem a lista), por isso eles valem como selo.
const RESERVADOS = new Set([
  'admin', 'administrador', 'anideck', 'moderacao', 'moderador',
  'suporte', 'sistema', 'curadoria', 'ranking', 'eu',
])

/**
 * Mesmo critério do Go (normalizarHandle): devolve o @ limpo ou a mensagem de recusa.
 * Nome reservado só passa para a equipe; o servidor confere de novo pelo token.
 */
export function validarHandle(bruto: string, daEquipe = false): { handle: string; erro: string | null } {
  const handle = bruto.trim().replace(/^@/, '').trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
    return { handle, erro: 'O @ usa de 3 a 20 caracteres: letras minúsculas, números e _.' }
  }
  if (RESERVADOS.has(handle) && !daEquipe) return { handle, erro: 'Esse @ é reservado. Escolha outro.' }
  return { handle, erro: null }
}

/** @ reservado é da equipe: o banco não deixa outra conta gravá-lo. */
export function ehDaEquipe(handle: string | null | undefined): boolean {
  return !!handle && RESERVADOS.has(handle.toLowerCase())
}

/** Sugestão de @ a partir do nome de exibição: sem acento, minúsculo, só [a-z0-9_]. */
export function sugerirHandle(nome: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20)
  return base.length >= 3 ? base : ''
}

/** 125 → "2:05"; 3725 → "1:02:05". */
export function formatarMomento(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const resto = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${resto}` : `${m}:${resto}`
}

/**
 * Lê o minuto digitado ("12", "12:30", "1:02:05") em segundos.
 * Vazio é "sem minuto" (null); formato inválido devolve NaN.
 */
export function lerMomento(texto: string): number | null {
  const t = texto.trim()
  if (t === '') return null
  if (!/^\d{1,3}(:\d{1,2}){0,2}$/.test(t)) return NaN
  const partes = t.split(':').map(Number)
  if (partes.slice(1).some(p => p > 59)) return NaN
  const total =
    partes.length === 1 ? partes[0] * 60 : partes.length === 2 ? partes[0] * 60 + partes[1] : partes[0] * 3600 + partes[1] * 60 + partes[2]
  return total > 3 * 3600 ? NaN : total
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias" e, depois de uma semana, a data. */
export function tempoRelativo(iso: string, agora: number): string {
  const instante = new Date(iso).getTime()
  if (Number.isNaN(instante)) return ''
  const seg = Math.max(0, Math.round((agora - instante) / 1000))
  if (seg < 60) return 'agora'
  const min = Math.floor(seg / 60)
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const dias = Math.floor(h / 24)
  if (dias < 7) return dias === 1 ? 'há 1 dia' : `há ${dias} dias`
  return new Date(instante).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Último episódio que já pode ter conversa: o anterior ao próximo a lançar, ou o total.
 * Sem total conhecido, o maior episódio que a pessoa marcou.
 */
export function ultimoEpisodioDisponivel(total: number, proximoAoAr: number | undefined, assistidos: number[]): number {
  const validos = assistidos.filter(n => Number.isInteger(n) && n > 0)
  const maiorAssistido = validos.length > 0 ? Math.max(...validos) : 0
  let limite = total > 0 ? total : 0
  if (proximoAoAr && proximoAoAr > 1) limite = limite > 0 ? Math.min(limite, proximoAoAr - 1) : proximoAoAr - 1
  return Math.max(limite, maiorAssistido)
}

/**
 * Episódio aberto ao entrar: o mais recente assistido (é o que a pessoa acabou de ver);
 * sem nenhum, o mais comentado; sem conversa, o primeiro.
 */
export function episodioInicial(assistidos: number[], contagens: ContagemEpisodio[]): number {
  const validos = assistidos.filter(n => Number.isInteger(n) && n > 0)
  if (validos.length > 0) return Math.max(...validos)
  const maisComentado = [...contagens].sort((a, b) => b.comentarios - a.comentarios)[0]
  return maisComentado && maisComentado.comentarios > 0 ? maisComentado.episode_number : 1
}

/** Soma das reações de um episódio, para o selo do seletor. */
export function totalDeReacoes(c: ContagemEpisodio | undefined): number {
  if (!c) return 0
  return Object.values(c.reacoes ?? {}).reduce((soma, n) => soma + n, 0)
}

/** Faixa da Vitalidade para cor e frase. */
export function faixaDoHP(hp: number): 'cheio' | 'bom' | 'baixo' {
  if (hp >= 90) return 'cheio'
  if (hp >= 50) return 'bom'
  return 'baixo'
}

export interface FatiaDoClima {
  id: string
  emoji: string
  rotulo: string
  cor: string
  veredito: string
  n: number
  pct: number
}

/**
 * Como a comunidade sentiu o episódio: as reações com voto, da mais escolhida para a
 * menos, com a porcentagem de cada uma. Alimenta a barra do termômetro.
 */
export function climaDoEpisodio(reacoes: Record<string, number> | undefined): { total: number; fatias: FatiaDoClima[] } {
  const fatias: FatiaDoClima[] = REACOES.map(r => ({ id: r.id, emoji: r.emoji, rotulo: r.rotulo, cor: r.cor, veredito: r.veredito, n: Math.max(0, reacoes?.[r.id] ?? 0), pct: 0 })).filter(f => f.n > 0)
  const total = fatias.reduce((s, f) => s + f.n, 0)
  for (const f of fatias) f.pct = total > 0 ? Math.round((f.n / total) * 100) : 0
  fatias.sort((a, b) => b.n - a.n)
  return { total, fatias }
}
