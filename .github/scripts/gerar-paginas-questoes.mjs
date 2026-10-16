#!/usr/bin/env node
// Páginas públicas das questões (pacote 7 · visitante, 16/10/2026) + sitemap.xml
//
// Roda no deploy (GitHub Actions) antes do `firebase deploy`. Lê as VISTAS DO VISITANTE (papel anônimo,
// SQL 87: enunciado e itens SEM gabarito e SEM comentário) e escreve:
//   q/<uuid>.html          uma página por questão de prova anterior (título, enunciado, itens, tópicos do edital,
//                          questões relacionadas e o botão "Resolver na Falcon", que abre a questão no Banco)
//   q/materia-<slug>.html  uma página por matéria, com a nuvem de tópicos e as questões por tópico do edital
//   q/index.html           a porta de entrada (matérias, anos, contagens)
//   sitemap.xml            na raiz, com todas as páginas acima (+ landing e app)
// Sem as vistas (SQL 87 ainda não rodou), sem rede ou com qualquer erro: escreve só o sitemap base e sai com 0.
// O deploy NUNCA para por causa daqui. Rodar localmente: node .github/scripts/gerar-paginas-questoes.mjs
// (q/ e sitemap.xml estão no .gitignore: nascem no deploy, não no repositório).
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = 'https://falcon.grupoubique.com.br';
const SUPABASE = 'https://kluqjqojxzpuiauuidwx.supabase.co';
const GTM = 'GTM-KPCF42J';
const HOJE = new Date().toISOString().slice(0, 10);
const PASTA = join(RAIZ, 'q');

