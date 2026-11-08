| # | Página/Tela | Arquivo | Status | Fase do Roadmap |
|---|---|---|---|---|
| 1 | Landing pública (visitante) | `Landing.tsx` | ✅ Implementada · vitrine viva da curadoria, cards Foil e aviso de acesso Beta | Fase 3 / 13 (#142) |
| 2 | Login / Cadastro | `Auth.tsx` | ✅ Implementada · aviso de Beta fechado com solicitação de convite e atalhos sem login | Fase 2 / 13 (#142) |
| 3 | Meu Deck (dashboard logado) | `MeuDeck.tsx` | ✅ Implementada · container 1440px, filtro clicável nos StatCards, dia da semana de lançamento e vitrine recolhível | Fase 2 / 3 / 13 (#135, #136) |
| 4 | Busca / Descobrir catálogo | `Busca.tsx` | ✅ Implementada · container 1440px e filtro por ano livre | Fase 2 / 13 |
| 5 | Detalhe do anime | `Detalhes.tsx` | ✅ Implementada · container 1440px, streaming antes da sinopse, episódios sem miniatura em lista compacta, tradução automática pt-BR e aviso de obra não curada | Fase 2 / 6.6 / 13 (#133, #134) |
| 6 | Calendário de lançamentos | `Calendario.tsx` | ✅ Implementada · container 1440px, capas em pôster 2:3, dia da semana e "Quero Assistir" incluso em Meu Deck | Fase 5 / 13 (#135, #136) |
| 7 | Rankings (Navbar desktop e BottomNav mobile) | `Rankings.tsx` | ✅ Implementada · container 1440px, pôsteres maiores com destaque no Top 3 e filtro por ano livre | Fase 2 / 6.5 / 11 / 13 (#132, #136) |
| 8 | Meu Gosto (ex-Estatísticas), em `/meu-gosto` | `Estatisticas.tsx` | ✅ Implementada · container 1440px, frase-veredito e drill-down completo em gêneros, tags, notas, status, quadrante e recordes | Fase 4 / 6.8 / 12 / 13 (#138) |
| 9 | Painel Admin (curadoria) | `PainelAdmin.tsx` | ✅ Implementada | Fase 2.5 / 4.5 / 13 |
| 10 | Configurações & Ajuda | `Configuracoes.tsx` | ✅ Implementada · inclui Preferências de Gosto (#gosto) e Importador XML do MyAnimeList (#importar) | Fase 2 / 13 (#139, #140) |
| 11 | Política de Privacidade | `Privacidade.tsx` | ✅ Implementada | Fase 7 |
| 12 | Início (home logada, em `/`) | `Inicio.tsx` | ✅ Implementada · Hero Banner rotativo, cards 16:9 com avanço rápido de episódio e Recomendados para Você | Fase 11 / 13 (#139, #141) |
| 13 | Card de gosto compartilhável (no Meu Gosto) | `CompartilharGosto.tsx` | ✅ Implementada | Fase 12 (#126) |
| 14 | Guilda (rank, XP, insígnias, especialista de gênero) | `Guilda.tsx` | ✅ Implementada · anel F→SS, extrato do ledger, especialista N1→N5, insígnias Foil e pílula na Navbar | Fase 14 (#146) |

**Total: 12 páginas implementadas.**

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