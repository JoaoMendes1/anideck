// client/src/components/rpg/CombateInterativoModal.tsx
// Combate tático por rodada (#333): revela a próxima intenção do adversário e permite ao
// jogador escolher Golpe, Defesa/Esquiva ou Ruptura de Éter a cada turno.
import { useState } from 'react'
import { AlertTriangle, Heart, Medal, Shield, Sparkles, Swords, Ticket, X, Zap } from 'lucide-react'
import {
  agirCombateInterativo,
  descreverTurno,
  type EstadoCombateInterativo,
} from '../../lib/rpg'
import { rotuloDoElemento } from '../../lib/personagem'
import { textoDosMateriais } from '../../lib/forja'
import IconeOuro from '../IconeOuro'

interface Props {
  estadoInicial: EstadoCombateInterativo
  aoFechar: (concluiu: boolean) => void
}

function corIntencao(tipo: string): string {
  switch (tipo) {
    case 'golpe_pesado':
      return 'border-coral/50 bg-coral/10 text-coral'
    case 'poder_arcano':
      return 'border-holo-2/50 bg-holo-2/10 text-holo-2'
    case 'postura_defensiva':
      return 'border-gold/50 bg-gold/10 text-gold'
    default:
      return 'border-holo-3/40 bg-holo-3/10 text-holo-3'
  }
}

