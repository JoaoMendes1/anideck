// client/src/components/CuradoriaEpisodios.tsx
// Editor dos episódios curados. Mesmo molde do CuradoriaPersonagens.
//
// A regra que rege este componente inteiro: o NÚMERO do episódio é imutável depois de
// existir. `episode_progress` referencia esse número e não há chave estrangeira entre as
// duas tabelas — renumerar faz o progresso já marcado pelo usuário apontar para o episódio
// errado, sem erro e sem aviso. Por isso o campo fica travado ao editar: corrigir um
// episódio significa mudar o conteúdo, nunca o número.
import { useState } from 'react'
import { Plus, Trash2, UploadCloud, Check, X, Lock, DownloadCloud, ListPlus } from 'lucide-react'
import type { CuratedEpisode } from '../types/curation'

interface CuradoriaEpisodiosProps {
  episodes: CuratedEpisode[]
  onAdd: (ep: CuratedEpisode) => void
  onUpdate: (index: number, ep: CuratedEpisode) => void
  onRemove: (index: number) => void
  onUploadImage: (file: File) => Promise<string | null>
  uploading: boolean
  onValidationError: (msg: string) => void
  /** Busca os episódios na AniList. Devolve null quando falha — o erro já foi informado. */
  onImportar: () => Promise<CuratedEpisode[] | null>
  importando: boolean
  /** Substitui a lista inteira. Usado pelas duas formas de preencher de uma vez. */
  onDefinirLista: (eps: CuratedEpisode[]) => void
}

// Teto para a geração de episódios vazios. Um anime longo passa de 500 episódios, mas quem
// cadastra One Piece pela grade do Painel tem um problema maior — e o número existe para
// impedir que um dígito a mais trave o navegador montando 99 mil campos.
const MAX_EPISODIOS_GERADOS = 500

