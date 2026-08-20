# Project Structure

```
├── client
│   ├── public
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   ├── manifest.json
│   │   └── sw.js
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
│   │   │   ├── BuscaAniList.tsx
│   │   │   ├── ConfigIAModal.tsx
│   │   │   ├── CuradoriaPersonagens.tsx
│   │   │   ├── DeckCard.tsx
│   │   │   ├── DeckSkeleton.tsx
│   │   │   ├── DestaqueRailCard.tsx
│   │   │   ├── DestaquesRail.tsx
│   │   │   ├── EditarEntradaModal.tsx
│   │   │   ├── EpisodeGrid.tsx
│   │   │   ├── FilterChipGroup.tsx
│   │   │   ├── FilterSheet.tsx
│   │   │   ├── ImageUploadField.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── RankingCard.tsx
│   │   │   ├── RankingSkeleton.tsx
│   │   │   ├── ReorderableTags.tsx
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
│   │   │   ├── Estatisticas.tsx
│   │   │   ├── Landing.tsx
│   │   │   ├── MeuDeck.tsx
│   │   │   ├── PainelAdmin.tsx
│   │   │   └── Rankings.tsx
│   │   ├── types
│   │   │   └── curation.ts
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
│   ├── ROADMAP.md
│   └── VISAO_RANKING_CREDIVEL.md
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
│   │   ├── curation_ai.go
│   │   ├── curation_utils.go
│   │   ├── curation.go
│   │   ├── entries_test.go
│   │   ├── entries.go
│   │   ├── notifications.go
│   │   ├── ranking.go
│   │   ├── search_test.go
│   │   ├── search.go
│   │   └── stats.go
│   ├── middleware
│   │   └── auth.go
│   └── models
│       └── curation.go
├── marketing
│   └── posts-instagram.html
├── prototipos
│   ├── config-ajuda-prototipo.html
│   ├── estatisticas-prototipo.html
│   ├── landing-prototipo.html
│   └── logo.html
├── go.mod
├── go.sum
└── project-structure.md
```

# File Contents

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

## docs/AGENTS.md

````markdown
# AGENTS.md

> Instruções para qualquer IA (chat ou agente de código) que for trabalhar comigo neste
> repositório. Se você é uma ferramenta agentic (Claude Code, Cursor, Codex CLI, etc.), leia isso
> automaticamente antes de qualquer tarefa. Se for um chat que não lê arquivos de repositório
> sozinho, colei este conteúdo manualmente como primeira mensagem.

## Quem sou eu / como quero trabalhar

Considero-me **iniciante** na maior parte destas stacks — principalmente Go. Construo boa parte
do código com ajuda de IA, então:

- **Sempre explique o porquê**, não só o quê. Se uma escolha técnica não for óbvia, explique
  antes de implementar.
- Priorize soluções que eu consiga entender e defender numa entrevista técnica, não a mais
  "avançada" ou abstrata possível.
- Se eu pedir algo que pule uma etapa de entendimento, pode perguntar antes de simplesmente obedecer.

## Fluxo de trabalho obrigatório

1. **Toda alteração nasce de uma Issue** no GitHub Projects, escrita **antes** de qualquer código,
   neste formato exato:

```markdown
Título: <tipo>: <descrição curta> #<número>

**🏷️ Labels:** `label1`, `label2`

### 🎯 Objetivo
[Descrição clara do problema/funcionalidade]

### 📋 Tarefas
- [ ] Passo técnico 1
- [ ] Passo técnico 2

### ✅ Critérios de Aceite
- [ ] Condição verificável de que está pronto
- [ ] Testes unitários criados (caminho feliz e cenários de erro) — obrigatório sempre que a
      issue envolver lógica (handlers, validação, cálculo); dispensável em issues de
      texto/estilo/documentação
```

2. **Toda alteração é feita primeiro na branch `staging`**, nunca direto em produção.
   Ambientes de produção e homologação sobem desde o início do projeto (não só no final).

3. **Commits seguem este padrão:**
```
tipo(escopo): descrição curta (closes #NN)
```
Exemplo: `fix(ui): sanitiza dados de usuário e elimina XSS em termos/categorias (closes #46)`

### Fluxo de comandos Git (sequência completa)

```bash
# 1. Garantir que a staging local está atualizada
git checkout staging
git pull origin staging

# 2. Fazer as alterações no código
# (edição normal de arquivos)

# 3. Conferir o que mudou antes de commitar
git status
git diff

# 4. Adicionar e commitar no padrão do projeto
git add <arquivos alterados>
git commit -m "tipo(escopo): descrição curta (closes #NN)"

# 5. Subir para staging (dispara o deploy de homologação)
git push origin staging

# 6. Validar em homologação (URL de staging) antes de qualquer promoção

# 7. Quando validado, promover para produção
git checkout main
git pull origin main
git merge staging
git push origin main
```

**Tipos de commit usados:** `feat`, `fix`, `refactor`, `docs`, `chore` — seguido do escopo entre
parênteses (`ui`, `auth`, `db`, etc.) e sempre referenciando a issue com `closes #NN`.

4. **Comentários de código** explicam o quê **e** por quê. Não referenciar número de issue
   (`#43`) dentro do código-fonte — isso fica só na issue e no commit, a menos que o contexto
   histórico seja realmente necessário para entender uma decisão não óbvia.

5. **Segurança não é uma fase separada.** Qualquer funcionalidade que lide com input de usuário,
   autenticação ou dados sensíveis já nasce com sanitização/validação — não se deixa para depois.

6. **Todo planejamento vive num `ROADMAP.md`** na raiz do projeto, organizado por fases
   numeradas cronologicamente. Se uma fase revelar dívida técnica ou requisito novo, a correção
   vira uma fase intermediária (ex: Fase 3.5), inserida entre as duas fases que a originaram —
   nunca empilhada no final. O roadmap também deve marcar claramente **onde está o MVP**
   (o corte mínimo publicável) e diferenciar isso de melhorias posteriores.

6.1. **Um `PAGES.md` complementa o roadmap**, rastreando status por página/tela em vez de por
   fase — colunas: nome da página, status (⏳ só planejada / ⏳ só preview / ✅ prototipada /
   implementada), e a fase do roadmap correspondente. Atualizar sempre que uma tela ganhar
   protótipo visual novo. Ao planejar telas, unificar as que não justificam página própria
   (ex: Configurações + Ajuda numa só) em vez de multiplicar páginas por padrão.

7. **CI automatizado no push para `staging`.** Um workflow do GitHub Actions roda `golangci-lint`
   e `go test ./...` a cada push nessa branch. Se quebrar, corrige antes de promover para `main`.
   Isso substitui verificação manual — configura uma vez, roda sozinho depois.

8. **Decisões técnicas estruturais vão para `DECISIONS.md`**, na raiz do projeto (não no
   `ROADMAP.md`, para não duplicar). Formato de cada entrada:
   `Data | Decisão | Por que escolhemos A em vez de B`. Só decisões que mudam arquitetura,
   framework, banco de dados ou fluxo de auth entram lá — não é log de todo commit.

9. **Code review pré-commit — recomendado, não obrigatório em tudo.** Para mudanças não-triviais
   (nova feature, lógica de autenticação, algo que mexe em dado sensível), colar a saída de
   `git diff` no chat antes de commitar, pra eu revisar como um code reviewer (lógica idiomática,
   segurança, legibilidade) antes do commit. Para ajustes pequenos (texto, estilo, correção
   simples), não é necessário parar o fluxo pra isso — o objetivo é ganhar prática de revisão
   real sem travar o ritmo do dia a dia.
10. **Verificação Cronológica de Dependências (Anti-Legacy):** 
    Antes de propor a importação de qualquer SDK, pacote externo ou API, você deve **obrigatoriamente cruzar a sua resposta com a linha do tempo atual do projeto**. 
    Não confie em dados de treinamento defasados. É terminantemente proibido introduzir pacotes obsoletos (deprecated), legados ou em End-of-Life (EOL). Se o ecossistema da ferramenta sofreu unificações ou mudanças estruturais recentes, exija e utilize a versão moderna e oficial. Se não tiver certeza absoluta do pacote atual, avise ou faça uma pesquisa antes de gerar o código.

## Tom da conversa

Prefiro uma conversa natural com a IA, não uma troca robotizada de comandos. Pode explicar,
sugerir, discordar ou perguntar — o fluxo abaixo é sobre *processo* (como o código chega no
repositório), não sobre como a conversa deve soar.

## Convenções de nomenclatura do meu portfólio

Meus projetos vivem sob o hub **"JVM Systems — Portfolio Dev"**, que reúne todos os meus
projetos em produção como "módulos". Ao criar um projeto novo destinado a esse hub, use nome
provisório claro (ex: "NomeDoProjeto (nome provisório)") até eu confirmar o nome definitivo.

````

## docs/archive/ISSUES-FASE1.md

````markdown
# 📋 Issues — Fase 1: Fundação & Arquitetura

> Prontas para copiar direto no GitHub Projects, no modelo padrão do `AGENTS.md`. Numeração
> `#<número>` é placeholder — substituir pelo número real que o GitHub atribuir ao abrir cada uma.

---

## Issue 1

