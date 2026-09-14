import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export type Camada = 'genero' | 'tag_tematica' | 'demografia' | 'ignorado'

export type EntradaTaxonomia = {
  raw_name: string
  display_name_pt: string
  tier: Camada
}

// Um rótulo do ponto de vista de quem usa: o nome em português e todos os textos
// de entrada que caem nele.
export type RotuloAgrupado = {
  display: string
  tier: Camada
  /** O texto que deve ser GRAVADO ao escolher este rótulo. */
  canonico: string
  /** Todos os raw_name que apontam para este display, inclusive o canônico. */
  entradas: string[]
}

export const CAMADAS: { id: Camada; nome: string; ajuda: string }[] = [
  { id: 'genero', nome: 'Gênero', ajuda: 'Ação, Comédia, Drama' },
  { id: 'tag_tematica', nome: 'Tema', ajuda: 'Magia, Escolar, Militar' },
  { id: 'demografia', nome: 'Demografia', ajuda: 'Shounen, Isekai, Slice of Life' },
  { id: 'ignorado', nome: 'Ignorado', ajuda: 'Não entra em gráfico nenhum' },
]

// Tira acento e caixa para a busca. Sem isto, digitar "acao" não acharia "Ação"
// e "comedia" não acharia "Comédia" — o teclado do celular não põe acento sozinho.
export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const buscarToken = async () => {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

// A taxonomia alimenta o autocomplete do editor e o dashboard de rótulos. Fica
// num hook próprio porque os dois a leem, e são ~90 linhas que mudam raramente.
export function useTaxonomia() {
  const [entradas, setEntradas] = useState<EntradaTaxonomia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const token = await buscarToken()
      const res = await fetch('/api/admin/diagnostico/taxonomia', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Falha ao carregar a taxonomia')
      const lista = await res.json()
      setEntradas(Array.isArray(lista) ? lista : [])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // De raw_name para o nome em português. É esta tabela que permite a um anime
  // importado da AniList com "Action" no banco aparecer como "Ação" na tela.
  const paraExibicao = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of entradas) m.set(e.raw_name, e.display_name_pt)
    return m
  }, [entradas])

  const tierPorRaw = useMemo(() => {
    const m = new Map<string, Camada>()
    for (const e of entradas) m.set(e.raw_name, e.tier)
    return m
  }, [entradas])

  // Agrupa os sinônimos: 'Horror' e 'Terror' viram um rótulo só.
  //
  // O canônico é o raw_name IGUAL ao display_name_pt, porque a curadoria grava em
  // português. Só cai no primeiro da lista se nenhum bater — o sql/032 fechou o
  // único caso em que isso acontecia (Harém Reverso).
  const rotulos = useMemo<RotuloAgrupado[]>(() => {
    const porDisplay = new Map<string, EntradaTaxonomia[]>()
    for (const e of entradas) {
      const atual = porDisplay.get(e.display_name_pt) ?? []
      atual.push(e)
      porDisplay.set(e.display_name_pt, atual)
    }

    return Array.from(porDisplay.entries())
      .map(([display, lista]) => ({
        display,
        tier: lista[0].tier,
        canonico: lista.find(e => e.raw_name === display)?.raw_name ?? lista[0].raw_name,
        entradas: lista.map(e => e.raw_name),
      }))
      .sort((a, b) => a.display.localeCompare(b.display, 'pt-BR'))
  }, [entradas])

  const rawNamesConhecidos = useMemo(
    () => new Set(entradas.map(e => e.raw_name)),
    [entradas],
  )

  return {
    entradas, rotulos, paraExibicao, tierPorRaw, rawNamesConhecidos,
    carregando, erro, recarregar: carregar,
  }
}