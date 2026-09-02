# -*- coding: utf-8 -*-
"""Monta landing.html da Falcon a partir do protótipo historia-do-brasil-v7.html.
Reaproveita: CSS inteiro, topbar, menu-âncora, demo interativa (pp-main), cartões de
ferramentas, e os scripts do protótipo (menos o herói). Troca: herói (vídeo aéreo
do Itamaraty por quadros, com cena provisória desenhada), galeria de cursos
(no lugar da professora), matérias (no lugar do explorador de currículo),
planos (conta grátis), FAQ, experimentar, final, rodapé e textos."""
import io, re, os
RAIZ = '/Users/guilhermecavalcanti/Documents/Falcon/'
P = io.open(RAIZ + 'historia-do-brasil-v7.html', encoding='utf8').read()
L = P.split('\n')
def linhas(a, b):  # 1-based, inclusivo
    return '\n'.join(L[a-1:b])
def fatia(ini, fim, a_partir=0):
    i = P.index(ini, a_partir); j = P.index(fim, i); return P[i:j], j

APP = 'index.html'          # o app hoje mora na raiz; vira /app/ quando a landing for para a raiz
FRAMES_DIR = 'landing/frames/hero'

# ── 1. CSS do protótipo + acréscimos ─────────────────────────────────────
css_proto = P[P.index('<style>') + len('<style>'):P.index('</style>')]
css_extra = r"""
/* ═════════════════════════════════════════════════
   FALCON · acréscimos da landing (herói por quadros, galeria, matérias)
   ═════════════════════════════════════════════════ */
.topbar-right{ display:flex; align-items:center; gap:.6rem; }
.topbar .btn{ padding:.55rem 1rem; font-size:var(--fs-micro); }
.topbar .btn-ghost{ border-color:var(--border-strong); }
@media (max-width:640px){ .topbar .btn-ghost{ display:none; } }
.topbar-logo{ display:inline-flex; align-items:center; white-space:nowrap; }
.topbar-logo .logo-word{ white-space:nowrap; font-family:var(--serif); font-weight:500; font-size:1.25rem; letter-spacing:.02em; color:var(--text); margin-left:.55rem; }
.topbar-logo .logo-word em{ font-style:normal; color:var(--accent); }

/* Herói: o vídeo (ou a cena provisória) é um canvas preso atrás do texto */
.hero-canvas{ position:absolute; inset:0; width:100%; height:100%; display:block; }
.hero-veil{ position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(90deg, rgba(11,12,15,.78) 0%, rgba(11,12,15,.45) 45%, rgba(11,12,15,.15) 100%),
             linear-gradient(180deg, rgba(11,12,15,.55) 0%, transparent 30%, transparent 70%, rgba(11,12,15,.85) 100%); }
.hero-preview-tag{ position:absolute; top:calc(68px + 1rem); right:1.2rem; z-index:3; font-family:var(--mono); font-size:var(--fs-micro); letter-spacing:.2em; text-transform:uppercase; color:var(--text-mute); border:1px solid var(--border); padding:.3rem .6rem; border-radius:2px; background:rgba(11,12,15,.5); backdrop-filter:blur(8px); }
.plaque-year.is-text{ font-size:clamp(2rem,3.4vw,3.2rem); line-height:1.05; }

/* Galeria de cursos: uma parede de museu que anda para o lado com o scroll */
.galeria{ position:relative; height:calc(100vh + 420vw); }
.galeria-stage{ position:sticky; top:0; height:100vh; overflow:hidden;
  background:radial-gradient(ellipse 60% 50% at 50% 0%, rgba(200,169,126,.10), transparent 60%), linear-gradient(180deg,#0c0d10 0%, #0b0c0f 60%, #08090b 100%); }
.galeria-stage::after{ content:""; position:absolute; left:0; right:0; bottom:0; height:22vh; background:linear-gradient(180deg, transparent, rgba(0,0,0,.55)); pointer-events:none; }
.galeria-piso{ position:absolute; left:0; right:0; bottom:0; height:18vh; background:linear-gradient(180deg, #121317, #0a0b0d); border-top:1px solid rgba(200,169,126,.10); }
.galeria-head{ position:absolute; top:calc(68px + 2rem); left:0; right:0; text-align:center; z-index:3; padding:0 var(--gutter); pointer-events:none; }
.galeria-head .s-title{ font-size:clamp(1.6rem,2.6vw,2.6rem); }
.galeria-hint{ position:absolute; bottom:1.4rem; left:0; right:0; text-align:center; font-family:var(--mono); font-size:var(--fs-micro); letter-spacing:.25em; text-transform:uppercase; color:var(--text-mute); z-index:3; }
.galeria-wall{ position:absolute; top:0; bottom:0; left:0; display:flex; align-items:center; gap:clamp(4rem,8vw,9rem); padding:0 12vw; will-change:transform; }
.obra{ flex:0 0 auto; width:clamp(300px,34vw,520px); position:relative; }
.obra-luz{ position:absolute; left:50%; top:-40vh; width:170%; height:60vh; transform:translateX(-50%);
  background:radial-gradient(ellipse 50% 100% at 50% 100%, rgba(200,169,126,.16), transparent 70%); pointer-events:none; }
.obra-moldura{ position:relative; padding:14px; background:linear-gradient(135deg,#8a6f45,#c8a97e 40%,#7b6238 60%,#b8985f); border-radius:2px; box-shadow:0 40px 80px -30px rgba(0,0,0,.9), inset 0 0 0 1px rgba(0,0,0,.4); }
.obra-moldura::before{ content:""; position:absolute; inset:6px; border:1px solid rgba(0,0,0,.35); pointer-events:none; }
.obra-passe{ background:#efe9dc; padding:22px; }
.obra-tela{ aspect-ratio:4/5; position:relative; overflow:hidden; background:#1a1d24; border:1px solid rgba(0,0,0,.3); }
.obra-tela img, .obra-tela svg{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.obra-tela .obra-sigla{ position:absolute; left:.9rem; top:.8rem; font-family:var(--mono); font-size:.7rem; letter-spacing:.3em; color:var(--accent); opacity:.9; }
.obra-tela .obra-nome{ position:absolute; left:.9rem; right:.9rem; bottom:.9rem; font-family:var(--serif); font-size:clamp(1.3rem,2vw,1.9rem); line-height:1.1; color:#f0ece4; text-shadow:0 2px 16px rgba(0,0,0,.6); }
.obra-tela .obra-nome em{ color:var(--accent); font-style:italic; }
.placa{ margin:1.4rem auto 0; width:min(88%,360px); padding:.9rem 1.1rem; background:linear-gradient(135deg,#3a3125,#5a4a33 45%,#33291d); border:1px solid rgba(200,169,126,.45); border-radius:2px; box-shadow:0 12px 30px -16px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.08); color:#e6dcc8; }
.placa-titulo{ font-family:var(--serif); font-size:1.1rem; font-weight:500; letter-spacing:.02em; }
.placa-prof{ font-family:var(--sans); font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); margin-top:.15rem; }
.placa-dados{ display:flex; flex-wrap:wrap; gap:.35rem .9rem; margin-top:.55rem; font-family:var(--mono); font-size:.62rem; letter-spacing:.06em; color:rgba(230,220,200,.7); }
.placa-preco{ display:flex; align-items:baseline; justify-content:space-between; margin-top:.6rem; padding-top:.55rem; border-top:1px solid rgba(200,169,126,.25); }
.placa-preco b{ font-family:var(--serif); font-size:1.25rem; font-weight:500; color:#f0ece4; }
.placa-preco small{ font-family:var(--sans); font-size:.62rem; color:rgba(230,220,200,.6); margin-left:.3rem; }
.placa-preco a{ font-family:var(--sans); font-size:.68rem; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); text-decoration:none; border-bottom:1px solid var(--accent-strong); }
.placa-preco a:hover{ color:var(--text); border-color:var(--text); }
.obra.is-placeholder .obra-tela::after{ content:"foto do professor · marcador"; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); font-family:var(--mono); font-size:.6rem; letter-spacing:.2em; text-transform:uppercase; color:rgba(240,236,228,.35); white-space:nowrap; }
@media (max-width:860px){
  .galeria{ height:auto; }
  .galeria-stage{ position:relative; height:auto; overflow:visible; padding:calc(68px + 5rem) 0 4rem; }
  .galeria-head{ position:static; margin-bottom:2rem; pointer-events:auto; }
  .galeria-wall{ position:static; flex-direction:column; gap:3.5rem; padding:0 var(--gutter); transform:none !important; }
  .galeria-hint, .galeria-piso, .obra-luz{ display:none; }
  .obra{ width:min(100%,420px); margin:0 auto; }
}

/* Matérias do CACD (no lugar do explorador de currículo) */
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

/* Planos: conta grátis + matéria como produto */
.plan-free .plan-price{ font-size:clamp(2.6rem,4vw,3.6rem); }
.plan-includes .no{ opacity:.55; }
"""

