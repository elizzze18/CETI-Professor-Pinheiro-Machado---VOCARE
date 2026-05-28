-- ============================================================
-- VOCARE — Seed Data
-- seed.sql · Profissões para o MVP — Piauí / Brasil 2025
-- ============================================================

-- ── Limpar dados existentes ───────────────────────────────────
DELETE FROM career_recommendations;
DELETE FROM career_plans;
DELETE FROM professions;

-- ── Inserir 20 profissões ─────────────────────────────────────
INSERT INTO professions (name, area, description, education_required, salary_range, market_outlook, tags, vlog_url) VALUES

-- 1. Engenheiro(a) de Software
(
  'Engenheiro(a) de Software',
  'Tecnologia',
  'O engenheiro de software cria os sistemas, aplicativos e plataformas digitais que movem o mundo moderno — de aplicativos de delivery até sistemas bancários. Em Teresina, startups e empresas de tecnologia estão contratando cada vez mais, e a maioria das vagas permite trabalho remoto para qualquer lugar do Brasil e do mundo. Para entrar nessa carreira, você precisa aprender lógica de programação e linguagens como Python, JavaScript ou Java — e hoje existem cursos gratuitos de altíssima qualidade na internet. É uma das profissões com maior crescimento e melhor remuneração do mercado brasileiro, e você pode começar a aprender ainda no ensino médio.',
  'bachelors',
  '{"min": 4000, "max": 18000}',
  'growing',
  ARRAY['programação', 'resolução de problemas', 'lógica computacional', 'trabalho em equipe', 'aprendizado contínuo'],
  'https://www.youtube.com/results?search_query=como+se+tornar+engenheiro+software+brasil'
),

-- 2. Cientista de Dados
(
  'Cientista de Dados',
  'Tecnologia',
  'O cientista de dados analisa enormes volumes de informação para descobrir padrões escondidos e ajudar empresas e governos a tomar decisões mais inteligentes. No Piauí, essa habilidade pode ser usada para melhorar políticas públicas, otimizar a produção agrícola no MATOPIBA ou prever riscos de saúde no interior do estado. A profissão exige uma combinação rara de estatística, programação em Python ou R e visão de negócios — por isso é uma das mais bem pagas da área de tecnologia. O mercado brasileiro está com enorme escassez de profissionais qualificados, o que significa ótimas oportunidades para quem começar a se preparar agora.',
  'bachelors',
  '{"min": 5000, "max": 20000}',
  'growing',
  ARRAY['análise de dados', 'programação Python', 'estatística', 'machine learning', 'visualização de dados'],
  'https://www.youtube.com/results?search_query=carreira+cientista+dados+data+science+brasil'
),

-- 3. Designer UX/UI
(
  'Designer UX/UI',
  'Tecnologia',
  'O designer de UX/UI é o profissional que pensa em como as pessoas vão usar um aplicativo ou site, tornando a experiência intuitiva, bonita e funcional. Ele une criatividade artística com empatia pelo usuário e ferramentas digitais como Figma e Adobe XD. É uma das profissões que mais cresce em startups e agências digitais brasileiras, com muitas vagas remotas acessíveis de qualquer cidade do Piauí. Se você gosta de design, gosta de resolver problemas visuais e quer trabalhar com tecnologia sem precisar programar muito, essa pode ser a sua área ideal.',
  'bachelors',
  '{"min": 3500, "max": 14000}',
  'growing',
  ARRAY['design de interfaces', 'empatia com o usuário', 'prototipagem', 'Figma', 'pensamento criativo'],
  'https://www.youtube.com/results?search_query=designer+ux+ui+carreira+brasil+figma'
),

-- 4. Analista de Cibersegurança
(
  'Analista de Cibersegurança',
  'Tecnologia',
  'O analista de cibersegurança é o profissional que protege sistemas, redes e dados de empresas e governos contra ataques hackers e vazamentos de informações. Com o avanço da digitalização de serviços públicos no Piauí e em todo o Brasil, a demanda por esses especialistas cresceu de forma explosiva nos últimos anos. O profissional realiza testes de invasão (pentest), monitora ameaças e cria políticas de segurança — e pode trabalhar de forma remota para empresas do mundo inteiro. É uma das áreas com maior escassez de talentos no Brasil, com salários que superam a média da área de TI já nos primeiros anos de carreira.',
  'bachelors',
  '{"min": 5000, "max": 22000}',
  'growing',
  ARRAY['segurança da informação', 'hacking ético', 'análise de vulnerabilidades', 'redes de computadores', 'pensamento analítico'],
  'https://www.youtube.com/results?search_query=ciberseguranca+hacker+etico+carreira+brasil'
),

