// client/src/lib/elenco.test.ts
import { describe, it, expect } from 'vitest'
import {
  ARTES,
  ELENCO,
  ORDEM_DOS_ESTAGIOS,
  PERSONAGEM_BASE_PADRAO,
  aceitaSkins,
  arteDoEstagio,
  membroDoElenco,
  montarCatalogoDeArtes,
  retratoDoEstagio,
  rotuloDaClasse,
  rotuloDoElemento,
  temArtePropria,
} from './personagem'

describe('elenco - catálogo montado pelos arquivos', () => {
  it('lê personagem, estágio e versão do nome do arquivo', () => {
    const catalogo = montarCatalogoDeArtes({
      '../assets/personagem/maga-agua-iniciante.webp': 'a.webp',
      '../assets/personagem/maga-agua-iniciante-mini.webp': 'a-mini.webp',
      '../assets/personagem/maga-agua-iniciante-retrato.webp': 'a-retrato.webp',
    })
    expect(catalogo.maga_agua?.iniciante).toEqual({ inteira: 'a.webp', mini: 'a-mini.webp', retrato: 'a-retrato.webp' })
  })

  it('deixa de fora o estágio sem as três versões e o arquivo fora do padrão', () => {
    const catalogo = montarCatalogoDeArtes({
      '../assets/personagem/maga-agua-veterano.webp': 'v.webp',
      '../assets/personagem/maga-agua-veterano-mini.webp': 'v-mini.webp',
      '../assets/personagem/rascunho.webp': 'x.webp',
      '../assets/personagem/maga-agua-mitico.webp': 'm.webp',
    })
    expect(catalogo).toEqual({})
  })
})

describe('elenco - personagens', () => {
  it('todo personagem tem arte em todo estágio, própria ou de reserva', () => {
    for (const membro of ELENCO) {
      expect(temArtePropria(membro.id, 'iniciante', ARTES)).toBe(true)
      for (const estagio of ORDEM_DOS_ESTAGIOS) {
        const arte = arteDoEstagio(membro.id, estagio)
        expect(arte?.inteira, `${membro.id} ${estagio}`).toBeTruthy()
        expect(arte?.retrato, `${membro.id} ${estagio}`).toBeTruthy()
      }
    }
  })

  it('a Paladina usa a arte de Veterana enquanto a Lendária não existe', () => {
    if (temArtePropria('paladina_luz', 'lendario')) return
    expect(arteDoEstagio('paladina_luz', 'lendario')).toBe(arteDoEstagio('paladina_luz', 'veterano'))
  })

  it('cada personagem tem rosto próprio no retrato', () => {
    const retratos = new Set(ELENCO.map((m) => retratoDoEstagio('iniciante', m.id)))
    expect(retratos.size).toBe(ELENCO.length)
  })

  it('classe e elemento de todos têm rótulo em português', () => {
    for (const membro of ELENCO) {
      expect(rotuloDaClasse(membro.classe)).not.toBe(membro.classe)
      expect(rotuloDoElemento(membro.elemento)).not.toBe(membro.elemento)
    }
  })

  it('id desconhecido cai no personagem padrão', () => {
    expect(membroDoElenco('dragao_secreto').id).toBe(PERSONAGEM_BASE_PADRAO)
    expect(membroDoElenco(undefined).id).toBe(PERSONAGEM_BASE_PADRAO)
    expect(membroDoElenco('maga_agua').nome).toBe('Mizuki')
  })

  it('só o Espadachim veste os trajes da Loja', () => {
    expect(aceitaSkins(undefined)).toBe(true)
    expect(aceitaSkins(PERSONAGEM_BASE_PADRAO)).toBe(true)
    expect(aceitaSkins('paladina_luz')).toBe(false)
  })
})
