# 🧭 VISÃO DE PRODUTO — AniDeck

> **Este documento não é roadmap.** Não define prazo nem compromisso de escopo. Registra o
> posicionamento do produto e o mapa de navegação, para que decisões já tomadas não sejam
> rediscutidas a cada ciclo.
>
> Registrado em 18/09/2026, a partir de análise comparativa de plataformas equivalentes e de um
> protótipo navegável das 12 telas, responsivo para celular e desktop
> (`prototipos/anideck-app-prototipo-v1.html`).
>
> **Relação com os demais documentos:** o `VISAO_GAMIFICACAO.md` define a economia de XP e
> permanece válido integralmente; este define a estrutura de produto onde ela se encaixa. O que
> virar escopo entra no `ROADMAP.md`; o que virar decisão de arquitetura entra no `DECISIONS.md`.

---

## 🎯 Posicionamento

**O AniDeck é um produto de uso individual, não uma rede social de anime.**

A pergunta que ele responde é *"quem sou eu como espectador"*. As plataformas equivalentes
respondem *"o que a comunidade sentiu"*. São produtos distintos, e o segundo depende de uma base
de usuários que este projeto não possui no curto prazo.

Decorrências práticas, que determinam o que se constrói:

- **Não competir em amplitude.** Catálogo exaustivo, feed social, ranking de membros e conteúdo
  editorial de terceiros são frentes já consolidadas por outros produtos.
- **Aprofundar a leitura de gosto individual.** Afinidade por gênero, volume × satisfação,
  padrão de horário e comportamento de maratona já são calculados aqui e não têm equivalente
  nas plataformas analisadas.
- **Distribuição antes de comunidade.** Uma peça compartilhável atrai usuários externos sem
  depender de base instalada. Comunidade, se vier, é consequência.

---

## 📐 Princípios

1. **Nada é removido, apenas adaptado.** As 11 páginas existentes permanecem. Quando um item
   sai da barra inferior, ganha ao menos duas outras portas de entrada.
2. **Página de navegação não se confunde com página de destino.** Detalhes do anime é destino:
   acessível por qualquer capa, não por item de menu. O mesmo vale para o card compartilhável,
   a política de privacidade e a autenticação.
3. **Todo recurso novo nasce com o respectivo painel.** Valor ajustável depois — peso de XP,
   corte de faixa, texto de trilha — fica no banco e é editável pelo Painel Admin. Sem isso,
   ajuste vira deploy; mesmo critério já aplicado ao `beta_signup_limit` e ao kill switch da IA
   de curadoria.
4. **Número exibido é número explicado.** Um selo de nível isolado é ornamento; nível com barra
   de progresso, XP atual e distância para o próximo é informação.

---

## 🔍 Análise comparativa (17–18/09/2026)

Foram avaliadas duas plataformas nacionais do mesmo segmento — uma de catálogo e comunidade,
outra de streaming. As conclusões dispensam identificá-las.

### Onde são superiores

- **Densidade na página inicial.** Destaque rotativo, alta da semana, próximas estreias e
  atividade recente convivem na primeira dobra. Nada exige busca para ser encontrado.
- **Agrupamento temático com título editorial.** Trilhas nomeadas por afinidade de tema, e não
  por gênero bruto, com subtítulo descritivo.
- **Sinalização sobre a capa.** Selo de episódio novo, contagem regressiva e indicação de
  episódio final reduzem a necessidade de abrir a página do título.

### O que não resolvem

- **O perfil do usuário é um placar.** Favoritos, acompanhando e percentual concluído. Não há
  leitura do gosto individual.
- **Taxonomia importada.** As tags reproduzem a lista da API de origem traduzida, sem camada
  editorial própria.
- **Ranking sensível a hype.** Em uma delas, as duas primeiras posições de um ranking histórico
  eram as duas temporadas do título em alta no momento — exatamente o problema descrito no
  `VISAO_RANKING_CREDIVEL.md`, que o `sql/024` e o `sql/027` endereçam por nota bayesiana e peso
  de voto.

### Diagnóstico do AniDeck

A lacuna não é de funcionalidade, e sim de apresentação:

- a rota `/` autenticada redireciona para o Deck, e a primeira impressão do produto é uma grade
  de coleção;
- o diferencial analítico está atrás de autenticação e de um item de menu denominado
  "Estatísticas", rótulo que não comunica o conteúdo da página;
- não existe artefato exportável do produto para fora da aplicação.

---

## 🗺️ Mapa de navegação

### Barra inferior

`Início` · `Descobrir` · `Deck` · `Agenda` · `Perfil` — cinco itens é o limite para o alvo de
toque em tela pequena.

| Página | Situação atual | Situação proposta |
|---|---|---|
| Home autenticada | `/` redireciona para o Deck | tela própria: estreias, retomada, trilhas, vitrine |
| `Busca.tsx` | item da barra apenas deslogado; botão flutuante quando autenticado | `Descobrir`, fixo na barra; botão flutuante removido |
| `Rankings.tsx` | item da barra | aba dentro de Descobrir e bloco na home |
| `Estatisticas.tsx` | item "Stats" na barra | `Meu Gosto`, acessível pela home e pelo Perfil |
| `MeuDeck.tsx`, `Calendario.tsx` | na barra | permanecem na barra |
| Perfil, Configurações, Admin, encerrar sessão | Sheet do avatar | permanecem no Sheet |

