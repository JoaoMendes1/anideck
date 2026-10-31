import { useEffect, useState } from 'react'

export type CamadaPublica = 'genero' | 'demografia' | 'tag_tematica'

/** Um rótulo da taxonomia como a Busca o mostra (GET /api/taxonomia). */
export type Rotulo = {
  nome: string
  camada: CamadaPublica
  /** Quantos animes curados têm o rótulo entre as tags principais. */
  curados: number
}

// A lista muda só quando o admin edita a taxonomia. Guardar em memória evita
// uma requisição a cada vez que a Busca abre na mesma sessão.
let rotulosEmMemoria: Rotulo[] | null = null

export function useRotulos() {
  const [rotulos, setRotulos] = useState<Rotulo[]>(rotulosEmMemoria ?? [])
  const [indisponivel, setIndisponivel] = useState(false)

  useEffect(() => {
    if (rotulosEmMemoria) return
    let ativo = true
    fetch('/api/taxonomia')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((lista: unknown) => {
        rotulosEmMemoria = Array.isArray(lista) ? (lista as Rotulo[]) : []
        if (ativo) setRotulos(rotulosEmMemoria)
      })
      .catch(() => {
        if (ativo) setIndisponivel(true)
      })
    return () => {
      ativo = false
    }
  }, [])

  return { rotulos, indisponivel }
}
