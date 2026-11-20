// client/src/lib/rpg.test.ts
import { describe, it, expect } from 'vitest'
import {
  ESTILO_DA_RARIDADE,
  SLOTS_RPG,
  descreverTurno,
  diferencaDaTroca,
  estiloDaRaridade,
  porMilEmPorcento,
  resumoDoItem,
  somaDosPontos,
  textoDasClasses,
  itensAfetadosPelosPontos,
  textoDosRequisitos,
  type EstadoEquipamento,
} from './rpg'

describe('rpg - equipamentos', () => {
  it('lista os cinco slots na ordem do servidor', () => {
    expect(SLOTS_RPG.map((s) => s.id)).toEqual(['arma', 'elmo', 'armadura', 'luvas', 'capa', 'botas', 'joia'])
  })

  it('resume só os atributos que o item dá', () => {
    expect(resumoDoItem({ vida: 0, ataque: 4, defesa: 0 })).toBe('+4 Ataque')
    expect(resumoDoItem({ vida: 20, ataque: 0, defesa: 2 })).toBe('+20 Vida · +2 Defesa')
    expect(resumoDoItem({ vida: 0, ataque: 0, defesa: 0 })).toBe('Sem atributos')
  })

  it('calcula ganho e perda da troca', () => {
    const atual = { vida: 0, ataque: 4, defesa: 0 }
    expect(diferencaDaTroca(atual, { vida: 0, ataque: 10, defesa: 1, bloqueado: false })).toEqual({ vida: 0, ataque: 6, defesa: 1, magia: 0, velocidade: 0 })
    expect(diferencaDaTroca(undefined, { vida: 20, ataque: 0, defesa: 2, bloqueado: false })).toEqual({ vida: 20, ataque: 0, defesa: 2, magia: 0, velocidade: 0 })
  })

  it('item bloqueado pelo nível não soma na troca', () => {
    expect(diferencaDaTroca({ vida: 0, ataque: 4, defesa: 0 }, { vida: 0, ataque: 45, defesa: 0, bloqueado: true })).toEqual({
      vida: 0,
      ataque: -4,
      defesa: 0,
      magia: 0,
      velocidade: 0,
    })
  })

  it('item de outra classe não soma na troca', () => {
    expect(diferencaDaTroca({ vida: 0, ataque: 4, defesa: 0 }, { vida: 0, ataque: 45, defesa: 0, bloqueado: false, nao_serve: true }).ataque).toBe(-4)
  })

  it('resume os atributos novos', () => {
    expect(resumoDoItem({ vida: 0, ataque: 0, defesa: 0, magia: 12, critico_por_mil: 50, dano_critico: 18, esquiva_por_mil: 15, velocidade: 3 })).toBe(
      '+12 Magia · +3 Velocidade · +5% Crítico · +18% Dano Crítico · +1,5% Esquiva',
    )
  })

  it('escreve as classes que usam o item', () => {
    expect(textoDasClasses({ classes: null })).toBe('')
    expect(textoDasClasses({ classes: [] })).toBe('')
    expect(textoDasClasses({ classes: ['assassina'] })).toBe('Assassina')
    expect(textoDasClasses({ classes: ['espadachim', 'paladina'] })).toBe('Espadachim e Paladina')
    expect(textoDasClasses({ classes: ['maga', 'paladina', 'guerreiro'] })).toBe('Maga, Paladina e Guerreiro')
  })

  it('raridade desconhecida cai em comum', () => {
    expect(estiloDaRaridade('lendario')).toBe(ESTILO_DA_RARIDADE.lendario)
    expect(estiloDaRaridade('mitico')).toBe(ESTILO_DA_RARIDADE.comum)
    expect(estiloDaRaridade(undefined)).toBe(ESTILO_DA_RARIDADE.comum)
  })
})

describe('rpg - expedições', () => {
  it('conta as batalhas restantes sem passar de zero', async () => {
    const { batalhasRestantes } = await import('./rpg')
    expect(batalhasRestantes({ feitas: 2, limite: 5, bilhetes: 0 })).toBe(3)
    expect(batalhasRestantes({ feitas: 7, limite: 5, bilhetes: 0 })).toBe(0)
    expect(batalhasRestantes(undefined)).toBe(0)
  })

  it('dificuldade desconhecida cai em equilibrada', async () => {
    const { ROTULO_DA_DIFICULDADE, rotuloDaDificuldade } = await import('./rpg')
    expect(rotuloDaDificuldade('perigosa')).toBe(ROTULO_DA_DIFICULDADE.perigosa)
    expect(rotuloDaDificuldade('impossivel')).toBe(ROTULO_DA_DIFICULDADE.equilibrada)
  })
})

