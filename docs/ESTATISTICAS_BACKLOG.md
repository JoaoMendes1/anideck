# 📊 Estatísticas — Backlog e Ideias

> Documento de trabalho da sessão de 20/08/2026.
> Consolida o que foi entregue, o que ficou pendente e todas as ideias levantadas
> para a evolução da página de Estatísticas do AniDeck.

---

## 1. Entregue nesta sessão

### #65 — `fix(stats)`: tempo assistido usando `episode_progress` como fonte de verdade

**Problema:** a view `view_user_stats` foi escrita antes da Fase 6.7 existir. Ela calculava o
tempo assistido assim: se o status fosse `Completo`, contava o **total teórico de episódios do
anime** (`anime_metadata_cache.episodes`); caso contrário, contava a coluna antiga
`media_entries.progress`. A tabela `episode_progress` — que virou a fonte de verdade sobre o que
o usuário realmente assistiu — era completamente ignorada.

**Efeitos práticos:**
- Marcar um episódio individual **não registrava minuto nenhum** nas estatísticas.
- Animes "Assistindo" e "Em Dia" contavam zero tempo, porque `progress` nunca era escrito.
- Animes "Completo" contavam o anime inteiro, mesmo que poucos episódios tivessem sido marcados.

**Correção:** o cálculo passou a ser a contagem real de linhas em `episode_progress`
(por `user_id` + `mal_id`) multiplicada por `duration_minutes`, com fallback de 24 min.

**Decisão tomada:** animes completados **antes** da Fase 6.7 não têm registro em
`episode_progress` e por isso tiveram o tempo zerado. Optou-se conscientemente por **não** criar
fallback nem script de retroalimentação — o usuário vai remarcar manualmente.

---

### 🔒 Correção de segurança: vazamento de dados entre usuários

**Descoberto durante o teste no Postman.** O campo `overview` estava retornando as estatísticas
de **dois usuários diferentes** no mesmo array.

**Causa:** RLS (Row Level Security) é aplicada nas *tabelas*, mas uma view no Postgres **não
herda automaticamente** a política de RLS da tabela base em relação a quem está consultando — ela
roda com o contexto de quem a criou (o owner), não do usuário autenticado. Resultado: as views
enxergavam as linhas de todos os usuários.

**Correção:** filtro explícito `WHERE user_id = auth.uid()` adicionado em **todas** as views.

> ⚠️ **Regra para o futuro:** toda view nova que exponha dados de usuário precisa desse filtro
> explícito. Não confiar na RLS da tabela base.

---

### 🔧 Correção: duplicata de gênero na Afinidade

"Fantasia" aparecia duas vezes no ranking (uma com 13, outra com 5).

**Causa:** gêneros vinham em dois idiomas misturados — em inglês pelo `anime_metadata_cache`
(`"Fantasy"`, traduzido só na hora de exibir) e em português pelo `curated_animes.custom_tags`
(`"Fantasia"`, cadastrado manualmente no Painel Admin). Como o `GROUP BY` acontecia antes da
tradução, viravam duas chaves distintas.

**Correção:** tradução movida para **dentro da view**, via tabela `VALUES` de-para, antes do
agrupamento. O `traduzirGenero` do frontend permanece como fallback.

---

### #67 — `feat(stats)`: novos indicadores

| Indicador | Fonte | Como funciona |
|---|---|---|
| **Atividade Recente** | `episode_progress.watched_at` | Episódios marcados por semana, últimas 8 semanas |
| **Distribuição de Notas** | `media_entries.nota` | Histograma: quantos animes receberam cada nota |
| **Distribuição por Ano** | `anime_metadata_cache.season_year` | ⚠️ Vazio — ver pendência #2 |
| **Streak** | `episode_progress` + Go | Dias consecutivos assistindo (atual e recorde) |
| **Padrão de Horário** | `EXTRACT(HOUR FROM watched_at)` | Agrupado em Madrugada/Manhã/Tarde/Noite |
| **Recordes Pessoais** | várias | Maior maratona, nota mais alta, maratona mais rápida |

