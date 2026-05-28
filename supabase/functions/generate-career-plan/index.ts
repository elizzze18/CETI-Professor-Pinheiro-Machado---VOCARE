// ============================================================
// VOCARE — Edge Function: generate-career-plan
// Gera plano de carreira personalizado com Claude
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
    // ── Auth ──────────────────────────────────────────────
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

    // ── Parse body ────────────────────────────────────────
    const { vocational_profile, profession_name } = await req.json();

    if (!profession_name) {
      return json({ error: 'profession_name is required' }, 400);
    }

    // ── Build prompt ──────────────────────────────────────
    const profileStr = vocational_profile
      ? JSON.stringify(vocational_profile, null, 2)
      : '{}';

    const prompt = `Gere um plano de carreira detalhado para um(a) estudante do ensino médio com o seguinte perfil vocacional:
${profileStr}

Profissão-alvo: ${profession_name}

Retorne APENAS JSON válido (sem markdown, sem explicações) com a seguinte estrutura:
{
  "learning_path": [
    { "phase": "Fase 1 — Nome", "description": "Descrição detalhada do que fazer nesta fase", "duration": "X meses" }
  ],
  "recommended_courses": [
    { "name": "Nome do curso", "platform": "Plataforma", "duration": "X horas", "url": "https://...", "is_free": true }
  ],
  "skills_to_develop": ["Habilidade 1", "Habilidade 2"],
  "weekly_goals": [
    { "week": 1, "goal": "Descrição da meta da semana 1", "status": "pending" }
  ]
}

Regras:
- learning_path: 4-6 fases progressivas, desde o ensino médio até a carreira
- recommended_courses: 5-8 cursos, priorizando gratuitos (YouTube, Coursera free, Khan Academy, etc.)
- skills_to_develop: 6-10 habilidades específicas para a profissão
- weekly_goals: 8-12 metas das primeiras 8-12 semanas
- Foco em recursos acessíveis para jovens do interior do Piauí
- Linguagem acessível para 14-19 anos`;

    // ── Call Claude API ───────────────────────────────────
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'API not configured' }, 500);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error('Anthropic error:', response.status);
      return json({ error: 'AI generation failed', plan: _fallbackPlan(profession_name) }, 500);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';

    // Parse JSON — remove potential markdown fences
    let plan;
    try {
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      plan = JSON.parse(clean);
    } catch {
      console.error('JSON parse failed, using fallback');
      plan = _fallbackPlan(profession_name);
    }

    return json({ plan }, 200);

  } catch (err) {
    console.error('generate-career-plan error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});

function _fallbackPlan(professionName: string) {
  return {
    learning_path: [
      { phase: 'Fase 1 — Fundamentos', description: `Explore os conceitos básicos de ${professionName} e confirme seu interesse pela área.`, duration: '3 meses' },
      { phase: 'Fase 2 — Preparação', description: 'Pesquise os cursos e faculdades disponíveis. Identifique os pré-requisitos necessários.', duration: '6 meses' },
      { phase: 'Fase 3 — Desenvolvimento', description: 'Inicie cursos online gratuitos e desenvolva suas primeiras habilidades práticas.', duration: '12 meses' },
      { phase: 'Fase 4 — Entrada no mercado', description: 'Busque estágios ou oportunidades voluntárias para construir experiência.', duration: '6 meses' },
    ],
    recommended_courses: [
      { name: 'Khan Academy — Preparação para o ENEM', platform: 'Khan Academy', duration: '40 horas', url: 'https://pt.khanacademy.org', is_free: true },
      { name: 'Coursera — Introdução à área', platform: 'Coursera', duration: '20 horas', url: 'https://www.coursera.org', is_free: true },
      { name: 'YouTube — Canal educativo da área', platform: 'YouTube', duration: '10 horas', url: 'https://www.youtube.com', is_free: true },
    ],
    skills_to_develop: ['Comunicação', 'Trabalho em equipe', 'Pensamento crítico', 'Leitura e escrita', 'Resolução de problemas'],
    weekly_goals: [
      { week: 1, goal: 'Pesquisar sobre a carreira de ' + professionName + ' e anotar suas dúvidas', status: 'pending' },
      { week: 2, goal: 'Conversar com um profissional da área (mentor, familiar ou professor)', status: 'pending' },
      { week: 3, goal: 'Criar conta em uma plataforma de cursos gratuitos (Khan Academy ou Coursera)', status: 'pending' },
      { week: 4, goal: 'Completar o primeiro módulo de um curso relacionado à área', status: 'pending' },
    ],
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
