/* ════════════════════════════════════════════════════════════════════
   UBIQUE LEARNING BLOCKS — STUDENT-SIDE RENDERERS
   Compartilhado entre index.html (visualização do aluno) e admin.html
   (pré-visualização ao vivo no Editor de Unidade).

   Exporta `window.LearningBlocks` com:
     - render(block)              → HTML do card completo
     - renderBody(block)          → HTML apenas do corpo (sem header/card)
     - label                      → mapa { type: rótulo PT-BR }
     - parseList(raw)             → coage para Array (aceita string JSON ou array)
     - embedVideo(url)            → HTML para player de vídeo (YT/Vimeo/file)
     - renderSlideCarousel(items, blockId, slideRender) → carrossel

   Estilo visual: SOMENTE classes do `ubique-saas-components.html`
   (`sec`, `card`, `card-label`, `card-title`, `card-body`, `s-label`,
   `s-body`, `s-subtitle`, `btn`, `btn-ghost`, `btn-sm`, `field`,
   `field-input`, `cards-grid`, `sub-h`, `sub-h-text`, `sub-h-rule`)
   + tokens via `style="..."` (`var(--accent)`, `var(--bg-elev)`, etc).

   O handler de clique do carrossel é instalado UMA ÚNICA VEZ na carga.
   ════════════════════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  /* ─────────── helpers de escape (independentes de Util) ─────────── */
  function escHtml(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }
  function attrHtml(s){ return escHtml(s); }

  /* ─────────── mapa de rótulos PT-BR por tipo ─────────── */
  const LearningBlockTypeLabel = {
    text:'Leitura', video:'Vídeo', quiz:'Quiz', essay:'Discursiva',
    discussion:'Discussão', keypoints:'Pontos-chave', flashcards:'Flashcards',
    references:'Obras & fontes', integrated:'Conteúdo integrado',
    biography:'Biografias', citations:'Citações', timeline:'Linha do tempo',
    tables:'Tabelas', glossary:'Glossário', gallery:'Galeria',
    quote:'Citação', image:'Imagem'
  };

  /* ─────────── parsers / utilitários ─────────── */
  function _lbParseList(raw){
    if(Array.isArray(raw)) return raw;
    if(typeof raw === 'string'){
      try{ const v = JSON.parse(raw); return Array.isArray(v) ? v : []; }catch(_){ return []; }
    }
    return [];
  }

  // ─────────────────────────────────────────────────────────────────────
  // Y3 — Parser de "origem" de questão (LB Questões Objetivas)
  //
  // Aceita variantes do código:
  //   [#15-2/2023]   → grupo 15, posição 2 (na frota), ano 2023
  //   #15-2/2023     → idem, sem colchetes
  //   [#150/2025]    → questão 150 do ano 2025 (sem agrupamento)
  //   #150/2025      → idem
  //   [cacd:#15-2/2023] → idem com prefixo de concurso (default: CACD)
  //   [ubique:#1/2025]  → questão Ubique (sem tag "CACD …")
  //
  // Retorna { exam, year, group, position, raw, hasGroup } ou null se não bater.
  //   exam     — 'CACD' por padrão; pode vir minúsculo no prefixo (ubique, pf, etc.)
  //   year     — number (ex.: 2023)
  //   group    — number | null  (15 se tinha "15-", null se não tinha)
  //   position — number  (posição da questão na sequência)
  //   raw      — string original (preservada pra reprovação)
  //   hasGroup — boolean conveniência
  //
  // NÃO LANÇA erro — retorna null pra qualquer entrada inválida.
  // ─────────────────────────────────────────────────────────────────────
  function _lbParseQuestionOrigin(input){
    if(input == null) return null;
    const s = String(input).trim();
    if(!s) return null;
    // Regex: [exam:]?#?G?-N/YYYY com colchetes opcionais
    //  Grupos:
    //   1 = prefixo de concurso (opcional)
    //   2 = número do grupo (opcional)
    //   3 = número da questão
    //   4 = ano (4 dígitos)
    const m = s.match(/^\s*\[?\s*(?:([A-Za-z]+)\s*:\s*)?#?\s*(?:(\d+)\s*-\s*)?(\d+)\s*\/\s*(\d{4})\s*\]?\s*$/);
    if(!m) return null;
    const rawExam = m[1] ? String(m[1]) : '';
    const exam = rawExam ? rawExam.toUpperCase() : 'CACD';
    const group = m[2] ? parseInt(m[2], 10) : null;
    const position = parseInt(m[3], 10);
    const year = parseInt(m[4], 10);
    if(isNaN(position) || isNaN(year)) return null;
    return {
      exam: exam,
      year: year,
      group: group,
      position: position,
      raw: s,
      hasGroup: group != null
    };
  }

  // Gera a tag automática a partir do origin parseado.
  //   { exam:'CACD', year:2023 } → 'CACD 2023'
  //   { exam:'UBIQUE', year:2025 } → 'Ubique'
  //   null / sem year → null (sem tag automática)
  function _lbOriginToTag(parsed){
    if(!parsed || !parsed.exam) return null;
    if(parsed.exam === 'UBIQUE') return 'Ubique';
    if(!parsed.year) return parsed.exam;
    return parsed.exam + ' ' + parsed.year;
  }

  // Deriva o "origin do grupo" a partir do origin de uma questão.
  //   '#15-2/2023' → '#15/2023'  (mesmo grupo, sem a posição)
  //   '#150/2025'  → null         (questão avulsa — não tem grupo)
  // Útil pra auto-agrupar na importação JSON: questões com mesmo
  // groupOrigin caem no mesmo grupo.
  function _lbDeriveGroupOrigin(parsed){
    if(!parsed || !parsed.hasGroup) return null;
    const examPrefix = (parsed.exam && parsed.exam !== 'CACD')
      ? (parsed.exam.toLowerCase() + ':')
      : '';
    return '[' + examPrefix + '#' + parsed.group + '/' + parsed.year + ']';
  }

  // ─────────────────────────────────────────────────────────────────────
  // Y3 — Banco de Questões (Fase G): id canônico
  //
  // Cada questão tem um ID único no banco (UbiqueStore.questions). Esse
  // id é determinístico a partir do origin (pra questões de provas
  // anteriores) ou aleatório (pra Ubique).
  //
  //   '[#14-1/2014]'      → 'cacd-14-1-2014'
  //   '[#150/2025]'       → 'cacd-150-2025'
  //   '[pf:#10-3/2024]'   → 'pf-10-3-2024'
  //   '[ubique:#1/2025]'  → 'ubique-1-2025'
  //   ubique sem origin   → 'ubique-<rand 8 chars>'
  //
  // Função pura — não toca no store, só calcula a string.
  // ─────────────────────────────────────────────────────────────────────
  function _lbQuestionBankIdFromOrigin(origin){
    if(!origin) return null;
    const parsed = _lbParseQuestionOrigin(origin);
    if(!parsed) return null;
    const exam = (parsed.exam || 'CACD').toLowerCase();
    const groupPart = parsed.hasGroup ? (parsed.group + '-') : '';
    return exam + '-' + groupPart + parsed.position + '-' + parsed.year;
  }

  // Gera id aleatório pra questão Ubique sem origin manual
  function _lbGenerateUbiqueQuestionId(){
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for(let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return 'ubique-' + s;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Y3 Fase E — Sanitização HTML rica (DOM-based, com whitelist explícita)
  //
  // Pra textareas das questões objetivas / discursivas (texto de referência,
  // enunciado, gabarito comentado, alternativas) e para qualquer outro
  // conteúdo de origem editorial. Aceita formatação rica:
  //   - INLINE: b, strong, i, em, u, s, code, kbd, sub, sup, small, mark, abbr,
  //             q, br, span, a (com href validado)
  //   - BLOCO:  p, div, section, article, ul, ol, li, dl, dt, dd, blockquote,
  //             pre, h1-h6, hr, figure, figcaption, table+filhos, time
  //   - MÍDIA:  img (com src validado, aceita data:image/...)
  //
  // BLOQUEIA: script, style, iframe, object, embed, link, meta, base, form,
  // input, button, select, textarea — tudo que pode injetar JS ou capturar
  // dados. Event handlers (onclick/onerror/...) são removidos.
  // Protocolos perigosos (javascript:, vbscript:, data: exceto data:image/
  // em <img src>) são neutralizados.
  // Links externos ganham rel="noopener nofollow" e target="_blank" auto.
  //
  // Implementação via DOMParser → walker recursivo → reserializa innerHTML.
  // Muito mais robusta que regex (não dá pra escapar com tricks tipo
  // <scr<script>ipt> ou inline events com whitespace creative).
  //
  // Fallback Node/SSR: se DOMParser não existir, faz regex bruto como antes.
  // ─────────────────────────────────────────────────────────────────────

  // Tags permitidas (lowercase)
  const _LB_SAN_TAGS = (function(){
    const list = [
      // inline
      'b','strong','i','em','u','s','strike','del','ins',
      'code','kbd','samp','var','sub','sup','small','mark','abbr','q','cite',
      'br','span','a','time',
      // bloco
      'p','div','section','article','header','footer','aside','main',
      'ul','ol','li','dl','dt','dd',
      'blockquote','pre',
      'h1','h2','h3','h4','h5','h6',
      'hr',
      'figure','figcaption',
      // mídia
      'img',
      // tabela
      'table','thead','tbody','tfoot','tr','td','th','caption','colgroup','col'
    ];
    const s = {};
    for(let i = 0; i < list.length; i++) s[list[i]] = true;
    return s;
  })();

  // Atributos permitidos globalmente (qualquer tag)
  const _LB_SAN_GLOBAL_ATTRS = (function(){
    const list = ['class','title','lang','dir','id','data-id'];
    const s = {};
    for(let i = 0; i < list.length; i++) s[list[i]] = true;
    return s;
  })();

  // Atributos permitidos por tag específica
  const _LB_SAN_TAG_ATTRS = {
    'a':       ['href','target','rel','name'],
    'img':     ['src','alt','width','height','loading','referrerpolicy'],
    'td':      ['colspan','rowspan','align','valign','headers'],
    'th':      ['colspan','rowspan','align','valign','scope','headers'],
    'tr':      ['align','valign'],
    'col':     ['span','align','width'],
    'colgroup':['span','align','width'],
    'table':   ['border','cellpadding','cellspacing','summary'],
    'time':    ['datetime'],
    'abbr':    ['title'],
    'ol':      ['start','reversed','type'],
    'q':       ['cite'],
    'blockquote': ['cite']
  };

  // Valida URL — retorna a URL limpa ou null
  function _lbSanUrl(raw, allowDataImage){
    if(raw == null) return null;
    const u = String(raw).trim();
    if(!u) return null;
    // Anchor interno
    if(/^#/.test(u)) return u;
    // Relativos (path/?query)
    if(/^\/[^/]/.test(u) || /^\.{1,2}\//.test(u)) return u;
    // Protocolos seguros
    if(/^(https?:|mailto:|tel:|ftp:)/i.test(u)) return u;
    // data:image/ — só permitido em <img src>
    if(allowDataImage && /^data:image\/(png|jpe?g|gif|webp|svg\+xml|bmp);/i.test(u)) return u;
    return null;
  }

  // Walker recursivo. Recebe um Element, devolve a string HTML sanitizada.
  function _lbSanWalk(el, doc){
    const children = Array.from(el.childNodes);
    children.forEach(function(child){
      if(child.nodeType === 3){ /* text node */ return; }
      if(child.nodeType !== 1){ /* comment / CDATA — remove */ child.remove(); return; }

      const tag = child.tagName.toLowerCase();
      if(!_LB_SAN_TAGS[tag]){
        // Tag não permitida — substitui pelo conteúdo de texto (preserva textos
        // legítimos quando admin colou algo com tag estranha por engano)
        const txt = doc.createTextNode(child.textContent || '');
        el.replaceChild(txt, child);
        return;
      }

      // Limpa atributos não permitidos
      const attrs = Array.from(child.attributes);
      attrs.forEach(function(attr){
        const name = attr.name.toLowerCase();
        // Event handlers — sempre fora
        if(name.indexOf('on') === 0){ child.removeAttribute(attr.name); return; }
        // 'style' — bloqueado (pode conter url(javascript:…))
        if(name === 'style'){ child.removeAttribute(attr.name); return; }
        const isAllowed = _LB_SAN_GLOBAL_ATTRS[name]
                       || (_LB_SAN_TAG_ATTRS[tag] && _LB_SAN_TAG_ATTRS[tag].indexOf(name) >= 0);
        if(!isAllowed){ child.removeAttribute(attr.name); return; }
        // Sanitiza href e src
        if(name === 'href' || name === 'src'){
          const allowData = (tag === 'img' && name === 'src');
          const clean = _lbSanUrl(attr.value, allowData);
          if(clean == null) child.removeAttribute(attr.name);
          else child.setAttribute(name, clean);
        }
      });

      // <a> externo → adiciona target="_blank" rel="noopener nofollow"
      if(tag === 'a' && child.hasAttribute('href')){
        const href = child.getAttribute('href');
        if(/^https?:/i.test(href)){
          if(!child.hasAttribute('target')) child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener nofollow');
        }
      }
      // <img> sem alt → adiciona alt vazio (boa prática)
      if(tag === 'img' && !child.hasAttribute('alt')){
        child.setAttribute('alt', '');
      }

      // Recurse
      _lbSanWalk(child, doc);
    });
  }

  // Sanitizador rich (com fallback regex pra SSR)
  function _lbSanitizeRichHTML(html){
    if(!html) return '';
    const s = String(html);
    if(typeof DOMParser === 'undefined'){
      // Fallback regex (SSR/Node) — menos seguro mas funcional
      let r = s;
      r = r.replace(/<\s*(script|style|iframe|object|embed|form|input|button|select|textarea|link|meta|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
      r = r.replace(/<\s*(script|style|iframe|object|embed|form|input|button|select|textarea|link|meta|base)[^>]*\/?>/gi, '');
      r = r.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
      r = r.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
      r = r.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
      r = r.replace(/\sstyle\s*=\s*"[^"]*"/gi, '');
      r = r.replace(/\sstyle\s*=\s*'[^']*'/gi, '');
      r = r.replace(/(href|src)\s*=\s*"javascript:[^"]*"/gi, '$1="#"');
      r = r.replace(/(href|src)\s*=\s*'javascript:[^']*'/gi, "$1='#'");
      r = r.replace(/(href|src)\s*=\s*"data:(?!image\/)[^"]*"/gi, '$1="#"');
      r = r.replace(/(href|src)\s*=\s*'data:(?!image\/)[^']*'/gi, "$1='#'");
      return r;
    }
    try{
      const doc = new DOMParser().parseFromString('<div id="lb-san-root">' + s + '</div>', 'text/html');
      const root = doc.getElementById('lb-san-root');
      if(!root) return '';
      _lbSanWalk(root, doc);
      return root.innerHTML;
    }catch(_e){
      return '';
    }
  }

  // Variante INLINE (mais restrita) — pra tooltips e cartões de fragmento.
  // Whitelist: só tags inline (não-bloco), sem img/table.
  const _LB_SAN_INLINE_TAGS = {
    'b':1,'strong':1,'i':1,'em':1,'u':1,'s':1,'code':1,'kbd':1,'sub':1,'sup':1,
    'small':1,'mark':1,'abbr':1,'q':1,'cite':1,'br':1,'span':1,'a':1,'time':1,'samp':1,'var':1
  };
  function _lbSanitizeInlineHTML(html){
    if(!html) return '';
    if(typeof DOMParser === 'undefined') return _lbSanitizeRichHTML(html);
    const s = String(html);
    try{
      const doc = new DOMParser().parseFromString('<div id="lb-san-root">' + s + '</div>', 'text/html');
      const root = doc.getElementById('lb-san-root');
      if(!root) return '';
      // Walker idêntico mas com tags whitelist menor
      (function walkInline(el){
        const children = Array.from(el.childNodes);
        children.forEach(function(child){
          if(child.nodeType === 3) return;
          if(child.nodeType !== 1){ child.remove(); return; }
          const tag = child.tagName.toLowerCase();
          if(!_LB_SAN_INLINE_TAGS[tag]){
            const txt = doc.createTextNode(child.textContent || '');
            el.replaceChild(txt, child);
            return;
          }
          // Reaproveita atributos do walker rich (mesmas regras)
          const attrs = Array.from(child.attributes);
          attrs.forEach(function(attr){
            const name = attr.name.toLowerCase();
            if(name.indexOf('on') === 0){ child.removeAttribute(attr.name); return; }
            if(name === 'style'){ child.removeAttribute(attr.name); return; }
            const isAllowed = _LB_SAN_GLOBAL_ATTRS[name]
                           || (_LB_SAN_TAG_ATTRS[tag] && _LB_SAN_TAG_ATTRS[tag].indexOf(name) >= 0);
            if(!isAllowed){ child.removeAttribute(attr.name); return; }
            if(name === 'href' || name === 'src'){
              const clean = _lbSanUrl(attr.value, false);
              if(clean == null) child.removeAttribute(attr.name);
              else child.setAttribute(name, clean);
            }
          });
          if(tag === 'a' && child.hasAttribute('href')){
            const href = child.getAttribute('href');
            if(/^https?:/i.test(href)){
              if(!child.hasAttribute('target')) child.setAttribute('target', '_blank');
              child.setAttribute('rel', 'noopener nofollow');
            }
          }
          walkInline(child);
        });
      })(root);
      return root.innerHTML;
    }catch(_e){
      return '';
    }
  }

  // Detecta o tipo de fonte de vídeo a partir de uma string que pode ser:
  // - HTML <iframe …> cru (cole&cola)
  // - URL do YouTube (watch, youtu.be, embed, shorts)
  // - URL do Vimeo
  // - URL do Google Drive (file/d/ID/view ou similar)
  // - URL do Loom
  // - URL direta de MP4/WebM/Ogg
  // - Qualquer outro link http(s) → tenta usar como iframe
  // Retorna { kind, embed? , url?, html? } ou null se vazio.
  function _lbDetectVideo(input){
    if(!input) return null;
    const s = String(input).trim();
    if(!s) return null;

    // 1) <iframe> cru → extrai o src (ou usa o HTML inteiro como fallback)
    if(/<iframe[\s\S]*<\/iframe>/i.test(s) || /^<iframe[\s\S]*\/?>$/i.test(s)){
      const m = s.match(/src=["']([^"']+)["']/i);
      if(m) return { kind:'iframe', embed: m[1] };
      return { kind:'iframe-raw', html: s };
    }

    // 2) YouTube
    const ytPatterns = [
      /youtube\.com\/watch\?(?:[^"'\s&]*&)*v=([\w-]{6,})/,
      /youtu\.be\/([\w-]{6,})/,
      /youtube\.com\/embed\/([\w-]{6,})/,
      /youtube\.com\/shorts\/([\w-]{6,})/,
      /youtube-nocookie\.com\/embed\/([\w-]{6,})/
    ];
    for(let i = 0; i < ytPatterns.length; i++){
      const m = s.match(ytPatterns[i]);
      if(m) return { kind:'youtube', embed: 'https://www.youtube.com/embed/' + m[1] };
    }

    // 3) Vimeo
    const vm = s.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if(vm) return { kind:'vimeo', embed: 'https://player.vimeo.com/video/' + vm[1] };

    // 4) Google Drive — preview embedável
    const gd = s.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
    if(gd) return { kind:'gdrive', embed: 'https://drive.google.com/file/d/' + gd[1] + '/preview' };

    // 5) Loom
    const lm = s.match(/loom\.com\/(?:share|embed)\/([^?/#]+)/);
    if(lm) return { kind:'loom', embed: 'https://www.loom.com/embed/' + lm[1] };

    // 6) MP4/WebM/Ogg direto
    if(/\.(mp4|webm|ogv|ogg|m4v|mov)(\?.*)?$/i.test(s)){
      return { kind:'video', url: s };
    }

    // 7) URL genérica — tenta usar como iframe direto
    if(/^https?:\/\//i.test(s)){
      return { kind:'iframe', embed: s };
    }

    return null;
  }

  // Renderiza o player a partir do detect (ou fallback "Sem vídeo")
  function _lbEmbedVideo(input){
    const info = _lbDetectVideo(input);
    if(!info){
      return '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-mute);font-family:var(--mono);font-size:.8rem">Sem vídeo</div>';
    }
    if(info.kind === 'video'){
      return '<video controls preload="metadata" playsinline src="' + attrHtml(info.url) + '" style="width:100%;height:100%;background:#000"></video>';
    }
    if(info.kind === 'iframe-raw'){
      return info.html;
    }
    const allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope';
    return '<iframe src="' + attrHtml(info.embed) + '" style="width:100%;height:100%;border:0" allow="' + allow + '" allowfullscreen loading="lazy"></iframe>';
  }

  /* ─────────── carrossel reutilizável ─────────── */
  function renderSlideCarousel(items, blockId, slideRender){
    if(!items || !items.length) return '<p class="s-body" style="font-style:italic;color:var(--text-mute)">Sem itens.</p>';
    const slides = items.map(function(it, i){
      return '<div data-slide="' + i + '" style="display:' + (i===0?'block':'none') + '">' + slideRender(it, i) + '</div>';
    }).join('');
    return '<div data-carousel="' + attrHtml(blockId) + '" data-idx="0" data-total="' + items.length + '">' +
      '<div data-slides>' + slides + '</div>' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:1rem;margin-top:1.2rem;padding-top:1rem;border-top:1px solid var(--accent-border-soft)">' +
        '<button class="btn btn-ghost btn-sm" data-prev>◀ anterior</button>' +
        '<span class="s-subtitle" style="font-size:.7rem;font-family:var(--mono)"><span data-pos>1</span> / ' + items.length + '</span>' +
        '<button class="btn btn-ghost btn-sm" data-next>próximo ▶</button>' +
      '</div>' +
    '</div>';
  }

  /* ─────────── corpo do bloco (sem header/card) ─────────── */
  function renderLearningBlockBody(block){
    const e = escHtml;
    const c = block.content || {};
    switch(block.type){
      case 'text': {
        // Schema rico (do mock original): paragraphs[] com fragments,
        // descrições, títulos que viram anchors.
        if(Array.isArray(c.paragraphs) && c.paragraphs.length){
          const body = c.paragraphs.map(function(p){
            // Render fragments inline: marca termos com border-bottom dotted
            // e tooltip via title=" ...definição..." (versão básica;
            // tooltip rico com galeria fica pro renderer aluno completo no Y2)
            let html = p.content || '';
            (p.fragments || []).forEach(function(f){
              if(!f || !f.text) return;
              // Substitui a primeira ocorrência por <span> com dotted underline
              const safeText = e(f.text);
              const def = e(f.definition || '');
              const pattern = new RegExp('(' + f.text.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&') + ')(?![^<]*>)','i');
              html = html.replace(pattern,
                '<span style="border-bottom:1px dotted var(--accent);cursor:help" title="' + def + '">$1</span>'
              );
            });
            const titleAnchor = p.title
              ? '<h3 id="p-' + e(p.id||'') + '" style="font-family:var(--serif);font-weight:400;font-size:1.4rem;color:var(--accent);margin:1.6rem 0 .6rem;letter-spacing:.005em">' + e(p.title) + '</h3>'
              : '';
            return titleAnchor + html;
          }).join('');
          return '<div style="font-family:var(--serif);line-height:1.85;font-size:1.05rem;color:var(--text);max-width:680px">' + body + '</div>';
        }
        // Fallback: schema simples {html}
        return '<div style="font-family:var(--serif);line-height:1.85;font-size:1.05rem;color:var(--text);max-width:680px">' +
          (c.html || '<p style="color:var(--text-mute);font-style:italic">Sem conteúdo.</p>') + '</div>';
      }
      case 'video': {
        // Schema canônico (Y3): c.url (URL ou <iframe>) + c.presenter + c.description + c.transcription_url
        // Legacy: c.video_url, c.transcript_url, c.videoFormat, c.duration — convertidos automaticamente.
        const rawUrl   = c.url || c.video_url || '';
        const transUrl = c.transcription_url || c.transcript_url || '';
        const player   = _lbEmbedVideo(rawUrl);

        const titleHtml = block.title ? '<h4 style="font-family:var(--serif);font-size:1.1rem;color:var(--text);margin:0 0 .4rem">' + e(block.title) + '</h4>' : '';
        const descHtml  = c.description
          ? '<p style="font-family:var(--sans);font-size:.85rem;color:var(--text-dim);line-height:1.65;margin:0">' + e(c.description) + '</p>'
          : '<p style="color:var(--text-mute);font-style:italic;font-size:.78rem;margin:0">Sem descrição.</p>';
        const presenter = c.presenter
          ? '<div style="margin-top:.7rem;font-family:var(--mono);font-size:.65rem;letter-spacing:.06em;color:var(--text-mute);text-transform:uppercase">apresentado por</div>' +
            '<div style="font-family:var(--serif);font-style:italic;font-size:.9rem;color:var(--text)">' + e(c.presenter) + '</div>'
          : '';
        const transHtml = transUrl
          ? '<a href="' + attrHtml(transUrl) + '" target="_blank" rel="noopener" download style="display:inline-flex;align-items:center;gap:.4rem;margin-top:.7rem;font-family:var(--serif);font-style:italic;color:var(--accent);text-decoration:none;font-size:.82rem">⬇ Baixar transcrição</a>'
          : '';

        const blockTags = Array.isArray(block.tags) ? block.tags : [];
        const tagsHtml = blockTags.length
          ? '<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:1rem;padding-top:.6rem;border-top:1px solid var(--accent-border-soft)">' +
              blockTags.map(function(t){
                return '<span style="font-family:var(--mono);font-size:.6rem;padding:.15rem .55rem;border-radius:999px;background:var(--accent-lo);color:var(--accent);border:1px solid var(--accent-border);letter-spacing:.04em">' + e(t) + '</span>';
              }).join('') +
            '</div>'
          : '';
        return '<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:1.5rem;align-items:start">' +
          '<div style="position:relative;aspect-ratio:16/9;background:var(--bg-elev);border:1px solid var(--accent-border-soft);border-radius:var(--radius);overflow:hidden">' + player + '</div>' +
          '<div>' + titleHtml + descHtml + presenter + transHtml + '</div>' +
        '</div>' + tagsHtml;
      }
      case 'quiz': {
        // Tipo LEGADO — substituído por objective_questions
        return '<p class="s-body" style="color:var(--text-mute);font-style:italic;margin:0">⚠ Tipo legado: este bloco foi reformulado como <strong>Questões objetivas</strong>. Apague e crie um novo do tipo "Questões objetivas".</p>';
      }
      case 'objective_questions': {
        // Schema Y3: c.groups[].questions[] + c.ungrouped[]
        const groups = Array.isArray(c.groups) ? c.groups : [];
        const ungrouped = Array.isArray(c.ungrouped) ? c.ungrouped : [];
        if(!groups.length && !ungrouped.length){
          return '<p class="s-body" style="font-style:italic;color:var(--text-mute);margin:0">Nenhum grupo nem questão avulsa. Use "+ Grupo" ou "+ Questão avulsa" no editor.</p>';
        }
        const sanitize = _lbSanitizeRichHTML;

        function _renderRefBlock(refText, refImg){
          if(!refText && !refImg) return '';
          let html = '<div style="padding:.7rem .9rem;border-left:2px solid var(--accent);background:var(--bg-elev);border-radius:0 var(--radius) var(--radius) 0;margin-bottom:.6rem">';
          if(refText) html += '<div style="font-family:var(--serif);font-size:.92rem;line-height:1.7;color:var(--text-dim)">' + sanitize(refText) + '</div>';
          if(refImg) html += '<img src="' + attrHtml(refImg) + '" alt="" style="max-width:100%;margin-top:.5rem;border-radius:var(--radius)">';
          html += '</div>';
          return html;
        }

        function _renderQuestion(q, ctxLabel){
          const tags = Array.isArray(q.tags) ? q.tags : [];
          // Y3: badge automática baseada em source_type
          let originBadge = '';
          if(q.source_type === 'ubique'){
            originBadge = '<span style="font-family:var(--mono);font-size:.6rem;padding:.1rem .45rem;border-radius:999px;background:var(--bg-elev);color:var(--text-mute);border:1px solid var(--accent-border-soft);font-style:italic" title="Questão Ubique (sem ID de prova)">Ubique</span>';
          } else {
            const parsedOrigin = _lbParseQuestionOrigin(q.origin);
            const autoTag = _lbOriginToTag(parsedOrigin);
            if(autoTag){
              originBadge = '<span style="font-family:var(--mono);font-size:.6rem;padding:.1rem .45rem;border-radius:999px;background:var(--accent-lo);color:var(--accent);border:1px solid var(--accent-border)" title="' + attrHtml(q.origin || '') + '">' + e(autoTag) + '</span>';
            } else if(q.reference){
              originBadge = '<span style="font-family:var(--mono);font-size:.6rem;padding:.1rem .45rem;border-radius:999px;background:var(--accent-lo);color:var(--accent);border:1px solid var(--accent-border)">' + e(q.reference) + '</span>';
            }
          }
          const tagsHTML = originBadge +
            tags.map(function(t){ return '<span style="font-family:var(--mono);font-size:.6rem;padding:.1rem .45rem;border-radius:999px;background:var(--bg-elev);border:1px solid var(--accent-border-soft);color:var(--text-mute)">' + e(t) + '</span>'; }).join('');

          let body = '';
          if(q.type === 'multiple_choice'){
            const opts = Array.isArray(q.options) ? q.options : [];
            body = '<div style="display:flex;flex-direction:column;gap:.3rem;margin-top:.5rem">' +
              opts.map(function(o){
                const mark = o.correct ? '<span style="color:#4caf50;font-weight:600">✓</span>' : '<span style="color:var(--text-mute)">·</span>';
                return '<div style="display:grid;grid-template-columns:auto 28px 1fr;gap:.4rem;align-items:start;padding:.35rem .55rem;background:var(--bg-elev);border-radius:var(--radius);border:1px solid ' + (o.correct ? '#4caf50' : 'var(--accent-border-soft)') + '">' +
                  mark +
                  '<span style="font-family:var(--mono);color:var(--accent);font-weight:600">' + e(o.label||'') + '</span>' +
                  '<span style="font-family:var(--sans);font-size:.85rem;color:var(--text)">' + sanitize(String(o.text||'')) + '</span>' +
                '</div>';
              }).join('') +
            '</div>';
          } else {
            const correctTxt = q.correct === true ? 'Certo' : (q.correct === false ? 'Errado' : '?');
            const correctColor = q.correct === true ? '#4caf50' : '#e57373';
            body = '<div style="display:flex;gap:.5rem;margin-top:.5rem">' +
              '<div style="flex:1;padding:.4rem .7rem;background:var(--bg-elev);border-radius:var(--radius);border:1px solid var(--accent-border-soft);text-align:center;font-family:var(--mono);font-size:.85rem;color:var(--text-mute)">C — Certo</div>' +
              '<div style="flex:1;padding:.4rem .7rem;background:var(--bg-elev);border-radius:var(--radius);border:1px solid var(--accent-border-soft);text-align:center;font-family:var(--mono);font-size:.85rem;color:var(--text-mute)">E — Errado</div>' +
            '</div>' +
            '<div style="margin-top:.3rem;font-family:var(--mono);font-size:.7rem;color:' + correctColor + '"><strong>Gabarito:</strong> ' + correctTxt + '</div>';
          }
          const refIndividual = _renderRefBlock(q.reference_text, q.reference_image);
          const comment = q.comment
            ? '<div style="margin-top:.5rem;padding:.45rem .7rem;background:var(--bg-elev);border-left:3px solid var(--accent);border-radius:0 var(--radius) var(--radius) 0">' +
                '<span style="font-family:var(--mono);font-size:.6rem;letter-spacing:.1em;color:var(--accent);text-transform:uppercase">Gabarito comentado</span>' +
                '<div style="font-family:var(--serif);font-size:.85rem;color:var(--text-dim);margin-top:.2rem;line-height:1.6">' + sanitize(String(q.comment)) + '</div>' +
              '</div>'
            : '';
          const ctxBadge = ctxLabel ? '<span style="font-family:var(--mono);font-size:.55rem;padding:.1rem .35rem;border-radius:2px;background:var(--bg);color:var(--text-mute);border:1px solid var(--accent-border-soft);margin-right:.3rem">' + e(ctxLabel) + '</span>' : '';
          return '<article style="background:var(--bg-card);border:1px solid var(--accent-border-soft);border-radius:var(--radius);padding:.8rem 1rem;margin-bottom:.55rem">' +
            (tagsHTML ? '<div style="display:flex;gap:.3rem;flex-wrap:wrap;align-items:center;margin-bottom:.5rem">' + ctxBadge + tagsHTML + '</div>' : (ctxBadge ? '<div style="margin-bottom:.5rem">' + ctxBadge + '</div>' : '')) +
            refIndividual +
            '<div style="font-family:var(--serif);font-size:.95rem;line-height:1.65;color:var(--text)">' + sanitize(String(q.statement || '')) + '</div>' +
            body + comment +
          '</article>';
        }

        const groupsHTML = groups.map(function(g, gi){
          const qs = Array.isArray(g.questions) ? g.questions : [];
          const parsedGOrigin = _lbParseQuestionOrigin(g.origin);
          const autoGTag = _lbOriginToTag(parsedGOrigin);
          const gTagBadge = autoGTag
            ? '<span style="font-family:var(--mono);font-size:.62rem;padding:.15rem .55rem;border-radius:999px;background:var(--accent);color:var(--bg);font-weight:500;letter-spacing:.04em;margin-left:.4rem" title="' + attrHtml(g.origin || '') + '">' + e(autoGTag) + '</span>'
            : '';
          const head =
            '<div style="border-bottom:1px solid var(--accent-border-soft);padding-bottom:.45rem;margin-bottom:.7rem;display:flex;align-items:center;gap:.3rem;flex-wrap:wrap">' +
              '<h4 style="font-family:var(--serif);color:var(--accent);font-size:1.1rem;margin:0">' + e(g.title || ('Grupo ' + (gi + 1))) + '</h4>' +
              gTagBadge +
              (g.description ? '<p style="font-size:.78rem;color:var(--text-mute);margin:.3rem 0 0;width:100%">' + e(g.description) + '</p>' : '') +
            '</div>';
          return '<section>' + head + _renderRefBlock(g.reference_text, g.reference_image) +
            qs.map(function(q){ return _renderQuestion(q, null); }).join('') +
            (qs.length === 0 ? '<p class="s-body" style="font-style:italic;color:var(--text-mute);font-size:.75rem;margin:0">Sem questões neste grupo.</p>' : '') +
          '</section>';
        }).join('');

        const ungroupedHTML = ungrouped.length
          ? '<section>' +
              '<div style="padding-bottom:.4rem;margin-bottom:.5rem;border-bottom:1px dashed var(--accent-border-soft)">' +
                '<span style="font-family:var(--mono);font-size:.62rem;letter-spacing:.08em;color:var(--text-mute);text-transform:uppercase">Avulsas</span>' +
              '</div>' +
              ungrouped.map(function(q){ return _renderQuestion(q, null); }).join('') +
            '</section>'
          : '';

        return '<div style="display:flex;flex-direction:column;gap:1.2rem">' + groupsHTML + ungroupedHTML + '</div>';
      }
      case 'essay': {
        // Y3 Fase M — preview admin do bloco de discursivas
        // Resolve refs { bank_id } no EssayBank; sanitiza TODO HTML
        // (statement, references.body, criteria.description/modelAnswer,
        // officialAnswer, modelAnswers.body).
        const sanitize = _lbSanitizeRichHTML;
        const items = Array.isArray(c.items) ? c.items : [];
        if(!items.length){
          if(c.prompt){
            return '<blockquote style="border-left:3px solid var(--accent);padding:.4rem 1rem;font-family:var(--serif);font-style:italic;color:var(--text);margin:0 0 1rem;font-size:1rem;line-height:1.6">' +
              sanitize(String(c.prompt)) + '</blockquote>' +
              '<textarea class="field-input" rows="6" placeholder="Sua resposta..." style="width:100%"></textarea>';
          }
          return '<p class="s-body" style="font-style:italic;color:var(--text-mute);margin:0">Nenhuma discursiva. Use "+ Discursiva" no editor.</p>';
        }

        function _resolveItem(rawItem){
          if(rawItem && rawItem.bank_id && global.EssayBank){
            return global.EssayBank.getById(rawItem.bank_id) || rawItem;
          }
          return rawItem;
        }

        return items.map(function(rawIt, i){
          const it = _resolveItem(rawIt) || {};
          const tags = Array.isArray(it.tags) ? it.tags : [];

          // Badge de origem (auto-derivada do origin OU "Ubique")
          let originBadge = '';
          if(it.source_type === 'ubique'){
            originBadge = '<span style="font-family:var(--mono);font-size:.6rem;padding:.1rem .45rem;border-radius:999px;background:var(--bg-elev);color:var(--text-mute);border:1px solid var(--accent-border-soft);font-style:italic">Ubique</span>';
          } else {
            const parsedOrigin = _lbParseQuestionOrigin(it.origin);
            const autoTag = _lbOriginToTag(parsedOrigin);
            if(autoTag){
              originBadge = '<span style="font-family:var(--mono);font-size:.6rem;padding:.1rem .45rem;border-radius:999px;background:var(--accent-lo);color:var(--accent);border:1px solid var(--accent-border)" title="' + attrHtml(it.origin || '') + '">' + e(autoTag) + '</span>';
            } else if(it.reference){
              originBadge = '<span style="font-family:var(--mono);font-size:.6rem;padding:.1rem .45rem;border-radius:999px;background:var(--accent-lo);color:var(--accent);border:1px solid var(--accent-border)">' + e(it.reference) + '</span>';
            }
          }
          const tagsHTML = (originBadge || tags.length)
            ? '<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.55rem">' +
                originBadge +
                tags.map(function(t){ return '<span style="font-family:var(--mono);font-size:.6rem;padding:.1rem .45rem;border-radius:999px;background:var(--bg-elev);color:var(--text-mute);border:1px solid var(--accent-border-soft)">' + e(t) + '</span>'; }).join('') +
              '</div>'
            : '';

          // Textos de referência (ANTES do enunciado) — HTML sanitizado
          const refs = Array.isArray(it.references) ? it.references : [];
          const refsHTML = refs.length
            ? '<div style="display:flex;flex-direction:column;gap:.5rem;margin-bottom:.8rem">' +
                refs.map(function(r){
                  return '<div style="padding:.6rem .8rem;background:var(--bg-elev);border-left:2px solid var(--accent);border-radius:0 var(--radius) var(--radius) 0">' +
                    (r.label  ? '<div style="font-family:var(--mono);font-size:.6rem;color:var(--accent);letter-spacing:.08em;text-transform:uppercase;margin-bottom:.2rem">' + e(r.label) + '</div>' : '') +
                    (r.title  ? '<div style="font-family:var(--serif);font-size:.85rem;color:var(--text);margin-bottom:.25rem">' + e(r.title) + '</div>' : '') +
                    (r.body   ? '<div style="font-family:var(--serif);font-size:.82rem;line-height:1.65;color:var(--text-dim);font-style:italic">' + sanitize(String(r.body)) + '</div>' : '') +
                    (r.image  ? '<img src="' + attrHtml(r.image) + '" alt="" style="max-width:140px;margin-top:.4rem;border-radius:var(--radius)">' : '') +
                  '</div>';
                }).join('') +
              '</div>'
            : '';

          // Enunciado em HTML (sanitizado, NÃO escapado)
          const statementHTML = sanitize(String(it.statement || it.command || ''));

          // Extensão em linhas (campo novo) — fallback pra maxLength legado
          const linesText = it.maxLines || it.maxLength;
          const linesHint = linesText
            ? '<span style="font-family:var(--mono);font-size:.65rem;color:var(--text-mute);margin-left:auto">Extensão: até ' + e(linesText) + ' linhas</span>'
            : '';

          // GABARITO — 3 abas conforme visibilidade
          const criteria = Array.isArray(it.criteria) ? it.criteria : [];
          const showCrit = it.show_criteria !== false && criteria.length > 0;
          const showOfficial = it.show_official_answer !== false && (it.officialAnswer || it.modelAnswer);
          const showModels = it.show_model_answers !== false && Array.isArray(it.modelAnswers) && it.modelAnswers.length > 0;
          const anyGab = showCrit || showOfficial || showModels;

          let gabaritoHTML = '';
          if(anyGab){
            const tabs = [];
            if(showCrit) tabs.push({ key: 'criteria', label: 'Critérios de correção' });
            if(showOfficial) tabs.push({ key: 'official', label: 'Padrão de Resposta' });
            if(showModels) tabs.push({ key: 'models', label: 'Resposta Modelo' });

            const tabsBar = '<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.6rem;border-bottom:1px solid var(--accent-border-soft);padding-bottom:.4rem">' +
              tabs.map(function(t, ti){
                return '<span style="padding:.25rem .55rem;border-radius:2px;font-family:var(--mono);font-size:.6rem;letter-spacing:.06em;text-transform:uppercase;' +
                  (ti === 0 ? 'background:var(--accent-lo);color:var(--accent);border:1px solid var(--accent-border)' : 'border:1px solid var(--accent-border-soft);color:var(--text-mute)') +
                  '">' + e(t.label) + '</span>';
              }).join('') +
            '</div>';

            // Conteúdo SÓ da primeira aba (preview é estático — sem clique)
            let firstPaneHTML = '';
            const firstKey = tabs[0] && tabs[0].key;
            if(firstKey === 'criteria'){
              firstPaneHTML = criteria.map(function(cr){
                return '<div style="padding:.5rem .7rem;background:var(--bg-elev);border-left:2px solid var(--accent);margin-bottom:.4rem;border-radius:0 var(--radius) var(--radius) 0">' +
                  '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.25rem">' +
                    '<strong style="font-family:var(--sans);font-size:.78rem;color:var(--accent);letter-spacing:.04em;text-transform:uppercase">' + e(cr.label||'') + '</strong>' +
                    (cr.maxScore ? '<span style="font-family:var(--mono);font-size:.7rem;color:var(--text-mute)">' + e(cr.maxScore) + ' pts</span>' : '') +
                  '</div>' +
                  (cr.description ? '<div style="font-family:var(--serif);font-size:.82rem;color:var(--text);line-height:1.6">' + sanitize(String(cr.description)) + '</div>' : '') +
                  (cr.modelAnswer ? '<div style="margin-top:.4rem;padding-top:.4rem;border-top:1px dashed var(--accent-border-soft);font-family:var(--serif);font-size:.78rem;color:var(--text-dim);font-style:italic;line-height:1.6">' + sanitize(String(cr.modelAnswer)) + '</div>' : '') +
                '</div>';
              }).join('');
            } else if(firstKey === 'official'){
              const officialText = it.officialAnswer || it.modelAnswer || '';
              firstPaneHTML = '<div style="padding:.5rem .7rem;background:var(--bg-elev);border-left:2px solid var(--accent);border-radius:0 var(--radius) var(--radius) 0;font-family:var(--serif);font-size:.85rem;color:var(--text);line-height:1.65">' + sanitize(String(officialText)) + '</div>';
            } else if(firstKey === 'models'){
              firstPaneHTML = it.modelAnswers.map(function(m, mi){
                return '<div style="padding:.5rem .7rem;background:var(--bg-elev);border-left:2px solid var(--accent);margin-bottom:.4rem;border-radius:0 var(--radius) var(--radius) 0">' +
                  '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.25rem">' +
                    '<strong style="font-family:var(--sans);font-size:.78rem;color:var(--accent)">' + e(m.title || ('Modelo ' + String.fromCharCode(65 + mi))) + '</strong>' +
                    (m.score ? '<span style="font-family:var(--mono);font-size:.7rem;color:var(--text-mute)">' + e(m.score) + '</span>' : '') +
                  '</div>' +
                  (m.author ? '<div style="font-family:var(--mono);font-size:.7rem;color:var(--text-mute);margin-bottom:.3rem;font-style:italic">' + e(m.author) + '</div>' : '') +
                  (m.body ? '<div style="font-family:var(--serif);font-size:.82rem;color:var(--text);line-height:1.65">' + sanitize(String(m.body)) + '</div>' : '') +
                '</div>';
              }).join('');
            }

            gabaritoHTML = '<details style="margin-top:.7rem;border-top:1px solid var(--accent-border-soft);padding-top:.55rem">' +
                '<summary style="cursor:pointer;font-family:var(--mono);font-size:.7rem;letter-spacing:.05em;color:var(--accent);text-transform:uppercase">📋 Gabarito (' + tabs.length + ' aba' + (tabs.length > 1 ? 's' : '') + ')</summary>' +
                '<div style="margin-top:.5rem">' + tabsBar + firstPaneHTML + '</div>' +
              '</details>';
          }

          return '<article style="background:var(--bg-card);border:1px solid var(--accent-border-soft);border-radius:var(--radius-lg);padding:1rem 1.2rem;margin-bottom:.8rem">' +
            tagsHTML +
            refsHTML +
            '<div style="font-family:var(--serif);font-size:.95rem;color:var(--text);line-height:1.65;margin:0 0 .8rem;padding:.5rem .9rem;border-left:3px solid var(--accent);background:var(--bg-elev);border-radius:0 var(--radius) var(--radius) 0">' +
              statementHTML +
            '</div>' +
            '<textarea class="field-input" rows="5" placeholder="Sua resposta..." style="width:100%;font-size:.9rem"></textarea>' +
            '<div style="margin-top:.6rem;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">' +
              '<button class="btn btn-ghost btn-sm">Enviar para correção por IA</button>' +
              linesHint +
            '</div>' +
            gabaritoHTML +
          '</article>';
        }).join('');
      }
      case 'discussion': {
        return '<p class="s-body" style="margin-bottom:1rem">' + e(c.prompt || 'Compartilhe sua reflexão sobre esta unidade.') + '</p>' +
          '<textarea class="field-input" rows="3" placeholder="Compartilhe seu comentário..." style="width:100%"></textarea>' +
          '<div style="margin-top:.6rem;display:flex;justify-content:space-between;align-items:center;gap:1rem">' +
            '<span class="s-subtitle" style="color:var(--text-mute);font-style:italic;font-size:.78rem">Seja o primeiro a comentar.</span>' +
            '<button class="btn btn-sm">Publicar</button>' +
          '</div>';
      }
      case 'keypoints': {
        const points = _lbParseList(c.points);
        if(!points.length) return '<p class="s-body" style="font-style:italic;color:var(--text-mute)">Sem pontos cadastrados.</p>';
        return '<div class="cards-grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem">' +
          points.map(function(p, i){
            return '<article class="card" style="padding:1.2rem 1.3rem">' +
              '<span style="font-family:var(--mono);font-size:.7rem;color:var(--text-mute);letter-spacing:.1em">' + String(i+1).padStart(2,'0') + '</span>' +
              (p.label ? '<span class="card-label" style="margin-top:.3rem;display:block">' + e(p.label) + '</span>' : '') +
              '<h4 class="card-title" style="font-size:1.1rem;margin-top:.4rem">' + e(p.title || '') + '</h4>' +
              (p.description ? '<p class="card-body" style="font-size:.85rem;margin-top:.4rem">' + e(p.description) + '</p>' : '') +
            '</article>';
          }).join('') +
        '</div>';
      }
      case 'flashcards': {
        const cards = _lbParseList(c.cards);
        if(!cards.length) return '<p class="s-body" style="font-style:italic;color:var(--text-mute)">Sem flashcards.</p>';
        return '<div class="cards-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem">' +
          cards.map(function(card, i){
            return '<article class="card" style="padding:1rem 1.1rem">' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem">' +
                '<div style="padding:.7rem;background:var(--bg-elev);border-radius:var(--radius)">' +
                  '<span class="s-label" style="font-size:.65rem;color:var(--accent)">FRENTE</span>' +
                  '<p class="card-body" style="margin-top:.3rem;font-size:.9rem">' + e(card.front || '') + '</p>' +
                '</div>' +
                '<div style="padding:.7rem;background:var(--accent-xlo);border-radius:var(--radius)">' +
                  '<span class="s-label" style="font-size:.65rem;color:var(--accent)">VERSO</span>' +
                  '<p class="card-body" style="margin-top:.3rem;font-size:.9rem">' + e(card.back || '') + '</p>' +
                '</div>' +
              '</div>' +
              '<div style="display:flex;gap:.4rem;margin-top:.7rem">' +
                '<button class="btn btn-ghost btn-sm">revisar</button>' +
                '<button class="btn btn-ghost btn-sm">dominei</button>' +
              '</div>' +
            '</article>';
          }).join('') +
        '</div>';
      }
      case 'references': {
        const items = _lbParseList(c.items);
        if(!items.length) return '<p class="s-body" style="font-style:italic;color:var(--text-mute)">Sem obras.</p>';
        const kindLabel = { livro:'LIVRO', artigo:'ARTIGO', 'fonte-web':'FONTE WEB', tese:'TESE', documento:'DOCUMENTO' };
        return '<div class="cards-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem">' +
          items.map(function(it){
            const label = kindLabel[it.kind] || (it.kind ? String(it.kind).toUpperCase() : 'OBRA');
            const cover = it.cover_url
              ? '<div style="aspect-ratio:2/3;background-image:url(\'' + attrHtml(it.cover_url) + '\');background-size:cover;background-position:center;border-radius:var(--radius);margin-bottom:.7rem"></div>'
              : '<div style="aspect-ratio:2/3;background:linear-gradient(135deg,var(--accent-lo),var(--accent-xlo));border-radius:var(--radius);margin-bottom:.7rem;display:flex;align-items:center;justify-content:center;font-family:var(--serif);color:var(--accent);font-size:1.4rem">' + e((it.title||'?')[0]) + '</div>';
            const linkBtn = (it.kind === 'fonte-web' && it.url)
              ? '<a class="btn btn-ghost btn-sm" href="' + attrHtml(it.url) + '" target="_blank" rel="noopener" style="margin-top:.5rem">abrir →</a>'
              : '';
            return '<article class="card" style="padding:1rem">' +
              cover +
              '<span class="card-label">' + e(label) + '</span>' +
              '<h4 class="card-title" style="font-family:var(--serif);font-size:1rem;margin-top:.3rem">' + e(it.title || '') + '</h4>' +
              (it.author ? '<p style="font-style:italic;font-size:.78rem;color:var(--text-dim);margin-top:.2rem">' + e(it.author) + '</p>' : '') +
              (it.description ? '<p class="card-body" style="font-size:.8rem;margin-top:.4rem">' + e(it.description) + '</p>' : '') +
              linkBtn +
            '</article>';
          }).join('') +
        '</div>';
      }
      case 'integrated': {
        return '<div style="font-family:var(--serif);line-height:1.8;font-size:1rem;color:var(--text);max-width:760px">' +
          (c.html || '<p style="color:var(--text-mute);font-style:italic">Sem conteúdo.</p>') + '</div>';
      }
      case 'biography': {
        const people = _lbParseList(c.people);
        return renderSlideCarousel(people, block.id, function(p){
          const photo = p.image_url
            ? '<div style="width:180px;height:180px;border-radius:50%;background-image:url(\'' + attrHtml(p.image_url) + '\');background-size:cover;background-position:center;flex-shrink:0"></div>'
            : '<div style="width:180px;height:180px;border-radius:50%;background:var(--accent-xlo);display:flex;align-items:center;justify-content:center;font-family:var(--serif);color:var(--accent);font-size:2.4rem;flex-shrink:0">' + e(((p.name||'?').split(/\s+/).map(function(s){return s[0];}).slice(0,2).join('')).toUpperCase()) + '</div>';
          const roles = Array.isArray(p.roles) ? p.roles : (typeof p.roles === 'string' ? p.roles.split(/[,;]/).map(function(r){return r.trim();}).filter(Boolean) : []);
          const roleChips = roles.map(function(r){ return '<span style="display:inline-block;padding:.15rem .6rem;font-size:.7rem;border:1px solid var(--accent-border-soft);border-radius:999px;color:var(--text-dim);font-family:var(--mono);text-transform:lowercase">' + e(r) + '</span>'; }).join(' ');
          return '<div style="display:grid;grid-template-columns:auto 1fr;gap:1.4rem;align-items:start">' +
            photo +
            '<div>' +
              '<h4 style="font-family:var(--serif);font-size:1.5rem;color:var(--text);margin:0">' + e(p.name||'') + '</h4>' +
              (p.dates ? '<span style="font-family:var(--mono);font-size:.75rem;color:var(--text-mute);display:block;margin-top:.2rem">' + e(p.dates) + '</span>' : '') +
              (roleChips ? '<div style="margin-top:.6rem;display:flex;flex-wrap:wrap;gap:.3rem">' + roleChips + '</div>' : '') +
              (p.quote ? '<blockquote style="border-left:3px solid var(--accent);padding:.4rem 1rem;font-family:var(--serif);font-style:italic;color:var(--text-dim);margin:.8rem 0 0;font-size:.95rem;line-height:1.6">' + e(p.quote) + '</blockquote>' : '') +
              (p.description ? '<p class="card-body" style="margin-top:.8rem;line-height:1.7">' + e(p.description) + '</p>' : '') +
            '</div>' +
          '</div>';
        });
      }
      case 'citations': {
        const quotes = _lbParseList(c.quotes);
        return renderSlideCarousel(quotes, block.id, function(q){
          const bg = q.photo_url
            ? 'background-image:url(\'' + attrHtml(q.photo_url) + '\');background-size:cover;background-position:center'
            : 'background:linear-gradient(135deg,var(--accent-lo),var(--bg-elev))';
          const meta = [q.author, q.source, q.date].filter(Boolean).map(e).join(' · ');
          return '<div style="position:relative;border-radius:var(--radius-lg);overflow:hidden;min-height:280px;padding:2rem 2.4rem;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">' +
            '<div style="position:absolute;inset:0;' + bg + ';filter:blur(20px) brightness(.4);transform:scale(1.1)"></div>' +
            '<div style="position:relative;z-index:1;color:#fff;max-width:680px">' +
              '<div style="font-family:var(--serif);font-size:1.3rem;font-style:italic;line-height:1.6">"' + e(q.text||'') + '"</div>' +
              (meta ? '<div style="margin-top:1rem;font-family:var(--mono);font-size:.75rem;letter-spacing:.05em;opacity:.85">— ' + meta + '</div>' : '') +
            '</div>' +
          '</div>' +
          (q.comment ? '<p class="s-body" style="margin-top:.8rem;color:var(--text-mute);font-size:.82rem;font-style:italic">' + e(q.comment) + '</p>' : '');
        });
      }
      case 'timeline': {
        const events = _lbParseList(c.events);
        return renderSlideCarousel(events, block.id, function(ev){
          const cols = ev.image_url ? 'grid-template-columns:1fr 1fr' : 'grid-template-columns:1fr';
          return '<div style="display:grid;' + cols + ';gap:1.5rem;align-items:center;min-height:200px">' +
            '<div>' +
              '<div style="font-family:var(--mono);font-size:1.4rem;color:var(--accent);letter-spacing:.05em">' + e(ev.year||'') + '</div>' +
              '<h4 style="font-family:var(--serif);font-size:1.4rem;color:var(--text);margin:.5rem 0">' + e(ev.title||'') + '</h4>' +
              (ev.description ? '<p class="card-body" style="line-height:1.7">' + e(ev.description) + '</p>' : '') +
            '</div>' +
            (ev.image_url ? '<div style="aspect-ratio:4/3;background-image:url(\'' + attrHtml(ev.image_url) + '\');background-size:cover;background-position:center;border-radius:var(--radius-lg)"></div>' : '') +
          '</div>';
        });
      }
      case 'tables': {
        const tables = _lbParseList(c.tables);
        return renderSlideCarousel(tables, block.id, function(tbl){
          const cols = Array.isArray(tbl.columns) ? tbl.columns : [];
          const rows = Array.isArray(tbl.rows) ? tbl.rows : [];
          return (tbl.title ? '<h4 style="font-family:var(--serif);font-size:1.2rem;color:var(--text);margin:0 0 .8rem">' + e(tbl.title) + '</h4>' : '') +
            '<div style="overflow:auto;border:1px solid var(--accent-border-soft);border-radius:var(--radius)">' +
              '<table style="width:100%;border-collapse:collapse;font-size:.9rem">' +
                '<thead><tr style="background:var(--bg-elev)">' +
                  cols.map(function(col){ return '<th style="text-align:left;padding:.7rem 1rem;font-family:var(--mono);font-size:.72rem;letter-spacing:.05em;color:var(--text-dim);border-bottom:1px solid var(--accent-border-soft)">' + e(col) + '</th>'; }).join('') +
                '</tr></thead>' +
                '<tbody>' +
                  rows.map(function(row){
                    return '<tr onmouseover="this.style.background=\'var(--bg-elev)\'" onmouseout="this.style.background=\'\'">' +
                      (Array.isArray(row) ? row : []).map(function(cell){ return '<td style="padding:.6rem 1rem;border-bottom:1px solid var(--accent-border-soft);color:var(--text)">' + e(cell) + '</td>'; }).join('') +
                    '</tr>';
                  }).join('') +
                '</tbody>' +
              '</table>' +
            '</div>';
        });
      }
      case 'glossary': {
        const entries = _lbParseList(c.entries);
        return renderSlideCarousel(entries, block.id, function(en){
          const cols = en.image_url ? 'grid-template-columns:1fr auto' : 'grid-template-columns:1fr';
          return '<div style="display:grid;' + cols + ';gap:1.5rem;align-items:start">' +
            '<div>' +
              '<h4 style="font-family:var(--serif);font-size:1.6rem;color:var(--text);margin:0">' + e(en.term||'') + '</h4>' +
              (en.definition ? '<p style="font-style:italic;color:var(--text-dim);margin-top:.4rem;font-size:.95rem;line-height:1.6">' + e(en.definition) + '</p>' : '') +
              (en.paragraph ? '<p class="card-body" style="margin-top:.7rem;line-height:1.7">' + e(en.paragraph) + '</p>' : '') +
            '</div>' +
            (en.image_url ? '<div style="width:200px;aspect-ratio:1;background-image:url(\'' + attrHtml(en.image_url) + '\');background-size:cover;background-position:center;border-radius:var(--radius-lg)"></div>' : '') +
          '</div>';
        });
      }
      case 'gallery': {
        const images = _lbParseList(c.images);
        if(!images.length) return '<p class="s-body" style="font-style:italic;color:var(--text-mute)">Sem imagens.</p>';
        return '<div class="cards-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.8rem">' +
          images.map(function(img){
            return '<button type="button" style="position:relative;aspect-ratio:1;background-image:url(\'' + attrHtml(img.url||'') + '\');background-size:cover;background-position:center;border:1px solid var(--accent-border-soft);border-radius:var(--radius);overflow:hidden;cursor:pointer;padding:0" onmouseover="this.querySelector(\'[data-overlay]\').style.opacity=1" onmouseout="this.querySelector(\'[data-overlay]\').style.opacity=0">' +
              '<div data-overlay style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.85),transparent 50%);display:flex;align-items:flex-end;padding:.7rem;opacity:0;transition:opacity .2s;text-align:left">' +
                '<div style="color:#fff">' +
                  (img.title ? '<div style="font-family:var(--serif);font-size:.9rem">' + e(img.title) + '</div>' : '') +
                  (img.caption ? '<div style="font-size:.72rem;opacity:.85;margin-top:.2rem">' + e(img.caption) + '</div>' : '') +
                '</div>' +
              '</div>' +
            '</button>';
          }).join('') +
        '</div>';
      }
      case 'quote': {
        const meta = [c.author, c.source].filter(Boolean).map(e).join(' · ');
        return '<blockquote style="border-left:3px solid var(--accent);padding:.6rem 1.2rem;font-family:var(--serif);font-style:italic;color:var(--text);margin:0;font-size:1.15rem;line-height:1.6">' +
          '"' + e(c.text || '') + '"' +
          (meta ? '<footer style="margin-top:.7rem;font-family:var(--mono);font-size:.72rem;letter-spacing:.05em;color:var(--text-mute);font-style:normal">— ' + meta + '</footer>' : '') +
        '</blockquote>';
      }
      case 'image': {
        return '<figure style="margin:0;text-align:center;max-width:680px">' +
          '<img src="' + attrHtml(c.url||'') + '" alt="' + attrHtml(c.caption||'') + '" style="max-width:100%;border-radius:var(--radius-lg)">' +
          (c.caption ? '<figcaption style="margin-top:.6rem;font-size:.82rem;color:var(--text-mute);font-style:italic">' + e(c.caption) + '</figcaption>' : '') +
        '</figure>';
      }
      default:
        return '<p class="s-body" style="color:var(--text-mute);font-style:italic">Tipo de bloco não suportado: ' + e(block.type) + '</p>';
    }
  }

  /* ─────────── card completo (header + corpo) ─────────── */
  function renderLearningBlock(block){
    if(!block) return '';
    const e = escHtml;
    const typeLabel = LearningBlockTypeLabel[block.type] || block.type;
    const desc = block.description ? '<p class="card-body" style="font-size:.85rem;margin-top:.3rem">' + e(block.description) + '</p>' : '';
    return '<article class="card" data-block-id="' + attrHtml(block.id) + '" data-block-type="' + attrHtml(block.type) + '" style="margin-bottom:1.4rem;padding:1.4rem 1.6rem;position:relative">' +
      '<div style="position:absolute;top:.7rem;right:.8rem;display:flex;gap:.4rem">' +
        '<button class="btn btn-ghost btn-sm" data-bookmark-block="' + attrHtml(block.id) + '" title="Ler depois">⏱ ler depois</button>' +
        '<button class="btn btn-ghost btn-sm" data-mark-block="' + attrHtml(block.id) + '" title="Marcar">★ marcar</button>' +
      '</div>' +
      '<header style="margin-bottom:.8rem;padding-right:11rem">' +
        '<span class="card-label">' + e(typeLabel) + '</span>' +
        (block.title ? '<h3 class="card-title" style="margin-top:.3rem">' + e(block.title) + '</h3>' : '') +
        desc +
      '</header>' +
      '<div>' + renderLearningBlockBody(block) + '</div>' +
    '</article>';
  }

  /* ─────────── handler global do carrossel (instalado uma vez) ─────────── */
  if(typeof document !== 'undefined' && !global._slideCarouselBound){
    global._slideCarouselBound = true;
    document.addEventListener('click', function(e){
      const carousel = e.target.closest('[data-carousel]');
      if(!carousel) return;
      const isPrev = e.target.closest('[data-prev]');
      const isNext = e.target.closest('[data-next]');
      if(!isPrev && !isNext) return;
      let idx = parseInt(carousel.dataset.idx, 10) || 0;
      const total = parseInt(carousel.dataset.total, 10) || 0;
      if(!total) return;
      idx = isPrev ? (idx - 1 + total) % total : (idx + 1) % total;
      carousel.dataset.idx = idx;
      carousel.querySelectorAll('[data-slide]').forEach(function(s){
        s.style.display = (parseInt(s.dataset.slide, 10) === idx) ? 'block' : 'none';
      });
      const pos = carousel.querySelector('[data-pos]');
      if(pos) pos.textContent = idx + 1;
    });
  }

  /* ─────────── export ─────────── */
  global.LearningBlocks = {
    render:              renderLearningBlock,
    renderBody:          renderLearningBlockBody,
    label:               LearningBlockTypeLabel,
    parseList:           _lbParseList,
    embedVideo:          _lbEmbedVideo,
    detectVideo:         _lbDetectVideo,
    renderSlideCarousel: renderSlideCarousel,
    // Y3 — Questões objetivas
    parseQuestionOrigin:      _lbParseQuestionOrigin,
    originToTag:              _lbOriginToTag,
    deriveGroupOrigin:        _lbDeriveGroupOrigin,
    sanitizeRichHTML:         _lbSanitizeRichHTML,
    sanitizeInlineHTML:       _lbSanitizeInlineHTML,
    questionBankIdFromOrigin: _lbQuestionBankIdFromOrigin,
    generateUbiqueQuestionId: _lbGenerateUbiqueQuestionId
  };

})(typeof window !== 'undefined' ? window : this);
