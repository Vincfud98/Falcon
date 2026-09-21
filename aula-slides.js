/* ============================================================================
   Falcon · Aula em slides · renderizador (Fase 2)
   Um código só desenha o slide no preview do admin, no player do aluno e no
   MP4 futuro. Recebe o roteiro gravado em aluno.aulas (cenas no formato do
   servidor) e o contexto da unidade; devolve HTML no palco de 1920 x 1080.
   Sem dependências. Expõe window.AulaSlides.
   ========================================================================== */
(function (root) {
  'use strict';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Marca-texto: envolve a primeira ocorrência de cada destaque no texto (já escapado). */
  function marcar(texto, destaques, idCena) {
    var t = esc(texto);
    (destaques || []).forEach(function (d, i) {
      if (!d) return;
      var alvo = esc(d);
      var re = new RegExp(escRe(alvo).replace(/\s+/g, '\\s+'), 'i');
      if (re.test(t)) t = t.replace(re, function (m) { return '<mark class="aula-hl" data-hl="' + esc(idCena) + ':' + i + '">' + m + '</mark>'; });
    });
    return t;
  }

  function midiaDe(ctx, id) {
    if (!id || !ctx || !Array.isArray(ctx.midia)) return null;
    for (var i = 0; i < ctx.midia.length; i++) if (ctx.midia[i] && ctx.midia[i].id === id) return ctx.midia[i];
    return null;
  }
  function logoHtml(ctx) {
    if (ctx && ctx.logoSvg) return '<span class="aula-logo">' + ctx.logoSvg + '</span>';
    return '<span class="aula-logo"><span class="aula-logo-word">Falcon</span><span class="aula-logo-rule"></span></span>';
  }
  function rotuloUnidade(ctx) {
    var partes = [];
    if (ctx && ctx.materia) partes.push(ctx.materia);
    if (ctx && ctx.unidadeRotulo) partes.push(ctx.unidadeRotulo);
    return partes.join(' · ');
  }
  function fonteRotulo(cena, ctx) {
    var f = (cena.fontes || [])[0];
    if (!f) return '';
    var titulo = ctx && ctx.blocos && ctx.blocos[f.block_id];
    return 'Fonte: ' + (titulo ? titulo : 'bloco ' + f.block_id) + (f.paragraph_id ? ' § ' + f.paragraph_id.replace(/^p/, '') : '');
  }
  function rodape(cena, ctx, idx, total, opts) {
    var esq = (opts && opts.esq != null) ? opts.esq : fonteRotulo(cena, ctx);
    return '<div class="aula-foot"><span class="aula-foot-src">' + esc(esq) + '</span><span class="aula-foot-n">' + pad2(idx + 1) + ' / ' + pad2(total) + '</span></div>';
  }
  function itensHtml(cena, itens, cls) {
    var lista = Array.isArray(itens) ? itens : [];
    if (!lista.length) return '';
    return '<ul class="aula-items' + (cls ? ' ' + cls : '') + '">' + lista.map(function (it, i) {
      return '<li class="aula-anim" style="--i:' + (i + 2) + '"><span class="aula-ck">' + ICON_CHECK + '</span><span>' + marcar(it, cena.destaques, cena.id) + '</span></li>';
    }).join('') + '</ul>';
  }
  function eyebrow(txt, i) { return '<div class="aula-eyebrow aula-anim" style="--i:' + (i || 0) + '">' + esc(txt) + '</div>'; }
  function titulo(cena, extra) { return '<h2 class="aula-title aula-anim" style="--i:1">' + marcar(cena.titulo, cena.destaques, cena.id) + (extra || '') + '</h2>'; }
  function subtitulo(cena) { return cena.subtitulo ? '<p class="aula-subtitle aula-anim" style="--i:2">' + marcar(cena.subtitulo, cena.destaques, cena.id) + '</p>' : ''; }

  var LAYOUTS = {
    capa: function (c, ctx, idx, total) {
      var bg = (ctx && ctx.capaUrl) ? '<div class="aula-bgimg" style="background-image:url(\'' + esc(ctx.capaUrl) + '\')"></div>' : '';
      return bg + '<div class="aula-shade"></div><div class="aula-glow"></div>' +
        '<div class="aula-capa-top">' + logoHtml(ctx) + '<span class="aula-eyebrow">' + esc(rotuloUnidade(ctx) || 'Aula') + '</span></div>' +
        '<div class="aula-capa-body">' + eyebrow('Aula em slides', 0) + titulo(c) + '<div class="aula-divider aula-anim" style="--i:2"></div>' + subtitulo(c) + '</div>';
    },
    secao: function (c, ctx, idx, total) {
      var n = c.numero_secao || '';
      return '<div class="aula-bar"><div class="aula-num aula-anim" style="--i:0">' + esc(n) + '</div></div>' +
        '<div class="aula-secao-body">' + eyebrow('Seção', 1) + titulo(c) + subtitulo(c) + '</div>' +
        rodape(c, ctx, idx, total, { esq: rotuloUnidade(ctx) });
    },
    padrao: function (c, ctx, idx, total) {
      var m = midiaDe(ctx, c.imagem_id);
      var img = m ? '<div class="aula-anim" style="--i:2"><div class="aula-side-img"><img src="' + esc(m.url) + '" alt="' + esc(m.titulo || '') + '"></div>' + (c.legenda || m.legenda ? '<div class="aula-side-cap">' + esc(c.legenda || m.legenda) + '</div>' : '') + '</div>' : '';
      return '<div>' + eyebrow(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + itensHtml(c, c.itens) + '</div>' + img + rodape(c, ctx, idx, total);
    },
    pilares: function (c, ctx, idx, total) {
      var cards = (c.colunas || []).map(function (col, i) {
        return '<div class="aula-card aula-anim" style="--i:' + (i + 2) + '"><div class="aula-card-t">' + marcar(col.titulo, c.destaques, c.id) + '</div><div class="aula-card-x">' + marcar(col.texto, c.destaques, c.id) + '</div></div>';
      }).join('');
      return eyebrow(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + '<div class="aula-grid">' + cards + '</div>' + rodape(c, ctx, idx, total);
    },
    definicao: function (c, ctx, idx, total) {
      return eyebrow('Conceito', 0) + '<div class="aula-term aula-anim" style="--i:1">' + esc(c.termo || c.titulo) + '</div>' +
        '<div class="aula-def aula-anim" style="--i:2">' + marcar(c.definicao || c.subtitulo || '', c.destaques, c.id) + '</div>' + rodape(c, ctx, idx, total);
    },
    citacao: function (c, ctx, idx, total) {
      var q = c.citacao || {};
      return '<div class="aula-qmark aula-anim" style="--i:0">“</div><div class="aula-quote aula-anim" style="--i:1">' + marcar(q.texto || c.subtitulo || '', c.destaques, c.id) + '</div>' +
        '<div class="aula-author aula-anim" style="--i:2">' + esc(q.autor || c.titulo || '') + '</div>' + rodape(c, ctx, idx, total);
    },
    cronologia: function (c, ctx, idx, total) {
      var evs = c.eventos || [];
      var w = evs.length ? (100 / evs.length) : 100;
      var html = evs.map(function (ev, i) {
        return '<div class="aula-ev ' + (i % 2 ? 'down' : 'up') + ' aula-anim" style="--w:' + w + '%;left:' + (w * i) + '%;--i:' + (i + 2) + '"><div class="aula-dot"></div><div class="aula-ev-box">' +
          '<div class="aula-ev-y">' + esc(ev.ano) + '</div><div class="aula-ev-t">' + marcar(ev.titulo, c.destaques, c.id) + '</div><div class="aula-ev-x">' + marcar(ev.texto, c.destaques, c.id) + '</div></div></div>';
      }).join('');
      return eyebrow(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + '<div class="aula-tl"><div class="aula-tl-line"></div>' + html + '</div>' + rodape(c, ctx, idx, total);
    },
    imagem: function (c, ctx, idx, total) {
      var m = midiaDe(ctx, c.imagem_id) || {};
      return '<div class="aula-frame aula-anim" style="--i:0">' + (m.url ? '<img src="' + esc(m.url) + '" alt="' + esc(m.titulo || '') + '">' : '') + '</div>' +
        '<div class="aula-imagem-side">' + eyebrow(m.titulo || 'Imagem da unidade', 1) + titulo(c) +
        (c.legenda || m.legenda ? '<div class="aula-cap aula-anim" style="--i:2">' + marcar(c.legenda || m.legenda, c.destaques, c.id) + '</div>' : '') +
        itensHtml(c, c.itens) + (m.credito ? '<div class="aula-credit aula-anim" style="--i:5">' + esc(m.credito) + '</div>' : '') + '</div>' +
        rodape(c, ctx, idx, total);
    },
    tabela: function (c, ctx, idx, total) {
      var t = c.tabela || { colunas: [], linhas: [] };
      var head = '<tr>' + (t.colunas || []).map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr>';
      var rows = (t.linhas || []).map(function (r, i) { return '<tr class="aula-anim" style="--i:' + (i + 2) + '">' + (r || []).map(function (x) { return '<td>' + marcar(x, c.destaques, c.id) + '</td>'; }).join('') + '</tr>'; }).join('');
      return eyebrow(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + '<table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table>' + rodape(c, ctx, idx, total);
    },
    assertiva: function (c, ctx, idx, total) {
      var a = c.assertiva || {};
      return eyebrow('Questão de prova', 0) + titulo(c, a.origem ? '<span class="aula-tag">' + esc(a.origem) + '</span>' : '') +
        '<div class="aula-box aula-anim" style="--i:2"><div class="aula-atext">' + esc(a.texto || '') + '</div></div>' +
        '<div class="aula-ask aula-anim" style="--i:3"><span>Como você julga?</span><span class="aula-pill">Certo</span><span class="aula-pill">Errado</span></div>' +
        rodape(c, ctx, idx, total);
    },
    resposta: function (c, ctx, idx, total) {
      var r = c.resposta || {};
      var g = String(r.gabarito || '').toLowerCase();
      return eyebrow('Gabarito', 0) + titulo(c) + '<div class="aula-anim" style="--i:2"><span class="aula-badge ' + (g === 'certo' ? 'certo' : 'errado') + '">' + esc(r.gabarito || '') + '</span></div>' +
        itensHtml(c, r.justificativa) + rodape(c, ctx, idx, total);
    },
    encerramento: function (c, ctx, idx, total) {
      return '<div>' + eyebrow('Síntese', 0) + titulo(c) + subtitulo(c) + itensHtml(c, c.itens) + '</div>' +
        '<div class="aula-side"><div class="aula-cta aula-anim" style="--i:4">Resolva as questões da unidade e leia o material.</div>' + logoHtml(ctx) + '</div>' +
        rodape(c, ctx, idx, total, { esq: rotuloUnidade(ctx) });
    },
  };

  function render(cena, ctx, idx, total) {
    var layout = LAYOUTS[cena.layout] ? cena.layout : 'padrao';
    var extra = (layout === 'padrao' && midiaDe(ctx, cena.imagem_id)) ? ' has-img' : '';
    return '<section class="aula-slide aula-' + layout + extra + '" data-cena="' + esc(cena.id) + '" data-layout="' + layout + '">' + LAYOUTS[layout](cena, ctx, idx || 0, total || 1) + '</section>';
  }

  /* Monta todas as cenas no palco; devolve um controle simples de navegação. */
  function mount(stage, roteiro, ctx) {
    var cenas = (roteiro && roteiro.cenas) || [];
    stage.innerHTML = cenas.map(function (c, i) { return render(c, ctx, i, cenas.length); }).join('');
    var slides = stage.querySelectorAll('.aula-slide');
    var atual = -1;
    function show(i) {
      if (i < 0 || i >= slides.length) return;
      if (atual >= 0) slides[atual].classList.remove('is-active');
      atual = i; slides[atual].classList.add('is-active');
      stage.dispatchEvent(new CustomEvent('aula:slide', { detail: { index: i, id: cenas[i].id } }));
    }
    if (slides.length) show(0);
    return { show: show, next: function () { show(atual + 1); }, prev: function () { show(atual - 1); }, get index() { return atual; }, total: slides.length,
      destaque: function (id, on) { stage.querySelectorAll('[data-hl="' + id + '"]').forEach(function (el) { el.classList.toggle('is-on', !!on); }); } };
  }

  /* Escala o palco de 1920 x 1080 para caber na largura do invólucro. */
  function fit(wrap) {
    var stage = wrap.querySelector('.aula-stage');
    if (!stage) return;
    function aplicar() {
      var w = wrap.clientWidth || 0; if (!w) return;
      var s = w / 1920;
      stage.style.transform = 'scale(' + s + ')';
      wrap.style.height = Math.round(1080 * s) + 'px';
    }
    aplicar();
    if (typeof ResizeObserver !== 'undefined') { var ro = new ResizeObserver(aplicar); ro.observe(wrap); return function () { ro.disconnect(); }; }
    window.addEventListener('resize', aplicar);
    return function () { window.removeEventListener('resize', aplicar); };
  }

  root.AulaSlides = { render: render, mount: mount, fit: fit, esc: esc, layouts: Object.keys(LAYOUTS) };
})(typeof window !== 'undefined' ? window : this);
