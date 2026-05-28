/* ============================================================
   VOCARE — Utilities
   js/utils.js · Toast, loaders, helpers, formatters
   ============================================================ */

'use strict';

/* ── Toast Notifications ────────────────────────────────────── */
const Toast = (() => {
  let container = null;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-label', 'Notificações');
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type = 'default', duration = 3500) {
    const icons = {
      success: '✅',
      danger:  '❌',
      warning: '⚠️',
      info:    'ℹ️',
      default: '💬',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icons[type] || icons.default}</span>
      <span class="toast-msg">${escapeHtml(message)}</span>
      <button class="toast-dismiss" aria-label="Fechar" onclick="this.closest('.toast').remove()">✕</button>
    `;

    getContainer().appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 300ms ease';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  }

  return {
    success: (msg, dur) => show(msg, 'success', dur),
    error:   (msg, dur) => show(msg, 'danger', dur),
    warning: (msg, dur) => show(msg, 'warning', dur),
    info:    (msg, dur) => show(msg, 'info', dur),
    show,
  };
})();

/* ── Loading States ─────────────────────────────────────────── */
const Loader = (() => {
  let overlay = null;

  return {
    show(message = 'Carregando...') {
      if (overlay) return;
      overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-live', 'polite');
      overlay.innerHTML = `
        <div class="spinner spinner-lg" aria-hidden="true"></div>
        <p>${escapeHtml(message)}</p>
      `;
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
    },

    hide() {
      if (overlay) {
        overlay.remove();
        overlay = null;
        document.body.style.overflow = '';
      }
    },

    setMessage(message) {
      if (overlay) {
        const p = overlay.querySelector('p');
        if (p) p.textContent = message;
      }
    },
  };
})();

/* ── Button Loading State ───────────────────────────────────── */
function setButtonLoading(btn, loading, text = null) {
  if (!btn) return;
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
    if (text) btn.dataset.originalText = btn.textContent;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    if (btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
      delete btn.dataset.originalText;
    } else if (text) {
      btn.textContent = text;
    }
  }
}

/* ── Skeleton Loaders ───────────────────────────────────────── */
function createSkeleton(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.firstElementChild;
}

function skeletonCard() {
  return `
    <div class="card" style="padding:var(--space-4)">
      <div class="skeleton skeleton-avatar" style="width:48px;height:48px;margin-bottom:12px"></div>
      <div class="skeleton skeleton-text" style="width:70%;margin-bottom:8px"></div>
      <div class="skeleton skeleton-text" style="width:50%"></div>
    </div>
  `;
}

function skeletonList(n = 3) {
  return Array(n).fill(skeletonCard()).join('');
}

/* ── HTML Sanitization ──────────────────────────────────────── */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeText(str) {
  return String(str ?? '').trim().slice(0, 5000);
}

/* ── Date / Time Formatting ─────────────────────────────────── */
function formatDate(date, options = {}) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', ...options,
  });
}

function formatDateShort(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  return `${formatDateShort(d)} às ${formatTime(d)}`;
}

function timeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMin / 60);
  const diffD   = Math.floor(diffH / 24);

  if (diffMin < 1)  return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffH < 24)   return `há ${diffH}h`;
  if (diffD < 7)    return `há ${diffD} dia${diffD > 1 ? 's' : ''}`;
  return formatDateShort(d);
}

function getAge(birthDate) {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/* ── Compatibility Score Helpers ────────────────────────────── */
function getCompatClass(score) {
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

function compatBadge(score) {
  const cls = getCompatClass(score);
  return `<span class="badge badge-compat badge-compat-${cls}">${score}% compatível</span>`;
}

function compatBar(score) {
  return `
    <div class="compat-bar" role="progressbar" aria-valuenow="${score}" aria-valuemin="0" aria-valuemax="100" aria-label="${score}% de compatibilidade">
      <div class="compat-bar-fill" style="--compat-value:${score}%;width:${score}%"></div>
    </div>
  `;
}

/* ── String Helpers ─────────────────────────────────────────── */
function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');
}

function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/* ── URL / Navigation Helpers ───────────────────────────────── */
function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

function setQueryParam(key, value) {
  const url = new URL(window.location);
  url.searchParams.set(key, value);
  history.replaceState(null, '', url);
}

function navigate(path) {
  window.location.href = path;
}

function navigateWithParam(path, key, value) {
  window.location.href = `${path}?${key}=${encodeURIComponent(value)}`;
}

/* ── DOM Helpers ────────────────────────────────────────────── */
function $(selector, context = document) {
  return context.querySelector(selector);
}

function $$(selector, context = document) {
  return [...context.querySelectorAll(selector)];
}

function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v);
  }
  for (const child of children) {
    if (child) el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }
function toggle(el, force) { if (el) el.classList.toggle('hidden', force); }

function setHTML(selector, html, context = document) {
  const el = typeof selector === 'string' ? $(selector, context) : selector;
  if (el) el.innerHTML = html;
}

function setText(selector, text, context = document) {
  const el = typeof selector === 'string' ? $(selector, context) : selector;
  if (el) el.textContent = text;
}

/* ── Modal Helpers ──────────────────────────────────────────── */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // Focus first focusable element
  const focusable = modal.querySelector('button, input, select, textarea, a');
  if (focusable) setTimeout(() => focusable.focus(), 50);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function closeModalOnOverlay(e, modalId) {
  if (e.target === e.currentTarget) closeModal(modalId);
}

/* ── Local Storage Helpers ──────────────────────────────────── */
const Storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(`vocare_${key}`);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(`vocare_${key}`, JSON.stringify(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem(`vocare_${key}`); } catch {}
  },
  clear() {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('vocare_'))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  },
};

/* ── Debounce / Throttle ────────────────────────────────────── */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function throttle(fn, limit = 300) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= limit) { last = now; fn(...args); }
  };
}

/* ── Validation ─────────────────────────────────────────────── */
const Validate = {
  email(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  phone(phone) {
    return /^\(?(\d{2})\)?[\s-]?(\d{4,5})[\s-]?(\d{4})$/.test(phone.replace(/\D/g, '').slice(0, 11));
  },
  password(pwd) {
    return pwd && pwd.length >= 8;
  },
  required(val) {
    return val !== null && val !== undefined && String(val).trim() !== '';
  },
  minLength(val, min) {
    return String(val).length >= min;
  },
};

/* ── Form Validation ────────────────────────────────────────── */
function validateForm(form, rules) {
  const errors = {};
  for (const [field, ruleset] of Object.entries(rules)) {
    const input = form.querySelector(`[name="${field}"], #${field}`);
    const value = input ? input.value : '';

    for (const rule of ruleset) {
      const [type, ...params] = rule.split(':');
      let valid = true;

      if      (type === 'required')   valid = Validate.required(value);
      else if (type === 'email')      valid = Validate.email(value);
      else if (type === 'password')   valid = Validate.password(value);
      else if (type === 'minLength')  valid = Validate.minLength(value, +params[0]);

      if (!valid) {
        const messages = {
          required:  'Este campo é obrigatório.',
          email:     'Digite um e-mail válido.',
          password:  'A senha deve ter no mínimo 8 caracteres.',
          minLength: `Mínimo de ${params[0]} caracteres.`,
        };
        errors[field] = messages[type] || 'Valor inválido.';
        break;
      }
    }
  }
  return errors;
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);
  if (!field) return;
  field.classList.add('error');
  const existing = field.parentElement.querySelector('.form-hint.error');
  if (existing) existing.remove();
  const hint = document.createElement('span');
  hint.className = 'form-hint error';
  hint.setAttribute('role', 'alert');
  hint.textContent = message;
  field.parentElement.appendChild(hint);
}

