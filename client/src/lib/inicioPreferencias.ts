// client/src/lib/inicioPreferencias.ts
// Regras puras e persistência das preferências personalizáveis da tela Início (#275).
import type { MissaoDiariaItem } from '../hooks/useMissoesHoje'

export const SECOES_PRINCIPAIS = [
  'continuar',
  'destaques',
  'recomendados',
  'lacuna',
  'trilhas',
  'ranking',
] as const

export const SECOES_LATERAIS = [
  'missoes',
  'semana',
  'chefao',
  'cla',
] as const

export const ORDEM_INICIO_PADRAO = [
  'continuar',
  'missoes',
  'semana',
  'chefao',
  'cla',
  'destaques',
  'recomendados',
  'lacuna',
  'trilhas',
  'ranking',
] as const

export type SecaoInicioId = (typeof ORDEM_INICIO_PADRAO)[number]

export const FONTES_DESTAQUE = [
  { id: 'curadoria', rotulo: 'Curadoria', subtitulo: 'Curadoria do AniDeck' },
  { id: 'lancamento', rotulo: 'Em lançamento', subtitulo: 'Animes com episódios novos no ar' },
  { id: 'bem_avaliados', rotulo: 'Bem avaliados', subtitulo: 'Obras no topo do ranking do AniDeck' },
  { id: 'populares', rotulo: 'Em alta', subtitulo: 'Obras com mais atividade recente na comunidade' },
] as const

export type FonteDestaqueInicio = (typeof FONTES_DESTAQUE)[number]['id']

export interface ConfigInicio {
  ordem: SecaoInicioId[]
  ocultas: SecaoInicioId[]
  minimizadas: SecaoInicioId[]
  destaque_fonte: FonteDestaqueInicio
}

export interface InfoSecaoInicio {
  id: SecaoInicioId
  titulo: string
  descricao: string
  grupo: 'principal' | 'lateral'
}

export const CATALOGO_SECOES_INICIO: Record<SecaoInicioId, InfoSecaoInicio> = {
  continuar: {
    id: 'continuar',
    titulo: 'Continue de onde parou',
    descricao: 'Seu próximo episódio liberado e os animes em andamento do deck',
    grupo: 'principal',
  },
  destaques: {
    id: 'destaques',
    titulo: 'Em destaque',
    descricao: 'Vitrine configurável por curadoria, lançamento, nota ou atividade',
    grupo: 'principal',
  },
  recomendados: {
    id: 'recomendados',
    titulo: 'Recomendados para você',
    descricao: 'Sugestões selecionadas pelos seus gêneros favoritos e afinidade',
    grupo: 'principal',
  },
  lacuna: {
    id: 'lacuna',
    titulo: 'Gosto pouco explorado',
    descricao: 'Um gênero que você avalia bem, mas ainda assistiu pouco',
    grupo: 'principal',
  },
  trilhas: {
    id: 'trilhas',
    titulo: 'Trilhas da curadoria',
    descricao: 'Listas temáticas montadas para maratonar em sequência',
    grupo: 'principal',
  },
  ranking: {
    id: 'ranking',
    titulo: 'Topo do ranking',
    descricao: 'As obras mais bem colocadas no ranking bayesiano do AniDeck',
    grupo: 'principal',
  },
  missoes: {
    id: 'missoes',
    titulo: 'Missões',
    descricao: 'Missões do dia e da semana com prioridade nas concluídas',
    grupo: 'lateral',
  },
  semana: {
    id: 'semana',
    titulo: 'Sua semana',
    descricao: 'Episódios do seu deck previstos nos próximos 7 dias',
    grupo: 'lateral',
  },
  chefao: {
    id: 'chefao',
    titulo: 'Chefão da Temporada',
    descricao: 'Progresso da raid cooperativa e seu dano acumulado',
    grupo: 'lateral',
  },
  cla: {
    id: 'cla',
    titulo: 'Desafio do Clã',
    descricao: 'Meta semanal coletiva do seu clã',
    grupo: 'lateral',
  },
}

const CONJUNTO_SECOES = new Set<string>(ORDEM_INICIO_PADRAO)
const CONJUNTO_FONTES = new Set<string>(FONTES_DESTAQUE.map(f => f.id))
const PREFIXO_LOCAL = 'anideck:inicio-config:'

export function configInicioPadrao(): ConfigInicio {
  return {
    ordem: [...ORDEM_INICIO_PADRAO],
    ocultas: [],
    minimizadas: [],
    destaque_fonte: 'curadoria',
  }
}

export function ehSecaoInicioValida(valor: unknown): valor is SecaoInicioId {
  return typeof valor === 'string' && CONJUNTO_SECOES.has(valor)
}

