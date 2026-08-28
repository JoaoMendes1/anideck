import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Navigate, useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { Sparkles, X, LayoutList, ArrowLeft, Activity, PowerOff } from 'lucide-react'
import { LogoMark } from '../components/Brand'
import Sheet from '../components/Sheet'
import BuscaAniList, { type AniListMedia } from '../components/BuscaAniList'
import ImageUploadField from '../components/ImageUploadField'
import CuradoriaPersonagens from '../components/CuradoriaPersonagens'
import CuradoriaEpisodios from '../components/CuradoriaEpisodios'
import CuradoriaLinks from '../components/CuradoriaLinks'
import DestaquesRail from '../components/DestaquesRail'
import ReorderableTags from '../components/ReorderableTags'
import imageCompression from 'browser-image-compression'
import type { CuratedAnime, CuratedCharacter, CuratedEpisode, CuratedExternalLink, CurationStatus } from '../types/curation'
import ConfigIAModal from '../components/ConfigIAModal'
import { AbaOlheiro } from '../components/AbaOlheiro'
import type { SugestaoPendente } from '../hooks/useOlheiro'

// Uma query serve os dois caminhos: busca por nome (search) e importação
// direta pelo ID do Olheiro (idMal). A AniList ignora variável que chega
// nula, então não precisa de duas queries quase idênticas.
const QUERY_ANILIST = `
  query ($search: String, $idMal: Int) {
    Page(page: 1, perPage: 5) {
      media(search: $search, idMal: $idMal, type: ANIME) {
        id idMal title { romaji english native } coverImage { large } bannerImage format status genres synopsis: description
        episodes
        streamingEpisodes { title thumbnail }
        characters(sort: [ROLE, RELEVANCE], perPage: 15) {
          edges { role node { name { full } image { large } } }
        }
      }
    }
  }
`

