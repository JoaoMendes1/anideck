// client/src/components/personagem/EscolhaDoElenco.tsx
// Grade do elenco: um cartão por personagem, com a arte do primeiro estágio, classe e elemento.
// Serve ao despertar e à troca de personagem na ficha.
import { Check, Lock } from 'lucide-react'
import {
  ELENCO,
  ORDEM_DOS_ESTAGIOS,
  PRECO_DESBLOQUEAR_OURO,
  arteDoEstagio,
  rotuloDaClasse,
  rotuloDoElemento,
} from '../../lib/personagem'
import { ESTILO_DO_ELEMENTO } from '../../lib/rpg'

export default function EscolhaDoElenco({
  escolhido,
  aoEscolher,
  atual,
  desbloqueados,
  precoDesbloquear = PRECO_DESBLOQUEAR_OURO,
  nomeDoGrupo,
}: {
  escolhido: string
  aoEscolher: (id: string) => void
  atual?: string
  desbloqueados?: string[]
  precoDesbloquear?: number
  nomeDoGrupo: string
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">Escolha o personagem</legend>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {ELENCO.map((membro) => {
          const mini = arteDoEstagio(membro.id, ORDEM_DOS_ESTAGIOS[0])?.mini
          const marcado = membro.id === escolhido
          const trancado = Array.isArray(desbloqueados) && !desbloqueados.includes(membro.id)
          const emUso = membro.id === atual
          const el = ESTILO_DO_ELEMENTO[membro.elemento] ?? ESTILO_DO_ELEMENTO.eter
          return (
            <label
              key={membro.id}
              className={`relative flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-2xl border-2 bg-panel p-2 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-holo-3 ${
                marcado ? 'border-holo-3 bg-holo-3/8 shadow-md' : 'border-line hover:border-holo-2/60'
              }`}
            >
              <input
                aria-label={`${membro.nome}, ${rotuloDaClasse(membro.classe)} de ${rotuloDoElemento(membro.elemento)}${trancado ? `, trancado (${precoDesbloquear} Ouro)` : ''}`}
                type="radio"
                name={nomeDoGrupo}
                value={membro.id}
                checked={marcado}
                onChange={() => aoEscolher(membro.id)}
                className="sr-only"
              />
              <span className="relative block h-24 overflow-hidden rounded-xl bg-void sm:h-28">
                {mini && (
                  <img
                    src={mini}
                    width={256}
                    height={384}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={`absolute -top-1 left-1/2 h-auto w-[140px] max-w-none -translate-x-1/2 sm:w-[160px] ${
                      trancado ? 'opacity-45 grayscale' : ''
                    }`}
                  />
                )}
                {trancado && (
                  <span className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gold/50 bg-void/85 text-gold">
                    <Lock size={11} aria-hidden="true" />
                  </span>
                )}
                {emUso ? (
                  <span className="absolute inset-x-0 bottom-0 inline-flex items-center justify-center gap-1 bg-void/85 py-0.5 font-mono text-xs font-bold text-holo-3">
                    <Check size={11} aria-hidden="true" /> em uso
                  </span>
                ) : trancado ? (
                  <span className="absolute inset-x-0 bottom-0 bg-void/90 py-0.5 text-center font-mono text-xs font-bold text-gold">
                    {precoDesbloquear} Ouro
                  </span>
                ) : null}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className={`block break-words text-xs font-extrabold leading-tight ${marcado ? 'text-text' : 'text-muted'}`}>
                  {membro.nome}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-mono text-xs text-muted">{rotuloDaClasse(membro.classe)}</span>
                  <span className={`rounded-full border px-1.5 py-px font-mono text-xs ${el.classe}`}>
                    {el.simbolo} {rotuloDoElemento(membro.elemento)}
                  </span>
                </div>
              </div>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