-- 5. Médico(a)
(
  'Médico(a)',
  'Saúde',
  'O médico é o profissional responsável por diagnosticar doenças, indicar tratamentos e promover a saúde da população — uma das carreiras mais respeitadas e essenciais da sociedade brasileira. No Piauí, existe grande necessidade de médicos tanto em Teresina quanto nos municípios do interior, com vagas no SUS, em concursos estaduais e em clínicas privadas. A formação é longa — seis anos de graduação mais residência médica —, mas a remuneração e o impacto social são excepcionais. Especialidades como medicina de família, pediatria e clínica geral têm altíssima demanda no interior piauiense.',
  'bachelors',
  '{"min": 8000, "max": 35000}',
  'stable',
  ARRAY['ciências biológicas', 'raciocínio clínico', 'empatia', 'responsabilidade', 'trabalho sob pressão'],
  'https://www.youtube.com/results?search_query=medicina+carreira+medico+brasil+dia+a+dia'
),

-- 6. Enfermeiro(a)
(
  'Enfermeiro(a)',
  'Saúde',
  'O enfermeiro é peça fundamental no sistema de saúde brasileiro, atuando diretamente no cuidado de pacientes em hospitais, Unidades Básicas de Saúde, UTIs e programas de saúde da família. No Piauí, o SUS absorve muitos profissionais de enfermagem por meio de concursos públicos municipais e estaduais, garantindo estabilidade e bons benefícios. O curso de graduação dura quatro anos e pode ser feito em diversas universidades públicas e privadas de Teresina. É uma carreira de grande impacto humano, ideal para quem tem vocação para cuidar e quer fazer diferença na vida das pessoas.',
  'bachelors',
  '{"min": 3000, "max": 9000}',
  'growing',
  ARRAY['cuidados com pacientes', 'procedimentos clínicos', 'saúde pública', 'empatia', 'trabalho em equipe'],
  'https://www.youtube.com/results?search_query=enfermagem+carreira+enfermeiro+brasil'
),

-- 7. Psicólogo(a)
(
  'Psicólogo(a)',
  'Saúde',
  'O psicólogo estuda o comportamento humano e oferece suporte emocional, psicoterapia e orientação para indivíduos, famílias e organizações. Com o aumento da conscientização sobre saúde mental no Brasil, a demanda pela profissão cresceu muito nos últimos anos — especialmente entre jovens e adolescentes. Em Teresina, psicólogos atuam em clínicas particulares, no CAPS (Centro de Atenção Psicossocial), em escolas públicas e em empresas. A psicologia digital e os atendimentos online também abriram um novo mercado, permitindo que profissionais do Piauí atendam clientes de todo o Brasil.',
  'bachelors',
  '{"min": 2500, "max": 12000}',
  'growing',
  ARRAY['escuta ativa', 'saúde mental', 'psicoterapia', 'avaliação psicológica', 'empatia'],
  'https://www.youtube.com/results?search_query=psicologia+psicologo+carreira+saude+mental+brasil'
),

-- 8. Professor(a) do Ensino Médio
(
  'Professor(a) do Ensino Médio',
  'Educação',
  'O professor é o profissional que transforma vidas ao transmitir conhecimento, desenvolver o pensamento crítico e preparar jovens para o futuro — exatamente o que você está vivendo agora. No Piauí, concursos para a rede estadual de ensino são realizados com frequência, garantindo estabilidade, férias, FGTS e benefícios públicos aos aprovados. A carreira docente oferece liberdade para escolher a disciplina de paixão — matemática, biologia, história, inglês — e atuar em escolas do interior ou na capital. Com o PISO nacional do magistério, a remuneração tem melhorado, e professores com pós-graduação e cursos de especialização ganham mais.',
  'bachelors',
  '{"min": 2500, "max": 8000}',
  'stable',
  ARRAY['didática', 'comunicação clara', 'planejamento de aulas', 'liderança', 'paixão por ensinar'],
  'https://www.youtube.com/results?search_query=ser+professor+carreira+educacao+brasil'
),

