-- =============================================================================
-- 042_handle_reservado.sql
-- Os @ reservados (admin, administrador, anideck, moderacao...) ficam só para a
-- equipe. Antes, a reserva existia apenas no Go: com a chave pública e o próprio
-- token, qualquer conta gravaria @admin direto pela API do Supabase.
--
-- A equipe é quem está em public.app_admins (a mesma tabela do is_admin()). O
-- teste usa NEW.user_id, e não auth.uid(), porque a RLS de profiles já garante
-- que um usuário só grava a própria linha.
--
-- Pode ser aplicado antes ou depois do código. A lista precisa bater com
-- handlesReservados (internal/handlers/comunidade_regras.go) e com RESERVADOS
-- (client/src/lib/comunidade.ts).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.proteger_handle_reservado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.handle = ANY (ARRAY[
            'admin', 'administrador', 'anideck', 'moderacao', 'moderador',
            'suporte', 'sistema', 'curadoria', 'ranking', 'eu'
        ])
        AND (TG_OP = 'INSERT' OR NEW.handle IS DISTINCT FROM OLD.handle)
        AND NOT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = NEW.user_id)
    THEN
        RAISE EXCEPTION 'handle_reservado' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.proteger_handle_reservado() FROM PUBLIC;

DROP TRIGGER IF EXISTS profiles_handle_reservado ON public.profiles;
CREATE TRIGGER profiles_handle_reservado
    BEFORE INSERT OR UPDATE OF handle ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.proteger_handle_reservado();

-- -----------------------------------------------------------------------------
-- Conferência (rodar à parte):
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass
--     AND NOT tgisinternal;
--   -- espera: profiles_handle_reservado
--
--   -- Quem já tem @ reservado sem ser da equipe (espera: nenhuma linha):
--   SELECT p.handle FROM public.profiles p
--   WHERE p.handle IN ('admin','administrador','anideck','moderacao','moderador',
--                      'suporte','sistema','curadoria','ranking','eu')
--     AND NOT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = p.user_id);
-- -----------------------------------------------------------------------------
