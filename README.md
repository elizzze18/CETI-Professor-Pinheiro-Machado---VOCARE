# 🎯 Vocare — Plataforma de Orientação Profissional

> Plataforma web com IA para orientação profissional de estudantes da rede pública do Piauí.  
> Iniciativa **Do Piauí Para o Mundo 2026** — CETI Professor Pinheiro Machado, Teresina, PI.

---

## 📋 Visão Geral

A Vocare combina IA conversacional + vlogs de profissionais reais + plano de carreira automático para ajudar estudantes do ensino médio público a escolherem sua carreira — de forma gratuita, interativa e personalizada.

## ✨ Funcionalidades

- **Onboarding com IA** — Conversa com a "Voca" que mapeia interesses e perfil vocacional
- **Teste Vocacional Adaptativo** — Perguntas dinâmicas que se adaptam às respostas
- **Dashboard Personalizado** — Profissões recomendadas com scores de compatibilidade
- **Explorador de Profissões** — Vlogs de profissionais reais + filtros por área
- **Mentoria em Tempo Real** — Chat ao vivo com mentores voluntários
- **Plano de Carreira Gerado por IA** — Trilha, cursos gratuitos e metas semanais
- **Notificações WhatsApp** — Lembretes personalizados via n8n

## 🛠️ Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML + CSS + JavaScript Vanilla |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime) |
| IA | Anthropic Claude API (claude-sonnet-4-20250514) |
| Automações | n8n + WhatsApp Cloud API |
| Hospedagem | Vercel / Netlify |

## 📁 Estrutura do Projeto

```
vocare/
├── index.html                   # Landing page
├── auth/
│   ├── login.html               # Login + Google OAuth
│   └── register.html            # Cadastro com consentimento de menores
├── student/
│   ├── onboarding.html          # Chat onboarding com IA
│   ├── test.html                # Teste vocacional adaptativo
│   ├── dashboard.html           # Dashboard do estudante
│   ├── professions.html         # Explorador de profissões
│   ├── career-plan.html         # Plano de carreira
│   ├── mentors.html             # Lista de mentores
│   └── chat.html                # Chat em tempo real
├── mentor/
│   ├── dashboard.html           # Painel do mentor
│   └── profile.html             # Perfil público do mentor
├── company/
│   └── dashboard.html           # Gestão de vagas
├── admin/
│   └── dashboard.html           # Aprovação de mentores, relatórios
├── css/
│   ├── main.css                 # Design system (variáveis, reset, base)
│   ├── components.css           # Botões, cards, chat, modais, nav
│   └── mobile.css               # Responsividade mobile-first
├── js/
│   ├── config.js                # Configuração e constantes
│   ├── utils.js                 # Toast, loaders, helpers, validações
│   ├── supabase.js              # Client Supabase + DB helpers
│   ├── auth.js                  # Auth flow (login/registro/proteção)
│   ├── ai.js                    # Chamadas IA via Edge Functions
│   ├── onboarding.js            # Lógica do onboarding
│   ├── test.js                  # Lógica do teste vocacional
│   ├── dashboard.js             # Dashboard do estudante
│   ├── professions.js           # Explorador de profissões
│   ├── career-plan.js           # Plano de carreira
│   ├── mentors.js               # Lista de mentores
│   └── chat.js                  # Chat realtime
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql       # Tabelas, triggers, índices
│   │   └── 002_rls.sql          # Políticas de segurança RLS
│   ├── seed.sql                 # 20 profissões de exemplo
│   └── functions/
│       ├── ai-proxy/            # Proxy seguro para Claude API
│       ├── generate-career-plan/# Gerador de planos de carreira
│       └── session-summary/     # Resumo automático de sessões
├── docs/
│   ├── SUPABASE_SETUP.md        # Guia completo de configuração
│   └── N8N_SETUP.md             # Configuração de automações WhatsApp
├── .env.example                 # Template de variáveis de ambiente
├── netlify.toml                 # Configuração Netlify
└── vercel.json                  # Configuração Vercel
```

## 🚀 Início Rápido

### 1. Configure o Supabase

