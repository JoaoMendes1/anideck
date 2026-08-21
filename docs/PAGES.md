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
| 8 | Estatísticas/Dashboard analítico (gráficos) | ✅ Implementada | Fase 4 / 6.8 |
| 9 | Configurações & Ajuda (unificadas em uma só página) | ✅ Prototipada | Fase 2 |

**Total: 9 páginas prototipadas, 3 delas já com implementação confirmada (Login/Cadastro, Busca e Estatísticas).** 🎉

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