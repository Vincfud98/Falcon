/* ═════════════════════════════════════════════════
   FALCON · DEMONSTRAÇÃO "VEJA NA PRÁTICA" — renderizadores por dados
   Desenha o cartão de abertura, a moldura do player (modal) e os 14 painéis a
   partir de LANDING.demo (resumo editável no admin). H = helpers da runtime
   (e/er/lista/item/img = atributos de edição; esc/rico = higienização).
   Markup e classes = as do protótipo (CSS escopado em .pp-main).
   ═════════════════════════════════════════════════ */
(function(){
  const ICONS = {
    text: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/></svg>',
    video: '<svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
    timeline: '<svg viewBox="0 0 24 24"><line x1="12" y1="3" x2="12" y2="21"/><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>',
    glossary: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
    table: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
    bio: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    quote: '<svg viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>',
    biblio: '<svg viewBox="0 0 24 24"><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/></svg>',
    gallery: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    quiz: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>',
    essay: '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>',
    fc: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"/></svg>',
    forum: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>',
    keypoints: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    play: '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
  };
  const PREV = '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>', NEXT = '<svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg>';
  const ORDEM_BASE = ['texto', 'video', 'keypoints', 'timeline', 'galeria', 'glossario', 'tabelas', 'biografias', 'citacoes', 'bibliografia', 'quiz', 'discursiva', 'flashcards', 'forum'];
  const ICONE = { texto: 'text', video: 'video', keypoints: 'keypoints', timeline: 'timeline', galeria: 'gallery', glossario: 'glossary', tabelas: 'table', biografias: 'bio', citacoes: 'quote', bibliografia: 'biblio', quiz: 'quiz', discursiva: 'essay', flashcards: 'fc', forum: 'forum' };
  const pad2 = n => String(n).padStart(2, '0');

  function ordem(D){
    const P = (D && D.paineis) || {}; const out = [];
    ((D && D.grupos) || []).forEach(g => (g.blocos || []).forEach(k => { if(P[k] && out.indexOf(k) < 0) out.push(k); }));
    ORDEM_BASE.forEach(k => { if(P[k] && out.indexOf(k) < 0) out.push(k); });
    return out;
  }
  // carrossel do protótipo (setas, contador, bolinhas); no editor todas as lâminas ficam visíveis (CSS)
  function carrossel(slides, extra){
    return `<div class="carousel-frame" data-total="${slides.length}"${extra || ''}>
      <button class="carousel-nav carousel-prev" type="button">${PREV}</button><button class="carousel-nav carousel-next" type="button">${NEXT}</button>
      <div class="carousel-stage">${slides.map((s, i) => `<div class="carousel-slide${i === 0 ? ' active' : ''}">${s}</div>`).join('')}</div>
      <div class="carousel-footer"><div class="carousel-counter"><strong data-current>1</strong> / ${slides.length}</div><div class="carousel-dots">${slides.map((_, i) => `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-idx="${i}" type="button"></button>`).join('')}</div></div>
    </div>`;
  }
  function cabecalho(H, key, p, P){
    return `<header class="block-header"><div class="block-header-lead">
      <span class="block-type">${ICONS[ICONE[key]] || ''}<span${H.e(p + '.rotulo')}>${H.esc(P.rotulo)}</span></span>
      <h2 class="block-title"${H.er(p + '.titulo')}>${H.rico(P.titulo)}</h2>
      ${P.desc != null ? `<p class="block-desc"${H.er(p + '.desc')}>${H.rico(P.desc)}</p>` : ''}
    </div><div class="block-actions"><button class="block-action-btn" type="button">${ICONS.bookmark}<span>Salvar</span></button><button class="block-action-btn" type="button">${ICONS.check}<span>Concluir</span></button></div></header>`;
  }
  function chips(H, p, P){
    const t = (P.topicos || []).map((x, i) => `<span class="block-chip"${H.item()}${H.e(p + '.topicos.' + i)}>${H.esc(x)}</span>`).join('');
    const g = (P.tags || []).map((x, i) => `<span class="block-chip tag"${H.item()}>#<span${H.e(p + '.tags.' + i)}>${H.esc(x)}</span></span>`).join('');
    if(!P.topicos && !P.tags) return '';
    return `<div class="block-chips"><span class="block-chips-grupo"${H.lista(p + '.topicos')}>${t}</span><span class="block-chips-grupo"${H.lista(p + '.tags')}>${g}</span></div>`;
  }
  const imgEd = (H, ed, path, cls, url) => ed ? `<div class="${cls} ed-img-box" style="background-image:url('${H.esc(url || '')}')"${H.img(path)}></div>` : '';

  const R = {};
  R.texto = function(D, H, ed){
    const P = D.paineis.texto, p = 'demo.paineis.texto', termos = P.termos || [];
    const frag = html => html.replace(/\[\[(.+?)\]\]/g, (m, t) => { const i = termos.findIndex(x => String(x.termo || '').trim().toLowerCase() === t.trim().toLowerCase()); return i >= 0 ? `<span class="pp-frag-term" data-frag="${i}">${t}</span>` : t; });
    const body = (P.paragrafos || []).map((pg, i) => `<div class="tb-par"${H.item()}>${pg.titulo || ed ? `<h4${H.e(p + '.paragrafos.' + i + '.titulo')}>${H.esc(pg.titulo)}</h4>` : ''}<p${H.er(p + '.paragrafos.' + i + '.html')}>${ed ? H.rico(pg.html) : frag(H.rico(pg.html))}</p></div>`).join('');
    const gal = P.galeria || [];
    const slides = gal.map((g, i) => `<div class="tg-satellite-slide${i === 0 ? ' active' : ''}"${H.item()}${H.img(p + '.galeria.' + i + '.url')}><img src="${H.esc(g.url)}" alt="">${ed ? `<div class="tg-satellite-cap ed-cap"${H.e(p + '.galeria.' + i + '.legenda')}>${H.esc(g.legenda)}</div>` : ''}</div>`).join('');
    const dots = gal.map((_, i) => `<button class="tg-satellite-dot${i === 0 ? ' active' : ''}" data-idx="${i}" type="button"></button>`).join('');
    return `<section class="block-wrap textgallery-block">${cabecalho(H, 'texto', p, P)}
      <div class="tb-audio-bar"><button class="tb-audio-btn" type="button">${ICONS.play}<span${H.e(p + '.audio')}>${H.esc(P.audio)}</span></button></div>
      <div class="tg-layout"><div class="tg-main"><div class="tb-body"${H.lista(p + '.paragrafos')}>${body}</div>
        ${ed ? `<div class="ed-termos"${H.lista(p + '.termos')}><div class="ed-demo-tag">Termos do glossário no texto: escreva [[Termo]] no parágrafo</div>${termos.map((t, i) => `<div${H.item()}><b>[[<span${H.e(p + '.termos.' + i + '.termo')}>${H.esc(t.termo)}</span>]]</b><span${H.e(p + '.termos.' + i + '.def')}>${H.esc(t.def)}</span></div>`).join('')}</div>` : ''}
      </div>
      <aside class="tg-satellite"><div class="tg-satellite-pin"><div class="tg-satellite-label"><span>Galeria do trecho</span><span class="tg-satellite-counter"><span data-current>1</span> / ${gal.length}</span></div>
        <div class="tg-satellite-stage"${H.lista(p + '.galeria')}>${slides}${ed ? '' : `<button class="tg-satellite-nav tg-satellite-prev" type="button">${PREV}</button><button class="tg-satellite-nav tg-satellite-next" type="button">${NEXT}</button>`}</div>
        <div class="tg-satellite-cap" data-caption>${H.esc((gal[0] || {}).legenda || '')}</div><div class="tg-satellite-dots">${dots}</div></div></aside></div>
      ${chips(H, p, P)}</section>`;
  };
  R.video = function(D, H, ed){
    const P = D.paineis.video, p = 'demo.paineis.video';
    const v = String(P.vimeo || '').trim();
    const src = v ? 'https://player.vimeo.com/video/' + v + (v.indexOf('?') >= 0 ? '&' : '?') + 'badge=0&autopause=0&player_id=0&app_id=58479' : '';
    return `<section class="block-wrap video-block"><div class="vb-layout">
      <div class="vb-frame">${src ? `<iframe src="${H.esc(src)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Videoaula"></iframe>` : `<button class="vb-play" type="button" title="Assistir">${ICONS.play}</button>`}</div>
      <div class="vb-info"><span class="block-type">${ICONS.video}<span${H.e(p + '.rotulo')}>${H.esc(P.rotulo)}</span></span>
        <h3 class="vb-title"${H.er(p + '.titulo')}>${H.rico(P.titulo)}</h3><div class="vb-desc"${H.er(p + '.desc')}>${H.rico(P.desc)}</div>
        <div class="vb-meta-row"><div class="vb-meta-item"><span class="vb-meta-label">Apresentado por</span><span class="vb-meta-value"${H.e(p + '.apresentador')}>${H.esc(P.apresentador)}</span></div><div class="vb-meta-item"><span class="vb-meta-label">Duração</span><span class="vb-meta-value"${H.e(p + '.duracao')}>${H.esc(P.duracao)}</span></div><div class="vb-meta-item"><span class="vb-meta-label">Transcrição</span><span class="vb-meta-value" style="color:var(--accent)"${H.e(p + '.transcricao')}>${H.esc(P.transcricao)}</span></div></div>
        ${ed ? `<p class="ed-nota" style="text-align:left">Vídeo do Vimeo (número e hash, como na plataforma): <span class="ed-url"${H.e(p + '.vimeo')}>${H.esc(P.vimeo)}</span></p>` : ''}
        ${chips(H, p, P)}</div></div></section>`;
  };
  R.keypoints = function(D, H, ed){
    const P = D.paineis.keypoints, p = 'demo.paineis.keypoints';
    return `<section class="block-wrap keypoints-block">${cabecalho(H, 'keypoints', p, P)}
      <p class="kp-intro"${H.er(p + '.intro')}>${H.rico(P.intro)}</p>
      <div class="kp-grid"${H.lista(p + '.itens')}>${(P.itens || []).map((it, i) => `<div class="kp-item"${H.item()}><div class="kp-num">${pad2(i + 1)}</div><div class="kp-label"${H.e(p + '.itens.' + i + '.label')}>${H.esc(it.label)}</div><div class="kp-title"${H.er(p + '.itens.' + i + '.title')}>${H.rico(it.title)}</div><div class="kp-body"${H.er(p + '.itens.' + i + '.body')}>${H.rico(it.body)}</div></div>`).join('')}</div>
      ${chips(H, p, P)}</section>`;
  };
  R.timeline = function(D, H, ed){
    const P = D.paineis.timeline, p = 'demo.paineis.timeline';
    const slides = (P.trilhas || []).map((tl, i) => { const q = p + '.trilhas.' + i; return `<section class="tl-fid-group"${H.item()}>
      <div class="tl-fid-group-sub"${H.e(q + '.sub')}>${H.esc(tl.sub)}</div><h3 class="tl-fid-group-title"${H.er(q + '.titulo')}>${H.rico(tl.titulo)}</h3>
      <div class="tl-fid-group-layout"><div class="tl-fidelity"${H.lista(q + '.entradas')}>${(tl.entradas || []).map((en, k) => { const r = q + '.entradas.' + k; return `<div class="tl-fid-item" data-thumb="${H.esc(en.image || '')}" data-title="${H.esc(en.titulo)}"${H.item()}><div class="tl-fid-dot"></div><div class="tl-fid-head"><span class="tl-fid-date"${H.e(r + '.ano')}>${H.esc(en.ano)}</span><span class="tl-fid-title"${H.er(r + '.titulo')}>${H.rico(en.titulo)}</span></div><div class="tl-fid-body"${H.er(r + '.body')}>${H.rico(en.body)}</div>${imgEd(H, ed, r + '.image', 'ed-thumb', en.image)}</div>`; }).join('')}</div>
      <aside class="tl-fid-side"><img src="" alt=""><div class="tl-fid-side-cap"></div></aside></div></section>`; });
    return `<section class="block-wrap timeline-block">${cabecalho(H, 'timeline', p, P)}${carrossel(slides, H.lista(p + '.trilhas'))}</section>`;
  };
  R.galeria = function(D, H, ed){
    const P = D.paineis.galeria, p = 'demo.paineis.galeria';
    return `<section class="block-wrap gallery-block">${cabecalho(H, 'galeria', p, P)}
      <div class="mosaic-grid"${H.lista(p + '.itens')}>${(P.itens || []).map((it, i) => { const q = p + '.itens.' + i; return `<${ed ? 'div' : 'button type="button"'} class="mosaic-item ${H.esc(it.span || '')}"${H.item()}${H.img(q + '.url')}><img src="${H.esc(it.url)}" alt=""><div class="mosaic-overlay"><div class="mosaic-title"${H.e(q + '.titulo')}>${H.esc(it.titulo)}</div><div class="mosaic-ref"${H.e(q + '.ref')}>${H.esc(it.ref)}</div></div></${ed ? 'div' : 'button'}>`; }).join('')}</div></section>`;
  };
  R.glossario = function(D, H, ed){
    const P = D.paineis.glossario, p = 'demo.paineis.glossario';
    const slides = (P.termos || []).map((g, i) => { const q = p + '.termos.' + i; return `<div class="gloss-panel${g.image ? ' has-image' : ''}"${H.item()}><div>
      <h2 class="gloss-panel-term"${H.er(q + '.termo')}>${H.rico(g.termo)}</h2><div class="gloss-panel-meta"${H.e(q + '.meta')}>${H.esc(g.meta)}</div><div class="gloss-panel-divider"></div>
      <div class="gloss-panel-def"${H.er(q + '.def')}>${H.rico(g.def)}</div><div class="gloss-panel-body"${H.er(q + '.body')}>${H.rico(g.body)}</div></div>
      ${g.image || ed ? `<div class="gloss-panel-img"${H.img(q + '.image')}>${g.image ? `<img src="${H.esc(g.image)}" alt="">` : ''}</div>` : ''}</div>`; });
    return `<section class="block-wrap glossary-block">${cabecalho(H, 'glossario', p, P)}${carrossel(slides, H.lista(p + '.termos'))}</section>`;
  };
  R.tabelas = function(D, H, ed){
    const P = D.paineis.tabelas, p = 'demo.paineis.tabelas';
    const slides = (P.tabelas || []).map((t, i) => { const q = p + '.tabelas.' + i; return `<div class="ref-datatable-wrap"${H.item()}>
      <div class="ref-datatable-head"><div class="ref-datatable-title"${H.er(q + '.titulo')}>${H.rico(t.titulo)}</div><div class="ref-datatable-sub">Tabela ${i + 1} de ${(P.tabelas || []).length}</div></div>
      <table class="ref-datatable"><thead><tr${H.lista(q + '.colunas')}>${(t.colunas || []).map((c, k) => `<th${H.item()}${H.e(q + '.colunas.' + k)}>${H.esc(c)}</th>`).join('')}</tr></thead>
      <tbody${H.lista(q + '.linhas')}>${(t.linhas || []).map((r, k) => `<tr${H.item()}>${(r || []).map((c, j) => `<td${H.er(q + '.linhas.' + k + '.' + j)}>${H.rico(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <div class="ref-datatable-notes"${H.er(q + '.notas')}>${H.rico(t.notas)}</div></div>`; });
    return `<section class="block-wrap table-block">${cabecalho(H, 'tabelas', p, P)}${carrossel(slides, H.lista(p + '.tabelas'))}</section>`;
  };
  R.biografias = function(D, H, ed){
    const P = D.paineis.biografias, p = 'demo.paineis.biografias';
    const slides = (P.pessoas || []).map((b, i) => { const q = p + '.pessoas.' + i; const ini = String(b.nome || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
      return `<article class="bio-modal"${H.item()}><div class="bio-portrait-frame${b.retrato ? '' : ' sem-retrato'}"${H.img(q + '.retrato')}>${b.retrato ? `<img src="${H.esc(b.retrato)}" alt="${H.esc(b.nome)}">` : `<span class="bio-iniciais">${H.esc(ini)}</span>`}</div>
      <div class="bio-content"><div class="bio-eyebrow">Biografia</div><h2 class="bio-name"${H.er(q + '.nome')}>${H.rico(b.nome)}</h2><div class="bio-dates"${H.e(q + '.datas')}>${H.esc(b.datas)}</div><div class="bio-divider"></div>
      <div class="bio-roles"${H.lista(q + '.papeis')}>${(b.papeis || []).map((r, k) => `<span class="bio-role"${H.item()}${H.e(q + '.papeis.' + k)}>${H.esc(r)}</span>`).join('')}</div>
      <div class="bio-pullquote"><span class="bio-pullquote-mark">&ldquo;</span><div class="bio-pullquote-text"${H.er(q + '.resumo')}>${H.rico(b.resumo)}</div></div></div></article>`; });
    return `<section class="block-wrap bio-block">${cabecalho(H, 'biografias', p, P)}${carrossel(slides, H.lista(p + '.pessoas'))}</section>`;
  };
  R.citacoes = function(D, H, ed){
    const P = D.paineis.citacoes, p = 'demo.paineis.citacoes';
    const slides = (P.itens || []).map((c, i) => { const q = p + '.itens.' + i; return `<article class="quote-modal" style="--qm-bg:url('${H.esc(c.bg || '')}')"${H.item()}>
      ${c.retrato ? `<div class="quote-modal-portrait"><img src="${H.esc(c.retrato)}" alt=""></div>` : ''}<div class="quote-modal-mark">&ldquo;</div>
      <p class="quote-modal-text"${H.er(q + '.texto')}>${H.rico(c.texto)}</p><div class="quote-modal-divider"></div>
      <div class="quote-modal-attr"><span class="quote-modal-author">&mdash; <span${H.e(q + '.autor')}>${H.esc(c.autor)}</span>,</span><span class="quote-modal-ctx"${H.e(q + '.ctx')}>${H.esc(c.ctx)}</span></div>
      ${imgEd(H, ed, q + '.bg', 'ed-thumb ed-thumb-bg', c.bg)}</article>`; });
    return `<section class="block-wrap quote-block">${cabecalho(H, 'citacoes', p, P)}${carrossel(slides, H.lista(p + '.itens'))}</section>`;
  };
  R.bibliografia = function(D, H, ed){
    const P = D.paineis.bibliografia, p = 'demo.paineis.bibliografia';
    return `<section class="block-wrap sources-block">${cabecalho(H, 'bibliografia', p, P)}
      <div class="srcs-grid"${H.lista(p + '.itens')}>${(P.itens || []).map((it, i) => `<div class="srcs-item"${H.item()}><div class="srcs-num">${pad2(i + 1)}</div><div class="srcs-body"><div class="srcs-citation"${H.er(p + '.itens.' + i + '.ref')}>${H.rico(it.ref)}</div><div class="srcs-why"${H.er(p + '.itens.' + i + '.porque')}>${H.rico(it.porque)}</div></div></div>`).join('')}</div></section>`;
  };
  R.quiz = function(D, H, ed){
    const P = D.paineis.quiz, p = 'demo.paineis.quiz', tb = P.textoBase || {};
    return `<section class="block-wrap quiz-block">${cabecalho(H, 'quiz', p, P)}
      <div class="q-ref"><div class="q-ref-text"><div class="q-ref-label"${H.e(p + '.textoBase.label')}>${H.esc(tb.label)}</div><div class="q-ref-title"${H.e(p + '.textoBase.titulo')}>${H.esc(tb.titulo)}</div><div class="q-ref-body"${H.er(p + '.textoBase.corpo')}>${H.rico(tb.corpo)}</div><div class="q-ref-source"${H.e(p + '.textoBase.fonte')}>${H.esc(tb.fonte)}</div></div>
        ${tb.imagem || ed ? `<div class="q-ref-media-box"${H.img(p + '.textoBase.imagem')}>${tb.imagem ? `<img class="q-ref-media" src="${H.esc(tb.imagem)}" alt="">` : ''}</div>` : ''}</div>
      <div class="q-enunciado"${H.er(p + '.comando')}>${H.rico(P.comando)}</div>
      <div${H.lista(p + '.itens')}>${(P.itens || []).map((it, i) => { const q = p + '.itens.' + i; return `<div class="q-item" data-correct="${H.esc(it.correta)}"${H.item()}>
        <div class="q-num">${pad2(i + 1)}</div><div class="q-body"><div class="q-badges"><span class="q-badge q-badge-ref"${H.e(q + '.ref')}>${H.esc(it.ref)}</span><span class="q-badge q-badge-diff"${H.e(q + '.dif')}>${H.esc(it.dif)}</span>${ed ? `<span class="q-badge ed-gab">Gabarito: <span${H.e(q + '.correta')}>${H.esc(it.correta)}</span></span>` : ''}</div><div class="q-assertion"${H.er(q + '.enunciado')}>${H.rico(it.enunciado)}</div></div>
        <div class="q-options"><button class="q-option" data-answer="C" type="button">C</button><button class="q-option" data-answer="E" type="button">E</button></div>
        <button class="q-doubt" type="button" title="Marcar dúvida"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></button>
        <div class="q-feedback${ed ? ' show' : ''}"><span class="q-feedback-label">${ed ? 'Gabarito comentado' : ''}</span><div${H.er(q + '.comentario')}>${H.rico(it.comentario)}</div></div></div>`; }).join('')}</div></section>`;
  };
  R.discursiva = function(D, H, ed){
    const P = D.paineis.discursiva, p = 'demo.paineis.discursiva', meta = P.meta || {};
    const crit = (P.criterios || []).map((c, ci) => { const q = p + '.criterios.' + ci; return `<div class="ecrit-slide${ci === 0 ? ' active' : ''}" data-crit-idx="${ci}"${H.item()}>
      <div class="essay-criterion-head"><span class="essay-criterion-label"${H.e(q + '.label')}>${H.esc(c.label)}</span><span class="essay-criterion-max"><span${H.e(q + '.max')}>${H.esc(c.max)}</span> pts</span></div>
      <div class="essay-criterion-desc"${H.er(q + '.description')}>${H.rico(c.description)}</div>
      <details class="essay-criterion-model"${ed ? ' open' : ''}><summary>Resposta esperada</summary><div class="essay-criterion-model-body"${H.er(q + '.model')}>${H.rico(c.model)}</div></details>
      ${ed ? `<div class="essay-criterion-eval"><div class="ecev-label">Avaliação de exemplo (aparece depois de enviar)</div><div class="ecev-score"><span${H.e(q + '.score')}>${H.esc(c.score)}</span> / ${H.esc(c.max)} pts</div><div class="ecev-comment"${H.er(q + '.comment')}>${H.rico(c.comment)}</div></div>` : ''}</div>`; }).join('');
    const critDots = (P.criterios || []).map((_, ci) => `<button class="ecrit-dot${ci === 0 ? ' active' : ''}" data-crit-idx="${ci}" type="button"></button>`).join('');
    const mods = (P.modelos || []).map((m, mi) => { const q = p + '.modelos.' + mi; return `<div class="ecrit-slide${mi === 0 ? ' active' : ''}" data-model-idx="${mi}"${H.item()}>
      <div class="essay-criterion-head"><span class="essay-criterion-label"${H.e(q + '.title')}>${H.esc(m.title)}</span><span class="essay-criterion-max"${H.e(q + '.score')}>${H.esc(m.score)}</span></div>
      <div class="emodel-author"${H.e(q + '.author')}>${H.esc(m.author)}</div><div class="emodel-body"${H.er(q + '.body')}>${H.rico(m.body).replace(/\n\n?/g, '<br><br>')}</div></div>`; }).join('');
    const modDots = (P.modelos || []).map((_, mi) => `<button class="ecrit-dot${mi === 0 ? ' active' : ''}" data-model-idx="${mi}" type="button"></button>`).join('');
    return `<section class="block-wrap essay-block">${cabecalho(H, 'discursiva', p, P)}
      <article class="essay-item" data-essay-item><header class="essay-header"><span class="essay-num">01</span><div class="essay-hbody">
        <div class="essay-command"${H.er(p + '.comando')}>${H.rico(P.comando)}</div>
        <div class="essay-meta"><span class="essay-chip">Total · <strong${H.e(p + '.meta.total')}>${H.esc(meta.total)}</strong></span><span class="essay-chip">Limite · <strong${H.e(p + '.meta.limite')}>${H.esc(meta.limite)}</strong></span><span class="essay-chip"><strong${H.e(p + '.meta.prova')}>${H.esc(meta.prova)}</strong></span></div></div></header>
      <div class="essay-layout"><div><div class="essay-panel"><div class="essay-panel-label">Sua resposta</div>
        <textarea class="essay-textarea" data-essay-input placeholder="Escreva sua resposta aqui (máx. 2500 caracteres). A avaliação considera os critérios ao lado." maxlength="2500"></textarea>
        <div class="essay-textarea-foot"><span class="essay-counter"><span data-essay-chars>0</span> / 2500</span><button class="essay-submit" data-essay-submit type="button"><svg viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>Enviar para avaliação</button><button class="essay-toggle-aside" type="button" data-essay-toggle>Mostrar critérios</button></div></div></div>
      <aside class="essay-aside" data-essay-aside${ed ? '' : ' style="display:none"'}><div class="essay-aside-toggle"><button class="eat-btn active" data-show="criteria" type="button">Critérios</button><button class="eat-btn" data-show="models" type="button">Modelos</button></div>
        <div class="ecrit-slider" data-slider="criteria"><div class="ecrit-header"><span class="ecrit-label">Critérios de avaliação</span><span class="ecrit-score" data-ecrit-score hidden></span><span class="ecrit-counter"><span data-ecrit-current>1</span> / ${(P.criterios || []).length}</span></div>
          <div class="ecrit-stage"${H.lista(p + '.criterios')}>${crit}</div><div class="ecrit-nav"><button class="ecrit-btn" data-ecrit-prev type="button">${PREV}</button><div class="ecrit-dots">${critDots}</div><button class="ecrit-btn" data-ecrit-next type="button">${NEXT}</button></div></div>
        <div class="ecrit-slider emodel-slider" data-slider="models"${ed ? '' : ' style="display:none"'}><div class="ecrit-header"><span class="ecrit-label">Respostas modelo</span><span class="ecrit-counter"><span data-emodel-current>1</span> / ${(P.modelos || []).length}</span></div>
          <div class="ecrit-stage"${H.lista(p + '.modelos')}>${mods}</div><div class="ecrit-nav"><button class="ecrit-btn" data-emodel-prev type="button">${PREV}</button><div class="ecrit-dots">${modDots}</div><button class="ecrit-btn" data-emodel-next type="button">${NEXT}</button></div></div>
      </aside></div></article></section>`;
  };
  R.flashcards = function(D, H, ed){
    const P = D.paineis.flashcards, p = 'demo.paineis.flashcards';
    return `<section class="block-wrap flashcards-block">${cabecalho(H, 'flashcards', p, P)}
      <div class="fc-grid"${H.lista(p + '.cards')}>${(P.cards || []).map((c, i) => `<div class="fc-card" data-idx="${i}"${H.item()}><div class="fc-inner">
        <div class="fc-face fc-front"><div class="fc-term"${H.er(p + '.cards.' + i + '.frente')}>${H.rico(c.frente)}</div></div>
        <div class="fc-face fc-back"><div class="fc-def"${H.er(p + '.cards.' + i + '.verso')}>${H.rico(c.verso)}</div><div class="fc-actions"><button class="fc-btn" data-status="learning" type="button"><svg viewBox="0 0 24 24"><path d="M1 4v6h6 M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>Rever</button><button class="fc-btn" data-status="mastered" type="button">${ICONS.check}Dominei</button></div></div>
      </div></div>`).join('')}</div>
      <div class="fc-hint"${H.e(p + '.dica')}>${H.esc(P.dica)}</div></section>`;
  };
  R.forum = function(D, H, ed){
    const P = D.paineis.forum, p = 'demo.paineis.forum';
    const post = (m, q, resp) => `<div class="cmt-item"${resp ? '' : H.item()}><div class="cmt-avatar"${H.e(q + '.iniciais')}>${H.esc(m.iniciais)}</div><div class="cmt-item-body">
      <div class="cmt-item-head"><div class="cmt-author"${H.e(q + '.nome')}>${H.esc(m.nome)}</div><div class="cmt-date"${H.e(q + '.quando')}>${H.esc(m.quando)}</div></div>
      <div class="cmt-text"${H.er(q + '.texto')}>${H.rico(m.texto)}</div>
      ${resp ? '' : `<div class="cmt-actions"><button class="cmt-action-btn" type="button">Responder</button><button class="cmt-action-btn" type="button">Curtir</button></div>`}
      ${!resp && m.resposta ? `<div class="cmt-replies">${post(m.resposta, q + '.resposta', true)}</div>` : ''}</div></div>`;
    return `<section class="block-wrap comments-block">${cabecalho(H, 'forum', p, P)}
      <div class="cmt-prompt"${H.er(p + '.pergunta')}>${H.rico(P.pergunta)}</div>
      <div class="cmt-compose"><div class="cmt-avatar">EU</div><div class="cmt-input-wrap"><textarea class="cmt-textarea" placeholder="Compartilhe sua reflexão…"></textarea><button class="cmt-submit" type="button">Publicar</button></div></div>
      <div class="cmt-thread"${H.lista(p + '.posts')}>${(P.posts || []).map((m, i) => post(m, p + '.posts.' + i, false)).join('')}</div></section>`;
  };

  function painel(key, D, H, ed){ const fn = R[key]; return fn && D && D.paineis && D.paineis[key] ? fn(D, H, !!ed) : ''; }
  function lancamento(D, H, ed){
    const L = D.lancamento || {}, p = 'demo.lancamento';
    return `<div class="vnp-launch" data-a="3">
      <div class="vnp-launch-thumbs" aria-hidden="true"${H.lista(p + '.thumbs')}>${(L.thumbs || []).map((t, i) => `<div class="vnp-launch-thumb" style="background-image:url('${H.esc(t.img || '')}')"${H.item()}${H.img(p + '.thumbs.' + i + '.img')}><span class="vnp-launch-thumb-label"${H.e(p + '.thumbs.' + i + '.label')}>${H.esc(t.label)}</span></div>`).join('')}</div>
      <div class="vnp-launch-meta"${H.e(p + '.meta')}>${H.esc(L.meta)}</div>
      <h3 class="vnp-launch-title"${H.er(p + '.titulo')}>${H.rico(L.titulo)}</h3>
      <p class="vnp-launch-desc"${H.er(p + '.desc')}>${H.rico(L.desc)}</p>
      <button type="button" class="vnp-launch-btn" id="vnpLaunchBtn">${ICONS.play}<span${H.e(p + '.botao')}>${H.esc(L.botao)}</span></button>
      <div class="vnp-launch-blocks"${H.lista(p + '.blocos')}>${(L.blocos || []).map((b, i) => `<span${H.item()}${H.e(p + '.blocos.' + i)}>${H.esc(b)}</span>`).join('')}</div></div>`;
  }
  function heroUnidade(D, H){
    const U = D.unidade || {}, p = 'demo.unidade';
    return `<header class="pp-hero"><div class="pp-hero-eyebrow"${H.e(p + '.eyebrow')}>${H.esc(U.eyebrow)}</div><h1 class="pp-hero-title"${H.er(p + '.titulo')}>${H.rico(U.titulo)}</h1><p class="pp-hero-sub"${H.er(p + '.sub')}>${H.rico(U.sub)}</p></header>`;
  }
  function modal(D, H){
    const P = D.paineis || {}, ord = ordem(D); let primeiro = true;
    const grupos = (D.grupos || []).map(g => { const bl = (g.blocos || []).filter(k => P[k]); if(!bl.length) return ''; return `<div class="pp-side-group"><div class="pp-side-group-title">${H.esc(g.titulo)}</div>${bl.map(k => { const act = primeiro ? ' active' : ''; primeiro = false; return `<button class="pp-side-block${act}" data-block="${k}" type="button"><span class="pp-sb-icon">${ICONS[ICONE[k]] || ''}</span><span class="pp-sb-label">${H.esc(P[k].lateral || P[k].rotulo)}</span><span class="pp-sb-mark">${ICONS.check}</span></button>`; }).join('')}</div>`; }).join('');
    return `<div class="vnp-modal" id="vnpModal" role="dialog" aria-modal="true" aria-labelledby="vnpModalTitle"><div class="vnp-modal-frame">
      <button type="button" class="vnp-modal-close" id="vnpModalClose" aria-label="Fechar demonstração"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      <span id="vnpModalTitle" style="position:absolute;left:-9999px">Demonstração interativa</span>
      <div class="pp-stage" id="ppStage"><div class="pp-inner"><div class="pp-layout">
        <aside class="pp-sidebar"><div class="pp-side-toolbar"><span class="pp-side-toolbar-label">${H.esc((D.unidade || {}).lateral || 'Unidade')}</span><span class="pp-side-badge" id="ppProgress">0 / ${ord.length}</span></div>${grupos}</aside>
        <div class="pp-main" id="ppMain">${heroUnidade(D, H)}<div id="ppPanels"></div></div>
      </div></div></div></div></div>`;
  }
  // modo de edição: cartão de abertura + a unidade inteira empilhada (todos os painéis, tudo editável)
  function editor(D, H){
    const P = D.paineis || {};
    return `<div class="ed-demo"><div class="ed-ato-num"><span>Dentro da demonstração · a unidade resumida (o visitante vê isto no player)</span></div>
      <div class="pp-stage ed-demo-stage"><div class="pp-main ed-demo-main">${heroUnidade(D, H)}
      ${ordem(D).map(k => `<div class="ed-demo-painel"><div class="ed-demo-tag">Painel · na barra lateral: <span${H.e('demo.paineis.' + k + '.lateral')}>${H.esc(P[k].lateral)}</span></div>${painel(k, D, H, true)}</div>`).join('')}
      </div></div></div>`;
  }
  function secao(D, H, ed){ if(!D || !D.paineis) return ''; return lancamento(D, H, ed) + (ed ? editor(D, H) : modal(D, H)); }
  window.DemoRender = { painel: painel, ordem: ordem, secao: secao, ICONS: ICONS };
})();
