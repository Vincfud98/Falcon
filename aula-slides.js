/* ============================================================================
   Falcon · Aula em slides · renderizador (Fase 2 + Fase 4b)
   Um código só desenha o slide no preview do admin, no player do aluno e no
   MP4 futuro. Recebe o roteiro gravado em aluno.aulas (cenas no formato do
   servidor) e o contexto da unidade; devolve HTML no palco de 1920 x 1080.
   Sem dependências. Expõe window.AulaSlides.
   Fase 4b: ajuste automático do texto (encolhe até caber), formas automáticas
   para o layout imagem (retrato, quadro, paisagem, panorama, imersiva),
   cronologia vertical com imagem por evento, layouts conceito / cartoes /
   pergunta / comparacao / referencias, interação (clique, marca-texto) e
   tema claro / tamanho de fonte.
   ========================================================================== */
(function (root) {
  'use strict';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>';
  var ICON_BOOK = '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
  var ICON_ARTIGO = '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>';
  var ICON_SITE = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  var ICON_FILME = '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 6l-2-3"/><path d="M10 6l-2-3"/><path d="M14 6l-2-3"/><path d="M18 6l-2-3"/></svg>';
  var MIN_FZ = 0.58;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function curto(s, n) { s = String(s == null ? '' : s).trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }

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
  /* Rótulo em pílula com o ícone do logo: identidade discreta em todo slide. */
  function rotuloHtml(ctx, txt, i) {
    var icone = (ctx && ctx.logoSvg) ? '<span class="aula-label-logo">' + ctx.logoSvg + '</span>' : '';
    return '<div class="aula-label aula-anim" style="--i:' + (i || 0) + '"><span>' + esc(txt) + '</span></div>'.replace('<span>', icone + '<span>');
  }
  function imagensDe(ctx, cena) {
    var ids = Array.isArray(cena.imagens) && cena.imagens.length ? cena.imagens : (cena.imagem_id ? [cena.imagem_id] : []);
    return ids.map(function (id) { return midiaDe(ctx, id); }).filter(Boolean);
  }
  function imgTag(m, extra) {
    if (!m || !m.url) return '';
    return '<img src="' + esc(m.url) + '" alt="' + esc(m.titulo || '') + '" data-titulo="' + esc(m.titulo || '') + '" data-legenda="' + esc(m.legenda || '') + '" data-credito="' + esc(m.credito || '') + '"' + (extra || '') + '>';
  }
  /* Fundo de imagem que o modo visual do player revela por inteiro (a legenda vem do catálogo). */
  function fundoVisual(ctx, cena) {
    var m = imagensDe(ctx, cena)[0];
    if (!m) return '';
    return '<div class="aula-visual"><img src="' + esc(m.url) + '" alt=""><div class="aula-visual-cap"><div class="aula-visual-t">' + esc(m.titulo || '') + '</div><div class="aula-visual-x">' + esc(cena.legenda || m.legenda || '') + (m.credito ? ' · ' + esc(m.credito) : '') + '</div></div></div>';
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
  var _ctxAtual = null;
  function label(txt, i) { return rotuloHtml(_ctxAtual, txt, i); }
  function titulo(cena, extra) { return '<h2 class="aula-title aula-anim" style="--i:1">' + marcar(cena.titulo, cena.destaques, cena.id) + (extra || '') + '</h2>'; }
  function subtitulo(cena) { return cena.subtitulo ? '<p class="aula-subtitle aula-anim" style="--i:2">' + marcar(cena.subtitulo, cena.destaques, cena.id) + '</p>' : ''; }
  /* elementos genéricos {rotulo,titulo,texto} → listas específicas quando o roteiro veio no formato do modelo */
  function elementos(c, chave) {
    if (Array.isArray(c[chave]) && c[chave].length) return c[chave];
    return Array.isArray(c.elementos) ? c.elementos : [];
  }

  var LAYOUTS = {
    capa: function (c, ctx, idx, total) {
      var bg = (ctx && ctx.capaUrl) ? '<div class="aula-bgimg" style="background-image:url(\'' + esc(ctx.capaUrl) + '\')"></div>' : '';
      return bg + '<div class="aula-shade"></div><div class="aula-glow"></div>' +
        '<div class="aula-capa-top">' + logoHtml(ctx) + '<span class="aula-eyebrow">' + esc(rotuloUnidade(ctx) || 'Aula') + '</span></div>' +
        '<div class="aula-capa-body">' + label('Aula em slides', 0) + titulo(c) + '<div class="aula-divider aula-anim" style="--i:2"></div>' + subtitulo(c) +
        (c.legenda ? '<p class="aula-body aula-anim" style="--i:3">' + esc(c.legenda) + '</p>' : '') + '</div>';
    },
    /* Agenda da aula: colunas numeradas (o que vamos ver). */
    roteiro: function (c, ctx, idx, total) {
      var tops = (c.topicos || []).map(function (t, i) {
        return '<div class="aula-topico aula-anim" style="--i:' + (i + 2) + '"><div class="aula-topico-n">' + esc(t.numero || pad2(i + 1)) + '</div><div class="aula-topico-t">' + marcar(t.titulo, c.destaques, c.id) + '</div>' + (t.texto ? '<div class="aula-topico-x">' + marcar(t.texto, c.destaques, c.id) + '</div>' : '') + '</div>';
      }).join('');
      return label(rotuloUnidade(ctx) || 'Roteiro', 0) + titulo(c) + subtitulo(c) + '<div class="aula-topicos">' + tops + '</div>' + rodape(c, ctx, idx, total, { esq: 'Roteiro da aula' });
    },
    /* Números que importam: grade de cifras grandes. */
    numeros: function (c, ctx, idx, total) {
      var ns = (c.numeros || []).map(function (n, i) {
        return '<div class="aula-num-item aula-anim" style="--i:' + (i + 2) + '"><div class="aula-num-v">' + esc(n.valor) + '</div><div class="aula-num-l">' + marcar(n.rotulo, c.destaques, c.id) + '</div>' + (n.texto ? '<div class="aula-num-x">' + marcar(n.texto, c.destaques, c.id) + '</div>' : '') + '</div>';
      }).join('');
      return label(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + '<div class="aula-nums aula-nums-' + Math.min(4, Math.max(2, (c.numeros || []).length)) + '">' + ns + '</div>' + rodape(c, ctx, idx, total);
    },
    /* Mosaico de imagens da unidade. */
    galeria: function (c, ctx, idx, total) {
      var ms = imagensDe(ctx, c).slice(0, 4);
      var tiles = ms.map(function (m, i) {
        return '<figure class="aula-tile aula-anim" style="--i:' + (i + 2) + '">' + imgTag(m) + '<figcaption><div class="aula-tile-t">' + esc(m.titulo || '') + '</div>' + (m.legenda ? '<div class="aula-tile-x">' + esc(m.legenda) + '</div>' : '') + '</figcaption></figure>';
      }).join('');
      return label(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + '<div class="aula-mosaico aula-mosaico-' + Math.max(1, ms.length) + '">' + tiles + '</div>' + rodape(c, ctx, idx, total);
    },
    secao: function (c, ctx, idx, total) {
      var n = c.numero_secao || '';
      return '<div class="aula-bar"><div class="aula-num aula-anim" style="--i:0">' + esc(n) + '</div></div>' +
        '<div class="aula-secao-body">' + label('Seção', 1) + titulo(c) + subtitulo(c) + '</div>' +
        rodape(c, ctx, idx, total, { esq: rotuloUnidade(ctx) });
    },
    padrao: function (c, ctx, idx, total) {
      var m = midiaDe(ctx, c.imagem_id);
      var img = m ? '<div class="aula-anim" style="--i:2"><div class="aula-side-img">' + imgTag(m) + '</div>' + (c.legenda || m.legenda ? '<div class="aula-side-cap">' + esc(c.legenda || m.legenda) + '</div>' : '') + '</div>' : '';
      return fundoVisual(ctx, c) + '<div class="aula-conteudo">' + label(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + itensHtml(c, c.itens) + '</div>' + img + rodape(c, ctx, idx, total);
    },
    pilares: function (c, ctx, idx, total) {
      var cards = elementos(c, 'colunas').map(function (col, i) {
        return '<div class="aula-card aula-anim" style="--i:' + (i + 2) + '"><div class="aula-card-t">' + marcar(col.titulo, c.destaques, c.id) + '</div><div class="aula-card-x">' + marcar(col.texto, c.destaques, c.id) + '</div></div>';
      }).join('');
      return label(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + '<div class="aula-grid">' + cards + '</div>' + rodape(c, ctx, idx, total);
    },
    definicao: function (c, ctx, idx, total) {
      return label('Conceito', 0) + '<div class="aula-term aula-anim" style="--i:1">' + esc(c.termo || c.titulo) + '</div>' +
        '<div class="aula-def aula-anim" style="--i:2">' + marcar(c.definicao || c.subtitulo || '', c.destaques, c.id) + '</div>' + rodape(c, ctx, idx, total);
    },
    citacao: function (c, ctx, idx, total) {
      var q = c.citacao || {};
      var m = midiaDe(ctx, c.imagem_id);
      var retrato = m ? '<div class="aula-retrato aula-anim" style="--i:0">' + imgTag(m) + '</div>' : '<div class="aula-qmark aula-anim" style="--i:0">“</div>';
      return retrato + '<div class="aula-quote aula-anim" style="--i:1">' + marcar(q.texto || c.subtitulo || '', c.destaques, c.id) + '</div>' +
        '<div class="aula-divider-c aula-anim" style="--i:2"></div><div class="aula-author aula-anim" style="--i:2">' + esc(q.autor || c.titulo || '') + '</div>' + rodape(c, ctx, idx, total);
    },
    /* Cronologia: horizontal quando são poucos eventos sem imagem; vertical com painel de imagem quando há imagens (modelo do slide-display). */
    cronologia: function (c, ctx, idx, total) {
      var evs = c.eventos || [];
      if (cronologiaVertical(c, ctx)) {
        var principal = midiaDe(ctx, c.imagem_id);
        var primeira = null;
        var itens = evs.map(function (ev, i) {
          var m = midiaDe(ctx, ev.imagem_id); if (m && !primeira) primeira = m;
          return '<div class="aula-tlv-item aula-anim" style="--i:' + (i + 2) + '" data-ativar="' + i + '"' + (m ? ' data-img="' + esc(m.url) + '" data-cap="' + esc(ev.titulo || m.titulo || '') + '"' : '') + '>' +
            '<div class="aula-tlv-head"><div class="aula-tlv-y">' + esc(ev.ano) + '</div><div class="aula-tlv-t">' + marcar(ev.titulo, c.destaques, c.id) + '</div></div>' +
            (ev.texto ? '<div class="aula-tlv-x">' + marcar(ev.texto, c.destaques, c.id) + '</div>' : '') + '</div>';
        }).join('');
        var ini = principal || primeira;
        var side = '<div class="aula-tlv-side aula-anim" style="--i:2"><div class="aula-tlv-img"' + (ini ? ' data-inicial="' + esc(ini.url) + '"' : '') + '>' + (ini ? imgTag(ini) : '<div class="aula-tlv-vazio">' + esc((evs[0] && evs[0].ano) || '') + '</div>') + '</div><div class="aula-tlv-cap"></div></div>';
        return '<div class="aula-conteudo">' + label(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + '<div class="aula-tlv">' + itens + '</div></div>' + side + rodape(c, ctx, idx, total);
      }
      var w = evs.length ? (100 / evs.length) : 100;
      var html = evs.map(function (ev, i) {
        return '<div class="aula-ev ' + (i % 2 ? 'down' : 'up') + ' aula-anim" style="--w:' + w + '%;left:' + (w * i) + '%;--i:' + (i + 2) + '"><div class="aula-dot"></div><div class="aula-ev-box">' +
          '<div class="aula-ev-y">' + esc(ev.ano) + '</div><div class="aula-ev-t">' + marcar(ev.titulo, c.destaques, c.id) + '</div><div class="aula-ev-x">' + marcar(ev.texto, c.destaques, c.id) + '</div></div></div>';
      }).join('');
      return label(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + '<div class="aula-tl"><div class="aula-tl-line"></div>' + html + '</div>' + rodape(c, ctx, idx, total);
    },
    /* Imagem: a forma (retrato, quadro, paisagem, panorama, imersiva) é decidida no mount, pela proporção da figura. */
    imagem: function (c, ctx, idx, total) {
      var m = midiaDe(ctx, c.imagem_id) || {};
      var rot = c.rotulo || curto(m.titulo || 'Imagem da unidade', 44);
      return fundoVisual(ctx, c) + '<div class="aula-frame aula-anim" style="--i:0">' + imgTag(m) + '</div><div class="aula-shade"></div>' +
        '<div class="aula-imagem-side">' + label(rot, 1) + titulo(c) +
        (c.legenda || m.legenda ? '<div class="aula-cap aula-anim" style="--i:2">' + marcar(c.legenda || m.legenda, c.destaques, c.id) + '</div>' : '') +
        itensHtml(c, c.itens) + (m.credito ? '<div class="aula-credit aula-anim" style="--i:5">' + esc(m.credito) + '</div>' : '') + '</div>' +
        rodape(c, ctx, idx, total);
    },
    tabela: function (c, ctx, idx, total) {
      var t = c.tabela || { colunas: [], linhas: [] };
      var head = '<tr>' + (t.colunas || []).map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr>';
      var rows = (t.linhas || []).map(function (r, i) { return '<tr class="aula-anim" style="--i:' + (i + 2) + '">' + (r || []).map(function (x) { return '<td>' + marcar(x, c.destaques, c.id) + '</td>'; }).join('') + '</tr>'; }).join('');
      return label(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + '<table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table>' + rodape(c, ctx, idx, total);
    },
    /* Comparação A × B: a tabela tem 3 colunas (critério, lado A, lado B). */
    comparacao: function (c, ctx, idx, total) {
      var t = c.tabela || { colunas: [], linhas: [] };
      var cols = t.colunas || [];
      var a = cols[1] || 'A', b = cols[2] || 'B';
      var linhas = (t.linhas || []).map(function (r, i) {
        r = r || [];
        return '<div class="aula-cp-a aula-anim" style="--i:' + (i + 3) + '">' + marcar(r[1] || '', c.destaques, c.id) + '</div><div class="aula-cp-c aula-anim" style="--i:' + (i + 3) + '">' + marcar(r[0] || '', c.destaques, c.id) + '</div><div class="aula-cp-b aula-anim" style="--i:' + (i + 3) + '">' + marcar(r[2] || '', c.destaques, c.id) + '</div>';
      }).join('');
      return label(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + '<div class="aula-cp"><div class="aula-cp-h aula-anim" style="--i:2">' + marcar(a, c.destaques, c.id) + '</div><div class="aula-cp-vs aula-anim" style="--i:2">' + esc(cols[0] || 'vs') + '</div><div class="aula-cp-h b aula-anim" style="--i:2">' + marcar(b, c.destaques, c.id) + '</div>' + linhas + '</div>' + rodape(c, ctx, idx, total);
    },
    /* Conceito: glossário interativo (termos à esquerda, definição do termo ativo à direita). */
    conceito: function (c, ctx, idx, total) {
      var termos = elementos(c, 'termos').map(function (t) { return { termo: t.termo || t.rotulo || t.titulo || '', meta: t.meta || (t.termo ? t.titulo : '') || '', definicao: t.definicao || t.texto || '', nota: t.nota || '' }; });
      var lista = termos.map(function (t, i) { return '<button type="button" class="aula-gl-item aula-anim' + (i === 0 ? ' is-ativo' : '') + '" style="--i:' + (i + 2) + '" data-ativar="' + i + '">' + marcar(t.termo, c.destaques, c.id) + '</button>'; }).join('');
      var paineis = termos.map(function (t, i) {
        return '<div class="aula-gl-panel' + (i === 0 ? ' is-ativo' : '') + '" data-panel="' + i + '"><div class="aula-gl-term">' + esc(t.termo) + '</div>' + (t.meta ? '<div class="aula-gl-meta">' + esc(t.meta) + '</div>' : '') +
          '<div class="aula-gl-def">' + marcar(t.definicao, c.destaques, c.id) + '</div>' + (t.nota ? '<div class="aula-gl-nota"><div class="aula-gl-nota-k">Atenção</div><div class="aula-gl-nota-x">' + marcar(t.nota, c.destaques, c.id) + '</div></div>' : '') + '</div>';
      }).join('');
      return label(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + '<div class="aula-gl"><div class="aula-gl-list"><div class="aula-gl-k">Termos</div>' + lista + '</div><div class="aula-gl-main">' + paineis + '</div></div>' + rodape(c, ctx, idx, total);
    },
    /* Cartões: grade de 2 a 6 cartões; o cartão narrado (ou clicado) expande. */
    cartoes: function (c, ctx, idx, total) {
      var cs = elementos(c, 'cartoes');
      var n = Math.min(6, Math.max(2, cs.length));
      var cards = cs.slice(0, 6).map(function (k, i) {
        return '<div class="aula-ct-item aula-anim" style="--i:' + (i + 2) + '" data-ativar="' + i + '" data-toggle="1"><div class="aula-ct-n">' + esc(k.rotulo || pad2(i + 1)) + '</div><div class="aula-ct-t">' + marcar(k.titulo, c.destaques, c.id) + '</div><div class="aula-ct-x">' + marcar(k.texto, c.destaques, c.id) + '</div></div>';
      }).join('');
      return label(rotuloUnidade(ctx), 0) + titulo(c) + subtitulo(c) + '<div class="aula-ct aula-ct-' + n + '">' + cards + '</div>' + rodape(c, ctx, idx, total);
    },
    /* Pergunta do professor: a resposta fica escondida até o clique (ou até a narração chegar nela). */
    pergunta: function (c, ctx, idx, total) {
      return label('Pergunta', 0) + '<div class="aula-pg-q"><div class="aula-pg-mark aula-anim" style="--i:0">?</div><div>' + titulo(c) +
        '<button type="button" class="aula-pg-btn aula-anim" style="--i:2" data-revelar="1">Ver a resposta</button></div></div>' +
        '<div class="aula-pg-r"><div class="aula-pg-rk">Resposta</div>' + (c.subtitulo ? '<div class="aula-pg-rt">' + marcar(c.subtitulo, c.destaques, c.id) + '</div>' : '') + itensHtml(c, c.itens) + '</div>' +
        rodape(c, ctx, idx, total);
    },
    /* Referências: obras citadas na unidade. */
    referencias: function (c, ctx, idx, total) {
      var refs = elementos(c, 'referencias');
      if (!refs.length && Array.isArray(c.itens)) refs = c.itens.map(function (s) { return { titulo: s }; });
      var itens = refs.slice(0, 8).map(function (r, i) {
        var tipo = String(r.tipo || '').toLowerCase();
        var ico = /artigo|article|revista/.test(tipo) ? ICON_ARTIGO : /site|web|internet/.test(tipo) ? ICON_SITE : /filme|film|document|v[ií]deo/.test(tipo) ? ICON_FILME : ICON_BOOK;
        return '<div class="aula-rf-item aula-anim" style="--i:' + (i + 2) + '"><div class="aula-rf-ico">' + ico + '</div><div>' + (r.autor || r.rotulo ? '<div class="aula-rf-a">' + esc(r.autor || r.rotulo) + '</div>' : '') + '<div class="aula-rf-t">' + marcar(r.titulo, c.destaques, c.id) + '</div>' + (r.texto ? '<div class="aula-rf-x">' + marcar(r.texto, c.destaques, c.id) + '</div>' : '') + '</div></div>';
      }).join('');
      return label('Para ler', 0) + titulo(c) + subtitulo(c) + '<div class="aula-rf' + (refs.length <= 3 ? ' is-uma' : '') + '">' + itens + '</div>' + rodape(c, ctx, idx, total);
    },
    assertiva: function (c, ctx, idx, total) {
      var a = c.assertiva || {};
      return label('Questão de prova', 0) + titulo(c, a.origem ? '<span class="aula-tag">' + esc(a.origem) + '</span>' : '') +
        '<div class="aula-box aula-anim" style="--i:2"><div class="aula-atext">' + esc(a.texto || '') + '</div></div>' +
        '<div class="aula-ask aula-anim" style="--i:3"><span>Como você julga?</span><span class="aula-pill">Certo</span><span class="aula-pill">Errado</span></div>' +
        rodape(c, ctx, idx, total);
    },
    resposta: function (c, ctx, idx, total) {
      var r = c.resposta || {};
      var g = String(r.gabarito || '').toLowerCase();
      return label('Gabarito', 0) + titulo(c) + '<div class="aula-anim" style="--i:2"><span class="aula-badge ' + (g === 'certo' ? 'certo' : 'errado') + '">' + esc(r.gabarito || '') + '</span></div>' +
        itensHtml(c, r.justificativa) + rodape(c, ctx, idx, total);
    },
    encerramento: function (c, ctx, idx, total) {
      return '<div>' + label('Síntese', 0) + titulo(c) + subtitulo(c) + itensHtml(c, c.itens) + '</div>' +
        '<div class="aula-side"><div class="aula-cta aula-anim" style="--i:4">Resolva as questões da unidade e leia o material.</div>' + logoHtml(ctx) + '</div>' +
        rodape(c, ctx, idx, total, { esq: rotuloUnidade(ctx) });
    },
  };

  /* Duas formas de cronologia: a horizontal (linha com marcos alternados) é a padrão;
     a vertical com painel entra quando há imagem (do slide ou de algum evento) ou quando são mais de 6 eventos. */
  function cronologiaVertical(c, ctx) {
    var evs = c.eventos || [];
    if (evs.length > 6) return true;
    if (midiaDe(ctx, c.imagem_id)) return true;
    return evs.some(function (ev) { return !!midiaDe(ctx, ev.imagem_id); });
  }
  function imagemImersiva(c) {
    var itens = Array.isArray(c.itens) ? c.itens.length : 0;
    return itens <= 1 && String(c.legenda || '').length <= 170 && String(c.titulo || '').length <= 70;
  }

  function render(cena, ctx, idx, total) {
    var layout = LAYOUTS[cena.layout] ? cena.layout : 'padrao';
    var extra = (layout === 'padrao' && midiaDe(ctx, cena.imagem_id)) ? ' has-img' : '';
    if ((layout === 'padrao' || layout === 'imagem') && imagensDe(ctx, cena).length) extra += ' has-visual';
    if (layout === 'imagem' && imagemImersiva(cena)) extra += ' is-imersiva';
    if (layout === 'cronologia' && cronologiaVertical(cena, ctx)) extra += ' is-vertical';
    _ctxAtual = ctx;
    var html = LAYOUTS[layout](cena, ctx, idx || 0, total || 1);
    _ctxAtual = null;
    return '<section class="aula-slide aula-' + layout + extra + '" data-cena="' + esc(cena.id) + '" data-layout="' + layout + '">' + html + '</section>';
  }

  /* Ajuste automático: mede o conteúdo do slide ativo e encolhe a fonte (--aula-fz) até caber no palco. */
  function ajustar(slide) {
    if (!slide || getComputedStyle(slide).display === 'none') return 1;
    slide.style.setProperty('--aula-fz', '1');
    var cs = getComputedStyle(slide);
    var limB = 1080 - (parseFloat(cs.paddingBottom) || 0), limR = 1920 - (parseFloat(cs.paddingRight) || 0);
    var rect = slide.getBoundingClientRect();
    var sc = rect.width / 1920 || 1;
    function excede() {
      var maxB = 0, maxR = 0, minT = 0, minL = 0;
      Array.prototype.forEach.call(slide.children, function (el) {
        var st = getComputedStyle(el);
        if (st.position === 'absolute' || st.position === 'fixed' || st.display === 'none') return;
        var r = el.getBoundingClientRect();
        var alto = Math.max(r.height / sc, el.scrollHeight || 0), largo = Math.max(r.width / sc, el.scrollWidth || 0);
        var t = (r.top - rect.top) / sc, l = (r.left - rect.left) / sc;
        var b = t + alto, d = l + largo;
        if (b > maxB) maxB = b;
        if (d > maxR) maxR = d;
        if (t < minT) minT = t;   // conteúdo ancorado embaixo (capa, imersiva) transborda para cima
        if (l < minL) minL = l;
      });
      return maxB > limB + 2 || maxR > limR + 2 || minT < -2 || minL < -2;
    }
    var fz = 1, passos = 0;
    while (excede() && fz > MIN_FZ && passos < 14) {
      fz = Math.round((fz - 0.04) * 100) / 100;
      slide.style.setProperty('--aula-fz', String(fz));
      passos++;
    }
    return fz;
  }

  /* Forma do slide de imagem pela proporção da figura carregada. */
  function classificarImagem(slide, img) {
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    var r = img.naturalWidth / img.naturalHeight;
    slide.classList.remove('is-retrato', 'is-quadro', 'is-paisagem', 'is-panorama');
    if (r >= 1.9) { slide.classList.add('is-panorama'); slide.classList.remove('is-imersiva'); }
    else if (r < 0.95) { slide.classList.add('is-retrato'); slide.classList.remove('is-imersiva'); }
    else if (r < 1.3) slide.classList.add('is-quadro');
    else slide.classList.add('is-paisagem');
  }

  /* Interação dentro do slide: termos, cartões, eventos (k = índice) */
  function ativar(slide, k, toggle) {
    var itens = slide.querySelectorAll('[data-ativar]'); if (!itens.length) return false;
    var alvo = null;
    Array.prototype.forEach.call(itens, function (el) { if (String(el.getAttribute('data-ativar')) === String(k)) alvo = el; });
    if (!alvo) return false;
    var ligar = !(toggle && alvo.classList.contains('is-ativo'));
    Array.prototype.forEach.call(itens, function (el) { el.classList.toggle('is-ativo', ligar && el === alvo); });
    Array.prototype.forEach.call(slide.querySelectorAll('[data-panel]'), function (p) { p.classList.toggle('is-ativo', ligar && p.getAttribute('data-panel') === String(k)); });
    var grupo = slide.querySelector('.aula-ct'); if (grupo) grupo.classList.toggle('has-ativo', ligar);
    var side = slide.querySelector('.aula-tlv-img');
    if (side) {
      var cap = slide.querySelector('.aula-tlv-cap');
      var url = ligar ? alvo.getAttribute('data-img') : null;
      if (url) { if (!side.querySelector('img') || side.querySelector('img').getAttribute('src') !== url) side.innerHTML = '<img src="' + esc(url) + '" alt="">'; if (cap) cap.textContent = alvo.getAttribute('data-cap') || ''; }
      else if (!ligar || !alvo.getAttribute('data-img')) { var ini = side.getAttribute('data-inicial'); if (ini && (!side.querySelector('img') || side.querySelector('img').getAttribute('src') !== ini)) side.innerHTML = '<img src="' + esc(ini) + '" alt="">'; if (cap && ligar) cap.textContent = ''; }
    }
    return true;
  }
  function revelar(slide) { if (slide) slide.classList.add('is-revelada'); }

  /* Monta todas as cenas no palco; devolve um controle de navegação e interação. */
  function mount(stage, roteiro, ctx) {
    var cenas = (roteiro && roteiro.cenas) || [];
    stage.innerHTML = cenas.map(function (c, i) { return render(c, ctx, i, cenas.length); }).join('');
    var slides = stage.querySelectorAll('.aula-slide');
    var atual = -1, ordemImg = 0, ultimaImersiva = false;
    Array.prototype.forEach.call(slides, function (s) {
      if (s.classList.contains('aula-imagem')) {
        // dois slides de imagem seguidos nunca têm a mesma forma: imersiva não repete, e as laterais alternam o lado
        if (s.classList.contains('is-imersiva') && ultimaImersiva) s.classList.remove('is-imersiva');
        ultimaImersiva = s.classList.contains('is-imersiva');
        if (!ultimaImersiva) { if (ordemImg % 2) s.classList.add('is-dir'); ordemImg++; }
      } else if (!s.classList.contains('aula-galeria')) ultimaImersiva = false;
      var img = s.classList.contains('aula-imagem') ? s.querySelector('.aula-frame img') : null;
      if (img) {
        var aplicar = function () { classificarImagem(s, img); if (s.classList.contains('is-active')) ajustar(s); };
        if (img.complete && img.naturalWidth) aplicar(); else img.addEventListener('load', aplicar, { once: true });
      }
      Array.prototype.forEach.call(s.querySelectorAll('img'), function (im) { im.addEventListener('load', function () { if (s.classList.contains('is-active')) ajustar(s); }); });
    });
    function show(i) {
      if (i < 0 || i >= slides.length) return;
      if (atual >= 0) slides[atual].classList.remove('is-active');
      atual = i; slides[atual].classList.add('is-active');
      ajustar(slides[atual]);
      stage.dispatchEvent(new CustomEvent('aula:slide', { detail: { index: i, id: cenas[i].id } }));
    }
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (atual >= 0) ajustar(slides[atual]); });
    stage.addEventListener('click', function (ev) {
      var t = ev.target;
      var slide = t.closest ? t.closest('.aula-slide') : null; if (!slide) return;
      var at = t.closest('[data-ativar]'); if (at && slide.contains(at)) { ativar(slide, at.getAttribute('data-ativar'), at.getAttribute('data-toggle') === '1'); return; }
      var rv = t.closest('[data-revelar]'); if (rv) { revelar(slide); return; }
      if (t.tagName === 'IMG' && t.closest('.aula-frame, .aula-side-img, .aula-tile, .aula-tlv-img, .aula-retrato')) {
        stage.dispatchEvent(new CustomEvent('aula:imagem', { detail: { url: t.getAttribute('src'), titulo: t.getAttribute('data-titulo') || t.getAttribute('alt') || '', legenda: t.getAttribute('data-legenda') || '', credito: t.getAttribute('data-credito') || '' } }));
      }
    });
    if (slides.length) show(0);
    return {
      show: show, next: function () { show(atual + 1); }, prev: function () { show(atual - 1); }, get index() { return atual; }, total: slides.length,
      destaque: function (id, on) {
        stage.querySelectorAll('[data-hl="' + id + '"]').forEach(function (el) {
          el.classList.toggle('is-on', !!on);
          if (!on) return;
          var slide = el.closest('.aula-slide'); if (!slide) return;
          var host = el.closest('[data-ativar]'); if (host) { ativar(slide, host.getAttribute('data-ativar'), false); return; }
          var painel = el.closest('[data-panel]'); if (painel) { ativar(slide, painel.getAttribute('data-panel'), false); return; }
          if (el.closest('.aula-pg-r')) revelar(slide);
        });
      },
      revelar: function () { if (atual >= 0) revelar(slides[atual]); },
      ativar: function (k, toggle) { return atual >= 0 && ativar(slides[atual], k, toggle); },
      ajustar: function () { if (atual >= 0) return ajustar(slides[atual]); },
      fonte: function (f) { stage.style.setProperty('--aula-fzu', String(f || 1)); if (atual >= 0) ajustar(slides[atual]); },
      tema: function (claro) { stage.classList.toggle('is-light', !!claro); },
      visual: function (on) { if (atual < 0) return false; var s = slides[atual]; if (!s.classList.contains('has-visual')) return false; s.classList.toggle('is-visual', on == null ? !s.classList.contains('is-visual') : !!on); return s.classList.contains('is-visual'); },
      temVisual: function () { return atual >= 0 && slides[atual].classList.contains('has-visual'); },
      layout: function () { return atual >= 0 ? slides[atual].getAttribute('data-layout') : ''; }
    };
  }

  /* Escala o palco de 1920 x 1080 para caber no invólucro.
     Padrão: pela largura (o invólucro ganha a altura proporcional).
     opts.contain: cabe na largura E na altura do invólucro e fica centrado
     (player em tela cheia; o palco precisa estar position:absolute). */
  function fit(wrap, opts) {
    var stage = wrap.querySelector('.aula-stage');
    if (!stage) return;
    var contain = !!(opts && opts.contain);
    function aplicar() {
      var w = wrap.clientWidth || 0; if (!w) return;
      if (contain) {
        var h = wrap.clientHeight || 0; if (!h) return;
        var sc = Math.min(w / 1920, h / 1080);
        stage.style.transform = 'scale(' + sc + ')';
        stage.style.left = Math.round((w - 1920 * sc) / 2) + 'px';
        stage.style.top = Math.round((h - 1080 * sc) / 2) + 'px';
        return;
      }
      var s = w / 1920;
      stage.style.transform = 'scale(' + s + ')';
      wrap.style.aspectRatio = 'auto';   // a altura vem daqui; com aspect-ratio + altura o invólucro alargava em loop
      wrap.style.height = Math.round(1080 * s) + 'px';
    }
    aplicar();
    if (typeof ResizeObserver !== 'undefined') { var ro = new ResizeObserver(aplicar); ro.observe(wrap); return function () { ro.disconnect(); }; }
    window.addEventListener('resize', aplicar);
    return function () { window.removeEventListener('resize', aplicar); };
  }

  root.AulaSlides = { render: render, mount: mount, fit: fit, ajustar: ajustar, classificarImagem: classificarImagem, esc: esc, layouts: Object.keys(LAYOUTS) };
})(typeof window !== 'undefined' ? window : this);
