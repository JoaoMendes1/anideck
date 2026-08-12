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
│   │   │   ├── Layout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── RankingCard.tsx
│   │   │   ├── RankingSkeleton.tsx
│   │   │   ├── RotaProtegida.tsx
│   │   │   ├── SearchResultCard.tsx
│   │   │   └── StatCard.tsx
│   │   ├── contexts
│   │   │   └── ToastContext.tsx
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
└── project-structure-v1.md
```

# File Contents

## client/README.md

````markdown
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https:
- [@vitejs/plugin-react-swc](https:

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https:

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['***.{ts,tsx}'],
    extends: [
      
      
      reactX.configs['recommended-typescript'],
      
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      
    },
  },
])

```

````

## client/eslint.config.js

```javascript
[File content not included]
```

## client/index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>client</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

## client/package-lock.json

```json
[File content not included]
```

## client/package.json

```json
{
  "name": "client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.110.8",
    "@tailwindcss/vite": "^4.3.3",
    "lucide-react": "^1.26.0",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "react-router": "^8.3.0",
    "react-router-dom": "^7.18.2",
    "tailwindcss": "^4.3.3"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/node": "^24.13.2",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.3",
    "eslint": "^10.6.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.3",
    "globals": "^17.7.0",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.62.0",
    "vite": "^8.1.1"
  },
  "overrides": {
    "react-router": "^8.3.0"
  }
}

```

## client/public/favicon.svg

```svg
[File content not included]
```

## client/public/icons.svg

```svg
[File content not included]
```

## client/src/App.tsx

```tsx
import { Routes, Route } from 'react-router-dom'
import Auth from './pages/Auth'
import Busca from './pages/Busca'
import Detalhes from './pages/Detalhes'
import MeuDeck from './pages/MeuDeck.tsx'
import Calendario from './pages/Calendario'
import RotaProtegida from './components/RotaProtegida'
import Rankings from './pages/Rankings'
import PainelAdmin from './pages/PainelAdmin'
import Layout from './components/Layout'
import { ToastProvider } from './contexts/ToastContext'
import Landing from './pages/Landing'

function App() {
  return (
    <ToastProvider>
    <Routes>
      <Route element={<Layout />}>
      <Route path="/" element={<Landing />} />
       <Route path="/descobrir" element={<Busca />} />
      <Route path="/deck" element={<RotaProtegida><MeuDeck /></RotaProtegida>} />
      <Route path="/calendario" element={<RotaProtegida><Calendario /></RotaProtegida>} />
      <Route path="/anime/:id" element={<Detalhes />} />
      <Route path="/rankings" element={<Rankings />} />
      </Route>

        {}
      <Route path="/login" element={<Auth />} />
      <Route path="/admin" element={<RotaProtegida><PainelAdmin /></RotaProtegida>} />
    </Routes>
    </ToastProvider>
  )
}

export default App
```

## client/src/assets/hero.png

```png
[File content not included]
```

## client/src/assets/react.svg

```svg
[File content not included]
```

## client/src/assets/vite.svg

```svg
[File content not included]
```

## client/src/components/AnimeCard.tsx

```tsx



import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getCategoryTheme } from '../lib/filters'

interface AnimeCardProps {
    malId: number
    title: string
    imageUrl?: string
    genre?: string
    score?: number | null
    ranking?: number
    isFavorite?: boolean
    gradientClass: string
    statusBadge: ReactNode      
    extraBadges?: ReactNode     
    topRightAction?: ReactNode  
}

export default function AnimeCard({
    malId, title, imageUrl, genre, score, ranking, isFavorite,
    gradientClass, statusBadge, extraBadges, topRightAction,
}: AnimeCardProps) {
    const temNota = score !== null && score !== undefined

    return (
        <div
            className={`relative aspect-[3/4.2] rounded-[14px] overflow-hidden p-3 flex flex-col justify-end border transition-transform active:scale-[0.98] hover:-translate-y-1 group ${
                isFavorite ? 'foil-card border-gold/50 shadow-[0_0_15px_rgba(255,197,66,0.15)]' : `border-line bg-panel ${gradientClass}`
            }`}
        >
            <Link to={`/anime/${malId}`} className="absolute inset-0 z-10" aria-label={title} />

            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={title}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-90 group-hover:opacity-100 transition-opacity"
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/70 to-transparent z-0 opacity-90" />

            {}
            <div className="absolute top-3 left-3 right-12 z-30 flex flex-col gap-1.5 items-start pointer-events-none">
                {statusBadge}
                {extraBadges}
            </div>

            {topRightAction && (
                <div className="absolute top-3 right-3 z-30">
                    {topRightAction}
                </div>
            )}

            <div className="relative z-20 mt-auto flex flex-col pointer-events-none select-none w-full justify-end">
                <h3 className="font-anton text-[13px] md:text-[14px] uppercase leading-tight mb-2 text-white drop-shadow-md line-clamp-2 break-words" title={title}>
                    {isFavorite && <span className="text-gold mr-1 inline-block -translate-y-[1px]" title="Favorito">👑</span>}
                    {title}
                </h3>

                <div className="flex justify-between items-end gap-2">
                    <div className="flex-1 min-w-0">
                        {genre && (
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border backdrop-blur-sm truncate max-w-full ${getCategoryTheme(genre)}`}>
                                {genre}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {ranking && (
                            <div className="font-anton text-[11px] sm:text-[12px] px-1.5 py-0.5 rounded-md backdrop-blur-sm border bg-panel-2/90 text-holo-3 border-holo-3/40 shadow-[0_0_8px_rgba(63,224,240,0.15)] flex items-center gap-1" title={`#${ranking} no mundo`}>
                                🏆 #{ranking}
                            </div>
                        )}
                        <div className={`font-anton text-[11px] sm:text-[12px] px-1.5 py-0.5 rounded-md backdrop-blur-sm border ${temNota ? 'bg-gold/20 text-gold border-gold/40 shadow-[0_0_8px_rgba(255,197,66,0.3)]' : 'bg-panel-2/80 text-muted-2 border-line'}`}>
                            {temNota ? `★ ${score}` : 'S/N'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
```

## client/src/components/BotaoCopiar.tsx

```tsx
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

interface Props {
    texto: string
    className?: string
}

export default function BotaoCopiar({ texto, className = '' }: Props) {
    const { showToast } = useToast()
    const [copiado, setCopiado] = useState(false)

    const handleCopiar = (e: React.MouseEvent) => {
        e.preventDefault() 
        e.stopPropagation() 
        
        navigator.clipboard.writeText(texto)
        setCopiado(true)
        showToast('Nome copiado para a área de transferência!')
        
        setTimeout(() => setCopiado(false), 2000)
    }

    return (
        <button
            onClick={handleCopiar}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                copiado 
                ? 'bg-green/20 border-green text-green' 
                : 'bg-panel-2/80 border-line text-muted hover:text-text hover:border-muted backdrop-blur-sm'
            } ${className}`}
            title="Copiar nome do anime"
        >
            {copiado ? <Check size={14} /> : <Copy size={14} />}
        </button>
    )
}
```

## client/src/components/BottomNav.tsx

```tsx
import { Link, useLocation } from 'react-router-dom'
import { Search, Trophy, LayoutDashboard, User, Settings, LogOut, CalendarDays } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

export default function BottomNav() {
    const location = useLocation()
    const [session, setSession] = useState<Session | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)

    const verificarAdmin = async (currentSession: Session | null) => {
        if (!currentSession) {
            setIsAdmin(false)
            return
        }
        try {
            const res = await fetch('/api/admin/verify', {
                headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
            })
            setIsAdmin(res.ok)
        } catch {
            setIsAdmin(false)
        }
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session)
            verificarAdmin(data.session)
        })
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            verificarAdmin(session)
        })
        return () => subscription.unsubscribe()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
    }

    return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-md border-t border-line pb-safe">
      <div className="flex items-center justify-around h-16 px-1">
        <Link to="/descobrir" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === '/descobrir' ? 'text-holo-3' : 'text-muted'}`}>
          <Search size={18} />
          <span className="text-[9px] font-bold">Busca</span>
        </Link>

        {session && (
          <Link to="/calendario" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === '/calendario' ? 'text-holo-3' : 'text-muted'}`}>
            <CalendarDays size={18} />
            <span className="text-[9px] font-bold">Agenda</span>
          </Link>
        )}

        <Link to="/rankings" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === '/rankings' ? 'text-holo-3' : 'text-muted'}`}>
          <Trophy size={18} />
          <span className="text-[9px] font-bold">Rankings</span>
        </Link>

        {session ? (
          <>
            <Link to="/deck" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === '/deck' ? 'text-holo-3' : 'text-muted'}`}>
              <LayoutDashboard size={18} />
              <span className="text-[9px] font-bold">Deck</span>
            </Link>

            {isAdmin && (
                <Link to="/admin" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === '/admin' ? 'text-holo-3' : 'text-muted'}`}>
                  <Settings size={18} />
                  <span className="text-[9px] font-bold">Admin</span>
                </Link>
            )}

            <button onClick={handleLogout} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted cursor-pointer hover:text-coral transition-colors focus:outline-none select-none">
              <LogOut size={18} />
              <span className="text-[9px] font-bold">Sair</span>
            </button>
          </>
        ) : (
          <Link to="/login" className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted focus:outline-none select-none">
            <div className="w-5 h-5 rounded-full border border-line flex items-center justify-center bg-panel"><User size={12} /></div>
            <span className="text-[9px] font-bold">Entrar</span>
          </Link>
        )}
      </div>
    </div>
  )
}
```

## client/src/components/Brand.tsx

```tsx
export function LogoMark({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <div className={`${className} rounded-[10px] overflow-hidden flex-shrink-0`}>
      <svg width="100%" height="100%" viewBox="0 0 84 100" xmlns="http:
        <defs>
          <linearGradient id="hG_mark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4FD8"/><stop offset="35%" stopColor="#7B5CFF"/><stop offset="65%" stopColor="#3FE0F0"/><stop offset="100%" stopColor="#8be9ff"/>
          </linearGradient>
          <pattern id="hx_mark" width="6" height="10.3923" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
            <path d="M3 0 L6 1.732 L6 5.196 L3 6.928 L0 5.196 L0 1.732 Z" fill="none" stroke="#7B5CFF" strokeWidth="0.3" opacity="0.4"/>
            <circle cx="3" cy="3.464" r="0.5" fill="#3FE0F0" opacity="0.3"/>
          </pattern>
          <clipPath id="cI_mark"><rect x="6" y="8" width="50" height="72" rx="6"/></clipPath>
        </defs>
        <g transform="translate(11,4)">
          <g opacity="0.55">
            <rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#3FE0F0" strokeWidth="0.8" strokeOpacity="0.5" transform="rotate(-12 28 50)"/>
            <rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#FF4FD8" strokeWidth="0.8" strokeOpacity="0.5" transform="rotate(12 28 50)"/>
          </g>
          <rect x="6" y="8" width="50" height="72" rx="6" fill="url(#hG_mark)"/>
          <g clipPath="url(#cI_mark)">
            <rect x="8" y="10" width="46" height="68" rx="4" fill="#0A0714" opacity="0.97"/>
            <rect x="8" y="10" width="46" height="68" fill="url(#hx_mark)"/>
            <rect x="-20" y="0" width="30" height="90" fill="url(#hG_mark)" opacity="0" className="sheen-anim-subtle" style={{mixBlendMode: 'screen'}}/>
            <g stroke="url(#hG_mark)" strokeWidth="1.2" fill="none" opacity="0.9">
              <path d="M12 24 v-6 a2 2 0 0 1 2-2 h6"/><path d="M50 64 v6 a2 2 0 0 1 -2 2 h-6"/>
            </g>
            <g transform="translate(31,44)">
              <g className="spin-anim-slow"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#3FE0F0" strokeWidth="0.6" transform="rotate(45)" opacity="0.6"/></g>
              <g className="spin-anim-slow-rev"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#FF4FD8" strokeWidth="0.6" transform="rotate(-45)" opacity="0.6"/></g>
              <circle cx="0" cy="0" r="14" fill="none" stroke="url(#hG_mark)" strokeWidth="1.2" strokeDasharray="1 3" opacity="0.8" className="spin-anim-slow"/>
              <circle cx="0" cy="0" r="12" fill="#05030A"/>
              <circle cx="0" cy="0" r="6" fill="#3FE0F0" className="breathe-anim"/>
              <polygon points="0,-11 4,-4 0,-1 -4,-4" fill="#8be9ff"/><polygon points="4,-4 9,0 0,-1" fill="#3FE0F0"/><polygon points="9,0 4,5 0,-1" fill="#2fb8c9"/><polygon points="4,5 0,11 0,3" fill="#5a3fd6"/><polygon points="0,11 -4,5 0,3" fill="#7B5CFF"/><polygon points="-4,5 -9,0 0,-1" fill="#FF4FD8"/><polygon points="-9,0 -4,-4 0,-1" fill="#ff8de8"/>
              <polygon points="0,-4 3,-1 0,3 -3,-1" fill="#ffffff" opacity="0.9"/>
            </g>
          </g>
          <rect x="6" y="8" width="50" height="72" rx="6" fill="none" stroke="url(#hG_mark)" strokeWidth="1" opacity="0.9"/>
        </g>
      </svg>
    </div>
  )
}

export function FullLogo({ className = "w-full max-w-[340px]" }: { className?: string }) {
  return (
    <div className={`${className} mx-auto`}>
      <svg width="100%" viewBox="0 0 450 160" xmlns="http:
        <defs>
          <linearGradient id="hG_full" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4FD8"/><stop offset="35%" stopColor="#7B5CFF"/><stop offset="65%" stopColor="#3FE0F0"/><stop offset="100%" stopColor="#8be9ff"/>
          </linearGradient>
          <filter id="dS_full" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.7"/>
          </filter>
        </defs>

        {}
        <g transform="translate(20,24)">
          <g opacity="0.55">
            <rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#3FE0F0" strokeWidth="0.8" strokeOpacity="0.5" transform="rotate(-12 28 50)"/>
            <rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#FF4FD8" strokeWidth="0.8" strokeOpacity="0.5" transform="rotate(12 28 50)"/>
          </g>
          <rect x="6" y="8" width="50" height="72" rx="6" fill="url(#hG_full)"/>
          <rect x="8" y="10" width="46" height="68" rx="4" fill="#0A0714" opacity="0.97"/>
          <g stroke="url(#hG_full)" strokeWidth="1.2" fill="none" opacity="0.9">
             <path d="M12 24 v-6 a2 2 0 0 1 2-2 h6"/><path d="M50 64 v6 a2 2 0 0 1 -2 2 h-6"/>
          </g>
          <g transform="translate(31,44)">
             <g className="spin-anim-slow"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#3FE0F0" strokeWidth="0.6" transform="rotate(45)" opacity="0.6"/></g>
             <circle cx="0" cy="0" r="14" fill="none" stroke="url(#hG_full)" strokeWidth="1.2" strokeDasharray="1 3" opacity="0.8" className="spin-anim-slow"/>
             <circle cx="0" cy="0" r="12" fill="#05030A"/>
             <circle cx="0" cy="0" r="6" fill="#3FE0F0" className="breathe-anim"/>
             <polygon points="0,-11 4,-4 0,-1 -4,-4" fill="#8be9ff"/><polygon points="4,-4 9,0 0,-1" fill="#3FE0F0"/><polygon points="9,0 4,5 0,-1" fill="#2fb8c9"/><polygon points="4,5 0,11 0,3" fill="#5a3fd6"/><polygon points="0,11 -4,5 0,3" fill="#7B5CFF"/><polygon points="-4,5 -9,0 0,-1" fill="#FF4FD8"/><polygon points="-9,0 -4,-4 0,-1" fill="#ff8de8"/>
             <polygon points="0,-4 3,-1 0,3 -3,-1" fill="#ffffff" opacity="0.9"/>
          </g>
          <rect x="6" y="8" width="50" height="72" rx="6" fill="none" stroke="url(#hG_full)" strokeWidth="1" opacity="0.9"/>
        </g>

        {}
        <g transform="translate(110,70)">
          <text x="0" y="0" fontFamily="Anton" fontSize="44" fill="#F1EEFA" filter="url(#dS_full)">Ani<tspan fill="url(#hG_full)">Deck</tspan></text>
          <text x="2" y="24" fontFamily="JetBrains Mono" fontWeight="700" fontSize="11.5" fill="#8C7DBB" letterSpacing="1.5">SEU DECK DE ANIMES, DO SEU JEITO</text>
          <path d="M 2 32 L 15 32 L 20 36 L 270 36" fill="none" stroke="url(#hG_full)" strokeWidth="1.5" opacity="0.5"/>
          <circle cx="2" cy="32" r="2.5" fill="#3FE0F0" className="breathe-anim" />
          <circle cx="270" cy="36" r="2.5" fill="#FF4FD8" className="breathe-anim" />
        </g>
      </svg>
    </div>
  )
}
```

## client/src/components/DeckCard.tsx

```tsx


import AnimeCard from './AnimeCard'
import { getStatusTheme, getAiringBadge, type AiringInfo } from '../lib/deckHelpers'

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

interface DeckCardProps {
    entrada: Entrada
    animeLocal?: HydratedAnime
    gradientClass: string
    onEdit: (entrada: Entrada) => void
}

export default function DeckCard({ entrada, animeLocal, gradientClass, onEdit }: DeckCardProps) {
    const temaStatus = getStatusTheme(entrada.status)
    const { acabouDeLancar, lancaHoje, lancaAmanha } = getAiringBadge(animeLocal?.nextAiringEpisode)
    const mostraSelosDeAr = entrada.status === 'Assistindo' || entrada.status === 'Em Dia'

    return (
        <AnimeCard
            malId={entrada.mal_id}
            title={animeLocal?.title || `ID: ${entrada.mal_id}`}
            imageUrl={animeLocal?.image_url}
            genre={animeLocal?.genre}
            score={entrada.nota}
            ranking={animeLocal?.ranking}
            isFavorite={entrada.is_favorite}
            gradientClass={gradientClass}
            statusBadge={
                <span className={`select-none text-[9px] md:text-[9.5px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wider border backdrop-blur-md truncate max-w-full ${temaStatus.bg} ${temaStatus.text} ${temaStatus.border}`}>
                    {entrada.status}
                </span>
            }
            extraBadges={
                mostraSelosDeAr && (
                    <>
                        {acabouDeLancar && <span className="select-none text-[8.5px] font-black px-2 py-1 rounded-md bg-coral text-white shadow-[0_0_10px_rgba(255,92,108,0.5)] uppercase tracking-widest">Novo EP</span>}
                        {lancaHoje && !acabouDeLancar && <span className="select-none text-[8.5px] font-black px-2 py-1 rounded-md bg-holo-3 text-void shadow-[0_0_10px_rgba(63,224,240,0.5)] uppercase tracking-widest">Hoje</span>}
                        {lancaAmanha && !acabouDeLancar && <span className="select-none text-[8.5px] font-black px-2 py-1 rounded-md bg-gold text-void shadow-[0_0_10px_rgba(255,197,66,0.5)] uppercase tracking-widest">Amanhã</span>}
                    </>
                )
            }
            topRightAction={
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(entrada) }}
                    className="w-8 h-8 rounded-full bg-void/80 border border-line text-muted hover:text-holo-3 hover:border-holo-3 flex items-center justify-center backdrop-blur-md cursor-pointer transition-all shadow-lg opacity-70 md:opacity-0 group-hover:opacity-100 active:scale-90"
                    title="Editar entrada"
                    aria-label="Editar entrada"
                >
                    ✎
                </button>
            }
        />
    )
}
```

## client/src/components/DeckSkeleton.tsx

```tsx

export default function DeckSkeleton({ count = 10 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="aspect-[3/4.2] rounded-[14px] shimmer" />
            ))}
        </div>
    )
}
```

## client/src/components/EditarEntradaModal.tsx

```tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

interface Entrada {
    id: string
    mal_id: number
    tipo: string
    status: string
    nota?: number | null
    anotacao?: string
    is_favorite?: boolean
}

