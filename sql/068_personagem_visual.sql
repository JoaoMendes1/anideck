-- 068_personagem_visual.sql
-- Fase 18 (18.2a): visual escolhido pelo jogador.
--
-- O personagem passa a poder fixar um visual já desbloqueado (hoje, um dos estágios que o
-- nível alcançou), em vez de mostrar sempre o do estágio atual. NULL é o automático: o
-- visual acompanha o estágio do nível.
--
-- A regra de desbloqueio mora no Go (ValidarEscolhaDeVisual), que é quem conhece as faixas
-- de estágio. Por isso não há RPC nem permissão de escrita para o usuário: o Go confere e
-- grava pelo service role. A coluna só garante o formato do identificador.
--
-- Idempotente: pode ser reaplicado sem efeito.

ALTER TABLE public.rpg_personagens
  ADD COLUMN IF NOT EXISTS visual_equipado TEXT;

ALTER TABLE public.rpg_personagens
  DROP CONSTRAINT IF EXISTS rpg_personagens_visual_formato;
ALTER TABLE public.rpg_personagens
  ADD CONSTRAINT rpg_personagens_visual_formato
  CHECK (visual_equipado IS NULL OR visual_equipado ~ '^[a-z0-9_]{1,40}$');

COMMENT ON COLUMN public.rpg_personagens.visual_equipado IS
  'Visual fixado pelo jogador. NULL = automático, segue o estágio do nível.';

-- A escrita continua fechada para o usuário (sql/066). O service role lê o visual de
-- vários usuários, para o retrato nas listas de membros, e grava a escolha já conferida.
GRANT SELECT, UPDATE ON public.rpg_personagens TO service_role;

-- =============================================================================
-- Como conferir (roda e desfaz; troque o UUID por um usuário que já despertou)
-- =============================================================================
--
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID>","role":"authenticated"}', true);
--
--   SELECT nome, visual_equipado FROM public.rpg_personagens;   -- lê a própria linha
--
--   -- Gravação direta precisa falhar com "permission denied":
--   -- UPDATE public.rpg_personagens SET visual_equipado = 'lendario';
-- ROLLBACK;
