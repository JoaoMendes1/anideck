// client/src/lib/personagem.test.ts
import { describe, it, expect } from 'vitest'
import {
  ARTES,
  ORDEM_DOS_ESTAGIOS,
  arteDoEstagio,
  rotuloDaClasse,
  rotuloDoElemento,
  temArtePropria,
  textoDoProximoEstagio,
  validarNomeDoPersonagem,
  type CatalogoDeArtes,
} from './personagem'

const arte = (nome: string) => ({ inteira: `${nome}.webp`, mini: `${nome}-mini.webp` })

const catalogo: CatalogoDeArtes = {
  espadachim_eter: {
    iniciante: arte('iniciante'),
    aventureiro: arte('aventureiro'),
    lendario: arte('lendario'),
  },
}

describe('personagem - escolha da arte', () => {
  it('usa a ilustração própria quando o estágio tem uma', () => {
    expect(arteDoEstagio('espadachim_eter', 'iniciante', catalogo)?.inteira).toBe('iniciante.webp')
    expect(arteDoEstagio('espadachim_eter', 'lendario', catalogo)?.mini).toBe('lendario-mini.webp')
  })

  it('estágio sem arte usa a do estágio anterior', () => {
    expect(arteDoEstagio('espadachim_eter', 'veterano', catalogo)?.inteira).toBe('aventureiro.webp')
  })

  it('sem nenhum anterior, usa a do estágio seguinte', () => {
    const soLendario: CatalogoDeArtes = { espadachim_eter: { lendario: arte('lendario') } }
    expect(arteDoEstagio('espadachim_eter', 'iniciante', soLendario)?.inteira).toBe('lendario.webp')
  })

  it('personagem fora do catálogo cai no padrão', () => {
    expect(arteDoEstagio('maga_de_fogo', 'aventureiro', catalogo)?.inteira).toBe('aventureiro.webp')
  })

  it('estágio desconhecido cai no primeiro', () => {
    expect(arteDoEstagio('espadachim_eter', 'mitico', catalogo)?.inteira).toBe('iniciante.webp')
  })

  it('catálogo vazio devolve undefined em vez de quebrar', () => {
    expect(arteDoEstagio('espadachim_eter', 'iniciante', {})).toBeUndefined()
  })

  it('aponta quais estágios têm arte própria', () => {
    expect(temArtePropria('espadachim_eter', 'aventureiro', catalogo)).toBe(true)
    expect(temArtePropria('espadachim_eter', 'veterano', catalogo)).toBe(false)
    expect(temArtePropria('maga_de_fogo', 'aventureiro', catalogo)).toBe(false)
  })

  it('o catálogo real cobre todo estágio, com arte própria ou de reserva', () => {
    for (const estagio of ORDEM_DOS_ESTAGIOS) {
      const escolhida = arteDoEstagio('espadachim_eter', estagio)
      expect(escolhida?.inteira).toBeTruthy()
      expect(escolhida?.mini).toBeTruthy()
    }
    expect(temArtePropria('espadachim_eter', 'veterano', ARTES)).toBe(false)
  })
})

describe('personagem - validação do nome', () => {
  it('aceita e limpa nomes válidos', () => {
    expect(validarNomeDoPersonagem('Ren')).toEqual({ nome: 'Ren' })
    expect(validarNomeDoPersonagem('  Ren   Kaze  ')).toEqual({ nome: 'Ren Kaze' })
    expect(validarNomeDoPersonagem("João D'Ávila")).toEqual({ nome: "João D'Ávila" })
    expect(validarNomeDoPersonagem('Ana-Lúcia 2')).toEqual({ nome: 'Ana-Lúcia 2' })
    expect(validarNomeDoPersonagem('レン')).toEqual({ nome: 'レン' })
    expect(validarNomeDoPersonagem('a'.repeat(24)).erro).toBeUndefined()
  })

  it('recusa tamanho fora de 2 a 24', () => {
    expect(validarNomeDoPersonagem('').erro).toBeTruthy()
    expect(validarNomeDoPersonagem('   ').erro).toBeTruthy()
    expect(validarNomeDoPersonagem('A').erro).toBeTruthy()
    expect(validarNomeDoPersonagem('a'.repeat(25)).erro).toBeTruthy()
  })

  it('recusa caracteres fora da lista', () => {
    expect(validarNomeDoPersonagem('<script>').erro).toBeTruthy()
    expect(validarNomeDoPersonagem('Ren@Kaze').erro).toBeTruthy()
    expect(validarNomeDoPersonagem('Ren_Kaze').erro).toBeTruthy()
    expect(validarNomeDoPersonagem('Ren 😀').erro).toBeTruthy()
  })
})

describe('personagem - textos', () => {
  it('traduz classe e elemento, e devolve o próprio id quando não conhece', () => {
    expect(rotuloDaClasse('espadachim')).toBe('Espadachim')
    expect(rotuloDoElemento('eter')).toBe('Éter')
    expect(rotuloDaClasse('mago')).toBe('mago')
    expect(rotuloDaClasse(undefined)).toBe('')
    expect(rotuloDoElemento(undefined)).toBe('')
  })

  it('descreve o próximo estágio, ou o fim da jornada', () => {
    expect(textoDoProximoEstagio({ id: 'veterano', nome: 'Veterano', nivel_minimo: 28 })).toBe('Veterano no nível 28')
    expect(textoDoProximoEstagio(undefined)).toBe('Estágio máximo')
  })
})
