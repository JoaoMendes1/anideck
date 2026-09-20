-- 037_olheiro_demanda.sql
-- A aba Demanda do Olheiro: anime que alguém tem no deck e o catálogo não cobre.
--
-- A diferença para a aba Sugestões é a origem do sinal. Lá a AniList diz "este
-- anime é bem avaliado"; aqui alguém do AniDeck já o adicionou. O segundo é
-- demanda real, e por isso não passa por pontuação de afinidade: ele entra por
-- existir, e a ordem é quantas pessoas o têm.
--
-- SECURITY DEFINER é obrigatório: a RLS da media_entries recorta por auth.uid(),
-- então uma view comum devolveria só o deck de quem chama. A função atravessa a
-- RLS de propósito, e o is_admin() no corpo é o que mantém isso fechado.
--
-- Nada é gravado em curation_suggestions: a lista é lida na hora, sempre atual.
-- Fila gravada precisaria de limpeza quando o anime fosse curado por outro
-- caminho, e isso é estado duplicado para nada.

CREATE OR REPLACE FUNCTION public.listar_demanda_curadoria()
RETURNS TABLE (
    mal_id         INTEGER,
    titulo         TEXT,
    total_usuarios BIGINT,
    tem_admin      BOOLEAN,
    usuarios       TEXT[],
    ultimo_add     TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        e.mal_id,
        -- O cache é a única fonte de título aqui: o anime não está curado, por
        -- definição. Sem ficha no cache, o Go mostra o mal_id.
        MAX(c.title)                                             AS titulo,
        COUNT(DISTINCT e.user_id)                                AS total_usuarios,
        bool_or(a.user_id IS NOT NULL)                           AS tem_admin,
        ARRAY_AGG(DISTINCT COALESCE(u.email, e.user_id::text))   AS usuarios,
        MAX(e.created_at)                                        AS ultimo_add
    FROM public.media_entries e
        LEFT JOIN public.anime_metadata_cache c ON c.mal_id = e.mal_id
        LEFT JOIN public.app_admins a           ON a.user_id = e.user_id
        LEFT JOIN auth.users u                  ON u.id = e.user_id
    WHERE public.is_admin()
      AND NOT EXISTS (
          SELECT 1 FROM public.curated_animes ca WHERE ca.mal_id = e.mal_id
      )
    GROUP BY e.mal_id
    ORDER BY
        -- O dono no meio do grupo joga o anime para o topo. Com poucos usuários
        -- é o que faz a lista ser útil; com muitos, 40 pessoas ainda ganham de
        -- um deck só, porque o bônus soma e não substitui.
        bool_or(a.user_id IS NOT NULL) DESC,
        COUNT(DISTINCT e.user_id) DESC,
        MAX(e.created_at) DESC;
$$;

-- O is_admin() está DENTRO da função, no WHERE: sem ele, qualquer usuário
-- autenticado leria o deck de todo mundo. Com ele, quem não é admin recebe
-- zero linhas — não um erro, o que é suficiente e mais simples.
REVOKE ALL ON FUNCTION public.listar_demanda_curadoria() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_demanda_curadoria() TO authenticated;

-- CONFERÊNCIA
-- SELECT * FROM public.listar_demanda_curadoria() LIMIT 10;
--
-- Esperado: animes do seu deck que não estão em curated_animes, com tem_admin
-- verdadeiro. Rodando com JWT de conta comum: zero linhas.