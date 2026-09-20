import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export type RotuloOrfao = {
  raw_name: string
  animes: number
  veio_de_curadoria: boolean
}

export type AnimeDoRotulo = {
  raw_name: string
  mal_id: number
  titulo: string | null
  veio_de_curadoria: boolean
  curated_id: string | null
}

export type RankingSettings = {
  peso_voto_comunitario: number
  peso_padrao: number
  ultimo_ciclo: string
  total_animes: number
}

export type TagOlheiro = {
  raw_name: string
  rotulo: string
  camada: string
  peso: number
  ativo: boolean
}

export type RotuloDisponivel = {
  raw_name: string
  rotulo: string
  camada: string
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

export type Camada = 'genero' | 'tag_tematica' | 'demografia' | 'ignorado'

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

// As ações de escrita devolvem a mensagem de erro em vez de lançar: recusa do
// servidor não é exceção, é resposta — e quem chama precisa do texto para o toast.
const comTokenJSON = async (url: string, metodo: string, corpo: unknown) =>
  comToken(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })

export function useControle() {
  const [ranking, setRanking] = useState<RankingSettings | null>(null)
  const [orfaos, setOrfaos] = useState<RotuloOrfao[]>([])
  const [bucket, setBucket] = useState<UsoBucket | null>(null)
  const [tagsOlheiro, setTagsOlheiro] = useState<TagOlheiro[]>([])
  const [limiteOlheiro, setLimiteOlheiro] = useState(10)
  const [disponiveisOlheiro, setDisponiveisOlheiro] = useState<RotuloDisponivel[]>([])

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [salvandoPeso, setSalvandoPeso] = useState(false)
  const [recalculando, setRecalculando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [testeAniList, setTesteAniList] = useState<TesteAniList | null>(null)

  // Cache dos animes por rótulo. Só é buscado quando o chip é aberto: são 5 a 10
  // rótulos e buscar todos de antemão seria uma requisição por chip para uma
  // lista que o usuário talvez nem abra.
  const [animesPorRotulo, setAnimesPorRotulo] = useState<Record<string, AnimeDoRotulo[]>>({})
  const [carregandoRotulo, setCarregandoRotulo] = useState<string | null>(null)

  const [aplicando, setAplicando] = useState(false)

  // As três leituras são independentes e vão em paralelo: uma falhando não deve
  // esconder as outras duas. O allSettled (e não o all) é o que garante isso.
  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    const [r, o, b, t, s, d] = await Promise.allSettled([
      comToken('/api/admin/ranking/settings').then(res => res.json()),
      comToken('/api/admin/diagnostico/rotulos-orfaos').then(res => res.json()),
      comToken('/api/admin/diagnostico/bucket').then(res => res.json()),
      comToken('/api/admin/olheiro/tags').then(res => res.json()),
      comToken('/api/admin/olheiro/settings').then(res => res.json()),
      comToken('/api/admin/olheiro/disponiveis').then(res => res.json()),
    ])

    if (r.status === 'fulfilled') setRanking(r.value)
    if (o.status === 'fulfilled') setOrfaos(Array.isArray(o.value) ? o.value : [])
    if (b.status === 'fulfilled') setBucket(b.value)
    if (t.status === 'fulfilled') setTagsOlheiro(Array.isArray(t.value) ? t.value : [])
    if (s.status === 'fulfilled' && s.value?.limite_sugestoes > 0) {
      setLimiteOlheiro(s.value.limite_sugestoes)
    }
    // Fora da checagem de erro abaixo: a AniList fora do ar não pode pintar a tela
    // inteira de vermelho — só deixa a lista de rótulos disponíveis vazia.
    if (d.status === 'fulfilled') {
      setDisponiveisOlheiro(Array.isArray(d.value) ? d.value : [])
    }

    if ([r, o, b, t, s].some(p => p.status === 'rejected')) {
      setErro('Parte do diagnóstico não pôde ser carregada.')
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Sem recarregar tudo: o valor exibido é o que o usuário acabou de escolher, e
  // uma nova rodada de leituras só piscaria a tela.
  const salvarLimiteOlheiro = async (valor: number): Promise<string | null> => {
    try {
      const res = await comTokenJSON('/api/admin/olheiro/settings', 'PUT', {
        limite_sugestoes: valor,
      })
      if (!res.ok) return (await res.text()).trim() || 'Não foi possível salvar o limite.'

      setLimiteOlheiro(valor)
      return null
    } catch {
      return 'Erro de conexão ao salvar o limite.'
    }
  }

  // Devolvem mensagem de erro ou null, no mesmo contrato das outras ações de
  // escrita daqui. Ambas recarregam a lista: o servidor é quem sabe a ordem final.
  const salvarTagOlheiro = async (
    rawName: string, peso: number, ativo: boolean,
  ): Promise<string | null> => {
    setAplicando(true)
    try {
      const res = await comTokenJSON('/api/admin/olheiro/tags', 'PUT', {
        raw_name: rawName, peso, ativo,
      })
      if (!res.ok) return (await res.text()).trim() || 'Não foi possível salvar o peso.'

      await carregar()
      return null
    } catch {
      return 'Erro de conexão ao salvar o peso.'
    } finally {
      setAplicando(false)
    }
  }

  const removerTagOlheiro = async (rawName: string): Promise<string | null> => {
    setAplicando(true)
    try {
      const res = await comToken(`/api/admin/olheiro/tags/${encodeURIComponent(rawName)}`, {
        method: 'DELETE',
      })
      if (!res.ok) return (await res.text()).trim() || 'Não foi possível remover o rótulo.'

      await carregar()
      return null
    } catch {
      return 'Erro de conexão ao remover o rótulo.'
    } finally {
      setAplicando(false)
    }
  }

  const salvarPeso = async (valor: number): Promise<string | null> => {
    setSalvandoPeso(true)
    try {
      const res = await comTokenJSON('/api/admin/ranking/settings', 'PUT', {
        peso_voto_comunitario: valor,
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

  // Busca uma vez e guarda: reabrir o mesmo chip não refaz a requisição. O cache
  // é invalidado inteiro por qualquer escrita, porque renomear uma tag pode mudar
  // a lista de outra.
  const carregarAnimesDoRotulo = useCallback(async (rawName: string) => {
    if (animesPorRotulo[rawName]) return

    setCarregandoRotulo(rawName)
    try {
      const res = await comToken(
        `/api/admin/diagnostico/rotulos-orfaos/animes?raw_name=${encodeURIComponent(rawName)}`,
      )
      const lista = await res.json()
      setAnimesPorRotulo(atual => ({
        ...atual,
        [rawName]: Array.isArray(lista) ? lista : [],
      }))
    } catch {
      setAnimesPorRotulo(atual => ({ ...atual, [rawName]: [] }))
    } finally {
      setCarregandoRotulo(null)
    }
  }, [animesPorRotulo])

  // Depois de qualquer escrita a lista de órfãos muda, e o cache por rótulo fica
  // descrito por um estado que não existe mais.
  const recarregarTudo = async () => {
    setAnimesPorRotulo({})
    await carregar()
  }

  // O sinonimo é opcional e vira uma SEGUNDA linha com o mesmo display_name_pt —
  // é isso que liga os dois textos ao mesmo rótulo. Cadastrar um por vez
  // funcionava, mas exigia lembrar de voltar e fazer o par, e esquecer significa
  // tag que continua caindo em 'ignorado' sem nada avisando.
  //
  // A principal vai primeiro: se ela falhar, não faz sentido criar o sinônimo de
  // um rótulo que não existe. O contrário não vale — sinônimo que falha deixa a
  // principal de pé, e o usuário pode tentar de novo pela lista.
  const cadastrarNaTaxonomia = async (
    rawName: string,
    displayNamePt: string,
    tier: Camada,
    sinonimo?: string,
  ): Promise<string | null> => {
    setAplicando(true)
    try {
      const criar = (raw: string) =>
        comTokenJSON('/api/admin/diagnostico/taxonomia', 'POST', {
          raw_name: raw,
          display_name_pt: displayNamePt,
          tier,
        })

      const res = await criar(rawName)
      if (!res.ok) return (await res.text()).trim() || 'Não foi possível cadastrar.'

      const extra = sinonimo?.trim()
      if (extra && extra !== rawName) {
        const resSin = await criar(extra)
        if (!resSin.ok) {
          await recarregarTudo()
          return `"${rawName}" foi criado, mas "${extra}" não — o nome de entrada já existe?`
        }
      }

      await recarregarTudo()
      return null
    } catch {
      return 'Erro de conexão ao cadastrar o rótulo.'
    } finally {
      setAplicando(false)
    }
  }

  // Duas etapas: sem `confirmado` o servidor só CONTA quantos animes usam o texto,
  // sem apagar nada. Remover uma entrada joga esses animes de volta para
  // 'ignorado' — a tela precisa dizer quantos antes.
  const removerDaTaxonomia = async (
    rawName: string,
    confirmado: boolean,
  ): Promise<{ em_uso: number } | string> => {
    setAplicando(true)
    try {
      const res = await comTokenJSON('/api/admin/diagnostico/taxonomia/remover', 'POST', {
        raw_name: rawName,
        confirmado,
      })
      if (!res.ok) return (await res.text()).trim() || 'Não foi possível remover o rótulo.'

      const dados = await res.json()
      if (confirmado) await recarregarTudo()
      return { em_uso: dados.em_uso }
    } catch {
      return 'Erro de conexão ao remover o rótulo.'
    } finally {
      setAplicando(false)
    }
  }
  const renomearTag = async (
    tagAntiga: string,
    tagNova: string,
  ): Promise<{ afetados: number } | string> => {
    setAplicando(true)
    try {
      const res = await comTokenJSON('/api/admin/diagnostico/tags/renomear', 'POST', {
        tag_antiga: tagAntiga,
        tag_nova: tagNova,
      })
      if (!res.ok) return (await res.text()).trim() || 'Não foi possível renomear.'

      const { afetados } = await res.json()
      await recarregarTudo()
      return { afetados }
    } catch {
      return 'Erro de conexão ao renomear a tag.'
    } finally {
      setAplicando(false)
    }
  }

  const removerTag = async (tag: string): Promise<{ afetados: number } | string> => {
    setAplicando(true)
    try {
      const res = await comTokenJSON('/api/admin/diagnostico/tags/remover', 'POST', { tag })
      if (!res.ok) return (await res.text()).trim() || 'Não foi possível remover.'

      const { afetados } = await res.json()
      await recarregarTudo()
      return { afetados }
    } catch {
      return 'Erro de conexão ao remover a tag.'
    } finally {
      setAplicando(false)
    }
  }

  return {
    ranking, orfaos, bucket, tagsOlheiro,
    carregando, erro, carregar,
    salvarPeso, salvandoPeso,
    recalcular, recalculando,
    testarAniList, testando, testeAniList,
    animesPorRotulo, carregandoRotulo, carregarAnimesDoRotulo,
    cadastrarNaTaxonomia, renomearTag, removerTag, removerDaTaxonomia, aplicando,
    salvarTagOlheiro, removerTagOlheiro,
    limiteOlheiro, salvarLimiteOlheiro, disponiveisOlheiro,
  }
}