// client/src/lib/personagem.ts
// Tipos, chamadas e regras de apresentação da tela Meu Personagem (Fase 18.1).
//
// A arte nunca vem da API. O servidor diz qual é o personagem e o estágio; a escolha
// do arquivo acontece aqui. Trocar uma ilustração, ou mudar onde elas ficam guardadas,
// não mexe em regra de jogo.
import { supabase } from './supabase'
import arteIniciante from '../assets/personagem/espadachim-eter-iniciante.webp'
import arteAventureiro from '../assets/personagem/espadachim-eter-aventureiro.webp'
import arteLendario from '../assets/personagem/espadachim-eter-lendario.webp'
import miniIniciante from '../assets/personagem/espadachim-eter-iniciante-mini.webp'
import miniAventureiro from '../assets/personagem/espadachim-eter-aventureiro-mini.webp'
import miniLendario from '../assets/personagem/espadachim-eter-lendario-mini.webp'
import retratoIniciante from '../assets/personagem/espadachim-eter-iniciante-retrato.webp'
import retratoAventureiro from '../assets/personagem/espadachim-eter-aventureiro-retrato.webp'
import retratoLendario from '../assets/personagem/espadachim-eter-lendario-retrato.webp'

export interface EstagioRPG {
  id: string
  nome: string
  nivel_minimo: number
}

export interface EstagioStatusRPG extends EstagioRPG {
  alcancado: boolean
}

export interface IdentidadePersonagem {
  nome: string
  personagem_base: string
  classe: string
  elemento: string
  criado_em: string
}

export interface ProgressaoPersonagem {
  nivel: number
  xp_total: number
  xp_no_nivel: number
  xp_para_proximo: number
  progresso_pct: number
  rank: string
  titulo_rank: string
}

// Aparência em uso. Hoje todo visual é um estágio: o jogador fixa um que já alcançou, ou
// deixa no automático, que acompanha o estágio do nível.
export interface VisualPersonagem {
  id: string
  automatico: boolean
}

// Quem ainda não despertou recebe só `existe: false`: os outros campos ficam ausentes.
export interface RespostaPersonagem {
  existe: boolean
  personagem?: IdentidadePersonagem
  progressao?: ProgressaoPersonagem
  estagio?: EstagioRPG
  proximo_estagio?: EstagioRPG
  visual?: VisualPersonagem
  estagios?: EstagioStatusRPG[]
}

// Disparado quando o personagem muda (despertar, troca de visual), para a barra superior
// e o painel da Início buscarem de novo.
export const EVENTO_PERSONAGEM_ATUALIZADO = 'anideck:personagem-atualizado'

/**
 * Id do visual que deve ser desenhado: o fixado pelo jogador ou, no automático, o do estágio.
 * Resposta de servidor antigo, sem `visual`, cai no estágio.
 */
export function visualEmUso(dados: RespostaPersonagem | null | undefined): string | undefined {
  return dados?.visual?.id ?? dados?.estagio?.id
}

export interface ArteDoEstagio {
  // Ilustração de corpo inteiro, 683 × 1024.
  inteira: string
  // Versão pequena para a linha da jornada, 256 × 384.
  mini: string
  // Recorte do rosto, 256 × 256, com fundo transparente: é o avatar do jogador.
  retrato: string
}

export type CatalogoDeArtes = Record<string, Partial<Record<string, ArteDoEstagio>>>

export const LARGURA_DA_ARTE = 683
export const ALTURA_DA_ARTE = 1024

// Do primeiro ao último. A reserva de arte anda nesta ordem.
export const ORDEM_DOS_ESTAGIOS = ['iniciante', 'aventureiro', 'veterano', 'lendario']

export const PERSONAGEM_BASE_PADRAO = 'espadachim_eter'

// Estágio sem entrada aqui ainda não tem ilustração própria (hoje, o Veterano).
export const ARTES: CatalogoDeArtes = {
  espadachim_eter: {
    iniciante: { inteira: arteIniciante, mini: miniIniciante, retrato: retratoIniciante },
    aventureiro: { inteira: arteAventureiro, mini: miniAventureiro, retrato: retratoAventureiro },
    lendario: { inteira: arteLendario, mini: miniLendario, retrato: retratoLendario },
  },
}

const ROTULOS_DE_CLASSE: Record<string, string> = {
  espadachim: 'Espadachim',
}

const ROTULOS_DE_ELEMENTO: Record<string, string> = {
  eter: 'Éter',
}

export function rotuloDaClasse(classe: string | undefined): string {
  if (!classe) return ''
  return ROTULOS_DE_CLASSE[classe] ?? classe
}

export function rotuloDoElemento(elemento: string | undefined): string {
  if (!elemento) return ''
  return ROTULOS_DE_ELEMENTO[elemento] ?? elemento
}

