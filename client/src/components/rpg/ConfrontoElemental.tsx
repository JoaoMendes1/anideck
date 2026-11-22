// client/src/components/rpg/ConfrontoElemental.tsx
// O confronto entre o herói e o monstro, dito do ponto de vista do jogador: quem leva vantagem
// de elemento, a fraqueza do monstro, o efeito que os golpes de cada lado deixam e os traços do
// monstro que favorecem ou atrapalham a classe do herói.
import { Check, Feather, Gauge, Info, Minus, Shield, ShieldAlert, Swords, Wind, X, Zap } from 'lucide-react'
import type { EstimativaCombate } from '../../lib/combate'
import { elementoQueVence, relacaoElemental, type EfeitoDeElemento, type TracoMonstro } from '../../lib/rpg'
import { rotuloDaClasse, rotuloDoElemento } from '../../lib/personagem'

export default function ConfrontoElemental({
  nomeDoMonstro,
  elementoMonstro,
  efeitoMonstro,
  elementoHeroi,
  efeitoHeroi,
  tracos,
  classeHeroi,
  estimativa,
}: {
  nomeDoMonstro: string
  elementoMonstro?: string
  efeitoMonstro?: EfeitoDeElemento
  elementoHeroi?: string
  efeitoHeroi?: EfeitoDeElemento
  tracos?: TracoMonstro[]
  classeHeroi?: string
  estimativa?: EstimativaCombate
}) {
  const classe = rotuloDaClasse(classeHeroi)
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
      {(tracos ?? []).map((t) => {
        const fator = t.fator_classe ?? 1
        const pct = Math.round((fator - 1) * 100)
        const efeito = pct > 0 ? `você causa ${pct}% mais dano` : pct < 0 ? `você causa ${-pct}% menos dano` : 'sem diferença para você'
        return (
          <p key={t.id} className="m-0 flex items-start gap-1.5 text-text">
            <Feather size={13} className={`mt-0.5 shrink-0 ${pct > 0 ? 'text-green' : pct < 0 ? 'text-coral' : 'text-muted'}`} aria-hidden="true" />
            <span>
              <strong>{t.nome}: </strong>
              {t.descricao}{' '}
              {classe && <strong className={pct > 0 ? 'text-green' : pct < 0 ? 'text-coral' : 'text-muted'}>Você ({classe}): {efeito}.</strong>}
            </span>
          </p>
        )
      })}
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
      {estimativa && (
        <div className="mt-1 flex flex-col gap-1.5 rounded-xl border border-holo-3/30 bg-panel-2/60 p-2.5">
          <p className="m-0 inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-holo-3">
            <Info size={12} aria-hidden="true" />
            Probabilidades dinâmicas (seus atributos × alvo)
          </p>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
            <span
              title="Ajustado por Destreza, Ataque vs Defesa do alvo e diferença de Velocidade"
              className="inline-flex items-center gap-1 text-gold"
            >
              <Zap size={12} aria-hidden="true" /> Crítico real: <strong>{estimativa.criticoJogadorPct}%</strong>
            </span>
            <span
              title="Ajustada pela diferença entre sua Velocidade e a do monstro"
              className="inline-flex items-center gap-1 text-holo-3"
            >
              <Wind size={12} aria-hidden="true" /> Sua esquiva: <strong>{estimativa.esquivaJogadorPct}%</strong>
            </span>
            <span
              title="Chance de aparar 30% do dano quando sua Defesa acompanha o Ataque do monstro"
              className="inline-flex items-center gap-1 text-green"
            >
              <Shield size={12} aria-hidden="true" /> Bloqueio: <strong>{estimativa.bloqueioJogadorPct}%</strong>
            </span>
            <span
              title="Ordem de iniciativa calculada pela Velocidade (barra ATB)"
              className="inline-flex items-center gap-1 text-holo-2"
            >
              <Gauge size={12} aria-hidden="true" /> Abre:{' '}
              <strong>{estimativa.atb.primeiro === 'jogador' ? 'Você' : nomeDoMonstro}</strong>
            </span>
          </div>
          <p className="m-0 text-xs text-muted">
            Resistência a efeitos: <strong className="text-text">{estimativa.resistenciaJogadorPct}%</strong> · Esquiva do alvo:{' '}
            <strong className="text-text">{estimativa.esquivaMonstroPct}%</strong>
          </p>
        </div>
      )}
    </section>
  )
}
