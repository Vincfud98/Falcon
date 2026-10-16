/* Páginas públicas das questões (q/<uuid>.html): resolver na própria página (pacote 7, 16/10/2026).
   Mesmo visual e mesmo comportamento do Banco em modo visitante: marca C/E, "Verificar respostas" corrige no
   servidor (aluno.visitante_corrigir, papel anônimo) até a cota do dia, mostra gabarito e comentário no satélite;
   na cota, o aviso e a folha de convite do app. O número de visitante é o MESMO do app (localStorage, mesmo
   domínio): a cota é uma só e as respostas entram na conta quando a pessoa se cadastra. Quem já está logado
   resolve no Banco (um clique abre a questão lá). O gerador troca __SUPABASE_URL__ e __ANON_KEY__ ao publicar. */
(function(){
  'use strict';
  var SUPABASE = '__SUPABASE_URL__', KEY = '__ANON_KEY__';
  var sec = document.querySelector('[data-questao]');
  if(!sec) return;
  var APP = sec.getAttribute('data-app') || '';
  var APP_RAIZ = APP.replace(/#.*$/, '');
  var CHAVE_ID = 'falcon_visitante_id';
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>';
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var limpaHtml = function(s){
    return String(s == null ? '' : s).replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, '')
      .replace(/<(script|style|iframe|object|embed|form)[^>]*>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/javascript:/gi, '');
  };
  function uuid(){
    try{ return crypto.randomUUID(); }catch(_){ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){ var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  function visitanteId(){
    var v = null; try{ v = localStorage.getItem(CHAVE_ID); }catch(_){ }
    if(!v || !/^[0-9a-f-]{36}$/i.test(v)){ v = uuid(); try{ localStorage.setItem(CHAVE_ID, v); }catch(_){ } }
    return v;
  }
  function sessao(){ try{ var s = sessionStorage.getItem('falcon_vis_sessao'); if(!s){ s = uuid(); sessionStorage.setItem('falcon_vis_sessao', s); } return s; }catch(_){ return 'sem-sessao'; } }
  // sessão do app no mesmo domínio: quem está logado resolve no Banco
  function logado(){
    try{
      for(var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if(!/^sb-.*-auth-token$/.test(k)) continue;
        var v = JSON.parse(localStorage.getItem(k) || 'null');
        if(v && (v.access_token || (v.currentSession && v.currentSession.access_token))) return true;
      }
    }catch(_){ }
    return false;
  }
  function rpc(schema, nome, corpo){
    return fetch(SUPABASE + '/rest/v1/rpc/' + nome, {
      method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', 'Content-Profile': schema },
      body: JSON.stringify(corpo || {})
    }).then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.status === 204 ? null : r.json(); });
  }
  function evento(tipo, meta){
    try{
      var vid = null; try{ vid = localStorage.getItem('ubq_vid'); }catch(_){ }
      var m = { visitante: visitanteId() }; Object.keys(meta || {}).forEach(function(k){ m[k] = meta[k]; });
      rpc('crm', 'registrar_evento', {
        p_visitor_id: vid || visitanteId(), p_session_id: sessao(), p_event_type: 'vis_' + tipo, p_channel: 'pagina',
        p_device: (window.innerWidth < 760 ? 'mobile' : 'desktop'), p_url: String(location.href).slice(0, 500), p_referrer: String(document.referrer || '').slice(0, 500),
        p_utm_source: null, p_utm_medium: null, p_utm_campaign: null, p_materia: null, p_meta: m
      }).catch(function(){});
    }catch(_){ }
  }
  function toast(msg, tipo){
    var host = document.getElementById('ueToastHost');
    if(!host){ host = document.createElement('div'); host.id = 'ueToastHost'; document.body.appendChild(host); }
    var el = document.createElement('div'); el.className = 'ue-toast ue-toast-' + (tipo || 'info'); el.textContent = msg; host.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add('is-in'); });
    setTimeout(function(){ el.classList.remove('is-in'); setTimeout(function(){ try{ el.remove(); }catch(_){ } }, 300); }, tipo === 'warn' ? 5000 : 3500);
  }

  // ── estado ──────────────────────────────────────────────────────────────────
  var itens = Array.prototype.slice.call(sec.querySelectorAll('.q-item[data-item-id]'));
  var dados = {};   // id → { selected: 'C'|'E'|null, verified, correct, gabarito, comentario, anulada }
  itens.forEach(function(el){ dados[el.getAttribute('data-item-id')] = { selected: null, verified: false }; });
  var estado = { limite: 3, usadas: 0 };
  var verifyBar = sec.querySelector('[data-qz-verify]'), verifyBtn = sec.querySelector('[data-qz-verify-btn]'), summaryEl = sec.querySelector('[data-qz-summary]');
  var counterEl = sec.querySelector('[data-qz-counter]'), barEl = sec.querySelector('[data-qz-bar]'), remainEl = sec.querySelector('[data-qz-remaining]'), detailEl = sec.querySelector('[data-qz-detail]');
  var cotaEl = sec.querySelector('#bfCota');
  var estouLogado = logado();
  if(!estouLogado){ try{ document.body.setAttribute('data-visitante', ''); }catch(_){ } }

  var contaveis = function(){ return itens.filter(function(el){ return !(dados[el.getAttribute('data-item-id')] || {}).anulada; }); };
  function updateSatellite(ativo){
    var lista = contaveis(), respondidas = 0;
    lista.forEach(function(el){ var d = dados[el.getAttribute('data-item-id')]; if(d && d.selected != null) respondidas++; });
    var total = lista.length, faltam = total - respondidas;
    if(counterEl) counterEl.textContent = respondidas + ' / ' + total + ' respondidas';
    if(barEl) barEl.style.width = (total ? Math.round(respondidas / total * 100) : 0) + '%';
    if(remainEl) remainEl.textContent = faltam > 0 ? 'Faltam ' + faltam : 'Todas respondidas';
    if(ativo && detailEl){
      var d = dados[ativo.getAttribute('data-item-id')] || {};
      if(d.verified){
        var gab = d.gabarito === 'C' ? 'Certo' : (d.gabarito === 'E' ? 'Errado' : String(d.gabarito || ''));
        detailEl.innerHTML = '<div class="qz-sat-item">' + (d.comentario
          ? '<div class="qz-sat-comments">' + limpaHtml(d.comentario) + '</div>'
          : '<div class="qz-sat-gab"><span class="qz-sat-gab-rot">Gabarito</span><strong>' + esc(gab) + '</strong></div><div class="qz-sat-prep">Comentário em preparação. O gabarito comentado desta questão ainda está sendo escrito.</div>') + '</div>';
      } else {
        detailEl.innerHTML = '<div class="qz-sat-empty">Marque a resposta e clique em Verificar respostas para ver o gabarito e o comentário.</div>';
      }
    }
  }
  function syncVerifyBar(){
    if(!verifyBar) return;
    var pend = 0, ver = 0;
    itens.forEach(function(el){ var d = dados[el.getAttribute('data-item-id')]; if(!d) return; if(d.verified) ver++; else if(d.selected != null) pend++; });
    verifyBar.hidden = !(pend || ver);
    if(summaryEl){ summaryEl.hidden = !ver; summaryEl.textContent = ver ? (ver + (ver === 1 ? ' questão verificada' : ' questões verificadas')) : ''; }
    if(verifyBtn){ verifyBtn.disabled = !pend; verifyBtn.textContent = pend ? 'Verificar respostas' : 'Verificado'; }
  }
  function revealItem(el, correto){
    var d = dados[el.getAttribute('data-item-id')];
    el.querySelectorAll('.q-option').forEach(function(b){ b.classList.remove('correct', 'wrong'); if(b.getAttribute('data-value') === (d.selected === 'C' ? 'Certo' : 'Errado')) b.classList.add(correto ? 'correct' : 'wrong', 'selected'); });
    var a = el.querySelector('.q-assertion');
    if(a){
      var er = a.querySelector('.q-result'); if(er) er.remove();
      var icon = document.createElement('span'); icon.className = correto ? 'q-result q-result-correct' : 'q-result q-result-wrong'; icon.title = correto ? 'Correto' : 'Incorreto'; icon.textContent = correto ? '✓' : '✗';
      a.appendChild(icon);
    }
    el.classList.add('answered', 'q-frozen');
    var sk = el.querySelector('.q-show-key'); if(sk) sk.style.display = 'flex';
  }
  function pintarCota(){
    if(!cotaEl || estouLogado) return;
    cotaEl.textContent = 'Visitante: ' + Math.min(estado.limite, estado.usadas) + ' de ' + estado.limite + ' questões corrigidas hoje';
    cotaEl.hidden = false;
  }
  function aviso(html){
    limparAviso();
    var dv = document.createElement('div'); dv.className = 'bf-limite'; dv.setAttribute('data-aviso', ''); dv.innerHTML = html;
    if(verifyBar && verifyBar.parentNode) verifyBar.parentNode.insertBefore(dv, verifyBar); else sec.appendChild(dv);
  }
  function limparAviso(){ sec.querySelectorAll('[data-aviso]').forEach(function(e){ e.remove(); }); }
  var conviteAberto = null;
  function convite(){
    if(conviteAberto) conviteAberto.remove();
    var itensB = ['Com a conta gratuita são 10 por dia, com o comentário do professor', 'O seu desempenho fica guardado', 'As respostas que você já deu vêm junto'];
    var bd = document.createElement('div'); bd.className = 'vis-conv-bd';
    bd.innerHTML = '<div class="vis-conv-card" role="dialog" aria-modal="true"><button type="button" class="vis-conv-x" data-vis-fechar aria-label="Fechar">&times;</button>'
      + '<span class="vis-tag">Conta gratuita</span><h2>Você resolveu as suas questões de hoje</h2><ul>' + itensB.map(function(x){ return '<li>' + CHECK + esc(x) + '</li>'; }).join('') + '</ul>'
      + '<div class="vis-conv-acoes"><a class="btn-primary" href="' + esc(APP_RAIZ) + '#/login?criar=1">Criar conta grátis</a><a class="btn-ghost" href="' + esc(APP_RAIZ) + '#/login">Já tenho conta</a><button type="button" class="vis-conv-depois" data-vis-fechar>Agora não</button></div></div>';
    bd.addEventListener('click', function(e){ if(e.target === bd || e.target.closest('[data-vis-fechar]')){ bd.remove(); conviteAberto = null; } });
    document.body.appendChild(bd); conviteAberto = bd;
    evento('convite', { motivo: 'cota' });
  }
  function aplicar(r){
    if(!r) return;
    estado.limite = Number(r.limite) || estado.limite; estado.usadas = Number(r.usadas) || 0;
    pintarCota();
  }
  function corrigir(lista){
    return rpc('aluno', 'visitante_corrigir', { p_visitante: visitanteId(), p_itens: lista }).then(function(r){ aplicar(r); return r || {}; });
  }
  function irParaOApp(){ location.href = APP; }

  // ── cliques ─────────────────────────────────────────────────────────────────
  itens.forEach(function(el){
    var id = el.getAttribute('data-item-id');
    el.querySelectorAll('.q-option').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(estouLogado){ irParaOApp(); return; }
        var d = dados[id]; if(!d || d.verified) return;
        var v = btn.getAttribute('data-value') === 'Certo' ? 'C' : 'E';
        if(d.selected === v){ d.selected = null; el.querySelectorAll('.q-option').forEach(function(b){ b.classList.remove('selected', 'correct', 'wrong'); }); }
        else { d.selected = v; el.querySelectorAll('.q-option').forEach(function(b){ b.classList.remove('selected', 'correct', 'wrong'); if(b === btn) b.classList.add('selected'); }); }
        syncVerifyBar(); updateSatellite(el);
      });
    });
    el.addEventListener('click', function(e){ if(e.target.closest('.q-option, .q-actions-bar, a')) return; updateSatellite(el); });
    var sk = el.querySelector('.q-show-key'); if(sk) sk.addEventListener('click', function(){ updateSatellite(el); });
    var share = el.querySelector('[data-action="q-share"]');
    if(share) share.addEventListener('click', function(){
      var url = APP;
      var ok = false;
      var fim = function(){ toast(ok ? 'Link da questão copiado.' : 'Não consegui copiar. O link é: ' + url, ok ? 'success' : 'warn'); if(ok){ share.classList.add('is-copiado'); setTimeout(function(){ share.classList.remove('is-copiado'); }, 1600); } evento('compartilhou', { q: sec.getAttribute('data-questao') }); };
      if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(function(){ ok = true; fim(); }, function(){ fim(); }); }
      else { try{ var ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); }catch(_){ } fim(); }
    });
    el.querySelectorAll('[data-action="q-data"], [data-action="q-comments"]').forEach(function(b){ b.addEventListener('click', irParaOApp); });
  });

  if(verifyBtn) verifyBtn.addEventListener('click', function(){
    if(estouLogado){ irParaOApp(); return; }
    var pend = itens.filter(function(el){ var d = dados[el.getAttribute('data-item-id')]; return d && d.selected != null && !d.verified; });
    if(!pend.length) return;
    verifyBtn.disabled = true; var txt = verifyBtn.textContent; verifyBtn.textContent = 'Conferindo…';
    corrigir(pend.map(function(el){ return { item: el.getAttribute('data-item-id'), marcado: dados[el.getAttribute('data-item-id')].selected }; })).then(function(r){
      verifyBtn.textContent = txt;
      var por = {}; (r.resultados || []).forEach(function(x){ por[String(x.item)] = x; });
      var nCota = 0, nOk = 0, ultimo = null;
      pend.forEach(function(el){
        var id = el.getAttribute('data-item-id'), d = dados[id], x = por[id];
        if(x && x.status === 'ok'){
          d.verified = true; d.gabarito = x.gabarito; d.comentario = x.comentario || ''; d.anulada = !!x.anulada; d.correct = d.selected === x.gabarito;
          revealItem(el, d.correct); nOk++; ultimo = el;
        } else if(x && (x.status === 'cota' || x.status === 'cota_ip')) nCota++;
      });
      syncVerifyBar(); updateSatellite(ultimo);
      if(nCota){
        aviso('<strong>Você resolveu as ' + estado.limite + ' questões de hoje.</strong> ' + (nCota === 1 ? 'Uma questão ficou sem corrigir' : nCota + ' questões ficaram sem corrigir') + '. Com a conta gratuita são 10 por dia, com o comentário do professor. <a href="' + esc(APP_RAIZ) + '#/login?criar=1">Criar conta grátis</a>');
        convite(); evento('cota', { usadas: estado.usadas, limite: estado.limite });
      } else limparAviso();
      if(nOk) evento('corrigiu', { n: nOk, origem: 'pagina' });
    }).catch(function(e){
      verifyBtn.textContent = txt; verifyBtn.disabled = false;
      aviso('Não consegui corrigir agora (' + esc(e && e.message) + '). Tente de novo em instantes.');
    });
  });

  // ── estado do dia (o que este visitante já respondeu, no app ou aqui) ───────
  function inicial(){
    syncVerifyBar(); updateSatellite(null);
    if(estouLogado){
      if(cotaEl){ cotaEl.innerHTML = 'Você está na sua conta: <a href="' + esc(APP) + '">resolva esta questão no Banco</a>, com o seu desempenho guardado.'; cotaEl.hidden = false; }
      if(verifyBtn){ verifyBtn.textContent = 'Resolver no Banco'; verifyBtn.disabled = false; verifyBar.hidden = false; }
      return;
    }
    corrigir([]).then(function(r){
      var meus = (r.respondidas || []).filter(function(x){ return x && dados[String(x.item)]; });
      if(!meus.length) return;
      meus.forEach(function(x){ var d = dados[String(x.item)]; d.selected = (String(x.marcado || '').toUpperCase().charAt(0) === 'C') ? 'C' : 'E'; });
      // já corrigidas hoje: repetir não gasta cota e devolve gabarito e comentário
      return corrigir(meus.map(function(x){ return { item: String(x.item), marcado: dados[String(x.item)].selected }; })).then(function(r2){
        (r2.resultados || []).forEach(function(x){
          var el = sec.querySelector('.q-item[data-item-id="' + String(x.item).replace(/"/g, '') + '"]'), d = dados[String(x.item)];
          if(!el || !d || x.status !== 'ok') return;
          d.verified = true; d.gabarito = x.gabarito; d.comentario = x.comentario || ''; d.anulada = !!x.anulada; d.correct = d.selected === x.gabarito;
          revealItem(el, d.correct);
        });
        syncVerifyBar(); updateSatellite(null);
      });
    }).catch(function(){ });
    evento('pagina', { q: sec.getAttribute('data-questao') });
  }
  inicial();
})();
