import { describe, it, expect } from 'vitest'
import { normalizarAvatar, interpretarRespostaAvatar, AVATAR_PADRAO } from './avatar'

describe('normalizarAvatar', () => {
  it('retorna os valores padrão quando recebe null ou undefined', () => {
    expect(normalizarAvatar(null)).toEqual(AVATAR_PADRAO)
    expect(normalizarAvatar(undefined)).toEqual(AVATAR_PADRAO)
    expect(normalizarAvatar({})).toEqual(AVATAR_PADRAO)
  })

  it('mantém campos válidos e substitui campos corrompidos pelos padrões', () => {
    const input = {
      base: 'quadrado',
      pele: '#d4a373',
      olhos: 'desconhecido_invalido',
      cor_olhos: '#ff0000',
      boca: 'gato',
      cabelo: 'estilo_inexistente',
      cor_cabelo: '#ffffff',
      acessorio: 'fone',
      fundo: 'cyber',
    }

    const resultado = normalizarAvatar(input)
    expect(resultado.base).toBe('quadrado')
    expect(resultado.pele).toBe('#d4a373')
    expect(resultado.olhos).toBe(AVATAR_PADRAO.olhos) // fallback para padrao
    expect(resultado.cor_olhos).toBe('#ff0000')
    expect(resultado.boca).toBe('gato')
    expect(resultado.cabelo).toBe(AVATAR_PADRAO.cabelo) // fallback para padrao
    expect(resultado.cor_cabelo).toBe('#ffffff')
    expect(resultado.acessorio).toBe('fone')
    expect(resultado.fundo).toBe('cyber')
  })

  it('preserva uma configuração completamente válida', () => {
    const avatar = {
      base: 'losango' as const,
      pele: '#fed7aa',
      olhos: 'determinado' as const,
      cor_olhos: '#10b981',
      boca: 'foco' as const,
      cabelo: 'longo' as const,
      cor_cabelo: '#a855f7',
      acessorio: 'coroa' as const,
      fundo: 'sunset' as const,
    }

    expect(normalizarAvatar(avatar)).toEqual(avatar)
  })
})

describe('interpretarRespostaAvatar', () => {
  it('reconhece o salvamento confirmado pela função', () => {
    expect(interpretarRespostaAvatar({ ok: true, avatar: AVATAR_PADRAO }, null)).toBe('ok')
    expect(interpretarRespostaAvatar({ ok: true, avatar: null }, null)).toBe('ok')
  })

  it('não trata como salvo quando o usuário ainda não tem perfil', () => {
    expect(interpretarRespostaAvatar({ ok: false, motivo: 'sem_perfil' }, null)).toBe('sem_perfil')
  })

  it('devolve erro quando a chamada falha ou a resposta não confirma', () => {
    expect(interpretarRespostaAvatar(null, { message: 'column "id" does not exist' })).toBe('erro')
    expect(interpretarRespostaAvatar(null, null)).toBe('erro')
    expect(interpretarRespostaAvatar({ ok: false }, null)).toBe('erro')
    expect(interpretarRespostaAvatar('ok', null)).toBe('erro')
  })
})
