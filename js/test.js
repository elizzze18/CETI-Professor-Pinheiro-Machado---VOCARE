/* ============================================================
   VOCARE — Vocational Test
   js/test.js · Questionário adaptativo com TestAI
   ============================================================ */

'use strict';

/* ── State ──────────────────────────────────────────────────── */
let _userId       = null;
let _vocProfile   = null;
let _currentQ     = null;   // current question object { question, options, is_final, profile }
let _selectedIdx  = null;   // index of selected option (0-3)
let _questionNum  = 0;
let _maxQuestions = CONFIG.AI.TEST_MAX_QUESTIONS; // 15
let _isLoading    = false;

/* ── DOM refs ───────────────────────────────────────────────── */
const questionBlock     = document.getElementById('questionBlock');
const questionCounter   = document.getElementById('questionCounter');
const progressBar       = document.getElementById('progressBar');
const thinkingOverlay   = document.getElementById('thinkingOverlay');
const completingOverlay = document.getElementById('completingOverlay');

/* ── Init ───────────────────────────────────────────────────── */
(async function init() {
  // 1. Require student auth
  const user = await Auth.requireStudent();
  if (!user) return;
  _userId = user.id;

  initNavAvatar();

  // 2. Load profile — allow retaking test at any time
  try {
    const vp = await DB.vocationalProfiles.get(_userId);
    if (vp && vp.completed_test) {
      // Show informational banner but don't block the test
      const banner = document.createElement('div');
      banner.className = 'alert alert-info';
      banner.style.cssText = 'margin:var(--space-4) var(--space-4) 0;border-radius:var(--radius-lg)';
      banner.innerHTML = '<span class="alert-icon">🔄</span><span>Refazendo o teste — suas recomendações serão <strong>atualizadas</strong> ao final.</span>';
      const main = document.querySelector('.page-content') || document.querySelector('main');
      if (main) main.prepend(banner);
    }
    _vocProfile = vp || null;
  } catch (e) {
    console.warn('[Test] Could not load vocational profile:', e.message);
  }

  // 3. Fetch first question
  await _loadFirstQuestion();
})();

/* ── Load first question ────────────────────────────────────── */
async function _loadFirstQuestion() {
  _showThinking(true);
  try {
    const q = await TestAI.getFirstQuestion(_vocProfile);
    _showThinking(false);
    if (!q) {
      Toast.error('Não foi possível iniciar o teste. Tente novamente.');
      return;
    }
    _questionNum = 1;
    _currentQ    = q;
    _selectedIdx = null;
    _renderQuestion(q);
  } catch (err) {
    _showThinking(false);
    Toast.error('Erro ao carregar o teste. Verifique sua conexão.');
    console.error('[Test] First question error:', err);
  }
}

/* ── Render question ────────────────────────────────────────── */
function _renderQuestion(q, animate = true) {
  _selectedIdx = null;

  const progress = Math.round((_questionNum - 1) / _maxQuestions * 100);
  progressBar.style.width = progress + '%';
  progressBar.setAttribute('aria-valuenow', progress);
  questionCounter.textContent = `Pergunta ${_questionNum} de ~${_maxQuestions}`;

  // Build question block HTML
  const letters = ['A', 'B', 'C', 'D'];

  const html = `
    <p class="test-question-label">Pergunta ${_questionNum}</p>
    <p class="test-question-text" id="questionText">${escapeHtml(q.question)}</p>
    <div class="test-options" id="optionsContainer" role="radiogroup" aria-label="Opções de resposta">
      ${(q.options || []).map((opt, i) => `
        <button
          class="answer-option"
          role="radio"
          aria-checked="false"
          data-index="${i}"
          type="button"
        >
          <span class="option-letter" aria-hidden="true">${letters[i] || i + 1}</span>
          <span class="option-text">${escapeHtml(opt)}</span>
        </button>
      `).join('')}
    </div>
    <div class="test-nav">
      <div class="test-nav-spacer"></div>
      <button
        id="nextBtn"
        class="btn btn-primary btn-lg"
        disabled
        type="button"
        aria-disabled="true"
      >
        Próxima →
      </button>
    </div>
  `;

  if (animate) {
    // Clear + animate in
    questionBlock.innerHTML = '';
    questionBlock.style.opacity = '0';
    questionBlock.style.transform = 'translateY(20px)';
    questionBlock.innerHTML = html;

    // Trigger reflow then animate
    requestAnimationFrame(() => {
      questionBlock.style.transition = 'opacity 300ms ease, transform 300ms ease';
      questionBlock.style.opacity = '1';
      questionBlock.style.transform = 'translateY(0)';
    });
  } else {
    questionBlock.innerHTML = html;
  }

  // Bind option clicks
  const optionBtns = questionBlock.querySelectorAll('.answer-option');
  const nextBtn    = document.getElementById('nextBtn');

  optionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      _selectOption(idx, optionBtns, nextBtn);
    });
  });

  if (nextBtn) {
    nextBtn.addEventListener('click', _handleNext);
  }
}

