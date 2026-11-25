/* QUADRO DO TUTOR · ponte da moldura (25/11/2026)
   Roda DENTRO da moldura isolada do Quadro (sem acesso à conta, sem rede).
   O desenho fala com a plataforma só por aqui:
     Quadro.contar(texto)     registra o que o aluno fez (vai para "Perguntar sobre o que fiz")
     Quadro.perguntar(texto)  manda uma pergunta pronta para o campo do tutor
   E alguns ajudantes: Quadro.fmt, Quadro.arrastar (funciona com mouse e dedo). */
(function(){
  'use strict';
  function enviar(tipo, dados){
    try{ window.parent.postMessage(Object.assign({ fonte: 'quadro-falcon', tipo: tipo }, dados || {}), '*'); }catch(_){}
  }
  var ultimo = '', relogio = null;
  var Quadro = {
    contar: function(texto){
      ultimo = String(texto == null ? '' : texto).slice(0, 600);
      // o aluno pode mexer num controle sem parar: manda só quando ele para por um instante
      clearTimeout(relogio);
      relogio = setTimeout(function(){ enviar('contar', { texto: ultimo }); }, 350);
    },
    perguntar: function(texto){ enviar('perguntar', { texto: String(texto == null ? '' : texto).slice(0, 600) }); },
    // número em português (1.234,5); casas = casas decimais
    fmt: function(n, casas){
      var c = (casas == null) ? 1 : casas;
      var v = Number(n); if(!isFinite(v)) return '';
      return v.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
    },
    // Arrastar e soltar com mouse e dedo. itens: seletor ou lista; alvos: seletor ou lista.
    // aoSoltar(item, alvo) é chamado quando o item cai num alvo; devolva false para recusar.
    arrastar: function(itens, alvos, aoSoltar){
      var lista = function(x){ return typeof x === 'string' ? Array.prototype.slice.call(document.querySelectorAll(x)) : Array.prototype.slice.call(x || []); };
      var As = lista(alvos);
      lista(itens).forEach(function(el){
        if(el._qArr) return; el._qArr = true;
        el.classList.add('q-arrastavel');
        el.addEventListener('pointerdown', function(e){
          if(e.button !== 0 && e.pointerType === 'mouse') return;
          e.preventDefault();
          var r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
          var fantasma = el.cloneNode(true);
          fantasma.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;pointer-events:none;z-index:999;opacity:.9';
          document.body.appendChild(fantasma);
          el.classList.add('arrastando');
          var sobre = null;
          var achar = function(x, y){ return As.filter(function(a){ var b = a.getBoundingClientRect(); return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom; })[0] || null; };
          var mexe = function(ev){
            fantasma.style.left = (ev.clientX - dx) + 'px'; fantasma.style.top = (ev.clientY - dy) + 'px';
            var a = achar(ev.clientX, ev.clientY);
            if(a !== sobre){ if(sobre) sobre.classList.remove('sobre'); sobre = a; if(a) a.classList.add('sobre'); }
          };
          var solta = function(ev){
            document.removeEventListener('pointermove', mexe); document.removeEventListener('pointerup', solta); document.removeEventListener('pointercancel', solta);
            fantasma.remove(); el.classList.remove('arrastando');
            if(sobre) sobre.classList.remove('sobre');
            var a = achar(ev.clientX, ev.clientY);
            if(a && typeof aoSoltar === 'function'){
              var ok = aoSoltar(el, a);
              if(ok !== false && el.parentNode !== a) a.appendChild(el);
            }
          };
          document.addEventListener('pointermove', mexe); document.addEventListener('pointerup', solta); document.addEventListener('pointercancel', solta);
        });
      });
    }
  };
  window.Quadro = Quadro;
  // bloqueios do que não funciona aqui (avisos do navegador travariam a moldura)
  window.alert = function(m){ enviar('aviso', { texto: String(m || '').slice(0, 300) }); };
  window.confirm = function(){ return true; };
  window.prompt = function(){ return null; };
  window.addEventListener('error', function(e){ enviar('erro', { texto: String((e && e.message) || 'erro').slice(0, 300) }); });
  document.addEventListener('DOMContentLoaded', function(){ enviar('pronto', {}); });
})();
