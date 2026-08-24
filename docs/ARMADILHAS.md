# ⚠️ ARMADILHAS.md — AniDeck

> **Para que serve:** este arquivo não ensina postura ("seja rigoroso", "investigue antes").
> Ele lista os modos de falha que **este projeto já sofreu de verdade**, cada um com o sintoma
> real observado e a pergunta que precisa ser respondida antes de mexer na área.
>
> **Para a IA que está lendo isto:** cada item abaixo tem uma **pergunta obrigatória**. Se a
> sua tarefa toca a área do item, responda a pergunta explicitamente na resposta — com o
> arquivo real na mão, não de memória. Se não tiver o arquivo, peça. Não responda "verifiquei"
> sem mostrar de onde tirou.
>
> Toda armadilha aqui nasceu de um bug que chegou a produção. A justificativa completa de cada
> uma está no `DECISIONS.md`, na data indicada.

---

## 1. 🌐 Rótulos de gênero existem em DOIS IDIOMAS

**Incidente (20/08/2026):** "Fantasia" aparecia duas vezes no ranking de Afinidade — uma com 13
animes, outra com 5.

**Causa:** gêneros chegam em inglês pelo `anime_metadata_cache` (`'Fantasy'`, vindo da AniList)
e em português pelo `curated_animes.custom_tags` (`'Fantasia'`, digitado à mão no Painel Admin).
O `GROUP BY` acontecia antes da tradução, então viravam duas chaves distintas.

**Onde mora o risco hoje:** a `genre_taxonomy` é chaveada por `raw_name` — o nome **como vem da
AniList**, em inglês. Qualquer `JOIN` entre um rótulo curado e essa tabela precisa resolver o
idioma antes, ou o rótulo curado simplesmente não encontra correspondência.

> **Pergunta obrigatória:** neste `JOIN` / `GROUP BY` / comparação de rótulos, de qual fonte vem
> cada lado e em que idioma? O que acontece com um rótulo em português que não bate com nenhum
> `raw_name`?

---

## 2. 🔒 Uma view no Postgres NÃO herda a RLS da tabela base

**Incidente (20/08/2026):** descoberto no Postman — o endpoint de estatísticas devolvia dados de
**dois usuários diferentes** no mesmo array.

**Causa:** RLS é aplicada nas *tabelas*. Uma view roda no contexto de **quem a criou** (o owner),
não de quem consulta. Confiar na RLS da tabela base é vazamento garantido.

**Regra:** toda view que expõe dado de usuário precisa de `WHERE user_id = auth.uid()`
**explícito**. Sem exceção, inclusive em views novas.

> **Pergunta obrigatória:** esta view expõe dado de usuário? Tem `auth.uid()` explícito? E as
> views que ela consulta por dentro, têm?

---

## 3. 🕐 O Postgres extrai hora em UTC — o navegador é quem sabe o fuso

**Incidente (21/08/2026):** o gráfico de Padrão de Horário estava deslocado em 3 horas.

**Causa:** `EXTRACT(HOUR FROM watched_at)` usa o fuso da sessão do Postgres, que no Supabase é
UTC. Quem está em UTC−3 via o gráfico inteiro fora do lugar.

**Regra:** conversão para hora local acontece **no navegador**, nunca no SQL. Agregações no banco
devem ser independentes de fuso (contar intervalos, não horas absolutas).

> **Pergunta obrigatória:** esta query extrai hora, dia ou data de um timestamp? Em qual fuso ela
> vai rodar, e quem faz a conversão para o fuso de quem está olhando?

---

## 4. ⏱️ `watched_at` grava quando foi MARCADO, não quando foi assistido

**Incidente (21/08/2026):** quem cadastrava o backlog inteiro numa sentada às 23h gerava 40
eventos noturnos, e o gráfico concluía que a pessoa era espectadora noturna.

**Correção adotada:** marcações separadas por menos de 2h contam como **uma sessão só**, e a
frase de insight só aparece com 10+ dias distintos de atividade.

> **Pergunta obrigatória:** esta métrica trata cada linha de `episode_progress` como um evento de
> comportamento independente? O que ela conclui de um import em lote de 40 episódios em 5 minutos?

---

## 5. 🕳️ `NULL` × array vazio significam coisas DIFERENTES em curadoria

**Convenção:** em campos de array de `curated_animes` (`custom_tags`, `custom_characters`, e os
campos novos do Bloco 2 da Fase 6.9):

- `NULL` = **não curado** → cai para a fonte seguinte (cache → AniList)
- array vazio `{}` = **curei e está vazio de propósito** → não cai para lugar nenhum

O `salvarDestaque` já faz isso certo para personagens. Generalizar é item aberto do Bloco 1.

> **Pergunta obrigatória:** este código distingue "campo não preenchido" de "campo esvaziado de
> propósito"? Um `COALESCE` genérico aqui apaga essa distinção?

---

## 6. ➕ Precedência NÃO é soma — `COALESCE` protege, `||` fura

