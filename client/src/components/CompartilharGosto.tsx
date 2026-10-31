// client/src/components/CompartilharGosto.tsx
// Botão do Meu Gosto que gera o card em PNG, mostra a prévia e oferece baixar ou
// compartilhar. Sem dado suficiente para a frase, o botão não aparece (quem decide é
// quem chama, pelo Veredito).
import { useEffect, useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import Sheet from './Sheet'
import { useToast } from '../contexts/ToastContext'
import { gerarPngDoCard, type DadosDoCard } from '../lib/cardDeGosto'

export default function CompartilharGosto({ dados }: { dados: DadosDoCard }) {
  const { showToast } = useToast()
  const [aberto, setAberto] = useState(false)
  const [png, setPng] = useState<Blob | null>(null)
  const [previa, setPrevia] = useState<string | null>(null)
  const [falhou, setFalhou] = useState(false)

  // Gera no clique, com os dados daquele momento. Num efeito, a tela do Meu Gosto (que
  // re-renderiza enquanto os números animam) refaria o PNG a cada quadro.
  const abrir = () => {
    setAberto(true)
    gerarPngDoCard(dados)
      .then(blob => {
        if (!blob) { setFalhou(true); return }
        setPng(blob)
        setPrevia(URL.createObjectURL(blob))
      })
      .catch(() => setFalhou(true))
  }

  // A URL da prévia segura o PNG na memória até ser revogada.
  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa) }, [previa])

  const baixar = () => {
    if (!previa) return
    const a = document.createElement('a')
    a.href = previa
    a.download = 'meu-gosto-anideck.png'
    a.click()
  }

  const compartilhar = async () => {
    if (!png) return
    const arquivo = new File([png], 'meu-gosto-anideck.png', { type: 'image/png' })
    try {
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: 'Meu gosto no AniDeck', url: window.location.origin })
        return
      }
      await navigator.clipboard.writeText(window.location.origin)
      showToast('Link do AniDeck copiado. Baixe a imagem para enviar junto.', 'success')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') showToast('Não foi possível compartilhar. Baixe a imagem.', 'error')
    }
  }

  const fechar = () => {
    setAberto(false)
    setPng(null)
    setPrevia(null)
    setFalhou(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-holo-2/50 text-holo-2 text-sm font-bold hover:bg-holo-2/10 transition-colors cursor-pointer"
      >
        <Share2 size={16} /> Compartilhar meu gosto
      </button>

      <Sheet isOpen={aberto} onClose={fechar} title="Card do seu gosto">
        {falhou && <p className="text-coral text-sm">Este navegador não conseguiu gerar a imagem.</p>}
        {!falhou && !previa && <div className="aspect-[4/5] w-full max-w-[360px] mx-auto rounded-2xl shimmer" />}
        {previa && (
          <img src={previa} alt="Prévia do card com o seu gosto" className="w-full max-w-[360px] mx-auto rounded-2xl border border-line" />
        )}
        <div className="flex flex-wrap justify-center gap-3 mt-5">
          <button type="button" onClick={baixar} disabled={!previa} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void font-bold text-sm disabled:opacity-50 cursor-pointer">
            <Download size={16} /> Baixar PNG
          </button>
          <button type="button" onClick={compartilhar} disabled={!png} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-line text-text font-bold text-sm disabled:opacity-50 cursor-pointer">
            <Share2 size={16} /> Compartilhar
          </button>
        </div>
      </Sheet>
    </>
  )
}