**Nota sobre o streak:** a lógica de dias consecutivos (*gaps and islands*) foi implementada em
**Go**, não em SQL — `CalculateStreak` em `internal/handlers/streak.go`, com testes unitários
cobrindo streak ativo, quebrado, sem dados e data inválida. A view apenas devolve as datas
distintas.

---

### ⏳ Pendente de aplicação

**Refinamento de layout mobile** — código pronto, aguardando João sair do celular para aplicar:
- Cards de Streak estavam **cortando na borda da tela** (usavam `StatCard`, que tem largura fixa
  pensada para listas com scroll horizontal). Trocados por markup próprio em `grid-cols-2`.
- Cards do topo empilhavam em coluna única no mobile → agora `grid-cols-3` sempre, com fonte e
  padding reduzidos via `sm:`.
- Títulos de anime nos Recordes cortavam no meio (`truncate`) → agora `line-clamp-2`.

---

## 2. Dívidas técnicas identificadas

### 2.1 SQL das views não está versionado
As views existem **apenas no painel do Supabase**. Não há pasta de migrations no repositório.
Se o projeto for perdido ou precisar ser recriado, essa lógica se perde.

**Sugestão:** criar `sql/` ou `docs/schema.sql` no repo com o DDL de todas as views e tabelas.

### 2.2 Re-sincronização do cache será necessária
As mudanças planejadas (tags da AniList, `season_year`) só afetam animes sincronizados **depois**
da alteração. Os animes já cadastrados precisarão de um novo `syncMetadataCacheAsync` — via
script pontual ou re-salvando cada entrada.

### 2.3 Coluna `media_entries.progress` ficou órfã
Depois da correção #65, essa coluna não é mais lida por nada. Avaliar se ainda é escrita em algum
lugar do app e, se não for, considerar remoção.

---

## 3. Backlog — Prioridade Alta

> Itens que corrigem comportamento errado ou incompleto.

### 3.1 🏷️ Taxonomia própria do AniDeck (3 camadas)

**A ideia central:** o AniDeck **não deve espelhar a taxonomia da AniList**. A AniList trata
"Isekai" como uma *tag* secundária, mas na conversa real entre quem assiste anime, Isekai é a
categoria principal — *"Que tipo de anime é?" "É um Isekai de magia."* Se o AniDeck só reproduz a
classificação de outra plataforma, ele perde a razão de existir.

**O problema técnico atual:** o `syncMetadataCacheAsync` (em `entries.go`) só busca
`anime.Genres` da AniList. Nunca busca `anime.Tags`. Como Isekai é uma tag e não um genre, ele
**nunca** entra no cache automaticamente — só aparece nos poucos animes curados manualmente com
`custom_tags` no Painel Admin. É por isso que Isekai não aparece nas estatísticas mesmo com vários
animes do gênero cadastrados.

**Proposta — três camadas:**

**Camada 1 — Demografias e Mercados**
Categorias com mercado comercial próprio. Competem entre si por atenção do usuário.
- Shounen — público jovem masculino
- Shoujo — público jovem feminino
- Seinen — público masculino adulto
- Isekai — transporte para outro mundo; tem mercado literário próprio
- Mecha — robôs gigantes; move bilhões em licenciamento e brinquedos
- Slice of Life — narrativa lenta focada estritamente na rotina
- Boys Love / Yuri — nichos comerciais isolados e independentes

**Camada 2 — Gêneros Narrativos**
O clássico. Ação · Aventura · Comédia · Drama · Esporte · Fantasia · Ficção Científica ·
Horror · Mistério · Romance · Suspense

**Camada 3 — Tags Temáticas**
> Não formam categorias comerciais sozinhas. Servem para detalhar cenário, ferramentas ou
> personagens da obra.

