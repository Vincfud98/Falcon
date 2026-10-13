/* raiox-render.js — o desenho do relatório do Raio-X, num lugar só (13/10/2026).
   Usado pelo app do aluno (index.html: Raio-X do desempenho) e pelo painel (admin.html: análises do mentor).
   Funções puras: recebem o relatório { findings, aggregates, created_at, titulo } e devolvem HTML.
   voz 'aluno': o texto de sempre ("Seu perfil de erro"). voz 'mentor': sobre o aluno, para o mentor ler.
   Os números dos gráficos e do quadro vêm SEMPRE dos agregados (calculados no servidor), nunca do texto da IA. */
(function(){
  'use strict';
  // Estilos do relatório (os do modal do aluno ficam no app). Os var() têm reserva para o painel, que não
  // define --bg-elevated nem --border.
  const CSS = [
      '.rx-title{font-family:var(--serif);font-size:1.5rem;color:var(--text);margin:.2rem 0 .2rem}',
      '.rx-sub{font-size:.82rem;color:var(--text-dim);line-height:1.55;margin:0 0 1rem}',
      '.rx-table{width:100%;border-collapse:collapse;font-size:.82rem;margin:.6rem 0 1rem}',
      '.rx-table td{padding:.35rem .5rem;border-bottom:1px solid var(--border,rgba(200,169,126,.14));color:var(--text-dim)}',
      '.rx-table td:last-child{text-align:right;white-space:nowrap}',
      '.rx-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border,rgba(200,169,126,.14))}',
      '.rx-price{font-family:var(--mono);font-size:.85rem;color:var(--accent)}',
      '.rx-spin{display:flex;flex-direction:column;align-items:center;gap:1rem;padding:2.5rem 0;color:var(--text-dim);font-size:.85rem}',
      '.rx-spin .rx-dot{width:34px;height:34px;border:2px solid var(--accent-border);border-top-color:var(--accent);border-radius:50%;animation:rxspin 1s linear infinite}',
      '@keyframes rxspin{to{transform:rotate(360deg)}}',
      '.rx-sec{margin:1.2rem 0}',
      '.rx-tab-rolo{overflow-x:auto}',
      '.rx-prova{min-width:640px}.rx-prova th{font-family:var(--sans);font-weight:300;font-size:.58rem;letter-spacing:.12em;text-transform:uppercase;color:var(--text-mute);text-align:left;padding:.3rem .5rem;border-bottom:1px solid var(--border,rgba(200,169,126,.14))}',
      '.rx-prova td:last-child{text-align:left;white-space:normal}',
      '.rx-nota{display:flex;gap:1.2rem;align-items:center;flex-wrap:wrap;margin:.8rem 0;padding:.8rem 1rem;background:var(--bg-elevated,rgba(255,255,255,.035));border-left:2px solid var(--accent);border-radius:4px}',
      '.rx-nota-n strong{display:block;font-family:var(--serif);font-size:2rem;color:var(--text);line-height:1}.rx-nota-n small{font-family:var(--sans);font-size:.7rem;color:var(--text-mute)}',
      '.rx-nota-t{flex:1 1 18rem;font-size:.82rem;color:var(--text-dim);line-height:1.55}',
      '.rx-sub2{font-family:var(--sans);font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:var(--text-mute);margin:1rem 0 .2rem}',
      '.rx-trecho{font-style:italic}',
      '.rx-prio-acoes{display:flex;gap:.4rem;flex-wrap:wrap;margin:.4rem 0 .6rem}.rx-prio-acoes .btn-ghost{font-size:.62rem;padding:.3rem .7rem}',
      '.rx-sec-h{font-family:var(--sans);font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin-bottom:.45rem}',
      '.rx-sec-b{font-family:var(--serif);font-size:.95rem;line-height:1.7;color:var(--text);white-space:pre-line}',
      '.rx-sec ul{margin:.3rem 0 0 1.2rem;font-family:var(--serif);font-size:.92rem;line-height:1.65;color:var(--text)}',
      '.rx-mat{margin:.7rem 0;padding:.7rem .9rem;background:var(--bg-elevated,rgba(255,255,255,.035));border-left:2px solid var(--accent);border-radius:4px}',
      '.rx-mat-h{display:flex;justify-content:space-between;gap:.6rem;font-weight:600;font-family:var(--serif);color:var(--text);margin-bottom:.3rem}',
      '.rx-mat-pct{font-family:var(--mono);font-size:.78rem;color:var(--text-dim)}',
      '.rx-ev{margin:.55rem 0;padding:.55rem .75rem;background:var(--bg-elevated,rgba(255,255,255,.035));border-left:2px solid var(--accent-border);border-radius:4px}',
      '.rx-ev-t{font-family:var(--serif);font-style:italic;font-size:.9rem;color:var(--text);line-height:1.5}',
      '.rx-ev-m{font-family:var(--sans);font-size:.66rem;color:var(--text-mute);letter-spacing:.04em;margin-top:.15rem}',
      '.rx-ev-c{font-size:.82rem;color:var(--text-dim);line-height:1.55;margin-top:.3rem}',
      '.rx-hl{background:rgba(200,169,126,.22);color:var(--accent);font-style:normal;font-weight:600;padding:0 .15em;border-radius:2px}',
      '.rx-dica{margin-top:.45rem;font-size:.8rem;color:var(--accent);font-family:var(--sans)}',
      '.rx-chart{margin:.7rem 0 .2rem}',
      '.rx-chart-h{font-family:var(--sans);font-size:.68rem;color:var(--text-mute);margin:.2rem 0 .4rem}',
      '.rx-lgroup{margin:.55rem 0}',
      '.rx-lrot{font-family:var(--sans);font-size:.76rem;color:var(--text);margin-bottom:.15rem}',
      '.rx-brow{display:flex;align-items:center;gap:.6rem;margin:.28rem 0}',
      '.rx-blab{flex:0 0 42%;font-size:.72rem;color:var(--text-dim);text-align:right;line-height:1.3}',
      '.rx-btrack{flex:1;height:8px;background:var(--bg-elevated,rgba(255,255,255,.035));border-radius:99px;overflow:hidden}',
      '.rx-bfill{display:block;height:100%;background:var(--accent);border-radius:99px}',
      '.rx-bval{flex:0 0 84px;font-family:var(--mono);font-size:.7rem;color:var(--text)}',
      '.rx-bval em{font-style:normal;color:var(--text-mute);font-size:.6rem}',
      '.rx-board{display:flex;gap:1.2rem;align-items:center;margin:1rem 0 1.4rem;padding:1rem;background:var(--bg-elevated,rgba(255,255,255,.035));border:1px solid var(--border,rgba(200,169,126,.14));border-radius:6px;flex-wrap:wrap}',
      '.rx-donut{width:112px;height:112px;border-radius:50%;background:conic-gradient(#5db8a3 0 calc(var(--pct)*1%), rgba(212,121,115,.65) calc(var(--pct)*1%) 100%);display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
      '.rx-donut-c{width:80px;height:80px;border-radius:50%;background:var(--bg-card);display:flex;flex-direction:column;align-items:center;justify-content:center}',
      '.rx-donut-c strong{font-family:var(--serif);font-size:1.35rem;color:var(--text);line-height:1}',
      '.rx-donut-c small{font-family:var(--sans);font-size:.48rem;letter-spacing:.14em;text-transform:uppercase;color:var(--text-mute);margin-top:.2rem}',
      '.rx-cards{flex:1;min-width:240px;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:.5rem}',
      '.rx-card{border-left:3px solid var(--border,rgba(200,169,126,.14));border-radius:4px;padding:.5rem .7rem;background:var(--bg-card)}',
      '.rx-card[data-rx-goto]{cursor:pointer}',
      '.rx-card-t{font-family:var(--sans);font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;margin-bottom:.22rem}',
      '.rx-card-v{font-size:.78rem;color:var(--text);line-height:1.45}',
      '.rx-card.good{border-left-color:#5db8a3}.rx-card.good .rx-card-t{color:#5db8a3}',
      '.rx-card.bad{border-left-color:#d47973}.rx-card.bad .rx-card-t{color:#d47973}',
      '.rx-card.warn{border-left-color:#e0b45a}.rx-card.warn .rx-card-t{color:#e0b45a}',
      '.rx-meta{margin-top:1.2rem;font-size:.68rem;color:var(--text-mute);font-family:var(--mono)}',
  ];
  function estilos(){
    if(document.getElementById('rxRenderStyles')) return;
    const st = document.createElement('style'); st.id = 'rxRenderStyles';
    st.textContent = CSS.join('\n');
    document.head.appendChild(st);
  }
  function _esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function _fmtData(iso){ try{ return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }); }catch(_){ return ''; } }

  // Quem lê: o próprio aluno ou o mentor dele.
  const VOZ = {
    aluno: {
      titulo: function(){ return 'Seu perfil de erro'; },
      marcaCerto: 'Você marca &ldquo;Certo&rdquo; em',
      lingH: 'Seu acerto com × sem cada traço de escrita (calculado sobre as suas respostas)',
      prioH: 'Seu acerto × média da plataforma (±desvio: quanto as notas se espalham — desvio alto = subir ali desloca mais sua posição)',
      discTitulo: 'Discursivas — seu perfil de escrita',
      provaH: 'O que cai na prova × você',
      provaCols: ['Tema', 'Na prova (5 últimas)', 'Tendência', 'Seu acerto', 'Você perderia (itens)', 'Seu treino', 'Leitura'],
      esqH: 'Temas que você está esquecendo',
      gemH: 'Itens que você errou e que voltaram em provas recentes',
      chute: function(c){ return ': com dúvida, você acerta ' + c.pct_acerto_com_duvida + '% (' + c.n_com_duvida + ' itens). Tá vendo como vale a pena chutar.'; },
      padroesH: 'Padrões que se repetem nos seus erros',
      prioridadesH: 'Prioridades (onde sua nota mais cresce)',
      meta: 'Gerado pelo Grupo Ubique a partir das suas respostas reais. ',
      docMeta: 'Gerado pelo Grupo Ubique a partir das respostas reais do aluno nas questões de Certo/Errado. ',
    },
    mentor: {
      titulo: function(nome){ return 'Perfil de erro' + (nome ? ' de ' + _esc(nome) : ' do aluno'); },
      marcaCerto: 'Marca &ldquo;Certo&rdquo; em',
      lingH: 'Acerto com × sem cada traço de escrita (calculado sobre as respostas do aluno)',
      prioH: 'Acerto do aluno × média da plataforma (±desvio: quanto as notas se espalham — desvio alto = subir ali desloca mais a posição)',
      discTitulo: 'Discursivas — perfil de escrita',
      provaH: 'O que cai na prova × o aluno',
      provaCols: ['Tema', 'Na prova (5 últimas)', 'Tendência', 'Acerto', 'Perderia (itens)', 'Treino', 'Leitura'],
      esqH: 'Temas que está esquecendo',
      gemH: 'Itens que errou e que voltaram em provas recentes',
      chute: function(c){ return ': com dúvida, acerta ' + c.pct_acerto_com_duvida + '% (' + c.n_com_duvida + ' itens). Vale mostrar a ele que chutar compensa.'; },
      padroesH: 'Padrões que se repetem nos erros',
      prioridadesH: 'Prioridades (onde a nota mais cresce)',
      meta: 'Gerado pelo Grupo Ubique a partir das respostas reais do aluno. Só o mentor vê esta análise. ',
      docMeta: 'Gerado pelo Grupo Ubique a partir das respostas reais do aluno nas questões de Certo/Errado. Análise para o mentor. ',
    },
  };
  function _voz(v){ return VOZ[v === 'mentor' ? 'mentor' : 'aluno']; }
  function _prioPadrao(p){ return '<li><strong>' + _esc(p.titulo) + '</strong> — ' + _esc(p.motivo) + '</li>'; }

  function _secTxt(t, txt, extra, anchor){ return (txt || extra) ? '<div class="rx-sec"' + (anchor ? ' data-rx-sec="' + anchor + '"' : '') + '><div class="rx-sec-h">' + t + '</div>' + (txt ? '<div class="rx-sec-b">' + _esc(txt) + '</div>' : '') + (extra || '') + '</div>' : ''; }
  function _secList(t, arr, fmt, anchor, extra){
    if((!Array.isArray(arr) || !arr.length) && !extra) return '';
    const lista = (Array.isArray(arr) && arr.length) ? '<ul>' + arr.map(fmt).join('') + '</ul>' : '';
    return '<div class="rx-sec"' + (anchor ? ' data-rx-sec="' + anchor + '"' : '') + '><div class="rx-sec-h">' + t + '</div>' + lista + (extra || '') + '</div>';
  }
  // Destaque DENTRO do trecho citado: a palavra/expressão que carrega o padrão
  // (o `destaque` vem verbatim de dentro do trecho — se não bater, fica sem).
  function _hlTrecho(trecho, destaque){
    const t = _esc(trecho);
    const d = _esc(String(destaque || '').trim());
    if(!d) return t;
    const i = t.indexOf(d);
    if(i < 0) return t;
    return t.slice(0, i) + '<span class="rx-hl">' + d + '</span>' + t.slice(i + d.length);
  }
  // Evidências: os trechos REAIS que comprovam o diagnóstico (regra de ouro
  // do produto — como a correção de discursiva cita o trecho que custou ponto).
  function _evHtml(arr){
    if(!Array.isArray(arr) || !arr.length) return '';
    return arr.map(function(e){
      const met = e.materia || e.origem;   // objetivas: matéria; discursivas: qual redação
      return '<div class="rx-ev"><div class="rx-ev-t">&ldquo;' + _hlTrecho(e.trecho, e.destaque) + '&rdquo;</div>' +
        (met ? '<div class="rx-ev-m">' + _esc(met) + '</div>' : '') +
        (e.o_que_houve ? '<div class="rx-ev-c">' + _esc(e.o_que_houve) + '</div>' : '') + '</div>';
    }).join('');
  }
  // Seção com diagnóstico + evidências ({diagnostico, evidencias}) — aceita
  // string simples por robustez. `extra` = gráfico da seção (vem dos números).
  function _secBloco(t, bloco, extra, anchor){
    if(!bloco) return '';
    if(typeof bloco === 'string') return _secTxt(t, bloco, extra, anchor);
    if(!bloco.diagnostico) return '';
    return '<div class="rx-sec"' + (anchor ? ' data-rx-sec="' + anchor + '"' : '') + '><div class="rx-sec-h">' + t + '</div><div class="rx-sec-b">' + _esc(bloco.diagnostico) + '</div>' + _evHtml(bloco.evidencias) + (extra || '') + '</div>';
  }
  // ── Gráficos de barras (estilo da plataforma) ──
  // Desenhados SEMPRE a partir dos NÚMEROS do agregado (calculados em código
  // no servidor) — nunca do texto da IA. Ilustram as seções correspondentes.
  function _barRow(label, pct, extra){
    if(pct == null) return '';
    const w = Math.max(0, Math.min(100, Number(pct)));
    return '<div class="rx-brow"><span class="rx-blab">' + label + '</span><span class="rx-btrack"><span class="rx-bfill" style="width:' + w + '%"></span></span><span class="rx-bval">' + pct + '%' + (extra ? ' <em>' + extra + '</em>' : '') + '</span></div>';
  }
  function _chartsFromAgg(ag, V){
    const g = (ag && ag.geral) || {};
    let vies = '';
    const qg = g.quando_gabarito || {};
    if(qg.Certo && qg.Certo.pct_acerto != null && qg.Errado && qg.Errado.pct_acerto != null){
      const mc = g.marcou || {};
      const mTot = (Number(mc.Certo) || 0) + (Number(mc.Errado) || 0);
      vies = '<div class="rx-chart">' +
        _barRow('Acerto quando o gabarito é CERTO', qg.Certo.pct_acerto, qg.Certo.n + ' itens') +
        _barRow('Acerto quando o gabarito é ERRADO', qg.Errado.pct_acerto, qg.Errado.n + ' itens') +
        (mTot ? _barRow(V.marcaCerto, Math.round((Number(mc.Certo) || 0) / mTot * 100), (mc.Certo || 0) + ' de ' + mTot) : '') +
        '</div>';
    }
    let dif = '';
    const pd = g.por_dificuldade || {};
    const difRows = [['facil', 'Acerto nas FÁCEIS (80%+ acertam)'], ['media', 'Acerto nas MÉDIAS'], ['dificil', 'Acerto nas DIFÍCEIS (menos de 50% acertam)']]
      .map(function(x){ const b = pd[x[0]]; return (b && b.n >= 3 && b.pct_acerto != null) ? _barRow(x[1], b.pct_acerto, b.n + ' itens') : ''; }).join('');
    if(difRows) dif = '<div class="rx-chart">' + difRows + '</div>';
    let ling = '';
    const notaveis = ((ag && ag.padroes_linguisticos) || [])
      .filter(function(p){ return Math.abs(Number(p.gap_pontos) || 0) >= 8; })
      .sort(function(a, b){ return Math.abs(b.gap_pontos) - Math.abs(a.gap_pontos); }).slice(0, 5);
    if(notaveis.length){
      ling = '<div class="rx-chart"><div class="rx-chart-h">' + V.lingH + '</div>' +
        notaveis.map(function(p){
          return '<div class="rx-lgroup"><div class="rx-lrot">' + _esc(p.rotulo) + '</div>' +
            _barRow('com o traço', p.com.pct_acerto, p.com.n + ' itens') +
            _barRow('sem o traço', p.sem.pct_acerto, p.sem.n + ' itens') + '</div>';
        }).join('') + '</div>';
    }
    let evo = '';
    const emShow = ((ag && ag.evolucao_mensal) || [])
      .filter(function(m){ return m.pct_acerto != null && Number(m.respondidas) >= 5; }).slice(-8);
    if(emShow.length >= 2){
      evo = '<div class="rx-chart">' + emShow.map(function(m){
        const lab = m.mes ? (m.mes.slice(5, 7) + '/' + m.mes.slice(0, 4)) : '';
        return _barRow(lab, m.pct_acerto, m.respondidas + ' resp.');
      }).join('') + '</div>';
    }
    // Discursivas: nota média por mês (quando a Parte 2 existe).
    let disc = '';
    const dm = ((ag && ag.discursivas && ag.discursivas.evolucao_mensal) || []).slice(-8);
    if(dm.length >= 2){
      disc = '<div class="rx-chart">' + dm.map(function(m){
        const lab = m.mes ? (m.mes.slice(5, 7) + '/' + m.mes.slice(0, 4)) : '';
        return _barRow(lab, m.media_pct, m.n + (m.n === 1 ? ' discursiva' : ' discursivas'));
      }).join('') + '</div>';
    }
    // Priorização de estudo: seu acerto × média/desvio da plataforma por
    // matéria (desvio alto = subir nota ali desloca mais a posição relativa).
    let prio = '';
    const pe = ((ag && ag.prioridade_de_estudo) || []).filter(function(p){ return p.seu_pct_acerto != null; }).slice(0, 6);
    if(pe.length >= 2){
      prio = '<div class="rx-chart"><div class="rx-chart-h">' + V.prioH + '</div>' +
        pe.map(function(p){
          const extra = (p.media_plataforma_pct != null)
            ? ('média ' + p.media_plataforma_pct + '% · ±' + p.desvio_plataforma_pct)
            : (p.sua_qtd_respondida + ' resp.');
          return _barRow(_esc(p.materia), p.seu_pct_acerto, extra);
        }).join('') + '</div>';
    }
    return { vies: vies, dif: dif, ling: ling, evo: evo, disc: disc, prio: prio };
  }
  // ── Quadro-resumo ──
  // Donut do acerto geral + cartões de achado. Regra do produto: cada cartão
  // SÓ existe se os números o sustentam (nada decorativo), tem cor semântica
  // (verde=força, vermelho=fraqueza, âmbar=atenção) e clique que rola até a
  // seção que desenvolve o achado.
  function _boardFromReport(f, ag){
    const g = (ag && ag.geral) || {};
    if(g.pct_acerto == null || !g.n) return '';
    const cards = [];
    const qg = g.quando_gabarito || {};
    if(qg.Certo && qg.Errado && qg.Certo.pct_acerto != null && qg.Errado.pct_acerto != null){
      const d = qg.Certo.pct_acerto - qg.Errado.pct_acerto;
      if(Math.abs(d) >= 8){
        const alto = d > 0 ? 'Certo' : 'Errado', baixo = d > 0 ? 'Errado' : 'Certo';
        cards.push({ cls: 'warn', t: 'Viés Certo × Errado', go: 'vies',
          v: 'Acerta ' + Math.max(qg.Certo.pct_acerto, qg.Errado.pct_acerto) + '% quando o gabarito é ' + alto + ', ' + Math.min(qg.Certo.pct_acerto, qg.Errado.pct_acerto) + '% quando é ' + baixo });
      }
    }
    const pd = g.por_dificuldade || {};
    if(pd.facil && pd.dificil && pd.facil.n >= 5 && pd.dificil.n >= 3 &&
       pd.facil.pct_acerto != null && pd.dificil.pct_acerto != null &&
       pd.facil.pct_acerto <= pd.dificil.pct_acerto){
      cards.push({ cls: 'bad', t: 'Pelo em ovo', go: 'atencao',
        v: 'Acerta ' + pd.dificil.pct_acerto + '% das difíceis, mas só ' + pd.facil.pct_acerto + '% das fáceis' });
    }
    const pl = ((ag && ag.padroes_linguisticos) || [])
      .filter(function(p){ return Math.abs(Number(p.gap_pontos) || 0) >= 8; })
      .sort(function(a, b){ return Math.abs(b.gap_pontos) - Math.abs(a.gap_pontos); });
    if(pl.length){
      const p = pl[0];
      cards.push({ cls: p.gap_pontos > 0 ? 'bad' : 'good', t: 'Traço de escrita', go: 'padroes',
        v: _esc(String(p.rotulo).split('(')[0].trim()) + ': ' + p.com.pct_acerto + '% com × ' + p.sem.pct_acerto + '% sem' });
    }
    const em = ((ag && ag.evolucao_mensal) || []).filter(function(m){ return m.pct_acerto != null && Number(m.respondidas) >= 5; });
    if(em.length >= 2){
      const d = em[em.length - 1].pct_acerto - em[em.length - 2].pct_acerto;
      if(Math.abs(d) >= 5) cards.push({ cls: d > 0 ? 'good' : 'bad', t: 'Evolução no mês', go: 'evolucao',
        v: (d > 0 ? '+' : '') + d + ' pontos de acerto em relação ao mês anterior' });
    }
    if(Array.isArray(f.prioridades) && f.prioridades.length && f.prioridades[0].titulo){
      cards.push({ cls: 'warn', t: 'Prioridade nº 1', go: 'prioridades', v: _esc(f.prioridades[0].titulo) });
    }
    const npj = ag && ag.nota_projetada;
    if(npj && npj.estimativa_prova_inteira != null){
      cards.push({ cls: npj.estimativa_prova_inteira >= (npj.nota_minima || 0) ? 'good' : 'bad', t: 'Nota estimada (1ª fase)', go: 'prova',
        v: String(Math.round(npj.estimativa_prova_inteira * 10) / 10).replace('.', ',') + ' de ' + npj.pontos_max_prova + ' · mínimo ' + npj.nota_minima });
    }
    const dg = ag && ag.discursivas;
    if(dg && dg.media_pct != null){
      cards.push({ cls: dg.media_pct >= 70 ? 'good' : (dg.media_pct >= 50 ? 'warn' : 'bad'), t: 'Discursivas', go: 'discursivas',
        v: dg.media_pct + '% de média em ' + (dg.n_corrigidas === 1 ? '1 corrigida' : dg.n_corrigidas + ' corrigidas') });
    }
    const pct = Math.max(0, Math.min(100, g.pct_acerto));
    return '<div class="rx-board">' +
      '<div class="rx-donut" style="--pct:' + pct + '"><div class="rx-donut-c"><strong>' + g.pct_acerto + '%</strong><small>acerto geral</small></div></div>' +
      (cards.length ? '<div class="rx-cards">' + cards.map(function(c){
        return '<div class="rx-card ' + c.cls + '" data-rx-goto="' + c.go + '"><div class="rx-card-t">' + c.t + '</div><div class="rx-card-v">' + c.v + '</div></div>';
      }).join('') + '</div>' : '') +
      '</div>';
  }
  // ── PARTE 2 · Discursivas ──
  // Seção separada (decisão do dono), com o brainstorm como subseção. Mesmos
  // princípios da Parte 1: padrões que se repetem ENTRE as correções, com
  // trechos verbatim e dica acionável — nunca uma nova correção.
  function _discHtml(d, ch, V){
    if(!d || !d.resumo) return '';
    const padroes = (Array.isArray(d.padroes) ? d.padroes : []).map(function(p){
      return '<div class="rx-mat"><div class="rx-mat-h"><span>' + _esc(p.padrao) + '</span></div>' + _evHtml(p.evidencias) +
        (p.dica ? '<div class="rx-dica">Para a próxima: ' + _esc(p.dica) + '</div>' : '') + '</div>';
    }).join('');
    const fortes = (Array.isArray(d.pontos_fortes) && d.pontos_fortes.length)
      ? '<div class="rx-sec"><div class="rx-sec-h">O que manter</div><ul>' + d.pontos_fortes.map(function(x){ return '<li>' + _esc(x) + '</li>'; }).join('') + '</ul></div>' : '';
    const bs = (d.brainstorm && d.brainstorm.diagnostico)
      ? '<div class="rx-sec"><div class="rx-sec-h">Brainstorm (fase de ideias)</div><div class="rx-sec-b">' + _esc(d.brainstorm.diagnostico) + '</div>' + _evHtml(d.brainstorm.evidencias) + '</div>' : '';
    const passos = (Array.isArray(d.proximos_passos) && d.proximos_passos.length)
      ? '<div class="rx-sec"><div class="rx-sec-h">Próximos passos</div><ul>' + d.proximos_passos.map(function(x){ return '<li>' + _esc(x) + '</li>'; }).join('') + '</ul></div>' : '';
    return '<div data-rx-sec="discursivas" style="margin-top:2.2rem;border-top:1px solid var(--border);padding-top:1.4rem">' +
      '<span class="s-label">Parte 2</span>' +
      '<h2 class="rx-title" style="font-size:1.25rem">' + V.discTitulo + '</h2>' +
      _secTxt('Resumo', d.resumo) +
      _secTxt('Evolução das notas', d.evolucao, ch.disc) +
      (padroes ? '<div class="rx-sec"><div class="rx-sec-h">Padrões que se repetem entre as correções</div>' + padroes + '</div>' : '') +
      fortes + bs + passos + '</div>';
  }

  // ── v3: "O que cai na prova × você" — os números vêm dos agregados (calculados no servidor), não da IA ──
  function _rxNum(v){ return (v == null || v === '') ? '—' : String(Math.round(Number(v) * 10) / 10).replace('.', ','); }
  function _rxProvaHtml(f, ag, V){
    const oc = Array.isArray(ag.o_que_cai_na_prova) ? ag.o_que_cai_na_prova : [];
    const np = ag.nota_projetada;
    const tabelas = oc.map(function(m){
      const linhas = (m.temas || []).slice(0, 8).map(function(t){
        const tend = t.tendencia === 'alta' ? 'em alta' : (t.tendencia === 'queda' ? 'em queda' : 'estável');
        return '<tr><td>' + _esc(t.tema) + '</td><td>' + _rxNum(t.pct_da_prova_5_ultimas) + '%</td><td>' + tend + '</td>' +
          '<td>' + (t.seu_pct_acerto != null ? t.seu_pct_acerto + '% (' + t.seu_n + ')' : '—') + '</td>' +
          '<td>' + (t.itens_que_voce_erraria != null ? _rxNum(t.itens_que_voce_erraria) : '—') + '</td>' +
          '<td>' + (t.pct_do_seu_treino != null ? _rxNum(t.pct_do_seu_treino) + '%' : '—') + '</td>' +
          '<td>' + _esc(t.leitura || '—') + '</td></tr>';
      }).join('');
      return '<div class="rx-mat"><div class="rx-mat-h"><span>' + _esc(m.materia) + '</span><span class="rx-mat-pct">prova de ' + (m.itens_da_materia_numa_prova || '?') + ' itens · ' + _esc(m.fonte_do_tamanho || '') + '</span></div>' +
        '<div class="rx-tab-rolo"><table class="rx-table rx-prova"><thead><tr>' + V.provaCols.map(function(c){ return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' + linhas + '</tbody></table></div></div>';
    }).join('');
    let notaHtml = '';
    if(np && np.materias && np.materias.length){
      const cortes = (np.cortes || []).map(function(c){ return _esc(c.rotulo) + ' ' + _rxNum(c.nota); }).join(' · ');
      notaHtml = '<div class="rx-nota">' +
        '<div class="rx-nota-n"><strong>' + _rxNum(np.estimativa_prova_inteira) + '</strong><small>de ' + _rxNum(np.pontos_max_prova) + ' pontos na 1ª fase (estimativa)</small></div>' +
        '<div class="rx-nota-t">Nota mínima ' + _rxNum(np.nota_minima) + (cortes ? ' · notas de corte' + (np.prova_dos_cortes ? ' de ' + _esc(np.prova_dos_cortes) : '') + ': ' + cortes : '') + '<br>' +
        'Calculada com ' + np.itens_cobertos + ' dos ' + np.itens_da_prova + ' itens da prova: ' + np.materias.map(function(m){ return _esc(m.materia) + ' ' + _rxNum(m.pontos_esperados) + ' de ' + _rxNum(m.pontos_max); }).join(', ') + '.<br>' +
        '<em>' + _esc(np.aviso || '') + ' A primeira fase é eliminatória; a nota final do concurso sai só da segunda.</em></div></div>';
    }
    const esq = (ag.esquecimento || []).map(function(e){ return '<li>' + _esc(e.tema) + ': ' + e.pct_antes + '% antes, ' + e.pct_ultimos_30_dias + '% nos últimos 30 dias</li>'; }).join('');
    const gem = (ag.itens_gemeos || []).map(function(g){ return '<li><span class="rx-trecho">' + _esc(g.item_errado) + '</span> — parecido com ' + g.parecidos_em_provas_recentes.map(function(p){ return _esc(p.origem); }).join(', ') + '</li>'; }).join('');
    const chute = (ag.chute || []).filter(function(c){ return c.vale_reforcar; }).map(function(c){ return '<li>' + _esc(c.materia) + V.chute(c) + '</li>'; }).join('');
    if(!tabelas && !notaHtml && !f.prova_e_treino) return '';
    return '<div class="rx-sec" data-rx-sec="prova"><div class="rx-sec-h">' + V.provaH + '</div>' +
      (f.prova_e_treino ? '<div class="rx-sec-b">' + _esc(f.prova_e_treino) + '</div>' : '') + notaHtml + tabelas +
      (esq ? '<div class="rx-sub2">' + V.esqH + '</div><ul>' + esq + '</ul>' : '') +
      (gem ? '<div class="rx-sub2">' + V.gemH + '</div><ul>' + gem + '</ul>' : '') +
      (chute ? '<div class="rx-sub2">Chute</div><ul>' + chute + '</ul>' : '') + '</div>';
  }

  function relatorioHtml(report, opts){
    opts = opts || {};
    const V = _voz(opts.voz);
    const f = report.findings || {};
    const ag = report.aggregates || {};
    const pctBy = {};
    (ag.materias || []).forEach(function(m){ pctBy[m.materia] = m; });
    const matHtml = (Array.isArray(f.por_materia) ? f.por_materia : []).map(function(m){
      const st = pctBy[m.materia];
      const pct = st && st.pct_acerto != null ? (st.pct_acerto + '% de acerto · ' + st.n + ' questões') : '';
      const bar = (st && st.pct_acerto != null)
        ? '<div class="rx-btrack" style="margin:.15rem 0 .5rem"><span class="rx-bfill" style="width:' + Math.max(0, Math.min(100, st.pct_acerto)) + '%"></span></div>' : '';
      const recs = Array.isArray(m.recomendacoes) && m.recomendacoes.length
        ? '<ul>' + m.recomendacoes.map(function(r){ return '<li>' + _esc(r) + '</li>'; }).join('') + '</ul>' : '';
      return '<div class="rx-mat"><div class="rx-mat-h"><span>' + _esc(m.materia) + '</span><span class="rx-mat-pct">' + pct + '</span></div>' + bar + '<div class="rx-sec-b" style="font-size:.9rem">' + _esc(m.diagnostico) + '</div>' + _evHtml(m.evidencias) + recs + '</div>';
    }).join('');
    const padroesHtml = (Array.isArray(f.padroes_de_tema) ? f.padroes_de_tema : []).map(function(p){
      return '<div class="rx-mat"><div class="rx-mat-h"><span>' + _esc(p.padrao) + '</span></div>' + _evHtml(p.evidencias) +
        (p.dica ? '<div class="rx-dica">Dica de prova: ' + _esc(p.dica) + '</div>' : '') + '</div>';
    }).join('');
    const ch = _chartsFromAgg(ag, V);
    const nomeAlvo = opts.nome || (ag.alvo && ag.alvo.nome) || '';
    const geral = ag.geral || {};
    const perLab = (ag.periodo && ag.periodo.label && ag.periodo.label !== 'todo o histórico') ? ' · ' + ag.periodo.label : '';
    const matLab = (ag.materia_filtro && ag.materia_filtro.nome) ? ' · ' + ag.materia_filtro.nome : '';
    const rcLab = (ag.recorte && ag.recorte.label) ? ' · ' + ag.recorte.label : '';
    return       '<span class="s-label">' + (report.titulo ? _esc(report.titulo) + ' · ' : '') + 'Raio-X de ' + _fmtData(report.created_at) + _esc(perLab) + _esc(matLab) + _esc(rcLab) + (opts.arquivado ? ' (arquivado)' : '') + '</span>' +
      '<h2 class="rx-title">' + V.titulo(nomeAlvo) + '</h2>' +
      (geral.n ? '<p class="rx-sub">' + geral.n + ' questões de Certo/Errado analisadas · ' + (geral.pct_acerto != null ? geral.pct_acerto + '% de acerto geral' : '') + '</p>' : '') +
      _boardFromReport(f, ag) +
      _secTxt('Resumo', f.resumo) +
      _secTxt('Evolução', f.evolucao, ch.evo, 'evolucao') +
      _secBloco('Perfil de leitura (extrapolação)', f.perfil_leitura) +
      _secBloco('Atenção e pegadinhas', f.atencao_pegadinhas, ch.dif, 'atencao') +
      _secBloco('Viés Certo × Errado', f.vies_certo_errado, ch.vies, 'vies') +
      ((padroesHtml || ch.ling) ? '<div class="rx-sec" data-rx-sec="padroes"><div class="rx-sec-h">' + V.padroesH + '</div>' + padroesHtml + ch.ling + '</div>' : '') +
      (matHtml ? '<div class="rx-sec"><div class="rx-sec-h">Matéria por matéria</div>' + matHtml + '</div>' : '') +
      _rxProvaHtml(f, ag, V) +
      _secList(V.prioridadesH, f.prioridades, opts.prioItem || _prioPadrao, 'prioridades', ch.prio) +
      _secList('Macetes de banca', f.macetes, function(m){ return '<li>' + _esc(m) + '</li>'; }) +
      _secList('Próximos passos', f.proximos_passos, function(p){ return '<li>' + _esc(p) + '</li>'; }) +
      _discHtml(f.discursivas, ch, V) +
      (opts.acoesHtml || '') +
      '<div class="rx-meta">' + V.meta + _esc((ag && ag.escopo) || 'Questões anuladas e simulados não entram na conta.') + '</div>';
  }

  function documentoHtml(report, opts){
    opts = opts || {};
    const V = _voz(opts.voz);
    const lic = opts.lic || null;     // licença dos compiladores (app do aluno); o painel do mentor não usa
    const f = report.findings || {};
    const nome = opts.nome || '';
    // Marca d'água de impressão (mesmo estilo dos compiladores) + capa.
    const licText = lic ? lic.linha : '';
    const agD = report.aggregates || {};
    const perLabD = (agD.periodo && agD.periodo.label && agD.periodo.label !== 'todo o histórico') ? agD.periodo.label : '';
    const matLabD = (agD.materia_filtro && agD.materia_filtro.nome) ? agD.materia_filtro.nome : '';
    const rcLabD = (agD.recorte && agD.recorte.label) ? agD.recorte.label : '';
    const coverSub = [nome, _fmtData(report.created_at), perLabD, matLabD, rcLabD].filter(Boolean).join(' · ');
    const ch = _chartsFromAgg(agD, V);
    const nomeAlvo = opts.nome || (agD.alvo && agD.alvo.nome) || '';
    const sec = function(t, x){ return x ? '<h2>' + _esc(t) + '</h2><p>' + _esc(x).replace(/\n/g, '<br>') + '</p>' : ''; };
    const list = function(t, arr, fmt){ return (Array.isArray(arr) && arr.length) ? '<h2>' + _esc(t) + '</h2><ul>' + arr.map(fmt).join('') + '</ul>' : ''; };
    const evDoc = function(arr){
      if(!Array.isArray(arr) || !arr.length) return '';
      return arr.map(function(e){
        const met = e.materia || e.origem;
        return '<div class="ev"><i>&ldquo;' + _hlTrecho(e.trecho, e.destaque) + '&rdquo;</i>' +
          (met ? ' <span class="ev-m">— ' + _esc(met) + '</span>' : '') +
          (e.o_que_houve ? '<div class="ev-c">' + _esc(e.o_que_houve) + '</div>' : '') + '</div>';
      }).join('');
    };
    const secB = function(t, b){
      if(!b) return '';
      if(typeof b === 'string') return sec(t, b);
      if(!b.diagnostico) return '';
      return '<h2>' + _esc(t) + '</h2><p>' + _esc(b.diagnostico).replace(/\n/g, '<br>') + '</p>' + evDoc(b.evidencias);
    };
    const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' + (lic ? lic.metaTags : '') + '<title>Raio-X do desempenho — ' + _esc(_fmtData(report.created_at)) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Cardo:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">' +
      '<style>' +
      '@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Georgia,serif;color:#1e1a12;background:#fff}' +
      // Marca d'água em imagem (só na impressão), igual à dos compiladores.
      (lic ? lic.css : '') +
      // Capa de página inteira (padrão do Compilar texto, fundo marrom da marca).
      '.cover-page{position:relative;width:100%;height:100vh;overflow:hidden;background:linear-gradient(135deg,#2a2212,#4a3a1e);page-break-after:always;break-after:page;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.cover-shade{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(20,16,8,.15) 0%,rgba(20,16,8,.35) 45%,rgba(20,16,8,.92) 100%)}' +
      '.cover-brand{position:absolute;top:16mm;left:0;right:0;text-align:center;font:400 .72rem Arial,sans-serif;color:rgba(245,239,226,.72);letter-spacing:.34em;text-transform:uppercase}' +
      '.cover-text{position:absolute;left:16mm;right:16mm;bottom:20mm;color:#f6f0e3}' +
      '.cover-eyebrow{font:400 .74rem Arial,sans-serif;letter-spacing:.3em;text-transform:uppercase;color:rgba(245,239,226,.82);margin-bottom:.6rem}' +
      '.cover-title{font:700 2.7rem/1.12 \'Cardo\',Georgia,serif;color:#fff;margin:0}' +
      '.cover-sub{font:400 1.02rem Arial,sans-serif;color:rgba(245,239,226,.86);margin-top:.6rem}' +
      '.cover-lic{font:400 .62rem Arial,sans-serif;color:rgba(245,239,226,.6);margin-top:1rem}' +
      // Destaque dentro do trecho citado + dica de prova + gráficos de barras.
      '.rx-hl{background:#f3e8cf;color:#6b4f16;font-style:normal;font-weight:700;padding:0 .12em;border-radius:2px;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.dica{margin-top:.3rem;font-family:Arial;font-size:12px;color:#8a6a24;font-weight:700}' +
      '.rx-chart{margin:.5rem 0}' +
      '.rx-chart-h{font:600 11px Arial;color:#8a7e68;margin:.2rem 0 .35rem}' +
      '.rx-lgroup{margin:.45rem 0}.rx-lrot{font:600 12px Arial;color:#3a3228;margin-bottom:.15rem}' +
      '.rx-brow{display:flex;align-items:center;gap:.5rem;margin:.22rem 0}' +
      '.rx-blab{flex:0 0 40%;font:400 11px Arial;color:#6a604c;text-align:right;line-height:1.3}' +
      '.rx-btrack{flex:1;height:7px;background:#eee6d6;border-radius:99px;overflow:hidden}' +
      '.rx-bfill{display:block;height:100%;background:#8a6a24;border-radius:99px;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.rx-bval{flex:0 0 84px;font:400 10.5px \'Courier New\',monospace;color:#3a3228}' +
      '.rx-bval em{font-style:normal;color:#8a7e68;font-size:9px}' +
      // Quadro-resumo (versão clara do doc; sem clique — papel não rola).
      '.rx-board{display:flex;gap:1rem;align-items:center;margin:.8rem 0 1.2rem;padding:.8rem;background:#faf7f0;border:1px solid #e8dfc9;border-radius:6px;flex-wrap:wrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.rx-donut{width:100px;height:100px;border-radius:50%;background:conic-gradient(#5db8a3 0 calc(var(--pct)*1%), rgba(212,121,115,.6) calc(var(--pct)*1%) 100%);display:flex;align-items:center;justify-content:center;flex:0 0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.rx-donut-c{width:70px;height:70px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}' +
      '.rx-donut-c strong{font-family:Georgia,serif;font-size:1.2rem;color:#1e1a12;line-height:1}' +
      '.rx-donut-c small{font-family:Arial;font-size:.44rem;letter-spacing:.12em;text-transform:uppercase;color:#8a7e68;margin-top:.15rem}' +
      '.rx-cards{flex:1;min-width:220px;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:.45rem}' +
      '.rx-card{border-left:3px solid #d8c4a8;border-radius:4px;padding:.4rem .6rem;background:#fff}' +
      '.rx-card-t{font-family:Arial;font-size:9px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.15rem}' +
      '.rx-card-v{font-size:12px;color:#1e1a12;line-height:1.4}' +
      '.rx-card.good{border-left-color:#5db8a3}.rx-card.good .rx-card-t{color:#3f8a77}' +
      '.rx-card.bad{border-left-color:#d47973}.rx-card.bad .rx-card-t{color:#b05a54}' +
      '.rx-card.warn{border-left-color:#e0b45a}.rx-card.warn .rx-card-t{color:#9c7c2e}' +
      // Parte 2 (discursivas): começa em página nova na impressão.
      '.parte2{page-break-before:always;break-before:page;padding-top:6mm}' +
      '.wrap{max-width:820px;margin:0 auto}.sheet{width:100%;border-collapse:collapse}.sheet td{border:0;padding:0}.sheet>thead td>div,.sheet>tfoot td>div{height:14mm}.sheet>tbody>tr>td{padding:0 14mm}' +
      'h1{font-size:26px;margin:.2rem 0 .1rem}h2{font-size:15px;color:#8a6a24;margin:1.4rem 0 .4rem;letter-spacing:.04em;text-transform:uppercase;font-family:Arial,sans-serif}' +
      'p,li{font-size:14px;line-height:1.7}ul{margin:.3rem 0 .3rem 1.2rem}.eyebrow{font-family:Arial;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:#8a6a24}' +
      '.mat{margin:.6rem 0;padding:.5rem .8rem;border-left:2px solid #8a6a24;background:#faf7f0}.mat b{font-size:14px}' +
      '.ev{margin:.45rem 0 .45rem .6rem;padding:.4rem .7rem;border-left:2px solid #d8c4a8;background:#faf7f0;font-size:13px;line-height:1.55}' +
      '.ev-m{font-family:Arial;font-size:10px;color:#8a7e68}.ev-c{color:#3a3228;font-size:12.5px;margin-top:.2rem}' +
      '.print-btn{position:fixed;top:14px;right:14px;padding:.6rem 1rem;background:#8a6a24;color:#fff;border:none;border-radius:4px;font:600 13px Arial;cursor:pointer}@media print{.print-btn{display:none}}' +
      '.meta{margin-top:1.6rem;font-size:10px;color:#8a7e68;font-family:Arial}' +
      '</style></head><body><button class="print-btn" onclick="window.print()">Imprimir / Salvar PDF</button>' +
      (lic ? '<!-- ' + lic.forense + ' -->' + lic.marca : '') +
      '<section class="cover-page"><div class="cover-shade"></div>' +
        '<div class="cover-brand">Grupo Ubique</div>' +
        '<div class="cover-text">' +
          '<div class="cover-eyebrow">Diagnóstico do perfil de erro</div>' +
          '<h1 class="cover-title">Raio-X do desempenho</h1>' +
          (coverSub ? '<div class="cover-sub">' + _esc(coverSub) + '</div>' : '') +
          (licText ? '<div class="cover-lic">' + _esc(licText) + '</div>' : '') +
        '</div>' +
      '</section>' +
      '<div class="wrap"><table class="sheet"><thead><tr><td><div></div></td></tr></thead><tfoot><tr><td><div></div></td></tr></tfoot><tbody><tr><td>' +
      '<div class="eyebrow">Grupo Ubique · Raio-X do desempenho</div>' +
      '<h1>' + V.titulo(nomeAlvo) + '</h1>' +
      '<p style="color:#6a604c;font-size:12px;margin:.1rem 0 0">' + _esc(nome) + (nome ? ' · ' : '') + _esc(_fmtData(report.created_at)) + '</p>' +
      _boardFromReport(f, agD) +
      sec('Resumo', f.resumo) + sec('Evolução', f.evolucao) + ch.evo +
      secB('Perfil de leitura (extrapolação)', f.perfil_leitura) +
      secB('Atenção e pegadinhas', f.atencao_pegadinhas) + ch.dif +
      secB('Viés Certo × Errado', f.vies_certo_errado) + ch.vies +
      (((Array.isArray(f.padroes_de_tema) && f.padroes_de_tema.length) || ch.ling) ? '<h2>' + V.padroesH + '</h2>' + (Array.isArray(f.padroes_de_tema) ? f.padroes_de_tema : []).map(function(p){
        return '<div class="mat"><b>' + _esc(p.padrao) + '</b>' + evDoc(p.evidencias) +
          (p.dica ? '<div class="dica">Dica de prova: ' + _esc(p.dica) + '</div>' : '') + '</div>';
      }).join('') + ch.ling : '') +
      ((Array.isArray(f.por_materia) && f.por_materia.length) ? '<h2>Matéria por matéria</h2>' + f.por_materia.map(function(m){
        return '<div class="mat"><b>' + _esc(m.materia) + '</b><p style="margin:.2rem 0 0">' + _esc(m.diagnostico) + '</p>' + evDoc(m.evidencias) +
          ((Array.isArray(m.recomendacoes) && m.recomendacoes.length) ? '<ul>' + m.recomendacoes.map(function(r){ return '<li>' + _esc(r) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
      }).join('') : '') +
      sec(V.provaH, f.prova_e_treino) +
      list('Prioridades', f.prioridades, function(p){ return '<li><b>' + _esc(p.titulo) + '</b> — ' + _esc(p.motivo) + '</li>'; }) + ch.prio +
      list('Macetes de banca', f.macetes, function(m){ return '<li>' + _esc(m) + '</li>'; }) +
      list('Próximos passos', f.proximos_passos, function(p){ return '<li>' + _esc(p) + '</li>'; }) +
      ((f.discursivas && f.discursivas.resumo) ? (function(){
        const d = f.discursivas;
        return '<div class="parte2">' +
          '<div class="eyebrow">Grupo Ubique · Raio-X do desempenho · Parte 2</div>' +
          '<h1>' + V.discTitulo + '</h1>' +
          sec('Resumo', d.resumo) + sec('Evolução das notas', d.evolucao) + ch.disc +
          ((Array.isArray(d.padroes) && d.padroes.length) ? '<h2>Padrões que se repetem entre as correções</h2>' + d.padroes.map(function(p){
            return '<div class="mat"><b>' + _esc(p.padrao) + '</b>' + evDoc(p.evidencias) +
              (p.dica ? '<div class="dica">Para a próxima: ' + _esc(p.dica) + '</div>' : '') + '</div>';
          }).join('') : '') +
          list('O que manter', d.pontos_fortes, function(x){ return '<li>' + _esc(x) + '</li>'; }) +
          ((d.brainstorm && d.brainstorm.diagnostico) ? '<h2>Brainstorm (fase de ideias)</h2><p>' + _esc(d.brainstorm.diagnostico) + '</p>' + evDoc(d.brainstorm.evidencias) : '') +
          list('Próximos passos', d.proximos_passos, function(x){ return '<li>' + _esc(x) + '</li>'; }) +
          '</div>';
      })() : '') +
      '<div class="meta">' + V.docMeta + _esc((report.aggregates && report.aggregates.escopo) || 'Questões anuladas e simulados não entram na conta.') + '</div>' +
      '</td></tr></tbody></table></div></body></html>';
    return html;
  }


  window.RaioXRender = {
    estilos: estilos, relatorioHtml: relatorioHtml, documentoHtml: documentoHtml,
    graficos: function(ag, voz){ return _chartsFromAgg(ag, _voz(voz)); },
    quadro: _boardFromReport, provaHtml: function(f, ag, voz){ return _rxProvaHtml(f, ag, _voz(voz)); },
    esc: _esc, fmtData: _fmtData,
  };
})();
