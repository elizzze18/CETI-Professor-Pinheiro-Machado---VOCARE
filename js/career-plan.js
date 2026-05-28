/* ============================================================
   VOCARE — Career Plan Module
   js/career-plan.js · Exibição e gestão do plano de carreira
   ============================================================ */

'use strict';

let _plan        = null;
let _profession  = null;
let _recScore    = 0;
let _isToggling  = false; // guard against rapid double-tap

/* ── Init ───────────────────────────────────────────────────── */
async function initCareerPlan() {
  const user = await Auth.requireStudent();
  if (!user) return;

  initNavAvatar();
  const profile = Auth.profile;
  if (profile) {
    const nameEl  = document.getElementById('dropdownName');
    const emailEl = document.getElementById('dropdownEmail');
    if (nameEl)  nameEl.textContent  = profile.name  || '';
    if (emailEl) emailEl.textContent = profile.email || '';
    populateUserUI(profile);
  }

  // Tab navigation
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // ── Persistent event delegation (set ONCE — avoids accumulation on re-renders)
  const goalsList  = document.getElementById('goalsList');
  const skillsGrid = document.getElementById('skillsGrid');

  goalsList.addEventListener('click', (e) => {
    const item = e.target.closest('[data-goal-idx]');
    if (item && !_isToggling) toggleGoal(parseInt(item.dataset.goalIdx, 10));
  });
  goalsList.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      const item = e.target.closest('[data-goal-idx]');
      if (item && !_isToggling) { e.preventDefault(); toggleGoal(parseInt(item.dataset.goalIdx, 10)); }
    }
  });
  skillsGrid.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-skill-idx]');
    if (chip) _applySkillToggle(chip);
  });

  // Load plan
  const professionId = getQueryParam('profession_id');
  if (professionId) {
    await generatePlanForProfession(professionId);
  } else {
    await loadExistingPlan();
  }
}

/* ── Load existing plan ─────────────────────────────────────── */
async function loadExistingPlan() {
  show(document.getElementById('loadingState'));
  hide(document.getElementById('noPlanState'));
  hide(document.getElementById('planContent'));
  hide(document.getElementById('generatingState'));

  try {
    // Load plan and recommendations in parallel
    const [existingPlan, recs] = await Promise.all([
      DB.careerPlans.get(Auth.userId),
      DB.recommendations.getForStudent(Auth.userId, 10).catch(() => []),
    ]);

    _plan = existingPlan;

    if (!_plan) {
      hide(document.getElementById('loadingState'));
      await _autoGeneratePlan(recs);
      return;
    }

    // Plan exists — get its compatibility score from recs
    _profession = _plan.profession || {};
    const rec  = recs.find(r => r.profession_id === _plan.profession_id);
    _recScore  = rec?.compatibility_score || 0;

    hide(document.getElementById('loadingState'));
    renderPlan();
    show(document.getElementById('planContent'));

    // Staleness notice — plan older than 30 days
    const ts = _plan.generated_at || _plan.updated_at;
    if (ts && (Date.now() - new Date(ts).getTime()) / 86400000 > 30) {
      _showStalenessNotice();
    }

  } catch (err) {
    hide(document.getElementById('loadingState'));
    Toast.error(handleError(err));
    show(document.getElementById('noPlanState'));
  }
}

/* ── Auto-generate plan from top affinity recommendation ─────── */
async function _autoGeneratePlan(recs) {
  // Priority 1: top career_recommendation with a real profession record
  const topRec = recs?.[0];
  if (topRec?.profession_id) {
    await generatePlanForProfession(topRec.profession_id);
    return;
  }

  // Priority 2: vocational profile recommended_professions[0]
  let vp = null;
  try { vp = await DB.vocationalProfiles.get(Auth.userId); } catch {}

  if (!vp?.completed_test) {
    show(document.getElementById('noPlanState'));
    return;
  }

  // Try to match by name in professions table
  const topProfName = vp.recommended_professions?.[0];
  if (topProfName) {
    let profId = null;
    try {
      const all   = await DB.professions.list();
      const match = all.find(p => p.name?.toLowerCase() === topProfName.toLowerCase());
      if (match) profId = match.id;
    } catch {}

    if (profId) {
      await generatePlanForProfession(profId);
      return;
    }

    // No DB record — generate by name with profile context
    _profession = { name: topProfName, area: vp.top_areas?.[0] || '' };
    show(document.getElementById('generatingState'));
    try {
      const planData = await generateCareerPlan(
        { ...(vp.raw_profile || {}), area: _profession.area },
        topProfName
      );
      const saved = await DB.careerPlans.save(Auth.userId, null, planData);
      _plan = { ...saved, profession: _profession };
      hide(document.getElementById('generatingState'));
      renderPlan();
      show(document.getElementById('planContent'));
      Toast.success('Seu plano de carreira foi criado! 🎉');
    } catch (err) {
      hide(document.getElementById('generatingState'));
      Toast.error(handleError(err));
      show(document.getElementById('noPlanState'));
    }
    return;
  }

  show(document.getElementById('noPlanState'));
}

