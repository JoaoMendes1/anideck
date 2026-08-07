import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link, Navigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { X } from 'lucide-react'
import { LogoMark } from '../components/Brand'
import { getCategoryTheme } from '../lib/filters'

interface CuratedAnime {
  id?: string
  mal_id: number
  custom_title: string
  custom_synopsis?: string
  custom_format?: string
  custom_status?: string
  custom_tags?: string[]
  order_index: number
}

export default function PainelAdmin() {
  const { showToast } = useToast()
  
  const [destaques, setDestaques] = useState<CuratedAnime[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null) 

  const [termoBusca, setTermoBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultadosBusca, setResultadosBusca] = useState<any[]>([])
  const [preview, setPreview] = useState<any>(null)

  const [editId, setEditId] = useState<string | null>(null)
  const [malId, setMalId] = useState<number | null>(null)
  const [titulo, setTitulo] = useState('')
  const [formato, setFormato] = useState('TV')
  const [status, setStatus] = useState('RELEASING')
  const [ordem, setOrdem] = useState(0)
  const [sinopse, setSinopse] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const [itemParaExcluir, setItemParaExcluir] = useState<{id: string, titulo: string} | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    verificarAcesso()
  }, [])

  const verificarAcesso = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setIsAdmin(false)
      return
    }

    try {
      const response = await fetch('/api/admin/verify', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (response.ok) {
        setIsAdmin(true)
        carregarDestaques()
      } else {
        setIsAdmin(false)
      }
    } catch {
      setIsAdmin(false)
    }
  }

  const carregarDestaques = async () => {
    try {
      const response = await fetch('/api/curation')
      if (!response.ok) throw new Error('Falha ao carregar destaques')
      const data = await response.json()
      setDestaques(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const buscarNaAniList = async () => {
    if (!termoBusca.trim()) return
    setBuscando(true)
    setResultadosBusca([])

    const query = `
      query ($search: String) {
        Page(page: 1, perPage: 5) {
          media(search: $search, type: ANIME) {
            id
            title { romaji english native }
            coverImage { large }
            format
            status
            genres
            synopsis: description
          }
        }
      }
    `
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { search: termoBusca } })
      })
      const { data } = await res.json()
      
      if (data?.Page?.media && data.Page.media.length > 0) {
        setResultadosBusca(data.Page.media)
      } else {
        showToast('Nenhum anime encontrado.', 'error')
      }
    } catch (error) {
      console.error(error)
      showToast('Erro ao buscar na AniList.', 'error')
    } finally {
      setBuscando(false)
    }
  }

  const selecionarAnimeDaBusca = (anime: any) => {
    setMalId(anime.id)
    const tituloCorreto = anime.title.romaji || anime.title.english || anime.title.native
    setTitulo(tituloCorreto)
    setFormato(anime.format || 'TV')
    setStatus(anime.status || 'RELEASING')
    setTags(anime.genres || [])
    
    const limpaSinopse = anime.synopsis ? anime.synopsis.replace(/<[^>]*>?/gm, '') : ''
    setSinopse(limpaSinopse)
    
    setPreview({ 
      title: tituloCorreto, 
      mal_id: anime.id,
      images: { jpg: { image_url: anime.coverImage?.large } }
    })
    
    setResultadosBusca([])
    setTermoBusca('')
  }

  const adicionarTag = (valor: string) => {
    const novaTag = valor.trim().replace(/,/g, '')
    if (novaTag && !tags.includes(novaTag)) {
      setTags([...tags, novaTag])
    }
    setTagInput('')
  }

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      adicionarTag(tagInput)
    }
  }

  const handleBlurTag = () => adicionarTag(tagInput)
  
  const removerTag = (tagRemover: string) => setTags(tags.filter(t => t !== tagRemover))

  // Função para mover as tags pra lá e pra cá
  const moverTag = (index: number, direcao: -1 | 1) => {
    if (index + direcao < 0 || index + direcao >= tags.length) return
    const novasTags = [...tags]
    const temp = novasTags[index]
    novasTags[index] = novasTags[index + direcao]
    novasTags[index + direcao] = temp
    setTags(novasTags)
  }

  const salvarDestaque = async () => {
    if (!malId || !titulo) {
      showToast('Busque um anime e defina um título antes de salvar!', 'error')
      return
    }

    const payload: CuratedAnime = {
      mal_id: malId,
      custom_title: titulo,
      custom_format: formato,
      custom_status: status,
      custom_tags: tags,
      custom_synopsis: sinopse,
      order_index: ordem
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast('Sessão expirada. Faça login novamente.', 'error')
        return
      }

      const url = editId ? `/api/curation/${editId}` : '/api/curation'
      const method = editId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Falha ao salvar destaque')
      
      showToast('Destaque salvo com sucesso!')
      limparFormulario()
      carregarDestaques()
    } catch (err) {
      showToast('Erro ao salvar o destaque.', 'error')
    }
  }

  const handleConfirmarExclusao = async () => {
      if (!itemParaExcluir) return
      setExcluindo(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch(`/api/curation/${itemParaExcluir.id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
        if (!response.ok) throw new Error()
        showToast('Destaque removido com sucesso.')
        carregarDestaques()
      } catch (err) {
        showToast('Erro ao excluir destaque.', 'error')
      } finally {
        setExcluindo(false)
        setItemParaExcluir(null)
      }
  }

  const limparFormulario = () => {
    setEditId(null); setMalId(null); setPreview(null); setTermoBusca('');
    setTitulo(''); setSinopse(''); setTags([]); setOrdem(0);
    setResultadosBusca([]);
  }

  const editarDestaque = (anime: CuratedAnime) => {
    setEditId(anime.id || null); setMalId(anime.mal_id); setTitulo(anime.custom_title);
    setFormato(anime.custom_format || 'TV'); setStatus(anime.custom_status || 'RELEASING');
    setSinopse(anime.custom_synopsis || ''); setTags(anime.custom_tags || []); setOrdem(anime.order_index);
    setPreview({ title: anime.custom_title, mal_id: anime.mal_id, images: { jpg: { image_url: '' } } }) 
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isAdmin === false) return <Navigate to="/deck" replace />
  if (isAdmin === null || loading) return <div className="p-10 text-center text-muted font-mono text-sm">Carregando painel...</div>
  if (error) return <div className="p-10 text-center text-coral font-mono text-sm">{error}</div>

  return (
    <div className="min-h-screen bg-void text-text pb-20 relative z-10">
      
      <div className="bg-ambient"></div>

      <div className="sticky top-0 z-30 flex items-center justify-between p-4 border-b border-line bg-panel/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <LogoMark className="w-8 h-8 hidden md:block" />
          <span className="font-anton text-lg bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-transparent bg-clip-text hidden md:block">ANIDECK</span>
          <span className="font-mono text-[10px] font-bold text-gold bg-gold/10 border border-gold/40 px-2 py-1 rounded-full">⚙ ADMIN</span>
        </div>
        <Link to="/" className="text-sm font-bold text-muted hover:text-text transition-colors">
          ← Voltar ao site
        </Link>
      </div>

      <div className="max-w-[1000px] mx-auto p-5 mt-4 relative z-10">
        <div className="mb-6">
          <h1 className="font-anton text-2xl uppercase">Painel de Curadoria</h1>
          <p className="text-muted text-sm mt-1">Gerencie os "Destaques AniDeck" da home.</p>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-sm">{editId ? '✎ Editando Destaque' : '🔍 Adicionar Novo Destaque'}</h3>
            <button onClick={limparFormulario} className="text-xs text-muted hover:text-text cursor-pointer">Limpar</button>
          </div>

          <div className="relative mb-6">
            <div className="flex gap-2 group">
              <input 
                type="text" 
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Digite o título na AniList..." 
                className="flex-1 bg-panel-2 border border-line rounded-xl px-4 py-2 text-sm outline-none focus:border-holo-3 transition-colors group-focus-within:shadow-[0_0_15px_rgba(63,224,240,0.15)] relative z-20"
                onKeyDown={(e) => e.key === 'Enter' && buscarNaAniList()}
              />
              <button 
                onClick={buscarNaAniList} 
                disabled={buscando} 
                className="w-[115px] shrink-0 bg-panel-2 border border-line rounded-xl text-sm font-bold hover:border-holo-3 hover:text-holo-3 cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center relative z-20"
              >
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {resultadosBusca.length > 0 && (
              <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-panel/95 backdrop-blur-xl border border-line rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[350px] overflow-y-auto">
                {resultadosBusca.map(anime => (
                  <button
                    key={anime.id}
                    onClick={() => selecionarAnimeDaBusca(anime)}
                    className="flex items-center gap-3 p-3 border-b border-line/50 hover:bg-white/5 transition-colors text-left w-full cursor-pointer last:border-b-0"
                  >
                    <img src={anime.coverImage?.large} alt="Capa" className="w-10 h-14 object-cover rounded-md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate text-white">
                        {anime.title.romaji || anime.title.english}
                      </div>
                      <div className="text-[10px] text-muted truncate mt-0.5 uppercase tracking-wide">
                        {anime.format} • {anime.status}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {preview && (
            <div className="border-t border-dashed border-line pt-6 mt-4">
              <div className="bg-holo-2/10 border border-holo-2/30 rounded-xl p-3 mb-6 flex items-center gap-3">
                <div className="w-10 h-14 bg-panel-2 rounded-lg flex-shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${preview.images?.jpg?.image_url})` }}></div>
                <div>
                  <div className="font-bold text-sm text-holo-2">Anime Vinculado: {preview.title}</div>
                  <div className="font-mono text-[10px] text-muted">MAL ID: {preview.mal_id}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-muted mb-2 uppercase">Título Customizado</label>
                  <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full bg-panel-2 border border-line rounded-xl px-4 py-2 text-sm outline-none focus:border-holo-2" />
                </div>
                
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-muted mb-2 uppercase tracking-wide">Formato</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'TV', label: 'TV / Anime' },
                        { value: 'MOVIE', label: 'Filme' },
                        { value: 'OVA', label: 'OVA' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormato(opt.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border ${
                            formato === opt.value
                              ? 'bg-holo-3/20 border-holo-3 text-holo-3 shadow-[0_0_10px_rgba(63,224,240,0.2)]'
                              : 'bg-panel-2 border-line text-muted hover:border-holo-3 hover:text-text'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-muted mb-2 uppercase tracking-wide">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'RELEASING', label: 'Lançamento' },
                        { value: 'FINISHED', label: 'Finalizado' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStatus(opt.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border ${
                            status === opt.value
                              ? 'bg-coral/20 border-coral text-coral shadow-[0_0_10px_rgba(255,90,90,0.2)]'
                              : 'bg-panel-2 border-line text-muted hover:border-coral hover:text-text'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-muted mb-2 uppercase">Tags</label>
                <div className="flex flex-wrap gap-2 p-2 border border-line rounded-xl bg-panel-2 min-h-[44px] items-center focus-within:border-holo-2">
                  
                  {/* AS TAGS AGORA COM AS SETINHAS */}
                  {tags.map((tag, index) => (
                    <span key={tag} className="flex items-center gap-1 bg-holo-3/10 text-holo-3 border border-holo-3/30 px-2 py-1 rounded-md text-xs font-bold">
                      {index > 0 && <button type="button" onClick={() => moverTag(index, -1)} className="hover:text-white cursor-pointer px-1 transition-colors">←</button>}
                      {tag}
                      {index < tags.length - 1 && <button type="button" onClick={() => moverTag(index, 1)} className="hover:text-white cursor-pointer px-1 transition-colors">→</button>}
                      <button type="button" onClick={() => removerTag(tag)} className="hover:text-coral ml-1 cursor-pointer transition-colors">×</button>
                    </span>
                  ))}
                  
                 <input 
                    type="text" 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDownTag}
                    onBlur={handleBlurTag}
                    placeholder="Nova tag..." 
                    className="bg-transparent border-none outline-none text-sm w-32 flex-1"
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-muted uppercase mb-0">Sinopse Curada</label>
                  {sinopse && (
                    <button onClick={() => setSinopse('')} title="Limpar Sinopse" className="text-muted-2 hover:text-coral transition-colors cursor-pointer p-1">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <textarea value={sinopse} onChange={e => setSinopse(e.target.value)} className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm outline-none min-h-[100px] focus:border-holo-2" />
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                  <label className="text-xs font-bold text-muted uppercase">Ordem de Exibição:</label>
                  <input type="number" value={ordem} onChange={e => setOrdem(Number(e.target.value))} className="w-20 bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
                <button onClick={salvarDestaque} className="w-full md:w-auto bg-gradient-to-r from-holo-1 to-holo-2 text-void font-extrabold text-sm px-6 py-2.5 rounded-full hover:opacity-90 cursor-pointer">
                  {editId ? 'Salvar Alterações' : 'Salvar Novo Destaque'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-extrabold text-sm mb-4">📌 Destaques ativos</h3>
          {destaques.length === 0 ? (
            <div className="bg-panel border border-line rounded-xl p-10 text-center text-muted text-sm">
              Nenhum destaque cadastrado ainda.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {destaques.map((anime, index) => {
                const gradClass = `card-g${(index % 5) + 1}`
                return (
                <div key={anime.id} className={`flex items-center gap-4 border border-line p-4 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg ${gradClass}`}>
                  <div className="font-anton text-white/30 text-2xl w-8 text-center">#{anime.order_index}</div>
                  <div className="flex-1">
                    <div className="font-extrabold text-sm text-white drop-shadow-md">{anime.custom_title}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {anime.custom_tags?.map(t => (
                        <span key={t} className={`text-[10px] font-bold border px-2 py-0.5 rounded backdrop-blur-sm ${getCategoryTheme(t)}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editarDestaque(anime)} className="w-9 h-9 rounded-lg bg-panel-2/80 backdrop-blur-md border border-line text-muted hover:text-white hover:border-holo-2 transition-colors cursor-pointer flex items-center justify-center">✎</button>
                    <button onClick={() => anime.id && setItemParaExcluir({id: anime.id, titulo: anime.custom_title})} className="w-9 h-9 rounded-lg bg-panel-2/80 backdrop-blur-md border border-line text-muted hover:text-coral hover:border-coral transition-colors cursor-pointer flex items-center justify-center">🗑</button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {itemParaExcluir && (
        <div className="fixed inset-0 bg-void/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-panel border border-coral/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                <h3 className="font-anton text-coral text-xl uppercase mb-2">Remover destaque?</h3>
                <p className="text-sm text-muted mb-6">Tem certeza que deseja remover <b>"{itemParaExcluir.titulo}"</b> da curadoria? Apenas os dados customizados serão apagados.</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => setItemParaExcluir(null)} disabled={excluindo} className="flex-1 px-4 py-2.5 rounded-xl border border-line text-sm font-bold cursor-pointer hover:border-muted transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleConfirmarExclusao} disabled={excluindo} className="flex-1 px-4 py-2.5 rounded-xl bg-coral/10 border border-coral text-coral text-sm font-bold cursor-pointer hover:bg-coral hover:text-void transition-colors disabled:opacity-50 flex items-center justify-center">
                        {excluindo ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            'Remover'
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}