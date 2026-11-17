// client/src/pages/Feed.tsx
// Feed da comunidade: o que os perfis públicos andam assistindo, completando, comentando e
// curtindo. Aba Geral (todos) e Seguindo (só quem você segue), guardada em ?aba=.
import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EyeOff, Globe, Lock, UserPlus, Users } from 'lucide-react'
import ListaDeAtividade from '../components/social/ListaDeAtividade'
import { obterFeed, type AbaDoFeed } from '../lib/social'

const ABAS: { id: AbaDoFeed; rotulo: string; Icone: typeof Globe }[] = [
  { id: 'geral', rotulo: 'Geral', Icone: Globe },
  { id: 'seguindo', rotulo: 'Seguindo', Icone: Users },
]

export default function Feed() {
  const [params, setParams] = useSearchParams()
  const aba: AbaDoFeed = params.get('aba') === 'seguindo' ? 'seguindo' : 'geral'

  const carregar = useCallback(async (antes?: string) => {
    const r = await obterFeed(aba, antes)
    return r.dados ?? null
  }, [aba])

  return (
    <div className="w-full min-w-0 max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-28">
      <header className="mb-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted m-0">// comunidade</p>
        <h1 className="font-anton text-3xl sm:text-4xl uppercase m-0">Feed</h1>
        <p className="text-sm text-muted m-0 mt-1 max-w-xl">O que a comunidade anda assistindo, completando e comentando nos últimos 60 dias.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
        <section className="min-w-0">
          <div role="tablist" aria-label="Abas do feed" className="inline-flex p-1 mb-4 rounded-2xl border border-line bg-panel">
            {ABAS.map(({ id, rotulo, Icone }) => {
              const ativa = aba === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={ativa}
                  onClick={() => setParams(id === 'geral' ? {} : { aba: id }, { replace: true })}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                    ativa ? 'bg-holo-3/15 text-holo-3 border border-holo-3/40' : 'text-muted hover:text-text border border-transparent'
                  }`}
                >
                  <Icone size={15} aria-hidden /> {rotulo}
                </button>
              )
            })}
          </div>

          <div className="rounded-2xl border border-line bg-panel px-4 sm:px-5 py-1">
            <ListaDeAtividade
              chave={aba}
              carregar={carregar}
              vazio={
                aba === 'seguindo' ? (
                  <span className="inline-flex flex-col items-center gap-2">
                    Você ainda não segue ninguém, ou quem você segue não fez nada nos últimos 60 dias.
                    <Link to="/membros" className="inline-flex items-center gap-1.5 font-bold text-holo-3 hover:underline">
                      <UserPlus size={15} aria-hidden /> Encontrar gente para seguir
                    </Link>
                  </span>
                ) : (
                  'Ninguém compartilhou atividade nos últimos 60 dias.'
                )
              }
            />
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-line bg-panel p-4">
            <h2 className="font-anton text-base uppercase m-0 mb-2">Quem aparece aqui</h2>
            <ul className="m-0 p-0 list-none space-y-2 text-sm text-muted">
              <li className="flex gap-2"><Globe size={15} className="shrink-0 mt-0.5 text-holo-3" aria-hidden /> Só perfis públicos.</li>
              <li className="flex gap-2"><Lock size={15} className="shrink-0 mt-0.5 text-holo-3" aria-hidden /> Comentário de episódio que você ainda não viu fica escondido, para não dar spoiler.</li>
              <li className="flex gap-2"><EyeOff size={15} className="shrink-0 mt-0.5 text-holo-3" aria-hidden /> Quem prefere não aparecer desliga a atividade e continua com o perfil público.</li>
            </ul>
            <Link to="/configuracoes#comunidade" className="mt-3 inline-flex text-sm font-bold text-holo-3 hover:underline">
              Mudar o que eu compartilho
            </Link>
          </div>
          <Link to="/membros" className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4 hover:border-holo-3/60 transition-colors">
            <span className="w-10 h-10 shrink-0 grid place-items-center rounded-xl bg-holo-3/15 text-holo-3"><UserPlus size={18} aria-hidden /></span>
            <span className="min-w-0">
              <span className="block font-bold text-sm">Encontrar gente para seguir</span>
              <span className="block text-xs text-muted">Abra um perfil no ranking e toque em Seguir.</span>
            </span>
          </Link>
        </aside>
      </div>
    </div>
  )
}
