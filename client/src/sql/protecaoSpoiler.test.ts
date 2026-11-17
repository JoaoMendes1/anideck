// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { autenticarComo, criarBancoTeste, criarUsuarioTeste } from './bancoDeTeste'

const AUTOR = '00000000-0000-4000-8000-000000000801'
const LEITOR_VIU = '00000000-0000-4000-8000-000000000802'
const LEITOR_NAO_VIU = '00000000-0000-4000-8000-000000000803'

describe('Proteção contra spoiler (#274 · sql/108)', () => {
  it('grava contem_spoiler e só devolve texto/sinalizador no feed para quem assistiu ao episódio', async () => {
    const db = await criarBancoTeste()
    await criarUsuarioTeste(db, AUTOR, 'autor_sp', 'Autor')
    await criarUsuarioTeste(db, LEITOR_VIU, 'leitor_viu', 'Leitor Que Viu')
    await criarUsuarioTeste(db, LEITOR_NAO_VIU, 'leitor_nao_viu', 'Leitor Novo')

    await db.query(
      `INSERT INTO public.anime_metadata_cache (mal_id, title, episodes)
       VALUES (16498, 'Shingeki no Kyojin', 25)`,
    )

    await autenticarComo(db, AUTOR)
    await db.query(
      `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
       VALUES ($1, 16498, 12, now())`,
      [AUTOR],
    )
    const { rows: inserted } = await db.query<{ id: string; contem_spoiler: boolean }>(
      `INSERT INTO public.episode_comments (user_id, mal_id, episode_number, texto, contem_spoiler)
       VALUES ($1, 16498, 12, 'O ||titã blindado|| apareceu!', true)
       RETURNING id, contem_spoiler`,
      [AUTOR],
    )
    expect(inserted[0].contem_spoiler).toBe(true)

    await db.query(
      `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
       VALUES ($1, 16498, 12, now())`,
      [LEITOR_VIU],
    )

    // Quem viu o episódio recebe o texto + contem_spoiler = true para borrar na tela até clicar.
    const { rows: feedViu } = await db.query<{
      tipo: string
      texto: string | null
      texto_oculto: boolean
      contem_spoiler: boolean
    }>(
      `SELECT tipo, texto, texto_oculto, contem_spoiler
         FROM public.atividade_eventos($1, NULL, NULL, 20)
        WHERE tipo = 'comentou'`,
      [LEITOR_VIU],
    )
    expect(feedViu).toHaveLength(1)
    expect(feedViu[0].texto).toBe('O ||titã blindado|| apareceu!')
    expect(feedViu[0].texto_oculto).toBe(false)
    expect(feedViu[0].contem_spoiler).toBe(true)

    // Quem ainda NÃO assistiu continua bloqueado no banco: sem texto e sem vazar sinalização.
    const { rows: feedNaoViu } = await db.query<{
      tipo: string
      texto: string | null
      texto_oculto: boolean
      contem_spoiler: boolean
    }>(
      `SELECT tipo, texto, texto_oculto, contem_spoiler
         FROM public.atividade_eventos($1, NULL, NULL, 20)
        WHERE tipo = 'comentou'`,
      [LEITOR_NAO_VIU],
    )
    expect(feedNaoViu).toHaveLength(1)
    expect(feedNaoViu[0].texto).toBeNull()
    expect(feedNaoViu[0].texto_oculto).toBe(true)
    expect(feedNaoViu[0].contem_spoiler).toBe(false)

    // feed_comunidade retorna jsonb com a chave contem_spoiler
    const { rows: jsonFeed } = await db.query<{ evento: Record<string, unknown> }>(
      `SELECT public.feed_comunidade($1, 'geral', NULL, 20) AS evento`,
      [LEITOR_VIU],
    )
    const comentado = jsonFeed.map((r) => r.evento).find((e) => e.tipo === 'comentou')
    expect(comentado?.contem_spoiler).toBe(true)
  })
})