# ── 2. Topbar (com Entrar / Criar conta) ─────────────────────────────────
topbar = linhas(3423, 3431)
topbar = topbar.replace('<a href="#top" class="topbar-logo" aria-label="Ubique">', '<a href="#top" class="topbar-logo" aria-label="Falcon">')
topbar = topbar.replace('  </a>\n  <button class="theme-toggle"', '    <span class="logo-word">Falcon <em>·</em> Ubique</span>\n  </a>\n  <div class="topbar-right">\n  <a class="btn btn-ghost" data-app-link href="' + APP + '">Entrar</a>\n  <a class="btn btn-primary" data-app-link href="' + APP + '">Criar conta grátis</a>\n  <button class="theme-toggle"')
topbar = topbar.replace('  </button>\n</header>', '  </button>\n  </div>\n</header>')

menu = '''<aside class="anchor-menu" id="anchorMenu" aria-label="Navegação da página">
  <a class="anchor-item" href="#top" data-target="top"><span class="anchor-item-dot"></span><span class="anchor-item-label">Início</span></a>
  <a class="anchor-item" href="#video" data-target="video"><span class="anchor-item-dot"></span><span class="anchor-item-label">Vídeo</span></a>
  <a class="anchor-item" href="#cursos" data-target="cursos"><span class="anchor-item-dot"></span><span class="anchor-item-label">Cursos</span></a>
  <a class="anchor-item" href="#integrado" data-target="integrado"><span class="anchor-item-dot"></span><span class="anchor-item-label">Veja na prática</span></a>
  <a class="anchor-item" href="#ferramentas" data-target="ferramentas"><span class="anchor-item-dot"></span><span class="anchor-item-label">Plataforma</span></a>
  <a class="anchor-item" href="#materias" data-target="materias"><span class="anchor-item-dot"></span><span class="anchor-item-label">Matérias</span></a>
  <a class="anchor-item" href="#alunos" data-target="alunos"><span class="anchor-item-dot"></span><span class="anchor-item-label">Alunos</span></a>
  <a class="anchor-item" href="#planos" data-target="planos"><span class="anchor-item-dot"></span><span class="anchor-item-label">Planos</span></a>
  <a class="anchor-item" href="#faq" data-target="faq"><span class="anchor-item-dot"></span><span class="anchor-item-label">Dúvidas</span></a>
  <a class="anchor-item" href="#experimentar" data-target="experimentar"><span class="anchor-item-dot"></span><span class="anchor-item-label">Experimentar</span></a>
</aside>'''

# ── 3. Herói ─────────────────────────────────────────────────────────────
SETA = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7"/></svg>'
hero = '''<section class="scroll-hero" id="top">
  <div class="scroll-stage">
    <canvas class="hero-canvas" id="heroCanvas" aria-hidden="true"></canvas>
    <div class="hero-veil"></div>
    <div class="hero-preview-tag" id="heroPreviewTag">Cena provisória · o vídeo aéreo entra aqui</div>

    <div class="stage-overlay">
      <div class="stage-inner">
        <div class="stage-text">
          <div class="panel on" data-panel="0">
            <div class="s-label">
              <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              Preparação completa · CACD
            </div>
            <h1>Do primeiro tópico<br>do edital ao <em>Itamaraty</em>.</h1>
            <p>A Falcon reúne, numa só plataforma, as aulas dos melhores professores de cada matéria, o banco de provas anteriores classificado pelo edital, flashcards, cadernos e um tutor de IA. Feita para quem vai prestar o concurso de diplomata.</p>
            <div class="cta-row">
              <a class="btn btn-primary" data-app-link href="''' + APP + '''">Criar conta grátis ''' + SETA + '''</a>
              <a href="#cursos" class="btn btn-ghost">Ver os cursos</a>
            </div>
            <div class="meta-row"><span>Continue rolando para sobrevoar o Itamaraty</span></div>
          </div>

          <div class="panel" data-panel="1">
            <div class="s-label">
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></svg>
              Ato II · A plataforma
            </div>
            <h1>Todo o <em>CACD</em>,<br>num só lugar.</h1>
            <p>Matéria por matéria, unidade por unidade: texto editorial, videoaula, questões de provas reais, flashcards e desempenho por tópico do edital, costurados na mesma tela. Nada de abrir cinco aplicativos para estudar um tema.</p>
            <div class="cta-row">
              <a href="#integrado" class="btn btn-primary">Veja na prática ''' + SETA + '''</a>
            </div>
            <div class="meta-row"><span><span class="marcador">n</span> matérias</span><span><span class="marcador">n</span> unidades</span><span><span class="marcador">n</span> questões de provas</span></div>
          </div>

          <div class="panel" data-panel="2">
            <div class="s-label">
              <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01"/></svg>
              Ato III · Feita para a banca
            </div>
            <h1>Estude o que a banca<br><em>cobra</em>.</h1>
            <p>Cada questão de prova anterior está ligada ao tópico do edital. Você vê a recorrência de cada tema, o que precisa estar seguro e onde ainda perde ponto, antes da prova, não depois.</p>
            <div class="cta-row">
              <a class="btn btn-primary" data-app-link href="''' + APP + '''">Criar conta grátis ''' + SETA + '''</a>
              <a href="#cursos" class="btn btn-ghost">Conhecer os professores</a>
            </div>
            <div class="meta-row"><span>Conta gratuita</span><span>Primeira unidade de cada matéria aberta</span></div>
          </div>
        </div>

        <div>
          <div class="stage-plaque">
            <div class="plaque-corner tl"></div><div class="plaque-corner tr"></div>
            <div class="plaque-corner bl"></div><div class="plaque-corner br"></div>
            <div class="plaque-top-label">Brasília · Palácio Itamaraty</div>
            <div class="plaque-year is-text" id="plaqueYear">O espelho d'água</div>
            <div class="plaque-event">
              <div class="plaque-event-name" id="plaqueName">Sobre o lago</div>
              <div class="plaque-event-desc" id="plaqueDesc">A câmera cruza o espelho d'água do palácio, sede do Ministério das Relações Exteriores desde 1970.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="scroll-hint" id="scrollHint">
      <span>Role para sobrevoar</span>
      <div class="scroll-hint-line"></div>
    </div>
  </div>
</section>'''

