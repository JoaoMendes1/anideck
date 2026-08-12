# Project Structure

```
├── client
│   ├── public
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src
│   │   ├── assets
│   │   │   ├── hero.png
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── components
│   │   │   ├── AnimeCard.tsx
│   │   │   ├── BotaoCopiar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Brand.tsx
│   │   │   ├── DeckCard.tsx
│   │   │   ├── DeckSkeleton.tsx
│   │   │   ├── EditarEntradaModal.tsx
│   │   │   ├── FilterChipGroup.tsx
│   │   │   ├── FilterSheet.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── RankingCard.tsx
│   │   │   ├── RankingSkeleton.tsx
│   │   │   ├── RotaProtegida.tsx
│   │   │   ├── SearchResultCard.tsx
│   │   │   ├── Sheet.tsx
│   │   │   └── StatCard.tsx
│   │   ├── contexts
│   │   │   └── ToastContext.tsx
│   │   ├── hooks
│   │   │   └── useSheetBehavior.ts
│   │   ├── lib
│   │   │   ├── deckHelpers.ts
│   │   │   ├── filters.ts
│   │   │   └── supabase.ts
│   │   ├── pages
│   │   │   ├── Auth.tsx
│   │   │   ├── Busca.tsx
│   │   │   ├── Calendario.tsx
│   │   │   ├── Detalhes.tsx
│   │   │   ├── Landing.tsx
│   │   │   ├── MeuDeck.tsx
│   │   │   ├── PainelAdmin.tsx
│   │   │   └── Rankings.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── cmd
│   └── web
│       └── main.go
├── docs
│   ├── archive
│   │   └── ISSUES-FASE1.md
│   ├── AGENTS.md
│   ├── DECISIONS.md
│   ├── DESIGN_TOKENS.md
│   ├── fluxo-busca.md
│   ├── ideias-para-melhorias.md
│   ├── PAGES.md
│   ├── README.md
│   └── ROADMAP.md
├── internal
│   ├── anilist
│   │   ├── client.go
│   │   ├── interface.go
│   │   ├── mock.go
│   │   └── models.go
│   ├── config
│   │   ├── env_test.go
│   │   └── env.go
│   ├── database
│   │   └── db.go
│   ├── entries
│   │   └── models.go
│   ├── handlers
│   │   ├── anime.go
│   │   ├── curation.go
│   │   ├── entries_test.go
│   │   ├── entries.go
│   │   ├── ranking.go
│   │   ├── search_test.go
│   │   └── search.go
│   ├── middleware
│   │   └── auth.go
│   └── models
│       └── curation.go
├── marketing
│   └── posts-instagram.html
├── prototipos
│   ├── busca-prototipo.html
│   ├── calendario-prototipo.html
│   ├── config-ajuda-prototipo.html
│   ├── dashboard-prototipo.html
│   ├── detalhe-anime-prototipo.html
│   ├── estatisticas-prototipo.html
│   ├── landing-prototipo.html
│   ├── login-prototipo.html
│   ├── logo.html
│   ├── painel-admin-prototipo.html
│   └── rankings-prototipo.html
├── go.mod
├── go.sum
└── project-structure-v3.md
```

# File Contents

## docs/ROADMAP.md

```markdown
# 🗺️ AniDeck — Roadmap

> ✅ **Aviso de Migração (28/07/2026):** O projeto pivotou inteiramente para a **AniList API (GraphQL)** devido à descontinuação iminente do Jikan. Todo o planejamento abaixo reflete essa nova realidade. Ver `DECISIONS.md`.

Segue os mesmos princípios do `AGENTS.md` (issue antes de código, staging antes de produção,
testes em issues com lógica, segurança desde o início, fases numeradas cronologicamente com
espaço para fases `.5` intermediárias).

## 🎯 Onde está o MVP

**Fases 1, 2 e 3** = MVP publicável: fundação + catálogo pessoal (salvar, status, notas, filtro)
+ identidade visual mínima aplicada. Fases 4, 5 e 6 são incrementos sobre um produto já no ar.

## 🚀 Deploy contínuo
Staging sobe já na Fase 1, como projeto esqueleto — mesmo padrão do JVM Systems.
---

## 🏗️ Fase 1: Fundação & Arquitetura — início do MVP

- [x] Inicializar backend Go + Chi (mesma estrutura de pastas dos outros projetos).
- [x] Criar projeto Supabase (banco + auth).
- [x] Schema inicial: tabela `media_entries` (id, mal_id, **tipo** [`anime`/`manga`], status, nota,
      anotação, created_at, updated_at).
- [x] Cliente HTTP em Go para consumir a Jikan API *(Nota histórica: Refatorado na Fase 2)*.
- [x] Subir staging esqueleto.

## 🔐 Fase 2: Catálogo Pessoal

- [x] 🚨 **PIVÔ DE ARQUITETURA:** Substituição completa da Jikan API pela AniList API (GraphQL) devido ao anúncio de desligamento da Jikan. O Go foi refatorado como um *Adapter* (Issue #11) traduzindo os dados de volta para o JSON REST antigo, para salvar o frontend e o banco.
- [x] Busca de anime exibida no frontend. Busca instantânea (estilo Netflix/Prime): grade de pôsteres atualizando enquanto digita, com debounce. Funciona **sem login** — só a ação de salvar exige conta.
- [x] Página de detalhe do anime com: sinopse, onde assistir, temas de abertura/encerramento,
      animes relacionados e **distribuição de notas da comunidade** (como gráfico).
- [x] Salvar/editar/remover entrada na lista pessoal (status, nota, anotação) no Supabase (CRUD - Issue #9).
- [x] Transição de status: Sugerir automaticamente mudar para "Completo" quando a API informar que o anime "Em Dia" terminou.
- [x] Autenticação Supabase funcional (login/cadastro). Rota `/deck` protegida.
- [x] Sanitização de qualquer texto livre inserido pelo usuário (anotações) via `bluemonday` (proteção contra XSS).
- [x] Exibir ranking global de animes baseado na query `Page(sort: SCORE_DESC)` da AniList (Issue #10).
- [x] Filtro por gênero/tag e plataforma de streaming (via campo `externalLinks` da AniList, cruzado em tempo de execução) (Issue #10).
- [x] **Sistema de Cartas Raras:** Funcionalidade de "Favoritos" com UI de carta holográfica (Foil) e organização prioritária no Deck e Rankings.

## 🗂️ Fase 2.5: Curadoria Pessoal (Painel Admin)

- [x] Criar tabela `curated_animes` no Supabase para armazenar destaques editados. 
- [x] Criar rotas no backend (`/api/curation`) para gerenciar (CRUD) od destaques.
- [x] Atualizar rotas de Busca e Ranking para usar a curadoria local como prioridade (Fallback para AniList).
- [x] Construir a interface do Painel Admin em React e conectar ao Backend. 

## 🎨 Fase 3: Identidade Visual — fim do MVP

- [x] Protótipos visuais dedicados (fusão cyberpunk/sci-fi + anime) construídos em HTML/CSS nativo.
- [x] Aplicação da identidade (Design Tokens) nos componentes React reais.
- [x] Responsividade e acessibilidade básica.
- [x] Realizar testes usando Smartphone para ajustes e refinamentos. 

## 📊 Fase 4: Dashboard de Estatísticas (Foco em SQL Avançado)

- [ ] Migrar a lógica de agregação de dados do client/backend para **VIEWS e FUNCTIONS nativas no Postgres (Supabase)**, exigindo domínio de queries complexas.
- [ ] Cálculo de métricas pessoais (tempo assistido, gênero favorito, distribuição por status) direto no banco.
- [ ] Visualização (gráficos) no painel do usuário consumindo essas procedures.

## 🤖 Fase 4.5: Automação e IA Generativa (Integração Google Workspace)

- [ ] **Agente Curador (IA no Admin):** Integrar um LLM para reescrever sinopses frias da AniList de forma autônoma, adotando o tom de voz "AniDeck".
- [ ] **Agente Olheiro (Automação Background):** Criar um fluxo orquestrado (ex: n8n) que cruza os favoritos do usuário (SQL) com os *trends* da AniList.
- [ ] **Integração Google Workspace:** O Agente gera recomendações personalizadas em HTML e utiliza a API do Gmail para disparar um relatório automático para a caixa de entrada do usuário.

## 📅 Fase 5: Smart Tracking, Streaming Direto & Calendário (Killer Feature) Finalizado 10/08/2026 

- [x] **Backend:** Atualizar a query GraphQL do Go para consumir `nextAiringEpisode` e repassar a janela de tempo ao frontend.
- [x] **Meu Deck:** Criar lógica visual de Badge "NOVO EP" para obras "Assistindo" ou "Em Dia" com episódios recém-lançados.
- [x] **Integração de Streaming:** Adicionar botão/ação rápida nos cards do Deck utilizando o campo `externalLinks` da AniList, permitindo pular direto para a Crunchyroll/Netflix.
- [x] **Calendário Personalizado:** Tela mostrando próximos episódios exclusivos da *watchlist* do usuário, agrupados por dia da semana e com contagem regressiva viva.
OBS: O Product Owner decidiu que a fase 5 fosse implementada primeiro. 

## 📰 Fase 6: Notícias de Anime

- [ ] Avaliar fonte externa de notícias (RSS de Anime News Network, Crunchyroll News, ou similar).
- [ ] Job de ingestão periódica.
- [ ] Exibição no frontend.

## 👥 Fase 7: Multiusuário (futuro, avaliar quando chegar)

- [ ] Reavaliar modelo de dados e permissões antes de abrir para outras pessoas.

## 📱 Fase 8: Publicação como App (futuro, avaliar quando chegar)

- [ ] Transformar o frontend num PWA completo (manifest, service worker, instalável).
- [ ] Empacotar via TWA (Trusted Web Activity, usando Bubblewrap/PWABuilder) para publicar na Play Store.

---

## 📋 Backlog / Ideias em Avaliação

- [ ] **Notificações de novas temporadas/sequências** — avisar quando uma sequência/temporada nova é anunciada.

### Avaliado e descartado (documentado pra não reabrir sem contexto)
- **Fórum, Clubes, Blogs:** equivalem a construir uma rede social inteira.
- **Mensageria direta (Inbox):** pressupõe comunidade ativa.
- **News / Featured Articles / MALxJapan:** conteúdo editorial que o MAL produz com equipe própria.
- **Mini-página de Pessoa/Estúdio** — ao clicar num dublador/estúdio na página de Detalhe, ver outros trabalhos dele.
```

## client/src/pages/Auth.tsx

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

