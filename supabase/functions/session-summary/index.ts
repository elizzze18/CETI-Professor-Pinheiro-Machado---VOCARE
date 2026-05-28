// ============================================================
// VOCARE — Edge Function: session-summary
// Gera resumo automático de sessão de mentoria com Claude
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (error || !user) return json({ error: 'Unauthorized' }, 401);

    const { session_id, messages } = await req.json();
    if (!session_id || !messages?.length) {
      return json({ summary: null }, 200);
    }

    const conversation = messages
      .slice(0, 30) // Limit
      .map((m: {role: string; content: string}) => `${m.role === 'student' ? 'Estudante' : 'Mentor'}: ${m.content}`)
      .join('\n');

    const prompt = `Gere um resumo conciso (3-5 frases) da seguinte sessão de mentoria.
Foque em: tópicos discutidos, conselhos dados, próximos passos sugeridos.
Tom neutro e profissional. Escreva em português.

Conversa:
${conversation}

Resumo:`;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ summary: null }, 200);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) return json({ summary: null }, 200);

    const data = await response.json();
    const summary = data.content?.[0]?.text?.trim() ?? null;

    // Save summary to DB
    if (summary) {
      await supabase
        .from('mentoring_sessions')
        .update({ ai_summary: summary })
        .eq('id', session_id);
    }

    return json({ summary }, 200);
  } catch (err) {
    console.error('session-summary error:', err);
    return json({ summary: null }, 200);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