/* ── Select option ──────────────────────────────────────────── */
function _selectOption(idx, optionBtns, nextBtn) {
  _selectedIdx = idx;

  optionBtns.forEach((btn, i) => {
    btn.classList.toggle('selected', i === idx);
    btn.setAttribute('aria-checked', i === idx ? 'true' : 'false');
  });

  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.setAttribute('aria-disabled', 'false');
    // Subtle bounce animation
    nextBtn.style.transform = 'scale(1.03)';
    setTimeout(() => { nextBtn.style.transform = ''; }, 200);
  }
}

/* ── Handle next ────────────────────────────────────────────── */
async function _handleNext() {
  if (_isLoading || _selectedIdx === null || !_currentQ) return;

  const selectedText = _currentQ.options[_selectedIdx];
  const letters = ['A', 'B', 'C', 'D'];
  const answer   = `${letters[_selectedIdx]}) ${selectedText}`;

  // Animate question out
  await _animateOut();

  _isLoading = true;
  _showThinking(true);

  try {
    const nextQ = await TestAI.answerQuestion(answer);
    _showThinking(false);
    _isLoading = false;

    if (!nextQ) {
      Toast.error('Erro ao processar resposta. Tente novamente.');
      _renderQuestion(_currentQ, false);
      return;
    }

    _currentQ = nextQ;
    _questionNum++;

    // Check if final (IA sinalizou OR atingiu limite de perguntas)
    if ((nextQ.is_final && nextQ.profile) || _questionNum > _maxQuestions) {
      _updateProgressFull();
      await _finishTest(nextQ.profile || _buildFallbackProfile());
      return;
    }

    _selectedIdx = null;
    _renderQuestion(nextQ);

  } catch (err) {
    _showThinking(false);
    _isLoading = false;
    Toast.error('Erro ao carregar próxima pergunta. Tente novamente.');
    console.error('[Test] Answer error:', err);
    // Re-render current question so user can retry
    _renderQuestion(_currentQ, false);
  }
}

/* ── Animate question out ───────────────────────────────────── */
function _animateOut() {
  return new Promise(resolve => {
    questionBlock.style.transition = 'opacity 250ms ease, transform 250ms ease';
    questionBlock.style.opacity    = '0';
    questionBlock.style.transform  = 'translateY(-16px)';
    setTimeout(resolve, 260);
  });
}

/* ── Update progress to 100% ────────────────────────────────── */
function _updateProgressFull() {
  progressBar.style.width = '100%';
  progressBar.setAttribute('aria-valuenow', 100);
  questionCounter.textContent = 'Concluído!';
}

