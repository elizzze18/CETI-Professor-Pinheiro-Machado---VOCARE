/* ============================================================
   VOCARE — Configuração Global
   js/config.js · Substitua os valores com suas credenciais
   ============================================================ */

const CONFIG = {
  // ── Supabase (públicas — protegidas por RLS) ──
  SUPABASE_URL:      'https://txtboorfzodcykxoynyt.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_jYvMM99UDGnzNnzHHXbtsQ_ABRVWGTm',

  // ── App ──
  APP_NAME:    'Vocare',
  APP_VERSION: '1.0.0',

  // ── Routes ──
  ROUTES: {
    ROOT:         '/',
    LOGIN:        '/auth/login.html',
    REGISTER:     '/auth/register.html',
    ONBOARDING:   '/student/onboarding.html',
    TEST:         '/student/test.html',
    DASHBOARD:    '/student/dashboard.html',
    PROFESSIONS:  '/student/professions.html',
    CAREER_PLAN:  '/student/career-plan.html',
    MENTORS:      '/student/mentors.html',
    CHAT:         '/student/chat.html',
    VOCA:         '/student/voca.html',
    MENTOR_DASH:  '/mentor/dashboard.html',
    COMPANY_DASH: '/company/dashboard.html',
    ADMIN_DASH:   '/admin/dashboard.html',
  },

  // ── API Routes (Vercel Serverless Functions em api/) ──
  EDGE_FUNCTIONS: {
    AI_PROXY:             '/api/ai-proxy',
    GENERATE_CAREER_PLAN: '/api/generate-career-plan',
    SESSION_SUMMARY:      '/api/session-summary',
  },

  // ── IA Settings ──
  AI: {
    MODEL_COMPLEX: 'claude-sonnet-4-20250514',
    MODEL_SIMPLE:  'claude-haiku-4-5-20251001',
    MAX_TOKENS:    1500,
    ONBOARDING_EXCHANGES: 6,
    TEST_MIN_QUESTIONS:   5,
    TEST_MAX_QUESTIONS:   7,
  },

  // ── Regras de Negócio ──
  BUSINESS: {
    FREE_SESSIONS_PER_MONTH: 2,
    MAX_WHATSAPP_NOTIFICATIONS_PER_WEEK: 3,
    INACTIVITY_DAYS_THRESHOLD: 3,
    MIN_COMPATIBILITY_SCORE: 60,
    TOP_RECOMMENDATIONS: 10,
  },
};

// Congelar para evitar mutações acidentais
Object.freeze(CONFIG);
Object.freeze(CONFIG.ROUTES);
Object.freeze(CONFIG.EDGE_FUNCTIONS);
Object.freeze(CONFIG.AI);
Object.freeze(CONFIG.BUSINESS);
