import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link, Navigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { Sparkles, Plus, Trash2, UploadCloud } from 'lucide-react'
import { LogoMark } from '../components/Brand'
import { getCategoryTheme } from '../lib/filters'

interface CuratedCharacter {
  name: string
  image: string
  role: string
}

interface CuratedAnime {
  id?: string
  mal_id: number
  custom_title: string
  custom_synopsis?: string
  custom_format?: string
  custom_status?: string
  custom_tags?: string[]
  custom_cover_image?: string
  custom_banner_image?: string
  custom_characters?: CuratedCharacter[]
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
  
  const [coverImage, setCoverImage] = useState('')
  const [bannerImage, setBannerImage] = useState('')
  const [characters, setCharacters] = useState<CuratedCharacter[]>([])
  
  const [charName, setCharName] = useState('')
  const [charImg, setCharImg] = useState('')
  const [charRole, setCharRole] = useState('MAIN')

  const [itemParaExcluir, setItemParaExcluir] = useState<{id: string, titulo: string} | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { verificarAcesso() }, [])

  const verificarAcesso = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setIsAdmin(false); return }
    try {
      const response = await fetch('/api/admin/verify', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      setIsAdmin(response.ok)
      if (response.ok) carregarDestaques()
    } catch { setIsAdmin(false) }
  }

  const carregarDestaques = async () => {
    try {
      const response = await fetch('/api/curation')
      if (!response.ok) throw new Error('Falha ao carregar destaques')
      const data = await response.json()
      setDestaques(data || [])
    } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }

  const buscarNaAniList = async () => {
    if (!termoBusca.trim()) return
    setBuscando(true)
    setResultadosBusca([])

    const query = `
      query ($search: String) {
        Page(page: 1, perPage: 5) {
          media(search: $search, type: ANIME) {
            id idMal title { romaji english native } coverImage { large } bannerImage format status genres synopsis: description
          }
        }
      }
    `
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { search: termoBusca } })
      })
      const { data } = await res.json()
      if (data?.Page?.media && data.Page.media.length > 0) {
        setResultadosBusca(data.Page.media)
      } else { showToast('Nenhum anime encontrado.', 'error') }
    } catch (error) { showToast('Erro ao buscar na AniList.', 'error') } finally { setBuscando(false) }
  }

  const selecionarAnimeDaBusca = (anime: any) => {
    setMalId(anime.idMal || anime.id)
    const tituloCorreto = anime.title.romaji || anime.title.english || anime.title.native
    setTitulo(tituloCorreto)
    setFormato(anime.format || 'TV')
    setStatus(anime.status || 'RELEASING')
    setTags(anime.genres || [])
    setCoverImage(anime.coverImage?.large || '')
    setBannerImage(anime.bannerImage || '')
    setSinopse(anime.synopsis ? anime.synopsis.replace(/<[^>]*>?/gm, '') : '')
    setCharacters([]) 
    setPreview({ title: tituloCorreto, mal_id: anime.id, images: { jpg: { image_url: anime.coverImage?.large } } })
    setResultadosBusca([])
    setTermoBusca('')
  }

  const adicionarTag = (valor: string) => {
    const novaTag = valor.trim().replace(/,/g, '')
    if (novaTag && !tags.includes(novaTag)) setTags([...tags, novaTag])
    setTagInput('')
  }
  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); adicionarTag(tagInput) } }
  const handleBlurTag = () => adicionarTag(tagInput)
  const removerTag = (tagRemover: string) => setTags(tags.filter(t => t !== tagRemover))

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'cover' | 'banner' | 'char') => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = `imagens/${fileName}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('curadoria') 
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('curadoria')
        .getPublicUrl(filePath)

      if (tipo === 'cover') setCoverImage(publicUrl)
      if (tipo === 'banner') setBannerImage(publicUrl)
      if (tipo === 'char') setCharImg(publicUrl)

      showToast('Imagem enviada com sucesso!', 'success')
    } catch (err: any) {
      showToast('Erro ao enviar imagem. Verifique se o bucket é público.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleAddCharacter = () => {
    if (!charName.trim() || !charImg.trim()) { showToast('Preencha nome e imagem do personagem.', 'error'); return }
    setCharacters([...characters, { name: charName, image: charImg, role: charRole }])
    setCharName(''); setCharImg(''); setCharRole('MAIN');
  }
  const removerCharacter = (index: number) => { setCharacters(characters.filter((_, i) => i !== index)) }

  const salvarDestaque = async () => {
    if (!malId || !titulo) { showToast('Busque um anime e defina um título antes de salvar!', 'error'); return }

    const payload: any = {
      mal_id: malId, custom_title: titulo, custom_format: formato, custom_status: status,
      custom_tags: tags, custom_synopsis: sinopse, order_index: ordem,
      custom_cover_image: coverImage, 
      custom_banner_image: bannerImage, 
      custom_characters: characters.length > 0 ? characters : null 
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { showToast('Sessão expirada. Faça login novamente.', 'error'); return }

      const url = editId ? `/api/curation/${editId}` : '/api/curation'
      const method = editId ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Falha ao salvar destaque')
      showToast('Destaque salvo com sucesso!')
      limparFormulario()
      carregarDestaques()
    } catch (err) { showToast('Erro ao salvar o destaque.', 'error') }
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
    setCoverImage(''); setBannerImage(''); setCharacters([]); setResultadosBusca([]);
  }

  const editarDestaque = (anime: CuratedAnime) => {
    setEditId(anime.id || null); setMalId(anime.mal_id); setTitulo(anime.custom_title);
    setFormato(anime.custom_format || 'TV'); setStatus(anime.custom_status || 'RELEASING');
    setSinopse(anime.custom_synopsis || ''); setTags(anime.custom_tags || []); setOrdem(anime.order_index);
    setCoverImage(anime.custom_cover_image || ''); setBannerImage(anime.custom_banner_image || '');
    setCharacters(anime.custom_characters || []);
    setPreview({ title: anime.custom_title, mal_id: anime.mal_id, images: { jpg: { image_url: anime.custom_cover_image } } }) 
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
        <div className="flex gap-4 items-center">
          <button type="button" disabled title="Em breve na Fase 4.5" className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-holo-1/40 to-holo-2/40 border border-holo-1/30 text-white text-xs font-bold rounded-full cursor-not-allowed opacity-60">
            <Sparkles size={14} /> IA Curadora
          </button>
          <Link to="/" className="text-sm font-bold text-muted hover:text-text transition-colors">← Voltar ao site</Link>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto p-5 mt-4 relative z-10">
        <div className="mb-6">
          <h1 className="font-anton text-2xl uppercase">Painel de Curadoria</h1>
          <p className="text-muted text-sm mt-1">Gerencie os "Destaques AniDeck" e refine a exibição de capas e personagens.</p>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-sm">{editId ? '✎ Editando Destaque' : '🔍 Adicionar Novo Destaque'}</h3>
            <button onClick={limparFormulario} className="text-xs text-muted hover:text-text cursor-pointer">Limpar Formulario</button>
          </div>

          <div className="relative mb-6">
            <div className="flex gap-2 group">
              <input 
                type="text" value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Busque o título na AniList para importar a base..." 
                className="flex-1 bg-panel-2 border border-line rounded-xl px-4 py-2 text-sm outline-none focus:border-holo-3 transition-colors relative z-20"
                onKeyDown={(e) => e.key === 'Enter' && buscarNaAniList()}
              />
              <button 
                onClick={buscarNaAniList} disabled={buscando} 
                className="w-[115px] shrink-0 bg-panel-2 border border-line rounded-xl text-sm font-bold hover:border-holo-3 hover:text-holo-3 cursor-pointer disabled:opacity-50 transition-colors relative z-20"
              >
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {resultadosBusca.length > 0 && (
              <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-panel/95 backdrop-blur-xl border border-line rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[350px] overflow-y-auto">
                {resultadosBusca.map(anime => (
                  <button key={anime.id} onClick={() => selecionarAnimeDaBusca(anime)} className="flex items-center gap-3 p-3 border-b border-line/50 hover:bg-white/5 transition-colors text-left w-full cursor-pointer">
                    <img src={anime.coverImage?.large} alt="Capa" className="w-10 h-14 object-cover rounded-md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate text-white">{anime.title.romaji || anime.title.english}</div>
                      <div className="text-[10px] text-muted truncate mt-0.5 uppercase tracking-wide">{anime.format} • {anime.status}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {preview && (
            <div className="border-t border-dashed border-line pt-6 mt-4 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted mb-2 uppercase">Título Customizado</label>
                  <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full bg-panel-2 border border-line rounded-xl px-4 py-2 text-sm outline-none focus:border-holo-2" />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-muted mb-2 uppercase tracking-wide">Status Manual</label>
                    <div className="flex flex-wrap gap-2">
                      {[{ value: 'RELEASING', label: 'Lançamento' }, { value: 'FINISHED', label: 'Finalizado' }].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${status === opt.value ? 'bg-coral/20 border-coral text-coral' : 'bg-panel-2 border-line text-muted'}`}
                        >{opt.label}</button>
                      ))}
                    </div>
                </div>
              </div>

              <div className="p-4 border border-line bg-panel-2 rounded-xl">
                <h4 className="text-xs font-bold text-muted uppercase mb-4">Imagens do Anime (Live Preview)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-[11px] font-bold">URL da Capa (Poster)</label>
                        {coverImage && (
                            <button type="button" onClick={() => setCoverImage('')} className="text-[10px] font-bold text-coral hover:text-coral/80 uppercase cursor-pointer">
                                🗑️ Limpar
                            </button>
                        )}
                    </div>
                    <input type="text" value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="https://..." className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-sm outline-none mb-2" />
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} disabled={uploading} className="w-full text-xs text-muted mb-3 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-holo-2/20 file:text-holo-2 hover:file:bg-holo-2/30 cursor-pointer" />
                    {coverImage && <img src={coverImage} alt="Preview Capa" className="w-24 h-36 object-cover rounded-lg border border-line shadow-md" onError={(e) => e.currentTarget.style.display = 'none'}/>}
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-[11px] font-bold">URL do Banner (Fundo)</label>
                        {bannerImage && (
                            <button type="button" onClick={() => setBannerImage('')} className="text-[10px] font-bold text-coral hover:text-coral/80 uppercase cursor-pointer">
                                🗑️ Limpar
                            </button>
                        )}
                    </div>
                    <input type="text" value={bannerImage} onChange={e => setBannerImage(e.target.value)} placeholder="https://..." className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-sm outline-none mb-2" />
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} disabled={uploading} className="w-full text-xs text-muted mb-3 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-holo-2/20 file:text-holo-2 hover:file:bg-holo-2/30 cursor-pointer" />
                    {bannerImage && <img src={bannerImage} alt="Preview Banner" className="w-full h-24 object-cover rounded-lg border border-line shadow-md" onError={(e) => e.currentTarget.style.display = 'none'}/>}
                  </div>
                </div>
              </div>

              <div className="p-4 border border-line bg-panel-2 rounded-xl">
                <h4 className="text-xs font-bold text-muted uppercase mb-4">Elenco Curado (Personagens)</h4>
                <div className="flex gap-2 items-end mb-4 bg-panel p-3 rounded-lg border border-line flex-wrap md:flex-nowrap">
                  <div className="flex-1 min-w-[120px]"><label className="block text-[10px] mb-1">Nome</label><input type="text" value={charName} onChange={e => setCharName(e.target.value)} className="w-full bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none" /></div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-[10px] mb-1">URL da Foto ou Enviar</label>
                    <div className="flex items-center gap-1">
                      <input type="text" value={charImg} onChange={e => setCharImg(e.target.value)} className="flex-1 bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none" placeholder="https://" />
                      <label className="bg-panel-2 border border-line p-1.5 rounded cursor-pointer hover:border-holo-3 text-muted">
                        <UploadCloud size={14} />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'char')} disabled={uploading} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] mb-1">Papel</label>
                    <select value={charRole} onChange={e => setCharRole(e.target.value)} className="bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none text-text">
                      <option value="MAIN">MAIN</option>
                      <option value="SUPPORTING">SUPPORT</option>
                    </select>
                  </div>
                  <button onClick={handleAddCharacter} className="bg-holo-2 text-white p-1.5 rounded cursor-pointer hover:opacity-80"><Plus size={16} /></button>
                </div>
                
                {characters.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {characters.map((char, index) => (
                      <div key={index} className="w-24 shrink-0 relative group">
                        <img src={char.image} alt={char.name} className="w-24 h-32 object-cover rounded-lg border border-line mb-1" />
                        <button onClick={() => removerCharacter(index)} className="absolute top-1 right-1 bg-coral text-white p-1 rounded-md opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"><Trash2 size={12} /></button>
                        <div className="text-[10px] font-bold truncate text-text">{char.name}</div>
                        <div className="text-[9px] text-muted">{char.role}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-2 uppercase">Tags Customizadas</label>
                <div className="flex flex-wrap gap-2 p-2 border border-line rounded-xl bg-panel-2 min-h-[44px] items-center">
                  {tags.map((tag) => (
                    <span key={tag} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border ${getCategoryTheme(tag)}`}>
                      {tag} <button type="button" onClick={() => removerTag(tag)} className="hover:text-white opacity-70 ml-1 cursor-pointer">×</button>
                    </span>
                  ))}
                 <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleKeyDownTag} onBlur={handleBlurTag} placeholder="Nova tag..." className="bg-transparent border-none outline-none text-sm w-32 flex-1" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-2">Sinopse Curada</label>
                <textarea value={sinopse} onChange={e => setSinopse(e.target.value)} className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm outline-none min-h-[100px] focus:border-holo-2" />
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-line">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-muted uppercase">Ordem Home:</label>
                  <input type="number" value={ordem} onChange={e => setOrdem(Number(e.target.value))} className="w-20 bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
                <button onClick={salvarDestaque} className="w-full md:w-auto bg-gradient-to-r from-holo-1 to-holo-2 text-void font-extrabold text-sm px-8 py-3 rounded-full hover:opacity-90 cursor-pointer">
                  {editId ? 'Salvar Alterações' : 'Publicar Destaque'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-10">
          <h3 className="font-extrabold text-sm mb-4">📌 Destaques ativos</h3>
          <div className="flex flex-col gap-3">
            {destaques.length === 0 ? (
               <div className="text-center p-6 border border-line rounded-xl bg-panel-2/50 text-sm text-muted">Nenhum destaque ativo.</div>
            ) : (
              destaques.map((anime, index) => {
                const gradClass = `card-g${(index % 5) + 1}`
                return (
                <div key={anime.id} className={`flex items-center gap-4 border border-line p-3 md:p-4 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg ${gradClass}`}>
                  <div className="font-anton text-white/30 text-xl md:text-2xl w-6 md:w-8 text-center shrink-0">#{anime.order_index}</div>
                  
                  <div className="w-10 h-14 md:w-12 md:h-16 rounded-md border border-white/10 shrink-0 overflow-hidden bg-panel flex items-center justify-center">
                    {anime.custom_cover_image ? (
                      <img src={anime.custom_cover_image} alt="" className="w-full h-full object-cover" onError={e => e.currentTarget.style.display='none'}/>
                    ) : (
                      <span className="text-[9px] text-muted-2 font-bold uppercase text-center leading-tight">Sem<br/>Capa</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm md:text-[15px] text-white drop-shadow-md truncate">{anime.custom_title}</div>
                    <div className="text-xs text-muted-2 mt-1 truncate">{anime.custom_characters?.length || 0} personagens customizados</div>
                  </div>
                  
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => editarDestaque(anime)} className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-panel-2/80 border border-line text-muted hover:text-white hover:border-holo-2 transition-colors cursor-pointer flex items-center justify-center">✎</button>
                    <button onClick={() => anime.id && setItemParaExcluir({id: anime.id, titulo: anime.custom_title})} className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-panel-2/80 border border-line text-muted hover:text-coral hover:border-coral transition-colors cursor-pointer flex items-center justify-center">🗑</button>
                  </div>
                </div>
              )})
            )}
          </div>
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