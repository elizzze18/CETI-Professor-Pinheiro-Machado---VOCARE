// Vocare — Career Plan Generator com suporte a múltiplos provedores

function getProvider() {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GOOGLE_AI_KEY)     return 'gemini';
  if (process.env.GROQ_API_KEY)      return 'groq';
  return null;
}

// Plataformas reais e gratuitas por área
const FREE_PLATFORMS_BY_AREA = {
  'Tecnologia': [
    { name: 'CS50 (Harvard grátis)', platform: 'edX', url: 'https://cs50.harvard.edu/x/' },
    { name: 'freeCodeCamp', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/portuguese/' },
    { name: 'Cursos de TI gratuitos', platform: 'DIO', url: 'https://www.dio.me/' },
    { name: 'Programação para iniciantes', platform: 'Curso em Vídeo', url: 'https://www.cursoemvideo.com/' },
    { name: 'SENAI cursos digitais', platform: 'SENAI', url: 'https://online.sp.senai.br/courses/' },
  ],
  'Saúde': [
    { name: 'Biologia e Saúde', platform: 'Khan Academy', url: 'https://pt.khanacademy.org/science/biology' },
    { name: 'Cursos de Saúde gratuitos', platform: 'FIOCRUZ EAD', url: 'https://avasus.ufrn.br/' },
    { name: 'Primeiro socorros e saúde', platform: 'UNASUS', url: 'https://www.unasus.gov.br/' },
    { name: 'Anatomia Humana gratuita', platform: 'Coursera (audit)', url: 'https://www.coursera.org/learn/anatomy' },
  ],
  'Educação': [
    { name: 'Pedagogia e Ensino', platform: 'MEC / AVAMEC', url: 'https://avamec.mec.gov.br/' },
    { name: 'Fundamentos da Educação', platform: 'Coursera (audit)', url: 'https://www.coursera.org/browse/education' },
    { name: 'LIBRAS e Educação Inclusiva', platform: 'INES EAD', url: 'https://www.ines.gov.br/ead/' },
  ],
  'Direito': [
    { name: 'Introdução ao Direito', platform: 'CEAD UFPB', url: 'https://www.cead.ufpb.br/' },
    { name: 'Noções de Direito Constitucional', platform: 'Estratégia Concursos', url: 'https://www.estrategiaconcursos.com.br/' },
    { name: 'Legislação Básica', platform: 'LFG / Saraiva', url: 'https://www.lfg.com.br/' },
  ],
  'Engenharia': [
    { name: 'Matemática e Física', platform: 'Khan Academy', url: 'https://pt.khanacademy.org/' },
    { name: 'Introdução à Engenharia', platform: 'Coursera (audit)', url: 'https://www.coursera.org/learn/intro-engineering' },
    { name: 'AutoCAD Básico', platform: 'Curso em Vídeo', url: 'https://www.cursoemvideo.com/' },
    { name: 'Física e cálculo aplicados', platform: 'MIT OpenCourseWare', url: 'https://ocw.mit.edu/' },
  ],
  'Administração': [
    { name: 'Gestão Empresarial', platform: 'SEBRAE', url: 'https://www.sebrae.com.br/sites/PortalSebrae/cursosonline' },
    { name: 'Administração e Negócios', platform: 'FGV Online', url: 'https://educacao-executiva.fgv.br/cursos-gratuitos' },
    { name: 'Empreendedorismo', platform: 'Endeavor', url: 'https://endeavor.org.br/cursos/' },
  ],
  'default': [
    { name: 'Cursos variados gratuitos', platform: 'Khan Academy', url: 'https://pt.khanacademy.org/' },
    { name: 'Plataforma de cursos livres', platform: 'Coursera (audit)', url: 'https://www.coursera.org/' },
    { name: 'Cursos técnicos gratuitos', platform: 'SENAI', url: 'https://online.sp.senai.br/' },
    { name: 'Cursos de gestão e negócios', platform: 'FGV Online', url: 'https://educacao-executiva.fgv.br/cursos-gratuitos' },
    { name: 'Inglês gratuito', platform: 'Duolingo', url: 'https://www.duolingo.com/' },
  ],
};

function buildPrompt(profession_name, vocational_profile) {
  const area       = vocational_profile?.area || '';
  const topAreas   = vocational_profile?.top_areas?.join(', ') || area || '';
  const interests  = (vocational_profile?.interests || []).join(', ');
  const traits     = (vocational_profile?.traits || vocational_profile?.personality_traits || []).join(', ');
  const topProfs   = (vocational_profile?.recommended_professions || []).slice(0, 5).join(', ');

  const platformHints = (FREE_PLATFORMS_BY_AREA[area] || FREE_PLATFORMS_BY_AREA['default'])
    .map(p => `  - "${p.name}" → ${p.platform}: ${p.url}`)
    .join('\n');

  const profileContext = [
    topAreas  ? `Áreas de maior afinidade: ${topAreas}` : '',
    interests ? `Interesses do estudante: ${interests}`  : '',
    traits    ? `Traços de personalidade: ${traits}`     : '',
    topProfs  ? `Outras profissões no perfil: ${topProfs}` : '',
  ].filter(Boolean).join('\n');

  return `Você é um orientador profissional especialista em carreiras para jovens brasileiros.

Crie um plano de carreira ESPECÍFICO E DETALHADO em JSON para um estudante do ensino médio público do Piauí que quer seguir a carreira de: ${profession_name}

PERFIL DO ESTUDANTE:
${profileContext || 'Perfil em construção'}

PLATAFORMAS GRATUITAS REAIS para incluir nos cursos (use URLs reais e cursos com nome específico):
${platformHints}
Você pode adicionar outras plataformas além dessas, desde que sejam GRATUITAS e com URL real.

Retorne APENAS JSON válido (sem markdown, sem texto adicional):
{
  "learning_path": [
    { "phase": "nome da fase", "description": "o que fazer de concreto nessa fase, com passos claros", "duration": "X meses" }
  ],
  "recommended_courses": [
    { "name": "nome ESPECÍFICO do curso (ex: 'Python para iniciantes')", "platform": "nome da plataforma", "url": "https://url-real-e-funcional.com", "is_free": true }
  ],
  "skills_to_develop": ["habilidade técnica específica para ${profession_name}", "..."],
  "weekly_goals": [
    { "week": 1, "goal": "meta específica, mensurável e realista da semana", "completed": false }
  ]
}

REGRAS OBRIGATÓRIAS:
1. Os cursos devem ser REAIS com URLs que funcionam (não invente cursos)
2. Prefira plataformas em PORTUGUÊS ou com legendas PT-BR
3. Todos os cursos devem ser GRATUITOS (ou audit free)
4. A trilha deve ser realista para um jovem de 14-18 anos do PI, sem acesso a cursos pagos
5. As metas semanais devem ser ESPECÍFICAS para ${profession_name} e alinhadas com o perfil do estudante
6. Inclua pelo menos 1 recurso disponível em Teresina/PI (SENAI local, UFPI, etc.) quando relevante
7. 4 a 5 fases, 5 a 7 cursos, 8 a 10 habilidades, 8 metas semanais
8. Use os interesses e traços de personalidade do estudante para personalizar as metas e habilidades`;
}
function parseplan(text) {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // Tenta encontrar o JSON mesmo se houver texto antes/depois
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  return JSON.parse(cleaned);
}

async function callAnthropic(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callGemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_AI_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents:          [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig:  { maxOutputTokens: 2500, temperature: 0.5 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:      'llama-3.3-70b-versatile',
      max_tokens: 2500,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function buildFallbackPlan(profession_name) {
  return {
    learning_path: [
      { phase: 'Descoberta',      description: `Pesquise sobre a carreira de ${profession_name}: o que faz, onde trabalha.`,     duration: '2 semanas' },
      { phase: 'Fundamentos',     description: 'Estude os conceitos básicos por meio de cursos online gratuitos.',               duration: '2 meses'  },
      { phase: 'Prática Inicial', description: 'Desenvolva pequenos projetos para ganhar experiência.',                          duration: '3 meses'  },
      { phase: 'Portfólio',       description: 'Monte um portfólio com seus projetos e conquistas.',                             duration: '2 meses'  },
      { phase: 'Preparação',      description: 'Pesquise faculdades, cursos técnicos e oportunidades de estágio.',               duration: '1 mês'    },
    ],
    recommended_courses: [
      { name: 'Khan Academy',                    platform: 'Khan Academy', url: 'https://pt.khanacademy.org',                       is_free: true },
      { name: `${profession_name} no YouTube`,   platform: 'YouTube',      url: 'https://youtube.com',                              is_free: true },
      { name: 'Cursos Gratuitos',                platform: 'Coursera',     url: 'https://coursera.org',                             is_free: true },
      { name: 'SENAI Cursos Online',             platform: 'SENAI',        url: 'https://online.sp.senai.br',                       is_free: true },
      { name: 'FGV Cursos Livres',               platform: 'FGV Online',   url: 'https://educacao-executiva.fgv.br/cursos-gratuitos', is_free: true },
    ],
    skills_to_develop: ['Comunicação', 'Trabalho em equipe', 'Resolução de problemas', 'Pensamento crítico', 'Organização', 'Proatividade', 'Adaptabilidade', 'Uso de tecnologia'],
    weekly_goals: [
      { week: 1, goal: `Pesquisar 3 profissionais de ${profession_name} no LinkedIn`,  completed: false },
      { week: 2, goal: 'Assistir 2 vídeos sobre a profissão e fazer anotações',        completed: false },
      { week: 3, goal: 'Criar conta no Khan Academy e completar 1 módulo',             completed: false },
      { week: 4, goal: 'Conversar com alguém que trabalhe na área',                   completed: false },
      { week: 5, goal: 'Pesquisar faculdades e cursos técnicos em Teresina',           completed: false },
      { week: 6, goal: 'Se inscrever em 1 curso gratuito online da lista',             completed: false },
      { week: 7, goal: 'Iniciar um pequeno projeto ou exercício prático',              completed: false },
      { week: 8, goal: 'Escrever sobre por que quer seguir essa carreira',             completed: false },
    ],
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Método não permitido.' });

  const provider = getProvider();
  if (!provider) return res.status(500).json({ error: 'Nenhuma chave de IA configurada no .env' });

  const { vocational_profile, profession_name } = req.body || {};
  if (!profession_name) return res.status(400).json({ error: 'profession_name é obrigatório.' });

  const prompt = buildPrompt(profession_name, vocational_profile);

  try {
    let text = '';
    if (provider === 'anthropic') text = await callAnthropic(prompt);
    else if (provider === 'gemini') text = await callGemini(prompt);
    else if (provider === 'groq')   text = await callGroq(prompt);

    let plan;
    try {
      plan = parseplan(text);
    } catch {
      console.warn('JSON parse failed, using fallback plan');
      plan = buildFallbackPlan(profession_name);
    }

    return res.json({ plan, provider });

  } catch (err) {
    console.error(`[${provider}] generate-career-plan error:`, err.message);
    return res.status(502).json({ error: `Erro ao gerar plano (${provider}): ${err.message}` });
  }
};
