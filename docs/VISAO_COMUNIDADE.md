# 🌌 VISÃO DE COMUNIDADE — AniDeck

> **Este documento não é roadmap.** Registra a direção decidida em 08/11/2026: o AniDeck passa a
> ter comunidade, economia própria e um caminho de receita. O que vira escopo está nas Fases 15,
> 16 e 17 do `ROADMAP.md`; decisão de arquitetura vai para o `DECISIONS.md` quando sair do papel.
>
> **Reabre decisões anteriores, com motivo novo.** O `VISAO_PRODUTO.md` posicionava o produto
> como uso individual, e o `VISAO_GAMIFICACAO.md` e o `ROADMAP.md` descartavam comentário aberto,
> fórum e clubes pelo custo de moderação. A decisão do dono do projeto é construir comunidade; o
> custo de moderação é aceito e tratado na seção própria, não ignorado.

---

## 🎯 O que torna esta comunidade diferente

Comunidade de anime já existe. O AniDeck tem quatro coisas que as outras não usam, e cada
mecânica abaixo se apoia em pelo menos uma:

| Ativo que já existe | O que ele permite |
|---|---|
| **Progresso por episódio** | Saber exatamente até onde cada pessoa assistiu: spoiler controlado pelo progresso, não por um borrão |
| **Agenda com horário de lançamento** | Juntar as pessoas no momento em que o episódio sai |
| **Guilda (XP, rank, especialista por gênero)** | Reputação que já mede atividade real, sem farm em lote |
| **A identidade "Deck"** | Cartas colecionáveis como linguagem visual de tudo |

---

## 🧭 Princípios

1. **O progresso é a chave do spoiler.** Comentário de um episódio só aparece para quem marcou
   aquele episódio como visto.
2. **Dinheiro nunca compra posição.** XP, rank, peso de voto e lugar nos rankings não se vendem.
   O ranking confiável (`VISAO_RANKING_CREDIVEL.md`) é o valor central do produto.
3. **XP nunca diminui.** Penalidade por inatividade existe, mas atua sobre barras separadas (HP)
   e sobre bônus, nunca sobre o XP acumulado nem o rank.
4. **Funciona com cinco pessoas.** Toda mecânica da primeira fase precisa fazer sentido com a
   base atual; o que depende de multidão vem depois.
5. **Todo valor ajustável tem painel** (princípio 3 do `VISAO_PRODUTO.md`): pesos, limites,
   preços da loja e regras de HP e MP ficam no banco e são editados pelo Painel Admin.

---

## 💬 Conversa sobre os episódios

| Mecânica | Como funciona |
|---|---|
| **Reação de um toque** | Ao marcar um episódio, um conjunto curto de reações (Chorei, Plot twist, Animação absurda, Enrolação, Engraçado). Alimenta rankings como "o episódio que mais fez a comunidade chorar na temporada" |
| **Comentário com escudo de spoiler** | Cada comentário pertence a um episódio. Quem não marcou aquele episódio vê só a contagem ("3 comentários no ep. 7") e um convite para assistir |
| **Momento marcado** | O comentário pode citar o minuto da cena; a soma gera o mapa de calor do episódio |
| **Sala de estreia** | Chat ao vivo que abre no horário do lançamento (dado da Agenda) e fecha três horas depois; o histórico vira comentários do episódio |

**Chat permanente por episódio foi avaliado e descartado:** com base pequena, a sala fica vazia, e
sala vazia afasta quem chega. A janela curta concentra as pessoas, e a notificação de lançamento
já leva todos para o mesmo lugar.

---

## ❤️ HP e 💙 MP

| | HP · Vitalidade | MP · Mana |
|---|---|---|
| **Mede** | Constância recente | Energia para ações sociais |
| **Sobe** | Ao marcar episódio | Recarga diária, mais rápida com HP alto |
| **Desce** | Depois de 7 dias sem atividade, cerca de 5 por dia, com piso em 20 | Ao gastar em ação social |
| **Efeito** | HP alto dá até +10% de XP; HP baixo só perde o bônus | Paga reação especial, previsão, destaque de comentário e enquete |

- **MP como antispam:** substitui o "limite de N comentários por dia" por uma regra de jogo.
- **Modo Descanso:** até 14 dias por mês com o HP congelado (viagem, provas).
- **Retorno sem culpa:** quem volta depois de muito tempo recebe HP de boas-vindas, não a conta
  do que perdeu.

---

## 🏆 Rankings de usuários

| Ranking | Mede | Reinicia |
|---|---|---|
| **Liga semanal** | XP da semana, em grupos de 20 que sobem e descem de divisão | Toda semana |
| **Temporada** | XP da temporada de anime | A cada três meses |
| **Hall da Fama** | XP total | Nunca |
| **Top por gênero** | Especialista de gênero (já calculado na Guilda) | Nunca |

A liga semanal existe para que quem chega tarde tenha chance; o Hall da Fama, para que a
constância de longo prazo seja reconhecida. Interação social conta por qualidade (reação
recebida), não por volume.