```markdown
Título: feat: Inicialização do projeto Go e estrutura de pastas #<número>

**🏷️ Labels:** `backend`, `setup`

### 🎯 Objetivo
Criar o esqueleto do backend em Go, com estrutura de pastas convencional para projetos Go+Chi
(separação clara entre handlers, middleware, banco e models), e garantir que o servidor falhe de
forma clara (fail-fast) se variáveis de ambiente essenciais estiverem faltando — evita erro
silencioso em produção.

### 📋 Tarefas
- [ ] Inicializar módulo Go com Chi como roteador.
- [ ] Criar estrutura de pastas: `cmd/web`, `internal/handlers`, `internal/middleware`,
      `internal/database`, `internal/models`.
- [ ] Rota de teste (`/health`) respondendo 200 OK.
- [ ] Validação de variáveis de ambiente no boot (`SUPABASE_URL`, `SUPABASE_PUBLIC_KEY`, `PORT`)
      — o servidor deve recusar subir e logar erro claro se alguma estiver ausente.
- [ ] `.env.example` documentando as variáveis necessárias.
- [ ] `.gitignore` cobrindo `.env`, binários compilados, etc.
- [ ] Testes unitários da validação de variáveis de ambiente (caminho feliz e cenário de erro).

### ✅ Critérios de Aceite
- [ ] `go run cmd/web/main.go` sobe o servidor localmente sem erro, com `.env` preenchido.
- [ ] Remover uma variável obrigatória do `.env` faz o servidor recusar subir, com mensagem
      de erro clara indicando qual variável falta.
- [ ] `/health` responde 200 OK.
```

---

## Issue 2

```markdown
Título: feat: Configuração do Supabase e schema inicial #<número>

**🏷️ Labels:** `backend`, `database`, `setup`, `security`

### 🎯 Objetivo
Criar a base de dados do projeto no Supabase (organização e credenciais próprias do AniDeck,
não reaproveitadas de nenhum outro projeto) e o schema inicial que guarda a relação do usuário
com os títulos — de forma genérica (preparada para mangá no futuro, mesmo que só anime seja
usado agora).

### 📋 Tarefas
- [ ] Criar organização nova no Supabase (ou usar uma existente com projeto disponível — o
      limite de 2 projetos grátis é por organização).
- [ ] Criar o projeto Supabase (Postgres + Auth) do AniDeck.
- [ ] Criar tabela `media_entries`: `id`, `mal_id`, `tipo` (`anime`/`manga`), `status`, `nota`,
      `anotacao`, `created_at`, `updated_at`.
- [ ] Configurar Row Level Security (RLS) para que cada usuário só acesse suas próprias entradas.
- [ ] Conectar o backend Go ao Supabase (variáveis de ambiente já validadas na Issue 1).

### ✅ Critérios de Aceite
- [ ] Tabela `media_entries` visível e correta no Supabase Dashboard.
- [ ] RLS testado: uma consulta autenticada como usuário A não retorna entradas do usuário B.
- [ ] Backend consegue ler/escrever na tabela via variável de ambiente configurada.
```

---

## Issue 3

```markdown
Título: feat: Cliente HTTP para Jikan API com rate limiting #<número>

**🏷️ Labels:** `backend`, `integration`

### 🎯 Objetivo
Criar um cliente HTTP em Go para consumir a Jikan API, respeitando o limite real de taxa
(~3 requisições/segundo, 60/minuto) para não ser bloqueado — com throttling e tratamento de erro
próprios, já que a Jikan não avisa educadamente quando o limite estoura.

### 📋 Tarefas
- [ ] Cliente HTTP dedicado (`internal/jikan` ou similar) com timeout configurado.
- [ ] Throttling/rate limiting no lado do nosso cliente (não confiar só no limite deles).
- [ ] Tratamento de erro para respostas 429 (rate limit) e 5xx (erro do servidor deles), com
      retry/backoff razoável.
- [ ] Função de busca básica (`/anime` com query) como primeiro caso de uso testável.
- [ ] **Lembrete de arquitetura (ver `DECISIONS.md`):** nunca persistir os dados retornados da
      Jikan permanentemente no nosso banco — só usar em tempo de resposta ou cache curto.
- [ ] Testes unitários do cliente (caminho feliz e cenário de erro/rate limit).

### ✅ Critérios de Aceite
- [ ] Busca de teste retorna resultados reais da Jikan sem estourar o limite de taxa.
- [ ] Simular um 429 da API é tratado sem derrubar o servidor.
- [ ] Nenhum dado do catálogo é gravado no banco — só passa pela memória da requisição.
```

---

## Issue 4

```markdown
Título: chore: Subir ambiente de homologação (staging) esqueleto #<número>

**🏷️ Labels:** `infra`, `setup`

### 🎯 Objetivo
Colocar o projeto esqueleto (ainda sem features) no ar em ambiente de homologação — antes de
qualquer funcionalidade real, só para validar que backend, banco e variáveis de ambiente
funcionam de verdade em produção, não só localmente.

### 📋 Tarefas
- [ ] Criar serviço de homologação no Render.
- [ ] Configurar variáveis de ambiente de produção (credenciais Supabase próprias do AniDeck,
      não reaproveitadas de nenhum outro projeto).
- [ ] Branch `staging` conectada ao deploy automático.
- [ ] Confirmar que `/health` responde 200 OK no ambiente hospedado, não só local.

### ✅ Critérios de Aceite
- [ ] URL de homologação pública responde corretamente.
- [ ] Push na branch `staging` dispara novo deploy automaticamente.
- [ ] Variáveis de ambiente de produção configuradas e funcionando (credenciais próprias do
      AniDeck, não reaproveitadas de nenhum outro projeto por engano).
```

````

## docs/DECISIONS.md

```markdown
# 📑 DECISIONS.md — AniDeck

> Escopo: só decisões técnicas estruturais deste projeto.

| Data | Decisão | Por que escolhemos A em vez de B |
|---|---|---|
| 2026-08-12 | Overlays de UI viraram 2 componentes (`Sheet` e `FilterSheet`), não 1 | `FilterSheet` só é overlay no mobile (no desktop vira bloco inline na página); `Sheet` é overlay em qualquer breakpoint (modais precisam disso sempre). Comportamento visual divergente demais pra forçar um componente só — mas a lógica de abrir/fechar (trava de scroll, Esc) era idêntica, então foi extraída para o hook `useSheetBehavior.ts`, compartilhado pelos dois. |
| 2026-08-11 | **Mitigação de regressão em UPDATE de entradas (IDOR)** | O bug que permitia transferência de posse via injeção de `user_id` no payload reapareceu (possível restore antigo). A correção no backend (forçar `entrada.UserID = userID` após o decode) foi reaplicada. Foi registrada a obrigatoriedade de garantir que a RLS Policy de UPDATE no Supabase possua `WITH CHECK (user_id = auth.uid())` para atuar como segunda camada de defesa. |
| 2026-08-07 | **Migração para SDK Oficial do Supabase e ativação do RLS** | A biblioteca anterior (`nedpals/supabase-go`) era engessada e impedia a injeção dinâmica de JWTs por requisição. Migramos para a SDK oficial da comunidade (`supabase-community/supabase-go`) e trocamos a `service_key` pela `anon_key`. Isso transfere a responsabilidade de isolamento de dados (multitenancy) do código Go para o Row Level Security (RLS) nativo do Postgres, eliminando o risco de vazamento de dados por erro humano nos handlers. |
| 2026-07-30 | **Adoção de Banco de Dados Híbrido (Curadoria + Fallback)** | Para permitir que o usuário edite títulos, tags e sinopses ao seu gosto, criamos a tabela `curated_animes`. A regra de "nunca armazenar dados do catálogo" foi flexibilizada apenas para a **curadoria manual** (Data Enrichment). Buscas e rankings consultam primeiro o banco local; se o anime não estiver lá, usam a AniList como fallback. |
| 2026-07-28 | **MIGRAÇÃO DE EMERGÊNCIA:** Adoção total da **AniList API (GraphQL)** como fonte de dados | A Jikan API (usada anteriormente) anunciou oficialmente seu encerramento para 01/10/2026, com instabilidades (brownouts) imediatas. A AniList fornece uma API GraphQL oficial, estável, sem necessidade de autenticação para dados públicos, e com suporte nativo de mapeamento para o `mal_id` (campo `idMal`). Esta decisão revoga permanentemente qualquer uso do Jikan no projeto. |
| 2026-07 | ~~**Jikan API** (não oficial) como fonte de dados~~ *(REVOGADO)* | *Decisão original mantida para histórico.* A API oficial do MyAnimeList exige OAuth pesado. O Jikan resolvia o MVP sem login, mas morreu. |
| 2026-07 | Tabela `media_entries` genérica (com coluna `tipo`), não `anime_entries` específica | Mangá não está no MVP, mas a AniList atende animes e mangás na mesma API. Desenhar o schema genérico agora evita migração cara depois. |
| 2026-07 | **Nunca armazenar permanentemente dados do catálogo** (sinopse, streaming, etc.) | Os Termos de Uso da AniList (e do antigo Jikan) proíbem explícitamente "hoarding ou coleta em massa de dados". O banco do AniDeck armazena apenas a relação do usuário (status/nota) com o `mal_id`. O catálogo é consumido em tempo real. |
| 2026-07 | Deploy Monolítico (Backend Go servindo o frontend React) em vez de Deploy Desacoplado | Evita a complexidade operacional de gerenciar múltiplos pipelines de deploy e CORS. Mantém o MVP simples para infraestrutura free-tier. |
| 2026-07-29 | **Backend usa `SUPABASE_SERVICE_KEY` (service role) em vez da anon key** | O cliente Go do Supabase é inicializado uma única vez com a chave de serviço, que bypassa o RLS. A alternativa (anon key + RLS) exigiria passar o JWT do usuário em cada query individualmente — padrão mais seguro, mas que requer refatoração da camada de banco. **Trade-off aceito para o MVP:** a segurança de isolamento de dados é garantida pelos filtros `Eq("user_id", userID)` no próprio código Go, e o `userID` vem sempre do JWT validado pelo middleware (nunca do body da requisição). **Risco real:** se a service key vazar, há acesso total ao banco. Mitigação: a chave nunca entra no repositório (`.gitignore`), só em variáveis de ambiente do servidor. **Evolução futura (multiusuário):** migrar para anon key passando o JWT do usuário por query via `supabase.Client.WithToken()` — aí o RLS assume o controle e a service key pode ser removida do backend. |
```

