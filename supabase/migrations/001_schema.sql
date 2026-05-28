-- ============================================================
-- VOCARE — Schema Inicial
-- 001_schema.sql · Tabelas, tipos, índices, triggers
-- ============================================================

-- ── Extensões ────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- busca por similaridade

-- ── Tabelas ──────────────────────────────────────────────────

-- Perfis de usuário (extende auth.users)
create table if not exists profiles (
  id              uuid references auth.users on delete cascade primary key,
  name            text not null,
  email           text,
  role            text check (role in ('student','mentor','company','admin')) not null default 'student',
  birth_date      date,
  guardian_consent boolean not null default false,
  phone           text,
  school          text,
  city            text,
  state           text default 'PI',
  avatar_url      text,
  last_active     timestamptz default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz default now()
);

comment on table profiles is 'Perfis públicos de todos os usuários da plataforma.';

-- Perfil Vocacional (gerado pela IA, atualizado continuamente)
create table if not exists vocational_profiles (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references profiles(id) on delete cascade,
  interests            text[] default '{}',
  personality_traits   text[] default '{}',
  skills               text[] default '{}',
  raw_profile          jsonb default '{}',
  completed_onboarding boolean not null default false,
  completed_test       boolean not null default false,
  updated_at           timestamptz not null default now(),
  unique (student_id)
);

-- Profissões (acervo curado da plataforma)
create table if not exists professions (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  area               text,
  description        text,
  education_required varchar(20) check (education_required in ('high_school','technical','bachelors','masters','phd')),
  salary_range       jsonb,
  market_outlook     text,
  tags               text[] default '{}',
  vlog_url           text,
  thumbnail_url      text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);

-- Recomendações de carreira por estudante
create table if not exists career_recommendations (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references profiles(id) on delete cascade,
  profession_id       uuid not null references professions(id) on delete cascade,
  compatibility_score integer not null check (compatibility_score between 0 and 100),
  created_at          timestamptz not null default now(),
  unique (student_id, profession_id)
);

-- Plano de carreira
create table if not exists career_plans (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references profiles(id) on delete cascade,
  profession_id        uuid references professions(id),
  learning_path        jsonb not null default '[]',
  recommended_courses  jsonb not null default '[]',
  skills_to_develop    text[] default '{}',
  weekly_goals         jsonb not null default '[]',
  generated_at         timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (student_id)
);

-- Mentores (perfil adicional para usuários com role=mentor)
create table if not exists mentors (
  id                     uuid references profiles(id) on delete cascade primary key,
  profession             text,
  area                   text,
  bio                    text,
  experience_years       integer default 0,
  is_approved            boolean not null default false,
  is_available           boolean not null default true,
  free_sessions_remaining integer not null default 2,
  reputation_score       numeric(3,1) not null default 0.0,
  total_sessions         integer not null default 0
);

-- Sessões de mentoria
create table if not exists mentoring_sessions (
  id                       uuid primary key default gen_random_uuid(),
  student_id               uuid not null references profiles(id),
  mentor_id                uuid not null references profiles(id),
  status                   text not null check (status in ('pending','confirmed','completed','cancelled')) default 'pending',
  type                     text check (type in ('chat','voice','video')) default 'chat',
  scheduled_at             timestamptz,
  completed_at             timestamptz,
  ai_suggested_questions   text[] default '{}',
  ai_summary               text,
  student_rating           integer check (student_rating between 0 and 10),
  is_premium               boolean not null default false,
  created_at               timestamptz not null default now()
);

-- Mensagens de chat (estudante ↔ mentor)
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references mentoring_sessions(id) on delete cascade,
  sender_id   uuid not null references profiles(id),
  content     text not null check (length(content) > 0 and length(content) <= 4000),
  created_at  timestamptz not null default now()
);

-- Histórico de conversa com a IA
create table if not exists ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id) on delete cascade,
  phase       text not null check (phase in ('onboarding','test','general')),
  messages    jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  unique (student_id, phase)
);

-- Vagas de empresas
create table if not exists job_listings (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid references profiles(id),
  title             text not null,
  job_type          text check (job_type in ('trainee','internship','job')),
  description       text,
  areas             text[] default '{}',
  location          text,
  min_compatibility integer not null default 60,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- Notificações enviadas
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id) on delete cascade,
  type        text,
  message     text not null,
  sent_at     timestamptz not null default now(),
  was_read    boolean not null default false
);

-- ── Triggers ─────────────────────────────────────────────────

-- Auto-atualizar updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger trg_vocational_updated_at
  before update on vocational_profiles
  for each row execute function update_updated_at();

create trigger trg_career_plans_updated_at
  before update on career_plans
  for each row execute function update_updated_at();

-- Atualizar reputação do mentor após avaliação
create or replace function update_mentor_reputation()
returns trigger language plpgsql as $$
declare
  new_score numeric;
  total_count integer;
begin
  if new.student_rating is not null and old.student_rating is null then
    select
      avg(student_rating * 10.0 / 10.0),
      count(*)
    into new_score, total_count
    from mentoring_sessions
    where mentor_id = new.mentor_id
      and student_rating is not null
      and status = 'completed';

    update mentors
    set
      reputation_score = round(new_score::numeric, 1),
      total_sessions   = total_count
    where id = new.mentor_id;
  end if;
  return new;
end;
$$;

create trigger trg_mentor_reputation
  after update on mentoring_sessions
  for each row execute function update_mentor_reputation();

-- ── Índices ───────────────────────────────────────────────────

create index if not exists idx_vocational_student    on vocational_profiles(student_id);
create index if not exists idx_career_rec_student    on career_recommendations(student_id);
create index if not exists idx_career_rec_score      on career_recommendations(compatibility_score desc);
create index if not exists idx_career_plans_student  on career_plans(student_id);
create index if not exists idx_sessions_student      on mentoring_sessions(student_id);
create index if not exists idx_sessions_mentor       on mentoring_sessions(mentor_id);
create index if not exists idx_sessions_status       on mentoring_sessions(status);
create index if not exists idx_messages_session      on messages(session_id, created_at);
create index if not exists idx_notifications_student on notifications(student_id, was_read);
create index if not exists idx_professions_area      on professions(area);
create index if not exists idx_professions_name      on professions using gin (name gin_trgm_ops);
create index if not exists idx_jobs_active           on job_listings(is_active, created_at desc);
create index if not exists idx_ai_conv_student_phase on ai_conversations(student_id, phase);
create index if not exists idx_profiles_role         on profiles(role);
create index if not exists idx_profiles_last_active  on profiles(last_active);
