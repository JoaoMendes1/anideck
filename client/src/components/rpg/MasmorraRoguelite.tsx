// client/src/components/rpg/MasmorraRoguelite.tsx
// Interface da incursão Roguelite andar a andar: escolhas de bênçãos 1 de 3, altares de
// risco e decisão entre recuar com os espólios acumulados ou avançar mais fundo.
import { Flag, Flame, Heart, ShieldAlert, Sparkles, Swords, Ticket } from 'lucide-react'
import { type RespostaRoguelite, type BencaoRoguelite, descreverTurno } from '../../lib/rpg'
import { rotuloDoElemento } from '../../lib/personagem'
import { textoDosMateriais } from '../../lib/forja'
import IconeOuro from '../IconeOuro'
import BatalhaEmGrupo from './BatalhaEmGrupo'

interface Props {
  resposta: RespostaRoguelite
  ocupado: boolean
  erro?: string
  aoEscolherBencao: (bencaoId: string) => void
  aoDecidirAltar: (escolha: 'aceitar' | 'ignorar') => void
  aoAvancar: () => void
  aoRecuar: () => void
  aoEncerrarResumo: () => void
}

function estiloDaRaridade(raridade: string): string {
  switch (raridade) {
    case 'lendaria':
      return 'border-gold/60 bg-gold/10 text-gold'
    case 'epica':
      return 'border-holo-2/50 bg-holo-2/10 text-holo-2'
    case 'rara':
      return 'border-holo-3/50 bg-holo-3/10 text-holo-3'
    default:
      return 'border-border-subtle bg-panel-alt text-muted'
  }
}

function rotuloRaridade(raridade: string): string {
  switch (raridade) {
    case 'lendaria':
      return 'Lendária'
    case 'epica':
      return 'Épica'
    case 'rara':
      return 'Rara'
    default:
      return 'Comum'
  }
}