-- 9. Pedagogo(a)
(
  'Pedagogo(a)',
  'Educação',
  'O pedagogo coordena processos educativos, orienta professores, desenvolve projetos pedagógicos e trabalha para melhorar a qualidade do ensino nas escolas. Além das escolas, esse profissional atua cada vez mais em empresas na área de Treinamento e Desenvolvimento (T&D), ajudando equipes a aprender e crescer. No Piauí, concursos para pedagogos nas redes municipais e estadual abrem regularmente, oferecendo boa estabilidade profissional. É uma carreira ideal para quem ama educação mas prefere atuar na gestão e organização pedagógica do que diretamente em sala de aula.',
  'bachelors',
  '{"min": 2200, "max": 7000}',
  'stable',
  ARRAY['coordenação pedagógica', 'gestão educacional', 'elaboração de projetos', 'orientação de professores', 'avaliação escolar'],
  'https://www.youtube.com/results?search_query=pedagogia+pedagogo+carreira+brasil'
),

-- 10. Engenheiro(a) Civil
(
  'Engenheiro(a) Civil',
  'Engenharia',
  'O engenheiro civil projeta e supervisiona a construção de edifícios, pontes, estradas, barragens e toda a infraestrutura que sustenta uma cidade moderna. Em Teresina e no interior do Piauí, obras de saneamento básico, habitação popular e infraestrutura rodoviária geram demanda contínua por esses profissionais. O curso dura cinco anos e combina física, matemática, resistência de materiais e gestão de obras. Com registro no CREA, o engenheiro civil pode abrir sua própria construtora ou prestar serviços como autônomo, além de atuar em concursos públicos de prefeituras e do governo estadual.',
  'bachelors',
  '{"min": 4500, "max": 16000}',
  'stable',
  ARRAY['projetos estruturais', 'gestão de obras', 'cálculo e física', 'AutoCAD', 'planejamento urbano'],
  'https://www.youtube.com/results?search_query=engenharia+civil+carreira+obras+brasil'
),

-- 11. Engenheiro(a) Elétrico(a)
(
  'Engenheiro(a) Elétrico(a)',
  'Engenharia',
  'O engenheiro elétrico projeta sistemas de geração, transmissão e distribuição de energia, além de trabalhar com automação industrial, telecomunicações e energia renovável. O Piauí tem um dos maiores potenciais de energia solar e eólica do Brasil, e projetos de parques de energia limpa no estado estão gerando centenas de vagas para esses profissionais. A transição energética global torna essa uma das engenharias com maior crescimento nos próximos 20 anos. Quem se formar em engenharia elétrica com foco em energias renováveis tem perspectivas excelentes tanto no mercado nacional quanto internacional.',
  'bachelors',
  '{"min": 5000, "max": 18000}',
  'growing',
  ARRAY['sistemas elétricos', 'energia renovável', 'automação industrial', 'eletrônica', 'cálculo aplicado'],
  'https://www.youtube.com/results?search_query=engenharia+eletrica+energia+renovavel+carreira+brasil'
),

-- 12. Advogado(a)
(
  'Advogado(a)',
  'Direito',
  'O advogado defende direitos e interesses de pessoas físicas e jurídicas, presta assessoria jurídica e atua em processos nas mais diversas áreas — trabalhista, civil, penal, tributária e muito mais. No Piauí, além da advocacia privada, o direito abre portas para concursos altamente disputados como Defensoria Pública, Ministério Público, Magistratura e Procuradorias estaduais. O curso de direito dura cinco anos e exige aprovação no Exame da OAB para exercer a profissão — uma prova rigorosa que demanda dedicação. Quem se especializa em áreas em alta, como direito digital, ambiental ou tributário, se destaca no mercado competitivo.',
  'bachelors',
  '{"min": 3000, "max": 20000}',
  'stable',
  ARRAY['argumentação jurídica', 'interpretação de leis', 'escrita formal', 'negociação', 'ética profissional'],
  'https://www.youtube.com/results?search_query=direito+advogado+oab+carreira+brasil'
),