export default function Auth() {
  const { showToast } = useToast()
  
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  
  const navigate = useNavigate()

  
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault() 
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        
        navigate('/deck')
      } else {
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } }
        })
        if (error) throw error
        showToast('Conta criada com sucesso! Você já pode fazer login.')
        setIsLogin(true) 
      }
    } catch (err: any) {
      setError(err.message) 
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 z-10">
      {}
      <div className="bg-ambient"></div>

      <div className="w-full max-w-sm z-10">
        {}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-holo-1 via-holo-2 to-holo-3 flex items-center justify-center font-anton text-void text-lg">
            A
          </div>
          <div className="font-anton text-xl">
            Ani<span className="text-holo">Deck</span>
          </div>
        </div>

        {}
        <div className="bg-panel border border-line rounded-[18px] p-8 shadow-2xl">
          <h1 className="font-anton text-2xl uppercase text-center mb-1">
            {isLogin ? 'Bem-vindo de volta' : 'Criar sua conta'}
          </h1>
          <p className="text-muted text-sm text-center mb-6">
            {isLogin ? 'Entre pra ver seu Deck.' : 'Leva menos de 1 minuto.'}
          </p>

          {error && (
            <div className="bg-coral/10 border border-coral/30 text-coral p-3 rounded-lg text-sm mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-muted mb-2">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-holo-3 transition-colors"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-muted mb-2">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-holo-3 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? 'Sua senha secreta' : 'Mínimo 6 caracteres'}
                className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-holo-3 transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl font-extrabold text-sm text-void bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar conta')}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-muted">
            {isLogin ? 'Ainda não tem conta? ' : 'Já tem conta? '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null) }}
              className="text-holo-3 font-bold hover:underline"
            >
              {isLogin ? 'Criar conta' : 'Entrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

## client/src/pages/Busca.tsx

```tsx
import { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import { Search, AlertCircle, SlidersHorizontal, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
    CONTENT_FILTERS, STATUS_OPTIONS, SEASON_OPTIONS,
    type FilterItem, getCategoryTheme
} from '../lib/filters'
import SearchResultCard from '../components/SearchResultCard'
import FilterSheet from '../components/FilterSheet'
import FilterChipGroup from '../components/FilterChipGroup'

interface Anime {
    mal_id: number
    title: string
    status: string
    episodes?: number
    score?: number
    images?: { jpg: { image_url: string } }
    genres?: { name: string }[]
}

interface SavedEntry {
    mal_id: number
    id: string
    is_favorite?: boolean
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i)

const SORT_OPTIONS = [
    { label: 'Mais Populares', value: 'POPULARITY_DESC' },
    { label: 'Em Alta', value: 'TRENDING_DESC' },
    { label: 'Maior Nota', value: 'SCORE_DESC' },
    { label: 'Lançamentos', value: 'START_DATE_DESC' },
]

export default function Busca() {
    const navigate = useNavigate()
    const { showToast } = useToast()

    const [query, setQuery] = useState('')
    const [selectedFilters, setSelectedFilters] = useState<FilterItem[]>([])
    const [selectedStatus, setSelectedStatus] = useState('')
    const [selectedSeason, setSelectedSeason] = useState('')
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedSort, setSelectedSort] = useState('POPULARITY_DESC')
    const [page, setPage] = useState(1)

    const [resultados, setResultados] = useState<Anime[]>([])
    const [loading, setLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [savingIds, setSavingIds] = useState<number[]>([])

    const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([])

    const activeFilterCount =
        selectedFilters.length +
        (selectedStatus ? 1 : 0) +
        (selectedSeason ? 1 : 0) +
        (selectedYear ? 1 : 0) +
        (selectedSort !== 'POPULARITY_DESC' ? 1 : 0)

    useEffect(() => {
        const carregarDeck = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            try {
                const response = await fetch('/api/entries', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                })
                if (response.ok) {
                    const entradas = await response.json()
                    if (entradas && entradas.length > 0) {
                        const idsSalvos = entradas.map((e: any) => ({ mal_id: e.mal_id, id: e.id, is_favorite: e.is_favorite }))
                        setSavedEntries(idsSalvos)
                    }
                }
            } catch (err) {
                console.error('Falha ao sincronizar deck:', err)
            }
        }
        carregarDeck()
    }, [])

    const hasAnyFilter =
        query.trim() !== '' ||
        selectedFilters.length > 0 ||
        !!selectedStatus ||
        !!selectedSeason

    useEffect(() => {
        if (!hasAnyFilter) {
            setResultados([])
            setHasSearched(false)
            setError(null)
            return
        }

        const controller = new AbortController()

        const timer = setTimeout(async () => {
            setLoading(true)
            setHasSearched(true)
            setError(null)

            const params = new URLSearchParams()
            if (query.trim()) params.append('q', query.trim())
            selectedFilters.forEach(f => params.append(f.type === 'genre' ? 'genre' : 'tag', f.value))
            if (selectedStatus) params.set('status', selectedStatus)
            if (selectedSeason) {
                params.set('season', selectedSeason)
                if (selectedYear) params.set('year', selectedYear)
            }
            params.append('sort', selectedSort)
            params.append('page', String(page))
            params.append('perPage', '40')

            try {
                const response = await fetch(`/api/search?${params.toString()}`, {
                    signal: controller.signal
                })

                if (!response.ok) throw new Error('Busca indisponível no momento. Tente novamente mais tarde.')
                const data = await response.json()

                setResultados(prev => page === 1 ? (data.data || []) : [...prev, ...(data.data || [])])

            } catch (err: any) {
                if (err.name === 'AbortError') return
                if (page === 1) setResultados([])
                setError(err.message || 'Falha ao conectar com o servidor.')
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            }
        }, 400)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [query, selectedFilters, selectedStatus, selectedSeason, selectedYear, selectedSort, page, hasAnyFilter])

    const handleSalvar = async (e: React.MouseEvent, malId: number) => {
        e.preventDefault()
        if (savingIds.includes(malId)) return

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { navigate('/login'); return }

        setSavingIds(prev => [...prev, malId])

        const entrySalva = savedEntries.find(e => e.mal_id === malId)

        try {
            if (entrySalva) {
                const res = await fetch(`/api/entries/${entrySalva.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
                if (!res.ok) throw new Error()
                setSavedEntries(prev => prev.filter(e => e.mal_id !== malId))
                showToast('Removido do Deck', 'success')
            } else {
                const res = await fetch('/api/entries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ mal_id: malId, tipo: 'anime', status: 'Quero Assistir' }),
                })
                if (!res.ok) throw new Error()
                const novaEntrada = await res.json()
                setSavedEntries(prev => [...prev, { mal_id: malId, id: novaEntrada.id || novaEntrada[0]?.id, is_favorite: false }])
                showToast('Anime salvo no seu Deck!', 'success')
            }
        } catch {
            showToast('Erro ao processar. Tente novamente.', 'error')
        } finally {
            setSavingIds(prev => prev.filter(id => id !== malId))
        }
    }

    const toggleFilter = (f: FilterItem) => {
        setPage(1)
        setSelectedFilters(prev =>
            prev.some(x => x.value === f.value && x.type === f.type)
                ? prev.filter(x => !(x.value === f.value && x.type === f.type))
                : [...prev, f]
        )
    }

    const clearFilters = () => {
        setSelectedFilters([])
        setSelectedStatus('')
        setSelectedSeason('')
        setSelectedYear('')
        setSelectedSort('POPULARITY_DESC')
        setPage(1)
    }

    const traduzirStatus = (statusOriginal: string) => {
        if (statusOriginal === 'FINISHED' || statusOriginal === 'Finished Airing') return 'Finalizado'
        if (statusOriginal === 'RELEASING' || statusOriginal === 'Currently Airing') return 'Em Lançamento'
        if (statusOriginal === 'NOT_YET_RELEASED' || statusOriginal === 'Not yet aired') return 'Em Breve'
        return statusOriginal
    }

    return (
        <div className="w-full min-w-0 max-w-[960px] mx-auto pt-16 px-5 pb-10">

            <div className="flex items-center gap-3 bg-panel border-2 border-holo-2 rounded-xl p-4 mb-4">
                <Search className="text-muted-2 shrink-0" size={20} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                    placeholder="Buscar anime, gênero, estúdio..."
                    className="bg-transparent border-none outline-none text-text text-base w-full font-manrope placeholder:text-muted-2"
                />
            </div>

            <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-2 scrollbar-hide select-none">
                <button
                    onClick={() => setShowFilters(v => !v)}
                    title="Filtros"
                    className={`inline-flex items-center shrink-0 gap-2 px-4 py-2 rounded-full border text-sm font-bold transition-all duration-200 cursor-pointer ${showFilters || activeFilterCount > 0
                        ? 'border-holo-2 text-holo-2 bg-holo-2/10'
                        : 'border-line text-muted bg-panel hover:border-holo-2 hover:text-holo-2'
                        }`}
                >
                    <SlidersHorizontal size={16} />
                    {activeFilterCount > 0 && (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void text-[10px] font-black">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => { setSelectedStatus(selectedStatus === 'RELEASING' ? '' : 'RELEASING'); setPage(1); }}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer border flex items-center gap-1.5 ${selectedStatus === 'RELEASING'
                        ? 'bg-coral/20 border-coral text-coral shadow-[0_0_10px_rgba(255,92,108,0.2)]'
                        : 'bg-panel-2 border-line text-muted hover:border-coral hover:text-text'
                        }`}
                >
                    🔥 Em Lançamento
                </button>

                {}
                {['Ação', 'Romance', 'Comédia', 'Fantasia', 'Isekai'].map(cat => {
                    const filterObj = CONTENT_FILTERS.find(f => f.label === cat)
                    if (!filterObj) return null;
                    const isActive = selectedFilters.some(x => x.value === filterObj.value)
                    return (
                        <button
                            key={cat}
                            onClick={() => toggleFilter(filterObj)}
                            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer border ${isActive
                                ? `${getCategoryTheme(cat)} shadow-[0_0_10px_currentColor]`
                                : 'bg-panel-2 border-line text-muted hover:border-holo-2 hover:text-text'
                                }`}
                        >
                            {cat}
                        </button>
                    )
                })}

                {!showFilters && activeFilterCount > 0 && (
                    <div className="flex items-center gap-2 flex-nowrap shrink-0 border-l border-line pl-3">
                        {selectedSort !== 'POPULARITY_DESC' && (
                            <span className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-gold text-[11px] font-bold">
                                {SORT_OPTIONS.find(s => s.value === selectedSort)?.label}
                                <button onClick={() => { setSelectedSort('POPULARITY_DESC'); setPage(1) }} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        )}
                        {selectedFilters.filter(f => !['Ação', 'Romance', 'Comédia', 'Fantasia', 'Isekai'].includes(f.label)).map(f => (
                            <span key={`${f.type}-${f.value}`} className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-holo-2/20 border border-holo-2/40 text-holo-2 text-[11px] font-bold">
                                {f.label}
                                <button onClick={() => toggleFilter(f)} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        ))}
                        {selectedStatus && (
                            <span className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-holo-3/20 border border-holo-3/40 text-holo-3 text-[11px] font-bold">
                                {STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}
                                <button onClick={() => { setSelectedStatus(''); setPage(1) }} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        )}
                        {selectedSeason && (
                            <span className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-holo-1/20 border border-holo-1/40 text-holo-1 text-[11px] font-bold">
                                {SEASON_OPTIONS.find(s => s.value === selectedSeason)?.emoji} {SEASON_OPTIONS.find(s => s.value === selectedSeason)?.label} {selectedYear}
                                <button onClick={() => { setSelectedSeason(''); setSelectedYear(''); setPage(1) }} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            <FilterSheet isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filtros Avançados">
                <FilterChipGroup
                    label="Ordenar por"
                    options={SORT_OPTIONS}
                    isActive={(v) => selectedSort === v}
                    onToggle={(v) => { setSelectedSort(v); setPage(1) }}
                    activeClassName="bg-gold/20 border-gold/40 text-gold shadow-[0_0_12px_rgba(255,197,66,0.2)]"
                />

                <FilterChipGroup
                    label="Status"
                    options={STATUS_OPTIONS}
                    isActive={(v) => selectedStatus === v}
                    onToggle={(v) => { setSelectedStatus(selectedStatus === v ? '' : v); setPage(1) }}
                />

                <div className="flex flex-col gap-3">
                    <FilterChipGroup
                        label="Temporada"
                        options={SEASON_OPTIONS}
                        isActive={(v) => selectedSeason === v}
                        onToggle={(v) => {
                            setSelectedSeason(selectedSeason === v ? '' : v)
                            if (selectedSeason === v) setSelectedYear('')
                            setPage(1)
                        }}
                    />

                    <div className="flex flex-wrap gap-2 p-3 bg-panel-2 border border-line rounded-xl">
                        <span className="text-[11px] font-bold text-muted uppercase w-full mb-1">
                            Selecione o Ano {selectedSeason ? '' : '(Escolha uma temporada primeiro)'}:
                        </span>
                        {YEAR_OPTIONS.map(y => (
                            <button
                                key={y}
                                onClick={() => {
                                    if (selectedSeason) {
                                        setSelectedYear(selectedYear === String(y) ? '' : String(y))
                                        setPage(1)
                                    } else {
                                        showToast('Por favor, selecione uma temporada (Inverno, Primavera...) antes de escolher o ano.', 'error')
                                    }
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 border ${!selectedSeason
                                        ? 'bg-panel border-line text-muted/50 cursor-not-allowed'
                                        : selectedYear === String(y)
                                            ? 'bg-holo-3/20 border-holo-3/50 text-holo-3 cursor-pointer'
                                            : 'bg-panel border-line text-muted hover:border-holo-3 hover:text-text cursor-pointer'
                                    }`}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none uppercase">Gêneros e Tags</p>
                    <div className="flex flex-wrap gap-2">
                        {CONTENT_FILTERS.map(f => {
                            const isActive = selectedFilters.some(x => x.value === f.value)
                            return (
                                <button
                                    key={`${f.type}-${f.value}`}
                                    onClick={() => toggleFilter(f)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${isActive
                                            ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void shadow-[0_0_12px_rgba(123,92,255,0.4)]'
                                            : 'bg-panel-2 border border-line text-muted hover:border-holo-2 hover:text-text'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </FilterSheet>

            {loading && page === 1 && (
                <>
                    <p className="font-mono text-xs text-holo-3 tracking-widest mb-4 select-none">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <div key={n} className="aspect-[3/4.2] rounded-[14px] shimmer border border-line" />
                        ))}
                    </div>
                </>
            )}

            {!loading && error && page === 1 && (
                <div className="text-center py-16 text-coral select-none">
                    <AlertCircle className="mx-auto mb-4 opacity-80" size={34} />
                    <h3 className="font-anton uppercase text-xl mb-2">Ops, problema de conexão</h3>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {!error && hasSearched && resultados.length > 0 && (
                <>
                    {page === 1 && <p className="font-mono text-xs text-holo-3 tracking-widest mb-4 select-none">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                        {resultados.map((anime, index) => (
                            <SearchResultCard
                                key={`${anime.mal_id}-${index}`}
                                anime={anime}
                                gradientClass={`card-g${(index % 5) + 1}`}
                                isSaved={savedEntries.some(e => e.mal_id === anime.mal_id)}
                                isFavorite={savedEntries.find(e => e.mal_id === anime.mal_id)?.is_favorite}
                                isSaving={savingIds.includes(anime.mal_id)}
                                statusLabel={traduzirStatus(anime.status)}
                                onToggleSave={handleSalvar}
                            />
                        ))}
                    </div>

                    {!loading && resultados.length >= 20 && (
                        <button
                            onClick={() => setPage(p => p + 1)}
                            className="select-none block mx-auto mt-8 px-6 py-3 rounded-full border border-line bg-panel text-text font-bold text-sm hover:border-holo-3 hover:text-holo-3 transition-colors cursor-pointer"
                        >
                            Carregar mais
                        </button>
                    )}

                    {loading && page > 1 && (
                        <div className="py-8 text-center">
                            <div className="inline-block w-6 h-6 rounded-full border-4 border-line border-t-holo-3 animate-spin"></div>
                        </div>
                    )}
                </>
            )}

            {!loading && !error && hasSearched && resultados.length === 0 && page === 1 && (
                <div className="text-center py-16 text-muted select-none">
                    <Search className="mx-auto mb-4 text-muted-2" size={34} />
                    <h3 className="font-anton uppercase text-text text-xl mb-2">Nada encontrado</h3>
                    <p className="text-sm">Tente outros termos ou ajuste os filtros.</p>
                </div>
            )}

            {!loading && !error && !hasSearched && (
                <div className="text-center py-16 select-none">
                    <h3 className="font-anton uppercase text-text text-xl mb-2">Descubra novos animes</h3>
                    <p className="text-sm text-muted">Busque por título, selecione uma categoria ou filtre por temporada.</p>
                </div>
            )}
        </div>
    )
}
```

## client/src/pages/Calendario.tsx

```tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Play, Calendar as CalendarIcon } from 'lucide-react'
import { getCategoryTheme } from '../lib/filters'

interface Entrada {
    mal_id: number
    status: string
    is_favorite?: boolean
}

interface HydratedAnime {
    mal_id: number
    title: string
    image_url: string
    genre?: string
    is_favorite?: boolean
    nextAiringEpisode?: {
        airingAt: number
        timeUntilAiring: number
        episode: number
    }
    streaming?: {
        name: string
        url: string
    }[]
}

export default function Calendario() {
    const [animes, setAnimes] = useState<HydratedAnime[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [, setTick] = useState(0)

    const [abaAtiva, setAbaAtiva] = useState<'meus' | 'todos'>('meus')

    useEffect(() => {
        const carregarCalendario = async () => {
            setLoading(true)
            setError(null)

            let userEntries: Entrada[] = []
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                try {
                    const res = await fetch('/api/entries', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
                    if (res.ok) userEntries = await res.json()
                } catch (e) { }
            }

            try {
                let media = []

                if (abaAtiva === 'meus') {
                    const ativos = userEntries.filter(e => e.status === 'Assistindo' || e.status === 'Em Dia')
                    if (ativos.length === 0) {
                        setAnimes([])
                        setLoading(false)
                        return
                    }
                    const malIds = ativos.map(e => e.mal_id)
                    const apiResponse = await fetch('/api/anime/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: malIds })
                    })
                    const apiJson = await apiResponse.json()
                    media = apiJson.data || []
                } else {
                    
                    const response = await fetch('/api/ranking?status=RELEASING&perPage=50&sort=POPULARITY_DESC')
                    if (!response.ok) throw new Error('Falha ao buscar lançamentos globais.')
                    const json = await response.json()
                    media = json.data || []
                }

                const animesComEpisodio: HydratedAnime[] = []
                media.forEach((m: any) => {
                    if (m.nextAiringEpisode) {
                        const entry = userEntries.find(e => e.mal_id === m.mal_id)
                        animesComEpisodio.push({
                            mal_id: m.mal_id,
                            title: m.title || 'Título Desconhecido',
                            image_url: m.images?.jpg?.image_url || '',
                            genre: m.genres && m.genres.length > 0 ? m.genres[0].name : undefined,
                            nextAiringEpisode: m.nextAiringEpisode,
                            streaming: m.streaming,
                            is_favorite: entry?.is_favorite
                        })
                    }
                })

                setAnimes(animesComEpisodio)
            } catch (err) {
                setError('Não foi possível carregar o calendário.')
            } finally {
                setLoading(false)
            }
        }

        carregarCalendario()
    }, [abaAtiva])

    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1)
        }, 60000)
        return () => clearInterval(interval)
    }, [])

    const getDayLabel = (timestamp: number) => {
        const date = new Date(timestamp * 1000)

        
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        
        const targetDate = new Date(date)
        targetDate.setHours(0, 0, 0, 0)

        const diffTime = targetDate.getTime() - today.getTime()
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Hoje'
        if (diffDays === 1) return 'Amanhã'

        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
        return diasSemana[date.getDay()]
    }

    const formatTimeRemaining = (targetEpoch: number) => {
        const now = Math.floor(Date.now() / 1000)
        const diff = targetEpoch - now
        if (diff <= 0) return 'Lançado!'

        const days = Math.floor(diff / 86400)
        const hours = Math.floor((diff % 86400) / 3600)
        const minutes = Math.floor((diff % 3600) / 60)

        if (days > 0) return `⏱ ${days}D ${hours}H`
        if (hours > 0) return `⏱ ${hours}H ${minutes}M`
        return `⏱ ${minutes}M`
    }

    const formatClock = (timestamp: number) => {
        const date = new Date(timestamp * 1000)
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    const sortedAnimes = [...animes].sort((a, b) => (a.nextAiringEpisode?.airingAt || 0) - (b.nextAiringEpisode?.airingAt || 0))
    const groups: { label: string; dateStr: string; animes: HydratedAnime[] }[] = []

    sortedAnimes.forEach(anime => {
        if (!anime.nextAiringEpisode) return
        const label = getDayLabel(anime.nextAiringEpisode.airingAt)
        const dateObj = new Date(anime.nextAiringEpisode.airingAt * 1000)
        const dateStr = `${dateObj.getDate()} ${dateObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}`

        let group = groups.find(g => g.label === label)
        if (!group) {
            group = { label, dateStr, animes: [] }
            groups.push(group)
        }
        group.animes.push(anime)
    })

    return (
        <div className="pb-20">
            <div className="max-w-[900px] mx-auto px-5 pt-8 relative z-10">
                <div className="mb-8">
                    <h1 className="font-anton text-[clamp(1.6rem,3.6vw,2.2rem)] uppercase mb-1 text-text select-none">
                        Calendário de Lançamentos
                    </h1>
                    <p className="text-muted text-sm select-none">
                        Próximos episódios da sua coleção ou do catálogo global — com contagem regressiva viva.
                    </p>
                </div>

                {}
                <div className="flex gap-2 mb-8 select-none border-b border-line pb-4 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setAbaAtiva('meus')}
                        className={`shrink-0 whitespace-nowrap text-[13px] font-bold px-5 py-2.5 rounded-full border transition-colors cursor-pointer ${abaAtiva === 'meus'
                                ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-white border-transparent shadow-lg'
                                : 'bg-panel border-line text-muted hover:border-holo-3 hover:text-text'
                            }`}
                    >
                        Meu Deck
                    </button>
                    <button
                        onClick={() => setAbaAtiva('todos')}
                        className={`shrink-0 whitespace-nowrap text-[13px] font-bold px-5 py-2.5 rounded-full border transition-colors cursor-pointer flex items-center gap-2 ${abaAtiva === 'todos'
                                ? 'bg-holo-3/20 border-holo-3 text-holo-3 shadow-[0_0_15px_rgba(63,224,240,0.2)]'
                                : 'bg-panel border-line text-muted hover:border-holo-3 hover:text-text'
                            }`}
                    >
                        Lançamentos Global
                    </button>
                </div>

                {loading ? (
                    <div className="min-h-[40vh] flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full border-4 border-line border-t-holo-1 animate-spin mb-4"></div>
                        <p className="font-mono text-muted text-sm tracking-widest">
                    </div>
                ) : error ? (
                    <div className="p-10 text-center text-coral font-mono text-sm">{error}</div>
                ) : groups.length === 0 ? (
                    <div className="text-center py-16 bg-panel border border-line rounded-2xl select-none">
                        <CalendarIcon className="mx-auto mb-4 text-muted-2" size={32} />
                        <h3 className="font-anton uppercase text-text text-lg mb-1">Agenda Vazia</h3>
                        <p className="text-sm text-muted">Nenhum episódio previsto para a aba selecionada.</p>
                    </div>
                ) : (
                    groups.map((group) => {
                        let badgeColor = 'bg-panel border-line text-muted-2'
                        
                        if (group.label === 'Hoje') badgeColor = 'bg-coral/15 border-coral/35 text-coral'
                        if (group.label === 'Amanhã') badgeColor = 'bg-gold/15 border-gold/35 text-gold'

                        return (
                            <div key={group.label} className="mb-10 animate-fade-in">
                                <div className="flex items-center gap-3 mb-4 select-none">
                                    <h2 className="font-anton text-text uppercase text-[17px] m-0 flex items-center gap-2">
                                        {group.label}
                                        {group.label === 'Hoje' && (
                                            <span className="w-2 h-2 rounded-full bg-coral animate-pulse" title="Lançamento hoje!"></span>
                                        )}
                                    </h2>
                                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                        {group.dateStr}
                                    </span>
                                    <div className="flex-1 h-[1px] bg-line"></div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {group.animes.map((anime, index) => {
                                        const gradClass = `card-g${(index % 5) + 1}`
                                        const streamUrl = anime.streaming ? anime.streaming.find(s => s.name.toLowerCase().includes('crunchyroll'))?.url || anime.streaming.find(s => s.name.toLowerCase().includes('netflix'))?.url || anime.streaming[0]?.url : null
                                        const remainingText = formatTimeRemaining(anime.nextAiringEpisode!.airingAt)
                                        const isLanchado = remainingText === 'Lançado!'

                                        return (
                                            <div key={anime.mal_id} className={`grid grid-cols-[44px_1fr_auto] md:grid-cols-[56px_1fr_auto_auto] gap-3 md:gap-5 items-center p-3 border rounded-xl transition-colors group ${anime.is_favorite ? 'bg-panel-2 border-gold/30 shadow-[0_0_10px_rgba(255,197,66,0.05)]' : 'bg-panel border-line hover:border-holo-2'}`}>

                                                <div className={`w-11 h-11 md:w-14 md:h-14 rounded-lg flex-shrink-0 bg-cover bg-center border border-line ${gradClass}`} style={{ backgroundImage: `url(${anime.image_url})` }}></div>

                                                <div className="min-w-0">
                                                    <Link to={`/anime/${anime.mal_id}`} className="font-bold text-[13.5px] md:text-[14.5px] truncate block hover:text-holo-3 transition-colors">
                                                        {anime.title}
                                                    </Link>
                                                    <div className="flex items-center gap-2 font-mono text-[10px] md:text-[10.5px] text-muted-2 mt-1 select-none">
                                                        {anime.is_favorite && <span className="text-gold text-xs leading-none drop-shadow-md" title="Favorito">👑</span>}
                                                        {anime.genre && (
                                                            <span className={`px-1.5 py-0.5 rounded border font-bold font-manrope hidden md:inline-block ${getCategoryTheme(anime.genre)}`}>
                                                                {anime.genre}
                                                            </span>
                                                        )}
                                                        <span>EPISÓDIO {anime.nextAiringEpisode!.episode}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-5 text-right select-none">
                                                    <span className={`inline-flex items-center justify-center font-mono text-[10.5px] md:text-[11.5px] font-extrabold px-2.5 py-1 rounded-full border ${isLanchado ? 'bg-green/15 text-green border-green/30' : 'bg-holo-3/15 text-holo-3 border-holo-3/30'}`}>
                                                        {remainingText}
                                                    </span>
                                                    <span className="font-mono text-[12px] md:text-[13.5px] text-muted-2 hidden md:block">
                                                        {formatClock(anime.nextAiringEpisode!.airingAt)}
                                                    </span>
                                                </div>

                                                <div className="hidden md:flex ml-2">
                                                    {streamUrl ? (
                                                        <a href={streamUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border-[1.5px] border-line text-muted hover:bg-gradient-to-r hover:from-holo-1 hover:to-holo-2 hover:text-white hover:border-transparent flex items-center justify-center transition-all cursor-pointer shadow-lg" title="Assistir Oficial">
                                                            <Play size={16} fill="currentColor" className="ml-0.5" />
                                                        </a>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full border-[1.5px] border-line/50 text-line flex items-center justify-center select-none" title="Sem streaming mapeado">
                                                            <Play size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
```

## client/src/pages/Detalhes.tsx

```tsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PlayCircle, Star, AlertCircle, Save, Trash2, Bookmark } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import BotaoCopiar from '../components/BotaoCopiar'

interface AnimeDetail {
  mal_id: number
  title: string
  status: string
  synopsis: string
  episodes: number
  score: number
  bannerImage?: string
  images: { jpg: { image_url: string } }
  genres: { name: string }[]
  studios: { name: string }[]
  streaming: { name: string; url: string }[]
  theme: { openings: string[]; endings: string[] }
  relations: { relation: string; entry: { mal_id: number; type: string; name: string }[] }[]
  characters?: { id: number; name: string; image: string; role: string }[]
}

interface AnimeStats {
  scores: { score: number; votes: number; percentage: number }[]
}

interface MinhaEntrada {
  id: string
  status: string
  mal_id: number
  tipo: string
  nota?: number | null
  anotacao?: string
  is_favorite?: boolean
}

const STATUS_OPCOES = ['Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado']

export default function Detalhes() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()

  const [anime, setAnime] = useState<AnimeDetail | null>(null)
  const [stats, setStats] = useState<AnimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [minhaEntrada, setMinhaEntrada] = useState<MinhaEntrada | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const [statusInput, setStatusInput] = useState<string>('Quero Assistir')
  const [notaInput, setNotaInput] = useState<string>('')
  const [anotacaoInput, setAnotacaoInput] = useState<string>('')
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [resAnime, resStats] = await Promise.all([
          fetch(`/api/anime/${id}`),
          fetch(`/api/anime/${id}/statistics`)
        ])

        if (!resAnime.ok || !resStats.ok) {
          throw new Error('Falha ao carregar os dados do anime. Tente novamente.')
        }

        const dataAnime = await resAnime.json()
        const dataStats = await resStats.json()
        setAnime(dataAnime.data)
        setStats(dataStats.data)

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const resEntries = await fetch('/api/entries', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
          if (resEntries.ok) {
            const entradas = await resEntries.json()
            const entrada = entradas?.find((e: any) => e.mal_id === Number(id))
            if (entrada) {
              setMinhaEntrada(entrada)
              setStatusInput(entrada.status)
              setNotaInput(entrada.nota !== null && entrada.nota !== undefined ? entrada.nota.toString() : '')
              setAnotacaoInput(entrada.anotacao || '')
              setIsFavorite(entrada.is_favorite || false)
            }
          }
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchData()
  }, [id])

  const handleAtualizarEntrada = async (overrideStatus?: string) => {
    setSalvando(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      showToast('Você precisa estar logado para salvar no Deck.', 'error')
      setSalvando(false)
      return
    }

    const statusFinal = overrideStatus || statusInput
    const notaStr = String(notaInput).trim()
    const notaFinal = notaStr === '' ? null : Number(notaStr.replace(',', '.'))

    const payload = {
      mal_id: Number(id),
      tipo: 'anime',
      status: statusFinal,
      nota: Number.isNaN(notaFinal) ? null : notaFinal,
      anotacao: anotacaoInput,
      is_favorite: isFavorite
    }

    try {
      const url = minhaEntrada ? `/api/entries/${minhaEntrada.id}` : '/api/entries'
      const method = minhaEntrada ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error()

      const atualizada = await response.json()
      const novaEntrada = Array.isArray(atualizada) ? atualizada[0] : atualizada

      setMinhaEntrada(novaEntrada)
      if (overrideStatus) setStatusInput(overrideStatus)
      setNotaInput(novaEntrada.nota !== null && novaEntrada.nota !== undefined ? novaEntrada.nota.toString() : '')
      setIsFavorite(novaEntrada.is_favorite || false)

      showToast(
        overrideStatus ? 'Parabéns! Movido para os Completos.' :
          minhaEntrada ? 'Alterações salvas!' : 'Adicionado ao Deck com sucesso!',
        'success'
      )
    } catch {
      showToast('Erro ao atualizar seu Deck. Tente novamente.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const handleRemoverEntrada = async () => {
    if (!minhaEntrada) return
    setExcluindo(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const response = await fetch(`/api/entries/${minhaEntrada.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!response.ok) throw new Error()

      setMinhaEntrada(null)
      setStatusInput('Quero Assistir')
      setNotaInput('')
      setAnotacaoInput('')
      setIsFavorite(false)
      showToast('Anime removido do seu Deck.', 'success')
    } catch {
      showToast('Erro ao remover do Deck. Tente novamente.', 'error')
    } finally {
      setExcluindo(false)
    }
  }

  const traduzirStatus = (statusOriginal: string) => {
    if (statusOriginal === 'FINISHED' || statusOriginal === 'Finished Airing') return 'Finalizado'
    if (statusOriginal === 'RELEASING' || statusOriginal === 'Currently Airing') return 'Em Lançamento'
    if (statusOriginal === 'NOT_YET_RELEASED' || statusOriginal === 'Not yet aired') return 'Em Breve'
    return statusOriginal
  }

  const notaDisplay = notaInput && String(notaInput).trim() !== '' ? notaInput : 'N/A'
  const temNotaDisplay = notaDisplay !== 'N/A'

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-line border-t-holo-3 animate-spin mb-4"></div>
        <p className="font-mono text-muted text-sm tracking-widest">
      </div>
    )
  }

  if (error || !anime) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="text-coral mb-4" size={48} />
        <h2 className="font-anton text-2xl text-text uppercase mb-2">Erro de Conexão</h2>
        <p className="text-muted mb-6">{error || 'Anime não encontrado.'}</p>
        <Link to="/" className="text-holo-3 font-bold hover:underline">Voltar para a Busca</Link>
      </div>
    )
  }

  const maxPercentage = stats?.scores ? Math.max(...stats.scores.map(s => s.percentage)) : 100

  return (
    <div className="-mt-24 pb-20">

      {}
      <div className="relative h-[300px] md:h-[450px] w-full overflow-hidden bg-panel-2">
        {anime.bannerImage ? (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
            style={{ backgroundImage: `url(${anime.bannerImage})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#3a1a4a] to-[#0A0714]" />
        )}
        {}
        <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-void/95 via-void/60 to-transparent z-10" />
        {}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent z-10" />
      </div>

      {}
      <div className="max-w-[1040px] mx-auto px-5 -mt-[120px] md:-mt-[160px] relative z-20 pb-2">

        <div className="flex flex-col sm:flex-row gap-5 sm:items-end mb-8 text-center sm:text-left items-center">
          <div className="relative">
            {isFavorite && (
              <div className="absolute -top-4 -right-4 w-10 h-10 bg-void/80 border border-gold/50 rounded-full flex items-center justify-center text-xl shadow-[0_0_15px_rgba(255,197,66,0.4)] z-30">
                👑
              </div>
            )}
            <img
              src={anime.images?.jpg?.image_url}
              alt={`Poster de ${anime.title}`}
              className={`w-[140px] md:w-[170px] h-[198px] md:h-[240px] rounded-xl shadow-[0_15px_30px_-10px_rgba(0,0,0,0.8)] border-[3px] shrink-0 object-cover bg-panel-2 transition-colors ${isFavorite ? 'border-gold' : 'border-panel'}`}
            />
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-2 group">
              <h1 className="font-anton text-[clamp(1.4rem,3.5vw,2.4rem)] uppercase leading-[1.05] tracking-wide drop-shadow-md break-words">
                {anime.title}
              </h1>
              <BotaoCopiar
                texto={anime.title}
                className="opacity-70 md:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start font-mono text-[11px] text-muted mb-3">
              <span className="text-holo-3">{traduzirStatus(anime.status)}</span>
              <span className="text-muted-2">•</span>
              <span>{anime.episodes || '?'} EP</span>
              {anime.studios?.length > 0 && (
                <>
                  <span className="text-muted-2">•</span>
                  <span>{anime.studios[0].name}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-4">
              {anime.genres?.map(g => (
                <span key={g.name} className="text-[10px] font-bold px-3 py-1 rounded-full bg-panel border border-line text-muted select-none">
                  {g.name}
                </span>
              ))}
            </div>

            <div className="bg-panel border border-line rounded-xl px-5 py-3 inline-flex items-center gap-5 shrink-0 shadow-lg mt-1 select-none">
              <div className="flex items-center gap-3">
                <Star className="text-gold fill-gold w-6 h-6" />
                <div className="text-left">
                  <div className="font-anton text-[22px] text-gold leading-none">{anime.score || 'N/A'}</div>
                  <div className="text-[10px] font-bold text-muted-2 mt-1 uppercase tracking-wide">Nota Geral</div>
                </div>
              </div>

              <div className="w-[1px] h-8 bg-line"></div>

              <div className="flex items-center gap-3">
                <Star className={`w-6 h-6 ${temNotaDisplay ? 'text-holo-3 fill-holo-3' : 'text-muted-2'}`} />
                <div className="text-left">
                  <div className={`font-anton text-[22px] leading-none ${temNotaDisplay ? 'text-holo-3' : 'text-muted-2'}`}>
                    {notaDisplay}
                  </div>
                  <div className="text-[10px] font-bold text-muted-2 mt-1 uppercase tracking-wide">Sua Nota</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky top-[63px] md:top-[73px] z-40 bg-void/95 backdrop-blur-sm border-b border-line overflow-x-auto whitespace-nowrap py-3 mb-8 scrollbar-hide">
          <div className="flex gap-2.5">
            <a href="#visao-geral" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Visão Geral</a>
            {anime.characters && anime.characters.length > 0 && (
              <a href="#personagens" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Personagens</a>
            )}
            <a href="#onde-assistir" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Onde Assistir</a>
            <a href="#estatisticas" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Estatísticas</a>
            <a href="#relacionados" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Relacionados</a>
          </div>
        </div>

        {minhaEntrada?.status === 'Em Dia' && (anime.status === 'Finished Airing' || anime.status === 'FINISHED') && (
          <div className="bg-gradient-to-r from-holo-1/20 to-holo-2/20 border border-holo-2/40 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg mb-8 backdrop-blur-md">
            <div className="text-center md:text-left">
              <h3 className="font-anton uppercase text-holo-1 text-xl mb-1">Anime Finalizado!</h3>
              <p className="font-bold text-sm text-text">A AniList detectou que esta obra acabou. Deseja mover da sua lista de "Em Dia" para "Completo"?</p>
            </div>
            <button
              type="button"
              onClick={() => handleAtualizarEntrada('Completo')}
              disabled={salvando}
              className="select-none bg-gradient-to-r from-holo-1 to-holo-2 text-void px-6 py-3 rounded-full font-extrabold text-sm shrink-0 transition-transform cursor-pointer hover:opacity-90 disabled:opacity-50"
            >
              {salvando ? 'Atualizando...' : 'Marcar como Completo ✓'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10" id="visao-geral">
          <div className="space-y-10 min-w-0">

            <section>
              <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                <span className="font-mono text-[11px] text-holo-3">01</span> Sinopse
              </h2>
              <div className="text-muted text-[14.5px] leading-[1.7] whitespace-pre-line bg-panel border border-line rounded-2xl p-6">
                {anime.synopsis || 'Sinopse não disponível nesta base de dados.'}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-anton text-base uppercase flex items-center gap-2 select-none m-0">
                  <span className="font-mono text-[11px] text-holo-3">02</span> Sua Avaliação
                </h2>

                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`select-none flex items-center gap-2 text-[12.5px] font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${isFavorite ? 'bg-coral/10 text-coral border-coral/30 shadow-[0_0_10px_rgba(255,92,108,0.2)]' : 'bg-panel border-line text-muted hover:text-text hover:border-muted-2'}`}
                  title="Marcar como Favorito"
                >
                  {isFavorite ? '❤️ Favorito' : '🤍 Favoritar'}
                </button>
              </div>

              <div className="bg-panel border border-line rounded-2xl p-5 relative">
                {salvando && (
                  <div className="absolute inset-0 bg-panel/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                    <div className="w-8 h-8 border-4 border-line border-t-holo-2 rounded-full animate-spin"></div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-5">
                  {STATUS_OPCOES.map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusInput(status)}
                      className={`select-none text-[12.5px] font-bold px-3.5 py-1.5 rounded-full border cursor-pointer transition-colors ${statusInput === status
                          ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-white border-transparent shadow-md'
                          : 'bg-transparent border-line text-muted hover:border-holo-3 hover:text-text'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider select-none">Nota (0-10)</label>
                      {notaInput !== '' && (
                        <button type="button" onClick={() => setNotaInput('')} title="Limpar nota" className="select-none text-[10px] font-bold text-coral hover:text-coral/80 uppercase cursor-pointer">
                          Limpar
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0" max="10" step="0.1"
                      value={notaInput}
                      onChange={(e) => setNotaInput(e.target.value)}
                      placeholder="Ex: 8.5"
                      className="w-full bg-panel-2 border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:border-holo-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2 select-none">Anotação Privada</label>
                    <textarea
                      value={anotacaoInput}
                      onChange={(e) => setAnotacaoInput(e.target.value)}
                      placeholder="O que você achou deste anime?"
                      className="w-full bg-panel-2 border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:border-holo-2 min-h-[80px] resize-none font-manrope"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-center mt-6 pt-6 border-t border-line gap-4">
                  {minhaEntrada ? (
                    <button
                      type="button"
                      onClick={handleRemoverEntrada}
                      disabled={excluindo || salvando}
                      className="select-none flex items-center gap-2 text-[13px] font-bold text-coral/80 hover:text-coral transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 size={16} />
                      {excluindo ? 'Removendo...' : 'Remover do Deck'}
                    </button>
                  ) : (
                    <div className="select-none text-xs text-muted font-bold flex items-center gap-2">
                      <Bookmark size={14} className="text-holo-3" />
                      Ainda não está no Deck
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAtualizarEntrada()}
                    disabled={salvando || excluindo}
                    className="select-none flex items-center gap-2 bg-gradient-to-r from-holo-1 to-holo-3 text-void px-6 py-3 rounded-xl text-[13.5px] font-extrabold transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center"
                  >
                    <Save size={16} />
                    {minhaEntrada ? 'Salvar Alterações' : 'Adicionar ao Deck'}
                  </button>
                </div>
              </div>
            </section>

            {anime.characters && anime.characters.length > 0 && (
              <section id="personagens">
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">03</span> Personagens
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {anime.characters.map(char => (
                    <div key={char.id} className="flex-none w-[110px] sm:w-[130px] snap-start group">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden mb-2 bg-panel-2 border border-line">
                         <img src={char.image} alt={char.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="font-bold text-[12px] md:text-[13px] leading-tight truncate text-text group-hover:text-holo-3 transition-colors">{char.name}</div>
                      <div className="font-mono text-[9px] text-muted uppercase tracking-wider truncate mt-0.5">{char.role}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {anime.streaming?.length > 0 && (
              <section id="onde-assistir">
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">04</span> Onde Assistir Oficial
                </h2>
                <div className="flex flex-wrap gap-3">
                  {anime.streaming.map(st => (
                    <a key={st.name} href={st.url} target="_blank" rel="noreferrer" className="select-none flex items-center gap-2 bg-panel border border-line rounded-xl px-5 py-3 text-[13px] font-bold hover:border-holo-1 hover:text-holo-1 transition-colors">
                      <PlayCircle size={16} />
                      {st.name}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {(anime.theme?.openings?.length > 0 || anime.theme?.endings?.length > 0) && (
              <section>
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">05</span> Temas Musicais
                </h2>
                <div className="flex flex-col gap-2">
                  {anime.theme?.openings?.slice(0, 3).map((op, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-panel border border-line rounded-xl text-[13px]">
                      <span className="font-mono text-[10px] text-holo-3 font-bold shrink-0 mr-3 select-none">OP {i + 1}</span>
                      <span className="text-muted truncate">{op}</span>
                    </div>
                  ))}
                  {anime.theme?.endings?.slice(0, 3).map((ed, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-panel border border-line rounded-xl text-[13px]">
                      <span className="font-mono text-[10px] text-holo-1 font-bold shrink-0 mr-3 select-none">ED {i + 1}</span>
                      <span className="text-muted truncate">{ed}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {anime.relations?.length > 0 && (
              <section id="relacionados">
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">06</span> Títulos Relacionados
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {anime.relations.map((rel, i) => (
                    <div key={i} className="flex-none w-[160px] bg-panel border border-line rounded-xl p-4">
                      <div className="font-mono text-[10px] text-holo-2 mb-2 uppercase select-none">{rel.relation}</div>
                      <div className="text-[13px] font-bold leading-tight">
                        {rel.entry[0]?.name || 'Título Desconhecido'}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-10 min-w-0" id="estatisticas">

            {minhaEntrada && (
              <section>
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">MEU DECK</span>
                </h2>
                <div className="bg-gradient-to-br from-panel to-panel-2 border border-holo-3/30 rounded-2xl p-5">
                  <div className="text-xs font-bold text-muted uppercase mb-1 select-none">Status Atual</div>
                  <div className="font-anton text-2xl text-text mb-4 tracking-wide flex items-center gap-2">
                    {minhaEntrada.status}
                    {isFavorite && <span title="Favorito" className="text-xl">👑</span>}
                  </div>
                  <Link to="/deck" className="select-none block text-center w-full py-2.5 rounded-xl border border-line text-sm font-bold hover:bg-panel-2 transition-colors">
                    Gerenciar no Deck
                  </Link>
                </div>
              </section>
            )}

            {stats && stats.scores && (
              <section>
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">ESTATÍSTICAS</span> Histograma
                </h2>
                <div className="bg-panel border border-line rounded-2xl p-5">
                  <div className="flex items-end gap-1.5 h-[120px] mb-2">
                    {stats.scores.slice().reverse().map(s => {
                      const heightPct = maxPercentage > 0 ? (s.percentage / maxPercentage) * 100 : 0
                      return (
                        <div key={s.score} className="flex-1 flex flex-col justify-end h-full group relative">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="bg-gradient-to-t from-holo-2 to-holo-3 rounded-t-sm opacity-80 group-hover:opacity-100 transition-all w-full"
                          >
                            <span className="select-none absolute -top-7 left-1/2 -translate-x-1/2 bg-void text-text text-[9px] font-mono px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10 border border-line">
                              {s.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-muted-2 px-1 select-none">
                    <span>10</span><span>9</span><span>8</span><span>7</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span>
                  </div>

                  <div className="mt-6 pt-5 border-t border-line">
                    <b className="font-anton text-lg text-text block leading-none mb-1 select-none">
                      {stats.scores.reduce((acc, curr) => acc + curr.votes, 0).toLocaleString()}
                    </b>
                    <span className="font-mono text-[10.5px] text-muted tracking-wider select-none">AVALIAÇÕES</span>
                  </div>
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
```

## client/src/pages/Landing.tsx

```tsx
import { useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MonitorPlay, Sparkles, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FullLogo } from '../components/Brand'

export default function Landing() {
  const navigate = useNavigate()
  const sectionRefs = useRef<HTMLElement[]>([])

  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/deck')
      }
    })
  }, [navigate])

  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('in')
      })
    }, { threshold: 0.12 })

    sectionRefs.current.forEach(el => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !sectionRefs.current.includes(el)) {
      sectionRefs.current.push(el)
    }
  }

  return (
    <div className="relative pt-10 pb-20">

      {}
      <section className="container max-w-[1140px] mx-auto px-5 pt-16 md:pt-24 pb-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-10 items-center text-center md:text-left">

          <div ref={addToRefs} className="reveal">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-panel border border-line text-xs font-bold text-muted tracking-wide mb-6">
              <span className="text-[13px] text-holo-3">収集</span> · SEU DECK DE ANIMES, DO SEU JEITO
            </span>
            <h1 className="font-anton uppercase text-[clamp(2.4rem,6vw,4rem)] leading-[1.02] mb-5">
              Todo anime que <span className="text-holo">importa</span>, guardado do seu jeito.
            </h1>
            <p className="text-muted text-[16.5px] leading-relaxed max-w-[480px] mx-auto md:mx-0 mb-8">
              Catálogo completo da AniList, com a curadoria, as notas e a organização que só fazem sentido pra você — numa interface que você não vai ter vergonha de usar.
            </p>
            <div className="flex gap-3.5 flex-wrap justify-center md:justify-start">
              <Link to="/login" className="font-extrabold text-[14.5px] px-7 py-3.5 rounded-full text-void bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 flex items-center gap-2 hover:-translate-y-0.5 transition-transform">
                Começar meu Deck <MonitorPlay size={16} />
              </Link>
              <Link to="/rankings" className="font-bold text-[14.5px] px-6 py-3.5 rounded-full border-[1.5px] border-line text-text hover:border-holo-3 transition-colors">
                Ver rankings
              </Link>
            </div>

            <div className="flex gap-7 mt-11 flex-wrap justify-center md:justify-start">
              <div><b className="block font-anton text-xl uppercase">28 mil+</b><span className="text-[11px] text-muted-2 font-bold">TÍTULOS DA ANILIST</span></div>
              <div><b className="block font-anton text-xl uppercase">Em Dia</b><span className="text-[11px] text-muted-2 font-bold">PRA QUEM ACOMPANHA</span></div>
              <div><b className="block font-anton text-xl uppercase">Streaming</b><span className="text-[11px] text-muted-2 font-bold">ONDE ASSISTIR</span></div>
            </div>
          </div>

          <div ref={addToRefs} className="hero-visual reveal hidden md:flex" style={{ transitionDelay: '.1s' }}>
            <div className="stack-card c1"></div>
            <div className="stack-card c2"></div>
            <div className="stack-card c3 relative p-4 flex flex-col justify-between">
              <span className="inline-block font-anton text-[13px] px-2.5 py-1 rounded-lg bg-gold/15 text-gold border border-gold/40 self-start">TOP #1</span>
              <div>
                <div className="font-anton text-[15px] uppercase">Sua próxima obsessão</div>
                <div className="text-[11px] text-muted font-mono mt-1">AÇÃO · FANTASIA · 24 EP</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {}
      <section ref={addToRefs} className="container max-w-[1140px] mx-auto px-5 py-24 reveal">
        <div className="text-center mb-11">
          <div className="font-mono text-[11.5px] text-holo-3 tracking-[0.14em] mb-2.5">
          <h2 className="font-anton uppercase text-[clamp(1.5rem,3.4vw,2.2rem)] mb-2.5">Mais do que uma lista</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[820px] mx-auto md:max-w-none">
          <div className="bg-panel border border-line rounded-[18px] p-6">
            <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br from-holo-1/20 to-holo-3/20 text-holo-3">
              <Layers size={22} />
            </div>
            <h3 className="text-[16.5px] font-bold mb-2">Dashboard pessoal</h3>
            <p className="text-muted text-sm leading-relaxed">Status customizados (Assistindo, Em Dia, Dropado) com anotações e notas secretas que só você vê.</p>
          </div>
          <div className="bg-panel border border-line rounded-[18px] p-6">
            <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br from-holo-1/20 to-holo-3/20 text-holo-3">
              <MonitorPlay size={22} />
            </div>
            <h3 className="text-[16.5px] font-bold mb-2">Onde assistir</h3>
            <p className="text-muted text-sm leading-relaxed">Link direto pras plataformas de streaming oficiais (Crunchyroll, Netflix, etc) já mapeadas pela API.</p>
          </div>
          <div className="bg-panel border border-line rounded-[18px] p-6">
            <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br from-holo-1/20 to-holo-3/20 text-holo-3">
              <Sparkles size={22} />
            </div>
            <h3 className="text-[16.5px] font-bold mb-2">Curadoria híbrida</h3>
            <p className="text-muted text-sm leading-relaxed">Títulos principais curados à mão com sinopses revisadas, misturados ao imenso catálogo da AniList.</p>
          </div>
        </div>
      </section>

      {}
      <footer ref={addToRefs} className="container max-w-[1140px] mx-auto px-5 pt-20 pb-10 text-center border-t border-line mt-5 reveal">
        <FullLogo className="w-full max-w-[340px] mb-8" />
        <h2 className="font-anton uppercase text-[clamp(1.8rem,4.5vw,2.6rem)] mb-4">Comece seu <span className="text-holo">Deck</span> hoje</h2>
        <p className="text-muted max-w-[440px] mx-auto mb-8 leading-relaxed">Sem anúncio, sem site datado. Só o catálogo que você ama, do jeito que deveria ter sido desde sempre.</p>
        <Link to="/login" className="font-extrabold text-[14.5px] px-8 py-4 rounded-full text-void bg-gradient-to-r from-holo-1 to-holo-3 inline-block hover:opacity-90 transition-opacity">
          Criar minha conta
        </Link>

        <div className="mt-16 pt-5 border-t border-line flex flex-col md:flex-row justify-between items-center gap-4 text-[12.5px] text-muted-2">
          <p>© 2026 AniDeck — JVM Systems</p>
          <div className="flex gap-5">
            <a href="https:
            <span className="cursor-default">Powered by AniList GraphQL</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
```

## client/src/pages/MeuDeck.tsx

```tsx

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import EditarEntradaModal from '../components/EditarEntradaModal'
import DeckCard from '../components/DeckCard'
import DeckSkeleton from '../components/DeckSkeleton'
import StatCard from '../components/StatCard'
import { Play, CheckCircle2, Bookmark, MonitorPlay, Star, XCircle, AlertCircle } from 'lucide-react'
import type { AiringInfo } from '../lib/deckHelpers'

interface Entrada {
    id: string
    mal_id: number
    tipo: string
    status: string
    nota?: number | null
    anotacao?: string
    is_favorite?: boolean
}

interface HydratedAnime {
    mal_id: number
    title: string
    image_url: string
    genre?: string
    ranking?: number
    nextAiringEpisode?: AiringInfo
    streaming?: { name: string; url: string }[]
}

const FILTER_TABS = ['Todos', 'Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado']

export default function MeuDeck() {
    const [entradas, setEntradas] = useState<Entrada[]>([])
    const [animesData, setAnimesData] = useState<Record<number, HydratedAnime>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [editando, setEditando] = useState<Entrada | null>(null)
    const [filtroAtivo, setFiltroAtivo] = useState('Todos')
    const [userName, setUserName] = useState('Usuário')

    useEffect(() => {
        const carregarDeck = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            setUserName(session.user.user_metadata?.display_name || 'Usuário')

            try {
                const response = await fetch('/api/entries', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                })
                if (!response.ok) throw new Error('Não foi possível carregar seu deck.')
                const dadosDeck: Entrada[] = await response.json()
                setEntradas(dadosDeck || [])

                if (dadosDeck && dadosDeck.length > 0) {
                    const malIds = dadosDeck.map(e => e.mal_id)
                    const apiResponse = await fetch('/api/anime/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: malIds })
                    })

                    const apiJson = await apiResponse.json()
                    const media = apiJson.data || []

                    const mapaAnimes: Record<number, HydratedAnime> = {}
                    media.forEach((m: any) => {
                        mapaAnimes[m.mal_id] = {
                            mal_id: m.mal_id,
                            title: m.title || 'Título Desconhecido',
                            image_url: m.images?.jpg?.image_url || '',
                            genre: m.genres && m.genres.length > 0 ? m.genres[0].name : undefined,
                            ranking: m.ranking,
                            nextAiringEpisode: m.nextAiringEpisode,
                            streaming: m.streaming
                        }
                    })
                    setAnimesData(mapaAnimes)
                }
            } catch (err) {
                setError('Não foi possível carregar seu deck. Tente novamente.')
            } finally {
                setLoading(false)
            }
        }

        carregarDeck()
    }, [])

    const stats = useMemo(() => {
        let assistindo = 0, emDia = 0, concluidos = 0, dropados = 0, somaNotas = 0, qtdNotas = 0;

        entradas.forEach(e => {
            if (e.status === 'Assistindo') assistindo++;
            if (e.status === 'Em Dia') emDia++;
            if (e.status === 'Completo' || e.status === 'Finalizado') concluidos++;
            if (e.status === 'Dropado') dropados++;
            if (e.nota !== null && e.nota !== undefined) {
                somaNotas += e.nota;
                qtdNotas++;
            }
        })

        return {
            assistindo,
            emDia,
            concluidos,
            dropados,
            notaMedia: qtdNotas > 0 ? (somaNotas / qtdNotas).toFixed(1) : 'N/A'
        }
    }, [entradas])

    const entradasFiltradas = entradas.filter(e => filtroAtivo === 'Todos' || e.status === filtroAtivo)

    const entradasOrdenadas = useMemo(() => {
        return [...entradasFiltradas].sort((a, b) => {
            if (a.is_favorite && !b.is_favorite) return -1;
            if (!a.is_favorite && b.is_favorite) return 1;
            return 0;
        })
    }, [entradasFiltradas])

    if (loading) {
        return (
            <div className="pb-20">
                <div className="max-w-[1180px] mx-auto px-5 pt-8">
                    <div className="mb-8 space-y-2">
                        <div className="h-7 w-64 max-w-full rounded-full shimmer" />
                        <div className="h-4 w-48 rounded-full shimmer" />
                    </div>
                    <div className="flex md:grid md:grid-cols-5 gap-3.5 mb-10 overflow-hidden">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="shrink-0 w-[132px] md:w-auto h-[92px] rounded-[14px] shimmer" />
                        ))}
                    </div>
                    <DeckSkeleton />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-[1180px] mx-auto px-5 pt-16 pb-20 text-center text-coral">
                <AlertCircle className="mx-auto mb-2 opacity-80" size={28} />
                <p className="text-sm select-none">{error}</p>
            </div>
        )
    }

    return (
        <div className="pb-20">
            <div className="max-w-[1180px] mx-auto px-5 pt-8 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 mb-8">
                    <div>
                        <h1 className="font-anton text-[clamp(1.6rem,3.6vw,2.2rem)] uppercase mb-1 select-none">
                            Bem-vindo de volta, <span className="bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-transparent bg-clip-text">{userName}</span>
                        </h1>
                        <p className="text-muted text-sm select-none">Aqui está o que está rolando na sua coleção.</p>
                    </div>
                    <Link
                        to="/descobrir"
                        className="w-full md:w-auto justify-center font-extrabold text-[13.5px] px-6 py-3 rounded-full text-void bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 transition-transform select-none"
                    >
                        <Play size={14} fill="currentColor" />
                        Buscar Anime
                    </Link>
                </div>

                {}
                <div className="flex md:grid md:grid-cols-5 gap-3.5 mb-10 select-none overflow-x-auto md:overflow-visible scrollbar-hide snap-x snap-mandatory -mx-5 px-5 md:mx-0 md:px-0">
                    <StatCard icon={<MonitorPlay size={14} />} value={stats.assistindo} label="Assistindo" accentColor="holo-3" />
                    <StatCard icon={<Bookmark size={14} />} value={stats.emDia} label="Em Dia" accentColor="green" />
                    <StatCard icon={<CheckCircle2 size={14} />} value={stats.concluidos} label="Completos" accentColor="gold" />
                    <StatCard icon={<XCircle size={14} />} value={stats.dropados} label="Dropados" accentColor="coral" />
                    <StatCard icon={<Star size={14} />} value={stats.notaMedia} label="Sua Nota Média" accentColor="holo-1" />
                </div>

                <div className="flex items-center justify-between mb-5 select-none">
                    <h2 className="font-anton text-[17px] uppercase m-0">Meu Deck</h2>
                </div>

                {}
                <div className="flex overflow-x-auto md:flex-wrap md:overflow-visible scrollbar-hide gap-2 mb-7 select-none -mx-5 px-5 md:mx-0 md:px-0">
                    {FILTER_TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFiltroAtivo(tab)}
                            className={`shrink-0 whitespace-nowrap text-[13px] font-bold px-4 py-2 rounded-full border transition-colors cursor-pointer ${filtroAtivo === tab
                                    ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-white border-transparent shadow-lg'
                                    : 'bg-panel border-line text-muted hover:border-holo-3 hover:text-text'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {entradasOrdenadas.length === 0 ? (
                    <div className="text-center py-16 bg-panel border border-line rounded-2xl select-none">
                        <Bookmark className="mx-auto mb-4 text-muted-2" size={32} />
                        <h3 className="font-anton uppercase text-text text-lg mb-1">Lista Vazia</h3>
                        <p className="text-sm text-muted">Nenhum anime encontrado com este status.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                        {entradasOrdenadas.map((entrada, index) => (
                            <DeckCard
                                key={entrada.id}
                                entrada={entrada}
                                animeLocal={animesData[entrada.mal_id]}
                                gradientClass={`card-g${(index % 5) + 1}`}
                                onEdit={setEditando}
                            />
                        ))}
                    </div>
                )}

                    <EditarEntradaModal
                        entrada={editando}
                        onFechar={() => setEditando(null)}
                        onSalvar={(atualizada) => {
                            setEntradas((prev) => prev.map((e) => (e.id === atualizada.id ? atualizada : e)))
                        }}
                        onExcluir={(id) => {
                            setEntradas((prev) => prev.filter((e) => e.id !== id))
                        }}
                    />
            </div>
        </div>
    )
}
```

## client/src/pages/PainelAdmin.tsx

```tsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link, Navigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { X } from 'lucide-react'
import { LogoMark } from '../components/Brand'
import { getCategoryTheme } from '../lib/filters'

interface CuratedAnime {
  id?: string
  mal_id: number
  custom_title: string
  custom_synopsis?: string
  custom_format?: string
  custom_status?: string
  custom_tags?: string[]
  order_index: number
}

export default function PainelAdmin() {
  const { showToast } = useToast()
  
  const [destaques, setDestaques] = useState<CuratedAnime[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null) 

  const [termoBusca, setTermoBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultadosBusca, setResultadosBusca] = useState<any[]>([])
  const [preview, setPreview] = useState<any>(null)

  const [editId, setEditId] = useState<string | null>(null)
  const [malId, setMalId] = useState<number | null>(null)
  const [titulo, setTitulo] = useState('')
  const [formato, setFormato] = useState('TV')
  const [status, setStatus] = useState('RELEASING')
  const [ordem, setOrdem] = useState(0)
  const [sinopse, setSinopse] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const [itemParaExcluir, setItemParaExcluir] = useState<{id: string, titulo: string} | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    verificarAcesso()
  }, [])

  const verificarAcesso = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setIsAdmin(false)
      return
    }

    try {
      const response = await fetch('/api/admin/verify', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (response.ok) {
        setIsAdmin(true)
        carregarDestaques()
      } else {
        setIsAdmin(false)
      }
    } catch {
      setIsAdmin(false)
    }
  }

  const carregarDestaques = async () => {
    try {
      const response = await fetch('/api/curation')
      if (!response.ok) throw new Error('Falha ao carregar destaques')
      const data = await response.json()
      setDestaques(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const buscarNaAniList = async () => {
    if (!termoBusca.trim()) return
    setBuscando(true)
    setResultadosBusca([])

    const query = `
      query ($search: String) {
        Page(page: 1, perPage: 5) {
          media(search: $search, type: ANIME) {
            id
            idMal
            title { romaji english native }
            coverImage { large }
            format
            status
            genres
            synopsis: description
          }
        }
      }
    `
    try {
      const res = await fetch('https:
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { search: termoBusca } })
      })
      const { data } = await res.json()
      
      if (data?.Page?.media && data.Page.media.length > 0) {
        setResultadosBusca(data.Page.media)
      } else {
        showToast('Nenhum anime encontrado.', 'error')
      }
    } catch (error) {
      console.error(error)
      showToast('Erro ao buscar na AniList.', 'error')
    } finally {
      setBuscando(false)
    }
  }

  const selecionarAnimeDaBusca = (anime: any) => {
   setMalId(anime.idMal || anime.id)
    const tituloCorreto = anime.title.romaji || anime.title.english || anime.title.native
    setTitulo(tituloCorreto)
    setFormato(anime.format || 'TV')
    setStatus(anime.status || 'RELEASING')
    setTags(anime.genres || [])
    
    const limpaSinopse = anime.synopsis ? anime.synopsis.replace(/<[^>]*>?/gm, '') : ''
    setSinopse(limpaSinopse)
    
    setPreview({ 
      title: tituloCorreto, 
      mal_id: anime.id,
      images: { jpg: { image_url: anime.coverImage?.large } }
    })
    
    setResultadosBusca([])
    setTermoBusca('')
  }

  const adicionarTag = (valor: string) => {
    const novaTag = valor.trim().replace(/,/g, '')
    if (novaTag && !tags.includes(novaTag)) {
      setTags([...tags, novaTag])
    }
    setTagInput('')
  }

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      adicionarTag(tagInput)
    }
  }

  const handleBlurTag = () => adicionarTag(tagInput)
  
  const removerTag = (tagRemover: string) => setTags(tags.filter(t => t !== tagRemover))

  
  const moverTag = (index: number, direcao: -1 | 1) => {
    if (index + direcao < 0 || index + direcao >= tags.length) return
    const novasTags = [...tags]
    const temp = novasTags[index]
    novasTags[index] = novasTags[index + direcao]
    novasTags[index + direcao] = temp
    setTags(novasTags)
  }

  const salvarDestaque = async () => {
    if (!malId || !titulo) {
      showToast('Busque um anime e defina um título antes de salvar!', 'error')
      return
    }

    const payload: CuratedAnime = {
      mal_id: malId,
      custom_title: titulo,
      custom_format: formato,
      custom_status: status,
      custom_tags: tags,
      custom_synopsis: sinopse,
      order_index: ordem
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast('Sessão expirada. Faça login novamente.', 'error')
        return
      }

      const url = editId ? `/api/curation/${editId}` : '/api/curation'
      const method = editId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Falha ao salvar destaque')
      
      showToast('Destaque salvo com sucesso!')
      limparFormulario()
      carregarDestaques()
    } catch (err) {
      showToast('Erro ao salvar o destaque.', 'error')
    }
  }

  const handleConfirmarExclusao = async () => {
      if (!itemParaExcluir) return
      setExcluindo(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch(`/api/curation/${itemParaExcluir.id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
        if (!response.ok) throw new Error()
        showToast('Destaque removido com sucesso.')
        carregarDestaques()
      } catch (err) {
        showToast('Erro ao excluir destaque.', 'error')
      } finally {
        setExcluindo(false)
        setItemParaExcluir(null)
      }
  }

  const limparFormulario = () => {
    setEditId(null); setMalId(null); setPreview(null); setTermoBusca('');
    setTitulo(''); setSinopse(''); setTags([]); setOrdem(0);
    setResultadosBusca([]);
  }

  const editarDestaque = (anime: CuratedAnime) => {
    setEditId(anime.id || null); setMalId(anime.mal_id); setTitulo(anime.custom_title);
    setFormato(anime.custom_format || 'TV'); setStatus(anime.custom_status || 'RELEASING');
    setSinopse(anime.custom_synopsis || ''); setTags(anime.custom_tags || []); setOrdem(anime.order_index);
    setPreview({ title: anime.custom_title, mal_id: anime.mal_id, images: { jpg: { image_url: '' } } }) 
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isAdmin === false) return <Navigate to="/deck" replace />
  if (isAdmin === null || loading) return <div className="p-10 text-center text-muted font-mono text-sm">Carregando painel...</div>
  if (error) return <div className="p-10 text-center text-coral font-mono text-sm">{error}</div>

  return (
    <div className="min-h-screen bg-void text-text pb-20 relative z-10">
      
      <div className="bg-ambient"></div>

      <div className="sticky top-0 z-30 flex items-center justify-between p-4 border-b border-line bg-panel/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <LogoMark className="w-8 h-8 hidden md:block" />
          <span className="font-anton text-lg bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-transparent bg-clip-text hidden md:block">ANIDECK</span>
          <span className="font-mono text-[10px] font-bold text-gold bg-gold/10 border border-gold/40 px-2 py-1 rounded-full">⚙ ADMIN</span>
        </div>
        <Link to="/" className="text-sm font-bold text-muted hover:text-text transition-colors">
          ← Voltar ao site
        </Link>
      </div>

      <div className="max-w-[1000px] mx-auto p-5 mt-4 relative z-10">
        <div className="mb-6">
          <h1 className="font-anton text-2xl uppercase">Painel de Curadoria</h1>
          <p className="text-muted text-sm mt-1">Gerencie os "Destaques AniDeck" da home.</p>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-sm">{editId ? '✎ Editando Destaque' : '🔍 Adicionar Novo Destaque'}</h3>
            <button onClick={limparFormulario} className="text-xs text-muted hover:text-text cursor-pointer">Limpar</button>
          </div>

          <div className="relative mb-6">
            <div className="flex gap-2 group">
              <input 
                type="text" 
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Digite o título na AniList..." 
                className="flex-1 bg-panel-2 border border-line rounded-xl px-4 py-2 text-sm outline-none focus:border-holo-3 transition-colors group-focus-within:shadow-[0_0_15px_rgba(63,224,240,0.15)] relative z-20"
                onKeyDown={(e) => e.key === 'Enter' && buscarNaAniList()}
              />
              <button 
                onClick={buscarNaAniList} 
                disabled={buscando} 
                className="w-[115px] shrink-0 bg-panel-2 border border-line rounded-xl text-sm font-bold hover:border-holo-3 hover:text-holo-3 cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center relative z-20"
              >
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {resultadosBusca.length > 0 && (
              <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-panel/95 backdrop-blur-xl border border-line rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[350px] overflow-y-auto">
                {resultadosBusca.map(anime => (
                  <button
                    key={anime.id}
                    onClick={() => selecionarAnimeDaBusca(anime)}
                    className="flex items-center gap-3 p-3 border-b border-line/50 hover:bg-white/5 transition-colors text-left w-full cursor-pointer last:border-b-0"
                  >
                    <img src={anime.coverImage?.large} alt="Capa" className="w-10 h-14 object-cover rounded-md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate text-white">
                        {anime.title.romaji || anime.title.english}
                      </div>
                      <div className="text-[10px] text-muted truncate mt-0.5 uppercase tracking-wide">
                        {anime.format} • {anime.status}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {preview && (
            <div className="border-t border-dashed border-line pt-6 mt-4">
              <div className="bg-holo-2/10 border border-holo-2/30 rounded-xl p-3 mb-6 flex items-center gap-3">
                <div className="w-10 h-14 bg-panel-2 rounded-lg flex-shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${preview.images?.jpg?.image_url})` }}></div>
                <div>
                  <div className="font-bold text-sm text-holo-2">Anime Vinculado: {preview.title}</div>
                  <div className="font-mono text-[10px] text-muted">MAL ID: {preview.mal_id}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-muted mb-2 uppercase">Título Customizado</label>
                  <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full bg-panel-2 border border-line rounded-xl px-4 py-2 text-sm outline-none focus:border-holo-2" />
                </div>
                
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-muted mb-2 uppercase tracking-wide">Formato</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'TV', label: 'TV / Anime' },
                        { value: 'MOVIE', label: 'Filme' },
                        { value: 'OVA', label: 'OVA' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormato(opt.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border ${
                            formato === opt.value
                              ? 'bg-holo-3/20 border-holo-3 text-holo-3 shadow-[0_0_10px_rgba(63,224,240,0.2)]'
                              : 'bg-panel-2 border-line text-muted hover:border-holo-3 hover:text-text'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-muted mb-2 uppercase tracking-wide">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'RELEASING', label: 'Lançamento' },
                        { value: 'FINISHED', label: 'Finalizado' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStatus(opt.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border ${
                            status === opt.value
                              ? 'bg-coral/20 border-coral text-coral shadow-[0_0_10px_rgba(255,90,90,0.2)]'
                              : 'bg-panel-2 border-line text-muted hover:border-coral hover:text-text'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-muted mb-2 uppercase">Tags</label>
                <div className="flex flex-wrap gap-2 p-2 border border-line rounded-xl bg-panel-2 min-h-[44px] items-center focus-within:border-holo-2">
                  
                  {}
                  {tags.map((tag, index) => (
                    <span key={tag} className="flex items-center gap-1 bg-holo-3/10 text-holo-3 border border-holo-3/30 px-2 py-1 rounded-md text-xs font-bold">
                      {index > 0 && <button type="button" onClick={() => moverTag(index, -1)} className="hover:text-white cursor-pointer px-1 transition-colors">←</button>}
                      {tag}
                      {index < tags.length - 1 && <button type="button" onClick={() => moverTag(index, 1)} className="hover:text-white cursor-pointer px-1 transition-colors">→</button>}
                      <button type="button" onClick={() => removerTag(tag)} className="hover:text-coral ml-1 cursor-pointer transition-colors">×</button>
                    </span>
                  ))}
                  
                 <input 
                    type="text" 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDownTag}
                    onBlur={handleBlurTag}
                    placeholder="Nova tag..." 
                    className="bg-transparent border-none outline-none text-sm w-32 flex-1"
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-muted uppercase mb-0">Sinopse Curada</label>
                  {sinopse && (
                    <button onClick={() => setSinopse('')} title="Limpar Sinopse" className="text-muted-2 hover:text-coral transition-colors cursor-pointer p-1">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <textarea value={sinopse} onChange={e => setSinopse(e.target.value)} className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm outline-none min-h-[100px] focus:border-holo-2" />
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                  <label className="text-xs font-bold text-muted uppercase">Ordem de Exibição:</label>
                  <input type="number" value={ordem} onChange={e => setOrdem(Number(e.target.value))} className="w-20 bg-panel-2 border border-line rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
                <button onClick={salvarDestaque} className="w-full md:w-auto bg-gradient-to-r from-holo-1 to-holo-2 text-void font-extrabold text-sm px-6 py-2.5 rounded-full hover:opacity-90 cursor-pointer">
                  {editId ? 'Salvar Alterações' : 'Salvar Novo Destaque'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-extrabold text-sm mb-4">📌 Destaques ativos</h3>
          {destaques.length === 0 ? (
            <div className="bg-panel border border-line rounded-xl p-10 text-center text-muted text-sm">
              Nenhum destaque cadastrado ainda.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {destaques.map((anime, index) => {
                const gradClass = `card-g${(index % 5) + 1}`
                return (
                <div key={anime.id} className={`flex items-center gap-4 border border-line p-4 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg ${gradClass}`}>
                  <div className="font-anton text-white/30 text-2xl w-8 text-center">#{anime.order_index}</div>
                  <div className="flex-1">
                    <div className="font-extrabold text-sm text-white drop-shadow-md">{anime.custom_title}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {anime.custom_tags?.map(t => (
                        <span key={t} className={`text-[10px] font-bold border px-2 py-0.5 rounded backdrop-blur-sm ${getCategoryTheme(t)}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editarDestaque(anime)} className="w-9 h-9 rounded-lg bg-panel-2/80 backdrop-blur-md border border-line text-muted hover:text-white hover:border-holo-2 transition-colors cursor-pointer flex items-center justify-center">✎</button>
                    <button onClick={() => anime.id && setItemParaExcluir({id: anime.id, titulo: anime.custom_title})} className="w-9 h-9 rounded-lg bg-panel-2/80 backdrop-blur-md border border-line text-muted hover:text-coral hover:border-coral transition-colors cursor-pointer flex items-center justify-center">🗑</button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {itemParaExcluir && (
        <div className="fixed inset-0 bg-void/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-panel border border-coral/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                <h3 className="font-anton text-coral text-xl uppercase mb-2">Remover destaque?</h3>
                <p className="text-sm text-muted mb-6">Tem certeza que deseja remover <b>"{itemParaExcluir.titulo}"</b> da curadoria? Apenas os dados customizados serão apagados.</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => setItemParaExcluir(null)} disabled={excluindo} className="flex-1 px-4 py-2.5 rounded-xl border border-line text-sm font-bold cursor-pointer hover:border-muted transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleConfirmarExclusao} disabled={excluindo} className="flex-1 px-4 py-2.5 rounded-xl bg-coral/10 border border-coral text-coral text-sm font-bold cursor-pointer hover:bg-coral hover:text-void transition-colors disabled:opacity-50 flex items-center justify-center">
                        {excluindo ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            'Remover'
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
```

## client/src/pages/Rankings.tsx

```tsx

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, SlidersHorizontal, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
    CONTENT_FILTERS, STATUS_OPTIONS, SEASON_OPTIONS,
    type FilterItem, getCategoryTheme
} from '../lib/filters'
import FilterChipGroup from '../components/FilterChipGroup'
import RankingCard from '../components/RankingCard'
import RankingSkeleton from '../components/RankingSkeleton'
import FilterSheet from '../components/FilterSheet'

interface Anime {
    mal_id: number
    title: string
    status: string
    score: number
    episodes: number
    images: { jpg: { image_url: string } }
    genres?: { name: string }[]
}

interface SavedEntry {
    mal_id: number
    id: string
    is_favorite?: boolean
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i)

const SORT_OPTIONS = [
    { label: 'Mais Populares', value: 'POPULARITY_DESC' },
    { label: 'Em Alta', value: 'TRENDING_DESC' },
    { label: 'Maior Nota', value: 'SCORE_DESC' },
    { label: 'Lançamentos', value: 'START_DATE_DESC' },
]

export default function Rankings() {
    const navigate = useNavigate()
    const [animes, setAnimes] = useState<Anime[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [showFilters, setShowFilters] = useState(false)
    const { showToast } = useToast()
    const [savingIds, setSavingIds] = useState<number[]>([])

    const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([])

    const [selectedFilters, setSelectedFilters] = useState<FilterItem[]>([])
    const [selectedStatus, setSelectedStatus] = useState('')
    const [selectedSeason, setSelectedSeason] = useState('')
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedSort, setSelectedSort] = useState('POPULARITY_DESC')

    const activeFilterCount =
        selectedFilters.length +
        (selectedStatus ? 1 : 0) +
        (selectedSeason ? 1 : 0) +
        (selectedYear ? 1 : 0) +
        (selectedSort !== 'POPULARITY_DESC' ? 1 : 0)

    useEffect(() => {
        const carregarDeck = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            try {
                const response = await fetch('/api/entries', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                })
                if (response.ok) {
                    const entradas = await response.json()
                    if (entradas && entradas.length > 0) {
                        const idsSalvos = entradas.map((e: any) => ({ mal_id: e.mal_id, id: e.id, is_favorite: e.is_favorite }))
                        setSavedEntries(idsSalvos)
                    }
                }
            } catch (err) {
                console.error('Falha ao sincronizar deck:', err)
            }
        }
        carregarDeck()
    }, [])

    useEffect(() => {
        setAnimes([])
        setPage(1)
    }, [selectedFilters, selectedStatus, selectedSeason, selectedYear, selectedSort])

    const fetchRanking = useCallback(async (currentPage: number, replace: boolean) => {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({ page: String(currentPage), perPage: '20' })
        selectedFilters.forEach(f => params.append(f.type === 'genre' ? 'genre' : 'tag', f.value))
        if (selectedStatus) params.set('status', selectedStatus)
        if (selectedSeason) params.set('season', selectedSeason)
        if (selectedSeason && selectedYear) params.set('year', selectedYear)
        params.append('sort', selectedSort)

        try {
            const response = await fetch(`/api/ranking?${params.toString()}`)
            if (!response.ok) throw new Error('Ranking indisponível no momento.')
            const data = await response.json()
            const incoming: Anime[] = data.data || []
            setAnimes(prev => replace ? incoming : [...prev, ...incoming])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [selectedFilters, selectedStatus, selectedSeason, selectedYear, selectedSort])

    useEffect(() => {
        fetchRanking(page, page === 1)
    }, [page, fetchRanking])

    const handleSalvar = async (e: React.MouseEvent, malId: number) => {
        e.preventDefault()
        if (savingIds.includes(malId)) return

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { navigate('/login'); return }

        setSavingIds(prev => [...prev, malId])

        const entrySalva = savedEntries.find(e => e.mal_id === malId)

        try {
            if (entrySalva) {
                const res = await fetch(`/api/entries/${entrySalva.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
                if (!res.ok) throw new Error()
                setSavedEntries(prev => prev.filter(e => e.mal_id !== malId))
                showToast('Removido do Deck', 'success')
            } else {
                const res = await fetch('/api/entries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ mal_id: malId, tipo: 'anime', status: 'Quero Assistir' }),
                })
                if (!res.ok) throw new Error()
                const novaEntrada = await res.json()

                setSavedEntries(prev => [...prev, { mal_id: malId, id: novaEntrada.id || novaEntrada[0]?.id, is_favorite: false }])
                showToast('Adicionado ao Deck', 'success')
            }
        } catch {
            showToast('Erro ao processar. Tente novamente.', 'error')
        } finally {
            setSavingIds(prev => prev.filter(id => id !== malId))
        }
    }

    const toggleFilter = (f: FilterItem) =>
        setSelectedFilters(prev =>
            prev.some(x => x.value === f.value && x.type === f.type)
                ? prev.filter(x => !(x.value === f.value && x.type === f.type))
                : [...prev, f]
        )

    const clearFilters = () => {
        setSelectedFilters([])
        setSelectedStatus('')
        setSelectedSeason('')
        setSelectedYear('')
        setSelectedSort('POPULARITY_DESC')
    }

    const isInitialLoad = loading && animes.length === 0 && !error

    return (
        <div className="pb-20">
            <div className="max-w-[900px] mx-auto px-5 pt-10">
                <div className="mb-6">
                    {}
                    <p className="font-mono text-xs text-holo-3 tracking-widest mb-2 select-none">RANKING GLOBAL</p>
                    <h1 className="font-anton text-3xl md:text-4xl uppercase text-text mb-2 select-none">Os mais aclamados</h1>
                    <p className="text-muted text-sm select-none">Direto da base pública da AniList — filtros aplicados no servidor.</p>
                </div>

                <div className="flex gap-2 flex-wrap mb-6 select-none border-b border-line pb-4">
                    <button
                        onClick={() => { setSelectedStatus(''); setSelectedSeason(''); setSelectedYear(''); setSelectedSort('POPULARITY_DESC'); }}
                        className={`text-[13px] font-bold px-5 py-2.5 rounded-full border transition-colors cursor-pointer ${selectedStatus === '' && selectedSort === 'POPULARITY_DESC'
                                ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-white border-transparent shadow-lg'
                                : 'bg-panel border-line text-muted hover:border-holo-3 hover:text-text'
                            }`}
                    >
                        🏆 Top Global
                    </button>
                    <button
                        onClick={() => { setSelectedStatus('RELEASING'); setSelectedSort('TRENDING_DESC'); }}
                        className={`text-[13px] font-bold px-5 py-2.5 rounded-full border transition-colors cursor-pointer flex items-center gap-2 ${selectedStatus === 'RELEASING' && selectedSort === 'TRENDING_DESC'
                                ? 'bg-coral/20 border-coral text-coral shadow-[0_0_15px_rgba(255,92,108,0.2)]'
                                : 'bg-panel border-line text-muted hover:border-coral hover:text-text'
                            }`}
                    >
                        🔥 Em Alta / Temporada
                    </button>
                </div>

                <div className="mb-6">
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        className={`select-none inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition-all duration-200 cursor-pointer ${showFilters || activeFilterCount > 0
                            ? 'border-holo-2 text-holo-2 bg-holo-2/10'
                            : 'border-line text-muted bg-panel hover:border-holo-2 hover:text-holo-2'
                            }`}
                    >
                        <SlidersHorizontal size={14} />
                        Filtros Avançados
                        {activeFilterCount > 0 && (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void text-[10px] font-black">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    <FilterSheet isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filtros Avançados">
                        <FilterChipGroup
                            label="Ordenar por"
                            options={SORT_OPTIONS}
                            isActive={(v) => selectedSort === v}
                            onToggle={(v) => setSelectedSort(v)}
                            activeClassName="bg-gold/20 border-gold/40 text-gold shadow-[0_0_12px_rgba(255,197,66,0.3)]"
                        />

                        <FilterChipGroup
                            label="Status"
                            options={STATUS_OPTIONS}
                            isActive={(v) => selectedStatus === v}
                            onToggle={(v) => setSelectedStatus(selectedStatus === v ? '' : v)}
                        />

                        <div>
                            <FilterChipGroup
                                label="Temporada"
                                options={SEASON_OPTIONS}
                                isActive={(v) => selectedSeason === v}
                                onToggle={(v) => {
                                    setSelectedSeason(selectedSeason === v ? '' : v)
                                    if (selectedSeason === v) setSelectedYear('')
                                }}
                            />

                            {selectedSeason && (
                                <div className="flex flex-wrap gap-2 p-3 mt-3 bg-panel-2 border border-line rounded-xl">
                                    <span className="text-[11px] font-bold text-muted uppercase w-full mb-1">Selecione o Ano:</span>
                                    {YEAR_OPTIONS.map(y => (
                                        <button
                                            key={y}
                                            onClick={() => setSelectedYear(selectedYear === String(y) ? '' : String(y))}
                                            className={`select-none px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${selectedYear === String(y)
                                                    ? 'bg-holo-3/20 border border-holo-3/50 text-holo-3'
                                                    : 'bg-panel border border-line text-muted hover:border-holo-3 hover:text-text'
                                                }`}
                                        >
                                            {y}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none uppercase">
                                Gêneros e Tags
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {CONTENT_FILTERS.map(f => {
                                    const isActive = selectedFilters.some(x => x.value === f.value)
                                    return (
                                        <button
                                            key={`${f.type}-${f.value}`}
                                            onClick={() => toggleFilter(f)}
                                            className={`select-none px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer border ${isActive
                                                    ? `${getCategoryTheme(f.label)} shadow-[0_0_10px_currentColor]`
                                                    : 'bg-panel-2 border-line text-muted hover:border-holo-2 hover:text-text'
                                                }`}
                                        >
                                            {f.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {activeFilterCount > 0 && (
                            <div className="pt-4 border-t border-line flex justify-end">
                                <button onClick={clearFilters} className="select-none flex items-center gap-1.5 text-coral text-xs font-bold hover:opacity-80 transition-opacity cursor-pointer">
                                    <X size={14} /> Limpar todos os filtros
                                </button>
                            </div>
                        )}
                    </FilterSheet>
                </div>

                {isInitialLoad ? (
                    <RankingSkeleton />
                ) : (
                    <div className="flex flex-col gap-3">
                        {animes.map((anime, index) => {
                            const savedEntry = savedEntries.find(e => e.mal_id === anime.mal_id)
                            return (
                                <RankingCard
                                    key={`${anime.mal_id}-${index}`}
                                    anime={anime}
                                    rank={index + 1}
                                    isSaved={!!savedEntry}
                                    isFavorite={savedEntry?.is_favorite}
                                    isSaving={savingIds.includes(anime.mal_id)}
                                    onToggleSave={handleSalvar}
                                />
                            )
                        })}
                    </div>
                )}

                {error && (
                    <div className="text-center py-10 text-coral">
                        <AlertCircle className="mx-auto mb-2 opacity-80" size={28} />
                        <p className="text-sm select-none">{error}</p>
                    </div>
                )}

                {!loading && !error && animes.length === 0 && activeFilterCount > 0 && (
                    <div className="text-center py-16">
                        <p className="font-anton uppercase text-text text-xl mb-2 select-none">Nenhum resultado</p>
                        <p className="text-sm text-muted mb-4 select-none">Nenhum anime encontrado com esses filtros.</p>
                        <button onClick={clearFilters} className="select-none px-4 py-2 rounded-full border border-coral text-coral text-sm font-bold hover:bg-coral/10 transition-colors cursor-pointer">
                            Limpar filtros
                        </button>
                    </div>
                )}

                {!isInitialLoad && !error && animes.length > 0 && (
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={loading}
                        className="select-none flex items-center justify-center gap-2 mx-auto mt-8 mb-10 px-6 py-3 rounded-full border border-line bg-panel text-text font-bold text-sm hover:border-holo-3 hover:text-holo-3 transition-colors cursor-pointer disabled:opacity-60"
                    >
                        {loading && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        {loading ? 'Carregando...' : 'Carregar mais'}
                    </button>
                )}
            </div>
        </div>
    )
}
```