## docs/DESIGN_TOKENS.md

````markdown
# 🎨 DESIGN_TOKENS.md — AniDeck

> Fonte única de verdade pra cores/tipografia — em vez de extrair de 9 arquivos `.html`
> diferentes (risco de pegar um valor levemente inconsistente de um protótipo pro outro).

## Paleta

```css
--void:#0A0714;     
--panel:#130F22;     
--panel-2:#181330;   
--line:#2B2247;      
--text:#F1EEFA;      
--muted:#A79BC9;     
--muted-2:#6B5F94;   

--holo-1:#FF4FD8;    
--holo-2:#7B5CFF;    
--holo-3:#3FE0F0;    
--gold:#FFC542;      
--green:#a0ff78;     
--coral:#FF5C6C;     
```

**Gradiente holo padrão** (usado em botões primários, título de marca, avatares):
`linear-gradient(90deg, var(--holo-1), var(--holo-2) 45%, var(--holo-3))`

## Tipografia

| Uso | Fonte | Peso |
|---|---|---|
| Títulos grandes (h1, h2 de seção) | `'Anton', sans-serif` | 400 (a fonte só tem esse peso) |
| Corpo de texto | `'Manrope', sans-serif` | 400-800 |
| Labels, dados, tags, timestamps | `'JetBrains Mono', monospace` | 400-700 |

Import usado em todos os protótipos:
```
https:
```

## Padrões de componente recorrentes
- **Cards:** `background: var(--panel); border: 1px solid var(--line); border-radius: 14-18px`
- **Botão primário:** gradiente holo, texto `var(--void)`, `border-radius: 99px` (pill)
- **Badge de status:** fundo com opacidade baixa da cor + borda da mesma cor + texto na cor cheia
  (ex: status "Em Dia" = fundo `rgba(160,255,120,.12)`, borda `rgba(160,255,120,.4)`, texto `#a0ff78`)
- **Border-radius geral:** 12-18px em cards, 99px (pill) em botões/badges/tags

````

## docs/fluxo-busca.md

```markdown
# 🔍 Fluxo de Busca — AniDeck

## Resposta direta à pergunta principal
**Sim, a busca funciona sem cadastro.** O catálogo principal consome a base da AniList (GraphQL), com os "Destaques AniDeck" (curadoria) armazenados no nosso próprio banco servindo de *fallback* e prioridade. Qualquer visitante pode navegar e buscar sem bloqueios. **Só a ação de salvar na sua Deck pessoal exige login.**

---

## Os 4 estados da tela de busca

### 1. Estado vazio (antes de digitar)
Uma prateleira limpa convidando o usuário a explorar. 

### 2. Estado "digitando" (busca instantânea com debounce e curadoria)
Conforme o usuário digita, o backend faz o cruzamento: busca primeiro na tabela local `curated_animes` (enriquecimento de dados) e combina com a busca na AniList. 
**Detalhe técnico importante:** Como consumimos a AniList (GraphQL), limitamos as requisições a ~90/minuto. Para não sermos bloqueados, o frontend aplica um **debounce de ~400ms** nas teclas digitadas, enquanto exibe *skeletons* na UI.

### 3. Estado "sem resultados"
Mensagem simples amigável caso a combinação de filtros e termos não retorne nada.

### 4. Estado "com resultados"
Cada card de resultado já vem com um botão **"+"** direto nele, economizando cliques.

---

## O que acontece ao clicar no "+"

| Situação do usuário | O que acontece |
|---|---|
| **Sem login** | Abre um *toast/modal* pedindo autenticação: "Faça login para salvar no Deck". Zero atrito antes da intenção real. |
| **Logado** | Adiciona silenciosamente ao banco (`media_entries`) com o status "Quero Assistir" num *quick add*, sem tirar o usuário do fluxo. |
```

## docs/ideias-para-melhorias.md

```markdown
# 📡 Fluxo de Smart Tracking & Streaming Direto

## O Conceito (A "Killer Feature")
Transformar o AniDeck de um simples catálogo estático em uma central de acompanhamento ativa. O foco é a retenção do usuário: entregar a conveniência de saber imediatamente quando há um episódio novo das suas obras favoritas e permitir o redirecionamento direto para a plataforma de streaming (ex: Crunchyroll), com o menor atrito possível.

## 1. O Gatilho de "Novo Episódio" (Backend & AniList)
A mágica acontece cruzando a nossa base local com o nó `nextAiringEpisode` da AniList GraphQL.
* **No Go (BFF):** Ao buscar os animes do usuário (rota `/api/anime/bulk`), o backend também solicita os dados de `nextAiringEpisode` (que contém o `episode` atual e o `timeUntilAiring` em segundos).
* **Lógica de Estado:** O frontend interpreta o `timeUntilAiring`. Se o tempo recém zerou ou está dentro de uma janela de 7 dias desde o último lançamento, o anime recebe a flag visual de lançamento ativo.

## 2. A Experiência no Frontend
A interface adota padrões de plataformas de streaming premium (VOD):

### A. O Deck Pessoal (Dashboard)
* **Badge "NOVO EP":** Animes nas listas "Assistindo" e "Em Dia" ganham um selo em destaque (laranja/vermelho) na capa quando um episódio inédito vai ao ar.
* **Ação Rápida "Assistir":** O card exibirá um ícone de "Play" vinculado aos `externalLinks` da AniList. Um clique redireciona o usuário direto para a página da obra na Crunchyroll/Netflix.

### B. Prateleiras de Descoberta (Rota `/descobrir`)
O estado vazio da busca deixa de existir. A página passa a contar com prateleiras de navegação horizontal (estilo Netflix):
* **Temporada Atual:** Consumindo animes filtrados por `season` (ex: SUMMER 2026).
* **Recém Adicionados:** Animes em alta ou com atualizações recentes.
* **Botão "Ver Mais":** Redireciona para a página de Rankings com os filtros já aplicados na URL.

### C. Feed de Últimos Episódios (Calendário)
Em vez de um calendário global genérico, o foco é um feed ultra-personalizado:
* Mostra uma timeline (Hoje, Amanhã, Quinta-feira) apenas com os animes que o usuário marcou na sua coleção.
* Exibe uma contagem regressiva viva (ex: `⏱ 4H 12M`) até o episódio ir ao ar no Japão.

## 3. Limitações e Contornos (Trade-offs)
* **Link Exato do Episódio:** A AniList não fornece a URL *exata* do player de vídeo do episódio (ex: episódio 12), apenas a URL raiz da obra na plataforma de streaming.
* **Solução de UX:** Como o usuário normalmente já possui sessão ativa no navegador/app da plataforma destino, redirecioná-lo para a URL raiz já exibe o botão principal de "Continuar Assistindo" engatilhado no episódio correto pelo próprio provedor.
```

## docs/PAGES.md

```markdown
# 📄 PAGES.md — AniDeck

> Rastreamento de status por página/tela, complementando o `ROADMAP.md` (que rastreia por fase).
> Atualizar sempre que uma tela ganhar protótipo visual ou for implementada de verdade.

| # | Página/Tela | Status | Fase do Roadmap |
|---|---|---|---|
| 1 | Landing pública (visitante) | ✅ Prototipada | Fase 3 |
| 2 | Login / Cadastro | ✅ Implementada | Fase 2 |
| 3 | Dashboard "Meu Deck" (logado) | ✅ Prototipada | Fase 2/3 |
| 4 | Descobrir/Buscar catálogo | ✅ Implementada | Fase 2 |
| 5 | Detalhe do anime (sinopse, personagens, staff, relacionados, streaming, reviews) | ✅ Prototipada | Fase 2 |
| 6 | Calendário de lançamentos (completo) | ✅ Prototipada | Fase 5.5 |
| 7 | Rankings (completo) | ✅ Prototipada | Fase 2 |
| 8 | Estatísticas/Dashboard analítico (gráficos) | ✅ Prototipada | Fase 4 |
| 9 | Configurações & Ajuda (unificadas em uma só página) | ✅ Prototipada | Fase 2 |

**Total: 9 páginas prototipadas, 2 delas já com implementação confirmada (Login/Cadastro e Busca).** 🎉

> ⚠️ Nota de revisão: as duas linhas acima (2 e 4) foram atualizadas de "🔧 Em implementação"
> para "✅ Implementada" com base no código real de `Auth.tsx` e `Busca.tsx` já em produção
> (autenticação funcional, busca com debounce, filtros e grade de resultados completos). Se
> alguma dessas telas ainda tiver ponta solta que não apareceu no código revisado, ajustar de
> volta.

Arquivos de protótipo já existentes:
- `landing-prototipo.html` (Landing)
- `dashboard-prototipo.html` (Dashboard)
- `busca-prototipo.html` (Busca)
- `detalhe-anime-prototipo.html` (Detalhe do Anime)
- `rankings-prototipo.html` (Rankings)
- `login-prototipo.html` (Login/Cadastro)
- `calendario-prototipo.html` (Calendário)
- `config-ajuda-prototipo.html` (Configurações & Ajuda)
- `estatisticas-prototipo.html` (Estatísticas)
```

