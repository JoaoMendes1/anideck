// client/src/components/rpg/MasmorraRoguelite.tsx
// Interface da incursão Roguelite andar a andar: escolhas de bênçãos 1 de 3, altares de
// risco e decisão entre recuar com os espólios acumulados ou avançar mais fundo.
import { Flag, Flame, Heart, ShieldAlert, Sparkles, Swords, Ticket } from 'lucide-react'
import { type RespostaRoguelite, type BencaoRoguelite, ESTILO_DO_ELEMENTO, descreverTurno } from '../../lib/rpg'
import { arteDoEstagio, rotuloDoElemento } from '../../lib/personagem'
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
      return 'border-gold/60 bg-gold/15 text-gold'
    case 'epica':
      return 'border-holo-2/60 bg-holo-2/15 text-holo-2'
    case 'rara':
      return 'border-holo-3/60 bg-holo-3/15 text-holo-3'
    default:
      return 'border-line bg-panel-2 text-muted'
  }
}

function bordaCartaRaridade(raridade: string): string {
  switch (raridade) {
    case 'lendaria':
      return 'border-gold/60 bg-gradient-to-br from-gold/12 via-panel to-panel-2 hover:border-gold'
    case 'epica':
      return 'border-holo-2/60 bg-gradient-to-br from-holo-2/12 via-panel to-panel-2 hover:border-holo-2'
    case 'rara':
      return 'border-holo-3/60 bg-gradient-to-br from-holo-3/12 via-panel to-panel-2 hover:border-holo-3'
    default:
      return 'border-line bg-panel hover:border-holo-3/60'
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
      className={`flex min-w-0 cursor-pointer flex-col items-start gap-2 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${bordaCartaRaridade(bencao.raridade)}`}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-extrabold text-text">
          <Sparkles size={15} className="shrink-0 text-holo-3" aria-hidden="true" />
          <span className="break-words">{bencao.nome}</span>
        </span>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-xs font-semibold ${estiloDaRaridade(bencao.raridade)}`}>
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
          className={`flex flex-col gap-2.5 rounded-2xl border p-4 sm:p-5 ${
            vitoria
              ? 'border-gold/60 bg-gradient-to-br from-gold/15 to-panel'
              : recuou
                ? 'border-holo-3/50 bg-gradient-to-br from-holo-3/12 to-panel'
                : 'border-coral/50 bg-gradient-to-br from-coral/15 to-panel'
          }`}
        >
          <p className="m-0 font-anton text-2xl uppercase leading-none text-text sm:text-3xl">
            {vitoria ? 'Masmorra conquistada' : recuou ? 'Retirada tática' : 'Esquadrão derrotado'}
          </p>
          <p className="m-0 text-sm text-muted">
            {evento_texto ||
              (sessao ? `${sessao.masmorra.nome} — ${sessao.andar_atual} de ${sessao.total_andares} andares superados.` : '')}
          </p>
          <p className="m-0 flex flex-wrap items-center gap-3 text-sm">
            {recompensa.bilhetes > 0 && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-text">
                <Ticket size={15} className="text-gold" aria-hidden="true" />+{recompensa.bilhetes}{' '}
                {recompensa.bilhetes === 1 ? 'bilhete' : 'bilhetes'}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 font-semibold text-text">
              <IconeOuro size={15} /> +{recompensa.ouro ?? 0} de Ouro
            </span>
            {(recompensa.ouro_perdido ?? 0) > 0 && (
              <span className="text-coral">−{recompensa.ouro_perdido} de Ouro perdido</span>
            )}
            {recompensa.item && <span className="font-bold text-gold">Baú: {recompensa.item.nome}</span>}
          </p>
          {recompensa.materiais && textoDosMateriais(recompensa.materiais) && (
            <p className="m-0 text-xs text-holo-2">
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
          className="h-11 w-full cursor-pointer rounded-full bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 px-5 text-xs font-extrabold text-void sm:w-auto sm:self-start"
        >
          Voltar às masmorras
        </button>
      </section>
    )
  }

  if (!sessao) return null

  const proximoMonstro = sessao.monstros[sessao.andar_atual]
  const pctAndar = sessao.total_andares > 0 ? Math.min(100, Math.round((sessao.andar_atual / sessao.total_andares) * 100)) : 0

  return (
    <section aria-label={`Incursão Roguelite em ${sessao.masmorra.nome}`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-holo-3/45 bg-panel p-3.5 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="m-0 font-mono text-xs font-semibold uppercase tracking-widest text-holo-3">
              Incursão Roguelite
            </p>
            <h2 className="m-0 break-words font-anton text-2xl uppercase leading-none text-text">{sessao.masmorra.nome}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="rounded-full border border-line bg-panel-2 px-3 py-1 font-bold text-text">
              Andares vencidos: {sessao.andar_atual}/{sessao.total_andares}
            </span>
            {sessao.ouro_bonus_pct > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/15 px-3 py-1 font-bold text-gold">
                <IconeOuro size={13} /> +{sessao.ouro_bonus_pct}% bônus
              </span>
            )}
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-void/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-holo-2 via-holo-3 to-gold transition-all"
            style={{ width: `${pctAndar}%` }}
          />
        </div>

        {evento_texto && (
          <p role="status" className="m-0 rounded-xl border border-holo-2/40 bg-panel-2 px-3 py-2 text-xs font-semibold text-text">
            {evento_texto}
          </p>
        )}

        <div className={`grid grid-cols-1 gap-2 ${sessao.herois.length > 1 ? 'sm:grid-cols-3' : ''}`}>
          {sessao.herois.map((h) => {
            const pct = Math.max(0, Math.min(100, Math.round((h.vida_atual / Math.max(1, h.vida_maxima)) * 100)))
            const el = ESTILO_DO_ELEMENTO[h.elemento] ?? ESTILO_DO_ELEMENTO.eter
            const retrato = arteDoEstagio(h.base, 'iniciante')?.retrato
            return (
              <div key={h.base} className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-panel-2 p-3">
                <div className="flex items-center gap-2">
                  {retrato && (
                    <img
                      src={retrato}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 shrink-0 rounded-lg border border-line bg-void object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-extrabold text-text">{h.nome}</span>
                    <span className="font-mono text-xs text-muted">
                      {el.simbolo} {rotuloDoElemento(h.elemento)}
                    </span>
                  </div>
                  <span className={`shrink-0 font-mono text-xs font-bold ${h.vida_atual > 0 ? 'text-green' : 'text-coral'}`}>
                    {h.vida_atual > 0 ? `${pct}%` : 'Caído'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Heart size={12} className={h.vida_atual > 0 ? 'text-green' : 'text-coral'} aria-hidden="true" />
                    {h.vida_atual}/{h.vida_maxima}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-void/70">
                  <div
                    className={`h-full rounded-full transition-all ${h.vida_atual > 0 ? 'bg-gradient-to-r from-green to-holo-3' : 'bg-coral'}`}
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
        <p role="alert" className="m-0 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-xs font-bold text-coral">
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
        <div className="flex flex-col gap-3 rounded-2xl border border-gold/55 bg-gradient-to-br from-gold/12 via-panel to-panel-2 p-4">
          <div className="flex items-center gap-2 text-gold">
            <Flame size={18} aria-hidden="true" />
            <h3 className="m-0 font-anton text-xl uppercase leading-none">{sessao.altar_ativo.nome}</h3>
          </div>
          <p className="m-0 text-xs leading-relaxed text-text">{sessao.altar_ativo.descricao}</p>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <p className="m-0 rounded-xl border border-coral/50 bg-panel px-3 py-2.5 text-text">
              <strong className="text-coral">Custo:</strong> {sessao.altar_ativo.custo}
            </p>
            <p className="m-0 rounded-xl border border-gold/50 bg-panel px-3 py-2.5 text-text">
              <strong className="text-gold">Recompensa:</strong> {sessao.altar_ativo.recompensa}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              disabled={ocupado}
              onClick={() => aoDecidirAltar('aceitar')}
              className="h-11 cursor-pointer rounded-full bg-gradient-to-r from-gold to-holo-3 px-5 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aceitar altar
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => aoDecidirAltar('ignorar')}
              className="h-11 cursor-pointer rounded-full border border-line bg-panel px-5 text-xs font-bold text-text hover:border-holo-3/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ignorar e seguir
            </button>
          </div>
        </div>
      )}

      {sessao.escolhas_bencao.length === 0 && !sessao.altar_ativo && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
          {proximoMonstro && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-text">
                <ShieldAlert size={15} className="shrink-0 text-coral" aria-hidden="true" />
                <span>
                  Próximo guardião ({sessao.andar_atual + 1}º andar): <strong>{proximoMonstro.nome}</strong> (nv.{' '}
                  {proximoMonstro.nivel})
                </span>
              </span>
              <span className="rounded-full border border-line bg-panel-2 px-2.5 py-0.5 font-mono text-xs text-muted">
                {proximoMonstro.tipo === 'chefe' ? 'Chefe do andar' : 'Guardião'}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
            {sessao.pode_avancar && (
              <button
                type="button"
                disabled={ocupado}
                onClick={aoAvancar}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 px-5 text-xs font-extrabold text-void shadow-md disabled:cursor-not-allowed disabled:opacity-50"
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
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-gold/55 bg-gold/12 px-4 text-xs font-bold text-gold hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Flag size={14} aria-hidden="true" />
                Recuar com os espólios
              </button>
            )}
          </div>
        </div>
      )}

      {(grupo_andar || ultimo_andar) && ultimo_andar && (
        <details className="rounded-2xl border border-line bg-panel p-4 text-xs">
          <summary className="cursor-pointer font-bold text-text">
            {grupo_andar
              ? `Combate do esquadrão no ${sessao.andar_atual}º andar (${ultimo_andar.monstro.nome} — ${ultimo_andar.resultado.rodadas} rodadas)`
              : `Combate do ${sessao.andar_atual}º andar (${ultimo_andar.monstro.nome} — ${ultimo_andar.resultado.rodadas} rodadas)`}
          </summary>
          <ol className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
            {ultimo_andar.resultado.turnos.slice(0, 12).map((t, idx) => {
              const { texto, valor } = descreverTurno(t, ultimo_andar.monstro.nome)
              const doHeroi = t.atacante === 'jogador'
              return (
                <li
                  key={idx}
                  className={`flex items-start justify-between gap-2 rounded-xl border px-3 py-1.5 ${
                    doHeroi ? 'border-holo-3/25 bg-holo-3/5' : 'border-coral/25 bg-coral/5'
                  }`}
                >
                  <span className="min-w-0 flex-1 break-words leading-snug text-text">{texto}</span>
                  <span className={`shrink-0 font-mono font-bold ${doHeroi ? 'text-holo-3' : 'text-coral'}`}>{valor}</span>
                </li>
              )
            })}
          </ol>
        </details>
      )}
    </section>
  )
}
