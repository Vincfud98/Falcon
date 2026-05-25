/* ════════════════════════════════════════════════════════════════════
   UBIQUE SHARED STORE
   Camada de dados compartilhada entre admin.html e index.html.
   Persistência: localStorage (chave única) — sincroniza entre abas
   automaticamente via 'storage' event.
   ════════════════════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  const STORE_KEY = 'ubique.store.v6';   // bump → reseed automático (v6: adiciona entidade verbetes)
  const CHANNEL_NAME = 'ubique-store';

  // Limpa as versões antigas pra evitar dados parciais
  try{ localStorage.removeItem('ubique.store.v1'); }catch(_){}
  try{ localStorage.removeItem('ubique.store.v2'); }catch(_){}
  try{ localStorage.removeItem('ubique.store.v3'); }catch(_){}
  try{ localStorage.removeItem('ubique.store.v4'); }catch(_){}
  try{ localStorage.removeItem('ubique.store.v5'); }catch(_){}

  // ── SEED — dados mock iniciais (vêm do index.html original).
  // Usados apenas na primeira vez que o store é carregado.
  const SEED = {
    subjects: [
      { id: 1, subject: 'História do Brasil', sigla: 'HB',
        description: 'Curso preparatório · Módulos integrados sobre a formação do Brasil.',
        cover: 'https://images.unsplash.com/photo-1580501170888-80668882ca0c?w=1600&q=80',
        slug: 'historia-brasil',
        coordinator: 'Prof. Dr. Laura de Mello e Souza',
        coordinatorPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
        tier: 'full', status: 'published',
        rating: 4.8, totalHours: 42, quizCount: 29, essayCount: 4, videoCount: 12 },
      { id: 2, subject: 'Geografia', sigla: 'GEO',
        description: 'Aspectos físicos e humanos da geografia mundial com foco em geopolítica contemporânea, recursos naturais e dinâmicas urbanas.',
        cover: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
        slug: 'geografia',
        coordinator: 'Prof. Dr. Milton Santos',
        coordinatorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
        tier: 'premium', status: 'coming-soon',
        rating: 4.6, totalHours: 38, quizCount: 45, essayCount: 6, videoCount: 18 },
      { id: 3, subject: 'Política Internacional', sigla: 'PI',
        description: 'Teorias de RI, organizações multilaterais, política externa brasileira e temas contemporâneos da agenda internacional.',
        cover: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80',
        slug: 'politica-internacional',
        coordinator: 'Prof. Dr. Celso Lafer',
        coordinatorPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
        tier: 'full', status: 'coming-soon',
        rating: 4.9, totalHours: 52, quizCount: 60, essayCount: 8, videoCount: 24 },
      { id: 4, subject: 'Direito Interno', sigla: 'DI',
        description: 'Fundamentos do ordenamento jurídico brasileiro: Constituição, controle de constitucionalidade, direito administrativo e processual.',
        cover: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80',
        slug: 'direito-interno',
        coordinator: 'Prof. Dr. Luís Roberto Barroso',
        coordinatorPhoto: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80',
        status: 'coming-soon',
        rating: 4.7, totalHours: 48, quizCount: 55, essayCount: 5, videoCount: 20 },
      { id: 5, subject: 'Direito Internacional Público', sigla: 'DIP',
        description: 'Fontes do DIP, solução pacífica de controvérsias, proteção internacional dos direitos humanos e direito do mar.',
        cover: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800&q=80',
        slug: 'direito-internacional-publico',
        coordinator: 'Prof. Dr. Antônio Cançado Trindade',
        coordinatorPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
        status: 'coming-soon',
        rating: 4.8, totalHours: 44, quizCount: 50, essayCount: 7, videoCount: 22 },
      { id: 6, subject: 'Economia', sigla: 'ECO',
        description: 'Teoria microeconômica, macroeconomia aberta, comércio internacional, finanças públicas e economia do desenvolvimento.',
        cover: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
        slug: 'economia',
        coordinator: 'Prof. Dr. Edmar Bacha',
        coordinatorPhoto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80',
        status: 'coming-soon',
        rating: 4.5, totalHours: 46, quizCount: 40, essayCount: 4, videoCount: 16 },
      { id: 7, subject: 'História Mundial', sigla: 'HM',
        description: 'Processos históricos globais da Antiguidade ao séc. XXI, com ênfase nas conexões com a formação do sistema internacional.',
        cover: 'https://images.unsplash.com/photo-1461360370896-922624d12a74?w=800&q=80',
        slug: 'historia-mundial',
        coordinator: 'Prof. Dr. Eric Hobsbawm',
        coordinatorPhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80',
        status: 'coming-soon',
        rating: 4.7, totalHours: 56, quizCount: 65, essayCount: 8, videoCount: 28 },
      { id: 8, subject: 'Língua Portuguesa', sigla: 'LP',
        description: 'Domínio da norma culta, técnicas de redação discursiva, interpretação de textos e correspondência oficial.',
        cover: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&q=80',
        slug: 'lingua-portuguesa',
        coordinator: 'Prof. Dr. Celso Cunha',
        coordinatorPhoto: 'https://images.unsplash.com/photo-1537511446984-935f663eb1f4?w=200&q=80',
        status: 'coming-soon',
        rating: 4.6, totalHours: 36, quizCount: 35, essayCount: 10, videoCount: 14 },
      { id: 9, subject: 'Língua Inglesa', sigla: 'EN',
        description: 'Compreensão e produção de textos em inglês com foco em documentos diplomáticos, tradução e versão.',
        cover: 'https://images.unsplash.com/photo-1543109740-4bdb38fda756?w=800&q=80',
        slug: 'lingua-inglesa',
        coordinator: 'Prof. Dr. David Crystal',
        coordinatorPhoto: 'https://images.unsplash.com/photo-1480429370612-2cd349ecaa9f?w=200&q=80',
        status: 'coming-soon',
        rating: 4.4, totalHours: 34, quizCount: 30, essayCount: 6, videoCount: 15 },
      { id:10, subject: 'Língua Francesa', sigla: 'FR',
        description: 'Francês aplicado à diplomacia: textos oficiais, correspondência, tradução jurídica e redação.',
        cover: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
        slug: 'lingua-francesa',
        coordinator: 'Prof. Dr. Claude Hagège',
        coordinatorPhoto: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&q=80',
        status: 'coming-soon',
        rating: 4.3, totalHours: 32, quizCount: 25, essayCount: 5, videoCount: 13 },
      { id:11, subject: 'Língua Espanhola', sigla: 'ES',
        description: 'Espanhol voltado para relações internacionais: documentos, discursos diplomáticos e tradução.',
        cover: 'https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80',
        slug: 'lingua-espanhola',
        coordinator: 'Prof. Dr. Manuel Seco',
        coordinatorPhoto: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=200&q=80',
        status: 'coming-soon',
        rating: 4.3, totalHours: 30, quizCount: 20, essayCount: 4, videoCount: 10 },
    ],
    topics: [],
    tags: [
      { id: 'tg_cacd', slug: 'cacd', label: 'CACD', description: 'Concurso de Admissão à Carreira de Diplomata' },
    ],
    modules: [],
    // ── HIERARQUIA MOCKADA (História do Brasil) ──
    // Embutida aqui para que QUALQUER página (admin ou aluno) tenha
    // a estrutura disponível desde o primeiro boot, sem depender
    // de window.COURSE no index.html.
    modules: [
      { id: 1, subject_id: 1, title: 'Brasil Colônia', number: 'I',
        subtitle: '1500–1822',
        description: 'Das primeiras expedições até a independência: administração, economia e sociedade colonial.',
        cover_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&q=80',
        status: 'published', position: 0, _origMockId: 'm1' },
      { id: 2, subject_id: 1, title: 'Brasil Império', number: 'II',
        subtitle: '1822–1889',
        description: 'Da independência à Proclamação da República, passando pelo Primeiro e Segundo Reinados.',
        cover_url: 'https://images.unsplash.com/photo-1564506276493-0b2bee2b9b8e?w=1200&q=80',
        status: 'published', position: 1, _origMockId: 'm2' },
    ],
    chapters: [
      { id: 1, module_id: 1, title: 'Descobrimento e início da colonização', number: '1',
        description: 'Primeiras expedições, encontros culturais e o estabelecimento do governo-geral.',
        status: 'published', position: 0, _origMockId: 'c1' },
      { id: 2, module_id: 1, title: 'Economia colonial', number: '2',
        description: 'Açúcar, mineração, escravidão e o pacto colonial.',
        status: 'published', position: 1, _origMockId: 'c2' },
      { id: 3, module_id: 2, title: 'Primeiro Reinado e Regência', number: '1',
        description: 'D. Pedro I, abdicação e o período regencial.',
        status: 'published', position: 0, _origMockId: 'c3' },
      { id: 4, module_id: 2, title: 'Segundo Reinado', number: '2',
        description: 'D. Pedro II, café, ferrovias e o fim da escravidão.',
        status: 'published', position: 1, _origMockId: 'c4' },
    ],
    units: [
      // Brasil Colônia · Descobrimento
      { id: 1, chapter_id: 1, title: 'A Chegada', number: '01',
        subtitle: '1500 — Cabral e o primeiro contato',
        description: 'A expedição de Pedro Álvares Cabral, a Carta de Caminha e o encontro com os povos originários.',
        cover_url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80',
        duration_min: 45, status: 'published', position: 0, _origMockId: 'u1' },
      { id: 2, chapter_id: 1, title: 'Capitanias e Governo-Geral', number: '02',
        subtitle: '1534-1549 — organização administrativa',
        description: 'Capitanias hereditárias, Tomé de Sousa e a centralização administrativa.',
        cover_url: 'https://images.unsplash.com/photo-1588417889551-3a3e3d6f0a82?w=800&q=80',
        duration_min: 40, status: 'published', position: 1, _origMockId: 'u2' },
      // Brasil Colônia · Economia
      { id: 3, chapter_id: 2, title: 'O Açúcar', number: '03',
        subtitle: '1550-1650 — o primeiro ciclo econômico',
        description: 'Engenhos, plantation, mão-de-obra escravizada e o Nordeste açucareiro.',
        cover_url: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&q=80',
        duration_min: 50, status: 'published', position: 0, _origMockId: 'u3' },
      { id: 4, chapter_id: 2, title: 'A Mineração', number: '04',
        subtitle: '1693-1789 — ouro, diamantes e Inconfidência',
        description: 'Bandeirantes, Minas Gerais, vilas auríferas e a Inconfidência Mineira.',
        cover_url: 'https://images.unsplash.com/photo-1602080858428-57174f9431cf?w=800&q=80',
        duration_min: 45, status: 'published', position: 1, _origMockId: 'u4' },
      // Brasil Império · Primeiro Reinado
      { id: 5, chapter_id: 3, title: 'Independência e Primeiro Reinado', number: '01',
        subtitle: '1822-1831 — D. Pedro I e a construção do Estado',
        description: 'Grito do Ipiranga, Constituição de 1824, Confederação do Equador e abdicação.',
        cover_url: 'https://images.unsplash.com/photo-1604782206219-3b9576575203?w=800&q=80',
        duration_min: 48, status: 'published', position: 0, _origMockId: 'u5' },
      { id: 6, chapter_id: 3, title: 'O Período Regencial', number: '02',
        subtitle: '1831-1840 — disputas e revoltas provinciais',
        description: 'Cabanagem, Sabinada, Balaiada, Farroupilha — o Brasil sem rei.',
        cover_url: 'https://images.unsplash.com/photo-1570215171323-4ec328f3f5fa?w=800&q=80',
        duration_min: 42, status: 'published', position: 1, _origMockId: 'u6' },
      // Brasil Império · Segundo Reinado
      { id: 7, chapter_id: 4, title: 'Café e Modernização', number: '03',
        subtitle: '1840-1870 — economia cafeeira e ferrovias',
        description: 'Vale do Paraíba, Oeste Paulista, infraestrutura e migração.',
        cover_url: 'https://images.unsplash.com/photo-1442550528053-c431ecb55509?w=800&q=80',
        duration_min: 45, status: 'published', position: 0, _origMockId: 'u7' },
      { id: 8, chapter_id: 4, title: 'Abolição e Queda do Império', number: '04',
        subtitle: '1850-1889 — Lei Áurea e Proclamação da República',
        description: 'Leis abolicionistas, Guerra do Paraguai, questão religiosa e republicana.',
        cover_url: 'https://images.unsplash.com/photo-1583416750470-965b2707b355?w=800&q=80',
        duration_min: 50, status: 'published', position: 1, _origMockId: 'u8' },
    ],
    unit_sections: [
      // A Chegada (id=1) — duas seções pedagógicas
      { id: 1, unit_id: 1, title: 'O Atlântico', position: 0 },
      { id: 2, unit_id: 1, title: 'O encontro', position: 1 },
      // Outras unidades — uma seção default cada
      { id: 3, unit_id: 2, title: 'Seção 1', position: 0 },
      { id: 4, unit_id: 3, title: 'Seção 1', position: 0 },
      { id: 5, unit_id: 4, title: 'Seção 1', position: 0 },
      { id: 6, unit_id: 5, title: 'Seção 1', position: 0 },
      { id: 7, unit_id: 6, title: 'Seção 1', position: 0 },
      { id: 8, unit_id: 7, title: 'Seção 1', position: 0 },
      { id: 9, unit_id: 8, title: 'Seção 1', position: 0 },
    ],
    unit_blocks: [],     // blocos de aprendizagem dentro de cada unidade (campo section_id, nullable)
    unit_downloads: [],  // PDFs / arquivos anexos a unidades
    questions: [],              // pool de questões objetivas
    question_groups: [],        // agrupamento (group 15 / 2023 prova)
    essays: [],                 // pool de discursivas
    platform_access: [], // Portaria — e-mails autorizados a acessar o aluno
    // ── EDITAL ──
    // Schema (Fase 6 V4):
    //   editais.exam_id        → FK pra exams.id (ex.: 'cacd'). Liga o
    //                            edital ao concurso cadastrado na plataforma.
    //   edital_topics.subject_id → FK pra subjects.id (só faz sentido em
    //                            tópicos top-level, parent_id=null). Liga
    //                            o tópico nível-0 à matéria interna.
    //   edital_topics.alias    → string opcional. Apelido/taxonomia do tema
    //                            do edital. Aparece ao lado do title.
    //   (Vínculo unidade↔tópico continua via edital_topic_units.)
    editais: [
      { id: 1, name: 'CACD 2026', year: 2026, slug: 'cacd-2026',
        exam_id: 'cacd',
        description: 'Concurso de Admissão à Carreira de Diplomata — edital 2026',
        status: 'published', created_at: new Date().toISOString() }
    ],
    edital_topics: [
      // 1 — Política Internacional (top-level, vincula à matéria "Política Internacional")
      { id:1, edital_id:1, parent_id:null, code:'1', title:'Política Internacional',
        subject_id:3, alias:'',
        description:'Teorias, atores e dinâmicas das relações internacionais', position:0 },
      { id:2, edital_id:1, parent_id:1, code:'1.1', title:'Teorias de RI',
        alias:'',
        description:'Realismo, liberalismo, construtivismo', position:0 },
      { id:3, edital_id:1, parent_id:2, code:'1.1.1', title:'Realismo clássico',
        alias:'',
        description:'Hans Morgenthau e o conceito de poder', position:0 },
      { id:4, edital_id:1, parent_id:2, code:'1.1.2', title:'Liberalismo institucional',
        alias:'',
        description:'Keohane, Nye e a interdependência complexa', position:1 },
      { id:5, edital_id:1, parent_id:1, code:'1.2', title:'Política Externa Brasileira',
        alias:'PEB',
        description:'PEB do Império aos dias atuais', position:1 },
      // 2 — História do Brasil (top-level, vincula à matéria "História do Brasil")
      { id:6, edital_id:1, parent_id:null, code:'2', title:'História do Brasil',
        subject_id:1, alias:'',
        description:'Da colonização ao período republicano', position:1 },
      { id:7, edital_id:1, parent_id:6, code:'2.1', title:'Brasil Colônia',
        alias:'Período Colonial',
        description:'1500–1822', position:0 },
      { id:8, edital_id:1, parent_id:6, code:'2.2', title:'Brasil Império',
        alias:'',
        description:'1822–1889', position:1 },
    ],
    edital_topic_units: [
      // exemplo de vinculação: tópico 2.1 → unidade A Chegada (id 1)
      { id:1, topic_id:7, unit_id:1 },
    ],
    edital_progress: [
      // por usuário; vazio inicialmente
    ],
    verbetes: [],
    // Glossário (Y3 Fase Q): banco central de termos lexicais, separado de
    // `verbetes` (que serve aos tooltips de LB texto). Cada entrada tem
    // term (HTML), subject_ids[] (interdisciplinar — pode pertencer a +1
    // matéria), class_id, definitions[] (cada uma com html + examples[]) e
    // callout (HTML opcional).
    glossary_terms: [],
    // Concursos (espelho local pra filtros do glossário em ambos os lados —
    // o cache Supabase do admin existe à parte e edita esses mesmos ids).
    exams: [
      { id:'cacd',     name:'CACD',     long_name:'Concurso de Admissão à Carreira de Diplomata' },
      { id:'enem',     name:'ENEM',     long_name:'Exame Nacional do Ensino Médio' },
      { id:'oab',      name:'OAB',      long_name:'Exame da Ordem dos Advogados' },
      { id:'usp',      name:'USP / FUVEST' },
      { id:'unicamp',  name:'UNICAMP' },
      { id:'ita',      name:'ITA' },
      { id:'ime',      name:'IME' }
    ],
    // Relação concurso ↔ matéria. Quando vazio para um concurso, o filtro
    // exibe TODAS as matérias (degradação graciosa — admin popula via UI
    // de Concursos quando quiser refinar).
    exam_subjects: [],
    // Fase 2 — perfis de usuário (editáveis pelo aluno na página /conta).
    // Key por user_id (do AUTH_USERS / Auth.getUser()). Schema:
    //   { id, user_id, displayName, nickname, handle, bio,
    //     photoUrl, photoTransform: { x, y, zoom },
    //     created_at, updated_at }
    user_profiles: [],
    // Categorias de avatares (admin cria) — { id, name, position }
    avatar_categories: [],
    // Avatares do banco (admin cadastra) — usuário escolhe na /conta.
    //   { id, category_id, url, name, transform: { x, y, zoom } }
    avatars: [],
    // Fase 2.3 — Notificações (menções, pedidos de seguir, aceites)
    //   { id, user_id (destinatário), type, payload, read, created_at }
    //   type: 'mention' | 'follow_request' | 'follow_accepted'
    notifications: [],
    // Fase 2.3 — Relações de seguir entre usuários.
    //   { id, follower_id, following_id, status, created_at, responded_at }
    //   status: 'pending' | 'accepted' | 'declined'
    follows: [],
    // Classes gramaticais — admin pode criar mais. Defaults universais:
    glossary_word_classes: [
      { id:'substantivo',  name:'Substantivo' },
      { id:'verbo',        name:'Verbo' },
      { id:'adjetivo',     name:'Adjetivo' },
      { id:'adverbio',     name:'Advérbio' },
      { id:'pronome',      name:'Pronome' },
      { id:'preposicao',   name:'Preposição' },
      { id:'conjuncao',    name:'Conjunção' },
      { id:'locucao',      name:'Locução' },
      { id:'expressao',    name:'Expressão' },
      { id:'sigla',        name:'Sigla / Acrônimo' },
      { id:'nome-proprio', name:'Nome próprio' }
    ],
    // Versionamento da estrutura — incrementado em alterações de schema
    _meta: { version: 1, lastSync: Date.now() }
  };

  // ── INTERNAL STATE ──
  let _state = null;
  const _listeners = new Set();
  let _bc = null;

  function deepClone(obj){
    return JSON.parse(JSON.stringify(obj));
  }

  function loadFromStorage(){
    try{
      const raw = localStorage.getItem(STORE_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        // Merge SEED's keys com state existente — garante que entidades novas
        // adicionadas ao SEED apareçam mesmo em stores antigos.
        const merged = deepClone(SEED);
        Object.keys(merged).forEach(k => {
          if(k === '_meta') return;
          if(Array.isArray(parsed[k])) merged[k] = parsed[k];
        });
        if(parsed._meta) merged._meta = parsed._meta;
        return merged;
      }
    }catch(e){
      console.warn('[UbiqueStore] erro ao carregar storage:', e);
    }
    return deepClone(SEED);
  }

  function persist(){
    try{
      _state._meta = _state._meta || {};
      _state._meta.lastSync = Date.now();
      localStorage.setItem(STORE_KEY, JSON.stringify(_state));
    }catch(e){
      console.warn('[UbiqueStore] erro ao persistir:', e);
    }
  }

  function emit(eventName, payload){
    // Notifica listeners locais
    _listeners.forEach(cb => {
      try{ cb({ type: eventName, payload, state: _state }); }
      catch(e){ console.warn('[UbiqueStore] listener error:', e); }
    });
    // Notifica outras abas
    if(_bc){
      try{ _bc.postMessage({ type: eventName, payload, ts: Date.now() }); }catch(_){}
    }
  }

  function reload(){
    _state = loadFromStorage();
    _listeners.forEach(cb => {
      try{ cb({ type: 'sync', payload: null, state: _state }); }catch(_){}
    });
  }

  // ── INIT ──
  _state = loadFromStorage();

  // Cross-tab sync via 'storage' event
  if(typeof window !== 'undefined'){
    window.addEventListener('storage', e => {
      if(e.key !== STORE_KEY) return;
      _state = loadFromStorage();
      _listeners.forEach(cb => {
        try{ cb({ type: 'sync', payload: null, state: _state }); }catch(_){}
      });
    });
  }

  // BroadcastChannel adicional (mais rápido que storage event)
  try{
    if(typeof BroadcastChannel !== 'undefined'){
      _bc = new BroadcastChannel(CHANNEL_NAME);
      _bc.onmessage = (msg) => {
        if(!msg || !msg.data) return;
        // Recarrega state e notifica
        _state = loadFromStorage();
        _listeners.forEach(cb => {
          try{ cb({ type: 'sync', payload: msg.data, state: _state }); }catch(_){}
        });
      };
    }
  }catch(_){}

  // ── CRUD FACTORY ──
  function makeCRUD(entity, idType){
    return {
      list(){
        return deepClone(_state[entity] || []);
      },
      get(id){
        return deepClone((_state[entity] || []).find(x => x.id === id || String(x.id) === String(id)) || null);
      },
      add(data){
        let id = data.id;
        if(!id){
          if(idType === 'string'){
            id = (data.slug || data.title || 'item-') + '-' + Date.now();
          }else{
            const ids = (_state[entity] || []).map(x => Number(x.id) || 0);
            id = (ids.length ? Math.max(...ids) : 0) + 1;
          }
        }
        const item = Object.assign({ id }, data, { id });
        _state[entity] = _state[entity] || [];
        _state[entity].push(item);
        persist();
        emit(entity + ':add', item);
        return deepClone(item);
      },
      update(id, patch){
        const arr = _state[entity] || [];
        const idx = arr.findIndex(x => x.id === id || String(x.id) === String(id));
        if(idx < 0) return null;
        arr[idx] = Object.assign({}, arr[idx], patch, { id: arr[idx].id });
        persist();
        emit(entity + ':update', arr[idx]);
        return deepClone(arr[idx]);
      },
      remove(id){
        const arr = _state[entity] || [];
        const before = arr.length;
        _state[entity] = arr.filter(x => x.id !== id && String(x.id) !== String(id));
        if(_state[entity].length === before) return false;
        persist();
        emit(entity + ':remove', { id });
        return true;
      },
      replaceAll(items){
        _state[entity] = Array.isArray(items) ? deepClone(items) : [];
        persist();
        emit(entity + ':replace', _state[entity]);
      }
    };
  }

  // ── PUBLIC API ──
  const Store = {
    subjects:       makeCRUD('subjects',       'number'),
    topics:         makeCRUD('topics',         'string'),
    tags:           makeCRUD('tags',           'string'),
    modules:        makeCRUD('modules',        'number'),
    chapters:       makeCRUD('chapters',       'number'),
    units:          makeCRUD('units',          'number'),
    unit_blocks:    makeCRUD('unit_blocks',    'number'),
    unit_sections:  makeCRUD('unit_sections',  'number'),
    unit_downloads: makeCRUD('unit_downloads', 'number'),
    questions:       makeCRUD('questions',       'number'),
    question_groups: makeCRUD('question_groups', 'number'),
    essays:          makeCRUD('essays',          'number'),
    platform_access: makeCRUD('platform_access', 'number'),
    editais:           makeCRUD('editais',           'number'),
    edital_topics:     makeCRUD('edital_topics',     'number'),
    edital_topic_units: makeCRUD('edital_topic_units','number'),
    edital_progress:   makeCRUD('edital_progress',   'number'),
    verbetes:          makeCRUD('verbetes',          'string'),
    glossary_terms:        makeCRUD('glossary_terms',        'string'),
    glossary_word_classes: makeCRUD('glossary_word_classes', 'string'),
    exams:                 makeCRUD('exams',                 'string'),
    exam_subjects:         makeCRUD('exam_subjects',         'number'),
    // Fase 2 — perfis de usuário + biblioteca de avatares
    user_profiles:         makeCRUD('user_profiles',         'string'),
    avatar_categories:     makeCRUD('avatar_categories',     'string'),
    avatars:               makeCRUD('avatars',               'string'),
    // Fase 2.3 — Notificações e relações de seguir
    notifications:         makeCRUD('notifications',         'string'),
    follows:               makeCRUD('follows',               'string'),

    /**
     * Subscribe to all changes.
     * @param {Function} cb - chamado com { type, payload, state }
     * @returns {Function} unsubscribe
     */
    subscribe(cb){
      _listeners.add(cb);
      return () => _listeners.delete(cb);
    },

    /** Snapshot completo do state (read-only clone). */
    getState(){ return deepClone(_state); },

    /** Recarrega do localStorage (útil após mudanças externas). */
    reload,

    /** Reseta tudo aos valores SEED. */
    reset(){
      _state = deepClone(SEED);
      persist();
      emit('reset', null);
    },

    /** Versão / metadata */
    meta(){ return deepClone(_state._meta || {}); },

    /** Constantes para debug. */
    _STORE_KEY: STORE_KEY,
    _CHANNEL: CHANNEL_NAME,
  };

  global.UbiqueStore = Store;

  // Exposes seed for tooling
  global.UbiqueStore._SEED = deepClone(SEED);

  console.log('[UbiqueStore] pronto · v' + (_state._meta?.version || 1) +
              ' · ' + (_state.subjects||[]).length + ' matérias');

})(typeof window !== 'undefined' ? window : this);
