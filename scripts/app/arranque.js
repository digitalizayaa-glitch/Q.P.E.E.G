/* =========================================================
    ARRANQUE
========================================================= */

/* =========================================================
    AJUSTE AUTOMÁTICO AL ESPACIO DISPONIBLE
    Si el contenido de la sección no cabe, primero se achica el encabezado
    (--hdr) para alargar el campo y luego los espacios internos (--k).
========================================================= */

function fitLayout(force) {
    if (SWIPE.busy && !force) return; /* se ajusta al terminar de cambiar de pantalla */
    const app = document.getElementById("mainApp");
    const main = document.querySelector("main");
    if (!app || !main || app.style.display === "none") return;

    const root = document.documentElement;
    root.style.removeProperty("--hdr");
    root.style.removeProperty("--k");

    /* Cuánto se pasa el contenido visible del borde inferior de la zona principal,
       mida lo que mida su contenedor (aunque este lo recorte) */
    const active = main.querySelector(".section.active");
    const overflows = () => {
        const limit = main.getBoundingClientRect().bottom - parseFloat(getComputedStyle(main).paddingBottom);
        let lowest = 0;
        active.querySelectorAll("*").forEach(el => {
            const r = el.getBoundingClientRect();
            if (el.dataset.anim === "1") return;
            const sc = el.closest("[data-scroll]");
            if (sc && sc !== el) return;   /* lo que está dentro de una lista con su propio scroll no cuenta */
            if (r.height > 0 && r.bottom > lowest) lowest = r.bottom;
        });
        return Math.max(lowest - limit, main.scrollHeight - main.clientHeight) > 1;
    };
    if (!overflows()) return;

    const base = parseFloat(getComputedStyle(document.querySelector(".week-tab-label")).height);
    for (let h = base - 4; h >= 34; h -= 4) {
        root.style.setProperty("--hdr", `${h}px`);
        if (!overflows()) return;
    }

    for (let k = 0.9; k >= 0.3; k -= 0.1) {
        root.style.setProperty("--k", k.toFixed(2));
        if (!overflows()) return;
    }
}

let fitQueued = false;
function queueFit() {
    if (fitQueued) return;
    fitQueued = true;
    requestAnimationFrame(() => { fitQueued = false; fitLayout(); });
}

/* Cambiar un número animado (kg, reps) no cambia el tamaño de nada: no hace falta volver a medir */
const isValueChange = r => {
    const el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
    return !!(el && el.closest(".kg-value, .reps-value"));
};

function initFitLayout() {
    new MutationObserver(records => { if (!records.every(isValueChange)) queueFit(); }).observe(document.querySelector("main"), { childList: true, subtree: true });
    new MutationObserver(queueFit).observe(document.getElementById("mainApp"), { attributes: true, attributeFilter: ["style"] });
    window.addEventListener("resize", queueFit);
    window.addEventListener("orientationchange", queueFit);
}


/* =========================================================
    DESLIZAMIENTO (SWIPE) CON ANIMACIÓN
    - Horizontal: cambia de pestaña (Semana / Rutinas / Historial);
      dentro de las páginas de ejercicios de una rutina pasa de página.
    - Vertical (solo en Entreno): cambia de página de ejercicios.
    La pantalla sigue al dedo; al soltar se completa o rebota.
========================================================= */

/* Profundidad: la pantalla actual se aleja hacia el lado contrario al que vas, se encoge y se
   desvanece; la nueva llega desde el lado al que vas, desde el fondo, y se agranda hasta su sitio. */
const ANIM = {
    out: (p, a) => ({ transform: `translate${a}(${p * 18}%) scale(${1 - 0.16 * Math.abs(p)})`, opacity: 1 - Math.abs(p), origin: "50% 50%" }),
    in:  (p, a) => ({ transform: `translate${a}(${p * 32}%) scale(${1 - 0.2 * Math.abs(p)})`, opacity: 1 - Math.abs(p), origin: "50% 50%" })
};

