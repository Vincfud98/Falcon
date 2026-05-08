/* ════════════════════════════════════════════════════════════════════
   UBIQUE SHARED STORE
   Camada de dados compartilhada entre admin.html e index.html.
   Persistência: localStorage (chave única) — sincroniza entre abas
   automaticamente via 'storage' event.
   ════════════════════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  const STORE_KEY = 'ubique.store.v2';   // bump → reseed automático
  const CHANNEL_NAME = 'ubique-store';

  // Limpa a versão antiga (v1) se existir, evita conflito de dados parciais
  try{ localStorage.removeItem('ubique.store.v1'); }catch(_){}

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
    chapters: [],
    units: [],
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
    subjects:  makeCRUD('subjects',  'number'),
    topics:    makeCRUD('topics',    'string'),
    tags:      makeCRUD('tags',      'string'),
    modules:   makeCRUD('modules',   'number'),
    chapters:  makeCRUD('chapters',  'number'),
    units:     makeCRUD('units',     'number'),

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
