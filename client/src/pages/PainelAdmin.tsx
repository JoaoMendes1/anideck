import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
  // 1. Estados Gerais
  const [destaques, setDestaques] = useState<CuratedAnime[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 2. Estados do Formulário
  const [termoBusca, setTermoBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [preview, setPreview] = useState<any>(null) // Guarda o resultado da AniList

  // 3. Campos que vão para o Banco de Dados
  const [editId, setEditId] = useState<string | null>(null) // Se tiver ID, estamos editando. Se não, criando.
  const [malId, setMalId] = useState<number | null>(null)
  const [titulo, setTitulo] = useState('')
  const [formato, setFormato] = useState('TV')
  const [status, setStatus] = useState('RELEASING')
  const [ordem, setOrdem] = useState(0)
  const [sinopse, setSinopse] = useState('')
  
  // 4. Lógica de Tags
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    carregarDestaques()
  }, [])

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

  // --- AÇÕES DO FORMULÁRIO ---

  // Busca na AniList (usando a nossa própria rota já existente)
  const buscarNaAniList = async () => {
    if (!termoBusca) return
    setBuscando(true)
    try {
      const response = await fetch(`/api/search?q=${termoBusca}`)
      const data = await response.json()
      
      if (data.data && data.data.length > 0) {
        const anime = data.data[0] // Pegamos o primeiro resultado
        setPreview(anime)
        
        // Auto-preenche o formulário com os dados da AniList
        setMalId(anime.mal_id)
        setTitulo(anime.title)
        setStatus('FINISHED') // Valor padrão só pra preencher
        setSinopse(anime.synopsis || '')
        
        // Converte os gêneros que vieram da AniList para nossa lista de tags
        const tagsIniciais = anime.genres?.map((g: any) => g.name) || []
        setTags(tagsIniciais)
      } else {
        alert('Nenhum anime encontrado com esse termo.')
      }
    } catch (err) {
      alert('Erro ao buscar na AniList.')
    } finally {
      setBuscando(false)
    }
  }

