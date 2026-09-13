import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export type RotuloOrfao = {
  raw_name: string
  animes: number
  veio_de_curadoria: boolean
}

export type RankingSettings = {
  peso_voto_comunitario: number
  peso_padrao: number
  ultimo_ciclo: string
  total_animes: number
}

export type UsoBucket = {
  arquivos: number
  bytes: number
  vazio: boolean
}

export type TesteAniList = {
  respondeu: boolean
  detalhe?: string
}

// Todas as rotas daqui são de admin e exigem o JWT. Centralizado numa função só
// para não repetir o getSession em cada chamada — e porque esquecer o header em
// uma delas devolveria o index.html do frontend em vez de um erro, que foi
// exatamente o que confundiu no teste manual.
const comToken = async (url: string, init: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sessão expirada')

  return fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${session.access_token}` },
  })
}

export function useControle() {
  const [ranking, setRanking] = useState<RankingSettings | null>(null)
  const [orfaos, setOrfaos] = useState<RotuloOrfao[]>([])
  const [bucket, setBucket] = useState<UsoBucket | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [salvandoPeso, setSalvandoPeso] = useState(false)
  const [recalculando, setRecalculando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [testeAniList, setTesteAniList] = useState<TesteAniList | null>(null)

  // As três leituras são independentes e vão em paralelo: uma falhando não deve
  // esconder as outras duas. O allSettled (e não o all) é o que garante isso.
  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    const [r, o, b] = await Promise.allSettled([
      comToken('/api/admin/ranking/settings').then(res => res.json()),
      comToken('/api/admin/diagnostico/rotulos-orfaos').then(res => res.json()),
      comToken('/api/admin/diagnostico/bucket').then(res => res.json()),
    ])

    if (r.status === 'fulfilled') setRanking(r.value)
    if (o.status === 'fulfilled') setOrfaos(Array.isArray(o.value) ? o.value : [])
    if (b.status === 'fulfilled') setBucket(b.value)

    if ([r, o, b].some(p => p.status === 'rejected')) {
      setErro('Parte do diagnóstico não pôde ser carregada.')
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Devolve a mensagem de erro em vez de lançar: quem chama exibe no toast, e
  // peso recusado pelo servidor não é exceção — é resposta.
  const salvarPeso = async (valor: number): Promise<string | null> => {
    setSalvandoPeso(true)
    try {
      const res = await comToken('/api/admin/ranking/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peso_voto_comunitario: valor }),
      })
      if (!res.ok) return (await res.text()).trim() || 'Não foi possível salvar o peso.'

      setRanking(atual => (atual ? { ...atual, peso_voto_comunitario: valor } : atual))
      return null
    } catch {
      return 'Erro de conexão ao salvar o peso.'
    } finally {
      setSalvandoPeso(false)
    }
  }

  // O endpoint devolve 202 e o ciclo roda em background por ~20s. Não dá para
  // esperar o resultado, então o botão só confirma que começou — recarregar os
  // dados aqui traria o ciclo ANTIGO e pareceria que nada aconteceu.
  const recalcular = async (): Promise<boolean> => {
    setRecalculando(true)
    try {
      const res = await comToken('/api/admin/ranking/recalcular', { method: 'POST' })
      return res.ok
    } catch {
      return false
    } finally {
      setRecalculando(false)
    }
  }

  const testarAniList = async () => {
    setTestando(true)
    setTesteAniList(null)
    try {
      const res = await comToken('/api/admin/system/testar-anilist', { method: 'POST' })
      setTesteAniList(await res.json())
    } catch {
      setTesteAniList({ respondeu: false, detalhe: 'Não foi possível executar o teste.' })
    } finally {
      setTestando(false)
    }
  }

  return {
    ranking, orfaos, bucket,
    carregando, erro, carregar,
    salvarPeso, salvandoPeso,
    recalcular, recalculando,
    testarAniList, testando, testeAniList,
  }
}