## docs/README.md

```markdown
# 🎴 AniDeck

> Domínio: `anideck.com.br`

Catálogo pessoal de anime construído sobre a base global (via AniList API), com
status de progresso, notas e avaliações próprias — uma interface moderna e com identidade visual
própria, diferente da experiência padrão de outras plataformas. Módulo futuro do hub
[JVM Systems — Portfolio Dev](../jvm-systems-portfolio-dev/README.md).

**Status:** 🚧 Em planejamento — ver [`ROADMAP.md`](./ROADMAP.md).

---

## ✨ Funcionalidades

### MVP
- [ ] Busca e navegação no catálogo de anime (via AniList API).
- [ ] Salvar anime na lista pessoal com status (assistindo / em dia / completo / quero assistir / dropado).
- [ ] Notas e avaliações próprias por título.
- [ ] Filtro por gênero/tag.
- [ ] Filtro por plataforma de streaming disponível (ex: só mostrar o que está na Crunchyroll) —
      **nota técnica:** consulta ao vivo cruzando dados com o campo `externalLinks` da AniList a cada busca, **sem
      armazenar dado de streaming no banco** (decisão de ToS registrada em `DECISIONS.md`).

> **Definição sem ambiguidade:** a lista do usuário é 100% controlada manualmente — cada entrada
> é adicionada, classificada (status) e anotada (nota/comentário) pelo próprio usuário. Não existe
> importação automática nem lista gerada por algoritmo. Isso é o que o protótipo chamava de
> "curadoria pessoal"; aqui documentado sem termo vago, para não gerar interpretação errada por
> quem for implementar.

### Pós-MVP
- [ ] Dashboard de estatísticas pessoais (tempo assistido, gênero favorito, etc.).
- [ ] Recomendações personalizadas com base na lista salva.
- [ ] Agregador de notícias de fontes oficiais de anime.
- [ ] Suporte multiusuário (hoje é uso pessoal, pode abrir para outras pessoas depois).

---

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Backend | Go + Chi |
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Banco de dados | PostgreSQL (Supabase) |
| Fonte de dados externa | [AniList API](https:
| Autenticação | Supabase Auth (JWT) |

---

## 🎨 Identidade visual

Ainda em definição — direção combinada: fusão **cyberpunk/sci-fi com estética de anime**,
moderna, com identidade própria e visualmente marcante (não um tema genérico de dev). Protótipo
visual desenhado na pasta `/prototipos`.

---

## 🗺️ Roadmap

Planejamento completo por fases em [`ROADMAP.md`](./ROADMAP.md).

---

## 👤 Autor

**João Victor Mendes**
[GitHub](https:
```

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

- [x] Migrar a lógica de agregação de dados do client/backend para **VIEWS e FUNCTIONS nativas no Postgres (Supabase)**, exigindo domínio de queries complexas.
- [x] Cálculo de métricas pessoais (tempo assistido, gênero favorito, distribuição por status) direto no banco.
- [x] Visualização (gráficos) no painel do usuário consumindo essas procedures.

## 🤖 Fase 4.5: Automação e IA Generativa (Integração Google Workspace)

- [x] **Agente Curador (IA no Admin):** Integrar um LLM para reescrever sinopses frias da AniList de forma autônoma, adotando o tom de voz "AniDeck".
- [x] **Engenharia de Prompt Dinâmica e Resiliência:** Criação de cache em memória no Go (`sync.RWMutex`) consultando tabela genérica no Supabase para editar as regras da IA sem mexer no código, suporte a Markdown, e fallback automático (`3.7-flash` -> `3.6-flash`).
- [ ] ⏸️ **PAUSADO (17/08/2026): Agente Olheiro (Automação Background).** Cruzar os favoritos do
      usuário (SQL) com os *trends* da AniList só faz sentido produzir recomendação confiável
      depois de resolver **o que significa "melhor anime"** — problema estrutural documentado em
      `VISAO_RANKING_CREDIVEL.md`. Retomar só depois de decidir, ao menos, a versão simples da
      Fase 6.5 (ranking ponderado).
- [ ] 🚨 **DECISÃO ARQUITETURAL (17/08/2026):** descartado o uso de **n8n** como orquestrador —
      exigiria hospedar/manter mais um serviço com custo recorrente, incompatível com o estágio
      atual do projeto (ver critério de não gastar recursos em projeto que ainda não está
      pronto). Quando o Agente Olheiro for retomado, a implementação fica **nativa em Go**
      (mesmo backend, sem serviço novo), disparada por agendador externo gratuito
      (cron-job.org) batendo num endpoint interno protegido por chave secreta — mesmo padrão
      adotado na Fase 6.7 para notificação de episódios.
- [ ] **Integração Google Workspace:** O Agente gera recomendações personalizadas em HTML e
      utiliza a API do Gmail (SDK oficial, direto em Go — não via n8n) para disparar um relatório
      automático para a caixa de entrada do usuário.

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

## ⚖️ Fase 6.5: Ranking Ponderado

> Nasceu da auditoria de UX registrada em `docs/ideias-para-melhorias.md`, item 2.2 (e 2.3).
> Ainda sem decisão de fórmula fechada — depende de confirmar se a AniList expõe contagem de
> votos/favoritos junto com a nota antes de estimar esforço real. Não iniciar antes de fechar
> essa decisão em `DECISIONS.md`.
>
> **Nota (17/08/2026):** a versão simples desta fase (média bayesiana com dado que a AniList já
> fornece hoje) **não depende** do sistema de credibilidade de longo prazo descrito em
> `VISAO_RANKING_CREDIVEL.md` — pode ser implementada de forma independente, a qualquer momento,
> sem esperar Fase 7 (Multiusuário).

- [ ] Confirmar se a query GraphQL da AniList retorna contagem de avaliações/favoritos por anime.
- [ ] Definir e documentar em `DECISIONS.md` a fórmula de ponderação escolhida (ex: média
      bayesiana ao estilo IMDb, puxando notas com poucos votos em direção à média geral).
- [ ] Implementar o cálculo (avaliar se fica em Go/handler ou como view/function no Postgres,
      alinhado à Fase 4).
- [ ] Como parte da mesma decisão, avaliar o critério de equilíbrio entre animes clássicos e
      recentes (item 2.3 do documento de ideias).
- [ ] **Bloqueado por esta fase:** indicador de movimentação de posições no ranking (▲/▼) —
      só faz sentido rastrear histórico de posição depois que a fórmula final estiver estável,
      senão todo mundo "sobe ou desce" no dia da troca de fórmula sem ter mudado de posição de
      verdade.

## 🖼️ Fase 6.6: Enriquecimento da Página de Detalhes (Concluída)

> **Decisão de Produto (Agosto/2026):** O escopo original previa adicionar Dubladores, Staff e Galerias de Imagens. Pivotamos essa decisão e descartamos esses dados para evitar poluição visual e lentidão na query GraphQL. O foco da fase tornou-se a imersão (UX Premium), as datas de lançamento e o refinamento das estatísticas.

- [x] **Refatoração de UX/UI:** Substituição do formulário de avaliação estático por um Modal (BottomSheet) integrado, aplicação de cores dinâmicas no Design System das tags e adoção de pôsteres verticais contínuos para a seção de títulos relacionados.
- [x] **Performance e Datas de Episódios (Killer Feature):** Paginação virtual (chunks de 24 episódios) no `EpisodeGrid` para evitar travamento em animes muito longos e cálculo dinâmico da data de lançamento exata (passada e futura) baseado na `startDate` do anime.
- [x] **Estatísticas Vivas:** Consumo do `statusDistribution` da AniList (revelando a % da comunidade que completou ou dropou a obra) e histograma animado com marcação destacada da nota do próprio usuário.
- [x] **Correções de Acessibilidade:** Implementação de `custom-scrollbar` para navegação por mouse no desktop na lista de personagens.

## 📺 Fase 6.7: Progresso por Episódio & Notificação de Lançamento

> Nasceu de uma sessão de planejamento em 17/08/2026, ao discutir os pré-requisitos técnicos
> para a visão de longo prazo do ranking com credibilidade (`VISAO_RANKING_CREDIVEL.md`).
> Planejamento completo, com issues detalhadas em formato `AGENTS.md`, motivação, gargalos
> identificados (cobertura variável do campo `streamingEpisodes` da AniList, e o fato de que
> temporadas já são separadas por `mal_id` — não precisa de agrupamento manual) e mitigação de
> timeout de cold-start documentados em `FASE_6.7_EPISODIOS.md`.

