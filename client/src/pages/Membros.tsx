// client/src/pages/Membros.tsx
// Ranking de membros, terceira aba do Descobrir. Liga da semana com divisões,
// Temporada atual (trimestre), Hall da Fama e Ranking por Gênero.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Crown, Trophy, Users, Shield } from 'lucide-react'
import AbasDescobrir from '../components/AbasDescobrir'
import { useSessao } from '../contexts/SessaoContext'
import { useComunidade } from '../hooks/useComunidade'
import { obterEstiloRank } from '../lib/guilda'
import SeloEquipe from '../components/comunidade/SeloEquipe'
import RankingClasLiga from '../components/comunidade/RankingClasLiga'
import { obterClasseMoldura, obterClasseCorNome, renderizarEmblema } from '../lib/cosmeticos'
import { formatarSemanaISO } from '../lib/dataHora'
import type { MembroNoRanking } from '../lib/comunidade'

type Periodo = 'semana' | 'temporada' | 'geral' | 'genero' | 'clas'

const MEDALHAS = ['text-gold', 'text-muted', 'text-gold/60']

const GENEROS_DISPONIVEIS = [
  'Ação',
  'Aventura',
  'Comédia',
  'Drama',
  'Fantasia',
  'Ficção Científica',
  'Romance',
  'Shounen',
  'Seinen',
  'Sobrenatural',
  'Mistério',
  'Slice of Life',
  'Esportes',
  'Suspense',
]

interface DadosLiga {
  semana: string
  minha_divisao: string
  meu_grupo: number
  total_ativos: number
  modo_divisao_ativa: boolean
}

function obterEstiloDivisao(divisao: string) {
  switch (divisao.toLowerCase()) {
    case 'diamante':
      return { border: 'border-holo-1/60', bg: 'bg-holo-1/10', texto: 'text-holo-1' }
    case 'platina':
      return { border: 'border-holo-3/60', bg: 'bg-holo-3/10', texto: 'text-holo-3' }
    case 'ouro':
      return { border: 'border-gold/60', bg: 'bg-gold/10', texto: 'text-gold' }
    case 'prata':
      return { border: 'border-slate-400/60', bg: 'bg-slate-800/40', texto: 'text-slate-200' }
    default:
      return { border: 'border-amber-700/60', bg: 'bg-amber-950/30', texto: 'text-amber-400' }
  }
}

