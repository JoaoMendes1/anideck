// client/src/pages/Configuracoes.tsx
import { useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { useCatalogoStatus } from '../contexts/CatalogoStatusContext'
import EmBreve from '../components/EmBreve'
import { TEMAS, aplicarTema, useTema } from '../lib/temas'
import { ChevronDown, MessageSquare, Check, AlertTriangle, Sparkles, Ban, Upload, FileText } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useRotulos } from '../hooks/useRotulos'
import { lerPreferenciasDeGosto, salvarPreferenciasDeGosto } from '../lib/preferenciasGosto'
import { invalidarCachesDoDeck, removerDaMemoria, chaveDoUsuario } from '../lib/cacheDeTela'

const ABAS = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'gosto', label: 'Preferências de Gosto' },
    { id: 'importar', label: 'Importar Lista' },
    { id: 'aparencia', label: 'Aparência' },
    { id: 'notificacoes', label: 'Notificações' },
    { id: 'conta', label: 'Conta' },
    { id: 'ajuda', label: 'Ajuda' },
]

const VERSAO = '1.0'
const EMAIL_SUPORTE = 'anidecksuporte@gmail.com'

const FAQ = [
    {
        p: 'O AniDeck sincroniza com minha conta do MyAnimeList ou AniList?',
        r: 'Não. As informações do catálogo (capas, títulos, episódios) vêm da AniList, mas sua lista, suas notas e seu progresso são só seus, salvos aqui, sem ligação com conta nenhuma de fora.',
    },
    {
        p: 'Preciso de conta pra buscar animes?',
        r: 'Não. Buscar, ver detalhes e consultar os rankings é livre. A conta só é necessária pra salvar algo no seu Deck.',
    },
    {
        p: 'O que significa o status "Em Dia"?',
        r: 'Significa que você já assistiu todos os episódios lançados até agora de um anime que ainda está no ar — diferente de "Completo", reservado pra quando o anime terminar de vez.',
    },
    {
        p: 'Por que às vezes as capas somem?',
        r: 'Quando a AniList está fora do ar, o AniDeck continua mostrando seu Deck normalmente, mas sem os dados de catálogo. Seus animes, notas e progresso nunca dependem dela — ficam salvos aqui.',
    },
]

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
    // scroll-mt-28 compensa a navbar fixa: sem isso, o link de âncora para
    // a seção deixa o título escondido atrás dela.
    return (
        <section id={id} className="scroll-mt-28 border-b border-line py-8 last:border-b-0">
            <h2 className="font-anton text-[15px] uppercase tracking-wide text-muted mb-4 select-none">{titulo}</h2>
            {children}
        </section>
    )
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`bg-panel border border-line rounded-2xl p-5 ${className}`}>{children}</div>
}

function LinhaToggle({ titulo, desc, ligado }: { titulo: string; desc: string; ligado?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3.5 border-b border-line last:border-b-0">
            <div>
                <div className="text-[13.5px] font-bold">{titulo}</div>
                <div className="text-[12px] text-muted-2 mt-0.5">{desc}</div>
            </div>
            <div className={`relative w-[42px] h-6 rounded-full shrink-0 border ${ligado ? 'bg-gradient-to-r from-holo-1 to-holo-2 border-transparent' : 'bg-panel-2 border-line'}`}>
                <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-transform ${ligado ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} />
            </div>
        </div>
    )
}

