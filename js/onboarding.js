/* ============================================================
   VOCARE — Onboarding Chat
   js/onboarding.js · Conversa com a Voca para mapeamento vocacional
   ============================================================ */

'use strict';

/* ── State ──────────────────────────────────────────────────── */
let _userId      = null;
let _isSending   = false;
let _exchangeCount = 0; // number of complete user→AI exchanges

/* ── DOM refs ───────────────────────────────────────────────── */
const chatBody    = document.getElementById('chatBody');
const chatInput   = document.getElementById('chatInput');
const sendBtn     = document.getElementById('sendBtn');
const progressDots = document.querySelectorAll('.progress-dot');
const profileOverlay = document.getElementById('profileCreatingOverlay');
const profileMsg     = document.getElementById('profileCreatingMsg');

/* ── Init ───────────────────────────────────────────────────── */
(async function init() {
  // 1. Require student auth
  const user = await Auth.requireStudent();
  if (!user) return;
  _userId = user.id;

  // 2. Check if onboarding already complete
  try {
    const vp = await DB.vocationalProfiles.get(_userId);
    if (vp && vp.completed_onboarding) {
      navigate(CONFIG.ROUTES.TEST);
      return;
    }
  } catch (e) {
    // no vocational profile yet — continue
  }

  // 3. Try to restore existing conversation from DB
  let restored = false;
  try {
    const saved = await DB.aiConversations.load(_userId, 'onboarding');
    if (saved && saved.messages && saved.messages.length > 0) {
      OnboardingAI.loadMessages(saved.messages);
      // Replay messages in UI (without typewriter effect for history)
      _replayHistory(saved.messages);
      _exchangeCount = Math.floor(saved.messages.length / 2);
      _updateProgress();
      restored = true;

      // If last message is JSON profile (>= 6 exchanges), complete onboarding
      if (OnboardingAI.isProfileReady()) {
        const profile = OnboardingAI.extractProfile();
        if (profile) {
          await _finishOnboarding(profile);
          return;
        }
      }
      // Ask AI to continue
      scrollToBottom(chatBody, false);
    }
  } catch (e) {
    console.warn('[Onboarding] Could not restore conversation:', e.message);
  }

  // 4. If fresh start, send welcome message
  if (!restored) {
    await _showWelcomeMessage();
  }

  // 5. Setup input events
  _setupInput();
})();

/* ── Welcome message (from AI, no API call needed) ─────────── */
async function _showWelcomeMessage() {
  const welcome = 'Oi! Sou a Voca 👋 Fico feliz que você esteja aqui! Antes de te mostrar as carreiras que combinam com você, quero te conhecer melhor. Me conta: o que você mais gosta de fazer no seu tempo livre? 😊';

  // Inject welcome into AI messages array
  OnboardingAI.messages = [{ role: 'assistant', content: welcome }];

  await _delay(400);
  _appendAIMessage(welcome, false); // false = no typewriter for welcome
  scrollToBottom(chatBody);
}

/* ── Replay history without animation ──────────────────────── */
function _replayHistory(messages) {
  // The first assistant message is the welcome — render statically
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      _appendAIMessage(msg.content, false);
    } else if (msg.role === 'user') {
      _appendUserMessage(msg.content);
    }
  }
}

/* ── Input setup ────────────────────────────────────────────── */
function _setupInput() {
  autoResizeTextarea(chatInput);

  chatInput.addEventListener('input', () => {
    const hasText = chatInput.value.trim().length > 0;
    sendBtn.disabled = !hasText || _isSending;
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) _handleSend();
    }
  });

  sendBtn.addEventListener('click', _handleSend);

  // Focus input
  setTimeout(() => chatInput.focus(), 300);
}

/* ── Handle send ────────────────────────────────────────────── */
async function _handleSend() {
  if (_isSending) return;
  const text = chatInput.value.trim();
  if (!text) return;

  _isSending = true;
  sendBtn.disabled = true;
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // Show user message
  _appendUserMessage(text);
  scrollToBottom(chatBody);

  // Show typing indicator
  const typingEl = _showTyping();
  scrollToBottom(chatBody);

  try {
    // Call OnboardingAI
    const reply = await OnboardingAI.send(text);

    // Remove typing indicator
    _removeTyping(typingEl);

    // Increment exchange count
    _exchangeCount++;
    _updateProgress();

    // Check if reply is JSON profile
    const parsed = safeJSON(reply);
    if (parsed && (parsed.interests || parsed.personality_traits)) {
      // AI returned the profile JSON — show friendly message, not raw JSON
      _appendAIMessage('Perfeito! Já tenho tudo que preciso para montar seu perfil vocacional. Um momento... ✨', false);
      scrollToBottom(chatBody);

      // Save conversation to DB
      _saveConversation();

      // Finish onboarding
      await _finishOnboarding(parsed);
      return;
    }

    // Regular conversational reply
    _appendAIMessage(reply, true);
    scrollToBottom(chatBody);

    // Persist conversation every exchange
    _saveConversation();

  } catch (err) {
    _removeTyping(typingEl);
    Toast.error('Ocorreu um erro ao enviar. Tente novamente.');
    console.error('[Onboarding] AI error:', err);
  } finally {
    _isSending = false;
    sendBtn.disabled = chatInput.value.trim().length === 0;
    chatInput.focus();
  }
}

