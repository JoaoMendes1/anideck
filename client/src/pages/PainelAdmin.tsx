import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { Sparkles, X, LayoutList, ArrowLeft, Activity, PowerOff, Zap, Loader2 } from 'lucide-react'
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
import { totalEpisodiosCurado, ehObraEmBreve, type CuratedAnime, type CuratedCharacter, type CuratedEpisode, type CuratedExternalLink, type CurationStatus } from '../types/curation'
import ConfigIAModal from '../components/ConfigIAModal'
import { AbaOlheiro } from '../components/AbaOlheiro'
import { AbaControle } from '../components/AbaControle'
import AbaTrilhas from '../components/AbaTrilhas'
import AbaRevisaoIA from '../components/AbaRevisaoIA'
import AbaGuilda from '../components/AbaGuilda'
import AbaModeracao from '../components/AbaModeracao'
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
        nextAiringEpisode { episode airingAt }
        streamingEpisodes { title thumbnail }
        characters(sort: [ROLE, RELEVANCE], perPage: 15) {
          edges { role node { name { full } image { large } } }
        }
      }
    }
  }
`

// Assinatura do formulário, usada para saber se há alteração não salva.
//
// Ficava montado em três lugares — a comparação e os dois pontos que gravam a referência —
// cada um listando as 15 chaves na mão. Qualquer divergência de ordem ou de campo entre eles
// deixaria o formulário marcado como sujo para sempre, sem nada indicando o porquê. Aqui a
// ordem é do array, não de quem chama, então não há como divergir.
type CamposDoFormulario = {
  titulo: string
  formato: string
  status: string
  ordem: number
  sinopse: string
  tags: string[]
  coverImage: string
  bannerImage: string
  characters: CuratedCharacter[]
  episodios: CuratedEpisode[]
  links: CuratedExternalLink[]
  estreia: string
  duracao: string
  isDestaque: boolean
  curationStatus: CurationStatus
}

const montarHash = (c: CamposDoFormulario) => JSON.stringify([
  c.titulo, c.formato, c.status, c.ordem, c.sinopse, c.tags, c.coverImage, c.bannerImage,
  c.characters, c.episodios, c.links, c.estreia, c.duracao, c.isDestaque, c.curationStatus,
])

// Menu do painel agrupado por assunto. As seções do Controle viram itens próprios, para
// não haver um segundo menu dentro da aba.
type AbaDoMenu = 'curadoria' | 'controle' | 'trilhas' | 'revisao_ia' | 'guilda' | 'moderacao'
interface ItemDoMenu { id: string; nome: string; aba: AbaDoMenu; secao?: string }
const GRUPOS_ADMIN: { titulo: string; itens: ItemDoMenu[] }[] = [
  { titulo: 'Catálogo', itens: [
    { id: 'curadoria', nome: 'Obras curadas', aba: 'curadoria' },
    { id: 'trilhas', nome: 'Trilhas', aba: 'trilhas' },
    { id: 'controle:rotulos', nome: 'Rótulos', aba: 'controle', secao: 'rotulos' },
  ] },
  { titulo: 'Inteligência artificial', itens: [
    { id: 'revisao_ia', nome: 'Fila de revisão', aba: 'revisao_ia' },
    { id: 'controle:curadoria_ia', nome: 'Ritmo e prompts', aba: 'controle', secao: 'curadoria_ia' },
    { id: 'controle:olheiro', nome: 'Olheiro', aba: 'controle', secao: 'olheiro' },
  ] },
  { titulo: 'Comunidade', itens: [
    { id: 'moderacao', nome: 'Moderação', aba: 'moderacao' },
    { id: 'guilda', nome: 'Guilda e XP', aba: 'guilda' },
    { id: 'controle:ranking', nome: 'Ranking', aba: 'controle', secao: 'ranking' },
  ] },
  { titulo: 'Sistema', itens: [
    { id: 'controle:anilist', nome: 'AniList e saúde', aba: 'controle', secao: 'anilist' },
    { id: 'controle:diagnostico', nome: 'Diagnóstico', aba: 'controle', secao: 'diagnostico' },
  ] },
]

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

  const [modoManual, setModoManual] = useState(false)
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

  type AbaAdmin = 'curadoria' | 'controle' | 'trilhas' | 'revisao_ia' | 'guilda' | 'moderacao'
  const [searchParams, setSearchParams] = useSearchParams()
  const abaParam = searchParams.get('aba')
  const abaAtiva: AbaAdmin =
    abaParam === 'controle' || abaParam === 'trilhas' || abaParam === 'revisao_ia' || abaParam === 'guilda' || abaParam === 'moderacao'
      ? abaParam
      : 'curadoria'

  const secaoControle = searchParams.get('secao') || 'anilist'
  const itemAtivo = abaAtiva === 'controle' ? `controle:${secaoControle}` : abaAtiva
  const itemDoMenu = GRUPOS_ADMIN.flatMap(g => g.itens).find(i => i.id === itemAtivo)

  const irParaItem = (id: string) => {
    const item = GRUPOS_ADMIN.flatMap(g => g.itens).find(i => i.id === id)
    if (!item) return
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (item.aba === 'curadoria') next.delete('aba')
      else next.set('aba', item.aba)
      if (item.secao && item.secao !== 'anilist') next.set('secao', item.secao)
      else next.delete('secao')
      return next
    }, { replace: true })
  }

  const setAbaAtiva = (novaAba: AbaAdmin) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (novaAba === 'curadoria') {
        next.delete('aba')
      } else {
        next.set('aba', novaAba)
      }
      if (novaAba !== 'controle') {
        next.delete('secao')
      }
      return next
    }, { replace: true })
  }

  const [initialStateHash, setInitialStateHash] = useState('')

  // Declaradas antes do efeito que as usa: acessar uma const antes da linha em que ela
  // e declarada e valido em execucao (o efeito so roda depois do render), mas o linter
  // sinaliza, e ler de cima pra baixo fica mais simples assim.
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

  const carregarDestaques = async () => {
    try {
      const response = await fetch('/api/curation')
      if (!response.ok) throw new Error('Falha ao carregar destaques')
      const data = await response.json()
      setDestaques(data || [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    verificarAcesso()
    // A verificação inicial deve ocorrer uma única vez ao montar o painel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // "Tem alteração não salva" e valor DERIVADO, não estado.
  //
  // Antes era um estado escrito por um efeito e por mais cinco pontos imperativos. O efeito
  // rodava depois do render, o que abria uma janela onde o flag ainda nao refletia o
  // formulario — e era essa janela que o setTimeout(100) do editarDestaque contornava.
  //
  // O guarda do previewTitulo reproduz o `if (!previewTitulo) return` do efeito antigo: sem
  // formulario aberto nao ha o que comparar, e o limparFormulario justamente zera esse campo.
  const isDirty = Boolean(previewTitulo || modoManual) && montarHash({
    titulo, formato, status, ordem, sinopse, tags, coverImage, bannerImage, characters,
    episodios, links, estreia, duracao, isDestaque, curationStatus,
  }) !== initialStateHash

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

  // Reprocessa o anime_metadata_cache do deck E da curadoria.
  //
  // Por que importa: quase todo campo de curated_animes é sobreposição, não
  // preenchimento — deixar vazio significa "usa o da AniList". Mas o cache só
  // nasce quando alguém adiciona o anime ao deck, então anime curado e nunca
  // adicionado fica sem fonte nenhuma.
  //
  // O endpoint devolve 202 e segue trabalhando em background: o resultado NÃO
  // volta para a tela, sai no log do servidor. O toast diz isso de propósito.
  const [resyncRodando, setResyncRodando] = useState(false)

  const resyncMetadados = async () => {
    setResyncRodando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/metadata/resync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) throw new Error()

      const info = await res.json()
      const notaPulados = info.pulados ? ` (${info.pulados} já em dia foram pulados)` : ''
      showToast(
        `Sincronizando ${info.total} animes${notaPulados}. ` +
        `Leva alguns minutos — acompanhe pelo log do servidor.`,
        'success',
      )
    } catch {
      showToast('Erro ao iniciar a sincronização de metadados.', 'error')
    } finally {
      setResyncRodando(false)
    }
  }

  const [importandoLote, setImportandoLote] = useState(false)

  const importarTodosSemEpisodios = async () => {
    setImportandoLote(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/curation/auto-import-episodes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      showToast(
        `Importação concluída: ${data.importados} animes com episódios cadastrados (${data.sem_episodios} sem episódios na AniList).`,
        'success'
      )
      await carregarDestaques()
    } catch {
      showToast('Erro ao importar episódios em lote da AniList.', 'error')
    } finally {
      setImportandoLote(false)
    }
  }

  //	Verifica admin, carrega destaques e status da API, além de permitir alternar kill switch
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
  // mesma passada. Se a obra já estiver curada, reaproveita o registro existente
  // para preservar episódios, links, ID de edição e customizações manuais.
  const aplicarAnimeNoFormulario = (anime: AniListMedia) => {
    const existente = destaques.find((d) => d.mal_id === anime.idMal)

    const tituloCorreto = existente?.custom_title || anime.title.romaji || anime.title.english || anime.title.native || ''
    const formatoAnime = existente?.custom_format || anime.format || 'TV'
    const statusAnime = existente?.custom_status || anime.status || 'RELEASING'
    const sinopseLimpa = existente?.custom_synopsis || (anime.synopsis ? anime.synopsis.replace(/<[^>]*>?/gm, '') : '')
    const tagsAnime = existente?.custom_tags || anime.genres || []
    const capa = existente?.custom_cover_image || anime.coverImage?.large || ''
    const banner = existente?.custom_banner_image || anime.bannerImage || ''
    const ordemAnime = existente?.order_index ?? 0
    const comTitulo = anime.streamingEpisodes || []
    const lancadosAteAgora = anime.nextAiringEpisode?.episode ? Math.max(0, anime.nextAiringEpisode.episode - 1) : 0
    const totalEps = anime.episodes || comTitulo.length || lancadosAteAgora
    const epsAnime = existente?.custom_episodes?.length
      ? existente.custom_episodes
      : (totalEps > 0
          ? Array.from({ length: totalEps }, (_, i) => ({
              number: i + 1,
              title: comTitulo[i]?.title || '',
              image: comTitulo[i]?.thumbnail || '',
              aired_at: '',
            }))
          : [])
    const linksAnime = existente?.custom_external_links || []
    const estreiaAnime = estreiaParaInput(existente?.custom_first_aired_at)
    const duracaoAnime = existente?.custom_duration_minutes ? String(existente.custom_duration_minutes) : ''
    const destaqueAnime = existente?.is_destaque ?? true
    const statusCuracao = existente?.curation_status || 'parcial'

    const importedChars = existente?.custom_characters?.length
      ? existente.custom_characters
      : anime.characters?.edges?.map((edge) => ({
          name: edge.node.name?.full || 'Desconhecido',
          image: edge.node.image?.large || '',
          role: edge.role || 'SUPPORTING'
        })) || []

    setEditId(existente?.id || null)
    setMalId(anime.idMal)
    setTitulo(tituloCorreto)
    setFormato(formatoAnime)
    setStatus(statusAnime)
    setSinopse(sinopseLimpa)
    setTags(tagsAnime)
    setOrdem(ordemAnime)
    setCoverImage(capa)
    setBannerImage(banner)
    setCharacters(importedChars)
    setEpisodios(epsAnime)
    setLinks(linksAnime)
    setEstreia(estreiaAnime)
    setDuracao(duracaoAnime)
    setIsDestaque(destaqueAnime)
    setCurationStatus(statusCuracao)
    setPreviewTitulo(tituloCorreto)
    setResultadosBusca([])
    setTermoBusca('')

    setInitialStateHash(montarHash({
      titulo: tituloCorreto, formato: formatoAnime, status: statusAnime,
      ordem: ordemAnime, sinopse: sinopseLimpa, tags: tagsAnime,
      coverImage: capa, bannerImage: banner, characters: importedChars,
      episodios: epsAnime, links: linksAnime, estreia: estreiaAnime, duracao: duracaoAnime,
      isDestaque: destaqueAnime, curationStatus: statusCuracao
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
      const lancadosAteAgora = anime.nextAiringEpisode?.episode ? Math.max(0, anime.nextAiringEpisode.episode - 1) : 0
      const total = anime.episodes || comTitulo.length || lancadosAteAgora

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

  const uploadImagem = async (
    file: File,
    tipo: 'capa' | 'banner' = 'capa',
  ): Promise<string | null> => {
    setUploading(true)
    try {
      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: tipo === 'capa' ? 600 : 1920,
        useWebWorker: true,
        fileType: 'image/webp'
      }

      const compressedFile = await imageCompression(file, options)

      const fileName = `${Math.random().toString(36).substring(2, 15)}.webp`
      const filePath = `imagens/${fileName}`

      const { error: uploadError } = await supabase.storage.from('curadoria').upload(filePath, compressedFile, {
        // O nome do arquivo é sorteado a cada upload, então o conteúdo de uma URL nunca
        // muda: o navegador pode guardar por um ano. O padrão do Supabase é 1 hora.
        cacheControl: '31536000',
      })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('curadoria').getPublicUrl(filePath)
      showToast('Imagem otimizada (WebP) e enviada com sucesso!', 'success')
      return publicUrl
    } catch (err) {
      console.error('[UPLOAD IMAGEM]', err)
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


  const derivarEstreiaDoEp1 = (lista: CuratedEpisode[]) => {
    if (estreia) return
    const ep1 = lista.find((ep) => ep.number === 1)
    if (!ep1?.aired_at) return
    setEstreia(estreiaParaInput(ep1.aired_at))
  }

  const aplicarEpisodios = (lista: CuratedEpisode[]) => {
    setEpisodios(lista)
    derivarEstreiaDoEp1(lista)
  }

  const estreiaParaBanco = (valorDoInput: string) => {
    if (!valorDoInput) return null
    const data = new Date(valorDoInput)
    return isNaN(data.getTime()) ? null : data.toISOString()
  }

  const salvarDestaque = async () => {
    if (!malId || !titulo) {
      showToast('Preencha o MAL ID e o título antes de salvar!', 'error')
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

      // O zero vem da aba Demanda, que não passa pela fila e não tem id para
      // marcar como 'curado'. Sem esta guarda, o PATCH iria para /sugestoes/0.
      if (sugestaoEmCuradoria) {
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

      // Sem setIsDirty: fecharEditorForce chama limparFormulario, que zera o previewTitulo —
      // e sem formulário aberto o isDirty derivado já é falso.
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

      // Sem setIsDirty: o setSinopse/setTags acima já mudam a assinatura do formulário, e o
      // isDirty derivado acompanha. A diferença é que agora ele reflete a verdade — se a IA
      // devolver texto idêntico ao que já estava lá, não há nada a salvar.
      showToast('Sinopse reescrita com sucesso!', 'success')

    } catch {
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
        // Mesmo caso do salvar: o fecharEditorForce zera o previewTitulo.
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
    setModoManual(false)
  }

  const abrirNovoDestaque = () => {
    pedirConfirmacao(() => {
      limparFormulario()
      setFormularioAberto(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  // Abre o formulário sem a AniList. O caminho existe para quando a API está fora do ar ou
  // quando ela devolve idMal nulo (Armadilha 16): você busca o id no myanimelist.net, que
  // é um site separado do GraphQL do AniList, e digita.
  //
  // O initialStateHash nasce igual ao formulário vazio para o isDirty começar falso — sem
  // isso, abrir o modo manual já pediria confirmação de "alterações não salvas". O `status`
  // entra com o valor atual, e não com 'RELEASING', porque limparFormulario não o reseta.
  const criarManualmente = () => {
    pedirConfirmacao(() => {
      limparFormulario()
      setModoManual(true)
      setFormularioAberto(true)
      setInitialStateHash(montarHash({
        titulo: '', formato: 'TV', status, ordem: 0, sinopse: '', tags: [],
        coverImage: '', bannerImage: '', characters: [], episodios: [], links: [],
        estreia: '', duracao: '', isDestaque: true, curationStatus: 'parcial',
      }))
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

  // Ponte do Diagnóstico para o editor, no molde do curarSugestao do Olheiro:
  // clicar num anime com rótulo problemático leva direto para onde se conserta,
  // já com o formulário montado — e lá dá para usar a IA para reescrever as tags.
  //
  // Busca na lista já carregada em vez de refazer a requisição: os 114 destaques
  // vêm no boot do painel, e o curated_id da view é o mesmo `id` de lá.
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

      // Sem setTimeout: a referência é montada a partir dos mesmos valores que acabaram de
      // ser aplicados no formulário, no mesmo lote. Como isDirty agora é derivado, ele já
      // nasce falso — o atraso de 100ms existia só para esperar o efeito antigo rodar.
      setInitialStateHash(montarHash({
        titulo: anime.custom_title, formato: anime.custom_format || 'TV', status: anime.custom_status || 'RELEASING',
        ordem: anime.order_index, sinopse: anime.custom_synopsis || '', tags: anime.custom_tags || [],
        coverImage: anime.custom_cover_image || '', bannerImage: anime.custom_banner_image || '',
        characters: anime.custom_characters || [],
        episodios: anime.custom_episodes || [], links: anime.custom_external_links || [],
        estreia: estreiaParaInput(anime.custom_first_aired_at),
        duracao: anime.custom_duration_minutes ? String(anime.custom_duration_minutes) : '',
        isDestaque: anime.is_destaque ?? true, curationStatus: anime.curation_status || 'parcial'
      }))
    })
  }

  const abrirNaCuradoria = (curatedId: string) => {
    const anime = destaques.find(d => d.id === curatedId)
    if (!anime) {
      showToast('Este anime não está na lista de destaques carregada.', 'error')
      return
    }
    setAbaAtiva('curadoria')
    editarDestaque(anime)
  }

  // Quando o admin clica em "Curar / Editar no Painel" lá na página de Detalhes (/anime/:id),
  // ele chega aqui com ?mal_id=X. Se o anime já estiver curado, abre a edição; se ainda não
  // estiver, busca os dados na AniList e já abre o formulário preenchido pronto para salvar.
  useEffect(() => {
    if (loading || !isAdmin) return
    const malIdParam = searchParams.get('mal_id')
    if (!malIdParam) return
    const alvoMalId = Number(malIdParam)
    if (!alvoMalId || Number.isNaN(alvoMalId)) return

    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('mal_id')
      return next
    }, { replace: true })

    const existente = destaques.find(d => d.mal_id === alvoMalId)
    if (existente) {
      editarDestaque(existente)
      return
    }

    limparFormulario()
    setFormularioAberto(true)
    setBuscando(true)
    buscarAnimePorIdMal(alvoMalId).then(anime => {
      setBuscando(false)
      if (anime) {
        aplicarAnimeNoFormulario(anime)
      } else {
        setModoManual(true)
        setMalId(alvoMalId)
        showToast('AniList não respondeu; modo manual aberto com o MAL ID preenchido.', 'error')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAdmin, searchParams, destaques])

  const handleSinopseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSinopse(e.target.value)
  }

  if (isAdmin === false) return <Navigate to="/deck" replace />
  if (isAdmin === null || loading) return <div className="p-10 text-center text-muted font-mono text-sm">Carregando painel...</div>
  if (error) return <div className="p-10 text-center text-coral font-mono text-sm">{error}</div>

  return (
    <div className="min-h-screen bg-void text-text pb-20 relative z-10">
      <div className="bg-ambient"></div>

      <div className="sticky top-0 z-30 border-b border-line bg-void/95 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="w-8 h-8 hidden md:block" />
            <span className="font-anton text-lg bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-transparent bg-clip-text hidden md:block">
              ANIDECK
            </span>
            <span className="font-mono text-[10px] font-bold text-gold bg-gold/10 border border-gold/40 px-2.5 py-1 rounded-full">⚙ ADMIN</span>
          </div>
          <div className="flex gap-1.5 sm:gap-3 items-center">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-panel-2 border border-line rounded-full px-2.5 sm:px-3 py-1.5 select-none">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-2 border-r border-line pr-1.5 sm:pr-2" title="Saúde Passiva da API AniList">
                <Activity size={12} />
                {/* O rótulo textual da saúde some no mobile: o que importa ali é a cor
                    do ícone. A palavra OFFLINE do Kill Switch fica, porque é ação. */}
                <span className={`hidden sm:inline ${apiHealth === 'OK' ? 'text-green' : apiHealth === 'WARNING' ? 'text-gold' : 'text-coral'}`}>
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
              aria-label="Sugestões do Olheiro"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 bg-panel-2 border border-line text-muted hover:text-text text-[11px] sm:text-xs font-bold rounded-full cursor-pointer transition-all shrink-0"
            >
              <span aria-hidden="true">🔭</span> <span className="hidden sm:inline">Olheiro</span>
            </button>
            <button
              type="button"
              onClick={() => pedirConfirmacao(() => navigate('/'))}
              aria-label="Voltar ao site"
              className="text-xs sm:text-sm font-bold text-muted hover:text-text px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-panel-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              ←<span className="hidden sm:inline"> Voltar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {(() => {
          const grupoAtivo = GRUPOS_ADMIN.find(g => g.itens.some(i => i.id === itemAtivo)) ?? GRUPOS_ADMIN[0]
          return (
            <nav
              aria-label="Seções do painel"
              className="mb-7 bg-panel border border-line rounded-2xl p-2 sm:p-2.5 shadow-lg select-none"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pb-2 mb-2 border-b border-line/70">
                {GRUPOS_ADMIN.map(grupo => {
                  const ativo = grupo.titulo === grupoAtivo.titulo
                  return (
                    <button
                      key={grupo.titulo}
                      type="button"
                      onClick={() => {
                        if (!ativo && grupo.itens[0]) irParaItem(grupo.itens[0].id)
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer text-center truncate ${
                        ativo
                          ? 'bg-gradient-to-r from-holo-1/20 to-holo-2/20 border border-holo-2/60 text-text shadow-[0_0_14px_rgba(123,92,255,0.18)]'
                          : 'border border-transparent bg-panel-2/50 text-muted hover:bg-panel-2 hover:text-text'
                      }`}
                    >
                      {grupo.titulo}
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 px-0.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-2 mr-1.5 hidden sm:inline">
                  {grupoAtivo.titulo}:
                </span>
                {grupoAtivo.itens.map(item => {
                  const ativo = itemAtivo === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => irParaItem(item.id)}
                      aria-current={ativo ? 'page' : undefined}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        ativo
                          ? 'bg-holo-3/15 border-holo-3/60 text-holo-3 shadow-[0_0_10px_rgba(63,224,240,0.15)]'
                          : 'bg-panel-2 border-line text-muted hover:text-text hover:border-muted-2'
                      }`}
                    >
                      {item.nome}
                    </button>
                  )
                })}
              </div>
            </nav>
          )
        })()}

        <div className="min-w-0">
        {abaAtiva === 'curadoria' && (() => {
          const semEps = destaques.filter(d => totalEpisodiosCurado(d) === 0 && !ehObraEmBreve(d))
          const emBreve = destaques.filter(d => ehObraEmBreve(d))
          return (
            <div className={`mb-6 min-w-0 ${formularioAberto ? 'hidden lg:block' : 'block'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="font-anton text-3xl uppercase m-0">Obras curadas</h1>
                    <span className="font-mono text-xs bg-panel border border-line px-2.5 py-0.5 rounded-full text-muted">
                      {destaques.length}
                    </span>
                  </div>
                  <p className="text-muted text-sm mt-1">Sinopse, tags, episódios, capas e personagens de cada obra do catálogo. Marque como destaque para aparecer na vitrine.</p>
                </div>
                {semEps.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2.5 bg-gold/10 border border-gold/40 text-gold px-4 py-2.5 rounded-xl text-xs font-bold">
                    <span>⚠ {semEps.length} anime(s) curado(s) sem episódios</span>
                    <button
                      type="button"
                      onClick={importarTodosSemEpisodios}
                      disabled={importandoLote}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-holo-2 text-void font-extrabold hover:opacity-90 cursor-pointer transition-opacity shrink-0 disabled:opacity-50"
                      title="Importa episódios da AniList para todas as obras da lista"
                    >
                      {importandoLote ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Zap size={12} />
                          Importar da AniList ({semEps.length})
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => editarDestaque(semEps[0])}
                      className="px-3 py-1 rounded-full bg-gold text-void font-extrabold hover:opacity-90 cursor-pointer transition-opacity shrink-0"
                    >
                      Editar 1º da fila
                    </button>
                  </div>
                )}
                {semEps.length === 0 && emBreve.length > 0 && (
                  <div className="flex items-center gap-2 bg-holo-3/10 border border-holo-3/30 text-holo-3 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0">
                    <span>✨ {emBreve.length} anime(s) anunciado(s) (em breve)</span>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {abaAtiva === 'controle' && (
          <>
            <div className="mb-8 min-w-0">
              <h1 className="font-anton text-3xl uppercase">{itemDoMenu?.nome ?? 'Painel de Controle'}</h1>
              <p className="text-muted text-sm mt-1">Ajuste como o sistema funciona e veja o que ele está fazendo agora.</p>
            </div>
            <AbaControle
              apiHealth={apiHealth}
              forceOffline={forceOffline}
              onToggleKillSwitch={toggleKillSwitch}
              onResync={() => pedirConfirmacao(resyncMetadados)}
              resyncRodando={resyncRodando}
              onAbrirCuradoria={abrirNaCuradoria}
            />
          </>
        )}

        {abaAtiva === 'revisao_ia' && (
          <>
            <div className="mb-8 min-w-0">
              <h1 className="font-anton text-3xl uppercase">Revisão da IA</h1>
              <p className="text-muted text-sm mt-1">Marque vários animes, deixe o worker processar e aprove ou descarte depois.</p>
            </div>
            <AbaRevisaoIA curados={destaques} />
          </>
        )}

        {abaAtiva === 'trilhas' && (
          <>
            <div className="mb-8 min-w-0">
              <h1 className="font-anton text-3xl uppercase">Trilhas curadas</h1>
              <p className="text-muted text-sm mt-1">Agrupamentos com nome e nota do curador, exibidos na Início na ordem desta lista.</p>
            </div>
            <AbaTrilhas />
          </>
        )}

        {abaAtiva === 'moderacao' && (
          <>
            <div className="mb-8 min-w-0">
              <h1 className="font-anton text-3xl uppercase">Moderação</h1>
              <p className="text-muted text-sm mt-1">Denúncias dos comentários de episódio e as regras da Mana e da Vitalidade.</p>
            </div>
            <AbaModeracao />
          </>
        )}

        {abaAtiva === 'guilda' && (
          <>
            <div className="mb-8 min-w-0">
              <h1 className="font-anton text-3xl uppercase">Guilda & Economia de XP</h1>
              <p className="text-muted text-sm mt-1">Calibre pesos de XP, faixas F→SS, insígnias, eventos e auditoria de atividade sem exigir deploy.</p>
            </div>
            <AbaGuilda />
          </>
        )}

        {/* O grid da Curadoria é montado condicionalmente, não escondido por CSS:
            deixá-lo no DOM manteria os 114 cards do DestaquesRail renderizados
            atrás da aba de Controle. */}
        {abaAtiva === 'curadoria' && (
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
                  <h3 className="font-anton text-lg uppercase text-text mb-1">Nenhuma obra selecionada</h3>
                  <p className="text-sm text-muted max-w-xs mb-6">
                    Escolha um item na lista ao lado para editar, ou comece a curar uma obra nova.
                  </p>
                  <button
                    onClick={abrirNovoDestaque}
                    className="bg-gradient-to-r from-holo-1 to-holo-2 text-void font-extrabold text-sm px-6 py-2.5 rounded-full hover:opacity-90 cursor-pointer transition-opacity"
                  >
                    + Curar nova obra
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
                      {editId ? "✎ Editando obra" : "🔍 Nova obra"}
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

                  <button
                    type="button"
                    onClick={criarManualmente}
                    className="mt-3 text-xs font-bold text-muted hover:text-holo-3 transition-colors cursor-pointer"
                  >
                    Criar manualmente, sem a AniList →
                  </button>

                  {(previewTitulo || modoManual) && (
                    <div className="border-t border-dashed border-line pt-6 mt-4 space-y-6 animate-in fade-in duration-300">
                      <div>
                        <label className="block text-xs font-bold text-muted mb-2 uppercase">
                          MAL ID {editId && <span className="text-muted-2 normal-case">(travado)</span>}
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={malId ?? ''}
                          onChange={(e) => setMalId(e.target.value ? Number(e.target.value) : null)}
                          disabled={!!editId}
                          placeholder="Ex: 52991 — busque no myanimelist.net"
                          className="w-full bg-panel-2 border border-line rounded-xl px-4 py-2 text-sm outline-none focus:border-holo-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <p className="text-[11px] text-muted-2 mt-1.5">
                          {editId
                            ? 'Trocar o MAL ID dessincronizaria o progresso e os decks já salvos. Para mudar, exclua e recrie.'
                            : 'É a chave que liga curadoria, cache, deck e progresso. Use sempre o id real do MyAnimeList.'}
                        </p>
                      </div>

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
                              { value: 'NOT_YET_RELEASED', label: 'Em breve' },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setStatus(opt.value)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
                                  status === opt.value
                                    ? opt.value === 'NOT_YET_RELEASED'
                                      ? 'bg-holo-3/20 border-holo-3 text-holo-3'
                                      : opt.value === 'FINISHED'
                                        ? 'bg-green/20 border-green text-green'
                                        : 'bg-coral/20 border-coral text-coral'
                                    : 'bg-panel-2 border-line text-muted hover:border-muted-2'
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
                              const url = await uploadImagem(file, 'capa')
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
                              const url = await uploadImagem(file, 'banner')
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
                        dataEstreiaBase={estreia}
                        onAdd={(ep) => aplicarEpisodios([...episodios, ep])}
                        onUpdate={(index, ep) => {
                          const novos = [...episodios]
                          novos[index] = ep
                          aplicarEpisodios(novos)
                        }}
                        onRemove={(index) => setEpisodios(episodios.filter((_, i) => i !== index))}
                        onUploadImage={uploadImagem}
                        uploading={uploading}
                        onValidationError={(msg) => showToast(msg, 'error')}
                        onImportar={importarEpisodiosDaAniList}
                        importando={importandoEpisodios}
                        onDefinirLista={aplicarEpisodios}
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
                              No <strong>seu</strong> horário — a conversão é automática. É a hora que permite calcular a contagem regressiva sem a AniList.
                              calcular a contagem regressiva sem a AniList. Preenchido sozinho quando você salva o episódio 1 com data.
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
                            <span className="block text-[10px] mb-1.5 font-bold text-muted uppercase tracking-wide">Estado da curadoria</span>
                            <div className="flex flex-wrap gap-1.5">
                              {([
                                { value: 'parcial', label: 'Parcial', activeClass: 'bg-panel border-holo-2 text-holo-2' },
                                { value: 'completo', label: 'Completo', activeClass: 'bg-green/15 border-green text-green' },
                                { value: 'revisar', label: 'Revisar', activeClass: 'bg-coral/15 border-coral text-coral' },
                              ] as const).map((opt) => {
                                const ativo = curationStatus === opt.value
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setCurationStatus(opt.value)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                                      ativo ? opt.activeClass : 'bg-panel border-line text-muted hover:text-text'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <div className="flex items-end">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none w-full bg-panel border border-line rounded-xl px-3 py-2 hover:border-holo-2 transition-colors">
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

                      <div className="sticky bottom-0 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3.5 bg-panel/95 backdrop-blur-md flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 border-t border-line rounded-b-2xl">
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
                          className="w-full sm:w-auto bg-gradient-to-r from-holo-1 to-holo-2 text-void font-extrabold text-sm px-8 py-3 rounded-full hover:opacity-90 cursor-pointer transition-opacity shadow-[0_0_20px_rgba(255,79,216,0.25)]"
                        >
                          {editId ? 'Salvar Alterações' : 'Publicar Destaque'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>)}
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
