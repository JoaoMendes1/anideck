// client/src/hooks/useMeuAvatar.ts
// Avatar de quem está logado: o que salvou (fundo e formato) e o retrato do estágio atual do
// personagem. Usado na barra superior e no menu lateral. Recarrega quando o avatar é salvo
// em Configurações (evento anideck:comunidade-atualizada).
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSessao } from '../contexts/SessaoContext'
import { buscarUmaVez, VALIDADE_NA_MONTAGEM } from '../lib/buscaCompartilhada'
import { usePersonagem } from './usePersonagem'
import { PERSONAGEM_BASE_PADRAO, retratoDoEstagio, visualEmUso } from '../lib/personagem'

export function useMeuAvatar() {
  const { session } = useSessao()
  const uid = session?.user.id
  const { dados: personagem } = usePersonagem()
  const [avatar, setAvatar] = useState<unknown>(null)

  useEffect(() => {
    if (!uid) return
    let ativo = true
    const buscar = (validade: number) =>
      buscarUmaVez(`avatar:${uid}`, async () => {
        const { data } = await supabase.from('profiles').select('avatar_custom').eq('user_id', uid).maybeSingle()
        return (data?.avatar_custom as unknown) ?? null
      }, validade)
        .then(v => { if (ativo) setAvatar(v) })
        .catch(() => {})
    buscar(VALIDADE_NA_MONTAGEM)
    const aoMudar = () => buscar(0)
    window.addEventListener('anideck:comunidade-atualizada', aoMudar)
    return () => { ativo = false; window.removeEventListener('anideck:comunidade-atualizada', aoMudar) }
  }, [uid])

  const retrato = personagem?.existe
    ? retratoDoEstagio(visualEmUso(personagem), personagem.personagem?.personagem_base ?? PERSONAGEM_BASE_PADRAO)
    : undefined

  return { avatar, retrato }
}
