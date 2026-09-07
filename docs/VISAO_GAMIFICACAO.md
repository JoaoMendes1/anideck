# 🎮 Visão de Longo Prazo — Gamificação do AniDeck

> **Este documento NÃO é roadmap.** Não tem issue, não tem prazo, não é compromisso. É o
> registro de uma ideia grande enquanto ela está fresca, para existir em algum lugar até o dia
> em que fizer sentido puxar pedaços dela para o `ROADMAP.md` de verdade.
>
> Escrito a partir de conversas em 04/09/2026, durante o beta fechado da Fase 7. Mantenha este
> arquivo fora do fluxo normal de revisão de código.
>
> **Origem:** parte destas ideias já existia dentro do `VISAO_RANKING_CREDIVEL.md`, misturada
> com o sistema de peso de voto. Foram separadas aqui porque são coisas diferentes: lá o XP é
> **meio** (serve para decidir de quem o voto pesa mais), aqui ele é **fim** (a progressão é o
> produto). A distinção não é cosmética — muda o quanto o sistema precisa resistir a fraude.

---

## 🎯 A ideia

Transformar o AniDeck num app com estrutura de guilda de anime de fantasia. Usuário novo entra
no nível 1, com rank **F**, e evolui até **SS** conforme assiste e usa o app. Ao longo do
caminho ganha afinidade com gêneros, insígnias como reconhecimento, e privilégios que se
destravam por marca atingida.

O ranking de animes deixa de ser média cega: nota de quem tem afinidade comprovada com o gênero
pesa mais.

**Objetivo declarado, registrado de propósito:** o valor deste sistema não depende de ele ter
público. Mesmo com poucos usuários, uma economia de progressão bem modelada é aprendizado real
e peça de portfólio. Escala muda o brilho, não a validade. Está escrito aqui para que a
pergunta "vale a pena sem base de usuários?" não seja reaberta daqui a três meses.

---

## 🪙 A mecânica central: duas moedas que não se misturam

Esta é a decisão estruturante do documento. Tudo o mais decorre dela.

| | **Afinidade de gênero** | **Rank / Nível (F → SS)** |
|---|---|---|
| **Vem de** | Acervo inteiro, backlog incluído | Só atividade daqui para frente, no tempo |
| **Responde** | *Quem você é* | *O que você fez* |
| **Fonte de dado** | `media_entries` | `episode_progress` (o `watched_at`) |
| **Importável?** | Sim, de propósito | Não, de propósito |
| **Destrava** | Privilégios **dentro daquele gênero** | Privilégios gerais e classe visível |

### Por que separar resolve o problema do farm

O maior risco identificado: quem já assistiu 300 animes na vida vai marcar todos de uma vez ao
entrar. Um sistema ingênuo lê isso como trapaça e pune quem está apenas cadastrando a própria
história.

Com as moedas separadas, deixa de ser problema:

- **Marcar 300 animes é cadastro, não trapaça.** Dá afinidade instantânea, e é justo.
- **Rank não é farmável em massa**, porque não olha volume: olha ritmo e constância.
- Quem tenta subir rank marcando tudo num dia **não sobe**.

### Maratona de anime antigo conta

Assistir Hunter x Hunter inteiro em 2026 é atividade presente, não acervo importado. Tem que
render rank normalmente. O que não rende é declarar hoje o que foi assistido em 2019.

A fronteira não é a idade do anime — é **quando você assistiu**.

### Afinidade decai devagar

Quem assistiu 80 animes de Romance em 2019 e nada desde então entende do Romance de 2019. Um
decaimento leve mantém o especialista atual acima do aposentado, e dá motivo para voltar.

A taxa fica em aberto: é calibração, e calibração se acerta com uso real.

---

## ⚙️ Como o XP é ganho, gravado e perdido

### O XP é gravado no momento do ganho, com o valor que valeu na hora

Regra central, e a mais importante do documento depois das duas moedas.

Cada ganho de XP vira uma linha que guarda **quanto aquilo valeu naquele momento** — incluindo
multiplicador de evento, se havia um ativo. O total nunca é recalculado a partir da tabela de
pesos vigente.

**Por quê:** desmarcar um episódio devolve o XP. Se a linha não guardar o valor, o sistema
consulta o peso de hoje e devolve o número errado — episódio ganho em semana de XP dobrado
valeu 2 e seria devolvido como 1, deixando XP fantasma na conta.

