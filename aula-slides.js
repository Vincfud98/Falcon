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


  /* ── ESQUEMAS (Fase 7A): árvore, mapa mental, mnemônico, comparativo, quadros, pirâmide, quadro-resumo ──
     O roteiro gravado traz cena.esquema {forma, raiz, nos[], letras[], lados[], quadros[], niveis[], rodape}.
     O formato enxuto do modelo (rotulo = forma; elementos {rotulo,titulo,texto,nota}) também é aceito:
     texto = itens separados por " | "; rotulo do elemento = pai (árvore/mapa) ou letra (mnemônico). */
  var FORMAS_ESQ = ['arvore', 'mapa', 'mnemonico', 'comparativo', 'quadros', 'piramide', 'resumo'];
  function partes(s) { return String(s == null ? '' : s).split(/\s*\|\s*/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function lerEsquema(c) {
    var e = (c.esquema && typeof c.esquema === 'object') ? c.esquema : null;
    var forma = String((e && e.forma) || c.rotulo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (FORMAS_ESQ.indexOf(forma) < 0) forma = 'arvore';
    var els = Array.isArray(c.elementos) ? c.elementos : [];
    var out = { forma: forma, raiz: (e && e.raiz) || c.titulo || '', rodape: (e && e.rodape) || c.subtitulo || '', nos: [], letras: [], lados: [], quadros: [], niveis: [], palavra: (e && e.palavra) || '', estilo: (e && e.estilo) || '' };
    if (forma === 'arvore' || forma === 'mapa' || forma === 'resumo') {
      out.nos = (e && Array.isArray(e.nos) && e.nos.length) ? e.nos.map(function (n, i) { return { id: n.id || ('n' + (i + 1)), pai: n.pai || null, titulo: n.titulo || '', itens: Array.isArray(n.itens) ? n.itens : partes(n.texto), exemplo: n.exemplo || '', nota: n.nota || '' }; })
        : els.map(function (x, i) { return { id: 'n' + (i + 1), pai: x.rotulo || null, titulo: x.titulo || '', itens: partes(x.texto), exemplo: x.nota || '', nota: '' }; });
      // pai vem como título do nó pai (formato do modelo) ou como id
      out.nos.forEach(function (n) { if (n.pai) { var p = null; out.nos.forEach(function (m) { if (m !== n && (m.id === n.pai || m.titulo === n.pai)) p = m; }); n.pai = p ? p.id : null; } });
    } else if (forma === 'mnemonico') {
      out.letras = (e && Array.isArray(e.letras) && e.letras.length) ? e.letras.map(function (l) { return { letra: String(l.letra || '').slice(0, 2), termo: l.termo || '', texto: l.texto || '' }; })
        : els.map(function (x) { return { letra: String(x.rotulo || (x.titulo || ' ').charAt(0)).slice(0, 2), termo: x.titulo || '', texto: x.texto || '' }; });
      if (!out.palavra) out.palavra = out.letras.map(function (l) { return l.letra; }).join('');
    } else if (forma === 'comparativo') {
      out.lados = (e && Array.isArray(e.lados) && e.lados.length) ? e.lados.map(function (l) { return { titulo: l.titulo || '', itens: Array.isArray(l.itens) ? l.itens : partes(l.texto), nota: l.nota || '' }; })
        : els.map(function (x) { return { titulo: x.titulo || '', itens: partes(x.texto), nota: x.nota || '' }; });
      out.lados = out.lados.slice(0, 2);
    } else if (forma === 'quadros') {
      out.quadros = (e && Array.isArray(e.quadros) && e.quadros.length) ? e.quadros : els.map(function (x) { return { titulo: x.titulo || '', texto: x.texto || '' }; });
      out.quadros = out.quadros.slice(0, 5);
    } else if (forma === 'piramide') {
      out.niveis = (e && Array.isArray(e.niveis) && e.niveis.length) ? e.niveis : els.map(function (x) { return { titulo: x.titulo || '', texto: x.texto || '' }; });
      out.niveis = out.niveis.slice(0, 6);
    }
    return out;
  }
  function esqRaiz(c, txt, cls) { return '<div class="aula-esq-raiz aula-anim ' + (cls || '') + '" style="--i:1" data-no="raiz">' + marcar(txt, c.destaques, c.id) + '</div>'; }
  /* item de árvore/comparativo: "a → b → c" vira cadeia de passos com setas; "título: x / y" vira item com subcaixas */
  function esqItem(c, it, i, cls) {
    var s = String(it || '');
    if (/\s→\s/.test(s) || /\s->\s/.test(s)) {
      var passos = s.split(/\s(?:→|->)\s/);
      return '<div class="aula-esq-cadeia aula-anim" style="--i:' + (i + 2) + '">' + passos.map(function (p, k) { return (k ? '<span class="aula-esq-seta">→</span>' : '') + '<span class="aula-esq-passo" data-lig="1">' + marcar(p, c.destaques, c.id) + '</span>'; }).join('') + '</div>';
    }
    var m = s.match(/^([^:]{2,60}):\s*(.+\s\/\s.+)$/);
    if (m && m[2].split(' / ').length <= 4) {
      return '<div class="aula-esq-it has-sub aula-anim ' + (cls || '') + '" style="--i:' + (i + 2) + '" data-lig="1"><span class="aula-esq-it-t">' + marcar(m[1], c.destaques, c.id) + '</span><span class="aula-esq-subs">' + m[2].split(' / ').map(function (x) { return '<span class="aula-esq-sub">' + marcar(x.trim(), c.destaques, c.id) + '</span>'; }).join('') + '</span></div>';
    }
    return '<div class="aula-esq-it aula-anim ' + (cls || '') + '" style="--i:' + (i + 2) + '" data-lig="1">' + marcar(s, c.destaques, c.id) + '</div>';
  }
  function esqRamo(c, no, filhos, k, nivel) {
    var tone = (k % 2) ? 'tone-b' : 'tone-a';
    var html = '<div class="aula-esq-ramo ' + tone + (nivel ? ' is-sub' : '') + ' aula-anim" style="--i:' + (k + 2) + '" data-ativar="' + esc(no.id) + '" data-toggle="1" data-no="' + esc(no.id) + '">'
      + '<div class="aula-esq-cab">' + marcar(no.titulo, c.destaques, c.id) + '</div>';
    if (no.itens.length || no.exemplo) {
      html += '<div class="aula-esq-itens">' + no.itens.map(function (it, i) { return esqItem(c, it, i + k); }).join('')
        + (no.exemplo ? '<div class="aula-esq-ex aula-anim" style="--i:' + (k + 4) + '">' + marcar(no.exemplo, c.destaques, c.id) + '</div>' : '') + '</div>';
    }
    if (filhos.length) html += '<div class="aula-esq-filhos">' + filhos.map(function (f, j) { return esqRamo(c, f.no, f.filhos, k + j + 1, nivel + 1); }).join('') + '</div>';
    return html + '</div>';
  }
  function esqArvoreDe(nos) {
    var raizes = nos.filter(function (n) { return !n.pai; });
    function filhos(n) { return nos.filter(function (m) { return m.pai === n.id; }).map(function (m) { return { no: m, filhos: filhos(m) }; }); }
    return raizes.map(function (n) { return { no: n, filhos: filhos(n) }; });
  }
  var ESQUEMAS = {
    /* Árvore: raiz à esquerda, ramos com cabeçalho colorido, itens em caixas, exemplo e subramos; linhas ligam tudo. */
    arvore: function (c, ctx, e) {
      var arv = esqArvoreDe(e.nos);
      return '<div class="aula-esq aula-esq-arvore" data-lig-modo="arvore">' + esqRaiz(c, e.raiz) + '<div class="aula-esq-ramos">' + arv.map(function (r, k) { return esqRamo(c, r.no, r.filhos, k, 0); }).join('') + '</div>'
        + (e.rodape ? '<div class="aula-esq-rodape aula-anim" style="--i:8">' + marcar(e.rodape, c.destaques, c.id) + '</div>' : '') + '<svg class="aula-esq-lig" aria-hidden="true"></svg></div>';
    },
    /* Mapa mental: centro no meio, ramos para os dois lados, subnós como linhas de texto (digital, sem caixas). */
    mapa: function (c, ctx, e) {
      var arv = esqArvoreDe(e.nos), esq = [], dir = [];
      function peso(nd) { var n = nd.no; return 1 + n.itens.length + (n.exemplo ? 1 : 0) + nd.filhos.reduce(function (s, f) { return s + peso(f); }, 0); }
      var ords = arv.map(function (r, k) { return { r: r, k: k, p: peso(r) }; }), lado = {}, pd = 0, pe = 0;
      ords.slice().sort(function (a, b) { return b.p - a.p || a.k - b.k; }).forEach(function (o) { if (pd <= pe) { lado[o.k] = 'd'; pd += o.p + 1; } else { lado[o.k] = 'e'; pe += o.p + 1; } });
      ords.forEach(function (o) { (lado[o.k] === 'd' ? dir : esq).push([o.r, o.k]); });
      function no(nd, k, nivel) {
        var f = nd.filhos, n = nd.no;
        return '<div class="aula-mm-no aula-mm-n' + nivel + ' aula-anim" style="--i:' + (k + 2) + '"' + (nivel === 1 ? ' data-ativar="' + n.id + '"' : '') + ' data-no="' + esc(n.id) + '">'
          + '<div class="aula-mm-t"' + (nivel === 1 ? ' data-lig="1"' : '') + '>' + marcar(n.titulo, c.destaques, c.id) + '</div>'
          + (n.itens.length ? '<div class="aula-mm-itens">' + n.itens.map(function (it) { return '<div class="aula-mm-it">' + marcar(it, c.destaques, c.id) + '</div>'; }).join('') + '</div>' : '')
          + (n.exemplo ? '<div class="aula-mm-ex">' + marcar(n.exemplo, c.destaques, c.id) + '</div>' : '')
          + (f.length ? '<div class="aula-mm-filhos">' + f.map(function (x, j) { return no(x, k + j + 1, nivel + 1); }).join('') + '</div>' : '') + '</div>';
      }
      return '<div class="aula-esq aula-esq-mapa" data-lig-modo="mapa"><div class="aula-mm-lado aula-mm-esq">' + esq.map(function (p) { return no(p[0], p[1], 1); }).join('') + '</div>'
        + '<div class="aula-mm-centro aula-anim" style="--i:0" data-no="raiz">' + marcar(e.raiz, c.destaques, c.id) + '</div>'
        + '<div class="aula-mm-lado aula-mm-dir">' + dir.map(function (p) { return no(p[0], p[1], 1); }).join('') + '</div>'
        + (e.rodape ? '<div class="aula-esq-rodape aula-mm-nota aula-anim" style="--i:9">' + marcar(e.rodape, c.destaques, c.id) + '</div>' : '') + '<svg class="aula-esq-lig" aria-hidden="true"></svg></div>';
    },
    /* Mnemônico: fio de letras, cartas grandes com colunas ou setas com significado (varia com a posição na aula). */
    mnemonico: function (c, ctx, e, idx) {
      var ls = e.letras, n = ls.length, temTexto = ls.every(function (l) { return l.texto; });
      var ordem = [['cartas', 'setas', 'fio'], ['fio', 'cartas', 'setas'], ['setas', 'fio', 'cartas']][(idx || 0) % 3];
      var estilo = e.estilo && ordem.indexOf(e.estilo) >= 0 ? e.estilo : ordem.filter(function (s) { return s === 'fio' || (s === 'cartas' && n <= 5 && temTexto) || (s === 'setas' && n <= 7); })[0];
      var html;
      if (estilo === 'cartas') {
        html = '<div class="aula-mn aula-mn-cartas aula-mn-' + n + '">' + ls.map(function (l, i) {
          return '<div class="aula-mn-carta aula-anim" style="--i:' + (i + 2) + '" data-ativar="' + i + '"><div class="aula-mn-letra">' + esc(l.letra) + '</div><div class="aula-mn-termo">' + marcar(l.termo, c.destaques, c.id) + '</div>'
            + (l.texto ? '<div class="aula-mn-det">' + partes(l.texto).map(function (x) { return '<div class="aula-mn-det-it">' + marcar(x, c.destaques, c.id) + '</div>'; }).join('') + '</div>' : '') + '</div>';
        }).join('') + '</div>';
      } else if (estilo === 'setas') {
        html = '<div class="aula-mn aula-mn-setas">' + ls.map(function (l, i) {
          var termo = String(l.termo || ''), ini = termo.charAt(0), resto = termo.slice(1);
          return '<div class="aula-mn-linha aula-anim" style="--i:' + (i + 2) + '" data-ativar="' + i + '"><div class="aula-mn-chev"><span class="aula-mn-ini">' + esc(ini) + '</span>' + marcar(resto, c.destaques, c.id) + '</div><div class="aula-mn-sig">' + marcar(l.texto || '', c.destaques, c.id) + '</div></div>';
        }).join('') + '</div>';
      } else {
        html = '<div class="aula-mn aula-mn-fio">' + ls.map(function (l, i) {
          return '<div class="aula-mn-elo aula-anim" style="--i:' + (i + 2) + '" data-ativar="' + i + '"><div class="aula-mn-circ">' + esc(l.letra) + '</div><div class="aula-mn-cx"><span class="aula-mn-cx-t">' + marcar(l.termo, c.destaques, c.id) + '</span>' + (l.texto ? '<span class="aula-mn-cx-x">' + marcar(l.texto, c.destaques, c.id) + '</span>' : '') + '</div></div>';
        }).join('') + '</div>';
      }
      var palavra = (e.palavra && estilo === 'setas') ? '<div class="aula-mn-palavra aula-anim" style="--i:1">' + e.palavra.split('').map(function (ch) { return '<span>' + esc(ch) + '</span>'; }).join('') + '</div>' : '';
      return '<div class="aula-esq aula-esq-mnemonico is-' + estilo + '">' + palavra + html + (e.rodape ? '<div class="aula-esq-rodape aula-anim" style="--i:' + (n + 2) + '">' + marcar(e.rodape, c.destaques, c.id) + '</div>' : '') + '</div>';
    },
    /* Comparativo: duas colunas com cabeçalho colorido e uma espinha de caixas em cada lado. */
    comparativo: function (c, ctx, e) {
      return '<div class="aula-esq aula-esq-comparativo">' + e.lados.map(function (l, k) {
        return '<div class="aula-cmp-col ' + (k ? 'tone-b' : 'tone-a') + ' aula-anim" style="--i:' + (k + 1) + '" data-ativar="' + k + '"><div class="aula-cmp-cab">' + marcar(l.titulo, c.destaques, c.id) + '</div><div class="aula-cmp-esp">'
          + l.itens.map(function (it, i) { return esqItem(c, it, i + k, 'aula-cmp-it'); }).join('') + (l.nota ? '<div class="aula-esq-ex aula-anim" style="--i:' + (l.itens.length + 2) + '">' + marcar(l.nota, c.destaques, c.id) + '</div>' : '') + '</div></div>';
      }).join('') + (e.rodape ? '<div class="aula-esq-rodape aula-anim" style="--i:8">' + marcar(e.rodape, c.destaques, c.id) + '</div>' : '') + '</div>';
    },
    /* Quadros: 3 a 5 estados lado a lado, cada um com a sua nota. */
    quadros: function (c, ctx, e) {
      var tons = ['tone-a', 'tone-r', 'tone-b', 'tone-g', 'tone-a'];
      return '<div class="aula-esq aula-esq-quadros aula-esq-q' + e.quadros.length + '">' + e.quadros.map(function (q, i) {
        return '<div class="aula-qd ' + tons[i % tons.length] + ' aula-anim" style="--i:' + (i + 1) + '" data-ativar="' + i + '"><div class="aula-qd-cab">' + marcar(q.titulo, c.destaques, c.id) + '</div><div class="aula-qd-x">' + marcar(q.texto, c.destaques, c.id) + '</div></div>';
      }).join('') + (e.rodape ? '<div class="aula-esq-rodape aula-anim" style="--i:7">' + marcar(e.rodape, c.destaques, c.id) + '</div>' : '') + '</div>';
    },
    /* Pirâmide: níveis do topo à base, cada um com a nota ao lado. */
    piramide: function (c, ctx, e) {
      var n = e.niveis.length;
      return '<div class="aula-esq aula-esq-piramide">' + e.niveis.map(function (nv, i) {
        var w = Math.round(34 + (66 * i) / Math.max(1, n - 1));
        return '<div class="aula-pr-nivel aula-anim" style="--i:' + (i + 1) + ';--w:' + w + '%;--k:' + i + ';--n:' + n + '" data-ativar="' + i + '"><div class="aula-pr-bloco"><span>' + marcar(nv.titulo, c.destaques, c.id) + '</span></div>' + (nv.texto ? '<div class="aula-pr-nota">' + marcar(nv.texto, c.destaques, c.id) + '</div>' : '') + '</div>';
      }).join('') + (e.rodape ? '<div class="aula-esq-rodape aula-anim" style="--i:' + (n + 1) + '">' + marcar(e.rodape, c.destaques, c.id) + '</div>' : '') + '</div>';
    },
    /* Quadro-resumo: rótulo à esquerda, lista com subitens à direita (itens que começam com "· " são subitens). */
    resumo: function (c, ctx, e) {
      var linhas = e.nos.filter(function (n) { return !n.pai; });
      return '<div class="aula-esq aula-esq-resumo">' + linhas.map(function (n, k) {
        var lis = '', aberto = false;
        n.itens.forEach(function (it) {
          var m = String(it).match(/^[·•-]\s+(.+)$/);
          if (m) { if (!aberto) { lis += '<ul class="aula-rs-sub">'; aberto = true; } lis += '<li>' + marcar(m[1], c.destaques, c.id) + '</li>'; }
          else { if (aberto) { lis += '</ul>'; aberto = false; } lis += '<li class="aula-rs-it"><span class="aula-ck">' + ICON_CHECK + '</span><span>' + marcar(it, c.destaques, c.id) + '</span></li>'; }
        });
        if (aberto) lis += '</ul>';
        return '<div class="aula-rs-linha aula-anim" style="--i:' + (k + 1) + '" data-ativar="' + n.id + '"><div class="aula-rs-k">' + marcar(n.titulo, c.destaques, c.id) + '</div><ul class="aula-rs-lista">' + lis + '</ul></div>';
      }).join('') + (e.rodape ? '<div class="aula-esq-rodape aula-anim" style="--i:8">' + marcar(e.rodape, c.destaques, c.id) + '</div>' : '') + '</div>';
    }
  };
  function renderEsquema(c, ctx, idx, total) {
    var e = lerEsquema(c);
    var corpo = (ESQUEMAS[e.forma] || ESQUEMAS.arvore)(c, ctx, e, idx);
    var semTitulo = (e.forma === 'arvore' || e.forma === 'mapa') && e.raiz === c.titulo;   // a raiz já é o título
    return label(rotuloUnidade(ctx) || 'Esquema', 0) + (semTitulo ? '' : titulo(c)) + corpo + rodape(c, ctx, idx, total);
  }
  /* Linhas de ligação dos esquemas (árvore e mapa): desenhadas depois do layout, nas medidas do palco. */
  function desenharLigacoes(slide) {
    var esq = slide && slide.querySelector('.aula-esq[data-lig-modo]'); if (!esq) return;
    var svg = esq.querySelector('svg.aula-esq-lig'); if (!svg) return;
    // posição pela cadeia de offsetParent até o próprio esquema: em pixels do palco, sem o
    // deslocamento da animação de entrada (transform) nem a escala do player
    function caixa(el) {
      var l = 0, tp = 0, n = el;
      while (n && n !== esq) { l += n.offsetLeft; tp += n.offsetTop; n = n.offsetParent; }
      var w = el.offsetWidth, h = el.offsetHeight;
      return { l: l, t: tp, r: l + w, b: tp + h, cx: l + w / 2, cy: tp + h / 2 };
    }
    var W = esq.offsetWidth, H = esq.offsetHeight, d = [];
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    function elo(a, b) { var mx = a.r + (b.l - a.r) / 2; d.push('M' + a.r.toFixed(1) + ' ' + a.cy.toFixed(1) + ' C' + mx.toFixed(1) + ' ' + a.cy.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + b.cy.toFixed(1) + ' ' + b.l.toFixed(1) + ' ' + b.cy.toFixed(1)); }
    function eloEsq(a, b) { var mx = a.l - (a.l - b.r) / 2; d.push('M' + a.l.toFixed(1) + ' ' + a.cy.toFixed(1) + ' C' + mx.toFixed(1) + ' ' + a.cy.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + b.cy.toFixed(1) + ' ' + b.r.toFixed(1) + ' ' + b.cy.toFixed(1)); }
    var modo = esq.getAttribute('data-lig-modo');
    if (modo === 'arvore') {
      var raiz = esq.querySelector('.aula-esq-raiz'); if (!raiz) return; var R = caixa(raiz);
      Array.prototype.forEach.call(esq.querySelectorAll('.aula-esq-ramo'), function (ramo) {
        var cab = ramo.querySelector(':scope > .aula-esq-cab'); if (!cab) return; var C = caixa(cab);
        var paiRamo = ramo.parentElement.closest('.aula-esq-ramo');
        var origem = paiRamo ? caixa(paiRamo.querySelector(':scope > .aula-esq-cab')) : R;
        elo(origem, C);
        var itens = ramo.querySelector(':scope > .aula-esq-itens');
        if (itens) Array.prototype.forEach.call(itens.querySelectorAll(':scope > .aula-esq-it, :scope > .aula-esq-cadeia > .aula-esq-passo:first-child'), function (it) { elo(C, caixa(it)); });
      });
    } else if (modo === 'mapa') {
      var centro = esq.querySelector('.aula-mm-centro'); if (!centro) return; var Cc = caixa(centro);
      Array.prototype.forEach.call(esq.querySelectorAll('.aula-mm-n1 > .aula-mm-t'), function (tt) {
        var T = caixa(tt); if (T.cx < Cc.cx) eloEsq(Cc, T); else elo(Cc, T);
      });
    }
    svg.innerHTML = '<path d="' + d.join(' ') + '"/>';
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
    /* Esquema: diagrama de caixas e linhas em sete formas (árvore, mapa mental, mnemônico, comparativo, quadros, pirâmide, quadro-resumo). */
    esquema: function (c, ctx, idx, total) { return renderEsquema(c, ctx, idx, total); },
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
        '<div class="aula-ask aula-anim" style="--i:3"><span class="aula-ask-t">Como você julga?</span><button type="button" class="aula-pill" data-julgar="Certo">Certo</button><button type="button" class="aula-pill" data-julgar="Errado">Errado</button></div>' +
        rodape(c, ctx, idx, total);
    },
    resposta: function (c, ctx, idx, total) {
      var r = c.resposta || {};
      var g = String(r.gabarito || '').toLowerCase();
      return label('Gabarito', 0) + titulo(c) + '<div class="aula-anim" style="--i:2"><span class="aula-badge ' + (g === 'certo' ? 'certo' : 'errado') + '">' + esc(r.gabarito || '') + '</span>'
        + '<span class="aula-veredito"><span class="aula-veredito-a">Você acertou</span><span class="aula-veredito-e">Você errou</span></span></div>' +
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
    if (layout === 'esquema') extra += ' aula-esquema-' + lerEsquema(cena).forma;
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
    try { desenharLigacoes(slide); } catch (_) { }
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
    var grupo = slide.querySelector('.aula-ct, .aula-esq'); if (grupo) grupo.classList.toggle('has-ativo', ligar);
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

  root.AulaSlides = { render: render, mount: mount, fit: fit, ajustar: ajustar, classificarImagem: classificarImagem, esc: esc, layouts: Object.keys(LAYOUTS), formasEsquema: FORMAS_ESQ.slice(), lerEsquema: lerEsquema };
})(typeof window !== 'undefined' ? window : this);