# ── 4. Strip + vídeo ──────────────────────────────────────────────────────
strip = '''<section class="strip">
  <div class="container">
    <div class="strip-inner">
      <div class="strip-label">Preparação específica para</div>
      <div class="strip-logos">
        <span>CACD</span><span>·</span><span>Instituto Rio Branco</span><span>·</span><span>Edital vivo</span><span>·</span><span>Provas anteriores</span><span>·</span><span>Bibliografia da banca</span>
      </div>
    </div>
  </div>
</section>'''

video = linhas(3678, 3715)
video = video.replace('Uma <em>aula aberta</em> com<br>a professora Cláudia Viscardi.', 'Veja a plataforma<br><em>por dentro</em>.')
video = re.sub(r'Em 4 minutos, a professora mostra .*?</p>', 'Em poucos minutos: como uma unidade é estudada de ponta a ponta, como as questões de provas anteriores conversam com o edital e como o tutor de IA entra no meio do estudo. <span class="marcador">vídeo a produzir</span></p>', video, flags=re.S)
video = video.replace('"O que a banca cobra — e como este curso te prepara."', '"O caminho inteiro do candidato, numa plataforma só."')
video = video.replace('História do Brasil no CACD:<br>\n            <em>o método para cobrir 200% do edital</em>', 'Falcon, por dentro:<br>\n            <em>aulas, provas, flashcards, cadernos e tutor</em>')
video = video.replace('<div class="video-duration">04:32</div>', '<div class="video-duration">em breve</div>')

# ── 5. Galeria de cursos ─────────────────────────────────────────────────
CURSOS = [
  ('HB', 'História', 'do Brasil', 'Cláudia Viscardi', 'Doutora em História Social · UFJF', '3 módulos · 43 unidades', True),
  ('HM', 'História', 'Mundial', 'Professor a definir', 'marcador', 'módulos · unidades', False),
  ('PI', 'Política', 'Internacional', 'Professor a definir', 'marcador', 'módulos · unidades', False),
  ('ECO', 'Economia', '', 'Professor a definir', 'marcador', 'módulos · unidades', False),
  ('DIP', 'Direito', '', 'Professor a definir', 'marcador', 'módulos · unidades', False),
  ('GEO', 'Geografia', '', 'Professor a definir', 'marcador', 'módulos · unidades', False),
  ('LP', 'Língua', 'Portuguesa', 'Professor a definir', 'marcador', 'módulos · unidades', False),
  ('ING', 'Inglês', '', 'Professor a definir', 'marcador', 'módulos · unidades', False),
]
def obra(c):
    sigla, n1, n2, prof, cred, dados, real = c
    silhueta = ('<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">'
      '<defs><linearGradient id="g' + sigla + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2d36"/><stop offset="1" stop-color="#0f1115"/></linearGradient></defs>'
      '<rect width="400" height="500" fill="url(#g' + sigla + ')"/>'
      '<circle cx="200" cy="205" r="70" fill="#3a3f4b"/>'
      '<path d="M60 500 C60 380 120 320 200 320 C280 320 340 380 340 500 Z" fill="#3a3f4b"/>'
      '<path d="M0 0 L400 0 L400 60 L0 130 Z" fill="rgba(200,169,126,.10)"/></svg>')
    nome = n1 + (' <em>' + n2 + '</em>' if n2 else '')
    return ('<figure class="obra' + ('' if real else ' is-placeholder') + '">'
      '<div class="obra-luz"></div>'
      '<div class="obra-moldura"><div class="obra-passe"><div class="obra-tela">' + silhueta +
      '<span class="obra-sigla">' + sigla + '</span><span class="obra-nome">' + nome + '</span></div></div></div>'
      '<figcaption class="placa">'
      '<div class="placa-titulo">' + n1 + (' ' + n2 if n2 else '') + '</div>'
      '<div class="placa-prof">' + prof + '</div>'
      '<div class="placa-dados"><span>' + cred + '</span><span>' + dados + '</span><span>questões de provas · <span class="marcador">n</span></span></div>'
      '<div class="placa-preco"><span><b>R$ 100</b><small>/ mês por matéria · <span class="marcador">a confirmar</span></small></span><a data-app-link href="' + APP + '">Ver matéria</a></div>'
      '</figcaption></figure>')
galeria = '''<section class="galeria" id="cursos">
  <div class="galeria-stage">
    <div class="galeria-head">
      <div class="s-label" style="margin-left:auto;margin-right:auto">
        <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Os cursos e seus professores
      </div>
      <h2 class="s-title">Uma matéria, <em>um especialista</em>.</h2>
    </div>
    <div class="galeria-wall" id="galeriaWall">''' + ''.join(obra(c) for c in CURSOS) + '''</div>
    <div class="galeria-piso"></div>
    <div class="galeria-hint">Role para caminhar pela galeria</div>
  </div>
</section>'''

# ── 6. Demo interativa (como está) + ferramentas + promessa ──────────────
integrado = linhas(3764, 3954)
integrado = integrado.replace('O curso inteiro,<br><em>à mão</em> do candidato.', 'A plataforma inteira,<br><em>à mão</em> do candidato.')
integrado = re.sub(r'Toque no botão abaixo para abrir a <strong>Unidade 1 — A Chegada \(1500\)</strong> dentro da própria plataforma\.', 'Toque no botão abaixo para abrir uma unidade de exemplo (<strong>História do Brasil — A Chegada, 1500</strong>) dentro da própria plataforma.', integrado)
integrado = integrado.replace('Mesmo design, mesmas funcionalidades. Selecione um trecho para destacar, marque flashcards, responda às questões — tudo que o aluno tem na plataforma real.', 'Mesmo design, mesmas funcionalidades de qualquer matéria da Falcon. Selecione um trecho para destacar, marque flashcards, responda às questões — tudo que o aluno tem na plataforma real.')

