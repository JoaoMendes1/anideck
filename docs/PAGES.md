| # | Página/Tela | Arquivo | Status | Fase do Roadmap |
|---|---|---|---|---|
| 1 | Landing pública (visitante) | `Landing.tsx` | ✅ Implementada | Fase 3 |
| 2 | Login / Cadastro | `Auth.tsx` | ✅ Implementada | Fase 2 |
| 3 | Meu Deck (dashboard logado) | `MeuDeck.tsx` | ✅ Implementada | Fase 2/3 |
| 4 | Busca / Descobrir catálogo | `Busca.tsx` | ✅ Implementada | Fase 2 |
| 5 | Detalhe do anime | `Detalhes.tsx` | ✅ Implementada | Fase 2 / 6.6 |
| 6 | Calendário de lançamentos | `Calendario.tsx` | ✅ Implementada | Fase 5 |
| 7 | Rankings | `Rankings.tsx` | ✅ Implementada | Fase 2 / 6.5 |
| 8 | Estatísticas | `Estatisticas.tsx` | ✅ Implementada | Fase 4 / 6.8 |
| 9 | Painel Admin (curadoria) | `PainelAdmin.tsx` | ✅ Implementada | Fase 2.5 / 4.5 |
| 10 | Configurações & Ajuda | `Configuracoes.tsx` | ✅ Implementada | Fase 2 |
| 11 | Política de Privacidade | `Privacidade.tsx` | ✅ Implementada | Fase 7 |

**Total: 11 páginas implementadas.**

> Em Configurações, três blocos seguem marcados com `EmBreve` — têm desenho e não têm
> código (foto de perfil, notificações, exportar dados). Login com Google saiu da lista
> em 02/09: o cartão mostra o estado real da conta. A troca de senha, que estava presa
> junto dele sem motivo, foi separada no mesmo dia e funciona. A seção **Aparência**
> também deixou de ser um deles: o seletor de tema funciona.

> A coluna `Arquivo` existe para tornar a verificação barata: conferir este documento é
> abrir `client/src/pages/` e comparar. Sem ela, "✅ Implementada" é afirmação que
> ninguém consegue checar sem ler o repositório inteiro — foi assim que este arquivo
> passou meses dizendo que só três telas existiam.

Protótipo em HTML já implementado, mantido como referência do desenho original:
- `prototipos/config-ajuda-prototipo.html` (Configurações & Ajuda)