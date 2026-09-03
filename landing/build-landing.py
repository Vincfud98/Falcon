# -*- coding: utf-8 -*-
"""Monta landing.html da Falcon a partir do protótipo historia-do-brasil-v7.html.
Reaproveita: CSS, topbar, menu-âncora, demo interativa (pp-main), os 9 mocks dos
cartões de ferramentas e os scripts do protótipo (menos o herói).
Conteúdo das seções = JSON (LANDING_DEFAULT) renderizado por landing-runtime.js;
o admin edita esse JSON no lugar (?editar=1) e publica em platform_config."""
import io, re, os, json, glob
RAIZ = '/Users/guilhermecavalcanti/Documents/Falcon/'
AQUI = os.path.dirname(os.path.abspath(__file__))
P = io.open(RAIZ + 'historia-do-brasil-v7.html', encoding='utf8').read()
L = P.split('\n')
def linhas(a, b): return '\n'.join(L[a-1:b])
def elemento(html, ini):
    """recorta o elemento que começa em `ini` ('<div ...'), contando aninhamento de div"""
    i = ini; prof = 0; j = i
    while True:
        a = html.find('<div', j); b = html.find('</div>', j)
        if b < 0: return html[ini:]
        if a >= 0 and a < b: prof += 1; j = a + 4
        else:
            prof -= 1; j = b + 6
            if prof == 0: return html[ini:j]

APP = 'index.html'
FRAMES_DIR, FRAMES_DIR_M = 'landing/frames/hero', 'landing/frames/hero-m'
FRAMES_COUNT = len(glob.glob(RAIZ + FRAMES_DIR + '/*.webp'))
import hashlib
def _assinatura(pasta):
    h = hashlib.sha1()
    for f in sorted(glob.glob(RAIZ + pasta + '/*.webp')): h.update((os.path.basename(f) + ':' + str(os.path.getsize(f))).encode())
    return h.hexdigest()[:8]
FRAMES_VER = _assinatura(FRAMES_DIR) + _assinatura(FRAMES_DIR_M)[:4]   # muda sempre que os quadros mudam → endereços novos, cache limpo
HERO_ATOS = [0.40, 0.61]   # fração do voo em que começam os atos II (Meteoro) e III (fachada → jardim); ver landing/frames/COMO-GERAR.md
SB_URL = 'https://kluqjqojxzpuiauuidwx.supabase.co'
SB_KEY = re.search(r"const KEY = '(ey[^']+)'", io.open(RAIZ + 'index.html', encoding='utf8').read()).group(1)