// --- LÓGICA DE TAGS MELHORADA ---
  const adicionarTag = (valor: string) => {
    const novaTag = valor.trim().replace(/,/g, '') // Limpa espaços e vírgulas
    if (novaTag && !tags.includes(novaTag)) {
      setTags([...tags, novaTag])
    }
    setTagInput('')
  }

  // Dispara ao apertar Enter ou Vírgula
  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      adicionarTag(tagInput)
    }
  }

  // Dispara ao clicar fora do campo (perder o foco)
  const handleBlurTag = () => {
    adicionarTag(tagInput)
  }

  // Remove Tag clicando no X
  const removerTag = (tagRemover: string) => {
    setTags(tags.filter(t => t !== tagRemover))
  }

  // Salvar no Banco
  const salvarDestaque = async () => {
    if (!malId || !titulo) {
      alert('Busque um anime e defina um título antes de salvar!')
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
      // Pegamos a sessão atual para conseguir o token de segurança (o Crachá)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Sessão expirada. Faça login novamente.')
        return
      }

      // Se temos um editId, usamos PUT (Atualizar). Se não, POST (Criar).
      const url = editId ? `/api/curation/${editId}` : '/api/curation'
      const method = editId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` // <-- Nosso crachá agora está aqui!
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Falha ao salvar destaque')
      
      alert('Destaque salvo com sucesso!')
      
      // Limpa o formulário e recarrega a lista
      limparFormulario()
      carregarDestaques()
    } catch (err) {
      alert('Erro ao salvar o destaque. Verifique o console.')
    }
  }

  const excluirDestaque = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este destaque?')) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/curation/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!response.ok) throw new Error()
      carregarDestaques()
    } catch (err) {
      alert('Erro ao excluir destaque.')
    }
  }

  const limparFormulario = () => {
    setEditId(null)
    setMalId(null)
    setPreview(null)
    setTermoBusca('')
    setTitulo('')
    setSinopse('')
    setTags([])
    setOrdem(0)
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
    
    // Cria um preview falso só pra tela não ficar vazia
    setPreview({ title: anime.custom_title, mal_id: anime.mal_id }) 
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return <div className="p-10 text-center text-muted font-mono text-sm">Carregando painel...</div>
  if (error) return <div className="p-10 text-center text-coral font-mono text-sm">{error}</div>

  return (
    <div className="min-h-screen bg-void text-text pb-20">
      <div className="sticky top-0 z-30 flex items-center justify-between p-4 border-b border-line bg-panel/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-anton text-lg bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-transparent bg-clip-text">ANIDECK</span>
          <span className="font-mono text-[10px] font-bold text-gold bg-gold/10 border border-gold/40 px-2 py-1 rounded-full">⚙ ADMIN</span>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto p-5 mt-4">
        <div className="mb-6">
          <h1 className="font-anton text-2xl uppercase">Painel de Curadoria</h1>
          <p className="text-muted text-sm mt-1">Gerencie os "Destaques AniDeck" da home.</p>
        </div>

        {/* --- FORMULÁRIO DE EDIÇÃO / CRIAÇÃO --- */}
        <div className="bg-panel border border-line rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-sm">{editId ? '✎ Editando Destaque' : '🔍 Adicionar Novo Destaque'}</h3>
            <button onClick={limparFormulario} className="text-xs text-muted hover:text-text">Limpar</button>
          </div>

          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Digite o título na AniList..." 
              className="flex-1 bg-panel-2 border border-line rounded-xl px-4 py-2 text-sm outline-none focus:border-holo-2"
              onKeyDown={(e) => e.key === 'Enter' && buscarNaAniList()}
            />
            <button onClick={buscarNaAniList} disabled={buscando} className="bg-panel-2 border border-line px-4 rounded-xl text-sm font-bold hover:border-holo-2">
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
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
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-muted mb-2 uppercase">Formato</label>
                    <select value={formato} onChange={e => setFormato(e.target.value)} className="w-full bg-panel-2 border border-line rounded-xl px-4 py-2 text-sm outline-none">
                      <option value="TV">TV</option>
                      <option value="MOVIE">Filme</option>
                      <option value="OVA">OVA</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-muted mb-2 uppercase">Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-panel-2 border border-line rounded-xl px-4 py-2 text-sm outline-none">
                      <option value="RELEASING">Em Lançamento</option>
                      <option value="FINISHED">Finalizado</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-muted mb-2 uppercase">Tags (Pressione Enter para adicionar)</label>
                <div className="flex flex-wrap gap-2 p-2 border border-line rounded-xl bg-panel-2 min-h-[44px] items-center focus-within:border-holo-2">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-holo-3/10 text-holo-3 border border-holo-3/30 px-2 py-1 rounded-md text-xs font-bold">
                      {tag} <button onClick={() => removerTag(tag)} className="hover:text-coral ml-1">×</button>
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
                <label className="block text-xs font-bold text-muted mb-2 uppercase">Sinopse Curada</label>
                <textarea value={sinopse} onChange={e => setSinopse(e.target.value)} className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm outline-none min-h-[100px] focus:border-holo-2" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-muted uppercase">Ordem de Exibição:</label>
                  <input type="number" value={ordem} onChange={e => setOrdem(Number(e.target.value))} className="w-20 bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
                <button onClick={salvarDestaque} className="bg-gradient-to-r from-holo-1 to-holo-2 text-void font-extrabold text-sm px-6 py-2.5 rounded-full hover:opacity-90">
                  {editId ? 'Salvar Alterações' : 'Salvar Novo Destaque'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- LISTA DE DESTAQUES ATIVOS --- */}
        <div>
          <h3 className="font-extrabold text-sm mb-4">📌 Destaques ativos</h3>
          {destaques.length === 0 ? (
            <div className="bg-panel border border-line rounded-xl p-10 text-center text-muted text-sm">
              Nenhum destaque cadastrado ainda.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {destaques.map((anime) => (
                <div key={anime.id} className="flex items-center gap-4 bg-panel border border-line p-4 rounded-xl hover:border-muted-2 transition-colors">
                  <div className="font-anton text-muted-2 text-xl w-8 text-center">{anime.order_index}</div>
                  <div className="flex-1">
                    <div className="font-extrabold text-sm">{anime.custom_title}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {anime.custom_tags?.map(t => <span key={t} className="text-[10px] font-bold bg-panel-2 border border-line text-muted px-2 py-0.5 rounded">{t}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editarDestaque(anime)} className="w-9 h-9 rounded-lg bg-panel-2 border border-line text-muted hover:text-text hover:border-holo-2 transition-colors cursor-pointer">✎</button>
                    <button onClick={() => anime.id && excluirDestaque(anime.id)} className="w-9 h-9 rounded-lg bg-panel-2 border border-line text-muted hover:text-coral hover:border-coral transition-colors cursor-pointer">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}