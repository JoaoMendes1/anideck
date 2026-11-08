| # | Página/Tela | Arquivo | Status | Fase do Roadmap |
|---|---|---|---|---|
| 1 | Landing pública (visitante) | `Landing.tsx` | ✅ Implementada · vitrine viva da curadoria, cards Foil e aviso de acesso Beta | Fase 3 / 13 (#142) |
| 2 | Login / Cadastro | `Auth.tsx` | ✅ Implementada · aviso de Beta fechado com solicitação de convite e atalhos sem login | Fase 2 / 13 (#142) |
| 3 | Meu Deck (dashboard logado) | `MeuDeck.tsx` | ✅ Implementada · container 1440px, filtro clicável nos StatCards, reconciliação automática de status Em Dia vs Assistindo quando saem episódios novos, dia da semana de lançamento e vitrine recolhível | Fase 2 / 3 / 13 / 16 (#135, #136, #197) |
| 4 | Busca / Descobrir catálogo | `Busca.tsx` | ✅ Implementada · container 1440px e filtro por ano livre | Fase 2 / 13 |
| 5 | Detalhe do anime | `Detalhes.tsx` | ✅ Implementada · abas que trocam o conteúdo (Sobre, Episódios, Conversa, Números), capa maior, painel Na sua lista com status de um toque e régua de nota (compacto no celular), Conversa com termômetro de reações, estado acolhedor "Em breve" para obras anunciadas sem episódios e curadoria do admin recolhível | Fase 2 / 6.6 / 13 / 15 / 16 (#133, #134, #150, #154, #155, #196) |
| 6 | Calendário de lançamentos | `Calendario.tsx` | ✅ Implementada · container 1440px, capas em pôster 2:3, dia da semana e "Quero Assistir" incluso em Meu Deck | Fase 5 / 13 (#135, #136) |
| 7 | Rankings (Navbar desktop e BottomNav mobile) | `Rankings.tsx` | ✅ Implementada · container 1440px, pôsteres maiores com destaque no Top 3 e filtro por ano livre | Fase 2 / 6.5 / 11 / 13 (#132, #136) |
| 8 | Meu Gosto (ex-Estatísticas), em `/meu-gosto` | `Estatisticas.tsx` | ✅ Implementada · container 1440px, frase-veredito e drill-down completo em gêneros, tags, notas, status, quadrante e recordes | Fase 4 / 6.8 / 12 / 13 (#138) |
| 9 | Painel Admin (curadoria) | `PainelAdmin.tsx` | ✅ Implementada · menu agrupado por assunto, suporte a status "Em breve" com selo no trilho e lista nominal com atalho direto, importação em lote e preenchimento automático de episódios da AniList para obras curadas, controle e execução manual de tarefas periódicas do worker em Diagnóstico, Moderação, regras de Mana e Vitalidade, e Aba Economia (circulação de Cristais, regras, ajuste manual e auditoria) | Fase 2.5 / 4.5 / 13 / 15 / 16 (#152, #154, #166, #167, #193, #195, #196, #197) |
| 10 | Configurações & Ajuda | `Configuracoes.tsx` | ✅ Implementada · inclui Perfil público (#comunidade), Preferências de Gosto (#gosto) e Importador XML do MyAnimeList (#importar) | Fase 2 / 13 / 15 (#139, #140, #154) |
| 11 | Política de Privacidade | `Privacidade.tsx` | ✅ Implementada · cobre perfil público e conteúdo publicado (08/11/2026) | Fase 7 / 15 (#154) |
| 12 | Início (home logada, em `/`) | `Inicio.tsx` | ✅ Implementada · carrossel navegável no topo com próximo episódio liberado de animes em andamento, priorização de obras com episódios prontos em Continue de onde parou, rolagem horizontal desktop, Sua semana, ficha da Guilda com Vitalidade e Mana, trilhas em cartões e Recomendados | Fase 11 / 13 / 15 / 16 (#139, #141, #151, #193, #197) |
| 13 | Card de gosto compartilhável (no Meu Gosto) | `CompartilharGosto.tsx` | ✅ Implementada | Fase 12 (#126) |
| 14 | Guilda (rank, XP, insígnias, especialista de gênero) | `Guilda.tsx` | ✅ Implementada · anel F→SS, extrato do ledger (abas XP e Cristais 💎), especialista N1→N5, insígnias Foil, pílula na Navbar (HUD com XP, Cristais, Vitalidade e Mana em todas as páginas, painel de status e avisos de ganho) e Vitalidade & Mana | Fase 14 / 15 / 16 (#146, #154, #164, #167) |
| 15 | Ranking de membros (aba do Descobrir, em `/membros`) | `Membros.tsx` | ✅ Implementada · liga da semana e Hall da Fama, só perfis públicos | Fase 15 (#154) |
| 16 | Perfil público de membro (`/u/:handle`) | `PerfilMembro.tsx` | ✅ Implementada · ficha da Guilda, vitrine de cinco cartas, contagem do deck sem títulos e bloqueio | Fase 15 (#154) |

**Total: 16 telas implementadas.**

> Configurações tem oito seções, todas funcionando: Perfil, Perfil público, Preferências de
> Gosto, Importar Lista, Aparência, Notificações, Conta e Ajuda. Dois blocos dentro delas usam o componente `EmBreve`, e cada um diz no
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