export default function CombateInterativoModal({ estadoInicial, aoFechar }: Props) {
  const [estado, setEstado] = useState<EstadoCombateInterativo>(estadoInicial)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [historico, setHistorico] = useState(() => estadoInicial.ultimos_turnos ?? [])

  const executar = async (acao: 'golpe' | 'defender' | 'ruptura') => {
    if (ocupado || estado.encerrado) return
    setOcupado(true)
    setErro('')
    const r = await agirCombateInterativo(estado.sessao_id, acao)
    setOcupado(false)
    if (!r.dados) {
      setErro(r.erro ?? 'Não foi possível executar a rodada agora.')
      return
    }
    setEstado(r.dados)
    if (r.dados.ultimos_turnos && r.dados.ultimos_turnos.length > 0) {
      setHistorico((prev) => [...r.dados!.ultimos_turnos!, ...prev].slice(0, 18))
    }
  }

  const pctInimigo = Math.max(0, Math.min(100, Math.round((estado.inimigo_vida / Math.max(1, estado.inimigo_vida_max)) * 100)))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Combate tático contra ${estado.alvo_nome}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-3 backdrop-blur-sm sm:p-4"
    >
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-3xl border border-holo-3/40 bg-panel p-4 shadow-2xl sm:p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="m-0 font-mono text-xs font-semibold uppercase tracking-widest text-holo-3">
              Combate Tático · Rodada {estado.rodada}
              {estado.total_andares ? ` · Andar ${estado.andar_atual}/${estado.total_andares}` : ''}
            </p>
            <h2 className="m-0 font-anton text-2xl uppercase leading-none text-fg">{estado.alvo_nome}</h2>
            <p className="m-0 mt-1 font-mono text-xs text-muted">
              Nível {estado.alvo_nivel} · {rotuloDoElemento(estado.alvo_elemento) || 'Neutro'}
              {estado.aura_elemental ? ` · Aura ativa: ${rotuloDoElemento(estado.aura_elemental)}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => aoFechar(estado.encerrado)}
            aria-label="Fechar combate tático"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-panel-2 text-muted hover:text-text"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="flex flex-col gap-1.5 rounded-2xl border border-coral/40 bg-panel-2/70 p-3.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-coral">{estado.alvo_nome}</span>
            <span className="font-mono text-fg">
              {estado.inimigo_vida} / {estado.inimigo_vida_max} HP
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-void/80">
            <div className="h-full rounded-full bg-gradient-to-r from-coral to-gold transition-all" style={{ width: `${pctInimigo}%` }} />
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-2 ${estado.herois.length > 1 ? 'sm:grid-cols-3' : ''}`}>
          {estado.herois.map((h) => {
            const pctHp = Math.max(0, Math.min(100, Math.round((h.vida_atual / Math.max(1, h.vida_maxima)) * 100)))
            return (
              <div key={h.base} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-panel-2/70 p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-bold text-fg">{h.nome}</span>
                  <span className="shrink-0 font-mono text-xs text-holo-3">{h.eter_atual} Éter</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Heart size={12} className={h.vida_atual > 0 ? 'text-green' : 'text-coral'} aria-hidden="true" />
                    {h.vida_atual}/{h.vida_maxima}
                  </span>
                  <span className="font-mono">{pctHp}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-void/80">
                  <div
                    className={`h-full rounded-full transition-all ${h.vida_atual > 0 ? 'bg-green' : 'bg-coral'}`}
                    style={{ width: `${pctHp}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {!estado.encerrado && (
          <div className={`flex flex-col gap-1.5 rounded-2xl border p-3.5 ${corIntencao(estado.intencao.tipo)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide">
                <AlertTriangle size={14} aria-hidden="true" />
                Próxima intenção: {estado.intencao.titulo}
              </span>
              <span className="font-mono text-xs font-bold">~{estado.intencao.dano_estimado} de dano</span>
            </div>
            <p className="m-0 text-xs text-fg">{estado.intencao.descricao}</p>
            <p className="m-0 text-xs font-semibold opacity-90">Dica tática: {estado.intencao.dica}</p>
          </div>
        )}

        {estado.evento && (
          <p role="status" className="m-0 rounded-xl border border-line bg-panel-2 px-3 py-2 text-xs font-semibold text-fg">
            {estado.evento}
          </p>
        )}

        {erro && (
          <p role="alert" className="m-0 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-xs font-bold text-coral">
            {erro}
          </p>
        )}

        {estado.encerrado ? (
          <div
            className={`flex flex-col gap-3 rounded-2xl border p-4 ${
              estado.venceu ? 'border-gold/60 bg-gold/10' : 'border-coral/50 bg-coral/10'
            }`}
          >
            <p className="m-0 font-anton text-2xl uppercase leading-none">
              {estado.venceu ? 'Vitória Tática' : 'Derrota no combate'}
            </p>
            {estado.recompensa && (
              <p className="m-0 flex flex-wrap items-center gap-3 text-xs font-semibold text-fg">
                {estado.recompensa.bilhetes > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Ticket size={14} className="text-gold" aria-hidden="true" />+{estado.recompensa.bilhetes} bilhete(s)
                  </span>
                )}
                {(estado.recompensa.ouro ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <IconeOuro size={14} />+{estado.recompensa.ouro} Ouro
                  </span>
                )}
                {(estado.recompensa.ouro_perdido ?? 0) > 0 && (
                  <span className="text-coral">−{estado.recompensa.ouro_perdido} Ouro perdido</span>
                )}
                {estado.recompensa.item && <span className="text-gold">Item: {estado.recompensa.item.nome}</span>}
                {estado.recompensa.materiais && textoDosMateriais(estado.recompensa.materiais) && (
                  <span className="text-holo-2">Materiais: {textoDosMateriais(estado.recompensa.materiais)}</span>
                )}
              </p>
            )}
            {estado.modo === 'duelo' && estado.venceu && (
              <p className="m-0 flex flex-wrap items-center gap-3 text-xs font-semibold text-fg">
                <span className="inline-flex items-center gap-1">
                  <Medal size={14} className="text-gold" aria-hidden="true" />+{estado.pontos_duelo ?? 0} pontos de duelo
                </span>
                <span className="inline-flex items-center gap-1">
                  <IconeOuro size={14} />+{estado.ouro_duelo ?? 0} Ouro
                </span>
              </p>
            )}
            <button
              type="button"
              onClick={() => aoFechar(true)}
              className="h-10 cursor-pointer self-start rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void"
            >
              Concluir e atualizar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              disabled={ocupado}
              onClick={() => executar('golpe')}
              className="flex cursor-pointer flex-col items-start gap-1 rounded-2xl border border-holo-3/50 bg-holo-3/10 p-3 text-left transition hover:bg-holo-3/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-fg">
                <Swords size={15} className="text-holo-3" aria-hidden="true" /> Golpe / Habilidade
              </span>
              <span className="text-xs text-muted">Quebra postura defensiva (+25% dano).</span>
            </button>

            <button
              type="button"
              disabled={ocupado}
              onClick={() => executar('defender')}
              className="flex cursor-pointer flex-col items-start gap-1 rounded-2xl border border-green/50 bg-green/10 p-3 text-left transition hover:bg-green/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-fg">
                <Shield size={15} className="text-green" aria-hidden="true" /> Defender / Esquivar
              </span>
              <span className="text-xs text-muted">Reduz impacto em 55% e gera +8 Éter.</span>
            </button>

            <button
              type="button"
              disabled={ocupado}
              onClick={() => executar('ruptura')}
              className="flex cursor-pointer flex-col items-start gap-1 rounded-2xl border border-gold/50 bg-gold/10 p-3 text-left transition hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-fg">
                <Zap size={15} className="text-gold" aria-hidden="true" /> Ruptura de Éter
              </span>
              <span className="text-xs text-muted">Explosão + Magia (12 Éter). Corta magia.</span>
            </button>
          </div>
        )}

        {historico.length > 0 && (
          <ol aria-label="Últimas ações do combate tático" className="m-0 flex max-h-40 list-none flex-col gap-1 overflow-y-auto p-0 text-xs">
            {historico.map((t, i) => {
              const { texto, valor } = descreverTurno(t, estado.alvo_nome)
              const doHeroi = t.atacante === 'jogador'
              return (
                <li
                  key={i}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-1.5 ${
                    doHeroi ? 'border-holo-3/25 bg-holo-3/5' : 'border-coral/25 bg-coral/5'
                  }`}
                >
                  <span className="min-w-0 truncate text-fg">
                    {t.reacao && <Sparkles size={11} className="mr-1 inline text-gold" aria-hidden="true" />}
                    {texto}
                  </span>
                  <span className={`shrink-0 font-mono font-bold ${doHeroi ? 'text-holo-3' : 'text-coral'}`}>{valor}</span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
