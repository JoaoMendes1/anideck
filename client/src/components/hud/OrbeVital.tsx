// client/src/components/hud/OrbeVital.tsx
// Vitalidade e Mana como orbes de líquido. A onda é uma forma quase circular girando
// devagar por cima do líquido: movimento calmo, só com transform.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type TipoDeOrbe = 'hp' | 'mp'

const CORES: Record<TipoDeOrbe, { base: string; luz: string; rotulo: string }> = {
  hp: { base: '#FF5C6C', luz: '#FF9AA4', rotulo: 'text-coral' },
  mp: { base: '#2F7FE0', luz: '#8CC4FF', rotulo: 'text-mana' },
}

interface Props {
  tipo: TipoDeOrbe
  /** De 0 a 100: altura do líquido. */
  pct: number
  valor: number
  maximo: number
  rotulo: string
  detalhe: ReactNode
  /** Destino do clique. Sem ele, o orbe é só uma figura (vitrine da Landing). */
  para?: string
  tamanho?: number
}

const CLASSE_DO_INVOLUCRO = 'group flex flex-col items-center gap-2 rounded-2xl p-1 focus-visible:outline-2 focus-visible:outline-holo-3'

function Involucro({ para, descricao, children }: { para?: string; descricao: string; children: ReactNode }) {
  if (!para) {
    return <span role="img" aria-label={descricao} className={CLASSE_DO_INVOLUCRO}>{children}</span>
  }
  return <Link to={para} aria-label={descricao} className={CLASSE_DO_INVOLUCRO}>{children}</Link>
}

export default function OrbeVital({ tipo, pct, valor, maximo, rotulo, detalhe, para, tamanho = 80 }: Props) {
  const cor = CORES[tipo]
  const nivel = Math.min(100, Math.max(0, pct))
  // Com o orbe cheio, a superfície fica logo abaixo da borda, para a onda continuar visível.
  const superficie = nivel >= 100 ? 97 : Math.max(0, nivel - 2)
  const forma = tamanho * 3

  return (
    <Involucro para={para} descricao={`${rotulo}: ${valor} de ${maximo}`}>
      <span
        className="relative block rounded-full overflow-hidden transition-transform group-hover:scale-105"
        style={{
          width: tamanho,
          height: tamanho,
          background: `radial-gradient(circle at 35% 30%, ${cor.luz}, ${cor.base} 72%)`,
          boxShadow: `0 0 0 2px rgba(241,238,250,.12), 0 0 16px ${cor.base}55, inset 0 -8px 16px rgba(0,0,0,.35)`,
        }}
      >
        <span
          aria-hidden
          className="orbe-onda absolute left-1/2 bg-[#120d26]"
          style={{ width: forma, height: forma, marginLeft: -forma / 2, bottom: `${superficie}%`, borderRadius: '47%' }}
        />
        <span
          aria-hidden
          className="orbe-onda-lenta absolute left-1/2 bg-[#120d26]/40"
          style={{ width: forma, height: forma, marginLeft: -forma / 2, bottom: `${superficie + 1}%`, borderRadius: '46%' }}
        />
        <span aria-hidden className="absolute left-[22%] top-[14%] w-[26%] h-[15%] rounded-full bg-white/30 blur-[2px]" />
        <span
          className="absolute inset-0 flex flex-col items-center justify-center font-anton leading-none text-text [text-shadow:0_2px_8px_rgba(0,0,0,.6)] tabular-nums"
        >
          <span style={{ fontSize: Math.round(tamanho * 0.28) }}>{valor}</span>
          <span className="font-mono text-xs text-white/75 font-bold">/{maximo}</span>
        </span>
      </span>
      <span className={`text-xs font-extrabold ${cor.rotulo}`}>{rotulo}</span>
      <span className="-mt-1.5 text-xs text-muted text-center leading-snug">{detalhe}</span>
    </Involucro>
  )
}

/** AniCoins no mesmo formato dos orbes, como uma moeda. */
export function OrbeMoeda({ saldo, tamanho = 80, figura = false }: { saldo: number; tamanho?: number; /** Só figura, sem link para a Loja. */ figura?: boolean }) {
  return (
    <Involucro para={figura ? undefined : '/loja'} descricao={figura ? `${saldo} AniCoins` : `${saldo} AniCoins. Abrir a Loja`}>
      <span
        className="grid place-items-center rounded-full transition-transform group-hover:scale-105"
        style={{
          width: tamanho,
          height: tamanho,
          background: 'radial-gradient(circle at 35% 30%, #FFE9A8, #FFC542 45%, #B97A0C)',
          boxShadow: '0 0 0 2px rgba(241,238,250,.12), 0 0 16px rgba(255,197,66,.35), inset 0 -6px 14px rgba(0,0,0,.3)',
        }}
      >
        <span
          className="grid place-items-center rounded-full border-2 border-dashed border-void/35 font-anton leading-none text-[#2a1a00] tabular-nums"
          style={{ width: tamanho - 16, height: tamanho - 16, fontSize: Math.round(tamanho * (saldo >= 10000 ? 0.2 : 0.26)) }}
        >
          {saldo.toLocaleString('pt-BR')}
        </span>
      </span>
      <span className="text-xs font-extrabold text-gold">AniCoins</span>
      <span className="-mt-1.5 text-xs text-muted group-hover:text-text">{figura ? 'Para a Loja' : 'Abrir a Loja ›'}</span>
    </Involucro>
  )
}
