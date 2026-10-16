#!/usr/bin/env node
// Páginas públicas das questões (pacote 7 · visitante, 16/10/2026) + sitemap.xml
//
// Roda no deploy (GitHub Actions) antes do `firebase deploy`. Lê as VISTAS DO VISITANTE (papel anônimo,
// SQL 87: enunciado e itens SEM gabarito e SEM comentário) e escreve:
//   q/<uuid>.html          uma página por questão de prova anterior: a QUESTÃO RESOLVE-SE NELA (como no
//                          QConcursos), com o MESMO bloco de questão do Banco (marcação, classes e CSS do app),
//                          mais tópicos do edital, questões relacionadas e os convites
//   q/materia-<slug>.html  uma página por matéria, com a nuvem de tópicos e as questões por tópico do edital
//   q/index.html           a porta de entrada (matérias, anos, contagens)
//   q/ubique.css           CSS: design system (ubique-saas-components.html, sem os componentes de questão do
//                          catálogo) + as regras do bloco de questão EXTRAÍDAS do index.html (o app) + layout da página
//   q/resolver.js          o script que resolve na página (de .github/scripts/resolver.js, com a chave anônima)
//   sitemap.xml            na raiz, com todas as páginas acima (+ landing e app)
// VISUAL: o cromo (nav, hero, seções, chips, cards, rodapé) é do design system; a questão é a do app, sem
// componente novo. O que é específico da página são regras de LAYOUT `.pub-*` no fim do CSS.
// Sem as vistas (SQL 87 ainda não rodou), sem rede ou com qualquer erro: escreve só o sitemap base e sai com 0.
// O deploy NUNCA para por causa daqui. Rodar localmente: node .github/scripts/gerar-paginas-questoes.mjs
// (q/ e sitemap.xml estão no .gitignore: nascem no deploy, não no repositório).
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://falcon.grupoubique.com.br';
const SUPABASE = 'https://kluqjqojxzpuiauuidwx.supabase.co';
const GTM = 'GTM-KPCF42J';
const HOJE = new Date().toISOString().slice(0, 10);
const PASTA = join(RAIZ, 'q');
const APP = `${BASE}/index.html`;
// CSS e script levam a versão (hash do conteúdo) no endereço: o navegador e a CDN não seguram a cópia velha depois do deploy.
let VERSAO_CSS = '', VERSAO_JS = '';
const versao = txt => createHash('sha1').update(txt).digest('hex').slice(0, 10);

const INDEX_HTML = readFileSync(join(RAIZ, 'index.html'), 'utf8');
// A chave anônima é pública (está no index.html); lida de lá para não existir em dois lugares.
function chaveAnon(){
  const m = /const KEY = '(eyJ[^']+)'/.exec(INDEX_HTML);
  if(!m) throw new Error('chave anônima não encontrada no index.html');
  return m[1];
}
const KEY = chaveAnon();
// A marca do topo é a mesma do app (SVG do botão .tb-brand).
const MARCA_SVG = (/<span class="tb-brand-logo">(<svg[\s\S]*?<\/svg>)<\/span>/.exec(INDEX_HTML) || [])[1] || '';
// Ícones da barra da questão e do bloco, os mesmos do app (Icons.statistics / Icons.comments / Icons.quiz).
function iconeDoApp(nome){
  const m = new RegExp(`\\b${nome}:\\s*'(<svg[^']*<\\/svg>)'`).exec(INDEX_HTML);
  return m ? m[1] : '';
}
const ICONE_STATS = iconeDoApp('statistics'), ICONE_COMENT = iconeDoApp('comments'), ICONE_QUIZ = iconeDoApp('quiz');
const ICONE_COMPARTILHAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>';

