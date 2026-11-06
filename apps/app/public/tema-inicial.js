/* global window, document */
// Tema salvo aplicado antes da primeira pintura (T04-02), para não piscar o claro. Script externo
// porque a CSP do Tauri bloqueia script inline. main.tsx gera o CSS escuro de novo e o atualiza.
(function () {
  try {
    var tema = window.localStorage.getItem('goose-money:tema') || 'sistema';
    var escuro =
      tema === 'escuro' ||
      (tema === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (!escuro) return;
    document.documentElement.classList.add('dark');
    var css = window.localStorage.getItem('goose-money:tema-escuro-css');
    if (!css) return;
    var estilo = document.createElement('style');
    estilo.id = 'tema-escuro';
    estilo.textContent = css;
    document.head.appendChild(estilo);
  } catch {
    // Sem armazenamento: o app aplica o tema ao carregar.
  }
})();
