/* ============================================================
   VOCARE — Dashboard (Estudante)
   js/dashboard.js · Carrega dados em paralelo e popula o layout
   ============================================================ */

'use strict';

(async () => {

  /* ── 1. Autenticação e verificação de onboarding ── */
  const user = await Auth.requireStudent();
  if (!user) return; // requireStudent() redireciona se não autenticado

  const profile = Auth.profile;

  // Se não fez onboarding ainda → redirecionar
  try {
    const status = await Auth.checkOnboardingStatus(user.id);
    if (!status.completedOnboarding) {
      navigate(CONFIG.ROUTES.ONBOARDING);
      return;
    }
  } catch (err) {
    console.warn('[Dashboard] Erro ao verificar onboarding:', err.message);
  }

  /* ── 2. Popular header com dados do usuário ── */
  _populateHeader(profile);
  _initTopNav(profile);

  /* ── 3. Carregar dados em paralelo ── */
  const [recommendations, mentors, careerPlan, jobs, vocProfile, allProfessions] = await Promise.allSettled([
    DB.recommendations.getForStudent(user.id, 8),
    DB.mentors.list({ available: true }),
    DB.careerPlans.get(user.id),
    DB.jobs.listForStudent(profile),
    DB.vocationalProfiles.get(user.id),
    DB.professions.list(),
  ]);

  /* ── 4. Renderizar cada seção ── */
  const recs     = recommendations.status === 'fulfilled' ? recommendations.value : [];
  const vp       = vocProfile?.status === 'fulfilled' ? vocProfile.value : null;
  const allProfs = allProfessions?.status === 'fulfilled' ? allProfessions.value : [];

  // Show "Refazer teste" link when test is done
  if (vp?.completed_test) {
    const retakeLink = document.getElementById('retakeTestLink');
    if (retakeLink) retakeLink.style.display = 'inline';
  }

  // Always recalculate scores from current profile — fixes stale/wrong scores
  let recsToRender;
  if (vp?.completed_test && allProfs.length > 0) {
    const freshScored = _computeFreshScores(allProfs, vp);
    recsToRender = freshScored.slice(0, 8).map(p => ({
      compatibility_score: p.score,
      profession: p,
    }));
    // Persist updated scores in background (non-blocking)
    if (freshScored.length > 0) {
      DB.recommendations.save(
        user.id,
        freshScored.slice(0, 10).map(p => ({ professionId: p.id, score: p.score }))
      ).catch(() => {});
    }
  } else if (recs.length === 0 && vp?.completed_test) {
    recsToRender = _buildSyntheticRecs(vp);
  } else {
    recsToRender = recs;
  }

  _renderRecommendations(recsToRender, vp);
  _renderVlogs(recsToRender);

  _renderMentors(
    mentors.status === 'fulfilled' ? mentors.value : []
  );

  _renderCareerPlan(
    careerPlan.status === 'fulfilled' ? careerPlan.value : null
  );

  _renderJobs(
    jobs.status === 'fulfilled' ? jobs.value : []
  );

  /* ── 5. Notificações ── */
  try {
    const unread = await DB.notifications.countUnread(user.id);
    if (unread > 0) {
      document.getElementById('notifBadge')?.classList.remove('hidden');
    }
  } catch {}

  /* ──────────────────────────────────────────────
     Funções internas
  ────────────────────────────────────────────── */

  function _populateHeader(p) {
    if (!p) return;
    const firstName = (p.name || '').split(' ')[0] || 'Estudante';
    const greeting  = document.getElementById('greetingText');
    const subtitle  = document.getElementById('greetingSubtitle');
    const avatarEl  = document.getElementById('headerAvatar');

    if (greeting) greeting.textContent = `Olá, ${escapeHtml(firstName)}! 👋`;
    if (subtitle) subtitle.textContent = p.school
      ? `${escapeHtml(p.school)}`
      : 'Bem-vindo ao Vocare';

    if (avatarEl) {
      if (p.avatar_url) {
        avatarEl.innerHTML = `<img src="${escapeHtml(p.avatar_url)}" alt="${escapeHtml(p.name)}">`;
      } else {
        avatarEl.textContent = initials(p.name);
        avatarEl.style.background = avatarGradient(p.name);
      }
    }
  }

  function _initTopNav(p) {
    const avatarEl  = document.getElementById('navAvatar');
    const dropdown  = document.getElementById('navDropdown');
    const nameEl    = document.getElementById('dropdownName');
    const emailEl   = document.getElementById('dropdownEmail');
    const logoutBtn = document.getElementById('logoutBtn');

    if (p) {
      if (nameEl)  nameEl.textContent  = p.name  || '';
      if (emailEl) emailEl.textContent = p.email || '';

      if (avatarEl) {
        if (p.avatar_url) {
          avatarEl.innerHTML = `<img src="${escapeHtml(p.avatar_url)}" alt="${escapeHtml(p.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        } else {
          avatarEl.textContent = initials(p.name);
          avatarEl.style.background = avatarGradient(p.name);
        }
      }
    }

    // Toggle dropdown
    if (avatarEl && dropdown) {
      avatarEl.addEventListener('click', () => {
        const open = !dropdown.classList.contains('hidden');
        dropdown.classList.toggle('hidden', open);
        avatarEl.setAttribute('aria-expanded', String(!open));
      });
      avatarEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          avatarEl.click();
        }
      });
      document.addEventListener('click', (e) => {
        if (!avatarEl.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
          avatarEl.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        setButtonLoading(logoutBtn, true);
        try {
          await Auth.logout();
          navigate(CONFIG.ROUTES.LOGIN);
        } catch (err) {
          Toast.error(handleError(err));
          setButtonLoading(logoutBtn, false);
        }
      });
    }
  }

  /* ── Renderizar recomendações (profissões) ── */
  function _renderRecommendations(recs, vp) {
    const container = document.getElementById('recommendedScroll');
    if (!container) return;

    if (!recs || recs.length === 0) {
      const testDone = vp?.completed_test;
      container.innerHTML = `
        <div class="empty-state" style="min-width:100%;padding:var(--space-8) var(--space-4)">
          <div class="empty-state-icon" aria-hidden="true">🎯</div>
          <h3>${testDone ? 'Calculando recomendações...' : 'Nenhuma recomendação ainda'}</h3>
          <p>${testDone
            ? 'Suas profissões compatíveis serão exibidas em breve.'
            : 'Conclua o teste vocacional para ver profissões indicadas para você.'
          }</p>
          ${!testDone ? '<a href="test.html" class="btn btn-primary btn-sm mt-3">Fazer o teste</a>' : ''}
        </div>`;
      return;
    }

    container.innerHTML = recs.map(rec => {
      const p     = rec.profession || {};
      const score = rec.compatibility_score || 0;
      const icon  = areaIcon(p.area);
      const grad  = _areaGradient(p.area);
      return `
        <div class="profession-scroll-card" role="button" tabindex="0"
             onclick="navigate('professions.html?id=${escapeHtml(p.id || '')}')"
             onkeydown="if(event.key==='Enter')navigate('professions.html?id=${escapeHtml(p.id || '')}')"
             aria-label="${escapeHtml(p.name || 'Profissão')}">
          <div class="card-thumb" style="background:${grad}" aria-hidden="true">
            ${icon}
          </div>
          <div class="card-info">
            <div class="card-name">${escapeHtml(p.name || 'Profissão')}</div>
            <div class="card-area">${escapeHtml(p.area || '')}</div>
            ${compatBar(score)}
            <div style="margin-top:var(--space-1);font-size:var(--text-xs);font-weight:var(--fw-semi);color:${_compatColor(score)}">${score}% compatível</div>
          </div>
        </div>`;
    }).join('');
  }

  /* ── Renderizar vlogs ── */
  function _renderVlogs(recs) {
    const container = document.getElementById('vlogsScroll');
    if (!container) return;

    // Pegar profissões que têm vlog_url
    const withVlog = recs
      .filter(r => r.profession?.vlog_url || r.profession?.thumbnail_url)
      .slice(0, 6);

    // Se não tiver vlogs reais, mostrar cards de área com placeholder
    const items = withVlog.length > 0 ? withVlog : recs.slice(0, 4);

    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="min-width:100%;padding:var(--space-8) var(--space-4)">
          <div class="empty-state-icon" aria-hidden="true">🎬</div>
          <h3>Nenhum vlog disponível</h3>
          <p>Os vlogs de profissões aparecerão aqui em breve.</p>
        </div>`;
      return;
    }

    container.innerHTML = items.map(rec => {
      const p    = rec.profession || {};
      const icon = areaIcon(p.area);
      const grad = _areaGradient(p.area);
      const hasThumb = !!p.thumbnail_url;
      const thumbHtml = hasThumb
        ? `<img src="${escapeHtml(p.thumbnail_url)}" alt="${escapeHtml(p.name || '')}" loading="lazy">`
        : `<div class="vlog-thumb-placeholder" style="background:${grad}" aria-hidden="true">${icon}</div>`;
      const target = p.vlog_url
        ? `window.open('${escapeHtml(p.vlog_url)}','_blank','noopener')`
        : `navigate('professions.html?id=${escapeHtml(p.id || '')}')`;
      return `
        <div class="vlog-card" role="button" tabindex="0"
             onclick="${target}"
             onkeydown="if(event.key==='Enter'){${target}}"
             aria-label="Vlog: ${escapeHtml(p.name || 'Profissão')}">
          <div class="vlog-thumb-wrap">
            ${thumbHtml}
            <div class="vlog-play-overlay" aria-hidden="true">
              <div class="vlog-play-btn">▶</div>
            </div>
          </div>
          <div class="vlog-info">
            <div class="vlog-title">${escapeHtml(p.name || 'Profissão')}</div>
            <div class="vlog-area">${escapeHtml(p.area || '')}</div>
          </div>
        </div>`;
    }).join('');
  }

  /* ── Renderizar mentores ── */
  function _renderMentors(mentorList) {
    const container = document.getElementById('mentorsScroll');
    if (!container) return;

    if (!mentorList || mentorList.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="min-width:100%;padding:var(--space-8) var(--space-4)">
          <div class="empty-state-icon" aria-hidden="true">👤</div>
          <h3>Nenhum mentor disponível</h3>
          <p>Novos mentores são adicionados regularmente.</p>
        </div>`;
      return;
    }

    const top = mentorList.filter(m => m.is_available).slice(0, 8);
    const display = top.length > 0 ? top : mentorList.slice(0, 8);

    container.innerHTML = display.map(mentor => {
      const p          = mentor.profile || {};
      const name       = p.name || 'Mentor';
      const profession = mentor.profession || mentor.area || '';
      const score      = mentor.reputation_score || 0;
      const isAvail    = mentor.is_available;
      const avatarHtml = p.avatar_url
        ? `<img src="${escapeHtml(p.avatar_url)}" alt="${escapeHtml(name)}">`
        : `<span>${initials(name)}</span>`;
      const avatarStyle = p.avatar_url ? '' : `style="background:${avatarGradient(name)}"`;
      return `
        <div class="mentor-scroll-card" role="button" tabindex="0"
             onclick="navigate('mentors.html?id=${escapeHtml(mentor.id || '')}')"
             onkeydown="if(event.key==='Enter')navigate('mentors.html?id=${escapeHtml(mentor.id || '')}')"
             aria-label="Mentor ${escapeHtml(name)}">
          <div class="mentor-scroll-avatar" ${avatarStyle}>${avatarHtml}</div>
          <div class="mentor-scroll-name">${escapeHtml(name)}</div>
          <div class="mentor-scroll-profession">${escapeHtml(profession)}</div>
          <div class="star-rating" style="justify-content:center;margin-bottom:var(--space-2)" aria-label="${score} de 10 estrelas">
            ${renderStars(score, 10)}
          </div>
          ${isAvail
            ? `<span class="badge badge-success" style="font-size:0.65rem">Disponível</span>`
            : `<span class="badge badge-muted" style="font-size:0.65rem">Indisponível</span>`
          }
        </div>`;
    }).join('');
  }

  /* ── Renderizar plano de carreira ── */
  function _renderCareerPlan(plan) {
    const container = document.getElementById('careerPlanArea');
    if (!container) return;

    if (!plan) {
      container.innerHTML = `
        <div class="career-plan-card">
          <div class="career-plan-header">
            <div class="career-plan-icon" aria-hidden="true">📋</div>
            <div>
              <p style="font-weight:var(--fw-semi);color:var(--color-primary)">Crie seu plano de carreira</p>
              <p style="font-size:var(--text-sm);color:var(--color-muted);margin:0">Personalize sua jornada rumo à profissão ideal.</p>
            </div>
          </div>
          <a href="career-plan.html" class="btn btn-primary btn-block">Criar plano agora</a>
        </div>`;
      return;
    }

    const professionName = plan.profession?.name || 'Profissão';
    const goals          = Array.isArray(plan.weekly_goals) ? plan.weekly_goals : [];
    const total          = goals.length;
    const done           = goals.filter(g => g.status === 'done' || g.completed === true).length;
    const pct            = total > 0 ? Math.round((done / total) * 100) : 0;

    container.innerHTML = `
      <div class="career-plan-card" role="region" aria-label="Plano de carreira">
        <div class="career-plan-header">
          <div class="career-plan-icon" aria-hidden="true">📋</div>
          <div style="flex:1;min-width:0">
            <p style="font-weight:var(--fw-bold);color:var(--color-primary);font-size:var(--text-base);margin-bottom:2px">
              ${escapeHtml(professionName)}
            </p>
            <p style="font-size:var(--text-xs);color:var(--color-muted);margin:0">
              ${done} de ${total} meta${total !== 1 ? 's' : ''} concluída${done !== 1 ? 's' : ''}
            </p>
          </div>
          <span class="badge badge-primary" style="font-size:var(--text-sm)">${pct}%</span>
        </div>
        <div class="progress-labeled">
          <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${pct}% do plano concluído">
            <div class="progress-bar" style="width:${pct}%;transition:width 0.8s var(--ease-out)"></div>
          </div>
        </div>
        <a href="career-plan.html" class="btn btn-outline btn-block mt-3">Ver plano completo</a>
      </div>`;
  }

  /* ── Renderizar vagas ── */
  function _renderJobs(jobList) {
    const container = document.getElementById('jobsArea');
    if (!container) return;

    if (!jobList || jobList.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">💼</div>
          <h3>Nenhuma vaga disponível</h3>
          <p>Vagas para estudantes aparecerão aqui em breve.</p>
        </div>`;
      return;
    }

    const JOB_TYPE_LABELS = {
      internship: 'Estágio',
      apprentice: 'Jovem aprendiz',
      part_time:  'Meio período',
      full_time:  'Tempo integral',
      volunteer:  'Voluntário',
      freelance:  'Freelance',
    };

    container.innerHTML = jobList.slice(0, 5).map(job => {
      const company   = job.company || {};
      const typeLabel = JOB_TYPE_LABELS[job.job_type] || job.job_type || 'Vaga';
      const areas     = Array.isArray(job.areas) ? job.areas : (job.area ? [job.area] : []);
      const logoHtml  = company.avatar_url
        ? `<img src="${escapeHtml(company.avatar_url)}" alt="${escapeHtml(company.name || '')}">`
        : `<span>${areaIcon(areas[0] || '')}</span>`;
      return `
        <div class="job-card" role="article" aria-label="${escapeHtml(job.title || 'Vaga')}">
          <div class="job-card-header">
            <div class="job-company-logo">${logoHtml}</div>
            <div style="flex:1;min-width:0">
              <p style="font-weight:var(--fw-semi);font-size:var(--text-base);color:var(--color-text);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${escapeHtml(job.title || 'Vaga')}
              </p>
              <p style="font-size:var(--text-sm);color:var(--color-muted);margin:0">
                ${escapeHtml(company.name || 'Empresa')}
              </p>
            </div>
            <span class="badge badge-secondary">${escapeHtml(typeLabel)}</span>
          </div>
          ${areas.length > 0
            ? `<div class="flex flex-wrap gap-2" style="margin-top:var(--space-2)">
                ${areas.slice(0, 3).map(a => `<span class="skill-chip pending">${escapeHtml(a)}</span>`).join('')}
              </div>`
            : ''}
        </div>`;
    }).join('');
  }


  /* ── Recalcular scores a partir do perfil atual ── */
  function _computeFreshScores(professions, vp) {
    const AREA_NORMALIZE = {
      'tecnologia': 'tecnologia', 'ti': 'tecnologia', 'computação': 'tecnologia',
      'informática': 'tecnologia', 'software': 'tecnologia', 'programação': 'tecnologia',
      'desenvolvimento': 'tecnologia', 'computador': 'tecnologia', 'digital': 'tecnologia',
      'saúde': 'saúde', 'medicina': 'saúde', 'enfermagem': 'saúde', 'farmácia': 'saúde',
      'educação': 'educação', 'ensino': 'educação', 'pedagogia': 'educação',
      'direito': 'direito', 'jurídico': 'direito', 'advocacia': 'direito', 'lei': 'direito',
      'engenharia': 'engenharia', 'construção': 'engenharia',
      'administração': 'administração', 'gestão': 'administração', 'negócios': 'administração',
      'comunicação': 'comunicação', 'marketing': 'comunicação', 'jornalismo': 'comunicação',
      'artes': 'artes', 'design': 'artes', 'arte': 'artes', 'música': 'artes',
      'ciências': 'ciências', 'biologia': 'ciências', 'química': 'ciências',
      'agronegócio': 'agronegócio', 'agricultura': 'agronegócio',
      'gastronomia': 'gastronomia', 'culinária': 'gastronomia',
      'meio ambiente': 'meio ambiente', 'ambiental': 'meio ambiente',
    };
    const INTEREST_MAP = {
      'computador': 'tecnologia', 'computadores': 'tecnologia', 'programação': 'tecnologia',
      'código': 'tecnologia', 'software': 'tecnologia', 'jogo': 'tecnologia', 'jogos': 'tecnologia',
      'tecnologia': 'tecnologia', 'robótica': 'tecnologia', 'internet': 'tecnologia',
      'médico': 'saúde', 'médica': 'saúde', 'hospital': 'saúde', 'saúde': 'saúde',
      'biologia': 'saúde', 'remédio': 'saúde',
      'ensinar': 'educação', 'professor': 'educação', 'escola': 'educação',
      'direito': 'direito', 'lei': 'direito', 'justiça': 'direito',
      'matemática': 'engenharia', 'construir': 'engenharia',
      'empresa': 'administração', 'empreender': 'administração', 'negócios': 'administração',
      'escrever': 'comunicação', 'comunicar': 'comunicação', 'mídia': 'comunicação',
      'desenhar': 'artes', 'arte': 'artes', 'pintura': 'artes', 'design': 'artes',
      'animais': 'meio ambiente', 'plantas': 'meio ambiente', 'natureza': 'meio ambiente',
      'cozinhar': 'gastronomia', 'culinária': 'gastronomia',
      'fazenda': 'agronegócio', 'agricultura': 'agronegócio',
    };

    function norm(area) {
      return AREA_NORMALIZE[(area || '').toLowerCase()] || (area || '').toLowerCase();
    }
    function seededRand(seed, min, max) {
      let h = 0;
      for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
      return Math.round(min + (Math.abs(h) % 1000) / 1000 * (max - min));
    }

    const raw = vp?.raw_profile?.test || {};
    const aiProfile = {
      top_areas:               raw.top_areas               || vp?.top_areas               || [],
      recommended_professions: raw.recommended_professions || vp?.recommended_professions || [],
      interests:               raw.interests               || vp?.interests               || [],
      traits:                  raw.traits                  || vp?.personality_traits       || [],
    };

    const topAreas         = aiProfile.top_areas.map(norm);
    const recommendedNames = aiProfile.recommended_professions.map(r => r.toLowerCase());
    const profileSeed      = aiProfile.interests.join('') + aiProfile.traits.join('');

    // Derive implied areas from interests
    const interestAreas = new Set();
    aiProfile.interests.forEach(interest => {
      const key = (interest || '').toLowerCase();
      if (INTEREST_MAP[key]) interestAreas.add(INTEREST_MAP[key]);
      Object.entries(INTEREST_MAP).forEach(([k, v]) => {
        if (key.includes(k) || k.includes(key)) interestAreas.add(v);
      });
    });

    const allMatchAreas = [...new Set([...topAreas, ...interestAreas])];

    return professions
      .filter(p => p.id)
      .map(prof => {
        const name = (prof.name || '').toLowerCase();
        const area = norm(prof.area);
        const isRecommended = recommendedNames.some(r => name.includes(r) || r.includes(name));
        const areaMatch = allMatchAreas.some(a => area === a || area.includes(a) || a.includes(area));
        let score;
        if (isRecommended)  score = seededRand(prof.name + profileSeed, 80, 95);
        else if (areaMatch) score = seededRand(prof.name + profileSeed, 60, 79);
        else                score = seededRand(prof.name, 30, 55);
        return { ...prof, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  /* ── Gerar recomendações sintéticas do perfil vocacional ── */
  function _buildSyntheticRecs(vp) {
    const raw = vp?.raw_profile?.test || {};
    const names = (raw.recommended_professions || vp?.recommended_professions || []).slice(0, 8);
    const areas = raw.top_areas || vp?.top_areas || [];
    return names.map((name, i) => ({
      compatibility_score: Math.max(65, 92 - i * 4),
      profession: {
        id:   null,
        name: typeof name === 'string' ? name : (name?.name || 'Profissão'),
        area: areas[0] || '',
      },
    }));
  }

  /* ── Helpers ── */
  function _areaGradient(area) {
    const map = {
      'Tecnologia':    'linear-gradient(135deg,#1D4ED8,#3B82F6)',
      'Saúde':         'linear-gradient(135deg,#065F46,#10B981)',
      'Educação':      'linear-gradient(135deg,#92400E,#F59E0B)',
      'Engenharia':    'linear-gradient(135deg,#374151,#6B7280)',
      'Direito':       'linear-gradient(135deg,#1A3C6E,#2E6DB4)',
      'Artes':         'linear-gradient(135deg,#6B21A8,#A855F7)',
      'Administração': 'linear-gradient(135deg,#9D174D,#EC4899)',
      'Comunicação':   'linear-gradient(135deg,#0F766E,#14B8A6)',
      'Ciências':      'linear-gradient(135deg,#1E3A5F,#2563EB)',
      'Meio Ambiente': 'linear-gradient(135deg,#14532D,#22C55E)',
      'Agronegócio':   'linear-gradient(135deg,#3F6212,#84CC16)',
      'Gastronomia':   'linear-gradient(135deg,#7F1D1D,#EF4444)',
    };
    return map[area] || 'linear-gradient(135deg,var(--color-primary),var(--color-secondary))';
  }

  function _compatColor(score) {
    if (score >= 70) return 'var(--color-success)';
    if (score >= 45) return '#92400E';
    return 'var(--color-danger)';
  }

})();
