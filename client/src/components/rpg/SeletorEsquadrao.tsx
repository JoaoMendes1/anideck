// client/src/components/rpg/SeletorEsquadrao.tsx
// Seletor de formação de esquadrão: combina até 3 heróis desbloqueados da conta para lutar juntos
// e mostra em tempo real as Reações Elementais ativadas pela combinação escolhida.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Save, Users, Zap } from 'lucide-react'
import { ESTILO_DO_ELEMENTO, type HeroiResumoEsquadrao } from '../../lib/rpg'
import { reacoesDoEsquadrao } from '../../lib/esquadrao'
import { rotuloDaClasse, rotuloDoElemento, salvarEsquadrao } from '../../lib/personagem'
import { useToast } from '../../contexts/ToastContext'

export default function SeletorEsquadrao({
  elenco,
  aliadosSelecionados,
  aoMudarAliados,
  compacto = false,
}: {
  elenco: HeroiResumoEsquadrao[]
  aliadosSelecionados: string[]
  aoMudarAliados: (ids: string[]) => void
  compacto?: boolean
}) {
  const { showToast } = useToast()
  const [salvando, setSalvando] = useState(false)

  if (elenco.length === 0) return null

  const lider = elenco.find((h) => h.ativo) ?? elenco[0]
  const outros = elenco.filter((h) => h.id !== lider.id)

  if (outros.length === 0) {
    if (compacto) return null
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-panel px-4 py-3 text-xs text-muted">
        <span className="flex items-center gap-2">
          <Users size={15} className="text-holo-3 shrink-0" aria-hidden="true" />
          <span>Desbloqueie outro herói no Elenco para montar um esquadrão de até 3 heróis com Reações Elementais.</span>
        </span>
        <Link to="/personagem" className="font-bold text-holo-3 hover:underline">
          Ver Elenco
        </Link>
      </div>
    )
  }

  const ativos = [lider, ...outros.filter((o) => aliadosSelecionados.includes(o.id))]
  const reacoes = reacoesDoEsquadrao(ativos.map((h) => h.elemento))
  const poderTotal = ativos.reduce((s, h) => s + h.poder, 0)

  const alternar = (id: string) => {
    if (aliadosSelecionados.includes(id)) {
      aoMudarAliados(aliadosSelecionados.filter((x) => x !== id))
      return
    }
    if (aliadosSelecionados.length >= 2) {
      showToast('O esquadrão vai até 3 heróis (você + 2 aliados).', 'error')
      return
    }
    aoMudarAliados([...aliadosSelecionados, id])
  }

  const salvar = async () => {
    setSalvando(true)
    const r = await salvarEsquadrao(aliadosSelecionados)
    setSalvando(false)
    if (r.erro) {
      showToast(r.erro, 'error')
      return
    }
    showToast('Formação do esquadrão salva.', 'success')
  }

  return (
    <section
      aria-label="Formação de esquadrão"
      className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-3.5 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-holo-3 shrink-0" aria-hidden="true" />
          <h2 className="m-0 text-sm font-bold">
            Formação de Esquadrão ({ativos.length}/3)
          </h2>
          <span className="rounded-full border border-line bg-panel-2 px-2 py-0.5 font-mono text-xs text-muted">
            Poder {poderTotal}
          </span>
        </div>
        {!compacto && (
          <div className="flex items-center gap-2">
            {aliadosSelecionados.length > 0 && (
              <button
                type="button"
                onClick={() => aoMudarAliados([])}
                className="cursor-pointer rounded-full border border-line px-3 py-1 text-xs font-bold text-muted hover:text-text"
              >
                Lutar solo
              </button>
            )}
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-holo-3/40 bg-holo-3/10 px-3 py-1 text-xs font-bold text-holo-3 hover:bg-holo-3/20 disabled:opacity-50"
            >
              <Save size={13} aria-hidden="true" />
              {salvando ? 'Salvando…' : 'Salvar padrão'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-holo-3/60 bg-holo-3/10 px-3 py-2">
          <div className="min-w-0">
            <p className="m-0 truncate text-xs font-extrabold text-text">{lider.nome}</p>
            <p className="m-0 font-mono text-xs text-muted">
              Líder · {rotuloDaClasse(lider.classe)} · {ESTILO_DO_ELEMENTO[lider.elemento]?.simbolo ?? ''} {rotuloDoElemento(lider.elemento)}
            </p>
          </div>
          <span className="shrink-0 font-mono text-xs font-bold text-holo-3">{lider.poder}</span>
        </div>

        {outros.map((aliado) => {
          const selecionado = aliadosSelecionados.includes(aliado.id)
          const el = ESTILO_DO_ELEMENTO[aliado.elemento]
          return (
            <button
              key={aliado.id}
              type="button"
              aria-pressed={selecionado}
              onClick={() => alternar(aliado.id)}
              className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                selecionado
                  ? 'border-holo-2/70 bg-holo-2/10 text-text'
                  : 'border-line bg-panel-2 text-muted hover:border-holo-3/40 hover:text-text'
              }`}
            >
              <div className="min-w-0">
                <p className="m-0 flex items-center gap-1.5 truncate text-xs font-bold">
                  {selecionado && <Check size={13} className="shrink-0 text-holo-2" aria-hidden="true" />}
                  <span className="truncate">{aliado.nome}</span>
                </p>
                <p className="m-0 font-mono text-xs text-muted">
                  {rotuloDaClasse(aliado.classe)} · {el?.simbolo ?? ''} {rotuloDoElemento(aliado.elemento)}
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs font-bold">{aliado.poder}</span>
            </button>
          )
        })}
      </div>

      {reacoes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 font-bold text-gold">
            <Zap size={13} aria-hidden="true" /> Reações ativas:
          </span>
          {reacoes.map((r) => (
            <span
              key={r.id}
              title={r.descricao}
              className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-gold"
            >
              {r.nome} ({r.descricao})
            </span>
          ))}
        </div>
      ) : ativos.length > 1 ? (
        <p className="m-0 text-xs text-muted">Heróis de elementos diferentes ativam Reações Elementais em sequência.</p>
      ) : (
        <p className="m-0 text-xs text-muted">Selecione até 2 aliados desbloqueados para lutar juntos; o mundo equilibra o monstro ao poder do esquadrão.</p>
      )}
    </section>
  )
}