ferramentas = linhas(3955, 4330)
ferramentas = ferramentas.replace('O que nenhum outro curso<br>de História tem <em>reunido</em>.', 'O que nenhuma preparação<br>para o CACD tinha <em>reunido</em>.')
ferramentas = re.sub(r'Teoria e prática só viram aprovação com revisão ativa e autoconhecimento\. A plataforma entrega <strong>os seis instrumentos que faltam</strong> na rotina do candidato sério — e os cost[^<]*', 'Teoria e prática só viram aprovação com revisão ativa e autoconhecimento. A Falcon entrega <strong>os instrumentos que faltam</strong> na rotina do candidato sério, costurados em volta de cada unidade de cada matéria.', ferramentas)
ferramentas = ferramentas.replace('Cláudia Viscardi', 'os professores').replace('de História', 'do CACD')

promessa = linhas(4331, 4396)
promessa = promessa.replace('Não é curso genérico.<br>É <em>curso de banca</em>.', 'Não é cursinho genérico.<br>É <em>preparação de banca</em>.')
promessa = re.sub(r'<div class="promise-list">.*?</div>\n      </div>\n    </div>\n  </div>\n</section>', '''<div class="promise-list">
          <div class="promise-item" data-a="2"><div class="promise-num">01</div><div><h3>Todo o edital, matéria por matéria</h3><p>Cada matéria do CACD organizada em módulos, capítulos e unidades que seguem o edital, com a recorrência de cada tópico nas provas anteriores à vista.</p></div></div>
          <div class="promise-item" data-a="3"><div class="promise-num">02</div><div><h3>Questões de provas reais, classificadas pelo tópico</h3><p>O banco reúne as provas anteriores, item por item, ligadas ao tópico do edital que cobram. Você treina no padrão Cebraspe e sabe exatamente de onde vem cada questão.</p></div></div>
          <div class="promise-item" data-a="4"><div class="promise-num">03</div><div><h3>Discursivas com <em>correção por IA</em></h3><p>Questões no formato da banca, com modelos de resposta e correção instantânea a cada envio, critério por critério.</p></div></div>
          <div class="promise-item" data-a="5"><div class="promise-num">04</div><div><h3>Tutor de IA que faz <em>você pensar</em></h3><p>Por texto e por voz, alimentado pelo conteúdo da unidade e pela bibliografia da banca. Tira dúvida, mas também devolve em forma de desafio.</p></div></div>
          <div class="promise-item" data-a="6"><div class="promise-num">05</div><div><h3>Um especialista em cada matéria</h3><p>Professores com trajetória na disciplina que ensinam, não um generalista dando conta de tudo. Conheça cada um na galeria de cursos.</p></div></div>
          <div class="promise-item" data-a="7"><div class="promise-num">06</div><div><h3>Teoria, prática e revisão no mesmo lugar</h3><p>Leitura, vídeo, questões, flashcards com repetição espaçada, cadernos, simulados e desempenho por tema: tudo em torno da mesma unidade.</p></div></div>
        </div>
      </div>
    </div>
  </div>
</section>''', promessa, flags=re.S)

# ── 7. Matérias (no lugar do currículo) ──────────────────────────────────
MATERIAS = [('HB','História do Brasil','Da chegada de Cabral à Nova República, com a bibliografia que a banca cobra.',82),('HM','História Mundial','Das revoluções às ordens internacionais do século XX.',0),('PI','Política Internacional','Sistema internacional, política externa brasileira e temas globais.',0),('ECO','Economia','Micro, macro, economia brasileira e internacional.',0),('DIP','Direito','Direito internacional público, direito interno e temas de fronteira.',0),('GEO','Geografia','Geografia política, econômica e do Brasil.',0),('LP','Língua Portuguesa','Redação, gramática e interpretação no padrão da banca.',0),('ING','Inglês','Compreensão, versão e redação para a segunda fase.',0)]
materias = '''<section class="curriculum-section sec-pad" id="materias">
  <div class="container">
    <div style="text-align:center;max-width:760px;margin:0 auto">
      <div class="s-label" style="margin-left:auto;margin-right:auto">
        <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        Matérias · cobertura do edital
      </div>
      <h2 class="s-title">As matérias do CACD,<br><em>cada uma com o seu edital</em>.</h2>
      <div class="s-divider center"></div>
      <p class="s-body" style="margin:0 auto">Cada matéria é um curso completo e independente: você assina as que precisa, na ordem que quiser. O edital de cada uma é o esqueleto do curso, e a barra abaixo mostra quanto dele já está coberto na plataforma.</p>
    </div>
    <div class="curr-stats" data-a="1">
      <div class="curr-stat"><div class="curr-stat-num"><span class="marcador">n</span></div><div class="curr-stat-label">matérias</div></div>
      <div class="curr-stat"><div class="curr-stat-num"><span class="marcador">n</span></div><div class="curr-stat-label">unidades</div></div>
      <div class="curr-stat"><div class="curr-stat-num"><span class="marcador">n</span></div><div class="curr-stat-label">questões de provas anteriores</div></div>
      <div class="curr-stat"><div class="curr-stat-num"><span class="marcador">n</span></div><div class="curr-stat-label">horas de videoaula</div></div>
      <div class="curr-stat"><div class="curr-stat-num"><span class="marcador">n</span></div><div class="curr-stat-label">professores</div></div>
      <div class="curr-stat"><div class="curr-stat-num">2ⓤ</div><div class="curr-stat-label">de boas-vindas para o tutor de IA</div></div>
    </div>
    <div class="materias-grid" data-a="2">''' + ''.join(
      '<div class="materia"><div class="materia-sigla">' + s + '</div><div class="materia-nome">' + n + '</div><div class="materia-desc">' + d + '</div><div class="materia-bar"><i style="--w:' + str(w or 35) + '%"></i></div><div class="materia-meta"><span>edital coberto</span><span>' + (str(w) + '%' if w else '<span class="marcador">n%</span>') + '</span></div></div>' for s, n, d, w in MATERIAS) + '''</div>
  </div>
</section>'''

# ── 8. Depoimentos (marcadores) ──────────────────────────────────────────
DEP = [('Depoimento de exemplo. Substituir pelo texto real de um aluno aprovado: o que mudou no estudo, o que a plataforma resolveu, o resultado.', 'AA', 'Nome do aluno', 'Diplomata · CACD 20xx'),
       ('Depoimento de exemplo. Um comentário curto sobre o banco de questões ou o tutor de IA funciona melhor do que elogios genéricos.', 'BB', 'Nome do aluno', 'Aprovado na 1ª fase · CACD 20xx'),
       ('Depoimento de exemplo. Preferir alunos com nome, turma e ano, e pedir autorização de uso.', 'CC', 'Nome do aluno', 'Candidato · turma 20xx')]