- [X]  Criar tabela `episode_progress` (Supabase) + endpoints Go para marcar/desmarcar episódio assistido, com RLS extraindo o `user_id` sempre do JWT.
- [X]  Grade visual de episódios na página de detalhe/Meu Deck, usando `streamingEpisodes` da AniList (com fallback).
- [X]  **[NOVO] Antecipação PWA:** Adicionar `manifest.json` e registrar o `Service Worker` no frontend React (trazido da Fase 8).
- [X]  **[NOVO]** Criar tabela `push_subscriptions` (Supabase) para armazenar os endpoints, chaves `p256dh` e `auth` dos navegadores dos usuários.
- [X]  Notificação de episódio novo lançado (checagem diária via cron-job.org batendo em endpoint interno). O backend deverá gravar o histórico na tabela `notifications` **e simultaneamente** disparar o alerta para o sistema operacional via `webpush-go` usando chaves VAPID.

## 👥 Fase 7: Multiusuário (futuro, avaliar quando chegar)

- [ ] Reavaliar modelo de dados e permissões antes de abrir para outras pessoas.
- [ ] **Pré-requisito para retomar o Agente Olheiro e a visão completa de ranking com
      credibilidade** — ver `VISAO_RANKING_CREDIVEL.md` (documento de visão, não compromisso de
      escopo; sistema de peso de voto por XP de gênero só faz sentido com base de usuários real).

## 📱 Fase 8: Publicação como App (futuro, avaliar quando chegar)

- [x]  *(Concluído na Fase 6.7: manifest.json e service worker base)*.
- [ ]  Adicionar suporte a cache offline completo e estratégias de *Network First/Cache First* no Service Worker.
- [ ]  Empacotar via TWA (Trusted Web Activity, usando Bubblewrap/PWABuilder) para publicar na Play Store.

---

## 📋 Backlog / Ideias em Avaliação

- [ ] **Notificações de novas temporadas/sequências** — avisar quando uma sequência/temporada nova é anunciada.
- [ ] **Filtro por ano na Busca, independente de temporada** — hoje o campo de ano só habilita se
      uma temporada estiver selecionada (ver `docs/ideias-para-melhorias.md`, item 7.1). Aceitável
      como está por ora; revisar se surgir demanda real de usuário.

### Avaliado e descartado (documentado pra não reabrir sem contexto)
- **Fórum, Clubes, Blogs:** equivalem a construir uma rede social inteira.
- **Mensageria direta (Inbox):** pressupõe comunidade ativa.
- **News / Featured Articles / MALxJapan:** conteúdo editorial que o MAL produz com equipe própria.
- **Mini-página de Pessoa/Estúdio** — ao clicar num dublador/estúdio na página de Detalhe, ver outros trabalhos dele.
```

## docs/VISAO_RANKING_CREDIVEL.md

```markdown
# 🔮 Visão de Longo Prazo — Ranking com Credibilidade Real

> **Este documento NÃO é roadmap.** Não tem issue, não tem prazo, não é compromisso. É um
> registro da ideia enquanto ela está fresca, pra existir em algum lugar até o dia (se o dia
> chegar) em que fizer sentido puxar pedaços dela pro `ROADMAP.md` de verdade — provavelmente
> depois da Fase 7 (Multiusuário), quando o AniDeck tiver uma comunidade mínima rodando.
>
> Escrito a partir de uma conversa em 17/08/2026. Mantenha esse arquivo fora do fluxo normal de
> revisão de código — ele existe pra sonhar, não pra ser implementado linha por linha.

---

## 🎯 O problema de fundo

Nota de anime hoje (AniList, MAL) é **voto sem contexto**: todo mundo vale o mesmo peso,
independente de conhecer o gênero, ter assistido de verdade, ou estar avaliando por impulso.
Isso produz dois problemas opostos:

- Anime **popular mas mediano** sobe no ranking só por volume de voto.
- Anime **excelente mas nichado** nunca aparece porque poucas pessoas assistiram.

A pergunta central que motiva esse documento: **dá pra medir "bom" de um jeito que separe
qualidade real de popularidade crua — sem fingir que gosto não é subjetivo?**

---

## 🗳️ O sistema descrito na conversa

### 1. Perfil do usuário
Ao criar conta: gênero, nacionalidade, idade, e 3-5 categorias/gêneros favoritos (Isekai,
Fantasia, Romance, etc. — quantidade ideal ainda a validar).

### 2. Peso de voto por XP de gênero
- Voto começa com peso baixo.
- Usuário ganha **XP por gênero** ao marcar anime como assistido (episódios/temporadas completas)
  no Meu Deck — ex: assistir Isekai completo dá XP de Isekai.
- Ao atingir um nível (ex: nível 10) num gênero, o peso do voto **dentro daquele gênero** aumenta.
- Ou seja: seu voto em Isekai pesa mais se você **provou**, com tempo assistido real, que entende
  de Isekai — não só porque disse que gosta no cadastro.

### 3. Sinal negativo também é dado
Cogitar uma regra pra identificar gêneros que o usuário **menos** gosta — mas só conta o voto
baixo se ele assistiu o anime inteiro (evita "dei nota 1 sem assistir só porque não curto o
gênero").

### 4. Filtros e estatísticas avançadas
Cruzamentos tipo "todos os brasileiros do sexo masculino que assistem Isekai também gostam de
X" — analytics agregada usando os dados demográficos + comportamentais coletados.

### 5. Usuários "nível supremo"
Direito de comentar sobre animes — comentários curados/avaliados antes de publicados
publicamente.

### 6. Voto por episódio (em aberto)
Ainda não decidido se vale a pena — se implementado, precisa de peso próprio pra não distorcer a
nota geral da obra.

---

## ⚖️ Riscos e pontos de atenção (pra encarar quando chegar a hora, não agora)

### Privacidade / LGPD
Coletar gênero, nacionalidade e idade num site brasileiro público entra na LGPD de verdade —
não é proibitivo, mas exige política de privacidade clara, consentimento explícito, cuidado
extra com menores de idade, e uma decisão sobre **o que realmente precisa ser coletado**. Ideia
pra reduzir exposição quando for implementar: o peso de voto por gênero só depende do
**comportamento** (tempo assistido, gênero), não da demografia — dá pra rodar o sistema de XP
inteiro sem pedir nacionalidade/gênero/idade no cadastro, e deixar esses campos como
**opcionais**, só pra quem quiser contribuir com as estatísticas agregadas. Reduz a superfície
de dado sensível sem perder a mecânica principal.

### Gaming do sistema (trapaça)
Assim que o voto valer algo, gente vai tentar burlar: marcar como "assistido" sem assistir, criar
múltiplas contas pra farmar XP, etc. Todo sistema de reputação (Stack Overflow, Reddit karma,
Uber/Airbnb rating) passa por isso mais cedo ou mais tarde. Não precisa de solução agora, só
saber que uma "trava" vai ser necessária no futuro (ex: tempo mínimo entre marcar episódios,
limite de XP ganho por dia, etc.).

### Manipulação coordenada (brigading)
Se o site crescer, grupos organizados (fã-clube, guerra de fandom) podem tentar votar em bloco
pra inflar ou derrubar um anime especificamente. Vale pensar em detecção de padrão anômalo de
voto no futuro (picos suspeitos de votos vindos de contas novas, por exemplo).

### Depende 100% de ter usuários reais
Sem gente votando de verdade, é matemática sem dado pra processar. Está formalmente amarrado à
Fase 7 (Multiusuário) do `ROADMAP.md`, que hoje está marcada como "futuro, avaliar quando
chegar" — e com razão.

---

## 💡 Ideias complementares (things eu pensei que você não tinha mencionado)

### Comparação em vez de nota absoluta
Um problema difícil de resolver só com peso de XP: **escala pessoal de nota varia por pessoa**
(seu 7 pode ser o 9 de outra pessoa). Um jeito diferente de atacar isso — usado por apps como o
Beli (de restaurantes) — é pedir **comparação par-a-par** em vez de nota de 1 a 10: "você gostou
mais de X ou de Y?". Isso gera um ranking relativo (parecido com sistema Elo de xadrez) que é
mais resistente a "escala pessoal" do que pedir uma nota absoluta. Pode ser interessante como
mecânica alternativa ou complementar ao voto direto, especialmente pra usuários de nível alto.

### Transparência do cálculo
Quando o ranking usa peso ponderado, "por que esse anime está em #3" deixa de ser óbvio. Mostrar
um breakdown simples (ex: "nota bruta: 8.2 · ajustada pela credibilidade da comunidade: 8.7")
ajuda a construir confiança em vez de parecer uma caixa-preta arbitrária — principalmente
importante se um dia você quiser competir de verdade com a percepção de credibilidade do MAL/
AniList.

### Selo de "controverso" em vez de esconder a divergência
Anime com nota alta mas variância enorme entre gêneros de fãs (ex: adorado por fãs de Isekai,
odiado pelo resto) pode ganhar um selo "Polarizante" em vez de só uma média que esconde essa
divergência — isso é uma informação genuinamente útil que nem MAL nem AniList mostram hoje.

### Rollout em camadas, não tudo de uma vez
Se um dia isso sair do papel, a sequência mais segura tecnicamente é: (1) Fase 6.5 — média
bayesiana simples usando dados públicos da AniList, já reduz o problema de "voto cru sem
contexto" sem precisar de usuário nenhum; (2) só depois, com base de usuário mínima rodando na
Fase 7, camada de peso por XP de gênero por cima disso. Ou seja, a Fase 6.5 não é descartável —
ela vira o alicerce estatístico de tudo isso, não um desvio.

---

## 📈 Sobre crescimento orgânico

Você mencionou a ideia de criar conteúdo nas redes sociais antes de pensar em tráfego pago — essa
ordem faz sentido: comunidade nerd de anime historicamente responde melhor a conteúdo genuíno
(curadoria, opinião, personalidade) do que a anúncio direto, principalmente pré-lançamento de
qualquer coisa que dependa de confiança da comunidade (que é literalmente o que esse sistema de
ranking está tentando vender). Tráfego pago tende a funcionar melhor **depois** que já existe
alguma prova social orgânica pra sustentar a campanha, não antes.

---

## 🚫 Por que isso não vira Issue hoje

Você é iniciante, esse é seu maior projeto pessoal, e ainda tem bastante chão entre o estado
atual do AniDeck e o ponto onde essa visão faz sentido tecnicamente (Fase 7 pra frente). Nada
aqui precisa ser decidido, revisado ou aceito agora — o valor desse documento é só existir, pra
quando (se) você quiser puxar um pedaço dele pro roadmap de verdade, com o raciocínio já pronto
em vez de reconstruído do zero.

```

## internal/anilist/client.go

```go
package anilist

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/microcosm-cc/bluemonday"
	"golang.org/x/time/rate"
)