/* ── Finish onboarding ──────────────────────────────────────── */
async function _finishOnboarding(profile) {
  // Show overlay
  show(profileOverlay);
  profileOverlay.classList.remove('hidden');

  const msgs = [
    'A Voca está analisando suas respostas para montar seu perfil vocacional personalizado.',
    'Identificando seus pontos fortes e interesses...',
    'Mapeando as carreiras que combinam com você...',
    'Quase lá! Seu perfil está quase pronto...',
  ];

  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % msgs.length;
    if (profileMsg) profileMsg.textContent = msgs[msgIdx];
  }, 1800);

  try {
    // Save vocational profile
    await DB.vocationalProfiles.upsert(_userId, {
      completed_onboarding: true,
      interests:            profile.interests || [],
      personality_traits:   profile.personality_traits || [],
      skills:               profile.skills || [],
      raw_profile:          profile,
      updated_at:           new Date().toISOString(),
    });

    // Save conversation
    await _saveConversation();

    // Small delay for UX
    await _delay(2800);

    clearInterval(msgInterval);

    // Navigate to test
    navigate(CONFIG.ROUTES.TEST);

  } catch (err) {
    clearInterval(msgInterval);
    console.error('[Onboarding] Finish error:', err);

    // Mostra botão manual caso a navegação automática falhe
    if (profileMsg) {
      profileMsg.innerHTML = `
        Seu perfil foi salvo!<br><br>
        <button onclick="navigate('${CONFIG.ROUTES.TEST}')"
          style="background:#fff;color:#1A3C6E;border:none;padding:12px 24px;
                 border-radius:8px;font-weight:700;font-size:1rem;cursor:pointer;">
          Continuar para o Teste →
        </button>`;
    }
    // Não esconde o overlay — mantém o botão visível
  }
}

/* ── Save conversation to DB ────────────────────────────────── */
async function _saveConversation() {
  try {
    await DB.aiConversations.save(_userId, 'onboarding', OnboardingAI.getMessages());
  } catch (e) {
    console.warn('[Onboarding] Could not save conversation:', e.message);
  }
}

/* ── Update progress dots ───────────────────────────────────── */
function _updateProgress() {
  const total = CONFIG.AI.ONBOARDING_EXCHANGES; // 6
  progressDots.forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i < _exchangeCount) {
      dot.classList.add('done');
    } else if (i === _exchangeCount) {
      dot.classList.add('active');
    }
  });
}

/* ── Append AI message ──────────────────────────────────────── */
function _appendAIMessage(text, useTypewriter = true) {
  const group = document.createElement('div');
  group.className = 'message-group incoming ai';

  // Build inner HTML with mini avatar
  const avatarEl = document.createElement('div');
  avatarEl.className = 'mini-avatar';
  avatarEl.style.cssText = 'width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--color-primary),var(--color-secondary));display:flex;align-items:center;justify-content:center;font-size:0.875rem;flex-shrink:0;border:2px solid var(--color-accent);';
  avatarEl.setAttribute('aria-hidden', 'true');
  avatarEl.textContent = '🎯';

  const inner = document.createElement('div');
  inner.style.cssText = 'display:flex;flex-direction:column;gap:var(--space-1);max-width:100%;';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  const timeEl = document.createElement('span');
  timeEl.className = 'message-time';
  timeEl.textContent = _nowTime();

  inner.appendChild(bubble);
  inner.appendChild(timeEl);

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;align-items:flex-start;gap:var(--space-2);';
  wrapper.appendChild(avatarEl);
  wrapper.appendChild(inner);
  group.appendChild(wrapper);

  chatBody.appendChild(group);

  if (useTypewriter) {
    typewriterEffect(bubble, text, 18, () => {
      scrollToBottom(chatBody);
    });
  } else {
    bubble.textContent = text;
  }

  scrollToBottom(chatBody);
  return group;
}

/* ── Append user message ────────────────────────────────────── */
function _appendUserMessage(text) {
  const group = document.createElement('div');
  group.className = 'message-group outgoing';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;

  const timeEl = document.createElement('span');
  timeEl.className = 'message-time';
  timeEl.textContent = _nowTime();

  group.appendChild(bubble);
  group.appendChild(timeEl);
  chatBody.appendChild(group);
  return group;
}

/* ── Typing indicator ───────────────────────────────────────── */
function _showTyping() {
  const wrapper = document.createElement('div');
  wrapper.className = 'typing-wrapper';
  wrapper.id = 'typingIndicator';

  const avatar = document.createElement('div');
  avatar.style.cssText = 'width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--color-primary),var(--color-secondary));display:flex;align-items:center;justify-content:center;font-size:0.875rem;flex-shrink:0;border:2px solid var(--color-accent);';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = '🎯';

  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-label', 'Voca está digitando');

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    dot.className = 'typing-dot';
    indicator.appendChild(dot);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(indicator);
  chatBody.appendChild(wrapper);
  scrollToBottom(chatBody);
  return wrapper;
}

function _removeTyping(el) {
  if (el && el.parentNode) el.remove();
}

/* ── Helpers ────────────────────────────────────────────────── */
function _nowTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