function CartaoBencao({
  bencao,
  ocupado,
  aoEscolher,
}: {
  bencao: BencaoRoguelite
  ocupado: boolean
  aoEscolher: () => void
}) {
  return (
    <button
      type="button"
      disabled={ocupado}
      onClick={aoEscolher}
      className="flex cursor-pointer flex-col items-start gap-2 rounded-2xl border border-holo-3/40 bg-panel p-4 text-left transition hover:border-holo-3 hover:bg-panel-alt disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-fg">
          <Sparkles size={15} className="text-holo-3" aria-hidden="true" />
          {bencao.nome}
        </span>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-xs font-semibold ${estiloDaRaridade(bencao.raridade)}`}>
          {rotuloRaridade(bencao.raridade)}
        </span>
      </div>
      <p className="m-0 text-xs leading-relaxed text-muted">{bencao.descricao}</p>
      <span className="mt-auto pt-1 font-mono text-xs font-bold text-holo-3">Escolher bênção →</span>
    </button>
  )
}

export default function MasmorraRoguelite({
  resposta,
  ocupado,
  erro,
  aoEscolherBencao,
  aoDecidirAltar,
  aoAvancar,
  aoRecuar,
  aoEncerrarResumo,
}: Props) {
  const { sessao, finalizada, status, ultimo_andar, grupo_andar, recompensa, evento_texto } = resposta

  if (finalizada && recompensa) {
    const vitoria = status === 'vitoria'
    const recuou = status === 'recuou'
    return (
      <section aria-label="Resumo da incursão Roguelite" className="flex flex-col gap-4">
        <div
          role="status"
          className={`flex flex-col gap-2 rounded-2xl border p-4 ${
            vitoria
              ? 'border-gold/60 bg-gold/10'
              : recuou
                ? 'border-holo-3/50 bg-holo-3/10'
                : 'border-coral/50 bg-coral/10'
          }`}
        >
          <p className="m-0 font-anton text-3xl uppercase leading-none">
            {vitoria ? 'Masmorra conquistada' : recuou ? 'Retirada tática' : 'Esquadrão derrotado'}
          </p>
          <p className="m-0 text-sm text-muted">
            {evento_texto ||
              (sessao ? `${sessao.masmorra.nome} — ${sessao.andar_atual} de ${sessao.total_andares} andares superados.` : '')}
          </p>
          <p className="m-0 flex flex-wrap items-center gap-4 text-sm">
            {recompensa.bilhetes > 0 && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
                <Ticket size={15} className="text-gold" aria-hidden="true" />+{recompensa.bilhetes}{' '}
                {recompensa.bilhetes === 1 ? 'bilhete' : 'bilhetes'}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
              <IconeOuro size={15} /> +{recompensa.ouro ?? 0} de Ouro
            </span>
            {(recompensa.ouro_perdido ?? 0) > 0 && (
              <span className="text-coral">−{recompensa.ouro_perdido} de Ouro perdido</span>
            )}
            {recompensa.item && <span className="font-bold text-gold">Baú: {recompensa.item.nome}</span>}
          </p>
          {recompensa.materiais && textoDosMateriais(recompensa.materiais) && (
            <p className="m-0 text-xs text-muted">
              Materiais: {textoDosMateriais(recompensa.materiais)}
            </p>
          )}
        </div>

        {grupo_andar && (
          <BatalhaEmGrupo
            resultado={grupo_andar}
            recompensa={null}
            aoVoltar={aoEncerrarResumo}
            rotuloVoltar="Voltar às masmorras"
          />
        )}

        <button
          type="button"
          onClick={aoEncerrarResumo}
          className="h-10 cursor-pointer self-start rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void"
        >
          Voltar às masmorras
        </button>
      </section>
    )
  }

  if (!sessao) return null

  const proximoMonstro = sessao.monstros[sessao.andar_atual]

  return (
    <section aria-label={`Incursão Roguelite em ${sessao.masmorra.nome}`} className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-holo-3/40 bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="m-0 font-mono text-xs font-semibold uppercase tracking-widest text-holo-3">
              Incursão Roguelite
            </p>
            <h2 className="m-0 font-anton text-2xl uppercase leading-none text-fg">{sessao.masmorra.nome}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="rounded-full border border-border-subtle bg-panel-alt px-3 py-1 font-bold text-fg">
              Andares vencidos: {sessao.andar_atual}/{sessao.total_andares}
            </span>
            {sessao.ouro_bonus_pct > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-bold text-gold">
                <IconeOuro size={13} /> +{sessao.ouro_bonus_pct}% bônus
              </span>
            )}
          </div>
        </div>

        {evento_texto && (
          <p role="status" className="m-0 rounded-xl border border-border-subtle bg-panel-alt px-3 py-2 text-xs text-fg">
            {evento_texto}
          </p>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {sessao.herois.map((h) => {
            const pct = Math.max(0, Math.min(100, Math.round((h.vida_atual / Math.max(1, h.vida_maxima)) * 100)))
            return (
              <div key={h.base} className="flex flex-col gap-1.5 rounded-xl border border-border-subtle bg-panel-alt p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-bold text-fg">{h.nome}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">{rotuloDoElemento(h.elemento)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Heart size={12} className={h.vida_atual > 0 ? 'text-green' : 'text-coral'} aria-hidden="true" />
                    {h.vida_atual}/{h.vida_maxima}
                  </span>
                  <span className="font-mono">{h.vida_atual > 0 ? `${pct}%` : 'Caído'}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-void/60">
                  <div
                    className={`h-full rounded-full ${h.vida_atual > 0 ? 'bg-green' : 'bg-coral'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {sessao.bencaos_ativas.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs text-muted">Bênçãos ativas:</span>
            {sessao.bencaos_ativas.map((b, idx) => (
              <span
                key={`${b.id}-${idx}`}
                title={b.descricao}
                className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold ${estiloDaRaridade(b.raridade)}`}
              >
                {b.nome}
              </span>
            ))}
          </div>
        )}
      </div>

      {erro && (
        <p role="alert" className="m-0 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-xs text-coral">
          {erro}
        </p>
      )}

      {sessao.escolhas_bencao.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="m-0 font-mono text-xs font-semibold uppercase tracking-widest text-holo-3">
            Escolha 1 de 3 bênçãos para o esquadrão
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {sessao.escolhas_bencao.map((b) => (
              <CartaoBencao key={b.id} bencao={b} ocupado={ocupado} aoEscolher={() => aoEscolherBencao(b.id)} />
            ))}
          </div>
        </div>
      )}

      {sessao.altar_ativo && sessao.escolhas_bencao.length === 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-gold/50 bg-gold/10 p-4">
          <div className="flex items-center gap-2 text-gold">
            <Flame size={18} aria-hidden="true" />
            <h3 className="m-0 font-anton text-xl uppercase leading-none">{sessao.altar_ativo.nome}</h3>
          </div>
          <p className="m-0 text-xs text-fg">{sessao.altar_ativo.descricao}</p>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <p className="m-0 rounded-xl border border-coral/40 bg-panel px-3 py-2 text-fg">
              <strong className="text-coral">Custo:</strong> {sessao.altar_ativo.custo}
            </p>
            <p className="m-0 rounded-xl border border-gold/40 bg-panel px-3 py-2 text-fg">
              <strong className="text-gold">Recompensa:</strong> {sessao.altar_ativo.recompensa}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={ocupado}
              onClick={() => aoDecidirAltar('aceitar')}
              className="h-10 cursor-pointer rounded-full bg-gold px-4 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aceitar altar
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => aoDecidirAltar('ignorar')}
              className="h-10 cursor-pointer rounded-full border border-border-subtle bg-panel px-4 text-xs font-bold text-fg disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ignorar e seguir
            </button>
          </div>
        </div>
      )}

      {sessao.escolhas_bencao.length === 0 && !sessao.altar_ativo && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-panel p-4">
          {proximoMonstro && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
                <ShieldAlert size={15} className="text-coral" aria-hidden="true" />
                Próximo guardião ({sessao.andar_atual + 1}º andar): <strong>{proximoMonstro.nome}</strong> (nv.{' '}
                {proximoMonstro.nivel})
              </span>
              <span className="font-mono text-muted">
                {proximoMonstro.tipo === 'chefe' ? 'Chefe do andar' : 'Guardião'}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {sessao.pode_avancar && (
              <button
                type="button"
                disabled={ocupado}
                onClick={aoAvancar}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Swords size={15} aria-hidden="true" />
                {ocupado ? 'Lutando…' : `Avançar para o ${sessao.andar_atual + 1}º andar`}
              </button>
            )}
            {sessao.pode_recuar && (
              <button
                type="button"
                disabled={ocupado}
                onClick={aoRecuar}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-4 text-xs font-bold text-gold disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Flag size={14} aria-hidden="true" />
                Recuar com os espólios
              </button>
            )}
          </div>
        </div>
      )}

      {grupo_andar && ultimo_andar && (
        <details className="rounded-2xl border border-border-subtle bg-panel p-4 text-xs">
          <summary className="cursor-pointer font-bold text-fg">
            Combate do esquadrão no {sessao.andar_atual}º andar ({ultimo_andar.monstro.nome} — {ultimo_andar.resultado.rodadas}{' '}
            rodadas)
          </summary>
          <ol className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
            {ultimo_andar.resultado.turnos.slice(0, 12).map((t, idx) => {
              const { texto, valor } = descreverTurno(t, ultimo_andar.monstro.nome)
              return (
                <li key={idx} className="flex items-center justify-between gap-2 text-muted">
                  <span>{texto}</span>
                  <span className="font-mono font-bold text-fg">{valor}</span>
                </li>
              )
            })}
          </ol>
        </details>
      )}

      {!grupo_andar && ultimo_andar && (
        <details className="rounded-2xl border border-border-subtle bg-panel p-4 text-xs">
          <summary className="cursor-pointer font-bold text-fg">
            Combate do {sessao.andar_atual}º andar ({ultimo_andar.monstro.nome} — {ultimo_andar.resultado.rodadas}{' '}
            rodadas)
          </summary>
          <ol className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
            {ultimo_andar.resultado.turnos.slice(0, 12).map((t, idx) => {
              const { texto, valor } = descreverTurno(t, ultimo_andar.monstro.nome)
              return (
                <li key={idx} className="flex items-center justify-between gap-2 text-muted">
                  <span>{texto}</span>
                  <span className="font-mono font-bold text-fg">{valor}</span>
                </li>
              )
            })}
          </ol>
        </details>
      )}
    </section>
  )
}