// ── CSS ──────────────────────────────────────────────────────────────────────
// Divide um CSS em blocos de topo [{sel, corpo}] respeitando chaves aninhadas (@media, @supports, @keyframes).
function blocosCss(txt){
  const out = [];
  txt = txt.replace(/\/\*[\s\S]*?\*\//g, '');
  let i = 0;
  while(i < txt.length){
    const j = txt.indexOf('{', i);
    if(j < 0) break;
    const sel = txt.slice(i, j).trim();
    let depth = 1, k = j + 1;
    while(k < txt.length && depth){ if(txt[k] === '{') depth++; else if(txt[k] === '}') depth--; k++; }
    out.push({ sel, corpo: txt.slice(j + 1, k - 1) });
    i = k;
  }
  return out;
}
// Mantém só os blocos cujo seletor passa no teste; dentro de @media/@supports filtra os filhos; @keyframes fica.
function filtrarCss(txt, teste){
  return blocosCss(txt).map(b => {
    if(/^@(media|supports|container)/.test(b.sel)){
      const dentro = filtrarCss(b.corpo, teste);
      return dentro.trim() ? `${b.sel}{\n${dentro}}` : '';
    }
    if(/^@keyframes/.test(b.sel)) return `${b.sel}{${b.corpo}}`;
    if(/^@/.test(b.sel)) return '';
    return b.sel.split(',').some(s => teste(s.trim())) ? `${b.sel}{${b.corpo}}` : '';
  }).filter(Boolean).join('\n');
}
// Design system inteiro, menos os componentes de questão do catálogo (a questão é a do app) e os botões (idem).
function cssDesignSystem(){
  const ds = readFileSync(join(RAIZ, 'ubique-saas-components.html'), 'utf8');
  const m = /<style[^>]*>([\s\S]*?)<\/style>/.exec(ds);
  if(!m) throw new Error('CSS do design system não encontrado em ubique-saas-components.html');
  const fora = /(^|[\s>+~(,])\.(q-[a-z-]+|ce-[a-z-]+|mcq[a-z-]*|exam-[a-z-]+|btn[a-z-]*)(?![a-zA-Z0-9_-])/;
  return filtrarCss(m[1], s => !fora.test(s));
}
// As regras do bloco de questão, do app (index.html): tokens, bloco, grupo, item, opções, satélite, barra de
// verificar, aviso de cota, folha de convite, aviso "copiado".
const TOKEN_APP = /(^|[\s>+~(,])(\.(block-wrap|block-header|block-header-lead|block-type|block-type-icon|block-title|block-desc|quiz-block|qb-intro|qz-[a-z-]+|q-[a-z-]+|gabfs-[a-z-]+|tpc[a-z0-9-]*|tg|tg-hash|btn-primary|btn-ghost|bf-limite|bf-cota|vis-[a-z-]+|ue-toast[a-z-]*)|#ueToastHost|body\[data-visitante\]|:root)(?![a-zA-Z0-9_-])/;
function cssApp(){
  const estilos = [...INDEX_HTML.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]);
  return filtrarCss(estilos.join('\n'), s => TOKEN_APP.test(s));
}
const CSS_PAGINA = `
/* ── layout das páginas públicas das questões (só medidas; os componentes são os do design system e do app) ── */
.page a{text-decoration:none}
.pub-main{max-width:1100px;margin:0 auto;padding:0 clamp(1rem,4vw,2.5rem)}
.pub-hero{max-width:none;padding:clamp(2.2rem,5vh,3.6rem) 0 clamp(1.2rem,3vh,1.8rem)}
.pub-hero .hero-title{max-width:30ch;font-size:clamp(1.7rem,3.2vw,2.6rem);line-height:1.15}
.pub-hero .hero-lede{margin-top:1.2rem}
.pub-hero .hero-meta{margin-top:1.6rem;padding-top:1.2rem}
.pub-sec{max-width:none;padding:clamp(1.2rem,3vh,2rem) 0}
.pub-sec .sec-head{margin-bottom:1.2rem;padding-bottom:.8rem}
.pub-crumbs{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-bottom:1rem}
.pub-crumbs a{color:var(--text-dim);text-decoration:none}.pub-crumbs a:hover{color:var(--accent)}
.pub-crumbs .hero-eyebrow{margin:0}.pub-crumbs .hero-eyebrow::before{display:none}
.nav-brand a{display:flex;align-items:center;gap:.8rem;text-decoration:none}
.nav-logo-svg{width:26px;height:26px;display:block;color:var(--accent)}.nav-logo-svg svg{width:100%;height:100%;fill:currentColor}
.nav-tools .btn-primary,.nav-tools .btn-ghost{white-space:nowrap}
.pub-questao .block-wrap{margin-bottom:0}
.pub-questao .block-header .block-title:empty{display:none}
.pub-questao .bf-cota{display:block;margin:.2rem 0 1rem}
.pub-fig{max-width:100%;height:auto;display:block;margin:1rem 0;border-radius:var(--radius)}
.pub-lista .list-item a{color:var(--text);text-decoration:none}.pub-lista .list-item a:hover{color:var(--accent)}
.pub-lista .list-item .pub-meta{display:block;font-family:var(--mono);font-size:.7rem;letter-spacing:.12em;color:var(--accent);margin-bottom:.15rem}
.pub-lista .list-item .pub-trecho{color:var(--text-dim)}
.pub-acoes{display:flex;gap:.7rem;flex-wrap:wrap;align-items:center;margin-top:1rem}
.cards-grid .card .pub-acoes{margin-top:auto;padding-top:1rem}
.pub-nota{font-family:var(--sans);font-weight:200;font-size:var(--fs-small);color:var(--text-mute);line-height:1.6;max-width:680px}
.pub-nota a{color:var(--accent);text-decoration:none;border-bottom:1px solid var(--accent-border)}.pub-nota a:hover{border-bottom-color:var(--accent)}
.pub-chip-n{font-family:var(--mono);font-size:.68rem;color:var(--accent);margin-left:.1rem}
.q-pill-btn.q-share-btn.is-copiado{color:var(--green);border-color:var(--green-border,rgba(93,212,159,.35))}
@media(max-width:600px){.nav-tools .btn-primary{padding:.45rem .8rem;font-size:.62rem}.pub-hero .hero-meta{gap:1.4rem}}
`;

async function tabela(schema, nome, select, ordem){
  const out = [], PASSO = 1000;
  for(let de = 0; ; de += PASSO){
    const url = `${SUPABASE}/rest/v1/${nome}?select=${encodeURIComponent(select)}&order=${encodeURIComponent(ordem)}`;
    const r = await fetch(url, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Accept-Profile': schema, Range: `${de}-${de + PASSO - 1}`, 'Range-Unit': 'items' } });
    if(!r.ok) throw new Error(`${schema}.${nome}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    const linhas = await r.json();
    out.push(...linhas);
    if(linhas.length < PASSO) break;
  }
  return out;
}

// ── texto ────────────────────────────────────────────────────────────────────
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plano = s => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const corta = (s, n) => { s = plano(s); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const slug = s => plano(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const dois = n => String(n ?? '').padStart(2, '0');
// enunciados e itens: HTML simples do editor (sem script, sem eventos) ou texto puro em parágrafos
function desescapa(s){
  s = String(s ?? '');
  if(/&lt;\/?[a-z][\s\S]*?&gt;/i.test(s) && !/<[a-z][\s\S]*?>/i.test(s)){
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  }
  return s;
}
function texto(s){
  s = desescapa(String(s ?? '')).trim();
  if(!s) return '';
  if(/<[a-z][\s\S]*>/i.test(s)){
    return s.replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, '')
            .replace(/<(script|style|iframe|object|embed|form)[^>]*>/gi, '')
            .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
            .replace(/javascript:/gi, '');
  }
  return s.split(/\n{2,}/).map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('');
}
const ptData = d => { try{ return new Date(d).toISOString().slice(0, 10); }catch(_){ return HOJE; } };
// o texto pelo qual o candidato procura a questão: o enunciado quando diz algo; senão o 1º item
const GENERICO = /^(julgue|acerca|a respeito|com base|considerando|no que (se refere|diz|concerne|tange)|tendo em vista|em relação|com relação|a partir|leia (com atenção )?o texto|no que se refere|quanto a|relativamente|à luz|mark the|judge the|consider(ing)? the|based on the text|according to the text|in the text|regarding|with regard|taking into account|read the text|the text above|concerning)/i;
const frases = s => plano(s).split(/(?<=[.!?;:])\s+/).map(f => f.trim()).filter(Boolean);
// a frase pela qual o candidato procura a questão: do enunciado, pulando as frases de comando ("Julgue os itens…",
// "Considering the text…"); discursiva: o comando; sem frase própria, o 1º item. Repetida entre questões: o 1º item.
function textoDeBusca(x){
  const it = plano(x.itens[0] && x.itens[0].assertiva);
  const cands = frases(x.q.enunciado).concat(x.q.type === 'essay' ? frases(x.q.command) : []);
  const propria = cands.find(f => f.length >= 40 && !GENERICO.test(f));
  const escolhido = propria || (x.q.type === 'essay' ? (cands.find(f => f.length >= 40) || cands[0]) : '');
  if(escolhido && !REPETIDOS.has(escolhido)) return escolhido;
  return it || escolhido || plano(x.q.command) || plano(x.q.enunciado);
}
let REPETIDOS = new Set();
function marcarRepetidos(questoes){
  const n = new Map();
  questoes.forEach(x => { const cands = frases(x.q.enunciado); const f = cands.find(f => f.length >= 40 && !GENERICO.test(f)); if(f) n.set(f, (n.get(f) || 0) + 1); });
  REPETIDOS = new Set([...n.entries()].filter(([, c]) => c > 1).map(([f]) => f));
}

// ── concha comum (nav, hero, footer do design system) ────────────────────────
function concha({ titulo, descricao, url, corpo, jsonld, scripts }){
  const ld = (jsonld || []).map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="article"><meta property="og:site_name" content="Falcon · Ubique CACD">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(descricao)}"><meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Outfit:wght@200;300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${BASE}/q/ubique.css?v=${VERSAO_CSS}">
${ld}
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM}');</script>
</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<div class="page">
<nav class="nav">
  <div class="nav-brand">
    <a href="${BASE}/landing.html" aria-label="Falcon · Ubique CACD">
      <span class="nav-logo-svg">${MARCA_SVG}</span>
      <span class="nav-lockup"><span class="nav-lockup-main">Ubique</span><span class="nav-lockup-sub">Falcon · CACD</span></span>
    </a>
  </div>
  <div class="nav-links">
    <a class="nav-link" href="${BASE}/q/index.html">Questões</a>
    <a class="nav-link" href="${APP}#/inicio">Explorar sem conta</a>
    <a class="nav-link" href="${APP}#/login">Entrar</a>
  </div>
  <div class="nav-tools"><a class="btn-primary" href="${APP}#/login?criar=1">Criar conta grátis</a></div>
</nav>
<main class="pub-main">
${corpo}
</main>
<footer class="ftr">
  <div class="ftr-l"><span class="ftr-mark">Falcon</span><span class="ftr-sub">Ubique CACD · Grupo Ubique</span></div>
  <div class="ftr-r"><a class="nav-link" href="${BASE}/landing.html">Conheça a Falcon</a><a class="nav-link" href="${BASE}/q/index.html">Questões do CACD</a><a class="nav-link" href="${APP}#/login">Entrar</a></div>
</footer>
</div>
${scripts || ''}
</body>
</html>`;
}
const secHead = (num, titulo, nota) => `<div class="sec-head"><div class="sec-head-l"><span class="sec-num">${esc(num)}</span><h2 class="sec-title">${esc(titulo)}</h2></div>${nota ? `<p class="sec-note">${esc(nota)}</p>` : ''}</div>`;
const trilha = (itens) => `<div class="pub-crumbs"><span class="hero-eyebrow">${itens.map((it, i) => (it.href ? `<a href="${esc(it.href)}">${esc(it.nome)}</a>` : `<span>${esc(it.nome)}</span>`) + (i < itens.length - 1 ? ' · ' : '')).join('')}</span></div>`;

// ── dados ────────────────────────────────────────────────────────────────────
async function carregar(){
  // Teste local sem servidor: FALCON_DADOS=<arquivo.json> com as mesmas chaves do objeto devolvido aqui.
  if(process.env.FALCON_DADOS){
    const j = JSON.parse(readFileSync(process.env.FALCON_DADOS, 'utf8'));
    return Object.assign({ cotaVisitante: 3, cotaGratis: 10 }, j);
  }
  const [subjects, exams, editais, topics, cfgRows] = await Promise.all([
    tabela('conteudo', 'subjects', 'id,subject,sigla,slug,position', 'id.asc'),
    tabela('concursos', 'exams', 'id,sigla,name', 'id.asc'),
    tabela('concursos', 'editais', 'id,exam_id,name,year', 'id.asc'),
    tabela('concursos', 'edital_topics', 'id,edital_id,parent_id,code,title,subject_id,position', 'id.asc'),
    tabela('conteudo', 'platform_config', 'visitante_questoes_dia,gratis_questoes_dia', 'id.asc').catch(() => []),
  ]);
  // As vistas do visitante só existem depois do SQL 87: sem elas, o chamador escreve o sitemap base e sai.
  const [questions, tfItems, refTexts, qRef, qTop, iTop, qSub] = await Promise.all([
    tabela('questoes', 'v_visitante_questions', '*', 'id.asc'),
    tabela('questoes', 'v_visitante_tf_items', '*', 'id.asc'),
    tabela('questoes', 'v_visitante_reference_texts', '*', 'id.asc'),
    tabela('questoes', 'v_visitante_question_reference_texts', '*', 'question_id.asc,reference_text_id.asc'),
    tabela('questoes', 'v_visitante_question_edital_topics', '*', 'question_id.asc,edital_topic_id.asc'),
    tabela('questoes', 'v_visitante_tf_item_edital_topics', '*', 'tf_item_id.asc,edital_topic_id.asc'),
    tabela('questoes', 'v_visitante_question_subjects', '*', 'question_id.asc,subject_id.asc'),
  ]);
  const cfg = cfgRows[0] || {};
  return { subjects, exams, editais, topics, questions, tfItems, refTexts, qRef, qTop, iTop, qSub,
           cotaVisitante: cfg.visitante_questoes_dia ?? 3, cotaGratis: cfg.gratis_questoes_dia ?? 10 };
}

function montar(d){
  const subjById = new Map(d.subjects.map(s => [String(s.id), s]));
  const examById = new Map(d.exams.map(e => [String(e.id), e]));
  const topicById = new Map(d.topics.map(t => [String(t.id), t]));
  const raizDe = t => { let x = t, n = 0; while(x && x.parent_id != null && n++ < 20){ const p = topicById.get(String(x.parent_id)); if(!p) break; x = p; } return x; };
  const itensPorQ = new Map();
  d.tfItems.forEach(t => { const k = String(t.question_id); if(!itensPorQ.has(k)) itensPorQ.set(k, []); itensPorQ.get(k).push(t); });
  itensPorQ.forEach(l => l.sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0) || a.id - b.id));
  const refById = new Map(d.refTexts.map(r => [String(r.id), r]));
  const refsPorQ = new Map();
  d.qRef.forEach(l => { const k = String(l.question_id); if(!refsPorQ.has(k)) refsPorQ.set(k, []); refsPorQ.get(k).push(l); });
  refsPorQ.forEach(l => l.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
  const topPorQ = new Map();
  const addTop = (k, id) => { if(!topicById.has(String(id))) return; if(!topPorQ.has(k)) topPorQ.set(k, new Set()); topPorQ.get(k).add(String(id)); };
  d.qTop.forEach(l => addTop(String(l.question_id), l.edital_topic_id));
  const qDoItem = new Map(d.tfItems.map(t => [String(t.id), String(t.question_id)]));
  d.iTop.forEach(l => { const q = qDoItem.get(String(l.tf_item_id)); if(q) addTop(q, l.edital_topic_id); });
  const subsExtra = new Map();
  d.qSub.forEach(l => { const k = String(l.question_id); if(!subsExtra.has(k)) subsExtra.set(k, []); subsExtra.get(k).push(String(l.subject_id)); });

  const questoes = d.questions.filter(q => q && q.id && q.ativo !== false && !q.questao_simulada
      && (q.origin || q.year) && ['true_false', 'essay', 'multiple_choice'].includes(q.type)
      && (q.type !== 'true_false' || (itensPorQ.get(String(q.id)) || []).length))
    .map(q => {
      const k = String(q.id);
      const subj = subjById.get(String(q.subject_id)) || subjById.get(String((subsExtra.get(k) || [])[0])) || null;
      const exam = examById.get(String(q.exam_id || 'cacd')) || { id: 'cacd', sigla: 'CACD', name: 'CACD' };
      const tops = [...(topPorQ.get(k) || [])].map(id => topicById.get(id)).filter(Boolean);
      const raizes = new Map(), raizPorTop = new Map();
      tops.forEach(t => { const r = raizDe(t); if(r){ raizes.set(String(r.id), r); raizPorTop.set(String(t.id), String(r.id)); } });
      const itens = itensPorQ.get(k) || [];
      const refs = (refsPorQ.get(k) || []).map(l => refById.get(String(l.reference_text_id))).filter(Boolean);
      return { q, k, subj, exam, tops, raizes: [...raizes.values()], raizPorTop, itens, refs,
               sigla: exam.sigla || exam.name || 'CACD', ano: q.year || '', numero: q.numero,
               materia: subj ? subj.subject : 'CACD', mslug: subj ? (subj.slug || slug(subj.subject)) : 'geral' };
    });
  return { questoes, subjById };
}

// ── a questão, com a marcação do Banco (Blocks.quiz do app) ──────────────────
function blocoQuestao(x, app){
  const tag = `${x.sigla} ${x.ano}`.trim();
  const refHtml = x.refs.map(r => {
    const corpo = texto(r.text);
    const fonte = [r.author, r.source].filter(Boolean).join('. ');
    const textoHtml = (r.title || fonte)
      ? `<div class="q-ref-text">${r.title ? `<div class="q-ref-title">${esc(plano(r.title))}</div>` : ''}<div class="q-ref-text-html">${corpo}</div>${fonte ? `<div class="q-ref-source">${esc(plano(fonte))}</div>` : ''}</div>`
      : `<div class="q-ref-text q-ref-text-html">${corpo}</div>`;
    const media = r.image_url ? `<div class="q-ref-media"><img src="${esc(r.image_url)}" alt="" loading="lazy"></div>` : '';
    return `<div class="q-ref">${textoHtml}${media}</div>`;
  }).join('');
  const comando = (x.q.enunciado || (x.q.type === 'essay' && x.q.command))
    ? `<div class="q-group-command"><div class="q-group-label">${texto(x.q.enunciado)}${x.q.type === 'essay' && x.q.command ? texto(x.q.command) : ''}${x.q.image_url ? `<img class="pub-fig" src="${esc(x.q.image_url)}" alt="">` : ''}</div></div>`
    : '';
  const barra = `<div class="q-actions-bar">
      <button type="button" class="q-pill-btn q-data-btn" data-action="q-data" data-tip="Estatísticas e dificuldade, na Falcon" aria-label="Estatísticas">${ICONE_STATS}</button>
      <button type="button" class="q-pill-btn q-comments-btn" data-action="q-comments" data-tip="Comentários dos alunos, na Falcon" aria-label="Comentários">${ICONE_COMENT}</button>
      <button type="button" class="q-pill-btn q-share-btn" data-action="q-share" data-tip="Compartilhar esta questão" aria-label="Compartilhar esta questão">${ICONE_COMPARTILHAR}</button>
      <button class="q-show-key" data-action="show-key" data-tip="Ver gabarito desta questão no painel lateral" aria-label="Ver gabarito" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></button>
    </div>`;
  const itensHtml = x.itens.map((t, i) => `<article class="q-item is-tf" data-item-id="${esc(t.id)}" id="item-${esc(t.id)}">
      <div class="q-num">${dois(t.numero ?? (i + 1))}</div>
      <div class="q-body">
        <div class="q-badges">${t.anulada ? '<span class="q-badge q-badge-anulada" data-tip="Item anulado pela banca">Anulada</span>' : ''}<span class="q-badge q-badge-ref" data-tip="Prova: ${esc(tag)}">${esc(tag)}</span></div>
        ${t.image_url ? `<div class="q-item-ref"><img src="${esc(t.image_url)}" alt="" loading="lazy" style="max-width:100%;border-radius:var(--radius)"></div>` : ''}
        <div class="q-assertion">${texto(t.assertiva)} </div>
      </div>
      <div class="q-options is-tf">
        <button class="q-option" data-value="Certo" data-idx="0"><span class="q-option-mark">C</span></button>
        <button class="q-option" data-value="Errado" data-idx="1"><span class="q-option-mark">E</span></button>
      </div>
      <div class="q-actions"></div>
      ${barra}
      <div class="qd-panel" data-qd-panel hidden><div class="qd-panel-inner"></div></div>
    </article>`).join('');
  const discursiva = x.q.type === 'essay' ? `<article class="q-item" data-discursiva>
      <div class="q-num">${dois(x.numero ?? 1)}</div>
      <div class="q-body"><div class="q-badges"><span class="q-badge q-badge-ref">${esc(tag)}</span><span class="q-badge q-badge-tag">Discursiva</span></div>
        <div class="q-assertion">Resposta escrita${x.q.max_lines ? `, em até ${esc(x.q.max_lines)} linhas` : ''}. Na Falcon, você escreve e recebe a correção com os critérios da banca.</div></div>
      <div class="q-actions"><a class="btn-primary" href="${esc(app)}">Responder na Falcon</a></div>
    </article>` : '';
  const total = x.itens.length;
  const intro = total
    ? `${total} ite${total > 1 ? 'ns' : 'm'} · marque as respostas e clique em <strong>Verificar respostas</strong> no final.`
    : 'Questão discursiva · a resposta escrita é corrigida na Falcon.';
  // discursiva: sem satélite de progresso (não há itens para marcar); a resposta é escrita no Banco
  const satelite = total ? `<aside class="qz-satellite">
        <div class="qz-satellite-pin">
          <div class="qz-sat-header"><span class="qz-sat-label">Progresso</span><span class="qz-sat-counter" data-qz-counter>0 / ${total} respondidas</span></div>
          <div class="qz-sat-bar"><span class="qz-sat-bar-fill" data-qz-bar style="width:0"></span></div>
          <div class="qz-sat-remaining" data-qz-remaining>Faltam ${total}</div>
          <div class="qz-sat-divider"></div>
          <div class="qz-sat-detail" data-qz-detail><div class="qz-sat-empty">Marque a resposta e clique em Verificar respostas para ver o gabarito e o comentário.</div></div>
        </div>
      </aside>` : '';
  return `<section class="block-wrap quiz-block${total ? ' qz-has-satellite' : ''}" data-questao="${esc(x.k)}" data-app="${esc(app)}">
    <header class="block-header"><div class="block-header-lead"><span class="block-type">${ICONE_QUIZ ? `<span class="block-type-icon">${ICONE_QUIZ}</span>` : ''}${total ? 'Questões objetivas' : 'Questão discursiva'}</span><h3 class="block-title"></h3></div></header>
    <div class="qb-intro">${intro}</div>
    <span class="bf-cota" id="bfCota" hidden></span>
    <div class="qz-layout">
      <div class="qz-main"><div class="q-list">
        <div class="q-group" data-group-idx="0">
          <div class="q-group-tagrow"><span class="q-group-origin-badge" title="${esc(x.q.origin || tag)}">${esc(tag)}</span></div>
          ${refHtml}
          ${comando}
          <div class="q-group-items">${itensHtml}${discursiva}</div>
        </div>
      </div>${total ? `
        <div class="qz-verify-bar" data-qz-verify hidden>
          <div class="qz-verify-summary" data-qz-summary hidden></div>
          <button type="button" class="btn-primary qz-verify-btn" data-qz-verify-btn>Verificar respostas</button>
        </div>` : ''}</div>
      ${satelite}
    </div>
  </section>`;
}

// ── páginas ──────────────────────────────────────────────────────────────────
const siteLd = { '@type': 'WebSite', name: 'Falcon · Ubique CACD', url: BASE };
const resumo = y => corta(textoDeBusca(y), 110);
function tituloQ(x){
  const sufixo = ` · ${[x.sigla, x.ano].filter(Boolean).join(' ')} | Falcon`;
  return corta(textoDeBusca(x), 90 - sufixo.length) + sufixo;
}
function descricaoQ(x){
  return corta(`Resolva a questão ${x.numero ?? ''} do ${x.sigla} ${x.ano} (${x.materia}), com gabarito e comentário: ${plano(textoDeBusca(x))}`, 158);
}

function paginaQuestao(x, relacionadas, cotas){
  const url = `${BASE}/q/${x.k}.html`;
  const hub = `${BASE}/q/materia-${x.mslug}.html`;
  const app = `${APP}#/banco/questions?item=${encodeURIComponent(x.k)}&exib=full&applied=1`;
  const tipo = x.q.type === 'essay' ? 'Questão discursiva' : (x.q.type === 'multiple_choice' ? 'Múltipla escolha' : `Certo ou Errado · ${x.itens.length} ${x.itens.length === 1 ? 'item' : 'itens'}`);
  let n = 0;
  const sec = (titulo, html, nota) => { n++; return `<section class="sec pub-sec">${secHead(`§ ${dois(n)} · ${titulo}`, titulo, nota)}${html}</section>`; };
  const h1 = corta(textoDeBusca(x), 120);
  const topsHtml = x.tops.length ? `<div class="chip-row">${x.tops.map(t => `<a class="chip chip-accent" href="${hub}#t-${esc(x.raizPorTop.get(String(t.id)) || t.id)}">${esc(plano((t.code ? t.code + ' ' : '') + t.title))}</a>`).join('')}</div>` : '';
  const relHtml = relacionadas.length ? `<ul class="list pub-lista">${relacionadas.map(y => `<li class="list-item"><span class="list-marker"></span><a href="${BASE}/q/${y.k}.html"><span class="pub-meta">${esc(y.sigla)} ${esc(y.ano)} · Questão ${esc(y.numero ?? '')}</span><span class="pub-trecho">${esc(resumo(y))}</span></a></li>`).join('')}</ul>` : '';
  const chamada = `<div class="callout"><div class="callout-label">Gabarito e comentário do professor</div><p class="callout-body">Como visitante, você corrige ${cotas.visitante} questões por dia aqui mesmo. Com a conta gratuita, ${cotas.gratis} por dia, com o comentário do professor e o seu desempenho guardado. Com o curso, o Banco inteiro.</p></div>
  <div class="pub-acoes"><a class="btn-primary" href="${APP}#/login?criar=1">Criar conta grátis</a><a class="btn-ghost" href="${app}">Abrir no Banco</a><a class="btn-ghost" href="${hub}">Mais questões de ${esc(x.materia)}</a></div>`;
  const corpo = `
<section class="hero pub-hero">
  ${trilha([{ nome: 'Questões do CACD', href: `${BASE}/q/index.html` }, { nome: x.materia, href: hub }, { nome: `Questão ${x.numero ?? ''} · ${x.sigla} ${x.ano}` }])}
  <h1 class="hero-title">${esc(h1)}</h1>
  <p class="hero-lede">Questão ${esc(x.numero ?? '')} do ${esc(x.sigla)} ${esc(x.ano)}, ${esc(x.materia)}. ${esc(tipo)}. Resolva aqui: a correção vem na hora, com gabarito e comentário.</p>
  <div class="hero-meta">
    <div class="hero-meta-item"><span class="hero-meta-k">Concurso</span><span class="hero-meta-v">${esc(x.sigla)}</span></div>
    <div class="hero-meta-item"><span class="hero-meta-k">Ano</span><span class="hero-meta-v">${esc(x.ano || '—')}</span></div>
    <div class="hero-meta-item"><span class="hero-meta-k">Matéria</span><span class="hero-meta-v">${esc(x.subj && x.subj.sigla ? x.subj.sigla : x.materia)}</span></div>
    ${x.itens.length ? `<div class="hero-meta-item"><span class="hero-meta-k">Itens</span><span class="hero-meta-v">${dois(x.itens.length)}</span></div>` : ''}
  </div>
</section>
<section class="sec pub-sec pub-questao">${blocoQuestao(x, app)}</section>
${sec('Continuar', chamada)}
${x.tops.length ? sec('Tópicos do edital', topsHtml, 'A classificação é da Falcon: cada chip leva às questões do mesmo tópico.') : ''}
${relacionadas.length ? sec('Questões relacionadas', relHtml, 'Mesma matéria e mesmos tópicos do edital.') : ''}
<section class="sec pub-sec"><p class="pub-nota">Enunciado e itens reproduzidos da prova pública do concurso, para estudo. <a href="${hub}">Todas as questões de ${esc(x.materia)}</a> · <a href="${BASE}/q/index.html">Questões por matéria</a>.</p></section>`;
  const titulo = tituloQ(x), descricao = descricaoQ(x);
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'QAPage', name: titulo, description: descricao, url, inLanguage: 'pt-BR', isPartOf: siteLd, dateModified: ptData(x.q.updated_at),
      mainEntity: { '@type': 'Question', name: h1, text: plano(x.q.enunciado || x.q.command || '') || h1, answerCount: 0, about: x.tops.map(t => plano(t.title)).slice(0, 12),
                    educationalAlignment: { '@type': 'AlignmentObject', alignmentType: 'educationalSubject', targetName: x.materia } } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Questões do CACD', item: `${BASE}/q/index.html` },
      { '@type': 'ListItem', position: 2, name: x.materia, item: hub },
      { '@type': 'ListItem', position: 3, name: `${x.sigla} ${x.ano} · Questão ${x.numero ?? ''}`, item: url } ] },
  ];
  return concha({ titulo, descricao, url, corpo, jsonld, scripts: `<script src="${BASE}/q/resolver.js?v=${VERSAO_JS}" defer></script>` });
}

function relacionadasDe(x, todas){
  const minhas = new Set(x.tops.map(t => String(t.id)));
  const minhasRaizes = new Set(x.raizes.map(r => String(r.id)));
  const pont = y => {
    if(y.k === x.k || (x.subj && y.subj && String(x.subj.id) !== String(y.subj.id))) return -1;
    let p = 0;
    y.tops.forEach(t => { if(minhas.has(String(t.id))) p += 3; });
    y.raizes.forEach(r => { if(minhasRaizes.has(String(r.id))) p += 1; });
    return p;
  };
  return todas.map(y => ({ y, p: pont(y) })).filter(o => o.p > 0)
    .sort((a, b) => b.p - a.p || (Number(b.y.ano) || 0) - (Number(a.y.ano) || 0)).slice(0, 8).map(o => o.y);
}

function paginaMateria(subj, lista){
  const nome = subj ? subj.subject : 'CACD', ms = subj ? (subj.slug || slug(subj.subject)) : 'geral';
  const url = `${BASE}/q/materia-${ms}.html`;
  const anos = lista.map(x => Number(x.ano)).filter(Boolean);
  const faixa = anos.length ? `${Math.min(...anos)}–${Math.max(...anos)}` : '';
  const grupos = new Map();
  lista.forEach(x => {
    const chaves = x.raizes.length ? x.raizes : [{ id: 'sem', code: '', title: 'Sem tópico classificado', position: 9999 }];
    chaves.forEach(r => { const k = String(r.id); if(!grupos.has(k)) grupos.set(k, { r, qs: [] }); grupos.get(k).qs.push(x); });
  });
  const ordem = [...grupos.values()].sort((a, b) => (String(a.r.id) === 'sem') - (String(b.r.id) === 'sem') || (a.r.position ?? 0) - (b.r.position ?? 0) || String(a.r.code || '').localeCompare(String(b.r.code || ''), 'pt', { numeric: true }));
  const nuvem = `<div class="chip-row">${ordem.map(g => `<a class="chip chip-accent" href="#t-${esc(g.r.id)}">${esc(plano((g.r.code ? g.r.code + ' ' : '') + g.r.title))}<span class="pub-chip-n">${g.qs.length}</span></a>`).join('')}</div>`;
  const secoes = ordem.map((g, i) => `<section class="sec pub-sec" id="t-${esc(g.r.id)}">${secHead(`§ ${dois(i + 1)} · ${g.qs.length} ${g.qs.length === 1 ? 'questão' : 'questões'}`, plano((g.r.code ? g.r.code + '. ' : '') + g.r.title))}<ul class="list pub-lista">${g.qs.slice().sort((a, b) => (Number(b.ano) || 0) - (Number(a.ano) || 0) || (a.numero ?? 0) - (b.numero ?? 0)).map(x => `<li class="list-item"><span class="list-marker"></span><a href="${BASE}/q/${x.k}.html"><span class="pub-meta">${esc(x.sigla)} ${esc(x.ano)} · Questão ${esc(x.numero ?? '')}</span><span class="pub-trecho">${esc(corta(textoDeBusca(x), 120))}</span></a></li>`).join('')}</ul></section>`).join('');
  const titulo = `Questões de ${nome} do CACD ${faixa}: resolva com gabarito | Falcon`.slice(0, 90);
  const descricao = corta(`${lista.length} questões de ${nome} das provas anteriores do CACD (${faixa}), classificadas tópico a tópico pelo edital. Resolva com gabarito e comentário na Falcon.`, 158);
  const corpo = `
<section class="hero pub-hero">
  ${trilha([{ nome: 'Questões do CACD', href: `${BASE}/q/index.html` }, { nome }])}
  <h1 class="hero-title">Questões de ${esc(nome)} do CACD</h1>
  <p class="hero-lede">Todas as questões das provas de ${esc(faixa)}, organizadas pelos tópicos do edital. Escolha um tópico para ir direto às questões dele.</p>
  <div class="hero-meta">
    <div class="hero-meta-item"><span class="hero-meta-k">Questões</span><span class="hero-meta-v">${lista.length}</span></div>
    <div class="hero-meta-item"><span class="hero-meta-k">Provas</span><span class="hero-meta-v">${esc(faixa || '—')}</span></div>
    <div class="hero-meta-item"><span class="hero-meta-k">Tópicos</span><span class="hero-meta-v">${dois(ordem.length)}</span></div>
  </div>
</section>
<section class="sec pub-sec">${secHead('Tópicos do edital', 'Por onde começar', 'A contagem é de questões por tópico de primeiro nível do edital.')}${nuvem}
<div class="pub-acoes"><a class="btn-primary" href="${APP}#/banco/questions">Abrir o Banco de questões</a><a class="btn-ghost" href="${APP}#/login?criar=1">Criar conta grátis</a></div></section>
${secoes}`;
  const jsonld = [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: titulo, description: descricao, url, inLanguage: 'pt-BR', isPartOf: siteLd }];
  return { html: concha({ titulo, descricao, url, corpo, jsonld }), url, ms };
}

function paginaIndice(porMateria){
  const url = `${BASE}/q/index.html`;
  const total = porMateria.reduce((n, m) => n + m.lista.length, 0);
  const cartoes = porMateria.map(m => { const anos = m.lista.map(x => Number(x.ano)).filter(Boolean); return `<div class="card"><span class="card-label">Matéria</span><div class="card-title">${esc(m.nome)}</div><div class="card-body">${m.lista.length} questões${anos.length ? ` · provas de ${Math.min(...anos)} a ${Math.max(...anos)}` : ''}</div><div class="pub-acoes"><a class="btn-ghost" href="${BASE}/q/materia-${m.ms}.html">Ver as questões</a></div></div>`; }).join('');
  const titulo = 'Questões do CACD por matéria: resolva as provas anteriores com gabarito | Falcon'.slice(0, 90);
  const descricao = corta(`${total} questões das provas anteriores do CACD, por matéria e por tópico do edital, para resolver com gabarito, comentário do professor e estatísticas na Falcon.`, 158);
  const corpo = `
<section class="hero pub-hero">
  <div class="hero-eyebrow">Falcon · Ubique CACD</div>
  <h1 class="hero-title">Questões do CACD por matéria</h1>
  <p class="hero-lede">${total} questões das provas anteriores do Concurso de Admissão à Carreira de Diplomata, classificadas tópico a tópico pelo edital. Escolha a matéria e resolva.</p>
  <div class="hero-meta">
    <div class="hero-meta-item"><span class="hero-meta-k">Questões</span><span class="hero-meta-v">${total}</span></div>
    <div class="hero-meta-item"><span class="hero-meta-k">Matérias</span><span class="hero-meta-v">${dois(porMateria.length)}</span></div>
  </div>
</section>
<section class="sec pub-sec"><div class="cards-grid">${cartoes}</div></section>
<section class="sec pub-sec">
  <div class="callout"><div class="callout-label">Estude com correção na hora</div><p class="callout-body">Cada questão abre com gabarito, comentário do professor, estatísticas e os comentários dos alunos. Como visitante, algumas por dia; com a conta gratuita, mais e com o desempenho guardado.</p></div>
  <div class="pub-acoes"><a class="btn-primary" href="${APP}#/inicio">Explorar sem conta</a><a class="btn-ghost" href="${APP}#/login?criar=1">Criar conta grátis</a></div>
</section>`;
  const jsonld = [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: titulo, description: descricao, url, inLanguage: 'pt-BR', isPartOf: siteLd }];
  return concha({ titulo, descricao, url, corpo, jsonld });
}