type Client struct {
	httpClient *http.Client
	limiter    *rate.Limiter
	baseURL    string
}

func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 15 * time.Second},
		limiter:    rate.NewLimiter(rate.Limit(1.5), 10),
		baseURL:    "https:
	}
}

var stripHTML = bluemonday.StrictPolicy()

func (c *Client) gqlRequest(ctx context.Context, query string, variables map[string]interface{}, out interface{}) error {
	if err := c.limiter.Wait(ctx); err != nil {
		return fmt.Errorf("erro no rate limiter: %w", err)
	}

	body, _ := json.Marshal(map[string]interface{}{"query": query, "variables": variables})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("erro ao criar requisição: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("erro ao executar requisição HTTP: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("erro inesperado da AniList: status %d", resp.StatusCode)
	}

	var envelope struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return fmt.Errorf("erro ao decodificar JSON: %w", err)
	}
	return json.Unmarshal(envelope.Data, out)
}

func mapStatus(s string) string {
	switch s {
	case "FINISHED":
		return "Finished Airing"
	case "RELEASING":
		return "Currently Airing"
	case "NOT_YET_RELEASED":
		return "Not yet aired"
	default:
		return s
	}
}

const searchQuery = `
query ($page: Int, $perPage: Int, $search: String, $sort: [MediaSort], $genre_in: [String], $tag_in: [String], $season: MediaSeason, $seasonYear: Int, $status: MediaStatus) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: $sort, genre_in: $genre_in, tag_in: $tag_in, season: $season, seasonYear: $seasonYear, status: $status) {
      idMal
      title { romaji english }
      status
      episodes
      duration
      averageScore
      coverImage { large }
      genres
      externalLinks { site url }
      nextAiringEpisode { airingAt timeUntilAiring episode }
    }
  }
}`

type aniListMedia struct {
	IDMal         int                              `json:"idMal"`
	Title         struct{ Romaji, English string } `json:"title"`
	Status        string                           `json:"status"`
	StartDate     struct{ Year, Month, Day int }   `json:"startDate"`
	Description   string                           `json:"description"`
	Episodes      int                              `json:"episodes"`
	Duration      int                              `json:"duration"` 
	AverageScore  int                              `json:"averageScore"`
	BannerImage   string                           `json:"bannerImage"`
	CoverImage    struct{ Large string }           `json:"coverImage"`
	Genres        []string                         `json:"genres"`
	ExternalLinks []struct {
		Site string `json:"site"`
		URL  string `json:"url"`
	} `json:"externalLinks"`
	Rankings []struct {
		Rank    int    `json:"rank"`
		Type    string `json:"type"`
		AllTime bool   `json:"allTime"`
	} `json:"rankings"`

	NextAiringEpisode *NextAiringEpisode `json:"nextAiringEpisode"`

	Characters struct {
		Edges []struct {
			Role string `json:"role"`
			Node struct {
				ID   int `json:"id"`
				Name struct {
					Full string `json:"full"`
				} `json:"name"`
				Image struct {
					Large string `json:"large"`
				} `json:"image"`
			} `json:"node"`
		} `json:"edges"`
	} `json:"characters"`

	Studios struct {
		Edges []struct {
			Node struct {
				Name string `json:"name"`
			} `json:"node"`
		} `json:"edges"`
	} `json:"studios"`

	Relations struct {
		Edges []struct {
			RelationType string `json:"relationType"`
			Node         struct {
				IDMal int    `json:"idMal"`
				Type  string `json:"type"`
				Title struct {
					Romaji  string `json:"romaji"`
					English string `json:"english"`
				} `json:"title"`
				CoverImage struct {
					Large string `json:"large"`
				} `json:"coverImage"` 
			} `json:"node"`
		} `json:"edges"`
	} `json:"relations"`

	StreamingEpisodes []struct {
		Title     string `json:"title"`
		Thumbnail string `json:"thumbnail"`
		URL       string `json:"url"`
		Site      string `json:"site"`
	} `json:"streamingEpisodes"`
}

func (m *aniListMedia) toAnime() Anime {
	title := m.Title.Romaji
	if title == "" {
		title = m.Title.English
	}

	var genres []struct {
		Name string `json:"name"`
	}
	for _, g := range m.Genres {
		genres = append(genres, struct {
			Name string `json:"name"`
		}{Name: g})
	}

	var streaming []struct {
		Name string `json:"name"`
		URL  string `json:"url"`
	}
	for _, link := range m.ExternalLinks {
		streaming = append(streaming, struct {
			Name string `json:"name"`
			URL  string `json:"url"`
		}{
			Name: link.Site,
			URL:  link.URL,
		})
	}

	var bestRanking int
	for _, r := range m.Rankings {
		if r.Type == "RATED" && r.AllTime {
			bestRanking = r.Rank
			break
		}
	}

	var studios []struct {
		Name string `json:"name"`
	}
	for _, edge := range m.Studios.Edges {
		studios = append(studios, struct {
			Name string `json:"name"`
		}{Name: edge.Node.Name})
	}

	var chars []Character
	for _, edge := range m.Characters.Edges {
		chars = append(chars, Character{
			ID:    edge.Node.ID,
			Name:  edge.Node.Name.Full,
			Image: edge.Node.Image.Large,
			Role:  edge.Role,
		})
	}

	var relations []struct {
		Relation string `json:"relation"`
		Entry    []struct {
			MalID int    `json:"mal_id"`
			Type  string `json:"type"`
			Name  string `json:"name"`
			Image string `json:"image"`
		} `json:"entry"`
	}
	for _, edge := range m.Relations.Edges {
		relTitle := edge.Node.Title.Romaji
		if relTitle == "" {
			relTitle = edge.Node.Title.English
		}
		relations = append(relations, struct {
			Relation string `json:"relation"`
			Entry    []struct {
				MalID int    `json:"mal_id"`
				Type  string `json:"type"`
				Name  string `json:"name"`
				Image string `json:"image"`
			} `json:"entry"`
		}{
			Relation: edge.RelationType,
			Entry: []struct {
				MalID int    `json:"mal_id"`
				Type  string `json:"type"`
				Name  string `json:"name"`
				Image string `json:"image"`
			}{{
				MalID: edge.Node.IDMal,
				Type:  edge.Node.Type,
				Name:  relTitle,
				Image: edge.Node.CoverImage.Large, 
			}},
		})
	}

		var streamingEps []StreamingEpisode
	for _, ep := range m.StreamingEpisodes {
		streamingEps = append(streamingEps, StreamingEpisode{
			Title:     ep.Title,
			Thumbnail: ep.Thumbnail,
			URL:       ep.URL,
			Site:      ep.Site,
		})
	}

	var startDate *FuzzyDate
	if m.StartDate.Year > 0 && m.StartDate.Month > 0 && m.StartDate.Day > 0 {
		startDate = &FuzzyDate{Year: m.StartDate.Year, Month: m.StartDate.Month, Day: m.StartDate.Day}
	}

	return Anime{
		MalID:             m.IDMal,
		Title:             title,
		Status:            mapStatus(m.Status),
		StartDate:         startDate,
		Synopsis:          stripHTML.Sanitize(m.Description),
		Episodes:          m.Episodes,
		Duration:          m.Duration,
		Score:             float64(m.AverageScore) / 10.0,
		Ranking:           bestRanking,
		BannerImage:       m.BannerImage,
		Characters:        chars,
		NextAiringEpisode: m.NextAiringEpisode,
		Images: struct {
			JPG struct {
				ImageURL string `json:"image_url"`
			} `json:"jpg"`
		}{
			JPG: struct {
				ImageURL string `json:"image_url"`
			}{
				ImageURL: m.CoverImage.Large,
			},
		},
		Genres:    genres,
		Streaming: streaming,
		Studios:   studios,
		Relations: relations,
		StreamingEpisodes: streamingEps,
	}
}

