/* ============================================================
   VOCARE — Voca Agentic Chat
   js/voca.js · Chat com a IA + execução real de ações no sistema
   ============================================================ */

'use strict';

const _MAX_HISTORY = 20;
let _history  = [];
let _sending  = false;
let _vocProfile = null; // cached vocational profile

/* ── Init ───────────────────────────────────────────────────── */
(async function initVoca() {
  const user = await Auth.requireStudent();
  if (!user) return;

  initNavAvatar();

  const profile = Auth.profile;
  if (profile) {
    const nameEl  = document.getElementById('dropdownName');
    const emailEl = document.getElementById('dropdownEmail');
    if (nameEl)  nameEl.textContent  = profile.name  || '';
    if (emailEl) emailEl.textContent = profile.email || '';
  }

  // Pre-load vocational profile for action context
  try { _vocProfile = await DB.vocationalProfiles.get(Auth.userId); } catch {}

  // Personalised greeting
  const firstName = profile?.name?.split(' ')[0] || '';
  if (_vocProfile?.completed_test && _vocProfile.recommended_professions?.length) {
    const top = _vocProfile.recommended_professions[0];
    _addBotMessage(
      `Olá${firstName ? `, ${firstName}` : ''}! 👋 Vi que você tem interesse em **${top}**.\n\nPosso te ajudar com orientação de carreira, gerar ou mudar seu plano, tirar dúvidas sobre profissões e muito mais. O que você quer fazer?`
    );
  } else {
    _addBotMessage(
      `Olá${firstName ? `, ${firstName}` : ''}! 👋 Sou a Voca, sua assistente de orientação profissional.\n\nPosso responder perguntas, gerar seu plano de carreira, mudar sua profissão-alvo e muito mais. Como posso te ajudar?`
    );
  }

  // Wire up input
  const input   = document.getElementById('vocaInput');
  const sendBtn = document.getElementById('vocaSendBtn');

  input.addEventListener('input', () => {
    sendBtn.disabled = input.value.trim().length === 0 || _sending;
    _autoResize(input);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) _send();
    }
  });

  sendBtn.addEventListener('click', _send);

  document.getElementById('vocaQuickPrompts')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-prompt]');
    if (chip) {
      input.value = chip.dataset.prompt;
      input.dispatchEvent(new Event('input'));
      _send();
    }
  });
})();

/* ── Send message ────────────────────────────────────────────── */
async function _send() {
  const input   = document.getElementById('vocaInput');
  const sendBtn = document.getElementById('vocaSendBtn');
  const text    = input.value.trim();
  if (!text || _sending) return;

  // Hide welcome + quick prompts after first message
  document.getElementById('vocaWelcome')?.remove();
  document.getElementById('vocaQuickPrompts')?.remove();

  _sending = true;
  sendBtn.disabled = true;
  input.value = '';
  _autoResize(input);

  _addUserMessage(text);
  _history.push({ role: 'user', content: text });
  if (_history.length > _MAX_HISTORY) _history = _history.slice(-_MAX_HISTORY);

  const typingEl = _showTyping();

  try {
    const raw = await callAI({ messages: _history, phase: 'general', maxTokens: 900 });

    typingEl.remove();

    // Parse text vs action blocks
    const { text: replyText, actions } = _parseResponse(raw);

    _history.push({ role: 'assistant', content: raw });
    if (_history.length > _MAX_HISTORY) _history = _history.slice(-_MAX_HISTORY);

    if (replyText) _addBotMessage(replyText);

    // Execute each action
    for (const action of actions) {
      await _executeAction(action);
    }

  } catch (err) {
    typingEl.remove();
    _addBotMessage('Desculpe, tive um problema ao responder. Tente novamente. 😔');
    console.error('[Voca] callAI error:', err.message);
  } finally {
    _sending = false;
    sendBtn.disabled = input.value.trim().length === 0;
  }
}

/* ── Parse AI response: split text from action blocks ─────────── */
function _parseResponse(raw) {
  const ACTION_RE = /\[VOCARE_ACTION\]([\s\S]*?)\[\/VOCARE_ACTION\]/g;
  const actions   = [];
  let match;

  while ((match = ACTION_RE.exec(raw)) !== null) {
    try {
      actions.push(JSON.parse(match[1].trim()));
    } catch {
      console.warn('[Voca] Invalid action JSON:', match[1]);
    }
  }

  const text = raw.replace(/\[VOCARE_ACTION\][\s\S]*?\[\/VOCARE_ACTION\]/g, '').trim();
  return { text, actions };
}

/* ── Execute action ──────────────────────────────────────────── */
async function _executeAction(action) {
  switch (action.action) {
    case 'regenerate_plan':
      await _actionRegeneratePlan(action.profession);
      break;
    case 'navigate':
      _actionNavigate(action.page);
      break;
    case 'complete_goals':
      await _actionCompleteGoals(action.indices || []);
      break;
    default:
      console.warn('[Voca] Unknown action:', action.action);
  }
}