É a mesma armadilha já resolvida em `custom_episodes`, onde a sobreposição é por número do
episódio e não por posição no array: recalcular a partir do estado atual dessincroniza em
silêncio, sem erro e sem aviso.

**Consequência boa:** mudar peso nunca é retroativo. Ninguém acorda três ranks acima porque um
número mudou no painel.

### Desmarcar devolve exatamente o que foi ganho

Ganhou 2, perde 2. Sai de graça, desde que a linha guarde o valor.

### Teto diário com retorno decrescente, em vez de trava de tempo

A ideia inicial era exigir intervalo mínimo entre marcações — 30 minutos, por exemplo. Foi
descartada por dois motivos:

- **Não impede fraude**, só atrasa: quem quer farmar espera.
- **Pune o comportamento honesto:** muita gente assiste 3 episódios seguidos e marca os 3 no
  fim.

No lugar: os primeiros episódios do dia valem cheio, os seguintes valem cada vez menos, com um
limite diário. Maratona conta, mas não leva ninguém a SS num fim de semana. Marcar em lote não
é punido, e esperar não contorna nada.

### Bônus por assistir cedo

Encaixa em "rank mede ritmo", e o dado já existe: a hora de estreia curada
(`TIMESTAMPTZ` em `curated_animes`) e o `nextAiringEpisode` da AniList.

A ideia original era bônus nas primeiras 2 horas após o lançamento. **Janela curta demais:**
episódio japonês sai de madrugada no Brasil, então premiaria insônia, não acompanhamento — e
seria exatamente o mecanismo de culpa que este documento recusa mais abaixo.

Desenho preferido: valor cheio para quem assiste **antes do próximo episódio sair**, com um
bônus pequeno para quem assiste **no dia**.

### Evento de XP dobrado

Só para anime em lançamento. Anime antigo não entra — é o mesmo raciocínio do bônus acima.

**Com data de início e fim, nunca com liga/desliga manual.** Toggle depende de alguém lembrar de
desligar; janela fecha sozinha. Mesmo raciocínio do `beta_signup_limit`, que fecha a porta do
cadastro sem ninguém lembrar.

---

## 🏅 Rank, classe e insígnias

### Rank F → SS por faixa de nível

O rank não é uma segunda moeda: é a leitura do nível geral em faixas (ex.: nível 1–15 = F, e
assim por diante). Simples, sem cálculo próprio.

É a parte mais forte da ideia porque é instantaneamente legível para quem assiste anime — não
precisa de tutorial. Vive no perfil como selo, e **pode existir antes de tudo o resto**.

### Insígnias como cartas, não como ícones

O AniDeck já tem o Sistema de Cartas Raras, com carta holográfica e os cinco gradientes de
`gradienteDoCard()`. Insígnia colecionável encaixa nessa linguagem sem inventar identidade nova.

Recompensa visual sugerida, toda em CSS: moldura de perfil, borda holográfica, fundo de card.

---

## 🎛️ Painel de configuração da economia

Pesos, faixas e eventos ficam editáveis no Painel Admin, não no código.

**O padrão já existe no projeto, duas vezes:** o `app_settings` guarda o `beta_signup_limit` e a
mensagem de cadastro cheio — o `DECISIONS.md` registra que "a mensagem mora no banco, não no
frontend: um UPDATE muda o texto nos dois caminhos, sem deploy" — e o cache de prompts da IA em
`sync.RWMutex` existe para editar as regras sem mexer no código.

Esta é a terceira aplicação do mesmo padrão, não uma ideia nova.

O que muda em relação às outras duas: aqueles são valores pontuais, onde ninguém se importa com
o que valia antes. Peso de XP decide nível, rank e privilégio — por isso a regra de gravar o
valor no momento do ganho é pré-requisito deste painel, não um detalhe dele.

**Reforço da estratégia:** com os pesos editáveis, dá para começar apertado e afrouxar depois.
Apertar depois é que não dá — economia inflacionada não volta atrás sem quebrar a confiança de
quem já subiu.

---

## 🔓 Privilégios por marca

### 1. Peso maior no voto do ranking

**Risco: baixo.** É o que o `VISAO_RANKING_CREDIVEL.md` descreve, e a média bayesiana da Fase
6.5 já é o alicerce estatístico. Este documento passa a ser a fonte do XP que aquele consome.

### 2. Sugerir curadoria (usuário de topo)

**Risco: baixo, e a infraestrutura já existe.** A tabela `curation_suggestions` e a fila do
Olheiro no Painel Admin, com botões Curar/Dispensar, foram construídas na Fase 4.5.

