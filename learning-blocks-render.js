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

  function _lbEmbedVideo(url){
    if(!url) return '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-mute);font-family:var(--mono);font-size:.8rem">Sem vídeo</div>';
    const u = String(url);
    // YouTube
    let m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
    if(m){
      return '<iframe src="https://www.youtube.com/embed/' + attrHtml(m[1]) + '" style="width:100%;height:100%;border:0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    }
    // Vimeo
    m = u.match(/vimeo\.com\/(\d+)/);
    if(m){
      return '<iframe src="https://player.vimeo.com/video/' + attrHtml(m[1]) + '" style="width:100%;height:100%;border:0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    }
    return '<video controls src="' + attrHtml(u) + '" style="width:100%;height:100%;background:#000"></video>';
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
        const player = _lbEmbedVideo(c.video_url);
        const transcript = c.transcript_url
          ? '<a class="btn btn-ghost btn-sm" href="' + attrHtml(c.transcript_url) + '" target="_blank" rel="noopener" style="margin-top:.8rem;display:inline-flex">⬇ Transcrição</a>'
          : '';
        return '<div style="display:grid;grid-template-columns:2fr 1fr;gap:1.5rem;align-items:start">' +
          '<div style="aspect-ratio:16/9;background:var(--bg-elev);border-radius:var(--radius-lg);overflow:hidden">' + player + '</div>' +
          '<div>' +
            (c.description ? '<p class="card-body" style="font-size:.9rem;line-height:1.6">' + e(c.description) + '</p>' : '<p class="card-body" style="color:var(--text-mute);font-style:italic;font-size:.85rem">Sem descrição.</p>') +
            transcript +
          '</div>' +
        '</div>';
      }
      case 'quiz': {
        // Tipo LEGADO — substituído por objective_questions
        return '<p class="s-body" style="color:var(--text-mute);font-style:italic;margin:0">⚠ Tipo legado: este bloco foi reformulado como <strong>Questões objetivas</strong>. Apague e crie um novo do tipo "Questões objetivas".</p>';
      }
      case 'objective_questions': {
        const groups = Array.isArray(c.groups) ? c.groups : [];
        if(!groups.length) return '<p class="s-body" style="font-style:italic;color:var(--text-mute);margin:0">Nenhum grupo de questões. Use "+ Grupo" no editor.</p>';
        return '<div style="display:flex;flex-direction:column;gap:1.2rem">' +
          groups.map(function(g){
            const qs = Array.isArray(g.questions) ? g.questions : [];
            const head = g.title
              ? '<div style="border-bottom:1px solid var(--accent-border-soft);padding-bottom:.4rem;margin-bottom:.6rem">' +
                  '<h4 style="font-family:var(--serif);color:var(--accent);font-size:1.05rem;margin:0">' + e(g.title) + '</h4>' +
                  (g.description ? '<p style="font-size:.78rem;color:var(--text-mute);margin:.2rem 0 0">' + e(g.description) + '</p>' : '') +
                '</div>'
              : '';
            const questions = qs.map(function(q){
              const tags = Array.isArray(q.tags) ? q.tags : [];
              const tagsHTML =
                (q.reference ? '<span style="font-family:var(--mono);font-size:.6rem;padding:.1rem .45rem;border-radius:999px;background:var(--accent-lo);color:var(--accent);border:1px solid var(--accent-border)">' + e(q.reference) + '</span>' : '') +
                (q.difficulty ? '<span style="font-family:var(--mono);font-size:.6rem;padding:.1rem .45rem;border-radius:999px;background:var(--bg-elev);border:1px solid var(--accent-border-soft);color:var(--text-mute);text-transform:capitalize">' + e(q.difficulty) + '</span>' : '') +
                tags.map(function(t){ return '<span style="font-family:var(--mono);font-size:.6rem;padding:.1rem .45rem;border-radius:999px;background:var(--accent-lo);color:var(--accent);border:1px solid var(--accent-border)">' + e(t) + '</span>'; }).join('');
              let body = '';
              if(q.type === 'multiple_choice'){
                const opts = Array.isArray(q.options) ? q.options : [];
                body = '<div style="display:flex;flex-direction:column;gap:.3rem;margin-top:.5rem">' +
                  opts.map(function(o){
                    const mark = o.correct ? '<span style="color:#4caf50;font-weight:600">✓</span>' : '<span style="color:var(--text-mute)">·</span>';
                    return '<div style="display:grid;grid-template-columns:auto 28px 1fr;gap:.4rem;align-items:start;padding:.35rem .55rem;background:var(--bg-elev);border-radius:var(--radius);border:1px solid ' + (o.correct ? '#4caf50' : 'var(--accent-border-soft)') + '">' +
                      mark +
                      '<span style="font-family:var(--mono);color:var(--accent);font-weight:600">' + e(o.label||'') + '</span>' +
                      '<span style="font-family:var(--sans);font-size:.85rem;color:var(--text)">' + e(o.text||'') + '</span>' +
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
              const comment = q.comment
                ? '<div style="margin-top:.5rem;padding:.45rem .7rem;background:var(--bg-elev);border-left:3px solid var(--accent);border-radius:0 var(--radius) var(--radius) 0">' +
                    '<span style="font-family:var(--mono);font-size:.6rem;letter-spacing:.1em;color:var(--accent);text-transform:uppercase">Comentário</span>' +
                    '<div style="font-family:var(--serif);font-size:.85rem;color:var(--text-dim);margin-top:.2rem;line-height:1.55">' + e(q.comment) + '</div>' +
                  '</div>'
                : '';
              return '<article style="background:var(--bg-card);border:1px solid var(--accent-border-soft);border-radius:var(--radius);padding:.8rem 1rem;margin-bottom:.55rem">' +
                (tagsHTML ? '<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.5rem">' + tagsHTML + '</div>' : '') +
                '<div style="font-family:var(--serif);font-size:.95rem;line-height:1.6;color:var(--text)">' + e(q.statement || '') + '</div>' +
                body + comment +
              '</article>';
            }).join('');
            return '<section>' + head + questions +
              (qs.length === 0 ? '<p class="s-body" style="font-style:italic;color:var(--text-mute);font-size:.75rem;margin:0">Sem questões neste grupo.</p>' : '') +
            '</section>';
          }).join('') +
        '</div>';
      }
      case 'essay': {
        const items = Array.isArray(c.items) ? c.items : [];
        if(!items.length){
          // Fallback pra schema super legado com c.prompt simples
          if(c.prompt){
            return '<blockquote style="border-left:3px solid var(--accent);padding:.4rem 1rem;font-family:var(--serif);font-style:italic;color:var(--text);margin:0 0 1rem;font-size:1rem;line-height:1.6">' +
              e(c.prompt) + '</blockquote>' +
              '<textarea class="field-input" rows="6" placeholder="Sua resposta..." style="width:100%"></textarea>';
          }
          return '<p class="s-body" style="font-style:italic;color:var(--text-mute);margin:0">Nenhuma discursiva. Use "+ Discursiva" no editor.</p>';
        }
        return items.map(function(it, i){
          const tags = Array.isArray(it.tags) ? it.tags : [];
          const tagsHTML = (it.reference || tags.length)
            ? '<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.55rem">' +
                (it.reference ? '<span style="font-family:var(--mono);font-size:.6rem;padding:.1rem .45rem;border-radius:999px;background:var(--accent-lo);color:var(--accent);border:1px solid var(--accent-border)">' + e(it.reference) + '</span>' : '') +
                tags.map(function(t){ return '<span style="font-family:var(--mono);font-size:.6rem;padding:.1rem .45rem;border-radius:999px;background:var(--accent-lo);color:var(--accent);border:1px solid var(--accent-border)">' + e(t) + '</span>'; }).join('') +
              '</div>'
            : '';
          const criteria = Array.isArray(it.criteria) ? it.criteria : [];
          const criteriaHTML = criteria.length
            ? '<details style="margin-top:.7rem;border-top:1px solid var(--accent-border-soft);padding-top:.55rem">' +
                '<summary style="cursor:pointer;font-family:var(--mono);font-size:.7rem;letter-spacing:.05em;color:var(--accent);text-transform:uppercase">Ver critérios (' + criteria.length + ')</summary>' +
                '<div style="margin-top:.5rem;display:flex;flex-direction:column;gap:.4rem">' +
                  criteria.map(function(cr){
                    return '<div style="padding:.45rem .7rem;background:var(--bg-elev);border-radius:var(--radius);border-left:3px solid var(--accent)">' +
                      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.2rem">' +
                        '<strong style="font-family:var(--sans);font-size:.82rem;color:var(--accent)">' + e(cr.label||'') + '</strong>' +
                        (cr.maxScore ? '<span style="font-family:var(--mono);font-size:.7rem;color:var(--text-mute)">' + e(cr.maxScore) + ' pts</span>' : '') +
                      '</div>' +
                      '<div style="font-family:var(--sans);font-size:.78rem;color:var(--text-dim);line-height:1.5">' + e(cr.description||'') + '</div>' +
                    '</div>';
                  }).join('') +
                '</div>' +
              '</details>'
            : '';
          return '<article style="background:var(--bg-card);border:1px solid var(--accent-border-soft);border-radius:var(--radius-lg);padding:1rem 1.2rem;margin-bottom:.8rem">' +
            tagsHTML +
            '<blockquote style="border-left:3px solid var(--accent);padding:.4rem 1rem;font-family:var(--serif);font-style:italic;color:var(--text);margin:0 0 .8rem;font-size:.98rem;line-height:1.6">' +
              e(it.statement || it.command || '') +
            '</blockquote>' +
            '<textarea class="field-input" rows="5" placeholder="Sua resposta..." maxlength="' + (it.maxLength || 3000) + '" style="width:100%;font-size:.9rem"></textarea>' +
            '<div style="margin-top:.6rem;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">' +
              '<button class="btn btn-ghost btn-sm">Enviar para correção por IA</button>' +
              '<span style="font-family:var(--mono);font-size:.65rem;color:var(--text-mute);margin-left:auto">Máx: ' + (it.maxLength || 3000) + ' caracteres</span>' +
            '</div>' +
            criteriaHTML +
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
    renderSlideCarousel: renderSlideCarousel
  };

})(typeof window !== 'undefined' ? window : this);
