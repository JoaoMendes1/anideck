import { describe, expect, it } from 'vitest'
import {
  climaDoEpisodio,
  ehDaEquipe,
  episodioInicial,
  faixaDoHP,
  formatarMomento,
  lerMomento,
  sugerirHandle,
  tempoRelativo,
  totalDeReacoes,
  ultimoEpisodioDisponivel,
  validarHandle,
  type ContagemEpisodio,
} from './comunidade'

describe('validarHandle', () => {
  it('limpa @, espaço e maiúscula', () => {
    expect(validarHandle('  @Joao_Dev ')).toEqual({ handle: 'joao_dev', erro: null })
  })
  it('libera nome reservado só para a equipe', () => {
    expect(validarHandle('administrador', true)).toEqual({ handle: 'administrador', erro: null })
    expect(validarHandle('ab', true).erro).not.toBeNull()
  })
  it('reconhece o @ da equipe', () => {
    expect(ehDaEquipe('Administrador')).toBe(true)
    expect(ehDaEquipe('ana_s')).toBe(false)
    expect(ehDaEquipe(undefined)).toBe(false)
  })
  it('recusa formato inválido e nome reservado', () => {
    expect(validarHandle('ab').erro).not.toBeNull()
    expect(validarHandle('nome com espaço').erro).not.toBeNull()
    expect(validarHandle('çedilha').erro).not.toBeNull()
    expect(validarHandle('admin').erro).toMatch(/reservado/)
  })
})

describe('sugerirHandle', () => {
  it('tira acento e troca o resto por _', () => {
    expect(sugerirHandle('João Mendes')).toBe('joao_mendes')
  })
  it('não sugere nada curto demais', () => {
    expect(sugerirHandle('Jô')).toBe('')
  })
})

describe('momento do episódio', () => {
  it('formata minutos e horas', () => {
    expect(formatarMomento(125)).toBe('2:05')
    expect(formatarMomento(3725)).toBe('1:02:05')
  })
  it('lê minuto simples, mm:ss e h:mm:ss', () => {
    expect(lerMomento('')).toBeNull()
    expect(lerMomento('12')).toBe(720)
    expect(lerMomento('12:30')).toBe(750)
    expect(lerMomento('1:02:05')).toBe(3725)
  })
  it('recusa formato errado e passar de 3 horas', () => {
    expect(lerMomento('12:75')).toBeNaN()
    expect(lerMomento('abc')).toBeNaN()
    expect(lerMomento('181')).toBeNaN()
  })
})

describe('tempoRelativo', () => {
  const agora = new Date('2026-11-08T12:00:00Z').getTime()
  it('usa frases curtas até uma semana', () => {
    expect(tempoRelativo('2026-11-08T11:59:30Z', agora)).toBe('agora')
    expect(tempoRelativo('2026-11-08T11:55:00Z', agora)).toBe('há 5 min')
    expect(tempoRelativo('2026-11-08T09:00:00Z', agora)).toBe('há 3 h')
    expect(tempoRelativo('2026-11-07T12:00:00Z', agora)).toBe('há 1 dia')
    expect(tempoRelativo('2026-11-05T12:00:00Z', agora)).toBe('há 3 dias')
  })
  it('data inválida não quebra a tela', () => {
    expect(tempoRelativo('lixo', agora)).toBe('')
  })
})

describe('ultimoEpisodioDisponivel', () => {
  it('para no episódio anterior ao próximo a lançar', () => {
    expect(ultimoEpisodioDisponivel(24, 8, [])).toBe(7)
  })
  it('usa o total quando a obra terminou', () => {
    expect(ultimoEpisodioDisponivel(12, undefined, [3])).toBe(12)
  })
  it('sem total, vale o maior episódio marcado', () => {
    expect(ultimoEpisodioDisponivel(0, undefined, [2, 9])).toBe(9)
  })
})

describe('episodioInicial', () => {
  const contagens: ContagemEpisodio[] = [
    { episode_number: 2, comentarios: 1, reacoes: {} },
    { episode_number: 5, comentarios: 4, reacoes: { chorei: 2 } },
  ]
  it('abre no último assistido', () => {
    expect(episodioInicial([1, 3, 2], contagens)).toBe(3)
  })
  it('sem nada assistido, abre no mais comentado', () => {
    expect(episodioInicial([], contagens)).toBe(5)
    expect(episodioInicial([], [])).toBe(1)
  })
})

describe('totalDeReacoes e faixaDoHP', () => {
  it('soma as reações', () => {
    expect(totalDeReacoes({ episode_number: 1, comentarios: 0, reacoes: { chorei: 2, tenso: 1 } })).toBe(3)
    expect(totalDeReacoes(undefined)).toBe(0)
  })
  it('classifica a Vitalidade', () => {
    expect(faixaDoHP(100)).toBe('cheio')
    expect(faixaDoHP(60)).toBe('bom')
    expect(faixaDoHP(20)).toBe('baixo')
  })
})

describe('climaDoEpisodio', () => {
  it('ordena as reações e calcula a fatia de cada uma', () => {
    const { total, fatias } = climaDoEpisodio({ chorei: 6, tenso: 2, plot_twist: 0 })
    expect(total).toBe(8)
    expect(fatias.map(f => f.id)).toEqual(['chorei', 'tenso'])
    expect(fatias[0].pct).toBe(75)
  })
  it('sem reação, termômetro vazio', () => {
    expect(climaDoEpisodio(undefined)).toEqual({ total: 0, fatias: [] })
  })
})