type SearchFilters struct {
	Genres     []string
	Tags       []string
	Season     string
	SeasonYear int
	Status     string
	Sort       string
}

func (c *Client) SearchAnime(ctx context.Context, query string, page int, perPage int, f SearchFilters) (*AnimeSearchResponse, error) {
	var resultado struct {
		Page struct{ Media []aniListMedia } `json:"Page"`
	}

	variables := map[string]interface{}{
		"page":    page,
		"perPage": perPage,
	}
	if query != "" {
		variables["search"] = query
	}
	if f.Sort != "" {
		variables["sort"] = []string{f.Sort}
	}
	if len(f.Genres) > 0 {
		variables["genre_in"] = f.Genres
	}
	if len(f.Tags) > 0 {
		variables["tag_in"] = f.Tags
	}
	if f.Season != "" {
		variables["season"] = f.Season
	}
	if f.SeasonYear > 0 && f.Season != "" {
		variables["seasonYear"] = f.SeasonYear
	}
	if f.Status != "" {
		variables["status"] = f.Status
	}

	if err := c.gqlRequest(ctx, searchQuery, variables, &resultado); err != nil {
		return nil, err
	}

	var animes []Anime
	for _, m := range resultado.Page.Media {
		if m.IDMal == 0 {
			continue
		}
		animes = append(animes, m.toAnime())
	}
	return &AnimeSearchResponse{Data: animes}, nil
}

const byIdQuery = `
query ($idMal: Int) {
  Media(idMal: $idMal, type: ANIME) {
    idMal
    title { romaji english }
    status
	startDate { year month day }
    description
    episodes
    duration
    averageScore
    coverImage { large }
    bannerImage
    genres
    externalLinks { site url }
	rankings { rank type allTime }
	streamingEpisodes { title thumbnail url site }
	streamingEpisodes { title thumbnail url site }
    nextAiringEpisode { airingAt timeUntilAiring episode }
    characters(sort: ROLE, perPage: 15) {
      edges {
        role
        node { id name { full } image { large } }
      }
    }
    studios { edges { node { name } } }
    relations { edges { relationType node { idMal type title { romaji english } coverImage { large } } } }
  }
}`

const byIdsQuery = `
query ($idMal_in: [Int]) {
  Page(page: 1, perPage: 50) {
    media(idMal_in: $idMal_in, type: ANIME) {
      idMal
      title { romaji english }
      status
      description
      episodes
      duration
      averageScore
      coverImage { large }
      genres
      externalLinks { site url }
      rankings { rank type allTime }
      nextAiringEpisode { airingAt timeUntilAiring episode }
    }
  }
}`

func (c *Client) GetAnimeById(ctx context.Context, id string) (*AnimeByIdResponse, error) {
	var malID int
	if _, err := fmt.Sscanf(id, "%d", &malID); err != nil {
		return nil, fmt.Errorf("ID inválido")
	}

	var resultado struct {
		Media aniListMedia `json:"Media"`
	}
	if err := c.gqlRequest(ctx, byIdQuery, map[string]interface{}{"idMal": malID}, &resultado); err != nil {
		return nil, err
	}
	return &AnimeByIdResponse{Data: resultado.Media.toAnime()}, nil
}

const statsQuery = `
query ($idMal: Int) {
  Media(idMal: $idMal, type: ANIME) {
    stats { 
        scoreDistribution { score amount } 
        statusDistribution { status amount }
    }
  }
}`

func (c *Client) GetAnimeStatistics(ctx context.Context, id string) (*AnimeStatisticsResponse, error) {
	var malID int
	if _, err := fmt.Sscanf(id, "%d", &malID); err != nil {
		return nil, fmt.Errorf("ID inválido")
	}

	var resultado struct {
		Media struct {
			Stats struct {
				ScoreDistribution  []struct{ Score, Amount int }
				StatusDistribution []struct{ Status string; Amount int }
			}
		}
	}
	
	if err := c.gqlRequest(ctx, statsQuery, map[string]interface{}{"idMal": malID}, &resultado); err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar estatísticas do anime %d: %v", malID, err)
		return nil, err
	}

	total := 0
	for _, s := range resultado.Media.Stats.ScoreDistribution {
		total += s.Amount
	}

	var scores []ScoreDistribution
	for _, s := range resultado.Media.Stats.ScoreDistribution {
		pct := 0.0
		if total > 0 {
			pct = float64(s.Amount) / float64(total) * 100
		}
		scores = append(scores, ScoreDistribution{Score: s.Score / 10, Votes: s.Amount, Percentage: pct})
	}

	var statuses []StatusDistribution
	for _, s := range resultado.Media.Stats.StatusDistribution {
		statuses = append(statuses, StatusDistribution{Status: s.Status, Amount: s.Amount})
	}

	return &AnimeStatisticsResponse{Data: AnimeStatistics{Scores: scores, Statuses: statuses}}, nil
}

const topAnimeQuery = `
query ($page: Int, $perPage: Int, $sort: [MediaSort], $genre_in: [String], $tag_in: [String], $season: MediaSeason, $seasonYear: Int, $status: MediaStatus) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: $sort, genre_in: $genre_in, tag_in: $tag_in, season: $season, seasonYear: $seasonYear, status: $status) {
      idMal
      title { romaji english }
      status
      description
      episodes
      duration
      averageScore
      coverImage { large }
      genres
      externalLinks { site url }
      nextAiringEpisode { airingAt timeUntilAiring episode }
    }
  }
}`

func (c *Client) GetTopAnime(ctx context.Context, page int, perPage int, f SearchFilters) (*AnimeSearchResponse, error) {
	var resultado struct {
		Page struct{ Media []aniListMedia } `json:"Page"`
	}

	variables := map[string]interface{}{
		"page":    page,
		"perPage": perPage,
	}

	if f.Sort != "" {
		variables["sort"] = []string{f.Sort}
	} else {
		variables["sort"] = []string{"POPULARITY_DESC"}
	}

	if len(f.Genres) > 0 {
		variables["genre_in"] = f.Genres
	}
	if len(f.Tags) > 0 {
		variables["tag_in"] = f.Tags
	}
	if f.Season != "" {
		variables["season"] = f.Season
	}
	if f.SeasonYear > 0 && f.Season != "" {
		variables["seasonYear"] = f.SeasonYear
	}
	if f.Status != "" {
		variables["status"] = f.Status
	}

	if err := c.gqlRequest(ctx, topAnimeQuery, variables, &resultado); err != nil {
		return nil, err
	}

	var animes []Anime
	for _, m := range resultado.Page.Media {
		if m.IDMal == 0 {
			continue
		}
		animes = append(animes, m.toAnime())
	}
	return &AnimeSearchResponse{Data: animes}, nil
}

func (c *Client) fetchByAliases(ctx context.Context, missingIDs []int) ([]Anime, error) {
	if len(missingIDs) == 0 {
		return nil, nil
	}

	var sb strings.Builder
	sb.WriteString("query {\n")
	for _, id := range missingIDs {
		fmt.Fprintf(&sb, "  a%d: Media(idMal: %d, type: ANIME) {\n", id, id)
		sb.WriteString(`    idMal
    title { romaji english }
    status
    description
    episodes
    duration
    averageScore
    coverImage { large }
    genres
    externalLinks { site url }
    rankings { rank type allTime }
    nextAiringEpisode { airingAt timeUntilAiring episode }
  }
`)
	}
	sb.WriteString("}\n")

	var rawMap map[string]*aniListMedia
	if err := c.gqlRequest(ctx, sb.String(), nil, &rawMap); err != nil {
		return nil, fmt.Errorf("erro no fallback de aliases: %w", err)
	}

	var fetched []Anime
	for _, id := range missingIDs {
		key := fmt.Sprintf("a%d", id)
		if media, ok := rawMap[key]; ok && media != nil {
			if media.IDMal == 0 {
				media.IDMal = id
			}
			fetched = append(fetched, media.toAnime())
		}
	}

	return fetched, nil
}

func (c *Client) GetAnimesByMalIDs(ctx context.Context, malIDs []int) (*AnimeSearchResponse, error) {
	if len(malIDs) == 0 {
		return &AnimeSearchResponse{Data: []Anime{}}, nil
	}

	seen := make(map[int]bool)
	var uniqueIDs []int
	for _, id := range malIDs {
		if id > 0 && !seen[id] {
			seen[id] = true
			uniqueIDs = append(uniqueIDs, id)
		}
	}

	var allAnimes []Anime
	chunkSize := 50

	for i := 0; i < len(uniqueIDs); i += chunkSize {
		end := i + chunkSize
		if end > len(uniqueIDs) {
			end = len(uniqueIDs)
		}
		chunk := uniqueIDs[i:end]

		var resultado struct {
			Page struct{ Media []aniListMedia } `json:"Page"`
		}

		foundMap := make(map[int]bool)

		if err := c.gqlRequest(ctx, byIdsQuery, map[string]interface{}{"idMal_in": chunk}, &resultado); err == nil {
			for _, m := range resultado.Page.Media {
				if m.IDMal > 0 {
					foundMap[m.IDMal] = true
					allAnimes = append(allAnimes, m.toAnime())
				}
			}
		} else {
			log.Printf("[WARN ANILIST] Falha na consulta idMal_in para o chunk %v: %v", chunk, err)
		}

		var missing []int
		for _, id := range chunk {
			if !foundMap[id] {
				missing = append(missing, id)
			}
		}

		if len(missing) > 0 {
			log.Printf("[INFO ANILIST] %d animes não retornados via idMal_in. Executando fallback por Aliases: %v", len(missing), missing)
			fallbackAnimes, err := c.fetchByAliases(ctx, missing)
			if err != nil {
				log.Printf("[ERRO ANILIST] Falha no fallback por Aliases para os IDs %v: %v", missing, err)
			} else {
				allAnimes = append(allAnimes, fallbackAnimes...)
			}
		}
	}

	return &AnimeSearchResponse{Data: allAnimes}, nil
}