interface Props {
    entrada: Entrada
    onFechar: () => void
    onSalvar: (atualizada: Entrada) => void
    onExcluir: (id: string) => void
}


const STATUS_OPCOES = ['Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado']

export default function EditarEntradaModal({ entrada, onFechar, onSalvar, onExcluir }: Props) {
    const { showToast } = useToast()
    const [status, setStatus] = useState(entrada.status)
    const [nota, setNota] = useState(entrada.nota !== null && entrada.nota !== undefined ? entrada.nota.toString() : '')
    const [anotacao, setAnotacao] = useState(entrada.anotacao || '')
    const [isFavorite, setIsFavorite] = useState(entrada.is_favorite || false) 
    
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

    const handleSalvar = async () => {
        setSalvando(true)
        setErro(null)

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const notaFormatada = nota.trim() === '' ? null : Number(nota.replace(',', '.'))

        try {
            const response = await fetch(`/api/entries/${entrada.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
               body: JSON.stringify({
                    mal_id: entrada.mal_id, 
                    tipo: entrada.tipo || 'anime', 
                    status,
                    nota: Number.isNaN(notaFormatada) ? null : notaFormatada,
                    anotacao,
                    is_favorite: isFavorite 
                }),
            })

            if (!response.ok) throw new Error('Falha ao salvar')

            const atualizada = await response.json()
            onSalvar(Array.isArray(atualizada) ? atualizada[0] : atualizada)
            showToast('Alterações salvas com sucesso!')
            onFechar()
        } catch (err) {
            setErro('Não foi possível salvar. Tente de novo.')
        } finally {
            setSalvando(false)
        }
    }

    const handleExcluir = async () => {
        setSalvando(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        try {
            const response = await fetch(`/api/entries/${entrada.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            })
            if (!response.ok) throw new Error('Falha ao excluir')
            onExcluir(entrada.id)
            showToast('Anime removido do seu Deck.')
            onFechar()
        } catch (err) {
            setErro('Não foi possível excluir. Tente de novo.')
            setSalvando(false)
        }
    }

    if (confirmandoExclusao) {
        return (
            <div className="fixed inset-0 bg-void/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                <div className="bg-panel border border-coral/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                    <h3 className="font-anton text-coral text-xl uppercase mb-2">Remover anime?</h3>
                    <p className="text-sm text-muted mb-6">Tem certeza que deseja remover este anime do seu Deck? Esta ação não pode ser desfeita.</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => setConfirmandoExclusao(false)} disabled={salvando} className="flex-1 px-4 py-2.5 rounded-xl border border-line text-sm font-bold cursor-pointer hover:border-muted transition-colors disabled:opacity-50">
                            Cancelar
                        </button>
                        <button onClick={handleExcluir} disabled={salvando} className="flex-1 px-4 py-2.5 rounded-xl bg-coral/10 border border-coral text-coral text-sm font-bold cursor-pointer hover:bg-coral hover:text-void transition-colors disabled:opacity-50 flex items-center justify-center">
                            {salvando ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                'Sim, remover'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-void/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-panel border border-line rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <div className="flex items-center justify-between mb-5 select-none">
                    <div className="flex items-center gap-3">
                        <h3 className="font-anton text-lg uppercase tracking-wide">Editar entrada</h3>
                        <button 
                            type="button"
                            onClick={() => setIsFavorite(!isFavorite)} 
                            className={`text-[22px] transition-all cursor-pointer ${isFavorite ? 'text-coral drop-shadow-[0_0_8px_rgba(255,92,108,0.6)] scale-110' : 'text-muted hover:text-text hover:scale-110'}`}
                            title={isFavorite ? "Remover dos Favoritos" : "Marcar como Favorito (Carta Rara)"}
                        >
                            {isFavorite ? '❤️' : '🤍'}
                        </button>
                    </div>
                    <button onClick={onFechar} className="text-muted hover:text-text cursor-pointer px-2">✕</button>
                </div>

        <div className="mb-6">
          <label className="block text-[11px] font-bold text-muted mb-2.5 uppercase tracking-wide select-none">Status</label>
          <div className="flex flex-wrap gap-2">
            {}
            {STATUS_OPCOES.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setStatus(opt)}
                className={`select-none px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border ${
                  status === opt
                    ? 'bg-holo-2/20 border-holo-2 text-holo-2 shadow-[0_0_10px_rgba(123,92,255,0.2)]'
                    : 'bg-panel-2 border-line text-muted hover:border-holo-2 hover:text-text'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

                <div className="flex justify-between items-center mb-2">
                    <label className="block text-[11px] font-bold text-muted uppercase tracking-wide select-none">Nota (0-10)</label>
                    {nota !== '' && (
                        <button type="button" onClick={() => setNota('')} title="Limpar nota" className="select-none text-[10px] font-bold text-coral hover:text-coral/80 uppercase cursor-pointer">
                            Limpar
                        </button>
                    )}
                </div>
                <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="Sem nota"
                    className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm mb-4 outline-none focus:border-holo-3 transition-colors"
                />

                <label className="block text-[11px] font-bold text-muted uppercase tracking-wide mb-2 select-none">Anotação</label>
                <textarea
                    value={anotacao}
                    onChange={(e) => setAnotacao(e.target.value)}
                    placeholder="O que achou deste anime?"
                    className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-sm mb-2 min-h-[100px] outline-none focus:border-holo-3 transition-colors resize-none"
                />

                {erro && <p className="text-coral text-xs mb-3 font-bold">{erro}</p>}

                <div className="flex justify-end gap-2 mt-4 select-none">
                    <button 
                        type="button"
                        onClick={() => setConfirmandoExclusao(true)} 
                        className="px-4 py-2.5 rounded-xl border border-coral/30 text-coral text-sm font-bold mr-auto cursor-pointer hover:bg-coral/10 transition-colors"
                    >
                        Excluir
                    </button>
                    <button 
                        type="button"
                        onClick={handleSalvar} 
                        disabled={salvando} 
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-holo-1 to-holo-2 text-void text-sm font-extrabold cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                    >
                        {salvando ? (
                            <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin"></div>
                        ) : (
                            'Salvar'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
```

## client/src/components/FilterChipGroup.tsx

```tsx




interface ChipOption {
    label: string
    value: string
    emoji?: string
}

interface FilterChipGroupProps {
    label: string
    options: ChipOption[]
    isActive: (value: string) => boolean
    onToggle: (value: string) => void
    activeClassName?: string
}

const DEFAULT_ACTIVE = 'bg-gradient-to-r from-holo-1 to-holo-2 text-void shadow-[0_0_12px_rgba(123,92,255,0.4)]'
const INACTIVE = 'bg-panel-2 border border-line text-muted hover:border-holo-2 hover:text-text'

export default function FilterChipGroup({
    label,
    options,
    isActive,
    onToggle,
    activeClassName = DEFAULT_ACTIVE,
}: FilterChipGroupProps) {
    return (
        <div>
            <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none uppercase">
                {label}
            </p>
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onToggle(opt.value)}
                        className={`select-none px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer border ${
                            isActive(opt.value) ? activeClassName : INACTIVE
                        }`}
                    >
                        {opt.emoji ? `${opt.emoji} ` : ''}{opt.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
```

## client/src/components/Layout.tsx

```tsx
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="bg-ambient"></div>
      
      <Navbar />
      
      {}
      <main className="relative z-10 flex-1 flex flex-col pt-24 pb-24 md:pb-0 w-full max-w-[100vw] overflow-x-hidden">
        <Outlet />
      </main>

      {}
      <BottomNav />
    </div>
  )
}
```

## client/src/components/Navbar.tsx

```tsx
import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { LogoMark } from './Brand'

export default function Navbar() {
      const [session, setSession] = useState<Session | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const location = useLocation()

    const verificarAdmin = async (currentSession: Session | null) => {
        if (!currentSession) {
            setIsAdmin(false)
            return
        }
        try {
            const res = await fetch('/api/admin/verify', {
                headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
            })
            setIsAdmin(res.ok)
        } catch {
            setIsAdmin(false)
        }
    }

    
    useEffect(() => {
        supabase.auth.getSession().then(({ data: {session }}) => {
            setSession(session)
            verificarAdmin(session)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            verificarAdmin(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleLogout= async () => {
        await supabase.auth.signOut()
    }

   return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'py-3 bg-void/85 backdrop-blur-md border-b border-line' : 'py-5 bg-transparent'
        }`}
      >
        <div className="max-w-[1140px] mx-auto px-5 flex items-center justify-between gap-4">
          
          {}
          <Link to="/" className="flex items-center gap-2.5 z-50 group">
            <LogoMark />
            <div className="font-anton text-lg tracking-wide group-hover:opacity-80 transition-opacity">
              Ani<span className="text-holo">Deck</span>
            </div>
          </Link>

               {}
          <div className="hidden md:flex items-center gap-7">
            {session && (
              <>
                <Link to="/deck" className={`text-sm font-bold focus:outline-none select-none transition-colors ${location.pathname === '/deck' ? 'text-text' : 'text-muted hover:text-text'}`}>Meu Deck</Link>
                <Link to="/calendario" className={`text-sm font-bold focus:outline-none select-none transition-colors ${location.pathname === '/calendario' ? 'text-text' : 'text-muted hover:text-text'}`}>Calendário</Link>

                {isAdmin && (
                    <Link to="/admin" className={`text-sm font-bold focus:outline-none select-none transition-colors ${location.pathname === '/admin' ? 'text-text' : 'text-muted hover:text-text'}`}>Admin</Link>
                )}
              </>
            )}
            <Link to="/rankings" className={`text-sm font-bold focus:outline-none select-none transition-colors ${location.pathname === '/rankings' ? 'text-text' : 'text-muted hover:text-text'}`}>Rankings</Link>
          </div>

          {}
          <div className="hidden md:flex items-center gap-3.5">
            <Link to="/descobrir" className="w-9 h-9 rounded-full border border-line bg-panel text-muted flex items-center justify-center transition-all hover:border-holo-3 hover:text-holo-3" title="Buscar">
              <Search size={16} />
            </Link>

            {session ? (
              <div className="flex items-center gap-2.5 px-1.5 py-1.5 pr-3 rounded-full bg-panel border border-line">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-holo-2 to-holo-3 flex items-center justify-center text-void font-bold text-xs">
                  {session.user.user_metadata?.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-bold truncate max-w-[100px]">
                  {session.user.user_metadata?.display_name || 'Usuário'}
                </span>
                <button onClick={handleLogout} className="ml-2 text-muted hover:text-coral transition-colors" title="Sair">
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="px-5 py-2.5 rounded-full font-bold text-sm text-void bg-gradient-to-r from-holo-1 to-holo-3 hover:opacity-90 transition-opacity">
                Entrar
              </Link>
            )}
          </div>

        </div>
      </nav>
    </>
  )
}
```

## client/src/components/RankingCard.tsx

```tsx





import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import BotaoCopiar from './BotaoCopiar'
import { getCategoryTheme } from '../lib/filters'

interface Anime {
    mal_id: number
    title: string
    status: string
    score: number
    episodes: number
    images: { jpg: { image_url: string } }
    genres?: { name: string }[]
}

interface RankingCardProps {
    anime: Anime
    rank: number
    isSaved: boolean
    isFavorite?: boolean
    isSaving: boolean
    onToggleSave: (e: React.MouseEvent, malId: number) => void
}


const RANK_STYLES: Record<number, string> = {
    1: 'bg-gradient-to-b from-gold to-[#e08a1a] text-void shadow-[0_0_10px_rgba(255,197,66,0.6)]',
    2: 'bg-gradient-to-b from-[#E8ECF5] to-[#B9C0D4] text-void',
    3: 'bg-gradient-to-b from-[#D89A63] to-[#96602F] text-void',
}

export default function RankingCard({ anime, rank, isSaved, isFavorite, isSaving, onToggleSave }: RankingCardProps) {
    const rankBadgeClass = RANK_STYLES[rank] ?? 'bg-void/90 border border-line text-muted-2'

    return (
        <Link
            to={`/anime/${anime.mal_id}`}
            className={`relative overflow-hidden flex items-center gap-3 p-3 rounded-xl transition-colors group ${
                isFavorite
                    ? 'foil-card border border-gold/50 shadow-[0_0_15px_rgba(255,197,66,0.15)]'
                    : 'bg-panel border border-line hover:border-holo-2'
            }`}
        >
            <div className="relative z-30 shrink-0">
                <img
                    src={anime.images?.jpg?.image_url}
                    alt={anime.title}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover bg-panel-2 border border-line"
                />
                <span
                    className={`absolute -top-1.5 -left-1.5 flex items-center justify-center w-5 h-5 rounded-full font-anton text-[10px] select-none ${rankBadgeClass}`}
                >
                    {rank}
                </span>
            </div>

            <div className="relative z-30 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-sm truncate">
                        {isFavorite && <span className="text-gold mr-1" title="Favorito">👑</span>}
                        {anime.title}
                    </span>
                    <BotaoCopiar
                        texto={anime.title}
                        className="opacity-70 md:opacity-0 group-hover:opacity-100 transition-opacity relative z-40 shrink-0"
                    />
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-muted-2">
                    {anime.genres?.[0] && (
                        <span className={`px-1.5 py-0.5 rounded border font-bold font-manrope shrink-0 ${getCategoryTheme(anime.genres[0].name)}`}>
                            {anime.genres[0].name}
                        </span>
                    )}
                    <span className="select-none truncate">{anime.status} • {anime.episodes || '?'} EP</span>
                </div>
            </div>

            <div className="relative z-30 flex flex-col items-center gap-1.5 shrink-0">
                <div className="font-anton text-sm text-gold select-none">★ {anime.score || 'N/A'}</div>
                <button
                    onClick={(e) => onToggleSave(e, anime.mal_id)}
                    disabled={isSaving}
                    aria-label={isSaved ? 'Remover do Deck' : 'Adicionar ao Deck'}
                    className={`flex w-7 h-7 rounded-full border-[1.5px] items-center justify-center font-bold text-base transition-colors select-none ${
                        isSaved
                            ? 'bg-green/20 border-green text-green cursor-pointer hover:bg-coral/20 hover:border-coral hover:text-coral'
                            : 'border-line bg-transparent text-muted group-hover:border-holo-3 group-hover:text-holo-3 cursor-pointer'
                    }`}
                >
                    {isSaving ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isSaved ? (
                        <Check size={14} strokeWidth={3} />
                    ) : (
                        '+'
                    )}
                </button>
            </div>
        </Link>
    )
}
```

## client/src/components/RankingSkeleton.tsx

```tsx

export default function RankingSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="flex flex-col gap-3" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-panel border border-line">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg shimmer shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-3.5 w-3/4 rounded-full shimmer" />
                        <div className="h-2.5 w-1/3 rounded-full shimmer" />
                    </div>
                    <div className="w-8 h-9 rounded-lg shimmer shrink-0" />
                </div>
            ))}
        </div>
    )
}
```

## client/src/components/RotaProtegida.tsx

```tsx
import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export default function RotaProtegida({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [carregando, setCarregando] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setCarregando(false)
        })
    }, [])

    if (carregando) {
        return <div className="p-10 text-center text-muted font-mono text-sm">Carregando...</div>
    }

    if (!session) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}
```

## client/src/components/SearchResultCard.tsx

```tsx


import { Check } from 'lucide-react'
import AnimeCard from './AnimeCard'

interface Anime {
    mal_id: number
    title: string
    status: string
    episodes?: number
    score?: number
    images?: { jpg: { image_url: string } }
    genres?: { name: string }[]
}

interface SearchResultCardProps {
    anime: Anime
    gradientClass: string
    isSaved: boolean
    isFavorite?: boolean
    isSaving: boolean
    statusLabel: string
    onToggleSave: (e: React.MouseEvent, malId: number) => void
}

export default function SearchResultCard({
    anime, gradientClass, isSaved, isFavorite, isSaving, statusLabel, onToggleSave,
}: SearchResultCardProps) {
    return (
        <AnimeCard
            malId={anime.mal_id}
            title={anime.title}
            imageUrl={anime.images?.jpg?.image_url}
            genre={anime.genres?.[0]?.name}
            score={anime.score}
            isFavorite={isFavorite}
            gradientClass={gradientClass}
            statusBadge={
                <span className="select-none text-[9px] md:text-[9.5px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wider backdrop-blur-md border bg-void/70 text-holo-3 border-holo-3/50 drop-shadow-[0_1px_3px_rgba(0,0,0,1)] truncate max-w-full">
                    {statusLabel}
                </span>
            }
            topRightAction={
                <button
                    onClick={(e) => onToggleSave(e, anime.mal_id)}
                    disabled={isSaving}
                    aria-label={isSaved ? 'Remover do Deck' : 'Adicionar ao Deck'}
                    className={`w-8 h-8 rounded-full border-[1.5px] flex items-center justify-center font-bold backdrop-blur-md transition-all select-none shadow-lg active:scale-90 ${
                        isSaved
                            ? 'bg-green/20 border-green text-green hover:bg-coral/20 hover:border-coral hover:text-coral cursor-pointer'
                            : 'bg-void/80 border-white/40 text-white hover:bg-gradient-to-r hover:from-holo-1 hover:to-holo-2 hover:border-transparent cursor-pointer opacity-80 md:opacity-0 group-hover:opacity-100'
                    }`}
                >
                    {isSaving ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isSaved ? (
                        <Check size={16} strokeWidth={3} />
                    ) : (
                        '+'
                    )}
                </button>
            }
        />
    )
}
```

## client/src/components/StatCard.tsx

```tsx

import type { ReactNode } from 'react'

interface StatCardProps {
    icon: ReactNode
    value: string | number
    label: string
    accentColor: 'holo-3' | 'green' | 'gold' | 'coral' | 'holo-1'
}




const ACCENT_STYLES: Record<StatCardProps['accentColor'], { border: string; iconBg: string; iconText: string }> = {
    'holo-3': { border: 'border-t-holo-3', iconBg: 'bg-holo-3/20', iconText: 'text-holo-3' },
    'green':  { border: 'border-t-green',  iconBg: 'bg-green/20',  iconText: 'text-green' },
    'gold':   { border: 'border-t-gold',   iconBg: 'bg-gold/20',   iconText: 'text-gold' },
    'coral':  { border: 'border-t-coral',  iconBg: 'bg-coral/20',  iconText: 'text-coral' },
    'holo-1': { border: 'border-t-holo-1', iconBg: 'bg-holo-1/20', iconText: 'text-holo-1' },
}

export default function StatCard({ icon, value, label, accentColor }: StatCardProps) {
    const style = ACCENT_STYLES[accentColor]
    return (
        <div className={`shrink-0 w-[132px] md:w-auto snap-start bg-panel border border-line rounded-[14px] p-4 md:p-[18px] border-t-[3px] ${style.border} relative overflow-hidden`}>
            <div className={`w-7 h-7 rounded-lg ${style.iconBg} ${style.iconText} flex items-center justify-center mb-2`}>
                {icon}
            </div>
            <b className="block font-anton text-2xl mb-0.5">{value}</b>
            <span className="text-[11px] text-muted-2 font-bold uppercase tracking-wider whitespace-nowrap">{label}</span>
        </div>
    )
}
```

## client/src/contexts/ToastContext.tsx

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react'

interface ToastContextType {
    showToast: (message: string, type?: 'success' | 'error') => void 
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode}) {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean}>({
        message: '',
        type: 'success',
        visible: false
    })

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, visible: true})
        setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false}))
        }, 3000) 
    }

      return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {}
      <div
        className={`fixed bottom-[80px] md:bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
          toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-2 px-5 py-3 rounded-full border shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md text-[13px] font-bold ${
          toast.type === 'success'
            ? 'bg-panel border-green text-text'
            : 'bg-coral/10 border-coral text-coral'
        }`}>
          {toast.type === 'success' && <span className="w-2 h-2 rounded-full bg-green flex-shrink-0" />}
          {toast.message}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
    const context = useContext(ToastContext)
    if(!context) throw new Error('useToast deve ser usado dentro de um ToastProvider')
    return context
}


```

## client/src/index.css

