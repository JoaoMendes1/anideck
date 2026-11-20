import { describe, it, expect } from 'vitest'
import { IDS_COM_ARTE, arteDoItem, arteDoMaterial, arteDoMonstro } from './artesRpg'
import { MATERIAIS } from './forja'

// Catálogos do sql/071, do sql/072 e do sql/121: todo id precisa de arte.
const ITENS = [
  'espada_de_ferro', 'gibao_de_viajante', 'capa_de_viajante', 'botas_de_couro', 'anel_de_cobre',
  'lamina_de_eter', 'cota_de_malha', 'capa_das_runas', 'botas_do_batedor', 'amuleto_de_eter',
  'espada_da_aurora', 'armadura_do_veterano', 'manto_estelar', 'grevas_de_ferro_negro', 'selo_do_guardiao',
  'lamina_primordial', 'egide_primordial',
  // sql/119, sql/126 e sql/127 (packs de 20/11)
  'varinha_de_aprendiz', 'cajado_de_safira', 'lanca_de_madeira', 'adaga_simples', 'adaga_sombria',
  'maca_consagrada', 'machado_de_lenhador', 'machado_de_ferro', 'machado_de_guerra', 'sabre_do_mercenario',
  'anel_de_prata', 'botas_ferradas', 'capa_de_couro_reforcado', 'peitoral_de_aco', 'brunea_reforcada',
  'capuz_de_couro', 'elmo_de_ferro', 'tiara_de_brasas', 'capuz_da_mare', 'elmo_do_trovao',
  'diadema_solar', 'mascara_de_eter', 'luvas_de_couro', 'braceletes_de_ferro', 'manoplas_de_brasa',
  'luvas_da_corrente', 'luvas_estaticas', 'manoplas_consagradas', 'luvas_do_eter', 'lanca_de_brasa',
  'lanca_vulcanica', 'adagas_gemeas_do_trovao', 'tomo_da_mare', 'cajado_da_mare', 'martelo_de_pedra',
  'machado_de_granito', 'maca_da_alvorada', 'katana_do_eter', 'sabre_relampago', 'anel_veloz',
  'colar_do_cacador', 'anel_de_brasa', 'pingente_da_mare', 'anel_do_trovao', 'amuleto_de_rocha',
  'broche_solar', 'talisma_do_eter',
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
  // Clareira Inicial
  'slime_espinhoso', 'cogumelo_esporifero', 'vespa_eletrica', 'golem_musgoso',
  // Bosque Sombrio
  'arvore_de_esporos', 'slime_de_cranios', 'planta_carnivora', 'druida_da_floresta',
  'centopeia_toxica', 'ent_apodrecido', 'alquimista_da_praga', 'wyvern_esmeralda',
  // Fendas Vulcânicas
  'javali_vulcanico', 'aranha_rubra', 'cao_de_magma', 'fera_de_obsidiana',
  'golem_de_magma', 'beemote_de_lava', 'fenix_solar',
  // Picos Glaciais
  'serpente_marinha', 'revena_glacial', 'grifo_glacial', 'aranha_glacial',
  'golem_de_gelo', 'yeti_glacial', 'leviata_relampago', 'cavaleiro_da_geada',
  'colosso_glacial', 'dragao_glacial', 'lorde_da_geada',
  // Ruínas do Vazio
  'espectro_acorrentado', 'fragmento_do_olho', 'fantasma_do_vazio', 'lobo_abissal',
  'golem_flutuante', 'beemote_fungico', 'ceifador_sombrio', 'vortex_do_olho',
  'slime_do_vazio', 'ceifador_espectral', 'colosso_runico', 'golem_do_vazio',
  // Santuário Astral
  'beholder_abissal', 'lich_das_sombras', 'dragao_esqueleto', 'grifo_dourado',
  'serpente_espectral', 'rei_lich', 'draconato_do_trovao', 'serafim_celestial',
  'kraken_abissal',
  // Cume Ancestral
  'dragao_tempestade', 'dragao_do_vazio', 'senhor_infernal', 'arcanjo_blindado',
  'horror_da_fenda',
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
