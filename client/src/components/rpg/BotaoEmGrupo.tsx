// client/src/components/rpg/BotaoEmGrupo.tsx
// Abre um grupo para o alvo, permitindo escolher quantos heróis serão usados na luta
// (total de vagas e quantos heróis do próprio esquadrão entram) antes de convidar online.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Users, X } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { abrirGrupo, type AlvoDoGrupo } from '../../lib/grupo'
import type { HeroiResumoEsquadrao } from '../../lib/rpg'

export default function BotaoEmGrupo({
  tipo,
  alvoId,
  nome,
  desativado,
  elenco,
  esquadraoInicial = [],
}: {
  tipo: AlvoDoGrupo
  alvoId: string
  nome: string
  desativado?: boolean
  elenco?: HeroiResumoEsquadrao[]
  esquadraoInicial?: string[]
}) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [modalAberto, setModalAberto] = useState(false)
  const [abrindo, setAbrindo] = useState(false)
  const [maxHerois, setMaxHerois] = useState<2 | 3>(3)
  const maxPropriosPossivel = Math.max(1, Math.min(3, elenco?.length ?? 1))
  const [heroisLider, setHeroisLider] = useState<number>(1)

  const confirmar = async () => {
    setAbrindo(true)
    const qtdLider = Math.min(heroisLider, maxHerois, maxPropriosPossivel)
    const aliadosDisponiveis = (elenco ?? []).filter((h) => !h.ativo).map((h) => h.id)
    const preferidos = [
      ...esquadraoInicial.filter((id) => aliadosDisponiveis.includes(id)),
      ...aliadosDisponiveis.filter((id) => !esquadraoInicial.includes(id)),
    ]
    const esquadrao = qtdLider > 1 ? preferidos.slice(0, qtdLider - 1) : []
    const r = await abrirGrupo(tipo, alvoId, {
      max_herois: maxHerois,
      herois_lider: qtdLider,
      esquadrao,
    })
    setAbrindo(false)
    if (r.erro || !r.dados) {
      showToast(r.erro ?? 'Não foi possível abrir o grupo agora.', 'error')
      return
    }
    setModalAberto(false)
    navigate(`/grupo/${r.dados.grupo_id}`)
  }

  const vagasOnline = Math.max(0, maxHerois - Math.min(heroisLider, maxHerois, maxPropriosPossivel))

  return (
    <>
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        disabled={abrindo || desativado}
        aria-label={`Lutar em grupo contra ${nome}`}
        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-holo-2/50 px-3.5 text-xs font-bold text-holo-2 hover:bg-holo-2/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Users size={14} aria-hidden="true" /> {abrindo ? 'Abrindo…' : 'Em grupo'}
      </button>

      {modalAberto &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-void/85 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-abrir-grupo"
          >
            <div className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-line bg-panel p-5 shadow-2xl">
              <header className="flex items-center justify-between gap-2">
                <div>
                  <p className="m-0 font-mono text-xs uppercase tracking-widest text-muted">Configurar sala</p>
                  <h2 id="titulo-abrir-grupo" className="m-0 text-lg font-bold">
                    Grupo para {nome}
                  </h2>
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

              <div className="flex flex-col gap-2">
                <p className="m-0 text-xs font-bold text-text">Total de heróis na luta</p>
                <div className="grid grid-cols-2 gap-2">
                  {([2, 3] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setMaxHerois(n)
                        if (heroisLider > n) setHeroisLider(n)
                      }}
                      className={`h-10 cursor-pointer rounded-xl border text-xs font-bold transition-colors ${
                        maxHerois === n ? 'border-holo-3 bg-holo-3/15 text-holo-3' : 'border-line bg-panel-2 text-muted hover:text-text'
                      }`}
                    >
                      {n} heróis {n === 2 ? '(Dupla)' : '(Trio)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="m-0 text-xs font-bold text-text">Quantos heróis seus vão lutar</p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((qtd) => {
                    const bloqueado = qtd > maxHerois || qtd > maxPropriosPossivel
                    const ativo = Math.min(heroisLider, maxHerois, maxPropriosPossivel) === qtd
                    return (
                      <button
                        key={qtd}
                        type="button"
                        disabled={bloqueado}
                        onClick={() => setHeroisLider(qtd)}
                        className={`h-10 cursor-pointer rounded-xl border text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          ativo ? 'border-holo-2 bg-holo-2/15 text-holo-2' : 'border-line bg-panel-2 text-muted hover:text-text'
                        }`}
                      >
                        {qtd} {qtd === 1 ? 'herói' : 'heróis'}
                      </button>
                    )
                  })}
                </div>
                {maxPropriosPossivel < 2 && (
                  <p className="m-0 text-xs text-muted">Desbloqueie mais heróis no Elenco para levar seu próprio esquadrão.</p>
                )}
              </div>

              <p className="m-0 rounded-xl border border-line bg-panel-2 px-3 py-2 text-xs text-muted">
                {vagasOnline === 0
                  ? `Combate fechado com ${maxHerois} heróis do seu esquadrão (0 vagas online).`
                  : `Vagas para convidados online: ${vagasOnline} ${vagasOnline === 1 ? 'amigo' : 'amigos'} · o monstro escala para ${maxHerois} heróis.`}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="h-10 cursor-pointer rounded-full border border-line px-4 text-xs font-bold text-muted hover:text-text"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={abrindo}
                  className="h-10 flex-1 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 text-xs font-extrabold text-void disabled:opacity-50"
                >
                  {abrindo ? 'Abrindo sala…' : 'Abrir sala'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