export function normalizarConfigInicio(bruto: unknown): ConfigInicio {
  if (!bruto || typeof bruto !== 'object') {
    return configInicioPadrao()
  }
  const obj = bruto as Partial<Record<keyof ConfigInicio, unknown>>

  const ordem: SecaoInicioId[] = []
  const vistosOrdem = new Set<SecaoInicioId>()
  if (Array.isArray(obj.ordem)) {
    for (const item of obj.ordem) {
      if (ehSecaoInicioValida(item) && !vistosOrdem.has(item)) {
        vistosOrdem.add(item)
        ordem.push(item)
      }
    }
  }
  for (const id of ORDEM_INICIO_PADRAO) {
    if (!vistosOrdem.has(id)) {
      vistosOrdem.add(id)
      ordem.push(id)
    }
  }

  const filtrarUnicos = (valor: unknown): SecaoInicioId[] => {
    if (!Array.isArray(valor)) return []
    const vistos = new Set<SecaoInicioId>()
    const saida: SecaoInicioId[] = []
    for (const item of valor) {
      if (ehSecaoInicioValida(item) && !vistos.has(item)) {
        vistos.add(item)
        saida.push(item)
      }
    }
    return saida
  }

  const destaque_fonte: FonteDestaqueInicio =
    typeof obj.destaque_fonte === 'string' && CONJUNTO_FONTES.has(obj.destaque_fonte)
      ? (obj.destaque_fonte as FonteDestaqueInicio)
      : 'curadoria'

  return {
    ordem,
    ocultas: filtrarUnicos(obj.ocultas),
    minimizadas: filtrarUnicos(obj.minimizadas),
    destaque_fonte,
  }
}

/**
 * Move uma seção 1 posição para cima (-1) ou para baixo (+1). Quando `idsDoGrupo` é
 * informado, troca com a vizinha imediata daquele grupo preservando as demais posições.
 */
export function moverSecaoNaOrdem(
  ordem: readonly SecaoInicioId[],
  id: SecaoInicioId,
  direcao: -1 | 1,
  idsDoGrupo?: readonly SecaoInicioId[],
): SecaoInicioId[] {
  const copia = [...ordem]
  const indicesElegiveis = idsDoGrupo
    ? copia.map((item, idx) => (idsDoGrupo.includes(item) ? idx : -1)).filter(idx => idx >= 0)
    : copia.map((_, idx) => idx)

  const posNoGrupo = indicesElegiveis.findIndex(idx => copia[idx] === id)
  if (posNoGrupo < 0) return copia

  const alvoNoGrupo = posNoGrupo + direcao
  if (alvoNoGrupo < 0 || alvoNoGrupo >= indicesElegiveis.length) return copia

  const idxA = indicesElegiveis[posNoGrupo]
  const idxB = indicesElegiveis[alvoNoGrupo]
  const temp = copia[idxA]
  copia[idxA] = copia[idxB]
  copia[idxB] = temp
  return copia
}

export function alternarItemSecao(
  lista: readonly SecaoInicioId[],
  id: SecaoInicioId,
): SecaoInicioId[] {
  return lista.includes(id) ? lista.filter(item => item !== id) : [...lista, id]
}

/**
 * Prioridade visual nas Missões (#275):
 * 0 = pronta para resgatar (concluída e ainda não resgatada)
 * 1 = em andamento (progresso > 0), ordenada por maior percentual
 * 2 = ainda não iniciada
 * 3 = já coletada
 */
export function ordenarMissoesPorPrioridade(lista: readonly MissaoDiariaItem[]): MissaoDiariaItem[] {
  const faixa = (m: MissaoDiariaItem): number => {
    if (m.concluida && !m.resgatada) return 0
    if (!m.concluida && m.progresso > 0) return 1
    if (!m.concluida) return 2
    return 3
  }
  const proporcao = (m: MissaoDiariaItem): number => {
    const meta = m.meta > 0 ? m.meta : 1
    return Math.min(1, Math.max(0, m.progresso / meta))
  }

  return lista
    .map((m, idx) => ({ m, idx }))
    .sort((a, b) => {
      const fa = faixa(a.m)
      const fb = faixa(b.m)
      if (fa !== fb) return fa - fb
      if (fa === 1) {
        const diff = proporcao(b.m) - proporcao(a.m)
        if (Math.abs(diff) > 0.0001) return diff
      }
      return a.idx - b.idx
    })
    .map(item => item.m)
}

export function lerCacheLocalInicio(userId: string): ConfigInicio | null {
  if (!userId || typeof localStorage === 'undefined') return null
  try {
    const bruto = localStorage.getItem(`${PREFIXO_LOCAL}${userId}`)
    if (!bruto) return null
    return normalizarConfigInicio(JSON.parse(bruto))
  } catch {
    return null
  }
}

export function guardarCacheLocalInicio(userId: string, config: ConfigInicio): void {
  if (!userId || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(`${PREFIXO_LOCAL}${userId}`, JSON.stringify(config))
  } catch {
    // Sem espaço no navegador: segue sem cache local.
  }
}

export async function carregarInicioPreferencias(token: string): Promise<ConfigInicio | null> {
  const res = await fetch('/api/inicio/preferencias', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const json: unknown = await res.json()
  return normalizarConfigInicio(json)
}

export async function salvarInicioPreferencias(config: ConfigInicio, token: string): Promise<ConfigInicio> {
  const res = await fetch('/api/inicio/preferencias', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(config),
  })
  if (!res.ok) {
    throw new Error('Não foi possível salvar suas preferências da Início.')
  }
  const json: unknown = await res.json()
  return normalizarConfigInicio(json)
}
