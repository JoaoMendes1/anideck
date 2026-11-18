import { describe, it, expect } from 'vitest'
import { IDS_COM_ARTE, arteDoItem, arteDoMaterial, arteDoMonstro } from './artesRpg'
import { MATERIAIS } from './forja'

// Catálogos do sql/071, do sql/072 e do sql/121: todo id precisa de arte.
const ITENS = [
  'espada_de_ferro', 'gibao_de_viajante', 'capa_de_viajante', 'botas_de_couro', 'anel_de_cobre',
  'lamina_de_eter', 'cota_de_malha', 'capa_das_runas', 'botas_do_batedor', 'amuleto_de_eter',
  'espada_da_aurora', 'armadura_do_veterano', 'manto_estelar', 'grevas_de_ferro_negro', 'selo_do_guardiao',
  'lamina_primordial', 'egide_primordial',
  // sql/121
  'lamina_glacial', 'espada_carmesim', 'espada_solar', 'adaga_abissal', 'foice_do_vazio',
  'lanca_da_tempestade', 'cajado_arcano', 'grimorio_sombrio', 'orbe_arcano', 'arco_silvestre',
  'elmo_alado', 'capuz_das_sombras', 'coroa_real', 'elmo_demoniaco', 'elmo_silvestre',
  'armadura_glacial', 'armadura_carmesim', 'armadura_da_aurora', 'manto_arcano', 'manoplas_glaciais',
  'garras_sombrias', 'manoplas_da_aurora', 'botas_glaciais', 'botas_sombrias', 'botas_da_aurora',
  'capa_carmesim', 'capa_real', 'capa_arcana', 'anel_de_safira', 'colar_de_ametista',
  'medalhao_estelar', 'martelo_da_montanha', 'machado_do_nucleo', 'lanca_carmesim', 'lanca_de_ferro',
  'adaga_do_relampago', 'martelo_sagrado', 'elmo_de_pedra', 'armadura_de_pedra', 'manoplas_de_pedra',
  'botas_de_pedra',
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

  it('todo material da Forja tem arte', () => {
    for (const m of MATERIAIS) expect(arteDoMaterial(m.id), m.id).toBeTruthy()
  })

  it('id desconhecido ou vazio não tem arte', () => {
    expect(arteDoItem('nao_existe')).toBeUndefined()
    expect(arteDoItem(undefined)).toBeUndefined()
    expect(arteDoMonstro('toString')).toBeUndefined()
  })
})
