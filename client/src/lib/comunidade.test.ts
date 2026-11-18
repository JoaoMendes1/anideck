import { describe, expect, it } from 'vitest'
import {
  REACOES,
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
  calcularManaMaximaJogador,
  calcularHPMaximoJogador,
  obterMPMaxDoEstado,
  obterHPEscaladoDoEstado,
  type ContagemEpisodio,
  type RegrasComunidade,
  type EstadoComunidade,
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

describe('Vitalidade e Mana por nível', () => {
  const regrasPadrao: RegrasComunidade = {
    mp_max: 50,
    mp_por_nivel: 1,
    mp_max_teto: 120,
    mp_custo_comentario: 5,
    mp_regen_dia: 20,
    hp_janela_dias: 14,
    hp_dias_para_cheio: 7,
    hp_piso: 20,
    descanso_max_dias: 14,
    previsoes_ativas: true,
  }

  it('calcula MP máximo e HP máximo nos níveis 1, 15 e 90 (com teto)', () => {
    expect(calcularManaMaximaJogador(1, regrasPadrao)).toBe(50)
    expect(calcularManaMaximaJogador(15, regrasPadrao)).toBe(64)
    expect(calcularManaMaximaJogador(90, regrasPadrao)).toBe(120)

    expect(calcularHPMaximoJogador(1)).toBe(100)
    expect(calcularHPMaximoJogador(15)).toBe(170)
    expect(calcularHPMaximoJogador(90)).toBe(400)
  })

  it('usa o teto vindo do backend ou calcula pelo nível na ausência dele', () => {
    const estadoSemCampos: EstadoComunidade = {
      perfil: {
        existe: false,
        handle: '',
        nome: '',
        bio: '',
        vitrine: [],
        publico: false,
        descanso_inicio: '',
        descanso_fim: '',
      },
      hp: 80,
      mana: 50,
      em_descanso: false,
      regras: regrasPadrao,
    }
    expect(obterMPMaxDoEstado(estadoSemCampos, 15)).toBe(64)
    expect(obterHPEscaladoDoEstado(estadoSemCampos, 15)).toEqual({
      atual: 136,
      maximo: 170,
      pct: 80,
    })

    const estadoComBackend: EstadoComunidade = {
      ...estadoSemCampos,
      mp_max_jogador: 64,
      hp_max_jogador: 170,
    }
    expect(obterMPMaxDoEstado(estadoComBackend, 1)).toBe(64)
    expect(obterHPEscaladoDoEstado(estadoComBackend, 1)).toEqual({
      atual: 136,
      maximo: 170,
      pct: 80,
    })
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
  it('reação nova lidera com cor e veredito próprios; desconhecida é ignorada', () => {
    const { total, fatias } = climaDoEpisodio({ hype: 5, gancho: 1, inventada: 9 })
    expect(total).toBe(6)
    expect(fatias[0]).toMatchObject({ id: 'hype', emoji: '🔥', cor: 'bg-coral', veredito: 'deixou todo mundo no hype' })
  })
})

describe('REACOES', () => {
  it('tem 16 reações sem id repetido', () => {
    expect(REACOES).toHaveLength(16)
    expect(new Set(REACOES.map(r => r.id)).size).toBe(16)
  })
})

describe('obterHPEscaladoDoEstado com o HP do personagem', () => {
  it('usa o máximo e o atual das batalhas quando vierem', async () => {
    const { obterHPEscaladoDoEstado } = await import('./comunidade')
    const estado = { hp: 96, hp_max_jogador: 450, hp_atual_jogador: 431 } as unknown as Parameters<typeof obterHPEscaladoDoEstado>[0]
    expect(obterHPEscaladoDoEstado(estado, 15)).toMatchObject({ atual: 431, maximo: 450 })
  })
  it('sem personagem, segue a regra do nível', async () => {
    const { obterHPEscaladoDoEstado } = await import('./comunidade')
    const estado = { hp: 100 } as unknown as Parameters<typeof obterHPEscaladoDoEstado>[0]
    expect(obterHPEscaladoDoEstado(estado, 15)).toMatchObject({ atual: 170, maximo: 170 })
  })
})
