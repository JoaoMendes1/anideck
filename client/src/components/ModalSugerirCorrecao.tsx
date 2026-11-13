// client/src/components/ModalSugerirCorrecao.tsx
// Modal de envio de sugestão de curadoria colaborativa (Fase 17.7, #188)
import { useState } from 'react'
import { X, Sparkles, Send, ShieldCheck, Film, Link as LinkIcon, Calendar, AlignLeft } from 'lucide-react'
import { submeterSugestaoCuradoria } from '../lib/curadoriaCollab'
import { useToast } from '../contexts/ToastContext'

interface Props {
  aberto: boolean
  onFechar: () => void
  malId: number
  tituloAnime: string
  episodioPadrao?: number
}

type Campo = 'titulo_episodio' | 'link_streaming' | 'estreia' | 'sinopse'

export default function ModalSugerirCorrecao({ aberto, onFechar, malId, tituloAnime, episodioPadrao }: Props) {
  const { showToast } = useToast()
  const [campo, setCampo] = useState<Campo>('titulo_episodio')
  const [episodioNumero, setEpisodioNumero] = useState<number>(episodioPadrao || 1)
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!aberto) return null

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valor.trim()) {
      showToast('Digite a correção sugerida.', 'error')
      return
    }

    setEnviando(true)
    try {
      const res = await submeterSugestaoCuradoria({
        mal_id: malId,
        campo,
        episodio_numero: campo === 'titulo_episodio' ? episodioNumero : 0,
        valor: valor.trim(),
        motivo: motivo.trim(),
      })

      if (res.sucesso) {
        showToast('Sugestão enviada para a fila de curadoria! Agradecemos sua contribuição.', 'success')
        onFechar()
        setValor('')
        setMotivo('')
      } else {
        showToast(res.erro || 'Falha ao enviar sugestão.', 'error')
      }
    } catch {
      showToast('Erro de conexão ao enviar sugestão.', 'error')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg p-6 rounded-3xl bg-panel border border-line shadow-2xl relative">
        <button
          type="button"
          onClick={onFechar}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-panel-2 text-muted hover:text-text transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-holo-2" />
          <h2 className="font-anton text-xl uppercase m-0 text-text">Sugerir Correção de Curadoria</h2>
        </div>
        <p className="text-xs text-muted mb-4">
          Obra: <strong className="text-text">{tituloAnime}</strong>
        </p>

        <div className="p-3 mb-5 rounded-2xl bg-holo-2/10 border border-holo-2/30 text-xs text-holo-3 flex items-center gap-2.5">
          <ShieldCheck size={18} className="shrink-0" />
          <span>Membros a partir do Rank B podem colaborar com o acervo. Cada sugestão aprovada rende <strong>+15 Cristais 💎</strong> na sua conta!</span>
        </div>

        <form onSubmit={submeter} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text mb-1.5">O que você deseja sugerir/corrigir?</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'titulo_episodio', label: 'Título do Episódio', icon: Film },
                { id: 'link_streaming', label: 'Onde Assistir (Link)', icon: LinkIcon },
                { id: 'sinopse', label: 'Sinopse em Português', icon: AlignLeft },
                { id: 'estreia', label: 'Data de Estreia', icon: Calendar },
              ].map(item => {
                const Icon = item.icon
                const ativo = campo === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCampo(item.id as Campo)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      ativo
                        ? 'bg-holo-2/20 border-holo-2 text-holo-3 shadow-[0_0_12px_rgba(123,92,255,0.2)]'
                        : 'bg-panel-2 border-line text-muted hover:text-text'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {campo === 'titulo_episodio' && (
            <div>
              <label className="block text-xs font-bold text-text mb-1">Número do Episódio</label>
              <input
                type="number"
                min={1}
                value={episodioNumero}
                onChange={e => setEpisodioNumero(Math.max(1, Number(e.target.value)))}
                className="w-24 bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm font-mono text-text outline-none focus:border-holo-3"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-text mb-1">
              {campo === 'titulo_episodio'
                ? 'Título em Português Sugerido'
                : campo === 'link_streaming'
                  ? 'Link oficial de streaming (Crunchyroll, Netflix...)'
                  : campo === 'estreia'
                    ? 'Data de estreia oficial (ex: 2026-10-05)'
                    : 'Texto da sinopse em português'}
            </label>
            {campo === 'sinopse' ? (
              <textarea
                rows={4}
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder="Insira o texto da sinopse..."
                className="w-full bg-panel-2 border border-line rounded-xl p-3 text-xs text-text outline-none focus:border-holo-3"
              />
            ) : (
              <input
                type="text"
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder={
                  campo === 'titulo_episodio'
                    ? 'Ex: O Retorno do Herói Lendário'
                    : campo === 'link_streaming'
                      ? 'https://crunchyroll.com/...'
                      : 'YYYY-MM-DD'
                }
                className="w-full bg-panel-2 border border-line rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-holo-3"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-text mb-1">
              Fonte / Motivo da correção <span className="text-muted font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: Título oficial exibido na transmissão da Crunchyroll"
              className="w-full bg-panel-2 border border-line rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-holo-3"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 rounded-xl bg-panel-2 border border-line text-xs font-bold text-muted hover:text-text cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || !valor.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-holo-1 to-holo-2 text-void text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
            >
              <Send size={13} />
              <span>{enviando ? 'Enviando…' : 'Enviar Sugestão'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