export default function Membros() {
  const [params, setParams] = useSearchParams()
  const rawPeriodo = params.get('periodo')
  const periodo: Periodo =
    rawPeriodo === 'geral' || rawPeriodo === 'temporada' || rawPeriodo === 'genero' || rawPeriodo === 'clas'
      ? rawPeriodo
      : 'semana'

  const [generoSelecionado, setGeneroSelecionado] = useState('Ação')
  const { session } = useSessao()
  const { estado } = useComunidade()
  const [lista, setLista] = useState<MembroNoRanking[] | null>(null)
  const [dadosLiga, setDadosLiga] = useState<DadosLiga | null>(null)
  const [erro, setErro] = useState(false)

  // Carrega Liga Semanal se estiver na aba 'semana' e autenticado
  useEffect(() => {
    if (periodo !== 'semana' || !session?.access_token) {
      setDadosLiga(null)
      return
    }

    let ativo = true
    fetch('/api/membros/liga', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (ativo && d) setDadosLiga(d)
      })
      .catch(() => undefined)

    return () => {
      ativo = false
    }
  }, [periodo, session?.access_token])

  // Carrega a lista do ranking individual
  useEffect(() => {
    if (periodo === 'clas') return

    let ativo = true
    setLista(null)
    setErro(false)

    const url =
      periodo === 'genero'
        ? `/api/membros/ranking/genero?genero=${encodeURIComponent(generoSelecionado)}`
        : `/api/membros/ranking?periodo=${periodo}`

    fetch(url)
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
  }, [periodo, generoSelecionado])

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
            {periodo === 'semana' && 'XP ganho desde segunda-feira. Liga semanal com prêmios em AniCoins e promoção de divisão.'}
            {periodo === 'temporada' && 'XP acumulado na temporada atual (trimestre). Reinicia a cada virada de estação.'}
            {periodo === 'geral' && 'XP de todos os tempos. A constância de quem está aqui há mais tempo.'}
            {periodo === 'genero' && `Membros mais experientes no gênero ${generoSelecionado}. O XP reflete os episódios assistidos do gênero.`}
            {periodo === 'clas' && 'Liga de clãs da temporada (trimestre). Pontuação justa pela média dos 10 melhores membros. Prêmios exclusivos e AniCoins para o Top 3!'}
          </p>
        </div>

        {/* Abas de Navegação */}
        <div className="flex gap-1 p-1 rounded-full bg-panel border border-line select-none flex-wrap" role="tablist" aria-label="Período">
          {([
            ['semana', 'Semana'],
            ['temporada', 'Temporada'],
            ['geral', 'Hall da Fama'],
            ['genero', 'Por Gênero'],
            ['clas', 'Liga de Clãs'],
          ] as const).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={periodo === valor}
              onClick={() => setParams(valor === 'semana' ? {} : { periodo: valor }, { replace: true })}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                periodo === valor ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void' : 'text-muted hover:text-text'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
      </header>

      {periodo === 'clas' ? (
        <RankingClasLiga />
      ) : (
        <>
          {/* Seletor de Gênero quando em 'genero' */}
          {periodo === 'genero' && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar select-none">
              {GENEROS_DISPONIVEIS.map(g => {
                const ativo = g === generoSelecionado
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGeneroSelecionado(g)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                      ativo
                        ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void border-transparent shadow-md'
                        : 'bg-panel-2 border-line text-muted hover:text-text hover:border-holo-3/40'
                    }`}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
          )}

          {/* Banner da Liga Semanal */}
          {periodo === 'semana' && dadosLiga && (
            <div className={`flex flex-wrap items-center justify-between gap-3 p-4 mb-5 rounded-2xl border ${obterEstiloDivisao(dadosLiga.minha_divisao).border} ${obterEstiloDivisao(dadosLiga.minha_divisao).bg}`}>
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl grid place-items-center font-anton text-lg border ${obterEstiloDivisao(dadosLiga.minha_divisao).border} bg-panel/70 ${obterEstiloDivisao(dadosLiga.minha_divisao).texto}`}>
                  <Shield size={20} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-anton text-base uppercase tracking-wider ${obterEstiloDivisao(dadosLiga.minha_divisao).texto}`}>
                      Divisão {dadosLiga.minha_divisao}
                    </span>
                    {dadosLiga.modo_divisao_ativa ? (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-holo-2/20 text-holo-2 border border-holo-2/30">
                        Grupo {dadosLiga.meu_grupo} (20 membros)
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-panel border border-line text-muted-2">
                        Liga Unificada ({dadosLiga.total_ativos} ativos)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted m-0 mt-0.5">
                    Top 3 ganham 50, 30 e 15 AniCoins na virada de domingo para segunda (00:05).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-2">Período:</span>
                <span
                  className="font-mono text-xs font-bold text-text bg-panel px-2.5 py-1 rounded-lg border border-line"
                  title={`Código da semana: ${dadosLiga.semana}`}
                >
                  {formatarSemanaISO(dadosLiga.semana)}
                </span>
              </div>
            </div>
          )}

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
              <p className="font-bold text-text m-0">
                {periodo === 'semana' && 'Ninguém pontuou esta semana ainda.'}
                {periodo === 'temporada' && 'Ninguém pontuou nesta temporada ainda.'}
                {periodo === 'geral' && 'O Hall da Fama está vazio.'}
                {periodo === 'genero' && `Nenhum membro pontuou no gênero ${generoSelecionado} ainda.`}
              </p>
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
                        <span className={`w-10 h-10 rounded-full shrink-0 grid place-items-center font-anton text-base text-void bg-gradient-to-br from-holo-2 to-holo-3 ${obterClasseMoldura(m.moldura)}`} aria-hidden>
                          {m.nome.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className={`font-bold text-[14px] truncate ${obterClasseCorNome(m.cor_nome)}`}>{m.nome}</span>
                            {renderizarEmblema(m.emblema, 'sm')}
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
                            {periodo === 'semana' || periodo === 'temporada' ? '+' : ''}
                            {m.xp.toLocaleString('pt-BR')}
                          </span>
                          <span className="block font-mono text-[9.5px] text-muted-2 uppercase mt-0.5">
                            {periodo === 'genero' ? 'XP gênero' : `XP · nv ${m.nivel}`}
                          </span>
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
        </>
      )}
    </div>
  )
}
