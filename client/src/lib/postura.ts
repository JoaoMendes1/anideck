// client/src/lib/postura.ts
// Postura escolhida antes da luta (a regra está no servidor, rpg_postura.go). Fica lembrada
// neste aparelho, como a velocidade da batalha.

export type Postura = 'equilibrada' | 'agressiva' | 'defensiva'

export const POSTURAS: { id: Postura; rotulo: string; resumo: string }[] = [
  { id: 'agressiva', rotulo: 'Agressiva', resumo: '+12% de Ataque e Magia, -30% de Defesa. Quebra metade do escudo do monstro e só se cura abaixo de 30% da Vida. Boa contra quem se protege ou se cura.' },
  { id: 'equilibrada', rotulo: 'Equilibrada', resumo: 'Sem bônus nem custo. Se cura abaixo de metade da Vida.' },
  { id: 'defensiva', rotulo: 'Defensiva', resumo: '+25% de Defesa, -8% de Ataque e Magia. Resiste a metade dos efeitos do monstro, sofre menos com críticos e se cura abaixo de 65% da Vida. Boa contra quem bate forte ou causa efeitos.' },
]

const CHAVE = 'anideck:postura-batalha'

export function lerPostura(): Postura {
  try {
    const v = window.localStorage.getItem(CHAVE)
    return POSTURAS.some((p) => p.id === v) ? (v as Postura) : 'equilibrada'
  } catch {
    return 'equilibrada'
  }
}

export function salvarPostura(p: Postura): void {
  try {
    window.localStorage.setItem(CHAVE, p)
  } catch {
    // Sem armazenamento: vale só nesta tela.
  }
}