dep_items = ''.join('<div class="testimonial"><p class="testimonial-text">' + t + '</p><div class="testimonial-author"><div class="testimonial-avatar">' + a + '</div><div class="testimonial-info"><h5>' + n + '</h5><p>' + c + '</p></div></div></div>' for t, a, n, c in DEP)
depo_ini, j = fatia('<section class="testimonials sec-pad" id="alunos">', '<div class="testimonial-carousel"')
depoimentos = depo_ini + '<div class="testimonial-carousel" id="testimonialCarousel"><div class="testimonial-track" id="testimonialTrack">' + dep_items + dep_items + '</div></div>\n    <p style="text-align:center;margin-top:1.5rem"><span class="marcador">depoimentos de exemplo · substituir pelos reais</span></p>\n  </div>\n</section>'

# ── 9. Planos: conta grátis + matéria como produto ────────────────────────
CHECK = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
planos = '''<section class="pricing sec-pad" id="planos">
  <div class="container">
    <div style="text-align:center;max-width:720px;margin:0 auto">
      <div class="s-label" style="margin-left:auto;margin-right:auto">
        <svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4 2 8L12 17l-6.5 4 2-8L2 9h7z"/></svg>
        Como funciona
      </div>
      <h2 class="s-title">Conta gratuita. <em>Matérias avulsas</em>.</h2>
      <div class="s-divider center"></div>
      <p class="s-body" style="margin:0 auto">Crie a conta sem pagar nada e estude a primeira unidade de cada matéria com tudo ligado. Depois, assine só as matérias que você precisa, pelo tempo que precisar.</p>
    </div>
    <div class="plans">
      <div class="plan featured plan-free" data-a="1">
        <div class="plan-ribbon">Comece por aqui</div>
        <div class="plan-kind">Gratuito · sem cartão</div>
        <div class="plan-name"><em>Conta Falcon</em></div>
        <div class="plan-tag">Para conhecer a plataforma de verdade, com o seu próprio estudo.</div>
        <div class="plan-price-row"><span class="plan-price"><span class="currency">R$</span>0</span><span class="plan-period">para sempre</span></div>
        <div class="plan-sub">Crie a conta em um minuto · <strong>sem cartão</strong>, sem prazo de teste.</div>
        <ul class="plan-includes">
          <li>''' + CHECK + '''<div><strong>Primeira unidade de cada matéria</strong> aberta, com aulas, questões e flashcards</div></li>
          <li>''' + CHECK + '''<div><strong>2 UbiTokens de boas-vindas</strong> para usar o tutor de IA</div></li>
          <li>''' + CHECK + '''<div>Cadernos, destaques, anotações e flashcards próprios salvos na sua conta</div></li>
          <li>''' + CHECK + '''<div>Edital vivo com a recorrência de cada tópico nas provas</div></li>
          <li>''' + CHECK + '''<div>Fórum e salas de estudo com outros candidatos</div></li>
        </ul>
        <a class="btn btn-primary plan-cta" data-app-link href="''' + APP + '''">Criar conta grátis ''' + SETA + '''</a>
        <p class="plan-note">Leva um minuto · você só decide depois se quer assinar alguma matéria</p>
      </div>
      <div class="plan" data-a="2">
        <div class="plan-kind">Assinatura · por matéria</div>
        <div class="plan-name"><em>Matéria completa</em></div>
        <div class="plan-tag">Cada matéria é um produto: assine uma, várias ou um combo.</div>
        <div class="plan-price-row"><span class="plan-price"><span class="currency">R$</span>100</span><span class="plan-period">/ mês por matéria</span></div>
        <div class="plan-sub"><span class="marcador">preço a confirmar</span> · combos com desconto no carrinho</div>
        <ul class="plan-includes">
          <li>''' + CHECK + '''<div><strong>Todas as unidades</strong> da matéria, com o professor especialista</div></li>
          <li>''' + CHECK + '''<div><strong>Banco de provas anteriores</strong> da matéria, classificado pelo edital</div></li>
          <li>''' + CHECK + '''<div>Discursivas com correção por IA e simulados no padrão da banca</div></li>
          <li>''' + CHECK + '''<div>Desempenho por tópico, Raio-X do estudo e certificado</div></li>
          <li>''' + CHECK + '''<div><strong>15 UbiTokens por mês</strong> para o tutor de IA</div></li>
        </ul>
        <a href="#cursos" class="btn btn-ghost plan-cta">Ver as matérias e os preços ''' + SETA + '''</a>
        <p class="plan-note">Os preços de cada matéria estão nas placas da galeria de cursos</p>
      </div>
    </div>
  </div>
</section>'''

# ── 10. FAQ ───────────────────────────────────────────────────────────────
ICO = '<span class="faq-q-icon"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span>'
FAQ = [('A conta gratuita tem limite de tempo?', 'Não. Ela é gratuita para sempre: você estuda a primeira unidade de cada matéria, usa seus 2 UbiTokens no tutor e guarda cadernos, flashcards e destaques na sua conta. Só paga se quiser assinar uma matéria inteira.'),
       ('Preciso assinar todas as matérias?', 'Não. Cada matéria é um curso independente. Você assina só as que precisa, pelo tempo que precisar, e pode montar combos com desconto no carrinho.'),
       ('As questões são de provas reais?', 'Sim. O banco reúne itens das provas anteriores do CACD, cada um ligado ao tópico do edital que cobra, com gabarito comentado. Há também questões inéditas no padrão da banca, sempre marcadas como tal.'),
       ('O que é o tutor de IA e o que são os UbiTokens?', 'O tutor responde por texto e por voz a partir do conteúdo da unidade e da bibliografia da banca. Cada uso consome UbiTokens, a moeda interna da plataforma: a conta gratuita ganha 2 de boas-vindas e cada matéria assinada inclui 15 por mês.'),
       ('Os flashcards, cadernos e destaques ficam salvos?', 'Sim, tudo na sua conta. Os flashcards seguem repetição espaçada, os cadernos aceitam citações entre si e portais, e os destaques ficam no texto quando você volta.'),
       ('Posso estudar no celular?', 'Sim. A plataforma é responsiva: leitura, questões, flashcards e tutor funcionam no celular e no tablet, e o seu progresso é o mesmo em qualquer aparelho.'),
       ('Posso cancelar a assinatura de uma matéria?', 'Sim, a qualquer momento, no painel da sua conta. Você mantém o acesso até o fim do período já pago.'),
       ('Serve para quem ainda não decidiu prestar o CACD?', 'Serve. A conta gratuita é a melhor forma de descobrir se o concurso é para você: o edital vivo mostra o tamanho de cada matéria e a primeira unidade dá a medida do estudo.')]
