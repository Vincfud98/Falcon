/* ═════════════════════════════════════════════════
   FALCON · LANDING — conteúdo por JSON + modo de edição (admin)
   A página monta cada seção a partir de LANDING (JSON). Público: lê a versão
   publicada em conteudo.platform_config.landing (fallback: LANDING_DEFAULT).
   Admin (?editar=1, dentro do admin): edita no lugar, salva rascunho, publica.
   ═════════════════════════════════════════════════ */
(function(){
  const SB_URL = '__SB_URL__', SB_KEY = '__SB_KEY__';
  const EDITAR = new URLSearchParams(location.search).get('editar') === '1';
  window.LANDING = JSON.parse(JSON.stringify(window.LANDING_DEFAULT));
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // texto rico dos títulos: só <em>, <strong>, <br>
  const rico = s => String(s == null ? '' : s).replace(/<(?!\/?(em|strong|br)\b)[^>]*>/gi, '');
  const SETA = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
  const app = () => (window.LANDING.cta && window.LANDING.cta.app) || 'index.html';
  const href = h => (!h || h === 'app') ? app() : h;
  // atributos de edição: e(path) texto simples; er(path) texto rico; lista/item
  const e = p => EDITAR ? ' data-e="' + p + '"' : '';
  const er = p => EDITAR ? ' data-e="' + p + '" data-e-html="1"' : '';
  const lista = p => EDITAR ? ' data-list="' + p + '"' : '';
  const item = () => EDITAR ? ' data-item' : '';
  const img = p => EDITAR ? ' data-img="' + p + '"' : '';
  const label = (p, txt, svg) => '<div class="s-label"' + (svg ? '' : '') + '>' + (svg || '') + '<span' + e(p) + '>' + esc(txt) + '</span></div>';

  const SVG = {
    cap: '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    video: '<svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
    prof: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4 2 8L12 17l-6.5 4 2-8L2 9h7z"/></svg>',
    prom: '<svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
    faq: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
    play: '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    janela: '<svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
    grade: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></svg>',
    predio: '<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01"/></svg>'
  };
  const cabeca = (p, sec, centro, svg) => '<div style="' + (centro ? 'text-align:center;max-width:760px;margin:0 auto' : '') + '">'
    + '<div class="s-label"' + (centro ? ' style="margin-left:auto;margin-right:auto"' : '') + '>' + svg + '<span' + e(p + '.rotulo') + '>' + esc(sec.rotulo) + '</span></div>'
    + '<h2 class="s-title"' + er(p + '.titulo') + '>' + rico(sec.titulo) + '</h2>'
    + '<div class="s-divider' + (centro ? ' center' : '') + '"></div>'
    + (sec.texto != null ? '<p class="s-body"' + (centro ? ' style="margin:0 auto"' : '') + er(p + '.texto') + '>' + rico(sec.texto) + '</p>' : '')
    + '</div>';

  const R = {};
  R.hero = function(h){
    const icones = [SVG.cap, SVG.grade, SVG.predio];
    return '<div class="stage-text"' + lista('hero.atos') + '>' + (h.atos || []).map((a, i) => '<div class="panel' + (i === 0 ? ' on' : '') + '" data-panel="' + i + '"' + item() + '>'
      + '<div class="s-label">' + icones[i % 3] + '<span' + e('hero.atos.' + i + '.rotulo') + '>' + esc(a.rotulo) + '</span></div>'
      + '<h1' + er('hero.atos.' + i + '.titulo') + '>' + rico(a.titulo) + '</h1>'
      + '<p' + er('hero.atos.' + i + '.texto') + '>' + rico(a.texto) + '</p>'
      + '<div class="cta-row">'
      + (a.cta1 ? '<a class="btn btn-primary" href="' + esc(href(a.cta1.href)) + '"' + (a.cta1.href === 'app' ? ' data-app-link' : '') + '><span' + e('hero.atos.' + i + '.cta1.label') + '>' + esc(a.cta1.label) + '</span> ' + SETA + '</a>' : '')
      + (a.cta2 ? '<a class="btn btn-ghost" href="' + esc(href(a.cta2.href)) + '"' + (a.cta2.href === 'app' ? ' data-app-link' : '') + '><span' + e('hero.atos.' + i + '.cta2.label') + '>' + esc(a.cta2.label) + '</span></a>' : '')
      + '</div>'
      + '<div class="meta-row"' + lista('hero.atos.' + i + '.meta') + '>' + (a.meta || []).map((m, k) => '<span' + item() + e('hero.atos.' + i + '.meta.' + k) + '>' + esc(m) + '</span>').join('') + '</div>'
      + '</div>').join('') + '</div>'
      + '<div><div class="stage-plaque"><div class="plaque-corner tl"></div><div class="plaque-corner tr"></div><div class="plaque-corner bl"></div><div class="plaque-corner br"></div>'
      + '<div class="plaque-top-label"' + e('hero.placaRotulo') + '>' + esc(h.placaRotulo) + '</div>'
      + '<div class="plaque-year is-text" id="plaqueYear">' + esc((h.placa[0] || {}).year) + '</div>'
      + '<div class="plaque-event"><div class="plaque-event-name" id="plaqueName">' + esc((h.placa[0] || {}).name) + '</div><div class="plaque-event-desc" id="plaqueDesc">' + esc((h.placa[0] || {}).desc) + '</div></div>'
      + (EDITAR ? '<div class="ed-placa"' + lista('hero.placa') + '>' + (h.placa || []).map((pl, i) => '<div class="ed-placa-ato"' + item() + '><b>Ato ' + (i + 1) + '</b><span' + e('hero.placa.' + i + '.year') + '>' + esc(pl.year) + '</span><span' + e('hero.placa.' + i + '.name') + '>' + esc(pl.name) + '</span><span' + e('hero.placa.' + i + '.desc') + '>' + esc(pl.desc) + '</span></div>').join('') + '</div>' : '')
      + '</div></div>';
  };
  R.strip = s => '<div class="strip-inner"><div class="strip-label"' + e('strip.rotulo') + '>' + esc(s.rotulo) + '</div><div class="strip-logos"' + lista('strip.itens') + '>' + (s.itens || []).map((x, i) => (i ? '<span>·</span>' : '') + '<span' + item() + e('strip.itens.' + i) + '>' + esc(x) + '</span>').join('') + '</div></div>';
  R.video = v => '<div class="video-head">' + cabeca('video', v, true, SVG.video) + '</div>'
    + '<div class="video-player" data-a="3" role="button" tabindex="0" aria-label="Assistir vídeo de apresentação"' + (v.url ? ' data-video-url="' + esc(v.url) + '"' : '') + '><div class="video-content">'
    + '<div class="video-chip"><span class="video-chip-dot"></span><span' + e('video.chip') + '>' + esc(v.chip) + '</span></div>'
    + '<div class="video-center"><button class="play-btn" aria-label="Play">' + SVG.play + '</button><div class="video-caption"' + e('video.legenda') + '>' + esc(v.legenda) + '</div></div>'
    + '<div class="video-bottom"><div class="video-title"' + er('video.tituloVideo') + '>' + rico(v.tituloVideo) + '</div><div class="video-duration"' + e('video.duracao') + '>' + esc(v.duracao) + '</div></div>'
    + '</div></div>' + (EDITAR ? '<p class="ed-nota">Endereço do vídeo (mp4 ou YouTube/Vimeo): <span class="ed-url"' + e('video.url') + '>' + esc(v.url || '') + '</span></p>' : '');
  function silhueta(sigla){
    return '<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g' + esc(sigla) + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2d36"/><stop offset="1" stop-color="#0f1115"/></linearGradient></defs><rect width="400" height="500" fill="url(#g' + esc(sigla) + ')"/><circle cx="200" cy="205" r="70" fill="#3a3f4b"/><path d="M60 500 C60 380 120 320 200 320 C280 320 340 380 340 500 Z" fill="#3a3f4b"/><path d="M0 0 L400 0 L400 60 L0 130 Z" fill="rgba(200,169,126,.10)"/></svg>';
  }
  R.cursos = c => '<div class="galeria-head"><div class="s-label" style="margin-left:auto;margin-right:auto">' + SVG.prof + '<span' + e('cursos.rotulo') + '>' + esc(c.rotulo) + '</span></div><h2 class="s-title"' + er('cursos.titulo') + '>' + rico(c.titulo) + '</h2></div>'
    + '<div class="galeria-wall" id="galeriaWall"' + lista('cursos.itens') + '>' + (c.itens || []).map((o, i) => {
      const p = 'cursos.itens.' + i;
      return '<figure class="obra' + (o.foto ? '' : ' is-placeholder') + '"' + item() + '><div class="obra-luz"></div>'
        + '<div class="obra-moldura"><div class="obra-passe"><div class="obra-tela"' + img(p + '.foto') + '>' + (o.foto ? '<img src="' + esc(o.foto) + '" alt="' + esc(o.professor) + '">' : silhueta(o.sigla || ('c' + i)))
        + '<span class="obra-sigla"' + e(p + '.sigla') + '>' + esc(o.sigla) + '</span><span class="obra-nome"' + er(p + '.nome') + '>' + rico(o.nome) + '</span></div></div></div>'
        + '<figcaption class="placa"><div class="placa-titulo"' + e(p + '.materia') + '>' + esc(o.materia) + '</div><div class="placa-prof"' + e(p + '.professor') + '>' + esc(o.professor) + '</div>'
        + '<div class="placa-dados"' + lista(p + '.dados') + '>' + (o.dados || []).map((d, k) => '<span' + item() + e(p + '.dados.' + k) + '>' + esc(d) + '</span>').join('') + '</div>'
        + '<div class="placa-preco"><span><b' + e(p + '.preco') + '>' + esc(o.preco) + '</b><small' + e(p + '.precoNota') + '>' + esc(o.precoNota) + '</small></span><a href="' + esc(href(o.link)) + '"' + (!o.link || o.link === 'app' ? ' data-app-link' : '') + '><span' + e(p + '.cta') + '>' + esc(o.cta || 'Ver matéria') + '</span></a></div>'
        + '</figcaption></figure>';
    }).join('') + '</div><div class="galeria-piso"></div><div class="galeria-hint"' + e('cursos.dica') + '>' + esc(c.dica) + '</div>';
  R.demo = d => '<div class="vnp-intro">' + cabeca('demo', d, true, SVG.janela) + '</div>';
  R.ferramentas = f => '<div class="tools-head">' + cabeca('ferramentas', f, true, SVG.star) + '</div>'
    + '<div class="tools-grid"' + lista('ferramentas.itens') + '>' + (f.itens || []).map((t, i) => '<div class="tool-card" data-a="' + ((i % 3) + 1) + '"' + item() + '>'
      + '<div class="tool-mock">' + (window.LANDING_MOCKS[t.mock != null ? t.mock : i] || window.LANDING_MOCKS[window.LANDING_MOCKS.length - 1] || '') + '</div>'
      + '<div class="tool-body"><div class="tool-number"' + e('ferramentas.itens.' + i + '.numero') + '>' + esc(t.numero) + '</div><h3 class="tool-title"' + er('ferramentas.itens.' + i + '.titulo') + '>' + rico(t.titulo) + '</h3><p' + er('ferramentas.itens.' + i + '.texto') + '>' + rico(t.texto) + '</p></div></div>').join('') + '</div>';
  R.promessa = pr => '<div class="promise-grid"><div class="promise-head">' + cabeca('promessa', pr, false, SVG.prom) + '</div><div class="promise-body"><div class="promise-list"' + lista('promessa.itens') + '>'
    + (pr.itens || []).map((x, i) => '<div class="promise-item" data-a="' + Math.min(7, i + 2) + '"' + item() + '><div class="promise-num">' + String(i + 1).padStart(2, '0') + '</div><div><h3' + er('promessa.itens.' + i + '.titulo') + '>' + rico(x.titulo) + '</h3><p' + er('promessa.itens.' + i + '.texto') + '>' + rico(x.texto) + '</p></div></div>').join('') + '</div></div></div>';
  R.materias = m => cabeca('materias', m, true, SVG.book)
    + '<div class="curr-stats" data-a="1"' + lista('materias.stats') + '>' + (m.stats || []).map((s, i) => '<div class="curr-stat"' + item() + '><div class="curr-stat-num"' + e('materias.stats.' + i + '.num') + '>' + esc(s.num) + '</div><div class="curr-stat-label"' + e('materias.stats.' + i + '.label') + '>' + esc(s.label) + '</div></div>').join('') + '</div>'
    + '<div class="materias-grid" data-a="2"' + lista('materias.itens') + '>' + (m.itens || []).map((x, i) => { const w = parseInt(x.cobertura, 10) || 0; return '<div class="materia"' + item() + '><div class="materia-sigla"' + e('materias.itens.' + i + '.sigla') + '>' + esc(x.sigla) + '</div><div class="materia-nome"' + e('materias.itens.' + i + '.nome') + '>' + esc(x.nome) + '</div><div class="materia-desc"' + e('materias.itens.' + i + '.desc') + '>' + esc(x.desc) + '</div><div class="materia-bar"><i style="--w:' + (w || 35) + '%"></i></div><div class="materia-meta"><span>edital coberto</span><span' + e('materias.itens.' + i + '.cobertura') + '>' + esc(x.cobertura) + '</span></div></div>'; }).join('') + '</div>';
  R.depoimentos = d => { const itens = (d.itens || []).map((t, i) => '<div class="testimonial"' + item() + '><p class="testimonial-text"' + e('depoimentos.itens.' + i + '.texto') + '>' + esc(t.texto) + '</p><div class="testimonial-author"><div class="testimonial-avatar"' + img('depoimentos.itens.' + i + '.foto') + '>' + (t.foto ? '<img src="' + esc(t.foto) + '" alt="">' : '<span' + e('depoimentos.itens.' + i + '.iniciais') + '>' + esc(t.iniciais) + '</span>') + '</div><div class="testimonial-info"><h5' + e('depoimentos.itens.' + i + '.nome') + '>' + esc(t.nome) + '</h5><p' + e('depoimentos.itens.' + i + '.cargo') + '>' + esc(t.cargo) + '</p></div></div></div>');
    return cabeca('depoimentos', d, true, SVG.chat) + '<div class="testimonial-carousel" id="testimonialCarousel"><div class="testimonial-track" id="testimonialTrack"' + lista('depoimentos.itens') + '>' + itens.join('') + (EDITAR ? '' : itens.join('')) + '</div></div>' + (d.nota ? '<p style="text-align:center;margin-top:1.5rem"><span class="marcador"' + e('depoimentos.nota') + '>' + esc(d.nota) + '</span></p>' : ''); };
  R.planos = pl => cabeca('planos', pl, true, SVG.star) + '<div class="plans"' + lista('planos.itens') + '>' + (pl.itens || []).map((p, i) => { const q = 'planos.itens.' + i; return '<div class="plan' + (p.destaque ? ' featured' : '') + (p.gratis ? ' plan-free' : '') + '" data-a="' + (i + 1) + '"' + item() + '>'
    + (p.ribbon ? '<div class="plan-ribbon"' + e(q + '.ribbon') + '>' + esc(p.ribbon) + '</div>' : '')
    + '<div class="plan-kind"' + e(q + '.kind') + '>' + esc(p.kind) + '</div><div class="plan-name"><em' + e(q + '.nome') + '>' + esc(p.nome) + '</em></div><div class="plan-tag"' + e(q + '.tag') + '>' + esc(p.tag) + '</div>'
    + '<div class="plan-price-row"><span class="plan-price"><span class="currency">R$</span><span' + e(q + '.preco') + '>' + esc(p.preco) + '</span></span><span class="plan-period"' + e(q + '.periodo') + '>' + esc(p.periodo) + '</span></div>'
    + '<div class="plan-sub"' + er(q + '.sub') + '>' + rico(p.sub) + '</div>'
    + '<ul class="plan-includes"' + lista(q + '.inclui') + '>' + (p.inclui || []).map((x, k) => '<li' + item() + '>' + CHECK + '<div' + er(q + '.inclui.' + k) + '>' + rico(x) + '</div></li>').join('') + '</ul>'
    + '<a href="' + esc(href(p.ctaHref)) + '" class="btn ' + (p.destaque ? 'btn-primary' : 'btn-ghost') + ' plan-cta"' + (!p.ctaHref || p.ctaHref === 'app' ? ' data-app-link' : '') + '><span' + e(q + '.cta') + '>' + esc(p.cta) + '</span> ' + SETA + '</a>'
    + '<p class="plan-note"' + e(q + '.nota') + '>' + esc(p.nota) + '</p></div>'; }).join('') + '</div>';
  R.faq = f => cabeca('faq', f, true, SVG.faq) + '<div class="faq-list"' + lista('faq.itens') + '>' + (f.itens || []).map((x, i) => '<div class="faq-item"' + item() + '><button class="faq-q"><span' + e('faq.itens.' + i + '.q') + '>' + esc(x.q) + '</span><span class="faq-q-icon"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span></button><div class="faq-a"><p' + er('faq.itens.' + i + '.a') + '>' + rico(x.a) + '</p></div></div>').join('') + '</div>';
  R.experimentar = t => '<div class="tryit-head">' + cabeca('experimentar', t, true, SVG.ok) + '</div><div class="tryit-grid"' + lista('experimentar.itens') + '>' + (t.itens || []).map((c, i) => { const q = 'experimentar.itens.' + i; return '<article class="tryit-card" data-a="' + (i + 3) + '"' + item() + '><div class="tryit-card-icon">' + (i ? SVG.prof : SVG.play) + '</div><div class="tryit-card-eyebrow"' + e(q + '.eyebrow') + '>' + esc(c.eyebrow) + '</div><h3 class="tryit-card-title"' + er(q + '.titulo') + '>' + rico(c.titulo) + '</h3><p class="tryit-card-desc"' + er(q + '.texto') + '>' + rico(c.texto) + '</p><ul class="tryit-card-list"' + lista(q + '.lista') + '>' + (c.lista || []).map((x, k) => '<li' + item() + er(q + '.lista.' + k) + '>' + rico(x) + '</li>').join('') + '</ul><a href="' + esc(href(c.ctaHref)) + '" class="tryit-card-btn" style="text-decoration:none;display:inline-flex"' + (!c.ctaHref || c.ctaHref === 'app' ? ' data-app-link' : '') + '>' + SETA + '<span' + e(q + '.cta') + '>' + esc(c.cta) + '</span></a><p class="tryit-card-note"' + e(q + '.nota') + '>' + esc(c.nota) + '</p></article>'; }).join('') + '</div>';
  R.final = f => '<div class="final-emblem" aria-hidden="true"><svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" stroke-width=".5" opacity=".4"/><circle cx="40" cy="40" r="28" fill="none" stroke="currentColor" stroke-width=".5" opacity=".8"/><path d="M28 40 L36 48 L52 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
    + '<div class="s-label" style="margin-left:auto;margin-right:auto">' + SVG.check + '<span' + e('final.rotulo') + '>' + esc(f.rotulo) + '</span></div><h2 class="s-title"' + er('final.titulo') + '>' + rico(f.titulo) + '</h2><p class="final-lead"' + er('final.lead') + '>' + rico(f.lead) + '</p>'
    + '<div class="final-stack"' + lista('final.stack') + '>' + (f.stack || []).map((s, i) => '<div class="final-stack-item"' + item() + '><div class="final-stack-num"' + e('final.stack.' + i + '.num') + '>' + esc(s.num) + '</div><div class="final-stack-label"' + e('final.stack.' + i + '.label') + '>' + esc(s.label) + '</div></div>').join('') + '</div>'
    + '<p class="final-reassure"' + er('final.reassure') + '>' + rico(f.reassure) + '</p><div class="final-ctas"><a class="btn btn-primary btn-xl" href="' + esc(href(f.ctaHref)) + '"' + (!f.ctaHref || f.ctaHref === 'app' ? ' data-app-link' : '') + '><span' + e('final.cta') + '>' + esc(f.cta) + '</span> ' + SETA + '</a></div>';
  R.rodape = r => '<div class="footer-inner"><div class="footer-brand"><span class="footer-brand-logo">' + window.LANDING_LOGO + '</span><span' + er('rodape.marca') + '>' + rico(r.marca) + '</span></div><div class="footer-meta"' + lista('rodape.links') + '>' + (r.links || []).map((l, i) => '<a href="' + esc(l.href || '#') + '"' + item() + e('rodape.links.' + i + '.label') + '>' + esc(l.label) + '</a>').join('') + '</div></div><div class="footer-copyright"' + e('rodape.copyright') + '>' + esc(r.copyright) + '</div>';

  function render(){
    const L = window.LANDING;
    const alvo = (id) => document.querySelector('[data-sec="' + id + '"]');
    Object.keys(R).forEach(k => { const el = alvo(k); if(el && L[k]) el.innerHTML = R[k](L[k]); });
    const st = document.querySelector('.sticky-cta'); if(st && L.cta) st.innerHTML = '<a class="btn btn-primary" href="' + esc(app()) + '" data-app-link><span' + e('cta.sticky') + '>' + esc(L.cta.sticky) + '</span> ' + SETA + '</a>';
    document.querySelectorAll('[data-app-link]').forEach(a => a.setAttribute('href', app()));
    const logado = (function(){ try{ return Object.keys(localStorage).some(k => /^sb-.*-auth-token$/.test(k)); }catch(_){ return false; } })();
    if(logado && !EDITAR){
      document.querySelectorAll('[data-app-link]').forEach(a => { if(/Criar conta/i.test(a.textContent)) a.querySelector('span') ? (a.querySelector('span').textContent = 'Entrar na plataforma') : (a.textContent = 'Entrar na plataforma'); });
      const ghost = document.querySelector('.topbar .btn-ghost[data-app-link]'); if(ghost) ghost.remove();
    }
    if(window.__landingRebind) window.__landingRebind();
    if(window.__falconHero) window.__falconHero.reler();
    if(window.__falconGaleria) window.__falconGaleria.update();
    if(EDITAR) editorArmar();
  }
  window.LandingRender = render;
  render();

  /* ── público: versão publicada no servidor (fallback: o padrão embutido) ── */
  function fundir(base, extra){
    if(Array.isArray(extra)) return extra;
    if(extra && typeof extra === 'object'){ const o = Object.assign({}, base || {}); Object.keys(extra).forEach(k => { o[k] = fundir(base ? base[k] : undefined, extra[k]); }); return o; }
    return extra === undefined ? base : extra;
  }
  async function lerConfig(coluna){
    const r = await fetch(SB_URL + '/rest/v1/platform_config?select=' + coluna + '&id=eq.default', { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json(); return rows && rows[0] ? rows[0][coluna] : null;
  }
  if(!EDITAR){
    lerConfig('landing').then(pub => {
      if(!pub || typeof pub !== 'object') return;
      const novo = fundir(window.LANDING_DEFAULT, pub);
      if(JSON.stringify(novo) === JSON.stringify(window.LANDING)) return;
      window.LANDING = novo; render();
    }).catch(e => console.warn('[landing] versão publicada não lida; usando o padrão:', e.message));
  }

  /* ── MODO DE EDIÇÃO (admin → Comercial → Landing page) ─────────────────── */
  let sb = null, sujo = false, status = null;
  function pegar(path){ return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), window.LANDING); }
  function por(path, v){ const ks = path.split('.'); let o = window.LANDING; for(let i = 0; i < ks.length - 1; i++){ if(o[ks[i]] == null) o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = v; }
  function marcarSujo(){ sujo = true; if(status) status.textContent = 'alterações não salvas'; }
  function editorArmar(){
    document.body.classList.add('ed-on');
    // textos: contenteditable no lugar
    document.querySelectorAll('[data-e]').forEach(el => {
      if(el.__edOk) return; el.__edOk = true;
      el.setAttribute('contenteditable', 'true'); el.setAttribute('spellcheck', 'false');
      el.addEventListener('input', () => { const p = el.getAttribute('data-e'); por(p, el.hasAttribute('data-e-html') ? rico(el.innerHTML) : el.textContent); marcarSujo(); });
      el.addEventListener('keydown', ev => { if(ev.key === 'Enter' && !el.hasAttribute('data-e-html')){ ev.preventDefault(); el.blur(); } });
      el.addEventListener('paste', ev => { ev.preventDefault(); const t = (ev.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, t); });
    });
    // links não navegam no editor
    document.querySelectorAll('a[href]').forEach(a => { if(a.__edOk) return; a.__edOk = true; a.addEventListener('click', ev => { if(!a.closest('.ed-bar')) ev.preventDefault(); }); });
    // listas: adicionar / remover / mover
    document.querySelectorAll('[data-list]').forEach(box => {
      if(box.__edOk) return; box.__edOk = true;
      const path = box.getAttribute('data-list');
      Array.prototype.forEach.call(box.querySelectorAll(':scope > [data-item]'), (it, i) => {
        const ctl = document.createElement('span'); ctl.className = 'ed-ctl'; ctl.setAttribute('contenteditable', 'false');
        ctl.innerHTML = '<button type="button" title="Mover para cima" data-ed-mv="-1">&#8593;</button><button type="button" title="Mover para baixo" data-ed-mv="1">&#8595;</button><button type="button" title="Remover" data-ed-rm>&times;</button>';
        ctl.addEventListener('mousedown', ev => ev.preventDefault());
        ctl.addEventListener('click', ev => {
          const b = ev.target.closest('button'); if(!b) return; ev.preventDefault(); ev.stopPropagation();
          const arr = pegar(path); if(!Array.isArray(arr)) return;
          if(b.hasAttribute('data-ed-rm')){ if(!confirm('Remover este item?')) return; arr.splice(i, 1); }
          else { const d = parseInt(b.getAttribute('data-ed-mv'), 10); const j = i + d; if(j < 0 || j >= arr.length) return; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
          marcarSujo(); render();
        });
        it.appendChild(ctl);
      });
      const add = document.createElement('button'); add.type = 'button'; add.className = 'ed-add'; add.setAttribute('contenteditable', 'false'); add.textContent = '+ adicionar';
      add.addEventListener('mousedown', ev => ev.preventDefault());
      add.addEventListener('click', ev => {
        ev.preventDefault(); ev.stopPropagation();
        let arr = pegar(path); if(!Array.isArray(arr)){ arr = []; por(path, arr); }
        const modelo = arr.length ? JSON.parse(JSON.stringify(arr[arr.length - 1])) : (window.LANDING_NOVO[path.replace(/\.\d+\./g, '.N.')] || 'novo item');
        if(modelo && typeof modelo === 'object'){ Object.keys(modelo).forEach(k => { if(typeof modelo[k] === 'string' && !/^(app|#)/.test(modelo[k]) && k !== 'sigla' && k !== 'mock') modelo[k] = modelo[k]; }); if('foto' in modelo) modelo.foto = ''; }
        arr.push(modelo); marcarSujo(); render();
      });
      box.appendChild(add);
    });
    // imagens: trocar foto (upload no bucket "landing")
    document.querySelectorAll('[data-img]').forEach(el => {
      if(el.__edOk) return; el.__edOk = true;
      const path = el.getAttribute('data-img');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ed-img'; b.setAttribute('contenteditable', 'false'); b.textContent = pegar(path) ? 'Trocar foto' : 'Enviar foto';
      b.addEventListener('mousedown', ev => ev.preventDefault());
      b.addEventListener('click', async ev => {
        ev.preventDefault(); ev.stopPropagation();
        if(!sb){ alert('Entre no admin para enviar fotos.'); return; }
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = async () => {
          const f = inp.files && inp.files[0]; if(!f) return;
          if(f.size > 4 * 1024 * 1024){ alert('Foto acima de 4 MB. Reduza antes de enviar.'); return; }
          b.textContent = 'Enviando…';
          const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
          const nome = path.replace(/[^a-z0-9]+/gi, '-') + '-' + Date.now() + '.' + ext;
          const { error } = await sb.storage.from('landing').upload(nome, f, { cacheControl: '31536000', upsert: false, contentType: f.type || undefined });
          if(error){ alert('Não consegui enviar a foto: ' + error.message); b.textContent = 'Trocar foto'; return; }
          const { data } = sb.storage.from('landing').getPublicUrl(nome);
          por(path, data.publicUrl); marcarSujo(); render();
        };
        inp.click();
      });
      el.appendChild(b);
      if(pegar(path)){ const x = document.createElement('button'); x.type = 'button'; x.className = 'ed-img ed-img-x'; x.setAttribute('contenteditable', 'false'); x.textContent = 'Tirar foto'; x.addEventListener('mousedown', ev => ev.preventDefault()); x.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); por(path, ''); marcarSujo(); render(); }); el.appendChild(x); }
    });
  }
  async function editorIniciar(){
    document.body.classList.add('ed-on');
    const bar = document.createElement('div'); bar.className = 'ed-bar';
    bar.innerHTML = '<span class="ed-bar-t">Modo edição da landing</span><span class="ed-status" id="edStatus">carregando…</span>'
      + '<span class="ed-bar-acoes"><button type="button" class="btn btn-ghost" id="edDescartar">Descartar alterações</button><button type="button" class="btn btn-ghost" id="edRascunho">Salvar rascunho</button><button type="button" class="btn btn-primary" id="edPublicar">Publicar</button><a class="btn btn-ghost" href="landing.html" target="_blank">Ver como visitante</a></span>';
    document.body.appendChild(bar); status = bar.querySelector('#edStatus');
    // SDK do Supabase só no editor (o público usa fetch puro)
    await new Promise((ok, erro) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'; s.onload = ok; s.onerror = erro; document.head.appendChild(s); });
    sb = window.supabase.createClient(SB_URL, SB_KEY);
    const { data: sess } = await sb.auth.getSession();
    if(!sess || !sess.session){ status.textContent = 'Sem sessão: abra esta página pelo admin (Comercial → Landing page).'; return; }
    // rascunho > publicado > padrão
    try{
      const { data } = await sb.schema('conteudo').from('platform_config').select('landing, landing_draft').eq('id', 'default').maybeSingle();
      const base = (data && (data.landing_draft || data.landing)) || null;
      if(base) window.LANDING = fundir(window.LANDING_DEFAULT, base);
      status.textContent = data && data.landing_draft ? 'rascunho carregado' : (data && data.landing ? 'versão publicada carregada' : 'conteúdo padrão (nada publicado ainda)');
    }catch(e){ status.textContent = 'não li o servidor: ' + e.message; }
    render();
    async function gravar(colunas, rotulo){
      status.textContent = 'salvando…';
      const { error } = await sb.schema('conteudo').from('platform_config').upsert(Object.assign({ id: 'default' }, colunas), { onConflict: 'id' });
      if(error){ status.textContent = 'erro ao salvar: ' + error.message; alert('Não salvou: ' + error.message + (/(column|coluna)/i.test(error.message) ? '\n\nRode o SQL das colunas landing/landing_draft no Supabase.' : '')); return false; }
      sujo = false; status.textContent = rotulo + ' · ' + new Date().toLocaleTimeString('pt-BR'); return true;
    }
    bar.querySelector('#edRascunho').addEventListener('click', () => gravar({ landing_draft: window.LANDING }, 'rascunho salvo'));
    bar.querySelector('#edPublicar').addEventListener('click', async () => { if(!confirm('Publicar esta versão da landing para todos os visitantes?')) return; if(await gravar({ landing: window.LANDING, landing_draft: window.LANDING }, 'publicado')) status.textContent += ' · no ar'; });
    bar.querySelector('#edDescartar').addEventListener('click', async () => { if(!confirm('Descartar as alterações não salvas e recarregar?')) return; location.reload(); });
    window.addEventListener('beforeunload', ev => { if(sujo){ ev.preventDefault(); ev.returnValue = ''; } });
  }
  if(EDITAR) editorIniciar();
})();
