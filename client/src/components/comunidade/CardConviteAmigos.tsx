// client/src/components/comunidade/CardConviteAmigos.tsx
// Card interativo de Convite de Amigos com Recompensas e Convite VIP do Fundador (Fase 17.5b, #191)
import { useState, useEffect } from 'react'
import { Gift, Copy, Check, Users, Crown, Sparkles, ArrowRight } from 'lucide-react'
import { useSessao } from '../../contexts/SessaoContext'
import { useToast } from '../../contexts/ToastContext'
import IconeAniCoin from '../IconeAniCoin'
import {
  obterMeuConvite,
  resgatarConvite,
  type MeuConvite,
} from '../../lib/convites'

interface Props {
  className?: string
  onResgatado?: () => void
}

export default function CardConviteAmigos({ className = '', onResgatado }: Props) {
  const { session } = useSessao()
  const { showToast } = useToast()
  const [convite, setConvite] = useState<MeuConvite | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [codigoParaResgatar, setCodigoParaResgatar] = useState('')
  const [resgatando, setResgatando] = useState(false)
  const [mostrarResgate, setMostrarResgate] = useState(false)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      if (!session?.access_token) return
      try {
        setCarregando(true)
        const dados = await obterMeuConvite()
        if (ativo && dados) setConvite(dados)
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [session?.access_token])

  if (!session || carregando && !convite) {
    return null
  }

  if (!convite) {
    return null
  }

  const linkConvite = `${window.location.origin}/cadastro?convite=${encodeURIComponent(convite.codigo)}`

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(linkConvite)
      setCopiado(true)
      showToast('Link de convite copiado para a área de transferência!', 'success')
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      showToast('Não foi possível copiar o link', 'error')
    }
  }

  const handleResgatar = async (e: React.FormEvent) => {
    e.preventDefault()
    const cod = codigoParaResgatar.trim()
    if (!cod) return

    try {
      setResgatando(true)
      const res = await resgatarConvite(cod)
      if (res.sucesso) {
        showToast(
          res.especial_admin
            ? `Convite do Fundador ativado! Você ganhou ${res.anicoins_ganhos} ₳ e o título "${res.titulo_concedido}"!`
            : `Convite ativado com sucesso! Você ganhou ${res.anicoins_ganhos} ₳!`,
          'success'
        )
        setCodigoParaResgatar('')
        setMostrarResgate(false)
        onResgatado?.()
      } else {
        showToast(res.erro || 'Falha ao ativar convite', 'error')
      }
    } finally {
      setResgatando(false)
    }
  }

  return (
    <div className={`p-5 sm:p-6 rounded-2xl bg-panel border border-line relative overflow-hidden ${className}`}>
      {/* Glow de fundo */}
      <div
        className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
          convite.especial_admin ? 'bg-gold/15' : 'bg-holo-2/15'
        }`}
      />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-inner ${
                convite.especial_admin
                  ? 'bg-gold/20 border-gold/40 text-gold'
                  : 'bg-holo-2/20 border-holo-2/40 text-holo-2'
              }`}
            >
              {convite.especial_admin ? <Crown size={18} /> : <Gift size={18} />}
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-2 uppercase tracking-widest block">
                // recrutamento & recompensas (fase 17.5b)
              </span>
              <h3 className="font-anton text-lg uppercase text-text m-0 flex items-center gap-2">
                Convide Amigos & Ganhe AniCoins
              </h3>
            </div>
          </div>

          {convite.especial_admin && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/40 text-gold text-xs font-mono font-bold shadow-[0_0_15px_rgba(250,204,21,0.2)]">
              <Crown size={13} /> Convite Oficial do Fundador
            </span>
          )}
        </div>

        <p className="text-xs text-muted mb-4 leading-relaxed">
          {convite.especial_admin ? (
            <span>
              O seu link possui <strong className="text-gold">Selo do Fundador</strong>. Quem criar conta por ele recebe{' '}
              <strong className="text-text">+100 ₳ de boas-vindas</strong> e o título exclusivo{' '}
              <strong className="text-gold">"Afilhado do Fundador"</strong> no perfil!
            </span>
          ) : (
            <span>
              Envie seu link para amigos otakus. Você ganha <strong className="text-holo-3">+50 ₳</strong> e{' '}
              <strong className="text-green">+100 XP</strong> por amigo cadastrado, e ele já começa com{' '}
              <strong className="text-gold">+30 ₳</strong> de presente de entrada!
            </span>
          )}
        </p>

        {/* Caixa de Cópia do Link */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
          <div className="flex-1 min-w-0 bg-void/80 border border-line rounded-xl px-3.5 py-2 font-mono text-xs text-muted flex items-center gap-2 overflow-hidden">
            <span className="text-muted-2 shrink-0">Código:</span>
            <span className="font-bold text-text truncate">{convite.codigo}</span>
            <span className="text-line shrink-0">|</span>
            <span className="truncate text-[11px] text-muted-2 select-all">{linkConvite}</span>
          </div>

          <button
            type="button"
            onClick={handleCopiar}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              copiado
                ? 'bg-green text-void shadow-md'
                : 'bg-gradient-to-r from-holo-1 to-holo-3 text-void hover:opacity-95 shadow-md'
            }`}
          >
            {copiado ? (
              <>
                <Check size={14} strokeWidth={3} /> Copiado!
              </>
            ) : (
              <>
                <Copy size={14} /> Copiar Link
              </>
            )}
          </button>
        </div>

        {/* Estatísticas de Recrutamento */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-line/50">
          <div className="p-3 rounded-xl bg-panel-2 border border-line flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-panel border border-line grid place-items-center text-muted">
              <Users size={16} />
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-2 uppercase block">Amigos Convidados</span>
              <span className="font-anton text-lg text-text leading-none">{convite.usos_total}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-panel-2 border border-line flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-panel border border-line grid place-items-center text-gold">
              <IconeAniCoin size={16} />
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-2 uppercase block">AniCoins Ganhos</span>
              <span className="font-anton text-lg text-gold leading-none">+{convite.anicoins_ganhos} ₳</span>
            </div>
          </div>
        </div>

        {/* Resgatar código de quem indicou */}
        <div className="mt-4 pt-3 border-t border-line/40 text-center sm:text-left">
          {!mostrarResgate ? (
            <button
              type="button"
              onClick={() => setMostrarResgate(true)}
              className="text-xs font-mono text-muted hover:text-holo-3 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <Sparkles size={12} /> Foi indicado por um amigo? Clique para inserir o código dele →
            </button>
          ) : (
            <form onSubmit={handleResgatar} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                placeholder="Cole o código do seu amigo (ex: handle)"
                value={codigoParaResgatar}
                onChange={(e) => setCodigoParaResgatar(e.target.value)}
                className="flex-1 bg-void border border-line rounded-xl px-3.5 py-2 text-xs font-mono text-text placeholder:text-muted-2 outline-none focus:border-holo-3"
              />
              <button
                type="submit"
                disabled={resgatando || !codigoParaResgatar.trim()}
                className="px-4 py-2 rounded-xl bg-panel-2 border border-line hover:border-holo-3 text-xs font-bold font-mono text-text transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                {resgatando ? 'Validando…' : <>Resgatar <ArrowRight size={13} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
