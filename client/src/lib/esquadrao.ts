// client/src/lib/esquadrao.ts
// Regras de apresentação e previsão do esquadrão (até 3 heróis), reações elementais
// e escala de força do mundo no servidor (rpg_esquadrao.go e rpg_reacoes.go).

export interface ReacaoInfo {
  id: string
  nome: string
  descricao: string
  elementos: [string, string]
}

const CATALOGO_REACOES: ReacaoInfo[] = [
  { id: 'vaporizacao', nome: 'Vaporização', elementos: ['fogo', 'agua'], descricao: '+35% de dano e racha a armadura.' },
  { id: 'tempestade_fogo', nome: 'Tempestade de Fogo', elementos: ['fogo', 'vento'], descricao: '+30% de dano e intensifica Queimadura.' },
  { id: 'sobrecarga', nome: 'Sobrecarga Explosiva', elementos: ['fogo', 'raio'], descricao: '+45% de dano e estilhaça escudos.' },
  { id: 'magma', nome: 'Erupção de Magma', elementos: ['fogo', 'terra'], descricao: '+35% de dano e aplica Queimadura.' },
  { id: 'sobrecarga_eletrica', nome: 'Eletrochoque', elementos: ['agua', 'raio'], descricao: '+30% de dano e chance de atordoar.' },
  { id: 'cristalizacao', nome: 'Cristalização', elementos: ['agua', 'terra'], descricao: '+25% de dano e escudo no herói.' },
  { id: 'nevasca', nome: 'Nevasca', elementos: ['agua', 'vento'], descricao: '+25% de dano e aplica Congelamento.' },
  { id: 'abismo_gelido', nome: 'Maré Sombria', elementos: ['agua', 'trevas'], descricao: '+25% de dano, Veneno e Congelamento.' },
  { id: 'impulso_sismico', nome: 'Abalo Magnético', elementos: ['raio', 'terra'], descricao: '+30% de dano e Armadura Rachada.' },
  { id: 'ciclone_eletrico', nome: 'Ciclone Voltaico', elementos: ['raio', 'vento'], descricao: '+30% de dano e chance de atordoar.' },
  { id: 'descarga_sombria', nome: 'Descarga Sombria', elementos: ['raio', 'trevas'], descricao: '+35% de dano e quebra escudos.' },
  { id: 'tempestade_areia', nome: 'Tempestade de Areia', elementos: ['terra', 'vento'], descricao: '+25% de dano e ofusca o alvo.' },
  { id: 'fissura_abissal', nome: 'Fissura Abissal', elementos: ['terra', 'trevas'], descricao: '+30% de dano e Armadura Rachada.' },
  { id: 'eclipse_toxico', nome: 'Corrosão Sombria', elementos: ['fogo', 'trevas'], descricao: '+25% de dano e 2 doses de Veneno.' },
  { id: 'vendaval_sombrio', nome: 'Eclipse Tóxico', elementos: ['vento', 'trevas'], descricao: '+25% de dano e 2 doses de Veneno.' },
  { id: 'juizo_crepuscular', nome: 'Juízo Crepuscular', elementos: ['luz', 'trevas'], descricao: '+35% de dano e cura o aliado mais ferido.' },
]

function chavePar(a: string, b: string): string {
  return a < b ? `${a}+${b}` : `${b}+${a}`
}

const POR_PAR = new Map<string, ReacaoInfo>(CATALOGO_REACOES.map((r) => [chavePar(r.elementos[0], r.elementos[1]), r]))

/** Reação elemental entre dois elementos distintos, alinhada a BuscarReacaoElemental do Go. */
export function buscarReacaoElemental(a: string | undefined, b: string | undefined): ReacaoInfo | null {
  if (!a || !b || a === 'neutro' || b === 'neutro' || a === b) return null
  const direta = POR_PAR.get(chavePar(a, b))
  if (direta) return direta
  if (a === 'eter' || b === 'eter') {
    return {
      id: 'ressonancia_eter',
      nome: 'Ressonância de Éter',
      elementos: [a, b],
      descricao: '+25% de dano e recupera +5 Éter para todo o esquadrão.',
    }
  }
  if (a === 'luz' || b === 'luz') {
    return {
      id: 'claridade_elemental',
      nome: 'Claridade Elemental',
      elementos: [a, b],
      descricao: '+25% de dano, ofusca o alvo e cura o aliado mais ferido.',
    }
  }
  return null
}

/** Lista única de reações elementais possíveis entre os heróis selecionados no esquadrão. */
export function reacoesDoEsquadrao(elementos: (string | undefined)[]): ReacaoInfo[] {
  const vistas = new Set<string>()
  const saida: ReacaoInfo[] = []
  for (let i = 0; i < elementos.length; i++) {
    for (let j = i + 1; j < elementos.length; j++) {
      const r = buscarReacaoElemental(elementos[i], elementos[j])
      if (r && !vistas.has(r.id)) {
        vistas.add(r.id)
        saida.push(r)
      }
    }
  }
  return saida
}

/** Prévia da escala do monstro contra o esquadrão (espelha EquilibrarMonstroParaGrupo). */
export function preverMonstroParaEsquadrao(
  monstro: { vida: number; ataque: number; defesa: number; poder?: number; nivel: number; magia?: number; tipo: string },
  poderesHerois: number[],
): { vida: number; ataque: number; defesa: number; multVidaPct: number; adaptadoAoMundo: boolean } {
  const n = Math.min(3, poderesHerois.length)
  if (n <= 1) {
    return { vida: monstro.vida, ataque: monstro.ataque, defesa: monstro.defesa, multVidaPct: 100, adaptadoAoMundo: false }
  }
  let vida = Math.floor((monstro.vida * (100 + 75 * (n - 1))) / 100)
  let ataque = Math.max(1, Math.floor((monstro.ataque * (100 + 15 * (n - 1))) / 100))
  let defesa = Math.floor((monstro.defesa * (100 + 12 * (n - 1))) / 100)

  const soma = poderesHerois.reduce((s, p) => s + p, 0)
  const poderMedio = Math.floor(soma / poderesHerois.length)
  const velBase = 3 + Math.floor((monstro.nivel * 4) / 5) + (monstro.tipo === 'chefe' ? 4 : monstro.tipo === 'raro' ? 2 : 0)
  const poderBase = Math.max(
    1,
    monstro.poder ?? Math.floor(monstro.vida / 10) + monstro.ataque * 2 + monstro.defesa * 2 + Math.floor((monstro.magia ?? 0) / 2) + velBase,
  )
  let adaptadoAoMundo = false
  if (poderMedio > Math.floor((poderBase * 125) / 100)) {
    const excesso = Math.min(40, Math.floor((Math.floor((poderMedio * 100) / poderBase) - 125) / 3))
    if (excesso > 0) {
      adaptadoAoMundo = true
      vida = Math.floor((vida * (100 + excesso)) / 100)
      ataque = Math.floor((ataque * (100 + Math.floor(excesso / 2))) / 100)
      defesa = Math.floor((defesa * (100 + Math.floor(excesso / 2))) / 100)
    }
  }
  return {
    vida,
    ataque,
    defesa,
    multVidaPct: Math.round((vida * 100) / Math.max(1, monstro.vida)),
    adaptadoAoMundo,
  }
}
