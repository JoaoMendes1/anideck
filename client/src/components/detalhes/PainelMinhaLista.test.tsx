// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import PainelMinhaLista from './PainelMinhaLista'
import type { EntradaNoDeck } from '../../lib/detalhes'

vi.mock('../../contexts/SessaoContext', () => ({ useSessao: () => ({ session: { access_token: 't', user: { id: 'u' } } }) }))
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }))

const entrada = (status: string) => ({ id: 'e1', mal_id: 1, tipo: 'anime', status, nota: null, anotacao: '', is_favorite: false }) as unknown as EntradaNoDeck
const quinze = Array.from({ length: 15 }, (_, i) => i + 1)

function painel(status: string, assistidos: number[], obraTerminou = true) {
  return render(
    <PainelMinhaLista malId={1} entrada={entrada(status)} assistidos={assistidos} ultimoDisponivel={15} obraTerminou={obraTerminou} onEntradaMudou={() => {}} onEpisodiosZerados={() => {}} />,
  )
}

describe('PainelMinhaLista: convite para Completo', () => {
  afterEach(cleanup)

  it('aparece para quem está Assistindo e viu todos os episódios de uma obra que terminou', () => {
    painel('Assistindo', quinze)
    expect(screen.getByText('A obra terminou e você viu todos os episódios.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mover para Completo' })).toBeTruthy()
  })

  it('não aparece quando falta episódio ou a obra ainda está em lançamento', () => {
    const faltaUm = painel('Assistindo', quinze.slice(0, 14))
    expect(screen.queryByRole('button', { name: 'Mover para Completo' })).toBeNull()
    faltaUm.unmount()
    painel('Assistindo', quinze, false)
    expect(screen.queryByRole('button', { name: 'Mover para Completo' })).toBeNull()
  })

  it('continua aparecendo para quem está Em Dia', () => {
    painel('Em Dia', quinze.slice(0, 3))
    expect(screen.getByText('A obra terminou. Você está em dia, então já completou.')).toBeTruthy()
  })
})
