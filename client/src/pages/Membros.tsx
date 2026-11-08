// client/src/pages/Membros.tsx
// Ranking de membros, terceira aba do Descobrir. Liga da semana (XP desde segunda,
// horário de Brasília) para quem chegou agora ter chance; Hall da Fama para a constância.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Crown, Trophy, Users } from 'lucide-react'
import AbasDescobrir from '../components/AbasDescobrir'
import { useSessao } from '../contexts/SessaoContext'
import { useComunidade } from '../hooks/useComunidade'
import { obterEstiloRank } from '../lib/guilda'
import SeloEquipe from '../components/comunidade/SeloEquipe'
import type { MembroNoRanking } from '../lib/comunidade'

type Periodo = 'semana' | 'geral'

const MEDALHAS = ['text-gold', 'text-muted', 'text-gold/60']

export default function Membros() {
  const [params, setParams] = useSearchParams()
  const periodo: Periodo = params.get('periodo') === 'geral' ? 'geral' : 'semana'
  const { session } = useSessao()
  const { estado } = useComunidade()
  const [lista, setLista] = useState<MembroNoRanking[] | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let ativo = true
    setLista(null)
    setErro(false)
    fetch(`/api/membros/ranking?periodo=${periodo}`)
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json() as Promise<MembroNoRanking[]>
      })
      .then(dados => {
        if (ativo) setLista(dados)
      })
      .catch(() => {
        if (ativo) setErro(true)
      })
    return () => {
      ativo = false
    }
  }, [periodo])

  const meuHandle = estado?.perfil.existe ? estado.perfil.handle : null
  const minhaLinha = lista?.find(m => m.handle === meuHandle)

  return (
    <div className="w-full max-w-[960px] mx-auto px-4 sm:px-6 pt-6 pb-24">
      <AbasDescobrir />

      <header className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest mb-1 select-none">// guilda do anideck</p>
          <h1 className="font-anton text-3xl md:text-4xl uppercase m-0 select-none">
            Ranking de <span className="text-holo">membros</span>
          </h1>
          <p className="text-sm text-muted mt-1.5 mb-0">
            {periodo === 'semana'
              ? 'XP ganho desde segunda-feira. Reinicia toda semana: qualquer um pode chegar ao topo.'
              : 'XP de todos os tempos. A constância de quem está aqui há mais tempo.'}
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-full bg-panel border border-line select-none" role="tablist" aria-label="Período">
          {([
            ['semana', 'Esta semana'],
            ['geral', 'Hall da Fama'],
          ] as const).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={periodo === valor}
              onClick={() => setParams(valor === 'semana' ? {} : { periodo: valor }, { replace: true })}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                periodo === valor ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void' : 'text-muted hover:text-text'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
      </header>

      {session && estado && !estado.perfil.existe && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 mb-5 rounded-2xl border border-dashed border-holo-3/40 bg-holo-3/5">
          <p className="text-[13px] text-text m-0">
            <b>Você ainda não aparece aqui.</b> <span className="text-muted">Crie seu @ para entrar no ranking e comentar episódios.</span>
          </p>
          <Link to="/configuracoes#comunidade" className="px-4 py-2 rounded-full text-xs font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2">
            Criar perfil público
          </Link>
        </div>
      )}

      {erro ? (
        <div className="p-6 rounded-2xl bg-panel border border-line text-center text-sm text-muted">
          Não foi possível carregar o ranking agora. Tente de novo em instantes.
        </div>
      ) : lista === null ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-panel border border-line animate-pulse" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="p-8 rounded-2xl bg-panel border border-line text-center">
          <Users size={26} className="mx-auto text-muted-2 mb-3" aria-hidden />
          <p className="font-bold text-text m-0">{periodo === 'semana' ? 'Ninguém pontuou esta semana ainda.' : 'O Hall da Fama está vazio.'}</p>
          <p className="text-sm text-muted mt-1.5 mb-0">Cada episódio marcado vale XP. O primeiro lugar está livre.</p>
        </div>
      ) : (
        <>
          {meuHandle && periodo === 'semana' && !minhaLinha && (
            <p className="font-mono text-[11px] text-muted-2 mb-3">Você ainda não pontuou esta semana. Um episódio já te coloca na lista.</p>
          )}
          <ol className="list-none m-0 p-0 space-y-2">
            {lista.map(m => {
              const estilo = obterEstiloRank(m.rank)
              const eu = m.handle === meuHandle
              const podio = m.posicao <= 3
              return (
                <li key={m.handle}>
                  <Link
                    to={`/u/${m.handle}`}
                    className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-colors ${
                      eu ? 'bg-holo-2/10 border-holo-2/50' : 'bg-panel border-line hover:border-holo-3/50'
                    }`}
                  >
                    <span className={`w-8 text-center font-anton text-lg shrink-0 ${podio ? MEDALHAS[m.posicao - 1] : 'text-muted-2'}`}>
                      {m.posicao === 1 ? <Crown size={20} className="mx-auto" aria-label="1º" /> : m.posicao}
                    </span>
                    <span className="w-10 h-10 rounded-full shrink-0 grid place-items-center font-anton text-base text-void bg-gradient-to-br from-holo-2 to-holo-3" aria-hidden>
                      {m.nome.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-[14px] text-text truncate">{m.nome}</span>
                        <SeloEquipe handle={m.handle} />
                        {eu && <span className="font-mono text-[9.5px] uppercase px-1.5 py-0.5 rounded bg-holo-2/20 text-holo-2 shrink-0">você</span>}
                      </span>
                      <span className="block font-mono text-[10.5px] text-muted-2 truncate">
                        @{m.handle} · {m.titulo_rank}
                      </span>
                    </span>
                    <span className={`hidden sm:grid w-10 h-10 rounded-xl place-items-center font-anton text-base shrink-0 ${estilo.seloBg} ${estilo.seloTexto}`} title={`Rank ${m.rank}`}>
                      {m.rank}
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block font-anton text-lg leading-none">
                        {periodo === 'semana' ? '+' : ''}
                        {m.xp.toLocaleString('pt-BR')}
                      </span>
                      <span className="block font-mono text-[9.5px] text-muted-2 uppercase mt-0.5">XP · nv {m.nivel}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </>
      )}

      <p className="font-mono text-[10.5px] text-muted-2 mt-6 flex items-start gap-2">
        <Trophy size={12} className="shrink-0 mt-0.5" aria-hidden />
        Só aparecem perfis públicos. O XP vem de episódios marcados, com teto diário e sem farm de lista importada.
      </p>
    </div>
  )
}