function clearFieldErrors(form) {
  form.querySelectorAll('.form-control.error').forEach(f => f.classList.remove('error'));
  form.querySelectorAll('.form-hint.error').forEach(h => h.remove());
}

/* ── Phone Mask ─────────────────────────────────────────────── */
function applyPhoneMask(input) {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (v.length > 6) {
      v = v.replace(/^(\d{2})(\d{4})(\d*)$/, '($1) $2-$3');
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d*)$/, '($1) $2');
    }
    input.value = v;
  });
}

/* ── Clipboard ──────────────────────────────────────────────── */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    Toast.success('Copiado para a área de transferência!');
    return true;
  } catch {
    Toast.error('Não foi possível copiar.');
    return false;
  }
}

/* ── Random Avatar Color (deterministic by name) ─────────────── */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #1A3C6E, #2E6DB4)',
  'linear-gradient(135deg, #2E6DB4, #3A82D4)',
  'linear-gradient(135deg, #2E8B57, #1A7A46)',
  'linear-gradient(135deg, #6B21A8, #9333EA)',
  'linear-gradient(135deg, #C2410C, #EA580C)',
  'linear-gradient(135deg, #0F766E, #0D9488)',
  'linear-gradient(135deg, #1D4ED8, #3B82F6)',
  'linear-gradient(135deg, #9D174D, #EC4899)',
];