O usuário de topo **não ganha acesso ao Painel**. Ganha o direito de colocar sugestão na fila
que o admin já revisa. Nenhuma policy nova, nenhuma permissão elevada, supervisão embutida por
desenho.

### 3. Comentar em animes do gênero de afinidade

Comentário aberto a todos seria construir rede social — descartado no `ROADMAP.md` pelo mesmo
motivo que Fórum, Clubes e Mensageria.

Travado por marca de uso **e** restrito ao gênero em que a pessoa tem afinidade, vira outra
coisa: plateia pequena, autor identificável, e quem tem o privilégio tem o que perder.

**O mínimo que precisa existir junto, não depois:**

- Botão de apagar comentário, para o admin e para o próprio autor.
- Sanitização com `bluemonday`, que o projeto já aplica em todo texto livre.
- Uma linha na política de privacidade: comentário é conteúdo de usuário, fica salvo e é
  visível para outras pessoas.
- Privilégio revogável. Se o sistema pode dar, precisa poder tirar.

---

## 👁️ Página "o que os SS estão assistindo"

Vitrine com os animes da temporada que os usuários de rank mais alto estão assistindo, dropando
e favoritando.

Como produto é a ideia mais forte da lista: prova social genuína, e nem MAL nem AniList mostram
isso.

**Duas travas obrigatórias, não opcionais:**

- **Agregado, nunca nominal.** "7 de 10 usuários SS estão assistindo X", sem dizer quem. Hoje
  todo dado de usuário é privado por RLS, e expor lista alheia exige consentimento explícito —
  opt-in no perfil e linha na política de privacidade.
- **Mínimo de gente na faixa para a página existir.** Com 2 usuários SS, "o que os SS estão
  assistindo" é literalmente a lista de uma pessoa. Agregado pequeno não é agregado.

---

## 🧩 A lacuna de curadoria (anime sem grade de episódios)

Nem todo anime tem episódios disponíveis, e isso afeta quem marca episódio para ganhar XP.

**O que o banco realmente tem:** `anime_metadata_cache` guarda `episodes`, que é só a
**contagem** — não a lista. Título e imagem de episódio vêm da AniList ao vivo e não são
gravados. Confirmado no `snapshot_schema.sql`.

Isso resolve mais do que atrapalha: para dar XP basta saber que o anime tem N episódios e que a
pessoa marcou o N. A grade bonita é assunto de tela.

| Situação | Marcar episódio funciona? |
|---|---|
| Curado, com `custom_episodes` | Sim, com grade completa |
| Não curado, `episodes` no cache | Sim — dá para gerar 1..N |
| Não curado, `episodes` nulo ou zero | **Não.** É o buraco real |

**Não dá para varrer o catálogo procurando o terceiro caso.** O cache só contém anime que
alguém já tocou, e desde o `sql/020` a escrita é restrita a `is_admin()` — anime que ninguém
abriu não está lá e nunca estará até alguém abrir.

**Desenho proposto:** o furo se anuncia sozinho. Quando a leitura de um anime não acha contagem,
isso vira sugestão na fila do Olheiro, que já existe com tela e fluxo prontos. É a versão mínima
do *Agente de inconsistências* do Backlog.

**E o usuário não pode travar esperando curadoria.** Duas saídas, ambas necessárias:

- Marcar "Completo" conta, mesmo sem grade — caminho alternativo de XP.
- Campo de progresso manual ("estou no episódio 7").

**Dependência dura:** isso exige que marcar Completo preencha `episode_progress`, o que hoje não
acontece — bug ativo que já distorce as Estatísticas, independente de gamificação.

---

## 🧭 O que roubar do Habitica, e o que não

**Copiar:** o Habitica recompensa o que a pessoa já ia fazer. Você não assiste anime para ganhar
XP — ganha XP porque assiste. Manter esse sentido evita que o sistema fique artificial.

**Não copiar:** a mecânica de culpa. No Habitica, perder o dia causa dano ao personagem. Isso
transforma hobby em obrigação.

**O risco específico do AniDeck:** anime é lazer. Se o app começar a cobrar constância, tem
gente que para de marcar episódio para não ver a barra cair — e aí o app perde o dado que
alimenta o sistema inteiro. O streak que já existe deve seguir sendo elogio, nunca cobrança.

---

## 🔍 Concorrência (busca em 04/09/2026)

