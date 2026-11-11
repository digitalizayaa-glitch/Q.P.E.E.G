/* Pone el tema claro antes de pintar nada (evita el parpadeo al abrir). Va en <head>, sin esperar a la app. */
try {
    var _t = localStorage.getItem("qpeeg_theme");
    if (!_t) { var _s = JSON.parse(localStorage.getItem("qpeeg_state_v1") || "{}").settings; _t = _s && _s.theme; }
    if (_t === "light") document.documentElement.setAttribute("data-theme", "light");
} catch (e) { /* sin almacenamiento: tema oscuro */ }
