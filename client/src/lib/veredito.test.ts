import { describe, expect, it } from 'vitest'
import { montarVeredito, type AfinidadeParaVeredito } from './veredito'

const afinidade: AfinidadeParaVeredito[] = [
  { genre: 'Isekai', tier: 'demografia', total_watched: 6 },
  { genre: 'Ação', tier: 'genero', total_watched: 3 },
  { genre: 'Escolar', tier: 'tag_tematica', total_watched: 9 },
  { genre: 'Drama', tier: 'genero', total_watched: 1 },
]

describe('montarVeredito', () => {
  it('monta a frase do especialista com a soma dos dois primeiros', () => {
    const v = montarVeredito(afinidade, 'especialista', 12)
    expect(v).toEqual({ pronto: true, frase: 'Você é especialista: Isekai e Ação são 90% do que você assiste.' })
  })

  it('ignora tag temática, mesmo quando ela é a mais assistida', () => {
    const v = montarVeredito(afinidade, 'equilibrado', 12)
    expect(v.pronto && v.frase).toBe('Isekai lidera o seu gosto com 60%, seguido de Ação com 30%.')
  })

  it('usa a frase do explorador com o percentual do primeiro', () => {
    const v = montarVeredito(afinidade, 'explorador', 12)
    expect(v.pronto && v.frase).toContain('nem Isekai, o que você mais assiste, passa de 60%')
  })

  it('abaixo de 10 animes não conclui nada e diz quantos faltam', () => {
    expect(montarVeredito(afinidade, 'especialista', 7)).toEqual({ pronto: false, faltam: 3 })
  })

  it('conta nova, sem afinidade, não recebe rótulo nenhum', () => {
    expect(montarVeredito([], '', 0)).toEqual({ pronto: false, faltam: 10 })
  })

  it('com dados suficientes mas só tag temática, não conclui', () => {
    const v = montarVeredito([{ genre: 'Escolar', tier: 'tag_tematica', total_watched: 12 }], 'especialista', 12)
    expect(v.pronto).toBe(false)
  })

  it('com um único gênero, fala só dele', () => {
    const v = montarVeredito([{ genre: 'Mecha', tier: 'genero', total_watched: 10 }], '', 10)
    expect(v.pronto && v.frase).toBe('Seu gosto hoje é Mecha: 100% do que você assiste.')
  })
})