/* ── Finish test ────────────────────────────────────────────── */
async function _finishTest(aiProfile) {
  // Show completing overlay
  show(completingOverlay);

  const stepIds = ['step1', 'step2', 'step3', 'step4'];
  const stepDelays = [0, 1800, 3600, 5400];

  // Activate steps with delays
  stepIds.forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add('active');
      // Mark previous as done
      if (i > 0) {
        const prev = document.getElementById(stepIds[i - 1]);
        if (prev) {
          prev.classList.remove('active');
          prev.classList.add('done');
          prev.querySelector('.test-step-icon').textContent = '✅';
        }
      }
    }, stepDelays[i]);
  });

  try {
    // 1. Save profile to vocational_profiles
    const existingVP = await DB.vocationalProfiles.get(_userId).catch(() => null);
    const profileUpdate = {
      completed_test: true,
      updated_at:     new Date().toISOString(),
      // Merge AI test data into raw_profile (preserva onboarding)
      raw_profile: { ...(existingVP?.raw_profile || {}), test: aiProfile },
    };
    if (aiProfile.interests?.length)   profileUpdate.interests          = aiProfile.interests;
    if (aiProfile.traits?.length)      profileUpdate.personality_traits = aiProfile.traits;
    // top_areas e recommended_professions são salvas se a coluna existir (migration 004)
    if (aiProfile.top_areas?.length)              profileUpdate.top_areas              = aiProfile.top_areas;
    if (aiProfile.recommended_professions?.length) profileUpdate.recommended_professions = aiProfile.recommended_professions;

    await DB.vocationalProfiles.upsert(_userId, profileUpdate).catch(async (e) => {
      // Fallback: colunas top_areas/recommended_professions podem não existir ainda
      console.warn('[Test] Upsert com colunas novas falhou, tentando sem elas:', e.message);
      delete profileUpdate.top_areas;
      delete profileUpdate.recommended_professions;
      await DB.vocationalProfiles.upsert(_userId, profileUpdate);
    });

    // 2. Load all professions and calculate compatibility scores
    let professions = [];
    try {
      professions = await DB.professions.list();
    } catch (e) {
      console.warn('[Test] Could not load professions:', e.message);
    }

    // 3. Score professions
    const scored = _scoreProfessions(professions, aiProfile);

    // 4. Save top-10 recommendations
    if (scored.length > 0) {
      const top10 = scored.slice(0, CONFIG.BUSINESS.TOP_RECOMMENDATIONS);
      try {
        await DB.recommendations.save(
          _userId,
          top10.map(p => ({ professionId: p.id, score: p.score }))
        );
      } catch (e) {
        console.warn('[Test] Could not save recommendations:', e.message);
      }
    }

    // 5. Generate career plan for top profession
    await _delay(2000); // wait for step animations
    _markStepDone('step3');

    if (scored.length > 0) {
      try {
        const topProf = scored[0];
        const plan = await generateCareerPlan(
          { ...(_vocProfile || {}), ...aiProfile, area: topProf.area || '' },
          topProf.name || topProf.profession_name || 'profissão em destaque'
        );

        if (plan) {
          await DB.careerPlans.save(_userId, topProf.id, plan);
        }
      } catch (e) {
        console.warn('[Test] Could not generate career plan:', e.message);
        // Non-fatal — dashboard works without career plan
      }
    }

    // Mark last step done
    await _delay(1200);
    _markStepDone('step4');
    await _delay(700);

    // 6. Redirect to dashboard
    navigate(CONFIG.ROUTES.DASHBOARD);

  } catch (err) {
    hide(completingOverlay);
    Toast.error('Erro ao salvar resultados. Tente novamente.');
    console.error('[Test] Finish error:', err);
    _isLoading = false;
    // Re-render last question so student can retry
    _renderQuestion(_currentQ);
  }
}


/* ── Fallback profile quando IA não retornou dados estruturados ── */
function _buildFallbackProfile() {
  const vp = _vocProfile || {};
  return {
    interests:              vp.interests || [],
    traits:                 vp.personality_traits || [],
    top_areas:              vp.top_areas || [],
    recommended_professions: vp.recommended_professions || [],
  };
}

/* ── Area normalization (AI may return non-canonical names) ─── */
const _AREA_NORMALIZE = {
  'tecnologia': 'tecnologia', 'ti': 'tecnologia', 'computação': 'tecnologia',
  'informática': 'tecnologia', 'software': 'tecnologia', 'programação': 'tecnologia',
  'desenvolvimento': 'tecnologia', 'computador': 'tecnologia', 'digital': 'tecnologia',
  'saúde': 'saúde', 'medicina': 'saúde', 'enfermagem': 'saúde', 'farmácia': 'saúde',
  'educação': 'educação', 'ensino': 'educação', 'pedagogia': 'educação',
  'direito': 'direito', 'jurídico': 'direito', 'advocacia': 'direito', 'lei': 'direito',
  'engenharia': 'engenharia', 'construção': 'engenharia', 'engenheiro': 'engenharia',
  'administração': 'administração', 'gestão': 'administração', 'negócios': 'administração',
  'comunicação': 'comunicação', 'marketing': 'comunicação', 'jornalismo': 'comunicação',
  'artes': 'artes', 'design': 'artes', 'arte': 'artes', 'música': 'artes',
  'ciências': 'ciências', 'biologia': 'ciências', 'química': 'ciências', 'física': 'ciências',
  'agronegócio': 'agronegócio', 'agricultura': 'agronegócio', 'campo': 'agronegócio',
  'gastronomia': 'gastronomia', 'culinária': 'gastronomia', 'cozinha': 'gastronomia',
  'meio ambiente': 'meio ambiente', 'ambiental': 'meio ambiente', 'natureza': 'meio ambiente',
};

