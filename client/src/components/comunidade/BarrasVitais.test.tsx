// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import BarrasVitais from './BarrasVitais'
import { REGRAS_COMUNIDADE_PADRAO, type EstadoComunidade } from '../../lib/comunidade'

const estadoBase: EstadoComunidade = {
  perfil: {
    existe: false,
    handle: '',
    nome: '',
    bio: '',
    vitrine: [],
    publico: false,
    descanso_inicio: '',
    descanso_fim: '',
  },
  hp: 100,
  mana: 64,
  mp_max_jogador: 64,
  hp_max_jogador: 170,
  em_descanso: false,
  regras: REGRAS_COMUNIDADE_PADRAO,
}

describe('BarrasVitais', () => {
  it('exibe Vitalidade e Mana escaladas pelo nível do jogador (ex.: 170/170 e 64/64 no nível 15)', () => {
    render(<BarrasVitais estado={estadoBase} nivel={15} />)
    expect(screen.getByLabelText('Vitalidade 170 de 170')).toBeTruthy()
    expect(screen.getByLabelText('Mana 64 de 64')).toBeTruthy()
  })
})