faq = '''<section class="faq sec-pad" id="faq">
  <div class="container">
    <div style="text-align:center;max-width:720px;margin:0 auto">
      <div class="s-label" style="margin-left:auto;margin-right:auto">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Dúvidas frequentes
      </div>
      <h2 class="s-title">Perguntas que a gente <em>já ouviu</em>.</h2>
      <div class="s-divider center"></div>
    </div>
    <div class="faq-list">''' + ''.join('<div class="faq-item"><button class="faq-q"><span>' + q + '</span>' + ICO + '</button><div class="faq-a"><p>' + a + '</p></div></div>' for q, a in FAQ) + '''</div>
  </div>
</section>'''

# ── 11. Experimentar ──────────────────────────────────────────────────────
experimentar = '''<section class="tryit sec-pad" id="experimentar">
  <div class="container">
    <div class="tryit-head">
      <div class="s-label" style="margin-left:auto;margin-right:auto">
        <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        Comece sem pagar nada
      </div>
      <h2 class="s-title" data-a="1">Antes de assinar,<br><em>experimente</em> de verdade.</h2>
      <div class="s-divider center"></div>
      <p class="s-body" style="margin:0 auto" data-a="2">Duas formas de provar a Falcon sem custo: a demonstração aberta nesta página e a conta gratuita, com a primeira unidade de cada matéria e o tutor de IA ligados.</p>
    </div>
    <div class="tryit-grid">
      <article class="tryit-card" data-a="3">
        <div class="tryit-card-icon"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
        <div class="tryit-card-eyebrow">Agora · sem conta</div>
        <h3 class="tryit-card-title">Uma unidade <em>completa</em>, nesta página</h3>
        <p class="tryit-card-desc">Abra a demonstração e navegue por uma unidade inteira como o aluno vê: texto editorial, vídeo, linha do tempo, quiz, discursiva, flashcards.</p>
        <ul class="tryit-card-list">
          <li><strong>13 tipos de bloco</strong> · texto, vídeo, quiz, discursiva, flashcards, fórum</li>
          <li><strong>Destaques e notas</strong> · selecione um trecho e veja como funciona</li>
          <li><strong>Mesmo design</strong> da plataforma real</li>
        </ul>
        <a href="#integrado" class="tryit-card-btn" style="text-decoration:none;display:inline-flex"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>Abrir a demonstração</a>
        <p class="tryit-card-note">Sem cadastro · sem instalar nada</p>
      </article>
      <article class="tryit-card" data-a="4">
        <div class="tryit-card-icon"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="tryit-card-eyebrow">Conta gratuita · para sempre</div>
        <h3 class="tryit-card-title">A primeira unidade de <em>cada matéria</em>, com tudo ligado</h3>
        <p class="tryit-card-desc">Crie a conta e estude a primeira unidade de todas as matérias com questões de provas, flashcards, cadernos e o tutor de IA, com 2 UbiTokens de boas-vindas.</p>
        <ul class="tryit-card-list">
          <li><strong>Sem cartão</strong> · você só decide depois</li>
          <li><strong>Seu progresso fica salvo</strong> · destaques, notas, flashcards e cadernos</li>
          <li><strong>Edital vivo</strong> · veja o tamanho de cada matéria antes de assinar</li>
        </ul>
        <a class="tryit-card-btn" data-app-link href="''' + APP + '''" style="text-decoration:none;display:inline-flex">''' + SETA + '''Criar conta grátis</a>
        <p class="tryit-card-note">Leva um minuto · você confirma o e-mail e já entra</p>
      </article>
    </div>
  </div>
</section>'''

# ── 12. Final + rodapé + CTA fixo ─────────────────────────────────────────
final = '''<section class="final">
  <div class="container">
    <div class="final-emblem" aria-hidden="true">
      <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" stroke-width=".5" opacity=".4"/><circle cx="40" cy="40" r="28" fill="none" stroke="currentColor" stroke-width=".5" opacity=".8"/><path d="M28 40 L36 48 L52 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="s-label" style="margin-left:auto;margin-right:auto"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>Sem risco · conta gratuita</div>
    <h2 class="s-title">Comece hoje,<br><em>sem pagar nada</em>.</h2>
    <p class="final-lead">A conta é gratuita e não expira. Você entra, estuda a primeira unidade de cada matéria com tudo ligado e só assina o que quiser, quando quiser.</p>
    <div class="final-stack">
      <div class="final-stack-item"><div class="final-stack-num">R$ 0</div><div class="final-stack-label">Conta gratuita, sem cartão</div></div>
      <div class="final-stack-item"><div class="final-stack-num">1ª unidade</div><div class="final-stack-label">De cada matéria, aberta</div></div>
      <div class="final-stack-item"><div class="final-stack-num">2ⓤ</div><div class="final-stack-label">Para conversar com o tutor de IA</div></div>
      <div class="final-stack-item"><div class="final-stack-num">1 clique</div><div class="final-stack-label">Para cancelar qualquer matéria</div></div>
    </div>
    <p class="final-reassure">Olhe honestamente para o que você viu até aqui: aulas de especialistas, o banco de provas anteriores classificado pelo edital, flashcards, cadernos, tutor de IA e desempenho por tema, num lugar só. O próximo passo custa um minuto.</p>
    <div class="final-ctas"><a class="btn btn-primary btn-xl" data-app-link href="''' + APP + '''">Criar conta grátis ''' + SETA + '''</a></div>
  </div>
</section>'''
rodape_ini, j = fatia('<footer class="footer">', '<span>Ubique · <em>Course Platform</em></span>')
rodape = rodape_ini + '<span>Falcon · <em>Grupo Ubique</em></span>' + P[j + len('<span>Ubique · <em>Course Platform</em></span>'):P.index('</footer>') + len('</footer>')]
rodape = rodape.replace('Princípio da Especificidade', 'Preparação para o CACD')
sticky = '<div class="sticky-cta"><a class="btn btn-primary" data-app-link href="' + APP + '">Criar conta grátis ' + SETA + '</a></div>'

