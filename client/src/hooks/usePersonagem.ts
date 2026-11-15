// client/src/hooks/usePersonagem.ts
// Personagem de quem está logado, para o palco do herói na Início. A memória de tela evita
// buscar de novo ao voltar para a página; a busca compartilhada, pedidos em duplicidade.
import { useEffect, useState } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import { chaveDoUsuario, guardarNaMemoria, lerDaMemoria } from '../lib/cacheDeTela'
import { buscarUmaVez } from '../lib/buscaCompartilhada'
import { obterPersonagem, type RespostaPersonagem } from '../lib/personagem'

interface EstadoDoPersonagem {
  dados: RespostaPersonagem | null
  /** true até a primeira resposta, com sucesso ou falha. */
  carregando: boolean
}

export function usePersonagem(): EstadoDoPersonagem {
  const { session } = useSessao()
  const chave = chaveDoUsuario(session?.user.id, 'personagem')
  const emMemoria = lerDaMemoria<RespostaPersonagem>(chave) ?? null
  const [dados, setDados] = useState<RespostaPersonagem | null>(emMemoria)
  const [carregando, setCarregando] = useState(emMemoria === null)

  useEffect(() => {
    if (!chave) return
    let ativo = true
    buscarUmaVez(chave, async () => {
      const resposta = await obterPersonagem()
      if (!resposta) throw new Error('personagem indisponível')
      return resposta
    })
      .then((resposta) => {
        guardarNaMemoria(chave, resposta)
        if (ativo) setDados(resposta)
      })
      .catch(() => {
        // Sem personagem na tela, o palco mostra a insígnia; nada a avisar.
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [chave])

  return { dados, carregando }
}
