// client/src/components/personagem/PainelAtributos.tsx
// Os seis atributos primários e a distribuição dos pontos ganhos com o nível.
// Cada herói desbloqueado possui sua própria distribuição independente (sql/140),
// além do guia de build recomendada por classe.
import { useEffect, useState } from 'react'
import {
  Brain,
  Clover,
  Compass,
  Crosshair,
  Dumbbell,
  HeartPulse,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  Wand2,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import {
  PRIMARIOS_RPG,
  PRIMARIOS_ZERADOS,
  distribuirPontos,
  gerarBuildRecomendada,
  itensAfetadosPelosPontos,
  recomendacaoDaClasse,
  somaDosPontos,
  type EstadoEquipamento,
  type PrimarioId,
  type PrimariosRPG,
} from '../../lib/rpg'
import { membroDoElenco, rotuloDaClasse, rotuloDoElemento } from '../../lib/personagem'

const ROTULO_DE_SECAO = 'font-mono text-xs font-semibold uppercase tracking-widest text-muted m-0'

const ICONE: Record<PrimarioId, { Icone: LucideIcon; cor: string; borda: string; fundo: string }> = {
  forca: { Icone: Dumbbell, cor: 'text-gold', borda: 'border-gold/35', fundo: 'bg-gold/10' },
  inteligencia: { Icone: Brain, cor: 'text-holo-2', borda: 'border-holo-2/35', fundo: 'bg-holo-2/10' },
  constituicao: { Icone: HeartPulse, cor: 'text-coral', borda: 'border-coral/35', fundo: 'bg-coral/10' },
  agilidade: { Icone: Wind, cor: 'text-holo-3', borda: 'border-holo-3/35', fundo: 'bg-holo-3/10' },
  destreza: { Icone: Crosshair, cor: 'text-green', borda: 'border-green/35', fundo: 'bg-green/10' },
  sorte: { Icone: Clover, cor: 'text-gold', borda: 'border-gold/35', fundo: 'bg-gold/10' },
}

const BOTAO =
  'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line bg-panel-2 text-text transition hover:border-holo-3 hover:bg-holo-3/10 disabled:cursor-not-allowed disabled:opacity-35'

function impactoDosPontos(id: PrimarioId, pts: number): string {
  if (pts <= 0) return ''
  switch (id) {
    case 'forca':
      return `+${pts * 2} Ataque`
    case 'inteligencia':
      return `+${pts * 2} Magia · +${pts} Éter`
    case 'constituicao':
      return `+${pts * 10} Vida · +${pts} Defesa`
    case 'agilidade': {
      const esq = Math.min(25, pts * 0.7)
      return `+${pts} Vel · +${Number.isInteger(esq) ? esq : esq.toFixed(1).replace('.', ',')}% Esq`
    }
    case 'destreza': {
      const crit = Math.min(35, pts * 0.7)
      return `+${Number.isInteger(crit) ? crit : crit.toFixed(1).replace('.', ',')}% Crít · +${Math.floor(pts / 2)}% Dano`
    }
    case 'sorte':
      return `+${Math.floor(pts / 5)}% Sorte`
  }
}

export default function PainelAtributos({
  estado,
  aoAtualizar,
  personagemBase,
  desbloqueados,
  heroiInicial,
}: {
  estado: EstadoEquipamento
  aoAtualizar: (estado: EstadoEquipamento) => void
  personagemBase?: string
  desbloqueados?: string[]
  heroiInicial?: string
}) {
  const baseAtivo = personagemBase ?? estado.personagem_base ?? ''
  const listaHerois =
    desbloqueados && desbloqueados.length > 0
      ? desbloqueados
      : estado.pontos_por_heroi
        ? Object.keys(estado.pontos_por_heroi)
        : baseAtivo
          ? [baseAtivo]
          : []

  const alvoInicial = heroiInicial && listaHerois.includes(heroiInicial) ? heroiInicial : baseAtivo
  const [heroiEditado, setHeroiEditado] = useState<string>(alvoInicial)
  const listaChave = listaHerois.join(',')

  useEffect(() => {
    const validos = listaChave ? listaChave.split(',') : []
    setHeroiEditado(heroiInicial && validos.includes(heroiInicial) ? heroiInicial : baseAtivo)
  }, [heroiInicial, baseAtivo, listaChave])

  const estaEditandoLider = !heroiEditado || heroiEditado === baseAtivo
  const salvosDoHeroi: PrimariosRPG = estaEditandoLider
    ? (estado.pontos ?? PRIMARIOS_ZERADOS)
    : (estado.pontos_por_heroi?.[heroiEditado] ?? PRIMARIOS_ZERADOS)

  const [rascunho, setRascunho] = useState<PrimariosRPG>(salvosDoHeroi)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [salvouMsg, setSalvouMsg] = useState('')

  useEffect(() => {
    setRascunho(salvosDoHeroi)
  }, [heroiEditado, salvosDoHeroi])

  // Servidor anterior ao sql/077: sem primários, o painel não aparece.
  if (!estado.primarios_base) return null
  const base = estado.primarios_base

  const disponiveis = estado.pontos_disponiveis ?? 0
  const usados = somaDosPontos(rascunho)
  const livres = disponiveis - usados
  const mudou = PRIMARIOS_RPG.some(({ id }) => rascunho[id] !== salvosDoHeroi[id])
  const afetados = estaEditandoLider && mudou ? itensAfetadosPelosPontos(estado, rascunho) : { desativam: [], reativam: [] }

  const membroEditado = heroiEditado ? membroDoElenco(heroiEditado) : undefined
  const classeEditada = membroEditado?.classe ?? estado.classe ?? 'espadachim'
  const guia = recomendacaoDaClasse(classeEditada)

  const ajustar = (id: PrimarioId, passo: 1 | -1) => {
    setErro('')
    setSalvouMsg('')
    setRascunho((atual) => ({ ...atual, [id]: Math.max(0, atual[id] + passo) }))
  }

  const aplicarRecomendada = () => {
    setErro('')
    setSalvouMsg('')
    setRascunho(gerarBuildRecomendada(classeEditada, disponiveis))
  }

  const zerarRascunho = () => {
    setErro('')
    setSalvouMsg('')
    setRascunho({ ...PRIMARIOS_ZERADOS })
  }

  const salvar = async () => {
    if (salvando || !mudou || livres < 0) return
    setErro('')
    setSalvouMsg('')
    setSalvando(true)
    const resultado = estaEditandoLider
      ? await distribuirPontos(rascunho)
      : await distribuirPontos(rascunho, heroiEditado)
    setSalvando(false)
    if (resultado.dados) {
      aoAtualizar(resultado.dados)
      setSalvouMsg(
        estaEditandoLider
          ? 'Atributos salvos!'
          : `Atributos de ${membroEditado?.nome ?? 'herói'} salvos!`,
      )
      return
    }
    setErro(resultado.erro ?? 'Não foi possível salvar os pontos agora.')
  }

  return (
    <section aria-labelledby="titulo-dos-atributos" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="titulo-dos-atributos" className={ROTULO_DE_SECAO}>
            Atributos
          </h2>
          {membroEditado && (
            <span className="rounded-full border border-holo-3/40 bg-holo-3/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-holo-3">
              {membroEditado.nome} · {rotuloDaClasse(classeEditada)}
            </span>
          )}
        </div>
        <span
          className={`rounded-full border px-3 py-1 font-mono text-xs font-bold ${
            livres > 0 ? 'border-gold/70 bg-gold/15 text-gold' : 'border-line bg-panel text-muted'
          }`}
        >
          {livres === 1 ? '1 ponto livre' : `${livres} pontos livres`}
        </span>
      </div>

      {listaHerois.length > 1 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3 sm:p-3.5">
          <p className="m-0 font-mono text-xs font-semibold uppercase tracking-wider text-muted">
            Escolha qual herói configurar (cada um tem build própria):
          </p>
          <div className="flex flex-wrap gap-2">
            {listaHerois.map((id) => {
              const info = membroDoElenco(id)
              const selecionado = id === heroiEditado
              const ehLider = id === baseAtivo
              const ptsHeroi = ehLider
                ? (estado.pontos ?? PRIMARIOS_ZERADOS)
                : (estado.pontos_por_heroi?.[id] ?? PRIMARIOS_ZERADOS)
              const livresHeroi = Math.max(0, disponiveis - somaDosPontos(ptsHeroi))
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setErro('')
                    setSalvouMsg('')
                    setHeroiEditado(id)
                  }}
                  aria-pressed={selecionado}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                    selecionado
                      ? 'border-holo-3 bg-gradient-to-r from-holo-2/20 to-holo-3/20 text-text ring-1 ring-holo-3/40'
                      : 'border-line bg-panel-2/70 text-muted hover:border-holo-2/60 hover:text-text'
                  }`}
                >
                  <span className="font-bold text-text">{info.nome}</span>
                  <span className="font-mono text-xs opacity-80">
                    {rotuloDaClasse(info.classe)} · {rotuloDoElemento(info.elemento)}
                  </span>
                  {ehLider && (
                    <span className="rounded-full border border-holo-3/40 bg-holo-3/15 px-1.5 py-0.5 font-mono text-xs font-bold text-holo-3">
                      Em uso
                    </span>
                  )}
                  {livresHeroi > 0 && (
                    <span className="rounded-full border border-gold/60 bg-gold/15 px-1.5 py-0.5 font-mono text-xs font-bold text-gold">
                      +{livresHeroi}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Card de recomendação da classe: o que upar para ficar mais forte */}
      <div className="flex flex-col gap-3 rounded-2xl border border-holo-2/40 bg-gradient-to-br from-holo-2/12 via-panel to-panel-2 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="m-0 inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-holo-3">
              <Compass size={14} aria-hidden="true" />
              Guia da Classe · {guia.titulo} ({guia.arquetipo})
            </p>
            <p className="m-0 mt-1.5 text-xs leading-relaxed text-text">{guia.resumoForca}</p>
            <p className="m-0 mt-1 text-xs leading-relaxed text-muted">
              <strong className="text-gold">Equipamentos e Sintonia:</strong> {guia.dicaEquipamento}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2.5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {guia.principais.map((pid) => {
              const item = PRIMARIOS_RPG.find((p) => p.id === pid)
              return (
                <span
                  key={pid}
                  className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/15 px-2.5 py-0.5 font-mono text-xs font-bold text-gold"
                >
                  <Star size={11} aria-hidden="true" /> Principal: {item?.rotulo}
                </span>
              )
            })}
            {guia.secundarios.map((pid) => {
              const item = PRIMARIOS_RPG.find((p) => p.id === pid)
              return (
                <span
                  key={pid}
                  className="inline-flex items-center gap-1 rounded-full border border-holo-3/40 bg-holo-3/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-holo-3"
                >
                  Secundário: {item?.rotulo}
                </span>
              )
            })}
          </div>

          {disponiveis > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={aplicarRecomendada}
                disabled={salvando}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-holo-3/60 bg-holo-3/15 px-3.5 text-xs font-extrabold text-holo-3 transition hover:bg-holo-3/25 disabled:opacity-50"
              >
                <Wand2 size={13} aria-hidden="true" /> Sugerir build
              </button>
              {usados > 0 && (
                <button
                  type="button"
                  onClick={zerarRascunho}
                  disabled={salvando}
                  className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-full border border-line bg-panel-2 px-3 text-xs font-bold text-muted transition hover:text-text disabled:opacity-50"
                >
                  <RotateCcw size={12} aria-hidden="true" /> Zerar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2">
          {PRIMARIOS_RPG.map(({ id, rotulo, efeito }) => {
            const { Icone, cor, borda, fundo } = ICONE[id]
            const pontos = rascunho[id]
            const principal = guia.principais.includes(id)
            const secundario = guia.secundarios.includes(id)
            const impacto = impactoDosPontos(id, pontos)
            return (
              <li
                key={id}
                className={`flex min-w-0 items-center gap-2.5 rounded-2xl border bg-panel p-3 transition ${
                  principal ? 'border-gold/45' : 'border-line'
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${borda} ${fundo}`}>
                  <Icone size={18} className={cor} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="m-0 text-sm font-bold text-text">{rotulo}</p>
                    {principal ? (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 font-mono text-xs font-bold text-gold">
                        Principal
                      </span>
                    ) : secundario ? (
                      <span className="rounded-full bg-holo-3/12 px-2 py-0.5 font-mono text-xs font-semibold text-holo-3">
                        Útil
                      </span>
                    ) : null}
                  </div>
                  <p className="m-0 text-xs leading-snug text-muted">{efeito}</p>
                  {impacto && <p className="m-0 mt-0.5 font-mono text-xs font-semibold text-green">{impacto}</p>}
                </div>
                <span
                  className="min-w-11 shrink-0 text-right font-anton text-2xl leading-none text-text"
                  aria-label={`${rotulo}: ${base[id] + pontos}`}
                >
                  {base[id] + pontos}
                  {pontos > 0 && <span className="mt-0.5 block font-mono text-xs font-bold text-gold">+{pontos}</span>}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => ajustar(id, -1)}
                    disabled={pontos === 0 || salvando}
                    aria-label={`Tirar um ponto de ${rotulo}`}
                    className={BOTAO}
                  >
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => ajustar(id, 1)}
                    disabled={livres <= 0 || salvando}
                    aria-label={`Pôr um ponto em ${rotulo}`}
                    className={BOTAO}
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-text">
              <Sparkles size={13} className="text-gold" aria-hidden="true" /> Distribuição
            </span>
            <span className="font-mono text-xs font-semibold text-muted">
              {usados} / {disponiveis} usados
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-void/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-holo-2 via-holo-3 to-gold transition-all"
              style={{ width: `${disponiveis > 0 ? Math.min(100, Math.round((usados / disponiveis) * 100)) : 0}%` }}
            />
          </div>

          <p className="m-0 text-xs leading-relaxed text-muted">
            {disponiveis === 0
              ? 'Os primeiros 2 pontos chegam no nível 2, e depois 2 a cada novo nível.'
              : `Cada herói desbloqueado começa zerado e recebe ${disponiveis} pontos no nível ${estado.nivel} para montar sua própria build. Redistribuir é livre.`}
          </p>

          {afetados.desativam.length > 0 && (
            <div role="status" className="rounded-xl border border-coral/50 bg-coral/10 p-3 text-xs leading-relaxed text-coral">
              <p className="m-0 font-bold">Ao salvar, ficam inativos (sem bônus):</p>
              <ul className="m-0 list-disc pl-4">
                {afetados.desativam.map((i) => (
                  <li key={i.nome}>
                    {i.nome}: exige {i.requisito}
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-1 text-muted">Eles continuam equipados e voltam a valer quando você cumprir o requisito.</p>
            </div>
          )}
          {afetados.reativam.length > 0 && (
            <p role="status" className="m-0 rounded-xl border border-green/50 bg-green/10 p-3 text-xs font-bold text-green">
              Voltam a valer: {afetados.reativam.join(', ')}
            </p>
          )}

          {mudou && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={salvar}
                disabled={salvando || livres < 0}
                className="h-11 flex-1 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 px-5 text-xs font-extrabold text-void shadow-md transition hover:opacity-95 disabled:cursor-wait disabled:opacity-60"
              >
                {salvando ? 'Salvando…' : 'Salvar pontos'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setErro('')
                  setSalvouMsg('')
                  setRascunho(salvosDoHeroi)
                }}
                disabled={salvando}
                className="h-11 cursor-pointer rounded-full border border-line bg-panel-2 px-4 text-xs font-bold text-muted hover:text-text"
              >
                Desfazer
              </button>
            </div>
          )}

          {salvouMsg && !mudou && (
            <p role="status" className="m-0 rounded-xl border border-green/40 bg-green/10 px-3 py-2 text-xs font-bold text-green">
              {salvouMsg}
            </p>
          )}

          {erro && (
            <p role="alert" className="m-0 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-xs font-bold text-coral">
              {erro}
            </p>
          )}
        </aside>
      </div>
    </section>
  )
}