export default function CuradoriaEpisodios({
  episodes,
  onAdd,
  onUpdate,
  onRemove,
  onUploadImage,
  uploading,
  onValidationError,
  onImportar,
  importando,
  onDefinirLista,
}: CuradoriaEpisodiosProps) {
  const [numero, setNumero] = useState('')
  const [titulo, setTitulo] = useState('')
  const [imagem, setImagem] = useState('')
  const [dataExibicao, setDataExibicao] = useState('')
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [totalParaGerar, setTotalParaGerar] = useState('')

  const emEdicao = editIndex !== null

  // Junta uma lista vinda de fora com a que já está na tela.
  //
  // O que já foi curado sempre vence: importar de novo depois de corrigir três episódios não
  // pode desfazer as correções. Os de fora só preenchem as lacunas.
  const mesclar = (novos: CuratedEpisode[]) => {
    const porNumero = new Map<number, CuratedEpisode>()
    for (const ep of episodes) porNumero.set(ep.number, ep)
    for (const ep of novos) {
      if (!porNumero.has(ep.number)) porNumero.set(ep.number, ep)
    }
    onDefinirLista([...porNumero.values()].sort((a, b) => a.number - b.number))
  }

  const importar = async () => {
    const lista = await onImportar()
    if (!lista) return // a falha já virou mensagem para o usuário
    if (lista.length === 0) {
      onValidationError('A AniList não tem episódios cadastrados para este anime. Use "Gerar vazios".')
      return
    }
    mesclar(lista)
  }

  const gerarVazios = () => {
    const total = Number(totalParaGerar)
    if (!totalParaGerar.trim() || !Number.isInteger(total) || total < 1) {
      onValidationError('Informe quantos episódios o anime tem.')
      return
    }
    if (total > MAX_EPISODIOS_GERADOS) {
      onValidationError(`Máximo de ${MAX_EPISODIOS_GERADOS} episódios de uma vez.`)
      return
    }

    mesclar(Array.from({ length: total }, (_, i) => ({ number: i + 1, title: '', image: '', aired_at: '' })))
    setTotalParaGerar('')
  }

  const cancelarEdicao = () => {
    setEditIndex(null)
    setNumero('')
    setTitulo('')
    setImagem('')
    setDataExibicao('')
  }

  const salvar = () => {
    const num = Number(numero)

    if (!numero.trim() || !Number.isInteger(num) || num < 1) {
      onValidationError('O número do episódio é obrigatório e precisa ser inteiro a partir de 1.')
      return
    }

    // Número repetido criaria dois episódios disputando a mesma posição na grade.
    const jaExiste = episodes.some((ep, i) => ep.number === num && i !== editIndex)
    if (jaExiste) {
      onValidationError(`Já existe um episódio ${num} cadastrado.`)
      return
    }

    const payload: CuratedEpisode = {
      number: num,
      title: titulo.trim(),
      image: imagem.trim(),
      aired_at: dataExibicao,
    }

    if (emEdicao) {
      onUpdate(editIndex, payload)
    } else {
      onAdd(payload)
    }

    cancelarEdicao()
  }

  const editar = (index: number, ep: CuratedEpisode) => {
    setEditIndex(index)
    setNumero(String(ep.number))
    setTitulo(ep.title || '')
    setImagem(ep.image || '')
    setDataExibicao(ep.aired_at || '')
  }

  const remover = (index: number) => {
    if (editIndex === index) cancelarEdicao()
    onRemove(index)
  }

  const enviarArquivo = async (file: File) => {
    const url = await onUploadImage(file)
    if (url) setImagem(url)
  }

  // Ordena só para exibir. O índice real do array é preservado para o onUpdate/onRemove
  // acertarem o item certo mesmo com a lista fora de ordem.
  const ordenados = episodes
    .map((ep, index) => ({ ep, index }))
    .sort((a, b) => a.ep.number - b.ep.number)

  return (
    <div className="p-4 border border-line bg-panel-2 rounded-xl w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-bold text-muted uppercase">Episódios Curados</h4>
        <span className="text-[10px] text-muted-2">Toque no episódio para editar</span>
      </div>
      <p className="text-[10px] text-muted-2 mb-3">
        Só o que você cadastrar aqui substitui a AniList — os demais episódios continuam vindo dela.
      </p>

      {/* Preencher de uma vez. Dois caminhos porque um depende da AniList estar no ar e o
          outro não — e foi a queda dela que originou esta fase inteira. */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 p-2.5 rounded-lg bg-panel border border-line">
        <button
          type="button"
          onClick={importar}
          disabled={importando}
          className="flex items-center justify-center gap-1.5 text-[11px] font-bold bg-holo-3/10 text-holo-3 border border-holo-3/30 px-3 py-1.5 rounded-md hover:bg-holo-3/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <DownloadCloud size={13} />
          {importando ? 'Importando...' : 'Importar da AniList'}
        </button>

        <span className="hidden sm:block w-px h-5 bg-line shrink-0" aria-hidden="true"></span>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max={MAX_EPISODIOS_GERADOS}
            step="1"
            value={totalParaGerar}
            onChange={(e) => setTotalParaGerar(e.target.value)}
            placeholder="12"
            aria-label="Quantidade de episódios a gerar"
            className="w-16 bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none focus:border-holo-2 text-text tabular-nums"
          />
          <button
            type="button"
            onClick={gerarVazios}
            className="flex items-center gap-1.5 text-[11px] font-bold bg-panel-2 text-muted border border-line px-3 py-1.5 rounded-md hover:border-holo-2 hover:text-text transition-colors cursor-pointer shrink-0"
          >
            <ListPlus size={13} />
            Gerar vazios
          </button>
        </div>

        <span className="text-[9.5px] text-muted-2 sm:ml-auto">O que você já curou nunca é sobrescrito</span>
      </div>

      <div className={`flex flex-col sm:flex-row sm:items-end gap-3 mb-4 p-3 rounded-lg border transition-colors ${emEdicao ? 'bg-holo-3/5 border-holo-3' : 'bg-panel border-line'}`}>
        <div className="sm:w-20 shrink-0">
          <label className="block text-[10px] mb-1 font-bold text-muted">
            {emEdicao ? <span className="inline-flex items-center gap-1">Nº <Lock size={9} /></span> : 'Nº'}
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={numero}
            disabled={emEdicao}
            onChange={(e) => setNumero(e.target.value)}
            title={emEdicao ? 'O número não muda depois de cadastrado — o progresso dos usuários depende dele' : undefined}
            className="w-full bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none focus:border-holo-2 text-text disabled:opacity-50 disabled:cursor-not-allowed tabular-nums"
          />
        </div>

        <div className="flex-1 min-w-0">
          <label className="block text-[10px] mb-1 font-bold text-muted">Título</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none focus:border-holo-2 text-text"
          />
        </div>

        <div className="flex-1 min-w-0">
          <label className="block text-[10px] mb-1 font-bold text-muted">Imagem ou Enviar</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={imagem}
              onChange={(e) => setImagem(e.target.value)}
              className="flex-1 min-w-0 bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none focus:border-holo-2 text-text"
              placeholder="https://"
            />
            <label className="bg-panel-2 border border-line p-1.5 rounded cursor-pointer hover:border-holo-3 text-muted shrink-0 transition-colors">
              <UploadCloud size={14} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) enviarArquivo(file)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1 sm:flex-none">
            <label className="block text-[10px] mb-1 font-bold text-muted">Exibição</label>
            <input
              type="date"
              value={dataExibicao}
              onChange={(e) => setDataExibicao(e.target.value)}
              className="w-full sm:w-auto bg-panel-2 border border-line rounded px-2 py-1.5 text-xs outline-none focus:border-holo-2 text-text"
            />
          </div>

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
            aria-label={emEdicao ? 'Salvar edição' : 'Adicionar episódio'}
            className={`${emEdicao ? 'bg-holo-3 text-void' : 'bg-holo-2 text-white'} p-1.5 rounded cursor-pointer hover:opacity-80 shrink-0 transition-colors shadow-lg`}
          >
            {emEdicao ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>

      {ordenados.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4 pt-2 w-full custom-scrollbar touch-pan-x snap-x snap-mandatory">
          {ordenados.map(({ ep, index }) => {
            const editando = editIndex === index
            return (
              <div
                key={index}
                onClick={() => editar(index, ep)}
                className={`w-32 shrink-0 relative group cursor-pointer rounded-lg p-1 transition-all snap-start ${
                  editando ? 'bg-panel-2 ring-1 ring-holo-3 shadow-[0_0_15px_rgba(63,224,240,0.15)]' : 'hover:bg-panel'
                }`}
              >
                <div className="w-full h-20 rounded-md border border-line mb-1.5 overflow-hidden bg-void relative">
                  {ep.image ? (
                    <img src={ep.image} alt={ep.title || `Episódio ${ep.number}`} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-muted-2 uppercase font-bold leading-tight bg-panel/50">
                      <UploadCloud size={16} className="mb-1 opacity-50" />
                      NO<br />IMAGE
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      remover(index)
                    }}
                    aria-label={`Remover episódio ${ep.number}`}
                    className="absolute top-1 right-1 bg-coral text-white p-1.5 rounded-md opacity-100 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer transition-opacity active:bg-coral/80 shadow-md"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className={`text-[10px] font-bold font-mono tabular-nums ${editando ? 'text-holo-3' : 'text-holo-2'}`}>EP {ep.number}</div>
                <div className="text-[10px] text-text truncate">{ep.title || <span className="text-muted-2">sem título</span>}</div>
                {ep.aired_at && <div className="text-[9px] text-muted-2 font-mono tabular-nums">{ep.aired_at}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
