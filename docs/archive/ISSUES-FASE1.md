# 📋 Issues — Fase 1: Fundação & Arquitetura

> Prontas para copiar direto no GitHub Projects, no modelo padrão do `AGENTS.md`. Numeração
> `#<número>` é placeholder — substituir pelo número real que o GitHub atribuir ao abrir cada uma.

---

## Issue 1

```markdown
Título: feat: Inicialização do projeto Go e estrutura de pastas #<número>

**🏷️ Labels:** `backend`, `setup`

### 🎯 Objetivo
Criar o esqueleto do backend em Go, com estrutura de pastas convencional para projetos Go+Chi
(separação clara entre handlers, middleware, banco e models), e garantir que o servidor falhe de
forma clara (fail-fast) se variáveis de ambiente essenciais estiverem faltando — evita erro
silencioso em produção.

### 📋 Tarefas
- [ ] Inicializar módulo Go com Chi como roteador.
- [ ] Criar estrutura de pastas: `cmd/web`, `internal/handlers`, `internal/middleware`,
      `internal/database`, `internal/models`.
- [ ] Rota de teste (`/health`) respondendo 200 OK.
- [ ] Validação de variáveis de ambiente no boot (`SUPABASE_URL`, `SUPABASE_PUBLIC_KEY`, `PORT`)
      — o servidor deve recusar subir e logar erro claro se alguma estiver ausente.
- [ ] `.env.example` documentando as variáveis necessárias.
- [ ] `.gitignore` cobrindo `.env`, binários compilados, etc.
- [ ] Testes unitários da validação de variáveis de ambiente (caminho feliz e cenário de erro).

### ✅ Critérios de Aceite
- [ ] `go run cmd/web/main.go` sobe o servidor localmente sem erro, com `.env` preenchido.
- [ ] Remover uma variável obrigatória do `.env` faz o servidor recusar subir, com mensagem
      de erro clara indicando qual variável falta.
- [ ] `/health` responde 200 OK.
```

---

## Issue 2

```markdown
Título: feat: Configuração do Supabase e schema inicial #<número>

**🏷️ Labels:** `backend`, `database`, `setup`, `security`

### 🎯 Objetivo
Criar a base de dados do projeto no Supabase (organização e credenciais próprias do AniDeck,
não reaproveitadas de nenhum outro projeto) e o schema inicial que guarda a relação do usuário
com os títulos — de forma genérica (preparada para mangá no futuro, mesmo que só anime seja
usado agora).

### 📋 Tarefas
- [ ] Criar organização nova no Supabase (ou usar uma existente com projeto disponível — o
      limite de 2 projetos grátis é por organização).
- [ ] Criar o projeto Supabase (Postgres + Auth) do AniDeck.
- [ ] Criar tabela `media_entries`: `id`, `mal_id`, `tipo` (`anime`/`manga`), `status`, `nota`,
      `anotacao`, `created_at`, `updated_at`.
- [ ] Configurar Row Level Security (RLS) para que cada usuário só acesse suas próprias entradas.
- [ ] Conectar o backend Go ao Supabase (variáveis de ambiente já validadas na Issue 1).

### ✅ Critérios de Aceite
- [ ] Tabela `media_entries` visível e correta no Supabase Dashboard.
- [ ] RLS testado: uma consulta autenticada como usuário A não retorna entradas do usuário B.
- [ ] Backend consegue ler/escrever na tabela via variável de ambiente configurada.
```

---

## Issue 3

```markdown
Título: feat: Cliente HTTP para Jikan API com rate limiting #<número>

**🏷️ Labels:** `backend`, `integration`

### 🎯 Objetivo
Criar um cliente HTTP em Go para consumir a Jikan API, respeitando o limite real de taxa
(~3 requisições/segundo, 60/minuto) para não ser bloqueado — com throttling e tratamento de erro
próprios, já que a Jikan não avisa educadamente quando o limite estoura.

### 📋 Tarefas
- [ ] Cliente HTTP dedicado (`internal/jikan` ou similar) com timeout configurado.
- [ ] Throttling/rate limiting no lado do nosso cliente (não confiar só no limite deles).
- [ ] Tratamento de erro para respostas 429 (rate limit) e 5xx (erro do servidor deles), com
      retry/backoff razoável.
- [ ] Função de busca básica (`/anime` com query) como primeiro caso de uso testável.
- [ ] **Lembrete de arquitetura (ver `DECISIONS.md`):** nunca persistir os dados retornados da
      Jikan permanentemente no nosso banco — só usar em tempo de resposta ou cache curto.
- [ ] Testes unitários do cliente (caminho feliz e cenário de erro/rate limit).

### ✅ Critérios de Aceite
- [ ] Busca de teste retorna resultados reais da Jikan sem estourar o limite de taxa.
- [ ] Simular um 429 da API é tratado sem derrubar o servidor.
- [ ] Nenhum dado do catálogo é gravado no banco — só passa pela memória da requisição.
```

---

## Issue 4

```markdown
Título: chore: Subir ambiente de homologação (staging) esqueleto #<número>

**🏷️ Labels:** `infra`, `setup`

### 🎯 Objetivo
Colocar o projeto esqueleto (ainda sem features) no ar em ambiente de homologação — antes de
qualquer funcionalidade real, só para validar que backend, banco e variáveis de ambiente
funcionam de verdade em produção, não só localmente.

### 📋 Tarefas
- [ ] Criar serviço de homologação no Render.
- [ ] Configurar variáveis de ambiente de produção (credenciais Supabase próprias do AniDeck,
      não reaproveitadas de nenhum outro projeto).
- [ ] Branch `staging` conectada ao deploy automático.
- [ ] Confirmar que `/health` responde 200 OK no ambiente hospedado, não só local.

### ✅ Critérios de Aceite
- [ ] URL de homologação pública responde corretamente.
- [ ] Push na branch `staging` dispara novo deploy automaticamente.
- [ ] Variáveis de ambiente de produção configuradas e funcionando (credenciais próprias do
      AniDeck, não reaproveitadas de nenhum outro projeto por engano).
```
