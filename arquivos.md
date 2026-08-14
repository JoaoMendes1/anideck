

# File Contents

## client/src/pages/PainelAdmin.tsx

```tsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link, Navigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { Sparkles, X, LayoutList } from 'lucide-react'
import { LogoMark } from '../components/Brand'
import { getCategoryTheme } from '../lib/filters'
import Sheet from '../components/Sheet'
import BuscaAniList, { type AniListMedia } from '../components/BuscaAniList'
import ImageUploadField from '../components/ImageUploadField'
import CuradoriaPersonagens from '../components/CuradoriaPersonagens'
import DestaquesRail from '../components/DestaquesRail'
import type { CuratedAnime, CuratedCharacter } from '../types/curation'

export default function PainelAdmin() {
  const { showToast } = useToast()
  const [destaques, setDestaques] = useState<CuratedAnime[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  
  const [formularioAberto, setFormularioAberto] = useState(false)

  const [termoBusca, setTermoBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultadosBusca, setResultadosBusca] = useState<AniListMedia[]>([])
  const [previewTitulo, setPreviewTitulo] = useState<string | null>(null)

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

  const [itemParaExcluir, setItemParaExcluir] = useState<{ id: string; titulo: string } | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    verificarAcesso()
  }, [])

  const verificarAcesso = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      setIsAdmin(false)
      return
    }
    try {
      const response = await fetch('/api/admin/verify', { headers: { Authorization: `Bearer ${session.access_token}` } })
      setIsAdmin(response.ok)
      if (response.ok) carregarDestaques()
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
            id idMal title { romaji english native } coverImage { large } bannerImage format status genres synopsis: description
          }
        }
      }
    `
    try {
      const res = await fetch('https:
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { search: termoBusca } }),
      })
      const { data } = await res.json()
      if (data?.Page?.media && data.Page.media.length > 0) {
        setResultadosBusca(data.Page.media)
      } else {
        showToast('Nenhum anime encontrado.', 'error')
      }
    } catch {
      showToast('Erro ao buscar na AniList.', 'error')
    } finally {
      setBuscando(false)
    }
  }

  const selecionarAnimeDaBusca = (anime: AniListMedia) => {
    setMalId(anime.idMal)
    const tituloCorreto = anime.title.romaji || anime.title.english || anime.title.native || ''
    setTitulo(tituloCorreto)
    setFormato(anime.format || 'TV')
    setStatus(anime.status || 'RELEASING')
    setTags(anime.genres || [])
    setCoverImage(anime.coverImage?.large || '')
    setBannerImage(anime.bannerImage || '')
    setSinopse(anime.synopsis ? anime.synopsis.replace(/<[^>]*>?/gm, '') : '')
    setCharacters([])
    setPreviewTitulo(tituloCorreto)
    setResultadosBusca([])
    setTermoBusca('')
  }

  const adicionarTag = (valor: string) => {
    const novaTag = valor.trim().replace(/,/g, '')
    if (novaTag && !tags.includes(novaTag)) setTags([...tags, novaTag])
    setTagInput('')
  }
  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      adicionarTag(tagInput)
    }
  }
  const removerTag = (tagRemover: string) => setTags(tags.filter((t) => t !== tagRemover))

  const uploadImagem = async (file: File): Promise<string | null> => {
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = `imagens/${fileName}`

    try {
      const { error: uploadError } = await supabase.storage.from('curadoria').upload(filePath, file)
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('curadoria').getPublicUrl(filePath)

      showToast('Imagem enviada com sucesso!', 'success')
      return publicUrl
    } catch {
      showToast('Erro ao enviar imagem. Verifique se o bucket é público.', 'error')
      return null
    } finally {
      setUploading(false)
    }
  }

  const salvarDestaque = async () => {
    if (!malId || !titulo) {
      showToast('Busque um anime e defina um título antes de salvar!', 'error')
      return
    }

    const payload = {
      mal_id: malId,
      custom_title: titulo,
      custom_format: formato,
      custom_status: status,
      custom_tags: tags,
      custom_synopsis: sinopse,
      order_index: ordem,
      custom_cover_image: coverImage,
      custom_banner_image: bannerImage,
      custom_characters: characters.length > 0 ? characters : null,
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        showToast('Sessão expirada. Faça login novamente.', 'error')
        return
      }

      const url = editId ? `/api/curation/${editId}` : '/api/curation'
      const method = editId ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Falha ao salvar destaque')
      showToast('Destaque salvo com sucesso!')
      fecharEditor()
      carregarDestaques()
    } catch {
      showToast('Erro ao salvar o destaque.', 'error')
    }
  }

  const handleConfirmarExclusao = async () => {
    if (!itemParaExcluir) return
    setExcluindo(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const response = await fetch(`/api/curation/${itemParaExcluir.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!response.ok) throw new Error()
      showToast('Destaque removido com sucesso.')
      if (editId === itemParaExcluir.id) fecharEditor()
      carregarDestaques()
    } catch {
      showToast('Erro ao excluir destaque.', 'error')
    } finally {
      setExcluindo(false)
      setItemParaExcluir(null)
    }
  }

  const limparFormulario = () => {
    setEditId(null)
    setMalId(null)
    setPreviewTitulo(null)
    setTermoBusca('')
    setTitulo('')
    setFormato('TV')
    setSinopse('')
    setTags([])
    setOrdem(0)
    setCoverImage('')
    setBannerImage('')
    setCharacters([])
    setResultadosBusca([])
  }

  
  const abrirNovoDestaque = () => {
    limparFormulario()
    setFormularioAberto(true)
  }

  
  const fecharEditor = () => {
    limparFormulario()
    setFormularioAberto(false)
  }

  const editarDestaque = (anime: CuratedAnime) => {
    setEditId(anime.id || null)
    setMalId(anime.mal_id)
    setTitulo(anime.custom_title)
    setFormato(anime.custom_format || 'TV')
    setStatus(anime.custom_status || 'RELEASING')
    setSinopse(anime.custom_synopsis || '')
    setTags(anime.custom_tags || [])
    setOrdem(anime.order_index)
    setCoverImage(anime.custom_cover_image || '')
    setBannerImage(anime.custom_banner_image || '')
    setCharacters(anime.custom_characters || [])
    setPreviewTitulo(anime.custom_title)
    setFormularioAberto(true)
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
          <span className="font-anton text-lg bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-transparent bg-clip-text hidden md:block">
            ANIDECK
          </span>
          <span className="font-mono text-[10px] font-bold text-gold bg-gold/10 border border-gold/40 px-2 py-1 rounded-full">⚙ ADMIN</span>
        </div>
        <div className="flex gap-4 items-center">
          <button
            type="button"
            disabled
            title="Em breve na Fase 4.5"
            className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-holo-1/40 to-holo-2/40 border border-holo-1/30 text-white text-xs font-bold rounded-full cursor-not-allowed opacity-60"
          >
            <Sparkles size={14} /> IA Curadora
          </button>
          <Link to="/" className="text-sm font-bold text-muted hover:text-text transition-colors">
            ← Voltar ao site
          </Link>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 mt-2 relative z-10">
        <div className="mb-8">
          <h1 className="font-anton text-3xl uppercase">Painel de Curadoria</h1>
          <p className="text-muted text-sm mt-1">Gerencie os "Destaques AniDeck" e refine a exibição de capas e personagens.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 lg:gap-8 items-start">
          <DestaquesRail
            destaques={destaques}
            selectedId={editId}
            onSelect={editarDestaque}
            onDelete={(id, titulo) => setItemParaExcluir({ id, titulo })}
            onNovo={abrirNovoDestaque}
            novoAtivo={formularioAberto && !editId}
          />

          <div className="bg-panel border border-line rounded-2xl shadow-xl lg:sticky lg:top-24 overflow-hidden">
            {!formularioAberto ? (
              <div className="flex flex-col items-center justify-center text-center py-20 px-6">
                <div className="w-14 h-14 rounded-2xl bg-panel-2 border border-line flex items-center justify-center mb-4 text-muted">
                  <LayoutList size={22} />
                </div>
                <h3 className="font-anton text-lg uppercase text-text mb-1">Nenhum destaque selecionado</h3>
                <p className="text-sm text-muted max-w-xs mb-6">
                  Escolha um item na lista ao lado para editar, ou comece um destaque novo.
                </p>
                <button
                  onClick={abrirNovoDestaque}
                  className="bg-gradient-to-r from-holo-1 to-holo-2 text-void font-extrabold text-sm px-6 py-2.5 rounded-full hover:opacity-90 cursor-pointer transition-opacity"
                >
                  + Novo Destaque
                </button>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-sm">{editId ? '✎ Editando Destaque' : '🔍 Novo Destaque'}</h3>
                  <div className="flex items-center gap-3">
                    <button onClick={limparFormulario} className="text-xs text-muted hover:text-text cursor-pointer">
                      Limpar
                    </button>
                    <button
                      onClick={fecharEditor}
                      aria-label="Fechar editor"
                      className="w-7 h-7 rounded-lg bg-panel-2 border border-line text-muted hover:text-white hover:border-holo-2 transition-colors cursor-pointer flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <BuscaAniList
                  termoBusca={termoBusca}
                  onChangeTermo={setTermoBusca}
                  buscando={buscando}
                  resultados={resultadosBusca}
                  onBuscar={buscarNaAniList}
                  onSelecionar={selecionarAnimeDaBusca}
                />

                {previewTitulo && (
                  <div className="border-t border-dashed border-line pt-6 mt-4 space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-muted mb-2 uppercase">Título Customizado</label>
                        <input
                          type="text"
                          value={titulo}
                          onChange={(e) => setTitulo(e.target.value)}
                          className="w-full bg-panel-2 border border-line rounded-xl px-4 py-2 text-sm outline-none focus:border-holo-2"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted mb-2 uppercase tracking-wide">Status Manual</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 'RELEASING', label: 'Lançamento' },
                            { value: 'FINISHED', label: 'Finalizado' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setStatus(opt.value)}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
                                status === opt.value ? 'bg-coral/20 border-coral text-coral' : 'bg-panel-2 border-line text-muted'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-line bg-panel-2 rounded-xl">
                      <h4 className="text-xs font-bold text-muted uppercase mb-4">Imagens do Anime (Live Preview)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ImageUploadField
                          label="URL da Capa (Poster)"
                          value={coverImage}
                          onChange={setCoverImage}
                          onFileSelect={async (file) => {
                            const url = await uploadImagem(file)
                            if (url) setCoverImage(url)
                          }}
                          uploading={uploading}
                          previewClassName="w-24 h-36"
                        />
                        <ImageUploadField
                          label="URL do Banner (Fundo)"
                          value={bannerImage}
                          onChange={setBannerImage}
                          onFileSelect={async (file) => {
                            const url = await uploadImagem(file)
                            if (url) setBannerImage(url)
                          }}
                          uploading={uploading}
                          previewClassName="w-full h-24"
                        />
                      </div>
                    </div>

                    <CuradoriaPersonagens
                      characters={characters}
                      onAdd={(char) => setCharacters([...characters, char])}
                      onRemove={(index) => setCharacters(characters.filter((_, i) => i !== index))}
                      onUploadImage={uploadImagem}
                      uploading={uploading}
                      onValidationError={(msg) => showToast(msg, 'error')}
                    />

                    <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase">Tags Customizadas</label>
                      <div className="flex flex-wrap gap-2 p-2 border border-line rounded-xl bg-panel-2 min-h-[44px] items-center">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border ${getCategoryTheme(tag)}`}
                          >
                            {tag}{' '}
                            <button
                              type="button"
                              onClick={() => removerTag(tag)}
                              className="hover:text-white opacity-70 ml-1 cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleKeyDownTag}
                          onBlur={() => adicionarTag(tagInput)}
                          placeholder="Nova tag..."
                          className="bg-transparent border-none outline-none text-sm w-32 flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted uppercase mb-2">Sinopse Curada</label>
                      <textarea
                        value={sinopse}
                        onChange={(e) => setSinopse(e.target.value)}
                        className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm outline-none min-h-[100px] focus:border-holo-2"
                      />
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-line">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-muted uppercase shrink-0">Ordem Home:</label>
                        <input
                          type="number"
                          value={ordem}
                          onChange={(e) => setOrdem(Number(e.target.value))}
                          className="w-20 bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm outline-none"
                        />
                      </div>
                      <button
                        onClick={salvarDestaque}
                        className="w-full sm:w-auto bg-gradient-to-r from-holo-1 to-holo-2 text-void font-extrabold text-sm px-8 py-3 rounded-full hover:opacity-90 cursor-pointer transition-opacity"
                      >
                        {editId ? 'Salvar Alterações' : 'Publicar Destaque'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Sheet isOpen={itemParaExcluir !== null} onClose={() => !excluindo && setItemParaExcluir(null)} title="Remover destaque?">
        <p className="text-sm text-muted mb-6">
          Tem certeza que deseja remover <b className="text-text">"{itemParaExcluir?.titulo}"</b> da curadoria? Apenas os dados
          customizados serão apagados.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setItemParaExcluir(null)}
            disabled={excluindo}
            className="flex-1 px-4 py-2.5 rounded-xl border border-line text-sm font-bold cursor-pointer hover:border-muted transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmarExclusao}
            disabled={excluindo}
            className="flex-1 px-4 py-2.5 rounded-xl bg-coral/10 border border-coral text-coral text-sm font-bold cursor-pointer hover:bg-coral hover:text-void transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {excluindo ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : 'Remover'}
          </button>
        </div>
      </Sheet>
    </div>
  )
}
```


# File Contents

## client/src/types/curation.ts

```typescript






export interface CuratedCharacter {
  name: string
  image: string
  role: string
}

export interface CuratedAnime {
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
```

