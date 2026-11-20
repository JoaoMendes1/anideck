// client/src/components/rpg/ConfrontoElemental.tsx
// O confronto entre o herói e o monstro, dito do ponto de vista do jogador: quem leva vantagem
// de elemento, a fraqueza do monstro e o efeito que os golpes de cada lado deixam. A classe do
// herói não entra: no combate, só o elemento muda o dano.
import { Check, Minus, ShieldAlert, Swords, X } from 'lucide-react'
import { elementoQueVence, relacaoElemental, type EfeitoDeElemento } from '../../lib/rpg'
import { rotuloDoElemento } from '../../lib/personagem'

export default function ConfrontoElemental({
  nomeDoMonstro,
  elementoMonstro,
  efeitoMonstro,
  elementoHeroi,
  efeitoHeroi,
}: {
  nomeDoMonstro: string
  elementoMonstro?: string
  efeitoMonstro?: EfeitoDeElemento
  elementoHeroi?: string
  efeitoHeroi?: EfeitoDeElemento
}) {
  const relacao = relacaoElemental(elementoHeroi, elementoMonstro)
  const fraqueza = elementoQueVence(elementoMonstro)
  const seu = rotuloDoElemento(elementoHeroi) || 'neutro'
  const dele = rotuloDoElemento(elementoMonstro) || 'neutro'

  const linhaElemento =
    relacao === 'vantagem'
      ? { Icone: Check, cor: 'text-green', texto: `Vantagem sua: ${seu} vence ${dele}. Você causa 10% mais dano, e ele um pouco menos em você.` }
      : relacao === 'desvantagem'
        ? { Icone: X, cor: 'text-coral', texto: `Vantagem dele: ${dele} vence ${seu}. ${nomeDoMonstro} causa 10% mais dano em você.` }
        : { Icone: Minus, cor: 'text-muted', texto: `Sem vantagem de elemento: ${seu} contra ${dele}, nenhum lado tem bônus.` }

  return (
    <section aria-label="Confronto" className="flex flex-col gap-1.5 rounded-xl border border-line bg-void/45 p-3 text-xs leading-snug">
      <h3 className="m-0 font-mono text-xs font-semibold uppercase tracking-wider text-muted">
        Confronto: você ({seu}) × {nomeDoMonstro} ({dele})
      </h3>
      <p className={`m-0 flex items-start gap-1.5 font-bold ${linhaElemento.cor}`}>
        <linhaElemento.Icone size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{linhaElemento.texto}</span>
      </p>
      <p className="m-0 text-muted">
        {fraqueza
          ? `Fraqueza de ${nomeDoMonstro}: heróis de ${rotuloDoElemento(fraqueza)}${fraqueza === elementoHeroi ? ' (o seu)' : ''}.`
          : `${nomeDoMonstro} não tem fraqueza de elemento.`}
      </p>
      {efeitoHeroi && (
        <p className="m-0 flex items-start gap-1.5 text-text">
          <Swords size={13} className="mt-0.5 shrink-0 text-holo-3" aria-hidden="true" />
          <span>
            <strong className="text-holo-3">Seus golpes podem causar {efeitoHeroi.nome}: </strong>
            {efeitoHeroi.descricao}
          </span>
        </p>
      )}
      {efeitoMonstro && (
        <p className="m-0 flex items-start gap-1.5 text-text">
          <ShieldAlert size={13} className="mt-0.5 shrink-0 text-coral" aria-hidden="true" />
          <span>
            <strong className="text-coral">Golpes de {nomeDoMonstro} podem causar {efeitoMonstro.nome} em você: </strong>
            {efeitoMonstro.descricao}
          </span>
        </p>
      )}
    </section>
  )
}