/* ── Action: Regenerate career plan ─────────────────────────── */
async function _actionRegeneratePlan(professionName) {
  if (!professionName) return;

  const statusMsg = _addSystemMessage(`⏳ Gerando plano de carreira para **${professionName}**...`);

  try {
    // Try to find profession in DB by name (fuzzy)
    let profId = null;
    try {
      const all   = await DB.professions.list();
      const norm  = s => s?.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const match = all.find(p => norm(p.name) === norm(professionName))
                 || all.find(p => norm(p.name)?.includes(norm(professionName)))
                 || all.find(p => norm(professionName)?.includes(norm(p.name)));
      if (match) profId = match.id;
    } catch {}

    // Build enriched profile
    let recs = [];
    try { recs = await DB.recommendations.getForStudent(Auth.userId, 10); } catch {}

    const topRecNames = recs.slice(0, 5).map(r => r.profession?.name).filter(Boolean);
    const enriched = {
      ...(_vocProfile?.raw_profile || {}),
      area:                    _vocProfile?.top_areas?.[0] || '',
      top_areas:               _vocProfile?.top_areas || [],
      recommended_professions: topRecNames.length ? topRecNames : (_vocProfile?.recommended_professions || []),
    };

    const planData = await generateCareerPlan(enriched, professionName);
    await DB.careerPlans.save(Auth.userId, profId, planData);

    statusMsg.remove();
    _addSystemMessage(
      `✅ Plano de carreira para **${professionName}** criado com sucesso!\n\n[📋 Ver meu plano](career-plan.html)`,
      true
    );

  } catch (err) {
    statusMsg.remove();
    _addSystemMessage(`❌ Não consegui gerar o plano agora. Tente novamente em instantes.`);
    console.error('[Voca] regenerate_plan error:', err.message);
  }
}

/* ── Action: Navigate to page ────────────────────────────────── */
function _actionNavigate(page) {
  const pages = {
    'career-plan':  'career-plan.html',
    'professions':  'professions.html',
    'dashboard':    'dashboard.html',
    'test':         'test.html',
    'mentors':      'mentors.html',
    'voca':         'voca.html',
  };
  const dest = pages[page];
  if (!dest) return;

  _addSystemMessage(`🔗 Te levando para **${_pageLabel(page)}**...`);
  setTimeout(() => navigate(dest), 1200);
}

function _pageLabel(page) {
  return { 'career-plan': 'Plano de Carreira', 'professions': 'Explorar Profissões', 'dashboard': 'Início', 'test': 'Teste Vocacional', 'mentors': 'Mentores' }[page] || page;
}

/* ── Action: Complete goals ──────────────────────────────────── */
async function _actionCompleteGoals(indices) {
  if (!indices?.length) return;

  const statusMsg = _addSystemMessage(`⏳ Marcando ${indices.length} meta(s) como concluída(s)...`);

  try {
    const plan = await DB.careerPlans.get(Auth.userId);
    if (!plan) {
      statusMsg.remove();
      _addSystemMessage('❌ Nenhum plano de carreira encontrado. Crie um plano primeiro!');
      return;
    }

    const goals = [...(plan.weekly_goals || [])];
    indices.forEach(i => {
      if (goals[i]) goals[i] = { ...goals[i], status: 'done', completed: true };
    });

    await DB.careerPlans.updateGoals(plan.id, goals);

    statusMsg.remove();
    _addSystemMessage(`✅ ${indices.length} meta(s) marcada(s) como concluída(s)!\n\n[📋 Ver meu plano](career-plan.html)`, true);

  } catch (err) {
    statusMsg.remove();
    _addSystemMessage('❌ Não consegui atualizar as metas. Tente pelo plano de carreira.');
    console.error('[Voca] complete_goals error:', err.message);
  }
}

/* ── DOM helpers ─────────────────────────────────────────────── */
function _addUserMessage(text) {
  const container = document.getElementById('vocaMessages');
  const div = document.createElement('div');
  div.className = 'voca-msg user';
  div.innerHTML = `<div class="voca-msg-bubble">${escapeHtml(text)}</div>`;
  container.appendChild(div);
  _scrollToBottom();
}

function _addBotMessage(text) {
  const container = document.getElementById('vocaMessages');
  const div = document.createElement('div');
  div.className = 'voca-msg bot';
  div.innerHTML = `
    <div class="voca-msg-avatar" aria-hidden="true">🤖</div>
    <div class="voca-msg-bubble">${_renderMarkdown(text)}</div>
  `;
  container.appendChild(div);
  _scrollToBottom();
  return div;
}

function _addSystemMessage(text, hasLink = false) {
  const container = document.getElementById('vocaMessages');
  const div = document.createElement('div');
  div.className = 'voca-msg bot';
  div.innerHTML = `
    <div class="voca-msg-avatar" aria-hidden="true">⚡</div>
    <div class="voca-msg-bubble voca-action-bubble">${_renderMarkdown(text)}</div>
  `;
  container.appendChild(div);
  _scrollToBottom();
  return div;
}

function _showTyping() {
  const container = document.getElementById('vocaMessages');
  const div = document.createElement('div');
  div.className = 'voca-msg bot';
  div.innerHTML = `
    <div class="voca-msg-avatar" aria-hidden="true">🤖</div>
    <div class="voca-typing"><span></span><span></span><span></span></div>
  `;
  container.appendChild(div);
  _scrollToBottom();
  return div;
}

function _renderMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:var(--color-primary);font-weight:600;text-decoration:underline">$1</a>')
    .replace(/\n/g, '<br>');
}

function _scrollToBottom() {
  const c = document.getElementById('vocaMessages');
  if (c) c.scrollTop = c.scrollHeight;
}

function _autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
