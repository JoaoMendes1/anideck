-- =============================================================================
-- 107_unificar_nome_exibicao.sql
-- Unifica o "Nome de exibição" (user_metadata.display_name em auth.users) com o
-- nome do perfil público (public.profiles.nome).
--
-- Regra de unificação aprovada: quando um usuário possui perfil público e os
-- dois valores divergem, prevalece public.profiles.nome. Metadados extras em
-- raw_user_meta_data (avatar_url, preferências de gosto etc.) são preservados.
-- =============================================================================

UPDATE auth.users AS u
   SET raw_user_meta_data = jsonb_set(
         COALESCE(u.raw_user_meta_data, '{}'::jsonb),
         '{display_name}',
         to_jsonb(btrim(p.nome)),
         true
       )
  FROM public.profiles AS p
 WHERE p.user_id = u.id
   AND NULLIF(btrim(p.nome), '') IS NOT NULL
   AND COALESCE(NULLIF(btrim(u.raw_user_meta_data ->> 'display_name'), ''), '') <> btrim(p.nome);