describe('rpg - invocação', () => {
  it('escreve por mil como porcentagem', async () => {
    const { porcentagem } = await import('./rpg')
    expect(porcentagem(600)).toBe('60%')
    expect(porcentagem(85)).toBe('8,5%')
    expect(porcentagem(15)).toBe('1,5%')
    expect(porcentagem(0)).toBe('0%')
  })

  it('conta quanto falta para as garantias, nunca menos de 1', async () => {
    const { faltamParaGarantia, faltamParaLendario } = await import('./rpg')
    const chances = {
      ouro: 780, raro: 170, epico: 45, lendario: 5, garantia: 10,
      lendario_sobe_em: 70, lendario_passo: 50, lendario_garantido: 90, ouro_por_tentativa: 25,
    }
    expect(faltamParaGarantia({ sem_raro: 0, chances })).toBe(10)
    expect(faltamParaGarantia({ sem_raro: 9, chances })).toBe(1)
    expect(faltamParaGarantia({ sem_raro: 12, chances })).toBe(1)
    expect(faltamParaLendario({ sem_lendario: 0, chances })).toBe(90)
    expect(faltamParaLendario({ sem_lendario: 89, chances })).toBe(1)
    expect(faltamParaLendario({ sem_lendario: 120, chances })).toBe(1)
  })
})

