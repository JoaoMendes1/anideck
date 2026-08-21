-- =============================================================================
-- 010 — Agente Olheiro: RPCs de leitura (Fase 4.5, issue #68)
-- =============================================================================
--
-- O PROBLEMA QUE ESTE ARQUIVO RESOLVE:
-- a view_user_genre_affinity tem `WHERE e.user_id = auth.uid()` dentro dela.
-- O scan do Olheiro roda por cron, sem JWT de usuário — auth.uid() é NULL e a
-- view devolveria zero linhas.
--
-- A SOLUÇÃO:
-- a lógica de afinidade sai da view e vira a função fn_user_genre_affinity(uuid).
-- A view passa a ser uma casca que chama a função com auth.uid(); o Olheiro
-- chama a mesma função com o UUID do admin. Uma implementação, dois caminhos —
-- se a taxonomia mudar, muda em um lugar só.
--
-- SEGURANÇA:
-- fn_user_genre_affinity NÃO é SECURITY DEFINER de propósito. Se fosse, qualquer
-- usuário autenticado poderia passar o UUID de outra pessoa e ler o deck alheio.
-- Como ela roda no contexto de quem chama, a RLS de media_entries continua
-- valendo. O Olheiro consegue usá-la porque é chamada de dentro de uma função
-- SECURITY DEFINER, e aí o contexto já é o do owner.
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. A lógica de afinidade, agora parametrizada
-- -----------------------------------------------------------------------------
-- Corpo idêntico ao do sql/003 — a única mudança é `auth.uid()` virar p_user_id.

CREATE OR REPLACE FUNCTION public.fn_user_genre_affinity(p_user_id UUID)
RETURNS TABLE (
    user_id           UUID,
    genre             TEXT,
    total_watched     BIGINT,
    media_nota_genero NUMERIC,
    tier              TEXT
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    WITH rotulos_brutos AS (
        SELECT
            e.user_id,
            e.mal_id,
            e.nota,
            r.raw_name
        FROM media_entries e
            LEFT JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
            LEFT JOIN curated_animes cur ON e.mal_id = cur.mal_id
            CROSS JOIN LATERAL unnest(
                COALESCE(cur.custom_tags, c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])
            ) AS r(raw_name)
        WHERE e.user_id = p_user_id
          AND e.status = ANY (ARRAY['Completo'::text, 'Em Dia'::text, 'Assistindo'::text])
    ),
    rotulos AS (
        SELECT DISTINCT
            rb.user_id,
            rb.mal_id,
            rb.nota,
            COALESCE(t.display_name_pt, rb.raw_name) AS genre,
            COALESCE(t.tier, 'genero')               AS tier
        FROM rotulos_brutos rb
        LEFT JOIN genre_taxonomy t ON t.raw_name = rb.raw_name
    )
    SELECT
        rotulos.user_id,
        rotulos.genre,
        count(*)            AS total_watched,
        round(avg(rotulos.nota), 1) AS media_nota_genero,
        rotulos.tier
    FROM rotulos
    GROUP BY rotulos.user_id, rotulos.genre, rotulos.tier
    ORDER BY (count(*)) DESC;
$$;

COMMENT ON FUNCTION public.fn_user_genre_affinity IS
    'Afinidade de gêneros de um usuário, com as 3 camadas da taxonomia. '
    'Fonte única: consumida pela view_user_genre_affinity (app) e pelo Agente Olheiro (cron).';


-- -----------------------------------------------------------------------------
-- 2. A view vira uma casca sobre a função
-- -----------------------------------------------------------------------------
-- Mesmas colunas, mesma ordem, mesmos tipos — requisito do CREATE OR REPLACE VIEW.
-- Nada muda para o frontend nem para os endpoints de Estatísticas.

CREATE OR REPLACE VIEW view_user_genre_affinity AS
SELECT
    user_id,
    genre,
    total_watched,
    media_nota_genero,
    tier
FROM public.fn_user_genre_affinity(auth.uid());


-- -----------------------------------------------------------------------------
-- 3. Perfil de gosto para o Olheiro
-- -----------------------------------------------------------------------------
-- Devolve os rótulos de maior afinidade do admin, mais a nota média geral dele.
--
-- Tags temáticas ficam de fora pelo mesmo motivo documentado no DECISIONS.md
-- para o Perfil Especialista/Explorador: aparecem em quase todo anime e não
-- discriminam gosto — sugerir por "Escolar" não diz nada.

CREATE OR REPLACE FUNCTION public.olheiro_perfil_de_gosto()
RETURNS TABLE (
    genero     TEXT,
    nota_media NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin_id   UUID;
    v_nota_media NUMERIC;
BEGIN
    SELECT a.user_id INTO v_admin_id
    FROM public.app_admins a
    ORDER BY a.created_at
    LIMIT 1;

    IF v_admin_id IS NULL THEN
        RETURN;  -- sem admin cadastrado: devolve vazio, o Go cai no trending
    END IF;

    SELECT round(avg(e.nota), 1) INTO v_nota_media
    FROM media_entries e
    WHERE e.user_id = v_admin_id AND e.nota IS NOT NULL AND e.nota > 0;

    RETURN QUERY
    SELECT
        f.genre,
        COALESCE(v_nota_media, 0)
    FROM public.fn_user_genre_affinity(v_admin_id) f
    WHERE f.tier <> 'tag_tematica'
    ORDER BY f.total_watched DESC
    LIMIT 5;
END;
$$;

COMMENT ON FUNCTION public.olheiro_perfil_de_gosto IS
    'Retrato do gosto do admin para o Agente Olheiro. SECURITY DEFINER porque o '
    'scan roda via cron sem JWT — a autorização acontece no Go pela chave secreta.';


-- -----------------------------------------------------------------------------
-- 4. Tudo que o Olheiro já conhece
-- -----------------------------------------------------------------------------
-- Junta o catálogo curado com o que já passou pela fila (pendente, curado ou
-- dispensado). Uma chamada só, em vez de uma por tabela.
--
-- Devolve int[] em vez de tabela: o Go recebe um array JSON direto, sem
-- precisar desembrulhar objetos.

CREATE OR REPLACE FUNCTION public.olheiro_mal_ids_conhecidos()
RETURNS INTEGER[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(array_agg(DISTINCT mal_id), '{}')
    FROM (
        SELECT mal_id FROM public.curated_animes
        UNION
        SELECT mal_id FROM public.curation_suggestions
    ) AS conhecidos;
$$;

COMMENT ON FUNCTION public.olheiro_mal_ids_conhecidos IS
    'IDs que o Olheiro não deve sugerir: já curados ou já revisados na fila.';


-- =============================================================================
-- CONFERÊNCIA (rodar logado como admin)
-- =============================================================================
--   SELECT * FROM view_user_genre_affinity LIMIT 5;   -- deve continuar igual
--   SELECT * FROM public.olheiro_perfil_de_gosto();   -- até 5 rótulos
--   SELECT public.olheiro_mal_ids_conhecidos();       -- array de IDs
-- =============================================================================