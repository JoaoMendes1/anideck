// client/src/components/personagem/SintoniaElemental.tsx
// Resumo da sintonia elemental na aba Status: quantas peças em uso são do elemento do herói,
// o que cada uma rende e quanto falta para a Ressonância. A conta é do servidor.
import { Sparkles } from 'lucide-react'
import { SINTONIA, type EstadoEquipamento } from '../../lib/rpg'
import { rotuloDoElemento } from '../../lib/personagem'

export default function SintoniaElemental({ estado }: { estado: EstadoEquipamento }) {
  if (!estado.elemento) return null
  const pecas = estado.pecas_em_sintonia ?? 0
  const elemento = rotuloDoElemento(estado.elemento)
  const faltam = Math.max(0, SINTONIA.pecasRessonancia - pecas)

  return (
    <section
      aria-labelledby="titulo-da-sintonia"
      className={`flex flex-col gap-1.5 rounded-xl border p-3 ${estado.ressonancia ? 'border-gold/60 bg-gold/10' : 'border-line bg-panel'}`}
    >
      <h2 id="titulo-da-sintonia" className="m-0 inline-flex items-center gap-1.5 text-sm font-bold text-gold">
        <Sparkles size={14} aria-hidden="true" /> Sintonia de {elemento}
        <span className="ml-auto font-mono text-xs text-muted">
          {pecas}/{SINTONIA.pecasRessonancia} peças
        </span>
      </h2>
      <p className="m-0 text-xs text-muted">
        Cada peça de {elemento} em uso rende +{SINTONIA.bonusPct}% nos atributos dela.
      </p>
      <p className={`m-0 text-xs ${estado.ressonancia ? 'font-bold text-green' : 'text-muted'}`}>
        {estado.ressonancia
          ? `Ressonância ativa: +${SINTONIA.ressonanciaPct}% de Vida, Ataque e Magia.`
          : `Ressonância com ${SINTONIA.pecasRessonancia} peças (faltam ${faltam}): +${SINTONIA.ressonanciaPct}% de Vida, Ataque e Magia.`}
      </p>
      {estado.efeito_do_elemento && (
        <p className="m-0 text-xs text-text">
          <strong className="text-holo-2">Golpes de {elemento}: {estado.efeito_do_elemento.nome}. </strong>
          {estado.efeito_do_elemento.descricao}
        </p>
      )}
    </section>
  )
}