**Gamificação em tracker de anime já existe.** O **Anime Stars** (App Store, iOS) tem conquistas
com badges, missões diárias, streaks, níveis de "Otaku Novice" a "Legendary Otaku", pontos por
ação e cartelas de bingo com tropes para desafios de temporada.

**O que nenhum concorrente encontrado faz:** conectar a progressão do usuário ao **ranking dos
animes**. Nos outros apps o nível é enfeite — progressão fechada em si mesma. Aqui ele tem
consequência: afinidade por gênero específico, peso de voto, e privilégio que muda o produto.

**Ajuste de discurso:** não é "não existe em lugar nenhum". É *"gamificação de tracker existe;
gamificação que alimenta o ranking, não"*.

**Lado bom:** o Anime Stars prova que a mecânica engaja em app de anime. Não é aposta cega.

---

## 🛍️ Loja e personagem 3D

Adiado, sem descarte. É a parte mais cara e a de menor retorno no estágio atual: o Habitica tem
equipe de arte, este projeto tem um desenvolvedor.

O caminho barato e melhor no curto prazo é a linguagem de cartas descrita acima, que já é a
identidade do produto. Reabrir quando houver base que justifique pagar um artista.

---

## ⚠️ Riscos e pontos de atenção

**Calibração é o trabalho real, não o código.** Quanto vale cada ação, onde ficam as marcas,
qual a curva de F até SS — nada disso se acerta no papel. Precisa de uso e de ajuste, e cada
ciclo desses leva semanas.

**Isso provavelmente demora mais que o AniDeck atual.** Não por volume de código — o código é
mais simples que a Fase 6.9, é contagem, faixa e regra. O que pesa é que as decisões daqui não
têm resposta certa a ser lida: só o uso responde. Mitigação: as partes solo são pequenas e
independentes, então dá para ter coisa no ar em semanas se fatiar.

**Economia inflacionada não volta atrás.** Rank SS fácil demais não se corrige sem quebrar a
confiança de quem já chegou lá. Começar apertado.

**Isso é um projeto novo, não uma fase.** Vira várias fases numeradas no `ROADMAP.md` quando
houver decisão explícita de fazer, com as partes solo antes das coletivas.

---

## 📊 O que funciona sozinho e o que espera gente

| Funciona com 1 usuário | Espera base crescer |
|---|---|
| Afinidade de gênero | Peso de voto no ranking |
| Nível e rank F → SS | Ranking de usuários / top 1 |
| Insígnias e coleção | Sugestão de curadoria pela comunidade |
| Progresso pessoal visível | Página "o que os SS assistem" |
| Painel de configuração da economia | Comentários (funcionam, mas ficam vazios) |

A coluna da esquerda é o caminho de entrada natural. A da direita não é bloqueio — é ordem.

---

## 🚫 Avaliado e descartado

- **XP reduzido para anime antigo** como solução do farm. Substituído pela separação em duas
  moedas, que resolve o mesmo problema sem punir quem chega com acervo grande. Maratona de
  anime antigo **conta**, porque é atividade presente.
- **Trava de tempo mínimo entre marcações (30 min).** Não impede farm, só atrasa, e pune quem
  assiste vários episódios seguidos. Substituída pelo teto diário com retorno decrescente.
- **Bônus restrito às 2 primeiras horas após o lançamento.** Premia madrugada, não
  acompanhamento. Substituído pela janela até o próximo episódio.
- **Evento de XP dobrado com liga/desliga manual.** Depende de lembrar de desligar. Substituído
  por janela com data de início e fim.
- **Comentário aberto a qualquer usuário.** Mesmo motivo do descarte de Fórum e Clubes no
  `ROADMAP.md`: vira moderação permanente sobre um desenvolvedor só.
- **Acesso do usuário de topo ao Painel Admin.** A fila de sugestões entrega o mesmo valor sem
  conceder permissão elevada.

---

## 🔗 Relação com os outros documentos

- **`VISAO_RANKING_CREDIVEL.md`** — consome o XP definido aqui para calcular o peso do voto. A
  mecânica de progressão saiu de lá e passou a morar neste arquivo.
- **`ROADMAP.md`** — nada aqui é fase. Entra pelo Backlog e só vira fase com decisão explícita.
  A dependência do bug "Completo não preenche `episode_progress`" é issue do app atual, não
  deste documento.
- **`DECISIONS.md`** — quando qualquer pedaço disto sair do papel, a decisão de arquitetura vai
  para lá, não para cá.
