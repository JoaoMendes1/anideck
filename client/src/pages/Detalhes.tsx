import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PlayCircle, Star, AlertCircle, Save, Trash2, Bookmark } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import BotaoCopiar from '../components/BotaoCopiar'
import ReactMarkdown from 'react-markdown'

interface AnimeDetail {
  mal_id: number
  title: string
  status: string
  synopsis: string
  episodes: number
  score: number
  bannerImage?: string
  images: { jpg: { image_url: string } }
  genres: { name: string }[]
  studios: { name: string }[]
  streaming: { name: string; url: string }[]
  theme: { openings: string[]; endings: string[] }
  relations: { relation: string; entry: { mal_id: number; type: string; name: string; image?: string }[] }[]
  characters?: { id: number; name: string; image: string; role: string }[]
}

interface AnimeStats {
  scores: { score: number; votes: number; percentage: number }[]
}

interface MinhaEntrada {
  id: string
  status: string
  mal_id: number
  tipo: string
  nota?: number | null
  anotacao?: string
  is_favorite?: boolean
}

const STATUS_OPCOES = ['Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado']

export default function Detalhes() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()

  const [anime, setAnime] = useState<AnimeDetail | null>(null)
  const [stats, setStats] = useState<AnimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [minhaEntrada, setMinhaEntrada] = useState<MinhaEntrada | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const [statusInput, setStatusInput] = useState<string>('Quero Assistir')
  const [notaInput, setNotaInput] = useState<string>('')
  const [anotacaoInput, setAnotacaoInput] = useState<string>('')
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [resAnime, resStats] = await Promise.all([
          fetch(`/api/anime/${id}`),
          fetch(`/api/anime/${id}/statistics`)
        ])

        if (!resAnime.ok || !resStats.ok) {
          throw new Error('Falha ao carregar os dados do anime. Tente novamente.')
        }

        const dataAnime = await resAnime.json()
        const dataStats = await resStats.json()
        setAnime(dataAnime.data)
        setStats(dataStats.data)

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const resEntries = await fetch('/api/entries', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
          if (resEntries.ok) {
            const entradas = await resEntries.json()
            const entrada = entradas?.find((e: any) => e.mal_id === Number(id))
            if (entrada) {
              setMinhaEntrada(entrada)
              setStatusInput(entrada.status)
              setNotaInput(entrada.nota !== null && entrada.nota !== undefined ? entrada.nota.toString() : '')
              setAnotacaoInput(entrada.anotacao || '')
              setIsFavorite(entrada.is_favorite || false)
            }
          }
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchData()
  }, [id])

  const handleAtualizarEntrada = async (overrideStatus?: string) => {
    setSalvando(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      showToast('Você precisa estar logado para salvar no Deck.', 'error')
      setSalvando(false)
      return
    }

    const statusFinal = overrideStatus || statusInput
    const notaStr = String(notaInput).trim()
    const notaFinal = notaStr === '' ? null : Number(notaStr.replace(',', '.'))

    const payload = {
      mal_id: Number(id),
      tipo: 'anime',
      status: statusFinal,
      nota: Number.isNaN(notaFinal) ? null : notaFinal,
      anotacao: anotacaoInput,
      is_favorite: isFavorite
    }

    try {
      const url = minhaEntrada ? `/api/entries/${minhaEntrada.id}` : '/api/entries'
      const method = minhaEntrada ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error()

      const atualizada = await response.json()
      const novaEntrada = Array.isArray(atualizada) ? atualizada[0] : atualizada

      setMinhaEntrada(novaEntrada)
      if (overrideStatus) setStatusInput(overrideStatus)
      setNotaInput(novaEntrada.nota !== null && novaEntrada.nota !== undefined ? novaEntrada.nota.toString() : '')
      setIsFavorite(novaEntrada.is_favorite || false)

      showToast(
        overrideStatus ? 'Parabéns! Movido para os Completos.' :
          minhaEntrada ? 'Alterações salvas!' : 'Adicionado ao Deck com sucesso!',
        'success'
      )
    } catch {
      showToast('Erro ao atualizar seu Deck. Tente novamente.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const handleRemoverEntrada = async () => {
    if (!minhaEntrada) return
    setExcluindo(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const response = await fetch(`/api/entries/${minhaEntrada.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!response.ok) throw new Error()

      setMinhaEntrada(null)
      setStatusInput('Quero Assistir')
      setNotaInput('')
      setAnotacaoInput('')
      setIsFavorite(false)
      showToast('Anime removido do seu Deck.', 'success')
    } catch {
      showToast('Erro ao remover do Deck. Tente novamente.', 'error')
    } finally {
      setExcluindo(false)
    }
  }

  const traduzirStatus = (statusOriginal: string) => {
    if (statusOriginal === 'FINISHED' || statusOriginal === 'Finished Airing') return 'Finalizado'
    if (statusOriginal === 'RELEASING' || statusOriginal === 'Currently Airing') return 'Em Lançamento'
    if (statusOriginal === 'NOT_YET_RELEASED' || statusOriginal === 'Not yet aired') return 'Em Breve'
    return statusOriginal
  }

  const notaDisplay = notaInput && String(notaInput).trim() !== '' ? notaInput : 'N/A'
  const temNotaDisplay = notaDisplay !== 'N/A'

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-line border-t-holo-3 animate-spin mb-4"></div>
        <p className="font-mono text-muted text-sm tracking-widest">Carregando anime...</p>
      </div>
    )
  }

  if (error || !anime) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="text-coral mb-4" size={48} />
        <h2 className="font-anton text-2xl text-text uppercase mb-2">Erro de Conexão</h2>
        <p className="text-muted mb-6">{error || 'Anime não encontrado.'}</p>
        <Link to="/" className="text-holo-3 font-bold hover:underline">Voltar para a Busca</Link>
      </div>
    )
  }

  const maxPercentage = stats?.scores ? Math.max(...stats.scores.map(s => s.percentage)) : 100

  return (
    <div className="-mt-24 pb-20">

      {/* BANNER GIGANTE */}
      <div className="relative h-[300px] md:h-[450px] w-full overflow-hidden bg-panel-2">
        {anime.bannerImage ? (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
            style={{ backgroundImage: `url(${anime.bannerImage})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#3a1a4a] to-[#0A0714]" />
        )}
        <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-void/95 via-void/60 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent z-10" />
      </div>

      <div className="max-w-[1040px] mx-auto px-5 -mt-[120px] md:-mt-[160px] relative z-20 pb-2">

        <div className="flex flex-col sm:flex-row gap-5 sm:items-end mb-8 text-center sm:text-left items-center">
          <div className="relative">
            {isFavorite && (
              <div className="absolute -top-4 -right-4 w-10 h-10 bg-void/80 border border-gold/50 rounded-full flex items-center justify-center text-xl shadow-[0_0_15px_rgba(255,197,66,0.4)] z-30">
                👑
              </div>
            )}
            <img
              src={anime.images?.jpg?.image_url}
              alt={`Poster de ${anime.title}`}
              className={`w-[140px] md:w-[170px] h-[198px] md:h-[240px] rounded-xl shadow-[0_15px_30px_-10px_rgba(0,0,0,0.8)] border-[3px] shrink-0 object-cover bg-panel-2 transition-colors ${isFavorite ? 'border-gold' : 'border-panel'}`}
            />
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-2 group">
              <h1 className="font-anton text-[clamp(1.4rem,3.5vw,2.4rem)] uppercase leading-[1.05] tracking-wide drop-shadow-md break-words">
                {anime.title}
              </h1>
              <BotaoCopiar
                texto={anime.title}
                className="opacity-70 md:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start font-mono text-[11px] text-muted mb-3">
              <span className="text-holo-3">{traduzirStatus(anime.status)}</span>
              <span className="text-muted-2">•</span>
              <span>{anime.episodes || '?'} EP</span>
              {anime.studios?.length > 0 && (
                <>
                  <span className="text-muted-2">•</span>
                  <span>{anime.studios[0].name}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-4">
              {anime.genres?.map(g => (
                <span key={g.name} className="text-[10px] font-bold px-3 py-1 rounded-full bg-panel border border-line text-muted select-none">
                  {g.name}
                </span>
              ))}
            </div>

            <div className="bg-panel border border-line rounded-xl px-5 py-3 inline-flex items-center gap-5 shrink-0 shadow-lg mt-1 select-none">
              <div className="flex items-center gap-3">
                <Star className="text-gold fill-gold w-6 h-6" />
                <div className="text-left">
                  <div className="font-anton text-[22px] text-gold leading-none">{anime.score || 'N/A'}</div>
                  <div className="text-[10px] font-bold text-muted-2 mt-1 uppercase tracking-wide">Nota Geral</div>
                </div>
              </div>

              <div className="w-[1px] h-8 bg-line"></div>

              <div className="flex items-center gap-3">
                <Star className={`w-6 h-6 ${temNotaDisplay ? 'text-holo-3 fill-holo-3' : 'text-muted-2'}`} />
                <div className="text-left">
                  <div className={`font-anton text-[22px] leading-none ${temNotaDisplay ? 'text-holo-3' : 'text-muted-2'}`}>
                    {notaDisplay}
                  </div>
                  <div className="text-[10px] font-bold text-muted-2 mt-1 uppercase tracking-wide">Sua Nota</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky top-[63px] md:top-[73px] z-40 bg-void/95 backdrop-blur-sm border-b border-line overflow-x-auto whitespace-nowrap py-3 mb-8 scrollbar-hide">
          <div className="flex gap-2.5">
            <a href="#visao-geral" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Visão Geral</a>
            {anime.characters && anime.characters.length > 0 && (
              <a href="#personagens" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Personagens</a>
            )}
            <a href="#onde-assistir" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Onde Assistir</a>
            <a href="#estatisticas" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Estatísticas</a>
            <a href="#relacionados" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Relacionados</a>
          </div>
        </div>

        {minhaEntrada?.status === 'Em Dia' && (anime.status === 'Finished Airing' || anime.status === 'FINISHED') && (
          <div className="bg-gradient-to-r from-holo-1/20 to-holo-2/20 border border-holo-2/40 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg mb-8 backdrop-blur-md">
            <div className="text-center md:text-left">
              <h3 className="font-anton uppercase text-holo-1 text-xl mb-1">Anime Finalizado!</h3>
              <p className="font-bold text-sm text-text">A AniList detectou que esta obra acabou. Deseja mover da sua lista de "Em Dia" para "Completo"?</p>
            </div>
            <button
              type="button"
              onClick={() => handleAtualizarEntrada('Completo')}
              disabled={salvando}
              className="select-none bg-gradient-to-r from-holo-1 to-holo-2 text-void px-6 py-3 rounded-full font-extrabold text-sm shrink-0 transition-transform cursor-pointer hover:opacity-90 disabled:opacity-50"
            >
              {salvando ? 'Atualizando...' : 'Marcar como Completo ✓'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10" id="visao-geral">
          <div className="space-y-10 min-w-0">

            <section>
              <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                <span className="font-mono text-[11px] text-holo-3">01</span> Sinopse
              </h2>
              <div className="text-muted text-[14.5px] leading-[1.7] bg-panel border border-line rounded-2xl p-6">
                {anime.synopsis ? (
                  <ReactMarkdown
                    components={{
                      // Mapeamos os parágrafos para manter o espaçamento
                      p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                      // Mapeamos o Negrito (**) para ficar branco e com peso extra
                      strong: ({node, ...props}) => <strong className="font-extrabold text-text" {...props} />,
                      // Mapeamos o Itálico (*) para pegar a cor ciano (holo-3) do nosso tema
                      em: ({node, ...props}) => <em className="italic text-holo-3" {...props} />
                    }}
                  >
                    {/* Limpamos as aspas que o Bluemonday (Go) encodou antes de passar pro Markdown */}
                    {anime.synopsis.replace(/&#34;/g, '"').replace(/&#39;/g, "'")}
                  </ReactMarkdown>
                ) : (
                  'Sinopse não disponível nesta base de dados.'
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-anton text-base uppercase flex items-center gap-2 select-none m-0">
                  <span className="font-mono text-[11px] text-holo-3">02</span> Sua Avaliação
                </h2>

                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`select-none flex items-center gap-2 text-[12.5px] font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${isFavorite ? 'bg-coral/10 text-coral border-coral/30 shadow-[0_0_10px_rgba(255,92,108,0.2)]' : 'bg-panel border-line text-muted hover:text-text hover:border-muted-2'}`}
                  title="Marcar como Favorito"
                >
                  {isFavorite ? '❤️ Favorito' : '🤍 Favoritar'}
                </button>
              </div>

              <div className="bg-panel border border-line rounded-2xl p-5 relative">
                {salvando && (
                  <div className="absolute inset-0 bg-panel/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                    <div className="w-8 h-8 border-4 border-line border-t-holo-2 rounded-full animate-spin"></div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-5">
                  {STATUS_OPCOES.map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusInput(status)}
                      className={`select-none text-[12.5px] font-bold px-3.5 py-1.5 rounded-full border cursor-pointer transition-colors ${statusInput === status
                          ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-white border-transparent shadow-md'
                          : 'bg-transparent border-line text-muted hover:border-holo-3 hover:text-text'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider select-none">Nota (0-10)</label>
                      {notaInput !== '' && (
                        <button type="button" onClick={() => setNotaInput('')} title="Limpar nota" className="select-none text-[10px] font-bold text-coral hover:text-coral/80 uppercase cursor-pointer">
                          Limpar
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0" max="10" step="0.1"
                      value={notaInput}
                      onChange={(e) => setNotaInput(e.target.value)}
                      placeholder="Ex: 8.5"
                      className="w-full bg-panel-2 border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:border-holo-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2 select-none">Anotação Privada</label>
                    <textarea
                      value={anotacaoInput}
                      onChange={(e) => setAnotacaoInput(e.target.value)}
                      placeholder="O que você achou deste anime?"
                      className="w-full bg-panel-2 border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:border-holo-2 min-h-[80px] resize-none font-manrope"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-center mt-6 pt-6 border-t border-line gap-4">
                  {minhaEntrada ? (
                    <button
                      type="button"
                      onClick={handleRemoverEntrada}
                      disabled={excluindo || salvando}
                      className="select-none flex items-center gap-2 text-[13px] font-bold text-coral/80 hover:text-coral transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 size={16} />
                      {excluindo ? 'Removendo...' : 'Remover do Deck'}
                    </button>
                  ) : (
                    <div className="select-none text-xs text-muted font-bold flex items-center gap-2">
                      <Bookmark size={14} className="text-holo-3" />
                      Ainda não está no Deck
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAtualizarEntrada()}
                    disabled={salvando || excluindo}
                    className="select-none flex items-center gap-2 bg-gradient-to-r from-holo-1 to-holo-3 text-void px-6 py-3 rounded-xl text-[13.5px] font-extrabold transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center"
                  >
                    <Save size={16} />
                    {minhaEntrada ? 'Salvar Alterações' : 'Adicionar ao Deck'}
                  </button>
                </div>
              </div>
            </section>

            {anime.characters && anime.characters.length > 0 && (
              <section id="personagens">
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">03</span> Personagens
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {anime.characters.map(char => (
                    <div key={char.id} className="flex-none w-[110px] sm:w-[130px] snap-start group">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden mb-2 bg-panel-2 border border-line">
                         <img src={char.image} alt={char.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="font-bold text-[12px] md:text-[13px] leading-tight truncate text-text group-hover:text-holo-3 transition-colors">{char.name}</div>
                      <div className="font-mono text-[9px] text-muted uppercase tracking-wider truncate mt-0.5">{char.role}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {anime.streaming?.length > 0 && (
              <section id="onde-assistir">
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">04</span> Onde Assistir Oficial
                </h2>
                <div className="flex flex-wrap gap-3">
                  {anime.streaming.map(st => (
                    <a key={st.name} href={st.url} target="_blank" rel="noreferrer" className="select-none flex items-center gap-2 bg-panel border border-line rounded-xl px-5 py-3 text-[13px] font-bold hover:border-holo-1 hover:text-holo-1 transition-colors">
                      <PlayCircle size={16} />
                      {st.name}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {(anime.theme?.openings?.length > 0 || anime.theme?.endings?.length > 0) && (
              <section>
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">05</span> Temas Musicais
                </h2>
                <div className="flex flex-col gap-2">
                  {anime.theme?.openings?.slice(0, 3).map((op, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-panel border border-line rounded-xl text-[13px]">
                      <span className="font-mono text-[10px] text-holo-3 font-bold shrink-0 mr-3 select-none">OP {i + 1}</span>
                      <span className="text-muted truncate">{op}</span>
                    </div>
                  ))}
                  {anime.theme?.endings?.slice(0, 3).map((ed, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-panel border border-line rounded-xl text-[13px]">
                      <span className="font-mono text-[10px] text-holo-1 font-bold shrink-0 mr-3 select-none">ED {i + 1}</span>
                      <span className="text-muted truncate">{ed}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* AQUI ESTÁ A CORREÇÃO DAS IMAGENS! */}
            {anime.relations?.length > 0 && (
              <section id="relacionados">
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">06</span> Títulos Relacionados
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {anime.relations
                    .filter(rel => ['PREQUEL', 'SEQUEL', 'SPIN_OFF', 'ADAPTATION', 'SIDE_STORY', 'PARENT'].includes(rel.relation))
                    .map((rel, i) => {
                      
                      const traduzirRelacao = (r: string) => {
                        const map: Record<string, string> = {
                          'PREQUEL': 'Prequela', 'SEQUEL': 'Sequência', 'SPIN_OFF': 'Spin-off',
                          'ADAPTATION': 'Adaptação', 'SIDE_STORY': 'História Paralela', 'PARENT': 'História Principal'
                        }
                        return map[r] || r
                      }
                      
                      const relationAnime = rel.entry[0]
                      if(!relationAnime) return null

                      return (
                        <Link 
                          key={i} 
                          to={`/anime/${relationAnime.mal_id}`}
                          className="flex-none w-[220px] bg-panel border border-line rounded-xl p-3 transition-colors hover:border-holo-2 group cursor-pointer flex flex-col justify-between"
                        >
                          <div className="font-mono text-[10px] text-holo-2 mb-2 uppercase select-none group-hover:text-holo-3 transition-colors">{traduzirRelacao(rel.relation)}</div>
                          
                          <div className="flex items-center gap-3">
                            {relationAnime.image ? (
                              <img src={relationAnime.image} alt={relationAnime.name} className="w-12 h-16 object-cover rounded-md border border-line shrink-0 bg-panel-2" />
                            ) : (
                              <div className="w-12 h-16 rounded-md border border-line shrink-0 bg-panel-2 flex items-center justify-center text-muted-2 text-[9px] text-center leading-tight">Sem foto</div>
                            )}
                            <div className="text-[12px] font-bold leading-tight text-text group-hover:opacity-80 transition-opacity line-clamp-3">
                              {relationAnime.name}
                            </div>
                          </div>
                        </Link>
                      )
                  })}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-10 min-w-0" id="estatisticas">

            {minhaEntrada && (
              <section>
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">MEU DECK</span>
                </h2>
                <div className="bg-gradient-to-br from-panel to-panel-2 border border-holo-3/30 rounded-2xl p-5">
                  <div className="text-xs font-bold text-muted uppercase mb-1 select-none">Status Atual</div>
                  <div className="font-anton text-2xl text-text mb-4 tracking-wide flex items-center gap-2">
                    {minhaEntrada.status}
                    {isFavorite && <span title="Favorito" className="text-xl">👑</span>}
                  </div>
                  <Link to="/deck" className="select-none block text-center w-full py-2.5 rounded-xl border border-line text-sm font-bold hover:bg-panel-2 transition-colors">
                    Gerenciar no Deck
                  </Link>
                </div>
              </section>
            )}

            {stats && stats.scores && (
              <section>
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">ESTATÍSTICAS</span> Histograma
                </h2>
                <div className="bg-panel border border-line rounded-2xl p-5">
                  <div className="flex items-end gap-1.5 h-[120px] mb-2">
                    {stats.scores.slice().reverse().map(s => {
                      const heightPct = maxPercentage > 0 ? (s.percentage / maxPercentage) * 100 : 0
                      return (
                        <div key={s.score} className="flex-1 flex flex-col justify-end h-full group relative">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="bg-gradient-to-t from-holo-2 to-holo-3 rounded-t-sm opacity-80 group-hover:opacity-100 transition-all w-full"
                          >
                            <span className="select-none absolute -top-7 left-1/2 -translate-x-1/2 bg-void text-text text-[9px] font-mono px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10 border border-line">
                              {s.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-muted-2 px-1 select-none">
                    <span>10</span><span>9</span><span>8</span><span>7</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span>
                  </div>

                  <div className="mt-6 pt-5 border-t border-line">
                    <b className="font-anton text-lg text-text block leading-none mb-1 select-none">
                      {stats.scores.reduce((acc, curr) => acc + curr.votes, 0).toLocaleString()}
                    </b>
                    <span className="font-mono text-[10.5px] text-muted tracking-wider select-none">AVALIAÇÕES</span>
                  </div>
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}