# ── 13. Scripts: os do protótipo (menos o herói) + herói novo + galeria + app-link ──
js_proto_resto = linhas(5270, 6388)   # menu-âncora, reveal/faq/vídeo, tema, demo, depoimentos, currículo
js_novo = r"""
/* ═════════════════════════════
   FALCON · links para o app (Entrar / Criar conta) + sessão existente
   ═════════════════════════════ */
(function(){
  const APP = '__APP__';
  const logado = (function(){ try{ return Object.keys(localStorage).some(k => /^sb-.*-auth-token$/.test(k)); }catch(_){ return false; } })();
  document.querySelectorAll('[data-app-link]').forEach(a => {
    a.setAttribute('href', APP);
    if(logado && /Criar conta/.test(a.textContent)) a.textContent = 'Entrar na plataforma';
  });
})();

/* ═════════════════════════════
   FALCON · HERÓI POR QUADROS — vídeo aéreo do Itamaraty dirigido pelo scroll.
   Enquanto os quadros não existem (FRAMES.count = 0), desenha uma cena
   provisória: espelho d'água, arcos do palácio, o Meteoro, o jardim.
   Quando o vídeo chegar: ffmpeg -> landing/frames/hero/0001.webp… e count.
   ═════════════════════════════ */
(function(){
  const FRAMES = { dir: '__FRAMES__', count: 0, ext: 'webp' };
  const hero = document.getElementById('top');
  const canvas = document.getElementById('heroCanvas');
  const tag = document.getElementById('heroPreviewTag');
  const scrollHint = document.getElementById('scrollHint');
  const panels = Array.from(document.querySelectorAll('.panel'));
  const plaqueYear = document.getElementById('plaqueYear'), plaqueName = document.getElementById('plaqueName'), plaqueDesc = document.getElementById('plaqueDesc');
  if(!hero || !canvas) return;
  const ctx = canvas.getContext('2d');
  const acts = [
    { year: "O espelho d'água", name: 'Sobre o lago', desc: "A câmera cruza o espelho d'água do palácio, sede do Ministério das Relações Exteriores desde 1970." },
    { year: 'O Meteoro', name: 'Bruno Giorgi · 1967', desc: 'A escultura de mármore que flutua sobre a água: cinco continentes unidos, símbolo da casa da diplomacia brasileira.' },
    { year: 'O jardim', name: 'Burle Marx', desc: 'Subindo ao terraço, o jardim desenhado por Burle Marx: a chegada, depois de todo o caminho de estudo.' }
  ];
  const reduzir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1;
  function medir(){
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  /* quadros reais (quando existirem) */
  const imgs = []; let carregados = 0, temQuadros = FRAMES.count > 0;
  function nomeQuadro(i){ return FRAMES.dir + '/' + String(i).padStart(4, '0') + '.' + FRAMES.ext; }
  if(temQuadros){
    if(tag) tag.remove();
    for(let i = 1; i <= FRAMES.count; i++){
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { carregados++; if(i === 1) desenhar(ultimo); };
      im.src = nomeQuadro(i); imgs.push(im);
    }
  }
  function desenharQuadro(p){
    const idx = Math.min(FRAMES.count, Math.max(1, Math.round(p * (FRAMES.count - 1)) + 1));
    const im = imgs[idx - 1];
    if(!im || !im.complete || !im.naturalWidth){ cena(p); return; }
    const r = Math.max(W / im.naturalWidth, H / im.naturalHeight);
    const w = im.naturalWidth * r, h = im.naturalHeight * r;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
  }
  /* cena provisória: camadas com paralaxe pelo progresso p (0..1) */
  const ease = t => t < .5 ? 2*t*t : -1 + (4 - 2*t) * t;
  function cena(p){
    ctx.clearRect(0, 0, W, H);
    const horizonte = H * (0.58 - 0.16 * ease(Math.min(1, p / 0.7)));   // a câmera sobe
    // céu
    const sky = ctx.createLinearGradient(0, 0, 0, horizonte);
    sky.addColorStop(0, '#07080b'); sky.addColorStop(0.7, '#0d1119'); sky.addColorStop(1, '#1a1a1c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizonte);
    // névoa dourada do horizonte
    const haze = ctx.createRadialGradient(W * 0.62, horizonte, 0, W * 0.62, horizonte, W * 0.7);
    haze.addColorStop(0, 'rgba(200,169,126,.22)'); haze.addColorStop(1, 'rgba(200,169,126,0)');
    ctx.fillStyle = haze; ctx.fillRect(0, 0, W, H);
    // palácio: pórtico de arcos ao fundo, aproximando com o scroll
    const esc = 1 + 0.55 * ease(Math.min(1, p / 0.75));
    const baseY = horizonte + 2;
    const cx = W * 0.62;
    const larg = Math.min(W * 0.9, 900) * esc, alt = larg * 0.22;
    const nArcos = 9, passo = larg / nArcos;
    ctx.save();
    ctx.translate(cx - larg / 2, baseY - alt);
    ctx.fillStyle = 'rgba(238,232,220,.06)'; ctx.fillRect(0, 0, larg, alt);
    ctx.strokeStyle = 'rgba(200,169,126,.55)'; ctx.lineWidth = 1;
    for(let i = 0; i < nArcos; i++){
      const x = i * passo, w = passo * 0.78, h = alt * 0.82;
      ctx.beginPath();
      ctx.moveTo(x + (passo - w) / 2, alt);
      ctx.lineTo(x + (passo - w) / 2, alt - h + w * 0.5);
      ctx.arc(x + passo / 2, alt - h + w * 0.5, w / 2, Math.PI, 0);
      ctx.lineTo(x + (passo + w) / 2, alt);
      ctx.stroke();
    }
    ctx.strokeRect(0, 0, larg, alt);
    ctx.restore();
    // laje sobre os arcos com o jardim (surge quando a câmera sobe)
    const jardim = Math.max(0, (p - 0.62) / 0.38);
    if(jardim > 0){
      ctx.save(); ctx.globalAlpha = Math.min(1, jardim * 1.4);
      const gy = baseY - alt - 8;
      const gg = ctx.createLinearGradient(0, gy - 60 * jardim, 0, gy);
      gg.addColorStop(0, 'rgba(52,84,55,.0)'); gg.addColorStop(1, 'rgba(52,84,55,.75)');
      ctx.fillStyle = gg; ctx.fillRect(cx - larg / 2, gy - 60 * jardim, larg, 60 * jardim + 8);
      ctx.fillStyle = 'rgba(93,140,88,.55)';
      for(let i = 0; i < 7; i++){
        const rx = cx - larg / 2 + larg * (0.08 + i * 0.13), ry = gy - 12 - 30 * jardim * ((i % 3) + 1) / 3;
        ctx.beginPath(); ctx.ellipse(rx, ry, larg * 0.06, 12 + 26 * jardim, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // espelho d'água
    const agua = ctx.createLinearGradient(0, horizonte, 0, H);
    agua.addColorStop(0, '#14202b'); agua.addColorStop(0.5, '#0e1821'); agua.addColorStop(1, '#08090b');
    ctx.fillStyle = agua; ctx.fillRect(0, horizonte, W, H - horizonte);
    // reflexo dos arcos
    ctx.save(); ctx.globalAlpha = .28; ctx.translate(0, baseY * 2 + 4); ctx.scale(1, -1);
    ctx.strokeStyle = 'rgba(200,169,126,.5)';
    ctx.translate(cx - larg / 2, baseY - alt);
    for(let i = 0; i < nArcos; i++){ const x = i * passo, w = passo * 0.78, h = alt * 0.82; ctx.beginPath(); ctx.moveTo(x + (passo - w) / 2, alt); ctx.lineTo(x + (passo - w) / 2, alt - h + w * .5); ctx.arc(x + passo / 2, alt - h + w * .5, w / 2, Math.PI, 0); ctx.lineTo(x + (passo + w) / 2, alt); ctx.stroke(); }
    ctx.restore();
    // ondulações
    ctx.strokeStyle = 'rgba(200,169,126,.10)'; ctx.lineWidth = 1;
    for(let i = 0; i < 14; i++){
      const y = horizonte + 18 + i * ((H - horizonte) / 14) * (0.6 + 0.4 * (i / 14));
      const desl = (p * 400 + i * 37) % W;
      ctx.beginPath();
      for(let x = -60; x <= W + 60; x += 30){ const yy = y + Math.sin((x + desl) / 48) * 1.6; if(x === -60) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
      ctx.stroke();
    }
    // o Meteoro: cinco lâminas de mármore que entram pela direita e passam
    const met = Math.max(0, Math.min(1, (p - 0.18) / 0.5));
    if(met > 0 && met < 1){
      const mx = W * (1.15 - 1.05 * met), my = horizonte + (H - horizonte) * 0.42, ms = Math.min(W, 1200) * (0.12 + 0.16 * met);
      ctx.save(); ctx.translate(mx, my);
      for(let i = 0; i < 5; i++){
        ctx.save(); ctx.rotate(-0.5 + i * 0.28);
        const gm = ctx.createLinearGradient(-ms, 0, ms, 0); gm.addColorStop(0, 'rgba(240,236,228,.85)'); gm.addColorStop(1, 'rgba(200,190,170,.55)');
        ctx.fillStyle = gm;
        ctx.beginPath(); ctx.ellipse(0, -ms * 0.15, ms * 0.55, ms * 0.14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = .35; ctx.scale(1, -0.6);
      for(let i = 0; i < 5; i++){ ctx.save(); ctx.rotate(-0.5 + i * 0.28); ctx.fillStyle = 'rgba(240,236,228,.5)'; ctx.beginPath(); ctx.ellipse(0, -ms * 0.15, ms * 0.55, ms * 0.14, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      ctx.restore();
    }
    // varredura de luz
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const lx = W * (-0.3 + 1.6 * p);
    const luz = ctx.createLinearGradient(lx - W * 0.25, 0, lx + W * 0.25, H);
    luz.addColorStop(0, 'rgba(200,169,126,0)'); luz.addColorStop(0.5, 'rgba(200,169,126,.07)'); luz.addColorStop(1, 'rgba(200,169,126,0)');
    ctx.fillStyle = luz; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // grão
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for(let i = 0; i < 40; i++){ ctx.fillRect((i * 733 + p * 1000) % W, (i * 271) % H, 1, 1); }
  }
  let ultimo = 0, ticking = false, lastP = -1;
  function desenhar(p){ if(temQuadros) desenharQuadro(p); else cena(p); }
  function update(){
    const rect = hero.getBoundingClientRect();
    const scrollable = hero.offsetHeight - window.innerHeight;
    let p = scrollable > 0 ? (-rect.top) / scrollable : 0;
    p = Math.max(0, Math.min(1, p));
    ultimo = p;
    if(Math.abs(p - lastP) >= 0.0015 || lastP < 0){
      lastP = p;
      desenhar(reduzir ? 0.5 : p);
      if(scrollHint) scrollHint.classList.toggle('fade', p > 0.02);
      let act = 0; if(p >= 0.33 && p < 0.72) act = 1; else if(p >= 0.72) act = 2;
      panels.forEach((pl, i) => pl.classList.toggle('on', i === act));
      const a = acts[act];
      if(plaqueYear && plaqueYear.textContent !== a.year){ plaqueYear.textContent = a.year; plaqueName.textContent = a.name; plaqueDesc.textContent = a.desc; }
    }
    ticking = false;
  }
  function onScroll(){ if(!ticking){ requestAnimationFrame(update); ticking = true; } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { medir(); lastP = -1; onScroll(); }, { passive: true });
  medir(); update();
  window.__falconHero = { update: update, cena: cena };
})();

/* ═════════════════════════════
   FALCON · GALERIA DE CURSOS — a parede anda para o lado enquanto você rola
   ═════════════════════════════ */
(function(){
  const sec = document.getElementById('cursos'), wall = document.getElementById('galeriaWall');
  if(!sec || !wall) return;
  let ticking = false;
  function update(){
    ticking = false;
    if(window.innerWidth <= 860){ wall.style.transform = ''; return; }
    const rect = sec.getBoundingClientRect();
    const scrollable = sec.offsetHeight - window.innerHeight;
    let p = scrollable > 0 ? (-rect.top) / scrollable : 0;
    p = Math.max(0, Math.min(1, p));
    const max = Math.max(0, wall.scrollWidth - window.innerWidth);
    wall.style.transform = 'translate3d(' + (-p * max).toFixed(1) + 'px,0,0)';
  }
  function onScroll(){ if(!ticking){ requestAnimationFrame(update); ticking = true; } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
  window.__falconGaleria = { update: update };
})();
""".replace('__APP__', APP).replace('__FRAMES__', FRAMES_DIR)

