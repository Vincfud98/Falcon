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
    // Segue o design system (ubique-saas-components.html): tokens da página com
    // fallback do tema escuro, raio 3px, Outfit 300, botões btn-primary/btn-secondary.
    var E = 'var(--ease,cubic-bezier(.22,1,.36,1))';
    styleEl.textContent =
      '.ubqc{position:fixed;left:1rem;right:1rem;bottom:1.5rem;z-index:2147483600;max-width:760px;margin:0 auto;' +
      'background:var(--bg-elev,#181a20);color:var(--text,#f0ece4);' +
      'border:1px solid var(--accent-border,rgba(200,169,126,.22));border-radius:var(--radius,3px);' +
      'padding:1.1rem 1.4rem;box-shadow:0 20px 40px -10px rgba(0,0,0,.5),0 0 0 1px var(--accent-xlo,rgba(200,169,126,.06));' +
      'font-family:var(--sans,"Outfit",system-ui,sans-serif);font-weight:300;' +
      'display:flex;gap:1.4rem;align-items:center;flex-wrap:wrap;animation:ubqc-in .35s ' + E + '}' +
      '@keyframes ubqc-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}' +
      '.ubqc.ubqc-out{opacity:0;transform:translateY(20px);transition:opacity .3s ' + E + ',transform .35s ' + E + '}' +
      '.ubqc-txt{flex:1;min-width:240px}' +
      '.ubqc-k{display:block;margin-bottom:.4rem;font-size:var(--fs-chrome,.62rem);letter-spacing:.28em;' +
      'text-transform:uppercase;color:var(--accent,#c8a97e)}' +
      '.ubqc-p{font-size:.82rem;line-height:1.7;letter-spacing:.02em;color:var(--text-dim,rgba(240,236,228,.5))}' +
      '.ubqc-p a{color:var(--accent,#c8a97e);text-decoration:none;border-bottom:1px solid var(--accent-border,rgba(200,169,126,.22));' +
      'transition:border-color .35s ' + E + '}' +
      '.ubqc-p a:hover{border-color:var(--accent,#c8a97e)}' +
      '.ubqc-btns{display:flex;gap:.6rem;flex-wrap:wrap}' +
      '.ubqc-btn{display:inline-flex;align-items:center;cursor:pointer;white-space:nowrap;' +
      'padding:.48rem 1rem;border-radius:var(--radius,3px);border:1px solid transparent;background:transparent;' +
      'font-family:var(--sans,"Outfit",system-ui,sans-serif);font-weight:300;font-size:.65rem;letter-spacing:.16em;' +
      'text-transform:uppercase;transition:all .35s ' + E + '}' +
      '.ubqc-btn:focus-visible{outline:1px solid var(--accent,#c8a97e);outline-offset:3px}' +
      '.ubqc-ok{background:var(--accent,#c8a97e);color:var(--bg,#0b0c0f);border-color:var(--accent,#c8a97e)}' +
      '.ubqc-ok:hover{background:transparent;color:var(--accent,#c8a97e)}' +
      '.ubqc-no{color:var(--accent,#c8a97e);border-color:var(--accent-border,rgba(200,169,126,.22))}' +
      '.ubqc-no:hover{background:var(--accent-lo,rgba(200,169,126,.12));border-color:var(--accent,#c8a97e)}' +
      '@media(max-width:560px){.ubqc{flex-direction:column;align-items:stretch;gap:1rem}.ubqc-btns{justify-content:flex-end}}';
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
      '<div class="ubqc-txt"><span class="ubqc-k">Sua privacidade</span><p class="ubqc-p">Usamos cookies para a plataforma funcionar e, ' +
      'com a sua permissão, para medir e melhorar nossos anúncios (Meta/Facebook). ' +
      'Você escolhe. <a href="https://www.grupoubique.com.br" target="_blank" rel="noopener">Política de privacidade</a></p></div>' +
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