// A chave anônima é pública (está no index.html); lida de lá para não existir em dois lugares.
function chaveAnon(){
  const m = /const KEY = '(eyJ[^']+)'/.exec(readFileSync(join(RAIZ, 'index.html'), 'utf8'));
  if(!m) throw new Error('chave anônima não encontrada no index.html');
  return m[1];
}
const KEY = chaveAnon();

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
// enunciados e itens: HTML simples do editor (sem script, sem eventos) ou texto puro em parágrafos
function texto(s){
  s = String(s ?? '').trim();
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

// ── página (concha comum) ────────────────────────────────────────────────────
const CSS = `
:root{--bg:#0b0c0f;--bg-card:#13151a;--bg-elev:#181a20;--text:#f0ece4;--text-dim:rgba(240,236,228,.58);--text-mute:rgba(240,236,228,.36);
--accent:#c8a97e;--accent-lo:rgba(200,169,126,.12);--accent-xlo:rgba(200,169,126,.06);--accent-border:rgba(200,169,126,.22);--accent-border-soft:rgba(200,169,126,.12);
--border:rgba(200,169,126,.12);--green:#5dd49f;--amber:#e9b65a;--amber-lo:rgba(233,182,90,.12);--amber-border:rgba(233,182,90,.35);
--serif:'Cormorant Garamond',Georgia,serif;--sans:'Outfit',system-ui,sans-serif}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);font-weight:300;line-height:1.6;font-size:16px}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.topo{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.9rem 16px;border-bottom:1px solid var(--border);max-width:1080px;margin:0 auto}
.marca{font-family:var(--serif);font-size:1.35rem;font-weight:500;letter-spacing:.02em;color:var(--text)}.marca small{font-family:var(--sans);font-size:.72rem;color:var(--text-dim);margin-left:.5rem;letter-spacing:.08em;text-transform:uppercase}
.topo nav{display:flex;gap:.4rem;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:.4rem;border:1px solid var(--accent-border);border-radius:999px;padding:.5rem 1rem;font-size:.86rem;color:var(--text);background:var(--accent-xlo);white-space:nowrap}
.btn:hover{text-decoration:none;background:var(--accent-lo)}.btn.forte{background:var(--accent);color:#1a1409;border-color:var(--accent);font-weight:500}
main{max-width:860px;margin:0 auto;padding:1.4rem 16px 3rem}
.trilha{font-size:.78rem;color:var(--text-dim);display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:1rem}.trilha a{color:var(--text-dim)}
.rotulo{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin:0 0 .4rem}
h1{font-family:var(--serif);font-weight:500;font-size:2.1rem;line-height:1.15;margin:0 0 .5rem}
h2{font-family:var(--serif);font-weight:500;font-size:1.45rem;margin:2rem 0 .7rem;padding-bottom:.3rem;border-bottom:1px solid var(--border)}
.sub{color:var(--text-dim);margin:0 0 1.2rem}
.cartao{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:1.1rem 1.2rem;margin:.8rem 0}
.cartao p:first-child{margin-top:0}.cartao p:last-child{margin-bottom:0}
.ref{font-family:var(--serif);font-size:1.12rem;line-height:1.55}.ref-fonte{font-size:.8rem;color:var(--text-dim);margin-top:.6rem}
.item{display:grid;grid-template-columns:auto 1fr;gap:.9rem;padding:.9rem 0;border-top:1px solid var(--border)}.item:first-child{border-top:0}
.item-n{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);padding-top:.25rem;white-space:nowrap}
.item-ce{font-size:.74rem;color:var(--text-mute);margin-top:.3rem}
.selo{display:inline-block;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;border:1px solid var(--amber-border);background:var(--amber-lo);color:var(--amber);border-radius:999px;padding:.1rem .55rem;margin-left:.5rem;vertical-align:middle}
.chamada{background:linear-gradient(180deg,var(--accent-lo),var(--accent-xlo));border:1px solid var(--accent-border);border-radius:14px;padding:1.2rem 1.3rem;margin:1.6rem 0}
.chamada h3{font-family:var(--serif);font-weight:500;font-size:1.3rem;margin:0 0 .3rem}.chamada p{margin:.2rem 0 .9rem;color:var(--text-dim)}
.acoes{display:flex;gap:.6rem;flex-wrap:wrap}
.chips{display:flex;flex-wrap:wrap;gap:.4rem}.chip{border:1px solid var(--accent-border-soft);background:var(--accent-xlo);border-radius:999px;padding:.25rem .7rem;font-size:.8rem;color:var(--text)}.chip:hover{text-decoration:none;border-color:var(--accent-border)}.chip b{color:var(--accent);font-weight:500;margin-left:.3rem}
.lista{list-style:none;padding:0;margin:0}.lista li{padding:.55rem 0;border-top:1px solid var(--border)}.lista li:first-child{border-top:0}
.lista a{color:var(--text)}.lista .meta{font-size:.74rem;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-right:.5rem}.lista .trecho{display:block;color:var(--text-dim);font-size:.9rem}
.grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.8rem}
.grade a{display:block;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:1rem 1.1rem;color:var(--text)}.grade a:hover{text-decoration:none;border-color:var(--accent-border)}
.grade .n{font-family:var(--serif);font-size:1.3rem}.grade .q{color:var(--text-dim);font-size:.85rem}
.nota{font-size:.82rem;color:var(--text-dim)}
footer{border-top:1px solid var(--border);margin-top:2rem;padding:1.4rem 16px;max-width:1080px;margin-left:auto;margin-right:auto;font-size:.8rem;color:var(--text-dim);display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap}
img.fig{max-width:100%;height:auto;border-radius:8px;margin:.6rem 0}
@media(max-width:600px){h1{font-size:1.65rem}.topo nav .btn{padding:.4rem .75rem;font-size:.8rem}}`;

function concha({ titulo, descricao, url, corpo, jsonld, trilha }){
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
<link rel="icon" href="${BASE}/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Outfit:wght@300;400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
${ld}
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM}');</script>
</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<header class="topo">
  <a class="marca" href="${BASE}/landing.html">Falcon<small>Ubique CACD</small></a>
  <nav>
    <a class="btn" href="${BASE}/q/index.html">Questões</a>
    <a class="btn" href="${BASE}/index.html#/inicio">Explorar sem conta</a>
    <a class="btn forte" href="${BASE}/index.html#/login?criar=1">Criar conta grátis</a>
  </nav>
</header>
<main>
${trilha ? `<div class="trilha">${trilha}</div>` : ''}
${corpo}
</main>
<footer>
  <span>Falcon é a plataforma de estudo do Ubique CACD, do Grupo Ubique.</span>
  <span><a href="${BASE}/landing.html">Conheça a Falcon</a> · <a href="${BASE}/q/index.html">Questões do CACD</a> · <a href="${BASE}/index.html#/login">Entrar</a></span>
</footer>
</body>
</html>`;
}

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

// ── páginas ──────────────────────────────────────────────────────────────────
function tituloQ(x){
  const base = `${x.sigla} ${x.ano} · ${x.materia} · Questão ${x.numero ?? ''}`.replace(/\s+/g, ' ').trim();
  return (base.length + 9 <= 90) ? base + ' | Falcon' : base.slice(0, 90);
}
function descricaoQ(x){
  const fonte = x.q.enunciado || (x.itens[0] && x.itens[0].assertiva) || x.q.command || '';
  const pre = `Questão ${x.numero ?? ''} do ${x.sigla} ${x.ano}, ${x.materia}: `;
  return corta(pre + plano(fonte), 158);
}
function paginaQuestao(x, relacionadas, cotas){
  const url = `${BASE}/q/${x.k}.html`;
  const hub = `${BASE}/q/materia-${x.mslug}.html`;
  const app = `${BASE}/index.html#/banco/questions?item=${encodeURIComponent(x.k)}&exib=full&applied=1`;
  const refsHtml = x.refs.map(r => `<div class="cartao ref">${r.title ? `<p class="rotulo">${esc(plano(r.title))}${r.subtitle ? ' · ' + esc(plano(r.subtitle)) : ''}</p>` : ''}${texto(r.text)}${(r.source || r.author) ? `<div class="ref-fonte">${esc(plano([r.author, r.source].filter(Boolean).join(' · ')))}</div>` : ''}${r.image_url ? `<img class="fig" src="${esc(r.image_url)}" alt="">` : ''}</div>`).join('');
  const enunciado = x.q.enunciado ? `<div class="cartao">${texto(x.q.enunciado)}${x.q.image_url ? `<img class="fig" src="${esc(x.q.image_url)}" alt="">` : ''}</div>` : (x.q.image_url ? `<div class="cartao"><img class="fig" src="${esc(x.q.image_url)}" alt=""></div>` : '');
  const comando = x.q.type === 'essay' && x.q.command ? `<div class="cartao">${texto(x.q.command)}</div>` : '';
  const itens = x.itens.length ? `<h2>Itens</h2><div class="cartao">${x.itens.map((t, i) => `<div class="item"><div class="item-n">Item ${esc(t.numero ?? (i + 1))}${t.anulada ? '<span class="selo">Anulado</span>' : ''}</div><div>${texto(t.assertiva)}${t.image_url ? `<img class="fig" src="${esc(t.image_url)}" alt="">` : ''}<div class="item-ce">Certo ou Errado</div></div></div>`).join('')}</div>` : '';
  const selos = [x.q.anulada ? '<span class="selo">Anulada</span>' : '', x.q.desatualizada ? '<span class="selo">Desatualizada</span>' : ''].join('');
  const topsHtml = x.tops.length ? `<h2>Tópicos do edital</h2><div class="chips">${x.tops.map(t => `<a class="chip" href="${hub}#t-${esc(x.raizPorTop.get(String(t.id)) || t.id)}">${esc(plano((t.code ? t.code + ' ' : '') + t.title))}</a>`).join('')}</div>` : '';
  const relHtml = relacionadas.length ? `<h2>Questões relacionadas</h2><ul class="lista">${relacionadas.map(y => `<li><a href="${BASE}/q/${y.k}.html"><span class="meta">${esc(y.sigla)} ${esc(y.ano)} · Questão ${esc(y.numero ?? '')}</span>${esc(corta(y.q.enunciado || (y.itens[0] && y.itens[0].assertiva) || y.q.command, 110))}</a></li>`).join('')}</ul>` : '';
  const tipo = x.q.type === 'essay' ? 'Questão discursiva' : (x.q.type === 'multiple_choice' ? 'Questão de múltipla escolha' : `Questão objetiva com ${x.itens.length} ${x.itens.length === 1 ? 'item' : 'itens'} (Certo ou Errado)`);
  const corpo = `
<p class="rotulo">${esc(x.sigla)} ${esc(x.ano)} · ${esc(x.materia)}</p>
<h1>Questão ${esc(x.numero ?? '')} do ${esc(x.sigla)} ${esc(x.ano)}${selos}</h1>
<p class="sub">${tipo}. Prova anterior do Concurso de Admissão à Carreira de Diplomata, classificada pelo edital na Falcon.</p>
${x.refs.length ? '<h2>Texto de referência</h2>' + refsHtml : ''}
${(enunciado || comando) ? '<h2>Enunciado</h2>' + enunciado + comando : ''}
${itens}
<div class="chamada">
  <h3>Gabarito e comentário do professor: na Falcon</h3>
  <p>Resolva esta questão com correção na hora. Como visitante, ${cotas.visitante} questões por dia; com a conta gratuita, ${cotas.gratis} por dia e o seu desempenho guardado.</p>
  <div class="acoes"><a class="btn forte" href="${app}">Resolver na Falcon</a><a class="btn" href="${BASE}/index.html#/login?criar=1">Criar conta grátis</a></div>
</div>
${topsHtml}
${relHtml}
<h2>Mais questões</h2>
<p><a href="${hub}">Todas as questões de ${esc(x.materia)} do CACD</a> · <a href="${BASE}/q/index.html">Questões por matéria</a></p>
<p class="nota">Enunciado e itens reproduzidos da prova pública do concurso, para estudo. A classificação por tópico do edital é da Falcon.</p>`;
  const titulo = tituloQ(x), descricao = descricaoQ(x);
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: titulo, description: descricao, url, inLanguage: 'pt-BR',
      isPartOf: { '@type': 'WebSite', name: 'Falcon · Ubique CACD', url: BASE }, about: x.tops.map(t => plano(t.title)).slice(0, 12),
      dateModified: ptData(x.q.updated_at) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Questões do CACD', item: `${BASE}/q/index.html` },
      { '@type': 'ListItem', position: 2, name: x.materia, item: hub },
      { '@type': 'ListItem', position: 3, name: `${x.sigla} ${x.ano} · Questão ${x.numero ?? ''}`, item: url } ] },
  ];
  const trilha = `<a href="${BASE}/q/index.html">Questões do CACD</a> › <a href="${hub}">${esc(x.materia)}</a> › <span>${esc(x.sigla)} ${esc(x.ano)} · Questão ${esc(x.numero ?? '')}</span>`;
  return concha({ titulo, descricao, url, corpo, jsonld, trilha });
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
  const nuvem = `<div class="chips">${ordem.map(g => `<a class="chip" href="#t-${esc(g.r.id)}">${esc(plano((g.r.code ? g.r.code + ' ' : '') + g.r.title))}<b>${g.qs.length}</b></a>`).join('')}</div>`;
  const secoes = ordem.map(g => `<h2 id="t-${esc(g.r.id)}">${esc(plano((g.r.code ? g.r.code + '. ' : '') + g.r.title))}</h2><ul class="lista">${g.qs.slice().sort((a, b) => (Number(b.ano) || 0) - (Number(a.ano) || 0) || (a.numero ?? 0) - (b.numero ?? 0)).map(x => `<li><a href="${BASE}/q/${x.k}.html"><span class="meta">${esc(x.sigla)} ${esc(x.ano)} · Questão ${esc(x.numero ?? '')}</span><span class="trecho">${esc(corta(x.q.enunciado || (x.itens[0] && x.itens[0].assertiva) || x.q.command, 120))}</span></a></li>`).join('')}</ul>`).join('');
  const titulo = `Questões de ${nome} do CACD ${faixa} | Falcon`.slice(0, 90);
  const descricao = corta(`${lista.length} questões de ${nome} das provas anteriores do CACD (${faixa}), classificadas tópico a tópico pelo edital. Enunciado e itens para estudo; gabarito e comentário na Falcon.`, 158);
  const corpo = `
<p class="rotulo">Questões por matéria</p>
<h1>Questões de ${esc(nome)} do CACD</h1>
<p class="sub">${lista.length} questões das provas de ${esc(faixa)}, organizadas pelos tópicos do edital. Clique num tópico para ir direto às questões dele.</p>
${nuvem}
<div class="chamada"><h3>Resolva com gabarito e comentário</h3><p>Na Falcon, cada questão abre com correção na hora, estatísticas e comentários dos alunos.</p><div class="acoes"><a class="btn forte" href="${BASE}/index.html#/banco/questions">Abrir o Banco de questões</a><a class="btn" href="${BASE}/index.html#/login?criar=1">Criar conta grátis</a></div></div>
${secoes}`;
  const jsonld = [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: titulo, description: descricao, url, inLanguage: 'pt-BR', isPartOf: { '@type': 'WebSite', name: 'Falcon · Ubique CACD', url: BASE } }];
  const trilha = `<a href="${BASE}/q/index.html">Questões do CACD</a> › <span>${esc(nome)}</span>`;
  return { html: concha({ titulo, descricao, url, corpo, jsonld, trilha }), url, ms };
}