/* ── Generate plan for a specific profession ────────────────── */
async function generatePlanForProfession(professionId) {
  show(document.getElementById('generatingState'));
  hide(document.getElementById('loadingState'));
  hide(document.getElementById('planContent'));
  hide(document.getElementById('noPlanState'));

  try {
    const [profession, vocProfile, recs] = await Promise.all([
      DB.professions.get(professionId),
      DB.vocationalProfiles.get(Auth.userId).catch(() => null),
      DB.recommendations.getForStudent(Auth.userId, 10).catch(() => []),
    ]);

    const rec  = recs.find(r => r.profession_id === professionId);
    _recScore  = rec?.compatibility_score || 0;
    _profession = { name: profession.name, area: profession.area || '' };

    // Build enriched profile for the AI — includes areas, interests, and top recs for better context
    const topRecNames = recs.slice(0, 5).map(r => r.profession?.name).filter(Boolean);
    const enrichedProfile = {
      ...(vocProfile?.raw_profile || {}),
      area:                   profession.area || '',
      top_areas:              vocProfile?.top_areas || [],
      recommended_professions: topRecNames.length ? topRecNames : (vocProfile?.recommended_professions || []),
    };

    const planData = await generateCareerPlan(enrichedProfile, profession.name);

    const saved = await DB.careerPlans.save(Auth.userId, professionId, planData);
    // Preserve profession info — save() doesn't return the join
    _plan = { ...saved, profession: _profession };

    hide(document.getElementById('generatingState'));
    renderPlan();
    show(document.getElementById('planContent'));
    Toast.success('Seu plano de carreira foi criado! 🎉');

  } catch (err) {
    hide(document.getElementById('generatingState'));
    Toast.error(handleError(err));
    show(document.getElementById('noPlanState'));
  }
}

/* ── Regenerate plan when no profession_id (auto-generated) ─── */
async function _regeneratePlanByName(profName) {
  if (!profName) { navigate(CONFIG.ROUTES.PROFESSIONS); return; }

  show(document.getElementById('generatingState'));
  hide(document.getElementById('planContent'));

  try {
    const vocProfile = await DB.vocationalProfiles.get(Auth.userId).catch(() => null);

    const planData = await generateCareerPlan(
      { ...(vocProfile?.raw_profile || {}), area: _profession?.area || '' },
      profName
    );

    const saved = await DB.careerPlans.save(Auth.userId, null, planData);
    _plan = { ...saved, profession: _profession };

    hide(document.getElementById('generatingState'));
    renderPlan();
    show(document.getElementById('planContent'));
    Toast.success('Plano atualizado! 🎉');

  } catch (err) {
    hide(document.getElementById('generatingState'));
    Toast.error(handleError(err));
    show(document.getElementById('planContent'));
  }
}

/* ── Render plan (header + tabs) ────────────────────────────── */
function renderPlan() {
  if (!_plan) return;

  const profName = _profession?.name || _plan.profession?.name || 'Carreira';
  const area     = _profession?.area || _plan.profession?.area || '';

  document.getElementById('planProfessionName').textContent = profName;
  document.getElementById('planAreaBadge').textContent      = area;
  document.getElementById('planAreaIcon').textContent       = areaIcon(area);

  const compatEl = document.getElementById('planCompatBadge');
  if (compatEl) compatEl.innerHTML = _recScore > 0 ? compatBadge(_recScore) : '';

  renderGoalsProgress();
  renderLearningPath();
  renderCourses();
  renderSkills();
  renderGoals();

  // Use onclick (not addEventListener) so re-renders don't stack handlers
  document.getElementById('shareBtn').onclick = async () => {
    const url = `${window.location.origin}/student/career-plan.html?shared=${_plan.id}`;
    const ok  = await copyToClipboard(url);
    if (ok !== false) Toast.success('Link copiado!');
  };

  document.getElementById('regenBtn').onclick = async () => {
    if (!confirm('Gerar um novo plano irá substituir o atual. Continuar?')) return;
    const profId = _plan.profession_id;
    if (profId) {
      await generatePlanForProfession(profId);
    } else {
      await _regeneratePlanByName(_profession?.name || _plan.profession?.name);
    }
  };
}