**Regra do Bloco 1 (Fase 6.9), em uma frase:** para cada campo, se o valor curado existir ele
ganha; se estiver vazio, cai para o cache; se o cache não tiver, cai para a AniList ao vivo.
**Nunca soma as fontes.**

**Incidente:** `COALESCE(cur.custom_tags, c.genres, '{}') || COALESCE(c.tags, '{}')` — o
`COALESCE` respeita a precedência sobre `c.genres`, mas o `||` concatena `c.tags`
incondicionalmente. Sintoma: um anime curado com 3 tags exibiu 5+ rótulos em inglês, e
"Environmental" virou o card "Gênero Favorito".

> **Pergunta obrigatória:** neste ponto o dado curado **substitui** a fonte anterior ou é
> **somado** a ela? Tem algum `||`, `UNION` ou `array_cat` depois do `COALESCE`?

---

## 7. 🪪 `user_id` vem SEMPRE do JWT, nunca do payload

**Incidente (11/08/2026):** bug de IDOR que permitia transferência de posse via injeção de
`user_id` no corpo da requisição **reapareceu** (provável restore antigo). A correção é forçar
`entrada.UserID = userID` depois do decode.

**Segunda camada:** a RLS Policy de UPDATE no Supabase precisa de
`WITH CHECK (user_id = auth.uid())`.

> **Pergunta obrigatória:** este handler lê `user_id` de algum lugar que o cliente controla?
> Existe a segunda camada na policy, ou a defesa é só o código Go?

---

## 8. 📊 A fonte de verdade do progresso é `episode_progress`

**Incidente (20/08/2026, issue #65):** a `view_user_stats` contava o **total teórico de
episódios** para animes "Completo" e a coluna `media_entries.progress` para o resto — coluna que
nunca era escrita. Resultado: marcar um episódio não registrava minuto nenhum.

**Estado atual:** tempo assistido = contagem real de linhas em `episode_progress` ×
`duration_minutes` (fallback 24 min). A coluna `media_entries.progress` **foi removida**
(`sql/005`).

> **Pergunta obrigatória:** esta métrica deriva do que foi realmente marcado, ou do que
> teoricamente existe?

---

## 9. 🔢 A numeração de episódio 1..N é chave de fato — não renumerar

`episode_progress` referencia o **número** do episódio. Qualquer curadoria que reordene, insira
ou remova episódios (`custom_episodes`, Bloco 2) dessincroniza silenciosamente o progresso já
marcado pelos usuários. Não há erro, não há aviso — o usuário só vê episódio errado marcado.

> **Pergunta obrigatória:** esta mudança altera a numeração de algum episódio já existente?

---

## 10. 🌩️ A AniList é fonte única e já caiu duas vezes

**Incidentes:** encerramento do Jikan (28/07/2026) e API da AniList desativada globalmente com
403 (22/08/2026), derrubando Rankings, Busca, Meu Deck e Detalhes ao mesmo tempo.

**Dois efeitos práticos:**

- **Mapeamento de erro inconsistente:** a mesma falha virou 503 no ranking, 500 no detalhe e 502
  no Olheiro. Falha de terceiro **nunca** deve virar 500 — 500 significa "meu código quebrou" e
  manda o diagnóstico para o lado errado.
- **Rate limit mudou:** a AniList reduziu de 90 para **30 requisições/minuto**, com limitador de
  burst separado. O debounce de 400ms da busca foi calculado em cima dos 90/min — a premissa
  mudou e o `docs/fluxo-busca.md` ainda não foi atualizado.

> **Pergunta obrigatória:** o que este código faz quando a AniList responde 403, 429 ou timeout?
> O usuário vê "fonte externa indisponível" ou vê "erro"?

---

## 11. 🗄️ O `sql/` não é sistema de migrations — a ORDEM importa

Os arquivos em `sql/` são numerados e aplicados **à mão** no painel do Supabase, todos
idempotentes. Não há aplicação automática no deploy (isso exigiria credencial de owner do banco
no pipeline).

**Consequência:** a ordem entre deploy de código e aplicação de SQL é responsabilidade humana e
pode quebrar. Exemplo real: o `DROP COLUMN` do `sql/005` tinha que rodar **depois** do deploy —
a ordem inversa quebraria o insert.

**Agravante:** homologação e produção **compartilham o mesmo projeto Supabase**. Não existe
ambiente onde errar sem custo. Teste em homologação altera dado de produção.

> **Pergunta obrigatória:** este SQL precisa rodar antes ou depois do deploy do código? É
> reversível? Se não for, qual é o rollback?

---

## 🧭 Como manter este arquivo

- Toda vez que um bug **silencioso** chegar a produção (não quebrou, só devolveu dado errado),
  ele vira um item aqui — com o sintoma real observado, não com a descrição teórica.
- Bug que quebra alto e claro **não** entra aqui. Este arquivo é sobre o que passa despercebido.
- A justificativa longa continua no `DECISIONS.md`. Aqui fica só o gatilho e a pergunta.
- Item que deixou de ser risco (código removido, coluna dropada) não é apagado — vira nota
  histórica, para não ser reintroduzido por alguém que não viveu o incidente.
