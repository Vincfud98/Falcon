/* ═════════════════════════════
   FALCON · HERÓI POR QUADROS — vídeo aéreo do Itamaraty dirigido pelo scroll
   (FRAMES.count = 0 → cena provisória desenhada). Atos/placa vêm de LANDING.hero.
   ═════════════════════════════ */
(function(){
  const FRAMES = { dir: '__FRAMES__', dirM: '__FRAMES_M__', count: __COUNT__, ext: 'webp' };
  if(new URLSearchParams(location.search).get('editar') === '1') return;   // no editor o herói é um roteiro parado (landing-runtime)
  const ATOS = [0.24, 0.56];   // pontos do vídeo (10,96 s): lago → Meteoro → jardim
  const hero = document.getElementById('top'), canvas = document.getElementById('heroCanvas'), tag = document.getElementById('heroPreviewTag'), scrollHint = document.getElementById('scrollHint');
  if(!hero || !canvas) return;
  const ctx = canvas.getContext('2d');
  let panels = [], plaqueYear, plaqueName, plaqueDesc;
  function reler(){ panels = Array.from(document.querySelectorAll('.panel')); plaqueYear = document.getElementById('plaqueYear'); plaqueName = document.getElementById('plaqueName'); plaqueDesc = document.getElementById('plaqueDesc'); lastP = -1; onScroll(); }
  const reduzir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1;
  function medir(){ dpr = Math.min(2, window.devicePixelRatio || 1); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  const imgs = []; let temQuadros = FRAMES.count > 0;
  const dirQuadros = (window.innerWidth <= 860) ? FRAMES.dirM : FRAMES.dir;
  function nomeQuadro(i){ return dirQuadros + '/' + String(i).padStart(4, '0') + '.' + FRAMES.ext; }
  if(temQuadros){
    if(tag) tag.remove();
    let prox = 1;
    const carregarLote = function(){
      const fim = Math.min(FRAMES.count, prox + 5);
      for(; prox <= fim; prox++){
        const i = prox; const im = new Image(); im.decoding = 'async';
        im.onload = () => { if(i === 1 || Math.abs(i - 1 - ultimo * (FRAMES.count - 1)) < 1) desenhar(ultimo); if(prox <= FRAMES.count) carregarLote(); };
        im.onerror = () => { if(prox <= FRAMES.count) carregarLote(); };
        im.src = nomeQuadro(i); imgs[i - 1] = im;
      }
    };
    carregarLote();
  }
  function desenharQuadro(p){
    let idx = Math.min(FRAMES.count, Math.max(1, Math.round(p * (FRAMES.count - 1)) + 1));
    let im = imgs[idx - 1];
    if(!im || !im.complete || !im.naturalWidth){ let j = idx - 1; while(j >= 0 && !(imgs[j] && imgs[j].complete && imgs[j].naturalWidth)) j--; if(j < 0){ cena(p); return; } im = imgs[j]; }
    const r = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * r, h = im.naturalHeight * r;
    ctx.clearRect(0, 0, W, H); ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
  }
  const ease = t => t < .5 ? 2*t*t : -1 + (4 - 2*t) * t;
  function cena(p){
    ctx.clearRect(0, 0, W, H);
    const horizonte = H * (0.58 - 0.16 * ease(Math.min(1, p / 0.7)));
    const sky = ctx.createLinearGradient(0, 0, 0, horizonte); sky.addColorStop(0, '#07080b'); sky.addColorStop(0.7, '#0d1119'); sky.addColorStop(1, '#1a1a1c'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizonte);
    const haze = ctx.createRadialGradient(W * 0.62, horizonte, 0, W * 0.62, horizonte, W * 0.7); haze.addColorStop(0, 'rgba(200,169,126,.22)'); haze.addColorStop(1, 'rgba(200,169,126,0)'); ctx.fillStyle = haze; ctx.fillRect(0, 0, W, H);
    const esc = 1 + 0.55 * ease(Math.min(1, p / 0.75)), baseY = horizonte + 2, cx = W * 0.62, larg = Math.min(W * 0.9, 900) * esc, alt = larg * 0.22, nArcos = 9, passo = larg / nArcos;
    ctx.save(); ctx.translate(cx - larg / 2, baseY - alt); ctx.fillStyle = 'rgba(238,232,220,.06)'; ctx.fillRect(0, 0, larg, alt); ctx.strokeStyle = 'rgba(200,169,126,.55)'; ctx.lineWidth = 1;
    for(let i = 0; i < nArcos; i++){ const x = i * passo, w = passo * 0.78, h = alt * 0.82; ctx.beginPath(); ctx.moveTo(x + (passo - w) / 2, alt); ctx.lineTo(x + (passo - w) / 2, alt - h + w * 0.5); ctx.arc(x + passo / 2, alt - h + w * 0.5, w / 2, Math.PI, 0); ctx.lineTo(x + (passo + w) / 2, alt); ctx.stroke(); }
    ctx.strokeRect(0, 0, larg, alt); ctx.restore();
    const agua = ctx.createLinearGradient(0, horizonte, 0, H); agua.addColorStop(0, '#14202b'); agua.addColorStop(0.5, '#0e1821'); agua.addColorStop(1, '#08090b'); ctx.fillStyle = agua; ctx.fillRect(0, horizonte, W, H - horizonte);
    ctx.strokeStyle = 'rgba(200,169,126,.10)'; for(let i = 0; i < 14; i++){ const y = horizonte + 18 + i * ((H - horizonte) / 14) * (0.6 + 0.4 * (i / 14)); ctx.beginPath(); for(let x = -60; x <= W + 60; x += 30){ const yy = y + Math.sin((x + p * 400 + i * 37) / 48) * 1.6; if(x === -60) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke(); }
    const met = Math.max(0, Math.min(1, (p - 0.18) / 0.5));
    if(met > 0 && met < 1){ const mx = W * (1.15 - 1.05 * met), my = horizonte + (H - horizonte) * 0.42, ms = Math.min(W, 1200) * (0.12 + 0.16 * met); ctx.save(); ctx.translate(mx, my); for(let i = 0; i < 5; i++){ ctx.save(); ctx.rotate(-0.5 + i * 0.28); ctx.fillStyle = 'rgba(240,236,228,.8)'; ctx.beginPath(); ctx.ellipse(0, -ms * 0.15, ms * 0.55, ms * 0.14, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } ctx.restore(); }
  }
  let ultimo = 0, ticking = false, lastP = -1;
  function desenhar(p){ if(temQuadros) desenharQuadro(p); else cena(p); }
  function update(){
    const rect = hero.getBoundingClientRect(), scrollable = hero.offsetHeight - window.innerHeight;
    let p = scrollable > 0 ? (-rect.top) / scrollable : 0; p = Math.max(0, Math.min(1, p)); ultimo = p;
    if(Math.abs(p - lastP) >= 0.0015 || lastP < 0){
      lastP = p; desenhar(reduzir ? 0.5 : p);
      if(scrollHint) scrollHint.classList.toggle('fade', p > 0.02);
      let act = 0; if(p >= ATOS[0] && p < ATOS[1]) act = 1; else if(p >= ATOS[1]) act = 2;
      panels.forEach((pl, i) => pl.classList.toggle('on', i === act));
      const a = ((window.LANDING && window.LANDING.hero && window.LANDING.hero.placa) || [])[act];
      if(a && plaqueYear && plaqueYear.textContent !== a.year){ plaqueYear.textContent = a.year || ''; plaqueName.textContent = a.name || ''; plaqueDesc.textContent = a.desc || ''; }
    }
    ticking = false;
  }
  function onScroll(){ if(!ticking){ requestAnimationFrame(update); ticking = true; } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { medir(); lastP = -1; onScroll(); }, { passive: true });
  medir(); reler(); update();
  window.__falconHero = { update: update, reler: reler };
})();
/* GALERIA DE CURSOS — a parede anda para o lado enquanto você rola */
(function(){
  const sec = document.getElementById('cursos'); if(!sec) return;
  if(new URLSearchParams(location.search).get('editar') === '1') return;   // no editor a galeria é uma grade parada
  let ticking = false;
  function update(){
    ticking = false; const wall = document.getElementById('galeriaWall'); if(!wall) return;
    if(window.innerWidth <= 860){ wall.style.transform = ''; return; }
    const band = wall.parentElement; if(band && band.clientHeight + 'x' + band.clientWidth !== chaveMedida) ajustar();
    const rect = sec.getBoundingClientRect(), scrollable = sec.offsetHeight - window.innerHeight;
    let p = scrollable > 0 ? (-rect.top) / scrollable : 0; p = Math.max(0, Math.min(1, p));
    const max = Math.max(0, wall.scrollWidth - window.innerWidth);
    wall.style.transform = 'translate3d(' + (-p * max).toFixed(1) + 'px,0,0)';
  }
  // A largura da obra vem do CSS (limite por 100cqh); como a placa cresce quando
  // estreita, a altura real é medida e a obra encolhe até caber na faixa.
  let chaveMedida = '';
  function ajustar(){
    const wall = document.getElementById('galeriaWall'), band = wall && wall.parentElement; if(!wall || !band) return;
    // a faixa muda de tamanho (janela, fontes, re-render): observar é mais seguro que o evento resize
    if(!band.__ro && window.ResizeObserver){ band.__ro = new ResizeObserver(() => { if(band.clientHeight + 'x' + band.clientWidth !== chaveMedida) ajustar(); }); band.__ro.observe(band); }
    chaveMedida = band.clientHeight + 'x' + band.clientWidth;
    wall.style.removeProperty('--obra-w');
    if(window.innerWidth <= 860 || document.body.classList.contains('ed-on')) return;
    const obras = Array.prototype.slice.call(wall.querySelectorAll('.obra')); if(!obras.length) return;
    const alvo = band.clientHeight - (band.clientHeight < 640 ? 44 : 72);   // folga acima e abaixo (menor em telas baixas)
    let w = obras[0].getBoundingClientRect().width;
    for(let k = 0; k < 4; k++){
      const alt = Math.max.apply(null, obras.map(o => o.offsetHeight));
      if(alt <= alvo || w <= 200) break;
      w = Math.max(200, Math.floor(w * alvo / alt)); wall.style.setProperty('--obra-w', w + 'px');
    }
  }
  function onScroll(){ if(!ticking){ requestAnimationFrame(update); ticking = true; } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { ajustar(); onScroll(); }, { passive: true });
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => { ajustar(); update(); });
  ajustar(); update();
  window.__falconGaleria = { update: update, ajustar: ajustar };
})();