function paginaIndice(porMateria){
  const url = `${BASE}/q/index.html`;
  const total = porMateria.reduce((n, m) => n + m.lista.length, 0);
  const cartoes = porMateria.map(m => { const anos = m.lista.map(x => Number(x.ano)).filter(Boolean); return `<a href="${BASE}/q/materia-${m.ms}.html"><div class="n">${esc(m.nome)}</div><div class="q">${m.lista.length} questões${anos.length ? ` · ${Math.min(...anos)}–${Math.max(...anos)}` : ''}</div></a>`; }).join('');
  const titulo = 'Questões do CACD por matéria: provas anteriores classificadas pelo edital | Falcon'.slice(0, 90);
  const descricao = corta(`${total} questões das provas anteriores do CACD, por matéria e por tópico do edital. Enunciado e itens para estudo; gabarito, comentário do professor e estatísticas na Falcon.`, 158);
  const corpo = `
<p class="rotulo">Falcon · Ubique CACD</p>
<h1>Questões do CACD por matéria</h1>
<p class="sub">${total} questões das provas anteriores do Concurso de Admissão à Carreira de Diplomata, classificadas tópico a tópico pelo edital. Escolha a matéria.</p>
<div class="grade">${cartoes}</div>
<div class="chamada"><h3>Estude com correção na hora</h3><p>Na Falcon, cada questão abre com gabarito, comentário do professor, estatísticas e os comentários dos alunos. Como visitante, algumas por dia; com a conta gratuita, mais e com o desempenho guardado.</p><div class="acoes"><a class="btn forte" href="${BASE}/index.html#/inicio">Explorar sem conta</a><a class="btn" href="${BASE}/index.html#/login?criar=1">Criar conta grátis</a></div></div>`;
  const jsonld = [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: titulo, description: descricao, url, inLanguage: 'pt-BR', isPartOf: { '@type': 'WebSite', name: 'Falcon · Ubique CACD', url: BASE } }];
  return concha({ titulo, descricao, url, corpo, jsonld, trilha: '' });
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
  mkdirSync(PASTA, { recursive: true });
  readdirSync(PASTA).filter(f => /\.html$/.test(f)).forEach(f => unlinkSync(join(PASTA, f)));
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