export default function PainelAdmin() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [destaques, setDestaques] = useState<CuratedAnime[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [apiHealth, setApiHealth] = useState<'OK' | 'WARNING' | 'OFFLINE'>('OK')
  const [forceOffline, setForceOffline] = useState(false)

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

  const [coverImage, setCoverImage] = useState('')
  const [bannerImage, setBannerImage] = useState('')
  const [characters, setCharacters] = useState<CuratedCharacter[]>([])

  // Campos do Bloco 2
  const [episodios, setEpisodios] = useState<CuratedEpisode[]>([])
  const [links, setLinks] = useState<CuratedExternalLink[]>([])
  const [estreia, setEstreia] = useState('')
  const [duracao, setDuracao] = useState('')
  const [importandoEpisodios, setImportandoEpisodios] = useState(false)
  const [isDestaque, setIsDestaque] = useState(true)
  const [curationStatus, setCurationStatus] = useState<CurationStatus>('parcial')

  const [itemParaExcluir, setItemParaExcluir] = useState<{ id: string; titulo: string } | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [gerandoIA, setGerandoIA] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [configModalAberto, setConfigModalAberto] = useState(false)
  const [olheiroAberto, setOlheiroAberto] = useState(false)

  const [initialStateHash, setInitialStateHash] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    verificarAcesso()
  }, [])

  useEffect(() => {
    if (!previewTitulo) return
    const currentState = JSON.stringify({
      titulo, formato, status, ordem, sinopse, tags, coverImage, bannerImage, characters,
      episodios, links, estreia, duracao, isDestaque, curationStatus,
    })
    setIsDirty(currentState !== initialStateHash)
  }, [titulo, formato, status, ordem, sinopse, tags, coverImage, bannerImage, characters,
      episodios, links, estreia, duracao, isDestaque, curationStatus,
      initialStateHash, previewTitulo])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Auto-expansão do textarea sempre que a sinopse mudar
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [sinopse])

  // Guarda a ação que será executada SE o usuário confirmar. Como o Sheet
  // é assíncrono, não dá pra decidir na hora como o window.confirm fazia.
  const [acaoPendente, setAcaoPendente] = useState<(() => void) | null>(null)

  const pedirConfirmacao = (acao: () => void) => {
    if (!isDirty) { acao(); return }
    // O "() => acao" é obrigatório. Se você passar a função direto, o React
    // acha que é um updater (aquele padrão setX(valorAntigo => novo)) e
    // EXECUTA ela na hora — a ação aconteceria antes de você confirmar.
    setAcaoPendente(() => acao)
  }

  const confirmarAcaoPendente = () => {
    acaoPendente?.()
    setAcaoPendente(null)
  }
   //	Verifica admin, carrega destaques e status da API, além de permitir alternar kill switch
 const verificarAcesso = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setIsAdmin(false)
      return
    }
    try {
      const response = await fetch('/api/admin/verify', { headers: { Authorization: `Bearer ${session.access_token}` } })
      setIsAdmin(response.ok)
      if (response.ok) {
        carregarDestaques()
        carregarStatusSistema(session.access_token)
      }
    } catch {
      setIsAdmin(false)
    }
  }
  // 	Verifica admin, carrega destaques e status da API, além de permitir alternar kill switch
  const carregarStatusSistema = async (token: string) => {
    try {
      const res = await fetch('/api/admin/system/status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setApiHealth(data.api_health)
        setForceOffline(data.force_offline)
      }
    } catch (e) {
      console.error("Erro ao ler status do sistema", e)
    }
  }

  const toggleKillSwitch = async () => {
    const novoStatus = !forceOffline
    setForceOffline(novoStatus) // Atualização otimista na tela
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/system/kill-switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ force_offline: novoStatus })
      })
      if (!res.ok) throw new Error()
      showToast(novoStatus ? 'Modo Offline Forçado (AniList Desconectada)' : 'Conexão com AniList Restaurada', novoStatus ? 'error' : 'success')
    } catch {
      setForceOffline(!novoStatus) // Reverte se a API falhar
      showToast('Erro ao alterar status do sistema', 'error')
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

    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: QUERY_ANILIST, 
          variables: /^\d+$/.test(termoBusca.trim()) ? { idMal: parseInt(termoBusca.trim(), 10) } : { search: termoBusca } 
        }),
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
  // Preenche o formulário a partir de um anime da AniList e grava o hash na
  // mesma passada. Serve os dois caminhos de entrada — busca por nome e Curar
  // do Olheiro — para que o formulário nasça idêntico nos dois casos.
  const aplicarAnimeNoFormulario = (anime: AniListMedia) => {
    const tituloCorreto = anime.title.romaji || anime.title.english || anime.title.native || ''
    const formatoAnime = anime.format || 'TV'
    const statusAnime = anime.status || 'RELEASING'
    const sinopseLimpa = anime.synopsis ? anime.synopsis.replace(/<[^>]*>?/gm, '') : ''
    const tagsAnime = anime.genres || []
    const capa = anime.coverImage?.large || ''
    const banner = anime.bannerImage || ''

    const importedChars = anime.characters?.edges?.map((edge) => ({
      name: edge.node.name?.full || 'Desconhecido',
      image: edge.node.image?.large || '',
      role: edge.role || 'SUPPORTING'
    })) || []

    setMalId(anime.idMal)
    setTitulo(tituloCorreto)
    setFormato(formatoAnime)
    setStatus(statusAnime)
    setSinopse(sinopseLimpa)
    setTags(tagsAnime)
    setOrdem(0)
    setCoverImage(capa)
    setBannerImage(banner)
    setCharacters(importedChars)
    setPreviewTitulo(tituloCorreto)
    setResultadosBusca([])
    setTermoBusca('')

    // Sem setTimeout: o hash é montado a partir das constantes acima, não do
    // state. O React aplica tudo no mesmo lote, então o efeito de comparação
    // roda uma vez só — já com hash e state batendo — e o formulário nasce
    // limpo, sem a bolinha de "alterações não salvas".
    setInitialStateHash(JSON.stringify({
      titulo: tituloCorreto, formato: formatoAnime, status: statusAnime,
      ordem: 0, sinopse: sinopseLimpa, tags: tagsAnime,
      coverImage: capa, bannerImage: banner, characters: importedChars,
      episodios: [], links: [], estreia: '', duracao: '',
      isDestaque: true, curationStatus: 'parcial'
    }))
  }

    // Guarda o id da sugestão que originou a edição atual. Só é usado no
  // salvarDestaque, para marcar 'curado' depois que o destaque existir.
  const [sugestaoEmCuradoria, setSugestaoEmCuradoria] = useState<number | null>(null)

  const buscarAnimePorIdMal = async (idMal: number): Promise<AniListMedia | null> => {
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: QUERY_ANILIST, variables: { idMal } }),
      })
      const { data } = await res.json()
      return data?.Page?.media?.[0] || null
    } catch {
      return null
    }
  }

  // Traz os episódios da AniList para o editor. Devolve null quando falha — quem chama já
  // recebeu a mensagem e não deve mexer na lista.
  //
  // Monta a lista a partir do total anunciado (`episodes`) e não do tamanho de
  // `streamingEpisodes`: a cobertura desse último é irregular e muitos animes vêm com ele
  // vazio, o que geraria uma grade menor que o anime de verdade. Título e capa entram quando
  // existem, posicionados pelo índice.
  const importarEpisodiosDaAniList = async (): Promise<CuratedEpisode[] | null> => {
    if (!malId) {
      showToast('Busque um anime antes de importar os episódios.', 'error')
      return null
    }

    setImportandoEpisodios(true)
    try {
      const anime = await buscarAnimePorIdMal(malId)
      if (!anime) {
        showToast('A AniList não respondeu. Ela está fora do ar desde 22/08 — use "Gerar vazios" enquanto isso.', 'error')
        return null
      }

      const comTitulo = anime.streamingEpisodes || []
      const total = anime.episodes || comTitulo.length

      return Array.from({ length: total }, (_, i) => ({
        number: i + 1,
        title: comTitulo[i]?.title || '',
        image: comTitulo[i]?.thumbnail || '',
        aired_at: '',
      }))
    } finally {
      setImportandoEpisodios(false)
    }
  }

  const curarSugestao = async (sugestao: SugestaoPendente) => {
    setOlheiroAberto(false)
    limparFormulario()
    setFormularioAberto(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // Reaproveita o "buscando" da BuscaAniList: o botão mostra "Buscando..."
    // e fica desabilitado enquanto o anime não chega.
    setBuscando(true)
    const anime = await buscarAnimePorIdMal(sugestao.mal_id)
    setBuscando(false)

    if (!anime) {
      showToast('Não foi possível carregar os dados na AniList. Tente de novo.', 'error')
      return
    }

    aplicarAnimeNoFormulario(anime)
    setSugestaoEmCuradoria(sugestao.id)
  }

  const uploadImagem = async (file: File): Promise<string | null> => {
    setUploading(true)
    try {
      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp'
      }

      const compressedFile = await imageCompression(file, options)

      const fileName = `${Math.random().toString(36).substring(2, 15)}.webp`
      const filePath = `imagens/${fileName}`

      const { error: uploadError } = await supabase.storage.from('curadoria').upload(filePath, compressedFile)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('curadoria').getPublicUrl(filePath)
      showToast('Imagem otimizada (WebP) e enviada com sucesso!', 'success')
      return publicUrl
    } catch {
      showToast('Erro ao enviar imagem. Verifique o console ou limite de tamanho.', 'error')
      return null
    } finally {
      setUploading(false)
    }
  }

  // O <input type="datetime-local"> fala em horário local e sem fuso; a coluna é TIMESTAMPTZ.
  // As duas funções abaixo fazem a ponte, e existem separadas porque o erro clássico é usar
  // toISOString().slice(0,16) para preencher o input — isso devolve UTC, e o campo mostraria
  // a estreia com o fuso do servidor em vez do de quem está cadastrando.
  const estreiaParaInput = (iso?: string | null) => {
    if (!iso) return ''
    const data = new Date(iso)
    if (isNaN(data.getTime())) return ''
    const doisDigitos = (n: number) => String(n).padStart(2, '0')
    return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}` +
      `T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`
  }

  const estreiaParaBanco = (valorDoInput: string) => {
    if (!valorDoInput) return null
    const data = new Date(valorDoInput)
    return isNaN(data.getTime()) ? null : data.toISOString()
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

      // Campos do Bloco 2. `null` quando vazio, nunca array vazio: pela convenção do
      // Bloco 1, `null` significa "não curei, cai para a AniList", enquanto array vazio
      // significa "curei e está vazio de propósito" — e limparia o dado da AniList junto.
      custom_episodes: episodios.length > 0 ? episodios : null,
      custom_external_links: links.length > 0 ? links : null,
      custom_first_aired_at: estreiaParaBanco(estreia),
      custom_duration_minutes: duracao ? Number(duracao) : null,
      is_destaque: isDestaque,
      curation_status: curationStatus,
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Falha ao salvar destaque')
      showToast('Destaque salvo com sucesso!')

      // Só agora a sugestão sai da fila em definitivo. Se você tivesse
      // desistido no meio, ela continuaria 'pendente' e voltaria a aparecer.
      if (sugestaoEmCuradoria !== null) {
        try {
          await fetch(`/api/admin/olheiro/sugestoes/${sugestaoEmCuradoria}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ status: 'curado' }),
          })
        } catch {
          // O destaque já foi salvo — falhar aqui não é erro de salvamento.
          // A sugestão só reaparece na fila, que é o comportamento seguro.
        }
      }

      setIsDirty(false)
      fecharEditorForce()
      carregarDestaques()
    } catch {
      showToast('Erro ao salvar o destaque.', 'error')
    }
  }

  const reescreverComIA = async () => {
    if (!titulo || !sinopse) {
      showToast('É necessário ter um título e uma sinopse base para a IA trabalhar.', 'error')
      return
    }

    setGerandoIA(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      const response = await fetch('/api/admin/curation/ai/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ title: titulo, synopsis: sinopse })
      })

      if (!response.ok) throw new Error('Falha no endpoint da IA')

      const data = await response.json()

      // Injeta a resposta do Gemini direto nos inputs do formulário
      if (data.sinopse) {
        setSinopse(data.sinopse)
      }

      if (data.tags && Array.isArray(data.tags)) {
        // Substitui as tags atuais pelas sugeridas pela IA. O comentário
        // anterior dizia que juntava sem duplicar, mas o código sempre
        // substituiu — a IA propõe o conjunto inteiro, e o ReorderableTags
        // fica ali para você ajustar depois.
        setTags(data.tags)
      }

      setIsDirty(true)
      showToast('Sinopse reescrita com sucesso!', 'success')

    } catch (err) {
      showToast('Erro ao se comunicar com a IA. Tente novamente.', 'error')
    } finally {
      setGerandoIA(false)
    }
  }

  const handleConfirmarExclusao = async () => {
    if (!itemParaExcluir) return
    setExcluindo(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/curation/${itemParaExcluir.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!response.ok) throw new Error()
      showToast('Destaque removido com sucesso.')
      if (editId === itemParaExcluir.id) {
        setIsDirty(false)
        fecharEditorForce()
      }
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
    setEpisodios([])
    setLinks([])
    setEstreia('')
    setDuracao('')
    setIsDestaque(true)
    setCurationStatus('parcial')
    setResultadosBusca([])
    setSugestaoEmCuradoria(null)
    setIsDirty(false)
  }

  const abrirNovoDestaque = () => {
    pedirConfirmacao(() => {
      limparFormulario()
      setFormularioAberto(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const fecharEditorForce = () => {
    limparFormulario()
    setFormularioAberto(false)
  }

  const tentarFecharEditor = () => {
    pedirConfirmacao(() => fecharEditorForce())
  }

  const tentarLimparFormulario = () => {
    pedirConfirmacao(() => limparFormulario())
  }

  const editarDestaque = (anime: CuratedAnime) => {
    pedirConfirmacao(() => {
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
      setEpisodios(anime.custom_episodes || [])
      setLinks(anime.custom_external_links || [])
      setEstreia(estreiaParaInput(anime.custom_first_aired_at))
      setDuracao(anime.custom_duration_minutes ? String(anime.custom_duration_minutes) : '')
      // `?? true` e não `|| true`: o banco tem DEFAULT true, mas um false gravado de
      // propósito precisa sobreviver — com `||` ele viraria true de novo.
      setIsDestaque(anime.is_destaque ?? true)
      setCurationStatus(anime.curation_status || 'parcial')
      setPreviewTitulo(anime.custom_title)
      setFormularioAberto(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })

      setTimeout(() => {
        setInitialStateHash(JSON.stringify({
          titulo: anime.custom_title, formato: anime.custom_format || 'TV', status: anime.custom_status || 'RELEASING',
          ordem: anime.order_index, sinopse: anime.custom_synopsis || '', tags: anime.custom_tags || [],
          coverImage: anime.custom_cover_image || '', bannerImage: anime.custom_banner_image || '',
          characters: anime.custom_characters || [],
          episodios: anime.custom_episodes || [], links: anime.custom_external_links || [],
          estreia: estreiaParaInput(anime.custom_first_aired_at),
          duracao: anime.custom_duration_minutes ? String(anime.custom_duration_minutes) : '',
          isDestaque: anime.is_destaque ?? true, curationStatus: anime.curation_status || 'parcial'
        }))
        setIsDirty(false)
      }, 100)
    })
  }

  const handleSinopseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSinopse(e.target.value)
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
          <div className="hidden sm:flex items-center gap-2 bg-panel-2 border border-line rounded-full px-3 py-1.5 select-none">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-2 border-r border-line pr-2" title="Saúde Passiva da API AniList">
              <Activity size={12} />
              <span className={apiHealth === 'OK' ? 'text-green' : apiHealth === 'WARNING' ? 'text-gold' : 'text-coral'}>
                {apiHealth}
              </span>
            </span>
            <button
              type="button"
              onClick={toggleKillSwitch}
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${forceOffline ? 'text-coral hover:text-coral/80' : 'text-muted hover:text-text'}`}
              title={forceOffline ? "Reconectar AniList" : "Desconectar AniList (Forçar Offline)"}
            >
              <PowerOff size={12} />
              {forceOffline ? 'OFFLINE' : 'ONLINE'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setConfigModalAberto(true)}
            title="Configurar a personalidade da IA"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 bg-gradient-to-r from-holo-1/10 to-holo-2/10 border border-holo-1/30 text-holo-1 hover:text-white hover:bg-gradient-to-r hover:from-holo-1 hover:to-holo-2 text-[11px] sm:text-xs font-bold rounded-full cursor-pointer transition-all shadow-[0_0_15px_rgba(255,79,216,0.15)] shrink-0"
          >
            <Sparkles size={14} /> IA
          </button>
          <button
            type="button"
            onClick={() => setOlheiroAberto(true)}
            title="Sugestões do Agente Olheiro"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 bg-panel-2 border border-line text-muted hover:text-text text-[11px] sm:text-xs font-bold rounded-full cursor-pointer transition-all shrink-0"
          >
            🔭 Olheiro
          </button>
          <button
            type="button"
            onClick={() => pedirConfirmacao(() => navigate('/'))}
            className="text-sm font-bold text-muted hover:text-text transition-colors cursor-pointer"
          >
            ← Voltar
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 mt-2 relative z-10">
        <div className={`mb-8 ${formularioAberto ? 'hidden lg:block' : 'block'}`}>
          <h1 className="font-anton text-3xl uppercase">Painel de Curadoria</h1>
          <p className="text-muted text-sm mt-1">Gerencie os "Destaques AniDeck" e refine a exibição de capas e personagens.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 lg:gap-8 items-start">

          <div className={`lg:block ${formularioAberto ? 'hidden' : 'block'}`}>
            <DestaquesRail
              destaques={destaques}
              selectedId={editId}
              onSelect={editarDestaque}
              onDelete={(id, titulo) => setItemParaExcluir({ id, titulo })}
              onNovo={abrirNovoDestaque}
              novoAtivo={formularioAberto && !editId}
            />
          </div>

          {/* 'min-w-0' resolve o estouro do layout */}
          <div className={`bg-panel border border-line rounded-2xl shadow-xl lg:sticky lg:top-24 min-w-0 ${formularioAberto ? 'block' : 'hidden lg:block'}`}>
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

                <button
                  onClick={tentarFecharEditor}
                  className="lg:hidden flex items-center gap-1.5 text-xs font-bold text-holo-2 bg-holo-2/10 px-3 py-1.5 rounded-lg mb-6 hover:bg-holo-2/20 transition-colors"
                >
                  <ArrowLeft size={14} /> Voltar para a lista
                </button>

                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-sm flex items-center gap-2">
                    {editId ? '✎ Editando Destaque' : '🔍 Novo Destaque'}
                    {isDirty && <span className="w-2 h-2 rounded-full bg-holo-3 animate-pulse" title="Alterações não salvas"></span>}
                  </h3>
                  <div className="flex items-center gap-3">
                    <button onClick={tentarLimparFormulario} className="text-xs text-muted hover:text-text cursor-pointer">
                      Limpar
                    </button>
                    <button
                      onClick={tentarFecharEditor}
                      aria-label="Fechar editor"
                      className="w-7 h-7 rounded-lg bg-panel-2 border border-line text-muted hover:text-white hover:border-holo-2 transition-colors cursor-pointer hidden lg:flex items-center justify-center"
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
                  onSelecionar={aplicarAnimeNoFormulario}
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
                              className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${status === opt.value ? 'bg-coral/20 border-coral text-coral' : 'bg-panel-2 border-line text-muted'
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

                      onUpdate={(index, char) => {
                        const newChars = [...characters]
                        newChars[index] = char
                        setCharacters(newChars)
                      }}

                      onRemove={(index) => setCharacters(characters.filter((_, i) => i !== index))}
                      onUploadImage={uploadImagem}
                      uploading={uploading}
                      onValidationError={(msg) => showToast(msg, 'error')}
                    />

                    <CuradoriaEpisodios
                      episodes={episodios}
                      onAdd={(ep) => setEpisodios([...episodios, ep])}
                      onUpdate={(index, ep) => {
                        const novos = [...episodios]
                        novos[index] = ep
                        setEpisodios(novos)
                      }}
                      onRemove={(index) => setEpisodios(episodios.filter((_, i) => i !== index))}
                      onUploadImage={uploadImagem}
                      uploading={uploading}
                      onValidationError={(msg) => showToast(msg, 'error')}
                      onImportar={importarEpisodiosDaAniList}
                      importando={importandoEpisodios}
                      onDefinirLista={setEpisodios}
                    />

                    <CuradoriaLinks
                      links={links}
                      onAdd={(link) => setLinks([...links, link])}
                      onUpdate={(index, link) => {
                        const novos = [...links]
                        novos[index] = link
                        setLinks(novos)
                      }}
                      onRemove={(index) => setLinks(links.filter((_, i) => i !== index))}
                      onValidationError={(msg) => showToast(msg, 'error')}
                    />

                    {/* Exibição e curadoria: campos que não descrevem a obra, e sim como ela
                        é tratada pelo AniDeck. Por isso ficam juntos e separados do resto. */}
                    <div className="p-4 border border-line bg-panel-2 rounded-xl">
                      <h4 className="text-xs font-bold text-muted uppercase mb-4">Exibição &amp; Controle</h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-[10px] mb-1 font-bold text-muted">Estreia do episódio 1 (data e hora)</label>
                          <input
                            type="datetime-local"
                            value={estreia}
                            onChange={(e) => setEstreia(e.target.value)}
                            className="w-full bg-panel border border-line rounded px-2 py-1.5 text-xs outline-none focus:border-holo-2 text-text"
                          />
                          <p className="text-[9.5px] text-muted-2 mt-1">
                            No <b className="text-muted">seu</b> horário — a conversão é automática. É a hora que permite
                            calcular a contagem regressiva sem a AniList.
                          </p>
                        </div>

                        <div>
                          <label className="block text-[10px] mb-1 font-bold text-muted">Duração do episódio (min)</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={duracao}
                            onChange={(e) => setDuracao(e.target.value)}
                            placeholder="24"
                            className="w-full bg-panel border border-line rounded px-2 py-1.5 text-xs outline-none focus:border-holo-2 text-text tabular-nums"
                          />
                          <p className="text-[9.5px] text-muted-2 mt-1">Sem isso, o tempo assistido usa uma estimativa de 24 min.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] mb-1 font-bold text-muted">Estado da curadoria</label>
                          <select
                            value={curationStatus}
                            onChange={(e) => setCurationStatus(e.target.value as CurationStatus)}
                            className="w-full bg-panel border border-line rounded px-2 py-1.5 text-xs outline-none text-text"
                          >
                            <option value="parcial">Parcial — ainda falta coisa</option>
                            <option value="completo">Completo — nada pendente</option>
                            <option value="revisar">Revisar — tem algo errado</option>
                          </select>
                        </div>

                        <div className="flex items-end">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none w-full bg-panel border border-line rounded px-3 py-2 hover:border-holo-2 transition-colors">
                            <input
                              type="checkbox"
                              checked={isDestaque}
                              onChange={(e) => setIsDestaque(e.target.checked)}
                              className="w-4 h-4 accent-holo-2 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-text">Exibir como destaque</span>
                          </label>
                        </div>
                      </div>
                      <p className="text-[9.5px] text-muted-2 mt-2">
                        Desmarcar mantém o anime curado e com os dados aplicados — só tira ele da vitrine de destaques.
                      </p>
                    </div>

                    <ReorderableTags tags={tags} onChange={setTags} />

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-muted uppercase">Sinopse Curada</label>

                        {/* NOVO BOTÃO DA IA */}
                        <button
                          type="button"
                          onClick={reescreverComIA}
                          disabled={gerandoIA || !sinopse}
                          className="flex items-center gap-1.5 text-[10px] font-bold bg-holo-1/10 text-holo-1 border border-holo-1/30 px-2.5 py-1 rounded-md hover:bg-holo-1/20 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {gerandoIA ? (
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Sparkles size={12} />
                          )}
                          {gerandoIA ? 'Reescrevendo...' : 'Reescrever com IA'}
                        </button>
                      </div>

                      <textarea
                        ref={textareaRef}
                        value={sinopse}
                        onChange={handleSinopseChange}
                        disabled={gerandoIA}
                        className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm outline-none min-h-[120px] focus:border-holo-2 resize-none custom-scrollbar disabled:opacity-60"
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
      <Sheet
        isOpen={olheiroAberto}
        onClose={() => setOlheiroAberto(false)}
        title="Agente Olheiro"
        maxWidthClass="md:max-w-4xl"
      >
               {/* Só monta quando o Sheet abre: o hook recarrega a fila a cada
            abertura (sugestões abandonadas reaparecem) e o painel deixa de
            fazer a requisição para quem nunca abre o Olheiro. */}
        {olheiroAberto && (
          <AbaOlheiro onCurar={(sugestao) => pedirConfirmacao(() => curarSugestao(sugestao))} />
        )}
      </Sheet>
      {/* Declarado por último de propósito: todos os Sheets usam z-[100], e
          empate no z-index é resolvido pela ordem no DOM — quem renderiza
          depois fica por cima. */}
      <Sheet
        isOpen={acaoPendente !== null}
        onClose={() => setAcaoPendente(null)}
        title="Descartar alterações?"
      >
        <p className="text-sm text-muted mb-6">
          Você tem alterações não salvas neste destaque. Se continuar, elas serão perdidas.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setAcaoPendente(null)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-line text-sm font-bold cursor-pointer hover:border-muted transition-colors"
          >
            Continuar editando
          </button>
          <button
            onClick={confirmarAcaoPendente}
            className="flex-1 px-4 py-2.5 rounded-xl bg-coral/10 border border-coral text-coral text-sm font-bold cursor-pointer hover:bg-coral hover:text-void transition-colors"
          >
            Descartar
          </button>
        </div>
      </Sheet>
      <ConfigIAModal
        isOpen={configModalAberto}
        onClose={() => setConfigModalAberto(false)}
      />
    </div>
  )
}