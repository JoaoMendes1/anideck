// client/src/components/personagem/ResumoDeCombate.tsx
// Faixa logo abaixo da arte, no celular: os números da luta, o Ouro e os atalhos para lutar,
// sem precisar rolar até as abas. No desktop a coluna da direita já mostra tudo isso.
import { Link } from 'react-router-dom'
import { DoorOpen, Heart, Shield, Sparkles, Sword, Swords, Zap } from 'lucide-react'
import type { EstadoEquipamento } from '../../lib/rpg'
import IconeOuro from '../IconeOuro'

function Numero({ icone, rotulo, valor }: { icone: React.ReactNode; rotulo: string; valor: number }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 rounded-xl bg-panel-2 px-1 py-2">
      <span className="flex items-center gap-1 text-[11px] font-semibold text-muted">
        {icone}
        {rotulo}
      </span>
      <span className="font-anton text-lg leading-none text-text">{valor}</span>
    </div>
  )
}

export default function ResumoDeCombate({ estado, aoAbrirAtributos }: { estado: EstadoEquipamento; aoAbrirAtributos: () => void }) {
  const a = estado.atributos
  const pontos = estado.pontos_disponiveis ?? 0
  const usados =
    (estado.pontos?.forca ?? 0) +
    (estado.pontos?.inteligencia ?? 0) +
    (estado.pontos?.constituicao ?? 0) +
    (estado.pontos?.agilidade ?? 0) +
    (estado.pontos?.destreza ?? 0) +
    (estado.pontos?.sorte ?? 0)
  const livres = Math.max(0, pontos - usados)
  return (
    <section aria-label="Resumo de combate" className="flex flex-col gap-2.5 rounded-2xl border border-line bg-panel p-3 lg:hidden">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Numero icone={<Zap size={12} className="text-holo-2" aria-hidden="true" />} rotulo="Poder" valor={a.poder} />
        <Numero icone={<Heart size={12} className="text-coral" aria-hidden="true" />} rotulo="Vida" valor={a.vida} />
        <Numero icone={<Sword size={12} className="text-gold" aria-hidden="true" />} rotulo="Ataque" valor={a.ataque} />
        <Numero icone={<Shield size={12} className="text-holo-3" aria-hidden="true" />} rotulo="Defesa" valor={a.defesa} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-gold">
          <IconeOuro size={13} /> {(estado.ouro ?? 0).toLocaleString('pt-BR')} de Ouro
        </span>
        {livres > 0 && (
          <button
            type="button"
            onClick={aoAbrirAtributos}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-gold/60 bg-gold/15 px-3 font-bold text-gold"
          >
            <Sparkles size={12} aria-hidden="true" /> {livres} {livres === 1 ? 'ponto' : 'pontos'} para distribuir
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link to="/expedicoes" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-sm font-extrabold text-void">
          <Swords size={15} aria-hidden="true" /> Expedições
        </Link>
        <Link to="/masmorras" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-holo-2/50 bg-holo-2/10 text-sm font-bold text-text">
          <DoorOpen size={15} className="text-holo-2" aria-hidden="true" /> Masmorras
        </Link>
      </div>
    </section>
  )
}