describe('rpg - Vida entre as batalhas', () => {
  it('sem Vida só quando a perda é total', async () => {
    const { semVida } = await import('./rpg')
    expect(semVida(undefined)).toBe(false)
    expect(semVida({ atual: 1, maxima: 300, perdida_por_mil: 999 })).toBe(false)
    expect(semVida({ atual: 0, maxima: 300, perdida_por_mil: 1000 })).toBe(true)
    const { abaixoDaVidaMinima } = await import('./rpg')
    expect(abaixoDaVidaMinima({ atual: 90, maxima: 300, perdida_por_mil: 700 })).toBe(false)
    expect(abaixoDaVidaMinima({ atual: 87, maxima: 300, perdida_por_mil: 710 })).toBe(true)
    expect(abaixoDaVidaMinima({ atual: 30, maxima: 300, perdida_por_mil: 900 }, { vida_minima_luta: 100 })).toBe(false)
  })

  it('mostra a hora da Pousada só quando ela ainda não vale', async () => {
    const { horaDaPousada } = await import('./rpg')
    const agora = new Date('2026-11-17T12:00:00Z')
    expect(horaDaPousada(null, agora)).toBe('')
    expect(horaDaPousada('2026-11-17T11:00:00Z', agora)).toBe('')
    expect(horaDaPousada('não é data', agora)).toBe('')
    expect(horaDaPousada('2026-11-17T15:30:00Z', agora)).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('atributos primários e registro da luta', () => {
  it('soma os pontos e mostra milésimos como porcentagem', () => {
    expect(somaDosPontos({ forca: 3, inteligencia: 0, constituicao: 2, agilidade: 0, destreza: 1, sorte: 0 })).toBe(6)
    expect(porMilEmPorcento(70)).toBe('7%')
    expect(porMilEmPorcento(115)).toBe('11,5%')
    expect(porMilEmPorcento(undefined)).toBe('0%')
  })

  it('descreve cada tipo de turno', () => {
    const base = { dano: 12, critico: false, vida_jogador: 100, vida_monstro: 50 }
    expect(descreverTurno({ ...base, atacante: 'jogador' }, 'Lobo')).toEqual({ texto: 'Você golpeia', valor: '−12' })
    expect(descreverTurno({ ...base, atacante: 'jogador', alvo: 'Lobo Jovem' }, 'Lobo').texto).toBe('Você golpeia em Lobo Jovem')
    expect(descreverTurno({ ...base, atacante: 'monstro', dano: 0, poder: 'Uivo da Matilha', invocado: 'Lobo Jovem' }, 'Lobo').texto).toBe('Lobo usa Uivo da Matilha: chega Lobo Jovem')
    expect(descreverTurno({ ...base, atacante: 'monstro', poder: 'Toque do Vazio', cura: 6 }, 'Espectro')).toEqual({ texto: 'Espectro usa Toque do Vazio e recupera 6 de Vida', valor: '−12' })
    expect(descreverTurno({ ...base, atacante: 'ajudante', alvo: 'Lobo Jovem' }, 'Lobo')).toEqual({ texto: 'Lobo Jovem ataca', valor: '−12' })
    expect(descreverTurno({ ...base, atacante: 'jogador', habilidade: 'Corte Duplo' }, 'Lobo').texto).toBe('Você usa Corte Duplo')
    expect(descreverTurno({ ...base, atacante: 'jogador', dano: 0, habilidade: 'Despertar do Éter', cura: 30 }, 'Lobo')).toEqual({
      texto: 'Despertar do Éter: recupera Vida',
      valor: '+30',
    })
    expect(descreverTurno({ ...base, atacante: 'monstro', dano: 0, esquiva: true }, 'Lobo')).toEqual({
      texto: 'Lobo ataca, e você esquiva',
      valor: '0',
    })
    expect(descreverTurno({ ...base, atacante: 'jogador', dano: 0, esquiva: true }, 'Goblin')).toEqual({
      texto: 'Você golpeia, e Goblin esquiva',
      valor: '0',
    })
    expect(descreverTurno({ ...base, atacante: 'jogador', habilidade: 'Corte Duplo', dano: 0, esquiva: true }, 'Goblin')).toEqual({
      texto: 'Você usa Corte Duplo, e Goblin esquiva',
      valor: '0',
    })
  })
})

describe('rpg - maestria', () => {
  it('descreve o grau e quanto falta', async () => {
    const { textoDaMaestria } = await import('./rpg')
    expect(textoDaMaestria({ tipo: 'comum', maestria: 1, faltam_maestria: 20 })).toBe('Maestria I · faltam 20 usos')
    expect(textoDaMaestria({ tipo: 'comum', maestria: 3, faltam_maestria: 1 })).toBe('Maestria III · faltam 1 uso')
    expect(textoDaMaestria({ tipo: 'comum', maestria: 4, faltam_maestria: 0 })).toBe('Maestria IV · máxima')
    expect(textoDaMaestria({ tipo: 'unica', maestria: 0, faltam_maestria: 0 })).toBe('')
    expect(textoDaMaestria({ tipo: 'comum' })).toBe('')
  })
})

describe('rpg - bestiário', () => {
  it('resume vitórias, marco e quanto falta', async () => {
    const { textoDoBestiario } = await import('./rpg')
    expect(textoDoBestiario(undefined)).toBe('')
    expect(textoDoBestiario({ vitorias: 1, marco: 0, faltam_marco: 9, bonus_ouro: 0 })).toBe('1 vitória · faltam 9 para o próximo marco')
    expect(textoDoBestiario({ vitorias: 12, marco: 1, faltam_marco: 38, bonus_ouro: 10 })).toBe('12 vitórias · Caçador I · +10% de Ouro · faltam 38 para o próximo marco')
    expect(textoDoBestiario({ vitorias: 200, marco: 3, faltam_marco: 0, bonus_ouro: 30 })).toBe('200 vitórias · Caçador III · +30% de Ouro · todos os marcos')
  })
})

describe('relacaoElemental', () => {
  it('segue a roda e Luz contra Trevas, com Éter neutro', async () => {
    const { relacaoElemental } = await import('./rpg')
    expect(relacaoElemental('fogo', 'terra')).toBe('vantagem')
    expect(relacaoElemental('terra', 'fogo')).toBe('desvantagem')
    expect(relacaoElemental('luz', 'trevas')).toBe('vantagem')
    expect(relacaoElemental('trevas', 'luz')).toBe('vantagem')
    expect(relacaoElemental('eter', 'fogo')).toBe('neutro')
    expect(relacaoElemental(undefined, 'eter')).toBe('neutro')
  })
})

describe('requisitos de atributo', () => {
  const base = { forca: 16, inteligencia: 8, constituicao: 16, agilidade: 10, destreza: 10, sorte: 7 }
  const espada = { id: 'e', slot: 'arma', nome: 'Espada', descricao: '', raridade: 'raro', vida: 0, ataque: 17, defesa: 0, nivel_minimo: 12, requisitos: { forca: 19 } } as const
  const estado = (pontos: Partial<Record<string, number>>) =>
    ({
      nivel: 12,
      base: {},
      atributos: {},
      slots: [{ slot: 'arma', item: espada }],
      inventario: [],
      primarios_base: base,
      pontos: { forca: 0, inteligencia: 0, constituicao: 0, agilidade: 0, destreza: 0, sorte: 0, ...pontos },
      pontos_disponiveis: 22,
    }) as unknown as EstadoEquipamento

  it('escreve os requisitos na ordem da tela', () => {
    expect(textoDosRequisitos({ destreza: 20, forca: 30 })).toBe('Força 30 e Destreza 20')
    expect(textoDosRequisitos(undefined)).toBe('')
  })

  it('avisa quem fica inativo e quem volta a valer ao mudar os pontos', () => {
    const zerado = { forca: 0, inteligencia: 0, constituicao: 0, agilidade: 0, destreza: 0, sorte: 0 }
    const comForca = estado({ forca: 3 })
    expect(itensAfetadosPelosPontos(comForca, { ...zerado, constituicao: 3 })).toEqual({
      desativam: [{ nome: 'Espada', requisito: 'Força 19' }],
      reativam: [],
    })
    expect(itensAfetadosPelosPontos(estado({}), { ...zerado, forca: 3 })).toEqual({ desativam: [], reativam: ['Espada'] })
    expect(itensAfetadosPelosPontos(comForca, { ...zerado, forca: 5 })).toEqual({ desativam: [], reativam: [] })
  })
})
