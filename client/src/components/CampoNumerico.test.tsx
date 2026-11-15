// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import CampoNumerico from './CampoNumerico'

afterEach(cleanup)

function Controlado({ inicial, aoMudar, ...resto }: { inicial: number; aoMudar: (n: number) => void; min?: number; max?: number; step?: number }) {
  const [valor, setValor] = useState(inicial)
  return (
    <>
      <CampoNumerico aria-label="campo" value={valor} aoMudar={(n) => { setValor(n); aoMudar(n) }} {...resto} />
      <button onClick={() => setValor(99)}>restaurar</button>
    </>
  )
}

const campo = () => screen.getByLabelText('campo') as HTMLInputElement

describe('CampoNumerico', () => {
  it('deixa apagar e digitar de novo sem virar zero no meio do caminho', () => {
    const aoMudar = vi.fn()
    render(<Controlado inicial={25} aoMudar={aoMudar} min={1} />)

    fireEvent.change(campo(), { target: { value: '' } })
    expect(campo().value).toBe('')
    expect(aoMudar).not.toHaveBeenCalled()

    fireEvent.change(campo(), { target: { value: '40' } })
    expect(aoMudar).toHaveBeenLastCalledWith(40)
  })

  it('ao sair vazio, volta ao último valor aceito', () => {
    const aoMudar = vi.fn()
    render(<Controlado inicial={25} aoMudar={aoMudar} />)

    fireEvent.change(campo(), { target: { value: '' } })
    fireEvent.blur(campo())

    expect(campo().value).toBe('25')
    expect(aoMudar).not.toHaveBeenCalled()
  })

  it('não avisa valor fora dos limites enquanto digita e ajusta ao sair', () => {
    const aoMudar = vi.fn()
    render(<Controlado inicial={5} aoMudar={aoMudar} min={1} max={10} />)

    fireEvent.change(campo(), { target: { value: '50' } })
    expect(aoMudar).not.toHaveBeenCalled()

    fireEvent.blur(campo())
    expect(campo().value).toBe('10')
    expect(aoMudar).toHaveBeenLastCalledWith(10)
  })

  it('aceita vírgula como separador decimal', () => {
    const aoMudar = vi.fn()
    render(<Controlado inicial={1} aoMudar={aoMudar} step={0.1} />)

    fireEvent.change(campo(), { target: { value: '1,5' } })
    expect(aoMudar).toHaveBeenLastCalledWith(1.5)
  })

  it('os botões e as setas dão um passo e param no limite', () => {
    const aoMudar = vi.fn()
    render(<Controlado inicial={9} aoMudar={aoMudar} min={0} max={10} />)

    fireEvent.click(screen.getByTitle('Aumentar'))
    expect(campo().value).toBe('10')
    expect((screen.getByTitle('Aumentar') as HTMLButtonElement).disabled).toBe(true)

    fireEvent.keyDown(campo(), { key: 'ArrowDown' })
    expect(campo().value).toBe('9')
    expect(aoMudar).toHaveBeenLastCalledWith(9)
  })

  it('acompanha o valor quando ele muda por fora', () => {
    render(<Controlado inicial={5} aoMudar={() => {}} />)
    fireEvent.click(screen.getByText('restaurar'))
    expect(campo().value).toBe('99')
  })
})
