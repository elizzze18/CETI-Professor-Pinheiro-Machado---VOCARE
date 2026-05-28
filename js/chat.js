/* ============================================================
   VOCARE — Chat Module
   js/chat.js · Chat em tempo real entre estudante e mentor
   ============================================================ */

'use strict';

let _session      = null;
let _messages     = [];
let _realtimeChannel = null;
let _selectedRating  = 0;

async function initChat() {
  const user = await Auth.requireStudent();
  if (!user) return;

  const sessionId = getQueryParam('session_id');
  if (!sessionId) {
    navigate(CONFIG.ROUTES.MENTORS);
    return;
  }

  // Menu toggle
  const menuBtn = document.getElementById('chatMenuBtn');
  const chatMenu = document.getElementById('chatMenu');
  menuBtn.addEventListener('click', () => chatMenu.classList.toggle('hidden'));
  document.addEventListener('click', (e) => {
    if (!menuBtn.contains(e.target) && !chatMenu.contains(e.target)) {
      chatMenu.classList.add('hidden');
    }
  });

  document.getElementById('endSessionBtn').addEventListener('click', () => endSession());

  await loadSession(sessionId);
}

async function loadSession(sessionId) {
  try {
    _session = await DB.sessions.get(sessionId);

    if (!_session) {
      Toast.error('Sessão não encontrada.');
      navigate(CONFIG.ROUTES.MENTORS);
      return;
    }

    // Check if session already ended
    if (_session.status === 'completed' || _session.status === 'cancelled') {
      renderSessionEnded();
      return;
    }

    // Set mentor info in header
    const mentor = _session.mentor || {};
    const mentorName = mentor.name || 'Mentor';
    document.getElementById('mentorName').textContent = mentorName;
    document.getElementById('mentorStatus').textContent = 'Na sessão';

    const avatarEl = document.getElementById('mentorAvatar');
    avatarEl.style.background = avatarGradient(mentorName);
    if (mentor.avatar_url) {
      avatarEl.innerHTML = `<img src="${escapeHtml(mentor.avatar_url)}" alt="${escapeHtml(mentorName)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      avatarEl.textContent = initials(mentorName);
    }

    // Load message history
    _messages = await DB.messages.list(sessionId);

    // Render existing messages
    const chatBody = document.getElementById('chatBody');
    document.getElementById('chatLoading').style.display = 'none';
    chatBody.innerHTML = '';

    if (_messages.length > 0) {
      _messages.forEach(msg => renderMessage(msg, false));
    } else {
      // First time — show a system message
      renderSystemMessage(`Sessão iniciada com ${mentorName}. Você pode começar a conversa!`);
      // Show suggested questions
      loadAndShowSuggestedQuestions(_session.ai_suggested_questions);
    }

    scrollToBottom(chatBody, false);

    // Show footer
    document.getElementById('chatFooter').style.display = 'flex';

    // Setup input
    setupInput();

    // Subscribe to realtime messages
    subscribeToMessages(sessionId);

    // Update session status to confirmed
    if (_session.status === 'pending') {
      await DB.sessions.updateStatus(sessionId, 'confirmed');
    }
  } catch (err) {
    Toast.error(handleError(err));
    navigate(CONFIG.ROUTES.MENTORS);
  }
}

function setupInput() {
  const input   = document.getElementById('msgInput');
  const sendBtn = document.getElementById('sendBtn');

  autoResizeTextarea(input);

  input.addEventListener('input', () => {
    sendBtn.disabled = input.value.trim().length === 0;
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
}

async function sendMessage() {
  const input   = document.getElementById('msgInput');
  const sendBtn = document.getElementById('sendBtn');
  const content = input.value.trim();
  if (!content || !_session) return;

  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;

  // Hide suggested questions after first message
  const qsBar = document.getElementById('suggestedQsBar');
  if (qsBar) qsBar.style.display = 'none';

  try {
    await DB.messages.send(_session.id, Auth.userId, content);
    // The realtime subscription will render the message
  } catch (err) {
    Toast.error('Erro ao enviar mensagem. Tente novamente.');
    input.value = content;
    sendBtn.disabled = false;
  }
}

function subscribeToMessages(sessionId) {
  _realtimeChannel = DB.messages.subscribe(sessionId, (msg) => {
    // Don't duplicate if it's our own message (already rendered by subscription event)
    const isDuplicate = _messages.some(m => m.id === msg.id);
    if (!isDuplicate) {
      _messages.push(msg);
      renderMessage(msg, true);
      scrollToBottom(document.getElementById('chatBody'));
    }
  });
}

function renderMessage(msg, animate = true) {
  const chatBody = document.getElementById('chatBody');
  const isOwn = msg.sender_id === Auth.userId;

  const sender = msg.sender || {};
  const senderName = sender.name || (isOwn ? Auth.profile?.name : 'Mentor') || '';

  const group = document.createElement('div');
  group.className = `message-group ${isOwn ? 'outgoing' : 'incoming'}${animate ? ' animate-fade-in' : ''}`;

  group.innerHTML = `
    ${!isOwn ? `<div class="message-sender" aria-hidden="true">${escapeHtml(senderName.split(' ')[0])}</div>` : ''}
    <div class="message-bubble" role="article" aria-label="Mensagem de ${escapeHtml(isOwn ? 'você' : senderName)}">
      ${escapeHtml(msg.content)}
    </div>
    <time class="message-time" datetime="${msg.created_at}">${formatTime(msg.created_at)}</time>
  `;

  chatBody.appendChild(group);
}

function renderSystemMessage(text) {
  const chatBody = document.getElementById('chatBody');
  const el = document.createElement('div');
  el.className = 'chat-day-sep';
  el.innerHTML = `<span>${escapeHtml(text)}</span>`;
  chatBody.appendChild(el);
}

function loadAndShowSuggestedQuestions(aiQuestions) {
  if (!aiQuestions?.length) return;
  const qsBar = document.getElementById('suggestedQsBar');
  if (!qsBar) return;
  qsBar.style.display = 'block';
  qsBar.innerHTML = aiQuestions.map(q => `
    <button
      class="chip"
      style="display:inline-flex;margin-right:var(--space-2);font-size:var(--text-xs)"
      onclick="document.getElementById('msgInput').value='${q.replace(/'/g, "\\'")}';document.getElementById('sendBtn').disabled=false"
      aria-label="Usar pergunta sugerida: ${escapeHtml(q)}"
    >
      💡 ${escapeHtml(q)}
    </button>
  `).join('');
}

async function endSession() {
  if (!_session) return;
  if (!confirm('Deseja encerrar esta sessão?')) return;

  try {
    _session = await DB.sessions.updateStatus(_session.id, 'completed');

    // Unsubscribe realtime
    if (_realtimeChannel) {
      window.supabase.removeChannel(_realtimeChannel);
    }

    // Generate AI summary in background
    generateAndSaveSummary();

    // Show ended state
    document.getElementById('chatFooter').style.display = 'none';
    renderSessionEnded();
  } catch (err) {
    Toast.error(handleError(err));
  }
}

async function generateAndSaveSummary() {
  try {
    const msgs = _messages.map(m => ({
      role: m.sender_id === Auth.userId ? 'student' : 'mentor',
      content: m.content,
    }));

    const summary = await generateSessionSummary(_session.id, msgs);
    if (summary) {
      // Save to DB
      await window.supabase
        .from('mentoring_sessions')
        .update({ ai_summary: summary })
        .eq('id', _session.id);

      // Show in UI if still on ended state
      const summaryEl = document.getElementById('aiSummary');
      const summaryWrap = document.getElementById('aiSummaryWrap');
      if (summaryEl && summaryWrap) {
        summaryEl.textContent = summary;
        show(summaryWrap);
      }
    }
  } catch {}
}

function renderSessionEnded() {
  // Hide chat body and footer, show ended state
  document.getElementById('chatFooter').style.display = 'none';
  document.getElementById('chatBody').style.display = 'none';
  show(document.getElementById('sessionEndedState'));

  // Show AI summary if exists
  if (_session?.ai_summary) {
    document.getElementById('aiSummary').textContent = _session.ai_summary;
    show(document.getElementById('aiSummaryWrap'));
  }

  // Rating stars
  document.getElementById('ratingStars').addEventListener('click', (e) => {
    const star = e.target.closest('[data-value]');
    if (!star) return;
    _selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll('#ratingStars .star').forEach((s, i) => {
      s.classList.toggle('filled', i < _selectedRating);
      s.classList.toggle('empty', i >= _selectedRating);
      s.setAttribute('aria-checked', String(i < _selectedRating));
    });
  });

  document.getElementById('submitRatingBtn').addEventListener('click', async () => {
    if (!_selectedRating) {
      Toast.warning('Selecione uma avaliação antes de enviar.');
      return;
    }
    try {
      await DB.sessions.rate(_session.id, _selectedRating);
      Toast.success('Avaliação enviada! Obrigado pelo feedback.');
      setTimeout(() => navigate(CONFIG.ROUTES.MENTORS), 1500);
    } catch (err) {
      Toast.error(handleError(err));
    }
  });
}

document.addEventListener('DOMContentLoaded', initChat);

// Cleanup realtime on page unload
window.addEventListener('beforeunload', () => {
  if (_realtimeChannel) window.supabase.removeChannel(_realtimeChannel);
});
