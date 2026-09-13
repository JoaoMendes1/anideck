import { useState } from 'react'
import { Activity, PowerOff, RefreshCw, Tags, HardDrive, Trophy } from 'lucide-react'
import { useControle } from '../hooks/useControle'
import { useToast } from '../contexts/ToastContext'

type Props = {
  apiHealth: 'OK' | 'WARNING' | 'OFFLINE'
  forceOffline: boolean
  onToggleKillSwitch: () => void
  onResync: () => void
  resyncRodando: boolean
}

const SECOES = [
  { id: 'anilist', nome: 'AniList' },
  { id: 'ranking', nome: 'Ranking' },
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

export function AbaControle({ apiHealth, forceOffline, onToggleKillSwitch, onResync, resyncRodando }: Props) {
  const { showToast } = useToast()
  const {
    ranking, orfaos, bucket,
    carregando, erro, carregar,
    salvarPeso, salvandoPeso,
    recalcular, recalculando,
    testarAniList, testando, testeAniList,
  } = useControle()

  const [secao, setSecao] = useState<SecaoId>('anilist')
  const [pesoInput, setPesoInput] = useState('')

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
    if (problema) {
      showToast(problema, 'error')
      return
    }
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

  // A legenda de cores só aparece quando as DUAS existem na tela. Explicar o
  // amarelo sem nenhum chip amarelo à vista manda o olho procurar algo que não
  // está lá.
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
          <span
            className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${
              forceOffline || apiHealth === 'OFFLINE' ? 'bg-coral' : apiHealth === 'WARNING' ? 'bg-gold' : 'bg-green'
            }`}
          />
          <div className="min-w-0">
            <h3 className="font-anton text-base uppercase">
              {forceOffline ? 'AniList desligada' : apiHealth === 'OFFLINE' ? 'AniList fora do ar' : 'AniList no ar'}
            </h3>
            <p className="text-muted text-[13px] mt-0.5">
              {forceOffline
                ? 'Kill Switch ativo. A busca serve só curadoria e cache.'
                : `Saúde passiva: ${apiHealth}.`}
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
          <span
            className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${orfaos.length > 0 ? 'bg-gold' : 'bg-green'}`}
          />
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
        {/* ---------- Navegação de seções ---------- */}
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
              className={`shrink-0 text-left whitespace-nowrap text-sm font-bold px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                secao === s.id
                  ? 'bg-panel-2 border-line text-text'
                  : 'bg-transparent border-transparent text-muted hover:bg-panel hover:text-text'
              }`}
            >
              {s.nome}
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
                    forceOffline
                      ? 'bg-coral/10 border-coral/40 text-coral'
                      : 'bg-panel-2 border-line text-muted hover:text-text'
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
                {/* Texto puro, sem moldura: com fundo e borda ele parecia um campo
                    desabilitado, e a frase ao lado diz justamente que não é editável. */}
                <span className="font-mono text-[13px] font-semibold text-muted-2 tabular-nums">
                  30 / min
                </span>
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
                <p
                  className={`text-[13px] mt-2 pl-3 border-l-2 ${
                    testeAniList.respondeu ? 'border-green text-green' : 'border-coral text-coral'
                  }`}
                >
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
                    type="number"
                    min={1}
                    step={50}
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

          {/* ---------- Diagnóstico ---------- */}
          {secao === 'diagnostico' && (
            <div className="bg-panel border border-line rounded-2xl p-5 sm:p-6">
              <header className="mb-4">
                <h2 className="font-anton text-lg uppercase flex items-center gap-2">
                  <Tags size={16} className="text-holo-3" /> Diagnóstico
                </h2>
                <p className="text-muted text-[13.5px] mt-1.5 max-w-[62ch]">
                  Coisas que falham em silêncio e por isso ninguém percebe.
                </p>
              </header>

              <div className="py-3.5">
                <strong className="block text-[14.5px] font-bold">Tags fora da taxonomia</strong>
                <span className="text-muted text-[13px]">
                  Não existem na <code className="font-mono text-[12px] text-muted-2">genre_taxonomy</code>,
                  então caem em <code className="font-mono text-[12px] text-muted-2">ignorado</code> e
                  não entram em gráfico nenhum. Considera os animes do seu deck.
                </span>

                {carregando ? (
                  <p className="text-muted text-sm mt-3">Carregando…</p>
                ) : orfaos.length === 0 ? (
                  <p className="text-green text-sm mt-3">Nenhum rótulo órfão. Tudo mapeado.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {orfaos.map(o => (
                        <span
                          key={o.raw_name}
                          title={
                            o.veio_de_curadoria
                              ? 'Digitado no Painel — provável erro de digitação'
                              : 'Tag da AniList ainda não cadastrada'
                          }
                          className={`font-mono text-[11px] font-semibold px-3 py-1 rounded-full border ${
                            o.veio_de_curadoria
                              ? 'bg-coral/10 border-coral/40 text-coral'
                              : 'bg-gold/10 border-gold/40 text-gold'
                          }`}
                        >
                          {o.raw_name} · {o.animes}
                        </span>
                      ))}
                    </div>

                    <p className="text-[12.5px] text-muted-2 mt-3">
                      {temDaCuradoria && temDaAniList
                        ? 'Em vermelho, o que foi digitado à mão na curadoria — o anime sumiu da tela por causa disso. Em amarelo, tag da AniList que ainda não foi cadastrada.'
                        : temDaCuradoria
                          ? 'Todos foram digitados à mão na curadoria. Cada um é um anime que sumiu dos gráficos em silêncio.'
                          : 'Todos vêm da AniList e ainda não foram cadastrados na taxonomia. É a cauda longa esperada.'}
                    </p>
                  </>
                )}
              </div>

              <div className="py-3.5 border-t border-line">
                <strong className="text-[14.5px] font-bold flex items-center gap-2">
                  <HardDrive size={14} className="text-muted-2" /> Espaço de imagens usado
                </strong>
                {/* Sem barra de progresso: com 1,3% ela era um traço invisível que não
                    comunicava nada, e o número ao lado já diz tudo. Volta a fazer
                    sentido se o uso chegar perto do teto. */}
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
    </div>
  )
}