-- 13. Jornalista
(
  'Jornalista',
  'Comunicação',
  'O jornalista investiga, apura e comunica informações de interesse público, sendo essencial para a democracia e para manter a sociedade bem informada. No Piauí, emissoras de TV, rádios, portais de notícias e assessorias de comunicação do governo estadual e de prefeituras empregam jornalistas em Teresina e no interior. A transformação digital criou novas oportunidades em podcasts, canais no YouTube, newsletters e redes sociais — permitindo que jornalistas construam audiências próprias. É uma carreira para quem tem curiosidade insaciável, gosta de escrever e quer impactar a sociedade com informação de qualidade.',
  'bachelors',
  '{"min": 2000, "max": 8000}',
  'stable',
  ARRAY['apuração jornalística', 'escrita criativa', 'comunicação oral', 'investigação', 'mídias digitais'],
  'https://www.youtube.com/results?search_query=jornalismo+jornalista+comunicacao+carreira+brasil'
),

-- 14. Publicitário(a) / Marketing Digital
(
  'Publicitário(a) / Marketing Digital',
  'Comunicação',
  'O publicitário cria campanhas que conectam marcas às pessoas, combinando criatividade, estratégia e cada vez mais o uso de dados digitais. Com o crescimento do comércio eletrônico e das redes sociais, o marketing digital explodiu no Brasil — e agências de Teresina já atendem clientes de todo o país. O profissional de marketing digital domina ferramentas como Google Ads, Meta Ads, SEO e análise de métricas para gerar resultados mensuráveis para os negócios. É uma área onde é possível construir uma carreira freelancer de alto rendimento trabalhando de qualquer cidade do Piauí com acesso à internet.',
  'bachelors',
  '{"min": 2500, "max": 12000}',
  'growing',
  ARRAY['marketing digital', 'criação de conteúdo', 'gestão de redes sociais', 'tráfego pago', 'análise de métricas'],
  'https://www.youtube.com/results?search_query=publicidade+marketing+digital+carreira+brasil'
),

-- 15. Administrador(a) de Empresas
(
  'Administrador(a) de Empresas',
  'Administração',
  'O administrador gerencia recursos humanos, financeiros e operacionais de organizações públicas e privadas, garantindo eficiência e crescimento sustentável. É uma das graduações mais versáteis do Brasil — formandos em administração atuam em finanças, recursos humanos, marketing, logística, comércio exterior e muito mais. Em Teresina, empresas do setor de serviços, comércio e indústria alimentícia absorvem muitos administradores. Concursos públicos para cargos administrativos em prefeituras, governo do Piauí e autarquias estaduais também são uma excelente opção de carreira estável.',
  'bachelors',
  '{"min": 2500, "max": 12000}',
  'stable',
  ARRAY['gestão empresarial', 'liderança de equipes', 'planejamento estratégico', 'análise financeira', 'tomada de decisão'],
  'https://www.youtube.com/results?search_query=administracao+empresas+carreira+brasil'
),

-- 16. Empreendedor(a) Social
(
  'Empreendedor(a) Social',
  'Administração',
  'O empreendedor social cria negócios que geram impacto positivo na comunidade enquanto também são financeiramente sustentáveis — unindo lucro e propósito. No Piauí, há espaço enorme para negócios que resolvam problemas reais: acesso à educação no interior, geração de renda no campo, soluções de saúde para populações vulneráveis e muito mais. Não existe um caminho único de formação — o que importa é identificar um problema, testar soluções e aprender rápido com os erros. Programas como Sebrae Jovem, Enactus e aceleradoras sociais ajudam jovens empreendedores piauienses a transformar boas ideias em negócios reais.',
  'high_school',
  '{"min": 0, "max": 50000}',
  'growing',
  ARRAY['identificação de oportunidades', 'inovação social', 'liderança', 'gestão de projetos', 'resiliência'],
  'https://www.youtube.com/results?search_query=empreendedorismo+jovem+startup+brasil'
),

