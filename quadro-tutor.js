/* ═══════════════════════════════════════════════════════════════════════════════
   QUADRO DO TUTOR (25/11/2026)
   O tutor desenha, ao lado da conversa, qualquer recurso visual em HTML (gráfico
   que mexe, jogo, linha do tempo com imagens...). Este módulo é a parte do app:
     · o botão Quadro no campo de pergunta, com os 3 modos (só quando eu pedir,
       perguntar antes, desenhar sozinho) guardados nas preferências da conta;
     · o painel do Quadro: à direita na página Tutor, em tela cheia na gaveta da
       unidade, como folha de baixo no celular;
     · a moldura isolada onde o desenho roda (sandbox sem acesso à conta e sem
       rede), com o kit visual da plataforma (quadro-kit.css + quadro-kit.js);
     · cartões do Quadro na conversa, convite do tutor, ajuste, Guardar, Virar
       flashcards, Explicar passo a passo, Sugerir para a unidade.
   O servidor é a função tutor-quadro (planejar, gerar, flashcards); os Quadros
   ficam em ia.quadros (SQL 176).
   ═══════════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  const KIT_V = 1;
  const MODOS = [
    { v: 'pedir', t: 'Só quando eu pedir', s: 'O tutor nunca desenha por conta própria.' },
    { v: 'perguntar', t: 'Perguntar antes', s: 'Quando um desenho ajudar, o tutor oferece e mostra o custo.' },
    { v: 'sozinho', t: 'Desenhar sozinho quando ajudar', s: 'O tutor já abre o Quadro. Cada desenho mostra quanto custou.' }
  ];
  const ETAPAS = { material: 'Conferindo o material do curso', imagens: 'Procurando imagens', desenhando: 'Desenhando' };
  const PEDIDO_RE = /(desenh|ilustr|no quadro|\b(fa[çz]a|fazer|monte|montar|cri[ae]|criar|mostr[ae]|mostrar|ger[ae]|gerar|quero)\b[^.?!\n]{0,40}\b(gr[aá]fico|mapa|linha do tempo|jogo|esquema|diagrama|simula[çd][aã]o|simulador|fluxograma|infogr[aá]fico|quadro comparativo|tabela comparativa)\b)/i;
  const ICO = {
    quadro: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="1"/><path d="M8 21h8M12 17v4M7 13l3-3 3 2 4-5"/></svg>',
    guardar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    mais: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>',
    cheia: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
    sair: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>',
    fechar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    cartoes: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="14" height="14" rx="1"/><path d="M7 3h14v14"/></svg>',
    passos: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v14l7-7zM13 5v14l7-7z"/></svg>',
    sugerir: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M6 9l6-6 6 6M4 21h16"/></svg>',
    lista: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>'
  };

  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmtF = n => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const toast = (m, t) => { try{ if(window.ueToast) window.ueToast(m, t || 'success'); }catch(_){} };
  function modo(){
    const v = (window.Store && window.Store.prefsGet) ? window.Store.prefsGet('quadro_modo') : null;
    return MODOS.some(m => m.v === v) ? v : 'sozinho';
  }
  function setModo(v){ if(window.Store && window.Store.prefsSet) window.Store.prefsSet('quadro_modo', v); }
  function pediuDesenho(texto){ return PEDIDO_RE.test(String(texto || '')); }
  async function token(){
    try{ const { data } = await window._sb.auth.getSession(); return data && data.session && data.session.access_token; }catch(_){ return null; }
  }
  function tema(){ return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }

  // ── o kit vai inteiro dentro da moldura (ela não busca nada sozinha) ──
  let _kitP = null;
  function kit(){
    if(_kitP) return _kitP;
    _kitP = Promise.all([fetch('quadro-kit.css?v=' + KIT_V).then(r => r.text()), fetch('quadro-kit.js?v=' + KIT_V).then(r => r.text())])
      .then(([css, js]) => {
        if(/<html|<!doctype/i.test(css.slice(0, 300)) || /<html|<!doctype/i.test(js.slice(0, 300))) throw new Error('kit');
        return { css, js };
      }).catch(e => { _kitP = null; throw e; });
    return _kitP;
  }
  // A moldura: sem rede, sem acesso à conta; imagens só do Banco de imagens (o armazenamento da
  // plataforma e o Drive, como o app usa) e dos acervos abertos que a função tutor-quadro consulta.
  function csp(){
    let banco = '';
    try{ banco = new URL(window._sbUrl || '').origin; }catch(_){}
    return "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; "
      + "img-src " + (banco ? banco + ' ' : '') + "https://upload.wikimedia.org https://drive.google.com https://*.googleusercontent.com data:; "
      + "media-src 'none'; connect-src 'none'; form-action 'none'; frame-src 'none'";
  }
  function documento(k, html){
    return '<!doctype html><html lang="pt-BR" data-theme="' + tema() + '"><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<meta http-equiv="Content-Security-Policy" content="' + csp() + '">'
      + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Outfit:wght@200;300;400;500&family=JetBrains+Mono:wght@400&display=swap">'
      + '<style>' + k.css + '</style><script>' + k.js + '<\/script></head><body><div class="q-raiz">' + html + '</div></body></html>';
  }

  // ── servidor ──
  async function ef(corpo){
    const tk = await token(); if(!tk) throw new Error('login');
    return fetch((window._sbUrl || '') + '/functions/v1/tutor-quadro', {
      method: 'POST', headers: { Authorization: 'Bearer ' + tk, apikey: window._sbKey || '', 'content-type': 'application/json' },
      body: JSON.stringify(corpo)
    });
  }
  async function planejar(info, decidir){
    const c = info.ctx;
    const r = await ef({ acao: 'planejar', decidir: !!decidir, pergunta: info.pergunta, resposta: info.resposta, pedido: info.pedido || '', subject_id: c.subjectId, modelo: c.modelo });
    const j = await r.json().catch(() => ({}));
    if(!r.ok || j.erro || !j.titulo) throw new Error('planejar');
    return j;
  }

  /* ═══ Um "lugar" do Quadro: a página Tutor ou a gaveta da unidade ═══
     opts: { onde:'pagina'|'gaveta', raiz (onde o painel entra), linhaBotao (onde fica o botão Quadro),
             ctx() → { subjectId, subjects, modelo, internet, conversaId, ordem, unitId, materia },
             preencher(texto), perguntar(texto), ativo() → o tutor de matéria está em uso } */
  function montar(opts){
    const L = { onde: opts.onde, quadros: [], ativo: null, gerando: null, fiz: '', fr: null };
    let painel = null, divisor = null, botao = null, pop = null;

    // ── botão Quadro e os modos ──
    function pintarBotao(){
      if(!opts.linhaBotao || botao) return;
      botao = document.createElement('button');
      botao.type = 'button'; botao.className = 'qd-tog'; botao.setAttribute('aria-haspopup', 'true'); botao.setAttribute('aria-expanded', 'false');
      botao.setAttribute('data-tip', 'Quadro: o tutor desenha para você ver e mexer');
      botao.innerHTML = ICO.quadro + '<span>Quadro</span>';
      const ref = opts.linhaBotao.querySelector('.tutor-box-esp, .tutor-cost, .tutor-send');
      opts.linhaBotao.insertBefore(botao, ref || null);
      botao.addEventListener('click', e => { e.stopPropagation(); pop && !pop.hidden ? fecharPop() : abrirPop(); });
      sincBotao();
    }
    function sincBotao(){ if(botao) botao.classList.toggle('on', modo() !== 'pedir'); }
    function abrirPop(){
      if(!pop){
        pop = document.createElement('div'); pop.className = 'qd-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Quadro');
        document.body.appendChild(pop);
        pop.addEventListener('click', e => {
          const m = e.target.closest('[data-q-modo]');
          if(m){ setModo(m.getAttribute('data-q-modo')); sincBotao(); pintarPop(); return; }
          if(e.target.closest('[data-q-agora]')){ fecharPop(); desenharUltima(); }
          if(e.target.closest('[data-q-meus]')){ fecharPop(); meusQuadros(); }
        });
        document.addEventListener('click', e => { if(pop && !pop.hidden && !pop.contains(e.target) && e.target !== botao && !botao.contains(e.target)) fecharPop(); });
        document.addEventListener('keydown', e => { if(e.key === 'Escape' && pop && !pop.hidden){ fecharPop(); botao.focus(); } });
      }
      pintarPop();
      const r = botao.getBoundingClientRect();
      pop.hidden = false;
      const w = 320, h = pop.offsetHeight || 300;
      pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
      pop.style.top = Math.max(8, r.top - h - 8) + 'px';
      botao.setAttribute('aria-expanded', 'true');
    }
    function pintarPop(){
      const atual = modo();
      pop.innerHTML = '<div class="qd-pop-h"><span class="qd-eyebrow">Quadro</span><span class="qd-pop-s">Quando o tutor desenha</span></div>'
        + '<div class="qd-sel" role="radiogroup" aria-label="Quando o tutor desenha">'
        + MODOS.map(m => '<button type="button" class="qd-opc' + (m.v === atual ? ' on' : '') + '" role="radio" aria-checked="' + (m.v === atual) + '" data-q-modo="' + m.v + '"><span class="qd-opc-m"></span><span><span class="qd-opc-t">' + esc(m.t) + '</span><span class="qd-opc-s">' + esc(m.s) + '</span></span></button>').join('')
        + '</div><div class="qd-pop-acoes">'
        + '<button type="button" class="qd-btn" data-q-agora' + ((L.ultima || (opts.ultima && opts.ultima())) ? '' : ' disabled') + '>' + ICO.quadro + 'Desenhar a última resposta</button>'
        + '<button type="button" class="qd-btn leve" data-q-meus>' + ICO.lista + 'Meus Quadros</button></div>'
        + '<p class="qd-pop-nota">Ou peça na conversa: "desenha", "faz um gráfico", "monta um jogo"...</p>';
    }
    function fecharPop(){ if(pop){ pop.hidden = true; } if(botao) botao.setAttribute('aria-expanded', 'false'); }

    // ── painel ──
    function criarPainel(){
      if(painel) return painel;
      painel = document.createElement('section');
      painel.className = 'qd-painel qd-' + L.onde; painel.setAttribute('aria-label', 'Quadro'); painel.hidden = true;
      painel.innerHTML =
        '<div class="qd-topo"><div class="qd-topo-txt"><span class="qd-eyebrow" data-q-eyebrow>Quadro</span><h2 class="qd-titulo" data-q-titulo>Quadro</h2></div>'
        + '<div class="qd-acoes">'
        + '<button type="button" class="qd-ib" data-q-acao="guardar" aria-pressed="false" aria-label="Guardar em Meus Quadros" data-tip="Guardar em Meus Quadros">' + ICO.guardar + '</button>'
        + '<button type="button" class="qd-ib" data-q-acao="menu" aria-haspopup="true" aria-label="Mais opções" data-tip="Mais opções">' + ICO.mais + '</button>'
        + '<button type="button" class="qd-ib" data-q-acao="cheia" aria-label="Tela cheia" data-tip="Tela cheia">' + ICO.cheia + '</button>'
        + '<button type="button" class="qd-ib" data-q-acao="fechar" aria-label="Fechar o Quadro" data-tip="Fechar o Quadro">' + ICO.fechar + '</button>'
        + '</div></div>'
        + '<div class="qd-abas" role="tablist" aria-label="Quadros desta conversa" data-q-abas hidden></div>'
        + '<div class="qd-palco" data-q-palco></div>'
        + '<div class="qd-fiz" data-q-fiz hidden><span class="qd-fiz-t" data-q-fiz-t></span><button type="button" class="qd-btn" data-q-acao="perguntar-fiz">Perguntar sobre o que fiz</button></div>'
        + '<form class="qd-ajuste" data-q-ajuste><label class="qd-sr" for="qdAjuste' + L.onde + '">Pedir um ajuste no Quadro</label>'
        + '<input id="qdAjuste' + L.onde + '" type="text" maxlength="600" autocomplete="off" placeholder="Peça um ajuste: ex.: mais simples, com outro exemplo, só a parte de 1822">'
        + '<button type="submit" class="qd-btn">Ajustar</button></form>'
        + '<div class="qd-rodape" data-q-rodape></div>'
        + '<div class="qd-menu" data-q-menu hidden role="menu">'
        + '<button type="button" class="qd-menu-i" role="menuitem" data-q-acao="flashcards">' + ICO.cartoes + '<span><span class="qd-menu-t">Virar flashcards</span><span class="qd-menu-s">Perguntas do tipo "e se...?", com a resposta no verso.</span></span></button>'
        + '<button type="button" class="qd-menu-i" role="menuitem" data-q-acao="passos">' + ICO.passos + '<span><span class="qd-menu-t">Explicar passo a passo</span><span class="qd-menu-s">O tutor refaz o desenho em etapas.</span></span></button>'
        + '<button type="button" class="qd-menu-i" role="menuitem" data-q-acao="sugerir">' + ICO.sugerir + '<span><span class="qd-menu-t">Sugerir para a unidade</span><span class="qd-menu-s">Vai para a equipe revisar. Se aprovado, vira bloco para todos.</span></span></button>'
        + '<button type="button" class="qd-menu-i" role="menuitem" data-q-acao="meus">' + ICO.lista + '<span><span class="qd-menu-t">Meus Quadros</span><span class="qd-menu-s">Os que você guardou.</span></span></button>'
        + '</div>';
      if(L.onde === 'pagina' && opts.raiz){
        divisor = document.createElement('div'); divisor.className = 'qd-div'; divisor.setAttribute('aria-hidden', 'true');
        opts.raiz.appendChild(divisor); opts.raiz.appendChild(painel);
      } else {
        painel.classList.add('qd-sobre');
        document.body.appendChild(painel);
      }
      painel.addEventListener('click', aoClicarPainel);
      painel.querySelector('[data-q-ajuste]').addEventListener('submit', e => {
        e.preventDefault();
        const inp = painel.querySelector('[data-q-ajuste] input'); const t = (inp.value || '').trim();
        if(!t || !L.ativo || L.gerando) return;
        inp.value = '';
        gerar({ ajuste: t, quadro: L.ativo });
      });
      document.addEventListener('keydown', e => {
        if(e.key !== 'Escape' || !painel || painel.hidden) return;
        const menu = painel.querySelector('[data-q-menu]');
        if(menu && !menu.hidden){ menu.hidden = true; return; }
        if(painel.classList.contains('is-cheia')){ alternarCheia(false); return; }
        if(painel.classList.contains('qd-sobre')) fechar();
      });
      return painel;
    }
    function abrir(){
      criarPainel();
      painel.hidden = false;
      if(L.onde === 'pagina' && opts.raiz) opts.raiz.classList.add('com-quadro');
      if(painel.classList.contains('qd-sobre')){
        document.documentElement.classList.add('qd-aberto');
        // na gaveta da unidade, o Quadro ocupa o espaço ao lado dela (se não sobrar espaço, cobre tudo)
        const d = document.getElementById('tutorDrawer');
        const w = (d && !d.hidden && window.innerWidth > 720) ? Math.round(d.getBoundingClientRect().width) : 0;
        painel.style.right = (w && window.innerWidth - w >= 560) ? (w + 12) + 'px' : '';
      }
    }
    function fechar(){
      if(!painel) return;
      painel.hidden = true; alternarCheia(false);
      if(L.onde === 'pagina' && opts.raiz) opts.raiz.classList.remove('com-quadro');
      document.documentElement.classList.remove('qd-aberto');
      const menu = painel.querySelector('[data-q-menu]'); if(menu) menu.hidden = true;
    }
    function alternarCheia(liga){
      if(!painel) return;
      const on = liga == null ? !painel.classList.contains('is-cheia') : !!liga;
      painel.classList.toggle('is-cheia', on);
      const b = painel.querySelector('[data-q-acao="cheia"]');
      if(b){ b.innerHTML = on ? ICO.sair : ICO.cheia; b.setAttribute('aria-label', on ? 'Sair da tela cheia' : 'Tela cheia'); b.setAttribute('data-tip', on ? 'Sair da tela cheia' : 'Tela cheia'); }
    }
    function aoClicarPainel(e){
      const aba = e.target.closest('[data-q-aba]');
      if(aba){ const q = L.quadros.find(x => String(x.id) === aba.getAttribute('data-q-aba')); if(q) mostrar(q); return; }
      const b = e.target.closest('[data-q-acao]'); if(!b) return;
      const a = b.getAttribute('data-q-acao');
      const menu = painel.querySelector('[data-q-menu]');
      if(a !== 'menu' && menu) menu.hidden = true;
      if(a === 'fechar') fechar();
      else if(a === 'cheia') alternarCheia();
      else if(a === 'menu'){ menu.hidden = !menu.hidden; }
      else if(a === 'guardar') guardar();
      else if(a === 'flashcards') flashcards();
      else if(a === 'passos'){ if(L.ativo && !L.gerando) gerar({ ajuste: 'Refaça como passo a passo: o mesmo conteúdo em etapas, com botões Anterior e Próxima, mostrando uma ideia por vez e o raciocínio de cada etapa.', quadro: L.ativo }); }
      else if(a === 'sugerir') sugerir();
      else if(a === 'meus') meusQuadros();
      else if(a === 'perguntar-fiz'){ if(L.fiz && opts.preencher) opts.preencher('No Quadro: ' + L.fiz + '. '); }
      else if(a === 'tentar'){ if(L.ultimoPedido) gerar(L.ultimoPedido); }
    }

    // ── o que aparece no palco ──
    function palco(){ return criarPainel().querySelector('[data-q-palco]'); }
    function pintarTopo(q){
      const c = opts.ctx ? opts.ctx() : {};
      painel.querySelector('[data-q-eyebrow]').textContent = 'Quadro' + (c.materia ? ' · ' + c.materia : '');
      painel.querySelector('[data-q-titulo]').textContent = (q && q.titulo) || 'Quadro';
      const g = painel.querySelector('[data-q-acao="guardar"]');
      if(g){ const on = !!(q && q.guardado); g.classList.toggle('on', on); g.setAttribute('aria-pressed', String(on)); g.disabled = !(q && q.id); }
    }
    function pintarAbas(){
      const box = painel.querySelector('[data-q-abas]');
      const lista = L.quadros.filter(q => q.id);
      box.hidden = lista.length < 2;
      box.innerHTML = lista.map((q, i) => '<button type="button" class="qd-aba' + (L.ativo && String(L.ativo.id) === String(q.id) ? ' on' : '') + '" role="tab" aria-selected="' + !!(L.ativo && String(L.ativo.id) === String(q.id)) + '" data-q-aba="' + esc(q.id) + '">' + (i + 1) + ' · ' + esc(String(q.titulo || 'Quadro').slice(0, 34)) + '</button>').join('');
    }
    function pintarRodape(q){
      const r = painel.querySelector('[data-q-rodape]');
      const fontes = (q && Array.isArray(q.fontes)) ? q.fontes : [];
      const imgs = (q && Array.isArray(q.imagens)) ? q.imagens : [];
      const nb = imgs.filter(i => i.origem === 'banco').length, nw = imgs.length - nb;
      const partes = [];
      if(fontes.length) partes.push('<span>Conferido com</span>' + fontes.slice(0, 3).map(f => '<span class="qd-fonte">' + esc(f.label) + '</span>').join(''));
      else partes.push('<span class="qd-fonte">Material do curso e resposta do tutor</span>');
      if(imgs.length) partes.push('<span class="qd-fonte">' + (nb ? nb + (nb === 1 ? ' imagem do Banco' : ' imagens do Banco') : '') + (nb && nw ? ' · ' : '') + (nw ? nw + ' da internet' : '') + '</span>');
      if(q && q.custo != null) partes.push('<span class="qd-custo">' + (Number(q.custo) > 0 ? fmtF(q.custo) + ' ƒ' : 'sem custo') + '</span>');
      r.innerHTML = partes.join('');
    }
    async function mostrar(q){
      abrir();
      L.ativo = q; L.fiz = '';
      painel.querySelector('[data-q-fiz]').hidden = true;
      pintarTopo(q); pintarAbas(); pintarRodape(q);
      painel.querySelector('[data-q-ajuste]').hidden = false;
      const p = palco();
      if(!q.html && q.id){
        p.innerHTML = '<div class="qd-estado"><span class="qd-estado-t">Abrindo o Quadro…</span></div>';
        try{
          const { data } = await window._sb.schema('ia').from('quadros').select('html, fontes, imagens, custo, guardado').eq('id', q.id).maybeSingle();
          if(data){ Object.assign(q, data); pintarRodape(q); pintarTopo(q); }
        }catch(_){}
      }
      if(!q.html){ p.innerHTML = '<div class="qd-estado"><span class="qd-estado-t">Não consegui abrir este Quadro.</span></div>'; return; }
      let k;
      try{ k = await kit(); }catch(_){ p.innerHTML = '<div class="qd-estado"><span class="qd-estado-t">Não consegui carregar o Quadro. Recarregue a página.</span></div>'; return; }
      if(L.ativo !== q) return;
      p.innerHTML = '';
      const fr = document.createElement('iframe');
      fr.className = 'qd-moldura'; fr.title = q.titulo || 'Quadro';
      fr.setAttribute('sandbox', 'allow-scripts');
      fr.setAttribute('referrerpolicy', 'no-referrer');
      fr.srcdoc = documento(k, q.html);
      p.appendChild(fr);
      L.fr = fr;
      marcarCartoes();
    }
    function mostrarGerando(info){
      abrir();
      const p = palco();
      pintarTopo({ titulo: info.titulo || 'Desenhando…' });
      painel.querySelector('[data-q-ajuste]').hidden = true;
      painel.querySelector('[data-q-fiz]').hidden = true;
      painel.querySelector('[data-q-rodape]').innerHTML = info.preco != null ? '<span class="qd-custo">' + fmtF(info.preco) + ' ƒ</span>' : '';
      p.innerHTML = '<div class="qd-estado qd-gerando" aria-live="polite"><span class="qd-eyebrow">Quadro</span>'
        + '<span class="qd-estado-t" data-q-etapa>Preparando o desenho</span>'
        + '<span class="qd-progresso"><span data-q-barra style="width:3%"></span></span>'
        + '<span class="qd-estado-s">' + esc(info.titulo || '') + '</span></div>';
    }
    function atualizarGerando(ev){
      const p = painel && painel.querySelector('[data-q-palco]'); if(!p) return;
      if(ev.type === 'status'){ const t = p.querySelector('[data-q-etapa]'); if(t) t.textContent = (ETAPAS[ev.etapa] || 'Desenhando') + '…'; }
      if(ev.type === 'progresso'){ const b = p.querySelector('[data-q-barra]'); if(b) b.style.width = Math.max(3, Math.min(98, ev.pct)) + '%'; }
      if(L.gerando && L.gerando.cartao){ const s = L.gerando.cartao.querySelector('.qd-cartao-s'); if(s && ev.type === 'progresso') s.textContent = 'Desenhando… ' + Math.max(3, Math.min(98, ev.pct)) + '%'; }
    }
    function mostrarErro(msg, podeTentar){
      abrir();
      painel.querySelector('[data-q-ajuste]').hidden = true;
      palco().innerHTML = '<div class="qd-estado"><span class="qd-estado-t">' + esc(msg) + '</span>'
        + (podeTentar ? '<button type="button" class="qd-btn" data-q-acao="tentar">Tentar de novo</button>' : '') + '</div>';
    }

    // ── cartões na conversa ──
    function cartaoEl(q, sub){
      const a = document.createElement('button');
      a.type = 'button'; a.className = 'qd-cartao';
      if(q && q.id) a.setAttribute('data-q-abrir', q.id);
      a.innerHTML = '<span class="qd-mini" aria-hidden="true">' + ICO.quadro + '</span><span class="qd-cartao-txt"><span class="qd-cartao-t">' + esc((q && q.titulo) || 'Quadro') + '</span><span class="qd-cartao-s">' + esc(sub || 'Abrir no Quadro') + '</span></span>';
      a.addEventListener('click', () => {
        const id = a.getAttribute('data-q-abrir');
        if(id){ const qq = L.quadros.find(x => String(x.id) === id); if(qq) mostrar(qq); }
        else if(L.gerando && L.gerando.cartao === a){ mostrarGerando(L.gerando.info); }
      });
      return a;
    }
    function subCartao(q){
      const tipo = q.tipo === 'jogo' ? 'Jogo' : q.tipo === 'simples' ? 'Desenho' : 'Desenho com controles';
      return tipo + ' · ' + (Number(q.custo) > 0 ? fmtF(q.custo) + ' ƒ' : 'abrir no Quadro');
    }
    function marcarCartoes(){
      document.querySelectorAll('.qd-cartao[data-q-abrir]').forEach(c => c.classList.toggle('on', !!(L.ativo && c.getAttribute('data-q-abrir') === String(L.ativo.id)) && painel && !painel.hidden));
    }

    // ── gerar (novo, ajuste ou passo a passo) ──
    async function gerar(pedido){
      if(L.gerando) return;
      L.ultimoPedido = pedido;
      const c = opts.ctx ? opts.ctx() : {};
      const ajuste = !!pedido.ajuste;
      const base = ajuste ? pedido.quadro : null;
      const info = { titulo: ajuste ? (base.titulo || 'Quadro') : (pedido.plano && pedido.plano.titulo), preco: pedido.plano ? pedido.plano.preco : null };
      L.gerando = { info, cartao: null };
      if(!ajuste && pedido.bolha){
        const card = cartaoEl({ titulo: info.titulo }, 'Desenhando…');
        card.classList.add('is-gerando');
        pedido.bolha.appendChild(card);
        L.gerando.cartao = card;
        if(opts.rolar) opts.rolar();
      }
      // na página, o Quadro abre já mostrando o desenho sendo feito. Na gaveta, só quando o aluno pediu o desenho
      // (escreveu pedindo, aceitou o convite ou usou o botão); se foi o tutor que decidiu, fica o cartão na conversa.
      const abrir = L.onde === 'pagina' || ajuste || !!pedido.abrir;
      if(abrir) mostrarGerando(info);
      let fim = null, erro = null, saldo = null;
      try{
        const r = await ef({
          acao: 'gerar', plano: pedido.plano || null, pergunta: pedido.pergunta || '', resposta: pedido.resposta || '',
          subject_id: c.subjectId, subjects: c.subjects || [], modelo: c.modelo, internet: !!c.internet,
          conversa_id: c.conversaId || null, ordem: pedido.ordem != null ? pedido.ordem : (base ? base.ordem : null),
          onde: L.onde, unit_id: c.unitId || null,
          quadro_id: ajuste ? base.id : null, ajuste: ajuste ? pedido.ajuste : ''
        });
        if(!r.ok || !r.body) throw new Error('rede');
        const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
        while(true){
          const { done, value } = await rd.read(); if(done) break;
          buf += dec.decode(value, { stream: true });
          const ps = buf.split('\n\n'); buf = ps.pop() || '';
          for(const p of ps){
            const l = p.trim(); if(l.indexOf('data:') !== 0) continue;
            let ev; try{ ev = JSON.parse(l.slice(5).trim()); }catch(_){ continue; }
            if(ev.type === 'status' || ev.type === 'progresso') atualizarGerando(ev);
            else if(ev.type === 'done') fim = ev;
            else if(ev.type === 'erro') erro = ev.mensagem;
            else if(ev.type === 'saldo') saldo = ev;
          }
        }
      }catch(_){ erro = 'Não consegui desenhar agora. Confira a conexão e tente de novo.'; }
      const cartao = L.gerando && L.gerando.cartao;
      L.gerando = null;
      if(saldo){
        if(cartao){ cartao.classList.remove('is-gerando'); cartao.querySelector('.qd-cartao-s').textContent = 'Saldo de Falcoins insuficiente'; }
        mostrarErro('Saldo de Falcoins insuficiente para este desenho (' + fmtF(saldo.preco) + ' ƒ). Adicione mais na sua Carteira, em Conta.', false);
        return;
      }
      if(!fim || !fim.quadro || erro){
        if(cartao){ cartao.classList.remove('is-gerando'); cartao.querySelector('.qd-cartao-s').textContent = 'Não deu para desenhar · tocar para tentar de novo'; cartao.onclick = () => { cartao.remove(); gerar(pedido); }; }
        if(abrir || (painel && !painel.hidden)) mostrarErro(erro || 'Não consegui desenhar agora.', true);
        return;
      }
      const q = fim.quadro;
      if(window.UbtWallet) try{ window.UbtWallet.load(); }catch(_){}
      L.quadros.push(q);
      if(cartao){
        cartao.classList.remove('is-gerando');
        cartao.setAttribute('data-q-abrir', q.id || '');
        cartao.querySelector('.qd-cartao-t').textContent = q.titulo || 'Quadro';
        cartao.querySelector('.qd-cartao-s').textContent = subCartao(q);
      } else if(ajuste && base && opts.ultimaBolha){
        const b = opts.ultimaBolha(); if(b){ b.appendChild(cartaoEl(q, subCartao(q))); }
      }
      if(abrir || (painel && !painel.hidden)) mostrar(q);
      else if(cartao) cartao.classList.add('is-novo');
    }

    // ── depois de cada resposta do tutor ──
    async function aposResposta(info){
      if(opts.ativo && !opts.ativo()) return;
      const c = opts.ctx ? opts.ctx() : {};
      info.ctx = c;
      L.ultima = info;
      const m = modo();
      const pediu = pediuDesenho(info.pergunta);
      if(!pediu && m === 'pedir') return;
      if(!info.resposta || String(info.resposta).length < 120 && !pediu) return;
      let plano;
      try{ plano = await planejar(Object.assign({ pedido: pediu ? info.pergunta : '' }, info), !pediu); }catch(_){ return; }
      if(!plano.desenhar) return;
      const pedido = { plano, pergunta: info.pergunta, resposta: info.resposta, bolha: info.bolha, ordem: c.ordem, abrir: pediu };
      if(pediu || m === 'sozinho'){ gerar(pedido); return; }
      // perguntar antes: o convite fica embaixo da resposta
      const conv = document.createElement('div');
      conv.className = 'qd-convite';
      conv.innerHTML = '<span class="qd-convite-t">' + esc(plano.convite || 'Quer que eu desenhe?') + '</span>'
        + '<button type="button" class="qd-btn cheio" data-q-sim>Desenhar no Quadro · ' + fmtF(plano.preco) + ' ƒ</button>'
        + '<button type="button" class="qd-btn leve" data-q-nao>Agora não</button>';
      info.bolha.appendChild(conv);
      conv.querySelector('[data-q-sim]').addEventListener('click', () => { conv.remove(); gerar(Object.assign({}, pedido, { abrir: true })); });
      conv.querySelector('[data-q-nao]').addEventListener('click', () => conv.remove());
      if(opts.rolar) opts.rolar();
    }
    // "Desenhar a última resposta" (pelo botão Quadro)
    async function desenharUltima(){
      const u = L.ultima || (opts.ultima ? opts.ultima() : null);
      if(!u || L.gerando) return;
      const c = opts.ctx ? opts.ctx() : {};
      u.ctx = c;
      let plano;
      try{ plano = await planejar(Object.assign({ pedido: 'Desenhe isto no Quadro.' }, u), false); }
      catch(_){ toast('Não consegui preparar o desenho agora.', 'error'); return; }
      gerar({ plano, pergunta: u.pergunta, resposta: u.resposta, bolha: u.bolha, ordem: c.ordem, abrir: true });
    }

    // ── Guardar, flashcards, sugerir, Meus Quadros ──
    async function guardar(){
      const q = L.ativo; if(!q || !q.id) return;
      const novo = !q.guardado;
      const { error } = await window._sb.schema('ia').from('quadros').update({ guardado: novo, updated_at: new Date().toISOString() }).eq('id', q.id);
      if(error){ toast('Não consegui guardar agora.', 'error'); return; }
      q.guardado = novo; pintarTopo(q);
      toast(novo ? 'Guardado em Meus Quadros.' : 'Tirado de Meus Quadros.');
    }
    async function flashcards(){
      const q = L.ativo; if(!q || !q.id) return;
      toast('Fazendo os flashcards…');
      let j = {};
      try{ const r = await ef({ acao: 'flashcards', quadro_id: q.id }); j = await r.json(); }catch(_){}
      const cs = Array.isArray(j.cartoes) ? j.cartoes : [];
      if(!cs.length || !window.Store || !window.Store.deckAdd){ toast('Não consegui fazer os flashcards agora.', 'error'); return; }
      const c = opts.ctx ? opts.ctx() : {};
      cs.forEach(x => window.Store.deckAdd({ kind: 'basic', front: x.frente, back: x.verso, origin: 'ia', sourceQuote: 'Quadro: ' + String(q.titulo || '').slice(0, 200),
        genParams: { quadro: String(q.id) }, subjectId: c.subjectId || null, unitId: c.unitId || null, unitTitle: c.unitTitle || '' }));
      toast(cs.length + (cs.length === 1 ? ' flashcard guardado' : ' flashcards guardados') + ' nos seus Flashcards.');
    }
    async function sugerir(){
      const q = L.ativo; if(!q || !q.id) return;
      const c = opts.ctx ? opts.ctx() : {};
      const { error } = await window._sb.schema('ia').from('quadro_sugestoes').insert({ quadro_id: q.id, subject_id: c.subjectId || null, unit_id: c.unitId || null });
      if(error && !/duplicate|unique/i.test(error.message || '')){ toast('Não consegui enviar agora.', 'error'); return; }
      toast('Enviado para a equipe revisar. Obrigado!');
    }
    async function meusQuadros(){
      abrir();
      painel.querySelector('[data-q-ajuste]').hidden = true; painel.querySelector('[data-q-fiz]').hidden = true;
      pintarTopo({ titulo: 'Meus Quadros' }); painel.querySelector('[data-q-rodape]').innerHTML = '';
      const p = palco(); p.innerHTML = '<div class="qd-estado"><span class="qd-estado-t">Carregando…</span></div>';
      const { data, error } = await window._sb.schema('ia').from('quadros').select('id, titulo, tipo, custo, created_at, conversa_id, ordem, guardado').eq('guardado', true).order('created_at', { ascending: false }).limit(60);
      if(error){ p.innerHTML = '<div class="qd-estado"><span class="qd-estado-t">Não consegui abrir a lista agora.</span></div>'; return; }
      if(!data || !data.length){ p.innerHTML = '<div class="qd-estado"><span class="qd-estado-t">Nenhum Quadro guardado ainda.</span><span class="qd-estado-s">No Quadro aberto, toque no marcador para guardar.</span></div>'; return; }
      p.innerHTML = '<div class="qd-lista">' + data.map(q => '<button type="button" class="qd-lista-i" data-q-meu="' + esc(q.id) + '"><span class="qd-cartao-t">' + esc(q.titulo) + '</span><span class="qd-cartao-s">' + esc(new Date(q.created_at).toLocaleDateString('pt-BR')) + ' · ' + esc(q.tipo === 'jogo' ? 'Jogo' : q.tipo === 'simples' ? 'Desenho' : 'Desenho com controles') + '</span></button>').join('') + '</div>';
      p.querySelectorAll('[data-q-meu]').forEach(b => b.addEventListener('click', () => {
        const d = data.find(x => String(x.id) === b.getAttribute('data-q-meu'));
        let q = L.quadros.find(x => String(x.id) === String(d.id));
        if(!q){ q = Object.assign({}, d); L.quadros.push(q); }
        mostrar(q);
      }));
    }

    // ── a conversa aberta do histórico traz os Quadros dela ──
    async function carregarConversa(conversaId, bolhas){
      L.quadros = []; L.ativo = null;
      if(painel) fechar();
      if(!conversaId) return;
      const { data } = await window._sb.schema('ia').from('quadros').select('id, titulo, tipo, custo, ordem, guardado, created_at').eq('conversa_id', conversaId).order('created_at', { ascending: true });
      (data || []).forEach(q => {
        L.quadros.push(q);
        const b = (bolhas || [])[Math.max(0, Math.min((bolhas || []).length - 1, (Number(q.ordem) || 1) - 1))];
        if(b) b.appendChild(cartaoEl(q, subCartao(q)));
      });
    }
    function novaConversa(){ L.quadros = []; L.ativo = null; L.ultima = null; if(painel) fechar(); }
    function modoTutor(materia){ if(botao) botao.hidden = !materia; if(!materia && painel) fechar(); }

    // ── o que o desenho conta (Quadro.contar / Quadro.perguntar) ──
    window.addEventListener('message', e => {
      if(!L.fr || e.source !== L.fr.contentWindow) return;
      const d = e.data || {}; if(d.fonte !== 'quadro-falcon') return;
      if(d.tipo === 'contar' && d.texto){
        L.fiz = String(d.texto).slice(0, 400);
        const f = painel.querySelector('[data-q-fiz]'); f.hidden = false;
        painel.querySelector('[data-q-fiz-t]').textContent = L.fiz;
      } else if(d.tipo === 'perguntar' && d.texto && opts.perguntar){
        opts.perguntar(String(d.texto).slice(0, 600));
      }
    });

    // a gaveta da unidade: ao trocar de página, o Quadro por cima fecha junto
    if(L.onde === 'gaveta') window.addEventListener('hashchange', () => { if(painel && !painel.hidden && !painel.classList.contains('is-cheia')) fechar(); });
    pintarBotao();
    return { aposResposta, carregarConversa, novaConversa, modoTutor, desenharUltima, fechar };
  }

  window.QuadroTutor = { montar, modo, setModo, pediuDesenho };
})();
