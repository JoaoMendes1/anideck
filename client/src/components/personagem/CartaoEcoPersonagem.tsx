// client/src/components/personagem/CartaoEcoPersonagem.tsx
// Slot "Eco do Anime": permite equipar 1 Carta Foil (conquistada em animes concluídos)
// para converter gênero, raridade e nível do personagem em atributos táticos de combate.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Layers, Sparkles, X } from 'lucide-react'
import { equiparEcoDoAnime, obterEcosDoAnime, type EcoDoAnime, type EstadoEquipamento } from '../../lib/rpg'

const ROTULO_RARIDADE_CARTA: Record<string, { texto: string; classe: string }> = {
  comum: { texto: 'Comum', classe: 'border-line text-muted' },
  rara: { texto: 'Rara', classe: 'border-holo-3/60 text-holo-3' },
  rarissima: { texto: 'Raríssima', classe: 'border-holo-2/70 text-holo-2' },
  lendaria: { texto: 'Lendária', classe: 'border-gold/70 text-gold' },
}

export default function CartaoEcoPersonagem({
  estado,
  aoAtualizar,
}: {
  estado?: EstadoEquipamento
  aoAtualizar: (novo: EstadoEquipamento) => void
}) {
  const [modalAberto, setModalAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [cartas, setCartas] = useState<EcoDoAnime[]>([])
  const [erroLista, setErroLista] = useState('')
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  if (!estado) return null
  const eco = estado.eco

  const abrirModal = async () => {
    setModalAberto(true)
    setCarregando(true)
    setErroLista('')
    const r = await obterEcosDoAnime()
    setCarregando(false)
    if (r.erro || !r.dados) {
      setErroLista(r.erro ?? 'Não foi possível carregar suas Cartas Foil agora.')
      return
    }
    setCartas(r.dados.cartas)
  }

  const equipar = async (malId: number) => {
    setSalvando(true)
    setMensagem(null)
    const r = await equiparEcoDoAnime(malId)
    setSalvando(false)
    if (r.erro || !r.dados) {
      setMensagem({ tipo: 'erro', texto: r.erro ?? 'Não foi possível atualizar o Eco agora.' })
      return
    }
    aoAtualizar(r.dados)
    setModalAberto(false)
    setMensagem({ tipo: 'ok', texto: malId > 0 ? 'Eco do Anime equipado.' : 'Eco do Anime removido.' })
  }

  return (
    <section
      aria-labelledby="titulo-eco-anime"
      className="flex flex-col gap-3 rounded-2xl border border-gold/40 bg-panel p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="shrink-0 text-gold" aria-hidden="true" />
          <h3 id="titulo-eco-anime" className="m-0 text-sm font-bold">
            Eco do Anime
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {eco && (
            <button
              type="button"
              onClick={() => equipar(0)}
              disabled={salvando}
              className="h-9 cursor-pointer rounded-full border border-line px-3 text-xs font-bold text-muted hover:text-text disabled:opacity-50"
            >
              Remover
            </button>
          )}
          <button
            type="button"
            onClick={abrirModal}
            disabled={salvando}
            className="h-9 cursor-pointer rounded-full border border-gold/60 bg-gold/10 px-3.5 text-xs font-bold text-gold hover:bg-gold/20 disabled:opacity-50"
          >
            {eco ? 'Trocar Eco' : 'Equipar Carta Foil'}
          </button>
        </div>
      </div>

      {mensagem && (
        <p role="status" className={`m-0 text-xs font-bold ${mensagem.tipo === 'erro' ? 'text-coral' : 'text-green'}`}>
          {mensagem.texto}
        </p>
      )}

      {eco ? (
        <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-panel-2 p-3">
          {eco.imagem_url ? (
            <img
              src={eco.imagem_url}
              alt=""
              width={48}
              height={68}
              className="h-16 w-12 shrink-0 rounded-lg border border-gold/50 object-cover"
            />
          ) : (
            <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg border border-gold/50 bg-void text-gold">
              <Layers size={18} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="m-0 truncate text-sm font-extrabold text-text">{eco.titulo}</p>
              <span className="rounded-full border border-gold/50 bg-gold/15 px-2 py-0.5 font-mono text-xs font-bold text-gold">
                Foil
              </span>
            </div>
            <p className="m-0 font-mono text-xs text-holo-3">
              {eco.nome_efeito} · {eco.genero_principal}
            </p>
            <p className="m-0 mt-0.5 font-mono text-xs text-muted">{eco.resumo}</p>
          </div>
        </div>
      ) : (
        <p className="m-0 text-xs leading-relaxed text-muted">
          Equipe 1 Carta Foil (conquistada ao concluir animes com nota 10) para somar bônus permanentes de gênero e raridade em todas as batalhas.
        </p>
      )}

      {modalAberto &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-void/85 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-eco"
          >
            <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl border border-line bg-panel shadow-2xl">
              <header className="flex items-center gap-3 border-b border-line px-5 py-4">
                <Sparkles size={20} className="shrink-0 text-gold" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h2 id="titulo-modal-eco" className="m-0 text-lg font-bold">
                    Escolher Eco do Anime
                  </h2>
                  <p className="m-0 text-xs text-muted">Somente Cartas Foil (animes avaliados com nota 10).</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  aria-label="Fechar"
                  className="cursor-pointer rounded-full p-1 text-muted hover:text-text"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-5">
                {carregando ? (
                  <div className="h-40 animate-pulse rounded-2xl border border-line bg-panel-2" />
                ) : erroLista ? (
                  <p role="alert" className="m-0 text-sm text-coral">
                    {erroLista}
                  </p>
                ) : cartas.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-panel-2 p-6 text-center">
                    <p className="m-0 text-sm text-muted">
                      Você ainda não possui Cartas Foil. Conclua um anime e dê nota 10 para gerar sua primeira Carta Foil!
                    </p>
                    <Link
                      to="/guilda#colecao"
                      onClick={() => setModalAberto(false)}
                      className="inline-flex h-10 items-center rounded-full border border-gold/60 px-4 text-xs font-bold text-gold"
                    >
                      Ver Coleção de Cartas
                    </Link>
                  </div>
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                    {cartas.map((c) => {
                      const equipada = eco?.mal_id === c.mal_id
                      const rar = ROTULO_RARIDADE_CARTA[c.raridade] ?? ROTULO_RARIDADE_CARTA.comum
                      return (
                        <li
                          key={c.mal_id}
                          className={`flex items-center gap-3 rounded-2xl border p-3 ${
                            equipada ? 'border-gold bg-gold/10' : 'border-line bg-panel-2'
                          }`}
                        >
                          {c.imagem_url ? (
                            <img
                              src={c.imagem_url}
                              alt=""
                              width={44}
                              height={64}
                              className="h-16 w-11 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="flex h-16 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-void text-gold">
                              <Layers size={16} aria-hidden="true" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="m-0 truncate text-sm font-bold text-text">{c.titulo}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                              <span className={`rounded-full border px-2 py-0.5 font-mono text-xs font-bold ${rar.classe}`}>
                                {rar.texto}
                              </span>
                              <span className="font-mono text-xs text-holo-3">
                                {c.nome_efeito} · {c.genero_principal}
                              </span>
                            </div>
                            <p className="m-0 mt-1 font-mono text-xs text-muted">{c.resumo}</p>
                          </div>
                          <button
                            type="button"
                            disabled={salvando || equipada}
                            onClick={() => equipar(c.mal_id)}
                            className="h-9 shrink-0 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-4 text-xs font-extrabold text-void disabled:cursor-default disabled:opacity-50"
                          >
                            {equipada ? 'Equipada' : 'Equipar'}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  )
}
