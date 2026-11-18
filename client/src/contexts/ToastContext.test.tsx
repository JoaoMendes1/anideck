// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { useEffect } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { ToastProvider, useToast } from './ToastContext'

afterEach(cleanup)

// Imita uma tela que carrega dados num efeito e avisa quando a carga falha.
function TelaQueFalha({ aoCarregar }: { aoCarregar: () => number }) {
  const { showToast } = useToast()
  useEffect(() => {
    // O teto impede que o defeito, se voltar, trave a suíte em vez de reprovar o teste.
    if (aoCarregar() > 20) return
    showToast('Não foi possível carregar.', 'error')
  }, [showToast, aoCarregar])
  return null
}

describe('ToastProvider', () => {
  it('mantém a mesma função showToast depois de exibir um aviso', () => {
    const vistas: unknown[] = []
    function Espia() {
      const { showToast } = useToast()
      vistas.push(showToast)
      return <button onClick={() => showToast('ok')}>avisar</button>
    }
    const { getByText } = render(<ToastProvider><Espia /></ToastProvider>)
    act(() => getByText('avisar').click())
    expect(new Set(vistas).size).toBe(1)
  })

  it('não repete a carga de uma tela que avisa o próprio erro', () => {
    let cargas = 0
    const aoCarregar = () => ++cargas
    render(<ToastProvider><TelaQueFalha aoCarregar={aoCarregar} /></ToastProvider>)
    expect(cargas).toBe(1)
  })

  it('aviso escondido não bloqueia o toque nos botões da base da tela', () => {
    const { container } = render(<ToastProvider><span /></ToastProvider>)
    const caixa = container.querySelector('[role="status"] > div')
    expect(caixa?.className).toContain('pointer-events-none')
    expect(caixa?.className).not.toContain('pointer-events-auto')
  })
})