```css

@import url('https:


@import "tailwindcss"; 


@theme {
  
  --color-void: #0A0714;
  --color-panel: #130F22;
  --color-panel-2: #181330;
  --color-line: #2B2247;
  --color-text: #F1EEFA;
  --color-muted: #A79BC9;
  --color-muted-2: #6B5F94;
  --color-holo-1: #FF4FD8;
  --color-holo-2: #7B5CFF;
  --color-holo-3: #3FE0F0;
  --color-gold: #FFC542;
  --color-green: #a0ff78;
  --color-coral: #FF5C6C;

    
  --font-manrope: 'Manrope', sans-serif;
  --font-anton: 'Anton', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}


@layer base {
  body {
    background-color: var(--color-void);
    color: var(--color-text);
    font-family: var(--font-manrope);
    -webkit-font-smoothing: antialiased;
    margin: 0;
    min-height: 100vh;
  }
}


@utility text-holo {
  background-clip: text;
  color: transparent;
  background-image: linear-gradient(90deg, var(--color-holo-1), var(--color-holo-2) 45%, var(--color-holo-3));
}


@utility bg-ambient {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(480px 380px at 15% 15%, rgba(255,79,216,.12), transparent 60%),
    radial-gradient(520px 420px at 85% 85%, rgba(63,224,240,.10), transparent 60%);
}


@utility shimmer {
  background: linear-gradient(100deg, var(--color-panel) 30%, var(--color-panel-2) 50%, var(--color-panel) 70%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}


@utility card-g1 { background: linear-gradient(155deg, #3a1a4a, #120b22 75%); }
@utility card-g2 { background: linear-gradient(155deg, #1a3d4a, #120b22 75%); }
@utility card-g3 { background: linear-gradient(155deg, #4a1a2f, #120b22 75%); }
@utility card-g4 { background: linear-gradient(155deg, #1a2f4a, #120b22 75%); }
@utility card-g5 { background: linear-gradient(155deg, #2f4a1a, #120b22 75%); }


@utility scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}


.sheen-anim-subtle { animation: occasionalSheen 8s ease-in-out infinite; }
.spin-anim-slow { animation: slowSpin 40s linear infinite; transform-box: fill-box; transform-origin: center; }
.spin-anim-slow-rev { animation: slowSpinReverse 30s linear infinite; transform-box: fill-box; transform-origin: center; }
.breathe-anim { animation: breatheLight 7s ease-in-out infinite; }
.twinkle-anim { animation: twinkle 6s ease-in-out infinite; }
.twinkle-anim-delay { animation: twinkle 7s ease-in-out infinite 2s; }

@keyframes occasionalSheen {
  0%, 10% { transform: translateX(-100%) skewX(-15deg); opacity: 0; }
  15% { opacity: 0.22; }
  25%, 100% { transform: translateX(200%) skewX(-15deg); opacity: 0; }
}
@keyframes slowSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes slowSpinReverse { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
@keyframes breatheLight { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
@keyframes twinkle { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.85; } }


.hero-visual { position: relative; height: 400px; display: flex; align-items: center; justify-content: center; }
.stack-card { position: absolute; width: 210px; height: 300px; border-radius: 20px; overflow: hidden; box-shadow: 0 30px 60px -20px rgba(0,0,0,.6); }
.stack-card.c1 { background: linear-gradient(150deg, #2a1a4d, #0A0714 70%); transform: rotate(-10deg) translateX(-70px); z-index: 1; opacity: .7; }
.stack-card.c2 { background: linear-gradient(160deg, #1a3d4d, #0A0714 70%); transform: rotate(8deg) translateX(70px); z-index: 1; opacity: .7; }
.stack-card.c3 { background: linear-gradient(160deg, #3a1a4a 0%, #1a1030 55%, #0A0714 100%); z-index: 2; border: 1px solid rgba(255,255,255,.08); }
.stack-card.c3::before { content: ''; position: absolute; inset: 0; background: linear-gradient(120deg, transparent 30%, rgba(255,79,216,.25) 45%, rgba(63,224,240,.25) 55%, transparent 70%); mix-blend-mode: screen; }

@media(max-width: 900px) {
  .hero-visual { height: 280px; }
  .stack-card { width: 150px; height: 220px; }
  .stack-card.c1 { transform: rotate(-10deg) translateX(-46px); }
  .stack-card.c2 { transform: rotate(8deg) translateX(46px); }
}

.reveal { opacity: 0; transform: translateY(16px); transition: opacity .6s ease, transform .6s ease; }
.reveal.in { opacity: 1; transform: translateY(0); }
@media(prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } .stack-card { transition: none; } }


.foil-card {
  
  background: linear-gradient(155deg, #1a1525, #0A0714 75%);
  border-color: rgba(255, 197, 66, 0.3) !important;
}
.foil-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  
  background: linear-gradient(125deg, transparent 30%, rgba(255, 197, 66, 0.05) 45%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 197, 66, 0.05) 55%, transparent 70%);
  background-size: 200% 200%;
  animation: foilShine 10s linear infinite;
  pointer-events: none;
  z-index: 25;
  mix-blend-mode: screen;
}
@keyframes foilShine {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

## client/src/lib/deckHelpers.ts

```typescript

export interface AiringInfo {
    airingAt: number
    timeUntilAiring: number
    episode: number
}

export interface StatusTheme {
    bg: string
    text: string
    border: string
}


export function getStatusTheme(status: string): StatusTheme {
    switch (status) {
        case 'Assistindo':
            return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-holo-3 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-holo-3/50' }
        case 'Em Dia':
            return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-green drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-green/50' }
        case 'Completo':
            return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-gold drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-gold/50' }
        case 'Quero Assistir':
            return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-holo-1 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-holo-1/50' }
        case 'Dropado':
            return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-coral drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-coral/50' }
        default:
            return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-muted-2 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-muted-2/50' }
    }
}




export function getAiringBadge(nextAiringEpisode?: AiringInfo) {
    if (!nextAiringEpisode) {
        return { acabouDeLancar: false, lancaHoje: false, lancaAmanha: false }
    }

    const acabouDeLancar = nextAiringEpisode.timeUntilAiring > 518400

    const dataEpisodio = new Date(nextAiringEpisode.airingAt * 1000)
    dataEpisodio.setHours(0, 0, 0, 0)

    const dataHoje = new Date()
    dataHoje.setHours(0, 0, 0, 0)

    const diffDays = Math.round((dataEpisodio.getTime() - dataHoje.getTime()) / (1000 * 60 * 60 * 24))

    return {
        acabouDeLancar,
        lancaHoje: diffDays === 0,
        lancaAmanha: diffDays === 1,
    }
}
```

## client/src/lib/filters.ts

```typescript
export interface FilterItem {
    label: string
    value: string
    type: 'genre' | 'tag'
}

export const CONTENT_FILTERS: FilterItem[] = [
    
    { label: 'Ação',              value: 'Action',        type: 'genre' },
    { label: 'Aventura',          value: 'Adventure',     type: 'genre' },
    { label: 'Comédia',           value: 'Comedy',        type: 'genre' },
    { label: 'Drama',             value: 'Drama',         type: 'genre' },
    { label: 'Ecchi',             value: 'Ecchi',         type: 'genre' },
    { label: 'Fantasia',          value: 'Fantasy',       type: 'genre' },
    { label: 'Horror',            value: 'Horror',        type: 'genre' },
    { label: 'Mecha',             value: 'Mecha',         type: 'genre' },
    { label: 'Mistério',          value: 'Mystery',       type: 'genre' },
    { label: 'Musical',           value: 'Music',         type: 'genre' },
    { label: 'Psicológico',       value: 'Psychological', type: 'genre' },
    { label: 'Romance',           value: 'Romance',       type: 'genre' },
    { label: 'Ficção Científica', value: 'Sci-Fi',        type: 'genre' },
    { label: 'Slice of Life',     value: 'Slice of Life', type: 'genre' },
    { label: 'Esporte',           value: 'Sports',        type: 'genre' },
    { label: 'Sobrenatural',      value: 'Supernatural',  type: 'genre' },
    { label: 'Suspense',          value: 'Thriller',      type: 'genre' },

    
    { label: 'Isekai',          value: 'Isekai',        type: 'tag' },
    { label: 'Artes Marciais',  value: 'Martial Arts',  type: 'tag' },
    { label: 'Boys Love',       value: "Boys' Love",    type: 'tag' },
    { label: 'Demônios',        value: 'Demons',        type: 'tag' },
    { label: 'Escolar',         value: 'School',        type: 'tag' },
    { label: 'Harém (ela)',     value: 'Female Harem',  type: 'tag' }, 
    { label: 'Harém (ele)',     value: 'Male Harem',    type: 'tag' }, 
    { label: 'Histórico',       value: 'Historical',    type: 'tag' },
    { label: 'Jogo',            value: 'Video Games',   type: 'tag' },
    { label: 'Magia',           value: 'Magic',         type: 'tag' },
    { label: 'Militar',         value: 'Military',      type: 'tag' },
    { label: 'Samurai',         value: 'Samurai',       type: 'tag' },
    { label: 'Seinen',          value: 'Seinen',        type: 'tag' },
    { label: 'Shoujo',          value: 'Shoujo',        type: 'tag' },
    { label: 'Shounen',         value: 'Shounen',       type: 'tag' },
    { label: 'Super Poderes',   value: 'Super Power',   type: 'tag' },
    { label: 'Yuri',            value: 'Yuri',          type: 'tag' },
]


export interface StatusOption {
    label: string
    value: string
}

export const STATUS_OPTIONS: StatusOption[] = [
    { label: 'Em Exibição',  value: 'RELEASING'         },
    { label: 'Finalizado',   value: 'FINISHED'          },
    { label: 'Anunciado',    value: 'NOT_YET_RELEASED'  },
    { label: 'Em Hiato',     value: 'HIATUS'            },
]


export interface SeasonOption {
    label: string
    value: string
    emoji: string
}

export const SEASON_OPTIONS: SeasonOption[] = [
    { label: 'Inverno',   value: 'WINTER', emoji: '❄️' },
    { label: 'Primavera', value: 'SPRING', emoji: '🌸' },
    { label: 'Verão',     value: 'SUMMER', emoji: '☀️' },
    { label: 'Outono',    value: 'FALL',   emoji: '🍂' },
]


