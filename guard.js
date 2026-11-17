/* Falcon: barreira contra as ferramentas de desenvolvedor no site publicado.
   · bloqueia F12, Ctrl+Shift+I/J/C, Cmd+Opt+I/J/C, Ctrl+U (código-fonte);
   · o botão direito fica liberado (se usarem "Inspecionar" nele, a trava abaixo pega);
   · se o DevTools for aberto mesmo assim, a página é trocada por um aviso.
   Desligado em localhost / 127.0.0.1 / file:// para a equipe conseguir depurar localmente.
   Obs.: é uma barreira de dissuasão, não segurança. O que protege os dados é o RLS do Supabase. */
(function () {
  'use strict';
  var h = location.hostname;
  if (!h || h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /\.localhost$/.test(h)) return;

  document.addEventListener('keydown', function (e) {
    var c = e.code, mod = e.ctrlKey || e.metaKey;
    var dev = c === 'KeyI' || c === 'KeyJ' || c === 'KeyC';
    if (e.key === 'F12' ||
        (mod && e.shiftKey && dev) ||
        (e.metaKey && e.altKey && dev) ||
        (mod && !e.shiftKey && !e.altKey && c === 'KeyU')) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  var fechado = false;
  function fechar() {
    if (fechado) return;
    fechado = true;
    try {
      document.documentElement.innerHTML =
        '<head><meta charset="utf-8"><title>Falcon</title></head>' +
        '<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;' +
        'background:#0b0c0f;color:#f0ece4;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px">' +
        '<div>Feche as ferramentas de desenvolvedor e recarregue a página.</div></body>';
    } catch (_) {}
  }
  // Com o DevTools aberto o "debugger" pausa a execução; a pausa denuncia que ele está aberto.
  var pausa = Function('debugger');
  setInterval(function () {
    var t = performance.now();
    pausa();
    if (performance.now() - t > 200) fechar();
  }, 1000);
})();
