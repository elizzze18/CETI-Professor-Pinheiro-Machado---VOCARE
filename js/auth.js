/* ============================================================
   VOCARE — Auth Module
   js/auth.js · Login, registro, sessão, proteção de rotas
   ============================================================ */

'use strict';

/* ── Estado global de autenticação ─────────────────────────── */
let _currentUser    = null;
let _currentProfile = null;
let _authListeners  = [];

const Auth = {
  get user()    { return _currentUser;    },
  get profile() { return _currentProfile; },
  get userId()  { return _currentUser?.id ?? null; },

  /* ── Inicialização ── */
  async init() {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (session?.user) {
      _currentUser = session.user;
      await _loadProfile(session.user.id);
      updateLastActive(session.user.id);
    }

    window.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        _currentUser = session.user;
        await _loadProfile(session.user.id);
        updateLastActive(session.user.id);
        _notifyListeners('signed_in');
      } else if (event === 'SIGNED_OUT') {
        _currentUser    = null;
        _currentProfile = null;
        Storage.clear();
        _notifyListeners('signed_out');
      } else if (event === 'TOKEN_REFRESHED') {
        _currentUser = session.user;
      }
    });

    return _currentUser;
  },

  /* ── Registro ── */
  async register({
    email, password, name, birthDate, school,
    city, phone, guardianName, guardianConsent,
  }) {
    // Garantir que o client foi inicializado
    if (!window.supabase?.auth) {
      throw new Error('Supabase não inicializado. Recarregue a página e verifique js/config.js.');
    }

    // 1. Criar conta no Supabase Auth
    const { data, error } = await window.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          birth_date: birthDate,
        },
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error('Não foi possível criar a conta. Tente novamente.');

    // 2. Upsert profile com dados completos
    // O trigger 003_profile_trigger.sql já criou um profile básico;
    // este upsert atualiza com os campos vindos do formulário.
    const profile = {
      id:               data.user.id,
      name:             name.trim(),
      email:            email.trim().toLowerCase(),
      role:             'student',
      birth_date:       birthDate || null,
      school:           school?.trim() || null,
      city:             city?.trim() || null,
      state:            'PI',
      phone:            phone?.replace(/\D/g, '') || null,
      guardian_consent: guardianConsent || false,
      updated_at:       new Date().toISOString(),
    };

    const { error: profileError } = await window.supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id' });

    if (profileError) {
      console.warn('[Auth] Profile upsert falhou (trigger deve ter criado o básico):', profileError.message);
    }

    // vocational_profile já criado pelo trigger — não precisamos inserir novamente

    return data;
  },

  /* ── Login ── */
  async login(email, password) {
    const { data, error } = await window.supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    return data;
  },

  /* ── Google OAuth ── */
  async loginWithGoogle() {
    const { data, error } = await window.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${CONFIG.ROUTES.DASHBOARD}`,
        queryParams: {
          access_type: 'offline',
          prompt:      'consent',
        },
      },
    });
    if (error) throw error;
    return data;
  },

  /* ── Logout ── */
  async logout() {
    Realtime.unsubscribeAll();
    const { error } = await window.supabase.auth.signOut();
    if (error) throw error;
    _currentUser    = null;
    _currentProfile = null;
    Storage.clear();
  },

  /* ── Recuperação de senha ── */
  async requestPasswordReset(email) {
    const { error } = await window.supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}${CONFIG.ROUTES.LOGIN}?reset=true` }
    );
    if (error) throw error;
  },

  async updatePassword(newPassword) {
    const { error } = await window.supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  /* ── Proteção de rotas ── */
  async requireAuth(requiredRole = null) {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
      navigate(CONFIG.ROUTES.LOGIN);
      return null;
    }

    _currentUser = session.user;
    if (!_currentProfile) await _loadProfile(session.user.id);

    if (requiredRole && _currentProfile?.role !== requiredRole) {
      _redirectByRole(_currentProfile?.role);
      return null;
    }

    return session.user;
  },

  async requireStudent() { return this.requireAuth('student'); },
  async requireMentor()  { return this.requireAuth('mentor'); },
  async requireAdmin()   { return this.requireAuth('admin'); },

  /* ── Verificar onboarding ── */
  async checkOnboardingStatus(userId) {
    const vp = await DB.vocationalProfiles.get(userId);
    return {
      completedOnboarding: vp?.completed_onboarding || false,
      completedTest:       vp?.completed_test || false,
    };
  },

  /* ── Redirecionar por role ── */
  redirectByRole() {
    _redirectByRole(_currentProfile?.role || 'student');
  },

  /* ── Excluir conta (LGPD Art. 18) ── */
  async deleteAccount() {
    if (!_currentUser) return;
    const userId = _currentUser.id;

    // Excluir dados associados (cascade deve tratar o resto)
    await window.supabase.from('profiles').delete().eq('id', userId);
    await this.logout();
  },

  /* ── Auth state listener ── */
  onAuthChange(callback) {
    _authListeners.push(callback);
    return () => { _authListeners = _authListeners.filter(l => l !== callback); };
  },

  /* ── Refresh profile ── */
  async refreshProfile() {
    if (!_currentUser) return null;
    return await _loadProfile(_currentUser.id);
  },
};

