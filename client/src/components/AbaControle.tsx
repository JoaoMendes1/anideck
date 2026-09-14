import { useState, useMemo } from 'react'
import {
  Activity, PowerOff, RefreshCw, Tags, HardDrive, Trophy,
  ChevronDown, ExternalLink, AlertTriangle, Plus, Search, Trash2,
} from 'lucide-react'
import { useControle, type RotuloOrfao } from '../hooks/useControle'
import { useTaxonomia, normalizar, CAMADAS, type Camada } from '../hooks/useTaxonomia'
import { useToast } from '../contexts/ToastContext'

type Props = {
  apiHealth: 'OK' | 'WARNING' | 'OFFLINE'
  forceOffline: boolean
  onToggleKillSwitch: () => void
  onResync: () => void
  resyncRodando: boolean
  onAbrirCuradoria?: (curatedId: string) => void
}

const SECOES = [
  { id: 'anilist', nome: 'AniList' },
  { id: 'ranking', nome: 'Ranking' },
  { id: 'rotulos', nome: 'Rótulos' },
  { id: 'diagnostico', nome: 'Diagnóstico' },
] as const

type SecaoId = typeof SECOES[number]['id']

// O bucket não tem limite no banco (snapshot, seção [6]); 1 GB é o teto do plano
// Free e existe aqui só como referência no texto.
const TETO_BUCKET_BYTES = 1024 * 1024 * 1024

const formatarBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < TETO_BUCKET_BYTES) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / TETO_BUCKET_BYTES).toFixed(2)} GB`
}

// O servidor manda o instante em UTC e a conversão para o fuso de quem olha
// acontece aqui, no navegador — é o único lugar que sabe qual é esse fuso
// (item 3 do PITFALLS.md).
const formatarInstante = (iso: string) => {
  if (!iso) return 'nunca'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'nunca'
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function AbaControle({
  apiHealth, forceOffline, onToggleKillSwitch, onResync, resyncRodando, onAbrirCuradoria,
}: Props) {
  const { showToast } = useToast()
  const {
    ranking, orfaos, bucket,
    carregando, erro, carregar,
    salvarPeso, salvandoPeso,
    recalcular, recalculando,
    testarAniList, testando, testeAniList,
    animesPorRotulo, carregandoRotulo, carregarAnimesDoRotulo,
    cadastrarNaTaxonomia, renomearTag, removerTag,
    removerDaTaxonomia, aplicando,
  } = useControle()

  const { rotulos, carregando: carregandoTaxonomia, recarregar: recarregarTaxonomia } = useTaxonomia()

  const [secao, setSecao] = useState<SecaoId>('anilist')
  const [pesoInput, setPesoInput] = useState('')

  // ---------- Seção Rótulos ----------
  const [busca, setBusca] = useState('')
  const [novoRaw, setNovoRaw] = useState('')
  const [novoDisplay, setNovoDisplay] = useState('')
  const [novaCamada, setNovaCamada] = useState<Camada>('tag_tematica')
  const [novoSinonimo, setNovoSinonimo] = useState('')
  const [formAberto, setFormAberto] = useState(false)

  // ---------- Seção Diagnóstico ----------
  const [aberto, setAberto] = useState<string | null>(null)
  const [destinoRenomear, setDestinoRenomear] = useState('')

  type Confirmacao =
    | { tipo: 'renomear'; rotulo: RotuloOrfao; destino: string }
    | { tipo: 'remover'; rotulo: RotuloOrfao }
    | { tipo: 'remover-taxonomia'; rawName: string; display: string; emUso: number }
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null)

  // O campo nasce vazio e só é preenchido quando o usuário digita: usar o valor do
  // servidor como estado inicial faria o input travar no primeiro render, antes de
  // a chamada voltar. Vazio significa "mostre o que está salvo".
  const pesoExibido = pesoInput !== '' ? pesoInput : (ranking ? String(ranking.peso_voto_comunitario) : '')

  const handleSalvarPeso = async () => {
    const valor = Number(pesoExibido)
    if (!Number.isFinite(valor) || valor <= 0) {
      showToast('O peso precisa ser um número maior que zero.', 'error')
      return
    }
    const problema = await salvarPeso(valor)
    if (problema) { showToast(problema, 'error'); return }
    setPesoInput('')
    showToast('Peso salvo. O ranking está sendo recalculado — leva ~20s.', 'success')
  }

  const handleRecalcular = async () => {
    const ok = await recalcular()
    showToast(
      ok ? 'Recálculo iniciado. Leva cerca de 20 segundos.' : 'Não foi possível iniciar o recálculo.',
      ok ? 'success' : 'error',
    )
  }

  // ---------- Rótulos: busca e agrupamento por camada ----------
  const rotulosFiltrados = useMemo(() => {
    const termo = normalizar(busca)
    if (!termo) return rotulos
    return rotulos.filter(r =>
      normalizar(r.display).includes(termo) ||
      r.entradas.some(e => normalizar(e).includes(termo)),
    )
  }, [rotulos, busca])

  const porCamada = useMemo(() => {
    const m = new Map<Camada, typeof rotulosFiltrados>()
    for (const c of CAMADAS) m.set(c.id, [])
    for (const r of rotulosFiltrados) m.get(r.tier)?.push(r)
    return m
  }, [rotulosFiltrados])

  const handleCriarRotulo = async () => {
    const raw = novoRaw.trim()
    const display = (novoDisplay.trim() || raw)
    if (!raw) { showToast('Informe o texto de entrada.', 'error'); return }
    const problema = await cadastrarNaTaxonomia(raw, display, novaCamada, novoSinonimo)
    if (problema) { showToast(problema, 'error'); return }

    await recarregarTaxonomia()
    setNovoRaw(''); setNovoDisplay(''); setNovoSinonimo(''); setFormAberto(false)
    showToast(`"${raw}" cadastrado como "${display}".`, 'success')
  }

  // ---------- Diagnóstico: abrir um rótulo órfão ----------
  const alternarRotulo = (r: RotuloOrfao) => {
    if (aberto === r.raw_name) { setAberto(null); return }
    setAberto(r.raw_name)
    setDestinoRenomear('')
    carregarAnimesDoRotulo(r.raw_name)
  }

  // Renomear só aceita rótulo que EXISTE. Campo livre aqui seria trocar um erro
  // de digitação por outro, que é o defeito que esta tela veio corrigir.
  const sugestoesRenomear = useMemo(() => {
    const termo = normalizar(destinoRenomear)
    const validos = rotulos.filter(r => r.tier !== 'ignorado')
    if (!termo) return validos.slice(0, 6)
    return validos
      .filter(r => normalizar(r.display).includes(termo))
      .slice(0, 6)
  }, [destinoRenomear, rotulos])

  const aplicarConfirmacao = async () => {
    if (!confirmacao) return

    if (confirmacao.tipo === 'remover-taxonomia') {
      // A função devolve string no erro e {em_uso} no sucesso — o typeof separa os
      // dois. Tratar tudo como string faria o sucesso cair no caminho de erro.
      const resposta = await removerDaTaxonomia(confirmacao.rawName, true)
      setConfirmacao(null)
      if (typeof resposta === 'string') { showToast(resposta, 'error'); return }
      await recarregarTaxonomia()
      showToast(`"${confirmacao.rawName}" removido da taxonomia.`, 'success')
      return
    }

    const resultado = confirmacao.tipo === 'renomear'
      ? await renomearTag(confirmacao.rotulo.raw_name, confirmacao.destino)
      : await removerTag(confirmacao.rotulo.raw_name)

    setConfirmacao(null)
    setAberto(null)

    if (typeof resultado === 'string') { showToast(resultado, 'error'); return }

    showToast(
      confirmacao.tipo === 'renomear'
        ? `${resultado.afetados} anime(s) atualizados.`
        : `"${confirmacao.rotulo.raw_name}" removida de ${resultado.afetados} anime(s).`,
      'success',
    )
  }

  // Pergunta ao servidor quantos animes usam o rótulo ANTES de apagar: remover uma
  // entrada joga esses animes de volta para 'ignorado' e eles somem dos gráficos.
  const pedirRemocaoTaxonomia = async (rawName: string, display: string) => {
    const resposta = await removerDaTaxonomia(rawName, false)
    if (typeof resposta === 'string') { showToast(resposta, 'error'); return }
    setConfirmacao({ tipo: 'remover-taxonomia', rawName, display, emUso: resposta.em_uso })
  }

  const temDaCuradoria = orfaos.some(o => o.veio_de_curadoria)
  const temDaAniList = orfaos.some(o => !o.veio_de_curadoria)

  return (
    <div className="min-w-0">
      {/* ---------- Faixa de estado ---------- */}
      <section
        aria-label="Estado do sistema"
        className="bg-panel border border-line rounded-2xl p-5 mb-6 grid gap-5 md:grid-cols-3"
      >
        <div className="flex gap-3 items-start">
          <span className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${forceOffline || apiHealth === 'OFFLINE' ? 'bg-coral' : apiHealth === 'WARNING' ? 'bg-gold' : 'bg-green'
            }`} />
          <div className="min-w-0">
            <h3 className="font-anton text-base uppercase">
              {forceOffline ? 'AniList desligada' : apiHealth === 'OFFLINE' ? 'AniList fora do ar' : 'AniList no ar'}
            </h3>
            <p className="text-muted text-[13px] mt-0.5">
              {forceOffline ? 'Kill Switch ativo. A busca serve só curadoria e cache.' : `Saúde passiva: ${apiHealth}.`}
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-start">
          <span className="w-2.5 h-2.5 rounded-full mt-2 shrink-0 bg-muted-2" />
          <div className="min-w-0">
            <h3 className="font-anton text-base uppercase">
              {carregando ? '—' : formatarInstante(ranking?.ultimo_ciclo ?? '')}
            </h3>
            <p className="text-muted text-[13px] mt-0.5">
              Último cálculo do ranking{ranking ? ` · ${ranking.total_animes} animes` : ''}.
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-start">
          <span className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${orfaos.length > 0 ? 'bg-gold' : 'bg-green'}`} />
          <div className="min-w-0">
            <h3 className="font-anton text-2xl leading-none">{carregando ? '—' : orfaos.length}</h3>
            <p className="text-muted text-[13px] mt-1">
              {orfaos.length === 1 ? 'rótulo fora da taxonomia' : 'rótulos fora da taxonomia'}.
            </p>
          </div>
        </div>
      </section>

      {erro && (
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap bg-coral/10 border border-coral/40 rounded-xl px-4 py-3">
          <p className="text-coral text-sm">{erro}</p>
          <button
            onClick={carregar}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-panel-2 border border-line text-muted hover:text-text cursor-pointer transition-colors"
          >
            Tentar de novo
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[200px_1fr] items-start">
        <nav
          aria-label="Seções do painel"
          className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible lg:sticky lg:top-24 pb-1 lg:pb-0"
        >
          {SECOES.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSecao(s.id)}
              aria-current={secao === s.id}
              className={`shrink-0 flex items-center justify-between gap-2 text-left whitespace-nowrap text-sm font-bold px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${secao === s.id
                ? 'bg-panel-2 border-line text-text'
                : 'bg-transparent border-transparent text-muted hover:bg-panel hover:text-text'
                }`}
            >
              {s.nome}
              {s.id === 'diagnostico' && orfaos.length > 0 && (
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gold/15 text-gold">
                  {orfaos.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {/* ---------- AniList ---------- */}
          {secao === 'anilist' && (
            <div className="bg-panel border border-line rounded-2xl p-5 sm:p-6">
              <header className="mb-4">
                <h2 className="font-anton text-lg uppercase flex items-center gap-2">
                  <Activity size={16} className="text-holo-3" /> Conexão com a AniList
                </h2>
                <p className="text-muted text-[13.5px] mt-1.5 max-w-[62ch]">
                  Desligar corta toda chamada à API. O catálogo passa a ser a curadoria e nada quebra —
                  mas anime não curado some da busca.
                </p>
              </header>

              <div className="flex justify-between items-center gap-4 flex-wrap py-3.5">
                <div className="flex-1 min-w-[200px]">
                  <strong className="block text-[14.5px] font-bold">Buscar dados na AniList</strong>
                  <span className="text-muted text-[13px]">
                    {forceOffline ? 'Desligado — curadoria e cache respondem sozinhos.' : 'Ligado.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleKillSwitch}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border cursor-pointer transition-colors ${forceOffline ? 'bg-coral/10 border-coral/40 text-coral' : 'bg-panel-2 border-line text-muted hover:text-text'
                    }`}
                >
                  <PowerOff size={13} /> {forceOffline ? 'OFFLINE' : 'ONLINE'}
                </button>
              </div>

              <div className="flex justify-between items-center gap-4 flex-wrap py-3.5 border-t border-line">
                <div className="flex-1 min-w-[200px]">
                  <strong className="block text-[14.5px] font-bold">Limite de requisições</strong>
                  <span className="text-muted text-[13px]">
                    A AniList corta em 30 por minuto. Quem define é ela, não nós.
                  </span>
                </div>
                <span className="font-mono text-[13px] font-semibold text-muted-2 tabular-nums">30 / min</span>
              </div>

              <div className="flex justify-between items-center gap-4 flex-wrap py-3.5 border-t border-line">
                <div className="flex-1 min-w-[200px]">
                  <strong className="block text-[14.5px] font-bold">Testar conexão agora</strong>
                  <span className="text-muted text-[13px]">
                    A saúde acima é passiva: ela guarda o resultado de chamadas que já aconteceram.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={testarAniList}
                  disabled={testando}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-panel-2 border border-line text-muted hover:text-text hover:border-holo-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {testando ? 'Testando…' : 'Testar'}
                </button>
              </div>

              {testeAniList && (
                <p className={`text-[13px] mt-2 pl-3 border-l-2 ${testeAniList.respondeu ? 'border-green text-green' : 'border-coral text-coral'
                  }`}>
                  {testeAniList.respondeu
                    ? 'A AniList respondeu normalmente.'
                    : `Sem resposta — ${testeAniList.detalhe ?? 'motivo não informado'}`}
                </p>
              )}
            </div>
          )}

          {/* ---------- Ranking ---------- */}
          {secao === 'ranking' && (
            <div className="bg-panel border border-line rounded-2xl p-5 sm:p-6">
              <header className="mb-4">
                <h2 className="font-anton text-lg uppercase flex items-center gap-2">
                  <Trophy size={16} className="text-holo-3" /> Ranking
                </h2>
                <p className="text-muted text-[13.5px] mt-1.5 max-w-[62ch]">
                  O peso define quantos votos da comunidade daqui são precisos para mover uma obra no
                  Top Global. Com poucos usuários, o número alto é proposital.
                </p>
              </header>

              <div className="flex justify-between items-center gap-4 flex-wrap py-3.5">
                <div className="flex-1 min-w-[200px]">
                  <strong className="block text-[14.5px] font-bold">Peso do voto da comunidade</strong>
                  <span className="text-muted text-[13px]">
                    Salvar já dispara o recálculo. Padrão do projeto: {ranking?.peso_padrao ?? 350}.
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number" min={1} step={50}
                    value={pesoExibido}
                    onChange={e => setPesoInput(e.target.value)}
                    disabled={carregando}
                    className="w-24 bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm outline-none focus:border-holo-2 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleSalvarPeso}
                    disabled={salvandoPeso || carregando}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-holo-1 to-holo-2 text-void disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-opacity"
                  >
                    {salvandoPeso ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center gap-4 flex-wrap py-3.5 border-t border-line">
                <div className="flex-1 min-w-[200px]">
                  <strong className="block text-[14.5px] font-bold">Recalcular agora</strong>
                  <span className="text-muted text-[13px]">
                    O motor roda sozinho a cada 12h. Isto força fora de hora.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRecalcular}
                  disabled={recalculando}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-panel-2 border border-line text-muted hover:text-text hover:border-holo-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {recalculando ? 'Iniciando…' : 'Recalcular'}
                </button>
              </div>

              <p className="text-[13px] text-muted mt-3 pl-3 border-l-2 border-holo-3">
                Último cálculo: {formatarInstante(ranking?.ultimo_ciclo ?? '')}. O ciclo leva cerca de
                20 segundos — recarregue a aba para ver o horário novo.
              </p>
            </div>
          )}

          {/* ---------- Rótulos ---------- */}
          {secao === 'rotulos' && (
            <div className="bg-panel border border-line rounded-2xl p-5 sm:p-6">
              <header className="mb-4">
                <h2 className="font-anton text-lg uppercase flex items-center gap-2">
                  <Tags size={16} className="text-holo-3" /> Rótulos
                </h2>
                <p className="text-muted text-[13.5px] mt-1.5 max-w-[62ch]">
                  O vocabulário que o editor de curadoria aceita. Vários textos de entrada podem
                  apontar para o mesmo nome — é assim que "Horror" e "Terror" contam junto.
                </p>
              </header>

              <div className="flex gap-2 flex-wrap items-center mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
                  <input
                    type="text"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar rótulo…"
                    className="w-full bg-panel-2 border border-line rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-holo-2 transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFormAberto(v => !v)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-holo-1 to-holo-2 text-void cursor-pointer transition-opacity hover:opacity-90"
                >
                  <Plus size={13} /> Novo rótulo
                </button>
              </div>

              {formAberto && (
                <div className="bg-panel-2 border border-line rounded-xl p-4 mb-5">
                  <p className="text-muted text-[12.5px] mb-3">
                    O <strong className="text-text">texto de entrada</strong> é o que fica gravado no
                    anime. O <strong className="text-text">nome</strong> é o que aparece na tela —
                    deixe igual, a menos que esteja criando um sinônimo para um rótulo existente.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-center">
                    <input
                      type="text"
                      value={novoRaw}
                      onChange={e => setNovoRaw(e.target.value)}
                      placeholder="Texto de entrada"
                      className="bg-panel border border-line rounded-lg px-3 py-2 text-[13px] outline-none focus:border-holo-2"
                    />
                    <input
                      type="text"
                      value={novoDisplay}
                      onChange={e => setNovoDisplay(e.target.value)}
                      placeholder={novoRaw.trim() || 'Nome na tela'}
                      className="bg-panel border border-line rounded-lg px-3 py-2 text-[13px] outline-none focus:border-holo-2"
                    />
                    <select
                      value={novaCamada}
                      onChange={e => setNovaCamada(e.target.value as Camada)}
                      className="bg-panel border border-line rounded-lg px-2 py-2 text-[13px] outline-none text-text"
                    >
                      {CAMADAS.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                                      </div>

                  <div className="mt-2">
                    <input
                      type="text"
                      value={novoSinonimo}
                      onChange={e => setNovoSinonimo(e.target.value)}
                      placeholder="Sinônimo — o nome em inglês da AniList (opcional)"
                      className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] outline-none focus:border-holo-2"
                    />
                    <p className="text-muted-2 text-[11.5px] mt-1">
                      Cria uma segunda entrada com o mesmo nome na tela. É o que faz
                      "Reincarnation" e "Reencarnação" contarem como o mesmo rótulo.
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                    <p className="text-muted-2 text-[11.5px]">
                      {CAMADAS.find(c => c.id === novaCamada)?.ajuda}
                    </p>
                    <button
                      type="button"
                      onClick={handleCriarRotulo}
                      disabled={aplicando}
                      className="px-4 py-1.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-holo-1 to-holo-2 text-void disabled:opacity-50 cursor-pointer transition-opacity"
                    >
                      {aplicando ? 'Salvando…' : 'Cadastrar'}
                    </button>
                  </div>
                </div>
              )}

              {carregandoTaxonomia ? (
                <p className="text-muted text-sm">Carregando rótulos…</p>
              ) : rotulosFiltrados.length === 0 ? (
                <p className="text-muted text-sm">Nenhum rótulo encontrado.</p>
              ) : (
                CAMADAS.map(c => {
                  const lista = porCamada.get(c.id) ?? []
                  if (lista.length === 0) return null

                  return (
                    <section key={c.id} className="mb-5 last:mb-0">
                      <div className="flex items-baseline gap-2 mb-2.5">
                        <h3 className="font-anton text-[13px] uppercase tracking-wide text-muted">
                          {c.nome}
                        </h3>
                        <span className="font-mono text-[11px] text-muted-2">{lista.length}</span>
                      </div>

                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {lista.map(r => (
                          <div
                            key={r.display}
                            className="group flex items-center justify-between gap-2 bg-panel-2 border border-line rounded-lg px-3 py-2"
                          >
                            <div className="min-w-0">
                              <strong className="block text-[13px] font-bold truncate">{r.display}</strong>
                              {r.entradas.length > 1 && (
                                <span className="font-mono text-[10.5px] text-muted-2 truncate block">
                                  {r.entradas.filter(e => e !== r.display).join(' · ')}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              {r.entradas.map(e => (
                                <button
                                  key={e}
                                  type="button"
                                  onClick={() => pedirRemocaoTaxonomia(e, r.display)}
                                  title={`Remover a entrada "${e}"`}
                                  className="p-1.5 rounded-md text-muted-2 hover:text-coral hover:bg-coral/10 cursor-pointer transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )
                })
              )}
            </div>
          )}

          {/* ---------- Diagnóstico ---------- */}
          {secao === 'diagnostico' && (
            <div className="bg-panel border border-line rounded-2xl p-5 sm:p-6">
              <header className="mb-4">
                <h2 className="font-anton text-lg uppercase flex items-center gap-2">
                  <AlertTriangle size={16} className="text-holo-3" /> Diagnóstico
                </h2>
                <p className="text-muted text-[13.5px] mt-1.5 max-w-[62ch]">
                  Coisas que falham em silêncio e por isso ninguém percebe.
                </p>
              </header>

              <div className="py-3.5">
                <strong className="block text-[14.5px] font-bold">Tags fora da taxonomia</strong>
                <span className="text-muted text-[13px]">
                  Texto gravado em anime que não existe nos Rótulos. Cai em{' '}
                  <code className="font-mono text-[12px] text-muted-2">ignorado</code> e não entra em
                  gráfico nenhum.
                </span>

                {carregando ? (
                  <p className="text-muted text-sm mt-3">Carregando…</p>
                ) : orfaos.length === 0 ? (
                  <p className="text-green text-sm mt-3">Nenhum rótulo órfão. Tudo mapeado.</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 mt-3">
                      {orfaos.map(o => {
                        const estaAberto = aberto === o.raw_name
                        const lista = animesPorRotulo[o.raw_name]

                        return (
                          <div
                            key={o.raw_name}
                            className={`rounded-xl border transition-colors ${estaAberto ? 'bg-panel-2 border-line' : 'bg-transparent border-transparent'
                              }`}
                          >
                            <button
                              type="button"
                              onClick={() => alternarRotulo(o)}
                              aria-expanded={estaAberto}
                              className="w-full flex items-center gap-2.5 px-1 py-1 cursor-pointer text-left"
                            >
                              <span className={`font-mono text-[11px] font-semibold px-3 py-1 rounded-full border ${o.veio_de_curadoria
                                ? 'bg-coral/10 border-coral/40 text-coral'
                                : 'bg-gold/10 border-gold/40 text-gold'
                                }`}>
                                {o.raw_name} · {o.animes}
                              </span>
                              <span className="text-muted text-[12px] flex-1">
                                {o.veio_de_curadoria ? 'da curadoria' : 'da AniList'}
                              </span>
                              <ChevronDown
                                size={14}
                                className={`text-muted-2 shrink-0 transition-transform ${estaAberto ? 'rotate-180' : ''}`}
                              />
                            </button>

                            {estaAberto && (
                              <div className="px-3.5 pb-3.5 pt-1">
                                {carregandoRotulo === o.raw_name ? (
                                  <p className="text-muted text-[13px] py-2">Carregando animes…</p>
                                ) : !lista || lista.length === 0 ? (
                                  <p className="text-muted text-[13px] py-2">Nenhum anime encontrado.</p>
                                ) : (
                                  <>
                                    <p className="text-muted-2 text-[11.5px] mb-1.5">
                                      Clique para abrir no editor e ajustar as tags deste anime.
                                    </p>
                                    <ul className="flex flex-col gap-1 mb-4">
                                      {lista.map(a => (
                                        <li key={a.mal_id} className="border-b border-line last:border-0">
                                          {a.curated_id && onAbrirCuradoria ? (
                                            <button
                                              type="button"
                                              onClick={() => onAbrirCuradoria(a.curated_id!)}
                                              className="w-full flex items-center justify-between gap-3 text-[13px] py-2 text-left text-text hover:text-holo-3 cursor-pointer transition-colors"
                                            >
                                              <span className="truncate">{a.titulo ?? `mal_id ${a.mal_id}`}</span>
                                              <ExternalLink size={12} className="shrink-0 text-muted-2" />
                                            </button>
                                          ) : (
                                            <span className="block text-[13px] py-2 text-muted truncate">
                                              {a.titulo ?? `mal_id ${a.mal_id}`}
                                              <span className="text-muted-2 text-[11px] ml-2">(fora da curadoria)</span>
                                            </span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </>
                                )}

                                {/* --- Trocar por um rótulo que existe --- */}
                                <div className="pt-3 border-t border-line">
                                  <strong className="block text-[13px] font-bold mb-1">
                                    Trocar em todos de uma vez
                                  </strong>
                                  <p className="text-muted text-[12px] mb-2.5">
                                    Só aceita rótulo já cadastrado. A posição da tag em cada anime é
                                    preservada.
                                  </p>
                                  <input
                                    type="text"
                                    value={destinoRenomear}
                                    onChange={e => setDestinoRenomear(e.target.value)}
                                    placeholder="Buscar rótulo de destino…"
                                    className="w-full bg-panel border border-line rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-holo-2 mb-2"
                                  />
                                  <div className="flex flex-wrap gap-1.5">
                                    {sugestoesRenomear.length === 0 ? (
                                      <span className="text-gold text-[12px]">
                                        Nenhum rótulo com esse nome. Cadastre em Rótulos primeiro.
                                      </span>
                                    ) : (
                                      sugestoesRenomear.map(r => (
                                        <button
                                          key={r.display}
                                          type="button"
                                          onClick={() => setConfirmacao({
                                            tipo: 'renomear', rotulo: o, destino: r.canonico,
                                          })}
                                          className="px-3 py-1 rounded-full text-[11.5px] font-bold bg-panel border border-line text-muted hover:text-text hover:border-holo-2 cursor-pointer transition-colors"
                                        >
                                          {r.display}
                                        </button>
                                      ))
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setConfirmacao({ tipo: 'remover', rotulo: o })}
                                    disabled={aplicando}
                                    className="mt-3 px-4 py-1.5 rounded-full text-[11px] font-bold bg-coral/10 border border-coral/40 text-coral hover:bg-coral/20 disabled:opacity-50 cursor-pointer transition-colors"
                                  >
                                    Apagar esta tag dos animes
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <p className="text-[12.5px] text-muted-2 mt-3">
                      {temDaCuradoria && temDaAniList
                        ? 'Em vermelho, o que foi gravado na curadoria. Em amarelo, tag da AniList ainda não cadastrada.'
                        : temDaCuradoria
                          ? 'Todos vieram da curadoria. Cada um é um anime que sumiu dos gráficos em silêncio.'
                          : 'Todos vêm da AniList e ainda não foram cadastrados nos Rótulos.'}
                    </p>
                  </>
                )}
              </div>

              <div className="py-3.5 border-t border-line">
                <strong className="text-[14.5px] font-bold flex items-center gap-2">
                  <HardDrive size={14} className="text-muted-2" /> Espaço de imagens usado
                </strong>
                <p className="text-muted text-[13px] mt-1">
                  {carregando
                    ? 'Carregando…'
                    : bucket?.vazio
                      ? 'Nenhum arquivo no bucket curadoria.'
                      : `${formatarBytes(bucket?.bytes ?? 0)} em ${bucket?.arquivos} arquivos, de 1 GB do plano Free.`}
                </p>
              </div>

              <div className="flex justify-between items-center gap-4 flex-wrap py-3.5 border-t border-line">
                <div className="flex-1 min-w-[200px]">
                  <strong className="block text-[14.5px] font-bold">Resync de metadados</strong>
                  <span className="text-muted text-[13px]">
                    Rebusca na AniList os metadados do deck e da curadoria. Leva alguns minutos e o
                    resultado sai no log do servidor.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onResync}
                  disabled={resyncRodando}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-panel-2 border border-line text-muted hover:text-text hover:border-holo-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <RefreshCw size={13} /> {resyncRodando ? 'Sincronizando…' : 'Resync'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Confirmação ----------
          Toda escrita em lote passa por aqui: são N animes sem desfazer, e a lista
          mostrada é a mesma que a tela carregou. */}
      {confirmacao && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm">
          <div className="bg-panel border border-line rounded-2xl p-6 max-w-md w-full">
            {confirmacao.tipo === 'remover-taxonomia' ? (
              <>
                <h3 className="font-anton text-lg uppercase mb-2">Remover do vocabulário?</h3>
                <p className="text-muted text-[13.5px] mb-5">
                  <strong className="text-text">{confirmacao.rawName}</strong> deixa de ser
                  reconhecido.
                  {confirmacao.emUso > 0 ? (
                    <>
                      {' '}<strong className="text-coral">{confirmacao.emUso} anime(s)</strong> usam
                      esse texto e voltarão a ficar fora da taxonomia — eles somem dos gráficos.
                    </>
                  ) : (
                    ' Nenhum anime usa esse texto no momento.'
                  )}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-anton text-lg uppercase mb-2">
                  {confirmacao.tipo === 'renomear' ? 'Trocar em lote?' : 'Apagar em lote?'}
                </h3>
                <p className="text-muted text-[13.5px] mb-4">
                  {confirmacao.tipo === 'renomear' ? (
                    <>
                      <strong className="text-text">{confirmacao.rotulo.raw_name}</strong> vira{' '}
                      <strong className="text-text">{confirmacao.destino}</strong> em{' '}
                      <strong className="text-text">{confirmacao.rotulo.animes}</strong> anime(s).
                      Anime que já tiver as duas fica só com a nova.
                    </>
                  ) : (
                    <>
                      <strong className="text-text">{confirmacao.rotulo.raw_name}</strong> será apagada
                      de <strong className="text-text">{confirmacao.rotulo.animes}</strong> anime(s).
                    </>
                  )}
                  {' '}Não há como desfazer.
                </p>

                {animesPorRotulo[confirmacao.rotulo.raw_name] && (
                  <ul className="text-[12.5px] text-muted-2 mb-5 max-h-40 overflow-y-auto flex flex-col gap-0.5">
                    {animesPorRotulo[confirmacao.rotulo.raw_name].map(a => (
                      <li key={a.mal_id} className="truncate">· {a.titulo ?? `mal_id ${a.mal_id}`}</li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmacao(null)}
                disabled={aplicando}
                className="flex-1 px-4 py-2.5 rounded-xl border border-line text-sm font-bold cursor-pointer hover:border-muted transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={aplicarConfirmacao}
                disabled={aplicando}
                className="flex-1 px-4 py-2.5 rounded-xl bg-coral/10 border border-coral text-coral text-sm font-bold cursor-pointer hover:bg-coral hover:text-void transition-colors disabled:opacity-50"
              >
                {aplicando ? 'Aplicando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}