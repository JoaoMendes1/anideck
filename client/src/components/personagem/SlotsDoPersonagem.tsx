// client/src/components/personagem/SlotsDoPersonagem.tsx
// Os cinco slots de equipamento sobre a arte do personagem: arma, armadura e capa à esquerda,
// botas e joia à direita. Tocar num slot abre a lista daquele slot no painel de atributos.
//
// Arte provisória: o ícone vem do slot e a cor da raridade. A ilustração de cada item entra
// depois, por id, sem mudar este componente de lugar.
import IconeDoItem from '../rpg/IconeDoItem'
import { SLOTS_RPG, estiloDaRaridade, type EstadoEquipamento, type SlotId } from '../../lib/rpg'

const ESQUERDA: SlotId[] = ['arma', 'armadura', 'capa']
const DIREITA: SlotId[] = ['botas', 'joia']

export default function SlotsDoPersonagem({
  estado,
  slotAberto,
  aoEscolher,
}: {
  estado: EstadoEquipamento | null | undefined
  slotAberto: SlotId | null
  aoEscolher: (slot: SlotId) => void
}) {
  // Sem os dados (carregando ou indisponível), a arte fica limpa: o painel explica o motivo.
  if (!estado) return null

  const itemNoSlot = (slot: SlotId) => estado.slots.find((s) => s.slot === slot)?.item

  const coluna = (ids: SlotId[], lado: string) => (
    <ul className={`absolute top-16 m-0 flex list-none flex-col gap-2 p-0 lg:top-20 lg:gap-3 ${lado}`}>
      {ids.map((id) => {
        const slot = SLOTS_RPG.find((s) => s.id === id)
        if (!slot) return null
        const { rotulo } = slot
        const item = itemNoSlot(id)
        const estilo = estiloDaRaridade(item?.raridade)
        const aberto = slotAberto === id
        return (
          <li key={id}>
            <button
              type="button"
              data-slot-rpg={id}
              onClick={() => aoEscolher(id)}
              aria-expanded={aberto}
              aria-label={item ? `${rotulo}: ${item.nome}. Trocar` : `${rotulo}: vazio. Equipar`}
              title={item ? `${rotulo}: ${item.nome}` : `${rotulo}: vazio`}
              className={`relative flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 backdrop-blur-sm lg:h-16 lg:w-16 ${
                aberto
                  ? 'border-holo-3 bg-void/80 text-holo-3 ring-2 ring-holo-3/40'
                  : item
                    ? `${estilo.borda} ${estilo.fundo} ${estilo.texto}`
                    : 'border-dashed border-line bg-void/50 text-muted'
              }`}
            >
              <IconeDoItem id={item?.id} slot={id} tamanho={22} />
              {(item?.aprimoramento ?? 0) > 0 && (
                <span className="absolute right-0.5 bottom-0.5 rounded bg-void/85 px-1 font-mono text-[10px] leading-tight font-bold text-gold">
                  +{item?.aprimoramento}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      {coluna(ESQUERDA, 'left-3 lg:left-4')}
      {coluna(DIREITA, 'right-3 lg:right-4')}
    </>
  )
}
