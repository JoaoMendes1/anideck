import { describe, it, expect } from 'vitest'
import { IDS_COM_ARTE, arteDoItem, arteDoMonstro } from './artesRpg'

// Catálogos do sql/071 e do sql/072: todo id precisa de arte.
const ITENS = [
  'espada_de_ferro', 'gibao_de_viajante', 'capa_de_viajante', 'botas_de_couro', 'anel_de_cobre',
  'lamina_de_eter', 'cota_de_malha', 'capa_das_runas', 'botas_do_batedor', 'amuleto_de_eter',
  'espada_da_aurora', 'armadura_do_veterano', 'manto_estelar', 'grevas_de_ferro_negro', 'selo_do_guardiao',
  'lamina_primordial', 'egide_primordial',
]
const MONSTROS = [
  'slime_de_eter', 'goblin_batedor', 'lobo_sombrio', 'golem_de_runas',
  'espectro_do_vazio', 'cavaleiro_caido', 'dragao_de_eter', 'primordial_esquecido',
]

describe('artes de monstros e itens', () => {
  it('todo item e todo monstro do catálogo tem arte', () => {
    for (const id of ITENS) expect(arteDoItem(id), id).toBeTruthy()
    for (const id of MONSTROS) expect(arteDoMonstro(id), id).toBeTruthy()
    expect(IDS_COM_ARTE.itens).toHaveLength(ITENS.length)
    expect(IDS_COM_ARTE.monstros).toHaveLength(MONSTROS.length)
  })

  it('id desconhecido ou vazio não tem arte', () => {
    expect(arteDoItem('nao_existe')).toBeUndefined()
    expect(arteDoItem(undefined)).toBeUndefined()
    expect(arteDoMonstro('toString')).toBeUndefined()
  })
})
