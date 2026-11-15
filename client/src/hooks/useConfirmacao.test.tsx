// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useConfirmacao } from './useConfirmacao'

afterEach(cleanup)

function Tela({ aoResponder }: { aoResponder: (ok: boolean) => void }) {
  const { confirmar, dialogo } = useConfirmacao()
  return (
    <>
      <button onClick={async () => aoResponder(await confirmar({ titulo: 'Expulsar membro', mensagem: 'Expulsar Ana do clã?', rotuloConfirmar: 'Expulsar', perigoso: true }))}>
        abrir
      </button>
      {dialogo}
    </>
  )
}

async function abrir() {
  await act(async () => { fireEvent.click(screen.getByText('abrir')) })
}

describe('useConfirmacao', () => {
  it('não mostra nada antes de alguém perguntar', () => {
    render(<Tela aoResponder={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('resolve true quando a pessoa confirma', async () => {
    const aoResponder = vi.fn()
    render(<Tela aoResponder={aoResponder} />)
    await abrir()

    expect(screen.getByRole('dialog', { name: 'Expulsar membro' })).toBeTruthy()
    expect(screen.getByText('Expulsar Ana do clã?')).toBeTruthy()

    await act(async () => { fireEvent.click(screen.getByText('Expulsar')) })
    expect(aoResponder).toHaveBeenCalledWith(true)
  })

  it('resolve false no Cancelar e na tecla Esc', async () => {
    const aoResponder = vi.fn()
    render(<Tela aoResponder={aoResponder} />)

    await abrir()
    await act(async () => { fireEvent.click(screen.getByText('Cancelar')) })
    expect(aoResponder).toHaveBeenLastCalledWith(false)

    await abrir()
    await act(async () => { fireEvent.keyDown(window, { key: 'Escape' }) })
    expect(aoResponder).toHaveBeenCalledTimes(2)
    expect(aoResponder).toHaveBeenLastCalledWith(false)
  })

  it('abre com o foco em Cancelar e devolve o foco ao fechar', async () => {
    render(<Tela aoResponder={() => {}} />)
    screen.getByText('abrir').focus()
    await abrir()
    expect(document.activeElement).toBe(screen.getByText('Cancelar'))

    await act(async () => { fireEvent.click(screen.getByText('Cancelar')) })
    expect(document.activeElement).toBe(screen.getByText('abrir'))
  })

  it('responde false se a tela sai com a pergunta aberta', async () => {
    const aoResponder = vi.fn()
    const { unmount } = render(<Tela aoResponder={aoResponder} />)
    await abrir()
    await act(async () => { unmount() })
    expect(aoResponder).toHaveBeenCalledWith(false)
  })
})
