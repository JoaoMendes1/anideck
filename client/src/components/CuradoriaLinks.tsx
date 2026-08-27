// client/src/components/CuradoriaLinks.tsx
// Editor dos links de streaming curados.
//
// Diferente dos episódios, aqui a curadoria SUBSTITUI os links da AniList em vez de somar:
// o motivo de cadastrar um link é justamente o de lá estar quebrado, e manter os dois lado
// a lado devolveria o problema para quem clica.
import { useState } from 'react'
import { Plus, Trash2, Check, X, ExternalLink } from 'lucide-react'
import type { CuratedExternalLink } from '../types/curation'

interface CuradoriaLinksProps {
  links: CuratedExternalLink[]
  onAdd: (link: CuratedExternalLink) => void
  onUpdate: (index: number, link: CuratedExternalLink) => void
  onRemove: (index: number) => void
  onValidationError: (msg: string) => void
}

// Plataformas mais comuns viram atalho, mas o campo aceita qualquer texto — não dá para
// prever todo serviço regional, e travar numa lista fixa geraria pedido de alteração a cada
// serviço novo.
const PLATAFORMAS_SUGERIDAS = ['Crunchyroll', 'Netflix', 'Prime Video', 'Disney+', 'Max', 'YouTube']

export default function CuradoriaLinks({
  links,
  onAdd,
  onUpdate,
  onRemove,
  onValidationError,
}: CuradoriaLinksProps) {
  const [plataforma, setPlataforma] = useState('')
  const [url, setUrl] = useState('')
  const [editIndex, setEditIndex] = useState<number | null>(null)

  const emEdicao = editIndex !== null

  const cancelarEdicao = () => {
    setEditIndex(null)
    setPlataforma('')
    setUrl('')
  }

  const salvar = () => {
    if (!plataforma.trim()) {
      onValidationError('O nome da plataforma é obrigatório.')
      return
    }

    const endereco = url.trim()
    if (!endereco) {
      onValidationError('O link é obrigatório — sem ele o botão "Assistir" não leva a lugar nenhum.')
      return
    }

    // Só http e https. Sem essa checagem, um "javascript:..." colado aqui viraria código
    // executável no navegador de quem clicasse no botão de assistir.
    if (!/^https?:\/\//i.test(endereco)) {
      onValidationError('O link precisa começar com http:// ou https://')
      return
    }

    const payload: CuratedExternalLink = { platform: plataforma.trim(), url: endereco }

    if (emEdicao) {
      onUpdate(editIndex, payload)
    } else {
      onAdd(payload)
    }

    cancelarEdicao()
  }

  const editar = (index: number, link: CuratedExternalLink) => {
    setEditIndex(index)
    setPlataforma(link.platform)
    setUrl(link.url)
  }

  const remover = (index: number) => {
    if (editIndex === index) cancelarEdicao()
    onRemove(index)
  }

  return (
    <div className="p-4 border border-line bg-panel-2 rounded-xl w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-bold text-muted uppercase">Onde Assistir</h4>
        <span className="text-[10px] text-muted-2">Toque no link para editar</span>
      </div>
      <p className="text-[10px] text-muted-2 mb-4">
        Cadastrar qualquer link aqui substitui todos os da AniList para este anime.
      </p>

      <div className={`flex flex-col sm:flex-row sm:items-end gap-3 mb-4 p-3 rounded-lg border transition-colors ${emEdicao ? 'bg-holo-3/5 border-holo-3' : 'bg-panel border-line'}`}>
        <div className="sm:w-44 shrink-0">
          <label className="block text-[10px] mb-1 font-bold text-muted">Plataforma</label>
          <input
            type="text"
            list="plataformas-sugeridas"
            value={plataforma}
            onChange={(e) => setPlataforma(e.target.value)}
            className="w-full bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none focus:border-holo-2 text-text"
            placeholder="Crunchyroll"
          />
          <datalist id="plataformas-sugeridas">
            {PLATAFORMAS_SUGERIDAS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <div className="flex-1 min-w-0">
          <label className="block text-[10px] mb-1 font-bold text-muted">Link</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none focus:border-holo-2 text-text"
            placeholder="https://"
          />
        </div>

        <div className="flex items-end gap-2">
          {emEdicao && (
            <button
              onClick={cancelarEdicao}
              aria-label="Cancelar edição"
              className="bg-panel-2 border border-line text-muted p-1.5 rounded cursor-pointer hover:text-white transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          )}

          <button
            onClick={salvar}
            aria-label={emEdicao ? 'Salvar edição' : 'Adicionar link'}
            className={`${emEdicao ? 'bg-holo-3 text-void' : 'bg-holo-2 text-white'} p-1.5 rounded cursor-pointer hover:opacity-80 shrink-0 transition-colors shadow-lg`}
          >
            {emEdicao ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>

      {links.length > 0 && (
        <div className="flex flex-col gap-2">
          {links.map((link, index) => {
            const editando = editIndex === index
            return (
              <div
                key={index}
                onClick={() => editar(index, link)}
                className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                  editando ? 'bg-panel ring-1 ring-holo-3 border-holo-3' : 'bg-panel border-line hover:border-muted-2'
                }`}
              >
                <ExternalLink size={14} className={editando ? 'text-holo-3 shrink-0' : 'text-muted-2 shrink-0'} />
                <div className="min-w-0 flex-1">
                  <div className={`text-[11px] font-bold ${editando ? 'text-holo-3' : 'text-text'}`}>{link.platform}</div>
                  <div className="text-[10px] text-muted-2 truncate font-mono">{link.url}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    remover(index)
                  }}
                  aria-label={`Remover link da ${link.platform}`}
                  className="bg-panel-2 border border-line text-muted p-1.5 rounded cursor-pointer hover:text-coral hover:border-coral transition-colors shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
