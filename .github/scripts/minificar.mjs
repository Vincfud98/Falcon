// Minifica, NO DEPLOY, o HTML/JS/CSS publicado (o repositório continua com o código legível).
// Uso: MINI_DIR=<pasta com html-minifier-terser, terser e clean-css instalados> node minificar.mjs [raiz]
// Falha num arquivo => esse arquivo vai como está (nunca derruba o deploy nem quebra a página).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(path.resolve(process.env.MINI_DIR || '.') + '/');
const { minify: minHtml } = req('html-minifier-terser');
const { minify: minJs } = req('terser');
const CleanCSS = req('clean-css');

const RAIZ = path.resolve(process.argv[2] || '.');
const PULAR_PASTAS = new Set(['.git', '.github', '.firebase', '.claude', 'node_modules', 'supabase', 'sql', 'frames', 'fotos']);
// Não publicados (ignore do firebase.json) ou só referência: nem gasta tempo.
const PULAR_ARQ = new Set(['historia-do-brasil-v7.html', 'mockup-homepage.html', 'ubique-saas-components.html', 'mockup-rotina.html']);

const TERSER = {
  compress: { passes: 1, drop_debugger: false },   // guard.js depende de Function('debugger'); nada literal some
  mangle: true,                                     // nomes globais (onclick="...") ficam: toplevel desligado
  format: { comments: false },
};
const CSS = { level: 1 };

function listar(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!PULAR_PASTAS.has(e.name)) listar(path.join(dir, e.name), out); continue; }
    if (/\.(html|js|css)$/i.test(e.name) && !/\.min\.(js|css)$/i.test(e.name) && !PULAR_ARQ.has(e.name)) out.push(path.join(dir, e.name));
  }
  return out;
}

let antes = 0, depois = 0, falhas = 0;
for (const f of listar(RAIZ)) {
  const rel = path.relative(RAIZ, f).replace(/\\/g, '/');
  const src = fs.readFileSync(f, 'utf8');
  let out = src, avisos = [];
  try {
    if (f.endsWith('.js')) {
      out = (await minJs(src, TERSER)).code;
    } else if (f.endsWith('.css')) {
      const r = new CleanCSS(CSS).minify(src);
      if (r.errors.length) throw new Error(r.errors.join('; '));
      out = r.styles;
    } else {
      out = await minHtml(src, {
        collapseWhitespace: true,
        conservativeCollapse: true,   // nunca cola palavras/inline-blocks: só encurta espaços
        removeComments: true,
        caseSensitive: true,
        keepClosingSlash: true,
        minifyCSS: CSS,
        minifyJS: TERSER,
        log: (e) => { if (e instanceof Error) avisos.push(String(e.message).slice(0, 160)); },
      });
    }
    if (!out || out.length < src.length * 0.05) throw new Error('saída suspeita (' + (out || '').length + ' bytes)');
  } catch (e) {
    console.log('  ! ' + rel + ': mantido sem minificar (' + String(e.message || e).slice(0, 200) + ')');
    out = src; falhas++;
  }
  for (const a of avisos) console.log('  ~ ' + rel + ': um <script> inline ficou sem minificar: ' + a);
  if (out !== src) fs.writeFileSync(f, out);
  antes += src.length; depois += out.length;
  console.log(rel + ': ' + Math.round(src.length / 1024) + ' KB -> ' + Math.round(out.length / 1024) + ' KB');
}
console.log('TOTAL: ' + Math.round(antes / 1024) + ' KB -> ' + Math.round(depois / 1024) + ' KB' + (falhas ? ' | ' + falhas + ' arquivo(s) sem minificar' : ''));
