/* ═════════════════════════════════════════════════
   FALCON · DEMONSTRAÇÃO — player (modal, painéis sob demanda, interações)
   Adaptado do protótipo (historia-do-brasil-v7): o markup vem de DemoRender e o
   conteúdo de LANDING.demo. Re-ligado a cada render() da landing (__demoPlayerBind).
   ═════════════════════════════════════════════════ */
(function(){
  const PREV = '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>', NEXT = '<svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg>';
  const SEEN = new Set(); let playerMounted = false;
  const dados = () => (window.LANDING && window.LANDING.demo) || {};
  const painelDe = k => ((dados().paineis || {})[k]) || {};
  const ordem = () => window.DemoRender ? window.DemoRender.ordem(dados()) : [];

  function mountPanel(key){
    const panelsEl = document.getElementById('ppPanels'); if(!panelsEl || !window.DemoRender) return;
    if(panelsEl.querySelector('[data-panel="' + key + '"]')) return;
    const wrap = document.createElement('div'); wrap.className = 'pp-panel'; wrap.setAttribute('data-panel', key);
    wrap.innerHTML = window.DemoRender.painel(key, dados(), window.__landingH, false);
    const ord = ordem(), i = ord.indexOf(key), prev = ord[i - 1], next = ord[i + 1];
    const nav = document.createElement('div'); nav.className = 'block-nav-row';
    nav.innerHTML = (prev ? '<button class="block-nav-btn ghost" data-goto="' + prev + '" type="button">' + PREV + 'Bloco anterior</button>' : '<span></span>') + (next ? '<button class="block-nav-btn" data-goto="' + next + '" type="button">Próximo bloco' + NEXT + '</button>' : '');
    wrap.appendChild(nav); panelsEl.appendChild(wrap); wireInteractions(wrap);
  }
  function switchTo(key){
    document.querySelectorAll('#ppStage .pp-side-block').forEach(b => b.classList.toggle('active', b.getAttribute('data-block') === key));
    mountPanel(key);
    document.querySelectorAll('#ppStage .pp-panel').forEach(p => p.classList.toggle('active', p.getAttribute('data-panel') === key));
    SEEN.add(key);
    const sb = document.querySelector('#ppStage .pp-side-block[data-block="' + key + '"]'); if(sb) sb.classList.add('seen');
    const progressEl = document.getElementById('ppProgress'); if(progressEl) progressEl.textContent = SEEN.size + ' / ' + ordem().length;
    const main = document.getElementById('ppMain'); if(main) main.scrollTop = 0;
  }

  function wireInteractions(root){
    root.querySelectorAll('.carousel-frame').forEach(frame => {
      const slides = Array.from(frame.querySelectorAll(':scope > .carousel-stage > .carousel-slide')), dots = Array.from(frame.querySelectorAll('.carousel-dot'));
      const prev = frame.querySelector('.carousel-prev'), next = frame.querySelector('.carousel-next'), counter = frame.querySelector('[data-current]');
      let idx = 0;
      function show(n){ idx = (n + slides.length) % slides.length; slides.forEach((s, i) => s.classList.toggle('active', i === idx)); dots.forEach((d, i) => d.classList.toggle('active', i === idx)); if(counter) counter.textContent = idx + 1; }
      if(prev) prev.addEventListener('click', () => show(idx - 1)); if(next) next.addEventListener('click', () => show(idx + 1));
      dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
    });
    const sat = root.querySelector('.tg-satellite');
    if(sat){
      const gal = painelDe('texto').galeria || [];
      const slides = Array.from(sat.querySelectorAll('.tg-satellite-slide')), dots = Array.from(sat.querySelectorAll('.tg-satellite-dot'));
      const prev = sat.querySelector('.tg-satellite-prev'), next = sat.querySelector('.tg-satellite-next'), cur = sat.querySelector('[data-current]'), cap = sat.querySelector('[data-caption]');
      let idx = 0;
      function show(n){ if(!slides.length) return; idx = (n + slides.length) % slides.length; slides.forEach((s, i) => s.classList.toggle('active', i === idx)); dots.forEach((d, i) => d.classList.toggle('active', i === idx)); if(cur) cur.textContent = idx + 1; if(cap) cap.textContent = (gal[idx] || {}).legenda || ''; }
      if(prev) prev.addEventListener('click', () => show(idx - 1)); if(next) next.addEventListener('click', () => show(idx + 1));
      dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
    }
    root.querySelectorAll('.tl-fid-group').forEach(group => {
      const side = group.querySelector('.tl-fid-side'); if(!side) return;
      const img = side.querySelector('img'), cap = side.querySelector('.tl-fid-side-cap');
      group.querySelectorAll('.tl-fid-item').forEach(item => item.addEventListener('mouseenter', () => { const thumb = item.getAttribute('data-thumb'), title = item.getAttribute('data-title'); if(thumb){ img.src = thumb; side.classList.add('has-thumb'); if(cap) cap.textContent = title; } }));
    });
    root.querySelectorAll('.tb-audio-btn').forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('playing')));
    // balão do glossário no texto ([[Termo]] → .pp-frag-term[data-frag=índice])
    root.querySelectorAll('.pp-frag-term').forEach(term => {
      term.addEventListener('mouseenter', () => {
        const f = (painelDe('texto').termos || [])[parseInt(term.getAttribute('data-frag'), 10)]; if(!f) return;
        const card = document.getElementById('ppFragCard'), img = document.getElementById('ppFragCardImg'); if(!card) return;
        document.getElementById('ppFragCardTerm').textContent = f.termo || ''; document.getElementById('ppFragCardDef').textContent = f.def || '';
        if(img) img.hidden = true;
        const r = term.getBoundingClientRect(); let left = r.left; if(left + 340 > window.innerWidth - 16) left = window.innerWidth - 356;
        card.style.top = (r.bottom + 8) + 'px'; card.style.left = left + 'px'; card.classList.add('open');
      });
      term.addEventListener('mouseleave', () => { const card = document.getElementById('ppFragCard'); if(card) card.classList.remove('open'); });
    });
    root.querySelectorAll('.q-item').forEach(item => {
      const correct = item.getAttribute('data-correct');
      item.querySelectorAll('.q-option').forEach(btn => btn.addEventListener('click', () => {
        const ans = btn.getAttribute('data-answer');
        item.querySelectorAll('.q-option').forEach(b => b.classList.remove('selected', 'correct', 'wrong'));
        const isRight = ans === correct; btn.classList.add(isRight ? 'correct' : 'wrong');
        if(!isRight){ const c = item.querySelector('.q-option[data-answer="' + correct + '"]'); if(c) c.classList.add('correct'); }
        const fb = item.querySelector('.q-feedback'); fb.classList.add('show'); fb.classList.remove('correct', 'wrong'); fb.classList.add(isRight ? 'correct' : 'wrong');
        fb.querySelector('.q-feedback-label').textContent = isRight ? 'Gabarito · Você acertou' : 'Gabarito · Resposta incorreta';
      }));
      const d = item.querySelector('.q-doubt'); if(d) d.addEventListener('click', () => d.classList.toggle('active'));
    });
    const essay = root.querySelector('[data-essay-item]');
    if(essay){
      const input = essay.querySelector('[data-essay-input]'), chars = essay.querySelector('[data-essay-chars]'), submit = essay.querySelector('[data-essay-submit]');
      const toggleAside = essay.querySelector('[data-essay-toggle]'), aside = essay.querySelector('[data-essay-aside]');
      const critSlider = essay.querySelector('[data-slider="criteria"]'), modelSlider = essay.querySelector('[data-slider="models"]'), scoreChip = essay.querySelector('[data-ecrit-score]');
      if(input && chars) input.addEventListener('input', () => { chars.textContent = input.value.length; });
      const slider = function(el, cls, curSel, prevSel, nextSel){
        const slides = Array.from(el.querySelectorAll('.ecrit-slide')), dots = Array.from(el.querySelectorAll('.ecrit-dot')), cur = el.querySelector(curSel), prev = el.querySelector(prevSel), next = el.querySelector(nextSel);
        let idx = 0;
        function show(n){ if(!slides.length) return; idx = (n + slides.length) % slides.length; slides.forEach((s, i) => s.classList.toggle('active', i === idx)); dots.forEach((d, i) => d.classList.toggle('active', i === idx)); if(cur) cur.textContent = idx + 1; }
        if(prev) prev.addEventListener('click', () => show(idx - 1)); if(next) next.addEventListener('click', () => show(idx + 1));
        dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
      };
      if(critSlider) slider(critSlider, 'crit', '[data-ecrit-current]', '[data-ecrit-prev]', '[data-ecrit-next]');
      if(modelSlider) slider(modelSlider, 'model', '[data-emodel-current]', '[data-emodel-prev]', '[data-emodel-next]');
      essay.querySelectorAll('.eat-btn').forEach(btn => btn.addEventListener('click', () => {
        const which = btn.getAttribute('data-show');
        essay.querySelectorAll('.eat-btn').forEach(b => b.classList.toggle('active', b === btn));
        if(critSlider) critSlider.style.display = which === 'criteria' ? '' : 'none'; if(modelSlider) modelSlider.style.display = which === 'models' ? '' : 'none';
      }));
      function setAsideVisible(v){ if(!aside) return; aside.style.display = v ? '' : 'none'; if(toggleAside) toggleAside.textContent = v ? 'Ocultar critérios' : 'Mostrar critérios'; }
      if(toggleAside) toggleAside.addEventListener('click', () => setAsideVisible(aside.style.display === 'none'));
      if(submit) submit.addEventListener('click', () => {
        const C = painelDe('discursiva').criterios || [];
        const total = C.reduce((s, c) => s + (Number(c.score) || 0), 0), max = C.reduce((s, c) => s + (Number(c.max) || 0), 0);
        if(scoreChip){ scoreChip.textContent = total.toFixed(1).replace('.', ',') + ' / ' + max + ' pts'; scoreChip.hidden = false; }
        if(critSlider) critSlider.querySelectorAll('.ecrit-slide').forEach((slide, ci) => {
          const c = C[ci]; if(!c) return;
          const existing = slide.querySelector('.essay-criterion-eval'); if(existing) existing.remove();
          const html = '<div class="essay-criterion-eval"><div class="ecev-label">Sua avaliação</div><div class="ecev-score">' + (Number(c.score) || 0).toFixed(1).replace('.', ',') + ' / ' + c.max + ' pts</div><div class="ecev-comment">' + (window.__landingH ? window.__landingH.rico(c.comment) : '') + '</div></div>';
          const model = slide.querySelector('.essay-criterion-model'); if(model) model.insertAdjacentHTML('beforebegin', html); else slide.insertAdjacentHTML('beforeend', html);
        });
        setAsideVisible(true);
        essay.querySelectorAll('.eat-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-show') === 'criteria'));
        if(critSlider) critSlider.style.display = ''; if(modelSlider) modelSlider.style.display = 'none';
      });
    }
    root.querySelectorAll('.fc-card').forEach(card => {
      card.addEventListener('click', e => { if(e.target.closest('.fc-btn')) return; card.classList.toggle('flipped'); });
      card.querySelectorAll('.fc-btn').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); const status = btn.getAttribute('data-status'); card.classList.remove('learning', 'mastered'); card.classList.add(status); card.querySelectorAll('.fc-btn').forEach(b => b.classList.toggle('active', b === btn)); }));
    });
    root.querySelectorAll('[data-goto]').forEach(btn => btn.addEventListener('click', () => switchTo(btn.getAttribute('data-goto'))));
  }

  function openModal(){
    const m = document.getElementById('vnpModal'); if(!m) return;
    if(!playerMounted){ const first = ordem()[0]; if(first) switchTo(first); playerMounted = true; }
    m.classList.add('open'); document.body.classList.add('vnp-modal-open');
    const c = document.getElementById('vnpModalClose'); setTimeout(() => { if(c) c.focus(); }, 50);
  }
  function closeModal(){
    const m = document.getElementById('vnpModal'); if(!m) return;
    m.classList.remove('open'); document.body.classList.remove('vnp-modal-open');
    const b = document.getElementById('vnpLaunchBtn'); if(b) b.focus();
  }
  // (re)liga a seção depois de cada render da landing: o DOM da seção é novo, os listeners antigos morrem com ele
  function bind(){
    SEEN.clear(); playerMounted = false;
    const launch = document.getElementById('vnpLaunchBtn'), close = document.getElementById('vnpModalClose'), modal = document.getElementById('vnpModal');
    if(launch) launch.addEventListener('click', openModal);
    if(close) close.addEventListener('click', closeModal);
    if(modal) modal.addEventListener('click', e => { if(e.target === modal) closeModal(); });
    document.querySelectorAll('#ppStage .pp-side-block').forEach(btn => btn.addEventListener('click', () => switchTo(btn.getAttribute('data-block'))));
  }
  document.addEventListener('keydown', e => { const m = document.getElementById('vnpModal'); if(e.key === 'Escape' && m && m.classList.contains('open')) closeModal(); });

  /* ─── barra de contexto do texto (grifo / sublinhar / nota / flashcard) — elementos fixos da página ─── */
  const toolbar = document.getElementById('ppCtxToolbar'), toast = document.getElementById('ppToast');
  let currentRange = null;
  function showToast(msg){ if(!toast) return; toast.textContent = msg; toast.classList.add('show'); clearTimeout(showToast._t); showToast._t = setTimeout(() => toast.classList.remove('show'), 2200); }
  function getActiveTbBody(){ const activePanel = document.querySelector('#ppStage .pp-panel.active'); return activePanel ? activePanel.querySelector('.tb-body') : null; }
  function rangeInside(range, container){ if(!range || range.collapsed || !container) return false; let node = range.commonAncestorContainer; while(node){ if(node === container) return true; node = node.parentNode; } return false; }
  function positionToolbar(range){
    const rect = range.getBoundingClientRect(), tw = toolbar.offsetWidth || 260, th = toolbar.offsetHeight || 38;
    let left = rect.left + rect.width / 2 - tw / 2, top = rect.top - th - 10; if(top < 8) top = rect.bottom + 10;
    left = Math.max(8, Math.min(window.innerWidth - tw - 8, left)); toolbar.style.left = left + 'px'; toolbar.style.top = top + 'px';
  }
  if(toolbar){
    document.addEventListener('selectionchange', () => {
      const body = getActiveTbBody(); if(!body){ toolbar.classList.remove('visible'); return; }
      const sel = window.getSelection(); if(!sel || sel.rangeCount === 0 || sel.isCollapsed){ toolbar.classList.remove('visible'); return; }
      const r = sel.getRangeAt(0); if(!rangeInside(r, body) || !r.toString().trim()){ toolbar.classList.remove('visible'); return; }
      currentRange = r.cloneRange(); toolbar.classList.add('visible'); setTimeout(() => positionToolbar(r), 0);
    });
    toolbar.addEventListener('mousedown', e => e.preventDefault());
    function wrapSelection(hlType, opts){
      if(!currentRange) return;
      try{ const span = document.createElement('span'); span.className = 'hl-mark'; span.setAttribute('data-hl', hlType); if(opts && opts.note) span.setAttribute('data-note', opts.note);
        span.appendChild(currentRange.extractContents()); currentRange.insertNode(span); window.getSelection().removeAllRanges(); toolbar.classList.remove('visible'); currentRange = null;
      }catch(err){ console.warn('Highlight wrap failed:', err); }
    }
    function clearHighlightAt(range){
      if(!range) return; let node = range.commonAncestorContainer; while(node && node.nodeType === 3) node = node.parentNode;
      while(node && !(node.classList && node.classList.contains('hl-mark'))){ if(!node.parentNode || (node.classList && node.classList.contains('tb-body'))){ node = null; break; } node = node.parentNode; }
      if(node && node.classList && node.classList.contains('hl-mark')){ const parent = node.parentNode; while(node.firstChild) parent.insertBefore(node.firstChild, node); parent.removeChild(node); if(parent.normalize) parent.normalize(); }
      window.getSelection().removeAllRanges(); toolbar.classList.remove('visible'); currentRange = null;
    }
    toolbar.querySelectorAll('.pp-ctx-color').forEach(btn => btn.addEventListener('click', () => wrapSelection(btn.getAttribute('data-color'))));
    toolbar.querySelectorAll('.pp-ctx-action').forEach(btn => btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      if(action === 'clear'){ clearHighlightAt(currentRange); return; }
      if(action === 'underline'){ wrapSelection('underline'); return; }
      if(action === 'flashcard'){ const snippet = currentRange ? currentRange.toString().trim().slice(0, 60) : ''; wrapSelection('flashcard'); showToast('Flashcard criado' + (snippet ? ' · "' + snippet + (snippet.length === 60 ? '…' : '') + '"' : '')); return; }
      if(action === 'note'){ const note = prompt('Sua nota para este trecho:'); if(note && note.trim()){ wrapSelection('note', { note: note.trim() }); showToast('Nota salva · passe o mouse sobre o trecho para ler'); } else toolbar.classList.remove('visible'); }
    }));
    document.addEventListener('mousedown', e => { if(toolbar.contains(e.target)) return; const body = getActiveTbBody(); if(body && body.contains(e.target)) return; toolbar.classList.remove('visible'); });
    window.addEventListener('scroll', () => toolbar.classList.remove('visible'), { passive: true });
  }
  window.__demoPlayerBind = bind; bind();
})();
