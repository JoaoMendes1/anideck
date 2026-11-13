// client/src/components/comunidade/SeletorClasse.tsx
// Componente para seleção de Classe de RPG e Títulos no Perfil e Guilda (Fase 17.4, #186, #189)
import { useState } from 'react'
import { Check, Award } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import {
  CLASSES_RPG,
  escolherClasse,
  equiparTitulo,
  type ClasseRPG,
} from '../../lib/previsoes'

interface Props {
  classeAtual?: ClasseRPG
  tituloAtual?: string
  titulosDisponiveis?: string[]
  onAtualizado?: () => void
  className?: string
}

export default function SeletorClasse({
  classeAtual = 'bardo',
  tituloAtual = 'Aventureiro Iniciante',
  titulosDisponiveis = ['Aventureiro Iniciante', 'Testemunha da Estreia', 'Carrasco de Tiamat', 'Voz da Comunidade'],
  onAtualizado,
  className = '',
}: Props) {
  const { showToast } = useToast()
  const [classe, setClasse] = useState<ClasseRPG>(classeAtual)
  const [titulo, setTitulo] = useState<string>(tituloAtual)
  const [salvando, setSalvando] = useState(false)

  const handleSalvarClasse = async (novaClasse: ClasseRPG) => {
    if (novaClasse === classe) return
    try {
      setSalvando(true)
      const res = await escolherClasse(novaClasse)
      if (res.ok) {
        setClasse(novaClasse)
        showToast(`Classe alterada para ${CLASSES_RPG[novaClasse].nome}!`, 'success')
        onAtualizado?.()
      } else {
        showToast(res.erro || 'Falha ao alterar classe', 'error')
      }
    } finally {
      setSalvando(false)
    }
  }

  const handleEquiparTitulo = async (novoTitulo: string) => {
    if (novoTitulo === titulo) return
    try {
      setSalvando(true)
      const res = await equiparTitulo(novoTitulo)
      if (res.ok) {
        setTitulo(novoTitulo)
        showToast(`Título "${novoTitulo}" equipado com sucesso!`, 'success')
        onAtualizado?.()
      } else {
        showToast(res.erro || 'Falha ao equipar título', 'error')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className={`p-5 sm:p-6 rounded-2xl bg-panel border border-line ${className}`}>
      {/* SELEÇÃO DE CLASSE */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <span className="font-mono text-[10px] text-muted-2 uppercase tracking-widest block">
              // vocação de rpg (fase 17.4)
            </span>
            <h3 className="font-anton text-lg uppercase text-text m-0">Sua Classe na Guilda</h3>
          </div>
          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-holo-1/15 border border-holo-1/40 text-holo-1">
            Classe Ativa: {CLASSES_RPG[classe].nome}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(CLASSES_RPG) as ClasseRPG[]).map((key) => {
            const c = CLASSES_RPG[key]
            const ativa = classe === key
            return (
              <button
                key={key}
                type="button"
                disabled={salvando}
                onClick={() => handleSalvarClasse(key)}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  ativa
                    ? `${c.borda} ${c.fundo} shadow-lg ring-1 ring-holo-1/30`
                    : 'border-line bg-panel-2 hover:border-line/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{c.icone}</span>
                  {ativa ? (
                    <span className="w-5 h-5 rounded-full bg-holo-1 text-void flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase text-muted">Escolher</span>
                  )}
                </div>

                <div className={`font-anton text-base uppercase mb-0.5 ${c.cor}`}>
                  {c.nome}
                </div>
                <div className="font-mono text-[10.5px] font-bold text-text mb-1">
                  {c.papel}
                </div>
                <div className="text-[11px] text-muted leading-relaxed">
                  {c.bonus}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* SELEÇÃO DE TÍTULO */}
      <div className="pt-5 border-t border-line/60">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <span className="font-mono text-[10px] text-muted-2 uppercase tracking-widest block">
              // títulos de honra
            </span>
            <h4 className="font-anton text-base uppercase text-text m-0">Título Equipado</h4>
          </div>
          <span className="font-mono text-xs font-bold text-gold flex items-center gap-1 bg-gold/15 border border-gold/30 px-2.5 py-0.5 rounded-full">
            <Award size={12} /> {titulo}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {titulosDisponiveis.map((t) => {
            const equipado = titulo === t
            return (
              <button
                key={t}
                type="button"
                disabled={salvando}
                onClick={() => handleEquiparTitulo(t)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                  equipado
                    ? 'bg-gold/20 border-gold text-gold shadow-md'
                    : 'bg-panel-2 border-line hover:border-line/80 text-muted hover:text-text'
                }`}
              >
                {equipado ? `✓ ${t}` : t}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
