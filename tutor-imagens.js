/* ═══════════════════════════════════════════════════════════════════════════════
   TUTOR · IMAGENS NA CONVERSA + ENGRENAGEM (25/11/2026, pedido do dono)
   · Imagens: a função tutor-chat (v5.6) manda o evento "imagem" com a posição (pos)
     em que a imagem entra no texto. Aqui a posição vira uma marca ⟦img:n⟧ só na
     cópia que vai para a tela (o texto guardado e o histórico seguem limpos), e
     depois de cada pintura a marca é trocada pela figura. A figura é sempre o mesmo
     nó, então a foto não recarrega nem pisca enquanto o texto chega.
       - cena (pinturas, lugares, mapas): no corpo do texto, em mosaico;
       - pessoas: no satélite ao lado (página larga, como na unidade); onde não há
         espaço (gaveta, celular), o retrato fica ao lado do parágrafo.
     Clique numa imagem: o zoom do app (openLightbox, via data-lightbox).
   · Engrenagem: um lugar só para os ajustes do tutor: imagens, Quadro, modelo e
     quanto o tutor pensa (esforço). Imagens e esforço ficam nas preferências da
     conta (Store.prefs); o modelo continua com o controle de cada tela (a engrenagem
     só o comanda); o Quadro usa QuadroTutor.setModo. A Internet fica fora (Fontes).
   Expõe window.TutorImagens.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  const IMG_OPC = [
    { v: 'nao', t: 'Não trazer imagens', s: 'Só texto.' },
    { v: 'ajuda', t: 'Quando ajudar a entender', s: 'Pessoas, pinturas, lugares e mapas ligados ao que está sendo explicado.' },
    { v: 'sempre', t: 'Sempre que houver imagem boa', s: 'Mais imagens por resposta.' }
  ];
  const ESF_OPC = [{ v: 'baixo', t: 'Direto' }, { v: 'medio', t: 'Normal' }, { v: 'alto', t: 'Profundo' }];
  const MOD_OPC = [{ v: 'rapido', t: 'Rápido' }, { v: 'equilibrado', t: 'Equilibrado' }, { v: 'avancado', t: 'Avançado' }];
  const QD_OPC = [{ v: 'pedir', t: 'Só quando eu pedir' }, { v: 'perguntar', t: 'Perguntar antes' }, { v: 'sozinho', t: 'Sozinho' }];
  const ICO_ENGR = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  const ICO_ANT = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>';
  const ICO_PROX = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';
  const MARCA_RE = /^\s*⟦img:(\d+)⟧\s*$/;

  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function pref(k, d){ try{ const v = (window.Store && window.Store.prefsGet) ? window.Store.prefsGet(k) : null; return (v == null || v === '') ? d : v; }catch(_){ return d; } }
  function setPref(k, v){ try{ if(window.Store && window.Store.prefsSet) window.Store.prefsSet(k, v); }catch(_){} }
  function imagens(){ const v = pref('tutor_imagens', 'ajuda'); return IMG_OPC.some(o => o.v === v) ? v : 'ajuda'; }
  function esforco(){ const v = pref('tutor_esforco', 'medio'); return ESF_OPC.some(o => o.v === v) ? v : 'medio'; }
  // os campos que a tela manda para a função do tutor (só no tutor de conteúdo)
  function campos(){ const i = imagens(); return { imagens: i === 'nao' ? '' : i, esforco: esforco() }; }

  // ── estado de uma resposta ──
  function novo(){ return { lista: [], nos: {}, sat: null, satSel: 0 }; }
  function receber(st, ev){
    if(!st || !ev || !Array.isArray(ev.fotos) || !ev.fotos.length) return;
    const n = Number(ev.n);
    if(!isFinite(n) || st.lista.some(g => g.n === n)) return;
    st.lista.push({ n, pos: Math.max(0, Number(ev.pos) || 0), tipo: ev.tipo === 'pessoa' ? 'pessoa' : 'cena', termos: Array.isArray(ev.termos) ? ev.termos : [], fotos: ev.fotos.filter(f => f && f.url) });
  }
  function deLista(lista){ const st = novo(); (Array.isArray(lista) ? lista : []).forEach(g => receber(st, g)); return st; }
  // a cópia do texto que vai para a tela, com as marcas nas posições
  function comMarcas(texto, st){
    let t = String(texto == null ? '' : texto);
    if(!st || !st.lista.length) return t;
    st.lista.slice().sort((a, b) => (b.pos - a.pos) || (b.n - a.n)).forEach(g => {
      const p = Math.min(t.length, g.pos);
      t = t.slice(0, p) + '\n\n⟦img:' + g.n + '⟧\n\n' + t.slice(p);
    });
    return t;
  }
  function semMarcas(t){ return String(t == null ? '' : t).replace(/\n*⟦img:\d+⟧\n*/g, '\n\n'); }

  // ── figuras ──
  const limpaTitulo = s => String(s || '').replace(/\s+/g, ' ').replace(/[\s.;,]+$/, '').trim();
  function nomeDe(g, f, i){
    if(f.termo) return f.termo;
    return (g.termos && g.fotos.length === g.termos.length) ? g.termos[i] : '';
  }
  function legendaZoom(g, f, i){
    const nome = g.tipo === 'pessoa' ? nomeDe(g, f, i) : '';
    const partes = [nome, limpaTitulo(f.titulo), f.autor].filter(Boolean);
    let s = partes.filter((p, k) => partes.indexOf(p) === k).join(' · ');
    if(f.origem === 'acervo') s += (s ? ' · ' : '') + 'acervo aberto' + (f.licenca ? ', ' + f.licenca : '');
    return s;
  }
  function fotoHtml(g, f, i, cls){
    const nome = g.tipo === 'pessoa' ? nomeDe(g, f, i) : '';
    const t = nome || limpaTitulo(f.titulo);
    const sub = nome ? (f.autor || limpaTitulo(f.titulo)) : f.autor;
    return '<button type="button" class="' + cls + '" data-lightbox data-lightbox-src="' + esc(f.url) + '" data-lightbox-cap="' + esc(legendaZoom(g, f, i)) + '" aria-label="Ampliar: ' + esc(t) + '">'
      + '<img src="' + esc(f.url) + '" alt="' + esc(t) + '" decoding="async" referrerpolicy="no-referrer">'
      + '<span class="ti-cap"><b>' + esc(t) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</span></button>';
  }
  // o mesmo nó a cada pintura (não recarrega a foto)
  function no(st, g, largo){
    const chave = g.n + (largo ? 'L' : 'E');
    if(st.nos[chave]) return st.nos[chave];
    const fig = document.createElement('figure');
    const n = Math.min(3, g.fotos.length);
    if(g.tipo === 'pessoa'){
      fig.className = 'ti-pessoas ti-n' + n;
      fig.innerHTML = g.fotos.slice(0, 3).map((f, i) => fotoHtml(g, f, i, 'ti-f ti-retrato')).join('');
    } else {
      fig.className = 'ti-cena ti-n' + n;
      fig.innerHTML = g.fotos.slice(0, 3).map((f, i) => fotoHtml(g, f, i, 'ti-f')).join('');
    }
    st.nos[chave] = fig;
    return fig;
  }

  // ── satélite "Quem é quem" (página larga) ──
  function fotosPessoas(st){
    const out = [];
    st.lista.filter(g => g.tipo === 'pessoa').forEach(g => g.fotos.forEach((f, i) => out.push({ g, f, i })));
    return out.slice(0, 4);
  }
  function satelite(st){
    const ps = fotosPessoas(st);
    if(!st.sat){
      const a = document.createElement('aside');
      a.className = 'ti-sat';
      a.setAttribute('aria-label', 'Quem é quem');
      a.addEventListener('click', e => {
        const b = e.target.closest('[data-ti-ir]');
        if(b){ e.preventDefault(); e.stopPropagation(); escolher(st, Number(b.getAttribute('data-ti-ir'))); }
      });
      st.sat = a;
    }
    if(st.sat.getAttribute('data-n') !== String(ps.length)){
      st.sat.setAttribute('data-n', String(ps.length));
      st.sat.innerHTML = '<div class="tg-satellite-pin">'
        + '<div class="tg-satellite-label"><span>Quem é quem</span>' + (ps.length > 1 ? '<span class="tg-satellite-counter"><span data-ti-c>1</span> / ' + ps.length + '</span>' : '') + '</div>'
        + '<div class="tg-satellite-stage ti-sat-palco">'
        + ps.map((p, k) => '<div class="tg-satellite-slide' + (k === 0 ? ' active' : '') + '" data-ti-slide="' + k + '">' + fotoHtml(p.g, p.f, p.i, 'ti-sat-f') + '</div>').join('')
        + (ps.length > 1 ? '<button type="button" class="tg-satellite-nav tg-satellite-prev" data-ti-ir="-1" aria-label="Pessoa anterior">' + ICO_ANT + '</button><button type="button" class="tg-satellite-nav tg-satellite-next" data-ti-ir="-2" aria-label="Próxima pessoa">' + ICO_PROX + '</button>' : '')
        + '</div>'
        + '<div class="tg-satellite-cap" data-ti-cap></div>'
        + (ps.length > 1 ? '<div class="ti-sat-minis">' + ps.map((p, k) => '<button type="button" class="ti-sat-mini' + (k === 0 ? ' on' : '') + '" data-ti-ir="' + k + '" aria-label="' + esc(nomeDe(p.g, p.f, p.i) || limpaTitulo(p.f.titulo)) + '"><img src="' + esc(p.f.url) + '" alt="" decoding="async" referrerpolicy="no-referrer"></button>').join('') + '</div>' : '')
        + '</div>';
      st.satSel = Math.min(st.satSel, Math.max(0, ps.length - 1));
    }
    escolher(st, st.satSel, true);
    return st.sat;
  }
  function escolher(st, k, quieto){
    const ps = fotosPessoas(st); if(!ps.length || !st.sat) return;
    if(k === -1) k = (st.satSel - 1 + ps.length) % ps.length;
    else if(k === -2) k = (st.satSel + 1) % ps.length;
    k = Math.max(0, Math.min(ps.length - 1, k));
    st.satSel = k;
    st.sat.querySelectorAll('[data-ti-slide]').forEach(s => s.classList.toggle('active', Number(s.getAttribute('data-ti-slide')) === k));
    st.sat.querySelectorAll('.ti-sat-mini').forEach(s => s.classList.toggle('on', Number(s.getAttribute('data-ti-ir')) === k));
    const c = st.sat.querySelector('[data-ti-c]'); if(c) c.textContent = String(k + 1);
    const p = ps[k], cap = st.sat.querySelector('[data-ti-cap]');
    if(cap){ const nome = nomeDe(p.g, p.f, p.i); cap.innerHTML = (nome ? '<b>' + esc(nome) + '</b> · ' : '') + esc([limpaTitulo(p.f.titulo), p.f.autor].filter(Boolean).join(', ')); }
    if(!quieto && st.raiz){ st.raiz.querySelectorAll('.ti-nome').forEach(n => n.classList.toggle('on', Number(n.getAttribute('data-ti-ir')) === k)); }
  }
  // o nome da pessoa no texto (a 1ª vez) leva à foto dela no satélite
  function ligarNomes(raiz, st){
    const ps = fotosPessoas(st);
    ps.forEach((p, k) => {
      const nome = nomeDe(p.g, p.f, p.i); if(!nome || nome.length < 4) return;
      if(raiz.querySelector('.ti-nome[data-ti-ir="' + k + '"]')) return;
      const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentNode && n.parentNode.closest && n.parentNode.closest('a, code, .ti-nome, .ti-sat, figure, button')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      let t;
      while((t = w.nextNode())){
        const i = t.nodeValue.indexOf(nome);
        if(i < 0) continue;
        const depois = t.splitText(i); depois.splitText(nome.length);
        const s = document.createElement('span');
        s.className = 'ti-nome'; s.setAttribute('data-ti-ir', String(k)); s.setAttribute('role', 'button'); s.tabIndex = 0;
        s.textContent = nome;
        depois.parentNode.replaceChild(s, depois);
        break;
      }
    });
  }

  // ── depois de cada pintura do texto: troca as marcas pelas figuras ──
  function encaixar(raiz, st, o){
    if(!raiz || !st) return;
    st.raiz = raiz;
    const achados = Array.from(raiz.querySelectorAll('p, div, li, span')).filter(el => MARCA_RE.test(el.textContent) && !el.closest('.ti-sat'));
    const topo = achados.filter(el => !achados.some(x => x !== el && x.contains(el)) );
    if(!st.lista.length){ topo.forEach(el => el.remove()); limparSoltas(raiz); return; }
    const largo = !!(o && o.largo) && raiz.clientWidth >= 720 && fotosPessoas(st).length > 0;
    topo.forEach(el => {
      const n = Number(el.textContent.match(/\d+/)[0]);
      const g = st.lista.find(x => x.n === n);
      if(!g || (g.tipo === 'pessoa' && largo)){ el.remove(); return; }
      el.replaceWith(no(st, g, largo));
    });
    limparSoltas(raiz);
    if(largo){
      // ti-com-sat mede a largura (container); a grade dentro dela se ajusta quando a conversa estreita (Quadro aberto)
      const caixa = document.createElement('div'); caixa.className = 'ti-com-sat';
      const grade = document.createElement('div'); grade.className = 'ti-grade';
      const texto = document.createElement('div'); texto.className = 'ti-texto';
      while(raiz.firstChild) texto.appendChild(raiz.firstChild);
      grade.appendChild(texto); grade.appendChild(satelite(st));
      caixa.appendChild(grade);
      raiz.appendChild(caixa);
      ligarNomes(texto, st);
    }
  }
  function limparSoltas(raiz){
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    const tira = []; let t;
    while((t = w.nextNode())) if(t.nodeValue.indexOf('⟦img:') >= 0) tira.push(t);
    tira.forEach(n => { n.nodeValue = n.nodeValue.replace(/⟦img:\d+⟧/g, ''); });
  }
  // clique no nome no texto
  document.addEventListener('click', e => {
    const n = e.target.closest && e.target.closest('.ti-nome[data-ti-ir]'); if(!n) return;
    const grade = n.closest('.ti-com-sat'); if(!grade) return;
    const b = grade.querySelector('.ti-sat [data-ti-ir="' + n.getAttribute('data-ti-ir') + '"]');
    if(b) b.click();
    const sat = grade.querySelector('.ti-sat'); if(sat && sat.scrollIntoView) sat.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  // ── engrenagem ──
  let _popAberto = null;
  function fecharPop(){ if(_popAberto){ _popAberto.pop.hidden = true; _popAberto.btn.setAttribute('aria-expanded', 'false'); _popAberto = null; } }
  document.addEventListener('click', e => { if(_popAberto && !e.target.closest('.ti-aj-pop') && !e.target.closest('.ti-aj-btn')) fecharPop(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && _popAberto){ const b = _popAberto.btn; fecharPop(); try{ b.focus(); }catch(_){} } });
  window.addEventListener('resize', fecharPop);
  window.addEventListener('hashchange', fecharPop);

  function seg(nome, opcs, atual){
    return '<div class="ti-aj-seg" role="radiogroup" aria-label="' + esc(nome) + '">' + opcs.map(o =>
      '<button type="button" role="radio" aria-checked="' + (o.v === atual) + '" class="' + (o.v === atual ? 'on' : '') + '" data-ti-aj="' + esc(nome) + '" data-v="' + esc(o.v) + '">' + esc(o.t) + '</button>').join('') + '</div>';
  }
  function montarAjustes(linha, o){
    if(!linha) return null;
    o = o || {};
    const wrap = document.createElement('span');
    wrap.className = 'ti-aj';
    wrap.innerHTML = '<button type="button" class="ti-aj-btn" aria-haspopup="dialog" aria-expanded="false" data-tip="Ajustes do tutor: imagens, Quadro, modelo e quanto ele pensa">' + ICO_ENGR + '<span class="ti-aj-t"></span></button>';
    const btn = wrap.querySelector('.ti-aj-btn');
    const pop = document.createElement('div');
    pop.className = 'ti-aj-pop'; pop.hidden = true;
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Ajustes do tutor');
    document.body.appendChild(pop);
    const modeloAtual = () => (o.modelo ? o.modelo() : 'equilibrado') || 'equilibrado';
    function rotulo(){
      const m = MOD_OPC.find(x => x.v === modeloAtual()), e = ESF_OPC.find(x => x.v === esforco());
      wrap.querySelector('.ti-aj-t').textContent = o.curto ? 'Ajustes' : ((m ? m.t : 'Modelo') + ' · ' + (e ? e.t : 'Normal'));
    }
    function pintar(){
      const qd = window.QuadroTutor && window.QuadroTutor.modo ? window.QuadroTutor.modo() : null;
      const im = imagens();
      pop.innerHTML = '<div class="ti-aj-topo"><span class="ti-aj-titulo">Ajustes do tutor</span><span class="ti-aj-sub">Vale para todas as conversas</span></div>'
        + '<section class="ti-aj-sec"><div class="ti-aj-l"><span>Imagens na conversa</span><i>quase não muda o custo</i></div>'
        + '<div class="ti-aj-opcs" role="radiogroup" aria-label="Imagens na conversa">' + IMG_OPC.map(x =>
            '<button type="button" role="radio" aria-checked="' + (x.v === im) + '" class="ti-aj-opc' + (x.v === im ? ' on' : '') + '" data-ti-aj="imagens" data-v="' + x.v + '"><span class="ti-aj-m"></span><span><span class="ti-aj-ot">' + esc(x.t) + '</span><span class="ti-aj-os">' + esc(x.s) + '</span></span></button>').join('') + '</div>'
        + '<p class="ti-aj-nota">Do Banco de imagens da plataforma; quando faltar, de acervos abertos (domínio público ou licença livre).</p></section>'
        + (qd ? '<section class="ti-aj-sec"><div class="ti-aj-l"><span>Quadro</span><i>0,05 a 0,15 ƒ por desenho</i></div>' + seg('quadro', QD_OPC, qd) + '</section>' : '')
        + '<section class="ti-aj-sec"><div class="ti-aj-l"><span>Modelo</span><i>Avançado custa mais</i></div>' + seg('modelo', MOD_OPC, modeloAtual()) + '</section>'
        + '<section class="ti-aj-sec"><div class="ti-aj-l"><span>Quanto o tutor pensa</span><i>mais pensar, mais custo</i></div>' + seg('esforco', ESF_OPC, esforco())
        + '<p class="ti-aj-nota"><b>Profundo</b> pensa mais antes de responder: melhor para discursiva, caso de prova e conta longa; demora e custa mais. <b>Direto</b> serve para dúvida curta e sai mais barato.</p></section>'
        + '<p class="ti-aj-nota ti-aj-rodape">A Internet continua no botão Internet, em Fontes. O preço de cada resposta segue o que foi usado de verdade.</p>';
    }
    function posicionar(){
      const r = btn.getBoundingClientRect();
      const w = Math.min(400, window.innerWidth - 24);
      pop.style.width = w + 'px';
      const h = pop.offsetHeight || 520;
      const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w));
      const top = r.top - h - 10 >= 12 ? r.top - h - 10 : Math.min(window.innerHeight - h - 12, r.bottom + 10);
      pop.style.left = left + 'px'; pop.style.top = Math.max(12, top) + 'px';
    }
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if(_popAberto && _popAberto.pop === pop){ fecharPop(); return; }
      fecharPop();
      pintar(); pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
      _popAberto = { pop, btn };
      posicionar();
    });
    pop.addEventListener('click', e => {
      const b = e.target.closest('[data-ti-aj]'); if(!b) return;
      const k = b.getAttribute('data-ti-aj'), v = b.getAttribute('data-v');
      if(k === 'imagens') setPref('tutor_imagens', v);
      else if(k === 'esforco') setPref('tutor_esforco', v);
      else if(k === 'quadro'){ if(window.QuadroTutor && window.QuadroTutor.setModo) window.QuadroTutor.setModo(v); }
      else if(k === 'modelo'){ if(o.setModelo) o.setModelo(v); }
      pintar(); rotulo(); posicionar();
    });
    // depois do botão do Quadro, se houver; senão antes do espaço do fim da linha
    const qd = linha.querySelector('.qd-tog');
    const esp = linha.querySelector('.tutor-box-esp, .tutor-cost');
    if(qd && qd.parentNode === linha) qd.insertAdjacentElement('afterend', wrap);
    else if(esp && esp.parentNode === linha) linha.insertBefore(wrap, esp);
    else linha.appendChild(wrap);
    rotulo();
    return { atualizar: rotulo, el: wrap };
  }

  window.TutorImagens = { imagens, esforco, campos, novo, receber, deLista, comMarcas, semMarcas, encaixar, montarAjustes };
})();
