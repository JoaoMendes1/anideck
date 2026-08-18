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
