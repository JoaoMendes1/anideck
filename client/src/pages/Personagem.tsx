// client/src/pages/Personagem.tsx
// Meu Personagem: o aventureiro do usuário, com a arte do visual em uso. O visual acompanha
// o estágio do nível, ou fica fixado num estágio já alcançado, escolhido na Jornada.
//
// Mobile-first: no celular a arte vem em cima e a ficha embaixo; a partir de `lg` as duas
// ficam lado a lado. Nível, XP e rank são os da Guilda: o personagem não tem XP próprio.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Image, Lock, Orbit, Sparkles, Sword, Swords } from 'lucide-react'
import { obterFundoDoCenario } from '../lib/cosmeticos'
import CamadaDaAura from '../components/personagem/CamadaDaAura'
import PainelEquipamentos from '../components/personagem/PainelEquipamentos'
import SlotsDoPersonagem from '../components/personagem/SlotsDoPersonagem'
import EscolhaDeItem from '../components/personagem/EscolhaDeItem'
import PainelAtributos from '../components/personagem/PainelAtributos'
import LivroDeHabilidades from '../components/personagem/LivroDeHabilidades'
import { obterEquipamentos, type EstadoEquipamento, type SlotId } from '../lib/rpg'
import {
  ALTURA_DA_ARTE,
  LARGURA_DA_ARTE,
  NOME_MAXIMO,
  EVENTO_PERSONAGEM_ATUALIZADO,
  PERSONAGEM_BASE_PADRAO,
  arteDoEstagio,
  despertarPersonagem,
  equiparVisual,
  obterPersonagem,
  rotuloDaClasse,
  rotuloDoElemento,
  temArtePropria,
  textoDoProximoEstagio,
  validarNomeDoPersonagem,
  visualEmUso,
  type RespostaPersonagem,
} from '../lib/personagem'

// A luz atrás do personagem cresce com o estágio. São valores inteiros de CSS, e não
// classes montadas por partes: o Tailwind só gera a classe que aparece completa no código.
const LUZ_DO_ESTAGIO: Record<string, string> = {
  iniciante:
    'radial-gradient(60% 46% at 50% 58%, color-mix(in srgb, var(--color-holo-3) 16%, transparent), transparent 72%)',
  aventureiro:
    'radial-gradient(62% 48% at 50% 56%, color-mix(in srgb, var(--color-holo-2) 42%, transparent), transparent 72%)',
  veterano:
    'radial-gradient(64% 50% at 50% 56%, color-mix(in srgb, var(--color-holo-2) 52%, transparent), transparent 72%)',
  lendario:
    'radial-gradient(66% 52% at 50% 56%, color-mix(in srgb, var(--color-holo-2) 56%, transparent), color-mix(in srgb, var(--color-gold) 10%, transparent) 55%, transparent 76%)',
}

const ANEL_DO_ESTAGIO: Record<string, string> = {
  iniciante: 'border-holo-3/35',
  aventureiro: 'border-holo-2/60',
  veterano: 'border-holo-2/80',
  lendario: 'border-gold/70',
}


const CONTAINER = 'w-full min-w-0 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-24'
const ROTULO_DE_SECAO = 'font-mono text-xs font-semibold uppercase tracking-widest text-muted m-0'

function Cabecalho() {
  return (
    <header className="mb-4 flex items-center gap-1 select-none">
      <Link
        to="/guilda"
        aria-label="Voltar para a Guilda"
        className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-text transition-colors"
      >
        <ChevronLeft size={22} />
      </Link>
      <p className={ROTULO_DE_SECAO}>Meu Personagem</p>
    </header>
  )
}

