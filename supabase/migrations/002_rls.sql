-- ============================================================
-- VOCARE — Row Level Security
-- 002_rls.sql · Políticas de segurança por tabela
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
alter table profiles enable row level security;

-- Qualquer usuário autenticado pode ver perfis públicos
create policy "profiles_select_public" on profiles
  for select to authenticated
  using (true);

-- Usuário edita apenas o próprio perfil
create policy "profiles_update_own" on profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Insert: somente pelo próprio usuário (registro)
create policy "profiles_insert_own" on profiles
  for insert to authenticated
  with check (auth.uid() = id);

-- Delete: somente o próprio (exclusão de conta)
create policy "profiles_delete_own" on profiles
  for delete to authenticated
  using (auth.uid() = id);

-- ── vocational_profiles ──────────────────────────────────────
alter table vocational_profiles enable row level security;

create policy "vp_select_own" on vocational_profiles
  for select to authenticated
  using (auth.uid() = student_id);

create policy "vp_insert_own" on vocational_profiles
  for insert to authenticated
  with check (auth.uid() = student_id);

create policy "vp_update_own" on vocational_profiles
  for update to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

create policy "vp_delete_own" on vocational_profiles
  for delete to authenticated
  using (auth.uid() = student_id);

-- ── professions ──────────────────────────────────────────────
alter table professions enable row level security;

-- Todas as profissões são públicas (leitura)
create policy "professions_select_all" on professions
  for select to authenticated
  using (is_active = true);

-- Só admin pode inserir/alterar
create policy "professions_write_admin" on professions
  for all to authenticated
  using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

-- ── career_recommendations ───────────────────────────────────
alter table career_recommendations enable row level security;

create policy "rec_own" on career_recommendations
  for all to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ── career_plans ─────────────────────────────────────────────
alter table career_plans enable row level security;

create policy "plans_own" on career_plans
  for all to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ── mentors ──────────────────────────────────────────────────
alter table mentors enable row level security;

-- Todos os mentores aprovados são visíveis
create policy "mentors_select_approved" on mentors
  for select to authenticated
  using (is_approved = true or auth.uid() = id);

-- Mentor edita o próprio perfil
create policy "mentors_update_own" on mentors
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "mentors_insert_own" on mentors
  for insert to authenticated
  with check (auth.uid() = id);

-- Admin pode tudo
create policy "mentors_admin_all" on mentors
  for all to authenticated
  using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

-- ── mentoring_sessions ───────────────────────────────────────
alter table mentoring_sessions enable row level security;

-- Estudante e mentor da sessão podem ler
create policy "sessions_select" on mentoring_sessions
  for select to authenticated
  using (
    auth.uid() = student_id or
    auth.uid() = mentor_id or
    (select role from profiles where id = auth.uid()) = 'admin'
  );

-- Estudante cria sessão
create policy "sessions_student_insert" on mentoring_sessions
  for insert to authenticated
  with check (auth.uid() = student_id);

-- Participantes podem atualizar
create policy "sessions_update" on mentoring_sessions
  for update to authenticated
  using (auth.uid() = student_id or auth.uid() = mentor_id);

-- ── messages ─────────────────────────────────────────────────
alter table messages enable row level security;

-- Participantes da sessão veem as mensagens
create policy "messages_select" on messages
  for select to authenticated
  using (
    exists (
      select 1 from mentoring_sessions s
      where s.id = session_id
        and (s.student_id = auth.uid() or s.mentor_id = auth.uid())
    )
  );

-- Participante envia mensagem
create policy "messages_insert" on messages
  for insert to authenticated
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from mentoring_sessions s
      where s.id = session_id
        and (s.student_id = auth.uid() or s.mentor_id = auth.uid())
        and s.status in ('confirmed','pending')
    )
  );

-- ── ai_conversations ─────────────────────────────────────────
alter table ai_conversations enable row level security;

create policy "ai_conv_own" on ai_conversations
  for all to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ── job_listings ─────────────────────────────────────────────
alter table job_listings enable row level security;

create policy "jobs_select_active" on job_listings
  for select to authenticated
  using (is_active = true or auth.uid() = company_id);

create policy "jobs_write_company" on job_listings
  for all to authenticated
  using (auth.uid() = company_id)
  with check (auth.uid() = company_id);

-- ── notifications ─────────────────────────────────────────────
alter table notifications enable row level security;

create policy "notif_own" on notifications
  for all to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ── Service Role bypass (Edge Functions) ─────────────────────
-- Service role key bypasses RLS automatically — não há necessidade
-- de policies adicionais para Edge Functions que usam service_role_key.

-- ── Realtime Subscriptions ───────────────────────────────────
-- Habilitar realtime nas tabelas necessárias
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table mentoring_sessions;
alter publication supabase_realtime add table notifications;
