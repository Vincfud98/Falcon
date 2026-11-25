/* Falcon · Admin · Quadros sugeridos (SQL 176), 25/11/2026.
   O aluno sugere um Quadro do tutor para a unidade (menu ⋯ do Quadro › Sugerir para a unidade). Aqui a equipe
   confere o desenho e, se estiver certo, põe na unidade como bloco Artefato (documento completo do Quadro, com o
   kit visual e as regras de segurança da moldura), ou recusa.
   Script comum (sem módulo), carregado no fim do admin.html. Usa window.QuadroTutor.documentoCompleto
   (quadro-tutor.js) e as pontes do editor de unidades (openUnitEditor, ueSelectSection, ueAddBlock,
   ueArtefactSetField). Expõe window.QuadrosSugeridos. */
(function(){
  'use strict';

  var TIPO = { simples: 'Desenho', interativo: 'Desenho com controles', jogo: 'Jogo' };
  var FILTROS = [['nova', 'Novas'], ['aceita', 'Postas na unidade'], ['recusada', 'Recusadas']];
  var ALTURA_BLOCO = 680;
  var S = { el: null, filtro: 'nova', lista: [], sel: null, ocupado: false, erro: null, carregando: false, unidade: null };

  var CSS = [
    '.qsug{color:var(--text);font-family:var(--sans);font-weight:300;min-width:0}',
    '.qsug *,.qsug *::before,.qsug *::after{box-sizing:border-box}',
    '.qsug p{margin:0}',
    '.qsug svg{stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}',
    '.qsug .qsug-intro{font-weight:200;font-size:.88rem;line-height:1.7;color:var(--text-dim);max-width:760px;margin:-.4rem 0 1.4rem}',
    '.qsug .seg{display:inline-flex;padding:3px;gap:2px;border:1px solid var(--accent-border-soft);border-radius:var(--radius);background:var(--bg-sunken)}',
    '.qsug .seg-btn{padding:.5rem .95rem;background:transparent;border:none;cursor:pointer;font-family:var(--sans);font-weight:300;font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:var(--text-dim);border-radius:2px;transition:all .3s var(--ease)}',
    '.qsug .seg-btn.is-active{background:var(--accent);color:var(--bg)}',
    '.qsug .seg-btn:hover:not(.is-active){color:var(--accent)}',
    '.qsug .qsug-grade{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:1.4rem;align-items:start}',
    '@media (max-width:1000px){.qsug .qsug-grade{grid-template-columns:1fr}}',
    '.qsug .qsug-lista{display:flex;flex-direction:column;gap:.6rem;min-width:0}',
    '.qsug .qsug-item{display:flex;flex-direction:column;gap:.35rem;width:100%;padding:.9rem 1rem;border:1px solid var(--accent-border-soft);border-radius:var(--radius);background:transparent;color:var(--text);text-align:left;cursor:pointer;font-family:var(--sans);transition:border-color .3s var(--ease),background .3s var(--ease)}',
    '.qsug .qsug-item:hover{border-color:var(--accent-border)}',
    '.qsug .qsug-item.on{border-color:var(--accent);background:var(--accent-xlo)}',
    '.qsug .qsug-item-t{font-family:var(--serif);font-weight:400;font-size:1.05rem;line-height:1.25;color:var(--text)}',
    '.qsug .qsug-item-s{font-weight:300;font-size:.74rem;color:var(--text-dim);line-height:1.45}',
    '.qsug .qsug-eyebrow{font-family:var(--sans);font-weight:300;font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:var(--accent)}',
    '.qsug .qsug-det{display:flex;flex-direction:column;gap:.9rem;min-width:0;padding:1.2rem 1.3rem;border:1px solid var(--accent-border-soft);border-radius:var(--radius-lg)}',
    '.qsug .qsug-det-t{font-family:var(--serif);font-weight:400;font-size:clamp(1.25rem,1.8vw,1.7rem);line-height:1.2;margin:0;color:var(--text)}',
    '.qsug .qsug-meta{display:flex;flex-wrap:wrap;gap:.45rem}',
    '.qsug .chip{display:inline-flex;align-items:center;gap:.45rem;padding:.3rem .7rem;border:1px solid var(--accent-border-soft);border-radius:2px;font-family:var(--sans);font-weight:300;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);background:var(--accent-xlo);white-space:nowrap;line-height:1.25;max-width:100%;overflow:hidden;text-overflow:ellipsis}',
    '.qsug .chip-success{color:var(--green);border-color:var(--green-border);background:var(--green-lo)}',
    '.qsug .qsug-moldura{width:100%;height:560px;border:1px solid var(--accent-border-soft);border-radius:var(--radius);background:var(--bg-sunken);display:block}',
    '.qsug .qsug-nota{padding:.75rem .9rem;border-left:2px solid var(--accent-border);background:var(--accent-xlo);font-size:.84rem;line-height:1.6;color:var(--text-dim)}',
    '.qsug .qsug-fontes{font-size:.74rem;line-height:1.6;color:var(--text-dim)}',
    '.qsug .qsug-acoes{display:flex;flex-wrap:wrap;gap:.6rem;align-items:flex-end;padding-top:.4rem;border-top:1px solid var(--accent-border-soft)}',
    '.qsug .qsug-campo{display:flex;flex-direction:column;gap:.4rem;flex:1 1 280px;min-width:0}',
    '.qsug .qsug-label{font-family:var(--sans);font-weight:300;font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:var(--accent)}',
    '.qsug .qsug-select{width:100%;background:transparent;border:1px solid var(--accent-border-soft);border-radius:var(--radius);padding:.7rem .9rem;font-family:var(--sans);font-weight:300;font-size:.88rem;color:var(--text)}',
    '.qsug .qsug-select:focus{outline:none;border-color:var(--accent);background:var(--accent-xlo)}',
    '.qsug .qsug-ajuda{font-size:.72rem;line-height:1.5;color:var(--text-dim)}',
    '.qsug .qsug-erro{color:var(--error,var(--red))}',
    '.qsug .empty{text-align:center;padding:3rem 2rem;border:1px dashed var(--accent-border-soft);border-radius:var(--radius-lg);display:flex;flex-direction:column;align-items:center;gap:.8rem;max-width:520px;margin:1rem auto}',
    '.qsug .empty-icon{width:44px;height:44px;stroke:var(--accent);fill:none;stroke-width:1.3;opacity:.6}',
    '.qsug .empty-title{font-family:var(--serif);font-weight:400;font-size:1.2rem;color:var(--text)}',
    '.qsug .empty-body{font-weight:200;font-size:.86rem;color:var(--text-dim);line-height:1.7;max-width:46ch}'
  ].join('\n');
  var IC_QUADRO = '<svg class="empty-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="1"/><path d="M8 21h8M12 17v4M7 13l3-3 3 2 4-5"/></svg>';

  function esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function ia(){ return window._sb.schema('ia'); }
  function conteudo(){ return window._sb.schema('conteudo'); }
  function toast(m, t){ try{ if(window.ueToast) window.ueToast(m, t || 'success'); else if(window.console) console.log('[Quadros sugeridos]', m); }catch(_){} }
  function injetarCSS(){
    if(document.getElementById('qsug-css')) return;
    var st = document.createElement('style'); st.id = 'qsug-css'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }
  function lista(nome){ try{ return (window.UbiqueStore && window.UbiqueStore[nome] && window.UbiqueStore[nome].list()) || []; }catch(_){ return []; } }
  function materiaNome(id){
    if(id == null || id === '') return '';
    var s = lista('subjects').find(function(x){ return String(x.id) === String(id); });
    return s ? (s.subject || s.name || s.title || '') : '';
  }
  function unidade(id){
    if(id == null || id === '') return null;
    return lista('units').find(function(x){ return String(x.id) === String(id); }) || null;
  }
  function unidadeNome(u){ return u ? ((u.number != null && u.number !== '' ? u.number + '. ' : '') + (u.title || 'Unidade')) : ''; }
  function data(d){ try{ return new Date(d).toLocaleDateString('pt-BR'); }catch(_){ return ''; } }

  // ── dados ──
  async function contar(){
    try{
      var r = await ia().from('quadro_sugestoes').select('id', { count: 'exact', head: true }).eq('status', 'nova');
      return r.error ? 0 : (r.count || 0);
    }catch(_){ return 0; }
  }
  async function carregar(){
    S.carregando = true; S.erro = null; pintar();
    try{
      var r = await ia().from('quadro_sugestoes')
        .select('id, quadro_id, subject_id, unit_id, nota, status, created_at, revisado_em, quadro:quadros(id, titulo, tipo, html, fontes, imagens, subject_id, unit_id, created_at)')
        .eq('status', S.filtro).order('created_at', { ascending: false }).limit(100);
      if(r.error) throw r.error;
      S.lista = (r.data || []).filter(function(x){ return x.quadro; });
      if(!S.sel || !S.lista.some(function(x){ return x.id === S.sel; })) S.sel = S.lista.length ? S.lista[0].id : null;
    }catch(e){
      S.lista = []; S.sel = null; S.erro = 'Não consegui ler as sugestões agora (' + (e && e.message ? e.message : 'erro') + ').';
    }
    S.carregando = false;
    pintar();
    avisarContagem();
  }
  async function avisarContagem(){
    var n = S.filtro === 'nova' ? S.lista.length : await contar();
    try{ window.dispatchEvent(new CustomEvent('quadros:mudou', { detail: { novas: n } })); }catch(_){}
  }

  // ── tela ──
  function pintar(){
    if(!S.el) return;
    var h = '<div class="qsug">'
      + '<div class="section-head"><h2>Quadros sugeridos</h2><span class="count">' + (S.carregando ? '…' : S.lista.length + (S.lista.length === 1 ? ' sugestão' : ' sugestões')) + '</span>'
      + '<div class="seg" role="tablist" style="margin-left:auto">' + FILTROS.map(function(f){
          return '<button type="button" class="seg-btn' + (S.filtro === f[0] ? ' is-active' : '') + '" role="tab" aria-selected="' + (S.filtro === f[0]) + '" data-qs-filtro="' + f[0] + '">' + f[1] + '</button>';
        }).join('') + '</div></div>'
      + '<p class="qsug-intro">Quadros do tutor que os alunos sugeriram para a unidade. Confira o conteúdo e as fontes; se estiver certo, ponha na unidade. Ele entra como bloco Artefato no fim da unidade, e você ajusta a posição no editor.</p>';
    if(S.carregando) h += '<div class="loading">Carregando</div>';
    else if(S.erro) h += '<div class="empty">' + IC_QUADRO + '<span class="empty-title">Não deu para abrir</span><span class="empty-body qsug-erro">' + esc(S.erro) + '</span></div>';
    else if(!S.lista.length) h += '<div class="empty">' + IC_QUADRO + '<span class="empty-title">' + (S.filtro === 'nova' ? 'Nenhuma sugestão nova' : 'Nada por aqui') + '</span><span class="empty-body">'
      + (S.filtro === 'nova' ? 'Quando um aluno sugerir um Quadro para a unidade, ele aparece aqui para revisão.' : 'As sugestões revisadas aparecem aqui.') + '</span></div>';
    else {
      var sel = S.lista.find(function(x){ return x.id === S.sel; }) || S.lista[0];
      h += '<div class="qsug-grade"><div class="qsug-lista">' + S.lista.map(function(s){
          var q = s.quadro, u = unidade(s.unit_id || q.unit_id);
          var mat = materiaNome(s.subject_id || q.subject_id);
          return '<button type="button" class="qsug-item' + (s.id === sel.id ? ' on' : '') + '" data-qs-sel="' + s.id + '">'
            + '<span class="qsug-eyebrow">' + esc(mat || 'Sem matéria') + '</span>'
            + '<span class="qsug-item-t">' + esc(q.titulo || 'Quadro') + '</span>'
            + '<span class="qsug-item-s">' + esc((TIPO[q.tipo] || 'Desenho') + ' · ' + (u ? unidadeNome(u) : 'sem unidade') + ' · ' + data(s.created_at)) + '</span></button>';
        }).join('') + '</div>' + detalhe(sel) + '</div>';
    }
    h += '</div>';
    S.el.innerHTML = h;
    var fr = S.el.querySelector('[data-qs-moldura]');
    if(fr && sel) montarMoldura(fr, sel.quadro);
  }
  function opcoesUnidades(s){
    var q = s.quadro, sid = s.subject_id || q.subject_id, uid = String(s.unit_id || q.unit_id || '');
    var us = [];
    try{ if(sid != null && typeof window.unitsOfSubjectInOrder === 'function') us = window.unitsOfSubjectInOrder(sid) || []; }catch(_){}
    var escolhida = S.unidade != null ? String(S.unidade) : uid;
    if(!us.length && uid){ var u0 = unidade(uid); if(u0) us = [u0]; }
    if(!us.length) return '';
    return us.map(function(u){ return '<option value="' + esc(u.id) + '"' + (String(u.id) === escolhida ? ' selected' : '') + '>' + esc(unidadeNome(u)) + '</option>'; }).join('');
  }
  function detalhe(s){
    var q = s.quadro;
    var fontes = Array.isArray(q.fontes) ? q.fontes : [], imgs = Array.isArray(q.imagens) ? q.imagens : [];
    var nb = imgs.filter(function(i){ return i && i.origem === 'banco'; }).length, nw = imgs.length - nb;
    var ops = opcoesUnidades(s);
    var h = '<div class="qsug-det"><div><span class="qsug-eyebrow">' + esc(materiaNome(s.subject_id || q.subject_id) || 'Quadro') + '</span>'
      + '<h3 class="qsug-det-t">' + esc(q.titulo || 'Quadro') + '</h3></div>'
      + '<div class="qsug-meta"><span class="chip">' + esc(TIPO[q.tipo] || 'Desenho') + '</span><span class="chip">Sugerido em ' + esc(data(s.created_at)) + '</span>'
      + (s.status === 'aceita' ? '<span class="chip chip-success">Posto na unidade' + (s.revisado_em ? ' em ' + esc(data(s.revisado_em)) : '') + '</span>' : '')
      + (s.status === 'recusada' ? '<span class="chip">Recusado' + (s.revisado_em ? ' em ' + esc(data(s.revisado_em)) : '') + '</span>' : '') + '</div>'
      + '<iframe class="qsug-moldura" data-qs-moldura title="' + esc(q.titulo || 'Quadro') + '" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe>'
      + (s.nota ? '<p class="qsug-nota"><b>Nota do aluno:</b> ' + esc(s.nota) + '</p>' : '')
      + '<p class="qsug-fontes"><b>Conferido com:</b> ' + (fontes.length ? fontes.map(function(f){ return esc(f.label || ''); }).filter(Boolean).join(' · ') : 'material do curso e resposta do tutor')
      + (imgs.length ? ' · ' + (nb ? nb + (nb === 1 ? ' imagem do Banco' : ' imagens do Banco') : '') + (nb && nw ? ' e ' : '') + (nw ? nw + ' da internet (licença livre)' : '') : '') + '</p>';
    if(s.status === 'nova'){
      h += '<div class="qsug-acoes">'
        + (ops ? '<label class="qsug-campo"><span class="qsug-label">Unidade</span><select class="qsug-select" data-qs-unidade>' + ops + '</select>'
          + '<span class="qsug-ajuda">O bloco entra no fim da última seção da unidade escolhida.</span></label>'
          : '<p class="qsug-ajuda qsug-erro" style="flex:1 1 280px">Não achei as unidades desta matéria. Abra a aba Unidades uma vez e volte.</p>')
        + '<button type="button" class="btn" data-qs-acao="por"' + (ops && !S.ocupado ? '' : ' disabled') + '>' + (S.ocupado ? 'Abrindo o editor…' : 'Pôr na unidade') + '</button>'
        + '<button type="button" class="btn btn-ghost" data-qs-acao="recusar"' + (S.ocupado ? ' disabled' : '') + '>Recusar</button></div>';
    }
    return h + '</div>';
  }
  async function montarMoldura(fr, q){
    try{
      if(!window.QuadroTutor || !window.QuadroTutor.documentoCompleto) throw new Error('kit');
      var doc = await window.QuadroTutor.documentoCompleto(q.html, { tema: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark' });
      if(fr.isConnected) fr.srcdoc = doc;
    }catch(_){
      if(fr.isConnected) fr.srcdoc = '<p style="font:14px sans-serif;color:#999;padding:24px">Não consegui montar o Quadro. Recarregue o painel.</p>';
    }
  }

  // ── ações ──
  async function quemSou(){ try{ var r = await window._sb.auth.getUser(); return r && r.data && r.data.user ? r.data.user.id : null; }catch(_){ return null; } }
  async function marcar(s, status){
    var r = await ia().from('quadro_sugestoes').update({ status: status, revisado_por: await quemSou(), revisado_em: new Date().toISOString() }).eq('id', s.id);
    if(r.error) throw r.error;
  }
  async function porNaUnidade(s){
    var sel = S.el.querySelector('[data-qs-unidade]');
    var uid = sel ? sel.value : null;
    if(!uid){ toast('Escolha a unidade.', 'error'); return; }
    if(typeof window.openUnitEditor !== 'function' || typeof window.ueAddBlock !== 'function' || typeof window.ueArtefactSetField !== 'function'){
      toast('O editor de unidades não carregou. Recarregue o painel.', 'error'); return;
    }
    S.ocupado = true; pintar();
    try{
      var doc = await window.QuadroTutor.documentoCompleto(s.quadro.html, { tema: 'dark' });
      var uidNum = isNaN(parseInt(uid, 10)) ? uid : parseInt(uid, 10);
      // a última seção da unidade (a mesma ordem do editor: posição, depois id)
      var rs = await conteudo().from('unit_sections').select('id').eq('unit_id', uidNum).order('position').order('id');
      if(rs.error) throw rs.error;
      await window.openUnitEditor(uidNum);
      var secs = rs.data || [];
      if(secs.length && typeof window.ueSelectSection === 'function') window.ueSelectSection(secs[secs.length - 1].id);
      var b = await window.ueAddBlock('artefact');
      if(!b || b.id == null) throw new Error('não consegui criar o bloco');
      window.ueArtefactSetField(b.id, 'initialHeight', ALTURA_BLOCO);
      window.ueArtefactSetField(b.id, 'html', doc);
      await marcar(s, 'aceita');
      S.ocupado = false; S.unidade = null;
      toast('Quadro posto no fim da unidade. Confira o bloco e ajuste a posição se quiser.');
      carregar();
      setTimeout(function(){
        var l = document.getElementById('ueBlocksList'); if(l) l.scrollTo({ top: l.scrollHeight, behavior: 'smooth' });
      }, 400);
    }catch(e){
      S.ocupado = false; pintar();
      toast('Não consegui pôr na unidade: ' + (e && e.message ? e.message : 'erro'), 'error');
    }
  }
  async function recusar(s){
    S.ocupado = true; pintar();
    try{ await marcar(s, 'recusada'); toast('Sugestão recusada.'); }
    catch(e){ toast('Não consegui recusar: ' + (e && e.message ? e.message : 'erro'), 'error'); }
    S.ocupado = false;
    carregar();
  }
  function aoClicar(e){
    var f = e.target.closest('[data-qs-filtro]');
    if(f){ var v = f.getAttribute('data-qs-filtro'); if(v !== S.filtro){ S.filtro = v; S.sel = null; S.unidade = null; carregar(); } return; }
    var it = e.target.closest('[data-qs-sel]');
    if(it){ var id = Number(it.getAttribute('data-qs-sel')); if(id !== S.sel){ S.sel = id; S.unidade = null; pintar(); } return; }
    var a = e.target.closest('[data-qs-acao]'); if(!a || S.ocupado) return;
    var s = S.lista.find(function(x){ return x.id === S.sel; }); if(!s) return;
    if(a.getAttribute('data-qs-acao') === 'por') porNaUnidade(s);
    else if(a.getAttribute('data-qs-acao') === 'recusar') recusar(s);
  }
  function aoMudar(e){
    var u = e.target.closest('[data-qs-unidade]'); if(u) S.unidade = u.value;
  }

  // a página se monta a cada abertura da aba
  function montarPagina(el){
    if(!el) return;
    injetarCSS();
    if(S.el !== el){
      S.el = el;
      el.addEventListener('click', aoClicar);
      el.addEventListener('change', aoMudar);
    }
    carregar();
  }

  window.QuadrosSugeridos = { montarPagina: montarPagina, contar: contar };
})();
