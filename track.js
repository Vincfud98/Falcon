/* Rastreamento de funil da Ubique (marketing web analytics) — 2026-10-15
   Captura, nas páginas públicas do funil (landing, inscrição):
   · pageview (sessão única, dispositivo, canal pela origem/referrer, UTMs)
   · clique de compra (elementos [data-comprar] / links de checkout)
   · evento de lead / fascículo (disparado pelo formulário)
   Grava via RPC crm.registrar_evento (SECURITY DEFINER, anon). Liga o
   visitante ao lead quando ele preenche o formulário (mesmo navegador).
   Sem dependências — fetch puro ao PostgREST. */
(function(){
  'use strict';
  var SB_URL = 'https://kluqjqojxzpuiauuidwx.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsdXFqcW9qeHpwdWlhdXVpZHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTU0NDMsImV4cCI6MjA4NTE5MTQ0M30.pY8-vlMFmKAZs5MROg8OJGzsNJGD3Gg0JXbulZmpuS4';

  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }

  // Visitante: id persistente por navegador. Sessão: por visita.
  var vid, sid;
  try { vid = localStorage.getItem('ubq_vid'); if(!vid){ vid = uid(); localStorage.setItem('ubq_vid', vid); } } catch(_){ vid = uid(); }
  try { sid = sessionStorage.getItem('ubq_sid'); if(!sid){ sid = uid(); sessionStorage.setItem('ubq_sid', sid); } } catch(_){ sid = uid(); }

  var device = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  var params = new URLSearchParams(location.search);

  // Canal: UTM/click-id primeiro, depois o referrer, senão "direct".
  function detectChannel(){
    var us = (params.get('utm_source') || '').toLowerCase();
    if(params.get('fbclid') || /instagram|facebook|\bfb\b|ig\b/.test(us)) return 'instagram_facebook';
    if(params.get('gclid') || /google|adwords|gad/.test(us)) return 'google';
    if(/bing/.test(us)) return 'bing';
    if(us) return us;
    var r = document.referrer || '';
    if(!r) return 'direct';
    try {
      var h = new URL(r).hostname.replace(/^www\./, '');
      if(/instagram|facebook|fb\.|l\.facebook|lm\.facebook/.test(h)) return 'instagram_facebook';
      if(/google\./.test(h)) return 'google';
      if(/bing\./.test(h)) return 'bing';
      if(h === location.hostname.replace(/^www\./, '')) return 'direct';
      return h;
    } catch(_){ return 'direct'; }
  }
  var channel = detectChannel();

  // Guarda o canal de aquisição no navegador (first-touch) para o clique de
  // compra no portal (index.html) poder atribuir a origem certa. Só sobrescreve
  // um "direct" antigo por um canal real; nunca apaga um canal real já gravado.
  try {
    var saved = localStorage.getItem('ubq_channel');
    if(!saved || (saved === 'direct' && channel && channel !== 'direct')) {
      localStorage.setItem('ubq_channel', channel || 'direct');
    }
  } catch(_){}

  function send(type, extra){
    extra = extra || {};
    var body = {
      p_visitor_id: vid, p_session_id: sid, p_event_type: type,
      p_channel: channel, p_device: device,
      p_url: location.pathname, p_referrer: document.referrer || null,
      p_utm_source: params.get('utm_source'), p_utm_medium: params.get('utm_medium'), p_utm_campaign: params.get('utm_campaign'),
      p_materia: extra.materia || null,
      p_meta: extra.meta || { fbclid: params.get('fbclid') || undefined, gclid: params.get('gclid') || undefined }
    };
    try {
      fetch(SB_URL + '/rest/v1/rpc/registrar_evento', {
        method: 'POST', keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
          'Content-Profile': 'crm', 'Accept-Profile': 'crm'
        },
        body: JSON.stringify(body)
      }).catch(function(){});
    } catch(_){}
  }

  // Liga este visitante a um lead já criado (carimba os eventos passados dele).
  function linkLead(clientId){
    if(!clientId) return;
    try {
      fetch(SB_URL + '/rest/v1/rpc/ligar_visitante_lead', {
        method: 'POST', keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
          'Content-Profile': 'crm', 'Accept-Profile': 'crm'
        },
        body: JSON.stringify({ p_visitor_id: vid, p_client_id: clientId })
      }).catch(function(){});
    } catch(_){}
  }

  // API pública para as páginas (ex.: o formulário dispara 'fasciculo' + linkLead).
  window.UbqTrack = { vid: vid, sid: sid, channel: channel, device: device, send: send, linkLead: linkLead };

  // Pageview automático.
  send('pageview');

  // Cliques de compra: qualquer link de checkout ou elemento marcado.
  document.addEventListener('click', function(e){
    var el = e.target && e.target.closest
      ? e.target.closest('[data-comprar], [data-track="buy"], .btn-comprar, a[href*="greenn"], a[href*="checkout"], a[href*="/store"], a[href*="pay"]')
      : null;
    if(el) send('buy_click', { materia: el.getAttribute('data-materia') || el.getAttribute('data-produto') || null });
  }, true);
})();
