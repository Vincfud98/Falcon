/* Concha do app Falcon — service worker (modo offline, 2026-09-26)
   Guarda no aparelho a PÁGINA e o que ela precisa para abrir sem rede:
   os arquivos locais de script e estilo, a biblioteca do Supabase e as
   fontes. Regras:
   · página: REDE PRIMEIRO (4 s). A cópia só entra quando a rede falha ou
     demora — atualizações continuam chegando normalmente, sem versão presa;
   · scripts e estilos locais e bibliotecas do CDN: cópia primeiro, renova em
     2º plano (os locais têm ?v=, então versão nova = URL nova = rede);
   · imagens do conteúdo já vistas: cópia primeiro, com teto de entradas
     (pedidas como a página pede, sem tentar CORS: sem erro no console);
   · Supabase (dados, login, funções, realtime), vídeos e o resto: NUNCA
     passam por aqui — seguem direto pela rede, e a Rede do app cuida deles. */
'use strict';
const VERSAO = 'concha-v1';
const C_CONCHA = VERSAO + ':concha';     // página + arquivos locais
const C_LIBS = VERSAO + ':libs';         // bibliotecas e fontes do CDN
const C_IMG = VERSAO + ':imagens';       // imagens do conteúdo já vistas
const IMG_TETO = 120;   // resposta opaca conta ~7 MB na cota do Chrome: teto baixo
const PRAZO_PAGINA_MS = 4000;
const RAIZ = new URL('./', self.location.href);   // pasta do sw.js = raiz do app
const LIB_BOOT = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
const CDN_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

