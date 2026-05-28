// Vocare — Session Summary com suporte a múltiplos provedores

function getProvider() {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GOOGLE_AI_KEY)     return 'gemini';
  if (process.env.GROQ_API_KEY)      return 'groq';
  return null;
}

function buildPrompt(messages) {
  const transcript = messages
    .slice(-30)
    .map(m => `${m.role === 'student' ? 'Estudante' : 'Mentor'}: ${m.content}`)
    .join('\n');

  return `Você é um assistente pedagógico. Resuma em 3 a 4 frases os principais pontos, aprendizados e próximos passos desta sessão de mentoria.

Transcrição:
${transcript}

Escreva em português, com tom encorajador e focado no crescimento do estudante. Sem markdown.`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Método não permitido.' });

  const provider = getProvider();
  if (!provider) return res.status(500).json({ error: 'Nenhuma chave de IA configurada.' });

  const { messages } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: '"messages" é obrigatório.' });

  const prompt = buildPrompt(messages);

  try {
    let summary = '';

    if (provider === 'anthropic') {
      const res2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await res2.json();
      summary = data.content?.[0]?.text ?? '';

    } else if (provider === 'gemini') {
      const res2 = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_AI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 400 } }),
        }
      );
      const data = await res2.json();
      summary = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    } else if (provider === 'groq') {
      const res2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await res2.json();
      summary = data.choices?.[0]?.message?.content ?? '';
    }

    return res.json({ summary });

  } catch (err) {
    console.error(`[${provider}] session-summary error:`, err.message);
    return res.status(500).json({ error: 'Erro interno.' });
  }
};