const _INTEREST_AREA_MAP = {
  'computador': 'tecnologia', 'computadores': 'tecnologia', 'programação': 'tecnologia',
  'código': 'tecnologia', 'software': 'tecnologia', 'jogo': 'tecnologia', 'jogos': 'tecnologia',
  'tecnologia': 'tecnologia', 'robótica': 'tecnologia', 'internet': 'tecnologia',
  'médico': 'saúde', 'médica': 'saúde', 'hospital': 'saúde', 'saúde': 'saúde',
  'biologia': 'saúde', 'remédio': 'saúde',
  'ensinar': 'educação', 'professor': 'educação', 'escola': 'educação', 'educação': 'educação',
  'direito': 'direito', 'lei': 'direito', 'justiça': 'direito', 'advogado': 'direito',
  'matemática': 'engenharia', 'construir': 'engenharia', 'máquinas': 'engenharia',
  'empresa': 'administração', 'empreender': 'administração', 'negócios': 'administração',
  'escrever': 'comunicação', 'comunicar': 'comunicação', 'mídia': 'comunicação',
  'desenhar': 'artes', 'arte': 'artes', 'pintura': 'artes', 'design': 'artes', 'música': 'artes',
  'animais': 'meio ambiente', 'plantas': 'meio ambiente', 'natureza': 'meio ambiente',
  'cozinhar': 'gastronomia', 'culinária': 'gastronomia',
  'fazenda': 'agronegócio', 'agricultura': 'agronegócio',
};

function _normalizeArea(area) {
  return _AREA_NORMALIZE[(area || '').toLowerCase()] || (area || '').toLowerCase();
}

function _interestImpliedAreas(vocProfile) {
  const interests = [
    ...(vocProfile?.interests || []),
    ...(vocProfile?.raw_profile?.interests || []),
    ...(vocProfile?.raw_profile?.test?.interests || []),
  ];
  const areas = new Set();
  interests.forEach(interest => {
    const key = (interest || '').toLowerCase();
    if (_INTEREST_AREA_MAP[key]) {
      areas.add(_INTEREST_AREA_MAP[key]);
    }
    Object.entries(_INTEREST_AREA_MAP).forEach(([k, v]) => {
      if (key.includes(k) || k.includes(key)) areas.add(v);
    });
  });
  return [...areas];
}

/* ── Score professions ──────────────────────────────────────── */
function _scoreProfessions(professions, aiProfile) {
  const topAreas         = (aiProfile.top_areas || []).map(_normalizeArea);
  const recommendedNames = (aiProfile.recommended_professions || []).map(r => r.toLowerCase());
  const interestAreas    = _interestImpliedAreas(_vocProfile);

  const allMatchAreas = [...new Set([...topAreas, ...interestAreas])];

  return professions
    .map(prof => {
      const name = (prof.name || '').toLowerCase();
      const area = _normalizeArea(prof.area);
      let score  = 0;

      const isRecommended = recommendedNames.some(r =>
        name.includes(r) || r.includes(name)
      );
      const areaMatch = allMatchAreas.some(a =>
        area === a || area.includes(a) || a.includes(area)
      );

      // Use profile interests in seed so scores vary per student profile
      const profileSeed = (aiProfile.interests || []).join('') + (aiProfile.traits || []).join('');

      if (isRecommended) {
        score = _seededRand(prof.name + profileSeed, 80, 95);
      } else if (areaMatch) {
        score = _seededRand(prof.name + profileSeed, 60, 79);
      } else {
        score = _seededRand(prof.name, 30, 55);
      }

      return { ...prof, score };
    })
    .sort((a, b) => b.score - a.score);
}

/* ── Seeded deterministic random (based on string hash) ─────── */
function _seededRand(seed, min, max) {
  let hash = 0;
  const str = String(seed || '');
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000; // 0..0.999
  return Math.round(min + normalized * (max - min));
}

/* ── Mark step done ─────────────────────────────────────────── */
function _markStepDone(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('active');
  el.classList.add('done');
  const icon = el.querySelector('.test-step-icon');
  if (icon) icon.textContent = '✅';
}

/* ── Show/hide thinking overlay ─────────────────────────────── */
function _showThinking(visible) {
  if (visible) {
    thinkingOverlay.classList.remove('hidden');
  } else {
    thinkingOverlay.classList.add('hidden');
  }
}

/* ── Helpers ────────────────────────────────────────────────── */
function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
