-- =============================================================================
-- 016 — Fecha a RLS da app_settings (descoberto em 28/08/2026)
-- =============================================================================
--
-- O PROBLEMA: as policies eram USING (true), sem restrição nenhuma. Qualquer
-- visitante do site podia reescrever a app_settings usando a ANON_KEY, que é
-- pública e vive no bundle do frontend. Como essa tabela guarda o
-- ai_curation_prompt (a System Instruction do Gemini), controlar essa linha é
-- controlar o que a IA do projeto gera.
--
-- Foi descoberto por acidente: um upsert falhou porque não existia policy de
-- INSERT, e a ausência dessa policy era a única coisa protegendo a tabela.
--
-- A SOLUÇÃO: escrita restrita a is_admin() (sql/009). Leitura permanece
-- pública de propósito — ver abaixo.
--
-- POR QUE A LEITURA CONTINUA ABERTA:
-- o cmd/web/main.go lê anilist_force_offline no boot para restaurar o Kill
-- Switch, e nesse momento não existe usuário logado: o client é o anônimo.
-- Apertar o SELECT quebraria a restauração do estado silenciosamente — o app
-- subiria online achando que está offline.
--
-- O risco aceito é pequeno: os valores aqui não são segredo (um prompt e um
-- booleano). O que importava era impedir a ESCRITA anônima.
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- =============================================================================

DROP POLICY IF EXISTS "Permitir edicao de configs"  ON public.app_settings;
DROP POLICY IF EXISTS "Permitir leitura de configs" ON public.app_settings;

-- Leitura: aberta, pelo motivo documentado acima.
CREATE POLICY "app_settings_leitura_publica"
    ON public.app_settings
    FOR SELECT
    USING (true);

-- Escrita: só admin. WITH CHECK além do USING porque o USING decide QUAIS
-- linhas podem ser alteradas e o WITH CHECK valida a linha DEPOIS da alteração;
-- sem os dois, dá para alterar uma linha permitida e gravar conteúdo proibido.
CREATE POLICY "app_settings_update_admin"
    ON public.app_settings
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "app_settings_insert_admin"
    ON public.app_settings
    FOR INSERT
    WITH CHECK (public.is_admin());

COMMENT ON TABLE public.app_settings IS
    'Configurações de runtime editáveis sem deploy. Leitura pública (o boot do '
    'Go precisa dela sem JWT); escrita restrita a is_admin().';