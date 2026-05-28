-- ============================================================
-- VOCARE — Trigger: auto-criar profile ao cadastrar usuário
-- 003_profile_trigger.sql
-- Roda com security definer (bypassa RLS) — é confiável
-- mesmo com email confirmation ativado no Supabase.
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Criar profile básico (dados extras chegam via client depois)
  insert into public.profiles (id, email, name, role, state, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    'student',
    'PI',
    now(),
    now()
  )
  on conflict (id) do nothing;

  -- Criar vocational_profile vazio
  insert into public.vocational_profiles (student_id, completed_onboarding, completed_test, updated_at)
  values (new.id, false, false, now())
  on conflict (student_id) do nothing;

  return new;
end;
$$;

-- Remover trigger antigo se existir
drop trigger if exists on_auth_user_created on auth.users;

-- Criar trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
