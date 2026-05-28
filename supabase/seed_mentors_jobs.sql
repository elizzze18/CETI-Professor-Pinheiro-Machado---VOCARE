-- ============================================================
-- VOCARE — Seed: Mentores e Vagas de Teste
-- Execute no SQL Editor do Supabase (versão corrigida)
-- ============================================================

-- Habilitar pgcrypto para hash de senhas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Usuários mentores no Supabase Auth ─────────────────────
-- Remove colunas descontinuadas (instance_id, is_super_admin)
INSERT INTO auth.users (
  id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001','authenticated','authenticated','carlos.mendes@vocare.test',
   crypt('Vocare@2026', gen_salt('bf', 10)),now(),now(),now(),
   '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Carlos Mendes"}'::jsonb),
  ('a1b2c3d4-0002-0002-0002-000000000002','authenticated','authenticated','ana.lima@vocare.test',
   crypt('Vocare@2026', gen_salt('bf', 10)),now(),now(),now(),
   '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Ana Lima"}'::jsonb),
  ('a1b2c3d4-0003-0003-0003-000000000003','authenticated','authenticated','rafael.costa@vocare.test',
   crypt('Vocare@2026', gen_salt('bf', 10)),now(),now(),now(),
   '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Rafael Costa"}'::jsonb),
  ('a1b2c3d4-0004-0004-0004-000000000004','authenticated','authenticated','fernanda.oliveira@vocare.test',
   crypt('Vocare@2026', gen_salt('bf', 10)),now(),now(),now(),
   '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Fernanda Oliveira"}'::jsonb),
  ('a1b2c3d4-0005-0005-0005-000000000005','authenticated','authenticated','lucas.nunes@vocare.test',
   crypt('Vocare@2026', gen_salt('bf', 10)),now(),now(),now(),
   '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Lucas Nunes"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Perfis dos mentores ────────────────────────────────────
INSERT INTO public.profiles (id, email, name, role, city, state, created_at, updated_at) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001','carlos.mendes@vocare.test','Carlos Mendes','mentor','Teresina','PI',now(),now()),
  ('a1b2c3d4-0002-0002-0002-000000000002','ana.lima@vocare.test','Ana Lima','mentor','Teresina','PI',now(),now()),
  ('a1b2c3d4-0003-0003-0003-000000000003','rafael.costa@vocare.test','Rafael Costa','mentor','Teresina','PI',now(),now()),
  ('a1b2c3d4-0004-0004-0004-000000000004','fernanda.oliveira@vocare.test','Fernanda Oliveira','mentor','Parnaiba','PI',now(),now()),
  ('a1b2c3d4-0005-0005-0005-000000000005','lucas.nunes@vocare.test','Lucas Nunes','mentor','Teresina','PI',now(),now())
ON CONFLICT (id) DO NOTHING;

-- ── 3. Entradas na tabela mentors ─────────────────────────────
INSERT INTO public.mentors (id, profession, area, bio, experience_years, is_approved, is_available, reputation_score, total_sessions) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001','Engenheiro de Software','Tecnologia',
   'Formado em Ciência da Computação pela UFPI. Trabalho há 8 anos com desenvolvimento web e mobile. Já mentorei mais de 30 jovens de escolas públicas do Piauí. Amo ver estudantes da rede pública chegando à área de TI!',
   8,true,true,9,34),
  ('a1b2c3d4-0002-0002-0002-000000000002','Médica Pediatra','Saúde',
   'Médica formada pela UFPI, especialista em pediatria. Cresci em escola pública em Teresina e sei o quanto é difícil escolher uma carreira sem referências. Quero ser essa referência para você.',
   6,true,true,10,52),
  ('a1b2c3d4-0003-0003-0003-000000000003','Advogado Trabalhista','Direito',
   'Advogado formado pela UESPI, atuando em direito trabalhista e do consumidor. Filho de trabalhador rural, passei no vestibular por cotas e hoje quero ajudar outros jovens a conhecer o Direito.',
   5,true,true,8,21),
  ('a1b2c3d4-0004-0004-0004-000000000004','Professora de Matemática','Educação',
   'Licenciada em Matemática pela UFPI, com mestrado em Ensino de Ciências. Dou aulas em escola estadual e acredito que todo jovem piauiense pode ter um futuro brilhante.',
   9,true,false,9,41),
  ('a1b2c3d4-0005-0005-0005-000000000005','Administrador e Empreendedor','Administração',
   'Formado em Administração pela UFPI. Fundei uma startup de agro-tech em Teresina. Apaixonado por empreendedorismo e gestão. Mentor voluntário do Sebrae PI.',
   4,true,true,7,15)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Empresa de exemplo para vagas ─────────────────────────
INSERT INTO auth.users (
  id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) VALUES
  ('c0de0001-0001-0001-0001-000000000001','authenticated','authenticated','rh@technospi.com.br',
   crypt('Vocare@2026', gen_salt('bf', 10)),now(),now(),now(),
   '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"TechnosPi Sistemas"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name, role, city, state, created_at, updated_at) VALUES
  ('c0de0001-0001-0001-0001-000000000001','rh@technospi.com.br','TechnosPi Sistemas','company','Teresina','PI',now(),now())
ON CONFLICT (id) DO NOTHING;

-- ── 5. Vagas de exemplo ───────────────────────────────────────
-- Nota: job_type aceita 'trainee', 'internship', 'job'
INSERT INTO public.job_listings (company_id, title, job_type, description, areas, location, is_active, created_at) VALUES
  ('c0de0001-0001-0001-0001-000000000001',
   'Estágio em Desenvolvimento Web','internship',
   'Estudante de ensino médio técnico ou primeiro ano de TI. Aprenda React e Node.js em projetos reais. Bolsa R$800/mês + VT. 6h/dia seg a sex.',
   ARRAY['Tecnologia','Programação'],'Teresina, PI',true,now()),
  ('c0de0001-0001-0001-0001-000000000001',
   'Jovem Aprendiz - Suporte de TI','internship',
   'Programa para 14-22 anos. Sem experiência necessária. Aprenda suporte técnico e redes. Bolsa R$650/mês + CLT completo.',
   ARRAY['Tecnologia','Suporte'],'Teresina, PI',true,now()),
  ('c0de0001-0001-0001-0001-000000000001',
   'Trainee - Dados e Análise','trainee',
   'Para recém-formados ou último ano técnico. Aprenda SQL, Power BI e análise de dados na prática. Salário R$1.200/mês + plano de saúde.',
   ARRAY['Tecnologia','Dados'],'Teresina, PI',true,now());

-- ── Verificação ───────────────────────────────────────────────
SELECT 'Mentores inseridos:' AS info, count(*) FROM public.mentors;
SELECT 'Vagas inseridas:'    AS info, count(*) FROM public.job_listings;
