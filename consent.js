/* ════════════════════════════════════════════════════════════════════════
   Banner de consentimento (LGPD) — Ubique — 2026-10-19
   Controla o rastreamento de MARKETING (Meta/Facebook + Consent Mode do GTM).
   Cookies essenciais e a análise first-party (track.js → nosso banco) seguem
   como interesse legítimo. Guarda a escolha em localStorage (ubq_consent).
   Inclua ANTES do GTM no <head>: <script src="consent.js"></script>
   ════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var KEY = 'ubq_consent';            // 'granted' | 'denied'
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch(_){}
  var granted = stored === 'granted';
  var denied  = stored === 'denied';

  // Flag global lida pelo window.ubqPixel (nossos eventos Meta) e pela futura CAPI.
  window.__ubqConsent = granted ? true : (denied ? false : null);

  // ── Consent Mode (Google/GTM): padrão NEGADO antes do GTM processar ──
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', wait_for_update: 500
  });

  function fbqSafe(action){ try { if(typeof window.fbq === 'function') window.fbq('consent', action); } catch(_){} }
  function syncFbq(){ fbqSafe(window.__ubqConsent === true ? 'grant' : 'revoke'); }

  function applyGrant(){
    window.__ubqConsent = true;
    gtag('consent', 'update', { ad_storage:'granted', ad_user_data:'granted', ad_personalization:'granted', analytics_storage:'granted' });
    fbqSafe('grant');
  }
  function applyDeny(){ window.__ubqConsent = false; fbqSafe('revoke'); }

  if(granted) applyGrant();
  // Aplica a escolha ao fbq assim que o pixel (via GTM) carregar.
  setTimeout(syncFbq, 1500); setTimeout(syncFbq, 4000);

  function choose(val){
    try { localStorage.setItem(KEY, val); } catch(_){}
    if(val === 'granted') applyGrant(); else applyDeny();
    hide();
  }

  var el = null, styleEl = null;
  function hide(){
    if(!el) return;
    el.classList.add('ubqc-out');
    setTimeout(function(){ if(el && el.parentNode) el.parentNode.removeChild(el); el = null; }, 320);
  }

  function injectStyle(){
    if(styleEl) return;
    styleEl = document.createElement('style');
    styleEl.textContent =
      '.ubqc{position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:2147483600;max-width:740px;margin:0 auto;' +
      'background:#15161a;color:#e8e3d9;border:1px solid rgba(200,169,126,.25);border-radius:10px;' +
      'padding:1rem 1.2rem;box-shadow:0 14px 44px rgba(0,0,0,.55);' +
      'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:.86rem;line-height:1.55;' +
      'display:flex;gap:1.1rem;align-items:center;flex-wrap:wrap;animation:ubqc-in .32s ease}' +
      '@keyframes ubqc-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}' +
      '.ubqc.ubqc-out{opacity:0;transform:translateY(14px);transition:all .32s ease}' +
      '.ubqc-txt{flex:1;min-width:230px;color:#cfc7b8}' +
      '.ubqc-txt strong{color:#e8e3d9;font-weight:600}' +
      '.ubqc-txt a{color:#c8a97e;text-decoration:underline}' +
      '.ubqc-btns{display:flex;gap:.5rem;flex-wrap:wrap}' +
      '.ubqc-btn{cursor:pointer;border-radius:6px;padding:.55rem 1.05rem;font-size:.82rem;font-weight:600;' +
      'border:1px solid transparent;font-family:inherit;transition:all .13s ease}' +
      '.ubqc-ok{background:#c8a97e;color:#1a1206;border-color:#c8a97e}' +
      '.ubqc-ok:hover{filter:brightness(1.08)}' +
      '.ubqc-no{background:transparent;color:#cfc7b8;border-color:rgba(200,169,126,.3)}' +
      '.ubqc-no:hover{background:rgba(200,169,126,.1)}' +
      '@media(max-width:560px){.ubqc{flex-direction:column;align-items:stretch}.ubqc-btns{justify-content:flex-end}}';
    document.head.appendChild(styleEl);
  }

  function render(){
    if(stored || el) return;   // já decidiu, ou já está na tela
    injectStyle();
    el = document.createElement('div');
    el.className = 'ubqc';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Consentimento de cookies');
    el.innerHTML =
      '<div class="ubqc-txt"><strong>Sua privacidade.</strong> Usamos cookies para a plataforma funcionar e, ' +
      'com a sua permissão, para medir e melhorar nossos anúncios (Meta/Facebook). ' +
      'Você escolhe. <a href="https://www.grupoubique.com.br" target="_blank" rel="noopener">Política de privacidade</a>.</div>' +
      '<div class="ubqc-btns">' +
      '<button type="button" class="ubqc-btn ubqc-no" data-ubqc="no">Só essenciais</button>' +
      '<button type="button" class="ubqc-btn ubqc-ok" data-ubqc="ok">Aceitar</button></div>';
    document.body.appendChild(el);
    el.querySelector('[data-ubqc="ok"]').addEventListener('click', function(){ choose('granted'); });
    el.querySelector('[data-ubqc="no"]').addEventListener('click', function(){ choose('denied'); });
  }

  // Reabrir o banner depois (ex.: link "Cookies" no rodapé): window.ubqConsentReabrir()
  window.ubqConsentReabrir = function(){ try { localStorage.removeItem(KEY); } catch(_){} stored = null; render(); };

  if(!stored){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
    else render();
  }
})();