---

## 💎 Economia: Cristais, missões e loja

- **Cristais** são a moeda gastável, separada do XP. Vêm de missões, ligas e conquistas.
  **Não se compram com dinheiro**: assim continuam sendo mérito.
- **Missões diárias:** três por dia ("assista um lançamento", "reaja a dois episódios").
- **Loja cosmética:** moldura do card, tema do perfil, cor do nome, espaço extra na vitrine,
  emblema nos comentários. Nada que altere peso de voto ou visibilidade.
- **Inflação** é o risco principal, como no XP: começar com preços altos e ganhos baixos.

---

## 🃏 Cartas e perfil público

- **Carta por anime terminado,** com raridade: foil para nota 10, "Estreia" para quem assistiu
  na semana do lançamento, "Raríssima" para obra que pouca gente terminou.
- **Perfil público com @usuário** e uma vitrine com cinco cartas ("sua mão").
- **Duelo de gosto:** compara dois decks e mostra a afinidade, com o motor do Meu Gosto.
- **Cartas de personagem** a partir dos favoritos.

---

## 🛡️ Guildas como clãs

- Grupos temáticos de 10 a 30 membros, pequenos de propósito.
- **Desafio semanal coletivo** com recompensa para todos.
- **Liga de guildas** por temporada.
- **Chefão da Temporada:** um inimigo com HP gigante que perde vida a cada episódio marcado por
  qualquer pessoa da plataforma; derrotado, todos recebem a recompensa. É a mecânica que faz a
  base inteira jogar junta mesmo sendo pequena.

---

## ✨ Outras mecânicas

| Mecânica | Resumo |
|---|---|
| **Classes** | Bardo (comenta), Ranger (descobre obra pouco vista), Paladino (curador). Mudam o bônus, não o poder |
| **Títulos ganhos** | "Testemunha da Estreia", "Chorou em 30 animes", exibidos junto ao nome |
| **Previsões** | Antes do episódio, aposta de MP em perguntas simples; a comunidade confirma o resultado |
| **AniDeck Wrapped** | Retrospectiva anual compartilhável: divulgação sem custo |
| **Convite com recompensa** | Cosmético para quem convida e para quem entra |
| **Curadoria colaborativa** | Usuário de rank alto sugere título de episódio ou correção; a sugestão entra na fila de revisão da IA para o curador aprovar |
| **Avatar montável** | Em camadas, com peças da loja. Exige arte original; personagem de anime protegido não entra |

---

## 💰 Receita

Regra que não se quebra: **o que é pago é cosmético e é comprado direto em reais.**

| Fonte | Como | Quando |
|---|---|---|
| **Apoiador** | Assinatura voluntária com selo, moldura e tema exclusivos | Começa como link externo de apoio, sem código; pagamento integrado só com base que justifique |
| **Passe de temporada** | Trilha gratuita para todos e trilha paga só com cosméticos | Depois da loja |
| **Cosmético avulso** | Itens vendidos em reais | Depois da loja |
| **Afiliados** | Mangá e produtos de programas de afiliados | A qualquer momento |
| **Anúncio** | Um espaço discreto para quem não é apoiador | Último recurso |

Receber dinheiro exige formalização (MEI), termos de uso e o direito de arrependimento de sete
dias das compras online. A validação com um contador vem antes da primeira cobrança.

---

## 🧹 Moderação e privacidade

- Denunciar, ocultar e bloquear desde a primeira versão dos comentários, com fila no Painel Admin.
- Limite de taxa no servidor, além do MP: o MP é regra de jogo, o limite é proteção.
- A página de Privacidade passa a cobrir conteúdo publicado, perfil público e exclusão do que o
  usuário escreveu.
- Texto do usuário nunca vira HTML sem escape (regra do `AGENTS.md`).

---

## 📦 Limites do plano gratuito

O Supabase gratuito tem teto de armazenamento e de conexões em tempo real. A Sala de estreia
respeita esse teto (janela curta, uma sala por episódio) e os comentários guardam só texto.
Quando a base passar do plano gratuito, a receita acima existe para pagar a infraestrutura.

---

## 🗺️ Ordem

| Fase | Conteúdo | Por que nessa ordem |
|---|---|---|
| **15 · Comunidade base** | Perfil público, reações, comentários com escudo de spoiler, moderação, HP e MP, rankings semanal e geral | Funciona com a base atual e já diferencia o produto |
| **16 · Economia** | Cristais, missões, loja cosmética, cartas, liga de temporada e top por gênero, apoiador | Dá motivo diário para voltar |
| **17 · Comunidade viva** | Guildas-clã, Sala de estreia, Chefão, previsões, classes, Wrapped, avatar | Depende de gente suficiente |

**Pré-requisito da Fase 15:** abrir o beta. O cadastro fecha sozinho em 8 contas
(`beta_signup_limit`), e comunidade sem pessoas é a falha mais comum desse tipo de projeto.