Artes Marciais (estilo de combate) · Demônios (tipo de criatura) · Ecchi (elemento visual
sensual) · Escolar (cenário) · Harém ele/ela (estrutura de relacionamento) · Histórico (época) ·
Jogo (elemento temático) · Magia (sistema de poder) · Militar (contexto) · Musical (tema de
fundo) · Psicológico (abordagem narrativa) · Samurai (tipo de guerreiro/época) · Sobrenatural
(elemento de roteiro) · Super Poderes (mecânica de combate)

**Implementação sugerida:** tabela no banco em vez de lista hardcoded em Go, para permitir
edição sem deploy — e, no futuro, uma tela no Painel Admin.

```sql
CREATE TABLE genre_taxonomy (
  raw_name        TEXT PRIMARY KEY,   -- como vem da AniList: 'Isekai', 'Action'
  display_name_pt TEXT NOT NULL,      -- 'Isekai', 'Ação'
  tier            TEXT NOT NULL
    CHECK (tier IN ('demografia', 'genero', 'tag_tematica'))
);
```

**Impacto na tela:** a Afinidade de Gêneros ganharia seções ou abas separadas para
"Demografias" e "Gêneros". As Tags Temáticas sairiam do ranking competitivo — apareceriam como
badges informativos, não como estatística.

**Bloqueio:** precisa do arquivo do client da AniList (`internal/anilist/`) para saber se a query
GraphQL já pede o campo `tags` e qual o formato da struct de resposta.

---

### 3.2 📅 `season_year` nunca é preenchido

A coluna existe em `anime_metadata_cache`, mas o payload do `syncMetadataCacheAsync` não a
inclui. Por isso o gráfico "Distribuição por Ano de Lançamento" está permanentemente vazio.

Mesmo bloqueio da 3.1: precisa do client da AniList para saber o nome do campo de ano/temporada
na resposta da API. Faz sentido resolver junto com as tags, já que é o mesmo arquivo.

---

### 3.3 🕐 Cold-start do Padrão de Horário

**O problema:** `watched_at` registra **quando o episódio foi marcado**, não quando foi assistido.
Um usuário novo que importar o backlog inteiro numa sentada às 23h vai receber um gráfico dizendo
que ele é espectador noturno — quando na verdade ele só cadastrou tudo de uma vez.

**Duas camadas de solução:**

**Curto prazo:** só exibir a frase de insight ("Você assiste mais de manhã") depois de atividade
em pelo menos ~10 dias distintos. A view `view_user_watch_dates` (já criada para o streak) serve
para isso. Antes disso, mensagem neutra: *"Continue registrando episódios pra desbloquear seu
padrão de horário."*

**Médio prazo:** contar **sessões** em vez de episódios individuais. 20 episódios marcados em 5
minutos é *uma* sessão de maratona, não 20 eventos de comportamento independentes. Isso resolve o
problema de raiz — não só no dia 1, mas sempre que houver um import em lote. Exige lógica de
agrupamento por gap de tempo, similar à do streak.

---

## 4. Backlog — Prioridade Média

> Features novas que agregam valor real.

### 4.1 🖱️ Drill-down clicável

**A pergunta que a tela não responde hoje:** *"assisti 30 animes de Fantasia — mas quais?"*

Clicar num gênero (ou em qualquer barra do gráfico) abre um `Sheet` com os animes daquela
categoria. Reaproveita componentes que já existem: `Sheet.tsx` e o `AnimeCard` unificado.

Backend: endpoint novo tipo `GET /api/stats/genre/{genre}` retornando as `media_entries` do
usuário filtradas por gênero.

**Observação:** a Distribuição por Status não precisa disso — o Meu Deck já permite ver os animes
por status.

---

### 4.2 📈 Gráfico de quadrantes (volume × satisfação)

**Origem da ideia:** a vontade de ver "categoria que menos assisto" e "animes que não gosto".
São duas perguntas diferentes — uma é sobre **volume**, a outra sobre **satisfação**.

A boa notícia: a view `view_user_genre_affinity` **já calcula** `media_nota_genero` junto de
`total_watched`. Os dois dados existem, só nunca foram cruzados.

