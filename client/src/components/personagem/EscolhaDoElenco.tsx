// client/src/components/personagem/EscolhaDoElenco.tsx
// Grade do elenco: um cartão por personagem, com a arte do primeiro estágio. Serve ao
// despertar e à troca de personagem na ficha. É um grupo de rádio: a seta e o Tab andam
// pelos cartões como num formulário comum.
import { Lock } from 'lucide-react'
import {
  ELENCO,
  ORDEM_DOS_ESTAGIOS,
  PRECO_DESBLOQUEAR_OURO,
  arteDoEstagio,
  rotuloDaClasse,
  rotuloDoElemento,
} from '../../lib/personagem'

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
  // Personagem em uso, marcado no cartão; ausente no despertar.
  atual?: string
  // Lista de personagens já desbloqueados; quando ausente (despertar), todos ficam livres.
  desbloqueados?: string[]
  precoDesbloquear?: number
  nomeDoGrupo: string
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">Escolha o personagem</legend>
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {ELENCO.map((membro) => {
          const mini = arteDoEstagio(membro.id, ORDEM_DOS_ESTAGIOS[0])?.mini
          const marcado = membro.id === escolhido
          const trancado = Array.isArray(desbloqueados) && !desbloqueados.includes(membro.id)
          return (
            <label
              key={membro.id}
              className={`relative flex min-w-0 cursor-pointer flex-col gap-1 rounded-xl border-2 bg-panel p-1.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-holo-3 ${
                marcado ? 'border-holo-3' : 'border-line hover:border-holo-2/60'
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
              <span className="relative block h-24 overflow-hidden rounded-lg bg-void sm:h-28">
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
                  <span className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-line bg-void/85 text-gold">
                    <Lock size={11} aria-hidden="true" />
                  </span>
                )}
                {membro.id === atual ? (
                  <span className="absolute inset-x-0 bottom-0 bg-void/80 py-0.5 text-center font-mono text-xs font-semibold text-holo-3">
                    em uso
                  </span>
                ) : trancado ? (
                  <span className="absolute inset-x-0 bottom-0 bg-void/85 py-0.5 text-center font-mono text-xs font-semibold text-gold">
                    {precoDesbloquear} Ouro
                  </span>
                ) : null}
              </span>
              <span className={`block break-words text-xs font-extrabold leading-tight ${marcado ? 'text-text' : 'text-muted'}`}>
                {membro.nome}
              </span>
              <span className="mt-auto block truncate font-mono text-xs leading-tight text-muted">
                {rotuloDaClasse(membro.classe)}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