function sitemap(urls){
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${esc(u.loc)}</loc><lastmod>${esc(u.lastmod || HOJE)}</lastmod>${u.prio ? `<priority>${u.prio}</priority>` : ''}</url>`).join('\n') + `\n</urlset>\n`;
}
const URLS_BASE = [{ loc: `${BASE}/landing.html`, prio: '1.0' }, { loc: `${BASE}/`, prio: '0.8' }];

// ── principal ────────────────────────────────────────────────────────────────
async function principal(){
  let dados;
  try{ dados = await carregar(); }
  catch(e){
    console.warn('[paginas-questoes] sem dados (' + (e && e.message) + '); só o sitemap base.');
    writeFileSync(join(RAIZ, 'sitemap.xml'), sitemap(URLS_BASE));
    return;
  }
  const { questoes, subjById } = montar(dados);
  const cotas = { visitante: dados.cotaVisitante, gratis: dados.cotaGratis };
  marcarRepetidos(questoes);
  mkdirSync(PASTA, { recursive: true });
  readdirSync(PASTA).filter(f => /\.(html|css|js)$/.test(f)).forEach(f => unlinkSync(join(PASTA, f)));
  const css = cssDesignSystem() + '\n/* ── bloco de questão: regras do app (index.html) ── */\n' + cssApp() + '\n' + CSS_PAGINA;
  const js = readFileSync(join(AQUI, 'resolver.js'), 'utf8').replaceAll('__SUPABASE_URL__', SUPABASE).replaceAll('__ANON_KEY__', KEY);
  VERSAO_CSS = versao(css); VERSAO_JS = versao(js);
  writeFileSync(join(PASTA, 'ubique.css'), css);
  writeFileSync(join(PASTA, 'resolver.js'), js);
  const urls = URLS_BASE.slice();
  questoes.forEach(x => {
    writeFileSync(join(PASTA, x.k + '.html'), paginaQuestao(x, relacionadasDe(x, questoes), cotas));
    urls.push({ loc: `${BASE}/q/${x.k}.html`, lastmod: ptData(x.q.updated_at), prio: '0.6' });
  });
  const porMateria = [];
  const grupos = new Map();
  questoes.forEach(x => { const k = x.subj ? String(x.subj.id) : 'geral'; if(!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(x); });
  [...grupos.entries()].sort((a, b) => ((subjById.get(a[0]) || {}).position ?? 999) - ((subjById.get(b[0]) || {}).position ?? 999)).forEach(([k, lista]) => {
    const subj = subjById.get(k) || null;
    const pg = paginaMateria(subj, lista);
    writeFileSync(join(PASTA, `materia-${pg.ms}.html`), pg.html);
    porMateria.push({ nome: subj ? subj.subject : 'CACD', ms: pg.ms, lista });
    urls.push({ loc: pg.url, prio: '0.8' });
  });
  writeFileSync(join(PASTA, 'index.html'), paginaIndice(porMateria));
  urls.push({ loc: `${BASE}/q/index.html`, prio: '0.9' });
  writeFileSync(join(RAIZ, 'sitemap.xml'), sitemap(urls));
  console.log(`[paginas-questoes] ${questoes.length} questões, ${porMateria.length} matérias, sitemap com ${urls.length} endereços.`);
}

principal().catch(e => { console.warn('[paginas-questoes] falhou: ' + (e && e.stack || e)); try{ if(!existsSync(join(RAIZ, 'sitemap.xml'))) writeFileSync(join(RAIZ, 'sitemap.xml'), sitemap(URLS_BASE)); }catch(_){ } });
