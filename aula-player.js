/* ============================================================================
   Falcon · Aula em slides · painel da unidade + player (Fase 4)
   - window.AulasUnidade: botão "Aula em slides" na unidade → painel com a
     lista das aulas do aluno nesta unidade e a caixa "Gerar aula" (tipo,
     seção, pedido especial, voz, preço em ⓤ). A cobrança acontece no servidor
     (aluno.pedir_aula, via Edge Function gerar-aula).
   - window.AulaPlayer: player em tela cheia = slides da Fase 2 (AulaSlides)
     + narração da Fase 3: um áudio por slide, linha do tempo da aula inteira,
     velocidades do LBAudio (sem distorcer a voz), legenda por palavra,
     marca-texto acendendo no instante da fala, modo visual, teclado,
     retoma de onde parou.
   Depende de: window._sb (supabase-js), window.AulaSlides (aula-slides.js),
   UbiqueStore (seções e blocos da unidade), Auth.getUser, ueToast, Util.
   ========================================================================== */
(function (root) {
  'use strict';
  if (!root || root.AulaPlayer) return;

  var RATES = [1, 1.25, 1.5, 1.75, 2];   // as mesmas do áudio da leitura (LBAudio)
  var LOGO = '<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,600) scale(0.1,-0.1)" fill="currentColor" stroke="none"><path d="M1805 4190 l-1190 -1190 1193 -1192 1192 -1193 1192 1192 1193 1193 -1190 1190 c-654 654 -1192 1190 -1195 1190 -3 0 -540 -535 -1195 -1190z m1375 875 l175 -175 -178 -178 -177 -177 -177 177 -178 178 175 175 c96 96 177 175 180 175 3 0 84 -79 180 -175z m-390 -390 l175 -175 -695 -698 c-382 -383 -712 -712 -733 -731 l-37 -33 -175 178 -175 179 727 727 c400 401 730 728 733 728 3 0 84 -79 180 -175z m1335 -555 l730 -730 -178 -177 -177 -178 -732 732 -733 733 175 175 c96 96 177 175 180 175 3 0 334 -328 735 -730z m-1215 134 c-33 -87 -117 -312 -187 -499 -70 -187 -127 -341 -128 -343 -1 -1 -188 -72 -416 -158 -228 -86 -454 -171 -504 -190 -49 -19 -94 -34 -100 -34 -5 0 305 315 690 700 385 385 701 696 703 692 1 -5 -25 -81 -58 -168z m1516 -1222 c-2 -2 -75 24 -162 56 -88 33 -305 115 -484 181 -179 67 -336 127 -350 134 -13 7 -30 28 -37 47 -7 19 -88 238 -181 485 -94 248 -173 461 -177 475 -4 15 269 -251 694 -675 385 -384 699 -701 697 -703z m-1227 798 c77 -206 147 -394 156 -416 16 -39 22 -43 113 -79 83 -32 546 -206 804 -301 43 -16 74 -32 70 -36 -4 -4 -128 -52 -277 -107 -148 -54 -349 -129 -445 -166 -96 -37 -190 -72 -209 -78 -42 -14 -33 5 -206 -457 -75 -201 -150 -402 -167 -447 -17 -46 -34 -83 -37 -83 -4 0 -25 51 -49 113 -310 831 -315 844 -328 856 -8 8 -154 63 -851 324 -62 23 -113 44 -113 48 0 4 197 80 438 170 550 205 535 198 549 240 6 19 48 131 93 249 44 118 115 307 157 420 41 113 82 221 90 240 l14 35 29 -75 c16 -41 92 -244 169 -450z m-1906 -648 c92 -93 167 -173 167 -178 0 -10 -334 -347 -348 -351 -4 -2 -86 76 -182 172 l-174 176 174 174 c96 96 179 175 185 175 5 0 85 -76 178 -168z m3777 -7 l175 -175 -178 -177 -177 -178 -175 175 c-96 96 -175 178 -175 183 0 9 341 347 350 347 3 0 84 -79 180 -175z m-3302 -272 c97 -37 323 -121 501 -188 l324 -121 189 -504 c104 -276 187 -506 186 -509 -2 -3 -316 308 -700 692 -383 383 -692 697 -687 697 5 0 89 -30 187 -67z m1966 -632 c-384 -385 -700 -696 -702 -693 -1 4 83 234 187 512 188 497 190 504 223 516 18 7 148 56 288 108 140 52 350 131 465 175 116 44 216 80 224 81 8 0 -301 -315 -685 -699z m-1499 -36 c399 -399 725 -729 725 -733 0 -4 -78 -85 -174 -181 l-174 -173 -732 732 -732 733 173 173 c96 96 177 174 182 174 4 0 333 -326 732 -725z m2445 550 l175 -175 -731 -731 -730 -730 -177 175 c-97 96 -177 176 -177 178 0 7 1453 1458 1459 1458 4 0 85 -79 181 -175z m-1330 -1670 c0 -6 -79 -89 -175 -185 l-175 -175 -176 178 c-135 136 -174 180 -165 190 6 8 85 89 177 181 l167 168 173 -173 c96 -96 174 -178 174 -184z"/><path d="M2865 3409 c-168 -58 -280 -203 -292 -378 -13 -180 86 -345 255 -424 62 -29 75 -31 173 -32 101 0 108 1 180 37 98 49 162 113 207 207 112 234 -9 514 -257 591 -83 26 -187 26 -266 -1z m246 -40 c32 -8 40 -17 71 -81 20 -40 38 -86 42 -101 l7 -28 -103 3 -103 3 -3 99 c-1 55 -1 105 2 112 5 12 11 12 87 -7z m-131 -99 l0 -111 -102 3 c-120 3 -117 -1 -66 110 41 91 58 104 136 107 l32 1 0 -110z m-210 28 c0 -2 -11 -32 -24 -68 -22 -59 -26 -65 -55 -68 -49 -5 -38 28 38 111 20 22 42 35 41 25z m506 -30 c33 -36 74 -92 74 -103 0 -3 -16 -5 -37 -3 -34 3 -37 6 -53 53 -9 28 -20 58 -25 68 -12 27 8 20 41 -15z m-566 -265 l0 -113 -39 0 c-46 0 -51 11 -51 110 0 105 6 115 67 115 23 0 23 -1 23 -112z m268 0 l3 -113 -110 0 -110 0 -7 46 c-7 49 -1 155 11 174 4 7 42 10 108 8 l102 -3 3 -112z m262 91 c11 -28 13 -146 4 -181 -6 -22 -11 -23 -115 -23 l-109 0 0 108 c0 60 3 112 7 115 3 4 51 7 105 7 97 0 99 -1 108 -26z m129 11 c9 -10 20 -109 15 -138 -13 -79 -12 -77 -52 -77 l-38 0 0 113 0 114 35 -4 c19 -2 37 -6 40 -8z m-625 -323 c10 -31 20 -63 23 -70 4 -11 1 -12 -15 -3 -22 12 -92 103 -92 120 0 6 15 11 33 11 30 0 33 -3 51 -58z m236 -52 l0 -110 -30 0 c-59 0 -94 23 -127 86 -17 32 -36 76 -41 97 l-10 37 104 0 104 0 0 -110z m244 83 c-4 -16 -22 -59 -41 -96 -27 -55 -41 -71 -70 -83 -19 -8 -47 -14 -62 -12 l-26 3 -3 108 -3 107 106 0 105 0 -6 -27z m112 -1 c-19 -36 -92 -119 -100 -111 -3 3 4 30 15 60 11 30 22 60 24 67 2 6 20 12 40 12 l36 0 -15 -28z"/></g></svg>';
  var PRESETS = [
    { id: 'resumo',   nome: 'Resumo da unidade', desc: 'A unidade inteira em 10 a 12 minutos, com questões de prova no meio.' },
    { id: 'completa', nome: 'Aula completa',     desc: 'Percorre todo o material, em partes. De 20 a 35 minutos.' },
    { id: 'questoes', nome: 'Só as questões',    desc: 'As questões de prova ligadas à unidade, comentadas uma a uma. De 5 a 10 minutos.' },
    { id: 'secao',    nome: 'Uma seção',         desc: 'Só a seção que você escolher, por completo. De 4 a 8 minutos.' }
  ];
  var ERROS = {
    sem_acesso: 'Você não tem acesso a esta unidade.',
    teto_diario: 'Você já pediu o máximo de aulas de hoje. Amanhã libera de novo.',
    saldo_insuficiente: 'Saldo de UbiTokens insuficiente. Adicione mais na sua Carteira, em Minha Conta.',
    secao_obrigatoria: 'Escolha a seção da aula.',
    secao_invalida: 'Essa seção não pertence a esta unidade.',
    comando_longo: 'O pedido especial pode ter no máximo 600 letras.',
    voz_invalida: 'Essa voz não está disponível.',
    unidade_inexistente: 'Não achei esta unidade no servidor.',
    preset_invalido: 'Tipo de aula inválido.',
    rede: 'Sem conexão com o servidor. Tente de novo.',
    login: 'Sua sessão expirou. Entre de novo e tente outra vez.'
  };
  var SEL_LISTA = 'id,preset,comando,titulo,status,etapa,parte_atual,tentativas,erro,custo_ubt,estornado_em,duracao_estimada_s,created_at,pronta_em,voz_id,secao_id,audio_pronto:roteiro->audio->>pronto,partes:plano->partes';
  var ICO = {
    x: '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    play: '<svg viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>',
    next: '<svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 3 3 9 9 9"/><text x="12" y="15.5" text-anchor="middle" font-size="8" font-family="Outfit,sans-serif" font-weight="500" fill="currentColor" stroke="none">10</text></svg>',
    fwd: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/><text x="12" y="15.5" text-anchor="middle" font-size="8" font-family="Outfit,sans-serif" font-weight="500" fill="currentColor" stroke="none">10</text></svg>',
    replay: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 3 3 9 9 9"/></svg>',
    legenda: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="6" y1="11" x2="12" y2="11"/><line x1="6" y1="15" x2="16" y2="15"/></svg>',
    imagem: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    texto: '<svg viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/></svg>',
    tela: '<svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
    slides: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
  };

  // ─── utilidades ─────────────────────────────────────────────────────────
  function esc(s) { s = String(s == null ? '' : s); return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sb() { return root._sb; }
  function uid() { var u = root.Auth && Auth.getUser && Auth.getUser(); return (u && u.id) || null; }
  function toast(msg, tipo) { if (typeof root.ueToast === 'function') root.ueToast(msg, tipo || 'info'); }
  function unitDbId(unit) { return (root.Util && Util.unitDbId) ? Util.unitDbId(unit) : null; }
  function fmtUbt(v) { var n = Number(v); if (!isFinite(n)) return '?'; return String(Math.round(n * 100) / 100).replace('.', ','); }
  function fmtMin(s) { s = Math.round(Number(s) || 0); if (s < 60) return s + ' s'; var m = Math.round(s / 60); return m + ' min'; }
  function fmtTempo(s) { s = Math.max(0, Math.floor(Number(s) || 0)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function fmtData(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    try { return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (_) { return ''; }
  }
  function presetNome(id) { for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i].nome; return id || ''; }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (_) { return null; } }
  // Chama a Edge Function e devolve sempre um objeto {ok, ...} (nunca lança).
  function invocar(body) {
    if (!sb()) return Promise.resolve({ ok: false, error: 'rede' });
    return sb().functions.invoke('gerar-aula', { body: body }).then(function (r) {
      if (r && r.data) return r.data;
      var e = r && r.error;
      if (e && e.context && typeof e.context.json === 'function') {
        return e.context.json().then(function (j) { return j || { ok: false, error: 'rede' }; }).catch(function () { return { ok: false, error: (e.context.status === 401 ? 'login' : 'rede') }; });
      }
      return { ok: false, error: 'rede' };
    }).catch(function () { return { ok: false, error: 'rede' }; });
  }
  function msgErro(cod, extra) {
    if (cod === 'teto_diario' && extra && extra.teto) return 'Você já pediu ' + extra.teto + ' aulas hoje, que é o máximo por dia. Amanhã libera de novo.';
    return ERROS[cod] || ('Não consegui pedir a aula (' + (cod || 'erro') + ').');
  }
  function estado(a) {
    if (a.status === 'pronta') return { cls: 'pronta', txt: 'Pronta' + (a.duracao_estimada_s ? ' · ' + fmtMin(a.duracao_estimada_s) : '') };
    if (a.status === 'erro') return { cls: 'erro', txt: 'Não deu certo' + (a.estornado_em ? ' · valor devolvido' : '') };
    if (a.status === 'cancelada') return { cls: 'erro', txt: 'Cancelada' };
    var n = Array.isArray(a.partes) ? a.partes.length : 0, k = Math.min((Number(a.parte_atual) || 0) + 1, Math.max(n, 1));
    var txt;
    if (a.status === 'na_fila' && a.etapa === 'plano') txt = 'Na fila';
    else if (a.etapa === 'plano') txt = 'Planejando a aula';
    else if (a.etapa === 'cenas') txt = 'Montando os slides' + (n > 1 ? ' · parte ' + k + ' de ' + n : '');
    else if (a.etapa === 'revisao') txt = 'Conferindo a fidelidade ao material';
    else if (a.etapa === 'audio') txt = 'Gravando a narração';
    else txt = 'Em andamento';
    return { cls: 'andamento', txt: txt };
  }
  function pendente(a) { return a.status === 'na_fila' || a.status === 'processando'; }
  function blocosDaUnidade(dbId) {
    var mapa = {};
    try { (UbiqueStore.unit_blocks.list() || []).forEach(function (b) { if (String(b.unit_id) === String(dbId)) mapa[String(b.id)] = b.title || ''; }); } catch (_) { }
    return mapa;
  }
  function secoesDaUnidade(dbId) {
    try {
      return (UbiqueStore.unit_sections.list() || []).filter(function (s) { return String(s.unit_id) === String(dbId); })
        .sort(function (a, b) { return (a.position || 0) - (b.position || 0); })
        .map(function (s) { return { id: s.id, titulo: s.title || 'Seção' }; });
    } catch (_) { return []; }
  }
  function carregarAulas(dbId) {
    if (!sb()) return Promise.resolve([]);
    return sb().schema('aluno').from('aulas').select(SEL_LISTA).eq('unit_id', dbId).neq('status', 'cancelada').order('created_at', { ascending: false })
      .then(function (r) { if (r.error) { console.warn('[aulas]', r.error); return null; } return r.data || []; }).catch(function () { return null; });
  }

  // ─── vigia: avisa quando uma aula em andamento fica pronta (mesmo com o painel fechado) ──
  var Vigia = (function () {
    var timer = null, alvo = {};   // dbId → { ids:Set, cb }
    function olhar() {
      timer = null;
      var unidades = Object.keys(alvo); if (!unidades.length) return;
      Promise.all(unidades.map(function (dbId) {
        return carregarAulas(dbId).then(function (rows) {
          if (!rows) return;
          var v = alvo[dbId]; if (!v) return;
          rows.forEach(function (a) {
            if (!v.ids[a.id]) return;
            if (a.status === 'pronta') { delete v.ids[a.id]; toast('A aula "' + (a.titulo || presetNome(a.preset)) + '" ficou pronta. Abra "Aula em slides" na unidade para assistir.', 'success'); }
            else if (a.status === 'erro') { delete v.ids[a.id]; toast('A aula "' + (a.titulo || presetNome(a.preset)) + '" não deu certo' + (a.estornado_em ? ' e o valor foi devolvido.' : '.'), 'error'); }
          });
          if (v.cb) v.cb(rows);
          if (!Object.keys(v.ids).length) delete alvo[dbId];
        });
      })).then(agendar, agendar);
    }
    function agendar() { if (timer || !Object.keys(alvo).length) return; timer = setTimeout(olhar, 12000); }
    return {
      vigiar: function (dbId, rows, cb) {
        var ids = {}; (rows || []).forEach(function (a) { if (pendente(a)) ids[a.id] = true; });
        if (!Object.keys(ids).length) { if (alvo[dbId]) alvo[dbId].cb = null; return; }
        alvo[dbId] = { ids: ids, cb: cb || null };
        agendar();
      },
      calar: function (dbId) { if (alvo[dbId]) alvo[dbId].cb = null; }
    };
  })();

  // ─── painel "Aulas desta unidade" ────────────────────────────────────────
  var Painel = (function () {
    var el = null, unit = null, dbId = null, aulas = [], precos = {}, vozes = [], vozPadrao = '', conta = null, secoes = [], pedindo = false;
    function abrir(u) {
      if (el) fechar();
      unit = u; dbId = unitDbId(u);
      if (dbId == null) { toast('Não consegui identificar esta unidade.', 'error'); return; }
      if (!sb() || !uid()) { toast('Entre na sua conta para gerar aulas.', 'warn'); return; }
      secoes = secoesDaUnidade(dbId);
      el = document.createElement('div');
      el.className = 'au';
      el.innerHTML = '<div class="au-p" role="dialog" aria-modal="true" aria-label="Aulas desta unidade">'
        + '<div class="au-h"><div><div class="au-k">Aula em slides</div><div class="au-t">' + esc(((u.label || 'Unidade') + ' ' + (u.number || '')).trim()) + ' · ' + esc(u.title || '') + '</div></div>'
        + '<button type="button" class="au-x" data-au="fechar" aria-label="Fechar">' + ICO.x + '</button></div>'
        + '<div class="au-body"><div class="au-carregando">Carregando as suas aulas…</div></div></div>';
      document.body.appendChild(el);
      document.body.style.overflow = 'hidden';
      el.addEventListener('click', aoClicar);
      el.addEventListener('submit', aoEnviar);
      el.addEventListener('change', aoMudar);
      document.addEventListener('keydown', aoTeclar);
      Promise.all([carregarAulas(dbId), carregarPrecos(), carregarConta(), carregarVozes(), carregarVozPadrao()]).then(function (r) {
        if (!el) return;
        aulas = r[0] || []; precos = r[1]; conta = r[2]; vozes = r[3]; vozPadrao = r[4];
        vista(aulas.length ? 'lista' : 'pedido');
        Vigia.vigiar(dbId, aulas, aoAtualizar);
      });
    }
    function fechar() {
      if (!el) return;
      document.removeEventListener('keydown', aoTeclar);
      el.remove(); el = null;
      document.body.style.overflow = '';
      Vigia.calar(dbId);
    }
    function carregarPrecos() {
      return sb().schema('carteira').from('tabela_custos').select('acao,valor').in('acao', ['aula_resumo', 'aula_completa', 'aula_questoes', 'aula_secao'])
        .then(function (r) { var p = {}; ((r && r.data) || []).forEach(function (x) { p[String(x.acao).replace(/^aula_/, '')] = Number(x.valor); }); return p; }).catch(function () { return {}; });
    }
    function carregarConta() {
      return sb().schema('carteira').from('contas').select('saldo,ilimitado').eq('user_id', uid()).maybeSingle()
        .then(function (r) { return (r && r.data) || null; }).catch(function () { return null; });
    }
    function carregarVozes() {
      var p = (typeof root._vozesLeituraCarregar === 'function') ? root._vozesLeituraCarregar()
        : sb().schema('ia').from('voice_vozes').select('voice_id, nome').eq('ativo', true).order('ordem').then(function (r) { return (r && r.data) || []; });
      return Promise.resolve(p).then(function (v) { return Array.isArray(v) ? v : []; }).catch(function () { return []; });
    }
    function carregarVozPadrao() {
      return sb().from('platform_config').select('aula_voz_padrao').eq('id', 'default').maybeSingle()
        .then(function (r) { return (r && r.data && r.data.aula_voz_padrao) || ''; }).catch(function () { return ''; });
    }
    function aoAtualizar(rows) { if (!el) return; aulas = rows; if (el.querySelector('.au-lista')) pintarLista(); }
    function vista(qual) {
      var body = el.querySelector('.au-body'); if (!body) return;
      if (qual === 'pedido') { body.innerHTML = htmlPedido(); var ta = body.querySelector('textarea'); if (ta && !('ontouchstart' in root)) ta.focus(); }
      else { body.innerHTML = '<div class="au-lista"></div>'; pintarLista(); }
    }
    function pintarLista() {
      var box = el.querySelector('.au-lista'); if (!box) return;
      var cards = aulas.map(function (a) {
        var e = estado(a), pronta = a.status === 'pronta';
        return '<div class="au-card' + (pronta ? ' is-pronta' : '') + '" data-id="' + esc(a.id) + '">'
          + '<div class="au-card-l">'
          + '<div class="au-card-t">' + esc(a.titulo || (pendente(a) ? 'Preparando a aula…' : presetNome(a.preset))) + '</div>'
          + '<div class="au-card-m">' + esc(presetNome(a.preset)) + (a.secao_id && a.preset === 'secao' ? ' · ' + esc(nomeSecao(a.secao_id)) : '') + ' · ' + esc(fmtData(a.created_at)) + (a.custo_ubt ? ' · ' + fmtUbt(a.custo_ubt) + ' ⓤ' : '') + '</div>'
          + (a.comando ? '<div class="au-card-c">"' + esc(a.comando) + '"</div>' : '')
          + '<div class="au-pill is-' + e.cls + '">' + (e.cls === 'andamento' ? '<span class="au-dot"></span>' : '') + esc(e.txt) + '</div>'
          + (a.status === 'erro' && a.erro ? '<div class="au-card-e">' + esc(String(a.erro).slice(0, 160)) + '</div>' : '')
          + '</div>'
          + '<div class="au-card-r">' + (pronta ? '<button type="button" class="btn-primary au-assistir" data-au="assistir" data-id="' + esc(a.id) + '">' + ICO.play + ' Assistir</button>' : '') + '</div>'
          + '</div>';
      }).join('');
      box.innerHTML = '<div class="au-topo"><button type="button" class="btn-primary" data-au="nova">' + ICO.slides + ' Gerar aula</button>'
        + '<span class="au-topo-s">Cada aula é sua: gerada sob medida, narrada pelo professor, a partir de ' + fmtUbt(menorPreco()) + ' ⓤ.</span></div>'
        + (cards ? '<div class="au-cards">' + cards + '</div>' : '<div class="au-vazio">Você ainda não gerou nenhuma aula desta unidade.</div>');
    }
    function nomeSecao(id) { for (var i = 0; i < secoes.length; i++) if (String(secoes[i].id) === String(id)) return secoes[i].titulo; return 'seção'; }
    function menorPreco() { var m = null; Object.keys(precos).forEach(function (k) { if (m == null || precos[k] < m) m = precos[k]; }); return m == null ? 1 : m; }
    function htmlPedido() {
      var tipos = PRESETS.map(function (p, i) {
        var preco = precos[p.id];
        return '<label class="au-tipo' + (i === 0 ? ' is-on' : '') + '"><input type="radio" name="preset" value="' + p.id + '"' + (i === 0 ? ' checked' : '') + '>'
          + '<span class="au-tipo-n">' + esc(p.nome) + '</span><span class="au-tipo-p">' + (preco != null ? fmtUbt(preco) + ' ⓤ' : '') + '</span>'
          + '<span class="au-tipo-d">' + esc(p.desc) + '</span></label>';
      }).join('');
      var secOpts = secoes.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.titulo) + '</option>'; }).join('');
      var vozOpts = vozes.map(function (v) { return '<option value="' + esc(v.voice_id) + '"' + (v.voice_id === vozPadrao ? ' selected' : '') + '>' + esc(v.nome) + (v.voice_id === vozPadrao ? ' (padrão)' : '') + '</option>'; }).join('');
      var saldoTxt = conta ? (conta.ilimitado ? 'Saldo ilimitado' : 'Saldo: ' + fmtUbt(conta.saldo) + ' ⓤ') : '';
      return '<form class="au-form" novalidate>'
        + '<div class="au-f-k">Tipo da aula</div><div class="au-tipos">' + tipos + '</div>'
        + '<div class="au-f-secao" hidden><label class="au-f-k" for="auSecao">Qual seção</label><select id="auSecao" name="secao_id" class="au-in">' + (secOpts || '<option value="">Esta unidade não tem seções</option>') + '</select></div>'
        + '<label class="au-f-k" for="auComando">Pedido especial <span>opcional</span></label>'
        + '<textarea id="auComando" name="comando" class="au-in" maxlength="600" rows="2" placeholder="Ex.: foque nas causas econômicas e traga as questões de 2019."></textarea>'
        + (vozOpts ? '<label class="au-f-k" for="auVoz">Voz</label><select id="auVoz" name="voice_id" class="au-in">' + vozOpts + '</select>' : '')
        + '<div class="au-f-foot"><span class="au-saldo">' + esc(saldoTxt) + '</span>'
        + '<div class="au-f-acts">' + (aulas.length ? '<button type="button" class="icon-btn" data-au="lista">Minhas aulas</button>' : '') + '<button type="submit" class="btn-primary au-enviar">' + ICO.slides + ' Gerar aula · <span class="au-enviar-p">' + fmtUbt(precos.resumo != null ? precos.resumo : 1) + ' ⓤ</span></button></div></div>'
        + '<div class="au-f-msg" aria-live="polite"></div></form>';
    }
    function aoMudar(ev) {
      var t = ev.target; if (!t || t.name !== 'preset') return;
      el.querySelectorAll('.au-tipo').forEach(function (l) { l.classList.toggle('is-on', l.querySelector('input').checked); });
      var sec = el.querySelector('.au-f-secao'); if (sec) sec.hidden = t.value !== 'secao';
      var p = el.querySelector('.au-enviar-p'); if (p) p.textContent = fmtUbt(precos[t.value] != null ? precos[t.value] : '?') + ' ⓤ';
    }
    function aoClicar(ev) {
      if (ev.target === el) { fechar(); return; }
      var b = ev.target.closest ? ev.target.closest('[data-au]') : null; if (!b) return;
      var a = b.getAttribute('data-au');
      if (a === 'fechar') fechar();
      else if (a === 'nova') vista('pedido');
      else if (a === 'lista') vista('lista');
      else if (a === 'assistir') { var id = b.getAttribute('data-id'); var row = null; aulas.some(function (x) { if (x.id === id) { row = x; return true; } return false; }); if (row) { fechar(); Player.abrir(row, unit); } }
    }
    function aoTeclar(ev) { if (ev.key === 'Escape' && el) fechar(); }
    function aoEnviar(ev) {
      ev.preventDefault(); if (pedindo) return;
      var form = el.querySelector('.au-form'); if (!form) return;
      var msg = form.querySelector('.au-f-msg'), btn = form.querySelector('.au-enviar');
      var preset = (form.querySelector('input[name=preset]:checked') || {}).value || 'resumo';
      var comando = String((form.querySelector('[name=comando]') || {}).value || '').trim();
      var voz = (form.querySelector('[name=voice_id]') || {}).value || '';
      var secao = (form.querySelector('[name=secao_id]') || {}).value || '';
      if (preset === 'secao' && !secao) { msg.textContent = ERROS.secao_obrigatoria; return; }
      if (comando.length > 600) { msg.textContent = ERROS.comando_longo; return; }
      pedindo = true; btn.disabled = true; msg.textContent = 'Pedindo a aula…';
      invocar({ acao: 'pedir', unit_id: dbId, preset: preset, comando: comando || null, voice_id: voz || null, secao_id: preset === 'secao' ? Number(secao) : null }).then(function (d) {
        pedindo = false; if (!el) return;
        btn.disabled = false;
        if (!d || d.ok === false) { msg.textContent = msgErro(d && d.error, d); return; }
        toast('Aula pedida' + (d.custo ? ' por ' + fmtUbt(d.custo) + ' ⓤ' : '') + '. Pode continuar estudando: eu aviso quando ficar pronta.', 'success');
        if (conta && d.saldo != null) conta.saldo = d.saldo;
        carregarAulas(dbId).then(function (rows) { if (!el) return; aulas = rows || aulas; vista('lista'); Vigia.vigiar(dbId, aulas, aoAtualizar); });
      });
    }
    return { abrir: abrir, fechar: fechar };
  })();

  // ─── player ──────────────────────────────────────────────────────────────
  var Player = (function () {
    var el = null, stage = null, ctl = null, cenas = [], midia = {}, dur = [], inicio = [], total = 0, i = -1;
    var audio = null, silencio = null, tocando = false, rate = 1, raf = 0, legendaOn = true, aulaId = null, tokens = [], palavraAtual = -1, cuesOn = {}, salvarT = 0, soltarFit = null, terminou = false, ultimoTxt = '';
    function abrir(resumo, unit) {
      if (el) fechar();
      var id = typeof resumo === 'string' ? resumo : resumo.id;
      if (!id || !sb()) return;
      if (!root.AulaSlides) { toast('O player ainda não carregou. Recarregue a página.', 'error'); return; }
      try { if (root.LBAudio && LBAudio.fecharTudo) LBAudio.fecharTudo(); } catch (_) { }
      montar(resumo && resumo.titulo || '');
      Promise.all([
        sb().schema('aluno').from('aulas').select('id,titulo,preset,roteiro,material,duracao_estimada_s').eq('id', id).maybeSingle().then(function (r) { return (r && r.data) || null; }).catch(function () { return null; }),
        invocar({ acao: 'midia', aula_id: id })
      ]).then(function (r) {
        if (!el) return;
        var row = r[0], m = r[1];
        if (!row || !row.roteiro || !Array.isArray(row.roteiro.cenas) || !row.roteiro.cenas.length) { falha('Não consegui carregar esta aula.'); return; }
        midia = {};
        if (m && m.ok && Array.isArray(m.cenas)) m.cenas.forEach(function (c) { if (c.url) midia[c.id] = c; });
        if (!Object.keys(midia).length) toast('Esta aula ainda está sem narração. Os slides passam sozinhos.', 'warn');
        preparar(row, unit || {});
      });
    }
    function montar(titulo) {
      el = document.createElement('div');
      el.className = 'ap';
      el.innerHTML = '<div class="ap-top"><div class="ap-top-l"><span class="ap-kicker">Aula em slides</span><span class="ap-title">' + esc(titulo) + '</span></div>'
        + '<div class="ap-top-r">'
        + '<button type="button" class="ap-ib" data-ap="legenda" aria-pressed="true" data-tip="Legenda">' + ICO.legenda + '<span>Legenda</span></button>'
        + '<button type="button" class="ap-ib" data-ap="visual" hidden>' + ICO.imagem + '<span>Ver imagem</span></button>'
        + '<button type="button" class="ap-ib" data-ap="tela" hidden>' + ICO.tela + '<span>Tela cheia</span></button>'
        + '<button type="button" class="ap-ib ap-x" data-ap="fechar" aria-label="Fechar">' + ICO.x + '</button></div></div>'
        + '<div class="ap-stage-wrap"><div class="aula-stage is-live"></div>'
        + '<button type="button" class="ap-big" data-ap="play" aria-label="Reproduzir">' + ICO.play + '</button>'
        + '<div class="ap-retomar" hidden><span></span><button type="button" data-ap="inicio">Começar do início</button></div>'
        + '<div class="ap-carregando">Preparando a aula…</div></div>'
        + '<div class="ap-legenda" aria-live="off"></div>'
        + '<div class="ap-bar">'
        + '<div class="ap-seek"><div class="ap-seek-marks"></div><div class="ap-seek-fill"></div><input type="range" class="ap-seek-in" min="0" max="1000" value="0" step="1" aria-label="Linha do tempo da aula"></div>'
        + '<div class="ap-ctl"><div class="ap-ctl-l"><span class="ap-time">0:00 / 0:00</span></div>'
        + '<div class="ap-ctl-c">'
        + '<button type="button" class="ap-btn" data-ap="prev" aria-label="Slide anterior">' + ICO.prev + '</button>'
        + '<button type="button" class="ap-btn" data-ap="back" aria-label="Voltar 10 segundos">' + ICO.back + '</button>'
        + '<button type="button" class="ap-btn ap-play" data-ap="play" aria-label="Reproduzir">' + ICO.play + '</button>'
        + '<button type="button" class="ap-btn" data-ap="fwd" aria-label="Avançar 10 segundos">' + ICO.fwd + '</button>'
        + '<button type="button" class="ap-btn" data-ap="next" aria-label="Próximo slide">' + ICO.next + '</button></div>'
        + '<div class="ap-ctl-r"><button type="button" class="ap-rate" data-ap="rate" data-tip="Velocidade">1x</button><span class="ap-n">– / –</span></div></div></div>';
      document.body.appendChild(el);
      document.body.style.overflow = 'hidden';
      el.addEventListener('click', aoClicar);
      document.addEventListener('keydown', aoTeclar);
      var tela = el.querySelector('[data-ap="tela"]');
      if (tela && (document.fullscreenEnabled || el.webkitRequestFullscreen)) tela.hidden = false;
      var seek = el.querySelector('.ap-seek-in');
      seek.addEventListener('input', function () { irPara((Number(seek.value) / 1000) * total); });
      legendaOn = ls('ubique.aula.legenda') !== '0';
      aplicarLegendaPref();
      var r = parseFloat(ls('ubique.aula.rate') || '1'); rate = RATES.indexOf(r) >= 0 ? r : 1;
      pintarRate();
    }
    function falha(msg) { var c = el && el.querySelector('.ap-carregando'); if (c) c.textContent = msg; toast(msg, 'error'); }
    function preparar(row, unit) {
      aulaId = row.id; terminou = false;
      i = -1; palavraAtual = -1; tokens = []; cuesOn = {}; silencio = null; tocando = false; ultimoTxt = '';   // estado zerado a cada abertura
      var rot = row.roteiro, mat = row.material || {};
      cenas = rot.cenas;
      var cat = Array.isArray(mat.midia) ? mat.midia : [];
      var capa = null; cat.some(function (m) { if (m.tipo === 'capa') { capa = m; return true; } return false; });
      var ctx = {
        materia: mat.materia || '', unidadeRotulo: ((unit.label || 'Unidade') + ' ' + (unit.number || '')).trim(), unidadeTitulo: unit.title || '',
        capaUrl: (capa && capa.url) || unit.cover || '', logoSvg: LOGO, midia: cat, blocos: blocosDaUnidade(unitDbId(unit))
      };
      var t = el.querySelector('.ap-title'); if (t) t.textContent = row.titulo || '';
      var k = el.querySelector('.ap-kicker'); if (k) k.textContent = 'Aula em slides' + (ctx.materia ? ' · ' + ctx.materia : '');
      stage = el.querySelector('.aula-stage');
      ctl = AulaSlides.mount(stage, rot, ctx);
      var wrap = el.querySelector('.ap-stage-wrap');
      soltarFit = AulaSlides.fit(wrap, { contain: true });
      // durações e início de cada slide (a narração manda; sem áudio, o tempo estimado do roteiro)
      dur = cenas.map(function (c) { var m = midia[c.id]; return m && m.duracao_s ? Number(m.duracao_s) : Math.max(4, Number(c.duracao_s) || 6); });
      total = 0; inicio = dur.map(function (d) { var s = total; total += d; return s; });
      var marks = el.querySelector('.ap-seek-marks');
      marks.innerHTML = inicio.map(function (s, k) { return k ? '<i style="left:' + (s / total * 100) + '%"></i>' : ''; }).join('');
      audio = document.createElement('audio');
      audio.preload = 'auto';
      try { audio.preservesPitch = true; audio.mozPreservesPitch = true; audio.webkitPreservesPitch = true; } catch (_) { }
      audio.addEventListener('ended', fimDaCena);
      audio.addEventListener('play', function () { setTocando(true); });
      audio.addEventListener('pause', function () { if (!audio.ended) setTocando(false); });
      audio.addEventListener('error', function () { if (silencio) return; toast('Não consegui tocar o áudio deste slide. Passando para o próximo.', 'warn'); fimDaCena(); });
      var c = el.querySelector('.ap-carregando'); if (c) c.remove();
      // retoma de onde parou
      var pos = null; try { pos = JSON.parse(ls('ubique.aula.pos.' + aulaId) || 'null'); } catch (_) { pos = null; }
      if (pos && pos.i > 0 && pos.i < cenas.length && !(pos.i === cenas.length - 1 && pos.t >= dur[pos.i] - 3)) {
        tocarCena(pos.i, Math.max(0, Number(pos.t) || 0), false);
        var rt = el.querySelector('.ap-retomar'); rt.hidden = false; rt.querySelector('span').textContent = 'Retomando de ' + fmtTempo(inicio[pos.i] + (pos.t || 0));
      } else {
        tocarCena(0, 0, true);
      }
    }
    function fechar() {
      if (!el) return;
      salvarPos();
      pausar();
      cancelAnimationFrame(raf); raf = 0;
      document.removeEventListener('keydown', aoTeclar);
      if (soltarFit) { try { soltarFit(); } catch (_) { } soltarFit = null; }
      try { if (document.fullscreenElement === el) document.exitFullscreen(); } catch (_) { }
      if (audio) { try { audio.pause(); audio.removeAttribute('src'); audio.load(); } catch (_) { } audio = null; }
      el.remove(); el = null; ctl = null; stage = null; silencio = null; tocando = false;
      document.body.style.overflow = '';
    }
    // ── motor ──
    function tempoLocal() {
      if (silencio) return Math.min(silencio.dur, silencio.t + (tocando ? (performance.now() - silencio.t0) / 1000 * rate : 0));
      return audio ? (audio.currentTime || 0) : 0;
    }
    function tocarCena(k, offset, autoplay) {
      if (k < 0 || k >= cenas.length) return;
      var trocou = k !== i;
      i = k; if (trocou) { ctl.show(k); apagarMarcas(); cuesOn = {}; montarLegenda(cenas[k]); }
      var m = midia[cenas[k].id];
      var vis = el.querySelector('[data-ap="visual"]'); if (vis) { vis.hidden = !ctl.temVisual(); pintarVisual(); }
      el.querySelector('.ap-n').textContent = (k + 1) + ' / ' + cenas.length;
      terminou = false; el.classList.remove('is-fim');
      if (m && m.url) {
        silencio = null;
        var src = m.url;
        var aplicar = function () { try { audio.currentTime = offset || 0; } catch (_) { } pintar(); };
        if (audio.getAttribute('src') !== src) { audio.setAttribute('src', src); audio.load(); audio.addEventListener('loadedmetadata', aplicar, { once: true }); }
        else aplicar();
        audio.defaultPlaybackRate = rate; audio.playbackRate = rate;
        if (autoplay) { var p = audio.play(); if (p && p.catch) p.catch(function () { setTocando(false); }); } else { audio.pause(); setTocando(false); }
        preCarregar(k + 1);
      } else {
        silencio = { dur: dur[k], t: offset || 0, t0: performance.now() };
        try { audio.pause(); } catch (_) { }
        setTocando(!!autoplay);
      }
      pintar();
    }
    function preCarregar(k) { var m = k < cenas.length && midia[cenas[k].id]; if (!m || !m.url || m._pre) return; m._pre = true; try { var a = new Audio(); a.preload = 'auto'; a.src = m.url; } catch (_) { } }
    function fimDaCena() {
      if (i + 1 < cenas.length) tocarCena(i + 1, 0, true);
      else { terminou = true; setTocando(false); el.classList.add('is-fim'); ls('ubique.aula.pos.' + aulaId, null); pintar(); }
    }
    function setTocando(on) {
      tocando = !!on;
      el.classList.toggle('is-tocando', tocando);
      var ic = tocando ? ICO.pause : ICO.play;
      el.querySelectorAll('[data-ap="play"]').forEach(function (b) { b.innerHTML = (b.classList.contains('ap-big') && terminou) ? ICO.replay : ic; b.setAttribute('aria-label', tocando ? 'Pausar' : 'Reproduzir'); });
      if (silencio) { if (tocando) silencio.t0 = performance.now(); else { silencio.t = tempoLocal(); } }
      if (tocando) { var rt = el.querySelector('.ap-retomar'); if (rt) rt.hidden = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(laco); }
      else { cancelAnimationFrame(raf); raf = 0; salvarPos(); }
    }
    function alternar() {
      if (terminou) { tocarCena(0, 0, true); return; }
      if (silencio) { setTocando(!tocando); return; }
      if (!audio) return;
      if (audio.paused) { var p = audio.play(); if (p && p.catch) p.catch(function () { setTocando(false); }); } else audio.pause();
    }
    function pausar() { if (silencio) setTocando(false); else if (audio && !audio.paused) audio.pause(); }
    function irPara(g) {
      g = Math.max(0, Math.min(total - 0.05, g));
      var k = 0; for (var n = 0; n < inicio.length; n++) if (inicio[n] <= g) k = n;
      tocarCena(k, g - inicio[k], tocando);
    }
    function laco() {
      if (!el) return;
      pintar();
      if (silencio && tocando && tempoLocal() >= silencio.dur) { fimDaCena(); return; }
      if (tocando) raf = requestAnimationFrame(laco);
      var agora = performance.now(); if (agora - salvarT > 5000) { salvarT = agora; salvarPos(); }
    }
    function pintar() {
      if (!el || i < 0) return;
      var lt = tempoLocal(), c = cenas[i], au = c.audio || {};
      // palavra atual
      var pal = au.palavras || [], idx = -1;
      if (pal.length) { var lo = 0, hi = pal.length - 1; while (lo <= hi) { var mid = (lo + hi) >> 1; if (pal[mid][0] <= lt) { idx = mid; lo = mid + 1; } else hi = mid - 1; } }
      if (idx !== palavraAtual) {
        if (palavraAtual >= 0 && tokens[palavraAtual]) { tokens[palavraAtual].classList.remove('is-on'); tokens[palavraAtual].classList.add('is-past'); }
        for (var q = idx + 1; q < tokens.length; q++) tokens[q].classList.remove('is-past', 'is-on');
        for (var p2 = 0; p2 < idx; p2++) { tokens[p2].classList.add('is-past'); tokens[p2].classList.remove('is-on'); }
        if (idx >= 0 && tokens[idx]) { tokens[idx].classList.add('is-on'); tokens[idx].classList.remove('is-past'); if (legendaOn) { try { tokens[idx].scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) { } } }
        palavraAtual = idx;
      }
      // marca-texto
      (au.destaques || []).forEach(function (d) {
        var on = lt >= d.inicio_s, chave = c.id + ':' + d.i;
        if (!!cuesOn[chave] !== on) { cuesOn[chave] = on; ctl.destaque(chave, on); }
      });
      // linha do tempo
      var g = inicio[i] + lt, pct = total ? (g / total * 100) : 0;
      el.querySelector('.ap-seek-fill').style.width = pct + '%';
      var inp = el.querySelector('.ap-seek-in'); if (document.activeElement !== inp) inp.value = Math.round(pct * 10);
      var txt = fmtTempo(g) + ' / ' + fmtTempo(total);
      if (txt !== ultimoTxt) { ultimoTxt = txt; el.querySelector('.ap-time').textContent = txt; }
    }
    function apagarMarcas() { if (!stage) return; stage.querySelectorAll('.aula-hl.is-on').forEach(function (m) { m.classList.remove('is-on'); }); }
    function montarLegenda(c) {
      var box = el.querySelector('.ap-legenda'); tokens = []; palavraAtual = -1;
      var pal = (c.audio && c.audio.palavras) || [];
      if (pal.length) box.innerHTML = pal.map(function (p) { return '<span class="ap-w">' + esc(p[2]) + '</span>'; }).join(' ');
      else box.innerHTML = '<span class="ap-w is-solta">' + esc(c.narracao || '') + '</span>';
      tokens = Array.prototype.slice.call(box.querySelectorAll('.ap-w'));
      if (!pal.length) tokens = [];
      box.scrollTop = 0;
    }
    function salvarPos() { if (!aulaId || i < 0 || terminou) return; ls('ubique.aula.pos.' + aulaId, JSON.stringify({ i: i, t: Math.round(tempoLocal() * 10) / 10, ts: Date.now() })); }
    function setRate(r) {
      rate = r; ls('ubique.aula.rate', String(r));
      if (audio) { try { audio.preservesPitch = true; } catch (_) { } audio.defaultPlaybackRate = r; audio.playbackRate = r; }
      if (silencio && tocando) { silencio.t = tempoLocal(); silencio.t0 = performance.now(); }
      pintarRate();
    }
    function pintarRate() { var b = el && el.querySelector('.ap-rate'); if (b) b.textContent = String(rate).replace('.', ',') + 'x'; }
    function aplicarLegendaPref() {
      el.classList.toggle('sem-legenda', !legendaOn);
      var b = el.querySelector('[data-ap="legenda"]'); if (b) { b.setAttribute('aria-pressed', legendaOn ? 'true' : 'false'); b.classList.toggle('is-on', legendaOn); }
    }
    function pintarVisual() {
      var b = el.querySelector('[data-ap="visual"]'); if (!b || b.hidden) return;
      var s = stage.querySelector('.aula-slide.is-active'), on = !!(s && s.classList.contains('is-visual'));
      b.innerHTML = (on ? ICO.texto : ICO.imagem) + '<span>' + (on ? 'Ver texto' : 'Ver imagem') + '</span>';
    }
    function aoClicar(ev) {
      var b = ev.target.closest ? ev.target.closest('[data-ap]') : null; if (!b) return;
      var a = b.getAttribute('data-ap');
      if (a === 'fechar') fechar();
      else if (a === 'play') alternar();
      else if (a === 'prev') tocarCena(Math.max(0, i - 1), 0, tocando);
      else if (a === 'next') { if (i + 1 < cenas.length) tocarCena(i + 1, 0, tocando); }
      else if (a === 'back') irPara(inicio[i] + tempoLocal() - 10);
      else if (a === 'fwd') irPara(inicio[i] + tempoLocal() + 10);
      else if (a === 'rate') setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length]);
      else if (a === 'legenda') { legendaOn = !legendaOn; ls('ubique.aula.legenda', legendaOn ? '1' : '0'); aplicarLegendaPref(); }
      else if (a === 'visual') { ctl.visual(); pintarVisual(); }
      else if (a === 'inicio') { tocarCena(0, 0, true); }
      else if (a === 'tela') {
        try { if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); } catch (_) { }
      }
    }
    function aoTeclar(ev) {
      if (!el) return;
      var tag = (ev.target && ev.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { if (ev.key === 'Escape') { fechar(); } return; }
      if (ev.key === 'Escape') { ev.preventDefault(); fechar(); }
      else if (ev.key === ' ' || ev.key === 'k') { ev.preventDefault(); alternar(); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); if (i + 1 < cenas.length) tocarCena(i + 1, 0, tocando); }
      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); tocarCena(Math.max(0, i - 1), 0, tocando); }
      else if (ev.key === 'j') { irPara(inicio[i] + tempoLocal() - 10); }
      else if (ev.key === 'l') { irPara(inicio[i] + tempoLocal() + 10); }
    }
    return { abrir: abrir, fechar: fechar, RATES: RATES };
  })();

  root.AulasUnidade = Painel;
  root.AulaPlayer = Player;
  root.AulaPlayer.LOGO = LOGO;
})(typeof window !== 'undefined' ? window : this);
