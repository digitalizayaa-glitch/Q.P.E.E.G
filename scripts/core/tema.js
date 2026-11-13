/* Pone el tema claro antes de pintar nada (evita el parpadeo al abrir). Va en <head>, sin esperar a la app. */
try {
    var _t = localStorage.getItem("qpeeg_theme");
    if (!_t) { var _s = JSON.parse(localStorage.getItem("qpeeg_state_v1") || "{}").settings; _t = _s && _s.theme; }
    if (_t === "light") document.documentElement.setAttribute("data-theme", "light");
} catch (e) { /* sin almacenamiento: tema oscuro */ }

/* Fuente elegida en Ajustes (o la que tocó al azar en la primera apertura), también antes de pintar */
try {
    var _f = localStorage.getItem("qpeeg_font");
    if (!_f) { var _s2 = JSON.parse(localStorage.getItem("qpeeg_state_v1") || "{}").settings; _f = _s2 && _s2.font; }
    if (_f === "atkinson" || _f === "grotesk" || _f === "saira") document.documentElement.setAttribute("data-font", _f);
} catch (e) { /* sin almacenamiento: Arial */ }
