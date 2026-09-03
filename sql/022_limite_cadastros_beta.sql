-- =============================================================================
-- 022 — Limite de cadastros do beta
-- =============================================================================
-- Fecha o cadastro automaticamente quando o número de usuários atinge o limite,
-- em vez de depender do toggle global "Allow new users to sign up".
--
-- POR QUE HOOK E NÃO O TOGGLE: o toggle é binário e manual. O hook mantém o
-- cadastro aberto até encher, fecha sozinho e devolve uma mensagem própria ao
-- usuário. Vale para e-mail e Google igualmente, porque quem chama é o GoTrue.
--
-- POR QUE NÃO NO FRONTEND: a tela de cadastro fala direto com o GoTrue. Um
-- contador no React seria contornável chamando a API com a anon key.
--
-- DEPOIS DE APLICAR: ativar em Authentication → Hooks → Before User Created,
-- apontando para public.hook_limite_cadastros. Sem esse passo o arquivo não
-- faz efeito nenhum.
-- =============================================================================

-- Limite vive em app_settings para mudar sem deploy e sem novo arquivo sql/.
insert into public.app_settings (key, value, updated_at)
values ('beta_signup_limit', '8', now())
on conflict (key) do update
  set value = excluded.value,
      updated_at = now();

-- O hook roda como supabase_auth_admin. Ele já enxerga auth.users (schema
-- próprio), mas precisa de permissão explícita para ler app_settings.
grant select on public.app_settings to supabase_auth_admin;

create or replace function public.hook_limite_cadastros(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  limite     int;
  existentes int;
begin
  select value::int into limite
  from public.app_settings
  where key = 'beta_signup_limit';

  -- Sem chave configurada, não inventa limite: deixa passar. Preferimos
  -- cadastro aberto por engano a cadastro travado por engano.
  if limite is null then
    return '{}'::jsonb;
  end if;

  select count(*) into existentes from auth.users;

  if existentes >= limite then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'O AniDeck está em beta fechado e o limite de cadastros foi atingido no momento.',
        'http_code', 403
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

-- O supabase_auth_admin não tem acesso ao schema public por padrão.
grant usage on schema public to supabase_auth_admin;

-- Só o servidor de autenticação executa. Revogar de PUBLIC também: função
-- nasce com EXECUTE para o pseudo-papel PUBLIC, e anon/authenticated herdam
-- por ali (PITFALLS.md).
grant execute on function public.hook_limite_cadastros to supabase_auth_admin;
revoke execute on function public.hook_limite_cadastros from authenticated, anon, public;

-- =============================================================================
-- CONFERÊNCIA
-- =============================================================================
-- Deve devolver o limite, a contagem atual e se o próximo cadastro passa.
-- =============================================================================
-- select
--   (select value from public.app_settings where key = 'beta_signup_limit') as limite,
--   (select count(*) from auth.users)                                       as usuarios,
--   public.hook_limite_cadastros('{"user":{"email":"teste@exemplo.com"}}'::jsonb) as resposta;