function avatarGradient(name) {
  if (!name) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/* ── Stars Renderer ─────────────────────────────────────────── */
function renderStars(score, max = 10) {
  const stars = Math.round((score / max) * 5);
  return Array(5).fill(0).map((_, i) =>
    `<span class="star ${i < stars ? 'filled' : 'empty'}" aria-hidden="true">${i < stars ? '★' : '☆'}</span>`
  ).join('');
}

/* ── Area Icon Map ──────────────────────────────────────────── */
const AREA_ICONS = {
  'Tecnologia':       '💻',
  'Saúde':            '🏥',
  'Educação':         '📚',
  'Engenharia':       '⚙️',
  'Direito':          '⚖️',
  'Artes':            '🎨',
  'Administração':    '📊',
  'Comunicação':      '📣',
  'Ciências':         '🔬',
  'Meio Ambiente':    '🌿',
  'Segurança':        '🛡️',
  'Agronegócio':      '🌾',
  'Esportes':         '⚽',
  'Gastronomia':      '🍳',
  'Moda':             '👗',
};

function areaIcon(area) {
  return AREA_ICONS[area] || '🎯';
}

/* ── Error Handler ──────────────────────────────────────────── */
function handleError(err, fallbackMessage = 'Ocorreu um erro. Tente novamente.') {
  console.error('[Vocare]', err);
  const msg = err?.message || err?.error_description || fallbackMessage;

  // Map Supabase auth errors to PT-BR
  const errorMap = {
    'Invalid login credentials':     'E-mail ou senha incorretos.',
    'Email not confirmed':            'Confirme seu e-mail antes de entrar.',
    'User already registered':        'Este e-mail já está cadastrado.',
    'Password should be at least 6': 'A senha deve ter pelo menos 6 caracteres.',
    'JWT expired':                    'Sua sessão expirou. Faça login novamente.',
    'not authorized':                 'Você não tem permissão para isso.',
  };

  for (const [key, translated] of Object.entries(errorMap)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return translated;
  }

  return msg;
}

/* ── Auto-resize Textarea ───────────────────────────────────── */
function autoResizeTextarea(textarea) {
  function resize() {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }
  textarea.addEventListener('input', resize);
  resize();
}

/* ── Scroll to Bottom ───────────────────────────────────────── */
function scrollToBottom(el, smooth = true) {
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
}

/* ── Safe JSON Parse ────────────────────────────────────────── */
function safeJSON(str, fallback = null) {
  if (!str || typeof str !== 'string') return fallback;
  try { return JSON.parse(str.trim()); } catch {}
  // Extrai primeiro bloco JSON do texto (LLMs às vezes adicionam texto extra)
  const match = str.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) { try { return JSON.parse(match[1]); } catch {} }
  return fallback;
}

/* ── Export globals ─────────────────────────────────────────── */
window.Toast      = Toast;
window.Loader     = Loader;
window.Storage    = Storage;
window.Validate   = Validate;

window.setButtonLoading   = setButtonLoading;
window.escapeHtml         = escapeHtml;
window.sanitizeText       = sanitizeText;
window.formatDate         = formatDate;
window.formatDateShort    = formatDateShort;
window.formatTime         = formatTime;
window.formatDateTime     = formatDateTime;
window.timeAgo            = timeAgo;
window.getAge             = getAge;
window.initials           = initials;
window.pluralize          = pluralize;
window.slugify            = slugify;
window.capitalize         = capitalize;
window.getQueryParam      = getQueryParam;
window.setQueryParam      = setQueryParam;
window.navigate           = navigate;
window.navigateWithParam  = navigateWithParam;
window.$                  = $;
window.$$                 = $$;
window.show               = show;
window.hide               = hide;
window.toggle             = toggle;
window.setHTML            = setHTML;
window.setText            = setText;
window.openModal          = openModal;
window.closeModal         = closeModal;
window.closeModalOnOverlay= closeModalOnOverlay;
window.validateForm       = validateForm;
window.showFieldError     = showFieldError;
window.clearFieldErrors   = clearFieldErrors;
window.applyPhoneMask     = applyPhoneMask;
window.copyToClipboard    = copyToClipboard;
window.getCompatClass     = getCompatClass;
window.compatBadge        = compatBadge;
window.compatBar          = compatBar;
window.avatarGradient     = avatarGradient;
window.renderStars        = renderStars;
window.areaIcon           = areaIcon;
window.handleError        = handleError;
window.autoResizeTextarea = autoResizeTextarea;
window.scrollToBottom     = scrollToBottom;
window.safeJSON           = safeJSON;
window.debounce           = debounce;
window.throttle           = throttle;
window.skeletonList       = skeletonList;
window.createElement      = createElement;