/* ── Internals ──────────────────────────────────────────────── */
async function _loadProfile(userId) {
  try {
    _currentProfile = await DB.profiles.get(userId);
  } catch (err) {
    console.warn('[Auth] Profile load failed:', err.message);
    _currentProfile = null;
  }
  return _currentProfile;
}

function _redirectByRole(role) {
  const map = {
    student: CONFIG.ROUTES.DASHBOARD,
    mentor:  CONFIG.ROUTES.MENTOR_DASH,
    company: CONFIG.ROUTES.COMPANY_DASH,
    admin:   CONFIG.ROUTES.ADMIN_DASH,
  };
  navigate(map[role] || CONFIG.ROUTES.DASHBOARD);
}

function _notifyListeners(event) {
  _authListeners.forEach(fn => {
    try { fn(event, _currentUser, _currentProfile); } catch {}
  });
}

/* ── UI Helpers ─────────────────────────────────────────────── */

/* Preenche elementos com dados do usuário */
function populateUserUI(profile) {
  if (!profile) return;

  const els = {
    '[data-user-name]':    profile.name || '',
    '[data-user-email]':   profile.email || '',
    '[data-user-school]':  profile.school || '',
    '[data-user-city]':    profile.city || '',
    '[data-user-role]':    profile.role || '',
  };

  for (const [selector, value] of Object.entries(els)) {
    document.querySelectorAll(selector).forEach(el => {
      el.textContent = value;
    });
  }

  // Avatar
  document.querySelectorAll('[data-user-avatar]').forEach(el => {
    if (profile.avatar_url) {
      if (el.tagName === 'IMG') el.src = profile.avatar_url;
      else el.style.backgroundImage = `url(${profile.avatar_url})`;
    } else {
      el.textContent = initials(profile.name);
      el.style.background = avatarGradient(profile.name);
    }
  });
}

/* ── Top Nav Helpers ────────────────────────────────────────── */
function initNavAvatar(logoutCallback) {
  const avatar = document.getElementById('navAvatar');
  if (!avatar) return;

  const profile = Auth.profile;
  if (profile) {
    if (profile.avatar_url) {
      avatar.innerHTML = `<img src="${profile.avatar_url}" alt="${escapeHtml(profile.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      avatar.textContent = initials(profile.name);
      avatar.style.background = avatarGradient(profile.name);
    }
  }

  // Dropdown
  const dropdown = document.getElementById('navDropdown');
  if (!dropdown) return;

  avatar.addEventListener('click', () => {
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!avatar.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        setButtonLoading(logoutBtn, true);
        await Auth.logout();
        navigate(CONFIG.ROUTES.LOGIN);
      } catch (err) {
        Toast.error(handleError(err));
        setButtonLoading(logoutBtn, false);
      }
    });
  }
}

/* ── Bottom Nav Active State ────────────────────────────────── */
function setBottomNavActive(id) {
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.id === id || item.dataset.nav === id);
  });
}

/* ── Consent Check for Minors ───────────────────────────────── */
function checkMinorConsent(profile) {
  if (!profile?.birth_date) return false;
  const age = getAge(profile.birth_date);
  return age < 18 && !profile.guardian_consent;
}

/* ── Export ─────────────────────────────────────────────────── */
window.Auth              = Auth;
window.populateUserUI    = populateUserUI;
window.initNavAvatar     = initNavAvatar;
window.setBottomNavActive = setBottomNavActive;
window.checkMinorConsent = checkMinorConsent;