export default function Configuracoes() {
    const { showToast } = useToast()
    const temaAtivo = useTema()
    const { indisponivel } = useCatalogoStatus()
    const { rotulos } = useRotulos()

    const [carregando, setCarregando] = useState(true)
    const [userId, setUserId] = useState('')
    const [email, setEmail] = useState('')
    const [nome, setNome] = useState('')
    const [nomeOriginal, setNomeOriginal] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [faqAberta, setFaqAberta] = useState<number | null>(0)

    // Preferências de Gosto (#139)
    const [generosFavoritos, setGenerosFavoritos] = useState<string[]>([])
    const [generosBloqueados, setGenerosBloqueados] = useState<string[]>([])
    const [salvandoGosto, setSalvandoGosto] = useState(false)

    // Importador MyAnimeList (#140)
    const [xmlConteudo, setXmlConteudo] = useState<string>('')
    const [nomeArquivoMal, setNomeArquivoMal] = useState<string>('')
    const [previaMal, setPreviaMal] = useState<{
        total: number
        completo: number
        assistindo: number
        queroAssistir: number
        dropado: number
        episodios: number
    } | null>(null)
    const [importarNotas, setImportarNotas] = useState(true)
    const [ignorarDuplicados, setIgnorarDuplicados] = useState(true)
    const [importandoMal, setImportandoMal] = useState(false)
    const [erroMal, setErroMal] = useState<string | null>(null)
    const [resultadoMal, setResultadoMal] = useState<{
        importados: number
        atualizados: number
        ignorados: number
        episodios_registrados: number
    } | null>(null)


    const [temGoogle, setTemGoogle] = useState(false)
    const [temSenha, setTemSenha] = useState(true)
    const [senhaAtual, setSenhaAtual] = useState('')
    const [novaSenha, setNovaSenha] = useState('')
    const [salvandoSenha, setSalvandoSenha] = useState(false)
    const [erroSenha, setErroSenha] = useState<string | null>(null)

    const podeTrocarSenha = senhaAtual.length > 0 && novaSenha.length >= 8 && !salvandoSenha

    const navigate = useNavigate()
    const [modalExclusao, setModalExclusao] = useState(false)
    const [senhaExclusao, setSenhaExclusao] = useState('')
    const [confirmacao, setConfirmacao] = useState('')
    const [excluindo, setExcluindo] = useState(false)
    const [erroExclusao, setErroExclusao] = useState<string | null>(null)

    const podeExcluir = confirmacao === 'EXCLUIR' && (temSenha ? senhaExclusao.length > 0 : true) && !excluindo

        const excluirConta = async () => {
        setExcluindo(true)
        setErroExclusao(null)

        // Conta com senha reautentica aqui; conta só-Google já voltou do
        // redirect com autenticação fresca. O backend confere os dois pelo amr.
        if (temSenha) {
            const { error: erroLogin } = await supabase.auth.signInWithPassword({
                email,
                password: senhaExclusao,
            })
            if (erroLogin) {
                setErroExclusao('Senha incorreta.')
                setExcluindo(false)
                return
            }
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            setErroExclusao('Sessão expirada. Entre de novo e tente outra vez.')
            setExcluindo(false)
            return
        }

        try {
            const res = await fetch('/api/account', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${session.access_token}` },
            })
            if (!res.ok) {
                setErroExclusao(res.status === 401
                    ? 'Confirmação expirada. Confirme sua identidade de novo.'
                    : 'Não foi possível excluir a conta. Tente de novo.')
                setExcluindo(false)
                return
            }
        } catch {
            setErroExclusao('Não foi possível excluir a conta. Tente de novo.')
            setExcluindo(false)
            return
        }

        await supabase.auth.signOut()
        navigate('/')
    }

    const reautenticarComGoogle = async () => {
        setErroExclusao(null)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/configuracoes?reauth=1#conta`,
                queryParams: { prompt: 'select_account' },
            },
        })
        if (error) {
            setErroExclusao('Não foi possível confirmar com o Google. Tente de novo.')
        }
    }

    // O login com Google recarrega a página inteira, então o modal se perde no
    // caminho. O marcador na URL manda reabrir na volta.
    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('reauth') === '1') {
            setModalExclusao(true)
        }
    }, [])

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const uid = session?.user.id || ''
            const nomeAtual = session?.user.user_metadata?.display_name || ''
            setUserId(uid)
            setEmail(session?.user.email || '')
            setNome(nomeAtual)
            setNomeOriginal(nomeAtual)
            setTemGoogle(session?.user.app_metadata?.providers?.includes('google') ?? false)
            setTemSenha(session?.user.app_metadata?.providers?.includes('email') ?? true)
            const prefs = lerPreferenciasDeGosto(uid, session?.user.user_metadata)
            setGenerosFavoritos(prefs.favoritos)
            setGenerosBloqueados(prefs.bloqueados)
            setCarregando(false)
        })
    }, [])

    const opcoesGeneros = rotulos.length > 0
        ? rotulos.filter(r => r.camada === 'genero' || r.camada === 'demografia').map(r => r.nome)
        : [
            'Ação', 'Aventura', 'Comédia', 'Drama', 'Fantasia', 'Ficção Científica',
            'Mistério', 'Psicológico', 'Romance', 'Slice of Life', 'Sobrenatural',
            'Suspense', 'Esportes', 'Mecha', 'Isekai', 'Shounen', 'Seinen', 'Shoujo',
        ]

    const alternarGeneroFavorito = (g: string) => {
        setGenerosBloqueados(prev => prev.filter(item => item !== g))
        setGenerosFavoritos(prev => prev.includes(g) ? prev.filter(item => item !== g) : [...prev, g])
    }

    const alternarGeneroBloqueado = (g: string) => {
        setGenerosFavoritos(prev => prev.filter(item => item !== g))
        setGenerosBloqueados(prev => prev.includes(g) ? prev.filter(item => item !== g) : [...prev, g])
    }

    const salvarGosto = async () => {
        if (!userId) return
        setSalvandoGosto(true)
        try {
            await salvarPreferenciasDeGosto(userId, {
                favoritos: generosFavoritos,
                bloqueados: generosBloqueados,
                tutorialConcluido: true,
            })
            removerDaMemoria(chaveDoUsuario(userId, 'inicio'))
            showToast('Preferências de gosto salvas!', 'success')
        } catch {
            showToast('Erro ao salvar preferências de gosto.', 'error')
        } finally {
            setSalvandoGosto(false)
        }
    }

    const lerArquivoMal = async (file: File) => {
        setErroMal(null)
        setResultadoMal(null)
        setPreviaMal(null)
        setNomeArquivoMal(file.name)

        try {
            let texto = ''
            if (file.name.endsWith('.gz')) {
                if ('DecompressionStream' in window) {
                    const ds = new DecompressionStream('gzip')
                    const decompressedStream = file.stream().pipeThrough(ds)
                    texto = await new Response(decompressedStream).text()
                } else {
                    setErroMal('Seu navegador não descompacta .gz diretamente. Extraia o arquivo .xml antes de enviar.')
                    return
                }
            } else {
                texto = await file.text()
            }

            const parser = new DOMParser()
            const doc = parser.parseFromString(texto, 'text/xml')
            const nodes = Array.from(doc.getElementsByTagName('anime'))
            if (nodes.length === 0) {
                setErroMal('Nenhum anime encontrado neste arquivo XML.')
                return
            }

            let completo = 0
            let assistindo = 0
            let queroAssistir = 0
            let dropado = 0
            let episodios = 0
            const vistos = new Set<number>()

            for (const n of nodes) {
                const malId = Number(n.getElementsByTagName('series_animedb_id')[0]?.textContent || '0')
                const status = (n.getElementsByTagName('my_status')[0]?.textContent || '').trim()
                const eps = Number(n.getElementsByTagName('my_watched_episodes')[0]?.textContent || '0')
                if (!malId || vistos.has(malId)) continue
                if (status === 'Completed') completo++
                else if (status === 'Watching') assistindo++
                else if (status === 'Plan to Watch' || status === 'On-Hold') queroAssistir++
                else if (status === 'Dropped') dropado++
                else continue

                vistos.add(malId)
                if (eps > 0) episodios += eps
            }

            if (vistos.size === 0) {
                setErroMal('Não foi possível identificar animes válidos do MyAnimeList neste XML.')
                return
            }

            setXmlConteudo(texto)
            setPreviaMal({
                total: vistos.size,
                completo,
                assistindo,
                queroAssistir,
                dropado,
                episodios,
            })
        } catch {
            setErroMal('Falha ao ler o arquivo XML. Verifique se é um export válido do MyAnimeList.')
        }
    }

    const confirmarImportacaoMal = async () => {
        if (!xmlConteudo) return
        setImportandoMal(true)
        setErroMal(null)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                setErroMal('Sessão expirada. Faça login novamente.')
                return
            }

            const res = await fetch('/api/entries/import/mal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    xml: xmlConteudo,
                    importar_notas: importarNotas,
                    ignorar_duplicados: ignorarDuplicados,
                }),
            })

            if (!res.ok) {
                const msg = await res.text()
                setErroMal(msg || 'Falha ao importar lista.')
                return
            }

            const dados = await res.json()
            setResultadoMal(dados)
            invalidarCachesDoDeck(session.user.id)
            removerDaMemoria(chaveDoUsuario(session.user.id, 'estatisticas'))
            showToast(`${dados.importados} animes importados com sucesso!`, 'success')
        } catch {
            setErroMal('Erro de conexão durante a importação.')
        } finally {
            setImportandoMal(false)
        }
    }

    const nomeMudou = nome.trim() !== nomeOriginal
    const nomeValido = nome.trim().length >= 2

    const salvarPerfil = async () => {
        setSalvando(true)
        setErro(null)

        // O updateUser dispara onAuthStateChange, que a Navbar e o MeuDeck já
        // escutam. Por isso o nome novo aparece nos dois sem recarregar a página
        // e sem precisar de nenhum estado global aqui.
        const { error } = await supabase.auth.updateUser({
            data: { display_name: nome.trim() },
        })

        if (error) {
            setErro('Não foi possível salvar. Tente de novo.')
            setSalvando(false)
            return
        }

        setNomeOriginal(nome.trim())
        setSalvando(false)
        showToast('Perfil atualizado!')
    }

       const atualizarSenha = async () => {
        setSalvandoSenha(true)
        setErroSenha(null)

        // current_password é validado pelo GoTrue, no servidor — depende do
        // toggle "Require current password when updating", ligado no painel.
        const { error } = await supabase.auth.updateUser({
            current_password: senhaAtual,
            password: novaSenha,
        })

        if (error) {
            setErroSenha(
                error.status === 401 || error.status === 422
                    ? 'Senha atual incorreta.'
                    : 'Não foi possível atualizar a senha. Tente de novo.'
            )
            setSalvandoSenha(false)
            return
        }

        setSenhaAtual('')
        setNovaSenha('')
        setSalvandoSenha(false)
        showToast('Senha atualizada!')
    }

    const inicial = (nome || 'U').charAt(0).toUpperCase()

    return (
        <div className="max-w-[760px] w-full mx-auto px-5 pb-20">
            <h1 className="font-anton text-[clamp(1.6rem,3.6vw,2.2rem)] uppercase mb-6 select-none">
                Configurações <span className="text-holo">&amp; Ajuda</span>
            </h1>

            {/* Âncoras em vez de abas com estado: o conteúdo todo cabe numa página
                só, e link de âncora funciona com voltar do navegador e link direto. */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 mb-2 select-none">
                {ABAS.map((aba) => (
                    <a
                        key={aba.id}
                        href={`#${aba.id}`}
                        className="shrink-0 whitespace-nowrap text-[13px] font-bold px-4 py-2 rounded-full border border-line bg-panel text-muted hover:border-holo-3 hover:text-text transition-colors"
                    >
                        {aba.label}
                    </a>
                ))}
            </div>

            {/* PERFIL */}
            <Secao id="perfil" titulo="Perfil">
                <Card>
                    <EmBreve nota="Precisa de armazenamento de imagens">
                        <div className="flex items-center gap-4 pb-5 mb-5 border-b border-line">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-holo-2 to-holo-3 flex items-center justify-center text-void font-anton text-2xl">
                                {inicial}
                            </div>
                            <button type="button" className="px-4 py-2 rounded-xl border border-line text-[13px] font-bold text-muted">
                                Trocar foto
                            </button>
                        </div>
                    </EmBreve>

                    <label htmlFor="nome" className="block text-[11px] font-bold text-muted mb-2 uppercase tracking-wide select-none">
                        Nome de exibição
                    </label>
                    <input
                        id="nome"
                        type="text"
                        value={nome}
                        maxLength={30}
                        disabled={carregando}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder={carregando ? 'Carregando...' : 'Como você quer ser chamado'}
                        className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm mb-1 outline-none focus:border-holo-3 transition-colors disabled:opacity-50"
                    />
                    <p className="text-[11px] text-muted-2 mb-4">
                        Aparece na saudação do seu Deck e no topo do site.
                    </p>

                    <label htmlFor="email" className="block text-[11px] font-bold text-muted mb-2 uppercase tracking-wide select-none">
                        E-mail
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        readOnly
                        className="w-full bg-panel-2/50 border border-line rounded-xl px-4 py-3 text-sm text-muted cursor-not-allowed outline-none"
                    />
                    <p className="text-[11px] text-muted-2 mt-1">
                        Trocar o e-mail exige confirmação nos dois endereços. Ainda não disponível.
                    </p>

                    {erro && <p className="text-coral text-xs font-bold mt-4">{erro}</p>}

                    <div className="mt-5">
                        <button
                            type="button"
                            onClick={salvarPerfil}
                            disabled={salvando || !nomeMudou || !nomeValido}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-holo-1 to-holo-2 text-void text-sm font-extrabold cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
                        >
                            {salvando ? (
                                <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
                            ) : (
                                'Salvar alterações'
                            )}
                        </button>
                    </div>
                </Card>
            </Secao>

            {/* PREFERÊNCIAS DE GOSTO (#139) */}
            <Secao id="gosto" titulo="Preferências de Gosto">
                <Card>
                    <div className="flex items-center gap-2 text-holo-2 text-xs font-bold uppercase tracking-wider mb-1">
                        <Sparkles size={14} /> Recomendações da Página Inicial
                    </div>
                    <p className="text-[12.5px] text-muted mb-5">
                        Escolha seus gêneros e demografias favoritos para priorizar nas sugestões da sua Home, ou marque gêneros que você prefere ocultar das recomendações.
                    </p>

                    <div className="mb-5">
                        <label className="block text-[11px] font-bold text-text mb-2.5 uppercase tracking-wide">
                            Gêneros Favoritos ({generosFavoritos.length})
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {opcoesGeneros.map(g => {
                                const ativo = generosFavoritos.includes(g)
                                return (
                                    <button
                                        key={`fav-${g}`}
                                        type="button"
                                        onClick={() => alternarGeneroFavorito(g)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                                            ativo
                                                ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void border-transparent'
                                                : 'bg-panel-2 border-line text-muted hover:border-holo-2 hover:text-text'
                                        }`}
                                    >
                                        {ativo && <Check size={12} />}
                                        {g}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-line mb-5">
                        <label className="block text-[11px] font-bold text-muted mb-1 uppercase tracking-wide">
                            Gêneros Ocultos / Bloqueados ({generosBloqueados.length})
                        </label>
                        <p className="text-[11px] text-muted-2 mb-2.5">
                            Obras com esses gêneros nunca serão sugeridas no trilho Recomendados para Você.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {opcoesGeneros.map(g => {
                                const bloqueado = generosBloqueados.includes(g)
                                return (
                                    <button
                                        key={`bloq-${g}`}
                                        type="button"
                                        onClick={() => alternarGeneroBloqueado(g)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                                            bloqueado
                                                ? 'bg-coral/15 border-coral/40 text-coral'
                                                : 'bg-panel-2 border-line text-muted-2 hover:text-muted'
                                        }`}
                                    >
                                        {bloqueado && <Ban size={11} />}
                                        {g}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={salvarGosto}
                        disabled={salvandoGosto}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-holo-1 to-holo-2 text-void text-sm font-extrabold cursor-pointer hover:opacity-90 disabled:opacity-40"
                    >
                        {salvandoGosto ? 'Salvando...' : 'Salvar preferências de gosto'}
                    </button>
                </Card>
            </Secao>

            {/* IMPORTAR LISTA (#140) */}
            <Secao id="importar" titulo="Importar Lista (MyAnimeList)">
                <Card>
                    <p className="text-[12.5px] text-muted mb-4">
                        Traga sua lista do <strong className="text-text">MyAnimeList</strong> (arquivo <code className="text-holo-3">.xml</code> ou <code className="text-holo-3">.xml.gz</code> exportado do MAL). Os episódios já assistidos entram no cálculo do seu <strong className="text-text">Tempo Assistido</strong> sem alterar seu Streak ou Padrão de Horário.
                    </p>

                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-line hover:border-holo-3 rounded-2xl p-6 bg-panel-2/50 cursor-pointer transition-colors">
                        <Upload size={22} className="text-holo-3" />
                        <span className="text-xs font-bold text-text">
                            {nomeArquivoMal ? `Arquivo selecionado: ${nomeArquivoMal}` : 'Clique para selecionar seu arquivo .xml ou .xml.gz'}
                        </span>
                        <span className="text-[11px] text-muted-2">Export padrão do MyAnimeList (até 10 MB)</span>
                        <input
                            type="file"
                            accept=".xml,.gz,application/xml,text/xml,application/gzip"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) lerArquivoMal(file)
                            }}
                        />
                    </label>

                    {erroMal && (
                        <p className="mt-3 text-xs font-bold text-coral">{erroMal}</p>
                    )}

                    {previaMal && (
                        <div className="mt-5 p-4 rounded-xl bg-panel-2 border border-line space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-holo-3">
                                <FileText size={14} /> Prévia da Importação ({previaMal.total} animes)
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                                <div className="bg-panel border border-line rounded-lg p-2.5">
                                    <div className="font-anton text-lg text-gold tabular-nums">{previaMal.completo}</div>
                                    <div className="text-[10px] font-mono text-muted-2 uppercase">Completo</div>
                                </div>
                                <div className="bg-panel border border-line rounded-lg p-2.5">
                                    <div className="font-anton text-lg text-holo-3 tabular-nums">{previaMal.assistindo}</div>
                                    <div className="text-[10px] font-mono text-muted-2 uppercase">Assistindo</div>
                                </div>
                                <div className="bg-panel border border-line rounded-lg p-2.5">
                                    <div className="font-anton text-lg text-holo-1 tabular-nums">{previaMal.queroAssistir}</div>
                                    <div className="text-[10px] font-mono text-muted-2 uppercase">Quero Assistir</div>
                                </div>
                                <div className="bg-panel border border-line rounded-lg p-2.5">
                                    <div className="font-anton text-lg text-muted tabular-nums">{previaMal.dropado}</div>
                                    <div className="text-[10px] font-mono text-muted-2 uppercase">Dropado</div>
                                </div>
                                <div className="bg-panel border border-line rounded-lg p-2.5 col-span-2 sm:col-span-1">
                                    <div className="font-anton text-lg text-green tabular-nums">{previaMal.episodios}</div>
                                    <div className="text-[10px] font-mono text-muted-2 uppercase">Episódios</div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <label className="inline-flex items-center gap-2 text-xs font-bold text-text cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={importarNotas}
                                        onChange={(e) => setImportarNotas(e.target.checked)}
                                        className="accent-holo-2 w-4 h-4 rounded"
                                    />
                                    Importar minhas notas (1–10)
                                </label>
                                <label className="inline-flex items-center gap-2 text-xs font-bold text-text cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={ignorarDuplicados}
                                        onChange={(e) => setIgnorarDuplicados(e.target.checked)}
                                        className="accent-holo-2 w-4 h-4 rounded"
                                    />
                                    Ignorar animes que já estão no meu Deck
                                </label>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={confirmarImportacaoMal}
                                    disabled={importandoMal}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-holo-1 to-holo-2 text-void text-xs font-extrabold uppercase tracking-wider cursor-pointer hover:opacity-95 disabled:opacity-40"
                                >
                                    {importandoMal ? 'Importando sua lista...' : `Confirmar Importação (${previaMal.total} animes)`}
                                </button>
                            </div>
                        </div>
                    )}

                    {resultadoMal && (
                        <div className="mt-4 p-4 rounded-xl bg-green/10 border border-green/30 text-xs space-y-1">
                            <p className="font-bold text-green text-sm">Importação concluída!</p>
                            <p className="text-text">
                                <strong>{resultadoMal.importados}</strong> novos animes adicionados •{' '}
                                <strong>{resultadoMal.atualizados}</strong> atualizados •{' '}
                                <strong>{resultadoMal.ignorados}</strong> já existentes mantidos •{' '}
                                <strong>{resultadoMal.episodios_registrados}</strong> episódios contabilizados.
                            </p>
                            <Link to="/deck" className="inline-block mt-2 font-bold text-holo-3 hover:underline">
                                Ir para o Meu Deck →
                            </Link>
                        </div>
                    )}
                </Card>
            </Secao>

            {/* APARÊNCIA */}
            <Secao id="aparencia" titulo="Aparência">
                <Card>
                    <p className="text-[12.5px] text-muted mb-4">
                        Escolha a paleta de cores do AniDeck.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        {TEMAS.map((tema) => (
                            <button
                                key={tema.id}
                                type="button"
                                onClick={() => aplicarTema(tema.id)}
                                aria-pressed={tema.id === temaAtivo}
                                className={`text-left cursor-pointer rounded-xl border p-3.5 transition-colors ${tema.id === temaAtivo ? 'border-holo-2 bg-holo-2/10' : 'border-line bg-panel-2 hover:border-muted-2'}`}
                            >
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="text-[13px] font-bold">{tema.nome}</span>
                                    {tema.id === temaAtivo && <Check size={14} className="text-holo-2" />}
                                </div>
                                <div className="flex gap-1.5 mb-2">
                                    {tema.cores.map((c) => (
                                        <div key={c} className="w-5 h-5 rounded-full border border-white/10" style={{ background: c }} />
                                    ))}
                                </div>
                                <span className="text-[11px] text-muted-2">{tema.desc}</span>
                            </button>
                        ))}
                    </div>
                </Card>
            </Secao>

            {/* NOTIFICAÇÕES */}
            <Secao id="notificacoes" titulo="Notificações">
                <EmBreve nota="Precisa de preferências salvas por usuário">
                    <Card>
                        <LinhaToggle
                            titulo="Episódio novo lançado"
                            desc="Avisar quando sair episódio de algo que você está assistindo"
                            ligado
                        />
                        <LinhaToggle
                            titulo="Nova temporada anunciada"
                            desc="Avisar quando uma sequência sair pra algo no seu Deck"
                            ligado
                        />
                        <LinhaToggle
                            titulo="Resumo semanal por e-mail"
                            desc="Um resumo do que rolou no seu Deck, toda semana"
                        />
                    </Card>
                </EmBreve>
            </Secao>

              {/* CONTA */}
            <Secao id="conta" titulo="Conta">
                <Card className="mb-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 text-[13.5px] font-bold">
                            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                                <path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3h3.87c2.27-2.09 3.56-5.17 3.56-8.74z" />
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.1C3.26 21.3 7.3 24 12 24z" />
                                <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.5-.38-2.29s.14-1.57.38-2.29V6.61H1.28A11.98 11.98 0 000 12c0 1.93.46 3.76 1.28 5.39l4-3.1z" />
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.28 6.61l4 3.1c.95-2.86 3.6-4.96 6.73-4.96z" />
                            </svg>
                            Conta Google
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-1 ${
                            temGoogle ? 'text-holo-3 border-holo-3/40' : 'text-muted-2 border-line'
                        }`}>
                            {temGoogle ? 'Conectada' : 'Não conectada'}
                        </span>
                    </div>

                    {!temGoogle && (
                        <p className="text-[12.5px] text-muted mt-3">
                            Entre com o Google usando este mesmo e-mail e as contas se juntam automaticamente.
                        </p>
                    )}
                </Card>

                {!temSenha && (
                    <Card className="mb-4">
                        <p className="text-[12.5px] text-muted">
                            Esta conta entra pelo Google e não tem senha definida.
                        </p>
                    </Card>
                )}

                {temSenha && (
                    <Card className="mb-4">
                        <label className="block text-[11px] font-bold text-muted mb-2 uppercase tracking-wide">Senha atual</label>
                        <input
                            type="password"
                            value={senhaAtual}
                            onChange={(e) => setSenhaAtual(e.target.value)}
                            autoComplete="current-password"
                            className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm outline-none"
                        />

                        <label className="block text-[11px] font-bold text-muted mb-2 mt-4 uppercase tracking-wide">Nova senha</label>
                        <input
                            type="password"
                            value={novaSenha}
                            onChange={(e) => setNovaSenha(e.target.value)}
                            autoComplete="new-password"
                            placeholder="Mínimo de 8 caracteres"
                            className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm outline-none"
                        />

                        {erroSenha && (
                            <p className="mt-2 text-[12.5px] text-coral">{erroSenha}</p>
                        )}

                        <button
                            type="button"
                            onClick={atualizarSenha}
                            disabled={!podeTrocarSenha}
                            className="mt-3.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-holo-1 to-holo-2 text-void text-sm font-extrabold disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {salvandoSenha ? 'Salvando...' : 'Atualizar senha'}
                        </button>
                    </Card>
                )}

                <div className="border border-coral/30 bg-coral/5 rounded-2xl p-5">
                    <h3 className="font-anton text-coral uppercase text-[15px] mb-1.5 flex items-center gap-2">
                        <AlertTriangle size={15} />
                        Excluir conta
                    </h3>
                    <p className="text-[12.5px] text-muted mb-4">
                        Remove permanentemente sua conta e todos os dados do seu Deck. Não pode ser desfeito.
                    </p>

                    {!modalExclusao ? (
                        <button
                            type="button"
                            onClick={() => setModalExclusao(true)}
                            className="px-4 py-2.5 rounded-xl border border-coral bg-coral/10 text-coral text-sm font-bold cursor-pointer"
                        >
                            Excluir minha conta
                        </button>
                    ) : (
                        <div className="space-y-3">
                                                      {temSenha ? (
                                <div>
                                    <label className="block text-[11px] font-bold text-muted mb-2 uppercase tracking-wide">
                                        Sua senha
                                    </label>
                                    <input
                                        type="password"
                                        value={senhaExclusao}
                                        onChange={(e) => setSenhaExclusao(e.target.value)}
                                        autoComplete="current-password"
                                        className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm outline-none"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[11px] font-bold text-muted mb-2 uppercase tracking-wide">
                                        Confirme sua identidade
                                    </label>
                                    <button
                                        type="button"
                                        onClick={reautenticarComGoogle}
                                        className="px-4 py-2.5 rounded-xl border border-line bg-panel-2 text-sm font-bold cursor-pointer"
                                    >
                                        Confirmar com Google
                                    </button>
                                    <p className="text-[12px] text-muted-2 mt-2">
                                        Você volta para esta tela depois de confirmar.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-[11px] font-bold text-muted mb-2 uppercase tracking-wide">
                                    Digite <span className="text-coral">EXCLUIR</span> para confirmar
                                </label>
                                <input
                                    type="text"
                                    value={confirmacao}
                                    onChange={(e) => setConfirmacao(e.target.value)}
                                    autoComplete="off"
                                    className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm outline-none"
                                />
                            </div>

                            {erroExclusao && (
                                <p className="text-[12.5px] text-coral font-bold">{erroExclusao}</p>
                            )}

                            <div className="flex gap-2.5">
                                <button
                                    type="button"
                                    onClick={excluirConta}
                                    disabled={!podeExcluir}
                                    className="px-4 py-2.5 rounded-xl border border-coral bg-coral/10 text-coral text-sm font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {excluindo ? 'Excluindo...' : 'Excluir definitivamente'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModalExclusao(false)
                                        setSenhaExclusao('')
                                        setConfirmacao('')
                                        setErroExclusao(null)
                                    }}
                                    disabled={excluindo}
                                    className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold cursor-pointer"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Secao>

            {/* AJUDA */}
            <Secao id="ajuda" titulo="Ajuda">
                <div className="space-y-2.5 mb-5">
                    {FAQ.map((item, i) => (
                        <div key={i} className="bg-panel border border-line rounded-2xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setFaqAberta(faqAberta === i ? null : i)}
                                aria-expanded={faqAberta === i}
                                className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 text-[13.5px] font-bold cursor-pointer hover:text-holo-3 transition-colors"
                            >
                                {item.p}
                                <ChevronDown
                                    size={15}
                                    className={`shrink-0 text-muted transition-transform ${faqAberta === i ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {faqAberta === i && (
                                <p className="px-5 pb-4 text-[12.5px] leading-relaxed text-muted">{item.r}</p>
                            )}
                        </div>
                    ))}
                </div>

                {/*
                  O CatalogoStatusContext guarda estado de sessão: ele só sabe de
                  falhas que OUTRA tela reportou, e zera ao recarregar. Esta página
                  não busca catálogo, então não tem como diagnosticar nada sozinha.
                  Por isso o texto fala de "nesta sessão" em vez de afirmar que a
                  fonte está no ar — seria uma promessa que o dado não sustenta.
                */}
                <div className={`rounded-2xl border px-5 py-4 mb-5 ${indisponivel ? 'border-gold/40 bg-gold/10' : 'border-line bg-panel'}`}>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1 select-none">
                        Fonte externa de catálogo
                    </div>
                    <p className={`text-[13px] font-bold ${indisponivel ? 'text-gold' : 'text-text'}`}>
                        {indisponivel
                            ? 'Instabilidade detectada nesta sessão'
                            : 'Nenhuma falha registrada nesta sessão'}
                    </p>
                    <p className="text-[11.5px] text-muted-2 mt-1">
                        Capas e títulos vêm da AniList. Seu Deck, suas notas e seu progresso
                        ficam salvos aqui e não dependem dela.
                    </p>
                </div>

                <div className="flex items-center gap-3.5 bg-panel border border-line rounded-2xl px-5 py-4">
                    <div className="w-9 h-9 rounded-full bg-panel-2 border border-line flex items-center justify-center text-holo-3 shrink-0">
                        <MessageSquare size={17} />
                    </div>
                    <div>
                        <div className="text-[13.5px] font-bold">Precisa de mais alguma coisa?</div>
                        <a href={`mailto:${EMAIL_SUPORTE}`} className="text-[12.5px] text-holo-3 hover:underline">
                            {EMAIL_SUPORTE}
                        </a>
                    </div>
                </div>

                                <div className="text-center mt-8">
                    <Link to="/privacidade" className="text-[12.5px] font-bold text-holo-3 hover:underline">
                        Política de Privacidade
                    </Link>
                    <p className="text-[11px] text-muted-2 mt-3 select-none">AniDeck v{VERSAO}</p>
                </div>
            </Secao>
        </div>
    )
}