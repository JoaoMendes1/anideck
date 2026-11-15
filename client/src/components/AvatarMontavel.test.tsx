// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import AvatarMontavel from './AvatarMontavel'

afterEach(cleanup)

describe('AvatarMontavel', () => {
  it('mostra o retrato quando recebe um, mesmo sem avatar salvo', () => {
    const { container } = render(<AvatarMontavel retrato="rosto.webp" nome="Ana" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('rosto.webp')
  })

  it('sem avatar, foto nem retrato, mostra a inicial', () => {
    const { container } = render(<AvatarMontavel nome="ana" />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toBe('A')
  })

  it('sem avatar salvo, a foto da conta vem antes do retrato', () => {
    const { container } = render(<AvatarMontavel url="foto.jpg" retrato="rosto.webp" nome="Ana" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('foto.jpg')
  })
})
