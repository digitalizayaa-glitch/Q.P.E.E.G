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

/* anim.settled: como anim.finished, pero se cumple igual si la animación nunca termina (pestaña oculta,
   ahorro de batería o motores que pausan animaciones). Sin esto, una animación colgada dejaba la navegación
   bloqueada (navFade/SWIPE.busy esperando para siempre). Nunca falla: no hace falta .catch */
if (window.Animation && !("settled" in Animation.prototype)) {
    Object.defineProperty(Animation.prototype, "settled", {
        get() {
            let ms = 400;
            try { const t = this.effect && this.effect.getComputedTiming(); if (t && isFinite(t.endTime)) ms = t.endTime; } catch (e) { /* nada */ }
            return Promise.race([this.finished.catch(() => {}), new Promise(r => setTimeout(r, ms + 150))]);
        }
    });
}
