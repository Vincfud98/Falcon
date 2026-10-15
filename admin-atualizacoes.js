/* Falcon · Admin · Agente de atualizações (SQL 79 + Edge Function "atualizacoes"), 14/10/2026.
   Página "Atualizações" (lista, detalhe, conversa e configuração do agente) e a coluna dentro do editor de unidades.
   O agente só sinaliza, sempre com fonte oficial. Quem muda a unidade é o admin.
   Script comum (sem módulo), carregado no fim do admin.html. Expõe window.Atualizacoes. */
(function(){
  'use strict';

  // ── Rótulos ──────────────────────────────────────────────────────────────
  var TIPOS = {
    dado_desatualizado: 'Dado desatualizado',
    erro_factual: 'Erro de fato',
    norma_nova: 'Lei ou norma nova',
    jurisprudencia_nova: 'Jurisprudência nova',
    fato_novo: 'Fato novo para complementar'
  };
  var TIPOS_ORDEM = ['dado_desatualizado', 'erro_factual', 'norma_nova', 'jurisprudencia_nova', 'fato_novo'];
  var GRAV = {
    alta: { rotulo: 'Alta', classe: 'chip-error' },
    media: { rotulo: 'Média', classe: 'chip-warn' },
    baixa: { rotulo: 'Baixa', classe: '' }
  };
  var ORDEM_GRAV = { alta: 0, media: 1, baixa: 2 };
  var MOTIVOS = [
    { k: 'fonte_nao_oficial', letra: 'A', rotulo: 'Fonte não oficial', desc: 'Notícia, blog ou opinião. O agente passa a ignorar fontes assim.' },
    { k: 'nao_muda', letra: 'B', rotulo: 'Não muda o conteúdo', desc: 'O dado novo não altera o que a unidade ensina.' },
    { k: 'fora_edital', letra: 'C', rotulo: 'Fora do edital', desc: 'O ponto não é cobrado no edital vigente.' },
    { k: 'ja_atualizado', letra: 'D', rotulo: 'Já está atualizado', desc: 'A unidade já traz a informação certa.' },
    { k: 'outro', letra: 'E', rotulo: 'Outro motivo', desc: 'Explique em uma frase no campo abaixo.' }
  ];
  var FREQ = { semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal' };
  var PRIO = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
  var DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  var QUEM = { pedagogico: 'Admins do Pedagógico', superadmin: 'Só o superadmin', materia: 'Admins de cada matéria' };
  var SITS = [['aberto', 'Abertos'], ['resolvido', 'Resolvidos'], ['descartado', 'Descartados']];
  var SUGESTOES = ['A fonte é a mais recente?', 'Versão mais curta', 'Isso cai na prova?'];
  var CONF_SIT = {
    confere: { rotulo: 'Confere', classe: 'chip-success' },
    alerta: { rotulo: 'Virou alerta', classe: 'chip-warn' },
    sem_fonte: { rotulo: 'Sem fonte oficial', classe: '' },
    recusado: { rotulo: 'Recusado', classe: '' }
  };
  var EM_CURSO = { fila: 1, lendo: 1, conferindo: 1 };
  var CUSTO_USD = [0.6, 1.6];                         // análise manual no Opus, por unidade
  var MSG_PERMISSAO = 'Só o admin do Pedagógico de todas as matérias muda isto.';
  var COLS_AN = 'id, unit_id, subject_id, origem, modelo, status, etapa, atividade, alertas_novos, custo_usd, erro, conferidos, uso, pedido_por, criado_em, terminado_em';
  var NOVO_TXT = 'Novo, da análise agora';
  // Como o servidor conferiu a fonte. 'busca' (fonte complementar) fica sem selo.
  var SELOS = { lida: 'Trecho conferido na página', citada: 'Trecho conferido na busca oficial', pdf: 'Documento oficial aberto' };

  // Ícones de traço (stroke currentColor), como os da maquete.
  var IC = {
    ajustes: '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
    lupa: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>',
    lapis: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    certo: '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="5 12 10 17 19 7"/></svg>',
    enviar: '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="4" y1="12" x2="20" y2="12"/><polyline points="14 6 20 12 14 18"/></svg>',
    fechar: '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    info: '<svg class="alert-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8"/></svg>',
    aviso: '<svg class="alert-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 20h20z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17"/></svg>',
    ok: '<svg class="alert-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/></svg>',
    voltar: '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 6 9 12 15 18"/></svg>',
    mais: '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    reabrir: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 9 8 9"/></svg>',
    salvar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11l3 3v13H5z"/><rect x="8" y="13" width="8" height="7"/><line x1="8" y1="4" x2="8" y2="8"/></svg>'
  };

  // ── Estado ───────────────────────────────────────────────────────────────
  var S = {                       // página Atualizações
    el: null, root: null, carga: null, dados: null, erro: null,
    vista: 'lista',
    sit: 'aberto', mat: 'todas', grav: '', tipo: '', sel: null,
    acao: null, motivo: null, obs: '', nota: '', ocupado: false,
    seletor: null, aprendeu: null, foco: null, rolarDetalhe: false,
    cfg: null
  };
  var ED = null;                  // coluna do editor: { unit, alertas, expandido, acao, motivo, obs, nota, ocupado, ... }
  var PEND = null;                // "ir para o trecho" esperando o editor desenhar a seção certa
  var AN = { linhas: {}, seguindo: {}, vistas: {}, minhas: {}, cancelando: {}, timer: null, sondando: false, falhas: 0, recarga: null };
  var NOVOS = {};                 // alerta_id → true: nasceu de uma análise que terminou nesta sessão
  var MSGS = {};                  // chave (alerta_id ou 'u:'+unit_id) → mensagens
  var CONV = {};                  // chave → { texto } enquanto o agente responde
  var RASC = {};                  // chave → rascunho do campo da conversa
  var CONF_ABERTO = {};           // lista de pontos conferidos aberta (por análise e lugar)
  var CACHE = { painel: null, subjects: null, materias: null, unidades: {}, unidadeMateria: {}, usuarios: {}, me: null };

  // ── Utilidades ───────────────────────────────────────────────────────────
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sb(){ if(!window._sb) throw new Error('Sem conexão com o banco.'); return window._sb; }
  function ia(){ return sb().schema('ia'); }
  function conteudo(){ return sb().schema('conteudo'); }
  function toast(msg, tipo){ if(typeof window.ueToast === 'function') window.ueToast(msg, tipo || 'success'); else if(window.console) console.log('[Atualizações] ' + msg); }
  function ponte(){ return window.ueAtuPonte || null; }
  function igual(a, b){ return a != null && b != null && String(a) === String(b); }
  function unicos(lista){ var v = {}, out = []; lista.forEach(function(x){ if(x == null || x === '') return; var k = String(x); if(!v[k]){ v[k] = 1; out.push(x); } }); return out; }
  function tempo(iso){ var t = iso ? new Date(iso).getTime() : 0; return isNaN(t) ? 0 : t; }
  function ordemGrav(g){ return Object.prototype.hasOwnProperty.call(ORDEM_GRAV, g) ? ORDEM_GRAV[g] : 9; }
  function erroMsg(e){ return (e && e.message) ? e.message : String(e || 'Erro sem detalhe.'); }

  function dataBR(iso){
    if(!iso) return '';
    var d = new Date(iso);
    if(isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function dataCurta(iso){
    if(!iso) return '';
    var d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('pt-BR');
  }
  function dataFonte(v){
    if(!v) return '';
    return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? dataBR(String(v).length === 10 ? v + 'T12:00:00' : v) : String(v);
  }
  function haQuanto(iso){
    var t = tempo(iso); if(!t) return '';
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var dia = new Date(t); dia.setHours(0, 0, 0, 0);
    var d = Math.round((hoje - dia) / 864e5);
    if(d <= 0) return 'hoje';
    if(d === 1) return 'ontem';
    if(d < 7) return 'há ' + d + ' dias';
    if(d < 30){ var s = Math.floor(d / 7); return s === 1 ? 'há 1 semana' : 'há ' + s + ' semanas'; }
    if(d < 365){ var m = Math.floor(d / 30); return m === 1 ? 'há 1 mês' : 'há ' + m + ' meses'; }
    var a = Math.floor(d / 365); return a === 1 ? 'há 1 ano' : 'há ' + a + ' anos';
  }
  function numUnidade(n){ if(n == null) return ''; var s = String(n).trim(); return /^\d$/.test(s) ? '0' + s : s; }
  function brl(v){ return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function cambio(){ var p = CACHE.painel; return p && Number(p.usd_brl) > 0 ? Number(p.usd_brl) : null; }
  function usdEmReais(usd){ var c = cambio(); return c == null ? '' : brl(Number(usd || 0) * c); }
  function estimativa(){
    var c = cambio(); if(c == null) return '';
    return 'Custo estimado: ' + brl(CUSTO_USD[0] * c) + ' a ' + brl(CUSTO_USD[1] * c) + '.';
  }
  function plural(n, um, varios){ return n === 1 ? '1 ' + um : n + ' ' + varios; }
  function linkSeguro(url){ var s = String(url || '').trim(); return /^https?:\/\//i.test(s) ? s : ''; }
  function urlCapa(u){
    if(!u) return '';
    var s = String(u).trim();
    try { if(window.LearningBlocks && typeof window.LearningBlocks.driveImageUrl === 'function') s = window.LearningBlocks.driveImageUrl(s) || s; } catch(_){}
    if(!/^(https?:\/\/|data:image\/)/i.test(s)) return '';
    return s.replace(/["'()\\\s]/g, function(c){ return '%' + ('0' + c.charCodeAt(0).toString(16)).slice(-2).toUpperCase(); });
  }

  // ── Texto da unidade: tirar HTML e comparar palavras ─────────────────────
  var PARADAS = {};
  ('das dos nos nas uma uns umas que por para com sem aos como mais menos foi era ser sao sua seu suas seus entre sobre ate desde ' +
   'pelo pela pelos pelas este esta estes estas esse essa esses essas isso isto aquele aquela tambem nao ela ele elas eles mas tem ter ' +
   'num numa ja quando onde qual quais cada muito muita outro outra outros outras foram sera seja sao the and')
    .split(' ').forEach(function(w){ PARADAS[w] = 1; });

  function semTags(html){
    if(html == null) return '';
    // tag de bloco vira espaço; tag de linha (em, strong, a, span...) some sem deixar espaço antes da vírgula
    var t = String(html)
      .replace(/<\s*\/?\s*(p|div|br|li|ul|ol|h[1-6]|tr|td|th|table|thead|tbody|blockquote|section|article|figure|figcaption|hr|dt|dd)\b[^>]*>/gi, ' ')
      .replace(/<[^>]*>/g, '');
    if(t.indexOf('&') >= 0){
      try { t = new DOMParser().parseFromString(t, 'text/html').documentElement.textContent || ''; } catch(_){}
    }
    return t.replace(/\s+/g, ' ').trim();
  }
  function palavras(txt){
    var s = semTags(txt).toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch(_){}
    var out = {};
    s.split(/[^a-z0-9]+/).forEach(function(w){
      if(!w) return;
      if(/^\d+$/.test(w) ? w.length < 2 : w.length < 3) return;
      if(PARADAS[w]) return;
      out[w] = 1;
    });
    return out;
  }
  function emComum(a, b){ var n = 0; for(var k in a){ if(b[k]) n++; } return n; }
  function lerConteudo(b){
    var c = b ? b.content : null;
    if(typeof c === 'string'){ try { c = JSON.parse(c); } catch(_){ c = null; } }
    return c && typeof c === 'object' ? c : {};
  }
  function paragrafos(b){
    var c = lerConteudo(b);
    var ps = Array.isArray(c.paragraphs) ? c.paragraphs : [];
    return ps.map(function(p, i){ p = p || {}; return { indice: i, id: p.id != null ? String(p.id) : '', texto: semTags(p.content || '') }; });
  }
  // O parágrafo certo é o que tem mais palavras em comum com o trecho (e o parágrafo inteiro da época da análise).
  // paragrafo_id e o índice só desempatam, porque o índice muda quando o admin mexe.
  function acharParagrafo(ps, a){
    if(!ps.length) return null;
    var ref = palavras((a.trecho_atual || '') + ' ' + (a.contexto || ''));
    var nRef = Object.keys(ref).length;
    var pid = a.paragrafo_id != null ? String(a.paragrafo_id) : '';
    function bateId(p){ return pid && (p.id === pid || ('p' + (p.indice + 1)) === pid) ? 1 : 0; }
    var melhor = null;
    ps.forEach(function(p){
      var sc = emComum(palavras(p.texto), ref), idOk = bateId(p);
      if(!melhor || sc > melhor.sc || (sc === melhor.sc && idOk > melhor.idOk)) melhor = { p: p, sc: sc, idOk: idOk };
    });
    var minimo = Math.min(3, Math.max(1, Math.ceil(nRef * 0.2)));
    if(melhor.sc >= minimo) return melhor.p;
    var porId = ps.filter(function(p){ return p.id && p.id === pid; })[0] || ps.filter(bateId)[0];
    return porId || null;
  }
  var CHAVES_FORA = { id: 1, type: 1, url: 1, src: 1, href: 1, link: 1, image: 1, image_url: 1, img: 1, cover: 1, cover_url: 1,
    video: 1, video_url: 1, embed: 1, thumbnail: 1, poster: 1, file: 1, file_url: 1, path: 1, color: 1, icon: 1, style: 1,
    layout: 1, variant: 1, align: 1, width: 1, height: 1 };
  function textoDoBloco(b){
    var partes = [];
    (function anda(v, chave){
      if(v == null) return;
      if(typeof v === 'string'){
        if(chave && CHAVES_FORA[chave]) return;
        var s = v.trim();
        if(!s || /^(https?:|data:|www\.)/i.test(s)) return;
        partes.push(semTags(s));
        return;
      }
      if(Array.isArray(v)){ v.forEach(function(x){ anda(x, chave); }); return; }
      if(typeof v === 'object') Object.keys(v).forEach(function(k){ anda(v[k], k); });
    })(lerConteudo(b), null);
    var t = partes.join(' ').replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim();
    return t ? t.slice(0, 2000) : null;
  }
  function textoDoAlvo(b, a){
    if(!b) return null;
    if(b.type === 'text'){
      var p = acharParagrafo(paragrafos(b), a);
      if(p) return p.texto ? p.texto.slice(0, 6000) : null;
    }
    return textoDoBloco(b);
  }
  // Onde o alerta está agora na unidade aberta no editor: bloco, parágrafo e seção.
  function localizar(a, blocos, buscarFora){
    blocos = blocos || [];
    var bloco = a.bloco_id != null ? blocos.filter(function(b){ return igual(b.id, a.bloco_id); })[0] : null;
    if(bloco){
      var p = bloco.type === 'text' ? acharParagrafo(paragrafos(bloco), a) : null;
      return { bloco: bloco, indice: p ? p.indice : null, secao_id: bloco.section_id != null ? bloco.section_id : a.secao_id };
    }
    if(buscarFora){
      // o bloco sumiu (dividido, juntado ou recriado): procura o parágrafo pelo texto nos blocos de texto
      var achado = null;
      blocos.forEach(function(b){
        if(b.type !== 'text') return;
        var ps = paragrafos(b), ref = palavras((a.trecho_atual || '') + ' ' + (a.contexto || ''));
        ps.forEach(function(p){
          var sc = emComum(palavras(p.texto), ref);
          if(sc >= 4 && (!achado || sc > achado.sc)) achado = { bloco: b, indice: p.indice, secao_id: b.section_id, sc: sc };
        });
      });
      if(achado) return achado;
    }
    return { bloco: null, indice: null, secao_id: a.secao_id };
  }

  // ── Banco ────────────────────────────────────────────────────────────────
  async function dados(builder){ var r = await builder; if(r.error) throw new Error(r.error.message); return r.data; }
  async function todas(fazer){
    var out = [], de = 0, passo = 1000;
    for(;;){
      var r = await fazer().range(de, de + passo - 1);
      if(r.error) throw new Error(r.error.message);
      var d = r.data || [];
      out = out.concat(d);
      if(d.length < passo) break;
      de += passo;
    }
    return out;
  }
  async function emLotes(ids, fazer){
    var out = [];
    for(var i = 0; i < ids.length; i += 150){
      var r = await fazer(ids.slice(i, i + 150));
      if(r.error) throw new Error(r.error.message);
      out = out.concat(r.data || []);
    }
    return out;
  }
  async function rpcOk(nome, args){
    var r = await ia().rpc(nome, args || {});
    if(r.error) throw new Error(r.error.message);
    var d = r.data;
    if(d && d.ok === false) throw new Error(d.erro || 'Não deu certo.');
    return d || {};
  }
  async function chamarEF(body){
    var r;
    try { r = await sb().functions.invoke('atualizacoes', { body: body }); }
    catch(e){ throw new Error('Não consegui falar com o agente. Confira a internet e tente de novo.'); }
    if(r.error){
      var msg = null;
      try {
        if(r.error.context && typeof r.error.context.json === 'function'){
          var j = await r.error.context.json();
          msg = j && (j.error || j.erro);
        }
      } catch(_){}
      throw new Error(msg || r.error.message || 'O agente não respondeu.');
    }
    var d = r.data;
    if(typeof d === 'string'){ try { d = JSON.parse(d); } catch(_){} }
    if(!d || typeof d !== 'object' || d.error || d.ok === false) throw new Error((d && (d.error || d.erro)) || 'O agente não respondeu.');
    return d;
  }

  async function lerMe(){
    if(CACHE.me) return CACHE.me;
    try {
      var r = await sb().auth.getSession();
      var s = r && r.data && r.data.session;
      CACHE.me = s && s.user ? s.user.id : null;
    } catch(_){}
    return CACHE.me;
  }
  async function lerPainel(){
    var r = await ia().rpc('atu_painel');
    if(r.error) throw new Error(r.error.message);
    var d = r.data;
    if(!d || d.erro) throw new Error(d && d.erro === 'sem permissão' ? 'Esta página é do Pedagógico. Sua conta não tem essa área.' : 'O painel do agente não respondeu.');
    CACHE.painel = d;
    return d;
  }
  async function lerMaterias(){
    var r = await Promise.all([
      conteudo().from('subjects').select('id, subject, sigla, position'),
      ia().from('atu_materias').select('*')
    ]);
    if(r[0].error) throw new Error(r[0].error.message);
    if(r[1].error) throw new Error(r[1].error.message);
    var nomes = {}, mats = {};
    (r[0].data || []).forEach(function(s){ nomes[String(s.id)] = s; });
    (r[1].data || []).forEach(function(m){ mats[String(m.subject_id)] = m; });
    CACHE.subjects = nomes; CACHE.materias = mats;
  }
  async function unidadesDa(sid, forcar){
    var k = String(sid);
    if(!forcar && CACHE.unidades[k]) return CACHE.unidades[k];
    var lista = await dados(ia().rpc('atu_unidades', { p_subject: Number(sid) }));
    CACHE.unidades[k] = Array.isArray(lista) ? lista : [];
    CACHE.unidades[k].forEach(function(u){ CACHE.unidadeMateria[String(u.id)] = k; });
    return CACHE.unidades[k];
  }
  function infoUnidade(sid, uid){
    var l = CACHE.unidades[String(sid)] || [];
    for(var i = 0; i < l.length; i++){ if(igual(l[i].id, uid)) return l[i]; }
    return null;
  }
  async function lerUsuarios(ids){
    var falta = unicos(ids).filter(function(id){ return !Object.prototype.hasOwnProperty.call(CACHE.usuarios, id); });
    if(!falta.length) return;
    try {
      var rows = await emLotes(falta, function(ch){ return sb().schema('crm').from('app_users').select('id, full_name, nickname, email').in('id', ch); });
      rows.forEach(function(u){ CACHE.usuarios[u.id] = u.full_name || u.nickname || u.email || null; });
    } catch(_){}
    falta.forEach(function(id){ if(!Object.prototype.hasOwnProperty.call(CACHE.usuarios, id)) CACHE.usuarios[id] = null; });
  }
  function nomeUsuario(id, padrao){
    if(id && igual(id, CACHE.me)) return 'você';
    return (id && CACHE.usuarios[id]) || padrao || 'um admin';
  }
  function visiveis(){
    var ids;
    if(CACHE.painel && Array.isArray(CACHE.painel.por_materia)) ids = CACHE.painel.por_materia.map(function(x){ return String(x.subject_id); });
    else ids = Object.keys(CACHE.materias || {});
    var subs = CACHE.subjects || {};
    return ids.slice().sort(function(a, b){
      var sa = subs[a] || {}, sb2 = subs[b] || {};
      var pa = sa.position == null ? 9999 : sa.position, pb = sb2.position == null ? 9999 : sb2.position;
      if(pa !== pb) return pa - pb;
      return String(sa.subject || '').localeCompare(String(sb2.subject || ''), 'pt-BR');
    });
  }
  function nomeMateria(sid){
    var s = CACHE.subjects && CACHE.subjects[String(sid)];
    return s ? (s.subject || s.sigla || 'Matéria') : 'Matéria';
  }
  function porMateria(sid){
    var l = (CACHE.painel && CACHE.painel.por_materia) || [];
    for(var i = 0; i < l.length; i++){ if(igual(l[i].subject_id, sid)) return l[i]; }
    return null;
  }

  // Mensagens: uma lista por alerta e uma por unidade (alerta_id nulo).
  function chaveMsg(m){ return m.alerta_id ? String(m.alerta_id) : 'u:' + m.unit_id; }
  function ordenarMsgs(k){ MSGS[k].sort(function(a, b){ return tempo(a.criado_em) - tempo(b.criado_em); }); }
  function trocarMsgs(rows, chaves){
    (chaves || []).forEach(function(k){ MSGS[k] = []; });
    rows.forEach(function(m){ var k = chaveMsg(m); if(!MSGS[k]) MSGS[k] = []; MSGS[k].push(m); });
    Object.keys(MSGS).forEach(ordenarMsgs);
  }
  function juntarMsgs(rows){
    rows.forEach(function(m){
      if(!m) return;
      var k = chaveMsg(m); if(!MSGS[k]) MSGS[k] = [];
      if(!MSGS[k].some(function(x){ return igual(x.id, m.id); })) MSGS[k].push(m);
      ordenarMsgs(k);
    });
  }

  // ── CSS (injetado uma vez, tudo em .atu ou com prefixo atu-) ─────────────
  var CSS = [
    '.atu{--atu-red:var(--error);color:var(--text);font-family:var(--sans);font-weight:300;min-width:0}',
    'html[data-theme="light"] .atu{--atu-red:var(--red)}',
    '.atu *,.atu *::before,.atu *::after{box-sizing:border-box}',
    '.atu p{margin:0}',
    '.atu svg{stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}',
    '.atu .btn svg{width:13px;height:13px}',
    '.atu .btn-icon svg{width:14px;height:14px}',
    '.atu .card:hover{transform:none}',
    '.atu .card-foot{flex-wrap:wrap}',
    '.atu .sub-h{margin:0}',
    '.atu .sub-h-text{white-space:normal;flex-shrink:1;min-width:0}',
    '.atu .s-label{margin-bottom:.6rem}',
    '.atu .s-body{font-family:var(--sans);font-weight:200;font-size:var(--fs-body);line-height:1.85;color:var(--text-dim);max-width:680px;margin-top:.8rem}',
    '.atu .t-h3{font-family:var(--serif);font-weight:400;font-size:clamp(1.25rem,1.8vw,1.85rem);line-height:1.2;color:var(--text);letter-spacing:-.005em;margin:0}',
    '.atu .t-mono{font-family:var(--mono);font-weight:400;font-size:.72rem;color:var(--accent)}',
    '.atu .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}',
    /* chips e selos */
    '.atu .chip{display:inline-flex;align-items:center;gap:.45rem;padding:.32rem .72rem;border:1px solid var(--accent-border-soft);border-radius:2px;font-family:var(--sans);font-weight:300;font-size:.64rem;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);background:var(--accent-xlo);white-space:nowrap;line-height:1.25;max-width:100%}',
    '.atu .chip-accent{color:var(--accent);border-color:var(--accent-border)}',
    '.atu .chip-success{color:var(--green);border-color:var(--green-border);background:var(--green-lo)}',
    '.atu .chip-warn{color:var(--amber);border-color:var(--amber-border);background:var(--amber-lo)}',
    '.atu .chip-error{color:var(--atu-red);border-color:var(--red-border);background:var(--red-lo)}',
    '.atu .chip .dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}',
    '.atu .chip svg{width:11px;height:11px}',
    '.atu .chip-btn{cursor:pointer;transition:all .3s var(--ease)}',
    '.atu .chip-btn:hover{color:var(--accent);border-color:var(--accent-border)}',
    '.atu .chip-btn:disabled{opacity:.45;cursor:not-allowed}',
    '.atu .atu-chip-solta{white-space:normal;text-align:left}',
    '.atu .atu-chip-x{display:inline-grid;place-items:center;margin-left:.1rem;padding:0 0 0 .45rem;border:0;border-left:1px solid currentColor;background:none;color:inherit;cursor:pointer;opacity:.7;line-height:1}',
    '.atu .atu-chip-x:hover{opacity:1}',
    '.atu .atu-chip-x svg{width:10px;height:10px}',
    '.atu .badge{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 .4rem;border:0;border-radius:999px;background:var(--accent);color:var(--bg);font-family:var(--mono);font-weight:500;font-size:.62rem;letter-spacing:.04em;text-transform:none}',
    /* campos */
    '.atu .label{display:inline-block;font-family:var(--sans);font-weight:300;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin:0}',
    '.atu .atu-campo{display:flex;flex-direction:column;gap:.45rem;min-width:0}',
    '.atu .field-help{font-family:var(--sans);font-weight:300;font-size:.72rem;color:var(--text-dim);line-height:1.5}',
    '.atu .atu-erro-txt{color:var(--atu-red)}',
    '.atu .input,.atu .select{width:100%;background:transparent;border:1px solid var(--accent-border-soft);border-radius:var(--radius);padding:.8rem 1rem;font-family:var(--sans);font-weight:300;font-size:.92rem;color:var(--text);transition:border-color .3s var(--ease),background .3s var(--ease);margin:0}',
    '.atu .input::placeholder{color:var(--text-mute);font-weight:200}',
    '.atu .input:focus,.atu .select:focus{outline:none;border-color:var(--accent);background:var(--accent-xlo)}',
    '.atu .input:disabled,.atu .select:disabled{opacity:.5;cursor:not-allowed}',
    '.atu .input-sm{padding:.5rem .7rem;font-size:.82rem}',
    '.atu .select{appearance:none;-webkit-appearance:none;-moz-appearance:none;padding-right:2.4rem;cursor:pointer}',
    '.atu .select-sm{padding:.5rem 2.2rem .5rem .8rem;font-size:.82rem}',
    '.atu .atu-sel{position:relative;display:block;min-width:0}',
    '.atu .atu-sel-auto{display:inline-block;width:auto}',
    '.atu .atu-sel::after{content:"";position:absolute;right:1rem;top:50%;width:6px;height:6px;border-right:1.5px solid var(--accent);border-bottom:1.5px solid var(--accent);transform:translateY(-75%) rotate(45deg);pointer-events:none}',
    '.atu .atu-sel-sm::after{right:.85rem}',
    /* abas de situação e filtros (não usam .tab/.tabs do admin) */
    '.atu .atu-tabs{display:flex;gap:.3rem;border-bottom:1px solid var(--accent-border-soft);flex-wrap:wrap}',
    '.atu .atu-tab{position:relative;padding:.8rem 1.1rem;background:transparent;border:none;cursor:pointer;font-family:var(--sans);font-weight:300;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--text-dim);transition:color .3s var(--ease)}',
    '.atu .atu-tab:hover,.atu .atu-tab.is-active{color:var(--accent)}',
    '.atu .atu-tab.is-active::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1px;background:var(--accent)}',
    '.atu .filter-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.48rem .85rem;border-radius:var(--radius);background:transparent;border:1px solid var(--accent-border-soft);font-family:var(--sans);font-weight:300;font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:var(--text-dim);cursor:pointer;transition:all .3s var(--ease)}',
    '.atu .filter-btn:hover{color:var(--accent);border-color:var(--accent-border)}',
    '.atu .filter-btn.is-active{color:var(--accent);border-color:var(--accent);background:var(--accent-lo)}',
    '.atu .atu-n{font-family:var(--mono);font-weight:500;font-size:.62rem;letter-spacing:0;padding:.1rem .35rem;border-radius:2px;background:var(--accent);color:var(--bg);margin-left:.2rem}',
    /* caixa de decisão */
    '.atu .decide{background:var(--surface-sunken);border:1px solid var(--accent-border-soft);border-radius:var(--radius-lg);padding:1.3rem 1.5rem;display:flex;flex-direction:column;gap:1rem}',
    '.atu .decide-head{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:.4rem 1rem;padding-bottom:.9rem;border-bottom:1px solid var(--accent-border-soft)}',
    '.atu .decide-title{font-family:var(--serif);font-weight:400;font-size:1.2rem;color:var(--text)}',
    '.atu .decide-hint{font-family:var(--sans);font-weight:300;font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:var(--text-dim)}',
    '.atu .decide-options{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.atu .atu-decide-sm{padding:1rem;gap:.8rem}',
    '.atu .atu-decide-sm .decide-options{grid-template-columns:1fr}',
    '.atu .atu-decide-sm .decide-option{padding:.6rem .75rem;gap:.7rem}',
    '.atu .atu-decide-sm .decide-title{font-size:1.05rem}',
    '.atu .atu-decide-sm .decide-option-desc{font-size:.72rem}',
    /* avisos */
    '.atu .alert{display:flex;gap:.9rem;align-items:flex-start;padding:1rem 1.2rem;border-radius:var(--radius);border:1px solid var(--accent-border);background:var(--accent-xlo);font-size:.88rem;line-height:1.6;color:var(--text)}',
    '.atu .alert-icon{width:20px;height:20px;margin-top:1px;stroke-width:1.7;color:var(--accent)}',
    '.atu .alert-body{flex:1;display:flex;flex-direction:column;gap:.25rem;min-width:0}',
    '.atu .alert-title{font-family:var(--serif);font-weight:500;font-size:1rem;color:var(--text);line-height:1.3}',
    '.atu .alert-text{color:var(--text-dim);white-space:pre-line;overflow-wrap:anywhere}',
    '.atu .alert-info .alert-title{color:var(--accent)}',
    '.atu .alert-warn{border-color:var(--amber-border);background:var(--amber-lo)}',
    '.atu .alert-warn .alert-icon,.atu .alert-warn .alert-title{color:var(--amber)}',
    '.atu .alert-erro{border-color:var(--red-border);background:var(--red-lo)}',
    '.atu .alert-erro .alert-icon,.atu .alert-erro .alert-title{color:var(--atu-red)}',
    '.atu .alert-ok{border-color:var(--green-border);background:var(--green-lo)}',
    '.atu .alert-ok .alert-icon,.atu .alert-ok .alert-title{color:var(--green)}',
    '.atu .atu-alert-x{margin-left:auto}',
    /* tabela */
    '.atu .tbl-wrap{background:var(--bg-card);border:1px solid var(--accent-border-soft);border-radius:var(--radius-lg);overflow:hidden}',
    '.atu .tbl-scroll{overflow-x:auto}',
    '.atu .tbl{width:100%;border-collapse:collapse;font-family:var(--sans);font-weight:300;font-size:.88rem}',
    '.atu .tbl thead th{text-align:left;padding:.85rem 1.1rem;font-weight:400;font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);border-bottom:1px solid var(--accent-border);background:var(--bg-elev);white-space:nowrap}',
    '.atu .tbl tbody td{padding:.85rem 1.1rem;color:var(--text);border-bottom:1px solid var(--accent-border-soft);vertical-align:middle}',
    '.atu .tbl tbody tr:hover{background:var(--accent-xlo)}',
    '.atu .tbl tbody tr:last-child td{border-bottom:none}',
    '.atu .tbl tbody tr.is-off td{color:var(--text-dim)}',
    '.atu .tbl tbody tr.is-off .col-name{opacity:.6}',
    '.atu .tbl .col-num{font-family:var(--mono);color:var(--text-dim);font-size:.78rem;white-space:nowrap}',
    '.atu .tbl .col-name{font-family:var(--serif);font-weight:400;font-size:1rem;color:var(--text)}',
    '.atu .tbl-foot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:.9rem 1.1rem;gap:1rem;border-top:1px solid var(--accent-border-soft);background:var(--bg-elev);font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim)}',
    '.atu .tbl .atu-sel-sm{min-width:8.6rem}',
    '.atu .tbl td.atu-td-fontes{min-width:250px}',
    '@media (max-width:760px){',
    '.atu .tbl-resp thead{display:none}',
    '.atu .tbl-resp,.atu .tbl-resp tbody{display:block}',
    '.atu .tbl-resp tbody tr{display:flex;flex-direction:column;gap:.6rem;padding:1rem 1.1rem;border-bottom:1px solid var(--accent-border-soft)}',
    '.atu .tbl-resp tbody tr:last-child{border-bottom:none}',
    '.atu .tbl-resp tbody td{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem .8rem;padding:0;border:0}',
    '.atu .tbl-resp tbody td[data-rotulo]::before{content:attr(data-rotulo);font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);flex:none}',
    '.atu .tbl-resp tbody td.atu-td-fontes{flex-direction:column;align-items:flex-start;min-width:0}',
    '}',
    /* avatar, progresso, vazio, espera */
    '.atu .avatar{width:28px;height:28px;border-radius:50%;background:var(--accent-lo);border:1px solid var(--accent-border);display:grid;place-items:center;font-family:var(--serif);font-weight:400;font-size:.78rem;color:var(--accent);flex-shrink:0}',
    '.atu .prog{width:100%;height:2px;background:var(--accent-border-soft);border-radius:999px;overflow:hidden}',
    '.atu .prog-bar{height:100%;background:var(--accent);border-radius:999px}',
    '.atu .prog-bar.is-over{background:var(--atu-red)}',
    '.atu .empty{text-align:center;padding:2.4rem 1.6rem;border:1px dashed var(--accent-border-soft);border-radius:var(--radius-lg);display:flex;flex-direction:column;align-items:center;gap:.8rem}',
    '.atu .empty-title{font-family:var(--serif);font-weight:400;font-size:1.25rem;color:var(--text)}',
    '.atu .empty-body{font-family:var(--sans);font-weight:200;font-size:.88rem;color:var(--text-dim);line-height:1.7;max-width:42ch}',
    '.atu .spinner{width:16px;height:16px;border-radius:50%;border:1.5px solid var(--accent-border-soft);border-top-color:var(--accent);animation:atu-gira .9s linear infinite;flex:none}',
    '@keyframes atu-gira{to{transform:rotate(360deg)}}',
    '.atu .atu-carregando{display:flex;align-items:center;gap:.7rem;padding:1.4rem 0;color:var(--text-dim);font-size:.88rem}',
    '.atu .atu-pontos{display:inline-flex;gap:4px;align-items:center;margin-right:.5rem}',
    '.atu .atu-pontos i{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:atu-ponto 1.2s infinite ease-in-out}',
    '.atu .atu-pontos i:nth-child(2){animation-delay:.15s}',
    '.atu .atu-pontos i:nth-child(3){animation-delay:.3s}',
    '@keyframes atu-ponto{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}',
    '.atu .atu-pensando{display:inline-flex;align-items:center;color:var(--text-dim)}',
    /* peças da maquete */
    '.atu .alerta-item{display:flex;gap:.9rem;align-items:flex-start;width:100%;text-align:left;padding:.9rem 1rem;cursor:pointer;color:inherit;font:inherit;background:var(--bg-card);border:1px solid var(--accent-border-soft);border-radius:var(--radius-lg);transition:border-color .3s var(--ease),background .3s var(--ease)}',
    '.atu .alerta-item:hover{border-color:var(--accent-border)}',
    '.atu .alerta-item.is-selected{border-color:var(--accent);background:var(--bg-elev)}',
    '.atu .atu-item-txt{display:flex;flex-direction:column;gap:.4rem;min-width:0}',
    '.atu .atu-item-tit{font-size:.92rem;line-height:1.45;color:var(--text);overflow-wrap:anywhere}',
    '.atu .atu-item-meta,.atu .atu-chips{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}',
    '.atu .capa{flex:none;display:flex;align-items:flex-end;background-color:var(--bg-elev);background-size:cover;background-position:center;border:1px solid var(--accent-border);border-radius:var(--radius);font-family:var(--serif);font-weight:300;color:var(--accent);line-height:1;overflow:hidden}',
    '.atu .capa-p{width:48px;height:56px;padding:.35rem .45rem;font-size:1.5rem}',
    '.atu .capa-g{width:92px;height:112px;padding:.6rem .7rem;font-size:2.6rem;flex-direction:column;align-items:flex-start;justify-content:space-between}',
    '.atu .capa-g .label{font-size:.55rem}',
    '.atu .trecho{font-family:var(--serif);font-weight:400;font-size:1.08rem;line-height:1.6;color:var(--text);padding:1rem 1.15rem;border-radius:var(--radius);overflow-wrap:anywhere;white-space:pre-line}',
    '.atu .trecho-atual{background:var(--red-lo);border:1px solid var(--red-border)}',
    '.atu .trecho-novo{background:var(--green-lo);border:1px solid var(--green-border)}',
    '.atu .trecho-depois{background:var(--surface-sunken);border:1px solid var(--accent-border-soft)}',
    '.atu .atu-trecho-sm{font-size:.98rem;padding:.7rem .85rem}',
    '.atu .fonte{display:flex;flex-direction:column;gap:.45rem;padding:.9rem 1.1rem;border-radius:var(--radius);background:var(--surface-sunken);border:1px solid var(--accent-border-soft);min-width:0}',
    '.atu .fonte a{color:var(--accent);text-decoration:underline;text-underline-offset:3px;font-size:.9rem;overflow-wrap:anywhere}',
    '.atu .fonte a:hover{text-decoration-thickness:2px}',
    '.atu .atu-fonte-topo{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.6rem;align-items:baseline}',
    '.atu .fonte-cita{font-family:var(--serif);font-style:italic;font-size:1rem;line-height:1.55;color:var(--text);overflow-wrap:anywhere}',
    '.atu .atu-fonte-sm{padding:.65rem .8rem;gap:.3rem}',
    '.atu .msg{display:flex;gap:.7rem;align-items:flex-start;max-width:88%}',
    '.atu .msg-eu{align-self:flex-end;flex-direction:row-reverse}',
    '.atu .msg-balao{display:flex;flex-direction:column;gap:.3rem;padding:.75rem .95rem;border-radius:var(--radius);font-size:.9rem;line-height:1.65;color:var(--text);min-width:0;overflow-wrap:anywhere}',
    '.atu .msg-agente .msg-balao{background:var(--surface-sunken);border:1px solid var(--accent-border-soft)}',
    '.atu .msg-eu .msg-balao{background:var(--accent-lo);border:1px solid var(--accent-border)}',
    '.atu .msg-outro .msg-balao{background:var(--accent-xlo);border:1px solid var(--accent-border-soft)}',
    '.atu .msg-quem{font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}',
    '.atu .atu-msg-txt{white-space:pre-wrap}',
    '.atu .atu-msg-txt strong{font-weight:500;color:var(--text)}',
    '.atu .atu-msg-fontes{display:flex;flex-direction:column;gap:.2rem;padding-top:.3rem;border-top:1px solid var(--accent-border-soft)}',
    '.atu .atu-msg-fontes a{color:var(--accent);font-size:.78rem;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}',
    '.atu .atu-link{background:none;border:0;padding:0;color:var(--accent);font:inherit;font-size:.74rem;text-decoration:underline;text-underline-offset:3px;cursor:pointer;text-align:left}',
    '.atu .atu-link:hover{text-decoration-thickness:2px}',
    /* página */
    '.atu-pagina{display:flex;flex-direction:column;gap:1.6rem;padding-bottom:2rem}',
    '.atu .atu-cab{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:1.2rem;padding-bottom:1.4rem;border-bottom:1px solid var(--accent-border-soft)}',
    '.atu .atu-cab-txt{display:flex;flex-direction:column;align-items:flex-start;max-width:760px;min-width:0}',
    '.atu .atu-cab-acoes,.atu .atu-botoes{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}',
    '.atu .atu-botoes-sm{gap:.4rem}',
    '.atu .atu-numeros{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:1rem}',
    '.atu .atu-metrica-sub{font-size:1.1rem;color:var(--text-dim)}',
    '.atu .atu-filtros{display:flex;flex-direction:column;gap:.9rem}',
    '.atu .atu-linha{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}',
    '.atu .atu-espaco{flex:1 1 auto}',
    '.atu .atu-corpo{display:flex;flex-wrap:wrap;gap:1.4rem;align-items:flex-start}',
    '.atu .atu-lista{flex:1 1 320px;min-width:0;display:flex;flex-direction:column;gap:.6rem}',
    '.atu .atu-detalhe{flex:2 1 540px;min-width:0;gap:1.4rem;padding:1.6rem 1.8rem}',
    '.atu .atu-det-topo{display:flex;gap:1.1rem;align-items:flex-start}',
    '.atu .atu-det-tit{display:flex;flex-direction:column;gap:.5rem;min-width:0}',
    '.atu .atu-trechos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:1rem}',
    '.atu .atu-bloco{display:flex;flex-direction:column;gap:.5rem;min-width:0}',
    '.atu .atu-mudou{font-size:.95rem;line-height:1.7;color:var(--text)}',
    '.atu .atu-conversa{display:flex;flex-direction:column;gap:.8rem;min-width:0}',
    '.atu .atu-envio{display:flex;gap:.5rem;align-items:stretch}',
    '.atu .atu-envio .input{flex:1;min-width:0}',
    '.atu .atu-envio .btn{flex:none}',
    '.atu .atu-an{gap:.7rem}',
    '.atu .atu-an-cab{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap}',
    '.atu .atu-an-etapa{font-size:.95rem;line-height:1.6;color:var(--text)}',
    '.atu .atu-an-ativ{font-family:var(--mono);font-size:.72rem;line-height:1.5;color:var(--text-dim);overflow-wrap:anywhere}',
    '.atu .atu-conf{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.55rem}',
    '.atu .atu-conf li{display:flex;flex-direction:column;align-items:flex-start;gap:.35rem;padding:.7rem .85rem;border:1px solid var(--accent-border-soft);border-radius:var(--radius);background:var(--surface-sunken)}',
    '.atu .atu-conf-trecho{font-family:var(--serif);font-size:.98rem;line-height:1.5;color:var(--text);overflow-wrap:anywhere}',
    '.atu .atu-seletor{gap:1rem}',
    '.atu .atu-topo-card{display:flex;justify-content:space-between;align-items:flex-start;gap:.8rem}',
    '.atu .atu-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:1rem 1.2rem}',
    '.atu .atu-unis{display:flex;flex-direction:column;max-height:300px;overflow-y:auto;border:1px solid var(--accent-border-soft);border-radius:var(--radius)}',
    '.atu .atu-uni{display:flex;align-items:center;flex-wrap:wrap;gap:.4rem .8rem;width:100%;text-align:left;padding:.65rem .85rem;background:transparent;border:0;border-bottom:1px solid var(--accent-border-soft);color:var(--text);font:inherit;font-size:.88rem;cursor:pointer}',
    '.atu .atu-uni:last-child{border-bottom:0}',
    '.atu .atu-uni:hover{background:var(--accent-xlo)}',
    '.atu .atu-uni.is-selected{background:var(--accent-lo);box-shadow:inset 2px 0 0 var(--accent)}',
    '.atu .atu-uni-num{font-family:var(--mono);font-size:.72rem;color:var(--accent);min-width:2.2rem}',
    '.atu .atu-uni-tit{flex:1 1 160px;min-width:0;overflow-wrap:anywhere}',
    /* configuração */
    '.atu .atu-toggles{display:flex;flex-wrap:wrap;gap:1rem 2rem;padding-top:.4rem}',
    '.atu .atu-fontes,.atu .atu-fonte-add{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center}',
    '.atu .atu-fonte-add .input{width:min(200px,100%)}',
    '.atu .atu-teto{width:110px}',
    '.atu .atu-regra{display:flex;flex-wrap:wrap;align-items:center;gap:.8rem;padding:.8rem 0;border-bottom:1px solid var(--accent-border-soft)}',
    '.atu .atu-regra:last-child{border-bottom:0}',
    '.atu .atu-regra-txt{flex:1 1 320px;display:flex;flex-direction:column;gap:.3rem;font-size:.92rem;line-height:1.6;min-width:0}',
    /* coluna no editor */
    '.atu-coluna{display:flex;flex-direction:column;gap:1.1rem;padding:1.4rem 1.3rem 1.8rem;min-height:100%;background:var(--bg-card)}',
    '.atu .atu-col-tit{display:block;font-family:var(--serif);font-size:1.35rem;line-height:1.2;color:var(--text);margin-top:.3rem}',
    '.atu .atu-col-analisar{display:flex;flex-direction:column;gap:.45rem}',
    '.atu .atu-aberto-card{cursor:default;flex-direction:column;gap:.7rem;padding:1rem 1.1rem}',
    '.atu .atu-item-col{padding:.8rem .9rem}',
    '.atu .atu-col-envio{margin-top:auto}',
    '.atu .atu-col-envio .btn{padding:.7rem .9rem}',
    /* parágrafo marcado no editor */
    '.atu-para-marcado{background:var(--amber-lo);box-shadow:0 0 0 1px var(--amber-border);border-radius:var(--radius);padding:.55rem .65rem}',
    '.atu-para-pisca{animation:atu-pisca 1.6s var(--ease) 1}',
    '@keyframes atu-pisca{0%{box-shadow:0 0 0 1px var(--amber-border)}35%{box-shadow:0 0 0 5px var(--amber-border)}100%{box-shadow:0 0 0 1px var(--amber-border)}}',
    '.atu.atu-para-aviso{display:flex;flex-wrap:wrap;gap:.4rem .7rem;align-items:center;margin:.3rem 0 .45rem}',
    /* botão do editor (#ueAtuBtn, criado no admin.html) e o seu contador */
    '#ueAtuBtn{position:relative}',
    '#ueAtuBtn[aria-pressed="true"]{background:var(--accent-lo);border-color:var(--accent);color:var(--accent)}',
    '.atu-badge{position:absolute;top:-7px;right:-7px;display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 .35rem;border-radius:999px;background:var(--accent);color:var(--bg);font-family:var(--mono);font-weight:500;font-size:.6rem;line-height:1;pointer-events:none}',
    '.atu-badge[hidden]{display:none}',
    '@media (max-width:640px){.atu .decide-options{grid-template-columns:1fr}.atu .atu-detalhe{padding:1.2rem 1.1rem;flex-basis:100%}.atu .atu-lista{flex-basis:100%}.atu .decide{padding:1rem}.atu .atu-det-topo{flex-direction:column}}',
    '@media (prefers-reduced-motion:reduce){.atu .spinner,.atu .atu-pontos i,.atu-para-pisca{animation:none}}'
  ].join('\n');

  function injetarCSS(){
    if(document.getElementById('atu-css')) return;
    var st = document.createElement('style');
    st.id = 'atu-css';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  // Repinta sem perder o campo em que o admin está digitando.
  function pintar(root, html){
    var ativo = document.activeElement, chave = null, ini = null, fim = null;
    if(ativo && root.contains(ativo) && ativo.getAttribute('data-atu-foco')){
      chave = ativo.getAttribute('data-atu-foco');
      try { ini = ativo.selectionStart; fim = ativo.selectionEnd; } catch(_){}
    }
    root.innerHTML = html;
    if(chave){
      var novo = root.querySelector('[data-atu-foco="' + chave.replace(/"/g, '') + '"]');
      if(novo && !novo.disabled){
        try { novo.focus({ preventScroll: true }); } catch(_){ novo.focus(); }
        try { if(ini != null) novo.setSelectionRange(ini, fim); } catch(_){}
      }
    }
  }

  // ── Peças de HTML compartilhadas ─────────────────────────────────────────
  function chipGrav(g, prefixo){
    var x = GRAV[g] || GRAV.baixa;
    return '<span class="chip ' + x.classe + '"><span class="dot"></span>' + esc((prefixo || '') + x.rotulo) + '</span>';
  }
  function chipNovo(a){ return NOVOS[a.id] ? '<span class="chip chip-accent">' + NOVO_TXT + '</span>' : ''; }
  function capaHtml(uni, tam){
    var num = uni ? numUnidade(uni.number) : '';
    var url = uni ? urlCapa(uni.cover_url) : '';
    var cls = 'capa ' + (tam === 'g' ? 'capa-g' : 'capa-p');
    if(url) return '<span class="' + cls + '" style="background-image:url(&quot;' + esc(url) + '&quot;)" role="img" aria-label="Capa da unidade"></span>';
    if(tam === 'g') return '<span class="' + cls + '" aria-hidden="true"><span class="label">Unidade</span>' + esc(num || '·') + '</span>';
    return '<span class="' + cls + '" aria-hidden="true">' + esc(num || '·') + '</span>';
  }
  function rotuloUnidade(uni){ var n = uni ? numUnidade(uni.number) : ''; return n ? 'Unidade ' + n : 'Unidade'; }
  function htmlFonte(f, compacta){
    f = f || {};
    var url = linkSeguro(f.url);
    var titulo = f.titulo || f.url || 'Fonte';
    var link = url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(titulo) + '</a>' : '<span>' + esc(titulo) + '</span>';
    var meta = [f.orgao, dataFonte(f.data)].filter(Boolean).join(' · ');
    if(compacta) return '<div class="fonte atu-fonte-sm">' + link + (meta ? '<span class="t-mono">' + esc(meta) + '</span>' : '') + '</div>';
    var cita = f.trecho ? String(f.trecho).trim() : '';
    if(cita && !/^["“]/.test(cita)) cita = '“' + cita + '”';
    var selo = SELOS[f.conferida] ? '<span class="chip chip-success">' + IC.certo + SELOS[f.conferida] + '</span>' : '';
    return '<div class="fonte"><span class="atu-fonte-topo">' + link + (meta ? '<span class="t-mono">' + esc(meta) + '</span>' : '') + '</span>' +
      (cita ? '<span class="fonte-cita">' + esc(cita) + '</span>' : '') +
      (selo ? '<span class="atu-chips">' + selo + '</span>' : '') + '</div>';
  }
  function formatarAgente(t){
    return esc(t).replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  }
  function htmlMsg(m){
    var agente = m.papel === 'agente';
    var eu = !agente && (!m.autor || igual(m.autor, CACHE.me));
    var quem = agente ? 'Agente de atualizações' : (eu ? 'Você' : nomeUsuario(m.autor, 'Admin'));
    var ini = agente ? 'A' : (eu ? 'V' : (String(quem).charAt(0).toUpperCase() || 'A'));
    var classe = 'msg ' + (agente ? 'msg-agente' : (eu ? 'msg-eu' : 'msg-outro'));
    var fontes = (Array.isArray(m.fontes) ? m.fontes : []).map(function(f){
      var url = linkSeguro(f && f.url); if(!url) return '';
      return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc((f.titulo || url)) + '</a>';
    }).filter(Boolean).join('');
    return '<div class="' + classe + '"><span class="avatar avatar-sm" aria-hidden="true">' + esc(ini) + '</span>' +
      '<span class="msg-balao"><span class="msg-quem">' + esc(quem) + '</span>' +
      '<span class="atu-msg-txt">' + (agente ? formatarAgente(m.texto) : esc(m.texto)) + '</span>' +
      (fontes ? '<span class="atu-msg-fontes">' + fontes + '</span>' : '') + '</span></div>';
  }
  // Conversa (página e coluna). chave = alerta_id ou 'u:'+unit_id.
  function htmlConversa(o){
    var k = o.chave, msgs = MSGS[k] || [], pend = CONV[k];
    var h = '<div class="atu-conversa" data-chave="' + esc(k) + '" data-unit="' + esc(o.unit) + '" data-alerta="' + esc(o.alerta || '') + '">' +
      '<div class="sub-h"><span class="sub-h-text">' + esc(o.titulo) + '</span><span class="sub-h-rule"></span></div>';
    if(o.ajuda) h += '<p class="field-help">' + esc(o.ajuda) + '</p>';
    if(!msgs.length && !pend && o.vazio) h += '<p class="field-help">' + esc(o.vazio) + '</p>';
    h += msgs.map(htmlMsg).join('');
    if(pend){
      h += htmlMsg({ papel: 'admin', autor: CACHE.me, texto: pend.texto }) +
        '<div class="msg msg-agente" role="status"><span class="avatar avatar-sm" aria-hidden="true">A</span><span class="msg-balao"><span class="msg-quem">Agente de atualizações</span>' +
        '<span class="atu-pensando"><span class="atu-pontos" aria-hidden="true"><i></i><i></i><i></i></span>O agente está conferindo...</span></span></div>';
    }
    if(o.sugestoes){
      h += '<div class="atu-linha">' + SUGESTOES.map(function(s, i){
        return '<button type="button" class="chip chip-btn" data-atu="sugestao" data-v="' + i + '"' + (pend ? ' disabled' : '') + '>' + esc(s) + '</button>';
      }).join('') + '</div>';
    }
    var idCampo = 'atuChat-' + k.replace(/[^a-zA-Z0-9_-]/g, '');
    h += '<form class="atu-envio' + (o.coluna ? ' atu-col-envio' : '') + '" data-atu-form="chat">' +
      '<label class="sr-only" for="' + idCampo + '">' + esc(o.rotuloCampo || 'Mensagem ao agente') + '</label>' +
      '<input id="' + idCampo + '" class="input" type="text" maxlength="1500" autocomplete="off" data-atu-campo="chat" data-atu-foco="chat-' + esc(k) + '" value="' + esc(RASC[k] || '') + '" placeholder="' + esc(o.placeholder) + '"' + (pend ? ' disabled' : '') + '>' +
      (o.coluna
        ? '<button type="submit" class="btn" aria-label="Enviar"' + (pend ? ' disabled' : '') + '>' + IC.enviar + '</button>'
        : '<button type="submit" class="btn"' + (pend ? ' disabled' : '') + '>' + IC.enviar + 'Enviar</button>') +
      '</form></div>';
    return h;
  }
  function htmlDescarte(st, compacto){
    var outro = st.motivo === 'outro';
    var opts = MOTIVOS.map(function(m){
      var sel = st.motivo === m.k;
      return '<button type="button" class="decide-option' + (sel ? ' is-selected' : '') + '" data-atu="motivo" data-v="' + m.k + '" aria-pressed="' + (sel ? 'true' : 'false') + '">' +
        '<span class="decide-option-mark">' + m.letra + '</span><span class="decide-option-body">' +
        '<span class="decide-option-title">' + esc(m.rotulo) + '</span><span class="decide-option-desc">' + esc(m.desc) + '</span></span></button>';
    }).join('');
    var idObs = compacto ? 'atuObsCol' : 'atuObs';
    return '<div class="decide' + (compacto ? ' atu-decide-sm' : '') + '" role="group" aria-label="Por que descartar?">' +
      '<div class="decide-head"><span class="decide-title">Por que descartar?</span><span class="decide-hint">O agente aprende com o motivo</span></div>' +
      '<div class="decide-options">' + opts + '</div>' +
      '<div class="atu-campo"><label class="label" for="' + idObs + '">' + (outro ? 'Explique em uma frase' : 'Explique em uma frase, se quiser') + '</label>' +
      '<input id="' + idObs + '" class="input' + (compacto ? ' input-sm' : '') + '" type="text" maxlength="300" data-atu-campo="obs" data-atu-foco="obs" value="' + esc(st.obs || '') + '" placeholder="Ex.: a banca cobra o regime antigo como histórico"></div>' +
      '<div class="atu-botoes' + (compacto ? ' atu-botoes-sm' : '') + '">' +
      '<button type="button" class="btn' + (compacto ? ' btn-sm' : '') + '" data-atu="descartar-ok"' + (!st.motivo || st.ocupado ? ' disabled' : '') + '>' + (st.ocupado ? 'Descartando...' : 'Confirmar descarte') + '</button>' +
      '<button type="button" class="btn btn-ghost' + (compacto ? ' btn-sm' : '') + '" data-atu="acao-voltar"' + (st.ocupado ? ' disabled' : '') + '>Voltar</button></div></div>';
  }
  function htmlResolver(st, compacto){
    var idNota = compacto ? 'atuNotaCol' : 'atuNota';
    return '<div class="decide' + (compacto ? ' atu-decide-sm' : '') + '" role="group" aria-label="Marcar como resolvido">' +
      '<div class="decide-head"><span class="decide-title">Marcar como resolvido</span><span class="decide-hint">O texto atual do trecho fica guardado</span></div>' +
      '<div class="atu-campo"><label class="label" for="' + idNota + '">Nota para a equipe, se quiser</label>' +
      '<input id="' + idNota + '" class="input' + (compacto ? ' input-sm' : '') + '" type="text" maxlength="300" data-atu-campo="nota" data-atu-foco="nota" value="' + esc(st.nota || '') + '" placeholder="Ex.: atualizei o número e mantive o histórico"></div>' +
      '<div class="atu-botoes' + (compacto ? ' atu-botoes-sm' : '') + '">' +
      '<button type="button" class="btn' + (compacto ? ' btn-sm' : '') + '" data-atu="resolver-ok"' + (st.ocupado ? ' disabled' : '') + '>' + IC.certo + (st.ocupado ? 'Salvando...' : 'Confirmar') + '</button>' +
      '<button type="button" class="btn btn-ghost' + (compacto ? ' btn-sm' : '') + '" data-atu="acao-voltar"' + (st.ocupado ? ' disabled' : '') + '>Voltar</button></div></div>';
  }
  function htmlConferidos(r, lugar){
    var conf = Array.isArray(r.conferidos) ? r.conferidos : [];
    if(!conf.length) return '';
    var chave = lugar + ':' + r.id, aberto = !!CONF_ABERTO[chave];
    var h = '<button type="button" class="atu-link" data-atu="conf" data-v="' + esc(chave) + '" aria-expanded="' + (aberto ? 'true' : 'false') + '">' +
      (aberto ? 'Esconder os pontos conferidos' : 'Ver ' + (conf.length === 1 ? 'o ponto conferido' : 'os ' + conf.length + ' pontos conferidos')) + '</button>';
    if(aberto){
      h += '<ul class="atu-conf">' + conf.map(function(c){
        c = c || {};
        var s = CONF_SIT[c.situacao] || { rotulo: c.situacao || 'Conferido', classe: '' };
        return '<li><span class="chip ' + s.classe + '">' + esc(s.rotulo) + '</span>' +
          (c.trecho ? '<span class="atu-conf-trecho">' + esc(c.trecho) + '</span>' : '') +
          (c.explicacao ? '<span class="field-help">' + esc(c.explicacao) + '</span>' : '') + '</li>';
      }).join('') + '</ul>';
    }
    return h;
  }
  // Quando a leitura não acha nada para conferir, o agente explica em uso.leitura1.observacao (leitura2... nas unidades longas).
  function observacaoLeitura(r){
    var uso = r && r.uso;
    if(typeof uso === 'string'){ try { uso = JSON.parse(uso); } catch(_){ uso = null; } }
    if(!uso || typeof uso !== 'object') return '';
    var chaves = Object.keys(uso).filter(function(k){ return /^leitura\d+$/.test(k); })
      .sort(function(a, b){ return Number(a.slice(7)) - Number(b.slice(7)); });
    for(var i = 0; i < chaves.length; i++){
      var o = uso[chaves[i]] && uso[chaves[i]].observacao;
      if(o && String(o).trim()) return String(o).trim();
    }
    return '';
  }
  function ondeAnalise(r){
    var uni = r.subject_id != null ? infoUnidade(r.subject_id, r.unit_id) : null;
    var partes = [];
    if(r.subject_id != null) partes.push(nomeMateria(r.subject_id));
    partes.push(uni ? rotuloUnidade(uni) + (uni.title ? ' · ' + uni.title : '') : 'Unidade');
    return partes.join(' · ');
  }
  // Corpo do cartão de uma análise (em andamento ou terminada). lugar: 'p' página, 'c' coluna.
  function htmlAnaliseCorpo(r, lugar){
    var onde = lugar === 'p' ? '<span class="field-help">' + esc(ondeAnalise(r)) + '</span>' : '';
    if(EM_CURSO[r.status]){
      var canc = !!AN.cancelando[r.id];
      var etapa = r.etapa || (r.status === 'fila' ? 'Na fila. A análise começa em instantes.' : 'Lendo a unidade.');
      return '<div class="atu-an-cab"><span class="spinner" aria-hidden="true"></span><span class="card-label">Análise em andamento</span></div>' + onde +
        '<p class="atu-an-etapa" aria-live="polite">' + esc(etapa) + '</p>' +
        (r.atividade ? '<p class="atu-an-ativ">' + esc(r.atividade) + '</p>' : '') +
        '<div class="atu-botoes"><button type="button" class="btn btn-danger btn-sm" data-atu="cancelar" data-v="' + esc(r.id) + '"' + (canc ? ' disabled' : '') + '>' + (canc ? 'Cancelando...' : 'Cancelar') + '</button></div>';
    }
    var fechar = '<button type="button" class="btn-icon atu-alert-x" data-atu="an-fechar" data-v="' + esc(r.id) + '" aria-label="Fechar o aviso da análise">' + IC.fechar + '</button>';
    var custo = Number(r.custo_usd) > 0 && cambio() != null ? ' Custo desta análise: ' + usdEmReais(r.custo_usd) + '.' : '';
    if(r.status === 'pronta'){
      var n = Number(r.alertas_novos) || 0, conf = Array.isArray(r.conferidos) ? r.conferidos : [], nc = conf.length;
      var ok = conf.filter(function(c){ return c.situacao === 'confere'; }).length;
      var sem = conf.filter(function(c){ return c.situacao === 'sem_fonte' || c.situacao === 'recusado'; }).length;
      var semTxt = sem ? ' ' + plural(sem, 'suspeita ficou', 'suspeitas ficaram') + ' sem prova oficial e não ' + (sem === 1 ? 'virou' : 'viraram') + ' alerta.' : '';
      var obs = observacaoLeitura(r);
      // as três situações do servidor: alertas novos, tudo certo, ou suspeitas que ficaram sem prova oficial
      var txt = n > 0 ? 'Análise pronta. O agente abriu ' + plural(n, 'alerta novo', 'alertas novos') + ', com o selo "' + NOVO_TXT + '".' + semTxt
        : nc > 0 && !sem ? 'Análise pronta. O agente conferiu ' + plural(nc, 'ponto', 'pontos') + ' nas fontes oficiais e todos estão certos.'
        : nc > 0 ? 'Análise pronta. Nenhum alerta.' + (ok ? ' ' + plural(ok, 'ponto confere', 'pontos conferem') + '.' : '') + semTxt
        : 'Análise pronta. ' + (obs || 'O agente não achou nesta unidade nada que dependa de dado oficial novo.');
      return '<div class="atu-an-cab"><span class="card-label">Análise pronta</span>' + fechar + '</div>' + onde +
        '<div class="alert alert-ok" role="status">' + IC.ok + '<div class="alert-body"><span class="alert-text">' + esc(txt + custo) + '</span></div></div>' +
        htmlConferidos(r, lugar);
    }
    if(r.status === 'erro'){
      return '<div class="atu-an-cab"><span class="card-label">A análise parou</span>' + fechar + '</div>' + onde +
        '<div class="alert alert-erro" role="status">' + IC.aviso + '<div class="alert-body"><span class="alert-text">' + esc((r.erro || 'O agente não disse o motivo.') + custo) + '</span></div></div>' +
        htmlConferidos(r, lugar) +
        '<div class="atu-botoes"><button type="button" class="btn btn-ghost btn-sm" data-atu="analisar-de-novo" data-v="' + esc(r.unit_id) + '" data-s="' + esc(r.subject_id == null ? '' : r.subject_id) + '">' + IC.lupa + 'Analisar de novo</button></div>';
    }
    return '<div class="atu-an-cab"><span class="card-label">Análise cancelada</span>' + fechar + '</div>' + onde +
      '<p class="field-help">A análise foi cancelada antes de terminar.' + custo + '</p>';
  }
  function atualizarAnaliseDom(r){
    if(!r) return;
    var nos = document.querySelectorAll('[data-atu-an="' + String(r.id).replace(/"/g, '') + '"]');
    for(var i = 0; i < nos.length; i++) nos[i].innerHTML = htmlAnaliseCorpo(r, nos[i].getAttribute('data-atu-lugar') || 'p');
  }

  // ── Página: carga ────────────────────────────────────────────────────────
  function carregarPagina(){
    if(S.carga) return S.carga;
    S.carga = (async function(){
      try {
        await Promise.all([lerPainel(), lerMaterias(), lerMe()]);
        var alertas = await todas(function(){ return ia().from('atu_alertas').select('*').order('criado_em', { ascending: false }); });
        var sids = unicos(alertas.map(function(a){ return a.subject_id; }));
        var unitIds = unicos(alertas.map(function(a){ return a.unit_id; }));
        var anIds = unicos(alertas.map(function(a){ return a.analise_id; }));
        var alertIds = alertas.map(function(a){ return a.id; });
        var focoAn = S.foco && S.foco.payload && S.foco.payload.analise_id;
        var r = await Promise.all([
          Promise.all(sids.map(function(s){ return unidadesDa(s, true).catch(function(){ return []; }); })),
          unitIds.length ? emLotes(unitIds, function(ch){ return conteudo().from('unit_sections').select('id, unit_id, title, position').in('unit_id', ch); }).catch(function(){ return []; }) : [],
          anIds.length ? emLotes(anIds, function(ch){ return ia().from('atu_analises').select('id, origem').in('id', ch); }) : [],
          alertIds.length ? emLotes(alertIds, function(ch){ return ia().from('atu_mensagens').select('*').in('alerta_id', ch).order('criado_em'); }) : [],
          dados(ia().from('atu_analises').select(COLS_AN).in('status', Object.keys(EM_CURSO)).order('criado_em', { ascending: false })),
          focoAn ? dados(ia().from('atu_analises').select(COLS_AN).eq('id', focoAn).maybeSingle()).catch(function(){ return null; }) : null
        ]);
        // seções numeradas como no editor (pela posição)
        var porUnidade = {}, secoes = {};
        (r[1] || []).forEach(function(s){ var k = String(s.unit_id); (porUnidade[k] = porUnidade[k] || []).push(s); });
        Object.keys(porUnidade).forEach(function(k){
          porUnidade[k].sort(function(a, b){ return ((a.position || 0) - (b.position || 0)) || (a.id - b.id); })
            .forEach(function(s, i){ secoes[String(s.id)] = { n: i + 1, titulo: s.title || '' }; });
        });
        var origens = {};
        (r[2] || []).forEach(function(x){ origens[String(x.id)] = x.origem; });
        trocarMsgs(r[3] || [], alertIds.map(String));
        (r[4] || []).forEach(function(row){ AN.linhas[row.id] = row; acompanhar(row.id); });
        if(r[5]){ AN.linhas[r[5].id] = r[5]; if(EM_CURSO[r[5].status]) acompanhar(r[5].id); }
        await lerUsuarios(alertas.map(function(a){ return a.tratado_por; })
          .concat((r[3] || []).map(function(m){ return m.autor; })));
        S.dados = { alertas: alertas, secoes: secoes, origens: origens };
        S.erro = null;
        aplicarFoco();
      } catch(e){
        S.erro = erroMsg(e);
      } finally {
        S.carga = null;
      }
      renderPagina();
      avisarMudanca();
    })();
    return S.carga;
  }
  function avisarMudanca(){
    try {
      var n = S.dados ? S.dados.alertas.filter(function(a){ return a.status === 'aberto'; }).length : null;
      window.dispatchEvent(new CustomEvent('atualizacoes:mudou', { detail: { abertos: n } }));
    } catch(_){}
  }
  function aplicarFoco(){
    var f = S.foco; if(!f || !S.dados) return;
    S.foco = null;
    S.vista = 'lista';
    var p = f.payload || {};
    if(p.analise_id) AN.vistas[p.analise_id] = true;
    var lista = S.dados.alertas, a = null;
    if(p.alerta_id) a = lista.filter(function(x){ return igual(x.id, p.alerta_id); })[0] || null;
    if(!a && p.unit_id){
      var daUnidade = lista.filter(function(x){ return igual(x.unit_id, p.unit_id) && x.status === 'aberto'; });
      ordenar(daUnidade, 'aberto');
      a = daUnidade[0] || null;
    }
    if(a){ S.sit = a.status; S.mat = 'todas'; S.grav = ''; S.tipo = ''; S.sel = a.id; S.acao = null; S.rolarDetalhe = true; }
  }

  // ── Página: desenho ──────────────────────────────────────────────────────
  function ordenar(l, sit){
    l.sort(function(a, b){
      if(sit === 'aberto'){
        var g = ordemGrav(a.gravidade) - ordemGrav(b.gravidade);
        if(g) return g;
        return tempo(b.criado_em) - tempo(a.criado_em);
      }
      return tempo(b.tratado_em || b.criado_em) - tempo(a.tratado_em || a.criado_em);
    });
    return l;
  }
  function passaFiltros(a, semMateria){
    return a.status === S.sit && (semMateria || S.mat === 'todas' || igual(a.subject_id, S.mat)) &&
      (!S.grav || a.gravidade === S.grav) && (!S.tipo || a.tipo === S.tipo);
  }
  function listaFiltrada(){ return ordenar(((S.dados && S.dados.alertas) || []).filter(function(a){ return passaFiltros(a); }), S.sit); }
  function alertaPorId(id){ return ((S.dados && S.dados.alertas) || []).filter(function(a){ return igual(a.id, id); })[0] || null; }

  function renderPagina(){
    if(!S.root || !S.el || !S.el.contains(S.root)) return;
    pintar(S.root, S.vista === 'config' ? htmlConfig() : htmlLista());
    if(S.rolarDetalhe){
      S.rolarDetalhe = false;
      var det = S.root.querySelector('.atu-detalhe');
      if(det && det.scrollIntoView) det.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }
  function htmlCabecalho(){
    return '<header class="atu-cab"><div class="atu-cab-txt">' +
      '<span class="s-label">Pedagógico · Atualizações</span><h1 class="s-title">Atualizações</h1>' +
      '<p class="s-body">O agente lê as unidades toda semana e sinaliza o que pode estar desatualizado, sempre com fonte oficial. Nada muda sozinho: quem edita a unidade é você.</p>' +
      '</div><div class="atu-cab-acoes">' +
      '<button type="button" class="btn btn-ghost" data-atu="config">' + IC.ajustes + 'Configurar agente</button>' +
      '<button type="button" class="btn" data-atu="seletor"' + (S.seletor ? ' aria-expanded="true"' : '') + '>' + IC.lupa + 'Analisar uma unidade agora</button>' +
      '</div></header>';
  }
  function htmlLista(){
    var h = htmlCabecalho();
    if(S.seletor) h += htmlSeletor();
    h += htmlAnalisesPagina();
    if(!S.dados){
      if(S.erro) return h + htmlErroCarga();
      return h + '<div class="atu-carregando"><span class="spinner" aria-hidden="true"></span>Carregando as atualizações.</div>';
    }
    if(S.erro) h += htmlErroCarga();
    if(S.aprendeu){
      h += '<div class="alert alert-ok" role="status">' + IC.ok + '<div class="alert-body"><span class="alert-title">O agente aprendeu</span>' +
        '<span class="alert-text">' + esc(S.aprendeu) + ' A regra fica em Configurar agente, onde você pode apagá-la.</span></div>' +
        '<button type="button" class="btn-icon atu-alert-x" data-atu="aprendeu-fechar" aria-label="Fechar o aviso">' + IC.fechar + '</button></div>';
    }
    var res = CACHE.painel && CACHE.painel.resumo;
    if(res && res.texto){
      h += '<div class="alert alert-info" role="status">' + IC.info + '<div class="alert-body">' +
        '<span class="alert-title">Resumo da semana · ' + esc(dataBR(res.criado_em)) + '</span>' +
        '<span class="alert-text">' + esc(res.texto) + '</span></div></div>';
    }
    h += htmlNumeros() + htmlFiltros();
    var lista = listaFiltrada();
    var sel = lista.filter(function(a){ return igual(a.id, S.sel); })[0] || lista[0] || null;
    if(!sel || !igual(sel.id, S.sel)){ S.sel = sel ? sel.id : null; S.acao = null; }
    h += '<div class="atu-corpo"><section class="atu-lista" aria-label="Alertas">';
    if(lista.length) h += lista.map(function(a){ return htmlItem(a, sel && igual(sel.id, a.id)); }).join('');
    else h += '<div class="empty"><span class="empty-title">Nada por aqui</span><span class="empty-body">' + esc(textoVazio()) + '</span></div>';
    h += '</section>';
    if(sel) h += htmlDetalhe(sel);
    h += '</div>';
    return h;
  }
  function textoVazio(){
    var temFiltro = S.mat !== 'todas' || S.grav || S.tipo;
    if(S.sit === 'aberto') return temFiltro ? 'Nenhum alerta aberto com estes filtros.' : 'Nenhum alerta aberto. Quando o agente achar algo, o alerta aparece aqui.';
    if(S.sit === 'resolvido') return temFiltro ? 'Nenhum alerta resolvido com estes filtros.' : 'Nenhum alerta resolvido ainda.';
    return temFiltro ? 'Nenhum alerta descartado com estes filtros.' : 'Nenhum alerta descartado ainda.';
  }
  function htmlErroCarga(){
    return '<div class="alert alert-erro" role="alert">' + IC.aviso + '<div class="alert-body"><span class="alert-title">Não consegui carregar as atualizações</span>' +
      '<span class="alert-text">' + esc(S.erro) + '</span></div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-atu="recarregar">Tentar de novo</button></div>';
  }
  function htmlNumeros(){
    var abertos = S.dados.alertas.filter(function(a){ return a.status === 'aberto'; });
    var altas = abertos.filter(function(a){ return a.gravidade === 'alta'; }).length;
    var vis = visiveis(), mats = CACHE.materias || {};
    var ligadas = vis.filter(function(s){ return mats[s] && mats[s].ligado; });
    var teto = ligadas.reduce(function(t, s){ return t + Number(mats[s].teto_mes_brl || 0); }, 0);
    var painel = CACHE.painel || {};
    var gastoUsd = vis.length && vis.length === Object.keys(mats).length
      ? Number(painel.gasto_total_usd || 0)
      : vis.reduce(function(t, s){ var p = porMateria(s); return t + Number((p && p.gasto_usd) || 0); }, 0);
    var gastoBrl = gastoUsd * (cambio() || 0);
    var pct = teto > 0 ? Math.min(100, Math.round(gastoBrl / teto * 100)) : 0;
    return '<section class="atu-numeros" aria-label="Números">' +
      '<div class="card"><span class="card-label">Abertos</span><span class="card-metric">' + abertos.length + '</span></div>' +
      '<div class="card"><span class="card-label">Prioridade alta</span><span class="card-metric" style="color:var(--atu-red)">' + altas + '</span></div>' +
      '<div class="card"><span class="card-label">Matérias com o agente ligado</span><span class="card-metric">' + ligadas.length + ' <span class="atu-metrica-sub">de ' + vis.length + '</span></span></div>' +
      '<div class="card"><span class="card-label">Gasto do mês</span><span class="card-metric" style="font-size:1.5rem">' + esc(brl(gastoBrl)) + '</span>' +
      '<div class="prog" role="progressbar" aria-label="Gasto do mês contra o teto" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><div class="prog-bar' + (teto > 0 && gastoBrl > teto ? ' is-over' : '') + '" style="width:' + pct + '%"></div></div>' +
      '<span class="field-help">' + (teto > 0 ? 'de ' + esc(brl(teto)) + ' no mês' : 'Nenhum teto definido nas matérias ligadas') + '</span></div>' +
      '</section>';
  }
  function htmlFiltros(){
    var todos = S.dados.alertas;
    var abas = SITS.map(function(s){
      var n = todos.filter(function(a){ return a.status === s[0]; }).length, ativo = S.sit === s[0];
      return '<button type="button" role="tab" class="atu-tab' + (ativo ? ' is-active' : '') + '" aria-selected="' + (ativo ? 'true' : 'false') + '" data-atu="sit" data-v="' + s[0] + '">' + esc(s[1]) + ' · ' + n + '</button>';
    }).join('');
    var naSit = todos.filter(function(a){ return passaFiltros(a, true); });
    var comAlerta = {};
    todos.forEach(function(a){ if(a.status === S.sit) comAlerta[String(a.subject_id)] = 1; });
    var mats = visiveis().filter(function(s){ return comAlerta[s] || igual(s, S.mat); });
    Object.keys(comAlerta).forEach(function(s){ if(mats.indexOf(s) < 0) mats.push(s); });
    var botoes = '<button type="button" class="filter-btn' + (S.mat === 'todas' ? ' is-active' : '') + '" data-atu="mat" data-v="todas">Todas <span class="atu-n">' + naSit.length + '</span></button>' +
      mats.map(function(s){
        var n = naSit.filter(function(a){ return igual(a.subject_id, s); }).length;
        return '<button type="button" class="filter-btn' + (igual(S.mat, s) ? ' is-active' : '') + '" data-atu="mat" data-v="' + esc(s) + '">' + esc(nomeMateria(s)) + ' <span class="atu-n">' + n + '</span></button>';
      }).join('');
    var gr = '<option value="">Todas as gravidades</option>' + ['alta', 'media', 'baixa'].map(function(g){
      return '<option value="' + g + '"' + (S.grav === g ? ' selected' : '') + '>' + GRAV[g].rotulo + '</option>';
    }).join('');
    var tp = '<option value="">Todos os tipos</option>' + TIPOS_ORDEM.map(function(t){
      return '<option value="' + t + '"' + (S.tipo === t ? ' selected' : '') + '>' + esc(TIPOS[t]) + '</option>';
    }).join('');
    return '<section class="atu-filtros" aria-label="Filtros">' +
      '<div class="atu-tabs" role="tablist" aria-label="Situação">' + abas + '</div>' +
      '<div class="atu-linha"><span class="label" style="margin-right:.3rem">Matéria</span>' + botoes +
      '<span class="atu-espaco"></span>' +
      '<label class="sr-only" for="atuFGrav">Gravidade</label><span class="atu-sel atu-sel-auto atu-sel-sm"><select id="atuFGrav" class="select select-sm" data-atu-campo="f-grav">' + gr + '</select></span>' +
      '<label class="sr-only" for="atuFTipo">Tipo</label><span class="atu-sel atu-sel-auto atu-sel-sm"><select id="atuFTipo" class="select select-sm" data-atu-campo="f-tipo">' + tp + '</select></span>' +
      '</div></section>';
  }
  function htmlItem(a, sel){
    var uni = infoUnidade(a.subject_id, a.unit_id);
    var quando = a.status === 'aberto' ? haQuanto(a.criado_em)
      : (a.status === 'resolvido' ? 'resolvido ' : 'descartado ') + haQuanto(a.tratado_em || a.criado_em);
    return '<button type="button" class="alerta-item' + (sel ? ' is-selected' : '') + '" data-atu="sel" data-v="' + esc(a.id) + '" aria-pressed="' + (sel ? 'true' : 'false') + '">' +
      capaHtml(uni, 'p') +
      '<span class="atu-item-txt"><span class="label">' + esc(nomeMateria(a.subject_id) + ' · ' + rotuloUnidade(uni)) + '</span>' +
      '<span class="atu-item-tit">' + esc(a.titulo) + '</span>' +
      '<span class="atu-item-meta">' + chipGrav(a.gravidade) + chipNovo(a) +
      '<span class="field-help">' + esc((TIPOS[a.tipo] || a.tipo) + ' · ' + quando) + '</span></span></span></button>';
  }
  function rotuloSecao(a, curto){
    var p = ponte();
    if(p && igual(p.unidade(), a.unit_id) && typeof p.secoes === 'function'){
      var alvo = localizar(a, p.blocos() || [], true);
      var secs = (p.secoes() || []).slice().sort(function(x, y){ return ((x.position || 0) - (y.position || 0)) || (x.id - y.id); });
      for(var i = 0; i < secs.length; i++){
        if(igual(secs[i].id, alvo.secao_id)) return 'Seção ' + (i + 1) + (curto || !secs[i].title ? '' : ' · ' + secs[i].title);
      }
    }
    var s = S.dados && a.secao_id != null ? S.dados.secoes[String(a.secao_id)] : null;
    if(s) return 'Seção ' + s.n + (curto || !s.titulo ? '' : ' · ' + s.titulo);
    return a.secao_titulo || '';
  }
  function motivoTexto(a){
    var m = MOTIVOS.filter(function(x){ return x.k === a.motivo; })[0];
    var obs = String(a.motivo_obs || '').trim().replace(/[.\s]+$/, '');
    if(!m) return obs || 'sem motivo';
    if(m.k === 'outro') return obs || 'outro motivo';
    return m.rotulo.toLowerCase() + (obs ? '. ' + obs : '');
  }
  function htmlDetalhe(a){
    var uni = infoUnidade(a.subject_id, a.unit_id);
    var sec = rotuloSecao(a, false);
    var origem = S.dados.origens[String(a.analise_id)];
    var freq = ((CACHE.materias || {})[String(a.subject_id)] || {}).frequencia;
    var na = origem === 'manual' ? 'na análise manual' : origem === 'rotina' ? 'na análise ' + (freq && FREQ[freq] ? FREQ[freq].toLowerCase() : 'da rotina') : 'numa análise do agente';
    var rascunho = uni && uni.status && uni.status !== 'published' ? '<span class="chip">Rascunho</span>' : '';
    var h = '<article class="card atu-detalhe" aria-label="Detalhe do alerta">' +
      '<div class="atu-det-topo">' + capaHtml(uni, 'g') +
      '<div class="atu-det-tit"><span class="card-label">' + esc(nomeMateria(a.subject_id) + ' · ' + (uni && uni.title ? uni.title : rotuloUnidade(uni))) + '</span>' +
      '<h2 class="t-h3">' + esc(a.titulo) + '</h2>' +
      '<span class="atu-chips">' + chipGrav(a.gravidade, 'Prioridade ') + '<span class="chip chip-accent">' + esc(TIPOS[a.tipo] || a.tipo) + '</span>' +
      (sec ? '<span class="chip atu-chip-solta">' + esc(sec) + '</span>' : '') + rascunho + chipNovo(a) + '</span>' +
      '<span class="field-help">Encontrado ' + esc(haQuanto(a.criado_em)) + ' ' + esc(na) + '</span></div></div>';

    if(a.status !== 'aberto'){
      var quem = nomeUsuario(a.tratado_por), quando = dataBR(a.tratado_em);
      var titulo = a.status === 'resolvido' ? 'Resolvido' : 'Descartado';
      var texto = a.status === 'resolvido'
        ? 'Resolvido por ' + quem + (quando ? ' em ' + quando : '') + '.'
        : 'Descartado por ' + quem + (quando ? ' em ' + quando : '') + '. Motivo: ' + motivoTexto(a) + '.';
      if(a.nota) texto += '\nNota: ' + a.nota;
      h += '<div class="alert" role="note"><div class="alert-body"><span class="alert-title">' + titulo + '</span><span class="alert-text">' + esc(texto) + '</span></div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-atu="reabrir"' + (S.ocupado ? ' disabled' : '') + '>' + IC.reabrir + 'Reabrir</button></div>';
      if(a.status === 'resolvido' && a.depois){
        h += '<div class="atu-bloco"><span class="label">Como ficou na unidade</span><p class="trecho trecho-depois">' + esc(a.depois) + '</p></div>';
      }
    }
    h += '<div class="atu-trechos">' +
      '<div class="atu-bloco"><span class="label">Trecho atual na unidade</span><p class="trecho trecho-atual">' + esc(a.trecho_atual) + '</p></div>' +
      '<div class="atu-bloco"><span class="label">Trecho proposto pelo agente</span><p class="trecho trecho-novo">' + esc(a.trecho_proposto) + '</p></div></div>';
    h += '<div class="atu-bloco"><span class="label">O que mudou</span><p class="atu-mudou">' + esc(a.o_que_mudou) + '</p></div>';
    var fontes = Array.isArray(a.fontes) ? a.fontes : [];
    h += '<div class="atu-bloco"><div class="sub-h"><span class="sub-h-text">Fontes oficiais</span><span class="sub-h-rule"></span></div>' +
      (fontes.length ? fontes.map(function(f){ return htmlFonte(f, false); }).join('') : '<p class="field-help">O alerta veio sem fonte.</p>') + '</div>';
    if(a.status === 'aberto'){
      if(S.acao === 'resolver') h += htmlResolver(S, false);
      else if(S.acao === 'descartar') h += htmlDescarte(S, false);
      else h += '<div class="card-foot" style="justify-content:flex-start;gap:.6rem">' +
        '<button type="button" class="btn" data-atu="ir">' + IC.lapis + 'Abrir no editor, nesta seção</button>' +
        '<button type="button" class="btn btn-ghost" data-atu="resolver">' + IC.certo + 'Marcar como resolvido</button>' +
        '<button type="button" class="btn btn-danger" data-atu="descartar">Descartar</button></div>';
    }
    h += htmlConversa({
      chave: String(a.id), unit: a.unit_id, alerta: a.id,
      titulo: 'Conversa com o agente sobre este alerta',
      vazio: 'Ainda não há conversa. Pergunte sobre a fonte, peça outra redação ou questione se o ponto cai na prova.',
      sugestoes: true, placeholder: 'Pergunte ao agente sobre este alerta', rotuloCampo: 'Pergunta ao agente'
    });
    return h + '</article>';
  }
  function htmlAnalisesPagina(){
    var linhas = Object.keys(AN.linhas).map(function(id){ return AN.linhas[id]; });
    var cartoes = linhas.filter(function(r){
      if(AN.vistas[r.id] === false) return false;
      return (EM_CURSO[r.status] && r.origem === 'manual') || AN.vistas[r.id] === true;
    }).sort(function(a, b){ return tempo(b.criado_em) - tempo(a.criado_em); });
    var rotina = linhas.filter(function(r){ return EM_CURSO[r.status] && r.origem === 'rotina' && AN.vistas[r.id] !== true; }).length;
    var h = cartoes.map(function(r){
      return '<section class="card atu-an" aria-label="Análise" data-atu-an="' + esc(r.id) + '" data-atu-lugar="p">' + htmlAnaliseCorpo(r, 'p') + '</section>';
    }).join('');
    if(rotina) h += '<p class="field-help atu-carregando" style="padding:0"><span class="spinner" aria-hidden="true"></span>A rotina do agente está lendo ' + plural(rotina, 'unidade', 'unidades') + ' agora.</p>';
    return h;
  }
  function htmlSeletor(){
    var z = S.seletor, vis = visiveis();
    var opts = '<option value="">Escolha a matéria</option>' + vis.map(function(s){
      return '<option value="' + esc(s) + '"' + (igual(z.materia, s) ? ' selected' : '') + '>' + esc(nomeMateria(s)) + '</option>';
    }).join('');
    var h = '<section class="card atu-seletor" aria-label="Analisar uma unidade agora">' +
      '<div class="atu-topo-card"><span class="card-label">Analisar uma unidade agora</span>' +
      '<button type="button" class="btn-icon" data-atu="seletor-fechar" aria-label="Fechar">' + IC.fechar + '</button></div>' +
      '<div class="atu-grade"><div class="atu-campo"><label class="label" for="atuSelMat">Matéria</label>' +
      '<span class="atu-sel"><select id="atuSelMat" class="select" data-atu-campo="sel-mat">' + opts + '</select></span></div>';
    var unis = z.materia ? (CACHE.unidades[String(z.materia)] || []) : [];
    if(z.materia && unis.length > 8){
      h += '<div class="atu-campo"><label class="label" for="atuSelBusca">Buscar unidade</label>' +
        '<input id="atuSelBusca" class="input" type="search" autocomplete="off" data-atu-campo="sel-busca" data-atu-foco="sel-busca" value="' + esc(z.busca || '') + '" placeholder="Número ou parte do título"></div>';
    }
    h += '</div>';
    if(!z.materia) h += '<p class="field-help">Escolha a matéria para ver as unidades dela.</p>';
    else if(z.carregando) h += '<div class="atu-carregando"><span class="spinner" aria-hidden="true"></span>Carregando as unidades.</div>';
    else if(z.erro) h += '<p class="field-help atu-erro-txt">' + esc(z.erro) + '</p>';
    else if(!unis.length) h += '<p class="field-help">Esta matéria ainda não tem unidades que você possa analisar.</p>';
    else {
      var b = String(z.busca || '').trim().toLowerCase();
      var filtradas = unis.filter(function(u){ return !b || (String(u.number || '') + ' ' + String(u.title || '')).toLowerCase().indexOf(b) >= 0; });
      h += '<div class="atu-campo"><span class="label">Unidade</span><div class="atu-unis" role="listbox" aria-label="Unidades da matéria">' +
        (filtradas.length ? filtradas.map(function(u){
          var sel = igual(u.id, z.unidade);
          return '<button type="button" role="option" class="atu-uni' + (sel ? ' is-selected' : '') + '" aria-selected="' + (sel ? 'true' : 'false') + '" data-atu="sel-uni" data-v="' + esc(u.id) + '">' +
            '<span class="atu-uni-num">' + esc(numUnidade(u.number) || '·') + '</span><span class="atu-uni-tit">' + esc(u.title || 'Sem título') + '</span>' +
            (u.status && u.status !== 'published' ? '<span class="chip">Rascunho</span>' : '') +
            (Number(u.abertos) > 0 ? '<span class="chip chip-warn">' + plural(Number(u.abertos), 'aberto', 'abertos') + '</span>' : '') +
            '</button>';
        }).join('') : '<p class="field-help" style="padding:.8rem">Nenhuma unidade com esse nome.</p>') + '</div></div>';
    }
    var u = z.materia && z.unidade ? infoUnidade(z.materia, z.unidade) : null;
    var mat = z.materia ? (CACHE.materias || {})[String(z.materia)] : null;
    var desligada = mat && (!mat.ligado || !(mat.dominios || []).length);
    var ajuda = [estimativa()];
    if(z.materia) ajuda.push('O agente lê a unidade inteira e confere os dados nas fontes oficiais de ' + nomeMateria(z.materia) + '.');
    if(u) ajuda.push('Última análise: ' + (u.ultima_analise ? dataBR(u.ultima_analise) : 'nunca') + '.');
    if(desligada) ajuda.push('O agente está desligado na rotina desta matéria. A análise manual funciona mesmo assim.');
    h += '<p class="field-help">' + esc(ajuda.filter(Boolean).join(' ')) + '</p>' +
      '<div class="atu-botoes"><button type="button" class="btn" data-atu="analisar"' + (!u || z.enviando ? ' disabled' : '') + '>' + IC.lupa + (z.enviando ? 'Pedindo...' : 'Analisar') + '</button>' +
      '<button type="button" class="btn btn-ghost" data-atu="seletor-fechar">Fechar</button></div></section>';
    return h;
  }

  // ── Configuração ─────────────────────────────────────────────────────────
  async function abrirConfig(){
    S.vista = 'config';
    S.cfg = { carregando: true };
    renderPagina();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(_){}
    await carregarConfig();
  }
  function copiaMateria(m){
    return { ligado: !!m.ligado, frequencia: m.frequencia || 'quinzenal', prioridade: m.prioridade || 'media',
      dominios: Array.isArray(m.dominios) ? m.dominios.slice() : [], teto_mes_brl: Number(m.teto_mes_brl || 0) };
  }
  function copiaGeral(g){
    return { dia_semana: Number(g.dia_semana), hora: Number(g.hora), teto_mes_brl: Number(g.teto_mes_brl || 0),
      unidades_por_rodada: Number(g.unidades_por_rodada), quem_recebe: g.quem_recebe, resumo_sino: !!g.resumo_sino, aviso_alta: !!g.aviso_alta };
  }
  async function carregarConfig(){
    try {
      var r = await Promise.all([
        dados(ia().from('atu_config').select('*').eq('id', 'geral').maybeSingle()),
        lerMaterias(), lerPainel(), lerMe(),
        dados(ia().from('atu_regras').select('*').eq('ativa', true).order('criado_em', { ascending: false }))
      ]);
      if(!r[0]) throw new Error('A configuração ainda não existe no banco. Rode o SQL 79.');
      var regras = r[4] || [];
      var uids = unicos(regras.map(function(x){ return x.unit_id; }));
      var titulos = {};
      if(uids.length){
        try {
          (await emLotes(uids, function(ch){ return conteudo().from('units').select('id, title, number').in('id', ch); }))
            .forEach(function(u){ titulos[String(u.id)] = (numUnidade(u.number) ? 'Unidade ' + numUnidade(u.number) + ' · ' : '') + (u.title || ''); });
        } catch(_){}
      }
      var mats = {}, orig = {};
      visiveis().forEach(function(s){
        var m = CACHE.materias[s];
        if(!m) return;
        mats[s] = copiaMateria(m);
        orig[s] = JSON.stringify(mats[s]);
      });
      var geral = copiaGeral(r[0]);
      S.cfg = { carregando: false, geral: geral, geralOrig: JSON.stringify(geral), mats: mats, matsOrig: orig, regras: regras, titulos: titulos,
        addFonte: null, novaFonte: '', erroFonte: '', erroGeral: '', salvando: false, apagando: null };
    } catch(e){
      S.cfg = { carregando: false, erro: erroMsg(e) };
    }
    renderPagina();
  }
  function cfgSujo(){
    var c = S.cfg; if(!c || !c.geral) return false;
    if(JSON.stringify(c.geral) !== c.geralOrig) return true;
    return Object.keys(c.mats).some(function(s){ return JSON.stringify(c.mats[s]) !== c.matsOrig[s]; });
  }
  function htmlConfig(){
    var c = S.cfg || {};
    var sujo = cfgSujo();
    var h = '<header class="atu-cab"><div class="atu-cab-txt">' +
      '<span class="s-label">Atualizações · Configuração</span><h1 class="s-title">Configuração do agente</h1>' +
      '<p class="s-body">Cada matéria tem as suas fontes oficiais, a sua frequência e o seu teto de gasto. Matéria desligada não é lida pelo agente.</p>' +
      '</div><div class="atu-cab-acoes">' +
      '<button type="button" class="btn btn-ghost" data-atu="voltar">' + IC.voltar + 'Voltar para Atualizações</button>' +
      '<button type="button" class="btn" data-atu="salvar"' + (!c.geral || c.salvando ? ' disabled' : '') + '>' + IC.salvar + (c.salvando ? 'Salvando...' : 'Salvar configuração') + '</button>' +
      '</div></header>';
    if(c.carregando) return h + '<div class="atu-carregando"><span class="spinner" aria-hidden="true"></span>Carregando a configuração.</div>';
    if(c.erro) return h + '<div class="alert alert-erro" role="alert">' + IC.aviso + '<div class="alert-body"><span class="alert-title">Não consegui carregar a configuração</span><span class="alert-text">' + esc(c.erro) + '</span></div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-atu="config">Tentar de novo</button></div>';
    if(sujo) h += '<p class="field-help" role="status">Há mudanças ainda não salvas.</p>';
    var g = c.geral;
    var dias = DIAS.map(function(d, i){ return '<option value="' + i + '"' + (g.dia_semana === i ? ' selected' : '') + '>' + d + '</option>'; }).join('');
    var horas = '';
    for(var i = 0; i < 24; i++){
      var hh = (i < 10 ? '0' : '') + i + ':00';
      horas += '<option value="' + i + '"' + (g.hora === i ? ' selected' : '') + '>' + hh + (i >= 0 && i <= 5 ? ', de madrugada' : '') + '</option>';
    }
    var rod = '';
    var maxRod = Math.max(10, g.unidades_por_rodada || 0);
    for(var k = 1; k <= maxRod; k++) rod += '<option value="' + k + '"' + (g.unidades_por_rodada === k ? ' selected' : '') + '>' + k + '</option>';
    var quem = Object.keys(QUEM).map(function(q){ return '<option value="' + q + '"' + (g.quem_recebe === q ? ' selected' : '') + '>' + QUEM[q] + '</option>'; }).join('');
    h += '<section class="card" aria-label="Geral" style="gap:1.1rem"><span class="card-label">Geral</span>' +
      '<div class="atu-grade">' +
      '<div class="atu-campo"><label class="label" for="atuCfgDia">Dia da análise semanal</label><span class="atu-sel"><select id="atuCfgDia" class="select" data-atu-campo="g-dia">' + dias + '</select></span></div>' +
      '<div class="atu-campo"><label class="label" for="atuCfgHora">Horário</label><span class="atu-sel"><select id="atuCfgHora" class="select" data-atu-campo="g-hora">' + horas + '</select></span><span class="field-help">Horário de Brasília.</span></div>' +
      '<div class="atu-campo"><label class="label" for="atuCfgTeto">Teto de gasto do mês, todas as matérias (R$)</label>' +
      '<input id="atuCfgTeto" class="input" type="number" min="0" step="1" inputmode="decimal" data-atu-campo="g-teto" data-atu-foco="g-teto" value="' + esc(g.teto_mes_brl) + '">' +
      '<span class="field-help">Ao chegar no teto, o agente para até o mês seguinte e avisa no sino.</span></div>' +
      '<div class="atu-campo"><label class="label" for="atuCfgRodada">Unidades por matéria em cada rodada</label><span class="atu-sel"><select id="atuCfgRodada" class="select" data-atu-campo="g-rodada">' + rod + '</select></span></div>' +
      '<div class="atu-campo"><label class="label" for="atuCfgQuem">Quem recebe o resumo</label><span class="atu-sel"><select id="atuCfgQuem" class="select" data-atu-campo="g-quem">' + quem + '</select></span></div>' +
      '</div><div class="atu-toggles">' +
      '<label class="toggle"><input type="checkbox" data-atu-campo="g-resumo"' + (g.resumo_sino ? ' checked' : '') + '><span class="toggle-track"><span class="toggle-thumb"></span></span>Mandar o resumo da semana no sino</label>' +
      '<label class="toggle"><input type="checkbox" data-atu-campo="g-alta"' + (g.aviso_alta ? ' checked' : '') + '><span class="toggle-track"><span class="toggle-thumb"></span></span>Avisar na hora quando surgir alerta de prioridade alta</label>' +
      '</div>' + (c.erroGeral ? '<p class="field-help atu-erro-txt" role="alert">' + esc(c.erroGeral) + '</p>' : '') + '</section>';
    h += htmlTabelaMaterias();
    h += htmlRegras();
    return h;
  }
  function htmlTabelaMaterias(){
    var c = S.cfg, sids = visiveis().filter(function(s){ return c.mats[s]; });
    var linhas = sids.map(function(s){
      var m = c.mats[s], nome = nomeMateria(s), pm = porMateria(s);
      var ultima = (pm && pm.ultima_analise) || (CACHE.materias[s] || {}).ultima_rodada;
      var toggle = '<label class="toggle"><input type="checkbox" data-atu-campo="m-ligado" data-v="' + esc(s) + '" aria-label="Agente ligado em ' + esc(nome) + '"' + (m.ligado ? ' checked' : '') + '><span class="toggle-track"><span class="toggle-thumb"></span></span></label>';
      if(!m.ligado){
        return '<tr class="is-off"><td class="col-name">' + esc(nome) + '</td><td data-rotulo="Agente">' + toggle + '</td><td colspan="5">Desligado.</td></tr>';
      }
      var freq = Object.keys(FREQ).map(function(f){ return '<option value="' + f + '"' + (m.frequencia === f ? ' selected' : '') + '>' + FREQ[f] + '</option>'; }).join('');
      var prio = Object.keys(PRIO).map(function(p){ return '<option value="' + p + '"' + (m.prioridade === p ? ' selected' : '') + '>' + PRIO[p] + '</option>'; }).join('');
      var fontes = m.dominios.map(function(d){
        return '<span class="chip chip-accent">' + esc(d) + '<button type="button" class="atu-chip-x" data-atu="fonte-tirar" data-v="' + esc(s) + '" data-f="' + esc(d) + '" aria-label="Tirar ' + esc(d) + '">' + IC.fechar + '</button></span>';
      }).join('');
      if(igual(c.addFonte, s)){
        fontes += '<span class="atu-fonte-add"><label class="sr-only" for="atuNovaFonte">Nova fonte de ' + esc(nome) + '</label>' +
          '<input id="atuNovaFonte" class="input input-sm" type="text" autocomplete="off" spellcheck="false" data-atu-campo="fonte-nova" data-atu-foco="fonte-nova" value="' + esc(c.novaFonte || '') + '" placeholder="dominio.gov.br ou gov.br/orgao">' +
          '<button type="button" class="btn btn-sm" data-atu="fonte-ok" data-v="' + esc(s) + '">Adicionar</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-atu="fonte-cancelar">Cancelar</button></span>' +
          (c.erroFonte ? '<span class="field-help atu-erro-txt" role="alert" style="flex-basis:100%">' + esc(c.erroFonte) + '</span>' : '');
      } else {
        fontes += '<button type="button" class="chip chip-btn" data-atu="fonte-add" data-v="' + esc(s) + '">' + IC.mais + 'Adicionar fonte</button>';
      }
      if(!m.dominios.length) fontes = '<span class="field-help" style="flex-basis:100%">Sem fonte oficial, o agente não sinaliza nada na rotina.</span>' + fontes;
      return '<tr><td class="col-name">' + esc(nome) + '</td>' +
        '<td data-rotulo="Agente">' + toggle + '</td>' +
        '<td data-rotulo="Frequência"><span class="atu-sel atu-sel-sm"><select class="select select-sm" data-atu-campo="m-freq" data-v="' + esc(s) + '" aria-label="Frequência de ' + esc(nome) + '">' + freq + '</select></span></td>' +
        '<td data-rotulo="Fontes oficiais" class="atu-td-fontes"><span class="atu-fontes">' + fontes + '</span></td>' +
        '<td data-rotulo="Prioridade"><span class="atu-sel atu-sel-sm"><select class="select select-sm" data-atu-campo="m-prio" data-v="' + esc(s) + '" aria-label="Prioridade de ' + esc(nome) + '">' + prio + '</select></span></td>' +
        '<td data-rotulo="Teto do mês"><input class="input input-sm atu-teto" type="number" min="0" step="1" inputmode="decimal" data-atu-campo="m-teto" data-atu-foco="m-teto-' + esc(s) + '" data-v="' + esc(s) + '" value="' + esc(m.teto_mes_brl) + '" aria-label="Teto do mês de ' + esc(nome) + ', em reais"></td>' +
        '<td data-rotulo="Última análise" class="col-num">' + esc(ultima ? dataCurta(ultima) : 'Nunca') + '</td></tr>';
    }).join('');
    var ligadas = sids.filter(function(s){ return c.mats[s].ligado; });
    return '<section aria-label="Por matéria" style="display:flex;flex-direction:column;gap:.8rem">' +
      '<div class="sub-h"><span class="sub-h-text">Por matéria</span><span class="sub-h-rule"></span></div>' +
      '<div class="tbl-wrap"><div class="tbl-scroll"><table class="tbl tbl-resp"><thead><tr>' +
      '<th scope="col">Matéria</th><th scope="col">Agente</th><th scope="col">Frequência</th><th scope="col">Fontes oficiais</th><th scope="col">Prioridade</th><th scope="col">Teto do mês</th><th scope="col">Última análise</th>' +
      '</tr></thead><tbody>' + (linhas || '<tr><td colspan="7">Nenhuma matéria para configurar.</td></tr>') + '</tbody></table></div>' +
      '<div class="tbl-foot"><span>' + ligadas.length + ' de ' + sids.length + ' matérias ligadas</span><span data-atu-soma>' + esc(textoSoma()) + '</span></div></div></section>';
  }
  function textoSoma(){
    var c = S.cfg, soma = Object.keys(c.mats).filter(function(s){ return c.mats[s].ligado && visiveis().indexOf(s) >= 0; })
      .reduce(function(t, s){ return t + (numeroValido(c.mats[s].teto_mes_brl) || 0); }, 0);
    return 'Soma dos tetos: ' + brl(soma);
  }
  function atualizarSoma(){ var el = S.root && S.root.querySelector('[data-atu-soma]'); if(el) el.textContent = textoSoma(); }
  function htmlRegras(){
    var c = S.cfg, regras = c.regras || [];
    var h = '<section class="card" aria-label="Regras aprendidas" style="gap:1rem">' +
      '<div class="atu-linha" style="justify-content:space-between;align-items:baseline;gap:.6rem"><span class="card-label">O que o agente aprendeu com os descartes</span>' +
      '<span class="field-help">Cada descarte com motivo vira uma regra. Você pode apagar a regra se ela não fizer mais sentido.</span></div>';
    if(!regras.length) return h + '<p class="field-help">Nenhuma regra ainda. Quando você descartar um alerta, o motivo vira uma regra aqui.</p></section>';
    h += '<div>' + regras.map(function(r){
      var escopo = r.unit_id != null ? 'Só nesta unidade: ' + (c.titulos[String(r.unit_id)] || 'unidade ' + r.unit_id) : '';
      var apagando = igual(c.apagando, r.id);
      return '<div class="atu-regra"><span class="chip chip-accent">' + esc(r.subject_id != null ? nomeMateria(r.subject_id) : 'Todas as matérias') + '</span>' +
        '<span class="atu-regra-txt"><span>' + esc(r.texto) + '</span>' + (escopo ? '<span class="field-help">' + esc(escopo) + '</span>' : '') + '</span>' +
        '<span class="field-help">Descarte de ' + esc(dataBR(r.criado_em)) + '</span>' +
        '<button type="button" class="btn btn-danger btn-sm" data-atu="regra-apagar" data-v="' + esc(r.id) + '"' + (apagando ? ' disabled' : '') + '>' + (apagando ? 'Apagando...' : 'Apagar regra') + '</button></div>';
    }).join('') + '</div></section>';
    return h;
  }
  function validarFonte(v){
    var s = String(v || '').trim().toLowerCase();
    if(!s) return { erro: 'Escreva o endereço da fonte.' };
    if(/^[a-z]+:/.test(s) || s.indexOf('://') >= 0) return { erro: 'Tire o http. Escreva só o endereço, como gov.br/mre.' };
    if(/\s/.test(s)) return { erro: 'O endereço não pode ter espaço.' };
    s = s.replace(/\/+$/, '');
    if(s.indexOf('www.') === 0) s = s.slice(4);
    if(!/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/[a-z0-9._~%-]+)*$/.test(s)) return { erro: 'Use o formato dominio.gov.br ou gov.br/orgao.' };
    return { valor: s };
  }
  function adicionarFonte(sid){
    var c = S.cfg, m = c.mats[sid]; if(!m) return;
    var v = validarFonte(c.novaFonte);
    if(v.erro){ c.erroFonte = v.erro; renderPagina(); focar('[data-atu-campo="fonte-nova"]'); return; }
    if(m.dominios.indexOf(v.valor) >= 0){ c.erroFonte = 'Esta fonte já está na lista.'; renderPagina(); focar('[data-atu-campo="fonte-nova"]'); return; }
    m.dominios.push(v.valor);
    c.addFonte = null; c.novaFonte = ''; c.erroFonte = '';
    renderPagina();
    focar('[data-atu="fonte-add"][data-v="' + sid + '"]');
  }
  function focar(sel){
    var raiz = S.root; if(!raiz) return;
    var el = raiz.querySelector(sel);
    if(el){ try { el.focus({ preventScroll: true }); } catch(_){ el.focus(); } }
  }
  function numeroValido(v){
    if(v == null || String(v).trim() === '') return null;
    var n = Number(String(v).replace(',', '.'));
    return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  }
  async function salvarConfig(){
    var c = S.cfg; if(!c || !c.geral || c.salvando) return;
    var g = c.geral;
    if(numeroValido(g.teto_mes_brl) == null){ toast('O teto do mês precisa ser um valor em reais, zero ou mais.', 'error'); focar('#atuCfgTeto'); return; }
    if(!(g.unidades_por_rodada >= 1 && g.unidades_por_rodada <= 20)){ toast('Escolha de 1 a 10 unidades por rodada.', 'error'); return; }
    var ruim = Object.keys(c.mats).filter(function(s){ return numeroValido(c.mats[s].teto_mes_brl) == null; })[0];
    if(ruim){ toast('O teto de ' + nomeMateria(ruim) + ' precisa ser um valor em reais, zero ou mais.', 'error'); return; }
    var geralMudou = JSON.stringify(g) !== c.geralOrig;
    var mudadas = Object.keys(c.mats).filter(function(s){ return JSON.stringify(c.mats[s]) !== c.matsOrig[s]; });
    if(!geralMudou && !mudadas.length){ toast('Nada mudou desde a última vez.', 'info'); return; }
    c.salvando = true; c.erroGeral = ''; renderPagina();
    var agora = new Date().toISOString(), me = await lerMe(), erros = [];
    var tarefas = [];
    if(geralMudou){
      var patchG = { dia_semana: g.dia_semana, hora: g.hora, teto_mes_brl: numeroValido(g.teto_mes_brl), unidades_por_rodada: g.unidades_por_rodada,
        quem_recebe: g.quem_recebe, resumo_sino: g.resumo_sino, aviso_alta: g.aviso_alta, atualizado_em: agora, atualizado_por: me };
      tarefas.push(Promise.resolve(ia().from('atu_config').update(patchG).eq('id', 'geral').select('id')).then(function(r){
        if(r.error) { erros.push('Geral: ' + r.error.message); c.erroGeral = r.error.message; }
        else if(!r.data || !r.data.length){ erros.push(MSG_PERMISSAO); c.erroGeral = MSG_PERMISSAO; }
        else c.geralOrig = JSON.stringify(g);
      }));
    }
    mudadas.forEach(function(s){
      var m = c.mats[s];
      var patch = { ligado: m.ligado, frequencia: m.frequencia, prioridade: m.prioridade, dominios: m.dominios.slice(),
        teto_mes_brl: numeroValido(m.teto_mes_brl), atualizado_em: agora, atualizado_por: me };
      tarefas.push(Promise.resolve(ia().from('atu_materias').update(patch).eq('subject_id', Number(s)).select('subject_id')).then(function(r){
        if(r.error) erros.push(nomeMateria(s) + ': ' + r.error.message);
        else if(!r.data || !r.data.length) erros.push(nomeMateria(s) + ': você não pode mudar esta matéria.');
        else {
          c.matsOrig[s] = JSON.stringify(m);
          if(CACHE.materias[s]) Object.keys(patch).forEach(function(k){ CACHE.materias[s][k] = patch[k]; });
        }
      }));
    });
    try { await Promise.all(tarefas); } catch(e){ erros.push(erroMsg(e)); }
    c.salvando = false;
    if(erros.length) toast('Nem tudo foi salvo. ' + erros.join(' '), 'error');
    else toast('Configuração salva.', 'success');
    renderPagina();
    lerPainel().then(function(){ if(S.vista === 'config') renderPagina(); }).catch(function(){});
  }
  async function apagarRegra(id){
    var c = S.cfg; if(!c) return;
    var r = (c.regras || []).filter(function(x){ return igual(x.id, id); })[0]; if(!r) return;
    if(!window.confirm('Apagar esta regra? O agente deixa de segui-la nas próximas análises.\n\n' + r.texto)) return;
    c.apagando = id; renderPagina();
    try {
      await rpcOk('atu_regra_apagar', { p_regra: id });
      c.regras = c.regras.filter(function(x){ return !igual(x.id, id); });
      toast('Regra apagada. O agente não segue mais esta regra.', 'success');
    } catch(e){ toast(erroMsg(e), 'error'); }
    c.apagando = null; renderPagina();
  }

  // ── Ações sobre um alerta (página e coluna) ──────────────────────────────
  async function textoAtual(a){
    if(a.bloco_id == null) return null;
    var p = ponte(), bloco = null;
    if(p && igual(p.unidade(), a.unit_id)){
      // editor aberto nesta unidade: o que vale é o que está nele agora
      bloco = (p.blocos() || []).filter(function(b){ return igual(b.id, a.bloco_id); })[0] || null;
    } else {
      var r = await conteudo().from('unit_blocks').select('id, type, content, section_id').eq('id', a.bloco_id).maybeSingle();
      if(r.error) throw new Error('Não consegui ler o texto atual da unidade: ' + r.error.message);
      bloco = r.data || null;
    }
    return bloco ? textoDoAlvo(bloco, a) : null;
  }
  function renderTudo(){ if(S.vista === 'lista') renderPagina(); renderColuna(); }
  async function depoisDeMudar(a){
    var tarefas = [];
    if(S.root && S.dados) tarefas.push(carregarPagina());
    if(ED && igual(ED.unit, a.unit_id)) tarefas.push(recarregarColuna());
    await Promise.all(tarefas);
    avisarMudanca();
  }
  async function resolverAlerta(st, a){
    if(!a || st.ocupado) return;
    st.ocupado = true; renderTudo();
    try {
      var depois = await textoAtual(a);
      await rpcOk('atu_resolver', { p_alerta: a.id, p_depois: depois, p_nota: String(st.nota || '').trim() || null });
      toast('Alerta marcado como resolvido.', 'success');
      st.acao = null; st.nota = '';
      st.ocupado = false;
      await depoisDeMudar(a);
    } catch(e){ toast(erroMsg(e), 'error'); }
    st.ocupado = false; renderTudo();
  }
  async function descartarAlerta(st, a){
    if(!a || st.ocupado) return;
    if(!st.motivo){ toast('Escolha o motivo do descarte.', 'error'); return; }
    var obs = String(st.obs || '').trim();
    if(st.motivo === 'outro' && !obs){
      toast('Explique o motivo em uma frase.', 'error');
      var campo = document.querySelector(st === ED ? '#atuObsCol' : '#atuObs');
      if(campo) campo.focus();
      return;
    }
    st.ocupado = true; renderTudo();
    try {
      var d = await chamarEF({ acao: 'descartar', alerta_id: a.id, motivo: st.motivo, obs: obs || null });
      var txt = d.regra && d.regra.texto;
      toast(txt ? 'O agente aprendeu: ' + txt : 'Alerta descartado.', 'success');
      if(txt) S.aprendeu = txt;
      st.acao = null; st.motivo = null; st.obs = '';
      st.ocupado = false;
      await depoisDeMudar(a);
    } catch(e){ toast(erroMsg(e), 'error'); }
    st.ocupado = false; renderTudo();
  }
  async function reabrirAlerta(a){
    if(!a || S.ocupado) return;
    S.ocupado = true; renderPagina();
    try {
      var d = await rpcOk('atu_reabrir', { p_alerta: a.id });
      toast('Alerta reaberto.' + (Number(d.regras_desligadas) > 0 ? ' A regra que nasceu do descarte foi desligada.' : ''), 'success');
      S.sit = 'aberto'; S.sel = a.id; S.acao = null;
      S.ocupado = false;
      await depoisDeMudar(a);
    } catch(e){ toast(erroMsg(e), 'error'); }
    S.ocupado = false; renderPagina();
  }
  async function enviarConversa(chave, unitId, alertaId, texto){
    texto = String(texto || '').trim();
    if(!texto || CONV[chave]) return;
    CONV[chave] = { texto: texto }; RASC[chave] = '';
    renderTudo();
    var ok = false;
    try {
      var d = await chamarEF({ acao: 'conversar', unit_id: Number(unitId), alerta_id: alertaId || null, texto: texto });
      var extra = { alerta_id: alertaId || null, unit_id: Number(unitId) };
      var minha = Object.assign({ papel: 'admin', autor: CACHE.me, texto: texto, criado_em: new Date().toISOString() }, d.minha || {}, extra);
      var dele = d.mensagem ? Object.assign({ papel: 'agente' }, d.mensagem, extra) : null;
      if(minha.id == null) minha.id = 'local-' + Date.now();
      juntarMsgs([minha, dele]);
      ok = true;
    } catch(e){
      toast(erroMsg(e), 'error');
      RASC[chave] = texto;
    }
    delete CONV[chave];
    renderTudo();
    if(ok){
      var ativo = document.activeElement;
      if(!ativo || ativo === document.body){
        var campo = document.querySelector('[data-atu-foco="chat-' + String(chave).replace(/"/g, '') + '"]');
        if(campo){ try { campo.focus({ preventScroll: true }); } catch(_){ campo.focus(); } }
      }
    }
  }

  // ── Análises: pedir, acompanhar (3 s), cancelar ──────────────────────────
  async function analisar(unitId, subjectId){
    try {
      var d = await chamarEF({ acao: 'analisar', unit_id: Number(unitId) });
      var id = d.analise_id;
      if(!id) throw new Error('O agente não devolveu a análise.');
      AN.minhas[id] = true; AN.vistas[id] = true;
      if(!AN.linhas[id] || !EM_CURSO[AN.linhas[id].status]){
        AN.linhas[id] = { id: id, unit_id: Number(unitId), subject_id: subjectId != null && subjectId !== '' ? Number(subjectId) : null,
          origem: 'manual', status: 'fila', etapa: null, atividade: null, criado_em: new Date().toISOString() };
      }
      toast(d.ja_existia ? 'Esta unidade já estava em análise. Acompanhe por aqui.' : 'Análise pedida. Acompanhe o andamento por aqui.', 'info');
      acompanhar(id);
      renderTudo();
      sondar();
      return true;
    } catch(e){ toast(erroMsg(e), 'error'); return false; }
  }
  function acompanhar(id){
    AN.seguindo[id] = true;
    if(!AN.timer) AN.timer = setInterval(sondar, 3000);
  }
  async function sondar(){
    var ids = Object.keys(AN.seguindo);
    if(!ids.length){ if(AN.timer){ clearInterval(AN.timer); AN.timer = null; } return; }
    if(AN.sondando) return;
    AN.sondando = true;
    var terminou = [];
    try {
      var rows = await dados(ia().from('atu_analises').select(COLS_AN).in('id', ids));
      AN.falhas = 0;
      var vistos = {};
      (rows || []).forEach(function(row){
        vistos[row.id] = 1;
        AN.linhas[row.id] = row;
        if(EM_CURSO[row.status]) atualizarAnaliseDom(row);
        else { delete AN.seguindo[row.id]; delete AN.cancelando[row.id]; terminou.push(row); }
      });
      ids.forEach(function(id){ if(!vistos[id]) delete AN.seguindo[id]; });
    } catch(e){
      AN.falhas++;
      if(AN.falhas >= 10){
        AN.seguindo = {};
        toast('Perdi o contato com as análises em andamento. Recarregue a página para ver o resultado.', 'error');
      }
    } finally {
      AN.sondando = false;
    }
    if(!Object.keys(AN.seguindo).length && AN.timer){ clearInterval(AN.timer); AN.timer = null; }
    if(terminou.length) await aoTerminar(terminou);
  }
  async function aoTerminar(rows){
    var comNovos = rows.filter(function(r){ return r.status === 'pronta' && Number(r.alertas_novos) > 0; }).map(function(r){ return r.id; });
    if(comNovos.length){
      try {
        (await dados(ia().from('atu_alertas').select('id').in('analise_id', comNovos))).forEach(function(a){ NOVOS[a.id] = true; });
      } catch(_){}
    }
    rows.forEach(function(r){
      if(r.origem === 'manual' && AN.vistas[r.id] !== false) AN.vistas[r.id] = true;
      if(AN.minhas[r.id]){
        if(r.status === 'pronta'){
          var n = Number(r.alertas_novos) || 0;
          var semT = (Array.isArray(r.conferidos) ? r.conferidos : []).filter(function(c){ return c.situacao === 'sem_fonte' || c.situacao === 'recusado'; }).length;
          toast(n > 0 ? 'Análise pronta: ' + plural(n, 'alerta novo', 'alertas novos') + '.'
            : semT ? 'Análise pronta. Nenhum alerta; ' + plural(semT, 'suspeita ficou', 'suspeitas ficaram') + ' sem prova oficial.'
            : 'Análise pronta. Nada para mudar nesta unidade.', 'success');
        } else if(r.status === 'erro') toast('A análise parou: ' + (r.erro || 'o agente não disse o motivo.'), 'error');
      }
    });
    renderTudo();
    clearTimeout(AN.recarga);
    AN.recarga = setTimeout(function(){
      if(S.root && S.dados) carregarPagina();
      if(ED && rows.some(function(r){ return igual(r.unit_id, ED.unit); })) recarregarColuna();
    }, 250);
  }
  async function cancelarAnalise(id){
    if(!id || AN.cancelando[id]) return;
    AN.cancelando[id] = true;
    atualizarAnaliseDom(AN.linhas[id]);
    try {
      await chamarEF({ acao: 'cancelar', analise_id: id });
      toast('Pedido de cancelamento enviado.', 'info');
      sondar();
    } catch(e){
      delete AN.cancelando[id];
      atualizarAnaliseDom(AN.linhas[id]);
      toast(erroMsg(e), 'error');
    }
  }

  // ── Seletor "Analisar uma unidade agora" ─────────────────────────────────
  async function escolherMateria(sid){
    var z = S.seletor; if(!z) return;
    z.materia = sid || null; z.unidade = null; z.busca = ''; z.erro = '';
    if(!sid){ renderPagina(); return; }
    z.carregando = true; renderPagina();
    try { await unidadesDa(sid, true); } catch(e){ z.erro = 'Não consegui carregar as unidades: ' + erroMsg(e); }
    if(S.seletor !== z) return;
    z.carregando = false; renderPagina();
  }

  // ── Página: eventos ──────────────────────────────────────────────────────
  function ligarPagina(el){
    if(el.__atuLigado) return;
    el.__atuLigado = true;
    el.addEventListener('click', function(e){ aoClicar(e, 'p', el); });
    el.addEventListener('change', function(e){ aoMudar(e, 'p'); });
    el.addEventListener('input', function(e){ aoDigitar(e, 'p'); });
    el.addEventListener('submit', function(e){ aoEnviar(e); });
    el.addEventListener('keydown', function(e){ aoTecla(e, 'p'); });
  }
  function estadoDe(lugar){ return lugar === 'c' ? ED : S; }
  function alertaDoLugar(lugar, v){
    if(lugar === 'c'){
      if(!ED) return null;
      var id = v || ED.expandido;
      return ED.alertas.filter(function(a){ return igual(a.id, id); })[0] || null;
    }
    return alertaPorId(v || S.sel);
  }
  function aoClicar(e, lugar, raiz){
    var b = e.target.closest('[data-atu]');
    if(!b || !raiz.contains(b) || b.disabled) return;
    var acao = b.getAttribute('data-atu'), v = b.getAttribute('data-v');
    var st = estadoDe(lugar);
    switch(acao){
      // comuns
      case 'resolver': if(st){ st.acao = 'resolver'; st.nota = ''; renderTudo(); focar2(lugar, 'nota'); } return;
      case 'descartar': if(st){ st.acao = 'descartar'; st.motivo = null; st.obs = ''; renderTudo(); } return;
      case 'acao-voltar': if(st){ st.acao = null; st.motivo = null; st.obs = ''; st.nota = ''; renderTudo(); } return;
      case 'motivo': if(st){ st.motivo = v; renderTudo(); if(v === 'outro') focar2(lugar, 'obs'); } return;
      case 'resolver-ok': if(st) resolverAlerta(st, alertaDoLugar(lugar)); return;
      case 'descartar-ok': if(st) descartarAlerta(st, alertaDoLugar(lugar)); return;
      case 'ir': irParaTrecho(alertaDoLugar(lugar, v)); return;
      case 'cancelar': cancelarAnalise(v); return;
      case 'an-fechar': AN.vistas[v] = false; renderTudo(); return;
      case 'conf': CONF_ABERTO[v] = !CONF_ABERTO[v]; renderTudo(); return;
      case 'analisar-de-novo': analisar(v, b.getAttribute('data-s')); return;
      case 'sugestao': {
        var cv = b.closest('.atu-conversa');
        if(cv) enviarConversa(cv.getAttribute('data-chave'), cv.getAttribute('data-unit'), cv.getAttribute('data-alerta'), SUGESTOES[Number(v)] || '');
        return;
      }
      // página
      case 'sel':
        if(!igual(S.sel, v)){ S.sel = v; S.acao = null; S.motivo = null; S.obs = ''; S.nota = ''; }
        renderPagina();
        rolarParaDetalheSeEmpilhado();
        return;
      case 'sit': S.sit = v; S.sel = null; S.acao = null; renderPagina(); return;
      case 'mat': S.mat = v; S.sel = null; S.acao = null; renderPagina(); return;
      case 'reabrir': reabrirAlerta(alertaPorId(S.sel)); return;
      case 'recarregar': carregarPagina(); return;
      case 'aprendeu-fechar': S.aprendeu = null; renderPagina(); return;
      case 'config': abrirConfig(); return;
      case 'voltar':
        if(cfgSujo() && !window.confirm('Há mudanças não salvas na configuração. Sair sem salvar?')) return;
        S.vista = 'lista'; S.cfg = null; renderPagina(); carregarPagina(); return;
      case 'salvar': salvarConfig(); return;
      case 'regra-apagar': apagarRegra(v); return;
      case 'fonte-add': S.cfg.addFonte = v; S.cfg.novaFonte = ''; S.cfg.erroFonte = ''; renderPagina(); focar('[data-atu-campo="fonte-nova"]'); return;
      case 'fonte-cancelar': { var era = S.cfg.addFonte; S.cfg.addFonte = null; S.cfg.erroFonte = ''; renderPagina(); focar('[data-atu="fonte-add"][data-v="' + era + '"]'); return; }
      case 'fonte-ok': adicionarFonte(v); return;
      case 'fonte-tirar': {
        var m = S.cfg && S.cfg.mats[v];
        if(m){ m.dominios = m.dominios.filter(function(d){ return d !== b.getAttribute('data-f'); }); renderPagina(); focar('[data-atu="fonte-add"][data-v="' + v + '"]'); }
        return;
      }
      case 'seletor':
        if(S.seletor){ S.seletor = null; renderPagina(); return; }
        S.seletor = { materia: null, unidade: null, busca: '', carregando: false, erro: '', enviando: false };
        if(S.mat !== 'todas' && visiveis().indexOf(String(S.mat)) >= 0){ renderPagina(); escolherMateria(String(S.mat)); }
        else renderPagina();
        focar('#atuSelMat');
        return;
      case 'seletor-fechar': S.seletor = null; renderPagina(); return;
      case 'sel-uni': if(S.seletor){ S.seletor.unidade = v; renderPagina(); } return;
      case 'analisar': {
        var z = S.seletor; if(!z || !z.unidade || z.enviando) return;
        z.enviando = true; renderPagina();
        analisar(z.unidade, z.materia).then(function(ok){
          if(S.seletor === z){ if(ok) S.seletor = null; else z.enviando = false; }
          renderPagina();
        });
        return;
      }
      // coluna
      case 'col-fechar': { var p = ponte(); if(p && typeof p.fecharColuna === 'function') p.fecharColuna(); atualizarBadge(); return; }
      case 'col-analisar': if(ED) analisar(ED.unit, ED.materia); return;
      case 'col-recarregar': recarregarColuna(); return;
      case 'expandir': if(ED){ ED.expandido = v; ED.acao = null; ED.motivo = null; ED.obs = ''; ED.nota = ''; renderColuna(); } return;
    }
  }
  function focar2(lugar, campo){
    var raiz = lugar === 'c' ? document.getElementById('ueAsideAtu') : S.root;
    var el = raiz ? raiz.querySelector('[data-atu-campo="' + campo + '"]') : null;
    if(el){ try { el.focus({ preventScroll: true }); } catch(_){ el.focus(); } }
  }
  function rolarParaDetalheSeEmpilhado(){
    var det = S.root && S.root.querySelector('.atu-detalhe');
    var lis = S.root && S.root.querySelector('.atu-lista');
    if(det && lis && det.offsetTop > lis.offsetTop + 20 && det.scrollIntoView) det.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function aoMudar(e, lugar){
    var t = e.target, campo = t.getAttribute && t.getAttribute('data-atu-campo');
    if(!campo) return;
    var v = t.type === 'checkbox' ? t.checked : t.value;
    var c = S.cfg, sid = t.getAttribute('data-v');
    switch(campo){
      case 'f-grav': S.grav = v; S.sel = null; S.acao = null; renderPagina(); return;
      case 'f-tipo': S.tipo = v; S.sel = null; S.acao = null; renderPagina(); return;
      case 'sel-mat': escolherMateria(v); return;
      case 'g-dia': c.geral.dia_semana = Number(v); break;
      case 'g-hora': c.geral.hora = Number(v); break;
      case 'g-rodada': c.geral.unidades_por_rodada = Number(v); break;
      case 'g-quem': c.geral.quem_recebe = v; break;
      case 'g-resumo': c.geral.resumo_sino = !!v; break;
      case 'g-alta': c.geral.aviso_alta = !!v; break;
      case 'm-ligado': if(c.mats[sid]){ c.mats[sid].ligado = !!v; if(!v && igual(c.addFonte, sid)) c.addFonte = null; } break;
      case 'm-freq': if(c.mats[sid]) c.mats[sid].frequencia = v; break;
      case 'm-prio': if(c.mats[sid]) c.mats[sid].prioridade = v; break;
      default: return;
    }
    if(S.vista === 'config') renderPagina();
  }
  function aoDigitar(e, lugar){
    var t = e.target, campo = t.getAttribute && t.getAttribute('data-atu-campo');
    if(!campo) return;
    var st = estadoDe(lugar);
    if(campo === 'obs' && st) st.obs = t.value;
    else if(campo === 'nota' && st) st.nota = t.value;
    else if(campo === 'chat'){ var cv = t.closest('.atu-conversa'); if(cv) RASC[cv.getAttribute('data-chave')] = t.value; }
    else if(campo === 'fonte-nova' && S.cfg){ S.cfg.novaFonte = t.value; }
    else if(campo === 'g-teto' && S.cfg && S.cfg.geral){ S.cfg.geral.teto_mes_brl = t.value === '' ? '' : Number(t.value); }
    else if(campo === 'm-teto' && S.cfg){ var m = S.cfg.mats[t.getAttribute('data-v')]; if(m){ m.teto_mes_brl = t.value === '' ? '' : Number(t.value); atualizarSoma(); } }
    else if(campo === 'sel-busca' && S.seletor){ S.seletor.busca = t.value; renderPagina(); }
  }
  function aoEnviar(e){
    var f = e.target;
    if(!f || f.getAttribute('data-atu-form') !== 'chat') return;
    e.preventDefault();
    var cv = f.closest('.atu-conversa'), campo = f.querySelector('[data-atu-campo="chat"]');
    if(!cv || !campo) return;
    enviarConversa(cv.getAttribute('data-chave'), cv.getAttribute('data-unit'), cv.getAttribute('data-alerta'), campo.value);
  }
  function aoTecla(e, lugar){
    var t = e.target, campo = t.getAttribute && t.getAttribute('data-atu-campo');
    if(!campo) return;
    if(campo === 'fonte-nova'){
      if(e.key === 'Enter'){ e.preventDefault(); adicionarFonte(S.cfg.addFonte); }
      else if(e.key === 'Escape'){ e.preventDefault(); var era = S.cfg.addFonte; S.cfg.addFonte = null; S.cfg.erroFonte = ''; renderPagina(); focar('[data-atu="fonte-add"][data-v="' + era + '"]'); }
    } else if(campo === 'nota' && e.key === 'Enter'){
      e.preventDefault(); var st = estadoDe(lugar); if(st) resolverAlerta(st, alertaDoLugar(lugar));
    } else if((campo === 'nota' || campo === 'obs') && e.key === 'Escape'){
      var st2 = estadoDe(lugar); if(st2){ st2.acao = null; renderTudo(); }
    }
  }

  // ── Editor: ir para o trecho e destacar parágrafos ───────────────────────
  async function irParaTrecho(a){
    if(!a) return;
    if(typeof window.openUnitEditor !== 'function'){ toast('O editor de unidades não está disponível aqui.', 'error'); return; }
    PEND = { alerta: a, tentouSecao: null };
    var p = ponte();
    try {
      if(!p || !igual(p.unidade(), a.unit_id)) await window.openUnitEditor(Number(a.unit_id));
    } catch(e){ PEND = null; toast('Não consegui abrir a unidade no editor: ' + erroMsg(e), 'error'); return; }
    p = ponte();
    if(ED && igual(ED.unit, a.unit_id)){ ED.expandido = a.id; ED.acao = null; }
    if(p && typeof p.colunaAberta === 'function' && !p.colunaAberta() && typeof p.abrirColuna === 'function') p.abrirColuna();
    atualizarBadge();
    renderColuna();
    seguirPendente();
  }
  function seguirPendente(){
    if(!PEND) return;
    var p = ponte(); if(!p || !igual(p.unidade(), PEND.alerta.unit_id)) return;
    var a = PEND.alerta;
    var alvo = localizar(a, p.blocos() || [], true);
    var sec = alvo.secao_id;
    if(sec != null && !igual(p.secao(), sec) && !igual(PEND.tentouSecao, sec) && typeof window.ueSelectSection === 'function'){
      PEND.tentouSecao = sec;
      window.ueSelectSection(sec);              // o próximo aoDesenharBlocos() continua daqui
      return;
    }
    PEND = null;
    if(alvo.bloco) abrirBloco(alvo.bloco.id);
    destacar();
    if(alvo.bloco && alvo.indice != null){
      var ta = document.getElementById('ue-ptext-' + alvo.bloco.id + '-' + alvo.indice);
      if(ta){ piscar(conteinerParagrafo(ta, alvo.bloco.id, alvo.indice)); return; }
    }
    if(alvo.bloco && alvo.indice == null){
      var campo = campoNoBloco(alvo.bloco.id, a);
      if(campo){ piscar(campo); return; }
    }
    if(alvo.bloco && typeof window.ueScrollToBlock === 'function'){ window.ueScrollToBlock(alvo.bloco.id); return; }
    toast('Não achei o trecho na unidade. Ele pode ter sido apagado ou reescrito.', 'info');
  }
  // Rola só a lista de blocos do editor (scrollIntoView rolava também a janela do editor e cortava o topo).
  function rolarAte(el){
    var lista = document.getElementById('ueBlocksList');
    if(!lista || !lista.contains(el)){ if(el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); return; }
    var r = el.getBoundingClientRect(), rl = lista.getBoundingClientRect();
    var alvo = lista.scrollTop + (r.top - rl.top) - Math.max(0, (rl.height - r.height) / 2);
    lista.scrollTo({ top: Math.max(0, alvo), behavior: 'smooth' });
  }
  // Blocos que não são texto (pontos-chave, tabela, linha do tempo...): o campo do editor com mais palavras do trecho.
  function campoNoBloco(blocoId, a){
    var card = document.querySelector('[data-block-card][data-block-id="' + String(blocoId).replace(/"/g, '') + '"]');
    if(!card) return null;
    var ref = palavras(a.trecho_atual || ''), nRef = Object.keys(ref).length;
    if(!nRef) return null;
    var melhor = null;
    var campos = card.querySelectorAll('textarea, input[type="text"], input:not([type]), [contenteditable="true"]');
    for(var i = 0; i < campos.length; i++){
      var c = campos[i];
      var v = c.tagName === 'TEXTAREA' || c.tagName === 'INPUT' ? c.value : c.textContent;
      var sc = emComum(palavras(v || ''), ref);
      if(!melhor || sc > melhor.sc) melhor = { c: c, sc: sc };
    }
    if(!melhor || melhor.sc < Math.min(4, Math.max(2, Math.ceil(nRef * 0.4)))) return null;
    return melhor.c.closest('.field') || melhor.c.parentElement;
  }
  // Bloco recolhido no editor: abre antes de procurar o campo.
  function abrirBloco(blocoId){
    var corpo = document.getElementById('ue-block-body-' + blocoId);
    if(corpo && corpo.style.display === 'none'){
      var tg = document.querySelector('[data-block-toggle="' + String(blocoId).replace(/"/g, '') + '"]');
      if(tg) tg.click();
    }
  }
  function piscar(cont){
    rolarAte(cont);
    cont.classList.remove('atu-para-pisca'); void cont.offsetWidth; cont.classList.add('atu-para-pisca');
    setTimeout(function(){ cont.classList.remove('atu-para-pisca'); }, 1700);
  }
  function conteinerParagrafo(ta, blocoId, indice){
    var tag = document.getElementById('ue-ptag-' + blocoId + '-' + indice);
    var el = ta.parentElement;
    while(el && el !== document.body){
      if(el.tagName === 'DIV' && (!tag || el.contains(tag))) return el;
      el = el.parentElement;
    }
    return ta.parentElement || ta;
  }
  function limparDestaques(){
    var marcados = document.querySelectorAll('.atu-para-marcado');
    for(var i = 0; i < marcados.length; i++){ marcados[i].classList.remove('atu-para-marcado'); marcados[i].removeAttribute('data-atu-alertas'); }
    var avisos = document.querySelectorAll('[data-atu-aviso]');
    for(var j = 0; j < avisos.length; j++) avisos[j].parentNode.removeChild(avisos[j]);
  }
  function destacar(){
    limparDestaques();
    var p = ponte();
    if(!ED || !p || !igual(p.unidade(), ED.unit)) return;
    var blocos = p.blocos() || [], secAtual = p.secao();
    var porConteiner = [];
    ED.alertas.forEach(function(a){
      var alvo = localizar(a, blocos, true);
      if(!alvo.bloco || !igual(alvo.secao_id, secAtual)) return;
      var cont = null;
      if(alvo.indice != null){
        var ta = document.getElementById('ue-ptext-' + alvo.bloco.id + '-' + alvo.indice);
        if(ta) cont = conteinerParagrafo(ta, alvo.bloco.id, alvo.indice);
      } else cont = campoNoBloco(alvo.bloco.id, a);   // pontos-chave, tabela, linha do tempo...
      if(!cont) return;
      var item = porConteiner.filter(function(x){ return x.cont === cont; })[0];
      if(!item){ item = { cont: cont, alertas: [] }; porConteiner.push(item); }
      item.alertas.push(a);
    });
    porConteiner.forEach(function(item){
      item.cont.classList.add('atu-para-marcado');
      var aviso = document.createElement('div');
      aviso.className = 'atu atu-para-aviso';
      aviso.setAttribute('data-atu-aviso', '1');
      aviso.innerHTML = item.alertas.map(function(a){
        return '<span class="chip chip-warn"><span class="dot"></span>Alerta do agente · ' + esc(TIPOS[a.tipo] || a.tipo) + '</span>' +
          '<button type="button" class="atu-link" data-atu-ver="' + esc(a.id) + '">Ver o alerta</button>';
      }).join('') + '<span class="field-help">O agente não altera o texto. Edite aqui mesmo, se concordar.</span>';
      aviso.addEventListener('click', function(e){
        var b = e.target.closest('[data-atu-ver]'); if(!b || !ED) return;
        ED.expandido = b.getAttribute('data-atu-ver'); ED.acao = null;
        var pp = ponte(); if(pp && typeof pp.abrirColuna === 'function' && !pp.colunaAberta()) pp.abrirColuna();
        atualizarBadge();
        renderColuna();
      });
      item.cont.parentNode.insertBefore(aviso, item.cont);
    });
  }

  // ── Coluna no editor ─────────────────────────────────────────────────────
  function atualizarBadge(){
    var n = ED ? ED.alertas.length : 0;
    var badge = document.getElementById('ueAtuBadge');
    if(badge){ badge.textContent = n > 99 ? '99+' : String(n); badge.hidden = n === 0; }
    var btn = document.getElementById('ueAtuBtn');
    if(btn){
      btn.setAttribute('aria-label', 'Atualizações desta unidade' + (n ? ', ' + plural(n, 'alerta aberto', 'alertas abertos') : ''));
      var p = ponte();
      if(p && typeof p.colunaAberta === 'function') btn.setAttribute('aria-pressed', p.colunaAberta() ? 'true' : 'false');
    }
  }
  function ligarColuna(aside){
    if(!aside || aside.__atuLigado) return;
    aside.__atuLigado = true;
    aside.addEventListener('click', function(e){ aoClicar(e, 'c', aside); });
    aside.addEventListener('input', function(e){ aoDigitar(e, 'c'); });
    aside.addEventListener('submit', function(e){ aoEnviar(e); });
    aside.addEventListener('keydown', function(e){ aoTecla(e, 'c'); });
  }
  function renderColuna(){
    var aside = document.getElementById('ueAsideAtu');
    if(!aside || !ED) return;
    ligarColuna(aside);
    var root = aside.firstElementChild;
    if(!root || !root.classList.contains('atu-coluna')){ aside.innerHTML = '<div class="atu atu-coluna"></div>'; root = aside.firstElementChild; }
    pintar(root, htmlColuna());
  }
  async function materiaDaUnidade(u){
    var p = ponte();
    if(p && igual(p.unidade(), u) && typeof window._ueMateriaDaUnidade === 'function'){
      try { var s = window._ueMateriaDaUnidade(); if(s && s.id != null) return String(s.id); } catch(_){}
    }
    if(CACHE.unidadeMateria[String(u)]) return CACHE.unidadeMateria[String(u)];
    if(!CACHE.painel) await lerPainel();
    await Promise.all(visiveis().map(function(s){ return unidadesDa(s).catch(function(){ return []; }); }));
    return CACHE.unidadeMateria[String(u)] || null;
  }
  async function recarregarColuna(){
    var ed = ED; if(!ed) return;
    var u = ed.unit;
    try {
      var r = await Promise.all([
        dados(ia().from('atu_alertas').select('*').eq('unit_id', u).eq('status', 'aberto')),
        dados(ia().from('atu_analises').select(COLS_AN).eq('unit_id', u).order('criado_em', { ascending: false }).limit(6)),
        dados(ia().from('atu_mensagens').select('*').eq('unit_id', u).order('criado_em')),
        CACHE.painel ? null : lerPainel().catch(function(){ return null; }),
        CACHE.materias ? null : lerMaterias().catch(function(){ return null; }),
        lerMe()
      ]);
      if(ED !== ed) return;
      var alertas = ordenar(r[0] || [], 'aberto');
      var analises = r[1] || [];
      analises.forEach(function(row){
        if(EM_CURSO[row.status]){ AN.linhas[row.id] = row; acompanhar(row.id); }
        else if(AN.linhas[row.id]) AN.linhas[row.id] = row;
      });
      ed.ultima = analises.filter(function(x){ return x.status === 'pronta'; })[0] || null;
      var msgs = r[2] || [];
      trocarMsgs(msgs, unicos(['u:' + u].concat(alertas.map(function(a){ return String(a.id); })).concat(msgs.map(chaveMsg))));
      var sid = alertas.length ? alertas[0].subject_id : (analises.length && analises[0].subject_id != null ? analises[0].subject_id : null);
      if(sid == null) sid = await materiaDaUnidade(u);
      ed.materia = sid != null ? String(sid) : null;
      if(ed.materia && !CACHE.unidades[ed.materia]) await unidadesDa(ed.materia).catch(function(){ return []; });
      await lerUsuarios(msgs.map(function(m){ return m.autor; }));
      if(ED !== ed) return;
      ed.alertas = alertas;
      ed.erro = null;
    } catch(e){
      if(ED !== ed) return;
      ed.erro = erroMsg(e);
    }
    ed.carregando = false; ed.carregou = true;
    if(ed.expandido && !ed.alertas.some(function(a){ return igual(a.id, ed.expandido); })) ed.expandido = null;
    if(!ed.expandido && ed.alertas[0]) ed.expandido = ed.alertas[0].id;
    atualizarBadge();
    renderColuna();
    destacar();
    seguirPendente();
  }
  function analiseDaColuna(){
    var linhas = Object.keys(AN.linhas).map(function(id){ return AN.linhas[id]; })
      .filter(function(r){ return igual(r.unit_id, ED.unit); })
      .sort(function(a, b){ return tempo(b.criado_em) - tempo(a.criado_em); });
    var rodando = linhas.filter(function(r){ return EM_CURSO[r.status]; })[0] || null;
    var resultado = rodando ? null : (linhas.filter(function(r){ return AN.vistas[r.id] === true; })[0] || null);
    return { rodando: rodando, resultado: resultado };
  }
  function htmlColuna(){
    var e = ED;
    var h = '<div class="atu-topo-card"><div><span class="card-label">Agente de atualizações</span><span class="atu-col-tit">Atualizações desta unidade</span></div>' +
      '<button type="button" class="btn-icon" data-atu="col-fechar" aria-label="Fechar a coluna" style="width:32px;height:32px">' + IC.fechar + '</button></div>';
    if(!e.carregou) return h + '<div class="atu-carregando"><span class="spinner" aria-hidden="true"></span>Carregando os alertas desta unidade.</div>';
    if(e.erro){
      h += '<div class="alert alert-erro" role="alert">' + IC.aviso + '<div class="alert-body"><span class="alert-text">' + esc(e.erro) + '</span></div></div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-atu="col-recarregar">Tentar de novo</button>';
    }
    var an = analiseDaColuna();
    if(an.rodando){
      h += '<div class="card atu-an" data-atu-an="' + esc(an.rodando.id) + '" data-atu-lugar="c" style="padding:1rem 1.1rem">' + htmlAnaliseCorpo(an.rodando, 'c') + '</div>';
    } else {
      var mat = e.materia ? (CACHE.materias || {})[e.materia] : null;
      var desligada = mat && (!mat.ligado || !(mat.dominios || []).length);
      var ajuda = 'Lê a unidade inteira e confere os dados nas fontes oficiais' + (e.materia ? ' de ' + nomeMateria(e.materia) : '') + '. ' +
        (estimativa() ? estimativa() + ' ' : '') + 'Última análise: ' + (e.ultima ? dataBR(e.ultima.terminado_em || e.ultima.criado_em) : 'nunca') + '.' +
        (desligada ? ' O agente está desligado na rotina desta matéria.' : '');
      h += '<div class="atu-col-analisar"><button type="button" class="btn btn-full" data-atu="col-analisar">' + IC.lupa + 'Analisar esta unidade agora</button>' +
        '<span class="field-help">' + esc(ajuda) + '</span>';
      if(!an.resultado && e.ultima && Array.isArray(e.ultima.conferidos) && e.ultima.conferidos.length) h += htmlConferidos(e.ultima, 'u');
      h += '</div>';
      if(an.resultado) h += '<div class="card atu-an" data-atu-an="' + esc(an.resultado.id) + '" data-atu-lugar="c" style="padding:1rem 1.1rem">' + htmlAnaliseCorpo(an.resultado, 'c') + '</div>';
    }
    h += '<div class="sub-h"><span class="sub-h-text">Abertos · ' + e.alertas.length + '</span><span class="sub-h-rule"></span></div>';
    if(!e.alertas.length) h += '<p class="field-help">Nenhum alerta aberto nesta unidade.</p>';
    h += e.alertas.map(function(a){ return igual(a.id, e.expandido) ? htmlCartaoColuna(a) : htmlItemColuna(a); }).join('');
    var aberto = e.alertas.filter(function(a){ return igual(a.id, e.expandido); })[0];
    h += htmlConversa({
      chave: aberto ? String(aberto.id) : 'u:' + e.unit, unit: e.unit, alerta: aberto ? aberto.id : '',
      titulo: 'Conversa com o agente',
      ajuda: aberto ? 'Sobre o alerta aberto acima.' : 'Sobre esta unidade.',
      vazio: aberto ? 'Pergunte sobre a fonte, peça outra redação ou questione se o ponto cai na prova.' : 'Pergunte sobre a unidade ou peça uma conferência de um dado.',
      sugestoes: false, coluna: true, placeholder: 'Pergunte ou peça uma análise', rotuloCampo: 'Mensagem ao agente'
    });
    return h;
  }
  function chipsColuna(a){
    var sec = rotuloSecao(a, true);
    return chipGrav(a.gravidade) + '<span class="chip chip-accent">' + esc(TIPOS[a.tipo] || a.tipo) + '</span>' +
      (sec ? '<span class="chip">' + esc(sec) + '</span>' : '') + chipNovo(a);
  }
  function htmlCartaoColuna(a){
    var fonte = Array.isArray(a.fontes) && a.fontes.length ? a.fontes[0] : null;
    var h = '<div class="alerta-item is-selected atu-aberto-card">' +
      '<span class="atu-chips">' + chipsColuna(a) + '</span>' +
      '<span class="atu-item-tit">' + esc(a.titulo) + '</span>' +
      '<span class="label" style="margin-top:.2rem">Trecho proposto</span>' +
      '<p class="trecho trecho-novo atu-trecho-sm">' + esc(a.trecho_proposto) + '</p>' +
      (fonte ? htmlFonte(fonte, true) : '');
    if(ED.acao === 'resolver') h += htmlResolver(ED, true);
    else if(ED.acao === 'descartar') h += htmlDescarte(ED, true);
    else h += '<span class="atu-botoes atu-botoes-sm">' +
      '<button type="button" class="btn btn-ghost btn-sm" data-atu="ir" data-v="' + esc(a.id) + '">Ir para o trecho</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-atu="resolver">Resolvido</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-atu="descartar">Descartar</button></span>';
    return h + '</div>';
  }
  function htmlItemColuna(a){
    return '<button type="button" class="alerta-item atu-item-col" data-atu="expandir" data-v="' + esc(a.id) + '" aria-expanded="false">' +
      '<span class="atu-item-txt"><span class="atu-chips">' + chipsColuna(a) + '</span>' +
      '<span class="atu-item-tit">' + esc(a.titulo) + '</span></span></button>';
  }

  // ── API pública ──────────────────────────────────────────────────────────
  function montarPagina(el){
    if(!el) return Promise.resolve();
    injetarCSS();
    if(S.el !== el || !S.root || !el.contains(S.root)){
      S.el = el;
      el.innerHTML = '<div class="atu atu-pagina"></div>';
      S.root = el.firstElementChild;
      ligarPagina(el);
      renderPagina();
    }
    return carregarPagina();
  }
  async function contar(){
    try {
      var r = await ia().from('atu_alertas').select('id', { count: 'exact', head: true }).eq('status', 'aberto');
      if(r.error) throw new Error(r.error.message);
      return Number(r.count) || 0;
    } catch(e){
      if(window.console) console.warn('[Atualizações] contar:', erroMsg(e));
      return 0;
    }
  }
  async function avisosSino(){
    try {
      var desde = new Date(Date.now() - 30 * 864e5).toISOString();
      var rows = await dados(ia().from('atu_avisos').select('id, tipo, titulo, texto, criado_em, payload, subject_id')
        .gte('criado_em', desde).order('criado_em', { ascending: false }).limit(20));
      rows = rows || [];
      var lidos = {};
      if(rows.length){
        (await dados(ia().from('atu_avisos_lidos').select('aviso_id').in('aviso_id', rows.map(function(a){ return a.id; })))).forEach(function(l){ lidos[String(l.aviso_id)] = 1; });
      }
      return rows.map(function(a){
        return { id: a.id, tipo: a.tipo, titulo: a.titulo, texto: a.texto || '', criado_em: a.criado_em, payload: a.payload || {}, lido: !!lidos[String(a.id)] };
      });
    } catch(e){
      if(window.console) console.warn('[Atualizações] avisos do sino:', erroMsg(e));
      return [];
    }
  }
  function irParaPagina(){
    var t = document.querySelector('.tab[data-tab="atualizacoes"]');
    if(t){
      var grupo = t.closest('[id^="group-"]');
      var gBtn = grupo ? document.querySelector('.tab-group[data-group="' + grupo.id.slice(6) + '"]') : null;
      var sup = gBtn ? gBtn.closest('[id^="super-"]') : null;
      var sBtn = sup ? document.querySelector('.super-tab[data-super="' + sup.id.slice(6) + '"]') : null;
      if(sBtn && !sBtn.classList.contains('active')) sBtn.click();
      if(gBtn && !gBtn.classList.contains('active')) gBtn.click();
      t.click();
    }
    if(S.el) carregarPagina();
  }
  async function abrirAviso(aviso){
    if(!aviso) return;
    if(!aviso.lido && aviso.id){
      try {
        var r = await ia().from('atu_avisos_lidos').insert({ aviso_id: aviso.id });
        if(r.error && r.error.code !== '23505' && window.console) console.warn('[Atualizações] marcar lido:', r.error.message);
        else aviso.lido = true;
      } catch(_){}
    }
    S.foco = { tipo: aviso.tipo, payload: aviso.payload || {} };
    S.vista = 'lista'; S.cfg = null;
    irParaPagina();
  }
  function aoAbrirEditor(unitId){
    injetarCSS();
    if(unitId == null) return Promise.resolve();
    if(ED && igual(ED.unit, unitId)) return recarregarColuna();
    ED = { unit: unitId, alertas: [], expandido: null, acao: null, motivo: null, obs: '', nota: '', ocupado: false,
      materia: null, ultima: null, carregou: false, erro: null };
    atualizarBadge();
    renderColuna();
    return recarregarColuna();
  }
  function aoFecharEditor(){
    ED = null; PEND = null;
    limparDestaques();
    atualizarBadge();
  }
  function aoDesenharBlocos(){
    injetarCSS();
    destacar();
    seguirPendente();
  }
  function alternarColuna(){
    var p = ponte(); if(!p) return;
    if(p.colunaAberta()){ p.fecharColuna(); atualizarBadge(); return; }
    p.abrirColuna();
    atualizarBadge();
    var u = p.unidade();
    if(u != null && (!ED || !igual(ED.unit, u))) aoAbrirEditor(u);
    else renderColuna();
  }

  window.Atualizacoes = {
    montarPagina: montarPagina,
    contar: contar,
    avisosSino: avisosSino,
    abrirAviso: abrirAviso,
    aoAbrirEditor: aoAbrirEditor,
    aoFecharEditor: aoFecharEditor,
    aoDesenharBlocos: aoDesenharBlocos,
    alternarColuna: alternarColuna
  };
})();