-- 17. Engenheiro(a) Agrônomo(a)
(
  'Engenheiro(a) Agrônomo(a)',
  'Agronegócio',
  'O engenheiro agrônomo desenvolve tecnologias e técnicas para aumentar a produção de alimentos de forma eficiente e sustentável, sendo peça-chave do agronegócio brasileiro. O Piauí está no coração do MATOPIBA — a mais nova fronteira agrícola do Brasil, que engloba Maranhão, Tocantins, Piauí e Bahia —, gerando altíssima demanda por agrônomos na região sul do estado. O profissional atua em lavouras de soja, milho, algodão e mandioca, além de trabalhar com irrigação, solos, pragas e defesa agropecuária. É uma carreira com excelente empregabilidade no estado e possibilidade de atuar em empresas de insumos, cooperativas e órgãos como Embrapa e Adapi.',
  'bachelors',
  '{"min": 3500, "max": 14000}',
  'growing',
  ARRAY['manejo de solo e culturas', 'tecnologias agrícolas', 'sustentabilidade', 'ciências biológicas', 'gestão rural'],
  'https://www.youtube.com/results?search_query=agronomia+agronomo+agronegocio+brasil'
),

-- 18. Músico(a) / Produtor(a) Musical
(
  'Músico(a) / Produtor(a) Musical',
  'Artes',
  'O músico e produtor musical cria, interpreta e registra obras sonoras — podendo atuar como artista solo, compositor, produtor de estúdio, professor de música ou técnico de som em eventos. O Piauí tem uma cena cultural rica, com forró eletrônico, música de raiz, bandas de rock e artistas independentes que constroem carreiras usando plataformas como Spotify, YouTube e TikTok. Com um computador e um software de produção como o FL Studio ou Ableton, é possível produzir músicas de qualidade profissional de qualquer cidade do estado. A carreira exige disciplina e reinvenção constante, mas a era do streaming democratizou o acesso ao mercado musical de forma inédita.',
  'technical',
  '{"min": 1500, "max": 15000}',
  'stable',
  ARRAY['teoria musical', 'produção de áudio', 'instrumento musical', 'composição', 'marketing artístico'],
  'https://www.youtube.com/results?search_query=musico+producao+musical+carreira+brasil'
),

-- 19. Biólogo(a)
(
  'Biólogo(a)',
  'Ciências',
  'O biólogo estuda os seres vivos — animais, plantas, microrganismos e ecossistemas — e aplica esse conhecimento na pesquisa científica, saúde pública, educação e preservação ambiental. O Piauí abriga biomas únicos como o Cerrado e a Caatinga, além de parques nacionais como a Serra da Capivara, criando oportunidades para biólogos que trabalham com pesquisa e ecoturismo. A biotecnologia e a bioinformática são novas fronteiras da biologia que estão gerando empregos bem remunerados no Brasil. Biólogos também atuam em licenciamentos ambientais de obras, no controle de vetores de doenças e em laboratórios clínicos e de análises ambientais.',
  'bachelors',
  '{"min": 2500, "max": 9000}',
  'stable',
  ARRAY['ecologia e meio ambiente', 'pesquisa científica', 'análise laboratorial', 'zoologia e botânica', 'educação ambiental'],
  'https://www.youtube.com/results?search_query=biologia+biologo+meio+ambiente+carreira+brasil'
),

-- 20. Agente de Segurança Pública
(
  'Agente de Segurança Pública',
  'Segurança',
  'O agente de segurança pública — policial civil, policial militar, bombeiro ou agente penitenciário — garante a ordem, protege cidadãos e atua na prevenção e investigação de crimes. No Piauí, a Polícia Militar, a Polícia Civil e o Corpo de Bombeiros realizam concursos com regularidade, oferecendo salários iniciais competitivos, estabilidade, plano de carreira e aposentadoria. A carreira exige preparo físico, psicológico e intelectual, pois o candidato passa por rigorosas fases de seleção incluindo prova escrita, teste físico e investigação social. Para jovens que valorizam servir à comunidade, têm disciplina e buscam estabilidade financeira, é uma excelente porta de entrada no serviço público.',
  'high_school',
  '{"min": 3500, "max": 9000}',
  'stable',
  ARRAY['preparo físico', 'legislação penal', 'trabalho em equipe', 'tomada de decisão sob pressão', 'ética e disciplina'],
  'https://www.youtube.com/results?search_query=concurso+policia+seguranca+publica+brasil'
);

-- ── Verificar inserção ────────────────────────────────────────
SELECT COUNT(*) AS total_professions FROM professions;