function TelaDespertar({ aoDespertar }: { aoDespertar: (dados: RespostaPersonagem) => void }) {
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const arte = arteDoEstagio(PERSONAGEM_BASE_PADRAO, 'iniciante')

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviando) return

    const conferido = validarNomeDoPersonagem(nome)
    if (conferido.erro) {
      setErro(conferido.erro)
      return
    }

    setErro('')
    setEnviando(true)
    const resultado = await despertarPersonagem(conferido.nome)
    setEnviando(false)

    if (resultado.dados) {
      aoDespertar(resultado.dados)
      return
    }
    setErro(resultado.erro ?? 'Não foi possível despertar agora.')
  }

  return (
    <div className={CONTAINER}>
      <Cabecalho />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <div
          className="relative h-[min(52vh,420px)] overflow-hidden rounded-2xl border border-line bg-void lg:h-[600px]"
          style={{
            backgroundImage:
              'radial-gradient(58% 50% at 50% 56%, var(--color-holo-2), color-mix(in srgb, var(--color-holo-2) 35%, transparent) 40%, transparent 78%)',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute bottom-3 left-1/2 h-12 w-64 -translate-x-1/2 rounded-[50%] border border-text/40"
          />
          {arte && (
            <img
              src={arte.inteira}
              width={LARGURA_DA_ARTE}
              height={ALTURA_DA_ARTE}
              alt="Silhueta de um aventureiro ainda sem nome"
              decoding="async"
              className="absolute bottom-1 left-1/2 h-[96%] w-auto max-w-none -translate-x-1/2 object-contain brightness-0"
            />
          )}
        </div>

        <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-holo-3 m-0">O Despertar</p>
          <h1 className="font-anton text-[clamp(2rem,8vw,2.6rem)] uppercase leading-[1.05] m-0">
            Um novo mundo te espera
          </h1>
          <p className="text-sm leading-relaxed text-muted m-0">
            Cada episódio que você assiste fortalece o seu aventureiro. Dê um nome a ele para começar a jornada.
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-bold">
              Classe inicial: Espadachim
            </span>
            <span className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-bold">
              Elemento: Éter
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="nome-do-aventureiro" className={ROTULO_DE_SECAO}>
              Nome do aventureiro
            </label>
            <input
              id="nome-do-aventureiro"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={NOME_MAXIMO}
              autoComplete="off"
              placeholder="Como ele vai se chamar?"
              aria-invalid={erro ? true : undefined}
              aria-describedby="ajuda-do-nome"
              className="h-13 rounded-2xl border border-line bg-panel-2 px-4 text-base font-semibold text-text placeholder:text-muted-2 focus:border-holo-3 focus:outline-none"
            />
            <p id="ajuda-do-nome" className="text-xs leading-snug text-muted m-0">
              De 2 a 24 caracteres. Por enquanto, só você vê este nome, e ele não pode ser trocado depois.
            </p>
            {erro && (
              <p role="alert" className="text-xs font-bold text-coral m-0">
                {erro}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="mt-2 h-13 rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-6 text-base font-extrabold text-void transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer disabled:cursor-wait"
          >
            {enviando ? 'Despertando…' : 'Despertar'}
          </button>
        </form>
      </div>
    </div>
  )
}

type AbaCombate = 'status' | 'atributos' | 'habilidades'

function lerAbaDaUrl(valor: string | null): AbaCombate {
  if (valor === 'atributos' || valor === 'habilidades') return valor
  return 'status'
}

function FichaDoPersonagem({
  dados,
  aoAtualizar,
  equipamento,
  aoAtualizarEquipamento,
}: {
  dados: RespostaPersonagem
  aoAtualizar: (dados: RespostaPersonagem) => void
  equipamento: EstadoEquipamento | null | undefined
  aoAtualizarEquipamento: (estado: EstadoEquipamento) => void
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const abaAtiva = lerAbaDaUrl(searchParams.get('aba'))

  const selecionarAba = (novaAba: AbaCombate) => {
    setSearchParams(
      (atual) => {
        const proximo = new URLSearchParams(atual)
        if (novaAba === 'status') {
          proximo.delete('aba')
        } else {
          proximo.set('aba', novaAba)
        }
        return proximo
      },
      { replace: true },
    )
  }

  // Visual que o jogador está só experimentando; null mostra o que está em uso.
  const [previa, setPrevia] = useState<string | null>(null)
  const [slotAberto, setSlotAberto] = useState<SlotId | null>(null)
  // Estável, para o Esc da lista não ser religado a cada render.
  const fecharSlot = useCallback(() => setSlotAberto(null), [])
  const [salvando, setSalvando] = useState(false)
  const [erroDoVisual, setErroDoVisual] = useState('')

  const { personagem, progressao, estagio, proximo_estagio: proximoEstagio } = dados
  if (!personagem || !progressao || !estagio) return null

  const estagios = dados.estagios ?? []
  const base = personagem.personagem_base
  const emUso = visualEmUso(dados) ?? estagio.id
  const fixado = dados.visual ? !dados.visual.automatico : false
  const mostrado = previa ?? emUso
  const emPrevia = previa !== null && previa !== emUso
  const skins = dados.skins ?? []
  const nomeDoMostrado =
    estagios.find((e) => e.id === mostrado)?.nome ?? skins.find((s) => s.id === mostrado)?.nome ?? estagio.nome
  const arte = arteDoEstagio(base, mostrado)
  // A luz do estágio fica por cima do cenário, para o personagem não se perder no fundo.
  const luz = LUZ_DO_ESTAGIO[mostrado] ?? LUZ_DO_ESTAGIO.aventureiro
  const cenario = obterFundoDoCenario(dados.cenario)
  const progressoPct = Math.min(100, Math.max(0, progressao.progresso_pct))

  const pontosUsados = equipamento?.pontos
    ? equipamento.pontos.forca +
      equipamento.pontos.inteligencia +
      equipamento.pontos.constituicao +
      equipamento.pontos.agilidade +
      equipamento.pontos.destreza +
      equipamento.pontos.sorte
    : 0
  const pontosLivres = Math.max(0, (equipamento?.pontos_disponiveis ?? 0) - pontosUsados)

  const trocarVisual = async (visual: string) => {
    if (salvando) return
    setErroDoVisual('')
    setSalvando(true)
    const resultado = await equiparVisual(visual)
    setSalvando(false)

    if (resultado.dados) {
      aoAtualizar(resultado.dados)
      setPrevia(null)
      window.dispatchEvent(new Event(EVENTO_PERSONAGEM_ATUALIZADO))
      return
    }
    setErroDoVisual(resultado.erro ?? 'Não foi possível trocar o visual agora.')
  }

  return (
    <div className={CONTAINER}>
      <Cabecalho />
      {/* LINHA 1: Arte à esquerda e Identidade/Jornada/Progressão/Aventura à direita */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <section
          aria-label="Arte do personagem"
          className="relative h-[min(62vh,520px)] overflow-hidden rounded-2xl border border-line bg-void lg:h-[680px]"
          data-cenario={cenario ? dados.cenario : 'padrao'}
          style={{ backgroundImage: cenario ? `${luz}, ${cenario}` : luz }}
        >
          <div
            aria-hidden="true"
            className={`absolute bottom-3.5 left-1/2 h-13 w-72 -translate-x-1/2 rounded-[50%] border ${ANEL_DO_ESTAGIO[mostrado] ?? 'border-holo-2/60'}`}
          />
          <div
            aria-hidden="true"
            className={`absolute bottom-6 left-1/2 h-8 w-52 -translate-x-1/2 rounded-[50%] border opacity-60 ${ANEL_DO_ESTAGIO[mostrado] ?? 'border-holo-2/60'}`}
          />
          <CamadaDaAura estilo={dados.aura} />
          {arte && (
            <img
              src={arte.inteira}
              width={LARGURA_DA_ARTE}
              height={ALTURA_DA_ARTE}
              alt={`${personagem.nome}, ${rotuloDaClasse(personagem.classe)}, com o visual ${nomeDoMostrado}`}
              decoding="async"
              fetchPriority="high"
              style={arte.filtro ? { filter: arte.filtro } : undefined}
              className="absolute bottom-2 left-1/2 h-[96%] w-auto max-w-none -translate-x-1/2 object-contain"
            />
          )}
          <SlotsDoPersonagem
            estado={equipamento}
            slotAberto={slotAberto}
            aoEscolher={(slot) => setSlotAberto((atual) => (atual === slot ? null : slot))}
          />
          {equipamento && slotAberto && (
            <EscolhaDeItem estado={equipamento} slot={slotAberto} aoFechar={fecharSlot} aoAtualizar={aoAtualizarEquipamento} />
          )}
          <span className="absolute left-4 top-4 rounded-full border border-gold bg-void/70 px-3 py-1.5 font-mono text-xs font-semibold tracking-wider text-gold">
            RANK {progressao.rank}
          </span>
          <span
            className={`absolute right-4 top-4 rounded-full border bg-void/70 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-text ${
              emPrevia ? 'border-holo-3' : 'border-holo-2'
            }`}
          >
            {emPrevia ? `Prévia · ${nomeDoMostrado}` : estagio.nome}
          </span>
          <Link
            to="/loja"
            className="absolute bottom-3 right-3 inline-flex h-11 items-center gap-1.5 rounded-full border border-line bg-void/70 px-3 text-xs font-bold text-muted hover:text-text"
          >
            <Image size={14} aria-hidden="true" />
            Cenários e auras
          </Link>
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2.5">
            <h1 className="font-anton text-[clamp(2.2rem,9vw,2.8rem)] uppercase leading-none m-0 break-words">
              {personagem.nome}
            </h1>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-bold">
                <Sword size={14} className="text-holo-3" aria-hidden="true" />
                {rotuloDaClasse(personagem.classe)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-bold">
                <Orbit size={14} className="text-holo-2" aria-hidden="true" />
                {rotuloDoElemento(personagem.elemento)}
              </span>
            </div>
          </div>

          <section aria-labelledby="titulo-da-jornada" className="flex flex-col gap-3">
            <h2 id="titulo-da-jornada" className={ROTULO_DE_SECAO}>
              Jornada e visual
            </h2>
            <ol className="m-0 grid list-none grid-cols-4 gap-2.5 p-0">
              {estagios.map((item) => {
                const atual = item.id === estagio.id
                const selecionado = item.id === mostrado
                const mostraArte = temArtePropria(base, item.id) || item.alcancado
                const mini = mostraArte ? arteDoEstagio(base, item.id)?.mini : undefined
                const miolo = (
                  <>
                    <span
                      className={`relative block h-24 overflow-hidden rounded-xl border-2 bg-panel ${
                        selecionado && emPrevia
                          ? 'border-holo-3'
                          : atual
                            ? 'border-gold'
                            : mini
                              ? 'border-line'
                              : 'border-dashed border-line'
                      }`}
                    >
                      {mini ? (
                        <img
                          src={mini}
                          width={256}
                          height={384}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className={`absolute -top-1.5 left-1/2 h-auto w-[150px] max-w-none -translate-x-1/2 ${
                            item.alcancado ? '' : 'opacity-20 brightness-0 invert'
                          }`}
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-muted">
                          <Lock size={20} aria-hidden="true" />
                        </span>
                      )}
                      {item.id === emUso && (
                        <span className="absolute inset-x-0 bottom-0 bg-void/80 py-0.5 text-center font-mono text-xs font-semibold text-holo-3">
                          em uso
                        </span>
                      )}
                    </span>
                    <span
                      className={`block truncate text-xs font-bold leading-tight ${
                        atual ? 'text-gold' : item.alcancado ? 'text-text' : 'text-muted'
                      }`}
                    >
                      {item.nome}
                    </span>
                    <span className="block font-mono text-xs leading-tight text-muted">nível {item.nivel_minimo}</span>
                  </>
                )
                return (
                  <li key={item.id} aria-current={atual ? 'step' : undefined} className="min-w-0">
                    {item.alcancado ? (
                      <button
                        type="button"
                        onClick={() => {
                          setErroDoVisual('')
                          setPrevia(item.id === emUso ? null : item.id)
                        }}
                        aria-pressed={selecionado}
                        aria-label={`Ver o visual ${item.nome}`}
                        className="flex w-full min-w-0 cursor-pointer flex-col gap-1.5 rounded-xl text-left"
                      >
                        {miolo}
                      </button>
                    ) : (
                      <div className="flex min-w-0 flex-col gap-1.5">{miolo}</div>
                    )}
                  </li>
                )
              })}
            </ol>

            {skins.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="m-0 font-mono text-xs font-semibold uppercase tracking-widest text-muted">Trajes</p>
                <ul className="m-0 grid list-none grid-cols-4 gap-2.5 p-0">
                  {skins.map((skin) => {
                    const arteDaSkin = arteDoEstagio(base, skin.id)
                    const selecionado = skin.id === mostrado
                    return (
                      <li key={skin.id} className="min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            setErroDoVisual('')
                            setPrevia(skin.id === emUso ? null : skin.id)
                          }}
                          aria-pressed={selecionado}
                          aria-label={`Ver o traje ${skin.nome}`}
                          className="flex w-full min-w-0 cursor-pointer flex-col gap-1.5 rounded-xl text-left"
                        >
                          <span
                            className={`relative block h-24 overflow-hidden rounded-xl border-2 bg-panel ${
                              selecionado && emPrevia ? 'border-holo-3' : skin.id === emUso ? 'border-gold' : 'border-line'
                            }`}
                          >
                            {arteDaSkin && (
                              <img
                                src={arteDaSkin.mini}
                                width={256}
                                height={384}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                style={arteDaSkin.filtro ? { filter: arteDaSkin.filtro } : undefined}
                                className="absolute -top-1.5 left-1/2 h-auto w-[150px] max-w-none -translate-x-1/2"
                              />
                            )}
                            {skin.id === emUso && (
                              <span className="absolute inset-x-0 bottom-0 bg-void/80 py-0.5 text-center font-mono text-xs font-semibold text-holo-3">
                                em uso
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-xs font-bold leading-tight text-text">{skin.nome}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {emPrevia ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-holo-3/40 bg-panel p-3">
                <p role="status" className="m-0 min-w-0 flex-1 basis-40 text-xs text-muted">
                  Experimentando <strong className="text-text">{nomeDoMostrado}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => trocarVisual(mostrado)}
                  disabled={salvando}
                  className="h-11 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-4 text-xs font-extrabold text-void disabled:cursor-wait disabled:opacity-60"
                >
                  {salvando ? 'Trocando…' : 'Usar este visual'}
                </button>
                <button
                  type="button"
                  onClick={() => setPrevia(null)}
                  disabled={salvando}
                  className="h-11 cursor-pointer rounded-full border border-line px-4 text-xs font-bold text-muted hover:text-text"
                >
                  Cancelar
                </button>
              </div>
            ) : fixado ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="m-0 min-w-0 flex-1 basis-40 text-xs leading-snug text-muted">
                  Visual fixado em <strong className="text-text">{nomeDoMostrado}</strong>. Ele não muda quando você sobe de
                  estágio.
                </p>
                <button
                  type="button"
                  onClick={() => trocarVisual('')}
                  disabled={salvando}
                  className="h-11 cursor-pointer rounded-full border border-line px-4 text-xs font-bold text-text hover:border-holo-3 disabled:cursor-wait disabled:opacity-60"
                >
                  {salvando ? 'Trocando…' : 'Voltar ao automático'}
                </button>
              </div>
            ) : (
              <p className="m-0 text-xs leading-snug text-muted">
                O visual acompanha o seu estágio. Toque num estágio já alcançado para experimentar outro.
              </p>
            )}
            {erroDoVisual && (
              <p role="alert" className="m-0 text-xs font-bold text-coral">
                {erroDoVisual}
              </p>
            )}
          </section>

          <section aria-label="Progressão" className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className={ROTULO_DE_SECAO}>Nível</span>
                <span className="font-anton text-4xl leading-none">{progressao.nivel}</span>
              </div>
              <span className="text-right text-xs font-bold text-gold">{progressao.titulo_rank}</span>
            </div>
            <div
              role="progressbar"
              aria-label="Experiência no nível atual"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressoPct}
              className="h-2 overflow-hidden rounded-full bg-line"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-holo-2 to-holo-3"
                style={{ width: `${progressoPct}%` }}
              />
            </div>
            <div className="flex justify-between gap-3 font-mono text-xs text-muted">
              <span>
                {progressao.xp_no_nivel.toLocaleString('pt-BR')} / {progressao.xp_para_proximo.toLocaleString('pt-BR')} XP
              </span>
              <Link to="/guilda" className="text-muted underline-offset-2 hover:text-text hover:underline">
                da Guilda
              </Link>
            </div>
            <div className="h-px bg-line" />
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted">Próximo estágio</span>
              <span className="text-right font-bold">{textoDoProximoEstagio(proximoEstagio)}</span>
            </div>
          </section>

          <nav aria-label="Aventura" className="grid grid-cols-1 gap-2.5">
            <Link
              to="/expedicoes"
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-coral/40 bg-coral/10 px-4 py-3 hover:border-coral"
            >
              <Swords size={20} className="shrink-0 text-coral" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-text">Expedições</span>
                <span className="block text-xs text-muted">Enfrente monstros e ganhe bilhetes e itens</span>
              </span>
              <span aria-hidden="true" className="text-muted">→</span>
            </Link>
            <Link
              to="/invocacao"
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 hover:border-gold"
            >
              <Sparkles size={20} className="shrink-0 text-gold" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-text">Invocação</span>
                <span className="block text-xs text-muted">Troque bilhetes por equipamentos</span>
              </span>
              <span aria-hidden="true" className="text-muted">→</span>
            </Link>
          </nav>
        </div>
      </div>

      {/* LINHA 2: Largura toda, com controle segmentado de abas (Status, Atributos, Habilidades) */}
      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-panel-2/40 p-4 sm:p-5">
        <div
          role="tablist"
          aria-label="Seções de combate do personagem"
          className="inline-flex w-full sm:w-auto self-start rounded-xl border border-line bg-panel p-1 gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={abaAtiva === 'status'}
            onClick={() => selecionarAba('status')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
              abaAtiva === 'status' ? 'bg-holo-1 text-void' : 'text-muted hover:text-text'
            }`}
          >
            Status
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={abaAtiva === 'atributos'}
            onClick={() => selecionarAba('atributos')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
              abaAtiva === 'atributos' ? 'bg-holo-1 text-void' : 'text-muted hover:text-text'
            }`}
          >
            <span>Atributos</span>
            {pontosLivres > 0 && (
              <span
                className={`px-1.5 py-px rounded-full text-xs ${
                  abaAtiva === 'atributos' ? 'bg-void/25 text-void' : 'bg-gold/20 text-gold'
                }`}
              >
                +{pontosLivres}
              </span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={abaAtiva === 'habilidades'}
            onClick={() => selecionarAba('habilidades')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
              abaAtiva === 'habilidades' ? 'bg-holo-1 text-void' : 'text-muted hover:text-text'
            }`}
          >
            Habilidades
          </button>
        </div>

        <div role="tabpanel">
          {abaAtiva === 'status' && <PainelEquipamentos estado={equipamento} />}
          {abaAtiva === 'atributos' &&
            (equipamento ? (
              <PainelAtributos estado={equipamento} aoAtualizar={aoAtualizarEquipamento} />
            ) : (
              <PainelEquipamentos estado={equipamento} />
            ))}
          {abaAtiva === 'habilidades' &&
            (equipamento ? (
              <LivroDeHabilidades habilidades={equipamento.habilidades} />
            ) : (
              <PainelEquipamentos estado={equipamento} />
            ))}
        </div>
      </div>
    </div>
  )
}

export default function Personagem() {
  const [dados, setDados] = useState<RespostaPersonagem | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [tentativa, setTentativa] = useState(0)
  // Fica fora de `dados` porque trocar o visual devolve o personagem sem o equipamento.
  // undefined: ainda não veio; null: o servidor não respondeu.
  const [equipamento, setEquipamento] = useState<EstadoEquipamento | null | undefined>(undefined)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      // Uma chamada só: personagem e equipamento juntos.
      const resposta = await obterPersonagem({ completo: true })
      if (!ativo) return
      setDados(resposta)
      setEquipamento(resposta?.equipamento)
      setCarregando(false)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [tentativa])

  // Reserva: quem acabou de despertar, ou resposta sem o equipamento, busca só ele.
  const precisaDoEquipamento = Boolean(dados?.existe) && equipamento === undefined
  useEffect(() => {
    if (!precisaDoEquipamento) return
    let ativo = true
    obterEquipamentos().then((resposta) => {
      if (ativo) setEquipamento(resposta)
    })
    return () => {
      ativo = false
    }
  }, [precisaDoEquipamento])

  const aoDespertar = useCallback((resposta: RespostaPersonagem) => {
    setDados(resposta)
    window.dispatchEvent(new Event(EVENTO_PERSONAGEM_ATUALIZADO))
  }, [])

  const tentarDeNovo = useCallback(() => {
    setCarregando(true)
    setTentativa((n) => n + 1)
  }, [])

  if (carregando) {
    return (
      <div className={CONTAINER}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="h-[min(62vh,520px)] animate-pulse rounded-2xl border border-line bg-panel lg:h-[680px]" />
          <div className="h-72 animate-pulse rounded-2xl border border-line bg-panel" />
        </div>
      </div>
    )
  }

  if (!dados) {
    return (
      <div className={`${CONTAINER} text-center`}>
        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-line bg-panel p-6">
          <h1 className="font-anton text-2xl uppercase mb-2">Personagem indisponível no momento</h1>
          <p className="mb-4 text-sm text-muted">Não foi possível carregar o seu aventureiro agora.</p>
          <button
            type="button"
            onClick={tentarDeNovo}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 py-2.5 text-xs font-bold text-void"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    )
  }

  if (!dados.existe) {
    return <TelaDespertar aoDespertar={aoDespertar} />
  }

  return (
    <FichaDoPersonagem
      dados={dados}
      aoAtualizar={setDados}
      equipamento={equipamento}
      aoAtualizarEquipamento={setEquipamento}
    />
  )
}
