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
    organizacoes: [],      // empresas que oferecem cursos (catalogo.organizacoes, SQL 92)
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
  let _seqId = 0;   // contador dos ids gerados (ver add)
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
            // Date.now() sozinho repetia dentro do mesmo milissegundo (o diretório de
            // perfis adiciona centenas num laço): ids iguais, e o update seguinte caía
            // no item errado. O contador garante um id por item.
            id = (data.slug || data.title || 'item-') + '-' + Date.now() + '-' + (++_seqId);
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
    organizacoes:   makeCRUD('organizacoes',   'string'),
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

/* ═══════════════════════════════════════════════════════════════════════
   Avisos no celular e no computador (web push · Sala dos professores, etapa 5,
   SQL 145). Usado pela Conta (app do aluno) e pelo Meu perfil (Sala). Cada
   aparelho que a pessoa ativa vira uma inscrição no servidor; todo aviso novo
   do sino chega também como notificação do aparelho (sw.js mostra e abre).
   No iPhone só funciona com a Falcon na Tela de Início (exigência da Apple).
   ═══════════════════════════════════════════════════════════════════════ */
(function(global){
  'use strict';
  function suporta(){ return 'serviceWorker' in navigator && 'PushManager' in global && 'Notification' in global; }
  function ehIOS(){ return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function instalado(){ return !!((global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true); }
  function bytes(b64){
    const s = String(b64 || '').replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(s + '='.repeat((4 - s.length % 4) % 4));
    const out = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function aparelho(){
    const ua = navigator.userAgent;
    const so = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'outro';
    const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'navegador';
    return nav + ' · ' + so;
  }
  async function registro(){
    let r = await navigator.serviceWorker.getRegistration();
    if(!r) r = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
    return r;
  }
  async function inscricao(){
    if(!suporta()) return null;
    const r = await navigator.serviceWorker.getRegistration();
    return r ? r.pushManager.getSubscription() : null;
  }
  async function estado(){
    if(!suporta()) return { suporta: false, ios: ehIOS(), instalado: instalado() };
    const s = await inscricao();
    return { suporta: true, permissao: Notification.permission, ativo: !!s, ios: ehIOS(), instalado: instalado() };
  }
  async function ativar(){
    if(!suporta()) throw new Error('sem_suporte');
    const perm = await Notification.requestPermission();
    if(perm !== 'granted') throw new Error('sem_permissao');
    const r = await registro();
    const sb = global._sb;
    let chave = (await sb.schema('aluno').rpc('push_chave_publica')).data;
    if(!chave){ const f = await sb.functions.invoke('enviar-push', { body: {} }); chave = f && f.data && f.data.publica; }
    if(!chave) throw new Error('sem_chave');
    let s = await r.pushManager.getSubscription();
    if(!s) s = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(chave) });
    const j = s.toJSON();
    const res = await sb.schema('aluno').rpc('push_inscrever', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_aparelho: aparelho() });
    if(res.error) throw new Error(res.error.message);
    return true;
  }
  async function desativar(){
    const s = await inscricao();
    if(!s) return;
    try{ await global._sb.schema('aluno').rpc('push_cancelar', { p_endpoint: s.endpoint }); }catch(_){}
    await s.unsubscribe();
  }
  // aviso de teste: entra no sino da própria pessoa e, com o aparelho ativado, chega no aparelho
  async function testar(){
    const sb = global._sb;
    const u = (await sb.auth.getUser()).data.user;
    if(!u) throw new Error('sem_sessao');
    const id = (global.crypto && crypto.randomUUID) ? crypto.randomUUID() : null;
    const r = await sb.schema('aluno').from('notifications').insert({ id: id, user_id: u.id, type: 'teste_push', read: false,
      payload: { text_excerpt: 'Os avisos no celular estão funcionando.' } });
    if(r.error) throw new Error(r.error.message);
  }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // desenha o quadro (texto + botões) dentro de box; o: { btn: 'classe do botão principal', btnGhost: 'classe do secundário' }
  async function pintar(box, o){
    if(!box) return;
    o = o || {};
    const B = o.btn || 'btn', G = o.btnGhost || 'btn-ghost';
    const e = await estado();
    let txt = '', botoes = '';
    if(!e.suporta){
      txt = e.ios && !e.instalado
        ? 'No iPhone, os avisos só chegam com a Falcon na Tela de Início: no Safari, toque em Compartilhar e em "Adicionar à Tela de Início"; depois abra a Falcon por lá e ative aqui.'
        : 'Este navegador não recebe avisos. Use o Chrome, o Edge, o Firefox ou o Safari atualizados.';
    } else if(e.permissao === 'denied'){
      txt = 'Os avisos estão bloqueados neste navegador. Libere nas permissões do site (o cadeado ao lado do endereço) e volte aqui.';
    } else if(e.ativo){
      txt = 'Ativos neste aparelho: o que chega no sino aparece também como aviso do aparelho.';
      botoes = '<button type="button" class="' + esc(G) + '" data-push="testar">Mandar um aviso de teste</button><button type="button" class="' + esc(G) + '" data-push="desativar">Desativar neste aparelho</button>';
    } else {
      txt = 'Receba no celular ou no computador o que chega no sino: respostas, menções, dúvidas e avisos da equipe.';
      botoes = '<button type="button" class="' + esc(B) + '" data-push="ativar">Ativar avisos neste aparelho</button>';
    }
    box.innerHTML = '<p class="push-txt" style="margin:0 0 .6rem;font-size:.86rem;line-height:1.6;opacity:.85">' + esc(txt) + '</p>'
      + (botoes ? '<div class="push-acoes" style="display:flex;gap:.5rem;flex-wrap:wrap">' + botoes + '</div>' : '')
      + '<p class="push-msg" data-push-msg style="margin:.5rem 0 0;font-size:.8rem;opacity:.8"></p>';
    if(box.__pushLigado) return;
    box.__pushLigado = true;
    box.addEventListener('click', async function(ev){
      const b = ev.target.closest('[data-push]'); if(!b) return;
      const acao = b.getAttribute('data-push');
      const msg = function(t){ const m = box.querySelector('[data-push-msg]'); if(m) m.textContent = t; };
      b.disabled = true;
      try{
        if(acao === 'ativar'){ await ativar(); await pintar(box, o); msg('Pronto. Toque em "Mandar um aviso de teste" para conferir.'); return; }
        if(acao === 'desativar'){ await desativar(); await pintar(box, o); msg('Desativado neste aparelho.'); return; }
        if(acao === 'testar'){ await testar(); msg('Aviso de teste enviado. Deve chegar em alguns segundos.'); }
      }catch(err){
        const m = String((err && err.message) || err);
        msg(m === 'sem_permissao' ? 'Sem permissão: o navegador não deixou mostrar avisos.' : m === 'sem_suporte' ? 'Este navegador não recebe avisos.' : 'Não deu certo agora: ' + m);
      }finally{ b.disabled = false; }
    });
  }
  global.FalconPush = { suporta: suporta, estado: estado, ativar: ativar, desativar: desativar, testar: testar, pintar: pintar };
})(typeof window !== 'undefined' ? window : this);
