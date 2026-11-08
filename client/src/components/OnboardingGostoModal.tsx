import { useState } from 'react'
import { Sparkles, Check, Ban } from 'lucide-react'
import Sheet from './Sheet'
import { useRotulos } from '../hooks/useRotulos'
import { salvarPreferenciasDeGosto, type PreferenciasDeGosto } from '../lib/preferenciasGosto'
import { useToast } from '../contexts/ToastContext'

interface OnboardingGostoModalProps {
  isOpen: boolean
  userId: string
  preferenciasAtuais: PreferenciasDeGosto
  onClose: () => void
  onSaved: (novas: PreferenciasDeGosto) => void
}

const GENEROS_FALLBACK = [
  'Ação', 'Aventura', 'Comédia', 'Drama', 'Fantasia', 'Ficção Científica',
  'Mistério', 'Psicológico', 'Romance', 'Slice of Life', 'Sobrenatural',
  'Suspense', 'Esportes', 'Mecha', 'Isekai', 'Shounen', 'Seinen', 'Shoujo',
]

export default function OnboardingGostoModal({
  isOpen,
  userId,
  preferenciasAtuais,
  onClose,
  onSaved,
}: OnboardingGostoModalProps) {
  const { rotulos } = useRotulos()
  const { showToast } = useToast()
  const [favoritos, setFavoritos] = useState<string[]>(preferenciasAtuais.favoritos)
  const [bloqueados, setBloqueados] = useState<string[]>(preferenciasAtuais.bloqueados)
  const [salvando, setSalvando] = useState(false)

  const opcoes = rotulos.length > 0
    ? rotulos.filter(r => r.camada === 'genero' || r.camada === 'demografia').map(r => r.nome)
    : GENEROS_FALLBACK

  const alternarFavorito = (nome: string) => {
    setBloqueados(prev => prev.filter(b => b !== nome))
    setFavoritos(prev =>
      prev.includes(nome) ? prev.filter(f => f !== nome) : [...prev, nome],
    )
  }

  const alternarBloqueado = (nome: string) => {
    setFavoritos(prev => prev.filter(f => f !== nome))
    setBloqueados(prev =>
      prev.includes(nome) ? prev.filter(b => b !== nome) : [...prev, nome],
    )
  }

  const concluir = async (pular = false) => {
    setSalvando(true)
    try {
      const novas = await salvarPreferenciasDeGosto(userId, {
        favoritos: pular ? preferenciasAtuais.favoritos : favoritos,
        bloqueados: pular ? preferenciasAtuais.bloqueados : bloqueados,
        tutorialConcluido: true,
      })
      onSaved(novas)
      if (!pular) {
        showToast('Preferências de gosto salvas! Suas recomendações foram atualizadas.', 'success')
      }
      onClose()
    } catch {
      showToast('Não foi possível salvar suas preferências agora.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Personalize seu Gosto" maxWidthClass="md:max-w-xl">
      <div className="space-y-5">
        <div className="bg-gradient-to-br from-holo-1/10 via-holo-2/10 to-holo-3/10 border border-holo-2/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-holo-2 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles size={14} /> Recomendações sob medida
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Escolha pelo menos <strong className="text-text">3 gêneros ou demografias favoritos</strong> para calibrar a sua página inicial mesmo antes de preencher todo o seu Deck. Você pode alterar isso quando quiser em Configurações.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-text">
              1. O que você mais curte assistir? ({favoritos.length} selecionados)
            </span>
            {favoritos.length < 3 && (
              <span className="text-[11px] font-mono text-gold">Escolha {3 - favoritos.length}+</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {opcoes.map(nome => {
              const ativo = favoritos.includes(nome)
              return (
                <button
                  key={nome}
                  type="button"
                  onClick={() => alternarFavorito(nome)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    ativo
                      ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void border-transparent shadow-sm'
                      : 'bg-panel-2 border-line text-muted hover:border-holo-2 hover:text-text'
                  }`}
                >
                  {ativo && <Check size={12} />}
                  {nome}
                </button>
              )
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-line">
          <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
            2. Quer evitar algum gênero nas sugestões? (Opcional)
          </span>
          <p className="text-[11px] text-muted-2 mb-2.5">
            Animes com esses rótulos não aparecerão na seção Recomendados para Você.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {opcoes.map(nome => {
              const bloqueado = bloqueados.includes(nome)
              return (
                <button
                  key={`bloq-${nome}`}
                  type="button"
                  onClick={() => alternarBloqueado(nome)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                    bloqueado
                      ? 'bg-coral/15 border-coral/40 text-coral'
                      : 'bg-panel border-line text-muted-2 hover:text-muted'
                  }`}
                >
                  {bloqueado && <Ban size={11} />}
                  {nome}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-line">
          <button
            type="button"
            onClick={() => concluir(true)}
            disabled={salvando}
            className="px-4 py-2 rounded-xl border border-line text-xs font-bold text-muted hover:text-text cursor-pointer"
          >
            Pular por enquanto
          </button>
          <button
            type="button"
            disabled={salvando || favoritos.length === 0}
            onClick={() => concluir(false)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-holo-1 to-holo-2 text-void text-xs font-extrabold cursor-pointer hover:opacity-95 disabled:opacity-40"
          >
            {salvando ? 'Salvando...' : 'Salvar preferências'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