Cada gênero vira um ponto num gráfico — eixo X = quantidade assistida, eixo Y = nota média:

| | **Nota alta** | **Nota baixa** |
|---|---|---|
| **Muito assistido** | Zona de conforto de verdade | Assiste por hype/hábito, mas não curte |
| **Pouco assistido** | Gostou do pouco que viu → explorar mais | Realmente não é pra você |

**Trade-off a decidir:** o quadrante é mais rico, mas exige mais do usuário para "ler". A
alternativa mais simples seria dois cards separados ("gênero que menos assiste" + "gênero com pior
nota") — mais óbvio de entender, menos sofisticado. **Decisão ainda em aberto.**

---

### 4.3 📊 Comparação temporal

Em vez de só "38 episódios essa semana", mostrar a variação: *"↑ 40% em relação ao mês passado"*.
Dá senso de progressão em vez de uma foto estática. Usa os mesmos dados de `episode_progress`.

---

### 4.4 ⏰ Anime esquecido

De tudo que está "Assistindo", qual está há mais tempo sem nenhum episódio novo marcado?

**Diferencial:** não é estatística sobre o passado — é **acionável**. Vira um lembrete
*"ei, você tinha esse aqui na fila"*, com link direto para a tela do anime.

---

### 4.5 🎯 Taxa de conclusão

Usando `completos` / `dropados` / `assistindo` / `em_dia`: *"de cada 10 animes que você começa,
você termina 7."*

**Cuidado de UX:** pode soar como cobrança. Ninguém gosta de ler "você dropa 30%". Enquadrar como
curiosidade, não como métrica de desempenho.

---

### 4.6 🧭 Perfil: Especialista vs Explorador

Baseado em quão concentrada ou dispersa é a Afinidade de Gêneros. Se 80% do consumo está em dois
gêneros → "especialista". Se está distribuído entre oito → "explorador".

Menos uma métrica fria, mais um dado de personalidade sobre o próprio gosto.
**Ponto em aberto:** definir o threshold sem que fique arbitrário.

---

## 5. Backlog — Prioridade Baixa

### 5.1 ✨ Animação e microinterações

Dar mais vida aos gráficos: barras que crescem ao entrar na viewport, hover states, transições.
É o item que menos muda a **substância** da página — vale deixar para depois que o conteúdo
estiver certo.

---

## 6. Ideias avaliadas e descartadas

| Ideia | Motivo |
|---|---|
| **Afinidade por estúdio** | Não desperta interesse suficiente no momento |
| **Contar só o "gênero principal"** (primeira posição do array) | Não resolveria o caso do Isekai (ele não é um genre, é uma tag — o problema é a fonte de dados, não a ordem). Além disso, a ordem do array da AniList não tem semântica oficial de relevância. Alternativa melhor, se a diluição incomodar depois: **peso fracionário** — cada anime contribui `1/N` para cada um dos N gêneros que possui |

---

## 7. Para registrar no `DECISIONS.md`

1. **Tempo assistido** passou a derivar de `episode_progress`. Animes completados antes da
   Fase 6.7 foram zerados por decisão consciente — sem fallback, sem script retroativo.
2. **Views precisam de `auth.uid()` explícito.** Uma view no Postgres não herda a RLS da tabela
   base em relação a quem consulta. Regra válida para toda view futura.
3. **A taxonomia de gêneros do AniDeck é própria e não espelha a da AniList.** Isekai tratado
   como categoria principal (demografia/mercado) é o caso que motivou a decisão.
4. **Lógica de sequência (streak) fica em Go, não em SQL.** Mais legível, testável e mais fácil
   de manter do que uma solução de *gaps and islands* em SQL puro.

---

## 8. Próximo passo sugerido

Abrir um chat novo com o dump atualizado do projeto + este documento, e começar pela **frente 3.1
(taxonomia)** — que desbloqueia junto a **3.2 (`season_year`)**, já que ambas dependem do mesmo
arquivo do client da AniList.
