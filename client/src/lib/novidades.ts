// client/src/lib/novidades.ts
// Novidades do AniDeck (sql/115): o admin publica, o jogador vê no aviso central e na
// página /novidades. As regras de quem vê o quê ficam no banco.
import { supabase } from './supabase'

export type CategoriaNovidade = 'novidade' | 'correcao' | 'layout' | 'balanceamento'

export interface LinkNovidade {
  rotulo: string
  caminho: string
}

export interface Novidade {
  id: string
  titulo: string
  resumo: string
  categoria: CategoriaNovidade
  links: LinkNovidade[]
  publicado_em: string
  no_meio_da_tela: boolean
  ativo: boolean
  /** Veio pronta com a entrega e ainda não foi publicada (sql/116). */
  rascunho: boolean
  /** Na lixeira desde quando; nulo fora dela (sql/117). */
  apagada_em: string | null
}

export const ROTULO_CATEGORIA: Record<CategoriaNovidade, string> = {
  novidade: 'Novidade',
  correcao: 'Correção de bug',
  layout: 'Layout',
  balanceamento: 'Balanceamento',
}

/** Classes escritas por extenso: o Tailwind não gera classe interpolada. */
export const COR_CATEGORIA: Record<CategoriaNovidade, string> = {
  novidade: 'bg-holo-1/15 text-holo-1 border-holo-1/40',
  correcao: 'bg-coral/15 text-coral border-coral/40',
  layout: 'bg-mana/15 text-mana border-mana/40',
  balanceamento: 'bg-gold/15 text-gold border-gold/40',
}

/** "17/11/2026 às 21:45", no fuso de Brasília, como o resto do site. */
export function dataHoraDaNovidade(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', ...o })
  return `${fmt({ day: '2-digit', month: '2-digit', year: 'numeric' })} às ${fmt({ hour: '2-digit', minute: '2-digit' })}`
}

/** Só caminho interno: evita que um link de novidade leve para fora do site. */
export function caminhoInterno(caminho: string): boolean {
  const c = caminho.trim()
  return c.startsWith('/') && !c.startsWith('//')
}

function normalizar(bruto: Partial<Novidade>): Novidade {
  return {
    id: String(bruto.id ?? ''),
    titulo: bruto.titulo ?? '',
    resumo: bruto.resumo ?? '',
    categoria: (bruto.categoria ?? 'novidade') as CategoriaNovidade,
    links: Array.isArray(bruto.links) ? bruto.links.filter(l => l && caminhoInterno(l.caminho ?? '')) : [],
    publicado_em: bruto.publicado_em ?? '',
    no_meio_da_tela: Boolean(bruto.no_meio_da_tela),
    ativo: bruto.ativo !== false,
    rascunho: Boolean(bruto.rascunho),
    apagada_em: bruto.apagada_em ?? null,
  }
}

export async function listarNovidades(limite = 50): Promise<Novidade[]> {
  const { data, error } = await supabase
    .from('novidades')
    .select('id,titulo,resumo,categoria,links,publicado_em,no_meio_da_tela,ativo,rascunho,apagada_em')
    .order('publicado_em', { ascending: false })
    .limit(limite)
  if (error || !Array.isArray(data)) return []
  return data.map(normalizar)
}

export async function novidadesNaoVistas(): Promise<Novidade[]> {
  const { data, error } = await supabase.rpc('novidades_nao_vistas')
  if (error || !Array.isArray(data)) return []
  return data.map(normalizar)
}

export async function marcarVistas(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await supabase.rpc('marcar_novidades_vistas', { p_ids: ids })
}

export interface RascunhoNovidade {
  id: string | null
  titulo: string
  resumo: string
  categoria: CategoriaNovidade
  links: LinkNovidade[]
  publicado_em: string
  no_meio_da_tela: boolean
  ativo: boolean
}

/** Mensagem de erro em português, ou null se o rascunho pode ir ao banco. */
export function validarRascunho(r: RascunhoNovidade): string | null {
  if (r.titulo.trim().length < 3) return 'O título precisa de pelo menos 3 letras.'
  if (r.resumo.trim().length < 3) return 'Escreva o que mudou.'
  const links = r.links.filter(l => l.rotulo.trim() || l.caminho.trim())
  if (links.length > 6) return 'No máximo 6 caminhos.'
  for (const l of links) {
    if (!l.rotulo.trim()) return 'Todo caminho precisa de um nome, como "Ver Expedições".'
    if (!caminhoInterno(l.caminho)) return `O caminho "${l.caminho}" precisa começar com /, como /expedicoes.`
  }
  if (r.publicado_em && Number.isNaN(new Date(r.publicado_em).getTime())) return 'Data e hora inválidas.'
  return null
}

export async function salvarNovidade(r: RascunhoNovidade): Promise<{ ok: true } | { ok: false; erro: string }> {
  const erro = validarRascunho(r)
  if (erro) return { ok: false, erro }
  const { error } = await supabase.rpc('salvar_novidade', {
    p_id: r.id,
    p_titulo: r.titulo,
    p_resumo: r.resumo,
    p_categoria: r.categoria,
    p_links: r.links.filter(l => l.rotulo.trim() || l.caminho.trim()),
    p_publicado_em: r.publicado_em ? new Date(r.publicado_em).toISOString() : null,
    p_no_meio_da_tela: r.no_meio_da_tela,
    p_ativo: r.ativo,
  })
  if (error) return { ok: false, erro: error.message || 'Não foi possível salvar.' }
  return { ok: true }
}

export async function apagarNovidade(id: string): Promise<boolean> {
  const { error } = await supabase.rpc('apagar_novidade', { p_id: id })
  return !error
}

export async function restaurarNovidade(id: string): Promise<boolean> {
  const { error } = await supabase.rpc('restaurar_novidade', { p_id: id })
  return !error
}

export async function alcanceDasNovidades(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('novidades_alcance')
  if (error || !Array.isArray(data)) return {}
  const mapa: Record<string, number> = {}
  for (const linha of data as { novidade_id: string; vistas: number }[]) mapa[linha.novidade_id] = Number(linha.vistas) || 0
  return mapa
}

/** Valor para <input type="datetime-local"> a partir de uma data, no horário do aparelho. */
export function paraCampoDataHora(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
