/* ============================================================
   VOCARE — AI Module
   js/ai.js · Chamadas à API Claude via Edge Functions seguras
   ============================================================ */

'use strict';

/* ── System Prompts ─────────────────────────────────────────── */
const SYSTEM_PROMPTS = {
  onboarding: `Você é a Voca, assistente de orientação profissional da plataforma Vocare.
Seu tom é acolhedor, próximo e sem formalismo escolar. Use linguagem jovem, mas sem gírias excessivas.
Você está conversando com um(a) estudante do ensino médio da rede pública do Piauí.

Seu objetivo é mapear, de forma natural e conversacional:
1. Interesses pessoais (o que gosta de fazer, matérias favoritas)
2. Traços de personalidade (introvertido/extrovertido, analítico/criativo etc.)
3. Habilidades percebidas (o que as pessoas pedem ajuda a ele/ela)
4. Contexto de vida (família, referências de carreira, sonhos)

Faça UMA pergunta por vez. Seja caloroso(a) e encorajador(a).
Após 6 trocas completas (6 mensagens do usuário), responda SOMENTE com o JSON abaixo, sem nenhuma palavra antes ou depois, sem markdown, sem explicação:
{"interests":[],"personality_traits":[],"skills":[],"context_summary":""}
IMPORTANTE: no turno final, sua resposta deve começar com { e terminar com }. Nada mais.`,

  test: `Você conduz um teste vocacional adaptativo. Recebe as respostas anteriores
do estudante e retorna a próxima pergunta mais relevante para refinar o perfil vocacional.
Cada resposta deve ter exatamente 4 opções claras e específicas.

Formato de retorno (JSON válido, sem markdown):
{
  "question": "texto da pergunta",
  "options": ["opção A", "opção B", "opção C", "opção D"],
  "is_final": false
}

Quando tiver informação suficiente (após 5 perguntas respondidas), retorne OBRIGATORIAMENTE is_final: true e adicione:
"profile": { "interests": [], "traits": [], "top_areas": [], "recommended_professions": [] }

REGRAS OBRIGATÓRIAS para o profile final:
- top_areas usa SOMENTE estes nomes exatos: Tecnologia, Saúde, Educação, Direito, Engenharia, Administração, Comunicação, Artes, Ciências, Agronegócio, Gastronomia, Meio Ambiente
- NÃO escreva "TI", "Computação", "Informática", "Software" — escreva sempre "Tecnologia"
- Se o estudante mencionou computadores, jogos, programação, internet → top_areas DEVE conter "Tecnologia"
- recommended_professions deve ter 5 a 8 nomes de profissões específicas em português

Nunca use markdown. Retorne APENAS JSON válido.`,

  general: `Você é a Voca, assistente de orientação profissional da Vocare — e você tem PODERES REAIS no sistema: pode gerar planos de carreira, navegar entre páginas e muito mais.

Tom acolhedor, jovem e encorajador. Respostas concisas e diretas.
Foco em orientação de carreira para estudantes do ensino médio público do Piauí.

══ AÇÕES QUE VOCÊ PODE EXECUTAR ══

Quando o usuário pedir para FAZER algo (não apenas informar), inclua um bloco de ação no FINAL da resposta:

1. Gerar ou mudar plano de carreira:
[VOCARE_ACTION]{"action":"regenerate_plan","profession":"Nome da Profissão em Português"}[/VOCARE_ACTION]

2. Ir para uma página:
[VOCARE_ACTION]{"action":"navigate","page":"career-plan"}[/VOCARE_ACTION]
[VOCARE_ACTION]{"action":"navigate","page":"professions"}[/VOCARE_ACTION]
[VOCARE_ACTION]{"action":"navigate","page":"dashboard"}[/VOCARE_ACTION]
[VOCARE_ACTION]{"action":"navigate","page":"test"}[/VOCARE_ACTION]

3. Marcar metas semanais como concluídas (informe os índices, começando em 0):
[VOCARE_ACTION]{"action":"complete_goals","indices":[0,1,2]}[/VOCARE_ACTION]

REGRAS IMPORTANTES:
- Inclua o bloco de ação SOMENTE quando o usuário pede explicitamente para AGIR ("mude", "crie", "gere", "me leva para", "marca como feito", etc.)
- Para "regenerate_plan": use o nome EXATO da profissão em português (ex: "Engenheiro de Software", "Médico", "Advogado")
- Nunca inclua mais de UM bloco por resposta
- O bloco deve vir DEPOIS do texto de resposta
- Para perguntas informativas ("o que é...", "como funciona..."), NÃO inclua bloco de ação`,
};