function naRaiz(u){ return u.origin === self.location.origin && u.href.indexOf(RAIZ.href) === 0; }
function ehApi(u){ return /supabase\.(co|in)$/.test(u.hostname) && !/^\/storage\/v1\/object\/public\//.test(u.pathname); }
function comPrazo(p, ms){
  return Promise.race([p, new Promise(function(_, rej){ setTimeout(function(){ rej(new Error('prazo')); }, ms); })]);
}
// Resposta guardada nunca sai com a marca de redirecionamento (uma navegação recusaria).
function limpa(resp){
  if(!resp || !resp.redirected) return resp;
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: resp.headers });
}
// Arquivos locais de script/estilo que a página carrega (e a lib de boot).
function arquivosDaPagina(html){
  const out = new Set(); const re = /(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g; let m;
  while((m = re.exec(html))){
    let u; try{ u = new URL(m[1], RAIZ); }catch(_){ continue; }
    if(naRaiz(u) || u.href === LIB_BOOT) out.add(u.href);
  }
  return Array.from(out);
}
function chaveDaPagina(u){
  return (/\.html$/i.test(u.pathname) && !/\/index\.html$/i.test(u.pathname)) ? (u.origin + u.pathname) : RAIZ.href;
}

self.addEventListener('install', function(ev){
  ev.waitUntil((async function(){
    const concha = await caches.open(C_CONCHA), libs = await caches.open(C_LIBS);
    const r = await fetch(new Request(RAIZ.href, { cache: 'no-cache', credentials: 'same-origin' }));
    if(!r.ok) throw new Error('página ' + r.status);
    const html = await r.clone().text();
    await concha.put(RAIZ.href, limpa(r));
    await Promise.all(arquivosDaPagina(html).map(async function(u){
      try{
        const resp = await fetch(new Request(u, { cache: 'no-cache', mode: 'cors', credentials: 'same-origin' }));
        if(resp.ok) await (u === LIB_BOOT ? libs : concha).put(u, resp);
      }catch(_){ /* fica de fora da concha; entra na 1ª vez que for usado */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function(ev){
  ev.waitUntil((async function(){
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(function(n){ return n.indexOf(VERSAO + ':') !== 0; }).map(function(n){ return caches.delete(n); }));
    await self.clients.claim();
  })());
});

// Página: rede primeiro; cópia só quando a rede falha ou passa do prazo.
async function pagina(ev, u){
  const req = ev.request, chave = chaveDaPagina(u);
  const concha = await caches.open(C_CONCHA);
  const rede = fetch(req).then(async function(resp){
    if(resp && resp.ok && resp.type !== 'opaqueredirect'){
      const copia = resp.clone();
      ev.waitUntil((async function(){
        await concha.put(chave, copia.clone());
        if(chave === RAIZ.href){   // versão nova da página: arquivos locais que ela não usa mais saem
          const usados = new Set(arquivosDaPagina(await copia.text()));
          const chaves = await concha.keys();
          await Promise.all(chaves.filter(function(k){ const ku = new URL(k.url); return naRaiz(ku) && /\.(js|css)(\?|$)/.test(ku.pathname + ku.search) && !usados.has(k.url); }).map(function(k){ return concha.delete(k); }));
        }
      })().catch(function(){}));
    }
    return resp;
  });
  try{
    const resp = await comPrazo(rede, PRAZO_PAGINA_MS);
    if(resp && (resp.ok || resp.type === 'opaqueredirect')) return resp;
    return limpa(await concha.match(chave, { ignoreVary: true })) || resp;   // 404/5xx: cópia, se houver
  }catch(_){
    ev.waitUntil(rede.catch(function(){}));                                  // a rede pode ainda chegar e renovar a cópia
    const copia = await concha.match(chave, { ignoreVary: true });
    if(copia) return limpa(copia);
    throw _;                                                                // sem cópia: o navegador mostra o erro dele
  }
}

// Cópia primeiro, renovação em 2º plano (scripts, estilos, libs, fontes).
async function copiaPrimeiro(ev, nome){
  const req = ev.request, cache = await caches.open(nome);
  const copia = await cache.match(req, { ignoreVary: true });
  const rede = fetch(req).then(function(resp){
    if(resp && (resp.ok || resp.type === 'opaque')) cache.put(req, resp.clone()).catch(function(){});
    return resp;
  });
  if(copia){ ev.waitUntil(rede.catch(function(){})); return copia; }
  return rede;
}

// Imagens do conteúdo: cópia primeiro. O pedido vai como a página pediu (no-cors):
// resposta opaca também é guardada — por isso o teto é baixo.
function imagemGuardavel(u){
  if(naRaiz(u)) return !/\/landing\//.test(u.pathname);
  return u.protocol === 'https:';
}
async function aparar(cache){
  const chaves = await cache.keys();
  if(chaves.length <= IMG_TETO) return;
  await Promise.all(chaves.slice(0, chaves.length - IMG_TETO).map(function(k){ return cache.delete(k); }));
}
async function imagem(ev){
  const req = ev.request, cache = await caches.open(C_IMG);
  const copia = await cache.match(req, { ignoreVary: true });
  if(copia) return copia;
  const resp = await fetch(req);
  if(resp && (resp.ok || resp.type === 'opaque')) ev.waitUntil(cache.put(req, resp.clone()).then(function(){ return aparar(cache); }).catch(function(){}));
  return resp;
}

self.addEventListener('fetch', function(ev){
  const req = ev.request;
  if(req.method !== 'GET' || req.headers.has('range')) return;
  let u; try{ u = new URL(req.url); }catch(_){ return; }
  if(u.protocol !== 'http:' && u.protocol !== 'https:') return;
  if(ehApi(u)) return;                                             // dados, login, funções, realtime: rede direta
  if(req.mode === 'navigate'){ ev.respondWith(pagina(ev, u)); return; }
  const dest = req.destination;
  if(naRaiz(u) && /\.(js|css)(\?|$)/.test(u.pathname + u.search)){ ev.respondWith(copiaPrimeiro(ev, C_CONCHA)); return; }
  if(CDN_HOSTS.indexOf(u.hostname) >= 0 && (dest === 'script' || dest === 'style' || dest === 'font' || dest === '')){ ev.respondWith(copiaPrimeiro(ev, C_LIBS)); return; }
  if(dest === 'image' && imagemGuardavel(u)){ ev.respondWith(imagem(ev)); return; }
});
