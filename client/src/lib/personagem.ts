// client/src/lib/personagem.ts
// Tipos, chamadas e regras de apresentação da tela Meu Personagem (Fase 18.1).
//
// A arte nunca vem da API. O servidor diz qual é o personagem e o estágio; a escolha
// do arquivo acontece aqui. Trocar uma ilustração, ou mudar onde elas ficam guardadas,
// não mexe em regra de jogo.
import { supabase } from './supabase'
import type { EstadoEquipamento } from './rpg'

// Todas as ilustrações do elenco, como URL. O nome do arquivo diz de quem e de qual estágio
// é: <personagem>-<estágio>[-mini|-retrato].webp, com hífen no lugar do sublinhado do id.
// A lista sai do build: a arte que entra na pasta entra no catálogo, sem import à mão.
const ARQUIVOS_DE_ARTE = import.meta.glob('../assets/personagem/*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>

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

// Regras do elenco (alinhadas ao servidor / sql/123).
export interface ElencoPersonagemInfo {
  desbloqueados: string[]
  ultima_troca_em?: string
  proxima_troca_em?: string
  preco_desbloquear_ouro: number
  troca_cooldown_horas: number
  preco_troca_antecipada_ouro: number
}

// Quem ainda não despertou recebe só `existe: false`: os outros campos ficam ausentes.
export interface RespostaPersonagem {
  existe: boolean
  personagem?: IdentidadePersonagem
  progressao?: ProgressaoPersonagem
  estagio?: EstagioRPG
  proximo_estagio?: EstagioRPG
  visual?: VisualPersonagem
  // Estilo do cenário equipado na Loja (chave de CENARIOS, em lib/cosmeticos); ausente é o fundo padrão.
  cenario?: string
  // Estilo da aura equipada na Loja (chave de AURAS); ausente é sem aura.
  aura?: string
  estagios?: EstagioStatusRPG[]
  elenco?: ElencoPersonagemInfo
  // Skins compradas na Loja; o id de cada uma é um visual que pode ser vestido.
  skins?: SkinPersonagem[]
  /** Só com `completo`: equipamento e atributos, na mesma resposta. */
  equipamento?: EstadoEquipamento
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
  // Filtro CSS da arte provisória de skin. Toda <img> do personagem aplica este campo.
  filtro?: string
}

export interface SkinPersonagem {
  id: string
  nome: string
  estilo: string
}

// Skins com arte provisória: a ilustração de um estágio com um filtro de cor. Quando a
// ilustração própria existir, ela entra em ARTES com o id da skin e este mapa perde a entrada.
export const SKINS: Record<string, { estagio: string; filtro: string }> = {
  // Tingimento da imagem inteira: girar o matiz mudaria a pele junto com a roupa.
  skin_carmesim: { estagio: 'aventureiro', filtro: 'sepia(1) saturate(3) hue-rotate(-35deg) brightness(0.9)' },
  skin_esmeralda: { estagio: 'aventureiro', filtro: 'sepia(1) saturate(2.5) hue-rotate(60deg) brightness(0.9)' },
  skin_sombra: { estagio: 'veterano', filtro: 'grayscale(1) contrast(1.35) brightness(0.8)' },
  skin_solar: { estagio: 'veterano', filtro: 'sepia(0.85) saturate(2.2) brightness(1.1)' },
}

/** Filtro CSS do visual, ou undefined quando o visual não é uma skin provisória. */
export function filtroDoVisual(visualId?: string | null): string | undefined {
  if (!visualId || !Object.hasOwn(SKINS, visualId)) return undefined
  return SKINS[visualId].filtro
}

export type CatalogoDeArtes = Record<string, Partial<Record<string, ArteDoEstagio>>>

export const LARGURA_DA_ARTE = 683
export const ALTURA_DA_ARTE = 1024

// Do primeiro ao último. A reserva de arte anda nesta ordem.
export const ORDEM_DOS_ESTAGIOS = ['iniciante', 'aventureiro', 'veterano', 'lendario']

export const PERSONAGEM_BASE_PADRAO = 'espadachim_eter'

export const PRECO_DESBLOQUEAR_OURO = 400
export const PRECO_TROCA_ANTECIPADA_OURO = 150
export const COOLDOWN_TROCA_HORAS = 24

/** Formata o tempo restante até a próxima troca gratuita, ou devolve null quando já liberou. */
export function formatarEsperaTroca(proximaTrocaEm?: string, agoraMs: number = Date.now()): string | null {
  if (!proximaTrocaEm) return null
  const alvoMs = Date.parse(proximaTrocaEm)
  if (!Number.isFinite(alvoMs) || alvoMs <= agoraMs) return null
  const minutosTotais = Math.max(1, Math.ceil((alvoMs - agoraMs) / 60000))
  const horas = Math.floor(minutosTotais / 60)
  const minutos = minutosTotais % 60
  if (horas > 0 && minutos > 0) return `${horas}h ${minutos}min`
  if (horas > 0) return `${horas}h`
  return `${minutos}min`
}

/**
 * Monta o catálogo a partir dos arquivos. Estágio só entra com as três versões (inteira,
 * mini e retrato); faltando uma, fica de fora e usa a arte do estágio anterior.
 */
export function montarCatalogoDeArtes(arquivos: Record<string, string>): CatalogoDeArtes {
  const pecas: Record<string, Record<string, Partial<ArteDoEstagio>>> = {}
  const padrao = new RegExp(`/([a-z-]+)-(${ORDEM_DOS_ESTAGIOS.join('|')})(-mini|-retrato)?\\.webp$`)
  for (const [caminho, url] of Object.entries(arquivos)) {
    const achado = padrao.exec(caminho)
    if (!achado) continue
    const [, nome, estagio, versao] = achado
    const base = nome.replaceAll('-', '_')
    const campo = versao === '-mini' ? 'mini' : versao === '-retrato' ? 'retrato' : 'inteira'
    pecas[base] ??= {}
    pecas[base][estagio] ??= {}
    pecas[base][estagio][campo] = url
  }
  const catalogo: CatalogoDeArtes = {}
  for (const [base, estagios] of Object.entries(pecas)) {
    for (const [estagio, arte] of Object.entries(estagios)) {
      if (arte.inteira && arte.mini && arte.retrato) {
        catalogo[base] ??= {}
        catalogo[base][estagio] = { inteira: arte.inteira, mini: arte.mini, retrato: arte.retrato }
      }
    }
  }
  return catalogo
}

// Estágio sem entrada aqui não tem ilustração própria e usa a do estágio anterior.
export const ARTES: CatalogoDeArtes = montarCatalogoDeArtes(ARQUIVOS_DE_ARTE)

export interface MembroDoElenco {
  id: string
  nome: string
  classe: string
  elemento: string
  // Uma frase para a tela de escolha.
  resumo: string
}

// O elenco, na ordem da tela de escolha. O id, a classe e o elemento são os mesmos do
// servidor (PersonagensBase, no Go); o nome é o do personagem, que o jogador não troca.
export const ELENCO: MembroDoElenco[] = [
  { id: 'espadachim_eter', nome: 'Espadachim de Éter', classe: 'espadachim', elemento: 'eter', resumo: 'Equilíbrio entre ataque e defesa. Desperta curando e dobrando o próximo golpe.' },
  { id: 'lanceiro_fogo', nome: 'Haruto', classe: 'lanceiro', elemento: 'fogo', resumo: 'Golpes que perfuram a defesa. O fogo dele atravessa qualquer armadura.' },
  { id: 'assassina_raio', nome: 'Rin', classe: 'assassina', elemento: 'raio', resumo: 'Veloz e certeira. Desvia dos golpes e devolve com força dobrada.' },
  { id: 'maga_agua', nome: 'Mizuki', classe: 'maga', elemento: 'agua', resumo: 'Magia arcana que ignora a força bruta. A maré ancestral cura muito.' },
  { id: 'guerreiro_terra', nome: 'Brokk', classe: 'guerreiro', elemento: 'terra', resumo: 'O ferreiro das montanhas. Aguenta o tranco e recebe metade do dano.' },
  { id: 'paladina_luz', nome: 'Celestia', classe: 'paladina', elemento: 'luz', resumo: 'Proteção e cura. A Égide bloqueia golpes e reduz o dano recebido.' },
]

/** Membro do elenco pelo id; id desconhecido cai no padrão. */
export function membroDoElenco(id: string | undefined): MembroDoElenco {
  return ELENCO.find((m) => m.id === id) ?? ELENCO[0]
}

/** As skins da Loja são trajes do Espadachim: só ele as veste. */
export function aceitaSkins(personagemBase: string | undefined): boolean {
  return !personagemBase || personagemBase === PERSONAGEM_BASE_PADRAO
}

const ROTULOS_DE_CLASSE: Record<string, string> = {
  espadachim: 'Espadachim',
  lanceiro: 'Lanceiro',
  assassina: 'Assassina',
  maga: 'Maga',
  guerreiro: 'Guerreiro',
  paladina: 'Paladina',
}

const ROTULOS_DE_ELEMENTO: Record<string, string> = {
  eter: 'Éter',
  fogo: 'Fogo',
  raio: 'Raio',
  agua: 'Água',
  terra: 'Terra',
  luz: 'Luz',
  trevas: 'Trevas',
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

  // Skin com ilustração própria vem do catálogo; com arte provisória, é o estágio com filtro.
  if (!doPersonagem[estagioId] && Object.hasOwn(SKINS, estagioId)) {
    const provisoria = SKINS[estagioId]
    const base = arteDoEstagio(personagemBase, provisoria.estagio, artes)
    return base ? { ...base, filtro: provisoria.filtro } : undefined
  }

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

/**
 * Busca o personagem de quem está logado. Devolve null quando a leitura falha.
 * `completo` traz também o equipamento: é o que a tela do personagem usa, numa chamada só; a
 * barra superior e os retratos usam a leve.
 */
export async function obterPersonagem(opcoes: { completo?: boolean } = {}): Promise<RespostaPersonagem | null> {
  try {
    const url = opcoes.completo ? '/api/personagem?completo=1' : '/api/personagem'
    const res = await fetch(url, { headers: await cabecalhoDeAutenticacao() })
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
  personagemBase: string = PERSONAGEM_BASE_PADRAO,
): Promise<{ dados?: RespostaPersonagem; erro?: string }> {
  const falha = 'Não foi possível despertar agora. Tente de novo em instantes.'
  try {
    const res = await fetch('/api/personagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ nome, personagem_base: personagemBase }),
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

/**
 * Desbloqueia um personagem do elenco usando Ouro. Devolve os dados prontos (incluindo
 * equipamento atualizado) ou a mensagem de erro.
 */
export async function desbloquearPersonagem(
  personagemBase: string,
): Promise<{ dados?: RespostaPersonagem; erro?: string }> {
  const falha = 'Não foi possível desbloquear o personagem agora. Tente de novo em instantes.'
  try {
    const res = await fetch('/api/personagem/desbloquear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ personagem_base: personagemBase }),
    })
    const json = (await res.json().catch(() => null)) as (RespostaPersonagem & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || json.existe !== true) return { erro: falha }
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}

/**
 * Troca o personagem do elenco entre os já desbloqueados. A primeira troca ou após 24h
 * é gratuita; antes do prazo exige `pagarAntecipado = true` (custo em Ouro). O visual
 * fixado volta ao automático e peças de outra classe são desequipadas.
 */
export async function trocarPersonagem(
  personagemBase: string,
  pagarAntecipado = false,
): Promise<{ dados?: RespostaPersonagem; erro?: string }> {
  const falha = 'Não foi possível trocar o personagem agora. Tente de novo em instantes.'
  try {
    const res = await fetch('/api/personagem/base', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ personagem_base: personagemBase, pagar_antecipado: pagarAntecipado }),
    })
    const json = (await res.json().catch(() => null)) as (RespostaPersonagem & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || json.existe !== true) return { erro: falha }
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}