/* Mismo estilo para los números de las flechas ▲▼: el número viejo se aleja y el nuevo llega desde el fondo */
const VALUE_ANIM = {
    out: (p, a) => ({ transform: `translate${a}(${p * 70}%) scale(${1 - 0.45 * Math.abs(p)})`, opacity: 1 - Math.abs(p), origin: "50% 50%" }),
    in:  (p, a) => ({ transform: `translate${a}(${p * 85}%) scale(${1 - 0.45 * Math.abs(p)})`, opacity: 1 - Math.abs(p), origin: "50% 50%" })
};

const SWIPE = { busy: false, justDragged: false };

/* Multiplicador de duración de las transiciones de navegación (se cambia en Ajustes) */
let NAV_SPEED = 1;

const frameStyle = f => ({ transform: f.transform, opacity: f.opacity, transformOrigin: f.origin });

function setFrame(el, f) {
    el.style.transform = f.transform;
    el.style.opacity = f.opacity;
    el.style.transformOrigin = f.origin;
}

function clearFrame(el) {
    el.style.transform = "";
    el.style.opacity = "";
    el.style.transformOrigin = "";
}

function playFrames(el, from, to, ms, easing) {
    const anim = el.animate([frameStyle(from), frameStyle(to)], { duration: ms, easing, fill: "forwards" });
    return anim.finished.then(() => anim.cancel()).catch(() => {});
}

/* Completa el cambio: sale la pantalla actual, se actualiza el contenido y entra la nueva */
async function commitSwipe(ctx, dir, p0) {
    const A = ANIM, a = ctx.axis === "x" ? "X" : "Y";
    SWIPE.busy = true;

    await playFrames(ctx.el, A.out(p0, a), A.out(-dir, a), 170 * NAV_SPEED, "ease-in");

    clearFrame(ctx.el);
    ctx.run(dir);
    fitLayout(true);

    setFrame(ctx.el, A.in(dir, a));
    await playFrames(ctx.el, A.in(dir, a), A.in(0, a), 260 * NAV_SPEED, "cubic-bezier(.2,.8,.2,1)");

    clearFrame(ctx.el);
    SWIPE.busy = false;
}

/* Cambia el texto de un valor (kg, repeticiones) con animación.
   dir = +1 al subir (▲): el número viejo sale hacia arriba y el nuevo llega desde abajo; -1 al bajar (▼).
   El dato ya está guardado cuando se llama: solo se anima lo que se ve. */
async function animateValue(box, dir, text) {
    let span = box.querySelector(".v");
    if (!span) {
        span = document.createElement("span");
        span.className = "v";
        span.textContent = box.textContent;
        box.textContent = "";
        box.appendChild(span);
    }

    const token = (span._token = (span._token || 0) + 1);
    const mid = span.dataset.anim === "1";   /* ya había una animación en curso: no repite la salida */
    span.dataset.anim = "1";
    span.getAnimations().forEach(a => a.cancel());

    if (!mid) await playFrames(span, VALUE_ANIM.out(0, "Y"), VALUE_ANIM.out(-dir, "Y"), 90, "ease-in");
    if (token !== span._token) return;

    span.textContent = text;
    setFrame(span, VALUE_ANIM.in(dir, "Y"));
    await playFrames(span, VALUE_ANIM.in(dir, "Y"), VALUE_ANIM.in(0, "Y"), 160, "cubic-bezier(.2,.8,.2,1)");
    if (token !== span._token) return;

    clearFrame(span);
    delete span.dataset.anim;
}

/* Rebote: vuelve a su sitio (también cuando no hay más páginas) */
async function snapBack(ctx, p0) {
    const A = ANIM, a = ctx.axis === "x" ? "X" : "Y";
    SWIPE.busy = true;
    await playFrames(ctx.el, A.out(p0, a), A.out(0, a), 240 * NAV_SPEED, "cubic-bezier(.2,.9,.3,1.2)");
    clearFrame(ctx.el);
    SWIPE.busy = false;
}

/* Qué se desliza según dónde se toque y hacia qué eje */
function swipeContext(inHeader, axis) {
    const main = document.querySelector("main");
    const active = document.querySelector(".section.active").id;

    const tabs = { el: main, axis: "x", can: () => true, run: d => shiftWeekTab(d) };

    if (inHeader) return axis === "x" ? tabs : null;

    /* Entreno: a los lados cambia de sección; arriba/abajo recorre los ejercicios */
    if (active === "workout" && axis === "y") {
        const track = document.querySelector("#workoutExercises .workout-track");
        return track ? { list: true, el: track, axis: "y" } : null;
    }

    return axis === "x" ? tabs : null;
}