/** Diz se o estágio tem ilustração própria para o personagem. */
export function temArtePropria(personagemBase: string, estagioId: string, artes: CatalogoDeArtes = ARTES): boolean {
  return Boolean(artes[personagemBase]?.[estagioId])
}

/**
 * Escolhe a arte de um estágio. Sem ilustração própria, usa a do estágio anterior mais
 * próximo; se nenhum anterior tiver, a do seguinte. Personagem fora do catálogo cai no
 * padrão. Só devolve undefined quando o catálogo inteiro está vazio.
 */
export function arteDoEstagio(
  personagemBase: string,
  estagioId: string,
  artes: CatalogoDeArtes = ARTES,
): ArteDoEstagio | undefined {
  const doPersonagem = artes[personagemBase] ?? artes[PERSONAGEM_BASE_PADRAO] ?? {}

  const posicao = ORDEM_DOS_ESTAGIOS.indexOf(estagioId)
  if (posicao < 0) {
    return doPersonagem[estagioId] ?? doPersonagem[ORDEM_DOS_ESTAGIOS[0]]
  }

  for (let i = posicao; i >= 0; i--) {
    const arte = doPersonagem[ORDEM_DOS_ESTAGIOS[i]]
    if (arte) return arte
  }
  for (let i = posicao + 1; i < ORDEM_DOS_ESTAGIOS.length; i++) {
    const arte = doPersonagem[ORDEM_DOS_ESTAGIOS[i]]
    if (arte) return arte
  }
  return undefined
}

export const NOME_MINIMO = 2
export const NOME_MAXIMO = 24

/**
 * Mesma regra do servidor (ValidarNomePersonagem, no Go), repetida aqui só para avisar
 * antes de enviar. Quem decide é o servidor.
 */
export function validarNomeDoPersonagem(nome: string): { nome: string; erro?: string } {
  const limpo = nome.trim().split(/\s+/).filter(Boolean).join(' ')
  const tamanho = Array.from(limpo).length

  if (tamanho < NOME_MINIMO || tamanho > NOME_MAXIMO) {
    return { nome: limpo, erro: `O nome precisa ter de ${NOME_MINIMO} a ${NOME_MAXIMO} caracteres.` }
  }
  if (!/^[\p{L}\p{N} '-]+$/u.test(limpo)) {
    return { nome: limpo, erro: 'Use só letras, números, espaço, hífen e apóstrofo no nome.' }
  }
  return { nome: limpo }
}

/** Frase da linha "Próximo estágio". */
export function textoDoProximoEstagio(proximo: EstagioRPG | undefined): string {
  if (!proximo) return 'Estágio máximo'
  return `${proximo.nome} no nível ${proximo.nivel_minimo}`
}

async function cabecalhoDeAutenticacao(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

/** Busca o personagem de quem está logado. Devolve null quando a leitura falha. */
export async function obterPersonagem(): Promise<RespostaPersonagem | null> {
  try {
    const res = await fetch('/api/personagem', { headers: await cabecalhoDeAutenticacao() })
    if (!res.ok) return null
    const json = (await res.json()) as RespostaPersonagem
    if (!json || typeof json.existe !== 'boolean') return null
    return json
  } catch {
    return null
  }
}

/** Cria o personagem. Devolve os dados prontos para a tela, ou a mensagem de erro. */
export async function despertarPersonagem(
  nome: string,
): Promise<{ dados?: RespostaPersonagem; erro?: string }> {
  const falha = 'Não foi possível despertar agora. Tente de novo em instantes.'
  try {
    const res = await fetch('/api/personagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ nome }),
    })
    const json = (await res.json().catch(() => null)) as (RespostaPersonagem & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || json.existe !== true) return { erro: falha }
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

/** Retrato (rosto recortado) do estágio, para o avatar. Sem estágio, o do primeiro. */
export function retratoDoEstagio(estagioId?: string, personagemBase: string = PERSONAGEM_BASE_PADRAO): string | undefined {
  return arteDoEstagio(personagemBase, estagioId || ORDEM_DOS_ESTAGIOS[0])?.retrato
}

/**
 * Fixa um visual já desbloqueado; com texto vazio, volta ao automático. Devolve os dados
 * prontos para a tela, ou a mensagem de erro.
 */
export async function equiparVisual(visual: string): Promise<{ dados?: RespostaPersonagem; erro?: string }> {
  const falha = 'Não foi possível trocar o visual agora. Tente de novo em instantes.'
  try {
    const res = await fetch('/api/personagem/visual', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ visual }),
    })
    const json = (await res.json().catch(() => null)) as (RespostaPersonagem & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || json.existe !== true) return { erro: falha }
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}