/* ── Goals progress bar ─────────────────────────────────────── */
function renderGoalsProgress() {
  const goals = _plan?.weekly_goals || [];
  const done  = _countDone(goals);
  const total = goals.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const textEl = document.getElementById('planProgressText');
  const barEl  = document.getElementById('planProgressBar');
  if (textEl) textEl.textContent    = `${done}/${total}`;
  if (barEl)  barEl.style.width     = `${pct}%`;
  if (barEl)  barEl.setAttribute('aria-valuenow', pct);
}

/* ── Learning path timeline ─────────────────────────────────── */
function renderLearningPath() {
  const container = document.getElementById('learningPath');
  if (!container) return;
  const path = _plan?.learning_path || [];

  if (!path.length) {
    container.innerHTML = '<p style="color:var(--color-muted);font-size:var(--text-sm)">Nenhuma etapa definida ainda.</p>';
    return;
  }

  container.innerHTML = path.map((step, i) => `
    <div class="timeline-item animate-fade-in" style="animation-delay:${i * 80}ms">
      <div class="timeline-dot ${i === 0 ? 'active' : ''}"></div>
      <div class="card" style="padding:var(--space-4)">
        <p class="timeline-phase">${escapeHtml(step.phase || `Fase ${i + 1}`)}</p>
        <h4 class="timeline-title">${escapeHtml(step.description || '')}</h4>
        ${step.duration ? `<p class="timeline-dur">⏱ ${escapeHtml(step.duration)}</p>` : ''}
      </div>
    </div>
  `).join('');
}

/* ── Recommended courses ────────────────────────────────────── */
function renderCourses() {
  const container = document.getElementById('coursesGrid');
  if (!container) return;
  const courses = _plan?.recommended_courses || [];

  const freeCount = courses.filter(c => c.is_free).length;
  const freeEl    = document.getElementById('freeCoursesCount');
  if (freeEl) freeEl.textContent = freeCount > 0 ? `${freeCount} grátis` : '';

  if (!courses.length) {
    container.innerHTML = '<p style="color:var(--color-muted);font-size:var(--text-sm)">Nenhum curso definido ainda.</p>';
    return;
  }

  container.innerHTML = courses.map((course, i) => `
    <div class="course-card animate-fade-in" style="animation-delay:${i * 60}ms">
      <div class="course-icon" style="background:${course.is_free ? 'var(--color-success)' : 'var(--color-secondary)'}">
        📚
      </div>
      <div class="course-info">
        <div class="course-name">${escapeHtml(course.name || 'Curso')}</div>
        <div class="course-meta">${escapeHtml(course.platform || '')}${course.duration ? ` · ${escapeHtml(course.duration)}` : ''}</div>
        ${course.is_free ? '<span class="course-free">Gratuito</span>' : ''}
      </div>
      ${course.url ? `
        <a href="${escapeHtml(course.url)}" target="_blank" rel="noopener noreferrer"
           class="btn btn-outline-secondary btn-sm"
           aria-label="Acessar ${escapeHtml(course.name || 'curso')}">
          Acessar
        </a>` : ''}
    </div>
  `).join('');
}

/* ── Skills chips ───────────────────────────────────────────── */
function renderSkills() {
  const container = document.getElementById('skillsGrid');
  if (!container) return;
  const skills = _plan?.skills_to_develop || [];

  if (!skills.length) {
    container.innerHTML = '<p style="color:var(--color-muted);font-size:var(--text-sm)">Nenhuma habilidade definida ainda.</p>';
    return;
  }

  const savedStatuses = _plan?.id ? Storage.get(`skill_statuses_${_plan.id}`, {}) : {};
  const labels = { pending: '⬜', progress: '🔄', done: '✅' };

  // Render chips — click delegation already wired in initCareerPlan
  container.innerHTML = skills.map((skill, i) => {
    const current = savedStatuses[i] || 'pending';
    return `
      <button
        class="skill-chip ${current} animate-fade-in"
        data-skill-idx="${i}"
        style="animation-delay:${i * 40}ms"
        aria-label="${escapeHtml(skill)} — estado: ${current}"
        type="button"
      >
        ${labels[current]} ${escapeHtml(skill)}
      </button>`;
  }).join('');
}

