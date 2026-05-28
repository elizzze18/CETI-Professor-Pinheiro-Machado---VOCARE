// ============================================================
// VOCARE — Edge Function: ai-proxy
// Intermediário seguro para chamadas à API Claude
// Verifica JWT do Supabase antes de repassar à Anthropic
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPTS: Record<string, string> = {
  onboarding: `Você é a Voca, assistente de orientação profissional da plataforma Vocare.
Seu tom é acolhedor, próximo e sem formalismo escolar. Use linguagem jovem, mas sem gírias excessivas.
Você está conversando com um(a) estudante do ensino médio da rede pública do Piauí.

Seu objetivo é mapear, de forma natural e conversacional:
1. Interesses pessoais (o que gosta de fazer, matérias favoritas)
2. Traços de personalidade (introvertido/extrovertido, analítico/criativo etc.)
3. Habilidades percebidas (o que as pessoas pedem ajuda a ele/ela)
4. Contexto de vida (família, referências de carreira, sonhos)

Faça UMA pergunta por vez. Após 6 trocas, sintetize um perfil vocacional inicial em JSON com os campos:
{ "interests": [], "personality_traits": [], "skills": [], "context_summary": "" }
Retorne APENAS o JSON no último turno, sem texto adicional.`,

  test: `Você conduz um teste vocacional adaptativo. Recebe as respostas anteriores do estudante
e retorna a próxima pergunta mais relevante para refinar o perfil vocacional.
Cada resposta deve ter exatamente 4 opções.

Formato de retorno (JSON válido, sem markdown):
{
  "question": "texto da pergunta",
  "options": ["opção A", "opção B", "opção C", "opção D"],
  "is_final": false
}

Quando tiver informação suficiente (após 10+ perguntas), retorne is_final: true e adicione:
"profile": { "interests": [], "traits": [], "top_areas": [], "recommended_professions": [] }

Nunca use markdown. Retorne APENAS JSON válido.`,

  general: `Você é a Voca, assistente de orientação profissional da Vocare.
Tom acolhedor, jovem e encorajador. Responda de forma concisa e útil.
Foque em orientação de carreira para estudantes do ensino médio público.`,
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // ── 1. Verify JWT ──────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );

    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // ── 2. Parse body ──────────────────────────────────────
    const body = await req.json();
    const { messages, phase = 'general', max_tokens = 1000 } = body;

    if (!messages || !Array.isArray(messages)) {
      return json({ error: 'Invalid messages array' }, 400);
    }

    // Validate messages
    const validMessages = messages
      .filter(m => m?.role && m?.content && typeof m.content === 'string')
      .slice(-20); // Limit context window

    if (!validMessages.length) {
      return json({ error: 'No valid messages' }, 400);
    }

    // ── 3. Select model based on complexity ───────────────
    const complexPhases = ['onboarding', 'test'];
    const model = complexPhases.includes(phase)
      ? 'claude-sonnet-4-20250514'
      : 'claude-haiku-4-5-20251001';

    // ── 4. Call Claude API ─────────────────────────────────
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return json({ error: 'API not configured' }, 500);
    }

    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(max_tokens, 2000),
        system:   SYSTEM_PROMPTS[phase] || SYSTEM_PROMPTS.general,
        messages: validMessages,
      }),
    });

    if (!anthropicResponse.ok) {
      const errBody = await anthropicResponse.text();
      console.error('Anthropic API error:', anthropicResponse.status, errBody);
      return json({ error: `AI service error: ${anthropicResponse.status}` }, 502);
    }

    const data = await anthropicResponse.json();
    const content = data.content?.[0]?.text ?? '';

    // ── 5. Return content ──────────────────────────────────
    return json({ content }, 200);

  } catch (err) {
    console.error('ai-proxy error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
