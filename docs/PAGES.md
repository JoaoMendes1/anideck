| # | Página/Tela | Arquivo | Status | Fase do Roadmap |
|---|---|---|---|---|
| 1 | Landing pública (visitante) | `Landing.tsx` | ✅ Implementada | Fase 3 |
| 2 | Login / Cadastro | `Auth.tsx` | ✅ Implementada | Fase 2 |
| 3 | Meu Deck (dashboard logado) | `MeuDeck.tsx` | ✅ Implementada | Fase 2/3 |
| 4 | Busca / Descobrir catálogo | `Busca.tsx` | ✅ Implementada | Fase 2 |
| 5 | Detalhe do anime | `Detalhes.tsx` | ✅ Implementada | Fase 2 / 6.6 |
| 6 | Calendário de lançamentos | `Calendario.tsx` | ✅ Implementada | Fase 5 |
| 7 | Rankings | `Rankings.tsx` | ✅ Implementada | Fase 2 / 6.5 |
| 8 | Meu Gosto (ex-Estatísticas) | `Estatisticas.tsx` | ✅ Implementada · renomeação planejada | Fase 4 / 6.8 / 12 |
| 9 | Painel Admin (curadoria) | `PainelAdmin.tsx` | ✅ Implementada | Fase 2.5 / 4.5 |
| 10 | Configurações & Ajuda | `Configuracoes.tsx` | ✅ Implementada | Fase 2 |
| 11 | Política de Privacidade | `Privacidade.tsx` | ✅ Implementada | Fase 7 |
| 12 | Home logada | — | 🕐 Planejada | Fase 11 (#122) |
| 13 | Card de gosto compartilhável | — | 🕐 Planejada | Fase 12 |
| 14 | Guilda (rank, XP, insígnias) | — | 💭 Só visão | `VISAO_GAMIFICACAO.md` |

> As telas 12 a 14 existem como protótipo navegável em
> `prototipos/anideck-app-prototipo-v1.html`, com marcação do que é ajuste no que já existe e do
> que é ideia nova. A 14 não tem fase: só vira roadmap com decisão explícita. Após implementação o protótipo será removido do repositório. 

**Total: 11 páginas implementadas.**

> Configurações tem cinco seções, todas funcionando: Perfil, Aparência, Notificações,
> Conta e Ajuda. Dois blocos dentro delas usam o componente `EmBreve`, e cada um diz no
> `nota` o que falta para sair do papel:
>
> - foto de perfil — precisa de armazenamento de imagens;
> - notificações — precisa de preferências salvas por usuário.
>
> São ideias que surgiram depois da página pronta e dependem de infraestrutura que ainda
> não existe. Ficam visíveis de propósito, para não sumirem da cabeça. Não são pendência
> da página.

> A coluna `Arquivo` existe para tornar a verificação barata: conferir este documento é
> abrir `client/src/pages/` e comparar. Sem ela, "✅ Implementada" é afirmação que
> ninguém consegue checar sem ler o repositório inteiro — foi assim que este arquivo
> passou meses dizendo que só três telas existiam.