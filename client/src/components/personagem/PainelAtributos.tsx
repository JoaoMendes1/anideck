// client/src/components/personagem/PainelAtributos.tsx
// Os seis atributos primários e a distribuição dos pontos ganhos com o nível.
//
// O jogador monta a distribuição aqui (rascunho) e salva de uma vez; redistribuir é livre.
// O valor mostrado é a base do nível mais os pontos. Os números de combate que saem daí
// são calculados no servidor e voltam na resposta: a tela não repete a conta.
import { useEffect, useState } from 'react'
import { Brain, Clover, Crosshair, Dumbbell, HeartPulse, Minus, Plus, Wind, type LucideIcon } from 'lucide-react'
import {
  PRIMARIOS_RPG,
  PRIMARIOS_ZERADOS,
  distribuirPontos,
  somaDosPontos,
  type EstadoEquipamento,
  type PrimarioId,
  type PrimariosRPG,
} from '../../lib/rpg'

const ROTULO_DE_SECAO = 'font-mono text-xs font-semibold uppercase tracking-widest text-muted m-0'

const ICONE: Record<PrimarioId, { Icone: LucideIcon; cor: string }> = {
  forca: { Icone: Dumbbell, cor: 'text-gold' },
  inteligencia: { Icone: Brain, cor: 'text-holo-2' },
  constituicao: { Icone: HeartPulse, cor: 'text-coral' },
  agilidade: { Icone: Wind, cor: 'text-holo-3' },
  destreza: { Icone: Crosshair, cor: 'text-green' },
  sorte: { Icone: Clover, cor: 'text-gold' },
}

const BOTAO =
  'flex h-10 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line text-text hover:border-holo-3 disabled:cursor-not-allowed disabled:opacity-35'

export default function PainelAtributos({
  estado,
  aoAtualizar,
}: {
  estado: EstadoEquipamento
  aoAtualizar: (estado: EstadoEquipamento) => void
}) {
  const salvos = estado.pontos ?? PRIMARIOS_ZERADOS
  const [rascunho, setRascunho] = useState<PrimariosRPG>(salvos)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // Estado novo do servidor (troca de item, outra aba) recomeça o rascunho.
  useEffect(() => {
    setRascunho(estado.pontos ?? PRIMARIOS_ZERADOS)
  }, [estado.pontos])

  // Servidor anterior ao sql/077: sem primários, o painel não aparece.
  if (!estado.primarios_base) return null
  const base = estado.primarios_base

  const disponiveis = estado.pontos_disponiveis ?? 0
  const usados = somaDosPontos(rascunho)
  const livres = disponiveis - usados
  const mudou = PRIMARIOS_RPG.some(({ id }) => rascunho[id] !== salvos[id])

  const ajustar = (id: PrimarioId, passo: 1 | -1) => {
    setErro('')
    setRascunho((atual) => ({ ...atual, [id]: Math.max(0, atual[id] + passo) }))
  }

  const salvar = async () => {
    if (salvando || !mudou || livres < 0) return
    setErro('')
    setSalvando(true)
    const resultado = await distribuirPontos(rascunho)
    setSalvando(false)
    if (resultado.dados) {
      aoAtualizar(resultado.dados)
      return
    }
    setErro(resultado.erro ?? 'Não foi possível salvar os pontos agora.')
  }

  return (
    <section aria-labelledby="titulo-dos-atributos" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-dos-atributos" className={ROTULO_DE_SECAO}>
          Atributos
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 md:grid-cols-2">
          {PRIMARIOS_RPG.map(({ id, rotulo, efeito }) => {
            const { Icone, cor } = ICONE[id]
            const pontos = rascunho[id]
            return (
              <li key={id} className="flex items-center gap-3 rounded-xl border border-line bg-panel py-2 pl-3 pr-2">
                <Icone size={18} className={`shrink-0 ${cor}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-bold text-text">{rotulo}</p>
                  <p className="m-0 text-xs leading-snug text-muted">{efeito}</p>
                </div>
                <span className="w-12 text-right font-anton text-xl leading-none" aria-label={`${rotulo}: ${base[id] + pontos}`}>
                  {base[id] + pontos}
                  {pontos > 0 && <span className="block font-mono text-xs font-normal text-gold">+{pontos}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => ajustar(id, -1)}
                  disabled={pontos === 0 || salvando}
                  aria-label={`Tirar um ponto de ${rotulo}`}
                  className={BOTAO}
                >
                  <Minus size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => ajustar(id, 1)}
                  disabled={livres <= 0 || salvando}
                  aria-label={`Pôr um ponto em ${rotulo}`}
                  className={BOTAO}
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>

        <aside className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">Distribuição</span>
            <span
              className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold ${
                livres > 0 ? 'border-gold/60 text-gold' : 'border-line text-muted'
              }`}
            >
              {livres === 1 ? '1 ponto livre' : `${livres} pontos livres`}
            </span>
          </div>

          <p className="m-0 text-xs leading-relaxed text-muted">
            {disponiveis === 0
              ? 'Os primeiros 2 pontos chegam no nível 2, e depois 2 a cada novo nível.'
              : `Você tem ${disponiveis} ${disponiveis === 1 ? 'ponto disponível' : 'pontos disponíveis'} pelo nível ${estado.nivel} (2 por nível ganho). Redistribuir é livre.`}
          </p>

          {mudou && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={salvar}
                disabled={salvando || livres < 0}
                className="h-10 flex-1 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-5 text-xs font-extrabold text-void disabled:cursor-wait disabled:opacity-60"
              >
                {salvando ? 'Salvando…' : 'Salvar pontos'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setErro('')
                  setRascunho(salvos)
                }}
                disabled={salvando}
                className="h-10 cursor-pointer rounded-full border border-line px-5 text-xs font-bold text-muted hover:text-text"
              >
                Desfazer
              </button>
            </div>
          )}

          {erro && (
            <p role="alert" className="m-0 text-xs font-bold text-coral">
              {erro}
            </p>
          )}
        </aside>
      </div>
    </section>
  )
}
