-- 017_security_invoker_views.sql
--
-- Liga security_invoker nas 16 views do schema public.
--
-- POR QUE
-- View no Postgres roda, por padrao, com os privilegios de quem a CRIOU. Todas
-- as views daqui foram criadas por `postgres` (superusuario), que ignora RLS.
-- Consequencia: a RLS das tabelas-base nunca era consultada, e o unico obstaculo
-- ao vazamento entre usuarios era o `WHERE user_id = auth.uid()` escrito a mao
-- em cada view. Foi a ausencia desse filtro que causou o incidente de 20/08/2026
-- (endpoint de estatisticas devolvendo dados de dois usuarios no mesmo array).
--
-- Com security_invoker = on, a view passa a rodar no contexto de QUEM CONSULTA e
-- a RLS da tabela-base volta a valer sozinha. O filtro explicito CONTINUA em todas
-- as views e nao deve ser removido: o objetivo e ter duas camadas, no mesmo padrao
-- do `WITH CHECK` da Armadilha 7 (o Go forca o user_id E a policy confere).
--
-- O que isso muda na pratica: view nova criada sem o filtro deixa de vazar. Hoje
-- a protecao depende de ninguem esquecer; depois disto, esquecer nao e suficiente
-- para vazar. Motivador imediato: a Fase 7 (beta fechado) traz usuarios reais.
--
-- Fecha tambem os 16 alertas "Security Definer View" (CRITICAL) do Advisor do
-- Supabase, que sinalizam exatamente essa configuracao.
--
-- REQUISITO: PostgreSQL 15+. Confirmado no projeto em 31/08/2026.
--
-- IDEMPOTENTE: reaplicar e no-op. `view_user_stats` ja foi ligada a mao em
-- 31/08/2026, durante a validacao; esta incluida aqui de proposito, para que o
-- arquivo seja o registro completo do estado e um banco recriado do zero nao
-- dependa daquele passo manual.
--
-- ORDEM: rodar em qualquer momento, independente do deploy de codigo. Nao altera
-- schema, nao altera dado, nao altera assinatura de nenhuma view. O backend nao
-- precisa saber que isto existe.
--
-- ROLLBACK: trocar `on` por `off` nas mesmas 16 linhas. Reversivel por completo,
-- sem perda de dado. Aplicar TODAS de uma vez, nos dois sentidos: view com invoker
-- ligado que consulta outra ainda desligada continua lendo a segunda como owner,
-- entao estado misto protege menos do que parece.
--
-- VALIDACAO FEITA ANTES DE ESCREVER ESTE ARQUIVO (31/08/2026)
--   1. As 16 views ja tinham `auth.uid()` no corpo (consulta em pg_class).
--   2. `view_user_stats` ligada isolada em producao: Estatisticas seguiram
--      corretas na conta admin.
--   3. Mesma view testada na segunda conta (usuario comum, sem privilegio de
--      admin): cards renderizaram com dado proprio, e o tempo assistido saiu de
--      0h para 1h depois de marcar 3 episodios -- o join com episode_progress e
--      anime_metadata_cache foi exercitado de verdade.
--   4. As outras 15 aplicadas dentro de BEGIN/ROLLBACK, com
--      `SET LOCAL ROLE authenticated` e claims da segunda conta: todas as views
--      com dado a devolver devolveram. As que vieram 0 tem motivo proprio
--      (sem nota cadastrada, sem maratona plausivel, sem rotulo orfao), nao
--      falta de permissao.
--   O ponto 4 e o que descarta o risco principal: view_user_genre_affinity e
--   view_user_genre_animes cruzam curated_animes e genre_taxonomy, cujas policies
--   nao tinham sido auditadas linha a linha. Vieram com dado -- a leitura por
--   usuario comum esta liberada nas duas.
--
-- FORA DE ESCOPO
--   - Os alertas da aba Performance (Auth RLS Initialization Plan e Multiple
--     Permissive Policies). Sao lentidao, nao risco. Issue propria.
--   - O recorte por usuario da view_unmapped_labels. E decisao de produto, nao
--     de permissao. Issue propria.

-- Estatisticas do usuario
ALTER VIEW view_user_stats               SET (security_invoker = on);
ALTER VIEW view_user_activity            SET (security_invoker = on);
ALTER VIEW view_user_genre_affinity      SET (security_invoker = on);
ALTER VIEW view_user_rating_distribution SET (security_invoker = on);
ALTER VIEW view_user_year_distribution   SET (security_invoker = on);
ALTER VIEW view_user_watch_hours         SET (security_invoker = on);
ALTER VIEW view_user_watch_dates         SET (security_invoker = on);
ALTER VIEW view_user_watch_timestamps    SET (security_invoker = on);

-- Recordes pessoais
ALTER VIEW view_user_longest_anime       SET (security_invoker = on);
ALTER VIEW view_user_top_rated           SET (security_invoker = on);
ALTER VIEW view_user_fastest_binge       SET (security_invoker = on);
ALTER VIEW view_user_forgotten_anime     SET (security_invoker = on);

-- Drill-down (Sheet com os animes por tras do numero)
ALTER VIEW view_user_genre_animes        SET (security_invoker = on);
ALTER VIEW view_user_year_animes         SET (security_invoker = on);

-- Diagnostico (leitura do admin, nao do usuario final)
ALTER VIEW view_unmapped_labels          SET (security_invoker = on);
ALTER VIEW view_episode_progress_orphans SET (security_invoker = on);


-- CONFERENCIA: rodar depois de aplicar. Espera-se `on` nas 16 linhas.
-- View que nao aparecer aqui e view criada depois deste arquivo -- e provavelmente
-- nasceu sem o invoker, porque o default do Postgres continua sendo `off`.
SELECT c.relname AS view,
       COALESCE((SELECT option_value
                 FROM pg_options_to_table(c.reloptions)
                 WHERE option_name = 'security_invoker'), 'off') AS invoker
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v' AND n.nspname = 'public'
ORDER BY invoker, c.relname;