# ── CSS ──────────────────────────────────────────────────────────────────
css_proto = P[P.index('<style>') + 7:P.index('</style>')]
css_extra = r"""
/* ═══ FALCON · acréscimos da landing ═══ */
/* Marca no topo: a mesma do rodapé (losango dourado + "Falcon · Grupo Ubique") */
.topbar-logo{ width:auto; height:auto; display:inline-flex; align-items:center; gap:.75rem; text-decoration:none; white-space:nowrap; }
.topbar-logo-mark{ width:28px; height:28px; display:block; flex:0 0 auto; }
.topbar-logo-mark svg{ width:100%; height:100%; display:block; }
.topbar-logo-mark svg path{ fill:var(--accent); }
.topbar-logo .logo-word{ font-family:var(--serif); font-weight:400; font-size:1.2rem; letter-spacing:.01em; color:var(--text); }
.topbar-logo .logo-word em{ color:var(--accent); font-style:italic; }
.topbar-right{ display:flex; align-items:center; gap:.6rem; }
.topbar .btn{ padding:.55rem 1rem; font-size:var(--fs-micro); }
.topbar .btn-ghost{ border-color:var(--border-strong); }
@media (max-width:640px){ .topbar .btn-ghost{ display:none; } }
/* Texto rico: fonte e cor escolhidas no editor. Classes da paleta, nunca style inline.
   Cores = as seis do app (com a versão do tema claro) + dourado / cor do texto / suave. */
:root{ --c-amarelo:#e8d44d; --c-verde:#5dd49f; --c-azul:#6ba3d6; --c-laranja:#e8a857; --c-rosa:#e491b8; --c-vermelho:#e87878; }
html[data-theme="light"]{ --c-amarelo:#9a8408; --c-verde:#1d8a5c; --c-azul:#2c6ea3; --c-laranja:#a86617; --c-rosa:#a83f6f; --c-vermelho:#b03434; }
.f-serif{ font-family:var(--serif) !important; } .f-sans{ font-family:var(--sans) !important; } .f-mono{ font-family:var(--mono) !important; }
.c-dourado{ color:var(--accent) !important; } .c-texto{ color:var(--text) !important; } .c-suave{ color:var(--text-dim) !important; }
.c-amarelo{ color:var(--c-amarelo) !important; } .c-verde{ color:var(--c-verde) !important; } .c-azul{ color:var(--c-azul) !important; } .c-laranja{ color:var(--c-laranja) !important; } .c-rosa{ color:var(--c-rosa) !important; } .c-vermelho{ color:var(--c-vermelho) !important; }
/* O herói vive em cima de um vídeo: paleta ESCURA própria, em qualquer tema
   (no modo claro o texto escuro sumia sobre a imagem). */
.scroll-hero{ height:420vh; --bg:#0b0c0f; --bg-card:#13151a; --text:#f0ece4; --text-dim:rgba(240,236,228,.7); --text-mute:rgba(240,236,228,.42); --accent:#c8a97e; --accent-lo:rgba(200,169,126,.14); --border:rgba(200,169,126,.14); --border-strong:rgba(200,169,126,.28); --accent-strong:rgba(200,169,126,.32); --c-amarelo:#e8d44d; --c-verde:#5dd49f; --c-azul:#6ba3d6; --c-laranja:#e8a857; --c-rosa:#e491b8; --c-vermelho:#e87878; color:var(--text); }
@media (max-width:980px){ .scroll-hero{ height:320vh; } }
.scroll-hero .btn-primary{ color:#0b0c0f; }
.scroll-hero .stage-plaque{ background:rgba(11,12,15,.62); }
html[data-theme="light"] .scroll-hero .btn-primary{ color:#0b0c0f; }
html[data-theme="light"] .scroll-hero .btn-primary:hover{ color:var(--accent); }
.hero-canvas{ position:absolute; inset:0; width:100%; height:100%; display:block; }
.hero-veil{ position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(90deg, rgba(11,12,15,.84) 0%, rgba(11,12,15,.55) 40%, rgba(11,12,15,.1) 75%, rgba(11,12,15,0) 100%),
             linear-gradient(180deg, rgba(11,12,15,.5) 0%, transparent 28%, transparent 72%, rgba(11,12,15,.9) 100%); }
.hero-preview-tag{ position:absolute; top:calc(68px + 1rem); right:1.2rem; z-index:3; font-family:var(--mono); font-size:var(--fs-micro); letter-spacing:.2em; text-transform:uppercase; color:var(--text-mute); border:1px solid var(--border); padding:.3rem .6rem; border-radius:2px; background:rgba(11,12,15,.5); backdrop-filter:blur(8px); }
.plaque-year.is-text{ font-size:clamp(2rem,3.4vw,3.2rem); line-height:1.05; }
/* Galeria de cursos: coluna cabeçalho → faixa das obras → dica. A faixa é um container
   de tamanho e cada obra se dimensiona pela ALTURA que sobrou (100cqh), então nunca
   invade o título nem sai por baixo, em qualquer altura de tela. */
.galeria{ position:relative; height:calc(100vh + 420vw); }
.galeria-stage{ position:sticky; top:0; height:100vh; overflow:hidden; display:flex; flex-direction:column; background:radial-gradient(ellipse 60% 50% at 50% 0%, rgba(200,169,126,.10), transparent 60%), linear-gradient(180deg,#0c0d10 0%, #0b0c0f 60%, #08090b 100%); --text:#f0ece4; --text-dim:rgba(240,236,228,.58); --text-mute:rgba(240,236,228,.32); --accent:#c8a97e; --c-amarelo:#e8d44d; --c-verde:#5dd49f; --c-azul:#6ba3d6; --c-laranja:#e8a857; --c-rosa:#e491b8; --c-vermelho:#e87878; }
.galeria-stage::after{ content:""; position:absolute; left:0; right:0; bottom:0; height:22vh; background:linear-gradient(180deg, transparent, rgba(0,0,0,.55)); pointer-events:none; }
.galeria-piso{ position:absolute; left:0; right:0; bottom:0; height:18vh; background:linear-gradient(180deg, #121317, #0a0b0d); border-top:1px solid rgba(200,169,126,.10); }
.galeria-head{ position:relative; z-index:3; flex:0 0 auto; padding:calc(68px + 2rem) var(--gutter) 0; text-align:center; pointer-events:none; }
.galeria-head .s-title{ font-size:clamp(1.6rem,2.6vw,2.6rem); }
.galeria-band{ position:relative; z-index:2; flex:1 1 auto; min-height:0; container-type:size; }
.galeria-hint{ position:relative; z-index:3; flex:0 0 auto; padding:1.2rem 0 1.5rem; text-align:center; font-family:var(--mono); font-size:var(--fs-micro); letter-spacing:.25em; text-transform:uppercase; color:var(--text-mute); }
.galeria-wall{ position:absolute; top:0; bottom:0; left:0; display:flex; align-items:center; gap:clamp(4rem,8vw,9rem); padding:0 12vw; will-change:transform; }
.obra{ flex:0 0 auto; position:relative; width:clamp(300px,34vw,520px); width:var(--obra-w, min(clamp(300px,34vw,520px), max(260px, calc((100cqh - 280px) / 1.25)))); }
.obra-luz{ position:absolute; left:50%; top:-40vh; width:170%; height:60vh; transform:translateX(-50%); background:radial-gradient(ellipse 50% 100% at 50% 100%, rgba(200,169,126,.16), transparent 70%); pointer-events:none; }
.obra-moldura{ position:relative; padding:14px; background:linear-gradient(135deg,#8a6f45,#c8a97e 40%,#7b6238 60%,#b8985f); border-radius:2px; box-shadow:0 40px 80px -30px rgba(0,0,0,.9), inset 0 0 0 1px rgba(0,0,0,.4); }
.obra-moldura::before{ content:""; position:absolute; inset:6px; border:1px solid rgba(0,0,0,.35); pointer-events:none; }
.obra-passe{ background:#efe9dc; padding:22px; }
.obra-tela{ aspect-ratio:4/5; position:relative; overflow:hidden; background:#1a1d24; border:1px solid rgba(0,0,0,.3); }
.obra-tela img, .obra-tela svg{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.obra-tela .obra-sigla{ position:absolute; left:.9rem; top:.8rem; font-family:var(--mono); font-size:.7rem; letter-spacing:.3em; color:var(--accent); opacity:.9; }
.obra-tela .obra-nome{ position:absolute; left:.9rem; right:.9rem; bottom:.9rem; font-family:var(--serif); font-size:clamp(1.3rem,2vw,1.9rem); line-height:1.1; color:#f0ece4; text-shadow:0 2px 16px rgba(0,0,0,.6); }
.obra-tela .obra-nome em{ color:var(--accent); font-style:italic; }
.placa{ margin:1.4rem auto 0; width:min(96%,360px); padding:.9rem 1.1rem; background:linear-gradient(135deg,#3a3125,#5a4a33 45%,#33291d); border:1px solid rgba(200,169,126,.45); border-radius:2px; box-shadow:0 12px 30px -16px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.08); color:#e6dcc8; }
.placa-titulo{ font-family:var(--serif); font-size:1.1rem; font-weight:500; letter-spacing:.02em; }
.placa-prof{ font-family:var(--sans); font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); margin-top:.15rem; }
.placa-dados{ display:flex; flex-wrap:wrap; gap:.35rem .9rem; margin-top:.55rem; font-family:var(--mono); font-size:.62rem; letter-spacing:.06em; color:rgba(230,220,200,.7); }
.placa-preco{ display:flex; align-items:baseline; justify-content:space-between; margin-top:.6rem; padding-top:.55rem; border-top:1px solid rgba(200,169,126,.25); }
.placa-preco b{ font-family:var(--serif); font-size:1.25rem; font-weight:500; color:#f0ece4; }
.placa-preco small{ font-family:var(--sans); font-size:.62rem; color:rgba(230,220,200,.6); margin-left:.3rem; }
.placa-preco a{ font-family:var(--sans); font-size:.68rem; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); text-decoration:none; border-bottom:1px solid var(--accent-strong); }
.placa-preco a:hover{ color:var(--text); border-color:var(--text); }
.obra.is-placeholder .obra-tela::after{ content:"foto do professor · marcador"; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); font-family:var(--mono); font-size:.6rem; letter-spacing:.2em; text-transform:uppercase; color:rgba(240,236,228,.35); white-space:nowrap; }
@media (max-height:820px) and (min-width:861px){ .galeria-head{ padding-top:calc(68px + 1rem); } .galeria-head .s-label{ margin-bottom:.7rem; } .galeria-hint{ padding:.7rem 0 .9rem; } }
@media (max-height:720px) and (min-width:861px){ .galeria-hint{ display:none; } }
@media (max-width:860px){
  .galeria{ height:auto; } .galeria-stage{ position:relative; height:auto; overflow:visible; display:block; padding:calc(68px + 5rem) 0 4rem; }
  .galeria-head{ position:static; padding:0 var(--gutter); margin-bottom:2rem; pointer-events:auto; } .galeria-band{ position:static; container-type:normal; }
  .galeria-wall{ position:static; flex-direction:column; gap:3.5rem; padding:0 var(--gutter); transform:none !important; }
  .galeria-hint, .galeria-piso, .obra-luz{ display:none; } .obra{ width:min(100%,420px); margin:0 auto; }
}
/* Matérias */
.materias-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:1rem; margin-top:3rem; }
.materia{ position:relative; padding:1.3rem 1.3rem 1.1rem; background:var(--bg-card); border:1px solid var(--border); border-radius:4px; transition:border-color .3s var(--ease), transform .3s var(--ease); }
.materia:hover{ border-color:var(--border-strong); transform:translateY(-3px); }
.materia-sigla{ font-family:var(--mono); font-size:.68rem; letter-spacing:.3em; color:var(--accent); }
.materia-nome{ font-family:var(--serif); font-size:1.35rem; font-weight:500; margin:.35rem 0 .5rem; color:var(--text); }
.materia-desc{ font-size:var(--fs-small); color:var(--text-dim); line-height:1.55; }
.materia-bar{ height:3px; background:var(--border); border-radius:2px; margin-top:.9rem; overflow:hidden; }
.materia-bar i{ display:block; height:100%; width:var(--w,60%); background:linear-gradient(90deg,var(--accent),#e2c99a); }
.materia-meta{ display:flex; justify-content:space-between; font-family:var(--mono); font-size:.62rem; letter-spacing:.08em; color:var(--text-mute); margin-top:.45rem; }
.marcador{ display:inline-block; font-family:var(--mono); font-size:.58rem; letter-spacing:.18em; text-transform:uppercase; color:var(--text-mute); border:1px dashed var(--border-strong); padding:.15rem .45rem; border-radius:2px; vertical-align:middle; }
.plan-free .plan-price{ font-size:clamp(2.6rem,4vw,3.6rem); }
.testimonial-avatar img{ width:100%; height:100%; object-fit:cover; border-radius:50%; }
/* ═══ Demonstração por dados ═══ */
.pp-main .block-title em, .pp-main .vb-title em, .pp-hero-title em, .vnp-launch-title em, .pp-main .gloss-panel-term em, .pp-main .bio-name em, .pp-main .tl-fid-group-title em, .pp-main .kp-title em{ color:var(--accent); font-style:italic; }
.vb-frame{ position:relative; }
.vb-frame iframe{ position:absolute; inset:0; width:100%; height:100%; border:0; }
.pp-main .bio-portrait-frame.sem-retrato{ display:grid; place-items:center; background:linear-gradient(160deg,#2a2d36,#0f1115); }
.pp-main .bio-iniciais{ font-family:var(--serif); font-size:3rem; color:var(--accent); }
.pp-main .block-chips-grupo{ display:contents; }
.pp-main .q-ref-media-box{ flex:0 0 auto; }
.pp-main .q-ref-media-box .q-ref-media{ position:static; }
/* ═══ MODO DE EDIÇÃO (admin) ═══ */
body.ed-on [data-img]{ position:relative; }
body.ed-on .ed-img-box{ min-height:70px; background:var(--bg-deeper) center/cover no-repeat; border:1px dashed rgba(200,169,126,.4); border-radius:3px; margin-top:.5rem; }
body.ed-on .ed-thumb{ width:140px; aspect-ratio:4/3; }
body.ed-on .ed-cap{ font-size:.7rem; padding:.3rem .4rem; background:rgba(0,0,0,.5); color:#f0ece4; }
body.ed-on .ed-gab{ color:var(--green); border-color:rgba(93,212,159,.4); }
body.ed-on .q-ref-media-box[data-img], body.ed-on .gloss-panel-img[data-img]{ min-width:140px; min-height:110px; }
body.ed-on .mosaic-item[data-img]{ min-height:120px; }
body.ed-on .ed-demo{ margin-top:2.5rem; }
body.ed-on .ed-demo-stage{ position:static; height:auto; min-height:0; }
body.ed-on .ed-demo-main{ height:auto; max-height:none; overflow:visible; }
body.ed-on .ed-demo-painel{ margin-top:2.2rem; padding-top:1.2rem; border-top:1px dashed rgba(200,169,126,.35); }
body.ed-on .ed-demo-tag{ font-family:var(--mono); font-size:.62rem; letter-spacing:.2em; text-transform:uppercase; color:#c8a97e; margin-bottom:.8rem; }
body.ed-on .ed-demo .carousel-slide, body.ed-on .ed-demo .ecrit-slide{ display:block !important; animation:none !important; }
body.ed-on .ed-demo .carousel-slide + .carousel-slide{ margin-top:1.2rem; border-top:1px dashed rgba(200,169,126,.25); padding-top:1.2rem; }
body.ed-on .ed-demo .carousel-nav, body.ed-on .ed-demo .carousel-footer, body.ed-on .ed-demo .ecrit-nav, body.ed-on .ed-demo .tg-satellite-nav, body.ed-on .ed-demo .tg-satellite-dots, body.ed-on .ed-demo .tg-satellite-cap[data-caption], body.ed-on .ed-demo .tl-fid-side, body.ed-on .ed-demo .block-nav-row{ display:none !important; }
body.ed-on .ed-demo .tg-satellite-stage{ aspect-ratio:auto; display:grid; gap:.5rem; }
body.ed-on .ed-demo .tg-satellite-slide{ position:relative; opacity:1; pointer-events:auto; aspect-ratio:4/3; }
body.ed-on .ed-demo .fc-card{ aspect-ratio:auto; }
body.ed-on .ed-demo .fc-inner{ transform:none !important; display:grid; grid-template-columns:1fr 1fr; gap:.5rem; height:auto; }
body.ed-on .ed-demo .fc-face{ position:static; transform:none; backface-visibility:visible; -webkit-backface-visibility:visible; min-height:130px; }
body.ed-on .ed-demo .q-feedback{ display:block; }
body.ed-on .ed-demo .essay-aside, body.ed-on .ed-demo .ecrit-slider{ display:block !important; }
body.ed-on .ed-demo .essay-textarea, body.ed-on .ed-demo .cmt-compose{ opacity:.45; pointer-events:none; }
body.ed-on .ed-termos{ margin-top:1.2rem; display:flex; flex-direction:column; gap:.4rem; font-family:var(--sans); font-weight:300; font-size:.78rem; color:var(--text-dim); }
body.ed-on .ed-termos > div{ display:grid; grid-template-columns:200px 1fr; gap:.6rem; align-items:start; padding:.4rem .5rem; background:rgba(0,0,0,.2); border-radius:3px; }
body.ed-on .ed-termos b{ color:var(--accent); font-weight:500; }
body.ed-on{ padding-bottom:84px; }
body.ed-on .sticky-cta, body.ed-on .anchor-menu{ display:none !important; }
body.ed-on [data-e]{ outline:1px dashed rgba(200,169,126,.35); outline-offset:3px; border-radius:2px; cursor:text; min-width:1ch; }
body.ed-on [data-e]:hover, body.ed-on [data-e]:focus{ outline:1px solid var(--accent); background:rgba(200,169,126,.08); }
body.ed-on [data-item]{ position:relative; }
body.ed-on .ed-ctl{ position:absolute; top:-.6rem; right:-.4rem; z-index:20; display:inline-flex; gap:2px; opacity:0; transition:opacity .15s; }
body.ed-on [data-item]:hover > .ed-ctl{ opacity:1; }
body.ed-on .ed-ctl button, body.ed-on .ed-add, body.ed-on .ed-img{ font-family:var(--mono); font-size:.62rem; letter-spacing:.06em; background:#13151a; color:#f0ece4; border:1px solid rgba(200,169,126,.5); border-radius:4px; padding:.15rem .45rem; cursor:pointer; line-height:1.3; }
body.ed-on .ed-ctl button:hover, body.ed-on .ed-add:hover, body.ed-on .ed-img:hover{ background:#c8a97e; color:#0b0c0f; }
body.ed-on .ed-add{ display:inline-flex; margin:.6rem .3rem; padding:.3rem .7rem; border-style:dashed; }
/* botões de foto no canto de cima, longe do nome que fica embaixo do quadro */
body.ed-on .ed-img{ position:absolute; top:.5rem; right:.5rem; z-index:20; white-space:nowrap; }
body.ed-on .ed-img-x{ top:2.3rem; }
body.ed-on .testimonial-avatar .ed-img{ top:auto; right:auto; left:50%; bottom:-1.6rem; transform:translateX(-50%); }
body.ed-on .testimonial-avatar .ed-img-x{ bottom:-3.2rem; }
body.ed-on .ed-nota{ text-align:center; margin-top:.8rem; font-family:var(--sans); font-size:.72rem; color:var(--text-mute); }
body.ed-on .ed-url{ display:inline-block; min-width:16ch; padding:.1rem .4rem; }
/* edição do herói: os três atos viram um roteiro parado, um embaixo do outro, cada um sobre o quadro do vídeo daquele momento */
body.ed-on .scroll-hero{ height:auto; }
body.ed-on .scroll-stage{ position:static; height:auto; overflow:visible; background:#0b0c0f; }
body.ed-on .hero-canvas, body.ed-on .hero-veil, body.ed-on .scroll-hint, body.ed-on .hero-preview-tag{ display:none; }
body.ed-on .stage-overlay{ position:static; display:block; padding:0; }
body.ed-on .stage-inner{ display:block; max-width:none; margin:0; }
body.ed-on .panel{ position:relative; opacity:1; transform:none; pointer-events:auto; }
.ed-ato{ position:relative; padding:3.5rem var(--gutter); background:#0b0c0f center/cover no-repeat; border-bottom:1px solid rgba(200,169,126,.28); }
.ed-ato:first-child{ padding-top:calc(68px + 3rem); }
.ed-ato::before{ content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(90deg, rgba(11,12,15,.86) 0%, rgba(11,12,15,.6) 40%, rgba(11,12,15,.18) 75%, rgba(11,12,15,.05) 100%), linear-gradient(180deg, rgba(11,12,15,.55) 0%, transparent 30%, transparent 70%, rgba(11,12,15,.85) 100%); }
.ed-ato > *{ position:relative; }
.ed-ato-num{ max-width:var(--maxw); margin:0 auto 1.6rem; display:flex; align-items:center; gap:.8rem; font-family:var(--mono); font-size:.62rem; letter-spacing:.25em; text-transform:uppercase; color:#c8a97e; }
.ed-ato-num::after{ content:""; flex:1; height:1px; background:rgba(200,169,126,.35); }
.ed-ato-grid{ max-width:var(--maxw); margin:0 auto; display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); gap:clamp(2rem,5vw,5rem); align-items:center; }
@media (max-width:980px){ .ed-ato-grid{ grid-template-columns:1fr; } body.ed-on .stage-plaque{ display:flex; } }
/* edição da galeria: todas as obras numa grade parada (nada de rolagem lateral nem 100vh) */
body.ed-on .galeria{ height:auto; }
body.ed-on .galeria-stage{ position:relative; height:auto; overflow:visible; display:block; padding:calc(68px + 4rem) var(--gutter) 4rem; }
body.ed-on .galeria-stage::after{ display:none; }
body.ed-on .galeria-head{ position:static; padding:0; margin-bottom:2.5rem; pointer-events:auto; }
body.ed-on .galeria-band{ position:static; container-type:normal; }
body.ed-on .galeria-wall{ position:static; display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:3.5rem 2.5rem; padding:0; transform:none !important; align-items:start; max-width:var(--maxw); margin:0 auto; }
body.ed-on .obra{ width:auto; }
body.ed-on .galeria-hint, body.ed-on .galeria-piso, body.ed-on .obra-luz{ display:none; }
body.ed-on .galeria-wall > .ed-add{ align-self:center; justify-self:center; padding:1rem 1.4rem; }
/* barra de formatação do texto rico */
.ed-fmt{ position:fixed; z-index:6000; display:flex; align-items:center; gap:.2rem; padding:.3rem .4rem; background:#13151a; border:1px solid rgba(200,169,126,.5); border-radius:6px; box-shadow:0 14px 34px -14px rgba(0,0,0,.9); font-family:var(--mono); color:#f0ece4; white-space:nowrap; }
.ed-fmt button{ background:transparent; border:1px solid transparent; color:#f0ece4; padding:.2rem .45rem; border-radius:4px; cursor:pointer; font-family:var(--mono); font-size:.66rem; letter-spacing:.04em; line-height:1.4; }
.ed-fmt button:hover{ border-color:rgba(200,169,126,.5); }
.ed-fmt button.on{ background:#c8a97e; color:#0b0c0f; }
.ed-fmt button b{ font-weight:700; } .ed-fmt button i{ font-style:italic; font-family:var(--serif); font-size:.9rem; }
.ed-fmt-sep{ width:1px; height:16px; background:rgba(200,169,126,.3); margin:0 .25rem; }
.ed-fmt button.ed-fmt-cor, .ed-fmt button.ed-fmt-cor.on{ width:16px; height:16px; padding:0; border-radius:50%; border:1px solid rgba(255,255,255,.25); background:currentColor; }
.ed-fmt button.ed-fmt-cor.on{ box-shadow:0 0 0 2px #13151a, 0 0 0 3px #c8a97e; }
.ed-bar{ position:fixed; left:0; right:0; bottom:0; z-index:5000; display:flex; align-items:center; gap:.8rem; padding:.7rem var(--gutter); background:rgba(11,12,15,.96); border-top:1px solid rgba(200,169,126,.35); backdrop-filter:blur(10px); font-family:var(--sans); color:#f0ece4; flex-wrap:wrap; }
.ed-bar-t{ font-family:var(--mono); font-size:.62rem; letter-spacing:.25em; text-transform:uppercase; color:#c8a97e; }
.ed-status{ font-size:.75rem; color:rgba(240,236,228,.6); flex:1; }
.ed-bar-acoes{ display:flex; gap:.5rem; flex-wrap:wrap; }
.ed-bar .btn{ padding:.5rem .9rem; font-size:var(--fs-micro); }
"""

