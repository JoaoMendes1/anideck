// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import NumerosDaObra from './NumerosDaObra'

describe('NumerosDaObra (#271 + #272)', () => {
  it('exibe contagens agregadas da comunidade no AniDeck sem expor usuários', () => {
    render(
      <NumerosDaObra
        nota={8.6}
        ranking={42}
        stats={null}
        minhaNota={9}
        comunidade={{
          mal_id: 52991,
          assistindo: 12,
          completo: 34,
          dropado: 3,
          quero_assistir: 19,
          total: 68,
        }}
      />,
    )

    expect(screen.getByText('Comunidade nesta obra')).toBeTruthy()
    expect(screen.getByText('68 pessoas no deck')).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText('34')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('19')).toBeTruthy()
  })

  it('oculta contagens exatas abaixo de 3 e usa total aproximado quando aplicável', () => {
    render(
      <NumerosDaObra
        nota={0}
        stats={null}
        minhaNota={null}
        comunidade={{
          mal_id: 99,
          assistindo: 3,
          completo: 0,
          dropado: -1,
          quero_assistir: 0,
          total: 3,
          total_aproximado: true,
        }}
      />,
    )

    expect(screen.getByText('3+ pessoas no deck')).toBeTruthy()
    expect(screen.getByText('Menos de 3')).toBeTruthy()
  })
})
