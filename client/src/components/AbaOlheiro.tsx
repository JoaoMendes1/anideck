import { useState } from 'react'
import { Crown, Users } from 'lucide-react'
import { useOlheiro, type SugestaoPendente, type DemandaCuradoria } from '../hooks/useOlheiro'

type Props = {
  onCurar: (sugestao: SugestaoPendente) => void
}

// Duas abas porque são decisões diferentes: "isto combina com o meu gosto?" e
// "tem gente esperando por isto?". Numa lista só, a demanda enterraria as
// sugestões assim que houvesse usuários de verdade.
const ABAS = [
  { id: 'sugestoes', nome: 'Sugestões' },
  { id: 'demanda', nome: 'Demanda' },
] as const

type AbaId = typeof ABAS[number]['id']

const formatarData = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function AbaOlheiro({ onCurar }: Props) {
  const {
    sugestoes, demanda, carregando, erro,
    revisar, remover, removerDaDemanda, buscarNovas, buscando,
  } = useOlheiro()

  const [aba, setAba] = useState<AbaId>('sugestoes')

  // A demanda não passa pela fila, então não tem id de sugestão. O id 0 sinaliza
  // isso para o Painel, que só marca 'curado' quando o id é de verdade.
  const curarDemanda = (d: DemandaCuradoria) => {
    onCurar({
      id: 0,
      mal_id: d.mal_id,
      titulo: d.titulo,
      imagem_url: '',
      motivo: '',
      score: 0,
    })
    removerDaDemanda(d.mal_id)
  }

  return (
    <div className="p-1">
      <nav className="flex gap-1.5 mb-4">
        {ABAS.map(a => {
          const total = a.id === 'sugestoes' ? sugestoes.length : demanda.length
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              aria-current={aba === a.id}
              className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border cursor-pointer transition-colors ${aba === a.id
                  ? 'bg-panel-2 border-line text-text'
                  : 'bg-transparent border-transparent text-muted hover:bg-panel hover:text-text'
                }`}
            >
              {a.nome}
              {total > 0 && (
                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full ${a.id === 'demanda' ? 'bg-gold/15 text-gold' : 'bg-holo-2/15 text-holo-2'
                  }`}>
                  {total}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {erro && <p className="text-sm text-coral mb-3">{erro}</p>}

      {/* ---------- Sugestões: o que a AniList tem e combina com o gosto ---------- */}
      {aba === 'sugestoes' && (
        <>
          <button
            onClick={buscarNovas}
            disabled={buscando}
            className="w-full mb-4 py-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-holo-1 to-holo-2 text-void disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-opacity"
          >
            {buscando ? 'Buscando na AniList...' : '🔭 Buscar novas sugestões'}
          </button>

          {carregando ? (
            <p className="text-sm text-muted py-8 text-center">Carregando sugestões...</p>
          ) : sugestoes.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted">Nenhuma sugestão pendente.</p>
              <p className="text-sm text-muted/70 mt-2">
                Clique acima para o Olheiro procurar candidatos na AniList.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {sugestoes.map(s => (
                <article
                  key={s.id}
                  className="bg-panel-2 border border-line rounded-xl overflow-hidden flex flex-col"
                >
                  <img
                    src={s.imagem_url}
                    alt={s.titulo}
                    className="w-full aspect-[3/4] object-cover"
                    loading="lazy"
                  />

                  <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                    <h3 className="font-bold text-xs line-clamp-2 text-text">{s.titulo}</h3>
                    <p className="text-[11px] text-muted flex-1 line-clamp-2">{s.motivo}</p>
                    <span className="font-mono text-[10px] text-holo-1">
                      afinidade {s.score.toFixed(1)}
                    </span>

                    <div className="flex gap-1.5 mt-1">
                      <button
                        onClick={() => { onCurar(s); remover(s.id) }}
                        className="flex-1 text-[11px] font-bold py-1.5 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void hover:opacity-90 cursor-pointer transition-opacity"
                      >
                        Curar
                      </button>
                      <button
                        onClick={() => revisar(s.id, 'dispensado')}
                        className="flex-1 text-[11px] font-bold py-1.5 rounded-full bg-panel border border-line text-muted hover:text-text cursor-pointer transition-colors"
                      >
                        Dispensar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* ---------- Demanda: o que os usuários já salvaram e o catálogo não cobre ---------- */}
      {aba === 'demanda' && (
        <>
          <p className="text-[13px] text-muted mb-4 max-w-[62ch]">
            Anime no deck de alguém e fora do catálogo. Mais gente primeiro — e o que está no
            seu deck vem na frente. Não tem "dispensar": esconder o buraco não o fecha.
          </p>

          {carregando ? (
            <p className="text-sm text-muted py-8 text-center">Carregando demanda...</p>
          ) : demanda.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted">Nada pendente.</p>
              <p className="text-sm text-muted/70 mt-2">
                Todo anime que está em algum deck já tem ficha na curadoria.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {demanda.map(d => (
                <article
                  key={d.mal_id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${d.tem_admin ? 'border-gold/40 bg-gold/5' : 'border-line bg-panel-2'
                    }`}
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-text truncate flex items-center gap-1.5">
                      {d.tem_admin && <Crown size={13} className="text-gold shrink-0" />}
                      {d.titulo}
                    </h3>
                    <p className="font-mono text-[11px] text-muted-2 truncate">
                      mal_id {d.mal_id}
                      {/* Corta o domínio do e-mail. Some quando existir nome de usuário. */}
                      {d.usuarios.length > 0 && ` · ${d.usuarios.map(u => u.split('@')[0]).join(', ')}`}
                      {d.ultimo_add && ` · ${formatarData(d.ultimo_add)}`}
                    </p>
                  </div>

                  <span className="flex items-center gap-1.5 shrink-0 font-mono text-[11px] px-2.5 py-1 rounded-full border border-line text-muted">
                    <Users size={12} /> {d.total_usuarios}
                  </span>

                  <button
                    onClick={() => curarDemanda(d)}
                    className="shrink-0 text-[11px] font-bold px-4 py-1.5 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void hover:opacity-90 cursor-pointer transition-opacity"
                  >
                    Curar
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}