import { describe, it, expect } from 'vitest'
import { obterEstiloRank, obterClasseCartaInsignia, ehMotivoReduzido } from './guilda'

describe('utilitários visuais da Guilda', () => {
  it('devolve estilo padrão F para rank desconhecido e estilo específico para C e SS', () => {
    expect(obterEstiloRank(undefined).seloTexto).toBe('text-muted')
    expect(obterEstiloRank('C').seloTexto).toBe('text-holo-2')
    expect(obterEstiloRank('SS').seloTexto).toBe('text-holo')
  })

  it('aplica classe de bloqueio para insígnia não conquistada e gradiente para conquistada', () => {
    const bloqueada = obterClasseCartaInsignia(
      {
        id: 'coruja',
        icone: '🌙',
        nome: 'Coruja',
        descricao: '12 madrugadas',
        regra: 'madrugadas',
        estilo: 'foil',
        desbloqueada: false,
        progresso_atual: 3,
        meta: 12,
      },
      0,
    )
    expect(bloqueada).toContain('bg-panel-2')

    const conquistada = obterClasseCartaInsignia(
      {
        id: 'coruja',
        icone: '🌙',
        nome: 'Coruja',
        descricao: '12 madrugadas',
        regra: 'madrugadas',
        estilo: 'foil',
        desbloqueada: true,
        progresso_atual: 12,
        meta: 12,
      },
      0,
    )
    expect(conquistada).toContain('card-g1')
  })

  it('identifica motivos de XP reduzido ou teto diário', () => {
    expect(ehMotivoReduzido('episódio base · 100%')).toBe(false)
    expect(ehMotivoReduzido('antes do próximo sair · +10')).toBe(false)
    expect(ehMotivoReduzido('retorno decrescente · 75%')).toBe(true)
    expect(ehMotivoReduzido('teto diário atingido')).toBe(true)
  })
})