**Justificativa da saída de Rankings e Estatísticas:** são páginas de consulta periódica, não de
uso diário. A visibilidade perdida é recuperada por entrada contextual na home, mais qualificada
que um ícone permanente.

**Encerrar sessão permanece fora da barra:** ação irreversível não deve ocupar alvo pequeno ao
lado de botões de uso frequente. Decisão anterior, mantida.

**Páginas de destino, fora da barra e da navbar:** detalhes do anime, card compartilhável,
política de privacidade e autenticação.

### Telas novas

| Tela | Descrição | Origem dos dados |
|---|---|---|
| **Início** | home autenticada | `media_entries`, `episode_progress`, streak, `curated_animes`, afinidade |
| **Meu Gosto** | `Estatisticas.tsx` renomeada, com abertura conclusiva | `view_user_genre_affinity` e views existentes |
| **Card compartilhável** | imagem do perfil de gosto para publicação externa | mesma origem de Meu Gosto |
| **Guilda** | rank F→SS, ledger de XP, insígnias | `VISAO_GAMIFICACAO.md` — fora deste escopo |

### Painel Admin

O painel atual permanece íntegro: Curadoria, Controle (AniList, Ranking, Rótulos, Diagnóstico) e
Olheiro. Cada recurso novo acrescenta gestão, sem substituir o que existe.

| Recurso | Gestão necessária |
|---|---|
| Trilhas curadas | criar, reordenar, redigir a nota de curadoria, despublicar |
| Gamificação | aba **Guilda**: economia de XP, faixas F→SS, insígnias, convites semanais, auditoria por usuário e kill switch |
| Frase de abertura do Meu Gosto | consultar a regra aplicada e o mínimo de títulos exigido |

Restrições que a aba Guilda deve respeitar, derivadas do `VISAO_GAMIFICACAO.md`:

- alteração de peso **não é retroativa**: o ledger registra o valor vigente no momento do ganho;
- alteração de corte de faixa **rebaixa usuários**, portanto a tela exibe a distribuição
  resultante antes da confirmação;
- insígnia criada **não concede XP retroativo**;
- **kill switch** desativa a gamificação sem indisponibilizar a aplicação, no mesmo padrão já
  adotado para a IA de curadoria.

---

## 💡 Iniciativas registradas

- **Trilhas do AniDeck** — agrupamentos temáticos montados sobre a `genre_taxonomy`, com título
  editorial e nota de curadoria. Converte o custo da curadoria manual em diferencial visível.
- **Lacuna de gosto** — o gráfico volume × satisfação já identifica o gênero com nota alta e
  baixo volume; transformá-lo em recomendação conecta Meu Gosto a Descobrir.
- **Frase de abertura do Meu Gosto** — a página passa a abrir com uma conclusão sobre o perfil.
  **Piso obrigatório:** abaixo de aproximadamente 10 títulos registrados, a frase é substituída
  por mensagem de amostra insuficiente. Conclusão equivocada sobre pouco dado é pior que
  ausência de conclusão.
- **Card compartilhável** — renderização HTML convertida em PNG no navegador, sem serviço
  adicional e sem custo de infraestrutura. Repetível ao fim de cada temporada.
- **Importação de lista externa na landing** — reduz o custo de entrada: o visitante obtém um
  retrato do próprio perfil sem abandonar a lista que já mantém.
- **Medidor de nível no topo** — rank, nível, barra de progresso e distância para o próximo,
  com acesso direto à Guilda.
- **Modo sessão** — marcação de múltiplos episódios em uma única ação, compatível com a regra de
  retorno decrescente.
- **Resumo de situação no Deck** — contadores de em dia, atrasado e episódio novo, respondendo à
  pergunta imediata sem leitura da grade completa.
- **Procedência dos votos no ranking** — exibir a proporção de votos provenientes de usuários com
  afinidade comprovada no gênero, materializando a tese do ranking crível.

---

## 🚫 Avaliado e descartado

- **Feed social nesta fase.** Exige base instalada; sem ela, comunica abandono. Mesmo critério já
  aplicado a Fórum, Clubes e Mensageria no `ROADMAP.md`.
- **Competição por amplitude de catálogo e programação.** Frente consolidada por outros produtos
  e alheia ao posicionamento.
- **Guilda como item da barra inferior.** Enquanto se resumir ao rank, permanece no Perfil.
- **Operador "OU" entre rótulos na busca.** A API combina os termos solicitados por conjunção;
  simular disjunção exigiria uma requisição por rótulo, incompatível com o limite de
  aproximadamente 30 requisições por minuto.

---

## ⚠️ Riscos

- **O escopo do protótipo excede a capacidade de um ciclo.** Concentrá-lo em uma única branch
  produziria integração longa e arriscada; por isso o backlog está segmentado em oito itens
  independentes.
- **A home é o item de maior esforço** e deve ser subdividida em três antes do início.
- **Nenhum item deste documento altera a arquitetura.** Caso alguma implementação exija mudança
  estrutural, o registro cabe ao `DECISIONS.md` no momento da decisão.