function initSwipe() {
    const app = document.getElementById("mainApp");
    let g = null;

    app.addEventListener("pointerdown", e => {
        if (SWIPE.busy || (e.pointerType === "mouse" && e.button !== 0)) return;
        if (e.target.closest("input, textarea, select, .value-armed, .value-free")) return;   /* valores activos o libres: el gesto es del valor */
        g = { x: e.clientX, y: e.clientY, t: performance.now(), inHeader: !!e.target.closest("header"), axis: null, ctx: null, p: 0, dir: 0, can: false };
    });

    window.addEventListener("pointermove", e => {
        if (!g) return;
        const dx = e.clientX - g.x, dy = e.clientY - g.y;

        if (!g.axis) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
            g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
            g.ctx = swipeContext(g.inHeader, g.axis);
            if (!g.ctx) { g = null; return; }
            if (g.ctx.list) { g.stops = workoutStops(); g.base = g.stops[workoutPage] || 0; g.ctx.el.getAnimations().forEach(a => a.cancel()); }
            g.size = g.axis === "x" ? g.ctx.el.offsetWidth : g.ctx.el.offsetHeight;
            g.ctx.el.style.willChange = "transform, opacity";
        }

        const d = g.axis === "x" ? dx : dy;
        g.dir = d < 0 ? 1 : -1;               /* deslizar a la izquierda / arriba = siguiente */

        /* lista vertical: sigue al dedo; pasado el primero o el último ejercicio, con resistencia */
        if (g.ctx.list) {
            const max = g.stops[g.stops.length - 1];
            let y = g.base - dy;
            if (y < 0) y *= 0.3;
            else if (y > max) y = max + (y - max) * 0.3;
            g.ctx.el._y = y;
            g.ctx.el.style.transform = `translateY(${-y}px)`;
            g.dragging = true;
            return;
        }
        g.can = g.ctx.can(g.dir);
        g.p = Math.max(-1, Math.min(1, d / g.size)) * (g.can ? 1 : 0.18);   /* sin más páginas: resistencia */
        g.dragging = true;

        const A = ANIM;
        setFrame(g.ctx.el, A.out(g.p, g.axis === "x" ? "X" : "Y"));
    });

    const finish = (e, cancelled) => {
        if (!g) return;
        const gesture = g;
        g = null;
        if (!gesture.dragging) return;

        gesture.ctx.el.style.willChange = "";
        SWIPE.justDragged = true;
        setTimeout(() => { SWIPE.justDragged = false; }, 60);

        const d = Math.abs(gesture.axis === "x" ? e.clientX - gesture.x : e.clientY - gesture.y);
        const velocity = d / Math.max(1, performance.now() - gesture.t);

        /* lista vertical: un ejercicio por gesto (o vuelve a su sitio si el gesto fue corto) */
        if (gesture.ctx.list) {
            const go = !cancelled && (d > 40 || (velocity > 0.35 && d > 12));
            if (go) shiftWorkoutPage(gesture.dir);
            else setWorkoutOffset(gesture.stops[workoutPage] || 0, true);
            return;
        }
        const passed = Math.abs(gesture.p) > 0.22 || (velocity > 0.45 && d > 30);

        if (!cancelled && gesture.can && passed) commitSwipe(gesture.ctx, gesture.dir, gesture.p);
        else snapBack(gesture.ctx, gesture.p);
    };

    window.addEventListener("pointerup", e => finish(e, false));
    window.addEventListener("pointercancel", e => finish(e, true));

    /* Un arrastre no debe activar el botón sobre el que terminó el dedo */
    app.addEventListener("click", e => {
        if (SWIPE.justDragged) { e.stopPropagation(); e.preventDefault(); }
    }, true);
}

document.addEventListener("DOMContentLoaded", async () => {
    await stateReady;
    applySettings();
    initSwipe();
    renderDots(document.getElementById("tabDots"), TAB_ORDER.length, 0);
    initFitLayout();
    initLanding();
    renderWeekSection();
    renderSeriesPanel();
    renderRoutinesTab();
});
