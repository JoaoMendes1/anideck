// client/src/components/rpg/ComprarLutaExtra.tsx
// Aviso de "acabou por hoje" com a opção de comprar mais uma luta com Ouro (sql/128).
// Sem o sql/128, ou depois do máximo do dia, mostra só o aviso.
import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { comprarLutaExtra, lerLutasExtras, type LutasExtrasHoje, type TipoLutaExtra } from '../../lib/lutasExtras'
import IconeOuro from '../IconeOuro'

const TEXTO: Record<TipoLutaExtra, { acabou: string; botao: string; comprada: string }> = {
  expedicao: {
    acabou: 'Você já fez todas as batalhas de hoje.',
    botao: 'Mais uma batalha',
    comprada: 'Batalha extra liberada.',
  },
  masmorra: {
    acabou: 'Você já explorou uma masmorra hoje.',
    botao: 'Mais uma entrada',
    comprada: 'Entrada extra liberada.',
  },
}

export default function ComprarLutaExtra({ tipo, aoComprar }: { tipo: TipoLutaExtra; aoComprar: () => void }) {
  const [oferta, setOferta] = useState<LutasExtrasHoje | null>(null)
  const [comprando, setComprando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    lerLutasExtras().then((o) => vivo && setOferta(o))
    return () => {
      vivo = false
    }
  }, [])

  const texto = TEXTO[tipo]
  const dados = oferta?.[tipo]
  const esgotou = !dados || dados.compradas >= dados.maximo
  const falta = dados ? Math.max(0, dados.preco - (oferta?.ouro ?? 0)) : 0

  const comprar = async () => {
    if (comprando) return
    setErro('')
    setComprando(true)
    const r = await comprarLutaExtra(tipo)
    setComprando(false)
    if (!r.ok) {
      setErro(r.erro)
      return
    }
    aoComprar()
  }

  return (
    <div role="status" className="flex flex-col gap-2 rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs text-text">
      <p className="m-0">
        {texto.acabou}{' '}
        {esgotou
          ? dados
            ? 'Você já comprou o máximo de hoje. Volte amanhã.'
            : 'Volte amanhã.'
          : `Pode comprar mais ${dados.maximo - dados.compradas} hoje, com Ouro.`}
      </p>
      {!esgotou && dados && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={comprar}
            disabled={comprando || falta > 0}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-gold to-coral px-4 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} aria-hidden="true" />
            {comprando ? 'Comprando…' : texto.botao}
            <span className="inline-flex items-center gap-0.5 font-mono">
              · <IconeOuro size={12} /> {dados.preco}
            </span>
          </button>
          {falta > 0 && <span className="text-muted">Faltam {falta} de Ouro.</span>}
          <span className="text-muted">A próxima custa 50% a mais.</span>
        </div>
      )}
      {erro && <p role="alert" className="m-0 font-bold text-coral">{erro}</p>}
    </div>
  )
}
