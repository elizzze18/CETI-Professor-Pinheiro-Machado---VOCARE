/* ============================================================
   VOCARE — Mentors Module
   js/mentors.js · Lista de mentores, agendamento, modal
   ============================================================ */

'use strict';

let _allMentors = [];
let _filterArea = '';
let _onlyAvailable = false;
let _selectedMentor = null;
let _freeSessions = {};

async function initMentors() {
  const user = await Auth.requireStudent();
  if (!user) return;

  initNavAvatar();
  const profile = Auth.profile;
  if (profile) {
    document.getElementById('dropdownName').textContent  = profile.name;
    document.getElementById('dropdownEmail').textContent = profile.email || '';
  }

  // Filters
  document.getElementById('availableOnly').addEventListener('change', (e) => {
    _onlyAvailable = e.target.checked;
    renderMentors();
  });

  // Close modal on overlay click
  document.getElementById('mentorModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal('mentorModal');
  });

  await loadMentors();
}

async function loadMentors() {
  try {
    const [mentors, sessionsList] = await Promise.all([
      DB.mentors.list({ available: false }),
      DB.sessions.listForStudent(Auth.userId),
    ]);

    _allMentors = mentors;

    // Count sessions per mentor this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    mentors.forEach(m => {
      const count = sessionsList.filter(s =>
        s.mentor_id === m.id &&
        !s.is_premium &&
        s.status !== 'cancelled' &&
        new Date(s.created_at) >= monthStart
      ).length;
      _freeSessions[m.id] = Math.max(0, CONFIG.BUSINESS.FREE_SESSIONS_PER_MONTH - count);
    });

    // Update info banner
    const totalFree = Object.values(_freeSessions).some(v => v > 0);
    document.getElementById('sessionsInfoText').textContent = totalFree
      ? `Você tem sessões gratuitas disponíveis este mês! (${CONFIG.BUSINESS.FREE_SESSIONS_PER_MONTH} por mentor)`
      : 'Você usou todas as sessões gratuitas do mês. Sessões premium disponíveis.';

    // Build area filters
    buildAreaFilters();
    renderMentors();
  } catch (err) {
    Toast.error(handleError(err));
    document.getElementById('mentorsGrid').innerHTML = `<div class="card card-body"><p class="text-muted text-sm">Erro ao carregar mentores.</p></div>`;
  }
}

function buildAreaFilters() {
  const areas = [...new Set(_allMentors.map(m => m.area).filter(Boolean))].sort();
  const container = document.getElementById('areaFilters');

  const allBtn = container.querySelector('[data-area=""]');
  const existing = [...container.querySelectorAll('[data-area]')].filter(el => el.dataset.area !== '');
  existing.forEach(el => el.remove());

  areas.forEach(area => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.area = area;
    chip.textContent = `${areaIcon(area)} ${area}`;
    chip.setAttribute('aria-pressed', 'false');
    container.appendChild(chip);
  });

  container.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-area]');
    if (!chip) return;
    _filterArea = chip.dataset.area;
    container.querySelectorAll('.chip').forEach(c => {
      const active = c.dataset.area === _filterArea;
      c.classList.toggle('active', active);
      c.setAttribute('aria-pressed', String(active));
    });
    renderMentors();
  });
}

function renderMentors() {
  const container = document.getElementById('mentorsGrid');
  const empty = document.getElementById('mentorsEmpty');

  let filtered = _allMentors;
  if (_filterArea) filtered = filtered.filter(m => m.area === _filterArea);
  if (_onlyAvailable) filtered = filtered.filter(m => m.is_available);

  if (!filtered.length) {
    container.innerHTML = '';
    show(empty);
    return;
  }

  hide(empty);
  container.innerHTML = filtered.map(mentor => mentorCard(mentor)).join('');

  container.querySelectorAll('[data-mentor-id]').forEach(card => {
    card.addEventListener('click', () => openMentorModal(card.dataset.mentorId));
  });
}