/* ── Apply skill toggle (called by delegated listener) ─────── */
function _applySkillToggle(chip) {
  const skills   = _plan?.skills_to_develop || [];
  const idx      = parseInt(chip.dataset.skillIdx, 10);
  const statuses = ['pending', 'progress', 'done'];
  const current  = chip.classList.contains('done')     ? 'done'
                 : chip.classList.contains('progress') ? 'progress'
                 : 'pending';
  const next   = statuses[(statuses.indexOf(current) + 1) % statuses.length];
  const labels = { pending: '⬜', progress: '🔄', done: '✅' };

  chip.className = `skill-chip ${next} animate-fade-in-scale`;
  chip.textContent = `${labels[next]} ${skills[idx] || ''}`;
  chip.setAttribute('aria-label', `${skills[idx] || ''} — estado: ${next}`);

  if (_plan?.id) {
    const saved = Storage.get(`skill_statuses_${_plan.id}`, {});
    saved[idx]  = next;
    Storage.set(`skill_statuses_${_plan.id}`, saved);
  }
}

/* ── Weekly goals list ──────────────────────────────────────── */
function renderGoals() {
  const container = document.getElementById('goalsList');
  if (!container) return;
  const goals = _plan?.weekly_goals || [];

  const doneCount = _countDone(goals);
  const countEl   = document.getElementById('completedGoalsCount');
  if (countEl) countEl.textContent = `${doneCount}/${goals.length} concluídas`;

  if (!goals.length) {
    container.innerHTML = '<p style="color:var(--color-muted);font-size:var(--text-sm)">Nenhuma meta definida ainda.</p>';
    return;
  }

  // Render items — click/keydown delegation already wired in initCareerPlan
  container.innerHTML = goals.map((goal, i) => {
    const done = _isDone(goal);
    return `
      <div
        class="checklist-item ${done ? 'done' : ''} animate-fade-in"
        data-goal-idx="${i}"
        role="checkbox"
        aria-checked="${done}"
        tabindex="0"
        style="animation-delay:${i * 50}ms"
      >
        <div class="checklist-checkbox">${done ? '✓' : ''}</div>
        <div class="flex-1">
          <div class="checklist-text font-medium text-sm">${escapeHtml(goal.goal || '')}</div>
          <div class="text-xs text-muted mt-1">Semana ${goal.week || i + 1}</div>
        </div>
      </div>`;
  }).join('');
}

/* ── Toggle goal (optimistic update) ───────────────────────── */
async function toggleGoal(idx) {
  if (!_plan || _isToggling) return;
  const goals = [...(_plan.weekly_goals || [])];
  if (idx < 0 || idx >= goals.length) return;

  _isToggling = true;
  const originalGoal = { ...goals[idx] };

  // Flip status
  goals[idx] = {
    ...goals[idx],
    status:    _isDone(goals[idx]) ? 'pending' : 'done',
    completed: false, // normalise legacy field
  };

  // Optimistic — update UI immediately
  _plan = { ..._plan, weekly_goals: goals };
  renderGoalsProgress();
  renderGoals();

  try {
    const updated = await DB.careerPlans.updateGoals(_plan.id, goals);
    // Preserve profession join (updateGoals doesn't return it)
    _plan = { ...updated, profession: _plan.profession };
  } catch (err) {
    // Rollback
    goals[idx] = originalGoal;
    _plan = { ..._plan, weekly_goals: goals };
    renderGoalsProgress();
    renderGoals();
    Toast.error('Erro ao salvar meta. Tente novamente.');
  } finally {
    _isToggling = false;
  }
}

/* ── Tab switching ──────────────────────────────────────────── */
function switchTab(tabId) {
  document.querySelectorAll('.tab-item').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
    t.setAttribute('aria-selected', String(t.dataset.tab === tabId));
  });
  ['trilha', 'cursos', 'habilidades', 'metas'].forEach(id => {
    const el = document.getElementById(`tab-${id}`);
    if (el) el.classList.toggle('hidden', id !== tabId);
  });
}

/* ── Staleness notice ───────────────────────────────────────── */
function _showStalenessNotice() {
  const planContent = document.getElementById('planContent');
  if (!planContent || planContent.querySelector('.staleness-notice')) return;
  const notice = document.createElement('div');
  notice.className = 'alert alert-info staleness-notice';
  notice.style.cssText = 'margin-bottom:var(--space-4);border-radius:var(--radius-lg)';
  notice.innerHTML = `<span class="alert-icon">ℹ️</span>
    <span>Seu plano tem mais de 30 dias.
      <button id="stalenessRegenBtn" style="background:none;border:none;color:var(--color-secondary);font-weight:600;cursor:pointer;padding:0">
        Atualizar agora →
      </button>
    </span>`;
  planContent.prepend(notice);
  document.getElementById('stalenessRegenBtn').onclick = () => {
    document.getElementById('regenBtn')?.click();
  };
}

/* ── Helpers ────────────────────────────────────────────────── */
function _isDone(goal) {
  return goal.status === 'done' || goal.completed === true;
}

function _countDone(goals) {
  return goals.filter(_isDone).length;
}

document.addEventListener('DOMContentLoaded', initCareerPlan);