head = '''<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Falcon · Preparação completa para o CACD · Grupo Ubique</title>
<meta name="description" content="A Falcon reúne numa só plataforma as aulas dos melhores professores de cada matéria do CACD, o banco de provas anteriores classificado pelo edital, flashcards, cadernos e um tutor de IA. Conta gratuita.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Outfit:wght@200;300;400;500&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>''' + css_proto + css_extra + '''</style>
</head>
<body>
'''
paginas = [topbar, menu, hero, strip, video, galeria, integrado, ferramentas, promessa, materias, depoimentos, planos, faq, experimentar, final, rodape, sticky]
html = head + '\n\n'.join(paginas) + '\n\n<script>\n' + js_proto_resto + '\n' + js_novo + '\n</script>\n</body>\n</html>\n'
io.open(RAIZ + 'landing.html', 'w', encoding='utf8').write(html)
os.makedirs(RAIZ + 'landing/frames/hero', exist_ok=True)
io.open(RAIZ + 'landing/frames/hero/COMO-GERAR.md', 'w', encoding='utf8').write('''# Quadros do vídeo aéreo do herói

Quando o vídeo do Itamaraty estiver pronto (recomendado: 6 a 10 s, 24 qps, 1920 px de largura):

    ffmpeg -i itamaraty.mp4 -vf "fps=24,scale=1920:-2" -c:v libwebp -quality 78 landing/frames/hero/%04d.webp

Depois, em landing.html, ajuste `FRAMES.count` para o número de arquivos gerados.
A cena provisória desenhada em canvas some sozinha quando `count > 0`.
''')
print('landing.html gerado:', len(html), 'bytes;', html.count('<section'), 'seções')
