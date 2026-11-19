// client/src/lib/inicioPreferencias.test.ts
import { describe, it, expect } from 'vitest'
import {
  ORDEM_INICIO_PADRAO,
  SECOES_PRINCIPAIS,
  alternarItemSecao,
  configInicioPadrao,
  moverSecaoNaOrdem,
  normalizarConfigInicio,
  ordenarMissoesPorPrioridade,
} from './inicioPreferencias'
import type { MissaoDiariaItem } from '../hooks/useMissoesHoje'

function criarMissao(overrides: Partial<MissaoDiariaItem>): MissaoDiariaItem {
  return {
    id: 'm1',
    titulo: 'Missão',
    descricao: '',
    tipo: 'episodios',
    meta: 3,
    progresso: 0,
    recompensa_cristais: 15,
    recompensa_xp: 10,
    periodo: 'dia',
    concluida: false,
    resgatada: false,
    icone: 'Play',
    ...overrides,
  }
}

describe('inicioPreferencias', () => {
  it('inicia com Continue de onde parou no topo e todas as seções visíveis', () => {
    const padrao = configInicioPadrao()
    expect(padrao.ordem[0]).toBe('continuar')
    expect(padrao.ocultas).toEqual([])
    expect(padrao.minimizadas).toEqual([])
    expect(padrao.destaque_fonte).toBe('curadoria')
  })

  it('normaliza removendo duplicatas e desconhecidas e completando seções faltantes', () => {
    const cfg = normalizarConfigInicio({
      ordem: ['ranking', 'nao_existe', 'continuar', 'ranking'],
      ocultas: ['lacuna', 'nao_existe', 'lacuna'],
      minimizadas: ['trilhas'],
      destaque_fonte: 'qualquer',
    })

    expect(cfg.ordem.slice(0, 2)).toEqual(['ranking', 'continuar'])
    expect(cfg.ordem).toHaveLength(ORDEM_INICIO_PADRAO.length)
    expect(new Set(cfg.ordem).size).toBe(ORDEM_INICIO_PADRAO.length)
    expect(cfg.ocultas).toEqual(['lacuna'])
    expect(cfg.minimizadas).toEqual(['trilhas'])
    expect(cfg.destaque_fonte).toBe('curadoria')
  })

  it('move seção para cima e para baixo respeitando o grupo sem perder os demais itens', () => {
    const base = [...ORDEM_INICIO_PADRAO]
    const subiu = moverSecaoNaOrdem(base, 'destaques', -1, SECOES_PRINCIPAIS)
    expect(subiu.indexOf('destaques')).toBe(0)
    expect(subiu.indexOf('continuar')).toBe(base.indexOf('destaques'))

    const desceu = moverSecaoNaOrdem(subiu, 'destaques', 1, SECOES_PRINCIPAIS)
    expect(desceu).toEqual(base)

    // Limite superior não sai do lugar
    expect(moverSecaoNaOrdem(base, 'continuar', -1, SECOES_PRINCIPAIS)).toEqual(base)
  })

  it('alterna visibilidade e minimização sem duplicar IDs e permite minimizar o painel do herói', () => {
    const ocultas1 = alternarItemSecao([], 'ranking')
    expect(ocultas1).toEqual(['ranking'])
    expect(alternarItemSecao(ocultas1, 'ranking')).toEqual([])

    const cfg = normalizarConfigInicio({
      ordem: ['hud', 'continuar'],
      ocultas: ['hud'],
      minimizadas: ['hud', 'hud', 'trilhas'],
    })
    expect(cfg.ordem).not.toContain('hud')
    expect(cfg.ocultas).not.toContain('hud')
    expect(cfg.minimizadas).toEqual(['hud', 'trilhas'])
  })

  it('ordena missões priorizando prontas para resgate, depois em andamento, depois não iniciadas e por fim coletadas', () => {
    const lista = [
      criarMissao({ id: 'coletada', concluida: true, resgatada: true, progresso: 3, meta: 3 }),
      criarMissao({ id: 'zerada', concluida: false, resgatada: false, progresso: 0, meta: 3 }),
      criarMissao({ id: 'pouco', concluida: false, resgatada: false, progresso: 1, meta: 4 }),
      criarMissao({ id: 'quase', concluida: false, resgatada: false, progresso: 2, meta: 3 }),
      criarMissao({ id: 'pronta', concluida: true, resgatada: false, progresso: 3, meta: 3 }),
    ]

    const ordenadas = ordenarMissoesPorPrioridade(lista)
    expect(ordenadas.map(m => m.id)).toEqual(['pronta', 'quase', 'pouco', 'zerada', 'coletada'])
  })
})
