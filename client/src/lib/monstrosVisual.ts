// client/src/lib/monstrosVisual.ts
// Ícone provisório e estilo por tipo de monstro, usados nas Expedições e nas Masmorras.
import { Bug, Crown, Dog, Droplet, Flame, Ghost, Mountain, Skull, type LucideIcon } from 'lucide-react'

export const ICONE_DO_MONSTRO: Record<string, LucideIcon> = {
  slime_de_eter: Droplet,
  goblin_batedor: Bug,
  lobo_sombrio: Dog,
  golem_de_runas: Mountain,
  espectro_do_vazio: Ghost,
  cavaleiro_caido: Skull,
  dragao_de_eter: Flame,
  primordial_esquecido: Crown,
}

export const ESTILO_DO_TIPO: Record<string, { rotulo: string; borda: string; icone: string }> = {
  comum: { rotulo: 'Comum', borda: 'border-line', icone: 'text-holo-3 bg-holo-3/10' },
  raro: { rotulo: 'Raro', borda: 'border-holo-2/60', icone: 'text-holo-2 bg-holo-2/15' },
  chefe: { rotulo: 'Chefão', borda: 'border-gold/60', icone: 'text-gold bg-gold/15' },
}

export const ICONE_PADRAO_DO_MONSTRO = Skull
