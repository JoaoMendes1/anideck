# ⚠️ PITFALLS.md — AniDeck

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

**Onde mora o risco hoje:** a `genre_taxonomy` é chaveada por `raw_name`, e o seed do `sql/002`
já cadastra os dois idiomas apontando para o mesmo `display_name_pt` — `'Fantasy'` e
`'Fantasia'` ambos resolvem para "Fantasia". **Não assuma que só o inglês existe.**

O que ainda quebra:

- **A cobertura em português é parcial.** Existe `'Harém'`, mas não `'Harém Reverso'`.
- **O campo de tags no Admin é texto livre.** O `curation.go` não valida nada contra a
  taxonomia, então erro de digitação (`'Fantasía'`, `'Aventuras'`) vira rótulo órfão.
- **Desde o `sql/013`, órfão cai em `'ignorado'` e some da tela em silêncio.** A
  `view_unmapped_labels` existe justamente para tornar isso visível.

> **Pergunta obrigatória:** o rótulo desta ponta está cadastrado na `genre_taxonomy`, nos dois
> idiomas? Confira o seed do `sql/002`. Rótulo ausente não aparece em lugar nenhum — consulte a
> `view_unmapped_labels` antes de concluir que "sumiu sem motivo".

---

## 2. 🔒 Uma view no Postgres NÃO herda a RLS da tabela base

**Incidente (20/08/2026):** descoberto no Postman — o endpoint de estatísticas devolvia dados de
**dois usuários diferentes** no mesmo array.

**Causa:** RLS é aplicada nas *tabelas*. Uma view roda no contexto de **quem a criou** (o owner),
não de quem consulta. Confiar na RLS da tabela base é vazamento garantido.

**Regra:** toda view que expõe dado de usuário precisa de `WHERE user_id = auth.uid()`
**explícito**. Sem exceção, inclusive em views novas.

**Atualização (31/08/2026) — a causa foi tratada, mas só nas views que já existiam.** O
`sql/017` ligou `security_invoker = on` nas 16 views do `public`: elas passaram a rodar no
contexto de **quem consulta**, e a RLS da tabela-base voltou a valer sozinha. O filtro explícito
**continua em todas e não deve ser removido** — o objetivo é a mesma dupla camada do item 7.

**Emenda (07/09/2026) — o gatilho disparou.** O `sql/024` criou a `anime_community_scores` sem a
cláusula e ninguém rodou a conferência; o `sql/025` corrigiu com `ALTER VIEW`. **São 17 views
hoje**, todas com `invoker = on`. A conferência do fim do `sql/017` não roda sozinha.

**Onde mora o risco hoje:**

- **View nova nasce desprotegida.** O default do Postgres continua sendo
  `security_invoker = off`. Criar sempre com `CREATE VIEW ... WITH (security_invoker = on)`
  **e** com o `auth.uid()` explícito.
- **O Table Editor do Supabase omite a cláusula.** Ao exibir a definição de uma view, o painel
  monta um `CREATE VIEW` **sem** o `WITH (security_invoker = on)` — bug conhecido do Dashboard.
  Copiar dali, editar e rodar devolve a view para security definer, sem erro e sem aviso, e a
  RLS cai de novo. Use `pg_get_viewdef('nome'::regclass, true)` e reescreva a cláusula à mão.
  *Isto ainda não aconteceu aqui; está registrado porque o caminho que dispara é o mais natural
  do painel.*
- **Ligar o invoker exige permissão na tabela-base.** Com `security_invoker = on`, a view precisa
  que `authenticated` tenha `SELECT` **e** policy de leitura em cada tabela que ela consulta.
  Faltando qualquer um, a view devolve **vazio, sem erro** — troca um modo de falha silencioso
  por outro.

**Como verificar de verdade:** o estado vivo está no catálogo, não nos arquivos do `sql/`.