```

## internal/anilist/interface.go

```go
package anilist

import "context"



type Service interface {
	SearchAnime(ctx context.Context, query string, page int, perPage int, f SearchFilters) (*AnimeSearchResponse, error)
	GetAnimeById(ctx context.Context, id string) (*AnimeByIdResponse, error)
	GetAnimeStatistics(ctx context.Context, id string) (*AnimeStatisticsResponse, error)
	GetTopAnime(ctx context.Context, page int, perPage int, f SearchFilters) (*AnimeSearchResponse, error)
	GetAnimesByMalIDs(ctx context.Context, malIDs []int) (*AnimeSearchResponse, error)
}
```

## internal/anilist/mock.go

```go
[File content not included]
```

## internal/anilist/models.go

```go
package anilist

type AnimeSearchResponse struct {
	Data []Anime `json:"data"`
}

type AnimeByIdResponse struct {
	Data Anime `json:"data"`
}

type NextAiringEpisode struct {
	AiringAt        int `json:"airingAt"`
	TimeUntilAiring int `json:"timeUntilAiring"`
	Episode         int `json:"episode"`  
}

type Character struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Image string `json:"image"`
	Role  string `json:"role"`
}

type Anime struct {
	MalID       int         `json:"mal_id"`
	Title       string      `json:"title"`
	Status      string      `json:"status"`
	Synopsis    string      `json:"synopsis"`
	Episodes    int         `json:"episodes"`
	Duration    int         `json:"duration"` 
	Score       float64     `json:"score"`
	Ranking     int         `json:"ranking,omitempty"` 
	BannerImage string      `json:"bannerImage,omitempty"`
	Characters  []Character `json:"characters,omitempty"`
	StartDate   *FuzzyDate  `json:"startDate,omitempty"`

	NextAiringEpisode *NextAiringEpisode `json:"nextAiringEpisode,omitempty"`

	Images struct {
		JPG struct {
			ImageURL string `json:"image_url"`
		} `json:"jpg"`
	} `json:"images"`

	Genres []struct {
		Name string `json:"name"`
	} `json:"genres"`

	Studios []struct {
		Name string `json:"name"`
	} `json:"studios"`

	Relations []struct {
		Relation string `json:"relation"` 
		Entry    []struct {
			MalID int    `json:"mal_id"`
			Type  string `json:"type"`
			Name  string `json:"name"`
			Image string `json:"image"` 
		} `json:"entry"`
	} `json:"relations"`

	Theme struct {
		Openings []string `json:"openings"`
		Endings  []string `json:"endings"`
	} `json:"theme"`

	Streaming []struct {
		Name string `json:"name"`
		URL  string `json:"url"`
	} `json:"streaming"`

	StreamingEpisodes []StreamingEpisode `json:"streamingEpisodes,omitempty"`
}

type AnimeStatisticsResponse struct {
	Data AnimeStatistics `json:"data"`
}

type AnimeStatistics struct {
	Scores   []ScoreDistribution  `json:"scores"` 
	Statuses []StatusDistribution `json:"statuses"`
}

type StatusDistribution struct {
	Status string `json:"status"`
	Amount int    `json:"amount"`
}

type ScoreDistribution struct {
	Score      int     `json:"score"`
	Votes      int     `json:"votes"`
	Percentage float64 `json:"percentage"`
}

type StreamingEpisode struct {
	Title     string `json:"title"`
	Thumbnail string `json:"thumbnail"`
	URL       string `json:"url"`
	Site      string `json:"site"`
}
type FuzzyDate struct {
	Year  int `json:"year"`
	Month int `json:"month"`
	Day   int `json:"day"`
}
```

## internal/handlers/ranking.go

```go
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/models"
)

var (
	rankingCache struct {
		sync.RWMutex
		data      *anilist.AnimeSearchResponse
		timestamp time.Time
	}
)

func InvalidateRankingCache() {
	rankingCache.Lock()
	defer rankingCache.Unlock()
	rankingCache.data = nil
}

type RankingHandler struct {
	AniListClient anilist.Service
}

func (h *RankingHandler) HandleGetTopAnime(w http.ResponseWriter, r *http.Request) {
	pageStr := r.URL.Query().Get("page")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	perPageStr := r.URL.Query().Get("perPage")
	perPage, err := strconv.Atoi(perPageStr)
	if err != nil || perPage < 1 || perPage > 50 {
		perPage = 20
	}

	season := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("season")))
	status := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("status")))
	sortParam := r.URL.Query().Get("sort")

	seasonYear := 0
	if season != "" {
		if y, err := strconv.Atoi(r.URL.Query().Get("year")); err == nil && y > 0 {
			seasonYear = y
		}
	}

	filters := anilist.SearchFilters{
		Genres:     r.URL.Query()["genre"],
		Tags:       r.URL.Query()["tag"],
		Season:     season,
		SeasonYear: seasonYear,
		Status:     status,
		Sort:       sortParam,
	}

	
	isDefaultRanking := page == 1 && season == "" && status == "" && sortParam == "POPULARITY_DESC" && len(filters.Genres) == 0 && len(filters.Tags) == 0

	if isDefaultRanking {
		rankingCache.RLock()
		if rankingCache.data != nil && time.Since(rankingCache.timestamp) < 5*time.Minute {
			cachedData := rankingCache.data
			rankingCache.RUnlock()

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(cachedData)
			return
		}
		rankingCache.RUnlock()
	}

	resultados, err := h.AniListClient.GetTopAnime(r.Context(), page, perPage, filters)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar top animes: %v", err)
		http.Error(w, "Ranking indisponível no momento. Tente novamente mais tarde.", http.StatusServiceUnavailable)
		return
	}

	var curados []models.CuratedAnime
	data, _, errCurado := database.Client.From("curated_animes").Select("*", "exact", false).Execute()

	if errCurado == nil {
		_ = json.Unmarshal(data, &curados)
		curadosMap := make(map[int]models.CuratedAnime)
		for _, c := range curados {
			curadosMap[c.MalID] = c
		}

		for i, animeAniList := range resultados.Data {
			if curado, ok := curadosMap[animeAniList.MalID]; ok {
				resultados.Data[i].Title = curado.CustomTitle
				if curado.CustomSynopsis != "" {
					resultados.Data[i].Synopsis = curado.CustomSynopsis
				}
				if curado.CustomStatus != "" {
					resultados.Data[i].Status = curado.CustomStatus
				}
				if len(curado.CustomTags) > 0 {
					var novasTags []struct{ Name string `json:"name"` }
					for _, tag := range curado.CustomTags {
						novasTags = append(novasTags, struct{ Name string `json:"name"` }{Name: tag})
					}
					resultados.Data[i].Genres = novasTags
				}
			}
		}
	}

	if status != "" {
		expectedStatusMapped := ""
		switch status {
		case "FINISHED":
			expectedStatusMapped = "Finished Airing"
		case "RELEASING":
			expectedStatusMapped = "Currently Airing"
		case "NOT_YET_RELEASED":
			expectedStatusMapped = "Not yet aired"
		}

		var filtered []anilist.Anime
		for _, a := range resultados.Data {
			if strings.EqualFold(a.Status, expectedStatusMapped) || strings.EqualFold(a.Status, status) {
				filtered = append(filtered, a)
			}
		}
		resultados.Data = filtered
	}

	
	if isDefaultRanking && errCurado == nil {
		rankingCache.Lock()
		rankingCache.data = resultados
		rankingCache.timestamp = time.Now()
		rankingCache.Unlock()
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultados); err != nil {
		log.Printf("[ERRO] HandleGetTopAnime: falha ao serializar resposta: %v", err)
	}
}
```

## internal/database/db.go

```go
package database

import (
	"fmt"
	"os"

	"github.com/supabase-community/supabase-go"
)

var Client *supabase.Client

func Connect() error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_ANON_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		return fmt.Errorf("SUPABASE_URL ou SUPABASE_ANON_KEY ausentes")
	}

	client, err := supabase.NewClient(supabaseURL, supabaseKey, nil)
	if err != nil {
		return fmt.Errorf("erro ao inicializar cliente Supabase: %w", err)
	}

	Client = client
	return nil
}

func ClientWithToken(token string) (*supabase.Client, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_ANON_KEY")

	options := &supabase.ClientOptions{
		Headers: map[string]string{
			"Authorization": "Bearer " + token,
		},
	}

	return supabase.NewClient(supabaseURL, supabaseKey, options)
}
```