/* ── Core AI Request ────────────────────────────────────────── */
async function callAI({ messages, phase = 'general', maxTokens = 1000 }) {
  const headers = { 'Content-Type': 'application/json' };

  // Anexa token de autenticação se houver sessão Supabase ativa
  try {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch {}

  const response = await fetch(CONFIG.EDGE_FUNCTIONS.AI_PROXY, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, phase, max_tokens: maxTokens }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Erro ${response.status} ao chamar a IA.`);
  }

  const data = await response.json();
  return data.content;
}

/* ── Onboarding AI ──────────────────────────────────────────── */
const OnboardingAI = {
  messages: [],

  reset() { this.messages = []; },

  async send(userMessage) {
    this.messages.push({ role: 'user', content: userMessage });
    const reply = await callAI({
      messages:  this.messages,
      phase:     'onboarding',
      maxTokens: 600,
    });
    this.messages.push({ role: 'assistant', content: reply });
    return reply;
  },

  isProfileReady() {
    return this.messages.length >= CONFIG.AI.ONBOARDING_EXCHANGES * 2;
  },

  extractProfile() {
    if (!this.messages.length) return null;
    const lastAssistant = [...this.messages]
      .reverse()
      .find(m => m.role === 'assistant');
    if (!lastAssistant) return null;
    return safeJSON(lastAssistant.content);
  },

  getMessages() { return [...this.messages]; },
  loadMessages(msgs) { this.messages = msgs || []; },
};

/* ── Vocational Test AI ─────────────────────────────────────── */
const TestAI = {
  messages: [],
  questionCount: 0,

  reset() {
    this.messages = [];
    this.questionCount = 0;
  },

  async getFirstQuestion(vocProfile) {
    const context = vocProfile
      ? `Perfil inicial do estudante: ${JSON.stringify(vocProfile)}\n`
      : '';

    this.messages.push({
      role: 'user',
      content: `${context}Inicie o teste vocacional com a primeira pergunta.`,
    });

    const reply = await callAI({
      messages:  this.messages,
      phase:     'test',
      maxTokens: 500,
    });

    this.messages.push({ role: 'assistant', content: reply });
    this.questionCount++;
    return safeJSON(reply);
  },

  async answerQuestion(answer) {
    this.messages.push({ role: 'user', content: answer });
    const reply = await callAI({
      messages:  this.messages,
      phase:     'test',
      maxTokens: 600,
    });
    this.messages.push({ role: 'assistant', content: reply });
    this.questionCount++;
    return safeJSON(reply);
  },

  getMessages() { return [...this.messages]; },
};

/* ── Career Plan Generator ──────────────────────────────────── */
async function generateCareerPlan(vocProfile, professionName) {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  } catch {}

  const response = await fetch(CONFIG.EDGE_FUNCTIONS.GENERATE_CAREER_PLAN, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      vocational_profile: vocProfile,
      profession_name:    professionName,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao gerar plano de carreira.');
  }

  const data = await response.json();
  return data.plan;
}

/* ── Session Summary Generator ─────────────────────────────── */
async function generateSessionSummary(sessionId, messages) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    } catch {}

    const response = await fetch(CONFIG.EDGE_FUNCTIONS.SESSION_SUMMARY, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session_id: sessionId, messages }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.summary;
  } catch {
    return null;
  }
}

/* ── Pre-session Suggested Questions ───────────────────────── */
async function getSuggestedQuestions(mentorArea, studentProfile) {
  const prompt = `Um estudante vai conversar com um mentor da área de "${mentorArea}".
Perfil do estudante: ${JSON.stringify(studentProfile || {})}.
Gere EXATAMENTE 3 perguntas relevantes que o estudante pode fazer ao mentor.
Retorne JSON: { "questions": ["pergunta 1", "pergunta 2", "pergunta 3"] }`;

  try {
    const reply = await callAI({
      messages:  [{ role: 'user', content: prompt }],
      phase:     'general',
      maxTokens: 300,
    });
    const parsed = safeJSON(reply);
    return parsed?.questions || [];
  } catch {
    return [
      'Como você chegou até essa carreira?',
      'Quais habilidades são mais importantes nessa área?',
      'O que você faria diferente se começasse agora?',
    ];
  }
}

/* ── Typing Effect ──────────────────────────────────────────── */
function typewriterEffect(element, text, speed = 18, onDone) {
  let i = 0;
  element.textContent = '';
  element.setAttribute('aria-live', 'polite');

  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      scrollToBottom(element.closest('.chat-body'));
      setTimeout(type, speed);
    } else if (onDone) {
      onDone();
    }
  }
  type();
}

/* ── Export ─────────────────────────────────────────────────── */
window.OnboardingAI             = OnboardingAI;
window.TestAI                   = TestAI;
window.callAI                   = callAI;
window.generateCareerPlan       = generateCareerPlan;
window.generateSessionSummary   = generateSessionSummary;
window.getSuggestedQuestions    = getSuggestedQuestions;
window.typewriterEffect         = typewriterEffect;
window.SYSTEM_PROMPTS           = SYSTEM_PROMPTS;