Siga o guia completo em [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

**Resumo:**
1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute `supabase/migrations/001_schema.sql` no SQL Editor
3. Execute `supabase/migrations/002_rls.sql`
4. Execute `supabase/seed.sql`
5. Configure Google OAuth nas configurações de Auth
6. Deploy das Edge Functions

### 2. Configure as credenciais

```javascript
// js/config.js — substitua com suas credenciais
const CONFIG = {
  SUPABASE_URL:      'https://SEU_PROJECT_ID.supabase.co',
  SUPABASE_ANON_KEY: 'sua-anon-key-aqui',
};
```

### 3. Configure as Edge Functions

```bash
# Instale o Supabase CLI
npm install -g supabase

# Faça login e link ao projeto
supabase login
supabase link --project-ref SEU_PROJECT_ID

# Configure a API Key da Anthropic
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...

# Deploy das funções
supabase functions deploy ai-proxy
supabase functions deploy generate-career-plan
supabase functions deploy session-summary
```

### 4. Rodando localmente

Abra `index.html` com o Live Server (VS Code) ou qualquer servidor estático:

```bash
# Usando Python
python -m http.server 3000

# Usando Node.js (npx)
npx serve .
```

Acesse: http://localhost:3000

### 5. Deploy em produção

**Netlify:**
```bash
# Faça push para GitHub e conecte o repo no Netlify
# O netlify.toml está configurado automaticamente
```

**Vercel:**
```bash
# Instale a Vercel CLI
npm install -g vercel
vercel deploy
```

## 🔒 Segurança

| Medida | Status |
|--------|--------|
| HTTPS em produção | ✅ Automático (Netlify/Vercel) |
| RLS em todas as tabelas | ✅ Implementado |
| API Key Claude protegida | ✅ Apenas em Edge Functions |
| Consentimento menores de 18 | ✅ Modal obrigatório no registro |
| Sanitização de inputs | ✅ escapeHtml() em todos os displays |
| Proteção de rotas | ✅ Auth.requireStudent/Mentor/Admin |
| Exclusão de conta LGPD | ✅ DELETE /student/account |

## 📊 Banco de Dados

### Tabelas principais:
- `profiles` — Usuários (extende auth.users)
- `vocational_profiles` — Perfil vocacional gerado pela IA
- `professions` — Acervo de profissões (20+ pré-carregadas)
- `career_recommendations` — Top-10 profissões por estudante
- `career_plans` — Planos de carreira gerados
- `mentors` — Perfis de mentores
- `mentoring_sessions` — Sessões de mentoria
- `messages` — Chat em tempo real
- `ai_conversations` — Histórico de conversas com IA
- `job_listings` — Vagas de empresas parceiras
- `notifications` — Notificações enviadas

## 🤖 Integração com IA (Claude)

| Contexto | Modelo | Limite de tokens |
|----------|--------|-----------------|
| Onboarding | claude-sonnet-4-20250514 | 600 |
| Teste vocacional | claude-sonnet-4-20250514 | 500 |
| Plano de carreira | claude-sonnet-4-20250514 | 2500 |
| Resumo de sessão | claude-haiku-4-5-20251001 | 400 |
| Perguntas sugeridas | claude-haiku-4-5-20251001 | 300 |

**Todas as chamadas passam pela Edge Function `ai-proxy`** — a API Key nunca chega ao frontend.

## 📱 Design System

| Token | Valor |
|-------|-------|
| `--color-primary` | `#1A3C6E` — Azul escuro |
| `--color-secondary` | `#2E6DB4` — Azul médio |
| `--color-accent` | `#F0A500` — Âmbar |
| `--color-success` | `#2E8B57` — Verde |
| `--color-danger` | `#CC0000` — Vermelho |
| Font | Inter (Google Fonts) |
| Base | 16px, mobile-first (320px+) |

## 📋 Regras de Negócio

| ID | Regra |
|----|-------|
| RN-01 | Jornada principal 100% gratuita para estudantes |
| RN-02 | Consentimento do responsável obrigatório para < 18 anos |
| RN-03 | Máx. 2 sessões gratuitas/mês por mentor |
| RN-05 | Aprovação manual de mentores pela equipe |
| RN-07 | Tarefas simples usam Haiku, conversas usam Sonnet |
| RN-08 | Máx. 3 notificações WhatsApp/semana por estudante |

## 🎯 Critérios de Aceitação

- [x] Jornada completa (cadastro → plano) em < 15 minutos
- [x] Teste vocacional < 8 minutos
- [x] Dashboard com 3+ profissões recomendadas
- [x] Chat realtime entre estudante e mentor
- [x] Plano de carreira gerado automaticamente
- [x] Consentimento do responsável para < 18 anos
- [ ] Lighthouse Performance > 80 (medir em produção)
- [ ] Lighthouse Accessibility > 85 (medir em produção)
- [x] Jornada principal funcional em 375px

## 👥 Equipe

| Papel | Nome |
|-------|------|
| Orientador | Jadson Gregorio De Araujo Costa Soares |
| Equipe | Ana Elize, Maria Heloísa, Sabrina, Vitor, Itallo |
| Escola | CETI Prof. Pinheiro Machado — 21ª GRE |
| Projeto | Do Piauí Para o Mundo 2026 |

---

Feito com ❤️ para transformar o futuro dos estudantes do Piauí.