export function getCategoryTheme(category: string) {
    const cat = category.toLowerCase();
    
    
    if (cat === 'isekai') {
        return 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.2)]';
    }
    
    if (['ação', 'action', 'shounen', 'artes marciais', 'martial arts', 'militar', 'military'].includes(cat)) {
        return 'bg-coral/10 border-coral/30 text-coral';
    }
    
    if (['magia', 'magic', 'fantasia', 'fantasy', 'demônios', 'demons', 'sobrenatural', 'supernatural', 'terror', 'horror', 'suspense', 'thriller'].includes(cat)) {
        return 'bg-holo-2/10 border-holo-2/30 text-holo-2';
    }
    
    if (['ficção científica', 'sci-fi', 'mecha', 'mistério', 'mystery', 'jogo', 'video games'].includes(cat)) {
        return 'bg-holo-3/10 border-holo-3/30 text-holo-3';
    }
    
    if (['romance', 'shoujo', 'josei', 'harém', 'harém (ela)', 'harém (ele)', 'female harem', 'male harem', 'yuri', 'yaoi', "boys' love", 'boys love', 'ecchi', 'sem censura', 'nudity'].includes(cat)) {
        return 'bg-holo-1/10 border-holo-1/30 text-holo-1';
    }
    
    if (['comédia', 'comedy', 'slice of life', 'escolar', 'school'].includes(cat)) {
        return 'bg-gold/10 border-gold/30 text-gold';
    }
    
    if (['aventura', 'adventure', 'esporte', 'sports', 'histórico', 'historical', 'samurai', 'musical', 'music'].includes(cat)) {
        return 'bg-green/10 border-green/30 text-green';
    }
    
    
    return 'bg-panel-2 border-line text-muted';
}
```

## client/src/lib/supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js'




const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY



if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltam as variáveis de ambiente do Supabase no frontend.")
} 



export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## client/src/main.tsx

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {}
        <BrowserRouter>
          <App />
        </BrowserRouter>
  </StrictMode>,
)

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
import { Link, useNavigate } from 'react-router-dom'
import { Search, AlertCircle, SlidersHorizontal, X, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
    CONTENT_FILTERS, STATUS_OPTIONS, SEASON_OPTIONS,
    type FilterItem, getCategoryTheme
} from '../lib/filters'
import SearchResultCard from '../components/SearchResultCard'

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

            <div className={`fixed inset-0 z-[70] flex flex-col justify-end pointer-events-none md:relative md:inset-auto md:z-auto md:block transition-all duration-300 select-none ${showFilters ? 'opacity-100' : 'opacity-0 md:opacity-100 md:hidden'
                }`}>
                <div
                    className={`absolute inset-0 bg-void/80 backdrop-blur-sm md:hidden transition-opacity duration-300 ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setShowFilters(false)}
                />

                <div className={`relative bg-panel md:bg-panel border-t md:border border-line rounded-t-3xl md:rounded-2xl p-6 pb-safe md:pb-6 space-y-6 transition-transform duration-300 transform md:transform-none max-h-[85vh] overflow-y-auto ${showFilters ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none md:translate-y-0 md:pointer-events-auto'
                    } mb-0 md:mb-6`}>

                    <div className="flex justify-between items-center md:hidden mb-2">
                        <h3 className="font-anton text-lg uppercase text-text">Filtros Avançados</h3>
                        <button onClick={() => setShowFilters(false)} className="text-muted hover:text-text cursor-pointer p-1"><X size={20} /></button>
                    </div>

                    <div>
                        <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none">
                        <div className="flex flex-wrap gap-2">
                            {SORT_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setSelectedSort(opt.value); setPage(1); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${selectedSort === opt.value
                                        ? 'bg-gold/20 text-gold border border-gold/40 shadow-[0_0_12px_rgba(255,197,66,0.2)]'
                                        : 'bg-panel-2 border border-line text-muted hover:border-gold hover:text-text'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none">
                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setSelectedStatus(selectedStatus === opt.value ? '' : opt.value); setPage(1); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${selectedStatus === opt.value
                                        ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void shadow-[0_0_12px_rgba(123,92,255,0.4)]'
                                        : 'bg-panel-2 border border-line text-muted hover:border-holo-2 hover:text-text'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none">
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap gap-2">
                                {SEASON_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => {
                                            setSelectedSeason(selectedSeason === opt.value ? '' : opt.value);
                                            if (selectedSeason === opt.value) setSelectedYear('');
                                            setPage(1);
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${selectedSeason === opt.value
                                            ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void shadow-[0_0_12px_rgba(123,92,255,0.4)]'
                                            : 'bg-panel-2 border border-line text-muted hover:border-holo-2 hover:text-text'
                                            }`}
                                    >
                                        {opt.emoji} {opt.label}
                                    </button>
                                ))}
                            </div>

                            {}
                            <div className="flex flex-wrap gap-2 p-3 bg-panel-2 border border-line rounded-xl">
                                <span className="text-[11px] font-bold text-muted uppercase w-full mb-1">
                                    Selecione o Ano {selectedSeason ? '' : '(Escolha uma temporada primeiro)'}:
                                </span>
                                {YEAR_OPTIONS.map(y => (
                                    <button
                                        key={y}
                                        onClick={() => {
                                            if (selectedSeason) {
                                                setSelectedYear(selectedYear === String(y) ? '' : String(y));
                                                setPage(1);
                                            } else {
                                                showToast('Por favor, selecione uma temporada (Inverno, Primavera...) antes de escolher o ano.', 'error');
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
                    </div>

                    <div>
                        <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none">
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

                    {activeFilterCount > 0 && (
                        <div className="pt-4 border-t border-line flex justify-end">
                            <button onClick={clearFilters} className="flex items-center gap-1.5 text-coral text-xs font-bold hover:opacity-80 cursor-pointer">
                                <X size={12} /> Limpar todos os filtros
                            </button>
                        </div>
                    )}
                </div>
            </div>

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
                            className={`shrink-0 whitespace-nowrap text-[13px] font-bold px-4 py-2 rounded-full border transition-colors cursor-pointer ${
                                filtroAtivo === tab
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

                {editando && (
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
                )}
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
                        className={`text-[13px] font-bold px-5 py-2.5 rounded-full border transition-colors cursor-pointer ${
                            selectedStatus === '' && selectedSort === 'POPULARITY_DESC'
                            ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-white border-transparent shadow-lg'
                            : 'bg-panel border-line text-muted hover:border-holo-3 hover:text-text'
                        }`}
                    >
                        🏆 Top Global
                    </button>
                    <button
                        onClick={() => { setSelectedStatus('RELEASING'); setSelectedSort('TRENDING_DESC'); }}
                        className={`text-[13px] font-bold px-5 py-2.5 rounded-full border transition-colors cursor-pointer flex items-center gap-2 ${
                            selectedStatus === 'RELEASING' && selectedSort === 'TRENDING_DESC'
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

                    {}
                    <div
                        className={`grid transition-all duration-300 ease-out ${
                            showFilters ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'
                        }`}
                    >
                        <div className="overflow-hidden">
                            <div className="bg-panel border border-line rounded-2xl p-5 space-y-6">
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
                            </div>
                        </div>
                    </div>
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

## client/tsconfig.app.json

```json
[File content not included]
```

## client/tsconfig.json

```json
[File content not included]
```

## client/tsconfig.node.json

```json
[File content not included]
```

## client/vite.config.ts

```typescript
[File content not included]
```

## cmd/web/main.go

```go
package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/config"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/handlers"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func main() {
	
	if err := config.LoadAndValidateEnv(); err != nil {
		log.Fatalf("Erro crítico no boot: %v", err)
	}
	if err := database.Connect(); err != nil {
		log.Fatalf("Erro crítico ao conectar ao banco de dados: %v", err)
	}
	log.Println("Conexão com o banco de dados estabelecida!")

	
	if err := middleware.InitJWKS(os.Getenv("SUPABASE_URL")); err != nil {
		log.Fatalf("Erro crítico ao carregar JWKS: %v", err)
	}

	
	var anilistService anilist.Service
	
	if os.Getenv("MOCK_ANILIST") == "true" {
		log.Println("[MOCK] Inicializando Mock Client para a AniList (Sem consumo real de API)")
		anilistService = anilist.NewMockClient()
	} else {
		anilistService = anilist.NewClient()
	}

	searchHandler := &handlers.SearchHandler{AniListClient: anilistService}
	animeHandler := &handlers.AnimeHandler{AniListClient: anilistService}
	entriesHandler := handlers.EntriesHandler{}
	rankingHandler := &handlers.RankingHandler{AniListClient: anilistService}
	curationHandler := &handlers.CurationHandler{}

	
	
	r := chi.NewRouter()
	r.Use(chimw.RequestID) 
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, req *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	
	r.Get("/api/search", searchHandler.HandleSearch)
	r.Get("/api/anime/{id}", animeHandler.HandleGetAnime)
	r.Get("/api/anime/{id}/statistics", animeHandler.HandleGetStatistics)
	r.Get("/api/ranking", rankingHandler.HandleGetTopAnime)
	r.Get("/api/curation", curationHandler.HandleList)

	r.Post("/api/anime/bulk", animeHandler.HandleGetAnimesByIDs)

	
	r.Group(func(protegido chi.Router) {
		protegido.Use(middleware.RequireAuth)

		protegido.Get("/api/entries", entriesHandler.HandleList)
		protegido.Post("/api/entries", entriesHandler.HandleCreate)
		protegido.Put("/api/entries/{id}", entriesHandler.HandleUpdate)
		protegido.Delete("/api/entries/{id}", entriesHandler.HandleDelete)

	})

	
	r.Group(func(admin chi.Router) {
		admin.Use(middleware.RequireAuth)
		admin.Use(middleware.RequireAdmin)

		admin.Get("/api/admin/verify", func(w http.ResponseWriter, req *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"admin": true}`))
		})

		admin.Post("/api/curation", curationHandler.HandleCreate)
		admin.Put("/api/curation/{id}", curationHandler.HandleUpdate)
		admin.Delete("/api/curation/{id}", curationHandler.HandleDelete)
	})

	
	workDir, _ := os.Getwd()
	filesDir := filepath.Join(workDir, "client", "dist")

	r.Get("/*", func(w http.ResponseWriter, req *http.Request) {
		path := filepath.Join(filesDir, req.URL.Path)
		_, err := os.Stat(path)

		
		
		if os.IsNotExist(err) || req.URL.Path == "/" {
			http.ServeFile(w, req, filepath.Join(filesDir, "index.html"))
			return
		}

		
		http.ServeFile(w, req, path)
	})
	
	
	port := os.Getenv("PORT")
	log.Printf("Servidor rodando na porta %s...", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Erro ao iniciar o servidor: %v", err)
	}

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

## Tom da conversa

Prefiro uma conversa natural com a IA, não uma troca robotizada de comandos. Pode explicar,
sugerir, discordar ou perguntar — o fluxo abaixo é sobre *processo* (como o código chega no
repositório), não sobre como a conversa deve soar.

## Convenções de nomenclatura do meu portfólio

Meus projetos vivem sob o hub **"JVM Systems — Portfolio Dev"**, que reúne todos os meus
projetos em produção como "módulos". Ao criar um projeto novo destinado a esse hub, use nome
provisório claro (ex: "NomeDoProjeto (nome provisório)") até eu confirmar o nome definitivo.

````

## docs/DECISIONS.md

```markdown
# 📑 DECISIONS.md — AniDeck

> Escopo: só decisões técnicas estruturais deste projeto.

| Data | Decisão | Por que escolhemos A em vez de B |
|---|---|---|
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

## docs/PAGES.md

```markdown
# 📄 PAGES.md — AniDeck

> Rastreamento de status por página/tela, complementando o `ROADMAP.md` (que rastreia por fase).
> Atualizar sempre que uma tela ganhar protótipo visual ou for implementada de verdade.

| # | Página/Tela | Status | Fase do Roadmap |
|---|---|---|---|
| 1 | Landing pública (visitante) | ✅ Prototipada | Fase 3 |
| 2 | Login / Cadastro | 🔧 Em implementação (tela conectada ao Supabase Auth, funcional) | Fase 2 |
| 3 | Dashboard "Meu Deck" (logado) | ✅ Prototipada | Fase 2/3 |
| 4 | Descobrir/Buscar catálogo | 🔧 Em implementação (backend `/api/search` pronto, grade no React pendente) | Fase 2 |
| 5 | Detalhe do anime (sinopse, personagens, staff, relacionados, streaming, reviews) | ✅ Prototipada | Fase 2 |
| 6 | Calendário de lançamentos (completo) | ✅ Prototipada | Fase 5.5 |
| 7 | Rankings (completo) | ✅ Prototipada | Fase 2 |
| 8 | Estatísticas/Dashboard analítico (gráficos) | ✅ Prototipada | Fase 4 |
| 9 | Configurações & Ajuda (unificadas em uma só página) | ✅ Prototipada | Fase 2 |

**Total: 9 páginas prototipadas, 2 em implementação (Login/Cadastro e Busca).** 🎉

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

## internal/anilist/client.go

```go
package anilist

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
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
	Description   string                           `json:"description"`
	Episodes      int                              `json:"episodes"`
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
			} `json:"node"`
		} `json:"edges"`
	} `json:"relations"`
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

	var studios []struct{ Name string `json:"name"` }
	for _, edge := range m.Studios.Edges {
		studios = append(studios, struct{ Name string `json:"name"` }{Name: edge.Node.Name})
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
			} `json:"entry"`
		}{
			Relation: edge.RelationType,
			Entry: []struct {
				MalID int    `json:"mal_id"`
				Type  string `json:"type"`
				Name  string `json:"name"`
			}{{
				MalID: edge.Node.IDMal,
				Type:  edge.Node.Type,
				Name:  relTitle,
			}},
		})
	}

	return Anime{
		MalID:    m.IDMal,
		Title:    title,
		Status:   mapStatus(m.Status),
		Synopsis: stripHTML.Sanitize(m.Description),
		Episodes: m.Episodes,
		Score:    float64(m.AverageScore) / 10.0,
		Ranking:  bestRanking,
		BannerImage: m.BannerImage,
		Characters:  chars,
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
    description
    episodes
    averageScore
    coverImage { large }
    bannerImage
    genres
    externalLinks { site url }
    nextAiringEpisode { airingAt timeUntilAiring episode }
    characters(sort: ROLE, perPage: 15) {
      edges {
        role
        node { id name { full } image { large } }
      }
    }
    studios { edges { node { name } } }
    relations { edges { relationType node { idMal type title { romaji english } } } }
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
    stats { scoreDistribution { score amount } }
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
				ScoreDistribution []struct{ Score, Amount int }
			}
		}
	}
	if err := c.gqlRequest(ctx, statsQuery, map[string]interface{}{"idMal": malID}, &resultado); err != nil {
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
	return &AnimeStatisticsResponse{Data: AnimeStatistics{Scores: scores}}, nil
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

func (c *Client) GetAnimesByMalIDs(ctx context.Context, malIDs []int) (*AnimeSearchResponse, error) {
	if len(malIDs) == 0 {
		return &AnimeSearchResponse{Data: []Anime{}}, nil
	}

	var resultado struct {
		Page struct{ Media []aniListMedia } `json:"Page"`
	}

	if err := c.gqlRequest(ctx, byIdsQuery, map[string]interface{}{"idMal_in": malIDs}, &resultado); err != nil {
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
package anilist

import "context"

type MockClient struct{}

func NewMockClient() *MockClient {
	return &MockClient{}
}

func (m *MockClient) SearchAnime(ctx context.Context, query string, page int, perPage int, f SearchFilters) (*AnimeSearchResponse, error) {
	return &AnimeSearchResponse{
		Data: []Anime{
			{
				MalID: 20, Title: "Naruto (Mock de Desenvolvimento)", Status: "Currently Airing",
				NextAiringEpisode: &NextAiringEpisode{AiringAt: 0, TimeUntilAiring: 14400, Episode: 15},
			},
			{MalID: 1735, Title: "Naruto: Shippuuden (Mock)", Status: "Finished Airing"},
		},
	}, nil
}

func (m *MockClient) GetAnimeById(ctx context.Context, id string) (*AnimeByIdResponse, error) {
	return &AnimeByIdResponse{
		Data: Anime{
			MalID:    20,
			Title:    "Naruto (Mock Detail)",
			Status:   "Currently Airing",
			Synopsis: "Sinopse falsa gerada localmente. O Ninja Loiro faz coisas de ninja.",
			Score:    8.5,
			Episodes: 199,
			NextAiringEpisode: &NextAiringEpisode{AiringAt: 0, TimeUntilAiring: 86400, Episode: 16},
		},
	}, nil
}

func (m *MockClient) GetAnimeStatistics(ctx context.Context, id string) (*AnimeStatisticsResponse, error) {
	return &AnimeStatisticsResponse{
		Data: AnimeStatistics{
			Scores: []ScoreDistribution{
				{Score: 10, Votes: 5000, Percentage: 50.0},
				{Score: 9, Votes: 3000, Percentage: 30.0},
				{Score: 8, Votes: 1000, Percentage: 10.0},
			},
		},
	}, nil
}

func (m *MockClient) GetTopAnime(ctx context.Context, page int, perPage int, f SearchFilters) (*AnimeSearchResponse, error) {
	return &AnimeSearchResponse{Data: []Anime{}}, nil
}

func (m *MockClient) GetAnimesByMalIDs(ctx context.Context, malIDs []int) (*AnimeSearchResponse, error) {
	return &AnimeSearchResponse{
		Data: []Anime{
			{
				MalID: 20, Title: "Naruto (Mock)", Status: "Currently Airing",
				NextAiringEpisode: &NextAiringEpisode{AiringAt: 0, TimeUntilAiring: 3600, Episode: 10},
			},
		},
	}, nil
}
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
	Score       float64     `json:"score"`
	Ranking     int         `json:"ranking,omitempty"` 
	BannerImage string      `json:"bannerImage,omitempty"`
	Characters  []Character `json:"characters,omitempty"`

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
}

type AnimeStatisticsResponse struct {
	Data AnimeStatistics `json:"data"`
}

type AnimeStatistics struct {
	Scores []ScoreDistribution `json:"scores"` 
}

type ScoreDistribution struct {
	Score      int     `json:"score"`
	Votes      int     `json:"votes"`
	Percentage float64 `json:"percentage"`
}
```

## internal/config/env.go

```go
package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)


func LoadAndValidateEnv() error {
	
	_ = godotenv.Load()

	requiredVars := []string{
		"PORT",
		"SUPABASE_URL", 
		"SUPABASE_PUBLIC_KEY", 
		"SUPABASE_ANON_KEY",
		"ADMIN_USER_ID",
	}

	for _, v := range requiredVars {
		if os.Getenv(v) == "" {
			return fmt.Errorf("variável de ambiente obrigatória ausente: %s", v)
		}
	}

	return nil

}
```

## internal/config/env_test.go

```go
package config

import (
	"os"
	"testing"
)

func TestLoadAndValidateEnv (t *testing.T) {
	
	os.Clearenv()

	err := LoadAndValidateEnv()
	if err == nil {
		t.Error("Esperava um erro por faltar variáveis, mas obteve nil")
	}

	os.Setenv("PORT", "8080")
	os.Setenv("SUPABASE_URL", "https:
	os.Setenv("SUPABASE_PUBLIC_KEY", "chave123")
	os.Setenv("SUPABASE_ANON_KEY", "chave-anon-123")

	err = LoadAndValidateEnv()
	if err != nil {
		t.Errorf("Não esperava erro, mas obteve: %v", err)
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

## internal/entries/models.go

```go
package entries

type MediaEntry struct {
	ID         string   `json:"id,omitempty"`
	UserID     string   `json:"user_id,omitempty"`
	MalID      int      `json:"mal_id"`
	Tipo       string   `json:"tipo"`
	Status     string   `json:"status"`
	Nota       *float64 `json:"nota,omitempty"`
	Anotacao   string   `json:"anotacao,omitempty"`
	IsFavorite bool     `json:"is_favorite"` 
}
```

## internal/handlers/anime.go

```go
package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/models"
)

type AnimeHandler struct {
	AniListClient anilist.Service
}

func (h *AnimeHandler) HandleGetAnime(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do anime é obrigatório", http.StatusBadRequest)
		return
	}

	resultados, err := h.AniListClient.GetAnimeById(r.Context(), id)
	if err != nil {
		if err.Error() == "ID inválido" {
			http.Error(w, "ID do anime inválido", http.StatusBadRequest)
			return
		}
		log.Printf("[ERRO ANILIST] Falha ao buscar detalhes do anime %s: %v", id, err)
		http.Error(w, "Detalhes indisponíveis no momento", http.StatusServiceUnavailable)
		return
	}

	var curados []models.CuratedAnime
	data, _, errCurado := database.Client.From("curated_animes").Select("*", "exact", false).Eq("mal_id", id).Execute()

	if errCurado == nil {
		_ = json.Unmarshal(data, &curados)
	}

	if errCurado == nil && len(curados) > 0 {
		curado := curados[0]

		resultados.Data.Title = curado.CustomTitle
		if curado.CustomSynopsis != "" {
			resultados.Data.Synopsis = curado.CustomSynopsis
		}
		if curado.CustomStatus != "" {
			resultados.Data.Status = curado.CustomStatus
		}
		if len(curado.CustomTags) > 0 {
			var novasTags []struct{ Name string `json:"name"` }
			for _, tag := range curado.CustomTags {
				novasTags = append(novasTags, struct{ Name string `json:"name"` }{Name: tag})
			}
			resultados.Data.Genres = novasTags
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultados); err != nil {
		log.Printf("[ERRO] HandleGetAnime: falha ao serializar resposta: %v", err)
	}
}

func (h *AnimeHandler) HandleGetStatistics(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do anime é obrigatório", http.StatusBadRequest)
		return
	}

	resultados, err := h.AniListClient.GetAnimeStatistics(r.Context(), id)
	if err != nil {
		if err.Error() == "ID inválido" {
			http.Error(w, "ID do anime inválido", http.StatusBadRequest)
			return
		}
		http.Error(w, "Estatísticas indisponíveis no momento", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultados)
}

func (h *AnimeHandler) HandleGetAnimesByIDs(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		IDs []int `json:"ids"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	if len(payload.IDs) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"data": []interface{}{}})
		return
	}

	resultados, err := h.AniListClient.GetAnimesByMalIDs(r.Context(), payload.IDs)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar animes em lote: %v", err)
		http.Error(w, "Detalhes indisponíveis no momento", http.StatusServiceUnavailable)
		return
	}

	var curados []models.CuratedAnime
	data, _, errCurado := database.Client.From("curated_animes").Select("*", "exact", false).Execute()
	
	if errCurado == nil {
		_ = json.Unmarshal(data, &curados)
	}
	
	if errCurado == nil && len(curados) > 0 {
		mapaCuradoria := make(map[int]models.CuratedAnime)
		for _, c := range curados {
			mapaCuradoria[c.MalID] = c
		}

		for i, anime := range resultados.Data {
			if curado, ok := mapaCuradoria[anime.MalID]; ok {
				resultados.Data[i].Title = curado.CustomTitle
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultados)
}
```

## internal/handlers/curation.go

```go
package handlers

import (
	"cmp"
	"encoding/json"
	"log"
	"net/http"
	"slices"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/JoaoMendes1/anideck/internal/models"
	"github.com/go-chi/chi/v5"
)

type CurationHandler struct{}

func (h *CurationHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	var resultado []models.CuratedAnime

	data, _, err := database.Client.From("curated_animes").
		Select("*", "exact", false).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleList Curation: %v", err)
		http.Error(w, "Erro ao buscar destaques", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	slices.SortFunc(resultado, func(a, b models.CuratedAnime) int {
		return cmp.Compare(a.OrderIndex, b.OrderIndex)
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

func (h *CurationHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var entrada models.CuratedAnime
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	entrada.CustomSynopsis = sanitizer.Sanitize(entrada.CustomSynopsis)

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	var resultado []models.CuratedAnime
	data, _, err := dbClient.From("curated_animes").Insert(entrada, false, "", "representation", "exact").Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleCreate Curation: %v", err)
		http.Error(w, "Erro ao salvar destaque", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	
	InvalidateRankingCache()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

func (h *CurationHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do destaque é obrigatório", http.StatusBadRequest)
		return
	}

	var entrada models.CuratedAnime
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	entrada.CustomSynopsis = sanitizer.Sanitize(entrada.CustomSynopsis)

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	var resultado []models.CuratedAnime
	data, _, err := dbClient.From("curated_animes").
		Update(entrada, "representation", "exact").
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleUpdate Curation (id=%s): %v", id, err)
		http.Error(w, "Erro ao atualizar destaque", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	
	InvalidateRankingCache()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

func (h *CurationHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do destaque é obrigatório", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err := dbClient.From("curated_animes").
		Delete("", "exact").
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleDelete Curation (id=%s): %v", id, err)
		http.Error(w, "Erro ao remover destaque", http.StatusInternalServerError)
		return
	}

	
	InvalidateRankingCache()

	w.WriteHeader(http.StatusNoContent)
}
```

## internal/handlers/entries.go

```go
package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/microcosm-cc/bluemonday"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/entries"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

var sanitizer = bluemonday.StrictPolicy()

type EntriesHandler struct{}

func (h *EntriesHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)

	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var entrada entries.MediaEntry
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	entrada.UserID = userID
	entrada.Anotacao = sanitizer.Sanitize(entrada.Anotacao)

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	var resultado []entries.MediaEntry
	data, _, err := dbClient.From("media_entries").Insert(entrada, false, "", "representation", "exact").Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleCreate: %v", err)
		http.Error(w, "Erro ao salvar entrada", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultado); err != nil {
		log.Printf("[ERRO] HandleCreate: falha ao serializar resposta: %v", err)
	}
}

func (h *EntriesHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)

	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	var resultado []entries.MediaEntry
	data, _, err := dbClient.From("media_entries").
		Select("*", "exact", false).
		Eq("user_id", userID).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleList: %v", err)
		http.Error(w, "Erro ao buscar lista", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultado); err != nil {
		log.Printf("[ERRO] HandleList: falha ao serializar resposta: %v", err)
	}
}

func (h *EntriesHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)

	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID da entrada é obrigatório", http.StatusBadRequest)
		return
	}
	var entrada entries.MediaEntry
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido!", http.StatusBadRequest)
		return
	}

	entrada.UserID = userID
	entrada.Anotacao = sanitizer.Sanitize(entrada.Anotacao)

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	var resultado []entries.MediaEntry
	data, _, err := dbClient.From("media_entries").
		Update(entrada, "representation", "exact").
		Eq("id", id).
		Eq("user_id", userID).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleUpdate (id=%s): %v", id, err)
		http.Error(w, "Erro ao atualizar entrada", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultado); err != nil {
		log.Printf("[ERRO] HandleUpdate: falha ao serializar resposta: %v", err)
	}
}

func (h *EntriesHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)

	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID da entrada é obrigatório", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err := dbClient.From("media_entries").
		Delete("", "exact").
		Eq("id", id).
		Eq("user_id", userID).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleDelete (id=%s): %v", id, err)
		http.Error(w, "Erro ao remover entrada", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
```

## internal/handlers/entries_test.go

```go
package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func TestSanitizacaoRemoveTagsHTML(t *testing.T) {
	entrada := "<script>alert('hack')</script> Texto normal aqui"
	resultado := sanitizer.Sanitize(entrada)

	if strings.Contains(resultado, "<script>") {
		t.Errorf("esperava que a tag <script> fosse removida, mas resultado foi: %s", resultado)
	}
	if !strings.Contains(resultado, "Texto normal aqui") {
		t.Errorf("esperava que o texto legítimo sobrevivesse, mas resultado foi: %s", resultado)
	}
}

func TestHandleCreate_SemAutenticacao(t *testing.T) {
	handler := &EntriesHandler{}

	
	req := httptest.NewRequest(http.MethodPost, "/api/entries", strings.NewReader(`{"mal_id": 20}`))
	w := httptest.NewRecorder()

	handler.HandleCreate(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("esperava 401 sem autenticação, recebeu: %d", w.Code)
	}
}

func TestHandleCreate_CorpoInvalido(t *testing.T) {
	handler := &EntriesHandler{}

	
	ctx := context.WithValue(context.Background(), middleware.UserIDKey, "usuario-teste-123")
	req := httptest.NewRequest(http.MethodPost, "/api/entries", strings.NewReader(`{corpo quebrado`))
	req = req.WithContext(ctx)
	w := httptest.NewRecorder()

	handler.HandleCreate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("esperava 400 com corpo inválido, recebeu: %d", w.Code)
	}
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

## internal/handlers/search.go

```go
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/models"
)

type SearchHandler struct {
	AniListClient anilist.Service
}

func (h *SearchHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	genres := r.URL.Query()["genre"]
	tags := r.URL.Query()["tag"]
	season := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("season")))
	status := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("status")))
	sortParam := r.URL.Query().Get("sort")

	if sortParam == "" {
		sortParam = "POPULARITY_DESC" 
	}

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

	seasonYear := 0
	if season != "" {
		if y, err := strconv.Atoi(r.URL.Query().Get("year")); err == nil && y > 0 {
			seasonYear = y
		}
	}

	if query == "" && len(genres) == 0 && len(tags) == 0 && season == "" && status == "" {
		http.Error(w, "É necessário informar ao menos um critério de busca", http.StatusBadRequest)
		return
	}

	genreMap := make(map[string]bool)
	for _, g := range genres {
		genreMap[strings.ToLower(g)] = true
	}

	tagMap := make(map[string]bool)
	for _, t := range tags {
		tagMap[strings.ToLower(t)] = true
	}

	filters := anilist.SearchFilters{
		Genres:     genres,
		Tags:       tags,
		Season:     season,
		SeasonYear: seasonYear,
		Status:     status,
		Sort:       sortParam,
	}

	resultados, err := h.AniListClient.SearchAnime(r.Context(), query, page, perPage, filters)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar '%s': %v", query, err)
		http.Error(w, "Busca indisponível no momento. Tente novamente mais tarde.", http.StatusServiceUnavailable)
		return
	}

	
	if query != "" && page == 1 {
		var localHits []models.CuratedAnime
		data, _, errLocal := database.Client.From("curated_animes").Select("*", "exact", false).Filter("custom_title", "ilike", "%"+query+"%").Execute()

		if errLocal == nil {
			_ = json.Unmarshal(data, &localHits)
		}

		if errLocal == nil && len(localHits) > 0 {
			var localMalIDs []int
			for _, hit := range localHits {
				localMalIDs = append(localMalIDs, hit.MalID)
			}

			localAnimes, errAniListIds := h.AniListClient.GetAnimesByMalIDs(r.Context(), localMalIDs)

			if errAniListIds == nil && localAnimes != nil {
				curadosMap := make(map[int]models.CuratedAnime)
				for _, hit := range localHits {
					curadosMap[hit.MalID] = hit
				}

				existingIDs := make(map[int]bool)
				var combined []anilist.Anime
				
				for _, a := range localAnimes.Data {
					if curado, ok := curadosMap[a.MalID]; ok {
						a.Title = curado.CustomTitle 
						if curado.CustomSynopsis != "" {
							a.Synopsis = curado.CustomSynopsis 
						}
						
						if curado.CustomStatus != "" { a.Status = curado.CustomStatus }
						if len(curado.CustomTags) > 0 {
							var novasTags []struct{ Name string `json:"name"` }
							for _, tag := range curado.CustomTags {
								novasTags = append(novasTags, struct{ Name string `json:"name"` }{Name: tag})
							}
							a.Genres = novasTags
						}
					}

					match := true
					if len(genres) > 0 {
						hasGenre := false
						for _, animeG := range a.Genres {
							if genreMap[strings.ToLower(animeG.Name)] {
								hasGenre = true; break
							}
						}
						if !hasGenre { match = false }
					}
					if match && len(tags) > 0 {
						hasTag := false
						for _, animeG := range a.Genres {
							if tagMap[strings.ToLower(animeG.Name)] {
								hasTag = true; break
							}
						}
						if !hasTag { match = false }
					}

					if match {
						combined = append(combined, a)
						existingIDs[a.MalID] = true
					}
				}
				
				for _, a := range resultados.Data {
					if !existingIDs[a.MalID] {
						combined = append(combined, a)
						existingIDs[a.MalID] = true
					}
				}
				resultados.Data = combined
			}
		}
	}

	var curados []models.CuratedAnime
	dataCurados, _, _ := database.Client.From("curated_animes").Select("*", "exact", false).Execute()
	if dataCurados != nil {
		_ = json.Unmarshal(dataCurados, &curados)
	}

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

	
	if status != "" {
		expectedStatus := status
		switch status {
		case "FINISHED": expectedStatus = "Finished Airing"
		case "RELEASING": expectedStatus = "Currently Airing"
		case "NOT_YET_RELEASED": expectedStatus = "Not yet aired"
		}
		
		var filtered []anilist.Anime
		for _, a := range resultados.Data {
			if strings.EqualFold(a.Status, expectedStatus) {
				filtered = append(filtered, a)
			}
		}
		resultados.Data = filtered
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultados); err != nil {
		log.Printf("[ERRO] HandleSearch: falha ao serializar resposta: %v", err)
	}
}
```

## internal/handlers/search_test.go

```go

package handlers

import (
	"testing"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)


func mkAnime(title string, providers ...string) anilist.Anime {
	a := anilist.Anime{Title: title}
	for _, p := range providers {
		a.Streaming = append(a.Streaming, struct {
			Name string `json:"name"`
			URL  string `json:"url"`
		}{
			Name: p,
			URL:  "https:
		})
	}
	return a
}




func TestBuildSearchFilters_GenresAndTags(t *testing.T) {
	f := anilist.SearchFilters{
		Genres: []string{"Action", "Drama"},
		Tags:   []string{"Martial Arts"},
	}

	if len(f.Genres) != 2 {
		t.Fatalf("esperado 2 gêneros, recebido %d", len(f.Genres))
	}
	if len(f.Tags) != 1 || f.Tags[0] != "Martial Arts" {
		t.Fatalf("esperado tag 'Martial Arts', recebido: %+v", f.Tags)
	}
}

func TestBuildSearchFilters_SeasonYear(t *testing.T) {
	
	
	f := anilist.SearchFilters{
		Season:     "SUMMER",
		SeasonYear: 2026,
	}

	if f.Season != "SUMMER" {
		t.Fatalf("esperado season 'SUMMER', recebido '%s'", f.Season)
	}
	if f.SeasonYear != 2026 {
		t.Fatalf("esperado year 2026, recebido %d", f.SeasonYear)
	}

	
	fSemSeason := anilist.SearchFilters{SeasonYear: 2026}
	if fSemSeason.Season != "" {
		t.Fatal("season deveria estar vazio quando não fornecido")
	}
}

func TestBuildSearchFilters_Status(t *testing.T) {
	f := anilist.SearchFilters{Status: "RELEASING"}
	if f.Status != "RELEASING" {
		t.Fatalf("esperado status 'RELEASING', recebido '%s'", f.Status)
	}
}


var _ = mkAnime

```

## internal/middleware/auth.go

```go
package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"os"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "userID"
const TokenKey contextKey = "jwtToken" 

var jwks keyfunc.Keyfunc

func InitJWKS(supabaseURL string) error {
	jwksURL := fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", supabaseURL)

	k, err := keyfunc.NewDefaultCtx(context.Background(), []string{jwksURL})
	if err != nil {
		return fmt.Errorf("erro ao carregar JWKS da Supabase: %w", err)
	}
	jwks = k
	return nil
}

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Token de autenticação ausente", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := jwt.Parse(tokenString, jwks.Keyfunc)
		if err != nil || !token.Valid {
			http.Error(w, "Token inválido ou expirado", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Não foi possível ler os dados do token", http.StatusUnauthorized)
			return
		}

		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			http.Error(w, "Token não contém identificação de usuário", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, TokenKey, tokenString) 
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value(UserIDKey).(string)
		adminID := os.Getenv("ADMIN_USER_ID")

		if !ok || userID != adminID {
			http.Error(w, "Acesso negado: apenas o administrador tem permissão de curadoria", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}
```

## internal/models/curation.go

```go
package models



type CuratedAnime struct {
	ID             string   `json:"id,omitempty"`
	MalID          int      `json:"mal_id"`
	CustomTitle    string   `json:"custom_title"`
	CustomSynopsis string   `json:"custom_synopsis,omitempty"`
	CustomFormat   string   `json:"custom_format,omitempty"`
	CustomStatus   string   `json:"custom_status,omitempty"`
	CustomTags     []string `json:"custom_tags,omitempty"`
	OrderIndex     int      `json:"order_index"`
	CreatedAt      string   `json:"created_at,omitempty"`
}
```

## marketing/posts-instagram.html

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>AniDeck — Posts Instagram</title>
<link href="https:
<style>
  *{box-sizing:border-box; margin:0; padding:0;}
  body{background:#333; display:flex; flex-direction:column; align-items:center; gap:40px; padding:40px; font-family:'JetBrains Mono',monospace;}
  .label{color:#fff; font-size:13px; margin-bottom:10px; text-align:center;}
  .post{
    width:1080px; height:1080px; position:relative; overflow:hidden;
    background:#0A0714; color:#F1EEFA; font-family:'Manrope',sans-serif;
    transform:scale(0.5); transform-origin:top center; margin-bottom:-540px;
  }
  .holo{background:linear-gradient(90deg,#FF4FD8,#7B5CFF 45%,#3FE0F0); -webkit-background-clip:text; background-clip:text; color:transparent;}
  .ambient{position:absolute; inset:0;
    background:
      radial-gradient(600px 500px at 15% 10%, rgba(255,79,216,.16), transparent 60%),
      radial-gradient(650px 550px at 90% 90%, rgba(63,224,240,.14), transparent 60%);
  }
  .grid-bg{position:absolute; inset:0; background-image:linear-gradient(#2B2247 1px,transparent 1px),linear-gradient(90deg,#2B2247 1px,transparent 1px); background-size:64px 64px; opacity:.35; mask-image:radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 75%);}

  
  .p1-content{position:relative; z-index:2; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:100px;}
  .p1-logo{display:flex; align-items:center; gap:20px; margin-bottom:60px;}
  .p1-logo .mark{width:80px; height:80px; border-radius:22px; background:linear-gradient(135deg,#FF4FD8,#7B5CFF,#3FE0F0); display:flex; align-items:center; justify-content:center; font-family:'Anton',sans-serif; font-size:36px; color:#0A0714;}
  .p1-logo .word{font-family:'Anton',sans-serif; font-size:56px;}
  .p1-content h1{font-family:'Anton',sans-serif; font-size:64px; text-transform:uppercase; line-height:1.15; margin-bottom:30px;}
  .p1-content p{font-size:28px; color:#A79BC9; max-width:780px; line-height:1.5;}
  .p1-badge{margin-top:50px; font-family:'JetBrains Mono',monospace; font-size:22px; padding:16px 34px; border-radius:99px; border:2px dashed #FFC542; color:#FFC542;}

  
  .p2-content{position:relative; z-index:2; height:100%; padding:90px; display:flex; flex-direction:column;}
  .p2-kicker{font-family:'JetBrains Mono',monospace; font-size:24px; color:#3FE0F0; letter-spacing:.1em; margin-bottom:20px;}
  .p2-content h1{font-family:'Anton',sans-serif; font-size:58px; text-transform:uppercase; line-height:1.1; margin-bottom:40px; max-width:800px;}
  .p2-cards{display:flex; flex-direction:column; gap:24px; margin-top:20px;}
  .p2-card{display:flex; align-items:center; gap:28px; background:#130F22; border:2px solid #2B2247; border-radius:24px; padding:28px 34px;}
  .p2-thumb{width:90px; height:90px; border-radius:16px; flex-shrink:0;}
  .p2-t1{background:linear-gradient(145deg,#FF4FD8,#181330);}
  .p2-t2{background:linear-gradient(145deg,#7B5CFF,#181330);}
  .p2-title{font-weight:700; font-size:30px;}
  .p2-sub{font-family:'JetBrains Mono',monospace; font-size:20px; color:#6B5F94; margin-top:6px;}
  .p2-count{margin-left:auto; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:24px; color:#3FE0F0; background:rgba(63,224,240,.1); border:2px solid rgba(63,224,240,.3); padding:10px 20px; border-radius:99px; white-space:nowrap;}
  .p2-footer{margin-top:auto; display:flex; align-items:center; gap:16px;}
  .p2-footer .mark{width:56px; height:56px; border-radius:16px; background:linear-gradient(135deg,#FF4FD8,#7B5CFF,#3FE0F0); display:flex; align-items:center; justify-content:center; font-family:'Anton',sans-serif; font-size:26px; color:#0A0714;}
  .p2-footer .word{font-family:'Anton',sans-serif; font-size:36px;}

  
  .p3-content{position:relative; z-index:2; height:100%; padding:90px; display:flex; flex-direction:column;}
  .p3-kicker{font-family:'JetBrains Mono',monospace; font-size:24px; color:#FF4FD8; letter-spacing:.1em; margin-bottom:20px;}
  .p3-content h1{font-family:'Anton',sans-serif; font-size:56px; text-transform:uppercase; line-height:1.1; margin-bottom:50px; max-width:850px;}
  .p3-stats{display:grid; grid-template-columns:1fr 1fr; gap:24px;}
  .p3-stat{background:#130F22; border:2px solid #2B2247; border-radius:24px; padding:34px; border-top:6px solid var(--c);}
  .p3-stat b{display:block; font-family:'Anton',sans-serif; font-size:52px;}
  .p3-stat span{font-family:'JetBrains Mono',monospace; font-size:18px; color:#6B5F94; text-transform:uppercase;}
  .p3-footer{margin-top:auto; display:flex; align-items:center; gap:16px;}
  .p3-footer .mark{width:56px; height:56px; border-radius:16px; background:linear-gradient(135deg,#FF4FD8,#7B5CFF,#3FE0F0); display:flex; align-items:center; justify-content:center; font-family:'Anton',sans-serif; font-size:26px; color:#0A0714;}
  .p3-footer .word{font-family:'Anton',sans-serif; font-size:36px;}
</style>
</head>
<body>

<div class="label">POST 1 — Anúncio / Teaser (1080×1080 real, exibido em 50% aqui)</div>
<div class="post">
  <div class="grid-bg"></div>
  <div class="ambient"></div>
  <div class="p1-content">
    <div class="p1-logo">
      <div class="mark">A</div>
      <div class="word">Ani<span class="holo">Deck</span></div>
    </div>
    <h1>Seu Deck de animes,<br>do <span class="holo">seu jeito.</span></h1>
    <p>O catálogo completo do MyAnimeList, com a curadoria, as notas e a organização que só fazem sentido pra você — numa interface que você não vai ter vergonha de usar.</p>
    <div class="p1-badge">EM BREVE</div>
  </div>
</div>

<div class="label">POST 2 — Feature: Calendário de Lançamentos</div>
<div class="post">
  <div class="grid-bg"></div>
  <div class="ambient"></div>
  <div class="p2-content">
    <div class="p2-kicker">
    <h1>Nunca mais perca o dia do lançamento.</h1>
    <div class="p2-cards">
      <div class="p2-card">
        <div class="p2-thumb p2-t1"></div>
        <div><div class="p2-title">Seu anime favorito</div><div class="p2-sub">EPISÓDIO 09</div></div>
        <div class="p2-count">⏱ 2D 06H</div>
      </div>
      <div class="p2-card">
        <div class="p2-thumb p2-t2"></div>
        <div><div class="p2-title">Aquele que você tá em dia</div><div class="p2-sub">EPISÓDIO 04</div></div>
        <div class="p2-count">⏱ 5D 12H</div>
      </div>
    </div>
    <div class="p2-footer">
      <div class="mark">A</div>
      <div class="word">Ani<span class="holo">Deck</span></div>
    </div>
  </div>
</div>

<div class="label">POST 3 — Feature: Estatísticas Pessoais</div>
<div class="post">
  <div class="grid-bg"></div>
  <div class="ambient"></div>
  <div class="p3-content">
    <div class="p3-kicker">
    <h1>Sua curadoria vira estatística de verdade.</h1>
    <div class="p3-stats">
      <div class="p3-stat" style="--c:#3FE0F0;"><b>18d 6h</b><span>Tempo assistido</span></div>
      <div class="p3-stat" style="--c:#FF4FD8;"><b>Ação</b><span>Gênero favorito</span></div>
      <div class="p3-stat" style="--c:#FFC542;"><b>9.1</b><span>Sua nota média</span></div>
      <div class="p3-stat" style="--c:#a0ff78;"><b>437</b><span>Episódios assistidos</span></div>
    </div>
    <div class="p3-footer">
      <div class="mark">A</div>
      <div class="word">Ani<span class="holo">Deck</span></div>
    </div>
  </div>
</div>

</body>
</html>

```

## prototipos/busca-prototipo.html

```html
[File content not included]
```

## prototipos/calendario-prototipo.html

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AniDeck — Calendário</title>
<link rel="preconnect" href="https:
<link href="https:
<style>
  :root{
    --void:#0A0714; --panel:#130F22; --panel-2:#181330; --line:#2B2247;
    --text:#F1EEFA; --muted:#A79BC9; --muted-2:#6B5F94;
    --holo-1:#FF4FD8; --holo-2:#7B5CFF; --holo-3:#3FE0F0; --gold:#FFC542;
  }
  *{box-sizing:border-box;}
  body{margin:0; background:var(--void); color:var(--text); font-family:'Manrope',sans-serif; -webkit-font-smoothing:antialiased;}
  a{color:inherit; text-decoration:none;} button{font-family:inherit;}
  .display{font-family:'Anton',sans-serif; font-weight:400;}
  .container{max-width:900px; margin:0 auto; padding:0 20px;}
  .holo-text{background:linear-gradient(90deg, var(--holo-1), var(--holo-2) 45%, var(--holo-3)); -webkit-background-clip:text; background-clip:text; color:transparent;}
  ::-webkit-scrollbar{height:6px;} ::-webkit-scrollbar-thumb{background:var(--line); border-radius:99px;}

  nav{position:sticky; top:0; z-index:50; background:rgba(10,7,20,.9); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); padding:14px 0;}
  .nav-inner{display:flex; align-items:center; justify-content:space-between; gap:16px; max-width:900px; margin:0 auto; padding:0 20px;}
  .logo{display:flex; align-items:center; gap:10px;}
  .logo-mark{width:32px; height:32px; border-radius:9px; background:linear-gradient(135deg, var(--holo-1), var(--holo-2), var(--holo-3)); display:flex; align-items:center; justify-content:center; font-family:'Anton',sans-serif; font-size:14px; color:#0A0714;}
  .logo-word{font-family:'Anton',sans-serif; font-size:16px;}
  .nav-links{display:flex; align-items:center; gap:24px;}
  .nav-links a{font-size:13.5px; font-weight:600; color:var(--muted);}
  .nav-links a.active{color:var(--text);}
  .search-icon-btn{width:32px; height:32px; border-radius:50%; border:1px solid var(--line); background:var(--panel); color:var(--muted); display:flex; align-items:center; justify-content:center;}
  .profile-chip{display:flex; align-items:center; gap:9px; padding:6px 12px 6px 6px; border-radius:99px; background:var(--panel); border:1px solid var(--line);}
  .avatar{width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg, var(--holo-2), var(--holo-3));}
  .profile-chip span{font-size:12.5px; font-weight:700;}
  @media(max-width:760px){ .nav-links{display:none;} }

  .page-head{padding:36px 0 22px;}
  .page-head h1{font-family:'Anton',sans-serif; font-weight:400; text-transform:uppercase; font-size:clamp(1.6rem,3.6vw,2.2rem); margin:0 0 6px;}
  .page-head p{color:var(--muted); font-size:14px; margin:0;}

  .view-tabs{display:flex; gap:8px; margin-bottom:30px;}
  .v-tab{font-size:13px; font-weight:700; padding:9px 16px; border-radius:99px; border:1px solid var(--line); color:var(--muted); background:var(--panel); cursor:pointer;}
  .v-tab.active{background:linear-gradient(90deg, var(--holo-1), var(--holo-2)); color:#fff; border-color:transparent;}

  .day-group{margin-bottom:34px;}
  .day-label{display:flex; align-items:center; gap:10px; margin-bottom:14px;}
  .day-label h2{font-family:'Anton',sans-serif; font-weight:400; text-transform:uppercase; font-size:15px; margin:0;}
  .day-label .badge-today{font-family:'JetBrains Mono',monospace; font-size:10px; background:rgba(63,224,240,.15); color:var(--holo-3); padding:3px 8px; border-radius:99px; border:1px solid rgba(63,224,240,.35);}
  .day-line{flex:1; height:1px; background:var(--line);}

  .ep-list{display:flex; flex-direction:column; gap:10px;}
  .ep-row{
    display:grid; grid-template-columns:52px 1fr auto auto; gap:14px; align-items:center;
    padding:12px 14px; background:var(--panel); border:1px solid var(--line); border-radius:12px;
  }
  .ep-thumb{width:52px; height:52px; border-radius:10px;}
  .ep-thumb.c1{background:linear-gradient(145deg, var(--holo-1), var(--panel-2));}
  .ep-thumb.c2{background:linear-gradient(145deg, var(--holo-2), var(--panel-2));}
  .ep-thumb.c3{background:linear-gradient(145deg, var(--holo-3), var(--panel-2));}
  .ep-thumb.c4{background:linear-gradient(145deg, var(--gold), var(--panel-2));}
  .ep-title{font-weight:700; font-size:13.5px;}
  .ep-sub{font-family:'JetBrains Mono',monospace; font-size:10.5px; color:var(--muted-2); margin-top:3px;}
  .ep-time{font-family:'JetBrains Mono',monospace; font-size:12.5px; color:var(--muted); text-align:right; white-space:nowrap;}
  .ep-countdown{
    font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; color:var(--holo-3);
    background:rgba(63,224,240,.1); border:1px solid rgba(63,224,240,.3); padding:5px 10px; border-radius:99px; white-space:nowrap;
  }
  .add-btn{width:30px; height:30px; border-radius:50%; border:1.5px solid var(--line); background:none; color:var(--muted); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:15px; font-weight:700;}
  .add-btn:hover{background:linear-gradient(90deg, var(--holo-1), var(--holo-2)); border-color:transparent; color:#fff;}

  @media(max-width:600px){
    .ep-row{grid-template-columns:40px 1fr auto; grid-template-areas:"thumb info time" "thumb info action";}
    .ep-sub{display:none;}
  }

  .empty-note{color:var(--muted-2); font-size:13px; font-style:italic; padding:10px 4px;}
</style>
</head>
<body>

<nav>
  <div class="nav-inner">
    <div class="logo"><div class="logo-mark"><svg width="100%" height="100%" viewBox="0 0 84 100" xmlns="http:
<defs>
<linearGradient id="hG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF4FD8"/><stop offset="35%" stop-color="#7B5CFF"/><stop offset="65%" stop-color="#3FE0F0"/><stop offset="100%" stop-color="#8be9ff"/></linearGradient>
<filter id="dS" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.6"/></filter>
<filter id="nG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<pattern id="hx" width="6" height="10.3923" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)"><path d="M3 0 L6 1.732 L6 5.196 L3 6.928 L0 5.196 L0 1.732 Z" fill="none" stroke="#7B5CFF" stroke-width="0.3" opacity="0.4"/><circle cx="3" cy="3.464" r="0.5" fill="#3FE0F0" opacity="0.3"/></pattern>
<clipPath id="cI"><rect x="6" y="8" width="50" height="72" rx="6"/></clipPath>
<style>
.sA{animation:oS 8s ease-in-out infinite;} .spS{animation:sS 40s linear infinite; transform-box:fill-box; transform-origin:center;} .spR{animation:sR 30s linear infinite; transform-box:fill-box; transform-origin:center;} .bA{animation:bL 7s ease-in-out infinite;} .tA{animation:tw 6s ease-in-out infinite;} .tAd{animation:tw 7s ease-in-out infinite 2s;}
@keyframes oS{0%,10%{transform:translateX(-100%) skewX(-15deg);opacity:0;}15%{opacity:.22;}25%,100%{transform:translateX(200%) skewX(-15deg);opacity:0;}}
@keyframes sS{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
@keyframes sR{0%{transform:rotate(360deg);}100%{transform:rotate(0deg);}}
@keyframes bL{0%,100%{opacity:.85;}50%{opacity:1;}}
@keyframes tw{0%,100%{opacity:.5;}50%{opacity:.85;}}
</style>
</defs>
<g transform="translate(11,4)">
<g opacity="0.55">
<rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#3FE0F0" stroke-width="0.8" stroke-opacity="0.5" transform="rotate(-12 28 50)"/>
<rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#FF4FD8" stroke-width="0.8" stroke-opacity="0.5" transform="rotate(12 28 50)"/>
</g>
<g filter="url(#dS)">
<rect x="6" y="8" width="50" height="72" rx="6" fill="url(#hG)"/>
<g clip-path="url(#cI)">
<rect x="8" y="10" width="46" height="68" rx="4" fill="#0A0714" opacity="0.97"/>
<rect x="8" y="10" width="46" height="68" fill="url(#hx)"/>
<rect x="-20" y="0" width="30" height="90" fill="url(#hG)" opacity="0" class="sA" style="mix-blend-mode:screen;"/>
<g stroke="url(#hG)" stroke-width="1.2" fill="none" opacity="0.9">
<path d="M12 24 v-6 a2 2 0 0 1 2-2 h6"/><path d="M50 64 v6 a2 2 0 0 1 -2 2 h-6"/>
</g>
<g transform="translate(31,44)">
<g class="spS"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#3FE0F0" stroke-width="0.6" transform="rotate(45)" opacity="0.6"/></g>
<g class="spR"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#FF4FD8" stroke-width="0.6" transform="rotate(-45)" opacity="0.6"/></g>
<circle cx="0" cy="0" r="14" fill="none" stroke="url(#hG)" stroke-width="1.2" stroke-dasharray="1 3" opacity="0.8" class="spS"/>
<circle cx="0" cy="0" r="12" fill="#05030A"/>
<circle cx="0" cy="0" r="6" fill="#3FE0F0" filter="url(#nG)" class="bA"/>
<g filter="url(#nG)">
<polygon points="0,-11 4,-4 0,-1 -4,-4" fill="#8be9ff"/><polygon points="4,-4 9,0 0,-1" fill="#3FE0F0"/><polygon points="9,0 4,5 0,-1" fill="#2fb8c9"/><polygon points="4,5 0,11 0,3" fill="#5a3fd6"/><polygon points="0,11 -4,5 0,3" fill="#7B5CFF"/><polygon points="-4,5 -9,0 0,-1" fill="#FF4FD8"/><polygon points="-9,0 -4,-4 0,-1" fill="#ff8de8"/>
<polygon points="0,-4 3,-1 0,3 -3,-1" fill="#ffffff" opacity="0.9"/>
</g>
</g>
</g>
<rect x="6" y="8" width="50" height="72" rx="6" fill="none" stroke="url(#hG)" stroke-width="1" opacity="0.9"/>
</g>
</g>
</svg></div><div class="logo-word">Ani<span class="holo-text">Deck</span></div></div>
    <div class="nav-links">
      <a href="dashboard-prototipo.html">Meu Deck</a>
      <a href="#" class="active">Calendário</a>
      <a href="rankings-prototipo.html">Rankings</a>
      <a href="#">Estatísticas</a>
    </div>
    <div style="display:flex; align-items:center; gap:12px;">
      <a href="busca-prototipo.html" class="search-icon-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </a>
      <div class="profile-chip"><div class="avatar"></div><span>joaojvm</span></div>
    </div>
  </div>
</nav>

<div class="container">
  <div class="page-head">
    <h1>Calendário de Lançamentos</h1>
    <p>Próximos episódios, organizados por dia — com contagem regressiva pra cada um.</p>
  </div>

  <div class="view-tabs">
    <div class="v-tab active">Meus Animes</div>
    <div class="v-tab">Todos em Exibição</div>
  </div>

  <div class="day-group">
    <div class="day-label"><h2>Hoje</h2><span class="badge-today">18 JUL</span><div class="day-line"></div></div>
    <div class="ep-list">
      <div class="ep-row">
        <div class="ep-thumb c1"></div>
        <div><div class="ep-title">Entrada 01</div><div class="ep-sub">EPISÓDIO 09</div></div>
        <span class="ep-countdown">⏱ 4H 12M</span>
        <span class="ep-time">23:00</span>
      </div>
    </div>
  </div>

  <div class="day-group">
    <div class="day-label"><h2>Amanhã</h2><span class="badge-today" style="background:rgba(255,197,66,.12); color:var(--gold); border-color:rgba(255,197,66,.3);">19 JUL</span><div class="day-line"></div></div>
    <div class="ep-list">
      <div class="ep-row">
        <div class="ep-thumb c2"></div>
        <div><div class="ep-title">Entrada 04</div><div class="ep-sub">EPISÓDIO 04</div></div>
        <span class="ep-countdown">⏱ 1D 06H</span>
        <span class="ep-time">17:30</span>
      </div>
    </div>
  </div>

  <div class="day-group">
    <div class="day-label"><h2>Quinta-feira</h2><span class="badge-today" style="background:var(--panel); color:var(--muted-2); border-color:var(--line);">23 JUL</span><div class="day-line"></div></div>
    <div class="ep-list">
      <div class="ep-row">
        <div class="ep-thumb c3"></div>
        <div><div class="ep-title">Entrada 07</div><div class="ep-sub">EPISÓDIO 15</div></div>
        <span class="ep-countdown">⏱ 5D 02H</span>
        <span class="ep-time">21:00</span>
      </div>
      <div class="ep-row">
        <div class="ep-thumb c4"></div>
        <div><div class="ep-title">Entrada 09</div><div class="ep-sub">EPISÓDIO 02</div></div>
        <span class="ep-countdown">⏱ 5D 09H</span>
        <span class="ep-time">04:00</span>
      </div>
    </div>
  </div>

  <div class="day-group">
    <div class="day-label"><h2>Sábado</h2><span class="badge-today" style="background:var(--panel); color:var(--muted-2); border-color:var(--line);">25 JUL</span><div class="day-line"></div></div>
    <p class="empty-note">Nenhum episódio dos seus animes previsto nesse dia.</p>
  </div>
</div>

<script>
document.querySelectorAll('.v-tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.v-tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
}));
</script>

</body>
</html>

```

## prototipos/config-ajuda-prototipo.html

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AniDeck — Configurações & Ajuda</title>
<link rel="preconnect" href="https:
<link href="https:
<style>
  :root{
    --void:#0A0714; --panel:#130F22; --panel-2:#181330; --line:#2B2247;
    --text:#F1EEFA; --muted:#A79BC9; --muted-2:#6B5F94;
    --holo-1:#FF4FD8; --holo-2:#7B5CFF; --holo-3:#3FE0F0; --coral:#FF5C6C;
  }
  *{box-sizing:border-box;}
  body{margin:0; background:var(--void); color:var(--text); font-family:'Manrope',sans-serif; -webkit-font-smoothing:antialiased;}
  a{color:inherit; text-decoration:none;} button{font-family:inherit;}
  .display{font-family:'Anton',sans-serif; font-weight:400;}
  .container{max-width:760px; margin:0 auto; padding:0 20px;}
  .holo-text{background:linear-gradient(90deg, var(--holo-1), var(--holo-2) 45%, var(--holo-3)); -webkit-background-clip:text; background-clip:text; color:transparent;}
  ::-webkit-scrollbar{height:6px;} ::-webkit-scrollbar-thumb{background:var(--line); border-radius:99px;}

  nav{position:sticky; top:0; z-index:50; background:rgba(10,7,20,.9); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); padding:14px 0;}
  .nav-inner{display:flex; align-items:center; gap:14px; max-width:760px; margin:0 auto; padding:0 20px;}
  .back-btn{width:34px; height:34px; border-radius:50%; border:1px solid var(--line); background:var(--panel); display:flex; align-items:center; justify-content:center;}
  .logo-word{font-family:'Anton',sans-serif; font-size:15px;}

  .page-head{padding:32px 0 20px;}
  .page-head h1{font-family:'Anton',sans-serif; font-weight:400; text-transform:uppercase; font-size:clamp(1.5rem,3.4vw,2rem); margin:0;}

  .tabs-nav{position:sticky; top:63px; z-index:45; background:var(--void); border-bottom:1px solid var(--line); overflow-x:auto; white-space:nowrap; padding:14px 0; margin-bottom:10px;}
  .tabs-nav .container{display:flex; gap:10px;}
  .tab-link{font-size:13px; font-weight:700; color:var(--muted); padding:8px 14px; border-radius:99px; border:1px solid var(--line); flex-shrink:0;}
  .tab-link:hover{color:var(--text); border-color:var(--holo-3);}

  .section{padding:30px 0; border-bottom:1px solid var(--line);}
  .sec-title{font-family:'Anton',sans-serif; font-weight:400; text-transform:uppercase; font-size:16px; margin:0 0 20px;}

  .row-card{background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:20px; margin-bottom:14px;}

  .field{margin-bottom:16px;}
  .field:last-child{margin-bottom:0;}
  .field label{display:block; font-size:12.5px; font-weight:700; color:var(--muted); margin-bottom:7px;}
  .field input{width:100%; background:var(--panel-2); border:1px solid var(--line); border-radius:10px; padding:11px 14px; color:var(--text); font-size:14px; font-family:'Manrope',sans-serif;}
  .field input:focus{outline:none; border-color:var(--holo-3);}
  .avatar-row{display:flex; align-items:center; gap:16px; margin-bottom:20px;}
  .avatar-big{width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, var(--holo-1), var(--holo-2), var(--holo-3));}
  .btn-ghost-sm{font-size:12.5px; font-weight:700; padding:8px 14px; border-radius:99px; border:1px solid var(--line); color:var(--text); background:none; cursor:pointer;}
  .btn-primary{padding:11px 22px; border-radius:99px; border:none; font-weight:800; font-size:13.5px; color:var(--void); background:linear-gradient(90deg, var(--holo-1), var(--holo-2), var(--holo-3)); cursor:pointer;}

  .toggle-row{display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid var(--line);}
  .toggle-row:last-child{border-bottom:none;}
  .toggle-row .t{font-weight:700; font-size:13.5px;}
  .toggle-row .d{font-size:12px; color:var(--muted-2); margin-top:2px;}
  .switch{position:relative; width:42px; height:24px; border-radius:99px; background:var(--panel-2); border:1px solid var(--line); cursor:pointer; flex-shrink:0;}
  .switch.on{background:linear-gradient(90deg, var(--holo-1), var(--holo-2)); border-color:transparent;}
  .switch::after{content:''; position:absolute; top:2px; left:2px; width:18px; height:18px; border-radius:50%; background:#fff; transition:transform .2s;}
  .switch.on::after{transform:translateX(18px);}

  .conn-row{display:flex; align-items:center; justify-content:space-between; padding:14px 0;}
  .conn-row .l{display:flex; align-items:center; gap:10px; font-weight:700; font-size:13.5px;}
  .badge-connected{font-family:'JetBrains Mono',monospace; font-size:10px; color:#a0ff78; background:rgba(160,255,120,.1); border:1px solid rgba(160,255,120,.3); padding:3px 8px; border-radius:99px;}

  .danger-zone{border:1px solid rgba(255,92,108,.35); background:rgba(255,92,108,.06); border-radius:14px; padding:20px;}
  .danger-zone h3{font-size:14px; color:var(--coral); margin:0 0 6px;}
  .danger-zone p{font-size:13px; color:var(--muted); margin:0 0 14px;}
  .btn-danger{padding:10px 18px; border-radius:99px; border:1px solid var(--coral); color:var(--coral); background:none; font-weight:700; font-size:13px; cursor:pointer;}
  .btn-danger:hover{background:var(--coral); color:#1a0508;}

  .faq-item{border-bottom:1px solid var(--line);}
  .faq-q{display:flex; justify-content:space-between; align-items:center; padding:16px 4px; cursor:pointer; font-weight:700; font-size:13.5px;}
  .faq-a{max-height:0; overflow:hidden; transition:max-height .25s ease;}
  .faq-a p{color:var(--muted); font-size:13px; line-height:1.6; padding:0 4px 16px;}
  .faq-item.open .faq-a{max-height:200px;}
  .faq-item.open .chevron{transform:rotate(180deg);}
  .chevron{transition:transform .2s;}

  .support-row{display:flex; align-items:center; gap:12px; background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:18px; margin-top:20px;}
  .support-row .ico{width:38px; height:38px; border-radius:10px; background:rgba(63,224,240,.1); color:var(--holo-3); display:flex; align-items:center; justify-content:center; flex-shrink:0;}
  .version-note{text-align:center; color:var(--muted-2); font-size:11.5px; font-family:'JetBrains Mono',monospace; padding:24px 0;}
</style>
</head>
<body>

<nav>
  <div class="nav-inner">
    <a href="dashboard-prototipo.html" class="back-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
    </a>
    <div class="logo-mark" style="width:34px;height:34px;border-radius:10px;overflow:hidden;"><svg width="100%" height="100%" viewBox="0 0 84 100" xmlns="http:
<defs>
<linearGradient id="hG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF4FD8"/><stop offset="35%" stop-color="#7B5CFF"/><stop offset="65%" stop-color="#3FE0F0"/><stop offset="100%" stop-color="#8be9ff"/></linearGradient>
<filter id="dS" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.6"/></filter>
<filter id="nG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<pattern id="hx" width="6" height="10.3923" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)"><path d="M3 0 L6 1.732 L6 5.196 L3 6.928 L0 5.196 L0 1.732 Z" fill="none" stroke="#7B5CFF" stroke-width="0.3" opacity="0.4"/><circle cx="3" cy="3.464" r="0.5" fill="#3FE0F0" opacity="0.3"/></pattern>
<clipPath id="cI"><rect x="6" y="8" width="50" height="72" rx="6"/></clipPath>
<style>
.sA{animation:oS 8s ease-in-out infinite;} .spS{animation:sS 40s linear infinite; transform-box:fill-box; transform-origin:center;} .spR{animation:sR 30s linear infinite; transform-box:fill-box; transform-origin:center;} .bA{animation:bL 7s ease-in-out infinite;} .tA{animation:tw 6s ease-in-out infinite;} .tAd{animation:tw 7s ease-in-out infinite 2s;}
@keyframes oS{0%,10%{transform:translateX(-100%) skewX(-15deg);opacity:0;}15%{opacity:.22;}25%,100%{transform:translateX(200%) skewX(-15deg);opacity:0;}}
@keyframes sS{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
@keyframes sR{0%{transform:rotate(360deg);}100%{transform:rotate(0deg);}}
@keyframes bL{0%,100%{opacity:.85;}50%{opacity:1;}}
@keyframes tw{0%,100%{opacity:.5;}50%{opacity:.85;}}
</style>
</defs>
<g transform="translate(11,4)">
<g opacity="0.55">
<rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#3FE0F0" stroke-width="0.8" stroke-opacity="0.5" transform="rotate(-12 28 50)"/>
<rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#FF4FD8" stroke-width="0.8" stroke-opacity="0.5" transform="rotate(12 28 50)"/>
</g>
<g filter="url(#dS)">
<rect x="6" y="8" width="50" height="72" rx="6" fill="url(#hG)"/>
<g clip-path="url(#cI)">
<rect x="8" y="10" width="46" height="68" rx="4" fill="#0A0714" opacity="0.97"/>
<rect x="8" y="10" width="46" height="68" fill="url(#hx)"/>
<rect x="-20" y="0" width="30" height="90" fill="url(#hG)" opacity="0" class="sA" style="mix-blend-mode:screen;"/>
<g stroke="url(#hG)" stroke-width="1.2" fill="none" opacity="0.9">
<path d="M12 24 v-6 a2 2 0 0 1 2-2 h6"/><path d="M50 64 v6 a2 2 0 0 1 -2 2 h-6"/>
</g>
<g transform="translate(31,44)">
<g class="spS"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#3FE0F0" stroke-width="0.6" transform="rotate(45)" opacity="0.6"/></g>
<g class="spR"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#FF4FD8" stroke-width="0.6" transform="rotate(-45)" opacity="0.6"/></g>
<circle cx="0" cy="0" r="14" fill="none" stroke="url(#hG)" stroke-width="1.2" stroke-dasharray="1 3" opacity="0.8" class="spS"/>
<circle cx="0" cy="0" r="12" fill="#05030A"/>
<circle cx="0" cy="0" r="6" fill="#3FE0F0" filter="url(#nG)" class="bA"/>
<g filter="url(#nG)">
<polygon points="0,-11 4,-4 0,-1 -4,-4" fill="#8be9ff"/><polygon points="4,-4 9,0 0,-1" fill="#3FE0F0"/><polygon points="9,0 4,5 0,-1" fill="#2fb8c9"/><polygon points="4,5 0,11 0,3" fill="#5a3fd6"/><polygon points="0,11 -4,5 0,3" fill="#7B5CFF"/><polygon points="-4,5 -9,0 0,-1" fill="#FF4FD8"/><polygon points="-9,0 -4,-4 0,-1" fill="#ff8de8"/>
<polygon points="0,-4 3,-1 0,3 -3,-1" fill="#ffffff" opacity="0.9"/>
</g>
</g>
</g>
<rect x="6" y="8" width="50" height="72" rx="6" fill="none" stroke="url(#hG)" stroke-width="1" opacity="0.9"/>
</g>
</g>
</svg></div>
    <div class="logo-word">Ani<span class="holo-text">Deck</span></div>
  </div>
</nav>

<div class="container page-head">
  <h1>Configurações & Ajuda</h1>
</div>

<div class="tabs-nav">
  <div class="container">
    <a href="#perfil" class="tab-link">Perfil</a>
    <a href="#notificacoes" class="tab-link">Notificações</a>
    <a href="#conta" class="tab-link">Conta</a>
    <a href="#ajuda" class="tab-link">Ajuda</a>
  </div>
</div>

<div class="container">

  <!-- PERFIL -->
  <section class="section" id="perfil">
    <h2 class="sec-title">Perfil</h2>
    <div class="row-card">
      <div class="avatar-row">
        <div class="avatar-big"></div>
        <button class="btn-ghost-sm">Trocar foto</button>
      </div>
      <div class="field"><label>Nome de exibição</label><input type="text" value="joaojvm"></div>
      <div class="field"><label>E-mail</label><input type="email" value="joaodev21@gmail.com"></div>
      <div style="margin-top:18px;"><button class="btn-primary">Salvar alterações</button></div>
    </div>
  </section>

  <!-- NOTIFICAÇÕES -->
  <section class="section" id="notificacoes">
    <h2 class="sec-title">Notificações</h2>
    <div class="row-card">
      <div class="toggle-row">
        <div><div class="t">Nova temporada anunciada</div><div class="d">Avisar quando uma sequência/temporada nova sair pra algo no seu Deck</div></div>
        <div class="switch on"></div>
      </div>
      <div class="toggle-row">
        <div><div class="t">Lembrete de próximo episódio</div><div class="d">Avisar próximo do horário de lançamento</div></div>
        <div class="switch on"></div>
      </div>
      <div class="toggle-row">
        <div><div class="t">Resumo semanal por e-mail</div><div class="d">Um resumo do que rolou no seu Deck, toda semana</div></div>
        <div class="switch"></div>
      </div>
    </div>
  </section>

  <!-- CONTA -->
  <section class="section" id="conta">
    <h2 class="sec-title">Conta</h2>
    <div class="row-card">
      <div class="conn-row">
        <div class="l">
          <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3h3.87c2.27-2.09 3.56-5.17 3.56-8.74z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.1C3.26 21.3 7.3 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.5-.38-2.29s.14-1.57.38-2.29V6.61H1.28A11.98 11.98 0 000 12c0 1.93.46 3.76 1.28 5.39l4-3.1z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.28 6.61l4 3.1c.95-2.86 3.6-4.96 6.73-4.96z"/></svg>
          Conta Google
        </div>
        <span class="badge-connected">CONECTADA</span>
      </div>
      <div class="field" style="margin-top:16px;"><label>Nova senha</label><input type="password" placeholder="Deixe em branco pra não alterar"></div>
      <div style="margin-top:14px;"><button class="btn-primary">Atualizar senha</button></div>
    </div>

    <div class="danger-zone">
      <h3>Excluir conta</h3>
      <p>Remove permanentemente sua conta e todos os dados do seu Deck. Não pode ser desfeito.</p>
      <button class="btn-danger">Excluir minha conta</button>
    </div>
  </section>

  <!-- AJUDA -->
  <section class="section" id="ajuda" style="border-bottom:none;">
    <h2 class="sec-title">Ajuda</h2>

    <div class="faq-item open">
      <div class="faq-q">O AniDeck sincroniza com minha conta do MyAnimeList? <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg></div>
      <div class="faq-a"><p>Não. O catálogo vem do MyAnimeList, mas sua lista, notas e status são só seus, salvos aqui, sem ligação com sua conta de lá.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-q">Preciso de conta pra buscar animes? <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg></div>
      <div class="faq-a"><p>Não, buscar e ver detalhes é livre. Só criar conta é necessário pra salvar algo no seu Deck.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-q">O que significa o status "Em Dia"? <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg></div>
      <div class="faq-a"><p>Significa que você já assistiu todos os episódios lançados até agora de um anime que ainda está no ar — diferente de "Completo", reservado pra quando o anime terminar de vez.</p></div>
    </div>

    <div class="support-row">
      <div class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
      <div>
        <div style="font-weight:700; font-size:13.5px;">Precisa de mais alguma coisa?</div>
        <a href="mailto:suporte@anideck.app" style="font-size:12.5px; color:var(--holo-3);">Fale com o suporte</a>
      </div>
    </div>

    <p class="version-note">AniDeck v0.1.0 (MVP)</p>
  </section>

</div>

<script>
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => q.parentElement.classList.toggle('open'));
});
document.querySelectorAll('.switch').forEach(s => {
  s.addEventListener('click', () => s.classList.toggle('on'));
});
</script>

</body>
</html>

```

## prototipos/dashboard-prototipo.html

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AniDeck — Meu Deck</title>
<link rel="preconnect" href="https:
<link rel="preconnect" href="https:
<link href="https:
<style>
  :root{
    --void:#0A0714; --panel:#130F22; --panel-2:#181330; --line:#2B2247;
    --text:#F1EEFA; --muted:#A79BC9; --muted-2:#6B5F94;
    --holo-1:#FF4FD8; --holo-2:#7B5CFF; --holo-3:#3FE0F0; --coral:#FF5C6C; --gold:#FFC542;
    --radius:18px;
  }
  *{box-sizing:border-box;}
  body{margin:0; background:var(--void); color:var(--text); font-family:'Manrope',sans-serif; -webkit-font-smoothing:antialiased;}
  a{color:inherit; text-decoration:none;}
  .mono{font-family:'JetBrains Mono',monospace;}
  .display{font-family:'Anton',sans-serif; font-weight:400;}
  .container{max-width:1180px; margin:0 auto; padding:0 20px;}
  :focus-visible{outline:2px solid var(--holo-3); outline-offset:3px;}
  .holo-text{background:linear-gradient(90deg, var(--holo-1), var(--holo-2) 45%, var(--holo-3)); -webkit-background-clip:text; background-clip:text; color:transparent;}

  .bg-ambient{
    position:fixed; inset:0; z-index:0; pointer-events:none;
    background:
      radial-gradient(480px 380px at 12% 8%, rgba(255,79,216,.10), transparent 60%),
      radial-gradient(520px 420px at 90% 10%, rgba(63,224,240,.09), transparent 60%);
  }

  
  nav{position:sticky; top:0; z-index:50; background:rgba(10,7,20,.9); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); padding:14px 0;}
  .nav-inner{display:flex; align-items:center; justify-content:space-between; gap:16px;}
  .logo{display:flex; align-items:center; gap:10px;}
  .logo-mark{width:32px; height:32px; border-radius:9px; background:linear-gradient(135deg, var(--holo-1), var(--holo-2), var(--holo-3)); display:flex; align-items:center; justify-content:center; font-family:'Anton',sans-serif; font-size:14px; color:#0A0714;}
  .logo-word{font-family:'Anton',sans-serif; font-size:16px;}
  .nav-links{display:flex; align-items:center; gap:26px;}
  .nav-links a{font-size:13.5px; font-weight:600; color:var(--muted);}
  .nav-links a.active{color:var(--text);}
  .nav-links a:hover{color:var(--text);}
  .search-icon-btn{
    width:34px; height:34px; border-radius:50%; border:1px solid var(--line); background:var(--panel);
    color:var(--muted); display:flex; align-items:center; justify-content:center; transition:all .2s; cursor:pointer;
  }
  .search-icon-btn:hover{border-color:var(--holo-3); color:var(--holo-3);}
  .profile-chip{display:flex; align-items:center; gap:9px; padding:6px 12px 6px 6px; border-radius:99px; background:var(--panel); border:1px solid var(--line);}
  .avatar{width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg, var(--holo-2), var(--holo-3));}
  .profile-chip span{font-size:13px; font-weight:700;}
  @media(max-width:820px){ .nav-links{display:none;} }

  
  .page-head{padding:38px 0 26px; position:relative; z-index:1;}
  .page-head-row{display:flex; justify-content:space-between; align-items:flex-end; gap:20px; flex-wrap:wrap;}
  .page-head h1{font-family:'Anton',sans-serif; font-weight:400; text-transform:uppercase; font-size:clamp(1.6rem,3.6vw,2.2rem); margin:0;}
  .page-head p{color:var(--muted); font-size:14px; margin:6px 0 0;}
  .btn-add{
    font-weight:800; font-size:13.5px; padding:12px 22px; border-radius:99px; color:var(--void);
    background:linear-gradient(90deg, var(--holo-1), var(--holo-2), var(--holo-3));
    display:inline-flex; align-items:center; gap:8px; white-space:nowrap; transition:transform .2s ease;
  }
  .btn-add:hover{transform:translateY(-2px);}

  
  .qstats{display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin:26px 0 40px;}
  @media(max-width:760px){ .qstats{grid-template-columns:repeat(2,1fr);} }
  .qstat{
    background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px 18px;
    border-top:3px solid var(--qcolor); position:relative;
  }
  .qstat .qicon{width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; margin-bottom:10px; background:color-mix(in srgb, var(--qcolor) 18%, transparent); color:var(--qcolor);}
  .qstat b{display:block; font-family:'Anton',sans-serif; font-size:24px;}
  .qstat span{font-size:11.5px; color:var(--muted-2); font-weight:600; text-transform:uppercase;}
  .qstat.watching{--qcolor:var(--holo-3);}
  .qstat.today{--qcolor:#a0ff78;}
  .qstat.done{--qcolor:var(--gold);}
  .qstat.score{--qcolor:var(--holo-1);}

  
  .tabs{display:flex; gap:8px; flex-wrap:wrap; margin-bottom:28px;}
  .tab{
    font-size:13px; font-weight:700; padding:9px 16px; border-radius:99px; border:1px solid var(--line);
    color:var(--muted); background:var(--panel); cursor:pointer; transition:all .2s;
  }
  .tab.active{background:linear-gradient(90deg, var(--holo-1), var(--holo-2)); color:var(--void); border-color:transparent;}
  .tab:hover:not(.active){border-color:var(--holo-3); color:var(--text);}

  
  .section{padding:34px 0; position:relative; z-index:1;}
  .sec-title{display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;}
  .sec-title h2{font-family:'Anton',sans-serif; font-weight:400; text-transform:uppercase; font-size:17px; margin:0;}
  .sec-title a{font-size:12.5px; color:var(--holo-3); font-weight:700;}

  .cal-row{display:flex; gap:14px; overflow-x:auto; padding-bottom:6px; -webkit-overflow-scrolling:touch;}
  .cal-card{
    flex:0 0 auto; width:200px; background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px;
    display:flex; gap:12px; align-items:center;
  }
  .cal-thumb{width:46px; height:46px; border-radius:9px; flex-shrink:0; background:linear-gradient(145deg, var(--holo-1), var(--panel-2));}
  .cal-title{font-weight:700; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px;}
  .cal-ep{font-family:'JetBrains Mono',monospace; font-size:10.5px; color:var(--muted-2); margin:2px 0 6px;}
  .cal-countdown{font-family:'JetBrains Mono',monospace; font-size:10.5px; font-weight:700; color:var(--holo-3);}

  
  .deck-grid{display:grid; grid-template-columns:repeat(5,1fr); gap:16px;}
  @media(max-width:980px){ .deck-grid{grid-template-columns:repeat(4,1fr);} }
  @media(max-width:760px){ .deck-grid{grid-template-columns:repeat(3,1fr); gap:10px;} }
  @media(max-width:480px){ .deck-grid{grid-template-columns:repeat(2,1fr);} }
  .deck-card{
    aspect-ratio:3/4.2; border-radius:14px; position:relative; overflow:hidden; padding:12px;
    display:flex; flex-direction:column; justify-content:flex-end; border:1px solid var(--line); cursor:pointer;
    transition:transform .2s ease;
  }
  .deck-card:hover{transform:translateY(-3px);}
  .deck-card.g1{background:linear-gradient(155deg, #3a1a4a, #120b22 75%);}
  .deck-card.g2{background:linear-gradient(155deg, #1a3d4a, #120b22 75%);}
  .deck-card.g3{background:linear-gradient(155deg, #4a1a2f, #120b22 75%);}
  .deck-card.g4{background:linear-gradient(155deg, #1a2f4a, #120b22 75%);}
  .deck-card.g5{background:linear-gradient(155deg, #2f4a1a, #120b22 75%);}
  .status-chip{position:absolute; top:8px; left:8px; font-size:9px; font-weight:800; padding:3px 7px; border-radius:99px; text-transform:uppercase;}
  .status-chip.watching{background:rgba(63,224,240,.18); color:var(--holo-3); border:1px solid rgba(63,224,240,.4);}
  .status-chip.done{background:rgba(255,197,66,.18); color:var(--gold); border:1px solid rgba(255,197,66,.4);}
  .status-chip.plan{background:rgba(255,79,216,.18); color:var(--holo-1); border:1px solid rgba(255,79,216,.4);}
  .status-chip.today{background:rgba(160,255,120,.18); color:#a0ff78; border:1px solid rgba(160,255,120,.4);}
  .deck-card .vt{font-family:'Anton',sans-serif; font-size:12px; text-transform:uppercase; line-height:1.15;}
  .deck-card .vs{font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--muted-2); margin-top:4px;}

  ::-webkit-scrollbar{height:6px;}
  ::-webkit-scrollbar-thumb{background:var(--line); border-radius:99px;}

  footer{border-top:1px solid var(--line); margin-top:50px; padding:26px 0; position:relative; z-index:1;}
  .foot-row{display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; font-size:12.5px; color:var(--muted-2);}
  .foot-row .fl{display:flex; gap:20px;}
  .foot-row a:hover{color:var(--text);}
</style>
</head>
<body>

<div class="bg-ambient"></div>

<nav>
  <div class="container nav-inner">
    <div class="logo">
      <div class="logo-mark"><svg width="100%" height="100%" viewBox="0 0 84 100" xmlns="http:
<defs>
<linearGradient id="hG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF4FD8"/><stop offset="35%" stop-color="#7B5CFF"/><stop offset="65%" stop-color="#3FE0F0"/><stop offset="100%" stop-color="#8be9ff"/></linearGradient>
<filter id="dS" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.6"/></filter>
<filter id="nG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<pattern id="hx" width="6" height="10.3923" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)"><path d="M3 0 L6 1.732 L6 5.196 L3 6.928 L0 5.196 L0 1.732 Z" fill="none" stroke="#7B5CFF" stroke-width="0.3" opacity="0.4"/><circle cx="3" cy="3.464" r="0.5" fill="#3FE0F0" opacity="0.3"/></pattern>
<clipPath id="cI"><rect x="6" y="8" width="50" height="72" rx="6"/></clipPath>
<style>
.sA{animation:oS 8s ease-in-out infinite;} .spS{animation:sS 40s linear infinite; transform-box:fill-box; transform-origin:center;} .spR{animation:sR 30s linear infinite; transform-box:fill-box; transform-origin:center;} .bA{animation:bL 7s ease-in-out infinite;} .tA{animation:tw 6s ease-in-out infinite;} .tAd{animation:tw 7s ease-in-out infinite 2s;}
@keyframes oS{0%,10%{transform:translateX(-100%) skewX(-15deg);opacity:0;}15%{opacity:.22;}25%,100%{transform:translateX(200%) skewX(-15deg);opacity:0;}}
@keyframes sS{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
@keyframes sR{0%{transform:rotate(360deg);}100%{transform:rotate(0deg);}}
@keyframes bL{0%,100%{opacity:.85;}50%{opacity:1;}}
@keyframes tw{0%,100%{opacity:.5;}50%{opacity:.85;}}
</style>
</defs>
<g transform="translate(11,4)">
<g opacity="0.55">
<rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#3FE0F0" stroke-width="0.8" stroke-opacity="0.5" transform="rotate(-12 28 50)"/>
<rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#FF4FD8" stroke-width="0.8" stroke-opacity="0.5" transform="rotate(12 28 50)"/>
</g>
<g filter="url(#dS)">
<rect x="6" y="8" width="50" height="72" rx="6" fill="url(#hG)"/>
<g clip-path="url(#cI)">
<rect x="8" y="10" width="46" height="68" rx="4" fill="#0A0714" opacity="0.97"/>
<rect x="8" y="10" width="46" height="68" fill="url(#hx)"/>
<rect x="-20" y="0" width="30" height="90" fill="url(#hG)" opacity="0" class="sA" style="mix-blend-mode:screen;"/>
<g stroke="url(#hG)" stroke-width="1.2" fill="none" opacity="0.9">
<path d="M12 24 v-6 a2 2 0 0 1 2-2 h6"/><path d="M50 64 v6 a2 2 0 0 1 -2 2 h-6"/>
</g>
<g transform="translate(31,44)">
<g class="spS"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#3FE0F0" stroke-width="0.6" transform="rotate(45)" opacity="0.6"/></g>
<g class="spR"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#FF4FD8" stroke-width="0.6" transform="rotate(-45)" opacity="0.6"/></g>
<circle cx="0" cy="0" r="14" fill="none" stroke="url(#hG)" stroke-width="1.2" stroke-dasharray="1 3" opacity="0.8" class="spS"/>
<circle cx="0" cy="0" r="12" fill="#05030A"/>
<circle cx="0" cy="0" r="6" fill="#3FE0F0" filter="url(#nG)" class="bA"/>
<g filter="url(#nG)">
<polygon points="0,-11 4,-4 0,-1 -4,-4" fill="#8be9ff"/><polygon points="4,-4 9,0 0,-1" fill="#3FE0F0"/><polygon points="9,0 4,5 0,-1" fill="#2fb8c9"/><polygon points="4,5 0,11 0,3" fill="#5a3fd6"/><polygon points="0,11 -4,5 0,3" fill="#7B5CFF"/><polygon points="-4,5 -9,0 0,-1" fill="#FF4FD8"/><polygon points="-9,0 -4,-4 0,-1" fill="#ff8de8"/>
<polygon points="0,-4 3,-1 0,3 -3,-1" fill="#ffffff" opacity="0.9"/>
</g>
</g>
</g>
<rect x="6" y="8" width="50" height="72" rx="6" fill="none" stroke="url(#hG)" stroke-width="1" opacity="0.9"/>
</g>
</g>
</svg></div>
      <div class="logo-word">Ani<span class="holo-text">Deck</span></div>
    </div>
    <div class="nav-links">
      <a href="#" class="active">Meu Deck</a>
      <a href="#">Calendário</a>
      <a href="#">Rankings</a>
      <a href="#">Estatísticas</a>
    </div>
    <div style="display:flex; align-items:center; gap:14px;">
      <a href="busca-prototipo.html" class="search-icon-btn" aria-label="Buscar anime" title="Buscar">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </a>
      <div class="profile-chip">
        <div class="avatar"></div>
        <span>joaojvm</span>
      </div>
    </div>
  </div>
</nav>

<div class="container">

  <div class="page-head">
    <div class="page-head-row">
      <div>
        <h1>Bem-vindo de volta, <span class="holo-text">joaojvm</span></h1>
        <p>Aqui está o que está rolando na sua coleção.</p>
      </div>
      <a href="busca-prototipo.html" class="btn-add">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Buscar Anime
      </a>
    </div>

    <div class="qstats">
      <div class="qstat watching">
        <div class="qicon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
        <b>4</b><span>Assistindo</span>
      </div>
      <div class="qstat today">
        <div class="qicon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg></div>
        <b>2</b><span>Em Dia</span>
      </div>
      <div class="qstat done">
        <div class="qicon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.6-6.3 4.6 2.3-7.2-6-4.6h7.6z"/></svg></div>
        <b>38</b><span>Completos</span>
      </div>
      <div class="qstat score">
        <div class="qicon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 20V10M18 20V4M6 20v-6"/></svg></div>
        <b>9.1</b><span>Sua Nota Média</span>
      </div>
    </div>
  </div>

  <!-- CALENDÁRIO PESSOAL -->
  <section class="section">
    <div class="sec-title">
      <h2>Seus Próximos Episódios</h2>
      <a href="#">Ver calendário completo →</a>
    </div>
    <div class="cal-row">
      <div class="cal-card">
        <div class="cal-thumb"></div>
        <div>
          <div class="cal-title">Entrada 01</div>
          <div class="cal-ep">EP 09</div>
          <div class="cal-countdown">⏱ 2D 06H</div>
        </div>
      </div>
      <div class="cal-card">
        <div class="cal-thumb"></div>
        <div>
          <div class="cal-title">Entrada 04</div>
          <div class="cal-ep">EP 04</div>
          <div class="cal-countdown">⏱ 5D 12H</div>
        </div>
      </div>
      <div class="cal-card">
        <div class="cal-thumb"></div>
        <div>
          <div class="cal-title">Entrada 07</div>
          <div class="cal-ep">EP 15</div>
          <div class="cal-countdown">⏱ 6D 20H</div>
        </div>
      </div>
    </div>
  </section>

  <!-- MEU DECK -->
  <section class="section">
    <div class="sec-title">
      <h2>Meu Deck</h2>
    </div>

    <div class="tabs">
      <div class="tab active">Todos</div>
      <div class="tab">Assistindo</div>
      <div class="tab">Em Dia</div>
      <div class="tab">Completo</div>
      <div class="tab">Quero Assistir</div>
      <div class="tab">Dropado</div>
    </div>

    <div class="deck-grid">
      <div class="deck-card g1"><span class="status-chip watching">Assistindo</span><div class="vt">Entrada 01</div><div class="vs">EP 8/24</div></div>
      <div class="deck-card g2"><span class="status-chip today">Em Dia</span><div class="vt">Entrada 02</div><div class="vs">EP 4/4</div></div>
      <div class="deck-card g3"><span class="status-chip done">Completo</span><div class="vt">Entrada 03</div><div class="vs">NOTA 9.5</div></div>
      <div class="deck-card g4"><span class="status-chip plan">Quero Assistir</span><div class="vt">Entrada 04</div><div class="vs">SALVO</div></div>
      <div class="deck-card g5"><span class="status-chip watching">Assistindo</span><div class="vt">Entrada 05</div><div class="vs">EP 3/12</div></div>
      <div class="deck-card g1"><span class="status-chip done">Completo</span><div class="vt">Entrada 06</div><div class="vs">NOTA 8.7</div></div>
      <div class="deck-card g2"><span class="status-chip today">Em Dia</span><div class="vt">Entrada 07</div><div class="vs">EP 15/?</div></div>
      <div class="deck-card g3"><span class="status-chip done">Completo</span><div class="vt">Entrada 08</div><div class="vs">NOTA 9.0</div></div>
      <div class="deck-card g4"><span class="status-chip watching">Assistindo</span><div class="vt">Entrada 09</div><div class="vs">EP 1/12</div></div>
      <div class="deck-card g5"><span class="status-chip plan">Quero Assistir</span><div class="vt">Entrada 10</div><div class="vs">SALVO</div></div>
    </div>
  </section>

</div>

<footer>
  <div class="container foot-row">
    <p>© 2026 AniDeck</p>
    <div class="fl">
      <a href="#">Ajuda</a>
      <a href="#">Configurações</a>
      <a href="#">Sair</a>
    </div>
  </div>
</footer>

</body>
</html>

```

## prototipos/detalhe-anime-prototipo.html

```html
[File content not included]
```

## prototipos/estatisticas-prototipo.html

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AniDeck — Estatísticas</title>
<link rel="preconnect" href="https:
<link href="https:
<style>
  :root{
    --void:#0A0714; --panel:#130F22; --panel-2:#181330; --line:#2B2247;
    --text:#F1EEFA; --muted:#A79BC9; --muted-2:#6B5F94;
    --holo-1:#FF4FD8; --holo-2:#7B5CFF; --holo-3:#3FE0F0; --gold:#FFC542; --green:#a0ff78;
  }
  *{box-sizing:border-box;}
  body{margin:0; background:var(--void); color:var(--text); font-family:'Manrope',sans-serif; -webkit-font-smoothing:antialiased;}
  a{color:inherit; text-decoration:none;}
  .display{font-family:'Anton',sans-serif; font-weight:400;}
  .mono{font-family:'JetBrains Mono',monospace;}
  .container{max-width:980px; margin:0 auto; padding:0 20px;}
  .holo-text{background:linear-gradient(90deg, var(--holo-1), var(--holo-2) 45%, var(--holo-3)); -webkit-background-clip:text; background-clip:text; color:transparent;}
  ::-webkit-scrollbar{height:6px;} ::-webkit-scrollbar-thumb{background:var(--line); border-radius:99px;}

  nav{position:sticky; top:0; z-index:50; background:rgba(10,7,20,.9); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); padding:14px 0;}
  .nav-inner{display:flex; align-items:center; justify-content:space-between; gap:16px; max-width:980px; margin:0 auto; padding:0 20px;}
  .logo{display:flex; align-items:center; gap:10px;}
  .logo-mark{width:32px; height:32px; border-radius:9px; background:linear-gradient(135deg, var(--holo-1), var(--holo-2), var(--holo-3)); display:flex; align-items:center; justify-content:center; font-family:'Anton',sans-serif; font-size:14px; color:#0A0714;}
  .logo-word{font-family:'Anton',sans-serif; font-size:16px;}
  .nav-links{display:flex; align-items:center; gap:24px;}
  .nav-links a{font-size:13.5px; font-weight:600; color:var(--muted);}
  .nav-links a.active{color:var(--text);}
  .search-icon-btn{width:32px; height:32px; border-radius:50%; border:1px solid var(--line); background:var(--panel); color:var(--muted); display:flex; align-items:center; justify-content:center;}
  .profile-chip{display:flex; align-items:center; gap:9px; padding:6px 12px 6px 6px; border-radius:99px; background:var(--panel); border:1px solid var(--line);}
  .avatar{width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg, var(--holo-2), var(--holo-3));}
  .profile-chip span{font-size:12.5px; font-weight:700;}
  @media(max-width:760px){ .nav-links{display:none;} }

  .page-head{padding:36px 0 22px;}
  .page-head h1{font-family:'Anton',sans-serif; font-weight:400; text-transform:uppercase; font-size:clamp(1.6rem,3.6vw,2.2rem); margin:0 0 6px;}
  .page-head p{color:var(--muted); font-size:14px; margin:0;}

  .hero-stat-row{display:grid; grid-template-columns:1.2fr 1fr 1fr; gap:16px; margin-bottom:30px;}
  @media(max-width:700px){ .hero-stat-row{grid-template-columns:1fr; } }
  .hero-stat{background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:22px;}
  .hero-stat .k{font-family:'JetBrains Mono',monospace; font-size:10.5px; color:var(--muted-2); letter-spacing:.08em; margin-bottom:8px;}
  .hero-stat .v{font-family:'Anton',sans-serif; font-size:28px;}
  .hero-stat .v small{font-size:14px; color:var(--muted); font-family:'Manrope',sans-serif; font-weight:600;}
  .hero-stat.big{background:linear-gradient(135deg, rgba(255,79,216,.08), rgba(63,224,240,.08)); border-color:rgba(63,224,240,.25);}

  .grid-2{display:grid; grid-template-columns:1fr 1fr; gap:20px;}
  @media(max-width:760px){ .grid-2{grid-template-columns:1fr;} }

  .card{background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:24px; margin-bottom:20px;}
  .card h2{font-family:'Anton',sans-serif; font-weight:400; text-transform:uppercase; font-size:14.5px; margin:0 0 20px;}

  
  .donut-wrap{display:flex; align-items:center; gap:24px; flex-wrap:wrap;}
  .legend{display:flex; flex-direction:column; gap:10px; flex:1; min-width:140px;}
  .legend-item{display:flex; align-items:center; gap:9px; font-size:12.5px;}
  .legend-item .sw{width:10px; height:10px; border-radius:3px; flex-shrink:0;}
  .legend-item b{margin-left:auto; font-family:'JetBrains Mono',monospace;}

  
  .genre-row{display:grid; grid-template-columns:110px 1fr 34px; gap:10px; align-items:center; margin-bottom:12px;}
  .genre-row .name{font-size:12.5px; font-weight:700;}
  .genre-track{height:8px; background:var(--panel-2); border-radius:99px; overflow:hidden;}
  .genre-fill{height:100%; border-radius:99px; background:linear-gradient(90deg, var(--holo-1), var(--holo-2));}
  .genre-row .pct{font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted-2); text-align:right;}

  
  .month-chart{display:flex; align-items:flex-end; gap:8px; height:110px; margin-bottom:8px;}
  .month-bar{flex:1; background:linear-gradient(0deg, var(--holo-2), var(--holo-3)); border-radius:4px 4px 0 0; position:relative;}
  .month-labels{display:flex; gap:8px;}
  .month-labels span{flex:1; text-align:center; font-family:'JetBrains Mono',monospace; font-size:9.5px; color:var(--muted-2);}

  
  .line-chart-wrap{width:100%; overflow-x:auto;}
</style>
</head>
<body>

<nav>
  <div class="nav-inner">
    <div class="logo"><div class="logo-mark"><svg width="100%" height="100%" viewBox="0 0 84 100" xmlns="http:
<defs>
<linearGradient id="hG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF4FD8"/><stop offset="35%" stop-color="#7B5CFF"/><stop offset="65%" stop-color="#3FE0F0"/><stop offset="100%" stop-color="#8be9ff"/></linearGradient>
<filter id="dS" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.6"/></filter>
<filter id="nG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<pattern id="hx" width="6" height="10.3923" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)"><path d="M3 0 L6 1.732 L6 5.196 L3 6.928 L0 5.196 L0 1.732 Z" fill="none" stroke="#7B5CFF" stroke-width="0.3" opacity="0.4"/><circle cx="3" cy="3.464" r="0.5" fill="#3FE0F0" opacity="0.3"/></pattern>
<clipPath id="cI"><rect x="6" y="8" width="50" height="72" rx="6"/></clipPath>
<style>
.sA{animation:oS 8s ease-in-out infinite;} .spS{animation:sS 40s linear infinite; transform-box:fill-box; transform-origin:center;} .spR{animation:sR 30s linear infinite; transform-box:fill-box; transform-origin:center;} .bA{animation:bL 7s ease-in-out infinite;} .tA{animation:tw 6s ease-in-out infinite;} .tAd{animation:tw 7s ease-in-out infinite 2s;}
@keyframes oS{0%,10%{transform:translateX(-100%) skewX(-15deg);opacity:0;}15%{opacity:.22;}25%,100%{transform:translateX(200%) skewX(-15deg);opacity:0;}}
@keyframes sS{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
@keyframes sR{0%{transform:rotate(360deg);}100%{transform:rotate(0deg);}}
@keyframes bL{0%,100%{opacity:.85;}50%{opacity:1;}}
@keyframes tw{0%,100%{opacity:.5;}50%{opacity:.85;}}
</style>
</defs>
<g transform="translate(11,4)">
<g opacity="0.55">
<rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#3FE0F0" stroke-width="0.8" stroke-opacity="0.5" transform="rotate(-12 28 50)"/>
<rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#FF4FD8" stroke-width="0.8" stroke-opacity="0.5" transform="rotate(12 28 50)"/>
</g>
<g filter="url(#dS)">
<rect x="6" y="8" width="50" height="72" rx="6" fill="url(#hG)"/>
<g clip-path="url(#cI)">
<rect x="8" y="10" width="46" height="68" rx="4" fill="#0A0714" opacity="0.97"/>
<rect x="8" y="10" width="46" height="68" fill="url(#hx)"/>
<rect x="-20" y="0" width="30" height="90" fill="url(#hG)" opacity="0" class="sA" style="mix-blend-mode:screen;"/>
<g stroke="url(#hG)" stroke-width="1.2" fill="none" opacity="0.9">
<path d="M12 24 v-6 a2 2 0 0 1 2-2 h6"/><path d="M50 64 v6 a2 2 0 0 1 -2 2 h-6"/>
</g>
<g transform="translate(31,44)">
<g class="spS"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#3FE0F0" stroke-width="0.6" transform="rotate(45)" opacity="0.6"/></g>
<g class="spR"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#FF4FD8" stroke-width="0.6" transform="rotate(-45)" opacity="0.6"/></g>
<circle cx="0" cy="0" r="14" fill="none" stroke="url(#hG)" stroke-width="1.2" stroke-dasharray="1 3" opacity="0.8" class="spS"/>
<circle cx="0" cy="0" r="12" fill="#05030A"/>
<circle cx="0" cy="0" r="6" fill="#3FE0F0" filter="url(#nG)" class="bA"/>
<g filter="url(#nG)">
<polygon points="0,-11 4,-4 0,-1 -4,-4" fill="#8be9ff"/><polygon points="4,-4 9,0 0,-1" fill="#3FE0F0"/><polygon points="9,0 4,5 0,-1" fill="#2fb8c9"/><polygon points="4,5 0,11 0,3" fill="#5a3fd6"/><polygon points="0,11 -4,5 0,3" fill="#7B5CFF"/><polygon points="-4,5 -9,0 0,-1" fill="#FF4FD8"/><polygon points="-9,0 -4,-4 0,-1" fill="#ff8de8"/>
<polygon points="0,-4 3,-1 0,3 -3,-1" fill="#ffffff" opacity="0.9"/>
</g>
</g>
</g>
<rect x="6" y="8" width="50" height="72" rx="6" fill="none" stroke="url(#hG)" stroke-width="1" opacity="0.9"/>
</g>
</g>
</svg></div><div class="logo-word">Ani<span class="holo-text">Deck</span></div></div>
    <div class="nav-links">
      <a href="dashboard-prototipo.html">Meu Deck</a>
      <a href="calendario-prototipo.html">Calendário</a>
      <a href="rankings-prototipo.html">Rankings</a>
      <a href="#" class="active">Estatísticas</a>
    </div>
    <div style="display:flex; align-items:center; gap:12px;">
      <a href="busca-prototipo.html" class="search-icon-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </a>
      <div class="profile-chip"><div class="avatar"></div><span>joaojvm</span></div>
    </div>
  </div>
</nav>

<div class="container">
  <div class="page-head">
    <h1>Estatísticas</h1>
    <p>Sua relação com anime, em números — tudo calculado a partir do seu próprio Deck.</p>
  </div>

  <div class="hero-stat-row">
    <div class="hero-stat big">
      <div class="k">TEMPO TOTAL ASSISTIDO</div>
      <div class="v">18d 6h <small>≈ 437 episódios</small></div>
    </div>
    <div class="hero-stat">
      <div class="k">GÊNERO FAVORITO</div>
      <div class="v" style="font-size:20px;">Ação</div>
    </div>
    <div class="hero-stat">
      <div class="k">SUA NOTA MÉDIA</div>
      <div class="v">9.1</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h2>Distribuição por Status</h2>
      <div class="donut-wrap">
        <svg width="130" height="130" viewBox="0 0 42 42">
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#181330" stroke-width="6"></circle>
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#3FE0F0" stroke-width="6"
            stroke-dasharray="42 58" stroke-dashoffset="25" transform="rotate(-90 21 21)"></circle>
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#a0ff78" stroke-width="6"
            stroke-dasharray="18 82" stroke-dashoffset="-17" transform="rotate(-90 21 21)"></circle>
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#FFC542" stroke-width="6"
            stroke-dasharray="30 70" stroke-dashoffset="-35" transform="rotate(-90 21 21)"></circle>
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#FF4FD8" stroke-width="6"
            stroke-dasharray="8 92" stroke-dashoffset="-65" transform="rotate(-90 21 21)"></circle>
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#6B5F94" stroke-width="6"
            stroke-dasharray="2 98" stroke-dashoffset="-73" transform="rotate(-90 21 21)"></circle>
        </svg>
        <div class="legend">
          <div class="legend-item"><span class="sw" style="background:#3FE0F0"></span>Assistindo<b>42%</b></div>
          <div class="legend-item"><span class="sw" style="background:#a0ff78"></span>Em Dia<b>18%</b></div>
          <div class="legend-item"><span class="sw" style="background:#FFC542"></span>Completo<b>30%</b></div>
          <div class="legend-item"><span class="sw" style="background:#FF4FD8"></span>Quero Assistir<b>8%</b></div>
          <div class="legend-item"><span class="sw" style="background:#6B5F94"></span>Dropado<b>2%</b></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Gêneros Favoritos</h2>
      <div class="genre-row"><span class="name">Ação</span><div class="genre-track"><div class="genre-fill" style="width:88%"></div></div><span class="pct">88%</span></div>
      <div class="genre-row"><span class="name">Fantasia</span><div class="genre-track"><div class="genre-fill" style="width:71%"></div></div><span class="pct">71%</span></div>
      <div class="genre-row"><span class="name">Comédia</span><div class="genre-track"><div class="genre-fill" style="width:64%"></div></div><span class="pct">64%</span></div>
      <div class="genre-row"><span class="name">Drama</span><div class="genre-track"><div class="genre-fill" style="width:47%"></div></div><span class="pct">47%</span></div>
      <div class="genre-row"><span class="name">Romance</span><div class="genre-track"><div class="genre-fill" style="width:33%"></div></div><span class="pct">33%</span></div>
    </div>
  </div>

  <div class="card">
    <h2>Episódios Assistidos por Mês</h2>
    <div class="month-chart">
      <div class="month-bar" style="height:40%;"></div>
      <div class="month-bar" style="height:55%;"></div>
      <div class="month-bar" style="height:30%;"></div>
      <div class="month-bar" style="height:70%;"></div>
      <div class="month-bar" style="height:48%;"></div>
      <div class="month-bar" style="height:85%;"></div>
      <div class="month-bar" style="height:60%;"></div>
      <div class="month-bar" style="height:35%;"></div>
      <div class="month-bar" style="height:90%;"></div>
      <div class="month-bar" style="height:52%;"></div>
      <div class="month-bar" style="height:100%;"></div>
      <div class="month-bar" style="height:67%;"></div>
    </div>
    <div class="month-labels">
      <span>Ago</span><span>Set</span><span>Out</span><span>Nov</span><span>Dez</span><span>Jan</span>
      <span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span>
    </div>
  </div>

  <div class="card" style="margin-bottom:50px;">
    <h2>Atividade ao Longo do Ano</h2>
    <div class="line-chart-wrap">
      <svg width="100%" height="140" viewBox="0 0 600 140" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7B5CFF" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#7B5CFF" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polyline points="0,90 55,70 110,100 165,50 220,80 275,30 330,60 385,95 440,20 495,65 550,10 600,45"
          fill="none" stroke="#3FE0F0" stroke-width="2.5"/>
        <polygon points="0,90 55,70 110,100 165,50 220,80 275,30 330,60 385,95 440,20 495,65 550,10 600,45 600,140 0,140"
          fill="url(#areaFill)" stroke="none"/>
      </svg>
    </div>
    <div class="month-labels">
      <span>Ago</span><span>Set</span><span>Out</span><span>Nov</span><span>Dez</span><span>Jan</span>
      <span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span>
    </div>
  </div>
</div>

</body>
</html>

```

## prototipos/landing-prototipo.html

```html
[File content not included]
```

## prototipos/login-prototipo.html

```html
[File content not included]
```

## prototipos/logo.html

```html
[File content not included]
```

## prototipos/painel-admin-prototipo.html

```html
[File content not included]
```

## prototipos/rankings-prototipo.html

```html
[File content not included]
```

## go.mod

```mod
module github.com/JoaoMendes1/anideck

go 1.26.4

require (
	github.com/MicahParks/keyfunc/v3 v3.8.0
	github.com/go-chi/chi/v5 v5.3.1
	github.com/golang-jwt/jwt/v5 v5.3.1
	github.com/joho/godotenv v1.5.1
	github.com/microcosm-cc/bluemonday v1.0.27
	github.com/supabase-community/supabase-go v0.0.4
	golang.org/x/time v0.15.0
)

require (
	github.com/MicahParks/jwkset v0.11.0 
	github.com/aymerick/douceur v0.2.0 
	github.com/google/uuid v1.6.0 
	github.com/gorilla/css v1.0.1 
	github.com/supabase-community/functions-go v0.0.0-20220927045802-22373e6cb51d 
	github.com/supabase-community/gotrue-go v1.2.0 
	github.com/supabase-community/postgrest-go v0.0.11 
	github.com/supabase-community/storage-go v0.7.0 
	github.com/tomnomnom/linkheader v0.0.0-20180905144013-02ca5825eb80 
	golang.org/x/net v0.26.0 
)

```

## go.sum

```sum
[File content not included]
```