function mentorCard(mentor) {
  const prof = mentor.profile || {};
  const name = prof.name || 'Mentor';
  const city = prof.city || '';
  const hasFree = (_freeSessions[mentor.id] || 0) > 0;
  const stars = renderStars(mentor.reputation_score || 0, 10);
  const avatarInit = initials(name);
  const avatarBg = avatarGradient(name);

  return `
    <div class="card card-clickable" role="listitem" data-mentor-id="${mentor.id}">
      <div class="card-body">
        <div class="flex items-start gap-3">
          <div class="avatar avatar-lg flex-shrink-0" style="background:${avatarBg}">
            ${prof.avatar_url ? `<img src="${escapeHtml(prof.avatar_url)}" alt="${escapeHtml(name)}">` : escapeHtml(avatarInit)}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-semi truncate" style="font-size:var(--text-base)">${escapeHtml(name)}</h3>
              ${mentor.is_available
                ? '<span class="badge-online" aria-label="Disponível agora">Disponível</span>'
                : '<span class="badge badge-muted" style="font-size:11px">Agendar</span>'
              }
            </div>
            <p class="text-sm text-muted mt-1">${escapeHtml(mentor.profession || mentor.area || '')}</p>
            <div class="flex items-center gap-2 mt-2">
              <div class="star-rating" aria-label="${mentor.reputation_score || 0} de 10">${stars}</div>
              <span class="text-xs text-muted">(${mentor.total_sessions || 0} sessões)</span>
            </div>
            ${city ? `<p class="text-xs text-muted mt-1">📍 ${escapeHtml(city)}</p>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-2 mt-3">
          ${hasFree
            ? `<span class="badge badge-success" style="font-size:11px">🎁 ${_freeSessions[mentor.id]} sessão grátis</span>`
            : `<span class="badge badge-muted" style="font-size:11px">Sessão premium</span>`
          }
          <span class="badge badge-secondary" style="font-size:11px">${escapeHtml(mentor.area || '')}</span>
        </div>
      </div>
    </div>
  `;
}

async function openMentorModal(mentorId) {
  _selectedMentor = _allMentors.find(m => m.id === mentorId);
  if (!_selectedMentor) return;

  const modal = document.getElementById('mentorModal');
  const content = document.getElementById('mentorModalContent');
  const prof = _selectedMentor.profile || {};
  const name = prof.name || 'Mentor';
  const hasFree = (_freeSessions[mentorId] || 0) > 0;
  const stars = renderStars(_selectedMentor.reputation_score || 0, 10);
  const avatarBg = avatarGradient(name);

  content.innerHTML = `
    <div class="modal-header">
      <div class="flex items-center gap-3">
        <div class="avatar avatar-md flex-shrink-0" style="background:${avatarBg}">
          ${prof.avatar_url ? `<img src="${escapeHtml(prof.avatar_url)}" alt="${escapeHtml(name)}">` : escapeHtml(initials(name))}
        </div>
        <div>
          <h3 id="mentorModalTitle">${escapeHtml(name)}</h3>
          <p class="text-sm text-muted">${escapeHtml(_selectedMentor.profession || _selectedMentor.area || '')}</p>
        </div>
      </div>
      <button class="modal-close" onclick="closeModal('mentorModal')" aria-label="Fechar">✕</button>
    </div>
    <div class="modal-body">
      <div class="flex items-center gap-3 mb-4">
        <div class="star-rating">${stars}</div>
        <span class="text-sm text-muted">${_selectedMentor.total_sessions || 0} sessões realizadas</span>
      </div>

      ${_selectedMentor.bio ? `<p class="text-sm mb-4" style="color:var(--color-text-soft);line-height:1.7">${escapeHtml(_selectedMentor.bio)}</p>` : ''}

      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="card" style="padding:var(--space-3)">
          <div class="text-xs text-muted mb-1">Área</div>
          <div class="font-semi text-sm">${areaIcon(_selectedMentor.area)} ${escapeHtml(_selectedMentor.area || 'N/A')}</div>
        </div>
        <div class="card" style="padding:var(--space-3)">
          <div class="text-xs text-muted mb-1">Experiência</div>
          <div class="font-semi text-sm">${_selectedMentor.experience_years || 0} anos</div>
        </div>
      </div>

      <div class="alert ${hasFree ? 'alert-success' : 'alert-warning'} mb-4">
        <span class="alert-icon">${hasFree ? '🎁' : '⚠️'}</span>
        <span class="text-sm">
          ${hasFree
            ? `Você tem <strong>${_freeSessions[mentorId]} sessão gratuita</strong> disponível com este mentor este mês.`
            : 'Você não tem sessões gratuitas disponíveis com este mentor este mês. Esta será uma sessão premium.'
          }
        </span>
      </div>

      <div id="suggestedQs" class="mb-4">
        <h4 class="font-semi text-sm mb-2">💡 Sugestões de perguntas:</h4>
        <div class="spinner spinner-sm mx-auto"></div>
      </div>
    </div>
    <div class="modal-footer" style="flex-direction:column;gap:var(--space-2)">
      <button id="startChatBtn" class="btn btn-primary btn-block" ${!_selectedMentor.is_available && !hasFree ? '' : ''}>
        💬 Iniciar chat${hasFree ? ' (gratuito)' : ' (premium)'}
      </button>
      <button class="btn btn-ghost btn-block btn-sm" onclick="closeModal('mentorModal')">Cancelar</button>
    </div>
  `;

  openModal('mentorModal');

  // Load suggested questions in background
  loadSuggestedQuestions(_selectedMentor.area);

  // Start chat
  document.getElementById('startChatBtn').addEventListener('click', () => {
    closeModal('mentorModal');
    startSession(mentorId);
  });
}

async function loadSuggestedQuestions(area) {
  try {
    const vocProfile = await DB.vocationalProfiles.get(Auth.userId);
    const questions = await getSuggestedQuestions(area, vocProfile?.raw_profile);
    const container = document.getElementById('suggestedQs');
    if (!container) return;
    container.innerHTML = `
      <h4 class="font-semi text-sm mb-2">💡 Sugestões de perguntas:</h4>
      <ul style="display:flex;flex-direction:column;gap:var(--space-2)">
        ${questions.map(q => `
          <li class="flex items-start gap-2" style="font-size:var(--text-sm);color:var(--color-text-soft)">
            <span style="color:var(--color-accent);flex-shrink:0">•</span>
            ${escapeHtml(q)}
          </li>
        `).join('')}
      </ul>
    `;
  } catch {}
}

async function startSession(mentorId) {
  Loader.show('Iniciando sessão...');
  try {
    const session = await DB.sessions.create({
      student_id:  Auth.userId,
      mentor_id:   mentorId,
      status:      'pending',
      type:        'chat',
      is_premium:  (_freeSessions[mentorId] || 0) <= 0,
      created_at:  new Date().toISOString(),
    });

    navigateWithParam(CONFIG.ROUTES.CHAT, 'session_id', session.id);
  } catch (err) {
    Loader.hide();
    Toast.error(handleError(err));
  }
}

document.addEventListener('DOMContentLoaded', initMentors);