```sql
SELECT c.relname AS view,
       COALESCE((SELECT option_value FROM pg_options_to_table(c.reloptions)
                 WHERE option_name = 'security_invoker'), 'off') AS invoker
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v' AND n.nspname = 'public'
ORDER BY invoker, c.relname;
```

E, para provar que o filtro recorta de fato, dá para **fingir ser outro usuário** dentro de uma
transação abortada — read-only, seguro mesmo com produção e homologação no mesmo banco
(item 11):

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"<uuid-de-teste>","role":"authenticated"}';
SELECT count(*) FROM <a_view>;   -- usuário inexistente tem que devolver 0
ROLLBACK;
```

**Efeito colateral no teste:** por causa do filtro, rodar essas views no SQL Editor do
Supabase devolve **zero linhas** — lá você é `postgres` e `auth.uid()` volta `NULL`. Parece que
a query quebrou, mas não quebrou. Teste pelo Postman com o JWT, pela tela, ou com o bloco acima.

> **Pergunta obrigatória:** esta view expõe dado de usuário? Tem `auth.uid()` explícito **e**
> `security_invoker = on`? E as views que ela consulta por dentro, têm?

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

**Segundo sintoma da mesma raiz:** o recorde de "maratona mais rápida" exibia "2 eps em 0min" —
resultado de clicar dois episódios em sequência na grade, não de uma maratona.

**Correções adotadas:** marcações separadas por menos de 2h contam como **uma sessão só**; a
frase de insight só aparece com 10+ dias distintos de atividade; e a maratona exige 3+ episódios
com pelo menos 5 min de intervalo médio.

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

**Incidente (24/08/2026, corrigido no `sql/013`):**
`COALESCE(cur.custom_tags, c.genres, '{}') || COALESCE(c.tags, '{}')` — o `COALESCE` respeitava
a precedência sobre `c.genres`, mas o `||` concatenava `c.tags` incondicionalmente. Sintoma: um
anime curado com 3 tags exibiu 5+ rótulos em inglês, e "Environmental" virou o card "Gênero
Favorito".

**A forma correta:** o `||` vai **dentro** do `COALESCE`, não por fora —
`COALESCE(cur.custom_tags, COALESCE(c.genres,'{}') || COALESCE(c.tags,'{}'))`.

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
  mudou. O `docs/fluxo-busca.md` foi atualizado no Bloco 3 da Fase 6.9 e já reflete os 30/min.

**Atualização (08/09/2026) — a queda deixou de ser evento e virou rotina.** A AniList passou
dois dias seguidos em manutenção, e a instabilidade é estrutural: eles não são empresa, são
comunidade, com demanda acima do que aguentam. Trate indisponibilidade como estado normal, não
como exceção.

**O Painel Admin era o único ponto sem proteção nenhuma.** O `BuscaAniList` fala direto com o
`graphql.anilist.co` a partir do navegador, sem passar pelo Go — então nem o Kill Switch nem a
cadeia de fallback o cobrem. Com a API fora, não havia como criar curadoria alguma. Corrigido em
08/09/2026 com o campo manual de `mal_id` e o botão "Criar manualmente" (ver `DECISIONS.md`).

> **Pergunta obrigatória:** o que este código faz quando a AniList responde 403, 429 ou timeout?
> O usuário vê "fonte externa indisponível" ou vê "erro"?

---

## 11. 🗄️ O `sql/` não é sistema de migrations — a ORDEM importa

Os arquivos em `sql/` são numerados e aplicados **à mão** no painel do Supabase. Não há aplicação
automática no deploy (isso exigiria credencial de owner do banco no pipeline).

**Consequência:** a ordem entre deploy de código e aplicação de SQL é responsabilidade humana e
pode quebrar. Exemplo real: o `DROP COLUMN` do `sql/005` tinha que rodar **depois** do deploy —
a ordem inversa quebraria o insert.

**Agravante:** homologação e produção **compartilham o mesmo projeto Supabase**. Não existe
ambiente onde errar sem custo. Teste em homologação altera dado de produção.

**Segundo agravante:** o repositório não sabe quais arquivos já foram aplicados. Registre a data
de aplicação no `sql/README.md` — sem isso, você não descobre em outra máquina.

**Terceiro agravante (31/08/2026):** o plano Free do Supabase **não tem backup automático** —
é recurso do Pro para cima. Não existe ponto de restauração nenhum hoje. DDL destrutivo aplicado
aqui é definitivo até que a rotina própria de `pg_dump` exista.

> **Pergunta obrigatória:** este SQL precisa rodar antes ou depois do deploy do código? É
> reversível? Se não for, qual é o rollback?

---

## 12. 🔁 Arquivo "idempotente" que deixou de ser

**Incidente (descoberto em 24/08/2026, ainda não corrigido):** o cabeçalho do `sql/006` afirma
que reaplicá-lo é um no-op, porque foi extraído do banco com `pg_get_viewdef`. Deixou de ser
verdade: o `sql/008` redefiniu a `view_user_fastest_binge` com filtros de plausibilidade (3+
episódios, 5 min de intervalo). **Reaplicar o `006` hoje reverteria essa correção** e traria de
volta o recorde falso de "2 eps em 0min", sem erro nenhum.

O mesmo vale para o `sql/003`: redefinido pelo `008`, e de novo pelo `013`.

**Regra:** antes de editar ou reaplicar qualquer arquivo antigo do `sql/`, procure por
`CREATE OR REPLACE VIEW <nome>` em **todos** os arquivos de número maior. O número mais alto é a
definição viva — não o arquivo onde a view nasceu.

**Corolário para correções:** correção de view vai sempre num arquivo **novo**, nunca editando o
antigo. Editar o `003` para corrigir a afinidade teria revertido o tier `'ignorado'` do `008`.

**Agravante desde o `sql/017`:** reaplicar um `CREATE OR REPLACE VIEW` antigo também derruba o
`security_invoker` da view, porque nenhum arquivo anterior ao `017` traz a cláusula. A view volta
a rodar como `postgres` sem que nada acuse (item 2).

> **Pergunta obrigatória:** este objeto é redefinido em algum arquivo `sql/` de número maior?
> Estou editando a definição viva ou uma cópia morta?

---

## 13. 🥧 Gráfico de fatias que não cobre o denominador

**Incidente (26/08/2026, issue #76):** a Distribuição por Status somava ~60% em vez de
100%. Um pedaço escuro do donut ficava sem legenda nenhuma.

**Causa:** o denominador era `total_animes` — a contagem de **todas** as entradas do deck —
mas a `view_user_stats` só devolvia quatro dos cinco status. Os 27 animes em
"Quero Assistir" (40% do deck) não tinham fatia nem linha na legenda. O React estava
correto: ele não desenha um campo que nunca chega.

**O que torna isso silencioso:** cada fatia individualmente estava certa, e a soma errada
só aparece para quem para e soma. Um status novo criado no futuro reproduz o mesmo bug do
mesmo jeito.

**Detalhe de implementação que vai reaparecer:** `CREATE OR REPLACE VIEW` só permite
acrescentar coluna **no fim**. Por isso `quero_assistir` ficou depois de
`tempo_total_minutos`, fora da ordem lógica. Inserir no meio exige `DROP VIEW` + recriar,
o que derruba as permissões e qualquer view que dependa dela.

**Nota de estado:** não existe nenhuma entrada com status `Dropado` no banco. O `0%` na
tela é dado real, não defeito.

> **Pergunta obrigatória:** as categorias que este gráfico desenha cobrem **todas** as que
> o denominador conta? Se eu somar as fatias, dá 100%?

---

## 14. 🧪 Teste que valida o caminho errado depois de mudança no handler

**Incidente (26/08/2026):** `TestHandleCreate_CorpoInvalido` esperava 400 e recebia 401.
O teste montava o contexto só com `UserIDKey`, mas o handler passou a exigir também
`TokenKey` — e cortava em 401 antes de chegar na validação do corpo.

**O que torna isso silencioso:** o teste falha, mas pela razão errada. Lido rápido, parece
bug de autenticação no handler. Na prática o handler estava certo e o teste é que ficou
para trás.

> **Pergunta obrigatória:** quando um handler ganha uma dependência nova do contexto, quais
> testes montam esse contexto à mão e precisam acompanhar?

---

## 15. 🔓 Policy `USING (true)` numa tabela de configuração

**Incidente (28/08/2026):** a `app_settings` tinha policies de SELECT e UPDATE com
`USING (true)`. Qualquer visitante podia reescrever a tabela com a ANON_KEY, que é pública.

**O que torna isso silencioso:** RLS estava **habilitada**. O painel do Supabase mostra a
tabela como protegida, e existem policies — elas só não restringem nada. Uma tabela sem RLS
chama atenção; uma com RLS e policy permissiva parece resolvida.

**Como foi descoberto:** por acidente. Um upsert falhou porque não havia policy de INSERT,
e essa ausência era o único obstáculo real à escrita anônima.

**Corolário (31/08/2026):** contar policies não diz nada — `USING (true)` e
`USING (is_admin())` contam como 1 do mesmo jeito. Auditoria de permissão só vale lendo o
predicado, ou testando com `SET LOCAL ROLE` (item 2).

> **Pergunta obrigatória:** as policies desta tabela restringem alguma coisa, ou só existem?
> Rodar `SET ROLE anon` e tentar escrever responde em 10 segundos.

---

## 16. 0️⃣ Campo numérico ausente vira `0`, não `NULL`

**Incidente (30/08/2026):** o console acusava `Encountered two children with the same key, 0`
centenas de vezes por carregamento na tela de Detalhes.

**Causa:** `custom_characters` é gravado como `{name, image, role}` — sem `id`, porque não existe
id a informar no Painel Admin. O Go desserializa esse JSON em `[]anilist.Character`, cuja struct
tem `ID int`. Campo ausente assume o **zero value**, então todo personagem curado sai da API com
`id: 0`, e o `key={char.id}` da lista virava `0` repetido.

**O que torna isso silencioso:** nada quebra na tela. O React apenas fica livre para reaproveitar
o componente errado ao atualizar a lista — estado de um item aparecendo em outro. E só se
manifesta em animes **curados**: um anime que vem direto da AniList traz ids reais e não
reproduz.

**O zero tem duas origens, e a segunda é pior.** A primeira é a curadoria não
preencher um campo que não existe no Painel Admin. A segunda é a **própria
AniList devolver `null`** — em Frieren, uma relação vem com `idMal: null`, e o
`int` do Go a converte em `0` do mesmo jeito.

Essa segunda causou dano real ao usuário: a tela montava `<Link to="/anime/0">`,
e clicar levava a um `503 "Catálogo indisponível"`. Uma falha de catálogo
aparente, por um link que nunca deveria ter existido.

Ao investigar as chaves, a troca de `key={index}` por `mal_id` nas relações
quase foi aplicada — e teria criado o mesmo bug que estava sendo consertado.

**Relação com o item 5:** lá a distinção é `NULL` × array vazio no Postgres. Aqui é ausência ×
zero value na fronteira Go → JSON. Mesma classe de erro, camada diferente: em ambas, "não tem
valor" vira um valor que parece legítimo.

Corrigido em 30/08/2026 na raiz: `Character.ID` e `RelationEntry.MalID` viraram
`*int` com `omitempty`, então ausente sai do JSON em vez de virar `0`. O
`key={char.id || char.name}` continua como defesa de sobra.

Os outros 16 campos `int` de `internal/anilist/` foram verificados contra a API
no ar e vêm sempre preenchidos — mas isso é observação, não garantia.

**Terceira manifestação (08/09/2026), agora na gravação e não na leitura.** O
`CuratedAnime.MalID` também é `int`, e o `HandleCreate` gravava sem validar: um
payload sem o campo virava `mal_id = 0` no banco, silenciosamente. A única trava
era o `if (!malId)` do formulário, contornável por requisição direta. O mesmo
`idMal: null` da AniList chegava no `setMalId` do Painel e derrubava o
salvamento com a mensagem errada ("Busque um anime e defina um título"),
mandando o diagnóstico para o lado errado. Corrigido com `ValidarMalID` no
servidor e campo editável na tela. **Aqui o `MalID` não virou ponteiro de
propósito:** ausência de `mal_id` é erro, não "sem valor" — ponteiro deixaria
o `nil` atravessar até o banco. A regra do item continua valendo para campo
que pode legitimamente não existir.

> **Pergunta obrigatória:** este campo numérico pode chegar ausente — porque a
> curadoria não o preenche, ou porque a API externa manda `null`? Se puder,
> ele precisa ser ponteiro no Go. `0` não é "sem valor": é um número válido que
> colide com todos os outros ausentes, e vira link para `/anime/0`.

---

## 17. 🎨 Classe do Tailwind montada por interpolação nunca é gerada

**Incidente (30/08/2026):** descoberto de raspão, ao verificar o CSS compilado durante a
tokenização das cores (#88). As classes `card-g1` a `card-g5` estavam definidas como
`@utility` no `index.css`, mas **nenhuma das cinco aparecia no bundle**. Os cards de anime sem
capa mostravam fundo liso desde sempre — o gradiente de fallback nunca existiu na tela.

**Causa:** o Tailwind v4 varre o código-fonte procurando nomes de classe **literais** e só emite
o utilitário para os que encontra. Os cinco pontos de uso montavam o nome por interpolação:

```tsx
gradientClass={`card-g${(index % 5) + 1}`}   // o scanner nunca vê "card-g1"
```

**O que torna isso silencioso:** absolutamente nada acusa. O TypeScript compila — é uma string
válida. O ESLint não tem o que dizer. O build passa. A classe até **aparece no DOM**, no
`class` do elemento, exatamente como escrita. O que não existe é a regra CSS correspondente, e
o navegador ignora classe sem regra em silêncio. Inspecionar o elemento mostra a classe lá e
não explica por que nada acontece.

**O agravante:** o projeto **já sabia disso**. O `StatCard.tsx` tem um comentário explicando a
mesma armadilha, escrito quando alguém tentou gerar `border-t-${cor}` e mapeou os valores
explicitamente para contorná-la. Saber num arquivo não impediu de repetir em cinco outros —
`MeuDeck`, `Busca`, `Calendario`, `SheetDeAnimes` e `VitrineDestaques`.

**Como achar:** procurar por caractere de nome de classe colado num `${`. Uma varredura por
`([A-Za-z][A-Za-z0-9-]*)\$\{` sobre o `client/src` encontra todos os casos. Atenção aos falsos
positivos: interpolar a string de classe **inteira** (`` `${base} text-coral` ``, ou o retorno de
uma função como `getCategoryTheme`) é seguro, porque o literal existe em algum arquivo varrido.
O perigo é interpolar o **sufixo**.

Corrigido em 30/08/2026: os cinco nomes passaram a viver escritos por extenso num array em
`deckHelpers`, atrás de `gradienteDoCard(indice)`. É o que o `StatCard` já fazia.

> **Pergunta obrigatória:** este nome de classe existe literal em algum arquivo que o Tailwind
> varre? Se ele é montado com `${...}`, a regra CSS não vai existir — e nada vai te avisar.
> Escreva os nomes por extenso num array e indexe.

## 18 — `supabase_auth_admin` não enxerga o schema `public`

Função Postgres usada como Auth Hook roda com o papel `supabase_auth_admin`, e esse
papel **não tem acesso ao schema `public` por padrão**. Conceder `execute` na função
não basta:

```sql
grant usage on schema public to supabase_auth_admin;
grant execute on function public.minha_funcao to supabase_auth_admin;
revoke execute on function public.minha_funcao from authenticated, anon, public;
```

E se a função lê alguma tabela com RLS, o `supabase_auth_admin` precisa passar por
alguma policy — ele não é dono da tabela e não escapa da RLS. No caso do
`hook_limite_cadastros` funcionou sem policy nova porque `app_settings` tem `SELECT`
para `public` com `USING (true)`, e `public` cobre qualquer papel. Numa tabela com
policy restritiva, o hook falharia em silêncio.

**Por que dói:** hook com erro de permissão não avisa em lugar nenhum óbvio — ele
simplesmente derruba o cadastro de todos os usuários. Por isso a função deve ser
testada por chamada direta no SQL Editor **antes** de ser ativada no painel:

```sql
select public.hook_limite_cadastros('{"user":{"email":"teste@exemplo.com"}}'::jsonb);
```

`{}` significa liberado. Objeto com `error` significa bloqueado. Erro de permissão
aparece aqui, onde não machuca.

**Pergunta obrigatória ao mexer em Auth Hook:** o `supabase_auth_admin` tem `usage`
no schema e passa pelas policies de toda tabela que a função lê?

---

## 19. 🗺️ Mapa cravado no Go que duplica o que a `genre_taxonomy` já sabe

**Incidente (08/09/2026):** o chip "Magia" na Busca devolvia **"Nada encontrado"**, enquanto
"Fantasia", "Ação" e os outros funcionavam. Vários animes exibiam o selo "Magia" no próprio card
da tela que dizia não ter achado nada.

**Causa:** o `filters.ts` manda o `value` do chip, que é o termo da AniList **em inglês**
(`{ label: 'Magia', value: 'Magic' }`). A curadoria guarda o rótulo **em português**
(`custom_tags: ["Magia", ...]`). Quem faz a ponte é o mapa `equivalentes`, cravado no
`search.go` — e ele **não tinha a chave `"magic"`**. Sem chave, o `mesmoRotulo` cai no
`EqualFold("Magic", "Magia")`, dá falso, e o anime é descartado.

**Não era um caso isolado: faltavam 12 das 17 chaves de tag.** `Magic`, `Demons`, `Military`,
`Samurai`, `Seinen`, `Shoujo`, `Yuri`, `Super Power`, `Video Games`, `Boys' Love`,
`Female Harem` e `Male Harem`. Os 17 gêneros estavam todos cobertos — só as tags foram
esquecidas quando a lista de chips cresceu.

**O que torna isso silencioso:** nada acusa. O mapa é um literal Go válido, o compilador não tem
o que dizer, e chave ausente num `map` devolve o zero value (slice vazio) em vez de erro. O laço
não roda, a função devolve `false`, e o anime é filtrado como se legitimamente não batesse. O
resultado é uma tela de busca vazia, indistinguível de "não existe anime dessa tag".

**O agravante que amplificou:** com a AniList fora do ar, o `HandleSearch` cai no fallback e a
resposta passa a ser **só a curadoria**. Todo curado barrado significa zero resultados. Com a
API no ar, os não curados apareceriam e os curados sumiriam no meio — falha parcial, ainda mais
difícil de notar.

**Chave morta é o mesmo defeito pelo avesso:** `harem`, `game`, `time travel` e `revenge`
existiam no mapa e **nenhum chip conseguia alcançá-las**, porque o chip manda `Female Harem` e
`Video Games`. Sobra de quando os `value` eram outros. Chave que ninguém chama não dá erro,
então nada avisa que ela apodreceu.

**Relação com o item 1:** lá a duplicação de vocabulário vive no banco, e a `genre_taxonomy`
resolve com `raw_name` → `display_name_pt`. Aqui é a **terceira** cópia da mesma informação — a
tabela sabe que `Magic` e `Magia` são a mesma coisa, e o mapa em Go repete isso à mão. Duas
fontes para o mesmo fato divergem por padrão; a única dúvida é quando.

Corrigido em 08/09/2026 completando as 12 chaves, com os rótulos conferidos contra
`SELECT custom_tags FROM curated_animes` — não contra suposição do que a curadoria usaria.
**A correção de raiz continua aberta:** derivar o mapa da `genre_taxonomy` (ver `ROADMAP.md`).

> **Pergunta obrigatória:** este mapa, lista ou `switch` em Go repete informação que já vive numa
> tabela do banco? Se sim, o que acontece quando a tabela ganhar um valor novo — alguém precisa
> lembrar de editar o Go, e quem avisa se esquecer? Chave ausente em `map` do Go não dá erro:
> devolve o zero value e o código segue como se a resposta fosse "não".

---

## ✅ Parece armadilha, mas foi verificado — não reabrir

> Cada item aqui já disparou suspeita numa sessão e foi checado **com o arquivo real na mão**.
> Estão registrados para não custarem a mesma verificação de novo. **Item só entra depois de
> verificado**, nunca por suposição — e cada um declara o que o transformaria em bug de verdade.

### `anime_community_scores` não filtra por `auth.uid()` — e está certo

**O que parece:** view sem filtro por usuário, com `security_invoker = on`. Pelo item 2, isso
devolveria vazio ou dado alheio para quem consulta com JWT comum.

**Por que está certo:** ela agrega a `nota` de **todos** os usuários de propósito — é o peso
comunitário do ranking (`pesoVotoComunitario = 350`, ver `DECISIONS.md` de 07/09). O único ponto
de leitura é `carregarVotosComunitarios()` em `internal/handlers/ranking.go`, que usa
`database.ServiceRoleClient()`. Service role ignora RLS, então a view devolve a base inteira. É
exatamente o caso de exceção previsto no comentário do `ServiceRoleClient` em
`internal/database/db.go`: worker de background, a cada 12h, sem JWT para anexar.

**Verificado em 08/09/2026** por `grep` de todos os pontos de uso no repositório, mais leitura da
atribuição do client dentro da função.

**O que faria virar bug de verdade:** qualquer leitura nova dessa view por `ClientWithToken`, ou
direto do frontend pelo PostgREST. Aí ela passa a enxergar só as notas de um usuário, e o peso
comunitário do ranking fica errado **sem erro nenhum** — o `log.Printf` de aviso ao lado só
dispara em caso de falha, e RLS recortando linha não é falha.

---

## 🧭 Como manter este arquivo

- Toda vez que um bug **silencioso** chegar a produção (não quebrou, só devolveu dado errado),
  ele vira um item aqui — com o sintoma real observado, não com a descrição teórica.
- Bug que quebra alto e claro **não** entra aqui. Este arquivo é sobre o que passa despercebido.
- A justificativa longa continua no `DECISIONS.md`. Aqui fica só o gatilho e a pergunta.
- **Armadilha corrigida é atualizada, não apagada.** Se o risco mudou de forma — como o item 1,
  onde a cobertura de idioma passou a existir mas ficou parcial — reescreva o "onde mora o risco
  hoje". Armadilha desatualizada é pior que armadilha ausente: manda a próxima pessoa investigar
  um problema que não existe mais.
- Item que deixou de ser risco de vez (código removido, coluna dropada) vira nota histórica, para
  não ser reintroduzido por alguém que não viveu o incidente.
- **A seção "Parece armadilha, mas foi verificado" segue regra própria.** Entra ali só o que foi
  checado com o arquivo na mão, com a data e a forma da verificação. Suspeita registrada como se
  fosse fato é pior que suspeita nenhuma: vira afirmação eterna que ninguém reconfere. Todo item
  precisa declarar **o que o transformaria em bug de verdade** — sem isso ele envelhece e passa a
  mentir.