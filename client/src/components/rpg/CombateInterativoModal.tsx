// client/src/components/rpg/CombateInterativoModal.tsx
// Combate tático por rodada (#333): renderizado via portal no body para ficar acima da Navbar
// e BottomNav, com trava de rolagem do documento e layout adaptado para tela cheia no celular.
import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Flame, Heart, Medal, Shield, Sparkles, Swords, Ticket, X, Zap } from 'lucide-react'
import {
  ESTILO_DO_ELEMENTO,
  agirCombateInterativo,
  descreverTurno,
  type EstadoCombateInterativo,
} from '../../lib/rpg'
import { arteDoEstagio, rotuloDoElemento } from '../../lib/personagem'
import { textoDosMateriais } from '../../lib/forja'
import { useSheetBehavior } from '../../hooks/useSheetBehavior'
import IconeOuro from '../IconeOuro'

interface Props {
  estadoInicial: EstadoCombateInterativo
  aoFechar: (concluiu: boolean) => void
}

function corIntencao(tipo: string): string {
  switch (tipo) {
    case 'golpe_pesado':
      return 'border-coral/60 bg-gradient-to-br from-coral/15 via-panel to-panel-2 text-coral'
    case 'poder_arcano':
      return 'border-holo-2/60 bg-gradient-to-br from-holo-2/15 via-panel to-panel-2 text-holo-2'
    case 'postura_defensiva':
      return 'border-gold/60 bg-gradient-to-br from-gold/15 via-panel to-panel-2 text-gold'
    default:
      return 'border-holo-3/50 bg-gradient-to-br from-holo-3/12 via-panel to-panel-2 text-holo-3'
  }
}