# ── mocks dos 9 cartões de ferramentas + logo ────────────────────────────
tools_html = linhas(3955, 4330)
mocks = []
pos = 0
while True:
    i = tools_html.find('<div class="tool-mock">', pos)
    if i < 0: break
    el = elemento(tools_html, i); mocks.append(el[len('<div class="tool-mock">'):-len('</div>')]); pos = i + len(el)
assert len(mocks) == 9, len(mocks)
MOCK_NOMES = ['Destaques semânticos', 'Anotações com tags', 'Flashcard frente e verso', 'Meu desempenho (matéria)', 'Portal de referências', 'Modo estudo (blocos)', 'Tutor de IA (chat)', 'Desempenho por tema', 'Simulados']
# ── ilustrações novas (landing/ilustracoes.html): CSS + blocos nomeados ──
IL = io.open(os.path.join(AQUI, 'ilustracoes.html'), encoding='utf8').read()
css_ilustracoes = IL[IL.index('<style>') + 7:IL.index('</style>')]
def _heat():
    out = []
    for r in range(7):
        for c in range(14):
            lv = ((c * 3 + r * 5 + (c // 4)) % 7)
            lv = 0 if (r in (0, 6) and lv < 4) else min(4, lv // 1 if lv < 5 else 4)
            if c < 2 and lv > 1: lv = 1
            out.append('<i class="l%d"></i>' % lv if lv else '<i></i>')
    return ''.join(out)
def _wave():
    import math
    return ''.join('<i style="height:%d%%"></i>' % int(22 + 70 * abs(math.sin(i * 0.62) * math.cos(i * 0.21))) for i in range(34))
def _cal():
    out = ''.join('<b>%s</b>' % d for d in 'DSTQQSS')
    for d in range(1, 29):
        cls = ' class="on"' if d == 11 else (' class="dot"' if d in (4, 18, 25) else '')
        out += '<i%s>%d</i>' % (cls, d)
    return out
IL_corpo = IL[IL.index('</style>') + 8:].replace('{{HEAT}}', _heat()).replace('{{WAVE}}', _wave()).replace('{{CAL}}', _cal())
for nome, html in re.findall(r'^<!-- ilustracao: (.+?) -->\n([\s\S]*?)(?=^<!-- ilustracao: |\Z)', IL_corpo, re.M):
    mocks.append(html.strip()); MOCK_NOMES.append(nome.strip())
assert len(mocks) == len(MOCK_NOMES) == 20, (len(mocks), len(MOCK_NOMES))
css_extra += css_ilustracoes + r"""
/* editor: seletor de ilustração no card + "voltar ao padrão" por seção */
body.ed-on .ed-mock{ position:absolute; top:.5rem; right:.5rem; z-index:20; }
body.ed-on .ed-mock select{ font-family:var(--mono); font-size:.62rem; letter-spacing:.04em; background:#13151a; color:#f0ece4; border:1px solid rgba(200,169,126,.5); border-radius:4px; padding:.2rem .35rem; max-width:210px; cursor:pointer; }
body.ed-on [data-sec]{ position:relative; }
body.ed-on .ed-reset{ position:absolute; top:-2.4rem; right:0; z-index:30; font-family:var(--mono); font-size:.6rem; letter-spacing:.08em; background:rgba(11,12,15,.7); color:rgba(240,236,228,.6); border:1px dashed rgba(200,169,126,.45); border-radius:4px; padding:.2rem .5rem; cursor:pointer; }
body.ed-on .ed-reset:hover{ color:#0b0c0f; background:#c8a97e; border-style:solid; }
body.ed-on .stage-inner > .ed-reset{ top:.6rem; right:var(--gutter); }
"""
logo_svg = re.search(r'<span class="footer-brand-logo">\s*(<svg.*?</svg>)', P, re.S).group(1)
topbar_logo_svg = re.search(r'<a href="#top" class="topbar-logo" aria-label="Ubique">\s*(<svg.*?</svg>)', P, re.S).group(1)

# ── CONTEÚDO PADRÃO (o que o admin edita) ─────────────────────────────────
def curso(sigla, nome, materia, prof, cred, dados, foto=''):
    return { 'sigla': sigla, 'nome': nome, 'materia': materia, 'professor': prof, 'foto': foto, 'dados': [cred, dados, 'questões de provas: a definir'], 'preco': 'R$ 100', 'precoNota': '/ mês por matéria · a confirmar', 'cta': 'Ver matéria', 'link': 'app' }
DEFAULT = {
  'cta': { 'app': APP, 'sticky': 'Criar conta grátis' },
  'hero': {
    'placaRotulo': 'Brasília · Palácio Itamaraty',
    'atos': [
      { 'rotulo': 'Preparação completa · CACD', 'titulo': 'Do primeiro tópico<br>do edital ao <em>Itamaraty</em>.', 'texto': 'A Falcon reúne, numa só plataforma, as aulas dos melhores professores de cada matéria, o banco de provas anteriores classificado pelo edital, flashcards, cadernos e um tutor de IA. Feita para quem vai prestar o concurso de diplomata.', 'cta1': { 'label': 'Criar conta grátis', 'href': 'app' }, 'cta2': { 'label': 'Ver os cursos', 'href': '#cursos' }, 'meta': ['Continue rolando para sobrevoar o Itamaraty'] },
      { 'rotulo': 'Ato II · A plataforma', 'titulo': 'Todo o <em>CACD</em>,<br>num só lugar.', 'texto': 'Matéria por matéria, unidade por unidade: texto editorial, videoaula, questões de provas reais, flashcards e desempenho por tópico do edital, costurados na mesma tela. Nada de abrir cinco aplicativos para estudar um tema.', 'cta1': { 'label': 'Veja na prática', 'href': '#integrado' }, 'cta2': None, 'meta': ['n matérias', 'n unidades', 'n questões de provas'] },
      { 'rotulo': 'Ato III · Feita para a banca', 'titulo': 'Estude o que a banca<br><em>cobra</em>.', 'texto': 'Cada questão de prova anterior está ligada ao tópico do edital. Você vê a recorrência de cada tema, o que precisa estar seguro e onde ainda perde ponto, antes da prova, não depois.', 'cta1': { 'label': 'Criar conta grátis', 'href': 'app' }, 'cta2': { 'label': 'Conhecer os professores', 'href': '#cursos' }, 'meta': ['Conta gratuita', 'Primeira unidade de cada matéria aberta'] }
    ],
    'placa': [
      { 'year': "O espelho d'água", 'name': 'Sobre o lago', 'desc': "O voo chega de longe, rasante sobre o gramado, e cruza o espelho d'água do Palácio Itamaraty, sede do Ministério das Relações Exteriores, com o Meteoro à frente." },
      { 'year': 'O Meteoro', 'name': 'Bruno Giorgi · 1967', 'desc': 'A escultura de mármore no meio do lago: cinco continentes num só bloco, símbolo da casa da diplomacia brasileira.' },
      { 'year': 'O jardim', 'name': 'Burle Marx', 'desc': 'A câmera sobe pela fachada e chega ao terraço: o jardim de Burle Marx, a chegada depois de todo o caminho de estudo.' }
    ]
  },
  'strip': { 'rotulo': 'Preparação específica para', 'itens': ['CACD', 'Instituto Rio Branco', 'Edital vivo', 'Provas anteriores', 'Bibliografia da banca'] },
  'video': { 'rotulo': 'Vídeo de apresentação', 'titulo': 'Veja a plataforma<br><em>por dentro</em>.', 'texto': 'Em poucos minutos: como uma unidade é estudada de ponta a ponta, como as questões de provas anteriores conversam com o edital e como o tutor de IA entra no meio do estudo.', 'chip': 'Assista gratuitamente', 'legenda': '"O caminho inteiro do candidato, numa plataforma só."', 'tituloVideo': 'Falcon, por dentro:<br><em>aulas, provas, flashcards, cadernos e tutor</em>', 'duracao': 'em breve', 'url': '' },
  'cursos': { 'rotulo': 'Os cursos e seus professores', 'titulo': 'Uma matéria, <em>um especialista</em>.', 'dica': 'Role para caminhar pela galeria', 'itens': [
      curso('HB', 'História <em>do Brasil</em>', 'História do Brasil', 'Cláudia Viscardi', 'Professora doutora titular · UFJF', '3 módulos · 43 unidades', 'landing/fotos/claudia-viscardi.webp'),
      curso('HM', 'História <em>Mundial</em>', 'História Mundial', 'Gabriel Falcão', 'Diplomata · aprovado no CACD 2024', 'módulos · unidades', 'landing/fotos/gabriel-falcao.webp'),
      curso('PI', 'Política <em>Internacional</em>', 'Política Internacional', 'Marcílio Falcão', 'Diplomata · fundador do Grupo Ubique', 'módulos · unidades', 'landing/fotos/marcilio-falcao.webp'),
      curso('ECO', 'Economia', 'Economia', 'Rogério Graça', 'Diplomata · aprovado no CACD 2023', 'módulos · unidades', 'landing/fotos/rogerio-graca.webp'),
      curso('DI', 'Direito <em>Interno</em>', 'Direito Interno', 'Giovanna Souza', 'Diplomata · 1º lugar no CACD 2023', 'módulos · unidades', 'landing/fotos/giovanna-souza.webp'),
      curso('DIP', 'Direito <em>Internacional</em>', 'Direito Internacional', 'Juliana Barreto', 'Diplomata', 'módulos · unidades'),
      curso('GEO', 'Geografia', 'Geografia', 'Luis Marcelo', 'Diplomata · aprovado no CACD 2024', 'módulos · unidades', 'landing/fotos/luis-marcelo.webp'),
      curso('LP', 'Língua <em>Portuguesa</em>', 'Língua Portuguesa', 'Professor a definir', 'credenciais', 'módulos · unidades'),
      curso('ING', 'Inglês', 'Inglês', 'Professor a definir', 'credenciais', 'módulos · unidades') ] },
  'demo': { 'rotulo': 'Veja na prática', 'titulo': 'A plataforma inteira,<br><em>à mão</em> do candidato.', 'texto': 'Toque no botão abaixo para abrir uma unidade de exemplo (<strong>História do Brasil — A Chegada, 1500</strong>) dentro da própria plataforma. Você navega pelos <strong>13 tipos de bloco</strong>: texto editorial, vídeo, quiz, discursiva, flashcards, fórum e mais.' },
  'ferramentas': { 'rotulo': 'Diferenciais da plataforma', 'titulo': 'O que nenhuma preparação<br>para o CACD tinha <em>reunido</em>.', 'texto': 'Teoria e prática só viram aprovação com revisão ativa e autoconhecimento. A Falcon entrega <strong>os instrumentos que faltam</strong> na rotina do candidato sério, costurados em volta de cada unidade de cada matéria.', 'itens': [
      { 'mock': 0, 'numero': 'I · Destaques semânticos', 'titulo': 'Sete cores. <em>Sete significados</em>.', 'texto': 'Amarelo é teoria. Verde é exemplo. Vermelho é armadilha. Cada cor tem uma função que você define, e <strong>todos os trechos destacados ficam salvos</strong>, compilados por unidade e por matéria.' },
      { 'mock': 1, 'numero': 'II · Anotações com temas e tags', 'titulo': 'Anote <em>dentro do texto</em>.', 'texto': 'Notas ancoradas no parágrafo exato que as inspirou. Organize por <strong>temas e etiquetas</strong>, pesquise com busca por texto e recupere tudo quando voltar semanas depois.' },
      { 'mock': 2, 'numero': 'III · Flashcards com repetição espaçada', 'titulo': 'Crie o card <em>no meio da leitura</em>.', 'texto': 'Selecione o trecho, crie o flashcard ali mesmo ou peça à IA. A revisão segue o agendamento inteligente: você revisa o que está prestes a esquecer. Leve os cards para o Anki ou presenteie um colega.' },
      { 'mock': 7, 'numero': 'IV · Desempenho por tema e Raio-X', 'titulo': 'Você sabe <em>onde está</em>.', 'texto': 'Acerto por tópico do edital, por unidade e por matéria, atualizado a cada questão. O <strong>Raio-X</strong> lê tudo isso e diz o que estudar primeiro, antes da prova, não depois.' },
      { 'mock': 15, 'numero': 'V · Compilar para estudar', 'titulo': 'Tudo <em>num arquivo só</em>.', 'texto': 'O texto da unidade com os seus grifos, notas e caderno, ou as provas que você fez, compilados num documento para imprimir ou levar. Cada compilado sai com um <strong>código verificável</strong>.' },
      { 'mock': 5, 'numero': 'VI · Estudo por blocos', 'titulo': 'Unidade como <em>trilha</em>.', 'texto': 'Cada unidade é uma sequência de blocos: texto, vídeo, pontos-chave, linha do tempo, glossário, questões, discursiva. Você vê o progresso e retoma de onde parou.' },
      { 'mock': 6, 'numero': 'VII · Tutor de IA, por texto e por voz', 'titulo': 'Um tutor que <em>faz você pensar</em>.', 'texto': 'Por texto e por voz, alimentado pela unidade e pela bibliografia da banca. Tira dúvida, cobra explicação e <strong>encena cenários</strong>: defender a posição do Brasil, ensinar a turma, enfrentar a banca oral.' },
      { 'mock': 14, 'numero': 'VIII · Banco de questões pelo edital', 'titulo': 'Cada questão <em>sabe de onde veio</em>.', 'texto': 'Provas anteriores item por item, cada um ligado ao tópico do edital que cobra. Filtre por <strong>banca, ano, tópico e dificuldade</strong> e treine exatamente o que a prova pede.' },
      { 'mock': 8, 'numero': 'IX · Simulados e provas anteriores', 'titulo': 'Treine no <em>padrão da banca</em>.', 'texto': 'Provas anteriores completas para responder com cronômetro, folha de respostas e nota de corte de cada concorrência, e simulados novos ao longo do ano.' },
      { 'mock': 9, 'numero': 'X · Salas de estudo', 'titulo': 'Estude <em>em grupo</em>.', 'texto': 'Uma sala com o feed do que cada colega faz, questões enviadas <strong>para o grupo corrigir</strong> e a correção devolvida com nota. Estudo cooperativo de verdade, sem sair da plataforma.' },
      { 'mock': 10, 'numero': 'XI · Caderno com conexões', 'titulo': 'Suas ideias, <em>ligadas</em>.', 'texto': 'Um caderno por unidade que cita outras com [[dois colchetes]]. As citações viram um <strong>grafo</strong>: a interdisciplinaridade que o CACD cobra, desenhada pelo seu próprio estudo.' },
      { 'mock': 12, 'numero': 'XII · Brainstorm de discursivas', 'titulo': 'Argumente <em>antes de escrever</em>.', 'texto': 'Liste os argumentos por quesito. A IA avalia <strong>cobertura e ordem</strong>, aponta o que faltou e monta o esqueleto do texto. Só depois vem a redação, também corrigida por IA.' },
      { 'mock': 11, 'numero': 'XIII · Rotina de estudo', 'titulo': 'Constância <em>que se vê</em>.', 'texto': 'Cronômetro automático por atividade, mapa do ano, diário e sequência de dias. Você vê <strong>quanto estudou, o quê</strong> e onde a rotina falha.' },
      { 'mock': 16, 'numero': 'XIV · Ouvir a unidade', 'titulo': 'O texto <em>em áudio</em>.', 'texto': 'A unidade lida em voz, com velocidade de 1 a 2x sem distorcer. Revise no ônibus, na fila, na esteira.' },
      { 'mock': 18, 'numero': 'XV · Fórum e colegas', 'titulo': 'Ninguém estuda <em>sozinho</em>.', 'texto': 'Cada unidade tem o seu fórum. Colegas com perfil, <strong>estatísticas compartilhadas</strong> por quem quiser e flashcards de presente.' },
      { 'mock': 19, 'numero': 'XVI · Correção de discursivas por IA', 'titulo': 'Escreva, envie, <em>receba o feedback</em>.', 'texto': 'Sua redação é corrigida na hora, critério por critério: nota, pontos fortes, o que faltou e <strong>sugestões trecho a trecho</strong>. Depois, compare com uma resposta-modelo e reescreva.' } ] },
  'promessa': { 'rotulo': 'Princípio da Especificidade', 'titulo': 'Não é cursinho genérico.<br>É <em>preparação de banca</em>.', 'texto': 'Todo esforço de estudo rende mais quando é <strong>específico</strong>: à banca que vai cobrar, ao formato da prova, à bibliografia que a comissão respeita e ao histórico do que já caiu. A Falcon foi construída sobre esse princípio.', 'itens': [
      { 'titulo': 'Todo o edital, matéria por matéria', 'texto': 'Cada matéria do CACD organizada em módulos, capítulos e unidades que seguem o edital, com a recorrência de cada tópico nas provas anteriores à vista.' },
      { 'titulo': 'Questões de provas reais, classificadas pelo tópico', 'texto': 'O banco reúne as provas anteriores, item por item, ligadas ao tópico do edital que cobram. Você treina no padrão Cebraspe e sabe de onde vem cada questão.' },
      { 'titulo': 'Discursivas com <em>correção por IA</em>', 'texto': 'Questões no formato da banca, com modelos de resposta e correção instantânea a cada envio, critério por critério.' },
      { 'titulo': 'Tutor de IA que faz <em>você pensar</em>', 'texto': 'Por texto e por voz, alimentado pelo conteúdo da unidade e pela bibliografia da banca. Tira dúvida, mas também devolve em forma de desafio.' },
      { 'titulo': 'Um especialista em cada matéria', 'texto': 'Professores com trajetória na disciplina que ensinam, não um generalista dando conta de tudo. Conheça cada um na galeria de cursos.' },
      { 'titulo': 'Teoria, prática e revisão no mesmo lugar', 'texto': 'Leitura, vídeo, questões, flashcards com repetição espaçada, cadernos, simulados e desempenho por tema: tudo em torno da mesma unidade.' } ] },
  'materias': { 'rotulo': 'Matérias · cobertura do edital', 'titulo': 'As matérias do CACD,<br><em>cada uma com o seu edital</em>.', 'texto': 'Cada matéria é um curso completo e independente: você assina as que precisa, na ordem que quiser. O edital de cada uma é o esqueleto do curso, e a barra abaixo mostra quanto dele já está coberto na plataforma.',
    'stats': [ { 'num': 'n', 'label': 'matérias' }, { 'num': 'n', 'label': 'unidades' }, { 'num': 'n', 'label': 'questões de provas anteriores' }, { 'num': 'n', 'label': 'horas de videoaula' }, { 'num': 'n', 'label': 'professores' }, { 'num': '2ⓤ', 'label': 'de boas-vindas para o tutor de IA' } ],
    'itens': [ { 'sigla': s, 'nome': n, 'desc': d, 'cobertura': c } for s, n, d, c in [
      ('HB', 'História do Brasil', 'Da chegada de Cabral à Nova República, com a bibliografia que a banca cobra.', '82%'), ('HM', 'História Mundial', 'Das revoluções às ordens internacionais do século XX.', 'n%'), ('PI', 'Política Internacional', 'Sistema internacional, política externa brasileira e temas globais.', 'n%'), ('ECO', 'Economia', 'Micro, macro, economia brasileira e internacional.', 'n%'), ('DIP', 'Direito', 'Direito internacional público, direito interno e temas de fronteira.', 'n%'), ('GEO', 'Geografia', 'Geografia política, econômica e do Brasil.', 'n%'), ('LP', 'Língua Portuguesa', 'Redação, gramática e interpretação no padrão da banca.', 'n%'), ('ING', 'Inglês', 'Compreensão, versão e redação para a segunda fase.', 'n%') ] ] },
  'depoimentos': { 'rotulo': 'Alunos', 'titulo': 'Quem estudou por aqui, <em>está lá</em>.', 'nota': 'depoimentos de exemplo · substituir pelos reais', 'itens': [
      { 'texto': 'Depoimento de exemplo. Substituir pelo texto real de um aluno aprovado: o que mudou no estudo, o que a plataforma resolveu, o resultado.', 'iniciais': 'AA', 'foto': '', 'nome': 'Nome do aluno', 'cargo': 'Diplomata · CACD 20xx' },
      { 'texto': 'Depoimento de exemplo. Um comentário curto sobre o banco de questões ou o tutor de IA funciona melhor do que elogios genéricos.', 'iniciais': 'BB', 'foto': '', 'nome': 'Nome do aluno', 'cargo': 'Aprovado na 1ª fase · CACD 20xx' },
      { 'texto': 'Depoimento de exemplo. Preferir alunos com nome, turma e ano, e pedir autorização de uso.', 'iniciais': 'CC', 'foto': '', 'nome': 'Nome do aluno', 'cargo': 'Candidato · turma 20xx' } ] },
  'planos': { 'rotulo': 'Como funciona', 'titulo': 'Conta gratuita. <em>Matérias avulsas</em>.', 'texto': 'Crie a conta sem pagar nada e estude a primeira unidade de cada matéria com tudo ligado. Depois, assine só as matérias que você precisa, pelo tempo que precisar.', 'itens': [
      { 'gratis': True, 'destaque': True, 'ribbon': 'Comece por aqui', 'kind': 'Gratuito · sem cartão', 'nome': 'Conta Falcon', 'tag': 'Para conhecer a plataforma de verdade, com o seu próprio estudo.', 'preco': '0', 'periodo': 'para sempre', 'sub': 'Crie a conta em um minuto · <strong>sem cartão</strong>, sem prazo de teste.', 'inclui': ['<strong>Primeira unidade de cada matéria</strong> aberta, com aulas, questões e flashcards', '<strong>2 UbiTokens de boas-vindas</strong> para usar o tutor de IA', 'Cadernos, destaques, anotações e flashcards próprios salvos na sua conta', 'Edital vivo com a recorrência de cada tópico nas provas', 'Fórum e salas de estudo com outros candidatos'], 'cta': 'Criar conta grátis', 'ctaHref': 'app', 'nota': 'Leva um minuto · você só decide depois se quer assinar alguma matéria' },
      { 'gratis': False, 'destaque': False, 'ribbon': '', 'kind': 'Assinatura · por matéria', 'nome': 'Matéria completa', 'tag': 'Cada matéria é um produto: assine uma, várias ou um combo.', 'preco': '100', 'periodo': '/ mês por matéria', 'sub': 'Preço a confirmar · combos com desconto no carrinho', 'inclui': ['<strong>Todas as unidades</strong> da matéria, com o professor especialista', '<strong>Banco de provas anteriores</strong> da matéria, classificado pelo edital', 'Discursivas com correção por IA e simulados no padrão da banca', 'Desempenho por tópico, Raio-X do estudo e certificado', '<strong>15 UbiTokens por mês</strong> para o tutor de IA'], 'cta': 'Ver as matérias e os preços', 'ctaHref': '#cursos', 'nota': 'Os preços de cada matéria estão nas placas da galeria de cursos' } ] },
  'faq': { 'rotulo': 'Dúvidas frequentes', 'titulo': 'Perguntas que a gente <em>já ouviu</em>.', 'itens': [ { 'q': q, 'a': a } for q, a in [
      ('A conta gratuita tem limite de tempo?', 'Não. Ela é gratuita para sempre: você estuda a primeira unidade de cada matéria, usa seus 2 UbiTokens no tutor e guarda cadernos, flashcards e destaques na sua conta. Só paga se quiser assinar uma matéria inteira.'),
      ('Preciso assinar todas as matérias?', 'Não. Cada matéria é um curso independente. Você assina só as que precisa, pelo tempo que precisar, e pode montar combos com desconto no carrinho.'),
      ('As questões são de provas reais?', 'Sim. O banco reúne itens das provas anteriores do CACD, cada um ligado ao tópico do edital que cobra, com gabarito comentado. Há também questões inéditas no padrão da banca, sempre marcadas como tal.'),
      ('O que é o tutor de IA e o que são os UbiTokens?', 'O tutor responde por texto e por voz a partir do conteúdo da unidade e da bibliografia da banca. Cada uso consome UbiTokens, a moeda interna da plataforma: a conta gratuita ganha 2 de boas-vindas e cada matéria assinada inclui 15 por mês.'),
      ('Os flashcards, cadernos e destaques ficam salvos?', 'Sim, tudo na sua conta. Os flashcards seguem repetição espaçada, os cadernos aceitam citações entre si e portais, e os destaques ficam no texto quando você volta.'),
      ('Posso estudar no celular?', 'Sim. A plataforma é responsiva: leitura, questões, flashcards e tutor funcionam no celular e no tablet, e o seu progresso é o mesmo em qualquer aparelho.'),
      ('Posso cancelar a assinatura de uma matéria?', 'Sim, a qualquer momento, no painel da sua conta. Você mantém o acesso até o fim do período já pago.'),
      ('Serve para quem ainda não decidiu prestar o CACD?', 'Serve. A conta gratuita é a melhor forma de descobrir se o concurso é para você: o edital vivo mostra o tamanho de cada matéria e a primeira unidade dá a medida do estudo.') ] ] },
  'experimentar': { 'rotulo': 'Comece sem pagar nada', 'titulo': 'Antes de assinar,<br><em>experimente</em> de verdade.', 'texto': 'Duas formas de provar a Falcon sem custo: a demonstração aberta nesta página e a conta gratuita, com a primeira unidade de cada matéria e o tutor de IA ligados.', 'itens': [
      { 'eyebrow': 'Agora · sem conta', 'titulo': 'Uma unidade <em>completa</em>, nesta página', 'texto': 'Abra a demonstração e navegue por uma unidade inteira como o aluno vê: texto editorial, vídeo, linha do tempo, quiz, discursiva, flashcards.', 'lista': ['<strong>13 tipos de bloco</strong> · texto, vídeo, quiz, discursiva, flashcards, fórum', '<strong>Destaques e notas</strong> · selecione um trecho e veja como funciona', '<strong>Mesmo design</strong> da plataforma real'], 'cta': 'Abrir a demonstração', 'ctaHref': '#integrado', 'nota': 'Sem cadastro · sem instalar nada' },
      { 'eyebrow': 'Conta gratuita · para sempre', 'titulo': 'A primeira unidade de <em>cada matéria</em>, com tudo ligado', 'texto': 'Crie a conta e estude a primeira unidade de todas as matérias com questões de provas, flashcards, cadernos e o tutor de IA, com 2 UbiTokens de boas-vindas.', 'lista': ['<strong>Sem cartão</strong> · você só decide depois', '<strong>Seu progresso fica salvo</strong> · destaques, notas, flashcards e cadernos', '<strong>Edital vivo</strong> · veja o tamanho de cada matéria antes de assinar'], 'cta': 'Criar conta grátis', 'ctaHref': 'app', 'nota': 'Leva um minuto · você confirma o e-mail e já entra' } ] },
  'final': { 'rotulo': 'Sem risco · conta gratuita', 'titulo': 'Comece hoje,<br><em>sem pagar nada</em>.', 'lead': 'A conta é gratuita e não expira. Você entra, estuda a primeira unidade de cada matéria com tudo ligado e só assina o que quiser, quando quiser.', 'stack': [ { 'num': 'R$ 0', 'label': 'Conta gratuita, sem cartão' }, { 'num': '1ª unidade', 'label': 'De cada matéria, aberta' }, { 'num': '2ⓤ', 'label': 'Para conversar com o tutor de IA' }, { 'num': '1 clique', 'label': 'Para cancelar qualquer matéria' } ], 'reassure': 'Olhe honestamente para o que você viu até aqui: aulas de especialistas, o banco de provas anteriores classificado pelo edital, flashcards, cadernos, tutor de IA e desempenho por tema, num lugar só. O próximo passo custa um minuto.', 'cta': 'Criar conta grátis', 'ctaHref': 'app' },
  'rodape': { 'marca': 'Falcon · <em>Grupo Ubique</em>', 'links': [ { 'label': 'Grupo Ubique', 'href': '#' }, { 'label': 'Ubique Idiomas', 'href': 'https://www.ubiqueidiomas.com.br/' }, { 'label': 'Termos', 'href': '#' }, { 'label': 'Privacidade', 'href': '#' }, { 'label': 'Contato', 'href': '#' } ], 'copyright': '© 2026 Grupo Ubique · Todos os direitos reservados · Preparação para o CACD' }
}
# demonstração "Veja na prática": resumo editável da unidade 01 de HB (landing/demo-conteudo.py)
import importlib.util
_spec = importlib.util.spec_from_file_location('demo_conteudo', os.path.join(AQUI, 'demo-conteudo.py')); _dc = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_dc)
DEFAULT['demo'].update(_dc.DEMO)
NOVO = {
  'cursos.itens': curso('XX', 'Nova <em>matéria</em>', 'Nova matéria', 'Professor a definir', 'credenciais', 'módulos · unidades'),
  'faq.itens': { 'q': 'Nova pergunta?', 'a': 'Resposta.' },
  'depoimentos.itens': { 'texto': 'Texto do depoimento.', 'iniciais': 'AA', 'foto': '', 'nome': 'Nome', 'cargo': 'Cargo · ano' },
  'materias.itens': { 'sigla': 'XX', 'nome': 'Nova matéria', 'desc': 'Descrição.', 'cobertura': 'n%' },
  'promessa.itens': { 'titulo': 'Nova promessa', 'texto': 'Texto.' },
  'ferramentas.itens': { 'mock': 17, 'numero': 'XVI · Nova ferramenta', 'titulo': 'Título', 'texto': 'Texto.' },
  'planos.itens': { 'gratis': False, 'destaque': False, 'ribbon': '', 'kind': 'Tipo', 'nome': 'Nome do plano', 'tag': 'Para quem…', 'preco': '0', 'periodo': '/ mês', 'sub': '', 'inclui': ['Item'], 'cta': 'Assinar', 'ctaHref': 'app', 'nota': '' },
  'hero.atos': { 'rotulo': 'Ato', 'titulo': 'Título', 'texto': 'Texto.', 'cta1': { 'label': 'Criar conta grátis', 'href': 'app' }, 'cta2': None, 'meta': [] },
  'materias.stats': { 'num': 'n', 'label': 'rótulo' }, 'final.stack': { 'num': 'n', 'label': 'rótulo' }, 'rodape.links': { 'label': 'Link', 'href': '#' },
  'experimentar.itens': { 'eyebrow': 'Rótulo', 'titulo': 'Título', 'texto': 'Texto.', 'lista': ['Item'], 'cta': 'Botão', 'ctaHref': 'app', 'nota': '' }
}

# ── shell HTML ───────────────────────────────────────────────────────────
# marca do topo = a mesma do rodapé; o texto vem de rodape.marca (render() preenche o [data-marca])
topbar = ('<header class="topbar">\n  <a href="#top" class="topbar-logo" aria-label="Falcon · Grupo Ubique"><span class="topbar-logo-mark">' + logo_svg + '</span><span class="logo-word" data-marca>Falcon · <em>Grupo Ubique</em></span></a>\n'
  '  <div class="topbar-right"><a class="btn btn-ghost" data-app-link href="' + APP + '">Entrar</a><a class="btn btn-primary" data-app-link href="' + APP + '">Criar conta grátis</a>\n'
  + linhas(3427, 3430) + '\n  </div>\n</header>')
menu = '<aside class="anchor-menu" id="anchorMenu" aria-label="Navegação da página">' + ''.join('<a class="anchor-item" href="#' + i + '" data-target="' + i + '"><span class="anchor-item-dot"></span><span class="anchor-item-label">' + l + '</span></a>' for i, l in [('top', 'Início'), ('video', 'Vídeo'), ('cursos', 'Cursos'), ('integrado', 'Veja na prática'), ('ferramentas', 'Plataforma'), ('materias', 'Matérias'), ('alunos', 'Alunos'), ('planos', 'Planos'), ('faq', 'Dúvidas'), ('experimentar', 'Experimentar')]) + '</aside>'
hero = '''<section class="scroll-hero" id="top"><div class="scroll-stage">
    <canvas class="hero-canvas" id="heroCanvas" aria-hidden="true"></canvas><div class="hero-veil"></div>
    <div class="hero-preview-tag" id="heroPreviewTag">Cena provisória · o vídeo aéreo entra aqui</div>
    <div class="stage-overlay"><div class="stage-inner" data-sec="hero"></div></div>
    <div class="scroll-hint" id="scrollHint"><span>Role para sobrevoar</span><div class="scroll-hint-line"></div></div>
  </div></section>'''
secoes = [
  topbar, menu, hero,
  '<section class="strip"><div class="container" data-sec="strip"></div></section>',
  '<section class="video-section sec-pad" id="video"><div class="container" data-sec="video"></div></section>',
  '<section class="galeria" id="cursos"><div class="galeria-stage" data-sec="cursos"></div></section>',
  '<section class="integrated" id="integrado"><div class="container" data-sec="demo"></div></section>',   # cabeçalho + cartão + player vêm do JSON (demo-render.js)
  linhas(3923, 3950),   # barra de contexto + toast da demo (vivem fora da seção)
  '<section class="study-tools sec-pad" id="ferramentas"><div class="container" data-sec="ferramentas"></div></section>',
  '<section class="promise sec-pad"><div class="container" data-sec="promessa"></div></section>',
  '<section class="curriculum-section sec-pad" id="materias"><div class="container" data-sec="materias"></div></section>',
  '<section class="testimonials sec-pad" id="alunos"><div class="container" data-sec="depoimentos"></div></section>',
  '<section class="pricing sec-pad" id="planos"><div class="container" data-sec="planos"></div></section>',
  '<section class="faq sec-pad" id="faq"><div class="container" data-sec="faq"></div></section>',
  '<section class="tryit sec-pad" id="experimentar"><div class="container" data-sec="experimentar"></div></section>',
  '<section class="final"><div class="container" data-sec="final"></div></section>',
  '<footer class="footer"><div class="container" data-sec="rodape"></div></footer>',
  '<div class="sticky-cta"></div>'
]

# ── scripts ──────────────────────────────────────────────────────────────
runtime = io.open(os.path.join(AQUI, 'landing-runtime.js'), encoding='utf8').read().replace('__SB_URL__', SB_URL).replace('__SB_KEY__', SB_KEY)
# bloco do protótipo: reveal + FAQ + vídeo vira função re-executável (re-render do editor)
bloco = linhas(5343, 5366)
for a in ["document.querySelectorAll('[data-a]').forEach(el => io.observe(el));", "document.querySelectorAll('.faq-q').forEach(q => {", "document.querySelectorAll('.video-player, .play-btn').forEach(el => {"]:
    assert a in bloco, a
bloco = bloco.replace("document.querySelectorAll('.faq-q').forEach(q => {", "document.querySelectorAll('.faq-q').forEach(q => {\n  if(q.__b) return; q.__b = 1;")
bloco = bloco.replace("document.querySelectorAll('.video-player, .play-btn').forEach(el => {", "document.querySelectorAll('.video-player, .play-btn').forEach(el => {\n  if(el.__b) return; el.__b = 1;")
bloco = bloco.replace("const firstFaq = document.querySelector('.faq-item');\nif(firstFaq) firstFaq.classList.add('open');", "if(!document.querySelector('.faq-item.open')){ const firstFaq = document.querySelector('.faq-item'); if(firstFaq) firstFaq.classList.add('open'); }")
js_rebind = "/* reveal + FAQ + vídeo — re-executável após um re-render do editor */\nfunction __landingRebind(){\n" + bloco + "\n}\n__landingRebind(); window.__landingRebind = __landingRebind;\n"
js_menu = linhas(5270, 5339)          # menu-âncora (scrollspy)
js_tema = linhas(5368, 5387)          # tema claro/escuro
_bloco = linhas(5388, 6388)           # protótipo: demo (substituída) + depoimentos + colapso currículo
_i = _bloco.index('PREVIEW: Testimonial carousel'); _i = _bloco.rfind('/*', 0, _i)
js_resto = _bloco[_i:]                # só depoimentos + colapso currículo (a demo agora é por dados)
js_demo_render = io.open(os.path.join(AQUI, 'demo-render.js'), encoding='utf8').read()
js_demo_player = io.open(os.path.join(AQUI, 'demo-player.js'), encoding='utf8').read()
js_hero = io.open(os.path.join(AQUI, 'hero-engine.js'), encoding='utf8').read().replace('__FRAMES_M__', FRAMES_DIR_M).replace('__FRAMES__', FRAMES_DIR).replace('__COUNT__', str(FRAMES_COUNT)).replace('__ATOS__', json.dumps(HERO_ATOS)).replace('__VER__', FRAMES_VER)
js_dados = ('window.LANDING_DEFAULT = ' + json.dumps(DEFAULT, ensure_ascii=False) + ';\n'
  + 'window.LANDING_NOVO = ' + json.dumps(NOVO, ensure_ascii=False) + ';\n'
  + 'window.LANDING_MOCKS = ' + json.dumps(mocks, ensure_ascii=False) + ';\n'
  + 'window.LANDING_MOCK_NOMES = ' + json.dumps(MOCK_NOMES, ensure_ascii=False) + ';\n'
  + 'window.LANDING_LOGO = ' + json.dumps(logo_svg) + ';\n'
  + 'window.LANDING_FRAMES = ' + json.dumps({'dir': FRAMES_DIR, 'count': FRAMES_COUNT, 'atos': HERO_ATOS, 'ver': FRAMES_VER}) + ';\n')

head = '''<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Falcon · Preparação completa para o CACD · Grupo Ubique</title>
<meta name="description" content="A Falcon reúne numa só plataforma as aulas dos melhores professores de cada matéria do CACD, o banco de provas anteriores classificado pelo edital, flashcards, cadernos e um tutor de IA. Conta gratuita.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%230b0c0f'/%3E%3Cpath d='M32 10 L54 32 L32 54 L10 32 Z' fill='none' stroke='%23c8a97e' stroke-width='4'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Outfit:wght@200;300;400;500&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>''' + css_proto + css_extra + '''</style>
</head>
<body>
'''
html = (head + '\n\n'.join(secoes) + '\n\n<script>\n' + js_dados + '</script>\n<script>\n' + js_demo_render + '\n</script>\n<script>\n' + runtime + '\n</script>\n<script>\n'
  + js_menu + '\n' + js_rebind + '\n' + js_tema + '\n' + js_resto + '\n' + js_demo_player + '\n' + js_hero + '\n</script>\n</body>\n</html>\n')
io.open(RAIZ + 'landing.html', 'w', encoding='utf8').write(html)
print('landing.html gerado:', len(html), 'bytes;', html.count('<section'), 'seções;', FRAMES_COUNT, 'quadros;', len(mocks), 'mocks')
