/* ════════════════════════════════════════════════════════════════════
   UBIQUE SHARED STORE — v2 (pós-migração Supabase)

   Cache em memória + cross-tab broadcast. SEM localStorage. SEM seeds.

   Por quê: Supabase é a fonte da verdade do projeto desde a Fase 4.
   localStorage virou só um espelho com risco de divergência, mais
   atrapalhava debug do que ajudava. Este Store agora é um cache
   compartilhado entre páginas dentro da mesma sessão de browser:
     · admin.html / index.html chamam `_hydrate*FromSupabase()` no boot
       e populam o cache via `replaceAll(...)`.
     · Mutações (add/update/remove) atualizam o cache em memória e
       broadcast via BroadcastChannel pras outras abas — que aplicam
       o diff direto, sem reler nada.
     · Reload da página obriga nova hidratação. Esse é o desenho.

   API pública 100% retrocompatível:
     list, get, add, update, remove, replaceAll, subscribe,
     getState, reload (no-op), reset, meta
   ════════════════════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  const CHANNEL_NAME = 'ubique-store';

  // Schema vazio — DECLARA quais entidades o Store conhece, mas não
  // traz nenhum dado. Hidratação preenche.
  const EMPTY_STATE = {
    subjects: [],
    topics: [],
    tags: [],
    modules: [],
    chapters: [],
    units: [],
    unit_blocks: [],
    unit_sections: [],
    unit_downloads: [],
    questions: [],
    question_groups: [],
    essays: [],
    platform_access: [],
    editais: [],
    edital_topics: [],
    edital_topic_units: [],
    edital_progress: [],
    verbetes: [],
    glossary_terms: [],
    glossary_word_classes: [],
    exams: [],
    exam_subjects: [],
    exam_bancas: [],
    user_profiles: [],
    avatar_categories: [],
    avatars: [],
    notifications: [],
    follows: [],
  };

  // ── State ──
  let _state = JSON.parse(JSON.stringify(EMPTY_STATE));
  const _listeners = new Set();
  let _bc = null;

  function deepClone(obj){
    return JSON.parse(JSON.stringify(obj));
  }

  // ── Emit local + broadcast cross-tab ──
  function emit(eventName, payload){
    _listeners.forEach(cb => {
      try{ cb({ type: eventName, payload, state: _state }); }
      catch(e){ console.warn('[UbiqueStore] listener error:', e); }
    });
    if(_bc){
      try{ _bc.postMessage({ type: eventName, payload, ts: Date.now() }); }catch(_){}
    }
  }

  // ── Aplica diff vindo de outra aba via BroadcastChannel ──
  // Cada mensagem carrega {type, payload}. Em vez de reler localStorage
  // (que não existe mais), reproduzimos a mutação direto no _state.
  function _applyRemoteChange(type, payload){
    if(!type) return;
    if(type === 'reset'){
      _state = JSON.parse(JSON.stringify(EMPTY_STATE));
      return;
    }
    const colonIdx = type.indexOf(':');
    if(colonIdx < 0) return;
    const entity = type.substring(0, colonIdx);
    const action = type.substring(colonIdx + 1);
    if(!Object.prototype.hasOwnProperty.call(_state, entity)) return;

    if(action === 'add' && payload && payload.id != null){
      const arr = _state[entity];
      const idx = arr.findIndex(x => String(x.id) === String(payload.id));
      if(idx < 0) arr.push(deepClone(payload));
      else arr[idx] = deepClone(payload);
    } else if(action === 'update' && payload && payload.id != null){
      const arr = _state[entity];
      const idx = arr.findIndex(x => String(x.id) === String(payload.id));
      if(idx >= 0) arr[idx] = deepClone(payload);
      else arr.push(deepClone(payload)); // ainda não conhecia → adiciona
    } else if(action === 'remove' && payload && payload.id != null){
      _state[entity] = _state[entity].filter(x => String(x.id) !== String(payload.id));
    } else if(action === 'replace' && Array.isArray(payload)){
      _state[entity] = deepClone(payload);
    }
  }

  // ── BroadcastChannel (cross-tab sync) ──
  // Se BC não existe (navegador antigo), simplesmente cada aba fica
  // isolada — é mais raro do que o céu cair em cima da gente.
  try{
    if(typeof BroadcastChannel !== 'undefined'){
      _bc = new BroadcastChannel(CHANNEL_NAME);
      _bc.onmessage = (msg) => {
        if(!msg || !msg.data) return;
        const { type, payload } = msg.data;
        _applyRemoteChange(type, payload);
        _listeners.forEach(cb => {
          try{ cb({ type: type || 'sync', payload, state: _state }); }
          catch(e){ console.warn('[UbiqueStore] listener error:', e); }
        });
      };
    }
  }catch(_){}

  // ── CRUD factory ──
  function makeCRUD(entity, idType){
    return {
      list(){
        return deepClone(_state[entity] || []);
      },
      get(id){
        const arr = _state[entity] || [];
        const found = arr.find(x => x.id === id || String(x.id) === String(id)) || null;
        return found ? deepClone(found) : null;
      },
      add(data){
        let id = data.id;
        if(id == null){
          if(idType === 'uuid'){
            id = (typeof crypto !== 'undefined' && crypto.randomUUID)
              ? crypto.randomUUID()
              : ('uuid-' + Date.now() + '-' + Math.random().toString(36).slice(2,8));
          } else if(idType === 'string'){
            id = (data.slug || data.title || 'item-') + '-' + Date.now();
          } else {
            const ids = (_state[entity] || []).map(x => Number(x.id) || 0);
            id = (ids.length ? Math.max(...ids) : 0) + 1;
          }
        }
        const item = Object.assign({ id }, data, { id });
        _state[entity] = _state[entity] || [];
        _state[entity].push(item);
        emit(entity + ':add', item);
        return deepClone(item);
      },
      update(id, patch){
        const arr = _state[entity] || [];
        const idx = arr.findIndex(x => x.id === id || String(x.id) === String(id));
        if(idx < 0) return null;
        arr[idx] = Object.assign({}, arr[idx], patch, { id: arr[idx].id });
        emit(entity + ':update', arr[idx]);
        return deepClone(arr[idx]);
      },
      remove(id){
        const arr = _state[entity] || [];
        const before = arr.length;
        _state[entity] = arr.filter(x => x.id !== id && String(x.id) !== String(id));
        if(_state[entity].length === before) return false;
        emit(entity + ':remove', { id });
        return true;
      },
      replaceAll(items){
        _state[entity] = Array.isArray(items) ? deepClone(items) : [];
        emit(entity + ':replace', _state[entity]);
      }
    };
  }

  // ── API pública (idTypes preservados pra compat de id gen) ──
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
    questions:        makeCRUD('questions',        'number'),
    question_groups:  makeCRUD('question_groups',  'number'),
    essays:           makeCRUD('essays',           'number'),
    platform_access:  makeCRUD('platform_access',  'number'),
    editais:            makeCRUD('editais',            'uuid'),
    edital_topics:      makeCRUD('edital_topics',      'uuid'),
    edital_topic_units: makeCRUD('edital_topic_units', 'uuid'),
    edital_progress:    makeCRUD('edital_progress',    'number'),
    verbetes:           makeCRUD('verbetes',           'string'),
    glossary_terms:        makeCRUD('glossary_terms',        'string'),
    glossary_word_classes: makeCRUD('glossary_word_classes', 'string'),
    exams:                 makeCRUD('exams',                 'string'),
    exam_subjects:         makeCRUD('exam_subjects',         'number'),
    exam_bancas:           makeCRUD('exam_bancas',           'number'),
    user_profiles:         makeCRUD('user_profiles',         'string'),
    avatar_categories:     makeCRUD('avatar_categories',     'string'),
    avatars:               makeCRUD('avatars',               'string'),
    notifications:         makeCRUD('notifications',         'string'),
    follows:               makeCRUD('follows',               'string'),

    /**
     * Inscreve listener pra qualquer mudança no Store.
     * cb recebe { type, payload, state }
     * Retorna função pra desinscrever.
     */
    subscribe(cb){
      _listeners.add(cb);
      return () => _listeners.delete(cb);
    },

    /** Snapshot completo do state (read-only clone). */
    getState(){ return deepClone(_state); },

    /**
     * reload() agora é NO-OP — não há mais localStorage pra reler.
     * Pra atualizar dados, chame `_hydrate*FromSupabase()` da página
     * que está consumindo, ou faça refresh da página inteira.
     */
    reload(){ /* no-op */ },

    /** Zera tudo em memória (útil pra logout / debug). */
    reset(){
      _state = JSON.parse(JSON.stringify(EMPTY_STATE));
      emit('reset', null);
    },

    /** Metadata pra debug. */
    meta(){ return { version: 'in-memory-v1', persistence: 'none' }; },

    _CHANNEL: CHANNEL_NAME,
  };

  global.UbiqueStore = Store;

  console.log('[UbiqueStore] pronto · in-memory · aguardando hidratação do Supabase');

})(typeof window !== 'undefined' ? window : this);