export default function CombateInterativoModal({ estadoInicial, aoFechar }: Props) {
  const [estado, setEstado] = useState<EstadoCombateInterativo>(estadoInicial)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [historico, setHistorico] = useState(() => estadoInicial.ultimos_turnos ?? [])

  const fechar = useCallback(() => aoFechar(estado.encerrado), [aoFechar, estado.encerrado])
  useSheetBehavior(true, fechar, true)

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
  const elInimigo = ESTILO_DO_ELEMENTO[estado.alvo_elemento] ?? ESTILO_DO_ELEMENTO.eter
  const auraEstilo = estado.aura_elemental ? (ESTILO_DO_ELEMENTO[estado.aura_elemental] ?? ESTILO_DO_ELEMENTO.eter) : null
  const lider = estado.herois[0]
  const eterSuficienteRuptura = !lider || lider.eter_atual >= 12

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Combate tático contra ${estado.alvo_nome}`}
      className="fixed inset-0 z-[90] flex items-stretch justify-center overflow-hidden bg-void/90 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-panel shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl sm:border sm:border-holo-3/45">
        {/* Cabeçalho fixo acima de qualquer barra */}
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line bg-panel px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-holo-3/40 bg-holo-3/12 px-2.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-holo-3">
                Rodada {estado.rodada}
              </span>
              {estado.total_andares ? (
                <span className="rounded-full border border-holo-2/40 bg-holo-2/12 px-2.5 py-0.5 font-mono text-xs font-bold text-holo-2">
                  Andar {estado.andar_atual}/{estado.total_andares}
                </span>
              ) : null}
              <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${elInimigo.classe}`}>
                {elInimigo.simbolo} {rotuloDoElemento(estado.alvo_elemento) || 'Neutro'}
              </span>
              {auraEstilo && estado.aura_elemental && (
                <span className={`rounded-full border px-2 py-0.5 font-mono text-xs font-bold ${auraEstilo.classe}`}>
                  Aura: {rotuloDoElemento(estado.aura_elemental)}
                </span>
              )}
            </div>
            <h2 className="m-0 mt-1 break-words font-anton text-xl uppercase leading-none text-text sm:text-2xl">
              {estado.alvo_nome}
            </h2>
            <p className="m-0 mt-0.5 font-mono text-xs text-muted">Nível {estado.alvo_nivel}</p>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar combate tático"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-panel-2 text-muted transition hover:border-holo-3/60 hover:text-text"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        {/* Arena rolável com overscroll-contain para não vazar scroll para a página */}
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          {/* Vida do adversário */}
          <div className="flex flex-col gap-1.5 rounded-2xl border border-coral/50 bg-gradient-to-r from-coral/12 via-panel-2 to-panel-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 text-coral">
                <Flame size={14} aria-hidden="true" />
                {estado.alvo_nome}
              </span>
              <span className="font-mono text-text">
                {estado.inimigo_vida.toLocaleString('pt-BR')} / {estado.inimigo_vida_max.toLocaleString('pt-BR')} HP ({pctInimigo}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full border border-line bg-void/90">
              <div
                className="h-full rounded-full bg-gradient-to-r from-coral to-gold transition-all duration-300"
                style={{ width: `${pctInimigo}%` }}
              />
            </div>
          </div>

          {/* Esquadrão de heróis compacto para caber lado a lado no celular */}
          <div className={`grid gap-2 ${estado.herois.length > 1 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'}`}>
            {estado.herois.map((h) => {
              const pctHp = Math.max(0, Math.min(100, Math.round((h.vida_atual / Math.max(1, h.vida_maxima)) * 100)))
              const pctEter = h.eter_maximo > 0 ? Math.max(0, Math.min(100, Math.round((h.eter_atual / h.eter_maximo) * 100))) : 0
              const retrato = arteDoEstagio(h.base, 'iniciante')?.retrato
              return (
                <div
                  key={h.base}
                  className={`flex min-w-0 flex-col gap-1.5 rounded-2xl border p-2.5 sm:p-3 ${
                    h.vida_atual > 0 ? 'border-holo-3/40 bg-panel-2/85' : 'border-coral/40 bg-coral/5 opacity-60'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {retrato && (
                      <img
                        src={retrato}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 shrink-0 rounded-xl border border-line bg-void object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-xs font-extrabold text-text">{h.nome}</p>
                      <p className="m-0 font-mono text-xs text-muted">
                        <Heart size={11} className={`mr-1 inline ${h.vida_atual > 0 ? 'text-green' : 'text-coral'}`} aria-hidden="true" />
                        {h.vida_atual}/{h.vida_maxima}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-void/80">
                      <div
                        className={`h-full rounded-full transition-all ${h.vida_atual > 0 ? 'bg-gradient-to-r from-green to-holo-3' : 'bg-coral'}`}
                        style={{ width: `${pctHp}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 font-mono text-xs text-mana">
                      <span>{h.eter_atual} Éter</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-void/80">
                        <div className="h-full rounded-full bg-mana transition-all" style={{ width: `${pctEter}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {!estado.encerrado && (
            <div className={`flex flex-col gap-1 rounded-2xl border p-3 ${corIntencao(estado.intencao.tipo)}`}>
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide">
                  <AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
                  Próxima intenção: {estado.intencao.titulo}
                </span>
                <span className="rounded-full border border-current/30 bg-void/50 px-2 py-0.5 font-mono text-xs font-bold">
                  ~{estado.intencao.dano_estimado} dano
                </span>
              </div>
              <p className="m-0 text-xs leading-snug text-text">{estado.intencao.descricao}</p>
              <p className="m-0 text-xs font-semibold text-gold">Dica: {estado.intencao.dica}</p>
            </div>
          )}

          {estado.evento && (
            <p role="status" className="m-0 rounded-xl border border-holo-2/40 bg-holo-2/10 px-3 py-2 text-xs font-semibold text-text">
              {estado.evento}
            </p>
          )}

          {erro && (
            <p role="alert" className="m-0 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-xs font-bold text-coral">
              {erro}
            </p>
          )}

          {estado.encerrado && (
            <div
              className={`flex flex-col gap-2.5 rounded-2xl border p-4 ${
                estado.venceu ? 'border-gold/60 bg-gradient-to-br from-gold/15 to-panel-2' : 'border-coral/50 bg-gradient-to-br from-coral/15 to-panel-2'
              }`}
            >
              <p className="m-0 font-anton text-2xl uppercase leading-none text-text">
                {estado.venceu ? 'Vitória Tática' : 'Derrota no combate'}
              </p>
              {estado.recompensa && (
                <p className="m-0 flex flex-wrap items-center gap-3 text-xs font-semibold text-text">
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
                <p className="m-0 flex flex-wrap items-center gap-3 text-xs font-semibold text-text">
                  <span className="inline-flex items-center gap-1">
                    <Medal size={14} className="text-gold" aria-hidden="true" />+{estado.pontos_duelo ?? 0} pontos de duelo
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <IconeOuro size={14} />+{estado.ouro_duelo ?? 0} Ouro
                  </span>
                </p>
              )}
            </div>
          )}

          {historico.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="m-0 font-mono text-xs font-semibold uppercase tracking-wider text-muted">Registro da luta</p>
              <ol aria-label="Últimas ações do combate tático" className="m-0 flex list-none flex-col gap-1.5 p-0 text-xs">
                {historico.map((t, i) => {
                  const { texto, valor } = descreverTurno(t, estado.alvo_nome)
                  const doHeroi = t.atacante === 'jogador'
                  return (
                    <li
                      key={i}
                      className={`flex items-start justify-between gap-2 rounded-xl border px-3 py-1.5 ${
                        t.reacao
                          ? 'border-gold/50 bg-gold/10'
                          : doHeroi
                            ? 'border-holo-3/30 bg-holo-3/8'
                            : 'border-coral/30 bg-coral/8'
                      }`}
                    >
                      <span className="min-w-0 flex-1 break-words leading-snug text-text">
                        {t.reacao && <Sparkles size={12} className="mr-1 inline text-gold" aria-hidden="true" />}
                        {texto}
                      </span>
                      <span className={`shrink-0 font-mono font-bold ${t.cura && doHeroi ? 'text-green' : doHeroi ? 'text-holo-3' : 'text-coral'}`}>
                        {valor}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </div>

        {/* Rodapé fixo com os 3 botões táticos sempre visíveis lado a lado */}
        <footer className="shrink-0 border-t border-line bg-panel-2 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-3.5">
          {estado.encerrado ? (
            <button
              type="button"
              onClick={fechar}
              className="h-11 w-full cursor-pointer rounded-full bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 px-5 text-xs font-extrabold text-void shadow-lg sm:w-auto"
            >
              Concluir e atualizar
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
              <button
                type="button"
                disabled={ocupado}
                onClick={() => executar('golpe')}
                className="flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl border border-holo-3/60 bg-holo-3/12 px-2 py-2 text-center transition hover:bg-holo-3/20 disabled:cursor-not-allowed disabled:opacity-50 sm:items-start sm:px-3 sm:text-left"
              >
                <span className="inline-flex items-center gap-1 text-xs font-extrabold leading-tight text-text">
                  <Swords size={14} className="shrink-0 text-holo-3" aria-hidden="true" />
                  <span>Golpe / Habilidade</span>
                </span>
                <span className="text-xs leading-tight text-muted">+25% postura</span>
              </button>

              <button
                type="button"
                disabled={ocupado}
                onClick={() => executar('defender')}
                className="flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl border border-green/60 bg-green/12 px-2 py-2 text-center transition hover:bg-green/20 disabled:cursor-not-allowed disabled:opacity-50 sm:items-start sm:px-3 sm:text-left"
              >
                <span className="inline-flex items-center gap-1 text-xs font-extrabold leading-tight text-text">
                  <Shield size={14} className="shrink-0 text-green" aria-hidden="true" />
                  <span>Defender / Esquivar</span>
                </span>
                <span className="text-xs leading-tight text-muted">-55% · +8 Éter</span>
              </button>

              <button
                type="button"
                disabled={ocupado}
                onClick={() => executar('ruptura')}
                className={`flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl border px-2 py-2 text-center transition disabled:cursor-not-allowed disabled:opacity-50 sm:items-start sm:px-3 sm:text-left ${
                  eterSuficienteRuptura
                    ? 'border-gold/60 bg-gold/12 hover:bg-gold/20'
                    : 'border-line bg-panel text-muted hover:border-gold/40'
                }`}
              >
                <span className="inline-flex items-center gap-1 text-xs font-extrabold leading-tight text-text">
                  <Zap size={14} className="shrink-0 text-gold" aria-hidden="true" />
                  <span>Ruptura de Éter</span>
                </span>
                <span className="text-xs leading-tight text-muted">12 Éter</span>
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}
